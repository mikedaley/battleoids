# High Score System Implementation Plan

## Overview
Transform Battleoids from a client-side game to one with persistent high scores using:
- **Backend**: Node.js + Express API
- **Database**: PostgreSQL (shared across multiple games)
- **Frontend**: New UI states for score submission and display
- **Deployment**: Docker Compose on existing VPS

## Architecture Decisions

### 1. Monorepo Structure
Keep backend in same repository for simpler deployment and shared TypeScript types:
```
battleoids/
├── src/              # Existing frontend
├── backend/          # New backend directory
│   ├── src/
│   │   ├── index.ts           # Express server
│   │   ├── routes/scores.ts   # API endpoints
│   │   ├── db/
│   │   │   ├── client.ts      # PostgreSQL connection
│   │   │   └── schema.sql     # Database schema
│   │   └── middleware/        # Validation, CORS, rate limiting
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── .env
```

### 2. API Endpoints

**POST /api/scores**
- Submit new high score
- Body: `{ playerName, score, level, gameId }`
- Validation: name 3-20 chars alphanumeric+spaces, score/level positive integers
- Rate limit: 5 submissions/minute per IP

**GET /api/scores/:gameId?limit=10**
- Retrieve top high scores
- Returns array with rank, name, score, level, timestamp

**GET /api/health**
- Health check for monitoring

### 3. Database Schema

```sql
CREATE TABLE high_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(50) NOT NULL,           -- 'battleoids', etc.
  player_name VARCHAR(20) NOT NULL,
  score INTEGER NOT NULL CHECK (score > 0),
  level INTEGER NOT NULL CHECK (level > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,

  CONSTRAINT valid_player_name CHECK (
    LENGTH(TRIM(player_name)) >= 3 AND
    player_name ~ '^[A-Za-z0-9 ]+$'
  )
);

CREATE INDEX idx_high_scores_game_score ON high_scores(game_id, score DESC);
```

**Multi-game support**: Single DB serves multiple games via `game_id` field

## Frontend Changes

### 1. New Game States

**Current**: `'start' → 'playing' → 'gameOver'`

**Enhanced**:
```
'start' ⇄ 'viewingScores'  (alternates every 15-20s)
   ↓
'playing'
   ↓
'gameOver'
   ↓
'submitScore'  (if high score)
   ↓
'start'
```

**Update `/src/core/types.ts`:**
```typescript
export type GameState =
  | 'start'
  | 'playing'
  | 'gameOver'
  | 'submitScore'
  | 'viewingScores';

export interface GameData {
  score: number;
  lives: number;
  level: number;
  state: GameState;
  finalScore?: number;    // Store for submission
  finalLevel?: number;
}
```

### 2. New UI Components

**In `/src/rendering/ui.ts`, add:**

1. **drawScoreSubmission()** - Score entry screen
   - Show final score and level
   - Text input field with cursor animation
   - Validation feedback
   - "PRESS ENTER TO SUBMIT / ESC TO SKIP"

2. **drawHighScores()** - Leaderboard display
   - Top 10 scores in formatted table
   - Columns: RANK, NAME, SCORE, LEVEL
   - Highlight recently submitted score
   - "Press SPACE to play"

### 3. Text Input System

**New file `/src/systems/textInput.ts`:**
```typescript
export class TextInputHandler {
  private text: string = '';
  private active: boolean = false;
  private cursorVisible: boolean = true;

  activate(): void
  deactivate(): void
  getText(): string
  isValid(): boolean  // 3-20 characters
  update(dt: number)  // Cursor blinking
  consumeSubmit(): boolean
  consumeCancel(): boolean
}
```

### 4. API Client

**New file `/src/api/highscores.ts`:**
```typescript
export interface HighScore {
  id: string;
  playerName: string;
  score: number;
  level: number;
  timestamp: string;
  rank: number;
}

export async function submitHighScore(request): Promise<response>
export async function fetchHighScores(gameId, limit?): Promise<HighScore[]>
export async function checkBackendHealth(): Promise<boolean>
```

**Error handling**: 5-second timeout, graceful degradation if backend unavailable

### 5. Configuration Updates

**In `/src/core/config.ts`, add:**
```typescript
api: {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 5000,
},
highScores: {
  gameId: 'battleoids',
  displayCount: 10,
  minNameLength: 3,
  maxNameLength: 20,
  cacheTimeout: 30000,
},
timing: {
  // ... existing ...
  menuDisplayDuration: 15 + Math.random() * 5,    // 15-20s
  scoresDisplayDuration: 15 + Math.random() * 5,  // 15-20s
}
```

### 6. Game State Logic

**In `/src/core/game.ts`, modify:**

**shipDestroyed():**
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
}
```

**Menu alternation in update():**
```typescript
if (this.data.state === 'start') {
  this.menuTimer += dt;
  if (this.menuTimer >= CONFIG.timing.menuDisplayDuration) {
    this.transitionToViewingScores();
  }
}

if (this.data.state === 'viewingScores') {
  this.menuTimer += dt;
  if (this.menuTimer >= CONFIG.timing.scoresDisplayDuration) {
    this.data.state = 'start';
    this.menuTimer = 0;
  }
}
```

**Score submission:**
```typescript
if (this.data.state === 'submitScore') {
  this.textInput.update(dt);

  if (this.textInput.consumeSubmit() && this.textInput.isValid()) {
    await this.submitPlayerScore(this.textInput.getText());
    await this.loadHighScores();
    this.transitionToViewingScores();
  }

  if (this.textInput.consumeCancel()) {
    this.resetGame();
  }
}
```

## Backend Implementation

### 1. Dependencies

**`backend/package.json`:**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "dotenv": "^16.0.0",
    "zod": "^3.22.0",
    "express-rate-limit": "^7.0.0",
    "cors": "^2.8.0"
  }
}
```

