import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PracticeArena } from './practiceSimulation';

const noInput = { left: false, right: false, jump: false, attack: false, skill: false };
test('Luci is the offline practice default with a regenerating target', () => {
  const arena = new PracticeArena();
  assert.equal(arena.snapshot().players[0].characterId, 'luci');
  assert.equal(arena.snapshot().enemies[0].hp, 260);
  assert.equal(arena.snapshot().status, 'playing');
  assert.equal(arena.snapshot().room, 'TREINO');
});
test('practice movement and jump use the same bounds and platform physics', () => {
  const arena = new PracticeArena();
  const start = arena.player.x;
  arena.setInput({ ...noInput, right: true });
  for (let i = 0; i < 12; i++) arena.step(1 / 30);
  assert.ok(arena.player.x > start);
  arena.setInput({ ...noInput, jump: true });
  arena.step(1 / 30);
  assert.ok(arena.player.y < 596);
  arena.setInput(noInput);
  for (let i = 0; i < 110; i++) arena.step(1 / 30);
  assert.equal(arena.player.grounded, true);
  assert.ok([466, 596].includes(arena.player.y));
});
test('practice dummy only takes valid hits and automatically reappears', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 260);
  arena.player.x = 800;
  arena.step(1 / 30);
  // Cooldown is respected even after moving into range.
  assert.equal(arena.stats.targetHp, 260);
  for (let i = 0; i < 12; i++) arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 236);
  arena.setInput({ ...noInput, skill: true });
  for (let i = 0; i < 6; i++) arena.step(1 / 30);
  assert.ok(arena.stats.targetHp <= 171);
  arena.reset();
  assert.equal(arena.stats.targetHp, 260);
  assert.equal(arena.stats.defeated, 0);
  assert.equal(arena.player.x, 180);
});
test('practice must face its target to deal damage', () => {
  const arena = new PracticeArena();
  arena.player.x = 830;
  arena.player.facing = -1;
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 260);
});

test('double tap activates directional dash with a finite speed burst', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, right: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  arena.step(1 / 30);
  arena.setInput({ ...noInput, right: true });
  assert.equal(arena.stats.dashes, 1);
  arena.step(1 / 30);
  assert.ok(arena.player.vx > 600);
  for (let i = 0; i < 15; i++) arena.step(1 / 30);
  assert.ok(arena.player.vx <= 310);
});

test('down drops through one-way platforms, but not through the floor', () => {
  const arena = new PracticeArena();
  Object.assign(arena.player, { x: 300, y: 466, vy: 0, grounded: true });
  arena.setInput({ ...noInput, down: true, drop: true });
  arena.step(1 / 30);
  assert.ok(arena.player.y > 466);
  arena.setInput(noInput);
  for (let i = 0; i < 60; i++) arena.step(1 / 30);
  assert.equal(arena.player.y, 596);
  assert.equal(arena.player.grounded, true);
});

test('consecutive strikes build distinct combo stages and MP', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, attack: true });
  for (let i = 0; i < 20; i++) arena.step(1 / 30);
  assert.ok(arena.stats.combo >= 3);
  assert.ok(arena.stats.bestCombo >= 3);
  assert.ok(arena.player.comboStage >= 3);
  assert.ok(arena.stats.mp > 40);
  assert.ok(arena.stats.targetHp < 260 - 24 - 29);
});

test('aerial strike uses the aerial animation and hit counter', () => {
  const arena = new PracticeArena();
  Object.assign(arena.player, { x: 810, y: 540, vy: -100, grounded: false });
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.aerialHits, 1);
  assert.equal(arena.snapshot().players[0].combatAction, 'air_attack');
  assert.equal(arena.stats.targetHp, 230);
});

test('short Z taps attack; holding Z spends MP to perform a charged skill', () => {
  const short = new PracticeArena();
  short.player.x = 800;
  short.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 3; i++) short.step(1 / 30);
  short.setInput(noInput);
  short.step(1 / 30);
  assert.equal(short.stats.targetHp, 236);

  const long = new PracticeArena();
  long.player.x = 800;
  long.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 25; i++) long.step(1 / 30);
  assert.equal(long.stats.chargeLevel, 1);
  assert.ok(long.stats.chargePercent > 40 && long.stats.chargePercent < 50);
  long.setInput(noInput);
  long.step(1 / 30);
  // Z makes one immediate punch and then a charged special on release.
  assert.equal(long.stats.targetHp, 171);
  assert.equal(long.snapshot().players[0].combatAction, 'skill');
  assert.ok(long.stats.mp < 40);
});

