import type { GameData } from './types';
import { Renderer } from './renderer';
import { InputHandler } from './input';
import { AudioManager } from './audio';
import {
  Ship,
  Asteroid,
  Bullet,
  THRUSTER_SHAPES,
  Debris,
  HyperspaceParticles,
  UFO,
} from './entities';
import { checkCollision, wrapEntity } from './collision';
import { angleToVector, randomRange } from './math';

const FIRE_COOLDOWN = 0.25; // minimum seconds between shots
const STARTING_ASTEROIDS = 4;
const UFO_SPAWN_MIN = 15; // minimum seconds between UFO spawns
const UFO_SPAWN_MAX = 30; // maximum seconds between UFO spawns
const SMALL_UFO_CHANCE = 0.3; // 30% chance for small UFO (increases with level)

export class Game {
  private renderer: Renderer;
  private input: InputHandler;
  private audio: AudioManager;

  private ship: Ship;
  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private debris: Debris[] = [];
  private hyperspaceParticles: HyperspaceParticles | null = null;
  private ufo: UFO | null = null;
  private ufoSpawnTimer = 0;

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

    // Handle input
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

    // Update UFO spawn timer and UFO
    this.updateUFO(dt);

    // Update debris
    for (const d of this.debris) {
      d.update(dt);
    }
    this.debris = this.debris.filter((d) => d.isActive);

    // Remove inactive bullets
    this.bullets = this.bullets.filter((b) => b.isActive);

    // Check collisions
    this.checkBulletCollisions();
    this.checkUFOCollisions();
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
    this.fireCooldown = FIRE_COOLDOWN;
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

