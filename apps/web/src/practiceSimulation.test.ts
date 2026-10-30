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
  arena.setInput({ ...noInput, charge: true });
  for (let i = 0; i < 22; i++) arena.step(1 / 30);
  assert.equal(arena.stats.skillCasts, 0);
  arena.setInput(noInput); // Releasing Z is the only way to cast.
  arena.step(1 / 30);
  assert.equal(arena.stats.skillCasts, 1);
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

test('double tap starts dash and holding the second tap transitions to a sustained run', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, right: true });
  arena.step(1 / 30);
  arena.setInput(noInput);
  arena.step(1 / 30);
  arena.setInput({ ...noInput, right: true });
  assert.equal(arena.stats.dashes, 1);
  arena.step(1 / 30);
  assert.ok(arena.player.vx > 600);
  assert.equal(arena.snapshot().players[0].dashing, true);
  for (let i = 0; i < 15; i++) arena.step(1 / 30);
  assert.equal(arena.player.vx, 455);
  assert.equal(arena.snapshot().players[0].dashing, false);
  assert.equal(arena.snapshot().players[0].running, true);
  assert.equal(arena.stats.runs, 1);
  for (let i = 0; i < 20; i++) arena.step(1 / 30);
  assert.equal(arena.player.vx, 455);
  assert.equal(arena.stats.runs, 1, 'holding direction never retriggers the run');
});

test('down alone drops through one-way platforms, but never through the solid floor', () => {
  const arena = new PracticeArena();
  Object.assign(arena.player, { x: 300, y: 466, vy: 0, grounded: true });
  arena.setInput({ ...noInput, down: true });
  // Brief priority window is not a requirement to hold the button.
  arena.step(1 / 30);
  arena.setInput(noInput);
  for (let i = 0; i < 4; i++) arena.step(1 / 30);
  assert.ok(arena.player.y > 466);
  assert.equal(arena.stats.drops, 1);
  for (let i = 0; i < 60; i++) arena.step(1 / 30);
  assert.equal(arena.player.y, 596);
  assert.equal(arena.player.grounded, true);
  arena.setInput({ ...noInput, down: true });
  for (let i = 0; i < 30; i++) arena.step(1 / 30);
  assert.equal(arena.player.y, 596);
  assert.equal(arena.stats.drops, 1);
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

test('down+space remains an optional immediate drop on one-way platforms', () => {
  const a = new PracticeArena();
  Object.assign(a.player, {x:300,y:466,grounded:true,vy:0});
  a.setInput({ ...noInput, down:true, drop:true });
  a.step(1/30);
  assert.ok(a.player.y >466);
  assert.equal(a.stats.drops,1);
  for(let i=0;i<20;i++)a.step(1/30);
  assert.equal(a.stats.drops,1);
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


test('single tap walks, not runs', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, right: true });
  for (let i = 0; i < 25; i++) arena.step(1 / 30);
  assert.equal(arena.player.vx, 310);
  assert.equal(arena.stats.dashes, 0);
  assert.equal(arena.stats.runs, 0);
  assert.equal(arena.snapshot().players[0].running, false);
});

test('releasing the second press after dash starts prevents an accidental run', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, right: true }); arena.step(1 / 30);
  arena.setInput(noInput); arena.step(1 / 30);
  arena.setInput({ ...noInput, right: true }); arena.step(1 / 30);
  assert.equal(arena.stats.dashes, 1);
  arena.setInput(noInput);
  for (let i = 0; i < 14; i++) arena.step(1 / 30);
  assert.equal(arena.player.vx, 0);
  assert.equal(arena.stats.runs, 0);
  assert.equal(arena.snapshot().players[0].running, false);
});

test('releasing a running direction ends the run immediately', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, left: true }); arena.step(1 / 30);
  arena.setInput(noInput); arena.step(1 / 30);
  arena.setInput({ ...noInput, left: true });
  for (let i = 0; i < 12; i++) arena.step(1 / 30);
  assert.equal(arena.player.vx, -455);
  assert.equal(arena.stats.runs, 1);
  arena.setInput(noInput);
  arena.step(1 / 30);
  assert.equal(arena.player.vx, 0);
  assert.equal(arena.snapshot().players[0].running, false);
});

test('opposite direction cancels the sustained run without creating a second dash', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, right: true }); arena.step(1 / 30);
  arena.setInput(noInput); arena.step(1 / 30);
  arena.setInput({ ...noInput, right: true });
  for (let i = 0; i < 12; i++) arena.step(1 / 30);
  assert.equal(arena.stats.runs, 1);
  arena.setInput({ ...noInput, left: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.dashCancels, 1);
  assert.equal(arena.stats.dashes, 1);
  assert.equal(arena.snapshot().players[0].running, false);
  assert.equal(arena.player.vx, -310);
});

