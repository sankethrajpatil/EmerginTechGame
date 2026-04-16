import Phaser from 'phaser';
import { chapter1Questions } from './questions.js';
import { addScore, getState, markAnswered, setChapter } from '../../core/GameState.js';
import { showRules } from '../../ui/RulesOverlay.js';
import { addEscButton } from '../../ui/EscButton.js';

/* ─── constants ─────────────────────────────────────────── */
const SHIP_SPEED = 400;
const BULLET_SPEED = -450;
const ENEMY_SPEED = 40;
const ENEMY_COLS = 4;
const ENEMY_SIZE = 64;
const BULLET_W = 6;
const BULLET_H = 18;
const CORRECT_PTS = 1;
const WRONG_PTS = -3;

export class Chapter1Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Chapter1Scene' });
  }

  /* ────────────────── INIT ────────────────── */
  init() {
    setChapter(1);
    this.qIndex = 0;
    this.localScore = 0;
    this.enemies = [];
    this.bullets = [];
    this.canShoot = true;
    this.gameOver = false;
    this.rulesShown = false;
    this.feedbackTimer = null;
  }

  /* ────────────────── PRELOAD ─────────────── */
  preload() {
    // Player avatar via DiceBear (pixel-art style)
    this.load.image(
      'player',
      'https://api.dicebear.com/9.x/bottts/png?seed=spacePlayer&size=64'
    );

    // Enemy avatars via RoboHash
    for (let i = 0; i < ENEMY_COLS; i++) {
      this.load.image(
        `enemy${i}`,
        `https://robohash.org/enemy${i}.png?size=64x64&set=set2`
      );
    }
  }

  /* ────────────────── CREATE ─────────────── */
  create() {
    const { width, height } = this.scale;

    // ── starfield background
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.2, 0.7)
      );
      this.stars.push(s);
    }

    // ── HUD
    this.scoreText = this.add
      .text(16, 16, 'Score: 0', {
        fontSize: '20px',
        color: '#00d2ff',
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
      .text(width - 16, 16, 'Ch.1 — AI & ML Foundations', {
        fontSize: '14px',
        color: '#888',
        fontFamily: 'Arial',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    // ── player ship
    this.player = this.add
      .image(width / 2, height - 60, 'player')
      .setDisplaySize(56, 56)
      .setDepth(5);

    addEscButton(this);

    // ── input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // ── show rules before starting
    showRules(this, {
      title: 'Chapter 1 — Spaceship Shooter',
      mechanics: [
        'Shoot the enemy carrying the correct answer!',
        'Enemies drift down — don\'t let them pass!',
      ],
      controls: [
        '← →  Move ship left / right',
        'SPACE  Fire bullet',
      ],
      scoring: [
        'Correct hit: +1 point',
        'Wrong hit or timeout: -3 points',
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
      s.y += 30 * dt;
      if (s.y > height) {
        s.y = 0;
        s.x = Phaser.Math.Between(0, width);
      }
    }

    // ── player movement
    if (this.cursors.left.isDown) {
      this.player.x = Math.max(28, this.player.x - SHIP_SPEED * dt);
    } else if (this.cursors.right.isDown) {
      this.player.x = Math.min(width - 28, this.player.x + SHIP_SPEED * dt);
    }

    // ── shooting
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.canShoot) {
      this.fireBullet();
    }

    // ── move bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y += BULLET_SPEED * dt;
      if (b.y < -20) {
        b.destroy();
        this.bullets.splice(i, 1);
      }
    }

    // ── move enemies down
    for (const e of this.enemies) {
      e.container.y += ENEMY_SPEED * dt;

      // if enemy passes bottom → wrong answer by timeout
      if (e.container.y > height + 40) {
        this.handleAllMissed();
        return;
      }
    }

    // ── collision: bullet ↔ enemy
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (this.hitTest(b, e.container, ENEMY_SIZE)) {
          b.destroy();
          this.bullets.splice(bi, 1);
          this.handleHit(ei);
          return; // process one hit per frame
        }
      }
    }
  }

  /* ─── GAME LOGIC ─────────────────────────── */

  spawnQuestion() {
    if (this.qIndex >= chapter1Questions.length) {
      this.showEndScreen();
      return;
    }

    const q = chapter1Questions[this.qIndex];
    this.questionText.setText(`Q${this.qIndex + 1}: ${q.question}`);
    this.canShoot = true;

    const { width } = this.scale;
    const spacing = width / (ENEMY_COLS + 1);
    const startY = 110;

    for (let i = 0; i < ENEMY_COLS; i++) {
      const x = spacing * (i + 1);
      const container = this.add.container(x, startY).setDepth(5);

      // enemy sprite
      const sprite = this.add
        .image(0, 0, `enemy${i}`)
        .setDisplaySize(ENEMY_SIZE, ENEMY_SIZE);

      // option label below the enemy
      const label = this.add
        .text(0, ENEMY_SIZE / 2 + 10, q.options[i], {
          fontSize: '12px',
          color: '#ffdd57',
          fontFamily: 'Arial',
          wordWrap: { width: spacing - 20 },
          align: 'center',
        })
        .setOrigin(0.5, 0);

      container.add([sprite, label]);
      this.enemies.push({ container, optionIndex: i });
    }
  }

  fireBullet() {
    const b = this.add
      .rectangle(
        this.player.x,
        this.player.y - 30,
        BULLET_W,
        BULLET_H,
        0x00d2ff
      )
      .setDepth(4);
    this.bullets.push(b);
  }

  handleHit(enemyIndex) {
    const q = chapter1Questions[this.qIndex];
    const hit = this.enemies[enemyIndex];
    const isCorrect = hit.optionIndex === q.correct_answer;

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
    this.clearEnemies();
    this.scoreText.setText(`Score: ${getState().score}`);

    this.qIndex++;
    this.time.delayedCall(1500, () => this.spawnQuestion());
  }

  handleAllMissed() {
    const q = chapter1Questions[this.qIndex];
    this.localScore += WRONG_PTS;
    addScore(WRONG_PTS);
    markAnswered(q.id);
    this.showFeedback('✗  Too slow! -3', '#e94560');
    this.clearEnemies();
    this.scoreText.setText(`Score: ${getState().score}`);

    this.qIndex++;
    this.time.delayedCall(1500, () => this.spawnQuestion());
  }

  clearEnemies() {
    this.canShoot = false;
    for (const e of this.enemies) e.container.destroy();
    this.enemies = [];
    // also destroy stray bullets
    for (const b of this.bullets) b.destroy();
    this.bullets = [];
  }

  showFeedback(msg, color) {
    this.feedbackText.setText(msg).setColor(color).setVisible(true);
    if (this.feedbackTimer) this.feedbackTimer.remove();
    this.feedbackTimer = this.time.delayedCall(1200, () => {
      this.feedbackText.setVisible(false);
    });
  }

  hitTest(bullet, container, size) {
    const half = size / 2;
    return (
      Math.abs(bullet.x - container.x) < half &&
      Math.abs(bullet.y - container.y) < half
    );
  }

  /* ─── END SCREEN ─────────────────────────── */

  showEndScreen() {
    this.gameOver = true;
    this.canShoot = false;
    const { width, height } = this.scale;

    this.questionText.setVisible(false);
    this.feedbackText.setVisible(false);

    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setDepth(30);

    this.add
      .text(width / 2, height / 2 - 60, 'Chapter 1 Complete!', {
        fontSize: '36px',
        color: '#00d2ff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(width / 2, height / 2 - 10, `Chapter Score: ${this.localScore}`, {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(width / 2, height / 2 + 25, `Global Score: ${getState().score}`, {
        fontSize: '22px',
        color: '#FAC748',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.add
      .text(width / 2, height / 2 + 70, 'Press ENTER for Chapter 2', {
        fontSize: '18px',
        color: '#888',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5)
      .setDepth(31);

    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.start('Chapter2Scene');
    });
  }
}
