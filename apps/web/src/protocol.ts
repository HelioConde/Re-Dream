export type Control = { left: boolean; right: boolean; jump: boolean; attack: boolean; skill: boolean };
export type Player = {
  id: string; name: string; x: number; y: number; hp: number; score: number;
  facing: number; flash: number; color: number;
};
export type Enemy = { id: number; x: number; y: number; hp: number; maxHp: number; boss: boolean; flash: number };
export type Snapshot = {
  type: 'snapshot'; room: string; status: 'playing' | 'victory' | 'defeat';
  wave: number; players: Player[]; enemies: Enemy[]; remaining: number;
};
export type ServerMessage =
  | { type: 'welcome'; id: string }
  | { type: 'joined'; id: string; room: string }
  | { type: 'error'; message: string }
  | Snapshot;

export const EMPTY_CONTROLS: Control = { left: false, right: false, jump: false, attack: false, skill: false };
