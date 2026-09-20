import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Story, Chapter } from '../types';
import { getStoryChapters, isStoryDeleted } from '../data/mockData';
import { subscribeToStoryChapters, recordStoryView, getStoredStories } from '../lib/realtimeService';
import { safeApiFetch } from '../lib/apiConfig';
import { StoryDetailView } from './StoryDetailView';
import { ReaderView } from './ReaderView';
import { ArrowLeft, BookOpen, AlertCircle, Home, RefreshCw } from 'lucide-react';

interface StoryDetailPageProps {
  stories: Story[];
}

const toSlug = (str: string = ''): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const findStoryMatch = (list: Story[], queryId?: string): Story | null => {
  if (!queryId || !list || list.length === 0) return null;
  const decoded = decodeURIComponent(queryId).trim();
  if (isStoryDeleted(decoded) || isStoryDeleted(queryId)) return null;
  const slugTarget = toSlug(decoded);

  // 1. Direct ID match
  const exact = list.find((s) => !isStoryDeleted(s.id) && (s.id === decoded || s.id === queryId));
  if (exact) return exact;

  // 2. Special aliases
  if (decoded === 'anh-dao-5cm' || slugTarget === 'anh-dao-5cm') {
    const alias = list.find((s) => !isStoryDeleted(s.id) && (s.id === 'anh-dao-nam-centimet' || s.id === 'anh-dao-5cm'));
    if (alias) return alias;
  }
  if (decoded === 'anh-dao-nam-centimet' || slugTarget === 'anh-dao-nam-centimet') {
    const alias = list.find((s) => !isStoryDeleted(s.id) && (s.id === 'anh-dao-5cm' || s.id === 'anh-dao-nam-centimet'));
    if (alias) return alias;
  }

  // 3. Match slug of story ID, Vietnamese title, or original title
  return (
    list.find((s) => {
      if (isStoryDeleted(s.id)) return false;
      return (
        toSlug(s.id) === slugTarget ||
        toSlug(s.title) === slugTarget ||
        toSlug(s.originalTitle) === slugTarget
      );
    }) || null
  );
};

