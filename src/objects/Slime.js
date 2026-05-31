import Phaser from 'phaser';

export default class Slime extends Phaser.Physics.Arcade.Sprite {
  static ensureAnimations(scene) {
    const skins = ['slime', 'slime2'];
    const defs = [
      { name: 'idle', start: 0, end: 5, frameRate: 8, repeat: -1 },
      { name: 'run', start: 0, end: 7, frameRate: 10, repeat: -1 },
      { name: 'attack', start: 0, end: 9, frameRate: 10, repeat: 0 },
      { name: 'hurt', start: 0, end: 4, frameRate: 12, repeat: 0 },
      { name: 'death', start: 0, end: 9, frameRate: 10, repeat: 0 }
    ];

    skins.forEach((skin) => {
      defs.forEach((d) => {
        const key = `${skin}-${d.name}`;
        const texture = key; // texture names match keys loaded in BootScene
        if (!scene.anims.exists(key)) {
          scene.anims.create({
            key,
            frames: scene.anims.generateFrameNumbers(texture, { start: d.start, end: d.end }),
            frameRate: d.frameRate,
            repeat: d.repeat
          });
        }
      });
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
    this.detectionRange = config.detectionRange ?? 420;
    this.attackRange = config.attackRange ?? 42;
    this.attackCooldown = config.attackCooldown ?? 1000;
    this.nextAttackAt = 0;
    this.nextWanderAt = 0;
    this.hurtUntil = 0;
    this.isDead = false;
    this.state = 'idle';

    // skin prefix (e.g. 'slime' or 'slime2') derived from textureKey
    this.skin = (config.textureKey || 'slime-idle').split('-')[0];

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
      this.anims.play(`${this.skin}-run`, true);

      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      this.sceneRef.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
      return;
    }

    this.state = 'idle';
    this.anims.play(`${this.skin}-idle`, true);

    if (time >= this.nextWanderAt) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.wanderVelocity = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)).scale(this.speed * 0.35);
      this.nextWanderAt = time + Phaser.Math.Between(700, 1300);
    }

    this.body.setVelocity(this.wanderVelocity?.x || 0, this.wanderVelocity?.y || 0);
  }

  playAttack(target) {
    if (this.sceneRef.time.now < this.nextAttackAt) {
      this.anims.play(`${this.skin}-idle`, true);
      return;
    }

    this.nextAttackAt = this.sceneRef.time.now + this.attackCooldown;
    this.body.setVelocity(0, 0);
    this.state = 'attack';
    this.anims.play(`${this.skin}-attack`, true);

    // Aplicar daño con pequeño delay y comprobando distancia para permitir
    // que los slimes golpeen desde cualquier lado (no solo frente)
    if (target && target.active) {
      this.sceneRef.time.delayedCall(120, () => {
        try {
          if (!target.active) return;
          const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
          if (dist <= this.attackRange + 6) {
            this.sceneRef.damagePlayer(1);
          }
        } catch (e) {
          // ignore
        }
      });
    }

    this.once(`animationcomplete-${this.skin}-attack`, () => {
      if (!this.isDead) {
        this.state = 'idle';
        this.anims.play(`${this.skin}-idle`, true);
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
    this.anims.play(`${this.skin}-hurt`, true);

    this.once(`animationcomplete-${this.skin}-hurt`, () => {
      if (!this.isDead) {
        this.state = 'idle';
        this.anims.play(`${this.skin}-idle`, true);
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
      this.sceneRef.sound.play('sfx-slime-death', { volume: 0.35 });
    } catch (e) {
      // Si el sonido no está cargado o hay un error, no interrumpimos la lógica
    }

    // Chance de soltar un corazón que restaura vida (20%)
    try {
      if (this.sceneRef && typeof this.sceneRef.spawnHeartAt === 'function') {
        const chance = Phaser.Math.Between(1, 100);
        if (chance <= 20) {
          this.sceneRef.spawnHeartAt(this.x, this.y);
        }
      }
    } catch (e) {
      // ignore
    }
    this.anims.play(`${this.skin}-death`, true);

    this.once(`animationcomplete-${this.skin}-death`, () => {
      this.destroy();
    });
  }
}