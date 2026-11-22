import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eclipseHeroPreviewUrl, eclipseHeroTextures, selectEclipseHeroTexture } from './eclipsePixellab';

test('importador PixelLab usa fonte original fixada e verifica SHA-256', () => {
  const script = readFileSync(join(process.cwd(), '../../scripts/import_eclipse_pixellab.py'), 'utf8');
  assert.match(script, /SOURCE_SHA = "9988400dcd45ed49ad1cbf2047879879a2ca5530"/);
  assert.match(script, /hashlib\.sha256\(data\)\.hexdigest\(\)/);
  assert.match(script, /verify_png\(data, sha256\)/);
});
test('sem PNG no Node, fallback vetorial fica preservado', () => {
  assert.equal(typeof eclipseHeroTextures, 'object');
  if (!Object.keys(eclipseHeroTextures).length) {
    assert.equal(eclipseHeroPreviewUrl, null);
    assert.equal(selectEclipseHeroTexture('idle', 0), null);
    assert.equal(selectEclipseHeroTexture('attack_1', 80), null);
  }
});
test('ações que ainda não têm sprites próprios nunca recebem PixelLab incorreto', () => {
  for (const action of ['rocket', 'shadow', 'skill_1', 'skill_2', 'skill_3', 'charge', 'hurt'] as const) {
    assert.equal(selectEclipseHeroTexture(action, 100), null);
  }
});
