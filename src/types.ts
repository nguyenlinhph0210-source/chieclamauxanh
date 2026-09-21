export interface Story {
  id: string;
  title: string;
  originalTitle?: string;
  author: string;
  translator: string;
  status: 'completed' | 'ongoing';
  genre: string[];
  summary: string;
  totalChapters: number;
  completedChapters: number;
  mainChaptersCount?: number;
  extraChaptersCount?: number;
  coverImage: string;
  colorTheme: string;
  hasPassword: boolean;
  passwordHint?: string;
  passwordKey?: string;
  updatedAt: string;
  publishedAt?: string;
  views: number;
  likes: number;
  featured?: boolean;
}

export interface Chapter {
  id: string;
  storyId: string;
  chapterNumber: number;
  title: string;
  publishedAt: string;
  updatedAt?: string;
  isLocked: boolean;
  passwordHint?: string;
  passwordKey?: string;
  content: string;
  translatorNote?: string;
  wordCount: number;
  isExtra?: boolean; // true nếu là phiên ngoại / ngoại truyện
  partType?: 'main' | 'extra'; // 'main': chính truyện, 'extra': phiên ngoại
  extraNumber?: number; // Thứ tự phiên ngoại (1, 2, 3...)
}

export interface Announcement {
  id: string;
  title: string;
  tag: 'Thông báo' | 'Lịch đăng' | 'Nhắc nhở' | 'Lưu ý';
  content: string;
  date: string;
  createdAt?: string;
  isPinned?: boolean;
}

export interface RecentUpdate {
  id: string;
  storyId: string;
  storyTitle: string;
  chapterNumber: number;
  chapterTitle: string;
  timeAgo: string;
  isLocked: boolean;
  status: 'completed' | 'ongoing';
}

export type ActiveTab = 'home' | 'completed' | 'ongoing' | 'password' | 'other' | 'about';

export interface CommentReply {
  id: string;
  user: string;
  avatar: string;
  text: string;
  createdAt: string;
  isAuthor?: boolean;
  isCollaborator?: boolean;
  roleBadge?: string;
  userEmail?: string | null;
  likes?: number;
  likedBy?: string[];
  replyToUser?: string;
  replyToId?: string;
}

export interface RealtimeComment {
  id: string;
  storyId: string;
  chapterId?: string | null;
  chapterNumber?: number | null;
  user: string;
  userEmail?: string | null;
  userId?: string | null;
  isAuthor?: boolean;
  isCollaborator?: boolean;
  roleBadge?: string;
  avatar: string;
  text: string;
  createdAt: string;
  rating?: number | null;
  replies?: CommentReply[];
  likes?: number;
  likedBy?: string[];
}

export interface ReaderLetter {
  id: string;
  sender: string;
  senderEmail?: string;
  senderUid?: string;
  userEmail?: string;
  userId?: string;
  avatar: string;
  content: string;
  type: 'public' | 'private';
  tag: string;
  time?: string;
  createdAt: string;
  likes: number;
  replyFromMel?: string;
  repliedAt?: string;
  repliedBy?: string;
  secretLookupCode?: string;
}

export interface StoryRealtimeStats {
  views: number;
  likes: number;
  followers: number;
  ratingSum: number;
  ratingCount: number;
  commentCount: number;
}

export interface GlobalRealtimeStats {
  totalVisits: number;
  activeReaders: number;
  totalFollowers: number;
  totalComments: number;
  totalLikes: number;
}

export interface CollaboratorItem {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'moderator' | 'collaborator' | 'author' | 'editor';
  roleTitle?: string;
  addedBy: string;
  addedAt: string;
  note?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  username?: string;
  displayName: string;
  photoURL?: string | null;
  bio?: string;
  websiteOrSocial?: string;
  favoriteGenre?: string;
  role?: 'admin' | 'moderator' | 'collaborator' | 'author' | 'editor' | 'reader';
  roleTitle?: string;
  roleBadge?: string;
  updatedAt?: string;
}

