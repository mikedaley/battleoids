import type { Vector2 } from '../core/types';
import { randomRange } from '../physics/math';

export interface Crater {
  position: Vector2; // position relative to moon center
  radius: number;
}

export class Moon {
  position: Vector2;
  radius: number;
  craters: Crater[] = [];

  constructor(x: number, y: number, radius: number, craterCount: number) {
    this.position = { x, y };
    this.radius = radius;

    // Generate random craters on the moon surface
    for (let i = 0; i < craterCount; i++) {
      // Place craters within 80% of the moon radius so they don't extend too far
      const angle = randomRange(0, Math.PI * 2);
      const distance = randomRange(0, radius * 0.5);
      const craterRadius = randomRange(radius * 0.08, radius * 0.2);

      this.craters.push({
        position: {
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
        },
        radius: craterRadius,
      });
    }
  }
}
