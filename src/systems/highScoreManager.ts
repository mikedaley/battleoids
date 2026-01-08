// High Score Manager - Handles all high score functionality

import { fetchHighScores, submitHighScore, type HighScore } from '../api/highscores';
import { CONFIG } from '../core/config';

export class HighScoreManager {
  private scores: HighScore[] = [];
  private error: string | null = null;
  private cacheTime: number = 0;
  private submittedScoreId: string | null = null;

  /**
   * Load high scores from the API
   */
  async loadScores(): Promise<void> {
    try {
      this.scores = await fetchHighScores(
        CONFIG.highScores.gameId,
        CONFIG.highScores.displayCount
      );
      this.error = null;
      this.cacheTime = Date.now();
    } catch (error) {
      console.error('Failed to load high scores:', error);
      this.error = 'Unable to load high scores';
    }
  }

  /**
   * Submit a new high score
   */
  async submitScore(playerName: string, score: number, level: number): Promise<boolean> {
    try {
      const response = await submitHighScore({
        gameId: CONFIG.highScores.gameId,
        playerName,
        score,
        level,
      });

      if (response.success) {
        this.submittedScoreId = response.id!;
        console.log(`Score submitted! Rank: ${response.rank}`);
        return true;
      } else {
        console.error('Score submission failed:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
      return false;
    }
  }

  /**
   * Check if a score qualifies for the high score list
   */
  isHighScore(score: number): boolean {
    // If leaderboard not full, any score qualifies
    if (this.scores.length < CONFIG.highScores.displayCount) {
      return true;
    }

    // Check if score beats the lowest score
    const lowestScore = this.scores[this.scores.length - 1].score;
    return score > lowestScore;
  }

  /**
   * Check if cache is expired
   */
  isCacheExpired(): boolean {
    const now = Date.now();
    return now - this.cacheTime > CONFIG.highScores.cacheTimeout;
  }

  /**
   * Refresh scores if cache expired
   */
  async refreshIfNeeded(): Promise<void> {
    if (this.isCacheExpired()) {
      await this.loadScores();
    }
  }

  /**
   * Get current scores
   */
  getScores(): HighScore[] {
    return this.scores;
  }

  /**
   * Get error message if any
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Get ID of recently submitted score
   */
  getSubmittedScoreId(): string | null {
    return this.submittedScoreId;
  }

  /**
   * Clear submitted score ID (e.g., when returning to menu)
   */
  clearSubmittedScoreId(): void {
    this.submittedScoreId = null;
  }
}
