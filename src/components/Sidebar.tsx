import React, { useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Volume2,
  VolumeX,
  Pin,
  Lock,
  BookMarked,
  Music,
  ExternalLink,
} from 'lucide-react';
import { Story, Announcement, RecentUpdate } from '../types';
import { SUMMER_QUOTES, isStoryDeleted } from '../data/mockData';
import { sortAnnouncements } from '../lib/realtimeService';
import { SidebarStoryDropdown } from './SidebarStoryDropdown';
import { SidebarGenreDropdown } from './SidebarGenreDropdown';
import { RichTextRenderer } from './common/RichTextRenderer';

interface SidebarProps {
  stories: Story[];
  announcements: Announcement[];
  recentUpdates: RecentUpdate[];
  onSelectStory: (storyId: string) => void;
  onSelectChapter: (storyId: string, chapterNumber: number) => void;
  onFilterGenre: (genre: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  stories,
  announcements,
  recentUpdates,
  onSelectStory,
  onSelectChapter,
  onFilterGenre,
}) => {
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activeQuoteIndex, setActiveQuoteIndex] = useState<number>(0);

  // Active non-deleted stories
  const activeStories = stories.filter((s) => !isStoryDeleted(s.id));

  // All distinct genres across active stories
  const allGenres = Array.from(new Set(activeStories.flatMap((s) => s.genre)));

  // Valid non-deleted recent updates
  const validRecentUpdates = recentUpdates.filter((u) => !isStoryDeleted(u.storyId));

  const handleSelectStory = (storyId: string) => {
    setSelectedStoryId(storyId);
    onSelectStory(storyId);
  };

  const handleFilterGenre = (genre: string) => {
    setSelectedGenre(genre);
    onFilterGenre(genre);
  };

  const toggleAudioAmbiance = () => {
    setIsPlayingAudio(!isPlayingAudio);
  };

  const nextQuote = () => {
    setActiveQuoteIndex((prev) => (prev + 1) % SUMMER_QUOTES.length);
  };

  const [showOlderAnnouncements, setShowOlderAnnouncements] = useState(false);

  // Sắp xếp thông báo: Đang ghim lên trước, sau đó theo thời gian mới nhất
  const sortedAnnouncements = sortAnnouncements(announcements);

  const INITIAL_VISIBLE_COUNT = 3;
  const displayedAnnouncements = showOlderAnnouncements
    ? sortedAnnouncements
    : sortedAnnouncements.slice(0, INITIAL_VISIBLE_COUNT);
  const olderCount = Math.max(0, sortedAnnouncements.length - INITIAL_VISIBLE_COUNT);

  return (
    <aside id="blog-right-sidebar" className="space-y-6 w-full">
      {/* 1. SECTION: BẢNG TIN NHÀ MEL (Hiển thị thông báo mới & cũ, ít nhất 3 thông báo gần nhất) */}
      <div className="relative p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-pink-50/90 via-rose-50/60 to-amber-50/80 dark:from-stone-800 dark:via-stone-800/90 dark:to-pink-950/30 border border-pink-200/80 dark:border-stone-700/80 shadow-xs space-y-3.5">
        {/* Washi tape decoration */}
        <div className="absolute -top-2.5 left-8 w-16 h-4 bg-pink-300/80 dark:bg-pink-700/70 rotate-[-2deg] rounded-xs shadow-2xs border-y border-white/60" />

        {/* Board Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
              <span>Bảng tin nhà Mel</span>
              <Pin className="w-3.5 h-3.5 text-pink-500" />
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-pink-200/70 text-pink-900 dark:bg-pink-900/60 dark:text-pink-200 font-medium">
            {announcements.length} thông báo
          </span>
        </div>

        {/* Announcements List */}
        <div className="space-y-2.5">
          {displayedAnnouncements.length === 0 ? (
            <div className="p-4 text-center rounded-xl bg-white/60 dark:bg-stone-850/60 border border-dashed border-stone-200 dark:border-stone-700/80 text-xs text-stone-500 dark:text-stone-400 font-sans">
              Chưa có thông báo mới nào từ Mel.
            </div>
          ) : (
            displayedAnnouncements.map((notice, idx) => {
            const isOlder = idx >= INITIAL_VISIBLE_COUNT;
            return (
              <div
                key={notice.id}
                className={`p-3 rounded-xl transition-all ${
                  notice.isPinned
                    ? 'bg-white/95 dark:bg-stone-850 border border-pink-200 dark:border-stone-700 shadow-2xs'
                    : isOlder
                    ? 'bg-stone-50/90 dark:bg-stone-850/60 border border-dashed border-stone-200 dark:border-stone-700/80'
                    : 'bg-white/80 dark:bg-stone-850/80 border border-pink-100/90 dark:border-stone-800 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {notice.isPinned && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 flex items-center gap-0.5">
                        <Pin className="w-2.5 h-2.5" />
                        <span>Đang ghim</span>
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.2 rounded-full ${
                        notice.tag === 'Lưu ý'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                          : notice.tag === 'Lịch đăng'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                          : 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-200'
                      }`}
                    >
                      {notice.tag}
                    </span>
                    {isOlder && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-stone-200/80 dark:bg-stone-750 text-stone-600 dark:text-stone-300">
                        Cũ hơn
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{notice.date}</span>
                  </span>
                </div>

                <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                  {notice.title}
                </h4>
                <div className="mt-1 text-xs text-stone-700 dark:text-stone-300 font-sans leading-relaxed">
                  <RichTextRenderer content={notice.content} indentParagraphs={false} />
                </div>
              </div>
            );
          }))}
        </div>

        {/* Nút Xem thêm để hiện các thông báo cũ hơn */}
        {olderCount > 0 && (
          <button
            type="button"
            id="toggle-older-announcements-btn"
            onClick={() => setShowOlderAnnouncements((prev) => !prev)}
            className="w-full py-2 px-3 rounded-xl bg-white/90 dark:bg-stone-850 hover:bg-pink-100/70 dark:hover:bg-stone-800 border border-pink-200 dark:border-stone-700 text-pink-700 dark:text-pink-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            {showOlderAnnouncements ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Thu gọn bảng tin</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Xem thêm để hiện các thông báo cũ hơn ({olderCount})</span>
              </>
            )}
          </button>
        )}

        {/* Small note reminder */}
        <div className="pt-2 border-t border-pink-200/60 dark:border-stone-700/60 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
          <span className="font-serif italic">Mellifluous 🌸 Thuyền nhỏ</span>
          <span className="text-pink-600 dark:text-pink-400 font-medium">Phi thương mại</span>
        </div>
      </div>

      {/* 2. SECTION: DANH MỤC ĐỔ XUỐNG ĐỂ CHỌN TÁC PHẨM TRUYỆN / CHUYÊN MỤC (Linh hoạt theo chế độ sáng/tối, đồng bộ và rõ chữ) */}
      <div className="relative p-5 rounded-2xl bg-white dark:bg-stone-900 border border-pink-100 dark:border-stone-800 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-pink-50 text-pink-600 border border-pink-200 dark:bg-stone-800 dark:text-pink-400 dark:border-stone-700 shadow-2xs">
              <BookMarked className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-stone-800 dark:text-white flex items-center gap-1.5">
                <span>Chọn thư và danh mục</span>
                <span className="text-xs">🌸</span>
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-sans">
                Bấm chọn danh mục
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-100/80 text-pink-800 dark:bg-stone-800 dark:text-pink-300 font-semibold border border-pink-200 dark:border-stone-700">
            {activeStories.length} bộ
          </span>
        </div>

        {/* Custom Styled Dropdown 1: Tác phẩm truyện */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>Danh mục truyện:</span>
              <span className="text-pink-500 dark:text-pink-400 text-[10px]">✦</span>
            </span>
          </label>
          <SidebarStoryDropdown
            stories={activeStories}
            selectedStoryId={selectedStoryId}
            onSelectStory={handleSelectStory}
          />
        </div>

        {/* Custom Styled Dropdown 2: Thể loại / Chuyên mục truyện */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>Lọc theo thể loại / chuyên mục:</span>
              <span className="text-emerald-500 dark:text-emerald-400 text-[10px]">🍃</span>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-300 font-medium">
              {allGenres.length} tags
            </span>
          </label>
          <SidebarGenreDropdown
            stories={activeStories}
            selectedGenre={selectedGenre}
            onFilterGenre={handleFilterGenre}
          />
        </div>
      </div>

      {/* 3. SECTION: THÔNG BÁO CÁC CHƯƠNG TRUYỆN MỚI NHẤT ĐƯỢC CẬP NHẬT THEO THỜI GIAN ĐĂNG BÀI */}
      <div className="p-5 rounded-2xl bg-white/90 dark:bg-stone-800/90 border border-stone-200/80 dark:border-stone-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-100">
                Chương mới cập nhật
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-sans">
                Nhà Mell có gì mới?
              </p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
        </div>

        {/* Timeline list of recent chapters */}
        <div className="space-y-3">
          {validRecentUpdates.length > 0 ? (
            validRecentUpdates.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectChapter(item.storyId, item.chapterNumber)}
                className="w-full text-left p-3 rounded-xl bg-stone-50 hover:bg-pink-50/70 dark:bg-stone-900/60 dark:hover:bg-stone-700/60 border border-stone-200/60 dark:border-stone-700/60 hover:border-pink-200 dark:hover:border-pink-800 transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                  <span className="font-medium text-pink-600 dark:text-pink-400 flex items-center gap-1 truncate max-w-[65%]">
                    🌸 {item.storyTitle}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-200/60 dark:bg-stone-800 shrink-0">
                    {item.timeAgo}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="font-serif text-xs sm:text-[13px] font-semibold text-stone-800 dark:text-stone-200 group-hover:text-pink-600 dark:group-hover:text-pink-300 transition-colors line-clamp-1">
                    {item.chapterTitle}
                  </p>
                  {item.isLocked ? (
                    <span
                      className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-sm shrink-0 border border-amber-300/60"
                      title="Chương có cài đặt mật khẩu"
                    >
                      <Lock className="w-3 h-3" />
                      Pass
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-sm shrink-0 border border-emerald-300/60">
                      Đọc
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 rounded-xl bg-stone-50/80 dark:bg-stone-900/40 border border-dashed border-stone-200 dark:border-stone-700/80 text-center py-5">
              <span className="text-xl block mb-1">🌸</span>
              <p className="font-serif text-xs font-medium text-stone-600 dark:text-stone-300">
                Chưa có chương mới cập nhật
              </p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                Các chương truyện mới xuất bản sẽ hiển thị tại đây
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. SECTION: TRÍCH DẪN NGÔN TÌNH MÙA HÈ THANH XUÂN */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-yellow-50/50 to-pink-50/60 dark:from-stone-800 dark:via-stone-900 dark:to-amber-950/30 border border-amber-200/70 dark:border-stone-700 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Bạn xứng đáng được yêu thương
          </span>
          <button
            type="button"
            onClick={nextQuote}
            className="text-[11px] text-stone-500 hover:text-amber-600 dark:hover:text-amber-300 underline font-sans cursor-pointer"
          >
            Đổi câu khác ↻
          </button>
        </div>

        <blockquote className="space-y-2">
          <p className="font-serif text-xs sm:text-[13px] leading-relaxed text-stone-700 dark:text-stone-300 italic">
            "{SUMMER_QUOTES[activeQuoteIndex].text}"
          </p>
          <cite className="block text-right text-[11px] font-medium text-pink-600 dark:text-pink-400 not-italic">
            — {SUMMER_QUOTES[activeQuoteIndex].book}
          </cite>
        </blockquote>
      </div>
    </aside>
  );
};
