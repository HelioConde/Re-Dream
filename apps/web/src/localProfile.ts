import { DEFAULT_CHARACTER, isCharacterId, type CharacterId } from './protocol';

/**
 * Local-only prototype progress. Never a trusted source for server-side stats,
 * currencies, inventory, or authentication.
 */
export type LocalProfile = {
  nickname: string;
  characterId: CharacterId;
  lastRoom: string;
  victories: number;
  defeats: number;
  lastPlayed: string | null;
};

export type LocalStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const PROFILE_KEY = 'redream:profile:v1';

export const EMPTY_PROFILE: LocalProfile = {
  nickname: '',
  characterId: DEFAULT_CHARACTER,
  lastRoom: '',
  victories: 0,
  defeats: 0,
  lastPlayed: null,
};

function browserStorage(): LocalStorageLike | undefined {
  try { return typeof window === 'undefined' ? undefined : window.localStorage; }
  catch { return undefined; }
}

const safeCount = (value: unknown) => (
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
);

export function readLocalProfile(storage = browserStorage()): LocalProfile {
  try {
    const raw = storage?.getItem(PROFILE_KEY);
    if (!raw) {
      const legacyName = storage?.getItem('redream-name') || '';
      return { ...EMPTY_PROFILE, nickname: legacyName.slice(0, 20) };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...EMPTY_PROFILE };
    const obj = parsed as Record<string, unknown>;
    return {
      nickname: typeof obj.nickname === 'string' ? obj.nickname.slice(0, 20) : '',
      characterId: isCharacterId(obj.characterId) ? obj.characterId : DEFAULT_CHARACTER,
      lastRoom: typeof obj.lastRoom === 'string' && /^[A-Z0-9]{4,8}$/.test(obj.lastRoom) ? obj.lastRoom : '',
      victories: safeCount(obj.victories),
      defeats: safeCount(obj.defeats),
      lastPlayed: typeof obj.lastPlayed === 'string' && !Number.isNaN(Date.parse(obj.lastPlayed))
        ? obj.lastPlayed : null,
    };
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function saveLocalProfile(profile: LocalProfile, storage = browserStorage()): void {
  try { storage?.setItem(PROFILE_KEY, JSON.stringify(profile)); }
  catch { /* localStorage can be disabled, in private mode or full. */ }
}

export function clearLocalProfile(storage = browserStorage()): void {
  try {
    storage?.removeItem(PROFILE_KEY);
    storage?.removeItem('redream-name');
  } catch { /* Browsers may reject localStorage access. */ }
}
