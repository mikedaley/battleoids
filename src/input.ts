import type { KeyState } from './types';

// Handles keyboard input and tracks which keys are currently pressed

export class InputHandler {
  private keys: KeyState = {
    left: false,
    right: false,
    thrust: false,
    fire: false,
  };

  private firePressed = false;
  private startPressed = false;
  private spaceWasReleased = true; // Require release before new start press

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.updateKey(e.code, true);

    // Prevent scrolling with arrow keys or space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.updateKey(e.code, false);
  }

  private updateKey(code: string, isDown: boolean): void {
    switch (code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = isDown;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = isDown;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.keys.thrust = isDown;
        break;
      case 'Space':
        this.keys.fire = isDown;
        if (isDown) {
          this.firePressed = true;
          // Only register start if space was released first
          if (this.spaceWasReleased) {
            this.startPressed = true;
            this.spaceWasReleased = false;
          }
        } else {
          this.spaceWasReleased = true;
        }
        break;
    }
  }

  getKeys(): KeyState {
    return { ...this.keys };
  }

  // Check if fire was just pressed (for single-shot firing)
  consumeFirePress(): boolean {
    if (this.firePressed) {
      this.firePressed = false;
      return true;
    }
    return false;
  }

  // Check if player pressed start
  consumeStartPress(): boolean {
    if (this.startPressed) {
      this.startPressed = false;
      return true;
    }
    return false;
  }
}
