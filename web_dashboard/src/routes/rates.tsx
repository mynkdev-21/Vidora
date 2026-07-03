import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, Eye, Users, Zap, Globe } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/rates")({
  head: () => ({ meta: [{ title: "Publisher Rates — Vidora" }] }),
  component: RatesPage,
});

const BG = "#06070d"; const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed";
const MUTED = "#64748b"; const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";

function RatesPage() {
  return (
    <div style={{ background: BG, color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      <LandingHeader />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-16">
        <h1 className="text-3xl font-bold text-white mb-2">Publisher Rates</h1>
        <p className="text-sm mb-10" style={{ color: MUTED }}>Earn money from every view on your content.</p>

        {/* Rate card */}
        <div className="rounded-[22px] p-8 mb-8 text-center" style={{ background: "linear-gradient(145deg,#1a0a3a 0%,#0f0720 50%,#0b0c14 100%)", border: "1px solid rgba(167,139,250,0.25)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: PURPLE }}>Current Rate</p>
          <p className="text-6xl font-bold text-white">$5</p>
          <p className="mt-2 text-lg" style={{ color: SUBTEXT }}>per 1,000 views</p>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>= $0.005 per view</p>
        </div>

        {/* Examples */}
        <div className="rounded-[22px] p-6 mb-8" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
          <h3 className="font-bold text-white mb-4">Earnings Examples</h3>
          <div className="space-y-3">
            {[
              { views: "1,000", earnings: "$5.00" },
              { views: "10,000", earnings: "$50.00" },
              { views: "100,000", earnings: "$500.00" },
              { views: "1,000,000", earnings: "$5,000.00" },
            ].map(r => (
              <div key={r.views} className="flex items-center justify-between rounded-[14px] px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <span className="text-sm" style={{ color: SUBTEXT }}>{r.views} views</span>
                <span className="text-sm font-bold text-white">{r.earnings}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {[
            { icon: Eye, title: "Monetize from 1st View", desc: "No threshold — earn from the very first view" },
            { icon: Zap, title: "Fast Payouts", desc: "Processed within 1–3 business days" },
            { icon: Globe, title: "Global Payments", desc: "PayPal, Wise, Payoneer, Crypto, Bank, UPI" },
            { icon: Users, title: "5% Referral Bonus", desc: "Earn from your referrals' views forever" },
          ].map(f => (
            <div key={f.title} className="rounded-[18px] p-5" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
              <f.icon className="h-5 w-5 mb-3" style={{ color: PURPLE }} />
              <p className="text-sm font-bold text-white">{f.title}</p>
              <p className="mt-1 text-xs" style={{ color: SUBTEXT }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Minimum payout */}
        <div className="rounded-[18px] p-4" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
          <p className="text-sm" style={{ color: SUBTEXT }}>
            <strong className="text-white">Minimum payout:</strong> $5.00 · No subscriber threshold · Unlimited storage · No file type restrictions
          </p>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
