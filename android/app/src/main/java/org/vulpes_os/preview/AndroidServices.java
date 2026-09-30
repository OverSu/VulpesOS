package org.vulpes_os.preview;

import android.app.*;
import android.content.*;
import android.database.Cursor;
import android.media.AudioManager;
import android.net.Uri;
import android.os.*;
import android.provider.*;
import android.util.Base64;
import android.webkit.MimeTypeMap;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;
import org.mozilla.geckoview.GeckoResult;

/** Android operations reachable only from the bundled extension's authorized RPC. */
final class AndroidServices {

  static final int PICK = 410,
    CAPTURE = 411,
    CONTACT = 412;
  static final long MAX_MEDIA = 32L * 1024 * 1024;
  final VulpesApplication app;
  final ExecutorService io = Executors.newSingleThreadExecutor();
  final Handler main = new Handler(Looper.getMainLooper());
  GeckoResult<Object> pending;
  String pendingType;

  AndroidServices(VulpesApplication app) {
    this.app = app;
  }

  GeckoResult<Object> request(JSONObject message) {
    String op = message.optString("type");
    GeckoResult<Object> result = new GeckoResult<>();
    try {
      JSONObject p = message.optJSONObject("params");
      if (p == null) p = new JSONObject();
      switch (op) {
        case "android.notification":
          JSONObject request = p;
          if (p.optString("operation").equals("permission")) {
            activity().notificationPermission(granted ->
              result.complete(granted ? "granted" : "denied")
            );
          } else result.complete(app.notifications.local(request));
          break;
        case "android.settings":
          openSettings(p.getString("panel"));
          result.complete(null);
          break;
        case "android.snapshot":
          result.complete(snapshot());
          break;
        case "android.set":
          set(p);
          result.complete(snapshot());
          break;
        case "android.pick":
          pick(p.getString("type"), result);
          break;
        case "android.capture":
          capture(result);
          break;
        case "android.alarms":
          activity().startActivity(new Intent(AlarmClock.ACTION_SHOW_ALARMS));
          result.complete(null);
          break;
        case "android.contact":
          if (pending != null) throw new IllegalStateException("PICKER_BUSY");
          activity().startActivityForResult(
            new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI),
            CONTACT
          );
          pending = result;
          pendingType = "contact";
          break;
        case "android.sms":
          String numbers = p.optString("number"),
            text = p.optString("body");
          if (
            !numbers.matches("[+0-9*# ,;()-]{0,200}") || text.length() > 10000
          ) throw new IllegalArgumentException("INVALID_MESSAGE");
          activity().startActivity(
            new Intent(Intent.ACTION_SENDTO, Uri.fromParts("smsto", numbers, null)).putExtra(
              "sms_body",
              text
            )
          );
          result.complete(null);
          break;
        case "android.dial":
          String number = p.getString("number");
          if (!number.matches("[+0-9*# ,;()-]{1,80}")) throw new IllegalArgumentException(
            "INVALID_NUMBER"
          );
          activity().startActivity(
            new Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", number, null))
          );
          result.complete(null);
          break;
        case "android.media":
          JSONObject params = p;
          io.execute(() -> {
            try {
              Object value = media(params);
              main.post(() -> result.complete(value));
            } catch (Exception e) {
              fail(result, e);
            }
          });
          break;
        default:
          throw new IllegalArgumentException("METHOD_NOT_SUPPORTED");
      }
    } catch (Exception e) {
      fail(result, e);
    }
    return result;
  }

  private void fail(GeckoResult<Object> result, Exception e) {
    main.post(() -> {
      try {
        result.complete(
          new JSONObject().put(
            "error",
            e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()
          )
        );
      } catch (JSONException ignored) {}
    });
  }

  private MainActivity activity() {
    if (app.activity == null || app.activity.isFinishing()) throw new IllegalStateException(
      "ACTIVITY_UNAVAILABLE"
    );
    return app.activity;
  }

  void openSettings(String panel) {
    Map<String, String> actions = new HashMap<>();
    actions.put("wifi", Settings.ACTION_WIFI_SETTINGS);
    actions.put("bluetooth", Settings.ACTION_BLUETOOTH_SETTINGS);
    actions.put("data", Settings.ACTION_WIRELESS_SETTINGS);
    actions.put("airplane-mode", Settings.ACTION_AIRPLANE_MODE_SETTINGS);
    actions.put("geolocation", Settings.ACTION_LOCATION_SOURCE_SETTINGS);
    actions.put("display", Settings.ACTION_DISPLAY_SETTINGS);
    actions.put("sound", Settings.ACTION_SOUND_SETTINGS);
    actions.put("dateTime", Settings.ACTION_DATE_SETTINGS);
    actions.put("screenLock", Settings.ACTION_SECURITY_SETTINGS);
    actions.put("battery", Settings.ACTION_BATTERY_SAVER_SETTINGS);
    actions.put("home", Settings.ACTION_HOME_SETTINGS);
    actions.put("storage", Settings.ACTION_INTERNAL_STORAGE_SETTINGS);
    actions.put("notifications", Settings.ACTION_APP_NOTIFICATION_SETTINGS);
    actions.put("apps", Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
    actions.put("root", Settings.ACTION_SETTINGS);
    if (!actions.containsKey(panel)) throw new IllegalArgumentException("UNKNOWN_PANEL");
    Intent intent = new Intent(actions.get(panel));
    if (panel.equals("notifications")) intent.putExtra(
      Settings.EXTRA_APP_PACKAGE,
      app.getPackageName()
    );
    if (panel.equals("apps")) intent.setData(Uri.parse("package:" + app.getPackageName()));
    activity().startActivity(intent);
  }

  JSONObject snapshot() throws Exception {
    AudioManager audio = app.getSystemService(AudioManager.class);
    JSONObject data = new JSONObject();
    Intent battery = app.registerReceiver(null, new android.content.IntentFilter(Intent.ACTION_BATTERY_CHANGED));
    if (battery != null) {
      int level = battery.getIntExtra(android.os.BatteryManager.EXTRA_LEVEL, -1);
      int scale = battery.getIntExtra(android.os.BatteryManager.EXTRA_SCALE, -1);
      int status = battery.getIntExtra(android.os.BatteryManager.EXTRA_STATUS, -1);
      if (level >= 0 && scale > 0) data.put("battery", new JSONObject()
        .put("level", (double) level / scale)
        .put("charging", status == android.os.BatteryManager.BATTERY_STATUS_CHARGING ||
          status == android.os.BatteryManager.BATTERY_STATUS_FULL));
    }

    data.put(
      "screen.brightness",
      app
        .getSharedPreferences("android", 0)
        .getFloat(
          "brightness",
          Settings.System.getInt(app.getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, 128) /
            255f
        )
    );
    data.put(
      "audio.volume.content",
      Math.round(
        (15f * audio.getStreamVolume(AudioManager.STREAM_MUSIC)) /
          audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      )
    );
    data.put("audio.volume.content.max", audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC));
    data.put(
      "airplaneMode.enabled",
      Settings.Global.getInt(app.getContentResolver(), Settings.Global.AIRPLANE_MODE_ON, 0) != 0
    );
    data.put(
      "geolocation.enabled",
      app
        .getSystemService(android.location.LocationManager.class)
        .isProviderEnabled(android.location.LocationManager.GPS_PROVIDER)
    );
    data.put("wifi.enabled", Settings.Global.getInt(app.getContentResolver(), "wifi_on", 0) != 0);
    data.put(
      "bluetooth.enabled",
      Settings.Global.getInt(app.getContentResolver(), "bluetooth_on", 0) != 0
    );
    data.put("deviceinfo.product_model", Build.MANUFACTURER + " " + Build.MODEL);
    data.put("deviceinfo.hardware", Build.HARDWARE);
    data.put("deviceinfo.firmware_revision", "Android " + Build.VERSION.RELEASE);
    data.put("deviceinfo.software", "Vulpes OS " + app.getPackageManager().getPackageInfo(app.getPackageName(), 0).versionName);
    data.put(
      "android.notifications.enabled",
      app.getSystemService(NotificationManager.class).areNotificationsEnabled()
    );
    return data;
  }

  void set(JSONObject p) throws JSONException {
    String key = p.getString("key");
    if (key.equals("screen.brightness")) {
      float value = (float) p.getDouble("value");
      if (!Float.isFinite(value) || value < 0 || value > 1) throw new IllegalArgumentException(
        "INVALID_VALUE"
      );
      android.view.WindowManager.LayoutParams attrs = activity().getWindow().getAttributes();
      attrs.screenBrightness = Math.max(.02f, value);
      activity().getWindow().setAttributes(attrs);
      app.getSharedPreferences("android", 0).edit().putFloat("brightness", value).apply();
    } else if (key.equals("audio.volume.content")) {
      AudioManager audio = app.getSystemService(AudioManager.class);
      int value = p.getInt("value");
      if (value < 0 || value > 15) throw new IllegalArgumentException("INVALID_VALUE");
      audio.setStreamVolume(
        AudioManager.STREAM_MUSIC,
        Math.round((value * audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC)) / 15f),
        0
      );
    } else throw new IllegalArgumentException("SETTING_REQUIRES_ANDROID_PANEL");
  }

  void pick(String type, GeckoResult<Object> result) {
    checkType(type);
    if (pending != null) throw new IllegalStateException("PICKER_BUSY");
    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT)
      .addCategory(Intent.CATEGORY_OPENABLE)
      .setType(prefix(type) + "*")
      .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
    activity().startActivityForResult(intent, PICK);
    pending = result;
    pendingType = type;
    app
      .getSharedPreferences("pending-media", 0)
      .edit()
      .putString("type", type)
      .putInt("code", PICK)
      .commit();
  }

  void capture(GeckoResult<Object> result) throws IOException {
    if (pending != null) throw new IllegalStateException("PICKER_BUSY");
    Files.deleteIfExists(new File(app.getCacheDir(), "capture.jpg").toPath());
    Uri uri = Uri.parse("content://" + app.getPackageName() + ".capture/capture.jpg");
    Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE)
      .putExtra(MediaStore.EXTRA_OUTPUT, uri)
      .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
    intent.setClipData(ClipData.newRawUri("Vulpes photo", uri));
    activity().startActivityForResult(intent, CAPTURE);
    pending = result;
    pendingType = "pictures";
    app
      .getSharedPreferences("pending-media", 0)
      .edit()
      .putString("type", "pictures")
      .putInt("code", CAPTURE)
      .commit();
  }

  void onResult(int code, int status, Intent intent) {
    if (code == CONTACT) {
      GeckoResult<Object> result = pending;
      pending = null;
      pendingType = null;
      if (result == null) return;
      if (status != Activity.RESULT_OK || intent == null || intent.getData() == null) {
        fail(result, new IOException("AbortError"));
        return;
      }
      Uri uri = intent.getData();
      io.execute(() -> {
        try (
          Cursor c = app
            .getContentResolver()
            .query(
              uri,
              new String[] {
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER,
              },
              null,
              null,
              null
            )
        ) {
          if (c == null || !c.moveToFirst()) throw new IOException("NotFoundError");
          JSONObject contact = new JSONObject()
            .put("name", new JSONArray().put(c.getString(0)))
            .put("givenName", new JSONArray().put(c.getString(0)))
            .put(
              "tel",
              new JSONArray().put(
                new JSONObject()
                  .put("value", c.getString(1))
                  .put("type", new JSONArray().put("mobile"))
              )
            );
          main.post(() -> result.complete(contact));
        } catch (Exception e) {
          fail(result, e);
        }
      });
      return;
    }
    if (code != PICK && code != CAPTURE) return;
    SharedPreferences saved = app.getSharedPreferences("pending-media", 0);
    if (pending == null && saved.getInt("code", 0) != code) return;
    GeckoResult<Object> result = pending == null ? new GeckoResult<>() : pending;
    String type = pendingType == null ? saved.getString("type", "pictures") : pendingType;
    pending = null;
    pendingType = null;
    saved.edit().clear().commit();
    if (status != Activity.RESULT_OK) {
      fail(result, new IOException("AbortError"));
      return;
    }
    ArrayList<Uri> uris = new ArrayList<>();
    if (code == CAPTURE) uris.add(Uri.fromFile(new File(app.getCacheDir(), "capture.jpg")));
    else if (intent != null && intent.getClipData() != null) {
      for (int i = 0; i < intent.getClipData().getItemCount(); i++) uris.add(
        intent.getClipData().getItemAt(i).getUri()
      );
    } else if (intent != null && intent.getData() != null) uris.add(intent.getData());
    io.execute(() -> {
      try {
        JSONArray names = new JSONArray();
        for (Uri uri : uris) {
          String mime = code == CAPTURE ? "image/jpeg" : app.getContentResolver().getType(uri);
          String name = code == CAPTURE
            ? "Photo-" + System.currentTimeMillis() + ".jpg"
            : displayName(uri);
          if (mime == null) mime = mime(name);
          if (!mime.startsWith(prefix(type))) throw new IOException("TypeMismatchError");
          name = UUID.randomUUID() + "-" + name.replaceAll("[^a-zA-Z0-9._-]", "_");
          File target = path(type, name);
          try (
            InputStream in = code == CAPTURE
              ? new FileInputStream(new File(uri.getPath()))
              : app.getContentResolver().openInputStream(uri)
          ) {
            copy(in, target);
          }
          names.put("/sdcard/" + name);
        }
        main.post(() -> result.complete(names));
      } catch (Exception e) {
        fail(result, e);
      } finally {
        if (code == CAPTURE) new File(app.getCacheDir(), "capture.jpg").delete();
      }
    });
  }

  String displayName(Uri uri) {
    try (
      Cursor c = app
        .getContentResolver()
        .query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)
    ) {
      if (c != null && c.moveToFirst()) return c.getString(0);
    } catch (Exception ignored) {}
    return "media";
  }

  static void checkType(String type) {
    if (
      !Arrays.asList("pictures", "videos", "music").contains(type)
    ) throw new IllegalArgumentException("INVALID_MEDIA_TYPE");
  }

  static String prefix(String type) {
    checkType(type);
    return type.equals("pictures") ? "image/" : type.equals("videos") ? "video/" : "audio/";
  }

  static String mime(String name) {
    String ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    String type = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
    return type == null ? "application/octet-stream" : type;
  }

  File path(String type, String name) throws IOException {
    checkType(type);
    if (name.startsWith("/sdcard/")) name = name.substring(8);
    File root = new File(app.getFilesDir(), "media/" + type);
    root.mkdirs();
    File file = new File(root, name);
    if (
      !file.getCanonicalPath().startsWith(root.getCanonicalPath() + "/") ||
      name.contains("..") ||
      name.startsWith("/")
    ) throw new IOException("SecurityError");
    return file;
  }

  void copy(InputStream in, File file) throws IOException {
    if (in == null) throw new IOException("NotFoundError");
    file.getParentFile().mkdirs();
    File temp = new File(file.getPath() + ".tmp");
    try (OutputStream out = new FileOutputStream(temp)) {
      byte[] buf = new byte[32768];
      int n;
      long total = 0;
      while ((n = in.read(buf)) != -1) {
        total += n;
        if (total > MAX_MEDIA) throw new IOException("MEDIA_TOO_LARGE_32_MIB");
        out.write(buf, 0, n);
      }
      Files.move(temp.toPath(), file.toPath());
    } finally {
      temp.delete();
    }
  }

  JSONObject info(File root, File f) throws JSONException {
    return new JSONObject()
      .put("name", "/sdcard/" + root.toPath().relativize(f.toPath()).toString())
      .put("size", f.length())
      .put("lastModified", f.lastModified())
      .put("type", mime(f.getName()));
  }

  Object media(JSONObject p) throws Exception {
    String type = p.getString("type"),
      op = p.getString("operation");
    checkType(type);
    File root = path(type, "dummy").getParentFile();
    if (op.equals("available")) return "available";
    if (op.equals("freeSpace")) return root.getUsableSpace();
    if (op.equals("enumerate") || op.equals("usedSpace")) {
      JSONArray rows = new JSONArray();
      long used = 0;
      try (java.util.stream.Stream<Path> paths = Files.walk(root.toPath())) {
        for (Path path : (Iterable<Path>) paths.filter(Files::isRegularFile)::iterator) {
          File f = path.toFile();
          if (f.getName().endsWith(".tmp")) continue;
          used += f.length();
          String name = root.toPath().relativize(path).toString();
          if (
            name.startsWith(p.optString("name", "").replaceFirst("^/sdcard/", "")) &&
            f.lastModified() >= p.optLong("since", 0)
          ) rows.put(info(root, f));
        }
      }
      return op.equals("usedSpace") ? used : rows;
    }
    File f = path(type, p.getString("name"));
    if (op.equals("get")) {
      if (!f.isFile()) throw new IOException("NotFoundError");
      if (f.length() > MAX_MEDIA) throw new IOException("MEDIA_TOO_LARGE_32_MIB");
      return info(root, f).put(
        "blob",
        new JSONObject()
          .put("__vulpesBlobV1", true)
          .put("type", mime(f.getName()))
          .put("base64", Base64.encodeToString(Files.readAllBytes(f.toPath()), Base64.NO_WRAP))
      );
    }
    if (op.equals("delete")) {
      if (!f.isFile() || !f.delete()) throw new IOException("NotFoundError");
      return "/sdcard/" + root.toPath().relativize(f.toPath());
    }
    if (op.equals("add")) {
      JSONObject blob = p.getJSONObject("blob");
      if (
        !blob.optBoolean("__vulpesBlobV1") || !blob.getString("type").startsWith(prefix(type))
      ) throw new IOException("TypeMismatchError");
      if (f.exists()) throw new IOException("NoModificationAllowedError");
      String encoded = blob.getString("base64");
      if (encoded.length() > (MAX_MEDIA * 4) / 3 + 4) throw new IOException(
        "MEDIA_TOO_LARGE_32_MIB"
      );
      copy(new ByteArrayInputStream(Base64.decode(encoded, Base64.DEFAULT)), f);
      return "/sdcard/" + root.toPath().relativize(f.toPath());
    }
    throw new IllegalArgumentException("NotSupportedError");
  }
}
