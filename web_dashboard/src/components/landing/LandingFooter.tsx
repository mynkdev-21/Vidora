import { Download } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

const PURPLE   = "#a78bfa";
const PURPLE_D = "#7c3aed";
const SUBTEXT  = "#94a3b8";
const BORDER   = "rgba(255,255,255,0.07)";

function FooterCol({ title, links }: { title: string; links: string[] }) {
  const linkMap: Record<string, string> = {
    "Help & Support": "/help",
    "Privacy Policy": "/privacy",
    "Features": "/#features",
    "Why Vidora?": "/#why",
    "FAQ": "/#faq",
    "Dashboard": "/dashboard",
    "Download App": "/download",
    "Publisher Rates": "/rates",
    "Payout Records": "/payouts",
  };
  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm opacity-70">
        {links.map((l) => (
          <li key={l}><a href={linkMap[l] || "/"} className="hover:opacity-100 hover:text-white transition">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer style={{ background: "#080910", borderTop: `1px solid ${BORDER}`, color: SUBTEXT }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Vidora" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-white">Vidora</span>
          </div>
          <p className="mt-3 text-sm opacity-70">Upload, share, and monetize your content with unlimited cloud storage. Built for creators and consumers.</p>
          <div className="mt-4 flex gap-2">
            {["YouTube", "Channel", "Support"].map((s) => (
              <a key={s} href="#" className="rounded-full px-3 py-1 text-xs transition hover:text-white" style={{ background: "rgba(255,255,255,0.06)", border: BORDER }}>
                {s}
              </a>
            ))}
          </div>
        </div>
        <FooterCol title="Platform"  links={["Dashboard", "Download App", "Publisher Rates", "Payout Records"]} />
        <FooterCol title="Resources" links={["Features", "Why Vidora?", "FAQ", "Help & Support", "Privacy Policy"]} />
        <div>
          <h4 className="text-sm font-semibold text-white">Get the App</h4>
          <p className="mt-3 text-sm opacity-70">Available on Android & iOS. Free to download.</p>
          <a href="/#app" className="mt-3 inline-flex items-center gap-2 rounded-[12px] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
            <Download className="h-3.5 w-3.5" /> Download Now
          </a>
        </div>
      </div>
      <div className="py-6 text-center text-xs opacity-50" style={{ borderTop: `1px solid ${BORDER}` }}>
        © 2026 Vidora · CN-33, Pathkhauli, Kaptanganj 274301, Kushinagar, India · All rights reserved.
      </div>
    </footer>
  );
}
