package com.mynk.vidora.api;

import android.content.Context;
import android.content.Intent;

import com.mynk.vidora.utils.Constants;

import java.io.File;

import okhttp3.Cache;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
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
    private static String accessToken = null;
    private static Context appContext = null;

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
            logging.setLevel(HttpLoggingInterceptor.Level.BODY);

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
}
