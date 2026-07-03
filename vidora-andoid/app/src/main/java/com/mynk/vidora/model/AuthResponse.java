package com.mynk.vidora.model;

import com.google.gson.annotations.SerializedName;

public class AuthResponse {
    public boolean success;
    public String message;
    public String code;
    @SerializedName("support_url")
    public String supportUrl;
    public Data data;

    public static class Data {
        public User user;
        @SerializedName("accessToken")
        public String accessToken;
        @SerializedName("refreshToken")
        public String refreshToken;
    }

    public static class User {
        public String id;
        public String name;
        public String email;
        public String role;
    }
}
