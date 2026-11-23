const element = id => document.getElementById(id);
const ui = Object.fromEntries([
  'actions', 'trip', 'hud', 'touch', 'overlay', 'startCard', 'pauseCard', 'pauseTitle',
  'pauseText', 'start', 'resume', 'restart', 'view', 'cam', 'sound', 'pause', 'roadName',
  'speed', 'gear', 'rpm', 'rpmBars', 'speedArc', 'ticks', 'distance', 'best', 'toast'
].map(id => [id, element(id)]));
const r35 = makeR35();
const traffic = Array.from({ length: 12 }, (_, i) => makeTraffic(i));
const held = new Set();
const touchKeys = new Map();
const bestKey = 'afterglow-r35-best-metres-v1';
const maxSpeed = 86.1;
const coastLabel = 'SUNSET COAST';
const valleyLabel = 'PINE VALLEY';
const viaductLabel = 'SKYLINE VIADUCT';
const viaductLength = 640;
const contactDistance = 4.3;
const contactWidth = 1.82;
const shiftSpeeds = [0, 65, 105, 149, 198, 251, 310];
const km = metres => (metres / 1000).toFixed(2);
const damp = (value, target, rate, dt) => mix(value, target, 1 - Math.exp(-rate * dt));

let bestDistance = 0;
try {
  bestDistance = Math.max(0, Number(localStorage.getItem(bestKey)) || 0);
  if (!Number.isFinite(bestDistance)) bestDistance = 0;
} catch {}
let savedDistance = bestDistance;
let state = 'ready';
let distance = 0;
let speedMS = 0;
let lateral = 0;
let offset = 0;
let wheelsAngle = 0;
let revs = 900;
let gearIndex = 0;
let throttle = false;
let braking = false;
let cockpitView = false;
let trafficSequence = 0;
let impactCooldown = 0;
let lastRoute = coastLabel;
let lastEdgeNotice = -Infinity;
let toastUntil = 0;
let lastFrame = 0;

const chaseLook = vector(0, 0, 0);
const chasePosition = vector(0, 0, 0);
const cockpitPosition = vector(0, 0, 0);
const localLook = vector(0, 0, 0);
const cameraPosition = vector(0, 0, 0);
const cameraLook = vector(0, 0, 0);
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

function saveBest(force = false) {
  if (bestDistance <= savedDistance || (!force && bestDistance - savedDistance < 100)) return;
  try {
    localStorage.setItem(bestKey, String(Math.round(bestDistance)));
    savedDistance = bestDistance;
  } catch {
    savedDistance = bestDistance;
  }
}

function notice(text, seconds = 1.8) {
  ui.toast.textContent = text;
  ui.toast.hidden = false;
  toastUntil = performance.now() + seconds * 1000;
}

function clearInput() {
  held.clear();
  for (const { button, id } of touchKeys.values()) {
    if (button.hasPointerCapture(id)) button.releasePointerCapture(id);
    button.classList.remove('held');
  }
  touchKeys.clear();
  if (pointer && renderer.domElement.hasPointerCapture(pointer.id)) {
    renderer.domElement.releasePointerCapture(pointer.id);
  }
  pointer = null;
  throttle = false;
  braking = false;
}

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
    placeTrafficGroup(freeCars, start);
    start += mix(146, 191, rand(trafficSequence * 4.17 + 23));
  }
}

