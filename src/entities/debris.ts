import type { Vector2 } from '../core/types';
import { add, scale, rotate, randomRange } from '../physics/math';
import { CONFIG } from '../core/config';

// A single piece of debris - a line segment that drifts and fades

export interface DebrisLine {
  start: Vector2;
  end: Vector2;
  velocity: Vector2;
  angularVelocity: number;
  rotation: number;
  lifetime: number;
  maxLifetime: number;
}

export class Debris {
  lines: DebrisLine[] = [];
  isActive = true;
  color: string;

  constructor(position: Vector2, shipRotation: number, shipShape: Vector2[], color: string = '#0ff') {
    this.color = color;
    const lifetime = CONFIG.visual.debrisLifetime;
    const baseSpeed = CONFIG.visual.debrisSpeed;

    // Break the ship shape into individual line segments
    for (let i = 0; i < shipShape.length; i++) {
      const nextIndex = (i + 1) % shipShape.length;

      // Transform points by ship rotation
      const start = rotate(shipShape[i], shipRotation);
      const end = rotate(shipShape[nextIndex], shipRotation);

      // Each line gets its own random velocity
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(baseSpeed * 0.5, baseSpeed);

      this.lines.push({
        start: add(position, start),
        end: add(position, end),
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        angularVelocity: randomRange(-3, 3),
        rotation: 0,
        lifetime: lifetime,
        maxLifetime: lifetime,
      });
    }
  }

  update(dt: number): void {
    let anyActive = false;

    for (const line of this.lines) {
      if (line.lifetime <= 0) continue;

      // Move the line segment
      const delta = scale(line.velocity, dt);
      line.start = add(line.start, delta);
      line.end = add(line.end, delta);

      // Rotate around the midpoint
      line.rotation += line.angularVelocity * dt;
      const mid = {
        x: (line.start.x + line.end.x) / 2,
        y: (line.start.y + line.end.y) / 2,
      };

      // Rotate start and end around midpoint
      const halfLen = {
        x: (line.end.x - line.start.x) / 2,
        y: (line.end.y - line.start.y) / 2,
      };
      const rotatedHalf = rotate(halfLen, line.angularVelocity * dt);
      line.start = { x: mid.x - rotatedHalf.x, y: mid.y - rotatedHalf.y };
      line.end = { x: mid.x + rotatedHalf.x, y: mid.y + rotatedHalf.y };

      line.lifetime -= dt;
      if (line.lifetime > 0) {
        anyActive = true;
      }
    }

    this.isActive = anyActive;
  }

  getAlpha(line: DebrisLine): number {
    // Fade out over the last half of lifetime
    if (line.lifetime < line.maxLifetime / 2) {
      return line.lifetime / (line.maxLifetime / 2);
    }
    return 1;
  }
}
