// ============================================================
// ACORDELOT ENGINE v1.0 — "The Kingdom of Music"
// ============================================================
'use strict';

const SCREEN_W = 1024;
const SCREEN_H = 571;

const SCENE_NAMES = {
  '0_0': '🏰 Vila Medieval',
  '1_0': '🌲 Floresta Mágica',
  '2_0': '🎹 Conservatório',
  '0_1': '🏰 Portões Reais',
  '1_1': '🌿 Entrada Floresta',
  '2_1': '🌳 Bosque de Treino',
  '3_1': '🍃 Clareira',
  '3_0': '🌲 Floresta Profunda',
};

// ============================================================
// DOM REFS
// ============================================================
let canvas, ctx, skinShopVideo;
let loadingOverlay, toastEl, questNotif, questNotifTitle, questNotifObj;
let nameInputOverlay, playerNameInput, confirmNameBtn;
let fpsDisplay, statusMap, statusPos, statusFPS;
let activeMapSelect, npcHierarchyList;
let inspEmpty, inspNPCPanel;
let inspName, inspType, inspX, inspY, inspMap, inspDialogue, inspRadius, inspScale, inspFlip, inspTriggered;
let applyNPCBtn, deleteNPCBtn;
let playBtn, stopBtn, saveProjectBtn;
let brushSizeSelect, fillDefaultBtn, clearLayerBtn, saveLayersBtn;
let resetGridBtn, saveWorldBtn;
let wasdPanel, keyW, keyA, keyS, keyD, keyE;
let activeQuestsList;
let bottomPanel, panelHandle;

// ============================================================
// ENGINE STATE
// ============================================================
let engineMode = 'scene';
let sceneSubTool = 'select';
let collisionTool = 'road';
let worldMapSubTool = 'drag';
let isPlayMode = false;
let selectedNPC = null;
let draggingNPC = null;
let hoveredNPC = null;
// Drag is armed on mousedown but only begins past DRAG_SLOP, so a plain click still just selects.
let dragCandidate = null, dragStart = {x:0,y:0};
const DRAG_SLOP = 3;
let dragOffX = 0, dragOffY = 0;
let npcPlacingMode = false;
let pendingElement = null;   // {type,name} escolhido na galeria, aguardando clique no mapa
let mouseCanvasX = 0, mouseCanvasY = 0;
let frameCount = 0, lastFPSTime = 0, currentFPS = 60;

// ============================================================
// WORLD SYSTEM
// ============================================================
let gridPos = {
  '0_0': { col:0, row:0 }, '1_0': { col:1, row:0 }, '2_0': { col:2, row:0 },
  '0_1': { col:0, row:1 }, '1_1': { col:1, row:1 },
  // Training grounds east of the forest entrance — rearrange freely in Mapa-Múndi.
  '2_1': { col:2, row:1 }, '3_1': { col:3, row:1 }, '3_0': { col:3, row:0 },
};
let spawns = {
  '0_0': {x:512,y:300}, '1_0': {x:512,y:300}, '2_0': {x:512,y:300},
  '0_1': {x:512,y:400}, '1_1': {x:512,y:420},
  '2_1': {x:512,y:400}, '3_1': {x:512,y:400}, '3_0': {x:512,y:400},
};
let worldGrid = {};
function rebuildGrid() {
  worldGrid = {};
  for (const [k, pos] of Object.entries(gridPos)) {
    if (!worldGrid[pos.row]) worldGrid[pos.row] = {};
    worldGrid[pos.row][pos.col] = k;
  }
}
// ── Gates ──────────────────────────────────────────────────
// Travel between maps is done entirely by signpost NPCs (type `signpost`, with
// targetMapKey/targetX/targetY). Walking into a map border does nothing — the old
// edge-crossing and gate system was removed on purpose.
//
// getNeighbor() survives only because the Mapa-Múndi editor still draws the grid and
// its direction arrows; nothing in play mode reads it.
function getNeighbor(key, dir) {
  const pos = gridPos[key]; if (!pos) return null;
  let r = pos.row, c = pos.col;
  if (dir==='north') r--; if (dir==='south') r++;
  if (dir==='east') c++;  if (dir==='west') c--;
  return worldGrid[r]?.[c] || null;
}

// ============================================================
// ASSETS
// ============================================================
const bgImages = {};
const bgSources = {
  '0_0':'assets/background.jpg', '1_0':'assets/background2.jpg',
  '2_0':'assets/conservatory.jpg', '0_1':'assets/gate.jpg', '1_1':'assets/forest_entry.jpg',
  '2_1':'assets/forest_training.jpg', '3_1':'assets/forest_clearing.jpg', '3_0':'assets/forest_deep.jpg',
};
let spriteRaw = new Image(), processedSprite = null;
let guardSpriteRaw = new Image(), processedGuard = null;
let assetsLoaded = 0;
const totalAssets = Object.keys(bgSources).length + 2; // +player sprite +guard sprite

function onAssetLoad() {
  assetsLoaded++;
  if (assetsLoaded >= totalAssets) {
    processPlayerSprite();
    processGuardSprite();
    finishInit();
  }
}

for (const [k, src] of Object.entries(bgSources)) {
  const img = new Image();
  img.onload = img.onerror = onAssetLoad;
  img.src = src;
  bgImages[k] = img;
}
spriteRaw.onload = spriteRaw.onerror = onAssetLoad;
spriteRaw.src = 'assets/spritesheet.jpg';
guardSpriteRaw.onload = guardSpriteRaw.onerror = onAssetLoad;
guardSpriteRaw.src = 'assets/guard_sprite.jpg';

function processPlayerSprite() {
  try {
    const off = document.createElement('canvas');
    off.width = spriteRaw.width || 1; off.height = spriteRaw.height || 1;
    const oc = off.getContext('2d'); oc.drawImage(spriteRaw, 0, 0);
    const id = oc.getImageData(0,0,off.width,off.height); const d = id.data;
    for (let i=0; i<d.length; i+=4) { if (d[i]>210 && d[i+1]>210 && d[i+2]>210) d[i+3]=0; }
    oc.putImageData(id,0,0); processedSprite = off;
    if (typeof renderHeroAvatars === 'function') renderHeroAvatars();
  } catch(e) {}
}

function processGuardSprite() {
  try {
    const off = document.createElement('canvas');
    off.width = guardSpriteRaw.width || 1; off.height = guardSpriteRaw.height || 1;
    const oc = off.getContext('2d'); oc.drawImage(guardSpriteRaw, 0, 0);
    const id = oc.getImageData(0,0,off.width,off.height); const d = id.data;
    // Remove white background (>240 on all channels)
    for (let i=0; i<d.length; i+=4) {
      if (d[i]>230 && d[i+1]>230 && d[i+2]>230) d[i+3]=0;
    }
    oc.putImageData(id,0,0); processedGuard = off;
  } catch(e) {}
}

// ============================================================
// DATA: Dialogues, NPCs, Quests
// ============================================================
let dialogueCache = {}, npcData = [], questsData = [];

async function loadDialogue(id) {
  if (dialogueCache[id]) return dialogueCache[id];
  try {
    const r = await fetch(`assets/dialogues/${id}.json?t=${Date.now()}`);
    dialogueCache[id] = await r.json(); return dialogueCache[id];
  } catch(e) { return null; }
}

async function loadNPCs() {
  try {
    const r = await fetch(`assets/npcs.json?t=${Date.now()}`);
    npcData = (await r.json()).npcs || [];
  } catch(e) {
    npcData = [{ id:'city_guard', name:'Guarda Renaldo', type:'guard', mapKey:'0_1', x:440, y:320, triggerRadius:90, dialogue:'guard_intro', triggered:false, flipX:false, scale:1.0 }];
  }
  aplicarDialogosDaHistoria();
  refreshNPCHierarchy();
}

// Quem fala o quê é dado de história, não de posicionamento. O editor regrava o
// npcs.json a cada alteração, e uma aba antiga aberta já apagou esses vínculos uma vez.
// Aqui eles são reamarrados por nome no carregamento, então não se perdem mais.
const DIALOGOS_DA_HISTORIA = {
  'Bardo Lucian':     'bardo_lucian',
  'Mercador Tibério': 'mercador_tiberio',
  'Ferreiro Dorn':    'ferreiro_dorn',
  'Guarda Renaldo':   'guard_intro',
  'Sr. Antony':       'sr_antony_tutorial',
};
function aplicarDialogosDaHistoria() {
  npcData.forEach(n => {
    const dlgId = DIALOGOS_DA_HISTORIA[n.name];
    if (!dlgId) return;
    if (!n.dialogue || n.dialogue === 'none') n.dialogue = dlgId;
    if (!n.triggerRadius) n.triggerRadius = 90;   // raio 0 deixa o NPC mudo
  });
}

async function loadQuests() {
  try {
    const r = await fetch(`assets/quests/quests.json?t=${Date.now()}`);
    questsData = (await r.json()).quests || [];
  } catch(e) { questsData=[]; }
}

// Runtime-only fields must never reach the JSON. They hold performance.now() timestamps,
// which restart at 0 on reload — a saved `depletedUntil` of 99886 left a gathering spot
// dead for the first 100 seconds of every session.
const NPC_RUNTIME_FIELDS = ['hits','shakeUntil','depletedUntil','_npcRef','oculto','acenaAte','andandoAte'];
function serialisableNPC(n) {
  const out = {};
  for (const k in n) if (!NPC_RUNTIME_FIELDS.includes(k)) out[k] = n[k];
  return out;
}

async function saveNPCs() {
  if (IS_PLAY_BUILD) return;
  const payload = { npcs: npcData.map(serialisableNPC) };
  try { localStorage.setItem('wasd_npcs_v2', JSON.stringify(payload)); } catch(e) {}
  try { await fetch('/save_npcs', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); } catch(e) {}
}

// ...

async function saveMonsters() {
  if (IS_PLAY_BUILD) return;
  const payload = {
    types: monsterDefs,
    // Grava a POSIÇÃO DE CASA, não onde o bicho está passeando neste instante — senão
    // cada save moveria o monstro alguns pixels para sempre.
    spawns: monsters.map(m => ({ id:m.id, type:m.type, mapKey:m.mapKey,
      x:Math.round(m.homeX ?? m.x), y:Math.round(m.homeY ?? m.y),
      escala:m.escala || 1, flipX: !!m.flipX })),
  };
  const corpo = JSON.stringify(payload);

  // O SERVIDOR VEM PRIMEIRO: assets/monsters.json é a fonte da verdade — é ele que o
  // jogo carrega e é ele que vai no deploy. O localStorage é só reserva e vive
  // estourando a cota (as camadas guardam imagens em base64), então nunca pode rodar
  // antes daqui nem derrubar o envio.
  //
  // E o resultado tem que APARECER. Um `catch(e){}` mudo já custou uma sessão inteira
  // de edição de monstros: o jogo dizia "salvo" e o arquivo continuava intacto.
  try {
    const r = await fetch('/save_monsters', { method:'POST',
      headers:{'Content-Type':'application/json'}, body:corpo });
    if (!r.ok) showToast(`⚠️ Servidor recusou os monstros (HTTP ${r.status}) — NÃO salvo`);
    else if (window.__logSaveMonstros) console.log('[monstros] gravados:', payload.spawns.length);
  } catch (e) {
    showToast('⚠️ Monstros NÃO salvos: sem resposta do servidor');
    console.error('[monstros] falha ao gravar:', e);
  }

  try { localStorage.setItem('acordelot_monsters_v1', corpo); } catch (e) {}
}

// ============================================================
// LAYER SYSTEM
// ============================================================
const screenLayers = {};
function getLayers(key) {
  if (!screenLayers[key]) {
    const mk = () => { const c=document.createElement('canvas'); c.width=SCREEN_W; c.height=SCREEN_H; const ct=c.getContext('2d'); ct.imageSmoothingEnabled=false; return {canvas:c,ctx:ct}; };
    const rd=mk(), fg=mk(), dr=mk();
    screenLayers[key] = { roadCanvas:rd.canvas, roadCtx:rd.ctx, fgCanvas:fg.canvas, fgCtx:fg.ctx, doorCanvas:dr.canvas, doorCtx:dr.ctx };
  }
  return screenLayers[key];
}
async function loadLayers() {
  await Promise.all(chavesDeCenario().map(k => loadLayerKey(k)));
  // Masks just changed under us — drop the derived caches.
  chavesDeCenario().forEach(k => { invalidateRoadPaint(k); invalidateDoorMarkers(k); });
}
function loadLayerKey(k) {
  return new Promise(resolve => {
    const L=getLayers(k); let done=0;
    const items=[
      {ctx:L.roadCtx, url:`assets/acordelot_road_${k}_mask.png`, ls:`wasd_road_${k}_v17`},
      {ctx:L.fgCtx,   url:`assets/acordelot_fg_${k}_mask.png`,   ls:`wasd_fg_${k}_v17`},
      {ctx:L.doorCtx, url:`assets/acordelot_door_${k}_mask.png`,  ls:`wasd_door_${k}_v17`},
    ];
    items.forEach(item => {
      const img=new Image();
      img.onload=()=>{item.ctx.clearRect(0,0,SCREEN_W,SCREEN_H);item.ctx.drawImage(img,0,0,SCREEN_W,SCREEN_H);done++;if(done>=3)resolve();};
      img.onerror=()=>{
        const ls=localStorage.getItem(item.ls);
        if(ls){const i2=new Image();i2.onload=()=>{item.ctx.clearRect(0,0,SCREEN_W,SCREEN_H);item.ctx.drawImage(i2,0,0,SCREEN_W,SCREEN_H);};i2.src=ls;}
        done++;if(done>=3)resolve();
      };
      img.src=item.url+'?t='+Date.now();
    });
  });
}
async function saveAllLayers(notify=false) {
  if (IS_PLAY_BUILD) return;
  rebuildGrid();
  const wc={gridPos,spawns,bgSources,sceneNames:SCENE_NAMES,startMap,ambience,videoSources}, payload={worldConfig:wc};
  for (const k of chavesDeCenario()) {
    const L=getLayers(k);
    const rd=L.roadCanvas.toDataURL('image/png'), fg=L.fgCanvas.toDataURL('image/png'), dr=L.doorCanvas.toDataURL('image/png');
    payload[`road_${k}`]=rd; payload[`fg_${k}`]=fg; payload[`door_${k}`]=dr;
    try { localStorage.setItem(`wasd_road_${k}_v17`,rd); localStorage.setItem(`wasd_fg_${k}_v17`,fg); localStorage.setItem(`wasd_door_${k}_v17`,dr); localStorage.setItem('wasd_world_config_v17',JSON.stringify(wc)); } catch(e) {}
  }
  try { await fetch('/save_layers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(notify)showToast('💾 Projeto salvo em disco!'); }
  catch(e) { if(notify)showToast('💾 Salvo no navegador!'); }
}
async function loadWorldConfig() {
  try {
    const r=await fetch(`assets/acordelot_world_config.json?t=${Date.now()}`);
    const c=await r.json();
    if(c.gridPos)Object.assign(gridPos,c.gridPos);
    if(c.spawns)Object.assign(spawns,c.spawns);
    if(c.bgSources)Object.assign(bgSources,c.bgSources);
    if(c.sceneNames)Object.assign(SCENE_NAMES,c.sceneNames);
    if(c.startMap)startMap=c.startMap;
    if(c.ambience)Object.assign(ambience,c.ambience);
    if(c.videoSources)Object.assign(videoSources,c.videoSources);
  } catch(e) {
    const ls=localStorage.getItem('wasd_world_config_v17');
    if(ls){
      try{
        const c=JSON.parse(ls);
        if(c.gridPos)Object.assign(gridPos,c.gridPos);
        if(c.spawns)Object.assign(spawns,c.spawns);
        if(c.bgSources)Object.assign(bgSources,c.bgSources);
        if(c.sceneNames)Object.assign(SCENE_NAMES,c.sceneNames);
        if(c.startMap)startMap=c.startMap;
        if(c.ambience)Object.assign(ambience,c.ambience);
        if(c.videoSources)Object.assign(videoSources,c.videoSources);
      }catch(ee){}
    }
  }
  for (const [k, src] of Object.entries(bgSources)) {
    if (!bgImages[k]) {
      const img = new Image();
      img.src = src;
      bgImages[k] = img;
    }
  }
  rebuildGrid();
  refreshMapSelect();
}

// ============================================================
// PLAYER
// ============================================================
let currentKey = '0_1', currentScene = 'world', playerName = '';
// Cenários animados: o fundo é um vídeo em laço desenhado NO canvas, então colisão,
// camada de teto, placas e monstros funcionam exatamente como num cenário de imagem.
let videoSources = {};
const videoMapas = {};      // mapKey -> <video>
// Lista única de cenários: imagem ou vídeo, os dois contam igual para o editor.
function cenarioExiste(k) { return !!(bgSources[k] || videoSources[k]); }
function chavesDeCenario() {
  return [...new Set([...Object.keys(bgSources), ...Object.keys(videoSources)])];
}
// Cenário onde o jogo começa. Vem do acordelot_world_config.json (campo `startMap`),
// para trocar o ponto de surgimento sem mexer em código.
let startMap = '0_1';
// Clima permanente de cada cenário (noite, névoa). Vive no world config, então é
// ajuste de dados, não de código: { "1_1": { "escuro": 0.5, "cor": "#0b1220" } }
let ambience = {};
const player = { x:512, y:400, width:48, height:64, speed:3.9, sprintSpeed:6.65, direction:'down', isMoving:false, animFrame:0, animTimer:0 };
let playerLocked = false, savedDoorPos = {x:512,y:380}, savedDoorMap = null, lastTransTime=0, bordaTravada=false, lastDoorTime=0, lastDeadEndToast=0 /* unused */;
const keys = {w:false,a:false,s:false,d:false,shift:false};
// Analog thumb stick — overrides the keys while held. Magnitude drives speed, so a
// small push walks and a full push sprints.
const stick = { active:false, x:0, y:0 };

// One entry point for "do the thing": the E key, the desktop pill and the touch button
// all land here, so they can never drift apart.
function doAction() {
  if (dlg.state===DLG_STATE.TYPING || dlg.state===DLG_STATE.WAITING) { advanceDlg(); return; }
  if (dlg.state===DLG_STATE.CHOOSING) return; // a choice has to be tapped
  tryTalk();
}

window.addEventListener('keydown', e => {
  if ((e.code==='Space'||e.code==='Enter'||e.code==='KeyE') && avancarCena()) { e.preventDefault(); return; }
  if (dlg.state !== DLG_STATE.CLOSED) { handleDlgKey(e); return; }
  // Arrow-key nudge for pixel-level placement while editing (Shift = 10px steps).
  if (!isPlayMode && selectedNPC && engineMode==='scene' && e.key.startsWith('Arrow')
      && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    if (e.key==='ArrowLeft')  selectedNPC.x -= step;
    if (e.key==='ArrowRight') selectedNPC.x += step;
    if (e.key==='ArrowUp')    selectedNPC.y -= step;
    if (e.key==='ArrowDown')  selectedNPC.y += step;
    syncInspector(selectedNPC); saveNPCs();
    return;
  }
  const k=e.key.toLowerCase();
  if(k==='w'||k==='arrowup'){keys.w=true;keyW?.classList.add('active');}
  if(k==='a'||k==='arrowleft'){keys.a=true;keyA?.classList.add('active');}
  if(k==='s'||k==='arrowdown'){keys.s=true;keyS?.classList.add('active');}
  if(k==='d'||k==='arrowright'){keys.d=true;keyD?.classList.add('active');}
  if(k==='e'){e.preventDefault();keyE?.classList.add('active');doAction();}
  if(e.key==='Shift')keys.shift=true;
  if(e.key==='Escape'&&engineMode==='mundo'){
    e.preventDefault();
    // Esc primeiro solta a estrada em andamento; só depois sai do modo andar.
    if(estradaDe){estradaDe=null;estradaAte=null;showToast('🛣️ Traçado encerrado');}
    else if(mundoTeste) mundoTestar(false);
  }
  if(e.key==='F5'){e.preventDefault();togglePlay();}
});
window.addEventListener('keyup', e => {
  const k=e.key.toLowerCase();
  if(k==='w'||k==='arrowup'){keys.w=false;keyW?.classList.remove('active');}
  if(k==='a'||k==='arrowleft'){keys.a=false;keyA?.classList.remove('active');}
  if(k==='s'||k==='arrowdown'){keys.s=false;keyS?.classList.remove('active');}
  if(k==='d'||k==='arrowright'){keys.d=false;keyD?.classList.remove('active');}
  if(k==='e')keyE?.classList.remove('active');
  if(e.key==='Shift')keys.shift=false;
});

// Audio
let audioCtx=null;
function initAudio(){if(!audioCtx){const A=window.AudioContext||window.webkitAudioContext;if(A)audioCtx=new A();}audioCtx?.state==='suspended'&&audioCtx.resume();}
function playStep(sprint){if(!audioCtx)return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(sprint?180:130,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(30,audioCtx.currentTime+0.08);g.gain.setValueAtTime(0.09,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.08);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+0.08);}catch(e){}}

// ============================================================
// NPC DRAWING — Guard (using sprite asset)
// ============================================================
// On-screen height (world px) of an NPC at scale 1 — player is 64 tall for reference.
const NPC_BASE_H = 68;

function drawGuard(ctx2, npc, t) {
  const scale = npc.scale || 1.0;
  const frameW = processedGuard ? Math.floor(processedGuard.width / 4) : 64;
  const frameH = processedGuard ? processedGuard.height : 80;
  // Derive size from a target height so it stays proportional to any sprite sheet.
  const dispH = Math.round(NPC_BASE_H * scale);
  const dispW = Math.round(dispH * (frameW / frameH));

  // The sheet is a 4-frame walk cycle with no standing pose, so cycling frames on a
  // stationary NPC reads as "walking in place". Hold frame 0 (the most neutral stance)
  // and get the life back from a breathing squash instead.
  const isTalking = dlg.state !== DLG_STATE.CLOSED && dlg.npc === npc;
  const breath = Math.sin(t * (isTalking ? 0.006 : 0.0022));
  const amt = isTalking ? 0.03 : 0.015;
  const h = dispH * (1 + breath * amt);
  const w = dispW * (1 - breath * amt * 0.5); // slight counter-squash keeps the volume honest
  const frame = 0;

  ctx2.save();
  ctx2.translate(npc.x, npc.y);
  if (npc.flipX) ctx2.scale(-1, 1);
  if (processedGuard) {
    // Feet stay planted at npc.y — only the top of the sprite moves.
    ctx2.drawImage(processedGuard, frame*frameW, 0, frameW, frameH, -w/2, -h, w, h);
  } else { fallbackGuard(ctx2, npc, t); }
  ctx2.restore();
}

// Fallback if sprite not loaded
function fallbackGuard(ctx2, npc, t) {
  const bob = Math.sin(t*0.003)*1.5;
  ctx2.fillStyle='#1d4ed8'; ctx2.fillRect(-12,-44,24,40);
  ctx2.fillStyle='#9ca3af'; ctx2.fillRect(-11,-50,22,12);
  ctx2.fillStyle='#d4a27a'; ctx2.fillRect(-8,-46,16,14);
  ctx2.fillStyle='#1e293b'; ctx2.fillRect(-5,-42,4,3); ctx2.fillRect(2,-42,4,3);
  ctx2.strokeStyle='#7c3f1e'; ctx2.lineWidth=1.5;
  ctx2.beginPath(); ctx2.arc(0,-36,4,0.2,Math.PI-0.2); ctx2.stroke();
}

// ============================================================
// SINGLE-POSE NPC SPRITES
// One PNG per villager. Drop a file in assets/ with the name below and it lights up;
// a missing file just leaves the editor placeholder, it never breaks the load.
// ============================================================
const NPC_SPRITE_FILES = {
  sr_antony:  'assets/npc_sr_antony.jpg',
  bard:       'assets/npc_bard.jpg',
  blacksmith: 'assets/npc_blacksmith.jpg',
  child:      'assets/npc_child.jpg',
  elder:      'assets/npc_elder.jpg',
  merchant:   'assets/npc_merchant.jpg',
  villager:   'assets/npc_villager.jpg',
};
const npcSprites = {}; // type -> { canvas, sx, sy, sw, sh }

// Background removal by flood fill from the border instead of a global white threshold.
// A threshold erases white *on* the character too — the villager's apron, eye whites,
// armour highlights all punch holes. Only white connected to the edge is background.
// Generators sometimes draw a decorative frame right at the image edge, which would
// stop a border-seeded flood fill dead and leave the whole background opaque. Find the
// outermost ring that is actually background and start from there.
function findContentInset(d, W, H) {
  const pale = i => d[i*4] > 215 && d[i*4+1] > 215 && d[i*4+2] > 215;
  const max = Math.floor(Math.min(W, H) * 0.12);
  for (let k = 0; k < max; k++) {
    let hit = 0, total = 0;
    for (let x = k; x < W - k; x++) {
      total += 2;
      if (pale(k * W + x)) hit++;
      if (pale((H - 1 - k) * W + x)) hit++;
    }
    for (let y = k + 1; y < H - 1 - k; y++) {
      total += 2;
      if (pale(y * W + k)) hit++;
      if (pale(y * W + (W - 1 - k))) hit++;
    }
    if (total && hit / total > 0.9) return k;
  }
  return 0;
}

function prepareSprite(img) {
  let srcX = 0, srcY = 0, W = img.width, H = img.height;

  // If it's a grid sprite sheet (sr_antony is 5x4), extract just the first frame.
  // Callers also pass plain <canvas> elements (prepareSpriteCell crops a cell first),
  // and those have no .src — reading it unguarded threw and killed every monster sprite.
  if (typeof img.src === 'string' && img.src.includes('sr_antony')) {
    W = Math.floor(img.width / 5);
    H = Math.floor(img.height / 4);
    srcX = 0; srcY = 0;
  }

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, srcX, srcY, W, H, 0, 0, W, H);

  const id = cx.getImageData(0, 0, W, H), d = id.data;

  const k = findContentInset(d, W, H);
  const seen = new Uint8Array(W * H);
  const stack = [];
  if (k > 0) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (x < k || x >= W - k || y < k || y >= H - k) {
        const i = y * W + x;
        d[i*4+3] = 0; seen[i] = 1;
      }
    }
  }
  for (let x = k; x < W - k; x++) { stack.push(k * W + x, (H - 1 - k) * W + x); }
  for (let y = k; y < H - k; y++) { stack.push(y * W + k, y * W + (W - 1 - k)); }
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    const o = i * 4;
    if (!(d[o] > 215 && d[o+1] > 215 && d[o+2] > 215)) continue;
    d[o+3] = 0;
    const x = i % W, y = (i / W) | 0;
    if (x > 0)     stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0)     stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  cx.putImageData(id, 0, 0);

  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 16) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
  return { canvas: c, sx: x0, sy: y0, sw: x1 - x0 + 1, sh: y1 - y0 + 1 };
}

for (const [type, src] of Object.entries(NPC_SPRITE_FILES)) {
  const img = new Image();
  img.onload = () => { try { npcSprites[type] = prepareSprite(img); } catch (e) {} };
  img.onerror = () => {}; // file not supplied yet — placeholder stays
  img.src = src;
}

// Stable per-NPC phase so villagers don't all breathe in lockstep.
function npcHash(npc) {
  const s = npc.id || npc.name || 'npc';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Single-pose sprites can't walk, so the life comes from a breathing squash plus a slow
// sway — feet stay planted at npc.y.
function drawSpriteNPC(ctx2, npc, t, spr) {
  const H = NPC_BASE_H * (npc.scale || 1);
  const W = H * (spr.sw / spr.sh);
  const phase = (npcHash(npc) % 628) / 100;
  const breath = Math.sin(t * 0.0022 + phase);
  const sway = Math.sin(t * 0.0009 + phase) * 0.02;
  const h = H * (1 + breath * 0.016);
  const w = W * (1 - breath * 0.008);
  ctx2.save();
  ctx2.translate(npc.x, npc.y);
  ctx2.rotate(sway);
  if (npc.flipX) ctx2.scale(-1, 1);
  ctx2.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, -w / 2, -h, w, h);
  ctx2.restore();
}

// Editor-only marker for a type whose PNG hasn't been supplied yet.
function drawPlaceholder(ctx2, npc) {
  if (isPlayMode) return;
  const h = NPC_BASE_H * (npc.scale || 1), w = h * 0.45;
  ctx2.save();
  ctx2.translate(npc.x, npc.y);
  ctx2.setLineDash([4,3]); ctx2.strokeStyle='rgba(148,163,184,0.7)'; ctx2.lineWidth=1.5;
  ctx2.strokeRect(-w/2, -h, w, h);
  ctx2.setLineDash([]);
  ctx2.fillStyle='rgba(148,163,184,0.75)'; ctx2.font='9px Outfit, sans-serif'; ctx2.textAlign='center';
  ctx2.fillText('sem sprite', 0, -h/2);
  ctx2.restore();
}

function drawVillagerType(ctx2, npc, t) {
  const spr = npcSprites[npc.type];
  if (spr) drawSpriteNPC(ctx2, npc, t, spr);
  else drawPlaceholder(ctx2, npc);
}

function drawSignpostNPC(ctx2, npc, t) {
  ctx2.save();
  ctx2.translate(npc.x, npc.y);
  const sc = npc.scale || 1.0;
  ctx2.scale(sc, sc);
  ctx2.fillStyle = 'rgba(0,0,0,0.3)';
  ctx2.beginPath(); ctx2.ellipse(0, 0, 16, 6, 0, 0, Math.PI*2); ctx2.fill();
  ctx2.fillStyle = '#5c3a1e'; ctx2.fillRect(-4, -36, 8, 36);
  ctx2.strokeStyle = '#3b220d'; ctx2.lineWidth = 1; ctx2.strokeRect(-4, -36, 8, 36);
  ctx2.fillStyle = '#9c6b38'; ctx2.fillRect(-22, -38, 44, 22);
  ctx2.strokeStyle = '#5a3b19'; ctx2.lineWidth = 2; ctx2.strokeRect(-22, -38, 44, 22);
  ctx2.fillStyle = '#fbbf24'; ctx2.font = 'bold 12px sans-serif'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
  ctx2.fillText('🪧', 0, -27);
  ctx2.restore();
}

// ── Gathering spot artwork ────────────────────────────────
// Three variants per resource. Which one a spot uses is derived from its id, so a spot
// keeps the same look across reloads while a row of them doesn't look cloned.
const SPOT_SHEETS = {
  spot_wood:  { src: 'assets/spot_wood.png',  boxes: [[40,112,452,385],[532,128,457,333],[281,558,446,354]] },
  spot_stone: { src: 'assets/spot_stone.png', boxes: [[18,366,308,282],[353,360,316,304],[686,345,328,331]] },
};
const SPOT_HEIGHT = { spot_wood: 54, spot_stone: 58 };
const spotSprites = {};   // `${type}_${i}` -> prepared sprite

function loadSpotSheets() {
  for (const [type, sheet] of Object.entries(SPOT_SHEETS)) {
    const img = new Image();
    img.onload = () => sheet.boxes.forEach((b, i) => {
      try {
        const cut = document.createElement('canvas');
        cut.width = b[2]; cut.height = b[3];
        cut.getContext('2d').drawImage(img, b[0], b[1], b[2], b[3], 0, 0, b[2], b[3]);
        spotSprites[`${type}_${i}`] = prepareSprite(cut);
      } catch (e) {}
    });
    img.onerror = () => {};
    img.src = sheet.src;
  }
}

function spotSpriteFor(npc) {
  const n = SPOT_SHEETS[npc.type]?.boxes.length || 0;
  if (!n) return null;
  return spotSprites[`${npc.type}_${npcHash(npc) % n}`] || null;
}

// Shared renderer for both resource types: art, shake while being hit, and a spent look.
function drawResourceSpot(ctx2, npc, t) {
  const spr = spotSpriteFor(npc);
  if (!spr) return false;                      // sheet not ready — caller falls back
  const now = t;
  const depleted = npc.depletedUntil && now < npc.depletedUntil;
  const shaking  = npc.shakeUntil && now < npc.shakeUntil;

  const h = (SPOT_HEIGHT[npc.type] || 54) * (npc.scale || 1) * (depleted ? 0.55 : 1);
  const w = h * (spr.sw / spr.sh);
  const jitter = shaking ? Math.sin(now * 0.06) * 3 : 0;

  ctx2.save();
  ctx2.translate(npc.x + jitter, npc.y);
  ctx2.fillStyle = 'rgba(0,0,0,0.28)';
  ctx2.beginPath(); ctx2.ellipse(0, 0, w * 0.42, w * 0.16, 0, 0, Math.PI * 2); ctx2.fill();
  if (depleted) ctx2.globalAlpha = 0.4;
  ctx2.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, -w/2, -h, w, h);
  ctx2.restore();

  if (depleted) {
    const s = Math.ceil((npc.depletedUntil - now) / 1000);
    ctx2.save();
    ctx2.font = 'bold 10px Outfit, sans-serif'; ctx2.textAlign = 'center';
    ctx2.fillStyle = 'rgba(0,0,0,0.7)';
    ctx2.fillRect(npc.x - 16, npc.y - h - 16, 32, 14);
    ctx2.fillStyle = '#94a3b8';
    ctx2.fillText(`${s}s`, npc.x, npc.y - h - 6);
    ctx2.restore();
  }
  return true;
}

function drawWoodSpot(ctx2, npc, t) {
  // The artwork is the real thing; the hand-drawn shape below is only a stand-in
  // for the moment before the sheet finishes loading.
  if (drawResourceSpot(ctx2, npc, t)) return;
  ctx2.save();
  ctx2.translate(npc.x, npc.y);
  const sc = (npc.scale || 1.0) * 1.35;
  ctx2.scale(sc, sc);

  const now = performance.now();
  const isDepleted = npc.depletedUntil && now < npc.depletedUntil;
  const isShaking = npc.shakeUntil && now < npc.shakeUntil;

  if (isShaking) {
    const shakeX = Math.sin(now * 0.08) * 3;
    ctx2.translate(shakeX, 0);
  }

  // Base Ground Shadow
  ctx2.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx2.beginPath(); ctx2.ellipse(0, 6, 28, 10, 0, 0, Math.PI * 2); ctx2.fill();

  if (isDepleted) {
    // Depleted Stump Base
    ctx2.fillStyle = '#3d230d';
    ctx2.beginPath(); ctx2.roundRect(-18, -12, 36, 12, 4); ctx2.fill();
    ctx2.strokeStyle = '#180e05'; ctx2.lineWidth = 2; ctx2.stroke();
    ctx2.fillStyle = '#6b4423'; ctx2.beginPath(); ctx2.ellipse(0, -12, 14, 5, 0, 0, Math.PI * 2); ctx2.fill();
  } else {
    // 16-Bit Musical Oak Stump (Image 3 Reference)
    ctx2.imageSmoothingEnabled = false;

    // Outer Roots & Trunk Body
    ctx2.fillStyle = '#5c3818';
    ctx2.beginPath();
    ctx2.moveTo(-28, 4); ctx2.lineTo(-24, -20); ctx2.lineTo(-18, -28);
    ctx2.lineTo(18, -28); ctx2.lineTo(24, -20); ctx2.lineTo(28, 4);
    ctx2.lineTo(18, 6); ctx2.lineTo(-18, 6);
    ctx2.closePath(); ctx2.fill();
    ctx2.strokeStyle = '#261405'; ctx2.lineWidth = 3; ctx2.stroke();

    // Dark Bark Texture Lines
    ctx2.strokeStyle = '#38200a'; ctx2.lineWidth = 2;
    ctx2.beginPath(); ctx2.moveTo(-16, -24); ctx2.lineTo(-20, 2); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(-4, -26); ctx2.lineTo(-6, 4); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(12, -25); ctx2.lineTo(14, 3); ctx2.stroke();

    // Top Cut Face (Wood Rings)
    ctx2.fillStyle = '#d4a373';
    ctx2.beginPath(); ctx2.ellipse(0, -28, 22, 10, 0, 0, Math.PI * 2); ctx2.fill();
    ctx2.strokeStyle = '#5c3818'; ctx2.lineWidth = 2; ctx2.stroke();

    // Carved Musical Staff & Clef Lines on Stump Top (Image 3)
    ctx2.strokeStyle = '#8a5a2e'; ctx2.lineWidth = 1;
    for (let i = -3; i <= 3; i += 2) {
      ctx2.beginPath(); ctx2.ellipse(0, -28 + i, 16, 6 + i * 0.2, 0, 0, Math.PI * 2); ctx2.stroke();
    }
    // Treble Clef Carving (🎼) on Stump Top
    ctx2.fillStyle = '#42250d';
    ctx2.font = 'bold 12px monospace';
    ctx2.textAlign = 'center';
    ctx2.fillText('🎼', 0, -24);

    // Moss Patches (Image 3)
    ctx2.fillStyle = '#487e2b';
    ctx2.beginPath(); ctx2.arc(-22, -18, 6, 0, Math.PI * 2); ctx2.fill();
    ctx2.beginPath(); ctx2.arc(-16, -26, 5, 0, Math.PI * 2); ctx2.fill();
    ctx2.beginPath(); ctx2.arc(18, -14, 7, 0, Math.PI * 2); ctx2.fill();

    // Orange Shelf Mushrooms on Side (Image 3)
    ctx2.fillStyle = '#e67e22';
    ctx2.beginPath(); ctx2.ellipse(-26, -10, 6, 3, -0.3, 0, Math.PI * 2); ctx2.fill();
    ctx2.beginPath(); ctx2.ellipse(-24, -4, 5, 2.5, -0.2, 0, Math.PI * 2); ctx2.fill();
  }

  ctx2.restore();
}

function drawStoneSpot(ctx2, npc, t) {
  // The artwork is the real thing; the hand-drawn shape below is only a stand-in
  // for the moment before the sheet finishes loading.
  if (drawResourceSpot(ctx2, npc, t)) return;
  ctx2.save();
  ctx2.translate(npc.x, npc.y);
  const sc = (npc.scale || 1.0) * 1.35;
  ctx2.scale(sc, sc);

  const now = performance.now();
  const isDepleted = npc.depletedUntil && now < npc.depletedUntil;
  const isShaking = npc.shakeUntil && now < npc.shakeUntil;

  if (isShaking) {
    const shakeX = Math.sin(now * 0.08) * 3;
    ctx2.translate(shakeX, 0);
  }

  // Cyan Musical Glow Aura (Image 4)
  if (!isDepleted) {
    const gPulse = (Math.sin(now * 0.003) + 1) / 2;
    const aura = ctx2.createRadialGradient(0, -16, 4, 0, -16, 30 + gPulse * 8);
    aura.addColorStop(0, 'rgba(0, 240, 255, 0.5)');
    aura.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx2.fillStyle = aura;
    ctx2.beginPath(); ctx2.arc(0, -16, 34, 0, Math.PI * 2); ctx2.fill();
  }

  // Base Shadow
  ctx2.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx2.beginPath(); ctx2.ellipse(0, 6, 30, 11, 0, 0, Math.PI * 2); ctx2.fill();

  if (isDepleted) {
    // Depleted Shattered Slate Base
    ctx2.fillStyle = '#334155';
    ctx2.beginPath();
    ctx2.moveTo(-18, 4); ctx2.lineTo(-22, -6); ctx2.lineTo(-10, -12);
    ctx2.lineTo(12, -10); ctx2.lineTo(20, -2); ctx2.lineTo(16, 4);
    ctx2.closePath(); ctx2.fill();
    ctx2.strokeStyle = '#0f172a'; ctx2.lineWidth = 2; ctx2.stroke();
  } else {
    // 16-Bit Cyan Musical Ore Vein Slate (Image 4 Reference)
    ctx2.imageSmoothingEnabled = false;

    // Slate Cluster Polygon Body
    ctx2.fillStyle = '#475569';
    ctx2.beginPath();
    ctx2.moveTo(-26, 4); ctx2.lineTo(-30, -18); ctx2.lineTo(-14, -36);
    ctx2.lineTo(14, -32); ctx2.lineTo(28, -14); ctx2.lineTo(24, 4);
    ctx2.closePath(); ctx2.fill();
    ctx2.strokeStyle = '#0f172a'; ctx2.lineWidth = 3; ctx2.stroke();

    // Slate Facet Highlights
    ctx2.strokeStyle = '#64748b'; ctx2.lineWidth = 2;
    ctx2.beginPath(); ctx2.moveTo(-14, -36); ctx2.lineTo(-6, -12); ctx2.lineTo(24, 4); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(14, -32); ctx2.lineTo(6, -10); ctx2.stroke();

    // Glowing Cyan Vein Cracks & Notes (Image 4)
    ctx2.strokeStyle = '#00f0ff'; ctx2.lineWidth = 2.5;
    ctx2.shadowColor = '#00f0ff'; ctx2.shadowBlur = 8;
    ctx2.beginPath();
    ctx2.moveTo(-20, -14); ctx2.lineTo(-10, -22); ctx2.lineTo(4, -18); ctx2.lineTo(18, -26);
    ctx2.stroke();

    ctx2.beginPath();
    ctx2.moveTo(-12, -6); ctx2.lineTo(2, -12); ctx2.lineTo(14, -4);
    ctx2.stroke();
    ctx2.shadowBlur = 0;

    // Etched Musical Notes (Image 4)
    ctx2.fillStyle = '#e0f2fe';
    ctx2.font = '900 11px sans-serif';
    ctx2.textAlign = 'center';
    ctx2.fillText('♪', -12, -22);
    ctx2.fillText('♫', 8, -18);
    ctx2.fillText('♩', 0, -6);
  }

  ctx2.restore();
}

// Doorway marker for the smithy: an arch with a lit forge glow behind it, pulsing so it
// reads as enterable rather than scenery.
function drawForgeEntrance(ctx2, npc, t) {
  // 1.6x baseline: at 1x the arch was a ~50px smudge on a busy 1024px map and players
  // walked past it without seeing a door at all.
  const sc = (npc.scale || 1) * 1.6;
  const pulse = (Math.sin(t * 0.003) + 1) / 2;
  ctx2.save();
  ctx2.translate(npc.x, npc.y);
  ctx2.scale(sc, sc);

  ctx2.fillStyle = 'rgba(0,0,0,0.32)';
  ctx2.beginPath(); ctx2.ellipse(0, 0, 26, 8, 0, 0, Math.PI * 2); ctx2.fill();

  // stone arch
  ctx2.fillStyle = '#4b4b52';
  ctx2.fillRect(-26, -58, 52, 58);
  ctx2.fillStyle = '#5f5f68';
  ctx2.fillRect(-26, -58, 52, 8);
  ctx2.strokeStyle = '#2b2b30'; ctx2.lineWidth = 2;
  ctx2.strokeRect(-26, -58, 52, 58);

  // forge mouth, glowing
  const g = ctx2.createLinearGradient(0, -46, 0, -4);
  g.addColorStop(0, `rgba(255,${140 + pulse * 60},40,0.95)`);
  g.addColorStop(1, 'rgba(120,20,0,0.95)');
  ctx2.fillStyle = g;
  ctx2.fillRect(-16, -46, 32, 44);

  // spill of light on the ground
  const gl = ctx2.createRadialGradient(0, -6, 2, 0, -6, 34 + pulse * 8);
  gl.addColorStop(0, `rgba(255,150,50,${0.30 + pulse * 0.18})`);
  gl.addColorStop(1, 'rgba(255,150,50,0)');
  ctx2.fillStyle = gl;
  ctx2.beginPath(); ctx2.arc(0, -6, 40, 0, Math.PI * 2); ctx2.fill();

  // hanging hammer sign
  ctx2.font = '15px serif'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
  ctx2.fillText('🔨', 0, -70 - pulse * 2);
  ctx2.restore();

  // Standing label, drawn unscaled so it stays readable.
  ctx2.save();
  ctx2.font = 'bold 10px Outfit, sans-serif';
  ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
  const w = ctx2.measureText('FERRARIA').width + 12;
  const ly = npc.y - 80 * sc;
  ctx2.fillStyle = 'rgba(30,12,4,0.85)';
  ctx2.fillRect(npc.x - w/2, ly - 8, w, 16);
  ctx2.strokeStyle = '#d97706'; ctx2.lineWidth = 1.5;
  ctx2.strokeRect(npc.x - w/2, ly - 8, w, 16);
  ctx2.fillStyle = '#fde68a';
  ctx2.fillText('FERRARIA', npc.x, ly);
  ctx2.restore();
}

// Porta: marcador de destino de cena. Não é cenário — a arte da casa é a do mapa. Ela
// só diz "é aqui que alguém entra", e some no jogo, aparecendo apenas no editor.
function drawPorta(ctx2, npc) {
  if (isPlayMode) return;
  const sc = npc.scale || 1, w = 40 * sc, h = 62 * sc;
  const x = npc.x - w / 2, y = npc.y - h;
  ctx2.save();
  ctx2.globalAlpha = 0.9;
  ctx2.fillStyle = '#3b2412';
  ctx2.fillRect(x, y, w, h);
  ctx2.strokeStyle = '#f59e0b'; ctx2.lineWidth = 2;
  ctx2.strokeRect(x, y, w, h);
  ctx2.fillStyle = '#fde68a';
  ctx2.beginPath(); ctx2.arc(x + w * 0.78, y + h * 0.55, 2.6, 0, Math.PI * 2); ctx2.fill();
  ctx2.font = 'bold 10px Outfit, sans-serif'; ctx2.textAlign = 'center';
  ctx2.fillText(npc.interior && INTERIORS[npc.interior] ? INTERIORS[npc.interior].name : 'PORTA',
                npc.x, y - 6);
  ctx2.restore();
}

// Ponto de martelada: alvo de trabalho. Só o editor enxerga — no jogo ele é o lugar
// para onde o jogador e o NPC caminham e onde as marteladas acontecem.
function drawPontoMartelada(ctx2, npc, now) {
  if (isPlayMode) return;
  const sc = npc.scale || 1, r = 26 * sc;
  const p = (Math.sin((now || 0) * 0.004) + 1) / 2;
  ctx2.save();
  ctx2.globalAlpha = 0.85;
  ctx2.strokeStyle = '#fb923c'; ctx2.lineWidth = 2.5;
  ctx2.setLineDash([6, 5]);
  ctx2.beginPath(); ctx2.arc(npc.x, npc.y, r + p * 3, 0, Math.PI * 2); ctx2.stroke();
  ctx2.setLineDash([]);
  ctx2.font = '20px serif'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
  ctx2.fillText('🔨', npc.x, npc.y);
  ctx2.fillStyle = '#fdba74';
  ctx2.font = 'bold 10px Outfit, sans-serif';
  ctx2.fillText('MARTELADA', npc.x, npc.y - r - 8);
  ctx2.restore();
}

// Lago do Sorteio: ponto de interação de um cenário. No editor é um anel visível;
// no jogo ele some, porque o lago já está pintado no vídeo do cenário.
function drawLagoSorteio(ctx2, npc, now) {
  const p = (Math.sin((now || 0) * 0.003) + 1) / 2;
  if (isPlayMode) return;
  const sc = npc.scale || 1, rx = 70 * sc, ry = 26 * sc;
  ctx2.save();
  ctx2.globalAlpha = 0.9;
  ctx2.strokeStyle = '#fde68a'; ctx2.lineWidth = 2.5;
  ctx2.setLineDash([9, 6]);
  ctx2.beginPath(); ctx2.ellipse(npc.x, npc.y, rx + p * 4, ry + p * 2, 0, 0, Math.PI * 2); ctx2.stroke();
  ctx2.setLineDash([]);
  ctx2.font = '20px serif'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
  ctx2.fillText('✦', npc.x, npc.y);
  ctx2.fillStyle = '#fde68a'; ctx2.font = 'bold 10px Outfit, sans-serif';
  ctx2.fillText('LAGO DO SORTEIO', npc.x, npc.y - ry - 8);
  ctx2.restore();
}

const NPC_DRAW = {
  porta: drawPorta,
  lago_sorteio: drawLagoSorteio,
  ponto_martelada: drawPontoMartelada,
  guard: drawGuard,
  sr_antony: drawVillagerType,
  signpost: drawSignpostNPC,
  forge_entrance: drawForgeEntrance,
  spot_wood: drawWoodSpot,
  spot_stone: drawStoneSpot,
  bard: drawVillagerType, blacksmith: drawVillagerType, child: drawVillagerType,
  elder: drawVillagerType, merchant: drawVillagerType, villager: drawVillagerType,
};
const DEFAULT_NPC_DRAW = drawVillagerType;

// Screen-space box an NPC occupies — feet at npc.y, centred on npc.x.
// Shared by hit-testing, the selection outline and drag, so what you grab is what you see.
// World elements are drawn by hand at their own sizes, so the generic character aspect
// gives them a hit box far narrower than the art — clicking the visible shape missed and
// they couldn't be dragged. Declare each one's real extent.
const ELEMENT_BOUNDS = {
  forge_entrance: { w: 96, h: 128 },
  signpost:       { w: 52, h: 46 },
  porta:          { w: 40, h: 62 },
  ponto_martelada:{ w: 56, h: 56 },
  lago_sorteio:   { w: 150, h: 60 },
  spot_wood:      { w: 64, h: 56 },
  spot_stone:     { w: 66, h: 60 },
};

function npcBounds(npc) {
  const sc = npc.scale || 1;
  const fixed = ELEMENT_BOUNDS[npc.type];
  if (fixed) {
    const w = Math.round(fixed.w * sc), h = Math.round(fixed.h * sc);
    return { x: npc.x - w/2, y: npc.y - h, w, h };
  }
  const h = Math.round(NPC_BASE_H * sc);
  const spr = npcSprites[npc.type];
  const aspect = spr ? spr.sw / spr.sh
    : (npc.type === 'guard' && processedGuard)
      ? Math.floor(processedGuard.width / 4) / processedGuard.height
      : 0.45;
  const w = Math.round(h * aspect);
  return { x: npc.x - w/2, y: npc.y - h, w, h };
}

function npcAt(mx, my) {
  const mapKey = activeMapSelect?.value || currentKey;
  for (let i = npcData.length - 1; i >= 0; i--) {
    const npc = npcData[i];
    if (npc.mapKey !== mapKey) continue;
    const b = npcBounds(npc);
    if (mx >= b.x - 12 && mx <= b.x + b.w + 12 && my >= b.y - 12 && my <= b.y + b.h + 12) return npc;
    const dx = mx - npc.x, dy = my - (npc.y - b.h / 2);
    if (Math.hypot(dx, dy) < Math.max(38, b.w / 2 + 12)) return npc;
  }
  return null;
}

function isNearPlayer(npc) {
  if (!isPlayMode) return false;
  const dx=player.x-npc.x, dy=player.y-npc.y;
  return Math.sqrt(dx*dx+dy*dy) < npc.triggerRadius;
}

// ============================================================
// DIALOGUE SYSTEM
// ============================================================
const DLG_STATE = { CLOSED:'closed', TYPING:'typing', WAITING:'waiting', CHOOSING:'choosing', NAME_INPUT:'name_input' };
const dlg = {
  state:DLG_STATE.CLOSED, npc:null, script:null, stepId:'start',
  lines:[], lineIndex:0, charIndex:0, displayText:'', fullText:'',
  choices:[], hoveredChoice:-1, boxY:SCREEN_H,
  typingAccum:0, typingSpeed:1.8, _nextStep:null, _npc_ref:null,
};

const DB = { x:50, w:924, h:188, px:107, pcy:94, pr:52, tx:178, ty:60, tw:730 };
// Choice box geometry — shared by the renderer and the hit test so they can never drift.
// Sized for a thumb on a phone in landscape, not a mouse pointer.
const CH = { top:52, h:44, gap:6 };
function choiceRect(i) {
  return { x: DB.x+DB.tx, y: Math.round(dlg.boxY)+CH.top+i*(CH.h+CH.gap), w: DB.tw-10, h: CH.h };
}
function choiceAt(mx, my) {
  if (dlg.state !== DLG_STATE.CHOOSING) return -1;
  for (let i=0; i<dlg.choices.length; i++) {
    const r = choiceRect(i);
    if (mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h) return i;
  }
  return -1;
}

async function startDialogue(npc) {
  if (dlg.state !== DLG_STATE.CLOSED) return;
  // Se há uma cena presa a este NPC e as condições batem, ela toma o lugar da conversa
  // comum. É o que faz a Cena 4 acontecer ao falar com o Sr. Antony.
  const cena = cenaDoNPC(npc);
  if (cena) { iniciarCena(cena); return; }
  playerLocked = true;
  dlg.npc = npc; dlg._npc_ref = npc;
  dlg.script = await loadDialogue(npc.dialogue);
  if (!dlg.script) { endDialogue(); return; }
  dlg.stepId = 'start'; dlg.boxY = SCREEN_H;
  processStep();
}

function processStep() {
  const step = dlg.script.steps.find(s=>s.id===dlg.stepId);
  if (!step) { endDialogue(); return; }
  if (step.type==='lines') {
    dlg.lines=step.lines; dlg.lineIndex=0; dlg._nextStep=step.next;
    beginLine(dlg.lines[0]);
  } else if (step.type==='choice') {
    dlg.state=DLG_STATE.CHOOSING; dlg.choices=step.choices; dlg.hoveredChoice=-1; dlg.displayText=''; dlg.fullText='';
  } else if (step.type==='name_input') {
    // O nome agora é escolhido no menu inicial. Diálogos antigos que pediam nome
    // simplesmente seguem em frente, em vez de abrir um campo redundante.
    if (step.next) { dlg.stepId = step.next; processStep(); }
    else endDialogue();
  } else if (step.type==='end') {
    if (step.quest_unlock) unlockQuest(step.quest_unlock);
    endDialogue();
  }
}
function beginLine(text) { dlg.fullText=text; dlg.displayText=''; dlg.charIndex=0; dlg.typingAccum=0; dlg.state=DLG_STATE.TYPING; }
function advanceDlg() {
  if (dlg.state===DLG_STATE.TYPING) { dlg.displayText=dlg.fullText; dlg.charIndex=dlg.fullText.length; dlg.state=DLG_STATE.WAITING; return; }
  if (dlg.state===DLG_STATE.WAITING) { dlg.lineIndex++; if(dlg.lineIndex<dlg.lines.length){beginLine(dlg.lines[dlg.lineIndex]);}else{dlg.stepId=dlg._nextStep;processStep();} }
}
function selectChoice(i) { if(dlg.state!==DLG_STATE.CHOOSING)return; const c=dlg.choices[i]; if(!c)return; dlg.stepId=c.next; processStep(); }
function endDialogue() {
  // Conversar é um evento de missão: é assim que "fale com o bardo" se resolve.
  const quem = dlg._npc_ref?.name || dlg.npc?.name;
  if (quem) progressoDeMissao('talk', quem);
  if (dlg._npc_ref) { dlg._npc_ref.triggered=true; saveNPCs(); dlg._npc_ref=null; }
  dlg.state=DLG_STATE.CLOSED; dlg.npc=null; playerLocked=false;
}
function handleDlgKey(e) {
  if (e.code==='Space'||e.code==='Enter'||e.code==='KeyE') { e.preventDefault(); advanceDlg(); }
  if (e.code==='Digit1'||e.code==='Numpad1') selectChoice(0);
  if (e.code==='Digit2'||e.code==='Numpad2') selectChoice(1);
  // Escape hatch: a dialogue that can't be closed leaves the player locked in place.
  if (e.code==='Escape') { endDialogue(); }
}

// Esc is the universal way out of a stuck editor state.
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (typeof signpostWizard !== 'undefined' && signpostWizard.active) { cancelSignpostWizard(); return; }
  if (npcPlacingMode) { npcPlacingMode = false; pendingElement = null; canvas?.classList.remove('cursor-crosshair'); showToast('✕ Posicionamento cancelado.'); }
});

function showNameInput() { nameInputOverlay?.classList.remove('hidden'); playerNameInput&&(playerNameInput.value=''); setTimeout(()=>playerNameInput?.focus(),60); }
function hideNameInput() { nameInputOverlay?.classList.add('hidden'); }
// O nome é digitado no menu, então ele tem que valer em toda fala, legenda e balão.
// `Personagem` como locutor vira o nome do jogador — o roteiro não precisa saber qual é.
function nomeDoJogador() { return playerName || 'Viajante'; }
function subVars(txt) {
  return String(txt ?? '').replace(/\{(PLAYER_NAME|NOME|nome)\}/g, nomeDoJogador());
}
function nomeDoLocutor(quem) {
  const q = String(quem ?? '');
  return /^(personagem|jogador|player)$/i.test(q.trim()) ? nomeDoJogador() : subVars(q);
}

function renderDlg(now) {
  if (dlg.state===DLG_STATE.CLOSED) return;
  const targetY = SCREEN_H - DB.h - 14;
  dlg.boxY += (targetY - dlg.boxY) * 0.2;
  const by = Math.round(dlg.boxY);

  // Typing
  if (dlg.state===DLG_STATE.TYPING) {
    dlg.typingAccum += dlg.typingSpeed;
    while (dlg.typingAccum>=1 && dlg.charIndex<dlg.fullText.length) { dlg.displayText+=dlg.fullText[dlg.charIndex++]; dlg.typingAccum--; }
    if (dlg.charIndex>=dlg.fullText.length) dlg.state=DLG_STATE.WAITING;
  }

  ctx.save();
  // Shadow
  ctx.shadowColor='rgba(0,0,0,0.8)'; ctx.shadowBlur=30; ctx.shadowOffsetY=8;
  // Wooden frame
  const grad=ctx.createLinearGradient(DB.x,by,DB.x,by+DB.h);
  grad.addColorStop(0,'#3d2310'); grad.addColorStop(0.5,'#2a1808'); grad.addColorStop(1,'#1a0e04');
  ctx.fillStyle=grad; ctx.strokeStyle='#b45309'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.roundRect(DB.x,by,DB.w,DB.h,12); ctx.fill(); ctx.shadowBlur=0; ctx.stroke();
  // Inner
  ctx.fillStyle='rgba(6,3,1,0.88)';
  ctx.beginPath(); ctx.roundRect(DB.x+5,by+5,DB.w-10,DB.h-10,8); ctx.fill();
  ctx.strokeStyle='rgba(245,158,11,0.2)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(DB.x+5,by+5,DB.w-10,DB.h-10,8); ctx.stroke();
  // Corner ornaments
  [[DB.x+18,by+18],[DB.x+DB.w-18,by+18],[DB.x+18,by+DB.h-18],[DB.x+DB.w-18,by+DB.h-18]].forEach(([cx2,cy2])=>{
    ctx.strokeStyle='#f59e0b'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(cx2,cy2,5,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx2-11,cy2); ctx.lineTo(cx2+11,cy2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx2,cy2-11); ctx.lineTo(cx2,cy2+11); ctx.stroke();
  });
  // Portrait
  const pcx=DB.x+DB.px, pcy=by+DB.pcy;
  ctx.fillStyle='#080503'; ctx.beginPath(); ctx.arc(pcx,pcy,DB.pr,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#f59e0b'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(pcx,pcy,DB.pr,0,Math.PI*2); ctx.stroke();
  // Dynamic Portrait for current talking NPC
  const npcType = dlg.npc?.type || 'guard';
  const spr = npcSprites[npcType];
  ctx.save();
  ctx.beginPath(); ctx.arc(pcx, pcy, DB.pr - 3, 0, Math.PI * 2); ctx.clip();
  if (spr && spr.canvas) {
    const dw = DB.pr * 2.2, dh = DB.pr * 2.2;
    ctx.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, pcx - dw/2, pcy - dh/2 + 2, dw, dh);
  } else if (processedGuard && npcType === 'guard') {
    const fw = Math.floor(processedGuard.width / 4), fh = processedGuard.height;
    const scale = DB.pr * 2 / Math.max(fw, fh) * 1.3;
    const dw = fw * scale, dh = fh * scale;
    ctx.drawImage(processedGuard, 0, 0, fw, fh, pcx - dw/2, pcy - dh * 0.7, dw, dh);
  } else {
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(npcType === 'sr_antony' ? '👑' : '👤', pcx, pcy);
  }
  ctx.restore();
  // NPC name
  ctx.fillStyle='#f59e0b'; ctx.font='bold 13px Outfit, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='middle';
  const npcName = nomeDoLocutor(dlg.script?.npc_name || dlg.npc?.name || 'NPC');
  ctx.fillText(npcName, DB.x+DB.tx, by+30);
  ctx.fillStyle='rgba(245,158,11,0.25)';
  ctx.fillRect(DB.x+DB.tx, by+40, 200, 1);
  // Dialogue text
  ctx.fillStyle='#f0e6d3'; ctx.font='14px Outfit, sans-serif'; ctx.textAlign='left'; ctx.textBaseline='top';
  wrapText(ctx, subVars(dlg.displayText), DB.x+DB.tx, by+DB.ty, DB.tw, 22);
  // Choices
  if (dlg.state===DLG_STATE.CHOOSING) {
    dlg.choices.forEach((ch,i)=>{
      const r=choiceRect(i);
      const hov=dlg.hoveredChoice===i;
      const cbg=ctx.createLinearGradient(r.x,r.y,r.x,r.y+r.h);
      if(hov){cbg.addColorStop(0,'#3d2010');cbg.addColorStop(1,'#2a1408');}
      else{cbg.addColorStop(0,'#1e0e04');cbg.addColorStop(1,'#140904');}
      ctx.fillStyle=cbg; ctx.strokeStyle=hov?'#f59e0b':'#5a3010'; ctx.lineWidth=hov?2:1;
      ctx.beginPath(); ctx.roundRect(r.x,r.y,r.w,r.h,6); ctx.fill(); ctx.stroke();
      ctx.fillStyle=hov?'#fbbf24':'#d4a27a';
      ctx.font=hov?'bold 13px Outfit, sans-serif':'13px Outfit, sans-serif';
      ctx.textAlign='left'; ctx.textBaseline='middle';
      ctx.fillText(subVars(ch.text), r.x+16, r.y+r.h/2);
      // Tap affordance on the right edge
      ctx.textAlign='right'; ctx.fillStyle=hov?'#fbbf24':'#7c5030';
      ctx.font='11px Outfit, sans-serif';
      ctx.fillText('toque ▸', r.x+r.w-14, r.y+r.h/2);
    });
  }
  // Continue prompt
  if (dlg.state===DLG_STATE.WAITING) {
    const p=Math.sin(now*0.004)*0.4+0.6;
    ctx.globalAlpha=p; ctx.fillStyle='#f59e0b'; ctx.font='11px Outfit, sans-serif';
    ctx.textAlign='right'; ctx.textBaseline='bottom';
    ctx.fillText('Toque para continuar ▶', DB.x+DB.w-14, by+DB.h-10);
    ctx.globalAlpha=1;
  }
  ctx.restore();
}

function wrapText(ctx2, txt, x, y, maxW, lh) {
  const words=txt.split(' '); let line='', lineY=y;
  for (const w of words) {
    const test=line?line+' '+w:w;
    if (ctx2.measureText(test).width>maxW && line) { ctx2.fillText(line,x,lineY); line=w; lineY+=lh; } else line=test;
  }
  if (line) ctx2.fillText(line,x,lineY);
}

// ============================================================
// QUEST SYSTEM
// ============================================================
let activeQuests=[], completedQuests=[];
function unlockQuest(id) {
  const def=questsData.find(q=>q.id===id); if(!def||activeQuests.find(q=>q.id===id)) return;
  const q=JSON.parse(JSON.stringify(def)); activeQuests.push(q);
  grantXp(q.xp ?? 40); // starting a quest already pays a little
  pathGuide.questId=id; pathGuide.active=true;
  pathGuide.waypoints=(q.path_waypoints?.[currentKey])||[];
  pathGuide.particles=[];
  q.objectives.forEach(o => { o.completed = false; o.progresso = 0; });
  showQuestNotif(q); refreshQuestPanel(); atualizarRastreador();
}
// ── Progresso de missão ──────────────────────────────────────────────────────────
// Objetivos são declarados no quests.json e avançam por eventos do jogo: falar com um
// NPC, coletar um recurso. `requer` segura um objetivo até os outros ficarem prontos,
// que é como "volte ao Sr. Antony" só conta depois das duas conversas.
function objetivoLiberado(q, o) {
  return !o.requer || o.requer.every(id => q.objectives.find(x => x.id === id)?.completed);
}

function progressoDeMissao(tipo, chave, quantidade = 1) {
  let mudou = false;
  activeQuests.forEach(q => {
    q.objectives.forEach(o => {
      if (o.completed || o.type !== tipo || !objetivoLiberado(q, o)) return;
      const alvo = String(o.npc || o.item || '').toLowerCase();
      if (!alvo || !String(chave).toLowerCase().includes(alvo)) return;
      if (o.quantidade) {
        o.progresso = Math.min(o.quantidade, (o.progresso || 0) + quantidade);
        if (o.progresso >= o.quantidade) o.completed = true;
      } else {
        o.completed = true;
      }
      mudou = true;
      if (o.completed) {
        showToast(`✅ ${o.text}`);
        addFloater(player.x, player.y - 60, '✅ Objetivo concluído', '#4ade80');
      }
    });
  });
  if (mudou) { atualizarRastreador(); verificarMissoesConcluidas(); }
}

function verificarMissoesConcluidas() {
  for (let i = activeQuests.length - 1; i >= 0; i--) {
    const q = activeQuests[i];
    if (!q.objectives.every(o => o.completed)) continue;
    activeQuests.splice(i, 1);
    completedQuests.push(q.id);
    // Entregar material gasta material: senão a madeira da ponte continua na mochila.
    if (q.custo) {
      Object.entries(q.custo).forEach(([item, qtd]) => {
        playerInventory[item] = Math.max(0, (playerInventory[item] || 0) - qtd);
      });
      updateInventorySlotsUI?.();
    }
    grantXp(q.xp ?? 60);
    if (q.recompensa?.moedas) {
      playerInventory.coins = (playerInventory.coins || 0) + q.recompensa.moedas;
      updateInventorySlotsUI?.();
    }
    showToast(`🏆 Missão concluída: ${q.title}`);
    refreshQuestPanel();
    savePlayerData();
    // Missão pode emendar direto numa cena — é o que fecha o conserto da ponte.
    if (q.aoConcluir?.cena) {
      const c = CUT.roteiros.find(r => r.id === q.aoConcluir.cena);
      if (c) setTimeout(() => { if (!CUT.ativo) iniciarCena(c); }, 700);
    }
  }
  atualizarRastreador();
}

function missaoAtiva(id) { return activeQuests.find(q => q.id === id) || null; }
function missaoConcluida(id) { return completedQuests.includes(id); }
function objetivoFeito(questId, objId) {
  const q = missaoAtiva(questId);
  if (q) return !!q.objectives.find(o => o.id === objId)?.completed;
  return missaoConcluida(questId);
}

// Rastreador na tela: o quadrinho de "o que fazer agora", logo abaixo da barra de vida.
function atualizarRastreador() {
  const el = document.getElementById('questTracker');
  if (!el) return;
  if (!isPlayMode || !activeQuests.length) { el.classList.add('hidden'); return; }
  el.innerHTML = activeQuests.map(q => {
    const linhas = q.objectives.map(o => {
      const bloqueado = !o.completed && !objetivoLiberado(q, o);
      const marca = o.completed ? '☑' : bloqueado ? '🔒' : '☐';
      const cont = o.quantidade ? ` (${o.progresso || 0}/${o.quantidade})` : '';
      const cls = o.completed ? 'feito' : bloqueado ? 'bloq' : '';
      return `<li class="${cls}">${marca} ${o.text}${cont}</li>`;
    }).join('');
    return `<div class="qt-title">📜 ${q.title}</div><ul class="qt-objs">${linhas}</ul>`;
  }).join('');
  el.classList.remove('hidden');
}

function showQuestNotif(q) {
  if(!questNotif)return;
  questNotif.classList.remove('hidden');
  if(questNotifTitle)questNotifTitle.textContent=q.title;
  if(questNotifObj)questNotifObj.textContent=q.objectives?.[0]?.text||'';
  setTimeout(()=>questNotif.classList.add('visible'),10);
  setTimeout(()=>{questNotif.classList.remove('visible');setTimeout(()=>questNotif.classList.add('hidden'),400);},4500);
}
function refreshQuestPanel() {
  if(!activeQuestsList)return;
  if(activeQuests.length===0){activeQuestsList.innerHTML='<div class="empty-msg">Nenhuma missão ativa</div>';return;}
  activeQuestsList.innerHTML=activeQuests.map(q=>`
    <div class="quest-row-item">
      <div class="quest-row-title">${q.title}</div>
      ${q.objectives.map(o=>`<div class="quest-row-obj">${o.text}</div>`).join('')}
    </div>`).join('');
}

// ============================================================
// PATH GUIDE
// ============================================================
const pathGuide = { active:false, questId:null, waypoints:[], particles:[] };
function updatePath() {
  if(!pathGuide.active||!pathGuide.waypoints.length)return;
  if(Math.random()<0.18) {
    const wp=pathGuide.waypoints[Math.floor(Math.random()*pathGuide.waypoints.length)];
    pathGuide.particles.push({x:wp.x+(Math.random()-0.5)*14,y:wp.y+(Math.random()-0.5)*14,life:1,sz:Math.random()*5+3,vy:-(Math.random()*0.5+0.2)});
  }
  for(let i=pathGuide.particles.length-1;i>=0;i--){const p=pathGuide.particles[i];p.y+=p.vy;p.life-=0.02;if(p.life<=0)pathGuide.particles.splice(i,1);}
}
function renderPath(now) {
  if(!pathGuide.active||!isPlayMode)return;
  pathGuide.waypoints.forEach((wp,i)=>{
    const p=Math.sin(now*0.005+i*0.8)*0.3+0.7;
    ctx.save();ctx.globalAlpha=p*0.55;
    const g=ctx.createRadialGradient(wp.x,wp.y,0,wp.x,wp.y,18);
    g.addColorStop(0,'#fbbf24');g.addColorStop(0.5,'#f59e0b');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(wp.x,wp.y,18,0,Math.PI*2);ctx.fill();ctx.restore();
  });
  pathGuide.particles.forEach(p=>{
    ctx.save();ctx.globalAlpha=p.life*0.75;
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.sz);
    g.addColorStop(0,'#fffde7');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fill();ctx.restore();
  });
}

// ============================================================
// PHYSICS
// ============================================================
// A map with nothing painted on its road layer is fully walkable. Without this a newly
// added scene would trap the player the instant they arrive, before anyone paints it.
const roadPaintCache = {};
function hasRoadPaint(key) {
  if (roadPaintCache[key] !== undefined) return roadPaintCache[key];
  let any = false;
  try {
    const d = getLayers(key).roadCtx.getImageData(0,0,SCREEN_W,SCREEN_H).data;
    for (let i = 3; i < d.length; i += 4*13) { if (d[i] > 50) { any = true; break; } }
  } catch(e) {}
  roadPaintCache[key] = any;
  return any;
}
function invalidateRoadPaint(key) { delete roadPaintCache[key]; }

let megaMapZoom = 2.0;
let playerCustomHeight = 48;
let megaCameraX = 0;
let megaCameraY = 0;

function getMapDimensions(key) {
  const bg = bgImages[key];
  if (bg && bg.complete && bg.naturalWidth > 0) {
    return { w: bg.naturalWidth, h: bg.naturalHeight };
  }
  if (key === 'photo_recriado') return { w: 1376, h: 768 };
  if (key === 'mega_world') return { w: 2048, h: 1142 };
  return { w: SCREEN_W, h: SCREEN_H };
}

function isWalkable(x,y) {
  const dims = currentKey === 'mega_world' ? getMegaWorldDimensions() : { w: SCREEN_W, h: SCREEN_H };
  if (x < 24 || x > dims.w - 24 || y < 28 || y > dims.h - 28) return false;
  if (currentScene !== 'world') return true;   // interiors have no painted collision
  if (!hasRoadPaint(currentKey)) return true;
  const L = getLayers(currentKey);
  try { const p = L.roadCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data; return p[1] > 100 && p[3] > 50; } catch(e) { return true; }
}
function canMoveTo(x,y){
  // Objetos de cenário bloqueiam pelo próprio pé, sem depender de pintura: mover a
  // árvore no editor move a colisão com ela.
  if (currentScene === 'world' && objetoBloqueia(x, y)) return false;
  return isWalkable(x,y)&&isWalkable(x-4,y)&&isWalkable(x+4,y)&&isWalkable(x,y-4)&&isWalkable(x,y+4);
}

// ============================================================
// INTERIOR SCENES
// One table describes every interior, so adding another is a data entry rather than a
// second copy of the shop's enter/exit logic.
// ============================================================
const INTERIORS = {
  loja: {
    name: '🏪 Loja de Skins',
    videoId: 'skinShopVideo',
    still: () => shopInterior,        // a still image wins over the looping video
    enterAt: { x: 512, y: 430 },
    exitY: 510,
    // Where the shopkeeper's counter is, for the action button.
    counter: { x: 512, y: 330, r: 150 },
    counterAction: 'shop',
  },
  forjador: {
    name: '🎼 Forjador de Escalas',
    videoId: null,
    still: () => forjadorInterior,
    enterAt: { x: 512, y: 470 },
    exitY: 520,
    counter: { x: 512, y: 300, r: 170 },   // o altar das escalas
    counterAction: 'forjarEscala',
  },
  ferraria: {
    name: '🔨 Ferraria',
    videoId: 'forgeVideo',
    still: () => null,
    enterAt: { x: 512, y: 455 },
    exitY: 520,
    counter: { x: 512, y: 320, r: 165 },   // the anvil
    counterAction: 'forge',
  },
};

function interiorDef() { return INTERIORS[currentScene] || null; }

// Cria (uma vez) e devolve o vídeo de fundo de um cenário animado.
function videoDoMapa(key) {
  if (!videoSources[key]) return null;
  let v = videoMapas[key];
  if (!v) {
    v = document.createElement('video');
    v.src = videoSources[key];
    v.loop = true; v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.style.display = 'none';
    document.body.appendChild(v);
    videoMapas[key] = v;
  }
  if (v.paused) v.play().catch(() => {});
  return v.readyState >= 2 ? v : null;
}

// Vídeo de ambiente é do ambiente, não do jogo: qualquer um que não seja o da cena
// atual precisa estar parado e mudo. Sem isto o barulho da ferraria tocava o jogo
// inteiro, porque a tag nasce com autoplay e só era pausada ao sair pela porta.
function silenciarVideosDeInterior() {
  for (const [chave, def] of Object.entries(INTERIORS)) {
    if (!def.videoId) continue;
    const v = document.getElementById(def.videoId);
    if (!v) continue;
    if (chave === currentScene && !def.still?.()) continue;   // este é o da cena
    if (!v.paused) { v.pause(); v.currentTime = 0; }
    v.muted = true;
    v.classList.add('hidden');
  }
}

function enterInterior(key) {
  const def = INTERIORS[key];
  if (!def) return;
  savedDoorPos = { x: player.x, y: player.y + 20 };
  savedDoorMap = currentKey;
  lastDoorTime = performance.now();
  currentScene = key;
  // Entrar num ambiente libera o jogador — a menos que uma cena esteja no comando,
  // que é quem decide quando devolver o controle.
  if (!CUT.ativo) playerLocked = false;
  player.x = def.enterAt.x; player.y = def.enterAt.y;
  if (!def.still?.() && def.videoId) {
    const v = document.getElementById(def.videoId);
    if (v) { v.muted = false; v.volume = 0.7; v.classList.remove('hidden'); v.play().catch(()=>{}); }
  }
  showToast(def.name);
}

function leaveInterior() {
  const def = interiorDef();
  if (def && def.videoId) {
    const v = document.getElementById(def.videoId);
    v?.pause(); v?.classList.add('hidden');
  }
  lastDoorTime = performance.now();
  currentScene = 'world';
  silenciarVideosDeInterior();
  if (savedDoorMap) currentKey = savedDoorMap;
  player.x = savedDoorPos.x; player.y = savedDoorPos.y;
  showToast('🏰 Voltou ao mapa!');
}

// ============================================================
// TRAVESSIA ENTRE CENÁRIOS
// Encostar dois cenários no Mapa-Múndi já cria a passagem, nos dois sentidos. Andar até
// a borda atravessa. Onde o jogador aparece do outro lado é definido por uma placa; sem
// placa, ele surge na borda oposta na mesma altura, de modo que voltar reto o traz de
// volta ao mesmo ponto.
// ============================================================
const EDGE_BAND = 14;          // largura da faixa que dispara a travessia
const ARRIVAL_INSET = 46;      // quanto para dentro o jogador nasce, longe da beirada

function oppositeDir(d){ return {north:'south',south:'north',east:'west',west:'east'}[d]; }

// Placa do mapa de destino que marca a chegada vinda de `fromDir`: a mais próxima da
// borda por onde o jogador entra.
function arrivalSignpost(destKey, fromDir) {
  const borda = oppositeDir(fromDir);
  const dist = n =>
    borda==='west'  ? n.x :
    borda==='east'  ? SCREEN_W - n.x :
    borda==='north' ? n.y : SCREEN_H - n.y;
  return npcData
    .filter(n => n.type==='signpost' && n.mapKey===destKey && dist(n) < 260)
    .sort((a,b) => dist(a) - dist(b))[0] || null;
}

function arrivalPoint(destKey, fromDir, along) {
  const placa = arrivalSignpost(destKey, fromDir);
  // Mesmo vindo pela borda, nunca nascer dentro da faixa de travessia do destino.
  const folga = EDGE_BAND + ARRIVAL_INSET;
  if (placa) return {
    x: Math.max(folga, Math.min(SCREEN_W - folga, placa.x)),
    y: Math.max(folga, Math.min(SCREEN_H - folga, placa.y)),
  };
  // Sem placa: borda oposta, mantendo a coordenada perpendicular.
  if (fromDir==='east')  return { x: ARRIVAL_INSET,              y: along };
  if (fromDir==='west')  return { x: SCREEN_W - ARRIVAL_INSET,   y: along };
  if (fromDir==='north') return { x: along, y: SCREEN_H - ARRIVAL_INSET };
  return                        { x: along, y: ARRIVAL_INSET };
}

// Se a chegada cair fora do caminho pintado, desliza pela borda até achar chão.
function settleArrival(destKey, p, eixo) {
  const anterior = currentKey;
  currentKey = destKey;
  try {
    if (canMoveTo(p.x, p.y)) return p;
    for (let d = 10; d <= 300; d += 10) {
      for (const s of [-1, 1]) {
        const x = eixo==='y' ? p.x : p.x + d*s;
        const y = eixo==='y' ? p.y + d*s : p.y;
        if (x < 24 || x > SCREEN_W-24 || y < 24 || y > SCREEN_H-24) continue;
        if (canMoveTo(x, y)) return { x, y };
      }
    }
    return p;
  } finally { currentKey = anterior; }
}

function checkTransitions() {
  if(!isPlayMode || currentScene!=='world' || playerLocked) return;
  const agora = performance.now();
  if (agora - lastTransTime < 900) return;

  let dir = null;
  if (player.x >= SCREEN_W - EDGE_BAND) dir = 'east';
  else if (player.x <= EDGE_BAND)       dir = 'west';
  else if (player.y <= EDGE_BAND)       dir = 'north';
  else if (player.y >= SCREEN_H - EDGE_BAND) dir = 'south';
  if (!dir) { bordaTravada = false; return; }   // saiu da beirada: a travessia rearma
  if (bordaTravada) return;                     // acabou de chegar aqui — não devolve

  const destino = getNeighbor(currentKey, dir);
  if (!destino) {
    if (agora - lastDeadEndToast > 2500) {
      lastDeadEndToast = agora;
      showToast('🚧 Não há cenário deste lado — encoste um no Mapa-Múndi.');
    }
    return;
  }

  const along = (dir==='north'||dir==='south') ? player.x : player.y;
  const eixo  = (dir==='north'||dir==='south') ? 'x' : 'y';
  const p = settleArrival(destino, arrivalPoint(destino, dir, along), eixo);

  lastTransTime = agora;
  bordaTravada = true;
  currentKey = destino;
  player.x = p.x; player.y = p.y;
  if (activeMapSelect && cenarioExiste(destino)) activeMapSelect.value = destino;
  if (pathGuide.active && pathGuide.questId) {
    const q = activeQuests.find(q => q.id === pathGuide.questId);
    if (q) { pathGuide.waypoints = (q.path_waypoints?.[currentKey]) || []; pathGuide.particles = []; }
  }
  updateMapStatus();
  showToast(SCENE_NAMES[destino] || destino);
  if (isPlayMode) talvezIniciarCenaDoMapa(destino);
}

function checkDoors() {
  if(!isPlayMode)return;
  const now=performance.now();if(now-lastDoorTime<1200)return;
  if(currentScene==='world'){
    const L=getLayers(currentKey);
    try{
      const p=L.doorCtx.getImageData(Math.floor(player.x),Math.floor(player.y),1,1).data;
      if(p[0]>120&&p[2]>180&&p[3]>50) enterInterior('loja');
    }catch(e){}
  } else {
    const def=interiorDef();
    if(def && player.y>=def.exitY) leaveInterior();
  }
}

// Dentro de um interior o jogador não tem referência de onde é a porta. Estas duas
// funções desenham a saída e o balcão, e alimentam o botão de ação.
function naSaidaDoInterior() {
  const def = interiorDef();
  return !!def && isPlayMode && !playerLocked && player.y >= def.exitY - 60;
}

function renderMarcadoresDoInterior(now) {
  const def = interiorDef();
  if (!def || !isPlayMode) return;
  const pulso = (Math.sin(now * 0.004) + 1) / 2;

  // Balcão / bigorna
  const c = def.counter;
  const perto = Math.hypot(player.x - c.x, player.y - c.y) < c.r;
  ctx.save();
  ctx.globalAlpha = (perto ? 0.55 : 0.3) + pulso * 0.2;
  ctx.strokeStyle = perto ? '#fde047' : '#fbbf24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 34, 62 + pulso * 5, 24 + pulso * 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  const ROTULO_BALCAO = { forge: '🔨 Bigorna', shop: '🏪 Balcão',
                          forjarEscala: '🎼 Altar das Escalas', sortear: '✦ Lago das Notas' };
  const ACAO_BALCAO   = { forge: 'Forjar', shop: 'Comprar',
                          forjarEscala: 'Montar Escala', sortear: 'Tentar a Sorte' };
  const rotulo = ROTULO_BALCAO[def.counterAction] || '✦ Interagir';
  drawBubble(ctx, c.x, c.y - 6, perto ? `E  ·  ${ACAO_BALCAO[def.counterAction] || 'Usar'}` : rotulo,
    { bg: perto ? 'rgba(251,191,36,0.94)' : 'rgba(12,16,24,0.82)',
      border: perto ? '#78350f' : '#fbbf24',
      fg: perto ? '#1c1917' : '#fde68a',
      font: 'bold 11px Outfit, sans-serif' });

  // Saída
  const y = def.exitY;
  ctx.save();
  ctx.globalAlpha = 0.25 + pulso * 0.25;
  const g = ctx.createLinearGradient(0, y - 40, 0, SCREEN_H);
  g.addColorStop(0, 'rgba(253,230,138,0)');
  g.addColorStop(1, 'rgba(253,230,138,.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 40, SCREEN_W, SCREEN_H - y + 40);
  ctx.restore();
  drawBubble(ctx, SCREEN_W / 2, y + 4, naSaidaDoInterior() ? 'E  ·  Sair' : '↓ Saída',
    { bg: naSaidaDoInterior() ? 'rgba(251,191,36,0.94)' : 'rgba(12,16,24,0.82)',
      border: '#78350f', fg: naSaidaDoInterior() ? '#1c1917' : '#fde68a',
      font: 'bold 11px Outfit, sans-serif' });
}

// ============================================================
// SPEECH BUBBLES
// ============================================================
const speech = []; // { npc, text, born, until }

function say(npc, text, ms = 2800) {
  const existing = speech.findIndex(s => s.npc === npc);
  if (existing >= 0) speech.splice(existing, 1); // one bubble per NPC
  speech.push({ npc, text, born: performance.now(), until: performance.now() + ms });
}

// Rounded bubble with a tail pointing down at (cx, baseY). Clamped to stay on screen.
function drawBubble(c, cx, baseY, text, style = {}) {
  c.save();
  c.font = style.font || '11px Outfit, sans-serif';
  const padX = 10, h = 21, r = 6, tail = 6;
  const w = Math.ceil(c.measureText(text).width) + padX * 2;
  const x = Math.max(4, Math.min(SCREEN_W - w - 4, Math.round(cx - w / 2)));
  const y = Math.max(4, Math.round(baseY - h - tail));
  const tipX = Math.max(x + r + tail, Math.min(x + w - r - tail, cx));

  c.globalAlpha = style.alpha ?? 1;
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);          c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);      c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(tipX + tail, y + h);
  c.lineTo(tipX, y + h + tail);    // tail
  c.lineTo(tipX - tail, y + h);
  c.lineTo(x + r, y + h);          c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);              c.arcTo(x, y, x + r, y, r);
  c.closePath();

  c.fillStyle = style.bg || 'rgba(12,15,21,0.92)';
  c.fill();
  c.strokeStyle = style.border || 'rgba(251,191,36,0.85)';
  c.lineWidth = 1.5; c.stroke();
  c.fillStyle = style.fg || '#fde68a';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, x + w / 2, y + h / 2 + 0.5);
  c.restore();
}

function renderSpeech(now) {
  for (let i = speech.length - 1; i >= 0; i--) {
    const s = speech[i];
    if (now > s.until) { speech.splice(i, 1); continue; }
    if (s.npc.mapKey !== currentKey) continue;
    // Fade in over 140ms, out over the last 300ms.
    const inA = Math.min(1, (now - s.born) / 140);
    const outA = Math.min(1, (s.until - now) / 300);
    const b = npcBounds(s.npc);
    drawBubble(ctx, s.npc.x, b.y - 3, s.text, { alpha: Math.min(inA, outA) });
  }
}

// Idle chatter: NPCs with an `ambient` list mutter to themselves when the player is close.
let ambientTimer = 0;
function updateAmbient(now) {
  if (!isPlayMode || dlg.state !== DLG_STATE.CLOSED) return;
  if (now < ambientTimer) return;
  ambientTimer = now + 3500 + Math.random() * 3000;
  const near = npcData.filter(n => n.mapKey === currentKey && n.ambient?.length
    && Math.hypot(player.x - n.x, player.y - n.y) < (n.triggerRadius || 90) * 2.2
    && !speech.some(s => s.npc === n));
  if (!near.length) return;
  const npc = near[Math.floor(Math.random() * near.length)];
  say(npc, npc.ambient[Math.floor(Math.random() * npc.ambient.length)]);
}

// Nearest NPC the player could talk to right now — drives both the E key and the prompt.
function talkTarget() {
  if(!isPlayMode||playerLocked||dlg.state!==DLG_STATE.CLOSED)return null;
  let best=null,bestD=Infinity;
  for(const npc of npcData){
    if(npc.mapKey!==currentKey)continue;
    if(!npc.dialogue||npc.dialogue==='none')continue;
    const d=Math.hypot(player.x-npc.x,player.y-npc.y);
    // Um raio 0 salvo por engano no editor deixava o NPC mudo para sempre.
    if(d<(npc.triggerRadius||90)&&d<bestD){best=npc;bestD=d;}
  }
  return best;
}

// ============================================================
// CRIADOR DE MUNDO
// Uma área separada do resto do motor, de propósito.
//
// O jogo de hoje é uma grade de fotos: cada cenário é uma imagem de 1024x571 e a
// travessia acontece por placa. Isso funciona e continua funcionando — nada aqui mexe
// nele. Este modo constrói a OUTRA coisa: um mundo contínuo, grande, feito de blocos de
// chão que entram e saem da memória conforme o jogador caminha, povoado por objetos com
// física própria.
//
// Por que blocos: uma imagem de 4096x2304 ocupa ~38 MB de RAM descomprimida, não
// importa que o arquivo tenha 3 MB. Três dessas e o navegador de um celular mata a aba.
// Em blocos de 1024x571 (~2,3 MB cada), a memória fica constante — dez blocos por vez,
// independente de o mundo ter 12 ou 1200.
// ============================================================
let MUNDO = {
  nome: 'Mundo Novo',
  bloco: { w: 1024, h: 571 },
  cols: 4, rows: 3,
  blocos: {},                 // "col_row" -> caminho da imagem do chão
  props: [],                  // instâncias em COORDENADA DE MUNDO, não de tela
  spawn: { x: 512, y: 400 },
};
let mundoCam = { x: 0, y: 0, zoom: 1 };
let mundoTeste = false;         // andando pelo mundo em vez de editando
let mundoFerramenta = 'selecionar';  // 'plantar' | 'selecionar' | 'partida'
let mundoPropSel = null, mundoArrastando = null, mundoPan = null, mundoAlca = null;
const mundoBlocos = {};         // "col_row" -> { img, ultimoUso }

function mundoLargura() { return MUNDO.cols * MUNDO.bloco.w; }
function mundoAltura()  { return MUNDO.rows * MUNDO.bloco.h; }

const SUPABASE_URL = 'https://saojbwipdxebibjmtxqc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhb2pid2lwZHhlYmliam10eHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzcxODMsImV4cCI6MjA4NDE1MzE4M30.X9FmXtsbqGg1N-2z6UVSW7PoZmC7vK2K-HNsLLbRpNA';

async function saveMundoCloud(corpoData) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/acordelot_worlds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: 'main', data: corpoData, updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function loadMundoCloud() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/acordelot_worlds?id=eq.main&select=data,updated_at`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0 && rows[0].data) {
        return rows[0].data;
      }
    }
  } catch (e) {}
  return null;
}

// ── SINCRONIZAÇÃO EM TEMPO REAL E COOPERATIVA NO SUPABASE ─────────────────────────
window._propsDeletadosNestaSessao = window._propsDeletadosNestaSessao || new Set();

async function savePinturaCloud(k, pngData) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/acordelot_worlds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: `pintura_${k}`, data: { png: pngData }, updated_at: new Date().toISOString() })
    });
  } catch (e) {}
}

async function syncAllLocalPinturasToCloud() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('acordelot_pintura_')) {
        const k = key.replace('acordelot_pintura_', '');
        const png = localStorage.getItem(key);
        if (png && !sessionStorage.getItem('synced_pin_' + k)) {
          savePinturaCloud(k, png);
          sessionStorage.setItem('synced_pin_' + k, '1');
        }
      }
    }
  } catch(e) {}
}

async function loadPinturasCloud() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/acordelot_worlds?id=like.pintura_*&select=id,data,updated_at`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (res.ok) {
      const rows = await res.json();
      let count = 0;
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (r && r.id && r.data && r.data.png) {
            const k = r.id.replace('pintura_', '');
            const existing = localStorage.getItem('acordelot_pintura_' + k);
            if (existing !== r.data.png) {
              localStorage.setItem('acordelot_pintura_' + k, r.data.png);
              const img = new Image();
              img.onload = () => {
                try {
                  const [col, row] = k.split('_').map(Number);
                  const cv = pinturaDoBloco(col, row);
                  const cx = cv.getContext('2d');
                  cx.clearRect(0, 0, cv.width, cv.height);
                  cx.drawImage(img, 0, 0);
                } catch (e) {}
              };
              img.src = r.data.png;
              count++;
            }
          }
        }
      }
      return count;
    }
  } catch(e) {}
  return 0;
}

async function saveAssetCloud(id, def, png, mat) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/acordelot_worlds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: `asset_${id}`, data: { id, def, png, mat }, updated_at: new Date().toISOString() })
    });
  } catch (e) {}
}

async function loadAssetsCloud() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/acordelot_worlds?id=like.asset_*&select=id,data`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (res.ok) {
      const rows = await res.json();
      let mudou = false;
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (r && r.data && r.data.id && r.data.def && r.data.png) {
            const { id, def, png, mat } = r.data;
            if (!propDefs[id] || localStorage.getItem('acordelot_custom_prop_' + id) !== png) {
              def.novo = true;
              def.sprite = png;
              propDefs[id] = def;
              try {
                localStorage.setItem('acordelot_custom_def_' + id, JSON.stringify(def));
                localStorage.setItem('acordelot_custom_prop_' + id, png);
              } catch(e) {}
              if (mat) {
                MATERIAIS[id] = mat;
                MATERIAIS[id].arquivo = png;
                try { localStorage.setItem('acordelot_custom_mat_' + id, JSON.stringify(mat)); } catch(e){}
                carregarTexturaDoPincel(id);
              }
              const img = new Image();
              img.onload = () => { try { propSprites[id] = prepareSprite(img); } catch(e){} };
              img.src = png;
              mudou = true;
            }
          }
        }
      }
      if (mudou) {
        if (typeof renderPaletaDeProps === 'function') renderPaletaDeProps();
        if (typeof renderPropPaletteTablet === 'function') renderPropPaletteTablet();
        if (typeof window.renderMateriais === 'function') window.renderMateriais();
        if (typeof renderMateriaisTablet === 'function') renderMateriaisTablet();
      }
    }
  } catch(e) {}
}

async function sincronizarComNuvemAgora(manual = false) {
  if (IS_PLAY_BUILD) return;
  if (manual) showToast('☁️ Sincronizando em tempo real com o Supabase...');
  syncAllLocalPinturasToCloud();
  const novasPinturas = await loadPinturasCloud();
  await loadAssetsCloud();
  const cloudData = await loadMundoCloud();
  let novosProps = 0;
  if (cloudData && Array.isArray(cloudData.props) && MUNDO && MUNDO.props) {
    const meusIds = new Set(MUNDO.props.map(p => p.id));
    for (const pOutro of cloudData.props) {
      if (!meusIds.has(pOutro.id) && !window._propsDeletadosNestaSessao?.has(pOutro.id)) {
        MUNDO.props.push({ ...pOutro, ex: pOutro.ex ?? 1, ey: pOutro.ey ?? 1, rot: pOutro.rot || 0 });
        meusIds.add(pOutro.id);
        novosProps++;
      }
    }
  }
  if (manual || novosProps > 0 || novasPinturas > 0) {
    if (novosProps > 0 || novasPinturas > 0) {
      showToast(`⚡ Sincronizado em tempo real: +${novosProps} objeto(s), +${novasPinturas} rua(s) do seu amigo!`);
    } else if (manual) {
      showToast('✨ Tudo sincronizado e em ordem com o Supabase!');
    }
  }
}

// Sincroniza cooperativamente em segundo plano a cada 6 segundos no modo editor
setInterval(() => {
  if (typeof engineMode !== 'undefined' && engineMode === 'mundo' && !IS_PLAY_BUILD) {
    sincronizarComNuvemAgora(false);
  }
}, 6000);

async function loadMundo() {
  let loadedData = null;

  // 1. Tenta carregar primeiro da nuvem Supabase Online (sincroniza entre todos os dispositivos/Vercel)
  const cloudData = await loadMundoCloud();
  if (cloudData) {
    loadedData = cloudData;
  }

  // 2. Se não houver dados na nuvem, carrega do arquivo estático assets/mundo/mundo.json
  if (!loadedData) {
    try {
      const r = await fetch(`assets/mundo/mundo.json?t=${Date.now()}`);
      if (r.ok) loadedData = await r.json();
    } catch (e) {}
  }

  if (loadedData) {
    MUNDO = { ...MUNDO, ...loadedData };
    MUNDO.props = (loadedData.props || []).map(p => ({
      ...p, ex: p.ex ?? p.escala ?? 1, ey: p.ey ?? p.escala ?? 1, rot: p.rot || 0,
      flipY: !!p.flipY,
    }));
    carregarPintura();
    setTimeout(() => sincronizarComNuvemAgora(false), 1000);
  }
}

async function saveMundo() {
  if (IS_PLAY_BUILD) return;

  // Antes de regravar a nuvem, mescla com o que o parceiro salvou no Supabase!
  const cloudOld = await loadMundoCloud();
  if (cloudOld && Array.isArray(cloudOld.props) && MUNDO && MUNDO.props) {
    const meusIds = new Set(MUNDO.props.map(p => p.id));
    for (const pOutro of cloudOld.props) {
      if (!meusIds.has(pOutro.id) && !window._propsDeletadosNestaSessao?.has(pOutro.id)) {
        MUNDO.props.push({ ...pOutro, ex: pOutro.ex ?? 1, ey: pOutro.ey ?? 1, rot: pOutro.rot || 0 });
        meusIds.add(pOutro.id);
      }
    }
  }

  const corpoData = {
    nome: MUNDO.nome, bloco: MUNDO.bloco, cols: MUNDO.cols, rows: MUNDO.rows,
    blocos: MUNDO.blocos, spawn: MUNDO.spawn,
    props: MUNDO.props.map(p => ({
      id: p.id, prop: p.prop, x: Math.round(p.x), y: Math.round(p.y),
      ex: +escX(p).toFixed(3), ey: +escY(p).toFixed(3),
      rot: +((p.rot || 0).toFixed(4)), flipX: !!p.flipX, flipY: !!p.flipY,
    })),
  };
  const corpo = JSON.stringify(corpoData, null, 2);

  // 1. Salva no localStorage para nunca perder o progresso no navegador
  try { localStorage.setItem('acordelot_mundo_saved', corpo); } catch (e) {}

  // 2. Salva ONLINE na nuvem Supabase (Vercel, Celular, Mac)
  const cloudOk = await saveMundoCloud(corpoData);
  syncAllLocalPinturasToCloud();

  // 3. Salva no servidor local Python se estiver rodando em localhost
  let serverOk = false;
  try {
    const r = await fetch('/save_mundo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corpo
    });
    if (r.ok) serverOk = true;
  } catch (e) {}

  if (cloudOk && serverOk) {
    showToast('☁️ Mundo salvo ONLINE no Supabase e em disco!');
  } else if (cloudOk) {
    showToast('☁️ Mundo salvo ONLINE no Supabase!');
  } else if (serverOk) {
    showToast('🌍 Mundo salvo no servidor local');
  } else {
    showToast('💾 Mundo salvo no navegador');
  }
}


// ── Streaming dos blocos de chão ────────────────────────────────────────────────
// Carrega o que está à vista mais uma borda de um bloco, e joga fora o que ficou longe.
// A borda evita o pop-in: o bloco chega antes de entrar em cena.
const MUNDO_MARGEM_BLOCOS = 1;
const MUNDO_DESCARTE_MS = 8000;

function mundoFaixaVisivel() {
  const vw = SCREEN_W / mundoCam.zoom, vh = SCREEN_H / mundoCam.zoom;
  const c0 = Math.floor(mundoCam.x / MUNDO.bloco.w) - MUNDO_MARGEM_BLOCOS;
  const r0 = Math.floor(mundoCam.y / MUNDO.bloco.h) - MUNDO_MARGEM_BLOCOS;
  const c1 = Math.floor((mundoCam.x + vw) / MUNDO.bloco.w) + MUNDO_MARGEM_BLOCOS;
  const r1 = Math.floor((mundoCam.y + vh) / MUNDO.bloco.h) + MUNDO_MARGEM_BLOCOS;
  return {
    c0: Math.max(0, c0), r0: Math.max(0, r0),
    c1: Math.min(MUNDO.cols - 1, c1), r1: Math.min(MUNDO.rows - 1, r1),
  };
}

function mundoAtualizarBlocos(now) {
  const f = mundoFaixaVisivel();
  for (let c = f.c0; c <= f.c1; c++) {
    for (let r = f.r0; r <= f.r1; r++) {
      const k = `${c}_${r}`;
      const caminho = MUNDO.blocos[k];
      if (!caminho) continue;
      if (!mundoBlocos[k]) {
        const img = new Image();
        img.src = caminho;
        mundoBlocos[k] = { img, ultimoUso: now };
      } else mundoBlocos[k].ultimoUso = now;
    }
  }
  // Descarte: solta a referência e zera o src, que é o que devolve a memória de fato.
  for (const k in mundoBlocos) {
    if (now - mundoBlocos[k].ultimoUso < MUNDO_DESCARTE_MS) continue;
    try { mundoBlocos[k].img.src = ''; } catch (e) {}
    delete mundoBlocos[k];
  }
}

// ── Recortador de folhas de sprite ──────────────────────────────────────────────
// O mesmo algoritmo que rodava por fora, agora dentro do editor. É a mesma sequência,
// e cada passo existe por um defeito que apareceu na prática:
//
//   1. fundo = branco CONECTADO À BORDA. Apagar todo pixel branco esburacaria a casca
//      da bétula e o brilho da pedra.
//   2. bolsões internos grandes também são fundo — o vão entre o tronco e a copa
//      ficava ilhado e virava barra branca no meio da árvore.
//   3. ilhas do que sobrou = os sprites.
//   4. franja: a orla que o JPEG deixa entre o desenho e o fundo é clara demais para
//      ser arte e escura demais para o limite do fundo. Limpo só o ANEL colado ao
//      fundo, com limite frouxo, para não comer o contorno escuro do desenho.
//   5. cor média por baixo da transparência: pixel transparente guarda RGB, e no
//      recorte esse RGB era o branco do fundo — a interpolação o trazia de volta como
//      halo leitoso ao desenhar em outro tamanho.
//
// Em JS com tipos binários isso roda em segundos, contra minutos em Python.
const REC = {
  img: null, nome: '', achados: [], limiteBranco: 238, areaMinima: 400,
  limiteFranja: 150, passadasFranja: 2, limiteBuraco: 160,
};

function recAnalisar(img, aoTerminar) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, 0, 0);
  const dados = cx.getImageData(0, 0, w, h);
  const d = dados.data;

  const branco = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    if (d[p] >= REC.limiteBranco && d[p+1] >= REC.limiteBranco && d[p+2] >= REC.limiteBranco)
      branco[i] = 1;
  }

  // preenchimento por linhas de varredura, a partir das quatro bordas
  const fundo = new Uint8Array(w * h);
  const pilha = new Int32Array(w * h);
  let topo = 0;
  const semear = i => { if (branco[i] && !fundo[i]) { fundo[i] = 1; pilha[topo++] = i; } };
  for (let x = 0; x < w; x++) { semear(x); semear((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { semear(y * w); semear(y * w + w - 1); }
  while (topo > 0) {
    const i = pilha[--topo], y = (i / w) | 0;
    let e = i, dd = i;
    while (e % w > 0 && branco[e - 1]) { e--; fundo[e] = 1; }
    while (dd % w < w - 1 && branco[dd + 1]) { dd++; fundo[dd] = 1; }
    for (const vy of [y - 1, y + 1]) {
      if (vy < 0 || vy >= h) continue;
      const base = vy * w;
      for (let x = e % w; x <= dd % w; x++) {
        const j = base + x;
        if (branco[j] && !fundo[j]) { fundo[j] = 1; pilha[topo++] = j; }
      }
    }
  }

  // bolsões de branco cercados pelo desenho, grandes o bastante para serem fundo
  const visto = new Uint8Array(w * h);
  for (let i0 = 0; i0 < w * h; i0++) {
    if (!branco[i0] || fundo[i0] || visto[i0]) continue;
    const ilha = [];
    topo = 0; pilha[topo++] = i0; visto[i0] = 1;
    while (topo > 0) {
      const i = pilha[--topo]; ilha.push(i);
      const x = i % w, y = (i / w) | 0;
      const viz = [x > 0 ? i-1 : -1, x < w-1 ? i+1 : -1, y > 0 ? i-w : -1, y < h-1 ? i+w : -1];
      for (const j of viz) if (j >= 0 && branco[j] && !fundo[j] && !visto[j]) { visto[j] = 1; pilha[topo++] = j; }
    }
    if (ilha.length >= REC.limiteBuraco) for (const j of ilha) fundo[j] = 1;
  }

  // ilhas do que não é fundo = os objetos
  const marcado = new Uint8Array(w * h);
  const caixas = [];
  for (let y0 = 0; y0 < h; y0++) {
    for (let x0 = 0; x0 < w; x0++) {
      const i0 = y0 * w + x0;
      if (fundo[i0] || marcado[i0]) continue;
      let minx = x0, maxx = x0, miny = y0, maxy = y0, area = 0;
      topo = 0; pilha[topo++] = i0; marcado[i0] = 1;
      while (topo > 0) {
        const i = pilha[--topo]; area++;
        const x = i % w, y = (i / w) | 0;
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy; if (ny < 0 || ny >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx; if (nx < 0 || nx >= w) continue;
            const j = ny * w + nx;
            if (!fundo[j] && !marcado[j]) { marcado[j] = 1; pilha[topo++] = j; }
          }
        }
      }
      if (area >= REC.areaMinima) caixas.push({ x: minx, y: miny, w: maxx-minx+1, h: maxy-miny+1, area });
    }
  }

  // recorta cada ilha com alpha, limpa a franja e sangra a cor por baixo
  const achados = caixas.map((c, n) => {
    const m = 2;
    const x0 = Math.max(0, c.x - m), y0 = Math.max(0, c.y - m);
    const x1 = Math.min(w, c.x + c.w + m), y1 = Math.min(h, c.y + c.h + m);
    const cw = x1 - x0, ch = y1 - y0;
    const rec = document.createElement('canvas');
    rec.width = cw; rec.height = ch;
    const rx = rec.getContext('2d', { willReadFrequently: true });
    const saida = rx.createImageData(cw, ch);
    const sd = saida.data;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const src = ((y0 + y) * w + (x0 + x)) * 4, dst = (y * cw + x) * 4;
        const iFundo = (y0 + y) * w + (x0 + x);
        sd[dst] = d[src]; sd[dst+1] = d[src+1]; sd[dst+2] = d[src+2];
        sd[dst+3] = fundo[iFundo] ? 0 : 255;
      }
    }
    recLimparFranja(sd, cw, ch);
    recSangrarCor(sd, cw, ch);
    rx.putImageData(saida, 0, 0);
    const apar = recAparar(rec);
    return { canvas: apar, nome: `${REC.nome}_${String(n+1).padStart(2,'0')}`,
             largura: apar.width, altura: apar.height, area: c.area };
  }).sort((a, b) => b.area - a.area);

  aoTerminar(achados);
}

// Anel colado ao fundo, com limite frouxo: some a orla sem comer o contorno do desenho.
function recLimparFranja(sd, w, h) {
  for (let passada = 0; passada < REC.passadasFranja; passada++) {
    const marcar = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (sd[i+3] === 0) continue;
        const min = Math.min(sd[i], sd[i+1], sd[i+2]);
        if (min < REC.limiteFranja) continue;
        let encosta = false;
        for (let dy = -1; dy <= 1 && !encosta; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) { encosta = true; break; }
            if (sd[(ny * w + nx) * 4 + 3] === 0) { encosta = true; break; }
          }
        }
        if (encosta) marcar.push(i);
      }
    }
    for (const i of marcar) sd[i+3] = 0;
  }
}

function recSangrarCor(sd, w, h) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < w * h * 4; i += 4) {
    if (sd[i+3] < 8) continue;
    r += sd[i]; g += sd[i+1]; b += sd[i+2]; n++;
  }
  if (!n) return;
  r = (r / n) | 0; g = (g / n) | 0; b = (b / n) | 0;
  for (let i = 0; i < w * h * 4; i += 4) {
    if (sd[i+3] >= 8) continue;
    sd[i] = r; sd[i+1] = g; sd[i+2] = b;
  }
}

function recAparar(cv) {
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const d = cx.getImageData(0, 0, cv.width, cv.height).data;
  let minx = cv.width, miny = cv.height, maxx = -1, maxy = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 8) {
        if (x < minx) minx = x; if (x > maxx) maxx = x;
        if (y < miny) miny = y; if (y > maxy) maxy = y;
      }
    }
  }
  if (maxx < 0) return cv;
  const out = document.createElement('canvas');
  out.width = maxx - minx + 1; out.height = maxy - miny + 1;
  out.getContext('2d').drawImage(cv, minx, miny, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// ── Catalogação e gravação dos recortes ─────────────────────────────────────────
// Cada categoria traz o preset de física que ela pede: árvore tem pé quase no fim do
// sprite e tronco fino, pedra tem base larga, flor não bloqueia nada. Assim o trabalho
// por sprite vira escolher a categoria — o resto já vem certo, e só se ajusta o que
// destoar.
const PRESETS = {
  arvore:     { altura: 210, pe: .96, raio: 18, plano: 'objeto' },
  mato:       { altura:  70, pe: .92, raio: 0,  plano: 'objeto' },
  flor:       { altura:  32, pe: .95, raio: 0,  plano: 'objeto' },
  pedra:      { altura:  60, pe: .94, raio: 24, plano: 'objeto' },
  construcao: { altura: 200, pe: .95, raio: 62, plano: 'objeto' },
  muralha:    { altura: 150, pe: .92, raio: 60, plano: 'objeto' },
  vila:       { altura: 100, pe: .95, raio: 12, plano: 'objeto' },
  feira:      { altura: 150, pe: .96, raio: 40, plano: 'objeto' },
  cidade:     { altura: 140, pe: .94, raio: 40, plano: 'objeto' },
  sagrado:    { altura: 260, pe: .96, raio: 20, plano: 'objeto' },
  lapide:     { altura: 115, pe: .95, raio: 16, plano: 'objeto' },
  musical:    { altura:  85, pe: .95, raio: 0,  plano: 'objeto' },
  magico:     { altura:  50, pe: .95, raio: 0,  plano: 'objeto' },
  agua:       { altura: null, pe: 1,  raio: 0,  plano: 'chao', mascara: 'agua' },
  rio:        { altura: null, pe: 1,  raio: 0,  plano: 'chao', mascara: 'agua' },
  ponte:      { altura:  95, pe: .98, raio: 0,  plano: 'objeto' },
  caminho:    { altura: null, pe: 1,  raio: 0,  plano: 'chao' },
  piso:       { altura: null, pe: 1,  raio: 0,  plano: 'chao' },
};

function recRenderResultados() {
  const grade = document.getElementById('recResultados');
  const resumo = document.getElementById('recResumo');
  if (!grade) return;
  grade.innerHTML = '';
  if (resumo) resumo.textContent = REC.achados.length
    ? `${REC.achados.length} peças encontradas — nomeie, escolha a categoria e grave`
    : 'Nenhuma peça encontrada. Tente baixar a Área mínima ou subir o Limite de branco.';

  REC.achados.forEach((a, i) => {
    const card = document.createElement('div');
    card.className = 'rec-card';

    const mini = document.createElement('div');
    mini.className = 'rec-mini';
    const c = document.createElement('canvas');
    const k = Math.min(64 / a.canvas.width, 64 / a.canvas.height, 1);
    c.width = Math.max(1, Math.round(a.canvas.width * k));
    c.height = Math.max(1, Math.round(a.canvas.height * k));
    c.getContext('2d').drawImage(a.canvas, 0, 0, c.width, c.height);
    mini.appendChild(c);
    card.appendChild(mini);

    const campos = document.createElement('div');
    campos.className = 'rec-campos';

    const nome = document.createElement('input');
    nome.className = 'insp-input'; nome.value = a.rotulo || '';
    nome.placeholder = 'Nome no jogo';
    nome.addEventListener('input', e => { a.rotulo = e.target.value; });
    campos.appendChild(nome);

    const cat = document.createElement('select');
    cat.className = 'insp-input';
    Object.keys(PRESETS).forEach(k2 => {
      const o = document.createElement('option');
      o.value = k2; o.textContent = NOME_DA_CATEGORIA[k2] || k2;
      cat.appendChild(o);
    });
    cat.value = a.categoria || 'arvore';
    a.categoria = cat.value;
    cat.addEventListener('change', e => { a.categoria = e.target.value; delete a.altura2; recRenderResultados(); });
    campos.appendChild(cat);

    const p = PRESETS[a.categoria];
    const linha = document.createElement('div');
    linha.className = 'rec-linha';
    const num = (rot, val, aplica) => {
      const w = document.createElement('label');
      w.innerHTML = `<span>${rot}</span>`;
      const inp = document.createElement('input');
      inp.type = 'number'; inp.className = 'insp-input'; inp.value = val;
      inp.addEventListener('change', e => aplica(parseFloat(e.target.value)));
      w.appendChild(inp); linha.appendChild(w);
    };
    if (p.plano !== 'chao') num('altura', a.altura2 ?? p.altura, v => { a.altura2 = v; });
    num('pé', a.pe2 ?? p.pe, v => { a.pe2 = v; });
    num('raio', a.raio2 ?? p.raio, v => { a.raio2 = v; });
    campos.appendChild(linha);

    const tam = document.createElement('div');
    tam.className = 'rec-tam';
    tam.textContent = `${a.canvas.width}×${a.canvas.height}px`;
    campos.appendChild(tam);

    card.appendChild(campos);

    const x = document.createElement('button');
    x.className = 'rec-x'; x.textContent = '✕'; x.title = 'Descartar esta peça';
    x.addEventListener('click', () => { REC.achados.splice(i, 1); recRenderResultados(); });
    card.appendChild(x);

    grade.appendChild(card);
  });
}

async function recGravar() {
  if (!REC.achados.length) { showToast('⚠️ Nada para gravar'); return; }
  const btn = document.getElementById('recGravar');
  if (btn) { btn.disabled = true; btn.textContent = 'Gravando…'; }
  let ok = 0;
  for (const a of REC.achados) {
    const id = (a.rotulo || a.nome || 'extraido_' + Date.now()).replace(/[^a-z0-9_]/gi, '_').toLowerCase();
    const pngData = a.canvas.toDataURL('image/png');

    // Salva arquivo no servidor HTTP local caso esteja rodando em localhost
    try {
      await fetch('/save_prop_png', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: id, png: pngData }),
      });
    } catch (e) {}

    const p = PRESETS[a.categoria] || PRESETS.arvore;
    const def = {
      nome: a.rotulo || id, sprite: pngData, categoria: a.categoria,
      plano: p.plano, pe: a.pe2 ?? p.pe, raio: a.raio2 ?? p.raio,
      colide: (a.raio2 ?? p.raio) > 0,
      novo: true, timestamp: Date.now()
    };
    if (p.plano !== 'chao') def.altura = a.altura2 ?? p.altura;
    if (p.mascara) { def.mascara = p.mascara; def.colide = false; }
    
    // 1. Registra no catálogo de props (Assets / Objetos)
    propDefs[id] = def;
    try {
      localStorage.setItem('acordelot_custom_prop_' + id, pngData);
      localStorage.setItem('acordelot_custom_def_' + id, JSON.stringify(def));
    } catch(e) {}

    // 2. Se for textura/sprite de chão ou se pertencer às categorias de piso/caminho/pedra
    const ehChao = ['piso', 'caminho', 'chao', 'calcada', 'terra', 'pedra', 'agua', 'rio'].includes(a.categoria) || p.plano === 'chao';
    if (ehChao) {
      MATERIAIS[id] = { nome: def.nome || id, arquivo: pngData, div: 1, novo: true };
      try {
        localStorage.setItem('acordelot_custom_mat_' + id, JSON.stringify(MATERIAIS[id]));
      } catch(e) {}
      carregarTexturaDoPincel(id);
    }

    // 3. Sincroniza em tempo real com o Supabase
    try {
      if (typeof saveAssetCloud === 'function') saveAssetCloud(id, def, pngData, MATERIAIS[id] || null);
    } catch(e) {}

    // Carrega o sprite para aparecer imediatamente na paleta
    const img = new Image();
    img.onload = () => {
      try {
        propSprites[id] = prepareSprite(img);
        renderPaletaDeProps();
        renderPropPaletteTablet();
        if (typeof renderMateriaisTablet === 'function') renderMateriaisTablet();
      } catch (e) {}
    };
    img.src = pngData;
    ok++;
  }

  // Tenta salvar alterações do catálogo no servidor local
  try {
    await fetch('/save_objects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: propDefs, objetos: objetos }),
    });
  } catch (e) {}

  if (btn) { btn.disabled = false; btn.textContent = '💾 Gravar no catálogo'; }
  showToast(`✅ ${ok} peça(s) catalogada(s) e enviada(s) para o Supabase! (Categoria: "✨ Novo")`);
  REC.achados = [];
  recRenderResultados();
  renderPaletaDeProps();
  renderPropPaletteTablet();
  if (typeof renderMateriais === 'function') renderMateriais();
  if (typeof renderMateriaisTablet === 'function') renderMateriaisTablet();
}

function initCustomProps() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('acordelot_custom_def_')) {
        const id = k.replace('acordelot_custom_def_', '');
        const defStr = localStorage.getItem(k);
        const pngData = localStorage.getItem('acordelot_custom_prop_' + id);
        if (defStr && pngData) {
          const def = JSON.parse(defStr);
          def.sprite = pngData;
          def.novo = true;
          propDefs[id] = def;

          const img = new Image();
          img.onload = () => {
            try {
              propSprites[id] = prepareSprite(img);
              if (typeof renderPaletaDeProps === 'function') renderPaletaDeProps();
              if (typeof renderPropPaletteTablet === 'function') renderPropPaletteTablet();
            } catch (e) {}
          };
          img.src = pngData;

          const matStr = localStorage.getItem('acordelot_custom_mat_' + id);
          if (matStr) {
            MATERIAIS[id] = JSON.parse(matStr);
            MATERIAIS[id].arquivo = pngData;
            MATERIAIS[id].novo = true;
            carregarTexturaDoPincel(id);
          }
          // Se ainda não tiver na nuvem, dispara um sync silencioso
          try { if (typeof saveAssetCloud === 'function') saveAssetCloud(id, def, pngData, MATERIAIS[id] || null); } catch(e){}
        }
      }
    }
  } catch (e) {}
  sincronizarMateriaisComPropDefs();
}

// ── Chão do mundo, trocável em tempo real ───────────────────────────────────────
// Antes o chão era um JPEG por bloco, gerado por script: trocar a grama exigia rodar
// ferramenta por fora e regravar 70 arquivos. Agora é UMA textura ladrilhada na hora,
// alinhada ao mundo, com brilho ajustável. Trocar a grama do mapa inteiro passa a ser
// escolher no menu.
const TEXTURAS_DE_CHAO = [
  ['grama_campo_3',  'Grama clara'],
  ['grama_campo_1',  'Grama de campo'],
  ['grama_escura_3', 'Grama de mata'],
  ['grama_escura_1', 'Mato fechado'],
  ['terra_1',        'Terra'],
  ['areia_1',        'Areia'],
  ['folhas_1',       'Folhas secas'],
  ['piso_calcada',   'Pedra'],
  ['laje_1',         'Laje antiga'],
];
const chaoCache = {};

function texturaDoChao(id) {
  if (chaoCache[id]) return chaoCache[id];
  const reg = { pronta: false };
  const img = new Image();
  img.onload = () => {
    const div = 3;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width / div));
    c.height = Math.max(1, Math.round(img.height / div));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    reg.tela = c; reg.pronta = true;
  };
  img.src = `assets/texturas/${id}.jpg`;
  chaoCache[id] = reg;
  return reg;
}

function renderChaoDoMundo(f) {
  const cfg = MUNDO.chao;
  if (!cfg || !cfg.textura) return false;
  const tex = texturaDoChao(cfg.textura);
  if (!tex.pronta) return false;
  const pad = ctx.createPattern(tex.tela, 'repeat');
  // Ancorado no mundo, não na câmera: sem isto o chão escorregaria junto com o olhar.
  pad.setTransform(new DOMMatrix().translate(0, 0));
  ctx.save();
  if (cfg.brilho && Math.abs(cfg.brilho - 1) > 0.01) ctx.filter = `brightness(${cfg.brilho})`;
  ctx.fillStyle = pad;
  ctx.fillRect(0, 0, mundoLargura(), mundoAltura());
  ctx.restore();
  return true;
}

// ── Blocos fantasma: o mundo cresce onde você mandar ────────────────────────────
// Afastando o zoom aparece o vazio em volta e, nele, as células que ainda não existem.
// Clicar numa delas estende o mundo naquela direção. É o gesto que faltava para o mapa
// deixar de ter tamanho fixo decidido no início.
function mundoGhostEm(wx, wy) {
  const BW = MUNDO.bloco.w, BH = MUNDO.bloco.h;
  const c = Math.floor(wx / BW), l = Math.floor(wy / BH);
  const dentro = c >= 0 && l >= 0 && c < MUNDO.cols && l < MUNDO.rows;
  if (dentro) return null;
  // só o anel imediato: crescer aos pulos deixaria buracos no meio
  if (c < -1 || l < -1 || c > MUNDO.cols || l > MUNDO.rows) return null;
  return { c, l };
}

function mundoExpandir(g) {
  registrarDesfazer();
  const BW = MUNDO.bloco.w, BH = MUNDO.bloco.h;
  if (g.c >= MUNDO.cols) MUNDO.cols++;
  else if (g.l >= MUNDO.rows) MUNDO.rows++;
  else if (g.c < 0) {
    // crescer para o oeste move a origem: todo o conteúdo anda um bloco para a direita
    MUNDO.cols++;
    MUNDO.props.forEach(p => { p.x += BW; });
    if (MUNDO.spawn) MUNDO.spawn.x += BW;
    mundoCam.x += BW;
  } else if (g.l < 0) {
    MUNDO.rows++;
    MUNDO.props.forEach(p => { p.y += BH; });
    if (MUNDO.spawn) MUNDO.spawn.y += BH;
    mundoCam.y += BH;
  }
  saveMundo();
  showToast(`🧱 Mundo agora tem ${MUNDO.cols}x${MUNDO.rows} blocos`);
}

function renderGhosts() {
  const BW = MUNDO.bloco.w, BH = MUNDO.bloco.h;
  const z = mundoCam.zoom || 1;
  ctx.save();
  ctx.lineWidth = 2 / z;
  ctx.font = `bold ${Math.round(46 / z)}px Outfit, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let c = -1; c <= MUNDO.cols; c++) {
    for (let l = -1; l <= MUNDO.rows; l++) {
      if (c >= 0 && l >= 0 && c < MUNDO.cols && l < MUNDO.rows) continue;
      if ((c < 0 || c >= MUNDO.cols) && (l < 0 || l >= MUNDO.rows)) continue;  // só ortogonais
      const x = c * BW, y = l * BH;
      ctx.setLineDash([12 / z, 9 / z]);
      ctx.strokeStyle = 'rgba(125,211,252,.45)';
      ctx.strokeRect(x + 6 / z, y + 6 / z, BW - 12 / z, BH - 12 / z);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(125,211,252,.30)';
      ctx.fillText('+', x + BW / 2, y + BH / 2);
    }
  }
  ctx.restore();
}

// ── Ambiente: hora, vento e chuva ───────────────────────────────────────────────
// Um punhado de números manda em tudo. O vento é o principal: ele inclina as copas,
// deita a chuva e arrasta as folhas — e como é UM valor só, tudo se move no mesmo
// ritmo. É isso que faz parecer um lugar em vez de vários efeitos rodando juntos.
const AMB = { hora: 12, vento: 0.3, chuva: 0, nevoa: 0 };

// Cor do céu sobre o mundo, por hora. Interpolo entre as âncoras para o dia virar
// devagar em vez de pular de um tom para outro.
const LUZ_DO_DIA = [
  { h: 0,  cor: [18, 26, 62],  a: .58 },   // madrugada
  { h: 6,  cor: [92, 74, 96],  a: .34 },   // primeira luz
  { h: 8,  cor: [255, 196, 120], a: .16 }, // manhã dourada
  { h: 12, cor: [255, 255, 255], a: 0 },   // meio-dia
  { h: 17, cor: [255, 168, 92], a: .18 },  // fim de tarde
  { h: 20, cor: [64, 62, 120], a: .40 },   // anoitecer
  { h: 24, cor: [18, 26, 62],  a: .58 },
];

function corDoAmbiente() {
  const h = ((AMB.hora % 24) + 24) % 24;
  let a = LUZ_DO_DIA[0], b = LUZ_DO_DIA[LUZ_DO_DIA.length - 1];
  for (let i = 0; i < LUZ_DO_DIA.length - 1; i++) {
    if (h >= LUZ_DO_DIA[i].h && h <= LUZ_DO_DIA[i + 1].h) { a = LUZ_DO_DIA[i]; b = LUZ_DO_DIA[i + 1]; break; }
  }
  const t = (h - a.h) / Math.max(0.001, b.h - a.h);
  const mix = (x, y) => Math.round(x + (y - x) * t);
  return { cor: [mix(a.cor[0], b.cor[0]), mix(a.cor[1], b.cor[1]), mix(a.cor[2], b.cor[2])],
           alfa: a.a + (b.a - a.a) * t };
}

// Chuva: gotas em coordenada de TELA, não de mundo. Chuva presa ao mundo escorregaria
// junto com a câmera e denunciaria o truque na hora.
const gotas = [];
function atualizarChuva(now) {
  const alvo = Math.round(AMB.chuva * 260);
  while (gotas.length < alvo) gotas.push({ x: Math.random() * SCREEN_W, y: Math.random() * SCREEN_H,
                                           v: 9 + Math.random() * 7, c: 8 + Math.random() * 14 });
  while (gotas.length > alvo) gotas.pop();
  const inclina = AMB.vento * 7;
  gotas.forEach(g => {
    g.y += g.v; g.x += inclina;
    if (g.y > SCREEN_H) { g.y = -20; g.x = Math.random() * SCREEN_W; }
    if (g.x > SCREEN_W + 20) g.x = -20;
    if (g.x < -20) g.x = SCREEN_W + 20;
  });
}

// Nome próprio: o motor já tem um `renderAmbiente` do jogo antigo, e duas declarações
// com o mesmo nome fazem a última vencer — a minha era simplesmente ignorada.
function renderAmbienteDoMundo(now) {
  const { cor, alfa } = corDoAmbiente();
  if (alfa > 0.002) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(${cor[0]},${cor[1]},${cor[2]},${alfa})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.restore();
  }
  if (AMB.nevoa > 0.002) {
    ctx.save();
    ctx.fillStyle = `rgba(226,232,240,${AMB.nevoa * 0.4})`;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    ctx.restore();
  }
  if (AMB.chuva > 0.002) {
    atualizarChuva(now);
    ctx.save();
    ctx.strokeStyle = `rgba(190,214,240,${0.25 + AMB.chuva * 0.35})`;
    ctx.lineWidth = 1.2;
    const inclina = AMB.vento * 7;
    ctx.beginPath();
    gotas.forEach(g => { ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - inclina * 1.6, g.y - g.c); });
    ctx.stroke();
    ctx.restore();
  }
}

// Quanto o topo do sprite se inclina agora. Cada objeto tem defasagem própria, senão a
// floresta inteira balança em uníssono — que é o erro clássico e entrega o truque.
const BALANCA = { arvore: 1, sagrado: 1, mato: 1.4, flor: 1.6, musical: 1.2, magico: 1.2 };
function inclinacaoDoVento(p, def, now) {
  const forca = BALANCA[def.categoria];
  if (!forca || AMB.vento < 0.01) return 0;
  if (p.fase === undefined) p.fase = (p.x * 0.013 + p.y * 0.007) % (Math.PI * 2);
  const t = now * 0.0011 * (0.6 + AMB.vento) + p.fase;
  return (Math.sin(t) * 0.55 + Math.sin(t * 2.3) * 0.2) * AMB.vento * 0.075 * forca;
}

// ── Pintura de terreno ──────────────────────────────────────────────────────────
// Caminho não é objeto: é chão. As peças de trilha e calçada trazem a própria franja de
// grama desenhada, então emendam mal e só servem no sentido em que foram desenhadas.
// Aqui o traço é pintado direto no bloco, na direção que a mão quiser.
//
// Cada bloco ganha uma tela transparente por cima do chão. O pincel carimba um círculo
// preenchido com a textura do material, e a textura é ancorada nas COORDENADAS DO
// MUNDO — sem isso, cada carimbo começaria o desenho do zero e a estrada viraria uma
// colcha de retalhos.
const MATERIAIS = {
  terra:         { nome: 'Terra',                arquivo: 'assets/texturas/terra_1.jpg',        div: 2 },
  piso:          { nome: 'Rua de Pedra',         arquivo: 'assets/texturas/piso_calcada.jpg',  div: 3 },
  laje:          { nome: 'Calçada Antiga',       arquivo: 'assets/texturas/laje_1.jpg',         div: 4 },
  pedra_calcada: { nome: 'Pedras de Calçada HD', arquivo: 'assets/piso_calcada.jpg',          div: 2 },
  areia:         { nome: 'Areia',                arquivo: 'assets/texturas/areia_1.jpg',        div: 2 },
  folhas:        { nome: 'Folhas',               arquivo: 'assets/texturas/folhas_1.jpg',       div: 2 },
  grama_clara:   { nome: 'Grama clara',          arquivo: 'assets/texturas/grama_campo_3.jpg',  div: 3 },
  grama_campo:   { nome: 'Grama de campo',       arquivo: 'assets/texturas/grama_campo_1.jpg',  div: 3 },
  grama_escura:  { nome: 'Grama escura',         arquivo: 'assets/texturas/grama_escura_3.jpg', div: 3 },
  grama_mata:    { nome: 'Mato fechado',         arquivo: 'assets/texturas/grama_escura_1.jpg', div: 3 },
};

function sincronizarPropDefsComMateriais() {
  if (typeof propDefs === 'undefined' || typeof MATERIAIS === 'undefined') return;
  Object.entries(propDefs).forEach(([id, def]) => {
    const cat = (def.categoria || '').toLowerCase();
    const ehPiso = ['piso', 'caminho', 'chao', 'calcada', 'terra', 'pedra'].includes(cat) || def.plano === 'chao';
    if (ehPiso && !MATERIAIS[id]) {
      MATERIAIS[id] = {
        nome: def.nome || id,
        arquivo: def.sprite,
        div: 1
      };
      carregarTexturaDoPincel(id);
    }
  });
}

function alternarPisoPintavel(id) {
  const def = propDefs[id];
  if (!def && !MATERIAIS[id]) return;

  if (MATERIAIS[id]) {
    delete MATERIAIS[id];
    delete texturasDoPincel[id];
    if (pincelMaterial === id) pincelMaterial = null;
    showToast(`❌ ${def?.nome || id} removido do Pincel de Chão`);
  } else {
    MATERIAIS[id] = {
      nome: def?.nome || id,
      arquivo: def?.sprite || '',
      div: 1
    };
    carregarTexturaDoPincel(id);
    pincelMaterial = id;
    propParaColocar = null;
    if (typeof renderPaletaDeProps === 'function') renderPaletaDeProps();
    document.getElementById('pincelTamanhoBox')?.style.setProperty('display', '');
    document.getElementById('pincelModoBox')?.style.setProperty('display', '');
    showToast(`🖌️ Pincel ativado com ${def?.nome || id}! Pronto para pintar.`);
  }

  try {
    const ativos = Object.keys(MATERIAIS);
    localStorage.setItem('acordelot_materiais_ativos', JSON.stringify(ativos));
  } catch (e) {}

  if (typeof window.renderMateriais === 'function') window.renderMateriais();
  if (typeof renderMateriaisTablet === 'function') renderMateriaisTablet();
}

function abrirModalGerenciarPisos() {
  const modal = document.getElementById('modalGerenciarPisos');
  const lista = document.getElementById('listaModalPisos');
  const busca = document.getElementById('buscaModalPisos');
  if (!modal || !lista) return;

  const renderListaModal = () => {
    lista.innerHTML = '';
    const q = (busca?.value || '').toLowerCase().trim();

    Object.entries(propDefs).forEach(([id, def]) => {
      const nome = def.nome || id;
      if (q && !nome.toLowerCase().includes(q) && !id.toLowerCase().includes(q)) return;

      const selecionado = !!MATERIAIS[id];
      const card = document.createElement('div');
      card.className = 'item-piso-card' + (selecionado ? ' selecionado' : '');

      const img = document.createElement('img');
      img.src = def.sprite;
      card.appendChild(img);

      const span = document.createElement('span');
      span.textContent = nome;
      card.appendChild(span);

      if (selecionado) {
        const check = document.createElement('div');
        check.className = 'check-icon';
        check.textContent = '✅';
        card.appendChild(check);
      }

      card.onclick = () => {
        alternarPisoPintavel(id);
        renderListaModal();
      };

      lista.appendChild(card);
    });
  };

  if (busca) busca.oninput = renderListaModal;
  renderListaModal();
  modal.classList.remove('hidden');

  const fechar = () => modal.classList.add('hidden');
  const btnFechar = document.getElementById('fecharModalPisos');
  if (btnFechar) btnFechar.onclick = fechar;
  const btnSalvar = document.getElementById('salvarModalPisos');
  if (btnSalvar) btnSalvar.onclick = fechar;
}

const texturasDoPincel = {};      // id -> { img, padrao }
let pincelMaterial = null;        // null = pincel desligado
let pincelTamanho = 90;
let pinturaAtiva = false;
const blocosPintados = {};        // "c_r" -> canvas
const pinturaSuja = new Set();    // blocos alterados desde o último salvamento

function carregarTexturaDoPincel(id) {
  if (texturasDoPincel[id] && texturasDoPincel[id].pronta) return texturasDoPincel[id];
  const def = MATERIAIS[id];
  if (!def) return null;

  const spr = (typeof propSprites !== 'undefined') ? propSprites[id] : null;
  if (spr && spr.canvas) {
    const reg = { img: spr.img || null, tela: spr.canvas, pronta: true };
    texturasDoPincel[id] = reg;
    return reg;
  }

  const srcFile = def.arquivo || (propDefs[id] ? propDefs[id].sprite : '');
  if (!srcFile) return null;

  const img = new Image();
  const reg = { img, pronta: false };
  img.onload = () => {
    const div = def.div || 1;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width / div));
    c.height = Math.max(1, Math.round(img.height / div));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    reg.tela = c; reg.pronta = true;
  };
  img.onerror = () => {
    if (spr && spr.canvas) {
      reg.tela = spr.canvas; reg.pronta = true;
    }
  };
  img.src = srcFile;
  texturasDoPincel[id] = reg;
  return reg;
}

function pinturaDoBloco(c, r) {
  const k = `${c}_${r}`;
  if (!blocosPintados[k]) {
    const cv = document.createElement('canvas');
    cv.width = MUNDO.bloco.w; cv.height = MUNDO.bloco.h;
    blocosPintados[k] = cv;
  }
  return blocosPintados[k];
}

async function carregarPintura() {
  if (typeof syncAllLocalPinturasToCloud === 'function') syncAllLocalPinturasToCloud();
  if (typeof loadPinturasCloud === 'function') await loadPinturasCloud();
  const alvos = Object.keys(MUNDO.blocos || {});
  await Promise.all(alvos.map(k => new Promise(res => {
    try {
      const localPng = localStorage.getItem('acordelot_pintura_' + k);
      if (localPng) {
        const imgLocal = new Image();
        imgLocal.onload = () => {
          const [c, r] = k.split('_').map(Number);
          pinturaDoBloco(c, r).getContext('2d').drawImage(imgLocal, 0, 0);
          res();
        };
        imgLocal.onerror = () => res();
        imgLocal.src = localPng;
        return;
      }
    } catch(e) {}

    const img = new Image();
    img.onload = () => {
      const [c, r] = k.split('_').map(Number);
      pinturaDoBloco(c, r).getContext('2d').drawImage(img, 0, 0);
      res();
    };
    img.onerror = () => res();
    img.src = `assets/mundo/pintura/${k}.png?t=${Date.now()}`;
  })));
}

// Carimba um círculo do material no ponto do mundo, atravessando blocos sem costura.
function pincelar(wx, wy) {
  if (!pincelMaterial) return;
  const raio = pincelTamanho / 2;
  const BW = MUNDO.bloco.w, BH = MUNDO.bloco.h;
  // A margem de 2px garante que a borda do pincel não seja cortada na emenda dos blocos
  const c0 = Math.max(0, Math.floor((wx - raio - 2) / BW));
  const c1 = Math.min(MUNDO.cols - 1, Math.floor((wx + raio + 2) / BW));
  const r0 = Math.max(0, Math.floor((wy - raio - 2) / BH));
  const r1 = Math.min(MUNDO.rows - 1, Math.floor((wy + raio + 2) / BH));
  const apagando = pincelMaterial === 'apagar';
  const tex = apagando ? null : carregarTexturaDoPincel(pincelMaterial);

  if (!apagando && (!tex || !tex.pronta)) {
    if (!window.__avisoTextura || performance.now() - window.__avisoTextura > 3000) {
      window.__avisoTextura = performance.now();
      showToast('⏳ Carregando a textura do pincel — tente de novo em um instante');
    }
    return;
  }

  for (let c = c0; c <= c1; c++) {
    for (let r = r0; r <= r1; r++) {
      const cv = pinturaDoBloco(c, r);
      const cx = cv.getContext('2d');
      const lx = wx - c * BW, ly = wy - r * BH;
      cx.save();
      // Raio estendido em 1.5px elimina frestas subpixel onde a grama anterior reaparecia
      cx.beginPath(); cx.arc(lx, ly, raio + 1.5, 0, Math.PI * 2); cx.clip();
      if (apagando) {
        cx.globalCompositeOperation = 'destination-out';
        cx.fillRect(lx - raio - 3, ly - raio - 3, (raio + 3) * 2, (raio + 3) * 2);
      } else {
        const pad = cx.createPattern(tex.tela, 'repeat');
        const offX = -(c * BW) % tex.tela.width;
        const offY = -(r * BH) % tex.tela.height;
        if (typeof DOMMatrix !== 'undefined' && pad.setTransform) {
          pad.setTransform(new DOMMatrix().translate(offX, offY));
        }
        cx.fillStyle = pad;
        cx.fillRect(lx - raio - 3, ly - raio - 3, (raio + 3) * 2, (raio + 3) * 2);
      }
      cx.restore();
      pinturaSuja.add(`${c}_${r}`);
    }
  }
}

let pincelModo = 'livre';        // 'livre' = mão livre, 'estrada' = segmentos retos, 'praca' = praça circular preenchida
let estradaDe = null;            // ponto de origem do segmento em desenho
let estradaAte = null;           // ponta atual, já com o ângulo travado
let pracaCentro = null;          // centro da praça circular
let pracaAtual = null;           // raio atual da praça circular
const ANGULO_TRAVA = Math.PI / 4;

function travarAngulo(x0, y0, x1, y1, livre) {
  const dx = x1 - x0, dy = y1 - y0;
  const comp = Math.hypot(dx, dy);
  if (livre || comp < 1) return { x: x1, y: y1, comp };
  const a = Math.round(Math.atan2(dy, dx) / ANGULO_TRAVA) * ANGULO_TRAVA;
  return { x: x0 + Math.cos(a) * comp, y: y0 + Math.sin(a) * comp, comp };
}

// Passo muito mais denso (dividir por 12 em vez de 6) elimina bordas onduladas ("recorte de lagarta")
function pintarSegmento(x0, y0, x1, y1) {
  const passo = Math.max(2, pincelTamanho / 12);
  const comp = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(comp / passo));
  for (let i = 0; i <= n; i++) pincelar(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
}

function pintarPracaPreenchida(wx, wy, raio) {
  if (!pincelMaterial || raio < 2) return;
  const BW = MUNDO.bloco.w, BH = MUNDO.bloco.h;
  const c0 = Math.max(0, Math.floor((wx - raio - 2) / BW));
  const c1 = Math.min(MUNDO.cols - 1, Math.floor((wx + raio + 2) / BW));
  const r0 = Math.max(0, Math.floor((wy - raio - 2) / BH));
  const r1 = Math.min(MUNDO.rows - 1, Math.floor((wy + raio + 2) / BH));
  const apagando = pincelMaterial === 'apagar';
  const tex = apagando ? null : carregarTexturaDoPincel(pincelMaterial);

  if (!apagando && (!tex || !tex.pronta)) return;

  for (let c = c0; c <= c1; c++) {
    for (let r = r0; r <= r1; r++) {
      const cv = pinturaDoBloco(c, r);
      const cx = cv.getContext('2d');
      const lx = wx - c * BW, ly = wy - r * BH;
      cx.save();
      cx.beginPath(); cx.arc(lx, ly, raio + 1.5, 0, Math.PI * 2); cx.clip();
      if (apagando) {
        cx.globalCompositeOperation = 'destination-out';
        cx.fillRect(lx - raio - 3, ly - raio - 3, (raio + 3) * 2, (raio + 3) * 2);
      } else {
        const pad = cx.createPattern(tex.tela, 'repeat');
        const offX = -(c * BW) % tex.tela.width;
        const offY = -(r * BH) % tex.tela.height;
        if (typeof DOMMatrix !== 'undefined' && pad.setTransform) {
          pad.setTransform(new DOMMatrix().translate(offX, offY));
        }
        cx.fillStyle = pad;
        cx.fillRect(lx - raio - 3, ly - raio - 3, (raio + 3) * 2, (raio + 3) * 2);
      }
      cx.restore();
      pinturaSuja.add(`${c}_${r}`);
    }
  }
}

function renderTracadoDeEstrada() {
  if (pincelModo === 'praca' && pracaCentro && pracaAtual) {
    const z = mundoCam.zoom || 1;
    const raio = Math.hypot(pracaAtual.x - pracaCentro.x, pracaAtual.y - pracaCentro.y);
    ctx.save();
    ctx.fillStyle = pincelMaterial === 'apagar' ? 'rgba(252,165,165,.35)' : 'rgba(253,230,138,.35)';
    ctx.beginPath(); ctx.arc(pracaCentro.x, pracaCentro.y, raio, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2 / z; ctx.setLineDash([6 / z, 4 / z]);
    ctx.beginPath(); ctx.arc(pracaCentro.x, pracaCentro.y, raio, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(pracaCentro.x, pracaCentro.y, 4 / z, 0, Math.PI * 2); ctx.fill();

    ctx.font = `bold ${11 / z}px Outfit, sans-serif`; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(6,9,14,.85)';
    const txt = `⭕ Praça: Raio ${Math.round(raio)}px (Diâmetro ${Math.round(raio * 2)}px)`;
    const larg = ctx.measureText(txt).width + 12 / z;
    ctx.fillRect(pracaCentro.x - larg / 2, pracaCentro.y - raio - 24 / z, larg, 18 / z);
    ctx.fillStyle = '#fde68a';
    ctx.fillText(txt, pracaCentro.x, pracaCentro.y - raio - 11 / z);
    ctx.restore();
    return;
  }

  if (!estradaDe || !estradaAte) return;
  const z = mundoCam.zoom || 1;
  ctx.save();
  ctx.strokeStyle = pincelMaterial === 'apagar' ? 'rgba(252,165,165,.55)' : 'rgba(253,230,138,.5)';
  ctx.lineWidth = pincelTamanho;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(estradaDe.x, estradaDe.y); ctx.lineTo(estradaAte.x, estradaAte.y);
  ctx.stroke();

  ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 1.5 / z; ctx.setLineDash([6 / z, 4 / z]);
  ctx.beginPath(); ctx.moveTo(estradaDe.x, estradaDe.y); ctx.lineTo(estradaAte.x, estradaAte.y);
  ctx.stroke(); ctx.setLineDash([]);

  const comp = Math.hypot(estradaAte.x - estradaDe.x, estradaAte.y - estradaDe.y);
  const ang = Math.round(Math.atan2(estradaAte.y - estradaDe.y, estradaAte.x - estradaDe.x) * 180 / Math.PI);
  ctx.font = `bold ${11 / z}px Outfit, sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(6,9,14,.85)';
  const txt = `${Math.round(comp)}px · ${ang}° · ${pincelTamanho}px de largura`;
  const larg = ctx.measureText(txt).width + 12 / z;
  const mx = (estradaDe.x + estradaAte.x) / 2, my = (estradaDe.y + estradaAte.y) / 2;
  ctx.fillRect(mx - larg / 2, my - 30 / z, larg, 18 / z);
  ctx.fillStyle = '#fde68a';
  ctx.fillText(txt, mx, my - 17 / z);
  ctx.restore();
}

async function salvarPintura() {
  if (IS_PLAY_BUILD || !pinturaSuja.size) return;
  const lote = [...pinturaSuja];
  pinturaSuja.clear();
  for (const k of lote) {
    const cv = blocosPintados[k];
    if (!cv) continue;
    const pngData = cv.toDataURL('image/png');
    // 1. Salva no localStorage em hosts estáticos (Vercel) e tablets
    try { localStorage.setItem('acordelot_pintura_' + k, pngData); } catch (e) {}
    // 2. Sincroniza em tempo real direto na nuvem do Supabase
    try { if (typeof savePinturaCloud === 'function') savePinturaCloud(k, pngData); } catch (e) {}
    // 3. Salva no servidor local Python se estiver no localhost
    try {
      await fetch('/save_pintura', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: k, png: pngData }),
      });
    } catch (e) {}
  }
}


// ── Props do mundo ──────────────────────────────────────────────────────────────
// Escala em dois eixos e ângulo próprios. Esticar num eixo só é o que faz uma peça
// desenhada em 3/4 — muralha, cerca, calçada — encostar na vizinha: sem isso ela só
// cresce na diagonal e nunca fecha a linha.
function escX(p) { return p.ex ?? p.escala ?? 1; }
function escY(p) { return p.ey ?? p.escala ?? 1; }

function mundoPropBounds(p) {
  const spr = propSprites[p.prop];
  const def = propDefs[p.prop] || {};
  const hBase = def.altura || (spr ? spr.sh : 96);
  const h = hBase * escY(p);
  const w = (spr ? hBase * (spr.sw / spr.sh) : hBase * 0.8) * escX(p);
  // Peça de chão é centrada no ponto onde você clicou; objeto é ancorado pelo pé.
  if (def.plano === 'chao') return { x: p.x - w / 2, y: p.y - h / 2, w, h };
  return { x: p.x - w / 2, y: p.y - h * (def.pe ?? 0.9), w, h };
}

// Desenha um prop já com espelho, giro e escala aplicados. O giro acontece em torno do
// PÉ, não do centro: girar pelo centro faz o objeto sair do chão e flutuar.
function desenharProp(spr, p, b, now) {
  const rot = p.rot || 0;
  const def = propDefs[p.prop] || {};
  ctx.save();
  // Espelho vertical: a arte é 3/4, não 3D, mas virar a peça de cabeça para baixo muda
  // de que lado cai a sombra e para onde aponta o telhado — na montagem isso resolve
  // muita esquina que não fechava.
  if (p.flipY) { ctx.translate(0, p.y); ctx.scale(1, -1); ctx.translate(0, -p.y); }
  if (rot) { ctx.translate(p.x, p.y); ctx.rotate(rot); ctx.translate(-p.x, -p.y); }

  // Balanço: cisalhamento horizontal preso ao pé — nada na base, o máximo na copa. É
  // mais convincente que trocar quadros porque a folhagem se deforma como folhagem.
  const k = now !== undefined ? inclinacaoDoVento(p, def, now) : 0;
  if (k) { ctx.translate(0, p.y); ctx.transform(1, 0, -k, 1, 0, 0); ctx.translate(0, -p.y); }
  if (p.flipX) {
    ctx.translate(b.x + b.w, b.y); ctx.scale(-1, 1);
    ctx.drawImage(spr.canvas, 0, 0, b.w, b.h);
  } else ctx.drawImage(spr.canvas, b.x, b.y, b.w, b.h);
  ctx.restore();
}

// ── Colisão pelo desenho ────────────────────────────────────────────────────────
// Uma elipse não descreve um rio: ele serpenteia, tem margem irregular e o jogador
// precisa poder andar na terra ao lado da água. Para essas peças a colisão vem do
// próprio sprite — leio os pixels uma vez, guardo uma grade reduzida de bloqueado/livre
// e consulto essa grade. Fica com um oitavo da resolução, que é fino o bastante para o
// pé do personagem e barato o bastante para rodar a cada quadro.
const MASCARAS = {};
const MASCARA_DIV = 8;

function mascaraDoProp(id) {
  if (MASCARAS[id]) return MASCARAS[id];
  const spr = propSprites[id];
  const def = propDefs[id] || {};
  if (!spr) return null;
  const w = Math.max(1, Math.round(spr.sw / MASCARA_DIV));
  const h = Math.max(1, Math.round(spr.sh / MASCARA_DIV));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const cx = cv.getContext('2d');
  cx.drawImage(spr.canvas, 0, 0, w, h);
  const d = cx.getImageData(0, 0, w, h).data;
  const grade = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = d[i*4], g = d[i*4+1], b = d[i*4+2], a = d[i*4+3];
    if (a < 120) continue;
    // 'agua' bloqueia só o azul: a margem de terra continua andável, que é o que
    // torna a beira do rio um lugar e não uma parede.
    if (def.mascara === 'agua') { if (b > r + 24 && b > 110) grade[i] = 1; }
    else grade[i] = 1;                       // 'cheia': tudo que for opaco bloqueia
  }
  MASCARAS[id] = { grade, w, h };
  return MASCARAS[id];
}

function mundoBloqueia(x, y) {
  for (const p of MUNDO.props) {
    const def = propDefs[p.prop] || {};

    if (def.mascara) {                        // colisão desenhada, não elíptica
      const m = mascaraDoProp(p.prop);
      if (!m) continue;
      const b = mundoPropBounds(p);
      let px = x, py = y;
      if (p.rot) {
        const c = Math.cos(-p.rot), sn = Math.sin(-p.rot);
        const dx = x - p.x, dy = y - p.y;
        px = p.x + dx * c - dy * sn; py = p.y + dx * sn + dy * c;
      }
      if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) continue;
      let u = Math.floor((px - b.x) / b.w * m.w);
      const v = Math.floor((py - b.y) / b.h * m.h);
      if (p.flipX) u = m.w - 1 - u;
      if (m.grade[v * m.w + u]) return true;
      continue;
    }

    if (!def.colide || !def.raio) continue;
    // A elipse de colisão acompanha o que você fez com o objeto: estica com a escala
    // de cada eixo e gira junto. Uma muralha esticada bloqueia o comprimento inteiro.
    let dx = x - p.x, dy = y - p.y;
    const rot = p.rot || 0;
    if (rot) {
      const c = Math.cos(-rot), s = Math.sin(-rot);
      [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
    }
    const rx = def.raio * escX(p), ry = def.raio * 0.55 * escY(p);
    if ((dx / rx) ** 2 + (dy / ry) ** 2 < 1) return true;
  }
  return false;
}

function mundoPropEm(wx, wy) {
  const lista = MUNDO.props.slice().sort((a, b) => b.y - a.y);
  for (const p of lista) {
    // Desfaz o giro no ponto do dedo em vez de girar o retângulo: uma conta em vez de
    // quatro, e o teste continua sendo o de caixa simples.
    let x = wx, y = wy;
    if (p.rot) {
      const c = Math.cos(-p.rot), s = Math.sin(-p.rot);
      const dx = wx - p.x, dy = wy - p.y;
      x = p.x + dx * c - dy * s; y = p.y + dx * s + dy * c;
    }
    const b = mundoPropBounds(p);
    if (x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 3) return p;
  }
  return null;
}

// Tela -> mundo. Todo clique passa por aqui: no editor a câmera se move livremente, e
// sem esta conversão o objeto nasce onde o dedo tocou na TELA, não no mundo.
function mundoDoPonteiro(m) {
  return { x: mundoCam.x + m.x / mundoCam.zoom, y: mundoCam.y + m.y / mundoCam.zoom };
}

// Folga em volta do mundo: no editor a câmera pode passar da borda para você ver o
// vazio e os blocos que dá para acrescentar. Andando, ela continua presa ao mapa.
function folgaDaCamera() {
  return mundoTeste ? 0 : Math.max(MUNDO.bloco.w, MUNDO.bloco.h) * 1.2;
}
function mundoCentralizarEm(x, y) {
  const vw = SCREEN_W / mundoCam.zoom, vh = SCREEN_H / mundoCam.zoom;
  const m = folgaDaCamera();
  mundoCam.x = Math.max(-m, Math.min(Math.max(-m, mundoLargura() - vw + m), x - vw / 2));
  mundoCam.y = Math.max(-m, Math.min(Math.max(-m, mundoAltura() - vh + m), y - vh / 2));
}

// ── Desenho ─────────────────────────────────────────────────────────────────────
function renderMundo(now) {
  mundoAtualizarBlocos(now);
  if (mundoTeste) {
    mundoMoverJogador();
    mundoCentralizarEm(player.x, player.y);
  }

  ctx.save();
  ctx.scale(mundoCam.zoom, mundoCam.zoom);
  ctx.translate(-mundoCam.x, -mundoCam.y);

  // chão: a textura global primeiro; os blocos JPEG ficam de reserva para mundos
  // antigos que ainda dependem deles
  const chaoGlobal = renderChaoDoMundo();
  const f = mundoFaixaVisivel();
  for (let c = f.c0; c <= f.c1; c++) {
    for (let r = f.r0; r <= f.r1; r++) {
      const k = `${c}_${r}`, bl = mundoBlocos[k];
      const x = c * MUNDO.bloco.w, y = r * MUNDO.bloco.h;
      const bleed = 1.0 / (mundoCam.zoom || 1);
      if (chaoGlobal) {
        const pin = blocosPintados[k];
        if (pin) ctx.drawImage(pin, x - 0.5, y - 0.5, MUNDO.bloco.w + bleed + 0.5, MUNDO.bloco.h + bleed + 0.5);
        continue;
      }
      if (bl?.img.complete && bl.img.naturalWidth) {
        try { ctx.drawImage(bl.img, x, y, MUNDO.bloco.w + bleed, MUNDO.bloco.h + bleed); } catch (e) {}
        const pin = blocosPintados[k];
        if (pin) ctx.drawImage(pin, x - 0.5, y - 0.5, MUNDO.bloco.w + bleed + 0.5, MUNDO.bloco.h + bleed + 0.5);
      } else if (!mundoTeste) {
        // Bloco vazio ou ainda carregando: no editor mostra a moldura, para você saber
        // que o espaço existe e onde ele começa.
        ctx.save();
        ctx.fillStyle = '#12100c';
        ctx.fillRect(x, y, MUNDO.bloco.w, MUNDO.bloco.h);
        ctx.strokeStyle = MUNDO.blocos[k] ? '#3f3a2a' : '#2a2620';
        ctx.setLineDash([8, 6]); ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, MUNDO.bloco.w - 2, MUNDO.bloco.h - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = '#5b5342';
        ctx.font = 'bold 22px Outfit, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(MUNDO.blocos[k] ? 'carregando…' : `bloco ${k} vazio`,
                     x + MUNDO.bloco.w / 2, y + MUNDO.bloco.h / 2);
        ctx.restore();
      }
    }
  }

  // grade dos blocos: só é exibida se o usuário ligar a opção de grade
  if (!mundoTeste && typeof exibirGradeEditor !== 'undefined' && exibirGradeEditor && !pincelMaterial) {
    ctx.save();
    ctx.strokeStyle = 'rgba(125,211,252,0.20)'; ctx.lineWidth = 1;
    for (let c = 0; c <= MUNDO.cols; c++) {
      const x = c * MUNDO.bloco.w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mundoAltura()); ctx.stroke();
    }
    for (let r = 0; r <= MUNDO.rows; r++) {
      const y = r * MUNDO.bloco.h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mundoLargura(), y); ctx.stroke();
    }
    ctx.restore();
  }

  // Plano do chão primeiro: trilha, clareira de grama, canteiro. São peças de TERRENO,
  // não objetos — pintam por baixo de todo mundo e ninguém passa atrás delas. Sem este
  // plano, um pedaço de caminho apareceria na frente dos pés do jogador.
  MUNDO.props.forEach(p => {
    if ((propDefs[p.prop] || {}).plano !== 'chao') return;
    const spr = propSprites[p.prop]; if (!spr) return;
    desenharProp(spr, p, mundoPropBounds(p), now);
  });

  if (!mundoTeste) renderGhosts();

  // props e jogador, ordenados pelo pé: é isto que faz passar atrás da árvore
  const desenhaveis = MUNDO.props
    .filter(p => (propDefs[p.prop] || {}).plano !== 'chao')
    .map(p => ({ tipo: 'prop', y: p.y, p }));
  if (mundoTeste) desenhaveis.push({ tipo: 'jogador', y: player.y });
  desenhaveis.sort((a, b) => a.y - b.y);

  desenhaveis.forEach(d => {
    if (d.tipo === 'jogador') { renderPlayer(); return; }
    const p = d.p, spr = propSprites[p.prop], b = mundoPropBounds(p);
    if (!spr) {
      if (!mundoTeste) {
        ctx.save(); ctx.strokeStyle = '#f472b6'; ctx.setLineDash([4, 3]);
        ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.restore();
      }
      return;
    }
    desenharProp(spr, p, b, now);

    // A elipse de colisão e a caixa continuam à mostra enquanto se anda: é justamente
    // aí que dá para conferir se o tronco bloqueia no lugar certo.
    {
      const def = propDefs[p.prop] || {};
      ctx.save();
      if (def.colide && def.raio) {
        ctx.strokeStyle = 'rgba(248,113,113,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, def.raio * escX(p), def.raio * 0.55 * escY(p),
                    p.rot || 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (mundoPropSel === p || (mundoPropsSelecionados && mundoPropsSelecionados.includes(p))) {
        renderCaixaDeSelecao(p, b);
      }
    }
  });

  // Render da Caixa de Drag de Seleção Múltipla
  if (caixaSelecaoMultipla) {
    ctx.save();
    const x = Math.min(caixaSelecaoMultipla.x1, caixaSelecaoMultipla.x2);
    const y = Math.min(caixaSelecaoMultipla.y1, caixaSelecaoMultipla.y2);
    const w = Math.abs(caixaSelecaoMultipla.x2 - caixaSelecaoMultipla.x1);
    const h = Math.abs(caixaSelecaoMultipla.y2 - caixaSelecaoMultipla.y1);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 / (mundoCam.zoom || 1);
    ctx.setLineDash([6 / (mundoCam.zoom || 1), 4 / (mundoCam.zoom || 1)]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  renderTracadoDeEstrada();

  // círculo do pincel: sem ele você pinta às cegas e descobre o tamanho errando
  if (pincelMaterial && pincelModo !== 'estrada') {
    const w = mundoDoPonteiro({ x: mouseCanvasX, y: mouseCanvasY });
    ctx.save();
    ctx.strokeStyle = pincelMaterial === 'apagar' ? '#fca5a5' : '#fde68a';
    ctx.lineWidth = 2 / mundoCam.zoom;
    ctx.setLineDash([6 / mundoCam.zoom, 5 / mundoCam.zoom]);
    ctx.beginPath(); ctx.arc(w.x, w.y, pincelTamanho / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // marca do ponto de partida
  if (!mundoTeste) {
    ctx.save();
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(MUNDO.spawn.x, MUNDO.spawn.y, 22, 10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#4ade80'; ctx.font = 'bold 11px Outfit, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PARTIDA', MUNDO.spawn.x, MUNDO.spawn.y - 16);
    ctx.restore();
  }

  ctx.restore();
  renderAmbienteDoMundo(now);
  renderHudDoMundo();
}

function renderHudDoMundo() {
  ctx.save();
  ctx.font = 'bold 11px Outfit, sans-serif';
  const txt = mundoTeste
    ? `🌍 ${MUNDO.nome} — andando e editando · WASD anda · toque planta e seleciona · ESC volta`
    : `🌍 ${MUNDO.nome} · ${mundoLargura()}x${mundoAltura()}px · ${MUNDO.props.length} objetos · ` +
      `zoom ${mundoCam.zoom.toFixed(2)}x · ` +
      (propParaColocar
        ? `plantando: ${(propDefs[propParaColocar] || {}).nome || propParaColocar}`
        : 'toque num prop na aba Objetos para plantar');
  const w = ctx.measureText(txt).width + 18;
  ctx.fillStyle = 'rgba(6,9,14,0.85)';
  ctx.fillRect(10, 10, w, 22);
  ctx.fillStyle = '#e0f2fe'; ctx.textAlign = 'left';
  ctx.fillText(txt, 19, 25);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`blocos na memória: ${Object.keys(mundoBlocos).length}`, 19, 46);
  ctx.restore();
}

// ── Desfazer e refazer ──────────────────────────────────────────────────────────
// Guardo o estado INTEIRO do mundo antes de cada ação, em vez de descrever cada ação
// como um par fazer/desfazer. Com 700 props o retrato sai em ~80KB de JSON, e vinte e
// cinco deles cabem folgados na memória — é barato o bastante para não valer a
// complexidade de inverter operação por operação, onde cada tipo novo de edição vira
// mais uma chance de bug silencioso.
const DESFAZER_MAX = 25;
let pilhaDesfazer = [], pilhaRefazer = [], ultimoRetrato = 0;

function retratoDoMundo() {
  const pinturas = {};
  if (typeof blocosPintados !== 'undefined') {
    Object.entries(blocosPintados).forEach(([k, cv]) => {
      if (cv) {
        try { pinturas[k] = cv.toDataURL('image/png'); } catch (e) {}
      }
    });
  }
  return JSON.stringify({ props: MUNDO.props, spawn: MUNDO.spawn,
                          cols: MUNDO.cols, rows: MUNDO.rows, chao: MUNDO.chao,
                          pinturas: pinturas });
}

// `agrupar` junta ações contínuas — segurar a seta move de pixel em pixel, e cada
// pixel virando um passo de desfazer tornaria o Cmd+Z inútil.
function registrarDesfazer(agrupar = false) {
  const agora = performance.now();
  if (agrupar && agora - ultimoRetrato < 400) return;
  ultimoRetrato = agora;
  pilhaDesfazer.push(retratoDoMundo());
  if (pilhaDesfazer.length > DESFAZER_MAX) pilhaDesfazer.shift();
  pilhaRefazer.length = 0;      // ramo novo: o que era refazer deixou de existir
}

function aplicarRetrato(txt) {
  const d = JSON.parse(txt);
  MUNDO.props = d.props;
  MUNDO.spawn = d.spawn; MUNDO.cols = d.cols; MUNDO.rows = d.rows;
  if (d.chao) MUNDO.chao = d.chao;

  if (d.pinturas && typeof blocosPintados !== 'undefined') {
    Object.keys(blocosPintados).forEach(k => {
      const cv = blocosPintados[k];
      if (cv) {
        const cx = cv.getContext('2d');
        cx.clearRect(0, 0, cv.width, cv.height);
      }
    });
    Object.entries(d.pinturas).forEach(([k, pngData]) => {
      const [c, r] = k.split('_').map(Number);
      const cv = pinturaDoBloco(c, r);
      const img = new Image();
      img.onload = () => {
        const cx = cv.getContext('2d');
        cx.clearRect(0, 0, cv.width, cv.height);
        cx.drawImage(img, 0, 0);
      };
      img.src = pngData;
    });
  }

  mundoPropSel = null; mundoArrastando = null; mundoAlca = null;
  if (typeof mundoPropsSelecionados !== 'undefined') mundoPropsSelecionados = [];
  saveMundo();
}

function desfazer() {
  if (!pilhaDesfazer.length) { showToast('↶ Nada para desfazer'); return; }
  pilhaRefazer.push(retratoDoMundo());
  aplicarRetrato(pilhaDesfazer.pop());
  showToast(`↶ Desfeito (${pilhaDesfazer.length} restantes)`);
}

function refazer() {
  if (!pilhaRefazer.length) { showToast('↷ Nada para refazer'); return; }
  pilhaDesfazer.push(retratoDoMundo());
  aplicarRetrato(pilhaRefazer.pop());
  showToast('↷ Refeito');
}

// ── Área de transferência do editor ─────────────────────────────────────────────
// Copiar e colar valem para o objeto selecionado e para a seleção em lote. A cola cai
// onde o ponteiro está, mantendo o arranjo interno do que foi copiado: um bosque de
// nove árvores colado continua sendo aquele bosque, não nove árvores empilhadas.
let areaDeTransferencia = [];

function copiarSelecao() {
  const lote = (typeof mundoPropsSelecionados !== 'undefined' && mundoPropsSelecionados.length)
    ? mundoPropsSelecionados : (mundoPropSel ? [mundoPropSel] : []);
  if (!lote.length) { showToast('⚠️ Nada selecionado'); return; }
  const cx = lote.reduce((a, p) => a + p.x, 0) / lote.length;
  const cy = lote.reduce((a, p) => a + p.y, 0) / lote.length;
  areaDeTransferencia = lote.map(p => ({ ...p, _dx: p.x - cx, _dy: p.y - cy }));
  showToast(`⧉ ${lote.length} objeto(s) copiado(s)`);
}

function colarSelecao() {
  if (!areaDeTransferencia.length) { showToast('⚠️ Nada copiado ainda'); return; }
  const alvo = mundoDoPonteiro({ x: mouseCanvasX, y: mouseCanvasY });
  registrarDesfazer();
  const novos = areaDeTransferencia.map((p, i) => {
    const n = { ...p, id: `${p.prop}_${Date.now()}_${i}`,
                x: Math.round(alvo.x + p._dx), y: Math.round(alvo.y + p._dy) };
    delete n._dx; delete n._dy;
    return n;
  });
  MUNDO.props.push(...novos);
  mundoPropSel = novos[novos.length - 1];
  if (typeof mundoPropsSelecionados !== 'undefined') mundoPropsSelecionados = novos.slice();
  saveMundo();
  showToast(`📋 ${novos.length} colado(s)`);
}

// ── Caixa de seleção ────────────────────────────────────────────────────────────
// Oito alças e um cabo de giro, como em editor de imagem: canto escala junto, lado
// estica num eixo só (é assim que muralha e cerca encostam na vizinha), e o cabo de
// cima gira. Tudo em torno do PÉ do objeto, para ele nunca sair do chão.
// Meio-lado da alça, em pixels de TELA. Estava em 9 (quadrados de 18px) e tapava o
// próprio objeto quando ele era pequeno — a alça existe para pegar, não para esconder.
const ALCA = 4.5;
const CABO_GIRO = 42;

function cantosDaCaixa(p) {
  const b = mundoPropBounds(p);
  const pts = {
    no: [b.x, b.y], n: [b.x + b.w / 2, b.y], ne: [b.x + b.w, b.y],
    o: [b.x, b.y + b.h / 2], e: [b.x + b.w, b.y + b.h / 2],
    so: [b.x, b.y + b.h], s: [b.x + b.w / 2, b.y + b.h], se: [b.x + b.w, b.y + b.h],
    giro: [b.x + b.w / 2, b.y - CABO_GIRO / (mundoCam.zoom || 1)],
  };
  if (p.rot) {                       // as alças giram junto com o objeto
    const c = Math.cos(p.rot), sn = Math.sin(p.rot);
    for (const k in pts) {
      const dx = pts[k][0] - p.x, dy = pts[k][1] - p.y;
      pts[k] = [p.x + dx * c - dy * sn, p.y + dx * sn + dy * c];
    }
  }
  return { b, pts };
}

function renderCaixaDeSelecao(p, b) {
  const { pts } = cantosDaCaixa(p);
  const z = mundoCam.zoom || 1;
  ctx.save();
  ctx.lineWidth = 1 / z;
  ctx.strokeStyle = '#fde68a';
  ctx.setLineDash([5 / z, 4 / z]);
  ctx.beginPath();
  ctx.moveTo(...pts.no); ctx.lineTo(...pts.ne); ctx.lineTo(...pts.se);
  ctx.lineTo(...pts.so); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]);

  // haste do cabo de giro
  ctx.beginPath(); ctx.moveTo(...pts.n); ctx.lineTo(...pts.giro); ctx.stroke();

  const meia = ALCA / z;
  const alca = (xy, cor) => {
    ctx.fillStyle = cor; ctx.strokeStyle = '#1c1408'; ctx.lineWidth = 1 / z;
    ctx.beginPath(); ctx.rect(xy[0] - meia, xy[1] - meia, meia * 2, meia * 2);
    ctx.fill(); ctx.stroke();
  };
  ['no','ne','so','se'].forEach(k => alca(pts[k], '#fde68a'));   // canto: escala junto
  ['n','s','o','e'].forEach(k => alca(pts[k], '#7dd3fc'));       // lado: estica um eixo
  ctx.fillStyle = '#4ade80'; ctx.strokeStyle = '#0b2412';
  ctx.beginPath(); ctx.arc(pts.giro[0], pts.giro[1], meia * 1.1, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // o pé, que é de onde saem profundidade e colisão
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.arc(p.x, p.y, 3 / z, 0, Math.PI * 2); ctx.fill();

  // ficha do objeto, presa ao canto
  const def = propDefs[p.prop] || {};
  ctx.font = `${11 / z}px Outfit, sans-serif`; ctx.textAlign = 'left';
  const txt = `${def.nome || p.prop}  ${escX(p).toFixed(2)}x${escY(p).toFixed(2)}` +
              (p.rot ? `  ${Math.round(p.rot * 180 / Math.PI)}°` : '');
  const larg = ctx.measureText(txt).width + 10 / z;
  ctx.fillStyle = 'rgba(6,9,14,.85)';
  ctx.fillRect(pts.no[0], pts.no[1] - 20 / z, larg, 16 / z);
  ctx.fillStyle = '#fde68a';
  ctx.fillText(txt, pts.no[0] + 5 / z, pts.no[1] - 8 / z);
  ctx.restore();
}

// Qual alça está sob o dedo, se alguma.
function alcaEm(p, wx, wy) {
  const { pts } = cantosDaCaixa(p);
  const meia = (ALCA + 4) / (mundoCam.zoom || 1);   // área de toque maior que o desenho
  for (const k of ['giro','no','ne','so','se','n','s','o','e']) {
    const [x, y] = pts[k];
    if (Math.abs(wx - x) <= meia && Math.abs(wy - y) <= meia) return k;
  }
  return null;
}

// Aplica o arrasto de uma alça. Trabalho em coordenadas SEM giro: desfaço o ângulo no
// ponto do dedo, calculo a escala em cima do retângulo direito, e o giro volta sozinho
// no desenho. Sem isso, escalar um objeto girado o faz derrapar de lado.
function arrastarAlca(p, wx, wy) {
  const def = propDefs[p.prop] || {};
  const spr = propSprites[p.prop];
  const hBase = def.altura || (spr ? spr.sh : 96);
  const wBase = spr ? hBase * (spr.sw / spr.sh) : hBase * 0.8;
  const pe = def.plano === 'chao' ? 0.5 : (def.pe ?? 0.9);

  if (mundoAlca === 'giro') {
    p.rot = Math.atan2(wy - p.y, wx - p.x) + Math.PI / 2;
    if (keys.shift) p.rot = Math.round(p.rot / (Math.PI / 12)) * (Math.PI / 12);  // 15°
    return;
  }

  let dx = wx - p.x, dy = wy - p.y;
  if (p.rot) {
    const c = Math.cos(-p.rot), sn = Math.sin(-p.rot);
    [dx, dy] = [dx * c - dy * sn, dx * sn + dy * c];
  }
  const k = mundoAlca;
  const limite = v => Math.max(0.08, Math.min(12, v));

  if (k.includes('e') || k.includes('o')) p.ex = limite(Math.abs(dx) * 2 / wBase);
  if (k.includes('n')) p.ey = limite(-dy / (hBase * pe));
  if (k.includes('s')) p.ey = limite(dy / (hBase * (1 - pe) || 0.05));
  // canto: mantém a proporção, que é o gesto que o dedo espera
  if (k.length === 2) {
    const razao = p.ex / (p.ey || 1);
    if (Math.abs(razao - 1) > 0.001 && !keys.shift) p.ey = p.ex;
  }
  p.escala = undefined;
}

// Movimento no mundo: mesmas teclas e mesmo joystick do jogo, só que sem os limites da
// tela — quem limita agora é a borda do mundo.
function mundoMoverJogador() {
  let dx = 0, dy = 0;
  if (keys.w) dy -= 1; if (keys.s) dy += 1;
  if (keys.a) dx -= 1; if (keys.d) dx += 1;
  if (stick.active) { dx = stick.x; dy = stick.y; }
  const len = Math.hypot(dx, dy);
  player.isMoving = len > 0.15;
  if (!player.isMoving) { player.animFrame = 0; player.animTimer = 0; return; }

  const sprint = keys.shift || len > 0.92;
  const spd = (sprint ? player.sprintSpeed : player.speed) * Math.min(1, len);
  dx /= len; dy /= len;
  if (Math.abs(dx) > Math.abs(dy)) player.direction = dx < 0 ? 'left' : 'right';
  else player.direction = dy < 0 ? 'up' : 'down';

  const tx = player.x + dx * spd, ty = player.y + dy * spd;
  const livre = (x, y) => x > 20 && y > 24 && x < mundoLargura() - 20 && y < mundoAltura() - 24
                          && !mundoBloqueia(x, y);
  if (livre(tx, ty)) { player.x = tx; player.y = ty; }
  else if (livre(tx, player.y)) player.x = tx;
  else if (livre(player.x, ty)) player.y = ty;

  player.animTimer++;
  if (player.animTimer >= (sprint ? 3 : 6)) {
    player.animTimer = 0; player.animFrame = (player.animFrame + 1) % 4;
  }
}

// ── Ponteiro no criador de mundo ────────────────────────────────────────────────
function mundoPointerDown(m) {
  const w = mundoDoPonteiro(m);

  // Pincel ligado: o toque pinta, e nada mais. Plantar e selecionar voltam quando você
  // desliga o pincel — misturar os dois no mesmo clique só gera objeto sem querer.
  if (pincelMaterial) {
    registrarDesfazer();
    if (pincelModo === 'praca') {
      pracaCentro = { x: w.x, y: w.y };
      pracaAtual = { x: w.x, y: w.y };
      pinturaAtiva = true;
      return;
    }
    if (pincelModo === 'estrada') {
      // Começa aqui — ou na ponta do segmento anterior, se houver, para as pernas
      // emendarem exatamente e não sobrar buraco na junta.
      estradaDe = estradaDe || { x: w.x, y: w.y };
      estradaAte = { x: w.x, y: w.y };
      pinturaAtiva = true;
      return;
    }
    pinturaAtiva = true;
    window._ultimaPinturaW = { x: w.x, y: w.y };
    pincelar(w.x, w.y);
    return;
  }

  // Fora do mapa: se for uma célula de expansão, cresce ali.
  if (!mundoTeste) {
    const g = mundoGhostEm(w.x, w.y);
    if (g) { mundoExpandir(g); return; }
  }

  if (!pincelMaterial && mundoPropSel) {
    const k = alcaEm(mundoPropSel, w.x, w.y);
    if (k) { registrarDesfazer(); mundoAlca = k; return; }
  }

  if (propParaColocar && !pincelMaterial && mundoFerramenta !== 'partida') {
    registrarDesfazer();
    const novo = { id: `${propParaColocar}_${Date.now()}`, prop: propParaColocar,
                   x: Math.round(w.x), y: Math.round(w.y), ex: 1, ey: 1, rot: 0, flipX: false };
    MUNDO.props.push(novo);
    mundoPropSel = novo;
    if (typeof atualizarBarraSelecaoMultipla === 'function') atualizarBarraSelecaoMultipla();
    propParaColocar = null;
    mundoFerramenta = 'selecionar';
    renderPaletaDeProps();
    document.getElementById('mundoFerrPlantar')?.classList.remove('ativo');
    document.getElementById('mundoFerrSel')?.classList.add('ativo');
    saveMundo();
    return;
  }
  if (mundoFerramenta === 'partida') {
    registrarDesfazer();
    MUNDO.spawn = { x: Math.round(w.x), y: Math.round(w.y) };
    saveMundo(); showToast('🚩 Ponto de partida movido');
    return;
  }

  // Seleção Múltipla via Caixa de Seleção (Mouse ou Touch)
  if (mundoFerramenta === 'multiselecao' || (keys.shift && !pincelMaterial && !propParaColocar)) {
    caixaSelecaoMultipla = { x1: w.x, y1: w.y, x2: w.x, y2: w.y };
    arrastandoCaixaSelecao = true;
    mundoPropsSelecionados = [];
    atualizarBarraSelecaoMultipla();
    return;
  }

  const p = mundoPropEm(w.x, w.y);
  if (p && mundoFerramenta !== 'mover') {
    registrarDesfazer();
    mundoPropSel = p; mundoArrastando = p;
    dragOffX = w.x - p.x; dragOffY = w.y - p.y;
    if (typeof atualizarBarraSelecaoMultipla === 'function') atualizarBarraSelecaoMultipla();
    return;
  }
  if (!p && mundoFerramenta !== 'multiselecao') {
    mundoPropsSelecionados = [];
    atualizarBarraSelecaoMultipla();
  }
  if (!mundoTeste) mundoPan = { telaX: m.x, telaY: m.y, camX: mundoCam.x, camY: mundoCam.y };
  if (!p) {
    mundoPropSel = null;
    if (typeof atualizarBarraSelecaoMultipla === 'function') atualizarBarraSelecaoMultipla();
  }
}

let arrastandoCaixaSelecao = false;

function mundoPointerMove(m) {
  if (arrastandoCaixaSelecao && caixaSelecaoMultipla) {
    const w = mundoDoPonteiro(m);
    caixaSelecaoMultipla.x2 = w.x;
    caixaSelecaoMultipla.y2 = w.y;
    return;
  }
  if (pinturaAtiva && pincelModo === 'praca') {
    const w = mundoDoPonteiro(m);
    pracaAtual = { x: w.x, y: w.y };
    return;
  }
  if (pinturaAtiva && pincelModo === 'estrada') {
    const w = mundoDoPonteiro(m);
    estradaAte = travarAngulo(estradaDe.x, estradaDe.y, w.x, w.y, keys.shift);
    return;
  }
  if (pinturaAtiva) {
    const w = mundoDoPonteiro(m);
    if (window._ultimaPinturaW) {
      pintarSegmento(window._ultimaPinturaW.x, window._ultimaPinturaW.y, w.x, w.y);
    } else {
      pincelar(w.x, w.y);
    }
    window._ultimaPinturaW = { x: w.x, y: w.y };
    return;
  }
  if (mundoAlca && mundoPropSel) {
    const w = mundoDoPonteiro(m);
    arrastarAlca(mundoPropSel, w.x, w.y);
    return;
  }
  if (mundoArrastando) {
    const w = mundoDoPonteiro(m);
    const newX = Math.round(w.x - dragOffX);
    const newY = Math.round(w.y - dragOffY);
    
    // Se o objeto arrastado faz parte de uma seleção múltipla, move todos juntos!
    if (mundoPropsSelecionados.includes(mundoArrastando)) {
      const dx = newX - mundoArrastando.x;
      const dy = newY - mundoArrastando.y;
      mundoPropsSelecionados.forEach(item => {
        item.x += dx;
        item.y += dy;
      });
    } else {
      mundoArrastando.x = newX;
      mundoArrastando.y = newY;
    }
    return;
  }
  if (mundoPan) {
    const vw = SCREEN_W / mundoCam.zoom, vh = SCREEN_H / mundoCam.zoom;
    const mg = folgaDaCamera();
    mundoCam.x = Math.max(-mg, Math.min(Math.max(-mg, mundoLargura() - vw + mg),
      mundoPan.camX - (m.x - mundoPan.telaX) / mundoCam.zoom));
    mundoCam.y = Math.max(-mg, Math.min(Math.max(-mg, mundoAltura() - vh + mg),
      mundoPan.camY - (m.y - mundoPan.telaY) / mundoCam.zoom));
  }
}

function mundoPointerUp() {
  if (arrastandoCaixaSelecao && caixaSelecaoMultipla) {
    arrastandoCaixaSelecao = false;
    const xMin = Math.min(caixaSelecaoMultipla.x1, caixaSelecaoMultipla.x2);
    const xMax = Math.max(caixaSelecaoMultipla.x1, caixaSelecaoMultipla.x2);
    const yMin = Math.min(caixaSelecaoMultipla.y1, caixaSelecaoMultipla.y2);
    const yMax = Math.max(caixaSelecaoMultipla.y1, caixaSelecaoMultipla.y2);

    if (xMax - xMin > 5 || yMax - yMin > 5) {
      mundoPropsSelecionados = MUNDO.props.filter(p => {
        const b = mundoPropBounds(p);
        return b.x < xMax && (b.x + b.w) > xMin && b.y < yMax && (b.y + b.h) > yMin;
      });
      showToast(`📦 ${mundoPropsSelecionados.length} objetos selecionados`);
    } else {
      mundoPropsSelecionados = [];
    }
    caixaSelecaoMultipla = null;
    atualizarBarraSelecaoMultipla();
    return;
  }
  if (pinturaAtiva && pincelModo === 'praca') {
    pinturaAtiva = false;
    if (pracaCentro && pracaAtual) {
      const raio = Math.hypot(pracaAtual.x - pracaCentro.x, pracaAtual.y - pracaCentro.y);
      if (raio >= 3) {
        pintarPracaPreenchida(pracaCentro.x, pracaCentro.y, raio);
        salvarPintura();
      }
      pracaCentro = null; pracaAtual = null;
    }
    return;
  }
  if (pinturaAtiva && pincelModo === 'estrada') {
    pinturaAtiva = false;
    if (estradaDe && estradaAte) {
      pintarSegmento(estradaDe.x, estradaDe.y, estradaAte.x, estradaAte.y);
      estradaDe = { x: estradaAte.x, y: estradaAte.y };   // a ponta vira o próximo começo
      estradaAte = null;
      salvarPintura();
    }
    return;
  }
  if (pinturaAtiva) { pinturaAtiva = false; salvarPintura(); return; }
  if (mundoAlca) { mundoAlca = null; saveMundo(); return; }
  if (mundoArrastando) { saveMundo(); mundoArrastando = null; }
  mundoPan = null;
}

function mundoZoom(delta) {
  const antes = mundoCam.zoom;
  mundoCam.zoom = Math.max(0.12, Math.min(3, mundoCam.zoom * (delta > 0 ? 0.9 : 1.1)));
  // Mantém o centro da tela olhando para o mesmo ponto do mundo.
  const vwA = SCREEN_W / antes, vhA = SCREEN_H / antes;
  const vwD = SCREEN_W / mundoCam.zoom, vhD = SCREEN_H / mundoCam.zoom;
  mundoCam.x = Math.max(0, Math.min(Math.max(0, mundoLargura() - vwD), mundoCam.x + (vwA - vwD) / 2));
  mundoCam.y = Math.max(0, Math.min(Math.max(0, mundoAltura() - vhD), mundoCam.y + (vhA - vhD) / 2));
}

function mundoTestar(ligar) {
  mundoTeste = ligar;
  if (ligar) {
    player.x = MUNDO.spawn.x; player.y = MUNDO.spawn.y;
    player.oculto = false;
    showToast('🌍 Andando pelo mundo — ESC para voltar a editar');
  } else showToast('✏️ De volta ao editor de mundo');
  document.getElementById('mundoTestarBtn')
    ?.classList.toggle('ativo', ligar);
}

// ============================================================
// OBJETOS DE CENÁRIO
// Árvore, pedra, ruína, cerca: coisas que não fazem nada além de estar lá — e que por
// isso mesmo transformam um fundo pintado em lugar.
//
// A ideia toda depende de UM número: a linha do pé. Cada objeto declara em que fração
// da sua altura ele toca o chão (`pe`). Dessa linha saem as duas coisas que importam:
// quem aparece na frente de quem, e onde a passagem é bloqueada. É por isso que a
// camada de "teto" pintada à mão deixa de ser necessária — a copa cobre o jogador
// porque o pé da árvore está atrás dele, não porque alguém pintou.
//
// O catálogo (`propDefs`) descreve os tipos; a lista (`objetos`) são as instâncias
// posicionadas no mundo. Mesma divisão dos monstros, de propósito: o editor, o save e
// o futuro importador do Tiled já sabem lidar com esse formato.
let propDefs = {};        // id -> { nome, sprite, pe, raio, colide, categoria }
let objetos = [];         // instâncias no mundo
const propSprites = {};   // id -> sprite preparado

async function loadObjetos() {
  let cfg = null;
  try {
    const r = await fetch(`assets/objects.json?t=${Date.now()}`);
    if (r.ok) cfg = await r.json();
  } catch (e) {}
  if (!cfg) return;

  propDefs = cfg.props || {};
  objetos = (cfg.objetos || []).map(o => ({ ...o, escala: o.escala || 1 }));

  Object.entries(propDefs).forEach(([id, def]) => {
    if (!def.sprite) return;
    const img = new Image();
    img.onload = () => {
      // PNG com alpha entra como está; JPG passa pelo chroma-key, igual aos monstros.
      try { propSprites[id] = prepareSprite(img); } catch (e) {}
      // Redesenha a paleta a cada sprite que chega. Esperar por um `setTimeout` fixo
      // dava paleta com ícone genérico: a decodificação da imagem não tem prazo.
      if (typeof renderPaletaDeProps === 'function') renderPaletaDeProps();
    };
    img.onerror = () => {};
    img.src = def.sprite;
  });
}

async function saveObjetos() {
  if (IS_PLAY_BUILD) return;
  const corpo = JSON.stringify({
    props: propDefs,
    objetos: objetos.map(o => ({
      id: o.id, prop: o.prop, mapKey: o.mapKey,
      x: Math.round(o.x), y: Math.round(o.y),
      escala: +(o.escala || 1).toFixed(2), flipX: !!o.flipX,
    })),
  });
  try {
    const r = await fetch('/save_objects', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: corpo });
    if (!r.ok) showToast(`⚠️ Servidor recusou os objetos (HTTP ${r.status}) — NÃO salvo`);
  } catch (e) {
    showToast('⚠️ Objetos NÃO salvos: sem resposta do servidor');
  }
  try { localStorage.setItem('acordelot_objetos_v1', corpo); } catch (e) {}
}

function propDef(o) { return propDefs[o.prop] || {}; }

// Retângulo que o sprite ocupa na tela. `x,y` é o PÉ do objeto (o ponto no chão), não
// o canto: assim mover e escalar nunca faz o objeto flutuar nem afundar.
function objetoBounds(o) {
  const spr = propSprites[o.prop];
  const def = propDef(o);
  // Sem `altura` declarada, o tamanho natural do PNG manda: prop gerado já vem na
  // proporção certa, e obrigar a declarar altura só criaria mais um campo para errar.
  const h = (def.altura || (spr ? spr.sh : 96)) * (o.escala || 1);
  const w = spr ? h * (spr.sw / spr.sh) : h * 0.8;
  const pe = def.pe ?? 0.9;
  if (def.plano === 'chao') return { x: o.x - w / 2, y: o.y - h / 2, w, h, pe: 1 };
  // O pé fica a `pe` da altura: o que está abaixo dessa linha é a base do objeto.
  return { x: o.x - w / 2, y: o.y - h * pe, w, h, pe };
}

function objetosDoMapa(mapKey) {
  return objetos.filter(o => o.mapKey === mapKey);
}

// Colisão: uma elipse achatada em volta do pé. Achatada porque a perspectiva é de cima
// com leve inclinação — um círculo perfeito bloqueia mais do que o olho aceita.
function objetoBloqueia(x, y) {
  for (const o of objetos) {
    if (o.mapKey !== currentKey) continue;
    const def = propDef(o);
    if (!def.colide || !def.raio) continue;
    const r = def.raio * (o.escala || 1);
    const dx = (x - o.x) / r, dy = (y - o.y) / (r * 0.55);
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

// Desenha os objetos de um lado só da linha do jogador. Chamado duas vezes por quadro:
// antes do personagem (os que estão atrás) e depois (os que estão na frente).
function renderObjetos(now, lado) {
  // No editor o mapa que manda é o do seletor: currentKey só acompanha o jogo.
  const mapa = isPlayMode ? currentKey : (activeMapSelect?.value || currentKey);
  const lista = objetosDoMapa(mapa);
  if (!lista.length) return;

  // Peças de terreno saem da ordenação: elas pertencem ao chão, e só aparecem na
  // primeira passada do quadro.
  const noChao = o => (propDef(o) || {}).plano === 'chao';
  if (lado === 'atras' || lado === 'todos') {
    lista.filter(noChao).forEach(o => {
      const spr = propSprites[o.prop]; if (!spr) return;
      const b = objetoBounds(o);
      ctx.save();
      if (o.flipX) { ctx.translate(b.x + b.w, b.y); ctx.scale(-1, 1); ctx.drawImage(spr.canvas, 0, 0, b.w, b.h); }
      else ctx.drawImage(spr.canvas, b.x, b.y, b.w, b.h);
      ctx.restore();
    });
  }
  const linhaDoJogador = player.y;
  lista
    .filter(o => !noChao(o))
    // 'todos' é o modo do editor: sem personagem em cena, a divisão atrás/na frente não
    // significa nada e o que importa é ver tudo que está plantado.
    .filter(o => lado === 'todos' || (lado === 'atras' ? o.y <= linhaDoJogador : o.y > linhaDoJogador))
    .sort((a, b) => a.y - b.y)
    .forEach(o => {
      const spr = propSprites[o.prop];
      const b = objetoBounds(o);
      if (!spr) {
        // Sem arte ainda: no editor mostra a marca do lugar, no jogo não mostra nada.
        if (!isPlayMode) {
          ctx.save();
          ctx.strokeStyle = '#f472b6'; ctx.setLineDash([4, 3]);
          ctx.strokeRect(b.x, b.y, b.w, b.h);
          ctx.restore();
        }
        return;
      }
      ctx.save();
      if (o.flipX) {
        ctx.translate(b.x + b.w, b.y); ctx.scale(-1, 1);
        ctx.drawImage(spr.canvas, 0, 0, b.w, b.h);
      } else {
        ctx.drawImage(spr.canvas, b.x, b.y, b.w, b.h);
      }
      ctx.restore();

      if (!isPlayMode) renderMarcaDoObjeto(o, b);
    });
}

// Só no editor: mostra o pé e a área de colisão, que são invisíveis por natureza e
// impossíveis de ajustar às cegas.
function renderMarcaDoObjeto(o, b) {
  const def = propDef(o);
  ctx.save();
  if (def.colide && def.raio) {
    const r = def.raio * (o.escala || 1);
    ctx.strokeStyle = 'rgba(248,113,113,0.75)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(o.x, o.y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (objetoSelecionado === o) {
    renderCaixaEAlcas(o);
  }
  ctx.restore();
}

// O objeto sob o ponteiro. Testa de frente para trás (o que está por cima ganha) e
// aceita o clique em qualquer pixel do retângulo — mira em contorno é frustrante.
function objetoEm(mx, my) {
  const lista = objetosDoMapa(activeMapSelect?.value || currentKey)
    .slice().sort((a, b) => b.y - a.y);
  for (const o of lista) {
    const b = objetoBounds(o);
    if (mx >= b.x - 3 && mx <= b.x + b.w + 3 && my >= b.y - 3 && my <= b.y + b.h + 3) return o;
  }
  return null;
}

// ============================================================
// MONSTERS
// Sheets are 4x4 grids of poses rather than a walk cycle, so one cell is picked as the
// standing pose (configurable per type) and movement gets its life from a hop bob.
// ============================================================
let monsterDefs = {}, monsters = [];
const monsterSprites = {}; // type -> prepared sheet

async function loadMonsters() {
  let cfg = null;
  try {
    const r = await fetch(`assets/monsters.json?t=${Date.now()}`);
    if (r.ok) cfg = await r.json();
  } catch (e) {}

  if (!cfg) {
    try {
      const ls = localStorage.getItem('acordelot_monsters_v1');
      if (ls) cfg = JSON.parse(ls);
    } catch (e) {}
  }
  if (!cfg) return;

  monsterDefs = cfg.types || {};

  Object.entries(monsterDefs).forEach(([type, def]) => {
    if (!def.sprite) return;
    const img = new Image();
    img.onload = () => {
      try {
        monsterSprites[type] = prepareSpriteCell(img, def);
        // Folhas com linha de caminhada ganham quadros próprios, usados só quando o
        // monstro está de fato se deslocando.
        if (def.walkRow != null) {
          monsterWalk[type] = [];
          for (let i = 0; i < (def.walkFrames || def.cols || 4); i++)
            monsterWalk[type].push(prepareSpriteCell(img, { ...def, cell: [i, def.walkRow] }));
        }
        if (def.attackRow != null) {
          monsterAtaque[type] = [];
          for (let i = 0; i < (def.attackFrames || def.cols || 4); i++)
            monsterAtaque[type].push(prepareSpriteCell(img, { ...def, cell: [i, def.attackRow] }));
        }
      } catch (e) {}
    };
    img.onerror = () => {};
    img.src = def.sprite;
  });

  monsters = (cfg.spawns || []).map(s => {
    const def = monsterDefs[s.type] || {};
    return {
      ...s,
      hp: def.hp ?? 20, maxHp: def.hp ?? 20,
      escala: s.escala || 1,
      homeX: s.x, homeY: s.y,
      dead: false, respawnAt: 0, hurtUntil: 0, lastHit: 0, facing: 1,
      phase: Math.random() * Math.PI * 2,
    };
  });
}

// Crop one cell out of the grid, then key + trim it like any other sprite.
function prepareSpriteCell(img, def) {
  const cols = def.cols || 4, rows = def.rows || 4;
  const [cx, cy] = def.cell || [0, 0];
  const cw = Math.floor(img.width / cols), ch = Math.floor(img.height / rows);
  const cell = document.createElement('canvas');
  cell.width = cw; cell.height = ch;
  cell.getContext('2d').drawImage(img, cx * cw, cy * ch, cw, ch, 0, 0, cw, ch);
  return prepareSprite(cell);
}

function monsterDef(m) { return monsterDefs[m.type] || {}; }
function monsterBounds(m) {
  const spr = monsterSprites[m.type];
  // Escala por instância: dois Ecos do mesmo tipo podem ter tamanhos diferentes,
  // o que ajuda a compor o cenário sem criar tipo novo para cada variação.
  const h = (monsterDef(m).height || 60) * (m.escala || 1);
  const w = spr ? h * (spr.sw / spr.sh) : h * 0.8;
  return { x: m.x - w/2, y: m.y - h, w, h };
}
function liveMonsters() {
  return monsters.filter(m => !m.dead && m.mapKey === currentKey);
}

// Editor: pick and drag monsters like NPCs.
let selectedMonster = null, dragMonster = null;
// Objetos de cenário: mesma mecânica de seleção e arrasto.
let objetoSelecionado = null, arrastandoObjeto = null, propParaColocar = null;
function monsterAt(mx, my) {
  const mapKey = activeMapSelect?.value || currentKey;
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    if (m.mapKey !== mapKey) continue;
    const b = monsterBounds(m);
    if (mx >= b.x-4 && mx <= b.x+b.w+4 && my >= b.y-4 && my <= b.y+b.h+4) return m;
  }
  return null;
}



const monsterWalk = {}, monsterAtaque = {};

// Quantos podem avançar ao mesmo tempo. Sem isto o bando inteiro cola no jogador e
// vira uma pilha de sprites — ilegível e impossível de reagir.
const MAX_PERSEGUIDORES = 2;

// ── Rotina de bicho ──────────────────────────────────────────────────────────────
// Monstro parado feito estátua mata a vida do cenário. Aqui cada um ganha um ciclo
// simples de animal: fica quieto um tempo, olha em volta, dá alguns passos curtos
// perto de casa e para de novo. Nunca sai do chão pintado e nunca ataca por isso —
// perseguir continua sendo decisão de quem tem `persegue`.
const PASSEIO = {
  raio: 70,          // até onde se afasta do ponto onde você o posicionou
  paradaMin: 1400, paradaMax: 4200,
  passoMin: 500,  passoMax: 1500,
  velocidade: 0.42,  // fração da velocidade de perseguição
};

function atualizarRotina(m, def, now) {
  if (!m.rotina) m.rotina = { estado: 'parado', ate: now + Math.random() * PASSEIO.paradaMax };

  const r = m.rotina;
  if (now < r.ate) {
    if (r.estado === 'andando') {
      const dx = r.alvoX - m.x, dy = r.alvoY - m.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) { r.estado = 'parado'; r.ate = now + PASSEIO.paradaMin + Math.random() * (PASSEIO.paradaMax - PASSEIO.paradaMin); return; }
      const v = (def.speed || 1) * PASSEIO.velocidade;
      const nx = m.x + (dx / d) * v, ny = m.y + (dy / d) * v;
      if (canMoveTo(nx, ny)) {
        m.x = nx; m.y = ny;
        m.facing = dx < 0 ? -1 : 1;
        m.andandoAte = now + 120;         // liga a animação de caminhada
      } else {
        r.estado = 'parado'; r.ate = now + 600;   // esbarrou: para e escolhe outro rumo
      }
    }
    return;
  }

  if (r.estado === 'parado') {
    // Escolhe um ponto perto de casa. Se não achar chão livre, fica mais um tempo
    // parado — bicho encurralado não atravessa pedra.
    const homeX = m.homeX ?? m.x, homeY = m.homeY ?? m.y;
    for (let t = 0; t < 8; t++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * PASSEIO.raio;
      const ax = homeX + Math.cos(ang) * dist, ay = homeY + Math.sin(ang) * dist * 0.6;
      if (canMoveTo(ax, ay)) {
        r.estado = 'andando'; r.alvoX = ax; r.alvoY = ay;
        r.ate = now + PASSEIO.passoMin + Math.random() * (PASSEIO.passoMax - PASSEIO.passoMin);
        return;
      }
    }
    // Sem para onde ir: só vira a cabeça, que já dá sinal de vida.
    m.facing = Math.random() < 0.5 ? -1 : 1;
    r.ate = now + PASSEIO.paradaMin + Math.random() * PASSEIO.paradaMax;
  } else {
    r.estado = 'parado';
    r.ate = now + PASSEIO.paradaMin + Math.random() * (PASSEIO.paradaMax - PASSEIO.paradaMin);
  }
}
const ESPACO_ENTRE_MONSTROS = 46;

function updateMonsters(now) {
  if (!isPlayMode || currentScene !== 'world') return;
  atualizarCaptura(now);

  // Elege os que perseguem nesta rodada: os mais próximos primeiro. Os demais rondam
  // à distância, o que também dá tempo do jogador escolher um alvo por vez.
  const vivos = monsters.filter(m => !m.dead && m.mapKey === currentKey && now >= (m.abertoAte || 0));
  const candidatos = vivos
    .filter(m => { const d = monsterDef(m); return (m.persegue ?? d.persegue ?? false) && !d.pacifico; })
    .sort((a, b) => Math.hypot(player.x - a.x, player.y - a.y) - Math.hypot(player.x - b.x, player.y - b.y));
  candidatos.forEach((m, i) => { m.podePerseguir = i < MAX_PERSEGUIDORES; });
  monsters.forEach(m => {
    if (m.dead) {
      if (m.respawnAt && now >= m.respawnAt) {
        m.dead = false; m.hp = m.maxHp; m.x = m.homeX; m.y = m.homeY; m.respawnAt = 0;
        m.pronto = false; m.rotina = null;
      }
      return;
    }
    if (m.mapKey !== currentKey) return;
    // Eco aberto fica imóvel esperando a ressonância: nem avança, nem golpeia, nem
    // passeia. Ele já não é mais um combate — é uma oferta.
    if (m.pronto) { m.golpeEm = 0; return; }
    const def = monsterDef(m);
    const dx = player.x - m.x, dy = player.y - m.y;
    const dist = Math.hypot(dx, dy);

    if (dist < (def.aggroRange ?? 160)) m.facing = dx < 0 ? -1 : 1;

    // Perseguição é opcional: os monstros do mundo ficam no posto (o jogador vai até
    // eles), mas os de cena avançam. Só andam onde o jogador poderia andar — nada de
    // atravessar árvore ou parede.
    const persegue = m.persegue ?? def.persegue ?? false;
    // Avança mesmo com o jogador travado numa fala — parar de andar durante o diálogo
    // é o que fazia a criatura parecer estátua. Só o dano é que respeita a trava.
    if (persegue && m.podePerseguir && playerHp > 0 && now >= (m.atacandoAte || 0) &&
        dist < (def.aggroRange ?? 160) && dist > (def.touchRange ?? 34) * 0.75) {
      const sp = def.speed ?? 1;
      const px = m.x + (dx / dist) * sp, py = m.y + (dy / dist) * sp;
      const ax = m.x, ay = m.y;
      if (canMoveTo(px, py)) { m.x = px; m.y = py; }
      else if (canMoveTo(px, m.y)) m.x = px;      // desliza pela parede
      else if (canMoveTo(m.x, py)) m.y = py;
      if (m.x !== ax || m.y !== ay) m.andandoAte = now + 120;
    }

    // Quem não está avançando sobre o jogador vive sua vida: passeia perto de casa.
    // Isto vem ANTES do `return` dos pacíficos de propósito — são justamente eles, os
    // bichos do mundo, que precisam de vida própria; deixá-los depois foi o que manteve
    // o cenário inteiro de estátuas.
    const emPerseguicao = (m.persegue ?? def.persegue ?? false) && m.podePerseguir &&
                          dist < (def.aggroRange ?? 160);
    if (!emPerseguicao && now >= (m.atacandoAte || 0)) atualizarRotina(m, def, now);
    else m.rotina = null;      // volta ao passeio depois, com ritmo novo

    if (def.pacifico) return;   // criatura mansa: carrega clave, não ataca ninguém

    // Empurrão suave entre monstros: dois nunca ocupam o mesmo ponto.
    monsters.forEach(o => {
      if (o === m || o.dead || o.mapKey !== currentKey) return;
      const ox = m.x - o.x, oy = m.y - o.y;
      const od = Math.hypot(ox, oy);
      if (od > 0.001 && od < ESPACO_ENTRE_MONSTROS) {
        const empurra = (ESPACO_ENTRE_MONSTROS - od) * 0.06;
        const nx = m.x + (ox / od) * empurra, ny = m.y + (oy / od) * empurra;
        if (canMoveTo(nx, ny)) { m.x = nx; m.y = ny; }
      }
    });

    // O golpe tem três tempos: bote (o jogador vê vindo), impacto e recuperação.
    // Bater sem aviso é o que fazia parecer que o monstro só encostava e tirava vida.
    if (playerHp > 0 && dist < (def.touchRange ?? 34) && now - m.lastHit > 900 && !m.golpeEm) {
      m.lastHit = now;
      m.atacandoAte = now + (def.attackMs ?? 460);
      m.golpeEm = now + (def.attackWindup ?? 190);
    }
    // O impacto só sai se o jogador ainda estiver ao alcance quando o golpe cai —
    // dá para escapar do bote andando para trás.
    if (m.golpeEm && now >= m.golpeEm) {
      m.golpeEm = 0;
      if (!playerLocked && playerHp > 0 && dist < (def.touchRange ?? 34) * 1.25) {
        damagePlayer(def.damage ?? 5);
        m.impactoAte = now + 140;
      }
    }
  });
}

// Duas coisas nascem aqui: o selo de RESSOAR que pulsa sobre o Eco aberto, e o ritual
// de ressonância que roda quando o jogador aceita. Tudo no mundo, nunca em overlay — o
// jogador precisa continuar vendo a criatura de quem está tirando o som.
function renderCaptura(now) {
  liveMonsters().forEach(m => { if (m.pronto) renderSeloDeRessoar(m, now); });
  if (!capturaAtiva) return;
  if (capturaAtiva.fase === 'juntar') renderVozesSoltas(now);
  else renderRitualDeCaptura(now);
}

// As vozes do Eco espalhadas pela tela. Tudo que o jogador precisa saber está aqui:
// quanto tempo resta, quais vozes faltam encostar e o quanto elas já estão perto.
function renderVozesSoltas(now) {
  const c = capturaAtiva;
  const restante = Math.max(0, 1 - (now - c.inicio) / c.limite);
  const { cx, cy, raio } = centroDasVozes(c.orbes);
  const quase = raio <= c.raioFusao * 2.2;

  ctx.save();
  ctx.fillStyle = `rgba(2,4,8,${0.34 + 0.16 * (1 - restante)})`;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.restore();

  // alvo de fusão: aparece quando as vozes já estão se aproximando
  if (quase) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.3 * ((Math.sin(now * 0.008) + 1) / 2);
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(cx, cy, c.raioFusao, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // teia ligando as vozes: fica mais forte conforme elas se juntam
  ctx.save();
  ctx.lineWidth = 1.5;
  for (let i = 0; i < c.orbes.length; i++) {
    for (let j = i + 1; j < c.orbes.length; j++) {
      const a = c.orbes[i], b = c.orbes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 190) continue;
      ctx.globalAlpha = Math.max(0, 0.55 * (1 - d / 190));
      ctx.strokeStyle = '#7dd3fc';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  ctx.restore();

  c.orbes.forEach(o => {
    const p = (Math.sin(o.fase) + 1) / 2;
    const r = (o.pega ? 15 : 12) + p * 3;
    ctx.save();
    ctx.shadowColor = o.cor; ctx.shadowBlur = 22 + p * 12;
    ctx.fillStyle = o.cor; ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = '#f8fafc';
    ctx.beginPath(); ctx.arc(o.x, o.y, r * 0.42, 0, Math.PI * 2); ctx.fill();
    // anel de quem está sob o dedo
    if (o.pega) {
      ctx.globalAlpha = 0.8; ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(o.x, o.y, r + 7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  });

  // tempo restante: arco no alto, com a instrução
  ctx.save();
  // Abaixo do medidor de ressonância, que já mora no alto ao centro.
  const W = 190, H = 6, x = (SCREEN_W - W) / 2, y = 58;
  ctx.fillStyle = 'rgba(6,9,14,0.85)';
  ctx.fillRect(x - 1, y - 1, W + 2, H + 2);
  ctx.fillStyle = restante > 0.35 ? '#7dd3fc' : '#fca5a5';
  ctx.fillRect(x, y, W * restante, H);
  ctx.font = 'bold 11px Cinzel, serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('JUNTE AS VOZES', SCREEN_W / 2, y - 8);
  ctx.restore();
}

function renderSeloDeRessoar(m, now) {
  const b = monsterBounds(m);
  const p = (Math.sin(now * 0.006) + 1) / 2;
  const perto = Math.hypot(player.x - m.x, player.y - m.y) < ALCANCE_RESSOAR;

  // halo respirando na criatura
  ctx.save();
  ctx.globalAlpha = 0.3 + p * 0.35;
  ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 3;
  ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.ellipse(m.x, m.y - b.h * 0.45, b.w * 0.7, b.h * 0.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // selo flutuante. Longe fica translúcido: diz "existe" sem gritar "aperte agora".
  const txt = 'RESSOAR';
  ctx.save();
  ctx.globalAlpha = perto ? 1 : 0.55;
  ctx.font = 'bold 12px Outfit, sans-serif';
  const w = ctx.measureText(txt).width + 26, h = 22;
  const x = m.x - w / 2, y = b.y - 34 - Math.sin(now * 0.004) * 3;

  ctx.fillStyle = 'rgba(6,9,14,0.88)';
  ctx.strokeStyle = perto ? '#fde68a' : '#7dd3fc';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 11); ctx.fill(); ctx.stroke();

  ctx.fillStyle = perto ? '#fde68a' : '#cbd5e1';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🔔 ' + txt, m.x, y + h / 2 + 1);

  // seta apontando para baixo, ligando o selo à criatura
  ctx.beginPath();
  ctx.moveTo(m.x - 5, y + h); ctx.lineTo(m.x + 5, y + h); ctx.lineTo(m.x, y + h + 6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Três tempos: os anéis se fecham, o Eco colapsa num clarão, e o som viaja até o
// jogador. Sem pressa — é o instante que dá peso ao fragmento que vem depois.
function renderRitualDeCaptura(now) {
  const c = capturaAtiva, m = c.m;
  const t = Math.min(1, (now - c.inicio) / RITUAL_MS);
  const b = monsterBounds(m);
  // O acorde nasce onde o jogador juntou as vozes, não onde a criatura estava.
  const cx = c.focoX ?? m.x, cy = c.focoY ?? (m.y - b.h * 0.45);

  ctx.save();
  // escurece o cenário em volta, com o Eco no centro da luz
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, SCREEN_W * 0.55);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(2,4,8,${0.55 * Math.min(1, t * 3)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  ctx.restore();

  if (t < 0.55) {
    // 1º tempo: anéis convergindo
    const k = t / 0.55;
    ctx.save();
    ctx.strokeStyle = '#7dd3fc'; ctx.shadowColor = '#e0f2fe'; ctx.shadowBlur = 14;
    for (let i = 0; i < 3; i++) {
      const fase = Math.max(0, Math.min(1, k * 1.4 - i * 0.2));
      const raio = 110 * (1 - fase) + 14;
      ctx.globalAlpha = 0.15 + 0.6 * fase;
      ctx.lineWidth = 1 + 2 * fase;
      ctx.beginPath(); ctx.arc(cx, cy, raio, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  } else if (t < 0.68) {
    // 2º tempo: o clarão
    const k = (t - 0.55) / 0.13;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#f8fafc'; ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 40;
    ctx.beginPath(); ctx.arc(cx, cy, 12 + 90 * k, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else {
    // 3º tempo: as motas de som subindo até o jogador
    const k = (t - 0.68) / 0.32;
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const f = Math.max(0, Math.min(1, k * 1.3 - i * 0.05));
      const px = cx + (player.x - cx) * f + Math.sin(i * 2.1 + now * 0.006) * 12 * (1 - f);
      const py = cy + (player.y - player.height * 0.5 - cy) * f - Math.sin(f * Math.PI) * 26;
      ctx.globalAlpha = 0.25 + 0.75 * (1 - f);
      ctx.fillStyle = i % 3 === 0 ? '#fde68a' : '#7dd3fc';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(px, py, 3.5 - 1.5 * f, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.font = 'bold 13px Cinzel, serif'; ctx.textAlign = 'center';
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(now * 0.008);
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText('RESSOANDO…', SCREEN_W / 2, 46);
  ctx.restore();
}

// Medidor da reserva de som do cenário. Centralizado no alto: no canto direito ele
// ficava por baixo dos botões de bolsa e atributos do HUD.
function renderRessonancia(now) {
  if (!isPlayMode || currentScene !== 'world' || !mapaTemEcos(currentKey)) return;
  const r = ressonanciaDe(currentKey);
  const W = 108, H = 8, x = Math.round((SCREEN_W - W) / 2), y = 14;
  ctx.save();
  ctx.font = 'bold 9px Outfit, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = r.valor > 0 ? '#7dd3fc' : '#64748b';
  ctx.fillText(r.valor > 0 ? 'RESSONÂNCIA DO LUGAR' : 'LUGAR EM SILÊNCIO', x + W / 2, y - 4);
  ctx.fillStyle = 'rgba(6,9,14,0.8)';
  ctx.fillRect(x - 1, y - 1, W + 2, H + 2);
  for (let i = 0; i < RESSONANCIA_MAX; i++) {
    const cw = W / RESSONANCIA_MAX;
    ctx.fillStyle = i < r.valor ? '#38bdf8' : '#1e293b';
    ctx.fillRect(x + i * cw + 1, y, cw - 2, H);
  }
  ctx.restore();
}

// A revelação: o que saiu do Eco, com nome e quantidade. É o fecho da captura e o
// único momento em que o jogo para para dizer "isto é seu agora".
function mostrarRevelacaoDaCaptura(itens, silenciado, qualidade = 0) {
  const ov = document.getElementById('capturaReveal');
  const grade = document.getElementById('capturaItens');
  if (!ov || !grade) {   // sem a tela, ao menos não engole o resultado
    showToast('✦ ' + itens.map(i => `${infoDoItem(i.id)?.nome || i.id} ×${i.n}`).join(' · '));
    return;
  }
  ajustarCaixaNoPalco('capturaReveal');
  grade.innerHTML = '';
  itens.forEach(i => {
    const info = infoDoItem(i.id) || {};
    const casa = document.createElement('div');
    casa.className = 'cap-item';
    const cv = miniCanvas(spriteDoItem(i.id), 46);
    if (cv) casa.appendChild(cv);
    else { const e = document.createElement('span'); e.className = 'cap-emoji'; e.textContent = info.emoji || '✦'; casa.appendChild(e); }
    const nome = document.createElement('div');
    nome.className = 'cap-nome'; nome.style.color = info.cor || '#fde68a';
    nome.textContent = `${info.nome || i.id} ×${i.n}`;
    casa.appendChild(nome);
    grade.appendChild(casa);
  });
  const aviso = document.getElementById('capturaAviso');
  if (aviso) {
    aviso.textContent = silenciado
      ? 'Este lugar está em silêncio: o Eco rendeu pouco. Procure outro cenário.'
      : qualidade > 0.66 ? 'Acorde limpo — as vozes mal tiveram tempo de fugir.'
      : qualidade > 0.3  ? 'Bom encontro. Junte-as mais rápido para tirar som puro.'
      : 'As vozes vagaram bastante: o som veio embaçado.';
    aviso.classList.toggle('alerta', !!silenciado);
  }
  ov.classList.remove('hidden');
  playForgeDone();
}

function fecharRevelacaoDaCaptura() {
  document.getElementById('capturaReveal')?.classList.add('hidden');
}

// Só no editor: quando o jogador não pode andar, diz na tela quem está segurando o
// controle. Adivinhar isso pelo comportamento já custou tempo demais.
function renderMotivoDoTravamento() {
  if (!isPlayMode || !playerLocked) return;
  const motivos = [];
  if (CUT.ativo) motivos.push('cena ' + (CUT.roteiro?.id || '?') + ' passo ' + CUT.passo);
  if (dlg.state !== DLG_STATE.CLOSED) motivos.push('diálogo ' + dlg.state);
  if (shopOpen) motivos.push('loja');
  if (inventoryOpen) motivos.push('inventário');
  if (charOpen) motivos.push('atributos');
  if (forging) motivos.push('forja');
  if (capturaAtiva) motivos.push('captura');
  if (CUT.caminhadas?.length) motivos.push('caminhada de cena');
  const txt = '🔒 TRAVADO — ' + (motivos.length ? motivos.join(' · ') : 'sem dono (destravando…)');
  ctx.save();
  ctx.font = 'bold 12px Outfit, sans-serif';
  const w = ctx.measureText(txt).width + 16;
  ctx.fillStyle = 'rgba(120,10,10,.88)';
  ctx.fillRect(8, SCREEN_H - 28, w, 20);
  ctx.fillStyle = '#fecaca';
  ctx.textAlign = 'left';
  ctx.fillText(txt, 16, SCREEN_H - 14);
  ctx.restore();
}

function drawHealthBar(x, topY, w, ratio, colour) {
  const h = 5;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(x - w/2 - 1, topY - 1, w + 2, h + 2);
  ctx.fillStyle = '#3f1d1d';
  ctx.fillRect(x - w/2, topY, w, h);
  ctx.fillStyle = colour;
  ctx.fillRect(x - w/2, topY, Math.max(0, w * ratio), h);
  ctx.restore();
}

function renderMonsters(now) {
  monsters.forEach(m => {
    if (m.dead || m.mapKey !== currentKey) return;
    const golpes = monsterAtaque[m.type], quadros = monsterWalk[m.type];
    const def0 = monsterDef(m);
    const atacando = golpes && now < (m.atacandoAte || 0);
    const andando = !atacando && quadros && now < (m.andandoAte || 0);
    let spr = monsterSprites[m.type];
    if (atacando) {
      // O quadro acompanha o tempo do golpe, então o bote e o impacto batem com o dano.
      const t = 1 - (m.atacandoAte - now) / (def0.attackMs ?? 460);
      spr = golpes[Math.min(golpes.length - 1, Math.floor(t * golpes.length))];
    } else if (andando) {
      spr = quadros[Math.floor(now / 130) % quadros.length];
    }
    const b = monsterBounds(m);
    const hop = Math.abs(Math.sin(now * 0.004 + m.phase)) * (andando ? 5 : 3);
    // Avanço curto no impacto: o golpe ganha peso sem precisar de sprite novo.
    const invest = atacando ? Math.sin(Math.min(1, 1 - (m.atacandoAte - now) / (def0.attackMs ?? 460)) * Math.PI) * 7 : 0;

    ctx.save();
    if (now < m.hurtUntil) ctx.globalAlpha = (Math.floor(now / 60) % 2) ? 0.35 : 1; // hit flash
    if (spr) {
      ctx.translate(m.x + m.facing * invest, m.y - hop);
      if (m.facing < 0) ctx.scale(-1, 1);
      if (now < (m.impactoAte || 0)) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16; }
      ctx.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, -b.w/2, -b.h, b.w, b.h);
    } else {
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(m.x - b.w/2, m.y - b.h - hop, b.w, b.h);
    }
    ctx.restore();

    // Health bar only once it has been touched — keeps the scene clean.
    if (m.hp < m.maxHp) drawHealthBar(m.x, b.y - hop - 9, Math.min(46, b.w), m.hp / m.maxHp, '#ef4444');
  });
}

// ============================================================
// PROGRESSION — level, XP, attributes, skills
// Everything the player earns funnels through derivedStats(), so combat and movement
// never have to know where a bonus came from.
// ============================================================
const BASE_MAX_HP = 100, BASE_DAMAGE = 10, BASE_COOLDOWN = 480;
const BASE_SPEED = 3.9, BASE_SPRINT = 6.65, BASE_CAPACITY = 40;
const POINTS_PER_LEVEL = 2;
const SLOTS_DE_ACORDE = 2;        // igual para todos: o arsenal cresce por arco, não por build

// Atributos de MÚSICO, não de guerreiro. Cada um governa um sistema que o jogador já
// sente na mão — errar na bigorna vira motivo para investir em Ritmo, perder captura
// vira motivo para Afinação. O nome do atributo ensina o vocabulário de graça.
// Nada aqui mexe em velocidade de movimento: com cenários estáticos isso não é escolha.

let level = 1, xp = 0, attrPoints = 0, skillPoints = 1;
let attrs = { ritmo: 0, afinacao: 0, folego: 0, dinamica: 0, memoria: 0 };
let learnedSkills = [];
let skillTree = { branches: [] };

// Rising curve: each level costs a bit more than the last.
function xpForLevel(l) { return Math.round(60 * Math.pow(l, 1.45)); }

function allSkillNodes() { return skillTree.branches.flatMap(b => b.nodes); }
function skillById(id) { return allSkillNodes().find(n => n.id === id) || null; }
function hasSkill(id) { return learnedSkills.includes(id); }

// Sum of every source: base + attribute points + learned skills.
function derivedStats() {
  const s = {
    maxHp: BASE_MAX_HP + attrs.folego * 6,
    dmg: BASE_DAMAGE + attrs.dinamica * 3,
    dmgMagia: attrs.dinamica * 4,          // % a mais no dano de feitiço
    atkSpeed: attrs.ritmo * 3,             // %
    recarga: Math.min(60, attrs.folego * 4), // % de redução na recarga de feitiço
    forja: Math.min(70, attrs.ritmo * 6),  // % de zona/lentidão a mais na bigorna
    captura: Math.min(70, attrs.afinacao * 6), // % de janela/zona a mais na captura
    puro: Math.min(45, attrs.afinacao * 3),    // % extra de chance de Fragmento Puro
    capacity: BASE_CAPACITY + attrs.memoria * 10,
    desconto: Math.min(50, attrs.memoria * 4), // % a menos de fragmentos na síntese
    moveSpeed: 0,                          // cenários estáticos: movimento não é build
    crit: 0, lifesteal: 0,
  };
  learnedSkills.forEach(id => {
    const e = skillById(id)?.effects || {};
    for (const k in e) s[k] = (s[k] || 0) + e[k];
  });
  return s;
}

function playerMaxHp()   { return derivedStats().maxHp; }
function playerDamage()  { return derivedStats().dmg; }
function attackCooldown(){ return BASE_COOLDOWN / (1 + derivedStats().atkSpeed / 100); }
function claveCapacity() { return derivedStats().capacity; }

// O Ressonador é ferramenta de bolsa, não arma de punho: basta POSSUIR um. Exigir que
// estivesse no slot certo era invisível para o jogador — ele via o item no inventário,
// batia no Eco e via tudo se desfazer sem explicação. O slot continua valendo pelo
// tier: um Ressonador melhor equipado rende mais fragmentos.
function ressonadorEmUso() {
  if (equipped.ressonador) return equipped.ressonador;
  let melhor = null;
  CRAFTABLE_TOOLS.forEach(t => {
    if (t.category !== 'ressonadores') return;
    if ((playerInventory[t.id] || 0) > 0 && (!melhor || t.tier > melhor.tier)) melhor = t;
  });
  return melhor?.id || null;
}
// Usados pelo arco da magia: dano do feitiço e recarga entre lançamentos.
function danoDeFeitico(base)  { return Math.round(base * (1 + derivedStats().dmgMagia / 100)); }
function recargaDeFeitico(ms) { return Math.round(ms * (1 - derivedStats().recarga / 100)); }

function applyMovementStats() {
  const m = 1 + derivedStats().moveSpeed / 100;
  player.speed = BASE_SPEED * m;
  player.sprintSpeed = BASE_SPRINT * m;
}

function grantXp(amount) {
  if (amount <= 0) return;
  xp += amount;
  addFloater(player.x, player.y - player.height - 20, `+${amount} XP`, '#7dd3fc');
  let gained = 0;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level++; gained++;
    attrPoints += POINTS_PER_LEVEL;
    skillPoints += 1;
  }
  if (gained) {
    applyMovementStats();
    playerHp = playerMaxHp();          // a level-up patches you up
    showToast(`⭐ Nível ${level}! +${POINTS_PER_LEVEL * gained} atributos, +${gained} habilidade`);
    levelFlashUntil = performance.now() + 900;
  }
  savePlayerData();
}

function spendAttr(key) {
  if (attrPoints <= 0 || !(key in attrs)) return;
  attrs[key]++; attrPoints--;
  applyMovementStats();
  if (key === 'forca') playerHp = Math.min(playerMaxHp(), playerHp + 4);
  savePlayerData(); renderCharSheet();
}

function skillUnlocked(n) { return !n.requires || hasSkill(n.requires); }
function learnSkill(id) {
  const n = skillById(id);
  if (!n || hasSkill(id) || !skillUnlocked(n) || skillPoints < n.cost) return;
  skillPoints -= n.cost;
  learnedSkills.push(id);
  applyMovementStats();
  playerHp = Math.min(playerMaxHp(), playerHp + (n.effects?.maxHp || 0));
  showToast(`✨ ${n.name} aprendida!`);
  savePlayerData(); renderCharSheet();
}

async function loadSkillTree() {
  try {
    const r = await fetch(`assets/skills.json?t=${Date.now()}`);
    skillTree = await r.json();
  } catch (e) {}
  applyMovementStats();
}

// ============================================================
// COMBAT
// ============================================================
const ATTACK_RANGE = 62;
let levelFlashUntil = 0;
let spawnFlashUntil = 0;
let playerHp = BASE_MAX_HP;
let lastAttack = 0, attackAnimUntil = 0, playerHurtUntil = 0, deadUntil = 0;
const floaters = []; // damage numbers

function addFloater(x, y, text, colour) {
  floaters.push({ x, y, text, colour, born: performance.now() });
}
function renderFloaters(now) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    const age = now - f.born;
    if (age > 900) { floaters.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = 1 - age / 900;
    ctx.fillStyle = f.colour;
    ctx.font = 'bold 15px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(f.text, f.x, f.y - age * 0.03);
    ctx.fillText(f.text, f.x, f.y - age * 0.03);
    ctx.restore();
  }
}

// A quick arc sweeping toward the target, so a tap reads as a swing.
function renderAttackSwing(now) {
  if (now > attackAnimUntil) return;
  const t = 1 - (attackAnimUntil - now) / 180;
  const dir = player.direction;
  const base = dir === 'left' ? Math.PI : dir === 'right' ? 0 : dir === 'up' ? -Math.PI/2 : Math.PI/2;
  const a0 = base - 0.9 + t * 1.8;
  ctx.save();
  ctx.translate(player.x, player.y - player.height * 0.45);
  ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - t)})`;
  ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, 34, a0 - 0.5, a0 + 0.5); ctx.stroke();
  ctx.restore();
}

let playerGatherUntil = 0;
function renderGatherSwing(now) {
  if (now > playerGatherUntil) return;
  const t = 1 - (playerGatherUntil - now) / 450;
  ctx.save();
  ctx.translate(player.x, player.y - player.height * 0.4);
  ctx.globalAlpha = Math.sin(t * Math.PI);
  
  // Golden harvesting arc & sparkles
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 24 + t * 8, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI * 0.2 + i * 0.25;
    const dist = 18 + t * 14;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Uma martelada no conserto: faz barulho, solta fagulha e conta para a missão. O
// ferreiro martela junto, para o trabalho parecer de dois.
let ultimaMartelada = 0;
function darMartelada() {
  const alvo = marteladaTarget();
  const now = performance.now();
  if (!alvo || now - ultimaMartelada < 380) return;
  ultimaMartelada = now;
  playerGatherUntil = now + 420;
  player.direction = alvo.x < player.x ? 'left' : 'right';
  playForgeHit();
  addFloater(alvo.x, alvo.y - 40, '🔨', '#fde68a');
  for (let i = 0; i < 5; i++) {
    addFloater(alvo.x + (Math.random() - 0.5) * 34, alvo.y - 6 - Math.random() * 14, '✦', '#fbbf24');
  }
  // O ferreiro acompanha o ritmo, se estiver por perto.
  const dorn = npcData.find(n => n.mapKey === currentKey && /dorn/i.test(n.name || ''));
  if (dorn) { dorn.andandoAte = now + 200; say(dorn, ['Isso!', 'Mais uma!', 'No compasso!', 'Firme!'][Math.floor(Math.random()*4)], 900); }
  progressoDeMissao('martelar', 'ponte');
}

// Nearest monster within swing range — also drives the action button label.
function attackTarget() {
  if (!isPlayMode || playerLocked || currentScene !== 'world' || playerHp <= 0) return null;
  let best = null, bestD = Infinity;
  liveMonsters().forEach(m => {
    const d = Math.hypot(player.x - m.x, player.y - m.y);
    if (d < ATTACK_RANGE && d < bestD) { best = m; bestD = d; }
  });
  return best;
}

function doAttack() {
  const now = performance.now();
  if (now - lastAttack < attackCooldown()) return;
  const m = attackTarget();
  if (!m) return;
  if (m.pronto) return;   // já se abriu: agora é ressoar, não bater
  const s = derivedStats();
  lastAttack = now; attackAnimUntil = now + 180;

  const crit = s.crit > 0 && Math.random() * 100 < s.crit;
  const dmg = Math.round(playerDamage() * (crit ? 2 : 1));
  m.hp -= dmg;
  m.hurtUntil = now + 260;
  addFloater(m.x, monsterBounds(m).y - 12, crit ? `${dmg}!` : `-${dmg}`, crit ? '#fde047' : '#fca5a5');

  if (s.lifesteal > 0 && playerHp < playerMaxHp()) {
    const heal = Math.max(1, Math.round(dmg * s.lifesteal / 100));
    playerHp = Math.min(playerMaxHp(), playerHp + heal);
    addFloater(player.x, player.y - player.height - 6, `+${heal}`, '#86efac');
  }

  playHitSound();
  if (m.hp <= 0) {
    // Eco não morre de pancada: ele se abre e pede para ser afinado.
    if (monsterDef(m).exigeRessonador && ressonadorEmUso() && !capturaAtiva) abrirEco(m, now);
    else killMonster(m, now);
  }
}

// ── Ressonância do mapa ──────────────────────────────────────────────────────────
// Cada cenário guarda uma reserva de som. Capturar consome; quando zera, os Ecos dali
// silenciam por um tempo. É o que impede farm parado num canto e faz os cenários
// existirem por um motivo — o jogador precisa circular pelo mundo.
const RESSONANCIA_MAX = 6, RESSONANCIA_RECARGA_MS = 75000;
let ressonancia = {};   // mapKey -> { valor, ultimaRecarga }

function ressonanciaDe(mapKey) {
  if (!ressonancia[mapKey]) ressonancia[mapKey] = { valor: RESSONANCIA_MAX, ultimaRecarga: performance.now() };
  const r = ressonancia[mapKey];
  const agora = performance.now();
  const ganhos = Math.floor((agora - r.ultimaRecarga) / RESSONANCIA_RECARGA_MS);
  if (ganhos > 0 && r.valor < RESSONANCIA_MAX) {
    r.valor = Math.min(RESSONANCIA_MAX, r.valor + ganhos);
    r.ultimaRecarga = agora;
  }
  return r;
}

function consumirRessonancia(mapKey) {
  const r = ressonanciaDe(mapKey);
  if (r.valor <= 0) return false;
  if (r.valor === RESSONANCIA_MAX) r.ultimaRecarga = performance.now();
  r.valor--;
  if (r.valor === 0) showToast('🔇 Este lugar ficou em silêncio. Procure outro cenário.');
  return true;
}

function mapaTemEcos(mapKey) {
  return monsters.some(m => m.mapKey === mapKey && monsterDef(m).exigeRessonador);
}

// ── Captura de Ecos ──────────────────────────────────────────────────────────────
// O Eco não morre de pancada. Quando a vida chega na última lasca ele se abre, para de
// se mexer e FICA ESPERANDO: um selo de RESSOAR pulsa sobre ele até o jogador aceitar.
//
// A versão anterior era uma janela de dois segundos com agulha e faixa dourada. Bonita
// no papel, péssima na prática: no celular a barra some no meio do cenário, o toque
// chega atrasado e a criatura se desfazia sem o jogador entender o que tinha feito de
// errado. Sem cronômetro, o momento da captura é uma decisão — e dá tempo de olhar.
const PISO_DE_VIDA_DO_ECO = 0.12;   // fração da vida que nunca se perde no golpe
const RITUAL_MS = 2600;             // duração da animação de ressonância
const ALCANCE_RESSOAR = 90;

// `capturaAtiva` guarda o RITUAL em andamento (não mais a janela de mira). O nome fica:
// o resto do jogo já o usa para saber que a captura está no comando e travar o HUD.
let capturaAtiva = null;   // { m, inicio, itens, xp }

// Chamado quando o golpe levaria o Eco a zero.
function abrirEco(m, now) {
  m.hp = Math.max(1, Math.round((m.maxHp || 40) * PISO_DE_VIDA_DO_ECO));
  m.pronto = true;          // congela no lugar e passa a pedir ressonância
  m.abertoAte = 0;
  playForgeHit();
  addFloater(m.x, m.y - 60, 'O ECO SE ABRE!', '#e0f2fe');
  showToast('🔔 O Eco se abriu — toque em RESSOAR para capturar o som.');
}

// O Eco aberto mais próximo, se houver algum ao alcance.
function ecoProntoPerto() {
  if (!isPlayMode || playerLocked || currentScene !== 'world') return null;
  let melhor = null, menor = Infinity;
  liveMonsters().forEach(m => {
    if (!m.pronto) return;
    const d = Math.hypot(player.x - m.x, player.y - m.y);
    if (d < ALCANCE_RESSOAR && d < menor) { melhor = m; menor = d; }
  });
  return melhor;
}

// Quanto o Eco rende. Separado do ritual para que a animação só mostre o resultado.
function colheitaDoEco(m, qualidade = 0) {
  const def = monsterDef(m);
  const tinha = consumirRessonancia(m.mapKey);
  const idResson = ressonadorEmUso();
  const tier = idResson ? (CRAFTABLE_TOOLS.find(t => t.id === idResson)?.tier || 1) : 1;
  // Afinação dá a base; juntar as vozes rápido é o que realmente limpa o som.
  const chancePuro = Math.min(70, derivedStats().puro + qualidade * 55);

  const itens = [];
  const somar = (id, n) => {
    if (n <= 0) return;
    const j = itens.find(i => i.id === id);
    if (j) j.n += n; else itens.push({ id, n });
  };

  (def.drops || []).forEach(drop => {
    if (drop.item === 'fragmento') {
      let n = (drop.min ?? 1) + Math.floor(Math.random() * (((drop.max ?? 1) - (drop.min ?? 1)) + 1));
      n += tier - 1;                                   // Ressonador melhor, mais som
      if (!tinha) n = Math.max(1, Math.floor(n / 3));  // lugar silenciado rende pouco
      // Cada fragmento sorteado sai PURO ou comum. Um puro vale três na síntese, então
      // trocar um pelo outro é o prêmio de quem juntou as vozes depressa — antes eu
      // exigia três sortes para gerar um puro, o que dava exatamente no mesmo e fazia a
      // perícia não valer nada.
      let puros = 0;
      for (let i = 0; i < n; i++) if (Math.random() * 100 < chancePuro) puros++;
      somar('fragmento_puro', puros);
      somar('fragmento', n - puros);
      return;
    }
    if (drop.chance != null && Math.random() > drop.chance) return;
    somar(drop.item, (drop.min ?? 1) + Math.floor(Math.random() * (((drop.max ?? 1) - (drop.min ?? 1)) + 1)));
  });

  return { itens, silenciado: !tinha, xp: def.xp ?? Math.max(6, Math.round((def.hp ?? 20) * 0.6)) };
}

// Vai direto para a bolsa: fragmento capturado não fica no chão esperando ser pisado.
function receberDaCaptura(id, n) {
  if (id === 'clave') { claveCount += n; return; }
  playerInventory[id] = (playerInventory[id] || 0) + n;
  if (id === 'fragmento_puro') progressoDeMissao('coletar', 'fragmento', n * VALOR_FRAGMENTO_PURO);
  else progressoDeMissao('coletar', id, n);
}

// ── O acorde disperso ────────────────────────────────────────────────────────────
// Ressoar não captura na hora: o Eco se parte em três ou quatro vozes soltas que saem
// vagando pelo cenário. O jogador arrasta uma por uma com o dedo e as junta num ponto
// qualquer da tela — quando todas se encostam, elas fundem num acorde e o som é seu.
//
// A ideia é a mesma da afinação antiga (é preciso ter mão), mas o gesto é arrastar e
// não acertar um instante de 116 ms: no celular isso é a diferença entre um desafio e
// um sorteio. Quem junta rápido tira Fragmento Puro; quem demora demais vê tudo se
// dispersar.
const CAPTURA_LIMITE_MS = 14000;
const RAIO_FUSAO = 40;      // distância entre as vozes para que elas se fundam
const RAIO_PEGADA = 38;     // folga do dedo para agarrar uma voz
const CORES_DAS_VOZES = ['#7dd3fc', '#fde68a', '#c4b5fd', '#86efac'];

function ressoar() {
  if (capturaAtiva) return;
  const m = ecoProntoPerto();
  if (!m) return;

  const def = monsterDef(m);
  const af = derivedStats().captura / 100;    // Afinação: mais tempo, vozes mais mansas
  const vozes = (def.hp ?? 40) >= 60 ? 4 : 3;
  const b = monsterBounds(m);
  const cx = m.x, cy = m.y - b.h * 0.45;

  const orbes = [];
  for (let i = 0; i < vozes; i++) {
    const ang = (Math.PI * 2 * i) / vozes + Math.random() * 0.5;
    const raio = 78 + Math.random() * 26;
    const v = 0.42 * (1 - af * 0.45);
    orbes.push({
      x: Math.max(40, Math.min(SCREEN_W - 40, cx + Math.cos(ang) * raio)),
      y: Math.max(50, Math.min(SCREEN_H - 50, cy + Math.sin(ang) * raio * 0.7)),
      vx: Math.cos(ang) * v, vy: Math.sin(ang) * v * 0.7,
      cor: CORES_DAS_VOZES[i % CORES_DAS_VOZES.length],
      fase: Math.random() * Math.PI * 2,
      pega: false,
    });
  }

  m.pronto = false;
  capturaAtiva = {
    m, fase: 'juntar', inicio: performance.now(),
    limite: CAPTURA_LIMITE_MS * (1 + af * 0.5),
    raioFusao: RAIO_FUSAO * (1 + af * 0.4),
    orbes, arrastando: null,
  };
  playerLocked = true;         // as duas mãos são do minijogo agora
  playForgeHit();
  showToast('✧ O Eco se partiu — junte as vozes num ponto só.');
}

// Onde as vozes estão, em média, e o quanto estão espalhadas.
function centroDasVozes(orbes) {
  const cx = orbes.reduce((a, o) => a + o.x, 0) / orbes.length;
  const cy = orbes.reduce((a, o) => a + o.y, 0) / orbes.length;
  const raio = Math.max(...orbes.map(o => Math.hypot(o.x - cx, o.y - cy)));
  return { cx, cy, raio };
}

function atualizarCaptura(now) {
  if (!capturaAtiva) return;
  const c = capturaAtiva;

  if (c.fase === 'juntar') {
    const t = now - c.inicio;
    if (t > c.limite) { dispersarCaptura(); return; }

    c.orbes.forEach(o => {
      o.fase += 0.05;
      if (o === c.arrastando) return;                 // na mão do jogador: não vagueia
      o.x += o.vx; o.y += o.vy;
      // Bate nas beiradas e volta, senão a voz foge da tela e a captura fica impossível.
      if (o.x < 34 || o.x > SCREEN_W - 34) { o.vx *= -1; o.x = Math.max(34, Math.min(SCREEN_W - 34, o.x)); }
      if (o.y < 46 || o.y > SCREEN_H - 46) { o.vy *= -1; o.y = Math.max(46, Math.min(SCREEN_H - 46, o.y)); }
    });

    const { cx, cy, raio } = centroDasVozes(c.orbes);
    if (raio <= c.raioFusao) fundirVozes(cx, cy, now);
    return;
  }

  // fase do ritual: só espera a animação terminar
  if (now - c.inicio < RITUAL_MS) return;

  const m = c.m;
  m.dead = true; m.hp = 0; m.pronto = false; m.respawnAt = now + 12000;
  c.itens.forEach(i => receberDaCaptura(i.id, i.n));
  grantXp(c.xp);
  savePlayerData();
  updateInventorySlotsUI?.();
  const itens = c.itens, silenciado = c.silenciado, qualidade = c.qualidade;
  capturaAtiva = null;
  playerLocked = false;
  mostrarRevelacaoDaCaptura(itens, silenciado, qualidade);
}

// As vozes se encontraram: vira acorde, e a pressa do jogador vira qualidade.
function fundirVozes(cx, cy, now) {
  const c = capturaAtiva;
  const usado = (now - c.inicio) / c.limite;
  // Rápido rende som limpo. A curva é generosa no começo: até um terço do tempo ainda
  // conta como captura perfeita.
  const nota = Math.max(0, Math.min(1, 1 - (usado - 0.33) / 0.67));
  const colheita = colheitaDoEco(c.m, nota);

  capturaAtiva = {
    m: c.m, fase: 'ritual', inicio: now, focoX: cx, focoY: cy,
    qualidade: nota, ...colheita,
  };
  playerLocked = true;
  playForgeDone();
}

function dispersarCaptura() {
  const m = capturaAtiva.m;
  capturaAtiva = null;
  playerLocked = false;
  m.dead = true; m.hp = 0; m.pronto = false; m.respawnAt = performance.now() + 12000;
  addFloater(m.x, m.y - 50, '♪ dispersou ♪', '#94a3b8');
  showToast('✧ As vozes se perderam. Junte-as mais rápido da próxima vez.');
}

// ── Arrastar as vozes ────────────────────────────────────────────────────────────
// Chamados pelos eventos de ponteiro do canvas, que já valem para dedo e para mouse.
function pegarVoz(mx, my) {
  if (!capturaAtiva || capturaAtiva.fase !== 'juntar') return false;
  let alvo = null, menor = RAIO_PEGADA;
  capturaAtiva.orbes.forEach(o => {
    const d = Math.hypot(o.x - mx, o.y - my);
    if (d < menor) { alvo = o; menor = d; }
  });
  if (!alvo) return false;
  capturaAtiva.arrastando = alvo;
  alvo.pega = true;
  playStep(false);
  return true;
}

function arrastarVoz(mx, my) {
  const c = capturaAtiva;
  if (!c || c.fase !== 'juntar' || !c.arrastando) return;
  c.arrastando.x = Math.max(34, Math.min(SCREEN_W - 34, mx));
  c.arrastando.y = Math.max(46, Math.min(SCREEN_H - 46, my));
}

function soltarVoz() {
  const c = capturaAtiva;
  if (!c || !c.arrastando) return;
  // Solta parada: sem isto ela dispara de volta com a velocidade antiga e desfaz o
  // trabalho de quem acabou de posicioná-la.
  c.arrastando.vx *= 0.25; c.arrastando.vy *= 0.25;
  c.arrastando.pega = false;
  c.arrastando = null;
}

function soltarItem(item, m, now) {
  dropItems.push({
    item, x: m.x + (Math.random() * 40 - 20), y: m.y + (Math.random() * 18 - 9),
    mapKey: m.mapKey, born: now, collected: false,
  });
}

function killMonster(m, now) {
  m.dead = true;
  m.hp = 0;
  m.respawnAt = now + 12000; // comes back after 12s so the area stays farmable
  const def = monsterDef(m);
  // Aceita `drop` (um item) ou `drops` (lista com chance) — o monstro pode largar
  // fragmentos sempre e uma clave de vez em quando.
  let tabela = def.drops || (def.drop ? [def.drop] : []);

  // Criatura de som: sem Ressonador equipado ela se desfaz no ar e não deixa nada.
  // A regra é explicada na hora, senão o jogador acha que está bugado.
  if (def.exigeRessonador && !ressonadorEmUso()) {
    tabela = [];
    if (now - (window.__avisoResson || 0) > 6000) {
      window.__avisoResson = now;
      showToast('🔔 O som do Eco se dispersou — forje um Ressonador para capturá-lo.');
      addFloater(m.x, m.y - 50, '♪ dispersou ♪', '#94a3b8');
    }
  }
  // Ressonador melhor rende mais: cada tier soma um fragmento.
  const idResson = ressonadorEmUso();
  const bonusResson = idResson
    ? (CRAFTABLE_TOOLS.find(t => t.id === idResson)?.tier || 1) - 1 : 0;

  tabela.forEach(drop => {
    if (drop.chance != null && Math.random() > drop.chance) return;
    let n = (drop.min ?? 1) + Math.floor(Math.random() * (((drop.max ?? 1) - (drop.min ?? 1)) + 1));
    if (drop.item === 'fragmento') n += bonusResson;
    for (let i = 0; i < n; i++) {
      dropItems.push({
        item: drop.item || 'clave',
        x: m.x + (Math.random() * 40 - 20),
        y: m.y + (Math.random() * 18 - 9),
        mapKey: m.mapKey,
        born: now, collected: false,
      });
    }
  });
  grantXp(def.xp ?? Math.max(6, Math.round((def.hp ?? 20) * 0.6)));
  if (def.pacifico) {
    // Não é uma morte: a clave presa se soltou e a criatura foi embora aliviada.
    addFloater(m.x, m.y - 50, '✧ libertado', '#a7f3d0');
    showToast(`✧ A clave se soltou — ${def.name || 'a criatura'} seguiu seu caminho.`);
  } else {
    showToast(`✨ ${def.name || 'Monstro'} derrotado!`);
  }
}

function damagePlayer(amount) {
  const now = performance.now();
  if (now < playerHurtUntil) return; // invulnerability window
  playerHp = Math.max(0, playerHp - amount);
  playerHurtUntil = now + 700;
  addFloater(player.x, player.y - player.height - 6, `-${amount}`, '#fecaca');
  if (playerHp <= 0) {
    deadUntil = now + 1400;
    playerLocked = true;
    showToast('💀 Você desmaiou... voltando ao início.');
  }
}

function updateRespawn(now) {
  if (playerHp > 0 || !deadUntil || now < deadUntil) return;
  deadUntil = 0;
  playerHp = playerMaxHp();
  playerLocked = false;
  const sp = spawns[currentKey] || { x: 512, y: 400 };
  player.x = sp.x; player.y = sp.y;
  // Reset the monsters here so you don't respawn straight into the mob that felled you.
  monsters.forEach(m => { if (m.mapKey === currentKey) { m.x = m.homeX; m.y = m.homeY; } });
}

function playHitSound() {
  if (!audioCtx) return;
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(320, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime + 0.12);
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.12);
  } catch (e) {}
}

// ============================================================
// DROPS
// ============================================================
let dropItems = [];
let claveCount = 0, lastFullToast = 0;
let claveSprite = null;
(() => {
  const img = new Image();
  img.onload = () => { try { claveSprite = prepareSpriteCell(img, { cols: 6, rows: 3, cell: [0, 0] }); } catch (e) {} };
  img.onerror = () => {};
  img.src = 'assets/clave.jpg';
})();

function updateDrops(now) {
  if (!isPlayMode || currentScene !== 'world') return;
  for (let i = dropItems.length - 1; i >= 0; i--) {
    const d = dropItems[i];
    if (d.mapKey !== currentKey) continue;
    if (now - d.born > 45000) { dropItems.splice(i, 1); continue; } // despawn
    if (Math.hypot(player.x - d.x, player.y - d.y) < 34) {
      if (d.item === 'clave') {
        // Clave é MOEDA, não item de mochila: paga síntese e selagem de escala, e o
        // jogador vai juntar centenas. Teto de bolsa aqui só produzia "bolsa cheia" e
        // drops apodrecendo no chão.
        dropItems.splice(i, 1);
        claveCount++;
        addFloater(player.x, player.y - player.height - 6, '+1 clave', '#fcd34d');
      } else {
        // Fragmentos, tons e semitons: itens de mochila, sem limite de claves.
        dropItems.splice(i, 1);
        playerInventory[d.item] = (playerInventory[d.item] || 0) + 1;
        const info = ITENS_DE_MAGIA[d.item];
        addFloater(player.x, player.y - player.height - 6, `+1 ${info?.nome || d.item}`, info?.cor || '#fcd34d');
        // Um Fragmento Puro vale três na síntese, então vale três na missão também —
        // senão afinar bem pareceria render menos progresso do que bater de qualquer jeito.
        if (d.item === 'fragmento_puro') progressoDeMissao('coletar', 'fragmento', VALOR_FRAGMENTO_PURO);
        else progressoDeMissao('coletar', d.item);
        updateInventorySlotsUI?.();
      }
      savePlayerData();
    }
  }
}

// Itens de magia largados pelos monstros. Cor e nome vêm daqui, então acrescentar um
// item novo é uma linha nesta tabela.
// Catálogo do grimório. Cada item tem nome, tipo, descrição e origem — selecionar no
// inventário é como o jogador aprende o que é cada coisa. Sem isto, fragmento é só um
// número subindo no canto da tela.
const CATALOGO = {
  fragmento: {
    nome: 'Fragmento de Nota', tipo: 'Essência', sprite: 'fragmento', cor: '#fbbf24',
    desc: 'Um pedaço de som que não chegou a terminar. Sozinho não toca nada — vibra baixinho, como quem tenta lembrar de uma melodia.',
    origem: 'Capturado de Ecos com um Ressonador equipado.',
  },
  fragmento_puro: {
    nome: 'Fragmento Puro', tipo: 'Essência rara', sprite: 'fragmento', cor: '#fef3c7',
    desc: 'Capturado exatamente no tom. O som veio inteiro, sem se esfarelar no ar. Vale por três fragmentos comuns na síntese.',
    origem: 'Captura afinada — acertar a faixa dourada da ressonância.',
  },
  tom: {
    nome: 'Tom', tipo: 'Intervalo', sprite: 'tom', cor: '#60a5fa',
    desc: 'Não é som: é distância. O passo largo entre duas notas, com uma casa inteira pulada no meio do caminho.',
    origem: 'Ecos Cristalinos, os azuis.',
  },
  semitom: {
    nome: 'Semitom', tipo: 'Intervalo', sprite: 'semitom', cor: '#c084fc',
    desc: 'O menor passo que existe na música. Entre duas notas vizinhas não cabe mais nada — e é por isso que ele soa tão apertado.',
    origem: 'Ecos Cromáticos, os roxos.',
  },
  clave: {
    nome: 'Clave', tipo: 'Referência', emoji: '𝄞', cor: '#fde68a',
    desc: 'Não faz som algum. É ela que diz o que o som significa: sem uma clave no início da pauta, uma nota escrita é apenas uma bolinha no papel.',
    origem: 'Presa às criaturas mansas da floresta a leste. Golpeie até ela se soltar.',
  },
  wood: {
    nome: 'Madeira Rústica', tipo: 'Material', emoji: '🪵', cor: '#a16207',
    desc: 'Carvalho seco, bom para cabo de ferramenta. O Ferreiro Dorn diz que madeira boa é a que não reclama quando você bate.',
    origem: 'Troncos na Floresta Mágica.',
  },
  stone: {
    nome: 'Pedra', tipo: 'Material', emoji: '🪨', cor: '#94a3b8',
    desc: 'Pedra de rio, densa e fria. Serve para cabeça de martelo, para ponte e para calar discussão.',
    origem: 'Afloramentos na Floresta Mágica.',
  },
  potions: {
    nome: 'Poção de Vida', tipo: 'Consumível', emoji: '🧪', cor: '#ef4444',
    desc: 'Restaura 40 pontos de vida. Tem gosto de mel queimado.',
    origem: 'Comprada no Mercador Tibério.',
  },
};

const ITENS_DE_MAGIA = {
  fragmento:       { nome: 'Fragmento de Nota', cor: '#fbbf24', brilho: '253,224,71',  sprite: 'fragmento' },
  fragmento_puro:  { nome: 'Fragmento Puro',    cor: '#fef3c7', brilho: '255,255,255', sprite: 'fragmento', puro: true },
  tom:       { nome: 'Tom',               cor: '#60a5fa', brilho: '96,165,250',  sprite: 'tom' },
  semitom:   { nome: 'Semitom',           cor: '#c084fc', brilho: '192,132,252', sprite: 'semitom' },
};

function renderDrops(now) {
  dropItems.forEach(d => {
    if (d.mapKey !== currentKey) return;
    const bob = Math.sin(now * 0.005 + d.x) * 4;
    const info = ITENS_DE_MAGIA[d.item];
    const spr = info ? magiaSprites[info.sprite] : claveSprite;
    const brilho = info ? info.brilho : '253,224,71';
    const h = info ? 26 : 30, w = spr ? h * (spr.sw / spr.sh) : 16;
    ctx.save();
    // Glow under the pickup so it reads against busy forest art
    const g = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 20);
    g.addColorStop(0, `rgba(${brilho},0.5)`);
    g.addColorStop(1, `rgba(${brilho},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(d.x, d.y, 20, 0, Math.PI * 2); ctx.fill();
    if (spr) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh,
                    d.x - w/2, d.y - h - bob, w, h);
    } else {
      ctx.fillStyle = info?.cor || '#fbbf24'; ctx.font = '22px serif'; ctx.textAlign = 'center';
      ctx.fillText(info ? '♪' : '𝄞', d.x, d.y - bob);
    }
    ctx.restore();
  });
}

// ============================================================
// SHOP / COINS / INVENTORY
// The counter sits in the middle of the interior video; standing in front of it arms
// the action button. Catalogue lives in assets/skins.json so items can be added
// without touching code — an item whose PNG is missing shows as a coloured swatch.
// ============================================================
const SHOP_COUNTER = { x: 512, y: 330, r: 150 };

// A still interior beats the looping video: drop assets/shop_interior.png and it takes
// over automatically, video stays parked.
let shopInterior = null;

// Salão do Forjador de Escalas: interior próprio, sem vídeo, só arte.
let forjadorInterior = null;
(() => {
  const img = new Image();
  img.onload = () => { forjadorInterior = img; };
  img.onerror = () => {};
  img.src = 'assets/interior_forjador.jpg';
})();
const SAVE_KEY = 'acordelot_player_v1';

let shopCatalog = { coins_start: 300, slots: {}, items: [] };
let playerCoins = 300;
let ownedItems = [];
let equipped = { hat: null, outfit: null, wings: null, aura: null,
                 axe: null, pickaxe: null, hammer: null, ressonador: null, activeTool: null };
const skinImages = {}; // item id -> HTMLImageElement (only for items with a sprite)

// Zera o que é progresso de partida (ferramentas, materiais, missões, nível), mas
// preserva o que é cosmético comprado, que o jogador escolheu de propósito.
// Aplica o `estadoInicial` de uma cena: nível, itens, ferramentas equipadas, notas e
// missões já vencidas. Permite testar qualquer trecho da história isoladamente.
function aplicarEstadoInicial(cena) {
  const e = cena?.estadoInicial;
  if (!e) return;

  if (e.nivel && e.nivel > level) {
    while (level < e.nivel) { level++; attrPoints += POINTS_PER_LEVEL; skillPoints++; }
    xp = 0; playerHp = playerMaxHp();
  }
  if (e.interior && INTERIORS[e.interior]) {
    // Cena que acontece dentro de um ambiente: entra nele em vez de largar o jogador
    // no mapa de surgimento. Sem isto a Cena 11 abria na Floresta Sombria.
    if (e.mapa && cenarioExiste(e.mapa)) currentKey = e.mapa;
    setTimeout(() => { if (isPlayMode) enterInterior(e.interior); }, 60);
  }
  if (e.claves) claveCount += e.claves;
  if (e.moedas) playerCoins += e.moedas;
  Object.entries(e.itens || {}).forEach(([k, v]) => {
    playerInventory[k] = (playerInventory[k] || 0) + v;
  });
  (e.forjar || []).forEach(id => {
    const t = CRAFTABLE_TOOLS.find(x => x.id === id);
    if (!t) return;
    playerInventory[t.id] = 1;
    toolQuality[t.id] = e.qualidade || 'boa';
    const slot = Object.entries(CATEGORIA_POR_SLOT).find(([, cat]) => cat === t.category)?.[0];
    if (slot) equipped[slot] = t.id;
  });
  (e.notas || []).forEach(id => { notasPossuidas[id] = (notasPossuidas[id] || 0) + 1; });
  (e.missoesFeitas || []).forEach(id => { if (!completedQuests.includes(id)) completedQuests.push(id); });

  updateInventorySlotsUI?.();
  updateHotbarUI?.();
  savePlayerData();
  showToast('🎒 Equipamento e itens da história aplicados.');
}

function reiniciarProgressoDeJogo() {
  equipped.axe = equipped.pickaxe = equipped.hammer = equipped.ressonador = null;
  equipped.activeTool = null;
  toolQuality = {};
  notasPossuidas = {};
  escalasMontadas = []; montagem = null; acordesObtidos = {};
  CRAFTABLE_TOOLS.forEach(t => { delete playerInventory[t.id]; });
  playerInventory.wood = 0; playerInventory.stone = 0; playerInventory.potions = 0;
  claveCount = 0;
  activeQuests = []; completedQuests = [];
  level = 1; xp = 0; attrPoints = 0; skillPoints = 1;
  attrs = { ritmo: 0, afinacao: 0, folego: 0, dinamica: 0, memoria: 0 };
  learnedSkills = [];
  playerHp = playerMaxHp();
  atualizarRastreador(); updateHotbarUI(); updateInventorySlotsUI?.();
  savePlayerData();
}

function temProgressoSalvo() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return !!(d && d.mapa && (d.missoesFeitas?.length || d.missoesAtivas?.length || d.level > 1));
  } catch (e) { return false; }
}

// Retoma exatamente onde parou: mapa, posição, vida.
function continuarJogo() {
  document.getElementById('mainMenuOverlay')?.classList.add('hidden');
  const mapa = window.__mapaSalvo;
  if (mapa && bgSources[mapa]) {
    currentKey = mapa;
    if (activeMapSelect && bgSources[mapa]) activeMapSelect.value = mapa;
    updateMapStatus();
  }
  if (!isPlayMode) togglePlay();
  if (window.__posSalva && canMoveTo(window.__posSalva.x, window.__posSalva.y)) {
    player.x = window.__posSalva.x; player.y = window.__posSalva.y;
  }
  if (typeof window.__vidaSalva === 'number' && window.__vidaSalva > 0) playerHp = window.__vidaSalva;
  atualizarRastreador(); updateHotbarUI();
  showToast(`▶ Bem-vindo de volta, ${nomeDoJogador()}!`);
}

function savePlayerData() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins: playerCoins, owned: ownedItems, equipped, claves: claveCount,
      level, xp, attrPoints, skillPoints, attrs, skills: learnedSkills,
      toolQuality, notas: notasPossuidas, escalas: escalasMontadas, acordes: acordesObtidos,
      // Progresso de jogo: no celular não há servidor, então tudo vive aqui.
      nome: playerName, heroi: selectedHeroId,
      inventario: playerInventory,
      missoesAtivas: activeQuests, missoesFeitas: completedQuests,
      mapa: currentKey, pos: { x: Math.round(player.x), y: Math.round(player.y) },
      cenas: CUT.jaRodou,
      vida: playerHp,
      quando: Date.now(),
    }));
  } catch (e) {}
}
function loadPlayerData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.toolQuality) toolQuality = d.toolQuality;
    if (d.notas) notasPossuidas = d.notas;
    if (Array.isArray(d.escalas)) escalasMontadas = d.escalas;
    if (d.acordes) acordesObtidos = d.acordes;
    if (d.nome) playerName = d.nome;
    if (d.heroi) selectedHeroId = d.heroi;
    if (d.inventario) playerInventory = { ...playerInventory, ...d.inventario };
    if (Array.isArray(d.missoesAtivas)) activeQuests = d.missoesAtivas;
    if (Array.isArray(d.missoesFeitas)) completedQuests = d.missoesFeitas;
    if (d.cenas) CUT.jaRodou = { ...CUT.jaRodou, ...d.cenas };
    if (d.mapa) window.__mapaSalvo = d.mapa;
    if (d.pos) window.__posSalva = d.pos;
    if (typeof d.vida === 'number') window.__vidaSalva = d.vida;
    if (typeof d.coins === 'number') playerCoins = d.coins;
    if (typeof d.claves === 'number') claveCount = d.claves;
    if (Array.isArray(d.owned)) ownedItems = d.owned;
    if (d.equipped) equipped = { ...equipped, ...d.equipped };
    if (typeof d.level === 'number') level = d.level;
    if (typeof d.xp === 'number') xp = d.xp;
    if (typeof d.attrPoints === 'number') attrPoints = d.attrPoints;
    if (typeof d.skillPoints === 'number') skillPoints = d.skillPoints;
    if (d.attrs) {
      // Saves antigos guardam força/agilidade/capacidade. Converte em vez de descartar,
      // senão quem já jogou perde o progresso ao atualizar.
      const a = d.attrs;
      if (a.forca != null || a.agilidade != null || a.capacidade != null) {
        attrs.dinamica += a.forca || 0;
        attrs.folego   += a.forca || 0;
        attrs.ritmo    += a.agilidade || 0;
        attrs.memoria  += a.capacidade || 0;
      } else {
        attrs = { ...attrs, ...a };
      }
    }
    if (Array.isArray(d.skills)) learnedSkills = d.skills;
    applyMovementStats();
  } catch (e) {}
}

async function loadShopCatalog() {
  try {
    const r = await fetch(`assets/skins.json?t=${Date.now()}`);
    shopCatalog = await r.json();
  } catch (e) { return; }
  playerCoins = shopCatalog.coins_start ?? 300;
  loadPlayerData(); // saved balance wins over the catalogue default
  shopCatalog.items.forEach(it => {
    if (!it.sprite) return;
    const img = new Image();
    img.onload = () => {
      // Same background-key + trim as the NPC sprites: a JPEG straight from the
      // generator would otherwise paint a white box on the player's head.
      try { skinImages[it.id] = prepareSprite(img); } catch (e) {}
    };
    img.onerror = () => {}; // not drawn yet — the card shows a placeholder
    img.src = it.sprite;
  });
}

function itemById(id) { return shopCatalog.items.find(i => i.id === id) || null; }
function ownsItem(id) { return ownedItems.includes(id); }

function buyItem(id) {
  const it = itemById(id);
  if (!it || ownsItem(id)) return false;
  if (playerCoins < it.price) { showToast('💰 Moedas insuficientes!'); return false; }
  playerCoins -= it.price;
  ownedItems.push(id);
  equipItem(id); // buying equips straight away — one tap less on a phone
  savePlayerData();
  showToast(`✅ ${it.name} comprado!`);
  return true;
}

function equipItem(id) {
  const it = itemById(id);
  if (!it || !ownsItem(id)) return;
  equipped[it.slot] = (equipped[it.slot] === id) ? null : id;
  savePlayerData();
  renderShopUI(); renderInventoryUI();
}

// Is the player standing at the shop counter?
// Standing at the interior's counter/anvil. Returns the action it offers, or null.
// O painel de montagem de escalas entra quando os sprites de nota estiverem recortados.
// Por enquanto o altar responde, para a sala já ter função e poder ser testada.
// ── Altar das Escalas ────────────────────────────────────────────────────────────
// Primeira função: condensar fragmentos em notas. A montagem da escala entra depois,
// no mesmo altar — por isso o painel já nasce como uma tela e não como um toast.
let notasPossuidas = {};   // id da nota -> quantidade

function temNota(id) { return (notasPossuidas[id] || 0) > 0; }

let ritualEmCurso = false;

function condensarNota(nota) {
  if (ritualEmCurso) return;
  const c = custoDaNota(nota);
  if (!podePagarNota(nota)) {
    showToast(`✧ Faltam fragmentos ou claves para condensar ${nota.nome}.`);
    return;
  }
  gastarFragmentos(c.fragmentos);
  claveCount -= c.claves;
  rodarRitual(nota, () => {
    notasPossuidas[nota.id] = (notasPossuidas[nota.id] || 0) + 1;
    progressoDeMissao('sintetizar', 'nota');
    progressoDeMissao('sintetizar', nota.natural ? 'natural' : 'sustenida');
    savePlayerData();
    renderAltar();
  });
}

// Cerimônia de três tempos: os fragmentos são puxados para o centro, o núcleo
// colapsa num clarão e a nota nasce tocando a si mesma.
function rodarRitual(nota, aoTerminar) {
  const ov = document.getElementById('ritualOverlay');
  const nucleo = document.getElementById('ritualNucleo');
  const nome = document.getElementById('ritualNome');
  const legenda = document.getElementById('ritualLegenda');
  if (!ov || !nucleo) { aoTerminar(); return; }

  ritualEmCurso = true;
  ov.classList.remove('hidden', 'estourou');
  nucleo.innerHTML = '';
  nome.textContent = '';
  legenda.textContent = 'condensando…';
  ov.querySelectorAll('.ritual-faisca').forEach(e => e.remove());

  // fragmentos vindo das bordas
  const c = custoDaNota(nota);
  for (let i = 0; i < Math.min(18, c.fragmentos + 4); i++) {
    const f = document.createElement('i');
    f.className = 'ritual-faisca';
    const ang = Math.random() * Math.PI * 2, raio = 180 + Math.random() * 140;
    f.style.setProperty('--dx', `${Math.cos(ang) * raio}px`);
    f.style.setProperty('--dy', `${Math.sin(ang) * raio}px`);
    f.style.setProperty('--dur', `${0.8 + Math.random() * 0.7}s`);
    f.style.animationDelay = `${Math.random() * 0.5}s`;
    if (!nota.natural) { f.style.background = '#7dd3fc'; f.style.boxShadow = '0 0 12px #38bdf8'; }
    ov.appendChild(f);
  }

  tocarCondensacao(nota.id);

  // o estouro: o núcleo vira a nota e ela toca
  setTimeout(() => {
    const spr = magiaSprites['nota_' + nota.id];
    if (spr) {
      const h = 90, w = Math.round(h * (spr.sw / spr.sh));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const cx = cv.getContext('2d');
      cx.imageSmoothingEnabled = false;
      cx.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, 0, 0, w, h);
      nucleo.appendChild(cv);
    } else nucleo.textContent = '♪';
    nome.textContent = nota.nome;
    legenda.textContent = 'NOTA CONDENSADA';
    ov.classList.add('estourou');
    tocarNota(nota.id, 2.2, 0.16);
    addFloater(player.x, player.y - 60, `♪ ${nota.nome}`, nota.natural ? '#fde68a' : '#7dd3fc');
    aoTerminar();
  }, 1500);

  // sai de cena
  setTimeout(() => {
    ov.classList.add('hidden');
    ov.querySelectorAll('.ritual-faisca').forEach(e => e.remove());
    ritualEmCurso = false;
  }, 3400);
}

// Toca a nota de verdade, com um harmônico por cima para soar a cristal e não a bipe.
function tocarNota(id, dur = 1.6, volume = 0.14) {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;
  const f = FREQ_BASE[id];
  if (!f) return;
  try {
    const t0 = audioCtx.currentTime;
    [[f, volume], [f * 2, volume * 0.35], [f * 3, volume * 0.12]].forEach(([freq, vol], i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    });
  } catch (e) {}
}

// Sopro grave que sobe: o som do altar acordando durante a condensação.
function tocarCondensacao(id) {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;
  const alvo = FREQ_BASE[id] || 330;
  try {
    const t0 = audioCtx.currentTime, dur = 1.5;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(alvo / 4, t0);
    o.frequency.exponentialRampToValueAtTime(alvo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05, t0 + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const filtro = audioCtx.createBiquadFilter();
    filtro.type = 'lowpass'; filtro.frequency.value = 1200;
    o.connect(filtro); filtro.connect(g); g.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  } catch (e) {}
}

// ── Montagem de escala ───────────────────────────────────────────────────────────
// Intervalo aqui não é ingrediente, é PASSO. Cada peça encaixada move o jogador pela
// cromática: Tom pula duas casas, Semitom pula uma. A fórmula deixa de ser uma sigla
// decorada e vira um caminho que ele percorreu com o dedo.
const FORMULA_MAIOR = ['T','T','S','T','T','T','S'];
const NOMES_PASSO = { T: 'TOM', S: 'SEMITOM' };
let escalasMontadas = [];      // [{ tonica, tipo }]
let montagem = null;           // { tonica, passos:[], posicao, guiado }

function iniciarMontagem(tonicaId = 'do') {
  const iT = CROMATICA.findIndex(n => n.id === tonicaId);
  montagem = {
    tonica: tonicaId, iTonica: iT, passos: [], posicao: iT,
    guiado: escalasMontadas.length === 0,   // só a primeira escala é guiada
  };
  renderMontagem();
}

function notaNaPosicao(i) { return CROMATICA[i % CROMATICA.length]; }

function colocarIntervalo(tipo) {
  if (!montagem) return;
  const item = tipo === 'T' ? 'tom' : 'semitom';
  if ((playerInventory[item] || 0) <= 0) { falaDoAltar(`Você não tem ${NOMES_PASSO[tipo]}.`, 'erro'); return; }

  const esperado = FORMULA_MAIOR[montagem.passos.length];
  if (tipo !== esperado) {
    // Erro soa: o jogador OUVE a distância errada em vez de só ler um aviso.
    tocarDissonancia(notaNaPosicao(montagem.posicao).id, tipo === 'T' ? 2 : 1);
    const el = document.getElementById('altarViewMontar');
    el?.classList.add('tremendo');
    setTimeout(() => el?.classList.remove('tremendo'), 320);
    falaDoAltar('ESSA DISTÂNCIA NÃO. ESCUTE COMO SOA TORTO.', 'erro');
    return;                                  // a peça volta para a mochila: nada se perde
  }

  playerInventory[item]--;
  montagem.passos.push(tipo);
  montagem.posicao += (tipo === 'T' ? 2 : 1);
  const nota = notaNaPosicao(montagem.posicao);
  tocarNota(nota.id, 1.0, 0.13);

  if (montagem.passos.length >= FORMULA_MAIOR.length) selarEscala();
  else { falaDoAltar(`${nota.nome}. ${montagem.passos.length} de ${FORMULA_MAIOR.length}.`, 'ok'); renderMontagem(); }
  savePlayerData();
}

function selarEscala() {
  const graus = grausDaMontagem();
  const faltando = graus.filter(g => !temNota(g.id));
  if (faltando.length) {
    falaDoAltar(`Faltam notas condensadas: ${faltando.map(n => n.nome).join(', ')}.`, 'erro');
    renderMontagem();
    return;
  }
  escalasMontadas.push({ tonica: montagem.tonica, tipo: 'maior' });
  falaDoAltar('A ESCALA RESSOA. ELA ESTÁ INTEIRA.', 'ok');
  progressoDeMissao('montar', 'escala');
  // toca a escala inteira, degrau por degrau
  graus.concat([notaNaPosicao(montagem.iTonica)]).forEach((g, i) =>
    setTimeout(() => tocarNota(g.id, 0.8, 0.13), i * 260));
  savePlayerData();
  setTimeout(() => { montagem = null; renderAltar(); }, 2600);
}

// Notas onde o caminho pisou, incluindo a tônica.
function grausDaMontagem() {
  const out = [notaNaPosicao(montagem.iTonica)];
  let p = montagem.iTonica;
  montagem.passos.forEach(t => { p += (t === 'T' ? 2 : 1); out.push(notaNaPosicao(p)); });
  return out.slice(0, -1).concat(out.length > FORMULA_MAIOR.length ? [] : []);
}

function renderMontagem() {
  if (!montagem) return;
  const escada = document.getElementById('montEscada');
  if (!escada) return;

  document.getElementById('montTitulo').textContent =
    `Escala Maior de ${notaNaPosicao(montagem.iTonica).nome}`;
  const q = (id) => { const el = document.getElementById(id); if (el) el.textContent = playerInventory[id === 'qtdTom' ? 'tom' : 'semitom'] || 0; };
  q('qtdTom'); q('qtdSemitom');

  // 13 casas: uma oitava inteira, do Dó ao Dó
  const pisadas = new Set();
  let p = montagem.iTonica; pisadas.add(p);
  montagem.passos.forEach(t => { p += (t === 'T' ? 2 : 1); pisadas.add(p); });

  escada.innerHTML = '<i class="mont-trilha"></i>';
  for (let i = montagem.iTonica; i <= montagem.iTonica + 12; i++) {
    const nota = notaNaPosicao(i);
    const c = document.createElement('div');
    c.className = 'casa' + (nota.natural ? '' : ' preta')
                + (pisadas.has(i) ? ' pisada' : '')
                + (i === montagem.posicao ? ' atual' : '')
                + (pisadas.has(i) && !temNota(nota.id) ? ' faltando' : '');
    c.textContent = nota.nome;
    c.title = nota.nome + (temNota(nota.id) ? '' : ' — ainda não condensada');
    escada.appendChild(c);
  }
  const trilha = escada.querySelector('.mont-trilha');
  if (trilha) {
    const andado = (montagem.posicao - montagem.iTonica) / 12;
    trilha.style.width = `calc(${andado * 100}% )`;
  }

  // Os graus da escala, com o intervalo desenhado ENTRE eles — que é onde ele mora.
  const graus = document.getElementById('montGraus');
  if (graus) {
    const ROMANOS = ['I','II','III','IV','V','VI','VII','VIII'];
    graus.innerHTML = '';
    let p = montagem.iTonica;
    for (let i = 0; i < 8; i++) {
      if (i > 0) {
        const t = FORMULA_MAIOR[i - 1];
        const feito = i - 1 < montagem.passos.length;
        const agora = i - 1 === montagem.passos.length;
        const iv = document.createElement('div');
        iv.className = 'intervalo' + (feito ? ' feito' : agora ? ' agora' : '');
        iv.innerHTML = `<i></i><span>${(feito || (agora && montagem.guiado)) ? t : '·'}</span><i></i>`;
        graus.appendChild(iv);
        if (feito) p += (t === 'T' ? 2 : 1);
      }
      const alcancado = i <= montagem.passos.length;
      const nota = alcancado ? notaNaPosicao(p) : null;
      const g = document.createElement('div');
      const falta = nota && !temNota(nota.id);
      g.className = 'grau' + (alcancado ? ' feito' : '')
                  + (i === montagem.passos.length ? ' atual' : '')
                  + (falta ? ' falta' : '');
      g.innerHTML = `<span class="grau-num">${ROMANOS[i]}</span>` +
                    `<span class="grau-nota">${nota ? nota.nome : '—'}</span>`;
      if (falta) g.title = `${nota.nome} ainda não foi condensada`;
      graus.appendChild(g);
    }
  }

  // Guiado só na primeira escala: acende a peça certa e diz o passo.
  const esperado = FORMULA_MAIOR[montagem.passos.length];
  const bTom = document.getElementById('pecaTom');
  const bSem = document.getElementById('pecaSemitom');
  [bTom, bSem].forEach(b => b?.classList.remove('sugerida'));
  if (bTom) bTom.disabled = (playerInventory.tom || 0) <= 0;
  if (bSem) bSem.disabled = (playerInventory.semitom || 0) <= 0;
  if (montagem.guiado && esperado) {
    (esperado === 'T' ? bTom : bSem)?.classList.add('sugerida');
    if (!montagem.passos.length) falaDoAltar(`COMECE NO ${notaNaPosicao(montagem.iTonica).nome}. AGORA UM ${NOMES_PASSO[esperado]}.`);
    else falaDoAltar(`AGORA UM ${NOMES_PASSO[esperado]}.`);
  } else if (esperado && !montagem.passos.length) {
    falaDoAltar('O caminho é seu. Lembre da fórmula.');
  }
}

function falaDoAltar(txt, tipo = '') {
  const el = document.getElementById('montFala');
  if (!el) return;
  el.className = 'mont-fala' + (tipo ? ' ' + tipo : '');
  el.textContent = txt;
}

// Duas notas erradas soando juntas: é assim que se ensina o que é dissonância.
function tocarDissonancia(idBase, semitons) {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;
  const f = FREQ_BASE[idBase] || 330;
  const f2 = f * Math.pow(2, semitons / 12);
  try {
    const t0 = audioCtx.currentTime;
    [f, f2 * 1.06].forEach(freq => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 0.75);
    });
  } catch (e) {}
}

// ── Sorteio ──────────────────────────────────────────────────────────────────────
// O vídeo é o mesmo sempre; o prêmio é composto por cima no instante do estouro.
// Por isso o contrato com a animação é o segundo 5,0 — é lá que a luz abre o centro.
// Tempos medidos no próprio vídeo: o brilho sobe a partir de ~5,0s, chega ao pico em
// ~5,8s e sustenta até ~6,4s. Revelar em 5,4s faz o item terminar de nascer junto com
// o auge da luz.
const SORTEIO = { custoClaves: 5, tEspera: 1.4, tRevelacao: 5.4, tFim: 8.0 };
let sorteioForcado = null;      // uma cena pode ditar o resultado (Cena 12 dá nada)

function abrirSorteio(forcado) {
  const o = document.getElementById('sorteioOverlay');
  if (!o) return;
  sorteioForcado = forcado || null;
  o.classList.remove('hidden');
  ajustarCaixaDoSorteio();
  requestAnimationFrame(ajustarCaixaDoSorteio);
  const premio = document.getElementById('sorteioPremio');
  premio.className = 'sorteio-premio'; premio.innerHTML = '';
  const btn = document.getElementById('sorteioBtn');
  btn.disabled = claveCount < SORTEIO.custoClaves && !sorteioForcado;
  btn.textContent = '✦ TENTAR A SORTE';
  document.getElementById('sorteioCusto').textContent = `𝄞 ${SORTEIO.custoClaves} claves  ·  você tem ${claveCount}`;
  document.getElementById('sorteioSub').textContent = 'Os acordes se personificam aqui.';

  const v = document.getElementById('sorteioVideo');
  if (v) {
    v.currentTime = 0;
    v.loop = true;
    v.play().catch(() => {});
    // laço curto no trecho de espera enquanto o jogador decide
    v.ontimeupdate = () => { if (!sorteioRodando && v.currentTime > SORTEIO.tEspera) v.currentTime = 0; };
  }
}

let sorteioRodando = false;

function rodarSorteio() {
  if (sorteioRodando) return;
  if (!sorteioForcado) {
    if (claveCount < SORTEIO.custoClaves) { showToast('𝄞 Claves insuficientes.'); return; }
    claveCount -= SORTEIO.custoClaves;
    savePlayerData();
  }
  sorteioRodando = true;
  const btn = document.getElementById('sorteioBtn');
  btn.disabled = true; btn.textContent = '…';

  const resultado = sorteioForcado === 'nada' ? null : sortearPremio();
  const v = document.getElementById('sorteioVideo');
  let revelou = false;
  const revelar = () => { if (!revelou) { revelou = true; revelarPremio(resultado); } };

  if (v && v.readyState >= 2) {
    v.loop = false;
    v.currentTime = SORTEIO.tEspera;
    // Ancorado no relógio do vídeo, não num temporizador: se o quadro atrasar por
    // carregamento, a revelação atrasa junto e continua casada com a luz.
    v.ontimeupdate = () => { if (v.currentTime >= SORTEIO.tRevelacao) revelar(); };
    v.onended = revelar;
    v.play().catch(() => {});
    // rede de segurança, caso o vídeo trave
    setTimeout(revelar, (SORTEIO.tRevelacao - SORTEIO.tEspera) * 1000 + 2500);
  } else {
    setTimeout(revelar, 1200);        // sem vídeo, a cerimônia acontece mesmo assim
  }
}

function sortearPremio() {
  // Por enquanto sorteia entre os sete graus do campo harmônico.
  const grau = 1 + Math.floor(Math.random() * 7);
  return { tipo: 'acorde', grau, nome: NOMES_DE_ACORDE[grau - 1] };
}
const NOMES_DE_ACORDE = ['Tônica','Supertônica','Mediante','Subdominante','Dominante','Relativa Menor','Sensível'];

function revelarPremio(resultado) {
  const premio = document.getElementById('sorteioPremio');
  if (!premio) return;
  premio.innerHTML = '';

  if (!resultado) {
    premio.className = 'sorteio-premio vazio revelado';
    premio.innerHTML = '<div class="premio-tipo">o lago devolveu</div>' +
                       '<div class="premio-nome">NADA</div>';
    playForgeHit();
  } else {
    premio.className = 'sorteio-premio revelado';
    const spr = magiaSprites['acorde_' + resultado.grau];
    const cv = spr ? miniCanvas(spr, 140) : null;
    if (cv) premio.appendChild(cv);
    const t = document.createElement('div');
    t.className = 'premio-tipo'; t.textContent = 'acorde';
    const n = document.createElement('div');
    n.className = 'premio-nome'; n.textContent = resultado.nome;
    premio.appendChild(t); premio.appendChild(n);
    playForgeDone();
    acordesObtidos[resultado.grau] = (acordesObtidos[resultado.grau] || 0) + 1;
    savePlayerData();
  }

  const v = document.getElementById('sorteioVideo');
  if (v) v.ontimeupdate = null;
  setTimeout(() => {
    sorteioRodando = false;
    const btn = document.getElementById('sorteioBtn');
    if (btn && !sorteioForcado) {
      btn.disabled = claveCount < SORTEIO.custoClaves;
      btn.textContent = '✦ TENTAR DE NOVO';
    }
    document.getElementById('sorteioCusto').textContent =
      `𝄞 ${SORTEIO.custoClaves} claves  ·  você tem ${claveCount}`;
  }, 2200);
}

let acordesObtidos = {};

function fecharSorteio() {
  const o = document.getElementById('sorteioOverlay');
  const v = document.getElementById('sorteioVideo');
  if (v) { v.pause(); v.ontimeupdate = null; }
  o?.classList.add('hidden');
  sorteioRodando = false; sorteioForcado = null;
}

function abrirForjadorDeEscalas() {
  const o = document.getElementById('altarOverlay');
  if (!o) { showToast('🔒 O Altar ainda dorme.'); return; }
  o.classList.remove('hidden');
  renderAltar();
}

function renderAltar() {
  const área = document.getElementById('altarNotasPauta');
  if (!área) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('altarFrag', fragmentosDisponiveis());
  set('altarClaves', claveCount);

  const dica = document.getElementById('altarHint');
  if (dica) {
    const quantas = Object.values(notasPossuidas).filter(v => v > 0).length;
    const naturais = CROMATICA.filter(n => n.natural && temNota(n.id)).length;
    dica.textContent = quantas === 0
      ? 'Toque numa nota para condensá-la. Quanto mais alta na pauta, mais aguda.'
      : naturais >= 7
        ? 'As sete naturais estão completas — a escala de Dó pode ser montada.'
        : `${quantas} de 12 condensadas · ${naturais} das 7 naturais da escala de Dó.`;
  }

  área.innerHTML = '';

  // A pauta ocupa a faixa central; cada meio-espaço vale metade da distância entre
  // linhas. Notas sobem da esquerda para a direita, na ordem da cromática.
  const alturaPauta = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches ? 68 : 96;
  const passo = alturaPauta / 8;          // 4 espaços entre 5 linhas → 8 meios-espaços
  const margemEsq = 13, margemDir = 3;

  CROMATICA.forEach((nota, i) => {
    const c = custoDaNota(nota);
    const pode = podePagarNota(nota);
    const el = document.createElement('div');
    el.className = 'nota' + (nota.natural ? '' : ' sustenida')
                 + (pode ? ' pode' : ' travada') + (temNota(nota.id) ? ' tem' : '');
    el.title = `${nota.nome} — ${c.fragmentos} fragmentos + ${c.claves} clave${c.claves > 1 ? 's' : ''}`;

    el.style.left = `${margemEsq + (i / (CROMATICA.length - 1)) * (100 - margemEsq - margemDir)}%`;
    // grau 0 é a linha de baixo, que fica na base da pauta centralizada
    el.style.top = `calc(50% + ${alturaPauta / 2 - GRAU_NA_PAUTA[nota.id] * passo}px)`;

    const cabeca = document.createElement('div');
    cabeca.className = 'nota-cabeca';
    if (GRAU_NA_PAUTA[nota.id] < -1) {
      const sup = document.createElement('i');
      sup.className = 'nota-suplementar';
      cabeca.appendChild(sup);
    }
    if (!nota.natural) {
      const ac = document.createElement('span');
      ac.className = 'nota-acidente'; ac.textContent = '♯';
      cabeca.appendChild(ac);
    }
    const spr = magiaSprites['nota_' + nota.id];
    if (spr) {
      const h = 34, w = Math.round(h * (spr.sw / spr.sh));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const cx = cv.getContext('2d');
      cx.imageSmoothingEnabled = false;
      cx.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, 0, 0, w, h);
      cabeca.appendChild(cv);
    } else cabeca.textContent = '♪';
    el.appendChild(cabeca);

    const nome = document.createElement('div');
    nome.className = 'nota-nome';
    nome.textContent = temNota(nota.id) && notasPossuidas[nota.id] > 1
      ? `${nota.nome}×${notasPossuidas[nota.id]}` : nota.nome;
    el.appendChild(nome);

    const custo = document.createElement('div');
    custo.className = 'nota-custo';
    custo.textContent = `✦${c.fragmentos}·𝄞${c.claves}`;
    el.appendChild(custo);

    if (pode) el.addEventListener('click', () => condensarNota(nota));
    else if (temNota(nota.id)) el.addEventListener('click', () => tocarNota(nota.id, 1.2));

    área.appendChild(el);
  });
}



function atCounter() {
  const def = interiorDef();
  if (!isPlayMode || !def || playerLocked) return null;
  const c = def.counter;
  return Math.hypot(player.x - c.x, player.y - c.y) < c.r ? def.counterAction : null;
}

// ============================================================
// DOOR MARKERS
// A painted door is invisible in play mode, so an interior reads as flat scenery.
// Cache the centre of each painted blob once per map and mark it with a soft pulse.
// ============================================================
const doorMarkers = {}; // mapKey -> [{x,y}]
function getDoorMarkers(key) {
  if (doorMarkers[key]) return doorMarkers[key];
  const found = [];
  try {
    const d = getLayers(key).doorCtx.getImageData(0,0,SCREEN_W,SCREEN_H).data;
    const step = 6, seen = [];
    for (let y = 0; y < SCREEN_H; y += step) for (let x = 0; x < SCREEN_W; x += step) {
      const o = (y*SCREEN_W + x)*4;
      if (!(d[o]>120 && d[o+2]>180 && d[o+3]>50)) continue;
      // Group into blobs so one painted door yields one marker.
      const near = seen.find(s => Math.hypot(s.x-x, s.y-y) < 70);
      if (near) { near.sx+=x; near.sy+=y; near.n++; }
      else seen.push({ x, y, sx:x, sy:y, n:1 });
    }
    seen.forEach(s => found.push({ x: s.sx/s.n, y: s.sy/s.n }));
  } catch(e) {}
  doorMarkers[key] = found;
  return found;
}
function invalidateDoorMarkers(key) { delete doorMarkers[key]; }

function renderDoorMarkers(now) {
  if (currentScene !== 'world') return;
  const list = getDoorMarkers(currentKey);
  if (!list.length) return;
  const pulse = (Math.sin(now * 0.0026) + 1) / 2; // 0..1
  list.forEach(m => {
    const near = Math.hypot(player.x - m.x, player.y - m.y) < 110;
    const a = (near ? 0.55 : 0.28) + pulse * 0.25;
    ctx.save();
    // Soft glow on the threshold
    const g = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, 26 + pulse * 5);
    g.addColorStop(0, `rgba(253,224,71,${a * 0.55})`);
    g.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(m.x, m.y, 30, 0, Math.PI*2); ctx.fill();
    // Little hanging sign above the door
    const sy = m.y - 42 - pulse * 3;
    ctx.globalAlpha = near ? 1 : 0.75;
    ctx.fillStyle = 'rgba(28,20,10,0.88)';
    ctx.strokeStyle = `rgba(251,191,36,${0.5 + pulse*0.4})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(m.x-13, sy-11, 26, 22, 5); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m.x, sy+11); ctx.lineTo(m.x, sy+17); ctx.stroke();
    ctx.fillStyle = '#fde68a'; ctx.font = '13px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🚪', m.x, sy+1);
    ctx.restore();
  });
}

// Is the player standing on a painted door pixel?
function onDoor() {
  if(!isPlayMode||currentScene!=='world'||playerLocked)return false;
  try{
    const p=getLayers(currentKey).doorCtx.getImageData(Math.floor(player.x),Math.floor(player.y),1,1).data;
    return p[0]>120&&p[2]>180&&p[3]>50;
  }catch(e){return false;}
}

// What the action button does right now: talk beats enter when both are available.
// Nearest world element of a given type within its own trigger radius.
function elementTarget(types) {
  if(!isPlayMode||playerLocked||currentScene!=='world')return null;
  let best=null,bestD=Infinity;
  for(const npc of npcData){
    if(npc.mapKey!==currentKey||!types.includes(npc.type))continue;
    const d=Math.hypot(player.x-npc.x, player.y-npc.y);
    if(d<=(npc.triggerRadius||70)&&d<bestD){best=npc;bestD=d;}
  }
  return best;
}
function signpostTarget() { return elementTarget(['signpost']); }
// Porta com destino é entrada de interior; sem destino, segue sendo só marcador de cena.
function portaTarget() {
  if (currentScene !== 'world') return null;
  const p = elementTarget(['porta']);
  if (!p || !p.interior) return null;
  // Destino pode ser um ambiente fechado OU um cenário do mundo — assim uma porta já
  // posicionada continua valendo mesmo depois de o destino virar mapa de verdade.
  return (INTERIORS[p.interior] || bgSources[p.interior] || videoSources[p.interior]) ? p : null;
}
// Só vale martelar onde há trabalho: o ponto precisa de uma missão ativa pedindo isso.
function lagoTarget() { return currentScene === 'world' ? elementTarget(['lago_sorteio']) : null; }
function marteladaTarget() {
  if (!activeQuests.some(q => q.objectives.some(o => o.type === 'martelar' && !o.completed))) return null;
  return elementTarget(['ponto_martelada']);
}
function spotTarget()     { return elementTarget(['spot_wood','spot_stone']); }
function forgeDoorTarget(){ return currentScene==='world' ? elementTarget(['forge_entrance']) : null; }

function actionAvailable() {
  if(shopOpen||inventoryOpen||charOpen)return null;
  if(capturaAtiva)return null;        // ritual em andamento: nada a fazer, só assistir
  if(ecoProntoPerto())return 'ressoar'; // Eco aberto ganha do ataque: bater nele não adianta
  if(attackTarget())return 'attack'; // a monster in reach beats everything else
  const counter = atCounter();          // 'shop' inside the skin store, 'forge' in the smithy
  if(counter)return counter;
  if(naSaidaDoInterior())return 'sair';
  // Martelar vem antes de falar: durante a obra o ferreiro está em cima do ponto de
  // trabalho, e o botão ficava preso no diálogo dele em vez de bater na ponte.
  if(lagoTarget())return 'sortear';
  if(portaTarget())return 'entrarPorta';
  if(marteladaTarget())return 'martelar';
  if(talkTarget())return 'talk';
  // Signposts and gathering spots have no dialogue, so they'd never light the button
  // through talkTarget() — they need their own entry.
  if(spotTarget())return 'gather';
  if(signpostTarget())return 'travel';
  if(forgeDoorTarget())return 'enterForge';
  if(onDoor())return 'enter';
  return null;
}

let playerInventory = {
  wood: 0,
  stone: 0,
  coins: 0,
  claves: 0,
  potions: 0,
  pickaxe: 0
};

// Uma placa colada na borda punha o jogador dentro da faixa de travessia do mapa de
// destino, que o mandava de volta no mesmo instante — parecia que a placa não
// funcionava. A chegada agora é sempre empurrada para fora da faixa, posta em chão
// andável, e a travessia por borda fica em carência até ele sair da beirada.
function pousoSeguro(destKey, x, y) {
  const folga = EDGE_BAND + ARRIVAL_INSET;
  const px = Math.max(folga, Math.min(SCREEN_W - folga, x));
  const py = Math.max(folga, Math.min(SCREEN_H - folga, y));
  const anterior = currentKey;
  currentKey = destKey;
  try { return pontoAndavelPerto(px, py); }
  finally { currentKey = anterior; }
}

function changeMapWithFade(targetMapKey, targetX = 512, targetY = 300) {
  const overlay = document.getElementById('mapFadeOverlay');
  const pouso = pousoSeguro(targetMapKey, targetX, targetY);
  targetX = pouso.x; targetY = pouso.y;
  lastTransTime = performance.now();
  bordaTravada = true;
  if (!overlay) {
    currentKey = targetMapKey;
    if (activeMapSelect) activeMapSelect.value = targetMapKey;
    player.x = targetX; player.y = targetY;
    updateMapStatus();
    refreshNPCHierarchy();
    talvezIniciarCenaDoMapa(targetMapKey);
    return;
  }

  overlay.classList.remove('hidden');
  overlay.classList.add('fading-out');
  setTimeout(() => {
    currentKey = targetMapKey;
    if (activeMapSelect) activeMapSelect.value = targetMapKey;
    player.x = Math.round(targetX);
    player.y = Math.round(targetY);
    lastTransTime = performance.now();
    bordaTravada = true;
    updateMapStatus();
    refreshNPCHierarchy();
    talvezIniciarCenaDoMapa(targetMapKey);

    setTimeout(() => {
      overlay.classList.remove('fading-out');
      overlay.classList.add('hidden');
      const mapName = activeMapSelect?.options[activeMapSelect.selectedIndex]?.text || targetMapKey;
      showToast(`✨ Entrou em: ${mapName}`);
    }, 150);
  }, 350);
}

// Manual talk always replays the script, ignoring `triggered` — that flag only gates
// the automatic proximity trigger, so a finished conversation stays reviewable.
function tryTalk() {
  const act=actionAvailable();
  if(act==='ressoar'){ ressoar(); return; }
  if(act==='attack'){ doAttack(); return; }
  else if(act==='shop'){ openShop(); return; }
  else if(act==='forge'){ openForgeMenu(); return; }
  else if(act==='sair'){ leaveInterior(); return; }
  else if(act==='martelar'){ darMartelada(); return; }
  else if(act==='entrarPorta'){
    const p = portaTarget(), destino = p.interior;
    if (INTERIORS[destino]) enterInterior(destino);
    else {
      const sp = spawns[destino] || { x: 512, y: 420 };
      changeMapWithFade(destino, sp.x, sp.y);
    }
    return;
  }
  else if(act==='forjarEscala'){ abrirForjadorDeEscalas(); return; }
  else if(act==='sortear'){ abrirSorteio(); return; }
  
  // In play mode the map that matters is currentKey. Reading the editor's dropdown here
  // meant that after travelling — when the two drift apart — interactions were looked up
  // on the wrong map and simply did nothing.
  const activeMap = isPlayMode ? currentKey : (activeMapSelect?.value || currentKey);
  for(const npc of npcData){
    if(npc.mapKey!==activeMap)continue;
    const dx=player.x-npc.x, dy=player.y-npc.y;
    const dist=Math.hypot(dx,dy);
    const radius=npc.triggerRadius||70;
    if(dist<=radius){
      if(npc.type==='forge_entrance'){ enterInterior('ferraria'); return; }
      if(npc.type==='signpost'){
        if(!npc.targetMapKey || !cenarioExiste(npc.targetMapKey)){
          showToast('🪧 Placa sem destino — use 🔗 Reconfigurar Vinculação no Inspetor.');
          return;
        }
        let destX = Number.isFinite(npc.targetX) ? npc.targetX : 512;
        let destY = Number.isFinite(npc.targetY) ? npc.targetY : 300;

        // Dynamic signpost pair synchronization
        const pairedSignpost = npcData.find(other =>
          other !== npc &&
          other.type === 'signpost' &&
          other.mapKey === npc.targetMapKey &&
          (other.targetMapKey === npc.mapKey || (other.id && npc.id && other.id.split('_')[1] === npc.id.split('_')[1]))
        );
        if (pairedSignpost) {
          destX = Math.round(pairedSignpost.x);
          destY = Math.round(pairedSignpost.y);
          npc.targetX = destX;
          npc.targetY = destY;
        }

        changeMapWithFade(npc.targetMapKey, destX, destY);
        return;
      }
      if(npc.type==='spot_wood'){
        const now = performance.now();
        if(npc.depletedUntil && now < npc.depletedUntil){
          const remain = Math.ceil((npc.depletedUntil - now) / 1000);
          showToast(`⏳ Spot em regeneração (${remain}s)...`);
          addFloater(player.x, player.y - 40, `⏳ ${remain}s`, '#94a3b8');
          return;
        }
        // Ferramenta bem forjada arranca o recurso em menos golpes.
        const maxHits = Math.max(1, Math.round((4 - Math.floor((level - 1) / 2)) * (1 - bonusDeColeta())));
        npc.hits = (npc.hits || 0) + 1;
        playerGatherUntil = now + 450;
        npc.shakeUntil = now + 350;

        if (npc.hits < maxHits) {
          showToast(`🪵 Golpeando Tronco (${npc.hits}/${maxHits})...`);
          addFloater(npc.x, npc.y - 30, `💥 ${npc.hits}/${maxHits}`, '#fbbf24');
        } else {
          npc.hits = 0;
          npc.depletedUntil = now + 7000;
          playerInventory.wood = (playerInventory.wood || 0) + 1;
          progressoDeMissao('coletar', 'wood');
          addFloater(player.x, player.y - 45, '🎉 +1 Madeira Rústica 🪵', '#fbbf24');
          showToast('🪵 +1 Madeira Rústica coletada!');
          updateInventorySlotsUI();
          gainXp(15);
        }
        return;
      }
      if(npc.type==='spot_stone'){
        const now = performance.now();
        if(npc.depletedUntil && now < npc.depletedUntil){
          const remain = Math.ceil((npc.depletedUntil - now) / 1000);
          showToast(`⏳ Spot em regeneração (${remain}s)...`);
          addFloater(player.x, player.y - 40, `⏳ ${remain}s`, '#94a3b8');
          return;
        }
        // Ferramenta bem forjada arranca o recurso em menos golpes.
        const maxHits = Math.max(1, Math.round((4 - Math.floor((level - 1) / 2)) * (1 - bonusDeColeta())));
        npc.hits = (npc.hits || 0) + 1;
        playerGatherUntil = now + 450;
        npc.shakeUntil = now + 350;

        if (npc.hits < maxHits) {
          showToast(`🪨 Golpeando Minério (${npc.hits}/${maxHits})...`);
          addFloater(npc.x, npc.y - 30, `💥 ${npc.hits}/${maxHits}`, '#38bdf8');
        } else {
          npc.hits = 0;
          npc.depletedUntil = now + 7000;
          playerInventory.stone = (playerInventory.stone || 0) + 1;
          progressoDeMissao('coletar', 'stone');
          addFloater(player.x, player.y - 45, '🎉 +1 Minério de Pedra 🪨', '#38bdf8');
          showToast('🪨 +1 Minério de Pedra coletado!');
          updateInventorySlotsUI();
          gainXp(15);
        }
        return;
      }
    }
  }

  if(act==='talk'){
    npcTriggerDebounce=performance.now();
    startDialogue(talkTarget());
  } else if(act==='enter'){
    lastDoorTime=0; checkDoors(); // let the door logic do the transition
  }
}

let npcTriggerDebounce=0;
// Conversar é sempre uma decisão do jogador: chegar perto acende o botão, e só o
// botão abre o diálogo. Disparo por proximidade fazia o NPC monopolizar a cena assim
// que o mapa carregava — o Sr. Antony despejava a quest inteira na entrada da praça.
function checkNPCProx() { /* sem diálogo automático; ver actionAvailable()/tryTalk() */ }

// ============================================================
// WIND LEAVES
// ============================================================
const leaves=Array.from({length:20},()=>({x:Math.random()*SCREEN_W,y:Math.random()*SCREEN_H,sz:Math.random()*3+2,angle:Math.random()*Math.PI*2,rot:(Math.random()-0.5)*0.07,sx:Math.random()*1.3+0.8,sy:Math.random()*0.5+0.2,col:Math.random()>0.5?'#4ade80':'#a3e635'}));
function updateLeaves(){leaves.forEach(l=>{l.x+=l.sx;l.y+=l.sy+Math.sin(l.angle)*0.3;l.angle+=l.rot;if(l.x>SCREEN_W+10)l.x=-10;if(l.y>SCREEN_H+10)l.y=-10;});}
function renderLeaves(){ctx.save();leaves.forEach(l=>{ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.angle);ctx.fillStyle=l.col;ctx.globalAlpha=0.65;ctx.beginPath();ctx.ellipse(0,0,l.sz,l.sz/2,0,0,Math.PI*2);ctx.fill();ctx.restore();});ctx.restore();}

// Dust
const dust=[];
function spawnDust(x,y){dust.push({x:x+(Math.random()*10-5),y:y+(Math.random()*4-2),r:Math.random()*2.5+1,a:0.5,vx:(Math.random()-0.5)*0.6,vy:(Math.random()-0.5)*0.3-0.1});}
function updateDust(){for(let i=dust.length-1;i>=0;i--){const p=dust[i];p.x+=p.vx;p.y+=p.vy;p.a-=0.04;if(p.a<=0)dust.splice(i,1);}}
function renderDust(){ctx.save();dust.forEach(p=>{ctx.globalAlpha=p.a;ctx.fillStyle='#cbd5e1';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.restore();}

// ============================================================
// PLAYER RENDER
// ============================================================
// Equipped cosmetics ride on top of the player sprite. Slots anchor to fixed points on
// the body, so a new PNG only has to be drawn to fill its box — no code change.
// ── Outfit recolouring ──
// The player's tunic is the only strongly blue region of the sheet, so a hue test
// isolates it without a hand-painted mask. Swapping hue+saturation while keeping the
// original lightness preserves all the pixel shading.
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
}
function rgbToHsl(r, g, b) {
  r/=255; g/=255; b/=255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx+mn)/2;
  if (mx === mn) return { h:0, s:0, l };
  const dd = mx - mn;
  const s = l > 0.5 ? dd/(2-mx-mn) : dd/(mx+mn);
  let h;
  if (mx === r) h = ((g-b)/dd + (g < b ? 6 : 0));
  else if (mx === g) h = (b-r)/dd + 2;
  else h = (r-g)/dd + 4;
  return { h: h/6, s, l };
}
function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l*255); return { r:v, g:v, b:v }; }
  const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l - q;
  const f = t => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q-p)*6*t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q-p)*(2/3 - t)*6;
    return p;
  };
  return { r: Math.round(f(h+1/3)*255), g: Math.round(f(h)*255), b: Math.round(f(h-1/3)*255) };
}

const outfitSprites = {}; // tint -> recoloured copy of processedSprite
function getOutfitSprite(tint) {
  if (!processedSprite) return null;
  // A tinta é por herói: trocar de personagem tem que invalidar o recolorido anterior.
  const chave = `${selectedHeroId}|${tint}`;
  if (outfitSprites[chave]) return outfitSprites[chave];
  const c = document.createElement('canvas');
  c.width = processedSprite.width; c.height = processedSprite.height;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(processedSprite, 0, 0);
  const id = cx.getImageData(0, 0, c.width, c.height), d = id.data;
  const t = hexToRgb(tint), th = rgbToHsl(t.r, t.g, t.b);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i+3] < 8) continue;
    const r = d[i], g = d[i+1], b = d[i+2];
    if (!(b > r + 25 && b > 70)) continue; // not tunic blue — leave skin, hair, leather
    const out = hslToRgb(th.h, th.s, rgbToHsl(r, g, b).l);
    d[i] = out.r; d[i+1] = out.g; d[i+2] = out.b;
  }
  cx.putImageData(id, 0, 0);
  outfitSprites[chave] = c;
  return c;
}
function activeSprite() {
  // Use the selected hero's processed sprite if loaded and valid
  const heroSpr = (typeof processedHeroSprites !== 'undefined' && processedHeroSprites[selectedHeroId] && processedHeroSprites[selectedHeroId].width > 10)
    ? processedHeroSprites[selectedHeroId]
    : processedSprite;
  const it = equipped.outfit && itemById(equipped.outfit);
  return (it && it.tint && getOutfitSprite(it.tint)) || heroSpr || processedSprite;
}

function drawSkin(spr, w, top) {
  const h = w * (spr.sh / spr.sw);
  ctx.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, player.x - w/2, top, w, h);
  return h;
}
// The character only fills the middle ~54% of its 256px frame, so cosmetics are sized
// against the visible body, not the drawn box. `scale` and `offsetY` in skins.json
// override these defaults per item without touching code.
function renderWings(pW, pH) {
  const id = equipped.wings, spr = id && skinImages[id];
  if (!spr) return;
  const it = itemById(id) || {};
  const w = pW * (it.scale ?? 1.2);
  const h = w * (spr.sh / spr.sw);
  // Centred on the torso, which sits around 55% of the way up the body.
  drawSkin(spr, w, player.y - pH * 0.55 - h / 2 + (it.offsetY ?? 0));
}
function renderHat(pW, pH) {
  const id = equipped.hat, spr = id && skinImages[id];
  if (!spr) return;
  const it = itemById(id) || {};
  const w = pW * (it.scale ?? 0.55);
  const h = w * (spr.sh / spr.sw);
  // Brim overlaps the top of the head rather than floating above it.
  drawSkin(spr, w, player.y - pH * 0.64 - h + (it.offsetY ?? 0));
}

// Ferramenta equipada na mão. Fica atrás do corpo quando o personagem anda para
// cima (a mão está do outro lado), e acompanha o balanço da caminhada e dos golpes.
const CATEGORIA_POR_SLOT = { hammer: 'hammers', axe: 'axes', pickaxe: 'pickaxes', ressonador: 'ressonadores' };
// Mostra a ferramenta EM USO, não a primeira que estiver num slot. Varrer a lista em
// ordem fixa deixava o martelo na mão para sempre assim que ele fosse forjado, mesmo
// com machado e diapasão equipados.
function ferramentaEmMaos() {
  const slot = equipped.activeTool;
  if (!slot || !['hammer', 'axe', 'pickaxe'].includes(slot)) return null;
  const id = equipped[slot];
  if (!id) return null;
  const def = CRAFTABLE_TOOLS.find(t => t.id === id);
  return (def && toolSprites[`${def.category}_${def.tier}`]) ? def : null;
}

function renderFerramenta(now, pW, pH, atras) {
  const def = ferramentaEmMaos();
  if (!def || currentScene !== 'world' || player.oculto) return;
  const paraCima = player.direction === 'up';
  if (paraCima !== atras) return;          // de costas, a ferramenta fica atrás do corpo

  const spr = toolSprites[`${def.category}_${def.tier}`];
  // A arte já vem inclinada na folha, com o cabo embaixo e a cabeça em cima. Então o
  // trabalho aqui é só posicionar o punho — girar por cima disso jogava a cabeça no
  // rosto do personagem.
  const h = pH * 0.42, w = h * (spr.sw / spr.sh);
  const lado = player.direction === 'left' ? -1 : 1;

  const fimDoGolpe = Math.max(playerGatherUntil, attackAnimUntil);
  const batendo = now < fimDoGolpe;
  const dur = now < attackAnimUntil ? 180 : 450;
  const t = batendo
    ? Math.sin(Math.min(1, 1 - (fimDoGolpe - now) / dur) * Math.PI)
    : (player.isMoving ? Math.sin(now * 0.012) * 0.18 : 0);
  const giro = batendo ? -1.35 * t : t * 0.5;

  ctx.save();
  // Punho na altura da cintura, à frente do corpo. A origem é o fim do cabo.
  ctx.translate(player.x + lado * pW * 0.32, player.y - pH * 0.18);
  ctx.scale(lado, 1);
  ctx.rotate(giro);
  const q = qualidadeDe(def.id);
  if (q.bonusColeta) { ctx.shadowColor = q.cor; ctx.shadowBlur = q.bonusColeta > 0.2 ? 10 : 5; }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, -w * 0.18, -h * 0.86, w, h);
  ctx.restore();
}

// Musical aura: a few notes orbiting the player.
function renderAura(now, pH) {
  if (equipped.aura !== 'aura_notes') return;
  ctx.save();
  ctx.font = '13px serif'; ctx.textAlign = 'center';
  for (let i = 0; i < 3; i++) {
    const a = now * 0.0016 + i * (Math.PI * 2 / 3);
    const x = player.x + Math.cos(a) * 26;
    const y = player.y - pH * 0.55 + Math.sin(a) * 10 + Math.sin(now * 0.003 + i) * 4;
    ctx.globalAlpha = 0.55 + Math.sin(a) * 0.3;
    ctx.fillText(['♪','♫','♬'][i], x, y);
  }
  ctx.restore();
}

function renderPlayer() {
  if (player.oculto) return;      // entrou pela porta na cena: sai de cena de verdade
  const pW=currentScene!=='world'?68:player.width;
  const pH=currentScene!=='world'?92:player.height;
  renderWings(pW,pH); // behind the body
  const sheet=activeSprite();
  if(sheet){
    const fw=sheet.width/4,fh=sheet.height/4;
    const row=player.direction==='up'?1:(player.direction==='left'||player.direction==='right')?2:0;
    ctx.save();
    if(player.direction==='left'){ctx.translate(player.x,player.y);ctx.scale(-1,1);ctx.drawImage(sheet,player.animFrame*fw,row*fh,fw,fh,-pW/2,-pH+4,pW,pH);}
    else ctx.drawImage(sheet,player.animFrame*fw,row*fh,fw,fh,player.x-pW/2,player.y-pH+4,pW,pH);
    ctx.restore();
  } else {ctx.fillStyle='#3b82f6';ctx.fillRect(player.x-16,player.y-32,32,48);}
}

// ============================================================
// WORLD MAP VIEW (full canvas)
// ============================================================
const GCW=185,GCH=122,GPAD=10,GOX=18,GOY=50,GCOLS=5,GROWS=4;
const SIDEX=GOX+GCOLS*(GCW+GPAD)+8, SIDEW=SCREEN_W-SIDEX-8, SIDECARDH=75;
let wvDragKey=null, wvDragMouse={x:0,y:0};

function getCell(mx,my){const col=Math.floor((mx-GOX)/(GCW+GPAD)),row=Math.floor((my-GOY)/(GCH+GPAD));if(col>=0&&col<GCOLS&&row>=0&&row<GROWS)return{col,row};return null;}
function cellRect(col,row){return{x:GOX+col*(GCW+GPAD),y:GOY+row*(GCH+GPAD),w:GCW,h:GCH};}
function keyAtCell(col,row){return worldGrid[row]?.[col]||null;}
function sideKeys(){const pl=new Set(Object.keys(gridPos).filter(k=>{const p=gridPos[k];return worldGrid[p.row]?.[p.col]===k;}));
  return chavesDeCenario().filter(k=>!pl.has(k));}
function sideKeyAt(mx,my){if(mx<SIDEX||SIDEW<=0)return null;const sk=sideKeys();for(let i=0;i<sk.length;i++){const r={x:SIDEX,y:GOY+30+i*(SIDECARDH+5),w:SIDEW,h:SIDECARDH};if(mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h)return sk[i];}return null;}

function deleteScene(mx, my) {
  const cell = getCell(mx, my);
  if (!cell) return;
  const k = keyAtCell(cell.col, cell.row);
  if (!k) return;
  delete gridPos[k];      // back to the side bank; the image and its layers are kept
  rebuildGrid(); refreshMapSelect();
  showToast(`🗑️ ${SCENE_NAMES[k]} saiu do grid (voltou ao banco)`);
  saveAllLayers(false);
}

function renderWorldMap(now) {
  ctx.fillStyle='#08111f'; ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  for(let i=0;i<30;i++){ctx.globalAlpha=(Math.sin(now*.001+i*1.3)+1)/2*.4;ctx.fillStyle='#fff';ctx.fillRect((i*97)%SCREEN_W,(i*53)%(SCREEN_H-50),1+(i%2),1+(i%2));}ctx.globalAlpha=1;
  ctx.fillStyle='#fbbf24';ctx.font='bold 11px Outfit, sans-serif';ctx.textAlign='left';
  ctx.fillText('🗺️ EDITOR DE MAPA — Arraste cenários para organizar o mundo e definir onde cada um nasce.',16,22);
  ctx.fillStyle='#475569';ctx.font='10px Outfit, sans-serif';
  ctx.fillText('🖐️ Mover  |  📍 Spawn  |  🗑️ Excluir  |  💾 Salvar — a viagem entre mapas é feita por Placas na aba Elementos',16,36);
  for(let row=0;row<GROWS;row++){for(let col=0;col<GCOLS;col++){
    const r=cellRect(col,row),key=keyAtCell(col,row),cur=key===currentKey;
    ctx.fillStyle='#131c28';ctx.strokeStyle='#2d3748';ctx.lineWidth=1;ctx.setLineDash([3,3]);
    ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.setLineDash([]);
    if(key&&key!==wvDragKey){
      const img=bgImages[key];if(img?.complete)ctx.drawImage(img,r.x,r.y,r.w,r.h);
      if(cur){ctx.strokeStyle='#38bdf8';ctx.lineWidth=3;ctx.shadowColor='#38bdf8';ctx.shadowBlur=10;ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.shadowBlur=0;}
      [['north','▲'],['south','▼'],['east','▶'],['west','◀']].forEach(([d,sym])=>{
        if(!getNeighbor(key,d))return;
        ctx.fillStyle='#22c55e';ctx.font='11px serif';ctx.textAlign='center';
        if(d==='north')ctx.fillText(sym,r.x+r.w/2,r.y+13);
        if(d==='south')ctx.fillText(sym,r.x+r.w/2,r.y+r.h-3);
        if(d==='east')ctx.fillText(sym,r.x+r.w-7,r.y+r.h/2+4);
        if(d==='west')ctx.fillText(sym,r.x+8,r.y+r.h/2+4);
      });
      const sp=spawns[key]||{x:512,y:300};
      const spx=r.x+(sp.x/SCREEN_W)*r.w,spy=r.y+(sp.y/SCREEN_H)*r.h;
      ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(spx,spy,5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#000';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(r.x,r.y+r.h-15,r.w,15);
      ctx.fillStyle='#e2e8f0';ctx.font='9px Outfit, sans-serif';ctx.textAlign='left';
      ctx.fillText(SCENE_NAMES[key]||key,r.x+3,r.y+r.h-4);
    }else if(!key){ctx.fillStyle='#2d3748';ctx.font='9px Outfit, sans-serif';ctx.textAlign='left';ctx.fillText(`(${col},${row})`,r.x+4,r.y+11);}
  }}
  // Side panel
  ctx.fillStyle='#0a1018';ctx.fillRect(SIDEX-4,GOY-4,SCREEN_W-SIDEX+4,SCREEN_H-GOY+4);
  ctx.fillStyle='#64748b';ctx.font='bold 9px Outfit, sans-serif';ctx.textAlign='left';
  ctx.fillText('BANCO',SIDEX,GOY+11);ctx.font='8px Outfit, sans-serif';ctx.fillText('fora do mapa',SIDEX,GOY+22);
  sideKeys().forEach((k,i)=>{
    const r={x:SIDEX,y:GOY+28+i*(SIDECARDH+5),w:SIDEW,h:SIDECARDH};if(r.y+r.h>SCREEN_H)return;
    const img=bgImages[k];if(img?.complete&&k!==wvDragKey)ctx.drawImage(img,r.x,r.y,r.w,r.h);
    ctx.strokeStyle='#475569';ctx.lineWidth=1;ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(r.x,r.y+r.h-13,r.w,13);
    ctx.fillStyle='#e2e8f0';ctx.font='8px Outfit, sans-serif';ctx.textAlign='left';
    ctx.fillText(SCENE_NAMES[k]||k,r.x+3,r.y+r.h-3);
  });
  if(wvDragKey){
    ctx.save();ctx.globalAlpha=0.85;
    const img=bgImages[wvDragKey];
    const gx=wvDragMouse.x-GCW/2,gy=wvDragMouse.y-GCH/2;
    if(img?.complete)ctx.drawImage(img,gx,gy,GCW,GCH);
    ctx.strokeStyle='#22c55e';ctx.lineWidth=3;ctx.shadowColor='#22c55e';ctx.shadowBlur=12;
    ctx.strokeRect(gx,gy,GCW,GCH);ctx.restore();
  }
}

// ============================================================
// SCENE EDITOR OVERLAY
// ============================================================
function renderSceneOverlay(now) {
  const mapKey = activeMapSelect?.value || currentKey;
  // Monsters, so they can be seen and dragged in the editor.
  monsters.forEach(m=>{
    if(m.mapKey!==mapKey)return;
    const spr=monsterSprites[m.type], b=monsterBounds(m);
    ctx.save();
    if(spr)ctx.drawImage(spr.canvas,spr.sx,spr.sy,spr.sw,spr.sh,b.x,b.y,b.w,b.h);
    else{ctx.fillStyle='rgba(124,58,237,0.55)';ctx.fillRect(b.x,b.y,b.w,b.h);}
    const sel=selectedMonster===m;
    ctx.strokeStyle=sel?'#ef4444':'rgba(239,68,68,0.4)';ctx.lineWidth=sel?2:1.2;
    if(sel)ctx.setLineDash([5,3]);
    ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.setLineDash([]);
    ctx.beginPath();ctx.ellipse(m.x,m.y,b.w*0.3,b.w*0.12,0,0,Math.PI*2);ctx.stroke();
    const nm=monsterDef(m).name||m.type;
    ctx.font='9px Outfit, sans-serif';ctx.textAlign='center';
    const w=ctx.measureText(nm).width+8;
    ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(m.x-w/2,b.y-14,w,12);
    ctx.fillStyle='#fca5a5';ctx.fillText(nm,m.x,b.y-5);
    ctx.restore();
  });
  npcData.forEach(npc=>{
    if(npc.mapKey!==mapKey)return;
    const drawFn=NPC_DRAW[npc.type]||DEFAULT_NPC_DRAW;
    drawFn(ctx,npc,now);
    const sel=selectedNPC===npc, b=npcBounds(npc);
    if(sel||hoveredNPC===npc){
      ctx.save();
      ctx.strokeStyle=sel?'#fbbf24':'rgba(251,191,36,0.45)';ctx.lineWidth=sel?2:1.5;
      if(sel){ctx.shadowColor='#fbbf24';ctx.shadowBlur=10;ctx.setLineDash([5,3]);}
      ctx.strokeRect(b.x,b.y,b.w,b.h);
      ctx.setLineDash([]);ctx.shadowBlur=0;
      // Ground anchor — the point the NPC actually stands on
      ctx.beginPath();ctx.ellipse(npc.x,npc.y,b.w*0.32,b.w*0.13,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    if(draggingNPC===npc){
      ctx.save();ctx.fillStyle='#fbbf24';ctx.font='11px Outfit, sans-serif';ctx.textAlign='center';
      ctx.fillText(`${npc.x}, ${npc.y}`,npc.x,npc.y+16);ctx.restore();
    }
    // Trigger radius
    ctx.save();ctx.strokeStyle='rgba(251,191,36,0.15)';ctx.setLineDash([3,4]);ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(npc.x,npc.y-20,npc.triggerRadius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
    // Name tag
    ctx.save();
    const nw=ctx.measureText(npc.name).width+10;
    ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(npc.x-nw/2,npc.y-78,nw,16);
    ctx.fillStyle='#fbbf24';ctx.font='10px Outfit, sans-serif';ctx.textAlign='center';
    ctx.fillText(npc.name,npc.x,npc.y-66);ctx.restore();
  });
  if(npcPlacingMode){
    ctx.save();ctx.strokeStyle='#22c55e';ctx.lineWidth=1.5;ctx.shadowColor='#22c55e';ctx.shadowBlur=8;
    ctx.beginPath();ctx.moveTo(mouseCanvasX-14,mouseCanvasY);ctx.lineTo(mouseCanvasX+14,mouseCanvasY);ctx.stroke();
    ctx.beginPath();ctx.moveTo(mouseCanvasX,mouseCanvasY-14);ctx.lineTo(mouseCanvasX,mouseCanvasY+14);ctx.stroke();
    ctx.beginPath();ctx.arc(mouseCanvasX,mouseCanvasY,6,0,Math.PI*2);ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle='rgba(34,197,94,0.12)';ctx.fill();
    ctx.fillStyle='#22c55e';ctx.font='10px Outfit, sans-serif';ctx.textAlign='center';
    ctx.fillText('Clique para posicionar',mouseCanvasX,mouseCanvasY-20);ctx.restore();
  }
}

// ============================================================
// COLLISION OVERLAY
// ============================================================
let isPainting=false, brushSize=40, paintPos={x:-100,y:-100}, paintSaveTimer=null;
let lastPaint=null;

// A drag only fires a handful of mousemove events, so stamping one circle per event
// leaves a dotted trail. Stamp along the whole segment since the last point instead.
function paintStroke(x,y,k){
  if(lastPaint && lastPaint.k===k){
    const dx=x-lastPaint.x, dy=y-lastPaint.y;
    const dist=Math.hypot(dx,dy);
    const step=Math.max(2,brushSize*0.25);
    const n=Math.ceil(dist/step);
    for(let i=1;i<=n;i++) paintAt(lastPaint.x+dx*(i/n), lastPaint.y+dy*(i/n), k);
  } else {
    paintAt(x,y,k);
  }
  lastPaint={x,y,k};
}
function endStroke(){ lastPaint=null; }

function paintAt(x,y,k){
  const L=getLayers(k),r=brushSize/2;
  if(collisionTool==='road'){L.roadCtx.save();L.roadCtx.globalCompositeOperation='source-over';L.roadCtx.fillStyle='#22c55e';L.roadCtx.beginPath();L.roadCtx.arc(x,y,r,0,Math.PI*2);L.roadCtx.fill();L.roadCtx.restore();}
  else if(collisionTool==='roof'){const bg=bgImages[k];if(bg?.complete){L.fgCtx.save();L.fgCtx.beginPath();L.fgCtx.arc(x,y,r,0,Math.PI*2);L.fgCtx.clip();L.fgCtx.drawImage(bg,0,0,SCREEN_W,SCREEN_H);L.fgCtx.restore();}}
  else if(collisionTool==='door'){L.doorCtx.save();L.doorCtx.globalCompositeOperation='source-over';L.doorCtx.fillStyle='#a855f7';L.doorCtx.beginPath();L.doorCtx.arc(x,y,r,0,Math.PI*2);L.doorCtx.fill();L.doorCtx.restore();}
  else if(collisionTool==='eraser'){[L.roadCtx,L.fgCtx,L.doorCtx].forEach(c=>{c.save();c.globalCompositeOperation='destination-out';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore();});}
  if(collisionTool==='door'||collisionTool==='eraser')invalidateDoorMarkers(k);
  if(collisionTool==='road'||collisionTool==='eraser')invalidateRoadPaint(k);
  if(paintSaveTimer)clearTimeout(paintSaveTimer);paintSaveTimer=setTimeout(()=>saveAllLayers(false),500);
}
// Depth pass. In a top-down scene almost everything you can't walk on is scenery you
// should be able to walk *behind*: copy those pixels into the foreground layer and they
// draw over the player. Not perfect — it also lifts low bushes — but it's a starting
// point you refine with the roof brush and the eraser instead of painting from zero.
function autoRoofFromRoad(k) {
  const L = getLayers(k), bg = bgImages[k];
  if (!bg?.complete) { showToast('Cenário ainda carregando.'); return; }
  if (!hasRoadPaint(k)) { showToast('⚠️ Pinte o caminho primeiro — o teto vem do inverso dele.'); return; }

  const road = L.roadCtx.getImageData(0,0,SCREEN_W,SCREEN_H).data;

  // Mask of everything that isn't walkable — that's the scenery.
  const mask = document.createElement('canvas');
  mask.width = SCREEN_W; mask.height = SCREEN_H;
  const mc = mask.getContext('2d');
  const id = mc.createImageData(SCREEN_W, SCREEN_H), md = id.data;
  for (let i = 0; i < road.length; i += 4) {
    const walkable = road[i+1] > 100 && road[i+3] > 50;
    md[i+3] = walkable ? 0 : 255;
  }
  mc.putImageData(id, 0, 0);

  // Cut the scenery pixels out of the background and hand them to the foreground layer.
  // Standing on the path beside a house, the player's head reaches into this region and
  // gets covered — which is the depth cue. Their feet stay on the path, always visible.
  const out = document.createElement('canvas');
  out.width = SCREEN_W; out.height = SCREEN_H;
  const oc = out.getContext('2d');
  oc.drawImage(mask, 0, 0);
  oc.globalCompositeOperation = 'source-in';
  oc.drawImage(bg, 0, 0, SCREEN_W, SCREEN_H);

  L.fgCtx.clearRect(0,0,SCREEN_W,SCREEN_H);
  L.fgCtx.drawImage(out, 0, 0);
  saveAllLayers(true);
  showToast('🏠 Teto gerado — refine com 🔵 Telhado e 🔴 Borracha');
}

function renderCollisionOverlay(k){
  const L=getLayers(k);
  ctx.save();
  // Darken the scene first: at 38% over bright forest art the green was invisible, and
  // it read as "the brush isn't working".
  ctx.fillStyle='rgba(4,8,16,0.45)'; ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  ctx.globalAlpha=0.85;
  ctx.drawImage(L.roadCanvas,0,0);
  ctx.drawImage(L.doorCanvas,0,0);
  ctx.globalAlpha=0.5;
  ctx.drawImage(L.fgCanvas,0,0); // roof layer, so you can see what's already covered
  ctx.restore();
  if(paintPos.x>0){const col=collisionTool==='road'?'#22c55e':collisionTool==='roof'?'#38bdf8':collisionTool==='door'?'#a855f7':'#ef4444';ctx.save();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.globalAlpha=0.8;ctx.beginPath();ctx.arc(paintPos.x,paintPos.y,brushSize/2,0,Math.PI*2);ctx.stroke();ctx.restore();}
}

// ============================================================
// CANVAS MOUSE EVENTS
// ============================================================
function getM(e){
  const rect=canvas.getBoundingClientRect();
  const sx=SCREEN_W/rect.width,sy=SCREEN_H/rect.height;
  const cx=e.touches?e.touches[0].clientX:e.clientX,cy=e.touches?e.touches[0].clientY:e.clientY;
  const rx = (cx-rect.left)*sx, ry = (cy-rect.top)*sy;

  if (currentKey === 'mega_world' || activeMapSelect?.value === 'mega_world') {
    return {
      x: megaCameraX + rx / megaMapZoom,
      y: megaCameraY + ry / megaMapZoom
    };
  }
  return { x: rx, y: ry };
}

function onPointerDown(m){
  // Editar andando é o jeito de enxergar escala: a árvore do lado do personagem diz na
  // hora se está grande demais. Então o clique vale nos dois modos.
  if(engineMode==='mundo'){ mundoPointerDown(m); return; }
  if (isPlayMode && capturaAtiva) { pegarVoz(m.x, m.y); return; }
  if (isPlayMode && ecoProntoPerto()) { ressoar(); return; }
  if (avancarCena()) return;      // uma cena em curso consome o toque
  // An open dialogue owns the pointer whatever the editor mode is — otherwise the
  // editor branches below return early and taps never reach the choices.
  if(dlg.state===DLG_STATE.CHOOSING){ const i=choiceAt(m.x,m.y); if(i>=0)selectChoice(i); return; }
  if(dlg.state===DLG_STATE.TYPING||dlg.state===DLG_STATE.WAITING){ advanceDlg(); return; }
  if(dlg.state===DLG_STATE.NAME_INPUT) return;

  // Editor tools stay live during play mode — painting the walkable path while the
  // character runs around is the whole point of the collision tab.
  if(engineMode==='worldmap'){
    // ── SIGNPOST WIZARD STEP 1: user clicks a map cell to select destination ──
    if(signpostWizard.step === 1){
      const cell=getCell(m.x,m.y);
      if(cell){
        const destKey=keyAtCell(cell.col,cell.row);
        if(destKey && destKey !== signpostWizard.sourceMapKey){
          escolherDestinoDaPlaca(destKey);
          return;
        } else if(destKey === signpostWizard.sourceMapKey){
          showToast('⚠️ Selecione um mapa diferente do atual!');
          return;
        }
      }
      showToast('⚠️ Clique em um mapa no grid para selecionar o destino');
      return;
    }
    if(worldMapSubTool==='drag'){const cell=getCell(m.x,m.y);if(cell){const k=keyAtCell(cell.col,cell.row);if(k){wvDragKey=k;wvDragMouse={...m};delete gridPos[k];rebuildGrid();return;}}const sk=sideKeyAt(m.x,m.y);if(sk){wvDragKey=sk;wvDragMouse={...m};delete gridPos[sk];rebuildGrid();}}
    else if(worldMapSubTool==='spawn'){const cell=getCell(m.x,m.y);if(cell){const k=keyAtCell(cell.col,cell.row);if(k){const r=cellRect(cell.col,cell.row);const nx=Math.round(((m.x-r.x)/r.w)*SCREEN_W),ny=Math.round(((m.y-r.y)/r.h)*SCREEN_H);spawns[k]={x:Math.max(30,Math.min(SCREEN_W-30,nx)),y:Math.max(30,Math.min(SCREEN_H-30,ny))};showToast(`📍 Spawn de ${SCENE_NAMES[k]} atualizado`);saveAllLayers(false);}}}
    else if(worldMapSubTool==='delete'){deleteScene(m.x,m.y);}
    return;
  }
  if(engineMode==='collision'){isPainting=true;endStroke();paintStroke(m.x,m.y,activeMapSelect?.value||currentKey);return;}
  if(engineMode==='scene'){
    if(isPlayMode){tryTalk();return;} // tapping near an NPC starts the conversation
    if(npcPlacingMode){placeNPC(m.x,m.y);return;}
    // Modo de colocar objeto: cada toque planta um. Fica ativo até você desligar,
    // porque plantar uma floresta um clique por vez é o uso real disto.
    if(propParaColocar){colocarObjeto(propParaColocar,m.x,m.y);return;}
    // Objetos vêm antes dos monstros na disputa pelo clique só quando não há monstro
    // ali: árvore é grande e cobriria bicho pequeno.
    if(!monsterAt(m.x,m.y)){
      const obj=objetoEm(m.x,m.y);
      if(obj){
        objetoSelecionado=obj; selectedMonster=null; deselectNPC();
        mostrarInspetorDeObjeto(obj);
        arrastandoObjeto=obj; dragOffX=m.x-obj.x; dragOffY=m.y-obj.y;
        return;
      }
      objetoSelecionado=null; mostrarInspetorDeObjeto(null);
    }
    // Monsters are draggable too — they sit on top, so they get first claim on a click.
    const mob=monsterAt(m.x,m.y);
    if(mob){
      selectedMonster=mob; deselectNPC(); mostrarInspetorDeMonstro(mob);
      dragMonster=mob; dragStart={x:m.x,y:m.y}; dragOffX=m.x-mob.x; dragOffY=m.y-mob.y;
      showToast(`👾 ${monsterDef(mob).name||mob.type}`);
      return;
    }
    selectedMonster=null; mostrarInspetorDeMonstro(null);
    const hit=npcAt(m.x,m.y);
    if(hit){
      selectNPC(hit);
      draggingNPC=hit;
      dragCandidate=hit;dragStart={x:m.x,y:m.y};dragOffX=m.x-hit.x;dragOffY=m.y-hit.y;
    } else deselectNPC();
  }
}

function onPointerMove(m){
  if(engineMode==='mundo'){ mundoPointerMove(m); return; }
  if(capturaAtiva&&capturaAtiva.arrastando){arrastarVoz(m.x,m.y);return;}
  if(engineMode==='worldmap'&&wvDragKey){wvDragMouse={...m};}
  if(engineMode==='scene'&&!isPlayMode&&arrastandoObjeto){
    arrastandoObjeto.x=Math.round(Math.max(0,Math.min(SCREEN_W,m.x-dragOffX)));
    arrastandoObjeto.y=Math.round(Math.max(0,Math.min(SCREEN_H,m.y-dragOffY)));
    sincronizarInspetorDeObjeto();
  }
  else if(engineMode==='scene'&&!isPlayMode&&dragMonster){
    dragMonster.x=Math.round(Math.max(0,Math.min(SCREEN_W,m.x-dragOffX)));
    dragMonster.y=Math.round(Math.max(0,Math.min(SCREEN_H,m.y-dragOffY)));
    dragMonster.homeX=dragMonster.x; dragMonster.homeY=dragMonster.y;
  }
  else if(engineMode==='scene'&&!isPlayMode){
    if(dragCandidate&&!draggingNPC&&Math.hypot(m.x-dragStart.x,m.y-dragStart.y)>DRAG_SLOP)draggingNPC=dragCandidate;
    if(draggingNPC){
      draggingNPC.x=Math.round(Math.max(0,Math.min(SCREEN_W,m.x-dragOffX)));
      draggingNPC.y=Math.round(Math.max(0,Math.min(SCREEN_H,m.y-dragOffY)));
      syncInspector(draggingNPC);
    } else hoveredNPC=npcAt(m.x,m.y);
  }
  if(engineMode==='collision'){paintPos=m;if(isPainting)paintStroke(m.x,m.y,activeMapSelect?.value||currentKey);}
  if(dlg.state===DLG_STATE.CHOOSING) dlg.hoveredChoice=choiceAt(m.x,m.y);
  // cursor
  let cur='default';
  if(npcPlacingMode||engineMode==='collision')cur='crosshair';
  else if(engineMode==='scene'&&draggingNPC)cur='grabbing';
  else if(engineMode==='scene'&&hoveredNPC)cur='grab';
  canvas.className=cur!=='default'?`cursor-${cur}`:'';
}

function onPointerUp(){
  if(engineMode==='mundo'){ mundoPointerUp(); return; }
  if(capturaAtiva&&capturaAtiva.arrastando){soltarVoz();return;}
  const m={x:mouseCanvasX,y:mouseCanvasY}; // touchend carries no coords — use the last known
  if(engineMode==='worldmap'&&wvDragKey){
    const cell=getCell(m.x,m.y);
    if(cell){const occ=keyAtCell(cell.col,cell.row);if(occ&&occ!==wvDragKey)delete gridPos[occ];gridPos[wvDragKey]={col:cell.col,row:cell.row};rebuildGrid();showToast(`✅ "${SCENE_NAMES[wvDragKey]}" → (${cell.col},${cell.row})`);}
    else showToast(`📦 "${SCENE_NAMES[wvDragKey]}" movido para o banco`);
    rebuildGrid();wvDragKey=null;saveAllLayers(false);
  }
  if(engineMode==='scene'){
    if(draggingNPC){saveNPCs();showToast(`📍 ${draggingNPC.name} → (${draggingNPC.x}, ${draggingNPC.y})`);draggingNPC=null;}
    if(arrastandoObjeto){saveObjetos();showToast(`🌲 ${propDef(arrastandoObjeto).nome||arrastandoObjeto.prop} → (${arrastandoObjeto.x}, ${arrastandoObjeto.y})`);arrastandoObjeto=null;}
    if(dragMonster){saveMonsters();showToast(`👾 ${monsterDef(dragMonster).name||dragMonster.type} → (${dragMonster.x}, ${dragMonster.y})`);dragMonster=null;}
    dragCandidate=null;
  }
  isPainting=false; endStroke();
}

// ============================================================
// STORE / INVENTORY UI
// One sheet serves both: the shop lists everything for sale, the inventory lists what
// you own. Same cards, different filter — so there's a single layout to keep working.
// ============================================================
let shopOpen = false, inventoryOpen = false, storeTab = 'all';
let storeOverlay, storeTitle, storeCoins, storeTabs, storeGrid, storeEmpty, coinCount, playerHud;
let claveCountEl, hpFill;

function openShop() { shopOpen = true; inventoryOpen = false; storeTab = 'all'; showStore('Loja de Skins'); }
function openInventory() { inventoryOpen = true; shopOpen = false; storeTab = 'all'; showStore('Inventário'); }
function closeStore() {
  shopOpen = inventoryOpen = false;
  storeOverlay?.classList.add('hidden');
  playerLocked = false;
  stick.active = false; stick.x = stick.y = 0;
}
function showStore(title) {
  if (!storeOverlay) return;
  playerLocked = true;               // no walking around behind an open sheet
  stick.active = false; stick.x = stick.y = 0;
  storeTitle.textContent = title;
  storeOverlay.classList.remove('hidden');
  renderStoreTabs(); renderStoreGrid();
}
function renderShopUI() { if (shopOpen) renderStoreGrid(); }
function renderInventoryUI() { if (inventoryOpen) renderStoreGrid(); }

function storeItems() {
  const base = inventoryOpen ? shopCatalog.items.filter(i => ownsItem(i.id)) : shopCatalog.items;
  return storeTab === 'all' ? base : base.filter(i => i.slot === storeTab);
}

function renderStoreTabs() {
  if (!storeTabs) return;
  const slots = shopCatalog.slots || {};
  const tabs = [['all', 'Tudo'], ...Object.entries(slots)];
  storeTabs.innerHTML = '';
  tabs.forEach(([id, label]) => {
    const b = document.createElement('button');
    b.className = 'store-tab' + (storeTab === id ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => { storeTab = id; renderStoreTabs(); renderStoreGrid(); });
    storeTabs.appendChild(b);
  });
}

function renderStoreGrid() {
  if (!storeGrid) return;
  if (storeCoins) storeCoins.textContent = playerCoins;
  const items = storeItems();
  storeGrid.innerHTML = '';
  storeEmpty?.classList.toggle('hidden', items.length > 0);
  if (storeEmpty) storeEmpty.textContent = inventoryOpen
    ? 'Você ainda não tem nenhum item. Visite a loja!'
    : 'Nenhum item nesta categoria.';

  items.forEach(it => {
    const owned = ownsItem(it.id), on = equipped[it.slot] === it.id;
    const card = document.createElement('div');
    card.className = 'store-card' + (on ? ' equipped' : '');

    const art = document.createElement('div');
    art.className = 'card-art';
    if (skinImages[it.id]) {
      // Draw the keyed + trimmed sprite, not the raw file — otherwise every card shows
      // the generator's white background as a box.
      const spr = skinImages[it.id];
      const cv = document.createElement('canvas');
      const s = Math.min(104 / spr.sw, 78 / spr.sh);
      cv.width = Math.max(1, Math.round(spr.sw * s));
      cv.height = Math.max(1, Math.round(spr.sh * s));
      const c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = false;
      c2.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, 0, 0, cv.width, cv.height);
      art.appendChild(cv);
    } else if (it.tint) {
      const sw = document.createElement('div');
      sw.className = 'swatch'; sw.style.background = it.tint; art.appendChild(sw);
    } else {
      const ph = document.createElement('div');
      ph.className = 'missing'; ph.textContent = 'arte pendente';
      art.appendChild(ph);
    }

    const name = document.createElement('div');
    name.className = 'card-name'; name.textContent = it.name;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const rar = document.createElement('span');
    rar.className = 'card-rarity'; rar.textContent = it.rarity || '';
    const price = document.createElement('span');
    price.className = 'card-price';
    price.textContent = owned ? '✓ seu' : `🪙 ${it.price}`;
    meta.append(rar, price);

    const btn = document.createElement('button');
    btn.className = 'card-btn' + (on ? ' on' : owned ? ' owned' : '');
    if (owned) {
      btn.textContent = on ? 'Equipado' : 'Equipar';
      btn.addEventListener('click', () => equipItem(it.id));
    } else {
      btn.textContent = 'Comprar';
      btn.disabled = playerCoins < it.price;
      btn.addEventListener('click', () => { if (buyItem(it.id)) renderStoreGrid(); });
    }

    card.append(art, name, meta, btn);
    storeGrid.appendChild(card);
  });
}

// Swap an emoji placeholder for real art the moment the file shows up in assets/ui.
// Until then the emoji stays, so the HUD is never broken by a missing asset.
function useIconArt(imgId, emojiId, src) {
  const img = document.getElementById(imgId), emoji = document.getElementById(emojiId);
  if (!img || !emoji) return;
  const probe = new Image();
  probe.onload = () => { img.src = src; img.classList.remove('hidden'); emoji.classList.add('hidden'); };
  probe.onerror = () => {};
  probe.src = src;
}
function loadUIArt() {
  // Uses clean native emojis for coins and inventory
}

// ============================================================
// CHARACTER SHEET UI
// ============================================================
let charOpen = false, charTab = 'attrs';
let charOverlay, csLevel, csName, csXpFill, csXpText, csAttrs, csSkills;
let lvlNum, xpFill, xpLabel, pointDot;

const ATTR_META = {
  ritmo:    { icon:'♪',  name:'Ritmo',    desc:'Bigorna mais lenta e zona maior · +3% velocidade de ataque' },
  afinacao: { icon:'♫',  name:'Afinação', desc:'Janela de captura maior · mais chance de Fragmento Puro' },
  folego:   { icon:'◉',  name:'Fôlego',   desc:'+6 de vida · feitiços recarregam mais rápido' },
  dinamica: { icon:'◈',  name:'Dinâmica', desc:'+3 de dano · +4% de dano nos feitiços' },
  memoria:  { icon:'▤',  name:'Memória',  desc:'notas custam menos fragmentos na síntese' },
};

function openChar() { charOpen = true; charTab = 'attrs'; playerLocked = true;
  stick.active = false; stick.x = stick.y = 0;
  charOverlay?.classList.remove('hidden'); renderCharSheet(); }
function closeChar() { charOpen = false; charOverlay?.classList.add('hidden'); playerLocked = false; }

function renderCharSheet() {
  if (!charOverlay || charOverlay.classList.contains('hidden')) return;
  const need = xpForLevel(level);
  if (csLevel) csLevel.textContent = level;
  if (csName) csName.textContent = playerName || 'Aventureiro';
  if (csXpFill) csXpFill.style.width = Math.min(100, (xp / need) * 100) + '%';
  if (csXpText) csXpText.textContent = `${xp} / ${need} XP`;

  document.querySelectorAll('[data-cstab]').forEach(b =>
    b.classList.toggle('active', b.dataset.cstab === charTab));
  csAttrs?.classList.toggle('hidden', charTab !== 'attrs');
  csSkills?.classList.toggle('hidden', charTab !== 'skills');

  if (charTab === 'attrs') renderAttrs(); else renderSkills();
}

function renderAttrs() {
  if (!csAttrs) return;
  const s = derivedStats();
  csAttrs.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'pts-banner' + (attrPoints ? '' : ' none');
  banner.textContent = attrPoints
    ? `✦ ${attrPoints} ponto${attrPoints>1?'s':''} de atributo para distribuir`
    : 'Sem pontos disponíveis — derrote monstros para subir de nível';
  csAttrs.appendChild(banner);

  for (const key of Object.keys(attrs)) {
    const meta = ATTR_META[key];
    const row = document.createElement('div');
    row.className = 'attr-row';
    row.innerHTML =
      `<div class="attr-ico">${meta.icon}</div>` +
      `<div><div class="attr-name">${meta.name}</div><div class="attr-desc">${meta.desc}</div></div>` +
      `<div class="attr-val">${attrs[key]}</div>`;
    const btn = document.createElement('button');
    btn.className = 'attr-add'; btn.textContent = '+';
    btn.disabled = attrPoints <= 0;
    btn.addEventListener('click', () => spendAttr(key));
    row.appendChild(btn);
    csAttrs.appendChild(row);
  }

  const sum = document.createElement('div');
  sum.className = 'attr-row';
  sum.style.gridTemplateColumns = '1fr';
  const b = v => `<b style="color:#f2f5f9">${v}</b>`;
  sum.innerHTML =
    `<div class="attr-desc" style="line-height:1.8">` +
    `❤️ Vida ${b(s.maxHp)} &nbsp;·&nbsp; ⚔️ Dano ${b(s.dmg)} &nbsp;·&nbsp; ` +
    `⚡ Ataque ${b('+' + s.atkSpeed + '%')} &nbsp;·&nbsp; 🪙 Síntese ${b('-' + s.desconto + '%')}<br>` +
    `🔨 Forja ${b('+' + s.forja + '%')} &nbsp;·&nbsp; 🔔 Captura ${b('+' + s.captura + '%')} &nbsp;·&nbsp; ` +
    `✦ Puro ${b('+' + s.puro + '%')} &nbsp;·&nbsp; 🎵 Síntese ${b('−' + s.desconto + '%')}<br>` +
    `✨ Feitiço ${b('+' + s.dmgMagia + '% dano')} &nbsp;·&nbsp; ⏳ Recarga ${b('−' + s.recarga + '%')}` +
    (s.crit ? ` &nbsp;·&nbsp; 💥 Crítico ${b(s.crit + '%')}` : '') +
    (s.lifesteal ? ` &nbsp;·&nbsp; 💚 Roubo ${b(s.lifesteal + '%')}` : '') +
    `</div>`;
  csAttrs.appendChild(sum);
}

function renderSkills() {
  if (!csSkills) return;
  csSkills.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'pts-banner' + (skillPoints ? '' : ' none');
  banner.textContent = skillPoints
    ? `✦ ${skillPoints} ponto${skillPoints>1?'s':''} de habilidade`
    : 'Sem pontos de habilidade — suba de nível para ganhar mais';
  csSkills.appendChild(banner);

  skillTree.branches.forEach(br => {
    const wrap = document.createElement('div');
    wrap.className = 'skill-branch';
    wrap.innerHTML = `<div class="branch-title">${br.icon} ${br.name}<i class="branch-line"></i></div>`;
    const row = document.createElement('div');
    row.className = 'skill-row';

    br.nodes.forEach((n, i) => {
      if (i) { const a = document.createElement('span'); a.className = 'skill-arrow'; a.textContent = '›'; row.appendChild(a); }
      const owned = hasSkill(n.id), open = skillUnlocked(n);
      const b = document.createElement('button');
      b.className = 'skill-node' + (owned ? ' owned' : open ? '' : ' locked');
      b.disabled = owned || !open || skillPoints < n.cost;
      b.innerHTML =
        `<span class="sk-ico">${n.icon}</span>` +
        `<span class="sk-name">${n.name}</span>` +
        `<span class="sk-desc">${n.desc}</span>` +
        `<span class="sk-cost">${owned ? '✓ aprendida' : !open ? '🔒 requer a anterior' : `${n.cost} ponto${n.cost>1?'s':''}`}</span>`;
      b.addEventListener('click', () => learnSkill(n.id));
      row.appendChild(b);
    });
    wrap.appendChild(row);
    csSkills.appendChild(wrap);
  });
}

function bindCharUI() {
  charOverlay = document.getElementById('charOverlay');
  csLevel = document.getElementById('csLevel');
  csName  = document.getElementById('csName');
  csXpFill= document.getElementById('csXpFill');
  csXpText= document.getElementById('csXpText');
  csAttrs = document.getElementById('csAttrs');
  csSkills= document.getElementById('csSkills');
  lvlNum  = document.getElementById('lvlNum');
  xpFill  = document.getElementById('xpFill');
  xpLabel = document.getElementById('xpLabel');
  pointDot= document.getElementById('pointDot');
  // A ficha antiga (charOverlay) foi substituída pelo grimório. Sem esta troca, o
  // mesmo botão abria duas telas de atributos diferentes, uma por cima da outra.
  document.getElementById('charBtn')?.addEventListener('click', () => {
    grAba = 'atributos'; grSelecionado = null;
    document.getElementById('inventoryOverlay')?.classList.remove('hidden');
    renderGrimorio();
  });
  document.getElementById('charClose')?.addEventListener('click', closeChar);
  charOverlay?.addEventListener('click', e => { if (e.target === charOverlay) closeChar(); });
  document.querySelectorAll('[data-cstab]').forEach(b =>
    b.addEventListener('click', () => { charTab = b.dataset.cstab; renderCharSheet(); }));
}

function bindStoreUI() {
  storeOverlay = document.getElementById('storeOverlay');
  storeTitle   = document.getElementById('storeTitle');
  storeCoins   = document.getElementById('storeCoins');
  storeTabs    = document.getElementById('storeTabs');
  storeGrid    = document.getElementById('storeGrid');
  storeEmpty   = document.getElementById('storeEmpty');
  coinCount    = document.getElementById('coinCount');
  playerHud    = document.getElementById('playerHud');
  claveCountEl = document.getElementById('claveCount');
  hpFill       = document.getElementById('hpFill');
  loadUIArt();
  document.getElementById('storeClose')?.addEventListener('click', closeStore);
  // O inventário é o drawer. A tela antiga (loja de skins) continua existindo, mas só
  // é aberta pelo balcão da loja — sem isto o mesmo botão abria as duas.
  document.getElementById('invBtn')?.addEventListener('click', () => {
    grAba = 'bolsa'; grSelecionado = null;
    document.getElementById('inventoryOverlay')?.classList.remove('hidden');
    renderGrimorio();
  });
  storeOverlay?.addEventListener('click', e => { if (e.target === storeOverlay) closeStore(); });
}

// ============================================================
// MOBILE PLAY MODE — game only, no editor
// ============================================================
let touchAction=null, touchControls=null;

// A phone gets the game; `?play` forces it anywhere (handy for testing on desktop),
// `?edit` forces the editor back on a tablet.
// A single codebase serves both the desktop editor and the published game. The deploy
// build ships a config.js that sets this flag; everything editor-related then switches
// off, including every write back to the server (which doesn't exist on GitHub Pages).
const IS_PLAY_BUILD = (typeof window !== 'undefined' && window.ACORDELOT_BUILD === 'play');

function wantsMobilePlay() {
  if (IS_PLAY_BUILD) return true;
  const q = new URLSearchParams(location.search);
  if (q.has('edit')) return false;
  if (q.has('play')) return true;
  const saved = localStorage.getItem('acordelot_mobile_mode');
  if (saved === 'play') return true;
  if (saved === 'edit') return false;
  return false; // Permitir modo editor em mobile e tablet por padrão
}

function initMobileEditorToggle() {
  const toggleBtn = document.getElementById('mobileEditorToggleBtn');
  const icon = document.getElementById('mobileEditorToggleIcon');
  const text = document.getElementById('mobileEditorToggleText');
  if (!toggleBtn) return;

  const updateToggleUI = () => {
    const isMobilePlay = document.body.classList.contains('mobile-play');
    if (isMobilePlay) {
      if (icon) icon.textContent = '✏️';
      if (text) text.textContent = 'Modo Editor';
      toggleBtn.classList.remove('in-play');
      toggleBtn.classList.add('in-editor');
    } else {
      if (icon) icon.textContent = '🎮';
      if (text) text.textContent = 'Modo Jogo';
      toggleBtn.classList.remove('in-editor');
      toggleBtn.classList.add('in-play');
    }
  };

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    initAudio();
    
    if (document.body.classList.contains('mobile-play')) {
      document.body.classList.remove('mobile-play');
      document.getElementById('left-sidebar')?.classList.remove('hidden');
      document.getElementById('engine-header')?.classList.remove('hidden');
      localStorage.setItem('acordelot_mobile_mode', 'edit');
      showToast('✏️ Modo Editor ativado');
    } else {
      enterMobilePlay();
      localStorage.setItem('acordelot_mobile_mode', 'play');
      showToast('🎮 Modo Jogo ativado');
    }
    updateToggleUI();
  });

  updateToggleUI();
}

function bindTouchControls() {
  const zone = document.getElementById('stickZone');
  const base = document.getElementById('stickBase') || zone?.querySelector('.stick-base');
  const knob = document.getElementById('stickKnob') || zone?.querySelector('.stick-knob');
  touchAction = document.getElementById('touchAction') || document.getElementById('btnTouchTalk') || document.querySelector('.touch-action');
  touchControls = document.getElementById('touchControls') || document.getElementById('touchZone') || document.querySelector('.touch-controls');
  if (!zone || !base || !knob) return;

  let pid = null, ox = 0, oy = 0, R = 52;

  const place = (cx, cy) => {
    const zr = zone.getBoundingClientRect();
    const br = (base.offsetWidth / 2) || 52;
    base.style.left = (cx - zr.left - br) + 'px';
    base.style.top = (cy - zr.top - br) + 'px';
    base.style.bottom = 'auto';
    R = br;
    const bc = base.getBoundingClientRect();
    ox = bc.left + bc.width / 2;
    oy = bc.top + bc.height / 2;
  };
  const apply = (cx, cy) => {
    let dx = cx - ox, dy = cy - oy;
    const d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    stick.x = Math.max(-1, Math.min(1, dx / R));
    stick.y = Math.max(-1, Math.min(1, dy / R));
    stick.active = true;
  };
  const release = () => {
    pid = null; stick.active = false; stick.x = stick.y = 0;
    knob.style.transform = '';
    base.style.left = ''; base.style.top = ''; base.style.bottom = '';
    zone.classList.remove('active');
  };

  // Pointer events
  zone.addEventListener('pointerdown', e => {
    e.preventDefault(); initAudio();
    pid = e.pointerId;
    try { zone.setPointerCapture(pid); } catch(ex) {}
    zone.classList.add('active');
    place(e.clientX, e.clientY); apply(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', e => {
    if (pid !== null && e.pointerId !== pid) return;
    if (stick.active) { e.preventDefault(); apply(e.clientX, e.clientY); }
  });
  zone.addEventListener('pointerup', () => { release(); });
  zone.addEventListener('pointercancel', () => { release(); });

  // Touch fallback
  zone.addEventListener('touchstart', e => {
    e.preventDefault(); initAudio();
    const t = e.touches[0];
    if (t) {
      zone.classList.add('active');
      place(t.clientX, t.clientY); apply(t.clientX, t.clientY);
    }
  }, { passive: false });
  zone.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) apply(t.clientX, t.clientY);
  }, { passive: false });
  zone.addEventListener('touchend', () => { release(); }, { passive: false });
  zone.addEventListener('touchcancel', () => { release(); }, { passive: false });

  touchAction?.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); doAction(); });
  touchAction?.addEventListener('touchstart', e => { e.preventDefault(); initAudio(); doAction(); }, { passive: false });
}

// iOS Safari ignores `user-scalable=no`, so pinch-zoom has to be refused in JS. The
// context menu is the long-press callout that spawns the selection handles.
function blockIOSGestures() {
  ['gesturestart','gesturechange','gestureend'].forEach(ev =>
    document.addEventListener(ev, e => e.preventDefault(), { passive:false }));
  document.addEventListener('contextmenu', e => {
    if (!/^(INPUT|TEXTAREA)$/.test(e.target?.tagName)) e.preventDefault();
  });
  // Double-tap-to-zoom slips past touch-action on older iOS.
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch < 320) e.preventDefault();
    lastTouch = now;
  }, { passive:false });
}

// No build publicado o cabeçalho não existe, então o menu inicial é a única porta de
// entrada. Também garante o botão "Continuar" quando há progresso salvo, e esconde o
// seletor de cenas, que é ferramenta de autoria e não coisa de aluno.
function abrirMenuInicialSePreciso() {
  if (!IS_PLAY_BUILD && !wantsMobilePlay()) return;
  const menu = document.getElementById('mainMenuOverlay');
  if (!menu || isPlayMode) return;
  menu.classList.remove('hidden');
  try { renderHeroAvatars(); } catch (e) {}
  const cont = document.getElementById('continueBtn');
  if (cont) cont.classList.toggle('hidden', !temProgressoSalvo());
  if (IS_PLAY_BUILD) {
    const sel = document.getElementById('menuStartPoint');
    if (sel) {
      sel.closest('.menu-name-row')?.classList.add('hidden');
      if (CUT.roteiros.some(r => r.id === 'abertura')) sel.value = 'cena:abertura';
    }
  }
}

// Salvamento automático: o celular fecha a aba a qualquer momento e ninguém aperta
// "salvar" num jogo. Grava a cada 8s e sempre que a aba perde o foco.
function iniciarAutosave() {
  setInterval(() => { if (isPlayMode) savePlayerData(); }, 8000);
  ['pagehide', 'blur'].forEach(ev =>
    window.addEventListener(ev, () => { if (isPlayMode) savePlayerData(); }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlayMode) savePlayerData();
  });
}

function enterMobilePlay() {
  document.body.classList.add('mobile-play');
  document.getElementById('left-sidebar')?.classList.add('hidden');
  document.getElementById('engine-header')?.classList.add('hidden');
  const menu = document.getElementById('mainMenuOverlay');
  if (menu) {
    menu.classList.remove('hidden');
    renderHeroAvatars();
  } else if (!isPlayMode) {
    togglePlay();
  }
}

function bindCanvasEvents(){
  const track=m=>{mouseCanvasX=m.x;mouseCanvasY=m.y;return m;};
  canvas.addEventListener('mousedown', e=>{initAudio();onPointerDown(track(getM(e)));});
  canvas.addEventListener('mousemove', e=>onPointerMove(track(getM(e))));
  canvas.addEventListener('mouseleave', ()=>{hoveredNPC=null;canvas.className='';});
  window.addEventListener('mouseup', onPointerUp);

  // Touch & Multi-Touch Pinch Zoom no Celular / Tablet
  canvas.addEventListener('touchstart', e=>{
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      tabletPinchDistInicial = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      tabletZoomInicial = mundoCam.zoom || 1;
      return;
    }
    e.preventDefault();initAudio();onPointerDown(track(getM(e)));
  },{passive:false});

  canvas.addEventListener('touchmove', e=>{
    if (e.touches.length === 2 && tabletPinchDistInicial > 0) {
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const fator = dist / tabletPinchDistInicial;
      mundoCam.zoom = Math.max(0.15, Math.min(4.0, tabletZoomInicial * fator));
      return;
    }
    e.preventDefault();onPointerMove(track(getM(e)));
  },{passive:false});

  window.addEventListener('touchend', e => {
    if (e.touches.length < 2) tabletPinchDistInicial = 0;
    onPointerUp();
  });
  window.addEventListener('touchcancel', e => {
    tabletPinchDistInicial = 0;
    onPointerUp();
  });
}

// ============================================================
// NPC EDITOR HELPERS
// ============================================================
// ── Objetos de cenário: catálogo e inspetor ──────────────────────────────────────
function colocarObjeto(propId, x, y) {
  const o = {
    id: `${propId}_${Date.now()}`, prop: propId,
    mapKey: activeMapSelect?.value || currentKey,
    x: Math.round(x), y: Math.round(y), escala: 1, flipX: false,
  };
  objetos.push(o);
  objetoSelecionado = o;
  mostrarInspetorDeObjeto(o);
  saveObjetos();
}

function aplicarEscalaDoObjeto(v) {
  if (!objetoSelecionado) return;
  objetoSelecionado.escala = Math.max(0.3, Math.min(4, parseFloat(v) || 1));
  sincronizarInspetorDeObjeto();
  saveObjetos();
}

function sincronizarInspetorDeObjeto() {
  const o = objetoSelecionado;
  if (!o) return;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('obj_x', Math.round(o.x)); set('obj_y', Math.round(o.y));
  set('obj_escala', o.escala || 1);
  const val = document.getElementById('obj_escala_val');
  if (val) val.textContent = (o.escala || 1).toFixed(2) + 'x';
  const flip = document.getElementById('obj_espelhar');
  if (flip) flip.checked = !!o.flipX;
}

function mostrarInspetorDeObjeto(o) {
  const painel = document.getElementById('inspObjPanel');
  if (!painel) return;
  if (!o) { painel.classList.add('hidden'); return; }
  document.getElementById('inspMobPanel')?.classList.add('hidden');
  document.getElementById('inspNPCPanel')?.classList.add('hidden');
  document.getElementById('inspEmpty')?.classList.add('hidden');
  painel.classList.remove('hidden');
  document.querySelector('[data-btab="inspector"]')?.click();

  const def = propDef(o);
  const nome = document.getElementById('obj_nome');
  if (nome) nome.textContent = def.nome || o.prop;
  const info = document.getElementById('obj_info');
  if (info) info.textContent =
    `pé ${(def.pe ?? 0.9).toFixed(2)} · raio ${def.raio || 0}px · ${def.colide ? 'bloqueia' : 'atravessa'}`;
  sincronizarInspetorDeObjeto();
}

// A paleta: um botão por prop do catálogo. Tocar arma o modo de plantar; tocar de novo
// desarma, para não sair plantando árvore sem querer ao tentar mover a câmera.
let propCategoria = 'tudo';

const NOME_DA_CATEGORIA = {
  tudo: 'Tudo', piso: 'Pisos & Ruas', arvore: 'Árvores', mato: 'Mato', flor: 'Flores', pedra: 'Pedras',
  caminho: 'Caminhos', chao_grama: 'Grama', agua: 'Água', agua_alta: 'Cachoeira',
  sagrado: 'Sagrado', lapide: 'Lápides', magico: 'Mágico', muro: 'Muros',
  muralha: 'Muralha', construcao: 'Casas', feira: 'Feira', cidade: 'Cidade',
  vila: 'Vila', calcada: 'Calçada', ponte: 'Pontes',
};

function sincronizarMateriaisComPropDefs() {
  if (typeof MATERIAIS === 'undefined') return;
  Object.entries(MATERIAIS).forEach(([matId, mDef]) => {
    if (!propDefs[matId]) {
      propDefs[matId] = {
        nome: mDef.nome,
        sprite: mDef.arquivo,
        categoria: 'piso',
        plano: 'chao',
        pe: 1,
        raio: 0,
        colide: false
      };
    }
    if (!propSprites[matId]) {
      const img = new Image();
      img.onload = () => {
        try {
          propSprites[matId] = prepareSprite(img);
          renderPaletaDeProps();
          renderPropPaletteTablet();
        } catch (e) {}
      };
      img.src = mDef.arquivo;
    }
  });
}

// ── Lupa: segurar sobre a peça para vê-la grande ────────────────────────────────
// A miniatura de 34px serve para achar a peça, não para julgá-la: não dá para ver se o
// recorte comeu uma folha, se sobrou franja ou onde fica a base. Segurando, a peça
// aparece no maior tamanho que a tela comporta, sobre xadrez.
let lupaTimer = null, lupaAberta = false;
const LUPA_ESPERA = 200;      // ms de pressão antes de abrir

function abrirLupa(id, alvoEl) {
  const spr = propSprites[id];
  const def = propDefs[id] || {};
  const caixa = document.getElementById('lupaAsset');
  const tela = document.getElementById('lupaTela');
  if (!spr || !caixa || !tela) return;

  const maxL = Math.min(430, window.innerWidth * 0.42);
  const maxA = Math.min(430, window.innerHeight * 0.62);
  const k = Math.min(maxL / spr.sw, maxA / spr.sh, 6);   // até 6x para peça miúda
  tela.width = Math.max(1, Math.round(spr.sw * k));
  tela.height = Math.max(1, Math.round(spr.sh * k));
  const cx = tela.getContext('2d');
  cx.imageSmoothingEnabled = false;
  cx.clearRect(0, 0, tela.width, tela.height);
  cx.drawImage(spr.canvas, 0, 0, tela.width, tela.height);

  document.getElementById('lupaNome').textContent = def.nome || id;
  const partes = [`${spr.sw}×${spr.sh}px`, NOME_DA_CATEGORIA[def.categoria] || def.categoria];
  if (def.plano === 'chao') partes.push('plano de chão');
  else partes.push(`pé ${(def.pe ?? .9).toFixed(2)}`,
                   def.colide ? `bloqueia ${def.raio}px` : 'atravessa');
  document.getElementById('lupaFicha').textContent = partes.join('  ·  ');

  const btnToggle = document.getElementById('lupaBtnPisoToggle');
  if (btnToggle) {
    const ativo = !!MATERIAIS[id];
    btnToggle.textContent = ativo ? '✅ Ativo em Pintar Chão (Clique p/ Remover)' : '🎨 Ativar como Pincel de Chão';
    btnToggle.classList.toggle('ativo', ativo);
    btnToggle.onclick = (ev) => {
      ev.stopPropagation();
      alternarPisoPintavel(id);
      abrirLupa(id, alvoEl);
    };
  }

  caixa.classList.remove('hidden');
  // Encosta na borda EXTERNA da doca, não no botão: ancorada no botão ela cobria as
  // colunas vizinhas da própria lista, que é o que se está comparando.
  const r = alvoEl.getBoundingClientRect();
  const lc = caixa.getBoundingClientRect();
  const doca = document.getElementById('assetDock')?.getBoundingClientRect();
  let x = (doca ? doca.right : r.right) + 16;
  if (x + lc.width > window.innerWidth - 10) x = Math.max(10, (doca ? doca.left : r.left) - lc.width - 16);
  let y = r.top + r.height / 2 - lc.height / 2;
  y = Math.max(10, Math.min(window.innerHeight - lc.height - 10, y));
  caixa.style.left = Math.round(x) + 'px';
  caixa.style.top = Math.round(y) + 'px';
  lupaAberta = true;
}

function fecharLupa() {
  clearTimeout(lupaTimer); lupaTimer = null;
  document.getElementById('lupaAsset')?.classList.add('hidden');
}

function ligarLupa(botao, id) {
  const abrir = e => {
    clearTimeout(lupaTimer);
    lupaAberta = false;
    lupaTimer = setTimeout(() => abrirLupa(id, botao), LUPA_ESPERA);
  };
  botao.addEventListener('pointerdown', abrir);
  botao.addEventListener('pointerup', fecharLupa);
  botao.addEventListener('pointerleave', fecharLupa);
  botao.addEventListener('pointercancel', fecharLupa);
  // Segurou para olhar? Então não era para armar o plantar. O clique só vale quando
  // a lupa não chegou a abrir.
  botao.addEventListener('click', e => {
    if (lupaAberta) { e.stopImmediatePropagation(); e.preventDefault(); lupaAberta = false; }
  }, true);
}

function renderPaletaDeProps() {
  const grade = document.getElementById('propPaleta');
  if (!grade) return;

  // Filtro por categoria
  const cats = document.getElementById('propCats');
  if (cats) {
    const usadas = [...new Set(Object.values(propDefs).map(d => d.categoria).filter(c => c && c !== 'novo'))].sort();
    cats.innerHTML = '';
    ['tudo', 'novo', ...usadas].forEach(c => {
      const b = document.createElement('button');
      b.className = 'prop-cat' + (propCategoria === c ? ' ativo' : '');
      let n = 0;
      if (c === 'tudo') n = Object.keys(propDefs).length;
      else if (c === 'novo') n = Object.values(propDefs).filter(d => d.novo === true || d.categoria === 'novo').length;
      else n = Object.values(propDefs).filter(d => d.categoria === c).length;
      const nomeCat = c === 'novo' ? '✨ Novo' : (NOME_DA_CATEGORIA[c] || c);
      b.textContent = `${nomeCat} (${n})`;
      if (c === 'novo') {
        b.style.fontWeight = 'bold';
        b.style.color = '#fbbf24';
      }
      b.addEventListener('click', () => { propCategoria = c; renderPaletaDeProps(); });
      cats.appendChild(b);
    });
  }

  const ids = Object.keys(propDefs)
    .filter(id => {
      if (propCategoria === 'tudo') return true;
      if (propCategoria === 'novo') return propDefs[id].novo === true || propDefs[id].categoria === 'novo';
      return propDefs[id].categoria === propCategoria;
    });
  grade.innerHTML = '';
  if (!ids.length) {
    if (propCategoria === 'novo') {
      grade.innerHTML = '<p class="hint">Nenhum asset na categoria <b>Novo</b> ainda. Quando você extrair sprites com a ferramenta de corte ou sincronizar da nuvem, eles aparecerão aqui!</p>';
    } else {
      grade.innerHTML = '<p class="hint">Nenhum prop no catálogo. Coloque os PNGs em <code>assets/props/</code> e declare-os em <code>assets/objects.json</code>.</p>';
    }
    return;
  }
  // Ordena por categoria: com 37 props, uma lista solta é impossível de varrer.
  const ordem = { caminho: 0, chao_grama: 1, arvore: 2, mato: 3, flor: 4, pedra: 5 };
  ids.sort((a, b) => (ordem[propDefs[a].categoria] ?? 9) - (ordem[propDefs[b].categoria] ?? 9)
                     || (propDefs[a].nome || a).localeCompare(propDefs[b].nome || b));
  ids.forEach(id => {
    const def = propDefs[id];
    const b = document.createElement('button');
    b.className = 'prop-btn' + (propParaColocar === id ? ' ativo' : '');
    const spr = propSprites[id];
    const cv = spr ? miniCanvas(spr, 34) : null;
    if (cv) b.appendChild(cv);
    else { const e = document.createElement('span'); e.textContent = '🌲'; b.appendChild(e); }
    const t = document.createElement('i');
    t.textContent = def.nome || id;
    b.appendChild(t);
    ligarLupa(b, id);
    b.addEventListener('click', () => {
      propParaColocar = (propParaColocar === id) ? null : id;
      // Escolher na paleta JÁ arma o plantar. Exigir um segundo clique na ferramenta
      // fazia o toque no mapa não produzir nada, sem nenhuma pista do porquê.
      if (typeof engineMode !== 'undefined' && engineMode === 'mundo') {
        // Nada de desligar o modo andar: plantar enquanto se caminha é o ponto.
        if (propParaColocar && pincelMaterial) {
          pincelMaterial = null;                    // pincel e plantar se excluem
          document.getElementById('pincelTamanhoBox').style.display = 'none';
          document.querySelectorAll('#pincelMateriais .prop-cat').forEach(x => x.classList.remove('ativo'));
        }
        mundoFerramenta = propParaColocar ? 'plantar' : 'selecionar';
        document.getElementById('mundoFerrPlantar')?.classList.toggle('ativo', !!propParaColocar);
      }
      renderPaletaDeProps();
      showToast(propParaColocar
        ? `🌲 ${def.nome || id}: toque no mapa para plantar`
        : '✋ Modo de plantar desligado');
    });
    grade.appendChild(b);
  });
  const cont = document.getElementById('propContagem');
  if (cont) cont.textContent =
    `${objetosDoMapa(activeMapSelect?.value || currentKey).length} neste mapa · ${objetos.length} no mundo`;
}

// ── Inspetor de monstro ──────────────────────────────────────────────────────────
function mostrarInspetorDeMonstro(m) {
  const painel = document.getElementById('inspMobPanel');
  const vazio  = document.getElementById('inspEmpty');
  const npcP   = document.getElementById('inspNPCPanel');
  if (!painel) return;
  if (!m) { painel.classList.add('hidden'); return; }

  npcP?.classList.add('hidden');
  vazio?.classList.add('hidden');
  painel.classList.remove('hidden');
  document.querySelector('[data-btab="inspector"]')?.click();

  const def = monsterDef(m);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('mob_nome', def.name || m.type);
  set('mob_x', Math.round(m.x));
  set('mob_y', Math.round(m.y));
  set('mob_escala', m.escala || 1);
  const val = document.getElementById('mob_escala_val');
  if (val) val.textContent = (m.escala || 1).toFixed(2) + 'x';
  const st = document.getElementById('mob_stats');
  if (st) st.textContent = `❤️ ${def.hp ?? '?'}  ·  ⚔️ ${def.damage ?? 0}  ·  🏃 ${def.speed ?? 1}` +
                           (def.exigeRessonador ? '  ·  exige Ressonador' : '');
  const flip = document.getElementById('mob_espelhar');
  if (flip) flip.checked = !!m.flipX;
}

function aplicarEscalaDoMonstro(v) {
  if (!selectedMonster) return;
  const e = Math.max(0.4, Math.min(3, parseFloat(v) || 1));
  selectedMonster.escala = e;
  const el = document.getElementById('mob_escala');   if (el) el.value = e;
  const val = document.getElementById('mob_escala_val'); if (val) val.textContent = e.toFixed(2) + 'x';
  saveMonsters();
}

function selectNPC(npc){
  selectedNPC=npc;
  inspEmpty?.classList.add('hidden'); inspNPCPanel?.classList.remove('hidden');
  syncInspector(npc);
  // Switch to inspector tab
  document.querySelector('[data-btab="inspector"]')?.click();
  // Highlight in hierarchy
  document.querySelectorAll('.npc-card').forEach(el=>el.classList.toggle('selected',el.dataset.npcid===npc.id));
}
function deselectNPC(){
  selectedNPC=null;
  inspEmpty?.classList.remove('hidden'); inspNPCPanel?.classList.add('hidden');
  document.querySelectorAll('.npc-card').forEach(el=>el.classList.remove('selected'));
}
// ============================================================
// SIGNPOST LINKING WIZARD
// ============================================================
let signpostWizard = {
  active: false,
  step: 0,
  sourceMapKey: null,
  sourceX: 512,
  sourceY: 300,
  destMapKey: null,
  destX: 512,
  destY: 300
};

function startSignpostWizard(sourceMapKey = null, sourceX = 512, sourceY = 300) {
  const currentMap = sourceMapKey || activeMapSelect?.value || currentKey;
  signpostWizard = {
    active: true,
    step: 1,
    sourceMapKey: currentMap,
    sourceX: Math.round(sourceX),
    sourceY: Math.round(sourceY),
    destMapKey: null,
    destX: 512,
    destY: 300
  };

  setMode('worldmap');
  updateWizardUI();
  showToast('🗺️ Passo 1: Clique no mapa de destino no Grid!');
}

// Passo 1 → 2: guarda o destino e leva o editor para lá, já em modo de posicionar,
// para o usuário só clicar onde o jogador deve chegar.
function escolherDestinoDaPlaca(destKey) {
  signpostWizard.destMapKey = destKey;
  signpostWizard.step = 2;
  if (activeMapSelect) activeMapSelect.value = destKey;
  currentKey = destKey;
  setMode('scene');
  npcPlacingMode = true;
  canvas.classList.add('cursor-crosshair');
  updateWizardUI();
  updateMapStatus();
  refreshNPCHierarchy();
  showToast(`🪧 Passo 2: clique no cenário "${SCENE_NAMES[destKey] || destKey}" onde o jogador deve chegar.`);
}

function updateWizardUI() {
  const overlay = document.getElementById('signpostWizardOverlay');
  const badge = document.getElementById('wizardStepBadge');
  const title = document.getElementById('wizardTitle');
  const desc = document.getElementById('wizardDesc');

  if (!signpostWizard.active) {
    overlay?.classList.remove('active');
    overlay?.classList.add('hidden');
    return;
  }

  overlay?.classList.remove('hidden');
  overlay?.classList.add('active');

  if (signpostWizard.step === 1) {
    if (badge) badge.textContent = 'PASSO 1 DE 2';
    if (title) title.textContent = '🪧 Para qual mapa esta placa vai levar?';
    if (desc) desc.innerHTML = `Origem: <b>${SCENE_NAMES[signpostWizard.sourceMapKey] || signpostWizard.sourceMapKey}</b> em (${signpostWizard.sourceX}, ${signpostWizard.sourceY}).<br><br>👉 <b>Clique no mapa de destino</b> no Grid do Mapa-Mundi acima!`;
  } else if (signpostWizard.step === 2) {
    if (badge) badge.textContent = 'PASSO 2 DE 2';
    if (title) title.textContent = '📍 Onde colocar a placa de retorno?';
    if (desc) desc.innerHTML = `Destino: <b>${SCENE_NAMES[signpostWizard.destMapKey] || signpostWizard.destMapKey}</b>.<br><br>👉 <b>Clique no cenário abaixo</b> para posicionar a placa e definir onde o jogador chegará!`;
  }
}

// Every exit from the wizard has to undo ALL of its state. Leaving npcPlacingMode on
// was what kept the editor "stuck on signpost stuff": the crosshair stayed and every
// click tried to create another element.
function resetSignpostWizard() {
  signpostWizard.active = false;
  signpostWizard.step = 0;
  signpostWizard.destMapKey = null;
  npcPlacingMode = false;
  if (canvas) canvas.classList.remove('cursor-crosshair');
  updateWizardUI();
}

function cancelSignpostWizard() {
  resetSignpostWizard();
  setMode('scene');
  showToast('✕ Vinculação de placa cancelada.');
}

function finishSignpostLinking(destX, destY) {
  const srcMap = signpostWizard.sourceMapKey;
  const dstMap = signpostWizard.destMapKey;
  const srcX = signpostWizard.sourceX;
  const srcY = signpostWizard.sourceY;
  const dstXNum = Math.round(destX);
  const dstYNum = Math.round(destY);

  const srcSignpost = {
    id: `signpost_${Date.now()}_src`,
    name: `🪧 Placa → ${SCENE_NAMES[dstMap] || dstMap}`,
    type: 'signpost',
    mapKey: srcMap,
    x: srcX,
    y: srcY,
    targetMapKey: dstMap,
    targetX: dstXNum,
    targetY: dstYNum,
    triggerRadius: 70,
    dialogue: 'none',
    triggered: false,
    flipX: false,
    scale: 1.0
  };

  const dstSignpost = {
    id: `signpost_${Date.now()}_dst`,
    name: `🪧 Placa → ${SCENE_NAMES[srcMap] || srcMap}`,
    type: 'signpost',
    mapKey: dstMap,
    x: dstXNum,
    y: dstYNum,
    targetMapKey: srcMap,
    targetX: srcX,
    targetY: srcY,
    triggerRadius: 70,
    dialogue: 'none',
    triggered: false,
    flipX: false,
    scale: 1.0
  };

  npcData.push(srcSignpost, dstSignpost);
  resetSignpostWizard();

  selectNPC(dstSignpost);
  refreshNPCHierarchy();
  saveNPCs();
  showToast(`🎉 Placas vinculadas entre ${SCENE_NAMES[srcMap]} ⇄ ${SCENE_NAMES[dstMap]}!`);
}

function syncInspector(npc){
  if(!npc)return;
  inspName&&(inspName.value=npc.name); inspType&&(inspType.value=npc.type);
  inspX&&(inspX.value=Math.round(npc.x)); inspY&&(inspY.value=Math.round(npc.y));
  inspMap&&(inspMap.value=npc.mapKey);
  if (inspDialogue) {
    const val = npc.dialogue || 'none';
    let exists = false;
    for (let opt of inspDialogue.options) {
      if (opt.value === val) { exists = true; break; }
    }
    if (!exists && val !== 'none') {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      inspDialogue.appendChild(opt);
    }
    inspDialogue.value = val;
  }
  inspRadius&&(inspRadius.value=npc.triggerRadius);
  const sc = npc.scale || 1.0;
  inspScale&&(inspScale.value=sc);
  const range = document.getElementById('insp_scale_range');
  const valLabel = document.getElementById('insp_scale_val');
  if (range) range.value = sc;
  if (valLabel) valLabel.textContent = `${Number(sc).toFixed(2)}x`;
  inspFlip&&(inspFlip.checked=npc.flipX||false); inspTriggered&&(inspTriggered.checked=npc.triggered||false);

  // Signpost inspector fields
  const signpostBox = document.querySelector('.signpost-fields');
  const inspTargetMap = document.getElementById('insp_target_map');
  const inspTargetX = document.getElementById('insp_target_x');
  const inspTargetY = document.getElementById('insp_target_y');

  if (npc.type === 'signpost') {
    signpostBox?.classList.remove('hidden');
    if (inspTargetMap) inspTargetMap.value = npc.targetMapKey || '0_0';
    if (inspTargetX) inspTargetX.value = npc.targetX || 512;
    if (inspTargetY) inspTargetY.value = npc.targetY || 300;
  } else {
    signpostBox?.classList.add('hidden');
  }

  // Porta: escolher o interior que ela abre. A lista sai da tabela INTERIORS, então
  // criar um ambiente novo já o disponibiliza aqui sem tocar no HTML.
  const portaBox = document.querySelector('.porta-fields');
  const selInterior = document.getElementById('insp_porta_interior');
  if (npc.type === 'porta') {
    portaBox?.classList.remove('hidden');
    if (selInterior) {
      selInterior.innerHTML = '<option value="">— Só marcador de cena —</option>' +
        Object.entries(INTERIORS).map(([k, d]) => `<option value="${k}">${d.name}</option>`).join('');
      selInterior.value = npc.interior || '';
      selInterior.onchange = () => {
        npc.interior = selInterior.value || null;
        saveNPCs();
        showToast(npc.interior ? `🚪 Porta abre: ${INTERIORS[npc.interior].name}` : '🚪 Porta sem destino');
      };
    }
  } else {
    portaBox?.classList.add('hidden');
  }
}

function setNPCScaleLive(newScale) {
  if (!selectedNPC) return;
  const sc = Math.max(0.3, Math.min(3.0, parseFloat(newScale) || 1.0));
  selectedNPC.scale = sc;
  if (inspScale) inspScale.value = sc;
  const range = document.getElementById('insp_scale_range');
  const valLabel = document.getElementById('insp_scale_val');
  if (range) range.value = sc;
  if (valLabel) valLabel.textContent = `${sc.toFixed(2)}x`;
  saveNPCs();
}
function placeNPC(x,y){
  if (signpostWizard.active && signpostWizard.step === 2) {
    finishSignpostLinking(x, y);
    npcPlacingMode = false;
    canvas.className = '';
    return;
  }

  const mapKey = activeMapSelect?.value || currentKey;
  const n = {
    id: `npc_${Date.now()}`,
    name: pendingElement?.name || 'Novo NPC',
    type: pendingElement?.type || 'citizen',
    mapKey,
    x: Math.round(x),
    y: Math.round(y),
    triggerRadius: 80,
    dialogue: 'none',
    triggered: false,
    flipX: false,
    scale: 1.0
  };

  if (n.type === 'signpost') {
    startSignpostWizard(mapKey, x, y);
    npcPlacingMode = false;
    canvas.className = '';
    return;
  }

  const rotulo = pendingElement?.name || 'NPC';
  pendingElement = null;
  npcData.push(n); npcPlacingMode=false; canvas.className='';
  selectNPC(n); refreshNPCHierarchy(); saveNPCs();
  showToast(`✅ ${rotulo} posicionado em (${n.x}, ${n.y})`);
}
function refreshNPCHierarchy(){
  if(!npcHierarchyList)return;
  const mapKey=activeMapSelect?.value||'0_0';
  const filtered=npcData.filter(n=>n.mapKey===mapKey);
  if(!filtered.length){npcHierarchyList.innerHTML='<div class="empty-msg">Sem NPCs neste mapa</div>';return;}
  npcHierarchyList.innerHTML=filtered.map(npc=>`
    <div class="npc-card${selectedNPC===npc?' selected':''}" data-npcid="${npc.id}">
      <span>👾</span><span>${npc.name}</span>
      <span class="npc-card-pos">(${Math.round(npc.x)},${Math.round(npc.y)})</span>
    </div>`).join('');
  npcHierarchyList.querySelectorAll('.npc-card').forEach(el=>{
    el.addEventListener('click',()=>{const n=npcData.find(n=>n.id===el.dataset.npcid);if(n)selectNPC(n);});
  });
}

// ============================================================
// MODE MANAGEMENT
// ============================================================

// ============================================================
// EDITOR DE MUNDO
// Substitui o antigo grid 5x4 desenhado por cima do jogo. Aqui o mundo é um plano
// infinito: `gridPos[id] = {col,row}` aceita negativos, então cenário pode ir para
// qualquer lado. Encostar dois cria a passagem — quem lê isso é getNeighbor().
// ============================================================
const WE = {
  cv: null, ctx: null,
  zoom: 0.34, panX: 0, panY: 0,          // pan em pixels de tela
  drag: null,                             // {tipo:'pan'|'cena', id, offX, offY}
  hover: null,
  dragFromGallery: null,
  raf: null,
};

const WE_CELL_W = SCREEN_W, WE_CELL_H = SCREEN_H;   // uma célula = um cenário inteiro
const WE_GAP = 26;                                   // respiro visual entre células

function weCellRect(col, row) {
  return {
    x: col * (WE_CELL_W + WE_GAP),
    y: row * (WE_CELL_H + WE_GAP),
    w: WE_CELL_W, h: WE_CELL_H,
  };
}
function weWorldToScreen(x, y) {
  return { x: x * WE.zoom + WE.panX, y: y * WE.zoom + WE.panY };
}
function weScreenToWorld(x, y) {
  return { x: (x - WE.panX) / WE.zoom, y: (y - WE.panY) / WE.zoom };
}
function weCellAtScreen(sx, sy) {
  const w = weScreenToWorld(sx, sy);
  return {
    col: Math.floor(w.x / (WE_CELL_W + WE_GAP)),
    row: Math.floor(w.y / (WE_CELL_H + WE_GAP)),
  };
}
function weKeyAt(col, row) {
  for (const [k, p] of Object.entries(gridPos)) if (p.col === col && p.row === row) return k;
  return null;
}

function weResize() {
  if (!WE.cv) return;
  const r = WE.cv.parentElement.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  WE.cv.width = Math.round(r.width * dpr);
  WE.cv.height = Math.round(r.height * dpr);
  WE.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function weCenter() {
  const chaves = Object.keys(gridPos);
  const r = WE.cv.getBoundingClientRect();
  if (!chaves.length) {
    WE.zoom = 0.34;
    WE.panX = r.width / 2; WE.panY = r.height / 2;
    return;
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  chaves.forEach(k => {
    const c = weCellRect(gridPos[k].col, gridPos[k].row);
    x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y);
    x1 = Math.max(x1, c.x + c.w); y1 = Math.max(y1, c.y + c.h);
  });
  const pad = 120;
  WE.zoom = Math.max(0.06, Math.min(1.2,
    Math.min((r.width - pad) / (x1 - x0), (r.height - pad) / (y1 - y0))));
  WE.panX = r.width / 2 - ((x0 + x1) / 2) * WE.zoom;
  WE.panY = r.height / 2 - ((y0 + y1) / 2) * WE.zoom;
}

function weSetZoom(z, cx, cy) {
  const r = WE.cv.getBoundingClientRect();
  cx = cx ?? r.width / 2; cy = cy ?? r.height / 2;
  const antes = weScreenToWorld(cx, cy);
  WE.zoom = Math.max(0.05, Math.min(1.6, z));
  const depois = weScreenToWorld(cx, cy);
  WE.panX += (depois.x - antes.x) * WE.zoom;
  WE.panY += (depois.y - antes.y) * WE.zoom;
  const lbl = document.getElementById('weZoomLabel');
  if (lbl) lbl.textContent = Math.round(WE.zoom * 100) + '%';
}

function weRender() {
  if (!WE.ctx || engineMode !== 'worldmap') return;
  const c = WE.ctx, r = WE.cv.getBoundingClientRect();
  c.clearRect(0, 0, r.width, r.height);

  // Malha de fundo, para o vazio não parecer um buraco sem escala.
  const passo = (WE_CELL_W + WE_GAP) * WE.zoom;
  if (passo > 14) {
    c.strokeStyle = 'rgba(148,163,184,.08)';
    c.lineWidth = 1;
    const x0 = WE.panX % passo, y0 = WE.panY % passo;
    c.beginPath();
    for (let x = x0; x < r.width; x += passo) { c.moveTo(x, 0); c.lineTo(x, r.height); }
    for (let y = y0; y < r.height; y += passo) { c.moveTo(0, y); c.lineTo(r.width, y); }
    c.stroke();
  }

  const arrastando = WE.drag?.tipo === 'cena' ? WE.drag.id : null;

  // Fronteiras acesas entre cenários vizinhos: a passagem que o encaixe criou.
  c.lineWidth = Math.max(2, 5 * WE.zoom);
  c.strokeStyle = 'rgba(74,222,128,.75)';
  for (const [k, p] of Object.entries(gridPos)) {
    for (const [dir, dc, dr] of [['east', 1, 0], ['south', 0, 1]]) {
      const viz = weKeyAt(p.col + dc, p.row + dr);
      if (!viz) continue;
      const a = weCellRect(p.col, p.row);
      const s = weWorldToScreen(a.x, a.y);
      c.beginPath();
      if (dir === 'east') {
        const x = s.x + a.w * WE.zoom + (WE_GAP * WE.zoom) / 2;
        c.moveTo(x, s.y + a.h * WE.zoom * 0.25);
        c.lineTo(x, s.y + a.h * WE.zoom * 0.75);
      } else {
        const y = s.y + a.h * WE.zoom + (WE_GAP * WE.zoom) / 2;
        c.moveTo(s.x + a.w * WE.zoom * 0.25, y);
        c.lineTo(s.x + a.w * WE.zoom * 0.75, y);
      }
      c.stroke();
    }
  }

  // Cenários posicionados
  for (const [k, p] of Object.entries(gridPos)) {
    if (k === arrastando) continue;
    weDesenhaCena(k, p.col, p.row, false);
  }

  // Alvo enquanto arrasta
  if (WE.drag?.tipo === 'cena' || WE.dragFromGallery) {
    const cel = WE.hover;
    if (cel) {
      const rect = weCellRect(cel.col, cel.row);
      const s = weWorldToScreen(rect.x, rect.y);
      const ocupado = weKeyAt(cel.col, cel.row);
      c.save();
      c.setLineDash([8, 6]);
      c.lineWidth = 2;
      c.strokeStyle = ocupado && ocupado !== arrastando ? '#f87171' : '#38bdf8';
      c.strokeRect(s.x, s.y, rect.w * WE.zoom, rect.h * WE.zoom);
      c.restore();
    }
    if (arrastando) weDesenhaCena(arrastando, WE.hover?.col ?? 0, WE.hover?.row ?? 0, true);
  }

  // Assistente de placas: marca a origem e acende o cenário sob o cursor, para o
  // clique de escolher destino não ser um chute.
  if (signpostWizard.active && signpostWizard.step === 1) {
    const org = gridPos[signpostWizard.sourceMapKey];
    if (org) {
      const rect = weCellRect(org.col, org.row);
      const s = weWorldToScreen(rect.x, rect.y);
      c.save();
      c.lineWidth = 3; c.strokeStyle = '#fbbf24';
      c.strokeRect(s.x, s.y, rect.w * WE.zoom, rect.h * WE.zoom);
      c.fillStyle = '#fbbf24'; c.font = 'bold 12px Outfit, sans-serif';
      c.fillText('ORIGEM', s.x + 8, s.y + 18);
      c.restore();
    }
    const cel = WE.hover, alvo = cel && weKeyAt(cel.col, cel.row);
    if (alvo && alvo !== signpostWizard.sourceMapKey) {
      const rect = weCellRect(cel.col, cel.row);
      const s = weWorldToScreen(rect.x, rect.y);
      c.save();
      c.fillStyle = 'rgba(74,222,128,.22)';
      c.fillRect(s.x, s.y, rect.w * WE.zoom, rect.h * WE.zoom);
      c.lineWidth = 3; c.strokeStyle = '#4ade80';
      c.strokeRect(s.x, s.y, rect.w * WE.zoom, rect.h * WE.zoom);
      c.restore();
    }
  }
}

function weDesenhaCena(k, col, row, fantasma) {
  const c = WE.ctx;
  const rect = weCellRect(col, row);
  const s = weWorldToScreen(rect.x, rect.y);
  const w = rect.w * WE.zoom, h = rect.h * WE.zoom;
  if (s.x > WE.cv.width || s.y > WE.cv.height || s.x + w < 0 || s.y + h < 0) return;

  c.save();
  if (fantasma) c.globalAlpha = 0.7;
  // Mesma regra do cartão: vídeo primeiro, e nada de exceção por arquivo quebrado.
  const fonte = videoDoMapa(k) || (bgImages[k]?.complete && bgImages[k].naturalWidth ? bgImages[k] : null);
  if (fonte) { try { c.drawImage(fonte, s.x, s.y, w, h); } catch (e) {} }
  else { c.fillStyle = '#131c28'; c.fillRect(s.x, s.y, w, h); }

  const sel = WE.hover && !WE.drag && weKeyAt(WE.hover.col, WE.hover.row) === k;
  c.lineWidth = sel ? 3 : 1.5;
  c.strokeStyle = k === currentKey ? '#38bdf8' : sel ? '#e2e8f0' : 'rgba(148,163,184,.5)';
  c.strokeRect(s.x, s.y, w, h);

  // Rótulo legível em qualquer zoom
  const nome = SCENE_NAMES[k] || k;
  c.font = '600 12px Outfit, sans-serif';
  const tw = c.measureText(nome).width + 14;
  c.fillStyle = 'rgba(5,8,14,.82)';
  c.fillRect(s.x + 6, s.y + h - 26, Math.min(tw, w - 12), 20);
  c.fillStyle = '#e2e8f0';
  c.textBaseline = 'middle';
  c.fillText(nome, s.x + 13, s.y + h - 16);

  // Marca do spawn
  const sp = spawns[k];
  if (sp && WE.zoom > 0.12) {
    const px = s.x + (sp.x / SCREEN_W) * w, py = s.y + (sp.y / SCREEN_H) * h;
    c.fillStyle = '#fbbf24';
    c.beginPath(); c.arc(px, py, 4, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 1.2; c.stroke();
  }
  c.restore();
}

function weLoop() {
  weRender();
  WE.raf = requestAnimationFrame(weLoop);
}

function weBind() {
  WE.cv = document.getElementById('worldCanvas');
  if (!WE.cv) return;
  WE.ctx = WE.cv.getContext('2d');

  const pos = e => {
    const r = WE.cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  WE.cv.addEventListener('pointerdown', e => {
    WE.cv.setPointerCapture(e.pointerId);
    const p = pos(e);
    const cel = weCellAtScreen(p.x, p.y);
    const k = weKeyAt(cel.col, cel.row);

    // Passo 1 do assistente de placas acontece aqui: o Mapa-Múndi tem área própria
    // agora, então é este grid que escolhe o destino (o antigo nem é mais desenhado).
    if (signpostWizard.active && signpostWizard.step === 1) {
      if (!k) { showToast('⚠️ Clique em cima de um cenário do grid.'); return; }
      if (k === signpostWizard.sourceMapKey) { showToast('⚠️ Escolha um cenário diferente do de origem.'); return; }
      escolherDestinoDaPlaca(k);
      return;
    }
    // Botão do meio, ou clique no vazio, desloca a vista.
    if (e.button === 1 || !k) {
      WE.drag = { tipo: 'pan', x: e.clientX, y: e.clientY, px: WE.panX, py: WE.panY };
      WE.cv.classList.add('dragging');
    } else {
      WE.drag = { tipo: 'cena', id: k };
      WE.hover = cel;
    }
  });

  WE.cv.addEventListener('pointermove', e => {
    const p = pos(e);
    WE.hover = weCellAtScreen(p.x, p.y);
    if (WE.drag?.tipo === 'pan') {
      WE.panX = WE.drag.px + (e.clientX - WE.drag.x);
      WE.panY = WE.drag.py + (e.clientY - WE.drag.y);
    }
  });

  const soltar = () => {
    if (WE.drag?.tipo === 'cena' && WE.hover) {
      const { col, row } = WE.hover;
      const ocupado = weKeyAt(col, row);
      if (!ocupado || ocupado === WE.drag.id) {
        gridPos[WE.drag.id] = { col, row };
        rebuildGrid();
        weAtualizaGaleria();
        showToast(`📍 ${SCENE_NAMES[WE.drag.id] || WE.drag.id} → (${col}, ${row})`);
        saveAllLayers(false);
      } else {
        showToast('⚠️ Já existe um cenário nessa célula.');
      }
    }
    WE.drag = null;
    WE.cv.classList.remove('dragging');
  };
  WE.cv.addEventListener('pointerup', soltar);
  WE.cv.addEventListener('pointercancel', soltar);

  WE.cv.addEventListener('wheel', e => {
    e.preventDefault();
    const p = pos(e);
    weSetZoom(WE.zoom * (e.deltaY < 0 ? 1.12 : 0.89), p.x, p.y);
  }, { passive: false });

  // Soltar um cartão da galeria dentro do grid
  WE.cv.addEventListener('dragover', e => {
    e.preventDefault();
    const p = pos(e);
    WE.hover = weCellAtScreen(p.x, p.y);
  });
  WE.cv.addEventListener('drop', e => {
    e.preventDefault();
    const id = e.dataTransfer?.getData('text/plain');
    if (!id || !bgSources[id]) return;
    const p = pos(e);
    const { col, row } = weCellAtScreen(p.x, p.y);
    const ocupado = weKeyAt(col, row);
    if (ocupado && ocupado !== id) { showToast('⚠️ Célula ocupada.'); return; }
    gridPos[id] = { col, row };
    rebuildGrid(); weAtualizaGaleria();
    showToast(`📍 ${SCENE_NAMES[id] || id} colocado em (${col}, ${row})`);
    saveAllLayers(false);
  });

  document.getElementById('weZoomIn')?.addEventListener('click', () => weSetZoom(WE.zoom * 1.25));
  document.getElementById('weZoomOut')?.addEventListener('click', () => weSetZoom(WE.zoom * 0.8));
  document.getElementById('weCenter')?.addEventListener('click', () => { weCenter(); weSetZoom(WE.zoom); });
  document.getElementById('weSave')?.addEventListener('click', () => {
    saveAllLayers(true); showToast('💾 Mundo salvo.');
  });

  window.addEventListener('resize', () => { if (engineMode === 'worldmap') weResize(); });
}

// Galeria lateral: todo cenário conhecido, posicionado ou não.
function weAtualizaGaleria() {
  const g = document.getElementById('sceneGallery');
  if (!g) return;
  g.innerHTML = '';
  for (const id of chavesDeCenario()) {
    const p = gridPos[id];
    const card = document.createElement('div');
    card.className = 'scene-card' + (p ? ' placed' : '');
    card.draggable = true;
    card.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', id));

    // Cenário animado tem vídeo no lugar da imagem. E um arquivo quebrado nunca pode
    // derrubar o desenho: um drawImage com imagem inválida lança e matava o Mapa-Múndi.
    const fonte = videoDoMapa(id) || (bgImages[id]?.complete && bgImages[id].naturalWidth ? bgImages[id] : null);
    let desenhou = false;
    if (fonte) {
      try {
        const cv = document.createElement('canvas');
        cv.width = 108; cv.height = 60;
        cv.getContext('2d').drawImage(fonte, 0, 0, 108, 60);
        card.appendChild(cv);
        desenhou = true;
      } catch (e) { desenhou = false; }
    }
    if (!desenhou) {
      const d = document.createElement('div');
      d.className = 'thumb-empty';
      d.textContent = videoSources[id] ? '🎬' : '🖼️';
      card.appendChild(d);
    }
    const info = document.createElement('div');
    info.className = 'scene-card-info';
    info.innerHTML =
      `<span class="scene-card-name">${SCENE_NAMES[id] || id}</span>` +
      `<span class="scene-card-pos">${p ? `no grid (${p.col}, ${p.row})` : 'fora do grid'}</span>`;
    card.appendChild(info);
    card.addEventListener('dblclick', () => {
      if (!p) return;
      const r = weCellRect(p.col, p.row);
      WE.panX = WE.cv.getBoundingClientRect().width / 2 - (r.x + r.w / 2) * WE.zoom;
      WE.panY = WE.cv.getBoundingClientRect().height / 2 - (r.y + r.h / 2) * WE.zoom;
    });
    g.appendChild(card);
  }
}

function weMostrar(ativo) {
  const painel = document.getElementById('world-editor');
  const palco = document.getElementById('canvas-stage');
  if (!painel) return;
  painel.classList.toggle('hidden', !ativo);
  if (palco) palco.style.display = ativo ? 'none' : '';
  if (ativo) {
    weResize(); weCenter(); weSetZoom(WE.zoom); weAtualizaGaleria();
    if (!WE.raf) weLoop();
  } else if (WE.raf) {
    cancelAnimationFrame(WE.raf); WE.raf = null;
  }
}


// ============================================================
// CENAS (CUTSCENES)
// Um roteiro é um JSON com uma lista de passos. Cada passo é um comando simples, e o
// motor executa um de cada vez, esperando o que precisa ser esperado. A ideia é que
// escrever cena nova seja escrever texto, não código.
//
// Comandos disponíveis:
//   falar        {quem, texto, auto?}       fala com máquina de escrever; espera o toque
//                                          auto: ms para seguir sozinho, sem toque
//   tutorial     {texto}                    caixa de instrução; espera o toque
//   legenda      {texto, ms}                narração em tela cheia escura (passagem de tempo)
//   esperarPerto {npc, distancia?}          só segue quando o jogador chegar perto do NPC
//   acenar       {npc, ms?}                 o NPC acena para o jogador
//   andar        {npc, para, sumir?}        o NPC caminha até um ponto (ou até uma porta)
//   andarJogador {para, sumir?}             o jogador caminha sozinho até um ponto
//   mostrar      {npc, visivel}             esconde/mostra um NPC (npc:"jogador" vale também)
//   destacar     {npc, zoom?, ms?, rotulo?} aproxima a câmera para apresentar alguém
//   sorteio      {resultado?}               abre o sorteio; `resultado:"nada"` força vazio
//   missao       {id}                       inicia a missão do assets/quests/quests.json
//   objetivo     {missao, id}               fecha um objetivo pelo roteiro
//   ambiente     {escuro, cor?, ms?}        muda a luz do mapa (amanhecer/anoitecer)
//   posicionar aceita {para:"porta", dx, dy} além de {x, y}
//   `para` aceita: {x,y}, o nome de uma porta, ou "porta" para a mais próxima
//   esperar      {ms}                       pausa
//   escurecer    {para: 0..1, ms}           fade da tela (1 = preto total)
//   tingir       {cor, forca: 0..1, ms}     véu de cor sobre a cena (mundo cinza → colorido)
//   vinheta      {forca: 0..1, ms}          escurece as bordas
//   tremer       {forca, ms}                treme a tela
//   controle     {ativo}                    dá ou tira o controle do jogador
//   hud          {visivel}                  mostra ou esconde a interface
//   posicionar   {x, y, olhando}            teleporta o jogador dentro do mapa
//   monstro      {tipo, x, y, id?, persegue?}  invoca um monstro (persegue: anda até
//                                          o jogador, respeitando o chão pintado)
//   limparMonstros {ms}                     dissolve os monstros da cena
//   esperarMortos                           só segue quando não sobrar monstro vivo
//   esperarAndar {distancia}                só segue quando o jogador andar tanto
//   dar          {item, quantidade}         entrega item ao jogador
//   curar        {tudo}                     restaura a vida
//   notas        {quantidade, ms}           enxame de notas musicais protetoras
//   sombra       {de, ms, tipo?, y?}        vulto do monstro cruzando a tela
//   som          {tipo}                     vento | desafinado | brilho
//   musica       {faixa}                    marca a trilha (ainda sem áudio ligado)
//   guiar        {para}                     as notas viram trilha apontando o cenário
//   fim                                     encerra a cena
// ============================================================
const CUT = {
  roteiro: null, passo: 0, ativo: false,
  aguardando: null,        // {tipo, ...} enquanto um passo não terminou
  fade: 0, fadeAlvo: 0, fadeVel: 0,
  tinta: null, tintaForca: 0, tintaAlvo: 0, tintaVel: 0,
  vinheta: 0, vinhetaAlvo: 0, vinhetaVel: 0,
  tremor: 0, tremorAte: 0,
  sombras: [], notas: [], guia: null, legenda: null, caminhadas: [],
  caixa: null,             // {quem, texto, mostrado, completo}
  andouDe: null,
  jaRodou: {}, roteiros: [],
};

// Todas as cenas do jogo, carregadas de assets/cutscenes/index.json. Escrever uma
// cena nova é criar o JSON e citar o id nesse índice — nada de mexer em código.
async function carregarCatalogoDeCenas() {
  let ids = ['abertura'];
  try {
    const r = await fetch(`assets/cutscenes/index.json?t=${Date.now()}`);
    const j = await r.json();
    if (Array.isArray(j.cenas) && j.cenas.length) ids = j.cenas;
  } catch (e) {}
  const cenas = await Promise.all(ids.map(carregarCena));
  CUT.roteiros = cenas.filter(Boolean);
  window.__abertura = CUT.roteiros.find(c => c.id === 'abertura') || null;
  return CUT.roteiros;
}

// Menu: escolher por onde a sessão começa. Testar a Cena 2 não pode obrigar a
// assistir a Cena 1 de novo.
function preencherMenuDeCenas() {
  const sel = document.getElementById('menuStartPoint');
  if (!sel) return;
  const salvo = sel.value || localStorage.getItem('acordelot_inicio') || '';
  sel.innerHTML = '';
  CUT.roteiros.forEach(r => {
    const o = document.createElement('option');
    o.value = 'cena:' + r.id;
    o.textContent = `🎬 ${r.nome || r.id}`;
    sel.appendChild(o);
  });
  const livre = document.createElement('option');
  livre.value = 'livre';
  livre.textContent = '🔓 Modo livre — tudo liberado, sem cenas';
  sel.appendChild(livre);
  if ([...sel.options].some(o => o.value === salvo)) sel.value = salvo;
  sel.onchange = () => { try { localStorage.setItem('acordelot_inicio', sel.value); } catch (e) {} };
}

function cenaDoMapa(mapKey) {
  return CUT.roteiros.find(c => c.mapa === mapKey && c.autoStart !== false
                             && (c.gatilho?.tipo || 'mapa') === 'mapa') || null;
}

// Uma cena pode exigir estado do jogo para valer — é assim que a segunda conversa com
// o Sr. Antony só acontece depois de falar com o bardo e com o mercador.
function condicoesDaCena(c) {
  const r = c.requer;
  if (!r) return true;
  if (r.missaoConcluida && !missaoConcluida(r.missaoConcluida)) return false;
  if (r.missaoAtiva && !missaoAtiva(r.missaoAtiva)) return false;
  if (r.notasCondensadas != null &&
      Object.values(notasPossuidas).filter(v => v > 0).length < r.notasCondensadas) return false;
  if (r.objetivos) {
    const q = missaoAtiva(r.objetivos.missao);
    // Missão já concluída também satisfaz: o que importa é o jogador ter feito aquilo,
    // não a missão ainda estar aberta no rastreador.
    if (!q) { if (!missaoConcluida(r.objetivos.missao)) return false; }
    else if (!r.objetivos.ids.every(id => q.objectives.find(o => o.id === id)?.completed)) return false;
  }
  return true;
}

// Cena presa a um NPC: falar com ele roda a cena em vez do diálogo comum.
function cenaDoNPC(npc) {
  if (!npc) return null;
  const nome = String(npc.name || '').toLowerCase();
  return CUT.roteiros.find(c =>
    c.gatilho?.tipo === 'falar' &&
    nome.includes(String(c.gatilho.npc || '').toLowerCase()) &&
    (!c.mapa || c.mapa === currentKey) &&
    !cenaJaRodou(c) && condicoesDaCena(c)) || null;
}

async function carregarCena(id) {
  try {
    const r = await fetch(`assets/cutscenes/${id}.json?t=${Date.now()}`);
    return await r.json();
  } catch (e) { return null; }
}

// Busca em espiral o ponto andável mais próximo — usado para nascer monstro de cena.
function pontoAndavelPerto(x, y) {
  if (canMoveTo(x, y)) return { x, y };
  for (let r = 12; r <= 260; r += 12) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const nx = x + Math.cos(ang) * r, ny = y + Math.sin(ang) * r;
      if (nx < 24 || nx > SCREEN_W - 24 || ny < 24 || ny > SCREEN_H - 24) continue;
      if (canMoveTo(nx, ny)) return { x: nx, y: ny };
    }
  }
  return { x, y };
}

// Cenas se referem a NPCs por nome (é o que o autor vê no editor), com o id como
// alternativa. Só procura no mapa em que a cena está rodando.
function npcPorNome(quem) {
  if (!quem) return null;
  const alvo = String(quem).toLowerCase();
  return npcData.find(n => n.mapKey === currentKey &&
    (String(n.id).toLowerCase() === alvo || String(n.name || '').toLowerCase().includes(alvo))) || null;
}

// Um destino de cena pode ser coordenada crua ou uma porta que o autor posicionou no
// editor. Assim o roteiro fala "vai até a porta" e a posição é ajustável sem editar JSON.
function alvoDaCena(para, refX, refY) {
  if (!para) return null;
  if (typeof para === 'object' && Number.isFinite(para.x)) return { x: para.x, y: para.y };
  const nome = String(para).toLowerCase();
  const portas = npcData.filter(n => n.type === 'porta' && n.mapKey === currentKey);
  if (nome === 'porta') {
    if (!portas.length) return null;
    return portas.sort((a, b) =>
      Math.hypot(a.x - refX, a.y - refY) - Math.hypot(b.x - refX, b.y - refY))[0];
  }
  const achou = portas.find(p => String(p.name || '').toLowerCase().includes(nome));
  return achou || npcPorNome(para);
}

// A trava "já rodou" é por id. A trava por mapa só vale para cenas que disparam ao
// chegar no cenário — cenas presas a um NPC dividem o mesmo mapa entre si, e marcar
// o mapa inteiro fazia a Cena 5 nascer já vista quando a Cena 4 rodava.
function cenaPorMapa(roteiro) {
  // Cena que não dispara sozinha ao chegar no cenário (autoStart: false) não pode ser
  // travada pela marca do mapa — senão uma cena chamada por missão nasce já "vista".
  return !!roteiro.mapa && roteiro.autoStart !== false
      && (roteiro.gatilho?.tipo || 'mapa') === 'mapa';
}

function cenaJaRodou(roteiro) {
  return !!(CUT.jaRodou[roteiro.id] ||
            (cenaPorMapa(roteiro) && CUT.jaRodou['mapa:' + roteiro.mapa]));
}

function marcarCenaRodada(roteiro) {
  if (!roteiro) return;
  CUT.jaRodou[roteiro.id] = true;
  if (cenaPorMapa(roteiro)) CUT.jaRodou['mapa:' + roteiro.mapa] = true;
  try { localStorage.setItem('acordelot_cenas', JSON.stringify(CUT.jaRodou)); } catch (e) {}
}

// Chamada sempre que o jogador põe o pé num mapa: a cena de abertura roda na
// primeira visita e nunca mais, porque voltaremos aqui em missões futuras.
// Marcador sobre a cabeça: "!" quando este NPC tem cena/missão nova esperando por
// você, "?" quando ele é o alvo de um objetivo em andamento. É o que faz a Cena 5
// deixar de ser invisível depois que a Cena 4 termina.
function marcadorDoNPC(npc) {
  if (!isPlayMode || !npc?.name) return null;
  if (CUT.roteiros.some(c => c.gatilho?.tipo === 'falar' && c.mapa === currentKey &&
        String(npc.name).toLowerCase().includes(String(c.gatilho.npc).toLowerCase()) &&
        !cenaJaRodou(c) && condicoesDaCena(c))) return '!';
  const nome = String(npc.name).toLowerCase();
  for (const q of activeQuests) {
    for (const o of q.objectives) {
      if (o.completed || o.type !== 'talk' || !objetivoLiberado(q, o)) continue;
      if (nome.includes(String(o.npc || '').toLowerCase())) return '?';
    }
  }
  return null;
}

function renderMarcadoresDeNPC(now) {
  npcData.forEach(npc => {
    if (npc.mapKey !== currentKey || npc.oculto) return;
    const m = marcadorDoNPC(npc);
    if (!m) return;
    const b = npcBounds(npc);
    const y = b.y - 20 + Math.sin(now * 0.004) * 4;
    ctx.save();
    ctx.font = 'bold 30px Outfit, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(6,9,14,0.9)';
    ctx.shadowColor = m === '!' ? '#f59e0b' : '#38bdf8';
    ctx.shadowBlur = 14;
    ctx.strokeText(m, npc.x, y);
    ctx.fillStyle = m === '!' ? '#fbbf24' : '#7dd3fc';
    ctx.fillText(m, npc.x, y);
    ctx.restore();
  });
}

// Chegar num mapa onde alguém tem cena esperando: a câmera aproxima nele por um
// instante. Resolve "quem eu procuro agora?" sem tirar o controle do jogador.
function apresentarQuemEsperaNoMapa(mapKey) {
  if (!isPlayMode || CUT.ativo) return;
  const cena = CUT.roteiros.find(c => c.gatilho?.tipo === 'falar' && c.mapa === mapKey
                                   && !cenaJaRodou(c) && condicoesDaCena(c));
  if (!cena) return;
  const alvo = npcData.find(n => n.mapKey === mapKey &&
    String(n.name || '').toLowerCase().includes(String(cena.gatilho.npc).toLowerCase()));
  if (!alvo) return;
  setTimeout(() => destacar(alvo.x, alvo.y - 30, { zoom: 1.8, ms: 3400, rotulo: alvo.name }), 500);
}

function talvezIniciarCenaDoMapa(mapKey) {
  const r = cenaDoMapa(mapKey);
  if (!r || CUT.ativo || cenaJaRodou(r)) { apresentarQuemEsperaNoMapa(mapKey); return; }
  iniciarCena(r);
}

// Para testar de novo no PC: `resetarCenas()` no console e recarregar.
window.resetarCenas = function () {
  CUT.jaRodou = {};
  try { localStorage.removeItem('acordelot_cenas'); } catch (e) {}
  showToast('🎬 Cenas liberadas para rodar de novo');
};

function iniciarCena(roteiro) {
  if (!roteiro || CUT.ativo) return;
  marcarCenaRodada(roteiro);
  CUT.roteiro = roteiro; CUT.passo = 0; CUT.ativo = true; CUT.aguardando = null;
  CUT.sombras = []; CUT.notas = []; CUT.guia = null; CUT.caixa = null; CUT.legenda = null; CUT.caminhadas = [];
  player.oculto = false;
  npcData.forEach(n => { n.oculto = false; });
  CUT.fade = CUT.fadeAlvo = 0; CUT.tintaForca = CUT.tintaAlvo = 0;
  CUT.vinheta = CUT.vinhetaAlvo = 0;
  // Cena de mundo troca o mapa e garante a cena externa. Cena SEM `mapa` acontece onde
  // o jogador está — inclusive dentro de um interior. Forçar 'world' aqui expulsava o
  // jogador do Forjador para o mapa do mundo no meio da fala do Altar.
  if (roteiro.mapa && cenarioExiste(roteiro.mapa)) {
    currentKey = roteiro.mapa;
    if (activeMapSelect) activeMapSelect.value = roteiro.mapa;
    monsters = monsters.filter(m => m.mapKey !== currentKey);
    currentScene = 'world';
  }
  if (!isPlayMode) togglePlay();
  proximoPasso();
}

function encerrarCena() {
  // Uma cena disparada por NPC vale como conversa: senão "volte ao Sr. Antony" nunca
  // se completaria, já que a cena substitui o diálogo.
  if (CUT.roteiro?.gatilho?.tipo === 'falar' && CUT.roteiro.gatilho.npc) {
    progressoDeMissao('talk', CUT.roteiro.gatilho.npc);
  }
  CUT.ativo = false;
  CUT.caminhadas = [];
  player.oculto = false;      // nunca devolver o controle com o jogador invisível CUT.aguardando = null; CUT.caixa = null;
  CUT.fadeAlvo = 0; CUT.tintaAlvo = 0; CUT.vinhetaAlvo = 0;
  playerLocked = false;
  playerHud?.classList.remove('hidden');
  marcarCenaRodada(CUT.roteiro);
  savePlayerData();
}

function proximoPasso() {
  if (!CUT.ativo) return;
  const passos = CUT.roteiro.passos || [];
  while (CUT.passo < passos.length) {
    const p = passos[CUT.passo++];
    if (!p || !p.cmd) continue;                 // linhas "_" são comentários do roteiro
    const bloqueou = executarPasso(p);
    if (bloqueou) return;                        // espera; proximoPasso volta depois
  }
  encerrarCena();
}

// Devolve true quando o passo precisa esperar algo antes do próximo.
function executarPasso(p) {
  const agora = performance.now();
  switch (p.cmd) {
    case 'falar':
      CUT.caixa = { quem: nomeDoLocutor(p.quem), texto: subVars(p.texto), mostrado: 0, completo: false, auto: p.auto || 0 };
      CUT.aguardando = { tipo: 'toque' };
      return true;

    case 'tutorial':
      CUT.caixa = { quem: '📖 Tutorial', texto: subVars(p.texto), mostrado: 0, completo: false, tutorial: true };
      CUT.aguardando = { tipo: 'toque' };
      return true;

    case 'esperar':
      CUT.aguardando = { tipo: 'tempo', ate: agora + (p.ms || 0) };
      return true;

    case 'escurecer':
      CUT.fadeAlvo = p.para ?? 0;
      CUT.fadeVel = p.ms ? (CUT.fadeAlvo - CUT.fade) / p.ms : Infinity;
      if (!p.ms) CUT.fade = CUT.fadeAlvo;
      return false;

    case 'tingir':
      CUT.tinta = p.cor || '#888888';
      CUT.tintaAlvo = p.forca ?? 0;
      CUT.tintaVel = p.ms ? (CUT.tintaAlvo - CUT.tintaForca) / p.ms : Infinity;
      if (!p.ms) CUT.tintaForca = CUT.tintaAlvo;
      return false;

    case 'vinheta':
      CUT.vinhetaAlvo = p.forca ?? 0;
      CUT.vinhetaVel = p.ms ? (CUT.vinhetaAlvo - CUT.vinheta) / p.ms : Infinity;
      return false;

    case 'tremer':
      CUT.tremor = p.forca || 6; CUT.tremorAte = agora + (p.ms || 400);
      return false;

    case 'controle':
      playerLocked = !p.ativo;
      return false;

    case 'hud':
      playerHud?.classList.toggle('hidden', !p.visivel);
      return false;

    case 'posicionar': {
      // Aceita coordenada crua ou "sai na porta X", com deslocamento — assim o roteiro
      // não precisa saber onde o autor colocou a porta.
      const ref = p.para ? alvoDaCena(p.para, player.x, player.y) : null;
      const bx = ref ? ref.x + (p.dx || 0) : (p.x ?? player.x);
      const by = ref ? ref.y + (p.dy || 0) : (p.y ?? player.y);
      const pa = pontoAndavelPerto(bx, by);
      player.x = pa.x; player.y = pa.y;
      if (p.olhando) player.direction = p.olhando;
      return false;
    }

    case 'monstro': {
      const def = monsterDefs[p.tipo];
      if (def) {
        // O roteiro dá a posição desejada, mas quem manda é o chão pintado: se o
        // ponto cair numa copa de árvore, o monstro nasce no lugar andável mais perto.
        const alvo = pontoAndavelPerto(p.x ?? 512, p.y ?? 300);
        monsters.push({
          id: p.id || `cena_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
          type: p.tipo, mapKey: currentKey,
          x: alvo.x, y: alvo.y, homeX: alvo.x, homeY: alvo.y,
          hp: def.hp ?? 20, maxHp: def.hp ?? 20,
          dead: false, respawnAt: 0, hurtUntil: 0, lastHit: 0, facing: 1,
          phase: Math.random() * Math.PI * 2, deCena: true,
          persegue: p.persegue ?? true,
        });
      }
      return false;
    }

    case 'limparMonstros':
      monsters.forEach(m => { if (!m.dead && m.mapKey === currentKey) { m.dead = true; m.respawnAt = 0; } });
      CUT.aguardando = { tipo: 'tempo', ate: agora + (p.ms || 0) };
      return !!p.ms;

    case 'esperarMortos':
      CUT.aguardando = { tipo: 'mortos' };
      return true;

    case 'esperarAndar':
      CUT.andouDe = { x: player.x, y: player.y };
      CUT.aguardando = { tipo: 'andar', distancia: p.distancia || 120 };
      return true;

    case 'dar':
      if (p.item === 'clave') claveCount += (p.quantidade || 1);
      else playerInventory[p.item] = (playerInventory[p.item] || 0) + (p.quantidade || 1);
      updateInventorySlotsUI?.();
      savePlayerData();
      return false;

    case 'curar':
      playerHp = playerMaxHp();
      return false;

    case 'notas':
      for (let i = 0; i < (p.quantidade || 24); i++) {
        CUT.notas.push({
          ang: Math.random() * Math.PI * 2,
          raio: 40 + Math.random() * 90,
          vel: 0.0008 + Math.random() * 0.0016,
          sobe: Math.random() * 30,
          simbolo: ['♪','♫','♬','♩'][i % 4],
          nasceu: agora + i * 60,
        });
      }
      CUT.aguardando = { tipo: 'tempo', ate: agora + (p.ms || 0) };
      return !!p.ms;

    case 'sombra':
      CUT.sombras.push({ de: p.de || 'direita', inicio: agora, ms: p.ms || 700,
                         tipo: p.tipo || 'shiker', y: p.y });
      return false;

    case 'legenda':
      // Narração de passagem de tempo: tela escura, texto centralizado, sem HUD.
      CUT.legenda = { texto: subVars(p.texto), inicio: agora, ms: p.ms || 4200 };
      CUT.aguardando = { tipo: 'tempo', ate: agora + (p.ms || 4200) };
      return true;

    case 'esperarPerto':
      CUT.aguardando = { tipo: 'perto', npc: p.npc, dist: p.distancia || 120 };
      return true;

    case 'acenar': {
      const alvo = npcPorNome(p.npc);
      if (alvo) {
        alvo.acenaAte = agora + (p.ms || 1800);
        say(alvo, '👋', p.ms || 1800);
      }
      return false;
    }

    case 'andar': {
      const quem = npcPorNome(p.npc);
      const destino = quem ? alvoDaCena(p.para, quem.x, quem.y) : null;
      if (!quem || !destino) return false;         // sem alvo a cena segue, não trava
      CUT.caminhadas.push({ tipo: 'npc', alvo: quem, x: destino.x, y: destino.y,
                            vel: p.velocidade || 1.6, sumir: p.sumir !== false });
      CUT.aguardando = { tipo: 'caminhada' };
      return true;
    }

    case 'andarJogador': {
      const destino = alvoDaCena(p.para, player.x, player.y);
      if (!destino) return false;
      playerLocked = true;
      CUT.caminhadas.push({ tipo: 'jogador', x: destino.x, y: destino.y,
                            vel: p.velocidade || 2.1, sumir: p.sumir !== false });
      CUT.aguardando = { tipo: 'caminhada' };
      return true;
    }

    case 'mostrar': {
      if (!p.npc || String(p.npc).toLowerCase() === 'jogador') { player.oculto = !p.visivel; return false; }
      const quem = npcPorNome(p.npc);
      if (quem) quem.oculto = !p.visivel;
      return false;
    }

    case 'ambiente': {
      const base = ambienteAtual() || { escuro: 0 };
      const alvo = Math.max(0, Math.min(1, p.escuro ?? 0));
      const ms = Math.max(1, p.ms ?? 2000);
      ambienteRuntime[currentKey] = {
        escuro: base.escuro || 0, alvo,
        vel: (alvo - (base.escuro || 0)) / (ms / 16),
        cor: p.cor || base.cor, haloRaio: p.haloRaio || base.haloRaio,
      };
      CUT.aguardando = { tipo: 'tempo', ate: agora + (p.esperar === false ? 0 : ms) };
      return p.esperar !== false;
    }

    case 'destacar': {
      const alvo = npcPorNome(p.npc);
      if (alvo) destacar(alvo.x, alvo.y - 30, { zoom: p.zoom || 1.7, ms: p.ms || 3200, rotulo: p.rotulo || alvo.name });
      CUT.aguardando = { tipo: 'tempo', ate: agora + (p.esperar === false ? 0 : (p.ms || 3200)) };
      return p.esperar !== false;
    }

    case 'objetivo': {
      const q = missaoAtiva(p.missao);
      const o = q?.objectives.find(x => x.id === p.id);
      if (o && !o.completed) {
        o.completed = true;
        if (o.quantidade) o.progresso = o.quantidade;
        showToast(`✅ ${o.text}`);
        atualizarRastreador(); verificarMissoesConcluidas();
      }
      return false;
    }

    case 'sorteio':
      // A cena pode ditar o resultado — é assim que a Cena 12 garante o "nada".
      abrirSorteio(p.resultado || null);
      CUT.aguardando = { tipo: 'sorteio' };
      return true;

    case 'missao':
      unlockQuest(p.id);
      return false;

    case 'som':
      if (p.tipo === 'desafinado') tocarDesafinado();
      else if (p.tipo === 'brilho') playForgeDone?.();
      return false;

    case 'musica':
      return false;   // trilha entra quando houver áudio

    case 'guiar': {
      // As notas param de vagar e formam uma trilha viva na direção do cenário
      // destino, para o jogador ver por onde seguir em vez de ficar perdido.
      const aqui = gridPos[currentKey], la = gridPos[p.para];
      let dx = 1, dy = 0;
      if (aqui && la) {
        const ddc = la.col - aqui.col, ddr = la.row - aqui.row;
        if (Math.abs(ddc) >= Math.abs(ddr)) { dx = Math.sign(ddc) || 1; dy = 0; }
        else { dx = 0; dy = Math.sign(ddr) || 1; }
      }
      CUT.guia = { dx, dy, mapa: currentKey, destino: p.para, nome: SCENE_NAMES[p.para] || p.para };
      showToast(`✨ Siga as notas até ${CUT.guia.nome}`);
      return false;
    }

    case 'fim':
      encerrarCena();
      return true;

    default:
      return false;
  }
}

function tocarDesafinado() {
  if (!audioCtx) return;
  try {
    [233, 247, 262].forEach(f => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f;
      g.gain.setValueAtTime(0.05, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.1);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + 1.1);
    });
  } catch (e) {}
}

// Avança a espera atual, se ela já foi satisfeita.
function atualizarCena(now) {
  if (!CUT.ativo) return;

  // transições contínuas
  const passo = (v, alvo, vel, dt) => {
    if (v === alvo) return v;
    if (!isFinite(vel)) return alvo;
    const n = v + vel * dt;
    return (vel > 0 ? Math.min(n, alvo) : Math.max(n, alvo));
  };
  const dt = 16;
  CUT.fade = passo(CUT.fade, CUT.fadeAlvo, CUT.fadeVel, dt);
  CUT.tintaForca = passo(CUT.tintaForca, CUT.tintaAlvo, CUT.tintaVel, dt);
  CUT.vinheta = passo(CUT.vinheta, CUT.vinhetaAlvo, CUT.vinhetaVel, dt);

  // máquina de escrever
  if (CUT.caixa && !CUT.caixa.completo) {
    CUT.caixa.mostrado += CUT.caixa.tutorial ? 1.4 : 2.2;
    if (CUT.caixa.mostrado >= CUT.caixa.texto.length) {
      CUT.caixa.mostrado = CUT.caixa.texto.length;
      CUT.caixa.completo = true;
    }
  }

  // Fala marcada com `auto` não exige toque: respira e segue, para a cena não travar.
  if (CUT.caixa?.auto && CUT.caixa.completo) {
    CUT.caixa.autoAte = CUT.caixa.autoAte || (now + CUT.caixa.auto);
    if (now >= CUT.caixa.autoAte) { CUT.caixa = null; CUT.aguardando = null; proximoPasso(); return; }
  }

  atualizarCaminhadas();

  const a = CUT.aguardando;
  if (!a) return;
  if (a.tipo === 'tempo' && now >= a.ate) { CUT.aguardando = null; proximoPasso(); }
  else if (a.tipo === 'perto') {
    const alvo = npcPorNome(a.npc);
    if (!alvo) { CUT.aguardando = null; proximoPasso(); return; }   // NPC sumiu: não trava a cena
    if (Math.hypot(player.x - alvo.x, player.y - alvo.y) <= a.dist) {
      CUT.aguardando = null; proximoPasso();
    }
  }
  else if (a.tipo === 'sorteio') {
    // segue quando o jogador fechar a tela do sorteio
    if (document.getElementById('sorteioOverlay')?.classList.contains('hidden')) {
      CUT.aguardando = null; proximoPasso();
    }
  }
  else if (a.tipo === 'mortos') {
    const vivos = monsters.filter(m => !m.dead && m.mapKey === currentKey).length;
    if (!vivos) { CUT.aguardando = null; proximoPasso(); }
  }
  else if (a.tipo === 'andar' && CUT.andouDe) {
    const d = Math.hypot(player.x - CUT.andouDe.x, player.y - CUT.andouDe.y);
    if (d >= a.distancia) { CUT.aguardando = null; proximoPasso(); }
  }
}

// Toque/clique/tecla avança a fala.
function avancarCena() {
  if (!CUT.ativo || CUT.aguardando?.tipo !== 'toque') return false;
  if (CUT.caixa && !CUT.caixa.completo) { CUT.caixa.completo = true; CUT.caixa.mostrado = CUT.caixa.texto.length; return true; }
  CUT.caixa = null; CUT.aguardando = null; proximoPasso();
  return true;
}


// As notas-guia vivem FORA da cena: `renderCena` para de desenhar quando a cena
// acaba, e era por isso que elas sumiam justo na hora de indicar o caminho. Esta
// função é chamada todo quadro, com cena ou sem cena.
// Noite do cenário: multiplica a cena por um azul escuro e ainda deixa um halo de luz
// em volta do jogador, para escuro não virar "não dá para jogar".
// Amanhecer e anoitecer dentro da cena: o comando `ambiente` sobrepõe o clima fixo do
// mapa e caminha até o novo valor, para o sol nascer em vez de piscar.
const ambienteRuntime = {};
function ambienteAtual() {
  const base = ambience[currentKey];
  const ov = ambienteRuntime[currentKey];
  if (!ov) return base;
  return { ...(base || {}), ...ov, escuro: ov.escuro };
}
function atualizarAmbiente() {
  const ov = ambienteRuntime[currentKey];
  if (!ov || ov.escuro === ov.alvo) return;
  const passo = ov.vel;
  ov.escuro = passo > 0 ? Math.min(ov.escuro + passo, ov.alvo) : Math.max(ov.escuro + passo, ov.alvo);
}

function renderAmbiente() {
  atualizarAmbiente();
  const a = ambienteAtual();
  if (!a || !(a.escuro > 0)) return;
  const c = ctx;
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = a.cor || '#0b1220';
  c.globalAlpha = Math.min(0.95, a.escuro);
  c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  c.restore();
  if (isPlayMode && a.halo !== false) {
    const r = a.haloRaio || 210;
    const g = c.createRadialGradient(player.x, player.y - 24, 10, player.x, player.y - 24, r);
    g.addColorStop(0, `rgba(253,230,138,${0.16 * a.escuro})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save();
    c.globalCompositeOperation = 'screen';
    c.fillStyle = g;
    c.fillRect(0, 0, SCREEN_W, SCREEN_H);
    c.restore();
  }
}

function renderNotasGuia(now) {
  if (!CUT.notas.length) return;
  const c = ctx;
  if (CUT.guia && CUT.guia.mapa !== currentKey) { CUT.guia = null; CUT.notas = []; }

  // enxame de notas ao redor do jogador — depois do `guiar` elas se esticam
  // numa fila em direção à saída e ficam lá, apontando o caminho.
  CUT.notas.forEach((n, i) => {
    if (now < n.nasceu) return;
    const t = (now - n.nasceu);
    n.ang += n.vel * 16;
    let x, y;
    if (CUT.guia) {
      // Trilha: uma fila curta que sai do jogador e vai até a borda de saída. Notas
      // além do fim da fila não são desenhadas — senão viram um rastro infinito.
      const passo = 34;
      const alcance = CUT.guia.dx
        ? (CUT.guia.dx > 0 ? SCREEN_W - player.x : player.x)
        : (CUT.guia.dy > 0 ? SCREEN_H - player.y : player.y);
      const cabem = Math.max(3, Math.floor((alcance - 20) / passo));
      if (i >= cabem) return;
      const avanco = (i + 1) * passo;
      const bal = Math.sin(now * 0.003 + i * 0.6) * 9;
      x = player.x + CUT.guia.dx * avanco + (CUT.guia.dx ? 0 : bal);
      y = player.y - 26 + CUT.guia.dy * avanco + (CUT.guia.dy ? 0 : bal);
    } else {
      x = player.x + Math.cos(n.ang) * n.raio;
      y = player.y - 30 - Math.sin(n.ang) * n.raio * 0.4 - Math.min(60, t * 0.01) - n.sobe;
    }
    c.save();
    // Na trilha as notas são maiores e pulsam em onda, do jogador para a saída, para
    // ler como direção e não como enfeite.
    const guiando = !!CUT.guia;
    const pulso = guiando ? 0.55 + 0.45 * Math.sin(now * 0.006 - i * 0.5) : 0;
    c.globalAlpha = guiando ? 0.55 + pulso * 0.45 : 0.85;
    c.fillStyle = guiando ? '#fde68a' : '#7dd3fc';
    c.shadowColor = guiando ? '#f59e0b' : '#38bdf8';
    c.shadowBlur = guiando ? 14 : 10;
    c.font = `${guiando ? 22 + pulso * 4 : 16}px serif`;
    c.textAlign = 'center';
    c.fillText(n.simbolo, x, y);
    c.restore();
  });

  // Farol na borda de saída: o ponto exato de atravessar, sempre visível.
  if (CUT.guia) {
    const g = CUT.guia;
    const bx = g.dx ? (g.dx > 0 ? SCREEN_W - 16 : 16) : player.x;
    const by = g.dy ? (g.dy > 0 ? SCREEN_H - 16 : 16) : player.y;
    const p = 0.5 + 0.5 * Math.sin(now * 0.005);
    c.save();
    c.globalAlpha = 0.35 + p * 0.4;
    c.strokeStyle = '#fde68a'; c.lineWidth = 3;
    c.shadowColor = '#f59e0b'; c.shadowBlur = 18;
    c.beginPath();
    if (g.dx) { c.moveTo(bx, SCREEN_H * 0.2); c.lineTo(bx, SCREEN_H * 0.8); }
    else      { c.moveTo(SCREEN_W * 0.2, by); c.lineTo(SCREEN_W * 0.8, by); }
    c.stroke();
    c.fillStyle = '#fde68a';
    c.font = 'bold 13px Outfit, sans-serif'; c.textAlign = 'center';
    c.fillText(`↑ ${g.nome}`, g.dx ? bx - g.dx * 60 : SCREEN_W / 2,
                              g.dy ? by - g.dy * 22 : SCREEN_H / 2);
    c.restore();
  }
}

// Caminhadas roteirizadas: NPC ou jogador andando sozinho até um ponto. Quem chega
// some (é o que fecha a cena da casa) a menos que o roteiro diga o contrário.
function atualizarCaminhadas() {
  if (!CUT.caminhadas.length) return;
  CUT.caminhadas = CUT.caminhadas.filter(c => {
    const ent = c.tipo === 'jogador' ? player : c.alvo;
    if (!ent) return false;
    const dx = c.x - ent.x, dy = c.y - ent.y;
    const d = Math.hypot(dx, dy);
    if (d <= c.vel * 1.5) {
      ent.x = c.x; ent.y = c.y;
      if (c.tipo === 'jogador') player.isMoving = false;
      if (c.sumir) {
        if (c.tipo === 'jogador') player.oculto = true; else c.alvo.oculto = true;
      }
      return false;
    }
    ent.x += (dx / d) * c.vel;
    ent.y += (dy / d) * c.vel;
    if (c.tipo === 'jogador') {
      player.direction = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right')
                                                     : (dy < 0 ? 'up' : 'down');
      player.isMoving = true;
      player.animFrame = Math.floor(performance.now() / 130) % 4;   // anima os pés
    } else {
      c.alvo.flipX = dx < 0;
      c.alvo.andandoAte = performance.now() + 120;
    }
    return true;
  });
  if (!CUT.caminhadas.length && CUT.aguardando?.tipo === 'caminhada') {
    CUT.aguardando = null; proximoPasso();
  }
}

function quebrarTexto(c, texto, largura) {
  const saida = [];
  String(texto).split('\n').forEach(paragrafo => {
    let linha = '';
    paragrafo.split(' ').forEach(pal => {
      const teste = linha ? linha + ' ' + pal : pal;
      if (c.measureText(teste).width > largura && linha) { saida.push(linha); linha = pal; }
      else linha = teste;
    });
    saida.push(linha);
  });
  return saida;
}

function renderCena(now) {
  if (!CUT.ativo) return;
  const c = ctx;

  // véu de cor: é o que faz o mundo cinza voltar a ter cor
  if (CUT.tintaForca > 0.01) {
    c.save();
    c.globalCompositeOperation = 'saturation';
    c.fillStyle = `rgba(128,128,128,${CUT.tintaForca})`;
    c.fillRect(0, 0, SCREEN_W, SCREEN_H);
    c.restore();
    c.save();
    c.globalAlpha = CUT.tintaForca * 0.5;
    c.fillStyle = CUT.tinta || '#888';
    c.fillRect(0, 0, SCREEN_W, SCREEN_H);
    c.restore();
  }

  // vultos passando entre as árvores
  // Os vultos são a silhueta do próprio monstro da cena — é ele que está espreitando.
  CUT.sombras = CUT.sombras.filter(s => now - s.inicio < s.ms);
  CUT.sombras.forEach(s => {
    const t = (now - s.inicio) / s.ms;
    const x = s.de === 'direita' ? SCREEN_W * (1 - t) : SCREEN_W * t;
    const y = s.y ?? SCREEN_H * 0.45;
    const spr = monsterSprites[s.tipo || 'shiker'];
    c.save();
    c.globalAlpha = Math.sin(t * Math.PI) * 0.8;
    if (spr) {
      const h = 96, w = h * (spr.sw / spr.sh);
      c.save();
      c.translate(x, y);
      if (s.de === 'esquerda') c.scale(-1, 1);
      c.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, -w/2, -h, w, h);
      // escurece a silhueta, para ler como vulto e não como o monstro à luz
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(4,5,10,0.88)';
      c.fillRect(-w/2, -h, w, h);
      c.restore();
    } else {
      c.fillStyle = '#05060a';
      c.beginPath(); c.ellipse(x, y, 26, 54, 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  });

  // vinheta
  if (CUT.vinheta > 0.01) {
    const g = c.createRadialGradient(SCREEN_W/2, SCREEN_H/2, SCREEN_H*0.25,
                                     SCREEN_W/2, SCREEN_H/2, SCREEN_H*0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${CUT.vinheta})`);
    c.fillStyle = g; c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  // fade
  if (CUT.fade > 0.001) {
    c.fillStyle = `rgba(0,0,0,${CUT.fade})`;
    c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }

  // legenda de passagem de tempo: tela escura e narração centralizada
  if (CUT.legenda) {
    const l = CUT.legenda, t = (now - l.inicio) / l.ms;
    if (t >= 1) CUT.legenda = null;
    else {
      const ent = Math.min(1, t * 5), sai = Math.min(1, (1 - t) * 5);
      const a = Math.min(ent, sai);
      c.save();
      c.globalAlpha = a;
      c.fillStyle = 'rgba(3,5,9,0.94)';
      c.fillRect(0, 0, SCREEN_W, SCREEN_H);
      c.fillStyle = '#e2e8f0';
      c.font = 'italic 20px Outfit, sans-serif';
      c.textAlign = 'center';
      const linhas = quebrarTexto(c, l.texto, SCREEN_W - 200);
      linhas.forEach((ln, i) =>
        c.fillText(ln, SCREEN_W / 2, SCREEN_H / 2 - (linhas.length - 1) * 16 + i * 32));
      c.restore();
    }
  }

  // caixa de fala da cena — sobre o fade, para ler mesmo no escuro total
  if (CUT.caixa) {
    const alt = CUT.caixa.tutorial ? 108 : 92;
    const y = SCREEN_H - alt - 22;
    c.save();
    c.fillStyle = 'rgba(6,9,14,0.9)';
    c.strokeStyle = CUT.caixa.tutorial ? 'rgba(125,211,252,.7)' : 'rgba(255,255,255,.22)';
    c.lineWidth = 2;
    c.beginPath(); c.roundRect(70, y, SCREEN_W - 140, alt, 12); c.fill(); c.stroke();

    if (CUT.caixa.quem) {
      c.fillStyle = CUT.caixa.tutorial ? '#7dd3fc' : '#fbbf24';
      c.font = '600 13px Outfit, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillText(CUT.caixa.quem, 92, y + 14);
    }
    c.fillStyle = '#e8eef6';
    c.font = '15px Outfit, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top';
    const visivel = CUT.caixa.texto.slice(0, Math.floor(CUT.caixa.mostrado));
    let ly = y + (CUT.caixa.quem ? 38 : 22);
    visivel.split('\n').forEach(linha => {
      wrapText(c, linha, 92, ly, SCREEN_W - 190, 20);
      ly += 20 * Math.max(1, Math.ceil(c.measureText(linha).width / (SCREEN_W - 190)));
    });

    if (CUT.caixa.completo) {
      c.globalAlpha = (Math.sin(now * 0.005) + 1) / 2 * 0.6 + 0.4;
      c.fillStyle = '#94a3b8'; c.font = '11px Outfit, sans-serif'; c.textAlign = 'right';
      c.fillText('toque para continuar ▸', SCREEN_W - 92, y + alt - 24);
    }
    c.restore();
  }
}

// Deslocamento de tremor aplicado ao desenho do mundo.
function tremorCena(now) {
  if (!CUT.ativo || now > CUT.tremorAte) return { x: 0, y: 0 };
  const f = CUT.tremor;
  return { x: (Math.random() - 0.5) * f, y: (Math.random() - 0.5) * f };
}

function setMode(mode){
  engineMode=mode;
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  // O Mapa-Múndi tem área própria: troca o palco do jogo pelo editor de mundo em vez
  // de desenhar por cima dele.
  weMostrar(mode==='worldmap');
  document.getElementById('mundoToolsGroup')?.style.setProperty('display',mode==='mundo'?'':'none');
  // A classe no body é o que troca o layout inteiro: barra em cima, doca à direita,
  // barra lateral antiga fora de cena.
  document.body.classList.toggle('modo-mundo', mode === 'mundo');
  if(mode==='mundo'){ mundoTeste=false; renderPaletaDeProps(); }
  // Show/hide tool groups
  document.getElementById('sceneToolsGroup')?.style.setProperty('display',mode==='scene'?'':'none');
  document.getElementById('collisionToolsGroup')?.style.setProperty('display',mode==='collision'?'':'none');
  document.getElementById('worldMapToolsGroup')?.style.setProperty('display',mode==='worldmap'?'':'none');
  // A galeria de cenários vive dentro do painel de Pincéis (worldMapToolsGroup), então
  // é essa aba que precisa ficar aberta — não existe painel "worldmaptools" separado.
  document.querySelector('[data-btab="scenetools"]')?.click();
}
// A spawn hard against a border puts the character half off-screen and reads as
// "my player vanished". Pull it inward and onto walkable ground before using it.
const SPAWN_MARGIN = 110;
function safeSpawn(key){
  const sp = spawns[key] || {x:512,y:400};
  const prev = currentKey; currentKey = key;
  try{
    const inside = {
      x: Math.max(SPAWN_MARGIN, Math.min(SCREEN_W - SPAWN_MARGIN, sp.x)),
      y: Math.max(SPAWN_MARGIN, Math.min(SCREEN_H - SPAWN_MARGIN, sp.y)),
    };
    if (canMoveTo(inside.x, inside.y)) return inside;
    for (let r = 32; r <= 250; r += 32){
      for (let a = 0; a < 360; a += 45){
        const x = inside.x + r*Math.cos(a*Math.PI/180);
        const y = inside.y + r*Math.sin(a*Math.PI/180);
        if (x < SPAWN_MARGIN || x > SCREEN_W-SPAWN_MARGIN) continue;
        if (y < SPAWN_MARGIN || y > SCREEN_H-SPAWN_MARGIN) continue;
        if (canMoveTo(x,y)) return {x:Math.round(x), y:Math.round(y)};
      }
    }
    return inside;
  } finally { currentKey = prev; }
}

let jogoIniciado = false;          // já houve uma partida nesta sessão do editor
let ultimaPosicaoDeJogo = null;    // onde o jogador estava quando você apertou Parar

function togglePlay(){
  isPlayMode=!isPlayMode;
  if(isPlayMode){
    if(signpostWizard.active)resetSignpostWizard();
    setMode('scene');
    document.getElementById('bottom-panel')?.classList.add('collapsed');
    npcPlacingMode=false; canvas?.classList.remove('cursor-crosshair');
    playBtn?.classList.add('hidden'); stopBtn?.classList.remove('hidden');
    wasdPanel?.classList.remove('hidden');
    playerHud?.classList.remove('hidden');
    // Entrar em jogo nunca pode deixar o jogador travado por sobra de estado anterior.
    playerLocked = false; dlg.state = DLG_STATE.CLOSED;

    // Começo de jogo acontece no mapa de surgimento — só até a abertura ter rodado;
    // depois disso o ▶ testa o cenário em que o editor está. Mas se o menu já escolheu
    // o destino (cena com `estadoInicial`), ele manda: senão o mapa de surgimento
    // sobrescrevia a escolha e a cena abria no lugar errado.
    if(!window.__mapaDefinidoPelaCena&&startMap&&cenarioExiste(startMap)&&!CUT.jaRodou['mapa:'+startMap]){
      currentKey=startMap;
      if(activeMapSelect&&cenarioExiste(startMap))activeMapSelect.value=startMap;
      updateMapStatus();
    }
    // Retomada: volta exatamente para onde você estava, no mapa em que estava.
    const retoma = jogoIniciado && ultimaPosicaoDeJogo && ultimaPosicaoDeJogo.mapa === currentKey;
    if (retoma) {
      player.x = ultimaPosicaoDeJogo.x; player.y = ultimaPosicaoDeJogo.y;
      if (ultimaPosicaoDeJogo.cena && INTERIORS[ultimaPosicaoDeJogo.cena]) {
        currentScene = ultimaPosicaoDeJogo.cena;
      }
    } else {
      const sp=safeSpawn(currentKey);player.x=sp.x;player.y=sp.y;
      spawnFlashUntil=performance.now()+1600;
    }
    if (playerHp <= 0) playerHp = playerMaxHp();
    deadUntil=0; floaters.length=0;
    if (!retoma) {
      dropItems=[];
      monsters.forEach(m=>{m.dead=false;m.hp=m.maxHp;m.x=m.homeX;m.y=m.homeY;m.respawnAt=0;});
    }
    jogoIniciado = true;
    atualizarRastreador();
    showToast(retoma ? '▶ Retomando de onde você parou.' : '▶ Jogo iniciado! WASD para mover.');
    talvezIniciarCenaDoMapa(currentKey);   // a abertura roda aqui também, não só no celular
  } else {
    // Voltar ao editor no mapa em que você estava jogando: o seletor ficava no mapa
    // antigo e a impressão era de ter sido expulso do cenário.
    ultimaPosicaoDeJogo = { mapa: currentKey, x: player.x, y: player.y, cena: currentScene };
    if (currentScene !== 'world') { currentScene = 'world'; silenciarVideosDeInterior(); }
    if (activeMapSelect && cenarioExiste(currentKey)) activeMapSelect.value = currentKey;
    updateMapStatus?.(); refreshNPCHierarchy?.();
    playBtn?.classList.remove('hidden'); stopBtn?.classList.add('hidden');
    wasdPanel?.classList.add('hidden');
    playerHud?.classList.add('hidden'); closeStore();
    playerLocked=false; dlg.state=DLG_STATE.CLOSED; hideNameInput();
    keys.w=keys.a=keys.s=keys.d=false;
    atualizarRastreador();
    showToast('⏹ Parado. Voltou ao editor.');
  }
}
function setSceneTool(t){sceneSubTool=t;npcPlacingMode=false;document.querySelectorAll('[data-stool]').forEach(b=>b.classList.toggle('active',b.dataset.stool===t));}
function setCollisionTool(t){collisionTool=t;document.querySelectorAll('[data-ctool]').forEach(b=>b.classList.toggle('active',b.dataset.ctool===t));}
function setWVTool(t){worldMapSubTool=t;document.querySelectorAll('[data-wvtool]').forEach(b=>b.classList.toggle('active',b.dataset.wvtool===t));}

// The map picker was a hand-written list, so scenes added later never showed up in it.
function refreshMapSelect(){
  if(!activeMapSelect)return;
  const keep=activeMapSelect.value;
  activeMapSelect.innerHTML='';
  chavesDeCenario().forEach(k=>{
    const p=gridPos[k];
    const o=document.createElement('option');
    o.value=k;
    o.textContent=`${SCENE_NAMES[k]||k}${p?` (${p.col},${p.row})`:' (fora do grid)'}`;
    activeMapSelect.appendChild(o);
  });
  activeMapSelect.value=(bgSources[keep]||videoSources[keep])?keep:chavesDeCenario()[0];
}

// ============================================================
// BOTTOM PANEL TOGGLE
// ============================================================
function initBottomPanel(){
  bottomPanel=document.getElementById('bottom-panel');
  panelHandle=document.getElementById('panel-handle');
  panelHandle?.addEventListener('click',()=>bottomPanel?.classList.toggle('collapsed'));
  // Bottom tab switching
  document.querySelectorAll('.bottom-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.bottom-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      const target=tab.dataset.btab;
      document.querySelectorAll('.btab-content').forEach(c=>c.classList.add('hidden'));
      document.getElementById(`btab-${target}`)?.classList.remove('hidden');
    });
  });
}

// ============================================================
// STATUS
// ============================================================
function updateMapStatus(){
  if (typeof renderPaletaDeProps === 'function') renderPaletaDeProps();
  const name=SCENE_NAMES[currentKey]||currentKey;
  if(statusMap)statusMap.textContent=`🗺️ ${name}`;
}
let toastTimer=null;
function showToast(msg){if(!toastEl)return;toastEl.textContent=msg;toastEl.classList.remove('hidden');if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.add('hidden'),2500);}

// ============================================================
// MAIN LOOP
// ============================================================
// ── Câmera de destaque ───────────────────────────────────────────────────────────
// Aproxima a cena num ponto por alguns segundos, para apresentar alguém sem tirar o
// jogo das mãos do jogador. Entra e sai suavemente; sem destaque ativo não custa nada.
const camDestaque = { ativo: false, x: 0, y: 0, zoom: 1.7, inicio: 0, ms: 3200, rotulo: '' };

function destacar(x, y, opts = {}) {
  camDestaque.ativo = true;
  camDestaque.x = x; camDestaque.y = y;
  camDestaque.zoom = opts.zoom || 1.7;
  camDestaque.ms = opts.ms || 3200;
  camDestaque.rotulo = opts.rotulo || '';
  camDestaque.inicio = performance.now();
}

function forcaDoDestaque(now) {
  if (!camDestaque.ativo) return 0;
  const t = (now - camDestaque.inicio) / camDestaque.ms;
  if (t >= 1) { camDestaque.ativo = false; return 0; }
  const sobe = Math.min(1, t / 0.22);            // aproxima
  const desce = Math.min(1, (1 - t) / 0.25);     // e volta
  const f = Math.min(sobe, desce);
  return f * f * (3 - 2 * f);                    // suaviza as pontas
}

function aplicarCameraDeDestaque(now) {
  const f = forcaDoDestaque(now);
  if (f <= 0.001) return;
  const z = 1 + (camDestaque.zoom - 1) * f;
  // Mantém o alvo no centro da tela enquanto aproxima.
  ctx.translate(SCREEN_W / 2, SCREEN_H / 2);
  ctx.scale(z, z);
  ctx.translate(-camDestaque.x, -camDestaque.y);
}

function renderRotuloDoDestaque(now) {
  const f = forcaDoDestaque(now);
  if (f <= 0.02 || !camDestaque.rotulo) return;
  ctx.save();
  ctx.globalAlpha = f;
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(camDestaque.rotulo).width + 34;
  const y = SCREEN_H - 74;
  ctx.fillStyle = 'rgba(6,9,14,0.88)';
  ctx.fillRect(SCREEN_W/2 - w/2, y - 24, w, 36);
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
  ctx.strokeRect(SCREEN_W/2 - w/2, y - 24, w, 36);
  ctx.fillStyle = '#fde68a';
  ctx.fillText(camDestaque.rotulo, SCREEN_W/2, y);
  ctx.restore();
}

function loop(now){
  requestAnimationFrame(loop);
  frameCount++;
  if(now-lastFPSTime>=1000){currentFPS=frameCount;frameCount=0;lastFPSTime=now;if(fpsDisplay)fpsDisplay.textContent=`${currentFPS} FPS`;if(statusFPS)statusFPS.textContent=`${currentFPS} FPS`;}

  if(engineMode==='worldmap')return;   // desenhado pelo editor de mundo, em canvas próprio

  const mapKey=isPlayMode?currentKey:(activeMapSelect?.value||currentKey);
  const isMegaWorld = mapKey === 'mega_world';

  const dpr = canvas.width / SCREEN_W;
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,SCREEN_W,SCREEN_H);ctx.imageSmoothingEnabled=false;

  // O criador de mundo é uma área própria: desenha e sai. Isolar assim garante que
  // nenhuma linha do jogo antigo (grade de fotos, placas, cenas) seja afetada.
  if (engineMode === 'mundo') {
    renderMundo(now);
    ctx.restore();
    frameCount++;
    return;
  }
  const camOn = isPlayMode && forcaDoDestaque(now) > 0.001;
  if (camOn) { ctx.save(); aplicarCameraDeDestaque(now); }

  if (isMegaWorld) {
    if (!bgImages['mega_world']) {
      const img = new Image();
      img.src = 'assets/mega_map_1.jpg';
      bgImages['mega_world'] = img;
    }
    const dims = getMapDimensions('mega_world');
    const viewW = SCREEN_W / megaMapZoom;
    const viewH = SCREEN_H / megaMapZoom;

    megaCameraX = player.x - viewW / 2;
    megaCameraY = player.y - viewH / 2;
    megaCameraX = Math.max(0, Math.min(dims.w - viewW, megaCameraX));
    megaCameraY = Math.max(0, Math.min(dims.h - viewH, megaCameraY));

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(megaMapZoom, megaMapZoom);
    ctx.translate(-megaCameraX, -megaCameraY);

    const bg = bgImages['mega_world'];
    if (bg) {
      try { ctx.drawImage(bg, 0, 0, dims.w, dims.h); } catch(e) {}
    }
  } else {
    if(currentScene==='world'||!isPlayMode){
      const vid = videoDoMapa(mapKey);
      if (vid) ctx.drawImage(vid, 0, 0, SCREEN_W, SCREEN_H);
      else { const bg=bgImages[mapKey]; if(bg?.complete) ctx.drawImage(bg,0,0,SCREEN_W,SCREEN_H); }
    }
    else { const st=interiorDef()?.still?.(); if(st)ctx.drawImage(st,0,0,SCREEN_W,SCREEN_H); }
  }

  if(isPlayMode){
    // Cão de guarda: se o jogador está travado mas NADA está no comando (cena, diálogo,
    // menu, forja, captura, caminhada roteirizada), destrava. Um `controle: false` que
    // não foi desfeito congelava o personagem sem nenhuma pista na tela.
    // Diálogo sem roteiro é fantasma: não desenha nada mas engole todas as teclas,
    // porque o keydown devolve cedo quando dlg.state !== CLOSED.
    if (dlg.state !== DLG_STATE.CLOSED && !dlg.script) endDialogue();

    if (playerLocked && !CUT.ativo && dlg.state === DLG_STATE.CLOSED &&
        !shopOpen && !inventoryOpen && !charOpen && !forging && !capturaAtiva &&
        !(CUT.caminhadas && CUT.caminhadas.length)) {
      if (!window.__travadoDesde) window.__travadoDesde = now;
      else if (now - window.__travadoDesde > 900) {
        playerLocked = false; window.__travadoDesde = 0;
        console.warn('[Acordelot] destravado pelo cão de guarda — nada estava no comando');
      }
    } else window.__travadoDesde = 0;

    if(!playerLocked){
      let dx=0,dy=0;
      if(keys.w)dy-=1;if(keys.s)dy+=1;if(keys.a)dx-=1;if(keys.d)dx+=1;
      if(stick.active){dx=stick.x;dy=stick.y;}
      const len=Math.hypot(dx,dy);
      player.isMoving=len>0.15;
      if(player.isMoving){
        // Full deflection on the stick sprints, same as holding Shift on a keyboard.
        const sprint=keys.shift||len>0.92;
        const spd=(sprint?player.sprintSpeed:player.speed)*Math.min(1,len);
        dx/=len;dy/=len;
        if(Math.abs(dx)>Math.abs(dy))player.direction=dx<0?'left':'right';
        else player.direction=dy<0?'up':'down';
        const tx=player.x+dx*spd,ty=player.y+dy*spd;
        if(canMoveTo(tx,ty)){player.x=tx;player.y=ty;}
        else if(canMoveTo(tx,player.y))player.x=tx;
        else if(canMoveTo(player.x,ty))player.y=ty;
        const dims = isMegaWorld ? getMegaWorldDimensions() : { w: SCREEN_W, h: SCREEN_H };
        player.x = Math.max(28, Math.min(dims.w - 28, player.x));
        player.y = Math.max(32, Math.min(dims.h - 32, player.y));
        player.animTimer++;
        if(player.animTimer>=(sprint?3:6)){player.animTimer=0;player.animFrame=(player.animFrame+1)%4;if(player.animFrame%2===1){spawnDust(player.x,player.y);playStep(sprint);}}
      } else {player.animFrame=0;player.animTimer=0;}
      checkTransitions();checkDoors();checkNPCProx();
    }
    updateRespawn(now);updateMonsters(now);updateDrops(now);
    // The dialogue box owns the bottom of the screen, and movement is locked anyway.
    const talking=dlg.state!==DLG_STATE.CLOSED;
    wasdPanel?.classList.toggle('hidden', talking);
    const act=actionAvailable();
    keyE?.classList.toggle('disabled', !act);
    if(keyE&&act)keyE.textContent = 'E · ' + ({attack:'Atacar',shop:'Loja',forge:'Forjar',enter:'Entrar',enterForge:'Entrar',talk:'Falar',travel:'Viajar',gather:'Coletar'}[act]);
    // The stick zone covers a big chunk of the lower-left screen, which is exactly where
    // the dialogue box sits. Pull the whole overlay while talking so every tap reaches
    // the canvas — the player is locked in place anyway.
    // Some com o overlay em QUALQUER momento em que o jogador não comanda o personagem:
    // diálogo, cutscene, menu aberto, forja, captura. Checar só o diálogo deixava o
    // joystick e o botão de ação por cima das falas das cenas, no celular.
    // Não use CUT.ativo aqui: há cenas que devolvem o controle no meio (o "chegue perto
    // do guarda"), e esconder o joystick nessas horas trava o jogo no celular. Quem
    // responde a pergunta certa — "o jogador manda no personagem agora?" — é playerLocked.
    // `capturaAtiva` fica FORA desta lista de propósito: a janela de afinação dura pouco
    // mais de dois segundos e o botão de ação é o único jeito de ressoar no celular.
    // Escondê-lo aí garantiria o "dispersou" em toda captura.
    const semControle = talking || playerLocked ||
                        shopOpen || inventoryOpen || charOpen || forging;
    if(touchControls&&document.body.classList.contains('mobile-play')){
      touchControls.classList.toggle('hidden', semControle);
      if(semControle&&stick.active){stick.active=false;stick.x=stick.y=0;}
    }
    // Toda ação precisa de rótulo: sem entrada aqui o botão do celular ficava com o
    // texto da ação anterior, e o jogador não sabia que era para ressoar.
    const ACT_LABEL={attack:'Atacar',shop:'Loja',forge:'Forjar',enter:'Entrar',enterForge:'Entrar',
      talk:'Falar',travel:'Viajar',gather:'Coletar',ressoar:'RESSOAR',martelar:'Martelar',
      sair:'Sair',sortear:'Sortear',entrarPorta:'Entrar',forjarEscala:'Forjar Escala'};
    if(touchAction&&act)touchAction.textContent=ACT_LABEL[act];
    touchAction?.classList.toggle('disabled', !act);
    playerHud?.classList.toggle('hidden', talking||shopOpen||inventoryOpen||charOpen);
    if(coinCount)coinCount.textContent=playerCoins;
    if(claveCountEl)claveCountEl.textContent=`${claveCount}`;
    if(lvlNum)lvlNum.textContent=level;
    if(hpFill){
      const r=playerHp/playerMaxHp();
      hpFill.style.width=(r*100)+'%';
      hpFill.classList.toggle('low', r<=0.5&&r>0.25);
      hpFill.classList.toggle('critical', r<=0.25);
      const hpTxt = document.getElementById('hpText');
      if(hpTxt) hpTxt.textContent = `${Math.round(playerHp)} / ${playerMaxHp()}`;
    }
    if(xpFill){
      const need=xpForLevel(level);
      xpFill.style.width=Math.min(100,(xp/need)*100)+'%';
      if(xpLabel)xpLabel.textContent=`XP ${xp} / ${need}`;
    }
    // O aviso diz QUANTOS pontos esperam: bolinha sem número não informa nada.
    const pontos = (attrPoints||0) + (skillPoints||0);
    pointDot?.classList.toggle('hidden', pontos<=0);
    if (pointDot && pontos>0) {
      pointDot.textContent = pontos > 9 ? '9+' : pontos;
      pointDot.title = `${pontos} ponto${pontos>1?'s':''} para distribuir`;
    }
    // Interiors are their own space: the outdoor map's NPCs, chatter and overlays must
    // not bleed through onto the shop floor.
    const outdoors=currentScene==='world';
    if(outdoors){
      npcData.forEach(npc=>{if(npc.mapKey!==currentKey||npc.oculto)return;(NPC_DRAW[npc.type]||DEFAULT_NPC_DRAW)(ctx,npc,now);});
      renderDrops(now);   // on the ground, under everyone
      renderMonsters(now);
      renderObjetos(now, 'atras');   // pé acima do jogador: ele passa na frente
    }
    const L=getLayers(currentKey);
    updateDust();renderDust();
    // Brief ring on entering play so the character is never lost on a busy map.
    if(now < spawnFlashUntil){
      const t=(spawnFlashUntil-now)/1600, pulse=(Math.sin(now*0.012)+1)/2;
      ctx.save();
      ctx.globalAlpha=Math.min(1,t)*0.9;
      ctx.strokeStyle='#facc15'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.ellipse(player.x,player.y,30+pulse*8,13+pulse*4,0,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=Math.min(1,t)*0.5;
      ctx.beginPath(); ctx.ellipse(player.x,player.y,46+pulse*10,20+pulse*5,0,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    {const pW=outdoors?player.width:68,pH=outdoors?player.height:92;
     renderFerramenta(now,pW,pH,true);}      // atrás do corpo (andando para cima)
    // Fora do bloco de cenário externo: numa sala fechada a cena não avançava nunca,
    // congelava no primeiro `esperar` e deixava o jogador travado para sempre.
    atualizarCena(now);
    if (frameCount % 30 === 0) silenciarVideosDeInterior();

    renderPlayer();
    if(!player.oculto){const pW=outdoors?player.width:68,pH=outdoors?player.height:92;
     renderFerramenta(now,pW,pH,false);      // na frente, nas outras direções
     renderHat(pW,pH);renderAura(now,pH);}
    if(outdoors){
      renderObjetos(now, 'frente');  // pé abaixo do jogador: cobre o personagem
      renderAttackSwing(now);
      renderGatherSwing(now);
      ctx.drawImage(L.fgCanvas,0,0);renderDoorMarkers(now);updateLeaves();renderLeaves();
      updatePath();renderPath(now);
      updateAmbient(now);renderSpeech(now);renderFloaters(now);
      // Prompt over whatever the action button is currently pointing at — not just
      // NPCs. A door you can't see is a door that doesn't exist.
      const ACT_PROMPT={sortear:'E  ·  Tentar a Sorte',ressoar:'E  ·  RESSOAR',talk:'E  ·  Falar',travel:'E  ·  Viajar',gather:'E  ·  Coletar',enterForge:'E  ·  Entrar',martelar:'E  ·  Martelar',entrarPorta:'E  ·  Entrar'};
      const act=actionAvailable();
      const tgt = act==='talk' ? talkTarget()
                : act==='travel' ? signpostTarget()
                : act==='sortear' ? lagoTarget()
                : act==='entrarPorta' ? portaTarget()
                : act==='martelar' ? marteladaTarget()
                : act==='gather' ? spotTarget()
                : act==='enterForge' ? forgeDoorTarget() : null;
      if(tgt&&!speech.some(s=>s.npc===tgt)){
        const b=npcBounds(tgt);
        drawBubble(ctx,tgt.x,b.y-3,ACT_PROMPT[act],{bg:'rgba(251,191,36,0.92)',border:'#78350f',fg:'#1c1917',font:'bold 11px Outfit, sans-serif'});
      }

      // Interactable world elements get a soft beacon so they're findable from a distance.
      npcData.forEach(n=>{
        if(n.mapKey!==currentKey)return;
        if(n.type==='ponto_martelada'&&!marteladaTarget())return;
        // O gatilho do sorteio é invisível de propósito: o lago dourado já está pintado
        // no vídeo do cenário, então desenhar um anel por cima só sujaria a arte.
        if(n.type==='lago_sorteio')return;
        if(n.type==='porta'&&!n.interior)return;      // porta sem destino é só marcador
        if(n.type==='porta'){
          // Entrada de cenário especial: pilar de luz e faíscas subindo. Uma porta
          // discreta no meio do mato passa despercebida.
          const p2=(Math.sin(now*0.003)+1)/2;
          ctx.save();
          const g=ctx.createLinearGradient(n.x,n.y-150,n.x,n.y+10);
          g.addColorStop(0,'rgba(253,230,138,0)');
          g.addColorStop(1,`rgba(253,230,138,${0.16+p2*0.16})`);
          ctx.fillStyle=g;
          ctx.fillRect(n.x-34,n.y-150,68,160);
          ctx.globalAlpha=0.5+p2*0.4;
          ctx.strokeStyle='#fde68a'; ctx.lineWidth=2.5;
          ctx.shadowColor='#fbbf24'; ctx.shadowBlur=22;
          ctx.beginPath(); ctx.ellipse(n.x,n.y,40+p2*6,15+p2*3,0,0,Math.PI*2); ctx.stroke();
          ctx.fillStyle='#fde68a';
          for(let i=0;i<5;i++){
            const f=((now*0.0004)+i*0.2)%1;
            ctx.globalAlpha=(1-f)*0.8;
            ctx.fillRect(n.x-26+((i*37)%52), n.y-f*130, 2.5, 2.5);
          }
          ctx.restore();
          const b2=npcBounds(n);
          drawBubble(ctx,n.x,b2.y-6,SCENE_NAMES[n.interior]||INTERIORS[n.interior]?.name||'Entrada',
            {bg:'rgba(20,14,6,.9)',border:'#fde68a',fg:'#fde68a',font:'bold 11px Outfit, sans-serif'});
          return;
        }
        if(!['forge_entrance','signpost','spot_wood','spot_stone','ponto_martelada','porta','lago_sorteio'].includes(n.type))return;
        const d=Math.hypot(player.x-n.x,player.y-n.y);
        if(d>340)return;
        const b=npcBounds(n);
        const pulse=(Math.sin(now*0.0035)+1)/2;
        const near=d<=(n.triggerRadius||70);
        ctx.save();
        ctx.globalAlpha=(near?0.55:0.28)+pulse*0.2;
        ctx.strokeStyle=near?'#fde047':'#fbbf24'; ctx.lineWidth=2;
        ctx.beginPath();
        ctx.ellipse(n.x,n.y,b.w*0.55+pulse*3,b.w*0.24+pulse*2,0,0,Math.PI*2);
        ctx.stroke();
        ctx.restore();
      });
    }
    if (outdoors) { renderMarcadoresDeNPC(now); renderCaptura(now); renderRessonancia(now); }
    else { renderSpeech(now); renderFloaters(now); }
    if (!IS_PLAY_BUILD) renderMotivoDoTravamento();
    else renderMarcadoresDoInterior(now);
    if (camOn) { ctx.restore(); renderRotuloDoDestaque(now); }
    renderAmbiente();
    renderDlg(now);
    renderNotasGuia(now);
    renderCena(now);
    if(statusPos)statusPos.textContent=`X: ${Math.round(player.x)}  Y: ${Math.round(player.y)}`;
  } else {
    npcData.forEach(npc=>{if(npc.mapKey!==mapKey)return;(NPC_DRAW[npc.type]||DEFAULT_NPC_DRAW)(ctx,npc,now);});
    renderObjetos(now, 'todos');   // sem isto o editor não mostrava o que você plantou
    const L=getLayers(mapKey);ctx.drawImage(L.fgCanvas,0,0);
    if(engineMode==='collision')renderCollisionOverlay(mapKey);
    else if(engineMode==='scene')renderSceneOverlay(now);
    if(statusPos)statusPos.textContent=`X: ${Math.round(mouseCanvasX)}  Y: ${Math.round(mouseCanvasY)}`;
  }

  if (isMegaWorld) {
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================
// INIT
// ============================================================
function setupHighDPICanvas() {
  if (!canvas) return;
  // A resolução interna acompanha o tamanho REAL em tela, não um múltiplo fixo. Num
  // monitor grande o canvas era desenhado a 2048px e esticado para ~2600, o que
  // borrava a arte; agora ele desenha na densidade que o painel realmente tem.
  const r = canvas.getBoundingClientRect();
  const densidade = window.devicePixelRatio || 1;
  const larguraCss = r.width > 40 ? r.width : SCREEN_W;
  // Quantos pixels reais existem para cada unidade lógica do jogo, com teto para não
  // torrar memória em telas 4K.
  const escala = Math.min(4, Math.max(2, (larguraCss * densidade) / SCREEN_W));
  const targetW = Math.round(SCREEN_W * escala);
  const targetH = Math.round(SCREEN_H * escala);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;   // pixel art: nunca suavizar
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  canvas=document.getElementById('gameCanvas');
  ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  setupHighDPICanvas();
  window.addEventListener('resize', setupHighDPICanvas);
  window.addEventListener('orientationchange', () => setTimeout(setupHighDPICanvas, 120));
  if (window.ResizeObserver) new ResizeObserver(setupHighDPICanvas).observe(canvas);
  bindCanvasEvents();
  skinShopVideo=document.getElementById('skinShopVideo');
  loadingOverlay=document.getElementById('loadingOverlay');
  toastEl=document.getElementById('toastEl');
  questNotif=document.getElementById('questNotification');
  questNotifTitle=document.getElementById('questNotifTitle');
  questNotifObj=document.getElementById('questNotifObj');
  nameInputOverlay=document.getElementById('nameInputOverlay');
  playerNameInput=document.getElementById('playerNameInput');
  confirmNameBtn=document.getElementById('confirmNameBtn');
  fpsDisplay=document.getElementById('fpsDisplay');
  statusMap=document.getElementById('statusMap');
  statusPos=document.getElementById('statusPos');
  statusFPS=document.getElementById('statusFPS');
  activeMapSelect=document.getElementById('activeMapSelect');
  npcHierarchyList=document.getElementById('npcHierarchyList');
  inspEmpty=document.getElementById('inspEmpty');
  inspNPCPanel=document.getElementById('inspNPCPanel');
  inspName=document.getElementById('insp_name'); inspType=document.getElementById('insp_type');
  inspX=document.getElementById('insp_x'); inspY=document.getElementById('insp_y');
  inspMap=document.getElementById('insp_map'); inspDialogue=document.getElementById('insp_dialogue');
  inspRadius=document.getElementById('insp_radius'); inspScale=document.getElementById('insp_scale');
  inspFlip=document.getElementById('insp_flip'); inspTriggered=document.getElementById('insp_triggered');
  applyNPCBtn=document.getElementById('applyNPCBtn'); deleteNPCBtn=document.getElementById('deleteNPCBtn');
  playBtn=document.getElementById('playBtn'); stopBtn=document.getElementById('stopBtn');
  saveProjectBtn=document.getElementById('saveProjectBtn');
  brushSizeSelect=document.getElementById('brushSizeSelect');
  fillDefaultBtn=document.getElementById('fillDefaultBtn'); clearLayerBtn=document.getElementById('clearLayerBtn'); saveLayersBtn=document.getElementById('saveLayersBtn');
  resetGridBtn=document.getElementById('resetGridBtn'); saveWorldBtn=document.getElementById('saveWorldBtn');
  wasdPanel=document.getElementById('wasdPanel');
  keyW=document.getElementById('keyW'); keyA=document.getElementById('keyA'); keyS=document.getElementById('keyS'); keyD=document.getElementById('keyD');
  keyE=document.getElementById('keyE');
  keyE?.addEventListener('click',()=>{initAudio();doAction();});
  activeQuestsList=document.getElementById('activeQuestsList');

  initBottomPanel();

  // Mode tabs
  document.querySelectorAll('.mode-tab').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));
  // Scene subtools
  document.querySelectorAll('[data-stool]').forEach(btn=>btn.addEventListener('click',()=>setSceneTool(btn.dataset.stool)));
  // Collision subtools
  document.querySelectorAll('[data-ctool]').forEach(btn=>btn.addEventListener('click',()=>setCollisionTool(btn.dataset.ctool)));
  // WV subtools
  document.querySelectorAll('[data-wvtool]').forEach(btn=>btn.addEventListener('click',()=>setWVTool(btn.dataset.wvtool)));

  // ▶ Jogar: na primeira vez abre o menu; depois RETOMA de onde parou, no mesmo mapa
  // e na mesma posição. Editar e testar é um vaivém constante — refazer o caminho a
  // cada teste é o que mais custa tempo.
  playBtn?.addEventListener('click', () => {
    initAudio();
    const menu = document.getElementById('mainMenuOverlay');
    if (jogoIniciado) { togglePlay(); return; }
    if (menu && !isPlayMode) {
      menu.classList.remove('hidden');
      renderHeroAvatars();
    } else togglePlay();
  });
  // Segurar Shift ao clicar força o menu, para quando você quiser recomeçar de fato.
  playBtn?.addEventListener('mousedown', e => { if (e.shiftKey) jogoIniciado = false; });
  stopBtn?.addEventListener('click',()=>togglePlay());
  // Monstros entram aqui também: o botão diz "Salvar", e quem clica nele espera que
  // TUDO seja gravado. Faltar os monstros aqui já custou uma sessão de edição.
  saveProjectBtn?.addEventListener('click',()=>{saveAllLayers(false);saveNPCs();saveMonsters();saveObjetos();showToast('💾 Projeto salvo!');});
  saveLayersBtn?.addEventListener('click',()=>saveAllLayers(true));
  saveWorldBtn?.addEventListener('click',()=>saveAllLayers(true));
  brushSizeSelect?.addEventListener('change',e=>brushSize=parseInt(e.target.value));
  document.getElementById('autoRoofBtn')?.addEventListener('click',()=>{
    autoRoofFromRoad(activeMapSelect?.value||currentKey);
  });
  fillDefaultBtn?.addEventListener('click',()=>{
    const k=activeMapSelect?.value||currentKey;const L=getLayers(k);
    L.roadCtx.clearRect(0,0,SCREEN_W,SCREEN_H);L.fgCtx.clearRect(0,0,SCREEN_W,SCREEN_H);L.doorCtx.clearRect(0,0,SCREEN_W,SCREEN_H);
    L.roadCtx.fillStyle='#22c55e';L.roadCtx.fillRect(430,0,164,SCREEN_H);L.roadCtx.fillRect(0,230,SCREEN_W,140);
    showToast('🪄 Caminho padrão criado!');saveAllLayers(false);
  });
  clearLayerBtn?.addEventListener('click',()=>{
    const k=activeMapSelect?.value||currentKey;const L=getLayers(k);
    L.roadCtx.clearRect(0,0,SCREEN_W,SCREEN_H);L.fgCtx.clearRect(0,0,SCREEN_W,SCREEN_H);L.doorCtx.clearRect(0,0,SCREEN_W,SCREEN_H);
    showToast('🗑️ Camadas limpas!');saveAllLayers(false);
  });
  resetGridBtn?.addEventListener('click',()=>{
    gridPos={'0_0':{col:0,row:0},'1_0':{col:1,row:0},'2_0':{col:2,row:0},'0_1':{col:0,row:1},'1_1':{col:1,row:1}};
    rebuildGrid();showToast('🔄 Grid reorganizado!');saveAllLayers(false);
  });
  document.getElementById('resetGridBtn2')?.addEventListener('click',()=>resetGridBtn?.click());
  document.getElementById('saveWorldBtn2')?.addEventListener('click',()=>saveWorldBtn?.click());

  const startPlacing=()=>{if(engineMode!=='scene')setMode('scene');npcPlacingMode=true;canvas.classList.add('cursor-crosshair');showToast('📍 Clique no mapa para posicionar o NPC');};
  document.getElementById('addNPCHierBtn')?.addEventListener('click',startPlacing);
  document.getElementById('addNPCToolBtn')?.addEventListener('click',startPlacing);

  applyNPCBtn?.addEventListener('click',()=>{
    if(!selectedNPC)return;
    selectedNPC.name=inspName?.value||selectedNPC.name;
    selectedNPC.type=inspType?.value||selectedNPC.type;
    selectedNPC.x=parseInt(inspX?.value)||selectedNPC.x;
    selectedNPC.y=parseInt(inspY?.value)||selectedNPC.y;
    selectedNPC.mapKey=inspMap?.value||selectedNPC.mapKey;
    selectedNPC.dialogue=inspDialogue?.value||'none';
    selectedNPC.triggerRadius=parseInt(inspRadius?.value)||80;
    selectedNPC.scale=parseFloat(inspScale?.value)||1;
    selectedNPC.flipX=inspFlip?.checked||false;
    selectedNPC.triggered=inspTriggered?.checked||false;
    refreshNPCHierarchy();saveNPCs();showToast('✅ NPC salvo!');
  });
  deleteNPCBtn?.addEventListener('click',()=>{
    if(!selectedNPC)return;const i=npcData.indexOf(selectedNPC);if(i>=0)npcData.splice(i,1);
    deselectNPC();refreshNPCHierarchy();saveNPCs();showToast('🗑️ NPC removido!');
  });

  confirmNameBtn?.addEventListener('click',()=>{
    const v=playerNameInput?.value?.trim();if(!v||v.length<1){showToast('⚠️ Digite um nome!');return;}
    playerName=v;hideNameInput();dlg.stepId=dlg._nextStep;dlg.state=DLG_STATE.CLOSED;setTimeout(()=>processStep(),100);
  });
  playerNameInput?.addEventListener('keydown',e=>{if(e.key==='Enter')confirmNameBtn?.click();});

  // Guard against an empty/unknown value: assigning it to currentKey blanks the whole
  // editor (no background, no layers) and everything looks broken.
  activeMapSelect?.addEventListener('change',()=>{
    const v=activeMapSelect.value;
    if(!bgSources[v]){activeMapSelect.value=currentKey;return;}
    currentKey=v;updateMapStatus();refreshNPCHierarchy();
  });

  // WASD mobile
  if(keyW){[[keyW,'w'],[keyA,'a'],[keyS,'s'],[keyD,'d']].forEach(([el,k])=>{
    ['mousedown','touchstart'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();initAudio();keys[k]=true;el.classList.add('active');}));
    ['mouseup','mouseleave','touchend'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();keys[k]=false;el.classList.remove('active');}));
  });}

  rebuildGrid();refreshMapSelect();updateMapStatus();
  weBind();
  bindTouchControls();
  initMobileEditorToggle();
  initModoTablet();
  initCustomProps();
  bindStoreUI();
  bindCharUI();
  initDialogueEditor();
  initGalleryDragAndDrop();
  initRealtimeInspectorControls();
  initOrnateInventory();
  initForgeUI();
  loadToolSheets();
  loadMagiaSheets();
  loadSpotSheets();
  initHotbar();
  initScenarioUploader();
  initMegaWorldControls();
  initTesteDeCena();
  blockIOSGestures();
  if(wantsMobilePlay())enterMobilePlay();
  abrirMenuInicialSePreciso();
  iniciarAutosave();
  setTimeout(()=>loadingOverlay?.classList.add('hidden'),600);
  requestAnimationFrame(loop);
});

// Botão de teste: libera a trava de "já rodou" e dispara a abertura na hora, para
// conseguir rever a cena quantas vezes precisar durante a autoria.
function initTesteDeCena() {
  document.getElementById('testarCenaBtn')?.addEventListener('click', async () => {
    if (!CUT.roteiros.length) await carregarCatalogoDeCenas();
    // Roda a cena do mapa aberto no editor; sem cena aqui, cai na abertura.
    const mapa = activeMapSelect?.value || currentKey;
    const r = cenaDoMapa(mapa) || window.__abertura;
    if (!r) { showToast('⚠️ Nenhuma cena cadastrada em assets/cutscenes/index.json'); return; }
    if (!bgSources[r.mapa]) { showToast('⚠️ O cenário da cena não existe mais: ' + r.mapa); return; }
    CUT.jaRodou = {};
    try { localStorage.removeItem('acordelot_cenas'); } catch (e) {}
    if (CUT.ativo) encerrarCena();
    iniciarCena(r);
    showToast(`🎬 ${r.nome || r.id}`);
  });
}

function initMegaWorldControls() {
  const zoomRange = document.getElementById('zoomRange');
  const zoomVal = document.getElementById('zoomVal');
  const playerSizeRange = document.getElementById('playerSizeRange');
  const playerSizeVal = document.getElementById('playerSizeVal');
  const playerSpeedRange = document.getElementById('playerSpeedRange');
  const playerSpeedVal = document.getElementById('playerSpeedVal');
  const megaBar = document.getElementById('megaControlBar');
  const megaMinBtn = document.getElementById('megaMinBtn');
  const megaCloseBtn = document.getElementById('megaCloseBtn');
  const megaPillBtn = document.getElementById('megaPillBtn');
  const megaModeBtn = document.getElementById('megaModeBtn');
  const uploadMega2KBtn = document.getElementById('uploadMega2KBtn');
  const megaFileInput = document.getElementById('megaFileInput');


  if (uploadMega2KBtn && megaFileInput) {
    uploadMega2KBtn.addEventListener('click', () => megaFileInput.click());
    megaFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      showToast('⏳ Processando imagem HD...');
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const b64 = ev.target.result;
        const img = new Image();
        img.onload = () => {
          bgImages['mega_world'] = img;
          showToast(`🎉 Imagem HD Carregada! (${img.naturalWidth}x${img.naturalHeight}px)`);
        };
        img.src = b64;
        try {
          await fetch('/upload_image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: 'mega_map_1.jpg', image: b64 })
          });
        } catch(err) {}
      };
      reader.readAsDataURL(file);
    });
  }

  // Mouse Wheel Zoom / Sprite Scaling directly on canvas!
  if (canvas) {
    canvas.addEventListener('wheel', (e) => {
      const targetObj = (engineMode === 'mundo' ? mundoPropSel : objetoSelecionado);
      if (targetObj && !isPlayMode) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        if (engineMode === 'mundo') {
          targetObj.ex = Math.max(0.1, Math.min(10, (targetObj.ex || targetObj.escala || 1) * factor));
          targetObj.ey = Math.max(0.1, Math.min(10, (targetObj.ey || targetObj.escala || 1) * factor));
          saveMundo();
        } else {
          targetObj.escala = Math.max(0.1, Math.min(10, (targetObj.escala || 1) * factor));
          aplicarEscalaDoObjeto(targetObj.escala);
          saveObjetos();
        }
        return;
      }
      if (engineMode === 'mundo') { e.preventDefault(); mundoZoom(e.deltaY); return; }
      if (currentKey !== 'mega_world' && activeMapSelect?.value !== 'mega_world') return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      megaMapZoom = Math.max(1.0, Math.min(4.0, megaMapZoom + delta));
      if (zoomRange) zoomRange.value = megaMapZoom.toFixed(1);
      if (zoomVal) zoomVal.textContent = megaMapZoom.toFixed(1) + 'x';
    }, { passive: false });
  }

  if (zoomRange) {
    zoomRange.addEventListener('input', (e) => {
      megaMapZoom = parseFloat(e.target.value);
      if (zoomVal) zoomVal.textContent = megaMapZoom.toFixed(1) + 'x';
    });
  }

  if (playerSizeRange) {
    playerSizeRange.addEventListener('input', (e) => {
      playerCustomHeight = parseInt(e.target.value, 10);
      if (playerSizeVal) playerSizeVal.textContent = playerCustomHeight + 'px';
      player.height = playerCustomHeight;
      player.width = Math.round(playerCustomHeight * (48 / 64));
    });
  }

  if (playerSpeedRange) {
    playerSpeedRange.addEventListener('input', (e) => {
      const spd = parseFloat(e.target.value);
      if (playerSpeedVal) playerSpeedVal.textContent = spd.toFixed(1);
      player.speed = spd;
      player.sprintSpeed = spd * 1.7;
    });
  }

  if (megaMinBtn) {
    megaMinBtn.addEventListener('click', () => {
      megaBar?.classList.add('hidden');
      megaPillBtn?.classList.remove('hidden');
    });
  }

  if (megaPillBtn) {
    megaPillBtn.addEventListener('click', () => {
      megaPillBtn?.classList.add('hidden');
      megaBar?.classList.remove('hidden');
    });
  }

  if (megaCloseBtn) {
    megaCloseBtn.addEventListener('click', () => {
      megaBar?.classList.add('hidden');
      megaPillBtn?.classList.add('hidden');
    });
  }

  if (megaModeBtn) {
    megaModeBtn.addEventListener('click', () => {
      currentKey = 'mega_world';
      if (activeMapSelect) activeMapSelect.value = 'mega_world';
      megaBar?.classList.remove('hidden');
      megaPillBtn?.classList.remove('hidden');
      const dims = getMegaWorldDimensions();
      player.x = dims.w / 2;
      player.y = dims.h / 2;
      if (!isPlayMode) togglePlay();
      showToast('🗺️ Mega Cenário 2K (Modo Zoom & Câmera) Ativado!');
    });
  }

  const photoRecriadoBtn = document.getElementById('photoRecriadoBtn');
  if (photoRecriadoBtn) {
    photoRecriadoBtn.addEventListener('click', () => {
      currentKey = 'photo_recriado';
      if (activeMapSelect) activeMapSelect.value = 'photo_recriado';
      megaBar?.classList.add('hidden');
      megaPillBtn?.classList.add('hidden');
      player.x = 688;
      player.y = 384;
      if (!isPlayMode) togglePlay();
      showToast('📸 Cenário Recriado de Foto Ativado!');
    });
  }

  initMainMenu();
  initQuestBuilder();
  loadHeroSprites();
}

// Todas as folhas são 4x4 com fundo branco, no mesmo formato do Arthur: linha 0 de
// frente, 1 de costas, 2 de lado (espelhada para a esquerda), 4 quadros por linha.
// As antigas hero_male_2.png / hero_female_*.png eram capturas de tela, não sprites —
// era por isso que os personagens novos não apareciam.
const HERO_DEFINITIONS = {
  'arthur': { id: 'arthur', name: 'Arthur', class: 'Guerreiro', gender: 'Masculino', src: 'assets/spritesheet.jpg' },
  'lucian': { id: 'lucian', name: 'Lucian', class: 'Aldeão',    gender: 'Masculino', src: 'assets/hero_h1.jpg' },
  'elena':  { id: 'elena',  name: 'Elena',  class: 'Corredora', gender: 'Feminino',  src: 'assets/hero_h2.jpg' },
  'lyra':   { id: 'lyra',   name: 'Lyra',   class: 'Viajante',  gender: 'Feminino',  src: 'assets/hero_h3.jpg' }
};
let selectedHeroId = 'arthur';
const heroImages = {};
const processedHeroSprites = {};

function hero_isPNG(id) {
  const def = HERO_DEFINITIONS[id];
  return def && def.src && def.src.toLowerCase().endsWith('.png');
}

function loadHeroSprites() {
  for (const [id, hero] of Object.entries(HERO_DEFINITIONS)) {
    const img = new Image();
    img.onload = () => {
      processHeroSprite(id, img);
      renderHeroAvatars();
    };
    img.src = hero.src;
    heroImages[id] = img;
  }
}

function processHeroSprite(id, imgRaw) {
  try {
    if (!imgRaw || !imgRaw.complete || imgRaw.naturalWidth < 10) return;
    const off = document.createElement('canvas');
    off.width = imgRaw.naturalWidth;
    off.height = imgRaw.naturalHeight;
    const oc = off.getContext('2d');
    oc.drawImage(imgRaw, 0, 0);

    // PNG heroes (Lucian, Elena, Lyra) are native RGBA — no getImageData needed.
    // Only strip white for Arthur's JPG spritesheet (no alpha channel).
    if (!hero_isPNG(id)) {
      try {
        const idata = oc.getImageData(0, 0, off.width, off.height);
        const d = idata.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 215 && d[i+1] > 215 && d[i+2] > 215) d[i+3] = 0;
        }
        oc.putImageData(idata, 0, 0);
      } catch(e) { /* canvas security — keep as-is */ }
    }

    processedHeroSprites[id] = off;
    if (id === selectedHeroId) processedSprite = off;
  } catch(e) {}
}

function renderHeroAvatars() {
  for (const [id] of Object.entries(HERO_DEFINITIONS)) {
    // Priority: processed canvas → raw HTMLImageElement → processedSprite (Arthur fallback)
    const spr = processedHeroSprites[id];
    const img = heroImages[id];
    const src = (spr && spr.width > 10) ? spr
              : (img && img.complete && img.naturalWidth > 10) ? img
              : (id === 'arthur' && processedSprite && processedSprite.width > 10) ? processedSprite
              : null;
    if (!src) continue;

    const card = document.querySelector(`.hero-select-card[data-heroid="${id}"]`);
    if (!card) continue;
    const box = card.querySelector('.hero-avatar-box');
    if (!box) continue;

    const srcW = src instanceof HTMLImageElement ? src.naturalWidth  : src.width;
    const srcH = src instanceof HTMLImageElement ? src.naturalHeight : src.height;
    const frameW = Math.floor(srcW / 4);
    const frameH = Math.floor(srcH / 4);

    const av = document.createElement('canvas');
    av.width = 52; av.height = 52;
    const ac = av.getContext('2d');
    ac.imageSmoothingEnabled = false;
    ac.fillStyle = '#0f172a';
    ac.fillRect(0, 0, 52, 52);

    try {
      // Front-facing frame: row 0, col 0, top 70% of frame height (head + torso)
      ac.drawImage(src, 0, 0, frameW, Math.floor(frameH * 0.70), 2, 2, 48, 48);
      box.innerHTML = '';
      box.appendChild(av);
    } catch(e) {}
  }
}

function initMainMenu() {
  const mainMenuOverlay = document.getElementById('mainMenuOverlay');
  const menuPlayerName = document.getElementById('menuPlayerName');
  const startAdventureBtn = document.getElementById('startAdventureBtn');
  const heroCards = document.querySelectorAll('.hero-select-card');

  renderHeroAvatars();

  // Keep retrying until all 4 hero avatars are rendered (images load async)
  (function pollAvatars() {
    const allDone = Object.keys(HERO_DEFINITIONS).every(id => {
      const spr = processedHeroSprites[id];
      return (spr && spr.width > 10) ||
             (heroImages[id] && heroImages[id].complete && heroImages[id].naturalWidth > 10);
    });
    renderHeroAvatars();
    if (!allDone) setTimeout(pollAvatars, 120);
  })();

  heroCards.forEach(card => {
    card.addEventListener('click', () => {
      heroCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedHeroId = card.dataset.heroid;
      const spr = processedHeroSprites[selectedHeroId];
      if (spr && spr.width > 10) processedSprite = spr;
    });
  });

  document.getElementById('continueBtn')?.addEventListener('click', () => {
    initAudio(); continuarJogo();
  });

  startAdventureBtn?.addEventListener('click', async () => {
   try {
    if (menuPlayerName && menuPlayerName.value.trim()) {
      playerName = menuPlayerName.value.trim();
    }
    mainMenuOverlay?.classList.add('hidden');

    try { localStorage.removeItem('acordelot_cenas'); } catch (e) {}

    // Aventura nova começa sem ferramentas: o martelo precisa ser conquistado na forja,
    // senão a missão do Dorn nasce cumprida e o jogador já entra em cena armado.
    reiniciarProgressoDeJogo();

    // O ponto de partida vem do menu: uma cena específica, ou direto no mapa inicial.
    const escolha = document.getElementById('menuStartPoint')?.value || '';
    const cenaEscolhida = escolha.startsWith('cena:')
      ? CUT.roteiros.find(r => r.id === escolha.slice(5)) : null;

    const modoLivre = escolha === 'livre';
    const startMapKey = modoLivre ? '0_0'
      : (cenaEscolhida?.mapa
      || ((startMap && cenarioExiste(startMap)) ? startMap : 'custom_1785173102424_996'));
    if (cenarioExiste(startMapKey)) {
      currentKey = startMapKey;
      if (activeMapSelect) activeMapSelect.value = startMapKey;
      updateMapStatus();
    }

    // Marcar TODAS as outras cenas como vistas matava a continuação: as cenas seguintes
    // nasciam bloqueadas e o arco parava de andar. Só as anteriores à escolhida são
    // puladas — e o estado que elas dariam (missões concluídas) é aplicado junto, para
    // que quem começa no meio da história não fique com pré-requisito faltando.
    CUT.jaRodou = {};
    const ordem = CUT.roteiros.indexOf(cenaEscolhida);
    if (ordem > 0) {
      CUT.roteiros.slice(0, ordem).forEach(r => {
        marcarCenaRodada(r);
        (r.passos || []).forEach(p => {
          if (p.cmd === 'missao' && p.id && !completedQuests.includes(p.id)) completedQuests.push(p.id);
          if (p.cmd === 'dar') {
            if (p.item === 'clave') claveCount += (p.quantidade || 1);
            else playerInventory[p.item] = (playerInventory[p.item] || 0) + (p.quantidade || 1);
          }
        });
      });
      updateInventorySlotsUI?.();
    }

    // Cada cena pode declarar o estado que ela pressupõe (`estadoInicial` no JSON).
    // Começar pela Cena 10 sem Ressonador deixava o jogador preso: o diálogo dizia
    // que ele já tinha um. Agora entrar no meio da história entrega o que a história
    // já teria entregado.
    // Modo livre: nada de cena, tudo liberado. É a porta de entrada para editar o mundo
    // andando por ele, como se a história inteira já tivesse acontecido.
    if (modoLivre) {
      CUT.roteiros.forEach(r => marcarCenaRodada(r));
      questsData.forEach(q => { if (!completedQuests.includes(q.id)) completedQuests.push(q.id); });
      activeQuests = [];
      aplicarEstadoInicial({ estadoInicial: {
        nivel: 8, claves: 40, moedas: 900,
        forjar: ['hammer_ferro', 'reson_cobre', 'axe_bronze', 'pick_bronze'],
        qualidade: 'ressonante',
        itens: { fragmento: 60, fragmento_puro: 10, tom: 10, semitom: 6, wood: 30, stone: 30, potions: 5 },
        notas: CROMATICA.map(n => n.id),
      }});
      showToast('🔓 Modo livre — todas as cenas já vistas, tudo desbloqueado.');
    }

    window.__mapaDefinidoPelaCena = modoLivre || !!(cenaEscolhida?.mapa || cenaEscolhida?.estadoInicial?.mapa);
    if (!modoLivre) aplicarEstadoInicial(cenaEscolhida);

    jogoIniciado = false; ultimaPosicaoDeJogo = null;   // partida nova, do começo
    if (!isPlayMode) togglePlay();
    window.__mapaDefinidoPelaCena = false;

    if (wantsMobilePlay() || document.body.classList.contains('mobile-play')) {
      document.getElementById('touchControls')?.classList.remove('hidden');
    }

    if (cenaEscolhida) iniciarCena(cenaEscolhida);
    else showToast(`⚔️ Bem-vindo a Acordelot, ${playerName}!`);
   } catch (err) {
    // Sair do menu sem entrar no jogo é o pior desfecho possível: garante o play mode.
    console.error('Falha ao iniciar a aventura:', err);
    if (!isPlayMode) togglePlay();
    showToast('⚠️ A aventura começou, mas a abertura falhou — veja o console.');
   }
  });
}

function initQuestBuilder() {
  const createQuestBtn = document.getElementById('createQuestBtn');
  const questTitleInput = document.getElementById('questTitleInput');
  const questDescInput = document.getElementById('questDescInput');
  const questTypeSelect = document.getElementById('questTypeSelect');
  const questAmountInput = document.getElementById('questAmountInput');
  const questRewardSelect = document.getElementById('questRewardSelect');

  createQuestBtn?.addEventListener('click', () => {
    const title = questTitleInput?.value.trim() || 'Nova Missão';
    const desc = questDescInput?.value.trim() || 'Complete o objetivo para ganhar a recompensa.';
    const type = questTypeSelect?.value || 'collect';
    const amount = parseInt(questAmountInput?.value || '3', 10);
    const reward = questRewardSelect?.value || '100 XP + Poção de Vida';

    const newQuest = {
      id: `quest_${Date.now()}`,
      title: title,
      description: desc,
      type: type,
      targetAmount: amount,
      currentAmount: 0,
      reward: reward,
      completed: false,
      active: true
    };

    questsData.push(newQuest);
    renderQuestBuilderList();
    activateQuestInGame(newQuest);
    showToast(`✨ Missão "${title}" Criada e Ativada!`);

    if (questTitleInput) questTitleInput.value = '';
    if (questDescInput) questDescInput.value = '';
  });

  renderQuestBuilderList();
}

function renderQuestBuilderList() {
  const questListBuilder = document.getElementById('questListBuilder');
  if (!questListBuilder) return;
  if (!questsData.length) {
    questListBuilder.innerHTML = `<div class="empty-msg">Nenhuma missão criada ainda</div>`;
    return;
  }

  questListBuilder.innerHTML = questsData.map((q, idx) => `
    <div class="quest-card-item">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="quest-card-title">📜 ${q.title || 'Missão'}</span>
        <span class="quest-type-tag quest-type-${q.type || 'collect'}">${q.type || 'coleta'}</span>
      </div>
      <div style="font-size:10px; color:#cbd5e1;">${q.description || ''}</div>
      <div style="font-size:9px; color:#f59e0b; font-weight:bold;">Progresso: ${q.currentAmount || 0}/${q.targetAmount || 3} · Recompensa: ${q.reward || '100 XP'}</div>
      <button class="btn-card-add" onclick="testQuest(${idx})" style="background:#d97706; margin-top:4px;">▶ Testar Missão em Tempo Real</button>
    </div>
  `).join('');
}

function activateQuestInGame(q) {
  const notif = document.getElementById('questNotification');
  const titleEl = document.getElementById('questNotifTitle');
  const objEl = document.getElementById('questNotifObj');
  if (titleEl) titleEl.textContent = `📜 ${q.title}`;
  if (objEl) objEl.textContent = `${q.description} (${q.currentAmount || 0}/${q.targetAmount || 3})`;
  notif?.classList.remove('hidden');
}

window.testQuest = function(idx) {
  const q = questsData[idx];
  if (!q) return;
  q.completed = false;
  q.currentAmount = 0;
  q.active = true;
  activateQuestInGame(q);
  showToast(`▶ Testando Missão: "${q.title}"`);
};

async function finishInit(){
  await loadWorldConfig();await loadLayers();await loadNPCs();await loadQuests();await loadShopCatalog();await loadMonsters();await loadObjetos();await loadMundo();await loadSkillTree();
  refreshMapSelect();
  renderQuestBuilderList();
  // /edit entra direto no Criador de Mundo: é o app principal agora, e ninguém quer
  // atravessar o editor de cenários antigo para chegar no mapa.
  if (/^\/(edit|editor)\/?$/.test(location.pathname)) {
    // Três tentativas: a aba do modo só existe depois que o cabeçalho é montado, e uma
    // única chamada às vezes chegava antes disso — a página abria no editor antigo.
    [200, 700, 1500].forEach(t => setTimeout(() => {
      if (engineMode !== 'mundo') document.querySelector('[data-mode="mundo"]')?.click();
    }, t));
  }
  // A paleta de props precisa de duas passadas: uma agora, com o catálogo já lido, e
  // outra quando os PNGs terminarem de decodificar — só então há miniatura para mostrar.
  renderPaletaDeProps();
  setTimeout(renderPaletaDeProps, 700);
  loadingOverlay?.classList.add('hidden');updateMapStatus();
  showToast('🎵 Acordelot Engine carregado!');

  // Cena de abertura: roda uma vez por jogador, e nunca dentro do editor.
  try { CUT.jaRodou = JSON.parse(localStorage.getItem('acordelot_cenas') || '{}'); } catch (e) {}
  await carregarCatalogoDeCenas();
  preencherMenuDeCenas();
  abrirMenuInicialSePreciso();   // de novo: agora o catálogo existe e o menu fica coerente
  if (wantsMobilePlay()) talvezIniciarCenaDoMapa(currentKey);
}
setTimeout(()=>loadingOverlay?.classList.add('hidden'),1500);

// ============================================================
// VISUAL DIALOGUE EDITOR LOGIC
// ============================================================
let dialogueEditorOverlay, dlgEditorNpcName, dlgEditorId, dlgEditorLines, dlgEditorQuest;
let openDlgEditorBtn, closeDlgEditorBtn, saveDlgBtn, testDlgBtn;

function initDialogueEditor() {
  dialogueEditorOverlay = document.getElementById('dialogueEditorOverlay');
  dlgEditorNpcName = document.getElementById('dlgEditorNpcName');
  dlgEditorId = document.getElementById('dlgEditorId');
  dlgEditorLines = document.getElementById('dlgEditorLines');
  dlgEditorQuest = document.getElementById('dlgEditorQuest');
  openDlgEditorBtn = document.getElementById('openDlgEditorBtn');
  closeDlgEditorBtn = document.getElementById('closeDlgEditorBtn');
  saveDlgBtn = document.getElementById('saveDlgBtn');
  testDlgBtn = document.getElementById('testDlgBtn');

  openDlgEditorBtn?.addEventListener('click', () => {
    if (!selectedNPC) { showToast('⚠️ Selecione um NPC na cena primeiro!'); return; }
    openDialogueEditor(selectedNPC);
  });

  closeDlgEditorBtn?.addEventListener('click', () => {
    dialogueEditorOverlay?.classList.add('hidden');
  });

  saveDlgBtn?.addEventListener('click', async () => {
    await saveDialogueFromEditor();
  });

  testDlgBtn?.addEventListener('click', async () => {
    await testDialogueFromEditor();
  });
}

async function openDialogueEditor(npc) {
  if (!npc) return;
  dlgEditorNpcName.value = npc.name || '';
  const dlgId = (npc.dialogue && npc.dialogue !== 'none') ? npc.dialogue : `${npc.id}_dlg`;
  dlgEditorId.value = dlgId;

  // Try loading existing dialogue
  const existing = await loadDialogue(dlgId);
  if (existing && existing.steps && existing.steps.length > 0) {
    const linesStep = existing.steps.find(s => s.type === 'lines' && s.lines);
    if (linesStep && linesStep.lines) {
      dlgEditorLines.value = linesStep.lines.join('\n');
    } else {
      dlgEditorLines.value = '';
    }
    const endStep = existing.steps.find(s => s.quest_unlock);
    if (endStep && dlgEditorQuest) dlgEditorQuest.value = endStep.quest_unlock;
    else if (dlgEditorQuest) dlgEditorQuest.value = '';
  } else {
    dlgEditorLines.value = `Olá viajante!\nSeja bem-vindo a Acordelot.`;
    if (dlgEditorQuest) dlgEditorQuest.value = '';
  }

  dialogueEditorOverlay?.classList.remove('hidden');
}

async function saveDialogueFromEditor() {
  if (IS_PLAY_BUILD) return;
  if (!selectedNPC) { showToast('⚠️ Nenhum NPC selecionado!'); return; }

  const dlgId = dlgEditorId.value.trim().replace(/[^a-zA-Z0-9_]/g, '_') || `${selectedNPC.id}_dlg`;
  const npcName = dlgEditorNpcName.value.trim() || selectedNPC.name;
  const rawLines = dlgEditorLines.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const lines = rawLines.length > 0 ? rawLines : ['...'];
  const questUnlock = dlgEditorQuest ? dlgEditorQuest.value : '';

  const dialogueJson = {
    npc_id: selectedNPC.id,
    npc_name: npcName,
    steps: [
      {
        id: "start",
        type: "lines",
        lines: lines,
        next: questUnlock ? "quest_step" : "end"
      },
      ...(questUnlock ? [
        { id: "quest_step", type: "end", quest_unlock: questUnlock }
      ] : [
        { id: "end", type: "end" }
      ])
    ]
  };

  // Cache in memory
  dialogueCache[dlgId] = dialogueJson;

  // Save to disk via server API
  try {
    await fetch('/save_dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dlgId, dialogue: dialogueJson })
    });
  } catch(e) {}

  // Assign to NPC
  selectedNPC.dialogue = dlgId;
  selectedNPC.name = npcName;

  // Add to select dropdown
  if (inspDialogue) {
    let exists = false;
    for (let opt of inspDialogue.options) {
      if (opt.value === dlgId) { exists = true; break; }
    }
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = dlgId;
      opt.textContent = dlgId;
      inspDialogue.appendChild(opt);
    }
    inspDialogue.value = dlgId;
  }

  syncInspector(selectedNPC);
  refreshNPCHierarchy();
  saveNPCs();

  dialogueEditorOverlay?.classList.add('hidden');
  showToast(`💬 Diálogo "${dlgId}" salvo e vinculado a ${npcName}!`);
}

async function testDialogueFromEditor() {
  await saveDialogueFromEditor();
  dialogueEditorOverlay?.classList.add('hidden');
  if (!isPlayMode) togglePlay();
  if (selectedNPC) {
    setTimeout(() => startDialogue(selectedNPC), 150);
  }
}

// ============================================================
// NPC GALLERY DRAG & DROP AND PALETTE LOGIC
// ============================================================
function initGalleryDragAndDrop() {
  const cards = document.querySelectorAll('.npc-gallery-card');
  cards.forEach(card => {
    const addBtn = card.querySelector('.btn-card-add');
    const type = card.dataset.npctype;
    const name = card.dataset.npcname;

    const spawnFromGallery = (x = 512, y = 300) => {
      const activeMap = activeMapSelect?.value || currentKey;
      if (type === 'signpost') {
        startSignpostWizard(activeMap, x, y);
        return;
      }
      if (engineMode !== 'scene') setMode('scene');
      const newNPC = {
        id: `npc_${Date.now()}`,
        name: name || 'Novo NPC',
        type: type || 'citizen',
        mapKey: activeMap,
        x: Math.round(x),
        y: Math.round(y),
        triggerRadius: 80,
        dialogue: 'none',
        triggered: false,
        flipX: false,
        scale: 1.0
      };
      npcData.push(newNPC);
      selectNPC(newNPC);
      refreshNPCHierarchy();
      saveNPCs();
      showToast(`✨ ${name} adicionado ao mapa!`);
    };

    // Clicking a card arms placement — dropping everything at the map centre meant you
    // had to hunt for the element and drag it, and it silently landed on top of whatever
    // was already there.
    const armPlacement = () => {
      if (type === 'signpost') { startSignpostWizard(activeMapSelect?.value || currentKey, 512, 300); return; }
      if (engineMode !== 'scene') setMode('scene');
      pendingElement = { type, name };
      npcPlacingMode = true;
      canvas?.classList.add('cursor-crosshair');
      showToast(`📍 Clique no mapa para posicionar: ${name}`);
    };
    addBtn?.addEventListener('click', (e) => { e.stopPropagation(); armPlacement(); });
    card.addEventListener('click', armPlacement);

    card.addEventListener('dragstart', (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData('text/plain', JSON.stringify({ type, name }));
      }
    });
  });

  const stage = document.getElementById('canvas-stage') || canvas;
  if (stage) {
    stage.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });
    stage.addEventListener('drop', (e) => {
      e.preventDefault();
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (!raw) return;
        const data = JSON.parse(raw);
        const rect = canvas.getBoundingClientRect();
        const dropX = Math.round(((e.clientX - rect.left) / rect.width) * SCREEN_W);
        const dropY = Math.round(((e.clientY - rect.top) / rect.height) * SCREEN_H);
        const activeMap = activeMapSelect?.value || currentKey;
        // A signpost without a destination is useless, so dropping one runs the linking
        // wizard — the same as clicking the card does.
        if (data.type === 'signpost') {
          if (engineMode !== 'scene') setMode('scene');
          startSignpostWizard(activeMap, Math.max(20, Math.min(SCREEN_W-20, dropX)),
                                          Math.max(20, Math.min(SCREEN_H-20, dropY)));
          return;
        }
        const newNPC = {
          id: `npc_${Date.now()}`,
          name: data.name || 'Novo NPC',
          type: data.type || 'citizen',
          mapKey: activeMap,
          x: Math.max(20, Math.min(SCREEN_W - 20, dropX)),
          y: Math.max(20, Math.min(SCREEN_H - 20, dropY)),
          triggerRadius: 80,
          dialogue: 'none',
          triggered: false,
          flipX: false,
          scale: 1.0
        };
        npcData.push(newNPC);
        selectNPC(newNPC);
        refreshNPCHierarchy();
        saveNPCs();
        showToast(`📍 ${data.name} posicionado em (${newNPC.x}, ${newNPC.y})!`);
      } catch (err) {}
    });
  }
}

function initRealtimeInspectorControls() {
  const range = document.getElementById('insp_scale_range');
  const btnDown = document.getElementById('btnScaleDown');
  const btnUp = document.getElementById('btnScaleUp');
  const presets = document.querySelectorAll('.btn-scale-preset');

  range?.addEventListener('input', (e) => {
    setNPCScaleLive(parseFloat(e.target.value));
  });

  btnDown?.addEventListener('click', () => {
    if (!selectedNPC) return;
    const current = selectedNPC.scale || 1.0;
    setNPCScaleLive(Math.max(0.3, current - 0.1));
  });

  btnUp?.addEventListener('click', () => {
    if (!selectedNPC) return;
    const current = selectedNPC.scale || 1.0;
    setNPCScaleLive(Math.min(3.0, current + 0.1));
  });

  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.dataset.scale);
      if (val) setNPCScaleLive(val);
    });
  });

  // Real-time live update for position, flip, name, dialogue
  inspX?.addEventListener('input', (e) => {
    if (selectedNPC) { selectedNPC.x = parseInt(e.target.value) || selectedNPC.x; saveNPCs(); }
  });
  inspY?.addEventListener('input', (e) => {
    if (selectedNPC) { selectedNPC.y = parseInt(e.target.value) || selectedNPC.y; saveNPCs(); }
  });
  inspName?.addEventListener('input', (e) => {
    if (selectedNPC) { selectedNPC.name = e.target.value; refreshNPCHierarchy(); saveNPCs(); }
  });
  inspFlip?.addEventListener('change', (e) => {
    if (selectedNPC) { selectedNPC.flipX = e.target.checked; saveNPCs(); }
  });
  inspDialogue?.addEventListener('change', (e) => {
    if (selectedNPC) { selectedNPC.dialogue = e.target.value; saveNPCs(); }
  });

  // Signpost Inspector Controls
  const inspTargetMap = document.getElementById('insp_target_map');
  const inspTargetX = document.getElementById('insp_target_x');
  const inspTargetY = document.getElementById('insp_target_y');
  const relinkBtn = document.getElementById('relink_signpost_btn');
  const cancelWizardBtn = document.getElementById('wizardCancelBtn');

  inspTargetMap?.addEventListener('change', (e) => {
    if (selectedNPC && selectedNPC.type === 'signpost') {
      selectedNPC.targetMapKey = e.target.value;
      saveNPCs();
    }
  });

  inspTargetX?.addEventListener('input', (e) => {
    if (selectedNPC && selectedNPC.type === 'signpost') {
      selectedNPC.targetX = parseInt(e.target.value) || selectedNPC.targetX;
      saveNPCs();
    }
  });

  inspTargetY?.addEventListener('input', (e) => {
    if (selectedNPC && selectedNPC.type === 'signpost') {
      selectedNPC.targetY = parseInt(e.target.value) || selectedNPC.targetY;
      saveNPCs();
    }
  });

  relinkBtn?.addEventListener('click', () => {
    if (selectedNPC && selectedNPC.type === 'signpost') {
      startSignpostWizard(selectedNPC.mapKey, selectedNPC.x, selectedNPC.y);
    }
  });

  cancelWizardBtn?.addEventListener('click', () => {
    cancelSignpostWizard();
  });
}

// ============================================================
// ORNATE MUSICAL INVENTORY SYSTEM
// ============================================================
// ============================================================
// ORNATE MUSICAL & RETRO INVENTORY SYSTEM
// ============================================================
function gainXp(amount) {
  grantXp(amount);
}

function renderCharPreview() {
  const canvas = document.getElementById('charPreviewCanvas');
  if (!canvas) return;
  const ctxPrev = canvas.getContext('2d');
  ctxPrev.clearRect(0, 0, canvas.width, canvas.height);
  ctxPrev.imageSmoothingEnabled = false;

  // Background pedestal
  ctxPrev.fillStyle = '#0f0904'; ctxPrev.fillRect(0, 0, canvas.width, canvas.height);
  ctxPrev.fillStyle = 'rgba(0,0,0,0.4)';
  ctxPrev.beginPath(); ctxPrev.ellipse(canvas.width / 2, canvas.height - 25, 45, 14, 0, 0, Math.PI * 2); ctxPrev.fill();

  const cx = canvas.width / 2;
  const cy = canvas.height - 25;
  const pW = 84, pH = 112;

  // Draw wings behind body
  const wingsId = equipped.wings, wingsSpr = wingsId && skinImages[wingsId];
  if (wingsSpr) {
    const w = pW * 1.3, h = w * (wingsSpr.sh / wingsSpr.sw);
    ctxPrev.drawImage(wingsSpr.canvas, wingsSpr.sx, wingsSpr.sy, wingsSpr.sw, wingsSpr.sh, cx - w / 2, cy - pH * 0.55 - h / 2, w, h);
  }

  // Draw player body
  const sheet = activeSprite();
  if (sheet) {
    const fw = sheet.width / 4, fh = sheet.height / 4;
    const row = 0;
    ctxPrev.drawImage(sheet, 0, row * fh, fw, fh, cx - pW / 2, cy - pH + 4, pW, pH);
  } else {
    ctxPrev.fillStyle = '#3b82f6'; ctxPrev.fillRect(cx - 20, cy - 50, 40, 60);
  }

  // Draw hat
  const hatId = equipped.hat, hatSpr = hatId && skinImages[hatId];
  if (hatSpr) {
    const w = pW * 0.6, h = w * (hatSpr.sh / hatSpr.sw);
    ctxPrev.drawImage(hatSpr.canvas, hatSpr.sx, hatSpr.sy, hatSpr.sw, hatSpr.sh, cx - w / 2, cy - pH * 0.64 - h, w, h);
  }
}

function updateAttributeStatsUI() {
  const stats = derivedStats();
  const vAtk = document.getElementById('valAtkStat');
  const vDef = document.getElementById('valDefStat');
  const vHp = document.getElementById('valHpStat');
  if (vAtk) vAtk.textContent = stats.dmg;
  if (vDef) vDef.textContent = stats.def;
  if (vHp) vHp.textContent = stats.maxHp;
}

function initOrnateInventory() {
  const invOverlay = document.getElementById('inventoryOverlay');
  const invBtn = document.getElementById('invBtn');
  const charBtn = document.getElementById('charBtn');
  const invCloseBtn = document.getElementById('invCloseBtn');
  const invCloseFooterBtn = document.getElementById('invCloseFooterBtn');
  const invSortBtn = document.getElementById('invSortBtn');
  const invTrashBtn = document.getElementById('invTrashBtn');

  // O grimório vive no body: dentro do palco do canvas a altura resolve 0.
  if (invOverlay && invOverlay.parentElement !== document.body) document.body.appendChild(invOverlay);

  document.querySelectorAll('[data-grtab]').forEach(fita => {
    fita.addEventListener('click', () => {
      if (fita.disabled) return;
      grAba = fita.dataset.grtab;
      grSelecionado = null;
      renderGrimorio();
    });
  });

  const openInv = () => {
    grAba = 'bolsa'; grSelecionado = null;
    invOverlay?.classList.remove('hidden');
    renderGrimorio();
  };

  // O botão de atributos abre o mesmo grimório, na fita dos atributos.
  const openCharProfile = () => {
    grAba = 'atributos'; grSelecionado = null;
    invOverlay?.classList.remove('hidden');
    renderGrimorio();
  };

  const closeInv = () => {
    invOverlay?.classList.add('hidden');
  };

  invBtn?.addEventListener('click', openInv);
  charBtn?.addEventListener('click', openCharProfile);
  invCloseBtn?.addEventListener('click', closeInv);
  invCloseFooterBtn?.addEventListener('click', closeInv);

  // Attribute Upgrade buttons
  document.querySelectorAll('.btn-up-stat').forEach(btn => {
    btn.addEventListener('click', () => {
      const stat = btn.dataset.stat;
      if (attrPoints > 0) {
        attrPoints--;
        if (stat === 'atk') baseStats.atk = (baseStats.atk || 10) + 2;
        if (stat === 'def') baseStats.def = (baseStats.def || 5) + 1;
        if (stat === 'hp') baseStats.maxHp = (baseStats.maxHp || 100) + 15;
        updateAttributeStatsUI();
        showToast('✨ Atributo melhorado!');
        savePlayerData();
      } else {
        showToast('⚠️ Sem pontos de atributo disponíveis!');
      }
    });
  });
}

let grAba = 'bolsa', grSelecionado = null;

// Desenha um sprite preparado dentro de um <canvas> do tamanho pedido.
function miniCanvas(spr, alt) {
  if (!spr) return null;
  const w = Math.round(alt * (spr.sw / spr.sh));
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = alt;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, 0, 0, w, alt);
  return cv;
}

function spriteDoItem(id) {
  const info = CATALOGO[id];
  if (info?.sprite) return magiaSprites[info.sprite];
  if (id.startsWith('nota_')) return magiaSprites[id];
  const t = CRAFTABLE_TOOLS.find(x => x.id === id);
  if (t) return toolSprites[`${t.category}_${t.tier}`];
  return null;
}

// Tudo que o jogador carrega, na ordem em que faz sentido ler.
function itensDaBolsa() {
  const out = [];
  const push = (id, qtd) => { if (qtd > 0) out.push({ id, qtd }); };
  push('fragmento_puro', playerInventory.fragmento_puro || 0);
  push('fragmento', playerInventory.fragmento || 0);
  push('tom', playerInventory.tom || 0);
  push('semitom', playerInventory.semitom || 0);
  // clave não entra aqui: é moeda, e já aparece na linha de moedas do drawer
  push('wood', playerInventory.wood || 0);
  push('stone', playerInventory.stone || 0);
  push('potions', playerInventory.potions || 0);
  CROMATICA.forEach(n => push('nota_' + n.id, notasPossuidas[n.id] || 0));
  // Ferramentas forjadas que não estão em nenhum slot. Sem isto elas sumiam do jogo:
  // ficavam em playerInventory sem aparecer em lugar nenhum, e não havia como equipar
  // de volta — foi o que deixou o Ressonador "no inventário" e a captura sem abrir.
  CRAFTABLE_TOOLS.forEach(t => {
    if ((playerInventory[t.id] || 0) > 0 && !Object.values(equipped).includes(t.id))
      out.push({ id: t.id, qtd: 1, ferramenta: true });
  });
  return out;
}

// Manda a ferramenta para o slot da sua categoria. Devolve o que estava lá para a bolsa.
function equiparFerramenta(id) {
  const t = CRAFTABLE_TOOLS.find(x => x.id === id);
  if (!t) return false;
  const slot = Object.entries(CATEGORIA_POR_SLOT).find(([, cat]) => cat === t.category)?.[0];
  if (!slot) return false;
  equipped[slot] = id;
  equipped.activeTool = slot;
  playerInventory[id] = 1;
  savePlayerData();
  showToast(`${t.icon} ${t.name} equipado`);
  return true;
}

function infoDoItem(id) {
  if (CATALOGO[id]) return CATALOGO[id];
  if (id.startsWith('nota_')) {
    const n = notaPorId(id.slice(5));
    return n ? {
      nome: `Nota ${n.nome}`, tipo: n.natural ? 'Nota natural' : 'Nota sustenida',
      cor: n.natural ? '#fde68a' : '#7dd3fc',
      desc: n.natural
        ? 'Som inteiro, condensado a partir de fragmentos. Repousa onde cai.'
        : 'Meio caminho entre duas naturais. Mais difícil de segurar, e por isso mais cara.',
      origem: 'Condensada no Altar das Escalas.',
    } : null;
  }
  const t = CRAFTABLE_TOOLS.find(x => x.id === id);
  if (t) return { nome: t.name, tipo: 'Ferramenta · ' + t.rarity, cor: t.color, desc: t.desc, origem: 'Forjada na ferraria.' };
  return null;
}

function updateInventorySlotsUI() { if (!document.getElementById('inventoryOverlay')?.classList.contains('hidden')) renderGrimorio(); }

// As nove casas de cima: ferramentas, cosméticos e consumível. A arte tem 3x3, então
// o equipamento inteiro cabe numa olhada só.
const SLOTS_GRIMORIO = [
  // Linha de cima: cosméticos — é o que o jogador mostra.
  { slot: 'hat',        rotulo: 'CHAPÉU',   tipo: 'cosmetico' },
  { slot: 'outfit',     rotulo: 'ROUPA',    tipo: 'cosmetico' },
  { slot: 'wings',      rotulo: 'ASAS',     tipo: 'cosmetico' },
  // Linha do meio: aura, machado e o encaixe de arma, reservado para o arco de combate.
  { slot: 'aura',       rotulo: 'AURA',     tipo: 'cosmetico' },
  { slot: 'axe',        rotulo: 'MACHADO',  tipo: 'ferramenta' },
  { slot: 'arma',       rotulo: 'ARMA',     tipo: 'reservado' },
  // Linha de baixo: as ferramentas de ofício.
  { slot: 'hammer',     rotulo: 'MARTELO',  tipo: 'ferramenta' },
  { slot: 'ressonador', rotulo: 'RESSON.',  tipo: 'ferramenta' },
  { slot: 'pickaxe',    rotulo: 'DIAPASÃO', tipo: 'ferramenta' },
];

// Encaixa o drawer exatamente sobre a área jogável. No editor o canvas é um retângulo
// no meio da página; em modo celular ele ocupa a tela toda. Um só cálculo serve aos dois.
function ajustarCaixaDoDrawer() { ajustarCaixaNoPalco('inventoryOverlay'); }
function ajustarCaixaDoSorteio() { ajustarCaixaNoPalco('sorteioOverlay'); }

// Encaixa um painel exatamente sobre a área jogável, seja no editor (retângulo no meio
// da página) ou em modo celular (tela cheia).
function ajustarCaixaNoPalco(id) {
  const fundo = document.getElementById(id);
  if (!fundo) return;
  // Prefere o canvas; se ele ainda não tiver medida, tenta o palco; por último, a tela.
  // Assim o painel nunca fica com tamanho zero nem estoura para fora da área do jogo.
  const alvos = [document.getElementById('gameCanvas'),
                 document.getElementById('canvas-stage'),
                 document.getElementById('viewport-container')];
  let r = null;
  for (const el of alvos) {
    if (!el) continue;
    const b = el.getBoundingClientRect();
    if (b.width > 40 && b.height > 40) { r = b; break; }
  }
  if (r) {
    fundo.style.left = r.left + 'px';
    fundo.style.top = r.top + 'px';
    fundo.style.width = r.width + 'px';
    fundo.style.height = r.height + 'px';
  } else {
    fundo.style.left = '0px'; fundo.style.top = '0px';
    fundo.style.width = '100vw'; fundo.style.height = '100vh';
  }
}
window.addEventListener('resize', () => { ajustarCaixaDoDrawer(); ajustarCaixaDoSorteio(); });

function renderGrimorio() {
  ajustarCaixaDoDrawer();
  requestAnimationFrame(ajustarCaixaDoDrawer);   // de novo com o layout já resolvido
  const equip = document.getElementById('dwEquip');
  const bolsa = document.getElementById('dwBolsa');
  if (!equip || !bolsa) return;

  document.querySelectorAll('[data-grtab]').forEach(b =>
    b.classList.toggle('ativa', b.dataset.grtab === grAba));

  const tit = document.getElementById('dwTitulo');
  const ficha = document.getElementById('dwFicha');
  const moe = document.getElementById('dwMoedas'); if (moe) moe.textContent = playerCoins || 0;
  const clv = document.getElementById('dwClaves'); if (clv) clv.textContent = claveCount || 0;
  document.querySelector('.dw-attr-lista')?.remove();

  if (grAba === 'atributos') {
    equip.style.display = 'none'; bolsa.style.display = 'none';
    ficha?.classList.add('hidden');
    if (tit) tit.textContent = 'Atributos';
    renderAtributosNoDrawer();
    return;
  }

  equip.style.display = ''; bolsa.style.display = '';
  if (tit) tit.textContent = 'Bolsa';

  // 3x3 de cima: equipamento
  equip.innerHTML = '';
  SLOTS_GRIMORIO.forEach(def => {
    const el = document.createElement('div');
    el.dataset.rotulo = def.rotulo;
    let cheio = false;

    if (def.tipo === 'reservado') {
      el.className = 'dw-casa vazia vazio-rotulo reservado';
      el.dataset.rotulo = def.rotulo;
      el.title = 'Reservado para armas — em breve';
      equip.appendChild(el);
      return;
    }
    if (def.tipo === 'consumivel') {
      const n = playerInventory.potions || 0;
      cheio = n > 0;
      if (cheio) {
        const e = document.createElement('span'); e.className = 'dw-emoji'; e.textContent = '🧪';
        el.appendChild(e);
        const q = document.createElement('span'); q.className = 'dw-qtd'; q.textContent = n;
        el.appendChild(q);
        el.title = 'Poção de Vida';
        el.addEventListener('click', () => { grSelecionado = 'potions'; renderGrimorio(); });
      }
    } else if (def.tipo === 'ferramenta') {
      const t = equipped[def.slot] && CRAFTABLE_TOOLS.find(x => x.id === equipped[def.slot]);
      cheio = !!t;
      if (t) {
        const cv = miniCanvas(toolSprites[`${t.category}_${t.tier}`], 34);
        if (cv) el.appendChild(cv);
        else { const e = document.createElement('span'); e.className = 'dw-emoji'; e.textContent = t.icon; el.appendChild(e); }
        const q = qualidadeDe(t.id);
        el.title = t.name + (q.selo ? ' · ' + q.nome : '') + ' — toque duas vezes para guardar';
        el.addEventListener('click', () => { grSelecionado = t.id; renderGrimorio(); });
        // Toque duplo põe a peça NA MÃO. Guardar de volta seria o gesto mais fácil de
        // fazer sem querer, e nenhuma ferramenta precisa sair do slot para funcionar.
        el.addEventListener('dblclick', () => {
          equipped.activeTool = def.slot; savePlayerData();
          showToast(`${t.icon} ${t.name} em mãos`); renderGrimorio();
        });
      }
    } else {
      const id = equipped[def.slot];
      const it = id && (typeof itemById === 'function' ? itemById(id) : null);
      cheio = !!id;
      if (cheio) {
        const spr = skinImages?.[id];
        const cv = spr ? miniCanvas(spr, 32) : null;
        if (cv) el.appendChild(cv);
        else { const e = document.createElement('span'); e.className = 'dw-emoji'; e.textContent = it?.icon || '✦'; el.appendChild(e); }
        el.title = it?.name || def.rotulo;
      }
    }

    el.className = 'dw-casa' + (cheio ? '' : ' vazia vazio-rotulo');
    equip.appendChild(el);
  });

  // grade de baixo: a mochila
  const lista = itensDaBolsa();   // matérias-primas e notas na mesma bolsa

  bolsa.innerHTML = '';
  const minimo = 16;                       // sempre 4 linhas visíveis; o resto rola
  for (let i = 0; i < Math.max(minimo, lista.length); i++) {
    const it = lista[i];
    const casa = document.createElement('div');
    casa.className = 'dw-casa' + (it ? '' : ' vazia') + (it && grSelecionado === it.id ? ' sel' : '');
    if (it) {
      const info = infoDoItem(it.id);
      const cv = miniCanvas(spriteDoItem(it.id), 34);
      if (cv) casa.appendChild(cv);
      else { const e = document.createElement('span'); e.className = 'dw-emoji'; e.textContent = info?.emoji || '❔'; casa.appendChild(e); }
      const q = document.createElement('span');
      q.className = 'dw-qtd'; q.textContent = it.qtd;
      casa.appendChild(q);
      casa.title = info?.nome || it.id;
      casa.addEventListener('click', () => {
        // Ferramenta na bolsa é ferramenta guardada: um toque veste. É a única forma de
        // equipar no celular, onde não existem as teclas 1–4.
        if (it.ferramenta) { equiparFerramenta(it.id); grSelecionado = it.id; renderGrimorio(); return; }
        // Tocar de novo no mesmo item fecha a ficha — sem isso ela ficava para sempre.
        grSelecionado = (grSelecionado === it.id) ? null : it.id;
        renderGrimorio();
      });
    } else {
      casa.addEventListener('click', () => { grSelecionado = null; renderGrimorio(); });
    }
    bolsa.appendChild(casa);
  }

  const info = grSelecionado ? infoDoItem(grSelecionado) : null;
  if (info && ficha) {
    ficha.classList.remove('hidden');
    ficha.innerHTML =
      `<i class="dw-f-x" id="dwFichaX">✕</i>` +
      `<div class="dw-f-nome" style="color:${info.cor || '#fde68a'}">${info.nome}</div>` +
      `<div class="dw-f-tipo">${info.tipo || ''}</div>` +
      `<div class="dw-f-desc">${info.desc || ''}</div>` +
      (info.origem ? `<div class="dw-f-org">${info.origem}</div>` : '');
    ficha.querySelector('#dwFichaX')?.addEventListener('click', e => {
      e.stopPropagation(); grSelecionado = null; renderGrimorio();
    });
  } else ficha?.classList.add('hidden');
}

function renderAtributosNoDrawer() {
  const painel = document.getElementById('drawerPainel');
  if (!painel) return;
  const s = derivedStats();

  const lista = document.createElement('div');
  lista.className = 'dw-attr-lista';
  Object.keys(attrs).forEach(k => {
    const meta = ATTR_META[k];
    const row = document.createElement('div');
    row.className = 'dw-attr';
    row.innerHTML =
      `<div class="dw-attr-ico">${meta.icon}</div>` +
      `<div><div class="dw-attr-nome">${meta.name}</div><div class="dw-attr-desc">${meta.desc}</div></div>` +
      `<div class="dw-attr-val">${attrs[k]}</div>`;
    const b = document.createElement('button');
    b.className = 'dw-attr-add'; b.textContent = '+';
    b.disabled = attrPoints <= 0;
    b.addEventListener('click', () => { spendAttr(k); renderGrimorio(); });
    row.appendChild(b);
    lista.appendChild(row);
  });

  const res = document.createElement('div');
  res.className = 'dw-resumo';
  const b = v => `<b>${v}</b>`;
  res.innerHTML =
    `<span class="dw-res-tit">Nível ${level}</span>` +
    (attrPoints ? `<div style="color:#4ade80;font-weight:700">✦ ${attrPoints} ponto${attrPoints > 1 ? 's' : ''} para distribuir</div>` : '') +
    `❤️ Vida ${b(s.maxHp)} · ⚔️ Dano ${b(s.dmg)} · ⚡ Ataque ${b('+' + s.atkSpeed + '%')}<br>` +
    `🔨 Forja ${b('+' + s.forja + '%')} · 🔔 Captura ${b('+' + s.captura + '%')}<br>` +
    `✦ Puro ${b('+' + s.puro + '%')} · 🎵 Síntese ${b('−' + s.desconto + '%')}<br>` +
    `✨ Feitiço ${b('+' + s.dmgMagia + '%')} · ⏳ Recarga ${b('−' + s.recarga + '%')}<br>` +
    `🪙 Síntese ${b('-' + s.desconto + '%')} de fragmentos`;
  lista.appendChild(res);
  painel.appendChild(lista);
}



// ============================================================
// DRAG & DROP SCENARIO CREATION
// ============================================================
function addCustomScenarioFromFile(file, targetCol = null, targetRow = null) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('⚠️ Selecione um arquivo de imagem (.jpg, .png)!');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-\s]/g, "");
    const customKey = `custom_${Date.now()}_${Math.floor(Math.random()*1000)}`;

    let savedUrl = dataUrl;
    try {
      const res = await fetch('/upload_image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `bg_${customKey}.jpg`, image: dataUrl })
      });
      const data = await res.json();
      if (data.status === 'ok' && data.url) {
        savedUrl = data.url;
      }
    } catch(err) {}

    bgSources[customKey] = savedUrl;
    const img = new Image();
    img.src = savedUrl;
    bgImages[customKey] = img;
    SCENE_NAMES[customKey] = `🏰 ${cleanName || 'Novo Cenário'}`;
    spawns[customKey] = { x: 512, y: 300 };

    if (targetCol !== null && targetRow !== null) {
      const occ = keyAtCell(targetCol, targetRow);
      if (occ) delete gridPos[occ];
      gridPos[customKey] = { col: targetCol, row: targetRow };
    }

    // Sem posição o cenário fica "fora do grid" e some da vista: acha a primeira célula
    // livre à direita do que já existe.
    if (!gridPos[customKey]) {
      let col = 0;
      const linhas = Object.values(gridPos);
      if (linhas.length) col = Math.max(...linhas.map(p => p.col)) + 1;
      while (keyAtCell(col, 0)) col++;
      gridPos[customKey] = { col, row: 0 };
    }

    rebuildGrid();
    refreshMapSelect();
    if (typeof weAtualizaGaleria === 'function') weAtualizaGaleria();   // galeria do Mapa-Múndi
    if (activeMapSelect) activeMapSelect.value = customKey;
    currentKey = customKey;
    saveAllLayers(false);
    updateMapStatus();

    showToast(`🖼️ Cenário "${SCENE_NAMES[customKey]}" adicionado com sucesso!`);
  };
  reader.readAsDataURL(file);
}

function initScenarioUploader() {
  const uploadBtn = document.getElementById('uploadScenarioBtn');
  const uploadBtn2 = document.getElementById('uploadScenarioBtn2');
  const fileInput = document.getElementById('scenarioImageUpload');

  const triggerUpload = () => fileInput?.click();
  uploadBtn?.addEventListener('click', triggerUpload);
  uploadBtn2?.addEventListener('click', triggerUpload);

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let file of e.target.files) {
        addCustomScenarioFromFile(file);
      }
      fileInput.value = '';
    }
  });

  const canvasTarget = document.getElementById('gameCanvas') || canvas;
  if (canvasTarget) {
    canvasTarget.addEventListener('dragover', (e) => {
      if (engineMode === 'worldmap' && e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    canvasTarget.addEventListener('drop', (e) => {
      if (engineMode === 'worldmap' && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        let isImage = false;
        for (let file of e.dataTransfer.files) {
          if (file.type.startsWith('image/')) { isImage = true; break; }
        }
        if (isImage) {
          e.preventDefault();
          e.stopPropagation();
          const rect = canvasTarget.getBoundingClientRect();
          const mx = Math.round(((e.clientX - rect.left) / rect.width) * SCREEN_W);
          const my = Math.round(((e.clientY - rect.top) / rect.height) * SCREEN_H);
          const cell = getCell(mx, my);

          for (let file of e.dataTransfer.files) {
            if (file.type.startsWith('image/')) {
              addCustomScenarioFromFile(file, cell?.col, cell?.row);
            }
          }
        }
      }
    });
  }
}

// ============================================================
// CRAFTING / BLACKSMITH FORGE SYSTEM (5 TIERS MACHADOS & DIAPASÕES)
// ============================================================
// ── Tool artwork ──────────────────────────────────────────
// Both reference sheets are single images holding the five tiers. The axes sit 3-over-2
// and the pickaxes in a row, and the last two pickaxes have overlapping glows, so the
// crops are declared explicitly rather than derived from a grid.
const TOOL_SHEETS = {
  axes: { src: 'assets/ref_axes.jpg', boxes: [
    [51,46,252,446], [388,51,247,441], [727,46,246,451], [166,531,295,452], [576,527,270,462],
  ]},
  ressonadores: { src: 'assets/ref_ressonadores.jpg', boxes: [
    [48,255,270,545], [378,250,275,545], [700,250,300,545],
  ]},
  hammers: { src: 'assets/ref_hammers.jpg', boxes: [
    [40,55,300,420], [372,58,308,408], [698,58,272,404], [108,516,326,438], [556,492,404,470],
  ]},
  pickaxes: { src: 'assets/ref_pickaxes.jpg', boxes: [
    [30,35,175,970], [230,35,170,970], [430,35,164,970], [600,35,200,970], [800,35,215,970],
  ]},
};
const toolSprites = {};   // `${category}_${tier}` -> prepared sprite

// ── Teoria musical como dado ────────────────────────────────────────────────────
// A cromática é a base de tudo: 12 notas, 7 naturais e 5 sustenidas. As folhas de
// sprite seguem exatamente esta ordem, então índice de nota = índice de recorte.
// Frequências reais da 4ª oitava (Lá4 = 440 Hz). Condensar Dó toca um Dó de verdade:
// num jogo de educação musical, o som não pode ser decorativo.
const FREQ_BASE = { do:261.63, do_s:277.18, re:293.66, re_s:311.13, mi:329.63, fa:349.23,
                    fa_s:369.99, sol:392.00, sol_s:415.30, la:440.00, la_s:466.16, si:493.88 };

// Posição de cada nota na pauta em clave de sol, contada em meios-espaços a partir
// da linha de baixo (Mi4 = 0). É a altura REAL que a nota ocupa numa partitura.
const GRAU_NA_PAUTA = { do:-2, do_s:-2, re:-1, re_s:-1, mi:0, fa:1, fa_s:1,
                        sol:2, sol_s:2, la:3, la_s:3, si:4 };

const CROMATICA = [
  { id: 'do',      nome: 'Dó',  natural: true,  i: 0 },
  { id: 'do_s',    nome: 'Dó#', natural: false, i: 0 },
  { id: 're',      nome: 'Ré',  natural: true,  i: 1 },
  { id: 're_s',    nome: 'Ré#', natural: false, i: 1 },
  { id: 'mi',      nome: 'Mi',  natural: true,  i: 2 },
  { id: 'fa',      nome: 'Fá',  natural: true,  i: 3 },
  { id: 'fa_s',    nome: 'Fá#', natural: false, i: 2 },
  { id: 'sol',     nome: 'Sol', natural: true,  i: 4 },
  { id: 'sol_s',   nome: 'Sol#',natural: false, i: 3 },
  { id: 'la',      nome: 'Lá',  natural: true,  i: 5 },
  { id: 'la_s',    nome: 'Lá#', natural: false, i: 4 },
  { id: 'si',      nome: 'Si',  natural: true,  i: 6 },
];
// Economia da magia é PvE: paga-se com o que se arranca dos monstros, nunca com moedas.
// Fragmentos vêm dos Ecos; claves vêm de todo o resto. Ouro compra roupa, não poder.
const CUSTO_NOTA = {
  natural:   { fragmentos: 8,  claves: 1 },
  sustenida: { fragmentos: 14, claves: 2 },
};
const CUSTO_ESCALA = { claves: 5 };   // selar uma escala montada no altar

const VALOR_FRAGMENTO_PURO = 3;   // capturar afinado vale por três coletas comuns

function fragmentosDisponiveis() {
  return (playerInventory.fragmento || 0)
       + (playerInventory.fragmento_puro || 0) * VALOR_FRAGMENTO_PURO;
}

// Gasta os puros primeiro: o jogador não precisa administrar duas moedas na cabeça.
function gastarFragmentos(n) {
  let falta = n;
  while (falta >= VALOR_FRAGMENTO_PURO && (playerInventory.fragmento_puro || 0) > 0) {
    playerInventory.fragmento_puro--; falta -= VALOR_FRAGMENTO_PURO;
  }
  if (falta > 0 && (playerInventory.fragmento || 0) >= falta) {
    playerInventory.fragmento -= falta; falta = 0;
  }
  while (falta > 0 && (playerInventory.fragmento_puro || 0) > 0) {
    playerInventory.fragmento_puro--;
    playerInventory.fragmento = (playerInventory.fragmento || 0) + (VALOR_FRAGMENTO_PURO - falta);
    falta = 0;
  }
  return falta === 0;
}

function custoDaNota(nota) {
  const base = nota.natural ? CUSTO_NOTA.natural : CUSTO_NOTA.sustenida;
  const desconto = derivedStats().desconto / 100;    // Memória
  return {
    fragmentos: Math.max(2, Math.round(base.fragmentos * (1 - desconto))),
    claves: base.claves,
  };
}
function podePagarNota(nota) {
  const c = custoDaNota(nota);
  return fragmentosDisponiveis() >= c.fragmentos && claveCount >= c.claves;
}
function notaPorId(id) { return CROMATICA.find(n => n.id === id) || null; }

const MAGIA_SHEETS = {
  fragmentos: { src: 'assets/ref_fragmentos.jpg', boxes: [
    [45,330,275,365], [352,332,332,362], [762,332,206,372],
  ]},
  notas: { src: 'assets/ref_notas_naturais.jpg', boxes: [
    [20,95,215,360], [275,95,215,360], [530,95,215,360], [765,95,235,360],
    [20,565,215,400], [270,565,225,400], [545,565,215,400],
  ]},
  sustenidas: { src: 'assets/ref_notas_sustenidas.jpg', boxes: [
    [65,415,160,200], [240,410,180,205], [445,405,140,215], [615,415,165,190], [845,410,135,205],
  ]},
  acordes: { src: 'assets/ref_acordes.jpg', boxes: [] },   // recortado por grade 4x2 abaixo
};
const magiaSprites = {};   // 'fragmento' | 'tom' | 'semitom' | 'nota_do' | 'acorde_1'...

function loadMagiaSheets() {
  const nomes = ['fragmento', 'tom', 'semitom'];
  for (const [cat, sheet] of Object.entries(MAGIA_SHEETS)) {
    if (!sheet.boxes.length) continue;
    const img = new Image();
    img.onload = () => {
      sheet.boxes.forEach((b, i) => {
        try {
          const cut = document.createElement('canvas');
          cut.width = b[2]; cut.height = b[3];
          cut.getContext('2d').drawImage(img, b[0], b[1], b[2], b[3], 0, 0, b[2], b[3]);
          const pronto = prepareSprite(cut);
          if (cat === 'fragmentos') magiaSprites[nomes[i]] = pronto;
          else if (cat === 'notas') {
            const n = CROMATICA.find(x => x.natural && x.i === i);
            if (n) magiaSprites['nota_' + n.id] = pronto;
          } else if (cat === 'sustenidas') {
            const n = CROMATICA.find(x => !x.natural && x.i === i);
            if (n) magiaSprites['nota_' + n.id] = pronto;
          }
        } catch (e) {}
      });
    };
    img.src = sheet.src;
  }

  // Selos de acorde: grade 4x2, os 7 graus do campo harmônico.
  const sel = new Image();
  sel.onload = () => {
    const cw = Math.floor(sel.width / 4), ch = Math.floor(sel.height / 2);
    for (let i = 0; i < 7; i++) {
      try {
        const cut = document.createElement('canvas');
        cut.width = cw; cut.height = ch;
        cut.getContext('2d').drawImage(sel, (i % 4) * cw, Math.floor(i / 4) * ch, cw, ch, 0, 0, cw, ch);
        magiaSprites['acorde_' + (i + 1)] = prepareSprite(cut);
      } catch (e) {}
    }
  };
  sel.src = MAGIA_SHEETS.acordes.src;
}

function loadToolSheets() {
  for (const [cat, sheet] of Object.entries(TOOL_SHEETS)) {
    const img = new Image();
    img.onload = () => {
      sheet.boxes.forEach((b, i) => {
        try {
          const cut = document.createElement('canvas');
          cut.width = b[2]; cut.height = b[3];
          cut.getContext('2d').drawImage(img, b[0], b[1], b[2], b[3], 0, 0, b[2], b[3]);
          toolSprites[`${cat}_${i + 1}`] = prepareSprite(cut);
        } catch (e) {}
      });
      renderForgeItemsList();   // refresh if the menu is already open
    };
    img.onerror = () => {};
    img.src = sheet.src;
  }
}

// Draw a tool icon into a canvas element sized to fit `max` pixels.
function toolIconCanvas(cat, tier, max = 64) {
  const spr = toolSprites[`${cat}_${tier}`];
  if (!spr) return null;
  const s = Math.min(max / spr.sw, max / spr.sh);
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(spr.sw * s));
  cv.height = Math.max(1, Math.round(spr.sh * s));
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(spr.canvas, spr.sx, spr.sy, spr.sw, spr.sh, 0, 0, cv.width, cv.height);
  return cv;
}

const CRAFTABLE_TOOLS = [
  // Ressonadores — a chave da magia. Sem um deles equipado, o som do Eco se dispersa
  // e não vira Fragmento de Nota. Custa claves: é o que finalmente dá função a elas.
  { id: 'reson_cobre',  category: 'ressonadores', name: 'Ressonador de Cobre',   tier: 1, rarity: 'bronze', icon: '🔔', wood: 4,  stone: 6,  coins: 0, claves: 4,  minLvl: 2, color: '#b45309', desc: 'Captura o som de um Eco antes que ele se desfaça no ar.' },
  { id: 'reson_prata',  category: 'ressonadores', name: 'Ressonador de Prata',   tier: 2, rarity: 'prata',  icon: '🔔', wood: 10, stone: 14, coins: 0, claves: 10, minLvl: 4, color: '#475569', desc: 'Prata pura: nenhum harmônico escapa. Rende mais fragmentos.' },
  { id: 'reson_clave',  category: 'ressonadores', name: 'Ressonador da Clave',   tier: 3, rarity: 'ouro',   icon: '🔔', wood: 18, stone: 24, coins: 0, claves: 20, minLvl: 6, color: '#b45309', desc: 'Guarda o som inteiro do Eco, inclusive os intervalos.' },

  // Martelos — a ferramenta que abre o ofício. O primeiro é a missão do Ferreiro Dorn.
  { id: 'hammer_ferro', category: 'hammers', name: 'Martelo do Ferreiro', tier: 1, rarity: 'bronze', icon: '🔨', wood: 3, stone: 4, coins: 0, claves: 0, minLvl: 1, color: '#78350f', desc: 'Cabo de carvalho e cabeça de ferro batido. O primeiro martelo de todo aprendiz.' },
  { id: 'hammer_aco', category: 'hammers', name: 'Martelo de Aço Temperado', tier: 2, rarity: 'prata', icon: '🔨', wood: 8, stone: 12, coins: 140, claves: 0, minLvl: 3, color: '#475569', desc: 'Aço temperado três vezes. Soa como um sino ao bater.' },
  { id: 'hammer_clave', category: 'hammers', name: 'Martelo da Clave', tier: 3, rarity: 'ouro', icon: '🔨', wood: 16, stone: 22, coins: 340, claves: 2, minLvl: 5, color: '#b45309', desc: 'Cada golpe ressoa na nota exata do metal.' },

  // Machados (Axes - Image 1)
  { id: 'axe_bronze', category: 'axes', name: 'Machadinha Rústica', tier: 1, rarity: 'bronze', icon: '🪓', wood: 5, stone: 0, coins: 50, claves: 0, minLvl: 1, color: '#78350f', desc: 'Machado inicial de bronze rústico.' },
  { id: 'axe_prata', category: 'axes', name: 'Machado de Aço Prata', tier: 2, rarity: 'prata', icon: '🪓', wood: 10, stone: 5, coins: 120, claves: 0, minLvl: 3, color: '#475569', desc: 'Lâmina de prata refinada, extrai recursos mais rápido.' },
  { id: 'axe_ouro', category: 'axes', name: 'Machado Dourado da Clave', tier: 3, rarity: 'ouro', icon: '🪓', wood: 20, stone: 15, coins: 300, claves: 2, minLvl: 5, color: '#b45309', desc: 'Machado banhado a ouro entalhado com notas musicais.' },
  { id: 'axe_cristal', category: 'axes', name: 'Machado Cristal Esmeralda', tier: 4, rarity: 'cristal', icon: '🪓', wood: 35, stone: 30, coins: 600, claves: 5, minLvl: 7, color: '#0284c7', desc: 'Forjado em cristal ressonante verde brilhante.' },
  { id: 'axe_lendario', category: 'axes', name: 'Machado Harpa Celestial', tier: 5, rarity: 'lendario', icon: '🪓', wood: 50, stone: 50, coins: 1200, claves: 10, minLvl: 10, color: '#9333ea', desc: 'Arma lendária da Forja Celestial com cordas de harpa de ouro.' },

  // Diapasões / Picaretas (Pickaxes - Image 2)
  { id: 'pick_bronze', category: 'pickaxes', name: 'Diapasão de Madeira', tier: 1, rarity: 'bronze', icon: '⛏️', wood: 5, stone: 0, coins: 50, claves: 0, minLvl: 1, color: '#78350f', desc: 'Ferramenta de percussão inicial para mineração.' },
  { id: 'pick_prata', category: 'pickaxes', name: 'Diapasão de Prata', tier: 2, rarity: 'prata', icon: '⛏️', wood: 10, stone: 5, coins: 120, claves: 0, minLvl: 3, color: '#475569', desc: 'Prata de alta frequência ressonante para estilhaçar rochas.' },
  { id: 'pick_ouro', category: 'pickaxes', name: 'Diapasão de Ouro com Clave', tier: 3, rarity: 'ouro', icon: '⛏️', wood: 20, stone: 15, coins: 300, claves: 2, minLvl: 5, color: '#b45309', desc: 'Diapasão de ouro maciço ornamentado com clave de sol.' },
  { id: 'pick_cristal', category: 'pickaxes', name: 'Diapasão Safira Azul', tier: 4, rarity: 'cristal', icon: '⛏️', wood: 35, stone: 30, coins: 600, claves: 5, minLvl: 7, color: '#0284c7', desc: 'Cristal de safira ressonante que estilhaça nódulos de minério.' },
  { id: 'pick_lendario', category: 'pickaxes', name: 'Diapasão Lendário das Esferas', tier: 5, rarity: 'lendario', icon: '⛏️', wood: 50, stone: 50, coins: 1200, claves: 10, minLvl: 10, color: '#9333ea', desc: 'Diapasão supremo dos mestres forjadores de Acordelot.' }
];

let activeForgeTab = 'hammers';

function initForgeUI() {
  // Os dois painéis nascem dentro de #canvas-stage, que tem altura resolvida 0 e um
  // ancestral com transform — o que ancora até `position: fixed`. Movidos para o body,
  // eles voltam a ocupar a viewport inteira, como todo modal deve fazer.
  document.querySelectorAll('[data-altaraba]').forEach(b => {
    b.addEventListener('click', () => {
      const alvo = b.dataset.altaraba;
      document.querySelectorAll('[data-altaraba]').forEach(x => x.classList.toggle('ativa', x === b));
      document.getElementById('altarViewCondensar')?.classList.toggle('hidden', alvo !== 'condensar');
      document.getElementById('altarViewMontar')?.classList.toggle('hidden', alvo === 'condensar');
      if (alvo === 'montar' && !montagem) iniciarMontagem('do');
    });
  });
  document.getElementById('pecaTom')?.addEventListener('click', () => colocarIntervalo('T'));
  document.getElementById('pecaSemitom')?.addEventListener('click', () => colocarIntervalo('S'));

  // ── Reorganização da tela do Criador de Mundo ─────────────────────────────────
  // MOVO os elementos que já existem em vez de recriá-los: assim todos os eventos já
  // ligados continuam valendo, e não há risco de dois controles disputando o mesmo
  // estado. Ferramentas e ambiente sobem para a barra; assets e extração vão para a
  // doca da direita; o mapa não sai do lugar.
  const mover = (de, para) => {
    const a = document.getElementById(de), b = document.getElementById(para);
    if (a && b) b.appendChild(a);
  };
  (() => {
    const barraF = document.getElementById('mbFerramentas');
    const barraP = document.getElementById('mbPinceis');
    const barraA = document.getElementById('mbAmbiente');
    const barraX = document.getElementById('mbAcoes');
    if (!barraF) return;

    // Sem "Mover": arrastar o vazio já move a câmera, então ele era um modo que não
    // fazia nada além de desligar os outros.
    document.getElementById('mundoFerrMover')?.remove();
    ['mundoFerrPlantar','mundoFerrSel','mundoFerrPartida']
      .forEach(id => { const el = document.getElementById(id); if (el) barraF.appendChild(el); });
    // Os controles do pincel vão para o menu suspenso, não para a barra.
    const menu = document.getElementById('pincelMenu');
    ['pincelMateriais','pincelModoBox','pincelTamanhoBox']
      .forEach(id => { const el = document.getElementById(id); if (el && menu) menu.appendChild(el); });
    const btnPincel = document.getElementById('pincelMenuBtn');
    btnPincel?.addEventListener('click', () => {
      const r = btnPincel.getBoundingClientRect();
      const menuW = Math.min(520, window.innerWidth - 20);
      let left = Math.round(r.left);
      if (left + menuW > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - menuW - 10);
      }
      menu.style.left = left + 'px';
      menu.style.top = Math.round(r.bottom + 6) + 'px';
      menu.classList.toggle('hidden');
      btnPincel.classList.toggle('ativo', !menu.classList.contains('hidden'));
    });
    // Fechar clicando fora: menu que só fecha no próprio botão vira estorvo.
    document.addEventListener('pointerdown', ev => {
      if (menu.classList.contains('hidden')) return;
      if (menu.contains(ev.target) || btnPincel.contains(ev.target)) return;
      menu.classList.add('hidden'); btnPincel.classList.remove('ativo');
    }, true);
    // Controles de Clima & Horário viram menu suspenso assim como o Pincel de Chão
    const menuAmb = document.getElementById('ambienteMenu');
    const btnAmb = document.getElementById('ambienteMenuBtn');
    const amb = document.querySelector('.ambiente-box');
    if (amb && menuAmb) menuAmb.appendChild(amb);
    btnAmb?.addEventListener('click', () => {
      const r = btnAmb.getBoundingClientRect();
      menuAmb.style.left = Math.round(r.left) + 'px';
      menuAmb.style.top = Math.round(r.bottom + 6) + 'px';
      menuAmb.classList.toggle('hidden');
      btnAmb.classList.toggle('ativo', !menuAmb.classList.contains('hidden'));
    });
    document.addEventListener('pointerdown', ev => {
      if (!menuAmb || menuAmb.classList.contains('hidden')) return;
      if (menuAmb.contains(ev.target) || btnAmb.contains(ev.target)) return;
      menuAmb.classList.add('hidden'); btnAmb?.classList.remove('ativo');
    }, true);
    ['mundoTestarBtn','mundoSalvarBtn']
      .forEach(id => { const el = document.getElementById(id); if (el) barraX.appendChild(el); });

    // doca: paleta de props e o extrator
    ['propCats','propPaleta','propContagem'].forEach(id => mover(id, 'doca-props'));
    const rec = document.getElementById('btab-recortar');
    if (rec) { rec.classList.remove('hidden', 'btab-content'); document.getElementById('doca-recorte')?.appendChild(rec); }

    // A roda do mouse sobre a doca rola a doca, sempre. Alguma coisa no caminho estava
    // engolindo o evento, e lista de assets que não rola é lista inútil.
    ['doca-props','doca-recorte'].forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('wheel', ev => {
        el.scrollTop += ev.deltaY;
        ev.preventDefault(); ev.stopPropagation();
      }, { passive: false });
    });

    document.querySelectorAll('.dock-aba').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.dock-aba').forEach(x => x.classList.toggle('ativa', x === b));
      document.getElementById('doca-props')?.classList.toggle('hidden', b.dataset.doca !== 'props');
      document.getElementById('doca-recorte')?.classList.toggle('hidden', b.dataset.doca !== 'recorte');
    }));
  })();

  // A barra e a doca começam onde o cabeçalho termina — medido, não chutado. E a
  // folga do mapa acompanha a altura real da barra, que muda com a largura da tela.
  const medirTopo = () => {
    const h = document.getElementById('engine-header')?.offsetHeight || 46;
    const b = document.getElementById('mundoBarra')?.offsetHeight || 44;
    document.documentElement.style.setProperty('--topo', h + 'px');
    document.documentElement.style.setProperty('--barra-h', b + 'px');
  };
  window.addEventListener('resize', medirTopo);
  setTimeout(medirTopo, 300);
  setTimeout(medirTopo, 1200);

  // ── Chão global ───────────────────────────────────────────────────────────────
  const selChao = document.getElementById('chaoTextura');
  if (selChao) {
    TEXTURAS_DE_CHAO.forEach(([id, rot]) => {
      const o = document.createElement('option'); o.value = id; o.textContent = rot;
      selChao.appendChild(o);
    });
    const aplicarChao = () => {
      MUNDO.chao = MUNDO.chao || {};
      MUNDO.chao.textura = selChao.value;
      MUNDO.chao.brilho = (parseInt(document.getElementById('chaoBrilho').value, 10) || 100) / 100;
      const v = document.getElementById('chaoBrilhoVal');
      if (v) v.textContent = Math.round(MUNDO.chao.brilho * 100) + '%';
      texturaDoChao(MUNDO.chao.textura);
      saveMundo();
    };
    selChao.addEventListener('change', aplicarChao);
    document.getElementById('chaoBrilho')?.addEventListener('input', () => {
      MUNDO.chao = MUNDO.chao || { textura: selChao.value };
      MUNDO.chao.brilho = (parseInt(document.getElementById('chaoBrilho').value, 10) || 100) / 100;
      const v = document.getElementById('chaoBrilhoVal');
      if (v) v.textContent = Math.round(MUNDO.chao.brilho * 100) + '%';
    });
    document.getElementById('chaoBrilho')?.addEventListener('change', aplicarChao);
    setTimeout(() => {
      if (MUNDO.chao?.textura) {
        selChao.value = MUNDO.chao.textura;
        const b = document.getElementById('chaoBrilho');
        if (b) { b.value = Math.round((MUNDO.chao.brilho ?? 1) * 100);
                 document.getElementById('chaoBrilhoVal').textContent = b.value + '%'; }
        texturaDoChao(MUNDO.chao.textura);
      }
    }, 1500);
  }

  // ── Recortador de assets ──────────────────────────────────────────────────────
  document.getElementById('recArquivo')?.addEventListener('change', e => {
    const arq = e.target.files?.[0];
    if (!arq) return;
    const img = new Image();
    img.onload = () => {
      REC.img = img;
      // O nome do arquivo vira o prefixo dos recortes, limpo do que não serve em
      // caminho: é o que o artista reconhece depois na paleta.
      REC.nome = arq.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '_')
                          .toLowerCase().slice(0, 18) || 'folha';
      showToast(`🖼️ ${img.naturalWidth}x${img.naturalHeight} — toque em Analisar`);
    };
    img.src = URL.createObjectURL(arq);
  });

  document.getElementById('recAnalisar')?.addEventListener('click', () => {
    if (!REC.img) { showToast('⚠️ Escolha uma folha primeiro'); return; }
    REC.limiteBranco = parseInt(document.getElementById('recBranco')?.value, 10) || 238;
    REC.areaMinima = parseInt(document.getElementById('recArea')?.value, 10) || 400;
    const btn = document.getElementById('recAnalisar');
    btn.disabled = true; btn.textContent = 'Analisando…';
    // Um quadro de folga antes de começar: sem isto o botão nunca chega a mostrar que
    // está trabalhando, e a tela parece travada durante a conta.
    setTimeout(() => {
      try {
        recAnalisar(REC.img, achados => {
          REC.achados = achados;
          recRenderResultados();
          showToast(`✂️ ${achados.length} peça(s) encontrada(s)`);
        });
      } catch (err) {
        console.error(err); showToast('⚠️ Falhou ao analisar — veja o console');
      }
      btn.disabled = false; btn.textContent = '🔍 Analisar folha';
    }, 60);
  });

  // Categoria e nome para TODAS de uma vez: com 40 recortes por folha, digitar peça
  // por peça é o que fazia o recortador não compensar.
  const selTodos = document.getElementById('recCatTodos');
  if (selTodos) {
    Object.keys(PRESETS).forEach(k => {
      const o = document.createElement('option');
      o.value = k; o.textContent = NOME_DA_CATEGORIA[k] || k;
      selTodos.appendChild(o);
    });
  }
  document.getElementById('recAplicarTodos')?.addEventListener('click', () => {
    if (!REC.achados.length) { showToast('⚠️ Analise uma folha primeiro'); return; }
    const cat = selTodos?.value || 'arvore';
    const pre = (document.getElementById('recPrefixo')?.value || '').trim();
    REC.achados.forEach((a, i) => {
      a.categoria = cat;
      if (pre) {
        const base = pre.replace(/[^a-z0-9_]+/gi, '_').toLowerCase();
        a.nome = `${base}_${String(i + 1).padStart(2, '0')}`;
        a.rotulo = `${pre} ${i + 1}`;
      }
      // os números de física voltam ao preset da categoria escolhida
      delete a.altura2; delete a.pe2; delete a.raio2;
    });
    recRenderResultados();
    showToast(`⇊ ${REC.achados.length} peça(s) como ${NOME_DA_CATEGORIA[cat] || cat}`);
  });

  document.getElementById('recGravar')?.addEventListener('click', recGravar);

  // ── Ambiente ──────────────────────────────────────────────────────────────────
  const HORAS = [['🌅 Manhã', 8], ['☀️ Meio-dia', 12], ['🌇 Tarde', 17],
                 ['🌙 Noite', 21], ['🌌 Madrugada', 2]];
  const CLIMAS = [['☀️ Limpo', { chuva: 0, nevoa: 0 }],
                  ['🌫️ Névoa', { chuva: 0, nevoa: .55 }],
                  ['🌦️ Garoa', { chuva: .35, nevoa: .12 }],
                  ['🌧️ Chuva', { chuva: .8, nevoa: .2 }],
                  ['⛈️ Temporal', { chuva: 1, nevoa: .3 }]];

  const sincronizarAmbiente = () => {
    const h = document.getElementById('ambHora');
    const hv = document.getElementById('ambHoraVal');
    if (h) h.value = Math.round(AMB.hora * 10);
    if (hv) hv.textContent = `${String(Math.floor(AMB.hora)).padStart(2,'0')}:` +
                             `${String(Math.round((AMB.hora % 1) * 60)).padStart(2,'0')}`;
    const v = document.getElementById('ambVento');
    const vv = document.getElementById('ambVentoVal');
    if (v) v.value = Math.round(AMB.vento * 100);
    if (vv) vv.textContent = Math.round(AMB.vento * 100) + '%';
    document.querySelectorAll('#ambHoras .prop-cat').forEach((b, i) =>
      b.classList.toggle('ativo', Math.abs(AMB.hora - HORAS[i][1]) < .01));
    document.querySelectorAll('#ambClima .prop-cat').forEach((b, i) =>
      b.classList.toggle('ativo', Math.abs(AMB.chuva - CLIMAS[i][1].chuva) < .01
                                && Math.abs(AMB.nevoa - CLIMAS[i][1].nevoa) < .01));
  };

  const montarChips = (id, lista, aplicar) => {
    const box = document.getElementById(id);
    if (!box) return;
    box.innerHTML = '';
    lista.forEach(([rotulo, valor]) => {
      const b = document.createElement('button');
      b.className = 'prop-cat';
      b.textContent = rotulo;
      b.addEventListener('click', () => { aplicar(valor); sincronizarAmbiente(); });
      box.appendChild(b);
    });
  };
  montarChips('ambHoras', HORAS, h => { AMB.hora = h; });
  montarChips('ambClima', CLIMAS, c => { AMB.chuva = c.chuva; AMB.nevoa = c.nevoa; });

  document.getElementById('ambHora')?.addEventListener('input', e => {
    AMB.hora = parseInt(e.target.value, 10) / 10; sincronizarAmbiente();
  });
  document.getElementById('ambVento')?.addEventListener('input', e => {
    AMB.vento = parseInt(e.target.value, 10) / 100; sincronizarAmbiente();
  });
  sincronizarAmbiente();

  // ── Pincel de terreno ─────────────────────────────────────────────────────────
  // renderMateriais precisa ser global para que alternarPisoPintavel() e o modal
  // de seleção de pisos consigam atualizar a lista de chips do pincel.
  window.renderMateriais = () => {
    const box = document.getElementById('pincelMateriais');
    if (!box) return;
    box.innerHTML = '';
    sincronizarPropDefsComMateriais();
    const chip = (id, rotulo) => {
      const b = document.createElement('button');
      b.className = 'prop-cat' + (pincelMaterial === id ? ' ativo' : '');
      b.textContent = rotulo;
      b.addEventListener('click', () => {
        pincelMaterial = (pincelMaterial === id) ? null : id;
        if (pincelMaterial) { propParaColocar = null; renderPaletaDeProps(); }
        document.getElementById('pincelTamanhoBox').style.display = pincelMaterial ? '' : 'none';
        document.getElementById('pincelModoBox').style.display = pincelMaterial ? '' : 'none';
        if (!pincelMaterial) { estradaDe = null; estradaAte = null; pracaCentro = null; pracaAtual = null; }
        window.renderMateriais();
        if (!pincelMaterial) mundoFerramenta = 'selecionar';
        showToast(pincelMaterial ? `🖌️ Pintando ${rotulo}` : '🖌️ Pincel desligado');
      });
      box.appendChild(b);
    };

    // Botão para o próprio usuário escolher e ativar quais chãos quer no pincel
    const btnGerenciar = document.createElement('button');
    btnGerenciar.className = 'tool-pill';
    btnGerenciar.style.cssText = 'margin-bottom:6px;width:100%;font-weight:bold;background:#3b2d1c;color:#fde68a;border:1px solid #d97706;cursor:pointer;';
    btnGerenciar.textContent = '⚙️ Escolher Chãos Pintáveis';
    btnGerenciar.onclick = () => abrirModalGerenciarPisos();
    box.appendChild(btnGerenciar);

    Object.keys(MATERIAIS).forEach(carregarTexturaDoPincel);
    Object.entries(MATERIAIS).forEach(([id, d]) => chip(id, d.nome));
    chip('apagar', '🧽 Apagar');
  };
  window.renderMateriais();
  const marcarModoDoPincel = () => {
    document.getElementById('pincelModoLivre')?.classList.toggle('ativo', pincelModo === 'livre');
    document.getElementById('pincelModoEstrada')?.classList.toggle('ativo', pincelModo === 'estrada');
    document.getElementById('pincelModoPraca')?.classList.toggle('ativo', pincelModo === 'praca');
  };
  document.getElementById('pincelModoLivre')?.addEventListener('click', () => {
    pincelModo = 'livre'; estradaDe = estradaAte = null; pracaCentro = pracaAtual = null; marcarModoDoPincel();
  });
  document.getElementById('pincelModoEstrada')?.addEventListener('click', () => {
    pincelModo = 'estrada'; estradaDe = estradaAte = null; pracaCentro = pracaAtual = null; marcarModoDoPincel();
    showToast('🛣️ Clique, arraste e solte. A ponta vira o começo do próximo · Shift solta o ângulo · Esc encerra');
  });
  document.getElementById('pincelModoPraca')?.addEventListener('click', () => {
    pincelModo = 'praca'; estradaDe = estradaAte = null; pracaCentro = pracaAtual = null; marcarModoDoPincel();
    showToast('⭕ Clique no centro da praça, arraste para definir o tamanho e solte para preencher!');
  });
  marcarModoDoPincel();

  document.getElementById('pincelTam')?.addEventListener('input', e => {
    pincelTamanho = parseInt(e.target.value, 10) || 90;
    const v = document.getElementById('pincelTamVal');
    if (v) v.textContent = pincelTamanho + 'px';
  });

  // ── Criador de mundo ──────────────────────────────────────────────────────────
  const marcarFerramenta = () => {
    const mapa = { mover:'mundoFerrMover', plantar:'mundoFerrPlantar',
                   selecionar:'mundoFerrSel', multiselecao:'mundoFerrMulti', partida:'mundoFerrPartida' };
    Object.entries(mapa).forEach(([f, id]) =>
      document.getElementById(id)?.classList.toggle('ativo', mundoFerramenta === f));
  };
  const usarFerramenta = f => {
    mundoFerramenta = f; marcarFerramenta();
    if (f === 'plantar' && !propParaColocar)
      showToast('🌲 Escolha um prop na aba Objetos primeiro');
    else if (f === 'multiselecao')
      showToast('📦 Arraste o mouse/dedo sobre a tela para selecionar vários objetos de uma vez');
  };
  document.getElementById('mundoFerrPlantar')?.addEventListener('click', () => usarFerramenta('plantar'));
  document.getElementById('mundoFerrSel')?.addEventListener('click', () => usarFerramenta('selecionar'));
  document.getElementById('mundoFerrMulti')?.addEventListener('click', () => usarFerramenta('multiselecao'));
  document.getElementById('mundoFerrDeletarMulti')?.addEventListener('click', () => deletarPropsSelecionadosEmLote());
  document.getElementById('mundoFerrPartida')?.addEventListener('click', () => usarFerramenta('partida'));
  document.getElementById('mundoTestarBtn')?.addEventListener('click', () => mundoTestar(!mundoTeste));
  document.getElementById('mundoSalvarBtn')?.addEventListener('click', saveMundo);

  const atualizarTamanhoDoMundo = () => {
    const el = document.getElementById('mundoTamanho');
    if (el) el.textContent =
      `${mundoLargura()} x ${mundoAltura()} px · ${MUNDO.cols * MUNDO.rows} blocos`;
  };
  ['mundoCols','mundoRows'].forEach(id => document.getElementById(id)?.addEventListener('change', e => {
    const v = Math.max(1, Math.min(40, parseInt(e.target.value, 10) || 1));
    if (id === 'mundoCols') MUNDO.cols = v; else MUNDO.rows = v;
    e.target.value = v;
    atualizarTamanhoDoMundo(); saveMundo();
  }));
  // Duas passadas: aos 500ms os campos já existem, e aos 1800 o mundo terminou de
  // carregar. Com uma só, o painel mostrava as dimensões antigas para sempre.
  const sincronizarPainelDoMundo = () => {
    const c = document.getElementById('mundoCols'); if (c) c.value = MUNDO.cols;
    const r = document.getElementById('mundoRows'); if (r) r.value = MUNDO.rows;
    atualizarTamanhoDoMundo(); marcarFerramenta();
  };
  setTimeout(sincronizarPainelDoMundo, 500);
  setTimeout(sincronizarPainelDoMundo, 1800);

  // Copiar e colar. Vem antes do resto porque colar funciona sem nada selecionado.
  window.addEventListener('keydown', e => {
    if (engineMode !== 'mundo' || mundoTeste) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); e.shiftKey ? refazer() : desfazer(); }
    else if (k === 'y') { e.preventDefault(); refazer(); }
    else if (k === 'c') { e.preventDefault(); copiarSelecao(); }
    else if (k === 'v') { e.preventDefault(); colarSelecao(); }
    else if (k === 'd') { e.preventDefault(); copiarSelecao(); colarSelecao(); }
  });

  // Apagar objeto do mundo com Delete, que é o gesto de todo editor.
  window.addEventListener('keydown', e => {
    if (engineMode !== 'mundo') return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    
    // Se há múltiplos objetos selecionados, Delete apaga todos!
    if ((e.key === 'Delete' || e.key === 'Backspace') && mundoPropsSelecionados && mundoPropsSelecionados.length > 0) {
      e.preventDefault();
      registrarDesfazer();
      deletarPropsSelecionadosEmLote();
      return;
    }

    if (!mundoPropSel) return;
    // Andando, D é "ir para a direita" e as setas também andam: só Delete sobrevive.
    if (mundoTeste && !['Delete', 'Backspace'].includes(e.key)) return;
    const p = mundoPropSel;
    const passo = e.shiftKey ? 10 : 1;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault(); registrarDesfazer();
      MUNDO.props = MUNDO.props.filter(x => x !== p);
      mundoPropSel = null; saveMundo(); showToast('🗑️ Objeto removido');
    } else if (e.key === 'ArrowLeft')  { e.preventDefault(); registrarDesfazer(true); p.x -= passo; }
    else if (e.key === 'ArrowRight') { e.preventDefault(); registrarDesfazer(true); p.x += passo; }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); registrarDesfazer(true); p.y -= passo; }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); registrarDesfazer(true); p.y += passo; }
    else if (e.key === 'd' || e.key === 'D') {
      registrarDesfazer();
      const novo = { ...p, id: `${p.prop}_${Date.now()}`, x: p.x + 40, y: p.y + 10 };
      MUNDO.props.push(novo); mundoPropSel = novo; saveMundo();
      showToast('⧉ Duplicado');
    } else if (e.key === 'f' || e.key === 'F') { registrarDesfazer(); p.flipX = !p.flipX; saveMundo(); }
    else if ((e.key === 'v' || e.key === 'V') && !e.metaKey && !e.ctrlKey) {
      registrarDesfazer(); p.flipY = !p.flipY; saveMundo(); showToast('⇅ Espelhado na vertical');
    }
    else if (e.key === 'r' || e.key === 'R') { p.rot = 0; saveMundo(); showToast('↺ Giro zerado'); }
    else return;
  });

  // A aba Objetos redesenha a paleta ao abrir: garante a lista certa mesmo que os
  // sprites tenham chegado depois do carregamento, e atualiza a contagem do mapa atual.
  document.getElementById('elementsGalleryTab')?.addEventListener('click', renderPaletaDeProps);

  // Inspetor de objeto de cenário
  document.getElementById('obj_escala')?.addEventListener('input', e => aplicarEscalaDoObjeto(e.target.value));
  document.getElementById('objEscalaMenos')?.addEventListener('click',
    () => aplicarEscalaDoObjeto((objetoSelecionado?.escala || 1) - 0.1));
  document.getElementById('objEscalaMais')?.addEventListener('click',
    () => aplicarEscalaDoObjeto((objetoSelecionado?.escala || 1) + 0.1));
  ['obj_x','obj_y'].forEach(id => document.getElementById(id)?.addEventListener('change', e => {
    if (!objetoSelecionado) return;
    const v = parseInt(e.target.value, 10) || 0;
    if (id === 'obj_x') objetoSelecionado.x = v; else objetoSelecionado.y = v;
    saveObjetos();
  }));
  document.getElementById('obj_espelhar')?.addEventListener('change', e => {
    if (!objetoSelecionado) return;
    objetoSelecionado.flipX = e.target.checked; saveObjetos();
  });
  document.getElementById('objDuplicar')?.addEventListener('click', () => {
    if (!objetoSelecionado) return;
    const o = objetoSelecionado;
    const novo = { ...o, id: `${o.prop}_${Date.now()}`, x: o.x + 40, y: o.y + 12 };
    objetos.push(novo); objetoSelecionado = novo;
    mostrarInspetorDeObjeto(novo); renderPaletaDeProps(); saveObjetos();
    showToast('⧉ Objeto duplicado');
  });
  document.getElementById('objApagar')?.addEventListener('click', () => {
    if (!objetoSelecionado) return;
    objetos = objetos.filter(x => x !== objetoSelecionado);
    objetoSelecionado = null; mostrarInspetorDeObjeto(null);
    renderPaletaDeProps(); saveObjetos();
    showToast('🗑️ Objeto removido');
  });

  // Inspetor de monstro
  document.getElementById('mob_escala')?.addEventListener('input', e => aplicarEscalaDoMonstro(e.target.value));
  document.getElementById('mobEscalaMenos')?.addEventListener('click',
    () => aplicarEscalaDoMonstro((selectedMonster?.escala || 1) - 0.1));
  document.getElementById('mobEscalaMais')?.addEventListener('click',
    () => aplicarEscalaDoMonstro((selectedMonster?.escala || 1) + 0.1));
  ['mob_x','mob_y'].forEach(id => document.getElementById(id)?.addEventListener('change', e => {
    if (!selectedMonster) return;
    const v = parseInt(e.target.value, 10) || 0;
    if (id === 'mob_x') { selectedMonster.x = v; selectedMonster.homeX = v; }
    else { selectedMonster.y = v; selectedMonster.homeY = v; }
    saveMonsters();
  }));
  document.getElementById('mob_espelhar')?.addEventListener('change', e => {
    if (!selectedMonster) return;
    selectedMonster.flipX = e.target.checked; saveMonsters();
  });
  document.getElementById('mobDuplicar')?.addEventListener('click', () => {
    if (!selectedMonster) return;
    const m = selectedMonster;
    const novo = { ...m, id: `${m.type}_${Date.now()}`, x: m.x + 40, y: m.y + 20 };
    novo.homeX = novo.x; novo.homeY = novo.y;
    monsters.push(novo); selectedMonster = novo;
    mostrarInspetorDeMonstro(novo); saveMonsters();
    showToast('⧉ Monstro duplicado');
  });
  document.getElementById('mobApagar')?.addEventListener('click', () => {
    if (!selectedMonster) return;
    monsters = monsters.filter(x => x !== selectedMonster);
    selectedMonster = null; mostrarInspetorDeMonstro(null); saveMonsters();
    showToast('🗑️ Monstro removido');
  });

  document.getElementById('capturaOk')?.addEventListener('click', fecharRevelacaoDaCaptura);
  document.getElementById('sorteioBtn')?.addEventListener('click', rodarSorteio);
  document.getElementById('sorteioSair')?.addEventListener('click', fecharSorteio);
  ['sorteioOverlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentElement !== document.body) document.body.appendChild(el);
  });

  document.getElementById('altarCloseBtn')?.addEventListener('click',
    () => document.getElementById('altarOverlay')?.classList.add('hidden'));

  ['forgeOverlay', 'forgeAnvilOverlay', 'mainMenuOverlay', 'altarOverlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentElement !== document.body) document.body.appendChild(el);
  });

  const overlay = document.getElementById('forgeOverlay');
  const closeBtn = document.getElementById('forgeCloseBtn');
  const tabs = document.querySelectorAll('.forge-tab');

  tabs.forEach(t => {
    t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      activeForgeTab = t.dataset.forgetab;
      renderForgeItemsList();
    });
  });

  closeBtn?.addEventListener('click', () => {
    overlay?.classList.add('hidden');
  });

  // Martelar: botão, tecla e toque em qualquer lugar do painel — em paisagem de
  // celular o polegar não vai caçar um alvo pequeno.
  const anvil = document.getElementById('forgeAnvilOverlay');
  document.getElementById('anvilStrikeBtn')?.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation(); martelar();
  });
  anvil?.addEventListener('pointerdown', e => { e.preventDefault(); martelar(); });
  window.addEventListener('keydown', e => {
    if (!forging) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); martelar(); }
  });
}

function openForgeMenu() {
  const overlay = document.getElementById('forgeOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  renderForgeItemsList();
}

function atualizarBolsaDaForja() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('forgeWood', playerInventory.wood || 0);
  set('forgeStone', playerInventory.stone || 0);
  set('forgeCoins', playerCoins || 0);
  set('forgeClaves', claveCount || 0);
}

// ── Forging ceremony ──────────────────────────────────────
// Instant crafting felt like nothing happened. The bar takes a few seconds, the hammer
// lands on a beat, and only when it finishes are the resources spent and the tool given.
let forging = null;

// Qualidade nasce do minigame de ritmo e fica gravada junto do item. Ela é o que
// diferencia duas ferramentas iguais e dá sentido a forjar bem.
let toolQuality = {};
window.__toolQuality = () => toolQuality;
const QUALIDADES = {
  comum:      { nome: 'Comum',      selo: '',    cor: '#94a3b8', bonusColeta: 0    },
  boa:        { nome: 'Boa',        selo: '✦',   cor: '#7dd3fc', bonusColeta: 0.15 },
  ressonante: { nome: 'Ressonante', selo: '✦✦', cor: '#fde68a', bonusColeta: 0.30 },
};
function qualidadeDe(id) { return QUALIDADES[toolQuality[id] || 'comum']; }

// Bônus da ferramenta equipada: quanto mais ressonante, menos golpes por recurso.
function bonusDeColeta() {
  const ids = [equipped.axe, equipped.pickaxe, equipped.hammer].filter(Boolean);
  return ids.reduce((m, id) => Math.max(m, qualidadeDe(id).bonusColeta), 0);
}

function startForging(tool) {
  if (forging) return;
  const overlay = document.getElementById('forgeAnvilOverlay');
  if (!overlay) { completeForging(tool, 'comum'); return; }

  // Quanto melhor a ferramenta, mais golpes e mais rápido o cursor: o ofício cobra ritmo.
  const golpes = 3 + Math.min(2, tool.tier - 1);
  const bonus = derivedStats().forja / 100;      // Ritmo
  forging = {
    tool, golpes, feitos: 0, pontos: 0,
    calor: 1, cursor: 0, dir: 1, vel: (0.9 + tool.tier * 0.12) * (1 - bonus * 0.5),
    // Zona perfeita no meio, com uma faixa "boa" em volta. Encolhe conforme o tier.
    // Ritmo alarga a zona dourada: o atributo tem que ser sentido na mão.
    largura: Math.max(0.09, 0.20 - tool.tier * 0.02) * (1 + bonus),
    encerrando: false,
  };

  overlay.classList.remove('hidden', 'done');
  overlay.querySelector('.anvil-title').textContent = 'Bata no compasso';
  overlay.querySelector('.anvil-name').textContent = tool.name;
  const art = overlay.querySelector('.anvil-art');
  art.innerHTML = '';
  const cv = toolIconCanvas(tool.category, tool.tier, 110);
  if (cv) art.appendChild(cv); else art.textContent = tool.icon;
  overlay.querySelector('.anvil-sparks').innerHTML = '';
  overlay.querySelector('.anvil-fill').style.width = '0%';
  // A dica é reescrita no fim da forja; sem reset, a sessão seguinte começa com o
  // veredito da anterior na tela.
  overlay.querySelector('.anvil-hint').textContent =
    'Toque na tela (ou ESPAÇO) quando o martelo cruzar a zona dourada';

  const barra = overlay.querySelector('.rhythm-bar');
  const zp = barra.querySelector('.rz-perfeito'), zb = barra.querySelector('.rz-bom');
  const lp = forging.largura, lb = lp * 2.4;
  zp.style.left = ((0.5 - lp / 2) * 100) + '%'; zp.style.width = (lp * 100) + '%';
  zb.style.left = ((0.5 - lb / 2) * 100) + '%'; zb.style.width = (lb * 100) + '%';
  atualizarPainelDaForja();

  // setInterval e não requestAnimationFrame: em aba de fundo o rAF congela e o jogador
  // ficava preso com o painel aberto.
  forging.timer = setInterval(passoDaForja, 16);
}

function passoDaForja() {
  if (!forging || forging.encerrando) return;
  const overlay = document.getElementById('forgeAnvilOverlay');

  // vai e volta
  forging.cursor += forging.dir * forging.vel * 0.016;
  if (forging.cursor >= 1) { forging.cursor = 1; forging.dir = -1; }
  if (forging.cursor <= 0) { forging.cursor = 0; forging.dir = 1; }

  // o metal esfria: é o relógio do minigame
  forging.calor = Math.max(0, forging.calor - 0.0022);

  overlay.querySelector('.rhythm-cursor').style.left = (forging.cursor * 100) + '%';
  overlay.querySelector('.heat-fill').style.width = (forging.calor * 100) + '%';
  overlay.querySelector('.anvil-fill').style.width = ((forging.feitos / forging.golpes) * 100) + '%';

  if (forging.calor <= 0) finishForging();   // esfriou: sai o que der
}

// Uma martelada. Perto do centro vale 2, na faixa larga vale 1, fora esfria o metal.
function martelar() {
  if (!forging || forging.encerrando) return;
  const d = Math.abs(forging.cursor - 0.5);
  const lp = forging.largura / 2, lb = forging.largura * 1.2;
  let ganho = 0, texto = '';
  if (d <= lp)      { ganho = 2; texto = '✦ PERFEITO!'; forging.calor = Math.min(1, forging.calor + 0.08); }
  else if (d <= lb) { ganho = 1; texto = '✦ Bom';       }
  else              { ganho = 0; texto = '✧ Errou';     forging.calor = Math.max(0, forging.calor - 0.16); }

  forging.pontos += ganho;
  forging.feitos++;
  forging.vel += 0.16;                       // acelera a cada golpe
  playForgeHit();
  faiscasDaForja(ganho ? 8 : 2);
  atualizarPainelDaForja(texto);

  const overlay = document.getElementById('forgeAnvilOverlay');
  const art = overlay.querySelector('.anvil-art');
  art.style.transform = `scale(${ganho === 2 ? 1.16 : ganho ? 1.08 : 0.96})`;
  setTimeout(() => { if (forging) art.style.transform = 'scale(1)'; }, 90);

  if (forging.feitos >= forging.golpes) finishForging();
}

function atualizarPainelDaForja(texto) {
  const overlay = document.getElementById('forgeAnvilOverlay');
  if (!overlay || !forging) return;
  const marcas = Array.from({ length: forging.golpes }, (_, i) =>
    i < forging.feitos ? '✦' : '✧').join(' ');
  overlay.querySelector('.anvil-hits').innerHTML =
    `<span style="color:#fde68a">${marcas}</span>` +
    (texto ? ` &nbsp; <span style="color:#fbbf24">${texto}</span>` : '');
}

function faiscasDaForja(n) {
  const sparks = document.getElementById('forgeAnvilOverlay')?.querySelector('.anvil-sparks');
  if (!sparks) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.className = 'spark';
    s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
    s.style.setProperty('--dy', (-Math.random() * 90 - 20) + 'px');
    s.style.left = '50%'; s.style.top = '58%';
    sparks.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }
}

// A soma das marteladas vira qualidade. Errar tudo ainda entrega a ferramenta: o
// jogador nunca perde material, só perde o brilho.
function qualidadeDoResultado() {
  const max = forging.golpes * 2;
  const r = max ? forging.pontos / max : 0;
  return r >= 0.85 ? 'ressonante' : r >= 0.5 ? 'boa' : 'comum';
}

function finishForging() {
  if (!forging || forging.encerrando) return;   // o timer pode disparar de novo no meio
  forging.encerrando = true;
  clearInterval(forging.timer);
  const { tool } = forging;
  const q = qualidadeDoResultado();
  const info = QUALIDADES[q];
  const overlay = document.getElementById('forgeAnvilOverlay');
  overlay?.classList.add('done');
  overlay.querySelector('.anvil-title').textContent = `✨ ${info.nome} ${info.selo}`;
  overlay.querySelector('.anvil-hint').textContent = info.bonusColeta
    ? `+${Math.round(info.bonusColeta * 100)}% de eficiência na coleta`
    : 'Serve. Da próxima vez, siga o compasso.';
  faiscasDaForja(14);
  playForgeDone();
  completeForging(tool, q);
  forging = null;
  setTimeout(() => { overlay?.classList.add('hidden'); overlay?.classList.remove('done'); renderForgeItemsList(); }, 1600);
}

function completeForging(tool, qualidade = 'comum') {
  toolQuality[tool.id] = qualidade;
  playerInventory.wood -= tool.wood;
  playerInventory.stone -= tool.stone;
  playerCoins -= tool.coins;
  claveCount -= tool.claves;
  playerInventory[tool.id] = 1;
  if (tool.category === 'axes') equipped.axe = tool.id;
  if (tool.category === 'pickaxes') equipped.pickaxe = tool.id;
  if (tool.category === 'hammers') equipped.hammer = tool.id;
  if (tool.category === 'ressonadores') equipped.ressonador = tool.id;
  // Sai da bigorna com a peça na mão: é o momento em que o jogador quer vê-la.
  equipped.activeTool = Object.entries(CATEGORIA_POR_SLOT)
    .find(([, cat]) => cat === tool.category)?.[0] || equipped.activeTool;
  progressoDeMissao('forjar', tool.id);
  const q = QUALIDADES[qualidade];
  addFloater(player.x, player.y - 50, `✨ ${tool.name} ${q.selo}`, q.cor);
  showToast(`🔨 ${tool.name} — qualidade ${q.nome}!`);
  updateInventorySlotsUI();
  updateHotbarUI();
  savePlayerData();
}

function playForgeHit() {
  if (!audioCtx) return;
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(900 + Math.random() * 200, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.16);
    g.gain.setValueAtTime(0.10, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.22);
  } catch (e) {}
}
function playForgeDone() {
  if (!audioCtx) return;
  try {
    [660, 880, 1320].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t0 = audioCtx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + 0.32);
    });
  } catch (e) {}
}

function renderForgeItemsList() {
  atualizarBolsaDaForja();
  const container = document.getElementById('forgeItemsList');
  if (!container) return;
  container.innerHTML = '';

  const filtered = CRAFTABLE_TOOLS.filter(t => t.category === activeForgeTab);

  filtered.forEach(tool => {
    const card = document.createElement('div');
    card.className = 'forge-card';

    const hasWood = (playerInventory.wood || 0) >= tool.wood;
    const hasStone = (playerInventory.stone || 0) >= tool.stone;
    const hasCoins = playerCoins >= tool.coins;
    const hasClaves = claveCount >= tool.claves;
    const hasLevel = level >= tool.minLvl;

    const owned = (playerInventory[tool.id] || 0) > 0 || (equipped.axe === tool.id || equipped.pickaxe === tool.id);
    const canCraft = hasWood && hasStone && hasCoins && hasClaves && hasLevel;

    // A cor da raridade tinge a moldura do card; a arte e o nome ficam na primeira
    // linha, requisitos como fichas, e a ação ocupando toda a base.
    card.style.setProperty('--tier', tool.color || '#f59e0b');
    const ficha = (ok, txt) => `<span style="color:${ok ? '#86efac' : '#fca5a5'}">${txt}</span>`;
    card.innerHTML = `
      <span class="forge-card-icon" data-tool-icon>${tool.icon}</span>
      <div class="forge-card-head">
        <div class="forge-card-info">
          <span class="forge-card-name">${tool.name}</span>
          <span class="rarity-badge rarity-${tool.rarity}">T${tool.tier} · ${tool.rarity.toUpperCase()}</span>
        </div>
      </div>
      <p>${tool.desc}</p>
      <div class="forge-reqs">
        ${ficha(hasLevel, `Nível ${tool.minLvl}`)}
        ${tool.wood  > 0 ? ficha(hasWood,  `🪵 ${playerInventory.wood  || 0}/${tool.wood}`)  : ''}
        ${tool.stone > 0 ? ficha(hasStone, `🪨 ${playerInventory.stone || 0}/${tool.stone}`) : ''}
        ${ficha(hasCoins, `🪙 ${tool.coins}`)}
        ${tool.claves > 0 ? ficha(hasClaves, `🎼 ${tool.claves}`) : ''}
      </div>
      <button class="forge-btn" ${canCraft && !owned ? '' : 'disabled'}>
        ${owned ? '✓ Já possui' : (canCraft ? '🔨 Forjar' : '🔒 Faltam requisitos')}
      </button>
    `;

    // Swap the emoji placeholder for the real artwork once the sheets have loaded.
    const iconSlot = card.querySelector('[data-tool-icon]');
    const art = toolIconCanvas(tool.category, tool.tier, 56);
    if (iconSlot && art) { iconSlot.textContent = ''; iconSlot.appendChild(art); }

    if (canCraft && !owned) {
      const btn = card.querySelector('.forge-btn');
      btn.addEventListener('click', () => startForging(tool));
    }

    container.appendChild(card);
  });
}

// ── Hotbar ───────────────────────────────────────────────────────────────────────
// Os slots são montados a partir do que o jogador realmente tem: arte da ferramenta,
// selo de qualidade da forja e slot apagado quando ele ainda não possui o item.
// Emoji genérico e rótulo "BRONZE" não diziam nada e destoavam do resto do jogo.
const HOTBAR_SLOTS = [
  { tecla: '1', slot: 'axe',     padrao: 'axe_bronze',  nome: 'Machado',   emoji: '🪓' },
  { tecla: '2', slot: 'pickaxe', padrao: 'pick_bronze', nome: 'Diapasão',  emoji: '⛏️' },
  { tecla: '3', slot: 'hammer',  padrao: 'hammer_ferro',nome: 'Martelo',   emoji: '🔨' },
  { tecla: '4', slot: 'ressonador', padrao: 'reson_cobre', nome: 'Ressonador', emoji: '🔔' },
  { tecla: '5', slot: 'potion',  nome: 'Poção', emoji: '🧪' },
];

function usarSlotDaHotbar(def) {
  if (def.slot === 'potion') {
    if ((playerInventory.potions || 0) > 0) {
      playerInventory.potions--;
      playerHp = Math.min(playerMaxHp(), playerHp + 40);
      showToast('🧪 Poção consumida! +40 HP');
      savePlayerData();
    } else showToast('⚠️ Sem poções no inventário.');
  } else {
    if (!equipped[def.slot]) { showToast(`⚠️ Você ainda não tem um ${def.nome.toLowerCase()}.`); return; }
    equipped.activeTool = def.slot;
    const t = CRAFTABLE_TOOLS.find(x => x.id === equipped[def.slot]);
    showToast(`${def.emoji} ${t ? t.name : def.nome} equipado`);
    savePlayerData();
  }
  updateHotbarUI();
}

function initHotbar() {
  if (!document.getElementById('gameHotbar')) return;

  document.getElementById('hotModeToggle')?.addEventListener('click', () => {
    const coletando = equipped.activeTool !== 'weapon';
    equipped.activeTool = coletando ? 'weapon' : (equipped.axe ? 'axe' : 'hammer');
    showToast(coletando ? '⚔️ Modo Batalha' : '⛏️ Modo Coleta');
    updateHotbarUI();
  });

  window.addEventListener('keydown', e => {
    if (!isPlayMode || dlg.state !== DLG_STATE.CLOSED || shopOpen || inventoryOpen || forging) return;
    const def = HOTBAR_SLOTS.find(s => s.tecla === e.key);
    if (def) usarSlotDaHotbar(def);
  });

  updateHotbarUI();
}

// A barra de itens é HUD: durante fala, cena ou menu aberto ela atrapalha a leitura.
function hotbarVisivel() {
  return isPlayMode
      && dlg.state === DLG_STATE.CLOSED
      && !CUT.ativo && !playerLocked && !forging
      && !shopOpen && !inventoryOpen && !charOpen
      && !playerHud?.classList.contains('hidden');
}

function updateHotbarUI() {
  // A barra de itens foi removida: as ações rápidas virão em botões de canto junto
  // com a magia. A função continua existindo porque é chamada em vários lugares.
  const hotbar = document.getElementById('gameHotbar');
  const caixa = document.getElementById('hotbarSlots');
  if (!hotbar || !caixa) return;
  hotbar.classList.toggle('hidden', !hotbarVisivel());
  if (!isPlayMode) return;

  caixa.innerHTML = '';
  HOTBAR_SLOTS.forEach(def => {
    const el = document.createElement('div');
    el.className = 'hb-slot';
    el.title = def.nome;

    if (def.slot === 'potion') {
      const n = playerInventory.potions || 0;
      el.classList.toggle('vazio', n === 0);
      el.innerHTML = `<span class="hb-key">${def.tecla}</span>
                      <span class="hb-emoji">${def.emoji}</span>
                      <span class="hb-qtd">${n}</span>`;
    } else {
      const id = equipped[def.slot];
      const tool = id && CRAFTABLE_TOOLS.find(t => t.id === id);
      el.classList.toggle('vazio', !tool);
      el.classList.toggle('ativo', equipped.activeTool === def.slot && !!tool);
      el.innerHTML = `<span class="hb-key">${def.tecla}</span>`;
      const arte = tool && toolIconCanvas(tool.category, tool.tier, 34);
      if (arte) el.appendChild(arte);
      else {
        const s = document.createElement('span');
        s.className = 'hb-emoji'; s.textContent = def.emoji;
        el.appendChild(s);
      }
      if (tool) {
        const q = qualidadeDe(tool.id);
        if (q.selo) {
          const selo = document.createElement('span');
          selo.className = 'hb-selo'; selo.textContent = q.selo;
          selo.style.color = q.cor;
          el.appendChild(selo);
        }
        el.title = `${tool.name}${q.selo ? ' · ' + q.nome : ''}`;
      }
    }

    el.addEventListener('click', () => usarSlotDaHotbar(def));
    caixa.appendChild(el);
  });

  const txt = document.getElementById('hotModeText');
  const ico = document.getElementById('hotModeIcon');
  const batalha = equipped.activeTool === 'weapon';
  if (txt) txt.textContent = batalha ? 'Batalha' : 'Coleta';
  if (ico) ico.textContent = batalha ? '⚔️' : '⛏️';
}

// ── MODALIDADE TABLET EDITOR / TOUCH MAP BUILDER ──────────────────────────────
let mundoPropsSelecionados = []; // Array de props selecionados em lote
let caixaSelecaoMultipla = null; // { x1, y1, x2, y2 } em coordenadas do mundo
let tabletPinchDistInicial = 0;
let tabletZoomInicial = 1;

function initModoTablet() {
  const modoTabletBtn = document.getElementById('modoTabletBtn');
  const modoTabletHeaderBtn = document.getElementById('modoTabletHeaderBtn');
  const menuTabletEditorBtn = document.getElementById('menuTabletEditorBtn');
  const drawer = document.getElementById('tabletTopDrawer');
  const drawerHandle = document.getElementById('tabletDrawerHandle');
  const toggleChevron = document.getElementById('tabletDrawerToggleBtn');
  const exitBtn = document.getElementById('tabFerrSair');
  const saveBtn = document.getElementById('tabFerrSalvar');

  [modoTabletBtn, modoTabletHeaderBtn, menuTabletEditorBtn].forEach(btn => {
    btn?.addEventListener('click', () => {
      document.getElementById('mainMenuOverlay')?.classList.add('hidden');
      ativarModoTablet(true);
    });
  });

  if (drawerHandle) {
    drawerHandle.addEventListener('click', () => {
      if (drawer) {
        drawer.classList.toggle('collapsed');
        if (toggleChevron) toggleChevron.textContent = drawer.classList.contains('collapsed') ? '▼' : '▲';
      }
    });
  }

  if (exitBtn) {
    exitBtn.addEventListener('click', () => {
      ativarModoTablet(false);
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveMundo();
      showToast('💾 Mundo salvo com sucesso!');
    });
  }

  // Ferramentas do Tablet Drawer
  const bindTabBtn = (id, ferramenta) => {
    document.getElementById(id)?.addEventListener('click', () => {
      document.querySelectorAll('.tablet-tools-grid .tablet-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(id)?.classList.add('active');
      mundoFerramenta = ferramenta;
      pincelMaterial = null;
      if (ferramenta !== 'multiselecao') {
        caixaSelecaoMultipla = null;
        mundoPropsSelecionados = [];
        atualizarBarraSelecaoMultipla();
      }
      showToast(`Ferramenta: ${ferramenta}`);
    });
  };

  bindTabBtn('tabFerrPan', 'mover');
  bindTabBtn('tabFerrSel', 'selecionar');
  bindTabBtn('tabFerrMulti', 'multiselecao');
  bindTabBtn('tabFerrPartida', 'partida');

  renderMateriaisTablet();
  renderPropPaletteTablet();
  initTabletMultiSelectEvents();

  // Multi-Touch Pinch Zoom no Tablet
  if (canvas) {
    canvas.addEventListener('touchstart', (e) => {
      if (document.body.classList.contains('tablet-editor-active') && e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1];
        tabletPinchDistInicial = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        tabletZoomInicial = mundoCam.zoom;
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (document.body.classList.contains('tablet-editor-active') && e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (tabletPinchDistInicial > 0) {
          const fator = dist / tabletPinchDistInicial;
          mundoCam.zoom = Math.max(0.25, Math.min(3.5, tabletZoomInicial * fator));
        }
      }
    }, { passive: false });
  }
}

function ativarModoTablet(ativar) {
  const drawer = document.getElementById('tabletTopDrawer');
  const mainMenuOverlay = document.getElementById('mainMenuOverlay');
  const loadingOverlay = document.getElementById('loadingOverlay');

  if (ativar) {
    document.body.classList.add('tablet-editor-active');
    document.body.classList.remove('mobile-play');
    if (mainMenuOverlay) mainMenuOverlay.classList.add('hidden');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');

    if (drawer) {
      drawer.classList.remove('hidden');
      drawer.classList.remove('collapsed');
    }
    engineMode = 'mundo';
    if (typeof renderMateriaisTablet === 'function') renderMateriaisTablet();
    if (typeof renderPropPaletteTablet === 'function') renderPropPaletteTablet();
    showToast('📱 Modo Tablet ativado! Abra a gaveta superior para escolher materiais e sprites.');
  } else {
    document.body.classList.remove('tablet-editor-active');
    if (drawer) drawer.classList.add('hidden');
    showToast('❌ Modo Tablet desativado.');
  }
}

function renderMateriaisTablet() {
  const box = document.getElementById('tabletMaterialsBox');
  if (!box) return;
  box.innerHTML = '';

  const semMaterial = document.createElement('button');
  semMaterial.className = 'tablet-mat-chip' + (!pincelMaterial ? ' active' : '');
  semMaterial.textContent = '🚫 Sem Pincel';
  semMaterial.addEventListener('click', () => {
    pincelMaterial = null;
    document.querySelectorAll('.tablet-mat-chip').forEach(c => c.classList.remove('active'));
    semMaterial.classList.add('active');
    showToast('Pincel desligado');
  });
  box.appendChild(semMaterial);

  Object.entries(MATERIAIS).forEach(([id, d]) => {
    const chip = document.createElement('button');
    chip.className = 'tablet-mat-chip' + (pincelMaterial === id ? ' active' : '');
    chip.textContent = `🛣️ ${d.nome}`;
    chip.addEventListener('click', () => {
      pincelMaterial = id;
      carregarTexturaDoPincel(id);
      document.querySelectorAll('.tablet-mat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      showToast(`Pincel ativado: ${d.nome}`);
    });
    box.appendChild(chip);
  });

  const slider = document.getElementById('tabPincelSlider');
  const val = document.getElementById('tabPincelVal');
  if (slider) {
    slider.value = pincelTamanho;
    slider.addEventListener('input', (e) => {
      pincelTamanho = parseInt(e.target.value, 10) || 90;
      if (val) val.textContent = pincelTamanho + 'px';
    });
  }
}

function renderPropPaletteTablet() {
  const catBox = document.getElementById('tabletPropCats');
  const paletaBox = document.getElementById('tabletPropPalette');
  if (!catBox || !paletaBox) return;

  const categorias = ['novo', 'tudo', 'muralhas', 'arvore', 'construcao', 'vila', 'rio', 'sagrado', 'musical'];
  catBox.innerHTML = '';
  
  let catSel = 'muralhas';

  const carregarPaleta = (cat) => {
    catSel = cat;
    catBox.querySelectorAll('.tablet-prop-cat').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
    paletaBox.innerHTML = '';

    const ids = Object.keys(propDefs).filter(id => {
      if (cat === 'tudo') return true;
      if (cat === 'novo') return propDefs[id].novo === true || propDefs[id].categoria === 'novo';
      return propDefs[id].categoria === cat;
    });

    if (!ids.length) {
      paletaBox.innerHTML = `<div style="padding: 12px; color: #94a3b8; font-size: 13px;">Nenhum item em <b>${cat === 'novo' ? 'Novo' : cat}</b>.</div>`;
      return;
    }

    ids.forEach(id => {
      const def = propDefs[id];
      const item = document.createElement('div');
      item.className = 'tablet-prop-item' + (propParaColocar === id ? ' selected' : '');
      
      const img = document.createElement('img');
      img.src = def.sprite || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
      
      const span = document.createElement('span');
      span.textContent = def.nome || id;

      item.appendChild(img);
      item.appendChild(span);

      item.addEventListener('click', () => {
        propParaColocar = id;
        pincelMaterial = null;
        mundoFerramenta = 'plantar';
        paletaBox.querySelectorAll('.tablet-prop-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        showToast(`🌲 Prop selecionado: ${def.nome || id}`);
      });

      paletaBox.appendChild(item);
    });
  };

  categorias.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'tablet-prop-cat' + (cat === catSel ? ' active' : '');
    btn.dataset.cat = cat;
    const nome = cat === 'novo' ? '✨ Novo' : (cat === 'muralhas' ? '🏰 Muralhas' : (cat.charAt(0).toUpperCase() + cat.slice(1)));
    btn.textContent = nome;
    if (cat === 'novo') btn.style.color = '#fbbf24';
    btn.addEventListener('click', () => carregarPaleta(cat));
    catBox.appendChild(btn);
  });

  carregarPaleta('muralhas');
}

function initTabletMultiSelectEvents() {
  const scaleUp = document.getElementById('tabMultiScaleUp');
  const scaleDown = document.getElementById('tabMultiScaleDown');
  const delBtn = document.getElementById('tabMultiDelete');
  const clearBtn = document.getElementById('tabMultiClear');

  scaleUp?.addEventListener('click', () => {
    const alvos = [...(mundoPropsSelecionados || [])];
    if (mundoPropSel && !alvos.includes(mundoPropSel)) alvos.push(mundoPropSel);
    alvos.forEach(p => { p.ex = +( (p.ex || 1) * 1.1 ).toFixed(2); p.ey = +( (p.ey || 1) * 1.1 ).toFixed(2); });
    saveMundo(); showToast('🔍+ Escala aumentada');
  });

  scaleDown?.addEventListener('click', () => {
    const alvos = [...(mundoPropsSelecionados || [])];
    if (mundoPropSel && !alvos.includes(mundoPropSel)) alvos.push(mundoPropSel);
    alvos.forEach(p => { p.ex = +( (p.ex || 1) * 0.9 ).toFixed(2); p.ey = +( (p.ey || 1) * 0.9 ).toFixed(2); });
    saveMundo(); showToast('🔍- Escala reduzida');
  });

  delBtn?.addEventListener('click', () => {
    const paraDeletar = [...(mundoPropsSelecionados || [])];
    if (mundoPropSel && !paraDeletar.includes(mundoPropSel)) paraDeletar.push(mundoPropSel);
    if (!paraDeletar.length) return;
    const removidos = paraDeletar.length;
    paraDeletar.forEach(p => { if (p && p.id && window._propsDeletadosNestaSessao) window._propsDeletadosNestaSessao.add(p.id); });
    MUNDO.props = MUNDO.props.filter(p => !paraDeletar.includes(p));
    mundoPropsSelecionados = [];
    mundoPropSel = null;
    caixaSelecaoMultipla = null;
    atualizarBarraSelecaoMultipla();
    saveMundo();
    showToast(removidos === 1 ? '🗑️ Objeto removido!' : `🗑️ ${removidos} objetos removidos com sucesso!`);
  });

  clearBtn?.addEventListener('click', () => {
    mundoPropsSelecionados = [];
    mundoPropSel = null;
    caixaSelecaoMultipla = null;
    atualizarBarraSelecaoMultipla();
  });
}

function deletarPropsSelecionadosEmLote() {
  const paraDeletar = [...(mundoPropsSelecionados || [])];
  if (mundoPropSel && !paraDeletar.includes(mundoPropSel)) paraDeletar.push(mundoPropSel);
  if (!paraDeletar.length) return;
  const qtd = paraDeletar.length;
  paraDeletar.forEach(p => { if (p && p.id && window._propsDeletadosNestaSessao) window._propsDeletadosNestaSessao.add(p.id); });
  MUNDO.props = MUNDO.props.filter(p => !paraDeletar.includes(p));
  mundoPropsSelecionados = [];
  mundoPropSel = null;
  caixaSelecaoMultipla = null;
  atualizarBarraSelecaoMultipla();
  saveMundo();
  showToast(`🗑️ ${qtd} objeto(s) excluído(s)!`);
}

function atualizarBarraSelecaoMultipla() {
  const countSpan = document.getElementById('countSelMulti');
  const btnDeletar = document.getElementById('mundoFerrDeletarMulti');
  if (countSpan) countSpan.textContent = (mundoPropsSelecionados ? mundoPropsSelecionados.length : 0);
  if (btnDeletar) {
    btnDeletar.style.display = ((mundoPropsSelecionados && mundoPropsSelecionados.length > 0) || mundoPropSel) ? 'block' : 'none';
  }

  const bar = document.getElementById('tabletMultiSelectBar');
  const count = document.getElementById('tabletMultiCount');
  if (bar && count) {
    const total = (mundoPropsSelecionados ? mundoPropsSelecionados.length : 0) + (mundoPropSel && (!mundoPropsSelecionados || !mundoPropsSelecionados.includes(mundoPropSel)) ? 1 : 0);
    if (total > 0) {
      bar.classList.remove('hidden');
      if (total === 1 && mundoPropSel) {
        const nome = (propDefs && mundoPropSel.prop && propDefs[mundoPropSel.prop]?.nome) ? propDefs[mundoPropSel.prop].nome : (mundoPropSel.prop || 'Objeto');
        count.textContent = `1 selecionado (${nome})`;
      } else {
        count.textContent = `${total} objetos selecionados`;
      }
    } else {
      bar.classList.add('hidden');
    }
  }
}
