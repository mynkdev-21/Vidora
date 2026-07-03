package com.mynk.vidora.model;

import com.google.gson.annotations.SerializedName;

public class ProfileResponse {
    public boolean success;
    public Data data;

    public static class Data {
        public UserProfile user;
    }

    public static class UserProfile {
        public String id;
        public String name;
        public String email;
        public String role;
        @SerializedName("is_verified")
        public int isVerified;
        @SerializedName("is_premium")
        public int isPremiumInt;
        
        public boolean getIsPremium() { return isPremiumInt == 1; }
        @SerializedName("avatar_url")
        public String avatarUrl;
        @SerializedName("created_at")
        public String createdAt;
        @SerializedName("total_earnings")
        public double totalEarnings;
        @SerializedName("total_files")
        public long totalFiles;
        @SerializedName("total_views")
        public long totalViews;
    }
}
