import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import heroImg from "@/assets/hero.png";
import dashboardImg from "@/assets/dashboard-img.png";
import mobileAppImg from "@/assets/mobile-app.png";
import telegramImg from "@/assets/telegram-img.png";
import {
  Upload, Share2, Eye, DollarSign, Infinity as InfinityIcon, Zap, Globe,
  Check, X, Smartphone, LayoutDashboard, Send, ChevronDown, Play,
  Download, FileText, Shield, Sparkles, Landmark, LifeBuoy,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

import paypalLogo    from "@/assets/icons/paypal.svg";
import wiseLogo      from "@/assets/icons/wise.svg";
import payoneerLogo  from "@/assets/icons/payoneer.svg";
import cryptoLogo    from "@/assets/icons/bitcoin.svg";
import upiLogo       from "@/assets/icons/upi.svg";
import youtubeLogo   from "@/assets/icons/youtube.svg";
import telegramLogo  from "@/assets/icons/telegram.svg";
import googleplayLogo from "@/assets/icons/googleplay.svg";
import appleLogo     from "@/assets/icons/apple.svg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vidora — Upload, Share & Monetize Your Content" },
      { name: "description", content: "Upload files via Dashboard or Telegram Bots. Share links anywhere. Monetize from the very first view with unlimited storage and fast global payouts." },
      { property: "og:title", content: "Vidora — Upload, Share & Monetize" },
      { property: "og:description", content: "Unlimited storage, live view tracking, and instant global payouts for creators." },
    ],
  }),
  component: Index,
});

// ── shared design tokens ──────────────────────────────────────────────────────
const BG       = "#06070d";
const CARD     = "#0f1120";
const CARD2    = "#0b0c14";
const BORDER   = "rgba(255,255,255,0.07)";
const PURPLE   = "#a78bfa";
const PURPLE_D = "#7c3aed";
const MUTED    = "#64748b";
const TEXT     = "#e2e8f0";
const SUBTEXT  = "#94a3b8";

const nav = [
  ["Home", "#home"], ["Features", "#features"], ["Why Us", "#why"],
  ["Rates", "#rates"], ["App", "#app"], ["FAQ", "#faq"],
];

const compare = [
  ["Unlimited View Count", true, false, false],
  ["Live View Tracking", true, false, false],
  ["Referral Bonus (5% of Withdrawals)", true, false, false],
  ["Monetization from 1st View", true, false, false],
  ["No Subscriber Threshold", true, false, false],
  ["Unlimited Cloud Storage", true, true, false],
  ["Telegram Bot Integration", true, false, false],
  ["Fast Video Playback", true, true, true],
  ["Free to Use", true, false, true],
];

const faqs = [
  ["What is Vidora and how does it work?", "Vidora is a file hosting and monetization platform where creators upload content via Dashboard or Telegram Bots. Consumers access those files through the Vidora mobile app. Creators monetize from the very first view — no thresholds."],
  ["How do I start uploading files?", "Three ways: the web Dashboard, the File Uploader Bot on Telegram, or the Link Converter Bots that turn other platform links into Vidora links automatically."],
  ["How does monetization work?", "Your content earns from the very first view — no subscriber or view threshold. Payouts are processed instantly with a low minimum threshold and global support."],
  ["What is the Referral system?", "Refer creators to Vidora using your unique link. When they sign up and later withdraw their earnings, you automatically receive 5% of their withdrawal amount as a bonus — permanently, with no cap."],
  ["What Telegram bots are available?", "File Uploader Bot, DW→DW Link Converter, and TB→DW Link Converter. Send a file or forward a post with links and the bot handles the rest."],
  ["Do consumers need to sign up?", "No. Consumers open any Vidora link in the app — fast streaming, downloads, advanced player. No permissions or account required."],
  ["Can I upload files other than videos?", "Yes — videos, APKs, ZIP archives, documents, images, and more. No file-type restrictions and storage is unlimited."],
  ["How do I get help or report an issue?", "Reach out via Telegram Support or email support@vidora.app. Active community channel for tips and peer support."],
] as const;

