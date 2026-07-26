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
  'mega_world': 'assets/mega_map_1.jpg',
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
  refreshNPCHierarchy();
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
const NPC_RUNTIME_FIELDS = ['hits','shakeUntil','depletedUntil','_npcRef'];
function serialisableNPC(n) {
  const out = {};
  for (const k in n) if (!NPC_RUNTIME_FIELDS.includes(k)) out[k] = n[k];
  return out;
}

async function saveNPCs() {
  const payload = { npcs: npcData.map(serialisableNPC) };
  localStorage.setItem('wasd_npcs_v2', JSON.stringify(payload));
  try { await fetch('/save_npcs', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); } catch(e) {}
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
  await Promise.all(Object.keys(bgSources).map(k => loadLayerKey(k)));
  // Masks just changed under us — drop the derived caches.
  Object.keys(bgSources).forEach(k => { invalidateRoadPaint(k); invalidateDoorMarkers(k); });
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
  rebuildGrid();
  const wc={gridPos,spawns,bgSources,sceneNames:SCENE_NAMES}, payload={worldConfig:wc};
  for (const k of Object.keys(bgSources)) {
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
  } catch(e) {
    const ls=localStorage.getItem('wasd_world_config_v17');
    if(ls){
      try{
        const c=JSON.parse(ls);
        if(c.gridPos)Object.assign(gridPos,c.gridPos);
        if(c.spawns)Object.assign(spawns,c.spawns);
        if(c.bgSources)Object.assign(bgSources,c.bgSources);
        if(c.sceneNames)Object.assign(SCENE_NAMES,c.sceneNames);
      }catch(ee){}
    }
  }
  bgSources['mega_world'] = 'assets/mega_map_1.jpg';
  SCENE_NAMES['mega_world'] = '🗺️ Mega Cenário 2K';

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
const player = { x:512, y:400, width:48, height:64, speed:3.9, sprintSpeed:6.65, direction:'down', isMoving:false, animFrame:0, animTimer:0 };
let playerLocked = false, savedDoorPos = {x:512,y:380}, savedDoorMap = null, lastTransTime=0, lastDoorTime=0, lastDeadEndToast=0 /* unused */;
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

const NPC_DRAW = {
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
    dlg.state=DLG_STATE.NAME_INPUT; dlg._nextStep=step.next; showNameInput();
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
function subVars(txt) { return txt.replace('{PLAYER_NAME}', playerName||'Viajante'); }

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
  const npcName = dlg.script?.npc_name || dlg.npc?.name || 'NPC';
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
      ctx.fillText(ch.text, r.x+16, r.y+r.h/2);
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
  showQuestNotif(q); refreshQuestPanel();
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

function getMegaWorldDimensions() {
  const bg = bgImages['mega_world'];
  if (bg && bg.complete && bg.naturalWidth > 0) {
    return {
      w: bg.naturalWidth,
      h: bg.naturalHeight
    };
  }
  return { w: 1024, h: 571 };
}

function isWalkable(x,y) {
  const dims = currentKey === 'mega_world' ? getMegaWorldDimensions() : { w: SCREEN_W, h: SCREEN_H };
  if (x < 24 || x > dims.w - 24 || y < 28 || y > dims.h - 28) return false;
  if (currentScene !== 'world') return true;   // interiors have no painted collision
  if (!hasRoadPaint(currentKey)) return true;
  const L = getLayers(currentKey);
  try { const p = L.roadCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data; return p[1] > 100 && p[3] > 50; } catch(e) { return true; }
}
function canMoveTo(x,y){return isWalkable(x,y)&&isWalkable(x-4,y)&&isWalkable(x+4,y)&&isWalkable(x,y-4)&&isWalkable(x,y+4);}

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
    enterAt: { x: 512, y: 440 },
    exitY: 530,
    // Where the shopkeeper's counter is, for the action button.
    counter: { x: 512, y: 330, r: 150 },
    counterAction: 'shop',
  },
  ferraria: {
    name: '🔨 Ferraria',
    videoId: 'forgeVideo',
    still: () => null,
    enterAt: { x: 512, y: 470 },
    exitY: 545,
    counter: { x: 512, y: 320, r: 165 },   // the anvil
    counterAction: 'forge',
  },
};

function interiorDef() { return INTERIORS[currentScene] || null; }

function enterInterior(key) {
  const def = INTERIORS[key];
  if (!def) return;
  savedDoorPos = { x: player.x, y: player.y + 20 };
  savedDoorMap = currentKey;
  lastDoorTime = performance.now();
  currentScene = key;
  player.x = def.enterAt.x; player.y = def.enterAt.y;
  if (!def.still?.()) {
    const v = document.getElementById(def.videoId);
    if (v) { v.muted = false; v.volume = 0.7; v.classList.remove('hidden'); v.play().catch(()=>{}); }
  }
  showToast(def.name);
}

function leaveInterior() {
  const def = interiorDef();
  if (def) {
    const v = document.getElementById(def.videoId);
    v?.pause(); v?.classList.add('hidden');
  }
  lastDoorTime = performance.now();
  currentScene = 'world';
  if (savedDoorMap) currentKey = savedDoorMap;
  player.x = savedDoorPos.x; player.y = savedDoorPos.y;
  showToast('🏰 Voltou ao mapa!');
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
    if(d<npc.triggerRadius&&d<bestD){best=npc;bestD=d;}
  }
  return best;
}

