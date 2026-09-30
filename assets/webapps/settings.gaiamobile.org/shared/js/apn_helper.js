
(function(exports){'use strict';var NETWORK_TYPES=[null,'gprs','edge','umts','is95a','is95b','1xrtt','evdo0','evdoa','hsdpa','hsupa','hspa','evdob','ehrpd','lte','hspa+','gsm'];function ah_filterByBearer(apns,type){var typeIdx=NETWORK_TYPES.indexOf(type);for(var i=0;i<apns.length;i++){var bearer=apns[i].bearer?+apns[i].bearer:0;if(bearer&&(bearer!==typeIdx)){apns.splice(i,1);}}}
function ah_getCompatible(list,mcc,mnc,type){var apns=list[mcc]?(list[mcc][mnc]||[]):[];ah_filterByBearer(apns,type);return apns;}
var ApnHelper={getCompatible:ah_getCompatible};exports.ApnHelper=ApnHelper;})(this);