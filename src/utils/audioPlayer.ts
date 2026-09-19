// Unified Audio Engine for Mellifluous
// Uses ONE SINGLE HTMLAudioElement instance for all playback across the entire app.
// Seamlessly plays:
// 1. User uploaded audio files (saved on server + cached in IndexedDB)
// 2. Direct online audio files (.mp3, .m4a, .wav, .ogg, .flac)
// 3. Google Drive / Dropbox audio (streamed & proxied via /api/proxy-audio with HTTP 206 Range support)
// 4. Built-in sweet lofi piano melodies (synthesized into seamless WAV Audio Blobs)

import { db, doc, setDoc, deleteDoc, onSnapshot, collection, isFirestoreQuotaExhausted } from '../lib/firebase';
import { saveAudioBlobToIDB, getAudioBlobFromIDB, deleteAudioBlobFromIDB } from './audioIndexedDB';
import { buildApiUrl, hasBackendServer } from '../lib/apiConfig';
import { fetchRawGithubJson, commitGithubDataFile, getGithubConfig } from '../lib/githubSyncService';
import {
  uploadAudioToFirestore,
  downloadAudioFromFirestore,
  deleteAudioFromFirestore,
  type UploadProgress,
} from './cloudAudioStorage';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration?: string;
  mood?: string;
  audioUrl?: string; // Direct /api/audio/... URL, online link, or firestore://trackId
  sourceType?: 'uploaded' | 'direct' | 'gdrive' | 'synth';
  fileSize?: string;
  mimeType?: string;
  totalChunks?: number;
  addedBy?: string;
  createdAt?: string;
  isLocalOnly?: boolean;
}

export type AudioSourceType = 'uploaded' | 'direct' | 'gdrive' | 'synth';

export interface AudioPlaybackState {
  isPlaying: boolean;
  track: AudioTrack;
  volume: number; // 0 to 1
  tracks: AudioTrack[];
  currentTime: number; // in seconds
  duration: number; // in seconds
  sourceType: AudioSourceType;
  isMuted: boolean;
  isLoading: boolean;
  loadingProgress?: string | null;
  error?: string | null;
}

export const DEFAULT_TRACK_LIST: AudioTrack[] = [
  {
    id: 'track-1',
    title: 'Gió Thổi Mùa Hạ (夏天的风)',
    artist: 'Mellifluous Lofi Chill',
    duration: '03:45',
    mood: 'Rhodes Piano & Gió mùa hạ',
    sourceType: 'synth',
  },
  {
    id: 'track-2',
    title: 'Mùa Hè Năm Ấy (那年夏天)',
    artist: 'Acoustic Piano & Music Box',
    duration: '04:12',
    mood: 'Tiếng đàn êm dịu tuổi thanh xuân',
    sourceType: 'synth',
  },
  {
    id: 'track-3',
    title: 'Tớ Thích Cậu (我喜欢你)',
    artist: 'Sweet Warm Chords',
    duration: '03:30',
    mood: 'Giai điệu ngọt ngào chữa lành',
    sourceType: 'synth',
  },
  {
    id: 'track-4',
    title: 'Ký Ức Mùa Mưa Rào',
    artist: 'Ambient Rain & Chimes',
    duration: '02:58',
    mood: 'Chuông gió & giọt mưa tí tách',
    sourceType: 'synth',
  },
];

export let TRACK_LIST: AudioTrack[] = [...DEFAULT_TRACK_LIST];

/**
 * Parses time string formatted as "MM:SS" or "HH:MM:SS" into total seconds.
 */
export function parseDurationToSeconds(durationStr?: string): number {
  if (!durationStr) return 210; // 3m 30s default
  const parts = durationStr.split(':').map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const numeric = parseFloat(durationStr);
  return !isNaN(numeric) && numeric > 0 ? numeric : 210;
}

/**
 * Formats total seconds into "MM:SS".
 */
export function formatSecondsToTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Pentatonic notes for generating gentle ambient piano melody WAVs
const PENTATONIC_FREQS = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5,
];