// ============================================================
// MONSTERS
// Sheets are 4x4 grids of poses rather than a walk cycle, so one cell is picked as the
// standing pose (configurable per type) and movement gets its life from a hop bob.
// ============================================================
let monsterDefs = {}, monsters = [];
const monsterSprites = {}; // type -> prepared sheet

async function loadMonsters() {
  let cfg;
  try {
    const r = await fetch(`assets/monsters.json?t=${Date.now()}`);
    cfg = await r.json();
  } catch (e) { return; }
  monsterDefs = cfg.types || {};

  Object.entries(monsterDefs).forEach(([type, def]) => {
    if (!def.sprite) return;
    const img = new Image();
    img.onload = () => { try { monsterSprites[type] = prepareSpriteCell(img, def); } catch (e) {} };
    img.onerror = () => {};
    img.src = def.sprite;
  });

  monsters = (cfg.spawns || []).map(s => {
    const def = monsterDefs[s.type] || {};
    return {
      ...s,
      hp: def.hp ?? 20, maxHp: def.hp ?? 20,
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
  const h = monsterDef(m).height || 60;
  const w = spr ? h * (spr.sw / spr.sh) : h * 0.8;
  return { x: m.x - w/2, y: m.y - h, w, h };
}
function liveMonsters() {
  return monsters.filter(m => !m.dead && m.mapKey === currentKey);
}

// Editor: pick and drag monsters like NPCs.
let selectedMonster = null, dragMonster = null;
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

async function saveMonsters() {
  const payload = {
    types: monsterDefs,
    spawns: monsters.map(m => ({ id:m.id, type:m.type, mapKey:m.mapKey, x:Math.round(m.x), y:Math.round(m.y) })),
  };
  localStorage.setItem('acordelot_monsters_v1', JSON.stringify(payload));
  try { await fetch('/save_monsters', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }); } catch(e) {}
}

function updateMonsters(now) {
  if (!isPlayMode || currentScene !== 'world') return;
  monsters.forEach(m => {
    if (m.dead) {
      if (m.respawnAt && now >= m.respawnAt) {
        m.dead = false; m.hp = m.maxHp; m.x = m.homeX; m.y = m.homeY; m.respawnAt = 0;
      }
      return;
    }
    if (m.mapKey !== currentKey) return;
    const def = monsterDef(m);
    const dx = player.x - m.x, dy = player.y - m.y;
    const dist = Math.hypot(dx, dy);

    // Monsters hold their post — the player walks to them. They only turn to face.
    if (dist < (def.aggroRange ?? 160)) m.facing = dx < 0 ? -1 : 1;

    // Contact damage, rate-limited so brushing past isn't instant death.
    if (!playerLocked && playerHp > 0 && dist < (def.touchRange ?? 34) && now - m.lastHit > 900) {
      m.lastHit = now;
      damagePlayer(def.damage ?? 5);
    }
  });
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
    const spr = monsterSprites[m.type];
    const b = monsterBounds(m);
    const hop = Math.abs(Math.sin(now * 0.004 + m.phase)) * 3;

    ctx.save();
    if (now < m.hurtUntil) ctx.globalAlpha = (Math.floor(now / 60) % 2) ? 0.35 : 1; // hit flash
    if (spr) {
      ctx.translate(m.x, m.y - hop);
      if (m.facing < 0) ctx.scale(-1, 1);
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
const POINTS_PER_LEVEL = 3;

let level = 1, xp = 0, attrPoints = 0, skillPoints = 1;
let attrs = { forca: 0, agilidade: 0, capacidade: 0 };
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
    maxHp: BASE_MAX_HP + attrs.forca * 4,
    dmg: BASE_DAMAGE + attrs.forca * 2,
    atkSpeed: attrs.agilidade * 3,     // percent
    moveSpeed: attrs.agilidade * 2,    // percent
    capacity: BASE_CAPACITY + attrs.capacidade * 10,
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
  if (m.hp <= 0) killMonster(m, now);
}

function killMonster(m, now) {
  m.dead = true;
  m.hp = 0;
  m.respawnAt = now + 12000; // comes back after 12s so the area stays farmable
  const def = monsterDef(m);
  const drop = def.drop;
  if (drop) {
    const n = (drop.min ?? 1) + Math.floor(Math.random() * (((drop.max ?? 1) - (drop.min ?? 1)) + 1));
    for (let i = 0; i < n; i++) {
      dropItems.push({
        item: drop.item || 'clave',
        x: m.x + (Math.random() * 34 - 17),
        y: m.y + (Math.random() * 16 - 8),
        mapKey: m.mapKey,
        born: now, collected: false,
      });
    }
  }
  grantXp(def.xp ?? Math.max(6, Math.round((def.hp ?? 20) * 0.6)));
  showToast(`✨ ${def.name || 'Monstro'} derrotado!`);
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
      if (claveCount >= claveCapacity()) {
        if (now - lastFullToast > 4000) {
          lastFullToast = now;
          showToast(`🎒 Bolsa cheia (${claveCapacity()}) — aumente a Capacidade`);
        }
        continue; // leave it on the ground
      }
      dropItems.splice(i, 1);
      claveCount++;
      savePlayerData();
      addFloater(player.x, player.y - player.height - 6, '+1 clave', '#fcd34d');
      showToast(`🎼 Clave coletada! (${claveCount}/${claveCapacity()})`);
    }
  }
}

function renderDrops(now) {
  dropItems.forEach(d => {
    if (d.mapKey !== currentKey) return;
    const bob = Math.sin(now * 0.005 + d.x) * 4;
    const h = 30, w = claveSprite ? h * (claveSprite.sw / claveSprite.sh) : 16;
    ctx.save();
    // Glow under the pickup so it reads against busy forest art
    const g = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, 20);
    g.addColorStop(0, 'rgba(253,224,71,0.5)');
    g.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(d.x, d.y, 20, 0, Math.PI * 2); ctx.fill();
    if (claveSprite) {
      ctx.drawImage(claveSprite.canvas, claveSprite.sx, claveSprite.sy, claveSprite.sw, claveSprite.sh,
                    d.x - w/2, d.y - h - bob, w, h);
    } else {
      ctx.fillStyle = '#fbbf24'; ctx.font = '22px serif'; ctx.textAlign = 'center';
      ctx.fillText('𝄞', d.x, d.y - bob);
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
(() => {
  const img = new Image();
  img.onload = () => { shopInterior = img; };
  img.onerror = () => {};
  img.src = 'assets/shop_interior.png';
})();
const SAVE_KEY = 'acordelot_player_v1';

let shopCatalog = { coins_start: 300, slots: {}, items: [] };
let playerCoins = 300;
let ownedItems = [];
let equipped = { hat: null, outfit: null, wings: null, aura: null };
const skinImages = {}; // item id -> HTMLImageElement (only for items with a sprite)

function savePlayerData() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins: playerCoins, owned: ownedItems, equipped, claves: claveCount,
      level, xp, attrPoints, skillPoints, attrs, skills: learnedSkills,
    }));
  } catch (e) {}
}
function loadPlayerData() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (typeof d.coins === 'number') playerCoins = d.coins;
    if (typeof d.claves === 'number') claveCount = d.claves;
    if (Array.isArray(d.owned)) ownedItems = d.owned;
    if (d.equipped) equipped = { ...equipped, ...d.equipped };
    if (typeof d.level === 'number') level = d.level;
    if (typeof d.xp === 'number') xp = d.xp;
    if (typeof d.attrPoints === 'number') attrPoints = d.attrPoints;
    if (typeof d.skillPoints === 'number') skillPoints = d.skillPoints;
    if (d.attrs) attrs = { ...attrs, ...d.attrs };
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
function spotTarget()     { return elementTarget(['spot_wood','spot_stone']); }
function forgeDoorTarget(){ return currentScene==='world' ? elementTarget(['forge_entrance']) : null; }

