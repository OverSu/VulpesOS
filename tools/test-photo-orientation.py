#!/usr/bin/env python3
"""Compare Gaia JPEG metadata with the real Gecko decoder for all EXIF orientations."""
import base64
import importlib.util
import io
import json
from pathlib import Path
from PIL import Image
from marionette_client import Client
spec=importlib.util.spec_from_file_location('probe',Path(__file__).with_name('probe-desktop.py'))
probe=importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
results=[]
with Client(2857) as c:
    probe.register(c)
    loaded=probe.evaluate(c,'system',"""for(const path of ['blobview.js','media/jpeg_metadata_parser.js','media/image_size.js']) {
        await new Promise((ok,fail)=>{const s=document.createElement('script');s.src='/shared/js/'+path;s.onload=ok;s.onerror=fail;document.head.append(s);});
    }return true;""")
    assert loaded.get('value') is True,loaded
    for orientation in range(1,9):
        image=Image.new('RGB',(80,40),'red');exif=image.getexif();exif[274]=orientation
        out=io.BytesIO();image.save(out,'JPEG',exif=exif)
        url='data:image/jpeg;base64,'+base64.b64encode(out.getvalue()).decode()
        value=probe.evaluate(c,'system',f"""const blob=await (await fetch({json.dumps(url)})).blob();
            const meta=await new Promise((ok,fail)=>getImageSize(blob,ok,fail));
            const img=new Image();img.src=URL.createObjectURL(blob);try {{await img.decode();
            return {{width:meta.width,height:meta.height,rotation:meta.rotation || 0,mirrored:!!meta.mirrored,
              decodedWidth:img.naturalWidth,decodedHeight:img.naturalHeight}};
            }}finally{{URL.revokeObjectURL(img.src);}}""")
        row=value['value'];row['exif']=orientation
        assert row['width']==row['decodedWidth'] and row['height']==row['decodedHeight'],row
        assert row['rotation']==0 and row['mirrored'] is False,row
        results.append(row)
print(json.dumps(results,indent=2))
