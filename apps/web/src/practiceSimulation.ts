import { EMPTY_CONTROLS, type CharacterId, type PracticeInput, type Snapshot } from './protocol';

const FLOOR = 596;
const PLATFORMS = [{ x: 220, y: 466, w: 220 }, { x: 690, y: 414, w: 250 }];
const DUMMY_X = 875;
const DUMMY_HP = 260;
const PRACTICE_ID = 'offline-practice';
const WALK_SPEED = 310;
const DASH_SPEED = 685;
const DASH_DURATION = 0.24;
const DOUBLE_TAP_WINDOW = 0.29;
const COMBO_WINDOW = 1.05;
// Accept fast button presses shortly before a strike becomes available.
const ATTACK_BUFFER_WINDOW = 0.17;
const MP_SKILL_COST = 35;

type CombatAction = 'attack' | 'air_attack' | 'dash_attack' | 'skill';
type TrainingPlayer = {
  x: number; y: number; vy: number; vx: number; grounded: boolean;
  facing: number; hp: number; flash: number; score: number;
  comboStage: number;
};
export type TrainingStats = {
  targetHp: number; defeated: number; strikes: number; lastDamage: number;
  combo: number; bestCombo: number; mp: number; chargePercent: number;
  dashes: number; aerialHits: number;
};

/** A self-contained, deterministic arcade prototype. Multiplayer rules remain unchanged.
 * Only simulated controls enter the arena; the browser never supplies damage or coordinates.
 */
export class PracticeArena {
  controls: PracticeInput = { ...EMPTY_CONTROLS };
  readonly playerId = PRACTICE_ID;
  readonly characterId: CharacterId;
  readonly nickname: string;
  readonly player: TrainingPlayer = {
    x: 180, y: FLOOR, vy: 0, vx: 0, grounded: true, facing: 1,
    hp: 100, flash: 0, score: 0, comboStage: 1,
  };
  readonly stats: TrainingStats = {
    targetHp: DUMMY_HP, defeated: 0, strikes: 0, lastDamage: 0,
    combo: 0, bestCombo: 0, mp: 40, chargePercent: 0, dashes: 0, aerialHits: 0,
  };

  private now = 0;
  private nextAttack = 0;
  private nextSkill = 0;
  private attackBufferUntil = Number.NEGATIVE_INFINITY;
  private impactSequence = 0;
  private lastImpactAt = Number.NEGATIVE_INFINITY;
  private lastImpactDamage = 0;
  private lastImpactDirection = 1;
  private lastImpactKind: 'basic' | 'air' | 'dash' | 'skill' = 'basic';
  private lastSuccessfulHit = Number.NEGATIVE_INFINITY;
  private lastLeftTap = Number.NEGATIVE_INFINITY;
  private lastRightTap = Number.NEGATIVE_INFINITY;
  private lastGroundedAt = 0;
  private jumpQueuedUntil = Number.NEGATIVE_INFINITY;
  private dropUntil = 0;
  private dashUntil = 0;
  private dashDirection = 0;
  private chargeStartedAt = 0;
  private pendingChargeRelease: number | null = null;
  private resetDummyAt = 0;
  private targetFlash = 0;
  private action: CombatAction | null = null;
  private actionStartedAt = Number.NEGATIVE_INFINITY;

  constructor(characterId: CharacterId = 'luci', nickname = 'Luci') {
    this.characterId = characterId;
    this.nickname = nickname.slice(0, 20) || 'Luci';
  }

  setInput(input: PracticeInput) {
    const next: PracticeInput = {
      left: input.left === true, right: input.right === true,
      jump: input.jump === true, attack: input.attack === true,
      skill: input.skill === true, down: input.down === true, charge: input.charge === true,
    };
    if (next.left && !this.controls.left) this.tapDirection(-1);
    if (next.right && !this.controls.right) this.tapDirection(1);
    if (next.jump && !this.controls.jump) this.jumpQueuedUntil = this.now + 0.12;
    // An initial Z press produces an immediate basic attack. Holding Z still
    // charges the special; releasing it no longer repeats the initial punch.
    if ((next.attack && !this.controls.attack) || (next.charge && !this.controls.charge)) {
      this.attackBufferUntil = this.now + ATTACK_BUFFER_WINDOW;
    }
    if (next.down && !this.controls.down && this.player.grounded && this.player.y < FLOOR - 5) {
      // Pass through one-way platforms, never the solid ground.
      this.dropUntil = this.now + 0.26;
      this.player.y += 9;
      this.player.vy = 70;
      this.player.grounded = false;
      this.jumpQueuedUntil = Number.NEGATIVE_INFINITY;
    }
    if (next.charge && !this.controls.charge) this.chargeStartedAt = this.now;
    if (!next.charge && this.controls.charge) {
      this.pendingChargeRelease = Math.max(0, this.now - this.chargeStartedAt);
      this.stats.chargePercent = 0;
    }
    this.controls = next;
  }

