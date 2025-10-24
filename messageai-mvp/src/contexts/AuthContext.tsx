import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { onAuthStateChangedListener, signIn as svcSignIn, signOut as svcSignOut, signUp as svcSignUp, getCurrentUser } from '@/services/auth.service';
import { setupPresenceSystem, teardownPresenceSystem } from '@/services/presence.service';
import { initDatabase } from '@/services/database.service';
import { startRealtimeSync, initialSync, stopRealtimeSync, getSyncStatus } from '@/services/sync.service';
import * as NotificationManager from '@/services/notification-manager.service';
import { User } from '@/types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dbInitialized, setDbInitialized] = useState<boolean>(false);
  const [initialSyncCompleted, setInitialSyncCompleted] = useState<boolean>(false);


  // Initialize database on app startup
  useEffect(() => {
    const initializeDb = async () => {
      try {
        const result = await initDatabase();
        if (result.success) {
          setDbInitialized(true);
        } else {
        }
      } catch (error) {
      }
    };

    initializeDb();
  }, []);

  useEffect(() => {
    let listenerFired = false;

    // Set up auth state listener - it fires immediately with current state
    const unsub = onAuthStateChangedListener(async (u) => {
      listenerFired = true;

      // Handle presence system setup/teardown based on auth state
      if (u) {
        // User logged in - set up presence system and sync
        try {
          // Set current user for notification manager
          NotificationManager.setCurrentUser(u.uid);
          
          await setupPresenceSystem(u.uid);

          // Initialize sync system sequentially to avoid transaction conflicts
          await initialSync(u.uid);
          setInitialSyncCompleted(true);

          // Small delay to ensure initial sync completes fully
          await new Promise(resolve => setTimeout(resolve, 100));

          await startRealtimeSync(u.uid);
        } catch (error) {
        }
      } else {
        // User logged out - tear down systems
        try {
          NotificationManager.setCurrentUser(null);
          await stopRealtimeSync();
          await teardownPresenceSystem();
        } catch (error) {
        }
      }

      setUser(u);
      setLoading(false);
    });

    // Fallback: if listener doesn't fire within 3 seconds, stop loading anyway
    const timeout = setTimeout(() => {
      if (!listenerFired) {
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
      }
    };
  }, []);

  const refreshUser = async () => {
    if (!user?.uid) return;

    try {
      const { getUser } = await import('@/services/local-user.service');
      const result = await getUser(user.uid);
      if (result.success && result.data) {
        setUser(result.data);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

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
        // Continue with sign out even if presence teardown fails
        await svcSignOut();
      }
    },
    refreshUser,
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}



