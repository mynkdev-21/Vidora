package com.mynk.vidora.ui.imageviewer;

import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.target.Target;
import com.mynk.vidora.R;
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.FullScreenHelper;

import android.graphics.drawable.Drawable;

import androidx.annotation.Nullable;

public class ImageViewerActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_image_viewer);
        FullScreenHelper.enable(this);

        String token = getIntent().getStringExtra("token");
        String fileName = getIntent().getStringExtra("file_name");
        String localPath = getIntent().getStringExtra("local_path");

        TextView tvTitle = findViewById(R.id.tv_title);
        ImageView ivImage = findViewById(R.id.iv_image);
        ProgressBar progressBar = findViewById(R.id.progress_bar);

        tvTitle.setText(fileName != null ? fileName : "Image");

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        if (localPath != null && !localPath.isEmpty()) {
            // Load from local file
            Glide.with(this)
                .load(new java.io.File(localPath))
                .listener(new RequestListener<Drawable>() {
                    @Override
                    public boolean onLoadFailed(@Nullable GlideException e, Object model, Target<Drawable> target, boolean isFirstResource) {
                        progressBar.setVisibility(View.GONE);
                        return false;
                    }
                    @Override
                    public boolean onResourceReady(Drawable resource, Object model, Target<Drawable> target, DataSource dataSource, boolean isFirstResource) {
                        progressBar.setVisibility(View.GONE);
                        return false;
                    }
                })
                .into(ivImage);
        } else {
            // Load from API
            String imageUrl = Constants.BASE_URL + "api/play/" + token;

            Glide.with(this)
                .load(new com.bumptech.glide.load.model.GlideUrl(imageUrl,
                    new com.bumptech.glide.load.model.LazyHeaders.Builder()
                        .addHeader("X-API-Key", Constants.API_KEY)
                        .build()))
                .listener(new RequestListener<Drawable>() {
                    @Override
                    public boolean onLoadFailed(@Nullable GlideException e, Object model, Target<Drawable> target, boolean isFirstResource) {
                        progressBar.setVisibility(View.GONE);
                        return false;
                    }
                    @Override
                    public boolean onResourceReady(Drawable resource, Object model, Target<Drawable> target, DataSource dataSource, boolean isFirstResource) {
                        progressBar.setVisibility(View.GONE);
                        return false;
                    }
                })
                .into(ivImage);

            // Count view after 3 seconds (only for online)
            ivImage.postDelayed(() -> {
                if (!isFinishing() && token != null) {
                    com.mynk.vidora.api.ApiClient.getService().countView(token).enqueue(
                        new retrofit2.Callback<Void>() {
                            @Override public void onResponse(retrofit2.Call<Void> call, retrofit2.Response<Void> response) {}
                            @Override public void onFailure(retrofit2.Call<Void> call, Throwable t) {}
                        }
                    );
                }
            }, 3000);
        }
    }
}