// ── helpers ───────────────────────────────────────────────────────────────────
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
      style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", color: PURPLE }}
    >
      {children}
    </span>
  );
}

function GlassCard({ children, className = "", style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-[22px] ${className}`}
      style={{
        background: `linear-gradient(145deg,${CARD} 0%,${CARD2} 100%)`,
        border: BORDER,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── root ──────────────────────────────────────────────────────────────────────
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

function Index() {
  return (
    <div style={{ background: BG, color: TEXT, fontFamily: "Inter, sans-serif" }}>
      <LandingHeader />
      <Hero />
      <PayoutPartners />
      <Features />
      <WhyBetter />
      <Exclusive />
      <HowItWorks />
      <Audience />
      <FAQ />
      <AppDownload />
      <Desktop />
      <LandingFooter />
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header() {
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
        {/* logo */}
        <a href="#home" className="flex items-center gap-2.5 pl-1">
          <div
            className="grid h-8 w-8 place-items-center rounded-xl"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">Vidora</span>
        </a>

        {/* nav links */}
        <ul className="hidden items-center gap-1 lg:flex">
          {nav.map(([l, h]) => (
            <li key={h}>
              <a
                href={h}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:text-white"
                style={{ color: MUTED }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {l}
              </a>
            </li>
          ))}
        </ul>

        {/* cta */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="hidden rounded-full px-5 py-2 text-sm font-semibold transition sm:inline-block"
                style={{ color: SUBTEXT, border: "1px solid rgba(255,255,255,0.08)" }}
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full px-5 py-2 text-sm font-semibold transition hover:opacity-80"
                style={{ color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full px-5 py-2 text-sm font-semibold transition sm:inline-block"
                style={{ color: SUBTEXT, border: "1px solid rgba(255,255,255,0.08)" }}
                onMouseEnter={e => (e.currentTarget.style.color = TEXT)}
                onMouseLeave={e => (e.currentTarget.style.color = SUBTEXT)}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`,
                  boxShadow: "0 0 20px rgba(167,139,250,0.35)",
                }}
              >
                Join Us
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 70%), ${BG}`,
      }}
    >
      {/* subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(167,139,250,1) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,1) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:pt-28">
        <Pill><Sparkles className="h-3 w-3" /> Upload, Share &amp; Monetize</Pill>

        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
          Upload, Share &amp;{" "}
          <span style={{ background: `linear-gradient(135deg,${PURPLE},#c4b5fd)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Monetize
          </span>{" "}
          Your Content
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg" style={{ color: SUBTEXT }}>
          Creators upload files via Dashboard or Telegram Bots. Consumers access them on the app. Monetization starts from the 1st view.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow: "0 0 28px rgba(167,139,250,0.4)" }}
          >
            <Upload className="h-4 w-4" /> Start Uploading — Free
          </Link>
          <a
            href="#app"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition hover:text-white"
            style={{ border: "1px solid rgba(167,139,250,0.3)", color: SUBTEXT }}
          >
            <Smartphone className="h-4 w-4" /> Download App
          </a>
        </div>

        <p className="mt-4 text-xs" style={{ color: MUTED }}>
          By continuing you agree to our <a className="underline hover:text-white" href="/terms" style={{ color: PURPLE }}>Terms &amp; Conditions</a>
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm" style={{ color: SUBTEXT }}>
          <span className="inline-flex items-center gap-2"><InfinityIcon className="h-4 w-4" style={{ color: PURPLE }} /> Unlimited Storage</span>
          <span className="inline-flex items-center gap-2"><Eye className="h-4 w-4" style={{ color: PURPLE }} /> Live View Count</span>
          <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" style={{ color: PURPLE }} /> Fast Global Payouts</span>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <StoreBadge label="GET IT ON" name="Google Play" />
          <StoreBadge label="Download on the" name="App Store" />
        </div>

        <div
          className="mx-auto mt-8 inline-flex gap-6 rounded-2xl px-6 py-4"
          style={{ background: "rgba(255,255,255,0.04)", border: BORDER }}
        >
          <SocialIcon label="YouTube" />
          <SocialIcon label="Telegram" />
          <SocialIcon label="Support" />
        </div>

        {/* hero image with glow */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div
            className="pointer-events-none absolute -inset-4 rounded-3xl blur-3xl"
            style={{ background: "rgba(124,58,237,0.15)" }}
          />
          <img
            src={heroImg}
            alt="Vidora dashboard and mobile app preview"
            className="relative w-full rounded-2xl"
            style={{ border: "1px solid rgba(167,139,250,0.2)", boxShadow: "0 0 60px rgba(124,58,237,0.25)" }}
          />
        </div>
      </div>
    </section>
  );
}

