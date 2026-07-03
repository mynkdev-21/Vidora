import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/verify-email")({
  head: () => ({ meta: [{ title: "Verify Email — Vidora" }] }),
  component: VerifyEmailPage,
});

const BG = "#06070d"; const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed"; const MUTED = "#64748b";

function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) { setStatus("error"); setMessage("Invalid verification link."); return; }

    apiFetch<{ success: boolean; message: string }>(`/api/auth/verify-email?token=${token}`)
      .then(res => { setStatus("success"); setMessage(res.message); })
      .catch(err => { setStatus("error"); setMessage(err.message || "Verification failed."); });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: BG }}>
      <div className="text-center max-w-sm">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin mb-4" style={{ color: PURPLE }} />
            <p className="text-sm" style={{ color: MUTED }}>Verifying your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="mx-auto h-16 w-16 mb-4" style={{ color: "#5eead4" }} />
            <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-sm mb-6" style={{ color: MUTED }}>{message}</p>
            <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}>
              Go to Dashboard
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="mx-auto h-16 w-16 mb-4" style={{ color: "#f87171" }} />
            <h1 className="text-2xl font-bold text-white mb-2">Verification Failed</h1>
            <p className="text-sm mb-6" style={{ color: MUTED }}>{message}</p>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}>
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
