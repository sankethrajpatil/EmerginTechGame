import Phaser from 'phaser';
import { BootScene } from './core/BootScene.js';
import { Chapter1Scene } from './chapters/chapter1/Chapter1Scene.js';

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [BootScene, Chapter1Scene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);
export default game;
