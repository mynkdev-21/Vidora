import { createContext, useContext, useState, ReactNode } from "react";
import {
  apiLogin,
  apiRegister,
  apiLogout,
  tokenStore,
  type AuthUser,
} from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login:  (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Rehydrate from localStorage on mount
  const [user, setUser] = useState<AuthUser | null>(() => tokenStore.getUser());

  const isAuthenticated = user !== null;

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiLogin(email, password);
      tokenStore.set(res.data.accessToken, res.data.refreshToken, res.data.user);
      setUser(res.data.user);
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Login failed. Please try again.",
      };
    }
  };

  // ── Signup ─────────────────────────────────────────────────────────────────
  const signup = async (
    name: string,
    email: string,
    password: string,
    referralCode?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiRegister(name, email, password, referralCode);
      tokenStore.set(res.data.accessToken, res.data.refreshToken, res.data.user);
      setUser(res.data.user);
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Signup failed. Please try again.",
      };
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) await apiLogout(refreshToken);
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
