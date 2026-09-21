import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Story } from '../types';
import { BookOpen, Eye, Heart, Sparkles, Key, CheckCircle, Clock, Star, Share2 } from 'lucide-react';
import { getStoryChapters } from '../data/mockData';
import { subscribeToStoryStats, subscribeToStoryChapters, toggleStoryLike, recordStoryView } from '../lib/realtimeService';
import { stripRichText } from './common/RichTextRenderer';
import { formatDateTime, formatDateOnly, formatRelativeTime } from '../utils/dateUtils';

interface StoryCardProps {
  story: Story;
  onOpenStory?: (storyId: string) => void;
  onSelectChapter?: (storyId: string, chapterNumber: number) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({ story, onOpenStory, onSelectChapter }) => {
  const navigate = useNavigate();
  const isCompleted = story.status === 'completed';

  const [realtimeViews, setRealtimeViews] = useState<number>(story.views || 0);
  const [realtimeLikes, setRealtimeLikes] = useState<number>(story.likes || 0);
  const [ratingAvg, setRatingAvg] = useState<string>('0');
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [publishedCount, setPublishedCount] = useState<number>(() => {
    const list = getStoryChapters(story.id);
    return Math.max(story.completedChapters || 0, list.length);
  });
  const [isLiked, setIsLiked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`mel_liked_story_${story.id}`) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const list = getStoryChapters(story.id);
    setPublishedCount(Math.max(story.completedChapters || 0, list.length));

    const unsubChapters = subscribeToStoryChapters(story.id, (chs) => {
      setPublishedCount(Math.max(story.completedChapters || 0, chs.length));
    });

    const unsubscribe = subscribeToStoryStats(
      story.id,
      story.views,
      story.likes,
      (liveStats) => {
        setRealtimeViews(liveStats.views);
        setRealtimeLikes(liveStats.likes);
        if (liveStats.ratingCount > 0) {
          setRatingAvg((liveStats.ratingSum / liveStats.ratingCount).toFixed(1));
          setRatingCount(liveStats.ratingCount);
        }
      }
    );

    return () => {
      unsubscribe();
      unsubChapters();
    };
  }, [story.id, story.views, story.likes, story.completedChapters]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isLiked;
    setIsLiked(nextState);
    try {
      if (nextState) {
        localStorage.setItem(`mel_liked_story_${story.id}`, 'true');
      } else {
        localStorage.removeItem(`mel_liked_story_${story.id}`);
      }
    } catch {}
    toggleStoryLike(story.id, nextState);
  };

  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}#/bai-viet/${story.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    } else {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCardClick = () => {
    recordStoryView(story.id);
    if (onOpenStory) {
      onOpenStory(story.id);
    }
    navigate(`/bai-viet/${story.id}`);
  };

  return (
    <article
      id={`story-card-${story.id}`}
      className="group relative rounded-3xl overflow-hidden border border-pink-200/70 dark:border-stone-800 bg-white dark:bg-stone-800/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
    >
      {/* Top Banner Image with Overlay */}
      <div className="relative h-48 w-full overflow-hidden bg-stone-100 dark:bg-stone-900">
        <Link
          to={`/bai-viet/${story.id}`}
          onClick={() => recordStoryView(story.id)}
          className="block w-full h-full"
          title={`Xem chi tiết ${story.title}`}
        >
          <img
            src={story.coverImage}
            alt={story.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out cursor-pointer"
          />
        </Link>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Share / Copy Link Button on Top Right */}
        <button
          type="button"
          onClick={handleCopyLink}
          title="Sao chép link chia sẻ truyện"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer text-xs flex items-center gap-1"
        >
          <Share2 className="w-3.5 h-3.5" />
          {isCopied && <span className="text-[10px] font-sans pr-1">Đã chép link!</span>}
        </button>

        {/* Status Badge */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-xs ${
              isCompleted
                ? 'bg-emerald-500/90 text-white'
                : 'bg-sky-500/90 text-white'
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Hoàn thành (Full)</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>Đang tiến hành</span>
              </>
            )}
          </span>

          {Boolean(story.extraChaptersCount) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/90 text-white backdrop-blur-md shadow-xs">
              🌸 +{story.extraChaptersCount} ngoại
            </span>
          )}

          {story.hasPassword && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/90 text-white backdrop-blur-md">
              <Key className="w-3 h-3" />
              <span>Có pass</span>
            </span>
          )}
        </div>

        {/* Realtime Views, Likes, Rating Count on image */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-white/90 backdrop-blur-xs bg-black/50 px-2.5 py-1 rounded-xl z-10">
          <span className="flex items-center gap-1 font-mono" title="Lượt xem thực tế">
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            {realtimeViews.toLocaleString()}
          </span>

          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-1 cursor-pointer transition-transform active:scale-125 font-mono ${
              isLiked ? 'text-pink-400 font-bold' : 'hover:text-pink-300'
            }`}
            title={isLiked ? 'Đã yêu thích (Bấm để bỏ thích)' : 'Thả tim tác phẩm'}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-pink-500 text-pink-500' : 'text-pink-300'}`} />
            {realtimeLikes.toLocaleString()}
          </button>

          {ratingCount > 0 ? (
            <span className="flex items-center gap-0.5 text-amber-300 font-mono" title={`Đánh giá: ${ratingAvg}/5 (${ratingCount} lượt)`}>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{ratingAvg}</span>
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-pink-200 text-[11px]" title="Tác phẩm mới xuất bản">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Mới</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 sm:p-6 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Genre Tags */}
          <div className="flex flex-wrap gap-1.5">
            {story.genre.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 dark:bg-stone-700/60 dark:text-pink-300 border border-pink-200/50 dark:border-stone-600"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-800 dark:text-stone-100 group-hover:text-pink-600 dark:group-hover:text-pink-300 transition-colors cursor-pointer line-clamp-1">
            <Link
              to={`/bai-viet/${story.id}`}
              onClick={() => recordStoryView(story.id)}
              className="hover:underline"
            >
              {story.title}
            </Link>
          </h3>

          {/* Author & Translator */}
          <p className="text-xs text-stone-500 dark:text-stone-400 font-sans flex items-center gap-2">
            <span>Tác giả: <strong className="text-stone-700 dark:text-stone-300">{story.author}</strong></span>
            <span>•</span>
            <span>Edit: <strong className="text-pink-600 dark:text-pink-400">{story.translator}</strong></span>
          </p>

          {/* Summary */}
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-serif leading-relaxed line-clamp-3">
            {stripRichText(story.summary)}
          </p>
        </div>

        {/* Card Footer with chapter counter & Action */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-700/80 flex items-center justify-between gap-2">
          <div className="text-xs text-stone-500 dark:text-stone-400 font-sans">
            <div>
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                {publishedCount}/{story.totalChapters}
              </span>{' '}
              chương
            </div>
            {story.updatedAt ? (
              <span className="text-[10px] text-stone-400 block" title={formatDateTime(story.updatedAt)}>
                {formatRelativeTime(story.updatedAt)}
              </span>
            ) : story.publishedAt ? (
              <span className="text-[10px] text-stone-400 block" title={formatDateTime(story.publishedAt)}>
                {formatDateOnly(story.publishedAt)}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/bai-viet/${story.id}/chuong/1`}
              onClick={() => {
                recordStoryView(story.id);
                if (onSelectChapter) {
                  onSelectChapter(story.id, 1);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 dark:bg-stone-700 dark:hover:bg-pink-950/60 dark:text-pink-300 text-xs font-medium transition-colors cursor-pointer inline-flex items-center"
            >
              Đọc C.1
            </Link>
            <Link
              to={`/bai-viet/${story.id}`}
              onClick={() => {
                recordStoryView(story.id);
                if (onOpenStory) {
                  onOpenStory(story.id);
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-medium shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Văn án & Mục lục</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};
