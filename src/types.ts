// Core geometry types for vector graphics

export interface Vector2 {
  x: number;
  y: number;
}

export interface Transform {
  position: Vector2;
  rotation: number; // radians
  scale: number;
}

// A shape is just an array of points that form a closed polygon
export type Shape = Vector2[];

export interface Entity {
  transform: Transform;
  velocity: Vector2;
  angularVelocity: number;
  shape: Shape;
  radius: number; // bounding circle for collision
  isActive: boolean;
}

export type GameState = 'start' | 'playing' | 'gameOver';

export interface GameData {
  score: number;
  lives: number;
  level: number;
  state: GameState;
}

export type AsteroidSize = 'large' | 'medium' | 'small';

export interface KeyState {
  left: boolean;
  right: boolean;
  thrust: boolean;
  fire: boolean;
  hyperspace: boolean;
}
