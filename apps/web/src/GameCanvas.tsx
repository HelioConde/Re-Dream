import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import Phaser from 'phaser';
import type { Control, PracticeImpact, PracticeInput, Snapshot } from './protocol';
import { LocalPredictor } from './prediction';
import { selectSprite, animalIds, prototypeAtlases } from './characterAnimation';
import { AttackPlayback, BASIC_ATTACK_ANIM_MS } from './attackPlayback';
import { LUCI_ANIMATION_KEYS, LUCI_FRAME_SIZE, LUCI_DISPLAY_SIZE, selectLuciAnimation, LuciComboTracker } from './luciAnimation';

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
      private lastImpactSequence = 0;
      private impactBursts: Array<PracticeImpact & { startedAt: number }> = [];
      private reducedMotion = false;
      private lastSent = 0;
      private lastFrame = 0;
      private lastInput = '';
      private predictor = new LocalPredictor();
      private attackPlayback = new AttackPlayback();
      private luciCombos = new LuciComboTracker();
      private lastServerSnapshot: Snapshot | null = null;
      private labels = new Map<string, Phaser.GameObjects.Text>();
      private avatars = new Map<string, Phaser.GameObjects.Image>();
      private remoteMotion = new Map<string, { x: number; until: number }>();
      private positions = new Map<string, { x: number; y: number }>();
      private stars = Array.from({ length: 46 }, (_, i) => ({
        x: (i * 311 + 67) % 1280, y: (i * 113 + 31) % 520, phase: i * 0.73,
      }));

      constructor() { super('dungeon'); }
      preload() {
        for (const key of LUCI_ANIMATION_KEYS) {
          this.load.spritesheet('luci_' + key,
            import.meta.env.BASE_URL + 'sprites/luci/' + key + '.png',
            { frameWidth: LUCI_FRAME_SIZE, frameHeight: LUCI_FRAME_SIZE });
        }
        this.load.spritesheet('hero-rose', import.meta.env.BASE_URL + 'sprites/rose-hero-real.webp', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('hero-sprout',import.meta.env.BASE_URL+'sprites/imported/sprout/sprout-character.png',{frameWidth:16,frameHeight:16});
        for(const id of prototypeAtlases) {
          this.load.spritesheet(id,import.meta.env.BASE_URL+'sprites/prototype/'+id+'.png',{frameWidth:64,frameHeight:64});
        }
        for(const animal of animalIds) {
          // A static 32x32 animal still needs a numbered frame for setFrame(0).
          this.load.spritesheet('animal-'+animal,import.meta.env.BASE_URL+'sprites/imported/animals/'+animal+'.png',{frameWidth:32,frameHeight:32});
        }
        // Author-provided GIF animations are packed into two real 8-frame directional strips.
        this.load.spritesheet('hero-left', import.meta.env.BASE_URL + 'sprites/imported/char/left.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('hero-right', import.meta.env.BASE_URL + 'sprites/imported/char/right.png', { frameWidth: 64, frameHeight: 64 });
      }
      create() {
        // Two actual eight-frame directional walk GIFs, with a consistent 64x64 layout.
        // The ZIP has no attack/death poses; do not invent or mislabel frames.
        this.cameras.main.setBackgroundColor('#101935');
        this.draw = this.add.graphics();
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
        const input: PracticeInput = {
          left: keys.A.isDown || keys.LEFT.isDown || mobile.left,
          right: keys.D.isDown || keys.RIGHT.isDown || mobile.right,
          jump: keys.W.isDown || keys.UP.isDown || keys.SPACE.isDown || mobile.jump,
          attack: keys.J.isDown || (!practiceMode && keys.Z.isDown) || mobile.attack,
          skill: keys.K.isDown || keys.X.isDown || mobile.skill,
          ...(practiceMode ? {
            down: keys.S.isDown || keys.DOWN.isDown || mobile.down === true,
            charge: keys.Z.isDown,
          } : {}),
        };
        const inputKey = Object.values(input).map(value => Number(value)).join('');
        if (inputKey !== this.lastInput || time - this.lastSent >= 50) {
          sendRef.current(input);
          this.lastSent = time;
          this.lastInput = inputKey;
        }
        const dt = this.lastFrame ? Math.min(.05, (time - this.lastFrame) / 1000) : 1 / 60;
        this.lastFrame = time;

        const g = this.draw;
        g.clear();
        g.fillGradientStyle(0x111830, 0x151f41, 0x34416a, 0x183959, 1);
        g.fillRect(0, 0, 1280, 720);
        g.fillStyle(0xd9c4ff, 0.16);
        g.fillCircle(1070, 125, 86);
        g.fillStyle(0xf6eaff, 0.88);
        g.fillCircle(1070, 125, 51);
        for (const s of this.stars) {
          g.fillStyle(0xcbbfff, 0.28 + Math.sin(time * .0013 + s.phase) * .2);
          g.fillCircle(s.x, s.y + Math.sin(time * .0008 + s.phase) * 7, 1.8);
        }
        g.fillStyle(0x25375a, .85);
        g.fillTriangle(0, 510, 285, 205, 575, 510);
        g.fillTriangle(305, 510, 655, 245, 1040, 510);
        g.fillTriangle(795, 510, 1120, 270, 1280, 510);
        g.fillStyle(0x1e4354, 1);
        for (let i = 0; i < 18; i++) {
          const x = i * 78;
          g.fillRect(x, 382 + (i % 4) * 18, 17, 210);
          g.fillCircle(x + 9, 385 + (i % 4) * 18, 48);
        }
        g.fillStyle(0x243b49);
        g.fillRect(0, 600, 1280, 120);
        g.fillStyle(0x8eb8a5);
        g.fillRect(0, 596, 1280, 9);
        for (const platform of [{ x: 220, y: 466, w: 220 }, { x: 690, y: 414, w: 250 }]) {
          g.fillStyle(0x395566);
          g.fillRoundedRect(platform.x, platform.y, platform.w, 20, 5);
          g.fillStyle(0xa1cba5);
          g.fillRoundedRect(platform.x, platform.y, platform.w, 7, 4);
        }

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
          const size = enemy.boss ? 58 : 31;
          g.fillStyle(enemy.boss ? 0xb65bce : 0x50b7ad);
          g.fillEllipse(p.x, p.y - size * .7, size * 1.5, size * 1.3);
          g.fillStyle(0xf7edf9);
          g.fillCircle(p.x - size * .25, p.y - size * .8, size * .1);
          g.fillCircle(p.x + size * .25, p.y - size * .8, size * .1);
          g.fillStyle(0x241f41);
          g.fillCircle(p.x - size * .25, p.y - size * .8, size * .05);
          g.fillCircle(p.x + size * .25, p.y - size * .8, size * .05);
          this.healthbar(g, p.x - size * .7, p.y - size * 1.7, size * 1.4, enemy.hp / enemy.maxHp, 0xed91e0);
          if (enemy.flash > 0) {
            g.lineStyle(4, 0xfff9e9, .85);
            g.strokeCircle(p.x, p.y - size * .7, size * 1.1);
          }
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
            ? (player.combatAction === 'attack' || player.combatAction === 'air_attack' || player.combatAction === 'dash_attack'
                ? player.actionElapsedMs ?? null : null)
            : this.attackPlayback.update(
                key, isYou, isYou && input.attack, player.flash,
                freshSnapshot, player.hp > 0 && snapshot.status === 'playing', time,
              );
          const attacking = attackElapsed !== null;
          const comboStage = isYou && practiceMode
            ? player.comboStage ?? 1
            : player.characterId === 'luci'
              ? this.luciCombos.update(key, attackElapsed, time) : 1;
          const animation = player.characterId === 'luci'
            ? selectLuciAnimation({
                facing: immediateFacing,
                moving,
                airborne: isYou && practiceMode ? Boolean(player.airborne) : isYou ? !this.predictor.grounded :
                  (player.y < 592 && Math.abs(player.y - 466) > 5 && Math.abs(player.y - 414) > 5),
                falling: isYou && practiceMode ? Boolean(player.falling) : isYou ? this.predictor.vy >= 0 : false,
                attacking,
                skill: isYou && practiceMode ? player.combatAction === 'skill' : isYou && input.skill,
                dashing: isYou && practiceMode && Boolean(player.dashing),
                dashAttacking: isYou && practiceMode && player.combatAction === 'dash_attack',
                comboStage,
                attackElapsed,
                timeMs: isYou && practiceMode && player.combatAction === 'skill'
                  ? player.actionElapsedMs ?? 0 : time,
              })
            : selectSprite(
                player.characterId, immediateFacing, moving,
                attacking, isYou && input.skill, attackElapsed ?? time,
              );
          const {texture,frame} = animation;
          let avatar = this.avatars.get(key);
          if (!avatar && this.textures.exists(texture)) {
            avatar = this.add.image(p.x, p.y, texture, frame)
              .setOrigin(.5, 1)
              .setDisplaySize(player.characterId === 'luci' ? LUCI_DISPLAY_SIZE : 108, player.characterId === 'luci' ? LUCI_DISPLAY_SIZE : 108)
              .setDepth(3);
            this.avatars.set(key, avatar);
          }
          if (avatar) {
            if (avatar.texture.key !== texture) avatar.setTexture(texture, frame);
            avatar.setFrame(frame);
            avatar.setFlipX(animation.flipX);
            avatar.setDisplaySize(player.characterId === 'luci' ? LUCI_DISPLAY_SIZE : 108, player.characterId === 'luci' ? LUCI_DISPLAY_SIZE : 108);
            // Tiny anticipation and recoil only for the static animal art.
            // No artificial animation frames are generated.
            const isCat = player.characterId === 'cat';
            const phase = attackElapsed === null ? 0 : attackElapsed / BASIC_ATTACK_ANIM_MS;
            avatar.setRotation(isCat && attacking ? immediateFacing * 0.085 * Math.sin(phase * Math.PI) : 0);
            avatar.setPosition(
              p.x + (isCat && attacking ? immediateFacing * 8 * Math.sin(phase * Math.PI) : 0),
              p.y + 6 - (isCat && attacking ? 4 * Math.sin(phase * Math.PI) : 0),
            );
          } else {
            g.fillStyle(0x7269bf);
            g.fillRoundedRect(p.x - 13, p.y - 56, 26, 55, 6);
            g.fillStyle(0xffdebe);
            g.fillCircle(p.x, p.y - 62, 11);
          }
          // The Bunny already has authentic sword frames; don't overlay a
          // generic circle. Static animals receive a short directional claw
          // swipe instead of a misleading fake character animation.
          if (attacking && player.characterId !== 'bunny' && player.characterId !== 'luci') {
            this.drawSwipe(g, p.x, p.y, immediateFacing, attackElapsed! / BASIC_ATTACK_ANIM_MS,
              player.characterId === 'cat');
          }
          this.healthbar(g, p.x - 24, p.y - 101, 48, player.hp / 100, 0x78d9a2);
          let label = this.labels.get(key);
          if (!label) {
            label = this.add.text(0, 0, '', {
              fontFamily: 'Arial', fontSize: '15px', color: '#ffffff',
              stroke: '#192338', strokeThickness: 4,
            }).setOrigin(.5);
            this.labels.set(key, label);
          }
          label.setText(isYou ? player.name + ' ★' : player.name);
          label.setPosition(p.x, p.y - 120);
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
            this.luciCombos.remove(key);
          }
        }
        for (const key of this.positions.keys()) {
          if (!seen.has(key)) this.positions.delete(key);
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
            color: skill ? '#f3c8ff' : '#fff5c9',
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
        this.impactBursts = this.impactBursts.filter(burst => now - burst.startedAt < 260);
        if (this.reducedMotion) return;
        for (const burst of this.impactBursts) {
          const t = Math.min(1, (now - burst.startedAt) / 260);
          const size = burst.kind === 'skill' ? 66 : 42;
          const alpha = Math.max(0, 1 - t);
          const color = burst.kind === 'skill' ? 0xd7a2ff : 0xffdfa0;
          g.lineStyle(5 * (1 - t * 0.65), color, alpha * 0.9);
          g.strokeCircle(burst.x, burst.y, 8 + size * t);
          for (let i = 0; i < 8; i++) {
            const angle = Math.PI * 2 * i / 8;
            const dist = 12 + size * t;
            g.lineStyle(3, 0xffffff, alpha * 0.8);
            g.lineBetween(burst.x + Math.cos(angle) * (dist - 8),
              burst.y + Math.sin(angle) * (dist - 8),
              burst.x + Math.cos(angle) * dist,
              burst.y + Math.sin(angle) * dist);
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
