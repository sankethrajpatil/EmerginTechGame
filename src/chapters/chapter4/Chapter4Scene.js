import Phaser from 'phaser';
import { chapter4Questions } from './questions.js';
import { addScore, getState, markAnswered, setChapter } from '../../core/GameState.js';
import { showRules } from '../../ui/RulesOverlay.js';
import { addEscButton } from '../../ui/EscButton.js';

/* ─── constants ─────────────────────────────────────────── */
const TILE = 64;
const COLS = 15;
const ROWS = 10;
const PLAYER_SPEED = 160;
const GHOST_SPEED = 100;
const CORRECT_PTS = 1;
const WRONG_PTS = -3;
const GHOST_PTS = -1;
const NODE_SIZE = 40;
const NODE_COLORS = [0xee6352, 0x59cd90, 0x3fa7d6, 0xfac748];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// 0 = path, 1 = wall
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Data node spawn positions (row, col) — in dead-end-like corners
const NODE_CELLS = [
  { r: 1, c: 1 },
  { r: 1, c: 13 },
  { r: 8, c: 1 },
  { r: 8, c: 13 },
];

// Ghost starting positions
const GHOST_STARTS = [
  { r: 3, c: 5 },
  { r: 7, c: 9 },
];

// Player start position (maze center)
const PLAYER_START = { r: 5, c: 7 };

