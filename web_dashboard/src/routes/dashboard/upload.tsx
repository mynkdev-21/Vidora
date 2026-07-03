import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import {
  Upload, CheckCircle, AlertCircle, FileText, X,
  Film, Image, FileArchive, Music, File,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/dashboard/upload")({
  head: () => ({ meta: [{ title: "Upload — Vidora" }] }),
  component: UploadPage,
});

const PURPLE   = "#a78bfa";
const PURPLE_D = "#7c3aed";
const MUTED    = "#64748b";
const SUBTEXT  = "#94a3b8";
const BORDER   = "rgba(255,255,255,0.07)";

// ── helpers ───────────────────────────────────────────────────────────────────
function formatBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024, s = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(2))} ${s[i]}`;
}

function getFileIcon(mime: string) {
  if (mime.startsWith("video/"))  return Film;
  if (mime.startsWith("image/"))  return Image;
  if (mime.startsWith("audio/"))  return Music;
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("archive")) return FileArchive;
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

interface SelectedFile {
  file: File;
  preview?: string;
}

// ── Page ──────────────────────────────────────────────────────────────────────
function UploadPage() {
  const [selected, setSelected]   = useState<SelectedFile | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── file selection ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setError(""); setSuccess(false);
    let preview: string | undefined;
    if (file.type.startsWith("image/")) {
      preview = URL.createObjectURL(file);
    }
    setSelected({ file, preview });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ── drag & drop ─────────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const removeFile = () => {
    if (selected?.preview) URL.revokeObjectURL(selected.preview);
    setSelected(null); setSuccess(false); setError(""); setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── upload via XHR for real progress ────────────────────────────────────────
  const handleUpload = () => {
    if (!selected) return;
    setError(""); setSuccess(false); setLoading(true); setProgress(0);

    const token  = localStorage.getItem("vdr_access_token") || "";
    const apiKey = import.meta.env.VITE_API_KEY || "vdr_live_f9a2c84e1b3d7056ae4f8c2190d3b5e7";

    const formData = new FormData();
    formData.append("file", selected.file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      setLoading(false);
      if (xhr.status === 201 || xhr.status === 200) {
        setProgress(100);
        setSuccess(true);
        removeFile();
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          setError(res.message || "Upload failed. Please try again.");
        } catch {
          setError("Upload failed. Please try again.");
        }
        setProgress(0);
      }
    });

    xhr.addEventListener("error", () => {
      setLoading(false);
      setProgress(0);
      setError("Network error. Please check your connection and try again.");
    });

    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
    xhr.open("POST", `${baseUrl}/api/files/upload`);
    if (token)  xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (apiKey) xhr.setRequestHeader("X-API-Key", apiKey);

    xhr.send(formData);
  };

  const FileIcon  = selected ? getFileIcon(selected.file.type)  : Upload;
  const fileColor = selected ? getFileColor(selected.file.type) : PURPLE;

  return (
    <DashboardLayout
      title="Upload File"
      subtitle="Drag & drop or browse to upload your files."
      activePage="Upload"
    >
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Success */}
        {success && (
          <div className="flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm"
            style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.25)", color:"#34d399" }}>
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            File uploaded successfully! It will appear in your{" "}
            <Link to="/dashboard/files" className="underline font-semibold hover:opacity-80">files list</Link>{" "}
            shortly.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-sm"
            style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#f87171" }}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* Drop zone */}
        {!selected ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className="relative flex cursor-pointer flex-col items-center justify-center rounded-[24px] transition-all duration-200"
            style={{
              minHeight: 300,
              background: dragging
                ? "rgba(167,139,250,0.1)"
                : "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)",
              border: dragging
                ? "2px dashed rgba(167,139,250,0.7)"
                : "2px dashed rgba(255,255,255,0.12)",
              boxShadow: dragging ? "0 0 40px rgba(167,139,250,0.2)" : "none",
            }}
          >
            {/* Glow blob */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[24px] transition-opacity duration-300"
              style={{ background:"radial-gradient(circle at 50% 50%, rgba(167,139,250,0.08), transparent 70%)", opacity: dragging ? 1 : 0 }}
            />

            <div
              className="relative mb-5 grid h-20 w-20 place-items-center rounded-[20px] transition-all duration-200"
              style={{
                background: dragging ? "rgba(167,139,250,0.2)" : "rgba(167,139,250,0.1)",
                border: `1px solid rgba(167,139,250,${dragging ? "0.5" : "0.2"})`,
                boxShadow: dragging ? "0 0 30px rgba(167,139,250,0.3)" : "none",
              }}
            >
              <Upload
                className="h-9 w-9 transition-transform duration-200"
                style={{ color: PURPLE, transform: dragging ? "translateY(-3px)" : "none" }}
              />
            </div>

            <p className="relative text-lg font-bold text-white">
              {dragging ? "Drop it here!" : "Drop files or browse"}
            </p>
            <p className="relative mt-2 text-sm" style={{ color: SUBTEXT }}>
              {dragging ? "Release to upload" : "Drag & drop any file, or click to browse"}
            </p>

            <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
              {["MP4", "PDF", "ZIP", "JPG", "MP3", "Any file"].map(t => (
                <span key={t} className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background:"rgba(255,255,255,0.05)", color: MUTED, border:`1px solid ${BORDER}` }}>
                  {t}
                </span>
              ))}
            </div>

            <button
              type="button"
              className="relative mt-6 flex items-center gap-2 rounded-[14px] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow:"0 0 20px rgba(167,139,250,0.3)" }}
            >
              <Upload className="h-4 w-4" /> Browse Files
            </button>

            <p className="relative mt-3 text-xs" style={{ color: MUTED }}>No file size limit</p>

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleInputChange}
              accept="*/*"
            />
          </div>
        ) : (
          /* ── File preview card ── */
          <div className="rounded-[22px] p-6"
            style={{ background:"linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border:`1px solid ${BORDER}` }}>

            <div className="flex items-start gap-4">
              {/* Icon or image preview */}
              <div className="relative shrink-0">
                {selected.preview ? (
                  <img
                    src={selected.preview}
                    alt="preview"
                    className="h-16 w-16 rounded-[12px] object-cover"
                    style={{ border:`1px solid rgba(255,255,255,0.1)` }}
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-[12px]"
                    style={{ background:`${fileColor}18`, border:`1px solid ${fileColor}30` }}>
                    <FileIcon className="h-7 w-7" style={{ color: fileColor }} />
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-white">{selected.file.name}</p>
                <p className="mt-1 text-xs" style={{ color: SUBTEXT }}>
                  {selected.file.type || "Unknown type"} · {formatBytes(selected.file.size)}
                </p>

                {/* Progress bar */}
                {loading && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span style={{ color: MUTED }}>Uploading…</span>
                      <span style={{ color: PURPLE }}>{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background:"rgba(255,255,255,0.08)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{ width:`${progress}%`, background:`linear-gradient(90deg,${PURPLE_D},${PURPLE})` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Remove button */}
              {!loading && (
                <button
                  onClick={removeFile}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] transition hover:bg-red-500/20"
                  style={{ color:"#f87171" }}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Upload button */}
            {!loading && (
              <button
                onClick={handleUpload}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-[16px] py-3.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.99]"
                style={{ background:`linear-gradient(135deg,${PURPLE_D},${PURPLE})`, boxShadow:"0 0 24px rgba(167,139,250,0.35)" }}
              >
                <Upload className="h-4 w-4" /> Upload File
              </button>
            )}

            {/* Change file */}
            {!loading && (
              <button
                onClick={() => { removeFile(); setTimeout(() => inputRef.current?.click(), 50); }}
                className="mt-2 w-full rounded-[16px] py-2.5 text-sm font-semibold transition hover:opacity-80"
                style={{ color: MUTED }}
              >
                Choose a different file
              </button>
            )}

            <input ref={inputRef} type="file" className="hidden" onChange={handleInputChange} accept="*/*" />
          </div>
        )}

        {/* File type info */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Film,        label: "Videos",   types: "MP4, WebM, MKV", color: "#a78bfa" },
            { icon: Image,       label: "Images",   types: "JPG, PNG, GIF",  color: "#60a5fa" },
            { icon: Music,       label: "Audio",    types: "MP3, WAV, OGG",  color: "#34d399" },
            { icon: FileArchive, label: "Archives", types: "ZIP, RAR, 7Z",   color: "#f59e0b" },
          ].map(t => (
            <div key={t.label} className="rounded-[16px] p-4"
              style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${BORDER}` }}>
              <div className="grid h-8 w-8 place-items-center rounded-[10px] mb-2.5"
                style={{ background:`${t.color}18`, border:`1px solid ${t.color}25` }}>
                <t.icon className="h-4 w-4" style={{ color: t.color }} />
              </div>
              <p className="text-xs font-semibold text-white">{t.label}</p>
              <p className="mt-0.5 text-[10px]" style={{ color: MUTED }}>{t.types}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Copy Files Section */}
      <CopyFileSection />
    </DashboardLayout>
  );
}

