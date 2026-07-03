import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Save, Globe, Loader2, CheckCircle, Copy } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const PURPLE_D = "#7c3aed";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";

function AdminSettings() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [termsUrl, setTermsUrl] = useState("");
  const [helpUrl, setHelpUrl] = useState("");
  const [forgotPasswordUrl, setForgotPasswordUrl] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [communityUrl, setCommunityUrl] = useState("");
  const [channelUrl, setChannelUrl] = useState("");
  const [earningRate, setEarningRate] = useState("5");
  const [minPayout, setMinPayout] = useState("5");
  const [referralBonus, setReferralBonus] = useState("5");
  const [adsEnabled, setAdsEnabled] = useState("true");
  const [admobAppId, setAdmobAppId] = useState("");
  const [admobBannerId, setAdmobBannerId] = useState("");
  const [admobRewardedId, setAdmobRewardedId] = useState("");
  const [admobInterstitialId, setAdmobInterstitialId] = useState("");
  const [appAdsTxt, setAppAdsTxt] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [systemInfo, setSystemInfo] = useState<{ android: any; web: any; backend: any } | null>(null);

  useEffect(() => {
    Promise.all([
      adminFetch<{ success: boolean; data: { settings: { id: string; value: string }[] } }>("/api/admin/settings"),
      adminFetch<{ success: boolean; data: { android: any; web: any; backend: any } }>("/api/admin/system-info"),
    ])
      .then(([res, sysRes]) => {
        res.data.settings.forEach((s) => {
          if (s.id === "website_url") setWebsiteUrl(s.value);
          if (s.id === "youtube_url") setYoutubeUrl(s.value);
          if (s.id === "telegram_url") setTelegramUrl(s.value);
          if (s.id === "instagram_url") setInstagramUrl(s.value);
          if (s.id === "privacy_url") setPrivacyUrl(s.value);
          if (s.id === "terms_url") setTermsUrl(s.value);
          if (s.id === "help_url") setHelpUrl(s.value);
          if (s.id === "forgot_password_url") setForgotPasswordUrl(s.value);
          if (s.id === "dashboard_url") setDashboardUrl(s.value);
          if (s.id === "support_email") setSupportEmail(s.value);
          if (s.id === "community_url") setCommunityUrl(s.value);
          if (s.id === "telegram_channel_url") setChannelUrl(s.value);
          if (s.id === "earning_rate") setEarningRate(s.value);
          if (s.id === "min_payout") setMinPayout(s.value);
          if (s.id === "referral_bonus") setReferralBonus(s.value);
          if (s.id === "ads_enabled") setAdsEnabled(s.value);
          if (s.id === "admob_app_id") setAdmobAppId(s.value);
          if (s.id === "admob_banner_id") setAdmobBannerId(s.value);
          if (s.id === "admob_rewarded_id") setAdmobRewardedId(s.value);
          if (s.id === "admob_interstitial_id") setAdmobInterstitialId(s.value);
          if (s.id === "app_ads_txt") setAppAdsTxt(s.value);
          if (s.id === "smtp_host") setSmtpHost(s.value);
          if (s.id === "smtp_port") setSmtpPort(s.value);
          if (s.id === "smtp_user") setSmtpUser(s.value);
          if (s.id === "smtp_pass") setSmtpPass(s.value);
          if (s.id === "smtp_from") setSmtpFrom(s.value);
        });
        setSystemInfo(sysRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await adminFetch("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({
        settings: {
          website_url: websiteUrl,
          youtube_url: youtubeUrl,
          telegram_url: telegramUrl,
          instagram_url: instagramUrl,
          privacy_url: privacyUrl,
          terms_url: termsUrl,
          help_url: helpUrl,
          forgot_password_url: forgotPasswordUrl,
          dashboard_url: dashboardUrl,
          support_email: supportEmail,
          community_url: communityUrl,
          telegram_channel_url: channelUrl,
          earning_rate: earningRate,
          min_payout: minPayout,
          referral_bonus: referralBonus,
          ads_enabled: adsEnabled,
          admob_app_id: admobAppId,
          admob_banner_id: admobBannerId,
          admob_rewarded_id: admobRewardedId,
          admob_interstitial_id: admobInterstitialId,
          app_ads_txt: appAdsTxt,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
          smtp_from: smtpFrom,
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AdminLayout title="Settings" subtitle="App configuration — changes reflect in the Android app" activePage="Settings">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <LinksCard
              websiteUrl={websiteUrl} setWebsiteUrl={setWebsiteUrl}
              youtubeUrl={youtubeUrl} setYoutubeUrl={setYoutubeUrl}
              telegramUrl={telegramUrl} setTelegramUrl={setTelegramUrl}
              instagramUrl={instagramUrl} setInstagramUrl={setInstagramUrl}
              privacyUrl={privacyUrl} setPrivacyUrl={setPrivacyUrl}
              termsUrl={termsUrl} setTermsUrl={setTermsUrl}
              helpUrl={helpUrl} setHelpUrl={setHelpUrl}
              forgotPasswordUrl={forgotPasswordUrl} setForgotPasswordUrl={setForgotPasswordUrl}
              dashboardUrl={dashboardUrl} setDashboardUrl={setDashboardUrl}
              supportEmail={supportEmail} setSupportEmail={setSupportEmail}
              communityUrl={communityUrl} setCommunityUrl={setCommunityUrl}
              channelUrl={channelUrl} setChannelUrl={setChannelUrl}
            />
            <PayoutCard
              earningRate={earningRate} setEarningRate={setEarningRate}
              minPayout={minPayout} setMinPayout={setMinPayout}
              referralBonus={referralBonus} setReferralBonus={setReferralBonus}
            />
            <AdsCard
              adsEnabled={adsEnabled} setAdsEnabled={setAdsEnabled}
              admobAppId={admobAppId} setAdmobAppId={setAdmobAppId}
              admobBannerId={admobBannerId} setAdmobBannerId={setAdmobBannerId}
              admobRewardedId={admobRewardedId} setAdmobRewardedId={setAdmobRewardedId}
              admobInterstitialId={admobInterstitialId} setAdmobInterstitialId={setAdmobInterstitialId}
              appAdsTxt={appAdsTxt} setAppAdsTxt={setAppAdsTxt}
            />
            <SmtpCard
              smtpHost={smtpHost} setSmtpHost={setSmtpHost}
              smtpPort={smtpPort} setSmtpPort={setSmtpPort}
              smtpUser={smtpUser} setSmtpUser={setSmtpUser}
              smtpPass={smtpPass} setSmtpPass={setSmtpPass}
              smtpFrom={smtpFrom} setSmtpFrom={setSmtpFrom}
            />
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})`, boxShadow: "0 0 20px rgba(167,139,250,0.25)" }}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save All Changes"}
              </button>
              {saved && <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: GREEN }}><CheckCircle className="h-4 w-4" /> Saved!</span>}
            </div>
          </div>
          <div className="space-y-4">
            <ConfigCard title="Android App" items={[
              { label: "Base URL", value: systemInfo?.android?.base_url || "—" },
              { label: "API Key", value: systemInfo?.android?.api_key || "—" },
              { label: "AdMob App ID", value: admobAppId || "—" },
              { label: "Package", value: systemInfo?.android?.package_name || "—" },
            ]} />
            <ConfigCard title="Web Frontend" items={[
              { label: "URL", value: systemInfo?.web?.url || "—" },
              { label: "API URL", value: systemInfo?.web?.api_url || "—" },
              { label: "Framework", value: systemInfo?.web?.framework || "—" },
            ]} />
            <ConfigCard title="Backend API" items={[
              { label: "URL", value: systemInfo?.backend?.url || "—" },
              { label: "Database", value: systemInfo?.backend?.database || "—" },
              { label: "Port", value: systemInfo?.backend?.port || "—" },
            ]} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function LinksCard({ websiteUrl, setWebsiteUrl, youtubeUrl, setYoutubeUrl, telegramUrl, setTelegramUrl, instagramUrl, setInstagramUrl, privacyUrl, setPrivacyUrl, termsUrl, setTermsUrl, helpUrl, setHelpUrl, forgotPasswordUrl, setForgotPasswordUrl, dashboardUrl, setDashboardUrl, supportEmail, setSupportEmail, communityUrl, setCommunityUrl, channelUrl, setChannelUrl }: any) {
  return (
    <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}>
          <Globe className="h-5 w-5" style={{ color: PURPLE }} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">App Links</h3>
          <p className="text-[11px]" style={{ color: MUTED }}>URLs used in the Android app</p>
        </div>
      </div>
      <div className="space-y-3">
        <SettingInput label="Website" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://vidora.app" />
        <SettingInput label="YouTube" value={youtubeUrl} onChange={setYoutubeUrl} placeholder="https://youtube.com/@vidora" />
        <SettingInput label="Telegram" value={telegramUrl} onChange={setTelegramUrl} placeholder="https://t.me/vidorasupport" />
        <SettingInput label="Instagram" value={instagramUrl} onChange={setInstagramUrl} placeholder="https://instagram.com/vidora.app" />
        <SettingInput label="Privacy Policy URL" value={privacyUrl} onChange={setPrivacyUrl} placeholder="https://vidora.app/privacy" />
        <SettingInput label="Terms & Conditions URL" value={termsUrl} onChange={setTermsUrl} placeholder="https://vidora.app/terms" />
        <SettingInput label="Forgot Password URL" value={forgotPasswordUrl} onChange={setForgotPasswordUrl} placeholder="https://vidora.app/forgot-password" />
        <SettingInput label="Help & Support" value={helpUrl} onChange={setHelpUrl} placeholder="https://vidora.app/help" />
        <SettingInput label="Dashboard" value={dashboardUrl} onChange={setDashboardUrl} placeholder="https://vidora.app/dashboard" />
        <SettingInput label="Support Email" value={supportEmail} onChange={setSupportEmail} placeholder="support@vidora.app" />
        <SettingInput label="Community URL" value={communityUrl} onChange={setCommunityUrl} placeholder="https://t.me/vidoracommunity" />
        <SettingInput label="Channel URL (Join)" value={channelUrl} onChange={setChannelUrl} placeholder="https://t.me/vidora_official" />
      </div>
    </div>
  );
}

function PayoutCard({ earningRate, setEarningRate, minPayout, setMinPayout, referralBonus, setReferralBonus }: any) {
  return (
    <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Payout & Earnings</h3>
          <p className="text-[11px]" style={{ color: MUTED }}>Configure rates and limits</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Earning Rate ($ per 1000 views)</label>
          <input type="number" step="0.5" min="0" value={earningRate} onChange={(e: any) => setEarningRate(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Minimum Payout ($)</label>
          <input type="number" step="1" min="1" value={minPayout} onChange={(e: any) => setMinPayout(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Referral Bonus (%)</label>
          <input type="number" step="1" min="0" max="100" value={referralBonus} onChange={(e: any) => setReferralBonus(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
      </div>
    </div>
  );
}

function SettingInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>{label}</label>
      <input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
    </div>
  );
}

function ConfigCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const handleCopy = (value: string, idx: number) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };
  return (
    <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: PURPLE }}>{title}</h4>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold" style={{ color: MUTED }}>{item.label}</p>
              <p className="text-xs font-mono truncate" style={{ color: TEXT }}>{item.value}</p>
            </div>
            <button onClick={() => handleCopy(item.value, i)} className="shrink-0 p-1.5 rounded-lg transition hover:bg-white/5" style={{ color: copiedIdx === i ? GREEN : MUTED }}>
              {copiedIdx === i ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdsCard({ adsEnabled, setAdsEnabled, admobAppId, setAdmobAppId, admobBannerId, setAdmobBannerId, admobRewardedId, setAdmobRewardedId, admobInterstitialId, setAdmobInterstitialId, appAdsTxt, setAppAdsTxt }: any) {
  return (
    <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Ads Configuration</h3>
            <p className="text-[11px]" style={{ color: MUTED }}>AdMob settings for the Android app</p>
          </div>
        </div>
        <button onClick={() => setAdsEnabled(adsEnabled === "true" ? "false" : "true")}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{ background: adsEnabled === "true" ? "#7c3aed" : "rgba(255,255,255,0.1)" }}>
          <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
            style={{ transform: adsEnabled === "true" ? "translateX(20px)" : "translateX(0)" }} />
        </button>
      </div>
      <div className="space-y-3" style={{ opacity: adsEnabled === "true" ? 1 : 0.4 }}>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>AdMob App ID</label>
          <input value={admobAppId} onChange={(e: any) => setAdmobAppId(e.target.value)} placeholder="ca-app-pub-xxxxx~xxxxx"
            className="w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Banner Ad ID</label>
          <input value={admobBannerId} onChange={(e: any) => setAdmobBannerId(e.target.value)} placeholder="ca-app-pub-xxxxx/xxxxx"
            className="w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Rewarded Ad ID</label>
          <input value={admobRewardedId} onChange={(e: any) => setAdmobRewardedId(e.target.value)} placeholder="ca-app-pub-xxxxx/xxxxx"
            className="w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Interstitial Ad ID</label>
          <input value={admobInterstitialId} onChange={(e: any) => setAdmobInterstitialId(e.target.value)} placeholder="ca-app-pub-xxxxx/xxxxx"
            className="w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>app-ads.txt Content</label>
          <textarea value={appAdsTxt} onChange={(e: any) => setAppAdsTxt(e.target.value)} rows={3}
            placeholder="google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0"
            className="w-full rounded-xl px-4 py-2.5 text-xs font-mono outline-none resize-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          <p className="mt-1 text-[10px]" style={{ color: MUTED }}>Served at yourdomain.com/app-ads.txt — paste content from AdMob</p>
        </div>
      </div>
    </div>
  );
}

function SmtpCard({ smtpHost, setSmtpHost, smtpPort, setSmtpPort, smtpUser, setSmtpUser, smtpPass, setSmtpPass, smtpFrom, setSmtpFrom }: any) {
  return (
    <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "rgba(96,165,250,0.15)", border: "1px solid rgba(96,165,250,0.3)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">SMTP / Email</h3>
          <p className="text-[11px]" style={{ color: MUTED }}>For password reset emails</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>SMTP Host</label>
            <input value={smtpHost} onChange={(e: any) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com"
              className="w-full rounded-xl px-4 py-2.5 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
          <div>
            <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Port</label>
            <input value={smtpPort} onChange={(e: any) => setSmtpPort(e.target.value)} placeholder="587"
              className="w-full rounded-xl px-4 py-2.5 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Username / Email</label>
          <input value={smtpUser} onChange={(e: any) => setSmtpUser(e.target.value)} placeholder="noreply@vidora.app"
            className="w-full rounded-xl px-4 py-2.5 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Password / App Password</label>
          <input type="password" value={smtpPass} onChange={(e: any) => setSmtpPass(e.target.value)} placeholder="••••••••"
            className="w-full rounded-xl px-4 py-2.5 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
        <div>
          <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>From Name</label>
          <input value={smtpFrom} onChange={(e: any) => setSmtpFrom(e.target.value)} placeholder="Vidora <noreply@vidora.app>"
            className="w-full rounded-xl px-4 py-2.5 text-xs outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
      </div>
    </div>
  );
}
