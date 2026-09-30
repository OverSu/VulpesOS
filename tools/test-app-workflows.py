#!/usr/bin/env python3
"""Exercise original Gallery, Video and Calendar UI in the desktop test profile."""
import base64
import importlib.util
import json
import subprocess
import tempfile
import time
from pathlib import Path
from marionette_client import Client

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('probe', ROOT / 'tools/probe-desktop.py')
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
results = {}
stem = 'vulpes-workflow-' + str(time.time_ns())
with Client(2857) as client:
    probe.register(client)
    def ev(app, code):
        result = probe.evaluate(client, app, code)
        if 'error' in result:
            raise AssertionError(result)
        return result.get('value')
    def wait(app, code):
        for _ in range(300):
            value = ev(app, code)
            if value:
                return value
            time.sleep(.15)
        raise AssertionError((app, code))
    def click(app, selector):
        wait(app, 'return !!document.querySelector(' + json.dumps(selector) + ');')
        ev(app, 'document.querySelector(' + json.dumps(selector) + ').click();return true;')
        time.sleep(.25)
    def launch(app):
        ev('system', 'ScreenManager.turnScreenOn(true);lockScreen.unlock(true);await VulpesCompat.call("apps.launch",{manifestURL:"http://' + app + '.localhost:8765/manifest.webapp"});return true;')
        wait(app, "return document.readyState==='complete';")
    wait('system', 'return !!window.ScreenManager && !!window.lockScreen && !!window.VulpesCompat;')
    ev('system', 'ScreenManager.turnScreenOn(true);return true;')
    time.sleep(.5)
    ev('system', 'lockScreen.unlock(true);return true;')
    time.sleep(.5)
    launch('video')
    with tempfile.TemporaryDirectory(prefix='vulpes-video-') as tmp:
        file = Path(tmp) / 'test.webm'
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','testsrc2=size=320x240:rate=15','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','3','-c:v','libvpx','-b:v','180k','-c:a','libvorbis',str(file)],check=True)
        encoded = json.dumps(base64.b64encode(file.read_bytes()).decode())
    ev('video', 'const b=Uint8Array.from(atob('+encoded+'),c=>c.charCodeAt(0));await navigator.getDeviceStorage("videos").addNamed(new Blob([b],{type:"video/webm"}),'+json.dumps(stem+'.webm')+');return true;')
    wait('video', 'return [...document.querySelectorAll(".thumbnail .title")].some(e=>e.textContent.toLowerCase()==='+json.dumps(stem)+');')
    ev('video', '[...document.querySelectorAll(".thumbnail .title")].find(e=>e.textContent.toLowerCase()==='+json.dumps(stem)+').closest(".thumbnail").click();return true;')
    results['video_playback'] = wait('video','const p=document.querySelector("video");return p && !p.paused && p.currentTime>0 && p.duration>2 && !p.error;')
    results['video_seek'] = ev('video','const p=document.querySelector("video");p.pause();p.currentTime=1.5;await new Promise(r=>setTimeout(r,250));return Math.abs(p.currentTime-1.5)<.1 && !p.error;')
    click('video','#options');click('video','.single-delete-button');click('video','#confirm-ok')
    results['video_delete'] = wait('video','try{await navigator.getDeviceStorage("videos").get('+json.dumps(stem+'.webm')+');return false;}catch(e){return e.name==="NotFoundError";}')
    launch('gallery')
    ev('gallery','location.reload();return true;')
    time.sleep(1)
    wait('gallery','return document.body.classList.contains("thumbnailListView") && typeof photodb!=="undefined";')
    ev('gallery','const c=document.createElement("canvas");c.width=320;c.height=240;const x=c.getContext("2d");x.fillStyle="orange";x.fillRect(0,0,320,240);await navigator.getDeviceStorage("pictures").addNamed(await new Promise(r=>c.toBlob(r,"image/jpeg")),'+json.dumps(stem+'.jpg')+');return true;')
    selector='.thumbnailImage[data-filename="/sdcard/'+stem+'.jpg"]'
    wait('gallery','return !!document.querySelector('+json.dumps(selector)+');')
    ev('gallery','document.querySelector('+json.dumps(selector)+').closest(".thumbnail").click();return true;')
    wait('gallery','return document.body.classList.contains("fullscreenView");')
    click('gallery','#fullscreen-edit-button-tiny')
    wait('gallery','return document.body.classList.contains("editView") && !!document.querySelector("#edit-preview-area canvas");')
    wait('gallery','return !!window.imageEditor?.previewImageData?.width && !imageEditor.editing;')
    click('gallery','#edit-effect-button');click('gallery','#edit-effect-bw')
    wait('gallery','return !imageEditor.editing;')
    click('gallery','#edit-tool-apply-button')
    wait('gallery','return !document.querySelector("#edit-save-button").hidden && !document.querySelector("#edit-save-button").disabled;')
    click('gallery','#edit-save-button')
    wait('gallery','return document.body.classList.contains("fullscreenView");')
    results['gallery_edit_saved'] = wait('gallery','try{const f=await navigator.getDeviceStorage("pictures").get('+json.dumps(stem+'.edit1.jpg')+');const b=await createImageBitmap(f),c=document.createElement("canvas");c.width=b.width;c.height=b.height;const x=c.getContext("2d");x.drawImage(b,0,0);const p=x.getImageData(20,20,1,1).data;return b.width===320 && b.height===240 && Math.abs(p[0]-p[1])<3 && Math.abs(p[1]-p[2])<3;}catch(e){return false;}')
    # Leave the full-screen view before deleting its current file.
    click('gallery','#fullscreen-back-button-tiny')
    wait('gallery','return document.body.classList.contains("thumbnailListView");')
    ev('gallery','const s=navigator.getDeviceStorage("pictures");await s.delete('+json.dumps(stem+'.edit1.jpg')+');await s.delete('+json.dumps(stem+'.jpg')+');return true;')
    launch('calendar')
    ev('calendar','location.href="/index.html";return true;')
    time.sleep(.8)
    wait('calendar', 'return !!window.require && performance.getEntriesByName("fullyLoaded").length>0;')
    ev('calendar','window.workflowErrors=[];addEventListener("unhandledrejection",e=>workflowErrors.push(String(e.reason)));return true;')
    click('calendar','[data-l10n-id=new-event-link]')
    wait('calendar','return !!document.querySelector("[name=title]");')
    ev('calendar','const e=document.querySelector("[name=title]");e.value='+json.dumps(stem)+';e.dispatchEvent(new Event("input",{bubbles:true}));return true;')
    click('calendar','#modify-event-view .save')
    results['calendar_saved'] = wait('calendar','return [...document.querySelectorAll("a.event")].some(e=>e.textContent.includes('+json.dumps(stem)+'));')
    ev('calendar','[...document.querySelectorAll("a.event")].find(e=>e.textContent.includes('+json.dumps(stem)+')).click();return true;')
    wait('calendar','return document.querySelector("#event-view")?.textContent.includes('+json.dumps(stem)+');')
    time.sleep(.5)
    click('calendar','#event-view .edit')
    wait('calendar','return document.querySelector("[name=title]")?.value==='+json.dumps(stem)+';')
    time.sleep(.5)
    click('calendar','#modify-event-view .delete-record')
    results['calendar_deleted'] = wait('calendar','return location.hash.includes("/month/") && ![...document.querySelectorAll("a.event")].some(e=>e.textContent.includes('+json.dumps(stem)+'));')
    results['calendar_no_rejection'] = ev('calendar','return workflowErrors.length===0;')
    results['gallery_no_diagnostics'] = ev('gallery','return !window.__vulpesDiagnostics?.length;')
    results['calendar_no_diagnostics'] = ev('calendar','return !window.__vulpesDiagnostics?.length;')
    assert all(value is True for value in results.values()), results
(ROOT/'logs/app-workflows.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
