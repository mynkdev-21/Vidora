import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { Save, Loader2, CheckCircle, HardDrive, Cloud, Zap, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/admin/storage")({
  component: AdminStorage,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const PURPLE_D = "#7c3aed";
const MUTED = "#64748b";
const SUBTEXT = "#94a3b8";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";

interface StorageData {
  settings: Record<string, string>;
  local_used: number;
  local_files: number;
}

const PROVIDERS = [
  { id: "local", name: "Local Storage", desc: "Files stored on server disk", icon: HardDrive, color: "#a78bfa" },
  { id: "r2", name: "Cloudflare R2", desc: "S3-compatible, no egress fees", icon: Cloud, color: "#f97316" },
  { id: "b2", name: "Backblaze B2", desc: "Cheapest object storage", icon: Cloud, color: "#ef4444" },
  { id: "bunny", name: "BunnyCDN Storage", desc: "Fast CDN + storage, adult allowed", icon: Zap, color: "#f59e0b" },
  { id: "s3", name: "Custom S3", desc: "Any S3-compatible endpoint", icon: Cloud, color: "#60a5fa" },
] as const;

function formatBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(2))} ${s[i]}`;
}

function AdminStorage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [activeProvider, setActiveProvider] = useState("local");
  const [localUsed, setLocalUsed] = useState(0);
  const [localFiles, setLocalFiles] = useState(0);

  // R2
  const [r2AccountId, setR2AccountId] = useState("");
  const [r2AccessKey, setR2AccessKey] = useState("");
  const [r2SecretKey, setR2SecretKey] = useState("");
  const [r2Bucket, setR2Bucket] = useState("");
  const [r2PublicUrl, setR2PublicUrl] = useState("");

  // B2
  const [b2Endpoint, setB2Endpoint] = useState("");
  const [b2Region, setB2Region] = useState("");
  const [b2KeyId, setB2KeyId] = useState("");
  const [b2AppKey, setB2AppKey] = useState("");
  const [b2Bucket, setB2Bucket] = useState("");
  const [b2PublicUrl, setB2PublicUrl] = useState("");

  // Bunny
  const [bunnyZone, setBunnyZone] = useState("");
  const [bunnyApiKey, setBunnyApiKey] = useState("");
  const [bunnyRegion, setBunnyRegion] = useState("");
  const [bunnyCdnUrl, setBunnyCdnUrl] = useState("");

  // Custom S3
  const [s3Endpoint, setS3Endpoint] = useState("");
  const [s3Region, setS3Region] = useState("");
  const [s3AccessKey, setS3AccessKey] = useState("");
  const [s3SecretKey, setS3SecretKey] = useState("");
  const [s3Bucket, setS3Bucket] = useState("");
  const [s3PublicUrl, setS3PublicUrl] = useState("");

  useEffect(() => {
    adminFetch<{ success: boolean; data: StorageData }>("/api/admin/storage")
      .then((res) => {
        const s = res.data.settings;
        setActiveProvider(s.storage_provider || "local");
        setLocalUsed(res.data.local_used);
        setLocalFiles(res.data.local_files);
        // R2
        setR2AccountId(s.storage_r2_account_id || "");
        setR2AccessKey(s.storage_r2_access_key || "");
        setR2SecretKey(s.storage_r2_secret_key || "");
        setR2Bucket(s.storage_r2_bucket || "");
        setR2PublicUrl(s.storage_r2_public_url || "");
        // B2
        setB2Endpoint(s.storage_b2_endpoint || "");
        setB2Region(s.storage_b2_region || "");
        setB2KeyId(s.storage_b2_key_id || "");
        setB2AppKey(s.storage_b2_app_key || "");
        setB2Bucket(s.storage_b2_bucket || "");
        setB2PublicUrl(s.storage_b2_public_url || "");
        // Bunny
        setBunnyZone(s.storage_bunny_zone || "");
        setBunnyApiKey(s.storage_bunny_api_key || "");
        setBunnyRegion(s.storage_bunny_region || "");
        setBunnyCdnUrl(s.storage_bunny_cdn_url || "");
        // S3
        setS3Endpoint(s.storage_s3_endpoint || "");
        setS3Region(s.storage_s3_region || "");
        setS3AccessKey(s.storage_s3_access_key || "");
        setS3SecretKey(s.storage_s3_secret_key || "");
        setS3Bucket(s.storage_s3_bucket || "");
        setS3PublicUrl(s.storage_s3_public_url || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const buildSettings = () => ({
    storage_provider: activeProvider,
    storage_r2_account_id: r2AccountId, storage_r2_access_key: r2AccessKey, storage_r2_secret_key: r2SecretKey, storage_r2_bucket: r2Bucket, storage_r2_public_url: r2PublicUrl,
    storage_b2_endpoint: b2Endpoint, storage_b2_region: b2Region, storage_b2_key_id: b2KeyId, storage_b2_app_key: b2AppKey, storage_b2_bucket: b2Bucket, storage_b2_public_url: b2PublicUrl,
    storage_bunny_zone: bunnyZone, storage_bunny_api_key: bunnyApiKey, storage_bunny_region: bunnyRegion, storage_bunny_cdn_url: bunnyCdnUrl,
    storage_s3_endpoint: s3Endpoint, storage_s3_region: s3Region, storage_s3_access_key: s3AccessKey, storage_s3_secret_key: s3SecretKey, storage_s3_bucket: s3Bucket, storage_s3_public_url: s3PublicUrl,
  });

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      await adminFetch("/api/admin/storage", { method: "PUT", body: JSON.stringify({ settings: buildSettings() }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await adminFetch<{ success: boolean; message: string }>("/api/admin/storage/test", {
        method: "POST",
        body: JSON.stringify({ provider: activeProvider, settings: buildSettings() }),
      });
      setTestResult({ ok: true, msg: res.message });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message || "Connection failed." });
    }
    setTesting(false);
  };

  return (
    <AdminLayout title="Storage" subtitle="Configure where uploaded files are stored" activePage="Storage">
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" /></div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Provider selector */}
          <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <h3 className="text-sm font-bold text-white mb-1">Storage Provider</h3>
            <p className="text-[11px] mb-5" style={{ color: MUTED }}>Select where new uploads will be stored. Existing files stay on their original provider.</p>
            <div className="space-y-2.5">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveProvider(p.id)}
                  className="flex w-full items-center gap-4 rounded-[16px] px-4 py-3.5 text-left transition-all"
                  style={{
                    background: activeProvider === p.id ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.02)",
                    border: activeProvider === p.id ? "1px solid rgba(167,139,250,0.3)" : `1px solid ${BORDER}`,
                    boxShadow: activeProvider === p.id ? "0 0 20px rgba(167,139,250,0.1)" : "none",
                  }}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                    <p.icon className="h-5 w-5" style={{ color: p.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-[11px]" style={{ color: MUTED }}>{p.desc}</p>
                  </div>
                  <div className="shrink-0">
                    {activeProvider === p.id ? (
                      <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: "rgba(94,234,212,0.1)", color: GREEN, border: "1px solid rgba(94,234,212,0.3)" }}>
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <div className="h-5 w-5 rounded-full" style={{ border: `2px solid ${BORDER}` }} />
                    )}
                  </div>
                  {p.id === "local" && (
                    <span className="text-[10px] font-mono shrink-0" style={{ color: SUBTEXT }}>{formatBytes(localUsed)} · {localFiles} files</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Provider config */}
          {activeProvider === "r2" && (
            <ConfigSection title="Cloudflare R2" color="#f97316">
              <Input label="Account ID" value={r2AccountId} onChange={setR2AccountId} placeholder="your-account-id" />
              <Input label="Access Key ID" value={r2AccessKey} onChange={setR2AccessKey} placeholder="R2 access key" />
              <Input label="Secret Access Key" value={r2SecretKey} onChange={setR2SecretKey} placeholder="R2 secret key" type="password" />
              <Input label="Bucket Name" value={r2Bucket} onChange={setR2Bucket} placeholder="vidora-files" />
              <Input label="Public URL (optional)" value={r2PublicUrl} onChange={setR2PublicUrl} placeholder="https://files.yourdomain.com" />
            </ConfigSection>
          )}

          {activeProvider === "b2" && (
            <ConfigSection title="Backblaze B2" color="#ef4444">
              <Input label="S3 Endpoint" value={b2Endpoint} onChange={setB2Endpoint} placeholder="https://s3.us-west-004.backblazeb2.com" />
              <Input label="Region" value={b2Region} onChange={setB2Region} placeholder="us-west-004" />
              <Input label="Application Key ID" value={b2KeyId} onChange={setB2KeyId} placeholder="key-id" />
              <Input label="Application Key" value={b2AppKey} onChange={setB2AppKey} placeholder="app-key" type="password" />
              <Input label="Bucket Name" value={b2Bucket} onChange={setB2Bucket} placeholder="vidora-files" />
              <Input label="Public URL (optional)" value={b2PublicUrl} onChange={setB2PublicUrl} placeholder="https://f004.backblazeb2.com/file/bucket" />
            </ConfigSection>
          )}

          {activeProvider === "bunny" && (
            <ConfigSection title="BunnyCDN Storage" color="#f59e0b">
              <Input label="Storage Zone Name" value={bunnyZone} onChange={setBunnyZone} placeholder="vidora-storage" />
              <Input label="Storage API Key" value={bunnyApiKey} onChange={setBunnyApiKey} placeholder="storage-api-key" type="password" />
              <Input label="Region (empty = default)" value={bunnyRegion} onChange={setBunnyRegion} placeholder="ny, la, sg, etc." />
              <Input label="CDN Pull Zone URL" value={bunnyCdnUrl} onChange={setBunnyCdnUrl} placeholder="https://vidora.b-cdn.net" />
            </ConfigSection>
          )}

          {activeProvider === "s3" && (
            <ConfigSection title="Custom S3-Compatible" color="#60a5fa">
              <Input label="Endpoint URL" value={s3Endpoint} onChange={setS3Endpoint} placeholder="https://s3.amazonaws.com" />
              <Input label="Region" value={s3Region} onChange={setS3Region} placeholder="us-east-1" />
              <Input label="Access Key ID" value={s3AccessKey} onChange={setS3AccessKey} placeholder="access-key" />
              <Input label="Secret Access Key" value={s3SecretKey} onChange={setS3SecretKey} placeholder="secret-key" type="password" />
              <Input label="Bucket Name" value={s3Bucket} onChange={setS3Bucket} placeholder="vidora-files" />
              <Input label="Public URL (optional)" value={s3PublicUrl} onChange={setS3PublicUrl} placeholder="https://cdn.yourdomain.com" />
            </ConfigSection>
          )}

          {/* Test + Save */}
          {testResult && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold"
              style={{ background: testResult.ok ? "rgba(94,234,212,0.08)" : "rgba(248,113,113,0.08)", border: testResult.ok ? "1px solid rgba(94,234,212,0.25)" : "1px solid rgba(248,113,113,0.25)", color: testResult.ok ? GREEN : "#f87171" }}>
              {testResult.ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {testResult.msg}
            </div>
          )}

          <div className="flex items-center gap-3">
            {activeProvider !== "local" && (
              <button onClick={handleTest} disabled={testing}
                className="flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, color: SUBTEXT }}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {testing ? "Testing..." : "Test Connection"}
              </button>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})`, boxShadow: "0 0 20px rgba(167,139,250,0.25)" }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save & Activate"}
            </button>
            {saved && <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: GREEN }}><CheckCircle className="h-4 w-4" /> Saved!</span>}
          </div>

          {/* Info */}
          <div className="rounded-xl p-4" style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: PURPLE }}>How it works</p>
            <ul className="text-[11px] space-y-1" style={{ color: SUBTEXT }}>
              <li>• Only one provider can be active at a time</li>
              <li>• Switching provider only affects new uploads — existing files stay accessible</li>
              <li>• Files are served through your backend API (same URL for app/web)</li>
              <li>• Use "Test Connection" to verify credentials before activating</li>
            </ul>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function ConfigSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Cloud className="h-4 w-4" style={{ color }} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title} Configuration</h3>
          <p className="text-[11px]" style={{ color: MUTED }}>Enter your credentials below</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl px-4 py-2.5 text-sm font-mono outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
    </div>
  );
}
