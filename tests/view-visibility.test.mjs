import test from 'node:test';
import assert from 'node:assert/strict';
import {frameUnobscured} from '../services/view-visibility.mjs';

function scene(width, hostname = 'system.localhost') {
  const frame = {};
  const edge = {matches: selector => selector.includes('.gesture-panel')};
  const document = {hidden:false, location:{hostname},
    elementFromPoint: x => x < 20 || x > width - 20 ? edge : frame};
  return {frame, document, rect:{left:0, top:74, width, height:622}};
}

test('Gaia edge gestures do not hide the web page on narrow screens', () => {
  for (const width of [320,360,414]) {
    const {document,frame,rect}=scene(width);
    assert.equal(frameUnobscured(document,frame,rect),true);
  }
});

test('an application cannot impersonate the system gesture overlay', () => {
  const {document,frame,rect}=scene(360,'example.localhost');
  assert.equal(frameUnobscured(document,frame,rect),false);
});

test('dialogs, missing hit targets and hidden documents still hide external views', () => {
  const {document,frame,rect}=scene(360);
  for (const hit of [{matches:()=>false},null]) {
    document.elementFromPoint=()=>hit;
    assert.equal(frameUnobscured(document,frame,rect),false);
  }
  document.elementFromPoint=()=>frame;
  document.hidden=true;
  assert.equal(frameUnobscured(document,frame,rect),false);
  document.hidden=false;
  assert.equal(frameUnobscured(document,frame,{...rect,width:0}),false);
});
