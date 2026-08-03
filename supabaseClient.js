<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>Небесный Ковчег · Живая команда</title>
  <style>
    body {
      margin: 0;
      overflow: hidden;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    #ui-container {
      position: absolute;
      top: 20px;
      left: 20px;
      color: white;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(12px);
      padding: 15px 20px;
      border-radius: 20px;
      max-width: 300px;
      pointer-events: auto;
      box-shadow: 0 8px 30px rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.2);
      z-index: 10;
    }
    #resources {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(12px);
      padding: 15px 20px;
      border-radius: 20px;
      color: #ffd966;
      font-weight: bold;
      border: 1px solid rgba(255,255,255,0.2);
      z-index: 10;
    }
    .status-bar {
      margin: 8px 0;
      font-size: 14px;
    }
    .npc-status {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .needs {
      display: flex;
      gap: 6px;
      font-size: 12px;
    }
    .need {
      padding: 2px 8px;
      border-radius: 12px;
      background: rgba(255,255,255,0.15);
    }
    .chat-panel {
      position: absolute;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(12px);
      padding: 15px;
      border-radius: 20px;
      color: white;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 200px;
      border: 1px solid rgba(255,255,255,0.3);
      z-index: 10;
    }
    #chat-messages {
      flex: 1;
      overflow-y: auto;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 120px;
    }
    #chat-input-area {
      display: flex;
      gap: 10px;
    }
    #chat-input {
      flex: 1;
      padding: 10px;
      border-radius: 20px;
      border: none;
      background: rgba(255,255,255,0.2);
      color: white;
      font-size: 14px;
    }
    button {
      background: #ffaa00;
      border: none;
      padding: 10px 20px;
      border-radius: 20px;
      cursor: pointer;
      font-weight: bold;
      transition: 0.2s;
    }
    button:hover {
      background: #ffbb33;
    }
    #task-board {
      position: absolute;
      bottom: 240px;
      right: 20px;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(12px);
      padding: 12px;
      border-radius: 16px;
      color: white;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 10;
    }
    .task-btn {
      background: #4a4a8a;
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 12px;
    }
    .highlight {
      color: #ffaa00;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div id="ui-container">
    <h3>👤 Команда</h3>
    <div id="npc-list"></div>
    <button id="load-model-btn" style="margin-top:10px; width:100%;">🧠 Загрузить ИИ-мозги</button>
    <div id="model-status" style="font-size:12px; margin-top:6px;"></div>
  </div>
  <div id="resources">
    <div>📦 Ресурсы для Ковчега</div>
    <div>🪵 Дерево: <span id="wood-count">0</span></div>
    <div>⛓️ Железо: <span id="iron-count">0</span></div>
    <div>🧵 Ткань: <span id="cloth-count">0</span></div>
    <div style="margin-top:8px;">🚀 Модули: <span id="modules-built">0</span>/4</div>
  </div>
  <div id="task-board">
    <div><strong>📋 Задачи</strong></div>
    <button class="task-btn" data-task="wood">🪵 Собрать дерево</button>
    <button class="task-btn" data-task="iron">⛓️ Добыть железо</button>
    <button class="task-btn" data-task="cloth">🧵 Соткать ткань</button>
    <button class="task-btn" data-task="rest">😴 Отдыхать</button>
    <div style="font-size:11px;">Выбери NPC и задачу</div>
  </div>
  <div class="chat-panel" id="chat-panel" style="display:none;">
    <div id="chat-messages"></div>
    <div id="chat-input-area">
      <input type="text" id="chat-input" placeholder="Скажи что-нибудь..." />
      <button id="send-btn">Отправить</button>
    </div>
    <div style="font-size:11px; color:#aaa;">Разговор с <span id="chat-target-name"></span></div>
  </div>

  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.128.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.128.0/examples/jsm/"
      }
    }
  </script>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

    // --- Глобальные переменные WebLLM ---
    let chatEngine = null;
    let modelLoaded = false;
    const npcEngines = {};

    // --- Состояние игры ---
    const resources = { wood: 0, iron: 0, cloth: 0, modules: 0 };
    const npcs = [];
    let selectedNpc = null;
    let playerCharacter = null;
    
    // Потребности NPC (будут обновляться)
    const npcData = {
      bryak: { name: 'Бряк', role: 'Инженер', hunger: 80, fatigue: 80, mood: 80, color: 0x4488ff, pos: {x: -2, z: 1.5} },
      listik: { name: 'Листик', role: 'Травница', hunger: 80, fatigue: 80, mood: 80, color: 0x44aa44, pos: {x: 1.5, z: -1.5} },
      grom: { name: 'Гром', role: 'Охотник', hunger: 80, fatigue: 80, mood: 80, color: 0xaa4444, pos: {x: 2, z: 2} }
    };

    // --- Инициализация Three.js ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 5, 30);
    
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 50);
    camera.position.set(7, 6, 9);
    camera.lookAt(0, 0.5, 0);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI/2.3;
    controls.minDistance = 4;
    controls.maxDistance = 15;
    controls.update();
    
    // Освещение
    const ambient = new THREE.AmbientLight(0x666688);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e6, 1);
    sun.position.set(15, 20, 5);
    sun.castShadow = true;
    sun.receiveShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    
    // --- Постройка мира ---
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x5a8f4a, roughness: 0.8 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 64), groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Ангар
    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.7 });
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 3), hangarMat);
    hangar.position.set(-3, 1.25, -3);
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    scene.add(hangar);
    
    // Верстак
    const benchMat = new THREE.MeshStandardMaterial({ color: 0xccaa88 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), benchMat);
    bench.position.set(-2.5, 0.4, -1.8);
    bench.castShadow = true;
    bench.receiveShadow = true;
    scene.add(bench);
    
    // Кровать
    const bedMat = new THREE.MeshStandardMaterial({ color: 0xddccaa });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 1), bedMat);
    bed.position.set(2.5, 0.2, -2.5);
    bed.castShadow = true;
    bed.receiveShadow = true;
    scene.add(bed);
    
    // Яблоня
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2), trunkMat);
    trunk.position.set(-2.5, 1, 2.5);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.9), leavesMat);
    leaves.position.set(-2.5, 2.2, 2.5);
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    scene.add(leaves);
    // Яблоки
    for (let i=0; i<5; i++) {
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8), new THREE.MeshStandardMaterial({ color: 0xff3333 }));
      apple.position.set(-2.5 + (Math.random()-0.5)*0.8, 2.4 + Math.random()*0.4, 2.5 + (Math.random()-0.5)*0.8);
      apple.castShadow = true;
      scene.add(apple);
    }
    
    // Сундук
    const chestMat = new THREE.MeshStandardMaterial({ color: 0xaa7744 });
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), chestMat);
    chest.position.set(3.5, 0.25, 1.5);
    chest.castShadow = true;
    chest.receiveShadow = true;
    scene.add(chest);
    
    // --- Создание персонажа игрока ---
    function createPlayerCharacter() {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffaa33 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
      
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.2, 8), bodyMat);
      body.position.y = 0.6;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8), skinMat);
      head.position.y = 1.4;
      head.castShadow = true;
      group.add(head);
      
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.1), eyeMat);
      leftEye.position.set(-0.12, 1.5, 0.3);
      group.add(leftEye);
      const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.1), eyeMat);
      rightEye.position.set(0.12, 1.5, 0.3);
      group.add(rightEye);
      
      const nameLabel = new CSS2DObject(Object.assign(document.createElement('div'), {
        textContent: 'Ты (Артур)',
        style: 'color:white; background:rgba(0,0,0,0.7); padding:2px 8px; border-radius:10px; font-size:12px;'
      }));
      nameLabel.position.set(0, 2, 0);
      group.add(nameLabel);
      
      return group;
    }
    playerCharacter = createPlayerCharacter();
    playerCharacter.position.set(0, 0, 0);
    scene.add(playerCharacter);
    
    // --- Создание NPC ---
    function createNPC(data) {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: data.color });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
      
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.1, 8), mat);
      body.position.y = 0.55;
      body.castShadow = true;
      group.add(body);
      
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8), skinMat);
      head.position.y = 1.25;
      head.castShadow = true;
      group.add(head);
      
      const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.08), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      leftEye.position.set(-0.1, 1.35, 0.25);
      group.add(leftEye);
      const rightEye = leftEye.clone();
      rightEye.position.set(0.1, 1.35, 0.25);
      group.add(rightEye);
      
      const nameLabel = new CSS2DObject(Object.assign(document.createElement('div'), {
        textContent: data.name,
        style: `color:white; background:rgba(0,0,0,0.7); padding:2px 8px; border-radius:10px; font-size:12px;`
      }));
      nameLabel.position.set(0, 1.8, 0);
      group.add(nameLabel);
      
      group.position.set(data.pos.x, 0, data.pos.z);
      return group;
    }
    
    const bryak = createNPC(npcData.bryak);
    const listik = createNPC(npcData.listik);
    const grom = createNPC(npcData.grom);
    scene.add(bryak); scene.add(listik); scene.add(grom);
    npcs.push({ mesh: bryak, data: npcData.bryak, id: 'bryak' });
    npcs.push({ mesh: listik, data: npcData.listik, id: 'listik' });
    npcs.push({ mesh: grom, data: npcData.grom, id: 'grom' });
    
    // --- Управление игроком ---
    const keyState = {};
    window.addEventListener('keydown', (e) => { keyState[e.key] = true; });
    window.addEventListener('keyup', (e) => { keyState[e.key] = false; });
    
    // --- UI обновление ---
    function updateUI() {
      document.getElementById('wood-count').textContent = resources.wood;
      document.getElementById('iron-count').textContent = resources.iron;
      document.getElementById('cloth-count').textContent = resources.cloth;
      document.getElementById('modules-built').textContent = resources.modules;
      
      const npcList = document.getElementById('npc-list');
      npcList.innerHTML = '';
      npcs.forEach(n => {
        const d = n.data;
        const div = document.createElement('div');
        div.className = 'status-bar npc-status';
        div.innerHTML = `<strong style="color:#${d.color.toString(16)}">${d.name}</strong> 
          <span class="needs"><span class="need">🍗${Math.round(d.hunger)}</span><span class="need">⚡${Math.round(d.fatigue)}</span><span class="need">😊${Math.round(d.mood)}</span></span>`;
        div.style.cursor = 'pointer';
        div.onclick = () => selectNPC(n);
        npcList.appendChild(div);
      });
    }
    
    function selectNPC(npc) {
      selectedNpc = npc;
      document.getElementById('chat-panel').style.display = 'flex';
      document.getElementById('chat-target-name').textContent = npc.data.name;
      document.getElementById('chat-messages').innerHTML = '';
    }
    
    // Чат
    document.getElementById('send-btn').addEventListener('click', async () => {
      if (!selectedNpc || !modelLoaded) {
        alert('Сначала загрузи ИИ-мозги и выбери персонажа.');
        return;
      }
      const input = document.getElementById('chat-input');
      const msg = input.value.trim();
      if (!msg) return;
      addChatMessage('Ты', msg);
      input.value = '';
      const response = await generateNPCResponse(selectedNpc.id, msg);
      addChatMessage(selectedNpc.data.name, response);
    });
    
    function addChatMessage(sender, text) {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${sender}:</strong> ${text}`;
      document.getElementById('chat-messages').appendChild(div);
      div.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Задачи
    document.querySelectorAll('.task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!selectedNpc) { alert('Сначала выбери персонажа (кликни по нему в списке)'); return; }
        const task = btn.dataset.task;
        assignTask(selectedNpc, task);
      });
    });
    
    function assignTask(npc, task) {
      if (task === 'wood') npc.data.currentTask = 'wood';
      else if (task === 'iron') npc.data.currentTask = 'iron';
      else if (task === 'cloth') npc.data.currentTask = 'cloth';
      else if (task === 'rest') npc.data.currentTask = 'rest';
      addChatMessage('Система', `${npc.data.name} получил задачу: ${task}`);
    }
    
    // --- Игровой цикл (потребности, перемещение) ---
    setInterval(() => {
      npcs.forEach(n => {
        n.data.hunger = Math.max(0, n.data.hunger - 0.5);
        n.data.fatigue = Math.max(0, n.data.fatigue - 0.3);
        n.data.mood = Math.max(0, n.data.mood - 0.2 + (n.data.currentTask ? 0.3 : 0));
        
        if (n.data.hunger < 30) {
          n.mesh.position.lerp(new THREE.Vector3(-2.5, 0, 2.5), 0.02);
          if (n.mesh.position.distanceTo(new THREE.Vector3(-2.5, 0, 2.5)) < 1) {
            n.data.hunger = Math.min(100, n.data.hunger + 5);
          }
        } else if (n.data.fatigue < 30) {
          n.mesh.position.lerp(new THREE.Vector3(2.5, 0, -2.5), 0.02);
        } else if (n.data.currentTask === 'wood') {
          n.mesh.position.lerp(new THREE.Vector3(-2, 0, 1), 0.02);
          if (Math.random() < 0.02) resources.wood += 1;
        } else if (n.data.currentTask === 'iron') {
          n.mesh.position.lerp(new THREE.Vector3(3, 0, -1), 0.02);
          if (Math.random() < 0.02) resources.iron += 1;
        } else if (n.data.currentTask === 'cloth') {
          n.mesh.position.lerp(new THREE.Vector3(1, 0, 2), 0.02);
          if (Math.random() < 0.02) resources.cloth += 1;
        }
      });
      
      // Движение игрока
      if (keyState['ArrowUp']) playerCharacter.position.z -= 0.08;
      if (keyState['ArrowDown']) playerCharacter.position.z += 0.08;
      if (keyState['ArrowLeft']) playerCharacter.position.x -= 0.08;
      if (keyState['ArrowRight']) playerCharacter.position.x += 0.08;
      
      updateUI();
    }, 100);
    
    // --- WebLLM интеграция (исправлено) ---
    document.getElementById('load-model-btn').addEventListener('click', async () => {
      const status = document.getElementById('model-status');
      status.textContent = 'Загрузка модели... (может занять минуту)';
      try {
        const { CreateMLCEngine } = await import('https://unpkg.com/@mlc-ai/web-llm@0.2.46/lib/index.js');
        // Используем стабильную модель, точно доступную в WebLLM
        const modelId = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
        chatEngine = await CreateMLCEngine({ model: modelId });
        modelLoaded = true;
        status.textContent = `✅ Модель ${modelId} готова!`;
        
        for (let npc of npcs) {
          npcEngines[npc.id] = chatEngine;
        }
      } catch (e) {
        console.error(e);
        status.textContent = '❌ Ошибка: ' + e.message;
        // Попробуем другую модель, если первая не найдена
        try {
          status.textContent = 'Пробую резервную модель...';
          const { CreateMLCEngine } = await import('https://unpkg.com/@mlc-ai/web-llm@0.2.46/lib/index.js');
          chatEngine = await CreateMLCEngine({ model: 'gemma-2-2b-it-q4f16_1-MLC' });
          modelLoaded = true;
          status.textContent = '✅ Модель gemma-2-2b-it готова!';
          for (let npc of npcs) {
            npcEngines[npc.id] = chatEngine;
          }
        } catch (fallbackError) {
          status.textContent = '❌ Обе модели не загрузились. Проверь консоль.';
        }
      }
    });
    
    async function generateNPCResponse(npcId, userMessage) {
      if (!modelLoaded) return 'Модель не загружена.';
      const npc = npcs.find(n => n.id === npcId);
      const prompt = `Ты — ${npc.data.name}, ${npc.data.role}. Твои потребности: голод ${Math.round(npc.data.hunger)}%, усталость ${Math.round(npc.data.fatigue)}%, настроение ${Math.round(npc.data.mood)}%. Ты в команде по строительству летучего корабля. Ответь на реплику руководителя: "${userMessage}"`;
      try {
        const reply = await chatEngine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 80
        });
        return reply.choices[0].message.content;
      } catch (e) {
        return '... (думает)';
      }
    }
    
    // Анимационный цикл
    function animate() {
      requestAnimationFrame(animate);
      controls.target.copy(playerCharacter.position.clone().add(new THREE.Vector3(0, 1, 0)));
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    console.log('🚀 Прототип готов! Нажми "Загрузить ИИ-мозги", чтобы оживить персонажей.');
  </script>
</body>
</html>
