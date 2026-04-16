import Phaser from 'phaser';
import { chapter6Questions } from './questions.js';
import { addScore, getState, markAnswered, setChapter } from '../../core/GameState.js';
import { showRules } from '../../ui/RulesOverlay.js';
import { addEscButton } from '../../ui/EscButton.js';

/* ─── constants ─────────────────────────────────────────── */
const CORRECT_PTS = 1;
const WRONG_PTS = -3;
const CLAW_SPEED = 300;
const DROP_SPEED = 400;
const RETRACT_SPEED = 350;
const BLOCK_SPEED = 80;
const COOLDOWN_MS = 1000;
const CLAW_SIZE = 56;
const BLOCK_W = 140;
const BLOCK_H = 70;
const RAIL_Y = 120;
const BLOCK_Y = 520;
const BLOCK_COLORS = ['EE6352', '59CD90', '3FA7D6', 'FAC748'];
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const CLAW_STATE = { IDLE: 0, DROPPING: 1, RETRACTING: 2 };

export class Chapter6Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Chapter6Scene' });
  }

  /* ────────────────── INIT ────────────────── */
  init() {
    setChapter(6);
    this.qIndex = 0;
    this.localScore = 0;
    this.blocks = [];
    this.clawState = CLAW_STATE.IDLE;
    this.grabbedBlock = null;
    this.gameOver = false;
    this.rulesShown = false;
    this.coolingDown = false;
    this.feedbackTimer = null;
  }

  /* ────────────────── PRELOAD ─────────────── */
  preload() {
    this.load.image(
      'claw',
      'https://api.dicebear.com/9.x/bottts/png?seed=clawMachine&size=56'
    );
    for (let i = 0; i < 4; i++) {
      this.load.image(
        `kblock${i}`,
        `https://placehold.co/${BLOCK_W}x${BLOCK_H}/${BLOCK_COLORS[i]}/ffffff/png?text=${OPTION_LETTERS[i]}`
      );
    }
  }

  /* ────────────────── CREATE ─────────────── */
  create() {
    const { width, height } = this.scale;

    // ── background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1b2a).setDepth(0);

    // ── claw machine casing outline
    this.add.rectangle(width / 2, height / 2, width - 40, height - 80, 0x1b2838)
      .setStrokeStyle(3, 0x415a77).setDepth(0);

    // ── rail
    this.add.rectangle(width / 2, RAIL_Y, width - 60, 6, 0x778da9).setDepth(1);

    // ── conveyor belt area
    this.add.rectangle(width / 2, BLOCK_Y, width - 60, BLOCK_H + 30, 0x1b2838)
      .setStrokeStyle(2, 0x415a77).setDepth(1);

    // ── rope graphics (drawn each frame)
    this.ropeGfx = this.add.graphics().setDepth(2);

    // ── claw sprite
    this.claw = this.add
      .image(width / 2, RAIL_Y + 20, 'claw')
      .setDisplaySize(CLAW_SIZE, CLAW_SIZE)
      .setDepth(5);
    this.clawRestY = RAIL_Y + 20;

    // ── HUD
    this.scoreText = this.add
      .text(16, 12, `Score: ${getState().score}`, {
        fontSize: '20px', color: '#3FA7D6', fontFamily: 'Arial',
      }).setDepth(10);

    this.questionText = this.add
      .text(width / 2, 20, '', {
        fontSize: '16px', color: '#ffffff', fontFamily: 'Arial',
        wordWrap: { width: width - 120 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(10);

    this.feedbackText = this.add
      .text(width / 2, height / 2, '', {
        fontSize: '28px', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(20).setVisible(false);

    this.chapterLabel = this.add
      .text(width - 16, 12, 'Ch.6 — RAG & Semantic Search', {
        fontSize: '14px', color: '#888', fontFamily: 'Arial',
      }).setOrigin(1, 0).setDepth(10);

    this.cooldownText = this.add
      .text(width / 2, RAIL_Y + 60, '⏳ Cooling down...', {
        fontSize: '16px', color: '#ff8800', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(10).setVisible(false);

    // ── input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    addEscButton(this);
    showRules(this, {
      title: 'Chapter 6 — Data Claw',
      mechanics: [
        'Move the claw and grab the correct knowledge block!',
        'Blocks slide back and forth on the conveyor.',
      ],
      controls: [
        '← →  Move claw left / right',
        'SPACE  Drop claw',
      ],
      scoring: [
        'Correct grab: +1 point',
        'Wrong grab: -3 points + 1s cooldown',
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
    const { width } = this.scale;

    // ── move claw left/right (only when idle)
    if (this.clawState === CLAW_STATE.IDLE && !this.coolingDown) {
      if (this.cursors.left.isDown) {
        this.claw.x = Math.max(50, this.claw.x - CLAW_SPEED * dt);
      } else if (this.cursors.right.isDown) {
        this.claw.x = Math.min(width - 50, this.claw.x + CLAW_SPEED * dt);
      }

      // drop
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.clawState = CLAW_STATE.DROPPING;
      }
    }

    // ── dropping
    if (this.clawState === CLAW_STATE.DROPPING) {
      this.claw.y += DROP_SPEED * dt;

      // check collision with blocks
      for (let i = 0; i < this.blocks.length; i++) {
        const b = this.blocks[i];
        if (this.grabTest(this.claw, b.sprite)) {
          this.grabbedBlock = b;
          this.clawState = CLAW_STATE.RETRACTING;
          break;
        }
      }

      // if claw went past blocks without grabbing anything → retract
      if (this.claw.y >= BLOCK_Y + BLOCK_H / 2 && this.clawState === CLAW_STATE.DROPPING) {
        this.clawState = CLAW_STATE.RETRACTING;
      }
    }

    // ── retracting
    if (this.clawState === CLAW_STATE.RETRACTING) {
      this.claw.y -= RETRACT_SPEED * dt;

      // carry grabbed block up
      if (this.grabbedBlock) {
        this.grabbedBlock.sprite.x = this.claw.x;
        this.grabbedBlock.sprite.y = this.claw.y + CLAW_SIZE / 2 + 10;
        this.grabbedBlock.label.x = this.claw.x;
        this.grabbedBlock.label.y = this.grabbedBlock.sprite.y + BLOCK_H / 2 + 8;
      }

      // reached rail → evaluate
      if (this.claw.y <= this.clawRestY) {
        this.claw.y = this.clawRestY;
        this.evaluateGrab();
      }
    }

    // ── move blocks back and forth (conveyor)
    for (const b of this.blocks) {
      if (b === this.grabbedBlock) continue;
      b.sprite.x += b.dir * BLOCK_SPEED * dt;
      b.label.x = b.sprite.x;

      // bounce off edges
      if (b.sprite.x <= BLOCK_W / 2 + 30) {
        b.sprite.x = BLOCK_W / 2 + 30;
        b.dir = 1;
      } else if (b.sprite.x >= width - BLOCK_W / 2 - 30) {
        b.sprite.x = width - BLOCK_W / 2 - 30;
        b.dir = -1;
      }
    }

    // ── draw rope
    this.ropeGfx.clear();
    this.ropeGfx.lineStyle(3, 0x778da9, 1);
    this.ropeGfx.beginPath();
    this.ropeGfx.moveTo(this.claw.x, RAIL_Y);
    this.ropeGfx.lineTo(this.claw.x, this.claw.y - CLAW_SIZE / 2 + 5);
    this.ropeGfx.strokePath();
  }

  /* ─── GAME LOGIC ─────────────────────────── */

  spawnQuestion() {
    if (this.qIndex >= chapter6Questions.length) {
      this.showEndScreen();
      return;
    }

    const q = chapter6Questions[this.qIndex];
    this.questionText.setText(`Q${this.qIndex + 1}: ${q.question}`);
    this.clawState = CLAW_STATE.IDLE;
    this.grabbedBlock = null;

    const { width } = this.scale;
    const spacing = (width - 80) / 4;

    for (let i = 0; i < 4; i++) {
      const x = 60 + spacing * i + spacing / 2;
      const sprite = this.add
        .image(x, BLOCK_Y, `kblock${i}`)
        .setDisplaySize(BLOCK_W, BLOCK_H)
        .setDepth(3);

      const label = this.add
        .text(x, BLOCK_Y + BLOCK_H / 2 + 8, q.options[i], {
          fontSize: '10px', color: '#e0e1dd', fontFamily: 'Arial',
          wordWrap: { width: BLOCK_W + 20 }, align: 'center',
        })
        .setOrigin(0.5, 0)
        .setDepth(3);

      this.blocks.push({
        sprite, label,
        optionIndex: i,
        dir: i % 2 === 0 ? 1 : -1,
      });
    }
  }

  grabTest(claw, blockSprite) {
    return (
      Math.abs(claw.x - blockSprite.x) < BLOCK_W / 2 &&
      Math.abs(claw.y - blockSprite.y) < BLOCK_H / 2 + CLAW_SIZE / 2
    );
  }

  evaluateGrab() {
    if (!this.grabbedBlock) {
      // missed all blocks — just reset
      this.clawState = CLAW_STATE.IDLE;
      return;
    }

    const q = chapter6Questions[this.qIndex];
    const isCorrect = this.grabbedBlock.optionIndex === q.correct_answer;

    if (isCorrect) {
      this.localScore += CORRECT_PTS;
      addScore(CORRECT_PTS);
      this.showFeedback('✓  Retrieved! +1', '#00ff88');
      markAnswered(q.id);

      // success flash
      this.tweens.add({
        targets: this.grabbedBlock.sprite,
        alpha: 0, scaleX: 1.5, scaleY: 1.5,
        duration: 300,
      });

      this.clearBlocks();
      this.updateScoreDisplay();
      this.qIndex++;
      this.time.delayedCall(1400, () => this.spawnQuestion());
    } else {
      this.localScore += WRONG_PTS;
      addScore(WRONG_PTS);
      this.showFeedback('✗  Wrong chunk! -3', '#e94560');
      this.updateScoreDisplay();

      // drop the block back down
      this.tweens.add({
        targets: this.grabbedBlock.sprite,
        y: BLOCK_Y,
        duration: 400,
        ease: 'Bounce.easeOut',
      });
      this.tweens.add({
        targets: this.grabbedBlock.label,
        y: BLOCK_Y + BLOCK_H / 2 + 8,
        duration: 400,
      });

      this.grabbedBlock = null;
      this.clawState = CLAW_STATE.IDLE;

      // cooldown
      this.coolingDown = true;
      this.cooldownText.setVisible(true);
      this.time.delayedCall(COOLDOWN_MS, () => {
        this.coolingDown = false;
        this.cooldownText.setVisible(false);
      });
    }
  }

  clearBlocks() {
    for (const b of this.blocks) {
      b.sprite.destroy();
      b.label.destroy();
    }
    this.blocks = [];
    this.grabbedBlock = null;
    this.clawState = CLAW_STATE.IDLE;
  }

  updateScoreDisplay() {
    this.scoreText.setText(`Score: ${getState().score}`);
  }

  showFeedback(msg, color) {
    this.feedbackText.setText(msg).setColor(color).setVisible(true);
    if (this.feedbackTimer) this.feedbackTimer.remove();
    this.feedbackTimer = this.time.delayedCall(1100, () => {
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
    this.ropeGfx.clear();

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(30);

    this.add
      .text(width / 2, height / 2 - 80, 'Chapter 6 Complete!', {
        fontSize: '36px', color: '#3FA7D6', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(31);

    this.add
      .text(width / 2, height / 2 - 20, `Chapter Score: ${this.localScore}`, {
        fontSize: '22px', color: '#ffffff', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(31);

    this.add
      .text(width / 2, height / 2 + 20, `Global Score: ${globalState.score}`, {
        fontSize: '22px', color: '#FAC748', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(31);

    this.add
      .text(width / 2, height / 2 + 70, 'Press ENTER for Chapter 7', {
        fontSize: '18px', color: '#888', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(31);

    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.start('Chapter7Scene');
    });
  }
}
