package com.mynk.vidora.utils;

import static org.junit.Assert.*;

import org.junit.Test;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.AEADBadTagException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class TokenCipherTest {
    private SecretKey key() throws Exception {
        KeyGenerator generator = KeyGenerator.getInstance("AES");
        generator.init(256);
        return generator.generateKey();
    }

    @Test
    public void encryptsAndDecryptsWithoutPlaintext() throws Exception {
        SecretKey key = key();
        String token = "access-token-with-private-claims";
        byte[] stored = TokenCipher.encrypt(key, token);
        assertEquals(token, TokenCipher.decrypt(key, stored));
        assertFalse(new String(stored, StandardCharsets.ISO_8859_1).contains(token));
        assertFalse(Arrays.equals(stored, TokenCipher.encrypt(key, token)));
    }

    @Test
    public void corruptedOrWrongKeyCannotDecrypt() throws Exception {
        SecretKey key = key();
        byte[] stored = TokenCipher.encrypt(key, "refresh-token");
        stored[stored.length - 1] ^= 1;
        assertThrows(AEADBadTagException.class, () -> TokenCipher.decrypt(key, stored));
        byte[] valid = TokenCipher.encrypt(key, "refresh-token");
        assertThrows(AEADBadTagException.class, () -> TokenCipher.decrypt(key(), valid));
        assertThrows(IllegalArgumentException.class, () -> TokenCipher.decrypt(key, new byte[4]));
    }
}
