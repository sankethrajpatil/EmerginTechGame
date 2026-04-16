import Phaser from 'phaser';
import { chapter3Questions } from './questions.js';
import { addScore, getState, markAnswered, setChapter } from '../../core/GameState.js';
import { showRules } from '../../ui/RulesOverlay.js';
import { addEscButton } from '../../ui/EscButton.js';

/* ─── constants ─────────────────────────────────────────── */
const GRAVITY = 600;
const JUMP_VELOCITY = -480;
const MOVE_SPEED = 300;
const PLAYER_SIZE = 48;
const PLAT_W = 160;
const PLAT_H = 32;
const NUM_OPTIONS = 4;
const CORRECT_PTS = 1;
const WRONG_PTS = -3;
const PLAT_COLORS = ['EE6352', '59CD90', '3FA7D6', 'FAC748'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

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
    this.playerVY = 0;
    this.gameOver = false;
    this.answered = false;
    this.rulesShown = false;
    this.cameraY = 0;
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

    // ── gradient-style background
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

    // ── starting platform (floor)
    this.floor = this.add
      .rectangle(width / 2, height - 16, width, 32, 0x444466)
      .setDepth(2);

    // ── player
    this.player = this.add
      .image(width / 2, height - 60, 'jumper')
      .setDisplaySize(PLAYER_SIZE, PLAYER_SIZE)
      .setDepth(5);
    this.playerVY = JUMP_VELOCITY; // initial bounce

    // ── HUD (fixed to camera via setScrollFactor)
    this.scoreText = this.add
      .text(16, 16, `Score: ${getState().score}`, {
        fontSize: '20px',
        color: '#3FA7D6',
        fontFamily: 'Arial',
      })
      .setDepth(10)
      .setScrollFactor(0);

    this.questionText = this.add
      .text(width / 2, 40, '', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Arial',
        wordWrap: { width: width - 60 },
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(10)
      .setScrollFactor(0);

    this.feedbackText = this.add
      .text(width / 2, height / 2, '', {
        fontSize: '28px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setScrollFactor(0)
      .setVisible(false);

    this.chapterLabel = this.add
      .text(width - 16, 16, 'Ch.3 — NLP & Transformers', {
        fontSize: '14px',
        color: '#888',
        fontFamily: 'Arial',
      })
      .setOrigin(1, 0)
      .setDepth(10)
      .setScrollFactor(0);

    // ── input
    this.cursors = this.input.keyboard.createCursorKeys();

    addEscButton(this);
    showRules(this, {
      title: 'Chapter 3 — Platform Jumper',
      mechanics: [
        'Your character auto-bounces upward — steer to land on the correct platform!',
        '4 answer platforms appear in a row above you.',
        'Wrong platforms break and you fall through.',
      ],
      controls: [
        '← →  Steer left / right (wraps around edges)',
      ],
      scoring: [
        'Correct landing: +1 point + boost',
        'Wrong landing: -3 points + platform breaks',
      ],
    }, () => {
      this.rulesShown = true;
      this.spawnPlatforms();
    });
  }

  /* ────────────────── UPDATE ─────────────── */
  update(_time, delta) {
    if (this.gameOver || !this.rulesShown) return;

    const { width, height } = this.scale;
    const dt = delta / 1000;

    // ── horizontal movement with screen wrap
    if (this.cursors.left.isDown) {
      this.player.x -= MOVE_SPEED * dt;
    } else if (this.cursors.right.isDown) {
      this.player.x += MOVE_SPEED * dt;
    }
    // wrap around
    if (this.player.x < -PLAYER_SIZE / 2) this.player.x = width + PLAYER_SIZE / 2;
    if (this.player.x > width + PLAYER_SIZE / 2) this.player.x = -PLAYER_SIZE / 2;

    // ── gravity
    this.playerVY += GRAVITY * dt;
    this.player.y += this.playerVY * dt;

    // ── floor bounce (only at start / after fall reset)
    if (this.player.y >= height - 44 && this.playerVY > 0) {
      this.player.y = height - 44;
      this.playerVY = JUMP_VELOCITY;
    }

    // ── platform collision (only when falling)
    if (this.playerVY > 0 && !this.answered) {
      for (let i = 0; i < this.platforms.length; i++) {
        const p = this.platforms[i];
        if (this.landTest(this.player, p.container)) {
          this.handleLand(i);
          return;
        }
      }
    }

    // ── camera follow (smooth upward scroll)
    const targetCamY = this.player.y - height * 0.4;
    if (targetCamY < this.cameras.main.scrollY) {
      this.cameras.main.scrollY = targetCamY;
    }

    // ── fell too far below camera → missed
    if (this.player.y > this.cameras.main.scrollY + height + 80 && !this.answered) {
      this.handleFall();
    }

    // ── parallax stars
    for (const s of this.bgTiles) {
      s.y += 8 * dt;
      if (s.y > this.cameras.main.scrollY + height + 10) {
        s.y = this.cameras.main.scrollY - 10;
        s.x = Phaser.Math.Between(0, width);
      }
    }
  }

  /* ─── GAME LOGIC ─────────────────────────── */

  spawnPlatforms() {
    if (this.qIndex >= chapter3Questions.length) {
      this.showEndScreen();
      return;
    }

    this.answered = false;
    const q = chapter3Questions[this.qIndex];
    this.questionText.setText(`Q${this.qIndex + 1}: ${q.question}`);

    const { width } = this.scale;
    // place platforms in a horizontal row at the same reachable height
    const baseY = this.player.y - 120;
    const sectionW = width / NUM_OPTIONS;

    for (let i = 0; i < NUM_OPTIONS; i++) {
      const x = sectionW * i + sectionW / 2;
      const y = baseY + Phaser.Math.Between(-10, 10);
      const container = this.add.container(x, y).setDepth(3);

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
      this.platforms.push({ container, optionIndex: i });
    }
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

      // bounce the player up from this platform
      this.player.y = landed.container.y - PLAT_H / 2 - PLAYER_SIZE / 2;
      this.playerVY = JUMP_VELOCITY * 1.3; // extra boost

      this.answered = true;
      markAnswered(q.id);
      this.clearPlatforms();
      this.updateScoreDisplay();
      this.qIndex++;
      this.time.delayedCall(1200, () => this.spawnPlatforms());
    } else {
      this.localScore += WRONG_PTS;
      addScore(WRONG_PTS);
      this.showFeedback('✗  Wrong! -3', '#e94560');

      // break the platform — tween it away
      this.tweens.add({
        targets: landed.container,
        alpha: 0,
        y: landed.container.y + 60,
        duration: 300,
        onComplete: () => landed.container.destroy(),
      });
      this.platforms.splice(platIndex, 1);
      this.updateScoreDisplay();

      // player falls through — don't mark answered; let them try remaining platforms
    }
  }

  handleFall() {
    const q = chapter3Questions[this.qIndex];
    this.localScore += WRONG_PTS;
    addScore(WRONG_PTS);
    markAnswered(q.id);
    this.showFeedback('✗  Fell! -3', '#e94560');
    this.answered = true;
    this.clearPlatforms();
    this.updateScoreDisplay();

    // reset player position to a ground level relative to camera
    const { height } = this.scale;
    this.player.y = this.cameras.main.scrollY + height - 60;
    this.playerVY = JUMP_VELOCITY;

    this.qIndex++;
    this.time.delayedCall(1500, () => this.spawnPlatforms());
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
    const { width, height } = this.scale;
    const globalState = getState();

    this.questionText.setVisible(false);
    this.feedbackText.setVisible(false);

    const camMid = this.cameras.main.scrollY + height / 2;

    this.add
      .rectangle(width / 2, camMid, width, height, 0x000000, 0.75)
      .setDepth(30);

    this.add
      .text(width / 2, camMid - 80, 'Chapter 3 Complete!', {
        fontSize: '36px',
        color: '#59CD90',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(width / 2, camMid - 20, `Chapter Score: ${this.localScore}`, {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(width / 2, camMid + 20, `Global Score: ${globalState.score}`, {
        fontSize: '22px',
        color: '#FAC748',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(width / 2, camMid + 70, 'Press ENTER for Chapter 4', {
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
