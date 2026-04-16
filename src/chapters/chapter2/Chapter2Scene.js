import Phaser from 'phaser';
import { chapter2Questions } from './questions.js';
import { addScore, getState, markAnswered, setChapter } from '../../core/GameState.js';
import { showRules } from '../../ui/RulesOverlay.js';

/* ─── constants ─────────────────────────────────────────── */
const BASKET_SPEED = 420;
const BLOCK_FALL_SPEED = 100;
const BLOCK_SIZE = 100;
const NUM_OPTIONS = 4;
const CORRECT_PTS = 1;
const WRONG_PTS = -3;
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const BLOCK_COLORS = ['EE6352', '59CD90', '3FA7D6', 'FAC748'];

export class Chapter2Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Chapter2Scene' });
  }

  /* ────────────────── INIT ────────────────── */
  init() {
    setChapter(2);
    this.qIndex = 0;
    this.localScore = 0;
    this.blocks = [];
    this.answered = false;
    this.gameOver = false;
    this.rulesShown = false;
  }

  /* ────────────────── PRELOAD ─────────────── */
  preload() {
    // Falling option blocks via Placehold.co
    for (let i = 0; i < NUM_OPTIONS; i++) {
      this.load.image(
        `block${i}`,
        `https://placehold.co/${BLOCK_SIZE}x${BLOCK_SIZE}/${BLOCK_COLORS[i]}/ffffff/png?text=${OPTION_LETTERS[i]}`
      );
    }

    // Basket placeholder
    this.load.image(
      'basket',
      `https://placehold.co/120x60/8B5E3C/ffffff/png?text=Basket`
    );
  }

  /* ────────────────── CREATE ─────────────── */
  create() {
    const { width, height } = this.scale;

    // ── starfield background
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.15, 0.5)
      );
      this.stars.push(s);
    }

    // ── HUD
    const globalState = getState();
    this.scoreText = this.add
      .text(16, 16, `Score: ${globalState.score}`, {
        fontSize: '20px',
        color: '#3FA7D6',
        fontFamily: 'Arial',
      })
      .setDepth(10);

    this.questionText = this.add
      .text(width / 2, 40, '', {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial',
        wordWrap: { width: width - 80 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.feedbackText = this.add
      .text(width / 2, height / 2, '', {
        fontSize: '28px',
        color: '#e94560',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    this.chapterLabel = this.add
      .text(width - 16, 16, 'Ch.2 — Neural Networks', {
        fontSize: '14px',
        color: '#888',
        fontFamily: 'Arial',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // ── basket (player)
    this.basket = this.add
      .image(width / 2, height - 40, 'basket')
      .setDisplaySize(120, 60)
      .setDepth(5);

    // ── input
    this.cursors = this.input.keyboard.createCursorKeys();

    // ── show rules before starting
    showRules(this, {
      title: 'Chapter 2 — Catch the Object',
      mechanics: [
        'Catch the falling block with the correct answer!',
        'Move the basket to intercept it before it hits the ground.',
      ],
      controls: [
        '← →  Move basket left / right',
      ],
      scoring: [
        'Correct catch: +1 point',
        'Wrong catch: -3 points',
      ],
    }, () => {
      this.rulesShown = true;
      this.spawnQuestion();
    });
  }

  /* ────────────────── UPDATE ─────────────── */
  update(_time, delta) {
    if (this.gameOver || !this.rulesShown) return;

    const { width, height } = this.scale;
    const dt = delta / 1000;

    // ── scrolling stars
    for (const s of this.stars) {
      s.y += 20 * dt;
      if (s.y > height) {
        s.y = 0;
        s.x = Phaser.Math.Between(0, width);
      }
    }

    // ── basket movement
    if (this.cursors.left.isDown) {
      this.basket.x = Math.max(60, this.basket.x - BASKET_SPEED * dt);
    } else if (this.cursors.right.isDown) {
      this.basket.x = Math.min(width - 60, this.basket.x + BASKET_SPEED * dt);
    }

    if (this.answered) return;

    // ── move blocks down
    for (const b of this.blocks) {
      b.container.y += BLOCK_FALL_SPEED * dt;
    }

    // ── collision: basket ↔ block
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      if (this.catchTest(this.basket, b.container)) {
        this.handleCatch(i);
        return;
      }
    }

    // ── if any block passes below screen → missed
    for (const b of this.blocks) {
      if (b.container.y > height + 60) {
        this.handleMissed();
        return;
      }
    }
  }

  /* ─── GAME LOGIC ─────────────────────────── */

  spawnQuestion() {
    if (this.qIndex >= chapter2Questions.length) {
      this.showEndScreen();
      return;
    }

    this.answered = false;
    const q = chapter2Questions[this.qIndex];
    this.questionText.setText(`Q${this.qIndex + 1}: ${q.question}`);

    const { width } = this.scale;
    const spacing = width / (NUM_OPTIONS + 1);
    const startY = 100;

    for (let i = 0; i < NUM_OPTIONS; i++) {
      const x = spacing * (i + 1);
      // stagger vertically so they don't all arrive at once
      const y = startY - i * 40;
      const container = this.add.container(x, y).setDepth(5);

      // block sprite
      const sprite = this.add
        .image(0, 0, `block${i}`)
        .setDisplaySize(BLOCK_SIZE, BLOCK_SIZE);

      // option label below block
      const label = this.add
        .text(0, BLOCK_SIZE / 2 + 12, q.options[i], {
          fontSize: '11px',
          color: '#ffffff',
          fontFamily: 'Arial',
          wordWrap: { width: spacing - 20 },
          align: 'center',
        })
        .setOrigin(0.5, 0);

      container.add([sprite, label]);
      this.blocks.push({ container, optionIndex: i });
    }
  }

  handleCatch(blockIndex) {
    const q = chapter2Questions[this.qIndex];
    const caught = this.blocks[blockIndex];
    const isCorrect = caught.optionIndex === q.correct_answer;

    if (isCorrect) {
      this.localScore += CORRECT_PTS;
      addScore(CORRECT_PTS);
      this.showFeedback('✓  Correct! +1', '#00ff88');
    } else {
      this.localScore += WRONG_PTS;
      addScore(WRONG_PTS);
      this.showFeedback('✗  Wrong! -3', '#e94560');
    }

    markAnswered(q.id);
    this.clearBlocks();
    this.updateScoreDisplay();

    this.qIndex++;
    this.time.delayedCall(1500, () => this.spawnQuestion());
  }

  handleMissed() {
    const q = chapter2Questions[this.qIndex];
    this.localScore += WRONG_PTS;
    addScore(WRONG_PTS);
    markAnswered(q.id);
    this.showFeedback('✗  Missed! -3', '#e94560');
    this.clearBlocks();
    this.updateScoreDisplay();

    this.qIndex++;
    this.time.delayedCall(1500, () => this.spawnQuestion());
  }

  clearBlocks() {
    this.answered = true;
    for (const b of this.blocks) b.container.destroy();
    this.blocks = [];
  }

  updateScoreDisplay() {
    const globalState = getState();
    this.scoreText.setText(`Score: ${globalState.score}`);
  }

  showFeedback(msg, color) {
    this.feedbackText.setText(msg).setColor(color).setVisible(true);
    if (this.feedbackTimer) this.feedbackTimer.remove();
    this.feedbackTimer = this.time.delayedCall(1200, () => {
      this.feedbackText.setVisible(false);
    });
  }

  catchTest(basket, container) {
    // AABB overlap between basket (120×60) and block center
    const bHalfW = 60;
    const bHalfH = 30;
    const cHalf = BLOCK_SIZE / 2;
    return (
      Math.abs(basket.x - container.x) < bHalfW + cHalf * 0.4 &&
      Math.abs(basket.y - container.y) < bHalfH + cHalf * 0.4
    );
  }

  /* ─── END SCREEN ─────────────────────────── */

  showEndScreen() {
    this.gameOver = true;
    this.answered = true;
    const { width, height } = this.scale;
    const globalState = getState();

    this.questionText.setVisible(false);
    this.feedbackText.setVisible(false);

    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setDepth(30);

    this.add
      .text(width / 2, height / 2 - 80, 'Chapter 2 Complete!', {
        fontSize: '36px',
        color: '#3FA7D6',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(width / 2, height / 2 - 20, `Chapter Score: ${this.localScore}`, {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(width / 2, height / 2 + 20, `Global Score: ${globalState.score}`, {
        fontSize: '22px',
        color: '#FAC748',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(width / 2, height / 2 + 70, 'Press ENTER for Chapter 3', {
        fontSize: '18px',
        color: '#888',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.start('Chapter3Scene');
    });
  }
}
