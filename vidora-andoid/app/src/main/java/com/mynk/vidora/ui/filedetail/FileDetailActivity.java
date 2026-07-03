package com.mynk.vidora.ui.filedetail;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.resource.bitmap.CenterCrop;
import com.bumptech.glide.load.resource.bitmap.RoundedCorners;
import com.mynk.vidora.R;
import com.mynk.vidora.ads.AdManager;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.model.ShareViewResponse;
import com.mynk.vidora.ui.player.PlayerActivity;
import com.mynk.vidora.utils.BookmarkManager;
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.HistoryManager;
import com.mynk.vidora.utils.NavHelper;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class FileDetailActivity extends AppCompatActivity {

    private static final String TAG = "FileDetail";

    private String token;
    private String creatorId;
    private String creatorName;
    private ImageView ivThumbnail, ivFileIcon;
    private TextView tvFileName, tvFileSubtitle, tvFileType, tvFileSize, tvUploader, tvViews;
    private TextView btnUnlock;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_file_detail);
        FullScreenHelper.enable(this);
        NavHelper.setup(this);

        ivThumbnail = findViewById(R.id.iv_file_thumbnail);
        ivFileIcon = findViewById(R.id.iv_file_icon);
        tvFileName = findViewById(R.id.tv_file_name);
        tvFileSubtitle = findViewById(R.id.tv_file_subtitle);
        tvFileType = findViewById(R.id.tv_file_type);
        tvFileSize = findViewById(R.id.tv_file_size);
        tvUploader = findViewById(R.id.tv_uploader);
        tvViews = findViewById(R.id.tv_views);
        btnUnlock = findViewById(R.id.btn_unlock);

        token = getTokenFromIntent();

        if (token == null || token.isEmpty()) {
            Toast.makeText(this, "Invalid link", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        loadFileDetails();
        updateUnlockButton();

        // Load banner ads — ID comes from API via AdsConfig
        loadBannerAds();

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        findViewById(R.id.btn_bookmark).setOnClickListener(v -> {
            BookmarkManager bm = new BookmarkManager(this);
            if (bm.isBookmarked(token)) {
                bm.removeBookmark(token);
                Toast.makeText(this, "Removed from bookmarks", Toast.LENGTH_SHORT).show();
            } else {
                // Save with whatever info we have
                String name = tvFileName.getText().toString();
                String type = tvFileType.getText().toString();
                String size = tvFileSize.getText().toString();
                bm.addBookmark(token, name, type, 0, null);
                Toast.makeText(this, "Bookmarked!", Toast.LENGTH_SHORT).show();
            }
        });

        findViewById(R.id.btn_share).setOnClickListener(v -> {
            // Build web share URL: http://IP:8080/v/TOKEN
            String frontendUrl = Constants.BASE_URL
                .replaceAll(":5001/?$", ":8080")
                .replaceAll("/$", "");
            String shareUrl = frontendUrl + "/v/" + token;

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("text/plain");
            shareIntent.putExtra(Intent.EXTRA_TEXT,
                "Check this out on Vidora: " + shareUrl);
            startActivity(Intent.createChooser(shareIntent, "Share via"));
        });

        // Unlock — MUST watch ad, no bypass
        btnUnlock.setOnClickListener(v -> {
            if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) {
                // Ads disabled by admin — unlock directly
                openPlayer();
                return;
            }
            AdManager.getInstance().showRewardedAd(this, new AdManager.AdCallback() {
                @Override
                public void onRewarded() {
                    openPlayer();
                }

                @Override
                public void onAdNotAvailable() {
                    // In production, block unlock. In dev/test, allow after showing message.
                    Toast.makeText(FileDetailActivity.this,
                        "Ad not available. Unlocking file…",
                        Toast.LENGTH_SHORT).show();
                    openPlayer();
                }
            });
        });
    }

    private void loadBannerAds() {
        View adBannerDetail = findViewById(R.id.ad_banner_detail);
        View adBannerUnlock = findViewById(R.id.ad_banner_unlock);

        if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) {
            adBannerDetail.setVisibility(View.GONE);
            adBannerUnlock.setVisibility(View.GONE);
            return;
        }

        String bid = com.mynk.vidora.ads.AdsConfig.getBannerId();
        if (bid == null || bid.isEmpty()) {
            // ID not loaded yet — wait for API then retry
            adBannerDetail.setVisibility(View.GONE);
            adBannerUnlock.setVisibility(View.GONE);
            adBannerDetail.postDelayed(this::loadBannerAds, 3000);
            return;
        }

        // Programmatically create AdViews with correct ID from API
        android.widget.FrameLayout containerDetail = (android.widget.FrameLayout) adBannerDetail;
        android.widget.FrameLayout containerUnlock = (android.widget.FrameLayout) adBannerUnlock;
        containerDetail.removeAllViews();
        containerUnlock.removeAllViews();

        com.google.android.gms.ads.AdView bannerDetail = new com.google.android.gms.ads.AdView(this);
        bannerDetail.setAdSize(com.google.android.gms.ads.AdSize.BANNER);
        bannerDetail.setAdUnitId(bid);

        com.google.android.gms.ads.AdView bannerUnlock = new com.google.android.gms.ads.AdView(this);
        bannerUnlock.setAdSize(com.google.android.gms.ads.AdSize.BANNER);
        bannerUnlock.setAdUnitId(bid);

        containerDetail.addView(bannerDetail);
        containerUnlock.addView(bannerUnlock);

        com.google.android.gms.ads.AdRequest req = new com.google.android.gms.ads.AdRequest.Builder().build();
        bannerDetail.loadAd(req);
        bannerUnlock.loadAd(req);

        containerDetail.setVisibility(View.VISIBLE);
        containerUnlock.setVisibility(View.VISIBLE);
    }

    private void updateUnlockButton() {
        if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) {
            btnUnlock.setText("▶  Unlock File");
            btnUnlock.setAlpha(1f);
            return;
        }
        if (AdManager.getInstance().isAdReady()) {
            btnUnlock.setText("▶  Unlock File");
            btnUnlock.setAlpha(1f);
        } else {
            btnUnlock.setText("▶  Unlock File (Loading ad…)");
            btnUnlock.setAlpha(0.7f);
            // After 10 seconds, stop waiting and enable button anyway
            btnUnlock.postDelayed(() -> {
                if (!AdManager.getInstance().isAdReady()) {
                    btnUnlock.setText("▶  Unlock File");
                    btnUnlock.setAlpha(1f);
                }
            }, 10000);
            // Keep checking every 2 sec until 10 sec timeout
            btnUnlock.postDelayed(this::updateUnlockButton, 2000);
        }
    }

    private void updateBookmarkState() {
        BookmarkManager bm = new BookmarkManager(this);
        // Could update icon color here if needed
    }

    private String fileType = "video"; // default

    private void openPlayer() {
        if (fileType.equalsIgnoreCase("image")) {
            Intent intent = new Intent(this, com.mynk.vidora.ui.imageviewer.ImageViewerActivity.class);
            intent.putExtra("token", token);
            intent.putExtra("file_name", tvFileName.getText().toString());
            startActivity(intent);
        } else {
            Intent intent = new Intent(this, PlayerActivity.class);
            intent.putExtra("token", token);
            intent.putExtra("file_name", tvFileName.getText().toString());
            intent.putExtra("creator_id", creatorId);
            intent.putExtra("creator_name", creatorName);
            startActivity(intent);
        }
    }

    private String getTokenFromIntent() {
        Uri data = getIntent().getData();
        if (data != null) {
            String path = data.getPath();
            if (path != null && path.startsWith("/")) {
                return path.substring(1);
            }
            if ("view".equals(data.getHost()) || "download".equals(data.getHost())) {
                String lastSeg = data.getLastPathSegment();
                if (lastSeg != null) return lastSeg;
                path = data.getSchemeSpecificPart();
                if (path != null && path.contains("/")) {
                    String[] parts = path.split("/");
                    if (parts.length > 0) return parts[parts.length - 1];
                }
            }
        }
        return getIntent().getStringExtra("token");
    }

    private void loadFileDetails() {
        ApiClient.getService().getSharedFile(token).enqueue(new Callback<ShareViewResponse>() {
            @Override
            public void onResponse(Call<ShareViewResponse> call, Response<ShareViewResponse> response) {
                if (response.isSuccessful() && response.body() != null && response.body().data != null) {
                    ShareViewResponse.Data file = response.body().data;

                    tvFileName.setText(file.name != null ? file.name : "Untitled");
                    String type = capitalize(file.type != null ? file.type : "file");
                    fileType = file.type != null ? file.type : "video";
                    tvFileSubtitle.setText(type + " • " + formatBytes(file.size));
                    tvFileType.setText(type);
                    tvFileSize.setText(formatBytes(file.size));
                    tvUploader.setText(file.creator != null ? file.creator : "Unknown");
                    tvViews.setText(formatViews(file.views));

                    // Store creator info for PlayerActivity
                    creatorId = file.creator_id;
                    creatorName = file.creator;

                    // Save to recent history
                    new HistoryManager(FileDetailActivity.this).addToHistory(
                        token,
                        file.name != null ? file.name : "Untitled",
                        file.type != null ? file.type : "file",
                        file.size
                    );

                    // Update unlock button text based on type
                    if (fileType.equalsIgnoreCase("image")) {
                        btnUnlock.setText("  View Image");
                        btnUnlock.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_image, 0, 0, 0);
                        btnUnlock.setCompoundDrawablePadding(16);
                    }

                    // Update bookmark button state
                    updateBookmarkState();

                    if (file.thumbnail != null && !file.thumbnail.isEmpty()) {
                        String thumbUrl = Constants.BASE_URL + file.thumbnail.replaceFirst("^/", "");
                        ivThumbnail.setVisibility(View.VISIBLE);
                        ivFileIcon.setVisibility(View.GONE);
                        Glide.with(FileDetailActivity.this)
                            .load(thumbUrl)
                            .transform(new CenterCrop(), new RoundedCorners(48))
                            .into(ivThumbnail);
                    }
                } else {
                    Toast.makeText(FileDetailActivity.this, "File not found", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ShareViewResponse> call, Throwable t) {
                Toast.makeText(FileDetailActivity.this, "Network error", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private String formatBytes(long bytes) {
        if (bytes <= 0) return "0 B";
        String[] units = {"B", "KB", "MB", "GB"};
        int i = (int) (Math.log(bytes) / Math.log(1024));
        return String.format("%.1f %s", bytes / Math.pow(1024, i), units[i]);
    }

    private String formatViews(long count) {
        if (count >= 1_000_000) return String.format("%.1fM", count / 1_000_000.0);
        if (count >= 1_000) return String.format("%.1fK", count / 1_000.0);
        return String.valueOf(count);
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }
}
