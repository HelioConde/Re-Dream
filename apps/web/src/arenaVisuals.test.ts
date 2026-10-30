import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { join } from 'node:path';

const stage = readFileSync(join(process.cwd(), 'public/art/arena-dream.svg'), 'utf8');
const canvas = readFileSync(join(process.cwd(), 'src/GameCanvas.tsx'), 'utf8');

test('authored 16:9 Bosque das Constelações SVG covers the full battle arena', () => {
  assert.match(stage, /<svg[^>]+width="1280" height="720" viewBox="0 0 1280 720"/);
  assert.match(stage, /id="sky"/);
  assert.match(stage, /id="stone"/);
  assert.match(stage, /id="moss"/);
  assert.match(stage, /Bosque das Constelações/);
  assert.match(stage, /<\/svg>\s*$/);
});

test('platform artwork visually shares exact authoritative platform top coordinates', () => {
  assert.match(stage, /id="platform-lower"/);
  assert.match(stage, /id="platform-upper"/);
  assert.match(stage, /M227 471/); // 220 + 7 / 466 + 5 is below the top y=466
  assert.match(stage, /M697 419/); // 690 + 7 / 414 + 5
  assert.match(stage, /M0 598/); // foreground earth below physical floor y=596
  assert.match(stage, /M0 593/); // walkable grass crest overlaps the same floor
});

test('stage has no external raster art or unlicensed third-party asset dependencies', () => {
  const withoutNamespaces = stage.replaceAll('http://www.w3.org/2000/svg', '')
    .replaceAll('http://www.w3.org/1999/xlink', '');
  assert.equal(withoutNamespaces.includes('<image'), false);
  assert.equal(withoutNamespaces.includes('<script'), false);
  assert.equal(withoutNamespaces.includes('http://'), false);
  assert.equal(withoutNamespaces.includes('https://'), false);
  assert.equal(withoutNamespaces.includes('data:image'), false);
  assert.ok((stage.match(/<path\b/g) ?? []).length >= 20);
  assert.ok((stage.match(/<circle\b/g) ?? []).length >= 20);
});

test('Phaser renders the scenery as a static image with a safe fallback', () => {
  assert.match(canvas, /this\.load\.svg\('dream-stage'/);
  assert.match(canvas, /this\.add\.image\(640, 360, 'dream-stage'\)/);
  assert.match(canvas, /this\.textures\.exists\('dream-stage'\)/);
  assert.match(canvas, /private drawGuardian\(/);
  // Gameplay collisions and entity rendering still use the original snapshots.
  assert.match(canvas, /const snapshot = snapshotRef\.current/);
});
