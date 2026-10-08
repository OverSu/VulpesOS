#!/usr/bin/env python3
"""Exercise Gaia Contacts and its SMS/dialer activities in the desktop test profile.

Creates one temporary contact; never sends a message or starts a call.
"""
import importlib.util
import json
import time
import sys
from pathlib import Path
from marionette_client import Client

spec = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('probe-desktop.py'))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
results = {}
contact_id = None
photo_name = None
name = 'Vulpes QA ' + str(time.time_ns())

with Client(2857) as client:
    client.socket.settimeout(90)
    probe.register(client)

    def ev(app, code):
        result = probe.evaluate(client, 'communications' if app == 'dialer' else app, code, '/dialer/' if app == 'dialer' else '/contacts/' if app == 'communications' else '/')
        if 'error' in result:
            raise AssertionError(result)
        return result.get('value')

    def wait(app, code):
        for _ in range(100):
            try:
                value = ev(app, code)
            except AssertionError as error:
                if 'Actor' not in str(error) or 'destroyed' not in str(error):
                    raise
                value = None
            if value:
                return value
            time.sleep(.15)
        raise TimeoutError(app + ': ' + code)

    def click(app, selector):
        print("click", app, selector, file=sys.stderr, flush=True)
        point = wait(app, 'for(const e of document.querySelectorAll(' + json.dumps(selector) + ')) {'
            'const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;'
            'if(x>0&&y>0&&x<innerWidth&&y<innerHeight&&e.contains(document.elementFromPoint(x,y)))return {x,y};}return false;')
        script = '''const done=arguments[arguments.length-1];
const root=Services.wm.getMostRecentWindow('vulpes:host').document.getElementById('system').browsingContext;
function find(b){if(b.currentWindowGlobal?.documentURI.spec.startsWith(PREFIX))return b;
for(const c of b.children){const found=find(c);if(found)return found;}}
find(root).currentWindowGlobal.getActor('VulpesProbe').sendQuery('MouseClick',POINT)
.then(()=>done(true),e=>done({error:String(e)}));'''.replace('PREFIX', json.dumps('http://' + app + '.localhost:8765/')).replace('POINT', json.dumps(point))
        clicked = client.call('WebDriver:ExecuteAsyncScript', {'script': script, 'args': [],
            'newSandbox': True, 'sandbox': 'system', 'scriptTimeout': 10000})['value']
        assert clicked is True, clicked

    def field(selector, value):
        wait('communications', 'return !!document.querySelector(' + json.dumps(selector) + ');')
        ev('communications', 'const e=document.querySelector(' + json.dumps(selector) + ');'
           'e.value=' + json.dumps(value) + ';e.dispatchEvent(new Event("input",{bubbles:true}));return true;')

    def contact():
        return ev('communications', '''const r=navigator.mozContacts.find({filterBy:['givenName'],
filterOp:'equals',filterValue:NAME});return await new Promise((ok,no)=>{
r.onsuccess=()=>ok(r.result[0]||null);r.onerror=()=>no(r.error);});'''.replace('NAME', json.dumps(name)))

    try:
        wait('system', 'return document.body?.getAttribute("ready-state")==="fullyLoaded";')
        ev('system', "ScreenManager.turnScreenOn(true);if(Service.query('locked'))await Service.request('unlock',{forcibly:true});await VulpesCompat.call('apps.launch',{manifestURL:'http://communications.localhost:8765/manifest.webapp',entryPoint:'contacts'});return true;")
        wait('communications', 'return document.readyState==="complete"&&!document.hidden;')
        ev('system', "await VulpesCompat.call('apps.launch',{manifestURL:'http://gallery.localhost:8765/manifest.webapp'});return true;")
        wait('gallery', 'return document.readyState==="complete"&&!document.hidden;')
        fixture='vulpes-contacts-qa-'+str(time.time_ns())+'.jpg'
        photo_name=ev('gallery', 'const c=document.createElement("canvas");c.width=c.height=400;'
            'const ctx=c.getContext("2d");ctx.fillStyle="#2372ae";ctx.fillRect(0,0,400,400);'
            'const blob=await new Promise(r=>c.toBlob(r,"image/jpeg"));'
            'return await VulpesCompat.call("media.request",{operation:"add",type:"pictures",name:'+json.dumps(fixture)+',blob});')
        ev('system', "await VulpesCompat.call('apps.launch',{manifestURL:'http://communications.localhost:8765/manifest.webapp',entryPoint:'contacts'});return true;")
        token = str(time.time_ns())
        ev('communications', 'setTimeout(()=>location.href=location.origin+"/contacts/index.html?qa='+token+'",0);return true;')
        wait('communications', 'return location.search==="?qa='+token+'" && document.readyState==="complete";')
        wait('communications', 'return typeof Loader!=="undefined" && !!window.Contacts && MainNavigation.currentView()==="view-contacts-list";')
        click('communications', '#add-contact-button')
        wait('communications', 'return window.MainNavigation?.currentView()==="view-contact-form" && !!document.querySelector("#number_0");')
        field('#givenName', name)
        field('#familyName', 'Élodie Test')
        field('#number_0', '5550199')
        field('#email_0', 'qa@example.invalid')
        click('communications', '#save-button')
        for _ in range(80):
            row = contact()
            if row:
                contact_id = row['id']
                break
            time.sleep(.15)
        assert contact_id
        results['create'] = row['tel'][0]['value'] == '5550199'
        item = '[data-uuid=' + json.dumps(contact_id) + ']'
        click('communications', '#search-start')
        wait('communications', "return MainNavigation.currentView()==='search-view' && !!document.querySelector('#search-contact');")
        field('#search-contact', 'elodie')
        results['search_without_accent'] = bool(wait('communications', 'return !!document.querySelector(' + json.dumps('#search-list [data-uuid="' + contact_id + '"]') + ');'))
        field('#search-contact', name + ' absent')
        results['search_no_results'] = bool(wait('communications', "return !document.querySelector('#no-result').classList.contains('hide');"))
        click('communications', '#cancel-search')
        wait('communications', "return MainNavigation.currentView()==='view-contacts-list';")
        click('communications', item)
        click('communications', '#edit-contact-button')
        wait('communications', 'return MainNavigation.currentView()==="view-contact-form";')
        click('communications', '#photo-button')
        wait('gallery', 'return !document.hidden && typeof picking!=="undefined" && picking;')
        thumb='.thumbnailImage[data-filename='+json.dumps(photo_name)+']'
        click('gallery',thumb)
        wait('gallery','return !document.querySelector("#crop-done-button").disabled;')
        click('gallery','#crop-done-button')
        wait('communications', 'return !document.hidden && getComputedStyle(document.querySelector("#thumbnail-photo")).backgroundImage!=="none";')
        field('#familyName', 'Élodie Modifiée')
        click('communications', '#save-button')
        results['edit_detail_refresh'] = bool(wait('communications', 'return document.querySelector("#contact-name-title")?.textContent.includes("Élodie Modifiée");'))
        assert contact()['familyName'] == ['Élodie Modifiée']
        results['contact_photo']=bool(ev('communications', 'const r=navigator.mozContacts.find({filterBy:["id"],filterOp:"equals",filterValue:'+json.dumps(contact_id)+'});const c=await new Promise(ok=>{r.onsuccess=()=>ok(r.result[0]);});return c.photo?.[0] instanceof Blob && c.photo[0].size>0;'))
        assert results['contact_photo']
        ev('communications', 'document.querySelector("#toggle-favorite").scrollIntoView({block:"center"});return true;')
        click('communications', '#toggle-favorite')
        results['favorite'] = bool(wait('communications', 'const r=navigator.mozContacts.find({filterBy:["id"],filterOp:"equals",filterValue:'+json.dumps(contact_id)+'});const c=await new Promise(ok=>{r.onsuccess=()=>ok(r.result[0]);});return c.category?.includes("favorite");'))
        ev('communications', 'document.querySelector("#send-sms-button-0").scrollIntoView({block:"center"});return true;')
        click('communications', '#send-sms-button-0')
        results['sms_recipient'] = bool(wait('sms', 'return !document.hidden&&window.ConversationView?.recipients?.numbers.includes("5550199");'))
        click('sms', '#messages-contact-pick-button')
        wait('communications', 'return !document.hidden&&ActivityHandler.currentlyHandling;')
        click('communications', item)
        wait('communications', 'return !!document.querySelector("[data-l10n-id=pick_destination]");')
        click('communications', '[data-l10n-id=pick_destination]')
        wait('communications', 'return !ActivityHandler.currentlyHandling;')
        results['picker_return'] = bool(wait('sms', 'return !document.hidden&&ConversationView.recipients.numbers.includes("5550199");'))
        # This activity only prefills the original dialer; do not press Call.
        ev('sms', 'window.__dialQA=new MozActivity({name:"dial",data:{type:"webtelephony/number",number:"5550199"}});return true;')
        results['dialer_prefill'] = bool(wait('dialer', 'return !document.hidden&&document.querySelector("#phone-number-view")?.value==="5550199";'))
        ev('system', "await VulpesCompat.call('apps.launch',{manifestURL:'http://communications.localhost:8765/manifest.webapp',entryPoint:'contacts'});return true;")
        wait('communications', 'return !document.hidden;')
        click('communications', item)
        click('communications', '#edit-contact-button')
        wait('communications', 'return MainNavigation.currentView()==="view-contact-form";')
        ev('communications', 'document.querySelector("#delete-contact").scrollIntoView({block:"center"});return true;')
        click('communications', '#delete-contact')
        click('communications', '#confirmation-message button[data-l10n-id=cancel]')
        results['delete_cancel'] = contact() is not None
        wait('communications', 'return document.querySelector("#confirmation-message").classList.contains("hide");')
        click('communications', '#delete-contact')
        click('communications', '#confirmation-message button[data-l10n-id=delete]')
        for _ in range(100):
            if contact() is None:
                results['delete_confirm'] = True
                results['temporary_contact_removed'] = True
                contact_id = None
                break
            time.sleep(.15)
        assert results.get('delete_confirm')
        results['passed'] = all(results.values())
    finally:
        try:
            if contact_id:
                # Return to the address book before removing only our temporary entry.
                ev('system', "await VulpesCompat.call('apps.launch',{manifestURL:'http://communications.localhost:8765/manifest.webapp',entryPoint:'contacts'});return true;")
                ev('communications', 'const r=navigator.mozContacts.remove(' + json.dumps(contact_id) + ');await new Promise((ok,no)=>{r.onsuccess=ok;r.onerror=()=>no(r.error);});return true;')
                results['temporary_contact_removed'] = contact() is None
        except Exception as error:
            results['cleanup_error'] = str(error)
            results['temporary_contact_id'] = contact_id
        finally:
            if photo_name:
                try:
                    ev('gallery','await VulpesCompat.call("media.request",{operation:"delete",type:"pictures",name:'+json.dumps(photo_name)+'});return true;')
                    results['temporary_photo_removed']=True
                except Exception as error:
                    results['photo_cleanup_error']=str(error)
                    results['temporary_photo_name']=photo_name
            print(json.dumps(results, indent=2, ensure_ascii=False))

if not results.get('passed') or results.get('cleanup_error') or results.get('photo_cleanup_error'):
    raise SystemExit('Contacts qualification failed; see the report above.')
