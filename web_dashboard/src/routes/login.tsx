import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log In — Vidora" }] }),
  component: LoginPage,
});

const BG     = "#06070d";
const CARD   = "#0f1120";
const PURPLE = "#a78bfa";
const PURPLE_D = "#7c3aed";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED  = "#64748b";
const SUBTEXT = "#94a3b8";

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [isBanned, setIsBanned]         = useState(false);
  const [loading, setLoading]           = useState(false);

  // Handle admin impersonation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("impersonate") === "1") {
      const token = localStorage.getItem("__impersonate_token");
      const userStr = localStorage.getItem("__impersonate_user");
      if (token && userStr) {
        localStorage.setItem("vdr_access_token", token);
        localStorage.setItem("vdr_user", userStr);
        localStorage.removeItem("__impersonate_token");
        localStorage.removeItem("__impersonate_user");
        window.location.href = "/dashboard";
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/dashboard" });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsBanned(false);
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate({ to: "/dashboard" });
    } else {
      const msg = result.error ?? "Login failed. Please try again.";
      if (msg.toLowerCase().includes("banned")) {
        setIsBanned(true);
      }
      setError(msg);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{
        background: `radial-gradient(ellipse 70% 50% at 50% -10%, rgba(124,58,237,0.15) 0%, transparent 70%), ${BG}`,
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(167,139,250,1) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,1) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center rounded-xl"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}
          >
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">Vidora</span>
        </Link>

        {/* Card */}
        <div
          className="rounded-[24px] p-8"
          style={{
            background: `linear-gradient(145deg,${CARD} 0%,#0b0c14 100%)`,
            border: "1px solid rgba(167,139,250,0.2)",
            boxShadow: "0 0 40px rgba(124,58,237,0.12), 0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
          <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>
            Log in to your Vidora account
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-[14px] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: BORDER,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)")}
                onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-[14px] px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: BORDER,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)")}
                  onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition hover:text-white"
                  style={{ color: MUTED }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex flex-col gap-2 rounded-[12px] px-4 py-3 text-sm"
                style={{ background: isBanned ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
                {isBanned && (
                  <a
                    href="/contact"
                    className="flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition hover:opacity-90"
                    style={{ background: "rgba(255,255,255,0.08)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    💬 Contact Support
                  </a>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`,
                boxShadow: loading ? "none" : "0 0 24px rgba(167,139,250,0.35)",
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Logging in…" : "Log In"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm">
            <Link to="/forgot-password" className="font-semibold transition hover:opacity-80" style={{ color: PURPLE }}>
              Forgot password?
            </Link>
          </p>

          <p className="mt-4 text-center text-sm" style={{ color: MUTED }}>
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold transition hover:opacity-80" style={{ color: PURPLE }}>
              Sign up free
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: MUTED }}>
          <Link to="/" className="transition hover:text-white">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
