const element = id => document.getElementById(id);
const ui = Object.fromEntries([
  'header', 'actions', 'trip', 'hud', 'touch', 'overlay', 'startCard', 'pauseCard', 'overCard',
  'pauseTitle', 'pauseText', 'start', 'resume', 'restart', 'garagePause', 'again', 'garageOver',
  'view', 'cam', 'camLock', 'sound', 'pause', 'roadName', 'speed', 'gear', 'rpm', 'rpmBars', 'speedArc',
  'ticks', 'distance', 'best', 'toast', 'hearts', 'flash', 'steerPad', 'wheelSvg', 'pedalGas',
  'pedalBrake', 'driverForm', 'driverName', 'saveName', 'nameHint', 'driverView', 'driverInitial',
  'driverTitle', 'driverBest', 'driverRuns', 'changeName', 'swatches', 'paintName', 'zones',
  'boardToggle', 'boardPanel', 'boardList', 'boardClose', 'overDriver', 'overDistance', 'overBest',
  'overZone', 'overBadge', 'overBoard'
].map(id => [id, element(id)]));
const r35 = makeR35();
const traffic = Array.from({ length: 12 }, (_, i) => makeTraffic(i));
const held = new Set();
const touchKeys = new Map();
const steerPointers = new Map();
const driverKey = 'afterglow-r35-driver-v1';
const boardKey = 'afterglow-r35-leaderboard-v1';
const paintKey = 'afterglow-r35-paint-v1';
const zoneKey = 'afterglow-r35-zone-v1';
const maxHearts = 3;
const maxSpeed = 86.1;
const coastLabel = 'SUNSET COAST';
const valleyLabel = 'PINE VALLEY';
const viaductLabel = 'SKYLINE VIADUCT';
const routeLabels = { coast: coastLabel, valley: valleyLabel, approach: viaductLabel, bridge: viaductLabel };
const viaductLength = 640;
const contactDistance = 4.3;
const contactWidth = 1.82;
const shiftSpeeds = [0, 65, 105, 149, 198, 251, 310];
const paints = [
  { id: 'bayside', name: 'Bayside Blue', hex: '#1d61c9' },
  { id: 'pearl', name: 'Pearl White', hex: '#e6ebf2' },
  { id: 'gun', name: 'Gun Metallic', hex: '#4a5360' },
  { id: 'red', name: 'Vibrant Red', hex: '#c81e2b' },
  { id: 'purple', name: 'Midnight Purple', hex: '#4b2369' },
  { id: 'jade', name: 'Millennium Jade', hex: '#6b7d69' },
  { id: 'black', name: 'Jet Black', hex: '#141820' }
];
const zones = [
  { id: 'coast', label: coastLabel, startZ: 0 },
  { id: 'valley', label: valleyLabel, startZ: 6900 },
  { id: 'viaduct', label: viaductLabel, startZ: 9720 }
];
const cameraPresets = [
  { code: '01', name: 'CHASE', toast: 'CAM 01 · CHASE', locked: false },
  { code: '02', name: 'COCKPIT', toast: 'CAM 02 · COCKPIT', locked: false },
  { code: '03', name: 'HOOD', toast: 'CAM 03 · HOOD (LOCKED)', locked: true },
  { code: '04', name: 'BUMPER', toast: 'CAM 04 · BUMPER (LOCKED)', locked: true },
  { code: '05', name: 'HERO WIDE', toast: 'CAM 05 · HERO WIDE', locked: true }
];
const km = metres => (metres / 1000).toFixed(2);
const damp = (value, target, rate, dt) => mix(value, target, 1 - Math.exp(-rate * dt));

// Asphalt ribbon height: world.js samples the road every 8 m and lifts it by 0.008.
function roadSurfaceY(z) {
  const z0 = Math.floor(z / 8) * 8;
  return mix(grade(z0), grade(z0 + 8), (z - z0) / 8) + 0.008;
}

/* ---------- Persistence ---------- */
const memoryStore = new Map();
const store = {
  get(key) {
    try { const value = localStorage.getItem(key); if (value !== null) return value; } catch {}
    return memoryStore.get(key) ?? null;
  },
  set(key, value) {
    memoryStore.set(key, value);
    try { localStorage.setItem(key, value); } catch {}
  }
};
const sanitizeName = value => String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '')
  .replace(/\s+/g, ' ').trim().slice(0, 14);