export class Chapter4Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Chapter4Scene' });
  }

  /* ────────────────── INIT ────────────────── */
  init() {
    setChapter(4);
    this.qIndex = 0;
    this.localScore = 0;
    this.nodes = [];
    this.ghosts = [];
    this.gameOver = false;
    this.rulesShown = false;
    this.feedbackTimer = null;
    this.moveDir = { x: 0, y: 0 };
  }

  /* ────────────────── PRELOAD ─────────────── */
  preload() {
    this.load.image(
      'model',
      'https://api.dicebear.com/9.x/shapes/png?seed=aiModel&size=48'
    );
    this.load.image(
      'ghost0',
      'https://robohash.org/oomGhost0.png?size=48x48&set=set3'
    );
    this.load.image(
      'ghost1',
      'https://robohash.org/oomGhost1.png?size=48x48&set=set3'
    );
  }

  /* ────────────────── CREATE ─────────────── */
  create() {
    const { width, height } = this.scale;
    const offsetX = (width - COLS * TILE) / 2;
    const offsetY = (height - ROWS * TILE) / 2;
    this.mazeOffset = { x: offsetX, y: offsetY };

    // ── draw maze walls
    this.wallGraphics = this.add.graphics().setDepth(1);
    this.wallGraphics.fillStyle(0x2a2a4a, 1);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 1) {
          this.wallGraphics.fillRect(
            offsetX + c * TILE, offsetY + r * TILE, TILE, TILE
          );
        }
      }
    }

    // ── draw floor
    this.add
      .rectangle(width / 2, height / 2, COLS * TILE, ROWS * TILE, 0x111122)
      .setDepth(0);

    // ── player
    const pPos = this.cellToWorld(PLAYER_START.r, PLAYER_START.c);
    this.player = this.add
      .image(pPos.x, pPos.y, 'model')
      .setDisplaySize(TILE - 12, TILE - 12)
      .setDepth(5);

    // ── ghosts
    for (let i = 0; i < GHOST_STARTS.length; i++) {
      const gp = this.cellToWorld(GHOST_STARTS[i].r, GHOST_STARTS[i].c);
      const ghost = this.add
        .image(gp.x, gp.y, `ghost${i}`)
        .setDisplaySize(TILE - 14, TILE - 14)
        .setDepth(4);
      // each ghost picks a random initial direction
      const dirs = this.getOpenDirections(GHOST_STARTS[i].r, GHOST_STARTS[i].c);
      const pick = dirs[Phaser.Math.Between(0, dirs.length - 1)];
      this.ghosts.push({ sprite: ghost, dx: pick.dx, dy: pick.dy });
    }

    // ── HUD
    this.scoreText = this.add
      .text(16, 8, `Score: ${getState().score}`, {
        fontSize: '20px', color: '#3FA7D6', fontFamily: 'Arial',
      })
      .setDepth(10);

    this.questionText = this.add
      .text(width / 2, 8, '', {
        fontSize: '14px', color: '#ffffff', fontFamily: 'Arial',
        wordWrap: { width: width - 200 }, align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.feedbackText = this.add
      .text(width / 2, height / 2, '', {
        fontSize: '28px', fontFamily: 'Arial', fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    this.chapterLabel = this.add
      .text(width - 16, 8, 'Ch.4 — LLMs & PEFT', {
        fontSize: '14px', color: '#888', fontFamily: 'Arial',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // ── legend (node colors)
    this.legendGroup = this.add.group();

    // ── input
    this.cursors = this.input.keyboard.createCursorKeys();

    addEscButton(this);

    // show rules before starting
    showRules(this, {
      title: 'Chapter 4 — Memory Maze',
      mechanics: [
        'Navigate the maze to collect the correct data node!',
        'Avoid the roaming OOM ghosts — they reset you.',
      ],
      controls: [
        '← → ↑ ↓  Move through the maze',
      ],
      scoring: [
        'Correct node: +1 point',
        'Wrong node: -3 points',
        'Ghost hit: -1 point + reset to center',
      ],
    }, () => {
      this.rulesShown = true;
      this.spawnQuestion();
    });
  }

  /* ────────────────── UPDATE ─────────────── */
  update(_time, delta) {
    if (this.gameOver || !this.rulesShown) return;
    const dt = delta / 1000;

    // ── player movement
    this.movePlayer(dt);

    // ── ghost movement
    this.moveGhosts(dt);

    // ── collision: player ↔ node
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      if (this.overlapSprites(this.player, n.container, NODE_SIZE * 0.6)) {
        this.handleNodeTouch(i);
        return;
      }
    }

    // ── collision: player ↔ ghost
    for (const g of this.ghosts) {
      if (this.overlapSprites(this.player, g.sprite, TILE * 0.45)) {
        this.handleGhostHit();
        return;
      }
    }
  }

  /* ─── MOVEMENT ───────────────────────────── */

  movePlayer(dt) {
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx = -1;
    else if (this.cursors.right.isDown) dx = 1;
    else if (this.cursors.up.isDown) dy = -1;
    else if (this.cursors.down.isDown) dy = 1;

    if (dx === 0 && dy === 0) return;

    const newX = this.player.x + dx * PLAYER_SPEED * dt;
    const newY = this.player.y + dy * PLAYER_SPEED * dt;

    if (!this.hitsWall(newX, newY)) {
      this.player.x = newX;
      this.player.y = newY;
    }
  }

  moveGhosts(dt) {
    for (const g of this.ghosts) {
      const newX = g.sprite.x + g.dx * GHOST_SPEED * dt;
      const newY = g.sprite.y + g.dy * GHOST_SPEED * dt;

      if (this.hitsWall(newX, newY)) {
        // pick a new random open direction
        const cell = this.worldToCell(g.sprite.x, g.sprite.y);
        const dirs = this.getOpenDirections(cell.r, cell.c);
        // prefer not reversing if possible
        const filtered = dirs.filter(d => !(d.dx === -g.dx && d.dy === -g.dy));
        const choices = filtered.length > 0 ? filtered : dirs;
        const pick = choices[Phaser.Math.Between(0, choices.length - 1)];
        g.dx = pick.dx;
        g.dy = pick.dy;
      } else {
        g.sprite.x = newX;
        g.sprite.y = newY;
      }
    }
  }

  /* ─── GRID HELPERS ───────────────────────── */

  cellToWorld(r, c) {
    return {
      x: this.mazeOffset.x + c * TILE + TILE / 2,
      y: this.mazeOffset.y + r * TILE + TILE / 2,
    };
  }

  worldToCell(wx, wy) {
    return {
      r: Math.floor((wy - this.mazeOffset.y) / TILE),
      c: Math.floor((wx - this.mazeOffset.x) / TILE),
    };
  }

  hitsWall(wx, wy) {
    const half = TILE * 0.35;
    // check all four corners of the player bounding box
    const corners = [
      { x: wx - half, y: wy - half },
      { x: wx + half, y: wy - half },
      { x: wx - half, y: wy + half },
      { x: wx + half, y: wy + half },
    ];
    for (const pt of corners) {
      const cell = this.worldToCell(pt.x, pt.y);
      if (cell.r < 0 || cell.r >= ROWS || cell.c < 0 || cell.c >= COLS) return true;
      if (MAZE[cell.r][cell.c] === 1) return true;
    }
    return false;
  }

  getOpenDirections(r, c) {
    const dirs = [];
    if (r > 0 && MAZE[r - 1][c] === 0) dirs.push({ dx: 0, dy: -1 });
    if (r < ROWS - 1 && MAZE[r + 1][c] === 0) dirs.push({ dx: 0, dy: 1 });
    if (c > 0 && MAZE[r][c - 1] === 0) dirs.push({ dx: -1, dy: 0 });
    if (c < COLS - 1 && MAZE[r][c + 1] === 0) dirs.push({ dx: 1, dy: 0 });
    return dirs;
  }

  overlapSprites(a, b, dist) {
    const ax = a.x ?? a.x;
    const ay = a.y ?? a.y;
    const bx = b.x ?? b.x;
    const by = b.y ?? b.y;
    return Math.abs(ax - bx) < dist && Math.abs(ay - by) < dist;
  }

  /* ─── GAME LOGIC ─────────────────────────── */

  spawnQuestion() {
    if (this.qIndex >= chapter4Questions.length) {
      this.showEndScreen();
      return;
    }

    const q = chapter4Questions[this.qIndex];
    this.questionText.setText(`Q${this.qIndex + 1}: ${q.question}`);

    for (let i = 0; i < NODE_CELLS.length; i++) {
      const pos = this.cellToWorld(NODE_CELLS[i].r, NODE_CELLS[i].c);
      const container = this.add.container(pos.x, pos.y).setDepth(3);

      const rect = this.add
        .rectangle(0, 0, NODE_SIZE, NODE_SIZE, NODE_COLORS[i])
        .setStrokeStyle(2, 0xffffff);

      const letter = this.add
        .text(0, 0, OPTION_LETTERS[i], {
          fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
        })
        .setOrigin(0.5);

      const label = this.add
        .text(0, NODE_SIZE / 2 + 10, q.options[i], {
          fontSize: '9px', color: '#cccccc', fontFamily: 'Arial',
          wordWrap: { width: TILE * 1.6 }, align: 'center',
        })
        .setOrigin(0.5, 0);

      container.add([rect, letter, label]);
      this.nodes.push({ container, optionIndex: i });
    }
  }

  handleNodeTouch(nodeIndex) {
    const q = chapter4Questions[this.qIndex];
    const touched = this.nodes[nodeIndex];
    const isCorrect = touched.optionIndex === q.correct_answer;

    if (isCorrect) {
      this.localScore += CORRECT_PTS;
      addScore(CORRECT_PTS);
      this.showFeedback('✓  Correct! +1', '#00ff88');
      markAnswered(q.id);
      this.clearNodes();
      this.updateScoreDisplay();
      this.resetPlayerPosition();
      this.qIndex++;
      this.time.delayedCall(1200, () => this.spawnQuestion());
    } else {
      this.localScore += WRONG_PTS;
      addScore(WRONG_PTS);
      this.showFeedback('✗  Wrong! -3', '#e94560');
      // destroy only the wrong node
      touched.container.destroy();
      this.nodes.splice(nodeIndex, 1);
      this.updateScoreDisplay();

      // if all wrong nodes destroyed → auto-advance
      if (this.nodes.length === 0) {
        markAnswered(q.id);
        this.resetPlayerPosition();
        this.qIndex++;
        this.time.delayedCall(1200, () => this.spawnQuestion());
      }
    }
  }

  handleGhostHit() {
    this.localScore += GHOST_PTS;
    addScore(GHOST_PTS);
    this.showFeedback('⚡ OOM Ghost! -1', '#ff8800');
    this.updateScoreDisplay();
    this.resetPlayerPosition();
  }

  resetPlayerPosition() {
    const pos = this.cellToWorld(PLAYER_START.r, PLAYER_START.c);
    this.player.x = pos.x;
    this.player.y = pos.y;
  }

  clearNodes() {
    for (const n of this.nodes) n.container.destroy();
    this.nodes = [];
  }

  updateScoreDisplay() {
    this.scoreText.setText(`Score: ${getState().score}`);
  }

  showFeedback(msg, color) {
    this.feedbackText.setText(msg).setColor(color).setVisible(true);
    if (this.feedbackTimer) this.feedbackTimer.remove();
    this.feedbackTimer = this.time.delayedCall(1000, () => {
      this.feedbackText.setVisible(false);
    });
  }

  /* ─── END SCREEN ─────────────────────────── */

  showEndScreen() {
    this.gameOver = true;
    const { width, height } = this.scale;
    const globalState = getState();

    this.questionText.setVisible(false);
    this.feedbackText.setVisible(false);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(30);

    this.add
      .text(width / 2, height / 2 - 80, 'Chapter 4 Complete!', {
        fontSize: '36px', color: '#FAC748', fontFamily: 'Arial', fontStyle: 'bold',
      })
      .setOrigin(0.5).setDepth(31);

    this.add
      .text(width / 2, height / 2 - 20, `Chapter Score: ${this.localScore}`, {
        fontSize: '22px', color: '#ffffff', fontFamily: 'Arial',
      })
      .setOrigin(0.5).setDepth(31);

    this.add
      .text(width / 2, height / 2 + 20, `Global Score: ${globalState.score}`, {
        fontSize: '22px', color: '#FAC748', fontFamily: 'Arial',
      })
      .setOrigin(0.5).setDepth(31);

    this.add
      .text(width / 2, height / 2 + 70, 'Press ENTER for Chapter 5', {
        fontSize: '18px', color: '#888', fontFamily: 'Arial',
      })
      .setOrigin(0.5).setDepth(31);

    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.start('Chapter5Scene');
    });
  }
}
