import { getFirebaseDatabase } from './firebase';
import { ref, set, get, update, onValue, off } from 'firebase/database';
import { User } from '@/types';

export async function createUserProfile(uid: string, email: string, displayName: string): Promise<void> {
  const db = getFirebaseDatabase();
  const now = Date.now();
  await set(ref(db, `users/${uid}`), {
    uid,
    email,
    displayName,
    createdAt: now,
    lastSeen: now,
    isOnline: false,
  });
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const db = getFirebaseDatabase();
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? (snap.val() as User) : null;
}

export async function updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
  const db = getFirebaseDatabase();
  await update(ref(db, `users/${uid}`), updates as Record<string, any>);
}

export function subscribeToUser(uid: string, callback: (user: User | null) => void): () => void {
  const db = getFirebaseDatabase();
  const userRef = ref(db, `users/${uid}`);
  const handler = onValue(userRef, (snap) => {
    callback(snap.exists() ? (snap.val() as User) : null);
  });
  return () => off(userRef, 'value', handler);
}



