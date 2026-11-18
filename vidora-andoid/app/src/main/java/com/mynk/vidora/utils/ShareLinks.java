package com.mynk.vidora.utils;

import java.net.URI;
import java.net.URISyntaxException;

/** Parses only Vidora share links and opaque share tokens. */
public final class ShareLinks {
    private ShareLinks() {}

    public static String token(String input, String webBaseUrl) {
        if (input == null) return null;
        String value = input.trim();
        if (value.matches("[A-Za-z0-9_-]{10,64}")) return value;
        try {
            URI uri = new URI(value);
            String path = uri.getPath();
            String segment;
            if ("vidora".equalsIgnoreCase(uri.getScheme())
                    && ("view".equalsIgnoreCase(uri.getHost()) || "download".equalsIgnoreCase(uri.getHost()))) {
                segment = path == null ? "" : path.replaceFirst("^/", "");
            } else {
                URI expected = new URI(webBaseUrl);
                if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                        || !expected.getHost().equalsIgnoreCase(uri.getHost())
                        || uri.getPort() != expected.getPort()
                        || path == null || !path.startsWith("/v/")) return null;
                segment = path.substring(3);
            }
            return segment.matches("[A-Za-z0-9_-]{10,64}") ? segment : null;
        } catch (URISyntaxException | NullPointerException e) {
            return null;
        }
    }
}
