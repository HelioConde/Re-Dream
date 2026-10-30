import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import Phaser from 'phaser';
import type { Control, PracticeImpact, PracticeInput, Snapshot } from './protocol';
import { readGameInput } from './inputMapping';
import { buildCombatVfx, impactColor } from './combatVfx';
import { LocalPredictor } from './prediction';
import { AttackPlayback, BASIC_ATTACK_ANIM_MS } from './attackPlayback';
import { AREN_FRAME_COUNTS, AREN_DISPLAY_SIZE, AREN_FRAME_SIZE, AREN_FOOT_ANCHOR_Y, AREN_HEALTHBAR_OFFSET_Y, AREN_NAME_OFFSET_Y, selectArenAnimation, chooseArenAction, ArenActionPhaseTracker, ArenLandingTracker, ArenComboTracker, type ArenVisualState } from './arenAnimation';

type Props = {
  snapshotRef: RefObject<Snapshot | null>;
  playerId: string;
  sendInput: (input: Control) => void;
  mobileRef: RefObject<PracticeInput>;
  practiceMode?: boolean;
};

export default function GameCanvas({ snapshotRef, playerId, sendInput, mobileRef, practiceMode = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const sendRef = useRef(sendInput);
  sendRef.current = sendInput;

  useEffect(() => {
    if (!host.current) return;
    class Dungeon extends Phaser.Scene {
      private keys!: Record<string, Phaser.Input.Keyboard.Key>;
      private draw!: Phaser.GameObjects.Graphics;
      private hitLayer!: Phaser.GameObjects.Graphics;
      private moonMist?: Phaser.GameObjects.Image;
      private nearFoliage?: Phaser.GameObjects.Image;
      private lastImpactSequence = 0;
      private impactBursts: Array<PracticeImpact & { startedAt: number }> = [];
      private reducedMotion = false;
      private lastSent = 0;
      private lastFrame = 0;
      private lastInput = '';
      private predictor = new LocalPredictor();
      private attackPlayback = new AttackPlayback();
      private arenCombos = new ArenComboTracker();
      private arenPhases = new ArenActionPhaseTracker();
      private landings = new ArenLandingTracker();
      private lastServerSnapshot: Snapshot | null = null;
      private labels = new Map<string, Phaser.GameObjects.Text>();
      private avatars = new Map<string, Phaser.GameObjects.Image>();
      private remoteMotion = new Map<string, { x: number; until: number }>();
      private positions = new Map<string, { x: number; y: number }>();

      constructor() { super('dungeon'); }
      preload() {
        // Original layered 2D fantasy art. The stage matches the authoritative
        // ground (y=596) and one-way platform locations (220/466, 690/414).
        this.load.svg('dream-stage', import.meta.env.BASE_URL + 'art/arena-dream.svg');
        this.load.svg('forest-atmosphere', import.meta.env.BASE_URL + 'art/forest-atmosphere.svg');
        this.load.svg('forest-foreground', import.meta.env.BASE_URL + 'art/forest-foreground.svg');
        // Every animation contains distinct transparent original Aren poses.
        for (const [action, count] of Object.entries(AREN_FRAME_COUNTS)) {
          for (let index = 0; index < count; index++) {
            const name = 'aren-' + action + '-' + index;
            this.load.svg(name, import.meta.env.BASE_URL + 'art/aren/' + action + '-' + index + '.svg');
          }
        }
      }
      create() {
        // Original art, single playable hero. No legacy character asset loads.
        this.cameras.main.setBackgroundColor('#142b44');
        if (this.textures.exists('dream-stage')) {
          this.add.image(640, 360, 'dream-stage').setDisplaySize(1280, 720).setDepth(-20);
        } else {
          // Loader/network fallback: gameplay remains visible and controllable.
          const fallback = this.add.graphics().setDepth(-20);
          fallback.fillGradientStyle(0x17263f, 0x294768, 0x457878, 0x244750, 1);
          fallback.fillRect(0, 0, 1280, 720);
          fallback.fillStyle(0x284e59);
          fallback.fillRect(0, 596, 1280, 124);
          fallback.fillStyle(0x82b99a);
          fallback.fillRect(0, 594, 1280, 10);
          for (const platform of [{ x: 220, y: 466, w: 220 }, { x: 690, y: 414, w: 250 }]) {
            fallback.fillStyle(0x3b6070);
            fallback.fillRoundedRect(platform.x, platform.y, platform.w, 31, 7);
            fallback.fillStyle(0x82bea3);
            fallback.fillRoundedRect(platform.x, platform.y, platform.w, 9, 5);
          }
        }
        // Distinct non-colliding authored layers: depth adds atmosphere without
        // altering the y=596 floor or the two existing one-way platforms.
        if (this.textures.exists('forest-atmosphere')) {
          this.moonMist = this.add.image(640, 360, 'forest-atmosphere')
            .setDisplaySize(1280, 720).setDepth(-11).setAlpha(.68);
        }
        if (this.textures.exists('forest-foreground')) {
          this.nearFoliage = this.add.image(640, 360, 'forest-foreground')
            .setDisplaySize(1280, 720).setDepth(6);
        }
        this.draw = this.add.graphics().setDepth(0);
        this.hitLayer = this.add.graphics().setDepth(8);
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.keys = this.input.keyboard!.addKeys(
          'A,D,W,S,J,K,LEFT,RIGHT,UP,DOWN,SPACE,Z,X',
        ) as Record<string, Phaser.Input.Keyboard.Key>;
        this.input.keyboard!.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
      }

      update(time: number) {
        const keys = this.keys;
        const mobile = mobileRef.current;
        // Both modes send the same ↓ key state. The server must own online drops.
        const input = readGameInput(keys, mobile, practiceMode);
        const inputKey = Object.values(input).map(value => Number(value)).join('');
        if (inputKey !== this.lastInput || time - this.lastSent >= 50) {
          sendRef.current(input);
          this.lastSent = time;
          this.lastInput = inputKey;
        }
        const dt = this.lastFrame ? Math.min(.05, (time - this.lastFrame) / 1000) : 1 / 60;
        this.lastFrame = time;
        // Calm ambient parallax. Reduced-motion mode holds both layers still.
        if (!this.reducedMotion) {
          if (this.moonMist) this.moonMist.x = 640 + Math.sin(time * .00016) * 11;
          if (this.nearFoliage) this.nearFoliage.x = 640 + Math.sin(time * .0004) * 3;
        }
        const g = this.draw;
        // Static authored backdrop and platforms are rendered once in create,
        // instead of redrawing the entire environment at 60 fps.
        g.clear();

        const snapshot = snapshotRef.current;
        if (!snapshot) return;
        const myself = snapshot.players.find(p => p.id === playerId);
        if (myself && !practiceMode) {
          if (snapshot !== this.lastServerSnapshot) this.predictor.sync(myself.x, myself.y, input);
          if (myself.hp > 0) this.predictor.advance(dt, input);
        }
        const freshSnapshot = snapshot !== this.lastServerSnapshot;
        this.lastServerSnapshot = snapshot;
        if (practiceMode && snapshot.impact &&
            snapshot.impact.sequence !== this.lastImpactSequence) {
          this.lastImpactSequence = snapshot.impact.sequence;
          this.spawnImpact(snapshot.impact, time);
        }
        this.renderImpactBursts(time);
        const seen = new Set<string>();
        for (const enemy of snapshot.enemies) {
          const key = 'enemy-' + enemy.id;
          seen.add(key);
          const p = this.smooth(key, enemy.x, enemy.y);
          const size = enemy.boss ? 91 : 63;
          if (practiceMode && enemy.y < 584) {
            g.fillStyle(0x08172d, 0.28);
            g.fillEllipse(enemy.x, 595, 64, 11);
            g.lineStyle(1, 0xb7f5dc, 0.23);
            g.lineBetween(enemy.x, enemy.y + 5, enemy.x, 587);
          }
          this.drawGuardian(g, p.x, p.y, size, enemy.boss, enemy.flash, time);
          this.healthbar(g, p.x - size * .72, p.y - size * 1.96,
            size * 1.44, enemy.hp / enemy.maxHp, enemy.boss ? 0xeaa4f6 : 0x91efc7);
        }

        for (const player of snapshot.players) {
          const key = 'player-' + player.id;
          seen.add(key);
          const isYou = player.id === playerId;
          const p = isYou && practiceMode
            ? { x: player.x, y: player.y }
            : isYou && this.predictor.initialized
              ? { x: this.predictor.x, y: this.predictor.y }
              : this.smooth(key, player.x, player.y);
          // Use the exact original walk-left and walk-right frame sequences.
          // No sprite mirroring: both directions exist in the supplied ZIP.
          if (freshSnapshot && !isYou) {
            const previous = this.remoteMotion.get(key);
            const moved = !!previous && Math.abs(previous.x - player.x) > 0.5;
            this.remoteMotion.set(key, { x: player.x, until: moved ? time + 220 : time - 1 });
          }
          const moving = isYou
            ? practiceMode ? Math.abs(player.velocityX ?? 0) > 10 : input.left !== input.right
            : time < (this.remoteMotion.get(key)?.until ?? 0);
          const immediateFacing = isYou && !practiceMode
            ? (input.left && !input.right ? -1 : input.right && !input.left ? 1 : player.facing)
            : player.facing;
          // Immediate cosmetic response on J, but hit registration stays on the server.
          // Remote strikes come from the server's attack flash; a held J cannot
          // restart the animation on every frame.
          const attackElapsed = isYou && practiceMode
            ? (player.combatAction === 'attack' || player.combatAction === 'air_attack' ||
               player.combatAction === 'dash_attack' || player.combatAction === 'launcher' ||
               (player.combatAction === 'dive' || player.combatAction === 'otto')
                ? player.actionElapsedMs ?? null : null)
            : this.attackPlayback.update(
                key, isYou, isYou && input.attack, player.flash,
                freshSnapshot, player.hp > 0 && snapshot.status === 'playing', time,
              );
          const attacking = attackElapsed !== null;
          const comboStage = isYou && practiceMode
            ? player.comboStage ?? 1 : this.arenCombos.update(key, attackElapsed, time);
          const airborne = isYou && practiceMode ? Boolean(player.airborne)
            : isYou ? !this.predictor.grounded :
              (player.y < 592 && Math.abs(player.y - 466) > 5 && Math.abs(player.y - 414) > 5);
          const landing = this.landings.update(key, airborne, time);
          const animationState = {
            facing: immediateFacing,
            moving,
            airborne,
            falling: isYou && practiceMode ? Boolean(player.falling)
              : isYou ? this.predictor.vy >= 0 : false,
            dashing: isYou && practiceMode && Boolean(player.dashing),
            running: isYou && practiceMode && Boolean(player.running),
            locomotion: isYou && practiceMode ? player.locomotion : undefined,
            charging: isYou && practiceMode && Boolean(player.charging),
            landing,
            hurt: player.flash > 0.5,
            combatAction: isYou && practiceMode ? player.combatAction
              : isYou && input.skill ? 'skill' : attacking ? 'attack' : undefined,
            skillLevel: player.skillLevel,
            comboStage,
            attackElapsedMs: attackElapsed ?? player.actionElapsedMs,
            timeMs: time,
          } satisfies ArenVisualState;
          const animAction = chooseArenAction(animationState);
          const animation = selectArenAnimation({
            ...animationState, actionAgeMs: this.arenPhases.elapsed(key, animAction, time),
          });
          // A charge builds in distinct visible tiers but remains a Z-only
          // action: particles are cosmetic and never alter MP or collisions.
          if (isYou && practiceMode && Boolean(player.charging) && !this.reducedMotion) {
            const tier = Math.max(0, Math.min(3, player.chargeLevel ?? 0));
            const pulse = (Math.sin(time * 0.009) + 1) * .5;
            const orbitRadius = 29 + tier * 10 + pulse * 6;
            const accent = tier === 3 ? 0xdca7ff : tier === 2 ? 0x93d9ff : 0x8ff7d5;
            this.hitLayer.lineStyle(1.6 + tier, accent, .24 + .12 * pulse);
            this.hitLayer.strokeEllipse(p.x, p.y - 72, orbitRadius * 1.7, orbitRadius * 2.05);
            for (let i = 0; i < 4 + tier * 3; i++) {
              const angle = time * .0013 + i * Math.PI * 2 / (4 + tier * 3);
              const px = p.x + Math.cos(angle) * orbitRadius;
              const py = p.y - 72 + Math.sin(angle) * orbitRadius * .75;
              this.hitLayer.fillStyle(accent, .52 + pulse * .25);
              this.hitLayer.fillCircle(px, py, 1.6 + (i % 3) * .85);
            }
          }
          // Clean ground contact speed streaks reinforce the difference
          // between a walking step and the dash→continuous-run transition.
          if (isYou && practiceMode && !this.reducedMotion && !airborne &&
              (player.dashing || player.running)) {
            const dash = Boolean(player.dashing);
            const strength = dash ? 1 : .6;
            for (let i = 0; i < (dash ? 4 : 2); i++) {
              const shift = ((time * .12 + i * 17) % 57);
              const x = p.x - player.facing * (23 + shift);
              const y = p.y - 5 - (i % 3) * 8;
              this.hitLayer.lineStyle(dash ? 3 : 2, 0xb6e9d1, (.44 - i * .065) * strength);
              this.hitLayer.lineBetween(x, y, x - player.facing * (21 + 11 * strength), y);
            }
          }
          if (isYou && practiceMode && !this.reducedMotion &&
              player.combatAction === 'skill' && (player.skillLevel ?? 1) > 1) {
            // The authored skill sprite is reused; each level gets a distinct
            // original range ring rather than an unlicensed replacement sprite.
            const level = player.skillLevel ?? 1;
            const progress = Math.min(1, (player.actionElapsedMs ?? 0) / 460);
            const tint = level === 3 ? 0xf8b1fb : 0x8fd5ff;
            this.hitLayer.lineStyle(2 + level, tint, (1 - progress) * 0.58);
            this.hitLayer.strokeCircle(p.x, p.y - 62, 28 + level * 9 + progress * 32);
          }
          if (isYou && practiceMode && !this.reducedMotion && (player.rocket || player.shadow)) {
            // Original movement trail; no borrowed images from the reference game.
            const length = player.rocket ? 82 : 34;
            const color = player.rocket ? 0x9fd6ff : 0xe7baff;
            this.hitLayer.lineStyle(player.rocket ? 5 : 3, color, 0.55);
            this.hitLayer.lineBetween(p.x - player.facing * length, p.y - 18,
              p.x - player.facing * 9, p.y - 18);
          }
          if (isYou && practiceMode && player.combatAction === 'dive' &&
              !this.reducedMotion) {
            // Original trail effect (not a fabricated sprite): visualize the plunge.
            this.hitLayer.lineStyle(6, 0x94d6ff, 0.65);
            this.hitLayer.lineBetween(p.x, p.y - 65, p.x, p.y - 8);
            this.hitLayer.lineStyle(2, 0xf6fcff, 0.9);
            this.hitLayer.lineBetween(p.x, p.y - 52, p.x, p.y - 12);
          }
          // Match the new hero's contact shadow to the stage plane.
          if (!airborne) {
            g.fillStyle(0x102a35, 0.36);
            g.fillEllipse(p.x, p.y + 1, 55, 10);
          }
          const {texture} = animation;
          let avatar = this.avatars.get(key);
          if (!avatar && this.textures.exists(texture)) {
            avatar = this.add.image(p.x, p.y, texture)
              .setOrigin(.5, 1)
              .setDisplaySize(AREN_DISPLAY_SIZE, AREN_DISPLAY_SIZE)
              .setDepth(3);
            this.avatars.set(key, avatar);
          }
          if (avatar) {
            if (avatar.texture.key !== texture && this.textures.exists(texture)) avatar.setTexture(texture);
            avatar.setFlipX(animation.flipX);
            avatar.setDisplaySize(AREN_DISPLAY_SIZE, AREN_DISPLAY_SIZE);
            // The authored frame's sole is at its bottom edge (192/192).
            // Rendering at p.y fixes the old +15px feet sinking under grass.
            const footInset = AREN_DISPLAY_SIZE * (AREN_FRAME_SIZE - AREN_FOOT_ANCHOR_Y) / AREN_FRAME_SIZE;
            avatar.setPosition(p.x, p.y + footInset);
          } else {
            // Clear loading failure rather than silently rendering an old cast.
            g.fillStyle(0x64b9b0);
            g.fillRoundedRect(p.x-16,p.y-72,32,65,6);
            g.fillStyle(0xf0d0aa);
            g.fillCircle(p.x,p.y-77,14);
          }
          // The offline player's HP and name are already in the upper-left
          // training HUD. An extra label over the sprite hid the face and
          // made the hero look larger than the rest of the stage.
          if (!practiceMode || !isYou) {
            this.healthbar(g, p.x - 24, p.y - AREN_HEALTHBAR_OFFSET_Y,
              48, player.hp / 100, 0x78d9a2);
            let label = this.labels.get(key);
            if (!label) {
              label = this.add.text(0, 0, '', {
                fontFamily: 'Arial', fontSize: '13px', color: '#ffffff',
                stroke: '#192338', strokeThickness: 4,
              }).setOrigin(.5);
              this.labels.set(key, label);
            }
            label.setText(isYou ? player.name + ' ★' : player.name);
            label.setPosition(p.x, p.y - AREN_NAME_OFFSET_Y);
          }
        }
        for (const [key, label] of this.labels) {
          if (!seen.has(key)) { label.destroy(); this.labels.delete(key); }
        }
        for (const [key, sprite] of this.avatars) {
          if (!seen.has(key)) {
            sprite.destroy();
            this.avatars.delete(key);
            this.remoteMotion.delete(key);
            this.attackPlayback.remove(key);
            this.arenCombos.remove(key);
            this.arenPhases.remove(key);
            this.landings.remove(key);
          }
        }
        for (const key of this.positions.keys()) {
          if (!seen.has(key)) this.positions.delete(key);
        }
      }

      private drawGuardian(
        g: Phaser.GameObjects.Graphics, x: number, y: number,
        size: number, boss: boolean, flash: number, time: number,
      ) {
        // Original moss-and-crystal training sentinel, not a placeholder blob.
        // Feet are anchored to enemy.y; visual geometry never changes hitboxes.
        const unit = size / 63;
        const pulse = this.reducedMotion ? 0 : Math.sin(time * 0.0021 + x * 0.04) * 2;
        const cx = x, top = y - size * 1.58 + pulse;
        g.fillStyle(0x0b2a37, 0.36);
        g.fillEllipse(cx, y + 3, size * 1.14, 13 * unit);
        g.fillStyle(boss ? 0x675b89 : 0x415569);
        g.fillRoundedRect(cx - 25 * unit, y - 32 * unit, 21 * unit, 30 * unit, 5 * unit);
        g.fillRoundedRect(cx + 5 * unit, y - 32 * unit, 21 * unit, 30 * unit, 5 * unit);
        g.fillStyle(boss ? 0x5a577b : 0x365563);
        g.fillRoundedRect(cx - 29 * unit, top + 29 * unit, 58 * unit, 67 * unit, 15 * unit);
        g.fillStyle(0x253d4d);
        g.fillRoundedRect(cx - 24 * unit, top + 38 * unit, 48 * unit, 52 * unit, 11 * unit);
        // Detached stone shoulder plates with luminous moss edging.
        g.fillStyle(0x547a73);
        g.fillRoundedRect(cx - 39 * unit, top + 33 * unit, 18 * unit, 33 * unit, 5 * unit);
        g.fillRoundedRect(cx + 21 * unit, top + 33 * unit, 18 * unit, 33 * unit, 5 * unit);
        g.lineStyle(2.3 * unit, 0x8cdbb2, 0.65);
        g.lineBetween(cx - 34 * unit, top + 37 * unit, cx - 25 * unit, top + 38 * unit);
        g.lineBetween(cx + 25 * unit, top + 38 * unit, cx + 34 * unit, top + 37 * unit);
        // The core and carved triangular crown define an unmistakable silhouette.
        g.fillStyle(boss ? 0xb58ce9 : 0x89f4da, 0.24);
        g.fillCircle(cx, top + 62 * unit, 18 * unit);
        g.fillStyle(boss ? 0xc9a7f2 : 0x7ddbc8);
        g.fillTriangle(cx, top + 46 * unit, cx + 15 * unit, top + 60 * unit, cx, top + 79 * unit);
        g.fillTriangle(cx, top + 46 * unit, cx - 15 * unit, top + 60 * unit, cx, top + 79 * unit);
        g.fillStyle(0xe1fef2, 0.88);
        g.fillTriangle(cx, top + 52 * unit, cx + 6 * unit, top + 60 * unit, cx, top + 72 * unit);
        // Carved lunar crest, beveled plates and an ambient crystal highlight.
        g.lineStyle(2 * unit, boss ? 0xe7d8ff : 0xb5f9df, .72);
        g.strokeEllipse(cx, top + 62 * unit, 43 * unit, 49 * unit);
        g.lineStyle(1.5 * unit, 0x193d4d, .72);
        g.lineBetween(cx - 25 * unit, top + 41 * unit, cx - 13 * unit, top + 54 * unit);
        g.lineBetween(cx + 25 * unit, top + 41 * unit, cx + 13 * unit, top + 54 * unit);
        g.fillStyle(0xf7ffe4, .44);
        g.fillCircle(cx + 5 * unit, top + 55 * unit, 2.4 * unit);
        g.fillStyle(boss ? 0x8c669e : 0x3f6f66);
        g.fillRoundedRect(cx - 23 * unit, top, 46 * unit, 43 * unit, 12 * unit);
        g.fillStyle(0x9fd0b8);
        g.fillTriangle(cx - 20 * unit, top + 6 * unit, cx - 33 * unit, top - 12 * unit, cx - 2 * unit, top + 7 * unit);
        g.fillTriangle(cx + 20 * unit, top + 6 * unit, cx + 33 * unit, top - 12 * unit, cx + 2 * unit, top + 7 * unit);
        g.fillStyle(0x173a49);
        g.fillRoundedRect(cx - 15 * unit, top + 16 * unit, 30 * unit, 12 * unit, 4 * unit);
        g.fillStyle(0xd1ffe7);
        g.fillCircle(cx - 7 * unit, top + 22 * unit, 3.3 * unit);
        g.fillCircle(cx + 7 * unit, top + 22 * unit, 3.3 * unit);
        if (flash > 0) {
          g.lineStyle(3 * unit, 0xfff5c3, Math.min(1, flash * 4));
          g.strokeCircle(cx, top + 54 * unit, 44 * unit);
        }
      }

      private spawnImpact(impact: PracticeImpact, time: number) {
        this.impactBursts.push({ ...impact, startedAt: time });
        const skill = impact.kind === 'skill';
        const label = this.add.text(impact.x + impact.direction * 12, impact.y - 20,
          String(impact.damage), {
            fontFamily: 'Arial, sans-serif',
            fontSize: skill ? '34px' : '28px',
            fontStyle: 'bold',
            color: '#'+impactColor(impact).toString(16).padStart(6, '0'),
            stroke: '#1b2043', strokeThickness: 7,
          }).setOrigin(.5).setDepth(10);
        this.tweens.add({
          targets: label,
          y: label.y - (this.reducedMotion ? 14 : 62),
          alpha: 0,
          duration: this.reducedMotion ? 190 : 540,
          ease: 'Cubic.easeOut',
          onComplete: () => label.destroy(),
        });
        if (!this.reducedMotion) {
          // Small camera feedback for an actual confirmed hit, never for a missed input.
          this.cameras.main.shake(skill ? 105 : 58, skill ? 0.0019 : 0.0012, true);
        }
      }

      private renderImpactBursts(now: number) {
        const g = this.hitLayer;
        g.clear();
        // No unbounded particles or external textures. Hits are spawned only
        // by the authoritative offline simulation, never by pressing Z alone.
        this.impactBursts = this.impactBursts.filter(burst =>
          now - burst.startedAt < (burst.kind === 'skill' ? 420 : 290));
        for (const burst of this.impactBursts) {
          const frame = buildCombatVfx(
            burst, now - burst.startedAt, this.reducedMotion,
          );
          for (const ring of frame.rings) {
            g.lineStyle(ring.width, ring.color, ring.alpha);
            g.strokeCircle(ring.x, ring.y, ring.radius);
          }
          for (const ray of frame.rays) {
            g.lineStyle(ray.width, ray.color, ray.alpha);
            g.lineBetween(ray.x1, ray.y1, ray.x2, ray.y2);
          }
          for (const spark of frame.sparks) {
            g.fillStyle(spark.color, spark.alpha);
            g.fillCircle(spark.x, spark.y, spark.size);
          }
        }
      }

      private drawSwipe(
        g: Phaser.GameObjects.Graphics, x: number, y: number,
        facing: number, progress: number, cat: boolean,
      ) {
        const strength = Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
        if (strength <= 0) return;
        // Three parallel diagonal claw marks that travel forward and fade.
        // Positioned above ground at the attacker's hands, not around the feet.
        const trail = cat ? 33 : 23;
        const startX = x + facing * (15 + trail * progress);
        const tint = cat ? 0xc8b1ff : 0xb5e5ef;
        for (let i = 0; i < 3; i++) {
          const fromX = startX + facing * (i * 5);
          const fromY = y - 29 - i * 12;
          const toX = fromX + facing * (cat ? 49 : 36);
          const toY = fromY - (cat ? 34 : 27);
          g.lineStyle(11, 0x8b68d6, strength * 0.19);
          g.lineBetween(fromX, fromY, toX, toY);
          g.lineStyle(cat ? 4 : 3, tint, strength * 0.86);
          g.lineBetween(fromX, fromY, toX, toY);
          g.lineStyle(1.5, 0xffffff, strength * 0.9);
          g.lineBetween(fromX + facing * 2, fromY - 3, toX - facing * 2, toY + 3);
        }
      }

      private smooth(key: string, x: number, y: number) {
        let pos = this.positions.get(key);
        if (!pos) { pos = { x, y }; this.positions.set(key, pos); }
        pos.x += (x - pos.x) * .28;
        pos.y += (y - pos.y) * .28;
        return pos;
      }

      private healthbar(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, percent: number, color: number) {
        g.fillStyle(0x152039, .86); g.fillRoundedRect(x - 2, y - 2, width + 4, 9, 4);
        g.fillStyle(color); g.fillRoundedRect(x, y, Math.max(0, width * Math.max(0, percent)), 5, 2);
      }
    }
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: 1280,
      height: 720,
      backgroundColor: '#101935',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true },
      scene: [Dungeon],
    });
    return () => { game.destroy(true); };
  }, [mobileRef, playerId, snapshotRef, practiceMode]);

  return <div ref={host} className="game-canvas" role="img" aria-label={practiceMode ? 'Arena de treino 2D com plataformas' : 'Masmorra cooperativa 2D'} />;
}
