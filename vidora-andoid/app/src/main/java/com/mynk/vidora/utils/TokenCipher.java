package com.mynk.vidora.utils;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** AES-GCM envelope shared by Android Keystore storage and host-side tests. */
final class TokenCipher {
    private static final int IV_BYTES = 12;
    private static final int TAG_BYTES = 16;

    private TokenCipher() {}

    static byte[] encrypt(SecretKey key, String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] iv = cipher.getIV();
        if (iv == null || iv.length != IV_BYTES) throw new IllegalStateException("Unexpected GCM IV");
        byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        return ByteBuffer.allocate(iv.length + ciphertext.length).put(iv).put(ciphertext).array();
    }

    static String decrypt(SecretKey key, byte[] data) throws Exception {
        if (data == null || data.length <= IV_BYTES + TAG_BYTES) {
            throw new IllegalArgumentException("Invalid encrypted token");
        }
        byte[] iv = new byte[IV_BYTES];
        System.arraycopy(data, 0, iv, 0, IV_BYTES);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
        return new String(cipher.doFinal(data, IV_BYTES, data.length - IV_BYTES), StandardCharsets.UTF_8);
    }
}
