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
  const x = room.snapshot().players[0].x;
  room.setInput('one', { left: false, right: true, jump: false, attack: false, skill: false });
  for (let i = 0; i < 10; i++) room.step(1 / 30);
  assert.ok(room.snapshot().players[0].x > x);
});

test('salto usa gravidade e colisão no chão', () => {
  const room = new GameRoom('TEST03');
  room.addPlayer('one', 'Aventureiro');
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
