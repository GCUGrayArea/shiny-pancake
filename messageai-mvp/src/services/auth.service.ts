import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { createUserProfile } from './user.service';
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

function toUser(fbUser: FirebaseUser): User {
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? '',
    displayName: fbUser.displayName ?? '',
    createdAt: fbUser.metadata?.creationTime ? Date.parse(fbUser.metadata.creationTime) : Date.now(),
    lastSeen: Date.now(),
    isOnline: true,
  };
}

export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (auth.currentUser && displayName) {
      await updateProfile(auth.currentUser, { displayName });
    }
    const user = toUser(cred.user);
    // Ensure profile exists in RTDB
    await createUserProfile(user.uid, user.email, displayName || user.displayName);
    return { ...user, displayName: displayName || user.displayName };
  } catch (e: any) {
    // Surface diagnostic info to developer console while keeping UI friendly
    // eslint-disable-next-line no-console
    console.error('signUp error:', e?.code, e?.message);
    const message = mapFirebaseAuthError(e?.code || 'unknown');
    throw new Error(message);
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return toUser(cred.user);
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('signIn error:', e?.code, e?.message);
    const message = mapFirebaseAuthError(e?.code || 'unknown');
    throw new Error(message);
  }
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  const fbUser = auth.currentUser;
  return fbUser ? toUser(fbUser) : null;
}

export function onAuthStateChangedListener(callback: (user: User | null) => void): Unsubscribe {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (fbUser) => {
    callback(fbUser ? toUser(fbUser) : null);
  });
}



