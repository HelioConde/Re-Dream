import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceLocomotion, classifyLocomotion, LOCOMOTION_SPEED,
  type LocomotionContext } from './locomotionFsm';

const base: LocomotionContext = {
  grounded: true, vy: 0, direction: 0, now: 1,
  dashUntil: 0, dashDirection: 1,
  rocketUntil: 0, rocketDirection: 1, shadowUntil: 0,
  runArmed: false, running: false, runDirection: 1,
};
const advance = (updates: Partial<LocomotionContext> = {}) =>
  advanceLocomotion({ ...base, ...updates });

test('idle -> walk follows held direction without creating a dash or a run', () => {
  assert.deepEqual(advance(), {
    state: 'idle', vx: 0, running: false, runArmed: false, startedRun: false,
  });
  assert.deepEqual(advance({ direction: 1 }), {
    state: 'walk', vx: LOCOMOTION_SPEED.walk, running: false,
    runArmed: false, startedRun: false,
  });
  assert.equal(advance({ direction: -1 }).vx, -LOCOMOTION_SPEED.walk);
});

test('double tap dash takes priority over walk and run until dash window expires', () => {
  const c = { direction: 1, dashUntil: 1.24,
    dashDirection: 1, runArmed: true, runDirection: 1 } as const;
  const dash = advance(c);
  assert.equal(dash.state, 'dash');
  assert.equal(dash.vx, LOCOMOTION_SPEED.dash);
  assert.equal(dash.running, false);
  assert.equal(dash.runArmed, true);
  const run = advance({ ...c, now: 1.25 });
  assert.equal(run.state, 'run');
  assert.equal(run.vx, LOCOMOTION_SPEED.run);
  assert.equal(run.running, true);
  assert.equal(run.runArmed, false);
  assert.equal(run.startedRun, true);
  assert.equal(advance({ ...c, now: 1.3, runArmed: false, running: true }).startedRun, false);
});

test('releasing second dash press forbids transition into continuous run', () => {
  const motion = advance({ direction: 0, runArmed: true, runDirection: 1 });
  assert.equal(motion.running, false);
  assert.equal(motion.startedRun, false);
  assert.equal(motion.state, 'idle');
  assert.equal(motion.vx, 0);
});

test('reversing direction cancels running and returns to walking', () => {
  const motion = advance({ direction: -1, running: true, runDirection: 1 });
  assert.equal(motion.state, 'walk');
  assert.equal(motion.running, false);
  assert.equal(motion.vx, -LOCOMOTION_SPEED.walk);
});

test('jumping cancels run arming and current running without killing aerial movement', () => {
  const motion = advance({ grounded: false, vy: -500, direction: 1,
    runArmed: true, running: true, runDirection: 1 });
  assert.equal(motion.state, 'rise');
  assert.equal(motion.vx, LOCOMOTION_SPEED.walk);
  assert.equal(motion.runArmed, false);
  assert.equal(motion.running, false);
  assert.equal(advance({ grounded: false, vy: 200 }).state, 'fall');
});

test('Rocket preserves horizontal momentum when direction is released', () => {
  const state = advance({ grounded: false, vy: -250, direction: 0,
    rocketUntil: 1.5, rocketDirection: -1 });
  assert.equal(state.state, 'rocket');
  assert.equal(state.vx, -LOCOMOTION_SPEED.rocket);
  const expired = advance({ grounded: false, vy: -250, direction: 0,
    rocketUntil: 0.9, rocketDirection: -1 });
  assert.equal(expired.state, 'rise');
  assert.equal(expired.vx, 0);
});

test('Shadow wins over Rocket while airborne; neither special persists after landing', () => {
  const airborne = advance({ grounded: false, direction: 0, vy: 600,
    rocketUntil: 1.2, shadowUntil: 1.3, rocketDirection: 1 });
  assert.equal(airborne.state, 'shadow');
  assert.equal(airborne.vx, LOCOMOTION_SPEED.shadow);
  const grounded = advance({ grounded: true, direction: 0, vy: 0,
    rocketUntil: 1.2, shadowUntil: 1.3 });
  assert.equal(grounded.state, 'idle');
  assert.equal(grounded.vx, 0);
});

test('classify ignores combat: fall/grounded priorities do not depend on charging Z', () => {
  assert.equal(classifyLocomotion(base), 'idle');
  assert.equal(classifyLocomotion({ ...base, direction: 1 }), 'walk');
  assert.equal(classifyLocomotion({ ...base, grounded: false, vy: 0 }), 'fall');
  assert.equal(classifyLocomotion({ ...base, grounded: false, vy: -1 }), 'rise');
});

test('a held run is not rearmed repeatedly and stops when direction is released', () => {
  const held = advance({ running: true, direction: 1, runDirection: 1 });
  assert.equal(held.state, 'run');
  assert.equal(held.startedRun, false);
  const release = advance({ running: true, direction: 0, runDirection: 1 });
  assert.equal(release.state, 'idle');
  assert.equal(release.running, false);
});
