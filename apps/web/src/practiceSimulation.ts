import { EMPTY_CONTROLS, type CharacterId, type PracticeInput, type Snapshot } from './protocol';
import { advanceLocomotion, classifyLocomotion, type LocomotionState } from './locomotionFsm';
import { PracticeEventBus, type PracticeEventListener } from './practiceEvents';

const FLOOR = 596;
const PLATFORMS = [{ x: 220, y: 466, w: 220 }, { x: 690, y: 414, w: 250 }];
const DUMMY_X = 875;
const DUMMY_HP = 260;
const PRACTICE_ID = 'offline-practice';
const DASH_DURATION = 0.24;
// Brief chord priority allows ↓+Z Otto without making ↓ alone unresponsive.
const PLATFORM_DROP_CHORD_WINDOW = 0.12;
const DOUBLE_TAP_WINDOW = 0.29;
const COMBO_WINDOW = 1.05;
const CHASE_WINDOW = 0.55;
const JUGGLE_LIFT = -185;
const MAX_AIR_JUGGLE = 4;
// Accept fast button presses shortly before a strike becomes available.
const ATTACK_BUFFER_WINDOW = 0.17;
const MP_PER_BAR = 100;
const MAX_MP = 300;
const CHARGE_SECONDS_PER_BAR = 0.65;
const ROCKET_DURATION = 0.52;

type CombatAction = 'attack' | 'air_attack' | 'dash_attack' | 'skill' | 'launcher' | 'dive' | 'otto';
type ImpactKind = 'basic' | 'air' | 'dash' | 'skill' | 'launcher' | 'dive' | 'otto';
type TrainingPlayer = {
  x: number; y: number; vy: number; vx: number; grounded: boolean;
  facing: number; hp: number; flash: number; score: number;
  comboStage: number;
};
export type TrainingStats = {
  targetHp: number; defeated: number; strikes: number; lastDamage: number;
  combo: number; bestCombo: number; mp: number; chargePercent: number;
  dashes: number; aerialHits: number; launchers: number; dives: number;
  chaseJumps: number; juggles: number; juggleChain: number; bestJuggle: number;
  chaseReady: boolean;
  chargeLevel: number; skillCasts: number; lastSkillLevel: number;
  rocketSteps: number; shadowSteps: number; dashCancels: number; ottoShots: number;
  runs: number; drops: number; onPlatform: boolean;
  locomotion: LocomotionState;
};

/** A self-contained, deterministic arcade prototype. Multiplayer rules remain unchanged.
 * Only simulated controls enter the arena; the browser never supplies damage or coordinates.
 */
export class PracticeArena {
  controls: PracticeInput = { ...EMPTY_CONTROLS };
  readonly playerId = PRACTICE_ID;
  private readonly events = new PracticeEventBus();

  subscribe(listener: PracticeEventListener): () => void {
    return this.events.subscribe(listener);
  }
  readonly characterId: CharacterId;
  readonly nickname: string;
  readonly player: TrainingPlayer = {
    x: 180, y: FLOOR, vy: 0, vx: 0, grounded: true, facing: 1,
    hp: 100, flash: 0, score: 0, comboStage: 1,
  };
  readonly stats: TrainingStats = {
    targetHp: DUMMY_HP, defeated: 0, strikes: 0, lastDamage: 0,
    combo: 0, bestCombo: 0, mp: 100, chargePercent: 0, chargeLevel: 0, skillCasts: 0, lastSkillLevel: 0, dashes: 0, aerialHits: 0,
    launchers: 0, dives: 0,
    chaseJumps: 0, juggles: 0, juggleChain: 0, bestJuggle: 0,
    chaseReady: false,
    rocketSteps: 0, shadowSteps: 0, dashCancels: 0, ottoShots: 0,
    runs: 0, drops: 0, onPlatform: false, locomotion: 'idle',
  };

