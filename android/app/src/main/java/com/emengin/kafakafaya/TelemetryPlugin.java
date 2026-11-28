package com.emengin.kafakafaya;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.google.firebase.crashlytics.FirebaseCrashlytics;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

/**
 * Gözlemlenebilirlik (Faz 2.8): Firebase Crashlytics + Analytics, yalnızca rıza varsa.
 *
 * Rıza yokken hiçbir şey gönderilmez:
 * - AndroidManifest.xml'de iki SDK'nın toplaması da kapalı başlar (firebase_analytics_collection_enabled,
 *   firebase_crashlytics_collection_enabled, firebase_data_collection_default_enabled = false); reklam
 *   kimliği ve SSAID hiç toplanmaz, rıza modu varsayılanları "reddedildi". Reklam kimliği kütüphanesi
 *   derlemeden çıkarıldı, AD_ID izni manifestten silindi (app/build.gradle, manifest).
 * - Rıza gelince toplama açılır (SDK bu ayarı kendisi de saklar); geri alınınca kapanır, analiz verisi
 *   cihazdan silinir (resetAnalyticsData), gönderilmemiş çökme raporları silinir.
 * - Rızadan önce cihazda biriken çökme raporları (Crashlytics, toplama kapalıyken raporu saklar ve
 *   toplama açılınca yollar) rıza verildiği anda silinir: yalnızca rızadan sonraki çökmeler gider.
 * - Reklam depolama, reklam kullanıcı verisi ve reklam kişiselleştirmesi rıza modunda her zaman
 *   "reddedildi"; analiz rızası yalnızca analytics_storage'ı açar.
 *
 * Kararın kaydı bu sınıfın SharedPreferences dosyasında (cihazda kalır; DATA_MAP "geçici rıza kaydı"):
 * analiz ve çökme kararı, karar zamanı, metin sürümü. JS kopyasını getConsent ile okur.
 *
 * google-services.json olmadan derlenmişse (ör. fork) FirebaseApp yoktur: available=false, tüm
 * çağrılar boştur, JS rıza ekranını göstermez.
 *
 * Yeni olay ya da veri eklenince: src/telemetry/events.ts (olay sözlüğü) ve docs/DATA_MAP.md.
 */
@CapacitorPlugin(name = "Telemetry")
public class TelemetryPlugin extends Plugin {

    private static final String TAG = "KafaTelemetry";
    private static final String PREFS = "kafa_telemetry";
    private static final String KEY_ANALYTICS = "analytics";
    private static final String KEY_CRASH = "crash";
    private static final String KEY_DECIDED_AT = "decided_at";
    private static final String KEY_TEXT_VERSION = "text_version";
    private static final String GRANTED = "granted";
    private static final String DENIED = "denied";
    private static final String UNSET = "unset";
    /** JS yığın karelerinin Java yığın satırındaki "sınıf" adı (Crashlytics gruplaması). */
    private static final String JS_CLASS = "js";

    @Override
    public void load() {
        Context ctx = getContext();
        if (!isAvailable(ctx)) {
            Log.i(TAG, "Firebase yapılandırılmamış (google-services.json yok); gözlemlenebilirlik kapalı.");
            return;
        }
        SharedPreferences prefs = prefs(ctx);
        // Kayıtlı karar her açılışta yeniden uygulanır (SDK'nın kendi kopyası silinmişse de doğru kalsın).
        applyConsent(ctx, GRANTED.equals(prefs.getString(KEY_ANALYTICS, UNSET)), GRANTED.equals(prefs.getString(KEY_CRASH, UNSET)));
        FirebaseCrashlytics crashlytics = FirebaseCrashlytics.getInstance();
        crashlytics.setCustomKey("webview_version", webViewVersion(ctx));
        crashlytics.setCustomKey("build_type", isDebuggable(ctx) ? "debug" : "release");
    }

    @PluginMethod
    public void getConsent(PluginCall call) {
        Context ctx = getContext();
        SharedPreferences prefs = prefs(ctx);
        JSObject r = new JSObject();
        r.put(KEY_ANALYTICS, prefs.getString(KEY_ANALYTICS, UNSET));
        r.put(KEY_CRASH, prefs.getString(KEY_CRASH, UNSET));
        r.put("available", isAvailable(ctx));
        call.resolve(r);
    }

