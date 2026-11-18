package com.mynk.vidora.ui.webview;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.utils.FullScreenHelper;

import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class PrivacyActivity extends AppCompatActivity {

    private WebView webView;
    private static final String DEFAULT_URL = com.mynk.vidora.utils.Constants.WEB_BASE_URL + "privacy";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_privacy);
        FullScreenHelper.enable(this);

        webView = findViewById(R.id.webview_privacy);
        PolicyWebView.configure(webView);
        webView.setBackgroundColor(0xFF08080F);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        // Fetch URL from settings API
        ApiClient.getService().getAppSettings().enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                String url = DEFAULT_URL;
                if (response.isSuccessful() && response.body() != null) {
                    Object dataObj = response.body().get("data");
                    if (dataObj instanceof Map) {
                        Map<String, Object> data = (Map<String, Object>) dataObj;
                        if (data.get("privacy_url") != null) {
                            url = String.valueOf(data.get("privacy_url"));
                        }
                    }
                }
                PolicyWebView.load(webView, url, DEFAULT_URL);
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {
                PolicyWebView.load(webView, DEFAULT_URL, DEFAULT_URL);
            }
        });
    }
}
