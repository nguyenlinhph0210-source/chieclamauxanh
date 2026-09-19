import React, { useState, useEffect } from 'react';
import {
  Database,
  Github,
  Server,
  Flame,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  GitBranch,
  Layers,
  Sparkles,
  Info,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  getGithubConfig,
  saveGithubConfig,
  testGithubConnection,
  testGithubWrite,
  commitGithubDataFile,
  fetchRawGithubJson,
  backupInteractiveDataToGithub,
  GithubConfig,
} from '../../lib/githubSyncService';
import {
  generateFullBackup,
  downloadBackupFile,
  restoreFromBackup,
  MellifluousFullBackup,
} from '../../lib/dataBackupService';
import {
  getLiveChaptersRuntimeCache,
  getStoryChapters,
  isAnnouncementDeleted,
} from '../../data/mockData';
import { getStoredStories, getStoredAnnouncements, saveStoredAnnouncements, syncAllLocalToFirestore } from '../../lib/realtimeService';
import {
  isFirestoreEnabled,
  setFirestoreEnabled,
  resetFirestoreQuotaExhaustion,
} from '../../lib/firebase';
import { getApiBaseUrl, buildApiUrl, hasBackendServer, isStaticHosting, saveCustomBackendUrl } from '../../lib/apiConfig';
import { Story, Chapter, Announcement } from '../../types';
import { bgmEngine, AudioTrack } from '../../utils/audioPlayer';

interface AuthorSyncTabProps {
  onFeedback: (type: 'success' | 'error', text: string) => void;
  onRefreshAllData?: () => void;
}

