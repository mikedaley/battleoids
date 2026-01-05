import type { Entity, Shape, Vector2 } from '../types';
import { add, scale } from '../math';

// Bullets are simple fast-moving points

const BULLET_SPEED = 500;
const BULLET_LIFETIME = 1.5; // seconds before despawning

export class Bullet implements Entity {
  transform = {
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
  };
  velocity: Vector2;
  angularVelocity = 0;
  shape: Shape = []; // Bullets are drawn as points, not shapes
  radius = 2;
  isActive = true;

  private lifetime: number;

  constructor(x: number, y: number, direction: Vector2) {
    this.transform.position = { x, y };
    this.velocity = scale(direction, BULLET_SPEED);
    this.lifetime = BULLET_LIFETIME;
  }

  update(dt: number): void {
    this.transform.position = add(this.transform.position, scale(this.velocity, dt));

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.isActive = false;
    }
  }
}
