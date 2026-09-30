package org.vulpes_os.preview;

import android.app.*;
import android.content.Intent;
import android.content.SharedPreferences;
import java.util.HashMap;
import org.json.*;
import org.mozilla.geckoview.*;

final class AndroidNotifications implements WebNotificationDelegate {

  private final VulpesApplication app;
  private final NotificationManager manager;
  private final HashMap<String, WebNotification> live = new HashMap<>();
  private final HashMap<String, Integer> ids = new HashMap<>();
  private int nextId = 1;

  AndroidNotifications(VulpesApplication app) {
    this.app = app;
    manager = app.getSystemService(NotificationManager.class);
    manager.createNotificationChannel(
      new NotificationChannel("vulpes", "Vulpes OS", NotificationManager.IMPORTANCE_DEFAULT)
    );
  }

  private String key(WebNotification n) {
    return n.origin + "|" + (n.tag == null || n.tag.isEmpty() ? System.identityHashCode(n) : n.tag);
  }

  public void onShowNotification(WebNotification n) {
    if (!manager.areNotificationsEnabled()) {
      n.dismiss();
      return;
    }
    String key = key(n);
    int id = ids.computeIfAbsent(key, k -> nextId++);
    live.put(key, n);
    Intent open = new Intent(app, MainActivity.class)
      .setAction("org.vulpes_os.preview.NOTIFICATION")
      .putExtra("notificationKey", key)
      .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent action = PendingIntent.getActivity(
      app,
      id,
      open,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
    Notification notification = new Notification.Builder(app, "vulpes")
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(n.title)
      .setContentText(n.text)
      .setStyle(new Notification.BigTextStyle().bigText(n.text))
      .setContentIntent(action)
      .setAutoCancel(true)
      .setOnlyAlertOnce(true)
      .build();
    try {
      manager.notify(id, notification);
      n.show();
    } catch (SecurityException e) {
      live.remove(key);
      n.dismiss();
    }
  }

  public void onCloseNotification(WebNotification n) {
    String key = key(n);
    Integer id = ids.remove(key);
    live.remove(key);
    if (id != null) manager.cancel(id);
  }

  Object local(JSONObject p) throws JSONException {
    String owner = p.getString("owner"),
      operation = p.getString("operation");
    SharedPreferences store = app.getSharedPreferences("notifications", 0);
    if (operation.equals("query")) return manager.areNotificationsEnabled() ? "granted" : "denied";
    if (operation.equals("list")) {
      JSONArray rows = new JSONArray();
      for (android.service.notification.StatusBarNotification item : manager.getActiveNotifications()) {
        String raw = store.getString("local." + item.getId(), null);
        if (raw == null) continue;
        JSONObject data = new JSONObject(raw);
        if (data.optString("owner").equals(owner)) rows.put(data);
      }
      return rows;
    }
    if (operation.equals("close")) {
      int id = p.getInt("id");
      JSONObject data = new JSONObject(store.getString("local." + id, "{}"));
      if (!data.optString("owner").equals(owner)) throw new SecurityException("PERMISSION_DENIED");
      manager.cancel(id);
      store.edit().remove("local." + id).apply();
      return null;
    }
    if (!operation.equals("show")) throw new IllegalArgumentException(
      "UNKNOWN_NOTIFICATION_OPERATION"
    );
    if (!manager.areNotificationsEnabled()) throw new SecurityException("NOTIFICATIONS_DENIED");
    String tag = p.optString("tag");
    int id = 0;
    if (
      !tag.isEmpty()
    ) for (android.service.notification.StatusBarNotification item : manager.getActiveNotifications()) {
      JSONObject saved = new JSONObject(store.getString("local." + item.getId(), "{}"));
      if (owner.equals(saved.optString("owner")) && tag.equals(saved.optString("tag"))) id =
        item.getId();
    }
    if (id == 0) {
      id = store.getInt("next", 10000);
      store.edit().putInt("next", id + 1).apply();
    }
    JSONObject data = new JSONObject(p.toString()).put("id", id);
    store.edit().putString("local." + id, data.toString()).apply();
    Intent open = new Intent(app, MainActivity.class)
      .setAction("org.vulpes_os.preview.LOCAL_NOTIFICATION")
      .putExtra("localNotification", id)
      .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent action = PendingIntent.getActivity(
      app,
      id,
      open,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
    Notification n = new Notification.Builder(app, "vulpes")
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle(p.optString("title", "Vulpes OS"))
      .setContentText(p.optString("body"))
      .setStyle(new Notification.BigTextStyle().bigText(p.optString("body")))
      .setContentIntent(action)
      .setAutoCancel(true)
      .setOnlyAlertOnce(true)
      .build();
    manager.notify(id, n);
    return id;
  }

  void click(Intent intent) {
    if (intent != null && "org.vulpes_os.preview.LOCAL_NOTIFICATION".equals(intent.getAction())) {
      int id = intent.getIntExtra("localNotification", -1);
      SharedPreferences store = app.getSharedPreferences("notifications", 0);
      String raw = store.getString("local." + id, null);
      if (raw != null && app.port != null) try {
        JSONObject data = new JSONObject(raw);
        app.port.postMessage(new JSONObject().put("type", "notification-click").put("data", data));
        store.edit().remove("local." + id).apply();
        intent.removeExtra("localNotification");
      } catch (Exception e) {
        android.util.Log.w("Vulpes", "Notification click", e);
      }
      return;
    }
    if (intent == null || !"org.vulpes_os.preview.NOTIFICATION".equals(intent.getAction())) return;
    String key = intent.getStringExtra("notificationKey");
    WebNotification n = live.remove(key);
    Integer id = ids.remove(key);
    if (id != null) manager.cancel(id);
    if (n != null) n.click();
    intent.removeExtra("notificationKey");
  }
}
