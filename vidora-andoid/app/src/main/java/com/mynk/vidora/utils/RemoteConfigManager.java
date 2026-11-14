package com.mynk.vidora.utils;

import android.util.Log;

import com.google.firebase.remoteconfig.FirebaseRemoteConfig;
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings;

import java.util.HashMap;
import java.util.Map;

/**
 * Firebase Remote Config manager.
 * Fetches dynamic values like BASE_URL from Firebase console.
 * 
 * Setup in Firebase Console → Remote Config:
 *   - base_url: optional override of BuildConfig.API_BASE_URL (must be https:// in release)
 *   - api_key: "<MOBILE_CLIENT_KEY>"
 */
public class RemoteConfigManager {

    private static final String TAG = "RemoteConfig";
    private static FirebaseRemoteConfig remoteConfig;

    public static void init() {
        remoteConfig = FirebaseRemoteConfig.getInstance();

        FirebaseRemoteConfigSettings settings = new FirebaseRemoteConfigSettings.Builder()
            .setMinimumFetchIntervalInSeconds(3600) // 1 hour in production, 0 for debug
            .build();
        remoteConfig.setConfigSettingsAsync(settings);

        // Default values (used before first fetch)
        Map<String, Object> defaults = new HashMap<>();
        defaults.put("base_url", Constants.BASE_URL);
        remoteConfig.setDefaultsAsync(defaults);

        // Fetch and activate
        remoteConfig.fetchAndActivate().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                Log.d(TAG, "Remote config fetched. base_url=" + getBaseUrl());
                // Reset API client to use new base URL
                com.mynk.vidora.api.ApiClient.resetClient();
            } else {
                Log.w(TAG, "Remote config fetch failed, using defaults.");
            }
        });
    }

    public static String getBaseUrl() {
        if (remoteConfig == null) return Constants.BASE_URL;
        String url = remoteConfig.getString("base_url");
        if (url.isEmpty()) return Constants.BASE_URL;
        // Release builds only talk to the API over HTTPS, whatever Remote Config says.
        if (!com.mynk.vidora.BuildConfig.DEBUG && !url.startsWith("https://")) {
            Log.w(TAG, "Ignoring non-HTTPS base_url from Remote Config.");
            return Constants.BASE_URL;
        }
        return url.endsWith("/") ? url : url + "/";
    }
}
