package com.mynk.vidora.utils;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.mynk.vidora.api.ApiClient;

import java.security.KeyStore;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

/** User metadata in ordinary preferences; bearer tokens encrypted by Android Keystore. */
public class PrefsManager {
    public static final String SECURE_PREFS_NAME = "vidora_secure_tokens";
    private static final String KEY_ALIAS = "vidora_session_aes_v1";
    private static final String ACCESS = "access";
    private static final String REFRESH = "refresh";

    private final SharedPreferences prefs;
    private final SharedPreferences securePrefs;

    public PrefsManager(Context context) {
        prefs = context.getSharedPreferences(Constants.PREFS_NAME, Context.MODE_PRIVATE);
        securePrefs = context.getSharedPreferences(SECURE_PREFS_NAME, Context.MODE_PRIVATE);
    }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        SecretKey existing = (SecretKey) store.getKey(KEY_ALIAS, null);
        if (existing != null) return existing;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build());
        return generator.generateKey();
    }

    private String encrypt(String value) throws Exception {
        return Base64.encodeToString(TokenCipher.encrypt(key(), value), Base64.NO_WRAP);
    }

    private String decrypt(String encoded) throws Exception {
        return TokenCipher.decrypt(key(), Base64.decode(encoded, Base64.NO_WRAP));
    }

    private void clearTokens() {
        try { securePrefs.edit().remove(ACCESS).remove(REFRESH).commit(); } catch (RuntimeException ignored) {}
        try { prefs.edit().remove(Constants.PREF_ACCESS_TOKEN).remove(Constants.PREF_REFRESH_TOKEN).commit(); } catch (RuntimeException ignored) {}
        ApiClient.setAccessToken(null);
    }

    /** Encrypt both legacy values before deleting plaintext; never fall back after a crypto error. */
    private synchronized void migrateLegacyTokens() {
        boolean secureExists = securePrefs.contains(ACCESS) || securePrefs.contains(REFRESH);
        if (secureExists) {
            // A previous migration may have completed its encrypted write but
            // crashed before removing plaintext. Prefer encrypted data only.
            prefs.edit().remove(Constants.PREF_ACCESS_TOKEN).remove(Constants.PREF_REFRESH_TOKEN).commit();
            return;
        }
        String oldAccess = prefs.getString(Constants.PREF_ACCESS_TOKEN, null);
        String oldRefresh = prefs.getString(Constants.PREF_REFRESH_TOKEN, null);
        if (oldAccess == null && oldRefresh == null) return;
        if (oldAccess == null || oldRefresh == null || !saveTokens(oldAccess, oldRefresh)) clearTokens();
    }

    public synchronized boolean saveTokens(String accessToken, String refreshToken) {
        if (accessToken == null || accessToken.isEmpty() || refreshToken == null || refreshToken.isEmpty()) {
            clearTokens();
            return false;
        }
        try {
            String access = encrypt(accessToken);
            String refresh = encrypt(refreshToken);
            if (!securePrefs.edit().putString(ACCESS, access).putString(REFRESH, refresh).commit()) {
                clearTokens();
                return false;
            }
            if (!prefs.edit().remove(Constants.PREF_ACCESS_TOKEN).remove(Constants.PREF_REFRESH_TOKEN).commit()) {
                clearTokens();
                return false;
            }
            return true;
        } catch (Exception e) {
            clearTokens();
            return false;
        }
    }

    private synchronized String readToken(String name) {
        try {
            migrateLegacyTokens();
            String encryptedAccess = securePrefs.getString(ACCESS, null);
            String encryptedRefresh = securePrefs.getString(REFRESH, null);
            if (encryptedAccess == null && encryptedRefresh == null) return null;
            if (encryptedAccess == null || encryptedRefresh == null) {
                clearTokens();
                return null;
            }
            String access = decrypt(encryptedAccess);
            String refresh = decrypt(encryptedRefresh);
            return ACCESS.equals(name) ? access : refresh;
        } catch (Exception e) {
            clearTokens();
            return null;
        }
    }

    public String getAccessToken() { return readToken(ACCESS); }
    public String getRefreshToken() { return readToken(REFRESH); }

    public void saveUser(String id, String name, String email) {
        prefs.edit()
            .putString(Constants.PREF_USER_ID, id)
            .putString(Constants.PREF_USER_NAME, name)
            .putString(Constants.PREF_USER_EMAIL, email)
            .apply();
    }
    public String getUserName() { return prefs.getString(Constants.PREF_USER_NAME, ""); }
    public String getUserEmail() { return prefs.getString(Constants.PREF_USER_EMAIL, ""); }
    public String getUserId() { return prefs.getString(Constants.PREF_USER_ID, ""); }
    public boolean isLoggedIn() {
        String token = getAccessToken();
        return token != null && !token.isEmpty();
    }
    public static String getStaticToken(Context context) {
        return new PrefsManager(context).getAccessToken();
    }
    public void clear() {
        clearTokens();
        prefs.edit().clear().apply();
    }
}
