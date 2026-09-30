/** Load only panels supported by this platform; never invent hardware values. */
(function() {
  'use strict';
  var definitions = [
    ['BluetoothItem', 'bluetooth_item', !!navigator.mozBluetooth, '.bluetooth-desc'],
    ['NFCItem', 'nfc_item', !!navigator.mozNfc, '.nfc-settings'],
    ['LanguageItem', 'language_item', true, '.language-desc'],
    ['BatteryItem', 'battery_item', !!(navigator.battery || navigator.mozBattery), '.battery-desc'],
    ['FindMyDeviceItem', 'findmydevice_item', !!navigator.mozId, '.findmydevice-desc'],
    ['StorageUSBItem', 'storage_usb_item', !!navigator.getDeviceStorages, '.media-storage-section, #menuItem-enableStorage'],
    ['StorageAppItem', 'storage_app_item', !!navigator.getDeviceStorage, '.application-storage-desc'],
    ['WifiItem', 'wifi_item', !!navigator.mozWifiManager, '#wifi-desc'],
    ['ScreenLockItem', 'screen_lock_item', true, '.screenLock-desc'],
    ['SimSecurityItem', 'sim_security_item', !!navigator.mozMobileConnections, '.simCardLock-desc']
  ];
  var supported = definitions.filter(function(item) {return item[2];});
  define('panels/root/low_priority_items', supported.map(function(item) {
    return 'panels/root/' + item[1];
  }), function() {
    var modules = arguments, items = {};
    supported.forEach(function(item, index) {items[item[0]] = modules[index];});
    definitions.filter(function(item) {return !item[2];}).forEach(function(item) {
      Array.prototype.forEach.call(document.querySelectorAll(item[3]), function(element) {
        (element.closest('li') || element).hidden = true;
      });
    });
    return items;
  });
})();