function refillTraffic() {
  const freeCars = traffic.filter(car => car.z === Infinity);
  if (!freeCars.length) return;
  const positions = traffic.filter(car => Number.isFinite(car.z)).map(car => car.z);
  const ceiling = distance + 1320;
  const minimumSpacing = mix(143, 117, smooth(0, 18000, distance));
  while (freeCars.length) {
    const spacing = minimumSpacing + 30 * rand(trafficSequence * 4.17);
    let z;
    if (speedMS >= 18) {
      const tail = Math.max(distance + 170, ...positions) + spacing;
      if (tail <= ceiling) z = tail;
    }
    if (z === undefined) {
      for (let candidate = distance + 345; candidate <= ceiling; candidate += 18) {
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
      leader = { previousZ, z: distance, speed: speedMS };
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

function resolveTrafficContact(car, previousZ, previousOffset) {
  const previousGap = car.previousZ - previousZ;
  const gap = car.z - distance;
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
    crashDrive();
    return;
  }
  if (impactCooldown > 0) return;
  impactCooldown = .9;

  if (rearEnd) {
    speedMS = Math.max(0, Math.min(speedMS - 2, car.speed - 1.6));
    notice('เฉี่ยวท้ายรถ · ลดความเร็ว');
  } else {
    speedMS = Math.max(0, speedMS - clamp(Math.abs(closingSpeed) * .2 + speedMS * .08, 2, 11));
    lateral *= .25;
    offset = clamp(offset + (Math.sign(overlap) || Math.sign(side) || 1) * .16,
      -roadWidth + .83, roadWidth - .83);
    notice('เบียดรถ · ประคองพวงมาลัย');
  }
  crashSound(.13);
}

function menu(next, title = '', message = '') {
  clearInput();
  state = next;
  ui.overlay.hidden = next === 'playing';
  ui.startCard.hidden = next !== 'ready';
  ui.pauseCard.hidden = next === 'ready' || next === 'playing';
  ui.actions.hidden = ui.trip.hidden = ui.hud.hidden = next === 'ready';
  ui.touch.hidden = next !== 'playing';
  ui.pauseTitle.textContent = title;
  ui.pauseText.textContent = message;
  ui.resume.hidden = next !== 'paused';
  ui.resume.textContent = 'ขับต่อ';
  ui.restart.textContent = next === 'crashed' ? 'เริ่มใหม่' : 'เริ่มรอบใหม่';
  if (next === 'paused') ui.resume.focus({ preventScroll: true });
  if (next === 'crashed') ui.restart.focus({ preventScroll: true });
  if (next === 'ready') ui.start.focus({ preventScroll: true });
  if (next === 'playing') {
    lastFrame = 0;
    renderer.domElement.focus({ preventScroll: true });
  }
}

function restartDrive() {
  wakeAudio();
  saveBest(true);
  distance = speedMS = offset = lateral = wheelsAngle = 0;
  gearIndex = 0;
  revs = 900;
  orbit = tilt = 0;
  ui.toast.hidden = true;
  impactCooldown = 0;
  lastRoute = coastLabel;
  ui.roadName.textContent = coastLabel;
  lastEdgeNotice = -Infinity;
  seedTraffic();
  snapCamera = true;
  menu('playing');
}

function pauseDrive() {
  if (state === 'playing') {
    saveBest(true);
    menu('paused', 'หยุดพัก', `ระยะทาง ${km(distance)} กม. · สถิติ ${km(bestDistance)} กม.`);
  } else if (state === 'paused') {
    wakeAudio();
    menu('playing');
  }
}

function crashDrive() {
  saveBest(true);
  crashSound();
  speedMS = lateral = 0;
  gearIndex = 0;
  revs = 900;
  menu('crashed', 'ชนท้ายอย่างแรง', `ระยะทาง ${km(distance)} กม. · สถิติ ${km(bestDistance)} กม.`);
}

function toggleCamera() {
  if (state === 'ready') return;
  cockpitView = !cockpitView;
  orbit = tilt = 0;
  snapCamera = true;
  ui.cam.textContent = cockpitView ? '02' : '01';
  ui.view.setAttribute('aria-pressed', String(cockpitView));
  notice(cockpitView ? 'มุมคนขับ' : 'มุมตามหลัง');
}

function updateDriving(dt, now) {
  impactCooldown = Math.max(0, impactCooldown - dt);
  const input = code => held.has(code) || [...touchKeys.values()].some(touch => touch.key === code);
  throttle = input('KeyW') || input('ArrowUp');
  braking = input('KeyS') || input('ArrowDown') || input('Space');
  const steer = Number(input('KeyA') || input('ArrowLeft')) - Number(input('KeyD') || input('ArrowRight'));
  const acceleration = throttle ? 9.9 * (1 - Math.pow(speedMS / maxSpeed, 1.63)) : 0;
  const drag = throttle ? .11 : 1.04 + speedMS * .025;
  speedMS = clamp(speedMS + (acceleration - drag - (braking ? 15.8 : 0)) * dt, 0, maxSpeed);

  const previousOffset = offset;
  const highSpeed = smooth(24, 82, speedMS);
  const steeringSpeed = mix(3.1, 5.7, smooth(0, 24, speedMS)) * mix(1, .54, highSpeed);
  lateral = damp(lateral, steer * steeringSpeed * smooth(0, 8, speedMS),
    steer ? mix(9, 5.8, highSpeed) : 11, dt);
  offset += lateral * dt;
  if (Math.abs(offset) > roadWidth - .83) {
    offset = Math.sign(offset) * (roadWidth - .83);
    if (Math.sign(lateral) === Math.sign(offset)) {
      lateral = 0;
      speedMS = Math.max(0, speedMS - 20 * dt);
      if (speedMS > 9 && now - lastEdgeNotice > 1800) {
        notice('ชิดขอบถนน');
        lastEdgeNotice = now;
      }
    }
  }

  const previousZ = distance;
  distance += speedMS * dt;
  bestDistance = Math.max(distance, bestDistance);
  saveBest();
  wheelsAngle = (wheelsAngle + speedMS * dt / .367) % (Math.PI * 2);
  for (const car of moveTraffic(dt, previousZ, previousOffset)) {
    resolveTrafficContact(car, previousZ, previousOffset);
    if (state === 'crashed') return;
    const gap = car.z - distance;
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
  const z = distance;
  updateWorld(z);
  const carX = center(z) + offset;
  const carY = grade(z);
  const roadYaw = yawAt(z);
  r35.root.position.set(carX, carY, 0);
  r35.root.rotation.y = roadYaw;
  r35.body.rotation.set(
    -Math.atan2(grade(z + 1) - grade(z - 1), 2) + (braking ? .016 : throttle ? -.008 : 0),
    clamp(lateral / (speedMS + 8), -.24, .24),
    -.020 * clamp(lateral / 6, -1, 1)
  );
  r35.brakeLight.emissiveIntensity = braking || state === 'crashed' ? 3.15 : 1.25;
  r35.wheels.forEach(wheel => {
    wheel.rotation.x = wheelsAngle;
    wheel.rotation.y = wheel.position.z > 0 ? clamp(lateral / 29, -.2, .2) : 0;
  });
  r35.steering.rotation.z = clamp(lateral / 7, -.6, .6);
  for (const car of traffic) {
    const relativeZ = car.z - z;
    car.root.visible = relativeZ > -100 && relativeZ < 1450;
    if (!car.root.visible) continue;
    car.root.position.set(center(car.z) + car.lane, grade(car.z), relativeZ);
    car.root.rotation.set(-Math.atan2(grade(car.z + 1) - grade(car.z - 1), 2), yawAt(car.z), 0);
  }

  const interior = cockpitView && state !== 'ready';
  const ready = state === 'ready';
  if (ready !== framedMenu) {
    framedMenu = ready;
    frameViewport();
  }
  r35.cockpit.visible = interior;
  r35.cabin.visible = !interior;
  let desiredFov = 57 + speedMS * .14;
  if (interior) {
    r35.root.updateMatrixWorld(true);
    cockpitPosition.set(-.425, 1.25, -.23);
    const pitch = -.06 - tilt;
    const reach = 32 * Math.cos(pitch);
    localLook.copy(cockpitPosition);
    localLook.x -= Math.sin(orbit) * reach;
    localLook.y += Math.sin(pitch) * 32;
    localLook.z += Math.cos(orbit) * reach;
    r35.body.localToWorld(cockpitPosition);
    r35.body.localToWorld(localLook);
    cameraPosition.copy(cockpitPosition);
    cameraLook.copy(localLook);
    desiredFov = 67 + speedMS * .08;
  } else if (ready) {
    const wide = smooth(.68, 1.45, camera.aspect);
    const turn = .59 - roadYaw + Math.sin(now / 4300) * .07;
    const trailing = mix(8.8, 5.85, wide);
    cameraPosition.set(carX + Math.sin(turn) * trailing, carY + 2.24, -Math.cos(turn) * trailing);
    cameraLook.set(carX, carY + .78, -.08);
    desiredFov = mix(60, 51, wide);
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
  const tracking = snapCamera || interior ? 1 : 1 - Math.exp(-11 * dt);
  camera.position.lerp(cameraPosition, tracking);
  camera.fov = snapCamera ? desiredFov : damp(camera.fov, desiredFov, 7, dt);
  camera.updateProjectionMatrix();
  camera.lookAt(cameraLook);
  snapCamera = false;

  sky.position.copy(camera.position);
  sun.position.set(carX + sunDirection.x * 175, carY + sunDirection.y * 175, sunDirection.z * 175);
  sun.target.position.set(carX, carY, 0);
  renderer.render(scene, camera);
}

const pressedKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft',
  'ArrowDown', 'ArrowRight', 'Space', 'KeyC', 'KeyM', 'KeyP', 'Escape']);
addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || !pressedKeys.has(event.code)) return;
  if (state === 'playing' || event.code === 'Escape') event.preventDefault();
  if (event.repeat && ['KeyC', 'KeyM', 'KeyP', 'Escape'].includes(event.code)) return;
  if (event.code === 'KeyC') toggleCamera();
  else if (event.code === 'KeyM') toggleSound();
  else if (event.code === 'KeyP' || event.code === 'Escape') pauseDrive();
  else if (state === 'playing') held.add(event.code);
});
addEventListener('keyup', event => held.delete(event.code));
addEventListener('blur', () => {
  if (state === 'playing') pauseDrive();
  else clearInput();
});
addEventListener('pagehide', () => saveBest(true));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') pauseDrive();
});

