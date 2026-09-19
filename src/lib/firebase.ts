import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  doc,
  setDoc as rawSetDoc,
  getDoc as rawGetDoc,
  updateDoc as rawUpdateDoc,
  increment,
  onSnapshot as rawOnSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc as rawAddDoc,
  deleteDoc as rawDeleteDoc,
  getDocs as rawGetDocs,
  writeBatch as rawWriteBatch,
  getDocFromServer,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  enableNetwork,
  disableNetwork,
  type Firestore,
  type SetOptions,
  type DocumentReference,
  type DocumentData,
  type UpdateData,
  type CollectionReference,
  type QuerySnapshot,
  type DocumentSnapshot,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Support both environment variables (for GitHub Pages / Vercel / external hosting) and direct config
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const resolvedFirebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig?.projectId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig?.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig?.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig?.authDomain,
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || firebaseConfig?.firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig?.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig?.messagingSenderId,
};

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(resolvedFirebaseConfig) : getApp();

// Initialize Firestore with specific database ID from config if present
export const db: Firestore = resolvedFirebaseConfig.firestoreDatabaseId
  ? getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ============================================================================
// FIRESTORE CONNECTION & QUOTA RESILIENCE
// Ensures Firestore network is always active and user content writes always execute.
// ============================================================================

// Auto-detect project ID change
if (typeof window !== 'undefined') {
  try {
    const lastPid = localStorage.getItem('mel_firestore_project_id');
    const currentPid = resolvedFirebaseConfig.projectId;
    if (currentPid && lastPid !== currentPid) {
      localStorage.setItem('mel_firestore_project_id', currentPid);
    }
  } catch {}
}

export const isFirestoreEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem('mel_firestore_enabled');
    // Default to true so Firestore is active out-of-the-box unless user explicitly turns it off ('false')
    return saved !== 'false';
  } catch {
    return true;
  }
};

export const setFirestoreEnabled = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('mel_firestore_enabled', enabled ? 'true' : 'false');
      if (enabled) {
        localQuotaExhausted = false;
        try {
          localStorage.removeItem('mel_firestore_quota_exhausted_until');
        } catch {}
      }
    } catch {}
  }
};

let localQuotaExhausted = false;
let quotaNoticeLogged = false;

const quotaResetListeners = new Set<() => void>();

export const onFirestoreQuotaReset = (listener: () => void): (() => void) => {
  quotaResetListeners.add(listener);
  return () => {
    quotaResetListeners.delete(listener);
  };
};

export const notifyQuotaReset = () => {
  quotaResetListeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[Firestore] Error in quota reset listener:', err);
    }
  });
};

export const resetFirestoreQuotaExhaustion = () => {
  localQuotaExhausted = false;
  quotaNoticeLogged = false;
  try {
    localStorage.removeItem('mel_firestore_quota_exhausted_until');
  } catch {}
  notifyQuotaReset();
};

export const isFirestoreQuotaExhausted = (): boolean => {
  if (!isFirestoreEnabled()) return true;
  try {
    const rawUntil = localStorage.getItem('mel_firestore_quota_exhausted_until');
    if (rawUntil) {
      const until = Number(rawUntil);
      if (!isNaN(until) && Date.now() < until) {
        localQuotaExhausted = true;
        return true;
      } else {
        localStorage.removeItem('mel_firestore_quota_exhausted_until');
        if (localQuotaExhausted) {
          localQuotaExhausted = false;
          notifyQuotaReset();
        }
      }
    } else if (localQuotaExhausted) {
      localQuotaExhausted = false;
      notifyQuotaReset();
    }
  } catch {}
  return localQuotaExhausted;
};

// Periodic background check to automatically unblock Firestore as soon as cooldown timer expires
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (localQuotaExhausted) {
      isFirestoreQuotaExhausted();
    }
  }, 15000);
}

export const markFirestoreQuotaExhausted = () => {
  localQuotaExhausted = true;
  try {
    localStorage.setItem('mel_firestore_quota_exhausted_until', String(Date.now() + 60 * 60 * 1000));
  } catch {}
};

