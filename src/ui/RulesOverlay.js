/**
 * Reusable rules overlay — call showRules(scene, config, onDismiss)
 * at the start of each scene to display controls & scoring before gameplay.
 */

/**
 * @param {Phaser.Scene} scene
 * @param {{ title: string, mechanics: string[], controls: string[], scoring: string[] }} config
 * @param {() => void} onDismiss  — called when the player presses ENTER
 */
export function showRules(scene, config, onDismiss) {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const cy = height / 2;

  const group = [];

  // dimmed backdrop
  const bg = scene.add
    .rectangle(cx, cy, width, height, 0x000000, 0.88)
    .setDepth(50);
  group.push(bg);

  let y = cy - 200;

  // title
  const title = scene.add
    .text(cx, y, config.title, {
      fontSize: '28px', color: '#3FA7D6', fontFamily: 'Arial', fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(51);
  group.push(title);
  y += 50;

  // mechanics
  const mechHeader = scene.add
    .text(cx, y, '📋  Objective', {
      fontSize: '16px', color: '#FAC748', fontFamily: 'Arial', fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(51);
  group.push(mechHeader);
  y += 24;

  for (const line of config.mechanics) {
    const t = scene.add
      .text(cx, y, line, {
        fontSize: '14px', color: '#e0e1dd', fontFamily: 'Arial',
        wordWrap: { width: width - 160 }, align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(51);
    group.push(t);
    y += t.height + 6;
  }

  y += 12;

  // controls
  const ctrlHeader = scene.add
    .text(cx, y, '🎮  Controls', {
      fontSize: '16px', color: '#FAC748', fontFamily: 'Arial', fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(51);
  group.push(ctrlHeader);
  y += 24;

  for (const line of config.controls) {
    const t = scene.add
      .text(cx, y, line, {
        fontSize: '14px', color: '#e0e1dd', fontFamily: 'Arial',
      })
      .setOrigin(0.5, 0)
      .setDepth(51);
    group.push(t);
    y += 22;
  }

  y += 12;

  // scoring
  const scoreHeader = scene.add
    .text(cx, y, '⭐  Scoring', {
      fontSize: '16px', color: '#FAC748', fontFamily: 'Arial', fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(51);
  group.push(scoreHeader);
  y += 24;

  for (const line of config.scoring) {
    const t = scene.add
      .text(cx, y, line, {
        fontSize: '14px', color: '#e0e1dd', fontFamily: 'Arial',
      })
      .setOrigin(0.5, 0)
      .setDepth(51);
    group.push(t);
    y += 22;
  }

  // press enter prompt
  const prompt = scene.add
    .text(cx, cy + 220, '[ Press ENTER to start ]', {
      fontSize: '18px', color: '#59CD90', fontFamily: 'Arial', fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(51);
  group.push(prompt);

  // blink the prompt
  scene.tweens.add({
    targets: prompt,
    alpha: 0.3,
    duration: 600,
    yoyo: true,
    repeat: -1,
  });

  // dismiss on ENTER
  scene.input.keyboard.once('keydown-ENTER', () => {
    for (const obj of group) obj.destroy();
    onDismiss();
  });
}
