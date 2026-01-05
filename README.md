# Battleoids

A clone of the classic 1979 Atari vector arcade game, built with TypeScript and HTML5 Canvas.

## About

This is a faithful recreation of the original vector-graphics arcade game. You pilot a triangular ship through a field of space rocks, blasting them into smaller pieces while trying not to get hit.

The game uses pure canvas drawing to recreate that distinctive vector graphics look with a neon glow effect - no sprites or images, just lines.

## How to Play

- **Arrow Keys** or **WASD** - Rotate and thrust
- **Space** - Fire
- **Space** - Start game / Restart after game over

Destroy the rocks to score points. Large ones split into medium ones, which split into small ones. Clear them all to advance to the next level.

### Scoring

- Large: 20 points
- Medium: 50 points
- Small: 100 points

## Running the Game

Make sure you have Node.js 18+ installed.

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The game will open in your browser at http://localhost:3000.

## Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder that you can deploy to any static hosting.

## Project Structure

```
src/
├── main.ts           # Entry point
├── game.ts           # Main game loop and state
├── renderer.ts       # Canvas drawing utilities
├── input.ts          # Keyboard handling
├── audio.ts          # Sound effects (Web Audio API)
├── collision.ts      # Collision detection
├── math.ts           # Vector math helpers
├── font.ts           # Vector font for text rendering
├── types.ts          # TypeScript type definitions
└── entities/
    ├── ship.ts       # Player ship
    ├── asteroid.ts   # Space rocks
    ├── bullet.ts     # Projectiles
    └── debris.ts     # Ship explosion fragments
```

## Technical Notes

The game runs at 60fps using `requestAnimationFrame` with delta-time based updates, so it should run consistently across different hardware.

Collision detection uses simple circle-based checks, which works well enough for this style of game. The space rocks have procedurally generated shapes with randomized vertices for variety.

Sound effects are synthesized in real-time using the Web Audio API - no audio files needed. The sounds are designed to evoke that retro arcade feel.

The renderer batches draw calls by color and line width to minimize canvas state changes and improve performance.

## Development

```bash
# Run linter
npm run lint

# Fix lint issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run typecheck
```

## License

MIT
