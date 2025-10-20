import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { onAuthStateChangedListener, signIn as svcSignIn, signOut as svcSignOut, signUp as svcSignUp, getCurrentUser } from '@/services/auth.service';
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
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChangedListener(u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
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
      await svcSignOut();
    },
  }), [user, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}