  private now = 0;
  private nextAttack = 0;
  private nextSkill = 0;
  private attackBufferUntil = Number.NEGATIVE_INFINITY;
  private impactSequence = 0;
  private lastImpactAt = Number.NEGATIVE_INFINITY;
  private lastImpactDamage = 0;
  private lastImpactDirection = 1;
  private lastImpactKind: ImpactKind = 'basic';
  private targetY = FLOOR;
  private targetVy = 0;
  private diving = false;
  private rocketUntil = 0;
  private rocketDirection = 1;
  private shadowUntil = 0;
  private currentSkillLevel: 1 | 2 | 3 = 1;
  private ottoPending = false;
  private chaseUntil = Number.NEGATIVE_INFINITY;
  private airJuggleCount = 0;
  private lastSuccessfulHit = Number.NEGATIVE_INFINITY;
  private lastLeftTap = Number.NEGATIVE_INFINITY;
  private lastRightTap = Number.NEGATIVE_INFINITY;
  private lastGroundedAt = 0;
  private jumpQueuedUntil = Number.NEGATIVE_INFINITY;
  private dropUntil = 0;
  private queuedPlatformDropAt = Number.NEGATIVE_INFINITY;
  private dashUntil = 0;
  private dashDirection = 0;
  private runArmed = false;
  private running = false;
  private runDirection = 0;
  private chargeStartedAt = 0;
  private pendingChargeRelease: number | null = null;
  private resetDummyAt = 0;
  private targetFlash = 0;
  private action: CombatAction | null = null;
  private actionStartedAt = Number.NEGATIVE_INFINITY;

  constructor(characterId: CharacterId = 'aren', nickname = 'Aren') {
    this.characterId = characterId;
    this.nickname = nickname.slice(0, 20) || 'Aren';
  }

  setInput(input: PracticeInput) {
    const next: PracticeInput = {
      left: input.left === true, right: input.right === true,
      jump: input.jump === true, attack: input.attack === true,
      // The legacy skill field is kept false in offline training: abilities
      // are exclusively selected by holding and releasing Z.
      skill: false, up: input.up === true,
      down: input.down === true, charge: input.charge === true,
      drop: input.drop === true,
    };
    if (next.left && !this.controls.left) this.tapDirection(-1);
    if (next.right && !this.controls.right) this.tapDirection(1);
    // Releasing the second tap during the dash prevents the run transition.
    // The existing short dash still completes, even after an early release.
    if (this.runArmed && !(this.runDirection < 0 ? next.left : next.right)) {
      this.runArmed = false;
    }
    if (this.running && !(this.runDirection < 0 ? next.left : next.right)) {
      this.running = false;
    }
    if (next.down && !this.controls.down && this.rocketUntil > this.now && !this.player.grounded) {
      this.shadowUntil = this.now + 0.35;
      this.rocketUntil = 0;
      this.player.vy = Math.max(670, this.player.vy);
      this.stats.shadowSteps++;
    }
    if (next.jump && !this.controls.jump) this.jumpQueuedUntil = this.now + 0.12;
    // An initial Z press produces an immediate basic attack. Holding Z still
    // charges the special; releasing it no longer repeats the initial punch.
    if ((next.attack && !this.controls.attack) || (next.charge && !this.controls.charge)) {
      this.attackBufferUntil = this.now + ATTACK_BUFFER_WINDOW;
    }
    // A new ↓ press while standing on a thin platform drops through it.
    // Allow a short chord window so pressing ↓ followed quickly by Z/J
    // still performs an Otto/ground attack instead of an unintended drop.
    if (next.jump || next.attack || next.charge) {
      this.queuedPlatformDropAt = Number.NEGATIVE_INFINITY;
    } else if (next.down && !this.controls.down && this.onOneWayPlatform()) {
      this.queuedPlatformDropAt = this.now + PLATFORM_DROP_CHORD_WINDOW;
    }
    // Keep ↓+Space as an optional immediate-drop shortcut.
    if (next.down && next.drop && !this.controls.drop && this.onOneWayPlatform()) {
      this.dropThroughPlatform();
    }
    if (next.down && this.player.grounded && this.player.y < FLOOR - 5 &&
        ((next.attack && !this.controls.attack) || (next.charge && !this.controls.charge))) {
      // Otto-style platform attack at the last 64px of either platform edge.
      this.ottoPending = PLATFORMS.some(platform => Math.abs(this.player.y - platform.y) < 3 &&
        (Math.abs(this.player.x - platform.x) <= 64 ||
         Math.abs(this.player.x - (platform.x + platform.w)) <= 64));
    }
    if (next.charge && !this.controls.charge) this.chargeStartedAt = this.now;
    if (!next.charge && this.controls.charge) {
      this.pendingChargeRelease = Math.max(0, this.now - this.chargeStartedAt);
      this.stats.chargePercent = 0;
    }
    this.controls = next;
  }

