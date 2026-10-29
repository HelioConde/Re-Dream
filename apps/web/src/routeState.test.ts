import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStandaloneRoute } from './routeState';

test('direct links open the corresponding standalone screens', () => {
  assert.equal(resolveStandaloneRoute('#praticar'), 'practice');
  assert.equal(resolveStandaloneRoute('#personagens'), 'characters');
});

test('browser back or header navigation exits offline practice', () => {
  for (const hash of ['', '#inicio', '#universo', '#jogar', '#invalid']) {
    assert.equal(resolveStandaloneRoute(hash), 'landing');
  }
});