function readBoard() {
  try {
    const data = JSON.parse(store.get(boardKey) || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter(entry => entry && typeof entry.name === 'string' && Number.isFinite(Number(entry.best)))
      .map(entry => ({
        name: sanitizeName(entry.name),
        best: Math.max(0, Number(entry.best)),
        zone: String(entry.zone || '').slice(0, 24),
        color: /^#[0-9a-f]{6}$/i.test(entry.color) ? entry.color : '#8a93a0',
        runs: Math.max(0, Math.floor(Number(entry.runs) || 0))
      })).filter(entry => entry.name);
  } catch {
    return [];
  }
}
const writeBoard = list => store.set(boardKey, JSON.stringify(list));
const sortedBoard = () => readBoard().sort((a, b) => b.best - a.best || b.runs - a.runs || a.name.localeCompare(b.name));

/* ---------- Game state ---------- */
let driverName = sanitizeName(store.get(driverKey));
let paint = paints.find(item => item.id === store.get(paintKey)) || paints[0];
let zone = zones.find(item => item.id === store.get(zoneKey)) || zones[0];
let editingName = false;
let personalBest = 0;
let runActive = false;
let runCounted = false;
let runZone = zone;
let runPaint = paint.hex;
let runStartBest = 0;
let lastSavedTrip = 0;
let state = 'ready';
let worldZ = zone.startZ;
let tripDistance = 0;
let speedMS = 0;
let lateral = 0;
let offset = 0;
let wheelsAngle = 0;
let revs = 900;
let gearIndex = 0;
let hearts = maxHearts;
let crashInvuln = 0;
let shake = 0;
let gasAmt = 0;
let brakeAmt = 0;
let throttle = false;
let braking = false;
let touchSteer = 0;
let touchSteerTarget = 0;
let lastSteerId = null;
let steerInput = 0;
let steerVis = 0;
let longAccel = 0;
let susPitch = 0;
let susPitchV = 0;
let susRoll = 0;
let susRollV = 0;
let camIndex = 0;
let cameraLocked = false;
let trafficSequence = 0;
let impactCooldown = 0;
let lastRoute = 'coast';
let lastEdgeNotice = -Infinity;
let toastUntil = 0;
let lastFrame = 0;
let lastGasPress = -1;
let lastBrakePress = -1;

const chaseLook = vector(0, 0, 0);
const chasePosition = vector(0, 0, 0);
const cockpitPosition = vector(0, 0, 0);
const localLook = vector(0, 0, 0);
const cameraPosition = vector(0, 0, 0);
const cameraLook = vector(0, 0, 0);
const shakeOffset = vector(0, 0, 0);
let orbit = 0;
let tilt = 0;
let pointer = null;
let snapCamera = true;
let framedMenu = false;

for (let i = 0; i <= 30; i++) {
  const tick = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const angle = (139 + i * 262 / 30) * Math.PI / 180;
  const radius = i % 5 === 0 ? 82 : 87;
  for (const [name, value] of Object.entries({
    x1: 120 + Math.cos(angle) * radius, y1: 107 + Math.sin(angle) * radius,
    x2: 120 + Math.cos(angle) * 92, y2: 107 + Math.sin(angle) * 92,
    stroke: i % 5 === 0 ? '#fff8' : '#fff4', 'stroke-width': i % 5 === 0 ? 1.6 : 1
  })) tick.setAttribute(name, value);
  ui.ticks.append(tick);
}
const rpmBars = Array.from({ length: 12 }, () => {
  const bar = document.createElement('i');
  ui.rpmBars.append(bar);
  return bar;
});
const heartIcons = [...ui.hearts.querySelectorAll('.heart')];
const paddleLeft = ui.steerPad.querySelector('[data-key="KeyA"]');
const paddleRight = ui.steerPad.querySelector('[data-key="KeyD"]');

/* ---------- Driver, paint, zone, leaderboard UI ---------- */
function loadPersonal() {
  const key = driverName.toLowerCase();
  const entry = driverName ? readBoard().find(item => item.name.toLowerCase() === key) : null;
  personalBest = entry ? entry.best : 0;
  return entry;
}

function refreshDriverUI() {
  const entry = loadPersonal();
  const named = Boolean(driverName) && !editingName;
  ui.driverView.hidden = !named;
  ui.driverForm.hidden = named;
  ui.saveName.hidden = false;
  if (named) {
    ui.driverTitle.textContent = driverName.toUpperCase();
    ui.driverInitial.textContent = driverName[0].toUpperCase();
    ui.driverBest.textContent = km(personalBest);
    ui.driverRuns.textContent = String(entry ? entry.runs : 0);
  }
}

function setDriver(name) {
  driverName = name;
  store.set(driverKey, name);
  editingName = false;
  ui.nameHint.hidden = true;
  refreshDriverUI();
}

function showNameHint() {
  ui.driverForm.hidden = false;
  ui.driverView.hidden = true;
  ui.nameHint.hidden = false;
  ui.driverName.focus();
}

function renderBoard(target, limit = 50) {
  const rows = sortedBoard();
  target.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement('li');
    empty.className = 'board-empty';
    empty.textContent = 'No runs yet. Finish a drive to claim the first spot.';
    target.append(empty);
    return;
  }
  const me = driverName.toLowerCase();
  const addRow = (entry, rank) => {
    const row = document.createElement('li');
    if (rank <= 3) row.classList.add('top');
    if (me && entry.name.toLowerCase() === me) row.classList.add('me');
    const place = document.createElement('span');
    place.className = 'rk';
    place.textContent = String(rank);
    const swatch = document.createElement('i');
    swatch.className = 'sw';
    swatch.style.setProperty('--c', entry.color);
    const name = document.createElement('span');
    name.className = 'nm';
    const title = document.createElement('b');
    title.textContent = entry.name;
    const detail = document.createElement('small');
    const runs = Math.max(1, entry.runs);
    detail.textContent = `${entry.zone || 'UNKNOWN ZONE'} · ${runs} ${runs === 1 ? 'RUN' : 'RUNS'}`;
    name.append(title, detail);
    const distance = document.createElement('span');
    distance.className = 'km';
    distance.textContent = km(entry.best);
    const unit = document.createElement('small');
    unit.textContent = 'KM';
    distance.append(unit);
    row.append(place, swatch, name, distance);
    target.append(row);
  };
  rows.slice(0, limit).forEach((entry, i) => addRow(entry, i + 1));
  const mine = me ? rows.findIndex(entry => entry.name.toLowerCase() === me) : -1;
  if (mine >= limit) {
    const gap = document.createElement('li');
    gap.className = 'gap';
    gap.textContent = '···';
    target.append(gap);
    addRow(rows[mine], mine + 1);
  }
}

function toggleBoard(force) {
  const show = force ?? ui.boardPanel.hidden;
  ui.boardPanel.hidden = !show;
  ui.boardToggle.setAttribute('aria-expanded', String(show));
  if (show) renderBoard(ui.boardList, 50);
}

function selectPaint(id, persist = true) {
  paint = paints.find(item => item.id === id) || paints[0];
  r35.setPaint?.(paint.hex);
  if (persist) store.set(paintKey, paint.id);
  ui.paintName.textContent = paint.name;
  for (const swatch of ui.swatches.children) swatch.setAttribute('aria-checked', String(swatch.dataset.paint === paint.id));
}

function previewZone() {
  worldZ = zone.startZ;
  tripDistance = 0;
  speedMS = offset = lateral = 0;
  seedTraffic();
  snapCamera = true;
  ui.roadName.textContent = zone.label;
}

function selectZone(id, persist = true) {
  zone = zones.find(item => item.id === id) || zones[0];
  if (persist) store.set(zoneKey, zone.id);
  for (const button of ui.zones.children) button.setAttribute('aria-checked', String(button.dataset.zone === zone.id));
  if (state === 'ready') previewZone();
}

for (const item of paints) {
  const swatch = document.createElement('button');
  swatch.type = 'button';
  swatch.className = 'swatch';
  swatch.dataset.paint = item.id;
  swatch.setAttribute('role', 'radio');
  swatch.setAttribute('aria-label', item.name);
  swatch.title = item.name;
  swatch.style.setProperty('--c', item.hex);
  ui.swatches.append(swatch);
}

/* ---------- Score saving ---------- */
function saveScore(final = false) {
  if (!driverName || !runActive || tripDistance < 5) return;
  lastSavedTrip = tripDistance;
  const board = readBoard();
  const key = driverName.toLowerCase();
  let entry = board.find(item => item.name.toLowerCase() === key);
  if (!entry) {
    entry = { name: driverName, best: 0, zone: '', color: runPaint, runs: 0 };
    board.push(entry);
  }
  entry.name = driverName;
  const metres = Math.round(tripDistance);
  if (metres > entry.best) {
    entry.best = metres;
    entry.zone = runZone.label;
    entry.color = runPaint;
  }
  if (final && !runCounted) {
    entry.runs += 1;
    runCounted = true;
  }
  writeBoard(board);
  personalBest = entry.best;
}

