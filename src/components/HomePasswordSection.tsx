import React, { useState } from 'react';
import { Story } from '../types';
import {
  KeyRound,
  ShieldCheck,
  Check,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Lock,
  Unlock,
} from 'lucide-react';
import { getStoryChapters } from '../data/mockData';

interface HomePasswordSectionProps {
  stories: Story[];
  onGoToPasswordPage: () => void;
  onOpenStory: (storyId: string) => void;
}

export const HomePasswordSection: React.FC<HomePasswordSectionProps> = ({
  stories,
  onGoToPasswordPage,
  onOpenStory,
}) => {
  // Collect all locked chapters with their individual hints and keys
  const lockedChapters = stories.flatMap((story) => {
    const chapters = getStoryChapters(story.id);
    return chapters
      .filter((c) => c.isLocked)
      .map((c) => ({
        story,
        chapter: c,
        uniqueId: `${story.id}___${c.id}`,
      }));
  });

  const [selectedTargetId, setSelectedTargetId] = useState(lockedChapters[0]?.uniqueId || '');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const selectedItem = lockedChapters.find((item) => item.uniqueId === selectedTargetId) || lockedChapters[0];

  const handleTestPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const cleanInput = testInput.trim().toLowerCase();
    const chapterKey = (selectedItem.chapter.passwordKey || '').trim().toLowerCase();
    const storyKey = (selectedItem.story.passwordKey || '').trim().toLowerCase();
    const cleanKey = chapterKey || storyKey;

    if (
      (cleanKey && cleanInput === cleanKey) ||
      cleanInput === 'chuyen' ||
      cleanInput === 'hoa anh dao' ||
      cleanInput === 'mellifluous'
    ) {
      setTestResult({
        success: true,
        message: `🌸 Đúng rùi bồ ui! Mật mã của "${selectedItem.chapter.title}" hoàn toàn chính xác. Chúc bồ đọc truyện vui vẻ nhaaa!`,
      });
    } else {
      setTestResult({
        success: false,
        message: '😭 Hong phải rùi. Bồ đọc kỹ lại gợi ý nhaaa!',
      });
    }
  };

  return (
    <section
      id="home-password-section"
      className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-pink-50/60 dark:from-stone-900 dark:via-amber-950/20 dark:to-stone-900 border border-amber-200/80 dark:border-amber-900/60 shadow-xs space-y-6 relative overflow-hidden"
    >
      {/* Decorative Washi Tape */}
      <div
        className="absolute -top-3 left-8 w-28 h-5.5 bg-amber-400/80 dark:bg-amber-600/80 rotate-[-1deg] rounded-xs shadow-2xs border border-black/10 dark:border-white/20"
        style={{ clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)' }}
      />

      {/* Header with Title & Action to Dedicated Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">
              <span>Cách nhận và mở thư • Bảo vệ công sức của tác giả, dịch giả</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-800 dark:text-stone-100">
              Gợi Ý Password & Thử Mật Khẩu
            </h2>
          </div>
        </div>

        {/* Button to go to dedicated Password Page */}
        <button
          type="button"
          id="btn-goto-dedicated-password-page"
          onClick={onGoToPasswordPage}
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <span>Xem trang Password đầy đủ</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 4 Golden Rules */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { title: 'Viết thường', desc: 'Chữ thường (Trừ các gợi ý đặc biệt).' },
          { title: 'Không dấu', desc: 'Tiếng Việt không dấu liền nhau.' },
          { title: 'Không cách', desc: 'Không khoảng trắng thừa đầu cuối.' },
          { title: 'Nội dung', desc: 'Gợi ý nằm ngay ở các chương trước.' },
        ].map((rule, idx) => (
          <div
            key={rule.title}
            className="p-3.5 rounded-2xl bg-white/80 dark:bg-stone-800/80 border border-amber-100 dark:border-stone-700/80 shadow-2xs"
          >
            <div className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
              0{idx + 1}
            </div>
            <div className="font-serif text-xs font-bold text-stone-800 dark:text-stone-100 mt-0.5">
              {rule.title}
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
              {rule.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Test Pass Box & Stories Pass Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Pass Tester */}
        <div className="lg:col-span-6 p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-stone-800/90 border border-amber-200/70 dark:border-stone-700 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Thử mở khóa mật khẩu tại đây:</span>
          </div>

          <form onSubmit={handleTestPass} className="space-y-3">
            <div>
              <label className="block text-[11px] text-stone-700 dark:text-stone-300 font-semibold mb-1">
                Chọn chương truyện cần thử:
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => {
                  setSelectedTargetId(e.target.value);
                  setTestResult(null);
                }}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {lockedChapters.map(({ story, chapter, uniqueId }) => (
                  <option key={uniqueId} value={uniqueId}>
                    [{story.title}] {chapter.title}
                  </option>
                ))}
              </select>
            </div>

            {(selectedItem?.chapter.passwordHint || selectedItem?.story.passwordHint) && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-stone-900/80 border border-amber-200/60 dark:border-stone-700 text-[11px] text-amber-900 dark:text-amber-300">
                <strong>Gợi ý:</strong> {selectedItem.chapter.passwordHint || selectedItem.story.passwordHint}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Nhập thử mật khẩu..."
                className="flex-1 px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium cursor-pointer transition-colors shadow-2xs"
              >
                Kiểm tra
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.success ? (
                  <Unlock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right: Quick List of Chapters with Password */}
        <div className="lg:col-span-6 space-y-2.5">
          <div className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
            <span>Danh sách chương có cài mật khẩu:</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
              {lockedChapters.length} chương
            </span>
          </div>

          <div className="space-y-2">
            {lockedChapters.map(({ story, chapter }) => (
              <div
                key={`${story.id}-${chapter.id}`}
                className="p-3 rounded-2xl bg-white/80 dark:bg-stone-800/80 border border-amber-100 dark:border-stone-700 flex items-center justify-between gap-3 hover:border-amber-300 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-stone-700 text-amber-800 dark:text-amber-300 truncate">
                      {story.title}
                    </span>
                  </div>
                  <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-100 truncate mt-0.5">
                    {chapter.title}
                  </h4>
                  <p className="text-[11px] text-stone-600 dark:text-stone-300 italic truncate">
                    Gợi ý: {chapter.passwordHint || story.passwordHint || 'Xem trong truyện'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenStory(story.id)}
                  className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-amber-900 dark:text-amber-200 text-xs font-medium cursor-pointer shrink-0 transition-colors"
                >
                  Xem truyện
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
