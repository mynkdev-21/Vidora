package com.mynk.vidora.ads;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.mynk.vidora.api.ApiClient;

import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Fetches ad configuration from backend API.
 * Caches locally so ads work offline too.
 * Admin can toggle ads on/off and change IDs without app update.
 */
public class AdsConfig {

    private static final String TAG = "AdsConfig";
    private static final String PREFS_NAME = "vidora_ads_config";

    private static boolean adsEnabled = true;
    private static String bannerId = "";
    private static String rewardedId = "";
    private static String interstitialId = "";
    private static boolean fetched = false;

    /**
     * Fetch ads config from API. Call once on app start.
     */
    public static void fetch(Context context) {
        // Load cached values first
        loadFromCache(context);

        ApiClient.getService().getAppSettings().enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Object dataObj = response.body().get("data");
                    if (dataObj instanceof Map) {
                        Map<String, Object> data = (Map<String, Object>) dataObj;

                        if (data.get("ads_enabled") != null) {
                            adsEnabled = "true".equals(String.valueOf(data.get("ads_enabled")));
                        }
                        if (data.get("admob_banner_id") != null) {
                            String val = String.valueOf(data.get("admob_banner_id"));
                            if (!val.isEmpty()) bannerId = val;
                        }
                        if (data.get("admob_rewarded_id") != null) {
                            String val = String.valueOf(data.get("admob_rewarded_id"));
                            if (!val.isEmpty()) rewardedId = val;
                        }
                        if (data.get("admob_interstitial_id") != null) {
                            String val = String.valueOf(data.get("admob_interstitial_id"));
                            if (!val.isEmpty()) interstitialId = val;
                        }

                        fetched = true;
                        saveToCache(context);
                        Log.d(TAG, "Ads config fetched. enabled=" + adsEnabled);
                    }
                }
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {
                Log.w(TAG, "Failed to fetch ads config, using cached/defaults");
            }
        });
    }

    public static boolean isAdsEnabled() {
        // Premium users never see ads
        if (com.mynk.vidora.billing.SubscriptionManager.getInstance().isPremium()) return false;
        return adsEnabled;
    }
    public static String getBannerId() { return bannerId; }
    public static String getRewardedId() { return rewardedId; }
    public static String getInterstitialId() { return interstitialId; }

    private static void loadFromCache(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        adsEnabled = prefs.getBoolean("ads_enabled", true);
        bannerId = prefs.getString("banner_id", "");
        rewardedId = prefs.getString("rewarded_id", "");
        interstitialId = prefs.getString("interstitial_id", "");
    }

    private static void saveToCache(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean("ads_enabled", adsEnabled)
            .putString("banner_id", bannerId)
            .putString("rewarded_id", rewardedId)
            .putString("interstitial_id", interstitialId)
            .apply();
    }
}
