import type { Shape, Vector2, AsteroidSize } from '../types';
import { scale, randomRange, randomInt } from '../math';
import { CONFIG } from '../config';
import { ScoreableEntity } from './baseEntity';

// Asteroids come in three sizes and have irregular shapes

function generateAsteroidShape(size: AsteroidSize): Shape {
  const config = CONFIG.asteroid[size];
  const numVerts = randomInt(config.minVerts, config.maxVerts);
  const shape: Shape = [];

  // Generate vertices around a circle with random variation
  for (let i = 0; i < numVerts; i++) {
    const angle = (i / numVerts) * Math.PI * 2;
    const r =
      config.radius *
      randomRange(CONFIG.asteroid.radiusVariation.min, CONFIG.asteroid.radiusVariation.max);
    shape.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }

  return shape;
}

export class Asteroid extends ScoreableEntity {
  size: AsteroidSize;

  constructor(x: number, y: number, size: AsteroidSize, direction?: Vector2) {
    const config = CONFIG.asteroid[size];
    super(x, y, config.points);

    this.size = size;
    this.shape = generateAsteroidShape(size);
    this.radius = config.radius;

    // Random spin
    this.angularVelocity = randomRange(
      CONFIG.asteroid.spinRange.min,
      CONFIG.asteroid.spinRange.max
    );

    // Random or specified direction
    if (direction) {
      this.velocity = scale(direction, config.speed);
    } else {
      const angle = randomRange(0, Math.PI * 2);
      this.velocity = {
        x: Math.cos(angle) * config.speed,
        y: Math.sin(angle) * config.speed,
      };
    }
  }

  // When destroyed, large asteroids split into medium, medium into small
  split(): Asteroid[] {
    if (this.size === 'small') {
      return [];
    }

    const nextSize: AsteroidSize = this.size === 'large' ? 'medium' : 'small';
    const { x, y } = this.transform.position;

    // Spawn 2 smaller asteroids going in different directions
    const angle1 = randomRange(0, Math.PI * 2);
    const angle2 = angle1 + Math.PI / 2 + randomRange(-0.5, 0.5);

    return [
      new Asteroid(x, y, nextSize, { x: Math.cos(angle1), y: Math.sin(angle1) }),
      new Asteroid(x, y, nextSize, { x: Math.cos(angle2), y: Math.sin(angle2) }),
    ];
  }
}
