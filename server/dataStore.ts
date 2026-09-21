import fs from 'fs';
import path from 'path';
import { Story, Chapter, Announcement, ReaderLetter, RealtimeComment, CommentReply } from '../src/types';
import { STORIES, SAMPLE_CHAPTERS, ANNOUNCEMENTS } from '../src/data/mockData';

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  duration?: string;
  mood?: string;
  audioUrl?: string;
  sourceType?: 'uploaded' | 'direct' | 'gdrive' | 'synth';
  fileSize?: string;
  mimeType?: string;
  totalChunks?: number;
  addedBy?: string;
  createdAt?: string;
  isLocalOnly?: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORIES_FILE = path.join(DATA_DIR, 'stories.json');
const CHAPTERS_FILE = path.join(DATA_DIR, 'chapters.json');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json');
const PLAYLIST_FILE = path.join(DATA_DIR, 'playlist.json');
const LETTERS_FILE = path.join(DATA_DIR, 'letters.json');
const DELETED_LETTERS_FILE = path.join(DATA_DIR, 'deleted_letters.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const GENRES_FILE = path.join(DATA_DIR, 'genres.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// Default initial datasets
const DEFAULT_TRACKS: AudioTrack[] = [
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

const DEFAULT_GENRES: string[] = [
  'Tất cả các thể loại mùa hè',
  'Ngôn tình',
  'Thanh xuân',
  'Ngọt sủng',
  'Học đường',
  'Hiện đại',
  'Ấm áp',
  'Song hướng thầm mến',
  'Vườn trường đại học',
  'Hài hước',
  'Nhẹ nhàng',
  'Gương vỡ lại lành',
  '1v1',
  'HE',
  'Chữa lành',
  'Cưới trước yêu sau',
  'Đô thị tình duyên',
  'Trọng sinh',
];

const DEFAULT_LETTERS: ReaderLetter[] = [
  {
    id: 'sample-letter-1',
    sender: 'Hạ Mộc',
    avatar: '🌸',
    content: 'Đọc truyện của Mel từ những ngày đầu bên nhà cũ. Mỗi câu chữ đều dịu dàng như một tách trà mật ong ngày mưa. Chúc Mel luôn an yên và giữ được ngọn lửa đam mê nhé!',
    type: 'public',
    tag: '🌸 Lời chúc & Cảm ơn',
    time: '2 ngày trước',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    likes: 18,
    replyFromMel: 'Cảm ơn Hạ Mộc thật nhiều nha! Những lời động viên của bạn là động lực lớn nhất để Mel tiếp tục dịch thêm nhiều bộ truyện ấm áp.',
    repliedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    repliedBy: 'Mellifluous (Tác giả)',
  },
  {
    id: 'sample-letter-2',
    sender: 'Gió Tháng Bảy',
    avatar: '🍃',
    content: 'Mình cực kỳ thích cách Mel dịch đoạn đối thoại của Thẩm Hoài An và Nhĩ Nguyệt trong bức thư gửi mây trời. Rất mượt mà và xúc động!',
    type: 'public',
    tag: '📖 Đề xuất truyện mới',
    time: '4 ngày trước',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    likes: 12,
    replyFromMel: 'Mel cũng rất thích đoạn ấy, lúc dịch mà cay cay sống mũi luôn á 🌸',
    repliedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    repliedBy: 'Mellifluous (Tác giả)',
  },
  {
    id: 'sample-letter-3',
    sender: 'Trần Thảo Ly',
    avatar: '☕',
    content: 'Thuyền nhỏ ơi, sau những giờ làm căng thẳng được ngả lưng nghe playlist mùa hạ và đọc truyện ở đây thật sự là một niềm hạnh phúc dịu êm.',
    type: 'public',
    tag: '☕ Tâm sự mùa hè',
    time: '5 ngày trước',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    likes: 24,
  },
];

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// In-memory caches for high performance
let cachedStories: Story[] = [];
let cachedChapters: Record<string, Chapter[]> = {};
let cachedAnnouncements: Announcement[] = [];
let cachedTracks: AudioTrack[] = [];
let cachedLetters: ReaderLetter[] = [];
let cachedDeletedLetters: Set<string> = new Set();
let lastDeletedLettersMtime = 0;
let cachedComments: RealtimeComment[] = [];
let cachedGenres: string[] = [];

// Helper to read JSON safely
const readJsonSafe = <T>(filePath: string, fallback: T): T => {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Failed to read file ${filePath}:`, err);
    return fallback;
  }
};

// Helper to write JSON safely and mirror to public/data
const writeJsonSafe = (filePath: string, data: any) => {
  try {
    const tempFile = `${filePath}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);

    // Also mirror to public/data so static file server / build always serves fresh data
    const baseName = path.basename(filePath);
    const publicPath = path.join(process.cwd(), 'public', 'data', baseName);
    try {
      const publicDir = path.dirname(publicPath);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(publicPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {}
  } catch (err) {
    console.error(`Failed to write file ${filePath}:`, err);
  }
};

let lastStoriesMtime = 0;
let lastChaptersMtime = 0;
let lastAnnouncementsMtime = 0;
let lastLettersMtime = 0;
let lastCommentsMtime = 0;

export const parseSafeTimestamp = (dateStr?: string): number => {
  if (!dateStr) return 0;
  if (dateStr === 'Vừa đăng' || dateStr === 'Vừa cập nhật' || dateStr.includes('Vừa') || dateStr === 'Vừa xong') {
    return Date.now();
  }
  const parsed = new Date(dateStr).getTime();
  if (!isNaN(parsed) && parsed > 0) return parsed;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/');
    const dTime = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    if (!isNaN(dTime)) return dTime;
  }
  return 0;
};

export const sortStoriesByLatest = (list: Story[]): Story[] => {
  return [...list].sort((a, b) => {
    const timeA = parseSafeTimestamp(a.updatedAt);
    const timeB = parseSafeTimestamp(b.updatedAt);
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });
};

export const sortAnnouncements = (list: Announcement[]): Announcement[] => {
  return [...list].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const timeA = parseSafeTimestamp((a as any).createdAt || a.date);
    const timeB = parseSafeTimestamp((b as any).createdAt || b.date);
    if (timeA !== timeB) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '');
  });
};

