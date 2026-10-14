import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

for (const file of ['gaia/apps/communications/dialer/js/call_log.js',
  'assets/webapps/communications.gaiamobile.org/dialer/js/call_log.js']) {
  test(`call log resolves contacts in its newly rendered section: ${file}`, () => {
    const context = {navigator:{mozContacts:{}},window:{}};
    vm.runInNewContext(readFileSync(file,'utf8'),context);
    const log = context.CallLog, items = [], lookedUp = [];
    const list = {appendChild:row=>items.push(row),querySelectorAll:()=>items};
    log.createSectionForGroup=()=>({getElementsByTagName:()=>[list]});
    log.createGroup=group=>({dataset:{phoneNumber:group.number}});
    log.callLogContainer={appendChild(){}};
    log._updateContact=(_node,number)=>lookedUp.push(number);
    log.renderChunk([{number:'5550199'}]);
    assert.deepEqual(lookedUp,['5550199']);
  });
}
