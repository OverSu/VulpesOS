package org.vulpes_os.preview;

import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import java.net.URI;
import java.util.ArrayList;
import org.mozilla.geckoview.*;

public final class MainActivity extends Activity {

  private VulpesApplication app;
  private GeckoSession gaia, web;
  private GeckoView gaiaView, webView;
  private LinearLayout root, webPanel;
  private TextView notice;
  private EditText address;
  private Button home;
  private boolean webBack;
  private boolean resumed, recoverGaia, recoverWeb;
  private long lastCrash;
  private int crashCount;
  private final java.util.Map<Integer, java.util.function.Consumer<Boolean>> permissionResults =
    new java.util.HashMap<>();
  private final java.util.List<java.util.function.Consumer<Boolean>> resumedCameraPermissions =
    new java.util.ArrayList<>();
  private int nextPermission = 500;
  private GeckoResult<GeckoSession.PromptDelegate.PromptResponse> fileResult;
  private GeckoSession.PromptDelegate.FilePrompt filePrompt;

  @Override
  public void onCreate(Bundle state) {
    super.onCreate(state);
    app = (VulpesApplication) getApplication();
    app.activity = this;
    root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setBackgroundColor(Color.rgb(18, 35, 50));
    root.setOnApplyWindowInsetsListener((v, insets) -> {
      if (Build.VERSION.SDK_INT >= 30) {
        android.graphics.Insets bars = insets.getInsets(
          WindowInsets.Type.ime() |
            WindowInsets.Type.displayCutout()
        );
        v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
      } else v.setPadding(
        insets.getSystemWindowInsetLeft(),
        insets.getSystemWindowInsetTop(),
        insets.getSystemWindowInsetRight(),
        insets.getSystemWindowInsetBottom() > dp(100) ? insets.getSystemWindowInsetBottom() : 0
      );
      return insets;
    });
    setContentView(root);
    immersive();
    // Respect Android's screen timeout; Gaia must not keep the phone awake indefinitely.
    float brightness = app.getSharedPreferences("android", 0).getFloat("brightness", -1);
    if (brightness >= 0) {
      WindowManager.LayoutParams attrs = getWindow().getAttributes();
      attrs.screenBrightness = Math.max(.02f, brightness);
      getWindow().setAttributes(attrs);
    }
    notice = new TextView(this);
    notice.setText("VULPES\nChargement de Firefox OS…");
    notice.setTextColor(Color.WHITE);
    notice.setGravity(Gravity.CENTER);
    root.addView(notice, new LinearLayout.LayoutParams(-1, dp(90)));
    gaiaView = new GeckoView(this);
    root.addView(gaiaView, new LinearLayout.LayoutParams(-1, 0, 1));
    webPanel = new LinearLayout(this);
    webPanel.setOrientation(LinearLayout.VERTICAL);
    webPanel.setBackgroundColor(Color.WHITE);
    webPanel.setVisibility(View.GONE);
    root.addView(webPanel, new LinearLayout.LayoutParams(-1, 0, 1));
    LinearLayout nav = new LinearLayout(this);
    webPanel.addView(nav, new LinearLayout.LayoutParams(-1, dp(52)));
    Button back = new Button(this);
    back.setText("‹");
    back.setContentDescription("Retour au bureau");
    back.setOnClickListener(v -> closeBrowser());
    nav.addView(back, new LinearLayout.LayoutParams(dp(55), -1));
    address = new EditText(this);
    address.setSingleLine(true);
    address.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
    address.setTextSize(14);
    nav.addView(address, new LinearLayout.LayoutParams(0, -1, 1));
    address.setOnEditorActionListener((v, id, event) -> {
      String url = address.getText().toString().trim();
      openBrowser(url.contains("://") ? url : "https://" + url);
      ((android.view.inputmethod.InputMethodManager) getSystemService(
          INPUT_METHOD_SERVICE
        )).hideSoftInputFromWindow(address.getWindowToken(), 0);
      return true;
    });
    webView = new GeckoView(this);
    webPanel.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
    home = new Button(this);
    home.setText("◯");
    home.setTextColor(Color.WHITE);
    home.setBackgroundColor(Color.rgb(18, 35, 50));
    home.setContentDescription("Accueil Vulpes. Appui long : applications ouvertes.");
    root.addView(home, new LinearLayout.LayoutParams(-1, dp(44)));
    home.setOnClickListener(v -> {
      closeBrowser();
      app.home(false);
    });
    home.setOnLongClickListener(v -> {
      closeBrowser();
      app.home(true);
      return true;
    });
    setHomeSurface(app.homeVisible);
    if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
      0,
      this::back
    );
    try {
      app.prepare();
      boolean retained = app.gaiaSession != null;
      gaia = retained
        ? app.gaiaSession
        : new GeckoSession(
            new GeckoSessionSettings.Builder()
              .displayMode(GeckoSessionSettings.DISPLAY_MODE_STANDALONE)
              .build()
          );
      app.gaiaSession = gaia;
      gaia.setContentDelegate(content);
      gaia.setPromptDelegate(prompts);
      gaia.setPermissionDelegate(permissions);
      gaia.setNavigationDelegate(
        new GeckoSession.NavigationDelegate() {
          @Override
          public GeckoResult<AllowOrDeny> onLoadRequest(GeckoSession s, LoadRequest r) {
            if (r.uri.startsWith("http://") && isGaia(r.uri)) return GeckoResult.fromValue(
              AllowOrDeny.ALLOW
            );
            if (r.uri.equals("about:blank")) return GeckoResult.fromValue(AllowOrDeny.ALLOW);
            openBrowser(r.uri);
            return GeckoResult.fromValue(AllowOrDeny.DENY);
          }
        }
      );
      if (!gaia.isOpen()) gaia.open(app.runtime);
      gaiaView.setSession(gaia);
      app.extension.accept(
        ext -> {
          notice.setVisibility(View.GONE);
          if (isDestroyed()) return;
          if (!retained) gaia.loadUri(gaiaUrl());
          app.notifications.click(getIntent());
        },
        e -> {
          notice.setText("Impossible de démarrer Vulpes : " + e.getMessage());
        }
      );
    } catch (Exception e) {
      notice.setText("Impossible de démarrer Vulpes : " + e.getMessage());
      android.util.Log.e("Vulpes", "Startup", e);
    }
  }

  private void immersive() {
    if (Build.VERSION.SDK_INT >= 30) {
      getWindow().setDecorFitsSystemWindows(false);
      WindowInsetsController controller = getWindow().getInsetsController();
      if (controller != null) {
        controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsets.Type.systemBars());
      }
    } else {
      getWindow().getDecorView().setSystemUiVisibility(
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN |
        View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
        View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
  }

  @Override
  public void onWindowFocusChanged(boolean focused) {
    super.onWindowFocusChanged(focused);
    if (focused) immersive();
  }

  private int dp(int value) {
    return Math.round(value * getResources().getDisplayMetrics().density);
  }

  private boolean isGaia(String url) {
    try {
      URI u = new URI(url);
      return (
        u.getHost() != null && u.getHost().endsWith(".localhost") && u.getPort() == GaiaServer.PORT
      );
    } catch (Exception e) {
      return false;
    }
  }

  void openBrowser(String url) {
    try {
      URI uri = new URI(url);
      if (
        !("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || isGaia(url)
      ) return;
    } catch (Exception e) {
      return;
    }
    if (web == null) {
      web = new GeckoSession();
      web.setContentDelegate(content);
      web.setPromptDelegate(prompts);
      web.setPermissionDelegate(permissions);
      web.setNavigationDelegate(
        new GeckoSession.NavigationDelegate() {
          @Override
          public void onCanGoBack(GeckoSession s, boolean can) {
            webBack = can;
          }

          @Override
          public void onLocationChange(
            GeckoSession s,
            String url,
            java.util.List<GeckoSession.PermissionDelegate.ContentPermission> permissions,
            Boolean gesture
          ) {
            address.setText(url);
          }

          @Override
          public GeckoResult<AllowOrDeny> onLoadRequest(GeckoSession s, LoadRequest r) {
            return GeckoResult.fromValue(
              (r.uri.startsWith("https://") || r.uri.startsWith("http://")) && !isGaia(r.uri)
                ? AllowOrDeny.ALLOW
                : AllowOrDeny.DENY
            );
          }

          @Override
          public GeckoResult<GeckoSession> onNewSession(GeckoSession s, String uri) {
            openBrowser(uri);
            return GeckoResult.fromValue(null);
          }
        }
      );
      web.open(app.runtime);
      webView.setSession(web);
    }
    gaiaView.setVisibility(View.GONE);
    webPanel.setVisibility(View.VISIBLE);
    setHomeSurface(false);
    address.setText(url);
    web.loadUri(url);
    syncActive();
  }

  void setHomeSurface(boolean visible) {
    runOnUiThread(() -> {
      boolean overlay = visible && webPanel.getVisibility() != View.VISIBLE;
      LinearLayout.LayoutParams params = (LinearLayout.LayoutParams) home.getLayoutParams();
      boolean landscape = getResources().getConfiguration().orientation ==
        android.content.res.Configuration.ORIENTATION_LANDSCAPE;
      root.setOrientation(landscape ? LinearLayout.HORIZONTAL : LinearLayout.VERTICAL);
      gaiaView.setLayoutParams(landscape ? new LinearLayout.LayoutParams(0, -1, 1) :
        new LinearLayout.LayoutParams(-1, 0, 1));
      webPanel.setLayoutParams(landscape ? new LinearLayout.LayoutParams(0, -1, 1) :
        new LinearLayout.LayoutParams(-1, 0, 1));
      params.width = landscape ? dp(44) : -1;
      params.height = landscape ? -1 : dp(44);
      // Only Home overlays Gaia wallpaper. Apps keep their full usable area.
      params.topMargin = !landscape && overlay ? -dp(44) : 0;
      params.leftMargin = landscape && overlay ? -dp(44) : 0;
      home.setLayoutParams(params);
      if (overlay && app.homeAtBottom) home.setBackgroundColor(Color.TRANSPARENT);
      else if (overlay) home.setBackground(
        new android.graphics.drawable.GradientDrawable(
          landscape ? android.graphics.drawable.GradientDrawable.Orientation.RIGHT_LEFT :
            android.graphics.drawable.GradientDrawable.Orientation.BOTTOM_TOP,
          new int[] { Color.argb(204, 0, 0, 0), Color.TRANSPARENT }
        )
      );
      else home.setBackgroundColor(Color.rgb(18, 35, 50));
    });
  }

  @Override
  public void onConfigurationChanged(android.content.res.Configuration config) {
    super.onConfigurationChanged(config);
    setHomeSurface(app.homeVisible);
  }

  void closeBrowser() {
    webPanel.setVisibility(View.GONE);
    gaiaView.setVisibility(View.VISIBLE);
    setHomeSurface(app.homeVisible);
    syncActive();
  }

  private void back() {
    if (webPanel.getVisibility() == View.VISIBLE) {
      if (webBack) web.goBack();
      else closeBrowser();
    } else app.home(false);
  }

  @Override
  public void onBackPressed() {
    back();
  }

  private String gaiaUrl() {
    return "http://system.localhost:" + GaiaServer.PORT + "/index.html";
  }

  private void syncActive() {
    boolean browsing = webPanel != null && webPanel.getVisibility() == View.VISIBLE;
    if (gaia != null && gaia.isOpen()) gaia.setActive(resumed && !browsing);
    if (web != null && web.isOpen()) web.setActive(resumed && browsing);
  }

  private void recover(GeckoSession session, boolean crashed) {
    if (isDestroyed()) return;
    if (crashed) {
      long now = SystemClock.elapsedRealtime();
      crashCount = now - lastCrash < 30000 ? crashCount + 1 : 1;
      lastCrash = now;
      if (crashCount > 2) {
        notice.setText("Vulpes s’est arrêté. Touchez ici pour réessayer.");
        notice.setVisibility(View.VISIBLE);
        notice.setOnClickListener(v -> {
          crashCount = 0;
          recover(session, false);
        });
        return;
      }
    }
    if (!resumed) {
      if (session == gaia) recoverGaia = true;
      else recoverWeb = true;
      return;
    }
    try {
      if (!session.isOpen()) session.open(app.runtime);
      session.loadUri(session == gaia ? gaiaUrl() : address.getText().toString());
      syncActive();
      android.util.Log.i(
        "Vulpes",
        "Recovered " + (session == gaia ? "Gaia" : "browser") + " session"
      );
    } catch (Exception e) {
      notice.setText("Reprise impossible : " + e.getMessage());
      notice.setVisibility(View.VISIBLE);
    }
  }

  private final GeckoSession.ContentDelegate content = new GeckoSession.ContentDelegate() {
    public void onCrash(GeckoSession session) {
      recover(session, true);
    }

    public void onKill(GeckoSession session) {
      recover(session, false);
    }

    public void onFirstComposite(GeckoSession session) {
      if (session == gaia) notice.setVisibility(View.GONE);
    }
  };

  @Override
  public void onResume() {
    super.onResume();
    resumed = true;
    immersive();
    app.activity = this;
    if (recoverGaia) {
      recoverGaia = false;
      recover(gaia, false);
    }
    if (recoverWeb && web != null) {
      recoverWeb = false;
      recover(web, false);
    }
    syncActive();
    // Android delivers permission results before onResume. Start the sensor only
    // after GeckoView has been made active again.
    java.util.List<java.util.function.Consumer<Boolean>> grants = new java.util.ArrayList<>(
      resumedCameraPermissions
    );
    resumedCameraPermissions.clear();
    for (java.util.function.Consumer<Boolean> grant : grants) grant.accept(true);
    gaiaView.requestLayout();
    app.resumed();
  }

  @Override
  public void onPause() {
    resumed = false;
    syncActive();
    super.onPause();
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    if (intent.hasCategory(Intent.CATEGORY_HOME)) { closeBrowser(); app.home(false); }
    if ("org.vulpes_os.preview.LOCAL_NOTIFICATION".equals(intent.getAction())) closeBrowser();
    if (app.notifications != null) app.notifications.click(intent);
  }

  @Override
  public void onDestroy() {
    gaiaView.releaseSession();
    webView.releaseSession();
    if (gaia != null) {
      gaia.setContentDelegate(null);
      gaia.setNavigationDelegate(null);
      gaia.setPromptDelegate(null);
      gaia.setPermissionDelegate(null);
      if (isFinishing()) {
        gaia.close();
        app.gaiaSession = null;
      }
    }
    if (web != null) web.close();
    if (fileResult != null) {
      fileResult.complete(filePrompt.dismiss());
      fileResult = null;
    }
    for (java.util.function.Consumer<Boolean> callback : permissionResults.values())
      callback.accept(false);
    permissionResults.clear();
    for (java.util.function.Consumer<Boolean> grant : resumedCameraPermissions) grant.accept(false);
    resumedCameraPermissions.clear();
    if (app.activity == this) app.activity = null;
    super.onDestroy();
  }

  void notificationPermission(java.util.function.Consumer<Boolean> callback) {
    if (!resumed) {
      callback.accept(false);
      return;
    }
    permission(
      Build.VERSION.SDK_INT >= 33
        ? new String[] { android.Manifest.permission.POST_NOTIFICATIONS }
        : new String[0],
      callback
    );
  }

  private void finishPermission(
    String[] names,
    boolean granted,
    java.util.function.Consumer<Boolean> callback
  ) {
    if (
      granted &&
      !resumed &&
      java.util.Arrays.asList(names).contains(android.Manifest.permission.CAMERA)
    ) resumedCameraPermissions.add(callback);
    else callback.accept(granted);
  }

  private void permission(String[] names, java.util.function.Consumer<Boolean> callback) {
    boolean granted = true;
    for (String name : names)
      granted &= checkSelfPermission(name) == PackageManager.PERMISSION_GRANTED;
    if (granted) {
      finishPermission(names, true, callback);
      return;
    }
    int code = nextPermission++;
    permissionResults.put(code, callback);
    requestPermissions(names, code);
  }

  @Override
  public void onRequestPermissionsResult(int code, String[] names, int[] grants) {
    super.onRequestPermissionsResult(code, names, grants);
    java.util.function.Consumer<Boolean> callback = permissionResults.remove(code);
    if (callback != null) {
      boolean granted = grants.length > 0;
      // Approximate location is a valid choice; do not require fine location as well.
      if (
        java.util.Arrays.asList(names).contains(android.Manifest.permission.ACCESS_COARSE_LOCATION)
      ) granted =
        checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION) ==
        PackageManager.PERMISSION_GRANTED;
      else for (int grant : grants) granted &= grant == PackageManager.PERMISSION_GRANTED;
      finishPermission(names, granted, callback);
    }
  }

  @Override
  protected void onActivityResult(int code, int status, Intent intent) {
    super.onActivityResult(code, status, intent);
    if (code == 420 && fileResult != null) {
      GeckoResult<GeckoSession.PromptDelegate.PromptResponse> result = fileResult;
      fileResult = null;
      ArrayList<Uri> uris = new ArrayList<>();
      if (status == RESULT_OK && intent != null) {
        if (intent.getClipData() != null) for (
          int i = 0;
          i < intent.getClipData().getItemCount();
          i++
        ) uris.add(intent.getClipData().getItemAt(i).getUri());
        else if (intent.getData() != null) uris.add(intent.getData());
      }
      result.complete(
        uris.isEmpty() ? filePrompt.dismiss() : filePrompt.confirm(this, uris.toArray(new Uri[0]))
      );
      filePrompt = null;
    } else if (app.services != null) app.services.onResult(code, status, intent);
  }

  private final GeckoSession.PermissionDelegate permissions =
    new GeckoSession.PermissionDelegate() {
      @Override
      public void onAndroidPermissionsRequest(
        GeckoSession session,
        String[] names,
        Callback callback
      ) {
        permission(names, granted -> {
          if (granted) callback.grant();
          else callback.reject();
        });
      }

      @Override
      public void onMediaPermissionRequest(
        GeckoSession session,
        String uri,
        MediaSource[] video,
        MediaSource[] audio,
        MediaCallback callback
      ) {
        Uri origin = Uri.parse(uri);
        boolean camera =
          session == gaia &&
          "http".equals(origin.getScheme()) &&
          "camera.localhost".equals(origin.getHost()) &&
          origin.getPort() == 18765;
        if (!camera || (audio != null && audio.length > 0) || video == null || video.length == 0) {
          callback.reject();
          return;
        }
        permission(new String[] { android.Manifest.permission.CAMERA }, granted -> {
          if (granted) callback.grant(video[0], null);
          else callback.reject();
        });
      }

      @Override
      public GeckoResult<Integer> onContentPermissionRequest(
        GeckoSession session,
        ContentPermission permission
      ) {
        boolean local = session == gaia && isGaia(permission.uri);
        if (
          permission.permission == PERMISSION_DESKTOP_NOTIFICATION ||
          permission.permission == PERMISSION_GEOLOCATION
        ) {
          GeckoResult<Integer> result = new GeckoResult<>();
          Runnable ask = () -> {
            String[] names = permission.permission == PERMISSION_GEOLOCATION
              ? new String[] {
                  android.Manifest.permission.ACCESS_COARSE_LOCATION,
                  android.Manifest.permission.ACCESS_FINE_LOCATION,
                }
              : Build.VERSION.SDK_INT >= 33
                ? new String[] { android.Manifest.permission.POST_NOTIFICATIONS }
                : new String[0];
            permission(names, granted ->
              result.complete(
                granted ? ContentPermission.VALUE_ALLOW : ContentPermission.VALUE_DENY
              )
            );
          };
          new AlertDialog.Builder(MainActivity.this)
            .setTitle("Autorisation Vulpes")
            .setMessage(
              permission.uri +
                (permission.permission == PERMISSION_GEOLOCATION
                  ? "\nAccéder à votre position ?"
                  : "\nAfficher des notifications Android ?")
            )
            .setPositiveButton("Autoriser", (d, w) -> ask.run())
            .setNegativeButton("Refuser", (d, w) -> result.complete(ContentPermission.VALUE_DENY))
            .setOnCancelListener(d -> result.complete(ContentPermission.VALUE_DENY))
            .show();
          return result;
        }
        boolean allow =
          local &&
          (permission.permission == PERMISSION_PERSISTENT_STORAGE ||
            permission.permission == PERMISSION_AUTOPLAY_INAUDIBLE ||
            permission.permission == PERMISSION_AUTOPLAY_AUDIBLE);
        return GeckoResult.fromValue(
          allow ? ContentPermission.VALUE_ALLOW : ContentPermission.VALUE_DENY
        );
      }
    };
  private final GeckoSession.PromptDelegate prompts = new GeckoSession.PromptDelegate() {
    @Override
    public GeckoResult<PromptResponse> onFilePrompt(GeckoSession session, FilePrompt prompt) {
      if (fileResult != null) return GeckoResult.fromValue(prompt.dismiss());
      GeckoResult<PromptResponse> result = new GeckoResult<>();
      Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT)
        .addCategory(Intent.CATEGORY_OPENABLE)
        .setType("*/*")
        .putExtra(Intent.EXTRA_ALLOW_MULTIPLE, prompt.type == FilePrompt.Type.MULTIPLE);
      if (prompt.mimeTypes != null && prompt.mimeTypes.length > 0) pick.putExtra(
        Intent.EXTRA_MIME_TYPES,
        prompt.mimeTypes
      );
      try {
        startActivityForResult(pick, 420);
        fileResult = result;
        filePrompt = prompt;
      } catch (ActivityNotFoundException e) {
        result.complete(prompt.dismiss());
      }
      return result;
    }

    @Override
    public GeckoResult<PromptResponse> onAlertPrompt(GeckoSession s, AlertPrompt p) {
      GeckoResult<PromptResponse> result = new GeckoResult<>();
      new AlertDialog.Builder(MainActivity.this)
        .setTitle(p.title)
        .setMessage(p.message)
        .setPositiveButton("OK", (d, w) -> result.complete(p.dismiss()))
        .setOnCancelListener(d -> result.complete(p.dismiss()))
        .show();
      return result;
    }

    @Override
    public GeckoResult<PromptResponse> onChoicePrompt(GeckoSession s, ChoicePrompt p) {
      ArrayList<ChoicePrompt.Choice> choices = new ArrayList<>();
      flatten(p.choices, choices);
      String[] labels = new String[choices.size()];
      for (int i = 0; i < labels.length; i++) labels[i] = choices.get(i).label;
      GeckoResult<PromptResponse> result = new GeckoResult<>();
      new AlertDialog.Builder(MainActivity.this)
        .setTitle(p.title)
        .setItems(labels, (d, n) -> result.complete(p.confirm(choices.get(n))))
        .setOnCancelListener(d -> result.complete(p.dismiss()))
        .show();
      return result;
    }

    private void flatten(ChoicePrompt.Choice[] items, ArrayList<ChoicePrompt.Choice> out) {
      for (ChoicePrompt.Choice c : items) {
        if (c.items != null) flatten(c.items, out);
        else if (!c.disabled && !c.separator) out.add(c);
      }
    }
  };
}
