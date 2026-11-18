package com.mynk.vidora.ui.creator;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.model.FileListResponse;
import com.mynk.vidora.ui.auth.LoginActivity;
import com.mynk.vidora.ui.filedetail.FileDetailActivity;
import com.mynk.vidora.ui.upload.UploadActivity;
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.PrefsManager;
import com.mynk.vidora.utils.RemoteConfigManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MyVideosActivity extends AppCompatActivity {
    private final List<FileListResponse.FileItem> files = new ArrayList<>();
    private RecyclerView.Adapter<?> adapter;
    private TextView state;
    private View progress;
    private int nextPage = 1;
    private boolean hasMore = true;
    private boolean loading;
    private Call<FileListResponse> listCall;
    private boolean resumedOnce;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (!new PrefsManager(this).isLoggedIn()) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }
        setContentView(R.layout.activity_my_videos);
        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        findViewById(R.id.btn_upload).setOnClickListener(v -> startActivity(new Intent(this, UploadActivity.class)));
        state = findViewById(R.id.tv_state);
        progress = findViewById(R.id.progress);
        RecyclerView list = findViewById(R.id.recycler_files);
        LinearLayoutManager manager = new LinearLayoutManager(this);
        list.setLayoutManager(manager);
        adapter = new FilesAdapter();
        list.setAdapter(adapter);
        list.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override public void onScrolled(@NonNull RecyclerView recycler, int dx, int dy) {
                if (hasMore && !loading && manager.findLastVisibleItemPosition() >= files.size() - 3) loadNext();
            }
        });
        state.setOnClickListener(v -> { if (!loading) { nextPage = 1; files.clear(); adapter.notifyDataSetChanged(); hasMore = true; loadNext(); } });
        loadNext();
    }

    @Override protected void onDestroy() {
        if (listCall != null) listCall.cancel();
        super.onDestroy();
    }

    @Override protected void onResume() {
        super.onResume();
        if (!resumedOnce) { resumedOnce = true; return; }
        if (state == null) return;
        if (listCall != null) listCall.cancel();
        loading = false;
        nextPage = 1;
        hasMore = true;
        files.clear();
        adapter.notifyDataSetChanged();
        loadNext();
    }

    private void loadNext() {
        if (!hasMore || loading) return;
        loading = true;
        progress.setVisibility(View.VISIBLE);
        state.setText("Loading your files…");
        listCall = ApiClient.getService().getFiles(nextPage, 20);
        listCall.enqueue(new Callback<FileListResponse>() {
            @Override public void onResponse(Call<FileListResponse> call, Response<FileListResponse> response) {
                if (call != listCall || isFinishing()) return;
                loading = false;
                progress.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null && response.body().data != null) {
                    FileListResponse.Data data = response.body().data;
                    if (data.files != null) files.addAll(data.files);
                    hasMore = data.pagination != null && nextPage < data.pagination.pages;
                    nextPage++;
                    adapter.notifyDataSetChanged();
                    state.setText(files.isEmpty() ? "No uploads yet. Tap Upload to add one." : "");
                } else state.setText("Could not load files. Tap to retry.");
            }
            @Override public void onFailure(Call<FileListResponse> call, Throwable error) {
                if (call != listCall || isFinishing()) return;
                loading = false;
                progress.setVisibility(View.GONE);
                state.setText("Network error. Tap to retry.");
            }
        });
    }

    private void share(FileListResponse.FileItem item) {
        ApiClient.getService().generateShareLink(item.id).enqueue(new Callback<Map<String, Object>>() {
            @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (isFinishing()) return;
                if (!response.isSuccessful() || response.body() == null) { showError("Could not create share link"); return; }
                Object data = response.body().get("data");
                Object token = data instanceof Map ? ((Map<?, ?>) data).get("token") : null;
                if (!(token instanceof String)) { showError("Could not create share link"); return; }
                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("text/plain");
                intent.putExtra(Intent.EXTRA_TEXT, Constants.WEB_BASE_URL + "v/" + token);
                startActivity(Intent.createChooser(intent, "Share via"));
            }
            @Override public void onFailure(Call<Map<String, Object>> call, Throwable error) { showError("Network error creating share link"); }
        });
    }

    private void delete(FileListResponse.FileItem item) {
        new AlertDialog.Builder(this).setTitle("Delete file?")
            .setMessage("This removes the file and its share link.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Delete", (dialog, which) -> ApiClient.getService().deleteFile(item.id)
                .enqueue(new Callback<Map<String, Object>>() {
                    @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                        if (isFinishing()) return;
                        if (response.isSuccessful()) {
                            files.remove(item);
                            adapter.notifyDataSetChanged();
                            if (files.isEmpty()) state.setText("No uploads yet. Tap Upload to add one.");
                        } else showError("Could not delete file");
                    }
                    @Override public void onFailure(Call<Map<String, Object>> call, Throwable error) { showError("Network error deleting file"); }
                })).show();
    }

    private void showError(String message) {
        if (!isFinishing()) Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private class FilesAdapter extends RecyclerView.Adapter<FilesAdapter.Holder> {
        @NonNull @Override public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            return new Holder(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_my_video, parent, false));
        }
        @Override public void onBindViewHolder(@NonNull Holder h, int position) {
            FileListResponse.FileItem item = files.get(position);
            h.title.setText(item.originalName != null ? item.originalName : "Untitled");
            h.meta.setText((item.status != null ? item.status : "unknown") + " · " + item.viewCount + " views");
            if (item.thumbnailUrl != null && !item.thumbnailUrl.isEmpty()) {
                String url = item.thumbnailUrl.startsWith("http") ? item.thumbnailUrl
                    : RemoteConfigManager.getBaseUrl() + item.thumbnailUrl.replaceFirst("^/", "");
                Glide.with(MyVideosActivity.this).load(url).placeholder(R.drawable.ic_placeholder_image)
                    .error(R.drawable.ic_placeholder_image).into(h.thumbnail);
            } else h.thumbnail.setImageResource(R.drawable.ic_placeholder_image);
            h.open.setOnClickListener(v -> { Intent intent = new Intent(MyVideosActivity.this, FileDetailActivity.class);
                intent.putExtra("token", item.id); startActivity(intent); });
            h.share.setOnClickListener(v -> share(item));
            h.delete.setOnClickListener(v -> delete(item));
        }
        @Override public int getItemCount() { return files.size(); }
        class Holder extends RecyclerView.ViewHolder {
            TextView title, meta, open, share, delete;
            ImageView thumbnail;
            Holder(View view) { super(view); title = view.findViewById(R.id.tv_title);
                meta = view.findViewById(R.id.tv_meta); thumbnail = view.findViewById(R.id.iv_thumbnail);
                open = view.findViewById(R.id.btn_open); share = view.findViewById(R.id.btn_share);
                delete = view.findViewById(R.id.btn_delete); }
        }
    }
}
