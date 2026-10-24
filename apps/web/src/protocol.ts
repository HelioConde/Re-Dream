export const CHARACTER_IDS = ['rose', 'wanderer', 'sprout', 'bunny', 'retro', 'retrohat', 'mana_dapper', 'mana_bob', 'cat', 'fox', 'rabbit', 'wolf', 'panda', 'owl'] as const;
export type CharacterId = typeof CHARACTER_IDS[number];
export const DEFAULT_CHARACTER: CharacterId = 'rose';
export const isCharacterId = (value: unknown): value is CharacterId =>
  typeof value === 'string' && (CHARACTER_IDS as readonly string[]).includes(value);
export type Control = { left: boolean; right: boolean; jump: boolean; attack: boolean; skill: boolean };
export type Player = {
  id: string; name: string; characterId: CharacterId; x: number; y: number; hp: number; score: number;
  facing: number; flash: number; color: number;
};
export type Enemy = { id: number; x: number; y: number; hp: number; maxHp: number; boss: boolean; flash: number };
export type Snapshot = {
  type: 'snapshot'; room: string; status: 'lobby' | 'playing' | 'victory' | 'defeat'; hostId: string;
  wave: number; players: Player[]; enemies: Enemy[]; remaining: number;
};
export type ServerMessage =
  | { type: 'welcome'; id: string }
  | { type: 'joined'; id: string; room: string }
  | { type: 'error'; message: string }
  | Snapshot;

export const EMPTY_CONTROLS: Control = { left: false, right: false, jump: false, attack: false, skill: false };
