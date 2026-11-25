package com.emengin.kafakafaya;

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
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemBars();
        }
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
