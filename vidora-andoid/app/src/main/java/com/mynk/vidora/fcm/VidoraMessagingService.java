package com.mynk.vidora.fcm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.mynk.vidora.R;
import com.mynk.vidora.ui.filedetail.FileDetailActivity;
import com.mynk.vidora.ui.home.HomeActivity;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

public class VidoraMessagingService extends FirebaseMessagingService {

    private static final String TAG = "FCM";
    private static final String CHANNEL_ID = "vidora_notifications";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token: " + token);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message);

        String title = "Vidora";
        String body = "";

        Map<String, String> data = message.getData();

        // Read from data payload (always works — foreground + background)
        if (data.containsKey("title")) title = data.get("title");
        if (data.containsKey("body")) body = data.get("body");

        String fileId = data.get("file_id");
        String type = data.get("type");
        String thumbnailUrl = data.get("thumbnail");

        // Create intent based on notification type
        Intent intent;
        if (fileId != null && !fileId.isEmpty()) {
            intent = new Intent(this, FileDetailActivity.class);
            intent.putExtra("token", fileId);
        } else {
            intent = new Intent(this, HomeActivity.class);
        }
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(this,
            (int) System.currentTimeMillis(), intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        // Create notification channel
        createChannel();

        // Load app icon as large icon
        Bitmap largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(largeIcon)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setColor(0xFF7C3AED);

        // Load thumbnail as big picture (if available)
        if (thumbnailUrl != null && !thumbnailUrl.isEmpty()) {
            Bitmap poster = loadBitmap(thumbnailUrl);
            if (poster != null) {
                builder.setStyle(new NotificationCompat.BigPictureStyle()
                    .bigPicture(poster)
                    .bigLargeIcon((Bitmap) null));
            }
        }

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify((int) System.currentTimeMillis(), builder.build());
        }
    }

    private Bitmap loadBitmap(String urlStr) {
        try {
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setDoInput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.connect();
            InputStream input = conn.getInputStream();
            return BitmapFactory.decodeStream(input);
        } catch (Exception e) {
            Log.w(TAG, "Failed to load notification image: " + e.getMessage());
            return null;
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Vidora", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Vidora notifications");
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
