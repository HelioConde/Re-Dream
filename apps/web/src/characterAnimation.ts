import type { CharacterId } from './protocol';
import { directionalFrame, shouldFlipRose } from './spriteDirection';

export type SpriteChoice = { texture: string; frame: number; flipX: boolean };

export const animalIds = ['cat','fox','rabbit','wolf','panda','owl'] as const;
export const prototypeAtlases = [
  'bunny_idle_left','bunny_idle_right','bunny_run_left','bunny_run_right',
  'bunny_attack_left','bunny_attack_right',
  'retro_idle_left','retro_idle_right','retro_walk_left','retro_walk_right',
  'retrohat_idle_left','retrohat_idle_right','retrohat_walk_left','retrohat_walk_right',
  'mana_dapper','mana_bob',
] as const;

export function selectSprite(
  id: CharacterId, facing: number, moving: boolean,
  attacking: boolean, skill: boolean, timeMs: number,
): SpriteChoice {
  const direction = facing < 0 ? 'left' : 'right';
  if (id === 'rose') {
    const beat = Math.floor(timeMs/130);
    const frame = skill ? 7 : attacking ? 5 + beat%2 :
      moving ? 2 + beat%3 : beat%2;
    return { texture: 'hero-rose', frame, flipX: shouldFlipRose(facing) };
  }
  if (id === 'wanderer') return directionalFrame(facing,moving,timeMs);
  if (id === 'sprout') {
    const row = facing<0 ? 7 : 10;
    const index = moving ? Math.floor(timeMs/140)%4 : 0;
    return { texture: 'hero-sprout', frame: row*12+(1+3*index), flipX: false };
  }
  if (id === 'bunny') {
    const move = attacking ? 'attack' : moving ? 'run' : 'idle';
    const count = move==='attack' ? 9 : move==='run' ? 8 : 5;
    const stepMs = move==='attack' ? 88 : move==='run' ? 110 : 185;
    return {texture: 'bunny_'+move+'_'+direction,
      frame:Math.floor(timeMs/stepMs)%count,flipX:false};
  }
  if (id === 'retro' || id === 'retrohat') {
    const move = moving?'walk':'idle';
    return { texture:id+'_'+move+'_'+direction,
      frame:moving?Math.floor(timeMs/165)%3:0,flipX:false };
  }
  if (id==='mana_dapper' || id==='mana_bob')
    return {texture:id,frame:0,flipX:facing<0};
  if ((animalIds as readonly string[]).includes(id))
    return {texture:'animal-'+id,frame:0,flipX:facing<0};
  return {texture:'hero-rose',frame:0,flipX:false};
}
