import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { BASE_URL } from "@/lib/api";
import { Search, Ban, CheckCircle, ChevronLeft, ChevronRight, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: number;
  is_verified: number;
  avatar_url?: string;
  created_at: string;
  file_count: number;
  total_views: number;
  storage_used: number;
}

function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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

  useEffect(() => { fetchUsers(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const toggleActive = async (user: User) => {
    const newStatus = !user.is_active;
    await adminFetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: newStatus }),
    });
    fetchUsers(page, search);
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
    return (bytes / 1e3).toFixed(0) + " KB";
  };

  return (
    <AdminLayout title="Users Management" subtitle={`${total} total users`} activePage="Users">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-5">
        <div className="flex flex-1 max-w-md items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}` }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600"
            style={{ color: TEXT }}
          />
        </div>
        <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: PURPLE + "20", color: PURPLE, border: `1px solid ${PURPLE}40` }}>
          Search
        </button>
      </form>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>User</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Role</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Files</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Views</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Storage</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Joined</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: MUTED }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10" style={{ color: MUTED }}>Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10" style={{ color: MUTED }}>No users found.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url.startsWith("http") ? u.avatar_url : `${BASE_URL}${u.avatar_url}`} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" style={{ border: "1px solid rgba(167,139,250,0.3)" }} />
                      ) : (
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
                          {u.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-xs" style={{ color: MUTED }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                      background: u.role === "admin" ? "rgba(239,68,68,0.15)" : "rgba(167,139,250,0.15)",
                      color: u.role === "admin" ? RED : PURPLE,
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{u.file_count}</td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{u.total_views.toLocaleString()}</td>
                  <td className="px-4 py-3" style={{ color: TEXT }}>{formatBytes(u.storage_used)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                      background: u.is_active ? "rgba(94,234,212,0.15)" : "rgba(239,68,68,0.15)",
                      color: u.is_active ? GREEN : RED,
                    }}>
                      {u.is_active ? "Active" : "Banned"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/user/${u.id}`}
                        title="View details"
                        className="p-1.5 rounded-lg transition hover:bg-white/5"
                        style={{ color: PURPLE }}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => toggleActive(u)}
                        title={u.is_active ? "Ban user" : "Unban user"}
                        className="p-1.5 rounded-lg transition hover:bg-white/5"
                        style={{ color: u.is_active ? RED : GREEN }}
                      >
                        {u.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <p className="text-xs" style={{ color: MUTED }}>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => fetchUsers(page - 1, search)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => fetchUsers(page + 1, search)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
