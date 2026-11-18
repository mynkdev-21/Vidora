package com.mynk.vidora.api;

import android.content.Context;
import android.content.Intent;

import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.PrefsManager;

import org.json.JSONObject;

import java.io.File;

import okhttp3.Cache;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okhttp3.MediaType;
import okhttp3.RequestBody;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

import java.util.concurrent.TimeUnit;

/**
 * Singleton Retrofit client.
 * Automatically attaches X-API-Key header to every request.
 * Detects banned accounts and broadcasts logout event.
 */
public class ApiClient {

    private static Retrofit retrofit = null;
    private static volatile String accessToken = null;
    private static Context appContext = null;
    private static final Object refreshLock = new Object();

    public static final String ACTION_ACCOUNT_BANNED = "com.mynk.vidora.ACCOUNT_BANNED";

    public static void init(Context context) {
        appContext = context.getApplicationContext();
    }

    public static void setAccessToken(String token) {
        accessToken = token;
    }

    /** Call after Remote Config updates to rebuild client with new base URL */
    public static void resetClient() {
        retrofit = null;
    }

    public static Retrofit getClient() {
        if (retrofit == null) {
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(com.mynk.vidora.BuildConfig.DEBUG
                ? HttpLoggingInterceptor.Level.BASIC : HttpLoggingInterceptor.Level.NONE);

            OkHttpClient.Builder clientBuilder = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS);

            // 10MB disk cache for API responses (trending, feed, etc.)
            if (appContext != null) {
                File cacheDir = new File(appContext.getCacheDir(), "http_cache");
                Cache cache = new Cache(cacheDir, 10 * 1024 * 1024); // 10 MB
                clientBuilder.cache(cache);
            }

            OkHttpClient client = clientBuilder
                .addInterceptor(chain -> {
                    Request.Builder builder = chain.request().newBuilder()
                        .addHeader("X-API-Key", Constants.API_KEY)
                        .addHeader("Content-Type", "application/json");

                    if (accessToken != null && !accessToken.isEmpty()) {
                        builder.addHeader("Authorization", "Bearer " + accessToken);
                    }

                    return chain.proceed(builder.build());
                })
                .addInterceptor(chain -> {
                    Response response = chain.proceed(chain.request());

                    // Check for banned account on 401 responses
                    if (response.code() == 401 && response.body() != null) {
                        String bodyString = response.peekBody(2048).string();
                        if (bodyString.contains("ACCOUNT_BANNED") && appContext != null) {
                            // Broadcast banned event
                            Intent intent = new Intent(ACTION_ACCOUNT_BANNED);
                            intent.setPackage(appContext.getPackageName());
                            appContext.sendBroadcast(intent);
                        }
                    }

                    return response;
                })
                .addInterceptor(logging)
                .authenticator((route, response) -> {
                    String oldHeader = response.request().header("Authorization");
                    if (appContext == null || oldHeader == null || responseCount(response) > 1
                            || response.request().url().encodedPath().startsWith("/api/auth/")) return null;
                    synchronized (refreshLock) {
                        PrefsManager prefs = new PrefsManager(appContext);
                        String current = prefs.getAccessToken();
                        if (current == null) return null;
                        String bearer = "Bearer " + current;
                        if (oldHeader.equals(bearer)) {
                            String rotated = refreshMobileTokens(prefs);
                            if (rotated == null) return null;
                            bearer = "Bearer " + rotated;
                        }
                        return response.request().newBuilder().header("Authorization", bearer).build();
                    }
                })
                .build();

            retrofit = new Retrofit.Builder()
                .baseUrl(com.mynk.vidora.utils.RemoteConfigManager.getBaseUrl())
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build();
        }
        return retrofit;
    }

    public static ApiService getService() {
        return getClient().create(ApiService.class);
    }

    private static int responseCount(Response response) {
        int count = 1;
        while ((response = response.priorResponse()) != null) count++;
        return count;
    }

    private static String refreshMobileTokens(PrefsManager prefs) {
        String refresh = prefs.getRefreshToken();
        if (refresh == null) return null;
        try {
            JSONObject body = new JSONObject().put("refreshToken", refresh);
            Request request = new Request.Builder()
                .url(com.mynk.vidora.utils.RemoteConfigManager.getBaseUrl() + "api/auth/refresh")
                .header("X-API-Key", Constants.API_KEY)
                .post(RequestBody.create(body.toString(), MediaType.parse("application/json")))
                .build();
            // A separate client prevents the refresh call from recursively invoking this authenticator.
            try (Response result = new OkHttpClient.Builder()
                    .connectTimeout(15, TimeUnit.SECONDS).readTimeout(15, TimeUnit.SECONDS)
                    .build().newCall(request).execute()) {
                if (result.code() == 401 || result.code() == 403) {
                    prefs.clear();
                    return null;
                }
                if (!result.isSuccessful() || result.body() == null) return null;
                JSONObject data = new JSONObject(result.body().string()).getJSONObject("data");
                String access = data.getString("accessToken");
                String nextRefresh = data.getString("refreshToken");
                if (!prefs.saveTokens(access, nextRefresh)) return null;
                setAccessToken(access);
                return access;
            }
        } catch (Exception ignored) {
            // A transient network failure leaves the stored refresh token available for the next request.
            return null;
        }
    }
}
