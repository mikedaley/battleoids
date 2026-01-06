import type { GameData } from './types';
import { Renderer } from './renderer';
import { InputHandler } from './input';
import { AudioManager } from './audio';
import { Ship, Asteroid, Bullet, THRUSTER_SHAPES, Debris } from './entities';
import { checkCollision, wrapEntity } from './collision';
import { angleToVector, randomRange } from './math';

const FIRE_COOLDOWN = 0.25; // minimum seconds between shots
const STARTING_ASTEROIDS = 4;

export class Game {
  private renderer: Renderer;
  private input: InputHandler;
  private audio: AudioManager;

  private ship: Ship;
  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private debris: Debris[] = [];

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
    }

    // Update entities
    this.ship.update(dt);
    wrapEntity(this.ship, this.renderer.width, this.renderer.height);

    for (const asteroid of this.asteroids) {
      asteroid.update(dt);
      wrapEntity(asteroid, this.renderer.width, this.renderer.height);
    }

    for (const bullet of this.bullets) {
      bullet.update(dt);
      wrapEntity(bullet, this.renderer.width, this.renderer.height);
    }

    // Update debris
    for (const d of this.debris) {
      d.update(dt);
    }
    this.debris = this.debris.filter((d) => d.isActive);

    // Remove inactive bullets
    this.bullets = this.bullets.filter((b) => b.isActive);

    // Check collisions
    this.checkBulletCollisions();
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
    if (!this.ship.isActive || this.ship.isInvulnerable()) {
      return;
    }

    for (const asteroid of this.asteroids) {
      if (checkCollision(this.ship, asteroid)) {
        this.shipDestroyed();
        break;
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
  }

  private render(): void {
    this.renderer.clear();

    if (this.data.state === 'start') {
      // Draw start screen with vector text
      this.renderer.drawText(
        'BATTLEOIDS',
        this.renderer.width / 2,
        this.renderer.height / 2 - 80,
        6
      );
      this.renderer.drawText(
        'PRESS SPACE TO START',
        this.renderer.width / 2,
        this.renderer.height / 2,
        3,
        '#0ff'
      );
      this.renderer.drawText(
        'ARROWS OR WASD TO MOVE',
        this.renderer.width / 2,
        this.renderer.height / 2 + 60,
        2,
        '#f0f'
      );
      this.renderer.drawText(
        'SPACE TO SHOOT',
        this.renderer.width / 2,
        this.renderer.height / 2 + 90,
        2,
        '#f0f'
      );
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

    // Draw ship in cyan (with blinking when invulnerable)
    if (this.ship.isActive) {
      const shouldDraw = !this.ship.isInvulnerable() || Math.floor(Date.now() / 100) % 2 === 0;

      if (shouldDraw) {
        this.renderer.drawShape(this.ship.shape, this.ship.transform, '#0ff');

        // Draw thruster flame when thrusting - randomly pick a flame shape for flicker
        if (this.ship.isThrusting) {
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
