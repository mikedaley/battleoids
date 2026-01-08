# Remaining Game.ts Implementation

## Methods to Add to Game class:

### 1. High Score Loading
```typescript
private async loadHighScores(): Promise<void> {
  try {
    this.highScores = await fetchHighScores(
      CONFIG.highScores.gameId,
      CONFIG.highScores.displayCount
    );
    this.highScoresError = null;
    this.highScoresCacheTime = Date.now();
  } catch (error) {
    console.error('Failed to load high scores:', error);
    this.highScoresError = 'Unable to load high scores';
  }
}
```

### 2. Score Submission
```typescript
private async submitPlayerScore(name: string): Promise<void> {
  try {
    const response = await submitHighScore({
      gameId: CONFIG.highScores.gameId,
      playerName: name,
      score: this.data.finalScore!,
      level: this.data.finalLevel!,
    });

    if (response.success) {
      this.submittedScoreId = response.id!;
      console.log(`Score submitted! Rank: ${response.rank}`);
    }
  } catch (error) {
    console.error('Failed to submit score:', error);
  }
}
```

### 3. Check if High Score
```typescript
private checkIsHighScore(score: number): boolean {
  if (this.highScores.length < CONFIG.highScores.displayCount) {
    return true; // Leaderboard not full
  }
  const lowestScore = this.highScores[this.highScores.length - 1].score;
  return score > lowestScore;
}
```

### 4. Transition Methods
```typescript
private transitionToViewingScores(): void {
  this.data.state = 'viewingScores';
  this.menuTimer = 0;

  const now = Date.now();
  if (now - this.highScoresCacheTime > CONFIG.highScores.cacheTimeout) {
    this.loadHighScores();
  }
}
```

## Methods to Modify:

### 1. shipDestroyed()
After lives <= 0, instead of setting state to 'gameOver':
```typescript
if (this.data.lives <= 0) {
  this.data.finalScore = this.data.score;
  this.data.finalLevel = this.data.level;

  if (this.checkIsHighScore(this.data.score)) {
    this.data.state = 'submitScore';
    this.textInput.activate();
  } else {
    this.data.state = 'gameOver';
    this.gameOverTimer = CONFIG.timing.gameOverReturnDelay;
  }
  // ... rest of cleanup
}
```

### 2. update(dt) - Add new state handlers
```typescript
// In update method, after existing state handlers:

if (this.data.state === 'start') {
  this.menuTimer += dt;
  if (this.menuTimer >= this.menuDisplayDuration) {
    this.transitionToViewingScores();
  }
  if (this.input.consumeStartPress()) {
    this.startGame();
  }
  return;
}

if (this.data.state === 'viewingScores') {
  this.menuTimer += dt;
  if (this.menuTimer >= this.scoresDisplayDuration) {
    this.data.state = 'start';
    this.menuTimer = 0;
    this.menuDisplayDuration = CONFIG.timing.menuDisplayDuration();
  }
  if (this.input.consumeStartPress()) {
    this.startGame();
  }
  return;
}

if (this.data.state === 'submitScore') {
  this.textInput.update(dt);

  if (this.textInput.consumeSubmit() && this.textInput.isValid()) {
    this.submitPlayerScore(this.textInput.getText());
    this.textInput.deactivate();
    this.loadHighScores().then(() => {
      this.transitionToViewingScores();
    });
  }

  if (this.textInput.consumeCancel()) {
    this.textInput.deactivate();
    this.resetGame();
  }
  return;
}
```

### 3. render() - Add new state rendering
```typescript
// In render method, add these cases:

if (this.data.state === 'submitScore') {
  drawScoreSubmission(
    this.renderer,
    this.data.finalScore!,
    this.data.finalLevel!,
    this.textInput.getText(),
    this.textInput.getCursorVisible(),
    this.textInput.getError(),
    this.renderer.width,
    this.renderer.height
  );
  this.renderer.flush();
  return;
}

if (this.data.state === 'viewingScores') {
  drawHighScores(
    this.renderer,
    this.highScores,
    this.highScoresError,
    this.submittedScoreId,
    this.renderer.width,
    this.renderer.height
  );
  this.renderer.flush();
  return;
}
```

### 4. start() - Initialize high scores
Add at the end of start() method:
```typescript
// Load initial high scores
this.loadHighScores();

// Initialize menu timing
this.menuDisplayDuration = CONFIG.timing.menuDisplayDuration();
this.scoresDisplayDuration = CONFIG.timing.scoresDisplayDuration();
```

### 5. resetGame() - Reset high score state
Add these resets:
```typescript
this.menuTimer = 0;
this.submittedScoreId = null;
this.menuDisplayDuration = CONFIG.timing.menuDisplayDuration();
```

## Testing Steps:
1. Start game - should load high scores in background
2. Play game and die with lives remaining - normal behavior
3. Die with 0 lives and low score - go to game over screen
4. Die with 0 lives and high score - go to score submission
5. Submit score - should go to viewing scores
6. Wait on menu - should alternate between menu and scores every 15-20s