test('Rocket Step from a dash takes priority and never auto-starts running in the air', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, right: true }); arena.step(1 / 30);
  arena.setInput(noInput); arena.step(1 / 30);
  arena.setInput({ ...noInput, right: true }); arena.step(1 / 30);
  arena.setInput({ ...noInput, right: true, jump: true, up: true });
  arena.step(1 / 30);
  assert.equal(arena.stats.rocketSteps, 1);
  for (let i = 0; i < 15; i++) arena.step(1 / 30);
  assert.equal(arena.stats.runs, 0);
  assert.equal(arena.snapshot().players[0].running, false);
});

test('pause and reset clear run state so the next direction is a normal walk', () => {
  const arena = new PracticeArena();
  arena.setInput({ ...noInput, right: true }); arena.step(1 / 30);
  arena.setInput(noInput); arena.step(1 / 30);
  arena.setInput({ ...noInput, right: true });
  for (let i = 0; i < 12; i++) arena.step(1 / 30);
  assert.equal(arena.stats.runs, 1);
  arena.suspend();
  arena.step(1 / 30);
  assert.equal(arena.snapshot().players[0].running, false);
  arena.reset();
  assert.equal(arena.stats.runs, 0);
  arena.setInput({ ...noInput, right: true }); arena.step(1 / 30);
  assert.equal(arena.player.vx, 310);
  assert.equal(arena.stats.dashes, 0);
});


test('down alone on the upper platform drops without an additional key', () => {
  const a = new PracticeArena();
  Object.assign(a.player, {x:760,y:414,grounded:true,vy:0});
  a.setInput({...noInput,down:true});
  for(let i=0;i<5;i++)a.step(1/30);
  assert.ok(a.player.y>414);
  assert.equal(a.stats.drops,1);
  assert.ok(a.player.vy>0);
});

test('a short down tap is enough, but never drops again without a new press', () => {
  const a = new PracticeArena();
  Object.assign(a.player,{x:300,y:466,grounded:true,vy:0});
  a.setInput({...noInput,down:true}); a.step(1/30);
  a.setInput(noInput);
  for(let i=0;i<7;i++) a.step(1/30);
  assert.equal(a.stats.drops,1);
  for(let i=0;i<25;i++)a.step(1/30);
  assert.equal(a.stats.drops,1);
});

test('down+Z at platform edge takes priority as Otto, not a normal drop', () => {
  const a = new PracticeArena();
  Object.assign(a.player,{x:900,y:414,vy:0,grounded:true,facing:-1});
  a.setInput({...noInput,down:true,charge:true});
  a.step(1/30);
  assert.equal(a.stats.ottoShots,1);
  assert.equal(a.stats.drops,0);
  assert.equal(a.snapshot().impact?.kind,'otto');
});

test('press down then Z within the chord window preserves Otto', () => {
  const a = new PracticeArena();
  Object.assign(a.player,{x:900,y:414,vy:0,grounded:true,facing:-1});
  a.setInput({...noInput,down:true});
  a.step(1/30);
  assert.equal(a.player.y,414);
  a.setInput({...noInput,down:true,charge:true});
  for(let i=0;i<6;i++)a.step(1/30);
  assert.equal(a.stats.ottoShots,1);
  assert.equal(a.stats.drops,0);
});

test('attack+down on a platform does not trigger a delayed auto drop', () => {
  const a = new PracticeArena();
  Object.assign(a.player,{x:300,y:466,vy:0,grounded:true});
  a.setInput({...noInput,down:true});
  a.step(1/30);
  a.setInput({...noInput,down:true,charge:true});
  for(let i=0;i<7;i++)a.step(1/30);
  assert.equal(a.stats.drops,0);
  assert.equal(a.player.y,466);
  a.setInput(noInput);
  a.step(1/30);
  assert.equal(a.stats.drops,0);
});

test('down while airborne does not drop through a platform again on landing', () => {
  const a = new PracticeArena();
  Object.assign(a.player,{x:300,y:350,vy:200,grounded:false});
  a.setInput({...noInput,down:true});
  for(let i=0;i<25;i++)a.step(1/30);
  assert.equal(a.player.y,466);
  assert.equal(a.player.grounded,true);
  assert.equal(a.stats.drops,0);
  a.setInput(noInput);
  a.step(1/30);
  a.setInput({...noInput,down:true});
  for(let i=0;i<6;i++)a.step(1/30);
  assert.equal(a.stats.drops,1);
  assert.ok(a.player.y>466);
});

