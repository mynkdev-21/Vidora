package com.mynk.vidora.ui.auth;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.utils.FullScreenHelper;

import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ForgotPasswordActivity extends AppCompatActivity {

    private static final String DEFAULT_URL = "http://10.59.203.78:8080/forgot-password";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password);
        FullScreenHelper.enable(this);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        WebView webView = findViewById(R.id.webview);
        webView.setWebViewClient(new WebViewClient());
        webView.getSettings().setJavaScriptEnabled(true);
        webView.setBackgroundColor(0xFF08080F);

        // Fetch URL from settings API (forgot_password_url key)
        ApiClient.getService().getAppSettings().enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                String url = DEFAULT_URL;
                if (response.isSuccessful() && response.body() != null) {
                    Object dataObj = response.body().get("data");
                    if (dataObj instanceof Map) {
                        Map<String, Object> data = (Map<String, Object>) dataObj;
                        if (data.get("forgot_password_url") != null) {
                            String fetched = String.valueOf(data.get("forgot_password_url"));
                            if (!fetched.isEmpty() && !fetched.equals("null")) url = fetched;
                        }
                    }
                }
                webView.loadUrl(url);
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {
                webView.loadUrl(DEFAULT_URL);
            }
        });
    }
}
