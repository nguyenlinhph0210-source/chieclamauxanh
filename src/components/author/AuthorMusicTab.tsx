import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Link as LinkIcon,
  Edit2,
  Save,
  X,
  Volume2,
  VolumeX,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Loader2,
  HardDrive,
  SkipForward,
  SkipBack,
} from 'lucide-react';
import {
  bgmEngine,
  AudioTrack,
  formatSecondsToTime,
  AudioSourceType,
} from '../../utils/audioPlayer';

interface AuthorMusicTabProps {
  onFeedback: (type: 'success' | 'error', text: string) => void;
}

export const AuthorMusicTab: React.FC<AuthorMusicTabProps> = ({ onFeedback }) => {
  const [tracks, setTracks] = useState<AudioTrack[]>(() => bgmEngine.getTracks());
  const [isPlaying, setIsPlaying] = useState<boolean>(() => bgmEngine.getIsPlaying());
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>(() => bgmEngine.getCurrentTrack());
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(210);
  const [sourceType, setSourceType] = useState<AudioSourceType>('synth');
  const [volume, setVolume] = useState<number>(0.4);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Mode: Upload file or Paste link
  const [inputMode, setInputMode] = useState<'upload' | 'link'>('upload');

  // File Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; stepText: string } | null>(null);
  const [fileDuration, setFileDuration] = useState<string>('03:30');
  const [fileDurationSec, setFileDurationSec] = useState<number>(210);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Common Form states
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('Mellifluous');
  const [mood, setMood] = useState('Thư giãn');
  const [audioUrl, setAudioUrl] = useState('');
  const [durationInput, setDurationInput] = useState('03:30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editAudioUrl, setEditAudioUrl] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editDuration, setEditDuration] = useState('03:30');

  // Seeking state
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  useEffect(() => {
    const unsubscribe = bgmEngine.subscribe((state) => {
      setTracks(state.tracks);
      setIsPlaying(state.isPlaying);
      setCurrentTrack(state.track);
      setDuration(state.duration || 210);
      setSourceType(state.sourceType);
      setVolume(state.volume);
      setIsMuted(state.isMuted);
      setIsLoading(state.isLoading);
      if (!isSeeking) {
        setCurrentTime(state.currentTime);
      }
    });
    return unsubscribe;
  }, [isSeeking]);

  // Handle local audio file selection
  const handleFileChange = (file: File) => {
    if (!file) return;

    // Check mime or extension
    const validExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac', '.webm'];
    const fileNameLower = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileNameLower.endsWith(ext)) || file.type.startsWith('audio/');

    if (!isValid) {
      onFeedback('error', 'Vui lòng chọn file âm thanh hợp lệ (.mp3, .m4a, .wav, .ogg, .aac, .flac).');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      onFeedback('error', 'Dung lượng file vượt quá giới hạn cho phép (Tối đa 50MB).');
      return;
    }

    setSelectedFile(file);

    // Auto-clean file title
    const rawName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanTitle = rawName
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title.trim() || title === 'Giai điệu mới') {
      setTitle(cleanTitle);
    }

    // Measure exact audio duration
    try {
      const tempAudio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      tempAudio.src = objectUrl;
      tempAudio.addEventListener('loadedmetadata', () => {
        if (!isNaN(tempAudio.duration) && tempAudio.duration > 0) {
          const formatted = formatSecondsToTime(tempAudio.duration);
          setFileDuration(formatted);
          setFileDurationSec(tempAudio.duration);
          setDurationInput(formatted);
        }
        URL.revokeObjectURL(objectUrl);
      });
      tempAudio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
      });
    } catch {
      // Fallback
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      onFeedback('error', 'Vui lòng nhập tên bài hát.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (inputMode === 'upload') {
        if (!selectedFile) {
          onFeedback('error', 'Vui lòng chọn file âm thanh cần tải lên từ thiết bị.');
          setIsSubmitting(false);
          return;
        }

        const newTrack = await bgmEngine.addUploadedTrack(
          {
            file: selectedFile,
            title: title.trim(),
            artist: artist.trim() || 'Mellifluous',
            mood: mood.trim() || 'File âm thanh đã tải lên',
            duration: fileDuration || durationInput || '03:30',
            addedBy: 'Tác giả',
          },
          (progress) => {
            setUploadProgress(progress);
          }
        );

        setUploadProgress(null);
        onFeedback(
          'success',
          `Đã tải lên và đồng bộ bài hát "${newTrack.title}" lên đám mây thành công! Tất cả thiết bị và người đọc đều có thể nghe được.`
        );

        // Reset form
        setSelectedFile(null);
        setTitle('');
        setArtist('Mellifluous');
        setMood('Thư giãn');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Auto-play the newly uploaded track
        const updatedTracks = bgmEngine.getTracks();
        const newIndex = updatedTracks.findIndex((t) => t.id === newTrack.id);
        if (newIndex !== -1) {
          bgmEngine.play(newIndex);
        }
      } else {
        // Link Mode
        if (!audioUrl.trim()) {
          onFeedback('error', 'Vui lòng nhập đường link phát nhạc trực tuyến.');
          setIsSubmitting(false);
          return;
        }

        const newTrack = await bgmEngine.addTrack({
          title: title.trim(),
          artist: artist.trim() || 'Mellifluous Chill',
          audioUrl: audioUrl.trim(),
          mood: mood.trim() || 'Nhạc phát trực tuyến',
          duration: durationInput.trim() || '03:30',
          addedBy: 'Tác giả',
        });

        onFeedback('success', `Đã thêm bài hát "${newTrack.title}" vào danh sách phát!`);

        // Reset form
        setTitle('');
        setArtist('Mellifluous');
        setAudioUrl('');
        setMood('Thư giãn');
        setDurationInput('03:30');

        // Auto-play
        const updatedTracks = bgmEngine.getTracks();
        const newIndex = updatedTracks.findIndex((t) => t.id === newTrack.id);
        if (newIndex !== -1) {
          bgmEngine.play(newIndex);
        }
      }
    } catch (err: any) {
      console.error('Error adding track:', err);
      onFeedback('error', `Lỗi khi lưu bài hát: ${err.message || 'Không xác định'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (t: AudioTrack) => {
    setEditingTrackId(t.id);
    setEditTitle(t.title);
    setEditArtist(t.artist);
    setEditAudioUrl(t.audioUrl || '');
    setEditMood(t.mood || '');
    setEditDuration(t.duration || '03:30');
  };

  const handleSaveEdit = async (trackId: string) => {
    if (!editTitle.trim()) {
      onFeedback('error', 'Tên bài hát không được để trống.');
      return;
    }

    try {
      const u = editAudioUrl.trim();
      const isStillLocal = !u || u.startsWith('blob:');
      await bgmEngine.updateTrack(trackId, {
        title: editTitle.trim(),
        artist: editArtist.trim() || 'Mellifluous',
        audioUrl: u || undefined,
        mood: editMood.trim() || undefined,
        duration: editDuration.trim() || undefined,
        isLocalOnly: isStillLocal,
      });
      setEditingTrackId(null);
      onFeedback('success', 'Đã cập nhật thông tin bài hát thành công!');
    } catch {
      onFeedback('error', 'Lỗi khi cập nhật bài hát.');
    }
  };

  const handleRemoveTrack = async (trackId: string, trackTitle: string) => {
    if (tracks.length <= 1) {
      onFeedback('error', 'Playlist cần giữ lại tối thiểu 1 tác phẩm nhạc.');
      return;
    }

    try {
      const ok = await bgmEngine.removeTrack(trackId);
      if (ok) {
        onFeedback('success', `Đã xóa bài hát "${trackTitle}" khỏi playlist.`);
      }
    } catch {
      onFeedback('error', 'Không thể xóa bài hát này.');
    }
  };

  const handleResetTracks = async () => {
    try {
      await bgmEngine.resetToDefaultTracks();
      onFeedback('success', 'Đã khôi phục danh sách nhạc nền mặc định ban đầu.');
    } catch {
      onFeedback('error', 'Không thể đặt lại danh sách nhạc.');
    }
  };

  const handlePlayTrack = (trackIndex: number) => {
    bgmEngine.play(trackIndex);
  };

  const handleTogglePlay = () => {
    bgmEngine.togglePlay();
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
    setSeekValue(currentTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setIsSeeking(false);
    setCurrentTime(val);
    bgmEngine.seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    bgmEngine.setVolume(val);
  };

  const handleToggleMute = () => {
    bgmEngine.toggleMute();
  };

  const getSourceBadge = (t: AudioTrack) => {
    const u = (t.audioUrl || '').toLowerCase();

    if (u.startsWith('firestore://') || t.sourceType === 'uploaded' || (t.totalChunks && t.totalChunks > 0)) {
      return (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-medium border border-emerald-300 dark:border-emerald-800"
          title="Bản nhạc này được lưu trữ đám mây vĩnh viễn và đồng bộ tự động. Phát được 100% trên mọi thiết bị và trình duyệt của độc giả."
        >
          <CloudIcon className="w-3 h-3 text-emerald-600" />
          <span>Đám mây vĩnh viễn (Mọi thiết bị)</span>
        </span>
      );
    }

    const isLocal = t.isLocalOnly || (u.startsWith('blob:') && !t.totalChunks);

    if (isLocal) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 text-[10px] font-medium border border-amber-300 dark:border-amber-800" title="Bản nhạc này chỉ lưu trên máy này. Độc giả ở máy khác sẽ nghe giai điệu hòa tấu dự phòng.">
          <HardDrive className="w-3 h-3 text-amber-600" />
          <span>Lưu máy cục bộ</span>
        </span>
      );
    }
    if (u.includes('dropbox.com')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-medium border border-blue-200/80 dark:border-blue-800" title="Dropbox hỗ trợ phát trực tiếp trên 100% thiết bị di động và máy tính.">
          <CloudIcon className="w-3 h-3 text-blue-500" />
          <span>Dropbox (Phát mượt 100% thiết bị)</span>
        </span>
      );
    }
    if (u.includes('drive.google.com')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-medium border border-amber-300 dark:border-amber-800" title="Google Drive chặn phát nhúng trực tiếp, hệ thống sẽ phát qua máy chủ proxy. Khuyên dùng Dropbox để độc giả nghe mượt nhất.">
          <CloudIcon className="w-3 h-3 text-amber-600" />
          <span>Google Drive (Qua Proxy)</span>
        </span>
      );
    }
    if (t.audioUrl && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/api/'))) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium border border-emerald-200/80 dark:border-emerald-800">
          <LinkIcon className="w-3 h-3" />
          <span>Link trực tuyến (Toàn cầu)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 text-[10px] font-medium border border-pink-200/80 dark:border-pink-800">
        <Sparkles className="w-3 h-3" />
        <span>Giai điệu thư giãn</span>
      </span>
    );
  };

  return (
    <div id="author-music-management-tab" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50/80 to-amber-50/80 dark:from-stone-800 dark:via-stone-850 dark:to-stone-800 border border-pink-200/90 dark:border-stone-700 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-pink-500/15 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 shadow-2xs">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Quản Lý & Tải Lên Nhạc Nền Đọc Truyện</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300 font-sans font-medium">
                  {tracks.length} bài hát
                </span>
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-sans mt-0.5">
                Tất cả bài hát được phát bằng một trình phát âm thanh duy nhất, hỗ trợ tải file trực tiếp, Google Drive và nghe mượt mà không bị gián đoạn.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetTracks}
            className="self-start sm:self-center px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Khôi phục danh sách 4 giai điệu piano mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>Giai điệu ban đầu</span>
          </button>
        </div>
      </div>

      {/* Unified Master Audio Player Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-pink-200/90 dark:border-stone-700 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-750 pb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 ${
                isPlaying
                  ? 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white animate-pulse'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-pink-100 dark:hover:bg-stone-700'
              }`}
              title={isPlaying ? 'Tạm dừng bài hát' : 'Phát bài hát'}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100 truncate">
                  {currentTrack.title}
                </span>
                {getSourceBadge(currentTrack)}
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                {currentTrack.artist} • {currentTrack.mood || 'Thư giãn'}
              </p>
            </div>
          </div>

          {/* Quick Player Volume & Time Controls */}
          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-stone-500 hover:text-pink-600 dark:text-stone-400 cursor-pointer p-0.5"
                title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                title={`Âm lượng: ${Math.round(volume * 100)}%`}
              />
              <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 w-7 text-right">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            <div className="text-xs font-mono text-stone-600 dark:text-stone-300 font-medium px-2 py-1 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
              {formatSecondsToTime(isSeeking ? seekValue : currentTime)} / {formatSecondsToTime(duration)}
            </div>
          </div>
        </div>

        {/* Live Seek Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="1"
            value={isSeeking ? seekValue : currentTime}
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            onChange={handleSeekChange}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            className="w-full h-2 bg-stone-100 dark:bg-stone-750 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-hidden"
            title="Kéo thanh này để tua nhạc đến bất kỳ giây nào"
            aria-label="Tua tiến độ bài hát"
          />
          <div className="flex justify-between text-[10px] text-stone-400 font-mono">
            <span>{formatSecondsToTime(isSeeking ? seekValue : currentTime)}</span>
            <span>{formatSecondsToTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Add Music Section: Upload File vs Online Link Tabs */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-750 pb-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-pink-500" />
            <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
              Thêm bản nhạc mới vào playlist:
            </span>
          </div>

          {/* Input Mode Selector */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                inputMode === 'upload'
                  ? 'bg-white dark:bg-stone-800 text-pink-600 dark:text-pink-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải file trực tiếp từ máy (Đám mây vĩnh viễn)</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('link')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                inputMode === 'link'
                  ? 'bg-white dark:bg-stone-800 text-pink-600 dark:text-pink-400 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Dán link Dropbox / Online (File &gt; 25MB)</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* UPLOAD FILE TAB */}
          {inputMode === 'upload' ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2.5">
                <span className="text-base shrink-0">☁️</span>
                <div className="space-y-0.5">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Lưu trữ Đám mây tự động — Hoạt động 100% trên tất cả thiết bị, máy chủ & trình duyệt:
                  </p>
                  <p className="text-stone-600 dark:text-stone-400 text-[11px] leading-relaxed">
                    Khi bạn chọn file từ máy, hệ thống tự động phân tách và lưu trữ dữ liệu âm thanh an toàn lên Cơ sở dữ liệu Đám mây. Bất kỳ ai truy cập website từ điện thoại, máy tính, hay bất kỳ trình duyệt nào khác (kể cả GitHub Pages) đều sẽ nghe được trọn vẹn bài hát của bạn mà không gặp lỗi!
                  </p>
                </div>
              </div>

              {/* Live Upload Progress */}
              {uploadProgress && (
                <div className="p-3.5 rounded-xl bg-pink-50/70 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-850 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                      {uploadProgress.stepText}
                    </span>
                    <span className="font-bold text-pink-600 dark:text-pink-400 font-mono">
                      {uploadProgress.percent}%
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/30'
                    : selectedFile
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-stone-900'
                    : 'border-stone-300 dark:border-stone-700 hover:border-pink-400 hover:bg-stone-50/80 dark:hover:bg-stone-900/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-stone-800 dark:text-stone-200">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                      <FileAudio className="w-6 h-6" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-sm truncate text-emerald-800 dark:text-emerald-300">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                        Dung lượng: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Thời lượng ước tính: {fileDuration}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:text-pink-600">
                      Bấm để đổi file khác
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                        Kéo thả file âm thanh vào đây, hoặc click để duyệt file từ máy tính/điện thoại
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-sans">
                        Hỗ trợ: <span className="font-mono text-pink-600">.mp3, .m4a, .wav, .ogg, .aac, .flac</span> (Tự động đồng bộ lên đám mây)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* LINK TAB */
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-pink-500" />
                  <span>Dán đường link âm thanh (Dropbox / Google Drive / Link direct .mp3):</span>
                </label>
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://www.dropbox.com/scl/fi/.../song.mp3 hoặc https://drive.google.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-pink-400 focus:outline-hidden"
                />
              </div>

              {audioUrl.includes('dropbox.com') && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2">
                  <CloudIcon className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    ✅ <strong>Đã nhận diện link Dropbox (Tốt nhất)!</strong> Hệ thống tự động chuyển tiếp sang luồng phát chất lượng cao (raw stream), tương thích 100% mọi thiết bị của độc giả (iOS, Android, PC), hỗ trợ tua và tải cực nhanh.
                  </span>
                </div>
              )}

              {audioUrl.includes('drive.google.com') && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    ℹ️ <strong>Nhận diện link Google Drive.</strong> Google Drive áp dụng chính sách chặn phát nhúng trực tiếp trên web (CORP: same-site). Hệ thống sẽ định tuyến qua máy chủ proxy để hỗ trợ phát. <em>Gợi ý:</em> Để độc giả nghe mượt nhất mà không phụ thuộc máy chủ, bạn nên dùng <strong>Dropbox</strong> (hoàn toàn miễn phí, copy link dán vào là phát ngay)!
                  </span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 space-y-1">
                <p className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                  <span>✨ 3 bước dùng Dropbox phát nhạc cho 100% độc giả (Khuyên dùng):</span>
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-stone-600 dark:text-stone-300 pl-1">
                  <li>Tải bài hát lên <strong>Dropbox.com</strong> của bạn (miễn phí 2GB, chứa được hàng chục bài dài).</li>
                  <li>Nhấp vào nút <strong>Chia sẻ (Share)</strong> → chọn <strong>Sao chép liên kết (Copy link)</strong>.</li>
                  <li>Dán link vào ô phía trên. Hệ thống tự động kích hoạt chế độ phát trực tuyến mượt mà cho mọi độc giả trên toàn thế giới!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Common Metadata Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                Tên bài hát / Giai điệu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Gió Thổi Mùa Hạ"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:ring-2 focus:ring-pink-400 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                Nghệ sĩ / Thể hiện
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="VD: Piano Solo / Mellifluous"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:ring-2 focus:ring-pink-400 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                Mô tả / Thể loại cảm xúc
              </label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="VD: Piano nhẹ nhàng, Êm dịu đêm khuya..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:ring-2 focus:ring-pink-400 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                Thời lượng bài hát (Phút:Giây)
              </label>
              <input
                type="text"
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                placeholder="VD: 03:45"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-pink-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || (inputMode === 'upload' && !selectedFile)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải lên & lưu bài hát...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Thêm vào danh sách phát</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Playlist List with Play / Pause / Seek / Edit / Delete */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-750 pb-3">
          <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Danh sách phát hiện hành ({tracks.length})</span>
          </span>
          <span className="text-[11px] text-stone-500 dark:text-stone-400">
            Tất cả bài hát dùng chung 1 player duy nhất
          </span>
        </div>

        <div className="space-y-2.5">
          {tracks.map((t, idx) => {
            const isEditing = editingTrackId === t.id;
            const isCurrentPlaying = currentTrack.id === t.id && isPlaying;
            const isCurrent = currentTrack.id === t.id;

            if (isEditing) {
              return (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-pink-300 dark:border-pink-800 bg-pink-50/40 dark:bg-stone-900 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Tên bài hát"
                      className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs"
                    />
                    <input
                      type="text"
                      value={editArtist}
                      onChange={(e) => setEditArtist(e.target.value)}
                      placeholder="Nghệ sĩ"
                      className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs"
                    />
                  </div>
                  <input
                    type="url"
                    value={editAudioUrl}
                    onChange={(e) => setEditAudioUrl(e.target.value)}
                    placeholder="Link bài hát (Dropbox / Google Drive / Direct .mp3 / Để trống nếu dùng giai điệu thư giãn)"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs font-mono"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editMood}
                      onChange={(e) => setEditMood(e.target.value)}
                      placeholder="Cảm xúc / Thể loại"
                      className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs"
                    />
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      placeholder="Thời lượng (VD: 03:45)"
                      className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs font-mono"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTrackId(null)}
                      className="px-3 py-1 rounded-lg border border-stone-300 text-stone-600 text-xs cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(t.id)}
                      className="px-3.5 py-1 rounded-lg bg-pink-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>Lưu thay đổi</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={t.id}
                className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent
                    ? 'border-pink-300 dark:border-pink-800 bg-pink-50/50 dark:bg-pink-950/20'
                    : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-stone-50/50 dark:bg-stone-900/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCurrent) {
                        handleTogglePlay();
                      } else {
                        handlePlayTrack(idx);
                      }
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      isCurrentPlaying
                        ? 'bg-pink-500 text-white shadow-xs'
                        : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-pink-50 hover:text-pink-600'
                    }`}
                    title={isCurrentPlaying ? 'Tạm dừng' : 'Phát bài này'}
                  >
                    {isCurrentPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                        {t.title}
                      </p>
                      {getSourceBadge(t)}
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {t.artist} • {t.mood || 'Thư giãn'} {t.fileSize ? `(${t.fileSize})` : ''}
                    </p>
                    {((t.isLocalOnly && !t.totalChunks && !t.audioUrl?.startsWith('firestore://')) || (t.audioUrl && t.audioUrl.startsWith('blob:') && !t.totalChunks)) && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-amber-700 dark:text-amber-300">
                        <span>⚠️ Chỉ lưu trên máy này.</span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(t)}
                          className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
                        >
                          Bấm Sửa để dán link Dropbox (để độc giả ở máy khác cùng nghe 100%)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-stone-700/60">
                  <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                    {t.duration || '03:30'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(t)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-pink-600 hover:bg-white dark:hover:bg-stone-800 cursor-pointer transition-colors"
                      title="Chỉnh sửa thông tin bài hát"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(t.id, t.title)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-white dark:hover:bg-stone-800 cursor-pointer transition-colors"
                      title="Xóa bài hát khỏi playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function CloudIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  );
}
