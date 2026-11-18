package com.mynk.vidora.ui.search;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.model.FileListResponse;
import com.mynk.vidora.ui.filedetail.FileDetailActivity;
import com.mynk.vidora.ui.home.VideoAdapter;
import com.mynk.vidora.utils.FullScreenHelper;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SearchActivity extends AppCompatActivity {

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<FileListResponse.FileItem> results = new ArrayList<>();
    private Call<FileListResponse> activeCall;
    private Runnable pendingSearch;
    private VideoAdapter adapter;
    private View progress;
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_search);
        FullScreenHelper.enable(this);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        EditText etSearch = findViewById(R.id.et_search);
        etSearch.requestFocus();
        progress = findViewById(R.id.search_progress);
        status = findViewById(R.id.search_status);
        RecyclerView list = findViewById(R.id.search_results);
        list.setLayoutManager(new LinearLayoutManager(this));
        adapter = new VideoAdapter(results, file -> {
            Intent intent = new Intent(this, FileDetailActivity.class);
            intent.putExtra("token", file.id);
            startActivity(intent);
        });
        list.setAdapter(adapter);
        etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (pendingSearch != null) handler.removeCallbacks(pendingSearch);
                String query = s.toString().trim();
                pendingSearch = () -> load(query);
                handler.postDelayed(pendingSearch, 300);
            }
            @Override public void afterTextChanged(Editable s) {}
        });
        load("");
    }

    private void load(String query) {
        if (activeCall != null) activeCall.cancel();
        progress.setVisibility(View.VISIBLE);
        status.setText(query.length() < 2 ? "Trending files" : "Searching…");
        activeCall = query.length() < 2 ? ApiClient.getService().getTrending(20)
            : ApiClient.getService().searchFiles(query, "", 1);
        activeCall.enqueue(new Callback<FileListResponse>() {
            @Override public void onResponse(Call<FileListResponse> call, Response<FileListResponse> response) {
                if (call != activeCall || isFinishing()) return;
                progress.setVisibility(View.GONE);
                results.clear();
                if (response.isSuccessful() && response.body() != null && response.body().data != null
                        && response.body().data.files != null) results.addAll(response.body().data.files);
                adapter.notifyDataSetChanged();
                status.setText(!response.isSuccessful() ? "Could not load files. Edit search to retry."
                    : results.isEmpty() ? "No files found" : query.length() < 2 ? "Trending files" : results.size() + " files found");
            }
            @Override public void onFailure(Call<FileListResponse> call, Throwable error) {
                if (call != activeCall || isFinishing()) return;
                progress.setVisibility(View.GONE);
                status.setText("Network error. Edit search to retry.");
            }
        });
    }

    @Override protected void onDestroy() {
        if (pendingSearch != null) handler.removeCallbacks(pendingSearch);
        if (activeCall != null) activeCall.cancel();
        super.onDestroy();
    }
}
