import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import type { AuthUser } from '../services/api';

type AuthCtx = {
  user: AuthUser | null;
  setSession: (tokens: { accessToken: string; refreshToken?: string }, user: AuthUser) => void;
  logout: () => void;
  isCoach: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('trainingUser');
    return raw ? JSON.parse(raw) : null;
  });

  const value = useMemo<AuthCtx>(() => ({
    user,
    setSession: (tokens, u) => {
      localStorage.setItem('accessToken', tokens.accessToken);
      if (tokens.refreshToken) localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('trainingUser', JSON.stringify(u));
      setUser(u);
    },
    logout: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('trainingUser');
      setUser(null);
    },
    isCoach: ['COACH', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role || ''),
  }), [user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
