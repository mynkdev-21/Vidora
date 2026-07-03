package com.mynk.vidora.ads;

import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.Window;

import com.mynk.vidora.R;

import java.net.InetAddress;

/**
 * Detects ad blockers by trying to resolve ad domains.
 * Shows a blocking dialog if ads are being blocked.
 */
public class AdBlockerDetector {

    public interface OnRetryListener {
        void onRetry();
    }

    /**
     * Check if ads are being blocked (runs on background thread).
     * Call from Activity — shows dialog if blocked.
     */
    public static void check(Activity activity, OnRetryListener retryListener) {
        new Thread(() -> {
            // Skip ad blocker check if device is offline
            if (!isNetworkAvailable(activity)) return;

            boolean blocked = isAdBlocked();
            if (blocked) {
                activity.runOnUiThread(() -> showDialog(activity, retryListener));
            }
        }).start();
    }

    private static boolean isNetworkAvailable(Activity activity) {
        android.net.ConnectivityManager cm = (android.net.ConnectivityManager)
            activity.getSystemService(android.content.Context.CONNECTIVITY_SERVICE);
        android.net.NetworkInfo info = cm != null ? cm.getActiveNetworkInfo() : null;
        return info != null && info.isConnected();
    }

    /**
     * Try to resolve Google ad domains — if they fail, ads are blocked.
     */
    private static boolean isAdBlocked() {
        String[] adDomains = {
            "pagead2.googlesyndication.com",
            "googleads.g.doubleclick.net",
            "adservice.google.com"
        };

        for (String domain : adDomains) {
            try {
                InetAddress address = InetAddress.getByName(domain);
                // If resolved to 0.0.0.0 or 127.0.0.1, it's blocked
                String ip = address.getHostAddress();
                if (ip != null && (ip.equals("0.0.0.0") || ip.equals("127.0.0.1"))) {
                    return true;
                }
            } catch (Exception e) {
                // DNS resolution failed — likely blocked
                return true;
            }
        }
        return false;
    }

    /**
     * Show the ad blocker detected dialog.
     */
    private static void showDialog(Activity activity, OnRetryListener retryListener) {
        Dialog dialog = new Dialog(activity);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setCancelable(false);

        View view = LayoutInflater.from(activity).inflate(R.layout.dialog_adblocker, null);
        dialog.setContentView(view);

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.parseColor("#0E0E1A")));
        }

        // Retry button — check again, show dialog again if still blocked
        view.findViewById(R.id.btn_retry).setOnClickListener(v -> {
            dialog.dismiss();
            // Re-check after short delay
            new Thread(() -> {
                try { Thread.sleep(500); } catch (Exception ignored) {}
                boolean stillBlocked = isAdBlocked();
                activity.runOnUiThread(() -> {
                    if (stillBlocked) {
                        showDialog(activity, retryListener);
                    } else {
                        if (retryListener != null) retryListener.onRetry();
                    }
                });
            }).start();
        });

        // Exit button
        view.findViewById(R.id.btn_exit).setOnClickListener(v -> {
            dialog.dismiss();
            activity.finishAffinity();
        });

        dialog.show();
    }
}
