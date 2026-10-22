# SPDX-License-Identifier: MPL-2.0
"""GSM SMS transport for the Nokia RIL (3GPP TS 23.040/23.038).

Default alphabet and extension characters match Gecko's GsmPDUHelper.
No binary messages, SIM commands or national-language shift tables are accepted.
"""
import datetime
import re

GSM='@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
EXT={10:'\f',20:'^',40:'{',41:'}',47:'\\',60:'[',61:'~',62:']',64:'|',101:'€'}


def number(value):
    if not isinstance(value,str) or not re.fullmatch(r'\+?[0-9]{3,20}',value):raise ValueError('INVALID_NUMBER')
    return value


def septets(text):
    values=[]
    for char in text:
        if char in GSM and char!='\x1b':values.append(GSM.index(char))
        elif char in EXT.values():values.extend((27,next(k for k,v in EXT.items() if v==char)))
        else:return None
    return values


def pack7(values):
    packed=bytearray((len(values)*7+7)//8)
    for i,value in enumerate(values):
        bit=i*7;packed[bit//8]|=(value<<(bit%8))&255
        if bit%8>1:packed[bit//8+1]|=value>>(8-bit%8)
    return bytes(packed)


def unpack7(data,count,start=0):
    if (start+count)*7>len(data)*8:raise ValueError('TRUNCATED_SMS')
    result=[];escape=False
    for i in range(start,start+count):
        bit=i*7;value=(int.from_bytes(data[bit//8:bit//8+2],'little')>>(bit%8))&127
        if escape:result.append(EXT.get(value,'�'));escape=False
        elif value==27:escape=True
        else:result.append(GSM[value])
    if escape:raise ValueError('TRUNCATED_SMS_ESCAPE')
    return ''.join(result)


def submit(destination,text):
    number(destination)
    if not isinstance(text,str) or not text or '\x00' in text:raise ValueError('INVALID_SMS')
    values=septets(text)
    if values is not None:
        if len(values)>160:raise ValueError('SMS_TOO_LONG')
        payload=pack7(values);dcs=0;length=len(values)
    else:
        payload=text.encode('utf-16-be');dcs=8;length=len(payload)
        if length>140:raise ValueError('SMS_TOO_LONG')
    digits=destination.lstrip('+');padded=digits+('F' if len(digits)%2 else '')
    address=bytes(int(padded[i+1]+padded[i],16) for i in range(0,len(padded),2))
    # SMS-SUBMIT, no status-report request; SMSC is supplied separately by RIL.
    return (bytes((1,0,len(digits),145 if destination.startswith('+') else 129))+
            address+bytes((0,dcs,length))+payload).hex().upper()


def deliver(hexadecimal):
    if not isinstance(hexadecimal,str) or len(hexadecimal)>1024:raise ValueError('INVALID_SMS_PDU')
    try:data=bytes.fromhex(hexadecimal)
    except ValueError:raise ValueError('INVALID_SMS_PDU') from None
    pos=0
    def take(n):
        nonlocal pos
        if n<0 or pos+n>len(data):raise ValueError('TRUNCATED_SMS')
        part=data[pos:pos+n];pos+=n;return part
    smsc=take(1)[0];take(smsc)
    flags=take(1)[0]
    if flags&3:raise ValueError('UNSUPPORTED_SMS_TYPE')
    digits,toa=take(2);raw=take((digits+1)//2)
    if toa&0x70==0x50:sender=unpack7(raw,digits*4//7)
    else:
        sender=''.join(format(b&15,'x')+format(b>>4,'x') for b in raw)[:digits]
        if not sender.isdigit():raise ValueError('INVALID_SMS_SENDER')
        if toa&0x70==0x10:sender='+'+sender
    pid,dcs=take(2)
    # Reject SIM data download / class-2 / compressed payloads rather than consuming them.
    if pid or dcs not in (0,8):raise ValueError('UNSUPPORTED_SMS_ENCODING')
    stamp=take(7)
    def decimal(b):
        lo,hi=b&15,b>>4
        if lo>9 or hi>9:raise ValueError('INVALID_SMS_DATE')
        return lo*10+hi
    year,month,day,hour,minute,second=map(decimal,stamp[:6])
    quarters=decimal(stamp[6]&0xf7)*(-1 if stamp[6]&8 else 1)
    if abs(quarters)>56:raise ValueError('INVALID_SMS_DATE')
    date=datetime.datetime(2000+year,month,day,hour,minute,second,
        tzinfo=datetime.timezone(datetime.timedelta(minutes=quarters*15)))
    length=take(1)[0];payload=take((length*7+7)//8 if dcs==0 else length)
    header=0;concat=None
    if flags&64:
        if not payload:raise ValueError('TRUNCATED_SMS_HEADER')
        header=payload[0]+1
        if header>len(payload):raise ValueError('TRUNCATED_SMS_HEADER')
        cursor=1
        while cursor<header:
            if cursor+2>header:raise ValueError('TRUNCATED_SMS_HEADER')
            kind,size=payload[cursor:cursor+2];cursor+=2
            part=payload[cursor:cursor+size];cursor+=size
            if cursor>header:raise ValueError('TRUNCATED_SMS_HEADER')
            if kind==0 and size==3:concat=(part[0],part[1],part[2])
            elif kind==8 and size==4:concat=(part[0]*256+part[1],part[2],part[3])
            else:raise ValueError('UNSUPPORTED_SMS_HEADER')
        if concat and not 1<=concat[2]<=concat[1]<=10:raise ValueError('INVALID_SMS_PART')
    if dcs==0:
        skip=(header*8+6)//7
        body=unpack7(payload,length-skip,skip)
    else:body=payload[header:].decode('utf-16-be')
    return {'sender':sender,'body':body,'timestamp':round(date.timestamp()*1000),'concat':concat}