const reloadStoriesIfChanged = () => {
  try {
    if (fs.existsSync(STORIES_FILE)) {
      const stat = fs.statSync(STORIES_FILE);
      if (stat.mtimeMs !== lastStoriesMtime) {
        const content = fs.readFileSync(STORIES_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          cachedStories = sortStoriesByLatest(parsed);
          lastStoriesMtime = stat.mtimeMs;
        }
      }
    }
  } catch {}
};

const reloadChaptersIfChanged = () => {
  try {
    if (fs.existsSync(CHAPTERS_FILE)) {
      const stat = fs.statSync(CHAPTERS_FILE);
      if (stat.mtimeMs !== lastChaptersMtime) {
        const content = fs.readFileSync(CHAPTERS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          cachedChapters = parsed;
          lastChaptersMtime = stat.mtimeMs;
        }
      }
    }
  } catch {}
};

const reloadAnnouncementsIfChanged = () => {
  try {
    if (fs.existsSync(ANNOUNCEMENTS_FILE)) {
      const stat = fs.statSync(ANNOUNCEMENTS_FILE);
      if (stat.mtimeMs !== lastAnnouncementsMtime) {
        const content = fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          cachedAnnouncements = sortAnnouncements(parsed);
          lastAnnouncementsMtime = stat.mtimeMs;
        }
      }
    }
  } catch {}
};

const reloadLettersIfChanged = () => {
  try {
    if (fs.existsSync(DELETED_LETTERS_FILE)) {
      const delStat = fs.statSync(DELETED_LETTERS_FILE);
      if (delStat.mtimeMs !== lastDeletedLettersMtime) {
        const delContent = fs.readFileSync(DELETED_LETTERS_FILE, 'utf-8');
        const parsedDel = JSON.parse(delContent);
        if (Array.isArray(parsedDel)) {
          cachedDeletedLetters = new Set(parsedDel);
        }
        lastDeletedLettersMtime = delStat.mtimeMs;
      }
    }
    if (fs.existsSync(LETTERS_FILE)) {
      const stat = fs.statSync(LETTERS_FILE);
      if (stat.mtimeMs !== lastLettersMtime) {
        const content = fs.readFileSync(LETTERS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          cachedLetters = parsed
            .filter((l) => l && l.id && !cachedDeletedLetters.has(l.id))
            .sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
          lastLettersMtime = stat.mtimeMs;
        }
      }
    }
  } catch {}
};

const reloadCommentsIfChanged = () => {
  try {
    if (fs.existsSync(COMMENTS_FILE)) {
      const stat = fs.statSync(COMMENTS_FILE);
      if (stat.mtimeMs !== lastCommentsMtime) {
        const content = fs.readFileSync(COMMENTS_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          cachedComments = parsed.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          lastCommentsMtime = stat.mtimeMs;
        }
      }
    }
  } catch {}
};

