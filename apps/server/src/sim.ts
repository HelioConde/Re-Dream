export type Control = { left: boolean; right: boolean; jump: boolean; attack: boolean; skill: boolean };
export type Status = 'lobby' | 'playing' | 'victory' | 'defeat';

type Fighter = {
  id: string; name: string; x: number; y: number; vx: number; vy: number;
  grounded: boolean; hp: number; score: number; facing: number; flash: number; color: number;
  nextAttack: number; nextSkill: number; controls: Control;
};
type Mob = {
  id: number; x: number; y: number; hp: number; maxHp: number;
  boss: boolean; flash: number; nextAttack: number;
};

const EMPTY: Control = { left: false, right: false, jump: false, attack: false, skill: false };
const FLOOR = 596;
const PLATFORMS = [{ x: 220, y: 466, w: 220 }, { x: 690, y: 414, w: 250 }];
const COLORS = [0x9ba9ed, 0x91cbbb, 0xf0a6c5, 0xe7c078];

export class GameRoom {
  readonly players = new Map<string, Fighter>();
  enemies: Mob[] = [];
  status: Status = 'lobby';
  hostId = '';
  wave = 1;
  private now = 0;
  private mobCounter = 0;

  constructor(public readonly code: string) {}

  get size() { return this.players.size; }

  addPlayer(id: string, name: string): void {
    if (this.players.size >= 4) throw new Error('Esta sala está cheia (máximo de 4 jogadores).');
    if (this.status !== 'lobby') throw new Error('A aventura já começou. Aguarde uma nova sala.');
    if (!this.hostId) this.hostId = id;
    const slot = this.players.size;
    this.players.set(id, {
      id, name: name.trim().slice(0, 20), x: 140 + slot * 76, y: FLOOR,
      vx: 0, vy: 0, grounded: true, hp: 100, score: 0, facing: 1, flash: 0,
      color: COLORS[slot], nextAttack: 0, nextSkill: 0, controls: { ...EMPTY },
    });
  }

  removePlayer(id: string) {
    this.players.delete(id);
    if (this.hostId === id) this.hostId = this.players.keys().next().value ?? '';
  }

  start(playerId: string): boolean {
    if (this.status !== 'lobby' || this.hostId !== playerId || this.size === 0) return false;
    this.wave = 1;
    this.spawnWave();
    this.status = 'playing';
    return true;
  }

  setInput(id: string, controls: Control) {
    const player = this.players.get(id);
    if (!player) return;
    player.controls = {
      left: controls.left === true, right: controls.right === true,
      jump: controls.jump === true, attack: controls.attack === true,
      skill: controls.skill === true,
    };
  }

  private spawnWave() {
    const total = this.wave === 1 ? 3 : this.wave === 2 ? 5 : 4;
    this.enemies = Array.from({ length: total }, (_, i) => {
      const boss = this.wave === 3 && i === total - 1;
      const maxHp = boss ? 260 : this.wave === 2 ? 75 : 55;
      return {
        id: ++this.mobCounter, x: 760 + i * 98, y: FLOOR,
        hp: maxHp, maxHp, boss, flash: 0, nextAttack: 0,
      };
    });
  }

  step(dt: number) {
    if (this.status !== 'playing' || this.players.size === 0) return;
    // Fixed-time authoritative simulation. No client coordinates or damage are accepted.
    dt = Math.min(Math.max(dt, 0), 1 / 20);
    this.now += dt;
    const living = [...this.players.values()].filter(p => p.hp > 0);
    if (living.length === 0) { this.status = 'defeat'; return; }

    for (const player of living) {
      player.flash = Math.max(0, player.flash - dt);
      const input = player.controls;
      const direction = Number(input.right) - Number(input.left);
      if (direction) player.facing = Math.sign(direction);
      player.vx = direction * 310;
      player.x = Math.max(22, Math.min(1258, player.x + player.vx * dt));
      if (input.jump && player.grounded) {
        player.vy = -650;
        player.grounded = false;
      }
      const oldY = player.y;
      player.vy = Math.min(player.vy + 1600 * dt, 900);
      player.y += player.vy * dt;
      player.grounded = false;
      if (player.vy >= 0) {
        for (const platform of PLATFORMS) {
          if (oldY <= platform.y + 4 && player.y >= platform.y &&
            player.x >= platform.x + 4 && player.x <= platform.x + platform.w - 4) {
            player.y = platform.y;
            player.vy = 0;
            player.grounded = true;
          }
        }
        if (player.y >= FLOOR) {
          player.y = FLOOR;
          player.vy = 0;
          player.grounded = true;
        }
      }
      if (input.attack && this.now >= player.nextAttack) {
        this.hit(player, 24, 100, false);
        player.nextAttack = this.now + 0.35;
        player.flash = 0.16;
      }
      if (input.skill && this.now >= player.nextSkill) {
        this.hit(player, 65, 170, true);
        player.nextSkill = this.now + 4;
        player.flash = 0.35;
      }
    }

    for (const mob of this.enemies) {
      if (mob.hp <= 0) continue;
      mob.flash = Math.max(0, mob.flash - dt);
      const targets = [...this.players.values()].filter(p => p.hp > 0);
      if (!targets.length) break;
      const nearest = targets.reduce((best, p) => Math.abs(p.x - mob.x) < Math.abs(best.x - mob.x) ? p : best);
      const dx = nearest.x - mob.x;
      const dy = nearest.y - mob.y;
      if (Math.abs(dx) > 42) mob.x += Math.sign(dx) * (mob.boss ? 74 : 56) * dt;
      if (Math.abs(dx) < (mob.boss ? 64 : 45) && Math.abs(dy) < 68 && this.now >= mob.nextAttack) {
        nearest.hp = Math.max(0, nearest.hp - (mob.boss ? 22 : 9));
        mob.nextAttack = this.now + (mob.boss ? 1.4 : 1.8);
      }
    }

    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.enemies.length === 0) {
      if (this.wave === 3) {
        this.status = 'victory';
        for (const p of this.players.values()) p.score += 150;
      } else {
        this.wave++;
        this.spawnWave();
      }
    }
    if ([...this.players.values()].every(p => p.hp <= 0)) this.status = 'defeat';
  }

  private hit(player: Fighter, damage: number, range: number, area: boolean) {
    const targets = this.enemies.filter(m => m.hp > 0 && Math.abs(m.x - player.x) <= range &&
      Math.abs(m.y - player.y) <= 85 && (area || Math.sign(m.x - player.x) === player.facing));
    targets.sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x));
    for (const mob of (area ? targets : targets.slice(0, 1))) {
      mob.hp -= damage;
      mob.flash = 0.2;
      if (mob.hp <= 0) player.score += mob.boss ? 200 : 25;
    }
  }

  snapshot() {
    return {
      type: 'snapshot' as const,
      room: this.code,
      status: this.status,
      hostId: this.hostId,
      wave: this.wave,
      remaining: this.enemies.length,
      players: [...this.players.values()].map(({ id, name, x, y, hp, score, facing, flash, color }) =>
        ({ id, name, x: Math.round(x), y: Math.round(y), hp, score, facing, flash, color })),
      enemies: this.enemies.map(({ id, x, y, hp, maxHp, boss, flash }) =>
        ({ id, x: Math.round(x), y: Math.round(y), hp, maxHp, boss, flash })),
    };
  }
}
