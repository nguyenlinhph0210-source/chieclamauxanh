import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { ActiveTab, Story, Announcement, RecentUpdate } from './types';
import { STORIES, ANNOUNCEMENTS, RECENT_UPDATES, getStoryChapters, isStoryDeleted } from './data/mockData';
import {
  subscribeToPublishedStories,
  subscribeToAnnouncements,
  subscribeToAllChapters,
  sortStoriesByLatest,
  sortAnnouncements,
  getStoredAnnouncements,
} from './lib/realtimeService';
import { AuthorPublishModal } from './components/AuthorPublishModal';
import { initPeriodicBatchSync } from './lib/githubSyncService';
import { Navbar } from './components/Navbar';
import { HeroIntro } from './components/HeroIntro';
import { LetterNavCards, LetterTab } from './components/LetterNavCards';
import { Sidebar } from './components/Sidebar';
import { StoryCard } from './components/StoryCard';
import { StoryModal } from './components/StoryModal';
import { ReaderView } from './components/ReaderView';
import { StoryDetailPage } from './components/StoryDetailPage';
import { PasswordPage } from './components/PasswordPage';
import { OtherSections } from './components/OtherSections';
import { AboutView } from './components/AboutView';
import { CompletedStoriesView } from './components/CompletedStoriesView';
import { OngoingStoriesView } from './components/OngoingStoriesView';
import { HomePasswordSection } from './components/HomePasswordSection';
import { HomeOtherSection } from './components/HomeOtherSection';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { Footer } from './components/Footer';
import { BackgroundMusicBar } from './components/BackgroundMusicBar';
import { SakuraPetals } from './components/SakuraPetals';
import { Clock, Sparkles, CheckCircle2, ArrowLeft, MailOpen, X, ArrowUp, ChevronUp, ChevronDown } from 'lucide-react';

const StoryDetailRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/bai-viet/${id}`} replace />;
};

const StoryChapterRedirect: React.FC = () => {
  const { id, chapterNumber } = useParams<{ id: string; chapterNumber: string }>();
  return <Navigate to={`/bai-viet/${id}/chuong/${chapterNumber}`} replace />;
};

const formatRelativeTime = (timeStr?: string): string => {
  if (!timeStr) return 'Vừa đăng';
  if (timeStr.includes('trước') || timeStr === 'Vừa đăng' || timeStr === 'Mới') {
    return timeStr;
  }
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
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab: ActiveTab = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/da-hoan')) return 'completed';
    if (path.startsWith('/dang-ra')) return 'ongoing';
    if (path.startsWith('/pass')) return 'password';
    if (path.startsWith('/khac')) return 'other';
    if (path.startsWith('/gioi-thieu')) return 'about';
    return 'home';
  }, [location.pathname]);

  const [activeLetter, setActiveLetter] = useState<LetterTab | null>(null);
  const [storyFilter, setStoryFilter] = useState<'all' | 'completed' | 'ongoing'>('all');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');

  // Story detail popup modal state
  const [modalStoryId, setModalStoryId] = useState<string | null>(null);

  // Reading state for chapters
  const [readingChapterInfo, setReadingChapterInfo] = useState<{
    storyId: string;
    chapterNumber: number;
  } | null>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('better_and_better_theme');
      if (saved) return saved === 'dark';
      return false;
    } catch {
      return false;
    }
  });

  // Sakura petals falling effect state (default enabled, user can toggle on Navbar)
  const [isPetalsEnabled, setIsPetalsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('better_and_better_sakura_petals');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState<boolean>(false);
  const [authorModalInitialTab, setAuthorModalInitialTab] = useState<string | undefined>('newStory');
  const [stories, setStories] = useState<Story[]>(() => sortStoriesByLatest(STORIES));
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => sortAnnouncements(getStoredAnnouncements()));
  const [chaptersVersion, setChaptersVersion] = useState<number>(0);

  const handleOpenAuthorModal = (tab?: string) => {
    if (tab) {
      setAuthorModalInitialTab(tab);
    }
    setIsAuthorModalOpen(true);
  };

  // Periodic automatic batch sync to GitHub (every 15-20 minutes, pushes comments, letters and stats in background)
  useEffect(() => {
    const cleanup = initPeriodicBatchSync();
    return () => {
      cleanup();
    };
  }, []);

  // Real-time synchronization of published stories, chapters & announcements across all devices
  useEffect(() => {
    const unsubStories = subscribeToPublishedStories((liveStories) => {
      if (Array.isArray(liveStories)) {
        setStories(sortStoriesByLatest(liveStories));
      }
    });

    const unsubChapters = subscribeToAllChapters(() => {
      setChaptersVersion((v) => v + 1);
    });

    const unsubAnn = subscribeToAnnouncements((liveAnn) => {
      if (Array.isArray(liveAnn)) {
        setAnnouncements(sortAnnouncements(liveAnn));
      }
    });

    return () => {
      unsubStories();
      unsubChapters();
      unsubAnn();
    };
  }, []);

  // Sync dark mode
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        if (document.body) {
          document.body.classList.add('dark');
          document.body.setAttribute('data-theme', 'dark');
        }
        localStorage.setItem('better_and_better_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        if (document.body) {
          document.body.classList.remove('dark');
          document.body.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('better_and_better_theme', 'light');
      }
    } catch {
      // Safe fallback
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const togglePetals = () => {
    setIsPetalsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('better_and_better_sakura_petals', String(next));
      } catch {}
      return next;
    });
  };

  /**
   * Helper function: Smooth scroll to active letter content
   * Compensates for fixed Navbar height (~76px) to ensure starting directly
   * from the top of the unfolded letter without erratic jumping.
   */
  const scrollToActiveLetter = () => {
    setTimeout(() => {
      const element = document.getElementById('active-letter-content');
      if (element) {
        const navbarOffset = 76;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navbarOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth',
        });
      }
    }, 60);
  };

  /**
   * MECHANISM 1: Click on Navbar Menu items
   * Navigates readers to a dedicated, separate page cleanly at the top (top: 0).
   */
  const handleNavSelect = (tab: ActiveTab) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setReadingChapterInfo(null);
    setModalStoryId(null);
    if (tab === 'home') {
      setSelectedGenreFilter('all');
      navigate('/');
    } else if (tab === 'completed') {
      navigate('/da-hoan');
    } else if (tab === 'ongoing') {
      navigate('/dang-ra');
    } else if (tab === 'password') {
      navigate('/pass');
    } else if (tab === 'other') {
      navigate('/khac');
    } else if (tab === 'about') {
      navigate('/gioi-thieu');
    }
  };

  /**
   * MECHANISM 2: Click on Letter Cards on Home page
   * Opens ONLY that letter (exclusive view - hides others and does not preload them).
   * Clicking the currently active letter toggles it off (collapses/hides it).
   * Smoothly scrolls to the top of that letter's content from the first item.
   */
  const handleLetterSelect = (tab: LetterTab) => {
    if (location.pathname !== '/') {
      navigate('/');
    }
    // Toggle off: If clicking the active envelope again, hide it!
    if (activeLetter === tab) {
      setActiveLetter(null);
      return;
    }
    setSelectedGenreFilter('all');
    if (tab === 'completed') {
      setStoryFilter('completed');
    } else if (tab === 'ongoing') {
      setStoryFilter('ongoing');
    }
    setActiveLetter(tab);
    scrollToActiveLetter();
  };

  /**
   * Quick filter switch buttons: "Toàn bộ", "Đã hoàn", "Đang cập nhật"
   * Updates story filter in-place WITHOUT scrolling up to optimize reading experience.
   */
  const handleQuickFilterSelect = (filter: 'all' | 'completed' | 'ongoing') => {
    setStoryFilter(filter);
    if (filter === 'completed') {
      setActiveLetter('completed');
    } else if (filter === 'ongoing') {
      setActiveLetter('ongoing');
    }
    // Strictly NO window.scrollTo or element.scrollIntoView called here
    // to preserve reading position and prevent any jarring viewport jump.
  };

  // Open story page with URL route /bai-viet/:id
  const handleOpenStoryModal = (storyId: string) => {
    navigate(`/bai-viet/${storyId}`);
  };

  // Open reader view cleanly at the top of the chapter via route /bai-viet/:id/chuong/:chapterNumber
  const handleOpenChapter = (storyId: string, chapterNumber: number) => {
    navigate(`/bai-viet/${storyId}/chuong/${chapterNumber}`);
  };

  const handleNavigateToStory = (storyId: string, chapterNumber?: number) => {
    if (chapterNumber && chapterNumber > 0) {
      handleOpenChapter(storyId, chapterNumber);
    } else {
      handleOpenStoryModal(storyId);
    }
  };

  const handleBackFromReader = () => {
    setReadingChapterInfo(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const completedStories = useMemo(() => sortStoriesByLatest(stories.filter((s) => s.status === 'completed')), [stories]);
  const ongoingStories = useMemo(() => sortStoriesByLatest(stories.filter((s) => s.status === 'ongoing')), [stories]);
  const completedCount = completedStories.length;
  const ongoingCount = ongoingStories.length;
  const totalStoriesCount = stories.length;

  const filteredStories = useMemo(() => {
    const list = stories.filter((story) => {
      if (storyFilter === 'completed' && story.status !== 'completed') return false;
      if (storyFilter === 'ongoing' && story.status !== 'ongoing') return false;
      if (selectedGenreFilter !== 'all' && !story.genre.includes(selectedGenreFilter)) return false;
      return true;
    });
    return sortStoriesByLatest(list);
  }, [stories, storyFilter, selectedGenreFilter]);

  const modalStory = modalStoryId ? stories.find((s) => s.id === modalStoryId) || null : null;

  const dynamicRecentUpdates: RecentUpdate[] = useMemo(() => {
    const allRecentChapters: (RecentUpdate & { rawTime: number })[] = [];

    stories.forEach((story) => {
      if (isStoryDeleted(story.id)) return;
      const chs = getStoryChapters(story.id);
      chs.forEach((ch) => {
        const timeVal = ch.publishedAt ? new Date(ch.publishedAt).getTime() : 0;
        allRecentChapters.push({
          id: `upd-${story.id}-${ch.id}`,
          storyId: story.id,
          storyTitle: story.title,
          chapterNumber: ch.chapterNumber,
          chapterTitle: ch.title,
          timeAgo: formatRelativeTime(ch.publishedAt || story.updatedAt),
          isLocked: Boolean(ch.isLocked),
          status: story.status,
          rawTime: !isNaN(timeVal) ? timeVal : 0,
        });
      });
    });

    if (allRecentChapters.length > 0) {
      allRecentChapters.sort((a, b) => {
        if (a.rawTime > 0 && b.rawTime > 0 && a.rawTime !== b.rawTime) {
          return b.rawTime - a.rawTime;
        }
        if (b.rawTime > 0 && a.rawTime === 0) return 1;
        if (a.rawTime > 0 && b.rawTime === 0) return -1;
        return b.chapterNumber - a.chapterNumber;
      });
      return allRecentChapters.slice(0, 10);
    }
    return [];
  }, [stories, chaptersVersion]);

  const readingStory = readingChapterInfo
    ? stories.find(
        (s) =>
          !isStoryDeleted(s.id) &&
          (s.id === readingChapterInfo.storyId ||
            (readingChapterInfo.storyId === 'anh-dao-5cm' && s.id === 'anh-dao-nam-centimet') ||
            (readingChapterInfo.storyId === 'anh-dao-nam-centimet' && s.id === 'anh-dao-5cm'))
      ) || null
    : null;
  const readingChapters = useMemo(() => {
    return readingStory ? getStoryChapters(readingStory.id) : [];
  }, [readingStory, chaptersVersion]);
  const readingChapter =
    readingStory && readingChapterInfo
      ? readingChapters.find((c) => c.chapterNumber === readingChapterInfo.chapterNumber) ||
        readingChapters[0]
      : null;

  return (
    <div
      id="app-root-container"
      data-theme={isDarkMode ? 'dark' : 'light'}
      className={`${isDarkMode ? 'dark ' : ''}min-h-screen flex flex-col bg-[#fffbf8] dark:bg-stone-950 text-stone-800 dark:text-stone-100 font-sans transition-colors duration-300 relative selection:bg-pink-200 dark:selection:bg-pink-900/60 overflow-x-clip`}
    >
      {/* Falling Sakura Cherry Blossom Canvas */}
      <SakuraPetals enabled={isPetalsEnabled} />

      {/* Main Top Navigation Header - FIXED AT TOP */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleNavSelect}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenSearch={() => setIsSearchOpen(true)}
        isPetalsEnabled={isPetalsEnabled}
        onTogglePetals={togglePetals}
        onOpenAuthorModal={handleOpenAuthorModal}
        onNavigateToStory={handleNavigateToStory}
      />

      {/* Main Content Area with top padding to clear fixed navbar */}
      <main className="flex-1 max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 pb-12 w-full pt-20 sm:pt-24">
        <Routes>
          {/* DEDICATED STORY & CHAPTER ROUTES FOR DIRECT SHARING AND DEEP LINKING */}
          <Route path="/bai-viet/:id" element={<StoryDetailPage stories={stories} />} />
          <Route path="/bai-viet/:id/chuong/:chapterNumber" element={<StoryDetailPage stories={stories} />} />
          <Route path="/truyen/:id" element={<StoryDetailRedirect />} />
          <Route path="/truyen/:id/chuong/:chapterNumber" element={<StoryChapterRedirect />} />

          {/* PAGE 1: DEDICATED COMPLETED STORIES PAGE */}
          <Route
            path="/da-hoan"
            element={
              <CompletedStoriesView
                stories={stories}
                announcements={announcements}
                recentUpdates={dynamicRecentUpdates}
                onBackToHome={() => handleNavSelect('home')}
                onOpenStory={handleOpenStoryModal}
                onSelectChapter={handleOpenChapter}
              />
            }
          />

          {/* PAGE 2: DEDICATED ONGOING STORIES PAGE */}
          <Route
            path="/dang-ra"
            element={
              <OngoingStoriesView
                stories={stories}
                announcements={announcements}
                recentUpdates={dynamicRecentUpdates}
                onBackToHome={() => handleNavSelect('home')}
                onOpenStory={handleOpenStoryModal}
                onSelectChapter={handleOpenChapter}
              />
            }
          />

          {/* PAGE 3: DEDICATED PASSWORD GUIDE PAGE */}
          <Route
            path="/pass"
            element={
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <button
                    type="button"
                    onClick={() => handleNavSelect('home')}
                    className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Trang chủ</span>
                  </button>
                  <span>/</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Gợi ý Password
                  </span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8">
                    <PasswordPage stories={stories} onOpenStory={handleOpenStoryModal} />
                  </div>
                  <div className="lg:col-span-4">
                    <Sidebar
                      stories={stories}
                      announcements={announcements}
                      recentUpdates={dynamicRecentUpdates}
                      onSelectStory={handleOpenStoryModal}
                      onSelectChapter={handleOpenChapter}
                      onFilterGenre={(g) => setSelectedGenreFilter(g)}
                    />
                  </div>
                </div>
              </div>
            }
          />

          {/* PAGE 4: DEDICATED OTHER SECTIONS PAGE (CONFESSION & MUSIC) */}
          <Route
            path="/khac"
            element={
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <button
                    type="button"
                    onClick={() => handleNavSelect('home')}
                    className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Trang chủ</span>
                  </button>
                  <span>/</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                    Một số mục khác (Tâm sự & Nhạc hè)
                  </span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8">
                    <OtherSections />
                  </div>
                  <div className="lg:col-span-4">
                    <Sidebar
                      stories={stories}
                      announcements={announcements}
                      recentUpdates={dynamicRecentUpdates}
                      onSelectStory={handleOpenStoryModal}
                      onSelectChapter={handleOpenChapter}
                      onFilterGenre={(g) => setSelectedGenreFilter(g)}
                    />
                  </div>
                </div>
              </div>
            }
          />

          {/* PAGE 5: DEDICATED ABOUT MELLIFLUOUS PAGE */}
          <Route
            path="/gioi-thieu"
            element={
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <button
                    type="button"
                    onClick={() => handleNavSelect('home')}
                    className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Trang chủ</span>
                  </button>
                  <span>/</span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    Về Mellifluous
                  </span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8">
                    <AboutView />
                  </div>
                  <div className="lg:col-span-4">
                    <Sidebar
                      stories={stories}
                      announcements={announcements}
                      recentUpdates={dynamicRecentUpdates}
                      onSelectStory={handleOpenStoryModal}
                      onSelectChapter={handleOpenChapter}
                      onFilterGenre={(g) => setSelectedGenreFilter(g)}
                    />
                  </div>
                </div>
              </div>
            }
          />

          {/* PAGE 0: HOME PAGE (OVERVIEW WITH HERO, 4 EXCLUSIVE LETTERS) */}
          <Route
            path="/"
            element={
              <div className="space-y-10 sm:space-y-12">
                {/* 1. Hero Intro Banner */}
                <HeroIntro
                  onExploreClick={() => handleLetterSelect('completed')}
                  onPasswordHelpClick={() => handleLetterSelect('password')}
                />

                {/* 2. Main Two-Column Layout on Home Page */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column (8 cols): Letter Navigation Cards + Opened Letter Content */}
                  <div className="lg:col-span-8 space-y-8">
                    {/* 4 Letter Navigation Envelopes */}
                    <LetterNavCards
                      activeLetter={activeLetter}
                      onSelectLetter={handleLetterSelect}
                      completedCount={completedCount}
                      ongoingCount={ongoingCount}
                    />

                    {/* Drop-down Letter Content (Exclusive View): ONLY when an envelope is opened */}
                    {activeLetter !== null && (
                      <div
                        id="active-letter-content"
                        className="space-y-6 scroll-mt-20 animate-in fade-in slide-in-from-top-3 duration-300 ease-out"
                      >
                        {/* Active Envelope Top Bar Banner (Parchment letterhead styling) */}
                        <div className="relative overflow-hidden p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-pink-50/90 via-white to-rose-50/80 dark:from-stone-900 dark:via-stone-900/95 dark:to-stone-900 border-2 border-pink-200/90 dark:border-stone-700 shadow-sm backdrop-blur-xs">
                          {/* Decorative top corner stamp accent */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-pink-100/50 dark:from-pink-950/20 to-transparent pointer-events-none" />

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                            <div className="flex items-center gap-3">
                              <span className="p-3 rounded-2xl bg-white dark:bg-stone-800 text-pink-600 dark:text-pink-300 text-xl border-2 border-pink-200/90 dark:border-stone-700 shadow-xs ring-2 ring-pink-100 dark:ring-stone-800">
                                {(activeLetter === 'completed' || activeLetter === 'ongoing') &&
                                  (storyFilter === 'ongoing' ? '🍃' : '🌸')}
                                {activeLetter === 'password' && '🔑'}
                                {activeLetter === 'other' && '🎐'}
                              </span>
                              <div>
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                                  <span>Phong thư đang mở</span>
                                  <span className="text-stone-300 dark:text-stone-700">•</span>
                                  <span className="text-stone-500 dark:text-stone-400 normal-case font-normal text-xs">
                                    Nhấp lại phong thư hoặc nút đóng để gập lại
                                  </span>
                                </div>
                                <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-800 dark:text-stone-100 mt-0.5">
                                  {(activeLetter === 'completed' || activeLetter === 'ongoing') &&
                                    (storyFilter === 'all'
                                      ? 'Tất cả tác phẩm trong nhà Mel'
                                      : storyFilter === 'completed'
                                      ? 'Truyện đã hoàn thành (Kết thúc viên mãn HE)'
                                      : 'Truyện chưa hoàn thành (Đang tiến hành ra chương)')}
                                  {activeLetter === 'password' &&
                                    'Gợi ý Password & Thử nghiệm giải mật mã'}
                                  {activeLetter === 'other' &&
                                    'Một số mục khác: Hòm thư tâm sự, Playlist mùa hạ & Góc đọc'}
                                </h3>
                              </div>
                            </div>

                            {/* Header controls: Switch letter or close */}
                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById('letter-navigation-section');
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-stone-600 dark:text-stone-300 bg-white/90 dark:bg-stone-800/90 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                title="Cuộn lên danh sách các phong thư"
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-stone-500" />
                                <span>Chọn thư khác</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveLetter(null)}
                                className="group px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs"
                                title="Gập lại phong thư này"
                              >
                                <span>Gập lại</span>
                                <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* SUB-SECTION 1: STORIES CATALOGUE (COMPLETED, ONGOING & ALL WITH QUICK FILTER SWITCH) */}
                        {(activeLetter === 'completed' || activeLetter === 'ongoing') && (
                          <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Section Heading & Preserved Quick Filters */}
                            <div
                              id="stories-catalogue-heading"
                              className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-stone-900 border border-pink-100/80 dark:border-stone-800 shadow-2xs space-y-4"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                                    {storyFilter === 'completed' ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-pink-500" />
                                    ) : storyFilter === 'ongoing' ? (
                                      <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                                    )}
                                    <span>
                                      {storyFilter === 'completed'
                                        ? 'Danh sách: Truyện đã hoàn thành'
                                        : storyFilter === 'ongoing'
                                        ? 'Danh sách: Truyện đang tiến hành'
                                        : 'Tất cả tác phẩm trong nhà Mel'}
                                    </span>
                                  </div>
                                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100 mt-1">
                                    {storyFilter === 'completed'
                                      ? 'Kho tàng truyện đã full (HE viên mãn)'
                                      : storyFilter === 'ongoing'
                                      ? 'Truyện đang tiến hành (Cập nhật đều đặn)'
                                      : 'Danh sách tác phẩm ngôn tình mùa hè'}
                                  </h2>
                                </div>

                                {/* Active tag / Count */}
                                <div className="flex items-center gap-2">
                                  {selectedGenreFilter !== 'all' && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                                      <span>#{selectedGenreFilter}</span>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedGenreFilter('all')}
                                        className="hover:text-emerald-950 dark:hover:text-emerald-100 font-bold ml-1 cursor-pointer"
                                        title="Bỏ lọc thể loại"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  )}
                                  <span className="text-xs text-stone-500 dark:text-stone-400 font-sans font-medium px-3 py-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
                                    {filteredStories.length} tác phẩm
                                  </span>
                                </div>
                              </div>

                              {/* Quick Switch Filter Buttons (NO SCROLL UP - IN-PLACE FILTERING) */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-stone-400 dark:text-stone-500 font-medium">
                                    Lọc nhanh:
                                  </span>

                                  {/* Button 1: Toàn bộ */}
                                  <button
                                    type="button"
                                    id="quick-filter-all-btn"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleQuickFilterSelect('all');
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                                      storyFilter === 'all'
                                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold shadow-xs'
                                        : 'bg-stone-100 hover:bg-pink-50 text-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                                    }`}
                                  >
                                    🌸 Toàn bộ ({totalStoriesCount})
                                  </button>

                                  {/* Button 2: Đã hoàn */}
                                  <button
                                    type="button"
                                    id="quick-filter-completed-btn"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleQuickFilterSelect('completed');
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                                      storyFilter === 'completed'
                                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold shadow-xs'
                                        : 'bg-stone-100 hover:bg-pink-50 text-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                                    }`}
                                  >
                                    💖 Đã hoàn ({completedCount})
                                  </button>

                                  {/* Button 3: Đang cập nhật */}
                                  <button
                                    type="button"
                                    id="quick-filter-ongoing-btn"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleQuickFilterSelect('ongoing');
                                    }}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                                      storyFilter === 'ongoing'
                                        ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-xs'
                                        : 'bg-stone-100 hover:bg-emerald-50 text-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                                    }`}
                                  >
                                    🍃 Đang cập nhật ({ongoingCount})
                                  </button>
                                </div>

                                {/* Reset genre if filtered */}
                                {selectedGenreFilter !== 'all' && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedGenreFilter('all')}
                                    className="text-xs text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                                  >
                                    Xem tất cả thể loại
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Stories Grid */}
                            {filteredStories.length === 0 ? (
                              <div className="p-12 text-center rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3">
                                <p className="font-serif text-lg text-stone-600 dark:text-stone-300">
                                  Không tìm thấy truyện nào thuộc mục này.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleQuickFilterSelect('all');
                                    setSelectedGenreFilter('all');
                                  }}
                                  className="px-4 py-2 rounded-xl bg-pink-500 text-white text-xs font-medium hover:bg-pink-600 transition-colors cursor-pointer"
                                >
                                  Xem toàn bộ tác phẩm
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredStories.map((story) => (
                                  <StoryCard
                                    key={story.id}
                                    story={story}
                                    onOpenStory={handleOpenStoryModal}
                                    onSelectChapter={handleOpenChapter}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* SUB-SECTION 2: PASSWORD ONLY */}
                        {activeLetter === 'password' && (
                          <div className="animate-in fade-in duration-300">
                            <HomePasswordSection
                              stories={stories}
                              onGoToPasswordPage={() => handleNavSelect('password')}
                              onOpenStory={handleOpenStoryModal}
                            />
                          </div>
                        )}

                        {/* SUB-SECTION 3: OTHER (TÂM SỰ & NHẠC HÈ) */}
                        {activeLetter === 'other' && (
                          <div className="animate-in fade-in duration-300">
                            <OtherSections />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column (4 cols): SIDEBAR PERMANENTLY ATTACHED TO HOME PAGE */}
                  <div className="lg:col-span-4 sticky top-24">
                    <Sidebar
                      stories={stories}
                      announcements={announcements}
                      recentUpdates={dynamicRecentUpdates}
                      onSelectStory={handleOpenStoryModal}
                      onSelectChapter={handleOpenChapter}
                      onFilterGenre={(g) => setSelectedGenreFilter(g)}
                    />
                  </div>
                </div>
              </div>
            }
          />

          {/* FALLBACK REDIRECT TO HOME */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* STORY DETAIL MODAL */}
      <StoryModal
        story={modalStory}
        isOpen={!!modalStory}
        onClose={() => setModalStoryId(null)}
        onSelectChapter={handleOpenChapter}
        onGoToPasswordGuide={() => {
          setModalStoryId(null);
          handleNavSelect('password');
        }}
      />

      {/* Global Search Modal (Ctrl+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        stories={stories}
        onSelectStory={(storyId) => {
          setIsSearchOpen(false);
          handleOpenStoryModal(storyId);
        }}
        onSelectChapter={handleOpenChapter}
      />

      {/* Author Publishing & Stats Reset Modal */}
      <AuthorPublishModal
        isOpen={isAuthorModalOpen}
        onClose={() => setIsAuthorModalOpen(false)}
        stories={stories}
        announcements={announcements}
        initialTab={authorModalInitialTab}
        onOpenStoryChapter={handleNavigateToStory}
      />

      {/* Global Authentication Modal (Login / Register / Fast Author & Reader Access) */}
      <AuthModal />

      {/* User Profile Edit Modal (Change Avatar, Pen Name, Bio, Favorite Genre) */}
      <ProfileEditModal />

      {/* Global Background Music Player Widget */}
      <BackgroundMusicBar onOpenAuthorStudio={() => handleOpenAuthorModal('music')} />

      {/* Footer */}
      <Footer onSelectTab={handleNavSelect} />
    </div>
  );
}
