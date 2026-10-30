import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AREN_ACTIONS, AREN_FRAME_COUNTS, selectArenAnimation, ArenLandingTracker } from './arenAnimation';
import { CHARACTER_IDS, DEFAULT_CHARACTER, isCharacterId } from './protocol';
import { CHARACTERS } from './characters';

const base={facing:1,airborne:false,falling:false,moving:false,timeMs:0} as const;
test('elenco do reboot contém somente Aren, com ficha de arte original',()=>{
  assert.deepEqual([...CHARACTER_IDS],['aren']);
  assert.equal(DEFAULT_CHARACTER,'aren');
  assert.equal(CHARACTERS.length,1);
  assert.equal(CHARACTERS[0].preview,'art/aren/idle-0.svg');
  for(const id of ['luci','rose','wanderer','bunny','cat','sprout']) assert.equal(isCharacterId(id),false);
});

test('todos os 23 estados têm sprites SVG transparentes gerados, com quadros distintos',()=>{
  assert.equal(AREN_ACTIONS.length,23);
  for(const state of AREN_ACTIONS){
    const count=AREN_FRAME_COUNTS[state];
    assert.ok(count>=4);
    const frames=new Set<string>();
    for(let i=0;i<count;i++){
      const path=join(process.cwd(),'public/art/aren',state+'-'+i+'.svg');
      assert.ok(existsSync(path),'faltando '+path);
      const svg=readFileSync(path,'utf8');
      assert.match(svg,/<svg[^>]+viewBox="0 0 192 192"/);
      assert.doesNotMatch(svg,/<image|<script|<foreignObject/i);
      frames.add(svg);
    }
    assert.ok(frames.size>1,'poses realmente distintas: '+state);
  }
});

test('mapeia idle, walk, run, dash, subida, queda e movimentos aéreos reais',()=>{
  for(const [locomotion,state] of [['idle','idle'],['walk','walk'],['run','run'],
    ['dash','dash'],['rise','rise'],['fall','fall'],['rocket','rocket'],['shadow','shadow']] as const){
    const actual=selectArenAnimation({...base,locomotion,airborne:['rise','fall','rocket','shadow'].includes(locomotion),
      falling:['fall','shadow'].includes(locomotion)});
    assert.match(actual.texture,new RegExp('^aren-'+state+'-[0-9]+$'));
  }
  assert.equal(selectArenAnimation({...base,facing:-1}).flipX,true);
});

test('quatro golpes distintos, ataques especiais, Otto e todos os três níveis de magia',()=>{
  for(let comboStage=1;comboStage<=4;comboStage++){
    assert.match(selectArenAnimation({...base,combatAction:'attack',comboStage,attackElapsedMs:160}).texture,
      new RegExp('^aren-attack_'+comboStage+'-'));
  }
  const moves=['launcher','air_attack','dash_attack','dive','otto'] as const;
  for(const move of moves){
    assert.match(selectArenAnimation({...base,combatAction:move,attackElapsedMs:150}).texture,
      new RegExp('^aren-'+move+'-'));
  }
  for(const level of [1,2,3] as const){
    assert.match(selectArenAnimation({...base,combatAction:'skill',skillLevel:level,
      attackElapsedMs:230}).texture,new RegExp('^aren-skill_'+level+'-'));
  }
  assert.match(selectArenAnimation({...base,charging:true}).texture,/^aren-charge-/);
  assert.match(selectArenAnimation({...base,hurt:true}).texture,/^aren-hurt-/);
});

test('mudança de quadros acompanha tempo; soltura de Z troca carga pela magia',()=>{
  const a=selectArenAnimation({...base,moving:true,timeMs:0});
  const b=selectArenAnimation({...base,moving:true,timeMs:90});
  assert.notEqual(a.texture,b.texture);
  const c=selectArenAnimation({...base,charging:true,timeMs:90});
  const d=selectArenAnimation({...base,charging:false,combatAction:'skill',skillLevel:2,attackElapsedMs:100});
  assert.match(c.texture,/charge/);
  assert.match(d.texture,/skill_2/);
});

test('animação de pouso é temporária e não altera a física',()=>{
  const tracker=new ArenLandingTracker();
  assert.equal(tracker.update('aren',true,100),false);
  assert.equal(tracker.update('aren',false,120),true);
  assert.equal(tracker.update('aren',false,400),false);
  tracker.remove('aren');
  assert.equal(tracker.update('aren',false,410),false);
});
