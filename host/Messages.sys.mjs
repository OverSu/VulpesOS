// Desktop message store. Radio operations fail explicitly; no synthetic SMS.
export class Messages {
  constructor(storage, radio = null, notify = () => {}, radioStatus = null) {
    this.storage = storage;
    this.radio = radio;
    this.notify = notify;
    this.radioStatus = radioStatus;
    this.queue = Promise.resolve();
  }
  receive(incoming) {
    const work = this.queue.then(async()=>{
      const records=(await this.storage.run('vulpes-private-messages','get',['records'])).value || [];
      const existing=records.find(m=>m.receipt===incoming.receipt);
      if (existing) return existing;
      const id=Math.max(Date.now(),...records.map(m=>Number(m.id)+1 || 0));
      const record={id,threadId:records.find(m=>(m.sender||m.receiver)===incoming.sender)?.threadId || id+1,
        receipt:incoming.receipt,type:'sms',sender:incoming.sender,receiver:null,
        body:incoming.body,timestamp:incoming.timestamp,delivery:'received',read:false};
      records.push(record);
      await this.storage.run('vulpes-private-messages','put',[records,'records']);
      return record;
    });
    this.queue=work.catch(()=>{});
    return work;
  }
  refreshOutgoing() {
    if (!this.radioStatus) return Promise.resolve();
    const work=this.queue.then(async()=>{
      const records=(await this.storage.run('vulpes-private-messages','get',['records'])).value || [];
      for (const message of records.filter(m=>m.delivery==='sending' && m.radioPath)) {
        const result=await this.radioStatus(message.radioPath);
        if (!['sent','failed'].includes(result.state)) continue;
        message.delivery=result.state==='sent'?'sent':'error';
        message.deliveryStatus=result.state==='sent'?'not-applicable':'error';
        await this.storage.run('vulpes-private-messages','put',[records,'records']);
        this.notify(result.state,structuredClone(message));
      }
    });
    this.queue=work.catch(()=>{});
    return work;
  }
  request(app, params) {
    const work=this.queue.then(()=>this.perform(app,params));
    this.queue=work.catch(()=>{});
    return work;
  }
  async perform(app, { operation, args = [] }) {
    if (!app.manifest.permissions?.sms) throw new Error('PERMISSION_DENIED');
    const records =
      (await this.storage.run('vulpes-private-messages', 'get', ['records'])).value || [];
    // Gaia's Threads registry coerces identifiers to numbers. Older adapter
    // records used modem paths/phone numbers and became NaN in that registry.
    let nextId=records.reduce((n,m)=>Math.max(n,Number.isSafeInteger(m.id)?m.id+1:0),Date.now());
    const migratedThreads=new Map();
    let migrated=false;
    for(const message of records) {
      if(!Number.isSafeInteger(message.id)) {message.id=nextId++;migrated=true;}
      if(!Number.isSafeInteger(message.threadId)) {
        const old=message.threadId;
        if(!migratedThreads.has(old)) migratedThreads.set(old,nextId++);
        message.threadId=migratedThreads.get(old);migrated=true;
      }
    }
    if(migrated) await this.storage.run('vulpes-private-messages','put',[records,'records']);
    if (operation === 'send' && this.radio) {
      const recipients = Array.isArray(args[0]) ? args[0] : [args[0]];
      if (recipients.length !== 1) throw new Error('MULTIPLE_RECIPIENTS_UNSUPPORTED');
      const recipient = recipients[0];
      const body = args[1];
      const timestamp = Date.now();
      const record = {
        id: nextId++,
        threadId: records.find(m=>(m.receiver || m.sender)===recipient)?.threadId || nextId++,
        type: 'sms',
        sender: null,
        receiver: recipient,
        body,
        timestamp,
        delivery: 'sending',
        deliveryStatus: 'pending',
        read: true,
      };
      records.push(record);
      await this.storage.run('vulpes-private-messages', 'put', [records, 'records']);
      this.notify('sending', structuredClone(record));
      try {
        const submitted = await this.radio({ number: recipient, body });
        if (submitted?.state === 'pending') {
          record.radioPath = submitted.path;
          await this.storage.run('vulpes-private-messages', 'put', [records, 'records']);
          return record;
        }
        record.delivery = 'sent';
        record.deliveryStatus = 'not-applicable';
      } catch (error) {
        record.delivery = 'error';
        record.deliveryStatus = 'error';
        record.error = error.message;
        await this.storage.run('vulpes-private-messages', 'put', [records, 'records']);
        this.notify('failed', structuredClone(record));
        throw error;
      }
      await this.storage.run('vulpes-private-messages', 'put', [records, 'records']);
      this.notify('sent', structuredClone(record));
      return record;
    }
    if (['send', 'sendMMS', 'retrieveMMS', 'getSmscAddress', 'setSmscAddress'].includes(operation))
      throw new Error('RadioDisabledError');
    if (operation === 'getThreads') {
      const threads = new Map();
      for (const message of records) {
        const previous = threads.get(message.threadId);
        if (!previous || message.timestamp > previous.timestamp)
          threads.set(message.threadId, {
            id: message.threadId,
            body: message.body,
            timestamp: message.timestamp,
            participants: [message.sender || message.receiver],
            unreadCount: records.filter((m) => m.threadId === message.threadId && !m.read).length,
            lastMessageType: message.type,
          });
      }
      return [...threads.values()].sort((a, b) => b.timestamp - a.timestamp);
    }
    if (operation === 'getMessages')
      return records
        .filter((m) => {
          const filter = args[0] || {};
          return (filter.threadId === undefined || m.threadId === filter.threadId) &&
            (filter.read === undefined || !!m.read === filter.read) &&
            (filter.delivery === undefined || m.delivery === filter.delivery) &&
            (filter.startDate == null || m.timestamp >= new Date(filter.startDate).getTime()) &&
            (filter.endDate == null || m.timestamp <= new Date(filter.endDate).getTime()) &&
            (!filter.numbers?.length || filter.numbers.some(number =>
              number === m.sender || number === m.receiver || m.receivers?.includes(number)));
        })
        .sort((a, b) => (a.timestamp - b.timestamp) * (args[1] ? -1 : 1));
    if (operation === 'getMessage') {
      const message = records.find((m) => m.id === args[0]);
      if (!message) throw new Error('NotFoundError');
      return message;
    }
    if (operation === 'getSegmentInfoForText') {
      const text = String(args[0]);
      const basic =
        '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
      const extra = '\f^{}\\[~]|€';
      let length = 0,
        unicode = false;
      for (const c of text) {
        if (basic.includes(c)) length++;
        else if (extra.includes(c)) length += 2;
        else {
          unicode = true;
          break;
        }
      }
      if (unicode) length = text.length;
      const single = unicode ? 70 : 160,
        multiple = unicode ? 67 : 153;
      const charsPerSegment = length > single ? multiple : single,
        segments = Math.max(1, Math.ceil(length / charsPerSegment));
      return {
        segments,
        charsPerSegment,
        charsAvailableInLastSegment: segments * charsPerSegment - length,
      };
    }
    if (operation === 'delete') {
      const ids = Array.isArray(args[0]) ? args[0] : [args[0]],
        found = ids.map((id) => records.some((m) => m.id === id));
      await this.storage.run('vulpes-private-messages', 'put', [
        records.filter((m) => !ids.includes(m.id)),
        'records',
      ]);
      return Array.isArray(args[0]) ? found : found[0];
    }
    if (operation === 'markMessageRead') {
      const m = records.find((m) => m.id === args[0]);
      if (!m) throw new Error('NotFoundError');
      m.read = !!args[1];
      await this.storage.run('vulpes-private-messages', 'put', [records, 'records']);
      return m.read;
    }
    throw new Error('METHOD_NOT_SUPPORTED');
  }
}
