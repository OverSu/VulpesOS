package org.vulpes_os.preview;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.database.ContentObserver;
import android.os.Handler;
import android.os.Looper;
import java.util.HashMap;
import java.util.Map;
import android.net.Uri;
import android.provider.CallLog;
import android.provider.ContactsContract;
import android.provider.Telephony;
import org.json.JSONArray;
import org.json.JSONObject;

/** Read-through access. Android remains the owner of contacts and telephony records. */
final class AndroidPersonalData {
  private final Context context;
  private final Handler main = new Handler(Looper.getMainLooper());
  private final Map<String, ContentObserver> observers = new HashMap<>();
  private final Map<String, Runnable> pending = new HashMap<>();
  void changed(String kind) {
    Runnable previous = pending.remove(kind);
    if (previous != null) main.removeCallbacks(previous);
    Runnable next = () -> {
      pending.remove(kind);
      VulpesApplication app = (VulpesApplication) context;
      if (app.port == null) return;
      try { app.port.postMessage(new JSONObject().put("type", "android-data-changed").put("kind", kind)); }
      catch (Exception ignored) { /* The resume event refreshes detached sessions. */ }
    };
    pending.put(kind, next);
    main.postDelayed(next, 250);
  }
  void observe() {
    for (String kind : new String[]{"contacts", "sms", "calls"}) {
      if (granted(kind) && !observers.containsKey(kind)) {
        ContentObserver observer = new ContentObserver(main) {
          @Override public void onChange(boolean selfChange) { changed(kind); }
        };
        Uri uri = kind.equals("contacts") ? ContactsContract.Contacts.CONTENT_URI :
          kind.equals("sms") ? Telephony.Sms.CONTENT_URI : CallLog.Calls.CONTENT_URI;
        try {
          context.getContentResolver().registerContentObserver(uri, true, observer);
          observers.put(kind, observer);
        } catch (SecurityException ignored) { /* Permission can be revoked during registration. */ }
      } else if (!granted(kind) && observers.containsKey(kind)) {
        context.getContentResolver().unregisterContentObserver(observers.remove(kind));
      }
    }
  }

  AndroidPersonalData(Context context) { this.context = context; }

  static String permission(String kind) {
    switch (kind) {
      case "contacts": return Manifest.permission.READ_CONTACTS;
      case "sms": return Manifest.permission.READ_SMS;
      case "calls": return Manifest.permission.READ_CALL_LOG;
      default: throw new IllegalArgumentException("INVALID_DATA_KIND");
    }
  }

  boolean granted(String kind) {
    return context.getSharedPreferences("personal-data", 0).getBoolean(kind, false) &&
      context.checkSelfPermission(permission(kind)) == PackageManager.PERMISSION_GRANTED;
  }

  void enable(String kind, boolean value) {
    permission(kind);
    context.getSharedPreferences("personal-data", 0).edit().putBoolean(kind, value).apply();
    observe();
    changed(kind);
  }

  JSONObject status() throws Exception {
    JSONObject result = new JSONObject();
    for (String kind : new String[]{"contacts", "sms", "calls"}) result.put(kind, granted(kind));
    return result;
  }

  JSONObject page(JSONObject params) throws Exception {
    String kind = params.getString("kind");
    if (!granted(kind)) throw new SecurityException("ANDROID_DATA_PERMISSION_DENIED");
    long after = params.optLong("after", 0);
    if (after < 0) throw new IllegalArgumentException("INVALID_CURSOR");
    Uri uri;
    String[] columns;
    switch (kind) {
      case "contacts":
        uri = ContactsContract.Contacts.CONTENT_URI;
        columns = new String[]{"_id", "display_name", "starred", "contact_last_updated_timestamp"};
        break;
      case "sms":
        uri = Telephony.Sms.CONTENT_URI;
        columns = new String[]{"_id", "thread_id", "address", "body", "date", "type", "read", "status"};
        break;
      default:
        uri = CallLog.Calls.CONTENT_URI;
        columns = new String[]{"_id", "number", "date", "duration", "type"};
    }
    JSONArray rows = new JSONArray();
    long last = after;
    boolean more = false;
    ContentResolver resolver = context.getContentResolver();
    // A key cursor avoids SQL LIMIT syntax differences between Android providers.
    try (Cursor cursor = resolver.query(uri, columns, "_id > ?", new String[]{Long.toString(after)}, "_id ASC")) {
      if (cursor == null) throw new IllegalStateException("ANDROID_PROVIDER_UNAVAILABLE");
      int bytes = 0;
      while (cursor.moveToNext()) {
        if (rows.length() >= 100 || bytes > 512 * 1024) { more = true; break; }
        JSONObject row = new JSONObject();
        for (int i = 0; i < columns.length; i++) {
          row.put(columns[i], cursor.isNull(i) ? JSONObject.NULL :
            cursor.getType(i) == Cursor.FIELD_TYPE_INTEGER ? cursor.getLong(i) : cursor.getString(i));
        }
        last = cursor.getLong(0);
        if (kind.equals("contacts")) contactDetails(last, row);
        rows.put(row);
        bytes += row.toString().length() * 2;
      }
    }
    return new JSONObject().put("rows", rows).put("next", more ? last : JSONObject.NULL);
  }

  private void contactDetails(long id, JSONObject contact) throws Exception {
    JSONArray phones = new JSONArray(), emails = new JSONArray();
    contact.put("tel", phones).put("email", emails);
    try (Cursor c = context.getContentResolver().query(ContactsContract.Data.CONTENT_URI,
      new String[]{"mimetype", "data1", "data2", "data3", "is_primary"},
      "contact_id = ? AND mimetype IN (?, ?, ?)", new String[]{Long.toString(id),
        ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE,
        ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE,
        ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE}, "_id ASC")) {
      if (c == null) throw new IllegalStateException("ANDROID_PROVIDER_UNAVAILABLE");
      while (c.moveToNext()) {
        String mime = c.getString(0);
        if (mime.equals(ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)) {
          if (!contact.has("givenName")) contact.put("givenName", new JSONArray().put(c.getString(2)))
            .put("familyName", new JSONArray().put(c.getString(3)));
        } else {
          boolean phone = mime.equals(ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE);
          int type = c.getInt(2);
          String label = type == 0 ? c.getString(3) : phone ?
            (type == 2 ? "mobile" : type == 1 ? "home" : type == 3 ? "work" : "other") :
            (type == 1 ? "home" : type == 2 ? "work" : "other");
          (phone ? phones : emails).put(new JSONObject().put("value", c.getString(1))
            .put("type", new JSONArray().put(label == null ? "other" : label)).put("pref", c.getInt(4) != 0));
        }
      }
    }
  }

  Intent open(JSONObject params) {
    String kind = params.optString("kind");
    if (kind.equals("contacts")) {
      String id = params.optString("id");
      if (!id.matches("[1-9][0-9]{0,15}")) throw new IllegalArgumentException("INVALID_CONTACT");
      if (!granted(kind)) throw new SecurityException("ANDROID_DATA_PERMISSION_DENIED");
      return new Intent(Intent.ACTION_VIEW, ContentUris.withAppendedId(ContactsContract.Contacts.CONTENT_URI, Long.parseLong(id)));
    }
    if (kind.equals("sms")) return new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_MESSAGING);
    if (kind.equals("calls")) return new Intent(Intent.ACTION_VIEW, CallLog.Calls.CONTENT_URI);
    throw new IllegalArgumentException("INVALID_DATA_KIND");
  }
}
