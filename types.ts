
export enum ColorState {
  RED = 'RED',
  BLUE = 'BLUE'
}

export enum PowerUpType {
  GHOST = 'GHOST',
  BOMB = 'BOMB',
  MIRROR = 'MIRROR'
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  VICTORY = 'VICTORY'
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  rotation: number;
  angularVelocity: number;
  size: number;
  isShard?: boolean;
}

export interface Obstacle {
  id: string;
  type: 'GATE' | 'BLOCK' | 'ZIGZAG' | 'MOVING' | 'SWITCHER';
  y: number;
  color: ColorState;
  passed: boolean;
  width: number;
  height: number;
  rotation?: number;
  xOffset?: number;   // For MOVING barriers
  vx?: number;        // Horizontal speed for MOVING
  switchTimer?: number; // For SWITCHER barriers
}

export interface PowerUpItem {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  collected: boolean;
}

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  combo: number;
  multiplier: number;
  playerColor: ColorState;
  speed: number;
  powerUp: PowerUpType | null;
  powerUpTimer: number;
  isMirrored: boolean;
  isGhost: boolean;
  isAutoMatch: boolean;
}
