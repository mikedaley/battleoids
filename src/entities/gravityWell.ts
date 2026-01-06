import type { Vector2 } from '../types';
import { TimedEntity } from './baseEntity';
import { CONFIG } from '../config';

/**
 * Gravity well - pulls the ship towards it, traps if too close
 * Has a swirling visual effect with spiral arms and rings
 */
export class GravityWell extends TimedEntity {
  // Effect radii from config
  readonly pullRadius = CONFIG.gravityWell.pullRadius;
  readonly trapRadius = CONFIG.gravityWell.trapRadius;
  readonly visualRadius = CONFIG.gravityWell.visualRadius;
  readonly pullStrength = CONFIG.gravityWell.pullStrength;

  // Animation state
  private rotationAngle = 0;
  private pulsePhase = 0;
  private age = 0;

  constructor(x: number, y: number, duration = 8) {
    super(x, y, duration);
  }

  update(dt: number): void {
    this.age += dt;

    // Animate rotation and pulse
    this.rotationAngle += dt * 2;
    this.pulsePhase += dt * 4;

    // Let TimedEntity handle lifetime and deactivation
    super.update(dt);
  }

  /**
   * Calculate gravitational pull on a point
   */
  getPullForce(targetPos: Vector2): Vector2 {
    const dx = this.transform.position.x - targetPos.x;
    const dy = this.transform.position.y - targetPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.pullRadius || distance < 1) {
      return { x: 0, y: 0 };
    }

    // Stronger pull as you get closer (inverse relationship)
    const strength = (1 - distance / this.pullRadius) * this.pullStrength;

    // Normalize and apply strength
    return {
      x: (dx / distance) * strength,
      y: (dy / distance) * strength,
    };
  }

  /**
   * Check if a point is trapped (too close to escape)
   */
  isTrapped(targetPos: Vector2): boolean {
    const dx = this.transform.position.x - targetPos.x;
    const dy = this.transform.position.y - targetPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.trapRadius;
  }

  /**
   * Get distance from center (for sound intensity)
   */
  getDistance(targetPos: Vector2): number {
    const dx = this.transform.position.x - targetPos.x;
    const dy = this.transform.position.y - targetPos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get current rotation angle for animation
   */
  getRotation(): number {
    return this.rotationAngle;
  }

  /**
   * Get pulse value (0-1) for animation
   */
  getPulse(): number {
    return 0.7 + 0.3 * Math.sin(this.pulsePhase);
  }

  /**
   * Get fade value for spawn/despawn animation
   */
  getFade(): number {
    const lifetime = this.getRemainingLifetime();

    // Fade in during first 0.5 seconds
    if (this.age < 0.5) {
      return this.age / 0.5;
    }
    // Fade out during last 1 second
    if (lifetime < 1) {
      return lifetime;
    }
    return 1;
  }

  /**
   * Generate the swirling visual effect shapes
   */
  getSpiralPoints(
    numArms = CONFIG.visual.gravityWellSpiralArms,
    pointsPerArm = CONFIG.visual.gravityWellPointsPerArm
  ): Vector2[][] {
    const arms: Vector2[][] = [];
    const pulse = this.getPulse();
    const rotation = this.rotationAngle;
    const pos = this.transform.position;

    for (let arm = 0; arm < numArms; arm++) {
      const armPoints: Vector2[] = [];
      const armOffset = (arm / numArms) * Math.PI * 2;

      for (let i = 0; i < pointsPerArm; i++) {
        const t = i / pointsPerArm;
        const r = this.visualRadius * t * pulse;
        const angle = rotation + armOffset + t * Math.PI * 2;

        armPoints.push({
          x: pos.x + Math.cos(angle) * r,
          y: pos.y + Math.sin(angle) * r,
        });
      }
      arms.push(armPoints);
    }

    return arms;
  }

  /**
   * Get concentric ring radii for the visual effect
   */
  getRingRadii(): number[] {
    const pulse = this.getPulse();
    return [
      this.visualRadius * 0.3 * pulse,
      this.visualRadius * 0.6 * pulse,
      this.visualRadius * pulse,
      this.visualRadius * 1.3 * pulse,
    ];
  }

  /**
   * Convenience getter for position (used by game.ts)
   */
  get position(): Vector2 {
    return this.transform.position;
  }
}
