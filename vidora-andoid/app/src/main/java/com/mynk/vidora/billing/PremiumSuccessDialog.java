package com.mynk.vidora.billing;

import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.Window;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;

import com.mynk.vidora.R;

/**
 * Shows a professional animated congratulation dialog when user becomes premium.
 */
public class PremiumSuccessDialog {

    public static void show(Activity activity) {
        Dialog dialog = new Dialog(activity);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setCancelable(false);

        View view = LayoutInflater.from(activity).inflate(R.layout.dialog_premium_success, null);
        dialog.setContentView(view);

        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            dialog.getWindow().setDimAmount(0.8f);
        }

        // Animate dialog entrance
        Animation bounceIn = AnimationUtils.loadAnimation(activity, R.anim.scale_bounce_in);
        view.startAnimation(bounceIn);

        // Animate crown pulse
        View crown = view.findViewById(R.id.iv_crown);
        Animation pulse = AnimationUtils.loadAnimation(activity, R.anim.crown_pulse);
        crown.startAnimation(pulse);

        // Continue button
        view.findViewById(R.id.btn_continue).setOnClickListener(v -> {
            crown.clearAnimation();
            dialog.dismiss();
        });

        dialog.show();
    }
}
