import {
  subscribeToAllComments,
  subscribeToReaderLetters,
  isLetterDeleted,
  RealtimeComment,
  ReaderLetter,
  getStoredStories,
  getStoredAnnouncements,
} from './realtimeService';
import {
  getStoryChapters,
  getLiveChaptersRuntimeCache,
  isStoryDeleted,
} from '../data/mockData';
import { Story, Chapter, Announcement } from '../types';
import { getSavedPersonalCodes } from './letterVaultService';

export type NotificationType = 'comment' | 'letter' | 'chapter' | 'story' | 'reply' | 'announcement' | 'letter_reply';

export interface AuthorNotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  contentSnippet: string;
  timeAgo: string;
  createdAt: string;
  avatar: string;
  isRead: boolean;
  storyId?: string;
  storyTitle?: string;
  chapterNumber?: number;
  user?: string;
  secretLookupCode?: string;
  rawComment?: RealtimeComment;
  rawLetter?: ReaderLetter;
}

export interface NotificationUserContext {
  user: {
    uid?: string;
    email?: string | null;
    displayName?: string | null;
    nickname?: string | null;
  } | null;
  isAuthor: boolean;
  isCollaborator: boolean;
}

const READ_IDS_STORAGE_PREFIX = 'mel_read_notifs_';

const getStorageKey = (uid?: string): string => {
  return `${READ_IDS_STORAGE_PREFIX}${uid || 'default'}`;
};

const getReadIds = (uid?: string): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

const saveReadIds = (ids: Set<string>, uid?: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(uid), JSON.stringify(Array.from(ids).slice(0, 500)));
  } catch {}
};

const formatNotificationTime = (timeStr?: string): string => {
  if (!timeStr) return 'Vừa xong';
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) return timeStr;
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0 || diffMs < 60 * 1000) return 'Vừa xong';
  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

type NotificationSubscriber = (items: AuthorNotificationItem[], unreadCount: number) => void;

interface ActiveSubscriber {
  context: NotificationUserContext;
  callback: NotificationSubscriber;
}

const activeSubscribers = new Set<ActiveSubscriber>();

let currentComments: RealtimeComment[] = [];
let currentLetters: ReaderLetter[] = [];
let isListeningComments = false;
let isListeningLetters = false;
let unsubComments: (() => void) | null = null;
let unsubLetters: (() => void) | null = null;

