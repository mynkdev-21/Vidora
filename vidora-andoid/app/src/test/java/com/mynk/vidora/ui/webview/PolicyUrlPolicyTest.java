package com.mynk.vidora.ui.webview;

import org.junit.Test;
import static org.junit.Assert.*;

public class PolicyUrlPolicyTest {
    private static final String BASE = "https://vidora.app/";

    @Test public void approvedWebOriginAndPaths() {
        assertTrue(PolicyUrlPolicy.isEmbeddedUrl("https://vidora.app/privacy", BASE, false));
        assertTrue(PolicyUrlPolicy.isEmbeddedUrl("https://VIDORA.APP/help?lang=en", BASE, false));
        assertTrue(PolicyUrlPolicy.isEmbeddedUrl("http://10.0.2.2:8080/terms", "http://10.0.2.2:8080/", true));
        assertTrue(PolicyUrlPolicy.isEmbeddedUrl("https://docs.example.org/policy", BASE, "docs.example.org", false));
        assertFalse(PolicyUrlPolicy.isEmbeddedUrl("https://docs.example.org:8443/policy", BASE, "docs.example.org", false));
    }

    @Test public void rejectUnapprovedAndUnsafeUrls() {
        for (String url : new String[] {
            "http://vidora.app/privacy", "https://vidora.app.evil.test/privacy",
            "https://evil.test/", "javascript:alert(1)", "file:///etc/passwd",
            "content://private/data", "https://user@vidora.app/privacy",
            "https://vidora.app:8443/privacy", "not a url"
        }) assertFalse(url, PolicyUrlPolicy.isEmbeddedUrl(url, BASE, false));
        assertFalse(PolicyUrlPolicy.isEmbeddedUrl("http://10.0.2.2:8080/help", "http://10.0.2.2:8080/", false));
    }

    @Test public void onlyHttpsCanOpenExternally() {
        assertTrue(PolicyUrlPolicy.isExternalBrowserUrl("https://example.org/guide"));
        assertFalse(PolicyUrlPolicy.isExternalBrowserUrl("http://example.org/guide"));
        assertFalse(PolicyUrlPolicy.isExternalBrowserUrl("intent://example.org"));
    }
}
