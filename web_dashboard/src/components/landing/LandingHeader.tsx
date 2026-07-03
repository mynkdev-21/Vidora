import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import logoIcon from "@/assets/logo-icon.png";

const PURPLE   = "#a78bfa";
const PURPLE_D = "#7c3aed";
const MUTED    = "#64748b";
const SUBTEXT  = "#94a3b8";

const nav = [
  ["Home", "/#home"], ["Features", "/#features"], ["Why Us", "/#why"],
  ["Rates", "/#rates"], ["App", "/#app"], ["FAQ", "/#faq"],
];

export function LandingHeader() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate({ to: "/" }); };

  return (
    <header className="sticky top-4 z-50 mx-auto max-w-6xl px-4">
      <nav
        className="flex items-center justify-between gap-4 rounded-full px-4 py-2.5 backdrop-blur-xl"
        style={{
          background: "rgba(11,12,20,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <Link to="/" className="flex items-center gap-2.5 pl-1">
          <img src={logoIcon} alt="Vidora" className="h-8 w-8 rounded-xl" />
          <span className="text-xl font-extrabold tracking-tight text-white">Vidora</span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {nav.map(([l, h]) => (
            <li key={h}>
              <a href={h} className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:text-white" style={{ color: MUTED }}>{l}</a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="hidden rounded-full px-5 py-2 text-sm font-semibold transition sm:inline-block" style={{ color: SUBTEXT, border: "1px solid rgba(255,255,255,0.08)" }}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-80" style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden rounded-full px-5 py-2 text-sm font-semibold transition sm:inline-block" style={{ color: SUBTEXT, border: "1px solid rgba(255,255,255,0.08)" }}>
                Log In
              </Link>
              <Link to="/signup" className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow: "0 0 20px rgba(167,139,250,0.35)" }}>
                Join Us
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