  private tapDirection(dir: -1 | 1) {
    const last = dir === -1 ? this.lastLeftTap : this.lastRightTap;
    if (this.now - last <= DOUBLE_TAP_WINDOW) {
      this.dashUntil = this.now + DASH_DURATION;
      this.dashDirection = dir;
      this.stats.dashes++;
      this.lastLeftTap = Number.NEGATIVE_INFINITY;
      this.lastRightTap = Number.NEGATIVE_INFINITY;
    } else if (dir === -1) this.lastLeftTap = this.now;
    else this.lastRightTap = this.now;
  }

  step(seconds: number) {
    const dt = Math.max(0, Math.min(seconds, 0.05));
    if (dt === 0) return;
    this.now += dt;
    const p = this.player;
    const dir = Number(this.controls.right) - Number(this.controls.left);
    if (dir !== 0) p.facing = Math.sign(dir);
    const dashing = this.dashUntil > this.now;
    const velocityDirection = dashing ? this.dashDirection : dir;
    p.vx = velocityDirection * (dashing ? DASH_SPEED : WALK_SPEED);
    p.x = Math.max(22, Math.min(1258, p.x + p.vx * dt));

    if (this.jumpQueuedUntil >= this.now && (p.grounded || this.now - this.lastGroundedAt <= 0.09)) {
      p.vy = -650;
      p.grounded = false;
      this.lastGroundedAt = Number.NEGATIVE_INFINITY;
      this.jumpQueuedUntil = Number.NEGATIVE_INFINITY;
    }
    const oldY = p.y;
    p.vy = Math.min(p.vy + 1600 * dt, 900);
    p.y += p.vy * dt;
    p.grounded = false;
    if (p.vy >= 0) {
      if (this.now >= this.dropUntil) {
        for (const platform of PLATFORMS) {
          if (oldY <= platform.y + 4 && p.y >= platform.y &&
              p.x >= platform.x + 4 && p.x <= platform.x + platform.w - 4) {
            p.y = platform.y; p.vy = 0; p.grounded = true;
            break;
          }
        }
      }
      if (p.y >= FLOOR) { p.y = FLOOR; p.vy = 0; p.grounded = true; }
    }
    if (p.grounded) this.lastGroundedAt = this.now;

    p.flash = Math.max(0, p.flash - dt);
    this.targetFlash = Math.max(0, this.targetFlash - dt);
    if (this.resetDummyAt > 0 && this.now >= this.resetDummyAt) {
      this.stats.targetHp = DUMMY_HP;
      this.resetDummyAt = 0;
    }
    if (this.now - this.lastSuccessfulHit > COMBO_WINDOW) this.stats.combo = 0;

    if (this.controls.charge) {
      this.stats.chargePercent = Math.min(100, Math.floor((this.now - this.chargeStartedAt) / 0.65 * 100));
    }
    if (this.pendingChargeRelease !== null) {
      const held = this.pendingChargeRelease;
      this.pendingChargeRelease = null;
      if (held >= 0.65 && this.stats.mp >= MP_SKILL_COST) this.useSkill();
    }
    if (this.controls.skill) this.useSkill();
    // J can be held to repeat for accessibility; a fast tap is buffered.
    // Holding Z charges without auto-repeating basic strikes.
    if ((this.controls.attack || this.now <= this.attackBufferUntil) &&
        this.useBasicAttack()) this.attackBufferUntil = Number.NEGATIVE_INFINITY;
  }

  private useBasicAttack(): boolean {
    if (this.now < this.nextAttack) return false;
    const p = this.player;
    const airborne = !p.grounded;
    const dashAttack = this.now < this.dashUntil && !airborne;
    const chain = this.now - this.lastSuccessfulHit <= COMBO_WINDOW ? Math.min(4, p.comboStage + 1) : 1;
    const damage = dashAttack ? 36 : airborne ? 30 : [24, 29, 35, 44][chain - 1];
    const range = dashAttack ? 148 : airborne ? 123 : 116;
    this.hit(damage, range, airborne ? 155 : 92, false,
      dashAttack ? 'dash' : airborne ? 'air' : 'basic');
    if (this.stats.lastDamage > 0) {
      p.comboStage = chain;
      this.stats.combo++;
      this.stats.bestCombo = Math.max(this.stats.bestCombo, this.stats.combo);
      this.lastSuccessfulHit = this.now;
      if (airborne) this.stats.aerialHits++;
    } else if (this.stats.combo === 0) p.comboStage = 1;
    p.flash = 0.16;
    this.action = dashAttack ? 'dash_attack' : airborne ? 'air_attack' : 'attack';
    this.actionStartedAt = this.now;
    this.nextAttack = this.now + (dashAttack ? 0.3 : 0.25);
    return true;
  }

  private useSkill() {
    if (this.now < this.nextSkill || this.stats.mp < MP_SKILL_COST) return;
    this.stats.mp -= MP_SKILL_COST;
    this.hit(65, 174, 145, true, 'skill');
    this.nextSkill = this.now + 1.45;
    this.player.flash = 0.35;
    this.action = 'skill';
    this.actionStartedAt = this.now;
  }

