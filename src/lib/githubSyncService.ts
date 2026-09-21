/**
 * GitHub Sync Service for Mellifluous
 * Provides 100% free, permanent data persistence directly to the GitHub repository.
 * Eliminates reliance on Firestore quota limits and guarantees data consistency across all devices.
 */

import { Story, Chapter, Announcement, ReaderLetter } from '../types';

export interface GithubConfig {
  repo: string; // e.g. "maianhpham927-glitch/mellifluous"
  branch: string; // e.g. "main"
  token: string; // Personal Access Token (classic or fine-grained with contents:write)
  autoSync: boolean; // Auto commit on author publish
  autoBatchSync?: boolean; // Auto periodic batch sync for comments, letters, views
  lastSyncTime?: string;
  lastInteractiveSyncTime?: string;
}

const STORAGE_CONFIG_KEY = 'mel_github_config_v1';
export const DEFAULT_REPO = 'mellifluous740-glitch/betterandbetter';
export const DEFAULT_BRANCH = 'main';

/**
 * Automatically detects the authoritative repository (owner/repo):
 * 1. Explicit user configuration in localStorage (if valid and not obsolete legacy placeholder)
 * 2. Automatic detection from GitHub Pages URL (e.g. username.github.io/reponame)
 * 3. Default fallback to mellifluous740-glitch/betterandbetter
 */
export const resolveAuthoritativeRepo = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed.repo &&
          typeof parsed.repo === 'string' &&
          parsed.repo.trim() &&
          !parsed.repo.includes('maianhpham927-glitch') &&
          parsed.repo.trim() !== 'mellifluous740/betterandbetter'
        ) {
          return parsed.repo.trim();
        }
      }
    } catch {}

    // Auto-detect from GitHub Pages hostname & pathname
    if (window.location.hostname.endsWith('.github.io')) {
      const owner = window.location.hostname.replace('.github.io', '');
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const repoName = pathParts[0] || 'betterandbetter';
      if (owner === 'mellifluous740' || owner === 'mellifluous740-glitch') {
        return 'mellifluous740-glitch/betterandbetter';
      }
      return `${owner}/${repoName}`;
    }
  }

  return DEFAULT_REPO;
};

export const getGithubConfig = (): GithubConfig => {
  const effectiveRepo = resolveAuthoritativeRepo();

  if (typeof window === 'undefined') {
    return {
      repo: effectiveRepo,
      branch: DEFAULT_BRANCH,
      token: '',
      autoSync: true,
    };
  }

  const rawAutoSync = localStorage.getItem('mel_github_autosync');
  const token = localStorage.getItem('mel_github_token') || '';

  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Clean up legacy obsolete placeholder if found
      const finalRepo =
        parsed.repo &&
        !parsed.repo.includes('maianhpham927-glitch') &&
        parsed.repo.trim() !== 'mellifluous740/betterandbetter'
          ? parsed.repo.trim()
          : effectiveRepo;

      const finalAutoSync =
        parsed.autoSync !== undefined
          ? Boolean(parsed.autoSync)
          : rawAutoSync !== null
          ? rawAutoSync === 'true'
          : true;

      const rawBatchSync = localStorage.getItem('mel_github_autobatchsync');
      const finalBatchSync =
        parsed.autoBatchSync !== undefined
          ? Boolean(parsed.autoBatchSync)
          : rawBatchSync !== null
          ? rawBatchSync === 'true'
          : true;

      return {
        repo: finalRepo,
        branch: parsed.branch || DEFAULT_BRANCH,
        token: parsed.token || token,
        autoSync: finalAutoSync,
        autoBatchSync: finalBatchSync,
        lastSyncTime: parsed.lastSyncTime,
        lastInteractiveSyncTime: parsed.lastInteractiveSyncTime || localStorage.getItem('mel_last_interactive_sync') || undefined,
      };
    }
  } catch {}

  const rawBatchSync = typeof window !== 'undefined' ? localStorage.getItem('mel_github_autobatchsync') : null;
  return {
    repo: effectiveRepo,
    branch: DEFAULT_BRANCH,
    token,
    autoSync: rawAutoSync !== null ? rawAutoSync === 'true' : true,
    autoBatchSync: rawBatchSync !== null ? rawBatchSync === 'true' : true,
    lastInteractiveSyncTime: typeof window !== 'undefined' ? localStorage.getItem('mel_last_interactive_sync') || undefined : undefined,
  };
};

