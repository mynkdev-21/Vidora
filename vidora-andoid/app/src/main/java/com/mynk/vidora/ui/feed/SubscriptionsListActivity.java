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
                sub.put("notify", newNotify ? 1 : 0);
                holder.ivBell.setImageResource(newNotify ? R.drawable.ic_bell_on : R.drawable.ic_bell_off);

                // Shake animation
                android.view.animation.Animation shake = android.view.animation.AnimationUtils.loadAnimation(
                    SubscriptionsListActivity.this, R.anim.bell_shake);
                holder.ivBell.startAnimation(shake);

                Map<String, Object> body = new HashMap<>();
                body.put("notify", newNotify);
                // Toggle bell via API
                ApiClient.getService().getSubscriptions(); // placeholder — real call below
                retrofit2.Call<Map<String, Object>> toggleCall = ApiClient.getService().subscribe(id);
                // Use PATCH for bell toggle
                Map<String, String> bellBody = new HashMap<>();
                bellBody.put("notify", String.valueOf(newNotify));
                // Actually we need a direct OkHttp call for PATCH with body
                new Thread(() -> {
                    try {
                        okhttp3.MediaType JSON = okhttp3.MediaType.get("application/json");
                        String jsonBody = "{\"notify\":" + newNotify + "}";
                        okhttp3.Request request = new okhttp3.Request.Builder()
                            .url(Constants.BASE_URL + "api/subscribe/" + id + "/bell")
                            .patch(okhttp3.RequestBody.create(jsonBody, JSON))
                            .addHeader("X-API-Key", Constants.API_KEY)
                            .addHeader("Authorization", "Bearer " + com.mynk.vidora.utils.PrefsManager.getStaticToken(SubscriptionsListActivity.this))
                            .addHeader("Content-Type", "application/json")
                            .build();
                        new okhttp3.OkHttpClient().newCall(request).execute();
                    } catch (Exception ignored) {}
                }).start();
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
