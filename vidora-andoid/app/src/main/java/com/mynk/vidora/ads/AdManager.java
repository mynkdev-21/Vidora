package com.mynk.vidora.ads;

import android.app.Activity;
import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.AdError;
import com.mynk.vidora.utils.Constants;

/**
 * Singleton Ad Manager — preloads rewarded ad at app start.
 * Call AdManager.getInstance().preload(context) from SplashActivity.
 * Call AdManager.getInstance().showRewardedAd(activity, callback) from FileDetailActivity.
 */
public class AdManager {

    private static final String TAG = "AdManager";
    private static AdManager instance;

    private RewardedAd rewardedAd;
    private boolean isLoading = false;

    private AdManager() {}

    public static AdManager getInstance() {
        if (instance == null) {
            instance = new AdManager();
        }
        return instance;
    }

    /**
     * Preload rewarded ad — call from SplashActivity
     */
    public void preload(Context context) {
        if (!AdsConfig.isAdsEnabled()) return;
        loadAd(context);
    }

    /**
     * Check if ad is ready
     */
    public boolean isAdReady() {
        return rewardedAd != null;
    }

    /**
     * Show rewarded ad. Callback fires only after user earns reward.
     * If ad fails to show, onAdNotAvailable is called.
     */
    public void showRewardedAd(Activity activity, AdCallback callback) {
        if (rewardedAd == null) {
            callback.onAdNotAvailable();
            // Try loading again for next time
            loadAd(activity);
            return;
        }

        rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                // Ad closed without reward (user skipped or closed early)
                rewardedAd = null;
                loadAd(activity); // preload next ad
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                Log.e(TAG, "Ad failed to show: " + adError.getMessage());
                rewardedAd = null;
                callback.onAdNotAvailable();
                loadAd(activity);
            }
        });

        rewardedAd.show(activity, rewardItem -> {
            Log.d(TAG, "Reward earned: " + rewardItem.getAmount() + " " + rewardItem.getType());
            rewardedAd = null;
            loadAd(activity); // preload next ad
            callback.onRewarded();
        });
    }

    private void loadAd(Context context) {
        if (isLoading) return;
        if (!AdsConfig.isAdsEnabled()) return;

        String rid = AdsConfig.getRewardedId();
        if (rid == null || rid.isEmpty()) {
            // ID not ready yet — retry after 3s
            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> loadAd(context), 3000);
            return;
        }

        isLoading = true;
        AdRequest adRequest = new AdRequest.Builder().build();
        RewardedAd.load(context, rid, adRequest, new RewardedAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull RewardedAd ad) {
                rewardedAd = ad;
                isLoading = false;
                Log.d(TAG, "Rewarded ad preloaded ✅");
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError error) {
                rewardedAd = null;
                isLoading = false;
                Log.e(TAG, "Rewarded ad failed to preload: " + error.getMessage());
            }
        });
    }

    public interface AdCallback {
        void onRewarded();       // User watched ad — unlock file
        void onAdNotAvailable(); // Ad not loaded — show error
    }
}
