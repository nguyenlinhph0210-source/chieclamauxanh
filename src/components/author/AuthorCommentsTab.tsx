import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Search,
  Trash2,
  Reply,
  Send,
  Sparkles,
  Heart,
  Filter,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Star,
  RefreshCw,
} from 'lucide-react';
import { Story } from '../../types';
import { isStoryDeleted } from '../../data/mockData';
import {
  RealtimeComment,
  subscribeToAllComments,
  postCommentReply,
  deleteComment,
} from '../../lib/realtimeService';
import { backupInteractiveDataToGithub } from '../../lib/githubSyncService';

interface AuthorCommentsTabProps {
  stories: Story[];
  onFeedback: (type: 'success' | 'error', message: string) => void;
  onOpenStoryChapter?: (storyId: string, chapterNumber?: number) => void;
}

export const AuthorCommentsTab: React.FC<AuthorCommentsTabProps> = ({
  stories,
  onFeedback,
  onOpenStoryChapter,
}) => {
  const [comments, setComments] = useState<RealtimeComment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState<string>('all');
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Map story titles
  const storyMap = useMemo(() => {
    const map = new Map<string, Story>();
    stories.forEach((s) => map.set(s.id, s));
    return map;
  }, [stories]);

  // Realtime subscription to all comments across all stories
  useEffect(() => {
    const unsubscribe = subscribeToAllComments((all) => {
      setComments(all);
    });
    return unsubscribe;
  }, []);

  // Filtered comments
  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      // 0. Exclude comments from deleted stories
      if (isStoryDeleted(c.storyId)) return false;

      // 1. Story Filter
      if (selectedStoryId !== 'all' && c.storyId !== selectedStoryId) {
        return false;
      }
      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesUser = (c.user || '').toLowerCase().includes(q);
        const matchesText = (c.text || '').toLowerCase().includes(q);
        const storyTitle = (storyMap.get(c.storyId)?.title || '').toLowerCase();
        const matchesStory = storyTitle.includes(q);
        return matchesUser || matchesText || matchesStory;
      }
      return true;
    });
  }, [comments, selectedStoryId, searchQuery, storyMap]);

  // Handle send author reply
  const handleSendReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      await postCommentReply(commentId, {
        user: 'Mellifluous (Tác giả)',
        text: replyText.trim(),
        avatar: '🌸',
        isAuthor: true,
        roleBadge: 'Tác giả',
      });
      setReplyText('');
      setReplyingCommentId(null);
      onFeedback('success', 'Đã gửi phản hồi từ Tác giả thành công!');
    } catch (err: any) {
      onFeedback('error', 'Lỗi khi gửi phản hồi: ' + (err?.message || err));
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Handle delete comment
  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setConfirmDeleteId(null);
      onFeedback('success', 'Đã xóa bình luận thành công.');
    } catch (err: any) {
      onFeedback('error', 'Không thể xóa bình luận: ' + (err?.message || err));
    }
  };

  // Handle quick backup to GitHub
  const handleQuickBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await backupInteractiveDataToGithub();
      if (res.success) {
        onFeedback(
          'success',
          `Đã sao lưu an toàn ${res.commentsCount} bình luận và ${res.lettersCount} tâm thư lên GitHub!`
        );
      } else {
        onFeedback('error', res.error || 'Lỗi khi sao lưu lên GitHub');
      }
    } catch (err: any) {
      onFeedback('error', err?.message || 'Có lỗi xảy ra');
    } finally {
      setIsBackingUp(false);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Gần đây';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return `${d.toLocaleDateString('vi-VN')} lúc ${d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Quick Actions */}
      <div className="p-4 sm:p-5 rounded-2xl bg-pink-50/80 dark:bg-stone-800/80 border border-pink-200/80 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-pink-100 dark:bg-stone-700 text-pink-700 dark:text-pink-300 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-stone-850 dark:text-stone-100 flex items-center gap-2">
              <span>Bình luận Độc giả Toàn trang</span>
              <span className="px-2 py-0.5 rounded-full bg-pink-200/80 dark:bg-pink-900/60 text-pink-800 dark:text-pink-300 text-xs font-mono font-bold">
                {comments.length}
              </span>
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mt-0.5">
              Cập nhật tức thì từ độc giả khắp nơi trên thế giới. Bạn và cộng sự có thể duyệt, phản hồi chính thức hoặc sao lưu lên GitHub.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleQuickBackup}
          disabled={isBackingUp}
          className="shrink-0 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-750 hover:bg-pink-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-pink-200 dark:border-stone-650 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          title="Gom đợt và đẩy toàn bộ bình luận & tâm thư lên GitHub"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin text-pink-600' : 'text-pink-600 dark:text-pink-400'}`} />
          <span>{isBackingUp ? 'Đang sao lưu...' : 'Sao lưu lên GitHub'}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bạn đọc, nội dung bình luận..."
            className="w-full pl-9.5 pr-4 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-850 dark:text-stone-100 focus:outline-none focus:border-pink-500 transition-colors shadow-2xs"
          />
        </div>

        {/* Story Selector Filter */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
          <select
            value={selectedStoryId}
            onChange={(e) => setSelectedStoryId(e.target.value)}
            className="w-full pl-8.5 pr-3 py-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-850 dark:text-stone-100 focus:outline-none focus:border-pink-500 transition-colors shadow-2xs cursor-pointer truncate"
          >
            <option value="all">Tất cả truyện ({comments.length} bình luận)</option>
            {stories.map((s) => {
              const count = comments.filter((c) => c.storyId === s.id).length;
              return (
                <option key={s.id} value={s.id}>
                  {s.title} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-stone-50/70 dark:bg-stone-800/40 border border-dashed border-stone-200 dark:border-stone-700 space-y-2">
          <div className="w-12 h-12 rounded-full bg-pink-100 dark:bg-stone-750 text-pink-500 flex items-center justify-center mx-auto text-xl">
            💬
          </div>
          <h4 className="font-serif text-sm font-bold text-stone-800 dark:text-stone-200">
            Không tìm thấy bình luận nào
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
            {searchQuery || selectedStoryId !== 'all'
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn lại truyện khác.'
              : 'Chưa có bình luận nào được gửi từ độc giả.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComments.map((comment) => {
            const story = storyMap.get(comment.storyId);
            const storyTitle = story?.title || comment.storyId;
            const isReplying = replyingCommentId === comment.id;

            return (
              <div
                key={comment.id}
                className="p-4 rounded-2xl bg-white dark:bg-stone-800/95 border border-stone-200/90 dark:border-stone-700/80 shadow-2xs space-y-3 transition-all hover:border-pink-200 dark:hover:border-stone-600"
              >
                {/* Comment Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-stone-700 text-pink-700 dark:text-pink-300 flex items-center justify-center text-sm shrink-0 select-none shadow-2xs overflow-hidden">
                      {comment.avatar && (comment.avatar.startsWith('http://') || comment.avatar.startsWith('https://') || comment.avatar.startsWith('data:')) ? (
                        <img
                          src={comment.avatar}
                          alt={comment.user || 'Avatar'}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>{comment.avatar || '🌸'}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-stone-850 dark:text-stone-100">
                          {comment.user || 'Bạn đọc yêu truyện'}
                        </span>
                        {comment.roleBadge && (
                          <span className="px-1.5 py-0.2 rounded-full bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 text-[9px] font-semibold">
                            {comment.roleBadge}
                          </span>
                        )}
                        {comment.rating && (
                          <div className="flex items-center gap-0.5 text-amber-500 text-[10px]">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{comment.rating} sao</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 dark:text-stone-500">
                        {formatDate(comment.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Story & Chapter Tag */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 truncate max-w-[160px] sm:max-w-[220px]">
                      {storyTitle} {comment.chapterNumber ? `· C.${comment.chapterNumber}` : ''}
                    </span>
                    {onOpenStoryChapter && (
                      <button
                        type="button"
                        onClick={() => onOpenStoryChapter(comment.storyId, comment.chapterNumber)}
                        className="p-1 rounded-lg text-stone-400 hover:text-pink-600 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                        title="Mở truyện để xem ngữ cảnh"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Text Content */}
                <div className="text-xs text-stone-750 dark:text-stone-250 leading-relaxed pl-10 whitespace-pre-line">
                  {comment.text}
                </div>

                {/* Replies Thread */}
                {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                  <div className="pl-10 pt-2 space-y-2 border-t border-stone-100 dark:border-stone-750">
                    {comment.replies.map((r, idx) => (
                      <div
                        key={r.id || idx}
                        className={`p-2.5 rounded-xl text-xs space-y-1 ${
                          r.isAuthor
                            ? 'bg-pink-50/70 dark:bg-pink-950/30 border border-pink-200/60 dark:border-pink-900/40'
                            : 'bg-stone-50 dark:bg-stone-750/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                            {r.avatar && (r.avatar.startsWith('http://') || r.avatar.startsWith('https://') || r.avatar.startsWith('data:')) ? (
                              <img src={r.avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-xs select-none">{r.avatar || '🌸'}</span>
                            )}
                          </div>
                          <span className="font-semibold text-stone-850 dark:text-stone-100 text-[11px]">
                            {r.user}
                          </span>
                          {r.isAuthor && (
                            <span className="px-1.5 py-0.2 rounded-full bg-pink-200/80 dark:bg-pink-900 text-pink-800 dark:text-pink-200 text-[9px] font-bold">
                              Tác giả 🌸
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-700 dark:text-stone-300 whitespace-pre-line pl-4">
                          {r.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Bar (Reply + Delete) */}
                <div className="flex items-center justify-between pl-10 pt-1 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingCommentId(isReplying ? null : comment.id);
                        setReplyText('');
                      }}
                      className="text-pink-600 dark:text-pink-400 hover:text-pink-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>{isReplying ? 'Đóng phản hồi' : 'Phản hồi từ Tác giả'}</span>
                    </button>

                    {comment.likes > 0 && (
                      <span className="text-stone-400 dark:text-stone-500 flex items-center gap-1 text-[11px]">
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                        <span>{comment.likes}</span>
                      </span>
                    )}
                  </div>

                  {confirmDeleteId === comment.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-rose-600 dark:text-rose-400">Xác nhận xóa?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
                        className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        Xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] hover:bg-stone-300 transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(comment.id)}
                      className="text-stone-400 hover:text-rose-500 transition-colors p-1 rounded-lg cursor-pointer"
                      title="Xóa bình luận này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline Reply Input Box */}
                {isReplying && (
                  <div className="pl-10 pt-2 space-y-2 animate-in fade-in duration-150">
                    <div className="relative">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Nhập lời nhắn phản hồi của bạn gửi tới độc giả này..."
                        rows={2}
                        className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-stone-750 border border-pink-200 dark:border-stone-600 text-xs text-stone-850 dark:text-stone-100 focus:outline-none focus:border-pink-500 resize-none transition-colors"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyingCommentId(null)}
                        className="px-3 py-1.5 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-medium cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendReply(comment.id)}
                        disabled={isSubmittingReply || !replyText.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSubmittingReply ? 'Đang gửi...' : 'Gửi phản hồi 🌸'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
