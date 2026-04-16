import Phaser from 'phaser';
import { chapter7Questions } from './questions.js';
import { addScore, getState, markAnswered, setChapter } from '../../core/GameState.js';
import { showRules } from '../../ui/RulesOverlay.js';
import { addEscButton } from '../../ui/EscButton.js';

/* ─── constants ─────────────────────────────────────────── */
const CORRECT_PTS = 1;
const WRONG_PTS = -3;
const BELT_SPEED = 120;
const STAMPER_SPEED = 350;
const NODE_SIZE = 64;
const NODE_SPACING = 220;
const BELT_Y = 420;
const STAMPER_Y = 300;
const ERROR_FLASH_MS = 600;
const STAMP_COOLDOWN = 400;

export class Chapter7Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Chapter7Scene' });
  }

  /* ────────────── INIT ────────────── */
  init() {
    setChapter(7);
    this.qIndex = 0;
    this.localScore = 0;
    this.nodes = [];
    this.gameOver = false;
    this.rulesShown = false;
    this.canStamp = true;
  }

  /* ────────────── PRELOAD ─────────── */
  preload() {
    for (let i = 0; i < 4; i++) {
      this.load.image(
        `agent${i}`,
        `https://api.dicebear.com/9.x/bottts/png?seed=agentNode${i}&size=64`
      );
    }
    this.load.image(
      'stamper',
      'https://api.dicebear.com/9.x/bottts/png?seed=dataStamper&size=48'
    );
  }

  /* ────────────── CREATE ─────────── */
  create() {
    const { width, height } = this.scale;

    // background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a1628).setDepth(0);

    // conveyor belt visual
    this.add.rectangle(width / 2, BELT_Y, width, 90, 0x1c2e4a)
      .setStrokeStyle(2, 0x3d5a80).setDepth(1);
    // belt stripes
    for (let x = 0; x < width; x += 40) {
      this.add.rectangle(x, BELT_Y, 2, 90, 0x3d5a80, 0.3).setDepth(1);
    }

    // stamper sprite
    this.stamper = this.add
      .image(width / 2, STAMPER_Y, 'stamper')
      .setDisplaySize(48, 48)
      .setDepth(5);

    // stamper arm graphics
    this.armGfx = this.add.graphics().setDepth(4);

    // stamper label
    this.add.text(width / 2, STAMPER_Y - 40, '▼ ROUTER ▼', {
      fontSize: '12px', color: '#3d5a80', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(5);

    // error flash overlay
    this.errorOverlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0xff0000, 0)
      .setDepth(25);

    // HUD
    this.scoreText = this.add.text(16, 12, `Score: ${getState().score}`, {
      fontSize: '20px', color: '#3FA7D6', fontFamily: 'Arial',
    }).setDepth(10);

    this.questionText = this.add.text(width / 2, 30, '', {
      fontSize: '16px', color: '#ffffff', fontFamily: 'Arial',
      wordWrap: { width: width - 80 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(10);

    this.feedbackText = this.add.text(width / 2, height / 2, '', {
      fontSize: '28px', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    this.chapterLabel = this.add.text(width - 16, 12, 'Ch.7 — Agents & Observability', {
      fontSize: '14px', color: '#888', fontFamily: 'Arial',
    }).setOrigin(1, 0).setDepth(10);

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    addEscButton(this);
    showRules(this, {
      title: 'Chapter 7 — Workflow Sorter',
      mechanics: [
        'Agent Nodes move along the conveyor belt.',
        'Stamp the node carrying the correct answer!',
      ],
      controls: [
        '← →  Move router left / right',
        'SPACE  Stamp the node below',
      ],
      scoring: [
        'Correct stamp: +1 point',
        'Wrong stamp: -3 points + red flash',
      ],
    }, () => {
      this.rulesShown = true;
      this.spawnQuestion();
    });
  }

  /* ────────────── UPDATE ────────────── */
  update(_time, delta) {
    if (this.gameOver || !this.rulesShown) return;
    const dt = delta / 1000;
    const { width } = this.scale;

    // move stamper
    if (this.cursors.left.isDown) {
      this.stamper.x = Math.max(30, this.stamper.x - STAMPER_SPEED * dt);
    } else if (this.cursors.right.isDown) {
      this.stamper.x = Math.min(width - 30, this.stamper.x + STAMPER_SPEED * dt);
    }

    // move nodes along belt (right → left)
    for (const n of this.nodes) {
      n.sprite.x -= BELT_SPEED * dt;
      n.label.x = n.sprite.x;

      // wrap around when off-screen left
      if (n.sprite.x < -NODE_SIZE) {
        n.sprite.x = width + NODE_SIZE;
        n.label.x = n.sprite.x;
      }
    }

    // stamp action
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.canStamp) {
      this.tryStamp();
    }

    // draw stamper arm
    this.armGfx.clear();
    this.armGfx.lineStyle(3, 0x778da9, 1);
    this.armGfx.beginPath();
    this.armGfx.moveTo(this.stamper.x, STAMPER_Y + 24);
    this.armGfx.lineTo(this.stamper.x, BELT_Y - 45);
    this.armGfx.strokePath();
  }

  /* ─── GAME LOGIC ──────────────────── */

  spawnQuestion() {
    if (this.qIndex >= chapter7Questions.length) {
      this.showEndScreen();
      return;
    }

    this.clearNodes();
    const q = chapter7Questions[this.qIndex];
    this.questionText.setText(`Q${this.qIndex + 1}: ${q.question}`);

    const { width } = this.scale;
    const startX = width + NODE_SIZE;

    for (let i = 0; i < 4; i++) {
      const x = startX + i * NODE_SPACING;
      const sprite = this.add
        .image(x, BELT_Y, `agent${i}`)
        .setDisplaySize(NODE_SIZE, NODE_SIZE)
        .setDepth(3);

      const label = this.add
        .text(x, BELT_Y + NODE_SIZE / 2 + 12, q.options[i], {
          fontSize: '9px', color: '#e0e1dd', fontFamily: 'Arial',
          wordWrap: { width: NODE_SIZE + 40 }, align: 'center',
        }).setOrigin(0.5, 0).setDepth(3);

      this.nodes.push({ sprite, label, optionIndex: i });
    }
  }

  tryStamp() {
    let closest = null;
    let closestDist = Infinity;

    for (const n of this.nodes) {
      const dist = Math.abs(this.stamper.x - n.sprite.x);
      if (dist < NODE_SIZE * 0.8 && dist < closestDist) {
        closest = n;
        closestDist = dist;
      }
    }
    if (!closest) return;

    this.canStamp = false;
    this.time.delayedCall(STAMP_COOLDOWN, () => { this.canStamp = true; });

    // stamp animation
    this.tweens.add({
      targets: this.stamper,
      y: BELT_Y - NODE_SIZE / 2 - 5,
      duration: 80,
      yoyo: true,
      ease: 'Power2',
    });

    const q = chapter7Questions[this.qIndex];
    const isCorrect = closest.optionIndex === q.correct_answer;

    if (isCorrect) {
      this.localScore += CORRECT_PTS;
      addScore(CORRECT_PTS);
      markAnswered(q.id);
      this.showFeedback('✓  Routed! +1', '#00ff88');

      this.tweens.add({
        targets: closest.sprite,
        alpha: 0, scaleX: 1.4, scaleY: 1.4,
        duration: 300,
      });

      this.updateScoreDisplay();
      this.qIndex++;
      this.time.delayedCall(1400, () => this.spawnQuestion());
    } else {
      this.localScore += WRONG_PTS;
      addScore(WRONG_PTS);
      this.showFeedback('✗  Bad route! -3', '#e94560');
      this.updateScoreDisplay();

      // red flash
      this.errorOverlay.setAlpha(0.2);
      this.time.delayedCall(ERROR_FLASH_MS, () => {
        this.errorOverlay.setAlpha(0);
      });

      // shake wrong node
      this.tweens.add({
        targets: closest.sprite,
        x: closest.sprite.x + 8,
        duration: 50,
        yoyo: true,
        repeat: 3,
      });
    }
  }

  clearNodes() {
    for (const n of this.nodes) {
      n.sprite.destroy();
      n.label.destroy();
    }
    this.nodes = [];
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

  /* ─── END SCREEN ──────────────────── */

  showEndScreen() {
    this.gameOver = true;
    this.clearNodes();
    const { width, height } = this.scale;
    const globalState = getState();

    this.questionText.setVisible(false);
    this.feedbackText.setVisible(false);
    this.armGfx.clear();

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(30);

    this.add.text(width / 2, height / 2 - 80, 'Chapter 7 Complete!', {
      fontSize: '36px', color: '#3FA7D6', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height / 2 - 20, `Chapter Score: ${this.localScore}`, {
      fontSize: '22px', color: '#ffffff', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height / 2 + 20, `Global Score: ${globalState.score}`, {
      fontSize: '22px', color: '#FAC748', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(31);

    this.add.text(width / 2, height / 2 + 70, 'Press ENTER for the Final Boss!', {
      fontSize: '18px', color: '#e94560', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31);

    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.start('FinalBossScene');
    });
  }
}
