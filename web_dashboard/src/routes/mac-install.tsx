import { createFileRoute } from "@tanstack/react-router";
import { Download, Terminal, Shield, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/mac-install")({
  head: () => ({ meta: [{ title: "Install Vidora on Mac — Instructions" }] }),
  component: MacInstallPage,
});

const BG = "#06070d";
const CARD = "#0f1120";
const PURPLE = "#a78bfa";
const PURPLE_D = "#7c3aed";
const BORDER = "rgba(255,255,255,0.07)";
const MUTED = "#64748b";
const SUBTEXT = "#94a3b8";

function MacInstallPage() {
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const variant = searchParams.get("v") || "arm"; // arm or intel

  const dmgFile = variant === "intel" ? "Vidora_1.0.0_x64.dmg" : "Vidora_1.0.0_aarch64.dmg";
  const chipLabel = variant === "intel" ? "Intel" : "Apple Silicon (M1/M2/M3/M4)";

  return (
    <div className="min-h-screen font-sans" style={{ background: BG, color: "#e2e8f0" }}>
      <div className="mx-auto max-w-2xl px-4 py-16">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-5"
            style={{ background: "rgba(167,139,250,0.1)", color: PURPLE, border: "1px solid rgba(167,139,250,0.25)" }}>
            <Shield className="h-3.5 w-3.5" /> macOS Installation Guide
          </div>
          <h1 className="text-3xl font-bold text-white">Install Vidora on Mac</h1>
          <p className="mt-2 text-sm" style={{ color: SUBTEXT }}>
            For {chipLabel} · Follow these simple steps
          </p>
        </div>

        {/* Step 1: Download */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-start gap-4">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>1</div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Download the App</h3>
              <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>Click the button below to download the DMG file.</p>
              <a href={`/apps/${dmgFile}`} download
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
                <Download className="h-4 w-4" /> Download {dmgFile}
              </a>
            </div>
          </div>
        </div>

        {/* Step 2: Open DMG */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-start gap-4">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>2</div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Open the DMG & Drag to Applications</h3>
              <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>
                Double-click the downloaded <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(167,139,250,0.15)", color: PURPLE }}>.dmg</code> file.
                Drag <strong>Vidora</strong> to the <strong>Applications</strong> folder.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Fix Gatekeeper */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: CARD, border: `1px solid rgba(251,191,36,0.2)` }}>
          <div className="flex items-start gap-4">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>3</div>
            <div className="flex-1">
              <h3 className="font-bold text-white">Allow the App to Open</h3>
              <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>
                macOS may show <em>"Vidora is damaged"</em> or <em>"can't be opened"</em> because the app is not signed with an Apple Developer certificate. This is safe — fix it with one command:
              </p>
              <div className="mt-4 rounded-xl p-4 font-mono text-sm" style={{ background: "#080910", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="h-4 w-4" style={{ color: PURPLE }} />
                  <span className="text-xs font-semibold" style={{ color: MUTED }}>Terminal (copy & paste)</span>
                </div>
                <code className="text-white select-all">xattr -cr /Applications/Vidora.app</code>
              </div>
              <p className="mt-3 text-xs" style={{ color: MUTED }}>
                Open <strong>Terminal</strong> (Spotlight → type "Terminal") → paste the command → press Enter.
              </p>

              <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: PURPLE }}>Alternative method:</p>
                <ol className="text-xs space-y-1" style={{ color: SUBTEXT }}>
                  <li>1. Try to open Vidora (it will show the error)</li>
                  <li>2. Go to <strong>System Settings → Privacy & Security</strong></li>
                  <li>3. Scroll down — you'll see "Vidora was blocked"</li>
                  <li>4. Click <strong>"Open Anyway"</strong></li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Done */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-start gap-4">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold"
              style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
              <CheckCircle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white">You're all set!</h3>
              <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>
                Open Vidora from your Applications folder or Launchpad. Login with your creator account and start managing your content.
              </p>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="text-center">
          <a href="/" className="text-sm font-semibold transition hover:opacity-80" style={{ color: PURPLE }}>
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
