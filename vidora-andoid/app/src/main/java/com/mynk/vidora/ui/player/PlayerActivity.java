package com.mynk.vidora.ui.player;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.common.PlaybackException;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.MediaSource;
import androidx.media3.exoplayer.source.ProgressiveMediaSource;
import androidx.media3.ui.PlayerView;

import com.mynk.vidora.R;
import com.mynk.vidora.api.ApiClient;
import com.mynk.vidora.utils.Constants;
import com.mynk.vidora.utils.FullScreenHelper;
import com.mynk.vidora.utils.NavHelper;
import com.mynk.vidora.utils.PrefsManager;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class PlayerActivity extends AppCompatActivity {

    private ExoPlayer player;
    private PlayerView playerView;
    private String token;
    private String fileName;
    private String creatorId;
    private String creatorName;
    private boolean isSubscribed = false;

    // Custom controls
    private View controlsOverlay;
    private ImageView ivPlayPause;
    private SeekBar seekBar;
    private TextView tvCurrentTime, tvTotalTime, tvTitle;
    private ProgressBar loadingSpinner;

    private Handler handler = new Handler(Looper.getMainLooper());
    private boolean isControlsVisible = true;
    private boolean isSeeking = false;
    private boolean viewCounted = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_player);
        FullScreenHelper.enable(this);
        NavHelper.setup(this);

        // Views
        playerView = findViewById(R.id.player_view);
        controlsOverlay = findViewById(R.id.controls_overlay);
        ivPlayPause = findViewById(R.id.iv_play_pause);
        seekBar = findViewById(R.id.seek_bar);
        tvCurrentTime = findViewById(R.id.tv_current_time);
        tvTotalTime = findViewById(R.id.tv_total_time);
        tvTitle = findViewById(R.id.tv_player_title);
        loadingSpinner = findViewById(R.id.loading_spinner);

        token = getIntent().getStringExtra("token");
        fileName = getIntent().getStringExtra("file_name");
        creatorId = getIntent().getStringExtra("creator_id");
        creatorName = getIntent().getStringExtra("creator_name");
        if (fileName != null) tvTitle.setText(fileName);

        setupControls();
        setupCreatorSection();
        loadFileMeta();

        // Load ads
        loadBannerAds();

        String localPath = getIntent().getStringExtra("local_path");

        if (localPath != null && !localPath.isEmpty()) {
            playLocalVideo(localPath);
        } else if (token != null && !token.isEmpty()) {
            playVideo(token);
        } else {
            Toast.makeText(this, "No video to play", Toast.LENGTH_SHORT).show();
        }
    }

    private void loadBannerAds() {
        android.widget.FrameLayout adTop = findViewById(R.id.ad_banner_top);
        android.widget.FrameLayout adBottom = findViewById(R.id.ad_banner_bottom);

        if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) {
            adTop.setVisibility(View.GONE);
            adBottom.setVisibility(View.GONE);
            return;
        }

        String bid = com.mynk.vidora.ads.AdsConfig.getBannerId();
        if (bid == null || bid.isEmpty()) {
            adTop.setVisibility(View.GONE);
            adBottom.setVisibility(View.GONE);
            adTop.postDelayed(this::loadBannerAds, 3000);
            return;
        }

        // Top banner
        com.google.android.gms.ads.AdView bannerTop = new com.google.android.gms.ads.AdView(this);
        bannerTop.setAdSize(com.google.android.gms.ads.AdSize.BANNER);
        bannerTop.setAdUnitId(bid);
        adTop.removeAllViews();
        adTop.addView(bannerTop);
        bannerTop.loadAd(new com.google.android.gms.ads.AdRequest.Builder().build());
        adTop.setVisibility(View.VISIBLE);

        // Bottom banner
        com.google.android.gms.ads.AdView bannerBottom = new com.google.android.gms.ads.AdView(this);
        bannerBottom.setAdSize(com.google.android.gms.ads.AdSize.MEDIUM_RECTANGLE);
        bannerBottom.setAdUnitId(bid);
        adBottom.removeAllViews();
        adBottom.addView(bannerBottom);
        bannerBottom.loadAd(new com.google.android.gms.ads.AdRequest.Builder().build());
        adBottom.setVisibility(View.VISIBLE);
    }

    private void setupControls() {
        // Tap to toggle controls
        playerView.setOnClickListener(v -> toggleControls());
        controlsOverlay.setOnClickListener(v -> toggleControls());

        // Play/Pause
        findViewById(R.id.btn_play_pause).setOnClickListener(v -> {
            if (player == null) return;
            if (player.isPlaying()) {
                player.pause();
                ivPlayPause.setImageResource(R.drawable.ic_play);
            } else {
                player.play();
                ivPlayPause.setImageResource(R.drawable.ic_pause);
            }
        });

        // Rewind 10s
        findViewById(R.id.btn_rewind).setOnClickListener(v -> {
            if (player == null) return;
            player.seekTo(Math.max(0, player.getCurrentPosition() - 10000));
        });

        // Forward 10s
        findViewById(R.id.btn_forward).setOnClickListener(v -> {
            if (player == null) return;
            player.seekTo(Math.min(player.getDuration(), player.getCurrentPosition() + 10000));
        });

        // Fullscreen toggle
        findViewById(R.id.btn_fullscreen).setOnClickListener(v -> {
            int orientation = getResources().getConfiguration().orientation;
            if (orientation == android.content.res.Configuration.ORIENTATION_PORTRAIT) {
                setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
            } else {
                setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            }
        });

        // Download button — rewarded ad before download
        findViewById(R.id.btn_player_download).setOnClickListener(v -> {
            if (!com.mynk.vidora.ads.AdsConfig.isAdsEnabled()) {
                com.mynk.vidora.utils.FileDownloader.download(this, token, fileName != null ? fileName : "vidora_file");
                return;
            }
            com.mynk.vidora.ads.AdManager.getInstance().showRewardedAd(this, new com.mynk.vidora.ads.AdManager.AdCallback() {
                @Override
                public void onRewarded() {
                    com.mynk.vidora.utils.FileDownloader.download(PlayerActivity.this, token, fileName != null ? fileName : "vidora_file");
                }

                @Override
                public void onAdNotAvailable() {
                    // No ad available — allow download anyway
                    com.mynk.vidora.utils.FileDownloader.download(PlayerActivity.this, token, fileName != null ? fileName : "vidora_file");
                }
            });
        });

        // SeekBar
        seekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar sb, int progress, boolean fromUser) {
                if (fromUser && player != null) {
                    long duration = player.getDuration();
                    long newPos = (duration * progress) / 100;
                    tvCurrentTime.setText(formatTime(newPos));
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar sb) {
                isSeeking = true;
            }

            @Override
            public void onStopTrackingTouch(SeekBar sb) {
                isSeeking = false;
                if (player != null) {
                    long duration = player.getDuration();
                    long newPos = (duration * sb.getProgress()) / 100;
                    player.seekTo(newPos);
                }
            }
        });

        // Auto-hide controls after 4 seconds
        scheduleHideControls();
    }

    private void toggleControls() {
        if (isControlsVisible) {
            controlsOverlay.setVisibility(View.GONE);
            isControlsVisible = false;
        } else {
            controlsOverlay.setVisibility(View.VISIBLE);
            isControlsVisible = true;
            scheduleHideControls();
        }
    }

    private void scheduleHideControls() {
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(() -> {
            if (player != null && player.isPlaying()) {
                controlsOverlay.setVisibility(View.GONE);
                isControlsVisible = false;
            }
        }, 4000);
    }

    private void playLocalVideo(String filePath) {
        player = new ExoPlayer.Builder(this)
            .setRenderersFactory(new DefaultRenderersFactory(this)
                .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
                .setEnableDecoderFallback(true))
            .build();

        playerView.setPlayer(player);
        player.setMediaItem(MediaItem.fromUri(android.net.Uri.fromFile(new java.io.File(filePath))));
        player.setPlayWhenReady(true);

        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_READY) {
                    loadingSpinner.setVisibility(android.view.View.GONE);
                    tvTitle.setText(fileName != null ? fileName : "Downloaded Video");
                    startProgressUpdater();
                }
            }
        });

        player.prepare();
    }

    private void playVideo(String fileId) {
        String videoUrl = Constants.BASE_URL + "api/play/" + fileId;

        Map<String, String> headers = new HashMap<>();
        headers.put("X-API-Key", Constants.API_KEY);

        DefaultHttpDataSource.Factory dataSourceFactory = new DefaultHttpDataSource.Factory()
            .setDefaultRequestProperties(headers);

        MediaSource mediaSource = new ProgressiveMediaSource.Factory(dataSourceFactory)
            .createMediaSource(MediaItem.fromUri(videoUrl));

        player = new ExoPlayer.Builder(this)
            .setRenderersFactory(new DefaultRenderersFactory(this)
                .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
                .setEnableDecoderFallback(true))
            .build();

        playerView.setPlayer(player);
        player.setMediaSource(mediaSource);
        player.setPlayWhenReady(true);

        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_BUFFERING) {
                    loadingSpinner.setVisibility(View.VISIBLE);
                    findViewById(R.id.center_controls).setVisibility(View.GONE);
                } else if (state == Player.STATE_READY) {
                    loadingSpinner.setVisibility(View.GONE);
                    findViewById(R.id.center_controls).setVisibility(View.VISIBLE);
                    tvTotalTime.setText(formatTime(player.getDuration()));
                    ivPlayPause.setImageResource(R.drawable.ic_pause);
                    startProgressUpdater();

                    // Count view immediately when video starts
                    if (!viewCounted) {
                        viewCounted = true;
                        countView(fileId);
                    }
                } else if (state == Player.STATE_ENDED) {
                    ivPlayPause.setImageResource(R.drawable.ic_play);
                    controlsOverlay.setVisibility(View.VISIBLE);
                    isControlsVisible = true;
                }
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                ivPlayPause.setImageResource(isPlaying ? R.drawable.ic_pause : R.drawable.ic_play);
                if (isPlaying) scheduleHideControls();
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                loadingSpinner.setVisibility(View.GONE);
                Toast.makeText(PlayerActivity.this, "Playback error", Toast.LENGTH_SHORT).show();
            }
        });

        player.prepare();
        loadingSpinner.setVisibility(View.VISIBLE);
    }

    private void startProgressUpdater() {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (player != null && !isSeeking) {
                    long pos = player.getCurrentPosition();
                    long dur = player.getDuration();
                    if (dur > 0) {
                        seekBar.setProgress((int) ((pos * 100) / dur));
                        tvCurrentTime.setText(formatTime(pos));
                    }
                }
                handler.postDelayed(this, 500);
            }
        }, 500);
    }

    private void countView(String tokenOrId) {
        android.util.Log.d("PlayerActivity", "countView called with: " + tokenOrId);
        ApiClient.getService().countView(tokenOrId).enqueue(new retrofit2.Callback<Void>() {
            @Override
            public void onResponse(retrofit2.Call<Void> call, retrofit2.Response<Void> response) {
                android.util.Log.d("PlayerActivity", "countView response: " + response.code());
            }
            @Override
            public void onFailure(retrofit2.Call<Void> call, Throwable t) {
                android.util.Log.e("PlayerActivity", "countView failed: " + t.getMessage());
            }
        });
    }

    private void setupCreatorSection() {
        if (creatorId == null || creatorId.isEmpty()) return;

        // Don't show subscribe for own videos
        PrefsManager prefs = new PrefsManager(this);
        String currentUserId = prefs.getUserId();
        if (creatorId.equals(currentUserId)) return;

        View creatorSection = findViewById(R.id.creator_section);
        TextView tvAvatar = findViewById(R.id.tv_creator_avatar);
        TextView tvName = findViewById(R.id.tv_creator_name);
        TextView tvInfo = findViewById(R.id.tv_creator_info);
        TextView btnSubscribe = findViewById(R.id.btn_subscribe);

        creatorSection.setVisibility(View.VISIBLE);

        // Click on creator name/avatar to open profile
        View.OnClickListener openProfile = v -> {
            Intent intent = new Intent(PlayerActivity.this, com.mynk.vidora.ui.creator.CreatorProfileActivity.class);
            intent.putExtra("creator_id", creatorId);
            startActivity(intent);
        };
        tvAvatar.setOnClickListener(openProfile);
        tvName.setOnClickListener(openProfile);

        // Set creator name
        if (creatorName != null && !creatorName.isEmpty()) {
            tvName.setText(creatorName);
            tvAvatar.setText(String.valueOf(creatorName.charAt(0)).toUpperCase(Locale.US));
        }

        // Fetch creator profile for file count + avatar
        ApiClient.getService().getCreatorProfile(creatorId).enqueue(new retrofit2.Callback<Map<String, Object>>() {
            @Override
            public void onResponse(retrofit2.Call<Map<String, Object>> call, retrofit2.Response<Map<String, Object>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Map<String, Object> data = (Map<String, Object>) response.body().get("data");
                    if (data != null) {
                        Map<String, Object> creator = (Map<String, Object>) data.get("creator");
                        if (creator != null) {
                            int fileCount = toInt(creator.get("file_count"));
                            int subCount = toInt(creator.get("subscriber_count"));
                            tvInfo.setText(fileCount + " files · " + subCount + " subscribers");

                            // Load avatar if available
                            Object avatarObj = creator.get("avatar_url");
                            if (avatarObj != null && !String.valueOf(avatarObj).isEmpty() && !"null".equals(String.valueOf(avatarObj))) {
                                String avatarUrl = String.valueOf(avatarObj);
                                String avatarPath = avatarUrl.startsWith("/") ? avatarUrl.substring(1) : avatarUrl;
                                String fullUrl = avatarPath.startsWith("http") ? avatarPath : Constants.BASE_URL + avatarPath;
                                android.widget.ImageView ivCreatorAvatar = findViewById(R.id.iv_creator_avatar);
                                com.bumptech.glide.Glide.with(PlayerActivity.this)
                                    .load(fullUrl)
                                    .circleCrop()
                                    .into(ivCreatorAvatar);
                                ivCreatorAvatar.setVisibility(View.VISIBLE);
                                tvAvatar.setVisibility(View.GONE);
                            }
                        }
                    }
                }
            }
            @Override
            public void onFailure(retrofit2.Call<Map<String, Object>> call, Throwable t) {}
        });

        // Check subscription status
        ApiClient.getService().getSubscriptionStatus(creatorId).enqueue(new retrofit2.Callback<Map<String, Object>>() {
            @Override
            public void onResponse(retrofit2.Call<Map<String, Object>> call, retrofit2.Response<Map<String, Object>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    Map<String, Object> data = (Map<String, Object>) response.body().get("data");
                    if (data != null) {
                        isSubscribed = Boolean.TRUE.equals(data.get("subscribed"));
                        updateSubscribeButton(btnSubscribe);
                    }
                }
            }
            @Override
            public void onFailure(retrofit2.Call<Map<String, Object>> call, Throwable t) {}
        });

        // Subscribe/Unsubscribe click
        btnSubscribe.setOnClickListener(v -> {
            if (isSubscribed) {
                ApiClient.getService().unsubscribe(creatorId).enqueue(new retrofit2.Callback<Map<String, Object>>() {
                    @Override
                    public void onResponse(retrofit2.Call<Map<String, Object>> call, retrofit2.Response<Map<String, Object>> response) {
                        isSubscribed = false;
                        updateSubscribeButton(btnSubscribe);
                    }
                    @Override
                    public void onFailure(retrofit2.Call<Map<String, Object>> call, Throwable t) {}
                });
            } else {
                ApiClient.getService().subscribe(creatorId).enqueue(new retrofit2.Callback<Map<String, Object>>() {
                    @Override
                    public void onResponse(retrofit2.Call<Map<String, Object>> call, retrofit2.Response<Map<String, Object>> response) {
                        isSubscribed = true;
                        updateSubscribeButton(btnSubscribe);
                    }
                    @Override
                    public void onFailure(retrofit2.Call<Map<String, Object>> call, Throwable t) {}
                });
            }
        });
    }

    private void updateSubscribeButton(TextView btn) {
        if (isSubscribed) {
            btn.setText("Subscribed");
            btn.setBackgroundResource(R.drawable.bg_btn_subscribed);
            btn.setTextColor(getResources().getColor(R.color.purple_light, null));
        } else {
            btn.setText("Subscribe");
            btn.setBackgroundResource(R.drawable.bg_btn_subscribe);
            btn.setTextColor(getResources().getColor(R.color.white, null));
        }
    }

    private void loadFileMeta() {
        if (token == null || token.isEmpty()) return;
        TextView tvMeta = findViewById(R.id.tv_player_meta);

        ApiClient.getService().getSharedFile(token).enqueue(new retrofit2.Callback<com.mynk.vidora.model.ShareViewResponse>() {
            @Override
            public void onResponse(retrofit2.Call<com.mynk.vidora.model.ShareViewResponse> call, retrofit2.Response<com.mynk.vidora.model.ShareViewResponse> response) {
                if (response.isSuccessful() && response.body() != null && response.body().data != null) {
                    long views = response.body().data.views;
                    String viewsText = formatViews(views) + " views";
                    tvMeta.setText(viewsText);
                }
            }
            @Override
            public void onFailure(retrofit2.Call<com.mynk.vidora.model.ShareViewResponse> call, Throwable t) {}
        });
    }

    private String formatViews(long count) {
        if (count >= 1_000_000) return String.format(Locale.US, "%.1fM", count / 1_000_000.0);
        if (count >= 1_000) return String.format(Locale.US, "%.1fK", count / 1_000.0);
        return String.valueOf(count);
    }

    private String formatTime(long ms) {
        if (ms <= 0 || ms == Long.MIN_VALUE || ms >= 922337203685477L) return "00:00";
        long totalSec = ms / 1000;
        long min = totalSec / 60;
        long sec = totalSec % 60;
        if (min >= 60) {
            long hr = min / 60;
            min = min % 60;
            return String.format(Locale.US, "%d:%02d:%02d", hr, min, sec);
        }
        return String.format(Locale.US, "%02d:%02d", min, sec);
    }

    @Override
    public void onConfigurationChanged(android.content.res.Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        FrameLayout playerContainer = (FrameLayout) playerView.getParent();
        if (newConfig.orientation == android.content.res.Configuration.ORIENTATION_LANDSCAPE) {
            // Fullscreen — hide everything except player
            playerContainer.getLayoutParams().height = android.view.ViewGroup.LayoutParams.MATCH_PARENT;
            findViewById(R.id.scroll_content).setVisibility(View.GONE);
            findViewById(R.id.bottom_nav).setVisibility(View.GONE);
        } else {
            // Portrait — restore
            playerContainer.getLayoutParams().height = (int) (230 * getResources().getDisplayMetrics().density);
            findViewById(R.id.scroll_content).setVisibility(View.VISIBLE);
            findViewById(R.id.bottom_nav).setVisibility(View.VISIBLE);
        }
        playerContainer.requestLayout();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (player != null) player.pause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        handler.removeCallbacksAndMessages(null);
        if (player != null) {
            player.release();
            player = null;
        }
    }

    private static int toInt(Object obj) {
        if (obj == null) return 0;
        if (obj instanceof Number) return ((Number) obj).intValue();
        try { return Integer.parseInt(String.valueOf(obj)); } catch (Exception e) { return 0; }
    }
}
