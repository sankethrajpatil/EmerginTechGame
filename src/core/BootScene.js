import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    this.add
      .text(cx, cy - 20, 'Emerging Tech — ML Game', {
        fontSize: '32px',
        color: '#e94560',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 30, 'Loading…', {
        fontSize: '18px',
        color: '#888',
        fontFamily: 'Arial',
      })
      .setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      this.scene.start('HomeScene');
    });
  }
}
