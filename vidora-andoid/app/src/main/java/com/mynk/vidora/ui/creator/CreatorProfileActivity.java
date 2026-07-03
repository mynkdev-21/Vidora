package com.mynk.vidora.ui.creator;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.resource.bitmap.CenterCrop;
import com.bumptech.glide.load.resource.bitmap.CircleCrop;
import com.bumptech.glide.load.resource.bitmap.RoundedCorners;
import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.model.FileListResponse;
import com.mynk.vidora.ui.filedetail.FileDetailActivity;
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.NavHelper;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CreatorProfileActivity extends AppCompatActivity {

    private String creatorId;
    private boolean isSubscribed = false;
    private TextView btnSubscribe;
    private RecyclerView rvFiles;
    private List<FileListResponse.FileItem> files = new ArrayList<>();
    private FilesAdapter adapter;
    private int currentPage = 1;
    private boolean isLoading = false;
    private boolean hasMore = true;
    private String sortBy = "latest"; // latest or popular

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_creator_profile);
        FullScreenHelper.enable(this);
        NavHelper.setup(this);

        creatorId = getIntent().getStringExtra("creator_id");
        if (creatorId == null || creatorId.isEmpty()) { finish(); return; }

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        btnSubscribe = findViewById(R.id.btn_subscribe);

        rvFiles = findViewById(R.id.rv_files);
        adapter = new FilesAdapter();
        rvFiles.setLayoutManager(new LinearLayoutManager(this));
        rvFiles.setAdapter(adapter);

        // Sort chips
        findViewById(R.id.chip_latest).setOnClickListener(v -> {
            if (!sortBy.equals("latest")) { sortBy = "latest"; reloadFiles(); updateChips(); }
        });
        findViewById(R.id.chip_popular).setOnClickListener(v -> {
            if (!sortBy.equals("popular")) { sortBy = "popular"; reloadFiles(); updateChips(); }
        });

        loadCreatorProfile();
        loadFiles();
        checkSubscription();

        btnSubscribe.setOnClickListener(v -> toggleSubscribe());
    }

    private void updateChips() {
        TextView chipLatest = findViewById(R.id.chip_latest);
        TextView chipPopular = findViewById(R.id.chip_popular);
        if (sortBy.equals("latest")) {
            chipLatest.setBackgroundResource(R.drawable.bg_btn_subscribe);
            chipLatest.setTextColor(0xFFFFFFFF);
            chipPopular.setBackgroundResource(R.drawable.bg_btn_subscribed);
            chipPopular.setTextColor(0xFF64748B);
        } else {
            chipPopular.setBackgroundResource(R.drawable.bg_btn_subscribe);
            chipPopular.setTextColor(0xFFFFFFFF);
            chipLatest.setBackgroundResource(R.drawable.bg_btn_subscribed);
            chipLatest.setTextColor(0xFF64748B);
        }
    }

    private void reloadFiles() {
        files.clear();
        adapter.notifyDataSetChanged();
        currentPage = 1;
        hasMore = true;
        loadFiles();
    }

    private void loadCreatorProfile() {
        ApiClient.getService().getCreatorProfile(creatorId).enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (!response.isSuccessful() || response.body() == null) return;
                Map<String, Object> data = (Map<String, Object>) response.body().get("data");
                if (data == null) return;
                Map<String, Object> creator = (Map<String, Object>) data.get("creator");
                if (creator == null) return;

                String name = String.valueOf(creator.getOrDefault("name", "Creator"));
                int fileCount = toInt(creator.get("file_count"));
                int subCount = toInt(creator.get("subscriber_count"));
                long totalViews = toLong(creator.get("total_views"));
                String avatarUrl = creator.get("avatar_url") != null ? String.valueOf(creator.get("avatar_url")) : "";
                String createdAt = creator.get("created_at") != null ? String.valueOf(creator.get("created_at")) : "";

                TextView tvName = findViewById(R.id.tv_creator_name);
                TextView tvStats = findViewById(R.id.tv_creator_stats);
                TextView tvJoined = findViewById(R.id.tv_joined);
                TextView tvHeader = findViewById(R.id.tv_header_title);
                TextView tvLetter = findViewById(R.id.tv_avatar_letter);
                ImageView ivAvatar = findViewById(R.id.iv_avatar);

                tvName.setText(name);
                tvHeader.setText(name);
                tvStats.setText(formatCount(subCount) + " subscribers · " + fileCount + " videos · " + formatCount(totalViews) + " views");
                tvLetter.setText(name.isEmpty() ? "?" : String.valueOf(name.charAt(0)).toUpperCase());

                if (createdAt.length() >= 10) {
                    tvJoined.setText("Joined " + createdAt.substring(0, 10));
                }

                // Avatar
                if (avatarUrl != null && !avatarUrl.isEmpty() && !"null".equals(avatarUrl)) {
                    String fullUrl = avatarUrl.startsWith("http") ? avatarUrl :
                        Constants.BASE_URL + (avatarUrl.startsWith("/") ? avatarUrl.substring(1) : avatarUrl);
                    Glide.with(CreatorProfileActivity.this).load(fullUrl).transform(new CircleCrop()).into(ivAvatar);
                    ivAvatar.setVisibility(View.VISIBLE);
                    tvLetter.setVisibility(View.GONE);
                }
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {}
        });
    }

    private void loadFiles() {
        isLoading = true;
        ApiClient.getService().getCreatorFiles(creatorId, currentPage, 20, sortBy).enqueue(new Callback<FileListResponse>() {
            @Override
            public void onResponse(Call<FileListResponse> call, Response<FileListResponse> response) {
                isLoading = false;
                if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                    List<FileListResponse.FileItem> newFiles = response.body().getData().getFiles();
                    if (newFiles != null && !newFiles.isEmpty()) {
                        files.addAll(newFiles);
                        adapter.notifyDataSetChanged();
                        currentPage++;
                    } else {
                        hasMore = false;
                    }
                }
            }

            @Override
            public void onFailure(Call<FileListResponse> call, Throwable t) { isLoading = false; }
        });
    }

    private void checkSubscription() {
        ApiClient.getService().getSubscriptionStatus(creatorId).enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Map<String, Object> data = (Map<String, Object>) response.body().get("data");
                    if (data != null) {
                        isSubscribed = Boolean.TRUE.equals(data.get("subscribed"));
                        updateSubscribeUI();
                    }
                }
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {}
        });
    }

    private void toggleSubscribe() {
        if (isSubscribed) {
            ApiClient.getService().unsubscribe(creatorId).enqueue(new Callback<Map<String, Object>>() {
                @Override
                public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> r) {
                    isSubscribed = false; updateSubscribeUI();
                }
                @Override public void onFailure(Call<Map<String, Object>> call, Throwable t) {}
            });
        } else {
            ApiClient.getService().subscribe(creatorId).enqueue(new Callback<Map<String, Object>>() {
                @Override
                public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> r) {
                    isSubscribed = true; updateSubscribeUI();
                }
                @Override public void onFailure(Call<Map<String, Object>> call, Throwable t) {}
            });
        }
    }

    private void updateSubscribeUI() {
        if (isSubscribed) {
            btnSubscribe.setText("Subscribed");
            btnSubscribe.setBackgroundResource(R.drawable.bg_btn_subscribed);
            btnSubscribe.setTextColor(0xFFA78BFA);
        } else {
            btnSubscribe.setText("Subscribe");
            btnSubscribe.setBackgroundResource(R.drawable.bg_btn_subscribe);
            btnSubscribe.setTextColor(0xFFFFFFFF);
        }
    }

    private String formatCount(long count) {
        if (count >= 1_000_000) return String.format(Locale.US, "%.1fM", count / 1_000_000.0);
        if (count >= 1_000) return String.format(Locale.US, "%.1fK", count / 1_000.0);
        return String.valueOf(count);
    }

    // ── Files Adapter (with ads every 3 items) ──────────────────────────────────
    private class FilesAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
        private static final int TYPE_CONTENT = 0;
        private static final int TYPE_AD = 1;
        private static final int AD_INTERVAL = 3;

        @Override
        public int getItemViewType(int position) {
            if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled() || files.isEmpty()) return TYPE_CONTENT;
            if (position > 0 && (position + 1) % (AD_INTERVAL + 1) == 0) return TYPE_AD;
            return TYPE_CONTENT;
        }

        private int getContentIndex(int position) {
            if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) return position;
            int adsBeforePosition = position / (AD_INTERVAL + 1);
            if (position > 0 && (position + 1) % (AD_INTERVAL + 1) == 0) return -1;
            return position - adsBeforePosition;
        }

        @Override
        public int getItemCount() {
            if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled() || files.isEmpty()) return files.size();
            int ads = files.size() / AD_INTERVAL;
            return files.size() + ads;
        }

        @NonNull
        @Override
        public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            if (viewType == TYPE_AD) {
                String adId = com.mynk.vidora.ads.AdsConfig.getBannerId();
                if (adId == null || adId.isEmpty()) {
                    return new AdVH(new android.widget.FrameLayout(parent.getContext()));
                }
                com.google.android.gms.ads.AdView adView = new com.google.android.gms.ads.AdView(parent.getContext());
                adView.setAdSize(com.google.android.gms.ads.AdSize.BANNER);
                adView.setAdUnitId(adId);
                adView.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
                int pad = (int) (12 * getResources().getDisplayMetrics().density);
                adView.setPadding(pad, pad, pad, pad);
                return new AdVH(adView);
            }
            return new VH(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_creator_file, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
            if (holder instanceof AdVH) {
                AdVH adHolder = (AdVH) holder;
                if (!adHolder.loaded) {
                    adHolder.adView.loadAd(new com.google.android.gms.ads.AdRequest.Builder().build());
                    adHolder.loaded = true;
                }
                return;
            }

            int contentIndex = getContentIndex(position);
            if (contentIndex < 0 || contentIndex >= files.size()) return;

            VH h = (VH) holder;
            FileListResponse.FileItem file = files.get(contentIndex);
            String title = file.originalName != null ? file.originalName.replaceAll("\\.[^.]+$", "") : "Untitled";
            h.tvTitle.setText(title);
            h.tvMeta.setText(formatCount(file.viewCount) + " views · " + getTimeAgo(file.createdAt));

            if (file.thumbnailUrl != null && !file.thumbnailUrl.isEmpty()) {
                String url = Constants.BASE_URL + file.thumbnailUrl.replaceFirst("^/", "");
                Glide.with(CreatorProfileActivity.this).load(url).placeholder(R.drawable.ic_placeholder_image).transform(new CenterCrop(), new RoundedCorners(20)).into(h.ivThumb);
            } else {
                h.ivThumb.setImageResource(R.drawable.ic_placeholder_image);
            }

            h.itemView.setOnClickListener(v -> {
                Intent intent = new Intent(CreatorProfileActivity.this, FileDetailActivity.class);
                intent.putExtra("token", file.id);
                intent.putExtra("file_name", file.originalName);
                startActivity(intent);
            });
        }

        class VH extends RecyclerView.ViewHolder {
            ImageView ivThumb; TextView tvTitle, tvMeta;
            VH(View v) { super(v); ivThumb = v.findViewById(R.id.iv_file_thumb); tvTitle = v.findViewById(R.id.tv_file_title); tvMeta = v.findViewById(R.id.tv_file_meta); }
        }

        class AdVH extends RecyclerView.ViewHolder {
            com.google.android.gms.ads.AdView adView; boolean loaded = false;
            AdVH(View v) { super(v); adView = (com.google.android.gms.ads.AdView) v; }
        }
    }

    private String getTimeAgo(String iso) {
        if (iso == null) return "";
        try {
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            java.util.Date date = sdf.parse(iso.replace(".000Z", "").replace("Z", ""));
            if (date == null) return "";
            long diff = System.currentTimeMillis() - date.getTime();
            long min = diff / 60000;
            if (min < 60) return min + " min ago";
            long hr = min / 60;
            if (hr < 24) return hr + " hr ago";
            long days = hr / 24;
            if (days < 30) return days + " days ago";
            return (days / 30) + " months ago";
        } catch (Exception e) { return ""; }
    }

    private static int toInt(Object obj) {
        if (obj == null) return 0;
        if (obj instanceof Number) return ((Number) obj).intValue();
        try { return Integer.parseInt(String.valueOf(obj)); } catch (Exception e) { return 0; }
    }

    private static long toLong(Object obj) {
        if (obj == null) return 0;
        if (obj instanceof Number) return ((Number) obj).longValue();
        try { return Long.parseLong(String.valueOf(obj)); } catch (Exception e) { return 0; }
    }
}
