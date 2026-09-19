// Web Crypto API helper for secure client-side password hashing and credential verification

export const hashPassword = async (password: string, salt: string): Promise<string> => {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(`${salt}__mellifluous_novel_app_secret__${password}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Basic fallback if crypto.subtle is somehow restricted in the environment
    let hash = 0;
    const str = `${salt}__mellifluous_fallback__${password}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
};

export const generateSalt = (): string => {
  try {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
};
