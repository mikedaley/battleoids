import type { Entity, Shape, Vector2 } from '../core/types';
import { add, scale, angleToVector, magnitude } from '../physics/math';
import { CONFIG } from '../core/config';

// The player's ship - a classic triangle design

const SHIP_SHAPE: Shape = [
  { x: 0, y: -15 }, // nose
  { x: 10, y: 12 }, // right wing
  { x: 0, y: 6 }, // back center notch
  { x: -10, y: 12 }, // left wing
];

// Thruster flame shapes - we alternate between these for a flickering effect
export const THRUSTER_SHAPES: Shape[] = [
  // Small flame
  [
    { x: -4, y: 8 },
    { x: 0, y: 16 },
    { x: 4, y: 8 },
  ],
  // Medium flame
  [
    { x: -5, y: 8 },
    { x: -2, y: 14 },
    { x: 0, y: 22 },
    { x: 2, y: 14 },
    { x: 5, y: 8 },
  ],
  // Large flame
  [
    { x: -5, y: 8 },
    { x: -3, y: 18 },
    { x: 0, y: 26 },
    { x: 3, y: 18 },
    { x: 5, y: 8 },
  ],
];

export type HyperspaceState = 'idle' | 'shrinking' | 'warping' | 'expanding';

export class Ship implements Entity {
  transform = {
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
  };
  velocity: Vector2 = { x: 0, y: 0 };
  angularVelocity = 0;
  shape = SHIP_SHAPE;
  radius = CONFIG.ship.radius;
  isActive = true;

  isThrusting = false;
  invulnerableTime = 0; // seconds of invulnerability remaining

  // Hyperspace state
  hyperspaceState: HyperspaceState = 'idle';
  hyperspaceTimer = 0;
  hyperspaceCooldown = 0;
  hyperspaceTargetPosition: Vector2 = { x: 0, y: 0 };

  constructor(x: number, y: number) {
    this.transform.position = { x, y };
  }

  reset(x: number, y: number): void {
    this.transform.position = { x, y };
    this.transform.rotation = 0;
    this.velocity = { x: 0, y: 0 };
    this.isActive = true;
    this.invulnerableTime = CONFIG.ship.invulnerabilityOnSpawn;
  }

  rotateLeft(dt: number): void {
    this.transform.rotation -= CONFIG.ship.rotationSpeed * dt;
  }

  rotateRight(dt: number): void {
    this.transform.rotation += CONFIG.ship.rotationSpeed * dt;
  }

  thrust(dt: number): void {
    this.isThrusting = true;
    const direction = angleToVector(this.transform.rotation);
    const acceleration = scale(direction, CONFIG.ship.thrustPower * dt);
    this.velocity = add(this.velocity, acceleration);

    // Cap the speed
    const speed = magnitude(this.velocity);
    if (speed > CONFIG.ship.maxSpeed) {
      this.velocity = scale(this.velocity, CONFIG.ship.maxSpeed / speed);
    }
  }

  update(dt: number): void {
    // Update hyperspace animation
    if (this.hyperspaceState !== 'idle') {
      this.hyperspaceTimer += dt;

      switch (this.hyperspaceState) {
        case 'shrinking':
          if (this.hyperspaceTimer >= CONFIG.hyperspace.shrinkTime) {
            this.hyperspaceState = 'warping';
            this.hyperspaceTimer = 0;
          }
          break;
        case 'warping':
          if (this.hyperspaceTimer >= CONFIG.hyperspace.warpTime) {
            // Teleport to new position
            this.transform.position = { ...this.hyperspaceTargetPosition };
            this.velocity = { x: 0, y: 0 }; // Reset velocity
            this.hyperspaceState = 'expanding';
            this.hyperspaceTimer = 0;
          }
          break;
        case 'expanding':
          if (this.hyperspaceTimer >= CONFIG.hyperspace.expandTime) {
            this.hyperspaceState = 'idle';
            this.hyperspaceTimer = 0;
            this.hyperspaceCooldown = CONFIG.hyperspace.cooldown;
          }
          break;
      }
    }

    // Update hyperspace cooldown
    if (this.hyperspaceCooldown > 0) {
      this.hyperspaceCooldown -= dt;
    }

    // Update position (only when not in warp phase)
    if (this.hyperspaceState !== 'warping') {
      this.transform.position = add(this.transform.position, scale(this.velocity, dt));
    }

    // Count down invulnerability
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= dt;
    }
  }

  getNosePosition(): Vector2 {
    // Get the position of the ship's nose for spawning bullets
    const direction = angleToVector(this.transform.rotation);
    return add(this.transform.position, scale(direction, 15));
  }

  isInvulnerable(): boolean {
    return this.invulnerableTime > 0;
  }

  canHyperspace(): boolean {
    return this.hyperspaceState === 'idle' && this.hyperspaceCooldown <= 0;
  }

  activateHyperspace(targetX: number, targetY: number): void {
    if (!this.canHyperspace()) return;

    this.hyperspaceState = 'shrinking';
    this.hyperspaceTimer = 0;
    this.hyperspaceTargetPosition = { x: targetX, y: targetY };
    this.invulnerableTime = Math.max(
      this.invulnerableTime,
      CONFIG.hyperspace.shrinkTime +
        CONFIG.hyperspace.warpTime +
        CONFIG.hyperspace.expandTime +
        CONFIG.hyperspace.invulnerability
    );
  }

  getHyperspaceProgress(): number {
    // Returns 0-1 progress through the current hyperspace phase
    switch (this.hyperspaceState) {
      case 'shrinking':
        return this.hyperspaceTimer / CONFIG.hyperspace.shrinkTime;
      case 'warping':
        return this.hyperspaceTimer / CONFIG.hyperspace.warpTime;
      case 'expanding':
        return this.hyperspaceTimer / CONFIG.hyperspace.expandTime;
      default:
        return 0;
    }
  }

  getHyperspaceScale(): number {
    // Returns the scale factor for the ship during hyperspace animation
    if (this.hyperspaceState === 'idle') return 1;

    const progress = this.getHyperspaceProgress();

    if (this.hyperspaceState === 'shrinking') {
      // Shrink from 1 to 0
      return 1 - progress;
    } else if (this.hyperspaceState === 'expanding') {
      // Expand from 0 to 1
      return progress;
    }

    return 0; // warping - invisible
  }

  isInHyperspace(): boolean {
    return this.hyperspaceState !== 'idle';
  }
}