test('pausing clears charged input without triggering a hidden attack', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 30; i++) arena.step(1 / 30);
  arena.suspend();
  arena.step(1 / 30);
  // Initial Z keydown already landed one punch; pausing must not fire the charge.
  assert.equal(arena.stats.targetHp, 236);
  assert.equal(arena.stats.chargePercent, 0);
});


test('Z responds on keydown without a delayed extra punch on quick release', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, charge: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 236);
  assert.equal(arena.snapshot().players[0].combatAction, 'attack');
  arena.setInput(noInput);
  arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 236);
});

test('holding Z only produces one basic attack until charged skill release', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 24; i++) arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 236);
  arena.setInput(noInput);
  arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 171);
});

test('a quick J tap during recovery is buffered into the next combo strike', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  // Strike cooldown: 0.25 seconds. Queue second tap at ~0.2 seconds.
  for (let i = 0; i < 5; i++) arena.step(1 / 30);
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  assert.equal(arena.stats.targetHp, 236);
  for (let i = 0; i < 4; i++) arena.step(1 / 30);
  assert.equal(arena.stats.targetHp, 207);
  assert.equal(arena.stats.combo, 2);
});

test('only confirmed hits emit a unique impact event with accurate damage', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  assert.equal(arena.snapshot().impact, undefined);
  arena.setInput(noInput);
  // Wait until shortly before the basic attack recovery window ends.
  for (let i = 0; i < 5; i++) arena.step(1 / 30);
  arena.player.x = 800;
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  for (let i = 0; i < 9; i++) arena.step(1 / 30);
  const impact = arena.snapshot().impact;
  assert.ok(impact);
  assert.equal(impact.sequence, 1);
  assert.equal(impact.damage, 24);
  assert.equal(impact.kind, 'basic');
  assert.equal(impact.x, 875);
  assert.ok(arena.snapshot().enemies[0].x > 875);
  arena.step(1 / 30);
  assert.equal(arena.snapshot().impact?.sequence, impact.sequence);
});

test('reset and pause discard buffered attacks and reset impact ids', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  assert.equal(arena.snapshot().impact?.sequence, 1);
  arena.setInput(noInput);
  arena.setInput({ ...noInput, attack: true });
  arena.suspend();
  for (let i = 0; i < 12; i++) arena.step(1 / 30);
  assert.equal(arena.stats.strikes, 1);
  arena.reset();
  assert.equal(arena.snapshot().impact, undefined);
  assert.equal(arena.stats.strikes, 0);
});

test('↑ + J during a grounded combo launches target, not the player', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, attack: true });
  arena.step(1/30);
  assert.equal(arena.stats.targetHp, 236);
  arena.setInput(noInput);
  for (let i = 0; i < 5; i++) arena.step(1/30);
  arena.setInput({ ...noInput, up: true, jump: true, attack: true });
  for (let i = 0; i < 5; i++) arena.step(1/30);
  assert.equal(arena.stats.launchers, 1);
  assert.equal(arena.stats.targetHp, 198);
  assert.equal(arena.player.grounded, true);
  assert.equal(arena.snapshot().players[0].combatAction, 'launcher');
  assert.equal(arena.snapshot().impact?.kind, 'launcher');
  arena.setInput(noInput);
  for (let i = 0; i < 5; i++) arena.step(1/30);
  assert.ok(arena.snapshot().enemies[0].y < 550);
});

test('↑ alone still jumps normally after a combo', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, jump: true, up: true });
  arena.step(1/30);
  assert.ok(arena.player.y < 596);
  assert.equal(arena.stats.launchers, 0);
});

