import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }
  preload() {
    const tilesetPath = new URL('../assets/TileSet v1.0.png', import.meta.url).href;
    const portadaPath = new URL('../Portada.png', import.meta.url).href;

    const michaelFolder = '../assets/Michael';
    const michaelRunGroups = [
      { prefix: 'michael-run-down', start: 1, end: 6 },
      { prefix: 'michael-run-down-side', start: 7, end: 12 },
      { prefix: 'michael-run-side', start: 13, end: 18 },
      { prefix: 'michael-run-up-side', start: 19, end: 24 },
      { prefix: 'michael-run-up', start: 25, end: 30 }
    ];

    michaelRunGroups.forEach(({ prefix, start, end }) => {
      for (let index = start; index <= end; index += 1) {
        this.load.image(
          `michael-run-${index}`,
          new URL(`${michaelFolder}/run/16x32 Run${index}.png`, import.meta.url).href
        );
      }
    });

    for (let index = 1; index <= 35; index += 1) {
      this.load.image(
        `michael-punch-${index}`,
        new URL(`${michaelFolder}/punch/Attack${index}.png`, import.meta.url).href
      );
    }

    const slimeFolder = '../assets/slime';
    this.load.image('tileset', tilesetPath);
    this.load.image('portada', portadaPath);

    this.load.spritesheet('slime-idle', new URL(`${slimeFolder}/Slime1_Idle_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('slime-run', new URL(`${slimeFolder}/Slime1_Run_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('slime-attack', new URL(`${slimeFolder}/Slime1_Attack_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('slime-hurt', new URL(`${slimeFolder}/Slime1_Hurt_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('slime-death', new URL(`${slimeFolder}/Slime1_Death_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });
    // Slime variante 2 (solo skin)
    this.load.spritesheet('slime2-idle', new URL(`${slimeFolder}/Slime2_Idle_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('slime2-run', new URL(`${slimeFolder}/Slime2_Run_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('slime2-attack', new URL(`${slimeFolder}/Slime2_Attack_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('slime2-hurt', new URL(`${slimeFolder}/Slime2_Hurt_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('slime2-death', new URL(`${slimeFolder}/Slime2_Death_full.png`, import.meta.url).href, {
      frameWidth: 64,
      frameHeight: 64
    });

    // ── MÚSICA ──────────────────────────────────────────────────────────────
    // Se cargan ambos formatos (OGG + MP3) para máxima compatibilidad entre
    // navegadores. Phaser elige automáticamente el primer formato soportado.
    // Coloca los archivos en: src/assets/audio/
    //
    //  bgm-menu     → música de portada  (loop)
    //  bgm-game     → música de combate  (loop)
    //  bgm-gameover → jingle de game over (sin loop)
    // ─────────────────────────────────────────────────────────────────────────
    const audioFolder = '../assets/audio';

    this.load.audio('bgm-menu', [
      new URL(`${audioFolder}/menu.ogg`, import.meta.url).href,
      new URL(`${audioFolder}/menu.mp3`, import.meta.url).href
    ]);
    this.load.audio('bgm-game', [
      new URL(`${audioFolder}/game.ogg`, import.meta.url).href,
      new URL(`${audioFolder}/game.mp3`, import.meta.url).href
    ]);
    this.load.audio('bgm-gameover', [
      new URL(`${audioFolder}/gameover.ogg`, import.meta.url).href,
      new URL(`${audioFolder}/gameover.mp3`, import.meta.url).href
    ]);
    // Efectos de sonido
    this.load.audio('sfx-slime-death', [
      new URL(`${audioFolder}/slimedeath.mp3`, import.meta.url).href
    ]);
  }
  create() {
    for (let index = 1; index <= 30; index += 1) {
      this.textures.get(`michael-run-${index}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    for (let index = 1; index <= 35; index += 1) {
      this.textures.get(`michael-punch-${index}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    const tilesetTexture = this.textures.get('tileset');
    tilesetTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    ['slime-idle', 'slime-run', 'slime-attack', 'slime-hurt', 'slime-death',
     'slime2-idle', 'slime2-run', 'slime2-attack', 'slime2-hurt', 'slime2-death'].forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    });

    this.scene.start('MenuScene');
  }
}