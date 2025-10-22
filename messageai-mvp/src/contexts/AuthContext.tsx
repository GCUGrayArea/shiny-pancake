import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { onAuthStateChangedListener, signIn as svcSignIn, signOut as svcSignOut, signUp as svcSignUp, getCurrentUser } from '@/services/auth.service';
import { setupPresenceSystem, teardownPresenceSystem } from '@/services/presence.service';
import { initDatabase } from '@/services/database.service';
import { startRealtimeSync, initialSync, stopRealtimeSync, getSyncStatus } from '@/services/sync.service';
import { User } from '@/types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);
  const [initialSyncCompleted, setInitialSyncCompleted] = useState<boolean>(false);

  console.log('🔐 AuthProvider: Rendering', { user: user?.uid, loading, error });

  // Initialize database on app startup
  useEffect(() => {
    const initializeDb = async () => {
      try {
        console.log('🗄️ AuthProvider: Initializing database');
        const result = await initDatabase();
        if (result.success) {
          console.log('✅ AuthProvider: Database initialized successfully');
          setDbInitialized(true);
        } else {
          console.error('❌ AuthProvider: Database initialization failed:', result.error);
        }
      } catch (error) {
        console.error('❌ AuthProvider: Database initialization error:', error);
      }
    };

    initializeDb();
  }, []);

  useEffect(() => {
    let listenerFired = false;

    // Set up auth state listener - it fires immediately with current state
    const unsub = onAuthStateChangedListener(async (u) => {
      console.log('🔐 AuthContext: Auth state changed', { user: u?.uid, hasUser: !!u });
      listenerFired = true;

      // Handle presence system setup/teardown based on auth state
      if (u) {
        // User logged in - set up presence system and sync
        try {
          await setupPresenceSystem(u.uid);
          console.log(`✅ Presence system initialized for user ${u.uid}`);

          // Initialize sync system sequentially to avoid transaction conflicts
          console.log('🔄 Initializing sync system...');
          await initialSync(u.uid);
          setInitialSyncCompleted(true);

          // Small delay to ensure initial sync completes fully
          await new Promise(resolve => setTimeout(resolve, 100));

          await startRealtimeSync(u.uid);
          console.log(`✅ Sync system initialized for user ${u.uid}`);
        } catch (error) {
          console.error('❌ Failed to initialize systems:', error);
        }
      } else {
        // User logged out - tear down systems
        try {
          await stopRealtimeSync();
          await teardownPresenceSystem();
          console.log('🛑 Systems torn down');
        } catch (error) {
          console.error('❌ Failed to teardown systems:', error);
        }
      }

      setUser(u);
      setLoading(false);
    });

    // Fallback: if listener doesn't fire within 3 seconds, stop loading anyway
    const timeout = setTimeout(() => {
      if (!listenerFired) {
        console.warn('Auth listener did not fire within 3s, forcing loading=false');
        setLoading(false);
      }
    }, 3000);

    return () => {
      clearTimeout(timeout);
      unsub();

      // Cleanup sync system on unmount
      try {
        stopRealtimeSync();
      } catch (error) {
        console.error('❌ Failed to cleanup sync system:', error);
      }
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    error,
    signIn: async (email, password) => {
      setError(null);
      try {
        await svcSignIn(email, password);
      } catch (e: any) {
        setError(e.message || 'Sign in failed');
        throw e;
      }
    },
    signUp: async (email, password, displayName) => {
      setError(null);
      try {
        await svcSignUp(email, password, displayName);
      } catch (e: any) {
        setError(e.message || 'Sign up failed');
        throw e;
      }
    },
    signOut: async () => {
      setError(null);
      try {
        await teardownPresenceSystem();
        await svcSignOut();
      } catch (error) {
        console.error('Error during sign out:', error);
        // Continue with sign out even if presence teardown fails
        await svcSignOut();
      }
    },
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}



