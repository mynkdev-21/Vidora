package com.mynk.vidora.ui.profile;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.model.ProfileResponse;
import com.mynk.vidora.ui.about.AboutActivity;
import com.mynk.vidora.ui.auth.LoginActivity;
import com.mynk.vidora.ui.auth.SignupActivity;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.NavHelper;
import com.mynk.vidora.utils.PrefsManager;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ProfileActivity extends AppCompatActivity {

    private TextView tvName, tvEmail, tvInitial;
    private TextView tvStatVideos, tvStatViews, tvStatSaved;
    private LinearLayout layoutLoggedIn, layoutLoggedOut;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);
        FullScreenHelper.enable(this);
        NavHelper.setup(this);

        PrefsManager prefs = new PrefsManager(this);

        tvName = findViewById(R.id.tv_profile_name);
        tvEmail = findViewById(R.id.tv_profile_email);
        tvInitial = findViewById(R.id.tv_profile_initial);
        tvStatVideos = findViewById(R.id.tv_stat_videos);
        tvStatViews = findViewById(R.id.tv_stat_views);
        tvStatSaved = findViewById(R.id.tv_stat_saved);
        layoutLoggedIn = findViewById(R.id.layout_logged_in);
        layoutLoggedOut = findViewById(R.id.layout_logged_out);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        if (prefs.isLoggedIn()) {
            // Show logged in state
            layoutLoggedIn.setVisibility(View.VISIBLE);
            layoutLoggedOut.setVisibility(View.GONE);

            String name = prefs.getUserName();
            tvName.setText(name.isEmpty() ? "User" : name);
            tvEmail.setText(prefs.getUserEmail());
            tvInitial.setText(name.isEmpty() ? "U" : String.valueOf(name.charAt(0)).toUpperCase());

            loadProfile();

            // Show verification banner if not verified
            checkVerification();

            // Go Premium
            findViewById(R.id.btn_go_premium).setOnClickListener(v ->
                startActivity(new Intent(this, com.mynk.vidora.ui.subscription.SubscriptionActivity.class))
            );

            // Notification toggle
            setupNotificationToggle();

            // Visit Dashboard
            findViewById(R.id.btn_visit_dashboard).setOnClickListener(v -> {
                // Fetch dashboard URL from settings
                ApiClient.getService().getAppSettings().enqueue(new retrofit2.Callback<java.util.Map<String, Object>>() {
                    @Override
                    public void onResponse(retrofit2.Call<java.util.Map<String, Object>> call, retrofit2.Response<java.util.Map<String, Object>> response) {
                        String dashboardUrl = "http://10.59.203.78:8080/dashboard";
                        if (response.isSuccessful() && response.body() != null) {
                            Object dataObj = response.body().get("data");
                            if (dataObj instanceof java.util.Map) {
                                java.util.Map<String, Object> data = (java.util.Map<String, Object>) dataObj;
                                if (data.get("dashboard_url") != null) {
                                    dashboardUrl = String.valueOf(data.get("dashboard_url"));
                                }
                            }
                        }
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(dashboardUrl));
                        startActivity(browserIntent);
                    }

                    @Override
                    public void onFailure(retrofit2.Call<java.util.Map<String, Object>> call, Throwable t) {
                        // Do nothing if API fails — no fallback
                    }
                });
            });

            // Privacy
            findViewById(R.id.btn_privacy).setOnClickListener(v ->
                startActivity(new Intent(this, com.mynk.vidora.ui.webview.PrivacyActivity.class))
            );

            // Help & Support
            findViewById(R.id.btn_help).setOnClickListener(v ->
                startActivity(new Intent(this, com.mynk.vidora.ui.webview.HelpActivity.class))
            );

            // About
            findViewById(R.id.btn_about).setOnClickListener(v ->
                startActivity(new Intent(this, AboutActivity.class))
            );

            // Downloads
            findViewById(R.id.btn_downloads).setOnClickListener(v ->
                startActivity(new Intent(this, com.mynk.vidora.ui.downloads.DownloadsActivity.class))
            );

            // Sign out
            findViewById(R.id.btn_signout).setOnClickListener(v -> {
                prefs.clear();
                ApiClient.setAccessToken(null);
                recreate(); // refresh to show logged out state
            });
        } else {
            // Show logged out state — login/signup buttons
            layoutLoggedIn.setVisibility(View.GONE);
            layoutLoggedOut.setVisibility(View.VISIBLE);

            findViewById(R.id.btn_login).setOnClickListener(v ->
                startActivity(new Intent(this, LoginActivity.class))
            );
            findViewById(R.id.btn_signup).setOnClickListener(v ->
                startActivity(new Intent(this, SignupActivity.class))
            );
            findViewById(R.id.btn_privacy_out).setOnClickListener(v ->
                startActivity(new Intent(this, com.mynk.vidora.ui.webview.PrivacyActivity.class))
            );
            findViewById(R.id.btn_about_out).setOnClickListener(v ->
                startActivity(new Intent(this, AboutActivity.class))
            );
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        PrefsManager prefs = new PrefsManager(this);
        if (prefs.isLoggedIn() && layoutLoggedIn.getVisibility() == View.GONE) {
            recreate();
        }
    }

    private void checkVerification() {
        android.widget.LinearLayout banner = findViewById(R.id.banner_verify_profile);
        ApiClient.getService().getProfile().enqueue(new Callback<ProfileResponse>() {
            @Override
            public void onResponse(Call<ProfileResponse> call, Response<ProfileResponse> response) {
                if (response.isSuccessful() && response.body() != null && response.body().data != null) {
                    if (response.body().data.user.isVerified == 0) {
                        banner.setVisibility(android.view.View.VISIBLE);
                        findViewById(R.id.btn_verify_profile).setOnClickListener(v -> {
                            v.setEnabled(false);
                            ApiClient.getService().resendVerification().enqueue(new Callback<java.util.Map<String, Object>>() {
                                @Override
                                public void onResponse(Call<java.util.Map<String, Object>> c, Response<java.util.Map<String, Object>> r) {
                                    ((android.widget.TextView) v).setText("✓ Sent");
                                    android.widget.Toast.makeText(ProfileActivity.this, "Verification email sent! Check your inbox.", android.widget.Toast.LENGTH_LONG).show();
                                }
                                @Override
                                public void onFailure(Call<java.util.Map<String, Object>> c, Throwable t) {
                                    v.setEnabled(true);
                                }
                            });
                        });
                    }
                }
            }
            @Override
            public void onFailure(Call<ProfileResponse> call, Throwable t) {}
        });
    }

    private void loadProfile() {
        ApiClient.getService().getProfile().enqueue(new Callback<ProfileResponse>() {
            @Override
            public void onResponse(Call<ProfileResponse> call, Response<ProfileResponse> response) {
                if (response.isSuccessful() && response.body() != null && response.body().data != null) {
                    ProfileResponse.UserProfile user = response.body().data.user;
                    tvName.setText(user.name != null ? user.name : "User");
                    tvEmail.setText(user.email != null ? user.email : "");
                    tvInitial.setText(user.name != null && !user.name.isEmpty()
                        ? String.valueOf(user.name.charAt(0)).toUpperCase() : "U");
                    tvStatVideos.setText(String.valueOf(user.totalFiles));
                    tvStatViews.setText(formatCount(user.totalViews));
                    tvStatSaved.setText(formatEarnings(user.totalEarnings));

                    // Load avatar image if available
                    if (user.avatarUrl != null && !user.avatarUrl.isEmpty()) {
                        android.widget.ImageView ivAvatar = findViewById(R.id.iv_profile_avatar);
                        String avatarPath = user.avatarUrl.startsWith("/") ? user.avatarUrl.substring(1) : user.avatarUrl;
                        String fullUrl = avatarPath.startsWith("http") ? avatarPath : com.mynk.vidora.utils.Constants.BASE_URL + avatarPath;
                        com.bumptech.glide.Glide.with(ProfileActivity.this)
                            .load(fullUrl)
                            .circleCrop()
                            .into(ivAvatar);
                        ivAvatar.setVisibility(View.VISIBLE);
                        tvInitial.setVisibility(View.GONE);
                    }

                    // Sync premium status from server
                    com.mynk.vidora.billing.SubscriptionManager.getInstance().syncPremium(user.getIsPremium());
                }
            }

            @Override
            public void onFailure(Call<ProfileResponse> call, Throwable t) {}
        });
    }

    private String formatCount(long count) {
        if (count >= 1_000_000) return String.format("%.1fM", count / 1_000_000.0);
        if (count >= 1_000) return String.format("%.1fK", count / 1_000.0);
        return String.valueOf(count);
    }

    private String formatEarnings(double amount) {
        if (amount >= 1_000_000) return "$" + String.format("%.1fM", amount / 1_000_000.0);
        if (amount >= 1_000) return "$" + String.format("%.1fK", amount / 1_000.0);
        return "$" + String.format("%.2f", amount);
    }

    private void setupNotificationToggle() {
        androidx.appcompat.widget.SwitchCompat switchNotif = findViewById(R.id.switch_notifications);
        android.content.SharedPreferences prefs = getSharedPreferences("vidora_settings", MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("notifications_enabled", true);
        switchNotif.setChecked(enabled);

        switchNotif.setOnCheckedChangeListener((buttonView, isChecked) -> {
            prefs.edit().putBoolean("notifications_enabled", isChecked).apply();
            if (isChecked) {
                // Enable FCM auto-init — will receive messages again
                com.google.firebase.messaging.FirebaseMessaging.getInstance().setAutoInitEnabled(true);
                android.widget.Toast.makeText(this, "Notifications enabled", android.widget.Toast.LENGTH_SHORT).show();
            } else {
                // Disable FCM auto-init + delete token — no more notifications
                com.google.firebase.messaging.FirebaseMessaging.getInstance().setAutoInitEnabled(false);
                com.google.firebase.messaging.FirebaseMessaging.getInstance().deleteToken();
                android.widget.Toast.makeText(this, "Notifications disabled", android.widget.Toast.LENGTH_SHORT).show();
            }
        });
    }
}