function StoreBadge({ label, name }: { label: string; name: string }) {
  const icon = name === "Google Play" ? googleplayLogo : appleLogo;
  return (
    <a
      href="#"
      className="inline-flex items-center gap-3 rounded-xl px-5 py-2.5 transition hover:opacity-80"
      style={{ background: "rgba(255,255,255,0.07)", border: BORDER, color: TEXT }}
    >
      <img src={icon} alt={name} className="h-5 w-5 object-contain invert" />
      <span className="text-left">
        <span className="block text-[10px] uppercase tracking-wider" style={{ color: MUTED }}>{label}</span>
        <span className="block text-sm font-semibold leading-tight text-white">{name}</span>
      </span>
    </a>
  );
}

function SocialIcon({ label }: { label: string }) {
  let icon;
  if (label === "YouTube")  icon = <img src={youtubeLogo}  alt="YouTube"  className="h-4 w-4 invert" />;
  else if (label === "Telegram") icon = <img src={telegramLogo} alt="Telegram" className="h-4 w-4 invert" />;
  else icon = <LifeBuoy className="h-4 w-4" style={{ color: PURPLE }} />;

  return (
    <a href="#" className="flex flex-col items-center gap-1.5 text-xs transition hover:text-white" style={{ color: MUTED }}>
      <div
        className="grid h-10 w-10 place-items-center rounded-full transition"
        style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}
      >
        {icon}
      </div>
      {label}
    </a>
  );
}

