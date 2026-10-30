import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AREN_ACTIONS, AREN_FRAME_COUNTS, AREN_DISPLAY_SIZE, AREN_FRAME_SIZE, AREN_FOOT_ANCHOR_Y, AREN_HEALTHBAR_OFFSET_Y, AREN_NAME_OFFSET_Y, selectArenAnimation, ArenLandingTracker, ArenActionPhaseTracker, chooseArenAction } from './arenAnimation';
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

test('ação visual do Aren reinicia no primeiro quadro a cada transição', () => {
  const tracker = new ArenActionPhaseTracker();
  assert.equal(tracker.elapsed('a','idle',1000),0);
  assert.equal(tracker.elapsed('a','idle',1140),140);
  assert.equal(tracker.elapsed('a','run',1160),0);
  assert.equal(tracker.elapsed('a','run',1210),50);
  assert.equal(tracker.elapsed('a','idle',1220),0);
  const old = selectArenAnimation({...base,moving:true,timeMs:2000,
    actionAgeMs:tracker.elapsed('a','walk',2000)});
  assert.equal(old.texture,'aren-walk-0');
  const next = selectArenAnimation({...base,moving:true,timeMs:2100,
    actionAgeMs:tracker.elapsed('a','walk',2100)});
  assert.notEqual(old.texture,next.texture);
});

test('timeline visual é individual por jogador, limpa ao sair e recupera tempo voltando', () => {
  const tracker = new ArenActionPhaseTracker();
  tracker.elapsed('host','dash',1000);
  tracker.elapsed('friend','idle',1040);
  assert.equal(tracker.elapsed('host','dash',1070),70);
  assert.equal(tracker.elapsed('friend','idle',1070),30);
  // Browser tab/device time can reset; never return negative animation frames.
  assert.equal(tracker.elapsed('host','dash',800),0);
  assert.equal(tracker.elapsed('host','dash',816),16);
  tracker.remove('host');
  assert.equal(tracker.elapsed('host','dash',850),0);
  assert.equal(tracker.elapsed('friend','idle',1080),40);
});

test('carga Z e habilidades continuam acima de correr, salto e pouso', () => {
  assert.equal(chooseArenAction({...base,locomotion:'run',charging:true}),'charge');
  assert.equal(chooseArenAction({...base,locomotion:'rocket',airborne:true,
    charging:true,combatAction:'skill',skillLevel:3}),'skill_3');
  assert.equal(chooseArenAction({...base,locomotion:'fall',airborne:true,
    combatAction:'air_attack'}),'air_attack');
});

