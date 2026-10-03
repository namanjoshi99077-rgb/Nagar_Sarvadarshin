import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'employee' | 'admin';
};

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  signIn: (token: string, user: SessionUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const TOKEN_KEY = 'nagar-session-token';
const USER_KEY = 'nagar-session-user';
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(USER_KEY)])
      .then(([token, storedUser]) => {
        if (!active) return;
        if (!token || !storedUser) {
          setUser(null);
          return;
        }
        try {
          setUser(JSON.parse(storedUser) as SessionUser);
        } catch {
          setUser(null);
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async signIn(token, nextUser) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      },
      async signOut() {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
        setUser(null);
      },
    }),
    [user, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}

export const sessionTokenKey = TOKEN_KEY;