package com.mynk.vidora.ui.feed;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.resource.bitmap.CenterCrop;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.mynk.vidora.R;
import com.mynk.vidora.ads.AdsConfig;
import com.mynk.vidora.model.FileListResponse;
import com.mynk.vidora.utils.Constants;

import java.util.List;

public class FeedAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int TYPE_CONTENT = 0;
    private static final int TYPE_AD = 1;
    private static final int AD_INTERVAL = 3; // Show ad every 3 items

    public interface OnItemClick {
        void onClick(FileListResponse.FileItem item);
    }

    private final List<FileListResponse.FileItem> items;
    private final OnItemClick listener;

    public FeedAdapter(List<FileListResponse.FileItem> items, OnItemClick listener) {
        this.items = items;
        this.listener = listener;
    }

    @Override
    public int getItemViewType(int position) {
        if (!AdsConfig.isAdsEnabled()) return TYPE_CONTENT;
        // After every AD_INTERVAL content items, insert an ad
        // Position mapping: content positions have ads interspersed
        int contentIndex = getContentIndex(position);
        if (contentIndex == -1) return TYPE_AD;
        return TYPE_CONTENT;
    }

    // Get actual content index from adapter position (accounting for ad slots)
    private int getContentIndex(int position) {
        if (!AdsConfig.isAdsEnabled()) return position;
        // Every (AD_INTERVAL + 1) positions, one is an ad
        int adsBeforePosition = position / (AD_INTERVAL + 1);
        int contentPos = position - adsBeforePosition;
        // Check if this specific position is an ad slot
        if (position > 0 && (position + 1) % (AD_INTERVAL + 1) == 0) return -1; // It's an ad
        return contentPos;
    }

    @Override
    public int getItemCount() {
        if (!AdsConfig.isAdsEnabled() || items.isEmpty()) return items.size();
        // Add ad slots: 1 ad per AD_INTERVAL items
        int ads = items.size() / AD_INTERVAL;
        return items.size() + ads;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        if (viewType == TYPE_AD) {
            android.widget.FrameLayout container = new android.widget.FrameLayout(parent.getContext());
            container.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
            return new AdViewHolder(container);
        }
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_feed, parent, false);
        return new ContentViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        if (holder instanceof AdViewHolder) {
            AdViewHolder adHolder = (AdViewHolder) holder;
            if (!adHolder.loaded) {
                String adId = AdsConfig.getBannerId();
                if (adId == null || adId.isEmpty()) {
                    // ID not ready yet, retry after 3s
                    adHolder.itemView.postDelayed(() -> {
                        String retryId = AdsConfig.getBannerId();
                        if (retryId != null && !retryId.isEmpty()) {
                            loadAdIntoHolder(adHolder, retryId);
                        }
                    }, 3000);
                } else {
                    loadAdIntoHolder(adHolder, adId);
                }
            }
            return;
        }

        int contentIndex = getContentIndex(position);
        if (contentIndex < 0 || contentIndex >= items.size()) return;

        ContentViewHolder h = (ContentViewHolder) holder;
        FileListResponse.FileItem item = items.get(contentIndex);

        // Title (remove extension)
        String title = item.originalName != null ? item.originalName.replaceAll("\\.[^.]+$", "") : "Untitled";
        h.tvTitle.setText(title);

        // Meta: creator · views · time
        String creator = item.creatorName != null ? item.creatorName : "Unknown";
        String views = formatViews(item.viewCount) + " views";
        String timeAgo = getTimeAgo(item.createdAt);
        h.tvMeta.setText(creator + " · " + views + " · " + timeAgo);

        // Avatar letter
        h.tvAvatar.setText(creator.isEmpty() ? "?" : String.valueOf(creator.charAt(0)).toUpperCase());

        // Click avatar to open creator profile
        View.OnClickListener openCreator = v -> {
            if (item.creatorId != null && !item.creatorId.isEmpty()) {
                android.content.Intent intent = new android.content.Intent(h.itemView.getContext(), com.mynk.vidora.ui.creator.CreatorProfileActivity.class);
                intent.putExtra("creator_id", item.creatorId);
                h.itemView.getContext().startActivity(intent);
            }
        };
        h.tvAvatar.setOnClickListener(openCreator);
        h.ivAvatar.setOnClickListener(openCreator);

        // Thumbnail
        if (item.thumbnailUrl != null && !item.thumbnailUrl.isEmpty()) {
            String thumbUrl = Constants.BASE_URL + item.thumbnailUrl.replaceFirst("^/", "");
            Glide.with(h.itemView.getContext())
                .load(thumbUrl)
                .placeholder(R.drawable.ic_placeholder_image)
                .transform(new CenterCrop())
                .into(h.ivThumb);
        } else {
            h.ivThumb.setImageResource(R.drawable.ic_placeholder_image);
        }

        h.itemView.setOnClickListener(v -> listener.onClick(item));
    }

    private String formatViews(long count) {
        if (count >= 1_000_000) return String.format("%.1fM", count / 1_000_000.0);
        if (count >= 1_000) return String.format("%.1fK", count / 1_000.0);
        return String.valueOf(count);
    }

    private String getTimeAgo(String isoDate) {
        if (isoDate == null) return "";
        try {
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US);
            sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            java.util.Date date = sdf.parse(isoDate.replace(".000Z", "").replace("Z", ""));
            if (date == null) return "";
            long diff = System.currentTimeMillis() - date.getTime();
            long minutes = diff / 60000;
            if (minutes < 1) return "just now";
            if (minutes < 60) return minutes + " min ago";
            long hours = minutes / 60;
            if (hours < 24) return hours + " hr ago";
            long days = hours / 24;
            if (days < 30) return days + " days ago";
            long months = days / 30;
            if (months < 12) return months + " months ago";
            return (days / 365) + " yr ago";
        } catch (Exception e) {
            return "";
        }
    }

    private void loadAdIntoHolder(AdViewHolder holder, String adId) {
        android.widget.FrameLayout container = (android.widget.FrameLayout) holder.itemView;
        container.removeAllViews();
        AdView adView = new AdView(container.getContext());
        adView.setAdSize(AdSize.MEDIUM_RECTANGLE);
        adView.setAdUnitId(adId);
        adView.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        int pad = (int) (16 * container.getContext().getResources().getDisplayMetrics().density);
        adView.setPadding(pad, pad, pad, pad);
        container.addView(adView);
        adView.loadAd(new AdRequest.Builder().build());
        holder.loaded = true;
    }

    // ── ViewHolders ───────────────────────────────────────────────────────────
    static class ContentViewHolder extends RecyclerView.ViewHolder {
        ImageView ivThumb, ivAvatar;
        TextView tvTitle, tvMeta, tvAvatar;

        ContentViewHolder(View v) {
            super(v);
            ivThumb = v.findViewById(R.id.iv_feed_thumb);
            ivAvatar = v.findViewById(R.id.iv_feed_avatar);
            tvTitle = v.findViewById(R.id.tv_feed_title);
            tvMeta = v.findViewById(R.id.tv_feed_meta);
            tvAvatar = v.findViewById(R.id.tv_feed_avatar);
        }
    }

    static class AdViewHolder extends RecyclerView.ViewHolder {
        boolean loaded = false;

        AdViewHolder(View v) {
            super(v);
        }
    }
}