### 2. Express Server

**`backend/src/index.ts`:**
- Initialize Express app
- Add middleware: CORS, JSON parser, rate limiter
- Register routes from `/routes/scores.ts`
- Connect to PostgreSQL
- Start server on port 3000

### 3. Security Measures

- **Input validation**: Zod schemas for all requests
- **Rate limiting**: 5 submissions/min per IP, 60 GET/min per IP
- **CORS**: Allow only VPS domain (+ localhost for dev)
- **SQL injection prevention**: Parameterized queries only
- **Sanitization**: Strip HTML, limit character set

## Deployment

### 1. Docker Setup

**`docker-compose.yml`:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backend/src/db/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"

  api:
    build: ./backend
    environment:
      DB_HOST: postgres
      CORS_ORIGIN: ${CORS_ORIGIN}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
```

### 2. Environment Variables

**`.env` (not committed):**
```
DB_NAME=battleoids_scores
DB_USER=battleoids_api
DB_PASSWORD=<strong-password>
CORS_ORIGIN=https://yourdomain.com
VITE_API_URL=https://yourdomain.com/api
```

### 3. VPS Deployment

**Update `package.json` scripts:**
```json
{
  "deploy": "npm run deploy:frontend && npm run deploy:backend",
  "deploy:frontend": "npm run build && rsync -avz --delete dist/ vps-mike:~/battleoids/data/",
  "deploy:backend": "rsync -avz --delete backend/ vps-mike:~/battleoids/backend/ --exclude node_modules && ssh vps-mike 'cd ~/battleoids && docker-compose up -d'"
}
```

**Nginx configuration** (proxy /api/ to localhost:3000):
```nginx
location /api/ {
  proxy_pass http://localhost:3000/api/;
  proxy_set_header X-Real-IP $remote_addr;
}
```

### 4. Initialization Steps

On VPS:
1. Clone/pull repository
2. Create `.env` with credentials
3. `docker-compose up -d` (starts PostgreSQL + API)
4. Schema auto-applies via init script
5. Configure Nginx to proxy /api/

## Critical Files

### Files to Create
1. `/backend/src/index.ts` - Express server
2. `/backend/src/routes/scores.ts` - API routes
3. `/backend/src/db/client.ts` - PostgreSQL client
4. `/backend/src/db/schema.sql` - Database schema
5. `/backend/src/middleware/validation.ts` - Request validation
6. `/src/api/highscores.ts` - Frontend API client
7. `/src/systems/textInput.ts` - Text input handler
8. `/docker-compose.yml` - Service orchestration

### Files to Modify
1. `/src/core/types.ts` - Add new GameState values
2. `/src/core/game.ts` - State machine logic
3. `/src/core/config.ts` - Add API and timing config
4. `/src/rendering/ui.ts` - Add UI rendering functions
5. `/package.json` - Update deploy scripts

## Implementation Sequence

1. **Backend Foundation**
   - Create backend directory structure
   - Implement database schema
   - Build Express server with endpoints
   - Add validation and security middleware

2. **Docker & Local Dev**
   - Create docker-compose.yml
   - Test database initialization
   - Verify API endpoints locally

3. **Frontend API Integration**
   - Create API client module
   - Add configuration
   - Test API calls with error handling

4. **UI Components**
   - Implement TextInputHandler
   - Add drawScoreSubmission()
   - Add drawHighScores()

5. **State Machine Integration**
   - Update types
   - Modify Game class
   - Implement state transitions
   - Test all flows

6. **VPS Deployment**
   - Deploy database container
   - Deploy backend API
   - Configure Nginx
   - Build and deploy frontend

7. **Testing & Refinement**
   - End-to-end testing
   - Security audit
   - Performance testing
   - UI polish

## Error Handling & Graceful Degradation

**Backend Unavailable:**
- Game remains fully playable
- Skip score submission screen
- Show cached scores or empty state
- No blocking error dialogs

**Network Failures:**
- 5-second timeouts on all API calls
- Show loading indicators
- Allow player to cancel/skip
- Cache successful high score fetches

**Validation Errors:**
- Real-time feedback in UI
- Clear error messages
- Allow retry without restarting game

## Multi-Game Database Sharing

The PostgreSQL database can serve multiple games:
- Each game has unique `game_id` (e.g., 'battleoids', 'space-invaders')
- Single API instance serves all games
- No schema changes needed to add new games
- Isolated leaderboards per game

To add a new game:
1. Deploy game's static files
2. Configure `VITE_API_URL` to shared API
3. Set unique `gameId` in game config
4. Done!

## Success Criteria

- [ ] Players can submit scores with 3-20 character names
- [ ] Top 10 scores displayed on menu
- [ ] Menu/scores alternate every 15-20 seconds
- [ ] Scores persist in PostgreSQL
- [ ] API responds in < 500ms
- [ ] Game playable if backend offline
- [ ] No security vulnerabilities
- [ ] Deployment takes < 5 minutes
- [ ] Multiple games can share database

## Rollback Plan

If issues occur:
1. Stop backend: `ssh vps-mike 'docker-compose down'`
2. Revert frontend: Restore previous dist/ backup
3. Game continues working without high scores (graceful degradation)

## Estimated Effort

- **Backend development**: 20 hours
- **Frontend integration**: 35 hours
- **Deployment & testing**: 15 hours
- **Documentation**: 7 hours
- **Total**: ~80-100 hours

Timeline: 2-3 weeks full-time, 8-10 weeks part-time
