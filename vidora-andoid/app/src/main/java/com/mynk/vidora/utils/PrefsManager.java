package com.mynk.vidora.utils;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Simple SharedPreferences wrapper for auth tokens and user data.
 */
public class PrefsManager {

    private final SharedPreferences prefs;

    public PrefsManager(Context context) {
        prefs = context.getSharedPreferences(Constants.PREFS_NAME, Context.MODE_PRIVATE);
    }

    // ── Token management ──────────────────────────────────────────────────────
    public void saveTokens(String accessToken, String refreshToken) {
        prefs.edit()
            .putString(Constants.PREF_ACCESS_TOKEN, accessToken)
            .putString(Constants.PREF_REFRESH_TOKEN, refreshToken)
            .apply();
    }

    public String getAccessToken() {
        return prefs.getString(Constants.PREF_ACCESS_TOKEN, null);
    }

    public String getRefreshToken() {
        return prefs.getString(Constants.PREF_REFRESH_TOKEN, null);
    }

    // ── User data ─────────────────────────────────────────────────────────────
    public void saveUser(String id, String name, String email) {
        prefs.edit()
            .putString(Constants.PREF_USER_ID, id)
            .putString(Constants.PREF_USER_NAME, name)
            .putString(Constants.PREF_USER_EMAIL, email)
            .apply();
    }

    public String getUserName() {
        return prefs.getString(Constants.PREF_USER_NAME, "");
    }

    public String getUserEmail() {
        return prefs.getString(Constants.PREF_USER_EMAIL, "");
    }

    public String getUserId() {
        return prefs.getString(Constants.PREF_USER_ID, "");
    }

    public boolean isLoggedIn() {
        return getAccessToken() != null && !getAccessToken().isEmpty();
    }

    // Static helper for quick token access
    public static String getStaticToken(Context context) {
        return new PrefsManager(context).getAccessToken();
    }

    // ── Logout ────────────────────────────────────────────────────────────────
    public void clear() {
        prefs.edit().clear().apply();
    }
}
