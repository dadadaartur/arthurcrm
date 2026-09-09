<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Битва за Пирожок — Весёлая версия</title>
  <style>
    body { margin: 0; overflow: hidden; background: #000; font-family: Arial; }
    #ui {
      position: absolute; top: 20px; left: 20px; color: white;
      background: rgba(0,0,0,0.6); padding: 10px; border-radius: 8px;
      pointer-events: none; z-index: 10;
    }
    #ui div { margin: 4px 0; }
    #crosshair {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
      font-size: 24px; color: rgba(255,255,255,0.7); pointer-events: none; z-index: 5;
    }
    #victory {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: gold; font-size: 3rem; background: rgba(0,0,0,0.8); padding: 20px;
      border-radius: 20px; display: none; z-index: 20; text-align: center;
    }
    .inventory-slot { display: inline-block; width: 30px; height: 30px; border: 2px solid white; border-radius: 5px; text-align: center; line-height: 30px; margin: 0 5px; }
    .inventory-slot.active { border-color: gold; box-shadow: 0 0 8px gold; }
  </style>
</head>
<body>
  <div id="ui">
    <div>🛡️ Артур</div>
    <div>💀 Врагов: <span id="enemy-count">2</span> | Оглушено: <span id="stunned-count">0</span></div>
    <div>🎒 Инвентарь: <span id="inv-slot-1" class="inventory-slot active">-</span><span id="inv-slot-2" class="inventory-slot">-</span></div>
    <div>ЛКМ — прицельный бросок | E — подобрать | 1-2 — слоты | ПКМ — обзор</div>
    <div id="power-indicator" style="color:orange;display:none;">Сила: <span id="power-value">0</span>%</div>
  </div>
  <div id="crosshair">+</div>
  <div id="victory">🏆 ПИРОЖОК ТВОЙ!<br><small>Все враги оглушены</small></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script>
    // ==================== НАСТРОЙКА СЦЕНЫ ====================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 20, 60);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 150);
    camera.position.set(0, 8, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Освещение
    scene.add(new THREE.AmbientLight(0x99bbff, 0.6));
    const sun = new THREE.DirectionalLight(0xfff5e6, 1);
    sun.position.set(40, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 512;
    sun.shadow.mapSize.height = 512;
    scene.add(sun);

    // Земля
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(40, 64),
      new THREE.MeshStandardMaterial({ color: 0x7ec850, roughness: 0.8 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Декорации (деревья, кусты, камни)
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 25;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.5), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
      trunk.position.y = 1.25; trunk.castShadow = true; trunk.receiveShadow = true;
      tree.add(trunk);
      const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6), new THREE.MeshStandardMaterial({ color: 0x2d5a27 }));
      foliage.position.y = 2.8; foliage.castShadow = true; foliage.receiveShadow = true;
      tree.add(foliage);
      tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      scene.add(tree);
    }

    // ==================== ЗВУКИ (Web Audio API) ====================
    let audioCtx = null;
    function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    function playSound(freq, duration, type = 'square', vol = 0.1) {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + duration);
    }

    // ==================== ПРЕДМЕТЫ ====================
    const throwables = [];
    function addItem(x, z, type) {
      let geo, mat, name;
      switch(type) {
        case 'stone': geo = new THREE.SphereGeometry(0.22); mat = new THREE.MeshStandardMaterial({ color: 0x888888 }); name = 'камень'; break;
        case 'apple': geo = new THREE.SphereGeometry(0.25); mat = new THREE.MeshStandardMaterial({ color: 0xe74c3c }); name = 'яблоко'; break;
        case 'stick': geo = new THREE.CylinderGeometry(0.1, 0.12, 0.5); mat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b }); name = 'палка'; break;
        case 'mud': geo = new THREE.SphereGeometry(0.2); mat = new THREE.MeshStandardMaterial({ color: 0x6b4c3b }); name = 'ком грязи'; break;
        default: geo = new THREE.SphereGeometry(0.2); mat = new THREE.MeshStandardMaterial({ color: 0xaa88cc }); name = 'пирожок';
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      throwables.push({ mesh, vel: new THREE.Vector3(), holder: null, type, name, trail: [] });
    }

    // Стартовые предметы
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 28;
      const types = ['stone','apple','stick','mud'];
      addItem(Math.cos(a) * r, Math.sin(a) * r, types[Math.floor(Math.random() * types.length)]);
    }
    // Пирожки (цель)
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 15;
      addItem(Math.cos(a) * r, Math.sin(a) * r, 'pie');
    }

    // Пополнение предметов
    setInterval(() => {
      const free = throwables.filter(t => !t.holder && t.vel.length() === 0).length;
      if (free < 20) {
        const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 20;
        const types = ['stone','apple','stick','mud'];
        addItem(player.position.x + Math.cos(a) * r, player.position.z + Math.sin(a) * r, types[Math.floor(Math.random()*types.length)]);
      }
    }, 8000);

    // ==================== ПЕРСОНАЖИ ====================
    function createChar(name, color, pos, isPlayer = false) {
      const g = new THREE.Group();
      // Тело
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8), new THREE.MeshStandardMaterial({ color }));
      body.position.y = 0.6; body.castShadow = true; body.receiveShadow = true; g.add(body);
      // Голова
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8), new THREE.MeshStandardMaterial({ color: 0xffccaa }));
      head.position.y = 1.4; head.castShadow = true; g.add(head);
      // Глаза
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      eyeW.position.set(-0.13, 1.5, 0.33); g.add(eyeW);
      const eyeW2 = eyeW.clone(); eyeW2.position.set(0.13, 1.5, 0.33); g.add(eyeW2);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshStandardMaterial({ color: 0x111122 }));
      pupil.position.set(-0.13, 1.48, 0.4); g.add(pupil);
      const pupil2 = pupil.clone(); pupil2.position.set(0.13, 1.48, 0.4); g.add(pupil2);
      // Рот
      const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12, Math.PI), new THREE.MeshStandardMaterial({ color: 0x552222 }));
      mouth.position.set(0, 1.25, 0.36); mouth.rotation.x = 0.2; g.add(mouth);
      if (isPlayer) {
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0xffaa33 }));
        hat.position.y = 1.75; hat.castShadow = true; g.add(hat);
      }
      // Руки (храним ссылки для анимации)
      const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6);
      const armMat = new THREE.MeshStandardMaterial({ color });
      const armL = new THREE.Group(); armL.add(new THREE.Mesh(armGeo, armMat).translateY(-0.4));
      armL.position.set(-0.55, 1.1, 0); g.add(armL);
      const armR = new THREE.Group(); armR.add(new THREE.Mesh(armGeo, armMat).translateY(-0.4));
      armR.position.set(0.55, 1.1, 0); g.add(armR);
      // Ноги
      const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.7, 6);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x2244aa });
      const legL = new THREE.Group(); legL.add(new THREE.Mesh(legGeo, legMat).translateY(-0.35));
      legL.position.set(-0.2, 0, 0); g.add(legL);
      const legR = new THREE.Group(); legR.add(new THREE.Mesh(legGeo, legMat).translateY(-0.35));
      legR.position.set(0.2, 0, 0); g.add(legR);

      g.position.set(pos.x, 0, pos.z);
      g.castShadow = true; g.receiveShadow = true;
      scene.add(g);

      g.userData = {
        name, team: color, stunned: false, held: [], maxItems: isPlayer ? 2 : 1,
        lastThrow: 0, speed: isPlayer ? 0.12 : 0.07, isPlayer,
        originalColor: color, moveDir: new THREE.Vector3(),
        arms: { left: armL, right: armR }, legs: { left: legL, right: legR },
        bobPhase: Math.random() * Math.PI * 2
      };
      return g;
    }

    const player = createChar('Артур', 0x4488ff, new THREE.Vector3(0, 0, 0), true);
    const enemies = [
      createChar('Зубан', 0xcc6644, new THREE.Vector3(12, 0, 5)),
      createChar('Шустря', 0xaa88cc, new THREE.Vector3(-10, 0, -12))
    ];

    // ==================== ИНВЕНТАРЬ И БРОСОК ====================
    let activeSlot = 0; // 0 или 1
    function pickup(char) {
      if (char.userData.held.length >= char.userData.maxItems) return;
      let closest = null, minDist = 1.8;
      throwables.forEach(t => {
        if (!t.holder) {
          const d = char.position.distanceTo(t.mesh.position);
          if (d < minDist) { minDist = d; closest = t; }
        }
      });
      if (closest) {
        char.userData.held.push(closest);
        closest.holder = char;
        scene.remove(closest.mesh);
        playSound(600, 0.1, 'sine', 0.1);
        updateInventoryUI();
      }
    }

    function throwItem(char, power, direction) {
      if (char.userData.held.length === 0) return;
      if (Date.now() - char.userData.lastThrow < 800) return;
      const item = char.userData.held.shift(); // Бросаем из активного слота (первый)
      if (!item) return;
      char.userData.lastThrow = Date.now();
      item.holder = null;
      item.mesh.position.copy(char.position).add(new THREE.Vector3(0, 1.3, 0).applyQuaternion(char.quaternion));
      item.vel.copy(direction.clone().multiplyScalar(8 + power * 6));
      item.vel.y = 3 + power * 5;
      scene.add(item.mesh);
      playSound(200, 0.2, 'sawtooth', 0.08);
      updateInventoryUI();
      // Эффект броска: создадим trail (след) на несколько кадров
      item.trail = [];
    }

    // Прицельный бросок мышью
    let mouseDown = false, mouseStart = new THREE.Vector2(), mouseCurrent = new THREE.Vector2();
    let chargePower = 0;
    window.addEventListener('mousedown', e => {
      if (e.button === 0 && player.userData.held.length > 0) { // Левая кнопка
        mouseDown = true;
        mouseStart.set(e.clientX, e.clientY);
        document.getElementById('power-indicator').style.display = 'block';
      }
    });
    window.addEventListener('mousemove', e => {
      if (mouseDown) {
        mouseCurrent.set(e.clientX, e.clientY);
        const dist = Math.min(mouseStart.distanceTo(mouseCurrent), 100);
        chargePower = Math.min(dist / 100, 1.0);
        document.getElementById('power-value').textContent = Math.floor(chargePower * 100);
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0 && mouseDown) {
        mouseDown = false;
        document.getElementById('power-indicator').style.display = 'none';
        if (player.userData.held.length > 0) {
          // Направление от камеры в точку клика (или используем направление взгляда игрока)
          const dir = new THREE.Vector3();
          camera.getWorldDirection(dir);
          throwItem(player, chargePower, dir);
        }
        chargePower = 0;
      }
    });

    // Управление камерой мышью (правая кнопка + колесо)
    let cameraAngle = 0, cameraDistance = 8, isRotating = false;
    window.addEventListener('mousedown', e => { if (e.button === 2) isRotating = true; });
    window.addEventListener('mouseup', e => { if (e.button === 2) isRotating = false; });
    window.addEventListener('mousemove', e => {
      if (isRotating) {
        cameraAngle += e.movementX * 0.01;
      }
    });
    window.addEventListener('wheel', e => {
      cameraDistance = Math.max(3, Math.min(20, cameraDistance - e.deltaY * 0.05));
    });
    window.addEventListener('contextmenu', e => e.preventDefault());

    // Клавиатура (не зависит от раскладки)
    const keys = {};
    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyE') { pickup(player); }
      if (e.code === 'Digit1') { activeSlot = 0; updateInventoryUI(); }
      if (e.code === 'Digit2') { activeSlot = 1; updateInventoryUI(); }
      if (e.code === 'KeyQ') { // Быстрый бросок без прицеливания
        if (player.userData.held.length > 0) {
          const dir = new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion);
          throwItem(player, 0.5, dir);
        }
      }
    });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    function updateInventoryUI() {
      const slot1 = document.getElementById('inv-slot-1');
      const slot2 = document.getElementById('inv-slot-2');
      slot1.textContent = player.userData.held[0] ? player.userData.held[0].type : '-';
      slot2.textContent = player.userData.held[1] ? player.userData.held[1].type : '-';
      slot1.className = 'inventory-slot' + (activeSlot === 0 ? ' active' : '');
      slot2.className = 'inventory-slot' + (activeSlot === 1 ? ' active' : '');
    }

    // ==================== ОГЛУШЕНИЕ ====================
    function stun(char) {
      if (char.userData.stunned) return;
      char.userData.stunned = true;
      char.children[0].material.color.set(0xff0000);
      const origY = char.position.y;
      char.position.y += 0.5;
      // Выронить предметы
      while (char.userData.held.length > 0) {
        const item = char.userData.held.pop();
        item.holder = null;
        item.mesh.position.copy(char.position).add(new THREE.Vector3(0, 1, 0));
        item.vel.set((Math.random()-0.5)*2, 2, (Math.random()-0.5)*2);
        scene.add(item.mesh);
      }
      playSound(80, 0.4, 'triangle', 0.15);
      setTimeout(() => {
        char.position.y = origY;
        char.userData.stunned = false;
        char.children[0].material.color.set(char.userData.originalColor);
      }, 2000);
    }

    // ==================== ИИ ВРАГОВ (УЛУЧШЕННЫЙ) ====================
    function updateEnemy(enemy) {
      if (enemy.userData.stunned) return;
      const distToPlayer = enemy.position.distanceTo(player.position);
      const dirToPlayer = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();

      // Патрулирование если игрок далеко
      if (distToPlayer > 12) {
        if (!enemy.userData.patrolTarget) {
          const angle = Math.random() * Math.PI * 2;
          enemy.userData.patrolTarget = new THREE.Vector3(
            enemy.position.x + Math.cos(angle) * 8,
            0,
            enemy.position.z + Math.sin(angle) * 8
          );
        }
        const toTarget = enemy.userData.patrolTarget.clone().sub(enemy.position);
        if (toTarget.length() < 1) enemy.userData.patrolTarget = null;
        else enemy.position.add(toTarget.normalize().multiplyScalar(enemy.userData.speed * 0.5));
        enemy.lookAt(enemy.userData.patrolTarget ? enemy.userData.patrolTarget.x : player.position.x,
                     enemy.position.y,
                     enemy.userData.patrolTarget ? enemy.userData.patrolTarget.z : player.position.z);
      }
      // Сближение и атака
      else if (distToPlayer > 3) {
        enemy.position.add(dirToPlayer.multiplyScalar(enemy.userData.speed));
        enemy.lookAt(player.position.x, enemy.position.y, player.position.z);
      }
      // Бой вблизи
      else {
        // Подбираем если есть место
        if (enemy.userData.held.length < enemy.userData.maxItems) pickup(enemy);
        // Уклонение от летящих предметов
        const incoming = throwables.find(t => !t.holder && t.vel.length() > 1 && t.mesh.position.distanceTo(enemy.position) < 3);
        if (incoming) {
          const evadeDir = new THREE.Vector3().crossVectors(incoming.vel, new THREE.Vector3(0,1,0)).normalize();
          enemy.position.add(evadeDir.multiplyScalar(0.15));
        }
        // Бросок если есть предмет и игрок в поле зрения
        if (enemy.userData.held.length > 0 && Date.now() - enemy.userData.lastThrow > 2000) {
          const throwDir = dirToPlayer.clone();
          throwDir.y += 0.2; // небольшой навес
          throwItem(enemy, 0.4 + Math.random()*0.3, throwDir);
        }
        enemy.lookAt(player.position.x, enemy.position.y, player.position.z);
      }
    }

    // ==================== АНИМАЦИЯ ПЕРСОНАЖЕЙ ====================
    function animateCharacter(char, isMoving) {
      const speed = 10;
      const time = Date.now() * 0.01;
      if (isMoving) {
        char.userData.legs.left.rotation.x = Math.sin(time * speed) * 0.6;
        char.userData.legs.right.rotation.x = Math.sin(time * speed + Math.PI) * 0.6;
        char.userData.arms.left.rotation.x = Math.sin(time * speed + Math.PI) * 0.3;
        char.userData.arms.right.rotation.x = Math.sin(time * speed) * 0.3;
        char.position.y = Math.abs(Math.sin(time * speed * 2)) * 0.05; // подпрыгивание
      } else {
        char.userData.legs.left.rotation.x = 0;
        char.userData.legs.right.rotation.x = 0;
        char.userData.arms.left.rotation.x = 0;
        char.userData.arms.right.rotation.x = 0;
        if (!char.userData.stunned) char.position.y = 0;
      }
    }

    // ==================== ОСНОВНОЙ ЦИКЛ ====================
    function update() {
      // Движение игрока
      if (!player.userData.stunned) {
        const moveVec = new THREE.Vector3();
        if (keys['KeyW'] || keys['ArrowUp']) moveVec.z -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveVec.z += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveVec.x -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveVec.x += 1;
        const isMoving = moveVec.length() > 0;
        if (isMoving) {
          moveVec.normalize().multiplyScalar(player.userData.speed);
          player.position.add(moveVec);
          player.lookAt(player.position.clone().add(moveVec));
        }
        animateCharacter(player, isMoving);
      }

      // Камера
      const camX = player.position.x + Math.sin(cameraAngle) * cameraDistance;
      const camZ = player.position.z + Math.cos(cameraAngle) * cameraDistance;
      const camY = player.position.y + 6;
      camera.position.set(camX, camY, camZ);
      camera.lookAt(player.position.x, player.position.y + 1.2, player.position.z);

      // ИИ врагов
      enemies.forEach(e => {
        updateEnemy(e);
        animateCharacter(e, !e.userData.stunned && e.userData.patrolTarget !== undefined); // условно
      });

      // Физика летящих предметов и трейлы
      for (let i = throwables.length - 1; i >= 0; i--) {
        const t = throwables[i];
        if (t.holder) continue;
        t.mesh.position.add(t.vel.clone().multiplyScalar(0.16));
        t.vel.y -= 0.25;
        // Трейл (частицы)
        if (t.vel.length() > 1) {
          const trailGeo = new THREE.SphereGeometry(0.05, 2);
          const trailMat = new THREE.MeshBasicMaterial({ color: t.mesh.material.color, transparent: true, opacity: 0.5 });
          const trailParticle = new THREE.Mesh(trailGeo, trailMat);
          trailParticle.position.copy(t.mesh.position);
          scene.add(trailParticle);
          t.trail = t.trail || [];
          t.trail.push(trailParticle);
          setTimeout(() => { scene.remove(trailParticle); }, 200);
        }
        // Попадание в землю
        if (t.mesh.position.y < 0.15) {
          t.mesh.position.y = 0.15;
          t.vel.set(0,0,0);
          // Вспышка
          if (Math.random() < 0.5) playSound(150, 0.1, 'sine', 0.05);
        }
        // Попадание в персонажа
        const allChars = [player, ...enemies];
        for (const c of allChars) {
          if (c === t.holder || c.userData.stunned) continue;
          if (c.position.distanceTo(t.mesh.position) < 1.0 && t.vel.length() > 1.5) {
            stun(c);
            t.vel.set(0,0,0);
            scene.remove(t.mesh);
            throwables.splice(i, 1);
            break;
          }
        }
      }

      // UI
      document.getElementById('enemy-count').textContent = enemies.length;
      document.getElementById('stunned-count').textContent = enemies.filter(e => e.userData.stunned).length;
      if (enemies.length > 0 && enemies.every(e => e.userData.stunned)) {
        document.getElementById('victory').style.display = 'block';
      } else {
        document.getElementById('victory').style.display = 'none';
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      update();
      renderer.render(scene, camera);
    }
    initAudio();
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    updateInventoryUI();
  </script>
</body>
</html>
