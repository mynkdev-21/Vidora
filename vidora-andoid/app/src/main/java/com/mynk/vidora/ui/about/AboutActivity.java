package com.mynk.vidora.ui.about;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.utils.FullScreenHelper;

import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AboutActivity extends AppCompatActivity {

    private String websiteUrl = "https://vidora.app";
    private String youtubeUrl = "https://youtube.com/@vidora";
    private String telegramUrl = "https://t.me/vidorasupport";
    private String instagramUrl = "https://instagram.com/vidora.app";

    private TextView tvTagWebsite, tvTagYoutube, tvTagTelegram, tvTagInstagram;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_about);
        FullScreenHelper.enable(this);

        tvTagWebsite = findViewById(R.id.tv_tag_website);
        tvTagYoutube = findViewById(R.id.tv_tag_youtube);
        tvTagTelegram = findViewById(R.id.tv_tag_telegram);
        tvTagInstagram = findViewById(R.id.tv_tag_instagram);

        // Back button
        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        // Set click listeners
        findViewById(R.id.btn_website).setOnClickListener(v -> openUrl(websiteUrl));
        findViewById(R.id.btn_youtube).setOnClickListener(v -> openUrl(youtubeUrl));
        findViewById(R.id.btn_telegram).setOnClickListener(v -> openUrl(telegramUrl));
        findViewById(R.id.btn_instagram).setOnClickListener(v -> openUrl(instagramUrl));

        // Fetch settings from API
        loadSettings();
    }

    private void loadSettings() {
        ApiClient.getService().getAppSettings().enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Object dataObj = response.body().get("data");
                    if (dataObj instanceof Map) {
                        Map<String, Object> data = (Map<String, Object>) dataObj;
                        if (data.get("website_url") != null) {
                            websiteUrl = String.valueOf(data.get("website_url"));
                            tvTagWebsite.setText(websiteUrl.replaceAll("https?://", ""));
                        }
                        if (data.get("youtube_url") != null) {
                            youtubeUrl = String.valueOf(data.get("youtube_url"));
                            String yt = youtubeUrl;
                            if (yt.contains("@")) tvTagYoutube.setText("@" + yt.substring(yt.indexOf("@") + 1));
                            else tvTagYoutube.setText(yt.replaceAll("https?://", ""));
                        }
                        if (data.get("telegram_url") != null) {
                            telegramUrl = String.valueOf(data.get("telegram_url"));
                            String tg = telegramUrl.replace("https://t.me/", "");
                            tvTagTelegram.setText("@" + tg);
                        }
                        if (data.get("instagram_url") != null) {
                            instagramUrl = String.valueOf(data.get("instagram_url"));
                            String ig = instagramUrl;
                            if (ig.contains("/")) ig = ig.substring(ig.lastIndexOf("/") + 1);
                            tvTagInstagram.setText("@" + ig);
                        }
                    }
                }
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {
                // Use defaults silently
            }
        });
    }

    private void openUrl(String url) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        startActivity(intent);
    }
}
