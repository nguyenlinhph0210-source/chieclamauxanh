import React, { useState } from 'react';
import { Announcement } from '../../types';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  Pin,
  Clock,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { publishAnnouncement, deleteAnnouncement } from '../../lib/realtimeService';
import { RichTextEditor } from '../common/RichTextEditor';
import { RichTextRenderer } from '../common/RichTextRenderer';

interface AuthorAnnouncementsTabProps {
  announcements: Announcement[];
  onFeedback: (type: 'success' | 'error', text: string) => void;
  onAnnouncementsUpdated?: () => void;
}

export const AuthorAnnouncementsTab: React.FC<AuthorAnnouncementsTabProps> = ({
  announcements,
  onFeedback,
  onAnnouncementsUpdated,
}) => {
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<'Thông báo' | 'Lịch đăng' | 'Nhắc nhở' | 'Lưu ý'>('Thông báo');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'featured' | 'older'>('all');

  const handleStartEdit = (ann: Announcement) => {
    setEditingAnnId(ann.id);
    setTitle(ann.title);
    setTag(ann.tag as any);
    setContent(ann.content);
    setIsPinned(Boolean(ann.isPinned));
  };

  const handleCancelEdit = () => {
    setEditingAnnId(null);
    setTitle('');
    setContent('');
    setIsPinned(true);
    setTag('Thông báo');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      onFeedback('error', 'Vui lòng nhập tiêu đề và nội dung thông báo.');
      return;
    }

    setIsSaving(true);
    try {
      const annToSave: Announcement = {
        id: editingAnnId || `ann-${Date.now()}`,
        title: title.trim(),
        tag,
        content: content.trim(),
        date: new Date().toLocaleDateString('vi-VN'),
        isPinned,
      };

      await publishAnnouncement(annToSave);
      onFeedback(
        'success',
        editingAnnId
          ? `Đã cập nhật thông báo "${annToSave.title}" thành công!`
          : `Đã đăng thông báo "${annToSave.title}" lên Bảng tin!`
      );

      handleCancelEdit();
      if (onAnnouncementsUpdated) onAnnouncementsUpdated();
    } catch {
      onFeedback('error', 'Lỗi khi lưu thông báo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, annTitle: string) => {
    try {
      await deleteAnnouncement(id);
      onFeedback('success', `Đã xóa thông báo "${annTitle}".`);
      setDeletingId(null);
      if (editingAnnId === id) handleCancelEdit();
      if (onAnnouncementsUpdated) onAnnouncementsUpdated();
    } catch {
      onFeedback('error', 'Không thể xóa thông báo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Form Card (Create or Edit) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-pink-200/80 dark:border-stone-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-semibold text-xs sm:text-sm">
            {editingAnnId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>
              {editingAnnId ? 'Chỉnh sửa thông báo đã đăng' : 'Đăng thông báo mới lên Bảng tin'}
            </span>
          </div>

          {editingAnnId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hủy chỉnh sửa (Tạo mới)</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                Tiêu đề thông báo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Lịch đăng chương tuần mới & Lời chào độc giả"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-pink-300 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                Nhãn phân loại
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs"
              >
                <option value="Thông báo">Thông báo</option>
                <option value="Lịch đăng">Lịch đăng</option>
                <option value="Nhắc nhở">Nhắc nhở</option>
                <option value="Lưu ý">Lưu ý</option>
              </select>
            </div>
          </div>

          <div className="pt-1">
            <RichTextEditor
              label="Nội dung thông báo"
              required
              placeholder="Nhập nội dung thông báo gửi tới độc giả của nhà Mellifluous..."
              value={content}
              onChange={setContent}
              minHeight={160}
              fontFamily="sans"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded-sm text-pink-500"
              />
              <Pin className="w-3.5 h-3.5 text-pink-500" />
              <span>Ghim thông báo lên đầu trang</span>
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : editingAnnId ? 'Lưu cập nhật' : 'Đăng Bảng tin'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Existing Announcements List with Edit/Delete */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
            <span>Danh sách thông báo</span>
            <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300 text-[11px] font-mono">
              {announcements.length} thông báo
            </span>
          </h4>

          {/* Filter tabs: Tất cả / 3 nổi bật / Cũ hơn */}
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-stone-700 text-pink-600 dark:text-pink-300 shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Tất cả ({announcements.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('featured')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                filterMode === 'featured'
                  ? 'bg-white dark:bg-stone-700 text-pink-600 dark:text-pink-300 shadow-2xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              3 thông báo mới ({Math.min(3, announcements.length)})
            </button>
            {announcements.length > 3 && (
              <button
                type="button"
                onClick={() => setFilterMode('older')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                  filterMode === 'older'
                    ? 'bg-white dark:bg-stone-700 text-pink-600 dark:text-pink-300 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                Cũ hơn ({announcements.length - 3})
              </button>
            )}
          </div>
        </div>

        {announcements.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700 text-xs text-stone-500 dark:text-stone-400">
            Chưa có thông báo nào được đăng.
          </div>
        ) : (
          <div className="space-y-2.5">
            {announcements
              .map((ann, originalIdx) => ({ ann, originalIdx }))
              .filter(({ originalIdx }) => {
                if (filterMode === 'featured') return originalIdx < 3;
                if (filterMode === 'older') return originalIdx >= 3;
                return true;
              })
              .map(({ ann, originalIdx }) => {
                const isFeatured = originalIdx < 3;
                return (
                  <div
                    key={ann.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      editingAnnId === ann.id
                        ? 'border-pink-500 bg-pink-50/50 dark:bg-pink-950/20 ring-2 ring-pink-200'
                        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-850 hover:border-pink-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-700 dark:text-pink-300">
                            {ann.tag}
                          </span>
                          {ann.isPinned && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5" />
                              <span>Đang ghim</span>
                            </span>
                          )}
                          {isFeatured ? (
                            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800">
                              ★ Hiển thị bảng tin chính
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700">
                              📜 Nằm trong mục &quot;Xem thêm&quot;
                            </span>
                          )}
                          <span className="text-[11px] text-stone-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{ann.date}</span>
                          </span>
                        </div>

                        <h5 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100">
                          {ann.title}
                        </h5>

                        <div className="text-xs text-stone-700 dark:text-stone-200 leading-relaxed">
                          <RichTextRenderer content={ann.content} indentParagraphs={false} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(ann)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-700 hover:bg-pink-100 dark:hover:bg-pink-950 hover:text-pink-700 dark:hover:text-pink-300 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Chỉnh sửa thông báo này"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>

                        {deletingId === ann.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1 rounded-lg border border-rose-200">
                            <button
                              type="button"
                              onClick={() => handleDelete(ann.id, ann.title)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-rose-500 text-white cursor-pointer"
                            >
                              Xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="px-1.5 py-1 rounded text-[10px] text-stone-600 hover:bg-stone-200 cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(ann.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                            title="Xóa thông báo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