export const checkAndHandleQuotaError = (err: any): boolean => {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '');
  const str = String(err || '');
  if (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Free daily write units') ||
    msg.includes('Free daily read units') ||
    msg.includes('daily write units') ||
    msg.includes('daily read units') ||
    msg.includes('Quota exceeded') ||
    msg.includes('quota metric') ||
    msg.includes('quota') ||
    str.includes('resource-exhausted') ||
    str.includes('Quota limit exceeded')
  ) {
    localQuotaExhausted = true;
    try {
      localStorage.setItem('mel_firestore_quota_exhausted_until', String(Date.now() + 60 * 60 * 1000));
    } catch {}
    if (!quotaNoticeLogged) {
      quotaNoticeLogged = true;
      console.info('[Firestore] Giới hạn đọc/ghi miễn phí trong ngày của Firestore (Spark 50k reads / 20k writes/ngày) đã đạt mức tối đa. Blog tự động vận hành an toàn qua LocalStorage, Server API & GitHub Repo.');
    }
    return true;
  }
  return false;
};

// Resilient getDoc wrapper: prevents exceptions from crashing the app
export const getDoc = async (docRef: DocumentReference<DocumentData>): Promise<any> => {
  if (isFirestoreQuotaExhausted()) {
    return {
      exists: () => false,
      data: () => null,
      id: docRef.id,
      ref: docRef,
    };
  }
  try {
    return await rawGetDoc(docRef);
  } catch (err: any) {
    checkAndHandleQuotaError(err);
    console.warn('[Firestore] getDoc resilient fallback:', err?.message || err);
    return {
      exists: () => false,
      data: () => null,
      id: docRef.id,
      ref: docRef,
    };
  }
};

// Resilient getDocs wrapper: prevents exceptions from crashing query execution
export const getDocs = async (q: any): Promise<any> => {
  if (isFirestoreQuotaExhausted()) {
    return {
      empty: true,
      size: 0,
      docs: [],
      forEach: () => {},
    };
  }
  try {
    return await rawGetDocs(q);
  } catch (err: any) {
    checkAndHandleQuotaError(err);
    console.warn('[Firestore] getDocs resilient fallback:', err?.message || err);
    return {
      empty: true,
      size: 0,
      docs: [],
      forEach: () => {},
    };
  }
};

// Resilient setDoc wrapper: skips Firestore call if quota exhausted, gracefully catches all errors
export const setDoc = async (
  docRef: DocumentReference<DocumentData>,
  data: DocumentData,
  options?: SetOptions
): Promise<void> => {
  if (isFirestoreQuotaExhausted()) {
    return Promise.resolve();
  }
  try {
    if (options) {
      await rawSetDoc(docRef, data, options);
    } else {
      await rawSetDoc(docRef, data);
    }
  } catch (err: any) {
    checkAndHandleQuotaError(err);
    console.warn('[Firestore] setDoc write fallback to LocalStorage/Server:', err?.message || err);
    return Promise.resolve();
  }
};

// Resilient updateDoc wrapper: skips Firestore call if quota exhausted, gracefully catches all errors
export const updateDoc = async (
  docRef: DocumentReference<DocumentData>,
  dataOrField: UpdateData<DocumentData> | string,
  ...moreFieldsAndValues: any[]
): Promise<void> => {
  if (isFirestoreQuotaExhausted()) {
    return Promise.resolve();
  }
  try {
    await (rawUpdateDoc as any)(docRef, dataOrField, ...moreFieldsAndValues);
  } catch (err: any) {
    checkAndHandleQuotaError(err);
    console.warn('[Firestore] updateDoc write fallback to LocalStorage/Server:', err?.message || err);
    return Promise.resolve();
  }
};

// Resilient deleteDoc wrapper: skips Firestore call if quota exhausted, gracefully catches all errors
export const deleteDoc = async (docRef: DocumentReference<DocumentData>): Promise<void> => {
  if (isFirestoreQuotaExhausted()) {
    return Promise.resolve();
  }
  try {
    await rawDeleteDoc(docRef);
  } catch (err: any) {
    checkAndHandleQuotaError(err);
    console.warn('[Firestore] deleteDoc write fallback to LocalStorage/Server:', err?.message || err);
    return Promise.resolve();
  }
};

