import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard, Users, FolderOpen, Wallet, BarChart3,
  Settings, LogOut, Shield, Bell, MessageCircle, Ticket, Megaphone, Crown, HardDrive,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import logoIcon from "@/assets/logo-icon.png";

const BG      = "#06070d";
const CARD2   = "#0b0c14";
const PURPLE  = "#a78bfa";
const PURPLE_D = "#7c3aed";
const BORDER  = "rgba(255,255,255,0.07)";
const MUTED   = "#64748b";
const SUBTEXT = "#94a3b8";
const TEXT    = "#e2e8f0";
const RED     = "#f87171";

const ADMIN_TOKEN_KEY = "vdr_admin_token";
const ADMIN_USER_KEY = "vdr_admin_user";

const adminTokenStore = {
  getToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
  getAdmin: () => { try { const s = localStorage.getItem(ADMIN_USER_KEY); return s ? JSON.parse(s) : null; } catch { return null; } },
  clear() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },
};

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview",       to: "/admin"               },
  { icon: Users,           label: "Users",          to: "/admin/users"         },
  { icon: FolderOpen,      label: "Files",          to: "/admin/files"         },
  { icon: Wallet,          label: "Payouts",        to: "/admin/payouts"       },
  { icon: Crown,           label: "Subscriptions",  to: "/admin/subscriptions" },
  { icon: Ticket,          label: "Tickets",        to: "/admin/tickets"       },
  { icon: MessageCircle,   label: "Messages",       to: "/admin/messages"      },
  { icon: BarChart3,       label: "Analytics",      to: "/admin/analytics"     },
  { icon: HardDrive,      label: "Storage",        to: "/admin/storage"       },
  { icon: Settings,        label: "Settings",       to: "/admin/settings"      },
] as const;

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  activePage: string;
}

export function AdminLayout({ children, title, subtitle, activePage }: AdminLayoutProps) {
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const token = typeof window !== "undefined" ? adminTokenStore.getToken() : null;
  const admin = typeof window !== "undefined" ? adminTokenStore.getAdmin() : null;

  // Admin guard — show 404 if no token
  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ background: BG, color: TEXT }}>
        <h1 className="text-8xl font-bold" style={{ color: PURPLE }}>404</h1>
        <h2 className="mt-4 text-xl font-semibold text-white">Page Not Found</h2>
        <p className="mt-2 text-sm text-center max-w-sm" style={{ color: MUTED }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${PURPLE_D}, ${PURPLE})` }}
        >
          Go Home
        </a>
      </div>
    );
  }

  const handleLogout = () => {
    adminTokenStore.clear();
    window.location.href = "/main/admin";
  };

  const initials = admin?.name?.charAt(0).toUpperCase() ?? "A";

  return (
    <div className="flex h-screen overflow-hidden font-sans antialiased" style={{ background: BG, color: TEXT }}>
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[230px] shrink-0 flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: CARD2, borderRight: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/admin" className="flex items-center gap-2.5">
            <img src={logoIcon} alt="Vidora" className="h-9 w-9 rounded-xl" />
            <div>
              <span className="text-lg font-extrabold tracking-tight text-white">Vidora</span>
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: RED, border: "1px solid rgba(239,68,68,0.3)" }}>ADMIN</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="grid h-7 w-7 place-items-center rounded-lg lg:hidden"
            style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.label;
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMobileSidebarOpen(false)}
                className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-medium transition-all duration-200"
                style={
                  isActive
                    ? { background: "rgba(167,139,250,0.15)", color: PURPLE, boxShadow: "0 0 16px rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.25)" }
                    : { color: MUTED, border: "1px solid transparent" }
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Creator Dashboard link */}
        <div className="px-3 pb-2">
          <Link
            to="/dashboard"
            className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-90"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: SUBTEXT }}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Creator Panel
          </Link>
        </div>

        {/* Bottom user widget */}
        <div className="m-3 mt-auto rounded-[18px] p-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, #dc2626, ${RED})` }}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{admin?.name ?? ""}</p>
              <p className="truncate text-[10px]" style={{ color: MUTED }}>Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition hover:opacity-90"
            style={{ background: "rgba(239,68,68,0.1)", color: RED, border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 lg:px-6"
          style={{ background: "rgba(6,7,13,0.9)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(16px)" }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] lg:hidden"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.08)`, color: SUBTEXT }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <BroadcastButton />
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "rgba(239,68,68,0.1)", color: RED, border: "1px solid rgba(239,68,68,0.2)" }}>
              <Shield className="h-3.5 w-3.5" /> Admin Mode
            </div>
            <AdminProfileMenu initials={initials} onLogout={handleLogout} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

function BroadcastButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    await adminFetch("/api/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify({ title: title.trim(), message: message.trim() }),
    });
    setSending(false);
    setSent(true);
    setTimeout(() => { setSent(false); setOpen(false); setTitle(""); setMessage(""); }, 2000);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80"
        style={{ background: "rgba(167,139,250,0.1)", color: PURPLE, border: `1px solid rgba(167,139,250,0.25)` }}>
        <Megaphone className="h-3.5 w-3.5" /> Broadcast
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl p-6" style={{ background: "#0b0c14", border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()}>
            {sent ? (
              <div className="text-center py-4">
                <Megaphone className="mx-auto h-10 w-10 mb-3" style={{ color: PURPLE }} />
                <p className="text-sm font-bold text-white">Broadcast Sent!</p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>All active users will see this notification.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Megaphone className="h-5 w-5" style={{ color: PURPLE }} />
                  <h3 className="text-sm font-bold text-white">Broadcast to All Users</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Feature Released!"
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} autoFocus />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold mb-1 block" style={{ color: MUTED }}>Message</label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Announcement message..."
                      className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setOpen(false)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.04)", color: MUTED, border: `1px solid ${BORDER}` }}>Cancel</button>
                  <button onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}
                    className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${PURPLE}, #7c3aed)` }}>
                    {sending ? "Sending..." : "Send to All"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function AdminProfileMenu({ initials, onLogout }: { initials: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white cursor-pointer" style={{ background: "linear-gradient(135deg, #dc2626, #f87171)" }}>
        {initials}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-48 rounded-[14px] py-2" style={{ background: "#0f1120", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            <a href="/admin/profile" className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/5" style={{ color: "#e2e8f0" }}>
              <Settings className="h-4 w-4" style={{ color: PURPLE }} /> Profile
            </a>
            <button onClick={() => { setOpen(false); onLogout(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/5" style={{ color: "#f87171" }}>
              <LogOut className="h-4 w-4" /> Log Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
