import type { Shape } from '../core/types';
import { randomRange } from '../physics/math';
import { CONFIG } from '../core/config';
import { ScoreableEntity } from './baseEntity';

// UFO sizes - small is faster and worth more points but harder to hit
export type UFOSize = 'large' | 'small';

// Classic flying saucer shape
function generateUFOShape(size: UFOSize): Shape {
  const config = CONFIG.ufo[size];
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

export class UFO extends ScoreableEntity {
  size: UFOSize;

  private directionChangeTimer = 0;
  private verticalDirection = 0;
  private baseSpeed: number;
  private horizontalDirection: number; // 1 = right, -1 = left
  private shootTimer = 0;
  private shootCooldown: number;

  constructor(screenWidth: number, screenHeight: number, size: UFOSize = 'large', level = 1) {
    const config = CONFIG.ufo[size];
    super(0, 0, config.points); // Position set below

    this.size = size;
    this.shape = generateUFOShape(size);
    this.radius = config.radius;
    this.baseSpeed = config.speed;

    // Cooldown decreases with level (fires faster at higher levels)
    // Reduce by 10% per level, minimum 30% of original
    const cooldownMultiplier = Math.max(0.3, 1 - (level - 1) * 0.1);
    this.shootCooldown = config.shootCooldown * cooldownMultiplier;

    // Start with a random delay before first shot
    this.shootTimer = randomRange(0.5, this.shootCooldown);

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
    this.directionChangeTimer = randomRange(
      CONFIG.ufo.directionChangeInterval.min,
      CONFIG.ufo.directionChangeInterval.max
    );
  }

  update(dt: number): void {
    // Change vertical direction periodically for erratic movement
    this.directionChangeTimer -= dt;
    if (this.directionChangeTimer <= 0) {
      this.verticalDirection = randomRange(-1, 1);
      this.directionChangeTimer = randomRange(
        CONFIG.ufo.directionChangeInterval.min,
        CONFIG.ufo.directionChangeInterval.max
      );
    }

    // Update shoot timer
    if (this.shootTimer > 0) {
      this.shootTimer -= dt;
    }

    // Update velocity with vertical component
    this.velocity = {
      x: this.baseSpeed * this.horizontalDirection,
      y: this.baseSpeed * CONFIG.ufo.verticalSpeedFactor * this.verticalDirection,
    };

    // Use parent's physics update
    super.update(dt);
  }

  /**
   * Check if UFO is ready to fire and return shot angle toward player
   * Returns angle in radians if ready to shoot, null otherwise
   */
  tryShoot(playerX: number, playerY: number): number | null {
    if (this.shootTimer > 0) {
      return null;
    }

    // Reset timer
    this.shootTimer = this.shootCooldown;

    // Calculate angle to player with some inaccuracy
    const dx = playerX - this.transform.position.x;
    const dy = playerY - this.transform.position.y;
    const angleToPlayer = Math.atan2(dy, dx);

    // Large UFOs are less accurate than small ones
    const inaccuracy = this.size === 'large' ? 0.4 : 0.15;
    const randomSpread = randomRange(-inaccuracy, inaccuracy);

    return angleToPlayer + randomSpread;
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
