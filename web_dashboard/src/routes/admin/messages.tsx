import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Mail, MailOpen, Trash2, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/admin/messages")({
  component: AdminMessages,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  source: string | null;
  is_read: number;
  created_at: string;
}

function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unread");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchMessages = (p = 1, f = "unread") => {
    setLoading(true);
    adminFetch<any>(`/api/admin/messages?page=${p}&limit=15&filter=${f}`)
      .then((res) => {
        setMessages(res.data.messages);
        setTotalPages(res.data.pagination.pages);
        setTotal(res.data.pagination.total);
        setUnread(res.data.unread);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMessages(); }, []);

  const markRead = async (id: string) => {
    await adminFetch(`/api/admin/messages/${id}`, { method: "PATCH", body: JSON.stringify({ is_read: true }) });
    fetchMessages(page, filter);
  };

  const handleDelete = async (id: string) => {
    await adminFetch(`/api/admin/messages/${id}`, { method: "DELETE" });
    fetchMessages(page, filter);
  };

  const timeAgo = (date: string) => {
    const d = new Date(date + (date.includes("Z") || date.includes("+") ? "" : "Z"));
    const diff = Date.now() - d.getTime();
    if (diff < 0) return "now";
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <AdminLayout title="Messages" subtitle={`${unread} unread messages`} activePage="Messages">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[{ key: "unread", label: `Unread (${unread})` }, { key: "", label: "All" }].map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); fetchMessages(1, f.key); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: filter === f.key ? PURPLE + "20" : "rgba(255,255,255,0.04)",
              color: filter === f.key ? PURPLE : MUTED,
              border: `1px solid ${filter === f.key ? PURPLE + "40" : BORDER}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Messages list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <MessageCircle className="mx-auto h-10 w-10 mb-3" style={{ color: MUTED }} />
            <p style={{ color: MUTED }}>No messages found.</p>
          </div>
        ) : messages.map((msg) => (
          <div
            key={msg.id}
            className="rounded-2xl p-4 transition"
            style={{
              background: CARD,
              border: `1px solid ${msg.is_read ? BORDER : PURPLE + "30"}`,
              boxShadow: msg.is_read ? "none" : `0 0 12px ${PURPLE}10`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full mt-0.5" style={{ background: msg.is_read ? "rgba(255,255,255,0.05)" : PURPLE + "20" }}>
                  {msg.is_read ? <MailOpen className="h-4 w-4" style={{ color: MUTED }} /> : <Mail className="h-4 w-4" style={{ color: PURPLE }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{msg.name}</p>
                    <span className="text-[11px]" style={{ color: MUTED }}>{msg.email}</span>
                    {msg.source && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{
                        background: msg.source === "banned" ? "rgba(239,68,68,0.15)" : msg.source === "dashboard" ? "rgba(167,139,250,0.15)" : "rgba(96,165,250,0.15)",
                        color: msg.source === "banned" ? RED : msg.source === "dashboard" ? PURPLE : "#60a5fa",
                      }}>
                        {msg.source === "banned" && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        )}
                        {msg.source === "dashboard" && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                        )}
                        {msg.source === "landing" && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        )}
                        {msg.source === "banned" ? "Banned" : msg.source === "dashboard" ? "Dashboard" : "Landing"}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 text-sm cursor-pointer ${expanded === msg.id ? "" : "line-clamp-2"}`}
                    style={{ color: TEXT }}
                    onClick={() => setExpanded(expanded === msg.id ? null : msg.id)}
                  >
                    {msg.message}
                  </p>
                  <p className="mt-1.5 text-[11px]" style={{ color: MUTED }}>{timeAgo(msg.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!msg.is_read && (
                  <button onClick={() => markRead(msg.id)} title="Mark as read" className="p-1.5 rounded-lg transition hover:bg-white/5" style={{ color: GREEN }}>
                    <MailOpen className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => handleDelete(msg.id)} title="Delete" className="p-1.5 rounded-lg transition hover:bg-white/5" style={{ color: RED }}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs" style={{ color: MUTED }}>Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => fetchMessages(page - 1, filter)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={page >= totalPages} onClick={() => fetchMessages(page + 1, filter)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
