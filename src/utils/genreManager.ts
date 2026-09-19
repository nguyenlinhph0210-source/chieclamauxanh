import { db, doc, getDoc, setDoc, onSnapshot, isFirestoreQuotaExhausted, onFirestoreQuotaReset } from '../lib/firebase';
import { buildApiUrl, hasBackendServer } from '../lib/apiConfig';
import { fetchRawGithubJson, getGithubConfig, commitGithubDataFile } from '../lib/githubSyncService';

export const DEFAULT_GENRES: string[] = [
  'Tất cả các thể loại mùa hè',
  'Ngôn tình',
  'Thanh xuân',
  'Ngọt sủng',
  'Học đường',
  'Hiện đại',
  'Ấm áp',
  'Song hướng thầm mến',
  'Vườn trường đại học',
  'Hài hước',
  'Nhẹ nhàng',
  'Gương vỡ lại lành',
  '1v1',
  'HE',
  'Chữa lành',
  'Cưới trước yêu sau',
  'Đô thị tình duyên',
  'Trọng sinh',
];

const STORAGE_KEY = 'mel_dynamic_genres_v3';
type Listener = (genres: string[]) => void;
const listeners = new Set<Listener>();

let cachedGenres: string[] = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('mel_dynamic_genres_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure "Tất cả các thể loại mùa hè" is present in genres
        if (!parsed.some((g) => g.toLowerCase() === 'tất cả các thể loại mùa hè' || g.toLowerCase() === 'tất cả thể loại mùa hè')) {
          parsed.unshift('Tất cả các thể loại mùa hè');
        }
        return parsed;
      }
    }
  } catch {}
  return [...DEFAULT_GENRES];
})();

function notify() {
  const current = [...cachedGenres];
  listeners.forEach((fn) => fn(current));
}

function saveLocal(genres: string[]) {
  cachedGenres = [...genres];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedGenres));
    localStorage.setItem('mel_dynamic_genres_v2', JSON.stringify(cachedGenres));
  } catch {}
  notify();
}

export const updateGenresFromRemote = (list: string[]) => {
  if (Array.isArray(list) && list.length > 0) {
    const merged = Array.from(new Set([...cachedGenres, ...list]));
    saveLocal(merged);
  }
};

// Initial Remote sync (Server REST + GitHub Raw fallback)
if (typeof window !== 'undefined') {
  if (hasBackendServer()) {
    fetch(buildApiUrl('/api/genres'))
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          saveLocal(list);
        } else {
          fetchRawGithubJson<string[]>('genres.json').then((ghList) => {
            if (Array.isArray(ghList) && ghList.length > 0) {
              saveLocal(ghList);
            }
          }).catch(() => {});
        }
      })
      .catch(() => {
        fetchRawGithubJson<string[]>('genres.json').then((ghList) => {
          if (Array.isArray(ghList) && ghList.length > 0) {
            saveLocal(ghList);
          }
        }).catch(() => {});
      });
  } else {
    fetchRawGithubJson<string[]>('genres.json').then((ghList) => {
      if (Array.isArray(ghList) && ghList.length > 0) {
        saveLocal(ghList);
      }
    }).catch(() => {});
  }
}

// Firestore sync using site_stats with automatic quota reset re-connection
let unsubGenresFs: (() => void) | null = null;
const setupFirestoreGenres = () => {
  if (unsubGenresFs || !db || isFirestoreQuotaExhausted()) return;
  try {
    const statsGenresDoc = doc(db, 'site_stats', 'genres');
    unsubGenresFs = onSnapshot(
      statsGenresDoc,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data?.list) && data.list.length > 0) {
            cachedGenres = data.list;
            saveLocal(cachedGenres);
          }
        }
      },
      (err) => {
        const msg = String(err?.message || err || '');
        if (!msg.includes('Quota') && !msg.includes('quota') && !msg.includes('resource-exhausted')) {
          console.warn('site_stats genres listener notice:', msg);
        }
      }
    );
  } catch {}
};

