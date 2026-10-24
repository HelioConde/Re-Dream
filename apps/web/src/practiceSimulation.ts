import { EMPTY_CONTROLS, type CharacterId, type Control, type Snapshot } from './protocol';

const FLOOR = 596;
const PLATFORMS = [{ x: 220, y: 466, w: 220 }, { x: 690, y: 414, w: 250 }];
const DUMMY_X = 875;
const DUMMY_HP = 260;
const PRACTICE_ID = 'offline-practice';

type TrainingPlayer = {
  x: number; y: number; vy: number; grounded: boolean; facing: number; hp: number;
  flash: number; score: number;
};
export type TrainingStats = { targetHp: number; defeated: number; strikes: number; lastDamage: number };

export class PracticeArena {
  controls: Control = { ...EMPTY_CONTROLS };
  readonly playerId = PRACTICE_ID;
  readonly characterId: CharacterId;
  readonly nickname: string;
  readonly player: TrainingPlayer = {
    x: 180, y: FLOOR, vy: 0, grounded: true, facing: 1, hp: 100,
    flash: 0, score: 0,
  };
  private now = 0;
  private nextAttack = 0;
  private nextSkill = 0;
  private resetDummyAt = 0;
  private targetFlash = 0;
  readonly stats: TrainingStats = { targetHp: DUMMY_HP, defeated: 0, strikes: 0, lastDamage: 0 };

  constructor(characterId: CharacterId = 'luci', nickname = 'Luci') {
    this.characterId = characterId;
    this.nickname = nickname.slice(0, 20) || 'Luci';
  }

  setInput(controls: Control) {
    this.controls = {
      left: controls.left === true, right: controls.right === true,
      jump: controls.jump === true, attack: controls.attack === true,
      skill: controls.skill === true,
    };
  }

  step(seconds: number) {
    const dt = Math.max(0, Math.min(seconds, .05));
    this.now += dt;
    const p = this.player;
    const dir = Number(this.controls.right) - Number(this.controls.left);
    if (dir) p.facing = Math.sign(dir);
    p.x = Math.max(22, Math.min(1258, p.x + dir * 310 * dt));
    if (this.controls.jump && p.grounded) {
      p.vy = -650;
      p.grounded = false;
    }
    const oldY = p.y;
    p.vy = Math.min(p.vy + 1600 * dt, 900);
    p.y += p.vy * dt;
    p.grounded = false;
    if (p.vy >= 0) {
      for (const platform of PLATFORMS) {
        if (oldY <= platform.y + 4 && p.y >= platform.y &&
          p.x >= platform.x + 4 && p.x <= platform.x + platform.w - 4) {
          p.y = platform.y; p.vy = 0; p.grounded = true;
        }
      }
      if (p.y >= FLOOR) { p.y = FLOOR; p.vy = 0; p.grounded = true; }
    }
    p.flash = Math.max(0, p.flash - dt);
    this.targetFlash = Math.max(0, this.targetFlash - dt);
    if (this.resetDummyAt > 0 && this.now >= this.resetDummyAt) {
      this.stats.targetHp = DUMMY_HP;
      this.resetDummyAt = 0;
    }

    if (this.controls.attack && this.now >= this.nextAttack) {
      this.hit(24, 116);
      p.flash = .16;
      this.nextAttack = this.now + .35;
    }
    if (this.controls.skill && this.now >= this.nextSkill) {
      this.hit(65, 172);
      p.flash = .35;
      this.nextSkill = this.now + 4;
    }
  }

  private hit(damage: number, range: number) {
    const p = this.player;
    this.stats.strikes++;
    this.stats.lastDamage = 0;
    if (this.stats.targetHp <= 0 || this.resetDummyAt > 0) return;
    const dx = DUMMY_X - p.x;
    if (dx * p.facing < -4 || Math.abs(dx) > range || Math.abs(p.y - FLOOR) > 92) return;
    const dealt = Math.min(this.stats.targetHp, damage);
    this.stats.targetHp -= dealt;
    this.stats.lastDamage = dealt;
    this.targetFlash = .18;
    if (this.stats.targetHp <= 0) {
      this.stats.defeated++;
      p.score += 25;
      this.resetDummyAt = this.now + 1.1;
    }
  }

  reset() {
    Object.assign(this.player, { x: 180, y: FLOOR, vy: 0, grounded: true, facing: 1, hp: 100, flash: 0, score: 0 });
    Object.assign(this.stats, { targetHp: DUMMY_HP, defeated: 0, strikes: 0, lastDamage: 0 });
    this.controls = { ...EMPTY_CONTROLS };
    this.now = 0; this.nextAttack = 0; this.nextSkill = 0; this.targetFlash = 0; this.resetDummyAt = 0;
  }

  snapshot(): Snapshot {
    const p = this.player;
    return {
      type: 'snapshot', room: 'TREINO', hostId: PRACTICE_ID,
      status: 'playing', wave: 1, remaining: this.stats.targetHp > 0 ? 1 : 0,
      players: [{ id: PRACTICE_ID, name: this.nickname, characterId: this.characterId,
        x: p.x, y: p.y, hp: p.hp, score: p.score, facing: p.facing, flash: p.flash, color: 0x86dcca }],
      enemies: this.stats.targetHp > 0 ? [{
        id: 1, x: DUMMY_X, y: FLOOR, hp: this.stats.targetHp,
        maxHp: DUMMY_HP, boss: false, flash: this.targetFlash,
      }] : [],
    };
  }
}
