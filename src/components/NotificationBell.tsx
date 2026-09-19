import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Mail,
  BookOpen,
  Sparkles,
  ChevronRight,
  Compass,
} from 'lucide-react';
import {
  AuthorNotificationItem,
  subscribeToUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../lib/notificationService';
import { useAuth } from '../lib/authContext';

interface NotificationBellProps {
  onOpenAuthorModal?: (tab?: string) => void;
  onNavigateToStory?: (storyId: string, chapterNumber?: number) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onOpenAuthorModal,
  onNavigateToStory,
  onNavigateToTab,
}) => {
  const { user, isAuthor, isCollaborator } = useAuth();
  const [notifications, setNotifications] = useState<AuthorNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  const isInternal = isAuthor || isCollaborator;
  const currentUid = user?.uid || user?.email || undefined;

  // Realtime role-based subscription: strictly requires authenticated user
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const unsub = subscribeToUserNotifications(
      {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          nickname: (user as any).nickname,
        },
        isAuthor,
        isCollaborator,
      },
      (items, count) => {
        setNotifications(items);
        setUnreadCount(count);
      }
    );

    return unsub;
  }, [user?.uid, user?.email, user?.displayName, isAuthor, isCollaborator]);

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // If user is not logged in, bell is completely hidden
  if (!user) {
    return null;
  }

  // Filter items based on active tab and role
  const filteredItems = notifications.filter((item) => {
    if (activeFilter === 'all') return true;

    if (isInternal) {
      if (activeFilter === 'personal') return item.type === 'reply' || item.type === 'letter_reply';
      if (activeFilter === 'comment') return item.type === 'comment';
      if (activeFilter === 'letter') return item.type === 'letter';
      if (activeFilter === 'chapter') return item.type === 'chapter' || item.type === 'story';
    } else {
      if (activeFilter === 'personal') return item.type === 'reply' || item.type === 'letter_reply';
      if (activeFilter === 'chapter') return item.type === 'chapter' || item.type === 'story';
      if (activeFilter === 'announcement') return item.type === 'announcement';
    }

    return true;
  });

  const handleItemClick = (item: AuthorNotificationItem) => {
    markNotificationAsRead(item.id, currentUid);
    setIsOpen(false);

    if (item.type === 'letter_reply') {
      const targetCode = item.secretLookupCode || item.rawLetter?.secretLookupCode;
      if (targetCode) {
        try {
          localStorage.setItem('mel_active_lookup_code', targetCode);
        } catch {}
      }
      if (onNavigateToTab) {
        onNavigateToTab('other');
      }
      window.dispatchEvent(
        new CustomEvent('open_reader_letter', {
          detail: {
            code: targetCode,
            letter: item.rawLetter,
          },
        })
      );
    } else if (item.type === 'chapter' || item.type === 'story' || item.type === 'reply') {
      if (onNavigateToStory && item.storyId) {
        onNavigateToStory(item.storyId, item.chapterNumber);
      }
    } else if (item.type === 'comment') {
      if (onNavigateToStory && item.storyId) {
        onNavigateToStory(item.storyId, item.chapterNumber);
      } else if (onOpenAuthorModal) {
        onOpenAuthorModal('comments');
      }
    } else if (item.type === 'letter') {
      // Letters only for author/collaborators
      if (isInternal && onOpenAuthorModal) {
        onOpenAuthorModal('letters');
      }
    }
  };

  const getBadgeEmoji = (type: string) => {
    switch (type) {
      case 'letter':
      case 'letter_reply':
        return '💌';
      case 'comment':
        return '💬';
      case 'reply':
        return '💬';
      case 'chapter':
        return '📖';
      case 'story':
        return '🌸';
      case 'announcement':
        return '📢';
      default:
        return '✨';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        id="navbar-author-notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'bg-pink-100 dark:bg-stone-700 text-pink-700 dark:text-pink-300 shadow-xs'
            : 'text-stone-600 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-stone-800'
        }`}
        title={isInternal ? 'Thông báo nội bộ & Tương tác độc giả' : 'Thông báo truyện mới & Cập nhật'}
        aria-label="Thông báo"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-stone-900 animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Popover */}
      {isOpen && (
        <div
          id="author-notifications-popover"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/98 dark:bg-stone-900/98 backdrop-blur-md border border-pink-200/90 dark:border-stone-700 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[500px]"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-stone-150 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-850/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-pink-150 dark:bg-stone-750 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <span className="font-serif text-xs font-bold text-stone-900 dark:text-stone-100">
                {isInternal ? 'Thông báo Quản trị & Tương tác' : 'Thông báo & Cập nhật mới'}
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 text-[10px] font-mono font-bold">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead(notifications, currentUid)}
                className="text-[11px] text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Filter Chips - Tailored specifically per Role */}
          <div className="flex items-center gap-1.5 px-3.5 py-2 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              Tất cả ({notifications.length})
            </button>

            {isInternal ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveFilter('personal')}
                  className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    activeFilter === 'personal'
                      ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Phản hồi ({notifications.filter((n) => n.type === 'reply' || n.type === 'letter_reply').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('comment')}
                  className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    activeFilter === 'comment'
                      ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Bình luận</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('letter')}
                  className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    activeFilter === 'letter'
                      ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <Mail className="w-3 h-3" />
                  <span>Tâm thư</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('chapter')}
                  className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    activeFilter === 'chapter'
                      ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Truyện & Chương</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveFilter('personal')}
                  className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    activeFilter === 'personal'
                      ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Phản hồi của tôi ({notifications.filter((n) => n.type === 'reply' || n.type === 'letter_reply').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('chapter')}
                  className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    activeFilter === 'chapter'
                      ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Truyện & Chương</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('announcement')}
                  className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    activeFilter === 'announcement'
                      ? 'bg-pink-100 dark:bg-stone-800 text-pink-700 dark:text-pink-300 font-semibold'
                      : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Bảng tin</span>
                </button>
              </>
            )}
          </div>

          {/* Scrollable Notifications List */}
          <div className="overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 flex-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-stone-400 dark:text-stone-500 space-y-1.5">
                <Sparkles className="w-8 h-8 mx-auto text-pink-300 dark:text-pink-700/60 stroke-[1.5]" />
                <p className="text-xs">Chưa có thông báo mới.</p>
                <p className="text-[10px] text-stone-400 max-w-xs mx-auto">
                  {isInternal
                    ? 'Khi độc giả gửi bình luận hoặc tâm thư, hệ thống sẽ báo ngay tại đây.'
                    : 'Khi có chương truyện mới ra mắt hoặc tác giả phản hồi bình luận, bạn sẽ nhận được thông báo tại đây.'}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/80 transition-colors cursor-pointer flex items-start gap-3 relative ${
                    !item.isRead ? 'bg-pink-50/40 dark:bg-pink-950/20' : ''
                  }`}
                >
                  {/* Unread Indicator Dot */}
                  {!item.isRead && (
                    <span className="absolute top-4 left-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 ring-2 ring-pink-200 dark:ring-pink-900" />
                  )}

                  {/* Avatar with Type Icon Badge */}
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-stone-750 text-pink-700 dark:text-pink-300 flex items-center justify-center text-sm shadow-2xs overflow-hidden">
                      {item.avatar && (item.avatar.startsWith('http://') || item.avatar.startsWith('https://') || item.avatar.startsWith('data:')) ? (
                        <img
                          src={item.avatar}
                          alt={item.title || 'Avatar'}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-xs select-none">{item.avatar || getBadgeEmoji(item.type)}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-[9px]">
                      {getBadgeEmoji(item.type)}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xs font-bold text-stone-850 dark:text-stone-100 truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 whitespace-nowrap">
                        {item.timeAgo}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-600 dark:text-stone-300 leading-snug">
                      {item.subtitle}
                    </div>

                    <div className="text-[11px] text-stone-500 dark:text-stone-400 italic line-clamp-2 pl-2 border-l-2 border-pink-200 dark:border-pink-900 mt-1 break-words">
                      "{item.contentSnippet}"
                    </div>
                  </div>

                  <ChevronRight className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600 self-center shrink-0" />
                </div>
              ))
            )}
          </div>

          {/* Footer Quick Links */}
          <div className="p-2.5 border-t border-stone-150 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-850/90 flex items-center justify-between text-xs">
            {isInternal ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenAuthorModal) onOpenAuthorModal('comments');
                  }}
                  className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Quản lý bình luận</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenAuthorModal) onOpenAuthorModal('letters');
                  }}
                  className="text-stone-600 dark:text-stone-300 hover:text-pink-600 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Hòm thư Mel</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onNavigateToStory) onNavigateToStory('');
                  }}
                  className="text-pink-600 dark:text-pink-400 hover:text-pink-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Khám phá truyện mới</span>
                </button>

                <span className="text-[11px] text-stone-400 dark:text-stone-500 italic">
                  Cập nhật liên tục 🌸
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
