/**
 * Local-only attack playback for multiplayer sprites.
 * The server remains the source of truth for cooldown, hitboxes and damage.
 * This module controls cosmetics only and never sends positions or hits.
 */
export const BASIC_ATTACK_COOLDOWN_MS = 350;
export const BASIC_ATTACK_ANIM_MS = 330;

type AttackState = {
  startedAt: number;
  previousServerFlash: number;
  observedServerSnapshot: boolean;
};

export class AttackPlayback {
  private states = new Map<string, AttackState>();

  update(
    id: string, isLocal: boolean, attackHeld: boolean, serverFlash: number,
    newSnapshot: boolean, alive: boolean, nowMs: number,
  ): number | null {
    let state = this.states.get(id);
    if (!state) {
      state = { startedAt: Number.NEGATIVE_INFINITY, previousServerFlash: serverFlash, observedServerSnapshot: false };
      this.states.set(id, state);
    }
    if (!alive) {
      state.startedAt = Number.NEGATIVE_INFINITY;
      state.previousServerFlash = serverFlash;
      return null;
    }

    if (isLocal) {
      // Respond on the first frame; holding J repeats at the server's 350 ms cooldown.
      if (attackHeld && nowMs - state.startedAt >= BASIC_ATTACK_COOLDOWN_MS) {
        state.startedAt = nowMs;
      }
    } else if (newSnapshot) {
      // Server flash rises on each successful basic attack (0.16 s).
      // Skill uses a 0.35 s flash; never replay that as a normal strike.
      if (state.observedServerSnapshot &&
          serverFlash > state.previousServerFlash + 0.025 &&
          serverFlash <= 0.201) {
        state.startedAt = nowMs;
      }
      state.previousServerFlash = serverFlash;
      state.observedServerSnapshot = true;
    }

    const elapsed = nowMs - state.startedAt;
    return elapsed >= 0 && elapsed < BASIC_ATTACK_ANIM_MS ? elapsed : null;
  }

  remove(id: string) { this.states.delete(id); }
}
