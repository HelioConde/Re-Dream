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

test('predição reage a DOWN em plataforma no mesmo frame sem aguardar snapshot', () => {
  const p = new LocalPredictor();
  p.sync(300,466,input);
  assert.equal(p.grounded,true);
  p.advance(1/60,{...input,down:true});
  assert.ok(p.y>466);
  assert.equal(p.grounded,false);
  for(let i=0;i<60;i++)p.advance(1/60,{...input,down:true});
  assert.equal(p.y,596);
  assert.equal(p.grounded,true);
});

test('predição não atravessa chão sólido nem auto-desce em pouso', () => {
  const p = new LocalPredictor();
  p.sync(300,596,input);
  for(let i=0;i<20;i++)p.advance(1/60,{...input,down:true});
  assert.equal(p.y,596);
  // New predictor begins airborne while down is held.
  const q=new LocalPredictor();
  q.sync(300,380,input);
  q.advance(1/60,{...input,down:true});
  for(let i=0;i<40;i++)q.advance(1/60,{...input,down:true});
  assert.equal(q.y,466);
  assert.equal(q.grounded,true);
});

test('predição reconhece sincronização autoritativa em plataforma, não só no chão', () => {
  const p=new LocalPredictor();
  p.sync(300,466,input);
  assert.equal(p.initialized,true);
  assert.equal(p.grounded,true);
  p.advance(1/60,{...input,down:true});
  assert.ok(p.y>466);
});
