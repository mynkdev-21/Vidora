import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  LayoutDashboard, FolderOpen, Upload, Wallet, TrendingUp,
  Users, LifeBuoy, Settings, Bell, Search, LogOut, Key, Send,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { tokenStore, apiFetch } from "@/lib/api";
import logoIcon from "@/assets/logo-icon.png";

const BG      = "#06070d";
const CARD2   = "#0b0c14";
const PURPLE  = "#a78bfa";
const PURPLE_D = "#7c3aed";
const BORDER  = "rgba(255,255,255,0.07)";
const MUTED   = "#64748b";
const SUBTEXT = "#94a3b8";
const TEXT    = "#e2e8f0";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard",  to: "/dashboard"                },
  { icon: FolderOpen,      label: "My Files",   to: "/dashboard/files"          },
  { icon: Upload,          label: "Upload",     to: "/dashboard/upload"         },
  { icon: Wallet,          label: "Withdraw",   to: "/dashboard/withdraw"       },
  { icon: TrendingUp,      label: "Earnings",   to: "/dashboard/earnings"       },
  { icon: Users,           label: "Referrals",  to: "/dashboard/referrals"      },
  { icon: Key,             label: "API Key",    to: "/dashboard/api-key"        },
  { icon: LifeBuoy,        label: "Support",    to: "/dashboard/support"        },
  { icon: Settings,        label: "Settings",   to: "/dashboard/settings-page"  },
] as const;

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  activePage: string;
}

