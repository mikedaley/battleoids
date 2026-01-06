import type { Vector2 } from '../types';
import { scale } from '../math';
import { CONFIG } from '../config';
import { TimedEntity } from './baseEntity';

// Bullets are simple fast-moving points

export class Bullet extends TimedEntity {
  constructor(x: number, y: number, direction: Vector2) {
    super(x, y, CONFIG.bullet.lifetime);
    this.velocity = scale(direction, CONFIG.bullet.speed);
    this.radius = CONFIG.bullet.radius;
    // Bullets are drawn as points, not shapes - shape stays empty
  }
}
