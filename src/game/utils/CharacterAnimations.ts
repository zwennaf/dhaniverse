import { Scene } from "phaser";

// Ensure animations exist for a given character spritesheet texture key
// It creates animations with keys like `${textureKey}-idle-down` etc.
// For backward compatibility, when textureKey === 'character', it also creates
// legacy unprefixed keys (e.g., 'idle-down') if they don't already exist.
export function ensureCharacterAnimations(scene: Scene, textureKey: string) {
  const { anims } = scene;

  const make = (key: string, frames: number[]) => {
    if (!anims.exists(key)) {
      anims.create({
        key,
        frames: anims.generateFrameNumbers(textureKey, { frames }),
        frameRate: 2,
        repeat: -1,
      });
    }
  };

  const k = (name: string) => `${textureKey}-${name}`;

  // Down (row 1: 0-3) — idle uses 0-1; walk/run use 2-3
  make(k("idle-down"), [0, 1]);
  make(k("walk-down"), [2, 3]);
  make(k("run-down"), [2, 3]);

  // Left (row 2: 4-7) — idle uses 4-5; walk/run use 6-7
  make(k("idle-left"), [4, 5]);
  make(k("walk-left"), [6, 7]);
  make(k("run-left"), [6, 7]);

  // Right (row 3: 8-11) — idle uses 8-9; walk/run use 10-11
  make(k("idle-right"), [8, 9]);
  make(k("walk-right"), [10, 11]);
  make(k("run-right"), [10, 11]);

  // Up (row 4: 12-15) — idle uses 12-13; walk/run use 14-15
  make(k("idle-up"), [12, 13]);
  make(k("walk-up"), [14, 15]);
  make(k("run-up"), [14, 15]);

  // Backward compatibility for existing code that uses unprefixed keys
  if (textureKey === "character") {
    const legacyMake = (name: string, frames: number[]) => {
      if (!anims.exists(name)) {
        anims.create({
          key: name,
          frames: anims.generateFrameNumbers(textureKey, { frames }),
          frameRate: 2,
          repeat: -1,
        });
      }
    };

  legacyMake("idle-down", [0, 1]);
  legacyMake("walk-down", [2, 3]);
  legacyMake("run-down", [2, 3]);

  legacyMake("idle-left", [4, 5]);
  legacyMake("walk-left", [6, 7]);
  legacyMake("run-left", [6, 7]);

  legacyMake("idle-right", [8, 9]);
  legacyMake("walk-right", [10, 11]);
  legacyMake("run-right", [10, 11]);

  legacyMake("idle-up", [12, 13]);
  legacyMake("walk-up", [14, 15]);
  legacyMake("run-up", [14, 15]);
  }
}
