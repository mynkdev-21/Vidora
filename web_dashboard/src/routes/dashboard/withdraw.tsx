import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, AlertTriangle, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/withdraw")({
  head: () => ({ meta: [{ title: "Withdraw — Vidora" }] }),
  component: WithdrawPage,
});

const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed"; const MUTED = "#64748b";
const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";
const INPUT_BG = "rgba(255,255,255,0.05)"; const INPUT_BORDER = "rgba(255,255,255,0.08)";

interface EarningsSummary { available_balance: number; total: number; pending_payout: number; min_payout?: number; }
interface Payout { id: string; amount: number; method: string; status: string; requested_at: string; notes?: string; receipt_url?: string; }
interface PaymentMethod { id: string; method: string; name: string; account_id: string; ifsc_code?: string; is_default: number; }
interface SummaryResponse { data: EarningsSummary; }
interface PayoutsResponse { data: { payouts: Payout[] }; }
interface PaymentMethodsResponse { data: { methods: PaymentMethod[] }; }

const METHODS = [
  { value:"paypal",label:"PayPal", available:true },
  { value:"upi",label:"UPI", available:true },
  { value:"bank",label:"Bank Transfer", available:true },
  { value:"wise",label:"Wise", available:false },
  { value:"payoneer",label:"Payoneer", available:false },
  { value:"crypto",label:"Crypto", available:false },
];
const fmt = (n: unknown) => `$${(parseFloat(String(n ?? 0)) || 0).toFixed(2)}`;
function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } catch { return iso; }
}
function statusStyle(s: string): React.CSSProperties {
  if (s==="completed") return { background:"rgba(52,211,153,0.1)",  color:"#34d399" };
  if (s==="pending")   return { background:"rgba(251,191,36,0.1)",  color:"#fbbf24" };
  if (s==="failed")    return { background:"rgba(239,68,68,0.1)",   color:"#f87171" };
  return { background:"rgba(100,116,139,0.15)", color:"#64748b" };
}

const inputStyle: React.CSSProperties = {
  background:INPUT_BG, border:`1px solid ${INPUT_BORDER}`, color:"#e2e8f0",
  borderRadius:14, padding:"12px 16px", width:"100%", fontSize:14, outline:"none", transition:"border-color 0.2s",
};

