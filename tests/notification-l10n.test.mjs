import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('an empty raw notification body is not treated as an undefined translation key',async()=>{
  const keys=[];
  const scope={Notification:class {constructor(title,options){this.title=title;this.options=options;}},
    document:{l10n:{formatValue:id=>{keys.push(id);return Promise.resolve(id);}},documentElement:{getAttribute:()=> 'fr'}},Promise};
  vm.runInNewContext(readFileSync(new URL('../gaia/shared/js/notification_helper.js',import.meta.url),'utf8'),scope);
  const notification=await scope.NotificationHelper.send({id:'alarm-start-notice'},{bodyL10n:{raw:''},closeOnClick:false});
  assert.equal(notification.title,'alarm-start-notice');
  assert.deepEqual(keys,['alarm-start-notice']);
});
