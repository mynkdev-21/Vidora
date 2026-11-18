package com.mynk.vidora;

import static org.junit.Assert.*;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.PrefsManager;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.security.KeyStore;

@RunWith(AndroidJUnit4.class)
public class EncryptedSessionTest {
    private Context context() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }

    @Test
    public void encryptedPersistenceAndLogout() {
        Context context = context();
        PrefsManager prefs = new PrefsManager(context);
        prefs.clear();
        assertTrue(prefs.saveTokens("access-test-token", "refresh-test-token"));
        assertEquals("access-test-token", new PrefsManager(context).getAccessToken());
        assertEquals("refresh-test-token", new PrefsManager(context).getRefreshToken());
        SharedPreferences plain = context.getSharedPreferences(Constants.PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences encrypted = context.getSharedPreferences(PrefsManager.SECURE_PREFS_NAME, Context.MODE_PRIVATE);
        assertFalse(plain.contains(Constants.PREF_ACCESS_TOKEN));
        assertFalse(plain.contains(Constants.PREF_REFRESH_TOKEN));
        assertFalse(encrypted.getString("access", "").contains("access-test-token"));
        prefs.clear();
        assertNull(new PrefsManager(context).getAccessToken());
        assertNull(new PrefsManager(context).getRefreshToken());
    }

    @Test
    public void migratesLegacyOnceAndDeletesPlaintext() {
        Context context = context();
        PrefsManager prefs = new PrefsManager(context);
        prefs.clear();
        SharedPreferences plain = context.getSharedPreferences(Constants.PREFS_NAME, Context.MODE_PRIVATE);
        plain.edit().putString(Constants.PREF_ACCESS_TOKEN, "old-access")
            .putString(Constants.PREF_REFRESH_TOKEN, "old-refresh").commit();
        assertEquals("old-access", prefs.getAccessToken());
        assertEquals("old-refresh", prefs.getRefreshToken());
        assertFalse(plain.contains(Constants.PREF_ACCESS_TOKEN));
        assertFalse(plain.contains(Constants.PREF_REFRESH_TOKEN));
        prefs.clear();
    }

    @Test
    public void corruptedCiphertextOrLostKeyInvalidatesSession() throws Exception {
        Context context = context();
        PrefsManager prefs = new PrefsManager(context);
        prefs.clear();
        assertTrue(prefs.saveTokens("a", "r"));
        SharedPreferences encrypted = context.getSharedPreferences(PrefsManager.SECURE_PREFS_NAME, Context.MODE_PRIVATE);
        encrypted.edit().putString("access", "corrupted").commit();
        assertNull(prefs.getAccessToken());
        assertNull(prefs.getRefreshToken());

        assertTrue(prefs.saveTokens("a", "r"));
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        store.deleteEntry("vidora_session_aes_v1");
        assertNull(prefs.getAccessToken());
        assertNull(prefs.getRefreshToken());
    }
}
