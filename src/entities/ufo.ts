import type { Entity, Shape, Vector2 } from '../types';
import { add, scale, randomRange } from '../math';

// UFO sizes - small is faster and worth more points but harder to hit
export type UFOSize = 'large' | 'small';

const SIZE_CONFIG = {
  large: { radius: 20, speed: 100, points: 200, shootCooldown: 2.0 },
  small: { radius: 12, speed: 150, points: 1000, shootCooldown: 1.0 },
};

// Classic flying saucer shape
function generateUFOShape(size: UFOSize): Shape {
  const config = SIZE_CONFIG[size];
  const r = config.radius;
  const h = r * 0.4; // height of dome

  // Flying saucer shape: dome on top, flat body with angled edges
  return [
    // Top dome
    { x: -r * 0.3, y: -h },
    { x: r * 0.3, y: -h },
    // Right side of dome connecting to body
    { x: r * 0.5, y: -h * 0.3 },
    // Right edge of body (wider)
    { x: r, y: 0 },
    // Bottom right
    { x: r * 0.6, y: h * 0.5 },
    // Bottom center
    { x: -r * 0.6, y: h * 0.5 },
    // Bottom left
    { x: -r, y: 0 },
    // Left side of dome connecting to body
    { x: -r * 0.5, y: -h * 0.3 },
  ];
}

export class UFO implements Entity {
  transform = {
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1,
  };
  velocity: Vector2 = { x: 0, y: 0 };
  angularVelocity = 0;
  shape: Shape;
  radius: number;
  isActive = true;
  size: UFOSize;
  points: number;

  private directionChangeTimer = 0;
  private verticalDirection = 0;
  private baseSpeed: number;
  private horizontalDirection: number; // 1 = right, -1 = left

  constructor(screenWidth: number, screenHeight: number, size: UFOSize = 'large') {
    this.size = size;
    const config = SIZE_CONFIG[size];

    this.shape = generateUFOShape(size);
    this.radius = config.radius;
    this.points = config.points;
    this.baseSpeed = config.speed;

    // Spawn on left or right edge
    const spawnOnLeft = Math.random() < 0.5;
    this.horizontalDirection = spawnOnLeft ? 1 : -1;

    const x = spawnOnLeft ? -this.radius : screenWidth + this.radius;
    const y = randomRange(screenHeight * 0.2, screenHeight * 0.8);

    this.transform.position = { x, y };

    // Set initial velocity (horizontal movement)
    this.velocity = {
      x: this.baseSpeed * this.horizontalDirection,
      y: 0,
    };

    // Random initial vertical direction
    this.verticalDirection = randomRange(-1, 1);
    this.directionChangeTimer = randomRange(0.5, 1.5);
  }

  update(dt: number): void {
    // Change vertical direction periodically for erratic movement
    this.directionChangeTimer -= dt;
    if (this.directionChangeTimer <= 0) {
      this.verticalDirection = randomRange(-1, 1);
      this.directionChangeTimer = randomRange(0.5, 1.5);
    }

    // Update velocity with vertical component
    this.velocity = {
      x: this.baseSpeed * this.horizontalDirection,
      y: this.baseSpeed * 0.3 * this.verticalDirection,
    };

    this.transform.position = add(this.transform.position, scale(this.velocity, dt));
  }

  // Check if UFO has left the screen (for cleanup)
  isOffScreen(screenWidth: number): boolean {
    const { x } = this.transform.position;
    const margin = this.radius * 2;

    if (this.horizontalDirection > 0) {
      return x > screenWidth + margin;
    } else {
      return x < -margin;
    }
  }
}
