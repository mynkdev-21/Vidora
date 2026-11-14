package com.mynk.vidora.ads;

/** Exposes package-private AdsConfig logic to tests in other packages. */
public final class AdsConfigTestAccess {
    private AdsConfigTestAccess() {}

    public static String unit(String configured, String testUnit) {
        return AdsConfig.unit(configured, testUnit);
    }
}
