import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  apiLogin,
  apiRegister,
  apiLogout,
  tokenStore,
  restoreBrowserSession,
  type AuthUser,
} from "@/lib/api";
import { adminTokenStore } from "@/lib/admin-api";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  login:  (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setRestoring] = useState(true);
  useEffect(() => {
    tokenStore.clearLegacyStorage();
    adminTokenStore.clearLegacyStorage();
    const sync = () => setUser(tokenStore.getUser());
    window.addEventListener("vidora:user-session", sync);
    restoreBrowserSession().then(sync).catch(sync).finally(() => setRestoring(false));
    return () => window.removeEventListener("vidora:user-session", sync);
  }, []);

  const isAuthenticated = user !== null;

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiLogin(email, password);
      tokenStore.set(res.data.accessToken, res.data.csrfToken, res.data.user);
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
      tokenStore.set(res.data.accessToken, res.data.csrfToken, res.data.user);
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
    try { await apiLogout(); } finally { tokenStore.clear(); setUser(null); }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isRestoring, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
