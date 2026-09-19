/**
 * Data Backup & Restore Service for Mellifluous
 * Allows 1-click full export and import of all stories, chapters, announcements, letters, and settings.
 * Ensures zero data loss and easy migration between environments.
 */

import { Story, Chapter, Announcement, ReaderLetter } from '../types';
import { getLiveChaptersRuntimeCache, getStoryChapters, setLiveStoryChapters } from '../data/mockData';
import { getStoredStories, getStoredAnnouncements, saveStoredAnnouncements } from './realtimeService';
import { getCustomGenres, updateGenresFromRemote } from '../utils/genreManager';
import { bgmEngine } from '../utils/audioPlayer';

export interface MellifluousFullBackup {
  version: string;
  exportedAt: string;
  appName: string;
  data: {
    stories: Story[];
    chapters: Record<string, Chapter[]>;
    announcements: Announcement[];
    genres: string[];
    playlist: any[];
    letters: ReaderLetter[];
    deletedStoryIds?: string[];
    deletedAnnouncementIds?: string[];
  };
}

/**
 * Gathers complete site data from local memory, storage, and remote cache into a single backup object
 */
export const generateFullBackup = (): MellifluousFullBackup => {
  const stories = getStoredStories();
  const rawChapters = getLiveChaptersRuntimeCache();
  const fullChapters: Record<string, Chapter[]> = {};

  // Ensure every story has its chapters included
  stories.forEach((s) => {
    const list = rawChapters[s.id] || getStoryChapters(s.id) || [];
    fullChapters[s.id] = list;
  });

  const announcements = getStoredAnnouncements();

  let letters: ReaderLetter[] = [];
  try {
    const raw = localStorage.getItem('mel_reader_letters');
    if (raw) letters = JSON.parse(raw);
  } catch {}

  let deletedStoryIds: string[] = [];
  try {
    const raw = localStorage.getItem('mel_deleted_story_ids');
    if (raw) deletedStoryIds = JSON.parse(raw);
  } catch {}

  let deletedAnnouncementIds: string[] = [];
  try {
    const raw = localStorage.getItem('mel_deleted_announcement_ids');
    if (raw) deletedAnnouncementIds = JSON.parse(raw);
  } catch {}

  const genres = getCustomGenres();
  const playlist = bgmEngine.getTracks();

  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    appName: 'better and better - Mellifluous',
    data: {
      stories,
      chapters: fullChapters,
      announcements,
      genres,
      playlist,
      letters,
      deletedStoryIds,
      deletedAnnouncementIds,
    },
  };
};

/**
 * Triggers browser download of backup JSON file
 */
export const downloadBackupFile = () => {
  const backup = generateFullBackup();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `mellifluous_backup_${dateStr}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Restores all data from an imported backup object
 */
export const restoreFromBackup = (
  backup: MellifluousFullBackup,
  options: { overwrite?: boolean } = {}
): {
  storiesCount: number;
  chaptersCount: number;
  announcementsCount: number;
} => {
  if (!backup || !backup.data) {
    throw new Error('Định dạng tệp sao lưu không hợp lệ!');
  }

  const { stories, chapters, announcements, genres, playlist, letters, deletedStoryIds, deletedAnnouncementIds } = backup.data;

  let storiesCount = 0;
  let chaptersCount = 0;
  let announcementsCount = 0;

  // 1. Stories
  if (Array.isArray(stories) && stories.length > 0) {
    localStorage.setItem('mel_published_stories', JSON.stringify(stories));
    storiesCount = stories.length;
  }

  // 2. Chapters
  if (chapters && typeof chapters === 'object') {
    for (const [storyId, chList] of Object.entries(chapters)) {
      if (Array.isArray(chList) && chList.length > 0) {
        localStorage.setItem(`mel_chapters_${storyId}`, JSON.stringify(chList));
        setLiveStoryChapters(storyId, chList);
        chaptersCount += chList.length;
      }
    }
  }

  // 3. Announcements
  if (Array.isArray(announcements)) {
    saveStoredAnnouncements(announcements);
    announcementsCount = announcements.length;
  }

  // 4. Genres
  if (Array.isArray(genres) && genres.length > 0) {
    updateGenresFromRemote(genres);
  }

  // 5. Playlist
  if (Array.isArray(playlist) && playlist.length > 0) {
    bgmEngine.mergeTracks(playlist);
  }

  // 6. Letters
  if (Array.isArray(letters)) {
    localStorage.setItem('mel_reader_letters', JSON.stringify(letters));
  }

  // 7. Deleted IDs
  if (Array.isArray(deletedStoryIds)) {
    localStorage.setItem('mel_deleted_story_ids', JSON.stringify(deletedStoryIds));
  }

  if (Array.isArray(deletedAnnouncementIds)) {
    localStorage.setItem('mel_deleted_announcement_ids', JSON.stringify(deletedAnnouncementIds));
  }

  return {
    storiesCount,
    chaptersCount,
    announcementsCount,
  };
};
