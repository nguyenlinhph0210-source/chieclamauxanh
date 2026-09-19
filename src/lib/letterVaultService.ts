import { ReaderLetter } from '../types';

const PREFIX = 'mel_saved_letters_';

/**
 * Save a personal secret lookup code to the user's secure device vault
 */
export const savePersonalLetterCode = (code: string, userId?: string): void => {
  if (!code || typeof window === 'undefined') return;
  const cleanCode = code.trim().toUpperCase();

  try {
    const keys = [`${PREFIX}${userId || 'guest'}`];
    if (userId) keys.push(`${PREFIX}guest`);

    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      const existing: string[] = raw ? JSON.parse(raw) : [];
      if (!existing.includes(cleanCode)) {
        existing.unshift(cleanCode);
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 100)));
      }
    });
  } catch (e) {
    console.error('Failed to save letter code locally:', e);
  }
};

/**
 * Retrieve all saved personal lookup codes for the user / device
 */
export const getSavedPersonalCodes = (userId?: string): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const list: string[] = [];
    const keys = [`${PREFIX}${userId || 'guest'}`];
    if (userId) keys.push(`${PREFIX}guest`);

    keys.forEach((k) => {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((c) => {
            if (typeof c === 'string') {
              const codeClean = c.trim().toUpperCase();
              if (codeClean && !list.includes(codeClean)) {
                list.push(codeClean);
              }
            }
          });
        }
      }
    });
    return list;
  } catch {
    return [];
  }
};

/**
 * Remove a specific code from the local vault
 */
export const removePersonalLetterCode = (code: string, userId?: string): void => {
  if (!code || typeof window === 'undefined') return;
  const cleanCode = code.trim().toUpperCase();

  try {
    const keys = [`${PREFIX}${userId || 'guest'}`];
    if (userId) keys.push(`${PREFIX}guest`);

    keys.forEach((k) => {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((c) => typeof c === 'string' && c.trim().toUpperCase() !== cleanCode);
          localStorage.setItem(k, JSON.stringify(updated));
        }
      }
    });
  } catch (e) {
    console.error('Failed to remove letter code:', e);
  }
};

/**
 * Filter all letters belonging to a user (by UID, email, or saved local codes)
 */
export const getMyLettersFromList = (
  letters: ReaderLetter[],
  user?: { uid?: string; email?: string | null } | null
): ReaderLetter[] => {
  if (!letters || letters.length === 0) return [];
  const localCodes = getSavedPersonalCodes(user?.uid);
  const userEmail = (user?.email || '').trim().toLowerCase();
  const userUid = user?.uid || '';

  return letters.filter((l) => {
    const lUid = l.userId || l.senderUid;
    const lEmail = (l.userEmail || l.senderEmail || '').trim().toLowerCase();

    if (userUid && lUid && lUid === userUid) return true;
    if (userEmail && lEmail && lEmail === userEmail) return true;
    if (l.secretLookupCode && localCodes.includes(l.secretLookupCode.toUpperCase())) return true;
    return false;
  });
};

/**
 * Recover seal codes by matching verified email against submitted letters
 */
export const recoverCodesByEmail = (
  letters: ReaderLetter[],
  email: string,
  userId?: string
): { recoveredCount: number; codes: string[]; letters: ReaderLetter[] } => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !letters || letters.length === 0) {
    return { recoveredCount: 0, codes: [], letters: [] };
  }

  const matched = letters.filter((l) => {
    const lEmail = (l.userEmail || l.senderEmail || '').trim().toLowerCase();
    return lEmail === cleanEmail && Boolean(l.secretLookupCode);
  });

  const recoveredCodes: string[] = [];
  matched.forEach((l) => {
    if (l.secretLookupCode) {
      savePersonalLetterCode(l.secretLookupCode, userId);
      recoveredCodes.push(l.secretLookupCode.toUpperCase());
    }
  });

  return {
    recoveredCount: recoveredCodes.length,
    codes: recoveredCodes,
    letters: matched,
  };
};

/**
 * Download a safe, confidential backup text file for the sealing code
 */
export const downloadSealCodeCard = (data: {
  code: string;
  sender?: string;
  date?: string;
  tag?: string;
}): void => {
  if (typeof window === 'undefined') return;

  const content = `=========================================
💌 THẺ NIÊM PHONG TÂM THƯ BẢO MẬT
Mellifluous Diary & Confession Vault
=========================================

MÃ NIÊM PHONG BÍ MẬT: ${data.code}
Người gửi: ${data.sender || 'Bạn đọc yêu truyện'}
Chủ đề / Thẻ: ${data.tag || 'Tâm sự riêng tư'}
Thời gian gửi: ${data.date || new Date().toLocaleString('vi-VN')}

-----------------------------------------
HƯỚNG DẪN XEM HỒI ĐÁP BẢO MẬT:
1. Truy cập trang web Mellifluous Story.
2. Vào mục "Tâm sự & Hòm thư".
3. Nhập mã niêm phong [ ${data.code} ] vào hộp Tra cứu thư thầm kín.
Hoặc mở biểu tượng Chuông thông báo (nếu đã đăng nhập) để nhận thông báo riêng khi Quản trị viên / Tác giả hồi đáp!

* Lưu ý: Hãy lưu giữ mã này cẩn thận để xem phản hồi riêng từ Ban Quản Trị nhé!
=========================================`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `The-Niem-Phong-${data.code}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
