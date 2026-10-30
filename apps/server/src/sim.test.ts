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

test('Aren é o único personagem válido nas salas novas', () => {
  const room = new GameRoom('SKINS1');
  room.addPlayer('host', 'Aren', 'aren');
  room.addPlayer('friend', 'Friend', 'aren');
  assert.deepEqual(room.snapshot().players.map(p=>p.characterId),['aren','aren']);
  assert.equal(room.selectCharacter('friend', 'aren'),true);
  assert.equal(room.selectCharacter('friend', 'luci'),false);
  assert.equal(room.selectCharacter('friend', 'rose'),false);
  assert.equal(room.start('host'),true);
  assert.equal(room.selectCharacter('friend', 'aren'),false);
});

test('tentativa de personagem inválido não cria jogador', () => {
  const room = new GameRoom('SKINS2');
  assert.throws(() => room.addPlayer('bot', 'Inválido', 'unknown' as never), /Personagem inválido/);
  assert.equal(room.size, 0);
});

test('dois jogadores com Aren conservam física e movimento sincronizado', () => {
  const room = new GameRoom('SKINS3');
  room.addPlayer('a', 'Aren', 'aren');
  room.addPlayer('b', 'Amigo', 'aren');
  room.start('a');
  room.setInput('a',{left:false,right:true,jump:false,attack:false,skill:false});
  room.setInput('b',{left:false,right:true,jump:false,attack:false,skill:false});
  const before=room.snapshot().players.map(p=>p.x);
  for(let i=0;i<10;i++)room.step(1/30);
  const after=room.snapshot().players.map(p=>p.x);
  assert.equal(after[0]-before[0],after[1]-before[1]);
  assert.deepEqual(room.snapshot().players.map(p=>p.characterId),['aren','aren']);
});

test('antigo elenco é rejeitado pelo servidor', () => {
  const room=new GameRoom('ROSTER');
  room.addPlayer('a','Teste');
  assert.equal(room.snapshot().players[0].characterId,'aren');
  for(const id of ['luci','rose','wanderer','sprout','bunny','retro','cat','fox','wolf','panda','owl']){
    assert.equal(room.selectCharacter('a',id),false);
  }
  assert.equal(room.selectCharacter('a','aren'),true);
});

test('seta ↓ sozinha atravessa plataforma vazada na simulação autoritativa', () => {
  const room = new GameRoom('DROP01');
  room.addPlayer('p','Luci');
  room.start('p');
  const player = room.players.get('p')!;
  Object.assign(player,{x:300,y:466,grounded:true,vy:0});
  room.setInput('p',{left:false,right:false,jump:false,attack:false,skill:false,down:true});
  room.step(1/30);
  assert.ok(player.y>466,'deve iniciar a queda no primeiro tick');
  assert.equal(player.grounded,false);
  room.setInput('p',{left:false,right:false,jump:false,attack:false,skill:false,down:false});
  for(let i=0;i<45;i++)room.step(1/30);
  assert.equal(player.y,596);
  assert.equal(player.grounded,true);
});

test('servidor memoriza toque breve ↓ até o próximo tick', () => {
  const room = new GameRoom('DROP02');
  room.addPlayer('p','Luci');room.start('p');
  const player=room.players.get('p')!;
  Object.assign(player,{x:750,y:414,grounded:true,vy:0});
  const base={left:false,right:false,jump:false,attack:false,skill:false};
  room.setInput('p',{...base,down:true});
  room.setInput('p',{...base,down:false});
  room.step(1/30);
  assert.ok(player.y>414);
  assert.equal(player.grounded,false);
});

test('seta ↓ no chão sólido não atravessa e não causa quedas repetidas', () => {
  const room=new GameRoom('DROP03');
  room.addPlayer('p','Luci');room.start('p');
  const player=room.players.get('p')!;
  const base={left:false,right:false,jump:false,attack:false,skill:false};
  room.setInput('p',{...base,down:true});
  for(let i=0;i<20;i++)room.step(1/30);
  assert.equal(player.y,596);
  assert.equal(player.grounded,true);
  // Pressing down while airborne must not queue an automatic drop on landing.
  Object.assign(player,{x:300,y:375,vy:250,grounded:false});
  room.setInput('p',{...base,down:false});
  room.setInput('p',{...base,down:true});
  for(let i=0;i<28;i++)room.step(1/30);
  assert.equal(player.y,466);
  assert.equal(player.grounded,true);
  for(let i=0;i<10;i++)room.step(1/30);
  assert.equal(player.y,466);
});

test('input malicioso down fora de plataforma não altera colisões nem física', () => {
  const room=new GameRoom('DROP04');
  room.addPlayer('p','Luci');room.start('p');
  const player=room.players.get('p')!;
  const base={left:false,right:false,jump:false,attack:false,skill:false};
  Object.assign(player,{x:300,y:596,vy:0,grounded:true});
  room.setInput('p',{...base,down:true});
  room.step(1/30);
  assert.equal(player.y,596);
  room.setInput('p',{...base,down:false});
  // a regular jump is still possible immediately after the down input
  room.setInput('p',{...base,jump:true});
  room.step(1/30);
  assert.ok(player.y<596);
});
