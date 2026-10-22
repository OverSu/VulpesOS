import {test} from 'node:test';
import assert from 'node:assert/strict';
import {migratePrivacyDefaults} from '../services/settings.mjs';

test('existing profiles enable protection and skip the introductory popup once',()=>{
  const values={'privacy.trackingprotection.enabled':false,'language.current':'fr'};
  assert.equal(migratePrivacyDefaults(values),true);
  assert.equal(values['privacy.trackingprotection.enabled'],true);
  assert.equal(values['privacy.trackingprotection.shown'],true);
  assert.equal(values['privacy.donottrackheader.enabled'],true);
  assert.equal(values['privacy.donottrackheader.value'],1);
  assert.equal(values['language.current'],'fr');
});

test('later explicit privacy choices survive subsequent launches',()=>{
  const values={};migratePrivacyDefaults(values);
  values['privacy.trackingprotection.enabled']=false;
  assert.equal(migratePrivacyDefaults(values),false);
  assert.equal(values['privacy.trackingprotection.enabled'],false);
  assert.equal(values['privacy.trackingprotection.shown'],true);
});