// Initialize or load all entities
export const initDataStore = () => {
  // Mirror all authoritative files in /data/ to /public/data/ for static serving & builds
  const syncPublic = (src: string, name: string) => {
    try {
      if (fs.existsSync(src)) {
        const destDir = path.join(process.cwd(), 'public', 'data');
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, path.join(destDir, name));
      }
    } catch {}
  };
  syncPublic(STORIES_FILE, 'stories.json');
  syncPublic(CHAPTERS_FILE, 'chapters.json');
  syncPublic(ANNOUNCEMENTS_FILE, 'announcements.json');
  syncPublic(PLAYLIST_FILE, 'playlist.json');
  syncPublic(LETTERS_FILE, 'letters.json');
  syncPublic(COMMENTS_FILE, 'comments.json');
  syncPublic(GENRES_FILE, 'genres.json');
  syncPublic(STATS_FILE, 'stats.json');

  // 1. Stories
  if (fs.existsSync(STORIES_FILE)) {
    try {
      const content = fs.readFileSync(STORIES_FILE, 'utf-8');
      cachedStories = JSON.parse(content);
    } catch {
      cachedStories = [...STORIES];
      writeJsonSafe(STORIES_FILE, cachedStories);
    }
  } else {
    cachedStories = [...STORIES];
    writeJsonSafe(STORIES_FILE, cachedStories);
  }

  // 2. Chapters (grouped by storyId)
  if (fs.existsSync(CHAPTERS_FILE)) {
    try {
      const content = fs.readFileSync(CHAPTERS_FILE, 'utf-8');
      cachedChapters = JSON.parse(content);
    } catch {
      cachedChapters = { ...SAMPLE_CHAPTERS };
      writeJsonSafe(CHAPTERS_FILE, cachedChapters);
    }
  } else {
    cachedChapters = { ...SAMPLE_CHAPTERS };
    writeJsonSafe(CHAPTERS_FILE, cachedChapters);
  }

  // 3. Announcements
  if (fs.existsSync(ANNOUNCEMENTS_FILE)) {
    try {
      const content = fs.readFileSync(ANNOUNCEMENTS_FILE, 'utf-8');
      cachedAnnouncements = JSON.parse(content);
    } catch {
      cachedAnnouncements = [...ANNOUNCEMENTS];
      writeJsonSafe(ANNOUNCEMENTS_FILE, cachedAnnouncements);
    }
  } else {
    cachedAnnouncements = [...ANNOUNCEMENTS];
    writeJsonSafe(ANNOUNCEMENTS_FILE, cachedAnnouncements);
  }

  // 4. Playlist / Tracks
  if (fs.existsSync(PLAYLIST_FILE)) {
    try {
      const content = fs.readFileSync(PLAYLIST_FILE, 'utf-8');
      cachedTracks = JSON.parse(content);
      if (!Array.isArray(cachedTracks) || cachedTracks.length === 0) {
        cachedTracks = [...DEFAULT_TRACKS];
        writeJsonSafe(PLAYLIST_FILE, cachedTracks);
      }
    } catch {
      cachedTracks = [...DEFAULT_TRACKS];
      writeJsonSafe(PLAYLIST_FILE, cachedTracks);
    }
  } else {
    cachedTracks = [...DEFAULT_TRACKS];
    writeJsonSafe(PLAYLIST_FILE, cachedTracks);
  }

  // 5. Reader Letters
  if (fs.existsSync(DELETED_LETTERS_FILE)) {
    try {
      const delContent = fs.readFileSync(DELETED_LETTERS_FILE, 'utf-8');
      const parsedDel = JSON.parse(delContent);
      if (Array.isArray(parsedDel)) {
        cachedDeletedLetters = new Set(parsedDel);
      }
    } catch {}
  }

  if (fs.existsSync(LETTERS_FILE)) {
    try {
      const content = fs.readFileSync(LETTERS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        cachedLetters = parsed.filter((l) => l && l.id && !cachedDeletedLetters.has(l.id));
      } else {
        cachedLetters = [];
      }
      writeJsonSafe(LETTERS_FILE, cachedLetters);
    } catch {
      cachedLetters = [];
      writeJsonSafe(LETTERS_FILE, cachedLetters);
    }
  } else {
    // Brand new instance only: seed defaults if not explicitly deleted
    if (cachedDeletedLetters.size === 0) {
      cachedLetters = [...DEFAULT_LETTERS];
    } else {
      cachedLetters = [];
    }
    writeJsonSafe(LETTERS_FILE, cachedLetters);
  }

  // 6. Comments
  if (fs.existsSync(COMMENTS_FILE)) {
    try {
      const content = fs.readFileSync(COMMENTS_FILE, 'utf-8');
      cachedComments = JSON.parse(content);
      if (!Array.isArray(cachedComments)) cachedComments = [];
    } catch {
      cachedComments = [];
      writeJsonSafe(COMMENTS_FILE, cachedComments);
    }
  } else {
    cachedComments = [];
    writeJsonSafe(COMMENTS_FILE, cachedComments);
  }

  // 7. Genres
  if (fs.existsSync(GENRES_FILE)) {
    try {
      const content = fs.readFileSync(GENRES_FILE, 'utf-8');
      cachedGenres = JSON.parse(content);
      if (!Array.isArray(cachedGenres) || cachedGenres.length === 0) {
        cachedGenres = [...DEFAULT_GENRES];
        writeJsonSafe(GENRES_FILE, cachedGenres);
      }
    } catch {
      cachedGenres = [...DEFAULT_GENRES];
      writeJsonSafe(GENRES_FILE, cachedGenres);
    }
  } else {
    cachedGenres = [...DEFAULT_GENRES];
    writeJsonSafe(GENRES_FILE, cachedGenres);
  }

  console.log(`[DataStore] Initialized: ${cachedStories.length} stories, ${Object.keys(cachedChapters).length} chapter sets, ${cachedAnnouncements.length} announcements, ${cachedTracks.length} tracks, ${cachedLetters.length} letters, ${cachedComments.length} comments, ${cachedGenres.length} genres.`);
};

