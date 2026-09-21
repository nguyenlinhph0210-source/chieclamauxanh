import React, { useState, useEffect } from 'react';
import { Story, Chapter, Announcement, ReaderLetter } from '../types';
import {
  X,
  Sparkles,
  BookOpen,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Upload,
  FileText,
  Bell,
  Trash2,
  Lock,
  Key,
  Layers,
  Check,
  Mail,
  MessageSquare,
  Send,
  Reply,
  ShieldCheck,
  LogOut,
  LogIn,
  Music,
  Edit2,
  FileEdit,
  Eye,
  Heart,
  ChevronDown,
  Tag,
  Users,
  RefreshCw,
  Search,
  Plus,
  Database,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  publishStory,
  deleteStory,
  publishChapter,
  subscribeToReaderLetters,
  replyToReaderLetter,
  deleteReaderLetter,
  resetAllMetricsToZero,
} from '../lib/realtimeService';
import { RichTextEditor } from './common/RichTextEditor';
import { RichTextRenderer } from './common/RichTextRenderer';
import { getGithubConfig, saveGithubConfig, type GithubConfig } from '../lib/githubSyncService';
import { useAuth } from '../lib/authContext';
import { AuthorMusicTab } from './author/AuthorMusicTab';
import { AuthorEditStoryTab } from './author/AuthorEditStoryTab';
import { AuthorEditChapterTab } from './author/AuthorEditChapterTab';
import { AuthorAnnouncementsTab } from './author/AuthorAnnouncementsTab';
import { AuthorGenresTab } from './author/AuthorGenresTab';
import { AuthorCollaboratorsTab } from './author/AuthorCollaboratorsTab';
import { AuthorSyncTab } from './author/AuthorSyncTab';
import { AuthorCommentsTab } from './author/AuthorCommentsTab';
import { getCustomGenres, subscribeToCustomGenres, getStoryGenres, addCustomGenre } from '../utils/genreManager';
import { isoToDateTimeLocal, dateTimeLocalToIso } from '../utils/dateUtils';

interface AuthorPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
  announcements: Announcement[];
  onStoriesUpdated?: () => void;
  initialTab?: string;
  onOpenStoryChapter?: (storyId: string, chapterNumber?: number) => void;
}

