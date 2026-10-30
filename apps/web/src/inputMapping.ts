import type { PracticeInput } from './protocol';

// Small pure input adapter: Phaser key objects are structurally compatible.
// Keeping this outside GameCanvas lets QA verify the actual keys being sent.
export type KeyState = Record<string, { isDown: boolean }>;

export function readGameInput(
  keys: KeyState,
  mobile: PracticeInput,
  practiceMode: boolean,
): PracticeInput {
  const pressed = (name: string) => keys[name]?.isDown === true;
  const up = pressed('UP') || pressed('W') || mobile.jump === true;
  const down = pressed('DOWN') || mobile.down === true;
  if (practiceMode) {
    return {
      left: pressed('LEFT') || mobile.left === true,
      right: pressed('RIGHT') || mobile.right === true,
      jump: up,
      up,
      down,
      drop: (pressed('SPACE') || mobile.drop === true) && down,
      attack: pressed('J') || mobile.attack === true,
      charge: pressed('Z') || mobile.charge === true,
      skill: false,
    };
  }
  return {
    left: pressed('A') || pressed('LEFT') || mobile.left === true,
    right: pressed('D') || pressed('RIGHT') || mobile.right === true,
    jump: pressed('W') || pressed('UP') || pressed('SPACE') || mobile.jump === true,
    attack: pressed('J') || pressed('Z') || mobile.attack === true,
    skill: pressed('K') || pressed('X') || mobile.skill === true,
    down,
  };
}