// Vietnamese Slug Helper for Robust URL Lookup
export const toSlug = (str: string = ''): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Stories Operations
export const getAllStories = (): Story[] => {
  reloadStoriesIfChanged();
  return sortStoriesByLatest(cachedStories);
};

export const getStoryById = (id: string): Story | undefined => {
  if (!id) return undefined;
  reloadStoriesIfChanged();
  const decodedId = decodeURIComponent(id).trim();
  const slugId = toSlug(decodedId);

  // 1. Exact ID match
  const exact = cachedStories.find((s) => s.id === decodedId || s.id === id);
  if (exact) return exact;

  // 2. Alias match for special stories
  if (decodedId === 'anh-dao-5cm' || slugId === 'anh-dao-5cm') {
    const alias = cachedStories.find((s) => s.id === 'anh-dao-nam-centimet' || s.id === 'anh-dao-5cm');
    if (alias) return alias;
  }
  if (decodedId === 'anh-dao-nam-centimet' || slugId === 'anh-dao-nam-centimet') {
    const alias = cachedStories.find((s) => s.id === 'anh-dao-5cm' || s.id === 'anh-dao-nam-centimet');
    if (alias) return alias;
  }

  // 3. Match by slugified ID, title, or original title
  return cachedStories.find((s) => {
    return (
      toSlug(s.id) === slugId ||
      toSlug(s.title) === slugId ||
      toSlug(s.originalTitle) === slugId
    );
  });
};

export const saveStory = (story: Story): Story => {
  const nowIso = new Date().toISOString();
  const storyWithTime: Story = {
    ...story,
    publishedAt: story.publishedAt || nowIso,
    updatedAt: (story.updatedAt && story.updatedAt !== 'Vừa đăng' && story.updatedAt !== 'Vừa cập nhật') ? story.updatedAt : nowIso,
  };
  const filtered = cachedStories.filter((s) => s.id !== story.id);
  cachedStories = sortStoriesByLatest([storyWithTime, ...filtered]);
  writeJsonSafe(STORIES_FILE, cachedStories);
  return storyWithTime;
};

export const deleteStory = (storyId: string): boolean => {
  cachedStories = cachedStories.filter((s) => s.id !== storyId);
  delete cachedChapters[storyId];
  writeJsonSafe(STORIES_FILE, cachedStories);
  writeJsonSafe(CHAPTERS_FILE, cachedChapters);
  return true;
};

// Chapters Operations
export const getChaptersByStory = (storyId: string): Chapter[] => {
  if (!storyId) return [];
  reloadChaptersIfChanged();
  const decodedId = decodeURIComponent(storyId).trim();
  const directList = cachedChapters[decodedId] || cachedChapters[storyId];
  if (directList && directList.length > 0) return directList;

  // Alias lookup
  if (decodedId === 'anh-dao-5cm') return cachedChapters['anh-dao-nam-centimet'] || [];
  if (decodedId === 'anh-dao-nam-centimet') return cachedChapters['anh-dao-5cm'] || [];

  // If queried by slug, find the resolved story first
  const resolved = getStoryById(decodedId);
  if (resolved && resolved.id !== decodedId) {
    return cachedChapters[resolved.id] || [];
  }

  return [];
};

export const getAllChaptersMap = (): Record<string, Chapter[]> => {
  reloadChaptersIfChanged();
  return { ...cachedChapters };
};

