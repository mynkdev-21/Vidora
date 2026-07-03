import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Trash2, ChevronLeft, ChevronRight, AlertCircle, Upload, Copy, Check } from "lucide-react";
import { apiFetch, BASE_URL } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/files")({
  head: () => ({ meta: [{ title: "My Files — Vidora" }] }),
  component: FilesPage,
});

const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed"; const MUTED = "#64748b";
const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";

interface FileItem {
  id: string; original_name: string; mime_type: string; size_bytes: number;
  view_count: number; status: string; created_at: string; public_url?: string; thumbnail_url?: string;
}
interface FilesResponse {
  data: { files: FileItem[]; pagination: { page: number; limit: number; total: number; pages: number } };
}

function formatBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024, s = ["B","KB","MB","GB"], i = Math.floor(Math.log(b)/Math.log(k));
  return `${parseFloat((b/Math.pow(k,i)).toFixed(1))} ${s[i]}`;
}
function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } catch { return iso; }
}
function statusStyle(s: string): React.CSSProperties {
  if (s==="active") return { background:"rgba(52,211,153,0.1)", color:"#34d399" };
  if (s==="processing") return { background:"rgba(251,191,36,0.1)", color:"#fbbf24" };
  return { background:"rgba(100,116,139,0.15)", color:"#64748b" };
}

function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pagination, setPagination] = useState({ page:1, pages:1, total:0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [confirmId, setConfirmId] = useState<string|null>(null);
  const [copiedId, setCopiedId] = useState<string|null>(null);
  const [generatingId, setGeneratingId] = useState<string|null>(null);
  const [page, setPage] = useState(1);

  const FRONTEND_URL = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";

  const handleCopyShareLink = async (fileId: string) => {
    setGeneratingId(fileId);
    try {
      // Generate secure share token from backend
      const res = await apiFetch<{ success: boolean; data: { token: string } }>(
        `/api/share/${fileId}/generate`,
        { method: "POST" }
      );
      const shareUrl = `${FRONTEND_URL}/v/${res.data.token}`;

      // Copy to clipboard
      try { await navigator.clipboard.writeText(shareUrl); }
      catch {
        const el = document.createElement("textarea");
        el.value = shareUrl; document.body.appendChild(el); el.select();
        document.execCommand("copy"); document.body.removeChild(el);
      }
      setCopiedId(fileId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate share link.");
    } finally {
      setGeneratingId(null);
    }
  };

  const fetchFiles = (p: number) => {
    setLoading(true); setError("");
    apiFetch<FilesResponse>(`/api/files?page=${p}&limit=20`)
      .then(res => { setFiles(res.data.files); setPagination(res.data.pagination); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load files."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFiles(page); }, [page]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiFetch(`/api/files/${id}`, { method: "DELETE" });
      setFiles(prev => prev.filter(f => f.id !== id));
      setConfirmId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete file.");
    } finally { setDeletingId(null); }
  };

  return (
    <DashboardLayout title="My Files" subtitle="Manage and track all your uploaded files." activePage="My Files">
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171" }}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-[22px] p-6" style={{ background:"#0f1120", border:"1px solid rgba(239,68,68,0.3)" }}>
            <h3 className="text-lg font-bold text-white">Delete File?</h3>
            <p className="mt-2 text-sm" style={{ color:SUBTEXT }}>This action cannot be undone. The file will be permanently removed.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmId(null)} className="flex-1 rounded-[14px] py-2.5 text-sm font-semibold" style={{ background:"rgba(255,255,255,0.06)", color:SUBTEXT, border:`1px solid ${BORDER}` }}>Cancel</button>
              <button onClick={() => handleDelete(confirmId)} disabled={deletingId===confirmId} className="flex-1 rounded-[14px] py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background:"rgba(239,68,68,0.8)" }}>
                {deletingId===confirmId ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[22px] overflow-hidden" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-12 w-12 mb-3" style={{ color:"rgba(167,139,250,0.3)" }} />
            <p className="text-base font-semibold text-white">No files yet</p>
            <p className="mt-1 text-sm" style={{ color:MUTED }}>Upload your first file to start earning.</p>
            <Link to="/dashboard/upload" className="mt-4 rounded-[14px] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>Upload File</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  {["File Name","Type","Size","Views","Status","Date","Actions"].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold" style={{ color:"#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {file.thumbnail_url ? (
                          <img
                            src={`${BASE_URL}${file.thumbnail_url}`}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded-[8px] object-cover"
                            style={{ border:"1px solid rgba(167,139,250,0.2)" }}
                          />
                        ) : (
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background:"rgba(167,139,250,0.1)" }}>
                            <FileText className="h-4 w-4" style={{ color:PURPLE }} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate max-w-[160px] text-xs font-medium text-white">{file.original_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color:SUBTEXT }}>{file.mime_type||"—"}</td>
                    <td className="px-5 py-3.5 text-xs" style={{ color:SUBTEXT }}>{formatBytes(file.size_bytes)}</td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-white">{(file.view_count||0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize" style={statusStyle(file.status)}>{file.status||"—"}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color:MUTED }}>{formatDate(file.created_at)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyShareLink(file.id)}
                          disabled={generatingId === file.id}
                          className="grid h-7 w-7 place-items-center rounded-[8px] transition"
                          style={{
                            color: copiedId === file.id ? "#34d399" : SUBTEXT,
                            background: copiedId === file.id ? "rgba(52,211,153,0.12)" : "transparent",
                          }}
                          aria-label="Copy share link"
                          title="Copy shareable link"
                        >
                          {generatingId === file.id
                            ? <div className="h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" />
                            : copiedId === file.id
                              ? <Check className="h-3.5 w-3.5" />
                              : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setConfirmId(file.id)}
                          className="grid h-7 w-7 place-items-center rounded-[8px] transition hover:bg-red-500/20"
                          style={{ color:"#f87171" }}
                          aria-label="Delete file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && files.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4" style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs" style={{ color:MUTED }}>{pagination.total} file{pagination.total!==1?"s":""} total</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="grid h-8 w-8 place-items-center rounded-[10px] transition disabled:opacity-30" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${BORDER}`, color:SUBTEXT }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-white">{page} / {pagination.pages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.pages,p+1))} disabled={page===pagination.pages} className="grid h-8 w-8 place-items-center rounded-[10px] transition disabled:opacity-30" style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${BORDER}`, color:SUBTEXT }}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
