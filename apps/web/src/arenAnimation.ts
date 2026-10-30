import type { LocomotionState } from './locomotionFsm';
import type { SpriteChoice } from './characterAnimation';

export const AREN_DISPLAY_SIZE = 235;
// Mirror of scripts/generate_aren_art.mjs; verified in CI by animation tests.
export const AREN_FRAME_COUNTS = {
  idle: 6, walk: 8, run: 8, dash: 6,
  rise: 4, fall: 4, rocket: 6, shadow: 5, land: 5,
  attack_1: 7, attack_2: 7, attack_3: 7, attack_4: 8,
  dash_attack: 7, air_attack: 7, launcher: 7, dive: 7, otto: 7,
  charge: 6, skill_1: 8, skill_2: 8, skill_3: 8, hurt: 5,
} as const;
export type ArenAction = keyof typeof AREN_FRAME_COUNTS;
export const AREN_ACTIONS = Object.keys(AREN_FRAME_COUNTS) as ArenAction[];

export type ArenVisualState = {
  facing: number;
  locomotion?: LocomotionState;
  airborne: boolean;
  falling: boolean;
  moving: boolean;
  dashing?: boolean;
  running?: boolean;
  charging?: boolean;
  combatAction?: 'attack'|'air_attack'|'dash_attack'|'skill'|'launcher'|'dive'|'otto';
  comboStage?: number;
  skillLevel?: 1|2|3;
  attackElapsedMs?: number|null;
  timeMs: number;
  hurt?: boolean;
  landing?: boolean;
};

export function chooseArenAction(s: ArenVisualState): ArenAction {
  // The authoritative action always wins over movement, including Z release.
  if (s.combatAction === 'skill') return ('skill_'+Math.max(1,Math.min(3,s.skillLevel ?? 1))) as ArenAction;
  if (s.combatAction === 'attack') return ('attack_'+Math.max(1,Math.min(4,s.comboStage ?? 1))) as ArenAction;
  if (s.combatAction === 'air_attack') return 'air_attack';
  if (s.combatAction === 'dash_attack') return 'dash_attack';
  if (s.combatAction === 'launcher') return 'launcher';
  if (s.combatAction === 'dive') return 'dive';
  if (s.combatAction === 'otto') return 'otto';
  if (s.charging) return 'charge';
  if (s.hurt) return 'hurt';
  if (s.airborne) {
    if (s.locomotion === 'rocket') return 'rocket';
    if (s.locomotion === 'shadow') return 'shadow';
    return s.falling ? 'fall' : 'rise';
  }
  if (s.landing) return 'land';
  if (s.locomotion === 'dash' || s.dashing) return 'dash';
  if (s.locomotion === 'run' || s.running) return 'run';
  if (s.locomotion === 'walk' || s.moving) return 'walk';
  return 'idle';
}

const ACTION_FPS: Partial<Record<ArenAction,number>> = {
  idle: 7, walk: 12, run: 17, dash: 20, rocket: 18, shadow: 15,
  rise: 10, fall: 10, charge: 10, hurt: 12, land: 15,
};

export function selectArenAnimation(s: ArenVisualState): SpriteChoice {
  const action = chooseArenAction(s);
  const count = AREN_FRAME_COUNTS[action];
  const attackOrSkill = action.startsWith('attack_') || action.startsWith('skill_') ||
    ['launcher','otto','dive','dash_attack','air_attack'].includes(action);
  const elapsed = Math.max(0,s.attackElapsedMs ?? 0);
  const duration = action.startsWith('skill_') ? 460 :
    action === 'launcher' ? 420 : ['dive','otto'].includes(action) ? 650 : 330;
  const frame = attackOrSkill ?
    Math.min(count-1,Math.floor(elapsed / duration * count)) :
    Math.floor(Math.max(0,s.timeMs) * (ACTION_FPS[action] ?? 12) / 1000) % count;
  return {texture:'aren-'+action+'-'+frame,frame:0,flipX:s.facing<0};
}

/** Landing is transient; only the first grounded frame after falling starts it.
 * Cosmetic tracker never feeds the gameplay physics or the combat solver.
 */
export class ArenLandingTracker {
  private previous = new Map<string,{airborne:boolean,until:number}>();
  update(id:string,airborne:boolean,time:number):boolean {
    const previous=this.previous.get(id);
    const started=!!previous?.airborne && !airborne;
    const until=started?time+260:(previous?.until ?? 0);
    this.previous.set(id,{airborne,until});
    return !airborne && time<until;
  }
  remove(id:string){this.previous.delete(id);}
}
