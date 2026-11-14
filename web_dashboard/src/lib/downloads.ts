/**
 * Desktop installer downloads.
 *
 * Installers are published as GitHub Release assets by
 * .github/workflows/build.yml (tauri-action, on every v* tag) instead of being
 * committed to git. Asset names follow tauri-action's pattern:
 * Vidora_<version>_<arch>.<ext>.
 *
 *   VITE_DESKTOP_VERSION        release version to link (default 1.0.0)
 *   VITE_DESKTOP_DOWNLOAD_BASE  override the download base URL, e.g. a CDN —
 *                               required if the GitHub repository is private.
 */
const VERSION: string = import.meta.env.VITE_DESKTOP_VERSION || "1.0.0";
const BASE: string = (
  import.meta.env.VITE_DESKTOP_DOWNLOAD_BASE ||
  `https://github.com/mynkdev-21/Vidora/releases/download/v${VERSION}`
).replace(/\/$/, "");

export const DESKTOP_VERSION = VERSION;

export const DESKTOP_FILES = {
  windows: `Vidora_${VERSION}_x64-setup.exe`,
  windowsMsi: `Vidora_${VERSION}_x64_en-US.msi`,
  macIntel: `Vidora_${VERSION}_x64.dmg`,
  macArm: `Vidora_${VERSION}_aarch64.dmg`,
} as const;

export const desktopDownloadUrl = (file: string) => `${BASE}/${file}`;
