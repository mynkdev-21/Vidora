package com.mynk.vidora.utils;

import android.app.Activity;
import android.content.Intent;
import android.view.View;

import com.mynk.vidora.R;
import com.mynk.vidora.ui.home.HomeActivity;
import com.mynk.vidora.ui.upload.UploadActivity;
import com.mynk.vidora.ui.profile.ProfileActivity;
import com.mynk.vidora.ui.saved.SavedActivity;
import com.mynk.vidora.ui.feed.FeedActivity;

public final class NavHelper {

    private NavHelper() {}

    private static void navigate(Activity activity, Class<?> target, boolean finishCurrent) {
        Intent intent = new Intent(activity, target);
        intent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        activity.startActivity(intent);
        activity.overridePendingTransition(0, 0); // No animation — seamless switch
        if (finishCurrent) activity.finish();
    }

    public static void setup(Activity activity) {
        View navHome = activity.findViewById(R.id.nav_home);
        View navSearch = activity.findViewById(R.id.nav_search);
        View navAdd = activity.findViewById(R.id.nav_add);
        View navSaved = activity.findViewById(R.id.nav_saved);
        View navProfile = activity.findViewById(R.id.nav_profile);

        if (navHome != null) navHome.setOnClickListener(v -> {
            if (!(activity instanceof HomeActivity)) {
                navigate(activity, HomeActivity.class, true);
            }
        });

        if (navSearch != null) navSearch.setOnClickListener(v -> {
            if (!(activity instanceof FeedActivity)) {
                navigate(activity, FeedActivity.class, true);
            }
        });

        if (navAdd != null) navAdd.setOnClickListener(v -> {
            if (!(activity instanceof UploadActivity)) {
                navigate(activity, UploadActivity.class, false);
            }
        });

        if (navSaved != null) navSaved.setOnClickListener(v -> {
            if (!(activity instanceof SavedActivity)) {
                navigate(activity, SavedActivity.class, true);
            }
        });

        if (navProfile != null) navProfile.setOnClickListener(v -> {
            if (!(activity instanceof ProfileActivity)) {
                navigate(activity, ProfileActivity.class, true);
            }
        });
    }
}
