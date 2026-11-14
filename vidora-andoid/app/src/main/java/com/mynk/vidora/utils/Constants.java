package com.mynk.vidora.utils;

import com.mynk.vidora.BuildConfig;

/**
 * App-wide constants. Environment-specific values (API URL, client key, ad
 * IDs) come from BuildConfig — see app/build.gradle.kts. Nothing here should
 * be edited per environment.
 */
public final class Constants {

    private Constants() {} // no instances

    // ── API Configuration ─────────────────────────────────────────────────────
    /** Backend base URL (debug: local/emulator, release: production HTTPS). */
    public static final String BASE_URL = BuildConfig.API_BASE_URL;

    /** Web dashboard base URL, used for fallback pages (privacy, terms, help, reset). */
    public static final String WEB_BASE_URL = BuildConfig.WEB_BASE_URL;

    /**
     * Public client identifier sent as X-API-Key. It ships inside the APK and
     * is not a secret; the backend authorises users with their JWT.
     */
    public static final String API_KEY = BuildConfig.API_KEY;

    // ── SharedPreferences ─────────────────────────────────────────────────────
    /** Holds auth tokens — excluded from cloud backup / device transfer. */
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

    // ── AdMob test units (Google's official samples) — used in debug builds ──
    // Release builds use the unit IDs configured in the admin panel (AdsConfig).
    public static final String TEST_AD_BANNER       = "ca-app-pub-3940256099942544/6300978111";
    public static final String TEST_AD_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712";
    public static final String TEST_AD_REWARDED     = "ca-app-pub-3940256099942544/5224354917";
}
