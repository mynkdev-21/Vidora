package com.mynk.vidora.utils;

import android.os.Handler;
import android.os.Looper;

import com.mynk.vidora.api.ApiClient;

import org.json.JSONObject;

import java.util.Collections;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Counts a view with the server's ticket flow:
 *   1. start()  — request a one-time ticket when playback/display begins;
 *   2. after the server's minimum watch time, redeem it — but only while the
 *      {@link Gate} says the content is still being watched.
 * The server decides whether the view is counted; this class never retries a
 * rejected ticket except when told "too soon".
 */
public final class ViewTracker {

    /** Returns true while the content is actually on screen / playing. */
    public interface Gate {
        boolean isWatching();
    }

    private static final long GATE_RECHECK_MS = 2000;
    private static final int MAX_TOO_SOON_RETRIES = 3;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final String ref;
    private final Gate gate;
    private boolean started;
    private boolean cancelled;

    public ViewTracker(String fileIdOrShareToken, Gate gate) {
        this.ref = fileIdOrShareToken;
        this.gate = gate;
    }

    public void start() {
        if (started || ref == null || ref.isEmpty()) return;
        started = true;
        ApiClient.getService().requestViewTicket(ref).enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (cancelled || !response.isSuccessful() || response.body() == null) return;
                Object data = response.body().get("data");
                if (!(data instanceof Map)) return;
                Object ticket = ((Map<?, ?>) data).get("ticket");
                Object min = ((Map<?, ?>) data).get("min_watch_seconds");
                if (!(ticket instanceof String)) return;
                long delayMs = (min instanceof Number ? ((Number) min).longValue() : 10L) * 1000L + 500L;
                handler.postDelayed(() -> redeemWhenWatching((String) ticket, 0), delayMs);
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) { /* offline: no view */ }
        });
    }

    private void redeemWhenWatching(String ticket, int attempt) {
        if (cancelled) return;
        if (!gate.isWatching()) {
            handler.postDelayed(() -> redeemWhenWatching(ticket, attempt), GATE_RECHECK_MS);
            return;
        }
        Map<String, String> body = Collections.singletonMap("ticket", ticket);
        ApiClient.getService().redeemView(ref, body).enqueue(new Callback<Map<String, Object>>() {
            @Override
            public void onResponse(Call<Map<String, Object>> call, Response<Map<String, Object>> response) {
                if (cancelled || response.isSuccessful() || attempt >= MAX_TOO_SOON_RETRIES) return;
                long retryAfter = tooSoonRetryAfterSeconds(response);
                if (retryAfter > 0) {
                    handler.postDelayed(() -> redeemWhenWatching(ticket, attempt + 1), retryAfter * 1000L + 500L);
                }
            }

            @Override
            public void onFailure(Call<Map<String, Object>> call, Throwable t) { /* best effort */ }
        });
    }

    private static long tooSoonRetryAfterSeconds(Response<?> response) {
        try {
            if (response.code() != 400 || response.errorBody() == null) return 0;
            JSONObject json = new JSONObject(response.errorBody().string());
            return "VIEW_TOO_SOON".equals(json.optString("code")) ? json.optLong("retry_after", 0) : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    /** Call from onDestroy(): stops any pending redemption. */
    public void cancel() {
        cancelled = true;
        handler.removeCallbacksAndMessages(null);
    }
}
