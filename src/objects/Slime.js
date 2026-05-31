import Phaser from 'phaser';

export default class Slime extends Phaser.Physics.Arcade.Sprite {
  static ensureAnimations(scene) {
    const animations = [
      { key: 'slime-idle', texture: 'slime-idle', start: 0, end: 5, frameRate: 8, repeat: -1 },
      { key: 'slime-run', texture: 'slime-run', start: 0, end: 7, frameRate: 10, repeat: -1 },
      { key: 'slime-attack', texture: 'slime-attack', start: 0, end: 9, frameRate: 10, repeat: 0 },
      { key: 'slime-hurt', texture: 'slime-hurt', start: 0, end: 4, frameRate: 12, repeat: 0 },
      { key: 'slime-death', texture: 'slime-death', start: 0, end: 9, frameRate: 10, repeat: 0 }
    ];

    animations.forEach((animation) => {
      if (!scene.anims.exists(animation.key)) {
        scene.anims.create({
          key: animation.key,
          frames: scene.anims.generateFrameNumbers(animation.texture, {
            start: animation.start,
            end: animation.end
          }),
          frameRate: animation.frameRate,
          repeat: animation.repeat
        });
      }
    });
  }

  constructor(scene, x, y, config = {}) {
    super(scene, x, y, config.textureKey || 'slime-idle', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.sceneRef = scene;
    this.maxHealth = config.health ?? 2;
    this.health = this.maxHealth;
    this.speed = config.speed ?? 70;
    this.detectionRange = config.detectionRange ?? 220;
    this.attackRange = config.attackRange ?? 42;
    this.attackCooldown = config.attackCooldown ?? 1000;
    this.nextAttackAt = 0;
    this.nextWanderAt = 0;
    this.hurtUntil = 0;
    this.isDead = false;
    this.state = 'idle';

    this.setOrigin(0.5, 0.5);
    this.setScale(config.scale ?? 1.45);
    this.setDepth(20);
    this.setCollideWorldBounds(true);
    this.setBounce(0.1);

    this.body.setAllowGravity(false);
    this.body.setSize(28, 24);
    this.body.setOffset(18, 30);
  }

  update(time, target) {
    if (this.isDead || !this.active || !target) {
      return;
    }

    if (time < this.hurtUntil) {
      this.body.setVelocity(0, 0);
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const shouldFaceLeft = target.x < this.x;
    this.setFlipX(shouldFaceLeft);

    if (distance <= this.attackRange) {
      this.body.setVelocity(0, 0);
      this.playAttack(target);
      return;
    }

    if (distance <= this.detectionRange) {
      this.state = 'run';
      this.anims.play('slime-run', true);

      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      this.sceneRef.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
      return;
    }

    this.state = 'idle';
    this.anims.play('slime-idle', true);

    if (time >= this.nextWanderAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.wanderVelocity = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(this.speed * 0.35);
      this.nextWanderAt = time + Phaser.Math.Between(700, 1300);
    }

    this.body.setVelocity(this.wanderVelocity?.x || 0, this.wanderVelocity?.y || 0);
  }

  playAttack(target) {
    if (this.sceneRef.time.now < this.nextAttackAt) {
      this.anims.play('slime-idle', true);
      return;
    }

    this.nextAttackAt = this.sceneRef.time.now + this.attackCooldown;
    this.body.setVelocity(0, 0);
    this.state = 'attack';
    this.anims.play('slime-attack', true);

    if (target && target.active) {
      this.sceneRef.damagePlayer(1);
    }

    this.once('animationcomplete-slime-attack', () => {
      if (!this.isDead) {
        this.state = 'idle';
        this.anims.play('slime-idle', true);
      }
    });
  }

  takeDamage(amount = 1) {
    if (this.isDead) {
      return;
    }

    this.health -= amount;

    if (this.health <= 0) {
      this.die();
      return;
    }

    this.state = 'hurt';
    this.hurtUntil = this.sceneRef.time.now + 180;
    this.body.setVelocity(0, 0);
    this.anims.play('slime-hurt', true);

    this.once('animationcomplete-slime-hurt', () => {
      if (!this.isDead) {
        this.state = 'idle';
        this.anims.play('slime-idle', true);
      }
    });
  }

  die() {
    if (this.isDead) {
      return;
    }

    this.isDead = true;
    this.state = 'death';
    this.body.enable = false;
    this.body.setVelocity(0, 0);
    // Reproducir efecto de sonido de muerte si está disponible
    try {
      this.sceneRef.sound.play('sfx-slime-death', { volume: 0.20 });
    } catch (e) {
      // Si el sonido no está cargado o hay un error, no interrumpimos la lógica
    }
    this.anims.play('slime-death', true);

    this.once('animationcomplete-slime-death', () => {
      this.destroy();
    });
  }
}