export function DashboardLayout({ children, title, subtitle, activePage }: DashboardLayoutProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);

  // Client-side auth guard — check localStorage directly (no useEffect needed)
  // tokenStore.getUser() reads localStorage synchronously
  const hasToken = typeof window !== "undefined" ? !!tokenStore.getAccess() : true; // SSR assumes logged in

  if (!isAuthenticated && !hasToken) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const initials = user?.name?.charAt(0).toUpperCase() ?? "C";

  // Handle external links — open in system browser via backend redirect
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href") || "";
      if (href.startsWith("http") && !href.includes("192.168.") && !href.includes("localhost") && !href.includes("vidora.app")) {
        e.preventDefault();
        e.stopPropagation();
        // Use backend to open URL (works in all contexts)
        fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/open-url?url=${encodeURIComponent(href)}`).catch(() => {});
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

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
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoIcon} alt="Vidora" className="h-9 w-9 rounded-xl" />
            <span className="text-lg font-extrabold tracking-tight text-white">Vidora</span>
          </Link>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="grid h-7 w-7 place-items-center rounded-lg lg:hidden"
            style={{ background: "rgba(255,255,255,0.05)", color: MUTED }}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
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

        {/* Telegram CTA */}
        <div className="px-3 pb-2">
          <a
            href="https://t.me/vidorabot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition-all duration-200 hover:opacity-90"
            style={{
              background: "linear-gradient(135deg,#0088cc22,#0088cc44)",
              border: "1px solid rgba(0,136,204,0.35)",
              color: "#60a5fa",
            }}
          >
            <Send className="h-4 w-4 shrink-0" />
            Telegram Bot
          </a>
        </div>

        {/* Follow Us card */}
        <div className="m-3 mt-auto rounded-[18px] p-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
              <Send className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="text-xs font-bold text-white">Follow Us</p>
          </div>
          <p className="text-[10px] mb-3" style={{ color: MUTED }}>Join our Telegram channel for latest updates and announcements.</p>
          <TelegramChannelButton />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        {/* Topbar */}
        <header
          className="relative z-30 flex shrink-0 items-center justify-between gap-4 px-4 py-3 lg:px-6"
          style={{ background: "rgba(6,7,13,0.9)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(16px)" }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] lg:hidden"
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.08)`, color: SUBTEXT }}
            aria-label="Open menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div className="flex flex-1 max-w-sm items-center gap-2.5 rounded-[14px] px-4 py-2.5" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.08)` }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: MUTED }} />
            <input
              placeholder="Search files, earnings…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600"
              style={{ color: TEXT }}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/dashboard/upload"
              className="hidden items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 sm:flex"
              style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow: "0 0 20px rgba(167,139,250,0.35)" }}
            >
              <Upload className="h-4 w-4" /> Upload File
            </Link>

            <NotificationBell />

            <div className="relative">
              <button onClick={() => setProfileDropdown(!profileDropdown)} className="flex items-center gap-2 cursor-pointer">
                {user?.avatar_url ? (
                  <img src={user.avatar_url.startsWith("http") ? user.avatar_url : `${import.meta.env.VITE_API_URL || "http://localhost:5001"}${user.avatar_url}`} alt="" className="h-9 w-9 rounded-full object-cover" style={{ border: `2px solid rgba(167,139,250,0.4)` }} />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white" style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
                    {initials}
                  </div>
                )}
                <span className="hidden text-sm font-semibold text-white lg:block">{user?.name ?? ""}</span>
              </button>

              {/* Profile Dropdown */}
              {profileDropdown && (
                <div
                  className="absolute right-0 top-12 z-50 w-48 rounded-[14px] py-2"
                  style={{ background: "#0f1120", border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                >
                  <Link
                    to="/dashboard/settings"
                    onClick={() => setProfileDropdown(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/5"
                    style={{ color: "#e2e8f0" }}
                  >
                    <Settings className="h-4 w-4" style={{ color: PURPLE }} />
                    Profile
                  </Link>
                  <button
                    onClick={() => { setProfileDropdown(false); handleLogout(); }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/5"
                    style={{ color: "#f87171" }}
                  >
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
          <VerifyBanner />
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

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const fetchNotifs = () => {
    apiFetch<{ data: { notifications: any[]; unread: number } }>("/api/notifications")
      .then(res => { setNotifications(res.data.notifications); setUnread(res.data.unread); })
      .catch(() => {});
  };

  useEffect(() => { fetchNotifs(); const i = setInterval(fetchNotifs, 30000); return () => clearInterval(i); }, []);

  const markAllRead = () => {
    apiFetch("/api/notifications/read-all", { method: "PATCH" }).then(() => fetchNotifs());
  };

  const timeAgo = (d: string) => {
    const date = new Date(d + (d.includes("Z") || d.includes("+") ? "" : "Z"));
    const diff = Date.now() - date.getTime();
    if (diff < 0) return "now";
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="relative grid h-9 w-9 place-items-center rounded-[12px] transition"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: "#7c3aed", boxShadow: "0 0 6px #a78bfa" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-[100] w-80 rounded-[16px] overflow-hidden"
            style={{ background: "#0f1120", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-sm font-bold text-white">Notifications</p>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] font-semibold" style={{ color: "#a78bfa" }}>Mark all read</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: "#64748b" }}>No notifications yet.</p>
              ) : notifications.slice(0, 15).map(n => (
                <div key={n.id} className="px-4 py-3 transition hover:bg-white/[0.02]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: n.is_read ? "transparent" : "rgba(167,139,250,0.04)" }}>
                  <div className="flex items-start gap-2.5">
                    {!n.is_read && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "#a78bfa" }} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">{n.title}</p>
                      <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "#94a3b8" }}>{n.message}</p>
                      <p className="text-[10px] mt-1" style={{ color: "#475569" }}>{timeAgo(n.created_at)} ago</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function VerifyBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(true);

  useEffect(() => {
    // Fresh check from API
    apiFetch<{ data: { user: { is_verified: number } } }>("/api/users/profile")
      .then(res => { setVerified(res.data.user.is_verified === 1); })
      .catch(() => {});
  }, []);

  if (!user || verified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await apiFetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } catch {}
    setSending(false);
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-[14px] px-4 py-3"
      style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
      <div className="flex items-center gap-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>
          {sent ? "Verification email sent! Check your inbox." : "Please verify your email to unlock all features."}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!sent && (
          <button onClick={handleResend} disabled={sending} className="text-[11px] font-semibold px-3 py-1 rounded-lg transition hover:opacity-80"
            style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
            {sending ? "Sending..." : "Resend"}
          </button>
        )}
        {sent && (
          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#5eead4" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Sent
          </span>
        )}
        <button onClick={() => setDismissed(true)} className="text-xs" style={{ color: "#64748b" }}>✕</button>
      </div>
    </div>
  );
}

function TelegramChannelButton() {
  const [url, setUrl] = useState("https://t.me/vidora_official");

  useEffect(() => {
    apiFetch<{ success: boolean; data: Record<string, string> }>("/api/settings")
      .then(res => {
        if (res.data.telegram_channel_url) setUrl(res.data.telegram_channel_url);
        else if (res.data.telegram_url) setUrl(res.data.telegram_url);
      })
      .catch(() => {});
  }, []);

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white transition hover:opacity-90"
      style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21.2 4.4L2.4 10.8c-.6.2-.6 1.1 0 1.3l4.5 1.5 1.7 5.3c.1.4.6.6 1 .3l2.4-2 4.2 3.1c.4.3 1 .1 1.1-.4L21.8 5.5c.2-.7-.4-1.3-1.1-1.1z"/></svg>
      Join Channel
    </a>
  );
}
