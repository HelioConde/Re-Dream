import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LuciComboTracker, LUCI_FRAME_COUNTS, selectLuciAnimation } from './luciAnimation';

const base = { facing: 1, moving: false, airborne: false, falling: false, attacking: false,
  skill: false, comboStage: 1, attackElapsed: null, timeMs: 0 };
test('Luci uses authored idle/walk/run animations, west mirrored', () => {
  assert.deepEqual(selectLuciAnimation(base), { texture: 'luci_idle_east', frame: 0, flipX: false });
  assert.equal(selectLuciAnimation({ ...base, facing: -1, moving: true }).texture, 'luci_walk_east');
  assert.equal(selectLuciAnimation({ ...base, facing: -1, moving: true }).flipX, true);
  assert.equal(selectLuciAnimation({ ...base, moving: true, running: true }).texture, 'luci_run_east');
  assert.equal(selectLuciAnimation({ ...base, moving: true, running: false }).texture, 'luci_walk_east');
  assert.equal(selectLuciAnimation({ ...base, moving: true, running: true, dashing: true }).texture, 'luci_dash_east');
  assert.equal(LUCI_FRAME_COUNTS.walk_east, 8);
  assert.equal(LUCI_FRAME_COUNTS.run_east, 8);
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

test('Luci launcher uses authentic uppercut sprites and diving uses aerial sprites', () => {
  assert.equal(selectLuciAnimation({...base, launching:true, attacking:true, attackElapsed:100}).texture, 'luci_uppercut_east');
  assert.equal(selectLuciAnimation({...base, diving:true, airborne:true, attacking:true, attackElapsed:100}).texture, 'luci_attack_air_east');
  assert.equal(LUCI_FRAME_COUNTS.uppercut_east, 17);
});

test('snapshot FSM state chooses correct original sprite, even with stale boolean hints', () => {
  assert.equal(selectLuciAnimation({...base, locomotion:'walk', moving:false}).texture, 'luci_walk_east');
  assert.equal(selectLuciAnimation({...base, locomotion:'dash', moving:false}).texture, 'luci_dash_east');
  assert.equal(selectLuciAnimation({...base, locomotion:'run', running:false}).texture, 'luci_run_east');
  assert.equal(selectLuciAnimation({...base, locomotion:'rocket', airborne:false}).texture, 'luci_jump_air_east');
  assert.equal(selectLuciAnimation({...base, locomotion:'shadow', airborne:false}).texture, 'luci_jump_fall_east');
  assert.equal(selectLuciAnimation({...base, locomotion:'fall', airborne:false}).texture, 'luci_jump_fall_east');
  assert.equal(selectLuciAnimation({...base, locomotion:'idle', moving:true}).texture, 'luci_idle_east');
});
test('charged skill/combo animation keeps priority over locomotion state', () => {
  assert.equal(selectLuciAnimation({
    ...base, locomotion:'run', skill:true,
  }).texture, 'luci_skill_2_east');
  assert.equal(selectLuciAnimation({
    ...base, locomotion:'rocket', attacking:true, attackElapsed:90, airborne:true,
  }).texture, 'luci_attack_air_east');
});
