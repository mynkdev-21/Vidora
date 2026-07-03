package com.mynk.vidora.model;

public class ShareViewResponse {
    public boolean success;
    public String message;
    public Data data;

    public static class Data {
        public String name;
        public String type;
        public long size;
        public String creator;
        public String creator_id;
        public long views;
        public String thumbnail;
    }
}
