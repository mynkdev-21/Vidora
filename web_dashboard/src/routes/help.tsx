import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MessageCircle, Mail, ChevronDown, ChevronUp, LifeBuoy, ExternalLink, Send, Loader2, CheckCircle, X } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help & Support — Vidora" }] }),
  component: HelpPage,
});

const BG = "#06070d"; const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed";
const MUTED = "#64748b"; const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";

const FAQ = [
  { q: "How do I earn money on Vidora?", a: "You earn $5 for every 1000 views on your uploaded files. Views are counted when users watch your content through the Vidora app. You can also earn through referrals — 5% of every dollar your referred creators make." },
  { q: "What is the minimum payout amount?", a: "The minimum payout threshold is $5.00. Once your available balance reaches $5, you can request a withdrawal via PayPal, Wise, Payoneer, Crypto, Bank Transfer, or UPI." },
  { q: "How long does a payout take?", a: "Payouts are typically processed within 1–3 business days after your request is approved." },
  { q: "How do I upload files?", a: "You can upload files through the web Dashboard or via our Telegram Bot. Go to Dashboard → Upload, select your file, and it will be processed automatically." },
  { q: "What file types are supported?", a: "We support videos (MP4, WebM, MKV), images (JPG, PNG, GIF), audio (MP3, WAV), documents (PDF), and archives (ZIP, RAR). No file size limit." },
  { q: "How does the share link work?", a: "When you upload a file, you get a unique share link. When someone opens this link, they can view the file through the Vidora app. Each view earns you money." },
  { q: "Can I delete my uploaded files?", a: "Yes. Go to My Files in the Dashboard, find the file, and click delete. This is permanent and cannot be undone." },
  { q: "How does the referral system work?", a: "Share your referral link from the Referrals page. When someone signs up and uploads their first file, you earn 5% of all their future earnings — permanently." },
  { q: "Is the app free to use?", a: "Yes! The Vidora app is completely free to download and use. Content is supported by ads which help creators earn money." },
  { q: "How do I change my payment method?", a: "Go to Dashboard → Settings → Payment Setting. Select your preferred method (UPI, PayPal, or Bank Transfer), enter your details, and save." },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[18px] transition-all duration-200"
      style={{ background: open ? "rgba(167,139,250,0.06)" : "rgba(255,255,255,0.02)", border: open ? "1px solid rgba(167,139,250,0.2)" : `1px solid ${BORDER}` }}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-sm font-semibold text-white">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: PURPLE }} /> : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: MUTED }} />}
      </button>
      {open && <div className="px-5 pb-4"><p className="text-sm leading-relaxed" style={{ color: SUBTEXT }}>{a}</p></div>}
    </div>
  );
}

function MessageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await apiFetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), source: "landing" }),
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl p-6"
        style={{ background: "#0b0c14", border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}>
              <MessageCircle className="h-4 w-4" style={{ color: PURPLE }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Send a Message</p>
              <p className="text-[11px]" style={{ color: MUTED }}>We'll respond within 24 hours</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-white/5" style={{ color: MUTED }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <CheckCircle className="mx-auto h-12 w-12 mb-3" style={{ color: "#5eead4" }} />
            <p className="text-base font-bold text-white mb-1">Message Sent!</p>
            <p className="text-sm" style={{ color: SUBTEXT }}>We'll get back to you soon.</p>
            <button onClick={onClose} className="mt-5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Message</label>
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} maxLength={2000}
                placeholder="Describe your issue..."
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
              />
            </div>
            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
            <button
              type="submit" disabled={sending}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : "Send Message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function HelpPage() {
  const [showModal, setShowModal] = useState(false);
  const [telegramUrl, setTelegramUrl] = useState("https://t.me/vidorasupport");
  const [emailAddr, setEmailAddr] = useState("support@vidora.app");
  const [communityUrl, setCommunityUrl] = useState("https://t.me/vidoracommunity");

  useEffect(() => {
    apiFetch<{ success: boolean; data: Record<string, string> }>("/api/settings")
      .then((res) => {
        if (res.data.telegram_url) setTelegramUrl(res.data.telegram_url);
        if (res.data.support_email) setEmailAddr(res.data.support_email);
        if (res.data.community_url) setCommunityUrl(res.data.community_url);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: BG, color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      <div className="pointer-events-none fixed inset-0 opacity-[0.02]" style={{
        backgroundImage: "linear-gradient(rgba(167,139,250,1) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,1) 1px,transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <LandingHeader />

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-16">
        <h1 className="text-3xl font-bold text-white mb-2">Help & Support</h1>
        <p className="text-sm mb-10" style={{ color: MUTED }}>We're here to help. Find answers or reach out to us.</p>

        {/* Contact options */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {[
            { icon: MessageCircle, label: "Telegram", desc: "Fastest response — under 2 hours", href: telegramUrl, color: "#60a5fa" },
            { icon: Mail, label: "Email", desc: "Response within 24 hours", href: `mailto:${emailAddr}`, color: "#34d399" },
            { icon: LifeBuoy, label: "Community", desc: "Connect with other creators", href: communityUrl, color: PURPLE },
          ].map(c => (
            <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-[22px] p-5 transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
              <div className="grid h-10 w-10 place-items-center rounded-[12px] mb-3" style={{ background: `${c.color}18`, border: `1px solid ${c.color}30` }}>
                <c.icon className="h-5 w-5" style={{ color: c.color }} />
              </div>
              <p className="text-sm font-bold text-white">{c.label}</p>
              <p className="mt-1 text-xs" style={{ color: SUBTEXT }}>{c.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: c.color }}>
                Contact <ExternalLink className="h-3 w-3" />
              </div>
            </a>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="text-xl font-bold text-white mb-5">Frequently Asked Questions</h2>
        <div className="space-y-2.5">
          {FAQ.map(item => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
        </div>

        {/* Still need help */}
        <div className="mt-10 rounded-[22px] p-6 text-center"
          style={{ background: "linear-gradient(145deg,#1a0a3a 0%,#0f0720 50%,#0b0c14 100%)", border: "1px solid rgba(167,139,250,0.25)" }}>
          <LifeBuoy className="mx-auto h-8 w-8 mb-3" style={{ color: PURPLE }} />
          <h3 className="text-base font-bold text-white">Still need help?</h3>
          <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>Our team is always happy to assist.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}
            >
              <MessageCircle className="h-4 w-4" /> Message Us
            </button>
            <a href={`mailto:${emailAddr}`}
              className="flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-bold transition hover:opacity-90"
              style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", color: PURPLE }}>
              <Mail className="h-4 w-4" /> Email Us
            </a>
          </div>
        </div>
      </main>

      <LandingFooter />

      {/* Message Modal */}
      <MessageModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
