package com.mynk.vidora.ui.notifications;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.utils.FullScreenHelper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class NotificationsActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private ProgressBar progressBar;
    private LinearLayout layoutEmpty;
    private NotificationAdapter adapter;
    private List<Map<String, Object>> notifications = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notifications);
        FullScreenHelper.enable(this);

        recyclerView = findViewById(R.id.recycler_notifications);
        progressBar = findViewById(R.id.progress_bar);
        layoutEmpty = findViewById(R.id.layout_empty);

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new NotificationAdapter(notifications);
        recyclerView.setAdapter(adapter);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        findViewById(R.id.btn_mark_read).setOnClickListener(v -> markAllRead());

        loadNotifications();
    }

    private void loadNotifications() {
        progressBar.setVisibility(View.VISIBLE);
        recyclerView.setVisibility(View.GONE);
        layoutEmpty.setVisibility(View.GONE);

        ApiClient.getService().getNotifications().enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                progressBar.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null) {
                    Object dataObj = response.body().get("data");
                    if (dataObj instanceof Map) {
                        Map<String, Object> data = (Map<String, Object>) dataObj;
                        Object notifsObj = data.get("notifications");
                        if (notifsObj instanceof List) {
                            notifications.clear();
                            notifications.addAll((List<Map<String, Object>>) notifsObj);
                            adapter.notifyDataSetChanged();
                        }
                    }
                }
                if (notifications.isEmpty()) {
                    layoutEmpty.setVisibility(View.VISIBLE);
                } else {
                    recyclerView.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                layoutEmpty.setVisibility(View.VISIBLE);
            }
        });
    }

    private void markAllRead() {
        ApiClient.getService().markAllNotificationsRead().enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                // Refresh list
                for (Map<String, Object> n : notifications) {
                    n.put("is_read", 1.0);
                }
                adapter.notifyDataSetChanged();
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {}
        });
    }

    // ── Adapter ──────────────────────────────────────────────────────────────
    static class NotificationAdapter extends RecyclerView.Adapter<NotificationAdapter.VH> {
        private final List<Map<String, Object>> items;

        NotificationAdapter(List<Map<String, Object>> items) { this.items = items; }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_notification, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            Map<String, Object> item = items.get(position);
            holder.tvTitle.setText(String.valueOf(item.get("title")));
            holder.tvMessage.setText(String.valueOf(item.get("message")));

            // Time ago
            String createdAt = String.valueOf(item.get("created_at"));
            holder.tvTime.setText(timeAgo(createdAt));

            // Unread dot
            Object isRead = item.get("is_read");
            boolean read = isRead != null && (isRead.equals(1.0) || isRead.equals(true) || "1".equals(String.valueOf(isRead)));
            holder.dotUnread.setVisibility(read ? View.GONE : View.VISIBLE);
        }

        @Override
        public int getItemCount() { return items.size(); }

        static String timeAgo(String dateStr) {
            try {
                long time = java.text.SimpleDateFormat.getDateTimeInstance().parse(dateStr).getTime();
                long diff = System.currentTimeMillis() - time;
                long mins = diff / 60000;
                if (mins < 1) return "now";
                if (mins < 60) return mins + "m ago";
                long hrs = mins / 60;
                if (hrs < 24) return hrs + "h ago";
                return (hrs / 24) + "d ago";
            } catch (Exception e) {
                return "";
            }
        }

        static class VH extends RecyclerView.ViewHolder {
            TextView tvTitle, tvMessage, tvTime;
            View dotUnread;
            VH(View v) {
                super(v);
                tvTitle = v.findViewById(R.id.tv_title);
                tvMessage = v.findViewById(R.id.tv_message);
                tvTime = v.findViewById(R.id.tv_time);
                dotUnread = v.findViewById(R.id.dot_unread);
            }
        }
    }
}
