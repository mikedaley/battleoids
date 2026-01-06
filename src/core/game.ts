import type { GameData } from './types';
import { Renderer } from '../rendering/renderer';
import { InputHandler } from '../systems/input';
import { AudioManager } from '../systems/audio';
import {
  Ship,
  Asteroid,
  Bullet,
  THRUSTER_SHAPES,
  Debris,
  HyperspaceParticles,
  UFO,
  GravityWell,
} from '../entities';
import { checkCollision, wrapEntity } from '../physics/collision';
import { angleToVector, randomRange } from '../physics/math';
import { drawMainMenu, drawHUD, drawGameOver, type HUDState } from '../rendering/ui';
import { CONFIG } from './config';
import {
  createAsteroids,
  createUFO,
  createGravityWell,
  createDebris,
  getNextUFOSpawnTime,
  getNextGravityWellSpawnTime,
} from '../systems/spawner';

export class Game {
  private renderer: Renderer;
  private input: InputHandler;
  private audio: AudioManager;

  private ship: Ship;
  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private ufoBullets: Bullet[] = [];
  private debris: Debris[] = [];
  private hyperspaceParticles: HyperspaceParticles | null = null;
  private ufo: UFO | null = null;
  private ufoSpawnTimer = 0;
  private gravityWell: GravityWell | null = null;
  private gravityWellSpawnTimer = 0;
  private wasGravityWellActive = false;

  private data: GameData = {
    score: 0,
    lives: 3,
    level: 1,
    state: 'start',
  };

  private fireCooldown = 0;
  private lastTime = 0;
  private respawnTimer = 0;
  private gameOverTimer = 0;
  private lastHyperspaceState: string = 'idle';

  // FPS tracking
  private frameCount = 0;
  private fpsTime = 0;
  private fpsEl: HTMLElement;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new InputHandler();
    this.audio = new AudioManager();

    // Create ship at center
    this.ship = new Ship(this.renderer.width / 2, this.renderer.height / 2);

