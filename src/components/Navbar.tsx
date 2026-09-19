import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Sun,
  Moon,
  BookOpen,
  Bookmark,
  Key,
  Heart,
  Info,
  Menu,
  X,
  Music,
  Home,
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  LogOut,
  PenTool,
  Edit3,
  Settings,
  MessageSquare,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { bgmEngine, AudioTrack, TRACK_LIST } from '../utils/audioPlayer';
import { useAuth } from '../lib/authContext';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSearch: () => void;
  isPetalsEnabled: boolean;
  onTogglePetals: () => void;
  onOpenAuthorModal?: (tab?: string) => void;
  onNavigateToStory?: (storyId: string, chapterNumber?: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  isDarkMode,
  onToggleDarkMode,
  onOpenSearch,
  isPetalsEnabled,
  onTogglePetals,
  onOpenAuthorModal,
  onNavigateToStory,
}) => {
  const { user, isAuthor, isCollaborator, openAuthModal, openProfileModal, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>(TRACK_LIST[0]);
  const [isAuthorMenuOpen, setIsAuthorMenuOpen] = useState(false);
  const authorMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (authorMenuRef.current && !authorMenuRef.current.contains(event.target as Node)) {
        setIsAuthorMenuOpen(false);
      }
    };
    if (isAuthorMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAuthorMenuOpen]);

  useEffect(() => {
    const unsubscribe = bgmEngine.subscribe((state) => {
      setIsMusicPlaying(state.isPlaying);
      setCurrentTrack(state.track);
    });
    return unsubscribe;
  }, []);

  const handleToggleMusic = () => {
    bgmEngine.togglePlay();
  };

  interface NavItem {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: string;
  }

  // 5 desktop navigation items (Home is integrated into "Better and better" logo, VIP badge removed from Password)
  const desktopNavItems: NavItem[] = [
    {
      id: 'completed',
      label: 'Đã hoàn thành',
      shortLabel: 'Đã hoàn',
      icon: <BookOpen className="w-3.5 h-3.5 stroke-[1.75]" />,
    },
    {
      id: 'ongoing',
      label: 'Đang tiến hành',
      shortLabel: 'Tiến hành',
      icon: <Bookmark className="w-3.5 h-3.5 stroke-[1.75]" />,
    },
    {
      id: 'password',
      label: 'Gợi ý Password',
      shortLabel: 'Password',
      icon: <Key className="w-3.5 h-3.5 stroke-[1.75]" />,
    },
    {
      id: 'other',
      label: 'Góc nghỉ ngơi',
      shortLabel: 'Tâm sự & Nhạc',
      icon: <Heart className="w-3.5 h-3.5 stroke-[1.75]" />,
    },
    {
      id: 'about',
      label: 'Về Mellifluous',
      shortLabel: 'Về Mel',
      icon: <Info className="w-3.5 h-3.5 stroke-[1.75]" />,
    },
  ];

  // Mobile navigation includes Home link explicitly for quick drawer access
  const mobileNavItems: NavItem[] = [
    {
      id: 'home',
      label: 'Trang chủ (better and better)',
      shortLabel: 'Trang chủ',
      icon: <Home className="w-3.5 h-3.5 stroke-[1.75]" />,
    },
    ...desktopNavItems,
  ];

  const handleSelect = (tab: ActiveTab) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  // Lock body scroll when mobile navigation drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const isHomeActive = currentTab === 'home';

  return (
    <>
      <header
        id="main-navbar"
      className="fixed top-0 left-0 right-0 z-50 w-full backdrop-blur-md transition-colors duration-300 border-b
        bg-white/95 border-pink-100/80 text-stone-800
        dark:bg-stone-900/95 dark:border-stone-800/90 dark:text-stone-100 shadow-xs"
    >
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 lg:gap-4 box-border">
        {/* =================================================================== */}
        {/* 1. BRAND LOGO INTEGRATED WITH HOME ("TRANG CHỦ")                     */}
        {/* =================================================================== */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            id="navbar-logo-btn"
            onClick={() => handleSelect('home')}
            className={`group flex items-center gap-2 text-left focus:outline-hidden cursor-pointer px-2 py-1 -ml-1 rounded-xl transition-all duration-200 border ${
              isHomeActive
                ? 'bg-pink-50/90 dark:bg-pink-950/50 border-pink-200/90 dark:border-pink-800/60 shadow-2xs'
                : 'border-transparent hover:bg-pink-50/60 dark:hover:bg-stone-800/60'
            }`}
            title="Trang chủ • better and better"
            aria-label="Về Trang chủ blog Mellifluous"
          >
            {/* Flower Logo Icon Stamp */}
            <div className="relative shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-pink-200 via-rose-100 to-amber-100 dark:from-pink-950/60 dark:via-rose-900/40 dark:to-amber-950/40 border border-pink-300/50 dark:border-pink-500/30 shadow-2xs group-hover:scale-105 transition-all">
              <span className="text-xs sm:text-sm select-none">🌸</span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
              </span>
            </div>

            {/* Title & Subtitle block */}
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-serif text-sm sm:text-base lg:text-lg font-bold tracking-tight bg-gradient-to-r from-pink-600 via-rose-500 to-amber-600 dark:from-pink-400 dark:via-rose-300 dark:to-amber-300 bg-clip-text text-transparent whitespace-nowrap leading-tight group-hover:opacity-90">
                better and better
              </span>
              <span className="hidden xs:block text-[9px] sm:text-[10px] text-stone-500 dark:text-stone-400 font-sans tracking-tight whitespace-nowrap leading-tight">
                Mellifluous ━ Mùa hạ
              </span>
            </div>
          </button>
        </div>

        {/* =================================================================== */}
        {/* 2. CENTERED DESKTOP NAVIGATION (NO OVERLAPPING, SPACIOUS & CLEAN)    */}
        {/* =================================================================== */}
        <nav
          aria-label="Thanh điều hướng chính"
          className="hidden xl:flex items-center justify-center gap-1.5 2xl:gap-2.5 flex-1 min-w-0 px-2"
        >
          {desktopNavItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`group relative px-2.5 2xl:px-3.5 py-1.5 rounded-xl text-xs 2xl:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-pink-100/90 text-pink-900 dark:bg-pink-950/80 dark:text-pink-200 font-semibold shadow-2xs border border-pink-200/80 dark:border-pink-800'
                    : 'text-stone-600 hover:text-pink-600 hover:bg-pink-50/70 dark:text-stone-300 dark:hover:text-pink-300 dark:hover:bg-stone-800/60'
                }`}
              >
                <span
                  className={`shrink-0 transition-colors ${
                    isActive
                      ? 'text-pink-600 dark:text-pink-400'
                      : 'text-stone-400 dark:text-stone-500 group-hover:text-pink-600 dark:group-hover:text-pink-300'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="whitespace-nowrap leading-none">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-pink-500 to-rose-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* =================================================================== */}
        {/* 3. ACTION CONTROLS (INTEGRATED AUTHOR & ACCOUNT MENU, UTILITIES)     */}
        {/* =================================================================== */}
        <div id="navbar-action-controls" className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Realtime Notification Bell - Strictly for Logged-In Users */}
          {user && (
            <NotificationBell
              onOpenAuthorModal={onOpenAuthorModal}
              onNavigateToStory={onNavigateToStory}
              onNavigateToTab={onSelectTab}
            />
          )}

          {/* Integrated Author Studio & Account Dropdown Menu (Hidden on mobile phones, accessible via hamburger drawer) */}
          <div className="relative hidden md:block" ref={authorMenuRef}>
            <button
              type="button"
              id="navbar-author-account-dropdown-btn"
              onClick={() => setIsAuthorMenuOpen(!isAuthorMenuOpen)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                user
                  ? isAuthor
                    ? 'bg-rose-50/90 hover:bg-rose-100/90 dark:bg-pink-950/80 dark:hover:bg-pink-900/80 text-rose-800 dark:text-pink-300 border-rose-200 dark:border-pink-800'
                    : 'bg-stone-100/90 hover:bg-stone-200/90 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                  : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-transparent'
              }`}
              title="Menu Tác giả & Tài khoản"
              aria-expanded={isAuthorMenuOpen}
            >
              {user ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-pink-200 dark:bg-pink-900 text-pink-700 dark:text-pink-300 flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{(user.displayName || user.email || 'M')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <span className="font-serif truncate max-w-[85px] leading-none">
                    {isAuthor ? '🌸 Mel' : (user.displayName || 'Tài khoản')}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-stone-500 dark:text-stone-400 transition-transform duration-200 ${
                      isAuthorMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </>
              ) : (
                <>
                  <UserIcon className="w-3.5 h-3.5" />
                  <span className="inline font-medium leading-none">Tài khoản</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 ${
                      isAuthorMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </>
              )}
            </button>

            {/* Dropdown Menu Popover */}
            {isAuthorMenuOpen && (
              <div
                id="author-account-dropdown-menu"
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/98 dark:bg-stone-900/98 backdrop-blur-md border border-pink-200/90 dark:border-stone-700 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                {/* User Info Header */}
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-50/70 via-rose-50/50 to-amber-50/30 dark:from-stone-800 dark:to-stone-850 border border-pink-100 dark:border-stone-700/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-pink-200 dark:bg-pink-900 text-pink-700 dark:text-pink-300 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{user ? (user.displayName || user.email || 'M')[0].toUpperCase() : '🌸'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-serif text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                        {user ? (user.displayName || 'Độc giả') : 'Mellifluous Blog'}
                      </div>
                      <div className="text-[10px] text-pink-600 dark:text-pink-400 font-mono truncate">
                        {user ? user.email : 'Chưa đăng nhập'}
                      </div>
                    </div>
                  </div>
                  {isAuthor && (
                    <div className="mt-2 pt-1.5 border-t border-pink-100 dark:border-stone-700 flex items-center justify-between text-[10px]">
                      <span className="text-pink-700 dark:text-pink-300 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Tác giả & Quản trị</span>
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-pink-200/80 dark:bg-pink-950 text-pink-800 dark:text-pink-300 font-mono text-[9px]">
                        Admin
                      </span>
                    </div>
                  )}
                </div>

                {/* Author Studio Option (Integrated Branch) */}
                {isAuthor && onOpenAuthorModal && (
                  <button
                    type="button"
                    id="navbar-author-studio-item"
                    onClick={() => {
                      setIsAuthorMenuOpen(false);
                      onOpenAuthorModal();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-950/60 text-stone-800 dark:text-stone-100 flex items-center gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <PenTool className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold flex items-center gap-1.5 text-pink-700 dark:text-pink-300">
                        <span>Quản trị</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 font-sans">
                          Studio
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                        Đăng truyện, sửa chương, quản lý nhạc & thẻ
                      </div>
                    </div>
                  </button>
                )}

                {/* Reader Comments Quick Access for Author/Collaborator */}
                {(isAuthor || isCollaborator) && (
                  <button
                    type="button"
                    id="navbar-author-comments-item"
                    onClick={() => {
                      setIsAuthorMenuOpen(false);
                      if (onOpenAuthorModal) onOpenAuthorModal('comments');
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-pink-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 flex items-center gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-pink-100 dark:bg-pink-950 text-pink-600 dark:text-pink-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold flex items-center gap-1.5 text-stone-850 dark:text-stone-100">
                        <span>Bình luận độc giả</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 font-sans">
                          Mới
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                        Xem & phản hồi bạn đọc toàn trang
                      </div>
                    </div>
                  </button>
                )}

                {/* Edit Profile Option (Avatar, Nickname, Bio) */}
                {user && (
                  <button
                    type="button"
                    id="navbar-edit-profile-item"
                    onClick={() => {
                      setIsAuthorMenuOpen(false);
                      openProfileModal();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-pink-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-pink-100 dark:bg-stone-750 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">Chỉnh sửa Hồ sơ cá nhân</div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                        Đổi avatar, bút danh, giới thiệu bản thân
                      </div>
                    </div>
                  </button>
                )}

                {/* Account Settings / Auth Modal Option */}
                <button
                  type="button"
                  id="navbar-account-profile-item"
                  onClick={() => {
                    setIsAuthorMenuOpen(false);
                    openAuthModal();
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-100 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">
                      {user ? 'Tài khoản & Bảo mật' : 'Đăng nhập tài khoản'}
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {user ? 'Đổi mật khẩu, xem thông tin đăng nhập' : 'Đăng nhập Google / Email để gửi tâm tư'}
                    </div>
                  </div>
                </button>

                {/* Logout Button (if logged in) */}
                {user && (
                  <button
                    type="button"
                    id="navbar-account-logout-item"
                    onClick={() => {
                      setIsAuthorMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-stone-100 dark:border-stone-800 mt-1"
                  >
                    <div className="w-6 h-6 rounded-lg bg-rose-100/70 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <LogOut className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-medium">Đăng xuất tài khoản</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Compact Reading Utilities Group (Search, Music, Petals, Theme) */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-stone-100/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700/80 shadow-2xs">
            {/* Search Button */}
            <button
              type="button"
              id="navbar-search-btn"
              onClick={onOpenSearch}
              className="flex items-center justify-center w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg text-stone-600 hover:text-pink-600 hover:bg-white dark:bg-transparent dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-pink-300 transition-all cursor-pointer"
              title="Tìm kiếm (Ctrl+K / ⌘K)"
              aria-label="Tìm kiếm truyện"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Background Music Toggle Button (Hidden on small mobile screens to prevent header crowding; accessible in drawer & floating bar) */}
            <button
              type="button"
              id="navbar-bgm-btn"
              onClick={handleToggleMusic}
              className={`hidden sm:flex items-center justify-center w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg transition-all cursor-pointer ${
                isMusicPlaying
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-pink-600 hover:bg-white dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
              title={
                isMusicPlaying
                  ? `Đang phát nhạc: ${currentTrack.title} (Nhấp để tạm dừng)`
                  : 'Bật nhạc nền thư giãn khi đọc truyện'
              }
              aria-label={isMusicPlaying ? 'Tạm dừng nhạc nền' : 'Bật nhạc nền'}
            >
              {isMusicPlaying ? (
                <div className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 h-2.5 bg-white animate-bounce rounded-full" />
                  <span className="w-0.5 h-3.5 bg-white animate-bounce delay-100 rounded-full" />
                  <span className="w-0.5 h-2 bg-white animate-bounce delay-200 rounded-full" />
                </div>
              ) : (
                <Music className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Falling Sakura Petals Toggle Button */}
            <button
              type="button"
              id="navbar-petals-toggle-btn"
              onClick={onTogglePetals}
              className={`hidden sm:flex items-center justify-center w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg transition-all cursor-pointer ${
                isPetalsEnabled
                  ? 'bg-pink-100 dark:bg-pink-950/70 text-pink-700 dark:text-pink-300 shadow-2xs'
                  : 'text-stone-400 hover:text-pink-600 hover:bg-white dark:text-stone-500 dark:hover:bg-stone-700'
              }`}
              title={
                isPetalsEnabled
                  ? 'Cánh hoa rơi: Đang BẬT (Nhấp để tắt hiệu ứng)'
                  : 'Cánh hoa rơi: Đang TẮT (Nhấp để bật cánh hoa bồng bềnh)'
              }
              aria-label={isPetalsEnabled ? 'Tắt hiệu ứng hoa rơi' : 'Bật hiệu ứng hoa rơi'}
            >
              <span
                className={`text-xs sm:text-sm leading-none transition-transform select-none ${
                  isPetalsEnabled ? 'scale-110 drop-shadow-xs' : 'grayscale opacity-50'
                }`}
              >
                🌸
              </span>
            </button>

            {/* Dark / Light Mode Switch */}
            <button
              type="button"
              id="toggle-theme-btn"
              onClick={onToggleDarkMode}
              className="flex items-center justify-center w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg text-stone-600 hover:text-amber-500 hover:bg-white dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-amber-300 transition-colors cursor-pointer"
              title={
                isDarkMode
                  ? 'Chuyển sang giao diện Ban ngày rực rỡ'
                  : 'Chuyển sang giao diện Đêm hè ngắm sao'
              }
              aria-label="Đổi giao diện sáng tối"
            >
              {isDarkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-300 transition-transform duration-200" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-stone-600 transition-transform duration-200" />
              )}
            </button>
          </div>

          {/* Mobile & Tablet Hamburger Menu Button (xl:hidden) */}
          <button
            type="button"
            id="mobile-menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden flex items-center justify-center h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-stone-800 dark:text-pink-400 dark:hover:bg-stone-700 border border-pink-200/80 dark:border-stone-700 cursor-pointer transition-colors shadow-2xs gap-1.5"
            aria-label="Mở menu chuyển hướng"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            ) : (
              <>
                {user && (
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-pink-200 dark:bg-pink-900 flex items-center justify-center text-[10px] font-bold text-pink-700 dark:text-pink-300 md:hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{(user.displayName || user.email || 'M')[0].toUpperCase()}</span>
                    )}
                  </div>
                )}
                <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
              </>
            )}
          </button>
        </div>
      </div>
    </header>

    {/* =================================================================== */}
    {/* 4. RESPONSIVE MOBILE & TABLET DRAWER NAVIGATION (xl:hidden)         */}
    {/* Mounted directly to document.body via Portal to prevent CSS squish  */}
    {/* =================================================================== */}
    {isMobileMenuOpen &&
      typeof document !== 'undefined' &&
      createPortal(
        <div
          id="mobile-drawer-portal"
          data-theme={isDarkMode ? 'dark' : 'light'}
          className={`${isDarkMode ? 'dark ' : ''}fixed inset-0 top-14 sm:top-16 z-[9999] xl:hidden flex flex-col`}
        >
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 top-14 sm:top-16 bg-stone-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer sheet with full viewport scroll */}
          <div
            id="mobile-drawer-nav"
            className="relative z-10 w-full max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] bg-white dark:bg-stone-900 border-b border-pink-200 dark:border-stone-800 shadow-2xl p-4 sm:p-5 space-y-4 overflow-y-auto overscroll-contain text-stone-800 dark:text-stone-100 animate-in slide-in-from-top-2 duration-200"
          >
            {/* Header in Drawer */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="text-base">🌸</span>
                <span className="font-serif text-sm font-bold text-stone-800 dark:text-stone-100">
                  Các danh mục
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Account Profile / Studio Card */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50/60 to-amber-50/50 dark:from-stone-850 dark:via-stone-900 dark:to-stone-850 border border-pink-200/90 dark:border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full ring-2 ring-pink-300 dark:ring-pink-700 overflow-hidden bg-pink-200 dark:bg-pink-900 flex items-center justify-center font-bold text-sm shrink-0">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-pink-700 dark:text-pink-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-serif text-sm font-bold text-stone-800 dark:text-stone-100 truncate flex items-center gap-1.5">
                      <span>{user ? (user.displayName || 'Độc giả') : 'Chào bạn đọc'}</span>
                      {user && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500 text-white font-sans font-medium">
                          {user.roleBadge || (isAuthor ? 'Tác giả' : 'Bạn đọc')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono truncate">
                      {user ? user.email : 'Đăng nhập để bình luận & gửi thư'}
                    </div>
                  </div>
                </div>

                {!user && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openAuthModal();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                  >
                    Đăng nhập
                  </button>
                )}
              </div>

              {/* Action buttons inside Account Card */}
              {user && (
                <div className="flex items-center gap-2 pt-1 border-t border-pink-100/70 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      openProfileModal();
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-white dark:bg-stone-800 text-pink-600 dark:text-pink-300 text-xs font-semibold border border-pink-200 dark:border-stone-700 hover:bg-pink-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa hồ sơ & Avatar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="py-1.5 px-3 rounded-xl bg-rose-100/70 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-200/70 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát</span>
                  </button>
                </div>
              )}

              {/* Author Studio Shortcut if Author */}
              {isAuthor && onOpenAuthorModal && (
                <button
                  type="button"
                  id="mobile-drawer-author-studio-btn"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAuthorModal();
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-bold text-xs shadow-xs flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <PenTool className="w-4 h-4" />
                    <span>Quản trị</span>
                  </span>
                  <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-mono">
                    Studio
                  </span>
                </button>
              )}
            </div>

            {/* Quick Search Shortcut in Drawer */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenSearch();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-stone-100/80 dark:bg-stone-850 hover:bg-pink-50 dark:hover:bg-stone-800 border border-stone-200/80 dark:border-stone-700/80 text-stone-600 dark:text-stone-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-pink-500" />
                <span>Tìm kiếm truyện & mật khẩu (Password)...</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-500">
                Tìm
              </span>
            </button>

            {/* Navigation Links Grid with High Visibility */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
                Các chuyên mục truyện
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {mobileNavItems.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`mobile-menu-item-${item.id}`}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-pink-500 text-white shadow-xs scale-[1.01]'
                          : 'bg-stone-50 hover:bg-pink-50 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-white dark:bg-stone-800 text-pink-600 dark:text-pink-400 shadow-2xs'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-white text-pink-700' : 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Media & Effect Controls in Drawer */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
              <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider px-1">
                Tiện ích trải nghiệm
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Music Card Switch */}
                <button
                  type="button"
                  onClick={handleToggleMusic}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isMusicPlaying
                      ? 'bg-pink-100/80 dark:bg-pink-950/70 border-pink-300 dark:border-pink-800 text-pink-900 dark:text-pink-200'
                      : 'bg-stone-50 dark:bg-stone-850 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Music className="w-4 h-4 text-pink-500 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="truncate font-bold">
                        {isMusicPlaying ? 'Đang phát nhạc' : 'Nhạc nền'}
                      </div>
                      <div className="text-[10px] opacity-75 font-normal truncate">
                        {isMusicPlaying ? currentTrack.title : 'Chạm để nghe'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-pink-500 text-white shrink-0">
                    {isMusicPlaying ? 'Tắt' : 'Bật'}
                  </span>
                </button>

                {/* Petals Switch */}
                <button
                  type="button"
                  onClick={onTogglePetals}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isPetalsEnabled
                      ? 'bg-pink-100/80 dark:bg-pink-950/70 border-pink-300 dark:border-pink-800 text-pink-900 dark:text-pink-200'
                      : 'bg-stone-50 dark:bg-stone-850 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base select-none">🌸</span>
                    <div className="text-left">
                      <div className="font-bold">Hoa anh đào</div>
                      <div className="text-[10px] opacity-75 font-normal">
                        {isPetalsEnabled ? 'Đang rơi' : 'Tạm tắt'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-pink-500 text-white shrink-0">
                    {isPetalsEnabled ? 'Tắt' : 'Bật'}
                  </span>
                </button>

                {/* Theme Mode Switch */}
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border bg-stone-50 dark:bg-stone-850 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-pink-50 dark:hover:bg-stone-800"
                >
                  <div className="flex items-center gap-2.5">
                    {isDarkMode ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-stone-600" />
                    )}
                    <div className="text-left">
                      <div className="font-bold">Giao diện</div>
                      <div className="text-[10px] opacity-75 font-normal">
                        {isDarkMode ? 'Đêm ngắm sao' : 'Ban ngày'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-pink-500 text-white shrink-0">
                    {isDarkMode ? 'Sáng' : 'Tối'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