function notice(text, seconds = 1.8) {
  ui.toast.textContent = text;
  ui.toast.hidden = false;
  toastUntil = performance.now() + seconds * 1000;
}

function renderHearts(lostIndex = -1) {
  heartIcons.forEach((icon, i) => {
    icon.classList.toggle('lost', i >= hearts);
    if (i === lostIndex) {
      icon.classList.remove('pop');
      void icon.getBoundingClientRect();
      icon.classList.add('pop');
    }
  });
  ui.hearts.setAttribute('aria-label', `${hearts} of ${maxHearts} hearts remaining`);
}

function flashScreen() {
  ui.flash.classList.remove('on');
  void ui.flash.offsetWidth;
  ui.flash.classList.add('on');
}

function setPaddles(value) {
  touchSteerTarget = value;
  paddleLeft.classList.toggle('held', value < -.12);
  paddleRight.classList.toggle('held', value > .12);
}

function clearInput() {
  held.clear();
  for (const { button, id } of touchKeys.values()) {
    try { if (button.hasPointerCapture(id)) button.releasePointerCapture(id); } catch {}
    button.classList.remove('held');
  }
  touchKeys.clear();
  for (const id of steerPointers.keys()) {
    try { if (ui.steerPad.hasPointerCapture(id)) ui.steerPad.releasePointerCapture(id); } catch {}
  }
  steerPointers.clear();
  lastSteerId = null;
  setPaddles(0);
  if (pointer && renderer.domElement.hasPointerCapture(pointer.id)) {
    renderer.domElement.releasePointerCapture(pointer.id);
  }
  pointer = null;
  throttle = false;
  braking = false;
}

/* ---------- Traffic ---------- */
function placeTrafficGroup(freeCars, z) {
  const index = trafficSequence++;
  const firstLane = Math.floor(rand(index * 3.17 + 6) * laneCenters.length);
  const nextLane = (firstLane + 1 + Math.floor(rand(index * 2.43 + 19) * 2)) % laneCenters.length;
  const groupSpeed = mix(22, 32, rand(index * 2.71 + 71));
  const stagger = mix(10, 23, rand(index * 3.65 + 5));
  const count = Math.min(freeCars.length, rand(index * 4.31 + 31) < .60 ? 2 : 1);

  for (let i = 0; i < count; i++) {
    const car = freeCars.shift();
    car.z = z + i * stagger;
    car.lane = laneCenters[i === 0 ? firstLane : nextLane];
    car.cruise = groupSpeed + i * mix(-.6, .6, rand(index * 2.21 + 9));
    car.speed = car.cruise;
    car.touching = false;
    if (car.brakeLight) car.brakeLight.emissiveIntensity = 1.24;
  }
}

function seedTraffic() {
  trafficSequence = 0;
  for (const car of traffic) car.z = Infinity;
  const freeCars = [...traffic];
  let start = 152;
  while (freeCars.length && start <= 1300) {
    placeTrafficGroup(freeCars, worldZ + start);
    start += mix(146, 191, rand(trafficSequence * 4.17 + 23));
  }
}

function refillTraffic() {
  const freeCars = traffic.filter(car => car.z === Infinity);
  if (!freeCars.length) return;
  const positions = traffic.filter(car => Number.isFinite(car.z)).map(car => car.z);
  const ceiling = worldZ + 1320;
  const minimumSpacing = mix(143, 117, smooth(0, 18000, tripDistance));
  while (freeCars.length) {
    const spacing = minimumSpacing + 30 * rand(trafficSequence * 4.17);
    let z;
    if (speedMS >= 18) {
      const tail = Math.max(worldZ + 170, ...positions) + spacing;
      if (tail <= ceiling) z = tail;
    }
    if (z === undefined) {
      for (let candidate = worldZ + 345; candidate <= ceiling; candidate += 18) {
        if (positions.some(other => other > candidate - spacing && other < candidate + spacing + 23)) continue;
        z = candidate;
        break;
      }
    }
    if (z === undefined) break;
    const spawned = freeCars.slice(0, 2);
    placeTrafficGroup(freeCars, z);
    positions.push(...spawned.filter(car => Number.isFinite(car.z)).map(car => car.z));
  }
}

function moveTraffic(dt, previousZ, previousOffset) {
  const activeCars = traffic.filter(car => Number.isFinite(car.z)).sort((a, b) => b.z - a.z);
  const leaders = new Map();

  for (const car of activeCars) {
    car.previousZ = car.z;
    const behindPlayer = previousZ > car.z;
    const playerBlocksLane = Math.abs(car.lane - previousOffset) < contactWidth ||
      Math.abs(car.lane - offset) < contactWidth;
    let leader = leaders.get(car.lane);
    if (behindPlayer && playerBlocksLane && (!leader || previousZ < leader.previousZ)) {
      leader = { previousZ, z: worldZ, speed: speedMS };
    }

    let targetSpeed = car.cruise ?? car.speed;
    if (leader) {
      const gap = leader.previousZ - car.z;
      const closing = Math.max(0, car.speed - leader.speed);
      const safeGap = 7 + car.speed * 1.05 + closing * .55 + closing ** 2 / 19;
      targetSpeed = Math.min(targetSpeed, Math.max(0, leader.speed + (gap - safeGap) / 1.15));
    }

    const previousSpeed = car.speed;
    const acceleration = clamp((targetSpeed - previousSpeed) * 2, -13, 2.55);
    car.speed = Math.max(0, car.speed + acceleration * dt);
    let nextZ = car.z + car.speed * dt;
    if (leader) {
      // If a lane change leaves less than the minimum gap, brake without moving backward.
      const clearZ = Math.max(car.z, leader.z - 6);
      if (nextZ > clearZ) {
        nextZ = clearZ;
        car.speed = (nextZ - car.z) / dt;
      }
    }
    car.z = nextZ;
    if (car.brakeLight && dt > 0) {
      const deceleration = (previousSpeed - car.speed) / dt;
      const pressure = leader && targetSpeed < .7 ? 1 : smooth(.85, 5, deceleration);
      car.brakeLight.emissiveIntensity = damp(car.brakeLight.emissiveIntensity, mix(1.24, 3.36, pressure), 15, dt);
    }
    leaders.set(car.lane, car);
  }
  return activeCars;
}

