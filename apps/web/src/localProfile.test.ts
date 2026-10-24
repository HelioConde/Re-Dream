import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearLocalProfile, EMPTY_PROFILE, PROFILE_KEY,
  readLocalProfile, saveLocalProfile,
} from './localProfile.js';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
  };
}

describe('localStorage de Re:Dream', () => {
  it('inicia com perfil vazio sem banco de dados', () => {
    assert.deepEqual(readLocalProfile(memoryStorage()), EMPTY_PROFILE);
  });

  it('persiste o apelido, sala e histórico apenas no navegador', () => {
    const storage = memoryStorage();
    const profile = {
      nickname: 'Aventureira', characterId: 'wanderer' as const, lastRoom: 'ABC123',
      victories: 2, defeats: 1, lastPlayed: '2026-10-24T10:00:00.000Z',
    };
    saveLocalProfile(profile, storage);
    assert.deepEqual(readLocalProfile(storage), profile);
    assert.ok(storage.getItem(PROFILE_KEY));
  });

  it('migra o apelido da chave antiga', () => {
    const storage = memoryStorage();
    storage.setItem('redream-name', 'Conde');
    assert.equal(readLocalProfile(storage).nickname, 'Conde');
    assert.equal(readLocalProfile(storage).characterId, 'luci');
  });

  it('não confia em números negativos, datas inválidas ou valores malformados', () => {
    const storage = memoryStorage();
    storage.setItem(PROFILE_KEY, JSON.stringify({
      nickname: 'X'.repeat(100), characterId: 'unknown', lastRoom: '<script>', victories: -3, defeats: '10', lastPlayed: 'invalid',
    }));
    const p = readLocalProfile(storage);
    assert.equal(p.nickname.length, 20);
    assert.equal(p.characterId, 'luci');
    assert.equal(p.lastRoom, '');
    assert.equal(p.victories, 0);
    assert.equal(p.defeats, 0);
    assert.equal(p.lastPlayed, null);
    storage.setItem(PROFILE_KEY, '{not json');
    assert.deepEqual(readLocalProfile(storage), EMPTY_PROFILE);
  });

  it('apaga apenas os dados de Re:Dream', () => {
    const storage = memoryStorage();
    storage.setItem('unrelated', 'keep');
    storage.setItem('redream-name', 'Old');
    saveLocalProfile({ ...EMPTY_PROFILE, victories: 5 }, storage);
    clearLocalProfile(storage);
    assert.equal(storage.getItem(PROFILE_KEY), null);
    assert.equal(storage.getItem('redream-name'), null);
    assert.equal(storage.getItem('unrelated'), 'keep');
  });

  it('funciona mesmo quando o navegador bloqueia o armazenamento', () => {
    const storage = {
      getItem(_key: string): string | null { throw Error('Storage disabled'); },
      setItem(_key: string, _value: string): void { throw Error('Storage disabled'); },
      removeItem(_key: string): void { throw Error('Storage disabled'); },
    };
    assert.deepEqual(readLocalProfile(storage), EMPTY_PROFILE);
    assert.doesNotThrow(() => saveLocalProfile(EMPTY_PROFILE, storage));
    assert.doesNotThrow(() => clearLocalProfile(storage));
  });
});