  private onOneWayPlatform(): boolean {
    const p = this.player;
    return p.grounded && PLATFORMS.some(platform =>
      Math.abs(p.y - platform.y) < 3 &&
      p.x >= platform.x + 4 && p.x <= platform.x + platform.w - 4);
  }

  private dropThroughPlatform() {
    // Never tunnel through solid ground; prevent coyote jump after dropping.
    if (!this.onOneWayPlatform()) return;
    const p = this.player;
    this.queuedPlatformDropAt = Number.NEGATIVE_INFINITY;
    this.dropUntil = this.now + 0.28;
    p.y += 9;
    p.vy = 70;
    p.grounded = false;
    this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    this.jumpQueuedUntil = Number.NEGATIVE_INFINITY;
    this.stats.drops++;
  }

  private tapDirection(dir: -1 | 1) {
    const last = dir === -1 ? this.lastLeftTap : this.lastRightTap;
    if ((this.dashUntil > this.now && this.dashDirection === -dir) ||
        (this.running && this.runDirection === -dir)) {
      // Opposite input breaks a dash early. Never triggers a reverse dash for free.
      this.dashUntil = 0;
      this.running = false;
      this.runArmed = false;
      this.stats.dashCancels++;
      this.lastLeftTap = Number.NEGATIVE_INFINITY;
      this.lastRightTap = Number.NEGATIVE_INFINITY;
      return;
    }
    if (this.now - last <= DOUBLE_TAP_WINDOW) {
      this.dashUntil = this.now + DASH_DURATION;
      this.dashDirection = dir;
      this.runDirection = dir;
      this.runArmed = true;
      this.running = false;
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
    if (this.queuedPlatformDropAt !== Number.NEGATIVE_INFINITY &&
        this.now >= this.queuedPlatformDropAt) {
      this.queuedPlatformDropAt = Number.NEGATIVE_INFINITY;
      // A quick tap of ↓ also works: release before the chord window is fine.
      if (!this.controls.jump && !this.controls.attack && !this.controls.charge) {
        this.dropThroughPlatform();
      }
    }
    // Pure locomotion FSM decides dash, run and airborne momentum for this tick.
    // Collision, jump buffers and combat remain authoritative in this arena.
    const locomotion = advanceLocomotion({
      grounded: p.grounded, vy: p.vy, direction: dir, now: this.now,
      dashUntil: this.dashUntil, dashDirection: this.dashDirection,
      rocketUntil: this.rocketUntil, rocketDirection: this.rocketDirection,
      shadowUntil: this.shadowUntil,
      runArmed: this.runArmed, running: this.running, runDirection: this.runDirection,
    });
    this.runArmed = locomotion.runArmed;
    this.running = locomotion.running;
    if (locomotion.startedRun) this.stats.runs++;
    p.vx = locomotion.vx;
    p.x = Math.max(22, Math.min(1258, p.x + p.vx * dt));

    // ↑ + attack during a grounded combo is a launcher, not a jump.
    const launchFollowUp = this.now <= this.chaseUntil && this.targetY < FLOOR - 10;
    const launcherQueued = p.grounded && !launchFollowUp && this.controls.up === true &&
      (this.controls.attack || this.now <= this.attackBufferUntil) &&
      this.stats.combo > 0 && this.now - this.lastSuccessfulHit <= COMBO_WINDOW;
    if (!launcherQueued && this.jumpQueuedUntil >= this.now &&
        (p.grounded || this.now - this.lastGroundedAt <= 0.09)) {
      // A fresh jump after the launcher cancels its recovery into an air chase.
      const chaseJump = launchFollowUp && p.grounded;
      const rocketJump = !chaseJump && p.grounded && this.dashUntil > this.now;
      p.vy = chaseJump ? -760 : rocketJump ? -690 : -650;
      if (rocketJump) {
        this.rocketUntil = this.now + ROCKET_DURATION;
        this.rocketDirection = this.dashDirection;
        this.dashUntil = 0;
        this.stats.rocketSteps++;
      }
      p.grounded = false;
      if (chaseJump) {
        this.stats.chaseJumps++;
        this.chaseUntil = Number.NEGATIVE_INFINITY;
        this.nextAttack = Math.min(this.nextAttack, this.now + 0.065);
        if (this.action === 'launcher') {
          this.action = null;
          this.actionStartedAt = Number.NEGATIVE_INFINITY;
        }
      }
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
    this.stats.onPlatform = this.onOneWayPlatform();
    this.stats.locomotion = this.currentLocomotion();
    if (p.grounded) {
      this.lastGroundedAt = this.now;
      this.diving = false;
      this.rocketUntil = 0;
      this.shadowUntil = 0;
    }
    if (this.stats.targetHp > 0 && this.targetY < FLOOR) {
      this.targetVy = Math.min(this.targetVy + 1200 * dt, 950);
      this.targetY = Math.min(FLOOR, this.targetY + this.targetVy * dt);
      if (this.targetY >= FLOOR) {
        this.targetVy = 0;
        this.airJuggleCount = 0;
        this.stats.juggleChain = 0;
        this.chaseUntil = Number.NEGATIVE_INFINITY;
      }
    }
    if (this.diving && !p.grounded && this.stats.targetHp > 0 &&
        Math.abs(DUMMY_X - p.x) <= 108 && (DUMMY_X - p.x) * p.facing >= -5 &&
        Math.abs(p.y - this.targetY) <= 64) {
      this.hit(50, 108, 64, false, 'dive');
      if (this.stats.lastDamage > 0) {
        this.diving = false;
        p.vy = -165;
        this.stats.dives++;
        this.stats.aerialHits++;
        this.recordCombo(p.comboStage);
      }
    }

    p.flash = Math.max(0, p.flash - dt);
    this.targetFlash = Math.max(0, this.targetFlash - dt);
    if (this.resetDummyAt > 0 && this.now >= this.resetDummyAt) {
      this.stats.targetHp = DUMMY_HP;
      this.targetY = FLOOR;
      this.targetVy = 0;
      this.resetDummyAt = 0;
    }
    if (this.stats.combo > 0 && this.now - this.lastSuccessfulHit > COMBO_WINDOW) {
      this.stats.combo = 0;
      this.events.publish({ type: 'comboChanged', combo: 0, bestCombo: this.stats.bestCombo });
    }
    this.stats.chaseReady = p.grounded && this.now <= this.chaseUntil &&
      this.targetY < FLOOR - 10;

    if (this.controls.charge) {
      const secondsHeld = Math.max(0, this.now - this.chargeStartedAt);
      this.stats.chargeLevel = Math.min(3, Math.floor((secondsHeld + 0.000001) / CHARGE_SECONDS_PER_BAR));
      this.stats.chargePercent = Math.min(100, Math.floor(secondsHeld /
        (CHARGE_SECONDS_PER_BAR * 3) * 100));
    }
    if (this.pendingChargeRelease !== null) {
      const held = this.pendingChargeRelease;
      this.pendingChargeRelease = null;
      const level = Math.min(3, Math.floor((held + 0.000001) / CHARGE_SECONDS_PER_BAR));
      if (level > 0) this.useSkill(level as 1 | 2 | 3);
      this.stats.chargeLevel = 0;
    }
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
    const otto = p.grounded && this.ottoPending && this.controls.down === true;
    this.ottoPending = false;
    if (otto) {
      this.dropUntil = this.now + 0.26;
      p.y += 9; p.vy = 125; p.grounded = false;
      this.hit(34, 155, 215, false, 'otto');
      if (this.stats.lastDamage > 0) this.recordCombo(p.comboStage);
      this.stats.ottoShots++;
      this.action = 'otto';
      this.actionStartedAt = this.now;
      this.nextAttack = this.now + 0.2;
      return true;
    }
    const launcher = !airborne && !(this.now <= this.chaseUntil && this.targetY < FLOOR - 10) &&
      this.controls.up === true &&
      this.stats.combo > 0 && this.now - this.lastSuccessfulHit <= COMBO_WINDOW;
    const dive = airborne && this.controls.down === true;
    if (dive) {
      this.diving = true;
      p.vy = Math.max(p.vy, 820);
      // Dive crosses one-way platforms but never the solid floor.
      this.dropUntil = this.now + 0.7;
      this.action = 'dive';
      this.actionStartedAt = this.now;
      this.nextAttack = this.now + 0.43;
      return true;
    }
    if (launcher) this.jumpQueuedUntil = Number.NEGATIVE_INFINITY;
    const chain = this.now - this.lastSuccessfulHit <= COMBO_WINDOW ? Math.min(4, p.comboStage + 1) : 1;
    const damage = launcher ? 38 : dashAttack ? 36 : airborne ? 30 : [24, 29, 35, 44][chain - 1];
    const range = launcher ? 140 : dashAttack ? 148 : airborne ? 123 : 116;
    this.hit(damage, range, airborne ? 155 : 92, false,
      launcher ? 'launcher' : dashAttack ? 'dash' : airborne ? 'air' : 'basic');
    if (launcher && this.stats.lastDamage > 0) {
      this.targetVy = -535;
      this.targetY = Math.min(this.targetY, FLOOR - 5);
      this.chaseUntil = this.now + CHASE_WINDOW;
      this.airJuggleCount = 0;
      this.stats.juggleChain = 0;
      this.stats.launchers++;
    }
    if (this.stats.lastDamage > 0) {
      this.recordCombo(chain);
      if (airborne) this.stats.aerialHits++;
    } else if (this.stats.combo === 0) p.comboStage = 1;
    p.flash = 0.16;
    this.action = launcher ? 'launcher' : dashAttack ? 'dash_attack' : airborne ? 'air_attack' : 'attack';
    this.actionStartedAt = this.now;
    this.nextAttack = this.now + (dashAttack ? 0.3 : 0.25);
    return true;
  }

  private recordCombo(stage: number) {
    this.player.comboStage = stage;
    this.stats.combo++;
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.stats.combo);
    this.lastSuccessfulHit = this.now;
    this.events.publish({
      type: 'comboChanged', combo: this.stats.combo, bestCombo: this.stats.bestCombo,
    });
  }

  private useSkill(level: 1 | 2 | 3 = 1) {
    const cost = MP_PER_BAR * level;
    if (this.now < this.nextSkill || this.stats.mp < cost) return false;
    const previousMp = this.stats.mp;
    this.stats.mp -= cost;
    this.events.publish({
      type: 'mpChanged', before: previousMp, after: this.stats.mp,
      reason: 'skill', level,
    });
    this.hit([0, 65, 115, 180][level], [0, 174, 208, 252][level],
      [0, 145, 190, 250][level], true, 'skill');
    this.nextSkill = this.now + 1.2 + level * 0.25;
    this.player.flash = 0.35 + (level - 1) * 0.12;
    this.action = 'skill';
    this.actionStartedAt = this.now;
    this.currentSkillLevel = level;
    this.stats.lastSkillLevel = level;
    this.stats.skillCasts++;
    return true;
  }

  private hit(damage: number, range: number, verticalRange: number, area: boolean,
      kind: ImpactKind) {
    const p = this.player;
    this.stats.strikes++;
    this.stats.lastDamage = 0;
    if (this.stats.targetHp <= 0 || this.resetDummyAt > 0) return;
    const dx = DUMMY_X - p.x;
    if ((!area && dx * p.facing < -4) || Math.abs(dx) > range ||
        Math.abs(p.y - this.targetY) > verticalRange) return;
    const dealt = Math.min(this.stats.targetHp, damage);
    this.stats.targetHp -= dealt;
    this.stats.lastDamage = dealt;
    const previousMp = this.stats.mp;
    this.stats.mp = Math.min(MAX_MP, this.stats.mp + Math.max(6, Math.round(dealt * 0.25)));
    this.targetFlash = 0.18;
    this.impactSequence++;
    this.lastImpactAt = this.now;
    this.lastImpactDamage = dealt;
    this.lastImpactDirection = p.facing;
    this.lastImpactKind = kind;
    // Reuse the existing impact sequence so Phaser's impact renderer remains
    // the only VFX consumer. Event Bus observers receive the same confirmed hit.
    this.events.publish({
      type: 'impactConfirmed',
      impact: {
        sequence: this.impactSequence, damage: dealt, x: DUMMY_X,
        y: this.targetY - 27, direction: p.facing, kind,
      },
    });
    if (this.stats.mp !== previousMp) {
      this.events.publish({
        type: 'mpChanged', before: previousMp, after: this.stats.mp, reason: 'hit',
      });
    }
    if (this.targetY < FLOOR - 18 && kind === 'air' &&
        this.airJuggleCount < MAX_AIR_JUGGLE) {
      // An aerial follow-up briefly lifts a launched opponent. It never
      // creates another hit; only a confirmed overlap reaches this branch.
      this.airJuggleCount++;
      this.stats.juggles++;
      this.stats.juggleChain = this.airJuggleCount;
      this.stats.bestJuggle = Math.max(this.stats.bestJuggle, this.airJuggleCount);
      this.targetVy = Math.min(this.targetVy, JUGGLE_LIFT);
      this.targetY = Math.max(155, this.targetY - 6);
    } else if (this.targetY < FLOOR - 18 && kind === 'dive') {
      // Descending finisher slams the launched dummy back toward the floor.
      this.targetVy = Math.max(this.targetVy, 540);
      this.chaseUntil = Number.NEGATIVE_INFINITY;
    }
    if (this.stats.targetHp <= 0) {
      this.stats.defeated++;
      p.score += 25;
      this.resetDummyAt = this.now + 1.1;
      this.events.publish({ type: 'dummyDefeated', total: this.stats.defeated });
    }
  }

  private currentLocomotion(): LocomotionState {
    const p = this.player;
    return classifyLocomotion({
      grounded: p.grounded, vy: p.vy, direction: Math.sign(p.vx),
      now: this.now, dashUntil: this.dashUntil,
      rocketUntil: this.rocketUntil, shadowUntil: this.shadowUntil,
      running: this.running,
    });
  }

  suspend() {
    // Pausing must never cast a charged skill as a side effect of releasing keys.
    this.controls = { ...EMPTY_CONTROLS };
    this.pendingChargeRelease = null;
    this.stats.chargePercent = 0;
    this.stats.chargeLevel = 0;
    this.ottoPending = false;
    this.queuedPlatformDropAt = Number.NEGATIVE_INFINITY;
    this.rocketUntil = 0;
    this.shadowUntil = 0;
    this.jumpQueuedUntil = Number.NEGATIVE_INFINITY;
    this.attackBufferUntil = Number.NEGATIVE_INFINITY;
    this.dashUntil = 0;
    this.runArmed = false;
    this.running = false;
    this.runDirection = 0;
    this.player.vx = 0;
    this.stats.locomotion = this.player.grounded ? 'idle' :
      this.player.vy < 0 ? 'rise' : 'fall';
    this.diving = false;
  }

  /** Training-only convenience: put Luci on a real one-way collision surface.
   * Does not change physics, map coordinates or the online server. */
  placeOnPlatformForTraining() {
    this.suspend();
    this.player.x = 320;
    this.player.y = 466;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.grounded = true;
    this.dropUntil = 0;
    this.queuedPlatformDropAt = Number.NEGATIVE_INFINITY;
    this.stats.onPlatform = true;
    this.stats.locomotion = 'idle';
  }

  reset() {
    Object.assign(this.player, {
      x: 180, y: FLOOR, vy: 0, vx: 0, grounded: true, facing: 1,
      hp: 100, flash: 0, score: 0, comboStage: 1,
    });
    Object.assign(this.stats, {
      targetHp: DUMMY_HP, defeated: 0, strikes: 0, lastDamage: 0,
      combo: 0, bestCombo: 0, mp: 100, chargePercent: 0, chargeLevel: 0, skillCasts: 0, lastSkillLevel: 0, dashes: 0, aerialHits: 0,
    launchers: 0, dives: 0,
    chaseJumps: 0, juggles: 0, juggleChain: 0, bestJuggle: 0,
    chaseReady: false,
    rocketSteps: 0, shadowSteps: 0, dashCancels: 0, ottoShots: 0,
    runs: 0, drops: 0, onPlatform: false, locomotion: 'idle',
    });
    this.controls = { ...EMPTY_CONTROLS };
    this.now = 0; this.nextAttack = 0; this.nextSkill = 0;
    this.targetY = FLOOR; this.targetVy = 0; this.diving = false;
    this.chaseUntil = Number.NEGATIVE_INFINITY; this.airJuggleCount = 0;
    // Keep impact ids monotonic: GameCanvas caches the last rendered id,
    // and resetting ids could suppress a later confirmed hit with the same id.
    this.lastImpactAt = Number.NEGATIVE_INFINITY;
    this.lastImpactDamage = 0; this.lastImpactDirection = 1; this.lastImpactKind = 'basic';
    this.lastSuccessfulHit = Number.NEGATIVE_INFINITY;
    this.attackBufferUntil = Number.NEGATIVE_INFINITY;
    this.lastLeftTap = Number.NEGATIVE_INFINITY;
    this.lastRightTap = Number.NEGATIVE_INFINITY;
    this.lastGroundedAt = 0;
    this.jumpQueuedUntil = Number.NEGATIVE_INFINITY;
    this.dropUntil = 0; this.queuedPlatformDropAt = Number.NEGATIVE_INFINITY;
    this.dashUntil = 0; this.dashDirection = 0;
    this.runArmed = false; this.running = false; this.runDirection = 0;
    this.chargeStartedAt = 0; this.pendingChargeRelease = null;
    this.currentSkillLevel = 1;
    this.rocketUntil = 0; this.rocketDirection = 1;
    this.shadowUntil = 0; this.ottoPending = false;
    this.resetDummyAt = 0; this.targetFlash = 0;
    this.action = null; this.actionStartedAt = Number.NEGATIVE_INFINITY;
    this.events.publish({ type: 'reset' });
  }

  snapshot(): Snapshot {
    const p = this.player;
    const elapsed = (this.now - this.actionStartedAt) * 1000;
    const animationDuration = this.action === 'skill' ? 460 :
      this.action === 'dive' ? 650 : this.action === 'launcher' ? 420 : 330;
    const animating = this.action && elapsed >= 0 && elapsed < animationDuration;
    const impactAge = this.now - this.lastImpactAt;
    const recoiling = impactAge >= 0 && impactAge < 0.3;
    const recoilFactor = recoiling ? Math.pow(1 - impactAge / 0.3, 2) : 0;
    const lift = this.lastImpactKind === 'skill' ? 27 :
      this.lastImpactKind === 'launcher' ? 11 : this.lastImpactKind === 'air' ? 16 : 7;
    const impact = this.impactSequence > 0 && impactAge < 0.55 ? {
      sequence: this.impactSequence, damage: this.lastImpactDamage,
      x: DUMMY_X, y: this.targetY - 27, direction: this.lastImpactDirection,
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
        dashing: this.now < this.dashUntil, running: this.running, velocityX: p.vx,
        locomotion: this.currentLocomotion(),
        charging: this.controls.charge === true,
        chargeLevel: this.stats.chargeLevel,
        rocket: this.rocketUntil > this.now && !p.grounded,
        shadow: this.shadowUntil > this.now && !p.grounded,
        skillLevel: this.action === 'skill' ? this.currentSkillLevel : undefined,
        combatAction: animating ? this.action! : undefined,
        actionElapsedMs: animating ? elapsed : undefined,
      }],
      enemies: this.stats.targetHp > 0 ? [{
        // Visual-only recoil: collision remains at DUMMY_X, preserving training accuracy.
        id: 1, x: DUMMY_X + this.lastImpactDirection * 22 * recoilFactor,
        y: this.targetY - lift * recoilFactor, hp: this.stats.targetHp,
        maxHp: DUMMY_HP, boss: false, flash: this.targetFlash,
      }] : [],
    };
  }
}
