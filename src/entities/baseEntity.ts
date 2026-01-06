import type { Entity, Shape, Vector2, Transform } from '../core/types';
import { add, scale } from '../physics/math';

/**
 * Abstract base class for all game entities
 * Provides common transform, physics, and collision properties
 */
export abstract class BaseEntity implements Entity {
  transform: Transform = {
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
  };

  velocity: Vector2 = { x: 0, y: 0 };
  angularVelocity = 0;
  shape: Shape = [];
  radius = 0;
  isActive = true;

  constructor(x: number, y: number) {
    this.transform.position = { x, y };
  }

  /**
   * Update entity state each frame
   * Subclasses should call super.update(dt) or implement their own physics
   */
  update(dt: number): void {
    this.updatePhysics(dt);
  }

  /**
   * Apply basic physics: position += velocity, rotation += angularVelocity
   * Can be called by subclasses that need standard physics behavior
   */
  protected updatePhysics(dt: number): void {
    this.transform.position = add(this.transform.position, scale(this.velocity, dt));
    this.transform.rotation += this.angularVelocity * dt;
  }

  /**
   * Set entity position directly
   */
  setPosition(x: number, y: number): void {
    this.transform.position = { x, y };
  }

  /**
   * Get current position
   */
  getPosition(): Vector2 {
    return this.transform.position;
  }

  /**
   * Deactivate the entity (mark for removal)
   */
  destroy(): void {
    this.isActive = false;
  }
}

/**
 * Entity with a finite lifetime
 * Automatically deactivates after the lifetime expires
 */
export abstract class TimedEntity extends BaseEntity {
  protected lifetime: number;

  constructor(x: number, y: number, lifetime: number) {
    super(x, y);
    this.lifetime = lifetime;
  }

  update(dt: number): void {
    super.update(dt);
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.isActive = false;
    }
  }

  /**
   * Get remaining lifetime (for effects like fading)
   */
  getRemainingLifetime(): number {
    return this.lifetime;
  }
}

/**
 * Entity that awards points when destroyed
 */
export abstract class ScoreableEntity extends BaseEntity {
  readonly points: number;

  constructor(x: number, y: number, points: number) {
    super(x, y);
    this.points = points;
  }
}
