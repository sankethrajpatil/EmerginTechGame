import Phaser from 'phaser';
import { chapter3Questions } from './questions.js';
import { addScore, getState, markAnswered, setChapter } from '../../core/GameState.js';
import { showRules } from '../../ui/RulesOverlay.js';
import { addEscButton } from '../../ui/EscButton.js';

/* ─── constants ─────────────────────────────────────────── */
const FALL_SPEED = 80;           // slow descent speed
const MOVE_SPEED = 300;
const PLAYER_SIZE = 48;
const PLAT_W = 180;
const PLAT_H = 32;
const NUM_OPTIONS = 4;
const CORRECT_PTS = 1;
const WRONG_PTS = -3;
const PLAT_COLORS = ['EE6352', '59CD90', '3FA7D6', 'FAC748'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const READ_TIME = 3000;          // ms to read question before drop starts

export class Chapter3Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Chapter3Scene' });
  }

  /* ────────────────── INIT ────────────────── */
  init() {
    setChapter(3);
    this.qIndex = 0;
    this.localScore = 0;
    this.platforms = [];
    this.gameOver = false;
    this.answered = false;
    this.rulesShown = false;
    this.dropping = false;    // true once read-time expires and player falls
    this.feedbackTimer = null;
  }

  /* ────────────────── PRELOAD ─────────────── */
  preload() {
    this.load.image(
      'jumper',
      'https://api.dicebear.com/9.x/pixel-art/png?seed=jumper&size=48'
    );
    for (let i = 0; i < NUM_OPTIONS; i++) {
      this.load.image(
        `plat${i}`,
        `https://placehold.co/${PLAT_W}x${PLAT_H}/${PLAT_COLORS[i]}/ffffff/png?text=${OPTION_LETTERS[i]}`
      );
    }
  }

  /* ────────────────── CREATE ─────────────── */
  create() {
    const { width, height } = this.scale;

    // ── starfield background
    this.bgTiles = [];
    for (let i = 0; i < 100; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.4)
      );
      this.bgTiles.push(s);
    }

    // ── player (starts hidden — placed by spawnQuestion)
    this.player = this.add
      .image(width / 2, -50, 'jumper')
      .setDisplaySize(PLAYER_SIZE, PLAYER_SIZE)
      .setDepth(5)
      .setVisible(false);

    // ── HUD
    this.scoreText = this.add
      .text(16, 16, `Score: ${getState().score}`, {
        fontSize: '20px',
        color: '#3FA7D6',
        fontFamily: 'Arial',
      })
      .setDepth(10);

    this.questionText = this.add
      .text(width / 2, 50, '', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        wordWrap: { width: width - 60 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.readHint = this.add
      .text(width / 2, height / 2 - 30, '', {
        fontSize: '22px',
        color: '#FAC748',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);

    this.feedbackText = this.add
      .text(width / 2, height / 2, '', {
        fontSize: '28px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    this.chapterLabel = this.add
      .text(width - 16, 16, 'Ch.3 — NLP & Transformers', {
        fontSize: '14px',
        color: '#888',
        fontFamily: 'Arial',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // ── input
    this.cursors = this.input.keyboard.createCursorKeys();

    addEscButton(this);
    showRules(this, {
      title: 'Chapter 3 — Platform Jumper',
      mechanics: [
        'Read the question, then your character floats down from the top.',
        'Steer left/right to land on the correct answer platform!',
        'Wrong platforms break beneath you.',
      ],
      controls: [
        '← →  Steer left / right',
      ],
      scoring: [
        'Correct landing: +1 point',
        'Wrong landing: -3 points + platform breaks',
      ],
    }, () => {
      this.rulesShown = true;
      this.spawnQuestion();
    });
  }

  /* ────────────────── UPDATE ─────────────── */
  update(_time, delta) {
    if (this.gameOver || !this.rulesShown || !this.dropping) return;

    const { width, height } = this.scale;
    const dt = delta / 1000;

    // ── horizontal movement
    if (this.cursors.left.isDown) {
      this.player.x -= MOVE_SPEED * dt;
    } else if (this.cursors.right.isDown) {
      this.player.x += MOVE_SPEED * dt;
    }
    // clamp to screen
    this.player.x = Phaser.Math.Clamp(this.player.x, PLAYER_SIZE / 2, width - PLAYER_SIZE / 2);

    // ── slow fall
    this.player.y += FALL_SPEED * dt;

    // ── platform collision
    if (!this.answered) {
      for (let i = 0; i < this.platforms.length; i++) {
        const p = this.platforms[i];
        if (this.landTest(this.player, p.container)) {
          this.handleLand(i);
          return;
        }
      }
    }

    // ── fell past all platforms
    if (this.player.y > height + 40 && !this.answered) {
      this.handleFall();
    }

    // ── parallax stars
    for (const s of this.bgTiles) {
      s.y += 12 * dt;
      if (s.y > height + 10) {
        s.y = -10;
        s.x = Phaser.Math.Between(0, width);
      }
    }
  }

  /* ─── GAME LOGIC ─────────────────────────── */

  spawnQuestion() {
    if (this.qIndex >= chapter3Questions.length) {
      this.showEndScreen();
      return;
    }

    this.answered = false;
    this.dropping = false;
    const q = chapter3Questions[this.qIndex];
    this.questionText.setText(`Q${this.qIndex + 1}: ${q.question}`);

    // ── show platforms immediately so player can read options
    const { width, height } = this.scale;
    const platY = height - 100;
    const sectionW = width / NUM_OPTIONS;

    for (let i = 0; i < NUM_OPTIONS; i++) {
      const x = sectionW * i + sectionW / 2;
      const container = this.add.container(x, platY).setDepth(3);

      const sprite = this.add
        .image(0, 0, `plat${i}`)
        .setDisplaySize(PLAT_W, PLAT_H);

      const label = this.add
        .text(0, -PLAT_H / 2 - 14, q.options[i], {
          fontSize: '11px',
          color: '#ffffff',
          fontFamily: 'Arial',
          wordWrap: { width: PLAT_W - 10 },
          align: 'center',
          backgroundColor: '#00000088',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5, 1);

      container.add([sprite, label]);
      container.setAlpha(0);
      this.tweens.add({ targets: container, alpha: 1, duration: 400 });
      this.platforms.push({ container, optionIndex: i });
    }

    // ── countdown hint while player reads
    this.readHint.setVisible(true).setText('Read the question...');
    this.player.setVisible(false);

    this.time.delayedCall(READ_TIME, () => {
      this.readHint.setVisible(false);
      // place player at top-center, start falling
      this.player.setPosition(width / 2, 90).setVisible(true);
      this.dropping = true;
    });
  }

  landTest(player, container) {
    const px = player.x;
    const py = player.y + PLAYER_SIZE / 2; // player feet
    const platX = container.x;
    const platY = container.y;
    return (
      Math.abs(px - platX) < PLAT_W / 2 &&
      py >= platY - PLAT_H / 2 &&
      py <= platY + PLAT_H / 2 + 10
    );
  }

  handleLand(platIndex) {
    const q = chapter3Questions[this.qIndex];
    const landed = this.platforms[platIndex];
    const isCorrect = landed.optionIndex === q.correct_answer;

    if (isCorrect) {
      this.localScore += CORRECT_PTS;
      addScore(CORRECT_PTS);
      this.showFeedback('✓  Correct! +1', '#00ff88');

      this.player.y = landed.container.y - PLAT_H / 2 - PLAYER_SIZE / 2;
      this.dropping = false;
      this.answered = true;
      markAnswered(q.id);
      this.clearPlatforms();
      this.updateScoreDisplay();
      this.qIndex++;
      this.time.delayedCall(1200, () => this.spawnQuestion());
    } else {
      this.localScore += WRONG_PTS;
      addScore(WRONG_PTS);
      this.showFeedback('✗  Wrong! -3', '#e94560');

      // break the platform
      this.tweens.add({
        targets: landed.container,
        alpha: 0, y: landed.container.y + 60,
        duration: 300,
        onComplete: () => landed.container.destroy(),
      });
      this.platforms.splice(platIndex, 1);
      this.updateScoreDisplay();
    }
  }

  handleFall() {
    const q = chapter3Questions[this.qIndex];
    this.localScore += WRONG_PTS;
    addScore(WRONG_PTS);
    markAnswered(q.id);
    this.showFeedback('✗  Missed! -3', '#e94560');
    this.answered = true;
    this.dropping = false;
    this.clearPlatforms();
    this.updateScoreDisplay();

    this.qIndex++;
    this.time.delayedCall(1500, () => this.spawnQuestion());
  }

  clearPlatforms() {
    for (const p of this.platforms) p.container.destroy();
    this.platforms = [];
  }

  updateScoreDisplay() {
    this.scoreText.setText(`Score: ${getState().score}`);
  }

  showFeedback(msg, color) {
    this.feedbackText.setText(msg).setColor(color).setVisible(true);
    if (this.feedbackTimer) this.feedbackTimer.remove();
    this.feedbackTimer = this.time.delayedCall(1200, () => {
      this.feedbackText.setVisible(false);
    });
  }

  /* ─── END SCREEN ─────────────────────────── */

  showEndScreen() {
    this.gameOver = true;
    this.answered = true;
    this.dropping = false;
    const { width, height } = this.scale;
    const globalState = getState();

    this.questionText.setVisible(false);
    this.feedbackText.setVisible(false);
    this.player.setVisible(false);

    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setDepth(30);

    this.add
      .text(width / 2, height / 2 - 80, 'Chapter 3 Complete!', {
        fontSize: '36px',
        color: '#59CD90',
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
      .text(width / 2, height / 2 + 70, 'Press ENTER for Chapter 4', {
        fontSize: '18px',
        color: '#888',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.start('Chapter4Scene');
    });
  }
}
