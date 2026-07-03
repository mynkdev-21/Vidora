import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Ticket, ChevronLeft, ChevronRight, Send, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/admin/tickets")({
  component: AdminTickets,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";

function AdminTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [replyModal, setReplyModal] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("resolved");
  const [sending, setSending] = useState(false);

  const fetchTickets = (p = 1, st = "") => {
    setLoading(true);
    let url = `/api/admin/tickets?page=${p}&limit=15`;
    if (st) url += `&status=${st}`;
    adminFetch<any>(url)
      .then(res => {
        setTickets(res.data.tickets);
        setTotalPages(res.data.pagination.pages);
        setTotal(res.data.pagination.total);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    await adminFetch(`/api/admin/tickets/${replyModal.id}`, {
      method: "PATCH",
      body: JSON.stringify({ admin_reply: replyText.trim(), status: replyStatus }),
    });
    setSending(false);
    setReplyModal(null);
    setReplyText("");
    fetchTickets(page, statusFilter);
  };

  const statusColor = (s: string) => {
    if (s === "resolved") return GREEN;
    if (s === "closed") return MUTED;
    if (s === "open") return "#60a5fa";
    return "#fbbf24";
  };

  return (
    <AdminLayout title="Support Tickets" subtitle={`${total} tickets`} activePage="Tickets">
      <div className="flex gap-2 mb-5 flex-wrap">
        {["", "pending", "open", "resolved", "closed"].map(st => (
          <button key={st} onClick={() => { setStatusFilter(st); fetchTickets(1, st); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{ background: statusFilter === st ? PURPLE + "20" : "rgba(255,255,255,0.04)", color: statusFilter === st ? PURPLE : MUTED, border: `1px solid ${statusFilter === st ? PURPLE + "40" : BORDER}` }}>
            {st || "All"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        {loading ? (
          <div className="text-center py-10" style={{ color: MUTED }}>Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-10" style={{ color: MUTED }}>No tickets found.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: BORDER }}>
            {tickets.map(t => (
              <div key={t.id} className="px-5 py-4 hover:bg-white/[0.02] transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{t.subject}</p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize" style={{ background: statusColor(t.status) + "15", color: statusColor(t.status) }}>{t.status}</span>
                    </div>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: TEXT }}>{t.message}</p>
                    <p className="text-[11px] mt-1.5" style={{ color: MUTED }}>{t.user_name} ({t.user_email}) · {new Date(t.created_at).toLocaleDateString()}</p>
                    {t.admin_reply && (
                      <div className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)", color: TEXT }}>
                        <span style={{ color: PURPLE }}>Reply:</span> {t.admin_reply}
                      </div>
                    )}
                  </div>
                  {t.status !== "closed" && (
                    <button onClick={() => { setReplyModal(t); setReplyText(""); setReplyStatus("open"); }}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                      style={{ background: "rgba(167,139,250,0.1)", color: PURPLE, border: "1px solid rgba(167,139,250,0.25)" }}>
                      <Send className="h-3.5 w-3.5" /> Reply
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <p className="text-xs" style={{ color: MUTED }}>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => fetchTickets(page - 1, statusFilter)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => fetchTickets(page + 1, statusFilter)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setReplyModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl flex flex-col" style={{ background: "#0b0c14", border: `1px solid ${BORDER}`, maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <h3 className="text-sm font-bold text-white">{replyModal.subject}</h3>
                <p className="text-[10px]" style={{ color: MUTED }}>{replyModal.user_name} · {replyModal.user_email}</p>
              </div>
              <button onClick={() => setReplyModal(null)} style={{ color: MUTED }}><X className="h-4 w-4" /></button>
            </div>

            <AdminConversation ticketId={replyModal.id} />

            <div className="px-5 py-3 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} placeholder="Type your reply..."
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <div className="flex items-center justify-between">
                <select value={replyStatus} onChange={e => setReplyStatus(e.target.value)}
                  className="rounded-lg px-3 py-1.5 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="open" style={{ background: "#0b0c14" }}>Keep Open</option>
                  <option value="resolved" style={{ background: "#0b0c14" }}>Resolved</option>
                  <option value="closed" style={{ background: "#0b0c14" }}>Close</option>
                </select>
                <button onClick={handleReply} disabled={sending || !replyText.trim()} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${PURPLE}, #7c3aed)` }}>
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}


function AdminConversation({ ticketId }: { ticketId: string }) {
  const [replies, setReplies] = useState<any[]>([]);

  useEffect(() => {
    adminFetch<{ data: { replies: any[] } }>(`/api/admin/tickets/${ticketId}/replies`)
      .then(res => setReplies(res.data.replies))
      .catch(() => {});
  }, [ticketId]);

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ minHeight: "150px", maxHeight: "300px" }}>
      {replies.map(r => (
        <div key={r.id} className={`flex ${r.sender === "admin" ? "justify-end" : "justify-start"}`}>
          <div className="max-w-[80%] rounded-xl px-3.5 py-2.5" style={{
            background: r.sender === "admin" ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${r.sender === "admin" ? "rgba(167,139,250,0.25)" : BORDER}`,
          }}>
            <p className="text-xs" style={{ color: TEXT }}>{r.message}</p>
            <p className="text-[9px] mt-1" style={{ color: MUTED }}>
              {r.sender === "admin" ? "You" : "User"} · {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      ))}
      {replies.length === 0 && <p className="text-xs text-center" style={{ color: MUTED }}>No messages yet.</p>}
    </div>
  );
}
