import Phaser from 'phaser';
import { chapter5Questions } from './questions.js';
import { addScore, getState, markAnswered, setChapter } from '../../core/GameState.js';
import { showRules } from '../../ui/RulesOverlay.js';
import { addEscButton } from '../../ui/EscButton.js';

/* ─── constants ─────────────────────────────────────────── */
const CORRECT_PTS = 1;
const WRONG_PTS = -3;
const STUN_MS = 1000;
const POP_DURATION = 2800;
const POP_INTERVAL = 1200;
const BUG_SIZE = 80;
const HOLE_RX = 60;
const HOLE_RY = 22;
const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

// 2×2 grid positions (fractional of width/height)
const HOLE_POSITIONS = [
  { xf: 0.28, yf: 0.42 },
  { xf: 0.72, yf: 0.42 },
  { xf: 0.28, yf: 0.75 },
  { xf: 0.72, yf: 0.75 },
];

export class Chapter5Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Chapter5Scene' });
  }

  /* ────────────────── INIT ────────────────── */
  init() {
    setChapter(5);
    this.qIndex = 0;
    this.localScore = 0;
    this.holes = [];
    this.stunned = false;
    this.gameOver = false;
    this.rulesShown = false;
    this.popTimer = null;
    this.feedbackTimer = null;
    this.activeBugs = new Set();
  }

  /* ────────────────── PRELOAD ─────────────── */
  preload() {
    for (let i = 0; i < 4; i++) {
      this.load.image(
        `bug${i}`,
        `https://robohash.org/swBug${i}ch5.png?size=80x80&set=set1`
      );
    }
  }

  /* ────────────────── CREATE ─────────────── */
  create() {
    const { width, height } = this.scale;

    // ── background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1b4332).setDepth(0);
    // grass-ish patches
    for (let i = 0; i < 40; i++) {
      this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(Math.floor(height * 0.3), height),
        Phaser.Math.Between(3, 8),
        0x2d6a4f,
        Phaser.Math.FloatBetween(0.3, 0.6)
      ).setDepth(0);
    }

    // ── HUD
    this.scoreText = this.add
      .text(16, 12, `Score: ${getState().score}`, {
        fontSize: '20px', color: '#59CD90', fontFamily: 'Arial',
      })
      .setDepth(10);

    this.questionText = this.add
      .text(width / 2, 30, '', {
        fontSize: '17px', color: '#ffffff', fontFamily: 'Arial',
        wordWrap: { width: width - 80 }, align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.feedbackText = this.add
      .text(width / 2, height * 0.22, '', {
        fontSize: '26px', fontFamily: 'Arial', fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);

    this.chapterLabel = this.add
      .text(width - 16, 12, 'Ch.5 — Sampling & Metrics', {
        fontSize: '14px', color: '#888', fontFamily: 'Arial',
      })
      .setOrigin(1, 0)
      .setDepth(10);

    this.stunOverlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0xff0000, 0)
      .setDepth(15);

    // ── build holes + bug slots
    for (let i = 0; i < 4; i++) {
      const hx = width * HOLE_POSITIONS[i].xf;
      const hy = height * HOLE_POSITIONS[i].yf;

      // hole shadow (ellipse behind the bug)
      const holeBg = this.add.ellipse(hx, hy + 30, HOLE_RX * 2, HOLE_RY * 2, 0x000000, 0.6).setDepth(1);

      // hole rim
      const holeRim = this.add.ellipse(hx, hy + 30, HOLE_RX * 2 + 8, HOLE_RY * 2 + 6, 0x40916c, 1).setDepth(0.9);

      // bug sprite (starts hidden below hole)
      const bug = this.add
        .image(hx, hy + 50, `bug${i}`)
        .setDisplaySize(BUG_SIZE, BUG_SIZE)
        .setDepth(2)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });

      // option letter badge
      const badge = this.add
        .text(hx, hy - 10, '', {
          fontSize: '14px', color: '#ffffff', fontFamily: 'Arial',
          backgroundColor: '#000000aa', padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5, 1)
        .setDepth(3)
        .setVisible(false);

      // option text label
      const label = this.add
        .text(hx, hy + 76, '', {
          fontSize: '11px', color: '#d8f3dc', fontFamily: 'Arial',
          wordWrap: { width: 180 }, align: 'center',
        })
        .setOrigin(0.5, 0)
        .setDepth(3)
        .setVisible(false);

      bug.on('pointerdown', () => this.handleWhack(i));

      this.holes.push({
        x: hx, y: hy, bug, badge, label,
        holeBg, holeRim,
        isUp: false, optionIndex: -1,
      });
    }

    addEscButton(this);

    // ── show rules before starting
    showRules(this, {
      title: 'Chapter 5 — Whack-a-Bug',
      mechanics: [
        'Bugs pop out of holes with answer labels.',
        'Click the bug carrying the correct answer!',
      ],
      controls: [
        'MOUSE CLICK  Whack a bug',
      ],
      scoring: [
        'Correct whack: +1 point',
        'Wrong whack: -3 points + 1s stun',
      ],
    }, () => {
      this.rulesShown = true;
      this.spawnQuestion();
    });
  }

  /* ────────────────── UPDATE ─────────────── */
  // All logic is event/timer-driven; update is intentionally minimal.
  update() {}

  /* ─── QUESTION LIFECYCLE ─────────────────── */

  spawnQuestion() {
    if (this.qIndex >= chapter5Questions.length) {
      this.showEndScreen();
      return;
    }

    const q = chapter5Questions[this.qIndex];
    this.questionText.setText(`Q${this.qIndex + 1}: ${q.question}`);
    this.activeBugs.clear();

    // assign each option to a hole (1:1 mapping, shuffled order of appearance)
    this.holeOptions = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
    for (let i = 0; i < 4; i++) {
      this.holes[i].optionIndex = this.holeOptions[i];
    }

    // start the pop-up cycle
    this.popQueue = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
    this.popQueueIdx = 0;
    this.scheduleNextPop();
  }

  scheduleNextPop() {
    if (this.gameOver) return;

    // if all 4 have popped and hidden without being whacked, cycle again
    if (this.popQueueIdx >= this.popQueue.length) {
      this.popQueue = Phaser.Utils.Array.Shuffle([0, 1, 2, 3]);
      this.popQueueIdx = 0;
    }

    const delay = this.popQueueIdx === 0 ? 400 : POP_INTERVAL;
    this.popTimer = this.time.delayedCall(delay, () => {
      if (this.gameOver) return;
      this.popUpBug(this.popQueue[this.popQueueIdx]);
      this.popQueueIdx++;
      this.scheduleNextPop();
    });
  }

  popUpBug(holeIdx) {
    const h = this.holes[holeIdx];
    if (h.isUp) return; // already showing

    const q = chapter5Questions[this.qIndex];
    const optIdx = h.optionIndex;

    h.bug.setVisible(true).setAlpha(1);
    h.badge.setText(`${OPTION_LETTERS[optIdx]}`).setVisible(true);
    h.label.setText(q.options[optIdx]).setVisible(true);
    h.isUp = true;
    this.activeBugs.add(holeIdx);

    // pop-up tween
    h.bug.y = h.y + 50;
    this.tweens.add({
      targets: [h.bug],
      y: h.y - 10,
      duration: 200,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: [h.badge],
      alpha: { from: 0, to: 1 },
      duration: 200,
    });

    // auto-hide after POP_DURATION
    h.hideTimer = this.time.delayedCall(POP_DURATION, () => {
      this.hideBug(holeIdx);
    });
  }

  hideBug(holeIdx) {
    const h = this.holes[holeIdx];
    if (!h.isUp) return;

    this.tweens.add({
      targets: [h.bug],
      y: h.y + 50,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        h.bug.setVisible(false);
        h.badge.setVisible(false);
        h.label.setVisible(false);
      },
    });
    h.isUp = false;
    this.activeBugs.delete(holeIdx);
  }

  /* ─── WHACK HANDLING ─────────────────────── */

  handleWhack(holeIdx) {
    if (this.gameOver || this.stunned) return;

    const h = this.holes[holeIdx];
    if (!h.isUp) return; // can't whack a hidden bug

    const q = chapter5Questions[this.qIndex];
    const isCorrect = h.optionIndex === q.correct_answer;

    // stop all pop timers
    if (this.popTimer) this.popTimer.remove();

    if (isCorrect) {
      this.localScore += CORRECT_PTS;
      addScore(CORRECT_PTS);
      this.showFeedback('✓  Correct! +1', '#00ff88');
      markAnswered(q.id);

      // squash tween on the whacked bug
      this.tweens.add({
        targets: h.bug,
        scaleX: 1.3, scaleY: 0.3,
        duration: 150,
        yoyo: true,
      });

      this.hideAllBugs();
      this.updateScoreDisplay();
      this.qIndex++;
      this.time.delayedCall(1400, () => this.spawnQuestion());
    } else {
      this.localScore += WRONG_PTS;
      addScore(WRONG_PTS);
      this.showFeedback('✗  Wrong! -3', '#e94560');
      this.updateScoreDisplay();

      // shake the wrong bug
      this.tweens.add({
        targets: h.bug,
        x: h.x + 8,
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => { h.bug.x = h.x; },
      });

      // stun the player
      this.stunned = true;
      this.stunOverlay.setAlpha(0.15);
      this.time.delayedCall(STUN_MS, () => {
        this.stunned = false;
        this.stunOverlay.setAlpha(0);
        // resume pop cycle if question still active
        if (this.qIndex < chapter5Questions.length && !this.gameOver) {
          this.scheduleNextPop();
        }
      });
    }
  }

  hideAllBugs() {
    for (let i = 0; i < 4; i++) {
      const h = this.holes[i];
      if (h.hideTimer) h.hideTimer.remove();
      h.bug.setVisible(false).setAlpha(0);
      h.badge.setVisible(false);
      h.label.setVisible(false);
      h.isUp = false;
    }
    this.activeBugs.clear();
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
    if (this.popTimer) this.popTimer.remove();
    this.hideAllBugs();

    const { width, height } = this.scale;
    const globalState = getState();

    this.questionText.setVisible(false);
    this.feedbackText.setVisible(false);

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75).setDepth(30);

    this.add
      .text(width / 2, height / 2 - 80, 'Chapter 5 Complete!', {
        fontSize: '36px', color: '#59CD90', fontFamily: 'Arial', fontStyle: 'bold',
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
      .text(width / 2, height / 2 + 70, 'Press ENTER for Chapter 6', {
        fontSize: '18px', color: '#888', fontFamily: 'Arial',
      })
      .setOrigin(0.5).setDepth(31);

    this.input.keyboard.once('keydown-ENTER', () => {
      this.scene.start('Chapter6Scene');
    });
  }
}
