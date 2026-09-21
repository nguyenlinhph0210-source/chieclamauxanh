/**
 * Date and Time utilities for Mellifluous Story & Chapter Management
 * Provides accurate time formatting, relative calculations, ISO/Local conversion,
 * and edit-time tracking for Vietnamese reader and author interfaces.
 */

/**
 * Parses timestamps safely, properly handling Vietnamese friendly strings,
 * standard ISO strings, local strings, and date slash formats.
 */
export const parseSafeTimestamp = (dateStr?: string): number => {
  if (!dateStr) return 0;

  // Handle Vietnamese friendly legacy labels
  const trimmed = dateStr.trim();
  if (
    trimmed === 'Vừa đăng' ||
    trimmed === 'Vừa cập nhật' ||
    trimmed === 'Vừa xong' ||
    trimmed === 'Mới' ||
    trimmed.startsWith('Vừa')
  ) {
    return Date.now();
  }

  // Handle dd/MM/yyyy HH:mm:ss or dd/MM/yyyy HH:mm
  const slashWithTimeMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (slashWithTimeMatch) {
    const [, d, m, y, h, min, s] = slashWithTimeMatch;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s || 0)).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // Handle dd/MM/yyyy
  const slashDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashDateMatch) {
    const [, d, m, y] = slashDateMatch;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // Standard Date parsing (ISO 8601, RFC2822)
  const parsed = new Date(trimmed).getTime();
  if (!isNaN(parsed) && parsed > 0) {
    return parsed;
  }

  return 0;
};

/**
 * Formats a date string into Vietnamese full format: HH:mm dd/MM/yyyy
 * Example: 18:45 21/09/2026
 */
export const formatDateTime = (dateStr?: string, fallback = 'Chưa xác định'): string => {
  const ts = parseSafeTimestamp(dateStr);
  if (!ts) return fallback;

  const d = new Date(ts);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

/**
 * Formats a date string into standard date format: dd/MM/yyyy
 * Example: 21/09/2026
 */
export const formatDateOnly = (dateStr?: string, fallback = 'Chưa xác định'): string => {
  const ts = parseSafeTimestamp(dateStr);
  if (!ts) return fallback;

  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Calculates human-readable relative time (e.g., "5 phút trước", "2 giờ trước", "3 ngày trước")
 */
export const formatRelativeTime = (timeStr?: string, fallback = 'Vừa xong'): string => {
  if (!timeStr) return fallback;

  const trimmed = timeStr.trim();
  if (trimmed.includes('trước') || trimmed === 'Vừa xong' || trimmed === 'Mới') {
    return trimmed;
  }

  const ts = parseSafeTimestamp(trimmed);
  if (!ts) return trimmed;

  const now = Date.now();
  const diffMs = now - ts;

  // If time is future or within 60 seconds
  if (diffMs < 60 * 1000) {
    return 'Vừa xong';
  }

  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 60) {
    return `${diffMins} phút trước`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks} tuần trước`;
  }

  // Older dates: return dd/MM/yyyy
  return formatDateOnly(timeStr);
};

/**
 * Checks whether an item (story or chapter) has been edited significantly
 * after its initial publication (by default, at least 2 minutes later).
 */
export const isRecentlyEdited = (
  publishedAt?: string,
  updatedAt?: string,
  thresholdMs: number = 2 * 60 * 1000
): boolean => {
  if (!publishedAt || !updatedAt) return false;
  const pTime = parseSafeTimestamp(publishedAt);
  const uTime = parseSafeTimestamp(updatedAt);
  if (!pTime || !uTime) return false;
  return uTime - pTime > thresholdMs;
};

/**
 * Formats publication date and edit date for elegant rendering in UI
 */
export const getPublicationAndEditDisplay = (
  publishedAt?: string,
  updatedAt?: string
): {
  publishedText: string;
  publishedRelative: string;
  editedText?: string;
  editedRelative?: string;
  isEdited: boolean;
} => {
  const publishedText = formatDateTime(publishedAt) || formatDateOnly(publishedAt);
  const publishedRelative = formatRelativeTime(publishedAt);

  const edited = isRecentlyEdited(publishedAt, updatedAt);
  if (!edited) {
    return {
      publishedText,
      publishedRelative,
      isEdited: false,
    };
  }

  const editedText = formatDateTime(updatedAt);
  const editedRelative = formatRelativeTime(updatedAt);

  return {
    publishedText,
    publishedRelative,
    editedText,
    editedRelative,
    isEdited: true,
  };
};

/**
 * Converts an ISO string or any timestamp to `YYYY-MM-DDTHH:mm` format
 * suitable for `<input type="datetime-local" />` in local timezone.
 */
export const isoToDateTimeLocal = (dateStr?: string): string => {
  const ts = parseSafeTimestamp(dateStr);
  const d = ts ? new Date(ts) : new Date();

  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Converts a `YYYY-MM-DDTHH:mm` value from `<input type="datetime-local" />`
 * to a standardized ISO 8601 string.
 */
export const dateTimeLocalToIso = (localStr?: string): string => {
  if (!localStr) return new Date().toISOString();
  const d = new Date(localStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
};
