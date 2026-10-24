import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectSprite } from './characterAnimation.js';
test('Rosa moves toward left without mirroring native left-facing sheet',()=>{
  assert.equal(selectSprite('rose',-1,true,false,false,200).flipX,false);
  assert.equal(selectSprite('rose',1,true,false,false,200).flipX,true);
});
test('Bunny uses actual author walk and sword frames',()=>{
  assert.equal(selectSprite('bunny',-1,true,false,false,0).texture,'bunny_run_left');
  assert.equal(selectSprite('bunny',1,false,true,false,0).texture,'bunny_attack_right');
});
test('Retro uses directional frames and Sprout uses actual grid locations',()=>{
  assert.equal(selectSprite('retrohat',-1,true,false,false,180).texture,'retrohat_walk_left');
  assert.equal(selectSprite('sprout',-1,false,false,false,0).frame,7*12+1);
  assert.equal(selectSprite('sprout',1,true,false,false,140).frame,10*12+4);
});
test('Mana Seed and animals do not invent animation frames',()=>{
  assert.deepEqual(selectSprite('mana_dapper',1,true,true,true,900),{
    texture:'mana_dapper',frame:0,flipX:false
  });
  assert.equal(selectSprite('fox',1,true,true,false,900).frame,0);
});
