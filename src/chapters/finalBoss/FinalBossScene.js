import Phaser from 'phaser';
import { finalBossQuestions } from './questions.js';
import { addScore, getState, markAnswered, setChapter } from '../../core/GameState.js';
import { showRules } from '../../ui/RulesOverlay.js';
import { addEscButton } from '../../ui/EscButton.js';

/* ─── constants ─────────────────────────────────────────── */
const CORRECT_PTS = 2;
const WRONG_PTS = -5;
const BOSS_HP = 7;
const PLAYER_SPEED = 320;
const BULLET_SPEED = 400;
const MISSILE_SPEED = 70;
const MISSILE_TRACK_FACTOR = 0.6;
const SHAKE_DURATION = 300;
const SPAWN_DELAY = 1200;
const MISSILE_SIZE = 48;

/* Boss state machine */
const PHASE = {
  INTRO: 'INTRO',
  QUESTION: 'QUESTION',
  ATTACKING: 'ATTACKING',
  HIT: 'HIT',
  DEFEATED: 'DEFEATED',
};

export class FinalBossScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FinalBossScene' });
  }

  /* ────────────── INIT ────────────── */
  init() {
    setChapter(8);
    this.qIndex = 0;
    this.localScore = 0;
    this.bossHP = BOSS_HP;
    this.phase = PHASE.INTRO;
    this.missiles = [];
    this.bullets = [];
    this.gameOver = false;
    this.rulesShown = false;
  }

  /* ────────────── PRELOAD ─────────── */
  preload() {
    this.load.image(
      'boss',
      'https://robohash.org/masterAI?set=set1&size=200x200'
    );
    this.load.image(
      'bossPlayer',
      'https://api.dicebear.com/9.x/bottts/png?seed=heroPlayer&size=48'
    );
    for (let i = 0; i < 4; i++) {
      this.load.image(
        `missile${i}`,
        `https://robohash.org/missile${i}?set=set2&size=${MISSILE_SIZE}x${MISSILE_SIZE}`
      );
    }
  }

  /* ────────────── CREATE ─────────── */
  create() {
    const { width, height } = this.scale;

    // dark arena background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0b0c10).setDepth(0);
    // subtle grid lines
    const gridGfx = this.add.graphics().setDepth(0).setAlpha(0.08);
    gridGfx.lineStyle(1, 0x3fa7d6);
    for (let x = 0; x < width; x += 60) {
      gridGfx.moveTo(x, 0); gridGfx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 60) {
      gridGfx.moveTo(0, y); gridGfx.lineTo(width, y);
    }
    gridGfx.strokePath();

    // ── Boss
    this.boss = this.add.image(width / 2, 100, 'boss')
      .setDisplaySize(160, 160).setDepth(5);

    // ── Boss health bar
    this.hpBarBg = this.add.rectangle(width / 2, 200, 320, 22, 0x333333)
      .setStrokeStyle(2, 0x888888).setDepth(6);
    this.hpBarFill = this.add.rectangle(
      width / 2 - 156, 200, 312, 16, 0xe94560
    ).setOrigin(0, 0.5).setDepth(7);
    this.hpLabel = this.add.text(width / 2, 200, `${this.bossHP} / ${BOSS_HP}`, {
      fontSize: '13px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(8);

    // ── Player
    this.player = this.add.image(width / 2, height - 60, 'bossPlayer')
      .setDisplaySize(44, 44).setDepth(5);

    // ── HUD
    this.scoreText = this.add.text(16, 12, `Score: ${getState().score}`, {
      fontSize: '20px', color: '#3FA7D6', fontFamily: 'Arial',
    }).setDepth(10);

    this.questionText = this.add.text(width / 2, 230, '', {
      fontSize: '15px', color: '#ffffff', fontFamily: 'Arial',
      wordWrap: { width: width - 100 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(10);

    this.feedbackText = this.add.text(width / 2, height / 2, '', {
      fontSize: '28px', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    this.bossLabel = this.add.text(width / 2, 30, 'THE MASTER ALGORITHM', {
      fontSize: '14px', color: '#e94560', fontFamily: 'Arial', fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(10);

    // bullet graphics pool
    this.bulletGfx = this.add.graphics().setDepth(9);

    // ── Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    addEscButton(this);
    showRules(this, {
      title: 'FINAL BOSS — The Master Algorithm',
      mechanics: [
        '7 questions from every chapter. Defeat the boss!',
        'The boss launches 4 Data Missiles — shoot the correct one.',
        'If all missiles pass you, the wave respawns.',
      ],
      controls: [
        '← →  Move your ship',
        'SPACE  Fire bullet upward',
      ],
      scoring: [
        'Correct hit: +2 points, boss takes 1 damage',
        'Wrong hit or miss: -5 points, wave respawns',
        'Deplete all 7 HP to win!',
      ],
    }, () => {
      this.rulesShown = true;
      this.startIntro();
    });
  }

  /* ────────────── UPDATE ─────────── */
  update(_time, delta) {
    if (this.gameOver || !this.rulesShown) return;
    const dt = delta / 1000;
    const { width, height } = this.scale;

    // ── Player movement (always available during ATTACKING)
    if (this.phase === PHASE.ATTACKING) {
      if (this.cursors.left.isDown) {
        this.player.x = Math.max(24, this.player.x - PLAYER_SPEED * dt);
      } else if (this.cursors.right.isDown) {
        this.player.x = Math.min(width - 24, this.player.x + PLAYER_SPEED * dt);
      }

      // fire bullet
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.fireBullet();
      }
    }

    // ── Move missiles (track toward player)
    for (const m of this.missiles) {
      if (m.destroyed) continue;
      const dx = this.player.x - m.sprite.x;
      const dy = this.player.y - m.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        m.sprite.x += (dx / dist) * MISSILE_TRACK_FACTOR * MISSILE_SPEED * dt
          + (m.baseVx * dt);
        m.sprite.y += MISSILE_SPEED * dt;
      }
      m.label.x = m.sprite.x;
      m.label.y = m.sprite.y + MISSILE_SIZE / 2 + 6;

      // missile reached bottom
      if (m.sprite.y > height + 30) {
        m.destroyed = true;
        m.sprite.destroy();
        m.label.destroy();
      }
    }

    // ── All missiles gone while attacking → player missed, respawn wave
    if (this.phase === PHASE.ATTACKING) {
      const alive = this.missiles.filter(m => !m.destroyed);
      if (alive.length === 0) {
        this.missiles = [];
        this.localScore += WRONG_PTS;
        addScore(WRONG_PTS);
        this.showFeedback('✗  Missed all! -5', '#e94560');
        this.updateScoreDisplay();
        this.cameras.main.shake(SHAKE_DURATION, 0.01);
        this.time.delayedCall(1400, () => {
          this.phase = PHASE.QUESTION;
          this.time.delayedCall(SPAWN_DELAY, () => {
            this.spawnMissiles(finalBossQuestions[this.qIndex]);
            this.phase = PHASE.ATTACKING;
          });
        });
      }
    }

    // ── Move bullets upward & check collisions
    this.bulletGfx.clear();
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.y -= BULLET_SPEED * dt;
      if (b.y < 0) {
        this.bullets.splice(i, 1);
        continue;
      }

      // draw bullet
      this.bulletGfx.fillStyle(0x00ff88, 1);
      this.bulletGfx.fillCircle(b.x, b.y, 5);

      // check collision with missiles
      for (const m of this.missiles) {
        if (m.destroyed) continue;
        if (
          Math.abs(b.x - m.sprite.x) < MISSILE_SIZE / 2 + 5 &&
          Math.abs(b.y - m.sprite.y) < MISSILE_SIZE / 2 + 5
        ) {
          // hit!
          this.bullets.splice(i, 1);
          this.handleMissileHit(m);
          break;
        }
      }
    }

    // ── Clean destroyed missiles
    this.missiles = this.missiles.filter(m => !m.destroyed);
  }

  /* ─── STATE MACHINE ───────────────── */

  startIntro() {
    this.phase = PHASE.INTRO;
    // boss entrance tween
    this.boss.setAlpha(0).setScale(0.3);
    this.tweens.add({
      targets: this.boss,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 1200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(600, () => this.nextQuestion());
      },
    });
  }

  nextQuestion() {
    if (this.bossHP <= 0) {
      this.enterDefeated();
      return;
    }
    if (this.qIndex >= finalBossQuestions.length) {
      this.enterDefeated();
      return;
    }
    this.phase = PHASE.QUESTION;
    const q = finalBossQuestions[this.qIndex];
    this.questionText.setText(`[${this.qIndex + 1}/${BOSS_HP}]  ${q.question}`);

    // spawn missiles after delay
    this.time.delayedCall(SPAWN_DELAY, () => {
      this.spawnMissiles(q);
      this.phase = PHASE.ATTACKING;
    });
  }

  spawnMissiles(q) {
    const { width } = this.scale;
    const spacing = width / 5;

    for (let i = 0; i < 4; i++) {
      const x = spacing * (i + 1);
      const sprite = this.add.image(x, 80, `missile${i}`)
        .setDisplaySize(MISSILE_SIZE, MISSILE_SIZE).setDepth(6);

      const label = this.add.text(x, 80 + MISSILE_SIZE / 2 + 6, q.options[i], {
        fontSize: '9px', color: '#e0e1dd', fontFamily: 'Arial',
        wordWrap: { width: MISSILE_SIZE + 50 }, align: 'center',
        backgroundColor: '#000000aa', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 0).setDepth(6);

      this.missiles.push({
        sprite, label,
        optionIndex: i,
        destroyed: false,
        baseVx: (i - 1.5) * 15,
      });
    }
  }

  handleMissileHit(missile) {
    const q = finalBossQuestions[this.qIndex];
    const isCorrect = missile.optionIndex === q.correct_answer;

    // destroy all missiles for this wave
    for (const m of this.missiles) {
      if (!m.destroyed) {
        m.destroyed = true;
        m.sprite.destroy();
        m.label.destroy();
      }
    }
    this.missiles = [];

    if (isCorrect) {
      this.phase = PHASE.HIT;
      this.bossHP--;
      this.localScore += CORRECT_PTS;
      addScore(CORRECT_PTS);
      markAnswered(q.id);
      this.showFeedback('✓  Critical Hit! +2', '#00ff88');
      this.updateHP();
      this.updateScoreDisplay();

      // boss damage flash
      this.boss.setTint(0xff0000);
      this.time.delayedCall(300, () => { this.boss.clearTint(); });
      // boss shake
      this.tweens.add({
        targets: this.boss,
        x: this.boss.x + 10,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.boss.x = this.scale.width / 2;
        },
      });

      this.qIndex++;
      this.time.delayedCall(1600, () => this.nextQuestion());
    } else {
      this.localScore += WRONG_PTS;
      addScore(WRONG_PTS);
      this.showFeedback('✗  Blocked! -5', '#e94560');
      this.updateScoreDisplay();

      // screen shake
      this.cameras.main.shake(SHAKE_DURATION, 0.01);

      // respawn same question
      this.time.delayedCall(1400, () => {
        this.phase = PHASE.QUESTION;
        this.time.delayedCall(SPAWN_DELAY, () => {
          this.spawnMissiles(finalBossQuestions[this.qIndex]);
          this.phase = PHASE.ATTACKING;
        });
      });
    }
  }

  enterDefeated() {
    this.phase = PHASE.DEFEATED;
    this.gameOver = true;

    // boss explosion
    this.tweens.add({
      targets: this.boss,
      scaleX: 2, scaleY: 2, alpha: 0, angle: 360,
      duration: 1200,
      ease: 'Power2',
    });

    this.time.delayedCall(1500, () => this.showVictoryScreen());
  }

  /* ─── HELPER METHODS ──────────────── */

  fireBullet() {
    this.bullets.push({ x: this.player.x, y: this.player.y - 24 });
  }

  updateHP() {
    const pct = this.bossHP / BOSS_HP;
    this.hpBarFill.setDisplaySize(312 * pct, 16);
    this.hpLabel.setText(`${this.bossHP} / ${BOSS_HP}`);
    if (pct <= 0.3) this.hpBarFill.setFillStyle(0xff4444);
    else if (pct <= 0.5) this.hpBarFill.setFillStyle(0xfac748);
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

  /* ─── VICTORY SCREEN ──────────────── */

  showVictoryScreen() {
    const { width, height } = this.scale;
    const globalState = getState();

    this.questionText.setVisible(false);
    this.feedbackText.setVisible(false);
    this.bulletGfx.clear();
    this.hpBarBg.setVisible(false);
    this.hpBarFill.setVisible(false);
    this.hpLabel.setVisible(false);
    this.bossLabel.setVisible(false);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setDepth(30);

    // victory title
    const title = this.add.text(width / 2, height / 2 - 120, '🏆  VICTORY!  🏆', {
      fontSize: '42px', color: '#FAC748', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.tweens.add({
      targets: title, scaleX: 1.05, scaleY: 1.05,
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.add.text(width / 2, height / 2 - 60, 'The Master Algorithm has been defeated!', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height / 2, `Boss Fight Score: ${this.localScore}`, {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height / 2 + 40, `Final Cumulative Score: ${globalState.score}`, {
      fontSize: '26px', color: '#FAC748', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    // grade
    const score = globalState.score;
    let grade = 'F';
    if (score >= 25) grade = 'S';
    else if (score >= 20) grade = 'A';
    else if (score >= 15) grade = 'B';
    else if (score >= 10) grade = 'C';
    else if (score >= 5) grade = 'D';

    this.add.text(width / 2, height / 2 + 90, `Grade: ${grade}`, {
      fontSize: '36px', color: grade === 'S' ? '#FAC748' : '#3FA7D6',
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height / 2 + 140, 'Press ENTER to return to Home', {
      fontSize: '16px', color: '#888', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(31);

    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.start('HomeScene');
    });
  }
}
