import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users, Copy, CheckCircle, Link as LinkIcon, DollarSign, TrendingUp, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/referrals")({
  head: () => ({ meta: [{ title: "Referrals — Vidora" }] }),
  component: ReferralsPage,
});

const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed"; const MUTED = "#64748b";
const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";

function ReferralsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [refStats, setRefStats] = useState<{ total_referrals: number; total_earned: number; bonus_percent: number; referrals: { id: string; name: string; email: string; created_at: string }[] } | null>(null);

  const referralLink = `${window.location.origin}/signup?ref=${user?.id ?? ""}`;

  useEffect(() => {
    apiFetch<{ data: { total_referrals: number; total_earned: number; bonus_percent: number; referrals: { id: string; name: string; email: string; created_at: string }[] } }>("/api/earnings/referral-stats")
      .then(res => setRefStats(res.data))
      .catch(() => {});
  }, []);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(referralLink); }
    catch { const el = document.createElement("textarea"); el.value = referralLink; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const stats = [
    { label:"Total Referrals",       value: String(refStats?.total_referrals ?? 0), icon:Users,      color:PURPLE,    glow:"rgba(167,139,250,0.15)" },
    { label:"Earned from Referrals", value: `$${(refStats?.total_earned ?? 0).toFixed(2)}`, icon:DollarSign, color:"#34d399", glow:"rgba(52,211,153,0.15)" },
    { label:"Bonus Rate",            value:`${refStats?.bonus_percent ?? 5}%`,  icon:TrendingUp, color:"#f59e0b", glow:"rgba(245,158,11,0.15)" },
  ];

  const bonusPct = refStats?.bonus_percent ?? 5;

  const steps = [
    { n:"1", title:"Share your link",       desc:"Copy your unique referral link and share it with creators, friends, or on social media." },
    { n:"2", title:"They sign up",          desc:"When someone registers using your link, they become your referral permanently." },
    { n:"3", title:`Earn ${bonusPct}% on withdrawals`, desc:`Every time your referral withdraws earnings, you automatically get ${bonusPct}% bonus credited to your account.` },
  ];

  return (
    <DashboardLayout title="Referrals" subtitle={`Invite creators and earn ${bonusPct}% of their earnings forever.`} activePage="Referrals">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="rounded-[22px] p-6" style={{ background:"linear-gradient(145deg,#1a0a3a 0%,#0f0720 50%,#0b0c14 100%)", border:"1px solid rgba(167,139,250,0.25)", boxShadow:"0 0 40px rgba(167,139,250,0.12)" }}>
          <div className="flex items-center gap-2.5 mb-4">
            <LinkIcon className="h-5 w-5" style={{ color:PURPLE }} />
            <h3 className="font-bold text-white">Your Referral Link</h3>
          </div>
          <div className="flex items-center gap-3 rounded-[16px] p-3" style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${BORDER}` }}>
            <p className="flex-1 truncate text-sm font-mono" style={{ color:SUBTEXT }}>{referralLink}</p>
            <button onClick={handleCopy} className="flex shrink-0 items-center gap-2 rounded-[12px] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
              style={{ background:copied?"rgba(52,211,153,0.2)":`linear-gradient(135deg,${PURPLE_D},${PURPLE})`, border:copied?"1px solid rgba(52,211,153,0.4)":"none", color:copied?"#34d399":"#fff" }}>
              {copied ? <><CheckCircle className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy Link</>}
            </button>
          </div>
          <p className="mt-3 text-xs" style={{ color:MUTED }}>Share this link anywhere — Twitter, YouTube, Telegram, or directly with creators you know.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map(s => (
            <div key={s.label} className="group relative overflow-hidden rounded-[22px] p-5 transition-all duration-300 hover:-translate-y-0.5"
              style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}`, boxShadow:"0 4px 24px rgba(0,0,0,0.4)" }}>
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100" style={{ background:s.glow }} />
              <div className="relative flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-[12px]" style={{ background:`${s.color}18`, border:`1px solid ${s.color}30` }}>
                  <s.icon className="h-5 w-5" style={{ color:s.color }} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color:MUTED }}>{s.label}</p>
                  <p className="text-xl font-bold tracking-tight text-white">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[22px] p-6" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
          <h3 className="mb-5 font-bold text-white">How It Works</h3>
          <div className="space-y-4">
            {steps.map(s => (
              <div key={s.n} className="flex gap-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>{s.n}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{s.title}</p>
                  <p className="mt-0.5 text-xs" style={{ color:SUBTEXT }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-[18px] px-4 py-4" style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)" }}>
          <Info className="mt-0.5 h-4 w-4 shrink-0" style={{ color:PURPLE }} />
          <div>
            <p className="text-sm font-semibold" style={{ color:PURPLE }}>OG Uploader Referral System</p>
            <p className="mt-1 text-xs" style={{ color:SUBTEXT }}>When your referred user withdraws their earnings, you automatically receive <strong className="text-white">{bonusPct}%</strong> of their withdrawal amount as a bonus. No cap, no expiry — earn passively forever.</p>
          </div>
        </div>

        <div className="rounded-[22px] overflow-hidden" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom:`1px solid ${BORDER}` }}>
            <h3 className="font-bold text-white">Your Referrals</h3>
            <span className="text-xs" style={{ color:MUTED }}>{refStats?.total_referrals ?? 0} referrals</span>
          </div>
          {(refStats?.total_referrals ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Users className="h-10 w-10 mb-3" style={{ color:"rgba(167,139,250,0.3)" }} />
              <p className="text-sm font-semibold text-white">No referrals yet</p>
              <p className="mt-1 text-xs" style={{ color:MUTED }}>Share your link to start building your referral network.</p>
              <button onClick={handleCopy} className="mt-4 flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
                <Copy className="h-4 w-4" />{copied ? "Copied!" : "Copy Referral Link"}
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: BORDER }}>
              {refStats?.referrals.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-6 py-4">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.name}</p>
                    <p className="text-[11px] truncate" style={{ color:MUTED }}>{r.email}</p>
                  </div>
                  <p className="text-[11px] shrink-0" style={{ color:MUTED }}>
                    {new Date(r.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
