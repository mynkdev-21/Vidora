import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MessageCircle, Mail, ChevronDown, ChevronUp, ExternalLink, LifeBuoy, Send, Loader2, CheckCircle, X, Ticket, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/dashboard/support")({
  head: () => ({ meta: [{ title: "Support — Vidora" }] }),
  component: SupportPage,
});

const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed"; const MUTED = "#64748b";
const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";

const FAQ_ITEMS = [
  { q:"How do I earn money on Vidora?", a:"You earn money every time someone views a file you've uploaded. You can also earn through referrals — 5% of every dollar your referred creators make." },
  { q:"What is the minimum payout amount?", a:"The minimum payout threshold is $5.00. Once your available balance reaches $5, you can request a withdrawal via PayPal, Wise, Payoneer, Crypto, Bank Transfer, or UPI." },
  { q:"How long does a payout take?", a:"Payouts are typically processed within 1–3 business days after your request is approved. You'll see the status update in your Withdraw page." },
  { q:"Why is my file showing as 'Processing'?", a:"All newly uploaded files go through a quick review process to ensure they comply with our content policy. This usually takes less than 24 hours." },
  { q:"Can I delete a file after uploading it?", a:"Yes. Go to My Files, find the file you want to remove, and click the delete button. Note that deleting a file is permanent and cannot be undone." },
  { q:"How does the referral system work?", a:"Share your unique referral link from the Referrals page. When someone signs up using your link and uploads their first file, you earn 5% of all their future earnings from views — permanently." },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-[16px] transition-all duration-200"
      style={{ background:open?"rgba(167,139,250,0.06)":"rgba(255,255,255,0.02)", border:open?"1px solid rgba(167,139,250,0.2)":`1px solid ${BORDER}` }}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-sm font-semibold text-white">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color:PURPLE }} /> : <ChevronDown className="h-4 w-4 shrink-0" style={{ color:MUTED }} />}
      </button>
      {open && <div className="px-5 pb-4"><p className="text-sm leading-relaxed" style={{ color:SUBTEXT }}>{a}</p></div>}
    </div>
  );
}

function MessageModal({ open, onClose, userName, userEmail }: { open: boolean; onClose: () => void; userName: string; userEmail: string }) {
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
        body: JSON.stringify({ name: userName, email: userEmail, message: message.trim(), source: "dashboard" }),
      });
      setSent(true);
      setMessage("");
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
            {/* Name & Email shown as read-only info */}
            <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
              <div className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-[11px]" style={{ color: MUTED }}>{userEmail}</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: MUTED }}>Your Message</label>
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)} required rows={4} maxLength={2000}
                placeholder="Describe your issue or question..."
                className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
              />
              <p className="text-right text-[11px] mt-1" style={{ color: MUTED }}>{message.length}/2000</p>
            </div>
            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
            <button
              type="submit" disabled={sending || !message.trim()}
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

function SupportPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [telegramUrl, setTelegramUrl] = useState("https://t.me/vidorasupport");
  const [emailUrl, setEmailUrl] = useState("mailto:support@vidora.app");
  const [communityUrl, setCommunityUrl] = useState("https://t.me/vidoracommunity");

  useEffect(() => {
    apiFetch<{ success: boolean; data: Record<string, string> }>("/api/settings")
      .then((res) => {
        if (res.data.telegram_url) setTelegramUrl(res.data.telegram_url);
        if (res.data.support_email) setEmailUrl("mailto:" + res.data.support_email);
        if (res.data.community_url) setCommunityUrl(res.data.community_url);
      })
      .catch(() => {});
  }, []);

  const contacts = [
    { icon:MessageCircle, label:"Telegram",       desc:"Chat with us directly on Telegram for the fastest response.", action:"Join Telegram",    href:telegramUrl,    color:"#60a5fa", glow:"rgba(96,165,250,0.15)" },
    { icon:Mail,          label:"Email Support",  desc:"Send us an email and we'll get back to you within 24 hours.", action:"Send Email",       href:emailUrl,     color:"#34d399", glow:"rgba(52,211,153,0.15)" },
    { icon:LifeBuoy,      label:"Community",      desc:"Join our community to connect with other creators and get tips.", action:"Join Community", href:communityUrl, color:PURPLE,    glow:"rgba(167,139,250,0.15)" },
  ];

  return (
    <DashboardLayout title="Support" subtitle="We're here to help. Reach out anytime." activePage="Support">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {contacts.map(c => (
            <div key={c.label} className="group relative overflow-hidden rounded-[22px] p-5 transition-all duration-300 hover:-translate-y-0.5"
              style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}`, boxShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100" style={{ background:c.glow }} />
              <div className="relative">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-[12px]" style={{ background:`${c.color}18`, border:`1px solid ${c.color}30` }}>
                  <c.icon className="h-5 w-5" style={{ color:c.color }} />
                </div>
                <p className="text-sm font-bold text-white">{c.label}</p>
                <p className="mt-1 text-xs" style={{ color:SUBTEXT }}>{c.desc}</p>
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-80" style={{ color:c.color }}>
                  {c.action} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-[16px] px-4 py-3.5" style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)" }}>
          <div className="h-2 w-2 rounded-full" style={{ background:"#34d399", boxShadow:"0 0 6px #34d399" }} />
          <p className="text-sm" style={{ color:SUBTEXT }}>
            <span className="font-semibold text-white">Average response time: under 2 hours</span> via Telegram. Email responses within 24 hours.
          </p>
        </div>

        <TicketsSection />

        <div>
          <h2 className="mb-4 text-lg font-bold text-white">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map(item => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>

        <div className="rounded-[22px] p-6 text-center" style={{ background:"linear-gradient(145deg,#1a0a3a 0%,#0f0720 50%,#0b0c14 100%)", border:"1px solid rgba(167,139,250,0.25)" }}>
          <LifeBuoy className="mx-auto h-8 w-8 mb-3" style={{ color:PURPLE }} />
          <h3 className="text-base font-bold text-white">Still need help?</h3>
          <p className="mt-1 text-sm" style={{ color:SUBTEXT }}>Can't find what you're looking for? Our team is always happy to help.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}
            >
              <MessageCircle className="h-4 w-4" /> Message Us
            </button>
            <a href="mailto:support@vidora.app" className="flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-bold transition hover:opacity-90" style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.3)", color:PURPLE }}>
              <Mail className="h-4 w-4" /> Email Us
            </a>
          </div>
        </div>
      </div>

      {/* Message Modal */}
      <MessageModal
        open={showModal}
        onClose={() => setShowModal(false)}
        userName={user?.name || "Creator"}
        userEmail={user?.email || ""}
      />
    </DashboardLayout>
  );
}

function TicketsSection() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewTicket, setViewTicket] = useState<any>(null);

  const fetchTickets = () => {
    apiFetch<{ data: { tickets: any[] } }>("/api/tickets")
      .then(res => setTickets(res.data.tickets ?? []))
      .catch(() => {});
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/tickets", { method: "POST", body: JSON.stringify({ subject: subject.trim(), message: message.trim() }) });
      setSubject(""); setMessage(""); setShowCreate(false);
      fetchTickets();
    } catch {}
    setCreating(false);
  };

  const statusColor = (s: string) => {
    if (s === "resolved") return "#5eead4";
    if (s === "closed") return "#64748b";
    if (s === "open") return "#60a5fa";
    return "#fbbf24";
  };

  return (
    <div className="rounded-[22px] p-6" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Ticket className="h-4 w-4" style={{ color: PURPLE }} />
          <h3 className="font-bold text-white">Your Tickets</h3>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
          style={{ background: "rgba(167,139,250,0.1)", color: PURPLE, border: "1px solid rgba(167,139,250,0.25)" }}>
          <Plus className="h-3.5 w-3.5" /> New Ticket
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-5 rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
          <input value={subject} onChange={e => setSubject(e.target.value)} required placeholder="Subject"
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={3} placeholder="Describe your issue..."
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}>
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ color: MUTED }}>Cancel</button>
          </div>
        </form>
      )}

      {tickets.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: MUTED }}>No tickets yet. Create one if you need help.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-3 py-2 text-[11px] font-semibold" style={{ color: MUTED }}>Subject</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold" style={{ color: MUTED }}>Status</th>
                <th className="text-left px-3 py-2 text-[11px] font-semibold" style={{ color: MUTED }}>Date</th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold" style={{ color: MUTED }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td className="px-3 py-2.5 text-xs text-white">{t.subject}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize" style={{ background: statusColor(t.status) + "15", color: statusColor(t.status) }}>{t.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px]" style={{ color: MUTED }}>{new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => setViewTicket(t)} className="text-[11px] font-semibold" style={{ color: PURPLE }}>View Details →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewTicket && <TicketConversation ticket={viewTicket} onClose={() => { setViewTicket(null); fetchTickets(); }} />}
    </div>
  );
}

function TicketConversation({ ticket, onClose }: { ticket: any; onClose: () => void }) {
  const [replies, setReplies] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);

  const fetchReplies = () => {
    apiFetch<{ data: { ticket: any; replies: any[] } }>(`/api/tickets/${ticket.id}`)
      .then(res => setReplies(res.data.replies))
      .catch(() => {});
  };

  useEffect(() => { fetchReplies(); }, [ticket.id]);

  const handleSend = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    await apiFetch(`/api/tickets/${ticket.id}/reply`, { method: "POST", body: JSON.stringify({ message: newMsg.trim() }) });
    setNewMsg("");
    setSending(false);
    fetchReplies();
  };

  const isClosed = ticket.status === "closed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl flex flex-col" style={{ background: "#0b0c14", border: `1px solid ${BORDER}`, maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <h3 className="text-sm font-bold text-white">{ticket.subject}</h3>
            <span className="text-[10px] font-semibold capitalize" style={{ color: ticket.status === "closed" ? MUTED : ticket.status === "resolved" ? "#5eead4" : "#60a5fa" }}>{ticket.status}</span>
          </div>
          <button onClick={onClose} style={{ color: MUTED }}><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ minHeight: "200px" }}>
          {replies.map(r => (
            <div key={r.id} className={`flex ${r.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] rounded-xl px-3.5 py-2.5" style={{
                background: r.sender === "user" ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${r.sender === "user" ? "rgba(167,139,250,0.25)" : BORDER}`,
              }}>
                <p className="text-xs" style={{ color: "#e2e8f0" }}>{r.message}</p>
                <p className="text-[9px] mt-1" style={{ color: MUTED }}>
                  {r.sender === "admin" ? "Admin" : "You"} · {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {replies.length === 0 && <p className="text-xs text-center" style={{ color: MUTED }}>No messages yet.</p>}
        </div>

        {!isClosed ? (
          <div className="px-5 py-3 flex gap-2" style={{ borderTop: `1px solid ${BORDER}` }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..."
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
            <button onClick={handleSend} disabled={sending || !newMsg.trim()} className="grid h-10 w-10 place-items-center rounded-xl disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
            </button>
          </div>
        ) : (
          <div className="px-5 py-3 text-center text-xs" style={{ borderTop: `1px solid ${BORDER}`, color: MUTED }}>
            This ticket is closed.
          </div>
        )}
      </div>
    </div>
  );
}
