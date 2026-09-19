import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User,
} from './firebase';
import { CollaboratorItem, UserProfile } from '../types';
import {
  subscribeToCollaborators,
  addCollaborator,
  deleteCollaborator,
  updateCollaboratorRole,
  updateCollaboratorFullData,
  getUserProfile,
  saveUserProfile,
  subscribeToUserProfile,
  lookupEmailByUsername,
  registerUsernameMapping,
  checkUsernameAvailable,
  findUserByEmail,
  findUserByUsername,
  saveUserAccount,
  type StoredUserAccount,
} from './realtimeService';
import { hashPassword, generateSalt } from './authCrypto';

// Danh sách email chính thức ban đầu của Tác giả & Các Cộng sự quản trị viên
export const AUTHOR_EMAILS: string[] = [
  'cuncondangiu07@gmail.com',
  'meomeoxinhxinh07@gmail.com',
  'nhatlinhpham010194@gmail.com',
  'maianhpham927@gmail.com',
  'mellifluous740@gmail.com',
  'duongtieuvi102@gmail.com',
  'nguyenplinh1002@gmail.com',
  'nguyenlinhph0210@gmail.com',
  'luclamly920@gmail.com',
  'uongthienyenvi123@gmail.com',
  'vivi60810@gmail.com',
].map((email) => email.toLowerCase().trim());

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const refreshSessionActivity = () => {
  try {
    localStorage.setItem('mel_auth_last_activity', Date.now().toString());
  } catch {}
};

