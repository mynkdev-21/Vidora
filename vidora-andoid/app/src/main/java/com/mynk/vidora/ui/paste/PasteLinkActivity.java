package com.mynk.vidora.ui.paste;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.mynk.vidora.R;
import com.mynk.vidora.ui.filedetail.FileDetailActivity;
import com.mynk.vidora.ui.home.HomeActivity;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.HistoryManager;
import com.mynk.vidora.utils.NavHelper;

import java.util.List;

public class PasteLinkActivity extends AppCompatActivity {

    private EditText etLink;
    private HistoryAdapter adapter;
    private HistoryManager historyManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_paste_link);
        FullScreenHelper.enable(this);
        NavHelper.setup(this);

        etLink = findViewById(R.id.et_link);
        historyManager = new HistoryManager(this);

        // Load banner ad
        AdView adBanner = findViewById(R.id.ad_banner);
        String bannerId = com.mynk.vidora.ads.AdsConfig.getBannerId();
        if (com.mynk.vidora.ads.AdsConfig.isAdsEnabled() && bannerId != null && !bannerId.isEmpty()) {
            adBanner.setAdUnitId(bannerId);
            adBanner.loadAd(new AdRequest.Builder().build());
        } else {
            adBanner.setVisibility(android.view.View.GONE);
        }

        // Setup history RecyclerView
        RecyclerView recyclerHistory = findViewById(R.id.recycler_history);
        recyclerHistory.setLayoutManager(new LinearLayoutManager(this));
        adapter = new HistoryAdapter(historyManager.getHistory(), item -> {
            // Click on history item → open file detail
            Intent intent = new Intent(this, FileDetailActivity.class);
            intent.putExtra("token", item.token);
            startActivity(intent);
        });
        recyclerHistory.setAdapter(adapter);

        // Settings/Profile button
        findViewById(R.id.btn_settings).setOnClickListener(v ->
            startActivity(new Intent(this, com.mynk.vidora.ui.profile.ProfileActivity.class))
        );

        // Search/Go button
        findViewById(R.id.btn_play).setOnClickListener(v -> openLink());

        // FAB — paste from clipboard + auto-open
        findViewById(R.id.fab_paste).setOnClickListener(v -> {
            pasteFromClipboard();
            openLink();
        });

        // Clear history
        findViewById(R.id.btn_clear_history).setOnClickListener(v -> {
            historyManager.clearHistory();
            adapter.updateItems(historyManager.getHistory());
            Toast.makeText(this, "History cleared", Toast.LENGTH_SHORT).show();
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Refresh history when coming back from FileDetail
        adapter.updateItems(historyManager.getHistory());
    }

    private void pasteFromClipboard() {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null && clipboard.hasPrimaryClip()) {
            ClipData clip = clipboard.getPrimaryClip();
            if (clip != null && clip.getItemCount() > 0) {
                String text = clip.getItemAt(0).getText().toString();
                etLink.setText(text);
            }
        }
    }

    private void openLink() {
        String link = etLink.getText().toString().trim();
        if (link.isEmpty()) {
            Toast.makeText(this, "Please enter or paste a link", Toast.LENGTH_SHORT).show();
            return;
        }

        String token = extractToken(link);
        if (token == null) {
            Toast.makeText(this, "Invalid Vidora link", Toast.LENGTH_SHORT).show();
            return;
        }

        Intent intent = new Intent(this, FileDetailActivity.class);
        intent.putExtra("token", token);
        startActivity(intent);
    }

    private String extractToken(String link) {
        if (link.contains("vidora://view/")) {
            return link.substring(link.indexOf("vidora://view/") + 14);
        }
        if (link.contains("/v/")) {
            int idx = link.indexOf("/v/") + 3;
            String token = link.substring(idx);
            if (token.contains("?")) token = token.substring(0, token.indexOf("?"));
            if (token.contains("/")) token = token.substring(0, token.indexOf("/"));
            return token.isEmpty() ? null : token;
        }
        if (link.matches("[A-Za-z0-9_\\-]{10,30}")) {
            return link;
        }
        return null;
    }
}
