import Phaser from 'phaser';
import room01 from '../maps/room01.js';
import Slime from '../objects/Slime.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }
  create(data = {}) {
    this.roomIndex = data.roomIndex ?? 1;
    this.score = data.score ?? 0;
    this.playerHealth = 3;
    this.playerMaxHealth = 3;
    this.playerInvulnerableUntil = 0;
    this.gameOver = false;
    this.roomKey = null;

    this.createGameplayTextures();
    this.createSlimeAnimations();
    this.createSmallMap(room01);
    this.createPlayerAnimations();

    const playerStart = (data.spawnAt && { x: data.spawnAt.x, y: data.spawnAt.y }) || this.getRandomSpawnPosition(room01) || { x: room01.spawn.x, y: room01.spawn.y };
    this.player = this.physics.add.sprite(playerStart.x, playerStart.y, 'michael-run-1');
    this.player.setOrigin(0.5, 1);
    this.player.setScale(2);
    this.player.body.setCollideWorldBounds(true);
    const playerFrameWidth = 16;
    const playerFrameHeight = 32;
    const playerScale = 2;
    const playerDisplayWidth = playerFrameWidth * playerScale;
    const playerDisplayHeight = playerFrameHeight * playerScale;
    const playerHitboxWidth = Math.round(playerDisplayWidth * 0.5);
    const playerHitboxHeight = Math.round(playerDisplayHeight * 0.32);
    const playerHitboxOffsetX = Math.round((playerDisplayWidth - playerHitboxWidth) / 2);
    const playerHitboxOffsetY = Math.round(playerDisplayHeight - playerHitboxHeight - 2);
    this.player.body.setSize(playerHitboxWidth, playerHitboxHeight);
    this.player.body.setOffset(playerHitboxOffsetX, playerHitboxOffsetY);

    this.player.body.setCollideWorldBounds(true);
    this.lastValidPos = { x: this.player.x, y: this.player.y };

    this.physics.add.collider(this.player, this.wallLayer);

    this.slimeGroup = this.physics.add.group();

    this.spawnRoomSlimes(room01);

    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.runKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.playerSpeed = 170;
    this.lastFacing = { direction: 'down', flipX: false };
    this.isPunching = false;
    this.punchCooldownUntil = 0;

    // Barra de vida (barra negra de fondo + barra roja llenable)
    this.healthBarBg = this.add.rectangle(12, 12, 84, 14, 0x000000, 0.6).setOrigin(0, 0).setDepth(1000).setScrollFactor(0);
    this.healthBarFill = this.add.rectangle(14, 14, 80, 10, 0xff4444).setOrigin(0, 0).setDepth(1001).setScrollFactor(0);

    this.hudText = this.add.text(12, 30, '', {
      fontSize: '14px',
      color: '#ffffff'
    }).setDepth(1000).setScrollFactor(0);

    // ── Texto de instrucciones (M añadido) ───────────────────────────────────
    this.instructionText = this.add.text(
      12, 46,
      'F: pantalla completa | G: debug tiles | SPACE: golpear | M: silenciar',
      { fontSize: '12px', color: '#d8f7ff' }
    ).setDepth(1000).setScrollFactor(0);
    // ─────────────────────────────────────────────────────────────────────────

    this.messageText = this.add.text(this.scale.width / 2, 64, '', {
      fontSize: '18px',
      color: '#ffff88',
      backgroundColor: '#00000088',
      padding: { x: 10, y: 4 }
    }).setOrigin(0.5).setDepth(1000).setScrollFactor(0);

    // (debug panel removed)

    this.updateHud();

    // ── MÚSICA DE COMBATE ────────────────────────────────────────────────────
    // stopAll() evita solapamiento con bgm-menu si el jugador arranca la partida
    // inmediatamente. En reinicios (scene.restart) no hay música activa previa,
    // pero la llamada es segura de todas formas.
    this.sound.stopAll();
    this.bgm = this.sound.add('bgm-game', { loop: true, volume: 0.45 });
    this.bgm.play();
    // ─────────────────────────────────────────────────────────────────────────

    this.input.keyboard.on('keydown-SPACE', this.startPunch, this);
    this.input.keyboard.on('keydown-F', this.toggleFullscreen, this);
    this.input.keyboard.on('keydown-G', this.toggleTileDebugOverlay, this);
    this.input.keyboard.on('keydown-M', this.toggleMute, this);   // ← NUEVO

    this.events.once('shutdown', () => {
      this.input.keyboard.off('keydown-SPACE', this.startPunch, this);
      this.input.keyboard.off('keydown-F', this.toggleFullscreen, this);
      this.input.keyboard.off('keydown-G', this.toggleTileDebugOverlay, this);
      this.input.keyboard.off('keydown-M', this.toggleMute, this); // ← NUEVO
    });
  }
  update(time) {
    if (this.gameOver) {
      return;
    }

    const body = this.player.body;
    if (this.isPunching) {
      body.setVelocity(0, 0);
    } else {
      body.setVelocity(0, 0);

      if (this.cursors.left.isDown) {
        body.setVelocityX(-this.playerSpeed);
      } else if (this.cursors.right.isDown) {
        body.setVelocityX(this.playerSpeed);
      }

      if (this.cursors.up.isDown) {
        body.setVelocityY(-this.playerSpeed);
      } else if (this.cursors.down.isDown) {
        body.setVelocityY(this.playerSpeed);
      }

      if (body.velocity.lengthSq() > 0) {
        body.velocity.normalize().scale(this.playerSpeed);
        this.playMovementAnimation(body.velocity.x, body.velocity.y);
      } else {
        this.player.anims.stop();
        this.player.setFlipX(this.lastFacing.flipX);
        this.player.setTexture(this.getIdleFrameForDirection(this.lastFacing.direction));
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
      this.startPunch();
    }

    this.updateSlimes(time);
    this.updateRoomState();

    if (this.map) {
      const bodyBB = this.player.body;
      const halfBodyW = bodyBB.width / 2;
      const halfBodyH = bodyBB.height / 2;
      const minCenterX = 0 + halfBodyW;
      const minCenterY = 0 + halfBodyH;
      const maxCenterX = this.map.widthInPixels - halfBodyW;
      const maxCenterY = this.map.heightInPixels - halfBodyH;
      const clampedX = Phaser.Math.Clamp(this.player.x, minCenterX, maxCenterX);
      const clampedY = Phaser.Math.Clamp(this.player.y, minCenterY, maxCenterY);
      if (clampedX !== this.player.x || clampedY !== this.player.y) {
        this.player.x = clampedX;
        this.player.y = clampedY;
        bodyBB.reset(this.player.x, this.player.y);
      }

      this.lastValidPos.x = this.player.x;
      this.lastValidPos.y = this.player.y;
    }

    // debug panel disabled
  }

  // ── MÚSICA: silenciar / activar ──────────────────────────────────────────
  // `this.sound.mute` es una propiedad global del SoundManager de Phaser.
  // Al ponerla a true se silencian TODOS los sonidos (música + sfx futuros)
  // sin detenerlos, de modo que al reactivarla retoman exactamente donde estaban.
  toggleMute() {
    this.sound.mute = !this.sound.mute;
  }
  // ─────────────────────────────────────────────────────────────────────────

  createGameplayTextures() {
    if (!this.textures.exists('room-key')) {
      const keyGraphics = this.add.graphics();
      keyGraphics.fillStyle(0xffd54f, 1);
      keyGraphics.fillRect(2, 7, 12, 4);
      keyGraphics.fillRect(10, 5, 4, 8);
      keyGraphics.fillCircle(4, 9, 2);
      keyGraphics.generateTexture('room-key', 16, 16);
      keyGraphics.destroy();
    }
    if (!this.textures.exists('heart')) {
      const g = this.add.graphics();
      g.fillStyle(0xff4d6d, 1);
      g.fillCircle(5, 5, 4);
      g.fillCircle(11, 5, 4);
      g.fillTriangle(2, 8, 14, 8, 8, 14);
      g.generateTexture('heart', 16, 16);
      g.destroy();
    }
  }

  spawnHeartAt(x, y) {
    if (!this.map) return;
    const heart = this.physics.add.image(x, y, 'heart');
    heart.setDepth(25);
    heart.setScale(1.5);
    heart.body.setAllowGravity(false);
    heart.setImmovable(true);
    // overlap con jugador
    this.physics.add.overlap(this.player, heart, this.collectHeart, null, this);
    // auto-destroy tras 8s
    this.time.delayedCall(8000, () => {
      if (heart && heart.active) heart.destroy();
    });
  }

  collectHeart(player, heart) {
    if (!heart || !heart.active) return;
    heart.destroy();
    this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + 1);
    this.updateHud();
  }

  createSlimeAnimations() {
    Slime.ensureAnimations(this);
  }

  spawnRoomSlimes(room) {
    // Número base de slimes = 3, aumentar 1 por cada nivel adicional
    const count = 3 + Math.max(0, (this.roomIndex || 1) - 1);
    const used = [];

    for (let i = 0; i < count; i += 1) {
      // Solo spawnear slimes dentro de tiles con índice 51
      let pos = this.getRandomSpawnPositionForTileIndex(room, 51);
      // Evitar spawnear encima del jugador o posiciones muy cercanas
      let attempts = 0;
      while (pos && Phaser.Math.Distance.Between(pos.x, pos.y, this.player.x, this.player.y) < 80 && attempts < 8) {
        pos = this.getRandomSpawnPositionForTileIndex(room, 51);
        attempts += 1;
      }

      // Si no hay posiciones válidas, fallback a spawn relative al room
      if (!pos) {
        // fallback en caso de no encontrar tile 51
        pos = { x: room.spawn.x + (i - 1) * 48, y: room.spawn.y + 80 };
      }

      // Asegurar unicidad aproximada
      if (used.some((p) => Phaser.Math.Distance.Between(p.x, p.y, pos.x, pos.y) < 48)) {
        pos.x += 32 * (i % 2 === 0 ? 1 : -1);
        pos.y += 16 * (i % 3 === 0 ? 1 : -1);
      }
      used.push(pos);

      // Random skin: 'slime' or 'slime2' (only visual)
      const skin = Phaser.Math.Between(0, 100) <= 25 ? 'slime2' : 'slime';
      const textureKey = `${skin}-idle`;
      const baseDetection = 420; // base detection distance
      const levelBonus = Math.max(0, (this.roomIndex || 1) - 1) * 20;
      const slime = new Slime(this, pos.x, pos.y, {
        textureKey,
        health: 2,
        speed: 70,
        detectionRange: baseDetection + levelBonus,
        attackRange: 42
      });

      this.slimeGroup.add(slime);
      this.physics.add.collider(slime, this.wallLayer);
      this.physics.add.collider(slime, this.player);
    }
  }

  // Construye una lista de posiciones world centradas en tiles caminables del room
  buildWalkablePositions(room) {
    try {
      const walkable = new Set(room.walkableTiles || []);
      const positions = [];
      for (let ty = 0; ty < this.map.height; ty += 1) {
        for (let tx = 0; tx < this.map.width; tx += 1) {
          const tile = this.floorLayer.getTileAt(tx, ty) || this.decoLayer.getTileAt(tx, ty) || this.wallLayer.getTileAt(tx, ty);
          const idx = tile && tile.index !== -1 ? tile.index : -1;
          if (walkable.has(idx)) {
            positions.push({ x: tx * this.map.tileWidth + this.map.tileWidth / 2, y: ty * this.map.tileHeight + this.map.tileHeight / 2 });
          }
        }
      }
      this._walkablePositions = positions;
    } catch (e) {
      this._walkablePositions = null;
    }
  }

  // Construye y cachea posiciones centradas de tiles que tengan un índice específico
  buildPositionsForTileIndex(room, tileIndex) {
    try {
      const positions = [];
      for (let ty = 0; ty < this.map.height; ty += 1) {
        for (let tx = 0; tx < this.map.width; tx += 1) {
          const floorT = this.floorLayer.getTileAt(tx, ty);
          const topIdx = floorT && floorT.index !== -1 ? floorT.index : -1;
          if (topIdx === tileIndex) {
            positions.push({ x: tx * this.map.tileWidth + this.map.tileWidth / 2, y: ty * this.map.tileHeight + this.map.tileHeight / 2 });
          }
        }
      }
      this._positionsByTileIndex = this._positionsByTileIndex || {};
      this._positionsByTileIndex[tileIndex] = positions;
    } catch (e) {
      this._positionsByTileIndex = this._positionsByTileIndex || {};
      this._positionsByTileIndex[tileIndex] = [];
    }
  }

  getRandomSpawnPositionForTileIndex(room, tileIndex) {
    if (!this._positionsByTileIndex || !this._positionsByTileIndex[tileIndex] || this._positionsByTileIndex[tileIndex].length === 0) {
      this.buildPositionsForTileIndex(room, tileIndex);
    }

    const list = this._positionsByTileIndex[tileIndex] || [];
    if (!list || list.length === 0) return null;
    const idx = Phaser.Math.Between(0, list.length - 1);
    return list[idx];
  }

  // Devuelve una posición aleatoria dentro de tiles caminables del room
  getRandomSpawnPosition(room) {
    if (!this._walkablePositions || this._walkablePositions.length === 0) {
      // Construir si no existe (se llama desde create justo después de map creado)
      this.buildWalkablePositions(room);
    }

    if (!this._walkablePositions || this._walkablePositions.length === 0) {
      return null;
    }

    const idx = Phaser.Math.Between(0, this._walkablePositions.length - 1);
    return this._walkablePositions[idx];
  }

  updateSlimes(time) {
    this.slimeGroup.getChildren().forEach((slime) => {
      if (slime.active) {
        slime.update(time, this.player);
      }
    });
  }

  updateRoomState() {
    if (this.roomKey || this.slimeGroup.countActive(true) > 0) {
      this.updateHud();
      return;
    }

    this.spawnRoomKey();
    this.showMessage('Todos los slimes fueron derrotados. Toma la llave.');
    this.updateHud();
  }

  spawnRoomKey() {
    if (this.roomKey) {
      return;
    }

    this.roomKey = this.physics.add.image(this.map.widthInPixels / 2, this.map.heightInPixels / 2, 'room-key');
    this.roomKey.setImmovable(true);
    this.roomKey.body.setAllowGravity(false);
    this.roomKey.setDepth(22);
    this.physics.add.overlap(this.player, this.roomKey, this.collectRoomKey, null, this);
  }

  collectRoomKey() {
    if (!this.roomKey || this.gameOver) {
      return;
    }

    this.roomKey.destroy();
    this.roomKey = null;
    this.score += 100;
    this.updateHud();
    this.showMessage('Room completado');

    // No reiniciar al recoger la llave: el jugador conserva su posición.
    // Incrementar nivel y spawnear los slimes del siguiente nivel.
    this.time.delayedCall(500, () => {
      this.roomIndex = (this.roomIndex || 1) + 1;
      this.updateHud();
      this.showMessage(`Nivel ${this.roomIndex}`);
      // spawnear nuevos slimes para el siguiente nivel
      this.spawnRoomSlimes(this.currentRoom || room01);
    });
  }

  startPunch() {
    if (this.gameOver) {
      return;
    }

    if (this.isPunching || this.time.now < this.punchCooldownUntil) {
      return;
    }

    const punchAnimationKey = this.getPunchAnimationKey(this.lastFacing.direction);
    this.isPunching = true;
    this.punchCooldownUntil = this.time.now + 260;
    this.playerInvulnerableUntil = Math.max(this.playerInvulnerableUntil, this.time.now + 180);
    this.player.anims.play(punchAnimationKey, true);

    this.time.delayedCall(90, () => {
      this.applyPunchDamage(this.lastFacing.direction);
    });

    this.player.once('animationcomplete', () => {
      this.isPunching = false;
      this.player.setFlipX(this.lastFacing.flipX);
      this.player.setTexture(this.getIdleFrameForDirection(this.lastFacing.direction));
    });
  }

  damagePlayer(amount = 1) {
    if (this.gameOver) {
      return;
    }

    if (this.time.now < this.playerInvulnerableUntil) {
      return;
    }

    this.playerHealth -= amount;
    this.playerInvulnerableUntil = this.time.now + 700;
    this.player.setTint(0xff6666);
    this.time.delayedCall(120, () => {
      if (this.player && this.player.active) {
        this.player.clearTint();
      }
    });

    this.updateHud();

    if (this.playerHealth <= 0) {
      this.gameOver = true;
      this.scene.start('GameOverScene', { score: this.score });
    }
  }

  updateHud() {
    if (!this.hudText) {
      return;
    }

    const aliveSlimes = this.slimeGroup ? this.slimeGroup.countActive(true) : 0;
    this.hudText.setText(
      `Nivel: ${this.roomIndex} | Slimes: ${aliveSlimes} | Puntos: ${this.score}`
    );

    // Actualizar barra de vida
    if (this.healthBarFill && this.playerMaxHealth) {
      const pct = Math.max(0, this.playerHealth) / this.playerMaxHealth;
      this.healthBarFill.width = Math.max(0, Math.round(80 * pct));
      // cambiar color según porcentaje (verde->amarillo->rojo)
      if (pct > 0.66) {
        this.healthBarFill.fillColor = 0x44ff66;
      } else if (pct > 0.33) {
        this.healthBarFill.fillColor = 0xffcc33;
      } else {
        this.healthBarFill.fillColor = 0xff4444;
      }
    }
  }

  getFacingDirection() {
    if (this.lastFacing.direction === 'left') {
      return new Phaser.Math.Vector2(-1, 0);
    }

    if (this.lastFacing.direction === 'right') {
      return new Phaser.Math.Vector2(1, 0);
    }

    if (this.lastFacing.direction === 'up') {
      return new Phaser.Math.Vector2(0, -1);
    }

    return new Phaser.Math.Vector2(0, 1);
  }

  getIdleFrameForDirection(direction) {
    if (direction === 'up') {
      return 'michael-run-25';
    }

    if (direction === 'left' || direction === 'right') {
      return 'michael-run-13';
    }

    return 'michael-run-1';
  }

  getPunchAnimationKey(direction) {
    if (direction === 'up') {
      return 'michael-punch-up';
    }

    if (direction === 'left' || direction === 'right') {
      return 'michael-punch-side';
    }

    return 'michael-punch-down';
  }

  getPunchHitbox(direction) {
    const bounds = this.player.getBounds();

    if (direction === 'up') {
      return new Phaser.Geom.Rectangle(bounds.centerX - 16, bounds.top - 24, 32, 24);
    }

    if (direction === 'left') {
      return new Phaser.Geom.Rectangle(bounds.left - 24, bounds.top + 14, 24, 24);
    }

    if (direction === 'right') {
      return new Phaser.Geom.Rectangle(bounds.right, bounds.top + 14, 24, 24);
    }

    return new Phaser.Geom.Rectangle(bounds.centerX - 16, bounds.bottom - 4, 32, 24);
  }

  applyPunchDamage(direction) {
    const punchHitbox = this.getPunchHitbox(direction);
    let hitCount = 0;

    this.slimeGroup.getChildren().forEach((slime) => {
      if (!slime.active) {
        return;
      }

      if (Phaser.Geom.Intersects.RectangleToRectangle(punchHitbox, slime.getBounds())) {
        slime.takeDamage(1);
        this.score += 10;
        hitCount += 1;
      }
    });

    if (hitCount > 0) {
      this.updateHud();
    }
  }

  showMessage(text) {
    if (!this.messageText) {
      return;
    }

    this.messageText.setText(text);
    if (text) {
      this.time.delayedCall(1200, () => {
        if (this.messageText) {
          this.messageText.setText('');
        }
      });
    }
  }

  createPlayerAnimations() {
    if (!this.anims.exists('michael-down')) {
      this.anims.create({
        key: 'michael-down',
        frames: [1, 2, 3, 4, 5, 6].map((index) => ({ key: `michael-run-${index}` })),
        frameRate: 10,
        repeat: -1
      });
    }

    if (!this.anims.exists('michael-side')) {
      this.anims.create({
        key: 'michael-side',
        frames: [13, 14, 15, 16, 17, 18].map((index) => ({ key: `michael-run-${index}` })),
        frameRate: 10,
        repeat: -1
      });
    }

    if (!this.anims.exists('michael-up')) {
      this.anims.create({
        key: 'michael-up',
        frames: [25, 26, 27, 28, 29, 30].map((index) => ({ key: `michael-run-${index}` })),
        frameRate: 10,
        repeat: -1
      });
    }

    if (!this.anims.exists('michael-punch-down')) {
      this.anims.create({
        key: 'michael-punch-down',
        frames: [1, 2, 3, 4, 5, 6, 7].map((index) => ({ key: `michael-punch-${index}` })),
        frameRate: 14,
        repeat: 0
      });
    }

    if (!this.anims.exists('michael-punch-side')) {
      this.anims.create({
        key: 'michael-punch-side',
        frames: [15, 16, 17, 18, 19, 20, 21].map((index) => ({ key: `michael-punch-${index}` })),
        frameRate: 14,
        repeat: 0
      });
    }

    if (!this.anims.exists('michael-punch-up')) {
      this.anims.create({
        key: 'michael-punch-up',
        frames: [29, 30, 31, 32, 33, 34, 35].map((index) => ({ key: `michael-punch-${index}` })),
        frameRate: 14,
        repeat: 0
      });
    }
  }

  playMovementAnimation(vx, vy) {
    if (Math.abs(vx) >= Math.abs(vy)) {
      const flipX = vx < 0;
      const direction = flipX ? 'left' : 'right';
      this.player.setFlipX(flipX);
      this.player.anims.play('michael-side', true);
      this.lastFacing = { direction, flipX };
      return;
    }

    if (vy < 0) {
      this.player.setFlipX(false);
      this.player.anims.play('michael-up', true);
      this.lastFacing = { direction: 'up', flipX: false };
    } else {
      this.player.setFlipX(false);
      this.player.anims.play('michael-down', true);
      this.lastFacing = { direction: 'down', flipX: false };
    }
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
      return;
    }

    this.scale.startFullscreen();
  }

  toggleTileDebugOverlay() {
    if (!this.tileDebugContainer) {
      this.createTileDebugOverlay();
    }

    this.tileDebugContainer.setVisible(!this.tileDebugContainer.visible);
  }

  createSmallMap(room) {
    this.currentRoom = room;
    if (room.showTilesetReference) {
      this.createTilesetReferenceMap(room);
      return;
    }

    if (room.tileGrid) {
      this.createTileGridMap(room);
      return;
    }

    const width = room.width;
    const height = room.height;

    this.map = this.make.tilemap({
      width,
      height,
      tileWidth: room.tileSize,
      tileHeight: room.tileSize
    });

    const tileset = this.map.addTilesetImage('tileset');
    const floorLayer = this.map.createBlankLayer('floor', tileset, 0, 0);
    const wallLayer = this.map.createBlankLayer('walls', tileset, 0, 0);
    const decoLayer = this.map.createBlankLayer('deco', tileset, 0, 0);

    this.floorLayer = floorLayer;
    this.wallLayer = wallLayer;
    this.decoLayer = decoLayer;

    const floorTiles = room.floorTiles;
    const wallTile = room.wallTile;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const floorIndex = floorTiles[
          (x * room.floorPattern.xMultiplier + y * room.floorPattern.yMultiplier) % floorTiles.length
        ];
        floorLayer.putTileAt(floorIndex, x, y);
      }
    }

    room.wallRects.forEach((rect) => {
      this.drawRectWalls(wallLayer, rect.x, rect.y, rect.width, rect.height, wallTile);
    });

    room.doors.forEach((door) => {
      this.carveDoor(wallLayer, door.x, door.y, door.length, door.horizontal);
    });

    room.decor.forEach(({ x, y, tile }) => decoLayer.putTileAt(tile, x, y));

    const blockingIndices = [0, 1, 2, 10, 12, 20, 21, 22];
    wallLayer.setCollision(blockingIndices);

    floorLayer.setDepth(0);
    wallLayer.setDepth(5);
    decoLayer.setDepth(10);

    this.groundLayer = wallLayer;
  }

  createTileGridMap(room) {
    const height = room.tileGrid.length;
    const width = room.tileGrid[0]?.length ?? 0;

    this.map = this.make.tilemap({
      width,
      height,
      tileWidth: room.tileSize,
      tileHeight: room.tileSize
    });

    const tileset = this.map.addTilesetImage('tileset');
    const floorLayer = this.map.createBlankLayer('floor', tileset, 0, 0);
    const wallLayer = this.map.createBlankLayer('walls', tileset, 0, 0);
    const decoLayer = this.map.createBlankLayer('deco', tileset, 0, 0);

    this.floorLayer = floorLayer;
    this.wallLayer = wallLayer;
    this.decoLayer = decoLayer;

    const walkableTiles = new Set(room.walkableTiles || []);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tileIndex = room.tileGrid[y][x];
        if (walkableTiles.has(tileIndex)) {
          floorLayer.putTileAt(tileIndex, x, y);
        } else {
          wallLayer.putTileAt(tileIndex, x, y);
        }
      }
    }

    wallLayer.setCollisionByExclusion([-1]);

    floorLayer.setDepth(0);
    wallLayer.setDepth(5);
    decoLayer.setDepth(10);

    this.groundLayer = wallLayer;
  }

  createTilesetReferenceMap(room) {
    const tilesetTexture = this.textures.get('tileset').getSourceImage();
    const columns = Math.floor(tilesetTexture.width / room.tileSize);
    const rows = Math.floor(tilesetTexture.height / room.tileSize);

    this.map = this.make.tilemap({
      width: columns,
      height: rows,
      tileWidth: room.tileSize,
      tileHeight: room.tileSize
    });

    const tileset = this.map.addTilesetImage('tileset');
    const floorLayer = this.map.createBlankLayer('floor', tileset, 0, 0);
    const wallLayer = this.map.createBlankLayer('walls', tileset, 0, 0);
    const decoLayer = this.map.createBlankLayer('deco', tileset, 0, 0);

    this.floorLayer = floorLayer;
    this.wallLayer = wallLayer;
    this.decoLayer = decoLayer;

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        floorLayer.putTileAt(y * columns + x, x, y);
      }
    }

    floorLayer.setDepth(0);
    wallLayer.setDepth(5);
    decoLayer.setDepth(10);

    this.groundLayer = wallLayer;
  }

  createTileDebugOverlay() {
    this.tileDebugContainer = this.add.container(0, 0).setDepth(900).setVisible(false);

    const room = this.currentRoom || {};
    const walkable = new Set(room.walkableTiles || []);
    const blockingLogical = new Set([0, 1, 2, 10, 12, 20, 21, 22]);

    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        const decoTile = this.decoLayer.getTileAt(x, y);
        const wallTile = this.wallLayer.getTileAt(x, y);
        const floorTile = this.floorLayer.getTileAt(x, y);

        const topTile = decoTile || wallTile || floorTile;
        const logicalIndex = topTile && topTile.index !== -1 ? topTile.index : -1;

        const gfx = this.add.rectangle(
          x * this.map.tileWidth + this.map.tileWidth / 2,
          y * this.map.tileHeight + this.map.tileHeight / 2,
          this.map.tileWidth,
          this.map.tileHeight,
          0x000000,
          0
        );

        if (logicalIndex !== -1) {
          if (walkable.has(logicalIndex)) {
            gfx.setFillStyle(0x00ff00, 0.15);
          } else if (blockingLogical.has(logicalIndex)) {
            gfx.setFillStyle(0xff0000, 0.2);
          } else {
            gfx.setFillStyle(0xffff00, 0.08);
          }
        }

        const label = this.add.text(
          x * this.map.tileWidth + 2,
          y * this.map.tileHeight + 2,
          `${logicalIndex}`,
          {
            fontSize: '10px',
            color: '#00ff8a'
          }
        );

        this.tileDebugContainer.add(gfx);
        this.tileDebugContainer.add(label);
      }
    }
  }

  drawRectWalls(layer, x, y, width, height, tileIndex) {
    for (let tx = x; tx < x + width; tx += 1) {
      layer.putTileAt(tileIndex, tx, y);
      layer.putTileAt(tileIndex, tx, y + height - 1);
    }

    for (let ty = y; ty < y + height; ty += 1) {
      layer.putTileAt(tileIndex, x, ty);
      layer.putTileAt(tileIndex, x + width - 1, ty);
    }
  }

  carveDoor(layer, x, y, length, horizontal) {
    for (let i = 0; i < length; i += 1) {
      const tx = horizontal ? x + i : x;
      const ty = horizontal ? y : y + i;
      layer.removeTileAt(tx, ty);
    }
  }

  onPlayerTileCollision(player, tile) {
    try {
      const idx = tile && tile.index !== undefined ? tile.index : -1;
      const tx = tile && tile.x !== undefined ? tile.x : null;
      const ty = tile && tile.y !== undefined ? tile.y : null;
      const floorT = tx !== null ? this.floorLayer.getTileAt(tx, ty) : null;
      const wallT = tx !== null ? this.wallLayer.getTileAt(tx, ty) : null;
      const decoT = tx !== null ? this.decoLayer.getTileAt(tx, ty) : null;

      const worldX = tile.pixelX + this.map.tileWidth / 2;
      const worldY = tile.pixelY + this.map.tileHeight / 2;
      const rect = this.add.rectangle(worldX, worldY, this.map.tileWidth, this.map.tileHeight, 0xff0000, 0.4).setDepth(2000);
      this.time.delayedCall(200, () => rect.destroy());
      // collision debug output disabled
    } catch (e) {
      // ignore
    }
  }
}