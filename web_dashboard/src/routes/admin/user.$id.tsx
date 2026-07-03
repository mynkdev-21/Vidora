import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { ArrowLeft, Copy, CheckCircle, Eye, Ban } from "lucide-react";

export const Route = createFileRoute("/admin/user/$id")({
  head: () => ({ meta: [{ title: "Vidora — User Detail" }] }),
  component: AdminUserDetail,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";

function AdminUserDetail() {
  const { id } = Route.useParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState("");

  const fetchUser = () => {
    setLoading(true);
    adminFetch<any>(`/api/admin/users/${id}`)
      .then((res) => { setUser(res.data.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUser(); }, [id]);

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const [notifyModal, setNotifyModal] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifySending, setNotifySending] = useState(false);
  const [notifySent, setNotifySent] = useState(false);

  const handleSendNotify = async () => {
    if (!notifyTitle.trim() || !notifyMsg.trim()) return;
    setNotifySending(true);
    await adminFetch("/api/admin/notifications", { method: "POST", body: JSON.stringify({ user_id: user.id, title: notifyTitle.trim(), message: notifyMsg.trim(), type: "custom" }) });
    setNotifySending(false);
    setNotifySent(true);
    setNotifyTitle(""); setNotifyMsg("");
    setTimeout(() => { setNotifySent(false); setNotifyModal(false); }, 1500);
  };

  const handleToggleBan = async () => {    await adminFetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    fetchUser();
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
    return (bytes / 1e3).toFixed(0) + " KB";
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) {
    return (
      <AdminLayout title="User Detail" activePage="Users">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout title="User Not Found" activePage="Users">
        <p style={{ color: MUTED }}>User not found.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={user.name} subtitle={user.email} activePage="Users">
      <div className="space-y-5">
        <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: PURPLE }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
        </Link>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Account Info</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setNotifyModal(true)} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition hover:opacity-80" style={{
                    background: "rgba(167,139,250,0.1)", color: PURPLE, border: `1px solid ${PURPLE}30`,
                  }}>
                    Notify
                  </button>
                  <button onClick={handleToggleBan} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition hover:opacity-80" style={{
                    background: user.is_active ? "rgba(239,68,68,0.1)" : "rgba(94,234,212,0.1)",
                    color: user.is_active ? RED : GREEN,
                    border: `1px solid ${user.is_active ? RED : GREEN}30`,
                  }}>
                    {user.is_active ? "Ban User" : "Unban User"}
                  </button>
                  <button onClick={async () => {
                    try {
                      const res = await adminFetch<{ success: boolean; data: { accessToken: string; user: any } }>(`/api/admin/impersonate/${user.id}`, { method: "POST" });
                      if (res.success) {
                        const { accessToken, user: u } = res.data;
                        // Open dashboard in new tab with token
                        const baseUrl = window.location.origin;
                        const w = window.open(baseUrl + "/dashboard", "_blank");
                        if (w) {
                          w.addEventListener("load", () => {
                            w.localStorage.setItem("vdr_access_token", accessToken);
                            w.localStorage.setItem("vdr_user", JSON.stringify(u));
                            w.location.reload();
                          });
                        }
                        // Fallback: set in current origin localStorage then open
                        localStorage.setItem("__impersonate_token", accessToken);
                        localStorage.setItem("__impersonate_user", JSON.stringify(u));
                        setTimeout(() => {
                          const tab = window.open(baseUrl + "/login?impersonate=1", "_blank");
                        }, 100);
                      }
                    } catch {}
                  }} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition hover:opacity-80" style={{
                    background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)",
                  }}>
                    Login as User
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <InfoRow label="User ID" value={user.id} copyKey="id" onCopy={handleCopy} copied={copied} />
                <InfoRow label="Name" value={user.name} />
                <InfoRow label="Email" value={user.email} copyKey="email" onCopy={handleCopy} copied={copied} />
                <InfoRow label="Role" value={user.role} />
                <InfoRow label="Status" value={user.is_active ? "Active" : "Banned"} />
                <InfoRow label="Joined" value={formatDate(user.created_at)} />
                {user.api_key && <InfoRow label="API Key" value={user.api_key} copyKey="apikey" onCopy={handleCopy} copied={copied} />}
                {user.referrer && <InfoRow label="Referred By" value={`${user.referrer.name} (${user.referrer.email})`} />}
                <InfoRow label="Referrals Made" value={String(user.referral_count)} />
              </div>
            </div>

            {user.payment_methods.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <h3 className="text-sm font-bold text-white mb-3">Payment Methods</h3>
                <div className="space-y-2">
                  {user.payment_methods.map((pm: any) => (
                    <div key={pm.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div>
                        <span className="text-[10px] font-semibold uppercase" style={{ color: PURPLE }}>{pm.method}</span>
                        <p className="text-sm text-white">{pm.account_id}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{pm.name}{pm.ifsc_code ? ` · ${pm.ifsc_code}` : ""}</p>
                      </div>
                      {pm.is_default ? <span className="text-[10px] font-semibold" style={{ color: GREEN }}>Default</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user.recent_files.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <h3 className="text-sm font-bold text-white mb-3">Recent Files</h3>
                <div className="space-y-2">
                  {user.recent_files.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{f.original_name}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{formatBytes(f.size_bytes)} · {formatDate(f.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: TEXT }}>
                        <Eye className="h-3 w-3" style={{ color: MUTED }} /> {f.view_count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user.payouts.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <h3 className="text-sm font-bold text-white mb-3">Payouts</h3>
                <div className="space-y-2">
                  {user.payouts.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <div>
                        <p className="text-sm font-semibold text-white">${parseFloat(p.amount).toFixed(2)}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{p.method} · {formatDate(p.requested_at)}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold capitalize" style={{
                        background: p.status === "completed" ? "rgba(94,234,212,0.15)" : p.status === "failed" ? "rgba(239,68,68,0.15)" : "rgba(251,191,36,0.15)",
                        color: p.status === "completed" ? GREEN : p.status === "failed" ? RED : "#fbbf24",
                      }}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <StatBox label="Total Files" value={String(user.total_files)} />
            <StatBox label="Total Views" value={parseInt(user.total_views).toLocaleString()} />
            <StatBox label="Storage Used" value={formatBytes(parseInt(user.storage_used))} />
            <StatBox label="Total Earnings" value={`$${user.total_earnings.toFixed(2)}`} color={GREEN} />
            <StatBox label="Total Paid Out" value={`$${(user.total_paid || 0).toFixed(2)}`} />
            <StatBox label="Pending Payout" value={`$${(user.pending_amount || 0).toFixed(2)}`} color="#fbbf24" />
            <StatBox label="Available Balance" value={`$${(user.available_balance || 0).toFixed(2)}`} color={PURPLE} />
            <StatBox label="Referrals" value={String(user.referral_count)} />
            <StatBox label="Member Since" value={formatDate(user.created_at)} />
          </div>
        </div>
      </div>

      {notifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setNotifyModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl p-6" style={{ background: "#0b0c14", border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()}>
            {notifySent ? (
              <div className="text-center py-4">
                <CheckCircle className="mx-auto h-10 w-10 mb-3" style={{ color: GREEN }} />
                <p className="text-sm font-bold text-white">Notification Sent!</p>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-bold text-white mb-1">Send Notification</h3>
                <p className="text-[11px] mb-4" style={{ color: MUTED }}>To: {user.name} ({user.email})</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Title</label>
                    <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="e.g. Account Update"
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} autoFocus />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Message</label>
                    <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} rows={3} placeholder="Notification message..."
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setNotifyModal(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.04)", color: MUTED, border: `1px solid ${BORDER}` }}>Cancel</button>
                  <button onClick={handleSendNotify} disabled={notifySending || !notifyTitle.trim() || !notifyMsg.trim()}
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${PURPLE}, #7c3aed)` }}>
                    {notifySending ? "Sending..." : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function InfoRow({ label, value, copyKey, onCopy, copied }: { label: string; value: string; copyKey?: string; onCopy?: (v: string, k: string) => void; copied?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <span className="text-[11px] font-semibold shrink-0" style={{ color: MUTED }}>{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono truncate" style={{ color: TEXT }}>{value}</span>
        {copyKey && onCopy && (
          <button onClick={() => onCopy(value, copyKey)} className="shrink-0 p-1 rounded transition hover:bg-white/5" style={{ color: copied === copyKey ? GREEN : MUTED }}>
            {copied === copyKey ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <p className="text-[10px] font-semibold uppercase" style={{ color: MUTED }}>{label}</p>
      <p className="text-lg font-bold mt-1" style={{ color: color || TEXT }}>{value}</p>
    </div>
  );
}