export const saveChapter = (chapter: Chapter): Chapter => {
  const storyId = chapter.storyId;
  const list = cachedChapters[storyId] ? [...cachedChapters[storyId]] : [];
  
  const nowIso = new Date().toISOString();
  const cleanChapter: Chapter = {
    ...chapter,
    publishedAt: chapter.publishedAt || nowIso,
    updatedAt: chapter.updatedAt || nowIso,
  };

  const targetPart = cleanChapter.partType || (cleanChapter.isExtra ? 'extra' : 'main');
  const existingIdx = list.findIndex((c) => {
    const cPart = c.partType || (c.isExtra ? 'extra' : 'main');
    return c.id === cleanChapter.id || (c.chapterNumber === cleanChapter.chapterNumber && cPart === targetPart);
  });
  if (existingIdx >= 0) {
    list[existingIdx] = { ...list[existingIdx], ...cleanChapter };
  } else {
    list.push(cleanChapter);
  }

  list.sort((a, b) => a.chapterNumber - b.chapterNumber);
  cachedChapters[storyId] = list;
  writeJsonSafe(CHAPTERS_FILE, cachedChapters);

  // Automatically update story's completed chapters count and update timestamp
  const storyIdx = cachedStories.findIndex((s) => s.id === storyId);
  if (storyIdx >= 0) {
    cachedStories[storyIdx].completedChapters = list.length;
    cachedStories[storyIdx].updatedAt = nowIso;
    cachedStories = sortStoriesByLatest(cachedStories);
    writeJsonSafe(STORIES_FILE, cachedStories);
  }

  return cleanChapter;
};

export const deleteChapter = (storyId: string, chapterId: string): boolean => {
  if (cachedChapters[storyId]) {
    cachedChapters[storyId] = cachedChapters[storyId].filter((c) => c.id !== chapterId);
    writeJsonSafe(CHAPTERS_FILE, cachedChapters);

    // Update story completed chapters count
    const storyIdx = cachedStories.findIndex((s) => s.id === storyId);
    if (storyIdx >= 0) {
      cachedStories[storyIdx].completedChapters = cachedChapters[storyId].length;
      cachedStories[storyIdx].updatedAt = new Date().toISOString();
      cachedStories = sortStoriesByLatest(cachedStories);
      writeJsonSafe(STORIES_FILE, cachedStories);
    }
    return true;
  }
  return false;
};

// Announcements Operations
export const getAllAnnouncements = (): Announcement[] => {
  reloadAnnouncementsIfChanged();
  return sortAnnouncements(cachedAnnouncements);
};

export const saveAnnouncement = (ann: Announcement): Announcement => {
  const annWithTime: Announcement = {
    ...ann,
    date: ann.date || new Date().toLocaleDateString('vi-VN'),
    createdAt: (ann as any).createdAt || new Date().toISOString(),
  };
  const filtered = cachedAnnouncements.filter((a) => a.id !== ann.id);
  cachedAnnouncements = sortAnnouncements([annWithTime, ...filtered]);
  writeJsonSafe(ANNOUNCEMENTS_FILE, cachedAnnouncements);
  return annWithTime;
};

export const deleteAnnouncement = (announcementId: string): boolean => {
  cachedAnnouncements = cachedAnnouncements.filter((a) => a.id !== announcementId);
  writeJsonSafe(ANNOUNCEMENTS_FILE, cachedAnnouncements);
  return true;
};

// Playlist (Tracks) Operations
export const getAllTracks = (): AudioTrack[] => {
  return [...cachedTracks];
};

export const saveTrack = (track: AudioTrack): AudioTrack => {
  const index = cachedTracks.findIndex((t) => t.id === track.id);
  if (index >= 0) {
    cachedTracks[index] = { ...cachedTracks[index], ...track };
  } else {
    cachedTracks.push(track);
  }
  writeJsonSafe(PLAYLIST_FILE, cachedTracks);
  return track;
};

export const savePlaylist = (tracks: AudioTrack[]): AudioTrack[] => {
  cachedTracks = [...tracks];
  writeJsonSafe(PLAYLIST_FILE, cachedTracks);
  return cachedTracks;
};

export const deleteTrack = (trackId: string): boolean => {
  cachedTracks = cachedTracks.filter((t) => t.id !== trackId);
  writeJsonSafe(PLAYLIST_FILE, cachedTracks);
  return true;
};

// Reader Letters Operations
export const getAllLetters = (): ReaderLetter[] => {
  reloadLettersIfChanged();
  return [...cachedLetters]
    .filter((l) => l && l.id && !cachedDeletedLetters.has(l.id))
    .sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
};

