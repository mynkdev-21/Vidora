import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { adminFetch, adminTokenStore } from "@/lib/admin-api";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

export const Route = createFileRoute("/main/admin")({
  component: AdminLogin,
});

const BG = "#06070d";
const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const PURPLE_D = "#7c3aed";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const RED = "#f87171";

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect via useEffect
  useEffect(() => {
    if (adminTokenStore.getToken()) {
      navigate({ to: "/admin" });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await adminFetch<{
        success: boolean;
        message: string;
        data: { admin: { id: string; name: string; email: string }; token: string };
      }>("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      adminTokenStore.set(res.data.token, res.data.admin);
      navigate({ to: "/admin" });
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logoIcon} alt="Vidora" className="h-10 w-10 rounded-xl" />
            <span className="text-xl font-extrabold text-white">Vidora</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: RED, border: "1px solid rgba(239,68,68,0.3)" }}>
              ADMIN
            </span>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>Sign in to admin panel</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="grid h-12 w-12 mx-auto place-items-center rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Shield className="h-6 w-6" style={{ color: RED }} />
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: RED, border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@vidora.app"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition focus:ring-2"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, "--tw-ring-color": PURPLE } as any}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 pr-10 text-sm outline-none transition focus:ring-2"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, "--tw-ring-color": PURPLE } as any}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: MUTED }}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, #dc2626, ${RED})`, boxShadow: "0 0 20px rgba(248,113,113,0.25)" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: MUTED }}>
          This is a restricted area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