function actionAvailable() {
  if(shopOpen||inventoryOpen||charOpen)return null;
  if(attackTarget())return 'attack'; // a monster in reach beats everything else
  const counter = atCounter();          // 'shop' inside the skin store, 'forge' in the smithy
  if(counter)return counter;
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

function changeMapWithFade(targetMapKey, targetX = 512, targetY = 300) {
  const overlay = document.getElementById('mapFadeOverlay');
  if (!overlay) {
    currentKey = targetMapKey;
    if (activeMapSelect) activeMapSelect.value = targetMapKey;
    player.x = targetX; player.y = targetY;
    updateMapStatus();
    refreshNPCHierarchy();
    return;
  }

  overlay.classList.remove('hidden');
  overlay.classList.add('fading-out');
  setTimeout(() => {
    currentKey = targetMapKey;
    if (activeMapSelect) activeMapSelect.value = targetMapKey;
    player.x = Math.round(targetX);
    player.y = Math.round(targetY);
    updateMapStatus();
    refreshNPCHierarchy();

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
  if(act==='attack'){ doAttack(); return; }
  else if(act==='shop'){ openShop(); return; }
  else if(act==='forge'){ openForgeMenu(); return; }
  
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
        if(!npc.targetMapKey || !bgSources[npc.targetMapKey]){
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
        const maxHits = Math.max(1, 4 - Math.floor((level - 1) / 2));
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
        const maxHits = Math.max(1, 4 - Math.floor((level - 1) / 2));
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
function checkNPCProx() {
  if(!isPlayMode||playerLocked)return;
  const now=performance.now();if(now-npcTriggerDebounce<500)return;
  for(const npc of npcData){
    if(npc.mapKey!==currentKey)continue;
    if(npc.triggered)continue;
    const dx=player.x-npc.x, dy=player.y-npc.y;
    if(Math.sqrt(dx*dx+dy*dy)<(npc.triggerRadius||70)){
      // Signposts never travel on proximity. You arrive standing on the paired signpost,
      // so an automatic trigger would immediately fling you back — ping-ponging until you
      // land somewhere arbitrary. Travel is deliberate: the action button only.
      if(npc.type==='signpost')continue;
      if(npc.dialogue && npc.dialogue !== 'none'){
        npcTriggerDebounce=now;startDialogue(npc);break;
      }
    }
  }
}

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
  if (outfitSprites[tint]) return outfitSprites[tint];
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
  outfitSprites[tint] = c;
  return c;
}
function activeSprite() {
  const it = equipped.outfit && itemById(equipped.outfit);
  return (it && it.tint && getOutfitSprite(it.tint)) || processedSprite;
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
function sideKeys(){const pl=new Set(Object.keys(gridPos).filter(k=>{const p=gridPos[k];return worldGrid[p.row]?.[p.col]===k;}));return Object.keys(bgSources).filter(k=>!pl.has(k));}
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
          signpostWizard.destMapKey = destKey;
          signpostWizard.step = 2;
          // Switch to destination map in scene mode so user can place return signpost
          if(activeMapSelect) activeMapSelect.value = destKey;
          currentKey = destKey;
          setMode('scene');
          npcPlacingMode = true;
          canvas.classList.add('cursor-crosshair');
          updateWizardUI();
          updateMapStatus();
          refreshNPCHierarchy();
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
    // Monsters are draggable too — they sit on top, so they get first claim on a click.
    const mob=monsterAt(m.x,m.y);
    if(mob){
      selectedMonster=mob; deselectNPC();
      dragMonster=mob; dragStart={x:m.x,y:m.y}; dragOffX=m.x-mob.x; dragOffY=m.y-mob.y;
      showToast(`👾 ${monsterDef(mob).name||mob.type}`);
      return;
    }
    selectedMonster=null;
    const hit=npcAt(m.x,m.y);
    if(hit){
      selectNPC(hit);
      draggingNPC=hit;
      dragCandidate=hit;dragStart={x:m.x,y:m.y};dragOffX=m.x-hit.x;dragOffY=m.y-hit.y;
    } else deselectNPC();
  }
}

function onPointerMove(m){
  if(engineMode==='worldmap'&&wvDragKey){wvDragMouse={...m};}
  if(engineMode==='scene'&&!isPlayMode&&dragMonster){
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
  const m={x:mouseCanvasX,y:mouseCanvasY}; // touchend carries no coords — use the last known
  if(engineMode==='worldmap'&&wvDragKey){
    const cell=getCell(m.x,m.y);
    if(cell){const occ=keyAtCell(cell.col,cell.row);if(occ&&occ!==wvDragKey)delete gridPos[occ];gridPos[wvDragKey]={col:cell.col,row:cell.row};rebuildGrid();showToast(`✅ "${SCENE_NAMES[wvDragKey]}" → (${cell.col},${cell.row})`);}
    else showToast(`📦 "${SCENE_NAMES[wvDragKey]}" movido para o banco`);
    rebuildGrid();wvDragKey=null;saveAllLayers(false);
  }
  if(engineMode==='scene'){
    if(draggingNPC){saveNPCs();showToast(`📍 ${draggingNPC.name} → (${draggingNPC.x}, ${draggingNPC.y})`);draggingNPC=null;}
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
  useIconArt('coinIcon', 'coinEmoji', 'assets/ui/coin.png');
  useIconArt('storeCoinIcon', 'storeCoinEmoji', 'assets/ui/coin.png');
  useIconArt('invIcon', 'invEmoji', 'assets/ui/inventory.png');
}

// ============================================================
// CHARACTER SHEET UI
// ============================================================
let charOpen = false, charTab = 'attrs';
let charOverlay, csLevel, csName, csXpFill, csXpText, csAttrs, csSkills;
let lvlNum, xpFill, xpLabel, pointDot;

const ATTR_META = {
  forca:      { icon:'⚔️', name:'Força',      desc:'+2 de dano e +4 de vida por ponto' },
  agilidade:  { icon:'🌀', name:'Agilidade',  desc:'+3% ataque e +2% movimento por ponto' },
  capacidade: { icon:'🎒', name:'Capacidade', desc:'+10 claves na bolsa por ponto' },
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
  sum.innerHTML =
    `<div class="attr-desc" style="line-height:1.7">` +
    `❤️ Vida máxima <b style="color:#f2f5f9">${s.maxHp}</b> &nbsp;·&nbsp; ` +
    `⚔️ Dano <b style="color:#f2f5f9">${s.dmg}</b> &nbsp;·&nbsp; ` +
    `⚡ Ataque <b style="color:#f2f5f9">+${s.atkSpeed}%</b> &nbsp;·&nbsp; ` +
    `👟 Movimento <b style="color:#f2f5f9">+${s.moveSpeed}%</b><br>` +
    `🎒 Bolsa <b style="color:#f2f5f9">${claveCount}/${s.capacity}</b>` +
    (s.crit ? ` &nbsp;·&nbsp; 💥 Crítico <b style="color:#f2f5f9">${s.crit}%</b>` : '') +
    (s.lifesteal ? ` &nbsp;·&nbsp; 💚 Roubo de vida <b style="color:#f2f5f9">${s.lifesteal}%</b>` : '') +
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
  document.getElementById('charBtn')?.addEventListener('click', openChar);
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
  document.getElementById('invBtn')?.addEventListener('click', openInventory);
  storeOverlay?.addEventListener('click', e => { if (e.target === storeOverlay) closeStore(); });
}

// ============================================================
// MOBILE PLAY MODE — game only, no editor
// ============================================================
let touchAction=null, touchControls=null;

// A phone gets the game; `?play` forces it anywhere (handy for testing on desktop),
// `?edit` forces the editor back on a tablet.
function wantsMobilePlay() {
  const q=new URLSearchParams(location.search);
  if(q.has('edit'))return false;
  if(q.has('play'))return true;
  return matchMedia('(pointer: coarse)').matches && Math.min(screen.width,screen.height) < 820;
}

function bindTouchControls() {
  const zone=document.getElementById('stickZone');
  const base=document.getElementById('stickBase');
  const knob=document.getElementById('stickKnob');
  touchAction=document.getElementById('touchAction');
  touchControls=document.getElementById('touchControls');
  if(!zone||!base||!knob)return;

  let pid=null, ox=0, oy=0, R=52;

  const place=(cx,cy)=>{
    // Floating stick: the base jumps to wherever the thumb lands, so the player never
    // has to look down to find it.
    const zr=zone.getBoundingClientRect(), br=base.offsetWidth/2;
    base.style.left=(cx-zr.left-br)+'px';
    base.style.top=(cy-zr.top-br)+'px';
    base.style.bottom='auto';
    R=br;
    const bc=base.getBoundingClientRect();
    ox=bc.left+bc.width/2; oy=bc.top+bc.height/2;
  };
  const apply=(cx,cy)=>{
    let dx=cx-ox, dy=cy-oy;
    const d=Math.hypot(dx,dy), k=d>R?R/d:1;
    knob.style.transform=`translate(${dx*k}px, ${dy*k}px)`;
    stick.x=Math.max(-1,Math.min(1,dx/R));
    stick.y=Math.max(-1,Math.min(1,dy/R));
    stick.active=true;
  };
  const release=()=>{
    pid=null; stick.active=false; stick.x=stick.y=0;
    knob.style.transform='';
    base.style.left=''; base.style.top=''; base.style.bottom='';
    zone.classList.remove('active');
  };

  zone.addEventListener('pointerdown', e=>{
    e.preventDefault(); initAudio();
    pid=e.pointerId; zone.setPointerCapture(pid);
    zone.classList.add('active');
    place(e.clientX,e.clientY); apply(e.clientX,e.clientY);
  });
  zone.addEventListener('pointermove', e=>{ if(e.pointerId!==pid)return; e.preventDefault(); apply(e.clientX,e.clientY); });
  zone.addEventListener('pointerup', e=>{ if(e.pointerId===pid)release(); });
  zone.addEventListener('pointercancel', e=>{ if(e.pointerId===pid)release(); });

  touchAction?.addEventListener('pointerdown', e=>{ e.preventDefault(); initAudio(); doAction(); });
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

function enterMobilePlay() {
  document.body.classList.add('mobile-play');
  document.getElementById('touchControls')?.classList.remove('hidden');
  if(!isPlayMode)togglePlay();
}

function bindCanvasEvents(){
  const track=m=>{mouseCanvasX=m.x;mouseCanvasY=m.y;return m;};
  canvas.addEventListener('mousedown', e=>{initAudio();onPointerDown(track(getM(e)));});
  canvas.addEventListener('mousemove', e=>onPointerMove(track(getM(e))));
  canvas.addEventListener('mouseleave', ()=>{hoveredNPC=null;canvas.className='';});
  window.addEventListener('mouseup', onPointerUp);

  // Touch: the game ships for phones in landscape, so every canvas interaction —
  // dialogue choices, collision painting, dragging NPCs — has to work by finger.
  // preventDefault stops the browser turning a drag into a scroll or a page zoom.
  canvas.addEventListener('touchstart', e=>{e.preventDefault();initAudio();onPointerDown(track(getM(e)));},{passive:false});
  canvas.addEventListener('touchmove', e=>{e.preventDefault();onPointerMove(track(getM(e)));},{passive:false});
  window.addEventListener('touchend', onPointerUp);
  window.addEventListener('touchcancel', onPointerUp);
}

// ============================================================
// NPC EDITOR HELPERS
// ============================================================
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
function setMode(mode){
  engineMode=mode;
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  // Show/hide tool groups
  document.getElementById('sceneToolsGroup')?.style.setProperty('display',mode==='scene'?'':'none');
  document.getElementById('collisionToolsGroup')?.style.setProperty('display',mode==='collision'?'':'none');
  document.getElementById('worldMapToolsGroup')?.style.setProperty('display',mode==='worldmap'?'':'none');
  // Always ensure Ferramentas tab is visible and active when mode changes
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
    const sp=safeSpawn(currentKey);player.x=sp.x;player.y=sp.y;spawnFlashUntil=performance.now()+1600;
    // Fresh run: full health, monsters back on their posts, loot cleared.
    playerHp=playerMaxHp(); deadUntil=0; dropItems=[]; floaters.length=0;
    monsters.forEach(m=>{m.dead=false;m.hp=m.maxHp;m.x=m.homeX;m.y=m.homeY;m.respawnAt=0;});
    showToast('▶ Jogo iniciado! WASD para mover.');
  } else {
    playBtn?.classList.remove('hidden'); stopBtn?.classList.add('hidden');
    wasdPanel?.classList.add('hidden');
    playerHud?.classList.add('hidden'); closeStore();
    playerLocked=false; dlg.state=DLG_STATE.CLOSED; hideNameInput();
    keys.w=keys.a=keys.s=keys.d=false;
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
  Object.keys(bgSources).forEach(k=>{
    const p=gridPos[k];
    const o=document.createElement('option');
    o.value=k;
    o.textContent=`${SCENE_NAMES[k]||k}${p?` (${p.col},${p.row})`:' (fora do grid)'}`;
    activeMapSelect.appendChild(o);
  });
  activeMapSelect.value=bgSources[keep]?keep:Object.keys(bgSources)[0];
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
  const name=SCENE_NAMES[currentKey]||currentKey;
  if(statusMap)statusMap.textContent=`🗺️ ${name}`;
}
let toastTimer=null;
function showToast(msg){if(!toastEl)return;toastEl.textContent=msg;toastEl.classList.remove('hidden');if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.add('hidden'),2500);}

// ============================================================
// MAIN LOOP
// ============================================================
function loop(now){
  requestAnimationFrame(loop);
  frameCount++;
  if(now-lastFPSTime>=1000){currentFPS=frameCount;frameCount=0;lastFPSTime=now;if(fpsDisplay)fpsDisplay.textContent=`${currentFPS} FPS`;if(statusFPS)statusFPS.textContent=`${currentFPS} FPS`;}

  if(engineMode==='worldmap'){renderWorldMap(now);return;}

  const mapKey=isPlayMode?currentKey:(activeMapSelect?.value||currentKey);
  const isMegaWorld = mapKey === 'mega_world';

  const dpr = canvas.width / SCREEN_W;
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,SCREEN_W,SCREEN_H);ctx.imageSmoothingEnabled=false;

  if (isMegaWorld) {
    if (!bgImages['mega_world']) {
      const img = new Image();
      img.src = 'assets/mega_map_1.jpg';
      bgImages['mega_world'] = img;
    }
    const dims = getMegaWorldDimensions();
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
    if(currentScene==='world'||!isPlayMode){const bg=bgImages[mapKey];if(bg?.complete)ctx.drawImage(bg,0,0,SCREEN_W,SCREEN_H);}
    else { const st=interiorDef()?.still?.(); if(st)ctx.drawImage(st,0,0,SCREEN_W,SCREEN_H); }
  }

  if(isPlayMode){
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
      checkDoors();checkNPCProx();
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
    if(touchControls&&document.body.classList.contains('mobile-play')){
      touchControls.classList.toggle('hidden', talking);
      if(talking&&stick.active){stick.active=false;stick.x=stick.y=0;}
    }
    const ACT_LABEL={attack:'Atacar',shop:'Loja',forge:'Forjar',enter:'Entrar',enterForge:'Entrar',talk:'Falar',travel:'Viajar',gather:'Coletar'};
    if(touchAction&&act)touchAction.textContent=ACT_LABEL[act];
    touchAction?.classList.toggle('disabled', !act);
    playerHud?.classList.toggle('hidden', talking||shopOpen||inventoryOpen||charOpen);
    if(coinCount)coinCount.textContent=playerCoins;
    if(claveCountEl)claveCountEl.textContent=`${claveCount}/${claveCapacity()}`;
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
    pointDot?.classList.toggle('hidden', attrPoints<=0&&skillPoints<=0);
    // Interiors are their own space: the outdoor map's NPCs, chatter and overlays must
    // not bleed through onto the shop floor.
    const outdoors=currentScene==='world';
    if(outdoors){
      npcData.forEach(npc=>{if(npc.mapKey!==currentKey)return;(NPC_DRAW[npc.type]||DEFAULT_NPC_DRAW)(ctx,npc,now);});
      renderDrops(now);   // on the ground, under everyone
      renderMonsters(now);
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
    renderPlayer();
    {const pW=outdoors?player.width:68,pH=outdoors?player.height:92;
     renderHat(pW,pH);renderAura(now,pH);}
    if(outdoors){
      renderAttackSwing(now);
      renderGatherSwing(now);
      ctx.drawImage(L.fgCanvas,0,0);renderDoorMarkers(now);updateLeaves();renderLeaves();
      updatePath();renderPath(now);
      updateAmbient(now);renderSpeech(now);renderFloaters(now);
      // Prompt over whatever the action button is currently pointing at — not just
      // NPCs. A door you can't see is a door that doesn't exist.
      const ACT_PROMPT={talk:'E  ·  Falar',travel:'E  ·  Viajar',gather:'E  ·  Coletar',enterForge:'E  ·  Entrar'};
      const act=actionAvailable();
      const tgt = act==='talk' ? talkTarget()
                : act==='travel' ? signpostTarget()
                : act==='gather' ? spotTarget()
                : act==='enterForge' ? forgeDoorTarget() : null;
      if(tgt&&!speech.some(s=>s.npc===tgt)){
        const b=npcBounds(tgt);
        drawBubble(ctx,tgt.x,b.y-3,ACT_PROMPT[act],{bg:'rgba(251,191,36,0.92)',border:'#78350f',fg:'#1c1917',font:'bold 11px Outfit, sans-serif'});
      }

      // Interactable world elements get a soft beacon so they're findable from a distance.
      npcData.forEach(n=>{
        if(n.mapKey!==currentKey)return;
        if(!['forge_entrance','signpost','spot_wood','spot_stone'].includes(n.type))return;
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
    renderDlg(now);
    if(statusPos)statusPos.textContent=`X: ${Math.round(player.x)}  Y: ${Math.round(player.y)}`;
  } else {
    npcData.forEach(npc=>{if(npc.mapKey!==mapKey)return;(NPC_DRAW[npc.type]||DEFAULT_NPC_DRAW)(ctx,npc,now);});
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
  const dpr = Math.max(2, window.devicePixelRatio || 2);
  const targetW = Math.round(SCREEN_W * dpr);
  const targetH = Math.round(SCREEN_H * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  canvas=document.getElementById('gameCanvas');
  ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  setupHighDPICanvas();
  window.addEventListener('resize', setupHighDPICanvas);
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

  playBtn?.addEventListener('click',()=>{initAudio();togglePlay();});
  stopBtn?.addEventListener('click',()=>togglePlay());
  saveProjectBtn?.addEventListener('click',()=>{saveAllLayers(false);saveNPCs();showToast('💾 Projeto salvo!');});
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
  bindTouchControls();
  bindStoreUI();
  bindCharUI();
  initDialogueEditor();
  initGalleryDragAndDrop();
  initRealtimeInspectorControls();
  initOrnateInventory();
  initForgeUI();
  loadToolSheets();
  loadSpotSheets();
  initHotbar();
  initScenarioUploader();
  initMegaWorldControls();
  blockIOSGestures();
  if(wantsMobilePlay())enterMobilePlay();
  setTimeout(()=>loadingOverlay?.classList.add('hidden'),600);
  requestAnimationFrame(loop);
});

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

  // Mouse Wheel Zoom directly on canvas!
  if (canvas) {
    canvas.addEventListener('wheel', (e) => {
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
      megaPillBtn?.classList.add('hidden');
      const dims = getMegaWorldDimensions();
      player.x = dims.w / 2;
      player.y = dims.h / 2;
      if (!isPlayMode) togglePlay();
      showToast('🗺️ Mega Cenário 2K (Modo Zoom & Câmera) Ativado!');
    });
  }
}

async function finishInit(){
  await loadWorldConfig();await loadLayers();await loadNPCs();await loadQuests();await loadShopCatalog();await loadMonsters();await loadSkillTree();
  refreshMapSelect();               // grid positions are known only after the config loads
  loadingOverlay?.classList.add('hidden');updateMapStatus();
  showToast('🎵 Acordelot Engine carregado!');
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

  // Window Tab Switching (Bolsa de Coleta vs Perfil & Equipamentos)
  document.querySelectorAll('.win-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.win-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.wintab;
      document.getElementById('winTabBag')?.classList.toggle('hidden', target !== 'bag');
      document.getElementById('winTabProfile')?.classList.toggle('hidden', target !== 'profile');
      if (target === 'profile') renderCharPreview();
    });
  });

  const openInv = () => {
    updateInventorySlotsUI();
    invOverlay?.classList.remove('hidden');
    document.querySelector('[data-wintab="bag"]')?.click();
  };

  const openCharProfile = () => {
    updateAttributeStatsUI();
    invOverlay?.classList.remove('hidden');
    document.querySelector('[data-wintab="profile"]')?.click();
    renderCharPreview();
  };

  const closeInv = () => {
    invOverlay?.classList.add('hidden');
  };

  invBtn?.addEventListener('click', openInv);
  charBtn?.addEventListener('click', openCharProfile);
  invCloseBtn?.addEventListener('click', closeInv);
  invCloseFooterBtn?.addEventListener('click', closeInv);

  invSortBtn?.addEventListener('click', () => {
    showToast('⇅ Inventário organizado!');
    updateInventorySlotsUI();
  });

  invTrashBtn?.addEventListener('click', () => {
    showToast('🗑️ Selecione um item para descartar.');
  });

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

function updateInventorySlotsUI(category = 'all') {
  const container = document.getElementById('invGridSlots');
  if (!container) return;
  container.innerHTML = '';

  const items = [
    { name: 'Madeira Rústica', icon: '🪵', count: playerInventory.wood || 0, cat: 'gear' },
    { name: 'Minério de Pedra', icon: '🪨', count: playerInventory.stone || 0, cat: 'gear' },
    { name: 'Moedas de Ouro', icon: '🪙', count: playerCoins || 0, cat: 'all' },
    { name: 'Clave Dourada', icon: '🎼', count: claveCount || 0, cat: 'quest' },
    { name: 'Poção de Cura', icon: '🧪', count: playerInventory.potions || 0, cat: 'consumables' },
    { name: 'Picareta de Forja', icon: '⛏️', count: playerInventory.pickaxe || 0, cat: 'gear' }
  ];

  const filtered = items.filter(it => it.count > 0 && (category === 'all' || it.cat === category || it.cat === 'all'));

  for (let i = 0; i < 25; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot-card';
    const item = filtered[i];
    if (item && item.count > 0) {
      slot.classList.add('has-item');
      slot.title = `${item.name} (${item.count})`;
      slot.innerHTML = `
        <span class="inv-slot-icon">${item.icon}</span>
        <span class="inv-slot-count">${item.count}</span>
      `;
      slot.addEventListener('click', () => {
        showToast(`✨ ${item.name} (${item.count}x)`);
      });
    } else {
      slot.classList.add('empty-slot');
    }
    container.appendChild(slot);
  }
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

    rebuildGrid();
    refreshMapSelect();
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
  pickaxes: { src: 'assets/ref_pickaxes.jpg', boxes: [
    [30,35,175,970], [230,35,170,970], [430,35,164,970], [600,35,200,970], [800,35,215,970],
  ]},
};
const toolSprites = {};   // `${category}_${tier}` -> prepared sprite

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

let activeForgeTab = 'axes';

function initForgeUI() {
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
}

function openForgeMenu() {
  const overlay = document.getElementById('forgeOverlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  renderForgeItemsList();
}

// ── Forging ceremony ──────────────────────────────────────
// Instant crafting felt like nothing happened. The bar takes a few seconds, the hammer
// lands on a beat, and only when it finishes are the resources spent and the tool given.
let forging = null;

function startForging(tool) {
  if (forging) return;
  const overlay = document.getElementById('forgeAnvilOverlay');
  if (!overlay) { completeForging(tool); return; }

  const dur = 2600;
  forging = { tool, start: performance.now(), dur };

  overlay.classList.remove('hidden', 'done');
  overlay.querySelector('.anvil-title').textContent = 'Forjando…';
  overlay.querySelector('.anvil-name').textContent = tool.name;
  const art = overlay.querySelector('.anvil-art');
  art.innerHTML = '';
  const cv = toolIconCanvas(tool.category, tool.tier, 120);
  if (cv) art.appendChild(cv); else art.textContent = tool.icon;

  const fill = overlay.querySelector('.anvil-fill');
  const sparks = overlay.querySelector('.anvil-sparks');
  fill.style.width = '0%';
  sparks.innerHTML = '';

  // Driven by a timer, not requestAnimationFrame: rAF stops in a background tab, which
  // froze the bar at 0% and left the player stuck with the panel open forever.
  let lastBeat = -1;
  forging.timer = setInterval(() => {
    if (!forging) return;
    const t = Math.min(1, (performance.now() - forging.start) / dur);
    fill.style.width = (t * 100) + '%';
    art.style.transform = `scale(${1 + Math.sin(t * Math.PI * 8) * 0.05})`;

    const beat = Math.floor(t * 6);
    if (beat !== lastBeat && t < 1) {
      lastBeat = beat;
      playForgeHit();
      for (let i = 0; i < 7; i++) {
        const s = document.createElement('i');
        s.className = 'spark';
        s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
        s.style.setProperty('--dy', (-Math.random() * 90 - 20) + 'px');
        s.style.left = '50%'; s.style.top = '58%';
        sparks.appendChild(s);
        setTimeout(() => s.remove(), 700);
      }
    }
    if (t >= 1) finishForging();
  }, 40);
}

function finishForging() {
  if (!forging) return;              // guard: the timer can fire once more mid-teardown
  clearInterval(forging.timer);
  const { tool } = forging;
  const overlay = document.getElementById('forgeAnvilOverlay');
  overlay?.classList.add('done');
  overlay.querySelector('.anvil-title').textContent = '✨ Pronto!';
  playForgeDone();
  completeForging(tool);
  forging = null;
  setTimeout(() => { overlay?.classList.add('hidden'); overlay?.classList.remove('done'); renderForgeItemsList(); }, 1100);
}

function completeForging(tool) {
  playerInventory.wood -= tool.wood;
  playerInventory.stone -= tool.stone;
  playerCoins -= tool.coins;
  claveCount -= tool.claves;
  playerInventory[tool.id] = 1;
  if (tool.category === 'axes') equipped.axe = tool.id;
  if (tool.category === 'pickaxes') equipped.pickaxe = tool.id;
  addFloater(player.x, player.y - 50, `✨ ${tool.name}`, '#fbbf24');
  showToast(`🔨 ${tool.name} forjado!`);
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

function initHotbar() {
  const hotbar = document.getElementById('gameHotbar');
  if (!hotbar) return;

  document.querySelectorAll('.hotbar-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const slotNum = slot.dataset.hotslot;
      if (slotNum === '1') {
        equipped.activeTool = 'axe';
        showToast('🪓 Machado equipado!');
      } else if (slotNum === '2') {
        equipped.activeTool = 'pickaxe';
        showToast('⛏️ Diapasão equipado!');
      } else if (slotNum === '3') {
        if ((playerInventory.potions || 0) > 0) {
          playerInventory.potions--;
          playerHp = Math.min(playerMaxHp(), playerHp + 40);
          showToast('🧪 Poção consumida! +40 HP');
        } else {
          showToast('⚠️ Sem poções no inventário!');
        }
      }
      updateHotbarUI();
    });
  });

  const modeToggle = document.getElementById('hotModeToggle');
  modeToggle?.addEventListener('click', () => {
    const isGathering = equipped.activeTool === 'pickaxe' || equipped.activeTool === 'axe';
    equipped.activeTool = isGathering ? 'weapon' : 'axe';
    showToast(`Modo alterado para ${equipped.activeTool === 'weapon' ? '⚔️ Batalha' : '⛏️ Coleta'}`);
    updateHotbarUI();
  });

  // Hotkey listener (1, 2, 3)
  window.addEventListener('keydown', (e) => {
    if (!isPlayMode || dlg.state !== DLG_STATE.CLOSED || shopOpen || inventoryOpen) return;
    if (e.key === '1') { equipped.activeTool = 'axe'; updateHotbarUI(); }
    if (e.key === '2') { equipped.activeTool = 'pickaxe'; updateHotbarUI(); }
    if (e.key === '3') {
      if ((playerInventory.potions || 0) > 0) {
        playerInventory.potions--;
        playerHp = Math.min(playerMaxHp(), playerHp + 40);
        showToast('🧪 Poção consumida! +40 HP');
        updateHotbarUI();
      }
    }
  });
}

function updateHotbarUI() {
  const hotbar = document.getElementById('gameHotbar');
  if (!hotbar) return;
  hotbar.classList.toggle('hidden', !isPlayMode);

  const axeObj = CRAFTABLE_TOOLS.find(t => t.id === (equipped.axe || 'axe_bronze'));
  const pickObj = CRAFTABLE_TOOLS.find(t => t.id === (equipped.pickaxe || 'pick_bronze'));

  const hAxeLabel = document.getElementById('hotAxeLabel');
  const hPickLabel = document.getElementById('hotPickLabel');
  const hPotionCount = document.getElementById('hotPotionCount');
  const hModeText = document.getElementById('hotModeText');
  const hModeIcon = document.getElementById('hotModeIcon');

  if (hAxeLabel && axeObj) hAxeLabel.textContent = axeObj.rarity.toUpperCase();
  if (hPickLabel && pickObj) hPickLabel.textContent = pickObj.rarity.toUpperCase();
  if (hPotionCount) hPotionCount.textContent = playerInventory.potions || 0;

  const slot1 = document.querySelector('[data-hotslot="1"]');
  const slot2 = document.querySelector('[data-hotslot="2"]');
  if (slot1) slot1.classList.toggle('active', equipped.activeTool === 'axe');
  if (slot2) slot2.classList.toggle('active', equipped.activeTool === 'pickaxe');

  if (hModeText && hModeIcon) {
    if (equipped.activeTool === 'weapon') {
      hModeText.textContent = 'Batalha';
      hModeIcon.textContent = '⚔️';
    } else {
      hModeText.textContent = 'Coleta';
      hModeIcon.textContent = '⛏️';
    }
  }
}
