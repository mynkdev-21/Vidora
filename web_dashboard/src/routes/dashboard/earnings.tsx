import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Eye, Users, Calendar, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/earnings")({
  head: () => ({ meta: [{ title: "Earnings — Vidora" }] }),
  component: EarningsPage,
});

const PURPLE = "#a78bfa"; const MUTED = "#64748b"; const SUBTEXT = "#94a3b8";
const BORDER = "rgba(255,255,255,0.07)";

interface EarningsSummary {
  total: number; available_balance: number; today: number; this_week: number;
  from_views: number; from_referrals: number; pending_payout: number;
}
interface EarningItem {
  id: string; type: string; amount: number; file_name?: string; created_at: string;
}
interface SummaryResponse { data: EarningsSummary; }
interface EarningsListResponse { data: { earnings: EarningItem[]; total_earnings: number; pagination: { total: number } }; }

const fmt = (n: unknown) => `$${(parseFloat(String(n ?? 0)) || 0).toFixed(2)}`;
function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } catch { return iso; }
}
function typeStyle(t: string): React.CSSProperties {
  if (t==="view")     return { background:"rgba(167,139,250,0.1)", color:"#a78bfa" };
  if (t==="referral") return { background:"rgba(52,211,153,0.1)",  color:"#34d399" };
  if (t==="bonus")    return { background:"rgba(251,191,36,0.1)",  color:"#fbbf24" };
  return { background:"rgba(100,116,139,0.15)", color:"#64748b" };
}

function EarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [earnings, setEarnings] = useState<EarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<SummaryResponse>("/api/earnings/summary"),
      apiFetch<EarningsListResponse>("/api/earnings"),
    ])
      .then(([s, e]) => { if (cancelled) return; setSummary(s.data); setEarnings(e.data.earnings ?? []); })
      .catch((e: unknown) => { if (cancelled) return; setError(e instanceof Error ? e.message : "Failed to load earnings."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const cards = summary ? [
    { label:"Total Earnings",    value:fmt(summary.total),             icon:DollarSign, color:"#34d399", glow:"rgba(52,211,153,0.15)" },
    { label:"Available Balance", value:fmt(summary.available_balance), icon:DollarSign, color:"#a78bfa", glow:"rgba(167,139,250,0.15)" },
    { label:"Today",             value:fmt(summary.today),             icon:Calendar,   color:"#60a5fa", glow:"rgba(96,165,250,0.15)" },
    { label:"This Week",         value:fmt(summary.this_week),         icon:TrendingUp, color:"#f59e0b", glow:"rgba(245,158,11,0.15)" },
    { label:"From Views",        value:fmt(summary.from_views),        icon:Eye,        color:"#a78bfa", glow:"rgba(167,139,250,0.15)" },
    { label:"From Referrals",    value:fmt(summary.from_referrals),    icon:Users,      color:"#34d399", glow:"rgba(52,211,153,0.15)" },
  ] : [];

  return (
    <DashboardLayout title="Earnings" subtitle="Track your revenue from views, referrals, and bonuses." activePage="Earnings">
      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171" }}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map(c => (
              <div key={c.label} className="group relative overflow-hidden rounded-[22px] p-5 transition-all duration-300 hover:-translate-y-0.5"
                style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}`, boxShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100" style={{ background:c.glow }} />
                <div className="relative flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background:`${c.color}18`, border:`1px solid ${c.color}30` }}>
                    <c.icon className="h-5 w-5" style={{ color:c.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color:MUTED }}>{c.label}</p>
                    <p className="text-xl font-bold tracking-tight text-white">{c.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {summary && summary.pending_payout > 0 && (
            <div className="flex items-center gap-3 rounded-[16px] px-4 py-3.5" style={{ background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.2)" }}>
              <DollarSign className="h-4 w-4 shrink-0" style={{ color:"#fbbf24" }} />
              <p className="text-sm" style={{ color:"#fbbf24" }}>You have a pending payout of <strong>{fmt(summary.pending_payout)}</strong> being processed.</p>
            </div>
          )}

          <div className="rounded-[22px] overflow-hidden" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom:`1px solid ${BORDER}` }}>
              <h3 className="font-bold text-white">Earnings History</h3>
              <span className="text-xs" style={{ color:MUTED }}>{earnings.length} records</span>
            </div>
            {earnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <DollarSign className="h-10 w-10 mb-3" style={{ color:"rgba(52,211,153,0.3)" }} />
                <p className="text-sm font-semibold text-white">No earnings yet</p>
                <p className="mt-1 text-xs" style={{ color:MUTED }}>Upload files and share them to start earning.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                      {["Type","Amount","File","Date"].map(h => (
                        <th key={h} className="px-5 py-4 text-left text-xs font-semibold" style={{ color:"#475569" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map(item => (
                      <tr key={item.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize" style={typeStyle(item.type)}>{item.type||"—"}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-bold" style={{ color:"#34d399" }}>{fmt(item.amount)}</td>
                        <td className="px-5 py-3.5 text-xs" style={{ color:SUBTEXT }}>{item.file_name||"—"}</td>
                        <td className="px-5 py-3.5 text-xs" style={{ color:MUTED }}>{formatDate(item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
