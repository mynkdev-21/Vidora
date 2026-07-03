import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Film, Music, Image, File, Eye, User, HardDrive,
  Sparkles, AlertCircle, Smartphone, Download, Upload, Zap, Shield, Play, ChevronRight,
} from "lucide-react";
import { apiFetch, BASE_URL } from "@/lib/api";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const Route = createFileRoute("/v/$token")({
  head: () => ({ meta: [{ title: "Vidora — View File" }] }),
  component: SharedViewPage,
});

// ── Anti-DevTools ─────────────────────────────────────────────────────────────
function useDevToolsProtection() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const redirect = () => { window.location.replace("/"); };
    const checkSize = () => { const t=160; if (window.outerWidth-window.innerWidth>t||window.outerHeight-window.innerHeight>t) redirect(); };
    const el = new window.Image();
    Object.defineProperty(el,"id",{get:()=>{redirect();return"";}});
    const blockContext = (e: Event) => { e.preventDefault(); e.stopPropagation(); return false; };
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key==="F12"){e.preventDefault();redirect();return;}
      if (e.ctrlKey&&e.shiftKey&&/^[IJC]$/i.test(e.key)){e.preventDefault();redirect();return;}
      if (e.ctrlKey&&e.key.toLowerCase()==="u"){e.preventDefault();redirect();return;}
      if (e.metaKey&&e.altKey&&/^[IJC]$/i.test(e.key)){e.preventDefault();redirect();return;}
      if (e.metaKey&&e.key.toLowerCase()==="u"){e.preventDefault();redirect();return;}
    };
    const dc=setInterval(()=>{const b=performance.now();console.log(el);console.clear();if(performance.now()-b>50)redirect();},2000);
    const si=setInterval(checkSize,500);
    document.addEventListener("contextmenu",blockContext,true);
    document.addEventListener("keydown",blockKeys,true);
    document.body.style.userSelect="none";
    document.body.style.webkitUserSelect="none";
    return()=>{clearInterval(si);clearInterval(dc);document.removeEventListener("contextmenu",blockContext,true);document.removeEventListener("keydown",blockKeys,true);document.body.style.userSelect="";document.body.style.webkitUserSelect="";};
  }, []);
}

const BG="#06070d";const PURPLE="#a78bfa";const PURPLE_D="#7c3aed";
const MUTED="#64748b";const SUBTEXT="#94a3b8";const BORDER="rgba(255,255,255,0.07)";

interface FileInfo { name:string; type:string; size:number; creator:string; views:number; thumbnail:string|null; }
interface ViewResponse { success:boolean; data:FileInfo; message?:string; }

function formatBytes(b:number){if(!b)return"0 B";const k=1024,s=["B","KB","MB","GB"],i=Math.floor(Math.log(b)/Math.log(k));return`${parseFloat((b/Math.pow(k,i)).toFixed(2))} ${s[i]}`;}
function getIcon(t:string){if(t==="video")return Film;if(t==="image")return Image;if(t==="audio")return Music;return File;}
function getColor(t:string){if(t==="video")return"#a78bfa";if(t==="image")return"#60a5fa";if(t==="audio")return"#34d399";return"#94a3b8";}

