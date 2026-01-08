import type { Vector2 } from '../core/types';
import { randomRange } from '../physics/math';

export interface Star {
  position: Vector2;
  brightness: number; // 0.1 to 0.4 for dim stars
  size: number; // 1 or 2 pixels
}

export class Starfield {
  stars: Star[] = [];

  constructor(width: number, height: number, count: number) {
    // Generate random stars across the entire screen
    for (let i = 0; i < count; i++) {
      this.stars.push({
        position: {
          x: randomRange(0, width),
          y: randomRange(0, height),
        },
        brightness: randomRange(0.1, 0.4),
        size: Math.random() < 0.8 ? 1 : 2, // 80% small stars, 20% slightly bigger
      });
    }
  }
}
