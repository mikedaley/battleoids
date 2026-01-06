import type { Vector2 } from '../types';
import { add, scale } from '../math';

// Hyperspace particle - a point that animates during hyperspace transition

export interface HyperspaceParticleData {
  position: Vector2;
  offset: Vector2; // Offset from ship center
  alpha: number;
}

export class HyperspaceParticles {
  particles: HyperspaceParticleData[] = [];
  isActive = true;
  private phase: 'shrink' | 'expand';
  private centerPosition: Vector2;

  constructor(centerPosition: Vector2, phase: 'shrink' | 'expand', particleCount: number = 20) {
    this.centerPosition = centerPosition;
    this.phase = phase;

    // Create particles in a ring around the ship
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 15; // Start at ship radius
      const offset = {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
      };

      this.particles.push({
        position: add(centerPosition, offset),
        offset,
        alpha: 1,
      });
    }
  }

  update(progress: number): void {
    // progress goes from 0 to 1
    const maxDistance = 60; // Maximum distance particles travel

    for (const particle of this.particles) {
      if (this.phase === 'shrink') {
        // Particles move outward and fade
        const distance = 15 + maxDistance * progress;
        const normalizedOffset = {
          x: particle.offset.x / 15,
          y: particle.offset.y / 15,
        };
        particle.position = add(
          this.centerPosition,
          scale(normalizedOffset, distance)
        );
        particle.alpha = 1 - progress;
      } else {
        // 'expand' - particles move inward and fade in
        const distance = maxDistance * (1 - progress) + 15;
        const normalizedOffset = {
          x: particle.offset.x / 15,
          y: particle.offset.y / 15,
        };
        particle.position = add(
          this.centerPosition,
          scale(normalizedOffset, distance)
        );
        particle.alpha = progress;
      }
    }

    // Deactivate when complete
    if (progress >= 1) {
      this.isActive = false;
    }
  }
}