test('pause and reset discard a pending platform drop', () => {
  const a = new PracticeArena();
  Object.assign(a.player,{x:300,y:466,vy:0,grounded:true});
  a.setInput({...noInput,down:true});
  a.step(1/30);
  a.suspend();
  for(let i=0;i<7;i++)a.step(1/30);
  assert.equal(a.stats.drops,0);
  assert.equal(a.player.y,466);
  a.setInput({...noInput,down:true});
  a.step(1/30);
  a.reset();
  for(let i=0;i<7;i++)a.step(1/30);
  assert.equal(a.stats.drops,0);
  assert.equal(a.player.y,596);
});

test('real training shortcut positions Luci on a collidable platform then ↓ drops him', () => {
  const a=new PracticeArena();
  a.placeOnPlatformForTraining();
  assert.equal(a.player.grounded,true);
  assert.equal(a.player.y,466);
  assert.equal(a.stats.onPlatform,true);
  a.setInput({...noInput,down:true});
  for(let i=0;i<6;i++)a.step(1/30);
  assert.equal(a.stats.drops,1);
  assert.ok(a.player.y>466);
  assert.equal(a.stats.onPlatform,false);
});

test('platform state is only announced when standing on a one-way platform', () => {
  const a=new PracticeArena();
  a.step(1/30);
  assert.equal(a.stats.onPlatform,false);
  Object.assign(a.player,{x:300,y:466,grounded:true,vy:0});
  a.step(1/30);
  assert.equal(a.stats.onPlatform,true);
  a.setInput({...noInput,down:true});
  for(let i=0;i<6;i++)a.step(1/30);
  assert.equal(a.stats.onPlatform,false);
  a.reset();
  assert.equal(a.stats.onPlatform,false);
});

test('locomotion snapshot matches actual dash -> hold-run -> stop in the arena', () => {
  const a = new PracticeArena();
  assert.equal(a.snapshot().players[0].locomotion, 'idle');
  a.setInput({ ...noInput, right:true });
  a.step(1/30);
  assert.equal(a.snapshot().players[0].locomotion, 'walk');
  a.setInput(noInput);
  a.step(1/30);
  a.setInput({ ...noInput, right:true });
  a.step(1/30);
  assert.equal(a.snapshot().players[0].locomotion, 'dash');
  for(let i=0;i<12;i++) a.step(1/30);
  assert.equal(a.snapshot().players[0].locomotion, 'run');
  assert.equal(a.stats.locomotion, 'run');
  a.setInput(noInput);
  a.step(1/30);
  assert.equal(a.snapshot().players[0].locomotion, 'idle');
  assert.equal(a.stats.locomotion, 'idle');
});

test('locomotion FSM prioritizes Rocket/Shadow and returns to idle after landing', () => {
  const a = new PracticeArena();
  a.setInput({ ...noInput, right:true });a.step(1/30);
  a.setInput(noInput);a.step(1/30);
  a.setInput({ ...noInput, right:true });a.step(1/30);
  a.setInput({ ...noInput, right:true, jump:true, up:true });a.step(1/30);
  assert.equal(a.snapshot().players[0].locomotion, 'rocket');
  a.setInput({ ...noInput, down:true });a.step(1/30);
  // The early Shadow frame may already land on the floor; the trigger itself is verified.
  assert.equal(a.stats.shadowSteps,1);
  for(let i=0;i<90;i++)a.step(1/30);
  assert.equal(a.player.y,596);
  assert.equal(a.snapshot().players[0].locomotion,'idle');
});

test('a platform drop is falling, then idle; combat MP can still charge while moving', () => {
  const a = new PracticeArena();
  a.placeOnPlatformForTraining();
  assert.equal(a.stats.locomotion,'idle');
  a.setInput({...noInput, down:true, charge:true});
  a.step(1/30);
  // A Z input within the chord window prevents an accidental platform drop.
  assert.equal(a.stats.drops,0);
  a.setInput(noInput);a.step(1/30);
  a.setInput({...noInput, down:true});
  for(let i=0;i<6;i++)a.step(1/30);
  assert.equal(a.stats.drops,1);
  assert.equal(a.snapshot().players[0].locomotion,'fall');
  for(let i=0;i<40;i++)a.step(1/30);
  assert.equal(a.snapshot().players[0].locomotion,'idle');
});

test('suspending and resetting clears locomotion state without casting charged Z', () => {
  const a = new PracticeArena();
  a.setInput({...noInput, right:true, charge:true});
  a.step(1/30);
  assert.equal(a.stats.locomotion,'walk');
  a.suspend();
  assert.equal(a.stats.locomotion,'idle');
  for(let i=0;i<20;i++)a.step(1/30);
  assert.equal(a.stats.skillCasts,0);
  a.reset();
  assert.equal(a.stats.locomotion,'idle');
  assert.equal(a.snapshot().players[0].locomotion,'idle');
});

