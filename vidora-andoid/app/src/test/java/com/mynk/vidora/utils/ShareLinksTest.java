package com.mynk.vidora.utils;

import static org.junit.Assert.*;
import org.junit.Test;

public class ShareLinksTest {
    private static final String WEB = "https://vidora.app/";

    @Test public void acceptsOnlyConfiguredShareLinks() {
        assertEquals("AbCdEf1234567890", ShareLinks.token("https://vidora.app/v/AbCdEf1234567890?utm=x", WEB));
        assertEquals("AbCdEf1234567890", ShareLinks.token("vidora://view/AbCdEf1234567890", WEB));
        assertEquals("AbCdEf1234567890", ShareLinks.token("vidora://download/AbCdEf1234567890", WEB));
        assertEquals("AbCdEf1234567890", ShareLinks.token("AbCdEf1234567890", WEB));
        assertNull(ShareLinks.token("https://evil.example/v/AbCdEf1234567890", WEB));
        assertNull(ShareLinks.token("https://vidora.app/v/AbCdEf1234567890/extra", WEB));
        assertNull(ShareLinks.token("https://vidora.app/v/", WEB));
        assertNull(ShareLinks.token("vidora://other/AbCdEf1234567890", WEB));
    }
}
