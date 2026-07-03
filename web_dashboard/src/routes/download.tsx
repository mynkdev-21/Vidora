import { createFileRoute } from "@tanstack/react-router";
import { Smartphone, Download, Play, Shield, Zap } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/download")({
  head: () => ({ meta: [{ title: "Download App — Vidora" }] }),
  component: DownloadPage,
});

const BG = "#06070d"; const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed";
const MUTED = "#64748b"; const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";

function DownloadPage() {
  return (
    <div style={{ background: BG, color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      <LandingHeader />
      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-16 text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[22px]" style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
          <Smartphone className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Download Vidora App</h1>
        <p className="text-sm mb-10 max-w-md mx-auto" style={{ color: SUBTEXT }}>Stream videos, download files, and access all your content on the go. Free on Android & iOS.</p>

        {/* Download buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <a href="#" className="flex items-center gap-3 rounded-[16px] px-8 py-4 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow: "0 0 28px rgba(167,139,250,0.35)" }}>
            <Download className="h-5 w-5" /> Download for Android
          </a>
          <a href="#" className="flex items-center gap-3 rounded-[16px] px-8 py-4 text-sm font-bold transition hover:opacity-90"
            style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", color: PURPLE }}>
            <Download className="h-5 w-5" /> Download for iOS
          </a>
        </div>

        {/* Features */}
        <div className="grid gap-4 sm:grid-cols-2 text-left max-w-lg mx-auto">
          {[
            { icon: Play, title: "Fast Video Streaming", desc: "Advanced player with seek, fullscreen, and quality options" },
            { icon: Download, title: "Download & Share", desc: "Save files to your device for offline viewing" },
            { icon: Shield, title: "Secure & Private", desc: "No account required. No permissions needed." },
            { icon: Zap, title: "Lightweight", desc: "Small app size, fast loading, minimal battery usage" },
          ].map(f => (
            <div key={f.title} className="rounded-[18px] p-5" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
              <f.icon className="h-5 w-5 mb-3" style={{ color: PURPLE }} />
              <p className="text-sm font-bold text-white">{f.title}</p>
              <p className="mt-1 text-xs" style={{ color: SUBTEXT }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs" style={{ color: MUTED }}>No account required to browse. 100% free to download.</p>
      </main>
      <LandingFooter />
    </div>
  );
}
