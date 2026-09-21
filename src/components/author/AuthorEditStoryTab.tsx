import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Story } from '../../types';
import {
  Save,
  BookOpen,
  Lock,
  Key,
  Layers,
  Sparkles,
  Trash2,
  Check,
  FileEdit,
  ExternalLink,
  X,
  Tag,
  RefreshCw,
  Eye,
  Hash,
  Search,
  Clock,
  Calendar,
  History,
  RotateCcw,
} from 'lucide-react';
import { publishStory, deleteStory } from '../../lib/realtimeService';
import { getStoryGenres, subscribeToCustomGenres, addCustomGenre } from '../../utils/genreManager';
import { getStoryChapters } from '../../data/mockData';
import { RichTextEditor } from '../common/RichTextEditor';
import {
  formatDateTime,
  formatRelativeTime,
  isoToDateTimeLocal,
  dateTimeLocalToIso,
  isRecentlyEdited,
} from '../../utils/dateUtils';

interface AuthorEditStoryTabProps {
  stories: Story[];
  initialSelectedStoryId?: string;
  onFeedback: (type: 'success' | 'error', text: string) => void;
  onStoriesUpdated?: () => void;
  onJumpToChapters?: (storyId: string) => void;
}

const PRESET_COVERS = [
  { name: 'Hoa anh đào & Nắng', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=800&auto=format&fit=crop' },
  { name: 'Khu rừng mùa hè', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop' },
  { name: 'Góc phố bình yên', url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop' },
  { name: 'Bầu trời hoàng hôn', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop' },
  { name: 'Ánh trăng huyền ảo', url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=800&auto=format&fit=crop' },
];

export const AuthorEditStoryTab: React.FC<AuthorEditStoryTabProps> = ({
  stories,
  initialSelectedStoryId,
  onFeedback,
  onStoriesUpdated,
  onJumpToChapters,
}) => {
  const [selectedStoryId, setSelectedStoryId] = useState<string>(
    initialSelectedStoryId || stories[0]?.id || ''
  );

  // Sync selectedStoryId when initialSelectedStoryId prop updates
  useEffect(() => {
    if (initialSelectedStoryId && initialSelectedStoryId !== selectedStoryId) {
      setSelectedStoryId(initialSelectedStoryId);
    }
  }, [initialSelectedStoryId]);

  const [availableGenres, setAvailableGenres] = useState<string[]>(() => getStoryGenres());
  const [genreSearch, setGenreSearch] = useState('');

  useEffect(() => {
    const unsub = subscribeToCustomGenres((genres) => {
      // Filter out any generic filter labels
      const clean = genres.filter(
        (g) => g.toLowerCase() !== 'tất cả các thể loại mùa hè' && g.toLowerCase() !== 'tất cả thể loại mùa hè'
      );
      setAvailableGenres(clean);
    });
    return unsub;
  }, []);

  const selectedStory = stories.find((s) => s.id === selectedStoryId) || stories[0];

  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [translator, setTranslator] = useState('Mellifluous');
  const [status, setStatus] = useState<'completed' | 'ongoing'>('ongoing');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [totalChapters, setTotalChapters] = useState(30);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');
  const [passwordKey, setPasswordKey] = useState('');
  const [publishDateInput, setPublishDateInput] = useState('');
  const [originalPublishedAt, setOriginalPublishedAt] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keep track of the currently loaded story ID so we ONLY load when story selection changes,
  // preventing background refreshes from erasing user's in-progress changes.
  const lastLoadedStoryIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedStory && lastLoadedStoryIdRef.current !== selectedStory.id) {
      lastLoadedStoryIdRef.current = selectedStory.id;
      setTitle(selectedStory.title || '');
      setOriginalTitle(selectedStory.originalTitle || '');
      setAuthor(selectedStory.author || '');
      setTranslator(selectedStory.translator || 'Mellifluous');
      setStatus(selectedStory.status || 'ongoing');
      setSelectedGenres(Array.isArray(selectedStory.genre) ? [...selectedStory.genre] : []);
      setSummary(selectedStory.summary || '');
      setCoverImage(selectedStory.coverImage || PRESET_COVERS[0].url);
      setTotalChapters(selectedStory.totalChapters || 30);
      setHasPassword(Boolean(selectedStory.hasPassword));
      setPasswordHint(selectedStory.passwordHint || '');
      setPasswordKey(selectedStory.passwordKey || '');
      const pub = selectedStory.publishedAt || selectedStory.updatedAt || new Date().toISOString();
      setPublishDateInput(isoToDateTimeLocal(pub));
      setOriginalPublishedAt(selectedStory.publishedAt || selectedStory.updatedAt || '');
      setLastUpdatedAt(selectedStory.updatedAt || '');
      setConfirmDelete(false);
    }
  }, [selectedStoryId, selectedStory?.id]);

  // Compute live real published chapters for this story
  const publishedChapters = useMemo(() => {
    if (!selectedStory) return [];
    return getStoryChapters(selectedStory.id);
  }, [selectedStory?.id]);

  const realPublishedCount = Math.max(selectedStory?.completedChapters || 0, publishedChapters.length);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    setSelectedGenres((prev) => prev.filter((g) => g !== genreToRemove));
  };

  const handleClearAllGenres = () => {
    setSelectedGenres([]);
  };

  const handleAddCustomGenre = async () => {
    const trimmed = customGenre.trim();
    if (!trimmed) return;
    if (!selectedGenres.includes(trimmed)) {
      setSelectedGenres((prev) => [...prev, trimmed]);
    }
    await addCustomGenre(trimmed);
    setCustomGenre('');
  };

  // Filtered available genres by search keyword
  const filteredAvailableGenres = useMemo(() => {
    if (!genreSearch.trim()) return availableGenres;
    const q = genreSearch.toLowerCase();
    return availableGenres.filter((g) => g.toLowerCase().includes(q));
  }, [availableGenres, genreSearch]);

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStory) {
      onFeedback('error', 'Chưa chọn truyện để chỉnh sửa.');
      return;
    }
    if (!title.trim() || !author.trim()) {
      onFeedback('error', 'Tên truyện và tên tác giả không được để trống.');
      return;
    }

    setIsSaving(true);
    try {
      const finalPublishedAt = publishDateInput
        ? dateTimeLocalToIso(publishDateInput)
        : (selectedStory.publishedAt || selectedStory.updatedAt || new Date().toISOString());
      const nowIso = new Date().toISOString();

      const updatedStory: Story = {
        ...selectedStory,
        title: title.trim(),
        originalTitle: originalTitle.trim(),
        author: author.trim(),
        translator: translator.trim() || 'Mellifluous',
        status,
        genre: selectedGenres.length > 0 ? selectedGenres : ['Ngôn tình'],
        summary: summary.trim(),
        totalChapters: Number(totalChapters) || selectedStory.totalChapters || 1,
        mainChaptersCount: Number(totalChapters) || selectedStory.mainChaptersCount || 1,
        completedChapters: realPublishedCount,
        coverImage: coverImage.trim() || PRESET_COVERS[0].url,
        hasPassword,
        passwordHint: hasPassword ? passwordHint.trim() : '',
        passwordKey: hasPassword ? passwordKey.trim().toLowerCase() : '',
        publishedAt: finalPublishedAt,
        updatedAt: nowIso,
      };

      const pubResult = await publishStory(updatedStory);
      setOriginalPublishedAt(finalPublishedAt);
      setLastUpdatedAt(nowIso);
      if (pubResult?.github?.attempted) {
        if (pubResult.github.success) {
          onFeedback('success', `Đã cập nhật tác phẩm "${updatedStory.title}" và đẩy lên GitHub!`);
        } else {
          onFeedback('error', `Đã lưu cập nhật, nhưng đồng bộ GitHub gặp lỗi: ${pubResult.github.error}`);
        }
      } else {
        onFeedback('success', `Đã cập nhật thành công tác phẩm "${updatedStory.title}"!`);
      }
      if (onStoriesUpdated) onStoriesUpdated();
    } catch {
      onFeedback('error', 'Không thể lưu thay đổi vào cơ sở dữ liệu.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!selectedStory) return;
    const deletedTitle = selectedStory.title;
    const nextStory = stories.find((s) => s.id !== selectedStory.id);
    try {
      await deleteStory(selectedStory.id);
      setSelectedStoryId(nextStory ? nextStory.id : '');
      onFeedback('success', `Đã xóa tác phẩm "${deletedTitle}".`);
      setConfirmDelete(false);
      if (onStoriesUpdated) onStoriesUpdated();
    } catch {
      onFeedback('error', 'Không thể xóa tác phẩm.');
    }
  };

  if (stories.length === 0) {
    return (
      <div className="p-8 text-center bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-700">
        <p className="text-sm font-serif text-stone-700 dark:text-stone-300">
          Chưa có tác phẩm nào để chỉnh sửa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Story Selector Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-pink-50/80 to-rose-50/60 dark:from-stone-850 dark:to-stone-800 border border-pink-200/80 dark:border-stone-700 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-pink-500" />
              <span>Tác phẩm đang chọn để chỉnh sửa:</span>
            </label>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Chọn bộ truyện trong danh sách để cập nhật văn án, thể loại, bìa hoặc số chương.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {selectedStory && (
              <span className="px-3 py-1 rounded-xl bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 text-xs font-semibold flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>Tiến độ: {realPublishedCount}/{selectedStory.totalChapters} chương</span>
              </span>
            )}

            {onJumpToChapters && selectedStory && (
              <button
                type="button"
                onClick={() => onJumpToChapters(selectedStory.id)}
                className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Mở tab quản lý chương của truyện này"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Sửa các chương</span>
              </button>
            )}
          </div>
        </div>

        <select
          value={selectedStoryId}
          onChange={(e) => {
            const nextId = e.target.value;
            lastLoadedStoryIdRef.current = null; // force reload form with new story data
            setSelectedStoryId(nextId);
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-pink-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-sm font-semibold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
        >
          {stories.map((s) => {
            const chCount = Math.max(s.completedChapters || 0, getStoryChapters(s.id).length);
            return (
              <option key={s.id} value={s.id}>
                📖 {s.title} ({s.status === 'completed' ? 'Đã hoàn' : 'Đang ra'} • {chCount}/{s.totalChapters} chương • {s.author})
              </option>
            );
          })}
        </select>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSaveStory} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center justify-between">
              <span>Tên truyện tiếng Việt <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Tên gốc tiếng Trung / Hàn (nếu có)
            </label>
            <input
              type="text"
              value={originalTitle}
              onChange={(e) => setOriginalTitle(e.target.value)}
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
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Dịch giả / Editor
            </label>
            <input
              type="text"
              value={translator}
              onChange={(e) => setTranslator(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
              Tình trạng truyện
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'completed' | 'ongoing')}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden font-medium"
            >
              <option value="ongoing">Đang tiến hành (Ongoing)</option>
              <option value="completed">Đã hoàn thành (Completed)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center justify-between">
              <span>Tổng số chương dự kiến</span>
              <span className="text-[11px] text-pink-600 dark:text-pink-400 font-normal">
                Hiện có: <strong>{realPublishedCount}</strong> chương đã đăng
              </span>
            </label>
            <input
              type="number"
              min={Math.max(1, realPublishedCount)}
              value={totalChapters}
              onChange={(e) => setTotalChapters(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:ring-2 focus:ring-pink-300 focus:outline-hidden font-semibold"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* PROFESSIONAL GENRE / CATEGORY SELECTION INTERFACE          */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-pink-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-100">
                  Chuyên mục / Thể loại & Thẻ nhãn
                </h4>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Nhấp vào thẻ để chọn hoặc bỏ chọn. Có thể thêm thẻ mới tùy ý cho tác phẩm.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2.5 py-1 rounded-lg">
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
                  value={genreSearch}
                  onChange={(e) => setGenreSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 w-full sm:w-48 focus:outline-hidden focus:ring-1 focus:ring-pink-300"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 custom-scrollbar">
              {filteredAvailableGenres.map((genre) => {
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
              {filteredAvailableGenres.length === 0 && (
                <div className="w-full text-center py-2 text-xs text-stone-400">
                  Không tìm thấy thể loại khớp với từ khóa "{genreSearch}".
                </div>
              )}
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
                className="flex-1 max-w-sm px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddCustomGenre}
                disabled={!customGenre.trim()}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600 text-white text-xs font-medium cursor-pointer disabled:opacity-40 transition-colors"
              >
                + Thêm thẻ mới
              </button>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 space-y-3 shadow-2xs">
          <label className="text-xs font-bold text-stone-800 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
            <span>Ảnh bìa truyện</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            {coverImage && (
              <div className="w-20 h-28 rounded-xl overflow-hidden border border-pink-200 dark:border-stone-700 shrink-0 shadow-xs relative group">
                <img
                  src={coverImage}
                  alt="Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.5 font-mono">
                  Xem trước
                </span>
              </div>
            )}
            <div className="flex-1 space-y-2 w-full">
              <input
                type="url"
                placeholder="Dán link ảnh bìa trực tiếp (https://...)..."
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
              />
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] text-stone-400 self-center mr-1">Mẫu có sẵn:</span>
                {PRESET_COVERS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setCoverImage(preset.url)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      coverImage === preset.url
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-300 font-bold'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-pink-300 dark:hover:border-stone-500 bg-stone-50 dark:bg-stone-800'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary with RichTextEditor */}
        <div className="pt-1">
          <RichTextEditor
            label="Văn án / Giới thiệu tác phẩm"
            value={summary}
            onChange={setSummary}
            placeholder="Nội dung tóm tắt cốt truyện. Ô tự động co giãn theo nội dung, hỗ trợ căn dòng và định dạng phong phú..."
            minHeight={180}
            fontFamily="serif"
          />
        </div>

        {/* Password Settings */}
        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-stone-900 border border-amber-200/80 dark:border-stone-700 space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={hasPassword}
              onChange={(e) => setHasPassword(e.target.checked)}
              className="rounded-sm text-amber-500 focus:ring-amber-400"
            />
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Kích hoạt khóa Mật khẩu / Password cho tác phẩm này</span>
          </label>

          {hasPassword && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-800 dark:text-stone-200">
                  Câu hỏi gợi ý mật khẩu (Hiển thị cho độc giả)
                </label>
                <input
                  type="text"
                  placeholder="VD: Tên con mèo đầu tiên của nam chính viết liền không dấu"
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

        {/* Story Publication & Edit Time Management */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50/60 via-stone-50 to-rose-50/40 dark:from-stone-850 dark:to-stone-800 border border-pink-200/70 dark:border-stone-700/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-pink-500 shrink-0" />
              <span className="text-xs font-bold text-stone-800 dark:text-stone-100">
                Thời gian đăng & Chỉnh sửa tác phẩm
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setPublishDateInput(isoToDateTimeLocal(new Date().toISOString()))}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-stone-900 border border-pink-200 dark:border-stone-600 text-pink-600 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-stone-750 transition-colors flex items-center gap-1 cursor-pointer"
                title="Đặt thời gian đăng thành thời điểm hiện tại"
              >
                <Clock className="w-3 h-3" />
                <span>Đặt thành bây giờ</span>
              </button>
              {originalPublishedAt && (
                <button
                  type="button"
                  onClick={() => setPublishDateInput(isoToDateTimeLocal(originalPublishedAt))}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Khôi phục ngày giờ đăng ban đầu"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Giữ ngày đăng gốc</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-pink-500" />
                <span>Tự set / chỉnh sửa thời gian đăng tải:</span>
              </label>
              <input
                type="datetime-local"
                value={publishDateInput}
                onChange={(e) => setPublishDateInput(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-medium focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
              />
              <span className="text-[10px] text-stone-500 dark:text-stone-400 block">
                Hiển thị: {formatDateTime(publishDateInput ? dateTimeLocalToIso(publishDateInput) : originalPublishedAt)} ({formatRelativeTime(publishDateInput ? dateTimeLocalToIso(publishDateInput) : originalPublishedAt)})
              </span>
            </div>

            <div className="space-y-1 sm:border-l sm:border-stone-200 dark:sm:border-stone-700 sm:pl-3">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-stone-400" />
                <span>Trạng thái chỉnh sửa:</span>
              </span>
              <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700/80 text-xs space-y-1">
                {isRecentlyEdited(originalPublishedAt, lastUpdatedAt) ? (
                  <div className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                    <span>Đã chỉnh sửa: {formatDateTime(lastUpdatedAt)} ({formatRelativeTime(lastUpdatedAt)})</span>
                  </div>
                ) : (
                  <div className="text-stone-500 dark:text-stone-400 text-[11px]">
                    Chưa qua chỉnh sửa sau khi đăng tải.
                  </div>
                )}
                <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-tight">
                  * Khi bạn nhấn [Lưu cập nhật], thời gian chỉnh sửa mới nhất của tác phẩm sẽ tự động được cập nhật chính xác.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-xl border border-rose-200 dark:border-rose-800">
                <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                  Xác nhận xóa vĩnh viễn truyện này?
                </span>
                <button
                  type="button"
                  onClick={handleDeleteStory}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white cursor-pointer"
                >
                  Xóa ngay
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded-lg text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa tác phẩm này</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu cập nhật...' : 'Lưu cập nhật tác phẩm'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

