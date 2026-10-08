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
  boolean pendingScreenLock;
  boolean homeVisible;
  boolean homeAtBottom;

  @Override
  public void onCreate() {
    super.onCreate();
    android.content.BroadcastReceiver receiver = new android.content.BroadcastReceiver() {
      @Override public void onReceive(android.content.Context context, android.content.Intent intent) {
        pendingScreenLock = true;
        sendScreenLock();
      }
    };
    android.content.IntentFilter filter = new android.content.IntentFilter(android.content.Intent.ACTION_SCREEN_OFF);
    if (android.os.Build.VERSION.SDK_INT >= 33) registerReceiver(receiver,filter,RECEIVER_NOT_EXPORTED);
    else registerReceiver(receiver,filter);
  }

  void sendScreenLock() {
    if (port == null || !pendingScreenLock) return;
    try {
      port.postMessage(new JSONObject().put("type","android-screen-off"));
      pendingScreenLock = false;
    } catch (Exception error) {Log.w("Vulpes","Screen lock pending",error);}
  }

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
              sendScreenLock();
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
                if (json.optString("type").equals("marketplace.return") && activity!=null) {activity.runOnUiThread(()->activity.closeBrowser());return GeckoResult.fromValue(null);}
                if (json.optString("type").startsWith("packages.")) {
                  GeckoResult<Object> result=new GeckoResult<>();
                  new Thread(()->{try {
                    String operation=json.getString("type");
                    if(operation.equals("packages.save"))server.installed.save(json.getJSONObject("item"));
                    else if(operation.equals("packages.remove"))server.installed.remove(json.getString("id"));
                    else if(!operation.equals("packages.list"))throw new IOException("INVALID_OPERATION");
                    result.complete(server.installed.list().toString());
                  }catch(Exception error){result.completeExceptionally(error);}},"Vulpes-packages").start();
                  return result;
                }
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
    sendScreenLock();
    if (port == null) return;
    try {
      port.postMessage(new JSONObject().put("type", "android-resume"));
    } catch (Exception e) {
      Log.w("Vulpes", "Resume notification", e);
    }
  }
}
