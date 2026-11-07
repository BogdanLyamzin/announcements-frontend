"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.me().then((value) => { if (active) setUser(value); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    const expired = () => setUser(null);
    window.addEventListener("board:session-expired", expired);
    return () => { active = false; window.removeEventListener("board:session-expired", expired); };
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, setUser, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used within AuthProvider");
  return auth;
}
