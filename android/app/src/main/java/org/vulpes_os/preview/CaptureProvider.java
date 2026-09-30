package org.vulpes_os.preview;

import android.content.*;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.*;

/** Grants the selected camera access to one temporary output, never the profile. */
public final class CaptureProvider extends ContentProvider {

  public boolean onCreate() {
    return true;
  }

  private File file(Uri uri) throws FileNotFoundException {
    if (!"/capture.jpg".equals(uri.getPath())) throw new FileNotFoundException();
    return new File(getContext().getCacheDir(), "capture.jpg");
  }

  public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
    return ParcelFileDescriptor.open(file(uri), ParcelFileDescriptor.parseMode(mode));
  }

  public String getType(Uri uri) {
    return "image/jpeg";
  }

  public Cursor query(Uri uri, String[] columns, String selection, String[] args, String order) {
    try {
      File f = file(uri);
      if (columns == null) columns = new String[] {
        OpenableColumns.DISPLAY_NAME,
        OpenableColumns.SIZE,
      };
      MatrixCursor cursor = new MatrixCursor(columns);
      Object[] row = new Object[columns.length];
      for (int i = 0; i < columns.length; i++) row[i] = OpenableColumns.SIZE.equals(columns[i])
        ? f.length()
        : f.getName();
      cursor.addRow(row);
      return cursor;
    } catch (IOException e) {
      return null;
    }
  }

  public Uri insert(Uri uri, ContentValues values) {
    throw new UnsupportedOperationException();
  }

  public int delete(Uri uri, String selection, String[] args) {
    throw new UnsupportedOperationException();
  }

  public int update(Uri uri, ContentValues values, String selection, String[] args) {
    throw new UnsupportedOperationException();
  }
}