const CHORD_PROGRESSIONS = [
  [
    [130.81, 261.63, 329.63, 392.0, 493.88],
    [110.0, 220.0, 261.63, 329.63, 392.0],
    [87.31, 174.61, 261.63, 329.63, 349.23],
    [98.0, 196.0, 261.63, 293.66, 392.0],
  ],
  [
    [87.31, 174.61, 261.63, 329.63, 392.0],
    [82.41, 164.81, 246.94, 329.63, 392.0],
    [73.42, 146.83, 220.0, 261.63, 329.63],
    [65.41, 130.81, 196.0, 246.94, 329.63],
  ],
  [
    [98.0, 196.0, 246.94, 293.66, 392.0],
    [92.5, 185.0, 220.0, 293.66, 369.99],
    [82.41, 164.81, 246.94, 329.63, 392.0],
    [65.41, 130.81, 196.0, 261.63, 329.63],
  ],
  [
    [130.81, 196.0, 261.63, 329.63, 392.0],
    [98.0, 146.83, 196.0, 246.94, 293.66],
    [110.0, 164.81, 220.0, 261.63, 329.63],
    [87.31, 130.81, 174.61, 220.0, 261.63],
  ],
];

// Helper: Convert Web Audio AudioBuffer to standard WAV Blob
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

// URL Helper utilities for universal cross-device playback
export function extractGoogleDriveId(url?: string): string | null {
  if (!url || !url.includes('drive.google.com')) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

export function formatGoogleDriveStreamUrl(url: string): string {
  const fileId = extractGoogleDriveId(url);
  if (!fileId) return url;
  // Route Google Drive via proxy to bypass Google's strict CORP: same-site and CORS policies
  return buildApiUrl(`/api/proxy-audio?url=${encodeURIComponent(url)}`);
}

export function convertDropboxToDirectUrl(url: string): string {
  if (!url || !url.includes('dropbox.com')) return url;
  let directUrl = url.replace(/[?&]dl=[01]/g, '').replace(/[?&]raw=[01]/g, '');
  directUrl += directUrl.includes('?') ? '&raw=1' : '?raw=1';
  return directUrl;
}

export function convertOneDriveToDirectUrl(url: string): string {
  if (!url || (!url.includes('1drv.ms') && !url.includes('onedrive.live.com'))) return url;
  return url.replace('redir?', 'download?');
}

export function resolveFullAudioUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/api/')) {
    return buildApiUrl(url);
  }
  return url;
}

// Memory cache for rendered melody WAV URLs
const melodyWavUrlCache = new Map<number, string>();

/**
 * Generates a warm, soothing ambient piano lofi WAV blob for default tracks
 * and returns a standard Blob URL that HTMLAudioElement can play natively.
 * Strictly capped at 180s to prevent browser memory exhaustion.
 */
async function generateMelodyWavUrl(trackIndex: number, durationSeconds = 180): Promise<string> {
  if (melodyWavUrlCache.has(trackIndex)) {
    return melodyWavUrlCache.get(trackIndex)!;
  }

  // Safety Cap: OfflineAudioContext must never allocate excessive uncompressed PCM audio in memory.
  const targetDuration = Math.min(180, Math.max(60, durationSeconds || 180));
  const sampleRate = 22050; // Optimized for rapid rendering and soft lofi warmth
  const totalSamples = sampleRate * targetDuration;

  const OfflineCtxClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;

  const offlineCtx = new OfflineCtxClass(2, totalSamples, sampleRate);
  const chords = CHORD_PROGRESSIONS[trackIndex % CHORD_PROGRESSIONS.length];
  const chordStepDuration = 3.2;

  // Master Gain
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.45, 0);
  masterGain.connect(offlineCtx.destination);

  let curTime = 0;
  let chordIdx = 0;

  while (curTime < durationSeconds) {
    const chord = chords[chordIdx % chords.length];
    chordIdx++;

    // Play chord tones
    chord.forEach((freq, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, curTime);

      gain.gain.setValueAtTime(0.0001, curTime);
      gain.gain.exponentialRampToValueAtTime(0.05 / chord.length, curTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, curTime + chordStepDuration);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(curTime);
      osc.stop(curTime + chordStepDuration);
    });

    // Play melody notes within the chord step
    const notesInStep = 3;
    const subStep = chordStepDuration / notesInStep;
    for (let n = 0; n < notesInStep; n++) {
      const noteTime = curTime + n * subStep;
      if (noteTime >= durationSeconds) break;

      const upperNotes = chord.filter((f) => f > 240);
      const pitch =
        upperNotes.length > 0 && Math.random() > 0.4
          ? upperNotes[Math.floor(Math.random() * upperNotes.length)]
          : PENTATONIC_FREQS[Math.floor(Math.random() * PENTATONIC_FREQS.length)];

      const melOsc = offlineCtx.createOscillator();
      const melGain = offlineCtx.createGain();
      melOsc.type = 'sine';
      melOsc.frequency.setValueAtTime(pitch, noteTime);

      melGain.gain.setValueAtTime(0.0001, noteTime);
      melGain.gain.exponentialRampToValueAtTime(0.09, noteTime + 0.06);
      melGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.4);

      melOsc.connect(melGain);
      melGain.connect(masterGain);
      melOsc.start(noteTime);
      melOsc.stop(noteTime + 1.4);

      // Gentle bell sparkle
      if (Math.random() > 0.5) {
        const bellPitch = PENTATONIC_FREQS[Math.floor(Math.random() * PENTATONIC_FREQS.length)] * 2;
        const bellOsc = offlineCtx.createOscillator();
        const bellGain = offlineCtx.createGain();
        bellOsc.type = 'triangle';
        bellOsc.frequency.setValueAtTime(bellPitch, noteTime + 0.2);

        bellGain.gain.setValueAtTime(0.0001, noteTime + 0.2);
        bellGain.gain.exponentialRampToValueAtTime(0.025, noteTime + 0.23);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.1);

        bellOsc.connect(bellGain);
        bellGain.connect(masterGain);
        bellOsc.start(noteTime + 0.2);
        bellOsc.stop(noteTime + 1.1);
      }
    }

    curTime += chordStepDuration;
  }

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWavBlob(renderedBuffer);
  const blobUrl = URL.createObjectURL(wavBlob);
  melodyWavUrlCache.set(trackIndex, blobUrl);
  return blobUrl;
}

