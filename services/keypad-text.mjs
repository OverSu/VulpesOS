// Numeric keypad composition. The caller supplies field identity and selection.
const letters = {
  '0': ' 0', '1': '.,?!@-_:;/1', '2': 'abcàâç2', '3': 'deféèêë3',
  '4': 'ghiîï4', '5': 'jkl5', '6': 'mnoôö6', '7': 'pqrs7',
  '8': 'tuvùûü8', '9': 'wxyz9', '*': '*+()[]#',
};
export class KeypadText {
  mode = 'abc';
  pending = null;
  dictionary = new Map();
  returnMode = 'abc';
  setDictionary(lines) {
    const words = [];
    for (const line of lines.split(/\r?\n/)) {
      const [word, frequency] = line.split('\t');
      const key = t9KeySequence(word || '');
      if (!key) continue;
      words.push({word,key,frequency:Number(frequency) || 0});
    }
    words.sort((a,b)=>b.frequency-a.frequency || a.word.localeCompare(b.word));
    const prefixes=new Map();
    for (const entry of words) for(let length=1;length<=entry.key.length;length++) {
      const prefix=entry.key.slice(0,length),list=prefixes.get(prefix) || [];
      if(list.length<32) {list.push(entry);prefixes.set(prefix,list);}
    }
    this.dictionary=prefixes;
  }
  formatT9(word) { return this.returnMode==='ABC' ? word.toUpperCase() : word; }
  get suggestion() { return this.pending?.t9 ? this.formatT9(this.pending.candidates[this.pending.index]?.word || '') : null; }
  setT9(enabled, previousMode=this.mode) {
    if (enabled) { this.returnMode=previousMode; this.mode='t9'; }
    else this.mode=previousMode;
    this.commit();
    return {mode:this.mode};
  }
  toggleT9() {
    return this.setT9(this.mode!=='t9',this.mode==='t9' ? this.returnMode : this.mode);
  }
  commit() { this.pending = null; }
  press(key, {field, text, start, end, numeric = false, now = Date.now()}) {
    if (numeric) { this.commit(); return /^[0-9*#+]$/.test(key) ? {text:key, replace:0} : null; }
    if (key === '#') {
      this.mode = this.mode==='t9' ? this.returnMode : {abc:'ABC', ABC:'123', '123':'abc'}[this.mode];
      this.commit(); return {mode:this.mode};
    }
    if (this.mode === 't9') return this.pressT9(key,{field,text,start,end,now});
    if (!letters[key]) { this.commit(); return null; }
    if (this.mode === '123' && key !== '*') { this.commit(); return {text:key,replace:0}; }
    const choices = this.mode === 'ABC' ? letters[key].toUpperCase() : letters[key];
    const p = this.pending;
    const cycle = p && p.field === field && p.key === key && now - p.time < 900 &&
      start === end && start === p.end && text.slice(start - p.text.length, start) === p.text;
    const index = cycle ? (p.index + 1) % choices.length : 0;
    const value = choices[index];
    this.pending = {field, key, index, text:value, time:now,
      end:(cycle ? start - p.text.length : start) + value.length};
    return {text:value, replace:cycle ? p.text.length : 0};
  }
  pressT9(key,{field,text,start,end,now}) {
    const p=this.pending;
    const continuing=p?.t9 && p.field===field && start===end && start===p.end &&
      text.slice(p.start,start)===p.text;
    if (key==='*' && continuing && p.candidates.length>1) {
      p.index=(p.index+1)%p.candidates.length;
      const value=this.formatT9(p.candidates[p.index].word);
      const replace=p.text.length;
      p.text=value;p.end=p.start+value.length;p.time=now;
      return {text:value,replace};
    }
    if (key==='0') { this.commit(); return {text:' ',replace:0}; }
    if (key==='1') { this.commit(); return {text:'.',replace:0}; }
    if (!/^[2-9]$/.test(key)) { this.commit(); return null; }
    const sequence=continuing ? p.sequence+key : key;
    const candidates=this.dictionary.get(sequence) || [];
    if (!candidates.length) {
      this.commit();
      return {text:letters[key][0],replace:0};
    }
    const base=continuing ? p.start : start;
    const value=this.formatT9(candidates[0].word);
    const replace=continuing ? p.text.length : 0;
    this.pending={t9:true,field,sequence,candidates,index:0,text:value,
      start:base,end:base+value.length,time:now};
    return {text:value,replace};
  }
}

const latinKeys=['abc','def','ghi','jkl','mno','pqrs','tuv','wxyz'];
const cyrillicKeys=['абвг','дежзё','ийкл','мноп','рсту','фхцч','шщъы','ьэюя'];
const greekKeys=['αβγ','δεζ','ηθι','κλμ','νξο','πρσ','τυφ','χψω'];
export function t9KeySequence(word) {
  let result='';
  const normalized=String(word).toLocaleLowerCase()
    .replace(/[æǽ]/g,'ae').replace(/œ/g,'oe').replace(/ł/g,'l')
    .replace(/đ/g,'d').replace(/ð/g,'d').replace(/þ/g,'t')
    .replace(/ß/g,'ss').replace(/ς/g,'σ');
  for (const original of normalized) {
    const char=original.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace('ı','i');
    const groups=/[a-z]/.test(char) ? latinKeys : /[\u0400-\u04ff]/.test(char) ? cyrillicKeys : greekKeys;
    const group=groups.findIndex(letters=>letters.includes(char));
    if (group<0) return '';
    result+=String(group+2);
  }
  return result;
}
