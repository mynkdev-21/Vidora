import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { User, Mail, Lock, Save, Loader2, CheckCircle, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "Vidora — Admin Profile" }] }),
  component: AdminProfile,
});

const CARD = "#0b0c14";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#a78bfa";
const PURPLE_D = "#7c3aed";
const MUTED = "#64748b";
const TEXT = "#e2e8f0";
const GREEN = "#5eead4";
const RED = "#f87171";

function AdminProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  useEffect(() => {
    adminFetch<any>("/api/admin/auth/me")
      .then(res => {
        if (res.data?.admin) {
          setName(res.data.admin.name || "");
          setEmail(res.data.admin.email || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setMessage("");
    if (newPassword && newPassword !== confirmPassword) {
      setMessage("Passwords don't match."); setMessageType("error"); return;
    }
    if (newPassword && !currentPassword) {
      setMessage("Current password required to set new password."); setMessageType("error"); return;
    }

    setSaving(true);
    try {
      const body: any = { email };
      if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }
      await adminFetch("/api/admin/auth/update", { method: "PATCH", body: JSON.stringify(body) });
      setMessage("Profile updated successfully!"); setMessageType("success");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setMessage(err.message || "Update failed."); setMessageType("error");
    }
    setSaving(false);
  };

  return (
    <AdminLayout title="Profile" subtitle="Manage your admin account" activePage="">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
        </div>
      ) : (
        <div className="max-w-lg mx-auto space-y-6">
          {/* Avatar + Info */}
          <div className="rounded-2xl p-6 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="grid h-20 w-20 mx-auto place-items-center rounded-full text-2xl font-bold text-white mb-4" style={{ background: "linear-gradient(135deg, #dc2626, #f87171)" }}>
              {name.charAt(0).toUpperCase() || "A"}
            </div>
            <h2 className="text-lg font-bold text-white">{name}</h2>
            <p className="text-sm" style={{ color: MUTED }}>{email}</p>
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[10px] font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: RED, border: "1px solid rgba(239,68,68,0.2)" }}>
              <Shield className="h-3 w-3" /> Administrator
            </div>
          </div>

          {/* Email */}
          <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2.5 mb-4">
              <Mail className="h-4 w-4" style={{ color: PURPLE }} />
              <h3 className="text-sm font-bold text-white">Email Address</h3>
            </div>
            <input value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>

          {/* Password */}
          <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2.5 mb-4">
              <Lock className="h-4 w-4" style={{ color: PURPLE }} />
              <h3 className="text-sm font-bold text-white">Change Password</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{
              background: messageType === "success" ? "rgba(94,234,212,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${messageType === "success" ? "rgba(94,234,212,0.2)" : "rgba(239,68,68,0.2)"}`,
              color: messageType === "success" ? GREEN : RED,
            }}>
              {messageType === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : null}
              {message}
            </div>
          )}

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})`, boxShadow: "0 0 20px rgba(167,139,250,0.25)" }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