    // Remove UFO when it exits the screen horizontally
    if (this.ufo.isOffScreen(this.renderer.width)) {
      this.audio.stopUFOSound();
      this.ufo = null;
      this.ufoSpawnTimer = randomRange(UFO_SPAWN_MIN, UFO_SPAWN_MAX);
    }
  }

  private spawnUFO(): void {
    // Higher levels have higher chance of small (harder) UFO
    const smallChance = Math.min(SMALL_UFO_CHANCE + this.data.level * 0.05, 0.7);
    const size = Math.random() < smallChance ? 'small' : 'large';

    this.ufo = new UFO(this.renderer.width, this.renderer.height, size);
    this.audio.startUFOSound(size === 'small');
  }

  private checkUFOCollisions(): void {
    if (!this.ufo) return;

    for (const bullet of this.bullets) {
      if (checkCollision(bullet, this.ufo)) {
        bullet.isActive = false;
        this.data.score += this.ufo.points;

        // Create debris from UFO
        this.debris.push(
          new Debris(this.ufo.transform.position, this.ufo.transform.rotation, this.ufo.shape)
        );

        this.audio.playUFOExplosion();
        this.ufo = null;
        this.ufoSpawnTimer = randomRange(UFO_SPAWN_MIN, UFO_SPAWN_MAX);
        return;
      }
    }
  }

  private shipDestroyed(): void {
    // Create debris from the ship breaking apart
    this.debris.push(
      new Debris(this.ship.transform.position, this.ship.transform.rotation, this.ship.shape)
    );

    this.ship.isActive = false;
    this.data.lives--;

    this.audio.playDeath();

    if (this.data.lives <= 0) {
      this.data.state = 'gameOver';
      this.gameOverTimer = 10; // 10 seconds before returning to menu
      // Stop UFO sound on game over
      if (this.ufo) {
        this.audio.stopUFOSound();
        this.ufo = null;
      }
    } else {
      this.respawnTimer = 2; // 2 seconds before respawn
    }
  }

  private nextLevel(): void {
    this.data.level++;

    this.audio.playLevelUp();

    // Spawn more asteroids each level
    const numAsteroids = STARTING_ASTEROIDS + this.data.level - 1;
    this.spawnAsteroids(numAsteroids);
  }

  private spawnAsteroids(count: number): void {
    for (let i = 0; i < count; i++) {
      // Spawn asteroids away from the ship
      let x: number, y: number;
      do {
        x = randomRange(0, this.renderer.width);
        y = randomRange(0, this.renderer.height);
      } while (
        Math.abs(x - this.ship.transform.position.x) < 100 &&
        Math.abs(y - this.ship.transform.position.y) < 100
      );

      this.asteroids.push(new Asteroid(x, y, 'large'));
    }
  }

  private startGame(): void {
    this.data.state = 'playing';
    this.spawnAsteroids(STARTING_ASTEROIDS);
    // Set initial UFO spawn timer
    this.ufoSpawnTimer = randomRange(UFO_SPAWN_MIN, UFO_SPAWN_MAX);
  }

  private resetGame(): void {
    this.data = {
      score: 0,
      lives: 3,
      level: 1,
      state: 'start',
    };
    this.asteroids = [];
    this.bullets = [];
    this.debris = [];
    this.ship.reset(this.renderer.width / 2, this.renderer.height / 2);
    this.respawnTimer = 0;
    // Clear UFO state
    if (this.ufo) {
      this.audio.stopUFOSound();
      this.ufo = null;
    }
    this.ufoSpawnTimer = 0;
  }

  private drawScoreGuide(): void {
    const cx = this.renderer.width / 2;
    const startY = 300;
    const rowHeight = 40;

    // Simple asteroid shape for display (rocky polygon)
    const asteroidShape = [
      { x: 0, y: -1 },
      { x: 0.7, y: -0.7 },
      { x: 1, y: 0 },
      { x: 0.8, y: 0.6 },
      { x: 0.3, y: 1 },
      { x: -0.4, y: 0.9 },
      { x: -1, y: 0.3 },
      { x: -0.9, y: -0.5 },
      { x: -0.5, y: -0.9 },
    ];

    // UFO shape for display (flying saucer)
    const ufoShape = [
      { x: -0.3, y: -0.8 },
      { x: 0.3, y: -0.8 },
      { x: 0.5, y: -0.3 },
      { x: 1, y: 0 },
      { x: 0.6, y: 0.4 },
      { x: -0.6, y: 0.4 },
      { x: -1, y: 0 },
      { x: -0.5, y: -0.3 },
    ];

    // Section header
    this.renderer.drawText('SCORE', cx, startY - 20, 2, '#888');

    // Layout: shape on left, score on right for each row
    const shapeX = cx - 50;
    const scoreX = cx + 50;
    let y = startY + 20;

    // Text y is the top of the text, so offset up by half text height to center vertically
    const textOffsetY = -8;

    // Large asteroid - 20 pts
    this.renderer.drawShape(
      asteroidShape,
      { position: { x: shapeX, y }, rotation: 0, scale: 18 },
      '#f0f'
    );
    this.renderer.drawText('20', scoreX, y + textOffsetY, 1.8, '#fff');

    y += rowHeight;

    // Medium asteroid - 50 pts
    this.renderer.drawShape(
      asteroidShape,
      { position: { x: shapeX, y }, rotation: 0.5, scale: 12 },
      '#f0f'
    );
    this.renderer.drawText('50', scoreX, y + textOffsetY, 1.8, '#fff');

    y += rowHeight;

    // Small asteroid - 100 pts
    this.renderer.drawShape(
      asteroidShape,
      { position: { x: shapeX, y }, rotation: 1, scale: 7 },
      '#f0f'
    );
    this.renderer.drawText('100', scoreX, y + textOffsetY, 1.8, '#fff');

    y += rowHeight;

    // Large UFO - 200 pts
    this.renderer.drawShape(
      ufoShape,
      { position: { x: shapeX, y }, rotation: 0, scale: 14 },
      '#0f0'
    );
    this.renderer.drawText('200', scoreX, y + textOffsetY, 1.8, '#fff');

    y += rowHeight;

    // Small UFO - 1000 pts
    this.renderer.drawShape(
      ufoShape,
      { position: { x: shapeX, y }, rotation: 0, scale: 9 },
      '#0f0'
    );
    this.renderer.drawText('1000', scoreX, y + textOffsetY, 1.8, '#fff');
  }

  private drawHUD(): void {
    // Draw score on the left
    this.renderer.drawText(`SCORE: ${this.data.score}`, 100, 25, 2, '#0ff');
    // Draw lives in the center
    this.renderer.drawText(`LIVES: ${this.data.lives}`, this.renderer.width / 2, 25, 2, '#0ff');
    // Draw level on the right
    this.renderer.drawText(`LEVEL: ${this.data.level}`, this.renderer.width - 100, 25, 2, '#0ff');
    // Draw glow status in bottom right
    const glowStatus = this.renderer.glowEnabled ? 'ON' : 'OFF';
    this.renderer.drawText(
      `G: GLOW ${glowStatus}`,
      this.renderer.width - 80,
      this.renderer.height - 20,
      1.5,
      this.renderer.glowEnabled ? '#0f0' : '#666'
    );
    // Draw hyperspace status
    if (this.ship.canHyperspace()) {
      this.renderer.drawText('H: HYPERSPACE READY', 80, this.renderer.height - 20, 1.5, '#0f0');
    } else if (this.ship.isInHyperspace()) {
      this.renderer.drawText('H: WARPING', 80, this.renderer.height - 20, 1.5, '#ff0');
    } else {
      const cooldown = Math.ceil(this.ship.hyperspaceCooldown);
      this.renderer.drawText(`H: COOLDOWN ${cooldown}`, 80, this.renderer.height - 20, 1.5, '#f00');
    }
  }

  private render(): void {
    this.renderer.clear();

    if (this.data.state === 'start') {
      const cx = this.renderer.width / 2;

      // Title
      this.renderer.drawText('BATTLEOIDS', cx, 80, 6);

      // Controls section - spread across the width
      this.renderer.drawText('CONTROLS', cx, 170, 2, '#888');

      const colLeft = 140;
      const colCenter = cx;
      const colRight = this.renderer.width - 140;
      const keyY = 210;
      const labelY = 235;

      this.renderer.drawText('ARROWS / WASD', colLeft, keyY, 1.8, '#f0f');
      this.renderer.drawText('MOVE', colLeft, labelY, 1.5, '#888');

      this.renderer.drawText('H', colCenter, keyY, 1.8, '#f0f');
      this.renderer.drawText('HYPERSPACE', colCenter, labelY, 1.5, '#888');

      this.renderer.drawText('SPACE', colRight, keyY, 1.8, '#f0f');
      this.renderer.drawText('FIRE', colRight, labelY, 1.5, '#888');

      // Score guide
      this.drawScoreGuide();

      // Start prompt
      this.renderer.drawText('PRESS SPACE TO START', cx, this.renderer.height - 60, 3, '#0ff');

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

    // Draw debris in cyan (same as ship)
    for (const d of this.debris) {
      for (const line of d.lines) {
        if (line.lifetime > 0) {
          const alpha = d.getAlpha(line);
          this.renderer.drawLine(line.start, line.end, '#0ff', 2, alpha);
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
      this.renderer.drawText(
        'GAME OVER',
        this.renderer.width / 2,
        this.renderer.height / 2 - 40,
        5
      );
      this.renderer.drawText(
        `FINAL SCORE: ${this.data.score}`,
        this.renderer.width / 2,
        this.renderer.height / 2 + 20,
        3
      );
      this.renderer.drawText(
        'PRESS SPACE TO PLAY AGAIN',
        this.renderer.width / 2,
        this.renderer.height / 2 + 70,
        2,
        '#f0f'
      );
      // Show countdown
      const countdown = Math.ceil(this.gameOverTimer);
      this.renderer.drawText(
        `RETURNING TO MENU IN ${countdown}`,
        this.renderer.width / 2,
        this.renderer.height / 2 + 110,
        2,
        '#666'
      );
    }

    // Always draw HUD when playing or game over
    if (this.data.state === 'playing' || this.data.state === 'gameOver') {
      this.drawHUD();
    }

    // Flush all batched draw calls
    this.renderer.flush();
  }
}