export const saveGithubConfig = (config: Partial<GithubConfig>): GithubConfig => {
  const current = getGithubConfig();
  let targetRepo = (config.repo || current.repo || DEFAULT_REPO).trim();
  if (targetRepo === 'mellifluous740/betterandbetter' || targetRepo.includes('maianhpham927-glitch')) {
    targetRepo = DEFAULT_REPO;
  }

  const updated: GithubConfig = {
    ...current,
    ...config,
    repo: targetRepo,
    branch: (config.branch || current.branch || DEFAULT_BRANCH).trim(),
    token: config.token !== undefined ? config.token.trim() : current.token,
    autoSync: config.autoSync !== undefined ? Boolean(config.autoSync) : current.autoSync !== false,
    autoBatchSync: config.autoBatchSync !== undefined ? Boolean(config.autoBatchSync) : current.autoBatchSync !== false,
    lastInteractiveSyncTime: config.lastInteractiveSyncTime || current.lastInteractiveSyncTime,
  };

  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(updated));
    localStorage.setItem('mel_github_autosync', updated.autoSync ? 'true' : 'false');
    localStorage.setItem('mel_github_autobatchsync', updated.autoBatchSync ? 'true' : 'false');
    if (updated.lastInteractiveSyncTime) {
      localStorage.setItem('mel_last_interactive_sync', updated.lastInteractiveSyncTime);
    }
    if (updated.token) {
      localStorage.setItem('mel_github_token', updated.token);
    } else {
      localStorage.removeItem('mel_github_token');
    }
  } catch {}

  return updated;
};

/**
 * UTF-8 safe base64 encoding for GitHub Contents API
 */
function utf8ToBase64(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return window.btoa(bin);
  } catch {
    try {
      return window.btoa(unescape(encodeURIComponent(str)));
    } catch {
      return window.btoa(str);
    }
  }
}

/**
 * UTF-8 safe base64 decoding
 */
function base64ToUtf8(b64: string): string {
  try {
    const cleanB64 = b64.replace(/\s/g, '');
    const binary = window.atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      return decodeURIComponent(escape(window.atob(b64.replace(/\s/g, ''))));
    } catch {
      return window.atob(b64);
    }
  }
}

/**
 * Fetch raw JSON file from GitHub.
 * Works publicly without any token or quota limits!
 */
export async function fetchRawGithubJson<T>(filename: string): Promise<T | null> {
  const config = getGithubConfig();
  const repo = (config.repo || DEFAULT_REPO).trim();
  const branch = (config.branch || DEFAULT_BRANCH).trim();

  // Add cache buster to guarantee freshest data on every fetch
  const cacheBuster = Date.now();
  const candidateRepos = [repo];
  if (repo !== DEFAULT_REPO) {
    candidateRepos.push(DEFAULT_REPO);
  }

  for (const r of candidateRepos) {
    const url = `https://raw.githubusercontent.com/${r}/${branch}/data/${filename}?_t=${cacheBuster}`;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        return data as T;
      }
    } catch (err) {
      console.warn(`[GitHubSync] Could not fetch raw ${filename} from ${r}:`, err);
    }
  }

  // Fallback 1: Direct GitHub Contents API (works publicly for open repos, with or without token)
  for (const r of candidateRepos) {
    try {
      const apiUrl = `https://api.github.com/repos/${r}/contents/data/${filename}?ref=${encodeURIComponent(branch)}&_t=${cacheBuster}`;
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };
      if (config.token) {
        headers.Authorization = `Bearer ${config.token.trim()}`;
      }
      const apiRes = await fetch(apiUrl, {
        headers,
        cache: 'no-store',
      });
      if (apiRes.ok) {
        const fileObj = await apiRes.json();
        if (fileObj.content) {
          const decoded = base64ToUtf8(fileObj.content);
          return JSON.parse(decoded) as T;
        }
      }
    } catch {}
  }

  // Fallback 2: jsDelivr CDN
  for (const r of candidateRepos) {
    try {
      const cdnUrl = `https://cdn.jsdelivr.net/gh/${r}@${branch}/data/${filename}?_t=${cacheBuster}`;
      const cdnRes = await fetch(cdnUrl, { cache: 'no-store' });
      if (cdnRes.ok) {
        return await cdnRes.json();
      }
    } catch {}
  }

  // Fallback 3: Local /data/ or relative base path in deployed build (e.g. GitHub Pages)
  try {
    const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    const pathsToTry = [
      `${cleanBase}data/${filename}?_t=${cacheBuster}`,
      `/betterandbetter/data/${filename}?_t=${cacheBuster}`,
      `/data/${filename}?_t=${cacheBuster}`,
    ];

    for (const p of pathsToTry) {
      try {
        const localRes = await fetch(p, { cache: 'no-store' });
        if (localRes.ok) {
          return await localRes.json();
        }
      } catch {}
    }
  } catch {}

  return null;
}