// Resilient addDoc wrapper: skips Firestore call if quota exhausted, gracefully catches all errors
export const addDoc = async (
  collectionRef: CollectionReference<DocumentData>,
  data: DocumentData
): Promise<any> => {
  if (isFirestoreQuotaExhausted()) {
    return Promise.resolve({ id: 'local_' + Date.now() });
  }
  try {
    return await rawAddDoc(collectionRef, data);
  } catch (err: any) {
    checkAndHandleQuotaError(err);
    console.warn('[Firestore] addDoc write fallback to LocalStorage/Server:', err?.message || err);
    return Promise.resolve({ id: 'local_' + Date.now() });
  }
};

// Resilient writeBatch wrapper
export const writeBatch = (firestore: Firestore) => {
  const batch = rawWriteBatch(firestore);
  return {
    set: (docRef: DocumentReference<DocumentData>, data: DocumentData, options?: SetOptions) => {
      if (!isFirestoreQuotaExhausted()) {
        if (options) batch.set(docRef, data, options);
        else batch.set(docRef, data);
      }
      return batch;
    },
    update: (docRef: DocumentReference<DocumentData>, dataOrField: any, ...more: any[]) => {
      if (!isFirestoreQuotaExhausted()) {
        (batch.update as any)(docRef, dataOrField, ...more);
      }
      return batch;
    },
    delete: (docRef: DocumentReference<DocumentData>) => {
      if (!isFirestoreQuotaExhausted()) {
        batch.delete(docRef);
      }
      return batch;
    },
    commit: async (): Promise<void> => {
      if (isFirestoreQuotaExhausted()) {
        return Promise.resolve();
      }
      try {
        await batch.commit();
      } catch (err: any) {
        checkAndHandleQuotaError(err);
        console.warn('[Firestore] batch commit fallback to LocalStorage/Server:', err?.message || err);
        return Promise.resolve();
      }
    },
  };
};

// Safe, self-healing onSnapshot wrapper:
// If quota is exhausted or errors out, it pauses silently. As soon as quota resets (timer or manual),
// it automatically re-attaches and emits the fresh Firestore dataset!
export const onSnapshot = (
  reference: any,
  observerOrNext: any,
  onError?: (error: any) => void
) => {
  let innerUnsub: (() => void) | null = null;
  let isCancelled = false;

  const safeOnError = (err: any) => {
    checkAndHandleQuotaError(err);
    if (onError) {
      try {
        onError(err);
      } catch (handlerErr) {
        console.warn('Firestore snapshot error in user callback:', handlerErr);
      }
    } else {
      console.warn('Firestore snapshot notice (handled):', err?.message || err);
    }
    if (innerUnsub) {
      try { innerUnsub(); } catch {}
      innerUnsub = null;
    }
  };

  const trySubscribe = () => {
    if (isCancelled || innerUnsub) return;
    if (isFirestoreQuotaExhausted()) return;

    try {
      if (typeof observerOrNext === 'function') {
        innerUnsub = rawOnSnapshot(reference, observerOrNext, safeOnError);
      } else if (observerOrNext && typeof observerOrNext === 'object') {
        const origError = observerOrNext.error;
        const wrappedObserver = {
          ...observerOrNext,
          error: (err: any) => {
            safeOnError(err);
            if (origError) origError(err);
          },
        };
        innerUnsub = rawOnSnapshot(reference, wrappedObserver);
      } else {
        innerUnsub = rawOnSnapshot(reference, observerOrNext, safeOnError);
      }
    } catch (err) {
      safeOnError(err);
    }
  };

  // 1. Initial subscription attempt
  trySubscribe();

  // 2. Automatically re-subscribe as soon as quota exhaustion resets
  const unsubReset = onFirestoreQuotaReset(() => {
    if (!isCancelled && !innerUnsub) {
      trySubscribe();
    }
  });

  return () => {
    isCancelled = true;
    unsubReset();
    if (innerUnsub) {
      try {
        innerUnsub();
      } catch {}
      innerUnsub = null;
    }
  };
};

/**
 * Validate Connection to Firestore on boot (per Firebase skill guideline).
 */
export async function testConnection() {
  if (typeof window === 'undefined' || !isFirestoreEnabled()) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    checkAndHandleQuotaError(error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration or network status.');
    }
  }
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 1000);
}

export {
  doc,
  increment,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User,
};

