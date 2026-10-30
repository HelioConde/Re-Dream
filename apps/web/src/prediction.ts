import type { Control } from './protocol';

/**
 * Client-side visual prediction. Never persisted, never sent as authoritative
 * coordinates, HP or damage: server owns the actual match.
 */
const FLOOR_Y = 596;
const PLATFORMS = [{ x: 220, y: 466, w: 220 }, { x: 690, y: 414, w: 250 }];
export class LocalPredictor {
  x = 140;
  y = FLOOR_Y;
  vy = 0;
  grounded = true;
  initialized = false;
  private time = 0;
  private dropUntil = 0;
  private lastDown = false;

  sync(x: number, y: number, input: Control): void {
    if (!this.initialized || Math.abs(this.x - x) > 155 || Math.abs(this.y - y) > 135) {
      this.x = x; this.y = y; this.vy = 0;
      this.grounded = y >= FLOOR_Y || PLATFORMS.some(p =>
        Math.abs(y - p.y) < 3 && x >= p.x + 4 && x <= p.x + p.w - 4);
      this.initialized = true;
      return;
    }
    // Never interpolate every server snapshot over the current position while
    // moving: doing so reintroduces visible input latency/rubber-banding.
    if (!input.left && !input.right && Math.abs(this.x - x) > 35) this.x += (x - this.x) * .12;
    if (this.grounded && y >= FLOOR_Y && Math.abs(this.y - y) > 15) this.y = y;
  }

  advance(seconds: number, input: Control): void {
    if (!this.initialized) return;
    const dt = Math.min(.05, Math.max(0, seconds));
    this.time += dt;
    // The server owns the drop. Predict the same press-edge on the client
    // so it does not look like ↓ was ignored between 100ms snapshots.
    const down = input.down === true;
    if (down && !this.lastDown && !input.jump && !input.attack && !input.skill &&
        this.grounded && PLATFORMS.some(p =>
          Math.abs(this.y - p.y) < 3 &&
          this.x >= p.x + 4 && this.x <= p.x + p.w - 4)) {
      this.dropUntil = this.time + 0.28;
      this.y += 9;
      this.vy = 70;
      this.grounded = false;
    }
    this.lastDown = down;
    const direction = Number(input.right) - Number(input.left);
    this.x = Math.max(22, Math.min(1258, this.x + direction * 310 * dt));
    if (input.jump && this.grounded) {
      this.vy = -650;
      this.grounded = false;
    }
    const previousY = this.y;
    this.vy = Math.min(this.vy + 1600 * dt, 900);
    this.y += this.vy * dt;
    this.grounded = false;
    if (this.vy >= 0) {
      for (const p of PLATFORMS) {
        if (this.time < this.dropUntil) break;
        if (previousY <= p.y + 4 && this.y >= p.y && this.x >= p.x + 4 && this.x <= p.x + p.w - 4) {
          this.y = p.y; this.vy = 0; this.grounded = true;
        }
      }
      if (this.y >= FLOOR_Y) { this.y = FLOOR_Y; this.vy = 0; this.grounded = true; }
    }
  }
}
