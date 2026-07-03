import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Send, CheckCircle, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact Us — Vidora" }] }),
  component: ContactPage,
});

const BG = "#06070d";
const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const PURPLE_D = "#7c3aed";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), source: "banned" }),
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12" style={{ background: `radial-gradient(ellipse 70% 50% at 50% -10%, rgba(124,58,237,0.12) 0%, transparent 70%), ${BG}` }}>
      <div className="mx-auto max-w-lg">
        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm mb-8 transition hover:opacity-80" style={{ color: MUTED }}>
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
        <p className="text-sm mb-8" style={{ color: MUTED }}>
          Have a question, issue, or feedback? Send us a message and we'll get back to you.
        </p>

        {sent ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <CheckCircle className="mx-auto h-12 w-12 mb-4" style={{ color: "#5eead4" }} />
            <h2 className="text-xl font-bold text-white mb-2">Message Sent!</h2>
            <p className="text-sm" style={{ color: MUTED }}>
              We've received your message and will respond as soon as possible.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}
            >
              Go Home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl p-6 space-y-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: MUTED }}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                maxLength={2000}
                placeholder="Describe your issue or question..."
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition resize-none focus:ring-2"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              />
              <p className="text-right text-[11px] mt-1" style={{ color: MUTED }}>{message.length}/2000</p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})`, boxShadow: "0 0 20px rgba(167,139,250,0.25)" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
