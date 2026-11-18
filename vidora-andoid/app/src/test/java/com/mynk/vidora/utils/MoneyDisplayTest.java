package com.mynk.vidora.utils;

import static org.junit.Assert.*;
import org.junit.Test;

public class MoneyDisplayTest {
    @Test public void formatsBackendNumberAndDatabaseDecimal() {
        assertEquals("$1,234.50", MoneyDisplay.usd(1234.5));
        assertEquals("$0.01", MoneyDisplay.usd("0.0100"));
        assertEquals("—", MoneyDisplay.usd(null));
        assertEquals("—", MoneyDisplay.usd("not a number"));
        assertEquals("—", MoneyDisplay.usd(Double.POSITIVE_INFINITY));
    }
}
