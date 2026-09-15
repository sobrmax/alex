import { Player, Enemy, Boss, Platform, Collectible, Projectile, GameState } from './types';

const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const MOVE_SPEED = 4;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const TILE = 32;
const LEVEL_WIDTH = 4800;
const DOCS_TOTAL = 50;

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
  }

  createPlayer(): Player {
    return {
      x: 100, y: 300, width: 28, height: 44,
      vx: 0, vy: 0, onGround: false,
      facing: 'right', hp: 5, maxHp: 5,
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

    // Ground platforms with gaps
    const groundSegments = [
      { start: 0, end: 600 },
      { start: 680, end: 1400 },
      { start: 1480, end: 2200 },
      { start: 2280, end: 3000 },
      { start: 3080, end: 3800 },
      { start: 3880, end: LEVEL_WIDTH },
    ];

    groundSegments.forEach(seg => {
      this.platforms.push({
        x: seg.start, y: CANVAS_HEIGHT - TILE, width: seg.end - seg.start, height: TILE,
        type: 'ground'
      });
    });

    // Floating platforms
    const floatingPlatforms = [
      { x: 200, y: 340, w: 96 },
      { x: 400, y: 280, w: 96 },
      { x: 620, y: 320, w: 64 },
      { x: 750, y: 250, w: 96 },
      { x: 950, y: 300, w: 80 },
      { x: 1100, y: 230, w: 96 },
      { x: 1300, y: 280, w: 80 },
      { x: 1420, y: 340, w: 64 },
      { x: 1550, y: 260, w: 96 },
      { x: 1750, y: 310, w: 80 },
      { x: 1900, y: 240, w: 96 },
      { x: 2100, y: 280, w: 80 },
      { x: 2220, y: 340, w: 64 },
      { x: 2400, y: 260, w: 96 },
      { x: 2600, y: 300, w: 80 },
      { x: 2800, y: 230, w: 96 },
      { x: 2950, y: 340, w: 64 },
      { x: 3100, y: 270, w: 96 },
      { x: 3300, y: 310, w: 80 },
      { x: 3500, y: 250, w: 96 },
      { x: 3700, y: 300, w: 80 },
      { x: 3850, y: 340, w: 64 },
    ];

    floatingPlatforms.forEach(p => {
      this.platforms.push({
        x: p.x, y: p.y, width: p.w, height: 16, type: 'floating'
      });
    });

    // Spikes
    const spikePositions = [500, 1200, 1800, 2500, 3200, 3600];
    spikePositions.forEach(sx => {
      this.platforms.push({
        x: sx, y: CANVAS_HEIGHT - TILE - 16, width: 48, height: 16, type: 'spike'
      });
    });

    // Documents (50 total spread across level)
    for (let i = 0; i < DOCS_TOTAL; i++) {
      const x = 150 + (i * (LEVEL_WIDTH - 400) / DOCS_TOTAL);
      const baseY = 200 + Math.sin(i * 0.7) * 80;
      this.collectibles.push({
        x: x, y: baseY, width: 20, height: 24,
        collected: false, type: 'document'
      });
    }

    // Enemies
    const enemyPositions = [
      { x: 350, patrol: [300, 500] },
      { x: 800, patrol: [700, 1000] },
      { x: 1200, patrol: [1100, 1350] },
      { x: 1600, patrol: [1500, 1750] },
      { x: 2000, patrol: [1900, 2150] },
      { x: 2400, patrol: [2300, 2600] },
      { x: 2800, patrol: [2700, 2950] },
      { x: 3200, patrol: [3100, 3400] },
      { x: 3500, patrol: [3400, 3700] },
    ];

    enemyPositions.forEach(e => {
      this.enemies.push({
        x: e.x, y: CANVAS_HEIGHT - TILE - 36, width: 30, height: 36,
        vx: 1.2, alive: true, type: Math.random() > 0.5 ? 'clerk' : 'robot',
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
    this.player.invincibleTimer = 90;
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
      }
      return;
    }

    const b = this.boss;
    const p = this.player;

    // Boss AI
    b.attackTimer++;

    // Movement
    if (b.attackTimer % 120 < 60) {
      b.vx = p.x > b.x ? 1.5 : -1.5;
    } else {
      b.vx = 0;
    }
    b.x += b.vx;
    b.x = Math.max(LEVEL_WIDTH - 600, Math.min(LEVEL_WIDTH - 100, b.x));

    // Attacks
    if (b.attackTimer % 90 === 0) {
      // Throw folder projectile
      this.projectiles.push({
        x: b.x, y: b.y + 20,
        vx: p.x > b.x ? -5 : 5,
        vy: -3,
        width: 20, height: 16,
        type: 'folder', active: true, lifetime: 180
      });
    }

    if (b.attackTimer % 150 === 0 && b.hp < b.maxHp * 0.6) {
      // Laser from eyes (phase 2)
      this.projectiles.push({
        x: b.x + (p.x > b.x ? b.width : -20), y: b.y + 15,
        vx: p.x > b.x ? 8 : -8,
        vy: 0,
        width: 24, height: 6,
        type: 'laser', active: true, lifetime: 60
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

    if (this.state === 'playing' || this.state === 'victory' || this.state === 'gameover') {
      ctx.save();
      ctx.translate(-this.camera.x, 0);

      this.renderBackground(ctx);
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
  }

  renderBackground(ctx: CanvasRenderingContext2D) {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(this.camera.x, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // City buildings in background (parallax)
    ctx.fillStyle = '#1a1a3e';
    for (let i = 0; i < 30; i++) {
      const bx = i * 180 - (this.camera.x * 0.3) % 180;
      const bh = 80 + Math.sin(i * 2.5) * 40;
      ctx.fillRect(bx + this.camera.x, CANVAS_HEIGHT - TILE - bh, 60, bh);
      // Windows
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

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
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
    // Documents counter
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 35);
    ctx.strokeStyle = '#ffdd57';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 35);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`📄 Документы: ${this.docsCollected} / ${DOCS_TOTAL}`, 20, 32);

    // HP
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 50, 150, 25);
    ctx.strokeStyle = '#ff4444';
    ctx.strokeRect(10, 50, 150, 25);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('❤️ HP:', 18, 67);
    for (let i = 0; i < this.player.maxHp; i++) {
      ctx.fillStyle = i < this.player.hp ? '#ff4444' : '#333';
      ctx.fillRect(70 + i * 16, 56, 12, 12);
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