test('costume V2 tem identidade lunar consistente e magias têm cristais diferentes por nível', () => {
  const get = (file: string) => readFileSync(join(process.cwd(),'public/art/aren',file),'utf8');
  const idle=get('idle-0.svg'), skill1=get('skill_1-2.svg'),
    skill2=get('skill_2-2.svg'),skill3=get('skill_3-2.svg');
  for (const frame of [idle,skill1,skill2,skill3]) {
    assert.match(frame, /#d7c99c/); // new braided sash
    assert.match(frame, /#7fead5/); // head circlet jewel
    assert.match(frame, /#cfdbd1/); // asymmetrical shoulder armor
    assert.match(frame, /#d7ded2/); // split coat
  }
  assert.match(skill1, /#c5ffe4/);
  assert.match(skill2, /#b6e8ff/);
  assert.match(skill3, /#efd2ff/);
  assert.notEqual(skill1,skill2);
  assert.notEqual(skill2,skill3);
});

test('V4: each of the four combo strikes has its own choreographed sabre arc', () => {
  const get=(action:string,index:number)=>
    readFileSync(join(process.cwd(),'public/art/aren',action+'-'+index+'.svg'),'utf8');
  const swings=['attack_1','attack_2','attack_3','attack_4'] as const;
  const poses = swings.map(action => get(action,3));
  for(let i=0;i<swings.length;i++){
    assert.match(poses[i],new RegExp('data-swing="'+swings[i]+'"'));
    assert.match(poses[i],/#d7c99c/); // belt and crescent-sabre guard
    assert.match(poses[i],/#f5fff2/); // readable blade core
  }
  assert.equal(new Set(poses).size,4,'all four cuts need different body/weapon poses');
  assert.match(poses[3],/data-finisher="moon"/);
  for(const other of poses.slice(0,3)) assert.doesNotMatch(other,/data-finisher/);
});

test('V4: launcher, dive and Otto have different intentional sword trajectories', () => {
  const asset=(action:string)=>readFileSync(join(process.cwd(),
    'public/art/aren',action+'-3.svg'),'utf8');
  const attacks=['launcher','dive','otto','air_attack','dash_attack'];
  const bodyFrames=attacks.map(asset);
  for(let i=0;i<attacks.length;i++){
    assert.match(bodyFrames[i],new RegExp('data-swing="'+attacks[i]+'"'));
  }
  assert.equal(new Set(bodyFrames).size,5);
});

test('V4: MP3 has a signature dream crescent that MP1 and MP2 cannot display', () => {
  const asset=(action:string)=>readFileSync(join(process.cwd(),
    'public/art/aren',action+'-3.svg'),'utf8');
  const mp3=asset('skill_3');
  assert.match(mp3,/data-mp3="dream-crescent"/);
  assert.match(mp3,/#e8c7ff/);
  assert.doesNotMatch(asset('skill_1'),/data-mp3/);
  assert.doesNotMatch(asset('skill_2'),/data-mp3/);
  assert.equal(mp3.includes('<image'),false);
});

test('V4: key poses remain distinct across anticipation, impact, recovery', () => {
  for(const action of ['attack_1','attack_2','attack_3','attack_4','launcher','dive','otto','skill_3']){
    const frames=AREN_FRAME_COUNTS[action as keyof typeof AREN_FRAME_COUNTS];
    const read=(i:number)=>readFileSync(join(process.cwd(),
      'public/art/aren',action+'-'+i+'.svg'),'utf8');
    const first=read(0),mid=read(Math.floor(frames/2)),last=read(frames-1);
    assert.notEqual(first,mid,action+' anticipation must differ from contact');
    assert.notEqual(mid,last,action+' contact must differ from recovery');
  }
});

test('V5: Aren stays proportional to the 720px platform stage and guardian', () => {
  // Prevent returning to the old oversized 235px rendering seen in the playtest.
  assert.ok(AREN_DISPLAY_SIZE >= 144 && AREN_DISPLAY_SIZE <= 176);
  assert.ok(AREN_DISPLAY_SIZE < AREN_FRAME_SIZE);
  assert.equal(AREN_FRAME_SIZE,192);
  // The authored SVG sole sits on the 192px bottom edge, not at 180.
  assert.equal(AREN_FOOT_ANCHOR_Y,AREN_FRAME_SIZE);
  const artYOffset=AREN_DISPLAY_SIZE*(AREN_FRAME_SIZE-AREN_FOOT_ANCHOR_Y)/AREN_FRAME_SIZE;
  assert.equal(artYOffset,0);
  // Online names/HP must remain above the scaled hero, not across the face.
  assert.ok(AREN_HEALTHBAR_OFFSET_Y>=AREN_DISPLAY_SIZE);
  assert.ok(AREN_NAME_OFFSET_Y>AREN_HEALTHBAR_OFFSET_Y);
});

test('V7: sword stays visible in idle, walk, run, dash, jump, fall and landing', () => {
  const read=(state:string,frame=0)=>readFileSync(
    join(process.cwd(),'public/art/aren',state+'-'+frame+'.svg'),'utf8');
  for(const action of ['idle','walk','run','dash','rise','fall','rocket','shadow','land','hurt']){
    const svg=read(action);
    assert.match(svg,/data-weapon="lunar-sabre"/,action+' should carry sword');
    assert.match(svg,/#8be5cf/);
  }
  for(const action of ['attack_1','attack_4','skill_1','skill_3','charge']){
    assert.doesNotMatch(read(action),/data-weapon="lunar-sabre"/,
      action+' has its dedicated weapon/spell pose instead');
  }
});

test('V7: face is slimmer, gaze expressive and the layered hair follows each pose',()=>{
  const read=(name:string)=>readFileSync(join(process.cwd(),'public/art/aren',name),'utf8');
  const idle=read('idle-0.svg');
  const blink=read('idle-4.svg');
  const attack=read('attack_1-3.svg');
  for(const svg of [idle,blink,attack]){
    assert.match(svg,/data-face="hero"/);
    assert.match(svg,/#8caab0/); // swept directional hair strands
    assert.match(svg,/#cfdbd1/); // asymmetric original shoulder armor
    assert.match(svg,/#d7c99c/); // lunar belt crest
  }
  assert.notEqual(idle,blink,'idle blink must still have a distinct eyelid');
  assert.notEqual(idle,attack,'combat expression must differ from resting face');
  assert.match(idle,/rx="3.6" ry="5.2"/);
});

test('V7: all 151 animation files are distinct valid-frame SVGs with costume details',()=>{
  for(const action of AREN_ACTIONS){
    const poses = new Set<string>();
    for(let i=0;i<AREN_FRAME_COUNTS[action];i++){
      const file=join(process.cwd(),'public/art/aren',action+'-'+i+'.svg');
      const svg=readFileSync(file,'utf8');
      assert.match(svg,/<svg[^>]+width="192" height="192" viewBox="0 0 192 192"/);
      assert.match(svg,/#b6d9cd/,'reinforced boot toe absent: '+file);
      assert.match(svg,/#b4eacf/,'cape stitching absent: '+file);
      assert.match(svg,/#668d91/,'glove/forearm bracer absent: '+file);
      assert.doesNotMatch(svg,/<image\b|<script\b|<foreignObject\b/);
      poses.add(svg);
    }
    assert.ok(poses.size>1,'animation frozen: '+action);
  }
});
