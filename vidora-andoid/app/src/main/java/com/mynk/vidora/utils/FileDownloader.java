package com.mynk.vidora.utils;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.widget.Toast;

/**
 * Downloads a file using Android DownloadManager.
 * File is saved to Downloads/Vidora/ folder.
 */
public class FileDownloader {

    public static void download(Context context, String token, String fileName) {
        String url = RemoteConfigManager.getBaseUrl() + "api/play/" + token;

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.addRequestHeader("X-API-Key", Constants.API_KEY);
        request.setTitle(fileName);
        request.setDescription("Downloading from Vidora");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "Vidora/" + fileName);
        request.allowScanningByMediaScanner();

        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager != null) {
            manager.enqueue(request);
            Toast.makeText(context, "Download started", Toast.LENGTH_SHORT).show();

            // Save to download history
            DownloadHistory.add(context, token, fileName);
        } else {
            Toast.makeText(context, "Download failed", Toast.LENGTH_SHORT).show();
        }
    }
}
