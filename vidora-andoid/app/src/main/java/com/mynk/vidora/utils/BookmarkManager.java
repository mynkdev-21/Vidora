package com.mynk.vidora.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

/**
 * Manages bookmarked files in SharedPreferences.
 */
public class BookmarkManager {

    private static final String PREFS_NAME = "vidora_bookmarks";
    private static final String KEY_BOOKMARKS = "bookmarks_list";

    private final SharedPreferences prefs;
    private final Gson gson = new Gson();

    public BookmarkManager(Context context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static class BookmarkItem {
        public String token;
        public String name;
        public String type;
        public long size;
        public String thumbnail;

        public BookmarkItem(String token, String name, String type, long size, String thumbnail) {
            this.token = token;
            this.name = name;
            this.type = type;
            this.size = size;
            this.thumbnail = thumbnail;
        }
    }

    public void addBookmark(String token, String name, String type, long size, String thumbnail) {
        List<BookmarkItem> list = getBookmarks();
        // Remove existing
        List<BookmarkItem> filtered = new ArrayList<>();
        for (BookmarkItem item : list) {
            if (item.token == null || !item.token.equals(token)) {
                filtered.add(item);
            }
        }
        filtered.add(0, new BookmarkItem(token, name, type, size, thumbnail));
        save(filtered);
    }

    public void removeBookmark(String token) {
        List<BookmarkItem> list = getBookmarks();
        List<BookmarkItem> filtered = new ArrayList<>();
        for (BookmarkItem item : list) {
            if (item.token == null || !item.token.equals(token)) {
                filtered.add(item);
            }
        }
        save(filtered);
    }

    public boolean isBookmarked(String token) {
        List<BookmarkItem> list = getBookmarks();
        for (BookmarkItem item : list) {
            if (item.token != null && item.token.equals(token)) return true;
        }
        return false;
    }

    public List<BookmarkItem> getBookmarks() {
        String json = prefs.getString(KEY_BOOKMARKS, null);
        if (json == null) return new ArrayList<>();
        Type listType = new TypeToken<ArrayList<BookmarkItem>>() {}.getType();
        List<BookmarkItem> list = gson.fromJson(json, listType);
        return list != null ? list : new ArrayList<>();
    }

    public void clearAll() {
        prefs.edit().remove(KEY_BOOKMARKS).apply();
    }

    private void save(List<BookmarkItem> list) {
        prefs.edit().putString(KEY_BOOKMARKS, gson.toJson(list)).apply();
    }
}
