import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Sparkles, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign Up — Vidora" }] }),
  component: SignupPage,
});

const BG      = "#06070d";
const CARD    = "#0f1120";
const PURPLE  = "#a78bfa";
const PURPLE_D = "#7c3aed";
const BORDER  = "rgba(255,255,255,0.08)";
const MUTED   = "#64748b";
const SUBTEXT = "#94a3b8";

const PERKS = [
  "Monetize from the very first view",
  "Unlimited cloud storage",
  "Fast global payouts",
  "5% OG uploader referral bonus",
];

function SignupPage() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName]                 = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  // Get referral code from URL
  const refCode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ref") : null;

  useEffect(() => {
    if (isAuthenticated) navigate({ to: "/dashboard" });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await signup(name.trim(), email.trim(), password, refCode || undefined);
    setLoading(false);

    if (result.success) {
      navigate({ to: "/dashboard" });
    } else {
      setError(result.error ?? "Signup failed. Please try again.");
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

      <div className="relative w-full max-w-4xl">
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

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left — perks panel */}
          <div
            className="hidden rounded-[24px] p-8 lg:flex lg:flex-col lg:justify-between"
            style={{
              background: `linear-gradient(145deg,#1a0a3a 0%,#0f0720 60%,#0b0c14 100%)`,
              border: "1px solid rgba(167,139,250,0.2)",
              boxShadow: "0 0 40px rgba(124,58,237,0.1)",
            }}
          >
            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", color: PURPLE }}
              >
                <Sparkles className="h-3 w-3" /> Free Forever
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight text-white">
                Start earning from<br />
                <span style={{ color: PURPLE }}>day one.</span>
              </h2>
              <p className="mt-3 text-sm" style={{ color: SUBTEXT }}>
                Join thousands of creators who monetize their content on Vidora — no thresholds, no waiting.
              </p>

              <ul className="mt-8 space-y-3">
                {PERKS.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-sm" style={{ color: SUBTEXT }}>
                    <div
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                      style={{ background: "rgba(167,139,250,0.15)" }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: PURPLE }} />
                    </div>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* bottom stat strip */}
            <div className="mt-10 grid grid-cols-2 gap-3">
              {[
                { v: "∞", l: "Storage" },
                { v: "1st", l: "View Earns" },
                { v: "5%", l: "Referral Bonus" },
                { v: "$5", l: "Min. Payout" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-[14px] p-4"
                  style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.15)" }}
                >
                  <div className="text-2xl font-bold" style={{ color: PURPLE }}>{s.v}</div>
                  <div className="mt-0.5 text-xs" style={{ color: MUTED }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div
            className="rounded-[24px] p-8"
            style={{
              background: `linear-gradient(145deg,${CARD} 0%,#0b0c14 100%)`,
              border: "1px solid rgba(167,139,250,0.2)",
              boxShadow: "0 0 40px rgba(124,58,237,0.12), 0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            <h1 className="text-2xl font-bold tracking-tight text-white">Create account</h1>
            <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>
              Start uploading and monetizing for free
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-white">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-[14px] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600"
                  style={{ background: "rgba(255,255,255,0.05)", border: BORDER }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)")}
                  onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
                />
              </div>

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
                  style={{ background: "rgba(255,255,255,0.05)", border: BORDER }}
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
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full rounded-[14px] px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-slate-600"
                    style={{ background: "rgba(255,255,255,0.05)", border: BORDER }}
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

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-white">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-[14px] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600"
                  style={{ background: "rgba(255,255,255,0.05)", border: BORDER }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)")}
                  onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-[12px] px-4 py-3 text-sm"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
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
                {loading ? "Creating account…" : "Create Account"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs" style={{ color: MUTED }}>
              By signing up you agree to our{" "}
              <Link to="/terms" className="underline hover:text-white transition">Terms &amp; Conditions</Link>
            </p>

            <p className="mt-4 text-center text-sm" style={{ color: MUTED }}>
              Already have an account?{" "}
              <Link to="/login" className="font-semibold transition hover:opacity-80" style={{ color: PURPLE }}>
                Log in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: MUTED }}>
          <Link to="/" className="transition hover:text-white">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