test('event bus emits confirmed hits, real MP gain and combo exactly once per strike', () => {
  const arena=new PracticeArena();
  const events:import('./practiceEvents').PracticeGameEvent[]=[];
  arena.subscribe(event=>events.push(event));
  arena.player.x=800;
  arena.setInput({...noInput,attack:true});
  arena.step(1/30);
  assert.deepEqual(events.map(e=>e.type),[
    'impactConfirmed','mpChanged','comboChanged',
  ]);
  const impact=events.find(e=>e.type==='impactConfirmed');
  assert.equal(impact?.type==='impactConfirmed' && impact.impact.damage,24);
  assert.equal(impact?.type==='impactConfirmed' && impact.impact.sequence,1);
  const mp=events.find(e=>e.type==='mpChanged');
  assert.equal(mp?.type==='mpChanged' && mp.before,100);
  assert.equal(mp?.type==='mpChanged' && mp.after,106);
  for(let i=0;i<5;i++) arena.step(1/30);
  assert.equal(events.length,3,'render/update frames never generate duplicate hit events');
});

test('missed swings never emit impact, MP or combo events', () => {
  const a=new PracticeArena();
  const received:import('./practiceEvents').PracticeGameEvent[]=[];
  a.subscribe(event=>received.push(event));
  a.setInput({...noInput,attack:true});
  a.step(1/30);
  assert.deepEqual(received,[]);
  assert.equal(a.stats.targetHp,260);
});

test('charged Z emits one cost event and one confirmed hit only after releasing Z', () => {
  const a=new PracticeArena();
  const events:import('./practiceEvents').PracticeGameEvent[]=[];
  a.subscribe(event=>events.push(event));
  a.player.x=800;
  a.stats.mp=300;
  a.setInput({...noInput,charge:true});
  for(let i=0;i<42;i++)a.step(1/30);
  assert.equal(a.stats.skillCasts,0);
  assert.equal(events.some(e=>e.type==='mpChanged' && e.reason==='skill'),false);
  a.setInput(noInput);
  a.step(1/30);
  assert.equal(a.stats.skillCasts,1);
  const spent=events.filter(e=>e.type==='mpChanged' && e.reason==='skill');
  assert.equal(spent.length,1);
  assert.equal(spent[0].type==='mpChanged' && spent[0].level,2);
  assert.equal(spent[0].type==='mpChanged' && spent[0].before,300);
  assert.equal(spent[0].type==='mpChanged' && spent[0].after,100);
  assert.equal(events.filter(e=>e.type==='impactConfirmed').length,2);
});

test('target defeat is published once after a real confirmed hit', () => {
  const a=new PracticeArena();
  const events:import('./practiceEvents').PracticeGameEvent[]=[];
  a.subscribe(event=>events.push(event));
  a.player.x=800;
  a.stats.targetHp=10;
  a.setInput({...noInput,attack:true});
  a.step(1/30);
  assert.deepEqual(events.map(e=>e.type),[
    'impactConfirmed','mpChanged','dummyDefeated','comboChanged',
  ]);
  assert.equal(a.stats.defeated,1);
  for(let i=0;i<8;i++)a.step(1/30);
  assert.equal(events.filter(e=>e.type==='dummyDefeated').length,1);
});

test('reset event clears stale combat feedback but preserves unique impact ids for Phaser', () => {
  const a=new PracticeArena();
  const events:import('./practiceEvents').PracticeGameEvent[]=[];
  const unsubscribe=a.subscribe(event=>events.push(event));
  a.player.x=800;
  a.setInput({...noInput,attack:true});
  a.step(1/30);
  const first=a.snapshot().impact?.sequence;
  assert.equal(first,1);
  a.reset();
  assert.equal(events.at(-1)?.type,'reset');
  assert.equal(a.snapshot().impact,undefined);
  a.player.x=800;
  a.setInput({...noInput,attack:true});
  a.step(1/30);
  const next=a.snapshot().impact?.sequence;
  assert.ok(next!==undefined && next>first!);
  assert.equal(events.filter(e=>e.type==='impactConfirmed').length,2);
  unsubscribe();
  a.reset();
  assert.notEqual(events.at(-1)?.type,'reset');
});

test('pausing with Z held never emits a skill or reset event', () => {
  const a=new PracticeArena();
  const events:import('./practiceEvents').PracticeGameEvent[]=[];
  a.subscribe(event=>events.push(event));
  a.player.x=800;
  a.setInput({...noInput,charge:true});
  for(let i=0;i<32;i++)a.step(1/30);
  const count=events.length;
  a.suspend();
  for(let i=0;i<10;i++)a.step(1/30);
  assert.equal(events.length,count);
  assert.equal(events.some(e=>e.type==='mpChanged' && e.reason==='skill'),false);
});
