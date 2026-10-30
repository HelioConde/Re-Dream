/**
 * Deterministic locomotion-state decision for the offline practice arena.
 * Movement input, physics collision and combat remain separate subsystems.
 * No DOM, Phaser scene, timers or wall-clock dependencies.
 */
export type LocomotionState =
  | 'idle' | 'walk' | 'dash' | 'run'
  | 'rise' | 'fall' | 'rocket' | 'shadow';

export type LocomotionContext = {
  grounded: boolean;
  vy: number;
  direction: number;
  now: number;
  dashUntil: number;
  dashDirection: number;
  rocketUntil: number;
  rocketDirection: number;
  shadowUntil: number;
  runArmed: boolean;
  running: boolean;
  runDirection: number;
};

export type LocomotionTransition = {
  state: LocomotionState;
  vx: number;
  running: boolean;
  runArmed: boolean;
  startedRun: boolean;
};

export const LOCOMOTION_SPEED = {
  walk: 310,
  run: 455,
  dash: 685,
  rocket: 715,
  shadow: 310 * 1.15,
} as const;

/** Classification priority: airborne special > airborne vertical > grounded dash > run > walk > idle.
 * Attack/charging Z is an orthogonal combat state and never stops gravity.
 */
export function classifyLocomotion(
  context: Pick<LocomotionContext, 'grounded' | 'vy' | 'direction' | 'now' |
    'dashUntil' | 'rocketUntil' | 'shadowUntil' | 'running'>,
): LocomotionState {
  if (!context.grounded) {
    if (context.shadowUntil > context.now) return 'shadow';
    if (context.rocketUntil > context.now) return 'rocket';
    return context.vy < 0 ? 'rise' : 'fall';
  }
  if (context.dashUntil > context.now) return 'dash';
  if (context.running && context.direction !== 0) return 'run';
  if (context.direction !== 0) return 'walk';
  return 'idle';
}

/** Advance the dash->hold-run guard and resolve horizontal velocity.
 * The returned state describes the current pre-physics frame; after collision,
 * the simulation reclassifies the new vertical state for the snapshot/UI.
 */
export function advanceLocomotion(c: LocomotionContext): LocomotionTransition {
  const dash = c.dashUntil > c.now;
  let runArmed = c.runArmed;
  let running = c.running;
  let startedRun = false;

  if (!dash && runArmed) {
    if (c.grounded && c.direction === c.runDirection && c.direction !== 0) {
      running = true;
      startedRun = !c.running;
    }
    runArmed = false;
  }
  if (running && (!c.grounded || c.direction !== c.runDirection)) running = false;

  const shadow = !c.grounded && c.shadowUntil > c.now;
  // Shadow's downward cancel always wins, even if stale Rocket time remains.
  const rocket = !shadow && !c.grounded && c.rocketUntil > c.now;
  const horizontalDirection = dash ? c.dashDirection :
    rocket || shadow ? c.direction || c.rocketDirection : c.direction;
  const velocity = dash ? LOCOMOTION_SPEED.dash :
    rocket ? LOCOMOTION_SPEED.rocket :
    shadow ? LOCOMOTION_SPEED.shadow :
    running && c.grounded ? LOCOMOTION_SPEED.run : LOCOMOTION_SPEED.walk;
  return {
    state: classifyLocomotion({ ...c, running }),
    vx: horizontalDirection * velocity,
    running,
    runArmed,
    startedRun,
  };
}
