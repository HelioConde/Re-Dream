import { BASIC_ATTACK_ANIM_MS } from './attackPlayback';
import type { SpriteChoice } from './characterAnimation';

// A single transparent cell size for every authentic Luci animation.
// The importer never shrinks a larger PixelLab canvas to 128x128.
export const LUCI_FRAME_SIZE = 192;
export const LUCI_WORLD_PIXEL_SCALE = 170 / 128;
export const LUCI_DISPLAY_SIZE = LUCI_FRAME_SIZE * LUCI_WORLD_PIXEL_SCALE;

export const LUCI_FRAME_COUNTS = {
  idle_east: 9,
  walk_east: 8,
  run_east: 8,
  jump_start_east: 5,
  jump_air_east: 5,
  jump_fall_east: 5,
  land_east: 7,
  attack_1_east: 13,
  attack_2_east: 13,
  attack_3_east: 5,
  attack_4_east: 17,
  attack_air_east: 13,
  dash_east: 9,
  dash_attack_east: 13,
  skill_2_east: 17,
} as const;

export const LUCI_ANIMATION_KEYS = Object.keys(LUCI_FRAME_COUNTS) as (keyof typeof LUCI_FRAME_COUNTS)[];

type LuciAction = keyof typeof LUCI_FRAME_COUNTS;
export type LuciVisualState = {
  facing: number;
  moving: boolean;
  airborne: boolean;
  falling: boolean;
  attacking: boolean;
  skill: boolean;
  comboStage: number;
  attackElapsed: number | null;
  timeMs: number;
};

/** Authentic animation data imported from the PixelLab ZIP, all facing East.
 * Animated armor is intentionally not faked: base body is displayed until its
 * own matching animations are authored and exported.
 */
export function selectLuciAnimation(s: LuciVisualState): SpriteChoice {
  let action: LuciAction = 'idle_east';
  let frame: number;
  if (s.attacking && s.attackElapsed !== null) {
    action = s.airborne ? 'attack_air_east' :
      ('attack_' + Math.max(1, Math.min(4, s.comboStage || 1)) + '_east') as LuciAction;
    const count = LUCI_FRAME_COUNTS[action];
    frame = Math.max(0, Math.min(count - 1,
      Math.floor(s.attackElapsed / BASIC_ATTACK_ANIM_MS * count)));
  } else {
    if (s.skill) action = 'skill_2_east';
    else if (s.airborne) action = s.falling ? 'jump_fall_east' : 'jump_air_east';
    else if (s.moving) action = 'run_east';
    const fps = action === 'run_east' ? 12 : action === 'idle_east' ? 9 : 12;
    frame = Math.floor(s.timeMs * fps / 1000) % LUCI_FRAME_COUNTS[action];
  }
  return { texture: 'luci_' + action, frame, flipX: s.facing < 0 };
}

export class LuciComboTracker {
  private state = new Map<string, { lastElapsed: number | null; lastAt: number; combo: number }>();
  update(id: string, elapsed: number | null, nowMs: number) {
    const previous = this.state.get(id) ?? { lastElapsed: null, lastAt: -Infinity, combo: 0 };
    const newStrike = elapsed !== null &&
      (previous.lastElapsed === null || elapsed < previous.lastElapsed);
    if (newStrike) {
      previous.combo = nowMs - previous.lastAt <= 1300 ? (previous.combo % 4) + 1 : 1;
      previous.lastAt = nowMs;
    }
    previous.lastElapsed = elapsed;
    this.state.set(id, previous);
    return previous.combo || 1;
  }
  remove(id: string) { this.state.delete(id); }
}