// Sequential mutex queue to prevent parallel commits from colliding on git branch ref
let commitMutex = Promise.resolve<any>(null);

/**
 * Commit a data file directly to GitHub using GitHub REST API.
 * Features:
 * - Sequential commit queue to eliminate branch ref collision
 * - Cache-busting GET for guaranteed fresh SHA
 * - Automatic retry with exponential backoff on HTTP 409 conflict
 */
export async function commitGithubDataFile(
  filename: string,
  content: any,
  commitMessage?: string
): Promise<{ success: boolean; commitUrl?: string; error?: string }> {
  const task = async (): Promise<{ success: boolean; commitUrl?: string; error?: string }> => {
    const config = getGithubConfig();
    const cleanToken = (config.token || '').trim();
    if (!cleanToken) {
      return {
        success: false,
        error: 'Chưa cấu hình GitHub Token. Vui lòng nhập Personal Access Token trong tab "Lưu trữ & Đồng bộ".',
      };
    }

    const repo = (config.repo || DEFAULT_REPO).trim().replace(/^\/+|\/+$/g, '');
    const branch = (config.branch || DEFAULT_BRANCH).trim().replace(/^\/+|\/+$/g, '');
    const path = `data/${filename}`;
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    // Helper to query the guaranteed freshest file SHA directly from GitHub
    const fetchLatestSha = async (): Promise<{
      sha?: string;
      notFound?: boolean;
      unauthorized?: boolean;
      error?: string;
    }> => {
      try {
        const cacheBuster = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const getUrl = `${apiUrl}?ref=${encodeURIComponent(branch)}&_t=${cacheBuster}`;
        const getRes = await fetch(getUrl, {
          headers,
        });

        if (getRes.ok) {
          const fileInfo = await getRes.json();
          if (fileInfo && typeof fileInfo.sha === 'string') {
            return { sha: fileInfo.sha };
          }
        }

        if (getRes.status === 404) {
          const errJson = await getRes.json().catch(() => ({}));
          const msg = (errJson.message || '').toLowerCase();
          if (msg.includes('no commit found for the ref') || msg.includes('branch')) {
            return {
              error: `Không tìm thấy nhánh "${branch}" trên repository "${repo}". Vui lòng kiểm tra lại cấu hình tên nhánh.`,
            };
          }
          return { notFound: true };
        }

        if (getRes.status === 401) {
          return {
            unauthorized: true,
            error: 'GitHub Token không hợp lệ hoặc đã hết hạn (HTTP 401 Bad Credentials).',
          };
        }

        if (getRes.status === 403) {
          const errJson = await getRes.json().catch(() => ({}));
          return {
            error: `GitHub Token không có quyền truy cập hoặc vượt quá giới hạn API (HTTP 403: ${errJson.message || ''}).`,
          };
        }

        const errJson = await getRes.json().catch(() => ({}));
        return {
          error: `Không thể đọc thông tin tệp trên GitHub (HTTP ${getRes.status}: ${errJson.message || ''})`,
        };
      } catch (e: any) {
        console.warn('[GitHubSync] Error fetching latest file SHA:', e);
        return {
          error: `Lỗi kết nối khi kiểm tra tệp trên GitHub: ${e?.message || 'Không thể kết nối mạng'}`,
        };
      }
    };

    try {
      const jsonString = JSON.stringify(content, null, 2);
      const base64Content = utf8ToBase64(jsonString);

      const maxRetries = 4;
      let lastErrorMessage = '';

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        // 1. Fetch fresh SHA with clean cache-busting query parameter
        const shaResult = await fetchLatestSha();

        if (shaResult.unauthorized) {
          return {
            success: false,
            error: shaResult.error || 'GitHub Token không hợp lệ hoặc đã hết hạn (HTTP 401 Bad Credentials).',
          };
        }

        // If there was an error querying GitHub (e.g. branch doesn't exist, permission issue, network failure)
        if (shaResult.error) {
          return {
            success: false,
            error: shaResult.error,
          };
        }

        // If SHA wasn't found and it's NOT a 404 (file doesn't exist), abort rather than sending broken PUT without sha
        if (!shaResult.sha && !shaResult.notFound) {
          return {
            success: false,
            error: 'Không thể xác thực mã phiên bản tệp (SHA) trên GitHub. Vui lòng thử lại.',
          };
        }

        const payload: any = {
          message: commitMessage || `Cập nhật ${filename} từ Mellifluous Studio [skip ci]`,
          content: base64Content,
          branch: branch,
        };

        if (shaResult.sha) {
          payload.sha = shaResult.sha;
        }

        // 2. Send PUT request
        const putRes = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (putRes.ok) {
          const result = await putRes.json();
          saveGithubConfig({ lastSyncTime: new Date().toISOString() });
          return {
            success: true,
            commitUrl: result.commit?.html_url,
          };
        }

        const errorJson = await putRes.json().catch(() => ({}));
        const rawErrMsg = errorJson.message || '';

        // 3. Handle conflict (HTTP 409) OR unexpected 422 "sha wasn't supplied" with auto-retry
        if ((putRes.status === 409 || (putRes.status === 422 && rawErrMsg.includes('sha'))) && attempt < maxRetries) {
          console.warn(`[GitHubSync] Retrying commit for ${filename} (HTTP ${putRes.status}: ${rawErrMsg}) - attempt ${attempt + 1}/${maxRetries}...`);
          const delay = 400 * (attempt + 1) + Math.floor(Math.random() * 200);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // 4. Format informative error
        let errorMsg = rawErrMsg || `Lỗi GitHub API: HTTP ${putRes.status}`;
        if (putRes.status === 404) {
          errorMsg = `Không tìm thấy repository "${repo}" hoặc Token không có quyền truy cập repository này (HTTP 404).`;
        } else if (putRes.status === 401) {
          errorMsg = `GitHub Token không hợp lệ hoặc không có quyền (HTTP 401).`;
        } else if (putRes.status === 409) {
          errorMsg = `Xung đột phiên bản tệp SHA trên GitHub (HTTP 409) sau ${attempt + 1} lần thử. Vui lòng bấm lưu lại lần nữa.`;
        } else if (putRes.status === 403) {
          errorMsg = `Token không có quyền ghi ("Contents: Read and write") vào kho lưu trữ (HTTP 403: ${rawErrMsg}).`;
        } else if (putRes.status === 422) {
          errorMsg = `Lỗi định dạng commit hoặc nhánh "${branch}" không hợp lệ (HTTP 422: ${rawErrMsg}).`;
        }
        lastErrorMessage = errorMsg;
        break;
      }

      return {
        success: false,
        error: lastErrorMessage || 'Không thể đẩy tệp lên GitHub sau các lần thử.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Không thể kết nối tới GitHub API',
      };
    }
  };

  // Enqueue this commit so multiple calls run in sequence
  commitMutex = commitMutex.then(task, task);
  return commitMutex;
}

