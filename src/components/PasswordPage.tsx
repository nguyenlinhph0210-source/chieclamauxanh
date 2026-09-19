import React, { useState } from 'react';
import { Story } from '../types';
import { KeyRound, ShieldCheck, Heart, Sparkles, HelpCircle, Check, AlertCircle, Lock, BookOpen } from 'lucide-react';
import { getStoryChapters } from '../data/mockData';

interface PasswordPageProps {
  stories: Story[];
  onOpenStory: (storyId: string) => void;
}

export const PasswordPage: React.FC<PasswordPageProps> = ({ stories, onOpenStory }) => {
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
        message: `🌸 Giỏi quá bồ uiiii! Mật khẩu của "${selectedItem.chapter.title}" đúng rùi nè. Chúc bồ đọc truyện vui vẻ nha!`,
      });
    } else {
      setTestResult({
        success: false,
        message: 'Sai mất rùi bồ ơi. Hãy đọc lại gợi ý riêng của chương này và kiểm tra lại nha!',
      });
    }
  };

  return (
    <div id="password-guide-page" className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Letter Note */}
      <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50/80 to-pink-50/70 dark:from-stone-800 dark:via-stone-900 dark:to-amber-950/40 border border-amber-200 dark:border-stone-700 shadow-sm space-y-4">
        {/* Envelope tape */}
        <div className="absolute -top-3 left-10 w-24 h-6 bg-amber-300/80 dark:bg-amber-700/80 rotate-[-1deg] rounded-xs shadow-2xs border-y border-white/60" />

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-800 dark:text-stone-100">
              Góc Hướng Dẫn & Gợi Ý Password
            </h1>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-serif italic">
              Một vài gợi ý nho nhỏ để nhận và đọc thư nhaaa
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 dark:bg-stone-800/80 border border-amber-100 dark:border-stone-700 space-y-3">
          <h2 className="font-serif text-base font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Tại sao nhà Mel lại cài mật khẩu?</span>
          </h2>
          <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300 font-sans">
            Truyện trong nhà được chuyển ngữ với mục đích phi lợi nhuận. Tất cả các truyện ĐỀU CÓ PASS, kể cả truyện không set VIP. Việc cài password là để <em>bảo vệ công sức của cả tác giả lẫn dịch giả</em>, tránh bị reup.
          </p>
        </div>
      </div>

      {/* 4 Golden Rules for Password */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            num: '01',
            title: 'Không chia sẻ hay public password',
            desc: 'Mong mọi người không share password ra ngoài, pass siêu dễ lấy nên mình bí mật với nhau thui nha.',
            icon: 'abc',
          },
          {
            num: '02',
            title: 'Password đặc biệt',
            desc: 'Để lấy password, mọi người vui lòng ủng hộ tác giả và tác phẩm gốc tại Douban, Qidian, Jjwxc. Các truyện có pass đặc biệt tớ đã note kỹ trong giới thiệu truyện.',
            icon: '🌸',
          },
          {
            num: '03',
            title: 'Hỏi về Pass',
            desc: 'Chỉ chấp nhận comment, tin nhắn hỏi về pass một cách lịch sự. Ngoài ra mật khẩu không khó, mọi người không hỏi khi không cần thiết nhaa.',
            icon: '✏️',
          },
          {
            num: '04',
            title: 'Cách set pass',
            desc: 'Với các truyện trả phí, tớ sẽ set pass từ chương VIP trở đi, các truyện miễn phí tớ sẽ set pass ngoại truyện và các chương ngẫu nhiên.',
            icon: '📖',
          },
        ].map((rule) => (
          <div
            key={rule.num}
            className="p-5 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs space-y-2 relative overflow-hidden"
          >
            <span className="text-2xl font-serif font-bold text-amber-500/40 block">
              {rule.num}
            </span>
            <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-100">
              {rule.title}
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-sans">
              {rule.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Table of Chapter Password Hints */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-700 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-serif text-xl font-bold text-stone-800 dark:text-stone-100">
              Bảng Gợi Ý Pass Từng Chương Truyện
            </h2>
          </div>
          <span className="text-xs text-pink-600 dark:text-pink-400 font-serif italic">
            {lockedChapters.length} chương có mật khẩu
          </span>
        </div>

        <div className="space-y-3">
          {lockedChapters.map(({ story, chapter }) => (
            <div
              key={`${story.id}-${chapter.id}`}
              className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/70 dark:border-stone-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300">
                    {story.title}
                  </span>
                  <div className="flex items-center gap-1.5 font-serif text-sm sm:text-base font-bold text-stone-800 dark:text-stone-100">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{chapter.title}</span>
                  </div>
                </div>
                <p className="text-xs sm:text-[13px] text-stone-700 dark:text-stone-300 font-serif italic pl-1">
                  <strong>Gợi ý:</strong> "{chapter.passwordHint || story.passwordHint || 'Gợi ý nằm trong nội dung các chương trước'}"
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenStory(story.id)}
                className="self-start sm:self-center px-4 py-2 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-800 dark:bg-stone-700 dark:hover:bg-pink-950/60 dark:text-pink-300 text-xs font-medium transition-colors cursor-pointer shrink-0"
              >
                Đến đọc chương này →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Pass Testing Simulator */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-pink-50/80 to-amber-50/80 dark:from-stone-900 dark:to-stone-800 border border-pink-200 dark:border-stone-700 shadow-xs space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <span>Hộp kiểm tra thử Password từng chương</span>
            <span className="text-base">🧪</span>
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-300 font-sans">
            Nàng chọn đúng chương muốn đọc và thử gõ câu trả lời vào đây xem đã đúng định dạng của nhà Mel chưa nhé!
          </p>
        </div>

        <form onSubmit={handleTestPass} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label htmlFor="test-story-select" className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Chọn chương truyện để test:
              </label>
              <select
                id="test-story-select"
                value={selectedTargetId}
                onChange={(e) => {
                  setSelectedTargetId(e.target.value);
                  setTestResult(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-100 text-xs sm:text-sm"
              >
                {lockedChapters.map(({ story, chapter, uniqueId }) => (
                  <option key={uniqueId} value={uniqueId}>
                    [{story.title}] {chapter.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5">
              <label htmlFor="test-password-input" className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">
                Nhập câu trả lời của bạn:
              </label>
              <input
                id="test-password-input"
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="mật khẩu không dấu, không cách..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-100 text-xs sm:text-sm focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-medium text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              >
                Kiểm tra
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-2xl flex items-start gap-3 border text-xs sm:text-sm ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
              }`}
            >
              {testResult.success ? (
                <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <p className="font-serif leading-relaxed">{testResult.message}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