export const getDeletedLetterIds = (): string[] => {
  return Array.from(cachedDeletedLetters);
};

export const recordDeletedLetter = (letterId: string): void => {
  if (!letterId) return;
  cachedDeletedLetters.add(letterId);
  writeJsonSafe(DELETED_LETTERS_FILE, Array.from(cachedDeletedLetters));
  cachedLetters = cachedLetters.filter((l) => l.id !== letterId);
  writeJsonSafe(LETTERS_FILE, cachedLetters);
};

export const saveLetter = (letter: ReaderLetter): ReaderLetter => {
  const letterWithTime: ReaderLetter = {
    ...letter,
    createdAt: letter.createdAt || new Date().toISOString(),
  };
  if (cachedDeletedLetters.has(letter.id)) {
    cachedDeletedLetters.delete(letter.id);
    writeJsonSafe(DELETED_LETTERS_FILE, Array.from(cachedDeletedLetters));
  }
  const filtered = cachedLetters.filter((l) => l.id !== letter.id);
  cachedLetters = [letterWithTime, ...filtered].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  writeJsonSafe(LETTERS_FILE, cachedLetters);
  return letterWithTime;
};

export const replyLetter = (letterId: string, replyText: string, authorName: string = 'Mellifluous (Tác giả)'): ReaderLetter | undefined => {
  const index = cachedLetters.findIndex((l) => l.id === letterId);
  if (index >= 0) {
    cachedLetters[index] = {
      ...cachedLetters[index],
      replyFromMel: replyText.trim(),
      repliedAt: new Date().toISOString(),
      repliedBy: authorName,
    };
    writeJsonSafe(LETTERS_FILE, cachedLetters);
    return cachedLetters[index];
  }
  return undefined;
};

export const deleteLetter = (letterId: string): boolean => {
  if (!letterId) return false;
  cachedDeletedLetters.add(letterId);
  writeJsonSafe(DELETED_LETTERS_FILE, Array.from(cachedDeletedLetters));
  cachedLetters = cachedLetters.filter((l) => l.id !== letterId);
  writeJsonSafe(LETTERS_FILE, cachedLetters);
  return true;
};

export const likeLetter = (letterId: string): { likes: number } | undefined => {
  const index = cachedLetters.findIndex((l) => l.id === letterId);
  if (index >= 0) {
    cachedLetters[index].likes = (Number(cachedLetters[index].likes) || 0) + 1;
    writeJsonSafe(LETTERS_FILE, cachedLetters);
    return { likes: cachedLetters[index].likes };
  }
  return undefined;
};

// Comments Operations
export const getAllComments = (storyId?: string, chapterNumber?: number): RealtimeComment[] => {
  reloadCommentsIfChanged();
  let list = [...cachedComments];
  if (storyId) {
    list = list.filter((c) => c.storyId === storyId);
  }
  if (chapterNumber !== undefined && chapterNumber !== null) {
    list = list.filter((c) => c.chapterNumber === chapterNumber || !c.chapterNumber);
  }
  return list.sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
};

export const saveComment = (comment: RealtimeComment): RealtimeComment => {
  const commentWithTime: RealtimeComment = {
    ...comment,
    createdAt: comment.createdAt || new Date().toISOString(),
  };
  const filtered = cachedComments.filter((c) => c.id !== comment.id);
  cachedComments = [commentWithTime, ...filtered].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  writeJsonSafe(COMMENTS_FILE, cachedComments);
  return commentWithTime;
};

export const replyComment = (commentId: string, reply: CommentReply): RealtimeComment | undefined => {
  const index = cachedComments.findIndex((c) => c.id === commentId);
  if (index >= 0) {
    const existingReplies = Array.isArray(cachedComments[index].replies) ? cachedComments[index].replies! : [];
    const formattedReply: CommentReply = {
      id: reply.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user: reply.user || 'Bạn đọc yêu truyện',
      avatar: reply.avatar || '🌸',
      text: reply.text,
      isAuthor: !!reply.isAuthor,
      isCollaborator: !!reply.isCollaborator,
      likes: typeof reply.likes === 'number' ? reply.likes : 0,
      likedBy: Array.isArray(reply.likedBy) ? reply.likedBy : [],
      createdAt: reply.createdAt || new Date().toISOString(),
    };
    cachedComments[index] = {
      ...cachedComments[index],
      replies: [...existingReplies, formattedReply],
    };
    writeJsonSafe(COMMENTS_FILE, cachedComments);
    return cachedComments[index];
  }
  return undefined;
};

