package com.mynk.vidora.ui.webview;

import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.mynk.vidora.BuildConfig;
import com.mynk.vidora.utils.Constants;

/** Shared navigation policy for the privacy, terms, and help pages. */
public final class PolicyWebView {
    private PolicyWebView() {}

    public static void configure(WebView view) {
        WebSettings settings = view.getSettings();
        // The configured Vidora website is a JavaScript app. Untrusted origins never render here.
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setDomStorageEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        view.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
                return intercept(webView, request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView webView, String url) {
                return intercept(webView, Uri.parse(url));
            }
        });
    }

    private static boolean intercept(WebView view, Uri uri) {
        String url = uri.toString();
        if (PolicyUrlPolicy.isEmbeddedUrl(url, Constants.WEB_BASE_URL, BuildConfig.POLICY_WEB_HOSTS, BuildConfig.DEBUG)) return false;
        if (PolicyUrlPolicy.isExternalBrowserUrl(url)) {
            try {
                view.getContext().startActivity(new Intent(Intent.ACTION_VIEW, uri)
                    .addCategory(Intent.CATEGORY_BROWSABLE));
            } catch (RuntimeException ignored) { /* No browser installed. */ }
        }
        return true;
    }

    public static void load(WebView view, String configuredUrl, String fallbackUrl) {
        String url = PolicyUrlPolicy.isEmbeddedUrl(configuredUrl, Constants.WEB_BASE_URL,
            BuildConfig.POLICY_WEB_HOSTS, BuildConfig.DEBUG) ? configuredUrl
            : PolicyUrlPolicy.isEmbeddedUrl(fallbackUrl, Constants.WEB_BASE_URL,
                BuildConfig.POLICY_WEB_HOSTS, BuildConfig.DEBUG) ? fallbackUrl : "about:blank";
        view.loadUrl(url);
    }
}