function ReasonButton({ reason }: { reason: string }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80"
        style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        View Reason
      </button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShow(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#0b0c14", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "rgba(239,68,68,0.15)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3 className="text-sm font-bold text-white">Rejection Reason</h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#e2e8f0" }}>{reason}</p>
            <button
              onClick={() => setShow(false)}
              className="mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition hover:bg-white/5"
              style={{ background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ReceiptButton({ receiptUrl }: { receiptUrl: string }) {
  const [show, setShow] = useState(false);
  const BASE = import.meta.env.VITE_API_URL || "http://localhost:5001";
  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80"
        style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        View Receipt
      </button>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShow(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-2xl p-4"
            style={{ background: "#0b0c14", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Payment Receipt</h3>
              <button onClick={() => setShow(false)} className="text-xs" style={{ color: "#64748b" }}>✕</button>
            </div>
            <img src={`${BASE}${receiptUrl}`} alt="Receipt" className="w-full rounded-xl" />
          </div>
        </div>
      )}
    </>
  );
}

function WithdrawPage() {
  const [summary, setSummary] = useState<EarningsSummary|null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("paypal");
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      apiFetch<SummaryResponse>("/api/earnings/summary"),
      apiFetch<PayoutsResponse>("/api/earnings/payouts"),
      apiFetch<PaymentMethodsResponse>("/api/users/payment-methods"),
    ])
      .then(([s,p,m]) => {
        setSummary(s.data);
        setPayouts(p.data.payouts??[]);
        setSavedMethods(m.data.methods??[]);
        if (m.data.methods?.length) {
          const def = m.data.methods.find(x => x.is_default) || m.data.methods[0];
          setMethod(def.method);
        }
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const balance = summary?.available_balance ?? 0;
  const MIN = summary?.min_payout ?? 5;
  const belowMin = balance < MIN;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(""); setFormSuccess("");
    const n = parseFloat(amount);
    if (isNaN(n)||n<=0) { setFormError("Please enter a valid amount."); return; }
    if (n > balance)    { setFormError("Amount exceeds your available balance."); return; }
    if (n < MIN)        { setFormError(`Minimum payout is ${fmt(MIN)}.`); return; }
    setSubmitting(true);
    try {
      await apiFetch("/api/earnings/payouts", { method:"POST", body:JSON.stringify({ amount:n, method }) });
      setFormSuccess("Payout request submitted! It will be processed within 1–3 business days.");
      setAmount(""); fetchData();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to submit payout request.");
    } finally { setSubmitting(false); }
  };

  return (
    <DashboardLayout title="Withdraw" subtitle="Request a payout of your available earnings." activePage="Withdraw">
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171" }}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {belowMin && (
              <div className="flex items-start gap-3 rounded-[16px] px-4 py-3.5" style={{ background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.2)" }}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color:"#fbbf24" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color:"#fbbf24" }}>Minimum balance not reached</p>
                  <p className="mt-0.5 text-xs" style={{ color:SUBTEXT }}>You need at least {fmt(MIN)} to request a payout. Your current balance is {fmt(balance)}.</p>
                </div>
              </div>
            )}

            <div className="rounded-[22px] p-6" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
              <div className="mb-5 flex items-center gap-2.5">
                <Wallet className="h-5 w-5" style={{ color:PURPLE }} />
                <h3 className="font-bold text-white">Request Payout</h3>
              </div>
              {formSuccess && (
                <div className="mb-4 flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm" style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.25)", color:"#34d399" }}>
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />{formSuccess}
                </div>
              )}
              {formError && (
                <div className="mb-4 flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171" }}>
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{formError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">Amount (USD) <span style={{ color:"#f87171" }}>*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold" style={{ color:SUBTEXT }}>$</span>
                    <input type="number" min={MIN} max={balance} step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)}
                      placeholder="0.00" disabled={belowMin} style={{ ...inputStyle, paddingLeft:28 }}
                      onFocus={e=>(e.currentTarget.style.borderColor="rgba(167,139,250,0.5)")} onBlur={e=>(e.currentTarget.style.borderColor=INPUT_BORDER)} />
                  </div>
                  <p className="mt-1.5 text-xs" style={{ color:MUTED }}>Available: {fmt(balance)} · Minimum: {fmt(MIN)}</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">Payment Method <span style={{ color:"#f87171" }}>*</span></label>
                  <select value={method} onChange={e=>setMethod(e.target.value)} disabled={belowMin} style={{ ...inputStyle, cursor:"pointer" }}
                    onFocus={e=>(e.currentTarget.style.borderColor="rgba(167,139,250,0.5)")} onBlur={e=>(e.currentTarget.style.borderColor=INPUT_BORDER)}>
                    {savedMethods.length > 0 ? (
                      savedMethods.map(m => (
                        <option key={m.id} value={m.method} style={{ background:"#0f1120" }}>
                          {m.method.toUpperCase()} — {m.account_id}
                        </option>
                      ))
                    ) : (
                      METHODS.map(m => <option key={m.value} value={m.value} style={{ background:"#0f1120" }}>{m.label}</option>)
                    )}
                  </select>
                  {savedMethods.length === 0 && (
                    <p className="mt-1.5 text-xs" style={{ color:"#f59e0b" }}>
                      No saved payment methods. <a href="/dashboard/settings-page" style={{ color:PURPLE, textDecoration:"underline" }}>Add one in Settings</a>
                    </p>
                  )}
                </div>
                <button type="submit" disabled={submitting||belowMin} className="flex w-full items-center justify-center gap-2 rounded-[16px] py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow:(submitting||belowMin)?"none":"0 0 24px rgba(167,139,250,0.35)" }}>
                  {submitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Wallet className="h-4 w-4" />}
                  {submitting ? "Submitting…" : "Request Payout"}
                </button>
              </form>
            </div>

            <div className="rounded-[22px] overflow-hidden" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2.5 px-6 py-5" style={{ borderBottom:`1px solid ${BORDER}` }}>
                <Clock className="h-4 w-4" style={{ color:PURPLE }} />
                <h3 className="font-bold text-white">Transaction History</h3>
              </div>
              {payouts.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm" style={{ color:MUTED }}>No withdrawal history available.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                        {["Date","Amount","Method","Status",""].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color:"#475569" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map(p => (
                        <tr key={p.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                          <td className="px-4 py-3 text-xs" style={{ color:SUBTEXT }}>{formatDate(p.requested_at)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-white">{fmt(p.amount)}</td>
                          <td className="px-4 py-3 text-xs capitalize" style={{ color:SUBTEXT }}>{p.method}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize" style={statusStyle(p.status)}>{p.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            {p.status === "failed" && p.notes && (
                              <ReasonButton reason={p.notes} />
                            )}
                            {p.status === "completed" && p.receipt_url && (
                              <ReceiptButton receiptUrl={p.receipt_url} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[22px] p-6 text-center" style={{ background:"linear-gradient(145deg,#1a0a3a 0%,#0f0720 50%,#0b0c14 100%)", border:"1px solid rgba(167,139,250,0.25)", boxShadow:"0 0 40px rgba(167,139,250,0.12)" }}>
              <p className="text-xs font-medium" style={{ color:SUBTEXT }}>Available Balance</p>
              <p className="mt-3 text-5xl font-bold text-white">{fmt(balance)}</p>
              <p className="mt-2 text-xs" style={{ color:MUTED }}>Lifetime: {fmt(summary?.total??0)}</p>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span style={{ color:MUTED }}>Payout Threshold</span>
                  <span style={{ color:PURPLE }}>{fmt(balance)} / {fmt(MIN)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width:`${Math.min((balance/MIN)*100,100)}%`, background:`linear-gradient(90deg,${PURPLE_D},${PURPLE})` }} />
                </div>
              </div>
            </div>
            <div className="rounded-[18px] p-4" style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${BORDER}` }}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color:MUTED }}>Supported Methods</p>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map(m => (
                  <div key={m.value} className="flex items-center justify-between rounded-[10px] px-3 py-2" style={{ background:"rgba(255,255,255,0.04)" }}>
                    <span className="text-xs font-medium" style={{ color: m.available ? SUBTEXT : "#475569" }}>{m.label}</span>
                    {!m.available && <span className="text-[9px] font-semibold rounded px-1.5 py-0.5" style={{ background:"rgba(251,191,36,0.1)", color:"#fbbf24" }}>Soon</span>}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px]" style={{ color:MUTED }}>Payouts processed within 1–3 business days.</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
