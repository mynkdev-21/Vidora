package com.mynk.vidora.utils;

/**
 * App-wide constants and API configuration.
 * Change BASE_URL before production deployment.
 */
public final class Constants {

    private Constants() {} // no instances

    // ── API Configuration ─────────────────────────────────────────────────────
    public static final String BASE_URL = "http://10.95.58.78:5001/"; // Local network IP
    // For real device on same WiFi: use your machine's local IP e.g. "http://192.168.1.x:5001/"
    // For production: "https://api.vidora.app/"

    public static final String API_KEY = "vdr_live_3c7e1a9f2b4d8056cf5e0a1b7d2c4f8e"; // mobile key

    // ── SharedPreferences ─────────────────────────────────────────────────────
    public static final String PREFS_NAME = "vidora_prefs";
    public static final String PREF_ACCESS_TOKEN = "access_token";
    public static final String PREF_REFRESH_TOKEN = "refresh_token";
    public static final String PREF_USER_NAME = "user_name";
    public static final String PREF_USER_EMAIL = "user_email";
    public static final String PREF_USER_ID = "user_id";

    // ── Deep Link Scheme ──────────────────────────────────────────────────────
    public static final String DEEP_LINK_SCHEME = "vidora";
    public static final String DEEP_LINK_HOST_VIEW = "view";
    public static final String DEEP_LINK_HOST_DOWNLOAD = "download";

    // ── AdMob IDs ─────────────────────────────────────────────────────────────
    // These are fallback values — real IDs fetched dynamically from API via AdsConfig
    public static final String ADMOB_APP_ID          = "ca-app-pub-3940256099942544~3347511713";
    public static final String AD_REWARDED           = "ca-app-pub-3940256099942544/5224354917";
    public static final String AD_INTERSTITIAL       = "ca-app-pub-3940256099942544/1033173712";
    public static final String AD_BANNER             = "ca-app-pub-3940256099942544/6300978111";
    public static final String AD_NATIVE             = "ca-app-pub-3940256099942544/2247696110";
}
