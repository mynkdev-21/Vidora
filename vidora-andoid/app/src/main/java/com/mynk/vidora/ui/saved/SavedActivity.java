package com.mynk.vidora.ui.saved;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.mynk.vidora.R;
import com.mynk.vidora.ui.filedetail.FileDetailActivity;
import com.mynk.vidora.utils.BookmarkManager;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.NavHelper;

import java.util.List;

public class SavedActivity extends AppCompatActivity {

    private SavedAdapter adapter;
    private BookmarkManager bookmarkManager;
    private TextView empty;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_saved);
        FullScreenHelper.enable(this);
        NavHelper.setup(this);

        bookmarkManager = new BookmarkManager(this);

        RecyclerView recycler = findViewById(R.id.recycler_saved);
        empty = findViewById(R.id.tv_empty);
        recycler.setLayoutManager(new LinearLayoutManager(this));

        List<BookmarkManager.BookmarkItem> bookmarks = bookmarkManager.getBookmarks();
        adapter = new SavedAdapter(bookmarks, item -> {
            Intent intent = new Intent(this, FileDetailActivity.class);
            intent.putExtra("token", item.token);
            startActivity(intent);
        });
        recycler.setAdapter(adapter);
        empty.setVisibility(bookmarks.isEmpty() ? View.VISIBLE : View.GONE);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (adapter == null || bookmarkManager == null) return;
        List<BookmarkManager.BookmarkItem> bookmarks = bookmarkManager.getBookmarks();
        adapter.updateItems(bookmarks);
        empty.setVisibility(bookmarks.isEmpty() ? View.VISIBLE : View.GONE);
    }
}
