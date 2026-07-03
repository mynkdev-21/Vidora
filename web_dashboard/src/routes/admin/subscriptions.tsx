import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Crown, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptions,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";
const YELLOW = "#fbbf24";

function AdminSubscriptions() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [premiumCount, setPremiumCount] = useState(0);

  const fetchUsers = (p = 1, s = "") => {
    setLoading(true);
    adminFetch<any>(`/api/admin/users?page=${p}&limit=15&search=${encodeURIComponent(s)}`)
      .then((res) => {
        setUsers(res.data.users);
        setTotalPages(res.data.pagination.pages);
        setTotal(res.data.pagination.total);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchPremiumCount = () => {
    adminFetch<any>("/api/admin/subscriptions/stats")
      .then(res => setPremiumCount(res.data.premium_count))
      .catch(() => {});
  };

  useEffect(() => { fetchUsers(); fetchPremiumCount(); }, []);

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    await adminFetch(`/api/admin/subscriptions/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ is_premium: !currentStatus }),
    });
    fetchUsers(page, search);
    fetchPremiumCount();
  };

  return (
    <AdminLayout title="Subscriptions" subtitle="Manage premium users" activePage="Subscriptions">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <Crown className="h-5 w-5 mb-2" style={{ color: YELLOW }} />
            <p className="text-2xl font-bold text-white">{premiumCount}</p>
            <p className="text-xs" style={{ color: MUTED }}>Premium Users</p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-2xl font-bold text-white">{total}</p>
            <p className="text-xs" style={{ color: MUTED }}>Total Users</p>
          </div>
          <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <p className="text-2xl font-bold" style={{ color: GREEN }}>{total > 0 ? ((premiumCount / total) * 100).toFixed(1) : 0}%</p>
            <p className="text-xs" style={{ color: MUTED }}>Conversion Rate</p>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={(e) => { e.preventDefault(); fetchUsers(1, search); }} className="flex gap-3">
          <div className="flex flex-1 max-w-md items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}` }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600" style={{ color: TEXT }} />
          </div>
          <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: PURPLE + "20", color: PURPLE, border: `1px solid ${PURPLE}40` }}>Search</button>
        </form>

        {/* Users table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>User</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Status</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Joined</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: MUTED }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-10" style={{ color: MUTED }}>Loading...</td></tr>
                ) : users.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{u.name}</p>
                      <p className="text-[11px]" style={{ color: MUTED }}>{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_premium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(251,191,36,0.15)", color: YELLOW }}>
                          <Crown className="h-3 w-3" /> Premium
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}>Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => togglePremium(u.id, !!u.is_premium)}
                        className="px-3 py-1 rounded-lg text-[11px] font-semibold transition hover:opacity-80"
                        style={{ background: u.is_premium ? "rgba(239,68,68,0.1)" : "rgba(251,191,36,0.1)", color: u.is_premium ? RED : YELLOW, border: `1px solid ${u.is_premium ? RED : YELLOW}30` }}>
                        {u.is_premium ? "Remove Premium" : "Grant Premium"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-xs" style={{ color: MUTED }}>Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => fetchUsers(page - 1, search)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}><ChevronLeft className="h-4 w-4" /></button>
                <button disabled={page >= totalPages} onClick={() => fetchUsers(page + 1, search)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
