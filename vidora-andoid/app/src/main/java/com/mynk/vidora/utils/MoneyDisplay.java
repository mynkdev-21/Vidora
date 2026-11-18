package com.mynk.vidora.utils;

import java.util.Locale;

/** Presentation only. Balances and limits must come from the backend. */
public final class MoneyDisplay {
    private MoneyDisplay() {}

    public static double number(Object value) {
        if (value instanceof Number) return ((Number) value).doubleValue();
        if (value instanceof String) {
            try { return Double.parseDouble((String) value); }
            catch (NumberFormatException ignored) { }
        }
        return Double.NaN;
    }

    public static String usd(Object value) {
        double amount = number(value);
        return Double.isFinite(amount) ? String.format(Locale.US, "$%,.2f", amount) : "—";
    }
}
