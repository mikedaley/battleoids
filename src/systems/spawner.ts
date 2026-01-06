import type { Vector2 } from '../core/types';
import { randomRange } from '../physics/math';
import { CONFIG } from '../core/config';
import { Asteroid, UFO, GravityWell, Debris } from '../entities';
import type { UFOSize } from '../entities/ufo';

/**
 * Spawner module - handles entity creation logic
 * Returns created entities for game.ts to manage
 */

/**
 * Create asteroids at random positions, avoiding a specified position
 */
export function createAsteroids(
  count: number,
  screenWidth: number,
  screenHeight: number,
  avoidPosition: Vector2,
  avoidRadius = 100
): Asteroid[] {
  const asteroids: Asteroid[] = [];

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    do {
      x = randomRange(0, screenWidth);
      y = randomRange(0, screenHeight);
    } while (
      Math.abs(x - avoidPosition.x) < avoidRadius &&
      Math.abs(y - avoidPosition.y) < avoidRadius
    );

    asteroids.push(new Asteroid(x, y, 'large'));
  }

  return asteroids;
}

/**
 * Create a UFO at the edge of the screen
 */
export function createUFO(
  screenWidth: number,
  screenHeight: number,
  level: number
): UFO {
  // Higher levels have higher chance of small (harder) UFO
  const smallChance = Math.min(
    CONFIG.ufo.smallChanceBase + level * CONFIG.ufo.smallChancePerLevel,
    CONFIG.ufo.smallChanceMax
  );
  const size: UFOSize = Math.random() < smallChance ? 'small' : 'large';

  return new UFO(screenWidth, screenHeight, size);
}

/**
 * Calculate gravity well pull strength based on level
 * Starts at min and increases each level up to max
 */
function getGravityWellPullStrength(level: number): number {
  const { min, max } = CONFIG.gravityWell.pullStrength;
  // Increase by ~40 per level, capped at max
  const strengthPerLevel = 40;
  return Math.min(max, min + (level - 1) * strengthPerLevel);
}

/**
 * Find a valid spawn position for a gravity well
 */
export function createGravityWell(
  screenWidth: number,
  screenHeight: number,
  avoidPosition: Vector2,
  level: number
): GravityWell {
  let x: number, y: number;
  let attempts = 0;
  const maxAttempts = 20;

  do {
    x = randomRange(
      CONFIG.gravityWell.spawnMargin,
      screenWidth - CONFIG.gravityWell.spawnMargin
    );
    y = randomRange(
      CONFIG.gravityWell.spawnMargin,
      screenHeight - CONFIG.gravityWell.spawnMargin
    );
    attempts++;
  } while (
    attempts < maxAttempts &&
    Math.hypot(x - avoidPosition.x, y - avoidPosition.y) <
      CONFIG.gravityWell.spawnMinDistanceFromShip
  );

  const duration = randomRange(
    CONFIG.gravityWell.duration.min,
    CONFIG.gravityWell.duration.max
  );

  const pullStrength = getGravityWellPullStrength(level);

  return new GravityWell(x, y, duration, pullStrength);
}

/**
 * Create debris from a destroyed entity
 */
export function createDebris(
  position: Vector2,
  rotation: number,
  shape: Vector2[],
  color: string = '#0ff'
): Debris {
  return new Debris(position, rotation, shape, color);
}

/**
 * Get the next UFO spawn timer value
 */
export function getNextUFOSpawnTime(): number {
  return randomRange(CONFIG.ufo.spawnDelay.min, CONFIG.ufo.spawnDelay.max);
}

/**
 * Get the next gravity well spawn timer value
 */
export function getNextGravityWellSpawnTime(): number {
  return randomRange(CONFIG.gravityWell.spawnDelay.min, CONFIG.gravityWell.spawnDelay.max);
}
