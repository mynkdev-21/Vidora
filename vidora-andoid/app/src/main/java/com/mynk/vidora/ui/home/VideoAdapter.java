package com.mynk.vidora.ui.home;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.resource.bitmap.CenterCrop;
import com.bumptech.glide.load.resource.bitmap.RoundedCorners;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.mynk.vidora.R;
import com.mynk.vidora.model.FileListResponse;
import com.mynk.vidora.utils.Constants;

import java.util.List;

public class VideoAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int TYPE_VIDEO = 0;
    private static final int TYPE_AD = 1;
    private static final int AD_INTERVAL = 3; // Show ad every 3 videos

    public interface OnVideoClickListener {
        void onClick(FileListResponse.FileItem video);
    }

    private final List<FileListResponse.FileItem> videos;
    private final OnVideoClickListener listener;

    public VideoAdapter(List<FileListResponse.FileItem> videos, OnVideoClickListener listener) {
        this.videos = videos;
        this.listener = listener;
    }

    @Override
    public int getItemViewType(int position) {
        // Skip ads entirely if disabled
        if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) return TYPE_VIDEO;
        // After every AD_INTERVAL videos, insert an ad
        if (position > 0 && (position + 1) % (AD_INTERVAL + 1) == 0) {
            return TYPE_AD;
        }
        return TYPE_VIDEO;
    }

    private int getVideoPosition(int adapterPosition) {
        if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) return adapterPosition;
        int adsBefore = adapterPosition / (AD_INTERVAL + 1);
        return adapterPosition - adsBefore;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        if (viewType == TYPE_AD) {
            String adId = com.mynk.vidora.ads.AdsConfig.getBannerId();
            if (adId == null || adId.isEmpty()) {
                return new RecyclerView.ViewHolder(new android.view.View(parent.getContext())) {};
            }
            AdView adView = new AdView(parent.getContext());
            adView.setAdSize(AdSize.MEDIUM_RECTANGLE);
            adView.setAdUnitId(adId);
            adView.setLayoutParams(new RecyclerView.LayoutParams(
                RecyclerView.LayoutParams.MATCH_PARENT,
                RecyclerView.LayoutParams.WRAP_CONTENT
            ));
            int pad = (int) (12 * parent.getContext().getResources().getDisplayMetrics().density);
            adView.setPadding(0, pad, 0, pad);
            return new AdViewHolder(adView);
        }
        View view = LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_video, parent, false);
        return new VideoViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        if (holder instanceof AdViewHolder) {
            AdView adView = ((AdViewHolder) holder).adView;
            if (adView.getParent() == null || !((AdViewHolder) holder).adLoaded) {
                if (com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) {
                    adView.loadAd(new AdRequest.Builder().build());
                } else {
                    adView.setVisibility(android.view.View.GONE);
                }
                ((AdViewHolder) holder).adLoaded = true;
            }
        } else if (holder instanceof VideoViewHolder) {
            int videoPos = getVideoPosition(position);
            if (videoPos >= videos.size()) return;
            FileListResponse.FileItem video = videos.get(videoPos);
            VideoViewHolder vh = (VideoViewHolder) holder;

            vh.title.setText(video.originalName != null ? video.originalName : "Untitled");
            vh.views.setText(formatViews(video.viewCount) + " views");

            // Load thumbnail
            if (video.thumbnailUrl != null && !video.thumbnailUrl.isEmpty()) {
                String fullUrl = Constants.BASE_URL + video.thumbnailUrl.replaceFirst("^/", "");
                vh.thumbnail.setVisibility(View.VISIBLE);
                vh.thumbPlaceholder.setVisibility(View.GONE);
                Glide.with(vh.itemView.getContext())
                    .load(fullUrl)
                    .transform(new CenterCrop(), new RoundedCorners(24))
                    .placeholder(R.drawable.ic_placeholder_image)
                    .error(R.drawable.ic_placeholder_image)
                    .into(vh.thumbnail);
            } else {
                vh.thumbnail.setVisibility(View.VISIBLE);
                vh.thumbnail.setImageResource(R.drawable.ic_placeholder_image);
                vh.thumbPlaceholder.setVisibility(View.GONE);
            }

            vh.itemView.setOnClickListener(v -> listener.onClick(video));
        }
    }

    @Override
    public int getItemCount() {
        int videoCount = videos.size();
        if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) return videoCount;
        int adCount = videoCount / AD_INTERVAL;
        return videoCount + adCount;
    }

    private String formatViews(long count) {
        if (count >= 1_000_000) return String.format("%.1fM", count / 1_000_000.0);
        if (count >= 1_000) return String.format("%.1fK", count / 1_000.0);
        return String.valueOf(count);
    }

    // ── ViewHolders ───────────────────────────────────────────────────────────
    static class VideoViewHolder extends RecyclerView.ViewHolder {
        TextView title, views;
        ImageView thumbnail;
        View thumbPlaceholder;

        VideoViewHolder(View itemView) {
            super(itemView);
            title = itemView.findViewById(R.id.tv_video_title);
            views = itemView.findViewById(R.id.tv_video_views);
            thumbnail = itemView.findViewById(R.id.iv_thumbnail);
            thumbPlaceholder = itemView.findViewById(R.id.thumb_placeholder);
        }
    }

    static class AdViewHolder extends RecyclerView.ViewHolder {
        AdView adView;
        boolean adLoaded = false;

        AdViewHolder(View itemView) {
            super(itemView);
            adView = (AdView) itemView;
        }
    }
}
