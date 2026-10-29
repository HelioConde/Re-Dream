import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LuciComboTracker, LUCI_FRAME_COUNTS, selectLuciAnimation } from './luciAnimation';

const base = { facing: 1, moving: false, airborne: false, falling: false, attacking: false,
  skill: false, comboStage: 1, attackElapsed: null, timeMs: 0 };
test('Luci uses authentic East idle and run, west mirrored', () => {
  assert.deepEqual(selectLuciAnimation(base), { texture: 'luci_idle_east', frame: 0, flipX: false });
  assert.equal(selectLuciAnimation({ ...base, facing: -1, moving: true }).texture, 'luci_run_east');
  assert.equal(selectLuciAnimation({ ...base, facing: -1, moving: true }).flipX, true);
});
test('Luci selects matching airborne and combo animation without fake frames', () => {
  assert.equal(selectLuciAnimation({ ...base, airborne: true, falling: false }).texture, 'luci_jump_air_east');
  assert.equal(selectLuciAnimation({ ...base, airborne: true, falling: true }).texture, 'luci_jump_fall_east');
  const a = selectLuciAnimation({ ...base, attacking: true, comboStage: 3, attackElapsed: 160 });
  assert.equal(a.texture, 'luci_attack_3_east');
  assert.ok(a.frame >= 0 && a.frame < LUCI_FRAME_COUNTS.attack_3_east);
});
test('Luci combo tracker chains only distinct attacks and resets after a pause', () => {
  const combo = new LuciComboTracker();
  assert.equal(combo.update('one', 0, 100), 1);
  assert.equal(combo.update('one', 100, 200), 1);
  combo.update('one', null, 420);
  assert.equal(combo.update('one', 0, 450), 2);
  combo.update('one', null, 500);
  assert.equal(combo.update('one', 0, 1900), 1);
});

test('Luci selects original dash, dash strike and charged skill sprites', () => {
  assert.equal(selectLuciAnimation({ ...base, dashing: true }).texture, 'luci_dash_east');
  assert.equal(selectLuciAnimation({
    ...base, dashing: true, dashAttacking: true,
    attacking: true, attackElapsed: 100,
  }).texture, 'luci_dash_attack_east');
  assert.equal(selectLuciAnimation({
    ...base, skill: true, attacking: true, attackElapsed: 100,
  }).texture, 'luci_skill_2_east');
});
