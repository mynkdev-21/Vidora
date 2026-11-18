package com.mynk.vidora.ui.upload;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.NavHelper;
import com.mynk.vidora.utils.PrefsManager;
import com.mynk.vidora.utils.RemoteConfigManager;

import java.io.InputStream;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.Call;
import okio.BufferedSink;
import okio.Okio;
import okio.Source;

public class UploadActivity extends AppCompatActivity {

    private View layoutSelect, layoutUploading, layoutSuccess;
    private TextView tvFileName, tvFileSize, tvProgress, btnUpload, btnCancel;
    private ProgressBar progressBar;
    private Uri selectedFileUri;
    private String fileName;
    private long fileSize;
    private boolean isUploading = false;
    private volatile Call uploadCall;
    private int uploadAttempt;

    private final ActivityResultLauncher<Intent> filePicker = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(),
        result -> {
            if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                selectedFileUri = result.getData().getData();
                if (selectedFileUri != null) {
                    getFileInfo();
                    showUploadingState();
                }
            }
        }
    );

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_upload);
        FullScreenHelper.enable(this);
        NavHelper.setup(this);

        layoutSelect = findViewById(R.id.layout_select);
        layoutUploading = findViewById(R.id.layout_uploading);
        layoutSuccess = findViewById(R.id.layout_success);
        tvFileName = findViewById(R.id.tv_file_name);
        tvFileSize = findViewById(R.id.tv_file_size);
        tvProgress = findViewById(R.id.tv_progress);
        progressBar = findViewById(R.id.progress_bar);
        btnUpload = findViewById(R.id.btn_upload);
        btnCancel = findViewById(R.id.btn_cancel);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());
        findViewById(R.id.btn_browse).setOnClickListener(v -> openFilePicker());
        btnUpload.setOnClickListener(v -> startUpload());
        btnCancel.setOnClickListener(v -> resetState());
        findViewById(R.id.btn_upload_another).setOnClickListener(v -> resetState());
        findViewById(R.id.btn_visit_dashboard).setOnClickListener(v ->
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(Constants.WEB_BASE_URL + "dashboard"))));
        findViewById(R.id.btn_copy_url).setEnabled(false);
    }

    @Override protected void onDestroy() {
        uploadAttempt++;
        Call call = uploadCall;
        if (call != null) call.cancel();
        super.onDestroy();
    }

    private void openFilePicker() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        filePicker.launch(Intent.createChooser(intent, "Select File"));
    }

    private void getFileInfo() {
        try (Cursor cursor = getContentResolver().query(selectedFileUri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIdx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeIdx = cursor.getColumnIndex(OpenableColumns.SIZE);
                fileName = nameIdx >= 0 ? cursor.getString(nameIdx) : "file";
                fileSize = sizeIdx >= 0 ? cursor.getLong(sizeIdx) : 0;
            }
        } catch (Exception e) {
            fileName = "Unknown file";
            fileSize = 0;
        }
    }

    private void showUploadingState() {
        layoutSelect.setVisibility(View.GONE);
        layoutUploading.setVisibility(View.VISIBLE);
        layoutSuccess.setVisibility(View.GONE);
        tvFileName.setText(fileName);
        tvFileSize.setText(formatBytes(fileSize));
        progressBar.setProgress(0);
        tvProgress.setText("Ready to upload");
    }

    private void resetState() {
        uploadAttempt++;
        Call call = uploadCall;
        if (call != null) call.cancel();
        uploadCall = null;
        layoutSelect.setVisibility(View.VISIBLE);
        layoutUploading.setVisibility(View.GONE);
        layoutSuccess.setVisibility(View.GONE);
        selectedFileUri = null;
        isUploading = false;
        btnUpload.setText("Upload");
        btnUpload.setEnabled(true);
    }

    private void startUpload() {
        if (selectedFileUri == null || isUploading) return;
        String token = new PrefsManager(this).getAccessToken();
        if (token == null) {
            startActivity(new Intent(this, com.mynk.vidora.ui.auth.LoginActivity.class));
            return;
        }
        final int attempt = ++uploadAttempt;
        isUploading = true;
        btnUpload.setText("Uploading...");
        btnUpload.setEnabled(false);

        new Thread(() -> {
            try {
                String mimeType = getContentResolver().getType(selectedFileUri);
                if (mimeType == null) mimeType = "application/octet-stream";
                final String finalMimeType = mimeType;

                // Create request body with progress tracking
                RequestBody fileBody = new RequestBody() {
                    @Override public MediaType contentType() { return MediaType.parse(finalMimeType); }
                    @Override public long contentLength() { return fileSize > 0 ? fileSize : -1; }
                    @Override public void writeTo(BufferedSink sink) throws java.io.IOException {
                        InputStream inputStream = getContentResolver().openInputStream(selectedFileUri);
                        if (inputStream == null) throw new java.io.IOException("Cannot read file");
                        try (Source source = Okio.source(inputStream)) {
                        long totalRead = 0;
                        long read;
                        okio.Buffer buffer = new okio.Buffer();
                        while ((read = source.read(buffer, 8192)) != -1) {
                            if (attempt != uploadAttempt || Thread.currentThread().isInterrupted()) throw new java.io.IOException("Upload cancelled");
                            sink.write(buffer, read);
                            totalRead += read;
                            long finalTotal = totalRead;
                            runOnUiThread(() -> { if (attempt != uploadAttempt) return;
                                int pct = fileSize > 0 ? (int) (finalTotal * 100 / fileSize) : 0;
                                progressBar.setProgress(pct);
                                tvProgress.setText(pct + "%");
                            });
                        }
                        }
                    }
                };

                MultipartBody body = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("file", fileName, fileBody)
                    .build();

                Request request = new Request.Builder()
                    .url(RemoteConfigManager.getBaseUrl() + "api/files/upload")
                    .addHeader("Authorization", "Bearer " + token)
                    .addHeader("X-API-Key", Constants.API_KEY)
                    .post(body)
                    .build();

                Call call = ApiClient.newUploadCall(request);
                uploadCall = call;
                try (Response response = call.execute()) {
                boolean success = response.isSuccessful();
                String fileId = null;
                if (success && response.body() != null) {
                    try { fileId = new org.json.JSONObject(response.body().string())
                        .getJSONObject("data").getJSONObject("file").getString("id"); }
                    catch (Exception ignored) { }
                }
                final String uploadedFileId = fileId;
                runOnUiThread(() -> { if (attempt != uploadAttempt) return;
                    uploadCall = null;
                    isUploading = false;
                    if (success && uploadedFileId != null) {
                        generateShareUrl(uploadedFileId);
                        layoutUploading.setVisibility(View.GONE);
                        layoutSuccess.setVisibility(View.VISIBLE);
                    } else {
                        Toast.makeText(this, "Upload failed. Please try again.", Toast.LENGTH_SHORT).show();
                        btnUpload.setText("Upload");
                        btnUpload.setEnabled(true);
                    }
                });
                }
            } catch (Exception e) {
                runOnUiThread(() -> { if (attempt != uploadAttempt) return;
                    uploadCall = null;
                    isUploading = false;
                    Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    btnUpload.setText("Upload");
                    btnUpload.setEnabled(true);
                });
            }
        }).start();
    }

    private void generateShareUrl(String fileId) {
        new Thread(() -> {
            try {
                PrefsManager prefs = new PrefsManager(this);
                Request req = new Request.Builder()
                    .url(RemoteConfigManager.getBaseUrl() + "api/share/" + fileId + "/generate")
                    .addHeader("Authorization", "Bearer " + prefs.getAccessToken())
                    .addHeader("X-API-Key", Constants.API_KEY)
                    .post(RequestBody.create("", MediaType.parse("application/json")))
                    .build();

                try (Response res = ApiClient.getClient().callFactory().newCall(req).execute()) {
                if (res.isSuccessful() && res.body() != null) {
                    String body = res.body().string();
                    org.json.JSONObject json = new org.json.JSONObject(body);
                    String token = json.getJSONObject("data").getString("token");
                    // Build frontend URL
                    String frontendUrl = Constants.WEB_BASE_URL;
                    if (frontendUrl.endsWith("/")) frontendUrl = frontendUrl.substring(0, frontendUrl.length() - 1);
                    final String shareUrl = frontendUrl + "/v/" + token;

                    runOnUiThread(() -> {
                        TextView tvUrl = findViewById(R.id.tv_share_url);
                        tvUrl.setText(shareUrl);
                        findViewById(R.id.btn_copy_url).setEnabled(true);

                        // Copy button
                        findViewById(R.id.btn_copy_url).setOnClickListener(v -> {
                            android.content.ClipboardManager clipboard = (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                            clipboard.setPrimaryClip(android.content.ClipData.newPlainText("Vidora Share URL", shareUrl));
                            Toast.makeText(this, "Link copied!", Toast.LENGTH_SHORT).show();
                        });

                    });
                } else {
                    runOnUiThread(() -> Toast.makeText(this, "Uploaded, but share link could not be created. Open dashboard to manage the file.", Toast.LENGTH_LONG).show());
                }
                }
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(this, "Uploaded, but share link could not be created. Open dashboard to manage the file.", Toast.LENGTH_LONG).show());
            }
        }).start();
    }

    private String formatBytes(long bytes) {
        if (bytes >= 1_000_000_000) return String.format("%.1f GB", bytes / 1_000_000_000.0);
        if (bytes >= 1_000_000) return String.format("%.1f MB", bytes / 1_000_000.0);
        if (bytes >= 1_000) return String.format("%.1f KB", bytes / 1_000.0);
        return bytes + " B";
    }
}
