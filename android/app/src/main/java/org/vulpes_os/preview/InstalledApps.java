package org.vulpes_os.preview;

import android.content.Context;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import org.json.*;

final class InstalledApps {
  private final File root;
  private final Map<String,JSONObject> items = new HashMap<>();
  InstalledApps(Context context) throws Exception {
    root=new File(context.getFilesDir(),"installed-apps");root.mkdirs();
    File[] files=root.listFiles((d,n)->n.matches("user-[a-f0-9]{24}\\.json"));
    if(files!=null)for(File file:files){JSONObject item=new JSONObject(new String(Files.readAllBytes(file.toPath()),StandardCharsets.UTF_8));items.put(item.getString("id"),item);}
  }
  static boolean valid(String id){return id!=null && id.matches("user-[a-f0-9]{24}");}
  private JSONObject record(JSONObject item) throws Exception {
    String id=item.getString("id"),origin="http://"+id+".localhost:"+GaiaServer.PORT;
    JSONObject manifest=new JSONObject(item.getJSONObject("manifest").toString());manifest.put("permissions",new JSONObject());manifest.put("type","web");
    return new JSONObject().put("id",id).put("origin",origin).put("manifestURL",origin+"/manifest.webapp").put("manifest",manifest).put("removable",true).put("installed",true);
  }
  synchronized JSONArray list() throws Exception {JSONArray result=new JSONArray();for(JSONObject item:items.values())result.put(record(item));return result;}
  synchronized void save(JSONObject item) throws Exception {
    String id=item.getString("id");if(!valid(id) || !item.has("files"))throw new IOException("INVALID_PACKAGE");
    byte[] data=item.toString().getBytes(StandardCharsets.UTF_8);if(data.length>70*1024*1024)throw new IOException("PACKAGE_TOO_LARGE");
    File stage=new File(root,id+".tmp");try(FileOutputStream out=new FileOutputStream(stage)){out.write(data);out.getFD().sync();}
    Files.move(stage.toPath(),new File(root,id+".json").toPath(),StandardCopyOption.REPLACE_EXISTING);items.put(id,item);
  }
  synchronized void remove(String id) throws Exception {if(!valid(id))throw new IOException("NOT_REMOVABLE");Files.deleteIfExists(new File(root,id+".json").toPath());items.remove(id);}
  synchronized byte[] read(String id,String path) throws Exception {
    JSONObject item=items.get(id);if(item==null)return null;
    if(path.equals("manifest.webapp"))return record(item).getJSONObject("manifest").toString().getBytes(StandardCharsets.UTF_8);
    String data=item.getJSONObject("files").optString(path,null);return data==null?null:android.util.Base64.decode(data,android.util.Base64.DEFAULT);
  }
}
