import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatVfx, impactColor } from './combatVfx';
import type { PracticeImpact } from './protocol';

const hit = (kind:PracticeImpact['kind']='basic',skillLevel?:1|2|3):PracticeImpact =>
  ({sequence:7,damage:44,x:870,y:560,direction:1,kind,skillLevel});

test('confirmados: MP1, MP2 e MP3 têm cores e complexidade progressivamente distintas', () => {
  const frames = ([1,2,3] as const).map(level => buildCombatVfx(hit('skill',level),70));
  assert.deepEqual(frames.map(v=>v.duration),[420,420,420]);
  assert.ok(frames[0].rays.length < frames[1].rays.length);
  assert.ok(frames[1].rays.length < frames[2].rays.length);
  assert.deepEqual(frames.map(v=>v.rings.length),[1,2,2]);
  const colors = ([1,2,3] as const).map(level=>impactColor(hit('skill',level)));
  assert.equal(new Set(colors).size,3);
  assert.deepEqual(colors,[0x99f3c7,0x95dfff,0xe3aeff]);
});

test('básico, launcher, dash e aéreo têm paleta própria, sem alterar dano', () => {
  const colors = ['basic','air','dash','launcher','dive','otto'].map(kind =>
    impactColor(hit(kind as PracticeImpact['kind'])));
  assert.equal(new Set(colors).size,colors.length);
  const frame=buildCombatVfx(hit('basic'),55);
  assert.equal(frame.rays.length,8);
  assert.equal(frame.sparks.length,4);
});

test('efeito é determinístico, sempre finito e desaparece após a duração', () => {
  const impact=hit('skill',3);
  assert.deepEqual(buildCombatVfx(impact,90),buildCombatVfx(impact,90));
  assert.deepEqual(buildCombatVfx(impact,999),{duration:420,rings:[],rays:[],sparks:[]});
  assert.deepEqual(buildCombatVfx(hit('basic'),290),{duration:290,rings:[],rays:[],sparks:[]});
  for (const elapsed of [-40,0,1,110,250,390]) {
    const frame=buildCombatVfx(impact,elapsed);
    for (const value of [...frame.rings,...frame.rays,...frame.sparks]){
      for (const val of Object.values(value)) {
        assert.ok(Number.isFinite(val));
      }
      assert.ok(value.alpha>=0 && value.alpha<=1);
    }
  }
});

test('movimento reduzido elimina raios e partículas em ambas as habilidades', () => {
  for (const impact of [hit('basic'),hit('skill',3)]) {
    const frame=buildCombatVfx(impact,15,true);
    assert.equal(frame.rays.length,0);
    assert.equal(frame.sparks.length,0);
    assert.equal(frame.rings.length,1);
    assert.equal(buildCombatVfx(impact,115,true).rings.length,0);
  }
});
