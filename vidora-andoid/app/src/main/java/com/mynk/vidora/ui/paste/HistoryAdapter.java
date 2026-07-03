package com.mynk.vidora.ui.paste;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.mynk.vidora.R;
import com.mynk.vidora.ads.AdsConfig;
import com.mynk.vidora.utils.HistoryManager;

import java.util.List;

public class HistoryAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int TYPE_CONTENT = 0;
    private static final int TYPE_AD = 1;
    private static final int AD_INTERVAL = 3; // ad after every 3 items

    public interface OnItemClickListener {
        void onClick(HistoryManager.HistoryItem item);
    }

    private List<HistoryManager.HistoryItem> items;
    private final OnItemClickListener listener;

    public HistoryAdapter(List<HistoryManager.HistoryItem> items, OnItemClickListener listener) {
        this.items = items;
        this.listener = listener;
    }

    public void updateItems(List<HistoryManager.HistoryItem> newItems) {
        this.items = newItems;
        notifyDataSetChanged();
    }

    @Override
    public int getItemViewType(int position) {
        if (!AdsConfig.isAdsEnabled() || items.isEmpty()) return TYPE_CONTENT;
        // Ad slot after every AD_INTERVAL content items
        // positions: 0,1,2 = content, 3 = ad, 4,5,6 = content, 7 = ad ...
        if ((position + 1) % (AD_INTERVAL + 1) == 0) return TYPE_AD;
        return TYPE_CONTENT;
    }

    private int getContentIndex(int position) {
        if (!AdsConfig.isAdsEnabled()) return position;
        int adsBeforePosition = position / (AD_INTERVAL + 1);
        return position - adsBeforePosition;
    }

    @Override
    public int getItemCount() {
        if (items == null || items.isEmpty()) return 0;
        if (!AdsConfig.isAdsEnabled()) return items.size();
        // Add ad slots: 1 ad per AD_INTERVAL items
        int adSlots = items.size() / AD_INTERVAL;
        return items.size() + adSlots;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        if (viewType == TYPE_AD) {
            FrameLayout container = new FrameLayout(parent.getContext());
            container.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
            return new AdViewHolder(container);
        }
        View view = LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_history, parent, false);
        return new ContentViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        if (holder instanceof AdViewHolder) {
            AdViewHolder adHolder = (AdViewHolder) holder;
            if (!adHolder.loaded) {
                String adId = AdsConfig.getBannerId();
                if (adId == null || adId.isEmpty()) {
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
        HistoryManager.HistoryItem item = items.get(contentIndex);

        h.name.setText(item.name != null ? item.name : "Untitled");
        String meta = item.timestamp != null ? item.timestamp : "";
        if (item.size > 0) meta += " • " + HistoryManager.formatBytes(item.size);
        h.meta.setText(meta);
        h.itemView.setOnClickListener(v -> listener.onClick(item));
    }

    private void loadAdIntoHolder(AdViewHolder holder, String adId) {
        FrameLayout container = (FrameLayout) holder.itemView;
        container.removeAllViews();
        AdView adView = new AdView(container.getContext());
        adView.setAdSize(AdSize.BANNER);
        adView.setAdUnitId(adId);
        adView.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        container.addView(adView);
        adView.loadAd(new AdRequest.Builder().build());
        holder.loaded = true;
    }

    static class ContentViewHolder extends RecyclerView.ViewHolder {
        TextView name, meta;

        ContentViewHolder(View itemView) {
            super(itemView);
            name = itemView.findViewById(R.id.tv_history_name);
            meta = itemView.findViewById(R.id.tv_history_meta);
        }
    }

    static class AdViewHolder extends RecyclerView.ViewHolder {
        boolean loaded = false;

        AdViewHolder(View v) {
            super(v);
        }
    }
}