export const AuthorSyncTab: React.FC<AuthorSyncTabProps> = ({ onFeedback, onRefreshAllData }) => {
  // GitHub state
  const [ghConfig, setGhConfig] = useState<GithubConfig>(() => getGithubConfig());
  const [githubTokenInput, setGithubTokenInput] = useState<string>(() => getGithubConfig().token);
  const [githubRepoInput, setGithubRepoInput] = useState<string>(() => getGithubConfig().repo);
  const [githubBranchInput, setGithubBranchInput] = useState<string>(() => getGithubConfig().branch);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => getGithubConfig().autoSync);
  const [isAutoBatchSyncEnabled, setIsAutoBatchSyncEnabled] = useState<boolean>(() => getGithubConfig().autoBatchSync !== false);
  const [isBackingUpInteractive, setIsBackingUpInteractive] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isTestingGithub, setIsTestingGithub] = useState(false);
  const [isTestingWrite, setIsTestingWrite] = useState(false);
  const [githubTestResult, setGithubTestResult] = useState<{
    success: boolean;
    message: string;
    username?: string;
  } | null>(null);
  const [testWriteResult, setTestWriteResult] = useState<{
    success: boolean;
    message: string;
    commitUrl?: string;
  } | null>(null);

  // Server state
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [customBackendUrl, setCustomBackendUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('mel_backend_api_url') || '';
    } catch {
      return '';
    }
  });

  // Firestore state
  const [firestoreActive, setFirestoreActive] = useState<boolean>(() => isFirestoreEnabled());
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);

  // Action loading states
  const [isSyncingToGithub, setIsSyncingToGithub] = useState(false);
  const [isPullingFromGithub, setIsPullingFromGithub] = useState(false);
  const [isRestoringFile, setIsRestoringFile] = useState(false);

  // Sync All Local Data to Firestore handler
  const handleSyncAllToFirestore = async () => {
    setIsSyncingFirestore(true);
    try {
      const res = await syncAllLocalToFirestore();
      if (res.success) {
        setFirestoreActive(true);
        onFeedback(
          'success',
          `Đã đồng bộ thành công ${res.storiesCount} tác phẩm, ${res.chaptersCount} chương, ${res.commentsCount || 0} bình luận và ${res.lettersCount || 0} tâm thư lên Firestore!`
        );
      } else {
        onFeedback(
          'error',
          `Đồng bộ Firestore chưa hoàn tất (${res.error}). Quota Google hôm nay có thể chưa mở lại.`
        );
      }
    } catch {
      onFeedback('error', 'Lỗi khi gửi dữ liệu lên Firestore.');
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  // Auto-persist GitHub config whenever user edits input fields
  useEffect(() => {
    const updated = saveGithubConfig({
      repo: githubRepoInput.trim(),
      branch: githubBranchInput.trim(),
      token: githubTokenInput.trim(),
      autoSync: isAutoSyncEnabled,
    });
    setGhConfig(updated);
  }, [githubRepoInput, githubBranchInput, githubTokenInput, isAutoSyncEnabled]);

  // Test Server connection on mount or when customBackendUrl changes
  useEffect(() => {
    const checkServer = async () => {
      if (!hasBackendServer()) {
        setServerStatus('disconnected');
        return;
      }
      try {
        const res = await fetch(buildApiUrl('/api/health'), { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          setServerStatus('connected');
        } else {
          setServerStatus('disconnected');
        }
      } catch {
        setServerStatus('disconnected');
      }
    };
    checkServer();
  }, [customBackendUrl]);

  // Save Custom Backend URL handler
  const handleSaveBackendUrl = (newUrl: string) => {
    const trimmed = newUrl.trim();
    saveCustomBackendUrl(trimmed);
    setCustomBackendUrl(trimmed);
    if (trimmed) {
      onFeedback('success', `Đã cấu hình máy chủ ngoài: ${trimmed}. Đang kiểm tra kết nối...`);
    } else {
      onFeedback('success', 'Đã chuyển về chế độ Tĩnh (GitHub Raw CDN) – Triệt tiêu hoàn toàn lỗi 404!');
    }
  };

  // Save GitHub Config handler
  const handleSaveGithubConfig = () => {
    const updated = saveGithubConfig({
      repo: githubRepoInput.trim(),
      branch: githubBranchInput.trim(),
      token: githubTokenInput.trim(),
      autoSync: isAutoSyncEnabled,
      autoBatchSync: isAutoBatchSyncEnabled,
    });
    setGhConfig(updated);
    onFeedback('success', 'Đã lưu cấu hình GitHub vào bộ nhớ an toàn!');
  };

  // Manual trigger for batch backup of interactive data (Comments, Letters, Stats)
  const handleBackupInteractive = async () => {
    handleSaveGithubConfig();
    setIsBackingUpInteractive(true);
    try {
      const res = await backupInteractiveDataToGithub();
      if (res.success) {
        setGhConfig(getGithubConfig());
        onFeedback(
          'success',
          `Đã gom đợt và sao lưu an toàn ${res.commentsCount} bình luận và ${res.lettersCount} thư tâm tình lên GitHub!`
        );
      } else {
        onFeedback('error', res.error || 'Lỗi khi sao lưu dữ liệu tương tác lên GitHub');
      }
    } catch (err: any) {
      onFeedback('error', 'Có lỗi xảy ra: ' + (err?.message || err));
    } finally {
      setIsBackingUpInteractive(false);
    }
  };

  // Test GitHub Connection handler
  const handleTestGithub = async () => {
    handleSaveGithubConfig();
    setIsTestingGithub(true);
    setGithubTestResult(null);

    const result = await testGithubConnection();
    setIsTestingGithub(false);
    setGithubTestResult(result);

    if (result.success && result.canWrite) {
      onFeedback('success', result.message);
    } else {
      onFeedback('error', result.message);
    }
  };

  // Test Direct Write Permission (Live Commit Test)
  const handleTestWrite = async () => {
    handleSaveGithubConfig();
    setIsTestingWrite(true);
    setTestWriteResult(null);

    const result = await testGithubWrite();
    setIsTestingWrite(false);
    setTestWriteResult(result);

    if (result.success) {
      onFeedback('success', result.message);
    } else {
      onFeedback('error', result.message);
    }
  };

  // Push ALL current data to GitHub
  const handlePushAllToGithub = async () => {
    if (!githubTokenInput.trim()) {
      onFeedback('error', 'Vui lòng nhập GitHub Personal Access Token để có quyền ghi dữ liệu lên repository.');
      return;
    }

    setIsSyncingToGithub(true);
    try {
      handleSaveGithubConfig();
      const stories = getStoredStories();
      const rawChapters = getLiveChaptersRuntimeCache();
      const fullChapters: Record<string, Chapter[]> = {};
      stories.forEach((s) => {
        fullChapters[s.id] = rawChapters[s.id] || getStoryChapters(s.id) || [];
      });

      const announcements: Announcement[] = getStoredAnnouncements();

      // 1. Stories
      const resStories = await commitGithubDataFile('stories.json', stories, 'Đồng bộ toàn bộ danh sách truyện [skip ci]');
      if (!resStories.success) throw new Error(`Lỗi cập nhật stories.json: ${resStories.error}`);

      // 2. Chapters
      const resChapters = await commitGithubDataFile('chapters.json', fullChapters, 'Đồng bộ toàn bộ các chương truyện [skip ci]');
      if (!resChapters.success) throw new Error(`Lỗi cập nhật chapters.json: ${resChapters.error}`);

      // 3. Announcements
      await commitGithubDataFile('announcements.json', announcements, 'Đồng bộ thông báo [skip ci]');

      // 4. Playlist
      const playlist = bgmEngine.getTracks();
      await commitGithubDataFile('playlist.json', playlist, 'Đồng bộ danh sách nhạc nền [skip ci]');

      onFeedback('success', 'Đã đồng bộ thành công toàn bộ Truyện, Chương, Thông báo và Nhạc nền lên GitHub repository!');
    } catch (err: any) {
      onFeedback('error', err?.message || 'Có lỗi xảy ra khi đẩy dữ liệu lên GitHub');
    } finally {
      setIsSyncingToGithub(false);
    }
  };

  // Pull latest data from GitHub
  const handlePullFromGithub = async () => {
    setIsPullingFromGithub(true);
    try {
      const [remoteStories, remoteChapters, remoteAnnouncements, remotePlaylist] = await Promise.all([
        fetchRawGithubJson<Story[]>('stories.json'),
        fetchRawGithubJson<Record<string, Chapter[]>>('chapters.json'),
        fetchRawGithubJson<Announcement[]>('announcements.json'),
        fetchRawGithubJson<AudioTrack[]>('playlist.json'),
      ]);

      let updatedCount = 0;
      if (Array.isArray(remoteStories) && remoteStories.length > 0) {
        localStorage.setItem('mel_published_stories', JSON.stringify(remoteStories));
        updatedCount += remoteStories.length;
      }

      if (remoteChapters && typeof remoteChapters === 'object') {
        for (const [storyId, chList] of Object.entries(remoteChapters)) {
          if (Array.isArray(chList)) {
            localStorage.setItem(`mel_chapters_${storyId}`, JSON.stringify(chList));
          }
        }
      }

      if (Array.isArray(remoteAnnouncements)) {
        const cleanRemote = remoteAnnouncements.filter((a) => !isAnnouncementDeleted(a.id));
        saveStoredAnnouncements(cleanRemote);
      }

      if (Array.isArray(remotePlaylist) && remotePlaylist.length > 0) {
        bgmEngine.mergeTracks(remotePlaylist);
      }

      onFeedback('success', `Đã kéo thành công dữ liệu từ GitHub (${updatedCount} truyện)! Đang làm mới giao diện...`);
      if (onRefreshAllData) onRefreshAllData();
      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (err: any) {
      onFeedback('error', 'Không thể kéo dữ liệu từ GitHub: ' + (err?.message || err));
    } finally {
      setIsPullingFromGithub(false);
    }
  };

  // Import JSON backup file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as MellifluousFullBackup;
        const result = restoreFromBackup(json);
        onFeedback(
          'success',
          `Khôi phục thành công: ${result.storiesCount} truyện, ${result.chaptersCount} chương và ${result.announcementsCount} thông báo!`
        );
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err: any) {
        onFeedback('error', 'Tệp sao lưu không hợp lệ: ' + (err?.message || err));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Overview Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-pink-50/80 dark:bg-stone-800/80 border border-pink-200/80 dark:border-stone-700 space-y-2.5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-pink-100 dark:bg-stone-700 text-pink-700 dark:text-pink-300 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-stone-850 dark:text-stone-100">
              Giải pháp Lưu trữ & Đồng bộ Dữ liệu Độc lập
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mt-1">
              Do Firestore cũ đã hết hạn mức Quota miễn phí, hệ thống hiện được tối ưu để hoạt động trực tiếp qua{' '}
              <strong className="text-pink-600 dark:text-pink-400 font-semibold">GitHub Repository</strong> và{' '}
              <strong className="text-stone-800 dark:text-stone-200 font-semibold">Máy chủ Server Node.js/Express</strong>.
              Đảm bảo 100% miễn phí vĩnh viễn, không bị giới hạn gói Blaze, không bao giờ bị lệch dữ liệu hay mất chương truyện.
            </p>
          </div>
        </div>
      </div>

      {/* STORAGE ENGINES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: GitHub Pages & Repository */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 space-y-3 flex flex-col justify-between shadow-2xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4 text-stone-800 dark:text-stone-200" />
                <span className="font-serif text-sm font-bold text-stone-800 dark:text-stone-100">
                  GitHub Repository
                </span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  githubTokenInput
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {githubTokenInput ? 'Đã có Token' : 'Chưa có Token'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Lưu trực tiếp vào repository GitHub. Độc giả đọc từ GitHub Raw CDN siêu nhanh và không giới hạn.
            </p>
          </div>
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-400">
            <span>Repo: <code className="text-pink-600 dark:text-pink-400">{githubRepoInput.split('/')[1] || githubRepoInput}</code></span>
            <span className="text-emerald-600 font-medium">Khuyên dùng</span>
          </div>
        </div>

        {/* Card 2: Server API (Primary Engine) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border-2 border-emerald-500/40 dark:border-emerald-500/30 space-y-3 flex flex-col justify-between shadow-xs relative">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-serif text-sm font-bold text-stone-800 dark:text-stone-100">
                  Server Engine (Chính)
                </span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  serverStatus === 'connected'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {serverStatus === 'connected' ? 'Đang hoạt động (Ưu tiên)' : 'Đang kết nối lại'}
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Xử lý 100% bình luận, lượt thích, phản hồi, số liệu thống kê (lượt xem, theo dõi, đánh giá) và đồng bộ thời gian thực SSE. Hoàn toàn không lo hết hạn ngạch.
            </p>
          </div>
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-400">
            <span>Dữ liệu: <code className="text-emerald-600 dark:text-emerald-400 font-mono">data/*.json</code></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tốc độ cao & Bền vững</span>
          </div>
        </div>

        {/* Card 3: Firebase Firestore */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 space-y-3 flex flex-col justify-between shadow-2xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="font-serif text-sm font-bold text-stone-800 dark:text-stone-100">
                  Firestore Cloud
                </span>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  firestoreActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {firestoreActive ? 'Đang kích hoạt' : 'Tạm tắt (Offline-First)'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Dự án: <code className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">gen-lang-client-0187202886</code><br />
              Cơ sở dữ liệu: <code className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">ai-studio-thegioicuaem...</code>
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Gói Spark miễn phí có hạn mức 50.000 đọc / 20.000 ghi mỗi ngày. Khi vượt hạn mức, blog tự động chuyển sang chế độ Local & Server an toàn mà không làm mất dữ liệu.
            </p>
          </div>
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-400">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isSyncingFirestore}
                onClick={handleSyncAllToFirestore}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium cursor-pointer transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 shadow-2xs text-[11px]"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
                <span>{isSyncingFirestore ? 'Đang đẩy lên mây...' : 'Đẩy toàn bộ lên Firestore'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !firestoreActive;
                  setFirestoreActive(next);
                  setFirestoreEnabled(next);
                  onFeedback(
                    next ? 'success' : 'error',
                    next ? 'Đã kích hoạt lại Firestore' : 'Đã chuyển sang chế độ Local/Server an toàn'
                  );
                }}
                className="text-pink-600 hover:underline cursor-pointer font-medium"
              >
                {firestoreActive ? 'Tắt Firestore' : 'Bật lại Firestore'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetFirestoreQuotaExhaustion();
                  setFirestoreActive(true);
                  setFirestoreEnabled(true);
                  onFeedback('success', 'Đã xóa bộ nhớ đệm hạn ngạch. Đang thử kết nối lại Firestore!');
                }}
                className="text-emerald-600 hover:underline cursor-pointer font-medium"
              >
                Xóa cache Quota
              </button>
            </div>
            <a
              href="https://console.firebase.google.com/project/gen-lang-client-0187202886/firestore/databases/ai-studio-thegioicuaem-b7c7b641-4999-40b9-94b5-153b75e5cc27/data?openUpgradeDialog=true"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-600 hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              <span>Xem / Nâng hạn mức</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* GITHUB REPOSITORY CONFIGURATION SECTION */}
      <div className="p-5 sm:p-6 rounded-2xl bg-stone-50/70 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-serif text-base font-bold text-stone-850 dark:text-stone-100 flex items-center gap-2">
              <Github className="w-5 h-5 text-stone-800 dark:text-stone-100" />
              <span>Cấu hình Đồng bộ Tự động với GitHub Pages</span>
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
              Nhập Personal Access Token (PAT) để mỗi khi bạn Đăng truyện, Đăng chương hay Sửa đổi, dữ liệu sẽ được commit thẳng vào repository.
            </p>
          </div>

          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=Mellifluous%20Blog%20Sync"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200/80 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 text-xs font-semibold shrink-0 cursor-pointer transition-colors"
          >
            <span>Lấy GitHub Token trong 30s</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Repository */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Kho lưu trữ GitHub (Owner/Repo)
            </label>
            <input
              type="text"
              value={githubRepoInput}
              onChange={(e) => setGithubRepoInput(e.target.value)}
              placeholder="maianhpham927-glitch/mellifluous"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
            />
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
              Nhánh xuất bản (Branch)
            </label>
            <input
              type="text"
              value={githubBranchInput}
              onChange={(e) => setGithubBranchInput(e.target.value)}
              placeholder="main"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
            />
          </div>
        </div>

        {/* Token Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-pink-600" />
              <span>GitHub Personal Access Token (PAT)</span>
            </label>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              Yêu cầu quyền: <code className="text-pink-600 font-semibold">repo</code> hoặc <code className="text-pink-600 font-semibold">contents:write</code>
            </span>
          </div>

          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={githubTokenInput}
              onChange={(e) => setGithubTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-850 text-stone-800 dark:text-stone-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Token được lưu an toàn trong trình duyệt cục bộ của tác giả, không công khai cho độc giả.
          </p>
        </div>

        {/* Auto Sync Toggle */}
        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="autoSyncToggle"
            checked={isAutoSyncEnabled}
            onChange={(e) => setIsAutoSyncEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-stone-300 dark:border-stone-600 cursor-pointer"
          />
          <label htmlFor="autoSyncToggle" className="text-xs text-stone-700 dark:text-stone-300 font-medium cursor-pointer">
            Tự động commit lên GitHub mỗi khi xuất bản hoặc sửa đổi truyện/chương mới
          </label>
        </div>

        {/* Auto Batch Sync Toggle */}
        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="autoBatchSyncToggle"
            checked={isAutoBatchSyncEnabled}
            onChange={(e) => setIsAutoBatchSyncEnabled(e.target.checked)}
            className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-stone-300 dark:border-stone-600 cursor-pointer"
          />
          <label htmlFor="autoBatchSyncToggle" className="text-xs text-stone-700 dark:text-stone-300 font-medium cursor-pointer">
            Tự động gom đợt định kì mỗi 15-20 phút (sao lưu bình luận, tâm thư & thống kê lên GitHub)
          </label>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-200/80 dark:border-stone-700/80">
          <button
            type="button"
            onClick={handleSaveGithubConfig}
            className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
          >
            Lưu cấu hình GitHub
          </button>

          <button
            type="button"
            onClick={handleTestGithub}
            disabled={isTestingGithub || !githubTokenInput.trim()}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-100 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isTestingGithub ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>Kiểm tra kết nối</span>
          </button>

          <button
            type="button"
            onClick={handleTestWrite}
            disabled={isTestingWrite || !githubTokenInput.trim()}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            {isTestingWrite ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Thử cam kết (Commit Test)</span>
          </button>

          {githubTestResult && (
            <span
              className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
                githubTestResult.success
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {githubTestResult.success ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>{githubTestResult.message}</span>
            </span>
          )}

          {testWriteResult && (
            <span
              className={`text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
                testWriteResult.success
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {testWriteResult.success ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>{testWriteResult.message}</span>
              {testWriteResult.commitUrl && (
                <a
                  href={testWriteResult.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-bold ml-1 hover:text-purple-900"
                >
                  Xem commit
                </a>
              )}
            </span>
          )}
        </div>
      </div>

      {/* BATCH INTERACTION SYNC (GOM ĐỢT ĐỊNH KÌ LÊN GITHUB) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-pink-200 dark:border-stone-700 space-y-4 shadow-2xs">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-100 dark:bg-stone-700 text-pink-700 dark:text-pink-300">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-bold text-stone-850 dark:text-stone-100 flex items-center gap-2">
                <span>Cơ chế Gom đợt & Sao lưu Tương tác Độc giả</span>
                <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/60 text-pink-700 dark:text-pink-300 text-[10px] font-semibold">
                  100% Tự động & Không cần độc giả đăng nhập
                </span>
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Bình luận, lượt xem và thư của bạn đọc được lưu trữ tức thì và gom đợt đẩy lên GitHub Repository.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBackupInteractive}
            disabled={isBackingUpInteractive || !githubTokenInput.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-2xs shrink-0 self-stretch sm:self-auto justify-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBackingUpInteractive ? 'animate-spin' : ''}`} />
            <span>{isBackingUpInteractive ? 'Đang gom đợt sao lưu...' : 'Gom đợt & Sao lưu lên GitHub ngay'}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 text-xs text-stone-600 dark:text-stone-300 space-y-1.5">
          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
            <span className="font-medium text-stone-700 dark:text-stone-200">
              Tệp lưu trữ trên GitHub: <code className="text-pink-600 dark:text-pink-400 font-mono">data/comments.json</code> & <code className="text-pink-600 dark:text-pink-400 font-mono">data/letters.json</code>
            </span>
            <span className="text-stone-400 dark:text-stone-500">
              Lần gom đợt gần nhất: {ghConfig.lastInteractiveSyncTime ? new Date(ghConfig.lastInteractiveSyncTime).toLocaleString('vi-VN') : 'Chưa có'}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
            • <strong>Trải nghiệm bạn đọc:</strong> Độc giả khắp nơi khi đọc truyện, đăng bình luận hay gửi thư không cần tạo tài khoản hay đăng nhập. Bình luận hiển thị ngay lập tức (0ms).<br />
            • <strong>Thông báo Quản trị viên:</strong> Bạn và các cộng sự ngay khi mở trang web sẽ thấy ngay thông báo ở biểu tượng Chuông báo trên thanh điều hướng.<br />
            • <strong>Cơ chế Gom đợt:</strong> Định kì mỗi 15-20 phút (hoặc khi bạn bấm nút trên), hệ thống tự động gom toàn bộ bình luận & thư mới nhất đẩy lên GitHub để lưu trữ vĩnh viễn và đồng bộ cho tất cả các máy khác khi tải lại trang!
          </p>
        </div>
      </div>

      {/* OPTIONAL: EXTERNAL BACKEND SERVER CONFIG FOR GITHUB PAGES */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-sky-600" />
            <h4 className="font-serif text-sm font-bold text-stone-850 dark:text-stone-100">
              Máy chủ Node.js Backend (Tùy chọn)
            </h4>
          </div>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              serverStatus === 'connected'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400'
            }`}
          >
            {serverStatus === 'connected' ? 'Đã kết nối' : 'Đang dùng GitHub Raw CDN'}
          </span>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
          Khi chạy trên GitHub Pages (môi trường tĩnh), trang web mặc định đọc trực tiếp qua <strong className="text-pink-600 dark:text-pink-400 font-semibold">GitHub Raw CDN</strong> và Firestore mà không cần máy chủ riêng — <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">triệt tiêu hoàn toàn các lỗi 404 trên console</strong>. Nếu bạn có triển khai máy chủ Node.js/Express riêng (như Cloud Run hoặc Render), bạn có thể nhập URL bên dưới:
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <input
            type="url"
            value={customBackendUrl}
            onChange={(e) => setCustomBackendUrl(e.target.value)}
            placeholder="Ví dụ: https://ais-dev-xpfqzcdrliylp5uqtd4pka-226890628857.asia-east1.run.app"
            className="flex-1 px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-mono text-stone-850 dark:text-stone-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
          <button
            type="button"
            onClick={() => handleSaveBackendUrl(customBackendUrl)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shrink-0 cursor-pointer transition-colors shadow-2xs"
          >
            Lưu URL
          </button>
          {customBackendUrl && (
            <button
              type="button"
              onClick={() => handleSaveBackendUrl('')}
              className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-750 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold shrink-0 cursor-pointer transition-colors border border-stone-200 dark:border-stone-700"
            >
              Về Chế độ Tĩnh (Không 404)
            </button>
          )}
        </div>
      </div>

      {/* QUICK 1-CLICK SYNC & DATA TOOLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: Push & Pull GitHub */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 space-y-3.5 shadow-2xs">
          <h4 className="font-serif text-sm font-bold text-stone-850 dark:text-stone-100 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-pink-600" />
            <span>Đồng bộ 1-Chạm với GitHub</span>
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Dùng tính năng này để đẩy toàn bộ truyện, chương và dữ liệu hiện tại lên GitHub ngay lập tức, hoặc kéo bản mới nhất về nếu vừa có người cập nhật.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={handlePushAllToGithub}
              disabled={isSyncingToGithub || !githubTokenInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {isSyncingToGithub ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Đẩy toàn bộ lên GitHub</span>
            </button>

            <button
              type="button"
              onClick={handlePullFromGithub}
              disabled={isPullingFromGithub}
              className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-750 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1.5 border border-stone-200 dark:border-stone-700"
            >
              {isPullingFromGithub ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Kéo dữ liệu từ GitHub về</span>
            </button>
          </div>
        </div>

        {/* Box 2: Offline Backup & Restore */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-850 border border-stone-200 dark:border-stone-700 space-y-3.5 shadow-2xs">
          <h4 className="font-serif text-sm font-bold text-stone-850 dark:text-stone-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>Sao lưu & Khôi phục Tệp Ngoại tuyến</span>
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            Xuất một tệp JSON duy nhất chứa toàn bộ các tác phẩm, từng chương dịch và thông báo để lưu trữ vào máy tính hoặc chuyển giao website.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={downloadBackupFile}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shrink-0 cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải bản sao lưu (.json) về máy</span>
            </button>

            <label className="px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-750 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 text-xs font-semibold shrink-0 cursor-pointer transition-colors flex items-center gap-1.5 border border-stone-200 dark:border-stone-700">
              <Upload className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
              <span>Nhập tệp (.json) để phục hồi</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
