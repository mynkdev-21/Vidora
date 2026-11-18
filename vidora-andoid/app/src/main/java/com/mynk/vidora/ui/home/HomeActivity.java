package com.mynk.vidora.ui.home;

import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.mynk.vidora.R;
import com.mynk.vidora.ads.AdsConfig;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.model.FileListResponse;
import com.mynk.vidora.ui.auth.LoginActivity;
import com.mynk.vidora.ui.filedetail.FileDetailActivity;
import com.mynk.vidora.ui.notifications.NotificationsActivity;
import com.mynk.vidora.ui.profile.ProfileActivity;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.HistoryManager;
import com.mynk.vidora.utils.NavHelper;
import com.mynk.vidora.utils.PrefsManager;
import com.mynk.vidora.ui.paste.HistoryAdapter;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HomeActivity extends AppCompatActivity {

    private EditText etLink;
    private HistoryAdapter historyAdapter;
    private final List<FileListResponse.FileItem> trending = new ArrayList<>();
    private final List<FileListResponse.FileItem> visibleTrending = new ArrayList<>();
    private VideoAdapter trendingAdapter;
    private Call<FileListResponse> trendingCall;
    private HistoryManager historyManager;

    private final BroadcastReceiver bannedReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            PrefsManager prefs = new PrefsManager(HomeActivity.this);
            prefs.clear();
            ApiClient.setAccessToken(null);
            Toast.makeText(HomeActivity.this, "Your account has been banned. Contact support.", Toast.LENGTH_LONG).show();
            Intent loginIntent = new Intent(HomeActivity.this, LoginActivity.class);
            loginIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(loginIntent);
            finish();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);
        FullScreenHelper.enable(this);

        // Register banned receiver
        IntentFilter filter = new IntentFilter(ApiClient.ACTION_ACCOUNT_BANNED);
        registerReceiver(bannedReceiver, filter, Context.RECEIVER_NOT_EXPORTED);

        setupViews();
        checkConnectivity();
        registerFcmToken();

        // Request notification permission (Android 13+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 100);
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Refresh history when returning from FileDetail
        if (historyAdapter != null && historyManager != null) {
            historyAdapter.updateItems(historyManager.getHistory());
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (trendingCall != null) trendingCall.cancel();
        try { unregisterReceiver(bannedReceiver); } catch (Exception ignored) {}
    }

    private void setupViews() {
        etLink = findViewById(R.id.et_link);
        historyManager = new HistoryManager(this);

        // Banner Ad — load from API, retry if not ready yet
        loadBannerAd();

        // History RecyclerView
        RecyclerView recyclerHistory = findViewById(R.id.recycler_history);
        recyclerHistory.setLayoutManager(new LinearLayoutManager(this));
        historyAdapter = new HistoryAdapter(historyManager.getHistory(), item -> {
            Intent intent = new Intent(this, FileDetailActivity.class);
            intent.putExtra("token", item.token);
            startActivity(intent);
        });
        recyclerHistory.setAdapter(historyAdapter);

        RecyclerView recyclerTrending = findViewById(R.id.recycler_trending);
        recyclerTrending.setLayoutManager(new LinearLayoutManager(this));
        trendingAdapter = new VideoAdapter(visibleTrending, file -> {
            Intent intent = new Intent(this, FileDetailActivity.class);
            intent.putExtra("token", file.id);
            startActivity(intent);
        });
        recyclerTrending.setAdapter(trendingAdapter);
        findViewById(R.id.chip_all).setOnClickListener(v -> filterTrending(""));
        findViewById(R.id.chip_videos).setOnClickListener(v -> filterTrending("video/"));
        findViewById(R.id.chip_images).setOnClickListener(v -> filterTrending("image/"));
        findViewById(R.id.btn_explore_all).setOnClickListener(v ->
            startActivity(new Intent(this, com.mynk.vidora.ui.search.SearchActivity.class)));
        loadTrending();

        // Search/Go button
        findViewById(R.id.btn_play).setOnClickListener(v -> openLink());

        // FAB — paste from clipboard + auto-open
        findViewById(R.id.fab_paste).setOnClickListener(v -> {
            pasteFromClipboard();
            openLink();
        });

        // Clear history
        findViewById(R.id.btn_clear_history).setOnClickListener(v -> {
            historyManager.clearHistory();
            historyAdapter.updateItems(historyManager.getHistory());
            Toast.makeText(this, "History cleared", Toast.LENGTH_SHORT).show();
        });

        // Top bar buttons
        findViewById(R.id.btn_notifications_top).setOnClickListener(v ->
            startActivity(new Intent(this, NotificationsActivity.class))
        );
        findViewById(R.id.btn_search_top).setOnClickListener(v ->
            startActivity(new Intent(this, com.mynk.vidora.ui.search.SearchActivity.class))
        );
        findViewById(R.id.btn_profile_top).setOnClickListener(v ->
            startActivity(new Intent(this, ProfileActivity.class))
        );

        // Bottom nav
        NavHelper.setup(this);
    }

    private void loadTrending() {
        TextView state = findViewById(R.id.tv_trending_state);
        state.setText("Loading files…");
        trendingCall = ApiClient.getService().getTrending(8);
        trendingCall.enqueue(new Callback<FileListResponse>() {
            @Override public void onResponse(Call<FileListResponse> call, Response<FileListResponse> response) {
                if (call != trendingCall || isFinishing()) return;
                trending.clear();
                if (response.isSuccessful() && response.body() != null && response.body().data != null
                        && response.body().data.files != null) trending.addAll(response.body().data.files);
                filterTrending("");
                if (!response.isSuccessful()) state.setText("Could not load trending files. Tap to retry.");
            }
            @Override public void onFailure(Call<FileListResponse> call, Throwable error) {
                if (call != trendingCall || isFinishing()) return;
                state.setVisibility(View.VISIBLE);
                state.setText("Network error. Tap to retry.");
            }
        });
        state.setOnClickListener(v -> loadTrending());
    }

    private void filterTrending(String mimePrefix) {
        visibleTrending.clear();
        for (FileListResponse.FileItem item : trending) {
            if (mimePrefix.isEmpty() || (item.mimeType != null && item.mimeType.startsWith(mimePrefix)))
                visibleTrending.add(item);
        }
        trendingAdapter.notifyDataSetChanged();
        TextView state = findViewById(R.id.tv_trending_state);
        state.setVisibility(visibleTrending.isEmpty() ? View.VISIBLE : View.GONE);
        if (visibleTrending.isEmpty()) state.setText("No files in this category yet.");
        int[] chips = {R.id.chip_all, R.id.chip_videos, R.id.chip_images};
        int selected = mimePrefix.isEmpty() ? 0 : mimePrefix.equals("video/") ? 1 : 2;
        for (int i = 0; i < chips.length; i++) {
            TextView chip = findViewById(chips[i]);
            chip.setBackgroundResource(i == selected ? R.drawable.bg_btn_outline_purple : R.drawable.bg_icon_button);
            chip.setTextColor(getColor(i == selected ? R.color.purple_light : R.color.text_secondary));
        }
    }

    private void checkConnectivity() {
        android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        android.net.NetworkInfo info = cm != null ? cm.getActiveNetworkInfo() : null;
        boolean isOnline = info != null && info.isConnected();

        android.widget.LinearLayout offlineBanner = findViewById(R.id.layout_offline);
        if (!isOnline) {
            offlineBanner.setVisibility(android.view.View.VISIBLE);
            findViewById(R.id.btn_view_downloads).setOnClickListener(v ->
                startActivity(new Intent(this, com.mynk.vidora.ui.downloads.DownloadsActivity.class))
            );
        } else {
            offlineBanner.setVisibility(android.view.View.GONE);
        }
    }

    private void registerFcmToken() {
        PrefsManager prefs = new PrefsManager(this);
        if (!prefs.isLoggedIn()) return;

        boolean notifEnabled = getSharedPreferences("vidora_settings", MODE_PRIVATE)
            .getBoolean("notifications_enabled", true);
        if (!notifEnabled) return;

        com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken()
            .addOnSuccessListener(token -> {
                java.util.Map<String, String> body = new java.util.HashMap<>();
                body.put("token", token);
                ApiClient.getService().registerFcmToken(body).enqueue(new retrofit2.Callback<java.util.Map<String, Object>>() {
                    @Override public void onResponse(retrofit2.Call<java.util.Map<String, Object>> call, retrofit2.Response<java.util.Map<String, Object>> response) {}
                    @Override public void onFailure(retrofit2.Call<java.util.Map<String, Object>> call, Throwable t) {}
                });
            });
    }

    private void loadBannerAd() {
        android.widget.FrameLayout adContainer = findViewById(R.id.ad_banner_container);

        if (!AdsConfig.isAdsEnabled()) {
            adContainer.setVisibility(android.view.View.GONE);
            return;
        }

        String bid = AdsConfig.getBannerId();
        if (bid == null || bid.isEmpty()) {
            adContainer.setVisibility(android.view.View.GONE);
            adContainer.postDelayed(this::loadBannerAd, 3000); // retry after 3s
            return;
        }

        AdView adBanner = new AdView(this);
        adBanner.setAdSize(com.google.android.gms.ads.AdSize.BANNER);
        adBanner.setAdUnitId(bid);
        adContainer.removeAllViews();
        adContainer.addView(adBanner);
        adBanner.loadAd(new AdRequest.Builder().build());
        adContainer.setVisibility(android.view.View.VISIBLE);
    }

    // ── Paste Link Logic ──────────────────────────────────────────────────────

    private void pasteFromClipboard() {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null && clipboard.hasPrimaryClip()) {
            ClipData clip = clipboard.getPrimaryClip();
            if (clip != null && clip.getItemCount() > 0) {
                String text = clip.getItemAt(0).getText().toString();
                etLink.setText(text);
            }
        }
    }

    private void openLink() {
        String link = etLink.getText().toString().trim();
        if (link.isEmpty()) {
            Toast.makeText(this, "Please enter or paste a link", Toast.LENGTH_SHORT).show();
            return;
        }

        String token = extractToken(link);
        if (token == null) {
            Toast.makeText(this, "Invalid Vidora link", Toast.LENGTH_SHORT).show();
            return;
        }

        Intent intent = new Intent(this, FileDetailActivity.class);
        intent.putExtra("token", token);
        startActivity(intent);
    }

    private String extractToken(String link) {
        return com.mynk.vidora.utils.ShareLinks.token(link, com.mynk.vidora.utils.Constants.WEB_BASE_URL);
    }
}
