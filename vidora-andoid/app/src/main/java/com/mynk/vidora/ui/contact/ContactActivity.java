package com.mynk.vidora.ui.contact;

import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.utils.FullScreenHelper;

import java.util.HashMap;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ContactActivity extends AppCompatActivity {

    private EditText etName, etEmail, etMessage;
    private TextView btnSend;
    private LinearLayout layoutSuccess;
    private String source = "app";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_contact);
        FullScreenHelper.enable(this);

        // Get source from intent (banned, app, etc.)
        if (getIntent().hasExtra("source")) {
            source = getIntent().getStringExtra("source");
        }

        etName = findViewById(R.id.et_name);
        etEmail = findViewById(R.id.et_email);
        etMessage = findViewById(R.id.et_message);
        btnSend = findViewById(R.id.btn_send);
        layoutSuccess = findViewById(R.id.layout_success);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        btnSend.setOnClickListener(v -> sendMessage());
    }

    private void sendMessage() {
        String name = etName.getText().toString().trim();
        String email = etEmail.getText().toString().trim();
        String message = etMessage.getText().toString().trim();

        if (name.isEmpty() || email.isEmpty() || message.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            return;
        }

        btnSend.setEnabled(false);
        btnSend.setText("Sending...");

        Map<String, String> body = new HashMap<>();
        body.put("name", name);
        body.put("email", email);
        body.put("message", message);
        body.put("source", source);

        ApiClient.getService().sendContactMessage(body).enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                btnSend.setEnabled(true);
                btnSend.setText("Send Message");

                if (response.isSuccessful()) {
                    // Show success, hide form
                    btnSend.setVisibility(View.GONE);
                    etName.setVisibility(View.GONE);
                    etEmail.setVisibility(View.GONE);
                    etMessage.setVisibility(View.GONE);
                    layoutSuccess.setVisibility(View.VISIBLE);
                } else {
                    Toast.makeText(ContactActivity.this, "Failed to send. Try again.", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) {
                btnSend.setEnabled(true);
                btnSend.setText("Send Message");
                Toast.makeText(ContactActivity.this, "Network error. Check connection.", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