test('↓ + J while jumping performs a real downward dive with one confirmed hit', () => {
  const arena = new PracticeArena();
  Object.assign(arena.player, { x: 805, y: 500, vy: -100, grounded: false });
  arena.setInput({ ...noInput, down: true, attack: true });
  arena.step(1/30);
  assert.equal(arena.snapshot().players[0].combatAction, 'dive');
  assert.equal(arena.stats.targetHp, 260);
  for (let i = 0; i < 4; i++) arena.step(1/30);
  assert.equal(arena.stats.targetHp, 210);
  assert.equal(arena.stats.dives, 1);
  assert.equal(arena.stats.aerialHits, 1);
  assert.equal(arena.snapshot().impact?.kind, 'dive');
  assert.equal(arena.stats.combo, 1);
});

test('missed dive never damages dummy through empty space', () => {
  const arena = new PracticeArena();
  Object.assign(arena.player, { x: 140, y: 410, vy: 10, grounded: false });
  arena.setInput({ ...noInput, down: true, attack: true });
  arena.step(1/30);
  arena.setInput(noInput);
  for (let i = 0; i < 40; i++) arena.step(1/30);
  assert.equal(arena.stats.targetHp, 260);
  assert.equal(arena.stats.dives, 0);
  assert.equal(arena.player.y, 596);
});

test('normal aerial J does not become an automatic dive', () => {
  const arena = new PracticeArena();
  Object.assign(arena.player, { x: 810, y: 540, vy: 0, grounded: false });
  arena.setInput({ ...noInput, attack: true });
  arena.step(1/30);
  assert.equal(arena.stats.targetHp, 230);
  assert.equal(arena.stats.dives, 0);
  assert.equal(arena.snapshot().players[0].combatAction, 'air_attack');
});

test('reset clears launched target, dive state and counters', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, attack: true });
  arena.step(1/30);
  arena.setInput(noInput);
  for (let i=0;i<5;i++) arena.step(1/30);
  arena.setInput({ ...noInput, up: true, jump: true, attack: true });
  for (let i=0;i<5;i++) arena.step(1/30);
  assert.ok(arena.snapshot().enemies[0].y < 596);
  arena.reset();
  assert.equal(arena.snapshot().enemies[0].y,596);
  assert.equal(arena.stats.launchers,0);
  assert.equal(arena.stats.dives,0);
});


function prepareLaunchedDummy(arena: PracticeArena) {
  arena.player.x = 800;
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  for (let i = 0; i < 5; i++) arena.step(1 / 30);
  arena.setInput({ ...noInput, up: true, jump: true, attack: true });
  for (let i = 0; i < 5; i++) arena.step(1 / 30);
  assert.equal(arena.stats.launchers, 1);
  arena.setInput(noInput);
}

