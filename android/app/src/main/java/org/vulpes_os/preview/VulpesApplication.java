package org.vulpes_os.preview;

import android.app.Application;
import android.util.Log;
import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import org.mozilla.geckoview.*;

public final class VulpesApplication extends Application {

  GeckoRuntime runtime;
  GaiaServer server;
  WebExtension.Port port;
  MainActivity activity;
  GeckoResult<WebExtension> extension;
  GeckoSession gaiaSession;
  AndroidServices services;
  AndroidNotifications notifications;
  boolean homeVisible;
  boolean homeAtBottom;

  void prepare() throws IOException {
    if (runtime != null) return;
    server = new GaiaServer(this);
    File config = new File(getFilesDir(), "geckoview.yaml");
    try (FileOutputStream out = new FileOutputStream(config)) {
      out.write(
        ("prefs:\n  datareporting.policy.dataSubmissionEnabled: false\n  toolkit.telemetry.enabled: false\n  browser.tabs.warnOnClose: false\n" +
          (android.os.Build.HARDWARE.equals("ranchu")
            ? "  gfx.webrender.software: true\n"
            : "")).getBytes(StandardCharsets.UTF_8)
      );
    }
    runtime = GeckoRuntime.create(
      this,
      new GeckoRuntimeSettings.Builder()
        .configFilePath(config.getAbsolutePath())
        .consoleOutput(true)
        .remoteDebuggingEnabled(
          (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
        )
        .locales(new String[] { "fr", "en-US" })
        .automaticFontSizeAdjustment(false)
        .fontInflation(false)
        .build()
    );
    services = new AndroidServices(this);
    notifications = new AndroidNotifications(this);
    runtime.setWebNotificationDelegate(notifications);
    extension = runtime
      .getWebExtensionController()
      .ensureBuiltIn("resource://android/assets/bridge/", "android-host@vulpes-os.org");
    extension.accept(
      ext ->
        ext.setMessageDelegate(
          new WebExtension.MessageDelegate() {
            @Override
            public void onConnect(WebExtension.Port p) {
              port = p;
              if (activity != null) notifications.click(activity.getIntent());
              p.setDelegate(
                new WebExtension.PortDelegate() {
                  @Override
                  public void onDisconnect(WebExtension.Port p) {
                    if (port == p) port = null;
                  }
                }
              );
            }

            @Override
            public GeckoResult<Object> onMessage(
              String app,
              Object message,
              WebExtension.MessageSender sender
            ) {
              if (message instanceof JSONObject) {
                if (sender.environmentType != WebExtension.MessageSender.ENV_TYPE_EXTENSION) {
                  return GeckoResult.fromException(new SecurityException("EXTENSION_REQUIRED"));
                }
                JSONObject json = (JSONObject) message;
                if (json.optString("type").equals("homeScroll")) {
                  homeAtBottom = json.optBoolean("bottom");
                  if (activity != null) activity.setHomeSurface(homeVisible);
                  return GeckoResult.fromValue(null);
                }
                if (json.optString("type").equals("navigation")) {
                  homeVisible = json.optBoolean("home");
                  if (activity != null) activity.setHomeSurface(homeVisible);
                  return GeckoResult.fromValue(null);
                }
                if (json.optString("type").startsWith("android.")) return services
                  .request(json)
                  .map(value -> {
                    try {
                      return new JSONObject()
                        .put("result", value == null ? JSONObject.NULL : value)
                        .toString();
                    } catch (org.json.JSONException e) {
                      throw new IllegalArgumentException(e);
                    }
                  });
                if (json.optString("type").equals("open") && activity != null) activity.openBrowser(
                  json.optString("url")
                );
              }
              return GeckoResult.fromValue(null);
            }
          },
          "vulpes"
        ),
      error -> Log.e("Vulpes", "Extension failed", error)
    );
  }

  void home(boolean held) {
    if (port == null) return;
    try {
      port.postMessage(new JSONObject().put("type", held ? "holdhome" : "home"));
    } catch (Exception e) {
      Log.e("Vulpes", "Home", e);
    }
  }

  void resumed() {
    if (port == null) return;
    try {
      port.postMessage(new JSONObject().put("type", "android-resume"));
    } catch (Exception e) {
      Log.w("Vulpes", "Resume notification", e);
    }
  }
}
