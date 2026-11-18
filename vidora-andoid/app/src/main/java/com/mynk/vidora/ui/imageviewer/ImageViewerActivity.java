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
import com.mynk.vidora.utils.ViewTracker;

import android.graphics.drawable.Drawable;

import androidx.annotation.Nullable;

public class ImageViewerActivity extends AppCompatActivity {

    private ViewTracker viewTracker;
    private boolean imageReady;

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
            if (token != null && !token.isEmpty()) {
                viewTracker = new ViewTracker(token, () -> imageReady && !isFinishing() && hasWindowFocus());
                viewTracker.startWithTicket(ticket -> loadRemoteImage(token, ticket, ivImage, progressBar));
            } else {
                progressBar.setVisibility(View.GONE);
            }
        }
    }

    private void loadRemoteImage(String token, String ticket, ImageView ivImage, ProgressBar progressBar) {
        if (isFinishing() || isDestroyed()) return;
        String imageUrl = Constants.BASE_URL + "api/play/" + token;
        com.bumptech.glide.load.model.LazyHeaders.Builder headers =
            new com.bumptech.glide.load.model.LazyHeaders.Builder().addHeader("X-API-Key", Constants.API_KEY);
        String accessToken = new com.mynk.vidora.utils.PrefsManager(this).getAccessToken();
        if (ticket != null && accessToken != null) {
            headers.addHeader("Authorization", "Bearer " + accessToken);
            headers.addHeader("X-View-Ticket", ticket);
        }
        Glide.with(this)
                .load(new com.bumptech.glide.load.model.GlideUrl(imageUrl, headers.build()))
                .listener(new RequestListener<Drawable>() {
                    @Override
                    public boolean onLoadFailed(@Nullable GlideException e, Object model, Target<Drawable> target, boolean isFirstResource) {
                        progressBar.setVisibility(View.GONE);
                        return false;
                    }
                    @Override
                    public boolean onResourceReady(Drawable resource, Object model, Target<Drawable> target, DataSource dataSource, boolean isFirstResource) {
                        progressBar.setVisibility(View.GONE);
                        imageReady = true;
                        return false;
                    }
                })
                .into(ivImage);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (viewTracker != null) viewTracker.cancel();
    }
}