    @PluginMethod
    public void setConsent(PluginCall call) {
        Context ctx = getContext();
        boolean analytics = Boolean.TRUE.equals(call.getBoolean(KEY_ANALYTICS, false));
        boolean crash = Boolean.TRUE.equals(call.getBoolean(KEY_CRASH, false));
        SharedPreferences prefs = prefs(ctx);
        boolean hadAnalytics = GRANTED.equals(prefs.getString(KEY_ANALYTICS, UNSET));
        boolean hadCrash = GRANTED.equals(prefs.getString(KEY_CRASH, UNSET));
        prefs
            .edit()
            .putString(KEY_ANALYTICS, analytics ? GRANTED : DENIED)
            .putString(KEY_CRASH, crash ? GRANTED : DENIED)
            .putLong(KEY_DECIDED_AT, System.currentTimeMillis())
            .putInt(KEY_TEXT_VERSION, call.getInt("textVersion", 0))
            .apply();
        if (isAvailable(ctx)) {
            FirebaseCrashlytics crashlytics = FirebaseCrashlytics.getInstance();
            // Rızadan önce biriken raporlar gönderilmez; rıza geri alınınca da bekleyenler silinir.
            if (crash != hadCrash) crashlytics.deleteUnsentReports();
            applyConsent(ctx, analytics, crash);
            if (hadAnalytics && !analytics) FirebaseAnalytics.getInstance(ctx).resetAnalyticsData();
        }
        JSObject r = new JSObject();
        r.put(KEY_ANALYTICS, analytics ? GRANTED : DENIED);
        r.put(KEY_CRASH, crash ? GRANTED : DENIED);
        call.resolve(r);
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        Context ctx = getContext();
        String name = call.getString("name");
        if (name == null || !isAvailable(ctx) || !granted(ctx, KEY_ANALYTICS)) {
            call.resolve();
            return;
        }
        Bundle bundle = new Bundle();
        JSObject params = call.getObject("params", new JSObject());
        Iterator<String> keys = params.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            Object value = params.opt(key);
            if (value instanceof Integer || value instanceof Long) bundle.putLong(key, ((Number) value).longValue());
            else if (value instanceof Number) bundle.putDouble(key, ((Number) value).doubleValue());
            else if (value instanceof String) bundle.putString(key, (String) value);
        }
        FirebaseAnalytics.getInstance(ctx).logEvent(name, bundle);
        call.resolve();
    }

    /** Yakalanmamış JS hatası → Crashlytics "non-fatal" (QUALITY_BAR K4). */
    @PluginMethod
    public void recordError(PluginCall call) {
        Context ctx = getContext();
        if (!isAvailable(ctx) || !granted(ctx, KEY_CRASH)) {
            call.resolve();
            return;
        }
        String kind = call.getString("kind", "js_error");
        String name = call.getString("name", "Error");
        String message = call.getString("message", "");
        List<StackTraceElement> frames = new ArrayList<>();
        JSArray raw = call.getArray("frames", new JSArray());
        for (int i = 0; i < raw.length(); i++) {
            JSONObject f = raw.optJSONObject(i);
            if (f == null) continue;
            // Satır numarası küçültülmüş pakette hep 1'e yakın; sütun işlev adına eklenir.
            String fn = f.optString("fn", "<anonim>") + "@" + f.optInt("col", 0);
            frames.add(new StackTraceElement(JS_CLASS, fn, f.optString("file", "?"), f.optInt("line", 0)));
        }
        JsException e = "promise_rejection".equals(kind) ? new JsUnhandledRejection(name + ": " + message) : new JsError(name + ": " + message);
        e.setStackTrace(frames.toArray(new StackTraceElement[0]));
        FirebaseCrashlytics crashlytics = FirebaseCrashlytics.getInstance();
        crashlytics.setCustomKey("error_kind", kind);
        crashlytics.recordException(e);
        call.resolve();
    }

    @PluginMethod
    public void setKey(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key != null && value != null && isAvailable(getContext())) {
            FirebaseCrashlytics.getInstance().setCustomKey(key, value);
        }
        call.resolve();
    }

    /** Yalnızca debug derlemesi: gerçek bir yerel çökme (Crashlytics konsolunda "Crashes"). */
    @PluginMethod
    public void testCrash(PluginCall call) {
        if (!isDebuggable(getContext())) {
            call.reject("Yalnızca debug derlemesinde");
            return;
        }
        call.resolve();
        new Handler(Looper.getMainLooper()).post(() -> {
            throw new RuntimeException("Kafadarlar test çökmesi (Faz 2.8)");
        });
    }

    /**
     * WebView çizici süreci öldü (MainActivity): Crashlytics'e non-fatal + analiz olayı, rıza varsa.
     * Uygulama süreci yaşamaya devam eder (etkinlik yeniden kurulur); rapor bir sonraki açılışta gider.
     */
    public static void recordRendererGone(Context ctx, boolean didCrash, int rendererPriority) {
        if (!isAvailable(ctx)) return;
        if (granted(ctx, KEY_CRASH)) {
            FirebaseCrashlytics crashlytics = FirebaseCrashlytics.getInstance();
            crashlytics.setCustomKey("renderer_did_crash", didCrash);
            crashlytics.setCustomKey("renderer_priority", rendererPriority);
            crashlytics.recordException(new RendererGone(didCrash ? "WebView çizici süreci çöktü" : "WebView çizici süreci sistem tarafından kapatıldı"));
        }
        if (granted(ctx, KEY_ANALYTICS)) {
            Bundle b = new Bundle();
            b.putLong("did_crash", didCrash ? 1 : 0);
            FirebaseAnalytics.getInstance(ctx).logEvent("renderer_gone", b);
        }
    }

    private static void applyConsent(Context ctx, boolean analytics, boolean crash) {
        FirebaseAnalytics fa = FirebaseAnalytics.getInstance(ctx);
        Map<FirebaseAnalytics.ConsentType, FirebaseAnalytics.ConsentStatus> consent = new EnumMap<>(FirebaseAnalytics.ConsentType.class);
        consent.put(FirebaseAnalytics.ConsentType.ANALYTICS_STORAGE, analytics ? FirebaseAnalytics.ConsentStatus.GRANTED : FirebaseAnalytics.ConsentStatus.DENIED);
        consent.put(FirebaseAnalytics.ConsentType.AD_STORAGE, FirebaseAnalytics.ConsentStatus.DENIED);
        consent.put(FirebaseAnalytics.ConsentType.AD_USER_DATA, FirebaseAnalytics.ConsentStatus.DENIED);
        consent.put(FirebaseAnalytics.ConsentType.AD_PERSONALIZATION, FirebaseAnalytics.ConsentStatus.DENIED);
        fa.setConsent(consent);
        fa.setAnalyticsCollectionEnabled(analytics);
        FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(crash);
    }

    private static boolean granted(Context ctx, String key) {
        return GRANTED.equals(prefs(ctx).getString(key, UNSET));
    }

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static boolean isAvailable(Context ctx) {
        return !FirebaseApp.getApps(ctx).isEmpty();
    }

    private static boolean isDebuggable(Context ctx) {
        return (ctx.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private static String webViewVersion(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PackageInfo info = WebView.getCurrentWebViewPackage();
            if (info != null && info.versionName != null) return info.versionName;
        }
        return "unknown";
    }

    /** JS hatalarının Crashlytics'teki türleri (konsolda bu adlarla süzülür). */
    static class JsException extends RuntimeException {

        JsException(String message) {
            super(message);
        }
    }

    static final class JsError extends JsException {

        JsError(String message) {
            super(message);
        }
    }

    static final class JsUnhandledRejection extends JsException {

        JsUnhandledRejection(String message) {
            super(message);
        }
    }

    static final class RendererGone extends RuntimeException {

        RendererGone(String message) {
            super(message);
        }
    }
}
