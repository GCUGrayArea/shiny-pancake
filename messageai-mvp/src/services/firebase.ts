import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  connectAuthEmulator,
  type Auth
} from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator, type Database } from 'firebase/database';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_DATABASE_URL,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  USE_FIREBASE_EMULATORS,
} from '@env';

// Check if emulators should be used
const shouldUseEmulators = USE_FIREBASE_EMULATORS === 'true';

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
      // Initialize without custom persistence for now
      // Firebase will use memory persistence (session-based)
      // TODO: Implement proper AsyncStorage persistence later
      const auth = initializeAuth(app);

      // Connect to Auth emulator if explicitly enabled
      if (shouldUseEmulators) {
        try {
          connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
          console.log('🔗 Firebase: Connected to Auth emulator');
        } catch (error) {
          console.warn('⚠️ Firebase: Could not connect to Auth emulator:', error);
        }
      } else {
        console.log('🔗 Firebase: Using live Firebase Auth');
      }

      return auth;
    } catch (error: any) {
      // If already initialized (shouldn't happen, but handle it)
      if (error?.code === 'auth/already-initialized') {
        const auth = getAuth(app);

        // Connect to Auth emulator if explicitly enabled
        if (shouldUseEmulators) {
          try {
            connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
            console.log('🔗 Firebase: Connected to Auth emulator');
          } catch (emulatorError) {
            console.warn('⚠️ Firebase: Could not connect to Auth emulator:', emulatorError);
          }
        } else {
          console.log('🔗 Firebase: Using live Firebase Auth');
        }

        return auth;
      }
      throw error;
    }
  }

  // On subsequent calls, get the existing instance
  return getAuth(app);
}

export function getFirebaseDatabase(): Database {
  const app = getFirebaseApp();
  const db = getDatabase(app);

  // Connect to Database emulator if explicitly enabled
  if (shouldUseEmulators) {
    try {
      connectDatabaseEmulator(db, "127.0.0.1", 9000, {
        mockUserToken: 'test-user-token'
      });
      console.log('🔗 Firebase: Connected to Database emulator');
    } catch (error) {
      console.warn('⚠️ Firebase: Could not connect to Database emulator:', error);
    }
  } else {
    console.log('🔗 Firebase: Using live Firebase Database');
  }

  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  const app = getFirebaseApp();

  // Connect to Storage emulator if explicitly enabled
  if (shouldUseEmulators) {
    try {
      connectStorageEmulator(getStorage(app), "127.0.0.1", 9199);
      console.log('🔗 Firebase: Connected to Storage emulator');
    } catch (error) {
      console.warn('⚠️ Firebase: Could not connect to Storage emulator:', error);
      console.log('🔗 Firebase: Falling back to live Firebase Storage');
    }
  } else {
    console.log('🔗 Firebase: Using live Firebase Storage');
  }

  return getStorage(app);
}


