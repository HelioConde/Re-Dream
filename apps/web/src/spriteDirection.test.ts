import assert from 'node:assert/strict';
import { test } from 'node:test';
import { directionalFrame } from './spriteDirection.js';

test('right direction uses right author frames without flipping', () => {
  assert.deepEqual(directionalFrame(1, true, 0), { texture:'hero-right',frame:0,flipX:false });
  assert.equal(directionalFrame(1,true,420).frame,4);
});
test('left direction uses left author frames without flipping', () => {
  assert.deepEqual(directionalFrame(-1,true,210), { texture:'hero-left',frame:2,flipX:false });
});
test('idle freezes on authored first frame', () => {
  assert.equal(directionalFrame(-1,false,1350).frame,0);
});

import { shouldFlipRose } from './spriteDirection.js';
test('Rosa original olha à esquerda e só é espelhada ao andar para a direita', () => {
  assert.equal(shouldFlipRose(-1),false);
  assert.equal(shouldFlipRose(1),true);
});
