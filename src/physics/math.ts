import type { Vector2 } from '../core/types';

// Basic vector operations

export function add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vector2, scalar: number): Vector2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function magnitude(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalize(v: Vector2): Vector2 {
  const mag = magnitude(v);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

export function rotate(point: Vector2, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

export function distance(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Returns a random float between min and max
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Returns a random integer between min and max (inclusive)
export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

// Wraps a position around screen boundaries
export function wrapPosition(position: Vector2, width: number, height: number): Vector2 {
  let { x, y } = position;

  if (x < 0) x += width;
  if (x > width) x -= width;
  if (y < 0) y += height;
  if (y > height) y -= height;

  return { x, y };
}

// Direction vector from an angle (0 = right, increases counterclockwise)
// For our game, 0 = up, so we offset by -90 degrees
export function angleToVector(angle: number): Vector2 {
  return {
    x: Math.sin(angle),
    y: -Math.cos(angle),
  };
}
