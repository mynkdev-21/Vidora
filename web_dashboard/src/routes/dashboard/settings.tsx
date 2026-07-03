import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { User, Lock, CheckCircle, AlertCircle, Eye, EyeOff, Camera } from "lucide-react";
import { apiFetch, BASE_URL } from "@/lib/api";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Vidora" }] }),
  component: SettingsPage,
});

const PURPLE = "#a78bfa"; const PURPLE_D = "#7c3aed"; const MUTED = "#64748b";
const SUBTEXT = "#94a3b8"; const BORDER = "rgba(255,255,255,0.07)";
const INPUT_BG = "rgba(255,255,255,0.05)"; const INPUT_BORDER = "rgba(255,255,255,0.08)";

interface ProfileData { id: string; name: string; email: string; avatar_url?: string; role: string; }
interface ProfileResponse { data: { user: ProfileData }; }

const inputStyle: React.CSSProperties = {
  background:INPUT_BG, border:`1px solid ${INPUT_BORDER}`, color:"#e2e8f0",
  borderRadius:14, padding:"12px 16px", width:"100%", fontSize:14, outline:"none", transition:"border-color 0.2s",
};
const labelStyle: React.CSSProperties = { display:"block", marginBottom:6, fontSize:13, fontWeight:500, color:"#e2e8f0" };

