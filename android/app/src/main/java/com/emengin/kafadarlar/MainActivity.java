package com.emengin.kafadarlar;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.splashscreen.SplashScreenViewProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

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
 *
 * Yaşam döngüsü (Faz 2.5): ses odağı, kulaklık ve düşük bellek InterruptionsPlugin ile JS'e gider;
 * geri tuşu ve arka plan/ön plan @capacitor/app ile (JS: src/platform/lifecycle.ts). WebView'ın
 * çizici süreci ölürse (sistem bellek için kapattı ya da çöktü) uygulama çökmez: etkinlik yeniden
 * kurulur, oyun yeniden açılır ve arka planda kaydedilen yarım maç kaldığı yerden sürer.
 *
 * Gözlemlenebilirlik (Faz 2.8): TelemetryPlugin (Firebase Crashlytics + Analytics, yalnızca rıza
 * varsa). Çizici süreç kaybı yeniden başlatmadan önce Crashlytics'e ve analiz olayı olarak raporlanır
 * (QUALITY_BAR K4): çöktü mü, sistem mi kapattı.
 *
 * Açılış ekranı (Faz 2.5): sistem açılış ekranı (zemin + simge) oyun hazır olana kadar kalır. Çıkış
 * animasyonu bekletilir: açılış görüntüsü en üstte dururken WebView altında normal hızda çizer ve
 * oyun yüklenir; JS ana menünün ilk karesinde LaunchSplashPlugin.hide çağırır. (Açılış ekranını
 * "çizimi durdurarak" tutmak (setKeepOnScreenCondition) WebView'ı yavaşlatıp açılışı ~0,5 sn
 * uzatıyordu; ölçüm: PROGRESS § Faz 2.5.) Güvenlik sınırı: SPLASH_MAX_MS sonra her durumda söner.
 */
public class MainActivity extends BridgeActivity {

    /** Oyun "hazır" demezse (hata) açılış ekranı en çok bu kadar kalır (ms). */
    private static final long SPLASH_MAX_MS = 8000;
    /** Açılış ekranının sönme süresi (ms). */
    private static final long SPLASH_FADE_MS = 200;

    private final Handler handler = new Handler(Looper.getMainLooper());
    /** Bekletilen açılış ekranı (çıkış animasyonu başladı, oyun henüz hazır değil). */
    private SplashScreenViewProvider heldSplash;
    private boolean gameReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        splash.setOnExitAnimationListener(provider -> {
            if (gameReady) fadeOut(provider);
            else heldSplash = provider;
        });
        handler.postDelayed(this::hideSplash, SPLASH_MAX_MS);
        registerPlugin(ScreenAwakePlugin.class);
        registerPlugin(InterruptionsPlugin.class);
        registerPlugin(LaunchSplashPlugin.class);
        registerPlugin(TelemetryPlugin.class);
        super.onCreate(savedInstanceState);
        configureWebView();
        getBridge().addWebViewListener(new RendererGoneHandler());
    }

    /** Oyun hazır (JS) ya da güvenlik süresi doldu: açılış ekranı söner. */
    public void hideSplash() {
        runOnUiThread(() -> {
            gameReady = true;
            handler.removeCallbacksAndMessages(null);
            if (heldSplash != null) {
                fadeOut(heldSplash);
                heldSplash = null;
            }
        });
    }

    private static void fadeOut(SplashScreenViewProvider provider) {
        provider.getView().animate().alpha(0f).setDuration(SPLASH_FADE_MS).withEndAction(provider::remove).start();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    /**
     * Çizici süreç ölünce WebView kullanılamaz; olay işlenmezse Android uygulamayı da kapatır
     * (çökme sayılır). Bunun yerine etkinlik yeniden kurulur (yeni WebView, oyun baştan yüklenir).
     */
    private final class RendererGoneHandler extends WebViewListener {

        @Override
        public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
            TelemetryPlugin.recordRendererGone(MainActivity.this, detail.didCrash(), detail.rendererPriorityAtExit());
            runOnUiThread(MainActivity.this::restartClean);
            return true;
        }
    }

    /**
     * Etkinliği kayıtlı durum olmadan, normal bir açılış gibi yeniden başlatır. (recreate() kayıtlı
     * durumla kurar; Capacitor'un sistem çubuğu/çentik boşluğu hesabı o yolda WebView'ı çentik
     * genişliği kadar kaydırıyordu — telefonda görüldü.)
     */
    @SuppressWarnings("deprecation") // overridePendingTransition: Android 14+ için eskimiş, yine çalışır.
    private void restartClean() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        finish();
        startActivity(intent);
        overridePendingTransition(0, 0);
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