setupFirestoreGenres();
onFirestoreQuotaReset(() => {
  setupFirestoreGenres();
});

export const getAvailableGenres = (): string[] => {
  return [...cachedGenres];
};

export const getStoryGenres = (list?: string[]): string[] => {
  const target = list || cachedGenres;
  return target.filter(
    (g) => g.toLowerCase() !== 'tất cả các thể loại mùa hè' && g.toLowerCase() !== 'tất cả thể loại mùa hè'
  );
};

export const getCustomGenres = getStoryGenres;

export const addGenre = async (newGenre: string): Promise<{ success: boolean; message: string }> => {
  const trimmed = newGenre.trim();
  if (!trimmed) {
    return { success: false, message: 'Vui lòng nhập tên thể loại/chuyên mục!' };
  }
  if (cachedGenres.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, message: 'Thể loại này đã tồn tại trong danh sách!' };
  }

  const updated = [...cachedGenres, trimmed];
  saveLocal(updated);

  // Sync to Server API
  if (hasBackendServer()) {
    fetch(buildApiUrl('/api/genres'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genre: trimmed }),
    }).catch(() => {});
  }

  // Sync to GitHub if auto-sync enabled
  const ghConfig = getGithubConfig();
  if (ghConfig.token && ghConfig.autoSync) {
    commitGithubDataFile('genres.json', updated, `Thêm thể loại: ${trimmed} [skip ci]`).catch(() => {});
  }

  if (db) {
    try {
      await setDoc(doc(db, 'site_stats', 'genres'), { list: updated, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Error saving to site_stats/genres:', err);
    }
  }

  return { success: true, message: `Đã thêm thẻ "${trimmed}" vào danh sách!` };
};

export const addCustomGenre = addGenre;

export const deleteGenre = async (genreToDelete: string): Promise<{ success: boolean; message: string }> => {
  const target = genreToDelete.trim().toLowerCase();
  const updated = cachedGenres.filter((g) => g.trim().toLowerCase() !== target);
  if (updated.length === cachedGenres.length) {
    return { success: false, message: 'Không tìm thấy thể loại cần xóa!' };
  }

  saveLocal(updated);

  // Sync to Server API
  if (hasBackendServer()) {
    fetch(buildApiUrl(`/api/genres/${encodeURIComponent(genreToDelete)}`), {
      method: 'DELETE',
    }).catch(() => {});
  }

  // Sync to GitHub if auto-sync enabled
  const ghConfigDel = getGithubConfig();
  if (ghConfigDel.token && ghConfigDel.autoSync) {
    commitGithubDataFile('genres.json', updated, `Xóa thể loại: ${genreToDelete} [skip ci]`).catch(() => {});
  }

  if (db) {
    try {
      await setDoc(doc(db, 'site_stats', 'genres'), { list: updated, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn('Error updating site_stats/genres on delete:', err);
    }
  }

  return { success: true, message: `Đã xóa thẻ thể loại "${genreToDelete}" thành công!` };
};

export const resetGenresToDefault = async (): Promise<void> => {
  const reset = [...DEFAULT_GENRES];
  saveLocal(reset);

  if (hasBackendServer()) {
    fetch(buildApiUrl('/api/genres'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ genres: reset }),
    }).catch(() => {});
  }

  const ghConfigReset = getGithubConfig();
  if (ghConfigReset.token && ghConfigReset.autoSync) {
    commitGithubDataFile('genres.json', reset, 'Đặt lại danh sách thể loại mặc định [skip ci]').catch(() => {});
  }

  if (db) {
    try {
      await setDoc(doc(db, 'site_stats', 'genres'), { list: reset, updatedAt: new Date().toISOString() }, { merge: true });
    } catch {}
  }
};

export const subscribeGenres = (callback: Listener): (() => void) => {
  listeners.add(callback);
  callback([...cachedGenres]);
  return () => {
    listeners.delete(callback);
  };
};

export const subscribeToCustomGenres = subscribeGenres;