const cleanNotificationSnippet = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildNotificationsList = (context: NotificationUserContext): { items: AuthorNotificationItem[]; unreadCount: number } => {
  // REQUIREMENT 1: Guest / unauthenticated users CANNOT see notifications
  if (!context || !context.user) {
    return { items: [], unreadCount: 0 };
  }

  const userId = context.user.uid || context.user.email || 'user';
  const readIds = getReadIds(userId);
  const stories = getStoredStories();
  const storyMap = new Map(stories.map((s) => [s.id, s.title]));

  const items: AuthorNotificationItem[] = [];

  const isInternalRole = context.isAuthor || context.isCollaborator;

  // =========================================================================
  // CASE A: AUTHOR & COLLABORATOR (Full Internal Privileges)
  // Can see all reader comments, reader letters (tâm thư, thư kín & công khai),
  // new chapters, new stories, and announcements.
  // =========================================================================
  if (isInternalRole) {
    // 1. Reader Comments on all stories
    currentComments.forEach((c) => {
      if (c.isAuthor) return; // Exclude own comments
      if (isStoryDeleted(c.storyId)) return;
      if (!storyMap.has(c.storyId)) return;

      const storyTitle = storyMap.get(c.storyId) || c.storyId;
      const chLabel = c.chapterNumber ? `Chương ${c.chapterNumber}` : 'Truyện';
      const isRead = readIds.has(c.id);

      items.push({
        id: c.id,
        type: 'comment',
        title: c.user || 'Độc giả yêu truyện',
        subtitle: `đã bình luận ở ${chLabel} · ${storyTitle}`,
        contentSnippet: cleanNotificationSnippet(c.text).substring(0, 100) || 'Bình luận mới',
        timeAgo: formatNotificationTime(c.createdAt),
        createdAt: c.createdAt || new Date().toISOString(),
        avatar: c.avatar || '🌸',
        isRead,
        storyId: c.storyId,
        storyTitle,
        chapterNumber: c.chapterNumber,
        user: c.user,
        rawComment: c,
      });
    });

    // 2. Reader Letters (tâm thư riêng tư & công khai gửi cho tác giả)
    currentLetters.forEach((l) => {
      if (l.id && l.id.startsWith('sample-')) return;
      if (isLetterDeleted(l.id)) return;

      const isRead = readIds.has(l.id);
      const typeLabel = l.type === 'private' ? 'thư kín (riêng tư)' : 'tâm tình công khai';

      items.push({
        id: l.id,
        type: 'letter',
        title: l.sender || 'Bạn đọc giấu tên',
        subtitle: `đã gửi một ${typeLabel}`,
        contentSnippet: cleanNotificationSnippet(l.content).substring(0, 100) || 'Lá thư mới',
        timeAgo: formatNotificationTime(l.createdAt),
        createdAt: l.createdAt || new Date().toISOString(),
        avatar: l.avatar || '💌',
        isRead,
        user: l.sender,
        rawLetter: l,
      });
    });
  }

  // =========================================================================
  // PERSONAL NOTIFICATIONS: FOR ALL LOGGED-IN USERS (Readers, Collaborators, Admins)
  // Dedicated personal alerts whenever someone replies to:
  // 1. Their personal comments or mentions in comments.
  // 2. Their personal letters (tâm thư / thư thầm kín).
  // =========================================================================
  if (context.user) {
    const userEmail = (context.user.email || '').toLowerCase().trim();
    const userName = (context.user.displayName || context.user.nickname || '').trim().toLowerCase();
    const userUid = context.user.uid || '';
    const localSavedCodes = getSavedPersonalCodes(userUid);

    // 1. Replies to user's comments across stories
    currentComments.forEach((c) => {
      if (isStoryDeleted(c.storyId)) return;
      if (!storyMap.has(c.storyId)) return;

      const commentEmail = (c.userEmail || '').toLowerCase().trim();
      const commentUser = (c.user || '').toLowerCase().trim();
      const commentUid = c.userId || '';

      const isMyComment =
        (userUid && commentUid && userUid === commentUid) ||
        (userEmail && commentEmail && userEmail === commentEmail) ||
        (userName && commentUser && userName === commentUser);

      if (Array.isArray(c.replies) && c.replies.length > 0) {
        const storyTitle = storyMap.get(c.storyId) || c.storyId;
        const chLabel = c.chapterNumber ? `Chương ${c.chapterNumber}` : 'Truyện';

        c.replies.forEach((rep, idx) => {
          // Exclude self-replies
          const repEmail = (rep.userEmail || '').toLowerCase().trim();
          const repName = (rep.user || '').toLowerCase().trim();
          const isSelf =
            (userEmail && repEmail && userEmail === repEmail) ||
            (userName && repName && userName === repName);
          if (isSelf) return;

          // Check if this reply is to my root comment OR directly replying to me (@username)
          const isDirectlyMentioned = rep.replyToUser && userName && rep.replyToUser.toLowerCase() === userName;
          if (!isMyComment && !isDirectlyMentioned) return;

          const replyId = rep.id || `reply_${c.id}_${idx}`;
          const isAuthorRole = rep.isAuthor;
          const isCollabRole = rep.isCollaborator;
          const roleTag = rep.roleBadge
            ? ` (${rep.roleBadge})`
            : isAuthorRole
            ? ' (Quản trị viên 👑)'
            : isCollabRole
            ? ' (Cộng tác viên 🛡️)'
            : '';
          const replierDisplayName = `${rep.user || 'Bạn đọc'}${roleTag}`;

          items.push({
            id: replyId,
            type: 'reply',
            title: replierDisplayName,
            subtitle: `đã phản hồi bình luận của bạn tại ${chLabel} · ${storyTitle}`,
            contentSnippet: cleanNotificationSnippet(rep.text).substring(0, 100) || 'Đã phản hồi bình luận của bạn',
            timeAgo: formatNotificationTime(rep.createdAt),
            createdAt: rep.createdAt || c.createdAt || new Date().toISOString(),
            avatar: rep.avatar || (isAuthorRole ? '👑' : isCollabRole ? '🛡️' : '💬'),
            isRead: readIds.has(replyId),
            storyId: c.storyId,
            storyTitle,
            chapterNumber: c.chapterNumber,
          });
        });
      }
    });

    // 2. Author / Admin replies to user's letters (Tâm thư thầm kín / công khai)
    currentLetters.forEach((l) => {
      if (isLetterDeleted(l.id)) return;

      const letterEmail = (l.userEmail || l.senderEmail || '').toLowerCase().trim();
      const letterUid = l.userId || l.senderUid || '';
      const letterCode = l.secretLookupCode?.toUpperCase();

      const isMyLetter =
        (userUid && letterUid && userUid === letterUid) ||
        (userEmail && letterEmail && userEmail === letterEmail) ||
        (letterCode && localSavedCodes.includes(letterCode));

      const hasReply = Boolean(l.replyFromMel || (l as any).authorReply);

      if (isMyLetter && hasReply) {
        const replyText = l.replyFromMel || (l as any).authorReply || '';
        const letterSnippet = cleanNotificationSnippet(l.content).substring(0, 35);
        const replySnippet = cleanNotificationSnippet(replyText).substring(0, 100);
        const replyId = `letter_reply_${l.id}`;
        const replier = l.repliedBy || 'Ban Quản Trị 🌸';

        items.push({
          id: replyId,
          type: 'letter_reply',
          title: replier,
          subtitle: `đã hồi đáp tâm thư riêng của bạn (Mã: ${l.secretLookupCode || 'Niêm phong'}): "${letterSnippet}..."`,
          contentSnippet: replySnippet || 'Tác giả & Ban Quản Trị đã gửi lời hồi đáp riêng cho tâm thư của bạn.',
          timeAgo: formatNotificationTime(l.repliedAt || l.createdAt),
          createdAt: l.repliedAt || l.createdAt || new Date().toISOString(),
          avatar: '💌',
          isRead: readIds.has(replyId),
          secretLookupCode: l.secretLookupCode,
          rawLetter: l,
        });
      }
    });
  }

  // =========================================================================
  // CHAPTER NOTIFICATIONS (Both Roles: Highlights Newest Published Chapters)
  // =========================================================================
  try {
    const chaptersCache = getLiveChaptersRuntimeCache();
    const recentChaptersList: Chapter[] = [];

    stories.forEach((st) => {
      if (isStoryDeleted(st.id)) return;
      const chList = chaptersCache[st.id] || getStoryChapters(st.id) || [];
      chList.forEach((ch) => {
        if (ch && ch.id) recentChaptersList.push(ch);
      });
    });

    // Sort chapters descending by published date
    recentChaptersList.sort((a, b) => {
      const timeA = new Date(a.publishedAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.publishedAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    // Pick top 10 recent chapters
    recentChaptersList.slice(0, 10).forEach((ch) => {
      const storyTitle = storyMap.get(ch.storyId) || ch.storyId;
      const notifId = `ch_notif_${ch.id}`;
      const plainSnippet = (ch.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      items.push({
        id: notifId,
        type: 'chapter',
        title: `Chương ${ch.chapterNumber}: ${ch.title || 'Chương mới'}`,
        subtitle: `Chương mới phát hành · ${storyTitle}`,
        contentSnippet: plainSnippet ? plainSnippet.substring(0, 95) + '...' : 'Đã có chương mới, nhấp để thưởng thức ngay!',
        timeAgo: formatNotificationTime(ch.publishedAt || ch.updatedAt),
        createdAt: ch.publishedAt || ch.updatedAt || new Date().toISOString(),
        avatar: '📖',
        isRead: readIds.has(notifId),
        storyId: ch.storyId,
        storyTitle,
        chapterNumber: ch.chapterNumber,
      });
    });
  } catch (err) {
    console.warn('Chapter notifications compile note:', err);
  }

  // =========================================================================
  // STORY NOTIFICATIONS (Highlights Newly Published / Updated Stories)
  // =========================================================================
  try {
    stories
      .filter((s) => !isStoryDeleted(s.id))
      .slice(0, 5)
      .forEach((st) => {
        const notifId = `story_notif_${st.id}`;
        items.push({
          id: notifId,
          type: 'story',
          title: `Tác phẩm: ${st.title}`,
          subtitle: `Truyện vừa ra mắt trên Mel (${st.completedChapters || 0}/${st.totalChapters || '?'} chương)`,
          contentSnippet: st.summary ? st.summary.substring(0, 95) + '...' : 'Khám phá câu chuyện tình cảm đặc sắc!',
          timeAgo: formatNotificationTime(st.updatedAt),
          createdAt: st.updatedAt || new Date().toISOString(),
          avatar: '🌸',
          isRead: readIds.has(notifId),
          storyId: st.id,
          storyTitle: st.title,
        });
      });
  } catch (err) {
    console.warn('Story notifications compile note:', err);
  }

  // =========================================================================
  // ANNOUNCEMENTS (Official Blog Notices)
  // =========================================================================
  try {
    const announcements = getStoredAnnouncements();
    announcements.slice(0, 5).forEach((ann) => {
      const notifId = `ann_notif_${ann.id}`;
      items.push({
        id: notifId,
        type: 'announcement',
        title: ann.title || 'Bảng tin Blog',
        subtitle: `Thông báo từ Ban quản trị Mel · ${ann.tag || 'Lưu ý'}`,
        contentSnippet: ann.content ? ann.content.substring(0, 95) + '...' : 'Thông báo mới',
        timeAgo: formatNotificationTime(ann.date || ann.createdAt),
        createdAt: ann.createdAt || ann.date || new Date().toISOString(),
        avatar: '📢',
        isRead: readIds.has(notifId),
      });
    });
  } catch (err) {
    console.warn('Announcements notifications compile note:', err);
  }

  // Sort descending by creation date
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const unreadCount = items.filter((item) => !item.isRead).length;
  return { items, unreadCount };
};

const notifySubscribers = () => {
  activeSubscribers.forEach((sub) => {
    try {
      const { items, unreadCount } = buildNotificationsList(sub.context);
      sub.callback(items, unreadCount);
    } catch (e) {
      console.error('Notification subscriber error:', e);
    }
  });
};

/**
 * Optimizes listeners:
 * - Only listens to Firestore/Server when there is at least one active subscriber.
 * - Only listens to reader_letters if at least one subscriber has Author/Collaborator role.
 * - If only regular readers are active, reader_letters listener is completely disabled to save Quota!
 */
const syncListenersWithSubscribers = () => {
  if (typeof window === 'undefined') return;

  const hasAnySubscriber = activeSubscribers.size > 0;
  const hasAuthorSubscriber = Array.from(activeSubscribers).some(
    (s) => s.context.isAuthor || s.context.isCollaborator
  );

  // 1. Comments listener
  if (hasAnySubscriber && !isListeningComments) {
    isListeningComments = true;
    unsubComments = subscribeToAllComments((comments) => {
      currentComments = comments;
      notifySubscribers();
    });
  } else if (!hasAnySubscriber && isListeningComments) {
    if (unsubComments) {
      unsubComments();
      unsubComments = null;
    }
    isListeningComments = false;
  }

  // 2. Letters listener (STRICTLY for Authors / Collaborators)
  if (hasAuthorSubscriber && !isListeningLetters) {
    isListeningLetters = true;
    unsubLetters = subscribeToReaderLetters((letters) => {
      currentLetters = letters;
      notifySubscribers();
    });
  } else if (!hasAuthorSubscriber && isListeningLetters) {
    if (unsubLetters) {
      unsubLetters();
      unsubLetters = null;
    }
    isListeningLetters = false;
    currentLetters = []; // Clear in-memory letters when author logs out
  }
};

/**
 * Subscribe to realtime notifications tailored to user identity and role
 */
export const subscribeToUserNotifications = (
  context: NotificationUserContext,
  subscriber: NotificationSubscriber
): (() => void) => {
  const subObj: ActiveSubscriber = { context, callback: subscriber };
  activeSubscribers.add(subObj);
  syncListenersWithSubscribers();

  // Initial emit
  const { items, unreadCount } = buildNotificationsList(context);
  subscriber(items, unreadCount);

  return () => {
    activeSubscribers.delete(subObj);
    syncListenersWithSubscribers();
  };
};

/**
 * Backwards compatibility helper for existing Author notifications
 */
export const subscribeToAuthorNotifications = (subscriber: NotificationSubscriber): (() => void) => {
  return subscribeToUserNotifications(
    { user: { uid: 'author', email: 'author@mel.vn' }, isAuthor: true, isCollaborator: false },
    subscriber
  );
};

/**
 * Mark a single notification as read for the specific user
 */
export const markNotificationAsRead = (id: string, uid?: string) => {
  const readIds = getReadIds(uid);
  readIds.add(id);
  saveReadIds(readIds, uid);
  notifySubscribers();
};

/**
 * Mark all current notifications as read for the specific user
 */
export const markAllNotificationsAsRead = (itemsToMark: AuthorNotificationItem[], uid?: string) => {
  const readIds = getReadIds(uid);
  itemsToMark.forEach((item) => readIds.add(item.id));
  saveReadIds(readIds, uid);
  notifySubscribers();
};
