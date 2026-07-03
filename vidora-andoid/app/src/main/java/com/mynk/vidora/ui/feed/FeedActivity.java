package com.mynk.vidora.ui.feed;

import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.resource.bitmap.CircleCrop;
import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.model.FileListResponse;
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.NavHelper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class FeedActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private FeedAdapter adapter;
    private ProgressBar progressBar;
    private View tvEmpty;
    private List<FileListResponse.FileItem> files = new ArrayList<>();
    private int currentPage = 1;
    private boolean isLoading = false;
    private boolean hasMore = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_feed);
        FullScreenHelper.enable(this);
        NavHelper.setup(this);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        findViewById(R.id.btn_all_subs).setOnClickListener(v ->
            startActivity(new Intent(this, SubscriptionsListActivity.class))
        );

        recyclerView = findViewById(R.id.rv_feed);
        progressBar = findViewById(R.id.progress_bar);
        tvEmpty = findViewById(R.id.tv_empty);

        adapter = new FeedAdapter(files, file -> {
            Intent intent = new Intent(this, com.mynk.vidora.ui.filedetail.FileDetailActivity.class);
            intent.putExtra("token", file.getId());
            intent.putExtra("file_name", file.getOriginalName());
            startActivity(intent);
        });

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        recyclerView.setAdapter(adapter);

        // Pagination
        recyclerView.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(RecyclerView rv, int dx, int dy) {
                LinearLayoutManager lm = (LinearLayoutManager) rv.getLayoutManager();
                if (lm != null && !isLoading && hasMore) {
                    int totalItems = lm.getItemCount();
                    int lastVisible = lm.findLastVisibleItemPosition();
                    if (lastVisible >= totalItems - 3) {
                        loadFeed();
                    }
                }
            }
        });

        loadCreators();
        loadFeed();
    }

    private void loadCreators() {
        ApiClient.getService().getSubscriptions().enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Map<String, Object> data = (Map<String, Object>) response.body().get("data");
                    if (data == null) return;
                    List<Map<String, Object>> subs = (List<Map<String, Object>>) data.get("subscriptions");
                    if (subs == null || subs.isEmpty()) return;

                    HorizontalScrollView scrollCreators = findViewById(R.id.scroll_creators);
                    LinearLayout layoutCreators = findViewById(R.id.layout_creators);
                    View divider = findViewById(R.id.divider_creators);

                    scrollCreators.setVisibility(View.VISIBLE);
                    divider.setVisibility(View.VISIBLE);

                    for (Map<String, Object> sub : subs) {
                        String name = sub.get("name") != null ? String.valueOf(sub.get("name")) : "?";
                        String avatarUrl = sub.get("avatar_url") != null ? String.valueOf(sub.get("avatar_url")) : "";

                        // Create creator circle item
                        LinearLayout item = new LinearLayout(FeedActivity.this);
                        item.setOrientation(LinearLayout.VERTICAL);
                        item.setGravity(Gravity.CENTER_HORIZONTAL);
                        LinearLayout.LayoutParams itemParams = new LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                        itemParams.setMarginEnd(16);
                        item.setLayoutParams(itemParams);

                        // Avatar circle (56dp)
                        FrameLayout avatarFrame = new FrameLayout(FeedActivity.this);
                        int size = (int) (56 * getResources().getDisplayMetrics().density);
                        avatarFrame.setLayoutParams(new LinearLayout.LayoutParams(size, size));

                        if (avatarUrl != null && !avatarUrl.isEmpty() && !"null".equals(avatarUrl)) {
                            ImageView iv = new ImageView(FeedActivity.this);
                            iv.setLayoutParams(new FrameLayout.LayoutParams(size, size));
                            iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
                            String fullUrl = avatarUrl.startsWith("http") ? avatarUrl :
                                Constants.BASE_URL + (avatarUrl.startsWith("/") ? avatarUrl.substring(1) : avatarUrl);
                            Glide.with(FeedActivity.this).load(fullUrl).transform(new CircleCrop()).into(iv);
                            avatarFrame.addView(iv);
                        } else {
                            TextView tv = new TextView(FeedActivity.this);
                            tv.setLayoutParams(new FrameLayout.LayoutParams(size, size));
                            tv.setGravity(Gravity.CENTER);
                            tv.setTextSize(18);
                            tv.setTextColor(0xFFFFFFFF);
                            tv.setText(String.valueOf(name.charAt(0)).toUpperCase());
                            tv.setBackgroundResource(R.drawable.bg_avatar_circle);
                            avatarFrame.addView(tv);
                        }
                        item.addView(avatarFrame);

                        // Name (max 8 chars)
                        TextView tvName = new TextView(FeedActivity.this);
                        tvName.setLayoutParams(new LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT));
                        tvName.setText(name.length() > 8 ? name.substring(0, 8) + "…" : name);
                        tvName.setTextSize(10);
                        tvName.setTextColor(0xFF94A3B8);
                        tvName.setGravity(Gravity.CENTER);
                        int mt = (int) (4 * getResources().getDisplayMetrics().density);
                        ((LinearLayout.LayoutParams) tvName.getLayoutParams()).topMargin = mt;
                        item.addView(tvName);

                        // Click to open creator profile
                        String finalId = sub.get("id") != null ? String.valueOf(sub.get("id")) : "";
                        item.setOnClickListener(v -> {
                            Intent intent = new Intent(FeedActivity.this, com.mynk.vidora.ui.creator.CreatorProfileActivity.class);
                            intent.putExtra("creator_id", finalId);
                            startActivity(intent);
                        });

                        layoutCreators.addView(item);
                    }
                }
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {}
        });
    }

    private void loadFeed() {
        isLoading = true;
        if (currentPage == 1) progressBar.setVisibility(View.VISIBLE);

        ApiClient.getService().getSubscriptionFeed(currentPage, 20).enqueue(new Callback<FileListResponse>() {
            @Override
            public void onResponse(Call<FileListResponse> call, Response<FileListResponse> response) {
                progressBar.setVisibility(View.GONE);
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

                    if (files.isEmpty()) {
                        tvEmpty.setVisibility(View.VISIBLE);
                    }
                } else {
                    if (files.isEmpty()) tvEmpty.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(Call<FileListResponse> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                isLoading = false;
                if (files.isEmpty()) tvEmpty.setVisibility(View.VISIBLE);
            }
        });
    }
}
