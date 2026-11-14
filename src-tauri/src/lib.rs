//! Vidora desktop shell.
//!
//! The window starts on the bundled loader page (dist/index.html), which reads
//! the dashboard URL from Firebase Remote Config and navigates to it. Every
//! navigation is checked here:
//!   * the bundled app assets and HTTPS pages on trusted hosts load in-app;
//!   * anything else (external links, popups) is opened in the user's own
//!     browser and blocked in the webview.
//!
//! This replaces the backend's former /api/open-url endpoint, which ran a shell
//! command on the *server* (audit finding F1).

use tauri::{webview::NewWindowResponse, AppHandle, Url, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// Hosts (and their subdomains) allowed to load inside the app window.
/// Override at build time: `VIDORA_TRUSTED_HOSTS=vidora.app,dashboard.example.com`.
const DEFAULT_TRUSTED_HOSTS: &str = "vidora.app";

fn trusted_hosts() -> Vec<String> {
    parse_hosts(option_env!("VIDORA_TRUSTED_HOSTS").unwrap_or(DEFAULT_TRUSTED_HOSTS))
}

fn parse_hosts(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(|h| h.trim().trim_end_matches('.').to_ascii_lowercase())
        .filter(|h| !h.is_empty())
        .collect()
}

/// The bundled loader page: tauri://localhost (macOS/Linux) or
/// http(s)://tauri.localhost (Windows).
fn is_app_asset(url: &Url) -> bool {
    match url.scheme() {
        "tauri" => url.host_str() == Some("localhost"),
        "http" | "https" => url.host_str() == Some("tauri.localhost"),
        _ => false,
    }
}

fn is_trusted_remote(url: &Url, hosts: &[String]) -> bool {
    if url.scheme() != "https" {
        return false;
    }
    let Some(host) = url.host_str() else { return false };
    let host = host.to_ascii_lowercase();
    hosts
        .iter()
        .any(|trusted| host == *trusted || host.ends_with(&format!(".{trusted}")))
}

/// Whether `url` may load inside the app window.
pub fn allowed_in_app(url: &Url, hosts: &[String]) -> bool {
    url.as_str() == "about:blank" || is_app_asset(url) || is_trusted_remote(url, hosts)
}

/// Opens web and mail links in the system browser/mail client on this machine.
/// Other schemes (file:, javascript:, custom protocols) are ignored.
fn open_externally(app: &AppHandle, url: &Url) {
    if matches!(url.scheme(), "http" | "https" | "mailto") {
        if let Err(err) = app.opener().open_url(url.as_str(), None::<&str>) {
            eprintln!("failed to open external link: {err}");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let hosts = trusted_hosts();
            let config = app
                .config()
                .app
                .windows
                .iter()
                .find(|w| w.label == "main")
                .cloned()
                .expect("tauri.conf.json must define the \"main\" window");

            let nav_app = app.handle().clone();
            let popup_app = app.handle().clone();

            WebviewWindowBuilder::from_config(app.handle(), &config)?
                .on_navigation(move |url| {
                    if allowed_in_app(url, &hosts) {
                        true
                    } else {
                        open_externally(&nav_app, url);
                        false
                    }
                })
                .on_new_window(move |url, _features| {
                    // target="_blank" / window.open → system browser, never a new webview.
                    open_externally(&popup_app, &url);
                    NewWindowResponse::Deny
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn url(s: &str) -> Url {
        Url::parse(s).unwrap()
    }

    fn hosts() -> Vec<String> {
        parse_hosts("vidora.app, Dashboard.Example.com.")
    }

    #[test]
    fn bundled_assets_load_in_app() {
        assert!(allowed_in_app(&url("tauri://localhost/index.html"), &hosts()));
        assert!(allowed_in_app(&url("https://tauri.localhost/index.html"), &hosts()));
        assert!(allowed_in_app(&url("http://tauri.localhost/"), &hosts()));
        assert!(allowed_in_app(&url("about:blank"), &hosts()));
    }

    #[test]
    fn trusted_https_hosts_and_subdomains_load_in_app() {
        assert!(allowed_in_app(&url("https://vidora.app/dashboard"), &hosts()));
        assert!(allowed_in_app(&url("https://app.vidora.app/"), &hosts()));
        assert!(allowed_in_app(&url("https://dashboard.example.com/x"), &hosts()));
    }

    #[test]
    fn untrusted_or_insecure_urls_are_blocked() {
        assert!(!allowed_in_app(&url("http://vidora.app/"), &hosts()), "plain http");
        assert!(!allowed_in_app(&url("https://evilvidora.app/"), &hosts()), "suffix without dot");
        assert!(!allowed_in_app(&url("https://vidora.app.evil.com/"), &hosts()), "trusted name as prefix");
        assert!(!allowed_in_app(&url("https://t.me/vidorasupport"), &hosts()));
        assert!(!allowed_in_app(&url("file:///etc/passwd"), &hosts()));
        assert!(!allowed_in_app(&url("tauri://evil/"), &hosts()));
        assert!(!allowed_in_app(&url("data:text/html,hi"), &hosts()));
    }
}
