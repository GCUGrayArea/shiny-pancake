import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { createUserProfile, getUserProfile } from './user.service';
import { User } from '@/types';
import { ERROR_CODES, USER_CONSTANTS } from '@/constants';

export type Unsubscribe = () => void;

export function mapFirebaseAuthError(code: string): string {
  switch (code) {
    case ERROR_CODES.AUTH_INVALID_EMAIL:
      return 'Please enter a valid email address.';
    case ERROR_CODES.AUTH_USER_NOT_FOUND:
      return 'No account found with that email.';
    case ERROR_CODES.AUTH_WRONG_PASSWORD:
      return 'Incorrect password. Please try again.';
    case ERROR_CODES.AUTH_WEAK_PASSWORD:
      return `Password must be at least ${USER_CONSTANTS.MIN_PASSWORD_LENGTH} characters.`;
    case ERROR_CODES.AUTH_EMAIL_ALREADY_IN_USE:
      return 'That email is already in use.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled in Firebase. Enable it in Authentication settings.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/invalid-api-key':
    case 'auth/missing-api-key':
      return 'Invalid Firebase API key. Verify FIREBASE_API_KEY in your .env file.';
    case 'auth/configuration-not-found':
      return 'Firebase Auth is not configured for this app. Check your Firebase project settings.';
    case 'auth/invalid-app-id':
      return 'Invalid Firebase App ID. Verify FIREBASE_APP_ID in your .env file.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a bit and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Convert Firebase Auth user to basic User object (without RTDB profile data)
 * Used as fallback when RTDB profile cannot be loaded
 */
function toUser(fbUser: FirebaseUser): User {
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? '',
    displayName: fbUser.displayName ?? '',
    createdAt: fbUser.metadata?.creationTime ? Date.parse(fbUser.metadata.creationTime) : Date.now(),
    lastSeen: Date.now(),
    isOnline: true,
    autoTranslateEnabled: false,
    preferredLanguage: 'en',
  };
}

/**
 * Load full user profile from RTDB, merging with Firebase Auth data
 * This ensures we get all custom fields (autoTranslateEnabled, preferredLanguage, etc.)
 */
async function toUserWithProfile(fbUser: FirebaseUser): Promise<User> {
  try {
    const profile = await getUserProfile(fbUser.uid);

    if (profile) {
      // Merge RTDB profile with Auth user data
      return {
        ...profile,
        // Always update these from Auth in case they changed
        email: fbUser.email ?? profile.email,
        displayName: fbUser.displayName ?? profile.displayName,
        isOnline: true,
        lastSeen: Date.now(),
      };
    }

    // Fallback to basic user if profile doesn't exist
    return toUser(fbUser);
  } catch (error) {
    console.error('Failed to load user profile from RTDB:', error);
    // Fallback to basic user on error
    return toUser(fbUser);
  }
}

export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (auth.currentUser && displayName) {
      await updateProfile(auth.currentUser, { displayName });
    }
    // Ensure profile exists in RTDB
    await createUserProfile(cred.user.uid, cred.user.email ?? email, displayName);
    // Load full user profile from RTDB
    const user = await toUserWithProfile(cred.user);
    return user;
  } catch (e: any) {
    // Surface diagnostic info to developer console while keeping UI friendly
    // eslint-disable-next-line no-console
    const message = mapFirebaseAuthError(e?.code || 'unknown');
    throw new Error(message);
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // Ensure profile exists in RTDB (in case user was created before this feature)
    // This is idempotent - won't overwrite existing profiles
    await createUserProfile(cred.user.uid, cred.user.email ?? email, cred.user.displayName ?? '');

    // Load full user profile from RTDB (includes all custom fields)
    const user = await toUserWithProfile(cred.user);

    return user;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    const message = mapFirebaseAuthError(e?.code || 'unknown');
    throw new Error(message);
  }
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export async function getCurrentUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  const fbUser = auth.currentUser;
  return fbUser ? await toUserWithProfile(fbUser) : null;
}

export function onAuthStateChangedListener(callback: (user: User | null) => void | Promise<void>): Unsubscribe {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      const user = await toUserWithProfile(fbUser);
      await callback(user);
    } else {
      await callback(null);
    }
  });
}



