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
