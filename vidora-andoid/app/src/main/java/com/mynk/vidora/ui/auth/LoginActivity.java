package com.mynk.vidora.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.gson.Gson;
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

public class LoginActivity extends AppCompatActivity {

    private EditText etEmail, etPassword;
    private TextView btnLogin, btnGoSignup, tvError, btnContactSupport;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);
        FullScreenHelper.enable(this);

        etEmail = findViewById(R.id.et_email);
        etPassword = findViewById(R.id.et_password);
        btnLogin = findViewById(R.id.btn_login);
        btnGoSignup = findViewById(R.id.btn_go_signup);
        tvError = findViewById(R.id.tv_error);
        btnContactSupport = findViewById(R.id.btn_contact_support);

        btnLogin.setOnClickListener(v -> doLogin());
        btnGoSignup.setOnClickListener(v -> {
            startActivity(new Intent(this, SignupActivity.class));
            finish();
        });

        findViewById(R.id.btn_forgot_password).setOnClickListener(v ->
            startActivity(new Intent(this, ForgotPasswordActivity.class))
        );

        btnContactSupport.setOnClickListener(v -> {
            Intent contactIntent = new Intent(this, com.mynk.vidora.ui.contact.ContactActivity.class);
            contactIntent.putExtra("source", "banned");
            startActivity(contactIntent);
        });
    }

    private void doLogin() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        if (email.isEmpty() || password.isEmpty()) {
            showError("Please fill all fields", false);
            return;
        }

        btnLogin.setEnabled(false);
        btnLogin.setText("Logging in…");
        tvError.setVisibility(View.GONE);
        btnContactSupport.setVisibility(View.GONE);

        Map<String, String> body = new HashMap<>();
        body.put("email", email);
        body.put("password", password);

        ApiClient.getService().login(body).enqueue(new Callback<AuthResponse>() {
            @Override
            public void onResponse(Call<AuthResponse> call, Response<AuthResponse> response) {
                btnLogin.setEnabled(true);
                btnLogin.setText("Log In");

                if (response.isSuccessful() && response.body() != null && response.body().success) {
                    AuthResponse.Data data = response.body().data;
                    PrefsManager prefs = new PrefsManager(LoginActivity.this);
                    prefs.saveTokens(data.accessToken, data.refreshToken);
                    prefs.saveUser(data.user.id, data.user.name, data.user.email);
                    ApiClient.setAccessToken(data.accessToken);

                    startActivity(new Intent(LoginActivity.this, HomeActivity.class));
                    finishAffinity();
                } else {
                    // Try to parse error body for banned check
                    boolean isBanned = false;
                    String msg = "Invalid email or password";

                    if (response.body() != null) {
                        if (response.body().message != null) msg = response.body().message;
                        if ("ACCOUNT_BANNED".equals(response.body().code)) isBanned = true;
                    } else if (response.errorBody() != null) {
                        try {
                            String errorJson = response.errorBody().string();
                            AuthResponse errorResponse = new Gson().fromJson(errorJson, AuthResponse.class);
                            if (errorResponse != null) {
                                if (errorResponse.message != null) msg = errorResponse.message;
                                if ("ACCOUNT_BANNED".equals(errorResponse.code)) isBanned = true;
                            }
                        } catch (Exception ignored) {}
                    }

                    showError(msg, isBanned);
                }
            }

            @Override
            public void onFailure(Call<AuthResponse> call, Throwable t) {
                btnLogin.setEnabled(true);
                btnLogin.setText("Log In");
                showError("Network error. Check your connection.", false);
            }
        });
    }

    private void showError(String msg, boolean showContact) {
        tvError.setText(msg);
        tvError.setVisibility(View.VISIBLE);
        btnContactSupport.setVisibility(showContact ? View.VISIBLE : View.GONE);
    }
}
