import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Download, Smartphone, FileText, Film, Image,
  Music, FileArchive, File, Eye, User, Calendar,
  HardDrive, Sparkles, AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/share/$fileId")({
  component: SharePage,
});

const BG      = "#06070d";
const CARD    = "#0f1120";
const CARD2   = "#0b0c14";
const PURPLE  = "#a78bfa";
const PURPLE_D = "#7c3aed";
const BORDER  = "rgba(255,255,255,0.07)";
const MUTED   = "#64748b";
const SUBTEXT = "#94a3b8";
const TEXT    = "#e2e8f0";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

interface FileData {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  public_url: string;
  view_count: number;
  created_at: string;
  uploader_name: string;
}

function formatBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(2))} ${s[i]}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
}

function getFileIcon(mime: string) {
  if (mime.startsWith("video/"))  return Film;
  if (mime.startsWith("image/"))  return Image;
  if (mime.startsWith("audio/"))  return Music;
  if (mime.includes("zip") || mime.includes("rar")) return FileArchive;
  if (mime.includes("pdf") || mime.includes("text")) return FileText;
  return File;
}

function getFileColor(mime: string) {
  if (mime.startsWith("video/"))  return "#a78bfa";
  if (mime.startsWith("image/"))  return "#60a5fa";
  if (mime.startsWith("audio/"))  return "#34d399";
  if (mime.includes("zip") || mime.includes("rar")) return "#f59e0b";
  return "#94a3b8";
}

function isVideo(mime: string) { return mime.startsWith("video/"); }
function isImage(mime: string) { return mime.startsWith("image/"); }
function isAudio(mime: string) { return mime.startsWith("audio/"); }

function SharePage() {
  const { fileId } = Route.useParams();
  const [file, setFile]     = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/share/${fileId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setFile(data.data.file);
        else setError(data.message || "File not found.");
      })
      .catch(() => setError("Failed to load file. Please try again."))
      .finally(() => setLoading(false));
  }, [fileId]);

  const FileIcon  = file ? getFileIcon(file.mime_type) : File;
  const fileColor = file ? getFileColor(file.mime_type) : PURPLE;

  return (
    <div className="min-h-screen font-sans antialiased" style={{ background: BG, color: TEXT }}>
      {/* subtle grid */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.025]" style={{
        backgroundImage: "linear-gradient(rgba(167,139,250,1) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,1) 1px,transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Top glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 opacity-30" style={{
        background: `radial-gradient(ellipse 60% 100% at 50% 0%, rgba(124,58,237,0.4), transparent)`,
      }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 mx-auto max-w-3xl">
        <a href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl"
            style={{ background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})` }}>
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white">Vidora</span>
        </a>
        <span className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ background: "rgba(167,139,250,0.1)", color: PURPLE, border: "1px solid rgba(167,139,250,0.2)" }}>
          Shared File
        </span>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-16 pt-6">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <AlertCircle className="h-12 w-12 mb-4" style={{ color: "#f87171" }} />
            <p className="text-lg font-bold text-white">File not found</p>
            <p className="mt-2 text-sm" style={{ color: SUBTEXT }}>{error}</p>
          </div>
        )}

        {file && (
          <div className="space-y-4">

            {/* Media preview */}
            {isVideo(file.mime_type) && file.public_url && (
              <div className="overflow-hidden rounded-[22px]" style={{ border: `1px solid ${BORDER}` }}>
                <video
                  controls
                  className="w-full"
                  style={{ background: "#000", maxHeight: 420 }}
                  preload="metadata"
                >
                  <source src={file.public_url} type={file.mime_type} />
                  Your browser does not support video playback.
                </video>
              </div>
            )}

            {isImage(file.mime_type) && file.public_url && (
              <div className="overflow-hidden rounded-[22px]" style={{ border: `1px solid ${BORDER}` }}>
                <img
                  src={file.public_url}
                  alt={file.original_name}
                  className="w-full object-contain"
                  style={{ maxHeight: 480, background: "#000" }}
                />
              </div>
            )}

            {isAudio(file.mime_type) && file.public_url && (
              <div className="rounded-[22px] p-6" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                <audio controls className="w-full">
                  <source src={file.public_url} type={file.mime_type} />
                </audio>
              </div>
            )}

            {/* File info card */}
            <div className="rounded-[22px] p-6"
              style={{ background: `linear-gradient(145deg,${CARD} 0%,${CARD2} 100%)`, border: `1px solid ${BORDER}` }}>

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px]"
                  style={{ background: `${fileColor}18`, border: `1px solid ${fileColor}30` }}>
                  <FileIcon className="h-7 w-7" style={{ color: fileColor }} />
                </div>

                {/* Name + type */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-white leading-tight break-all">
                    {file.original_name}
                  </h1>
                  <p className="mt-1 text-xs" style={{ color: SUBTEXT }}>{file.mime_type}</p>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: HardDrive, label: "Size",     value: formatBytes(file.size_bytes), color: PURPLE },
                  { icon: Eye,       label: "Views",    value: (file.view_count).toLocaleString(), color: "#60a5fa" },
                  { icon: User,      label: "Uploader", value: file.uploader_name, color: "#34d399" },
                  { icon: Calendar,  label: "Uploaded", value: formatDate(file.created_at), color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} className="rounded-[14px] p-3.5"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Download */}
              <a
                href={file.public_url}
                download={file.original_name}
                className="flex items-center justify-center gap-2.5 rounded-[18px] py-4 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.99]"
                style={{
                  background: `linear-gradient(135deg,${PURPLE_D},${PURPLE})`,
                  boxShadow: "0 0 28px rgba(167,139,250,0.35)",
                }}
              >
                <Download className="h-4 w-4" />
                Download File
              </a>

              {/* View in App */}
              <a
                href="#"
                className="flex items-center justify-center gap-2.5 rounded-[18px] py-4 text-sm font-bold transition hover:opacity-90"
                style={{
                  background: "rgba(167,139,250,0.08)",
                  border: "1px solid rgba(167,139,250,0.25)",
                  color: PURPLE,
                }}
              >
                <Smartphone className="h-4 w-4" />
                View in App
              </a>
            </div>

            {/* Powered by */}
            <p className="text-center text-xs pt-2" style={{ color: "#334155" }}>
              Shared via{" "}
              <a href="/" className="transition hover:text-white" style={{ color: MUTED }}>
                Vidora
              </a>{" "}
              · Upload, Share &amp; Monetize
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
