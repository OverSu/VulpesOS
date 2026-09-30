
window.DsdsSettings=(function(){var _settings=window.navigator.mozSettings;var _mobileConnections=null;if(window.navigator.mozMobileConnections){_mobileConnections=window.navigator.mozMobileConnections;}
var _iccCardIndexForCallSettings=0;var _iccCardIndexForCellAndDataSettings=0;function ds_init(){if(!_settings||!_mobileConnections){return;}
ds_handleDefaultIccCard();ds_handleCellAndDataSettingSimPanel();}
function ds_getNumberOfIccSlots(){if(_mobileConnections){return _mobileConnections.length;}}
function ds_getIccCardIndexForCallSettings(){return _iccCardIndexForCallSettings;}
function ds_setIccCardIndexForCallSettings(iccCardIndexForCallSettings){_iccCardIndexForCallSettings=iccCardIndexForCallSettings;}
function ds_getIccCardIndexForCellAndDataSettings(){return _iccCardIndexForCellAndDataSettings;}
function ds_handleDefaultIccCard(){for(var i=0,len=_mobileConnections.length;i<len;i++){if(_mobileConnections[i].iccId!==null){ds_setIccCardIndexForCellAndDataSettings(i);break;}}}
function ds_setIccCardIndexForCellAndDataSettings(iccCardIndexForCellAndDataSettings){_iccCardIndexForCellAndDataSettings=iccCardIndexForCellAndDataSettings;}
function ds_handleCellAndDataSettingSimPanel(){var cellAndDataItem=null;if(ds_getNumberOfIccSlots()>1){cellAndDataItem=document.getElementById('menuItem-cellularAndData');if((_mobileConnections[0].radioState!=='enabled')||(!_mobileConnections[0].iccId&&!_mobileConnections[1].iccId)){return;}
cellAndDataItem=document.getElementById('data-connectivity');cellAndDataItem.removeAttribute('aria-disabled');}}
return{init:ds_init,getNumberOfIccSlots:ds_getNumberOfIccSlots,getIccCardIndexForCallSettings:ds_getIccCardIndexForCallSettings,setIccCardIndexForCallSettings:ds_setIccCardIndexForCallSettings,getIccCardIndexForCellAndDataSettings:ds_getIccCardIndexForCellAndDataSettings,setIccCardIndexForCellAndDataSettings:ds_setIccCardIndexForCellAndDataSettings};})();