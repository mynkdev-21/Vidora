import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Key, Copy, Check, AlertCircle,
  Eye, EyeOff, Shield, Zap, Terminal,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/api-key")({
  head: () => ({ meta: [{ title: "API Key — Vidora" }] }),
  component: ApiKeyPage,
});

const PURPLE   = "#a78bfa";
const MUTED    = "#64748b";
const SUBTEXT  = "#94a3b8";
const BORDER   = "rgba(255,255,255,0.07)";

interface ApiKeyData { api_key: string; created_at: string; }
interface ApiKeyResponse { data: ApiKeyData; }

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

function ApiKeyPage() {
  const [keyData, setKeyData]   = useState<ApiKeyData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    apiFetch<ApiKeyResponse>("/api/users/api-key")
      .then(res => setKeyData(res.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load API key."))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!keyData) return;
    try { await navigator.clipboard.writeText(keyData.api_key); }
    catch {
      const el = document.createElement("textarea");
      el.value = keyData.api_key; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const maskedKey = keyData
    ? keyData.api_key.slice(0, 12) + "•".repeat(Math.max(0, keyData.api_key.length - 16)) + keyData.api_key.slice(-4)
    : "";

  return (
    <DashboardLayout title="API Key" subtitle="Your permanent personal API key for authenticating with the Vidora API." activePage="API Key">
      <div className="max-w-2xl mx-auto space-y-5">

        {error && (
          <div className="flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Key card */}
            <div className="rounded-[22px] p-6"
              style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>

              <div className="mb-5 flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-[12px]"
                  style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  <Key className="h-4 w-4" style={{ color: PURPLE }} />
                </div>
                <div>
                  <h3 className="font-bold text-white">Your API Key</h3>
                  <p className="text-xs" style={{ color: MUTED }}>
                    {keyData ? `Created ${formatDate(keyData.created_at)}` : ""}
                  </p>
                </div>
                {/* Permanent badge */}
                <span className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>
                  Permanent
                </span>
              </div>

              {/* Key display */}
              <div className="flex items-center gap-2 rounded-[14px] px-4 py-3"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                <code className="flex-1 truncate text-sm font-mono" style={{ color: revealed ? "#e2e8f0" : SUBTEXT }}>
                  {keyData ? (revealed ? keyData.api_key : maskedKey) : "—"}
                </code>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => setRevealed(r => !r)}
                    className="grid h-7 w-7 place-items-center rounded-[8px] transition hover:bg-white/10"
                    style={{ color: MUTED }}
                    aria-label={revealed ? "Hide key" : "Reveal key"}
                    title={revealed ? "Hide" : "Reveal"}
                  >
                    {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="grid h-7 w-7 place-items-center rounded-[8px] transition"
                    style={{
                      color: copied ? "#34d399" : MUTED,
                      background: copied ? "rgba(52,211,153,0.12)" : "transparent",
                    }}
                    aria-label="Copy API key"
                    title="Copy"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <p className="mt-3 text-xs" style={{ color: MUTED }}>
                This key is permanent and unique to your account. Keep it secret — never share it publicly.
              </p>
            </div>

            {/* Info cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Shield,   title: "Permanent",  desc: "Your key never changes. Set it once and forget it.",         color: "#34d399" },
                { icon: Zap,      title: "Instant",    desc: "Authenticate API requests instantly with no extra setup.",   color: PURPLE },
                { icon: Terminal, title: "Flexible",   desc: "Use with Telegram bots, scripts, or any HTTP client.",       color: "#60a5fa" },
              ].map(c => (
                <div key={c.title} className="rounded-[18px] p-4"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="mb-2.5 grid h-8 w-8 place-items-center rounded-[10px]"
                    style={{ background: `${c.color}18`, border: `1px solid ${c.color}25` }}>
                    <c.icon className="h-4 w-4" style={{ color: c.color }} />
                  </div>
                  <p className="text-xs font-semibold text-white">{c.title}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: MUTED }}>{c.desc}</p>
                </div>
              ))}
            </div>

            {/* Telegram Bot Instructions */}
            <div className="rounded-[22px] p-6"
              style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
              <h3 className="mb-4 font-bold text-white">How to Use with Telegram Bot</h3>
              <div className="space-y-3 text-xs" style={{ color: SUBTEXT }}>
                <div className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: PURPLE }}>1</span>
                  <p>Open the Vidora Telegram Bot: <a href="https://t.me/vidorabot" target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: PURPLE }}>@vidorabot</a></p>
                </div>
                <div className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: PURPLE }}>2</span>
                  <p>Send the command <code className="rounded px-1 py-0.5" style={{ background: "rgba(167,139,250,0.12)", color: PURPLE }}>/setkey</code> followed by your API key</p>
                </div>
                <div className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: PURPLE }}>3</span>
                  <p>Once linked, send any file to the bot and it will be uploaded to your Vidora account automatically</p>
                </div>
                <div className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: PURPLE }}>4</span>
                  <p>The bot will reply with your share link — ready to distribute and earn views!</p>
                </div>
              </div>
              <div className="mt-4 rounded-[14px] p-3" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)" }}>
                <p className="text-[11px]" style={{ color: MUTED }}>
                  <strong style={{ color: PURPLE }}>Tip:</strong> You only need to set your key once. After that, just send files directly to the bot.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
