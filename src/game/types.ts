export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Platform extends Rect {
  type: 'ground' | 'floating' | 'spike';
}

export interface Collectible {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
  type: 'document';
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  alive: boolean;
  type: 'clerk' | 'robot';
  patrolLeft: number;
  patrolRight: number;
  animFrame: number;
}

export interface Boss {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  phase: number;
  attackTimer: number;
  invincibleTimer: number;
  vx: number;
  animFrame: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  type: 'folder' | 'laser';
  active: boolean;
  lifetime: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: 'left' | 'right';
  hp: number;
  maxHp: number;
  invincibleTimer: number;
  animFrame: number;
  animTimer: number;
}

export type GameState = 'menu' | 'playing' | 'victory' | 'gameover';
