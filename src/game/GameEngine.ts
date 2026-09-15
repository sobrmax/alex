import { Player, Enemy, Boss, Platform, Collectible, Projectile, GameState } from './types';

const GRAVITY = 0.5;
const JUMP_FORCE = -14;
const MOVE_SPEED = 4.5;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const TILE = 32;
const LEVEL_WIDTH = 4800;
const DOCS_TOTAL = 60;

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: GameState = 'menu';
  keys: Set<string> = new Set();
  camera: { x: number; y: number } = { x: 0, y: 0 };
  player: Player;
  enemies: Enemy[] = [];
  boss: Boss;
  platforms: Platform[] = [];
  collectibles: Collectible[] = [];
  projectiles: Projectile[] = [];
  docsCollected: number = 0;
  bossSpawned: boolean = false;
  bossDefeated: boolean = false;
  frameCount: number = 0;
  onStateChange: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement, onStateChange: (state: GameState) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.onStateChange = onStateChange;

    this.player = this.createPlayer();
    this.boss = this.createBoss();
    this.initLevel();
    this.setupInput();

    // Initial render so canvas isn't blank
    this.render();
  }

  createPlayer(): Player {
    return {
      x: 100, y: 300, width: 28, height: 44,
      vx: 0, vy: 0, onGround: false,
      facing: 'right', hp: 10, maxHp: 10,
      invincibleTimer: 0, animFrame: 0, animTimer: 0
    };
  }

  createBoss(): Boss {
    return {
      x: LEVEL_WIDTH - 200, y: 300, width: 48, height: 64,
      hp: 10, maxHp: 10, alive: false, phase: 0,
      attackTimer: 0, invincibleTimer: 0, vx: 0, animFrame: 0
    };
  }

  initLevel() {
    this.platforms = [];
    this.collectibles = [];
    this.enemies = [];
    this.docsCollected = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.boss = this.createBoss();
    this.projectiles = [];

    // Ground platforms - fewer gaps, easier to navigate
    const groundSegments = [
      { start: 0, end: 800 },
      { start: 880, end: 1600 },
      { start: 1680, end: 2400 },
      { start: 2480, end: 3200 },
      { start: 3280, end: LEVEL_WIDTH },
    ];

    groundSegments.forEach(seg => {
      this.platforms.push({
        x: seg.start, y: CANVAS_HEIGHT - TILE, width: seg.end - seg.start, height: TILE,
        type: 'ground'
      });
    });

    // Floating platforms - more variety, staircases, bridges
    const floatingPlatforms = [
      // Section 1: Tutorial area
      { x: 200, y: 360, w: 80 },
      { x: 350, y: 300, w: 80 },
      { x: 500, y: 240, w: 80 },
      { x: 650, y: 300, w: 80 },
      
      // Section 2: Bridge over gap
      { x: 820, y: 380, w: 60 },
      { x: 850, y: 320, w: 60 },
      { x: 880, y: 260, w: 60 },
      
      // Section 3: Staircase
      { x: 1000, y: 380, w: 70 },
      { x: 1100, y: 320, w: 70 },
      { x: 1200, y: 260, w: 70 },
      { x: 1300, y: 200, w: 70 },
      { x: 1400, y: 260, w: 70 },
      { x: 1500, y: 320, w: 70 },
      
      // Section 4: High platforms
      { x: 1700, y: 180, w: 90 },
      { x: 1850, y: 180, w: 90 },
      { x: 2000, y: 180, w: 90 },
      
      // Section 5: Zigzag
      { x: 2200, y: 350, w: 80 },
      { x: 2350, y: 280, w: 80 },
      { x: 2500, y: 210, w: 80 },
      { x: 2650, y: 280, w: 80 },
      { x: 2800, y: 350, w: 80 },
      
      // Section 6: Long bridge
      { x: 3000, y: 300, w: 120 },
      { x: 3150, y: 300, w: 120 },
      
      // Section 7: Final approach
      { x: 3400, y: 340, w: 80 },
      { x: 3550, y: 280, w: 80 },
      { x: 3700, y: 220, w: 80 },
      { x: 3850, y: 280, w: 80 },
      { x: 4000, y: 340, w: 80 },
    ];

    floatingPlatforms.forEach(p => {
      this.platforms.push({
        x: p.x, y: p.y, width: p.w, height: 16, type: 'floating'
      });
    });

    // Spikes - fewer and more visible
    const spikePositions = [600, 1400, 2100, 2900, 3600];
    spikePositions.forEach(sx => {
      this.platforms.push({
        x: sx, y: CANVAS_HEIGHT - TILE - 16, width: 48, height: 16, type: 'spike'
      });
    });

    // Documents - 60 total, spread across level with variety
    for (let i = 0; i < 60; i++) {
      const x = 150 + (i * (LEVEL_WIDTH - 400) / 60);
      // Vary heights more - some on ground, some on platforms
      let baseY: number;
      if (i % 5 === 0) {
        // On high platforms
        baseY = 150 + Math.sin(i * 0.8) * 50;
      } else if (i % 3 === 0) {
        // On medium platforms
        baseY = 250 + Math.sin(i * 0.6) * 40;
      } else {
        // Near ground level
        baseY = 380 + Math.sin(i * 0.4) * 30;
      }
      this.collectibles.push({
        x: x, y: Math.max(100, Math.min(420, baseY)), width: 20, height: 24,
        collected: false, type: 'document'
      });
    }

    // Enemies - more variety, slower movement, some on platforms
    const enemyPositions = [
      // Section 1 - ground level
      { x: 300, y: CANVAS_HEIGHT - TILE - 36, patrol: [200, 400], type: 'clerk' as const },
      { x: 550, y: CANVAS_HEIGHT - TILE - 36, patrol: [500, 700], type: 'robot' as const },
      
      // Section 2 - mixed
      { x: 900, y: CANVAS_HEIGHT - TILE - 36, patrol: [850, 1050], type: 'clerk' as const },
      { x: 1150, y: CANVAS_HEIGHT - TILE - 36, patrol: [1100, 1300], type: 'robot' as const },
      { x: 1350, y: CANVAS_HEIGHT - TILE - 36, patrol: [1300, 1500], type: 'clerk' as const },
      
      // Section 3 - some on platforms
      { x: 1750, y: CANVAS_HEIGHT - TILE - 36, patrol: [1700, 1900], type: 'robot' as const },
      { x: 1850, y: 180 - 36, patrol: [1700, 1940], type: 'clerk' as const }, // On high platform
      { x: 1950, y: CANVAS_HEIGHT - TILE - 36, patrol: [1900, 2100], type: 'clerk' as const },
      
      // Section 4 - platform enemies
      { x: 2250, y: CANVAS_HEIGHT - TILE - 36, patrol: [2200, 2400], type: 'robot' as const },
      { x: 2500, y: 210 - 36, patrol: [2500, 2580], type: 'clerk' as const }, // On high platform
      { x: 2550, y: CANVAS_HEIGHT - TILE - 36, patrol: [2500, 2700], type: 'clerk' as const },
      { x: 2750, y: CANVAS_HEIGHT - TILE - 36, patrol: [2700, 2900], type: 'robot' as const },
      
      // Section 5 - final area
      { x: 3050, y: 300 - 36, patrol: [3000, 3120], type: 'clerk' as const }, // On bridge
      { x: 3350, y: CANVAS_HEIGHT - TILE - 36, patrol: [3300, 3500], type: 'robot' as const },
      { x: 3650, y: CANVAS_HEIGHT - TILE - 36, patrol: [3600, 3800], type: 'clerk' as const },
      { x: 3900, y: CANVAS_HEIGHT - TILE - 36, patrol: [3850, 4050], type: 'robot' as const },
    ];

    enemyPositions.forEach(e => {
      this.enemies.push({
        x: e.x, y: e.y, width: 30, height: 36,
        vx: 0.8, // Slower movement
        alive: true, type: e.type,
        patrolLeft: e.patrol[0], patrolRight: e.patrol[1],
        animFrame: 0
      });
    });
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'ArrowUp') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  startGame() {
    this.state = 'playing';
    this.player = this.createPlayer();
    this.initLevel();
    this.onStateChange('playing');
  }

  update() {
    if (this.state !== 'playing') return;
    this.frameCount++;

    this.updatePlayer();
    this.updateEnemies();
    this.updateBoss();
    this.updateProjectiles();
    this.updateCamera();
    this.checkCollectibles();
    this.checkPitDeath();
  }

  updatePlayer() {
    const p = this.player;

    // Horizontal movement
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      p.vx = -MOVE_SPEED;
      p.facing = 'left';
    } else if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      p.vx = MOVE_SPEED;
      p.facing = 'right';
    } else {
      p.vx *= 0.8;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    // Jump
    if ((this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW')) && p.onGround) {
      p.vy = JUMP_FORCE;
      p.onGround = false;
    }

    // Gravity
    p.vy += GRAVITY;
    if (p.vy > 15) p.vy = 15;

    // Move X
    p.x += p.vx;
    if (p.x < 0) p.x = 0;
    if (p.x > LEVEL_WIDTH - p.width) p.x = LEVEL_WIDTH - p.width;

    // Collision X
    for (const plat of this.platforms) {
      if (plat.type === 'spike') continue;
      if (this.rectCollide(p, plat)) {
        if (p.vx > 0) p.x = plat.x - p.width;
        else if (p.vx < 0) p.x = plat.x + plat.width;
      }
    }

    // Move Y
    p.y += p.vy;
    p.onGround = false;

    // Collision Y
    for (const plat of this.platforms) {
      if (plat.type === 'spike') {
        if (this.rectCollide(p, plat)) {
          this.damagePlayer(1);
        }
        continue;
      }
      if (this.rectCollide(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.onGround = true;
        } else if (p.vy < 0) {
          p.y = plat.y + plat.height;
          p.vy = 0;
        }
      }
    }

    // Invincibility timer
    if (p.invincibleTimer > 0) p.invincibleTimer--;

    // Animation
    p.animTimer++;
    if (p.animTimer > 8) {
      p.animTimer = 0;
      p.animFrame = (p.animFrame + 1) % 4;
    }

    // Enemy collision
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (this.rectCollide(p, enemy)) {
        if (p.vy > 0 && p.y + p.height - 10 < enemy.y + enemy.height / 2) {
          // Stomp enemy
          enemy.alive = false;
          p.vy = JUMP_FORCE * 0.6;
        } else {
          this.damagePlayer(1);
        }
      }
    }

    // Boss collision
    if (this.boss.alive) {
      if (this.rectCollide(p, this.boss)) {
        if (p.vy > 0 && p.y + p.height - 10 < this.boss.y + this.boss.height / 2 && this.boss.invincibleTimer <= 0) {
          this.boss.hp--;
          this.boss.invincibleTimer = 60;
          p.vy = JUMP_FORCE * 0.7;
          if (this.boss.hp <= 0) {
            this.boss.alive = false;
            this.bossDefeated = true;
            this.state = 'victory';
            this.onStateChange('victory');
          }
        } else {
          this.damagePlayer(1);
        }
      }
    }

    // Projectile collision
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      if (this.rectCollide(p, proj)) {
        this.damagePlayer(1);
        proj.active = false;
      }
    }
  }

  damagePlayer(amount: number) {
    if (this.player.invincibleTimer > 0) return;
    this.player.hp -= amount;
    this.player.invincibleTimer = 120; // Longer invincibility
    if (this.player.hp <= 0) {
      this.state = 'gameover';
      this.onStateChange('gameover');
    }
  }

  updateEnemies() {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.x += e.vx;
      if (e.x <= e.patrolLeft || e.x >= e.patrolRight) {
        e.vx *= -1;
      }
      e.animFrame = (this.frameCount % 30 < 15) ? 0 : 1;
    }
  }

  updateBoss() {
    if (!this.boss.alive) {
      // Spawn boss when player reaches end
      if (!this.bossSpawned && this.player.x > LEVEL_WIDTH - 500) {
        this.boss.alive = true;
        this.bossSpawned = true;
        this.boss.y = CANVAS_HEIGHT - TILE - this.boss.height; // Ground level
      }
      return;
    }

    const b = this.boss;
    const p = this.player;

    // Boss AI - ground-based movement
    b.attackTimer++;

    // Simple ground movement - walk towards player slowly
    const distToPlayer = p.x - b.x;
    if (Math.abs(distToPlayer) > 100) {
      b.vx = distToPlayer > 0 ? 1 : -1;
    } else {
      b.vx = 0;
    }
    
    b.x += b.vx;
    // Keep boss on ground and within arena
    b.x = Math.max(LEVEL_WIDTH - 600, Math.min(LEVEL_WIDTH - 100, b.x));
    b.y = CANVAS_HEIGHT - TILE - b.height; // Always on ground

    // Attacks - slower and simpler
    if (b.attackTimer % 120 === 0) {
      // Throw folder projectile (slower)
      this.projectiles.push({
        x: b.x + b.width / 2, y: b.y + 20,
        vx: p.x > b.x ? 3 : -3,
        vy: -2,
        width: 20, height: 16,
        type: 'folder', active: true, lifetime: 240
      });
    }

    if (b.attackTimer % 200 === 0 && b.hp < b.maxHp * 0.5) {
      // Laser from eyes (phase 2, slower)
      this.projectiles.push({
        x: b.x + (p.x > b.x ? b.width : -24), y: b.y + 15,
        vx: p.x > b.x ? 5 : -5,
        vy: 0,
        width: 24, height: 6,
        type: 'laser', active: true, lifetime: 90
      });
    }

    if (b.invincibleTimer > 0) b.invincibleTimer--;

    b.animFrame = (this.frameCount % 20 < 10) ? 0 : 1;
  }

  updateProjectiles() {
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.type === 'folder') {
        proj.vy += 0.15;
      }
      proj.lifetime--;
      if (proj.lifetime <= 0) proj.active = false;
    }
    this.projectiles = this.projectiles.filter(p => p.active);
  }

  updateCamera() {
    const targetX = this.player.x - CANVAS_WIDTH / 3;
    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.x = Math.max(0, Math.min(LEVEL_WIDTH - CANVAS_WIDTH, this.camera.x));
  }

  checkCollectibles() {
    for (const c of this.collectibles) {
      if (c.collected) continue;
      if (this.rectCollide(this.player, c)) {
        c.collected = true;
        this.docsCollected++;
      }
    }
  }

  checkPitDeath() {
    if (this.player.y > CANVAS_HEIGHT + 50) {
      this.state = 'gameover';
      this.onStateChange('gameover');
    }
  }

  rectCollide(a: { x: number; y: number; width: number; height: number },
              b: { x: number; y: number; width: number; height: number }): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x &&
           a.y < b.y + b.height && a.y + a.height > b.y;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Always render background
    ctx.save();
    ctx.translate(-this.camera.x, 0);
    this.renderBackground(ctx);
    ctx.restore();

    if (this.state === 'playing' || this.state === 'victory' || this.state === 'gameover') {
      ctx.save();
      ctx.translate(-this.camera.x, 0);

      this.renderPlatforms(ctx);
      this.renderCollectibles(ctx);
      this.renderEnemies(ctx);
      if (this.boss.alive) this.renderBoss(ctx);
      this.renderProjectiles(ctx);
      this.renderPlayer(ctx);

      ctx.restore();

      this.renderHUD(ctx);

      if (this.boss.alive) {
        this.renderBossHP(ctx);
      }
    }

    // Render menu title on canvas for visual feedback
    if (this.state === 'menu') {
      this.renderMenuBackground(ctx);
    }
  }

  renderMenuBackground(ctx: CanvasRenderingContext2D) {
    const time = this.frameCount * 0.02;
    const isMobile = window.innerWidth <= 768;

    // Bright ground
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(0, CANVAS_HEIGHT - TILE, CANVAS_WIDTH, TILE);
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(0, CANVAS_HEIGHT - TILE, CANVAS_WIDTH, 4);

    // Buildings - fewer on mobile
    const buildings = [
      { x: 50, w: 80, h: 200 },
      { x: 160, w: 60, h: 150 },
      { x: 250, w: 100, h: 250 },
      { x: 380, w: 70, h: 180 },
      { x: 480, w: 90, h: 220 },
      { x: 600, w: 75, h: 160 },
      { x: 700, w: 85, h: 200 },
    ];

    buildings.forEach((b, i) => {
      ctx.fillStyle = '#1a1a3e';
      ctx.fillRect(b.x, CANVAS_HEIGHT - TILE - b.h, b.w, b.h);
      // Windows - skip on mobile
      if (!isMobile) {
        for (let wy = 15; wy < b.h - 10; wy += 20) {
          for (let wx = 10; wx < b.w - 10; wx += 18) {
            const lit = Math.sin(time * 0.5 + i + wy * 0.1 + wx * 0.1) > 0;
            ctx.fillStyle = lit ? '#ffdd57' : '#2a2a4e';
            ctx.fillRect(b.x + wx, CANVAS_HEIGHT - TILE - b.h + wy, 8, 12);
          }
        }
      }
    });

    // Floating particles - fewer on mobile
    const particleCount = isMobile ? 15 : 30;
    ctx.fillStyle = 'rgba(255, 221, 87, 0.6)';
    for (let i = 0; i < particleCount; i++) {
      const x = (Math.sin(time + i * 1.3) * 0.5 + 0.5) * CANVAS_WIDTH;
      const y = (Math.cos(time * 0.7 + i * 0.9) * 0.5 + 0.5) * (CANVAS_HEIGHT - 100);
      ctx.fillRect(x, y, 3, 3);
    }

    // Draw Alex in center-bottom
    const alexX = CANVAS_WIDTH / 2 - 14;
    const alexY = CANVAS_HEIGHT - TILE - 48 + Math.sin(time * 2) * 3;
    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(alexX + 6, alexY + 2, 16, 16);
    // Hair
    ctx.fillStyle = '#3d2b1f';
    ctx.fillRect(alexX + 6, alexY, 16, 5);
    // Glasses
    ctx.fillStyle = '#333';
    ctx.fillRect(alexX + 8, alexY + 7, 6, 5);
    ctx.fillRect(alexX + 16, alexY + 7, 6, 5);
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(alexX + 9, alexY + 8, 4, 3);
    ctx.fillRect(alexX + 17, alexY + 8, 4, 3);
    // Body (suit)
    ctx.fillStyle = '#6b6b6b';
    ctx.fillRect(alexX + 4, alexY + 16, 20, 20);
    // Tie
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(alexX + 13, alexY + 18, 2, 14);
    // Legs
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(alexX + 6, alexY + 34, 7, 10);
    ctx.fillRect(alexX + 15, alexY + 34, 7, 10);
  }

  renderBackground(ctx: CanvasRenderingContext2D) {
    // Detect mobile for performance optimization
    const isMobile = window.innerWidth <= 768;
    
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(this.camera.x, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Clouds (parallax) - fewer on mobile
    const cloudCount = isMobile ? 8 : 15;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < cloudCount; i++) {
      const cx = (i * 320 - this.camera.x * 0.2) % (LEVEL_WIDTH + 200);
      const cy = 50 + (i % 3) * 40;
      const cw = 80 + (i % 4) * 20;
      const ch = 30 + (i % 3) * 10;
      ctx.fillRect(cx, cy, cw, ch);
      if (!isMobile) {
        ctx.fillRect(cx + 20, cy - 10, cw - 40, ch);
        ctx.fillRect(cx + 40, cy - 15, cw - 60, ch);
      }
    }

    // City buildings in background (parallax) - fewer on mobile
    const buildingCount = isMobile ? 15 : 30;
    ctx.fillStyle = '#1a1a3e';
    for (let i = 0; i < buildingCount; i++) {
      const bx = i * 180 - (this.camera.x * 0.3) % 180;
      const bh = 80 + Math.sin(i * 2.5) * 40;
      ctx.fillRect(bx + this.camera.x, CANVAS_HEIGHT - TILE - bh, 60, bh);
      
      // Windows - skip on mobile for performance
      if (!isMobile) {
        ctx.fillStyle = '#ffdd57';
        for (let wy = 0; wy < bh - 20; wy += 20) {
          for (let wx = 8; wx < 52; wx += 16) {
            if (Math.sin(i * 3 + wy + wx) > 0) {
              ctx.fillRect(bx + this.camera.x + wx, CANVAS_HEIGHT - TILE - bh + 10 + wy, 8, 10);
            }
          }
        }
        ctx.fillStyle = '#1a1a3e';
      }
    }

    // Stars - fewer on mobile
    const starCount = isMobile ? 20 : 50;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < starCount; i++) {
      const sx = (i * 97 + Math.sin(i) * 30) % LEVEL_WIDTH;
      const sy = (i * 43) % (CANVAS_HEIGHT - 100);
      const size = (i % 3 === 0) ? 2 : 1;
      ctx.fillRect(sx, sy, size, size);
    }
  }

  renderPlatforms(ctx: CanvasRenderingContext2D) {
    for (const plat of this.platforms) {
      if (plat.x + plat.width < this.camera.x || plat.x > this.camera.x + CANVAS_WIDTH) continue;

      if (plat.type === 'ground') {
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
        // Grid pattern
        ctx.fillStyle = '#3a3a3a';
        for (let gx = plat.x; gx < plat.x + plat.width; gx += TILE) {
          ctx.fillRect(gx, plat.y, 1, plat.height);
        }
      } else if (plat.type === 'floating') {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
        ctx.fillStyle = '#654321';
        ctx.fillRect(plat.x + 2, plat.y + 6, plat.width - 4, 4);
      } else if (plat.type === 'spike') {
        ctx.fillStyle = '#cc0000';
        for (let sx = plat.x; sx < plat.x + plat.width; sx += 12) {
          ctx.beginPath();
          ctx.moveTo(sx, plat.y + plat.height);
          ctx.lineTo(sx + 6, plat.y);
          ctx.lineTo(sx + 12, plat.y + plat.height);
          ctx.fill();
        }
      }
    }

    // Decorative elements - office boxes and furniture
    this.renderDecorations(ctx);
  }

  renderDecorations(ctx: CanvasRenderingContext2D) {
    const isMobile = window.innerWidth <= 768;
    
    // Office boxes scattered around - fewer on mobile
    const boxPositions = [
      { x: 250, y: CANVAS_HEIGHT - TILE - 30, w: 30, h: 30 },
      { x: 700, y: CANVAS_HEIGHT - TILE - 25, w: 25, h: 25 },
      { x: 1100, y: CANVAS_HEIGHT - TILE - 35, w: 35, h: 35 },
      { x: 1500, y: CANVAS_HEIGHT - TILE - 28, w: 28, h: 28 },
      { x: 1900, y: CANVAS_HEIGHT - TILE - 32, w: 32, h: 32 },
      { x: 2300, y: CANVAS_HEIGHT - TILE - 26, w: 26, h: 26 },
      { x: 2700, y: CANVAS_HEIGHT - TILE - 30, w: 30, h: 30 },
      { x: 3100, y: CANVAS_HEIGHT - TILE - 28, w: 28, h: 28 },
      { x: 3500, y: CANVAS_HEIGHT - TILE - 34, w: 34, h: 34 },
    ];

    const visibleBoxes = isMobile ? boxPositions.filter((_, i) => i % 2 === 0) : boxPositions;
    
    visibleBoxes.forEach(box => {
      if (box.x < this.camera.x - 50 || box.x > this.camera.x + CANVAS_WIDTH + 50) return;
      
      // Box body
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(box.x, box.y, box.w, box.h);
      // Box top
      ctx.fillStyle = '#A0826D';
      ctx.fillRect(box.x, box.y, box.w, 6);
      // Box tape
      ctx.fillStyle = '#D2B48C';
      ctx.fillRect(box.x + box.w / 2 - 3, box.y, 6, box.h);
      // Box shadow - skip on mobile
      if (!isMobile) {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(box.x + 2, box.y + box.h - 4, box.w - 4, 4);
      }
    });

    // Office chairs - skip on mobile for performance
    if (!isMobile) {
      const chairPositions = [400, 1000, 1600, 2200, 2800, 3400];
      chairPositions.forEach(cx => {
        if (cx < this.camera.x - 50 || cx > this.camera.x + CANVAS_WIDTH + 50) return;
        
        const cy = CANVAS_HEIGHT - TILE - 40;
        // Chair seat
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(cx, cy + 20, 24, 8);
        // Chair back
        ctx.fillRect(cx + 18, cy, 6, 20);
        // Chair leg
        ctx.fillStyle = '#555';
        ctx.fillRect(cx + 10, cy + 28, 4, 12);
      });
    }

    // Section signs
    const signs = [
      { x: 100, text: 'ОФИС', color: '#4ade80' },
      { x: 900, text: 'СКЛАД', color: '#60a5fa' },
      { x: 1700, text: 'АРХИВ', color: '#fbbf24' },
      { x: 2500, text: 'СЕРВЕРНАЯ', color: '#f472b6' },
      { x: 3300, text: 'ШЕФ', color: '#ef4444' },
    ];

    signs.forEach(sign => {
      if (sign.x < this.camera.x - 100 || sign.x > this.camera.x + CANVAS_WIDTH + 100) return;
      
      const sy = 80;
      // Sign post
      ctx.fillStyle = '#666';
      ctx.fillRect(sign.x + 20, sy, 4, 60);
      // Sign board
      ctx.fillStyle = '#333';
      ctx.fillRect(sign.x, sy - 20, 44, 24);
      ctx.strokeStyle = sign.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(sign.x, sy - 20, 44, 24);
      // Text
      ctx.fillStyle = sign.color;
      ctx.font = 'bold 10px monospace';
      ctx.fillText(sign.text, sign.x + 4, sy - 4);
    });
  }

  renderCollectibles(ctx: CanvasRenderingContext2D) {
    for (const c of this.collectibles) {
      if (c.collected) continue;
      if (c.x < this.camera.x - 50 || c.x > this.camera.x + CANVAS_WIDTH + 50) continue;

      const bobY = Math.sin(this.frameCount * 0.05 + c.x * 0.01) * 3;

      // Document icon
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(c.x, c.y + bobY, c.width, c.height);
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(c.x + 2, c.y + bobY + 2, c.width - 4, c.height - 4);
      // Lines on document
      ctx.fillStyle = '#666666';
      ctx.fillRect(c.x + 4, c.y + bobY + 6, c.width - 8, 2);
      ctx.fillRect(c.x + 4, c.y + bobY + 11, c.width - 8, 2);
      ctx.fillRect(c.x + 4, c.y + bobY + 16, c.width - 10, 2);
      // Corner fold
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.moveTo(c.x + c.width - 6, c.y + bobY);
      ctx.lineTo(c.x + c.width, c.y + bobY + 6);
      ctx.lineTo(c.x + c.width - 6, c.y + bobY + 6);
      ctx.fill();
    }
  }

  renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    if (p.invincibleTimer > 0 && this.frameCount % 6 < 3) return;

    const flip = p.facing === 'left';
    ctx.save();
    if (flip) {
      ctx.translate(p.x + p.width, p.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(p.x, p.y);
    }

    // Legs
    const legOffset = p.onGround && Math.abs(p.vx) > 0.5 ? (p.animFrame % 2 === 0 ? 2 : -2) : 0;
    ctx.fillStyle = '#2c2c2c';
    ctx.fillRect(6, 34, 7, 10 + legOffset);
    ctx.fillRect(15, 34, 7, 10 - legOffset);

    // Shoes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(5, 42 + legOffset, 9, 4);
    ctx.fillRect(14, 42 - legOffset, 9, 4);

    // Body (grey suit)
    ctx.fillStyle = '#6b6b6b';
    ctx.fillRect(4, 16, 20, 20);

    // Suit details
    ctx.fillStyle = '#555555';
    ctx.fillRect(13, 16, 2, 20); // tie area
    ctx.fillStyle = '#cc0000';
    ctx.fillRect(13, 18, 2, 14); // red tie

    // Arms
    const armSwing = p.onGround && Math.abs(p.vx) > 0.5 ? Math.sin(this.frameCount * 0.3) * 3 : 0;
    ctx.fillStyle = '#6b6b6b';
    ctx.fillRect(0, 18 + armSwing, 5, 14);
    ctx.fillRect(23, 18 - armSwing, 5, 14);

    // Hands
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(0, 30 + armSwing, 5, 4);
    ctx.fillRect(23, 30 - armSwing, 5, 4);

    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(6, 2, 16, 16);

    // Hair
    ctx.fillStyle = '#3d2b1f';
    ctx.fillRect(6, 0, 16, 5);
    ctx.fillRect(5, 2, 3, 6);

    // Glasses
    ctx.fillStyle = '#333333';
    ctx.fillRect(8, 7, 6, 5);
    ctx.fillRect(16, 7, 6, 5);
    ctx.fillRect(14, 8, 2, 2);
    // Lens
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(9, 8, 4, 3);
    ctx.fillRect(17, 8, 4, 3);

    // Mouth
    ctx.fillStyle = '#cc8866';
    ctx.fillRect(12, 14, 4, 1);

    ctx.restore();
  }

  renderEnemies(ctx: CanvasRenderingContext2D) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.x < this.camera.x - 50 || e.x > this.camera.x + CANVAS_WIDTH + 50) continue;

      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.type === 'clerk') {
        // Office clerk enemy
        // Body
        ctx.fillStyle = '#4a4a8a';
        ctx.fillRect(4, 14, 22, 16);
        // Head
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(7, 2, 16, 14);
        // Angry eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(10, 6, 4, 4);
        ctx.fillRect(17, 6, 4, 4);
        // Angry eyebrows
        ctx.fillStyle = '#333';
        ctx.fillRect(9, 4, 5, 2);
        ctx.fillRect(17, 4, 5, 2);
        // Legs
        ctx.fillStyle = '#333';
        ctx.fillRect(6, 30, 6, 6 + (e.animFrame * 2));
        ctx.fillRect(18, 30, 6, 6 - (e.animFrame * 2));
        // Tie
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(14, 14, 3, 10);
      } else {
        // Robot enemy
        ctx.fillStyle = '#888888';
        ctx.fillRect(4, 10, 22, 20);
        // Head
        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(6, 0, 18, 12);
        // Eyes (glowing)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(9, 3, 5, 5);
        ctx.fillRect(17, 3, 5, 5);
        // Antenna
        ctx.fillStyle = '#666';
        ctx.fillRect(14, -4, 2, 6);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(13, -6, 4, 3);
        // Legs
        ctx.fillStyle = '#666';
        ctx.fillRect(6, 30, 7, 6 + (e.animFrame * 2));
        ctx.fillRect(17, 30, 7, 6 - (e.animFrame * 2));
        // Arms
        ctx.fillStyle = '#777';
        ctx.fillRect(0, 14, 5, 12);
        ctx.fillRect(25, 14, 5, 12);
      }

      ctx.restore();
    }
  }

  renderBoss(ctx: CanvasRenderingContext2D) {
    const b = this.boss;
    if (b.invincibleTimer > 0 && this.frameCount % 4 < 2) return;

    ctx.save();
    ctx.translate(b.x, b.y);

    // Body (black suit)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(8, 24, 32, 30);

    // Suit details
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(22, 24, 4, 30);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(22, 26, 4, 2); // shirt collar

    // Legs
    ctx.fillStyle = '#111';
    ctx.fillRect(12, 52, 10, 12);
    ctx.fillRect(26, 52, 10, 12);

    // Shoes
    ctx.fillStyle = '#000';
    ctx.fillRect(10, 62, 13, 4);
    ctx.fillRect(25, 62, 13, 4);

    // Arms
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 26, 10, 20);
    ctx.fillRect(38, 26, 10, 20);

    // Hands
    ctx.fillStyle = '#e8c49a';
    ctx.fillRect(1, 44, 8, 6);
    ctx.fillRect(39, 44, 8, 6);

    // Head
    ctx.fillStyle = '#e8c49a';
    ctx.fillRect(12, 2, 24, 24);

    // Hair (black, slicked back)
    ctx.fillStyle = '#111';
    ctx.fillRect(12, 0, 24, 6);
    ctx.fillRect(10, 2, 4, 8);
    ctx.fillRect(34, 2, 4, 8);

    // Eyes (menacing)
    ctx.fillStyle = '#000';
    ctx.fillRect(16, 10, 6, 5);
    ctx.fillRect(26, 10, 6, 5);
    // Pupils
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(18, 11, 3, 3);
    ctx.fillRect(28, 11, 3, 3);

    // Eyebrows (angry)
    ctx.fillStyle = '#111';
    ctx.fillRect(15, 7, 8, 3);
    ctx.fillRect(25, 7, 8, 3);

    // Mouth (sinister grin)
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(18, 19, 12, 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(19, 19, 2, 2);
    ctx.fillRect(23, 19, 2, 2);
    ctx.fillRect(27, 19, 2, 2);

    // Laser charging effect
    if (b.attackTimer % 150 > 140) {
      ctx.fillStyle = `rgba(255, 0, 0, ${Math.sin(this.frameCount * 0.5) * 0.5 + 0.5})`;
      ctx.fillRect(17, 11, 4, 3);
      ctx.fillRect(27, 11, 4, 3);
    }

    ctx.restore();
  }

  renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const proj of this.projectiles) {
      if (!proj.active) continue;

      if (proj.type === 'folder') {
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        ctx.fillStyle = '#8b6914';
        ctx.fillRect(proj.x + 2, proj.y + 2, proj.width - 4, proj.height - 4);
        // Text lines
        ctx.fillStyle = '#fff';
        ctx.fillRect(proj.x + 4, proj.y + 5, proj.width - 8, 1);
        ctx.fillRect(proj.x + 4, proj.y + 8, proj.width - 8, 1);
      } else if (proj.type === 'laser') {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.7 + Math.sin(this.frameCount * 0.5) * 0.3})`;
        ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
        ctx.fillStyle = '#ff6666';
        ctx.fillRect(proj.x + 2, proj.y + 1, proj.width - 4, proj.height - 2);
      }
    }
  }

  renderHUD(ctx: CanvasRenderingContext2D) {
    const isMobile = window.innerWidth <= 768;
    const scale = isMobile ? 0.85 : 1;
    
    // Documents counter
    const docBoxWidth = isMobile ? 170 : 200;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, docBoxWidth, 35 * scale);
    ctx.strokeStyle = '#ffdd57';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, docBoxWidth, 35 * scale);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isMobile ? 12 : 14}px monospace`;
    ctx.fillText(`📄 ${this.docsCollected} / ${DOCS_TOTAL}`, 20, 32 * scale);

    // HP - compact for mobile
    const hpBoxWidth = isMobile ? 170 : 220;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 50 * scale, hpBoxWidth, 25 * scale);
    ctx.strokeStyle = '#ff4444';
    ctx.strokeRect(10, 50 * scale, hpBoxWidth, 25 * scale);

    ctx.fillStyle = '#ff4444';
    ctx.font = `bold ${isMobile ? 10 : 12}px monospace`;
    ctx.fillText('❤️', 18, 67 * scale);
    
    const hpBarStart = isMobile ? 40 : 70;
    const hpBarWidth = isMobile ? 8 : 10;
    const hpBarHeight = isMobile ? 10 : 12;
    const hpBarGap = isMobile ? 10 : 14;
    
    for (let i = 0; i < this.player.maxHp; i++) {
      ctx.fillStyle = i < this.player.hp ? '#ff4444' : '#333';
      ctx.fillRect(hpBarStart + i * hpBarGap, 56 * scale, hpBarWidth, hpBarHeight);
    }
  }

  renderBossHP(ctx: CanvasRenderingContext2D) {
    const barWidth = 300;
    const barX = (CANVAS_WIDTH - barWidth) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX - 5, CANVAS_HEIGHT - 50, barWidth + 10, 35);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 5, CANVAS_HEIGHT - 50, barWidth + 10, 35);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('TENOS', barX, CANVAS_HEIGHT - 33);

    // HP bar
    ctx.fillStyle = '#333';
    ctx.fillRect(barX + 50, CANVAS_HEIGHT - 42, barWidth - 60, 16);
    const hpRatio = this.boss.hp / this.boss.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? '#ff4444' : hpRatio > 0.25 ? '#ff8800' : '#ff0000';
    ctx.fillRect(barX + 50, CANVAS_HEIGHT - 42, (barWidth - 60) * hpRatio, 16);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX + 50, CANVAS_HEIGHT - 42, barWidth - 60, 16);
  }

  destroy() {
    // Cleanup if needed
  }
}