// ── Payout Partners ───────────────────────────────────────────────────────────
function PayoutPartners() {
  const partners = [
    { name: "PayPal",   logo: paypalLogo,   isLucide: false },
    { name: "Wise",     logo: wiseLogo,     isLucide: false },
    { name: "Payoneer", logo: payoneerLogo, isLucide: false },
    { name: "Crypto",   logo: cryptoLogo,   isLucide: false },
    { name: "Bank",     logo: Landmark,     isLucide: true  },
    { name: "UPI",      logo: upiLogo,      isLucide: false, noInvert: true },
  ];

  return (
    <section style={{ background: CARD2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }} className="py-16">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <Pill>Trusted Payout Partners</Pill>
        <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Multiple Payout Methods</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm" style={{ color: SUBTEXT }}>
          Choose from a variety of global payout methods. We process payouts instantly with a low minimum threshold.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm" style={{ color: SUBTEXT }}>
          <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4" style={{ color: PURPLE }} /> Fast Processing</span>
          <span className="inline-flex items-center gap-2"><Globe className="h-4 w-4" style={{ color: PURPLE }} /> Global Payouts</span>
          <span className="inline-flex items-center gap-2"><DollarSign className="h-4 w-4" style={{ color: PURPLE }} /> Low Minimum Threshold</span>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {partners.map((p) => (
            <div
              key={p.name}
              className="flex flex-col items-center justify-center gap-3 rounded-[18px] px-4 py-6 transition-all duration-300 hover:-translate-y-1"
              style={{ background: CARD, border: BORDER, boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.35)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
            >
              {p.isLucide ? (
                <p.logo className="h-8 w-8" style={{ color: PURPLE }} strokeWidth={1.5} />
              ) : (
                <img
                  src={p.logo as string}
                  alt={p.name}
                  className={`h-8 w-auto object-contain ${p.noInvert ? "" : "invert"}`}
                  style={{ maxHeight: "2rem", opacity: 0.85 }}
                />
              )}
              <span className="text-xs font-bold tracking-wide" style={{ color: MUTED }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
function Features() {
  const items = [
    { icon: LayoutDashboard, title: "Dashboard",        tag: "For Publishers",      body: "Upload files, manage branding, and oversee account settings — all from one centralized platform with intuitive controls.", cta: "Go To Dashboard", href: "/dashboard" },
    { icon: Smartphone,      title: "Mobile App",       tag: "For Consumers",       body: "Access uploaded files on the go with a user-friendly interface. Swift file retrieval, wherever you are.",                   cta: "Download Mobile App", href: "/download" },
    { icon: Send,            title: "Telegram Channel", tag: "Community & Support", body: "Discover link converter bots, get support, and stay updated with the latest developments.",                                cta: "Join Telegram Channel", href: "https://t.me/vidora_official" },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24">
      <div className="text-center">
        <Pill>Everything You Need</Pill>
        <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">One Platform, Three Powerful Tools</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm" style={{ color: SUBTEXT }}>
          Upload from your Dashboard, share via Telegram Bots, and let consumers access content on the mobile app — all connected seamlessly.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {items.map((it, i) => (
          <GlassCard
            key={it.title}
            className="group p-6 transition-all duration-300 hover:-translate-y-1"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
          >
            <div className="w-full overflow-hidden rounded-[16px] mb-5" style={{ border: "1px solid rgba(167,139,250,0.15)" }}>
              <img
                src={i === 0 ? dashboardImg : i === 1 ? mobileAppImg : telegramImg}
                alt={it.title}
                className="w-full h-auto object-cover"
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: PURPLE }}>{it.tag}</p>
            <h3 className="mt-1 text-xl font-bold text-white">{it.title}</h3>
            <p className="mt-2 text-sm" style={{ color: SUBTEXT }}>{it.body}</p>
            <a href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} rel={it.href.startsWith("http") ? "noopener noreferrer" : undefined} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold transition hover:opacity-80" style={{ color: PURPLE }}>
              {it.cta} →
            </a>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}

// ── Why Better ────────────────────────────────────────────────────────────────
function WhyBetter() {
  return (
    <section id="why" className="py-24" style={{ background: CARD2 }}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <Pill>Vidora vs Others</Pill>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Why Vidora is Better</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm" style={{ color: SUBTEXT }}>
            Features you won't find on any other platform — built exclusively for creator transparency, monetization, and growth.
          </p>
        </div>
        <div
          className="mt-10 overflow-hidden rounded-[22px]"
          style={{ border: BORDER, background: CARD }}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ background: "rgba(167,139,250,0.06)", borderBottom: `1px solid ${BORDER}` }}>
                <th className="px-6 py-4 font-semibold text-white">Feature</th>
                <th className="px-6 py-4 text-center font-semibold" style={{ color: PURPLE }}>Vidora</th>
                <th className="px-6 py-4 text-center font-semibold" style={{ color: MUTED }}>Cloud Storage</th>
                <th className="px-6 py-4 text-center font-semibold" style={{ color: MUTED }}>File Hosting</th>
              </tr>
            </thead>
            <tbody>
              {compare.map(([f, a, b, c]) => (
                <tr key={f as string} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td className="px-6 py-4 text-sm" style={{ color: SUBTEXT }}>{f}</td>
                  <td className="px-6 py-4 text-center">{a ? <Check className="mx-auto h-5 w-5" style={{ color: PURPLE }} /> : <X className="mx-auto h-5 w-5" style={{ color: MUTED }} />}</td>
                  <td className="px-6 py-4 text-center">{b ? <Check className="mx-auto h-5 w-5" style={{ color: "rgba(167,139,250,0.5)" }} /> : <X className="mx-auto h-5 w-5" style={{ color: MUTED }} />}</td>
                  <td className="px-6 py-4 text-center">{c ? <Check className="mx-auto h-5 w-5" style={{ color: "rgba(167,139,250,0.5)" }} /> : <X className="mx-auto h-5 w-5" style={{ color: MUTED }} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ── Exclusive ─────────────────────────────────────────────────────────────────
function Exclusive() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className="text-center">
        <Pill>Exclusive Features Explained</Pill>
        <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Features No Other Platform Offers</h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {[
          { tag: "View Count",          title: "Unlimited & Live View Count",       body: "No other platform offers this — unlimited views with live updates on your dashboard. Monitor real-time engagement with complete transparency.", a: "Live", al: "View Tracking", b: "∞", bl: "View Limit" },
          { tag: "OG Uploader Referral", title: "Referral Bonus System", body: "Refer creators to Vidora and earn 5% of their every withdrawal — permanently. No cap, no expiry. The more creators you bring, the more passive income you earn.",                    a: "5%",  al: "Per Withdrawal", b: "∞", bl: "No Expiry" },
        ].map((it) => (
          <GlassCard key={it.title} className="overflow-hidden p-8">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: PURPLE }}>Vidora Exclusive · {it.tag}</span>
            <h3 className="mt-3 text-2xl font-bold text-white">{it.title}</h3>
            <p className="mt-3 text-sm" style={{ color: SUBTEXT }}>{it.body}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[{ v: it.a, l: it.al }, { v: it.b, l: it.bl }].map((s) => (
                <div
                  key={s.l}
                  className="rounded-[16px] p-5"
                  style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.18)" }}
                >
                  <div className="text-3xl font-bold" style={{ color: PURPLE }}>{s.v}</div>
                  <div className="mt-1 text-xs" style={{ color: MUTED }}>{s.l}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: "01", icon: Upload,      t: "Upload",   d: "Upload any file via Dashboard or Telegram Bots" },
    { n: "02", icon: Share2,      t: "Share",    d: "Share the link with your audience anywhere" },
    { n: "03", icon: Eye,         t: "Views",    d: "Consumers access your files via the Vidora App" },
    { n: "04", icon: DollarSign,  t: "Monetize", d: "Content gets monetized from the very first view" },
  ];
  return (
    <section id="rates" className="py-24" style={{ background: CARD2 }}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <Pill>How It Works</Pill>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Upload, Share &amp; Monetize</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm" style={{ color: SUBTEXT }}>
            Creators upload content via Dashboard or Telegram Bots, consumers access it via the App, and content gets monetized from the very first view.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <GlassCard key={s.n} className="relative p-6">
              <div
                className="absolute -top-3 left-5 rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}
              >
                {s.n}
              </div>
              <s.icon className="mt-2 h-7 w-7" style={{ color: PURPLE }} />
              <h3 className="mt-4 text-lg font-bold text-white">{s.t}</h3>
              <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>{s.d}</p>
            </GlassCard>
          ))}
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {/* purple gradient card */}
          <div
            className="rounded-[22px] p-8 text-white"
            style={{
              background: `linear-gradient(135deg,${PURPLE_D} 0%,${PURPLE} 100%)`,
              boxShadow: "0 0 40px rgba(124,58,237,0.3)",
            }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Publisher Monetization</span>
            <h3 className="mt-2 text-2xl font-bold">Monetize from Day One</h3>
            <p className="mt-3 text-sm opacity-85">
              Unlike other platforms, there's no subscriber or view threshold to start monetizing. Your content starts generating value from the very first view.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Low Minimum Payout</span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">Instant Payouts</span>
            </div>
          </div>

          {/* upload methods */}
          <GlassCard className="p-8">
            <h3 className="text-2xl font-bold text-white">Multiple Ways to Upload</h3>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>Choose whatever suits your workflow</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Web Dashboard",      "Upload directly from your browser",          LayoutDashboard],
                ["File Uploader Bot",  "Send files to our Telegram bot",             Send],
                ["Link Converter Bot", "Convert other platform links instantly",      Share2],
              ].map(([t, d, I]: any) => (
                <div
                  key={t}
                  className="rounded-[14px] p-4"
                  style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.15)" }}
                >
                  <I className="h-5 w-5" style={{ color: PURPLE }} />
                  <div className="mt-3 text-sm font-semibold text-white">{t}</div>
                  <div className="mt-1 text-xs" style={{ color: MUTED }}>{d}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

// ── Audience ──────────────────────────────────────────────────────────────────
function Audience() {
  const pub = ["Unlimited Cloud Storage","Monetization from 1st View","Low Payout Threshold","Fair Monetization Rates","Realtime View Count","Fast Global Payouts","Dashboard File Upload","File Uploader Bot","Link Converter Bot","Remote URL Bot","Telegram & Email Support"];
  const con = ["Android & iOS App","No SignUp Required","Direct Link to App","Fast Video Streaming","Advanced Video Player","Micro Dramas","Download & Share Files","Minimal Ads","No Permissions Required","Premium Subscription","Discord & Email Support"];

  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <div className="grid gap-6 md:grid-cols-2">
        {[
          { tag: "For Creators", title: "Publishers", body: "Upload files, share links, and monetize your content", list: pub, cta: "Sign Up for Free", to: "/signup" as const },
          { tag: "For Viewers",  title: "Consumers",  body: "Watch, download, and enjoy content on the app",       list: con, cta: "Download App",    to: "#app" },
        ].map((c) => (
          <GlassCard key={c.title} className="p-8">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: PURPLE }}>{c.tag}</span>
            <h3 className="mt-2 text-3xl font-bold text-white">{c.title}</h3>
            <p className="mt-2 text-sm" style={{ color: SUBTEXT }}>{c.body}</p>
            <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {c.list.map((l) => (
                <li key={l} className="flex items-center gap-2 text-sm" style={{ color: SUBTEXT }}>
                  <Check className="h-4 w-4 shrink-0" style={{ color: PURPLE }} />{l}
                </li>
              ))}
            </ul>
            {c.to.startsWith("/") ? (
              <Link
                to={c.to as "/signup"}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow: "0 0 20px rgba(167,139,250,0.3)" }}
              >
                {c.cta}
              </Link>
            ) : (
              <a
                href={c.to}
                className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:opacity-90"
                style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)", color: PURPLE }}
              >
                {c.cta}
              </a>
            )}
          </GlassCard>
        ))}
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24" style={{ background: CARD2 }}>
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Frequently Asked Questions</h2>
          <p className="mt-3 text-sm" style={{ color: SUBTEXT }}>
            Everything you need to know. Can't find an answer?{" "}
            <a className="underline hover:text-white" href="#" style={{ color: PURPLE }}>Ask us on Telegram</a>.
          </p>
        </div>
        <div className="mt-10 space-y-3">
          {faqs.map(([q, a], i) => (
            <div
              key={q}
              className="overflow-hidden rounded-[18px] transition-all duration-200"
              style={{
                background: open === i ? "rgba(167,139,250,0.07)" : CARD,
                border: open === i ? "1px solid rgba(167,139,250,0.25)" : `1px solid ${BORDER}`,
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="font-semibold text-white">{q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                  style={{ color: PURPLE }}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 text-sm" style={{ color: SUBTEXT }}>{a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── App Download ──────────────────────────────────────────────────────────────
function AppDownload() {
  const items = [
    { i: Download, t: "Download Files",  d: "Access and download any file shared by creators" },
    { i: Play,     t: "Stream Videos",   d: "Watch videos with an advanced built-in player" },
    { i: Sparkles, t: "Micro Dramas",    d: "Discover and binge short-form drama series" },
    { i: FileText, t: "Offline Access",  d: "Save files to your device for offline viewing" },
  ];
  return (
    <section id="app" className="mx-auto max-w-6xl px-4 py-24 text-center">
      <Pill>Free on Android &amp; iOS</Pill>
      <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Get the Vidora App</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm" style={{ color: SUBTEXT }}>
        Stream videos, download files, watch micro dramas, and access all your content on the go. One app for everything.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <GlassCard key={it.t} className="p-6 text-left">
            <div
              className="grid h-10 w-10 place-items-center rounded-[12px]"
              style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}
            >
              <it.i className="h-5 w-5" style={{ color: PURPLE }} />
            </div>
            <h3 className="mt-4 font-bold text-white">{it.t}</h3>
            <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>{it.d}</p>
          </GlassCard>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <StoreBadge label="GET IT ON" name="Google Play" />
        <StoreBadge label="Download on the" name="App Store" />
      </div>
      <p className="mt-4 text-xs" style={{ color: MUTED }}>No account required to browse. 100% free to download.</p>
    </section>
  );
}

// ── Desktop ───────────────────────────────────────────────────────────────────
function Desktop() {
  const items = [
    { i: Zap,      t: "Fast Downloads", d: "Blazing fast file downloads with desktop-grade performance" },
    { i: FileText, t: "File Manager",   d: "Manage and organize all your files from your desktop" },
    { i: Shield,   t: "Secure & Private", d: "Your files are encrypted and secure on your machine" },
  ];
  return (
    <section className="py-24" style={{ background: CARD2 }}>
      <div className="mx-auto max-w-6xl px-4 text-center">
        <Pill>Beta · Available on Windows & macOS</Pill>
        <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">Vidora for Desktop</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm" style={{ color: SUBTEXT }}>
          Get the full Vidora experience on your PC or Mac. Manage your content, upload files, and track earnings — all from your desktop.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {items.map((it) => (
            <GlassCard key={it.t} className="p-6 text-left">
              <div
                className="grid h-10 w-10 place-items-center rounded-[12px]"
                style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}
              >
                <it.i className="h-5 w-5" style={{ color: PURPLE }} />
              </div>
              <h3 className="mt-4 font-bold text-white">{it.t}</h3>
              <p className="mt-1 text-sm" style={{ color: SUBTEXT }}>{it.d}</p>
            </GlassCard>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="/apps/Vidora_1.0.0_x64-setup.exe"
            download
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow: "0 0 28px rgba(167,139,250,0.35)" }}
          >
            <Download className="h-4 w-4" /> Download for Windows
          </a>
          <a
            href="/mac-install?v=arm"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow: "0 0 28px rgba(167,139,250,0.35)" }}
          >
            <Download className="h-4 w-4" /> Download for Mac (Apple Silicon)
          </a>
          <a
            href="/mac-install?v=intel"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow: "0 0 28px rgba(167,139,250,0.35)" }}
          >
            <Download className="h-4 w-4" /> Download for Mac (Intel)
          </a>
        </div>
        <p className="mt-3 text-xs" style={{ color: MUTED }}>Beta version · Windows 10+ / macOS 11+ · 100% free to download.</p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: "#080910", borderTop: `1px solid ${BORDER}`, color: SUBTEXT }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="grid h-8 w-8 place-items-center rounded-lg"
              style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Vidora</span>
          </div>
          <p className="mt-3 text-sm opacity-70">Upload, share, and monetize your content with unlimited cloud storage. Built for creators and consumers.</p>
          <div className="mt-4 flex gap-2">
            {["YouTube", "Channel", "Support"].map((s) => (
              <a
                key={s}
                href="#"
                className="rounded-full px-3 py-1 text-xs transition hover:text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: BORDER }}
              >
                {s}
              </a>
            ))}
          </div>
        </div>
        <FooterCol title="Platform"   links={["Dashboard", "Download App", "Publisher Rates", "Payout Records"]} />
        <FooterCol title="Resources"  links={["Features", "Why Vidora?", "FAQ", "Contact Us"]} />
        <div>
          <h4 className="text-sm font-semibold text-white">Get the App</h4>
          <div className="mt-3 flex flex-col gap-2">
            <StoreBadge label="GET IT ON"     name="Google Play" />
            <StoreBadge label="Download on the" name="App Store" />
          </div>
        </div>
      </div>
      <div className="py-6 text-center text-xs opacity-50" style={{ borderTop: `1px solid ${BORDER}` }}>
        © 2026 Vidora · CN-33, Pathkhauli, Kaptanganj 274301, Kushinagar, India · All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-3 space-y-2 text-sm opacity-70">
        {links.map((l) => (
          <li key={l}><a href="#" className="hover:opacity-100 hover:text-white transition">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}
