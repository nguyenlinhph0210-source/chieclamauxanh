import React, { useState, useEffect } from 'react';
import {
  bgmEngine,
  AudioTrack,
  TRACK_LIST,
  formatSecondsToTime,
  AudioSourceType,
} from '../utils/audioPlayer';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Plus,
  Radio,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

interface BackgroundMusicBarProps {
  onOpenAuthorStudio?: () => void;
}

export const BackgroundMusicBar: React.FC<BackgroundMusicBarProps> = ({ onOpenAuthorStudio }) => {
  const { isAuthor } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>(TRACK_LIST[0]);
  const [tracks, setTracks] = useState<AudioTrack[]>(bgmEngine.getTracks());
  const [volume, setVolume] = useState(0.4);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(210);
  const [sourceType, setSourceType] = useState<AudioSourceType>('synth');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.4);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = bgmEngine.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setCurrentTrack(state.track);
      setVolume(state.volume);
      setDuration(state.duration || 210);
      setSourceType(state.sourceType);
      setIsLoading(state.isLoading);
      setLoadingProgress(state.loadingProgress || null);
      if (state.tracks) {
        setTracks(state.tracks);
      }
      if (!isSeeking) {
        setCurrentTime(state.currentTime);
      }
    });
    return unsubscribe;
  }, [isSeeking]);

  const handleTogglePlay = () => {
    bgmEngine.togglePlay();
  };

  const handleNext = () => {
    bgmEngine.nextTrack();
  };

  const handlePrev = () => {
    bgmEngine.prevTrack();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    bgmEngine.setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      bgmEngine.setVolume(prevVolume || 0.4);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      bgmEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  const handleSelectTrack = (index: number) => {
    bgmEngine.play(index);
  };

  // Seeking handlers
  const handleSeekStart = () => {
    setIsSeeking(true);
    setSeekValue(currentTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    setIsSeeking(false);
    setCurrentTime(val);
    bgmEngine.seek(val);
  };

  // Progress percentage calculation
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      id="bgm-player-widget"
      className="fixed bottom-4 sm:bottom-6 left-3 sm:left-6 z-40 transition-all duration-300 select-none"
    >
      {/* Expanded Track Selection & Controls Panel */}
      {isExpanded && (
        <div className="mb-2 p-4 rounded-3xl bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-pink-200/90 dark:border-stone-700 shadow-2xl w-80 sm:w-88 animate-in fade-in slide-in-from-bottom-2 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-pink-100 dark:border-stone-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-600 dark:text-pink-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>List nhạc nhà Mell nè ({tracks.length})</span>
            </div>
            <div className="flex items-center gap-1">
              {onOpenAuthorStudio && isAuthor && (
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenAuthorStudio();
                  }}
                  className="px-2 py-0.5 rounded-lg bg-pink-100 hover:bg-pink-200 dark:bg-pink-950 dark:hover:bg-pink-900 text-pink-700 dark:text-pink-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Thêm bài hát mới vào playlist"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Thêm nhạc</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs cursor-pointer p-1"
                title="Thu gọn"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Playing Track Info with Progress Bar */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-50/80 via-white to-amber-50/50 dark:from-stone-800 dark:via-stone-800 dark:to-stone-850 border border-pink-100 dark:border-stone-700 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-serif text-xs font-bold text-stone-800 dark:text-stone-100 truncate">
                  {currentTrack.title}
                </p>
                <p className="text-[10px] text-pink-600 dark:text-pink-400 truncate flex items-center gap-1">
                  <span>{currentTrack.artist}</span>
                  {sourceType !== 'synth' && (
                    <span className="px-1.5 py-0.2 rounded-sm bg-pink-100 dark:bg-pink-950 text-[9px] font-mono uppercase">
                      {sourceType}
                    </span>
                  )}
                  {loadingProgress && (
                    <span className="inline-flex items-center gap-1 text-[9.5px] text-amber-600 dark:text-amber-400 font-sans font-medium">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      {loadingProgress}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-[10px] font-mono text-stone-500 dark:text-stone-400 shrink-0 font-medium">
                {formatSecondsToTime(isSeeking ? seekValue : currentTime)} / {formatSecondsToTime(duration)}
              </div>
            </div>

            {/* Interactive Seek Bar */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="1"
                value={isSeeking ? seekValue : currentTime}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                className="w-full h-1.5 bg-pink-100 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-hidden"
                title="Kéo thanh này để tua đến đoạn nhạc mong muốn"
                aria-label="Tua tiến độ nhạc"
              />
              <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                <span>00:00</span>
                <span>{formatSecondsToTime(duration)}</span>
              </div>
            </div>

            {/* Quick Playback Controls */}
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-full text-stone-600 dark:text-stone-300 hover:text-pink-600 hover:bg-pink-100/50 dark:hover:bg-stone-700 cursor-pointer transition-colors"
                title="Bài trước đó"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center shadow-xs cursor-pointer transition-all"
                title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-full text-stone-600 dark:text-stone-300 hover:text-pink-600 hover:bg-pink-100/50 dark:hover:bg-stone-700 cursor-pointer transition-colors"
                title="Bài tiếp theo"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Track List */}
          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {tracks.map((t, idx) => {
              const isSelected = currentTrack.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTrack(idx)}
                  className={`w-full text-left p-2 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-pink-100/80 dark:bg-pink-950/70 text-pink-900 dark:text-pink-200 font-medium border border-pink-200 dark:border-pink-800'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="truncate min-w-0">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="text-[10px] text-stone-400 font-sans truncate">{t.artist} • {t.mood || 'Thư giãn'}</p>
                  </div>
                  {isSelected && isPlaying ? (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="w-0.5 h-3 bg-pink-500 animate-pulse rounded-full" />
                      <span className="w-0.5 h-4 bg-pink-500 animate-pulse delay-75 rounded-full" />
                      <span className="w-0.5 h-2 bg-pink-500 animate-pulse delay-150 rounded-full" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-stone-400 shrink-0 font-mono">{t.duration || '03:30'}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Volume Control */}
          <div className="pt-2 border-t border-pink-100 dark:border-stone-800 flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              className="text-stone-500 hover:text-pink-600 dark:text-stone-400 dark:hover:text-pink-400 cursor-pointer p-1"
              title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
              title={`Âm lượng: ${Math.round(volume * 100)}%`}
            />
            <span className="text-[10px] font-mono text-stone-400 w-8 text-right">
              {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
            </span>
          </div>
        </div>
      )}

      {/* Mini Docked Floating Capsule with Integrated Progress Line */}
      <div className="relative group overflow-hidden rounded-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-pink-200 dark:border-stone-700 shadow-lg hover:shadow-xl transition-all">
        {/* Subtle Live Progress Bar Bar at bottom of capsule */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="flex items-center gap-2 p-1.5 sm:p-2">
          {/* Play / Pause Toggle Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 ${
              isPlaying
                ? 'bg-gradient-to-tr from-pink-500 to-rose-500 text-white animate-pulse'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-pink-100 dark:hover:bg-stone-700'
            }`}
            title={isPlaying ? 'Tạm dừng nhạc nền' : 'Bật nhạc nền thư giãn'}
            aria-label={isPlaying ? 'Tạm dừng nhạc nền' : 'Bật nhạc nền'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Track Title, Progress Time and Equalizer Animation */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-1 sm:px-2 text-left cursor-pointer focus:outline-hidden"
            title="Bấm để mở bảng điều khiển, tua nhạc & danh sách bài hát"
          >
            {/* Animated Waveform when playing */}
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-3.5 shrink-0">
                <span className="w-1 h-3 bg-pink-500 animate-bounce rounded-full" />
                <span className="w-1 h-4.5 bg-rose-500 animate-bounce delay-100 rounded-full" />
                <span className="w-1 h-2 bg-amber-500 animate-bounce delay-200 rounded-full" />
              </div>
            ) : (
              <Music className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            )}

            <div className="flex flex-col min-w-0 max-w-[120px] sm:max-w-[170px]">
              <span className="text-[11px] sm:text-xs font-serif font-medium text-stone-800 dark:text-stone-100 truncate">
                {currentTrack.title}
              </span>
              <div className="flex items-center gap-1 text-[9px] text-pink-600 dark:text-pink-400 font-sans truncate">
                {isPlaying ? (
                  <span>
                    {formatSecondsToTime(currentTime)} / {formatSecondsToTime(duration)}
                  </span>
                ) : (
                  <span>Bấm để nghe nhạc ♪</span>
                )}
              </div>
            </div>

            <div className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 pl-1 shrink-0">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </div>
          </button>

          {/* Quick Next Track Button */}
          {isPlaying && (
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-full hover:bg-pink-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-pink-600 transition-colors cursor-pointer shrink-0"
              title="Chuyển bài tiếp theo"
              aria-label="Chuyển bài"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
