package com.mynk.vidora.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class DownloadHistory {

    private static final String PREFS_NAME = "vidora_downloads";
    private static final String KEY_DOWNLOADS = "download_list";
    private static final Gson gson = new Gson();

    public static class DownloadItem {
        public String token;
        public String fileName;
        public String filePath;
        public long timestamp;

        public DownloadItem(String token, String fileName, String filePath, long timestamp) {
            this.token = token;
            this.fileName = fileName;
            this.filePath = filePath;
            this.timestamp = timestamp;
        }
    }

    public static void add(Context context, String token, String fileName) {
        // Build the actual file path
        java.io.File dir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
        String filePath = new java.io.File(dir, "Vidora/" + fileName).getAbsolutePath();

        List<DownloadItem> list = getAll(context);
        list.removeIf(item -> item.token.equals(token));
        list.add(0, new DownloadItem(token, fileName, filePath, System.currentTimeMillis()));
        if (list.size() > 50) list = list.subList(0, 50);
        save(context, list);
    }

    public static List<DownloadItem> getAll(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String json = prefs.getString(KEY_DOWNLOADS, "[]");
        Type type = new TypeToken<ArrayList<DownloadItem>>() {}.getType();
        List<DownloadItem> list = gson.fromJson(json, type);
        return list != null ? list : new ArrayList<>();
    }

    public static void remove(Context context, String token) {
        List<DownloadItem> list = getAll(context);
        list.removeIf(item -> item.token.equals(token));
        save(context, list);
    }

    private static void save(Context context, List<DownloadItem> list) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_DOWNLOADS, gson.toJson(list)).apply();
    }
}
