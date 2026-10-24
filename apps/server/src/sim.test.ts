import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { GameRoom } from './sim.js';

test('sala permite quatro jogadores e bloqueia o quinto', () => {
  const room = new GameRoom('TEST01');
  for (let i = 0; i < 4; i++) room.addPlayer('p' + i, 'Jogador ' + i);
  assert.equal(room.size, 4);
  assert.throws(() => room.addPlayer('p5', 'Extra'), /cheia/);
});

test('posição é simulada pelo servidor a partir dos controles', () => {
  const room = new GameRoom('TEST02');
  room.addPlayer('one', 'Aventureiro');
  room.start('one');
  const x = room.snapshot().players[0].x;
  room.setInput('one', { left: false, right: true, jump: false, attack: false, skill: false });
  for (let i = 0; i < 10; i++) room.step(1 / 30);
  assert.ok(room.snapshot().players[0].x > x);
});

test('salto usa gravidade e colisão no chão', () => {
  const room = new GameRoom('TEST03');
  room.addPlayer('one', 'Aventureiro');
  room.start('one');
  room.setInput('one', { left: false, right: false, jump: true, attack: false, skill: false });
  room.step(1 / 30);
  assert.ok(room.snapshot().players[0].y < 596);
  room.setInput('one', { left: false, right: false, jump: false, attack: false, skill: false });
  for (let i = 0; i < 100; i++) room.step(1 / 30);
  assert.equal(room.snapshot().players[0].y, 596);
});

test('ataque reduz a vida do inimigo apenas quando está ao alcance e à frente', () => {
  const room = new GameRoom('TEST04');
  room.addPlayer('one', 'Aventureiro');
  room.start('one');
  const enemy = room.enemies[0];
  const hp = enemy.hp;
  enemy.x = 1000;
  room.setInput('one', { left: false, right: false, jump: false, attack: true, skill: false });
  room.step(1 / 30);
  assert.equal(enemy.hp, hp);
  enemy.x = 195;
  for (let i = 0; i < 12; i++) room.step(1 / 30);
  assert.ok(enemy.hp < hp);
});

test('lobby mantém os jogadores seguros até o líder iniciar', () => {
  const room = new GameRoom('WAIT01');
  room.addPlayer('host', 'Líder');
  room.addPlayer('friend', 'Amigo');
  room.setInput('host', { left:false, right:true, jump:false, attack:false, skill:false });
  const before = room.snapshot().players[0].x;
  for (let i=0; i<20; i++) room.step(1/30);
  assert.equal(room.snapshot().status, 'lobby');
  assert.equal(room.snapshot().players[0].x, before);
  assert.equal(room.snapshot().enemies.length, 0);
  assert.equal(room.start('friend'), false);
  assert.equal(room.start('host'), true);
  assert.equal(room.snapshot().status, 'playing');
  assert.equal(room.snapshot().enemies.length, 3);
  room.step(1/30);
  assert.ok(room.snapshot().players[0].x > before);
});

test('liderança passa ao próximo membro do lobby quando o anfitrião sai', () => {
  const room = new GameRoom('WAIT02');
  room.addPlayer('host', 'Líder');
  room.addPlayer('friend', 'Amigo');
  room.removePlayer('host');
  assert.equal(room.snapshot().hostId, 'friend');
  assert.equal(room.start('friend'), true);
});

test('personagens são registrados e podem ser trocados apenas no lobby', () => {
  const room = new GameRoom('SKINS1');
  room.addPlayer('rose', 'Rose', 'rose');
  room.addPlayer('friend', 'Friend', 'wanderer');
  assert.deepEqual(room.snapshot().players.map(player => player.characterId), ['rose', 'wanderer']);
  assert.equal(room.selectCharacter('friend', 'rose'), true);
  assert.equal(room.snapshot().players[1].characterId, 'rose');
  assert.equal(room.selectCharacter('friend', 'hacked'), false);
  assert.equal(room.selectCharacter('unknown', 'wanderer'), false);
  assert.equal(room.start('rose'), true);
  assert.equal(room.selectCharacter('friend', 'wanderer'), false);
  assert.equal(room.snapshot().players[1].characterId, 'rose');
});

test('tentativa de personagem inválido não cria jogador', () => {
  const room = new GameRoom('SKINS2');
  assert.throws(() => room.addPlayer('bot', 'Inválido', 'unknown' as never), /Personagem inválido/);
  assert.equal(room.size, 0);
});

test('escolhas diferentes não alteram física nem combate da sala', () => {
  const room = new GameRoom('SKINS3');
  room.addPlayer('a', 'Rosa', 'rose');
  room.addPlayer('b', 'Viajante', 'wanderer');
  room.start('a');
  room.setInput('a', { left:false,right:true,jump:false,attack:false,skill:false });
  room.setInput('b', { left:false,right:true,jump:false,attack:false,skill:false });
  const before=room.snapshot().players.map(p=>p.x);
  for(let i=0;i<10;i++) room.step(1/30);
  const after=room.snapshot().players.map(p=>p.x);
  assert.equal(after[0]-before[0],after[1]-before[1]);
  assert.deepEqual(room.snapshot().players.map(p=>p.characterId),['rose','wanderer']);
});

test('todos os personagens de teste são aceitos e entradas forjadas rejeitadas', () => {
  const room=new GameRoom('ROSTER');
  for(const id of ['sprout','bunny','retro','retrohat','mana_dapper','mana_bob','cat','fox','rabbit','wolf','panda','owl'] as const){
    assert.equal(room.selectCharacter('a',id),false);
  }
  room.addPlayer('a','Teste');
  for(const id of ['sprout','bunny','retro','retrohat','mana_dapper','mana_bob','cat','fox','rabbit','wolf','panda','owl'] as const){
    assert.equal(room.selectCharacter('a',id),true);
    assert.equal(room.snapshot().players[0].characterId,id);
  }
  assert.equal(room.selectCharacter('a','fake-avatar'),false);
});