function CopyFileSection() {
  const [url, setUrl] = useState("");
  const [copying, setCopying] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setResult(null);
    setCopying(true);
    try {
      const res = await apiFetch<{ success: boolean; message: string; data?: { share_url?: string } }>("/api/files/copy", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });
      const shareUrl = res.data?.share_url;
      setResult({ success: true, message: shareUrl ? `${res.message} Share link: ${shareUrl}` : res.message });
      setUrl("");
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Copy failed." });
    }
    setCopying(false);
  };

  return (
    <div className="mt-6 rounded-[22px] p-6" style={{ background: "linear-gradient(145deg,#0f1120 0%,#0b0c14 100%)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h3 className="text-sm font-bold text-white mb-1">Copy Files (Vidora to Vidora)</h3>
      <p className="text-xs mb-4" style={{ color: "#64748b" }}>Paste a Vidora share link to copy the file to your account.</p>
      <form onSubmit={handleCopy} className="flex gap-3">
        <input
          value={url} onChange={e => setUrl(e.target.value)} required
          placeholder="Enter the file URL or share token"
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }}
        />
        <button type="submit" disabled={copying || !url.trim()}
          className="rounded-xl px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)" }}>
          {copying ? "Copying..." : "Submit"}
        </button>
      </form>
      {result && (
        <p className="mt-3 text-xs" style={{ color: result.success ? "#5eead4" : "#f87171" }}>{result.message}</p>
      )}
    </div>
  );
}