    // FPS counter element
    this.fpsEl = document.getElementById('fps-counter')!;
  }

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // cap delta time
    this.lastTime = currentTime;

    // Update FPS counter
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fpsEl.textContent = `FPS: ${this.frameCount}`;
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number): void {
    // Handle glow toggle in any state
    if (this.input.consumeGlowTogglePress()) {
      this.renderer.glowEnabled = !this.renderer.glowEnabled;
    }

    if (this.data.state === 'start') {
      if (this.input.consumeStartPress()) {
        this.startGame();
      }
      return;
    }

    if (this.data.state === 'gameOver') {
      // Countdown to return to menu
      this.gameOverTimer -= dt;
      if (this.gameOverTimer <= 0) {
        this.resetGame();
        return;
      }
      // Or press space to play again immediately
      if (this.input.consumeStartPress()) {
        this.resetGame();
        this.startGame();
      }
      return;
    }

    // Check for ESC to return to menu
    if (this.input.consumeMenuPress()) {
      this.resetGame();
      return;
    }

    // Handle respawn timer
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.ship.reset(this.renderer.width / 2, this.renderer.height / 2);
      }
    }

    // Update cooldowns
    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
    }

    // Handle input (block during respawn while debris is clearing)
    if (this.respawnTimer <= 0) {
      const keys = this.input.getKeys();
      this.ship.isThrusting = false;

      if (this.ship.isActive) {
        if (keys.left) {
          this.ship.rotateLeft(dt);
        }
        if (keys.right) {
          this.ship.rotateRight(dt);
        }
        if (keys.thrust) {
          this.ship.thrust(dt);
          this.audio.playThrust();
        }
        if (this.input.consumeFirePress() && this.fireCooldown <= 0) {
          this.fire();
        }
        if (this.input.consumeHyperspacePress()) {
          // Generate random position
          const targetX = randomRange(0, this.renderer.width);
          const targetY = randomRange(0, this.renderer.height);
          this.ship.activateHyperspace(targetX, targetY);
        }
      }
    }

    // Update entities
    this.ship.update(dt);
    wrapEntity(this.ship, this.renderer.width, this.renderer.height);

    // Check for hyperspace state changes and create particles
    const currentHyperspaceState = this.ship.hyperspaceState;
    if (currentHyperspaceState !== this.lastHyperspaceState) {
      if (currentHyperspaceState === 'shrinking') {
        this.audio.playHyperspace();
        this.hyperspaceParticles = new HyperspaceParticles(
          this.ship.transform.position,
          'shrink',
          24
        );
      } else if (currentHyperspaceState === 'expanding') {
        this.hyperspaceParticles = new HyperspaceParticles(
          this.ship.transform.position,
          'expand',
          24
        );
      }
      this.lastHyperspaceState = currentHyperspaceState;
    }

    // Update hyperspace particles
    if (this.hyperspaceParticles) {
      const progress = this.ship.getHyperspaceProgress();
      this.hyperspaceParticles.update(progress);
      if (!this.hyperspaceParticles.isActive) {
        this.hyperspaceParticles = null;
      }
    }

    for (const asteroid of this.asteroids) {
      asteroid.update(dt);
      wrapEntity(asteroid, this.renderer.width, this.renderer.height);
    }

    for (const bullet of this.bullets) {
      bullet.update(dt);
      wrapEntity(bullet, this.renderer.width, this.renderer.height);
    }

    for (const bullet of this.ufoBullets) {
      bullet.update(dt);
      wrapEntity(bullet, this.renderer.width, this.renderer.height);
    }

    // Update UFO spawn timer and UFO
    this.updateUFO(dt);

    // Update gravity well
    this.updateGravityWell(dt);

    // Update debris
    for (const d of this.debris) {
      d.update(dt);
    }
    this.debris = this.debris.filter((d) => d.isActive);

    // Remove inactive bullets
    this.bullets = this.bullets.filter((b) => b.isActive);
    this.ufoBullets = this.ufoBullets.filter((b) => b.isActive);

    // Check collisions
    this.checkBulletCollisions();
    this.checkUFOCollisions();
    this.checkUFOBulletCollisions();
    this.checkShipCollision();

    // Check if level is complete
    if (this.asteroids.length === 0) {
      this.nextLevel();
    }
  }

  private fire(): void {
    const pos = this.ship.getNosePosition();
    const dir = angleToVector(this.ship.transform.rotation);
    this.bullets.push(new Bullet(pos.x, pos.y, dir));
    this.fireCooldown = CONFIG.bullet.fireCooldown;
    this.audio.playShoot();
  }

  private checkBulletCollisions(): void {
    const newAsteroids: Asteroid[] = [];

    for (const bullet of this.bullets) {
      for (const asteroid of this.asteroids) {
        if (checkCollision(bullet, asteroid)) {
          bullet.isActive = false;
          asteroid.isActive = false;
          this.data.score += asteroid.points;

          this.audio.playExplosion(asteroid.size);

          // Split the asteroid
          newAsteroids.push(...asteroid.split());
          break;
        }
      }
    }

    // Remove destroyed asteroids and add new ones
    this.asteroids = this.asteroids.filter((a) => a.isActive);
    this.asteroids.push(...newAsteroids);
  }

  private checkShipCollision(): void {
    if (CONFIG.debug.disablePlayerCollision) {
      return;
    }
    if (!this.ship.isActive || this.ship.isInvulnerable() || this.ship.isInHyperspace()) {
      return;
    }

    for (const asteroid of this.asteroids) {
      if (checkCollision(this.ship, asteroid)) {
        this.shipDestroyed();
        return;
      }
    }

    // Check collision with UFO
    if (this.ufo && checkCollision(this.ship, this.ufo)) {
      this.shipDestroyed();
    }
  }

  private checkUFOBulletCollisions(): void {
    if (!this.ship.isActive || this.ship.isInvulnerable() || this.ship.isInHyperspace()) {
      return;
    }

    for (const bullet of this.ufoBullets) {
      if (checkCollision(bullet, this.ship)) {
        bullet.isActive = false;
        this.shipDestroyed();
        return;
      }
    }
  }

  private updateUFO(dt: number): void {
    // Update spawn timer when no UFO is active
    if (!this.ufo) {
      this.ufoSpawnTimer -= dt;
      if (this.ufoSpawnTimer <= 0) {
        this.spawnUFO();
      }
      return;
    }

    // Update existing UFO
    this.ufo.update(dt);

    // Wrap vertically but not horizontally (UFO flies across screen)
    const { y } = this.ufo.transform.position;
    if (y < -this.ufo.radius) {
      this.ufo.transform.position.y = this.renderer.height + this.ufo.radius;
    } else if (y > this.renderer.height + this.ufo.radius) {
      this.ufo.transform.position.y = -this.ufo.radius;
    }

    // UFO shoots at player
    if (this.ship.isActive && !this.ship.isInHyperspace()) {
      const shotAngle = this.ufo.tryShoot(
        this.ship.transform.position.x,
        this.ship.transform.position.y
      );
      if (shotAngle !== null) {
        const direction = angleToVector(shotAngle);
        const bullet = new Bullet(
          this.ufo.transform.position.x,
          this.ufo.transform.position.y,
          direction
        );
        this.ufoBullets.push(bullet);
        this.audio.playShoot();
      }
    }

    // Remove UFO when it exits the screen horizontally
    if (this.ufo.isOffScreen(this.renderer.width)) {
      this.audio.stopUFOSound();
      this.ufo = null;
      this.ufoSpawnTimer = getNextUFOSpawnTime();
    }
  }

  private spawnUFO(): void {
    this.ufo = createUFO(this.renderer.width, this.renderer.height, this.data.level);
    this.audio.startUFOSound(this.ufo.size === 'small');
  }

  private checkUFOCollisions(): void {
    if (!this.ufo) return;

    for (const bullet of this.bullets) {
      if (checkCollision(bullet, this.ufo)) {
        bullet.isActive = false;
        this.data.score += this.ufo.points;

        // Create debris from UFO (green to match UFO color)
        this.debris.push(
          createDebris(this.ufo.transform.position, this.ufo.transform.rotation, this.ufo.shape, '#0f0')
        );

        this.audio.playUFOExplosion();
        this.ufo = null;
        this.ufoSpawnTimer = getNextUFOSpawnTime();
        return;
      }
    }
  }

  private updateGravityWell(dt: number): void {
    // Spawn timer when no gravity well exists
    if (!this.gravityWell) {
      // Spawn immediately in debug mode, otherwise use timer
      if (CONFIG.debug.alwaysShowGravityWell) {
        this.spawnGravityWell();
      } else {
        this.gravityWellSpawnTimer -= dt;
        if (this.gravityWellSpawnTimer <= 0) {
          this.spawnGravityWell();
        }
      }

      // Handle despawn sound transition
      if (this.wasGravityWellActive) {
        this.audio.playGravityWellDespawn();
        this.wasGravityWellActive = false;
      }
      return;
    }

    // Update existing gravity well
    this.gravityWell.update(dt);

    // Track that we have an active gravity well (for despawn sound)
    this.wasGravityWellActive = true;

    // Apply gravitational pull to ship if active and not in hyperspace
    if (this.ship.isActive && !this.ship.isInHyperspace()) {
      const pullForce = this.gravityWell.getPullForce(this.ship.transform.position);

      // Apply the constant pull force to ship velocity
      // Player can fight against it with thrust, but will be slowly pulled in
      this.ship.velocity.x += pullForce.x * dt;
      this.ship.velocity.y += pullForce.y * dt;

      // Update audio intensity based on distance
      const distance = this.gravityWell.getDistance(this.ship.transform.position);
      const intensity = Math.max(0, 1 - distance / this.gravityWell.pullRadius);
      this.audio.updateGravityWellIntensity(intensity);
    }

    // Remove gravity well when it expires
    if (!this.gravityWell.isActive) {
      this.audio.stopGravityWellSound();
      this.gravityWell = null;
      // Immediately spawn another if debug mode is enabled
      if (CONFIG.debug.alwaysShowGravityWell) {
        this.spawnGravityWell();
      } else {
        this.gravityWellSpawnTimer = getNextGravityWellSpawnTime();
      }
    }
  }

  private spawnGravityWell(): void {
    this.gravityWell = createGravityWell(
      this.renderer.width,
      this.renderer.height,
      this.ship.transform.position,
      this.data.level
    );
    this.audio.playGravityWellSpawn();
    this.audio.startGravityWellSound();
  }

  private shipDestroyed(): void {
    // Create debris from the ship breaking apart
    this.debris.push(
      createDebris(this.ship.transform.position, this.ship.transform.rotation, this.ship.shape)
    );

    this.ship.isActive = false;
    this.data.lives--;

    // Clear any buffered inputs so they don't trigger on respawn
    this.input.clearAll();

    this.audio.playDeath();

    if (this.data.lives <= 0) {
      this.data.state = 'gameOver';
      this.gameOverTimer = CONFIG.timing.gameOverReturnDelay;
      // Stop UFO sound on game over
      if (this.ufo) {
        this.audio.stopUFOSound();
        this.ufo = null;
      }
      // Stop gravity well sound on game over
      if (this.gravityWell) {
        this.audio.stopGravityWellSound();
        this.gravityWell = null;
      }
    } else {
      this.respawnTimer = CONFIG.timing.respawnDelay;
    }
  }

  private nextLevel(): void {
    this.data.level++;

    this.audio.playLevelUp();

    // Spawn more asteroids each level
    const numAsteroids = CONFIG.asteroid.startingCount + this.data.level - 1;
    this.spawnAsteroids(numAsteroids);
  }

  private spawnAsteroids(count: number): void {
    const newAsteroids = createAsteroids(
      count,
      this.renderer.width,
      this.renderer.height,
      this.ship.transform.position
    );
    this.asteroids.push(...newAsteroids);
  }

  private startGame(): void {
    this.input.clearAll();
    this.data.state = 'playing';
    this.spawnAsteroids(CONFIG.asteroid.startingCount);
    this.ufoSpawnTimer = getNextUFOSpawnTime();
    this.gravityWellSpawnTimer = getNextGravityWellSpawnTime();
  }

  private resetGame(): void {
    this.input.clearAll();
    this.data = {
      score: CONFIG.initialState.score,
      lives: CONFIG.initialState.lives,
      level: CONFIG.initialState.level,
      state: 'start',
    };
    this.asteroids = [];
    this.bullets = [];
    this.ufoBullets = [];
    this.debris = [];
    this.ship.reset(this.renderer.width / 2, this.renderer.height / 2);
    this.respawnTimer = 0;
    // Clear UFO state
    if (this.ufo) {
      this.audio.stopUFOSound();
      this.ufo = null;
    }
    this.ufoSpawnTimer = 0;
    // Clear gravity well state
    if (this.gravityWell) {
      this.audio.stopGravityWellSound();
      this.gravityWell = null;
    }
    this.gravityWellSpawnTimer = 0;
    this.wasGravityWellActive = false;
  }

  private render(): void {
    this.renderer.clear();

    if (this.data.state === 'start') {
      drawMainMenu(this.renderer, this.renderer.width, this.renderer.height);
      this.renderer.flush();
      return;
    }

    // Draw asteroids in magenta/pink
    for (const asteroid of this.asteroids) {
      this.renderer.drawShape(asteroid.shape, asteroid.transform, '#f0f');
    }

    // Draw bullets in yellow
    for (const bullet of this.bullets) {
      this.renderer.drawPoint(bullet.transform.position, 3, '#ff0');
    }

    // Draw UFO bullets in green
    for (const bullet of this.ufoBullets) {
      this.renderer.drawPoint(bullet.transform.position, 3, '#0f0');
    }

    // Draw debris in the color of the destroyed entity
    for (const d of this.debris) {
      for (const line of d.lines) {
        if (line.lifetime > 0) {
          const alpha = d.getAlpha(line);
          this.renderer.drawLine(line.start, line.end, d.color, 2, alpha);
        }
      }
    }

    // Draw hyperspace particles in white
    if (this.hyperspaceParticles) {
      for (const particle of this.hyperspaceParticles.particles) {
        if (particle.alpha > 0) {
          // Draw particles with alpha
          this.renderer.drawPoint(particle.position, 2, '#fff', particle.alpha);
        }
      }
    }

    // Draw UFO in green
    if (this.ufo) {
      this.renderer.drawShape(this.ufo.shape, this.ufo.transform, '#0f0');
    }

    // Draw gravity well
    if (this.gravityWell) {
      const fade = this.gravityWell.getFade();
      const pos = this.gravityWell.position;

      // Draw spiral arms
      const arms = this.gravityWell.getSpiralPoints();
      for (const arm of arms) {
        this.renderer.drawPolyline(arm, CONFIG.colors.gravityWell.spiral, 2, fade);
      }

      // Draw concentric rings
      const rings = this.gravityWell.getRingRadii();
      for (const radius of rings) {
        this.renderer.drawCircle(pos, radius, CONFIG.colors.gravityWell.rings, 1, fade, 12);
      }

      // Draw center point
      this.renderer.drawPoint(pos, 4, CONFIG.colors.gravityWell.center, fade);
    }

    // Draw ship in cyan (with blinking when invulnerable)
    if (this.ship.isActive) {
      const shouldDraw = !this.ship.isInvulnerable() || Math.floor(Date.now() / 100) % 2 === 0;
      const hyperspaceScale = this.ship.getHyperspaceScale();

      // Don't draw during warp phase (scale = 0)
      if (shouldDraw && hyperspaceScale > 0) {
        // Apply hyperspace scale to the ship transform
        const scaledTransform = {
          ...this.ship.transform,
          scale: this.ship.transform.scale * hyperspaceScale,
        };
        this.renderer.drawShape(this.ship.shape, scaledTransform, '#0ff');

        // Draw thruster flame when thrusting (not during hyperspace)
        if (this.ship.isThrusting && !this.ship.isInHyperspace()) {
          const flameIndex = Math.floor(Math.random() * THRUSTER_SHAPES.length);
          this.renderer.drawShape(THRUSTER_SHAPES[flameIndex], this.ship.transform, '#f80');
        }
      }
    }

    // Draw game over text
    if (this.data.state === 'gameOver') {
      drawGameOver(
        this.renderer,
        this.data.score,
        this.gameOverTimer,
        this.renderer.width,
        this.renderer.height
      );
    }

    // Always draw HUD when playing or game over
    if (this.data.state === 'playing' || this.data.state === 'gameOver') {
      const hudState: HUDState = {
        score: this.data.score,
        lives: this.data.lives,
        level: this.data.level,
        glowEnabled: this.renderer.glowEnabled,
        hyperspaceReady: this.ship.canHyperspace(),
        hyperspaceActive: this.ship.isInHyperspace(),
        hyperspaceCooldown: this.ship.hyperspaceCooldown,
      };
      drawHUD(this.renderer, hudState, this.renderer.width, this.renderer.height);
    }

    // Flush all batched draw calls
    this.renderer.flush();
  }
}
