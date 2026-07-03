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
 *   - base_url: "http://10.95.58.78:5001/"  (change to production URL later)
 *   - api_key: "vdr_live_3c7e1a9f2b4d8056cf5e0a1b7d2c4f8e"
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
        return url.isEmpty() ? Constants.BASE_URL : url;
    }
}
