import Phaser from 'phaser';
import { BootScene } from './core/BootScene.js';
import { HomeScene } from './core/HomeScene.js';
import { Chapter1Scene } from './chapters/chapter1/Chapter1Scene.js';
import { Chapter2Scene } from './chapters/chapter2/Chapter2Scene.js';
import { Chapter3Scene } from './chapters/chapter3/Chapter3Scene.js';
import { Chapter4Scene } from './chapters/chapter4/Chapter4Scene.js';
import { Chapter5Scene } from './chapters/chapter5/Chapter5Scene.js';
import { Chapter6Scene } from './chapters/chapter6/Chapter6Scene.js';
import { Chapter7Scene } from './chapters/chapter7/Chapter7Scene.js';
import { FinalBossScene } from './chapters/finalBoss/FinalBossScene.js';

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scene: [BootScene, HomeScene, Chapter1Scene, Chapter2Scene, Chapter3Scene, Chapter4Scene, Chapter5Scene, Chapter6Scene, Chapter7Scene, FinalBossScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);
export default game;
