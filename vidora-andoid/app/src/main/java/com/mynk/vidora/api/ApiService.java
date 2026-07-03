package com.mynk.vidora.api;

import com.mynk.vidora.model.AuthResponse;
import com.mynk.vidora.model.FileListResponse;
import com.mynk.vidora.model.ProfileResponse;
import com.mynk.vidora.model.ShareViewResponse;
import com.mynk.vidora.model.StreamResponse;

import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.Path;
import retrofit2.http.Query;

/**
 * Retrofit API interface — all Vidora backend endpoints.
 */
public interface ApiService {

    // ── Auth ──────────────────────────────────────────────────────────────────
    @POST("api/auth/login")
    Call<AuthResponse> login(@Body Map<String, String> body);

    @POST("api/auth/register")
    Call<AuthResponse> register(@Body Map<String, String> body);

    @POST("api/auth/refresh")
    Call<AuthResponse> refreshToken(@Body Map<String, String> body);

    @POST("api/auth/logout")
    Call<Void> logout(@Body Map<String, String> body);

    // ── Files ─────────────────────────────────────────────────────────────────
    @GET("api/files")
    Call<FileListResponse> getFiles(@Query("page") int page, @Query("limit") int limit);

    // ── Trending (public — random files from all users) ───────────────────────
    @GET("api/files/trending")
    Call<FileListResponse> getTrending(@Query("limit") int limit);

    // ── Profile ───────────────────────────────────────────────────────────────
    @GET("api/users/profile")
    Call<ProfileResponse> getProfile();

    // ── Share / Stream ────────────────────────────────────────────────────────
    @GET("api/share/view/{token}")
    Call<ShareViewResponse> getSharedFile(@Path("token") String token);

    @GET("api/share/stream/{token}")
    Call<StreamResponse> getStreamUrl(@Path("token") String token);

    // ── View Count ────────────────────────────────────────────────────────────
    @POST("api/view/{token}")
    Call<Void> countView(@Path("token") String token);

    // ── Contact / Support Message ─────────────────────────────────────────────
    @POST("api/contact")
    Call<Map<String, Object>> sendContactMessage(@Body Map<String, String> body);

    // ── App Settings (public) ─────────────────────────────────────────────────
    @GET("api/settings")
    Call<Map<String, Object>> getAppSettings();

    // ── Notifications ─────────────────────────────────────────────────────────
    @GET("api/notifications")
    Call<Map<String, Object>> getNotifications();

    @PATCH("api/notifications/read-all")
    Call<Map<String, Object>> markAllNotificationsRead();

    // ── FCM Token ─────────────────────────────────────────────────────────────
    @POST("api/fcm/register")
    Call<Map<String, Object>> registerFcmToken(@Body Map<String, String> body);

    // ── Email Verification ────────────────────────────────────────────────────
    @POST("api/auth/resend-verification")
    Call<Map<String, Object>> resendVerification();

    // ── Avatar Upload ─────────────────────────────────────────────────────────
    @retrofit2.http.Multipart
    @POST("api/users/avatar")
    Call<Map<String, Object>> uploadAvatar(@retrofit2.http.Part okhttp3.MultipartBody.Part avatar);

    // ── Subscriptions ─────────────────────────────────────────────────────────
    @POST("api/subscribe/{creatorId}")
    Call<Map<String, Object>> subscribe(@Path("creatorId") String creatorId);

    @retrofit2.http.DELETE("api/subscribe/{creatorId}")
    Call<Map<String, Object>> unsubscribe(@Path("creatorId") String creatorId);

    @GET("api/subscribe/status/{creatorId}")
    Call<Map<String, Object>> getSubscriptionStatus(@Path("creatorId") String creatorId);

    @GET("api/subscribe/feed")
    Call<FileListResponse> getSubscriptionFeed(@Query("page") int page, @Query("limit") int limit);

    @GET("api/subscribe/list")
    Call<Map<String, Object>> getSubscriptions();

    // ── Creator Profile ───────────────────────────────────────────────────────
    @GET("api/creators/{id}")
    Call<Map<String, Object>> getCreatorProfile(@Path("id") String id);

    @GET("api/creators/{id}/files")
    Call<FileListResponse> getCreatorFiles(@Path("id") String id, @Query("page") int page, @Query("limit") int limit, @Query("sort") String sort);

    // ── Search ────────────────────────────────────────────────────────────────
    @GET("api/files/search")
    Call<FileListResponse> searchFiles(@Query("q") String query, @Query("type") String type, @Query("page") int page);
}
