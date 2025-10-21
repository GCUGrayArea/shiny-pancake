import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
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

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Database | null = null;
let storageInstance: FirebaseStorage | null = null;

function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  const config = {
    apiKey: (FIREBASE_API_KEY as string)?.trim?.() || FIREBASE_API_KEY,
    authDomain: (FIREBASE_AUTH_DOMAIN as string)?.trim?.() || FIREBASE_AUTH_DOMAIN,
    databaseURL: (FIREBASE_DATABASE_URL as string)?.trim?.() || FIREBASE_DATABASE_URL,
    projectId: (FIREBASE_PROJECT_ID as string)?.trim?.() || FIREBASE_PROJECT_ID,
    storageBucket: (FIREBASE_STORAGE_BUCKET as string)?.trim?.() || FIREBASE_STORAGE_BUCKET,
    messagingSenderId: (FIREBASE_MESSAGING_SENDER_ID as string)?.trim?.() || FIREBASE_MESSAGING_SENDER_ID,
    appId: (FIREBASE_APP_ID as string)?.trim?.() || FIREBASE_APP_ID,
  } as const;
  // eslint-disable-next-line no-console
  console.log(
    'Firebase config:',
    'projectId=', config.projectId,
    'apiKeySuffix=', typeof config.apiKey === 'string' ? config.apiKey.slice(-6) : 'n/a'
  );
  appInstance = (getApps().length ? getApps()[0] : initializeApp(config)) as FirebaseApp;
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  // Get Auth instance - React Native persistence is handled automatically
  authInstance = getAuth(app);
  return authInstance;
}

export function getFirebaseDatabase(): Database {
  if (dbInstance) return dbInstance;
  dbInstance = getDatabase(getFirebaseApp());
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (storageInstance) return storageInstance;
  storageInstance = getStorage(getFirebaseApp());
  return storageInstance;
}


