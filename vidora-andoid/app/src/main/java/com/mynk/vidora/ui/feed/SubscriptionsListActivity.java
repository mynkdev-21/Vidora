package com.mynk.vidora.ui.feed;

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
import com.bumptech.glide.load.resource.bitmap.CircleCrop;
import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.NavHelper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SubscriptionsListActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private ProgressBar progressBar;
    private View layoutEmpty;
    private List<Map<String, Object>> subscriptions = new ArrayList<>();
    private SubAdapter adapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_subscriptions_list);
        FullScreenHelper.enable(this);
        NavHelper.setup(this);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        recyclerView = findViewById(R.id.rv_subscriptions);
        progressBar = findViewById(R.id.progress_bar);
        layoutEmpty = findViewById(R.id.layout_empty);

        adapter = new SubAdapter();
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        recyclerView.setAdapter(adapter);

        loadSubscriptions();
    }

    private void loadSubscriptions() {
        progressBar.setVisibility(View.VISIBLE);
        ApiClient.getService().getSubscriptions().enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    Map<String, Object> data = (Map<String, Object>) response.body().get("data");
                    if (data != null) {
                        List<Map<String, Object>> subs = (List<Map<String, Object>>) data.get("subscriptions");
                        if (subs != null && !subs.isEmpty()) {
                            subscriptions.clear();
                            subscriptions.addAll(subs);
                            adapter.notifyDataSetChanged();
                            return;
                        }
                    }
                }
                layoutEmpty.setVisibility(View.VISIBLE);
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                layoutEmpty.setVisibility(View.VISIBLE);
            }
        });
    }

    private class SubAdapter extends RecyclerView.Adapter<SubAdapter.VH> {
        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_subscription, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            Map<String, Object> sub = subscriptions.get(position);
            String name = sub.get("name") != null ? String.valueOf(sub.get("name")) : "Unknown";
            String id = sub.get("id") != null ? String.valueOf(sub.get("id")) : "";
            String avatarUrl = sub.get("avatar_url") != null ? String.valueOf(sub.get("avatar_url")) : "";
            int fileCount = sub.get("file_count") != null ? ((Number) sub.get("file_count")).intValue() : 0;
            boolean notify = sub.get("notify") != null && ((Number) sub.get("notify")).intValue() == 1;

            holder.tvName.setText(name);
            holder.tvInfo.setText(fileCount + " files");
            holder.tvAvatarLetter.setText(name.isEmpty() ? "?" : String.valueOf(name.charAt(0)).toUpperCase());

            // Click name/avatar to open creator profile
            View.OnClickListener openCreator = v -> {
                android.content.Intent intent = new android.content.Intent(SubscriptionsListActivity.this, com.mynk.vidora.ui.creator.CreatorProfileActivity.class);
                intent.putExtra("creator_id", id);
                startActivity(intent);
            };
            holder.tvName.setOnClickListener(openCreator);
            holder.tvAvatarLetter.setOnClickListener(openCreator);
            holder.ivAvatar.setOnClickListener(openCreator);

            // Avatar image
            if (avatarUrl != null && !avatarUrl.isEmpty() && !"null".equals(avatarUrl)) {
                String fullUrl = avatarUrl.startsWith("http") ? avatarUrl :
                    Constants.BASE_URL + (avatarUrl.startsWith("/") ? avatarUrl.substring(1) : avatarUrl);
                Glide.with(SubscriptionsListActivity.this).load(fullUrl).transform(new CircleCrop()).into(holder.ivAvatar);
                holder.ivAvatar.setVisibility(View.VISIBLE);
                holder.tvAvatarLetter.setVisibility(View.GONE);
            } else {
                holder.ivAvatar.setVisibility(View.GONE);
                holder.tvAvatarLetter.setVisibility(View.VISIBLE);
            }

            // Bell icon
            holder.ivBell.setImageResource(notify ? R.drawable.ic_bell_on : R.drawable.ic_bell_off);
            holder.ivBell.setOnClickListener(v -> {
                boolean newNotify = !notify;
                holder.ivBell.setEnabled(false);
                ApiClient.getService().setSubscriptionBell(id, java.util.Collections.singletonMap("notify", newNotify))
                    .enqueue(new Callback<Map<String, Object>>() {
                        @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                            holder.ivBell.setEnabled(true);
                            if (response.isSuccessful()) {
                                sub.put("notify", newNotify ? 1 : 0);
                                holder.ivBell.setImageResource(newNotify ? R.drawable.ic_bell_on : R.drawable.ic_bell_off);
                            } else {
                                android.widget.Toast.makeText(SubscriptionsListActivity.this, "Could not update notifications", android.widget.Toast.LENGTH_SHORT).show();
                            }
                        }
                        @Override public void onFailure(Call<Map<String, Object>> call, Throwable error) {
                            holder.ivBell.setEnabled(true);
                            android.widget.Toast.makeText(SubscriptionsListActivity.this, "Could not update notifications", android.widget.Toast.LENGTH_SHORT).show();
                        }
                    });
            });

            // Unsubscribe button
            holder.btnUnsub.setOnClickListener(v -> {
                ApiClient.getService().unsubscribe(id).enqueue(new Callback<Map<String, Object>>() {
                    @Override
                    public void onResponse(Call<Map<String, Object>> call2, Response<Map<String, Object>> resp) {
                        subscriptions.remove(position);
                        notifyItemRemoved(position);
                        notifyItemRangeChanged(position, subscriptions.size());
                        if (subscriptions.isEmpty()) layoutEmpty.setVisibility(View.VISIBLE);
                    }
                    @Override
                    public void onFailure(Call<Map<String, Object>> call2, Throwable t) {}
                });
            });
        }

        @Override
        public int getItemCount() { return subscriptions.size(); }

        class VH extends RecyclerView.ViewHolder {
            TextView tvName, tvInfo, tvAvatarLetter, btnUnsub;
            ImageView ivAvatar, ivBell;
            VH(View v) {
                super(v);
                tvName = v.findViewById(R.id.tv_sub_name);
                tvInfo = v.findViewById(R.id.tv_sub_info);
                tvAvatarLetter = v.findViewById(R.id.tv_sub_avatar_letter);
                ivAvatar = v.findViewById(R.id.iv_sub_avatar);
                ivBell = v.findViewById(R.id.iv_sub_bell);
                btnUnsub = v.findViewById(R.id.btn_sub_unsub);
            }
        }
    }
}
