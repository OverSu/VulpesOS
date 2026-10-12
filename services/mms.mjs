// SPDX-License-Identifier: MPL-2.0
// JSON transport for Gaia attachments; blobs are encoded at the app boundary.
export const MMS_MAX_BYTES = 600 * 1024;
export function mmsPayload(message) {
  if (!message || !Array.isArray(message.receivers) || !message.receivers.length || message.receivers.length>10 ||
      message.receivers.some(n=>typeof n!=='string' || !/^\+?[0-9]{3,20}$/.test(n))) throw Error('INVALID_NUMBER');
  const parts=[];
  if(message.smil) parts.push({id:'smil.xml',type:'application/smil',data:utf8Base64(message.smil)});
  for(const [i,a] of (message.attachments || []).entries()) {
    const content=a.content;
    if(!content?.__vulpesBlobV1 || typeof content.base64!=='string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(content.base64)) throw Error('INVALID_MMS');
    parts.push({id:a.location || a.id?.replace(/[<>]/g,'') || 'attachment-'+i,type:content.type,data:content.base64});
  }
  if(!parts.length || parts.length>20 || parts.reduce((n,p)=>n+Math.floor(p.data.length*3/4),0)>MMS_MAX_BYTES) throw Error('MMS_TOO_LARGE');
  return {recipients:message.receivers,subject:message.subject || '',parts};
}
function utf8Base64(text) {const bytes=new TextEncoder().encode(text);let s='';for(const byte of bytes)s+=String.fromCharCode(byte);return btoa(s);}
export function receivedMms(row) {
  let smil='',body='';const attachments=[];
  for(const part of row.parts || []) {
    if(['application/smil','text/plain'].includes(part.type)) {
      const text=new TextDecoder().decode(Uint8Array.from(atob(part.data),c=>c.charCodeAt(0)));
      if(part.type==='application/smil') {smil=text;continue;}
      body+=text;
    }
    attachments.push({id:part.id,location:part.id,content:{__vulpesBlobV1:true,type:part.type,base64:part.data}});
  }
  return {...row,body,smil,attachments,timestamp:row.timestamp || Date.now()};
}
