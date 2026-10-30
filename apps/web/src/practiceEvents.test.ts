import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PracticeEventBus, practiceEventLabel, type PracticeGameEvent } from './practiceEvents';

test('event bus publishes monotonic ids, even on reset', () => {
  const bus = new PracticeEventBus();
  const observed: PracticeGameEvent[] = [];
  bus.subscribe(event => observed.push(event));
  const first = bus.publish({type:'comboChanged',combo:1,bestCombo:1});
  const second = bus.publish({type:'reset'});
  const third = bus.publish({type:'mpChanged',before:100,after:0,reason:'skill',level:1});
  assert.deepEqual([first.sequence,second.sequence,third.sequence],[1,2,3]);
  assert.deepEqual(observed,[first,second,third]);
});

test('unsubscribing during notification does not skip remaining listeners', () => {
  const bus = new PracticeEventBus();
  const called:string[]=[];
  let unsubscribeSecond=()=>{};
  bus.subscribe(()=>{called.push('first');unsubscribeSecond();});
  unsubscribeSecond=bus.subscribe(()=>called.push('second'));
  bus.subscribe(()=>called.push('third'));
  bus.publish({type:'reset'});
  assert.deepEqual(called,['first','third']);
});

test('unsubscribed listeners never receive later events', () => {
  const bus=new PracticeEventBus();
  const observed:PracticeGameEvent[]=[];
  const unsubscribe=bus.subscribe(event=>observed.push(event));
  bus.publish({type:'reset'});
  unsubscribe();
  unsubscribe(); // idempotent
  bus.publish({type:'reset'});
  assert.equal(observed.length,1);
  bus.clear();
  bus.publish({type:'reset'});
  assert.equal(observed.length,1);
});

test('the bus isolates instances and has no global listeners', () => {
  const a=new PracticeEventBus();
  const b=new PracticeEventBus();
  let called=0;
  a.subscribe(()=>{called++;});
  b.publish({type:'reset'});
  assert.equal(called,0);
  a.publish({type:'reset'});
  assert.equal(called,1);
});

test('event labels describe confirmed damage, MP loss and combo without guessing', () => {
  assert.match(practiceEventLabel({
    type:'impactConfirmed',sequence:1,
    impact:{sequence:5,damage:38,x:875,y:560,direction:1,kind:'launcher'},
  }), /38 dano/);
  assert.match(practiceEventLabel({type:'comboChanged',sequence:2,combo:3,bestCombo:4}), /Combo 3/);
  assert.match(practiceEventLabel({type:'comboChanged',sequence:3,combo:0,bestCombo:4}), /encerrado/);
  assert.match(practiceEventLabel({type:'mpChanged',sequence:4,before:300,after:100,reason:'skill',level:2}), /MP2 lançado/);
  assert.match(practiceEventLabel({type:'mpChanged',sequence:5,before:100,after:106,reason:'hit'}), /\+6/);
  assert.match(practiceEventLabel({type:'dummyDefeated',sequence:6,total:2}), /2 total/);
});
