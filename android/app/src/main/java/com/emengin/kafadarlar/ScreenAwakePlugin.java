package com.emengin.kafadarlar;

import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Maç sırasında ekranın kapanmaması (Faz 2.4). Oyun dokunuşsuz da sürebilir (gamepad, yapay zekâ
 * maçı, 15 dakikalık dayanıklılık testi); sistemin ekran zaman aşımı maçın ortasında ekranı
 * karartmasın. Bayrak yalnızca pencere görünürken etkilidir: uygulama arka plana geçince sistem
 * ekranı normal kapatır. JS tarafı: src/platform/screenAwake.ts.
 */
@CapacitorPlugin(name = "ScreenAwake")
public class ScreenAwakePlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(() -> {
            if (on) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } else {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
            call.resolve();
        });
    }
}
