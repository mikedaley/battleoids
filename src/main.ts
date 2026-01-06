import { Game } from './core/game';

// Entry point - just grab the canvas and start the game

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Could not find game canvas element');
}

const game = new Game(canvas);
game.start();
