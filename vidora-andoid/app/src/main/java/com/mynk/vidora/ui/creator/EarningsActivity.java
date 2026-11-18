package com.mynk.vidora.ui.creator;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.ui.auth.LoginActivity;
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.PrefsManager;
import com.mynk.vidora.utils.MoneyDisplay;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class EarningsActivity extends AppCompatActivity {
    private final List<Map<String, Object>> methods = new ArrayList<>();
    private double available = Double.NaN;
    private double minimum = Double.NaN;
    private String referralCode;
    private int earningsPage = 1;
    private boolean earningsLoading;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (!new PrefsManager(this).isLoggedIn()) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }
        setContentView(R.layout.activity_earnings);
        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        findViewById(R.id.btn_add_method).setOnClickListener(v -> addMethod());
        findViewById(R.id.btn_request_payout).setOnClickListener(v -> requestPayout());
        findViewById(R.id.btn_share_referral).setOnClickListener(v -> {
            if (referralCode == null) return;
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType("text/plain");
            share.putExtra(Intent.EXTRA_TEXT, Constants.WEB_BASE_URL + "signup?ref=" + referralCode);
            startActivity(Intent.createChooser(share, "Share referral link"));
        });
        findViewById(R.id.btn_more_earnings).setOnClickListener(v -> loadHistory());
        loadAll();
    }

    private void loadAll() {
        loadSummary(); loadMethods(); loadReferrals(); loadHistory(); loadPayouts();
    }

    private static Map<String, Object> data(Response<Map<String, Object>> response) {
        if (!response.isSuccessful() || response.body() == null) return null;
        Object value = response.body().get("data");
        return value instanceof Map ? (Map<String, Object>) value : null;
    }
    private static double number(Object value) {
        return MoneyDisplay.number(value);
    }
    private static String money(Object value) {
        return MoneyDisplay.usd(value);
    }
    private void status(String message) {
        if (!isFinishing()) ((TextView) findViewById(R.id.tv_status)).setText(message);
    }
    private void error(String message) {
        if (!isFinishing()) Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void loadSummary() {
        status("Loading your earnings…");
        ApiClient.getService().getEarningsSummary().enqueue(new Callback<Map<String, Object>>() {
            @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (isFinishing()) return;
                Map<String, Object> values = data(response);
                if (values == null) { status("Could not load earnings. Tap to retry."); return; }
                available = number(values.get("available_balance"));
                minimum = number(values.get("min_payout"));
                ((TextView) findViewById(R.id.tv_available)).setText(money(values.get("available_balance")));
                ((TextView) findViewById(R.id.tv_minimum)).setText("Minimum payout: " + money(values.get("min_payout")));
                ((TextView) findViewById(R.id.tv_from_views)).setText("View earnings\n" + money(values.get("from_views")));
                ((TextView) findViewById(R.id.tv_from_referrals)).setText("Referrals\n" + money(values.get("from_referrals")));
                status("Amounts provided by Vidora");
            }
            @Override public void onFailure(Call<Map<String, Object>> call, Throwable cause) {
                status("Network error. Tap to retry.");
            }
        });
        findViewById(R.id.tv_status).setOnClickListener(v -> {
            earningsPage = 1;
            loadAll();
        });
    }

    private void loadMethods() {
        ApiClient.getService().getPaymentMethods().enqueue(new Callback<Map<String, Object>>() {
            @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (isFinishing()) return;
                Map<String, Object> values = data(response);
                Object list = values == null ? null : values.get("methods");
                if (!(list instanceof List)) { ((TextView) findViewById(R.id.tv_methods)).setText("Could not load methods. Tap to retry."); return; }
                methods.clear();
                for (Object item : (List<?>) list) if (item instanceof Map) methods.add((Map<String, Object>) item);
                StringBuilder display = new StringBuilder();
                for (Map<String, Object> method : methods) {
                    if (display.length() > 0) display.append("\n");
                    display.append(String.valueOf(method.get("method")).toUpperCase(Locale.US))
                        .append(" · ").append(String.valueOf(method.get("name")));
                }
                ((TextView) findViewById(R.id.tv_methods)).setText(display.length() == 0 ? "No payout method saved" : display.toString());
            }
            @Override public void onFailure(Call<Map<String, Object>> call, Throwable cause) {
                if (!isFinishing()) ((TextView) findViewById(R.id.tv_methods)).setText("Network error. Tap to retry.");
            }
        });
        findViewById(R.id.tv_methods).setOnClickListener(v -> loadMethods());
    }

    private void loadReferrals() {
        ApiClient.getService().getReferralStats().enqueue(new Callback<Map<String, Object>>() {
            @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (isFinishing()) return;
                Map<String, Object> values = data(response);
                if (values == null) { ((TextView) findViewById(R.id.tv_referrals)).setText("Could not load referrals"); return; }
                referralCode = values.get("referral_code") instanceof String ? (String) values.get("referral_code") : null;
                ((TextView) findViewById(R.id.tv_referrals)).setText(
                    "People referred: " + String.valueOf(values.get("total_referrals"))
                    + "\nEarned: " + money(values.get("total_earned")));
                findViewById(R.id.btn_share_referral).setVisibility(referralCode == null ? View.GONE : View.VISIBLE);
            }
            @Override public void onFailure(Call<Map<String, Object>> call, Throwable cause) {
                if (!isFinishing()) ((TextView) findViewById(R.id.tv_referrals)).setText("Network error loading referrals");
            }
        });
    }

    private void loadHistory() {
        if (earningsLoading) return;
        earningsLoading = true;
        ApiClient.getService().getEarningsHistory(earningsPage, 20).enqueue(new Callback<Map<String, Object>>() {
            @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (isFinishing()) return;
                earningsLoading = false;
                Map<String, Object> values = data(response);
                if (values == null) { status("Could not load earnings history. Tap to retry."); return; }
                showRows(R.id.list_earnings, values == null ? null : values.get("earnings"),
                    earningsPage == 1 ? "No earnings yet" : "", "type", "amount", "created_at", earningsPage == 1);
                Object pagination = values == null ? null : values.get("pagination");
                double pages = pagination instanceof Map ? number(((Map<?, ?>) pagination).get("pages")) : 0;
                findViewById(R.id.btn_more_earnings).setVisibility(earningsPage < pages ? View.VISIBLE : View.GONE);
                earningsPage++;
            }
            @Override public void onFailure(Call<Map<String, Object>> call, Throwable cause) {
                earningsLoading = false;
                if (!isFinishing()) status("Could not load earnings history. Tap to retry.");
            }
        });
    }

    private void loadPayouts() {
        ApiClient.getService().getPayoutHistory().enqueue(new Callback<Map<String, Object>>() {
            @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (isFinishing()) return;
                Map<String, Object> values = data(response);
                showRows(R.id.list_payouts, values == null ? null : values.get("payouts"), "No payout requests yet", "status", "amount", "requested_at", true);
            }
            @Override public void onFailure(Call<Map<String, Object>> call, Throwable cause) {
                if (!isFinishing()) showRows(R.id.list_payouts, null, "Could not load payout history", "status", "amount", "requested_at", true);
            }
        });
    }

    private void showRows(int containerId, Object rows, String empty, String titleKey, String amountKey, String dateKey, boolean clear) {
        LinearLayout container = findViewById(containerId);
        if (clear) container.removeAllViews();
        if (!(rows instanceof List) || ((List<?>) rows).isEmpty()) {
            if (empty.isEmpty()) return;
            TextView label = new TextView(this);
            label.setText(empty);
            label.setTextColor(getColor(R.color.text_muted));
            label.setPadding(0, 12, 0, 12);
            container.addView(label);
            return;
        }
        for (Object item : (List<?>) rows) {
            if (!(item instanceof Map)) continue;
            Map<?, ?> row = (Map<?, ?>) item;
            TextView label = new TextView(this);
            String date = String.valueOf(row.get(dateKey));
            label.setText(String.valueOf(row.get(titleKey)) + " · " + money(row.get(amountKey))
                + "\n" + (date.length() >= 10 ? date.substring(0, 10) : date));
            label.setTextColor(getColor(R.color.text_primary));
            label.setTextSize(14);
            label.setBackgroundResource(R.drawable.bg_settings_card);
            label.setPadding(16, 12, 16, 12);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
            params.topMargin = 8;
            container.addView(label, params);
        }
    }

    private LinearLayout form() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(24, 8, 24, 0);
        return layout;
    }
    private EditText field(String hint, int inputType) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setInputType(inputType);
        input.setSingleLine(true);
        return input;
    }

    private void addMethod() {
        LinearLayout form = form();
        Spinner kind = new Spinner(this);
        String[] choices = {"upi", "paypal", "bank"};
        kind.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, choices));
        EditText name = field("Account holder name", android.text.InputType.TYPE_CLASS_TEXT);
        EditText account = field("UPI ID, email, or account number", android.text.InputType.TYPE_CLASS_TEXT);
        EditText ifsc = field("IFSC (bank only)", android.text.InputType.TYPE_CLASS_TEXT);
        form.addView(kind); form.addView(name); form.addView(account); form.addView(ifsc);
        new AlertDialog.Builder(this).setTitle("Payout method").setView(form)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Save", (dialog, which) -> {
                if (name.getText().toString().trim().isEmpty() || account.getText().toString().trim().isEmpty()) {
                    error("Name and account ID are required"); return;
                }
                Map<String, Object> body = new HashMap<>();
                body.put("method", choices[kind.getSelectedItemPosition()]);
                body.put("name", name.getText().toString().trim());
                body.put("account_id", account.getText().toString().trim());
                body.put("ifsc_code", ifsc.getText().toString().trim());
                ApiClient.getService().savePaymentMethod(body).enqueue(new Callback<Map<String, Object>>() {
                    @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                        if (response.isSuccessful()) loadMethods(); else error("Could not save payout method");
                    }
                    @Override public void onFailure(Call<Map<String, Object>> call, Throwable cause) { error("Network error saving payout method"); }
                });
            }).show();
    }

    private void requestPayout() {
        if (!Double.isFinite(available) || !Double.isFinite(minimum)) { error("Wait for balance to load"); return; }
        if (methods.isEmpty()) { error("Add a payout method first"); return; }
        LinearLayout form = form();
        EditText amount = field("Amount in USD", android.text.InputType.TYPE_CLASS_NUMBER | android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL);
        Spinner kind = new Spinner(this);
        List<String> labels = new ArrayList<>();
        for (Map<String, Object> method : methods) labels.add(String.valueOf(method.get("method")).toUpperCase(Locale.US)
            + " · " + String.valueOf(method.get("name")));
        kind.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, labels));
        form.addView(amount); form.addView(kind);
        new AlertDialog.Builder(this).setTitle("Request payout").setMessage("Minimum: " + money(minimum) + " · Available: " + money(available))
            .setView(form).setNegativeButton("Cancel", null)
            .setPositiveButton("Request", (dialog, which) -> {
                double requested;
                try { requested = Double.parseDouble(amount.getText().toString()); }
                catch (NumberFormatException e) { error("Enter a valid amount"); return; }
                if (!Double.isFinite(requested) || requested < minimum || requested > available) {
                    error("Amount must be within your available balance and minimum"); return;
                }
                Map<String, Object> body = new HashMap<>();
                body.put("amount", requested);
                body.put("method", methods.get(kind.getSelectedItemPosition()).get("method"));
                ApiClient.getService().requestPayout(body).enqueue(new Callback<Map<String, Object>>() {
                    @Override public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                        if (response.isSuccessful()) { status("Payout requested"); loadSummary(); loadPayouts(); }
                        else error("Payout request was rejected. Check your balance and method.");
                    }
                    @Override public void onFailure(Call<Map<String, Object>> call, Throwable cause) { error("Network error requesting payout"); }
                });
            }).show();
    }
}
