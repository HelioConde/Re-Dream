import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LocalPredictor } from './prediction.js';
import type { Control } from './protocol.js';

const input: Control = {left:false,right:false,jump:false,attack:false,skill:false};

test('player local se move em um único frame sem esperar WebSocket', () => {
  const p = new LocalPredictor();
  p.sync(140, 596, input);
  p.advance(1/60, {...input, right:true});
  assert.ok(p.x > 140);
});

test('snapshots atrasados não puxam personagem continuamente para trás', () => {
  const p = new LocalPredictor();
  p.sync(140,596,input);
  for(let i=0;i<8;i++)p.advance(1/60,{...input,right:true});
  const before = p.x;
  p.sync(140,596,{...input,right:true});
  assert.ok(p.x >= before - 0.01);
});

test('o cliente prevê salto e aterrissagem independentemente do servidor', () => {
  const p = new LocalPredictor();
  p.sync(140,596,input);
  p.advance(1/60,{...input,jump:true});
  assert.ok(p.y<596);
  for(let i=0;i<100;i++)p.advance(1/60,input);
  assert.equal(p.y,596);
});

test('o cliente reconcilia divergências grandes e protege limites do cenário', () => {
  const p = new LocalPredictor();
  p.sync(140,596,input);
  p.sync(600,596,input);
  assert.equal(p.x,600);
  for(let i=0;i<1000;i++)p.advance(1/60,{...input,right:true});
  assert.equal(p.x,1258);
});
