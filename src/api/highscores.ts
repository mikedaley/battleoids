// High Score API Client

export interface HighScore {
  id: string;
  playerName: string;
  score: number;
  level: number;
  timestamp: string;
  rank: number;
}

export interface SubmitScoreRequest {
  gameId: string;
  playerName: string;
  score: number;
  level: number;
}

export interface SubmitScoreResponse {
  success: boolean;
  id?: string;
  rank?: number;
  error?: string;
}

export interface GetScoresResponse {
  scores: HighScore[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_TIMEOUT = 5000; // 5 seconds

/**
 * Submit a new high score
 */
export async function submitHighScore(
  request: SubmitScoreRequest
): Promise<SubmitScoreResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/api/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to submit high score:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Fetch high scores for a game
 */
export async function fetchHighScores(
  gameId: string,
  limit: number = 10
): Promise<HighScore[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/api/scores/${gameId}?limit=${limit}`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: GetScoresResponse = await response.json();
    return data.scores;
  } catch (error) {
    console.error('Failed to fetch high scores:', error);
    return [];
  }
}

/**
 * Check if the backend API is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
}