function contactWindow(from, to, radius) {
  const motion = to - from;
  if (!motion) return Math.abs(from) < radius ? [0, 1] : [1, 0];
  const a = (-radius - from) / motion;
  const b = (radius - from) / motion;
  return [Math.max(0, Math.min(a, b)), Math.min(1, Math.max(a, b))];
}

function heavyImpact(car) {
  speedMS = Math.max(8, Math.min(speedMS * .45, car.speed * .85));
  lateral *= .3;
  car.z = worldZ + 28;
  car.touching = false;
  if (crashInvuln > 0) {
    crashSound(.16);
    return;
  }
  hearts = Math.max(0, hearts - 1);
  crashSound(.32);
  shake = 1;
  flashScreen();
  crashInvuln = 2;
  impactCooldown = .9;
  renderHearts(hearts);
  if (hearts > 0) notice(`HEAVY IMPACT · ${hearts} ${hearts === 1 ? 'HEART' : 'HEARTS'} LEFT`, 2.4);
  else endRun();
}

function resolveTrafficContact(car, previousZ, previousOffset) {
  const previousGap = car.previousZ - previousZ;
  const gap = car.z - worldZ;
  const previousSide = previousOffset - car.lane;
  const side = offset - car.lane;
  const touching = Math.abs(gap) < contactDistance && Math.abs(side) < contactWidth;
  const wasTouching = car.touching;
  car.touching = touching;
  if (wasTouching) return;

  const [frontIn, frontOut] = contactWindow(previousGap, gap, contactDistance);
  const [sideIn, sideOut] = contactWindow(previousSide, side, contactWidth);
  const impact = Math.max(frontIn, sideIn);
  if (impact >= Math.min(frontOut, sideOut)) return;

  const overlap = mix(previousSide, side, impact);
  const rearEnd = frontIn >= sideIn && previousGap > 0 && Math.abs(overlap) < 1.28;
  const closingSpeed = speedMS - car.speed;
  if (rearEnd && closingSpeed >= 14) {
    heavyImpact(car);
    return;
  }
  if (impactCooldown > 0) return;
  impactCooldown = .9;

  if (rearEnd) {
    speedMS = Math.max(0, Math.min(speedMS - 2, car.speed - 1.6));
  } else {
    speedMS = Math.max(0, speedMS - clamp(Math.abs(closingSpeed) * .2 + speedMS * .08, 2, 11));
    lateral *= .25;
    offset = clamp(offset + (Math.sign(overlap) || Math.sign(side) || 1) * .16,
      -roadWidth + .83, roadWidth - .83);
  }
  notice('GRAZED TRAFFIC');
  crashSound(.13);
}

/* ---------- Game flow ---------- */
function menu(next) {
  clearInput();
  state = next;
  ui.overlay.hidden = next === 'playing';
  ui.startCard.hidden = next !== 'ready';
  ui.pauseCard.hidden = next !== 'paused';
  ui.overCard.hidden = next !== 'crashed';
  ui.actions.hidden = ui.trip.hidden = ui.hud.hidden = next === 'ready';
  ui.touch.hidden = next !== 'playing';
  if (next !== 'ready') toggleBoard(false);
  if (next === 'paused') ui.resume.focus({ preventScroll: true });
  if (next === 'crashed') ui.again.focus({ preventScroll: true });
  if (next === 'ready') ui.start.focus({ preventScroll: true });
  if (next === 'playing') {
    lastFrame = 0;
    renderer.domElement.focus({ preventScroll: true });
  }
}

function resetDynamics() {
  speedMS = offset = lateral = wheelsAngle = 0;
  gearIndex = 0;
  revs = 900;
  orbit = tilt = 0;
  gasAmt = brakeAmt = 0;
  touchSteer = touchSteerTarget = steerInput = steerVis = 0;
  longAccel = susPitch = susPitchV = susRoll = susRollV = 0;
  crashInvuln = shake = impactCooldown = 0;
  hearts = maxHearts;
  lastEdgeNotice = -Infinity;
  renderHearts();
}

function restartDrive() {
  if (!driverName) {
    showNameHint();
    return;
  }
  wakeAudio();
  saveScore(true);
  resetDynamics();
  worldZ = zone.startZ;
  tripDistance = 0;
  loadPersonal();
  runZone = zone;
  runPaint = paint.hex;
  runStartBest = personalBest;
  runActive = true;
  runCounted = false;
  lastSavedTrip = 0;
  ui.toast.hidden = true;
  lastRoute = routeAt(worldZ);
  ui.roadName.textContent = zone.label;
  seedTraffic();
  snapCamera = true;
  menu('playing');
  notice(`DRIVE START · ${zone.label}`, 2.2);
}

function attemptStart() {
  if (!driverName || editingName) {
    const name = sanitizeName(ui.driverName.value);
    if (!name) {
      showNameHint();
      return;
    }
    setDriver(name);
  }
  restartDrive();
}

function pauseDrive() {
  if (state === 'playing') {
    saveScore(false);
    ui.pauseTitle.textContent = 'PAUSED';
    ui.pauseText.textContent = `${driverName.toUpperCase()} · DISTANCE ${km(tripDistance)} KM · BEST ${km(Math.max(personalBest, tripDistance))} KM`;
    menu('paused');
  } else if (state === 'paused') {
    wakeAudio();
    menu('playing');
  }
}

function endRun() {
  speedMS = lateral = 0;
  gearIndex = 0;
  revs = 900;
  saveScore(true);
  runActive = false;
  ui.overDriver.textContent = `DRIVER · ${driverName.toUpperCase()}`;
  ui.overDistance.textContent = km(tripDistance);
  ui.overBest.textContent = km(Math.max(personalBest, tripDistance));
  ui.overZone.textContent = runZone.label;
  ui.overBadge.hidden = !(tripDistance >= 5 && Math.round(tripDistance) > runStartBest);
  renderBoard(ui.overBoard, 5);
  menu('crashed');
}

function goGarage() {
  saveScore(true);
  runActive = false;
  resetDynamics();
  previewZone();
  editingName = false;
  refreshDriverUI();
  menu('ready');
}

function refreshCameraUI() {
  const preset = cameraPresets[camIndex] || cameraPresets[0];
  ui.cam.textContent = preset.code;
  ui.view.setAttribute('aria-pressed', String(camIndex > 0));
  if (ui.camLock) {
    ui.camLock.textContent = cameraLocked ? 'LOCKED' : 'FREE';
    ui.camLock.setAttribute('aria-pressed', String(cameraLocked));
  }
}

function toggleCamera() {
  if (state === 'ready') return;
  camIndex = (camIndex + 1) % cameraPresets.length;
  const preset = cameraPresets[camIndex];
  cameraLocked = preset.locked;
  orbit = tilt = 0;
  snapCamera = true;
  refreshCameraUI();
  notice(preset.toast);
}

