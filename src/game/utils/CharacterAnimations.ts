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

  // Down (row 1: 0-3, using 0-1 for simplicity)
  make(k("idle-down"), [0, 1]);
  make(k("walk-down"), [0, 1]);
  make(k("run-down"), [0, 1]);

  // Left (row 2: 4-7, using 4-5)
  make(k("idle-left"), [4, 5]);
  make(k("walk-left"), [4, 5]);
  make(k("run-left"), [4, 5]);

  // Right (row 3: 8-11, using 8-9)
  make(k("idle-right"), [8, 9]);
  make(k("walk-right"), [8, 9]);
  make(k("run-right"), [8, 9]);

  // Up (row 4: 12-15, using 12-13)
  make(k("idle-up"), [12, 13]);
  make(k("walk-up"), [12, 13]);
  make(k("run-up"), [12, 13]);

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
    legacyMake("walk-down", [0, 1]);
    legacyMake("run-down", [0, 1]);

    legacyMake("idle-left", [4, 5]);
    legacyMake("walk-left", [4, 5]);
    legacyMake("run-left", [4, 5]);

    legacyMake("idle-right", [8, 9]);
    legacyMake("walk-right", [8, 9]);
    legacyMake("run-right", [8, 9]);

    legacyMake("idle-up", [12, 13]);
    legacyMake("walk-up", [12, 13]);
    legacyMake("run-up", [12, 13]);
  }
}
