package org.vulpes_os.preview;

import android.content.Context;
import android.webkit.MimeTypeMap;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.zip.*;

/** Read-only APK assets, loopback only. Never serves profile data or native RPC. */
final class GaiaServer implements Closeable {

  static final int PORT = 18765;
  final InstalledApps installed;
  private final ZipFile zip;
  private final ServerSocket socket;
  private final ExecutorService workers = Executors.newFixedThreadPool(4);

  GaiaServer(Context context) throws IOException {
    try {installed=new InstalledApps(context);}catch(Exception e){throw new IOException(e);}
    File archive = new File(context.getCacheDir(), "gaia.zip");
    // Atomic refresh on every process start; the APK is the source of truth.
    File temp = new File(context.getCacheDir(), "gaia.zip.tmp");
    try (
      InputStream in = context.getAssets().open("gaia.zip");
      OutputStream out = new FileOutputStream(temp)
    ) {
      copy(in, out);
    }
    Files.move(temp.toPath(), archive.toPath(), StandardCopyOption.REPLACE_EXISTING);
    zip = new ZipFile(archive);
    socket = new ServerSocket();
    socket.setReuseAddress(true);
    socket.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), PORT));
    Thread accept = new Thread(
      () -> {
        while (!socket.isClosed()) try {
          Socket client = socket.accept();
          workers.submit(() -> serve(client));
        } catch (IOException e) {
          if (!socket.isClosed()) android.util.Log.e("Vulpes", "HTTP accept", e);
        }
      },
      "Vulpes-assets"
    );
    accept.setDaemon(true);
    accept.start();
  }

  private static void copy(InputStream in, OutputStream out) throws IOException {
    byte[] buf = new byte[32768];
    int n;
    while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
  }

  private static String line(InputStream in) throws IOException {
    ByteArrayOutputStream b = new ByteArrayOutputStream();
    int c;
    while ((c = in.read()) != -1 && c != '\n') {
      if (b.size() > 8192) throw new IOException("Header too long");
      if (c != '\r') b.write(c);
    }
    return b.toString("UTF-8");
  }

  private void serve(Socket client) {
    try (Socket c = client) {
      c.setSoTimeout(5000);
      InputStream in = c.getInputStream();
      OutputStream out = c.getOutputStream();
      String[] start = line(in).split(" ");
      String host = "",
        origin = "";
      int total = 0;
      for (String h; (h = line(in)).length() > 0; ) {
        total += h.length();
        if (total > 32768) throw new IOException("Headers too large");
        int i = h.indexOf(':');
        if (i > 0) {
          String key = h.substring(0, i);
          String value = h.substring(i + 1).trim();
          if (key.equalsIgnoreCase("Host")) host = value.toLowerCase(Locale.ROOT);
          if (key.equalsIgnoreCase("Origin")) origin = value;
        }
      }
      if (
        start.length < 2 ||
        !start[0].equals("GET") ||
        !host.matches("[a-z0-9_-]+\\.localhost:" + PORT)
      ) {
        error(out, 403);
        return;
      }
      String app = host.substring(0, host.indexOf('.'));
      if (app.equals("theme")) app = "default_theme";
      if (!InstalledApps.valid(app) && zip.getEntry(app + "/manifest.webapp") == null) {
        error(out, 404);
        return;
      }
      String path = URLDecoder.decode(start[1].split("\\?", 2)[0].replace("+", "%2B"), "UTF-8");
      if (
        !path.startsWith("/") ||
        path.contains("\\") ||
        path.indexOf('\0') >= 0 ||
        Arrays.asList(path.split("/")).contains("..")
      ) {
        error(out, 400);
        return;
      }
      if (path.endsWith("/")) path += "index.html";
      if (InstalledApps.valid(app)) {
        byte[] body=installed.read(app,path.substring(1));
        if(body==null){error(out,404);return;}
        String ext=path.substring(path.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
        String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        if(ext.equals("js"))mime="text/javascript";
        if(ext.equals("webapp"))mime="application/json";
        if(mime==null)mime="application/octet-stream";
        out.write(("HTTP/1.1 200 OK\r\nContent-Type: "+mime+"\r\nContent-Length: "+body.length+"\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-store\r\nAccess-Control-Allow-Origin: *\r\nContent-Security-Policy: object-src 'none'; frame-ancestors http://*.localhost:"+PORT+"\r\n\r\n").getBytes(StandardCharsets.US_ASCII));out.write(body);return;
      }
      String key = path.startsWith("/_vulpes/") ? path.substring(1) : app + path;
      ZipEntry entry = zip.getEntry(key);
      if (entry == null && path.startsWith("/shared/")) entry = zip.getEntry(
        "_shared/" + path.substring(8)
      );
      if (entry == null || entry.isDirectory()) {
        error(out, 404);
        return;
      }
      String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
      String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
      if (ext.equals("js") || ext.equals("mjs")) mime = "text/javascript";
      if (ext.equals("webapp") || ext.equals("json")) mime = "application/json";
      if (ext.equals("properties")) mime = "text/plain";
      if (mime == null) mime = "application/octet-stream";
      String headers =
        "HTTP/1.1 200 OK\r\nContent-Type: " +
        mime +
        "\r\nContent-Length: " +
        entry.getSize() +
        "\r\nConnection: close\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-cache\r\nContent-Security-Policy: script-src 'self' 'unsafe-eval'; object-src 'none'; base-uri 'self'; worker-src 'self' blob:; frame-ancestors http://*.localhost:" +
        PORT +
        "\r\n";
      if (
        origin.matches("http://[a-z0-9_-]+\\.localhost:" + PORT) &&
        zip.getEntry(new URI(origin).getHost().split("\\.")[0] + "/manifest.webapp") != null
      ) headers += "Access-Control-Allow-Origin: " + origin + "\r\nVary: Origin\r\n";
      out.write((headers + "\r\n").getBytes(StandardCharsets.US_ASCII));
      try (InputStream body = zip.getInputStream(entry)) {
        copy(body, out);
      }
    } catch (Exception e) {
      android.util.Log.d("Vulpes", "HTTP closed: " + e.getMessage());
    }
  }

  private static void error(OutputStream out, int code) throws IOException {
    out.write(
      ("HTTP/1.1 " + code + " Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").getBytes(
        StandardCharsets.US_ASCII
      )
    );
  }

  public void close() throws IOException {
    socket.close();
    workers.shutdownNow();
    zip.close();
  }
}
