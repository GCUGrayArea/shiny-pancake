/**
 * Firebase Emulator Setup for Integration Tests
 * 
 * This file configures Firebase to use local emulators instead of production
 * Must be imported at the start of integration tests
 */

import { getFirebaseAuth, getFirebaseDatabase, getFirebaseStorage } from '../../services/firebase';
import { connectAuthEmulator } from 'firebase/auth';
import { connectDatabaseEmulator } from 'firebase/database';
import { connectStorageEmulator } from 'firebase/storage';

// Track if emulators are already connected
let emulatorsConnected = false;

/**
 * Connect Firebase services to local emulators
 */
export function connectToEmulators(): void {
  // Only connect once to avoid errors
  if (emulatorsConnected) {
    console.log('Emulators already connected');
    return;
  }

  try {
    // Connect Auth Emulator
    const auth = getFirebaseAuth();
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    console.log('✅ Connected to Auth Emulator on port 9099');

    // Connect Database Emulator
    const database = getFirebaseDatabase();
    connectDatabaseEmulator(database, '127.0.0.1', 9000);
    console.log('✅ Connected to Database Emulator on port 9000');

    // Connect Storage Emulator
    const storage = getFirebaseStorage();
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    console.log('✅ Connected to Storage Emulator on port 9199');

    emulatorsConnected = true;
    console.log('✅ All Firebase Emulators connected successfully');
  } catch (error) {
    // If emulators are already connected, this will throw but we can ignore it
    if ((error as Error).message.includes('already been called')) {
      console.log('Emulators already connected (expected on subsequent calls)');
      emulatorsConnected = true;
    } else {
      console.error('Failed to connect to Firebase Emulators:', error);
      throw error;
    }
  }
}

/**
 * Check if running in emulator mode
 */
export function isUsingEmulator(): boolean {
  return emulatorsConnected;
}

/**
 * Get emulator configuration
 */
export function getEmulatorConfig() {
  return {
    database: {
      host: '127.0.0.1',
      port: 9000,
    },
    auth: {
      host: '127.0.0.1',
      port: 9099,
    },
    storage: {
      host: '127.0.0.1',
      port: 9199,
    },
    ui: {
      host: '127.0.0.1',
      port: 4000,
      url: 'http://127.0.0.1:4000',
    },
  };
}

// Auto-connect on import
connectToEmulators();

