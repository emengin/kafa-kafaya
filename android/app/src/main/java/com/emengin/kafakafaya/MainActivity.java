package com.emengin.kafakafaya;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Oyunun tek ekranı: oyun Capacitor'un WebView'ında çalışır.
 *
 * Tam ekran (Faz 2.1): durum ve gezinme çubukları gizli. Kenardan kaydırınca geçici olarak
 * görünüp kendiliğinden kaybolurlar (oyun yerleşimi kaymaz). Pencere odağı her geri geldiğinde
 * (uygulamaya dönüş, bildirim paneli, sistem diyaloğu) yeniden gizlenirler. Açılıştaki ilk
 * gizleme capacitor.config.ts → SystemBars.hidden ile yapılır.
 *
 * WebView ayarları (Faz 2.4): kaydırma sonu parlaması yok, sistem yazı boyutu sayfayı büyütmez,
 * görünürken WebView'ın çizici süreci "önemli" önceliğinde (düşük bellekte önce o kapanmasın).
 * Ekranın maç sırasında açık kalması ScreenAwakePlugin ile (JS: src/platform/screenAwake.ts).
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenAwakePlugin.class);
        super.onCreate(savedInstanceState);
        configureWebView();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }

    private void configureWebView() {
        WebView webView = getBridge().getWebView();
        // Kenara kaydırınca beliren parlama efekti oyunda anlamsız (sayfa kaymaz).
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        // Android "yazı boyutu" ayarı DOM yazılarını (yükleme, uyarılar) büyütüp yerleşimi bozmasın;
        // oyun yazıları zaten tuvalde ölçekleniyor.
        webView.getSettings().setTextZoom(100);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Görünürken çizici süreç uygulama kadar önemli; arka planda bu öncelikten vazgeçilir.
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        }
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
