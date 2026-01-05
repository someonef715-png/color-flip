
import { ColorState } from './types';

export const COLORS = {
  [ColorState.RED]: '#FF4D6D', // Vibrant Watermelon
  [ColorState.BLUE]: '#2EC4B6', // Bright Turquoise
  BG: '#FFF9F0', // Creamy White
  WHITE: '#FFFFFF',
  GHOST: 'rgba(255, 255, 255, 0.7)',
  GRID: '#E9E3D8',
  ACCENT_PURPLE: '#7209B7',
  ACCENT_YELLOW: '#FFB703'
};

export const PHYSICS = {
  INITIAL_SPEED: 4,
  MAX_SPEED: 14, // Slightly faster for "Rush" feel
  SPEED_ACCEL: 0.0006,
  PLAYER_Y: 0.75,
  BALL_RADIUS: 22,
  OBSTACLE_HEIGHT: 45,
  SPAWN_INTERVAL: 1600,
  MIN_SPAWN_INTERVAL: 700,
};

export const POWER_UP_DURATION = 5000;
