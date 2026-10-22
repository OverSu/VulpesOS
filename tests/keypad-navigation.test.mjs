import assert from 'node:assert/strict';
import {test} from 'node:test';
import {nextKeypadTarget} from '../services/keypad-navigation.mjs';

test('directional keypad navigation selects the aligned grid item', () => {
  const grid = [{x:40,y:40},{x:120,y:40},{x:40,y:120},{x:120,y:120}];
  assert.equal(nextKeypadTarget(grid,-1,'ArrowDown'),0);
  assert.equal(nextKeypadTarget(grid,0,'ArrowRight'),1);
  assert.equal(nextKeypadTarget(grid,0,'ArrowDown'),2);
  assert.equal(nextKeypadTarget(grid,3,'ArrowUp'),1);
  assert.equal(nextKeypadTarget(grid,3,'ArrowLeft'),2);
  assert.equal(nextKeypadTarget(grid,0,'ArrowLeft'),-1);
  assert.equal(nextKeypadTarget([],0,'ArrowDown'),-1);
  assert.equal(nextKeypadTarget(grid,0,'Enter'),-1);
});