function toggleCameraLock() {
  if (state === 'ready') return;
  cameraLocked = !cameraLocked;
  refreshCameraUI();
  notice(cameraLocked ? 'CAMERA ANGLE LOCKED' : 'CAMERA FREE');
}

function routeAt(z) {
  const bridgeStart = bridgeStartAt(z + 260);
  if (bridgeStart > 0 && z < bridgeStart) return 'approach';
  if (bridgeStart > 0 && z >= bridgeStart && z < bridgeStart + viaductLength) return 'bridge';
  return z >= 6900 ? 'valley' : 'coast';
}

function pedal(value, key, touch, up, down, dt) {
  if (key) return 1;
  const target = touch ? 1 : 0;
  return Math.abs(target - value) < .004 ? target : damp(value, target, touch ? up : down, dt);
}

function updateDriving(dt, now) {
  impactCooldown = Math.max(0, impactCooldown - dt);
  crashInvuln = Math.max(0, crashInvuln - dt);
  const key = code => held.has(code);
  const touching = code => { for (const touch of touchKeys.values()) if (touch.key === code) return true; return false; };
  gasAmt = pedal(gasAmt, key('KeyW') || key('ArrowUp'), touching('KeyW'), 7, 14, dt);
  brakeAmt = pedal(brakeAmt, key('KeyS') || key('ArrowDown') || key('Space'), touching('KeyS'), 9, 18, dt);
  throttle = gasAmt > .08;
  braking = brakeAmt > .08;
  const keySteer = Number(key('KeyD') || key('ArrowRight')) - Number(key('KeyA') || key('ArrowLeft'));
  touchSteer = damp(touchSteer, touchSteerTarget, 15, dt);
  if (Math.abs(touchSteer) < .003 && !touchSteerTarget) touchSteer = 0;
  steerInput = keySteer || touchSteer;
  const steer = -steerInput; // lateral +x is the driver's left

  const speedBefore = speedMS;
  const acceleration = 9.9 * gasAmt * (1 - Math.pow(speedMS / maxSpeed, 1.63));
  const drag = mix(1.04 + speedMS * .025, .11, gasAmt);
  speedMS = clamp(speedMS + (acceleration - drag - 15.8 * brakeAmt) * dt, 0, maxSpeed);
  longAccel = damp(longAccel, (speedMS - speedBefore) / dt, 9, dt);

  const previousOffset = offset;
  const highSpeed = smooth(24, 82, speedMS);
  const steeringSpeed = mix(3.1, 5.7, smooth(0, 24, speedMS)) * mix(1, .54, highSpeed);
  lateral = damp(lateral, steer * steeringSpeed * smooth(0, 8, speedMS),
    Math.abs(steer) > .02 ? mix(9, 5.8, highSpeed) : 11, dt);
  offset += lateral * dt;
  if (Math.abs(offset) > roadWidth - .83) {
    offset = Math.sign(offset) * (roadWidth - .83);
    if (Math.sign(lateral) === Math.sign(offset)) {
      lateral = 0;
      speedMS = Math.max(0, speedMS - 20 * dt);
      if (speedMS > 9 && now - lastEdgeNotice > 1800) {
        notice('ROAD EDGE');
        lastEdgeNotice = now;
      }
    }
  }

  const previousZ = worldZ;
  const travelled = speedMS * dt;
  worldZ += travelled;
  tripDistance += travelled;
  if (tripDistance - lastSavedTrip >= 100) saveScore(false);
  wheelsAngle = (wheelsAngle + travelled / .367) % (Math.PI * 2);
  for (const car of moveTraffic(dt, previousZ, previousOffset)) {
    resolveTrafficContact(car, previousZ, previousOffset);
    if (state === 'crashed') return;
    const gap = car.z - worldZ;
    if (gap < -75 || gap > 1510) car.z = Infinity;
  }
  refillTraffic();

  const speedKmh = speedMS * 3.6;
  const targetGear = speedKmh < 1 && !throttle ? 0 : Math.max(1,
    shiftSpeeds.findIndex((shift, i) => i && (speedKmh < shift || i === 6)));
  if (targetGear > gearIndex || (gearIndex > 0 && speedKmh < shiftSpeeds[gearIndex - 1] - 5) || !targetGear) {
    gearIndex = targetGear;
  }
  const gearFloor = shiftSpeeds[Math.max(0, gearIndex - 1)];
  const gearCeiling = shiftSpeeds[Math.max(1, gearIndex)];
  const gearProgress = clamp((speedKmh - gearFloor) / (gearCeiling - gearFloor), 0, 1);
  const startRpm = gearIndex === 1 ? 1350 : 5000;
  const targetRpm = gearIndex ? mix(startRpm, 7200, gearProgress) : 900;
  revs = damp(revs, targetRpm, 10, dt);
}

