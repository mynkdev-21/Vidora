import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, Clock, CheckCircle, Zap } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/payouts")({
  head: () => ({ meta: [{ title: "Payout Records — Vidora" }] }),
  component: PayoutsPage,
});

const BG = "#06070d"; const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed";
const MUTED = "#64748b"; const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";

function PayoutsPage() {
  return (
    <div style={{ background: BG, color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      <LandingHeader />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-16">
        <h1 className="text-3xl font-bold text-white mb-2">Payout Records</h1>
        <p className="text-sm mb-10" style={{ color: MUTED }}>Track your withdrawal history and payment status.</p>

        {/* Info cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {[
            { icon: Zap, title: "Fast Processing", desc: "1–3 business days", color: PURPLE },
            { icon: DollarSign, title: "Min. Payout", desc: "$5.00", color: "#34d399" },
            { icon: CheckCircle, title: "6 Methods", desc: "UPI, PayPal, Wise, Crypto, Bank, Payoneer", color: "#60a5fa" },
          ].map(c => (
            <div key={c.title} className="rounded-[18px] p-5" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
              <c.icon className="h-5 w-5 mb-3" style={{ color: c.color }} />
              <p className="text-sm font-bold text-white">{c.title}</p>
              <p className="mt-1 text-xs" style={{ color: SUBTEXT }}>{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Login prompt */}
        <div className="rounded-[22px] p-8 text-center" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
          <Clock className="mx-auto h-10 w-10 mb-4" style={{ color: "rgba(167,139,250,0.4)" }} />
          <h3 className="text-lg font-bold text-white mb-2">View Your Payout History</h3>
          <p className="text-sm mb-6" style={{ color: SUBTEXT }}>Log in to your dashboard to see your complete payout records, request withdrawals, and manage payment methods.</p>
          <Link to="/dashboard/withdraw" className="inline-flex items-center gap-2 rounded-[14px] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
            <DollarSign className="h-4 w-4" /> Go to Withdraw
          </Link>
        </div>

        {/* How it works */}
        <div className="mt-10 rounded-[22px] p-6" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
          <h3 className="font-bold text-white mb-4">How Payouts Work</h3>
          <div className="space-y-4">
            {[
              { n: "1", title: "Earn from views", desc: "$5 per 1,000 views on your uploaded content" },
              { n: "2", title: "Reach $5 minimum", desc: "Once your balance hits $5, you can request a payout" },
              { n: "3", title: "Choose method", desc: "Select UPI, PayPal, Wise, Payoneer, Crypto, or Bank Transfer" },
              { n: "4", title: "Get paid", desc: "Payouts processed within 1–3 business days" },
            ].map(s => (
              <div key={s.n} className="flex gap-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>{s.n}</div>
                <div>
                  <p className="text-sm font-semibold text-white">{s.title}</p>
                  <p className="mt-0.5 text-xs" style={{ color: SUBTEXT }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
