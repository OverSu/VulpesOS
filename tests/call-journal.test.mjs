import test from 'node:test';
import assert from 'node:assert/strict';
import {CallJournal} from '../services/call-journal.mjs';
test('calls survive reload, preserve direction and import acknowledgement', () => {
  const j = new CallJournal();
  j.start({path:'/1',number:'123'}, 1000,'outgoing');
  j.update([{path:'/1',state:'active'}], 2000);
  const restored = new CallJournal(JSON.parse(JSON.stringify(j.snapshot())));
  restored.update([], 5500);
  assert.equal(restored.completed[0].duration,3500);
  assert.equal(restored.completed[0].direction,'outgoing');
  restored.update([{path:'/1',state:'incoming',number:'456'}],6000);
  restored.update([],6500);
  assert.equal(restored.completed[1].duration,0);
  assert.equal(restored.completed[1].direction,'incoming');
  assert.notEqual(restored.completed[0].id,restored.completed[1].id);
  restored.acknowledge([restored.completed[0].id]);
  assert.equal(restored.completed.length,1);
});
test('rapid outgoing call is logged even before the first successful poll', () => {
  const j=new CallJournal();j.start({path:'/1',number:'123'},1000,'outgoing');j.update([],1100);
  assert.equal(j.completed.length,1);assert.equal(j.completed[0].duration,0);
});