function drawScene(dt, now) {
  const z = worldZ;
  updateWorld(z, now);
  const carX = center(z) + offset;
  const carY = roadSurfaceY(z);
  const roadYaw = yawAt(z);
  const highSpeed = smooth(24, 82, speedMS);
  steerVis = damp(steerVis, steerInput, 12, dt);

  // Chassis suspension: damped springs for squat, dive and roll, plus road noise and impact shake.
  const pitchTarget = clamp(-longAccel * .0036, -.042, .065);
  const rollTarget = clamp(lateral / 6, -1, 1) * (.016 + .032 * highSpeed);
  for (let left = Math.min(dt, .1); left > 0; left -= 1 / 60) {
    const step = Math.min(left, 1 / 60);
    susPitchV += ((pitchTarget - susPitch) * 95 - susPitchV * 11) * step;
    susPitch += susPitchV * step;
    susRollV += ((rollTarget - susRoll) * 95 - susRollV * 11) * step;
    susRoll += susRollV * step;
  }
  shake = Math.max(0, shake - dt * 1.6);
  const shakeAmp = shake * shake;
  const rough = state === 'playing' ? smooth(10, 60, speedMS) : 0;
  const noiseA = Math.sin(now * .043) + Math.sin(now * .0117 + 2.1) * .7;
  const noiseB = Math.sin(now * .051 + 1.7) + Math.sin(now * .0137) * .8;
  const pitch = susPitch + noiseA * .0011 * rough + Math.sin(now * .085) * .035 * shakeAmp;
  const roll = susRoll + noiseB * .0013 * rough + Math.sin(now * .067 + 1) * .045 * shakeAmp;
  const slopePitch = -Math.atan2(grade(z + 1) - grade(z - 1), 2);
  const slip = clamp(lateral / (speedMS + 8), -.20, .20);
  const chassis = r35.chassis && r35.chassis !== r35.body ? r35.chassis : null;

  r35.root.position.set(carX, carY, 0);
  r35.root.rotation.y = roadYaw;
  if (chassis) {
    r35.body.rotation.set(slopePitch, slip, 0);
    chassis.rotation.set(pitch, 0, roll);
  } else {
    r35.body.rotation.set(slopePitch + pitch, slip, roll);
  }
  if (r35.brakeLight) r35.brakeLight.emissiveIntensity = braking || state === 'crashed' ? 3.15 : 1.25;
  r35.wheels?.forEach(wheel => {
    wheel.rotation.x = wheelsAngle;
    wheel.rotation.y = wheel.position.z > 0 ? clamp(-steerVis * .21 * mix(1, .55, highSpeed), -.2, .2) : 0;
  });
  if (r35.steering) r35.steering.rotation.z = clamp(steerVis, -1, 1) * .9;
  ui.wheelSvg.style.transform = `rotate(${(steerVis * 100).toFixed(1)}deg)`;
  for (const car of traffic) {
    const relativeZ = car.z - z;
    car.root.visible = relativeZ > -100 && relativeZ < 1450;
    if (!car.root.visible) continue;
    car.root.position.set(center(car.z) + car.lane, roadSurfaceY(car.z), relativeZ);
    car.root.rotation.set(-Math.atan2(grade(car.z + 1) - grade(car.z - 1), 2), yawAt(car.z), 0);
  }

  const ready = state === 'ready';
  const interior = !ready && camIndex === 1;
  const hoodCam = !ready && camIndex === 2;
  const bumperCam = !ready && camIndex === 3;
  const heroWideCam = !ready && camIndex === 4;
  if (ready !== framedMenu) {
    framedMenu = ready;
    frameViewport();
  }
  r35.setCockpitMode ? r35.setCockpitMode(interior) : (r35.cockpit.visible = interior, r35.cabin.visible = !interior);
  if (r35.cabin) r35.cabin.visible = !interior && !hoodCam;
  let desiredFov = 57 + speedMS * .14;
  if (interior) {
    r35.updateInterior?.(speedMS * 3.6, revs, gearIndex ? String(gearIndex) : 'N', steerVis);
    r35.root.updateMatrixWorld(true);
    const frame = r35.cockpit?.parent || r35.chassis || r35.body;
    cockpitPosition.set(-.425, 1.24, -.19);
    const lookPitch = -.06 - tilt;
    const reach = 32 * Math.cos(lookPitch);
    localLook.copy(cockpitPosition);
    localLook.x -= Math.sin(orbit) * reach;
    localLook.y += Math.sin(lookPitch) * 32;
    localLook.z += Math.cos(orbit) * reach;
    frame.localToWorld(cockpitPosition);
    frame.localToWorld(localLook);
    cameraPosition.copy(cockpitPosition);
    cameraLook.copy(localLook);
    desiredFov = 67 + speedMS * .08;
  } else if (hoodCam) {
    r35.root.updateMatrixWorld(true);
    const frame = r35.chassis || r35.body;
    cockpitPosition.set(0, 1.24, .42);
    const lookPitch = -.048 - tilt * .45;
    const reach = 32 * Math.cos(lookPitch);
    localLook.set(-Math.sin(orbit) * reach, 1.24 + Math.sin(lookPitch) * 32, .42 + Math.cos(orbit) * reach);
    frame.localToWorld(cockpitPosition);
    frame.localToWorld(localLook);
    cameraPosition.copy(cockpitPosition);
    cameraLook.copy(localLook);
    desiredFov = 66 + speedMS * .11;
  } else if (bumperCam) {
    r35.root.updateMatrixWorld(true);
    const frame = r35.chassis || r35.body;
    cockpitPosition.set(0, .62, 2.38);
    const lookPitch = -.012 - clamp(tilt * .35, -.18, .12);
    const reach = 36 * Math.cos(lookPitch);
    const yaw = clamp(orbit, -.35, .35);
    localLook.set(-Math.sin(yaw) * reach, .62 + Math.sin(lookPitch) * 36, 2.38 + Math.cos(yaw) * reach);
    frame.localToWorld(cockpitPosition);
    frame.localToWorld(localLook);
    cameraPosition.copy(cockpitPosition);
    cameraLook.copy(localLook);
    desiredFov = 70 + speedMS * .12;
  } else if (ready) {
    const wide = smooth(.68, 1.45, camera.aspect);
    const turn = .59 - roadYaw + Math.sin(now / 4300) * .07;
    const trailing = mix(8.8, 5.85, wide);
    cameraPosition.set(carX + Math.sin(turn) * trailing, carY + 2.24, -Math.cos(turn) * trailing);
    cameraLook.set(carX, carY + .78, -.08);
    desiredFov = mix(60, 51, wide);
  } else if (heroWideCam) {
    const boost = speedMS / maxSpeed;
    const trailing = 8.4 + boost * 2.2;
    const angle = roadYaw + .24 + orbit;
    chasePosition.set(carX - Math.sin(angle) * trailing,
      carY + 2.28 + boost * .38 + tilt * 1.9,
      -Math.cos(angle) * trailing);
    const orbitBlend = smooth(.05, .85, Math.abs(orbit));
    chaseLook.set(mix(center(z + 15) + offset * .76, carX, .34 + .66 * orbitBlend),
      carY + mix(1.06, .82, orbitBlend) - tilt * .85, 13 * (1 - .75 * orbitBlend));
    cameraPosition.copy(chasePosition);
    cameraLook.copy(chaseLook);
    desiredFov = 54 + speedMS * .10;
  } else {
    const boost = speedMS / maxSpeed;
    const trailing = 6.9 + boost * 2.65;
    const angle = roadYaw + orbit;
    chasePosition.set(carX - Math.sin(angle) * trailing,
      carY + 2.93 + boost * .65 + tilt * 2.15,
      -Math.cos(angle) * trailing);
    const orbitBlend = smooth(.07, .88, Math.abs(orbit));
    chaseLook.set(mix(center(z + 19) + offset * .64, carX, orbitBlend),
      carY + mix(1.34, .82, orbitBlend) - tilt, 19 * (1 - orbitBlend));
    cameraPosition.copy(chasePosition);
    cameraLook.copy(chaseLook);
  }
  const bolted = interior || hoodCam || bumperCam;
  const tracking = snapCamera || bolted ? 1 : 1 - Math.exp(-11 * dt);
  camera.position.lerp(cameraPosition, tracking);
  camera.fov = snapCamera ? desiredFov : damp(camera.fov, desiredFov, 7, dt);
  camera.updateProjectionMatrix();
  shakeOffset.set(Math.sin(now * .093) * .13 * shakeAmp, Math.sin(now * .121 + 2) * .1 * shakeAmp,
    Math.sin(now * .077 + 4) * .06 * shakeAmp);
  camera.position.add(shakeOffset);
  camera.lookAt(cameraLook);
  snapCamera = false;

  sky.position.copy(camera.position);
  sun.position.set(carX + sunDirection.x * 175, carY + sunDirection.y * 175, sunDirection.z * 175);
  sun.target.position.set(carX, carY, 0);
  renderer.render(scene, camera);
  camera.position.sub(shakeOffset);
}

