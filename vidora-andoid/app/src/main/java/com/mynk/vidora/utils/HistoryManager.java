package com.mynk.vidora.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Stores recent link history in SharedPreferences as JSON.
 * Max 50 items — oldest removed when limit reached.
 */
public class HistoryManager {

    private static final String PREFS_NAME = "vidora_history";
    private static final String KEY_HISTORY = "history_list";
    private static final int MAX_ITEMS = 50;

    private final SharedPreferences prefs;
    private final Gson gson = new Gson();

    public HistoryManager(Context context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static class HistoryItem {
        public String token;
        public String name;
        public String type;
        public long size;
        public String timestamp; // "Today · 8:45 PM"

        public HistoryItem(String token, String name, String type, long size) {
            this.token = token;
            this.name = name;
            this.type = type;
            this.size = size;
            this.timestamp = formatTime();
        }

        private String formatTime() {
            SimpleDateFormat sdf = new SimpleDateFormat("h:mm a", Locale.getDefault());
            return "Today · " + sdf.format(new Date());
        }
    }

    /**
     * Add item to history (top of list). Removes duplicates by token.
     */
    public void addToHistory(String token, String name, String type, long size) {
        List<HistoryItem> list = getHistory();

        // Remove existing entry with same token
        list.removeIf(item -> item.token != null && item.token.equals(token));

        // Add to top
        list.add(0, new HistoryItem(token, name, type, size));

        // Trim to max
        if (list.size() > MAX_ITEMS) {
            list = list.subList(0, MAX_ITEMS);
        }

        saveHistory(list);
    }

    /**
     * Get all history items (newest first)
     */
    public List<HistoryItem> getHistory() {
        String json = prefs.getString(KEY_HISTORY, null);
        if (json == null) return new ArrayList<>();

        Type listType = new TypeToken<ArrayList<HistoryItem>>() {}.getType();
        List<HistoryItem> list = gson.fromJson(json, listType);
        return list != null ? list : new ArrayList<>();
    }

    /**
     * Clear all history
     */
    public void clearHistory() {
        prefs.edit().remove(KEY_HISTORY).apply();
    }

    private void saveHistory(List<HistoryItem> list) {
        prefs.edit().putString(KEY_HISTORY, gson.toJson(list)).apply();
    }

    /**
     * Format bytes for display
     */
    public static String formatBytes(long bytes) {
        if (bytes <= 0) return "";
        String[] units = {"B", "KB", "MB", "GB"};
        int i = (int) (Math.log(bytes) / Math.log(1024));
        return String.format(Locale.US, "%.1f %s", bytes / Math.pow(1024, i), units[i]);
    }
}
