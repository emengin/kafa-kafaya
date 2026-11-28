package com.emengin.kafadarlar;

import android.content.BroadcastReceiver;
import android.content.ComponentCallbacks2;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.res.Configuration;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Kesintiler (Faz 2.5): ses odağı, kulaklık çıkarma ve düşük bellek uyarısı JS'e olay olarak gider
 * (src/platform/lifecycle.ts). Android WebView, Web Audio için ses odağını kendisi yönetmiyor; bu
 * olmadan telefon çalarken oyun sesi zil sesinin üstünde çalmaya devam eder.
 *
 * - Ses odağı: uygulama öndeyken istenir, arka plana geçince bırakılır. Kaybedilince
 *   (telefon çağrısı, başka bir oynatıcı) "lost", geri gelince "gained", bildirim sesi gibi kısa
 *   kesintide "duck" (Android 8+ kısmayı çoğunlukla kendisi yapar). Çağrı sürerken uygulamaya
 *   dönülürse odak gecikmeli verilir (çağrı bitince "gained").
 * - Kulaklık: kablolu ya da Bluetooth kulaklık çıkınca (ses hoparlöre geçecekken) "noisy".
 * - Bellek: onTrimMemory → "memory" { critical }. Kritik = uygulama öndeyken bellek çok azaldı ya
 *   da sistem süreci kapatmak üzere; JS maçı kaydeder, kritikse duraklatır.
 *
 * Kullanılan izin yok (telefon durumu izni gerekmez: zil sesi ses odağını alır).
 */
@CapacitorPlugin(name = "Interruptions")
public class InterruptionsPlugin extends Plugin {

    private AudioManager audio;
    private AudioFocusRequest focusRequest;
    private boolean noisyRegistered = false;

    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        switch (change) {
            case AudioManager.AUDIOFOCUS_GAIN:
                sendFocus("gained");
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                sendFocus("duck");
                break;
            case AudioManager.AUDIOFOCUS_LOSS:
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                sendFocus("lost");
                break;
            default:
                break;
        }
    };

    private final BroadcastReceiver noisyReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                notifyListeners("noisy", new JSObject());
            }
        }
    };

    // onLowMemory ve TRIM_MEMORY_RUNNING_* Android 14+ için eskimiş ama eski sürümlerde tek sinyal.
    @SuppressWarnings("deprecation")
    private final ComponentCallbacks2 memoryCallbacks = new ComponentCallbacks2() {
        @Override
        public void onTrimMemory(int level) {
            sendMemory(level);
        }

        @Override
        public void onConfigurationChanged(@NonNull Configuration newConfig) {}

        @Override
        public void onLowMemory() {
            sendMemory(ComponentCallbacks2.TRIM_MEMORY_COMPLETE);
        }
    };

    @Override
    public void load() {
        audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        getContext().registerComponentCallbacks(memoryCallbacks);
    }

    @Override
    protected void handleOnResume() {
        requestFocus();
        if (!noisyRegistered) {
            ContextCompat.registerReceiver(
                getContext(),
                noisyReceiver,
                new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
                ContextCompat.RECEIVER_NOT_EXPORTED
            );
            noisyRegistered = true;
        }
    }

    @Override
    protected void handleOnPause() {
        abandonFocus();
        if (noisyRegistered) {
            getContext().unregisterReceiver(noisyReceiver);
            noisyRegistered = false;
        }
    }

    @Override
    protected void handleOnDestroy() {
        getContext().unregisterComponentCallbacks(memoryCallbacks);
    }

    /** JS: kesinti bitti ama odak geri gelmediyse oyuncu "Devam" dediğinde yeniden iste. */
    @PluginMethod
    public void requestAudioFocus(PluginCall call) {
        requestFocus();
        call.resolve();
    }

    @SuppressWarnings("deprecation") // Android 7 (API 24–25) yolu: AudioFocusRequest yok.
    private void requestFocus() {
        if (audio == null) return;
        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attributes)
                    // Çağrı sürerken istenirse odak çağrı bitince verilir (AUDIOFOCUS_GAIN olayı).
                    .setAcceptsDelayedFocusGain(true)
                    .setOnAudioFocusChangeListener(focusListener)
                    .build();
            }
            result = audio.requestAudioFocus(focusRequest);
        } else {
            result = audio.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
        sendFocus(result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED ? "gained" : "lost");
    }

    @SuppressWarnings("deprecation") // Android 7 (API 24–25) yolu.
    private void abandonFocus() {
        if (audio == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest != null) audio.abandonAudioFocusRequest(focusRequest);
        } else {
            audio.abandonAudioFocus(focusListener);
        }
    }

    private void sendFocus(String state) {
        JSObject data = new JSObject();
        data.put("state", state);
        // JS dinleyicisi henüz kurulmadıysa (açılış) son durum saklanır, kurulunca iletilir.
        notifyListeners("audioFocus", data, true);
    }

    @SuppressWarnings("deprecation") // TRIM_MEMORY_RUNNING_CRITICAL: Android 13 ve öncesi.
    private void sendMemory(int level) {
        boolean critical = level == ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL || level >= ComponentCallbacks2.TRIM_MEMORY_COMPLETE;
        JSObject data = new JSObject();
        data.put("critical", critical);
        data.put("level", level);
        notifyListeners("memory", data);
    }
}
