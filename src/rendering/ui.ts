import type { Renderer } from './renderer';

// Display shapes for the score guide
const ASTEROID_DISPLAY_SHAPE = [
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

const UFO_DISPLAY_SHAPE = [
  { x: -0.3, y: -0.8 },
  { x: 0.3, y: -0.8 },
  { x: 0.5, y: -0.3 },
  { x: 1, y: 0 },
  { x: 0.6, y: 0.4 },
  { x: -0.6, y: 0.4 },
  { x: -1, y: 0 },
  { x: -0.5, y: -0.3 },
];

function drawScoreGuide(renderer: Renderer, width: number): void {
  const cx = width / 2;
  const startY = 300;
  const rowHeight = 50;

  // Section header
  renderer.drawText('SCORE', cx, startY - 20, 2, '#888');

  // Two-column layout
  const colSpacing = 180;
  const leftShapeX = cx - colSpacing - 30;
  const leftScoreX = cx - colSpacing + 40;
  const rightShapeX = cx + colSpacing - 70;
  const rightScoreX = cx + colSpacing + 10;

  const textOffsetY = -8;
  let y = startY + 25;

  // Row 1: Large asteroid (left) | Large UFO (right)
  renderer.drawShape(
    ASTEROID_DISPLAY_SHAPE,
    { position: { x: leftShapeX, y }, rotation: 0, scale: 18 },
    '#f0f'
  );
  renderer.drawText('20', leftScoreX, y + textOffsetY, 1.8, '#fff');

  renderer.drawShape(
    UFO_DISPLAY_SHAPE,
    { position: { x: rightShapeX, y }, rotation: 0, scale: 14 },
    '#0f0'
  );
  renderer.drawText('200', rightScoreX, y + textOffsetY, 1.8, '#fff');

  y += rowHeight;

  // Row 2: Medium asteroid (left) | Small UFO (right)
  renderer.drawShape(
    ASTEROID_DISPLAY_SHAPE,
    { position: { x: leftShapeX, y }, rotation: 0.5, scale: 12 },
    '#f0f'
  );
  renderer.drawText('50', leftScoreX, y + textOffsetY, 1.8, '#fff');

  renderer.drawShape(
    UFO_DISPLAY_SHAPE,
    { position: { x: rightShapeX, y }, rotation: 0, scale: 9 },
    '#0f0'
  );
  renderer.drawText('1000', rightScoreX, y + textOffsetY, 1.8, '#fff');

  y += rowHeight;

  // Row 3: Small asteroid (left) | Gravity well (right)
  renderer.drawShape(
    ASTEROID_DISPLAY_SHAPE,
    { position: { x: leftShapeX, y }, rotation: 1, scale: 7 },
    '#f0f'
  );
  renderer.drawText('100', leftScoreX, y + textOffsetY, 1.8, '#fff');

  renderer.drawCircle({ x: rightShapeX, y }, 8, '#fa0', 2, 1, 12);
  renderer.drawCircle({ x: rightShapeX, y }, 14, '#ff0', 1, 0.6, 12);
  renderer.drawPoint({ x: rightShapeX, y }, 3, '#fff');
  renderer.drawText('DANGER', rightScoreX, y + textOffsetY, 1.8, '#f00');
}

export function drawMainMenu(renderer: Renderer, width: number, height: number): void {
  const cx = width / 2;

  // Title
  renderer.drawText('BATTLEOIDS', cx, 80, 6);

  // Controls section - spread across the width
  renderer.drawText('CONTROLS', cx, 170, 2, '#888');

  const colLeft = 140;
  const colCenter = cx;
  const colRight = width - 140;
  const keyY = 210;
  const labelY = 235;

  renderer.drawText('ARROWS / WASD', colLeft, keyY, 1.8, '#f0f');
  renderer.drawText('MOVE', colLeft, labelY, 1.5, '#888');

  renderer.drawText('H', colCenter - 60, keyY, 1.8, '#f0f');
  renderer.drawText('HYPERSPACE', colCenter - 60, labelY, 1.5, '#888');

  renderer.drawText('SPACE', colCenter + 60, keyY, 1.8, '#f0f');
  renderer.drawText('FIRE', colCenter + 60, labelY, 1.5, '#888');

  renderer.drawText('ESC', colRight, keyY, 1.8, '#f0f');
  renderer.drawText('MENU', colRight, labelY, 1.5, '#888');

  // Score guide
  drawScoreGuide(renderer, width);

  // Start prompt
  renderer.drawText('PRESS SPACE TO START', cx, height - 60, 3, '#0ff');
}

export interface HUDState {
  score: number;
  lives: number;
  level: number;
  glowEnabled: boolean;
  hyperspaceReady: boolean;
  hyperspaceActive: boolean;
  hyperspaceCooldown: number;
}

export function drawHUD(renderer: Renderer, state: HUDState, width: number, height: number): void {
  // Draw score on the left
  renderer.drawText(`SCORE: ${state.score}`, 100, 25, 2, '#fff');
  // Draw lives in the center
  renderer.drawText(`LIVES: ${state.lives}`, width / 2, 25, 2, '#fff');
  // Draw level on the right
  renderer.drawText(`LEVEL: ${state.level}`, width - 100, 25, 2, '#fff');

  // Draw glow status in bottom right
  const glowStatus = state.glowEnabled ? 'ON' : 'OFF';
  renderer.drawText(
    `G: GLOW ${glowStatus}`,
    width - 80,
    height - 20,
    1.5,
    state.glowEnabled ? '#0f0' : '#666'
  );

  // Draw hyperspace status
  if (state.hyperspaceReady) {
    renderer.drawText('H: HYPERSPACE READY', 80, height - 20, 1.5, '#0f0');
  } else if (state.hyperspaceActive) {
    renderer.drawText('H: WARPING', 80, height - 20, 1.5, '#ff0');
  } else {
    const cooldown = Math.ceil(state.hyperspaceCooldown);
    renderer.drawText(`H: COOLDOWN ${cooldown}`, 80, height - 20, 1.5, '#f00');
  }
}

export function drawGameOver(
  renderer: Renderer,
  score: number,
  countdown: number,
  width: number,
  height: number
): void {
  renderer.drawText('GAME OVER', width / 2, height / 2 - 40, 5);
  renderer.drawText(`FINAL SCORE: ${score}`, width / 2, height / 2 + 20, 3);
  renderer.drawText('PRESS SPACE TO PLAY AGAIN', width / 2, height / 2 + 70, 2, '#f0f');

  // Show countdown
  const countdownInt = Math.ceil(countdown);
  renderer.drawText(`RETURNING TO MENU IN ${countdownInt}`, width / 2, height / 2 + 110, 2, '#666');
}

export function drawScoreSubmission(
  renderer: Renderer,
  score: number,
  level: number,
  inputText: string,
  cursorVisible: boolean,
  error: string | null,
  width: number,
  height: number
): void {
  renderer.drawText('GAME OVER', width / 2, height / 2 - 120, 4);
  renderer.drawText(`FINAL SCORE: ${score.toLocaleString()}`, width / 2, height / 2 - 70, 3);
  renderer.drawText(`LEVEL: ${level}`, width / 2, height / 2 - 40, 2);

  renderer.drawText('NEW HIGH SCORE!', width / 2, height / 2 - 5, 3, '#ff0');

  renderer.drawText('ENTER YOUR NAME:', width / 2, height / 2 + 35, 2, '#0ff');

  // Input field with cursor
  const displayText = inputText + (cursorVisible ? '_' : ' ');
  renderer.drawText(displayText, width / 2, height / 2 + 65, 3, '#fff');

  // Character count
  renderer.drawText(`(${inputText.trim().length}/20)`, width / 2, height / 2 + 95, 1.5, '#888');

  // Error message
  if (error) {
    renderer.drawText(error, width / 2, height / 2 + 115, 1.5, '#f00');
  }

  // Instructions
  renderer.drawText('PRESS ENTER TO SUBMIT', width / 2, height / 2 + 145, 2, '#0ff');
  renderer.drawText('PRESS ESC TO SKIP', width / 2, height / 2 + 175, 1.5, '#888');
}

export function drawHighScores(
  renderer: Renderer,
  scores: Array<{ rank: number; playerName: string; score: number; level: number }>,
  error: string | null,
  _highlightId: string | null,
  width: number,
  height: number
): void {
  renderer.drawText('HIGH SCORES', width / 2, 60, 4);

  if (error) {
    renderer.drawText(error, width / 2, height / 2, 2, '#f00');
    renderer.drawText('PRESS SPACE TO PLAY', width / 2, height - 60, 2, '#0ff');
    return;
  }

  if (scores.length === 0) {
    renderer.drawText('NO SCORES YET', width / 2, height / 2, 2, '#888');
    renderer.drawText('BE THE FIRST!', width / 2, height / 2 + 30, 2, '#0ff');
    renderer.drawText('PRESS SPACE TO PLAY', width / 2, height - 60, 2, '#0ff');
    return;
  }

  // Header
  const startY = 120;
  const lineHeight = 30;

  renderer.drawText('RANK', 150, startY, 2, '#0ff');
  renderer.drawText('NAME', 280, startY, 2, '#0ff');
  renderer.drawText('SCORE', 480, startY, 2, '#0ff');
  renderer.drawText('LEVEL', 650, startY, 2, '#0ff');

  // Separator line
  renderer.drawLine({ x: 100, y: startY + 20 }, { x: width - 100, y: startY + 20 }, '#0ff');

  // Scores
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const s = scores[i];
    const y = startY + 30 + i * lineHeight;
    const color = '#fff';

    renderer.drawText(`${s.rank}`, 150, y, 2, color);
    renderer.drawText(s.playerName, 280, y, 2, color);
    renderer.drawText(s.score.toLocaleString(), 480, y, 2, color);
    renderer.drawText(`${s.level}`, 650, y, 2, color);
  }

  // Instructions
  renderer.drawText('PRESS SPACE TO PLAY', width / 2, height - 60, 2, '#0ff');
}
