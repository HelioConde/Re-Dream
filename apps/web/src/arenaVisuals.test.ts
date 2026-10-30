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

test('camadas V3 são SVGs locais transparentes, sem cobrir colisões nem importar imagens', () => {
  for (const filename of ['forest-atmosphere.svg','forest-foreground.svg']) {
    const source=readFileSync(join(process.cwd(),'public/art',filename),'utf8');
    assert.match(source, /width="1280" height="720" viewBox="0 0 1280 720"/);
    assert.match(source, /<\/svg>\s*$/);
    assert.equal(source.includes('<image'),false);
    assert.equal(source.includes('<script'),false);
    assert.equal(source.includes('<foreignObject'),false);
    assert.equal(source.includes('data:image'),false);
    assert.equal(source.replaceAll('http://www.w3.org/2000/svg','').includes('http://'),false);
  }
  // Exact platform positions are still kept in the underlying stage file.
  assert.match(stage,/id="platform-lower"/);
  assert.match(stage,/id="platform-upper"/);
  assert.match(canvas,/this\.load\.svg\('forest-atmosphere'/);
  assert.match(canvas,/this\.load\.svg\('forest-foreground'/);
  assert.match(canvas,/\.setDepth\(-11\)/);
  assert.match(canvas,/\.setDepth\(6\)/);
});

test('impacto é alimentado por resultado confirmado e não pelas entradas do teclado', () => {
  assert.match(canvas,/snapshot\.impact\.sequence !== this\.lastImpactSequence/);
  assert.match(canvas,/buildCombatVfx\(/);
  assert.match(canvas,/this\.reducedMotion/);
});

test('V5: player feet and labels align to the authored frame rather than sinking into soil', () => {
  assert.match(canvas,/AREN_FOOT_ANCHOR_Y/);
  assert.match(canvas,/avatar\.setPosition\(p\.x, p\.y \+ footInset\)/);
  assert.doesNotMatch(canvas,/avatar\.setPosition\(p\.x, p\.y \+ 15\)/);
  assert.match(canvas,/if \(!practiceMode \|\| !isYou\)/);
  assert.match(canvas,/AREN_HEALTHBAR_OFFSET_Y/);
  assert.match(canvas,/AREN_NAME_OFFSET_Y/);
});

test('V5: moon mist has lower contrast wash, but depth and collision art remain unchanged', () => {
  assert.match(canvas,/setDepth\(-11\)\.setAlpha\(\.68\)/);
  assert.match(stage,/id="platform-lower"/);
  assert.match(stage,/id="platform-upper"/);
});