const PRESET_COVERS = [
  { name: 'Hoa anh đào & Nắng', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=800&auto=format&fit=crop' },
  { name: 'Khu rừng mùa hè', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop' },
  { name: 'Góc phố bình yên', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop' },
  { name: 'Bầu trời hoàng hôn', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop' },
  { name: 'Ánh trăng huyền ảo', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=800&auto=format&fit=crop' },
];

const AVAILABLE_GENRES = [
  'Ngôn tình',
  'Ngọt sủng',
  'Thanh xuân vườn trường',
  'Hiện đại',
  'Chữa lành',
  '1v1',
  'HE (Happy Ending)',
  'Cưới trước yêu sau',
  'Đô thị tình duyên',
  'Gương vỡ lại lành',
  'Hài hước',
  'Trọng sinh',
];

export const AuthorPublishModal: React.FC<AuthorPublishModalProps> = ({
  isOpen,
  onClose,
  stories,
  announcements,
  onStoriesUpdated,
  initialTab,
  onOpenStoryChapter,
}) => {
  const { user, isAuthor, openAuthModal, logout } = useAuth();
  
  type TabType =
    | 'newStory'
    | 'editStory'
    | 'newChapter'
    | 'editChapter'
    | 'genres'
    | 'announcements'
    | 'music'
    | 'letters'
    | 'comments'
    | 'collaborators'
    | 'manage'
    | 'sync';

  const [activeTab, setActiveTab] = useState<TabType>(
    (initialTab as TabType) || 'newStory'
  );

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab as TabType);
    }
  }, [initialTab, isOpen]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // GitHub AutoSync State
  const [ghConfig, setGhConfig] = useState<GithubConfig>(() => getGithubConfig());

  useEffect(() => {
    if (isOpen) {
      setGhConfig(getGithubConfig());
    }
  }, [isOpen, activeTab]);

  // Dynamic Genres
  const [availableGenres, setAvailableGenres] = useState<string[]>(() => getCustomGenres());

  useEffect(() => {
    const unsub = subscribeToCustomGenres((genres) => {
      setAvailableGenres(genres);
    });
    return unsub;
  }, []);

  // Jump helper states
  const [selectedStoryForEdit, setSelectedStoryForEdit] = useState<string>('');
  const [selectedStoryForChapterEdit, setSelectedStoryForChapterEdit] = useState<string>('');

  // Reader Letters state in Studio
  const [letters, setLetters] = useState<ReaderLetter[]>([]);
  const [letterFilter, setLetterFilter] = useState<'all' | 'unanswered' | 'private' | 'public'>('all');
  const [replyingLetterId, setReplyingLetterId] = useState<string | null>(null);
  const [authorReplyInput, setAuthorReplyInput] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<string | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !isAuthor) return;
    const unsubscribe = subscribeToReaderLetters((list) => {
      setLetters(list);
    });
    return unsubscribe;
  }, [isOpen, isAuthor]);

  // New Story Form State
  const [storyTitle, setStoryTitle] = useState('');
  const [storyOriginalTitle, setStoryOriginalTitle] = useState('');
  const [storyAuthor, setStoryAuthor] = useState('');
  const [storyTranslator, setStoryTranslator] = useState('Mellifluous');
  const [storyStatus, setStoryStatus] = useState<'completed' | 'ongoing'>('ongoing');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState('');
  const [newStoryGenreSearch, setNewStoryGenreSearch] = useState('');
  const [storySummary, setStorySummary] = useState('');
  const [storyCover, setStoryCover] = useState(PRESET_COVERS[0].url);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');
  const [passwordKey, setPasswordKey] = useState('');
  const [totalChapters, setTotalChapters] = useState(30);
  const [storyPublishDateInput, setStoryPublishDateInput] = useState(() => isoToDateTimeLocal(new Date().toISOString()));

  // New Chapter Form State
  const [targetStoryId, setTargetStoryId] = useState(stories[0]?.id || '');
  const [partType, setPartType] = useState<'main' | 'extra'>('main');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [translatorNote, setTranslatorNote] = useState('');
  const [isChapterLocked, setIsChapterLocked] = useState(false);
  const [chapterPasswordHint, setChapterPasswordHint] = useState('');
  const [chapterPasswordKey, setChapterPasswordKey] = useState('');
  const [chapterPublishDateInput, setChapterPublishDateInput] = useState(() => isoToDateTimeLocal(new Date().toISOString()));

  // Sync targetStoryId if stories list updates
  useEffect(() => {
    if (stories.length > 0 && !targetStoryId) {
      setTargetStoryId(stories[0].id);
    }
  }, [stories, targetStoryId]);

  if (!isOpen) return null;

  // Gatekeeper: Only authorized authors and collaborators can access Studio
  if (!isAuthor) {
    return (
      <div
        id="author-access-denied-modal"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 border border-pink-200 dark:border-stone-700 shadow-2xl space-y-6 text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-pink-100 dark:bg-pink-950 text-pink-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
              Khu vực dành riêng cho Tác giả
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              {user ? (
                <>
                  Tài khoản <strong className="text-pink-600 font-mono">{user.email}</strong> hiện không nằm trong danh sách Tác giả / Quản trị viên được cấp quyền truy cập Studio.
                </>
              ) : (
                <>
                  Bàn làm việc tác giả chỉ dành riêng cho Tác giả <strong>Mellifluous</strong> và các cộng sự được phân quyền. Vui lòng đăng nhập với tài khoản Google tác giả để tiếp tục.
                </>
              )}
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              id="login-author-google-btn"
              onClick={openAuthModal}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{user ? 'Đổi sang tài khoản tác giả khác' : 'Đăng nhập Google / Email Tác Giả'}</span>
            </button>

            <button
              type="button"
              id="close-unauthorized-modal-btn"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs sm:text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Trở lại trang web
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showFeedback = (
    typeOrObj: 'success' | 'error' | { type: 'success' | 'error'; text: string },
    textMaybe?: string
  ) => {
    if (typeof typeOrObj === 'object' && typeOrObj !== null) {
      setFeedbackMessage({ type: typeOrObj.type, text: typeOrObj.text });
    } else if (textMaybe) {
      setFeedbackMessage({ type: typeOrObj as 'success' | 'error', text: textMaybe });
    }
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // 1. Publish New Story
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyTitle.trim() || !storyAuthor.trim()) {
      showFeedback('error', 'Vui lòng nhập tên truyện và tên tác giả.');
      return;
    }

    setIsProcessing(true);
    try {
      const generatedId =
        storyTitle
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || `truyen-${Date.now()}`;

      const finalStoryPub = storyPublishDateInput
        ? dateTimeLocalToIso(storyPublishDateInput)
        : new Date().toISOString();

      const newStory: Story = {
        id: generatedId,
        title: storyTitle.trim(),
        originalTitle: storyOriginalTitle.trim(),
        author: storyAuthor.trim(),
        translator: storyTranslator.trim() || 'Mellifluous',
        status: storyStatus,
        genre: selectedGenres.length > 0 ? selectedGenres : ['Ngôn tình', 'Ngọt sủng'],
        summary: storySummary.trim() || 'Chưa có văn án.',
        totalChapters: Number(totalChapters) || 1,
        completedChapters: 0,
        mainChaptersCount: Number(totalChapters) || 1,
        extraChaptersCount: 0,
        coverImage: storyCover || PRESET_COVERS[0].url,
        colorTheme: 'from-pink-100 to-rose-200 dark:from-pink-950/40 dark:to-rose-900/40',
        hasPassword,
        passwordHint: hasPassword ? passwordHint.trim() : '',
        passwordKey: hasPassword ? passwordKey.trim().toLowerCase() : '',
        publishedAt: finalStoryPub,
        updatedAt: finalStoryPub,
        views: 0,
        likes: 0,
        featured: true,
      };

      const pubResult = await publishStory(newStory);
      if (pubResult?.github?.attempted) {
        if (pubResult.github.success) {
          showFeedback('success', `Đã xuất bản tác phẩm "${newStory.title}" và đẩy lên GitHub thành công!`);
        } else {
          showFeedback('error', `Đã lưu truyện thành công, nhưng đồng bộ GitHub gặp lỗi: ${pubResult.github.error}`);
        }
      } else {
        showFeedback('success', `Đã xuất bản tác phẩm "${newStory.title}" thành công! Lượt xem bắt đầu từ 0.`);
      }

      setStoryTitle('');
      setStoryOriginalTitle('');
      setStoryAuthor('');
      setStorySummary('');
      setHasPassword(false);
      setPasswordHint('');
      setPasswordKey('');

      if (onStoriesUpdated) onStoriesUpdated();
    } catch (err: any) {
      console.warn('Story publish error:', err);
      showFeedback('error', `Sự cố khi lưu truyện: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Publish New Chapter
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveStoryId = targetStoryId || (stories.length > 0 ? stories[0].id : '');
    const effectiveTitle = chapterTitle.trim() || (partType === 'extra' ? `Ngoại truyện ${chapterNumber}` : `Chương ${chapterNumber}`);
    if (!effectiveStoryId || !chapterContent.trim()) {
      showFeedback('error', 'Vui lòng chọn truyện và nhập nội dung chương.');
      return;
    }

    setIsProcessing(true);
    try {
      const chapterId = `${effectiveStoryId}-${partType === 'extra' ? 'extra' : 'c'}${chapterNumber}`;
      const finalChapterPub = chapterPublishDateInput
        ? dateTimeLocalToIso(chapterPublishDateInput)
        : new Date().toISOString();

      const newChapter: Chapter = {
        id: chapterId,
        storyId: effectiveStoryId,
        chapterNumber: Number(chapterNumber) || 1,
        title: effectiveTitle,
        publishedAt: finalChapterPub,
        updatedAt: finalChapterPub,
        isLocked: isChapterLocked,
        passwordHint: isChapterLocked ? chapterPasswordHint.trim() : '',
        passwordKey: isChapterLocked ? chapterPasswordKey.trim().toLowerCase() : '',
        content: chapterContent.trim(),
        translatorNote: translatorNote.trim(),
        wordCount: chapterContent.trim().split(/\s+/).length,
        isExtra: partType === 'extra',
        extraNumber: partType === 'extra' ? Number(chapterNumber) : 0,
        partType,
      };

      const pubResult = await publishChapter(newChapter);
      if (pubResult?.github?.attempted) {
        if (pubResult.github.success) {
          showFeedback('success', `Đã đăng thành công "${newChapter.title}" và đẩy lên GitHub!`);
        } else {
          showFeedback('error', `Đã lưu chương thành công, nhưng đồng bộ GitHub gặp lỗi: ${pubResult.github.error}`);
        }
      } else {
        showFeedback('success', `Đã đăng thành công "${newChapter.title}"!`);
      }

      setChapterTitle('');
      setChapterContent('');
      setTranslatorNote('');
      setChapterPasswordHint('');
      setChapterPasswordKey('');
      setIsChapterLocked(false);
      setChapterNumber((prev) => prev + 1);

      if (onStoriesUpdated) onStoriesUpdated();
    } catch (err: any) {
      console.warn('Chapter publish error:', err);
      showFeedback('error', `Sự cố khi đăng chương: ${err?.message || 'Vui lòng thử lại'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete Story handler
  const handleDeleteStory = async (storyId: string, storyTitleName: string) => {
    try {
      await deleteStory(storyId);
      showFeedback('success', `Đã xóa tác phẩm "${storyTitleName}".`);
      setStoryToDelete(null);
      if (onStoriesUpdated) onStoriesUpdated();
    } catch {
      showFeedback('error', 'Không thể xóa tác phẩm.');
    }
  };

  // Reader Letters Reply & Delete
  const handleSendReply = async (letterId: string) => {
    if (!authorReplyInput.trim()) {
      showFeedback('error', 'Vui lòng nhập nội dung phản hồi.');
      return;
    }

    setIsSendingReply(true);
    try {
      const authorName = user?.displayName || user?.nickname || 'Mellifluous (Tác giả)';
      await replyToReaderLetter(letterId, authorReplyInput.trim(), authorName);
      setLetters((prev) =>
        prev.map((l) =>
          l.id === letterId
            ? {
                ...l,
                replyFromMel: authorReplyInput.trim(),
                repliedAt: new Date().toISOString(),
                repliedBy: authorName,
              }
            : l
        )
      );
      showFeedback('success', 'Đã gửi phản hồi đến bạn đọc thành công!');
      setReplyingLetterId(null);
      setAuthorReplyInput('');
    } catch {
      showFeedback('error', 'Lỗi khi gửi phản hồi.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteLetter = async (letterId: string) => {
    try {
      await deleteReaderLetter(letterId);
      setLetters((prev) => prev.filter((l) => l.id !== letterId));
      showFeedback('success', 'Đã xóa thư thành công.');
      setLetterToDelete(null);
    } catch {
      showFeedback('error', 'Không thể xóa thư.');
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleRemoveGenre = (genre: string) => {
    setSelectedGenres((prev) => prev.filter((g) => g !== genre));
  };

  const handleClearAllGenres = () => {
    setSelectedGenres([]);
  };

  const handleAddCustomGenre = () => {
    const trimmed = customGenre.trim();
    if (!trimmed) return;
    addCustomGenre(trimmed);
    if (!selectedGenres.includes(trimmed)) {
      setSelectedGenres((prev) => [...prev, trimmed]);
    }
    setCustomGenre('');
  };

  const filteredLetters = letters.filter((l) => {
    const isAnswered = Boolean(l.replyFromMel || (l as any).authorReply);
    const isPrivate = l.type === 'private' || Boolean((l as any).isPrivate);
    if (letterFilter === 'unanswered') return !isAnswered;
    if (letterFilter === 'private') return isPrivate;
    if (letterFilter === 'public') return !isPrivate;
    return true;
  });

  return (
    <div
      id="author-publishing-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[92vh] flex flex-col bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-pink-200/90 dark:border-stone-700 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ========================================================= */}
        {/* 1. STICKY MODAL TOP HEADER                                */}
        {/* ========================================================= */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-pink-50 via-white to-amber-50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-850 border-b border-pink-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-sm sm:text-base font-bold text-stone-800 dark:text-stone-100 truncate">
                  Bàn làm việc tác giả & Quản trị Website
                </h2>
                <span className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 font-medium items-center gap-1 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user?.displayName || 'Tác giả'}</span>
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                Tài khoản: <strong className="font-mono text-pink-600 dark:text-pink-400">{user?.email}</strong> • Toàn quyền xuất bản & biên tập
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={logout}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
            <button
              type="button"
              id="close-author-modal-btn"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-stone-100 hover:bg-pink-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-pink-600 transition-colors cursor-pointer"
              title="Đóng bàn làm việc"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div
            className={`shrink-0 px-4 sm:px-6 py-2.5 text-xs font-medium flex items-center gap-2 border-b ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. ADMIN NAVIGATION SYSTEM (NEVER HIDDEN / ALWAYS VISIBLE) */}
        {/* ========================================================= */}
        <div className="shrink-0 bg-stone-50/90 dark:bg-stone-850/90 border-b border-pink-200/80 dark:border-stone-800">
          
          {/* Quick Select Dropdown for Small / Zoomed-in screens */}
          <div className="lg:hidden px-3 py-2 bg-pink-100/60 dark:bg-stone-800 border-b border-pink-200 dark:border-stone-700 flex items-center gap-2">
            <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase shrink-0">
              Mục quản trị:
            </span>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabType)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-pink-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-xs font-semibold text-pink-700 dark:text-pink-300 focus:outline-hidden"
            >
              <option value="newStory">📝 1. Đăng truyện mới</option>
              <option value="editStory">✍️ 2. Chỉnh sửa truyện ({stories.length})</option>
              <option value="newChapter">📄 3. Đăng chương mới</option>
              <option value="editChapter">✏️ 4. Chỉnh sửa chương truyện</option>
              <option value="genres">🏷️ 5. Quản lý Thể loại & Chuyên mục</option>
              <option value="announcements">📢 6. Bảng tin & Thông báo ({announcements.length})</option>
              <option value="music">🎵 7. Quản lý Playlist Nhạc</option>
              <option value="letters">💌 8. Hòm thư bạn đọc ({letters.length})</option>
              <option value="collaborators">👥 9. Phân quyền Gmail & Cộng sự</option>
              <option value="manage">📚 10. Quản lý tổng quan ({stories.length})</option>
            </select>
          </div>

          {/* Full High-Contrast Navigation Pill Bar */}
          <div className="flex px-3 sm:px-6 py-2 gap-1.5 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('newStory')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'newStory'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Đăng truyện mới</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('editStory')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'editStory'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa truyện</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('newChapter')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'newChapter'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Đăng chương mới</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('editChapter')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'editChapter'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Chỉnh sửa chương truyện</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('genres')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'genres'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Thể loại & Chuyên mục</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'announcements'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Bảng tin & Thông báo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('music')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'music'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Playlist Nhạc</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('letters')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'letters'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Hòm thư ({letters.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'comments'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Bình luận</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('collaborators')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'collaborators'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cộng sự & Quản trị</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'manage'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Quản lý chung ({stories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sync')}
              className={`shrink-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'sync'
                  ? 'bg-pink-500 text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-200 hover:bg-pink-100/60 dark:hover:bg-stone-800 hover:text-pink-700 dark:hover:text-pink-300'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
              <span>Lưu trữ & Đồng bộ</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. MODAL BODY (SCROLLABLE CONTAINER)                      */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar min-h-0">
          
          {/* Live GitHub Auto-Sync Status Bar for Authors */}
          {(activeTab === 'newStory' || activeTab === 'editStory' || activeTab === 'newChapter' || activeTab === 'editChapter' || activeTab === 'manage') && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ghConfig.token ? (ghConfig.autoSync ? 'bg-emerald-500 animate-pulse ring-2 ring-emerald-300' : 'bg-amber-500 ring-2 ring-amber-300') : 'bg-stone-400'}`} />
                <span className="font-medium text-stone-700 dark:text-stone-300">
                  {ghConfig.token ? (
                    <>
                      Tự động commit GitHub:{' '}
                      <strong className={ghConfig.autoSync ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                        {ghConfig.autoSync ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                      </strong>
                      <span className="opacity-75 font-mono ml-1 hidden sm:inline">({ghConfig.repo})</span>
                    </>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-300 font-medium">
                      ⚠️ Chưa cấu hình GitHub Token (truyện & chương sẽ chỉ lưu máy cục bộ, chưa thể tự động commit lên GitHub)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {ghConfig.token && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = saveGithubConfig({ autoSync: !ghConfig.autoSync });
                      setGhConfig(updated);
                      showFeedback('success', `Đã ${updated.autoSync ? 'BẬT' : 'TẮT'} tự động commit lên GitHub khi xuất bản!`);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer text-[11px] ${
                      ghConfig.autoSync
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                        : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                    }`}
                  >
                    {ghConfig.autoSync ? '✓ Tự động commit: BẬT' : '✕ Tự động commit: TẮT'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('sync')}
                  className="px-2.5 py-1 rounded-lg bg-pink-100/70 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-bold hover:bg-pink-200 transition-colors cursor-pointer text-[11px]"
                >
                  {ghConfig.token ? '⚙️ Cài đặt đồng bộ' : '🔑 Nhập Token GitHub ngay'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: ĐĂNG TRUYỆN MỚI */}
          {activeTab === 'newStory' && (
            <form onSubmit={handleCreateStory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                    Tên truyện tiếng Việt <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Mùa Hè Năm Ấy Gió Thổi Ngang Qua"
                    value={storyTitle}
                    onChange={(e) => setStoryTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                    Tên gốc tiếng Trung / Hàn (nếu có)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 那年夏天的风吹过"
                    value={storyOriginalTitle}
                    onChange={(e) => setStoryOriginalTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                    Tác giả gốc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Lam Hải Nhược Tuyết"
                    value={storyAuthor}
                    onChange={(e) => setStoryAuthor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                    Dịch giả / Editor
                  </label>
                  <input
                    type="text"
                    value={storyTranslator}
                    onChange={(e) => setStoryTranslator(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                    Tình trạng tiến độ
                  </label>
                  <select
                    value={storyStatus}
                    onChange={(e) => setStoryStatus(e.target.value as 'completed' | 'ongoing')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                  >
                    <option value="ongoing">Đang tiến hành (Ongoing)</option>
                    <option value="completed">Đã hoàn thành (Completed)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                    Tổng số chương dự kiến
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={totalChapters}
                    onChange={(e) => setTotalChapters(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Genres Selection & Management */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-pink-50/70 via-rose-50/50 to-pink-50/70 dark:from-stone-850 dark:to-stone-800 border border-pink-200/90 dark:border-stone-700 space-y-3.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-pink-100 dark:border-stone-700/80 pb-2.5">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-stone-800 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-pink-500" />
                      <span>Chuyên mục / Thể loại / Thẻ nhãn tác phẩm</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Chọn thẻ chính xác phản ánh nội dung để độc giả dễ tìm kiếm và lọc truyện.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/80 dark:text-pink-300">
                      Đã chọn: {selectedGenres.length} thể loại
                    </span>
                    {selectedGenres.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllGenres}
                        className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Xóa tất cả thẻ
                      </button>
                    )}
                  </div>
                </div>

                {/* ACTIVE SELECTED TAGS (Removable Chips) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                    Thẻ đang gán cho truyện:
                  </label>
                  {selectedGenres.length === 0 ? (
                    <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-dashed border-stone-300 dark:border-stone-700 text-center">
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Chưa chọn thẻ nào. Vui lòng chọn bên dưới hoặc thêm thẻ tùy chỉnh mới.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-pink-50/50 dark:bg-stone-900 border border-pink-100 dark:border-stone-800">
                      {selectedGenres.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-500 hover:bg-pink-600 text-white shadow-2xs transition-all group"
                        >
                          <span>{g}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGenre(g)}
                            className="p-0.5 rounded-full hover:bg-pink-700/60 text-pink-100 hover:text-white transition-colors cursor-pointer"
                            title={`Bỏ thẻ ${g}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* TAG CLOUD & QUICK SEARCH */}
                <div className="space-y-2 pt-1">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                      Danh sách thẻ gợi ý (Nhấp để bật/tắt):
                    </label>

                    {/* Tag search input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Lọc nhanh thẻ..."
                        value={newStoryGenreSearch}
                        onChange={(e) => setNewStoryGenreSearch(e.target.value)}
                        className="pl-8 pr-3 py-1 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 w-full sm:w-48 focus:outline-hidden focus:ring-1 focus:ring-pink-300"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 custom-scrollbar">
                    {getStoryGenres(availableGenres)
                      .filter((genre) =>
                        !newStoryGenreSearch.trim() ||
                        genre.toLowerCase().includes(newStoryGenreSearch.toLowerCase())
                      )
                      .map((genre) => {
                        const isSelected = selectedGenres.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => toggleGenre(genre)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-pink-500 text-white shadow-xs font-semibold scale-102'
                                : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-pink-50 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 hover:border-pink-300'
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3 shrink-0" /> : <Tag className="w-2.5 h-2.5 text-stone-400 shrink-0" />}
                            <span>{genre}</span>
                          </button>
                        );
                      })}
                  </div>

                  {/* Custom Tag Input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Nhập tên thể loại / chuyên mục mới..."
                      value={customGenre}
                      onChange={(e) => setCustomGenre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomGenre();
                        }
                      }}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomGenre}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-stone-200 dark:border-stone-700 transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-pink-500" />
                      <span>Thêm thẻ mới</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                  Ảnh bìa truyện (URL hoặc chọn mẫu có sẵn)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Dán link ảnh bìa trực tiếp..."
                    value={storyCover}
                    onChange={(e) => setStoryCover(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono"
                  />
                  {storyCover && (
                    <img
                      src={storyCover}
                      alt="Preview"
                      className="w-10 h-10 object-cover rounded-lg border border-pink-200 shrink-0"
                    />
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_COVERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setStoryCover(preset.url)}
                      className={`text-[11px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                        storyCover === preset.url
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-300 font-bold'
                          : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-pink-300 dark:hover:border-stone-500'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary with RichTextEditor */}
              <div className="pt-1">
                <RichTextEditor
                  label="Văn án / Giới thiệu tác phẩm"
                  value={storySummary}
                  onChange={setStorySummary}
                  placeholder="Nội dung tóm tắt văn án truyện. Ô tự động mở rộng theo nội dung và hỗ trợ thanh công cụ định dạng..."
                  minHeight={170}
                  fontFamily="serif"
                />
              </div>

              {/* Password */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-stone-900 border border-amber-200/80 dark:border-stone-700 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPassword}
                    onChange={(e) => setHasPassword(e.target.checked)}
                    className="rounded-sm text-amber-500 focus:ring-amber-400"
                  />
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Kích hoạt khóa Password cho tác phẩm này</span>
                </label>

                {hasPassword && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                        Câu hỏi gợi ý mật khẩu
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Tên con mèo đầu tiên của nam chính"
                        value={passwordHint}
                        onChange={(e) => setPasswordHint(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                        Đáp án giải mã chính xác
                      </label>
                      <input
                        type="text"
                        placeholder="VD: hoaanhdao"
                        value={passwordKey}
                        onChange={(e) => setPasswordKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Set Publication Time */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-pink-500" />
                    <span>Thời gian đăng tác phẩm:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setStoryPublishDateInput(isoToDateTimeLocal(new Date().toISOString()))}
                    className="text-[11px] text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Đặt thành thời gian hiện tại</span>
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={storyPublishDateInput}
                  onChange={(e) => setStoryPublishDateInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-medium focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isProcessing ? 'Đang lưu...' : 'Xuất bản tác phẩm ngay'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CHỈNH SỬA TRUYỆN */}
          {activeTab === 'editStory' && (
            <AuthorEditStoryTab
              stories={stories}
              initialSelectedStoryId={selectedStoryForEdit}
              onFeedback={showFeedback}
              onStoriesUpdated={onStoriesUpdated}
              onJumpToChapters={(storyId) => {
                setSelectedStoryForChapterEdit(storyId);
                setActiveTab('editChapter');
              }}
            />
          )}

          {/* TAB 3: ĐĂNG CHƯƠNG MỚI */}
          {activeTab === 'newChapter' && (
            <form onSubmit={handleCreateChapter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                    Chọn bộ truyện <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetStoryId}
                    onChange={(e) => setTargetStoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-medium"
                  >
                    {stories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                    Phân loại chương
                  </label>
                  <select
                    value={partType}
                    onChange={(e) => setPartType(e.target.value as 'main' | 'extra')}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
                  >
                    <option value="main">Chính truyện</option>
                    <option value="extra">Phiên ngoại (Ngoại truyện)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                    Số thứ tự chương
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                  Tiêu đề chương <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chương 1: Cơn gió đầu mùa hè năm ấy"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                  Lời nhắn gửi của Mellifluous (Translator Note)
                </label>
                <input
                  type="text"
                  placeholder="VD: Chúc các nàng đọc truyện vui vẻ! Hãy để lại bình luận cho tớ biết cảm nhận nhé 🌸"
                  value={translatorNote}
                  onChange={(e) => setTranslatorNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                />
              </div>

              <div className="pt-1">
                <RichTextEditor
                  label="Nội dung chương truyện"
                  required
                  placeholder="Dán hoặc gõ toàn bộ nội dung chương truyện tại đây. Ô tự động mở rộng theo nội dung khi xuống dòng, tích hợp thanh công cụ căn dòng và in ấn định dạng..."
                  value={chapterContent}
                  onChange={setChapterContent}
                  minHeight={320}
                  fontFamily="serif"
                />
              </div>

              {/* Chapter Password Section */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-stone-900 border border-amber-200/80 dark:border-stone-700 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChapterLocked}
                    onChange={(e) => setIsChapterLocked(e.target.checked)}
                    className="rounded-sm text-amber-500 focus:ring-amber-400"
                  />
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Khóa mật khẩu chương này (Chỉ mở khi độc giả giải đúng pass)</span>
                </label>

                {isChapterLocked && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                        Câu hỏi gợi ý mật khẩu cho chương
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Chiếc khăn len nữ chính đan có màu gì?"
                        value={chapterPasswordHint}
                        onChange={(e) => setChapterPasswordHint(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                        Đáp án giải mã chính xác (viết liền/không dấu)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: maudo"
                        value={chapterPasswordKey}
                        onChange={(e) => setChapterPasswordKey(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Set Publication Time for Chapter */}
              <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-pink-500" />
                    <span>Thời gian đăng chương:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setChapterPublishDateInput(isoToDateTimeLocal(new Date().toISOString()))}
                    className="text-[11px] text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Đặt thành thời gian hiện tại</span>
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={chapterPublishDateInput}
                  onChange={(e) => setChapterPublishDateInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-medium focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-medium text-xs sm:text-sm shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isProcessing ? 'Đang lưu...' : 'Đăng chương truyện'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: CHỈNH SỬA CHƯƠNG TRUYỆN */}
          {activeTab === 'editChapter' && (
            <AuthorEditChapterTab
              stories={stories}
              initialStoryId={selectedStoryForChapterEdit || targetStoryId}
              onFeedback={showFeedback}
              onStoriesUpdated={onStoriesUpdated}
              onJumpToNewChapter={(storyId) => {
                setTargetStoryId(storyId);
                setActiveTab('newChapter');
              }}
            />
          )}

          {/* TAB 5: QUẢN LÝ THỂ LOẠI & CHUYÊN MỤC */}
          {activeTab === 'genres' && (
            <AuthorGenresTab onFeedback={showFeedback} />
          )}

          {/* TAB 5: BẢNG TIN & THÔNG BÁO (ĐĂNG & SỬA) */}
          {activeTab === 'announcements' && (
            <AuthorAnnouncementsTab
              announcements={announcements}
              onFeedback={showFeedback}
              onAnnouncementsUpdated={onStoriesUpdated}
            />
          )}

          {/* TAB 6: PLAYLIST NHẠC */}
          {activeTab === 'music' && <AuthorMusicTab onFeedback={showFeedback} />}

          {/* TAB 7: HÒM THƯ BẠN ĐỌC */}
          {activeTab === 'letters' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLetterFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      letterFilter === 'all'
                        ? 'bg-pink-500 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-pink-50 dark:hover:bg-stone-700 border border-transparent dark:border-stone-700'
                    }`}
                  >
                    Tất cả ({letters.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLetterFilter('unanswered')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      letterFilter === 'unanswered'
                        ? 'bg-pink-500 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-pink-50 dark:hover:bg-stone-700 border border-transparent dark:border-stone-700'
                    }`}
                  >
                    Chưa hồi đáp ({letters.filter((l) => !(l.replyFromMel || (l as any).authorReply)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLetterFilter('private')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      letterFilter === 'private'
                        ? 'bg-pink-500 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-pink-50 dark:hover:bg-stone-700 border border-transparent dark:border-stone-700'
                    }`}
                  >
                    Thư riêng tư ({letters.filter((l) => l.type === 'private' || Boolean((l as any).isPrivate)).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLetterFilter('public')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                      letterFilter === 'public'
                        ? 'bg-pink-500 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-pink-50 dark:hover:bg-stone-700 border border-transparent dark:border-stone-700'
                    }`}
                  >
                    Công khai ({letters.filter((l) => l.type !== 'private' && !(l as any).isPrivate).length})
                  </button>
                </div>
              </div>

              {filteredLetters.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-700 text-xs text-stone-500 dark:text-stone-400">
                  Không có bức thư nào trong mục này.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLetters.map((letter) => {
                    const isPrivate = letter.type === 'private' || Boolean((letter as any).isPrivate);
                    const senderName = letter.sender || (letter as any).senderName || 'Độc giả giấu tên';
                    const letterContent = letter.content || (letter as any).message || '';
                    const hasReply = Boolean(letter.replyFromMel || (letter as any).authorReply);
                    const replyContent = letter.replyFromMel || (letter as any).authorReply || '';

                    return (
                      <div
                        key={letter.id}
                        className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-stone-750 text-pink-700 dark:text-pink-300 flex items-center justify-center text-xs shrink-0 overflow-hidden shadow-2xs">
                              {letter.avatar && (letter.avatar.startsWith('http://') || letter.avatar.startsWith('https://') || letter.avatar.startsWith('data:')) ? (
                                <img
                                  src={letter.avatar}
                                  alt={senderName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="select-none text-base">{letter.avatar || '💌'}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                                  {senderName}
                                </span>
                                {letter.senderEmail && (
                                  <span className="text-[10px] text-stone-400 font-mono truncate max-w-[180px]">
                                    ({letter.senderEmail})
                                  </span>
                                )}
                                {letter.tag && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 font-medium">
                                    {letter.tag}
                                  </span>
                                )}
                                {isPrivate ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-0.5 font-medium">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Thư riêng</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center gap-0.5 font-medium">
                                    <span>Công khai</span>
                                  </span>
                                )}
                                {letter.secretLookupCode && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-semibold">
                                    Mã: {letter.secretLookupCode}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                                {letter.createdAt ? new Date(letter.createdAt).toLocaleString('vi-VN') : (letter.time || '')}
                              </p>
                            </div>
                          </div>

                          {letterToDelete === letter.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDeleteLetter(letter.id)}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-rose-500 text-white cursor-pointer"
                              >
                                Xóa
                              </button>
                              <button
                                type="button"
                                onClick={() => setLetterToDelete(null)}
                                className="px-1.5 py-1 rounded text-[10px] text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setLetterToDelete(letter.id)}
                              className="p-1 text-stone-400 hover:text-rose-500 cursor-pointer shrink-0"
                              title="Xóa thư này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Letter Content */}
                        <div className="text-xs sm:text-sm text-stone-800 dark:text-stone-100 leading-relaxed font-serif bg-stone-50/80 dark:bg-stone-800/80 p-3.5 rounded-xl border border-stone-200/60 dark:border-stone-700 whitespace-pre-wrap">
                          <RichTextRenderer content={letterContent} indentParagraphs={false} />
                        </div>

                        {/* Reply Section */}
                        {hasReply ? (
                          <div className="p-3.5 rounded-xl bg-pink-50/80 dark:bg-stone-900 border border-pink-200/80 dark:border-pink-900/60 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-pink-700 dark:text-pink-300 flex items-center gap-1">
                                <Reply className="w-3 h-3" />
                                <span>{letter.repliedBy || 'Mellifluous'} đã hồi đáp:</span>
                              </span>
                              {letter.repliedAt && (
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {new Date(letter.repliedAt).toLocaleString('vi-VN')}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-stone-800 dark:text-stone-100 leading-relaxed font-serif">
                              <RichTextRenderer content={replyContent} indentParagraphs={false} />
                            </div>
                            {replyingLetterId !== letter.id && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyingLetterId(letter.id);
                                    setAuthorReplyInput(replyContent);
                                  }}
                                  className="text-[11px] text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Reply className="w-3 h-3" />
                                  <span>Chỉnh sửa hồi đáp</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : null}

                        {replyingLetterId === letter.id ? (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                                {hasReply ? 'Chỉnh sửa phản hồi gửi đến độc giả:' : 'Viết phản hồi gửi đến độc giả:'}
                              </span>
                            </div>
                            <RichTextEditor
                              placeholder="Nhập lời nhắn gửi của bạn tới độc giả..."
                              value={authorReplyInput}
                              onChange={setAuthorReplyInput}
                              minHeight={110}
                              fontFamily="serif"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleSendReply(letter.id)}
                                disabled={isSendingReply}
                                className="px-3.5 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Send className="w-3 h-3" />
                                <span>{isSendingReply ? 'Đang gửi...' : hasReply ? 'Cập nhật hồi đáp' : 'Gửi hồi đáp'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingLetterId(null);
                                  setAuthorReplyInput('');
                                }}
                                className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 text-xs hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : !hasReply ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingLetterId(letter.id);
                              setAuthorReplyInput('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-pink-100 hover:bg-pink-200 dark:bg-pink-950/70 dark:hover:bg-pink-900 text-pink-700 dark:text-pink-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Reply className="w-3 h-3" />
                            <span>Viết hồi đáp độc giả</span>
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: QUẢN LÝ CỘNG SỰ & PHÂN QUYỀN GMAIL */}
          {activeTab === 'collaborators' && (
            <AuthorCollaboratorsTab
              onFeedback={(type, text) => showFeedback(type, text)}
            />
          )}

          {/* TAB 10: QUẢN LÝ TỔNG QUAN */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Metric Reset to 0 (Official site launch feature) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h4 className="font-serif text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Khởi tạo số liệu thực tế website chính thức</span>
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                    Đặt lại Lượt ghé thăm, Lượt yêu thích và Lượt bình luận về số 0 thực tế bắt đầu từ khi xuất bản chính thức.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Bạn có chắc chắn muốn đặt lại Lượt ghé thăm, Yêu thích và Bình luận về 0 thực tế cho website chính thức?')) {
                      await resetAllMetricsToZero();
                      showFeedback('success', 'Đã đặt lại toàn bộ số liệu thống kê website về 0 thực tế!');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Đặt lại số liệu về 0</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  Hiện có <strong>{stories.length}</strong> bộ truyện trên website
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('newStory')}
                  className="text-xs text-pink-600 hover:text-pink-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Đăng truyện mới</span>
                </button>
              </div>

              {stories.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 space-y-2">
                  <p className="text-sm font-serif text-stone-700 dark:text-stone-300">
                    Chưa có bộ truyện nào trên website.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-700 rounded-2xl overflow-hidden bg-white dark:bg-stone-850">
                  {stories.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-pink-50/40 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={s.coverImage}
                          alt={s.title}
                          className="w-12 h-16 object-cover rounded-lg shrink-0 border border-stone-200 dark:border-stone-700 shadow-2xs"
                        />
                        <div className="min-w-0">
                          <h4 className="font-serif text-sm font-bold text-stone-800 dark:text-stone-100 truncate">
                            {s.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                            <span>Tác giả: {s.author}</span>
                            <span>•</span>
                            <span className="text-pink-600 dark:text-pink-400 font-sans">
                              {s.status === 'completed' ? 'Đã hoàn' : 'Đang ra'}
                            </span>
                            <span>•</span>
                            <span>{s.completedChapters || 0} chương</span>
                            <span>•</span>
                            <span className="text-sky-600 dark:text-sky-400 flex items-center gap-0.5">
                              <Eye className="w-3 h-3" />
                              <span>{s.views || 0}</span>
                            </span>
                            <span>•</span>
                            <span className="text-rose-500 flex items-center gap-0.5">
                              <Heart className="w-3 h-3" />
                              <span>{s.likes || 0}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStoryForEdit(s.id);
                            setActiveTab('editStory');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-200 font-medium hover:bg-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Sửa truyện</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStoryForChapterEdit(s.id);
                            setActiveTab('editChapter');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300 font-medium hover:bg-pink-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <FileEdit className="w-3 h-3" />
                          <span>Sửa chương</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTargetStoryId(s.id);
                            setActiveTab('newChapter');
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-pink-500 text-white font-medium hover:bg-pink-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Thêm chương</span>
                        </button>

                        {storyToDelete?.id === s.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-lg border border-rose-200">
                            <button
                              type="button"
                              onClick={() => handleDeleteStory(s.id, s.title)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-rose-500 text-white cursor-pointer"
                            >
                              Xóa ngay
                            </button>
                            <button
                              type="button"
                              onClick={() => setStoryToDelete(null)}
                              className="px-1.5 py-1 rounded text-[10px] text-stone-500 hover:bg-stone-200 cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setStoryToDelete({ id: s.id, title: s.title })}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Xóa truyện"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 11: LƯU TRỮ & ĐỒNG BỘ GITHUB PAGES */}
          {activeTab === 'sync' && (
            <AuthorSyncTab onFeedback={showFeedback} onRefreshAllData={onStoriesUpdated} />
          )}

          {/* TAB 12: QUẢN LÝ BÌNH LUẬN ĐỘC GIẢ TOÀN TRANG */}
          {activeTab === 'comments' && (
            <AuthorCommentsTab
              stories={stories}
              onFeedback={showFeedback}
              onOpenStoryChapter={(storyId, chapterNumber) => {
                onClose();
                if (onOpenStoryChapter) {
                  onOpenStoryChapter(storyId, chapterNumber);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
