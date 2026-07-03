import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { BASE_URL } from "@/lib/api";
import { Search, Trash2, RotateCcw, ChevronLeft, ChevronRight, Eye, FileVideo, FileImage, File, Bell } from "lucide-react";

export const Route = createFileRoute("/admin/files")({
  component: AdminFiles,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";
const YELLOW = "#fbbf24";

interface FileItem {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  view_count: number;
  thumbnail_url: string | null;
  created_at: string;
  uploader_name: string;
  uploader_email: string;
}

function AdminFiles() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchFiles = (p = 1, s = "", st = "") => {
    setLoading(true);
    let url = `/api/admin/files?page=${p}&limit=15&search=${encodeURIComponent(s)}`;
    if (st) url += `&status=${st}`;
    adminFetch<any>(url)
      .then((res) => {
        setFiles(res.data.files);
        setTotalPages(res.data.pagination.pages);
        setTotal(res.data.pagination.total);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFiles(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(1, search, statusFilter);
  };

  const handleDelete = async (id: string) => {
    await adminFetch(`/api/admin/files/${id}`, { method: "DELETE" });
    fetchFiles(page, search, statusFilter);
  };

  const handleRestore = async (id: string) => {
    await adminFetch(`/api/admin/files/${id}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
    fetchFiles(page, search, statusFilter);
  };

  const [notifyFileId, setNotifyFileId] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);

  const handleNotify = async (id: string) => {
    setNotifyFileId(id);
  };

  const confirmNotify = async () => {
    if (!notifyFileId) return;
    setNotifying(true);
    await adminFetch<any>(`/api/admin/files/${notifyFileId}/notify`, { method: "POST" });
    setNotifying(false);
    setNotifyFileId(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
    return (bytes / 1e3).toFixed(0) + " KB";
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith("video/")) return FileVideo;
    if (mime.startsWith("image/")) return FileImage;
    return File;
  };

  return (
    <AdminLayout title="Files Management" subtitle={`${total} total files`} activePage="Files">
      {/* Search + Filter */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-5">
        <div className="flex flex-1 min-w-[200px] max-w-md items-center gap-2 rounded-xl px-4 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}` }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files or uploader..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600"
            style={{ color: TEXT }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); fetchFiles(1, search, e.target.value); }}
          className="rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: TEXT }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="deleted">Deleted</option>
        </select>
        <button type="submit" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: PURPLE + "20", color: PURPLE, border: `1px solid ${PURPLE}40` }}>
          Search
        </button>
        <PurgeButton onPurged={() => fetchFiles(page, search, statusFilter)} />
      </form>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>File</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Uploader</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Size</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Views</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Uploaded</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: MUTED }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10" style={{ color: MUTED }}>Loading...</td></tr>
              ) : files.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10" style={{ color: MUTED }}>No files found.</td></tr>
              ) : files.map((f) => {
                const Icon = getFileIcon(f.mime_type);
                return (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${BORDER}` }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {f.thumbnail_url ? (
                          <img src={`${BASE_URL}${f.thumbnail_url}`} alt="" className="h-9 w-14 rounded-lg object-cover" />
                        ) : (
                          <div className="grid h-9 w-14 place-items-center rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <Icon className="h-4 w-4" style={{ color: MUTED }} />
                          </div>
                        )}
                        <p className="font-medium text-white truncate max-w-[200px]">{f.original_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-white">{f.uploader_name}</p>
                      <p className="text-[11px]" style={{ color: MUTED }}>{f.uploader_email}</p>
                    </td>
                    <td className="px-4 py-3" style={{ color: TEXT }}>{formatBytes(f.size_bytes)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" style={{ color: TEXT }}>
                        <Eye className="h-3.5 w-3.5" style={{ color: MUTED }} />
                        {f.view_count.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                        background: f.status === "active" ? "rgba(94,234,212,0.15)" : "rgba(239,68,68,0.15)",
                        color: f.status === "active" ? GREEN : RED,
                      }}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {f.status === "active" && (
                          <button onClick={() => handleNotify(f.id)} title="Send push notification" className="p-1.5 rounded-lg transition hover:bg-white/5" style={{ color: PURPLE }}>
                            <Bell className="h-4 w-4" />
                          </button>
                        )}
                        {f.status === "active" ? (
                          <button onClick={() => handleDelete(f.id)} title="Delete" className="p-1.5 rounded-lg transition hover:bg-white/5" style={{ color: RED }}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleRestore(f.id)} title="Restore" className="p-1.5 rounded-lg transition hover:bg-white/5" style={{ color: GREEN }}>
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <p className="text-xs" style={{ color: MUTED }}>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => fetchFiles(page - 1, search, statusFilter)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => fetchFiles(page + 1, search, statusFilter)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {notifyFileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setNotifyFileId(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl p-6 text-center" style={{ background: "#0b0c14", border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()}>
            <div className="grid h-12 w-12 mx-auto place-items-center rounded-xl mb-4" style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}>
              <Bell className="h-6 w-6" style={{ color: PURPLE }} />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Send Push Notification</h3>
            <p className="text-xs mb-5" style={{ color: MUTED }}>This will send a notification to all users with the app installed. They'll see the file thumbnail and can tap to open it.</p>
            <div className="flex gap-3">
              <button onClick={() => setNotifyFileId(null)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.04)", color: MUTED, border: `1px solid ${BORDER}` }}>Cancel</button>
              <button onClick={confirmNotify} disabled={notifying} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, #7c3aed, ${PURPLE})` }}>
                {notifying ? "Sending..." : "Send to All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function PurgeButton({ onPurged }: { onPurged: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [purging, setPurging] = useState(false);
  const [result, setResult] = useState("");

  const handlePurge = async () => {
    setPurging(true);
    try {
      const res = await adminFetch<{ success: boolean; message: string; data: { count: number } }>("/api/admin/files-purge/all", { method: "DELETE" });
      setResult(res.message);
      onPurged();
    } catch (e: any) {
      setResult(e.message || "Purge failed.");
    }
    setPurging(false);
    setTimeout(() => { setConfirm(false); setResult(""); }, 3000);
  };

  return (
    <>
      <button type="button" onClick={() => setConfirm(true)}
        className="px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
        Purge Deleted
      </button>

      {confirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/60" onClick={() => !purging && setConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#0b0c14", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()}>
            {result ? (
              <p className="text-sm text-center py-4" style={{ color: "#5eead4" }}>{result}</p>
            ) : (
              <>
                <h3 className="text-sm font-bold text-white mb-2">Permanently Delete All Deleted Files?</h3>
                <p className="text-xs mb-4" style={{ color: "#94a3b8" }}>
                  This will permanently remove all soft-deleted files from the database AND storage (local/cloud). This cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirm(false)} disabled={purging}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }}>Cancel</button>
                  <button onClick={handlePurge} disabled={purging}
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "rgba(239,68,68,0.8)" }}>
                    {purging ? "Purging..." : "Yes, Purge All"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
