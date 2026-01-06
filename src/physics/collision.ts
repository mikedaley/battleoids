import type { Entity } from '../core/types';
import { distance } from './math';

// Simple circle-based collision detection
// Good enough for asteroids and feels pretty accurate

export function checkCollision(a: Entity, b: Entity): boolean {
  if (!a.isActive || !b.isActive) {
    return false;
  }

  const dist = distance(a.transform.position, b.transform.position);
  return dist < a.radius + b.radius;
}

// Check if an entity is out of bounds and needs to wrap
export function wrapEntity(entity: Entity, width: number, height: number): void {
  const pos = entity.transform.position;
  const margin = entity.radius;

  if (pos.x < -margin) {
    pos.x = width + margin;
  } else if (pos.x > width + margin) {
    pos.x = -margin;
  }

  if (pos.y < -margin) {
    pos.y = height + margin;
  } else if (pos.y > height + margin) {
    pos.y = -margin;
  }
}