const surface = renderer.domElement;
surface.tabIndex = -1;
surface.setAttribute('aria-label', 'ฉากขับรถ Afterglow');
surface.addEventListener('pointerdown', event => {
  if (pointer || event.button !== 0 || state !== 'playing') return;
  surface.setPointerCapture(event.pointerId);
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
surface.addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const sweep = cockpitView ? 75 * Math.PI / 180 : Math.PI;
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
for (const button of ui.touch.querySelectorAll('[data-key]')) {
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
  ui.sound.textContent = muted ? 'ปิดเสียง' : 'เสียงเปิด';
  if (state !== 'ready') notice(muted ? 'ปิดเสียงแล้ว' : 'เปิดเสียงแล้ว');
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

function updateHud() {
  const speedKmh = Math.round(speedMS * 3.6);
  ui.speed.textContent = String(speedKmh).padStart(3, '0');
  ui.gear.textContent = gearIndex || 'N';
  ui.rpm.textContent = `${(revs / 1000).toFixed(1)} x 1000`;
  ui.speedArc.setAttribute('stroke-dasharray', `${speedKmh / 310 * 100} 100`);
  const lit = Math.round(revs / 7400 * rpmBars.length);
  rpmBars.forEach((bar, i) => bar.classList.toggle('on', i < lit));
  ui.distance.textContent = km(distance);
  ui.best.textContent = km(bestDistance);
  const bridgeStart = bridgeStartAt(distance + 260);
  const approaching = bridgeStart > 0 && distance < bridgeStart;
  const onBridge = bridgeStart > 0 && distance >= bridgeStart && distance < bridgeStart + viaductLength;
  const route = approaching ? 'viaduct approach' : onBridge ? viaductLabel : distance >= 6900 ? valleyLabel : coastLabel;
  if (route === lastRoute) return;
  const fromCoast = lastRoute === coastLabel;
  lastRoute = route;
  ui.roadName.textContent = approaching ? viaductLabel : route;
  if (approaching) notice('อีกไม่นานถึง SKYLINE VIADUCT', 2.5);
  else if (onBridge) notice('กำลังข้าม SKYLINE VIADUCT', 2.5);
  else if (fromCoast && route === valleyLabel) notice('เข้าสู่ PINE VALLEY', 2.4);
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
  if (!pointer) {
    orbit = damp(orbit, 0, 2.25, dt);
    tilt = damp(tilt, 0, 2.25, dt);
  }
  if (!ui.toast.hidden && now > toastUntil) ui.toast.hidden = true;
  updateHud();
  driveSound();
  drawScene(dt, now);
  requestAnimationFrame(frameDrive);
}

ui.start.addEventListener('click', restartDrive);
ui.restart.addEventListener('click', restartDrive);
ui.resume.addEventListener('click', pauseDrive);
ui.pause.addEventListener('click', pauseDrive);
ui.view.addEventListener('click', toggleCamera);
ui.sound.addEventListener('click', toggleSound);
ui.sound.textContent = 'เสียงเปิด';
ui.view.setAttribute('aria-pressed', 'false');
addEventListener('resize', resizeDrive);
scene.add(sun.target);
resizeDrive();
seedTraffic();
menu('ready');
requestAnimationFrame(frameDrive);