export const deleteComment = (commentId: string): boolean => {
  cachedComments = cachedComments.filter((c) => c.id !== commentId);
  writeJsonSafe(COMMENTS_FILE, cachedComments);
  return true;
};

export const toggleCommentLike = (commentId: string, visitorId: string): { likes: number; isLiked: boolean } | undefined => {
  const index = cachedComments.findIndex((c) => c.id === commentId);
  if (index >= 0) {
    const comment = cachedComments[index];
    const likedBy: string[] = Array.isArray(comment.likedBy) ? comment.likedBy : [];
    const hasLiked = likedBy.includes(visitorId);
    const newLikedBy = hasLiked ? likedBy.filter((id) => id !== visitorId) : [...likedBy, visitorId];
    const newLikes = Math.max(0, newLikedBy.length);
    cachedComments[index] = {
      ...comment,
      likes: newLikes,
      likedBy: newLikedBy,
    };
    writeJsonSafe(COMMENTS_FILE, cachedComments);
    return { likes: newLikes, isLiked: !hasLiked };
  }
  return undefined;
};

export const toggleReplyLike = (
  commentId: string,
  replyId: string,
  visitorId: string
): { likes: number; isLiked: boolean } | undefined => {
  const index = cachedComments.findIndex((c) => c.id === commentId);
  if (index >= 0) {
    const comment = cachedComments[index];
    const rawReplies = Array.isArray(comment.replies) ? comment.replies : [];
    let finalLikes = 0;
    let isLiked = false;
    const updatedReplies = rawReplies.map((r) => {
      if (r.id === replyId) {
        const likedBy = Array.isArray(r.likedBy) ? r.likedBy : [];
        const hasLiked = likedBy.includes(visitorId);
        const newLikedBy = hasLiked ? likedBy.filter((id) => id !== visitorId) : [...likedBy, visitorId];
        finalLikes = Math.max(0, newLikedBy.length);
        isLiked = !hasLiked;
        return { ...r, likes: finalLikes, likedBy: newLikedBy };
      }
      return r;
    });
    cachedComments[index] = {
      ...comment,
      replies: updatedReplies,
    };
    writeJsonSafe(COMMENTS_FILE, cachedComments);
    return { likes: finalLikes, isLiked };
  }
  return undefined;
};

// ==========================================
// Stats Operations (Global & Per Story)
// ==========================================
interface StoryStatsRecord {
  views: number;
  likes: number;
  followers: number;
  ratingSum: number;
  ratingCount: number;
}

interface PersistedStats {
  global: {
    totalVisits: number;
    totalFollowers: number;
    totalLikes: number;
  };
  stories: Record<string, StoryStatsRecord>;
}

let cachedStats: PersistedStats = {
  global: {
    totalVisits: 1,
    totalFollowers: 0,
    totalLikes: 0,
  },
  stories: {},
};

const loadStats = () => {
  const loaded = readJsonSafe<any>(STATS_FILE, null);
  let initialViewsSum = 0;
  let initialLikesSum = 0;
  try {
    cachedStories.forEach((s) => {
      initialViewsSum += Number(s.views) || 0;
      initialLikesSum += Number(s.likes) || 0;
    });
  } catch {}

  if (loaded && loaded.global) {
    cachedStats = {
      global: {
        totalVisits: Math.max(Number(loaded.global.totalVisits) || 1, initialViewsSum, 25),
        totalFollowers: Number(loaded.global.totalFollowers) || 0,
        totalLikes: Math.max(Number(loaded.global.totalLikes) || 0, initialLikesSum, 3),
      },
      stories: loaded.stories || {},
    };
  } else if (loaded && typeof loaded.totalVisits === 'number') {
    cachedStats = {
      global: {
        totalVisits: Math.max(Number(loaded.totalVisits) || 1, initialViewsSum, 25),
        totalFollowers: Number(loaded.totalFollowers) || 0,
        totalLikes: Math.max(Number(loaded.totalLikes) || 0, initialLikesSum, 3),
      },
      stories: loaded.stories || {},
    };
  } else {
    cachedStats = {
      global: {
        totalVisits: Math.max(initialViewsSum, 25),
        totalFollowers: 0,
        totalLikes: Math.max(initialLikesSum, 3),
      },
      stories: {},
    };
    writeJsonSafe(STATS_FILE, cachedStats);
  }
};

loadStats();

export const getGlobalStats = (liveActiveCount?: number) => {
  reloadCommentsIfChanged();
  return {
    totalVisits: cachedStats.global.totalVisits,
    totalFollowers: cachedStats.global.totalFollowers,
    totalLikes: cachedStats.global.totalLikes,
    totalComments: cachedComments.length,
    activeReaders: typeof liveActiveCount === 'number' ? Math.max(1, liveActiveCount) : 1,
  };
};

