package com.mynk.vidora;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.mynk.vidora.ads.AdsConfigTestAccess;
import com.mynk.vidora.utils.Constants;

import org.junit.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Regression tests for the Android findings in the security audit (P2f, P3):
 * cleartext traffic, token backups, hardcoded environment config, AdMob IDs.
 * Unit tests run with the module directory as the working directory.
 */
public class SecurityConfigTest {

    private static String read(String path) throws IOException {
        return new String(Files.readAllBytes(Paths.get(path)), StandardCharsets.UTF_8);
    }

    @Test
    public void releaseNetworkConfigRefusesCleartext() throws IOException {
        String xml = read("src/main/res/xml/network_security_config.xml");
        assertTrue(xml.contains("cleartextTrafficPermitted=\"false\""));
        assertFalse(xml.contains("cleartextTrafficPermitted=\"true\""));
        String manifest = read("src/main/AndroidManifest.xml");
        assertTrue(manifest.contains("android:networkSecurityConfig=\"@xml/network_security_config\""));
        assertFalse("usesCleartextTraffic must not be enabled", manifest.contains("usesCleartextTraffic=\"true\""));
    }

    @Test
    public void authTokensAreNeverBackedUp() throws IOException {
        String legacy = read("src/main/res/xml/backup_rules.xml");
        String modern = read("src/main/res/xml/data_extraction_rules.xml");
        String exclude = "<exclude domain=\"sharedpref\" path=\"" + Constants.PREFS_NAME + ".xml\" />";
        assertTrue(legacy.contains(exclude));
        // Both cloud backup and device transfer.
        assertEquals(2, modern.split(Pattern.quote(exclude), -1).length - 1);
    }

    @Test
    public void noLanAddressesOrLiveKeysInSource() throws IOException {
        Pattern lanIp = Pattern.compile("\\b(10\\.\\d{1,3}|192\\.168|172\\.(1[6-9]|2\\d|3[01]))\\.\\d{1,3}\\.\\d{1,3}\\b");
        Pattern liveKey = Pattern.compile("vdr_live_[0-9a-f]{16,}");
        List<Path> files;
        try (Stream<Path> walk = Files.walk(Paths.get("src/main"))) {
            files = walk.filter(p -> p.toString().endsWith(".java") || p.toString().endsWith(".xml")).collect(Collectors.toList());
        }
        for (Path file : files) {
            String text = read(file.toString());
            assertFalse("LAN address in " + file, lanIp.matcher(text).find());
            assertFalse("Client key in " + file, liveKey.matcher(text).find());
        }
    }

    @Test
    public void layoutsDoNotHardcodeAdUnits() throws IOException {
        try (Stream<Path> walk = Files.walk(Paths.get("src/main/res/layout"))) {
            for (Path p : walk.filter(f -> f.toString().endsWith(".xml")).collect(Collectors.toList())) {
                assertFalse("adUnitId set in " + p + " (it can only be set once; AdsConfig sets it at runtime)",
                        read(p.toString()).contains("adUnitId="));
            }
        }
    }

    @Test
    public void debugBuildsOnlyEverUseGoogleTestAdUnits() {
        assertTrue("unit tests run against the debug variant", BuildConfig.DEBUG);
        assertEquals(Constants.TEST_AD_BANNER, AdsConfigTestAccess.unit("ca-app-pub-9387570944207452/1111111111", Constants.TEST_AD_BANNER));
        assertEquals("", AdsConfigTestAccess.unit("", Constants.TEST_AD_BANNER));
        assertEquals("", AdsConfigTestAccess.unit(null, Constants.TEST_AD_BANNER));
    }
}