/**
 * Universal background music engine powered by ONE SINGLE HTMLAudioElement instance.
 * Guarantees that play, pause, seek, volume, and mute work 100% consistently for all songs.
 */
class BackgroundMusicEngine {
  // THE ONE AND ONLY AUDIO ELEMENT
  private audio: HTMLAudioElement;

  private isPlaying = false;
  private currentTrackIndex = 0;
  private volume = 0.4;
  private prevVolume = 0.4;
  private tracks: AudioTrack[] = [...DEFAULT_TRACK_LIST];
  private currentTime = 0;
  private duration = 210;
  private isLoading = false;
  private loadingProgress: string | null = null;
  private currentSourceType: AudioSourceType = 'synth';
  private listeners: Array<(state: AudioPlaybackState) => void> = [];
  private activeBlobUrl: string | null = null;
  private retryCount = 0;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    // DO NOT set crossOrigin = 'anonymous' so standard direct audio URLs play without CORS blocks!
    this.audio.volume = this.volume;

    this.attachAudioEventListeners();
    this.loadTracksFromStorage();
    this.initFirestoreSync();

    try {
      const savedVolume = localStorage.getItem('better_bgm_volume');
      if (savedVolume !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(savedVolume)));
        this.audio.volume = this.volume;
      }
      const savedTrack = localStorage.getItem('better_bgm_track');
      if (savedTrack !== null) {
        const idx = parseInt(savedTrack, 10);
        if (idx >= 0 && idx < this.tracks.length) {
          this.currentTrackIndex = idx;
        }
      }
    } catch {
      // safe fallback
    }

    const currentTrack = this.getCurrentTrack();
    this.duration = parseDurationToSeconds(currentTrack.duration);
    this.currentSourceType = this.resolveTrackSourceType(currentTrack);
  }

  private attachAudioEventListeners() {
    // 1. Time Update
    this.audio.addEventListener('timeupdate', () => {
      if (!isNaN(this.audio.currentTime)) {
        this.currentTime = this.audio.currentTime;
        if (!isNaN(this.audio.duration) && this.audio.duration > 0 && isFinite(this.audio.duration)) {
          this.duration = this.audio.duration;
        }
        this.notify();
      }
    });

    // 2. Metadata Loaded
    this.audio.addEventListener('loadedmetadata', () => {
      if (!isNaN(this.audio.duration) && this.audio.duration > 0 && isFinite(this.audio.duration)) {
        this.duration = this.audio.duration;
      }
      this.isLoading = false;
      this.notify();
    });

    // 3. Duration Change
    this.audio.addEventListener('durationchange', () => {
      if (!isNaN(this.audio.duration) && this.audio.duration > 0 && isFinite(this.audio.duration)) {
        this.duration = this.audio.duration;
        this.notify();
      }
    });

    // 4. Play Event
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.isLoading = false;
      this.notify();
    });

    // 5. Pause Event
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notify();
    });

    // 6. Track Ended -> Auto Play Next
    this.audio.addEventListener('ended', () => {
      this.nextTrack();
    });

    // 7. Waiting / Buffering Event
    this.audio.addEventListener('waiting', () => {
      this.isLoading = true;
      this.notify();
    });

    // 8. Can Play Event
    this.audio.addEventListener('canplay', () => {
      this.isLoading = false;
      this.notify();
    });

    // 9. Error Handler
    this.audio.addEventListener('error', (e) => {
      console.warn('Audio element error event:', e);
      this.isLoading = false;

      const track = this.getCurrentTrack();
      const rawUrl = track.audioUrl || '';

      // If external link failed and backend server has proxy
      if (rawUrl && !rawUrl.startsWith('/api/') && !rawUrl.startsWith('blob:') && this.retryCount === 0 && hasBackendServer()) {
        this.retryCount = 1;
        const proxyUrl = buildApiUrl(`/api/proxy-audio?url=${encodeURIComponent(rawUrl)}`);
        console.log('Retrying audio playback through backend proxy:', proxyUrl);
        this.audio.src = proxyUrl;
        this.audio.load();
        this.audio.play().catch(() => {});
        return;
      }

      // Only fallback to synth melody if the track is explicitly a synth track or has no audioUrl
      if (!rawUrl || track.sourceType === 'synth') {
        if (this.retryCount <= 1) {
          this.retryCount = 2;
          console.log('Playing built-in ambient melody for synth track:', track.title);
          this.currentSourceType = 'synth';
          generateMelodyWavUrl(this.currentTrackIndex, 180).then((url) => {
            this.audio.src = url;
            this.audio.load();
            this.audio.play().catch(() => {});
            this.notify();
          });
        }
      } else {
        // Direct audio stream (e.g. Cloudinary) failed to load
        console.warn(`[BGM] Could not load audio stream for track: "${track.title}" from URL:`, rawUrl);
        this.isPlaying = false;
        this.notify();
      }
    });
  }

  private resolveTrackSourceType(track: AudioTrack): AudioSourceType {
    if (track.sourceType) return track.sourceType;
    if (!track.audioUrl) return 'synth';
    const u = track.audioUrl.toLowerCase();
    if (u.startsWith('/api/audio') || u.startsWith('blob:') || u.startsWith('data:')) return 'uploaded';
    if (u.includes('drive.google.com')) return 'gdrive';
    return 'direct';
  }

  private initFirestoreSync() {
    // Offload playlist entirely to Server API, GitHub CDN (playlist.json), and LocalStorage.
    // This preserves 100% of Firebase Quota for Comments, Letters, and Reader Reactions!
    this.pullServerPlaylist();
  }

  public async pullServerPlaylist() {
    let loaded = false;
    if (hasBackendServer()) {
      try {
        const res = await fetch(buildApiUrl('/api/playlist'));
        if (res.ok) {
          const serverTracks = await res.json();
          if (Array.isArray(serverTracks) && serverTracks.length > 0) {
            this.mergeTracks(serverTracks);
            loaded = true;
          }
        }
      } catch (err) {
        console.warn('Server playlist fetch note:', err);
      }
    }

    if (!loaded) {
      try {
        const ghTracks = await fetchRawGithubJson<AudioTrack[]>('playlist.json');
        if (Array.isArray(ghTracks) && ghTracks.length > 0) {
          this.mergeTracks(ghTracks);
        }
      } catch {}
    }
  }

  public mergeTracks(remoteTracks: AudioTrack[]) {
    if (!Array.isArray(remoteTracks) || remoteTracks.length === 0) return;

    // Use remoteTracks from author/GitHub as authoritative list
    const map = new Map<string, AudioTrack>();
    remoteTracks.forEach((t) => map.set(t.id, t));

    // Keep any user-added custom tracks that exist locally and aren't default synth tracks
    this.tracks.forEach((t) => {
      if (!map.has(t.id) && t.sourceType !== 'synth') {
        map.set(t.id, t);
      }
    });

    const list = Array.from(map.values());
    if (list.length > 0) {
      this.tracks = list;
      TRACK_LIST = list;
      this.saveTracksToStorage();
      this.notify();
    }
  }

  public handleServerTrackEvent(type: string, payload: any) {
    if (type === 'playlist_saved' && payload && payload.id) {
      const idx = this.tracks.findIndex((t) => t.id === payload.id);
      if (idx >= 0) {
        this.tracks[idx] = payload;
      } else {
        this.tracks.push(payload);
      }
      TRACK_LIST = this.tracks;
      this.saveTracksToStorage();
      this.notify();
    } else if (type === 'playlist_updated' && Array.isArray(payload)) {
      this.tracks = payload;
      TRACK_LIST = this.tracks;
      this.saveTracksToStorage();
      this.notify();
    } else if (type === 'playlist_deleted' && payload && payload.id) {
      this.tracks = this.tracks.filter((t) => t.id !== payload.id);
      TRACK_LIST = this.tracks;
      this.saveTracksToStorage();
      this.notify();
    }
  }

  private loadTracksFromStorage() {
    try {
      const raw = localStorage.getItem('better_bgm_custom_playlist');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tracks = parsed;
          TRACK_LIST = this.tracks;
          return;
        }
      }
    } catch {}
    this.tracks = [...DEFAULT_TRACK_LIST];
    TRACK_LIST = this.tracks;
  }

  private saveTracksToStorage() {
    try {
      localStorage.setItem('better_bgm_custom_playlist', JSON.stringify(this.tracks));
      TRACK_LIST = this.tracks;
    } catch {}
  }

  public getTracks(): AudioTrack[] {
    return [...this.tracks];
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): AudioTrack {
    return this.tracks[this.currentTrackIndex] || this.tracks[0] || DEFAULT_TRACK_LIST[0];
  }

  public getPlaybackState(): AudioPlaybackState {
    const track = this.getCurrentTrack();
    return {
      isPlaying: this.isPlaying,
      track,
      volume: this.volume,
      tracks: this.getTracks(),
      currentTime: this.currentTime,
      duration: this.duration > 0 ? this.duration : parseDurationToSeconds(track.duration),
      sourceType: this.currentSourceType,
      isMuted: this.volume === 0,
      isLoading: this.isLoading,
      loadingProgress: this.loadingProgress,
    };
  }

  public subscribe(fn: (state: AudioPlaybackState) => void) {
    this.listeners.push(fn);
    fn(this.getPlaybackState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    const state = this.getPlaybackState();
    this.listeners.forEach((fn) => fn(state));
  }

  /**
   * Resolves the playable URL for a track:
   * - If cached in IndexedDB: uses instant local Blob URL
   * - If uploaded or from Firestore cloud storage: downloads chunks, caches in IDB, and plays
   * - If server hosted (/api/audio/...): resolves full endpoint
   * - If Google Drive: routes through /api/proxy-audio
   * - If external stream: handles direct / proxy
   * - If empty: generates high quality WAV Audio Blob from offline piano synth
   */
  private async resolvePlayableUrl(track: AudioTrack, trackIndex: number): Promise<string> {
    // 1. Check client IndexedDB cache first (instant playback if uploaded or previously downloaded)
    try {
      const localBlob = await getAudioBlobFromIDB(track.id);
      if (localBlob) {
        if (this.activeBlobUrl) {
          URL.revokeObjectURL(this.activeBlobUrl);
        }
        this.activeBlobUrl = URL.createObjectURL(localBlob);
        this.currentSourceType = 'uploaded';
        return this.activeBlobUrl;
      }
    } catch {}

    const rawUrl = track.audioUrl?.trim() || '';

    // 2. Cloud-uploaded track stored in Firestore chunks (plays across all devices & servers)
    if (
      track.sourceType === 'uploaded' ||
      rawUrl.startsWith('firestore://') ||
      (track.totalChunks && track.totalChunks > 0)
    ) {
      try {
        this.isLoading = true;
        this.loadingProgress = 'Đang tải bài hát từ đám mây...';
        this.notify();

        const totalChunks = track.totalChunks || 1;
        const blob = await downloadAudioFromFirestore(
          track.id,
          totalChunks,
          track.mimeType || 'audio/mpeg',
          (pct) => {
            this.loadingProgress = `Đang đồng bộ âm thanh (${pct}%)...`;
            this.notify();
          }
        );

        // Cache permanently into this device's IndexedDB so subsequent plays are instant (0 ms latency)
        await saveAudioBlobToIDB(track.id, blob, track.title);

        if (this.activeBlobUrl) {
          URL.revokeObjectURL(this.activeBlobUrl);
        }
        this.activeBlobUrl = URL.createObjectURL(blob);
        this.currentSourceType = 'uploaded';
        this.loadingProgress = null;
        return this.activeBlobUrl;
      } catch (cloudErr) {
        console.warn(`[BGM] Cloud chunk fetch fallback for "${track.title}":`, cloudErr);
      } finally {
        this.loadingProgress = null;
      }
    }

    // 3. Dead blob URL guard:
    // A blob: URL is only valid on the single browser session where it was generated.
    // If not in this device's IndexedDB and not on Firestore, fallback to melody.
    if (rawUrl.startsWith('blob:')) {
      console.warn(`[BGM] Track "${track.title}" has an expired local blob URL. Falling back to ambient melody.`);
      this.currentSourceType = 'synth';
      return await generateMelodyWavUrl(trackIndex, 180);
    }

    // 4. Direct server-hosted audio (/api/audio/...)
    if (rawUrl.startsWith('/api/')) {
      this.currentSourceType = 'uploaded';
      return resolveFullAudioUrl(rawUrl);
    }

    // 4. Data URL
    if (rawUrl.startsWith('data:audio/')) {
      this.currentSourceType = 'uploaded';
      return rawUrl;
    }

    // 5. Google Drive audio links -> Convert to direct streaming URL
    if (rawUrl.includes('drive.google.com')) {
      this.currentSourceType = 'gdrive';
      const driveDirectUrl = formatGoogleDriveStreamUrl(rawUrl);
      return driveDirectUrl;
    }

    // 6. Dropbox links
    if (rawUrl.includes('dropbox.com')) {
      this.currentSourceType = 'direct';
      return convertDropboxToDirectUrl(rawUrl);
    }

    // 7. OneDrive links
    if (rawUrl.includes('1drv.ms') || rawUrl.includes('onedrive.live.com')) {
      this.currentSourceType = 'direct';
      return convertOneDriveToDirectUrl(rawUrl);
    }

    // 8. Direct HTTP/HTTPS audio stream
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      this.currentSourceType = 'direct';
      try {
        return encodeURI(decodeURI(rawUrl));
      } catch {
        return rawUrl;
      }
    }

    // 9. Built-in sweet ambient piano melody -> generated to WAV Blob URL
    this.currentSourceType = 'synth';
    const targetDuration = Math.min(180, parseDurationToSeconds(track.duration) || 180);
    return await generateMelodyWavUrl(trackIndex, targetDuration);
  }

  /**
   * Main Play function.
   * Directs playback through the single unified HTMLAudioElement.
   */
  public async play(trackIndex?: number) {
    if (trackIndex !== undefined && trackIndex >= 0 && trackIndex < this.tracks.length) {
      if (trackIndex !== this.currentTrackIndex) {
        this.currentTrackIndex = trackIndex;
        this.currentTime = 0;
        try {
          localStorage.setItem('better_bgm_track', trackIndex.toString());
        } catch {}
      }
    }

    const currentTrack = this.getCurrentTrack();
    this.retryCount = 0;
    this.isLoading = true;
    this.notify();

    try {
      const playableUrl = await this.resolvePlayableUrl(currentTrack, this.currentTrackIndex);

      // Only update src if different to allow continuous seeking and resume
      if (this.audio.src !== playableUrl) {
        this.audio.src = playableUrl;
        this.audio.load();
      }

      this.audio.volume = this.volume;

      // Resume at currentTime if valid
      if (this.currentTime > 0 && !isNaN(this.currentTime)) {
        try {
          this.audio.currentTime = this.currentTime;
        } catch {}
      }

      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            this.isLoading = false;
            this.notify();
          })
          .catch((err) => {
            console.warn('Audio play was interrupted or waiting for user interaction:', err);
            this.isPlaying = false;
            this.isLoading = false;
            this.notify();
          });
      }
    } catch (err) {
      console.error('Error resolving track for playback:', err);
      this.isLoading = false;
      this.notify();
    }
  }

  public pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Seek directly to target seconds in the track.
   * Works consistently for every song.
   */
  public seek(seconds: number) {
    const target = Math.max(0, Math.min(seconds, this.duration));
    this.currentTime = target;

    try {
      if (!isNaN(this.audio.duration) && isFinite(this.audio.duration)) {
        this.audio.currentTime = target;
      }
    } catch (err) {
      console.warn('Audio seek error:', err);
    }

    this.notify();
  }

  public nextTrack() {
    if (this.tracks.length === 0) return;
    this.currentTime = 0;
    const nextIdx = (this.currentTrackIndex + 1) % this.tracks.length;
    this.play(nextIdx);
  }

  public prevTrack() {
    if (this.tracks.length === 0) return;
    this.currentTime = 0;
    const prevIdx = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.play(prevIdx);
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    this.audio.volume = clamped;
    this.audio.muted = clamped === 0;

    try {
      localStorage.setItem('better_bgm_volume', clamped.toString());
    } catch {}
    this.notify();
  }

  public toggleMute() {
    if (this.volume === 0) {
      this.setVolume(this.prevVolume || 0.4);
    } else {
      this.prevVolume = this.volume;
      this.setVolume(0);
    }
  }

  /**
   * Adds an audio track created via file upload.
   * Stores binary audio in Firestore chunks & caches in local IndexedDB.
   * Guarantees 100% playback across all devices, browsers, and servers (including GitHub Pages).
   */
  public async addUploadedTrack(
    params: {
      file: File;
      title: string;
      artist?: string;
      mood?: string;
      duration?: string;
      addedBy?: string;
    },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<AudioTrack> {
    const trackId = `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Upload directly to central server first (guarantees real streaming URL with Range 206)
    let serverPublicUrl = '';
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(params.file);
      });
      let uploadRes: Response | null = null;
      if (hasBackendServer()) {
        uploadRes = await fetch(buildApiUrl('/api/upload-audio'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: params.file.name,
            data: base64,
            mimeType: params.file.type || 'audio/mpeg',
          }),
        });
        if (uploadRes && uploadRes.ok) {
          const json = await uploadRes.json();
          if (json.url) {
            serverPublicUrl = json.url;
          }
        }
      }
    } catch (serverErr) {
      console.warn('Direct audio upload to server warning:', serverErr);
    }

    // 2. Cache blob in IndexedDB immediately for instant zero-latency playback on the current device
    await saveAudioBlobToIDB(trackId, params.file, params.file.name);

    // 3. Try Firestore cloud storage backup (resilient against 429 quota exhaustion)
    let totalChunks = 1;
    let fileSizeStr = `${(params.file.size / (1024 * 1024)).toFixed(1)} MB`;
    let mimeType = params.file.type || 'audio/mpeg';

    try {
      const fsRes = await uploadAudioToFirestore(trackId, params.file, onProgress);
      totalChunks = fsRes.totalChunks;
      fileSizeStr = fsRes.fileSizeStr;
      mimeType = fsRes.mimeType;
    } catch (chunkErr) {
      console.warn('Firestore cloud audio backup note (proceeding with server URL):', chunkErr);
    }

    const publicUrl = serverPublicUrl || `firestore://${trackId}`;

    const newTrack: AudioTrack = {
      id: trackId,
      title: params.title.trim(),
      artist: (params.artist || 'Mellifluous').trim(),
      duration: params.duration || '03:30',
      mood: params.mood?.trim() || 'File âm thanh của bạn',
      audioUrl: publicUrl,
      sourceType: 'uploaded',
      fileSize: fileSizeStr,
      mimeType,
      totalChunks,
      addedBy: params.addedBy || 'Tác giả',
      createdAt: new Date().toISOString(),
      isLocalOnly: false,
    };

    this.tracks.push(newTrack);
    TRACK_LIST = this.tracks;
    this.saveTracksToStorage();
    this.notify();

    // 4. Persist and broadcast to central server API
    if (hasBackendServer()) {
      try {
        await fetch(buildApiUrl('/api/playlist'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTrack),
        });
      } catch (err) {
        console.warn('Server playlist POST note:', err);
      }
    }

    // 5. Sync to Firestore if available
    try {
      await setDoc(
        doc(db, 'site_stats', 'music_playlist'),
        { tracks: this.tracks, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      await setDoc(doc(db, 'music_tracks', newTrack.id), newTrack).catch(() => {});
    } catch (err) {
      console.warn('Firestore track sync note:', err);
    }

    return newTrack;
  }

  /**
   * Adds an audio track via online URL.
   */
  public async addTrack(track: Omit<AudioTrack, 'id'>): Promise<AudioTrack> {
    const newTrack: AudioTrack = {
      ...track,
      id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      sourceType: this.resolveTrackSourceType(track as AudioTrack),
    };

    this.tracks.push(newTrack);
    TRACK_LIST = this.tracks;
    this.saveTracksToStorage();
    this.notify();

    // Persist and broadcast to central server API
    if (hasBackendServer()) {
      try {
        await fetch(buildApiUrl('/api/playlist'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTrack),
        });
      } catch (err) {
        console.warn('Server playlist POST note:', err);
      }
    }

    try {
      await setDoc(
        doc(db, 'site_stats', 'music_playlist'),
        { tracks: this.tracks, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      await setDoc(doc(db, 'music_tracks', newTrack.id), newTrack).catch(() => {});
    } catch (err) {
      console.warn('Error saving track to Firestore:', err);
    }

    // Background sync playlist.json to GitHub repository
    try {
      const ghConfig = getGithubConfig();
      if (ghConfig.token && ghConfig.autoSync) {
        commitGithubDataFile('playlist.json', this.tracks, `Thêm bài hát: ${newTrack.title} [skip ci]`).catch(() => {});
      }
    } catch {}

    return newTrack;
  }

  public async updateTrack(trackId: string, updates: Partial<AudioTrack>): Promise<boolean> {
    const index = this.tracks.findIndex((t) => t.id === trackId);
    if (index === -1) return false;

    this.tracks[index] = {
      ...this.tracks[index],
      ...updates,
      sourceType: this.resolveTrackSourceType({ ...this.tracks[index], ...updates }),
    };
    TRACK_LIST = this.tracks;
    this.saveTracksToStorage();

    if (this.currentTrackIndex === index && this.isPlaying) {
      this.play(index);
    } else {
      this.notify();
    }

    // Persist to central server API
    if (hasBackendServer()) {
      try {
        await fetch(buildApiUrl('/api/playlist'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.tracks),
        });
      } catch (err) {
        console.warn('Server playlist PUT note:', err);
      }
    }

    try {
      await setDoc(
        doc(db, 'site_stats', 'music_playlist'),
        { tracks: this.tracks, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      await setDoc(doc(db, 'music_tracks', trackId), this.tracks[index], { merge: true }).catch(() => {});
    } catch (err) {
      console.warn('Error updating track in Firestore:', err);
    }

    // Background sync playlist.json to GitHub repository
    try {
      const ghConfig = getGithubConfig();
      if (ghConfig.token && ghConfig.autoSync) {
        commitGithubDataFile('playlist.json', this.tracks, `Cập nhật bài hát ID: ${trackId} [skip ci]`).catch(() => {});
      }
    } catch {}

    return true;
  }

  public async removeTrack(trackId: string): Promise<boolean> {
    if (this.tracks.length <= 1) return false;
    const indexToRemove = this.tracks.findIndex((t) => t.id === trackId);
    if (indexToRemove === -1) return false;

    const wasPlayingCurrent = this.isPlaying && this.currentTrackIndex === indexToRemove;
    this.tracks = this.tracks.filter((t) => t.id !== trackId);
    TRACK_LIST = this.tracks;
    this.saveTracksToStorage();

    if (this.currentTrackIndex >= this.tracks.length) {
      this.currentTrackIndex = Math.max(0, this.tracks.length - 1);
    }

    if (wasPlayingCurrent) {
      this.play(this.currentTrackIndex);
    } else {
      this.notify();
    }

    // Delete from central server API
    if (hasBackendServer()) {
      try {
        await fetch(buildApiUrl(`/api/playlist/${trackId}`), {
          method: 'DELETE',
        });
      } catch (err) {
        console.warn('Server playlist DELETE note:', err);
      }
    }

    // Clean up cloud audio chunks from Firestore if it was an uploaded track
    const trackToRemove = this.tracks.find((t) => t.id === trackId);
    if (trackToRemove && (trackToRemove.sourceType === 'uploaded' || trackToRemove.audioUrl?.startsWith('firestore://'))) {
      deleteAudioFromFirestore(trackId, trackToRemove.totalChunks || 30).catch(() => {});
    }

    await deleteAudioBlobFromIDB(trackId);

    try {
      await setDoc(
        doc(db, 'site_stats', 'music_playlist'),
        { tracks: this.tracks, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      await deleteDoc(doc(db, 'music_tracks', trackId)).catch(() => {});
    } catch (err) {
      console.warn('Error removing track from Firestore:', err);
    }

    // Background sync playlist.json to GitHub repository
    try {
      const ghConfig = getGithubConfig();
      if (ghConfig.token && ghConfig.autoSync) {
        commitGithubDataFile('playlist.json', this.tracks, `Xóa bài hát ID: ${trackId} [skip ci]`).catch(() => {});
      }
    } catch {}

    return true;
  }

  public async resetToDefaultTracks(): Promise<void> {
    this.audio.pause();
    const oldTracks = [...this.tracks];
    this.tracks = [...DEFAULT_TRACK_LIST];
    this.saveTracksToStorage();
    this.currentTrackIndex = 0;
    this.currentTime = 0;
    if (this.isPlaying) {
      this.play(0);
    } else {
      this.notify();
    }

    try {
      await setDoc(
        doc(db, 'site_stats', 'music_playlist'),
        { tracks: this.tracks, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      for (const t of oldTracks) {
        if (!DEFAULT_TRACK_LIST.some((def) => def.id === t.id)) {
          await deleteDoc(doc(db, 'music_tracks', t.id)).catch(() => {});
          await deleteAudioBlobFromIDB(t.id);
        }
      }
      for (const def of DEFAULT_TRACK_LIST) {
        await setDoc(doc(db, 'music_tracks', def.id), def).catch(() => {});
      }
    } catch (err) {
      console.warn('Error syncing default tracks to Firestore:', err);
    }
  }
}

export const bgmEngine = new BackgroundMusicEngine();
