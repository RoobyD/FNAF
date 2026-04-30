// =============================================
//   5 NIGHTS AT THE MUSEUM — game.js
// =============================================

// ── CONFIGURATION ────────────────────────────
// Edit these to add/change enemies for your project

// ── ADD YOUR CHARACTERS HERE ──────────────────
// Each object is one enemy. Fill these in once your
// teammates have made their characters.
//
// Template:
// {
//   name:       "Character Name",
//   art:        "img/your-character.gif",  // path to your character image
//   startCam:   1,       // which camera they start at (0–5)
//   aggression: 0.25,    // 0.0 = never moves, 1.0 = moves every tick
//   door:       "left",  // "left" or "right"
// },

const ENEMIES = [
  // your teammates' characters go here
];

// Camera room names (6 rooms, 0-indexed)
const CAM_NAMES = [
  "Records",        // 0 — top left
  "Office",         // 1 — top middle
  "Outside Office", // 2 — top right
  "Upstairs",       // 3 — bottom left
  "Entrance",       // 4 — bottom middle
  "Reading Room",   // 5 — bottom right
];

// ── CAMERA BACKGROUNDS ────────────────────────
// Set a background image/gif for each camera room.
// Use "" (empty string) to show solid chroma-key green instead.
// Paths are relative to index.html — put your files in an img/ folder.
//
// Examples:
//   "img/main-hall.jpg"     — static photo
//   "img/egypt-loop.gif"    — animated GIF your teammate made
//   "img/dino-hall.webp"    — webp image
//   ""                      — pure green screen (default)
//
const CAM_BACKGROUNDS = [
  "",   // CAM 0 — Records
  "",   // CAM 1 — Office
  "",   // CAM 2 — Outside Office
  "",   // CAM 3 — Upstairs
  "",   // CAM 4 — Entrance
  "",   // CAM 5 — Reading Room
];

// In-game hour labels
const HOURS = [
  "12:00 AM", "1:00 AM", "2:00 AM",
  "3:00 AM",  "4:00 AM", "5:00 AM", "6:00 AM",
];

// How long each in-game hour lasts (ms). Lower = harder.
const HOUR_DURATION_MS = 45000;

// How often the game ticks (enemy moves, power drains) in ms
const TICK_MS = 1500;

// Power drain per tick (base). Doors add extra.
const BASE_DRAIN    = 0.4;
const DOOR_DRAIN    = 0.6;  // extra drain per closed door

// How much aggression increases per hour (difficulty scaling)
const AGGRO_SCALE   = 0.08;

// Steps an enemy takes before reaching the door
const STEPS_TO_DOOR = 4;


// ── STATE ────────────────────────────────────

let state = {};
let currentCam = 0;
let gameRunning = false;
let tickInterval, hourInterval, staticInterval;


// ── INIT / RESTART ───────────────────────────

function startGame() {
  // Reset DOM screens
  show('office');

  state = {
    power:      100,
    hour:       0,
    night:      1,
    leftDoor:   false,
    rightDoor:  false,
    dead:       false,
    won:        false,
    camAlerts:  new Array(6).fill(false),

    // Clone enemies so original config is never mutated
    enemies: ENEMIES.map(e => ({
      ...e,
      cam:      e.startCam,
      progress: 0,
      atDoor:   false,
    })),
  };

  currentCam  = 0;
  gameRunning = true;

  selectCam(0);
  updateUI();
  startLoops();
}

function restartGame() {
  clearLoops();
  startGame();
}


// ── GAME LOOPS ───────────────────────────────

function startLoops() {
  clearLoops();

  tickInterval = setInterval(() => {
    if (!gameRunning) return;
    drainPower();
    moveEnemies();
    // checkJumpscare() — disabled so footage can be recorded cleanly
    updateCamAlerts();
    updateUI();
  }, TICK_MS);

  hourInterval = setInterval(() => {
    if (!gameRunning) return;
    state.hour++;
    if (state.hour >= 6) winGame();
  }, HOUR_DURATION_MS);

  staticInterval = setInterval(renderStatic, 80);
}

function clearLoops() {
  clearInterval(tickInterval);
  clearInterval(hourInterval);
  clearInterval(staticInterval);
}


// ── POWER ────────────────────────────────────

function drainPower() {
  let drain = BASE_DRAIN;
  if (state.leftDoor)  drain += DOOR_DRAIN;
  if (state.rightDoor) drain += DOOR_DRAIN;
  state.power = Math.max(0, state.power - drain);
  if (state.power <= 0) powerOut();
}

function powerOut() {
  if (state.dead) return;
  // Small delay before jumpscare when power runs out
  setTimeout(() => triggerJumpscare(state.enemies[0]), 2000);
}


// ── ENEMY AI ─────────────────────────────────

function moveEnemies() {
  state.enemies.forEach(enemy => {
    if (enemy.atDoor) return;

    const roll    = Math.random();
    const aggro   = enemy.aggression + state.hour * AGGRO_SCALE;

    if (roll < aggro) {
      enemy.progress++;

      if (enemy.progress >= STEPS_TO_DOOR) {
        // Enemy reaches the vent/door camera
        enemy.cam    = enemy.door === 'left' ? 3 : 5;
        enemy.atDoor = true;
      } else {
        // Enemy advances to next camera (simple linear path)
        enemy.cam = (enemy.cam + 1) % 6;
      }
    }
  });
}


