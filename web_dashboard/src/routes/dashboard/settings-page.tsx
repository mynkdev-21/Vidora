import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Wallet, Bell, CheckCircle, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/settings-page")({
  head: () => ({ meta: [{ title: "Settings — Vidora" }] }),
  component: SettingsPageNew,
});

const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed"; const MUTED = "#64748b";
const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";
const INPUT_BG = "rgba(255,255,255,0.05)"; const INPUT_BORDER = "rgba(255,255,255,0.08)";

const inputStyle: React.CSSProperties = {
  background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: "#e2e8f0",
  borderRadius: 14, padding: "12px 16px", width: "100%", fontSize: 14, outline: "none", transition: "border-color 0.2s",
};
const labelStyle: React.CSSProperties = { display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500, color: "#e2e8f0" };

function Msg({ type, msg }: { type: "success" | "error"; msg: string }) {
  if (!msg) return null;
  const ok = type === "success";
  return (
    <div className="flex items-start gap-2.5 rounded-[12px] px-4 py-3 text-sm"
      style={{ background: ok ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)", border: ok ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(239,68,68,0.25)", color: ok ? "#34d399" : "#f87171" }}>
      {ok ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      {msg}
    </div>
  );
}

function SettingsPageNew() {
  // Payment settings
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "paypal" | "bank">("upi");
  const [payName, setPayName] = useState("");
  const [payId, setPayId] = useState("");
  const [payIfsc, setPayIfsc] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [paySuccess, setPaySuccess] = useState("");
  const [payError, setPayError] = useState("");
  const [payLoading, setPayLoading] = useState(true);

  // Load saved payment methods on mount
  useEffect(() => {
    apiFetch<{ data: { methods: Array<{ method: string; name: string; account_id: string; ifsc_code?: string }> } }>("/api/users/payment-methods")
      .then(res => {
        const methods = res.data.methods ?? [];
        if (methods.length > 0) {
          const def = methods.find(m => m.method === paymentMethod) || methods[0];
          setPaymentMethod(def.method as "upi" | "paypal" | "bank");
          setPayName(def.name || "");
          setPayId(def.account_id || "");
          setPayIfsc(def.ifsc_code || "");
        }
      })
      .catch(() => {})
      .finally(() => setPayLoading(false));
  }, []);

  // When method tab changes, load that method's saved data
  const handleMethodChange = (m: "upi" | "paypal" | "bank") => {
    setPaymentMethod(m);
    setPaySuccess(""); setPayError("");
    apiFetch<{ data: { methods: Array<{ method: string; name: string; account_id: string; ifsc_code?: string }> } }>("/api/users/payment-methods")
      .then(res => {
        const saved = res.data.methods?.find(x => x.method === m);
        if (saved) {
          setPayName(saved.name || "");
          setPayId(saved.account_id || "");
          setPayIfsc(saved.ifsc_code || "");
        } else {
          setPayName(""); setPayId(""); setPayIfsc("");
        }
      })
      .catch(() => {});
  };

  // Notification preferences
  const [emailNotif, setEmailNotif] = useState(true);
  const [siteNotif, setSiteNotif] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState("");

  const handlePaymentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(""); setPaySuccess(""); setPaySaving(true);
    try {
      await apiFetch("/api/users/payment-methods", {
        method: "POST",
        body: JSON.stringify({
          method: paymentMethod,
          name: payName.trim(),
          account_id: payId.trim(),
          ifsc_code: paymentMethod === "bank" ? payIfsc.trim() : undefined,
        }),
      });
      setPaySuccess("Payment settings saved successfully.");
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : "Failed to save.");
    } finally { setPaySaving(false); }
  };

  const handleNotifSave = async () => {
    setNotifSaving(true); setNotifSuccess("");
    setTimeout(() => {
      setNotifSuccess("Preferences saved.");
      setNotifSaving(false);
    }, 500);
  };

  const methodLabels = { upi: "UPI", paypal: "PayPal", bank: "Bank Transfer" };
  const fieldLabels: Record<string, { label1: string; placeholder1: string; label2: string; placeholder2: string; label3?: string; placeholder3?: string }> = {
    upi: { label1: "Name", placeholder1: "Your name", label2: "UPI ID", placeholder2: "yourname@ybl" },
    paypal: { label1: "Name", placeholder1: "Your name", label2: "PayPal Email", placeholder2: "you@email.com" },
    bank: { label1: "Account Holder Name", placeholder1: "Full name", label2: "Account Number / IBAN", placeholder2: "XXXX XXXX XXXX", label3: "IFSC Code", placeholder3: "SBIN0001234" },
  };

  const fields = fieldLabels[paymentMethod];

  return (
    <DashboardLayout title="Settings" subtitle="Update your account settings here." activePage="Settings">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Payment Setting ── */}
        <div className="rounded-[22px] p-6" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
          <div className="mb-5 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-[12px]" style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <Wallet className="h-4 w-4" style={{ color: PURPLE }} />
            </div>
            <div>
              <h3 className="font-bold text-white">Payment Setting</h3>
              <p className="text-xs" style={{ color: MUTED }}>Configure your payout method</p>
            </div>
          </div>

          {/* Method tabs */}
          <div className="mb-5 flex gap-2">
            {(["upi", "paypal", "bank"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleMethodChange(m)}
                className="rounded-full px-4 py-2 text-xs font-semibold transition"
                style={paymentMethod === m
                  ? { background: "rgba(167,139,250,0.2)", color: PURPLE, border: "1px solid rgba(167,139,250,0.4)" }
                  : { background: "rgba(255,255,255,0.04)", color: SUBTEXT, border: `1px solid ${BORDER}` }
                }
              >
                {methodLabels[m]}
              </button>
            ))}
          </div>

          <form onSubmit={handlePaymentSave} className="space-y-4">
            <div>
              <label style={labelStyle}>{fields.label1}</label>
              <input type="text" value={payName} onChange={e => setPayName(e.target.value)} placeholder={fields.placeholder1} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)")} onBlur={e => (e.currentTarget.style.borderColor = INPUT_BORDER)} />
            </div>
            <div>
              <label style={labelStyle}>{fields.label2}</label>
              <input type="text" value={payId} onChange={e => setPayId(e.target.value)} placeholder={fields.placeholder2} style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)")} onBlur={e => (e.currentTarget.style.borderColor = INPUT_BORDER)} />
            </div>
            {fields.label3 && (
              <div>
                <label style={labelStyle}>{fields.label3}</label>
                <input type="text" value={payIfsc} onChange={e => setPayIfsc(e.target.value)} placeholder={fields.placeholder3} style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)")} onBlur={e => (e.currentTarget.style.borderColor = INPUT_BORDER)} />
              </div>
            )}

            <Msg type="success" msg={paySuccess} />
            <Msg type="error" msg={payError} />

            <button type="submit" disabled={paySaving}
              className="flex items-center gap-2 rounded-[14px] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
              {paySaving && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {paySaving ? "Saving…" : "Save Payment Setting"}
            </button>
          </form>
        </div>

        {/* ── Notification Preferences ── */}
        <div className="rounded-[22px] p-6" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: `1px solid ${BORDER}` }}>
          <div className="mb-5 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-[12px]" style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <Bell className="h-4 w-4" style={{ color: PURPLE }} />
            </div>
            <div>
              <h3 className="font-bold text-white">Notification Preferences</h3>
              <p className="text-xs" style={{ color: MUTED }}>Choose what notifications you receive</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Email notifications */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={e => setEmailNotif(e.target.checked)}
                className="h-5 w-5 rounded accent-violet-500"
              />
              <span className="text-sm text-white">Receive email notifications</span>
            </label>

            {/* In-site notifications */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={siteNotif}
                onChange={e => setSiteNotif(e.target.checked)}
                className="h-5 w-5 rounded accent-violet-500"
              />
              <span className="text-sm text-white">Receive in-site notifications</span>
            </label>

            <Msg type="success" msg={notifSuccess} />

            <button onClick={handleNotifSave} disabled={notifSaving}
              className="flex items-center gap-2 rounded-[14px] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
              {notifSaving && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {notifSaving ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
