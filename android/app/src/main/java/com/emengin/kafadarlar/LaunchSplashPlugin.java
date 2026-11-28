package com.emengin.kafadarlar;

import android.app.Activity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Açılış ekranının kapanması (Faz 2.5). Oyun hazır olunca (ana menünün ya da geri yüklenen maçın
 * ilk karesi) JS `hide()` çağırır: MainActivity'nin beklettiği sistem açılış ekranı söner.
 * JS tarafı: src/platform/lifecycle.ts → hideSplash.
 */
@CapacitorPlugin(name = "LaunchSplash")
public class LaunchSplashPlugin extends Plugin {

    @PluginMethod
    public void hide(PluginCall call) {
        Activity activity = getActivity();
        if (activity instanceof MainActivity) {
            ((MainActivity) activity).hideSplash();
        }
        call.resolve();
    }
}
