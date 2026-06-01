import Phaser from 'phaser';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }
  create({ score } = {}) {
    const { width, height } = this.scale;

    this.sound.stopAll();
    this.bgm = this.sound.add('bgm-gameover', { loop: false, volume: 0.6 });
    this.bgm.play();

    //Panel del fondo GAME OVER 
    const panel = this.add
      .rectangle(width / 2, height / 2, Math.min(width * 0.8, 520), Math.min(height * 0.6, 340), 0x081829, 0.98)
      .setStrokeStyle(4, 0x5b7cff)
      .setDepth(1)
      .setOrigin(0.5);

    //Letras de GAME OVER  
    this.add
      .text(width / 2, height / 2 - 120, 'GAME OVER', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '42px',
        color: '#e70e0e'
      })
      .setOrigin(0.5)
      .setDepth(3);

      //Texto de puntos 
    this.add
      .text(width / 2, height / 2 - 30, `Puntos: ${score || 0}`, {
        fontSize: '24px',
        color: '#eca90c'
      })
      .setOrigin(0.5)
      .setDepth(3);

      //-------------- Menu de opciones ---------------
      // Texto volver a jugar usando tecla N  
    this.add
      .text(width / 2, height / 2 + 18, 'Presiona N para jugar de nuevo', {
        fontSize: '18px',
        color: '#4fe3e8'
      })
      .setOrigin(0.5)
      .setDepth(3);

      //Texto volver al inicio usando tecla ENTER
    this.add
      .text(width / 2, height / 2 + 58, 'Presiona ENTER para volver al menú principal', {
        fontSize: '16px',
        color: '#15ee15'
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.input.keyboard.once('keydown-N', () => this.scene.start('GameScene', { score: 0 }));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('MenuScene'));

    this.events.once('shutdown', () => {
      if (this.bgm && this.bgm.isPlaying) {
        this.bgm.stop();
      }
    });
  }
}