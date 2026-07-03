package com.mynk.vidora.ui.splash;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.remoteconfig.FirebaseRemoteConfig;
import com.mynk.vidora.R;
import com.mynk.vidora.ads.AdManager;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.ui.home.HomeActivity;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.PrefsManager;
import com.mynk.vidora.utils.RemoteConfigManager;

public class SplashActivity extends AppCompatActivity {

    private boolean navigated = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);
        FullScreenHelper.enable(this);

        // Fetch ads config from API first, then preload rewarded ad
        com.mynk.vidora.ads.AdsConfig.fetch(this);

        // Preload rewarded ad during splash (will use ID once AdsConfig is fetched)
        AdManager.getInstance().preload(this);

        // Fetch Remote Config (base_url) then proceed
        FirebaseRemoteConfig.getInstance().fetchAndActivate().addOnCompleteListener(task -> {
            // Reset API client with new base URL
            ApiClient.resetClient();
            proceedToHome();
        });

        // Timeout fallback — if Remote Config takes too long (5 sec), proceed anyway
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            proceedToHome();
        }, 5000);
    }

    private void proceedToHome() {
        if (navigated) return;
        navigated = true;

        PrefsManager prefs = new PrefsManager(this);
        if (prefs.isLoggedIn()) {
            ApiClient.setAccessToken(prefs.getAccessToken());
        }

        startActivity(new Intent(this, HomeActivity.class));
        finish();
    }
}
