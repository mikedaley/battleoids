import type { Entity, Shape, Vector2 } from '../types';
import { add, scale, angleToVector, magnitude } from '../math';

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

const ROTATION_SPEED = 5; // radians per second
const THRUST_POWER = 200; // acceleration in pixels per second squared
const MAX_SPEED = 400;

export class Ship implements Entity {
  transform = {
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
  };
  velocity: Vector2 = { x: 0, y: 0 };
  angularVelocity = 0;
  shape = SHIP_SHAPE;
  radius = 12;
  isActive = true;

  isThrusting = false;
  invulnerableTime = 0; // seconds of invulnerability remaining

  constructor(x: number, y: number) {
    this.transform.position = { x, y };
  }

  reset(x: number, y: number): void {
    this.transform.position = { x, y };
    this.transform.rotation = 0;
    this.velocity = { x: 0, y: 0 };
    this.isActive = true;
    this.invulnerableTime = 3; // 3 seconds of invulnerability on respawn
  }

  rotateLeft(dt: number): void {
    this.transform.rotation -= ROTATION_SPEED * dt;
  }

  rotateRight(dt: number): void {
    this.transform.rotation += ROTATION_SPEED * dt;
  }

  thrust(dt: number): void {
    this.isThrusting = true;
    const direction = angleToVector(this.transform.rotation);
    const acceleration = scale(direction, THRUST_POWER * dt);
    this.velocity = add(this.velocity, acceleration);

    // Cap the speed
    const speed = magnitude(this.velocity);
    if (speed > MAX_SPEED) {
      this.velocity = scale(this.velocity, MAX_SPEED / speed);
    }
  }

  update(dt: number): void {
    // Update position
    this.transform.position = add(this.transform.position, scale(this.velocity, dt));

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
}
