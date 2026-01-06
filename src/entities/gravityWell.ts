import type { Vector2 } from '../core/types';
import { TimedEntity } from './baseEntity';
import { CONFIG } from '../core/config';

/**
 * Gravity well - provides constant pull towards center
 * Player can fight against it with thrust but will be slowly pulled in
 * Has a swirling visual effect with spiral arms and rings
 */
export class GravityWell extends TimedEntity {
  // Effect radii - pullRadius is constant, pullStrength varies by level
  readonly pullRadius = CONFIG.gravityWell.pullRadius;
  readonly visualRadius = CONFIG.gravityWell.visualRadius;
  readonly pullStrength: number;

  // Animation state
  private rotationAngle = 0;
  private pulsePhase = 0;
  private age = 0;

  // Pre-allocated arrays to avoid GC pressure
  private readonly cachedArms: Vector2[][];
  private readonly cachedRingRadii: number[] = [0, 0, 0, 0];
  private readonly cachedPullForce: Vector2 = { x: 0, y: 0 };
  private readonly numArms = CONFIG.visual.gravityWellSpiralArms;
  private readonly pointsPerArm = CONFIG.visual.gravityWellPointsPerArm;

  constructor(x: number, y: number, duration = 8, pullStrength = CONFIG.gravityWell.pullStrength.min) {
    super(x, y, duration);
    this.pullStrength = pullStrength;

    // Pre-allocate spiral arm arrays
    this.cachedArms = [];
    for (let arm = 0; arm < this.numArms; arm++) {
      const armPoints: Vector2[] = [];
      for (let i = 0; i < this.pointsPerArm; i++) {
        armPoints.push({ x: 0, y: 0 });
      }
      this.cachedArms.push(armPoints);
    }
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
   * Returns constant pull force towards center when within range
   * Uses pre-allocated object to avoid GC pressure
   */
  getPullForce(targetPos: Vector2): Vector2 {
    const dx = this.transform.position.x - targetPos.x;
    const dy = this.transform.position.y - targetPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // No pull outside the pull radius or at the center
    if (distance > this.pullRadius || distance < 1) {
      this.cachedPullForce.x = 0;
      this.cachedPullForce.y = 0;
      return this.cachedPullForce;
    }

    // Constant pull strength regardless of distance
    // Normalize direction and apply constant strength
    this.cachedPullForce.x = (dx / distance) * this.pullStrength;
    this.cachedPullForce.y = (dy / distance) * this.pullStrength;
    return this.cachedPullForce;
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
   * Uses pre-allocated arrays to avoid GC pressure
   */
  getSpiralPoints(): Vector2[][] {
    const pulse = this.getPulse();
    const rotation = this.rotationAngle;
    const pos = this.transform.position;

    for (let arm = 0; arm < this.numArms; arm++) {
      const armPoints = this.cachedArms[arm];
      const armOffset = (arm / this.numArms) * Math.PI * 2;

      for (let i = 0; i < this.pointsPerArm; i++) {
        const t = i / this.pointsPerArm;
        const r = this.visualRadius * t * pulse;
        const angle = rotation + armOffset + t * Math.PI * 2;

        // Update existing point instead of creating new one
        armPoints[i].x = pos.x + Math.cos(angle) * r;
        armPoints[i].y = pos.y + Math.sin(angle) * r;
      }
    }

    return this.cachedArms;
  }

  /**
   * Get concentric ring radii for the visual effect
   * Uses pre-allocated array to avoid GC pressure
   */
  getRingRadii(): number[] {
    const pulse = this.getPulse();
    this.cachedRingRadii[0] = this.visualRadius * 0.3 * pulse;
    this.cachedRingRadii[1] = this.visualRadius * 0.6 * pulse;
    this.cachedRingRadii[2] = this.visualRadius * pulse;
    this.cachedRingRadii[3] = this.visualRadius * 1.3 * pulse;
    return this.cachedRingRadii;
  }

  /**
   * Convenience getter for position (used by game.ts)
   */
  get position(): Vector2 {
    return this.transform.position;
  }
}
