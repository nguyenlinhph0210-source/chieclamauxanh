/**
 * Centralized API URL resolver for seamless operation in:
 * 1. AI Studio dev / Cloud Run container (relative /api)
 * 2. GitHub Pages / static hosting with custom backend (VITE_BACKEND_URL or localStorage override)
 */

/**
 * Detects if the app is currently running on a static file host (e.g. GitHub Pages)
 * where no co-located Node.js / Express server is running.
 */
export const isStaticHosting = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host.endsWith('.github.io') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com')
  );
};

export const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';

  const isInvalidBackend = (url: string): boolean => {
    if (!url || typeof url !== 'string') return true;
    const lower = url.toLowerCase();
    return (
      lower.includes('.github.io') ||
      lower.includes('.pages.dev') ||
      lower.includes('.web.app') ||
      lower.includes('.firebaseapp.com') ||
      lower.includes('.netlify.app')
    );
  };

  // 1. Environment variable if provided
  const envUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BACKEND_URL) || '';
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http') && !isInvalidBackend(envUrl)) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Custom backend override stored in localStorage if user set it
  try {
    const saved = localStorage.getItem('mel_backend_api_url');
    if (saved && typeof saved === 'string' && saved.trim().startsWith('http')) {
      const clean = saved.trim().replace(/\/+$/, '');
      if (isInvalidBackend(clean)) {
        // Automatically remove invalid static host URL from localStorage
        localStorage.removeItem('mel_backend_api_url');
      } else {
        return clean;
      }
    }
  } catch {}

  // 3. If running on static hosting without a valid external backend, baseUrl is empty
  if (isStaticHosting()) {
    return '';
  }

  // 4. Default: relative path for same-origin proxy (Cloud Run, local dev container)
  return '';
};

export const saveCustomBackendUrl = (url: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = url.trim().replace(/\/+$/, '');
    if (
      trimmed &&
      !trimmed.includes('.github.io') &&
      !trimmed.includes('.pages.dev') &&
      !trimmed.includes('.web.app') &&
      !trimmed.includes('.netlify.app')
    ) {
      localStorage.setItem('mel_backend_api_url', trimmed);
    } else {
      localStorage.removeItem('mel_backend_api_url');
    }
  } catch {}
};

/**
 * Returns true if an active backend server is configured or expected:
 * - Localhost / dev server
 * - AI Studio / Cloud Run container
 * - Explicit backend URL provided via VITE_BACKEND_URL or mel_backend_api_url (excluding static hosts)
 * Returns false on GitHub Pages or static hosts when no backend URL has been set.
 */
export const hasBackendServer = (): boolean => {
  if (typeof window === 'undefined') return false;
  const baseUrl = getApiBaseUrl();
  if (baseUrl !== '') return true;
  // If hosted on GitHub Pages or static host without an explicit external backend URL, NO server exists
  if (isStaticHosting()) {
    return false;
  }
  return true;
};

export const buildApiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

/**
 * Universal safe fetcher:
 * - If running on static hosting (e.g. GitHub Pages) without an external backend,
 *   it IMMEDIATELY returns null without making a request, eliminating 404 console errors.
 * - If a backend exists, it fetches with a configurable timeout.
 */
export const safeApiFetch = async (
  path: string,
  init?: RequestInit,
  timeoutMs = 4000
): Promise<Response | null> => {
  if (!hasBackendServer()) {
    return null;
  }
  const url = buildApiUrl(path);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      ...init,
      signal: init?.signal || controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch {
    return null;
  }
};
