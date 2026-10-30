export const CHARACTER_IDS = ['luci', 'rose', 'wanderer', 'sprout', 'bunny', 'retro', 'retrohat', 'mana_dapper', 'mana_bob', 'cat', 'fox', 'rabbit', 'wolf', 'panda', 'owl'] as const;
export type CharacterId = typeof CHARACTER_IDS[number];
export const DEFAULT_CHARACTER: CharacterId = 'luci';
export const isCharacterId = (value: unknown): value is CharacterId =>
  typeof value === 'string' && (CHARACTER_IDS as readonly string[]).includes(value);
export type Control = { left: boolean; right: boolean; jump: boolean; attack: boolean; skill: boolean; down?: boolean };
// Extra commands are offline-only until the multiplayer server gains matching rules.
export type PracticeInput = Control & {
  up?: boolean; charge?: boolean;
  drop?: boolean;
};
export type Player = {
  id: string; name: string; characterId: CharacterId; x: number; y: number; hp: number; score: number;
  facing: number; flash: number; color: number;
  // Optional offline training metadata; multiplayer snapshots stay compatible.
  comboStage?: number; airborne?: boolean; falling?: boolean;
  dashing?: boolean; running?: boolean; velocityX?: number;
  rocket?: boolean; shadow?: boolean; skillLevel?: 1 | 2 | 3;
  combatAction?: 'attack' | 'air_attack' | 'dash_attack' | 'skill' | 'launcher' | 'dive' | 'otto';
  actionElapsedMs?: number;
};
export type Enemy = { id: number; x: number; y: number; hp: number; maxHp: number; boss: boolean; flash: number };
// Feedback is optional and sent only by the offline practice simulation.
export type PracticeImpact = {
  sequence: number; damage: number; x: number; y: number;
  direction: number; kind: 'basic' | 'air' | 'dash' | 'skill' | 'launcher' | 'dive' | 'otto';
};
export type Snapshot = {
  impact?: PracticeImpact;
  type: 'snapshot'; room: string; status: 'lobby' | 'playing' | 'victory' | 'defeat'; hostId: string;
  wave: number; players: Player[]; enemies: Enemy[]; remaining: number;
};
export type ServerMessage =
  | { type: 'welcome'; id: string }
  | { type: 'joined'; id: string; room: string }
  | { type: 'error'; message: string }
  | Snapshot;

export const EMPTY_CONTROLS: Control = { left: false, right: false, jump: false, attack: false, skill: false };
