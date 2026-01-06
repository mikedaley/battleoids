// Centralized game configuration
// All magic numbers and constants are defined here for easy tuning

export const CONFIG = {
  // Screen dimensions
  screen: {
    width: 800,
    height: 600,
  },

  // Ship settings
  ship: {
    rotationSpeed: 5, // radians per second
    thrustPower: 200, // acceleration in pixels/s²
    maxSpeed: 400,
    radius: 12,
    invulnerabilityOnSpawn: 3, // seconds
  },

  // Hyperspace settings
  hyperspace: {
    shrinkTime: 0.3,
    warpTime: 0.2,
    expandTime: 0.3,
    cooldown: 5,
    invulnerability: 2, // seconds after reappearing
  },

  // Bullet settings
  bullet: {
    speed: 500,
    lifetime: 1.5,
    radius: 2,
    fireCooldown: 0.25,
  },

  // Asteroid settings
  asteroid: {
    large: { radius: 40, minVerts: 10, maxVerts: 14, speed: 50, points: 20 },
    medium: { radius: 20, minVerts: 8, maxVerts: 10, speed: 80, points: 50 },
    small: { radius: 10, minVerts: 6, maxVerts: 8, speed: 120, points: 100 },
    startingCount: 4,
    radiusVariation: { min: 0.7, max: 1.0 },
    spinRange: { min: -3, max: 3 },
  },

  // UFO settings
  ufo: {
    large: { radius: 20, speed: 100, points: 200, shootCooldown: 2.0 },
    small: { radius: 12, speed: 150, points: 1000, shootCooldown: 1.0 },
    spawnDelay: { min: 15, max: 30 },
    smallChanceBase: 0.3,
    smallChancePerLevel: 0.05,
    smallChanceMax: 0.7,
    verticalSpeedFactor: 0.3,
    directionChangeInterval: { min: 0.5, max: 1.5 },
  },

  // Gravity well settings
  gravityWell: {
    pullRadius: 300,
    visualRadius: 30,
    pullStrength: { min: 150, max: 500 },
    spawnDelay: { min: 20, max: 40 },
    duration: { min: 6, max: 10 },
    spawnMargin: 100,
    spawnMinDistanceFromShip: 150,
  },

  // Timing
  timing: {
    respawnDelay: 2,
    gameOverReturnDelay: 10,
    maxDeltaTime: 0.1, // cap for frame time
  },

  // Colors
  colors: {
    ship: '#0ff',
    shipThruster: '#f80',
    bullet: '#ff0',
    asteroid: '#f0f',
    ufo: '#0f0',
    gravityWell: {
      spiral: '#ff0',
      rings: '#fa0',
      center: '#fff',
      trapWarning: '#f00',
    },
    hud: '#0ff',
    menu: {
      title: '#0ff',
      controls: '#f0f',
      label: '#888',
      prompt: '#0ff',
    },
    debris: '#0ff',
    hyperspaceParticles: '#fff',
  },

  // Visual settings
  visual: {
    debrisLines: 3,
    debrisLifetime: 1.5,
    debrisSpeed: 100,
    hyperspaceParticleCount: 24,
    gravityWellSpiralArms: 4,
    gravityWellPointsPerArm: 10,
    circleSegments: 24,
  },

  // Initial game state
  initialState: {
    score: 0,
    lives: 3,
    level: 1,
  },

  // Debug settings
  debug: {
    disablePlayerCollision: true,
    alwaysShowGravityWell: false,
  },
};

// Type exports for config sections
export type ScreenConfig = typeof CONFIG.screen;
export type ShipConfig = typeof CONFIG.ship;
export type AsteroidConfig = typeof CONFIG.asteroid;
export type UFOConfig = typeof CONFIG.ufo;
export type GravityWellConfig = typeof CONFIG.gravityWell;
