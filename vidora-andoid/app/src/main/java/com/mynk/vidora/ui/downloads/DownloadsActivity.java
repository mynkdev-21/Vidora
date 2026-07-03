package com.mynk.vidora.ui.downloads;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.mynk.vidora.R;
import com.mynk.vidora.ui.filedetail.FileDetailActivity;
import com.mynk.vidora.utils.DownloadHistory;
import com.mynk.vidora.utils.FullScreenHelper;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DownloadsActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_downloads);
        FullScreenHelper.enable(this);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        RecyclerView recyclerView = findViewById(R.id.recycler_downloads);
        LinearLayout layoutEmpty = findViewById(R.id.layout_empty);

        List<DownloadHistory.DownloadItem> downloads = DownloadHistory.getAll(this);

        if (downloads.isEmpty()) {
            layoutEmpty.setVisibility(View.VISIBLE);
            recyclerView.setVisibility(View.GONE);
        } else {
            layoutEmpty.setVisibility(View.GONE);
            recyclerView.setVisibility(View.VISIBLE);
            recyclerView.setLayoutManager(new LinearLayoutManager(this));
            recyclerView.setAdapter(new DownloadAdapter(downloads, item -> {
                // Always open in our player — file was downloaded to Downloads/Vidora/
                String mime = getMimeType(item.fileName);
                
                // Build file path
                java.io.File dir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                java.io.File file = new java.io.File(dir, "Vidora/" + item.fileName);
                String path = item.filePath != null ? item.filePath : file.getAbsolutePath();

                if (mime.startsWith("video/")) {
                    Intent playerIntent = new Intent(this, com.mynk.vidora.ui.player.PlayerActivity.class);
                    playerIntent.putExtra("local_path", path);
                    playerIntent.putExtra("file_name", item.fileName);
                    startActivity(playerIntent);
                } else if (mime.startsWith("image/")) {
                    Intent imgIntent = new Intent(this, com.mynk.vidora.ui.imageviewer.ImageViewerActivity.class);
                    imgIntent.putExtra("local_path", path);
                    imgIntent.putExtra("file_name", item.fileName);
                    startActivity(imgIntent);
                } else {
                    // Other files — try system
                    if (file.exists()) {
                        android.net.Uri uri = androidx.core.content.FileProvider.getUriForFile(this, getPackageName() + ".provider", file);
                        Intent openIntent = new Intent(Intent.ACTION_VIEW);
                        openIntent.setDataAndType(uri, mime);
                        openIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        try { startActivity(openIntent); } catch (Exception e) {
                            android.widget.Toast.makeText(this, "Cannot open file", android.widget.Toast.LENGTH_SHORT).show();
                        }
                    } else {
                        android.widget.Toast.makeText(this, "File not found", android.widget.Toast.LENGTH_SHORT).show();
                    }
                }
            }, (item, position) -> {
                // Delete: remove from history + delete actual file
                DownloadHistory.remove(this, item.token);

                // Delete file from storage using MediaStore (Android 10+)
                boolean deleted = false;
                java.io.File dir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                java.io.File file = new java.io.File(dir, "Vidora/" + item.fileName);
                String path = item.filePath != null ? item.filePath : file.getAbsolutePath();

                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    // Use MediaStore for Android 10+
                    try {
                        android.content.ContentResolver resolver = getContentResolver();
                        android.net.Uri contentUri = android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                        int rows = resolver.delete(contentUri,
                            android.provider.MediaStore.Downloads.DISPLAY_NAME + "=?",
                            new String[]{item.fileName});
                        deleted = rows > 0;
                    } catch (Exception e) {
                        // Fallback
                        java.io.File f = new java.io.File(path);
                        deleted = f.delete();
                    }
                } else {
                    java.io.File f = new java.io.File(path);
                    deleted = f.delete();
                }

                downloads.remove(position);
                recyclerView.getAdapter().notifyItemRemoved(position);
                if (downloads.isEmpty()) {
                    layoutEmpty.setVisibility(View.VISIBLE);
                    recyclerView.setVisibility(View.GONE);
                }
                android.widget.Toast.makeText(this, deleted ? "Deleted" : "Removed from list", android.widget.Toast.LENGTH_SHORT).show();
            }));
        }
    }

    interface OnItemClick { void onClick(DownloadHistory.DownloadItem item); }
    interface OnDeleteClick { void onDelete(DownloadHistory.DownloadItem item, int position); }

    static class DownloadAdapter extends RecyclerView.Adapter<DownloadAdapter.VH> {
        private final List<DownloadHistory.DownloadItem> items;
        private final OnItemClick listener;
        private final OnDeleteClick deleteListener;

        DownloadAdapter(List<DownloadHistory.DownloadItem> items, OnItemClick listener, OnDeleteClick deleteListener) {
            this.items = items;
            this.listener = listener;
            this.deleteListener = deleteListener;
        }

        @NonNull
        @Override
        public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_download, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(@NonNull VH holder, int position) {
            DownloadHistory.DownloadItem item = items.get(position);
            holder.tvName.setText(item.fileName);
            holder.tvDate.setText(new SimpleDateFormat("MMM d, yyyy", Locale.US).format(new Date(item.timestamp)));
            holder.itemView.setOnClickListener(v -> listener.onClick(item));
            holder.btnDelete.setOnClickListener(v -> deleteListener.onDelete(item, position));
        }

        @Override
        public int getItemCount() { return items.size(); }

        static class VH extends RecyclerView.ViewHolder {
            TextView tvName, tvDate;
            View btnDelete;
            VH(View v) {
                super(v);
                tvName = v.findViewById(R.id.tv_name);
                tvDate = v.findViewById(R.id.tv_date);
                btnDelete = v.findViewById(R.id.btn_delete);
            }
        }
    }

    private String getMimeType(String fileName) {
        if (fileName == null) return "*/*";
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".mp4") || lower.endsWith(".mkv") || lower.endsWith(".webm") || lower.endsWith(".mov") || lower.endsWith(".avi") || lower.endsWith(".flv") || lower.endsWith(".3gp")) return "video/*";
        if (lower.endsWith(".mp3") || lower.endsWith(".wav") || lower.endsWith(".aac") || lower.endsWith(".flac") || lower.endsWith(".ogg")) return "audio/*";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".gif") || lower.endsWith(".webp")) return "image/*";
        if (lower.endsWith(".pdf")) return "application/pdf";
        // Default to video for unknown — most files on Vidora are videos
        return "video/*";
    }
}
