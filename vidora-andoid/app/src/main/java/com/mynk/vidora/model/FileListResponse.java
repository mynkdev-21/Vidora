package com.mynk.vidora.model;

import com.google.gson.annotations.SerializedName;
import java.util.List;

public class FileListResponse {
    public boolean success;
    public Data data;

    public Data getData() { return data; }

    public static class Data {
        public List<FileItem> files;
        public Pagination pagination;

        public List<FileItem> getFiles() { return files; }
        public Pagination getPagination() { return pagination; }
    }

    public static class FileItem {
        public String id;
        @SerializedName("original_name")
        public String originalName;
        @SerializedName("mime_type")
        public String mimeType;
        @SerializedName("size_bytes")
        public long sizeBytes;
        @SerializedName("view_count")
        public long viewCount;
        public String status;
        @SerializedName("created_at")
        public String createdAt;
        @SerializedName("public_url")
        public String publicUrl;
        @SerializedName("thumbnail_url")
        public String thumbnailUrl;
        @SerializedName("creator_id")
        public String creatorId;
        @SerializedName("creator_name")
        public String creatorName;

        public String getId() { return id; }
        public String getOriginalName() { return originalName; }
        public String getMimeType() { return mimeType; }
        public long getSizeBytes() { return sizeBytes; }
        public long getViewCount() { return viewCount; }
        public String getCreatedAt() { return createdAt; }
        public String getThumbnailUrl() { return thumbnailUrl; }
        public String getCreatorId() { return creatorId; }
        public String getCreatorName() { return creatorName; }
    }

    public static class Pagination {
        public int page;
        public int limit;
        public int total;
        public int pages;
    }
}
