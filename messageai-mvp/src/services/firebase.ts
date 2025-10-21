import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_DATABASE_URL,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

function getFirebaseApp(): FirebaseApp {
  // Check if app is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getApp(); // Return the default app
  }

  const config = {
    apiKey: (FIREBASE_API_KEY as string)?.trim?.() || FIREBASE_API_KEY,
    authDomain: (FIREBASE_AUTH_DOMAIN as string)?.trim?.() || FIREBASE_AUTH_DOMAIN,
    databaseURL: (FIREBASE_DATABASE_URL as string)?.trim?.() || FIREBASE_DATABASE_URL,
    projectId: (FIREBASE_PROJECT_ID as string)?.trim?.() || FIREBASE_PROJECT_ID,
    storageBucket: (FIREBASE_STORAGE_BUCKET as string)?.trim?.() || FIREBASE_STORAGE_BUCKET,
    messagingSenderId: (FIREBASE_MESSAGING_SENDER_ID as string)?.trim?.() || FIREBASE_MESSAGING_SENDER_ID,
    appId: (FIREBASE_APP_ID as string)?.trim?.() || FIREBASE_APP_ID,
  } as const;

  return initializeApp(config);
}

let authInitialized = false;

export function getFirebaseAuth(): Auth {
  const app = getFirebaseApp();

  // On first call, initialize auth
  if (!authInitialized) {
    authInitialized = true;
    try {
      return initializeAuth(app);
    } catch (error: any) {
      // If already initialized (shouldn't happen, but handle it)
      if (error?.code === 'auth/already-initialized') {
        return getAuth(app);
      }
      throw error;
    }
  }

  // On subsequent calls, get the existing instance
  return getAuth(app);
}

export function getFirebaseDatabase(): Database {
  return getDatabase(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}


