package com.mynk.vidora.ui.upload;

import android.content.Intent;
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
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.NavHelper;
import com.mynk.vidora.utils.PrefsManager;

import java.io.InputStream;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
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
        layoutSelect.setVisibility(View.VISIBLE);
        layoutUploading.setVisibility(View.GONE);
        layoutSuccess.setVisibility(View.GONE);
        selectedFileUri = null;
        isUploading = false;
    }

    private void startUpload() {
        if (selectedFileUri == null || isUploading) return;
        isUploading = true;
        btnUpload.setText("Uploading...");
        btnUpload.setEnabled(false);

        new Thread(() -> {
            try {
                PrefsManager prefs = new PrefsManager(this);
                String token = prefs.getAccessToken();

                InputStream inputStream = getContentResolver().openInputStream(selectedFileUri);
                if (inputStream == null) throw new Exception("Cannot read file");

                String mimeType = getContentResolver().getType(selectedFileUri);
                if (mimeType == null) mimeType = "application/octet-stream";
                final String finalMimeType = mimeType;

                // Create request body with progress tracking
                RequestBody fileBody = new RequestBody() {
                    @Override public MediaType contentType() { return MediaType.parse(finalMimeType); }
                    @Override public long contentLength() { return fileSize; }
                    @Override public void writeTo(BufferedSink sink) throws java.io.IOException {
                        Source source = Okio.source(inputStream);
                        long totalRead = 0;
                        long read;
                        okio.Buffer buffer = new okio.Buffer();
                        while ((read = source.read(buffer, 8192)) != -1) {
                            sink.write(buffer, read);
                            totalRead += read;
                            long finalTotal = totalRead;
                            runOnUiThread(() -> {
                                int pct = fileSize > 0 ? (int) (finalTotal * 100 / fileSize) : 0;
                                progressBar.setProgress(pct);
                                tvProgress.setText(pct + "%");
                            });
                        }
                        source.close();
                    }
                };

                MultipartBody body = new MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("file", fileName, fileBody)
                    .build();

                Request request = new Request.Builder()
                    .url(Constants.BASE_URL + "api/files/upload")
                    .addHeader("Authorization", "Bearer " + token)
                    .addHeader("X-API-Key", Constants.API_KEY)
                    .post(body)
                    .build();

                OkHttpClient client = new OkHttpClient.Builder()
                    .connectTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                    .writeTimeout(300, java.util.concurrent.TimeUnit.SECONDS)
                    .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                    .build();

                Response response = client.newCall(request).execute();

                runOnUiThread(() -> {
                    isUploading = false;
                    if (response.isSuccessful()) {
                        // Parse response to get file ID for share URL
                        String shareUrl = "";
                        try {
                            String resBody = response.body() != null ? response.body().string() : "";
                            org.json.JSONObject json = new org.json.JSONObject(resBody);
                            if (json.has("data")) {
                                org.json.JSONObject data = json.getJSONObject("data");
                                if (data.has("file")) {
                                    String fileId = data.getJSONObject("file").getString("id");
                                    // Generate share token
                                    generateShareUrl(fileId);
                                }
                            }
                        } catch (Exception ex) {}

                        layoutUploading.setVisibility(View.GONE);
                        layoutSuccess.setVisibility(View.VISIBLE);
                    } else {
                        Toast.makeText(this, "Upload failed. Please try again.", Toast.LENGTH_SHORT).show();
                        btnUpload.setText("Upload");
                        btnUpload.setEnabled(true);
                    }
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
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
                    .url(Constants.BASE_URL + "api/share/" + fileId + "/generate")
                    .addHeader("Authorization", "Bearer " + prefs.getAccessToken())
                    .addHeader("X-API-Key", Constants.API_KEY)
                    .post(RequestBody.create("", MediaType.parse("application/json")))
                    .build();

                OkHttpClient client = new OkHttpClient();
                Response res = client.newCall(req).execute();
                if (res.isSuccessful() && res.body() != null) {
                    String body = res.body().string();
                    org.json.JSONObject json = new org.json.JSONObject(body);
                    String token = json.getJSONObject("data").getString("token");
                    // Build frontend URL
                    String frontendUrl = Constants.BASE_URL.replace(":5001", ":8080").replace("/api", "");
                    if (frontendUrl.endsWith("/")) frontendUrl = frontendUrl.substring(0, frontendUrl.length() - 1);
                    final String shareUrl = frontendUrl + "/v/" + token;
                    final String dashUrl = frontendUrl + "/dashboard";

                    runOnUiThread(() -> {
                        TextView tvUrl = findViewById(R.id.tv_share_url);
                        tvUrl.setText(shareUrl);

                        // Copy button
                        findViewById(R.id.btn_copy_url).setOnClickListener(v -> {
                            android.content.ClipboardManager clipboard = (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                            clipboard.setPrimaryClip(android.content.ClipData.newPlainText("Vidora Share URL", shareUrl));
                            Toast.makeText(this, "Link copied!", Toast.LENGTH_SHORT).show();
                        });

                        // Visit Dashboard
                        findViewById(R.id.btn_visit_dashboard).setOnClickListener(v -> {
                            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(dashUrl)));
                        });
                    });
                }
            } catch (Exception e) {
                // Silent fail — URL just won't show
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
