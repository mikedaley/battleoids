import type { Entity, Shape, Vector2, AsteroidSize } from '../types';
import { add, scale, randomRange, randomInt } from '../math';

// Asteroids come in three sizes and have irregular shapes

const SIZE_CONFIG = {
  large: { radius: 40, minVerts: 10, maxVerts: 14, speed: 50, points: 20 },
  medium: { radius: 20, minVerts: 8, maxVerts: 10, speed: 80, points: 50 },
  small: { radius: 10, minVerts: 6, maxVerts: 8, speed: 120, points: 100 },
};

function generateAsteroidShape(size: AsteroidSize): Shape {
  const config = SIZE_CONFIG[size];
  const numVerts = randomInt(config.minVerts, config.maxVerts);
  const shape: Shape = [];

  // Generate vertices around a circle with random variation
  for (let i = 0; i < numVerts; i++) {
    const angle = (i / numVerts) * Math.PI * 2;
    // Vary the radius between 70% and 100% for that rocky look
    const r = config.radius * randomRange(0.7, 1.0);
    shape.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }

  return shape;
}

export class Asteroid implements Entity {
  transform = {
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
  };
  velocity: Vector2 = { x: 0, y: 0 };
  angularVelocity: number;
  shape: Shape;
  radius: number;
  isActive = true;
  size: AsteroidSize;
  points: number;

  constructor(x: number, y: number, size: AsteroidSize, direction?: Vector2) {
    this.size = size;
    const config = SIZE_CONFIG[size];

    this.transform.position = { x, y };
    this.shape = generateAsteroidShape(size);
    this.radius = config.radius;
    this.points = config.points;

    // Random spin
    this.angularVelocity = randomRange(-2, 2);

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

  update(dt: number): void {
    this.transform.position = add(this.transform.position, scale(this.velocity, dt));
    this.transform.rotation += this.angularVelocity * dt;
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
