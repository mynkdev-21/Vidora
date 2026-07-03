package com.mynk.vidora.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.model.AuthResponse;
import com.mynk.vidora.ui.home.HomeActivity;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.PrefsManager;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SignupActivity extends AppCompatActivity {

    private EditText etName, etEmail, etPassword;
    private TextView btnSignup, btnGoLogin, tvError;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_signup);
        FullScreenHelper.enable(this);

        etName = findViewById(R.id.et_name);
        etEmail = findViewById(R.id.et_email);
        etPassword = findViewById(R.id.et_password);
        btnSignup = findViewById(R.id.btn_signup);
        btnGoLogin = findViewById(R.id.btn_go_login);
        tvError = findViewById(R.id.tv_error);

        btnSignup.setOnClickListener(v -> doSignup());
        btnGoLogin.setOnClickListener(v -> {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
        });

        // Terms & Conditions — highlight clickable text
        android.widget.TextView tvTerms = findViewById(R.id.tv_terms);
        String full = "By creating an account you agree to our Terms & Conditions";
        android.text.SpannableString span = new android.text.SpannableString(full);
        int start = full.indexOf("Terms & Conditions");
        int end = start + "Terms & Conditions".length();
        span.setSpan(new android.text.style.ForegroundColorSpan(0xFFa78bfa), start, end, 0);
        span.setSpan(new android.text.style.UnderlineSpan(), start, end, 0);
        tvTerms.setText(span);
        tvTerms.setOnClickListener(v -> {
            startActivity(new Intent(this, com.mynk.vidora.ui.webview.TermsActivity.class));
        });
    }

    private void doSignup() {
        String name = etName.getText().toString().trim();
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        if (name.isEmpty() || email.isEmpty() || password.isEmpty()) {
            showError("Please fill all fields");
            return;
        }
        if (password.length() < 6) {
            showError("Password must be at least 6 characters");
            return;
        }

        btnSignup.setEnabled(false);
        btnSignup.setText("Creating account…");
        tvError.setVisibility(android.view.View.GONE);

        Map<String, String> body = new HashMap<>();
        body.put("name", name);
        body.put("email", email);
        body.put("password", password);

        ApiClient.getService().register(body).enqueue(new Callback<AuthResponse>() {
            @Override
            public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
                btnSignup.setEnabled(true);
                btnSignup.setText("Create Account");

                if (response.isSuccessful() && response.body() != null && response.body().success) {
                    AuthResponse.Data data = response.body().data;
                    PrefsManager prefs = new PrefsManager(SignupActivity.this);
                    prefs.saveTokens(data.accessToken, data.refreshToken);
                    prefs.saveUser(data.user.id, data.user.name, data.user.email);
                    ApiClient.setAccessToken(data.accessToken);

                    startActivity(new Intent(SignupActivity.this, HomeActivity.class));
                    finishAffinity();
                } else {
                    String msg = "Signup failed";
                    if (response.body() != null && response.body().message != null) {
                        msg = response.body().message;
                    }
                    showError(msg);
                }
            }

            @Override
            public void onFailure(Call<AuthResponse> call, Throwable t) {
                btnSignup.setEnabled(true);
                btnSignup.setText("Create Account");
                showError("Network error. Check your connection.");
            }
        });
    }

    private void showError(String msg) {
        tvError.setText(msg);
        tvError.setVisibility(android.view.View.VISIBLE);
    }
}
