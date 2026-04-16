import Phaser from 'phaser';
import { getState, resetState } from '../core/GameState.js';

const CHAPTERS = [
  { key: 'Chapter1Scene', num: 1, title: 'AI & ML Foundations',    icon: 'Spaceship Shooter', color: 0x00d2ff },
  { key: 'Chapter2Scene', num: 2, title: 'Neural Networks',        icon: 'Catch the Object',  color: 0x59cd90 },
  { key: 'Chapter3Scene', num: 3, title: 'NLP & Transformers',     icon: 'Platform Jumper',    color: 0x3fa7d6 },
  { key: 'Chapter4Scene', num: 4, title: 'LLMs & PEFT',            icon: 'Memory Maze',        color: 0xfac748 },
  { key: 'Chapter5Scene', num: 5, title: 'Sampling & Metrics',     icon: 'Whack-a-Bug',        color: 0x59cd90 },
  { key: 'Chapter6Scene', num: 6, title: 'RAG & Semantic Search',  icon: 'Data Claw',          color: 0x3fa7d6 },
  { key: 'Chapter7Scene', num: 7, title: 'Agents & Observability', icon: 'Workflow Sorter',    color: 0x778da9 },
  { key: 'FinalBossScene', num: '★', title: 'The Master Algorithm', icon: 'Final Boss',        color: 0xe94560 },
];

const CARD_W = 200;
const CARD_H = 110;
const GAP = 20;
const COLS = 4;

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' });
  }

  create() {
    const { width, height } = this.scale;

    // ── animated background
    this.bgParticles = [];
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Phaser.Math.FloatBetween(0.5, 2);
      const c = this.add.circle(x, y, r, 0x3fa7d6, Phaser.Math.FloatBetween(0.1, 0.4));
      this.bgParticles.push({ obj: c, speed: Phaser.Math.FloatBetween(8, 25) });
    }

    // ── gradient overlay panels
    this.add.rectangle(width / 2, 0, width, 140, 0x0b0c10, 0.9).setOrigin(0.5, 0).setDepth(1);

    // ── title
    const title = this.add.text(width / 2, 35, 'EMERGING TECH', {
      fontSize: '36px', color: '#e94560', fontFamily: 'Arial', fontStyle: 'bold',
      letterSpacing: 6,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(width / 2, 72, 'Machine Learning Game', {
      fontSize: '18px', color: '#778da9', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(2);

    // subtle title pulse
    this.tweens.add({
      targets: title, scaleX: 1.02, scaleY: 1.02,
      duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── score banner
    const score = getState().score;
    if (score !== 0) {
      this.add.text(width / 2, 102, `Cumulative Score: ${score}`, {
        fontSize: '14px', color: '#FAC748', fontFamily: 'Arial',
      }).setOrigin(0.5).setDepth(2);
    }

    // ── subtitle
    this.add.text(width / 2, 150, 'Select a chapter to play', {
      fontSize: '15px', color: '#555', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(2);

    // ── chapter cards grid
    const rows = Math.ceil(CHAPTERS.length / COLS);
    const gridW = COLS * CARD_W + (COLS - 1) * GAP;
    const gridH = rows * CARD_H + (rows - 1) * GAP;
    const startX = (width - gridW) / 2 + CARD_W / 2;
    const startY = 175 + CARD_H / 2;

    for (let i = 0; i < CHAPTERS.length; i++) {
      const ch = CHAPTERS[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = startX + col * (CARD_W + GAP);
      const cy = startY + row * (CARD_H + GAP);

      this.createCard(cx, cy, ch);
    }

    // ── footer
    this.add.text(width / 2, height - 20, '← → to navigate  ·  Click or ENTER to select  ·  ESC returns here from any chapter', {
      fontSize: '11px', color: '#444', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(2);
  }

  createCard(x, y, ch) {
    const container = this.add.container(x, y).setDepth(3);

    // card background
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x16213e)
      .setStrokeStyle(2, ch.color, 0.6);
    container.add(bg);

    // chapter number badge
    const badge = this.add.circle(-CARD_W / 2 + 22, -CARD_H / 2 + 20, 14, ch.color, 0.9);
    const badgeText = this.add.text(-CARD_W / 2 + 22, -CARD_H / 2 + 20, `${ch.num}`, {
      fontSize: '13px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add([badge, badgeText]);

    // title
    const titleText = this.add.text(8, -14, ch.title, {
      fontSize: '13px', color: '#e0e1dd', fontFamily: 'Arial', fontStyle: 'bold',
      wordWrap: { width: CARD_W - 50 },
    }).setOrigin(0.5);
    container.add(titleText);

    // mechanic label
    const mechText = this.add.text(8, 10, ch.icon, {
      fontSize: '11px', color: '#778da9', fontFamily: 'Arial',
    }).setOrigin(0.5);
    container.add(mechText);

    // play button
    const playBg = this.add.rectangle(0, CARD_H / 2 - 18, CARD_W - 30, 22, ch.color, 0.15)
      .setStrokeStyle(1, ch.color, 0.4);
    const playText = this.add.text(0, CARD_H / 2 - 18, '▶  PLAY', {
      fontSize: '10px', color: Phaser.Display.Color.IntegerToColor(ch.color).rgba,
      fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add([playBg, playText]);

    // make the whole card interactive
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x1a2744);
      bg.setStrokeStyle(2, ch.color, 1);
      this.tweens.add({
        targets: container, scaleX: 1.05, scaleY: 1.05,
        duration: 120, ease: 'Power2',
      });
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x16213e);
      bg.setStrokeStyle(2, ch.color, 0.6);
      this.tweens.add({
        targets: container, scaleX: 1, scaleY: 1,
        duration: 120, ease: 'Power2',
      });
    });

    bg.on('pointerdown', () => {
      resetState();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start(ch.key);
      });
    });
  }

  update(_time, delta) {
    const dt = delta / 1000;
    const { height } = this.scale;
    for (const p of this.bgParticles) {
      p.obj.y -= p.speed * dt;
      if (p.obj.y < -5) {
        p.obj.y = height + 5;
        p.obj.x = Phaser.Math.Between(0, this.scale.width);
      }
    }
  }
}
