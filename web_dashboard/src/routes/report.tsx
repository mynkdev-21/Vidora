import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Flag, Send, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Report Content — Vidora" }] }),
  component: ReportPage,
});

const BG = "#06070d";
const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const PURPLE_D = "#7c3aed";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const RED = "#f87171";

const REASONS = [
  "Illegal content",
  "Copyright infringement",
  "Spam or misleading",
  "Harassment or bullying",
  "Violence or dangerous content",
  "Sexual content",
  "Other",
];

function ReportPage() {
  const token = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null;
  const fileName = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("name") : null;

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) { setError("Please select a reason."); return; }
    setError("");
    setSending(true);

    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: "Report",
          email: email.trim() || "anonymous@report.vidora.app",
          message: `[REPORT] File: ${fileName || "unknown"}\nToken: ${token || "unknown"}\nReason: ${reason}\nDetails: ${details.trim() || "No additional details"}`,
          source: "report",
        }),
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "Inter, sans-serif" }}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.02]" style={{
        backgroundImage: "linear-gradient(rgba(167,139,250,1) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,1) 1px,transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <LandingHeader />

      <main className="relative z-10 mx-auto max-w-lg px-4 pb-20 pt-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold mb-6" style={{ color: MUTED }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        {sent ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <CheckCircle className="mx-auto h-12 w-12 mb-4" style={{ color: "#5eead4" }} />
            <h2 className="text-xl font-bold text-white mb-2">Report Submitted</h2>
            <p className="text-sm" style={{ color: MUTED }}>
              Thank you for reporting. We'll review this content and take action if it violates our policies.
            </p>
            <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}>
              Go Home
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <Flag className="h-5 w-5" style={{ color: RED }} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Report Content</h1>
                <p className="text-xs" style={{ color: MUTED }}>Help us keep Vidora safe</p>
              </div>
            </div>

            {token && (
              <div className="rounded-xl px-3 py-2 mb-5 text-xs" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <span style={{ color: MUTED }}>Reporting: </span>
                <span className="font-semibold text-white">{fileName || token}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold mb-2" style={{ color: MUTED }}>Reason for reporting</label>
                <div className="space-y-2">
                  {REASONS.map((r) => (
                    <label key={r} className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition" style={{
                      background: reason === r ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${reason === r ? "rgba(239,68,68,0.3)" : BORDER}`,
                    }}>
                      <div className="grid h-4 w-4 shrink-0 place-items-center rounded-full" style={{
                        border: `2px solid ${reason === r ? RED : MUTED}`,
                        background: reason === r ? RED : "transparent",
                      }}>
                        {reason === r && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm" style={{ color: reason === r ? RED : TEXT }}>{r}</span>
                      <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="hidden" />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Additional details (optional)</label>
                <textarea
                  value={details} onChange={(e) => setDetails(e.target.value)}
                  rows={3} maxLength={1000} placeholder="Provide more context..."
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Your email (optional, for follow-up)</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>

              {error && <p className="text-xs" style={{ color: RED }}>{error}</p>}

              <button type="submit" disabled={sending || !reason}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #dc2626, #f87171)" }}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Submitting..." : "Submit Report"}
              </button>
            </form>
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}