  private hit(damage: number, range: number, verticalRange: number, area: boolean,
      kind: 'basic' | 'air' | 'dash' | 'skill') {
    const p = this.player;
    this.stats.strikes++;
    this.stats.lastDamage = 0;
    if (this.stats.targetHp <= 0 || this.resetDummyAt > 0) return;
    const dx = DUMMY_X - p.x;
    if ((!area && dx * p.facing < -4) || Math.abs(dx) > range ||
        Math.abs(p.y - FLOOR) > verticalRange) return;
    const dealt = Math.min(this.stats.targetHp, damage);
    this.stats.targetHp -= dealt;
    this.stats.lastDamage = dealt;
    this.stats.mp = Math.min(100, this.stats.mp + Math.max(6, Math.round(dealt * 0.25)));
    this.targetFlash = 0.18;
    this.impactSequence++;
    this.lastImpactAt = this.now;
    this.lastImpactDamage = dealt;
    this.lastImpactDirection = p.facing;
    this.lastImpactKind = kind;
    if (this.stats.targetHp <= 0) {
      this.stats.defeated++;
      p.score += 25;
      this.resetDummyAt = this.now + 1.1;
    }
  }

  suspend() {
    // Pausing must never cast a charged skill as a side effect of releasing keys.
    this.controls = { ...EMPTY_CONTROLS };
    this.pendingChargeRelease = null;
    this.stats.chargePercent = 0;
    this.jumpQueuedUntil = Number.NEGATIVE_INFINITY;
    this.attackBufferUntil = Number.NEGATIVE_INFINITY;
    this.dashUntil = 0;
    this.player.vx = 0;
  }

  reset() {
    Object.assign(this.player, {
      x: 180, y: FLOOR, vy: 0, vx: 0, grounded: true, facing: 1,
      hp: 100, flash: 0, score: 0, comboStage: 1,
    });
    Object.assign(this.stats, {
      targetHp: DUMMY_HP, defeated: 0, strikes: 0, lastDamage: 0,
      combo: 0, bestCombo: 0, mp: 40, chargePercent: 0, dashes: 0, aerialHits: 0,
    });
    this.controls = { ...EMPTY_CONTROLS };
    this.now = 0; this.nextAttack = 0; this.nextSkill = 0;
    this.impactSequence = 0; this.lastImpactAt = Number.NEGATIVE_INFINITY;
    this.lastImpactDamage = 0; this.lastImpactDirection = 1; this.lastImpactKind = 'basic';
    this.lastSuccessfulHit = Number.NEGATIVE_INFINITY;
    this.lastLeftTap = Number.NEGATIVE_INFINITY;
    this.lastRightTap = Number.NEGATIVE_INFINITY;
    this.lastGroundedAt = 0;
    this.jumpQueuedUntil = Number.NEGATIVE_INFINITY;
    this.dropUntil = 0; this.dashUntil = 0; this.dashDirection = 0;
    this.chargeStartedAt = 0; this.pendingChargeRelease = null;
    this.resetDummyAt = 0; this.targetFlash = 0;
    this.action = null; this.actionStartedAt = Number.NEGATIVE_INFINITY;
  }

  snapshot(): Snapshot {
    const p = this.player;
    const elapsed = (this.now - this.actionStartedAt) * 1000;
    const animationDuration = this.action === 'skill' ? 460 : 330;
    const animating = this.action && elapsed >= 0 && elapsed < animationDuration;
    const impactAge = this.now - this.lastImpactAt;
    const recoiling = impactAge >= 0 && impactAge < 0.3;
    const recoilFactor = recoiling ? Math.pow(1 - impactAge / 0.3, 2) : 0;
    const lift = this.lastImpactKind === 'skill' ? 27 : this.lastImpactKind === 'air' ? 16 : 7;
    const impact = this.impactSequence > 0 && impactAge < 0.55 ? {
      sequence: this.impactSequence, damage: this.lastImpactDamage,
      x: DUMMY_X, y: FLOOR - 27, direction: this.lastImpactDirection,
      kind: this.lastImpactKind,
    } as const : undefined;
    return {
      impact,
      type: 'snapshot', room: 'TREINO', hostId: PRACTICE_ID,
      status: 'playing', wave: 1, remaining: this.stats.targetHp > 0 ? 1 : 0,
      players: [{
        id: PRACTICE_ID, name: this.nickname, characterId: this.characterId,
        x: p.x, y: p.y, hp: p.hp, score: p.score, facing: p.facing,
        flash: p.flash, color: 0x86dcca, comboStage: p.comboStage,
        airborne: !p.grounded, falling: p.vy >= 0,
        dashing: this.now < this.dashUntil, velocityX: p.vx,
        combatAction: animating ? this.action! : undefined,
        actionElapsedMs: animating ? elapsed : undefined,
      }],
      enemies: this.stats.targetHp > 0 ? [{
        // Visual-only recoil: collision remains at DUMMY_X, preserving training accuracy.
        id: 1, x: DUMMY_X + this.lastImpactDirection * 22 * recoilFactor,
        y: FLOOR - lift * recoilFactor, hp: this.stats.targetHp,
        maxHp: DUMMY_HP, boss: false, flash: this.targetFlash,
      }] : [],
    };
  }
}
