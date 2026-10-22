// SPDX-License-Identifier: MPL-2.0
// Public radio state excludes subscriber identifiers, cell location and raw parcels.
export function radioState(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).map((slot, index) => {
    if (!slot || slot.slot !== index || slot.available !== true)
      return {slot:index, available:false, radioState:'unknown'};
    const state = {
      slot:index, available:true,
      radioState:['enabled','disabled','unavailable'].includes(slot.radioState) ? slot.radioState : 'unknown',
      signal:Number.isFinite(slot.signal) && slot.signal>=0 && slot.signal<=100 ? slot.signal : null,
      operator:{longName:String(slot.operator?.longName || '').slice(0,100),
        shortName:String(slot.operator?.shortName || '').slice(0,100)},
    };
    if (typeof slot.sim?.present === 'boolean') state.sim = {
      present:slot.sim.present,
      cardState:['absent','ready','pinRequired','pukRequired','networkLocked'].includes(slot.sim.cardState)
        ? slot.sim.cardState : 'unknown',
    };
    for (const kind of ['voice','data']) {
      const info=slot[kind] || {};
      state[kind]={state:['notSearching','registered','searching','denied'].includes(info.state) ? info.state : 'unknown',
        connected:info.connected === true, roaming:info.roaming === true,
        emergencyCallsOnly:info.emergencyCallsOnly === true,
        type:['gprs','edge','umts','is95a','is95b','1xrtt','evdo0','evdoa','hsdpa','hsupa','hspa','evdob','ehrpd','lte','hspa+','gsm'].includes(info.type) ? info.type : null};
    }
    return state;
  });
}
