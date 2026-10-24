import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import Phaser from 'phaser';
import type { Control, Snapshot } from './protocol';
import { LocalPredictor } from './prediction';
import { directionalFrame } from './spriteDirection';

type Props = {
  snapshotRef: RefObject<Snapshot | null>;
  playerId: string;
  sendInput: (input: Control) => void;
  mobileRef: RefObject<Control>;
};

export default function GameCanvas({ snapshotRef, playerId, sendInput, mobileRef }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const sendRef = useRef(sendInput);
  sendRef.current = sendInput;

  useEffect(() => {
    if (!host.current) return;
    class Dungeon extends Phaser.Scene {
      private keys!: Record<string, Phaser.Input.Keyboard.Key>;
      private draw!: Phaser.GameObjects.Graphics;
      private lastSent = 0;
      private lastFrame = 0;
      private lastInput = '';
      private predictor = new LocalPredictor();
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
        this.load.spritesheet('hero-rose', import.meta.env.BASE_URL + 'sprites/rose-hero-real.webp', { frameWidth: 64, frameHeight: 64 });
        // Author-provided GIF animations are packed into two real 8-frame directional strips.
        this.load.spritesheet('hero-left', import.meta.env.BASE_URL + 'sprites/imported/char/left.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('hero-right', import.meta.env.BASE_URL + 'sprites/imported/char/right.png', { frameWidth: 64, frameHeight: 64 });
      }
      create() {
        // Two actual eight-frame directional walk GIFs, with a consistent 64x64 layout.
        // The ZIP has no attack/death poses; do not invent or mislabel frames.
        this.cameras.main.setBackgroundColor('#101935');
        this.draw = this.add.graphics();
        this.keys = this.input.keyboard!.addKeys(
          'A,D,W,J,K,LEFT,RIGHT,UP,SPACE,Z,X',
        ) as Record<string, Phaser.Input.Keyboard.Key>;
        this.input.keyboard!.addCapture(['SPACE', 'UP', 'LEFT', 'RIGHT']);
      }

      update(time: number) {
        const keys = this.keys;
        const mobile = mobileRef.current;
        const input: Control = {
          left: keys.A.isDown || keys.LEFT.isDown || mobile.left,
          right: keys.D.isDown || keys.RIGHT.isDown || mobile.right,
          jump: keys.W.isDown || keys.UP.isDown || keys.SPACE.isDown || mobile.jump,
          attack: keys.J.isDown || keys.Z.isDown || mobile.attack,
          skill: keys.K.isDown || keys.X.isDown || mobile.skill,
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
        if (myself) {
          if (snapshot !== this.lastServerSnapshot) this.predictor.sync(myself.x, myself.y, input);
          if (myself.hp > 0) this.predictor.advance(dt, input);
        }
        const freshSnapshot = snapshot !== this.lastServerSnapshot;
        this.lastServerSnapshot = snapshot;
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
          const p = isYou && this.predictor.initialized
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
            ? input.left !== input.right
            : time < (this.remoteMotion.get(key)?.until ?? 0);
          const immediateFacing = isYou
            ? (input.left && !input.right ? -1 : input.right && !input.left ? 1 : player.facing)
            : player.facing;
          // Every player renders their own server-approved visual selection.
          // The Viajante already has authored left/right directions; Rosa only has
          // a single direction in this pre-alpha, so that art can be flipped.
          const rose = player.characterId === 'rose';
          const authored = directionalFrame(immediateFacing, moving, time);
          const beat = Math.floor(time / 130);
          const frame = rose
            ? (isYou && input.skill ? 7 :
                player.flash > 0 || (isYou && input.attack) ? 5 + beat % 2 :
                moving ? 2 + beat % 3 : beat % 2)
            : authored.frame;
          const texture = rose ? 'hero-rose' : authored.texture;
          let avatar = this.avatars.get(key);
          if (!avatar && this.textures.exists(texture)) {
            avatar = this.add.image(p.x, p.y, texture, frame)
              .setOrigin(.5, 1)
              .setDisplaySize(108, 108)
              .setDepth(3);
            this.avatars.set(key, avatar);
          }
          if (avatar) {
            if (avatar.texture.key !== texture) avatar.setTexture(texture, frame);
            avatar.setFrame(frame);
            avatar.setFlipX(rose && immediateFacing < 0);
            avatar.setPosition(p.x, p.y + 6);
          } else {
            g.fillStyle(0x7269bf);
            g.fillRoundedRect(p.x - 13, p.y - 56, 26, 55, 6);
            g.fillStyle(0xffdebe);
            g.fillCircle(p.x, p.y - 62, 11);
          }
          // Attack and skill graphics are transient feedback, not fabricated sprite frames.
          if (player.flash > 0) {
            g.lineStyle(4, 0xdba5fc, .9);
            g.strokeCircle(p.x + immediateFacing * 24, p.y - 44, 24);
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
          if (!seen.has(key)) { sprite.destroy(); this.avatars.delete(key); this.remoteMotion.delete(key); }
        }
        for (const key of this.positions.keys()) {
          if (!seen.has(key)) this.positions.delete(key);
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
  }, [mobileRef, playerId, snapshotRef]);

  return <div ref={host} className="game-canvas" role="img" aria-label="Masmorra cooperativa 2D" />;
}
