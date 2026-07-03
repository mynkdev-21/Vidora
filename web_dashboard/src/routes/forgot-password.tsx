import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Sparkles, Loader2, AlertCircle, CheckCircle, ArrowLeft, Mail, Key } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — Vidora" }] }),
  component: ForgotPasswordPage,
});

const BG = "#06070d"; const CARD = "#0f1120"; const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed";
const BORDER = "rgba(255,255,255,0.08)"; const MUTED = "#64748b"; const SUBTEXT = "#94a3b8";

function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "otp" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setStep("otp");
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email: email.trim(), otp, newPassword }) });
      setStep("done");
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: `radial-gradient(ellipse 70% 50% at 50% -10%, rgba(124,58,237,0.15) 0%, transparent 70%), ${BG}` }}>
      <div className="relative w-full max-w-md">
        <Link to="/login" className="mb-6 inline-flex items-center gap-1.5 text-sm" style={{ color: MUTED }}>
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <div className="rounded-[24px] p-8" style={{ background: `linear-gradient(145deg,${CARD} 0%,#0b0c14 100%)`, border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 0 40px rgba(124,58,237,0.12)" }}>
          {step === "done" ? (
            <div className="text-center py-4">
              <CheckCircle className="mx-auto h-12 w-12 mb-4" style={{ color: "#5eead4" }} />
              <h2 className="text-xl font-bold text-white mb-2">Password Reset!</h2>
              <p className="text-sm mb-6" style={{ color: SUBTEXT }}>You can now log in with your new password.</p>
              <Link to="/login" className="inline-flex items-center gap-2 rounded-[14px] px-6 py-3 text-sm font-bold text-white" style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
                Go to Login
              </Link>
            </div>
          ) : step === "otp" ? (
            <>
              <div className="mb-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl mb-4" style={{ background: "rgba(167,139,250,0.12)" }}>
                  <Key className="h-5 w-5" style={{ color: PURPLE }} />
                </div>
                <h1 className="text-xl font-bold text-white">Enter Reset Code</h1>
                <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>We sent a 6-digit code to {email}</p>
              </div>
              <form onSubmit={handleReset} className="space-y-4">
                <input value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} placeholder="000000"
                  className="w-full rounded-[14px] px-4 py-3 text-center text-2xl font-bold tracking-[12px] text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: BORDER }} />
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="New password (min 6 chars)"
                  className="w-full rounded-[14px] px-4 py-3 text-sm text-white outline-none" style={{ background: "rgba(255,255,255,0.05)", border: BORDER }} />
                {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl mb-4" style={{ background: "rgba(167,139,250,0.12)" }}>
                  <Mail className="h-5 w-5" style={{ color: PURPLE }} />
                </div>
                <h1 className="text-xl font-bold text-white">Forgot Password?</h1>
                <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>Enter your email and we'll send a reset code.</p>
              </div>
              <form onSubmit={handleSendOtp} className="space-y-4">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                  className="w-full rounded-[14px] px-4 py-3 text-sm text-white outline-none" style={{ background: "rgba(255,255,255,0.05)", border: BORDER }} />
                {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {loading ? "Sending..." : "Send Reset Code"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
