import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, RotateCcw, Check, AlertCircle, Sparkles } from 'lucide-react';
import {
  getAvailableGenres,
  addGenre,
  deleteGenre,
  resetGenresToDefault,
  subscribeGenres,
  DEFAULT_GENRES,
} from '../../utils/genreManager';

interface AuthorGenresTabProps {
  onFeedback?: (type: 'success' | 'error', text: string) => void;
}

export const AuthorGenresTab: React.FC<AuthorGenresTabProps> = ({ onFeedback }) => {
  const [genres, setGenres] = useState<string[]>(getAvailableGenres());
  const [newGenreInput, setNewGenreInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genreToDelete, setGenreToDelete] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [inlineFeedback, setInlineFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeGenres((list) => {
      setGenres(list);
    });
    return unsubscribe;
  }, []);

  const triggerFeedback = (type: 'success' | 'error', text: string) => {
    setInlineFeedback({ type, text });
    setTimeout(() => {
      setInlineFeedback(null);
    }, 4000);
    if (onFeedback) {
      try {
        onFeedback(type, text);
      } catch {
        // fallback
      }
    }
  };

  const handleAddGenre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenreInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await addGenre(newGenreInput);
    setIsSubmitting(false);

    if (result.success) {
      setNewGenreInput('');
      triggerFeedback('success', result.message);
    } else {
      triggerFeedback('error', result.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!genreToDelete) return;
    const target = genreToDelete;
    setGenreToDelete(null);

    const result = await deleteGenre(target);
    if (result.success) {
      triggerFeedback('success', result.message);
    } else {
      triggerFeedback('error', result.message);
    }
  };

  const handleConfirmReset = async () => {
    setShowResetConfirm(false);
    await resetGenresToDefault();
    triggerFeedback('success', 'Đã khôi phục danh sách thể loại về mặc định!');
  };

  return (
    <div id="author-genres-tab" className="space-y-6 animate-in fade-in duration-200">
      {/* Inline Feedback Notice */}
      {inlineFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border shadow-xs animate-in fade-in slide-in-from-top-1 ${
            inlineFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800'
          }`}
        >
          {inlineFeedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{inlineFeedback.text}</span>
        </div>
      )}
      {/* Top Banner Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/80 to-pink-50/80 dark:from-stone-800 dark:via-stone-850 dark:to-stone-800 border border-emerald-200/90 dark:border-stone-700 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Quản Lý Thể Loại & Chuyên Mục</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-sans font-medium">
                  {genres.length} thể loại
                </span>
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 font-sans mt-0.5">
                Thêm mới hoặc xóa các thẻ thể loại xuất hiện trên thanh tìm kiếm, bộ lọc truyện và bảng đăng bài.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Khôi phục danh sách thể loại chuẩn ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định ban đầu</span>
          </button>
        </div>
      </div>

      {/* Add New Genre Input Form */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 shadow-2xs">
        <form onSubmit={handleAddGenre} className="space-y-3">
          <label htmlFor="new-genre-input-field" className="block text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
            Thêm thể loại / thẻ phân loại mới:
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                id="new-genre-input-field"
                type="text"
                value={newGenreInput}
                onChange={(e) => setNewGenreInput(e.target.value)}
                placeholder="Ví dụ: Gương vỡ lại lành, Cưới trước yêu sau, Thanh mai trúc mã..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={!newGenreInput.trim() || isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm thể loại</span>
            </button>
          </div>
        </form>
      </div>

      {/* List of Genres */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-700 pb-3">
          <span className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Danh sách các thể loại hiện hành ({genres.length})</span>
          </span>
          <span className="text-[11px] text-stone-600 dark:text-stone-300 font-medium">
            Nhấp dấu × để xóa thể loại
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {genres.map((genre) => (
            <div
              key={genre}
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 hover:border-pink-300 dark:hover:border-pink-600 hover:bg-pink-50/50 dark:hover:bg-stone-800 text-xs sm:text-sm font-semibold transition-all shadow-2xs"
            >
              <span>{genre}</span>
              <button
                type="button"
                onClick={() => setGenreToDelete(genre)}
                className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/80 dark:hover:text-rose-300 transition-colors cursor-pointer"
                title={`Xóa thể loại "${genre}"`}
                aria-label={`Xóa thể loại ${genre}`}
              >
                <span className="text-xs leading-none">✕</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {genreToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                  Xác nhận xóa thể loại?
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Thao tác này sẽ gỡ thẻ khỏi danh sách gợi ý.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
              Bạn có chắc chắn muốn xóa thẻ thể loại{' '}
              <strong className="text-rose-600 dark:text-rose-400">"{genreToDelete}"</strong> khỏi danh sách phân loại không?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setGenreToDelete(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif text-base font-bold text-stone-900 dark:text-stone-100">
                  Khôi phục thể loại mặc định?
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Hành động này sẽ đưa toàn bộ danh sách thẻ về trạng thái ban đầu của website.
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 leading-relaxed">
              Bạn có chắc chắn muốn khôi phục danh sách thể loại về danh sách mặc định ban đầu không? Các thẻ mới thêm sẽ bị làm mới.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