export const StoryDetailPage: React.FC<StoryDetailPageProps> = ({ stories }) => {
  const { id, chapterNumber } = useParams<{ id: string; chapterNumber?: string }>();
  const navigate = useNavigate();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id, chapterNumber]);

  // Local state for resolved story (handles asynchronous link opening & direct server loads)
  const [resolvedStory, setResolvedStory] = useState<Story | null>(() => {
    if (!id || isStoryDeleted(id)) return null;
    const found = findStoryMatch(stories, id);
    if (found) return found;

    // Check stored stories in localStorage
    const local = getStoredStories();
    return findStoryMatch(local, id);
  });

  const [isLoadingStory, setIsLoadingStory] = useState<boolean>(() => {
    if (!id || isStoryDeleted(id)) return false;
    return !resolvedStory;
  });
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState<boolean>(() => {
    return Boolean(!id || isStoryDeleted(id));
  });

  // Sync when parent stories prop changes or story is found
  useEffect(() => {
    if (!id) return;
    if (isStoryDeleted(id)) {
      setResolvedStory(null);
      setIsLoadingStory(false);
      setHasAttemptedFetch(true);
      return;
    }
    const found = findStoryMatch(stories, id);
    if (found) {
      setResolvedStory(found);
      setIsLoadingStory(false);
    }
  }, [stories, id]);

  // Asynchronously fetch story from server API if not found locally
  useEffect(() => {
    if (!id || isStoryDeleted(id) || resolvedStory) return;

    let isMounted = true;
    setIsLoadingStory(true);

    const fetchDirectStory = async () => {
      try {
        const encodedId = encodeURIComponent(id.trim());
        const res = await safeApiFetch(`/api/stories/${encodedId}`);
        if (res && res.ok) {
          const data = await res.json();
          if (isMounted && data?.story && !isStoryDeleted(data.story.id)) {
            setResolvedStory(data.story);
            if (Array.isArray(data.chapters) && data.chapters.length > 0) {
              setChapters(data.chapters);
            }
            setIsLoadingStory(false);
            setHasAttemptedFetch(true);
            return;
          }
        }
      } catch {
        // Fallback to full sync
      }

      // Fallback: check /api/stories full list
      try {
        const resAll = await safeApiFetch('/api/stories');
        if (resAll && resAll.ok) {
          const allStories: Story[] = await resAll.json();
          if (Array.isArray(allStories)) {
            const found = findStoryMatch(allStories, id);
            if (isMounted && found && !isStoryDeleted(found.id)) {
              setResolvedStory(found);
              setIsLoadingStory(false);
              setHasAttemptedFetch(true);
              return;
            }
          }
        }
      } catch {}

      if (isMounted) {
        setIsLoadingStory(false);
        setHasAttemptedFetch(true);
      }
    };

    // Wait 150ms for initial prop sync before remote fetch
    const timer = setTimeout(fetchDirectStory, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [id, resolvedStory]);

  // Record view once when story is loaded
  useEffect(() => {
    if (resolvedStory && !isStoryDeleted(resolvedStory.id)) {
      recordStoryView(resolvedStory.id);
    }
  }, [resolvedStory?.id]);

  // Realtime chapters state with fallback from mockData
  const [chapters, setChapters] = useState<Chapter[]>(() => {
    if (!resolvedStory || isStoryDeleted(resolvedStory.id)) return [];
    return getStoryChapters(resolvedStory.id);
  });

  const [isLoadingChapters, setIsLoadingChapters] = useState<boolean>(false);

  useEffect(() => {
    if (!resolvedStory || isStoryDeleted(resolvedStory.id)) {
      setChapters([]);
      return;
    }
    const initial = getStoryChapters(resolvedStory.id);
    if (initial.length > 0) {
      setChapters(initial);
    } else {
      setIsLoadingChapters(true);
    }

    // Subscribe to live chapters from server & cloud
    const unsubscribe = subscribeToStoryChapters(resolvedStory.id, (liveChapters) => {
      if (isStoryDeleted(resolvedStory.id)) {
        setChapters([]);
        return;
      }
      if (liveChapters && liveChapters.length > 0) {
        setChapters(liveChapters);
        setIsLoadingChapters(false);
      }
    });

    // Also fetch directly from server API using safeApiFetch
    safeApiFetch(`/api/chapters?storyId=${encodeURIComponent(resolvedStory.id)}`)
      .then((res) => (res && res.ok ? res.json() : null))
      .then((serverChapters) => {
        if (!isStoryDeleted(resolvedStory.id) && Array.isArray(serverChapters) && serverChapters.length > 0) {
          setChapters(serverChapters);
          setIsLoadingChapters(false);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingChapters(false);
      });

    return () => {
      unsubscribe();
    };
  }, [resolvedStory?.id]);

  // 1. Loading state
  if (isLoadingStory) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-12 h-12 mx-auto border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <div className="space-y-1">
          <p className="font-serif text-lg font-medium text-stone-700 dark:text-stone-200">
            Đang mở tác phẩm... 🌸
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Đang kiểm tra và đồng bộ dữ liệu truyện từ hệ thống...
          </p>
        </div>
      </div>
    );
  }

  // 2. Story Not Found state (only shown after verification has completed)
  if (!resolvedStory && (hasAttemptedFetch || (id && isStoryDeleted(id)))) {
    const wasDeleted = Boolean(id && isStoryDeleted(id));
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-100 dark:bg-stone-800 text-pink-600 dark:text-pink-400 flex items-center justify-center shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-800 dark:text-stone-100">
            {wasDeleted ? 'Tác phẩm đã ngừng xuất bản hoặc đã gỡ bỏ' : 'Không tìm thấy bài viết hoặc truyện'}
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-sans">
            {wasDeleted
              ? 'Tác phẩm này đã được gỡ bỏ khỏi hệ thống tủ sách và không còn dữ liệu khả dụng.'
              : 'Đường link bạn mở có thể chưa đúng hoặc tác phẩm đã được điều chỉnh mã định danh (slug).'}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition-colors shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-sm font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử tải lại</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
        </div>
      </div>
    );
  }

  // Fallback while still verifying
  if (!resolvedStory) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-10 h-10 mx-auto border-3 border-pink-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-serif text-sm text-stone-500">Đang chuẩn bị trang đọc...</p>
      </div>
    );
  }

  // Robust chapter finder avoiding erratic fallback to chapter 1
  const resolveChapter = (list: Chapter[], targetKey?: string): Chapter | null => {
    if (!targetKey || !list || list.length === 0) return null;
    const cleanKey = String(targetKey).trim();
    const num = Number(cleanKey);

    // 1. Match by numeric chapterNumber
    if (!isNaN(num)) {
      const byNum = list.find((c) => c.chapterNumber === num);
      if (byNum) return byNum;
    }

    // 2. Match by exact chapter id
    const byId = list.find((c) => c.id === cleanKey);
    if (byId) return byId;

    // 3. Match by ID suffix or slug (e.g. "-c15" or "-15")
    const bySuffix = list.find(
      (c) => c.id.endsWith(`-${cleanKey}`) || c.id.endsWith(cleanKey) || c.id.includes(`-c${cleanKey}`)
    );
    if (bySuffix) return bySuffix;

    // 4. Match extra chapter (e.g. "extra-1" or if cleanKey has digits)
    const digitsOnly = cleanKey.replace(/\D/g, '');
    if (digitsOnly) {
      const extraNum = Number(digitsOnly);
      const byExtra = list.find(
        (c) => (c.isExtra || c.partType === 'extra') && (c.extraNumber === extraNum || c.chapterNumber === extraNum)
      );
      if (byExtra) return byExtra;
    }

    return null;
  };

  // 3. Reading a specific chapter route: /bai-viet/:id/chuong/:chapterNumber
  if (chapterNumber !== undefined) {
    const matchedChapter = resolveChapter(chapters, chapterNumber);

    if (!matchedChapter) {
      if (isLoadingChapters || chapters.length === 0) {
        return (
          <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
            <div className="w-10 h-10 mx-auto border-3 border-pink-400 border-t-transparent rounded-full animate-spin" />
            <p className="font-serif text-sm text-stone-600 dark:text-stone-300">Đang tải chương truyện...</p>
          </div>
        );
      }

      return (
        <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
          <p className="text-stone-600 dark:text-stone-300 font-serif">
            Chưa tìm thấy chương <strong>{chapterNumber}</strong> của truyện <strong>{resolvedStory.title}</strong>.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to={`/bai-viet/${resolvedStory.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500 text-white text-sm font-medium"
            >
              <BookOpen className="w-4 h-4" />
              <span>Về mục lục truyện</span>
            </Link>
            {chapters.length > 0 && (
              <button
                type="button"
                onClick={() => navigate(`/bai-viet/${resolvedStory.id}/chuong/${chapters[0].chapterNumber}`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-sm font-medium cursor-pointer"
              >
                <span>Đọc từ chương 1</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <ReaderView
        story={resolvedStory}
        chapter={matchedChapter}
        allChapters={chapters}
        onBack={() => navigate(`/bai-viet/${resolvedStory.id}`)}
        onSelectChapter={(num) => navigate(`/bai-viet/${resolvedStory.id}/chuong/${num}`)}
        onGoToPasswordGuide={() => navigate('/pass')}
        onOpenStoryDetail={() => navigate(`/bai-viet/${resolvedStory.id}`)}
      />
    );
  }

  // 4. Story Detail View: /bai-viet/:id
  return (
    <StoryDetailView
      story={resolvedStory}
      chapters={chapters}
      onBack={() => {
        if (window.history.length > 2) {
          navigate(-1);
        } else {
          navigate('/');
        }
      }}
      onSelectChapter={(num) => navigate(`/bai-viet/${resolvedStory.id}/chuong/${num}`)}
      onGoToPasswordGuide={() => navigate('/pass')}
    />
  );
};
