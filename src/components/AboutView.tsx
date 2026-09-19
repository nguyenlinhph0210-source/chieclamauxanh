import React from 'react';
import { Compass, Sparkles, Heart, Shield, BookOpen, Coffee, Feather } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div id="about-mellifluous-view" className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Intro Header */}
      <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-stone-800 border border-pink-200/80 dark:border-stone-700 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-36 h-36 rounded-full p-2 bg-gradient-to-tr from-pink-200 via-rose-100 to-amber-200 dark:from-pink-950 dark:to-stone-700 shadow-md shrink-0">
            <div className="w-full h-full rounded-full bg-white dark:bg-stone-800 flex items-center justify-center text-4xl shadow-inner select-none">
              🌸
            </div>
          </div>

          <div className="space-y-3 text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-950/80 text-pink-800 dark:text-pink-300 text-xs font-medium">
              <Sparkles className="w-3 h-3 text-pink-500" />
              <span>Chủ nhà Mellifluous</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-800 dark:text-stone-100">
              Xin chào, tớ là Mellifluous
            </h1>
            <p className="font-serif italic text-pink-600 dark:text-pink-400 font-medium">
              ━ Một chiếc thuyền nhỏ lênh đênh ngược gió
            </p>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-sans leading-relaxed">
              ━Mell là một genZ chính hiệu, đuôi 07, còn là học sinh ngồi trên ghế nhà trường
              ━Một cô bé cung Bảo Bình, thích mộng mơ và làm bạn với con chữ
              ━Blog lập ra với mục đích thỏa mãn đam mê đọc truyện, đồng thời là nơi tớ luyện ngoại ngữ để sau này còn có cái để phục vụ học tập và làm việc
              ━Mell vừa edit, vừa dịch, làm phi lợi nhuận, đa số là chưa được sự đồng ý của tác giả 
              ━Truyện trong nhà đều dựa theo gu truyện cá nhân của tớ, mong mọi người sẽ tôn trọng điều đó ạ
            </p>
          </div>
        </div>
      </div>

      {/* Philosophy & Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-pink-50/70 dark:bg-stone-800/80 border border-pink-200 dark:border-stone-700 space-y-2">
          <div className="p-2 w-fit rounded-xl bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-100">
            ĐẢM BẢO ĐỌC TẠI WEB CHÍNH CHỦ
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-300 font-sans leading-relaxed">
            Truyện Mell edit và dịch đăng tại TRANG WEB NÀY, WORPRESS, WATTPAD chính chủ, truyện được đăng tải tại mọi nơi khác đều không thuộc quyền quản lý của tớ và sẽ không do tớ chịu trách nhiệm
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-stone-800/80 border border-amber-200 dark:border-stone-700 space-y-2">
          <div className="p-2 w-fit rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-100">
            KHÔNG REUP & CHUYỂN VER
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-300 font-sans leading-relaxed">
            Tất cả truyện được chuyển ngữ phi lợi nhuận. Mật khẩu được cài đặt chỉ nhằm bảo vệ chất xám của tác giả cũng như người dịch, tránh tình trạng reup tràn lan.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-sky-50/70 dark:bg-stone-800/80 border border-sky-200 dark:border-stone-700 space-y-2">
          <div className="p-2 w-fit rounded-xl bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300">
            <Coffee className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-base font-bold text-stone-800 dark:text-stone-100">
            LỜI CẢM ƠN CỦA MELL
          </h3>
          <p className="text-xs text-stone-600 dark:text-stone-300 font-sans leading-relaxed">
            Cảm ơn các tình iu đã ghé qua và ở lại với Mell, mỗi bình luận, lượt đánh giá và lượt thả tim của các tình iu chính là nguồn động lực lớn nhất để Mell tiếp tục chèo lái chiếc thuyền nhỏ này.
          </p>
        </div>
      </div>
    </div>
  );
};
