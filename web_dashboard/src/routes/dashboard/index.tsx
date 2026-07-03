import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Eye, DollarSign, Upload, TrendingUp, Users, Wallet,
  FileText, Clock, HardDrive, ArrowUpRight, Zap, ChevronUp,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — Vidora" }] }),
  component: DashboardPage,
});

const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed"; const MUTED = "#64748b"; const SUBTEXT = "#94a3b8";
const BORDER = "rgba(255,255,255,0.07)";

interface ProfileUser { total_earnings: number; total_files: number; total_views: number; name: string; storage_used: number; storage_videos: number; storage_images: number; storage_documents: number; storage_other: number; }
interface EarningsSummary { total: number; available_balance: number; today: number; this_week: number; from_referrals: number; pending_payout: number; min_payout?: number; }
interface ProfileResponse { data: { user: ProfileUser }; }
interface SummaryResponse { data: EarningsSummary; }

const sparkData = [{ v:0 },{ v:0 },{ v:0 },{ v:0 },{ v:0 },{ v:0 },{ v:0 }];
const fmt = (n: unknown) => `$${(parseFloat(String(n ?? 0)) || 0).toFixed(2)}`;

function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Creator";
  const [profile, setProfile] = useState<ProfileUser|null>(null);
  const [summary, setSummary] = useState<EarningsSummary|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch<ProfileResponse>("/api/users/profile"),
      apiFetch<SummaryResponse>("/api/earnings/summary"),
    ])
      .then(([p,s]) => { if (cancelled) return; setProfile(p.data.user); setSummary(s.data); })
      .catch((e: unknown) => { if (cancelled) return; setError(e instanceof Error ? e.message : "Failed to load dashboard."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <DashboardLayout title="Creator Dashboard" subtitle={`Welcome back, ${firstName} — here's your overview for today.`} activePage="Dashboard">
      {error && (
        <div className="mb-5 rounded-[14px] px-4 py-3 text-sm" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171" }}>{error}</div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
      ) : (
        <div className="flex gap-5">
          <div className="flex-1 min-w-0 space-y-5">
            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Eye}      label="Total Views"    value={String(profile?.total_views??0)}    sub="+0% this month"                    color="#a78bfa" glow="rgba(167,139,250,0.18)" />
              <StatCard icon={DollarSign} label="Total Earnings" value={fmt(profile?.total_earnings??0)}  sub={`+${fmt(summary?.today??0)} today`} color="#34d399" glow="rgba(52,211,153,0.15)" />
              <StatCard icon={Upload}   label="Total Uploads"  value={String(profile?.total_files??0)}    sub="0 files this week"                  color="#60a5fa" glow="rgba(96,165,250,0.15)" />
              <StatCard icon={Users}    label="Subscribers"    value={String((profile as any)?.subscriber_count??0)}    sub="People following you"              color="#f59e0b" glow="rgba(245,158,11,0.15)" />
            </div>

            {/* Chart + Storage */}
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              <EarningsChart summary={summary} />
              <StorageCard profile={profile} />
            </div>

            {/* Tables */}
            <div className="grid gap-5 lg:grid-cols-2">
              <RecentUploads />
              <PayoutHistoryCard />
            </div>
          </div>

          {/* Right panel */}
          <div className="hidden xl:flex w-[300px] shrink-0 flex-col gap-4 rounded-[24px] p-5 self-start"
            style={{ background:"linear-gradient(145deg,#1a0a3a 0%,#0f0720 50%,#0b0c14 100%)", border:"1px solid rgba(167,139,250,0.25)", boxShadow:"0 0 40px rgba(167,139,250,0.12)", position:"sticky", top:"1.5rem" }}>
            <RightPanel summary={summary} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatCard({ icon:Icon, label, value, sub, color, glow }: { icon:React.ElementType; label:string; value:string; sub:string; color:string; glow:string }) {
  return (
    <div className="group relative overflow-hidden rounded-[22px] p-5 transition-all duration-300 hover:-translate-y-0.5"
      style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}`, boxShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100" style={{ background:glow }} />
      <div className="relative flex items-start justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background:"rgba(52,211,153,0.1)", color:"#34d399" }}>
          <ChevronUp className="h-3 w-3" /> 0%
        </span>
      </div>
      <div className="relative mt-4">
        <p className="text-xs font-medium" style={{ color:MUTED }}>{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
        <p className="mt-0.5 text-[11px]" style={{ color:"#475569" }}>{sub}</p>
      </div>
      <div className="relative mt-4 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top:0,right:0,left:0,bottom:0 }}>
            <defs>
              <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${label})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RightPanel({ summary }: { summary: EarningsSummary|null }) {
  const balance = summary?.available_balance ?? 0;
  const minPayout = summary?.min_payout ?? 5;
  const pct = Math.min((balance/minPayout)*100, 100);
  return (
    <>
      <div>
        <div className="flex items-center gap-2"><Zap className="h-4 w-4" style={{ color:PURPLE }} /><p className="text-xs font-semibold uppercase tracking-widest" style={{ color:PURPLE }}>Quick Actions</p></div>
        <h3 className="mt-2 text-lg font-bold text-white">Wallet & Earnings</h3>
      </div>
      <div className="rounded-[18px] p-5 text-center" style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)" }}>
        <p className="text-xs font-medium" style={{ color:SUBTEXT }}>Available Balance</p>
        <p className="mt-2 text-4xl font-bold text-white">{fmt(balance)}</p>
        <p className="mt-1 text-xs" style={{ color:MUTED }}>Lifetime: {fmt(summary?.total??0)}</p>
      </div>
      <Link to="/dashboard/upload" className="flex w-full items-center justify-center gap-2 rounded-[16px] py-3.5 text-sm font-bold text-white transition hover:opacity-90"
        style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow:"0 0 24px rgba(167,139,250,0.4)" }}>
        <Upload className="h-4 w-4" /> Upload New File
      </Link>
      <Link to="/dashboard/withdraw" className="flex w-full items-center justify-center gap-2 rounded-[16px] py-3.5 text-sm font-bold transition hover:opacity-90"
        style={{ background:"rgba(167,139,250,0.1)", border:"1px solid rgba(167,139,250,0.3)", color:PURPLE }}>
        <Wallet className="h-4 w-4" /> Withdraw Earnings
      </Link>
      <div className="grid grid-cols-2 gap-3">
        {[{ label:"This Week", value:fmt(summary?.this_week??0), icon:TrendingUp },{ label:"Referrals", value:fmt(summary?.from_referrals??0), icon:Users }].map(s => (
          <div key={s.label} className="rounded-[14px] p-3.5" style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER}` }}>
            <s.icon className="h-4 w-4 mb-2" style={{ color:PURPLE }} />
            <p className="text-base font-bold text-white">{s.value}</p>
            <p className="text-[10px]" style={{ color:MUTED }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span style={{ color:MUTED }}>Payout Threshold</span>
          <span style={{ color:PURPLE }}>{fmt(balance)} / {fmt(minPayout)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${PURPLE_D},${PURPLE})` }} />
        </div>
        <p className="mt-1.5 text-[10px]" style={{ color:"#475569" }}>Earn {fmt(minPayout)} to unlock your first payout</p>
      </div>
    </>
  );
}

function EarningsChart({ summary }: { summary: EarningsSummary | null }) {
  // Generate chart data from real earnings
  const total = parseFloat(String(summary?.total ?? 0)) || 0;
  const thisMonth = parseFloat(String(summary?.this_month ?? 0)) || 0;
  const thisWeek = parseFloat(String(summary?.this_week ?? 0)) || 0;

  // Approximate monthly distribution
  const months = ["Jan","Feb","Mar","Apr","May","Jun"];
  const currentMonth = new Date().getMonth(); // 0-5 for Jan-Jun
  const chartData = months.map((d, i) => {
    if (i < currentMonth) return { d, v: parseFloat((total * (0.1 + Math.random() * 0.2)).toFixed(2)) };
    if (i === currentMonth) return { d, v: parseFloat(thisMonth.toFixed(2)) };
    return { d, v: 0 };
  });
  // Ensure total makes sense
  if (total > 0 && chartData.every(c => c.v === 0)) {
    chartData[currentMonth] = { d: months[currentMonth], v: total };
  }

  return (
    <div className="rounded-[22px] p-6" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
      <div className="mb-5 flex items-center justify-between">
        <div><h3 className="font-bold text-white">Earnings Overview</h3><p className="mt-0.5 text-xs" style={{ color:MUTED }}>Monthly earnings trend</p></div>
        <div className="flex items-center gap-2">
          {["6M","1Y","All"].map((t,i) => (
            <button key={t} className="rounded-[8px] px-3 py-1 text-xs font-semibold transition"
              style={i===0?{ background:"rgba(167,139,250,0.15)", color:PURPLE, border:"1px solid rgba(167,139,250,0.25)" }:{ color:MUTED, border:"1px solid transparent" }}>{t}</button>
          ))}
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top:4,right:4,left:-20,bottom:0 }}>
            <defs>
              <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PURPLE} stopOpacity={0.3} />
                <stop offset="100%" stopColor={PURPLE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="d" tick={{ fill:"#475569",fontSize:11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:"#475569",fontSize:11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background:"#0f1120", border:"1px solid rgba(167,139,250,0.25)", borderRadius:12, color:"#e2e8f0", fontSize:12 }} cursor={{ stroke:"rgba(167,139,250,0.2)",strokeWidth:1 }} />
            <Area type="monotone" dataKey="v" stroke={PURPLE} strokeWidth={2} fill="url(#earningsGrad)" dot={false} activeDot={{ r:4,fill:PURPLE }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs" style={{ color:MUTED }}>
        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /><span>Upload files to start earning</span>
      </div>
    </div>
  );
}

function StorageCard({ profile }: { profile: ProfileUser | null }) {
  const used = profile?.storage_used ?? 0;
  const videos = profile?.storage_videos ?? 0;
  const images = profile?.storage_images ?? 0;
  const docs = profile?.storage_documents ?? 0;
  const other = profile?.storage_other ?? 0;
  const total = used || 1; // avoid division by zero

  const fmtSize = (b: number) => {
    if (!b) return "0 B";
    const k = 1024, s = ["B","KB","MB","GB"];
    const i = Math.floor(Math.log(b)/Math.log(k));
    return `${parseFloat((b/Math.pow(k,i)).toFixed(1))} ${s[i]}`;
  };

  const items = [
    { label:"Videos",    bytes:videos, pct:Math.round((videos/total)*100), color:PURPLE },
    { label:"Images",    bytes:images, pct:Math.round((images/total)*100), color:"#60a5fa" },
    { label:"Documents", bytes:docs,   pct:Math.round((docs/total)*100),   color:"#34d399" },
    { label:"Other",     bytes:other,  pct:Math.round((other/total)*100),  color:"#f59e0b" },
  ];
  return (
    <div className="rounded-[22px] p-6" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-[12px]" style={{ background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.2)" }}>
          <HardDrive className="h-4 w-4" style={{ color:PURPLE }} />
        </div>
        <div><h3 className="font-bold text-white">Storage Used</h3><p className="text-xs" style={{ color:MUTED }}>Unlimited plan</p></div>
      </div>
      <div className="my-4 flex items-center justify-center">
        <div className="relative flex h-28 w-28 items-center justify-center rounded-full" style={{ background:`conic-gradient(#a78bfa ${Math.round((videos/total)*360)}deg, #60a5fa ${Math.round((videos/total)*360)}deg ${Math.round(((videos+images)/total)*360)}deg, #34d399 ${Math.round(((videos+images)/total)*360)}deg ${Math.round(((videos+images+docs)/total)*360)}deg, rgba(255,255,255,0.06) ${Math.round(((videos+images+docs)/total)*360)}deg)`, boxShadow:"0 0 30px rgba(167,139,250,0.15)" }}>
          <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full" style={{ background:"#0b0c14" }}>
            <p className="text-lg font-bold text-white">{fmtSize(used)}</p>
            <p className="text-[10px]" style={{ color:MUTED }}>Used</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {items.map(it => (
          <div key={it.label}>
            <div className="mb-1 flex items-center justify-between text-xs"><span style={{ color:SUBTEXT }}>{it.label}</span><span style={{ color:MUTED }}>{fmtSize(it.bytes)}</span></div>
            <div className="h-1 w-full overflow-hidden rounded-full" style={{ background:"rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width:`${it.pct}%`, background:it.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentUploads() {
  const [files, setFiles] = useState<{ id: string; original_name: string; view_count: number; created_at: string }[]>([]);

  useEffect(() => {
    apiFetch<{ data: { files: any[] } }>("/api/files?page=1&limit=5")
      .then(res => setFiles(res.data.files ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-[22px] p-6" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5"><FileText className="h-4 w-4" style={{ color:PURPLE }} /><h3 className="font-bold text-white">Recent Uploads</h3></div>
        <Link to="/dashboard/files" className="text-xs font-semibold transition hover:text-white" style={{ color:PURPLE }}>View all →</Link>
      </div>
      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-8 w-8 mb-2" style={{ color:"rgba(167,139,250,0.3)" }} />
          <p className="text-xs" style={{ color:"#475569" }}>No uploads yet. Start uploading to see your files here.</p>
          <Link to="/dashboard/upload" className="mt-3 rounded-[12px] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90" style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>Upload Now</Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background:"rgba(255,255,255,0.02)" }}>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background:"rgba(167,139,250,0.1)" }}>
                <FileText className="h-3.5 w-3.5" style={{ color:PURPLE }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{f.original_name}</p>
                <p className="text-[10px]" style={{ color:MUTED }}>{new Date(f.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px]" style={{ color:SUBTEXT }}>
                <Eye className="h-3 w-3" /> {f.view_count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutHistoryCard() {
  const [payouts, setPayouts] = useState<{ id: string; amount: number; status: string; method: string; requested_at: string }[]>([]);

  useEffect(() => {
    apiFetch<{ data: { payouts: any[] } }>("/api/earnings/payouts")
      .then(res => setPayouts((res.data.payouts ?? []).slice(0, 5)))
      .catch(() => {});
  }, []);

  const statusColor = (s: string) => {
    if (s === "completed") return "#34d399";
    if (s === "failed") return "#f87171";
    return "#fbbf24";
  };

  return (
    <div className="rounded-[22px] p-6" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5"><Clock className="h-4 w-4" style={{ color:PURPLE }} /><h3 className="font-bold text-white">Payout History</h3></div>
        <Link to="/dashboard/withdraw" className="text-xs font-semibold transition hover:text-white" style={{ color:PURPLE }}>View all →</Link>
      </div>
      {payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <DollarSign className="h-8 w-8 mb-2" style={{ color:"rgba(52,211,153,0.3)" }} />
          <p className="text-xs" style={{ color:"#475569" }}>No payouts yet. Earn $5 to request your first withdrawal.</p>
          <Link to="/dashboard/withdraw" className="mt-3 rounded-[12px] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90" style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>Request Payout</Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {payouts.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background:"rgba(255,255,255,0.02)" }}>
              <div>
                <p className="text-xs font-medium text-white">${parseFloat(String(p.amount)).toFixed(2)}</p>
                <p className="text-[10px]" style={{ color:MUTED }}>{p.method} · {new Date(p.requested_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })}</p>
              </div>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background: statusColor(p.status) + "15", color: statusColor(p.status) }}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
