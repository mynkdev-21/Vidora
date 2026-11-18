package com.mynk.vidora.ui.creator;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.model.ProfileResponse;
import com.mynk.vidora.ui.auth.LoginActivity;
import com.mynk.vidora.ui.upload.UploadActivity;
import com.mynk.vidora.utils.PrefsManager;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class CreatorHubActivity extends AppCompatActivity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (!new PrefsManager(this).isLoggedIn()) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }
        setContentView(R.layout.activity_creator_hub);
        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        findViewById(R.id.btn_studio_upload).setOnClickListener(v -> startActivity(new Intent(this, UploadActivity.class)));
        findViewById(R.id.btn_my_videos).setOnClickListener(v -> startActivity(new Intent(this, MyVideosActivity.class)));
        findViewById(R.id.btn_studio_earnings).setOnClickListener(v -> startActivity(new Intent(this, EarningsActivity.class)));
        loadStats();
    }

    @Override protected void onResume() {
        super.onResume();
        if (findViewById(R.id.tv_studio_status) != null) loadStats();
    }

    private void loadStats() {
        TextView status = findViewById(R.id.tv_studio_status);
        status.setText("Loading your stats…");
        ApiClient.getService().getProfile().enqueue(new Callback<ProfileResponse>() {
            @Override public void onResponse(Call<ProfileResponse> call, Response<ProfileResponse> response) {
                if (isFinishing()) return;
                if (response.isSuccessful() && response.body() != null && response.body().data != null
                        && response.body().data.user != null) {
                    ProfileResponse.UserProfile user = response.body().data.user;
                    ((TextView) findViewById(R.id.tv_studio_files)).setText(String.valueOf(user.totalFiles));
                    ((TextView) findViewById(R.id.tv_studio_views)).setText(String.valueOf(user.totalViews));
                    status.setText("Updated from your account");
                } else status.setText("Could not load stats. Tap to retry.");
            }
            @Override public void onFailure(Call<ProfileResponse> call, Throwable error) {
                if (!isFinishing()) status.setText("Network error. Tap to retry.");
            }
        });
        status.setOnClickListener(v -> loadStats());
    }
}
