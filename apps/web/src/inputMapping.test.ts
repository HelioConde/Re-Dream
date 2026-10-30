import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readGameInput, type KeyState } from './inputMapping';
import { EMPTY_CONTROLS, type PracticeInput } from './protocol';

function input(held: string[], mobile: PracticeInput = { ...EMPTY_CONTROLS }, practice = true) {
  const keys = Object.fromEntries(
    ['A','D','W','S','J','K','LEFT','RIGHT','UP','DOWN','SPACE','Z','X']
      .map(key => [key, { isDown: held.includes(key) }]),
  ) as KeyState;
  return readGameInput(keys, mobile, practice);
}

test('keyboard DOWN reaches local practice regardless of Space', () => {
  assert.equal(input(['DOWN']).down, true);
  assert.equal(input(['DOWN']).drop, false);
  assert.equal(input(['DOWN','SPACE']).drop, true);
  assert.equal(input(['S']).down, false, 'S does not replace the down arrow in practice');
});

test('keyboard DOWN reaches multiplayer input payload (previously missing)', () => {
  const down = input(['DOWN'], undefined, false);
  assert.equal(down.down, true);
  assert.equal(down.jump, false);
  assert.equal(down.attack, false);
  assert.equal(down.skill, false);
  assert.equal(input(['DOWN', 'LEFT'], undefined, false).left, true);
  assert.equal(input([], undefined, false).down, false);
});

test('mobile DOWN works in both modes with no second button', () => {
  for (const practice of [true,false]) {
    const mapped = input([], { ...EMPTY_CONTROLS, down:true }, practice);
    assert.equal(mapped.down, true);
    assert.equal(mapped.jump, false);
  }
});

test('practice skill can only be charged with Z, not shortcut keys', () => {
  const actual = input(['A','S','D','K','Z']);
  assert.equal(actual.charge, true);
  assert.equal(actual.skill, false);
  assert.equal(actual.left, false);
  assert.equal(actual.right, false);
  assert.equal(actual.down, false);
});