function Msg({ type, msg }: { type:"success"|"error"; msg:string }) {
  if (!msg) return null;
  const ok = type==="success";
  return (
    <div className="flex items-start gap-2.5 rounded-[12px] px-4 py-3 text-sm"
      style={{ background:ok?"rgba(52,211,153,0.1)":"rgba(239,68,68,0.1)", border:ok?"1px solid rgba(52,211,153,0.25)":"1px solid rgba(239,68,68,0.25)", color:ok?"#34d399":"#f87171" }}>
      {ok ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      {msg}
    </div>
  );
}

function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData|null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [name, setName] = useState(""); const [avatarUrl, setAvatarUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(""); const [profileError, setProfileError] = useState("");
  const [currentPw, setCurrentPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false); const [showNew, setShowNew] = useState(false); const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(""); const [pwError, setPwError] = useState("");

  useEffect(() => {
    apiFetch<ProfileResponse>("/api/users/profile")
      .then(res => { const u=res.data.user; setProfile(u); setName(u.name??""); setAvatarUrl(u.avatar_url??""); })
      .catch((e: unknown) => setFetchError(e instanceof Error ? e.message : "Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault(); setProfileError(""); setProfileSuccess(""); setProfileSaving(true);
    try {
      await apiFetch("/api/users/profile", { method:"PATCH", body:JSON.stringify({ name:name.trim()||undefined, avatar_url:avatarUrl.trim()||undefined }) });
      setProfileSuccess("Profile updated successfully.");
      if (profile) setProfile({ ...profile, name:name.trim(), avatar_url:avatarUrl.trim() });
    } catch (e: unknown) { setProfileError(e instanceof Error ? e.message : "Failed to update profile."); }
    finally { setProfileSaving(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setPwError(""); setPwSuccess("");
    if (newPw !== confirmPw) { setPwError("New passwords do not match."); return; }
    if (newPw.length < 6)   { setPwError("New password must be at least 6 characters."); return; }
    setPwSaving(true);
    try {
      await apiFetch("/api/users/change-password", { method:"PATCH", body:JSON.stringify({ currentPassword:currentPw, newPassword:newPw }) });
      setPwSuccess("Password changed successfully."); setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e: unknown) { setPwError(e instanceof Error ? e.message : "Failed to change password."); }
    finally { setPwSaving(false); }
  };

  return (
    <DashboardLayout title="Profile" subtitle="Manage your account details and security." activePage="Profile">
      {fetchError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm" style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171" }}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{fetchError}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile */}
          <div className="rounded-[22px] p-6" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-[12px]" style={{ background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.2)" }}>
                <User className="h-4 w-4" style={{ color:PURPLE }} />
              </div>
              <div><h3 className="font-bold text-white">Profile</h3><p className="text-xs" style={{ color:MUTED }}>Update your display name and avatar</p></div>
            </div>
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label style={labelStyle}>Display Name</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inputStyle}
                  onFocus={e=>(e.currentTarget.style.borderColor="rgba(167,139,250,0.5)")} onBlur={e=>(e.currentTarget.style.borderColor=INPUT_BORDER)} />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input type="email" value={profile?.email??""} readOnly style={{ ...inputStyle, opacity:0.6, cursor:"not-allowed" }} />
                <p className="mt-1.5 text-xs" style={{ color:MUTED }}>Email cannot be changed. Contact support if needed.</p>
              </div>
              <div>
                <label style={labelStyle}>Profile Picture</label>
                <AvatarUpload currentUrl={avatarUrl} onUploaded={(url) => {
                  setAvatarUrl(url);
                  if (profile) setProfile({...profile, avatar_url: url});
                  // Update localStorage so navbar shows new avatar immediately
                  const stored = localStorage.getItem("vdr_user");
                  if (stored) {
                    try {
                      const u = JSON.parse(stored);
                      u.avatar_url = url;
                      localStorage.setItem("vdr_user", JSON.stringify(u));
                    } catch {}
                  }
                }} />
              </div>
              <Msg type="success" msg={profileSuccess} />
              <Msg type="error" msg={profileError} />
              <button type="submit" disabled={profileSaving} className="flex items-center gap-2 rounded-[14px] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
                {profileSaving && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {profileSaving ? "Saving…" : "Save Profile"}
              </button>
            </form>
          </div>

          {/* Password */}
          <div className="rounded-[22px] p-6" style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-[12px]" style={{ background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.2)" }}>
                <Lock className="h-4 w-4" style={{ color:PURPLE }} />
              </div>
              <div><h3 className="font-bold text-white">Change Password</h3><p className="text-xs" style={{ color:MUTED }}>Keep your account secure</p></div>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {[
                { label:"Current Password", val:currentPw, set:setCurrentPw, show:showCurrent, toggle:()=>setShowCurrent(!showCurrent), ac:"current-password" },
                { label:"New Password",     val:newPw,     set:setNewPw,     show:showNew,     toggle:()=>setShowNew(!showNew),         ac:"new-password" },
                { label:"Confirm New Password", val:confirmPw, set:setConfirmPw, show:showConfirm, toggle:()=>setShowConfirm(!showConfirm), ac:"new-password" },
              ].map(f => (
                <div key={f.label}>
                  <label style={labelStyle}>{f.label}</label>
                  <div className="relative">
                    <input type={f.show?"text":"password"} required value={f.val} onChange={e=>f.set(e.target.value)} autoComplete={f.ac}
                      placeholder="••••••••" style={{ ...inputStyle, paddingRight:44 }}
                      onFocus={e=>(e.currentTarget.style.borderColor="rgba(167,139,250,0.5)")} onBlur={e=>(e.currentTarget.style.borderColor=INPUT_BORDER)} />
                    <button type="button" onClick={f.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 transition hover:text-white" style={{ color:MUTED }}>
                      {f.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {f.label==="Confirm New Password" && confirmPw && (
                    <p className="mt-1.5 text-xs" style={{ color:newPw===confirmPw?"#34d399":"#f87171" }}>
                      {newPw===confirmPw ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>
              ))}
              <Msg type="success" msg={pwSuccess} />
              <Msg type="error" msg={pwError} />
              <button type="submit" disabled={pwSaving} className="flex items-center gap-2 rounded-[14px] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
                {pwSaving && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {pwSaving ? "Changing…" : "Change Password"}
              </button>
            </form>
          </div>

          {/* Account info */}
          <div className="rounded-[18px] p-4" style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${BORDER}` }}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color:MUTED }}>Account Info</p>
            <div className="space-y-2 text-xs" style={{ color:SUBTEXT }}>
              <div className="flex items-center justify-between">
                <span>User ID</span>
                <span className="font-mono" style={{ color:"#e2e8f0" }}>{profile?.id??"—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Role</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize" style={{ background:"rgba(167,139,250,0.1)", color:PURPLE }}>{profile?.role??"user"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function AvatarUpload({ currentUrl, onUploaded }: { currentUrl: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("vdr_access_token") || "";
      const apiKey = import.meta.env.VITE_API_KEY || "vdr_live_f9a2c84e1b3d7056ae4f8c2190d3b5e7";
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";

      const res = await fetch(`${baseUrl}/api/users/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-API-Key": apiKey,
        },
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.avatar_url) {
        onUploaded(json.data.avatar_url);
      }
    } catch {}
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const fullUrl = currentUrl ? (currentUrl.startsWith("http") ? currentUrl : `${BASE_URL}${currentUrl}`) : "";

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {fullUrl ? (
          <img src={fullUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" style={{ border: "2px solid rgba(167,139,250,0.3)" }} />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: "rgba(167,139,250,0.15)", border: "2px solid rgba(167,139,250,0.3)" }}>
            <User className="h-7 w-7" style={{ color: "#a78bfa" }} />
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full transition hover:opacity-80"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)", border: "2px solid #0b0c14" }}
        >
          <Camera className="h-3.5 w-3.5 text-white" />
        </button>
      </div>
      <div>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="text-xs font-semibold transition hover:opacity-80" style={{ color: "#a78bfa" }}>
          {uploading ? "Uploading..." : "Change Photo"}
        </button>
        <p className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>JPG, PNG — max 5MB</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
