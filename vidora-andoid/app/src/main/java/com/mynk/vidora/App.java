package com.mynk.vidora;

import android.app.Application;

import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.firebase.FirebaseApp;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.utils.RemoteConfigManager;

import java.util.Arrays;
import java.util.List;

public class App extends Application {
    @Override
    public void onCreate() {
        super.onCreate();

        // Initialize Firebase
        FirebaseApp.initializeApp(this);

        // Initialize Remote Config (fetches base_url dynamically)
        RemoteConfigManager.init();

        // Initialize API client with app context (for banned detection)
        ApiClient.init(this);

        // Fetch ads configuration from API
        com.mynk.vidora.ads.AdsConfig.fetch(this);

        // Initialize Google Play Billing (subscription)
        com.mynk.vidora.billing.SubscriptionManager.getInstance().init(this);

        // Set test device IDs (check Logcat for your device hash)
        List<String> testDeviceIds = Arrays.asList(
            "418CEE380EF700FE526EBB4831CC8B23" // Nothing Phone 1
        );

        RequestConfiguration config = new RequestConfiguration.Builder()
            .setTestDeviceIds(testDeviceIds)
            .build();
        MobileAds.setRequestConfiguration(config);

        // Initialize AdMob
        MobileAds.initialize(this, initializationStatus -> {});
    }
}
