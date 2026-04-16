/**
 * Adds an ESC button (top-left) + keyboard listener to any scene.
 * Pressing ESC or clicking the button transitions to HomeScene.
 *
 * Uses individual objects (not a container) so setScrollFactor(0)
 * keeps the hit-area aligned with the visual even when the camera scrolls.
 */
export function addEscButton(scene) {
  const bg = scene.add.rectangle(50, 28, 64, 26, 0x000000, 0.5)
    .setStrokeStyle(1, 0x778da9, 0.6)
    .setDepth(99)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  const label = scene.add.text(50, 28, '⬅ ESC', {
    fontSize: '11px', color: '#778da9', fontFamily: 'Arial', fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(99).setScrollFactor(0);

  bg.on('pointerover', () => {
    bg.setFillStyle(0x1a1a2e, 0.8);
    label.setColor('#e0e1dd');
  });

  bg.on('pointerout', () => {
    bg.setFillStyle(0x000000, 0.5);
    label.setColor('#778da9');
  });

  bg.on('pointerdown', () => {
    scene.scene.start('HomeScene');
  });

  scene.input.keyboard.on('keydown-ESC', () => {
    scene.scene.start('HomeScene');
  });

  return bg;
}
