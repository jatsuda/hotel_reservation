"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { loginAccount, registerAccount, getCurrentUser, setToken, clearToken, getToken } from "./api";
import type { AuthUser, AuthResponse } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (fullName: string, email: string, password: string, phone?: string) => Promise<AuthUser>;
  logout: () => void;
  // Swaps in a fresh token/user from an AuthResponse without a full
  // login round-trip - used after changing email, since the old token's
  // embedded email stops matching any account the moment that saves
  // (see app/account/password/page.tsx).
  applySession: (res: AuthResponse) => AuthUser;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Mirrors the role into a plain (non-httpOnly) cookie so middleware.ts can
// gate /admin/** at the edge. Not a security boundary by itself - the real
// enforcement is server-side in Spring Security - just a UX redirect.
function setAuthCookie(role: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `hotel_auth_role=${encodeURIComponent(role)}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax${secure}`;
}
function clearAuthCookie() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `hotel_auth_role=; path=/; max-age=0; SameSite=Lax${secure}`;
}

function toAuthUser(res: AuthResponse): AuthUser {
  return {
    userId: res.userId,
    fullName: res.fullName,
    email: res.email,
    role: res.role,
    guestId: res.guestId,
    hotelId: res.hotelId,
    permissions: res.permissions ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    getCurrentUser()
      .then((res) => {
        setUser(toAuthUser(res));
        setAuthCookie(res.role);
      })
      .catch(() => {
        // Token expired/invalid - clear it quietly.
        clearToken();
        clearAuthCookie();
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await loginAccount({ email, password });
    return applySession(res);
  }

  async function register(fullName: string, email: string, password: string, phone?: string) {
    const res = await registerAccount({ fullName, email, password, phone });
    return applySession(res);
  }

  function applySession(res: AuthResponse) {
    setToken(res.token);
    setAuthCookie(res.role);
    const authUser = toAuthUser(res);
    setUser(authUser);
    return authUser;
  }

  function logout() {
    clearToken();
    clearAuthCookie();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, applySession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
