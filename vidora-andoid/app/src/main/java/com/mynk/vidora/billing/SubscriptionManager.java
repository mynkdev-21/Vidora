package com.mynk.vidora.billing;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.annotation.NonNull;

import com.android.billingclient.api.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Google Play Billing subscription manager.
 * Plans:
 *   - vidora_monthly: ₹199/month, 3-day free trial
 *   - vidora_yearly: ₹1499/year, 7-day free trial
 * 
 * Benefit: Ad-free experience
 * 
 * Setup in Google Play Console:
 *   1. Go to Monetize → Products → Subscriptions
 *   2. Create "vidora_monthly" — ₹199, 1 month, 3-day trial
 *   3. Create "vidora_yearly" — ₹1499, 1 year, 7-day trial
 */
public class SubscriptionManager implements PurchasesUpdatedListener {

    private static final String TAG = "Billing";
    private static final String PREFS_NAME = "vidora_subscription";
    private static final String KEY_IS_PREMIUM = "is_premium";

    public static final String PLAN_MONTHLY = "vidora_monthly";
    public static final String PLAN_QUARTERLY = "vidora_quarterly";
    public static final String PLAN_YEARLY = "vidora_yearly";

    private static SubscriptionManager instance;
    private BillingClient billingClient;
    private Context appContext;
    private SubscriptionCallback callback;

    private boolean isPremium = false;

    public interface SubscriptionCallback {
        void onPurchaseSuccess();
        void onPurchaseFailed(String error);
    }

    private SubscriptionManager() {}

    public static SubscriptionManager getInstance() {
        if (instance == null) instance = new SubscriptionManager();
        return instance;
    }

    /**
     * Initialize billing client. Call from App.onCreate()
     */
    public void init(Context context) {
        appContext = context.getApplicationContext();
        isPremium = getPrefs().getBoolean(KEY_IS_PREMIUM, false);

        try {
            billingClient = BillingClient.newBuilder(appContext)
                .setListener(this)
                .enablePendingPurchases()
                .build();

            billingClient.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult result) {
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        Log.d(TAG, "Billing connected");
                        checkExistingSubscription();
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    Log.w(TAG, "Billing disconnected");
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Billing init failed: " + e.getMessage());
        }
    }

    /**
     * Check if user has active subscription
     */
    public boolean isPremium() {
        return isPremium;
    }

    /**
     * Launch subscription purchase flow
     */
    public void subscribe(Activity activity, String planId, SubscriptionCallback callback) {
        this.callback = callback;

        if (billingClient == null || !billingClient.isReady()) {
            callback.onPurchaseFailed("Billing not ready. Try again.");
            return;
        }

        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        products.add(QueryProductDetailsParams.Product.newBuilder()
            .setProductId(planId)
            .setProductType(BillingClient.ProductType.SUBS)
            .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(products)
            .build();

        billingClient.queryProductDetailsAsync(params, (result, productDetailsList) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || productDetailsList.isEmpty()) {
                activity.runOnUiThread(() -> callback.onPurchaseFailed("Subscription not available."));
                return;
            }

            ProductDetails productDetails = productDetailsList.get(0);
            List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
            if (offers == null || offers.isEmpty()) {
                activity.runOnUiThread(() -> callback.onPurchaseFailed("No offers available."));
                return;
            }

            BillingFlowParams.ProductDetailsParams productDetailsParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails)
                .setOfferToken(offers.get(0).getOfferToken())
                .build();

            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(List.of(productDetailsParams))
                .build();

            activity.runOnUiThread(() -> billingClient.launchBillingFlow(activity, flowParams));
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                handlePurchase(purchase);
            }
        } else if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (callback != null) callback.onPurchaseFailed("Purchase cancelled.");
        } else {
            if (callback != null) callback.onPurchaseFailed("Purchase failed.");
        }
    }

    private void handlePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            // Acknowledge purchase
            if (!purchase.isAcknowledged()) {
                AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();
                billingClient.acknowledgePurchase(ackParams, result -> {
                    Log.d(TAG, "Purchase acknowledged");
                });
            }

            // Grant premium
            setPremium(true);
            if (callback != null) callback.onPurchaseSuccess();
        }
    }

    /**
     * Check existing subscriptions on app start (Google Play + Server)
     */
    private void checkExistingSubscription() {
        // Check Google Play subscriptions
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),
            (result, purchases) -> {
                boolean hasActive = false;
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    for (Purchase purchase : purchases) {
                        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                            hasActive = true;
                            break;
                        }
                    }
                }
                if (hasActive) {
                    setPremium(true);
                } else {
                    // Check server (admin may have granted premium)
                    checkServerPremium();
                }
                Log.d(TAG, "Subscription status: " + (isPremium ? "PREMIUM" : "FREE"));
            }
        );
    }

    /**
     * Check premium status from server (admin-granted premium)
     */
    private void checkServerPremium() {
        try {
            com.mynk.vidora.api.ApiClient.getService().getProfile().enqueue(new retrofit2.Callback<com.mynk.vidora.model.ProfileResponse>() {
                @Override
                public void onResponse(retrofit2.Call<com.mynk.vidora.model.ProfileResponse> call, retrofit2.Response<com.mynk.vidora.model.ProfileResponse> response) {
                    if (response.isSuccessful() && response.body() != null && response.body().data != null) {
                        boolean serverPremium = response.body().data.user.getIsPremium();
                        setPremium(serverPremium);
                    }
                }

                @Override
                public void onFailure(retrofit2.Call<com.mynk.vidora.model.ProfileResponse> call, Throwable t) {}
            });
        } catch (Exception e) {
            Log.w(TAG, "Server premium check failed: " + e.getMessage());
        }
    }

    private void setPremium(boolean premium) {
        isPremium = premium;
        getPrefs().edit().putBoolean(KEY_IS_PREMIUM, premium).apply();
    }

    /**
     * Sync premium status from server profile response.
     * Call from ProfileActivity after loading profile.
     */
    public void syncPremium(boolean serverPremium) {
        if (serverPremium != isPremium) {
            setPremium(serverPremium);
            Log.d(TAG, "Premium synced from server: " + serverPremium);
        }
    }

    private SharedPreferences getPrefs() {
        return appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
