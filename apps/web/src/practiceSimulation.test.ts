import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PracticeArena } from './practiceSimulation';

const noInput = { left: false, right: false, jump: false, attack: false, skill: false };
test('Luci is the offline practice default with a regenerating target', () => {
  const arena = new PracticeArena();
  assert.equal(arena.snapshot().players[0].characterId, 'luci');
  assert.equal(arena.snapshot().enemies[0].hp, 260);
  assert.equal(arena.snapshot().status, 'playing');
  assert.equal(arena.snapshot().room, 'TREINO');
});
test('practice movement and jump use the same bounds and platform physics', () => {
  const arena = new PracticeArena();
  const start = arena.player.x;
  arena.setInput({ ...noInput, right: true });
  for (let i = 0; i < 12; i++) arena.step(1 / 30);
  assert.ok(arena.player.x > start);
  arena.setInput({ ...noInput, jump: true });
  arena.step(1 / 30);
  assert.ok(arena.player.y < 596);
  arena.setInput(noInput);
  for (let i = 0; i < 110; i++) arena.step(1 / 30);
  assert.equal(arena.player.grounded, true);
  assert.ok([466, 596].includes(arena.player.y));
});
test('practice dummy only takes valid hits and automatically reappears', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 260);
  arena.player.x = 800;
  arena.step(1 / 30);
  // Cooldown is respected even after moving into range.
  assert.equal(arena.stats.targetHp, 260);
  for (let i = 0; i < 12; i++) arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 236);
  arena.setInput({ ...noInput, skill: true });
  for (let i = 0; i < 6; i++) arena.step(1 / 30);
  assert.ok(arena.stats.targetHp <= 171);
  arena.reset();
  assert.equal(arena.stats.targetHp, 260);
  assert.equal(arena.stats.defeated, 0);
  assert.equal(arena.player.x, 180);
});
test('practice must face its target to deal damage', () => {
  const arena = new PracticeArena();
  arena.player.x = 830;
  arena.player.facing = -1;
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 260);
});

test('double tap activates directional dash with a finite speed burst', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, right: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  arena.step(1 / 30);
  arena.setInput({ ...noInput, right: true });
  assert.equal(arena.stats.dashes, 1);
  arena.step(1 / 30);
  assert.ok(arena.player.vx > 600);
  for (let i = 0; i < 15; i++) arena.step(1 / 30);
  assert.ok(arena.player.vx <= 310);
});

test('down drops through one-way platforms, but not through the floor', () => {
  const arena = new PracticeArena();
  Object.assign(arena.player, { x: 300, y: 466, vy: 0, grounded: true });
  arena.setInput({ ...noInput, down: true });
  arena.step(1 / 30);
  assert.ok(arena.player.y > 466);
  arena.setInput(noInput);
  for (let i = 0; i < 60; i++) arena.step(1 / 30);
  assert.equal(arena.player.y, 596);
  assert.equal(arena.player.grounded, true);
});

test('consecutive strikes build distinct combo stages and MP', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, attack: true });
  for (let i = 0; i < 20; i++) arena.step(1 / 30);
  assert.ok(arena.stats.combo >= 3);
  assert.ok(arena.stats.bestCombo >= 3);
  assert.ok(arena.player.comboStage >= 3);
  assert.ok(arena.stats.mp > 40);
  assert.ok(arena.stats.targetHp < 260 - 24 - 29);
});

test('aerial strike uses the aerial animation and hit counter', () => {
  const arena = new PracticeArena();
  Object.assign(arena.player, { x: 810, y: 540, vy: -100, grounded: false });
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.aerialHits, 1);
  assert.equal(arena.snapshot().players[0].combatAction, 'air_attack');
  assert.equal(arena.stats.targetHp, 230);
});

test('short Z taps attack; holding Z spends MP to perform a charged skill', () => {
  const short = new PracticeArena();
  short.player.x = 800;
  short.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 3; i++) short.step(1 / 30);
  short.setInput(noInput);
  short.step(1 / 30);
  assert.equal(short.stats.targetHp, 236);

  const long = new PracticeArena();
  long.player.x = 800;
  long.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 25; i++) long.step(1 / 30);
  assert.equal(long.stats.chargePercent, 100);
  long.setInput(noInput);
  long.step(1 / 30);
  assert.equal(long.stats.targetHp, 195);
  assert.equal(long.snapshot().players[0].combatAction, 'skill');
  assert.ok(long.stats.mp < 40);
});

test('pausing clears charged input without triggering a hidden attack', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 30; i++) arena.step(1 / 30);
  arena.suspend();
  arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 260);
  assert.equal(arena.stats.chargePercent, 0);
});
