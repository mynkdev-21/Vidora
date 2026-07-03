package com.mynk.vidora.model;

import com.google.gson.annotations.SerializedName;

public class StreamResponse {
    public boolean success;
    public Data data;

    public static class Data {
        @SerializedName("stream_url")
        public String streamUrl;
        @SerializedName("mime_type")
        public String mimeType;
        @SerializedName("expires_in")
        public int expiresIn;
    }
}