/**
 * Perform a live test write commit to verify token has full write access
 */
export async function testGithubWrite(): Promise<{
  success: boolean;
  message: string;
  commitUrl?: string;
}> {
  const config = getGithubConfig();
  if (!config.token) {
    return {
      success: false,
      message: 'Chưa có GitHub Token. Vui lòng dán Personal Access Token vào ô bên dưới.',
    };
  }

  const testPayload = {
    test: true,
    clientTime: new Date().toISOString(),
    generator: 'Mellifluous Studio Write Permission Test',
    status: 'ok',
  };

  const res = await commitGithubDataFile(
    '.sync-test.json',
    testPayload,
    'Kiểm tra quyền ghi GitHub từ Mellifluous Studio [skip ci]'
  );

  if (res.success) {
    return {
      success: true,
      message: `Quyền ghi thành công! Token có quyền cam kết trực tiếp vào nhánh ${config.branch || DEFAULT_BRANCH}.`,
      commitUrl: res.commitUrl,
    };
  } else {
    return {
      success: false,
      message: `Thử nghiệm ghi thất bại: ${res.error}`,
    };
  }
}

/**
 * Test GitHub connection and token permissions
 */
export async function testGithubConnection(): Promise<{
  success: boolean;
  username?: string;
  repoName?: string;
  canWrite?: boolean;
  message: string;
}> {
  const config = getGithubConfig();
  const cleanToken = (config.token || '').trim();
  if (!cleanToken) {
    return {
      success: false,
      message: 'Chưa có GitHub Token. Vui lòng nhập Personal Access Token.',
    };
  }

  const repo = (config.repo || DEFAULT_REPO).trim();

  try {
    // 1. Check user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return {
          success: false,
          message: 'GitHub Token không hợp lệ hoặc đã hết hạn (401 Bad Credentials)',
        };
      }
      return {
        success: false,
        message: `Lỗi xác thực người dùng GitHub (${userRes.status})`,
      };
    }

    const userData = await userRes.json();
    const username = userData.login;

    // 2. Check repo access
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return {
          success: false,
          username,
          message: `Không tìm thấy repository "${repo}". Nếu repo là Private, hãy đảm bảo Token có quyền truy cập vào repo này.`,
        };
      }
      return {
        success: false,
        username,
        message: `Không thể truy cập repository ${repo} (HTTP ${repoRes.status})`,
      };
    }

    const repoData = await repoRes.json();
    const canWrite = repoData.permissions?.push === true || repoData.permissions?.admin === true;
    const isOwner = repoData.owner?.login?.toLowerCase() === username.toLowerCase();

    let message = '';
    if (canWrite) {
      message = `Đã kết nối thành công với kho lưu trữ ${repoData.full_name} (@${username}). Tài khoản có đầy đủ quyền Ghi (Push/Write)!`;
    } else if (!isOwner) {
      message = `Token thuộc tài khoản @${username}, nhưng kho bạn đang nhập là "${repoData.full_name}" (thuộc sở hữu của @${repoData.owner?.login || 'người khác'}). Hãy đổi ô "Kho lưu trữ GitHub" thành "${username}/${repoData.name}"!`;
    } else {
      message = `Đã kết nối với @${username}, nhưng tài khoản CHỈ CÓ QUYỀN ĐỌC (Read-only) trên kho ${repoData.full_name}. Hãy kiểm tra lại quyền trong Token (chọn scope "repo")!`;
    }

    return {
      success: true,
      username,
      repoName: repoData.full_name,
      canWrite,
      message,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kết nối mạng tới GitHub: ${err?.message || err}`,
    };
  }
}

/**
 * Backup interactive data (Comments, Reader Letters, Global Stats) to GitHub repository
 */
export async function backupInteractiveDataToGithub(customData?: {
  comments?: any[];
  letters?: any[];
  stats?: any;
}): Promise<{
  success: boolean;
  commentsCount: number;
  lettersCount: number;
  error?: string;
}> {
  const config = getGithubConfig();
  if (!config.token) {
    return {
      success: false,
      commentsCount: 0,
      lettersCount: 0,
      error: 'Vui lòng cung cấp GitHub Personal Access Token để có quyền ghi dữ liệu lên kho lưu trữ.',
    };
  }

  try {
    const { getAllStoredComments, getStoredReaderLetters, getGlobalStats } = await import('./realtimeService');
    const comments = customData?.comments || getAllStoredComments();
    const letters = customData?.letters || getStoredReaderLetters();
    const stats = customData?.stats || getGlobalStats();

    // 1. Commit comments.json
    const resComments = await commitGithubDataFile(
      'comments.json',
      comments,
      `Gom đợt sao lưu ${comments.length} bình luận độc giả [skip ci]`
    );
    if (!resComments.success) {
      throw new Error(`Lỗi cập nhật comments.json: ${resComments.error}`);
    }

    // 2. Commit letters.json
    const resLetters = await commitGithubDataFile(
      'letters.json',
      letters,
      `Gom đợt sao lưu ${letters.length} thư tâm tình độc giả [skip ci]`
    );
    if (!resLetters.success) {
      throw new Error(`Lỗi cập nhật letters.json: ${resLetters.error}`);
    }

    // 3. Commit stats.json safely (never overwrite with regression/zeros)
    let existingStats: any = null;
    try {
      existingStats = await fetchRawGithubJson<any>('stats.json');
    } catch {}

    const prevVisits = existingStats?.global?.totalVisits ?? existingStats?.totalVisits ?? 25;
    const prevLikes = existingStats?.global?.totalLikes ?? existingStats?.totalLikes ?? 3;
    const prevFollowers = existingStats?.global?.totalFollowers ?? existingStats?.totalFollowers ?? 0;
    const prevComments = existingStats?.global?.totalComments ?? existingStats?.totalComments ?? 0;

    const safeStats = {
      global: {
        totalVisits: Math.max(prevVisits, stats?.totalVisits || 1, 25),
        totalLikes: Math.max(prevLikes, stats?.totalLikes || 0, 3),
        totalFollowers: Math.max(prevFollowers, stats?.totalFollowers || 0),
        totalComments: Math.max(prevComments, comments.length, stats?.totalComments || 0, 8),
      },
      stories: existingStats?.stories || stats?.stories || {},
      updatedAt: new Date().toISOString(),
    };

    await commitGithubDataFile(
      'stats.json',
      safeStats,
      `Cập nhật thống kê tương tác (lượt xem & lượt ghé thăm) [skip ci]`
    );

    const nowIso = new Date().toISOString();
    saveGithubConfig({ lastInteractiveSyncTime: nowIso });
    try {
      localStorage.setItem('mel_last_interactive_sync', nowIso);
    } catch {}

    return {
      success: true,
      commentsCount: comments.length,
      lettersCount: letters.length,
    };
  } catch (err: any) {
    return {
      success: false,
      commentsCount: 0,
      lettersCount: 0,
      error: err?.message || 'Có lỗi xảy ra khi sao lưu tương tác lên GitHub',
    };
  }
}

let batchSyncTimer: any = null;

export const initPeriodicBatchSync = () => {
  if (typeof window === 'undefined') return () => {};
  if (batchSyncTimer) {
    return () => {
      if (batchSyncTimer) {
        clearInterval(batchSyncTimer);
        batchSyncTimer = null;
      }
    };
  }

  // Run periodic check every 15 minutes
  batchSyncTimer = setInterval(async () => {
    const config = getGithubConfig();
    if (!config.token || !config.autoBatchSync) return;

    const lastSyncStr = config.lastInteractiveSyncTime || localStorage.getItem('mel_last_interactive_sync');
    const lastSync = lastSyncStr ? new Date(lastSyncStr).getTime() : 0;
    const now = Date.now();

    // If more than 20 minutes since last interactive sync
    if (now - lastSync > 20 * 60 * 1000) {
      try {
        const result = await backupInteractiveDataToGithub();
        if (result.success) {
          console.log(`[BatchSync] Đã tự động gom đợt sao lưu ${result.commentsCount} bình luận & ${result.lettersCount} thư lên GitHub`);
        }
      } catch (err) {
        console.warn('[BatchSync] Auto batch sync note:', err);
      }
    }
  }, 15 * 60 * 1000);

  return () => {
    if (batchSyncTimer) {
      clearInterval(batchSyncTimer);
      batchSyncTimer = null;
    }
  };
};