export const isSessionExpired = (): boolean => {
  try {
    const lastActiveStr = localStorage.getItem('mel_auth_last_activity');
    if (!lastActiveStr) return false;
    const lastActive = parseInt(lastActiveStr, 10);
    return Date.now() - lastActive > SEVEN_DAYS_MS;
  } catch {}
  return false;
};

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  bio?: string | null;
  favoriteGenre?: string | null;
  websiteOrSocial?: string | null;
  isAuthor: boolean;
  isMainAuthor: boolean;
  isCollaborator: boolean;
  role: 'admin' | 'moderator' | 'collaborator' | 'author' | 'editor' | 'reader';
  roleTitle: string;
  roleBadge: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAuthor: boolean;
  isMainAuthor: boolean;
  isCollaborator: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  collaboratorsList: CollaboratorItem[];
  addCollaboratorByEmail: (email: string, displayName: string, role: CollaboratorItem['role'], roleTitle?: string, note?: string) => Promise<void>;
  removeCollaborator: (collabId: string) => Promise<void>;
  updateCollaboratorRoleByAdmin: (collabId: string, role: CollaboratorItem['role'], roleTitle?: string) => Promise<void>;
  updateCollaboratorFull: (collabId: string, data: Partial<Omit<CollaboratorItem, 'id'>>) => Promise<void>;
  updateUserProfileData: (data: Partial<UserProfile>) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleCredential: (idToken: string) => Promise<void>;
  signInWithEmail: (emailOrUsername: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, username?: string) => Promise<void>;
  quickReaderLogin: (nickname: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      if (isSessionExpired()) {
        localStorage.removeItem('mel_user_session');
        localStorage.removeItem('mel_auth_last_activity');
        return null;
      }
      const saved = localStorage.getItem('mel_user_session');
      if (saved) {
        refreshSessionActivity();
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  const [collaboratorsList, setCollaboratorsList] = useState<CollaboratorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Subscribe to real-time collaborators from Firestore
  useEffect(() => {
    const unsub = subscribeToCollaborators((list) => {
      setCollaboratorsList(list);
    });
    return unsub;
  }, []);

  // Helper to construct normalized AppUser object with dynamic collaborator privilege check
  const buildAppUser = (
    fbUser: User | { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null },
    collaborators: CollaboratorItem[] = collaboratorsList,
    profileOverride?: Partial<UserProfile> | null
  ): AppUser => {
    const emailLower = (fbUser.email || '').toLowerCase().trim();
    const isDefaultAuthor = AUTHOR_EMAILS.includes(emailLower);
    const matchedCollab = collaborators.find((c) => c.email.toLowerCase().trim() === emailLower);

    const isAuthor = isDefaultAuthor || Boolean(matchedCollab);
    const isMainAuthor =
      isDefaultAuthor &&
      (emailLower === 'cuncondangiu07@gmail.com' ||
        emailLower === 'meomeoxinhxinh07@gmail.com' ||
        emailLower === 'nhatlinhpham010194@gmail.com' ||
        emailLower === 'maianhpham927@gmail.com' ||
        emailLower === 'mellifluous740@gmail.com' ||
        emailLower === 'vivi60810@gmail.com');
    const isCollaborator = isAuthor && !isMainAuthor;

    let roleTitle = 'Độc giả yêu mến';
    let roleBadge = 'Độc giả';
    let role: 'admin' | 'moderator' | 'collaborator' | 'author' | 'editor' | 'reader' = 'reader';

    if (isAuthor || isCollaborator) {
      if (isMainAuthor) {
        role = 'admin';
        roleTitle = 'Quản trị viên';
        roleBadge = 'Quản trị viên';
      } else {
        role = 'collaborator';
        roleTitle = 'Cộng tác viên';
        roleBadge = 'Cộng tác viên';
      }

      if (matchedCollab) {
        role = matchedCollab.role;
        const defaultTitleByRole: Record<string, string> = {
          admin: 'Quản trị viên',
          moderator: 'Kiểm duyệt viên',
          collaborator: 'Cộng tác viên',
          author: 'Quản trị viên',
          editor: 'Kiểm duyệt viên',
        };
        roleTitle = matchedCollab.roleTitle || defaultTitleByRole[matchedCollab.role] || 'Cộng tác viên';
        roleBadge = roleTitle;
      }

      // Check if user has explicit custom title in profile override
      if (profileOverride?.roleTitle) {
        roleTitle = profileOverride.roleTitle;
        roleBadge = profileOverride.roleBadge || profileOverride.roleTitle;
      }
    }

    const defaultName = isMainAuthor
      ? 'Quản trị viên'
      : isCollaborator
      ? (roleTitle || 'Cộng tác viên')
      : 'Độc giả thân thương';
    let finalDisplayName = profileOverride?.displayName || fbUser.displayName;
    if (!finalDisplayName || finalDisplayName === 'Mellifluous (Tác giả)' || finalDisplayName === 'Cộng sự BQT') {
      finalDisplayName = defaultName;
    }
    const finalPhotoURL = profileOverride?.photoURL !== undefined ? profileOverride.photoURL : fbUser.photoURL || null;

    return {
      uid: fbUser.uid,
      email: fbUser.email || null,
      displayName: finalDisplayName,
      photoURL: finalPhotoURL,
      bio: profileOverride?.bio || null,
      favoriteGenre: profileOverride?.favoriteGenre || null,
      websiteOrSocial: profileOverride?.websiteOrSocial || null,
      isAuthor,
      isMainAuthor,
      isCollaborator,
      role,
      roleTitle,
      roleBadge,
    };
  };

  // Re-verify roles when collaboratorsList updates
  useEffect(() => {
    if (user && user.email) {
      const updatedUser = buildAppUser(user, collaboratorsList, {
        displayName: user.displayName,
        photoURL: user.photoURL,
        bio: user.bio,
        favoriteGenre: user.favoriteGenre,
        websiteOrSocial: user.websiteOrSocial,
      });
      // Only update if role status changed
      if (
        updatedUser.isAuthor !== user.isAuthor ||
        updatedUser.role !== user.role ||
        updatedUser.roleTitle !== user.roleTitle
      ) {
        setUser(updatedUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(updatedUser));
        } catch {}
      }
    }
  }, [collaboratorsList]);

  // Auth listener & live profile sync
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        // Fetch saved profile from Firestore/local
        const savedProfile = await getUserProfile(fbUser.uid);
        const appUser = buildAppUser(fbUser, collaboratorsList, savedProfile);
        setUser(appUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(appUser));
        } catch {}

        // Listen to profile updates
        profileUnsub = subscribeToUserProfile(fbUser.uid, (latestProfile) => {
          if (latestProfile) {
            setUser((prev) => {
              if (!prev) return null;
              const merged = buildAppUser(
                {
                  uid: prev.uid,
                  email: prev.email,
                  displayName: latestProfile.displayName || prev.displayName,
                  photoURL: latestProfile.photoURL || prev.photoURL,
                },
                collaboratorsList,
                latestProfile
              );
              try {
                localStorage.setItem('mel_user_session', JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        });
      } else {
        if (profileUnsub) {
          profileUnsub();
          profileUnsub = null;
        }
        try {
          const saved = localStorage.getItem('mel_user_session');
          if (!saved) {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  // Update profile handler (avatar, bio, display name, roleTitle, etc.)
  const updateUserProfileData = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const nextRoleTitle = data.roleTitle !== undefined ? data.roleTitle : user.roleTitle;
    const nextRoleBadge = data.roleBadge !== undefined ? data.roleBadge : (data.roleTitle !== undefined ? data.roleTitle : user.roleBadge);
    const updatedProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: (data.displayName || user.displayName || 'Độc giả').trim(),
      photoURL: data.photoURL !== undefined ? data.photoURL : user.photoURL,
      bio: data.bio !== undefined ? data.bio : user.bio || '',
      favoriteGenre: data.favoriteGenre !== undefined ? data.favoriteGenre : user.favoriteGenre || '',
      websiteOrSocial: data.websiteOrSocial !== undefined ? data.websiteOrSocial : user.websiteOrSocial || '',
      role: data.role !== undefined ? data.role : user.role,
      roleTitle: nextRoleTitle,
      roleBadge: nextRoleBadge,
      updatedAt: new Date().toISOString(),
    };

    // 1. Firebase Auth profile update
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: updatedProfile.displayName,
        photoURL: updatedProfile.photoURL || undefined,
      }).catch(() => {});
    }

    // 2. Firestore & localStorage persistence
    await saveUserProfile(updatedProfile);

    // 3. If collaborator or author, sync custom role title into collaborators list so team sees it
    if (user.isAuthor || user.isCollaborator) {
      const userEmailLower = (user.email || '').toLowerCase().trim();
      if (userEmailLower) {
        const existingCollab = collaboratorsList.find((c) => c.email.toLowerCase().trim() === userEmailLower);
        if (existingCollab) {
          updateCollaboratorFull(existingCollab.id, {
            roleTitle: nextRoleTitle,
            displayName: updatedProfile.displayName,
          }).catch(() => {});
        }
      }
    }

    // 4. Local React state
    const newAppUser = buildAppUser(
      {
        uid: user.uid,
        email: user.email,
        displayName: updatedProfile.displayName,
        photoURL: updatedProfile.photoURL,
      },
      collaboratorsList,
      updatedProfile
    );
    setUser(newAppUser);
    try {
      localStorage.setItem('mel_user_session', JSON.stringify(newAppUser));
    } catch {}
  };

  // Collaborator management functions
  const addCollaboratorByEmail = async (
    email: string,
    displayName: string,
    role: CollaboratorItem['role'],
    roleTitle?: string,
    note?: string
  ) => {
    const defaultRoleTitleMap: Record<CollaboratorItem['role'], string> = {
      admin: 'Quản trị viên',
      moderator: 'Kiểm duyệt viên',
      collaborator: 'Cộng tác viên',
      author: 'Quản trị viên',
      editor: 'Kiểm duyệt viên',
    };

    const finalRoleTitle = (roleTitle || '').trim() || defaultRoleTitleMap[role] || 'Cộng tác viên';

    const newCollab = await addCollaborator({
      email,
      displayName: displayName.trim() || email.split('@')[0],
      role,
      roleTitle: finalRoleTitle,
      addedBy: user?.displayName || user?.email || 'Quản trị viên',
      note: note || '',
    });

    setCollaboratorsList((prev) => [
      ...prev.filter((c) => c.email.toLowerCase() !== email.toLowerCase().trim()),
      newCollab,
    ]);
  };

  const removeCollaborator = async (collabId: string) => {
    await deleteCollaborator(collabId);
    setCollaboratorsList((prev) =>
      prev.filter((c) => c.id !== collabId && c.email.toLowerCase() !== collabId.toLowerCase())
    );
  };

  const updateCollaboratorRoleByAdmin = async (
    collabId: string,
    role: CollaboratorItem['role'],
    roleTitle?: string
  ) => {
    await updateCollaboratorRole(collabId, role, roleTitle);
    setCollaboratorsList((prev) =>
      prev.map((c) =>
        c.id === collabId || c.email.toLowerCase() === collabId.toLowerCase()
          ? { ...c, role, roleTitle: roleTitle || c.roleTitle }
          : c
      )
    );
  };

  const updateCollaboratorFull = async (
    collabId: string,
    data: Partial<Omit<CollaboratorItem, 'id'>>
  ) => {
    const updated = await updateCollaboratorFullData(collabId, data);
    if (updated) {
      setCollaboratorsList((prev) =>
        prev.map((c) =>
          c.id === collabId || c.email.toLowerCase() === collabId.toLowerCase() ? updated! : c
        )
      );
    }
  };

  // Sign in with Google Popup
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        refreshSessionActivity();
        const savedProfile = await getUserProfile(result.user.uid);
        const appUser = buildAppUser(result.user, collaboratorsList, savedProfile);
        setUser(appUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(appUser));
        } catch {}
      }
      closeAuthModal();
    } catch (err: any) {
      const isUnauthorizedDomain =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('auth/unauthorized-domain') ||
        err?.message?.includes('unauthorized-domain');

      if (isUnauthorizedDomain) {
        console.warn('Firebase Auth notice: Domain is not yet added to Firebase Console Authorized Domains.', err?.message);
      } else if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        console.info('Google Sign-In popup closed by user.');
      } else {
        console.warn('Google Sign-In notice:', err?.message || err);
      }
      throw err;
    }
  };

  // Sign in with Google Identity Services (GSI ID Token) - bypasses Firebase Auth popup domain check!
  const signInWithGoogleCredential = async (idToken: string) => {
    try {
      const cred = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, cred);
      if (result.user) {
        refreshSessionActivity();
        const savedProfile = await getUserProfile(result.user.uid);
        const appUser = buildAppUser(result.user, collaboratorsList, savedProfile);
        setUser(appUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(appUser));
        } catch {}
      }
      closeAuthModal();
    } catch (err: any) {
      console.warn('Google Credential Sign-in warning:', err);
      throw err;
    }
  };

  // Sign in with Email OR Username / Password (with seamless Firestore credentials fallback)
  const signInWithEmail = async (emailOrUsername: string, pass: string) => {
    try {
      const inputStr = emailOrUsername.trim();
      if (!inputStr || !pass.trim()) {
        throw new Error('Vui lòng nhập đầy đủ Email/Tên đăng nhập và Mật khẩu!');
      }

      let emailToUse = inputStr.toLowerCase();
      let accountFromDb: StoredUserAccount | null = null;

      // 1. If user typed a username (without @), lookup in directory
      if (!inputStr.includes('@')) {
        const cleanUsername = inputStr.toLowerCase();
        accountFromDb = await findUserByUsername(cleanUsername);
        if (accountFromDb && accountFromDb.email) {
          emailToUse = accountFromDb.email.toLowerCase();
        } else {
          const foundEmail = await lookupEmailByUsername(cleanUsername);
          if (foundEmail) {
            emailToUse = foundEmail.toLowerCase();
          } else {
            throw new Error(`Tên đăng nhập "${inputStr}" không tồn tại. Vui lòng kiểm tra lại hoặc sử dụng địa chỉ email!`);
          }
        }
      }

      // If account object not loaded yet, query by email
      if (!accountFromDb) {
        accountFromDb = await findUserByEmail(emailToUse);
      }

      // 2. Try Firebase Auth (if active on Firebase project)
      let firebaseUser: User | null = null;
      try {
        const result = await signInWithEmailAndPassword(auth, emailToUse, pass);
        if (result.user) {
          firebaseUser = result.user;
        }
      } catch (fbErr: any) {
        if (
          fbErr.code === 'auth/operation-not-allowed' ||
          fbErr.message?.includes('operation-not-allowed') ||
          fbErr.code === 'auth/user-not-found' ||
          fbErr.code === 'auth/invalid-credential' ||
          fbErr.code === 'auth/invalid-email'
        ) {
          console.info('Firebase auth sign-in bypassed (checking Firestore account):', fbErr.code || fbErr.message);
        } else {
          console.warn('Firebase sign-in warning:', fbErr);
        }
      }

      if (firebaseUser) {
        refreshSessionActivity();
        const savedProfile = (await getUserProfile(firebaseUser.uid)) || accountFromDb;
        const appUser = buildAppUser(firebaseUser, collaboratorsList, savedProfile);
        setUser(appUser);
        try {
          localStorage.setItem('mel_user_session', JSON.stringify(appUser));
        } catch {}
        closeAuthModal();
        return;
      }

      // 3. Fallback: Verify with Firestore Account
      if (accountFromDb) {
        if (accountFromDb.passwordHash && accountFromDb.salt) {
          const computedHash = await hashPassword(pass, accountFromDb.salt);
          if (computedHash === accountFromDb.passwordHash) {
            refreshSessionActivity();
            const appUser = buildAppUser(
              {
                uid: accountFromDb.uid,
                email: accountFromDb.email,
                displayName: accountFromDb.displayName,
                photoURL: accountFromDb.photoURL || null,
              },
              collaboratorsList,
              accountFromDb
            );
            setUser(appUser);
            try {
              localStorage.setItem('mel_user_session', JSON.stringify(appUser));
            } catch {}
            closeAuthModal();
            return;
          } else {
            throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra lại!');
          }
        } else {
          throw new Error('Tài khoản này được tạo thông qua Google Sign-In hoặc chưa có mật khẩu riêng. Vui lòng chọn Đăng nhập Google hoặc đăng ký mật khẩu!');
        }
      }

      throw new Error(`Không tìm thấy tài khoản "${inputStr}". Vui lòng kiểm tra lại tên tài khoản / mật khẩu hoặc đăng nhập qua Google!`);
    } catch (err: any) {
      console.error('Email sign in error:', err);
      throw err;
    }
  };

  // Register with Email / Username / Password (with seamless Firestore account support)
  const registerWithEmail = async (
    email: string,
    pass: string,
    name: string,
    username?: string
  ) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        throw new Error('Địa chỉ email không đúng định dạng. Vui lòng kiểm tra lại!');
      }

      if (!pass || pass.length < 6) {
        throw new Error('Mật khẩu cần tối thiểu 6 ký tự để đảm bảo an toàn!');
      }

      // Normalize username or fallback to email prefix
      let cleanUsername = (username || '').trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
      if (!cleanUsername) {
        cleanUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      }

      // Check username availability
      const isAvail = await checkUsernameAvailable(cleanUsername);
      if (!isAvail) {
        throw new Error(`Tên đăng nhập "${cleanUsername}" đã có người đăng ký. Vui lòng chọn một tên đăng nhập khác!`);
      }

      // Check if email already registered in Firestore
      const existingAccount = await findUserByEmail(cleanEmail);
      if (existingAccount) {
        throw new Error(`Email "${cleanEmail}" đã được đăng ký tài khoản. Vui lòng chuyển sang tab Đăng nhập!`);
      }

      let firebaseUser: User | null = null;

      // 1. Try Firebase Auth first
      try {
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        if (result.user) {
          firebaseUser = result.user;
        }
      } catch (fbErr: any) {
        if (
          fbErr.code === 'auth/operation-not-allowed' ||
          fbErr.message?.includes('operation-not-allowed')
        ) {
          console.info('Firebase Email/Password provider disabled on console. Registering seamlessly via Firestore Account.');
        } else if (fbErr.code === 'auth/email-already-in-use') {
          throw new Error('Email này đã được đăng ký tài khoản. Vui lòng chuyển sang tab Đăng nhập!');
        } else if (fbErr.code === 'auth/weak-password') {
          throw new Error('Mật khẩu cần tối thiểu 6 ký tự.');
        } else if (fbErr.code === 'auth/invalid-email') {
          throw new Error('Định dạng email không hợp lệ.');
        } else {
          console.warn('Firebase createUser warning, using Firestore account:', fbErr);
        }
      }

      // 2. Determine UID and secure password hash
      const uid = firebaseUser
        ? firebaseUser.uid
        : `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const displayName = name.trim() || cleanUsername || cleanEmail.split('@')[0];

      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName }).catch(() => {});
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(pass, salt);

      const isDefaultAuthor = AUTHOR_EMAILS.includes(cleanEmail);
      const isMain =
        isDefaultAuthor &&
        (cleanEmail === 'cuncondangiu07@gmail.com' ||
          cleanEmail === 'meomeoxinhxinh07@gmail.com' ||
          cleanEmail === 'nhatlinhpham010194@gmail.com' ||
          cleanEmail === 'maianhpham927@gmail.com' ||
          cleanEmail === 'mellifluous740@gmail.com' ||
          cleanEmail === 'vivi60810@gmail.com');

      const role: 'admin' | 'moderator' | 'collaborator' | 'author' | 'editor' | 'reader' = isMain
        ? 'admin'
        : isDefaultAuthor
        ? 'collaborator'
        : 'reader';
      const roleTitle = isMain
        ? 'Quản trị viên'
        : isDefaultAuthor
        ? 'Cộng tác viên'
        : 'Độc giả yêu mến';

      const newAccount: StoredUserAccount = {
        uid,
        email: cleanEmail,
        username: cleanUsername,
        displayName,
        photoURL: firebaseUser?.photoURL || null,
        role,
        roleTitle,
        passwordHash,
        salt,
        authProvider: firebaseUser ? 'firebase_email' : 'firestore_email',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 3. Save to Firestore (both user account and username mapping)
      await saveUserAccount(newAccount);

      // 4. Update session
      refreshSessionActivity();
      const appUser = buildAppUser(
        {
          uid,
          email: cleanEmail,
          displayName,
          photoURL: firebaseUser?.photoURL || null,
        },
        collaboratorsList,
        newAccount
      );

      setUser(appUser);
      try {
        localStorage.setItem('mel_user_session', JSON.stringify(appUser));
      } catch {}

      closeAuthModal();
    } catch (err: any) {
      console.error('Register error:', err);
      throw err;
    }
  };

  // Quick sign-in for Readers / Guests
  const quickReaderLogin = (nickname: string) => {
    refreshSessionActivity();
    const trimmed = nickname.trim() || 'Bạn đọc thân thương';
    const appUser: AppUser = {
      uid: `reader_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: null,
      displayName: trimmed,
      photoURL: null,
      isAuthor: false,
      isMainAuthor: false,
      isCollaborator: false,
      role: 'reader',
      roleTitle: 'Độc giả yêu mến',
      roleBadge: 'Độc giả',
    };
    setUser(appUser);
    try {
      localStorage.setItem('mel_user_session', JSON.stringify(appUser));
    } catch {}
    closeAuthModal();
  };

  const logout = async () => {
    try {
      await signOut(auth).catch(() => {});
    } finally {
      setUser(null);
      try {
        localStorage.removeItem('mel_user_session');
        localStorage.removeItem('mel_auth_last_activity');
      } catch {}
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthor: Boolean(user?.isAuthor),
        isMainAuthor: Boolean(user?.isMainAuthor),
        isCollaborator: Boolean(user?.isCollaborator),
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        collaboratorsList,
        addCollaboratorByEmail,
        removeCollaborator,
        updateCollaboratorRoleByAdmin,
        updateCollaboratorFull,
        updateUserProfileData,
        signInWithGoogle,
        signInWithGoogleCredential,
        signInWithEmail,
        registerWithEmail,
        quickReaderLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