/* ---------- Input ---------- */
const pressedKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft',
  'ArrowDown', 'ArrowRight', 'Space', 'KeyC', 'KeyL', 'KeyM', 'KeyP', 'Escape']);
addEventListener('keydown', event => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if (event.ctrlKey || event.metaKey || event.altKey || !pressedKeys.has(event.code)) return;
  if (state === 'playing' || event.code === 'Escape') event.preventDefault();
  if (event.repeat && ['KeyC', 'KeyL', 'KeyM', 'KeyP', 'Escape'].includes(event.code)) return;
  if (event.code === 'Escape' && state === 'ready' && !ui.boardPanel.hidden) toggleBoard(false);
  else if (event.code === 'KeyC') toggleCamera();
  else if (event.code === 'KeyL') toggleCameraLock();
  else if (event.code === 'KeyM') toggleSound();
  else if (event.code === 'KeyP' || event.code === 'Escape') pauseDrive();
  else if (state === 'playing') held.add(event.code);
});
addEventListener('keyup', event => held.delete(event.code));
addEventListener('blur', () => {
  if (state === 'playing') pauseDrive();
  else clearInput();
});
addEventListener('pagehide', () => saveScore(false));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') pauseDrive();
});

const surface = renderer.domElement;
surface.tabIndex = -1;
surface.setAttribute('aria-label', 'Afterglow driving view');
surface.addEventListener('pointerdown', event => {
  if (pointer || event.button !== 0 || state !== 'playing') return;
  surface.setPointerCapture(event.pointerId);
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
surface.addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const sweep = camIndex === 1 ? 75 * Math.PI / 180
    : camIndex === 2 ? 55 * Math.PI / 180
    : camIndex === 3 ? 35 * Math.PI / 180
    : Math.PI;
  orbit = clamp(orbit + (event.clientX - pointer.x) * .0055, -sweep, sweep);
  tilt = clamp(tilt + (event.clientY - pointer.y) * .0041, -.53, .73);
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  surface.addEventListener(name, event => {
    if (pointer?.id === event.pointerId) pointer = null;
  });
}

ui.touch.addEventListener('contextmenu', event => event.preventDefault());

// Pedals: GAS and BRAKE are multi-touch friendly and never stick on release/cancel.
for (const button of ui.touch.querySelectorAll('.pedal[data-key]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (state !== 'playing') return;
    try { button.setPointerCapture(event.pointerId); } catch {}
    touchKeys.set(event.pointerId, { key: button.dataset.key, id: event.pointerId, button });
    button.classList.add('held');
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(name, event => {
      touchKeys.delete(event.pointerId);
      button.classList.toggle('held', [...touchKeys.values()].some(touch => touch.button === button));
    });
  }
}

// Steering module: tap a paddle or slide a thumb across the pad for analog steering (-1 left … +1 right).
function steerFromPointer(event, fallbackDir = 0) {
  if (!event.clientX && !event.clientY && fallbackDir) return fallbackDir;
  const rect = ui.steerPad.getBoundingClientRect();
  if (!rect.width) return fallbackDir;
  const u = clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1);
  return Math.abs(u) < .07 ? 0 : clamp(u / .55, -1, 1);
}
function applySteerPointers() {
  if (!steerPointers.size) {
    lastSteerId = null;
    setPaddles(0);
    return;
  }
  const value = steerPointers.has(lastSteerId) ? steerPointers.get(lastSteerId) : [...steerPointers.values()].pop();
  setPaddles(value);
}
for (const [el, dir] of [[ui.steerPad, 0], [paddleLeft, -1], [paddleRight, 1]]) {
  el.addEventListener('pointerdown', event => {
    event.preventDefault();
    event.stopPropagation();
    if (state !== 'playing') return;
    try { ui.steerPad.setPointerCapture(event.pointerId); } catch {}
    steerPointers.set(event.pointerId, steerFromPointer(event, dir));
    lastSteerId = event.pointerId;
    applySteerPointers();
  });
  el.addEventListener('pointermove', event => {
    if (!steerPointers.has(event.pointerId)) return;
    event.preventDefault();
    event.stopPropagation();
    steerPointers.set(event.pointerId, steerFromPointer(event, dir));
    lastSteerId = event.pointerId;
    applySteerPointers();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    el.addEventListener(name, event => {
      if (!steerPointers.has(event.pointerId)) return;
      steerPointers.delete(event.pointerId);
      if (lastSteerId === event.pointerId) lastSteerId = null;
      applySteerPointers();
    });
  }
}

/* ---------- Audio ---------- */
let audio = null;
let muted = false;
function wakeAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio || muted) return;
  if (audio) {
    audio.context.resume().catch(() => {});
    return;
  }
  const context = new Audio();
  const master = context.createGain();
  const engine = context.createGain();
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  engine.gain.value = 0;
  master.gain.value = .5;
  engine.connect(lowpass).connect(master);
  master.connect(context.destination);
  const oscillators = ['triangle', 'sawtooth', 'triangle'].map((type, i) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    gain.gain.value = [.67, .17, .11][i];
    oscillator.connect(gain).connect(engine);
    oscillator.start();
    return oscillator;
  });
  const road = context.createGain();
  const roadFilter = context.createBiquadFilter();
  roadFilter.type = 'lowpass';
  roadFilter.frequency.value = 510;
  road.gain.value = 0;
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const wind = context.createBufferSource();
  wind.buffer = noise;
  wind.loop = true;
  wind.connect(roadFilter).connect(road).connect(master);
  wind.start();
  audio = { context, master, engine, lowpass, oscillators, road };
  context.resume().catch(() => {});
}

function toggleSound() {
  muted = !muted;
  if (!muted) wakeAudio();
  if (audio) audio.master.gain.setTargetAtTime(muted ? 0 : .5, audio.context.currentTime, .035);
  ui.sound.setAttribute('aria-pressed', String(!muted));
  ui.sound.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  if (state !== 'ready') notice(muted ? 'SOUND OFF' : 'SOUND ON');
}

