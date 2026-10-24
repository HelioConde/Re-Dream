import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AttackPlayback, BASIC_ATTACK_COOLDOWN_MS, BASIC_ATTACK_ANIM_MS } from './attackPlayback.js';

test('Gato: J starts visual effect on the very first frame', () => {
  const p = new AttackPlayback();
  assert.equal(p.update('cat', true, true, 0, true, true, 100), 0);
  assert.equal(p.update('cat', true, false, 0, false, true, 120), 20);
});

test('holding J cannot restart the animation on each frame', () => {
  const p = new AttackPlayback();
  p.update('a', true, true, 0, true, true, 100);
  assert.equal(p.update('a', true, true, 0.13, true, true, 116), 16);
  assert.equal(p.update('a', true, true, 0, false, true, 100 + BASIC_ATTACK_ANIM_MS), null);
  assert.equal(p.update('a', true, true, 0, false, true, 100 + BASIC_ATTACK_COOLDOWN_MS), 0);
});

test('remote basic attack plays once, skill flash does not fake an attack', () => {
  const p = new AttackPlayback();
  assert.equal(p.update('b', false, false, 0, true, true, 100), null);
  assert.equal(p.update('b', false, false, 0.13, true, true, 200), 0);
  assert.equal(p.update('b', false, false, 0.13, false, true, 220), 20);
  p.update('b', false, false, 0, true, true, 600);
  assert.equal(p.update('b', false, false, 0.33, true, true, 700), null);
  assert.equal(p.update('b', false, false, 0.13, true, true, 850), null);
  p.update('b', false, false, 0, true, true, 950);
  assert.equal(p.update('b', false, false, 0.13, true, true, 1050), 0);
});

test('defeat and player replacement stop and reset visual attacks', () => {
  const p = new AttackPlayback();
  p.update('c', true, true, 0, true, true, 100);
  assert.equal(p.update('c', true, false, 0, false, false, 120), null);
  p.remove('c');
  assert.equal(p.update('c', true, false, 0, true, true, 150), null);
});
