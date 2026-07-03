import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/payouts")({
  component: AdminPayouts,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";
const YELLOW = "#fbbf24";

interface Payout {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transaction_id: string | null;
  notes: string | null;
  receipt_url: string | null;
  requested_at: string;
  processed_at: string | null;
  user_name: string;
  user_email: string;
  payment_account: string | null;
  payment_name: string | null;
  payment_ifsc: string | null;
}

function PaymentDetailButton({ method, account, name, ifsc }: { method: string; account: string; name: string | null; ifsc: string | null }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold transition hover:opacity-80"
        style={{ background: "rgba(167,139,250,0.1)", color: PURPLE, border: `1px solid ${PURPLE}30` }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        View Details
      </button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShow(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-xs rounded-2xl p-5"
            style={{ background: "#0b0c14", border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${PURPLE}15`, border: `1px solid ${PURPLE}30` }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <h3 className="text-sm font-bold text-white">Payment Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ color: MUTED }}>Method</p>
                <p className="text-sm font-semibold text-white capitalize">{method}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ color: MUTED }}>Account</p>
                <p className="text-sm font-semibold" style={{ color: GREEN }}>{account}</p>
              </div>
              {name && (
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: MUTED }}>Name</p>
                  <p className="text-sm text-white">{name}</p>
                </div>
              )}
              {ifsc && (
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: MUTED }}>IFSC Code</p>
                  <p className="text-sm text-white">{ifsc}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setShow(false)}
              className="mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition hover:bg-white/5"
              style={{ background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: `1px solid ${BORDER}` }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"failed" | "completed">("failed");
  const [modalPayoutId, setModalPayoutId] = useState("");
  const [modalInput, setModalInput] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const fetchPayouts = (p = 1, st = "") => {
    setLoading(true);
    let url = `/api/admin/payouts?page=${p}&limit=15`;
    if (st) url += `&status=${st}`;
    adminFetch<any>(url)
      .then((res) => {
        setPayouts(res.data.payouts);
        setTotalPages(res.data.pagination.pages);
        setTotal(res.data.pagination.total);
        setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPayouts(); }, []);

  const handleAction = async (id: string, status: string, extra?: { transaction_id?: string; notes?: string }) => {
    setProcessingId(id);
    const body: any = { status, ...extra };
    await adminFetch(`/api/admin/payouts/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setProcessingId(null);
    fetchPayouts(page, statusFilter);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    if (newStatus === "completed") {
      setModalType("completed");
      setModalPayoutId(id);
      setModalInput("");
      setReceiptFile(null);
      setModalOpen(true);
    } else if (newStatus === "failed") {
      setModalType("failed");
      setModalPayoutId(id);
      setModalInput("");
      setReceiptFile(null);
      setModalOpen(true);
    } else {
      handleAction(id, newStatus);
    }
  };

  const handleModalSubmit = async () => {
    if (modalType === "failed") {
      handleAction(modalPayoutId, "failed", { notes: modalInput || undefined });
    } else {
      // Upload receipt if provided
      let receiptUrl: string | undefined;
      if (receiptFile) {
        const formData = new FormData();
        formData.append("receipt", receiptFile);
        const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
        const token = localStorage.getItem("vdr_admin_token");
        const res = await fetch(`${BASE_URL}/api/admin/payouts/${modalPayoutId}/receipt`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (data.success) receiptUrl = data.data.receipt_url;
      }
      handleAction(modalPayoutId, "completed", { transaction_id: modalInput || undefined, receipt_url: receiptUrl });
    }
    setModalOpen(false);
    setModalInput("");
    setReceiptFile(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return GREEN;
      case "failed": return RED;
      case "processing": return YELLOW;
      default: return PURPLE;
    }
  };

  return (
    <AdminLayout title="Payouts Management" subtitle={`${total} ${statusFilter || "total"} payouts`} activePage="Payouts">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["", "pending", "completed", "failed"].map((st) => (
          <button
            key={st}
            onClick={() => { setStatusFilter(st); fetchPayouts(1, st); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition"
            style={{
              background: statusFilter === st ? PURPLE + "20" : "rgba(255,255,255,0.04)",
              color: statusFilter === st ? PURPLE : MUTED,
              border: `1px solid ${statusFilter === st ? PURPLE + "40" : BORDER}`,
            }}
          >
            {st || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>User</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Amount</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Method</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Status</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Requested</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: MUTED }}>Tx ID</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: MUTED }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10" style={{ color: MUTED }}>Loading...</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10" style={{ color: MUTED }}>No payouts found.</td></tr>
              ) : payouts.map((p) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}` }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.user_name}</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>{p.user_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-lg font-bold" style={{ color: GREEN }}>${parseFloat(String(p.amount)).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize" style={{ background: "rgba(255,255,255,0.05)", color: TEXT }}>
                      {p.method}
                    </span>
                    {p.payment_account && (
                      <PaymentDetailButton method={p.method} account={p.payment_account} name={p.payment_name} ifsc={p.payment_ifsc} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold capitalize" style={{
                      background: getStatusColor(p.status) + "15",
                      color: getStatusColor(p.status),
                    }}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                    {new Date(p.requested_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: MUTED }}>
                    {p.transaction_id || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "pending" ? (
                      processingId === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" style={{ color: PURPLE }} />
                      ) : (
                        <select
                          value={p.status}
                          onChange={(e) => handleStatusChange(p.id, e.target.value)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer"
                          style={{
                            background: getStatusColor(p.status) + "15",
                            color: getStatusColor(p.status),
                            border: `1px solid ${getStatusColor(p.status)}30`,
                          }}
                        >
                          <option value="pending" style={{ background: "#0b0c14", color: PURPLE }}>Pending</option>
                          <option value="completed" style={{ background: "#0b0c14", color: GREEN }}>Completed</option>
                          <option value="failed" style={{ background: "#0b0c14", color: RED }}>Failed</option>
                        </select>
                      )
                    ) : (
                      <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{
                        background: getStatusColor(p.status) + "15",
                        color: getStatusColor(p.status),
                      }}>
                        {p.status === "completed" ? "✓ Completed" : "✗ Failed"}
                      </span>
                    )}
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
              <button disabled={page <= 1} onClick={() => fetchPayouts(page - 1, statusFilter)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={page >= totalPages} onClick={() => fetchPayouts(page + 1, statusFilter)} className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: TEXT, background: "rgba(255,255,255,0.05)" }}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for failed reason / completed txId */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#0b0c14", border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white mb-1">
              {modalType === "failed" ? "Rejection Reason" : "Transaction ID"}
            </h3>
            <p className="text-xs mb-4" style={{ color: MUTED }}>
              {modalType === "failed" ? "Enter the reason why this payout was rejected. Creator will see this." : "Enter the transaction ID for this completed payout (optional)."}
            </p>

            {modalType === "failed" ? (
              <textarea
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                rows={3}
                placeholder="e.g. Invalid payment details, please update your UPI ID"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none mb-4"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                autoFocus
              />
            ) : (
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value)}
                  placeholder="e.g. TXN123456789"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                  autoFocus
                />
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Receipt Screenshot (optional)</label>
                  <label
                    className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold cursor-pointer transition hover:bg-white/5"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px dashed ${BORDER}`, color: receiptFile ? GREEN : MUTED }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {receiptFile ? receiptFile.name : "Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition hover:bg-white/5"
                style={{ background: "rgba(255,255,255,0.04)", color: MUTED, border: `1px solid ${BORDER}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={modalType === "failed" && !modalInput.trim()}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: modalType === "failed" ? RED : GREEN }}
              >
                {modalType === "failed" ? "Mark Failed" : "Mark Completed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
