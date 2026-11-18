package com.mynk.vidora.ui.webview;

import java.net.URI;

/** Only the configured Vidora web origin may run inside the policy WebViews. */
public final class PolicyUrlPolicy {
    private PolicyUrlPolicy() {}

    public static boolean isEmbeddedUrl(String candidate, String webBaseUrl, boolean debug) {
        return isEmbeddedUrl(candidate, webBaseUrl, "", debug);
    }

    public static boolean isEmbeddedUrl(String candidate, String webBaseUrl, String approvedHosts, boolean debug) {
        try {
            URI url = new URI(candidate);
            URI base = new URI(webBaseUrl);
            if (url.getUserInfo() != null || url.getHost() == null || base.getHost() == null) return false;
            boolean baseOrigin = url.getHost().equalsIgnoreCase(base.getHost()) && url.getPort() == base.getPort();
            boolean approved = false;
            if (!baseOrigin && approvedHosts != null) for (String host : approvedHosts.split(",")) {
                if (!host.isEmpty() && url.getHost().equalsIgnoreCase(host.trim()) && url.getPort() == -1) {
                    approved = true;
                    break;
                }
            }
            if (!baseOrigin && !approved) return false;
            if (!"https".equalsIgnoreCase(url.getScheme()) &&
                    !(debug && baseOrigin && "http".equalsIgnoreCase(url.getScheme()))) return false;
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

    public static boolean isExternalBrowserUrl(String candidate) {
        try {
            URI url = new URI(candidate);
            return "https".equalsIgnoreCase(url.getScheme()) && url.getHost() != null
                && url.getUserInfo() == null;
        } catch (Exception ignored) {
            return false;
        }
    }
}
