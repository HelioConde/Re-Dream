import type { PracticeImpact } from './protocol';

// Local-only facts after the deterministic simulation has accepted an action.
// They are not WebSocket messages and never authorize damage from the browser.
export type PracticeGameEvent =
  | { type: 'impactConfirmed'; sequence: number; impact: PracticeImpact }
  | { type: 'comboChanged'; sequence: number; combo: number; bestCombo: number }
  | { type: 'mpChanged'; sequence: number; before: number; after: number; reason: 'hit' | 'skill'; level?: 1 | 2 | 3 }
  | { type: 'dummyDefeated'; sequence: number; total: number }
  | { type: 'reset'; sequence: number };

type PracticeEventData = PracticeGameEvent extends infer E
  ? E extends { sequence: number } ? Omit<E, 'sequence'> : never
  : never;

export type PracticeEventListener = (event: PracticeGameEvent) => void;

/** No global singleton: every PracticeArena owns its own listeners and sequence.
 * Subscribers are snapshotted before notifying so handlers may unsubscribe
 * synchronously without skipping later listeners.
 */
export class PracticeEventBus {
  private listeners = new Set<PracticeEventListener>();
  private sequence = 0;

  subscribe(listener: PracticeEventListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  publish(data: PracticeEventData): PracticeGameEvent {
    const event = { ...data, sequence: ++this.sequence } as PracticeGameEvent;
    for (const listener of [...this.listeners]) {
      if (this.listeners.has(listener)) listener(event);
    }
    return event;
  }

  clear() {
    this.listeners.clear();
  }
}

export function practiceEventLabel(event: PracticeGameEvent): string {
  switch (event.type) {
    case 'impactConfirmed':
      return `⚔ Acerto confirmado · ${event.impact.damage} dano`;
    case 'comboChanged':
      return event.combo === 0 ? 'Combo encerrado' :
        `✦ Combo ${event.combo} · recorde ${event.bestCombo}`;
    case 'mpChanged': {
      const sign = event.after >= event.before ? '+' : '−';
      const value = Math.abs(event.after - event.before);
      return event.reason === 'skill'
        ? `MP${event.level ?? 1} lançado · ${sign}${value} MP`
        : `MP recuperado · ${sign}${value}`;
    }
    case 'dummyDefeated':
      return `Alvo derrotado · ${event.total} total`;
    case 'reset':
      return 'Treino reiniciado';
  }
}