test('after a launcher, a fresh jump cancels recovery into faster aerial pursuit', () => {
  const arena = new PracticeArena();
  prepareLaunchedDummy(arena);
  assert.equal(arena.stats.chaseReady, true);
  assert.equal(arena.player.grounded, true);
  arena.setInput({ ...noInput, jump: true, up: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.chaseJumps, 1);
  assert.ok(arena.player.vy < -680);
  assert.equal(arena.player.grounded, false);
  assert.notEqual(arena.snapshot().players[0].combatAction, 'launcher');
  assert.equal(arena.stats.chaseReady, false);
});

test('air chase leads to a follow-up juggle that suspends the dummy briefly', () => {
  const arena = new PracticeArena();
  prepareLaunchedDummy(arena);
  arena.setInput({ ...noInput, jump: true, up: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  arena.step(1 / 30);
  arena.setInput({ ...noInput, attack: true });
  for (let i = 0; i < 4; i++) arena.step(1 / 30);
  assert.equal(arena.stats.chaseJumps, 1);
  assert.equal(arena.stats.juggles, 1);
  assert.equal(arena.stats.juggleChain, 1);
  assert.equal(arena.stats.bestJuggle, 1);
  assert.equal(arena.snapshot().impact?.kind, 'air');
  assert.ok(arena.snapshot().enemies[0].y < 596);
});

test('ordinary jump has no chase boost and no fake juggle', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, jump: true, up: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.chaseJumps, 0);
  assert.equal(arena.stats.juggles, 0);
  assert.ok(arena.player.vy > -680);
});

test('held up+attack after launcher cannot auto-trigger another launcher', () => {
  const arena = new PracticeArena();
  arena.player.x = 800;
  arena.setInput({ ...noInput, attack: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  for (let i = 0; i < 5; i++) arena.step(1 / 30);
  arena.setInput({ ...noInput, up: true, jump: true, attack: true });
  for (let i = 0; i < 12; i++) arena.step(1 / 30);
  assert.equal(arena.stats.launchers, 1);
  assert.equal(arena.stats.chaseJumps, 0);
  assert.equal(arena.player.grounded, true);
});

test('juggle chain clears when the opponent lands and reset clears all progress', () => {
  const arena = new PracticeArena();
  prepareLaunchedDummy(arena);
  arena.setInput({ ...noInput, jump: true, up: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  arena.step(1 / 30);
  arena.setInput({ ...noInput, attack: true });
  for (let i = 0; i < 4; i++) arena.step(1 / 30);
  assert.equal(arena.stats.juggles, 1);
  arena.setInput(noInput);
  for (let i = 0; i < 65; i++) arena.step(1 / 30);
  assert.equal(arena.stats.juggleChain, 0);
  assert.equal(arena.stats.bestJuggle, 1);
  arena.reset();
  assert.equal(arena.stats.juggles, 0);
  assert.equal(arena.stats.bestJuggle, 0);
  assert.equal(arena.stats.chaseJumps, 0);
  assert.equal(arena.stats.chaseReady, false);
});


test('Rocket Step converts a grounded dash into fast airborne momentum', () => {
  const a = new PracticeArena();
  a.setInput({ ...noInput, right: true }); a.step(1/30);
  a.setInput(noInput); a.step(1/30);
  a.setInput({ ...noInput, right: true }); a.step(1/30);
  a.setInput({ ...noInput, right: true, jump: true, up: true }); a.step(1/30);
  assert.equal(a.stats.rocketSteps, 1);
  assert.equal(a.snapshot().players[0].rocket, true);
  assert.ok(a.player.vy < -620);
  a.setInput(noInput);
  a.step(1/30);
  assert.ok(a.player.vx >= 700, 'rocket momentum persists after releasing direction');
});

test('Shadow Step cancels an active Rocket and accelerates descent', () => {
  const a = new PracticeArena();
  a.setInput({ ...noInput, right:true });a.step(1/30);
  a.setInput(noInput);a.step(1/30);
  a.setInput({ ...noInput, right:true });a.step(1/30);
  a.setInput({ ...noInput, right:true, jump:true, up:true });a.step(1/30);
  // Build some height before testing the fast descent, otherwise it lands
  // on the first shadow frame and the short-lived visual state is gone.
  for (let i=0;i<5;i++) a.step(1/30);
  a.setInput({ ...noInput, down:true });a.step(1/30);
  assert.equal(a.stats.shadowSteps, 1);
  assert.equal(a.snapshot().players[0].shadow, true);
  assert.equal(a.snapshot().players[0].rocket, false);
  assert.ok(a.player.vy >= 670);
});

test('opposite direction interrupts dash immediately rather than giving another dash', () => {
  const a = new PracticeArena();
  a.setInput({ ...noInput, right: true }); a.step(1/30);
  a.setInput(noInput); a.step(1/30);
  a.setInput({ ...noInput, right: true }); a.step(1/30);
  assert.ok(a.player.vx > 600);
  a.setInput({ ...noInput, left: true }); a.step(1/30);
  assert.equal(a.stats.dashCancels, 1);
  assert.equal(a.stats.dashes, 1);
  assert.ok(a.player.vx < 0);
});

test('down alone stays on an elevated platform, down+space drops through it', () => {
  const a = new PracticeArena();
  Object.assign(a.player, {x:300,y:466,grounded:true,vy:0});
  a.setInput({ ...noInput, down:true });
  a.step(1/30);
  assert.equal(a.player.y,466);
  a.setInput({...noInput,down:true,drop:true});
  a.step(1/30);
  assert.ok(a.player.y >466);
});

test('Otto at platform edge is a downward strike, not a teleport or floor clip', () => {
  const a = new PracticeArena();
  Object.assign(a.player,{x:900,y:414,vy:0,grounded:true,facing:-1});
  a.setInput({...noInput, down:true, charge:true});
  a.step(1/30);
  assert.equal(a.stats.ottoShots,1);
  assert.equal(a.snapshot().players[0].combatAction,'otto');
  assert.equal(a.snapshot().impact?.kind,'otto');
  assert.equal(a.stats.targetHp,226);
  a.setInput(noInput);
  for(let i=0;i<60;i++) a.step(1/30);
  assert.equal(a.player.y,596);
});

test('three MP stocks charge to level 1/2/3 and consume correct costs', () => {
  const damage = [0,65,115,180];
  for (const level of [1,2,3] as const) {
    const a = new PracticeArena();
    a.player.x=800;
    a.stats.mp=300;
    a.setInput({...noInput,charge:true});
    const ticks=Math.ceil((level*0.65+0.05)*30);
    for(let i=0;i<ticks;i++)a.step(1/30);
    assert.equal(a.stats.chargeLevel,level);
    a.setInput(noInput);
    a.step(1/30);
    assert.equal(a.stats.skillCasts,1);
    assert.equal(a.stats.lastSkillLevel,level);
    assert.equal(a.stats.targetHp,260-24-damage[level]);
    assert.ok(a.stats.mp<=300-level*100+50);
  }
});

test('direct skill requests are ignored: only releasing charged Z can cast', () => {
  const a = new PracticeArena();
  a.player.x = 800;
  a.stats.mp = 300;
  a.setInput({ ...noInput, skill: true });
  for (let i = 0; i < 30; i++) a.step(1 / 30);
  assert.equal(a.stats.skillCasts, 0);
  assert.equal(a.stats.targetHp, 260);
  assert.equal(a.stats.mp, 300);
  // An outdated client must not be able to bypass the new control scheme.
  a.setInput({ ...noInput, skillLevel: 3 } as unknown as import('./protocol').PracticeInput);
  for (let i = 0; i < 30; i++) a.step(1 / 30);
  assert.equal(a.stats.skillCasts, 0);
  assert.equal(a.stats.targetHp, 260);
  assert.equal(a.stats.mp, 300);
});

test('holding Z does not cast until key release, even at level three', () => {
  const a = new PracticeArena();
  a.player.x = 800;
  a.stats.mp = 300;
  a.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 75; i++) a.step(1 / 30);
  assert.equal(a.stats.chargeLevel, 3);
  assert.equal(a.stats.skillCasts, 0);
  assert.equal(a.stats.targetHp, 236); // Immediate basic attack on keydown.
  a.setInput(noInput);
  a.step(1 / 30);
  assert.equal(a.stats.skillCasts, 1);
  assert.equal(a.stats.lastSkillLevel, 3);
  assert.equal(a.stats.targetHp, 56);
});

test('insufficient MP prevents charged Z from casting higher levels', () => {
  const a = new PracticeArena();
  a.player.x = 800;
  a.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 62; i++) a.step(1 / 30);
  assert.equal(a.stats.chargeLevel, 3);
  a.setInput(noInput);
  a.step(1 / 30);
  assert.equal(a.stats.skillCasts, 0);
  assert.equal(a.stats.targetHp, 236);
});

test('pause and reset clear Rocket, Shadow and charged MP input', () => {
  const a = new PracticeArena();
  a.setInput({...noInput,right:true});a.step(1/30);
  a.setInput(noInput);a.step(1/30);
  a.setInput({...noInput,right:true});a.step(1/30);
  a.setInput({...noInput,right:true,jump:true,up:true,charge:true});a.step(1/30);
  assert.equal(a.stats.rocketSteps,1);
  a.suspend();a.step(1/30);
  assert.equal(a.snapshot().players[0].rocket,false);
  assert.equal(a.stats.chargeLevel,0);
  a.reset();
  assert.equal(a.stats.mp,100);
  assert.equal(a.stats.rocketSteps,0);
  assert.equal(a.stats.ottoShots,0);
  assert.equal(a.stats.dashCancels,0);
});
