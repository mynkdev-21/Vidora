package com.mynk.vidora.ui.subscription;

import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.billing.SubscriptionManager;
import com.mynk.vidora.utils.FullScreenHelper;

public class SubscriptionActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_subscription);
        FullScreenHelper.enable(this);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        TextView tvStatus = findViewById(R.id.tv_premium_status);

        if (SubscriptionManager.getInstance().isPremium()) {
            tvStatus.setVisibility(View.VISIBLE);
            findViewById(R.id.btn_monthly).setAlpha(0.5f);
            findViewById(R.id.btn_quarterly).setAlpha(0.5f);
            findViewById(R.id.btn_yearly).setAlpha(0.5f);
        }

        // Monthly plan
        findViewById(R.id.btn_monthly).setOnClickListener(v -> {
            if (SubscriptionManager.getInstance().isPremium()) {
                Toast.makeText(this, "You're already Premium!", Toast.LENGTH_SHORT).show();
                return;
            }
            SubscriptionManager.getInstance().subscribe(this, SubscriptionManager.PLAN_MONTHLY, new SubscriptionManager.SubscriptionCallback() {
                @Override
                public void onPurchaseSuccess() {
                    runOnUiThread(() -> {
                        com.mynk.vidora.billing.PremiumSuccessDialog.show(SubscriptionActivity.this);
                        tvStatus.setVisibility(View.VISIBLE);
                    });
                }

                @Override
                public void onPurchaseFailed(String error) {
                    runOnUiThread(() -> Toast.makeText(SubscriptionActivity.this, error, Toast.LENGTH_SHORT).show());
                }
            });
        });

        // Quarterly plan
        findViewById(R.id.btn_quarterly).setOnClickListener(v -> {
            if (SubscriptionManager.getInstance().isPremium()) {
                Toast.makeText(this, "You're already Premium!", Toast.LENGTH_SHORT).show();
                return;
            }
            SubscriptionManager.getInstance().subscribe(this, SubscriptionManager.PLAN_QUARTERLY, new SubscriptionManager.SubscriptionCallback() {
                @Override
                public void onPurchaseSuccess() {
                    runOnUiThread(() -> {
                        com.mynk.vidora.billing.PremiumSuccessDialog.show(SubscriptionActivity.this);
                        tvStatus.setVisibility(View.VISIBLE);
                    });
                }

                @Override
                public void onPurchaseFailed(String error) {
                    runOnUiThread(() -> Toast.makeText(SubscriptionActivity.this, error, Toast.LENGTH_SHORT).show());
                }
            });
        });

        // Yearly plan
        findViewById(R.id.btn_yearly).setOnClickListener(v -> {
            if (SubscriptionManager.getInstance().isPremium()) {
                Toast.makeText(this, "You're already Premium!", Toast.LENGTH_SHORT).show();
                return;
            }
            SubscriptionManager.getInstance().subscribe(this, SubscriptionManager.PLAN_YEARLY, new SubscriptionManager.SubscriptionCallback() {
                @Override
                public void onPurchaseSuccess() {
                    runOnUiThread(() -> {
                        com.mynk.vidora.billing.PremiumSuccessDialog.show(SubscriptionActivity.this);
                        tvStatus.setVisibility(View.VISIBLE);
                    });
                }

                @Override
                public void onPurchaseFailed(String error) {
                    runOnUiThread(() -> Toast.makeText(SubscriptionActivity.this, error, Toast.LENGTH_SHORT).show());
                }
            });
        });
    }
}
