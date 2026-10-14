// Android-owned data stays in its provider; Gaia keeps its local data separately.
(() => {
  const app = location.hostname.split('.')[0];
  const fr = () => (document.documentElement.lang || navigator.language).startsWith('fr');
  const text = (f,e) => fr() ? f : e;
  const call = params => VulpesCompat.call('android.personal', params);
  const notice = message => window.VulpesGaiaUI?.notice(message);
  const readOnly = () => notice(text('Ces données appartiennent à Android. Modifiez-les dans l’application Android.',
    'Android owns these records. Edit them in the Android app.'));
  const failure = () => notice(text('Accès aux données Android indisponible. Vérifiez les autorisations dans Paramètres.',
    'Android data is unavailable. Check permissions in Settings.'));
  let dirty = false;
  let selectedContact;
  const pendingCallChanges = new Set();
  function refreshCallLog() {
    if (document.hidden || !window.CallLog?.sticky) return;
    if (pendingCallChanges.has('calls')) {
      CallLog.callLogContainer.textContent = '';
      CallLog.render();
    } else if (pendingCallChanges.has('contacts')) {
      CallLog._contactCache = false;
      CallLog.updateListWithContactInfo('update');
    }
    pendingCallChanges.clear();
  }
  if(app==='communications' && location.pathname.startsWith('/contacts')) {
    // Gaia's first-paint HTML cache must not retain Android names after revocation.
    localStorage.removeItem('firstChunk');
    document.addEventListener('click',event=>{
      const row=event.target.closest?.('[data-uuid]');
      if(row) selectedContact=row.dataset.uuid;
    },true);
    let cache;
    Object.defineProperty(window,'Cache',{configurable:true,get:()=>cache,set:value=>{
      cache=value;
      Object.defineProperties(cache,{
        enabled:{get:()=>false},active:{get:()=>false},firstChunk:{set:()=>{}}
      });
      cache.apply=()=>Promise.reject();
    }});
  }
  function canRefresh() {
    if (document.hidden) return false;
    if (app === 'sms') return window.Navigation?.isCurrentPanel('thread-list');
    if (location.pathname.startsWith('/contacts')) return window.MainNavigation?.currentView() === 'view-contacts-list';
    return false;
  }
  let refreshingMessages = false;
  async function refreshMessages() {
    const view=window.ConversationView, id=view?.activeThread?.id;
    if(refreshingMessages || !(id < 0) || document.hidden || !window.Navigation?.isCurrentPanel('thread'))return;
    refreshingMessages=true;
    try {
      const rows=await VulpesCompat.call('messages.request',{operation:'getMessages',args:[{threadId:id}]});
      if(view.activeThread?.id!==id || document.hidden)return;
      const ids=new Set(rows.map(row=>String(row.id)));
      for(const node of document.querySelectorAll('[data-message-id]')) {
        if(Number(node.dataset.messageId)<0 && !ids.has(node.dataset.messageId))view.removeMessageDOM(node);
      }
      for(const row of rows) {
        const key=JSON.stringify(row),old=document.getElementById('message-'+row.id);
        if(old?.dataset.androidRecord===key)continue;
        const message={...row,timestamp:new Date(row.timestamp)};
        window.Threads?.registerMessage(message);
        await view.appendMessage(message,false);
        const node=document.getElementById('message-'+row.id);if(node)node.dataset.androidRecord=key;
      }
      dirty=false;
    } catch(error){failure();}finally{refreshingMessages=false;}
  }
  function refresh() {
    if (app === 'communications' && location.pathname.startsWith('/dialer')) {
      refreshCallLog();
      return;
    }
    if (dirty && selectedContact && !document.hidden && window.MainNavigation?.currentView()==='view-contact-details') {
      dirty = false;
      const id = selectedContact;
      VulpesCompat.call('contacts.request',{operation:'find',options:{filterBy:['id'],filterOp:'equals',filterValue:id}})
        .then(rows=>{if(rows.length)Contacts.updateContactDetail(id);else Contacts.goBack();}).catch(failure);
      return;
    }
    if(dirty && app==='sms')refreshMessages();
    if (!dirty || !canRefresh()) return;
    dirty = false;
    if(app==='sms' && window.InboxView?.container && !InboxView.inEditMode) InboxView.renderThreads();
    else if(window.contacts?.List?.load) contacts.List.load(undefined,true);
  }
  addEventListener('visibilitychange', refresh);
  addEventListener('hashchange', refresh);
  addEventListener('transitionend', refresh);
  addEventListener('vulpes-service-event', ({detail}) => {
    if (detail.type !== 'android-data-changed') return;
    if (app === 'communications' && location.pathname.startsWith('/dialer')) {
      pendingCallChanges.add(detail.data.kind);
      refreshCallLog();
      return;
    }
    dirty = true;
    refresh();
  });

  // Keep Gaia's call grouping/rendering while reading the current Android log.
  if (app === 'communications' && location.pathname.startsWith('/dialer')) {
    let value;
    Object.defineProperty(window, 'CallLogDBManager', {configurable:true,
      get:()=>value, set:db=>{
        value=db;
        const original = Object.fromEntries(['getGroupList','getGroup','getGroupAtPosition'].map(k=>[k,db[k].bind(db)]));
        const groups = async () => {
          const rows = await call({operation:'page',kind:'calls'});
          const list = new Map();
          for (const row of rows) {
            const recent = {date:row.date,number:row.number || '',type:row.type===2 ? 'dialing':'incoming',
              status:row.type===1 ? 'connected':null};
            const id=db._getGroupId(recent), key=JSON.stringify(id);
            if(!list.has(key)) list.set(key,{id,number:recent.number,serviceId:0,lastEntryDate:row.date,retryCount:0,calls:[]});
            const g=list.get(key);g.lastEntryDate=Math.max(g.lastEntryDate,row.date);g.retryCount++;
            g.calls.push({date:row.date,duration:row.duration*1000});
          }
          return [...list.values()].map(g=>{g.calls.sort((a,b)=>b.date-a.date);return db._getGroupObject(g);});
        };
        let nativeCalls=false;
        const active=async()=> (nativeCalls=!!(await call({operation:'status',kind:'calls'})).calls);
        db.getGroupList=async(callback,sortedBy,prev,cursor,limit)=>{
          try {
            if(!await active()) return original.getGroupList(callback,sortedBy,prev,cursor,limit);
            // Native groups do not live in Gaia's IndexedDB contact cache.
            if(window.CallLog)CallLog._contactCache=false;
            let list=(await groups()).sort((a,b)=>(a.lastEntryDate-b.lastEntryDate)*(prev?-1:1));
            if(limit>0)list=list.slice(0,limit);
            if(!cursor)return callback(list);
            let index=0;
            const next=()=>queueMicrotask(()=>callback({value:list[index++] || null,continue:next}));next();
          } catch(error) { failure(); callback(cursor?{value:null}:[]); }
        };
        db.getGroup=async(number,date,type,status)=>{
          if(!await active())return original.getGroup(number,date,type,status);
          const key=db._getGroupId({number,date,type,status}).join('-');
          const found=(await groups()).find(g=>g.id===key);
          if(!found)throw Error('NotFoundError');return found;
        };
        db.getGroupAtPosition=async(position,sortedBy,prev,type,callback)=>{
          if(!await active())return original.getGroupAtPosition(position,sortedBy,prev,type,callback);
          try {const list=(await groups()).filter(g=>!type||g.type===type).sort((a,b)=>(a.lastEntryDate-b.lastEntryDate)*(prev?-1:1));callback(list[position-1]||null);}
          catch(error){failure();callback(null);}
        };
        document.addEventListener('click', event=>{
          if(!nativeCalls || !event.target.closest?.('#call-log-icon-edit'))return;
          // Editing Android logs is intentionally delegated in this first integration.
          event.preventDefault();event.stopImmediatePropagation();readOnly();
          call({operation:'open',kind:'calls'}).catch(failure);
        },true);
      }});
  }
  if(app==='communications' && location.pathname.startsWith('/contacts')) {
    const timer=setInterval(()=>{
      if(!window.Contacts?.showForm)return;
      clearInterval(timer);
      const original=Contacts.showForm;
      Contacts.showForm=function(edit,contact) {
        if(edit && String(contact?.id).startsWith('android:')) {
          selectedContact=contact.id;
          call({operation:'open',kind:'contacts',id:contact.id.slice(8)}).catch(failure);
          return;
        }
        return original.apply(this,arguments);
      };
    },100);
    addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }
  function initialize() {
    if (app !== 'settings') return;
    const root=document.querySelector('#root > div');
    if(!root || document.querySelector(".vulpes-android-data"))return;
    const header=document.createElement('header');header.className='vulpes-android-data';
    const title=document.createElement('h2');title.textContent=text('Données Android','Android data');header.append(title);
    const list=document.createElement('ul');list.className='vulpes-android-data';
    const hint=document.createElement('p');hint.style.cssText='margin:1rem 1.5rem;font-size:1.4rem;line-height:1.5';
    hint.textContent=text('Lecture des contacts, SMS (hors MMS) et appels Android. Envoi, modification et suppression dans Android. Les contacts créés dans Gaia restent locaux.',
      'Read Android contacts, SMS (not MMS) and calls. Send, edit and delete in Android. Contacts created in Gaia stay local.');
    root.append(header,hint,list);
    for(const [kind,french,english] of [['contacts','Contacts','Contacts'],['sms','SMS','SMS'],['calls','Journal d’appels','Call history']]) {
      const li=document.createElement('li'),button=document.createElement('button');
      li.append(button);list.append(li);
      let enabled=false;
      const update=state=>{enabled=state[kind];button.textContent=text(french,english)+' — '+(enabled?text('Déconnecter','Disconnect'):text('Autoriser la lecture','Allow reading'));};
      call({operation:'status'}).then(update).catch(failure);
      button.onclick=async()=>{
        button.disabled=true;
        try {
          const disconnect=enabled;
          const state=await call({operation:disconnect?'disconnect':'permission',kind});update(state);
          if(!disconnect && !state[kind])notice(text('Autorisation refusée ou restreinte par Android. L’application Android reste disponible.',
            'Permission denied or restricted by Android. Your Android app is still available.'));
        } catch(error){failure();} finally{button.disabled=false;}
      };
    }
  }
  if(app==='settings') new MutationObserver(initialize).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