export const recordSiteVisit = (): number => {
  cachedStats.global.totalVisits = (cachedStats.global.totalVisits || 0) + 1;
  writeJsonSafe(STATS_FILE, cachedStats);
  return cachedStats.global.totalVisits;
};

export const getStoryStats = (storyId: string) => {
  reloadCommentsIfChanged();
  const story = cachedStories.find((s) => s.id === storyId);
  const existing = cachedStats.stories[storyId] || {
    views: story?.views || 0,
    likes: story?.likes || 0,
    followers: 0,
    ratingSum: 0,
    ratingCount: 0,
  };
  const commentCount = cachedComments.filter((c) => c.storyId === storyId).length;
  return {
    ...existing,
    commentCount,
  };
};

export const recordStoryView = (storyId: string) => {
  if (!cachedStats.stories[storyId]) {
    const story = cachedStories.find((s) => s.id === storyId);
    cachedStats.stories[storyId] = {
      views: story?.views || 0,
      likes: story?.likes || 0,
      followers: 0,
      ratingSum: 0,
      ratingCount: 0,
    };
  }
  cachedStats.stories[storyId].views += 1;
  const sIdx = cachedStories.findIndex((s) => s.id === storyId);
  if (sIdx >= 0) {
    cachedStories[sIdx].views = cachedStats.stories[storyId].views;
    writeJsonSafe(STORIES_FILE, cachedStories);
  }
  writeJsonSafe(STATS_FILE, cachedStats);
  return getStoryStats(storyId);
};

export const toggleStoryLike = (storyId: string, delta: number) => {
  if (!cachedStats.stories[storyId]) {
    const story = cachedStories.find((s) => s.id === storyId);
    cachedStats.stories[storyId] = {
      views: story?.views || 0,
      likes: story?.likes || 0,
      followers: 0,
      ratingSum: 0,
      ratingCount: 0,
    };
  }
  cachedStats.stories[storyId].likes = Math.max(0, (cachedStats.stories[storyId].likes || 0) + delta);
  cachedStats.global.totalLikes = Math.max(0, (cachedStats.global.totalLikes || 0) + delta);
  const sIdx = cachedStories.findIndex((s) => s.id === storyId);
  if (sIdx >= 0) {
    cachedStories[sIdx].likes = cachedStats.stories[storyId].likes;
    writeJsonSafe(STORIES_FILE, cachedStories);
  }
  writeJsonSafe(STATS_FILE, cachedStats);
  return getStoryStats(storyId);
};

export const toggleStoryFollow = (storyId: string, delta: number) => {
  if (!cachedStats.stories[storyId]) {
    cachedStats.stories[storyId] = { views: 0, likes: 0, followers: 0, ratingSum: 0, ratingCount: 0 };
  }
  cachedStats.stories[storyId].followers = Math.max(0, (cachedStats.stories[storyId].followers || 0) + delta);
  cachedStats.global.totalFollowers = Math.max(0, (cachedStats.global.totalFollowers || 0) + delta);
  writeJsonSafe(STATS_FILE, cachedStats);
  return getStoryStats(storyId);
};

export const submitStoryRating = (storyId: string, stars: number) => {
  if (!cachedStats.stories[storyId]) {
    cachedStats.stories[storyId] = { views: 0, likes: 0, followers: 0, ratingSum: 0, ratingCount: 0 };
  }
  cachedStats.stories[storyId].ratingSum = (cachedStats.stories[storyId].ratingSum || 0) + stars;
  cachedStats.stories[storyId].ratingCount = (cachedStats.stories[storyId].ratingCount || 0) + 1;
  writeJsonSafe(STATS_FILE, cachedStats);
  return getStoryStats(storyId);
};

// Genres Operations
export const getAllGenres = (): string[] => {
  return [...cachedGenres];
};

export const saveGenres = (genres: string[]): string[] => {
  cachedGenres = [...genres];
  writeJsonSafe(GENRES_FILE, cachedGenres);
  return cachedGenres;
};

export const addGenre = (genre: string): string[] => {
  const trimmed = genre.trim();
  if (trimmed && !cachedGenres.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
    cachedGenres.push(trimmed);
    writeJsonSafe(GENRES_FILE, cachedGenres);
  }
  return cachedGenres;
};

export const deleteGenre = (genre: string): string[] => {
  const target = genre.trim().toLowerCase();
  cachedGenres = cachedGenres.filter((g) => g.trim().toLowerCase() !== target);
  writeJsonSafe(GENRES_FILE, cachedGenres);
  return cachedGenres;
};