function driveSound() {
  if (!audio || audio.context.state !== 'running') return;
  const now = audio.context.currentTime;
  const active = state === 'playing';
  const engineHz = revs / 60 * 2;
  audio.oscillators.forEach((oscillator, i) => {
    oscillator.frequency.setTargetAtTime(engineHz * [1, 2, .499][i], now, .065);
  });
  audio.lowpass.frequency.setTargetAtTime(215 + revs * (throttle ? .17 : .082), now, .08);
  audio.engine.gain.setTargetAtTime(active ? (throttle ? .158 : .058) : 0, now, .12);
  audio.road.gain.setTargetAtTime(active ? smooth(7, maxSpeed, speedMS) * .22 : 0, now, .15);
}

function crashSound(volume = .30) {
  if (!audio || muted) return;
  const now = audio.context.currentTime;
  const impact = audio.context.createOscillator();
  const gain = audio.context.createGain();
  impact.type = 'triangle';
  impact.frequency.setValueAtTime(125, now);
  impact.frequency.exponentialRampToValueAtTime(30, now + .24);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + .28);
  impact.connect(gain).connect(audio.master);
  impact.start();
  impact.stop(now + .3);
}

/* ---------- HUD + frame loop ---------- */
function updateHud() {
  const speedKmh = Math.round(speedMS * 3.6);
  ui.speed.textContent = String(speedKmh).padStart(3, '0');
  ui.gear.textContent = gearIndex || 'N';
  ui.rpm.textContent = `${(revs / 1000).toFixed(1)} x1000`;
  ui.speedArc.setAttribute('stroke-dasharray', `${speedKmh / 310 * 100} 100`);
  const lit = Math.round(revs / 7400 * rpmBars.length);
  rpmBars.forEach((bar, i) => bar.classList.toggle('on', i < lit));
  ui.distance.textContent = km(tripDistance);
  ui.best.textContent = km(Math.max(personalBest, tripDistance));
  const gasPress = Math.round(gasAmt * 50) / 50;
  const brakePress = Math.round(brakeAmt * 50) / 50;
  if (gasPress !== lastGasPress) ui.pedalGas.style.setProperty('--press', String(lastGasPress = gasPress));
  if (brakePress !== lastBrakePress) ui.pedalBrake.style.setProperty('--press', String(lastBrakePress = brakePress));
  if (state !== 'playing' && state !== 'paused') return;
  const route = routeAt(worldZ);
  if (route === lastRoute) return;
  const previous = lastRoute;
  lastRoute = route;
  ui.roadName.textContent = routeLabels[route];
  if (route === 'approach') notice('SKYLINE VIADUCT AHEAD', 2.5);
  else if (route === 'bridge') notice('CROSSING SKYLINE VIADUCT', 2.5);
  else if (previous === 'coast' && route === 'valley') notice('ENTERING PINE VALLEY', 2.4);
}

function frameViewport() {
  const width = Math.max(1, innerWidth);
  const height = Math.max(1, innerHeight);
  camera.aspect = width / height;
  if (framedMenu) {
    const wide = smooth(.68, 1.45, camera.aspect);
    camera.setViewOffset(width, height, -width * mix(.02, .22, wide), -height * mix(.21, .075, wide), width, height);
  } else {
    camera.clearViewOffset();
  }
}

function resizeDrive() {
  frameViewport();
  renderer.setSize(innerWidth, innerHeight, false);
}

function frameDrive(now) {
  const frameSeconds = lastFrame ? (now - lastFrame) / 1000 : 1 / 60;
  const dt = Math.min(.2, frameSeconds);
  lastFrame = now;
  updateRenderScale(frameSeconds, now);
  if (state === 'playing' && dt > 0) {
    const steps = Math.ceil(dt * 60);
    const step = dt / steps;
    for (let i = 0; i < steps && state === 'playing'; i++) {
      updateDriving(step, now - (steps - i - 1) * step * 1000);
    }
  }
  if (!pointer && !cameraLocked) {
    orbit = damp(orbit, 0, 2.25, dt);
    tilt = damp(tilt, 0, 2.25, dt);
  }
  if (!ui.toast.hidden && now > toastUntil) ui.toast.hidden = true;
  updateHud();
  driveSound();
  drawScene(dt, now);
  requestAnimationFrame(frameDrive);
}

/* ---------- Wiring ---------- */
ui.start.addEventListener('click', attemptStart);
ui.restart.addEventListener('click', restartDrive);
ui.again.addEventListener('click', restartDrive);
ui.resume.addEventListener('click', pauseDrive);
ui.garagePause.addEventListener('click', goGarage);
ui.garageOver.addEventListener('click', goGarage);
ui.pause.addEventListener('click', pauseDrive);
ui.view.addEventListener('click', toggleCamera);
ui.camLock?.addEventListener('click', toggleCameraLock);
ui.sound.addEventListener('click', toggleSound);
ui.boardToggle.addEventListener('click', () => toggleBoard());
ui.boardClose.addEventListener('click', () => { toggleBoard(false); ui.boardToggle.focus({ preventScroll: true }); });
ui.changeName.addEventListener('click', () => {
  editingName = true;
  refreshDriverUI();
  ui.driverName.value = driverName;
  ui.driverName.focus();
  ui.driverName.select();
});
ui.driverName.addEventListener('input', () => { ui.nameHint.hidden = true; });
ui.driverName.addEventListener('keydown', event => {
  if (event.key === 'Escape' && driverName && editingName) {
    event.preventDefault();
    editingName = false;
    ui.nameHint.hidden = true;
    refreshDriverUI();
    ui.changeName.focus({ preventScroll: true });
  }
});
ui.driverForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = sanitizeName(ui.driverName.value);
  if (!name) {
    showNameHint();
    return;
  }
  setDriver(name);
  ui.start.focus({ preventScroll: true });
});
ui.swatches.addEventListener('click', event => {
  const swatch = event.target.closest('.swatch');
  if (swatch) selectPaint(swatch.dataset.paint);
});
ui.zones.addEventListener('click', event => {
  const button = event.target.closest('.zone');
  if (button) selectZone(button.dataset.zone);
});
ui.sound.textContent = 'SOUND ON';
refreshCameraUI();
addEventListener('resize', resizeDrive);
scene.add(sun.target);
resizeDrive();
selectPaint(paint.id, false);
selectZone(zone.id, false);
if (driverName) ui.driverName.value = driverName;
refreshDriverUI();
renderHearts();
previewZone();
menu('ready');
requestAnimationFrame(frameDrive);