function SharedViewPage() {
  useDevToolsProtection();
  const { token } = Route.useParams();
  const [info,setInfo]=useState<FileInfo|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    // Try to open app first — if app is installed, it will handle the deep link
    // If app is not installed, browser stays on this page after timeout
    if (typeof window !== "undefined") {
      const deepLink = `vidora://view/${token}`;
      const timeout = setTimeout(() => {
        // App didn't open — load file details for web view
        apiFetch<ViewResponse>(`/api/share/view/${token}`)
          .then(res=>setInfo(res.data))
          .catch((e:unknown)=>setError(e instanceof Error?e.message:"Link not found or expired."))
          .finally(()=>setLoading(false));
      }, 1500);

      // Attempt to open app
      window.location.href = deepLink;

      // If page becomes hidden (app opened), clear timeout
      const handleVisibility = () => {
        if (document.hidden) {
          clearTimeout(timeout);
          setLoading(false);
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        clearTimeout(timeout);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    } else {
      // SSR — just load data
      apiFetch<ViewResponse>(`/api/share/view/${token}`)
        .then(res=>setInfo(res.data))
        .catch((e:unknown)=>setError(e instanceof Error?e.message:"Link not found or expired."))
        .finally(()=>setLoading(false));
    }
  },[token]);

  const Icon=info?getIcon(info.type):File;
  const color=info?getColor(info.type):PURPLE;

  return (
    <div style={{ background:BG, color:"#e2e8f0", fontFamily:"Inter, sans-serif" }}>
      {/* Grid bg */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.02]" style={{
        backgroundImage:"linear-gradient(rgba(167,139,250,1) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,1) 1px,transparent 1px)",
        backgroundSize:"60px 60px",
      }}/>

      {/* ── Landing page Header ── */}
      <LandingHeader />

      {/* ── Main Content ── */}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"/>
            <p className="text-sm" style={{color:MUTED}}>Loading file…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-[22px]" style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)"}}>
              <AlertCircle className="h-10 w-10" style={{color:"#f87171"}}/>
            </div>
            <h2 className="text-2xl font-bold text-white">Link Not Found</h2>
            <p className="mt-2 text-sm max-w-sm" style={{color:SUBTEXT}}>{error}</p>
            <Link to="/" className="mt-6 inline-flex rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-90" style={{background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})`}}>
              Go to Vidora
            </Link>
          </div>
        ) : info ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px] items-start">
            {/* Left — file card */}
            <div className="rounded-[28px] p-8" style={{
              background:"linear-gradient(160deg,#12102a 0%,#0f1120 50%,#0b0c14 100%)",
              border:"1px solid rgba(167,139,250,0.2)",
              boxShadow:"0 0 60px rgba(124,58,237,0.12), 0 8px 32px rgba(0,0,0,0.5)",
            }}>
              <div className="flex items-start gap-5">
                {info.thumbnail ? (
                  <img
                    src={`${BASE_URL}${info.thumbnail}`}
                    alt={info.name}
                    className="h-20 w-32 shrink-0 rounded-[16px] object-cover"
                    style={{border:`1px solid ${color}30`}}
                  />
                ) : (
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[20px]" style={{background:`${color}12`,border:`1px solid ${color}30`,boxShadow:`0 0 30px ${color}15`}}>
                    <Icon className="h-10 w-10" style={{color}}/>
                  </div>
                )}
                <div className="min-w-0 pt-1">
                  <h1 className="text-2xl font-bold text-white leading-tight break-all">{info.name}</h1>
                  <p className="mt-1.5 text-sm capitalize" style={{color:SUBTEXT}}>{info.type} file</p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3">
                {[
                  {icon:Eye,label:"Views",value:(info.views??0).toLocaleString(),c:"#a78bfa"},
                  {icon:HardDrive,label:"Size",value:formatBytes(info.size),c:"#60a5fa"},
                  {icon:User,label:"Creator",value:info.creator,c:"#34d399"},
                ].map(s=>(
                  <div key={s.label} className="rounded-[16px] p-4" style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${BORDER}`}}>
                    <s.icon className="mb-2 h-4 w-4" style={{color:s.c}}/>
                    <p className="text-sm font-bold text-white truncate">{s.value}</p>
                    <p className="text-[10px]" style={{color:MUTED}}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2.5 rounded-[14px] px-4 py-3" style={{background:"rgba(167,139,250,0.06)",border:"1px solid rgba(167,139,250,0.15)"}}>
                <Shield className="h-4 w-4 shrink-0" style={{color:PURPLE}}/>
                <p className="text-xs" style={{color:SUBTEXT}}>This file is securely hosted on Vidora. The direct URL is never exposed.</p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <a href={`vidora://view/${token}`} className="flex items-center justify-center gap-2.5 rounded-[16px] py-4 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
                  style={{background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})`,boxShadow:"0 0 28px rgba(167,139,250,0.4)"}}>
                  <Smartphone className="h-5 w-5"/> Open in App
                </a>
                <a href={`vidora://download/${token}`} className="flex items-center justify-center gap-2.5 rounded-[16px] py-4 text-sm font-bold transition hover:opacity-90 active:scale-[0.98]"
                  style={{background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.3)",color:PURPLE}}>
                  <Download className="h-5 w-5"/> Download
                </a>
              </div>

              <p className="mt-4 text-center text-xs" style={{color:MUTED}}>
                Don't have the app? <Link to="/#app" className="font-semibold underline hover:text-white" style={{color:PURPLE}}>Download Vidora</Link>
              </p>

              {/* Report section */}
              <div className="mt-6 flex items-center justify-between rounded-[16px] px-5 py-4" style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.15)"}}>
                <div>
                  <p className="text-sm font-semibold" style={{color:"#f87171"}}>Report this file</p>
                  <p className="text-[11px]" style={{color:"#94a3b8"}}>Abusive, illegal, or unwanted content?</p>
                </div>
                <Link to={`/report?token=${token}&name=${encodeURIComponent(info.name)}`} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition hover:opacity-80" style={{background:"rgba(239,68,68,0.1)",color:"#f87171",border:"1px solid rgba(239,68,68,0.2)"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  Report
                </Link>
              </div>
            </div>

            {/* Right — app promo */}
            <div className="space-y-5">
              <div className="rounded-[22px] p-6" style={{background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)",border:`1px solid ${BORDER}`}}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid h-10 w-10 place-items-center rounded-[12px]" style={{background:"rgba(167,139,250,0.12)",border:"1px solid rgba(167,139,250,0.2)"}}>
                    <Play className="h-5 w-5" style={{color:PURPLE}}/>
                  </div>
                  <div><h3 className="font-bold text-white">Get Vidora App</h3><p className="text-xs" style={{color:MUTED}}>Stream, download & enjoy</p></div>
                </div>
                <ul className="space-y-2.5">
                  {["Fast video streaming","Download & share files","Advanced video player","No account required"].map(t=>(
                    <li key={t} className="flex items-center gap-2.5 text-xs" style={{color:SUBTEXT}}>
                      <ChevronRight className="h-3 w-3 shrink-0" style={{color:PURPLE}}/>{t}
                    </li>
                  ))}
                </ul>
                <a href="/#app" className="mt-5 flex items-center justify-center gap-2 rounded-[14px] py-3 text-sm font-bold text-white transition hover:opacity-90"
                  style={{background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})`}}>
                  <Download className="h-4 w-4"/> Download Free
                </a>
              </div>

              <div className="rounded-[22px] p-6" style={{background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)",border:`1px solid ${BORDER}`}}>
                <h3 className="font-bold text-white mb-4">Why Vidora?</h3>
                <div className="space-y-3">
                  {[
                    {icon:Upload,label:"Upload & Monetize",desc:"Earn from the very first view"},
                    {icon:Zap,label:"Fast Global Payouts",desc:"PayPal, Wise, Crypto & more"},
                    {icon:Shield,label:"Secure Hosting",desc:"Protected URLs, no leaks"},
                  ].map(f=>(
                    <div key={f.label} className="flex items-start gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.15)"}}>
                        <f.icon className="h-4 w-4" style={{color:PURPLE}}/>
                      </div>
                      <div><p className="text-xs font-semibold text-white">{f.label}</p><p className="text-[11px]" style={{color:MUTED}}>{f.desc}</p></div>
                    </div>
                  ))}
                </div>
                <Link to="/signup" className="mt-5 flex items-center justify-center gap-2 rounded-[14px] py-3 text-sm font-bold transition hover:opacity-90"
                  style={{background:"rgba(167,139,250,0.1)",border:"1px solid rgba(167,139,250,0.25)",color:PURPLE}}>
                  <Sparkles className="h-4 w-4"/> Start Earning Free
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* ── Landing page Footer ── */}
      <LandingFooter />
    </div>
  );
}