// ── JUMPSCARE / WIN / LOSE ────────────────────

function checkJumpscare() {
  state.enemies.forEach(enemy => {
    if (!enemy.atDoor) return;
    const doorClosed = enemy.door === 'left' ? state.leftDoor : state.rightDoor;
    if (!doorClosed) triggerJumpscare(enemy);
  });
}

function triggerJumpscare(enemy) {
  if (state.dead) return;
  state.dead  = true;
  gameRunning = false;
  clearLoops();

  const js = document.getElementById('jumpscare');
  document.getElementById('js-art').textContent = enemy.art;
  js.classList.add('active');

  setTimeout(() => {
    js.classList.remove('active');
    showResult(false, enemy);
  }, 2500);
}

function winGame() {
  if (state.won) return;
  state.won   = true;
  gameRunning = false;
  clearLoops();
  showResult(true, null);
}

function showResult(won, enemy) {
  show('result-screen');
  document.getElementById('result-screen').style.background = won ? '#0d0d0d' : '#0d0000';
  document.getElementById('result-icon').textContent  = won ? '🌅' : enemy.art;
  document.getElementById('result-title').textContent = won ? '6 AM — YOU SURVIVED' : 'GAME OVER';
  document.getElementById('result-msg').textContent   = won
    ? 'You made it through the night. The exhibits have returned to their places... for now.'
    : `${enemy.name} escaped its display case and found you. Check the cameras more often.`;
}


// ── PLAYER CONTROLS ──────────────────────────

function toggleDoor(side) {
  if (!gameRunning) return;

  if (side === 'left') {
    state.leftDoor = !state.leftDoor;
    const btn = document.getElementById('left-door');
    btn.classList.toggle('closed', state.leftDoor);
    document.getElementById('left-door-status').textContent = state.leftDoor ? 'SEALED' : 'OPEN';
  } else {
    state.rightDoor = !state.rightDoor;
    const btn = document.getElementById('right-door');
    btn.classList.toggle('closed', state.rightDoor);
    document.getElementById('right-door-status').textContent = state.rightDoor ? 'SEALED' : 'OPEN';
  }
}

function selectCam(index) {
  currentCam = index;

  document.querySelectorAll('.cam-thumb').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  document.getElementById('cam-label').textContent =
    `CAM ${index + 1} — ${CAM_NAMES[index].toUpperCase()}`;

  // Update green screen background for this camera
  const gs  = document.getElementById('cam-greenscreen');
  const bg  = CAM_BACKGROUNDS[index] || '';
  gs.style.backgroundImage = bg ? `url('${bg}')` : 'none';
  // Pure green when no image is set; image covers it when one is
  gs.style.backgroundColor = '#00b140';

  updateCamView();
}


// ── UI UPDATES ───────────────────────────────

function updateUI() {
  // Power bar
  const pct = Math.round(state.power);
  document.getElementById('power-pct').textContent = `Power: ${pct}%`;
  const bar = document.getElementById('power-bar');
  bar.style.width      = pct + '%';
  bar.style.background = pct > 50 ? '#c8a96e' : pct > 25 ? '#e08030' : '#e03030';

  // Clock
  document.getElementById('time-text').textContent  = HOURS[state.hour] || '6:00 AM';
  document.getElementById('night-text').textContent = `NIGHT ${state.night}`;

  // Camera alerts
  for (let i = 0; i < 6; i++) {
    document.getElementById('ct' + i).classList.toggle('alerted', !!state.camAlerts[i]);
  }

  updateCamView();
}

function updateCamAlerts() {
  state.camAlerts = new Array(6).fill(false);
  state.enemies.forEach(e => {
    if (e.cam >= 0 && e.cam < 6) {
      state.camAlerts[e.cam] = true;
    }
  });
}

function updateCamView() {
  const enemy = state.enemies.find(e => e.cam === currentCam);
  const art   = document.getElementById('cam-entity-art');
  const name  = document.getElementById('cam-entity-name');
  const empty = document.getElementById('cam-empty');

  if (enemy) {
    art.textContent  = enemy.art;
    art.style.opacity  = '1';
    name.textContent = enemy.name.toUpperCase();
    name.style.opacity = '1';
    empty.style.display = 'none';
  } else {
    art.style.opacity  = '0';
    name.style.opacity = '0';
    empty.style.display = 'block';
  }
}


// ── STATIC / NOISE EFFECT ────────────────────

function renderStatic() {
  const canvas = document.getElementById('cam-static');
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const w    = canvas.width;
  const h    = canvas.height;
  const data = ctx.createImageData(w, h);

  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.random() > 0.97 ? 180 : 0;
    data.data[i]     = v;
    data.data[i + 1] = Math.round(v * 0.8);
    data.data[i + 2] = Math.round(v * 0.5);
    data.data[i + 3] = v > 0 ? 200 : 0;
  }

  ctx.putImageData(data, 0, 0);
}


// ── HELPERS ──────────────────────────────────

/** Show one screen, hide the rest */
function show(id) {
  const ids = ['title-screen', 'office', 'result-screen'];
  ids.forEach(sid => {
    const el = document.getElementById(sid);
    if (sid === id) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}