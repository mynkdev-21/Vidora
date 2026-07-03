package com.mynk.vidora.utils;

import android.app.Activity;

/**
 * Minimal helper — just ensures consistent look.
 * All inset handling is done via XML fitsSystemWindows="true".
 * This works on ALL devices without any hacks.
 */
public final class FullScreenHelper {

    private FullScreenHelper() {}

    public static void enable(Activity activity) {
        // No-op — all handled by theme + XML fitsSystemWindows
        // Keeping this method so existing calls don't break
    }
}
