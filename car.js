const black = material(0x131722, .62);
const rubber = material(0x18191e, .91);
const alloy = material(0xb8c3d0, .24, .84);
const graphite = material(0x353c47, .34, .62);
const silver = material(0xd2dbe0, .18, .82);
const dashboard = material(0x1e2028, .86);
dashboard.side = THREE.DoubleSide;
const alcantara = material(0x171920, .92, .05);
alcantara.side = THREE.DoubleSide;
const stitchRed = material(0xd9322a, .48, .16);
const ledAmber = new THREE.MeshStandardMaterial({
  color: 0xffaa2b, emissive: 0xff7b14, emissiveIntensity: 1.35, roughness: .25, metalness: .2
});
const startBtnRed = new THREE.MeshStandardMaterial({
  color: 0xff2e38, emissive: 0xd91420, emissiveIntensity: .95, roughness: .28, metalness: .24
});
const exhaustMat = material(0x737b8a, .26, .86);
const burntTitanium = new THREE.MeshStandardMaterial({
  color: 0x4578f5, emissive: 0x162e75, emissiveIntensity: .42, roughness: .2, metalness: .92
});
const bremboGold = new THREE.MeshPhysicalMaterial({
  color: 0xe89b14, roughness: .22, metalness: .64, clearcoat: .88, clearcoatRoughness: .12
});
const pillarBlack = new THREE.MeshPhysicalMaterial({
  color: 0x0c1017, roughness: .2, metalness: .32, clearcoat: .9, clearcoatRoughness: .12
});
const glass = new THREE.MeshPhysicalMaterial({
  color: 0x152128, roughness: .18, metalness: .26, clearcoat: .82, clearcoatRoughness: .1
});
const headlightGlass = new THREE.MeshPhysicalMaterial({
  color: 0xdce9ff, roughness: .09, metalness: .1, clearcoat: 1, clearcoatRoughness: .06,
  transparent: true, opacity: .42
});
const lampOff = material(0x2a0714, .3, .2);
const lampWhite = new THREE.MeshStandardMaterial({ color: 0xf2f7ff, emissive: 0xa7c8ff, emissiveIntensity: 1.05 });
const drlBolt = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc2dcff, emissiveIntensity: 1.55 });
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 24);
const tireGeo = new THREE.CylinderGeometry(.367, .367, .265, 32);
const aspectBadge = new THREE.PlaneGeometry(1, 1);
const lampDisc = new THREE.CircleGeometry(1, 40);
const rotorHole = new THREE.CircleGeometry(1, 10);
const lampRim = new THREE.TorusGeometry(1, .097, 7, 36);
const lampRing = new THREE.TorusGeometry(1, .126, 8, 40);
const fineRing = new THREE.TorusGeometry(1, .028, 5, 36);
const mirrorHousing = new THREE.SphereGeometry(1, 24, 12);
const intake = material(0x07080e, .55, .22);
const ventMetal = material(0x202838, .32, .56);
const seal = material(0x0b101b, .46, .18);
const tireShoulder = material(0x212329, .88);
const brakeRotor = material(0x838d9e, .32, .85);
const bezel = material(0x464c5c, .24, .82);
const reverseLamp = new THREE.MeshStandardMaterial({ color: 0xd8d2c9, emissive: 0x453f38, emissiveIntensity: .3, roughness: .32, metalness: .35 });
const bumperReflector = new THREE.MeshStandardMaterial({ color: 0x991426, emissive: 0x7a0a1b, emissiveIntensity: .55, roughness: .26, metalness: .25 });
const lampLens = new THREE.MeshPhysicalMaterial({ color: 0x750c27, roughness: .14, metalness: .18, clearcoat: 1, clearcoatRoughness: .1 });

// Procedural carbon-fiber weave material for splitters, side-skirt blades, diffuser and center console.
const carbonMat = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#141720';
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      const shift = ((x + y) / 8) & 1;
      ctx.fillStyle = shift ? '#252b38' : '#191d27';
      ctx.fillRect(x, y, 4, 4);
      ctx.fillStyle = shift ? '#191d27' : '#2c3342';
      ctx.fillRect(x + 4, y + 4, 4, 4);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshPhysicalMaterial({
    color: 0xd0d7e2, map: tex, roughness: .27, metalness: .36, clearcoat: .86, clearcoatRoughness: .15
  });
})();

// Batch rigid panels that share paint or trim. Wheel assemblies and cockpit
// visibility stay independent because only direct mesh children are combined.
function batchPanels(parent) {
  const byMaterial = new Map();
  for (const part of parent.children) {
    if (!part.isMesh) continue;
    const list = byMaterial.get(part.material) || [];
    list.push(part);
    byMaterial.set(part.material, list);
  }
  const vertex = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  for (const [mat, parts] of byMaterial) {
    if (parts.length < 2) continue;
    const positions = [], normals = [], uvs = [], indices = [];
    for (const part of parts) {
      const geo = part.geometry;
      const attributes = geo.attributes;
      const base = positions.length / 3;
      part.updateMatrix();
      normalMatrix.getNormalMatrix(part.matrix);
      for (let i = 0; i < attributes.position.count; i++) {
        vertex.fromBufferAttribute(attributes.position, i).applyMatrix4(part.matrix);
        positions.push(vertex.x, vertex.y, vertex.z);
        vertex.fromBufferAttribute(attributes.normal, i).applyNormalMatrix(normalMatrix);
        normals.push(vertex.x, vertex.y, vertex.z);
        uvs.push(attributes.uv?.getX(i) ?? 0, attributes.uv?.getY(i) ?? 0);
      }
      for (let i = 0; i < (geo.index?.count ?? attributes.position.count); i++)
        indices.push(base + (geo.index?.getX(i) ?? i));
      parent.remove(part);
    }
    const geo = new THREE.BufferGeometry();
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    const combined = new THREE.Mesh(geo, mat);
    combined.renderOrder = parts[0].renderOrder;
    parent.add(combined);
  }
}

const trafficPaint = color => new THREE.MeshPhysicalMaterial({
  color, roughness: .24, metalness: .56, clearcoat: .92, clearcoatRoughness: .12
});

function attach(parent, geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}
const box = (group, mat, x, y, z, w, h, d) => attach(group, boxGeo, mat, x, y, z, w, h, d);

function canvasMaterial(width, height, draw, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, ...options });
}

const plate = canvasMaterial(256, 96, (ctx, w, h) => {
  ctx.fillStyle = '#ece7dc';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#182238';
  ctx.fillRect(0, 0, w, 18);
  ctx.strokeStyle = '#282b3a';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c8d6f0';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('JAPAN · NISMO', w / 2, 13);
  ctx.fillStyle = '#141620';
  ctx.font = 'bold 50px monospace';
  ctx.fillText('R35', w / 2, 62);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('AFTERGLOW', w / 2, 83);
});

const badge = canvasMaterial(128, 68, (ctx, w) => {
  ctx.font = 'italic 900 57px sans-serif';
  ctx.fillStyle = '#e6eaf2';
  ctx.fillText('GT', 2, 53);
  ctx.fillStyle = '#ff3636';
  ctx.fillText('R', w - 49, 53);
}, { transparent: true });

// Tighter, richer dark underbody ambient-occlusion contact shadow (y = 0.014).
const shadowMat = canvasMaterial(128, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.scale(w / 2, h / 2);
  const core = ctx.createRadialGradient(1, 1, .18, 1, 1, .98);
  core.addColorStop(0, 'rgba(6, 7, 12, 0.96)');
  core.addColorStop(.48, 'rgba(8, 9, 15, 0.88)');
  core.addColorStop(.76, 'rgba(10, 11, 18, 0.52)');
  core.addColorStop(1, 'rgba(10, 11, 18, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, 2, 2);
  ctx.restore();
}, {
  transparent: true, depthWrite: false, toneMapped: false,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
});

// Crisp grounded dark tire contact-patch shadow directly under each wheel (y = 0.011).
const tireShadowMat = canvasMaterial(64, 96, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.scale(w / 2, h / 2);
  const patch = ctx.createRadialGradient(1, 1, .12, 1, 1, .96);
  patch.addColorStop(0, 'rgba(4, 5, 9, 0.97)');
  patch.addColorStop(.55, 'rgba(7, 8, 13, 0.82)');
  patch.addColorStop(1, 'rgba(7, 8, 13, 0)');
  ctx.fillStyle = patch;
  ctx.fillRect(0, 0, 2, 2);
  ctx.restore();
}, {
  transparent: true, depthWrite: false, toneMapped: false,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
});

const rearGlow = canvasMaterial(128, 128, (ctx, w, h) => {
  const radius = w * .5;
  const glow = ctx.createRadialGradient(radius, h * .5, 0, radius, h * .5, radius);
  glow.addColorStop(0, '#ff284300');
  glow.addColorStop(.32, '#ff284316');
  glow.addColorStop(.58, '#ff304868');
  glow.addColorStop(.78, '#ff223a30');
  glow.addColorStop(1, '#ff223a00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}, { transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: .72 });

const mirrorGlassMat = canvasMaterial(128, 64, (ctx, w, h) => {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1e3558');
  grad.addColorStop(.46, '#b86b52');
  grad.addColorStop(.62, '#f09c67');
  grad.addColorStop(.68, '#322833');
  grad.addColorStop(1, '#191a22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, w - 4, h - 4);
});

// Each station defines the sill, fender shoulder and upper body across the length.
function shell(parent, stations, mat) {
  const p = [], faces = [];
  for (let i = 0; i < stations.length; i++) {
    const [z, w, low, shoulderY, top, upperWidth] = stations[i];
    p.push(-w * .83, low, z, -w, shoulderY - .18, z, -w, shoulderY, z, -w * upperWidth, top, z,
      0, top + .023, z, w * upperWidth, top, z, w, shoulderY, z, w, shoulderY - .18, z, w * .83, low, z);
    if (i) for (let j = 1; j < 9; j++) {
      const a = (i - 1) * 9 + j - 1, b = a + 9;
      faces.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  for (let j = 1; j < 8; j++) {
    faces.push(0, j, j + 1);
    const end = (stations.length - 1) * 9;
    faces.push(end, end + j + 1, end + j);
  }
  return meshFrom(parent, p, faces, mat);
}
function panel(parent, points, mat) {
  return meshFrom(parent, points.flat(), [0, 1, 2, 0, 2, 3], mat);
}

const heroStations = [
  [-2.43, .902, .332, .722, .834, .912], [-2.39, .966, .275, .781, .894, .876],
  [-2.29, 1.018, .241, .838, .948, .845], [-2.09, 1.064, .232, .878, .968, .823],
  [-1.8, 1.088, .231, .896, .974, .814], [-1.42, 1.096, .231, .885, .970, .804],
  [-1.12, 1.072, .236, .856, .941, .801], [-.79, 1.036, .240, .826, .908, .806],
  [.03, 1.004, .238, .808, .902, .819], [.51, 1.016, .241, .820, .908, .815],
  [.95, 1.060, .243, .835, .901, .801], [1.39, 1.094, .246, .840, .878, .786],
  [1.68, 1.084, .243, .823, .843, .792], [1.95, 1.042, .244, .786, .795, .809],
  [2.18, .994, .243, .731, .736, .824], [2.34, .916, .276, .674, .681, .872],
  [2.394, .826, .324, .603, .631, .916],
];
const axles = [-1.385, 1.405];

function stationValue(stations, i, column, t) {
  const a = stations[i], b = stations[i + 1];
  const previous = stations[Math.max(0, i - 1)], next = stations[Math.min(stations.length - 1, i + 2)];
  const span = b[0] - a[0];
  const centerSlope = (b[column] - a[column]) / span;
  const limitedSlope = (left, right) => left * right > 0 ? 2 * left * right / (left + right) : 0;
  const slopeA = i > 0 ? limitedSlope((a[column] - previous[column]) / (a[0] - previous[0]), centerSlope) : centerSlope;
  const slopeB = i + 2 < stations.length ? limitedSlope(centerSlope, (next[column] - b[column]) / (next[0] - b[0])) : centerSlope;
  return mix(a[column], b[column], t * t * (3 - 2 * t)) + span * t * (1 - t) * (slopeA * (1 - t) - slopeB * t);
}

function heroSection(z) {
  const i = heroStations.findIndex((station, index) => index && z <= station[0]) - 1;
  const a = heroStations[i], b = heroStations[i + 1];
  const t = (z - a[0]) / (b[0] - a[0]);
  const [baseWidth, sill, shoulder, hood, hoodWidth] = [1, 2, 3, 4, 5].map(column => stationValue(heroStations, i, column, t));
  const distanceFromAxle = Math.min(...axles.map(axle => Math.abs(z - axle)));
  // Muscular GT-R fender blisters swelling over front and rear wheels
  const fenderSwirl = .018 * Math.exp(-((distanceFromAxle / .48) ** 2));
  const width = baseWidth + fenderSwirl;
  const arch = .372 + .418 * Math.sqrt(Math.max(0, 1 - (distanceFromAxle / .418) ** 2));
  const archFade = 1 - smooth(.384, .434, distanceFromAxle);
  const lowerEdge = mix(sill, arch, archFade);
  const lowSideWidth = mix(width * .898, width * .995, archFade);
  const nearEnd = smooth(2.14, 2.43, Math.abs(z));
  const crown = mix(.025, .012, nearEnd);
  const side = [
    [0, hood + crown], [width * .25, hood + crown * .9],
    [width * .53, hood + crown * .54], [width * hoodWidth, hood],
    [width * .944, mix(hood, shoulder, .38)], [width * .988, mix(hood, shoulder, .76)],
    [width * 1.004, shoulder], [mix(width * .992, lowSideWidth, .11), mix(shoulder, lowerEdge, .32)],
    [mix(width * .958, lowSideWidth, .48), mix(shoulder, lowerEdge, .78)], [lowSideWidth, lowerEdge],
  ];
  return [...side.slice(1).reverse().map(([x, y]) => [-x, y]), ...side].map(([x, y]) =>
    [x, y, z - Math.sign(z) * .095 * nearEnd * (x / width) ** 2]);
}

function heroShell(parent, bodyPaint) {
  const sections = heroStations.flatMap(([start], i) => {
    if (i === heroStations.length - 1) return [heroSection(start)];
    const end = heroStations[i + 1][0];
    const steps = Math.ceil((end - start) / .036);
    return Array.from({ length: steps }, (_, j) => heroSection(mix(start, end, j / steps)));
  });
  const p = sections.flat(2), faces = [];
  const columns = sections[0].length;
  for (let row = 1; row < sections.length; row++) for (let j = 1; j < columns; j++) {
    const a = (row - 1) * columns + j - 1, b = a + columns;
    faces.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const shellMesh = meshFrom(parent, p, faces, bodyPaint);
  for (const row of [0, sections.length - 1]) {
    const ends = sections[row];
    fascia(parent, bodyPaint, ends, row === 0);
  }
  // Underbody chassis tray & recessed dark wheel-arch liners so wheel wells are deep and solid.
  box(parent, intake, 0, .248, -.02, 1.72, .036, 4.38);
  const archLinerGeo = new THREE.CylinderGeometry(.408, .408, .33, 24, 1, false, 0, Math.PI);
  archLinerGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const axle of axles) {
      attach(parent, archLinerGeo, intake, side * .865, .368, axle);
      box(parent, intake, side * .715, .51, axle, .035, .44, .78);
    }
  }
  return shellMesh;
}

function fascia(parent, mat, outline, rear = false) {
  const points = outline.map(([x, y]) => new THREE.Vector2(x, y));
  const triangles = THREE.ShapeUtils.triangulateShape(points, []);
  if (rear) triangles.forEach(triangle => triangle.reverse());
  return meshFrom(parent, outline.flat(), triangles.flat(), mat);
}

function sculptedPatch(parent, mat, cellsX, cellsY, point) {
  const positions = [], faces = [];
  for (let y = 0; y <= cellsY; y++) for (let x = 0; x <= cellsX; x++) {
    positions.push(...point(x / cellsX, y / cellsY));
    if (y && x) {
      const a = (y - 1) * (cellsX + 1) + x - 1, b = a + cellsX + 1;
      faces.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return meshFrom(parent, positions, faces, mat);
}

function lineTrim(parent, mat, points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => vector(...point)));
  return attach(parent, new THREE.TubeGeometry(curve, Math.max(4, points.length * 3), radius, 6, false), mat, 0, 0, 0);
}

function lathe(profile) {
  return new THREE.LatheGeometry(profile.map(([radius, axial]) => new THREE.Vector2(radius, axial)), 48)
    .rotateZ(-Math.PI / 2);
}

const heroTire = lathe([
  [.272, -.121], [.319, -.131], [.344, -.127], [.358, -.112], [.370, -.091],
  [.377, -.066], [.377, -.022], [.374, -.019], [.374, -.013], [.378, -.010],
  [.378, .01], [.374, .013], [.374, .019], [.377, .022], [.377, .066], [.370, .091],
  [.358, .113], [.342, .128], [.314, .133], [.273, .126], [.272, -.121],
]);
const rimLip = lathe([
  [.242, .104], [.246, .132], [.259, .141], [.273, .144], [.278, .134],
  [.274, .121], [.264, .118], [.260, .101], [.242, .104],
]);
const sidewallRidge = lathe([[.321, .132], [.324, .134], [.328, .132], [.324, .131], [.321, .132]]);

// Non-spinning brake caliper & grounded tire contact shadow bracket attached to body.
function makeCaliperHub(parent, side, z) {
  const hub = new THREE.Group();
  hub.position.set(side * .93, .366, z);
  parent.add(hub);
  const isFront = z > 0;
  const calZ = isFront ? -.136 : .132;
  const calY = .042;
  const calTilt = isFront ? .28 : -.26;
  const caliper = new THREE.Group();
  caliper.position.set(side * .096, calY, calZ);
  caliper.rotation.x = calTilt;
  hub.add(caliper);
  // Sculpted 6-piston front / 4-piston rear gold Brembo monoblock caliper
  box(caliper, bremboGold, 0, 0, 0, .046, isFront ? .148 : .128, .068);
  box(caliper, bremboGold, side * .006, isFront ? .054 : .045, -.005, .042, .052, .058);
  box(caliper, bremboGold, side * .006, isFront ? -.054 : -.045, -.005, .042, .052, .058);
  box(caliper, stitchRed, side * .024, 0, .004, .004, .054, .016);
  box(caliper, silver, side * .018, .035, .018, .014, .012, .012);
  box(caliper, silver, side * .018, -.035, .018, .014, .012, .012);
  // Crisp grounded tire contact-patch shadow directly under each wheel (at y = 0.011 in body space)
  const tirePatch = attach(hub, aspectBadge, tireShadowMat, 0, -.355, 0, .38, .66, 1);
  tirePatch.rotation.x = -Math.PI / 2;
  tirePatch.renderOrder = 1;
  return hub;
}

function makeWheel(parent, side, z) {
  const group = new THREE.Group();
  // Grounded wheel center at y = 0.366 (~11mm realistic contact squash for 0.377m outer radius)
  group.position.set(side * .93, .366, z);
  parent.add(group);
  const outward = side < 0 ? Math.PI : 0;
  attach(group, heroTire, rubber, 0, 0, 0).rotation.y = outward;
  attach(group, rimLip, alloy, 0, 0, 0).rotation.y = outward;
  attach(group, sidewallRidge, tireShoulder, 0, 0, 0).rotation.y = outward;
  attach(group, cylinder, intake, side * .033, 0, 0, .276, .151, .276).rotation.z = Math.PI / 2;
  // Large cross-drilled ventilated iron/steel brake rotor + central aluminum bell hat
  attach(group, cylinder, brakeRotor, side * .093, 0, 0, .212, .02, .212).rotation.z = Math.PI / 2;
  attach(group, cylinder, graphite, side * .098, 0, 0, .112, .024, .112).rotation.z = Math.PI / 2;
  attach(group, fineRing, graphite, side * .103, 0, 0, .198, .198, .55).rotation.y = Math.PI / 2;
  for (let j = 0; j < 24; j++) {
    const theta = j * Math.PI / 12;
    for (const r of [.146, .172, .194]) {
      const ang = theta + (r - .146) * 1.4;
      const mark = attach(group, rotorHole, seal, side * .104, r * Math.cos(ang), r * Math.sin(ang), .0055, .0055, 1);
      mark.rotation.y = side * Math.PI / 2;
    }
  }
  // 10-spoke forged RAYS Y-spoke alloy wheel geometry
  const spokeShape = new THREE.Shape();
  [[-.019, .044], [.022, .048], [.041, .232], [.027, .258], [.010, .254], [.012, .168], [-.015, .098]].forEach(([x, y], i) => {
    if (i === 0) spokeShape.moveTo(x, y);
    else spokeShape.lineTo(x, y);
  });
  const spokeGeo = new THREE.ExtrudeGeometry(spokeShape, {
    depth: .014, bevelEnabled: true, bevelThickness: .0045, bevelSize: .0035, bevelSegments: 1
  });
  spokeGeo.rotateY(side * Math.PI / 2);
  for (let j = 0; j < 5; j++) for (const offset of [-.152, .152]) {
    const spoke = attach(group, spokeGeo, alloy, side * .118, 0, 0);
    spoke.rotation.x = j * 2 * Math.PI / 5 + offset;
  }
  attach(group, cylinder, graphite, side * .137, 0, 0, .074, .023, .074).rotation.z = Math.PI / 2;
  attach(group, cylinder, alloy, side * .153, 0, 0, .028, .01, .028).rotation.z = Math.PI / 2;
  attach(group, fineRing, stitchRed, side * .156, 0, 0, .024, .024, .35).rotation.y = Math.PI / 2;
  for (let j = 0; j < 5; j++) {
    const theta = j * 2 * Math.PI / 5;
    const lug = attach(group, cylinder, silver, side * .152, .05 * Math.cos(theta), .05 * Math.sin(theta), .009, .01, .009);
    lug.rotation.z = Math.PI / 2;
  }
  return group;
}

function makeCabin(chassis, bodyPaint) {
  const cabin = new THREE.Group();
  chassis.add(cabin);
  const window = glass.clone();
  window.side = THREE.DoubleSide;
  const rearDeck = u => [.764 * u, .965 - .022 * u * u, -1.62 + .075 * u * u];
  const roofBack = u => [.626 * u, 1.386 - .029 * u * u, -.66 + .042 * u * u];
  const roofFront = u => [.639 * u, 1.414 - .029 * u * u, .34 - .035 * u * u];
  const cowl = u => [.828 * u, .925 - .035 * u * u, 1.086 - .071 * u * u];
  const interpolate = (start, end, t, lift) => start.map((value, i) => mix(value, end[i], t) + (i === 1 ? lift * Math.sin(Math.PI * t) : 0));
  const roof = (u, t) => interpolate(roofBack(u), roofFront(u), t, .042);
  const backlight = (u, t) => interpolate(rearDeck(u), roofBack(u), t, .019);
  const windshield = (u, t) => interpolate(roofFront(u), cowl(u), t, .028);
  const sample = samplePoint => Array.from({ length: 10 }, (_, i) => samplePoint(i / 9));

  sculptedPatch(cabin, bodyPaint, 18, 14, (u, t) => roof(2 * u - 1, t));
  sculptedPatch(cabin, window, 18, 12, (u, t) => backlight(2 * u - 1, t));
  sculptedPatch(cabin, window, 18, 12, (u, t) => windshield(2 * u - 1, t));
  // Subtle roof longitudinal aerodynamic channels
  for (const side of [-1, 1]) {
    lineTrim(cabin, seal, sample(t => {
      const [x, y, z] = roof(side * .82, t);
      return [x, y + .003, z];
    }), .005);
  }
  for (const side of [-1, 1]) {
    const sideTop = t => t < .26 ? backlight(side, .33 + t / .26 * .67)
      : t < .73 ? roof(side, (t - .26) / .47) : windshield(side, (t - .73) / .27);
    const sideBase = t => {
      const z = mix(-1.332, cowl(side)[2], t);
      return [side * mix(.796, .833, t), mix(.920, cowl(side)[1], t), z];
    };
    const sideWindow = (u, v) => {
      const bottom = sideBase(u), top = sideTop(u);
      return [mix(bottom[0], top[0], v) + side * .026 * Math.sin(v * Math.PI) * Math.sin(u * Math.PI),
        mix(bottom[1], top[1], v), mix(bottom[2], top[2], v)];
    };
    sculptedPatch(cabin, window, 31, 8, sideWindow);
    // Crisp window beltline seal & dark chrome upper trim
    lineTrim(cabin, seal, sample(t => sideWindow(t, 0)), .016);
    lineTrim(cabin, bezel, sample(t => sideWindow(t, .02)), .006);
    // Roof rail & sweeping C-pillar in bodyPaint
    lineTrim(cabin, bodyPaint, sample(t => roof(side, t)), .028);
    // Iconic R35 blacked-out A-pillar for the wrap-around "helmet visor / floating roof" look!
    lineTrim(cabin, pillarBlack, sample(t => windshield(side, t)), .036);
    lineTrim(cabin, bodyPaint, sample(t => backlight(side, t)), .043);
    // Flush blacked-out B-pillar and quarter-window divider
    lineTrim(cabin, pillarBlack, sample(t => sideWindow(.37, t)), .024);
    lineTrim(cabin, bodyPaint, [rearDeck(side), sideBase(0), sideTop(0)], .042);
  }
  lineTrim(cabin, seal, sample(t => rearDeck(2 * t - 1)), .012);
  lineTrim(cabin, seal, sample(t => roofBack(2 * t - 1)), .012);
  lineTrim(cabin, pillarBlack, sample(t => roofFront(2 * t - 1)), .015);
  lineTrim(cabin, seal, sample(t => cowl(2 * t - 1)), .016);
  // Windshield wipers resting at cowl base
  lineTrim(cabin, seal, [[-.52, .915, 1.04], [-.06, .936, 1.075], [.22, .922, 1.06]], .007);
  lineTrim(cabin, seal, [[-.08, .918, 1.05], [.38, .934, 1.07], [.68, .914, 1.03]], .007);
  for (let row = 0; row < 9; row++) {
    const t = .1 + row * .085;
    lineTrim(cabin, bezel, Array.from({ length: 6 }, (_, i) => {
      const u = i / 5;
      const [x, y, z] = backlight(mix(-.91, .91, u), t);
      return [x, y + .0018, z - .004];
    }), .0014);
  }
  return cabin;
}

function makeWing(chassis, bodyPaint) {
  const profile = [
    [-2.238, 1.170], [-2.201, 1.196], [-2.078, 1.212], [-1.944, 1.195], [-1.862, 1.161],
    [-1.870, 1.148], [-1.956, 1.154], [-2.098, 1.152], [-2.222, 1.153],
  ];
  const wingPoint = (u, i) => {
    const tip = Math.abs(u) ** 4.5;
    const [z, y] = profile[i];
    return [u * 1.02, y + .033 * tip, z - .044 * tip];
  };
  for (let j = 0; j < profile.length; j++) {
    const next = (j + 1) % profile.length;
    sculptedPatch(chassis, j >= 5 ? carbonMat : bodyPaint, 22, 2, (u, v) => {
      const a = wingPoint(u * 2 - 1, j), b = wingPoint(u * 2 - 1, next);
      return a.map((value, i) => mix(value, b[i], v));
    });
  }
  const wingTip = new THREE.ExtrudeGeometry(new THREE.Shape([
    [-2.302, 1.132], [-2.256, 1.206], [-2.142, 1.264], [-1.950, 1.242], [-1.878, 1.208], [-1.908, 1.132], [-2.156, 1.118],
  ].map(([z, y]) => new THREE.Vector2(-z, y))), {
    depth: .018, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2,
  }).rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    attach(chassis, wingTip, bodyPaint, side * 1.008 - .009, 0, 0);
    lineTrim(chassis, carbonMat, [[side * .64, .95, -2.12], [side * .63, 1.02, -2.078], [side * .625, 1.11, -2.02], [side * .63, 1.162, -1.98]], .04);
    lineTrim(chassis, bodyPaint, [[side * .665, .951, -2.092], [side * .658, 1.024, -2.062], [side * .654, 1.106, -2.011], [side * .652, 1.165, -1.978]], .022);
  }
  // Glowing LED high-mount third brake light integrated into wing trailing edge
  lineTrim(chassis, bumperReflector, [[-.26, 1.157, -2.244], [0, 1.158, -2.247], [.26, 1.157, -2.244]], .011);
}

function makeRear(chassis, brakeLight) {
  const surfaceZ = x => -2.438 + .080 * x * x;
  const rearPanel = (mat, points, depth = 0) => fascia(chassis, mat, points.map(([x, y]) => [x, y, surfaceZ(x) - depth]), true);
  // Sculpted carbon-fiber lower rear diffuser & exhaust tunnels
  rearPanel(carbonMat, [[-.885, .476], [-.682, .428], [-.432, .418], [-.298, .372], [.298, .372], [.432, .418], [.682, .428], [.885, .476],
    [.842, .358], [.722, .282], [.502, .272], [.382, .248], [-.382, .248], [-.502, .272], [-.722, .282], [-.842, .358]], .020);
  rearPanel(ventMetal, [[-.462, .368], [-.334, .318], [.334, .318], [.462, .368], [.394, .268], [.290, .232], [-.290, .232], [-.394, .268]], .033);
  // Lower carbon diffuser outer lip & 7 sharp vertical venturi strakes/fins
  lineTrim(chassis, carbonMat, [[-.85, .285, -2.385], [-.52, .254, -2.435], [0, .246, -2.452], [.52, .254, -2.435], [.85, .285, -2.385]], .018);
  for (const x of [-.36, -.24, -.12, 0, .12, .24, .36]) {
    const diffuserFin = box(chassis, carbonMat, x, .284, -2.426, .022, .096, .182);
    diffuserFin.rotation.x = -.19;
  }
  // Center F1-style rear fog/fourth brake lamp in diffuser
  box(chassis, bumperReflector, 0, .292, -2.464, .092, .034, .022);
  // Recessed license plate pocket & clean English R35 / AFTERGLOW plate
  rearPanel(intake, [[-.292, .692], [-.248, .748], [.248, .748], [.292, .692], [.248, .518], [-.248, .518]], .023);
  rearPanel(ventMetal, [[-.252, .694], [-.228, .720], [.228, .720], [.252, .694], [.218, .544], [-.218, .544]], .032);
  box(chassis, seal, 0, .628, -2.476, .382, .154, .012);
  attach(chassis, aspectBadge, plate, 0, .628, -2.484, .362, .138, 1).rotation.y = Math.PI;
  attach(chassis, aspectBadge, badge, -.315, .804, -2.446, .142, .078, 1).rotation.y = Math.PI;
  // Central Nissan trunk emblem
  attach(chassis, lampDisc, bezel, 0, .788, -2.454, .042, .042, 1).rotation.y = Math.PI;
  attach(chassis, lampDisc, seal, 0, .788, -2.456, .033, .033, 1).rotation.y = Math.PI;
  lineTrim(chassis, silver, [[-.038, .788, -2.46], [0, .788, -2.463], [.038, .788, -2.46]], .008);
  lineTrim(chassis, seal, [[-.918, .722, -2.367], [-.745, .675, -2.411], [-.387, .681, -2.429], [-.236, .716, -2.451],
    [.236, .716, -2.451], [.387, .681, -2.429], [.745, .675, -2.411], [.918, .722, -2.367]], .0065);

  for (const side of [-1, 1]) {
    const mount = (mat, points, depth) => rearPanel(mat, points.map(([x, y]) => [side * x, y]), depth);
    mount(seal, [[.376, .790], [.412, .868], [.540, .896], [.670, .908], [.814, .936], [.926, .902], [.974, .812],
      [.948, .726], [.876, .663], [.705, .641], [.552, .650], [.438, .663], [.387, .718]], .019);
    mount(ventMetal, [[.403, .788], [.445, .851], [.555, .882], [.684, .890], [.805, .912], [.904, .878], [.948, .802],
      [.922, .728], [.861, .680], [.707, .663], [.551, .670], [.455, .688], [.416, .728]], .028);

    // Iconic GT-R quad afterburner ring taillights: outer ring (0.128) noticeably larger than inner ring (0.097)
    for (const [x, y, radius] of [[.544, .773, .097], [.806, .796, .128]]) {
      const z = surfaceZ(x) - .045;
      const angle = Math.PI - side * x * .10;
      const lamp = (geometry, mat, r, axial, offset) => {
        const part = attach(chassis, geometry, mat, side * x, y, z + offset, r, r, axial);
        part.rotation.y = angle;
      };
      lamp(lampDisc, lampLens, radius * 1.14, 1, .006);
      lamp(lampRim, bezel, radius * 1.06, .054, .005);
      lamp(fineRing, silver, radius * 1.09, .035, .002);
      lamp(lampDisc, lampOff, radius * .83, 1, -.002);
      lamp(lampRing, brakeLight, radius * .90, .044, -.013);
      lamp(fineRing, bumperReflector, radius * .66, .062, -.014);
      lamp(lampDisc, reverseLamp, radius * .28, 1, -.011);
      const glow = attach(chassis, aspectBadge, rearGlow, side * x, y, z - .040, radius * 3.25, radius * 3.25, 1);
      glow.rotation.y = angle;
      glow.renderOrder = 3;
    }
    // Side rear bumper air outlets & reflectors
    mount(intake, [[.865, .585], [.945, .612], [.952, .488], [.872, .472]], .022);
    mount(bumperReflector, [[.518, .454], [.742, .490], [.760, .479], [.751, .462], [.528, .434]], .025);
    mount(reverseLamp, [[.308, .479], [.402, .479], [.422, .465], [.401, .447], [.314, .449]], .027);
    // Quad burnt-titanium exhaust tips (metallic outer barrel + rolled lip + blue-tinted burnt-titanium inner ring)
    for (const [x, radius, length] of [[.564, .096, .158], [.762, .100, .148]]) {
      const y = .344;
      attach(chassis, cylinder, exhaustMat, side * x, y, -2.423, radius, length, radius).rotation.x = Math.PI / 2;
      attach(chassis, lampRim, silver, side * x, y, -2.503, radius * .93, radius * .93, .064);
      attach(chassis, lampRing, burntTitanium, side * x, y, -2.506, radius * .86, radius * .86, .052);
      attach(chassis, lampDisc, intake, side * x, y, -2.507, radius * .80, radius * .80, 1).rotation.y = Math.PI;
    }
  }
}

function makeFront(chassis, bodyPaint) {
  const surfaceZ = x => 2.402 - .132 * x * x;
  const frontPanel = (mat, points, depth = 0) => fascia(chassis, mat, points.map(([x, y]) => [x, y, surfaceZ(x) + depth]));
  // Sharper V-motion front grille surround & matte black mesh intakes
  frontPanel(seal, [[-.536, .630], [-.426, .646], [.426, .646], [.536, .630], [.628, .468], [.620, .390], [.546, .334],
    [-.546, .334], [-.620, .390], [-.628, .468]], .006);
  frontPanel(intake, [[-.492, .608], [.492, .608], [.574, .462], [.558, .360], [-.558, .360], [-.574, .462]], .016);
  // Visible front-mount intercooler core behind lower mesh
  frontPanel(alloy, [[-.41, .455], [.41, .455], [.42, .372], [-.42, .372]], .019);
  for (const y of [.382, .402, .422, .442]) {
    lineTrim(chassis, ventMetal, [[-.528, y, 2.390], [-.275, y, 2.421], [.275, y, 2.421], [.528, y, 2.390]], .006);
  }
  // Signature chrome/titanium V-motion bar & central GT-R emblem
  lineTrim(chassis, silver, [[-.526, .602, 2.392], [-.334, .492, 2.418], [0, .481, 2.428], [.334, .492, 2.418], [.526, .602, 2.392]], .020);
  lineTrim(chassis, bodyPaint, [[-.55, .58, 2.386], [-.35, .465, 2.415], [.35, .465, 2.415], [.55, .58, 2.386]], .011);
  attach(chassis, aspectBadge, badge, -.005, .554, 2.428, .120, .060, 1);

  // Aggressive multi-tier carbon-fiber front chin splitter & aero lip
  lineTrim(chassis, carbonMat, [[-.912, .308, 2.135], [-.735, .295, 2.348], [-.465, .284, 2.422], [0, .280, 2.444],
    [.465, .284, 2.422], [.735, .295, 2.348], [.912, .308, 2.135]], .044);
  lineTrim(chassis, carbonMat, [[-.895, .272, 2.155], [-.715, .264, 2.368], [-.445, .258, 2.438], [0, .256, 2.458],
    [.445, .258, 2.438], [.715, .264, 2.368], [.895, .272, 2.155]], .020);
  // Splitter vertical support tie-rods
  for (const side of [-1, 1]) {
    box(chassis, silver, side * .28, .312, 2.432, .012, .058, .014);
  }

  for (const side of [-1, 1]) {
    const mount = (mat, points, depth) => frontPanel(mat, points.map(([x, y]) => [side * x, y]), depth);
    // Side bumper air intakes & carbon canard winglets
    mount(intake, [[.625, .502], [.712, .540], [.866, .552], [.852, .422], [.792, .362], [.622, .372]], .018);
    for (const y of [.418, .452, .486]) lineTrim(chassis, ventMetal,
      [[side * .651, y, 2.368], [side * .742, y, 2.354], [side * .822, y, 2.332]], .008);
    lineTrim(chassis, carbonMat, [[side * .84, .385, 2.31], [side * .935, .412, 2.21], [side * .97, .445, 2.08]], .014);

    // Realistic multi-element LED headlights with signature glowing lightning-bolt DRLs (flush with fender)
    lineTrim(chassis, seal, [[side * .555, .654, 2.364], [side * .728, .672, 2.34], [side * .866, .718, 2.28],
      [side * .932, .758, 2.15], [side * .942, .784, 1.968]], .024);
    // Triple internal LED projector pods
    for (const [px, py, pz, r] of [
      [.635, .668, 2.365, .024], [.745, .688, 2.335, .028], [.846, .726, 2.268, .023]
    ]) {
      attach(chassis, mirrorHousing, lampWhite, side * px, py, pz, r, r * .82, r);
      attach(chassis, fineRing, silver, side * px, py, pz + .010, r * .95, r * .95, .32);
    }
    // Signature R35 zig-zag lightning-bolt LED DRL
    lineTrim(chassis, drlBolt, [
      [side * .558, .656, 2.390],
      [side * .732, .674, 2.368],
      [side * .788, .706, 2.338],
      [side * .868, .718, 2.306],
      [side * .934, .760, 2.172],
      [side * .946, .790, 1.998]
    ], .011);
    // Secondary inner lightning branch
    lineTrim(chassis, lampWhite, [
      [side * .685, .686, 2.356],
      [side * .815, .730, 2.292],
      [side * .904, .768, 2.164]
    ], .0065);
    // Clear sculpted outer headlight cover glass
    lineTrim(chassis, headlightGlass, [[side * .562, .662, 2.386], [side * .735, .682, 2.362], [side * .868, .726, 2.300],
      [side * .936, .766, 2.166], [side * .946, .792, 1.984]], .022);

    lineTrim(chassis, bumperReflector, [[side * .912, .555, 2.305], [side * .942, .564, 2.224], [side * .966, .576, 2.152]], .009);

    // Hood power creases & recessed NACA hood vents
    lineTrim(chassis, bodyPaint, [[side * .58, .922, 1.09], [side * .52, .886, 1.54], [side * .44, .795, 2.06], [side * .36, .668, 2.35]], .013);
    lineTrim(chassis, bodyPaint, [[side * .24, .936, 1.09], [side * .22, .902, 1.56], [side * .19, .818, 2.04]], .009);
    const vent = [[side * .348, .917, 1.102], [side * .498, .910, 1.136], [side * .478, .880, 1.452], [side * .332, .888, 1.412]];
    panel(chassis, side === 1 ? vent.slice().reverse() : vent, intake);
    lineTrim(chassis, carbonMat, [[side * .338, .891, 1.406], [side * .418, .896, 1.314], [side * .488, .913, 1.144]], .010);
    lineTrim(chassis, ventMetal, [[side * .362, .894, 1.365], [side * .442, .901, 1.245]], .007);
  }
}

function makeR35() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // chassis holds the suspended bodywork, cabin and cockpit so drive.js can pitch/roll
  // chassis for suspension while wheels & shadows on body stay planted on the asphalt.
  const chassis = new THREE.Group();
  body.add(chassis);

  const bodyPaint = new THREE.MeshPhysicalMaterial({
    color: 0x1d61c9, roughness: .21, metalness: .58, clearcoat: 1, clearcoatRoughness: .10,
  });

  function setPaint(hexColor) {
    const hex = typeof hexColor === 'string'
      ? parseInt(hexColor.trim().replace(/^#|^0x/i, ''), 16)
      : Number(hexColor);
    if (!Number.isFinite(hex)) return;
    bodyPaint.color.setHex(hex);
    const r = ((hex >> 16) & 255) / 255;
    const g = ((hex >> 8) & 255) / 255;
    const b = (hex & 255) / 255;
    const luma = .2126 * r + .7152 * g + .0722 * b;
    if (luma > .75) {
      // Pearl White / bright metallic silver
      bodyPaint.metalness = .32;
      bodyPaint.roughness = .17;
      bodyPaint.clearcoat = 1;
      bodyPaint.clearcoatRoughness = .07;
    } else if (luma < .12) {
      // Jet Black / deep gloss obsidian
      bodyPaint.metalness = .46;
      bodyPaint.roughness = .15;
      bodyPaint.clearcoat = 1;
      bodyPaint.clearcoatRoughness = .06;
    } else {
      // Bayside Blue, Midnight Purple, Vibrant Red, Gun Metallic, Millennium Jade
      bodyPaint.metalness = .58;
      bodyPaint.roughness = .21;
      bodyPaint.clearcoat = 1;
      bodyPaint.clearcoatRoughness = .10;
    }
    bodyPaint.needsUpdate = true;
  }

  // exterior holds all outside bodywork & glass so setCockpitMode(true) can hide it cleanly
  // while keeping chassis suspension pitch/roll intact for both exterior and cockpit views.
  const exterior = new THREE.Group();
  chassis.add(exterior);

  heroShell(exterior, bodyPaint);
  const cabin = makeCabin(exterior, bodyPaint);
  makeWing(exterior, bodyPaint);
  makeFront(exterior, bodyPaint);

  for (const side of [-1, 1]) {
    // Sculpted side skirts with carbon-fiber lower splitter lip & rear aero winglet
    lineTrim(exterior, seal, [[side * 1.002, .282, -.92], [side * .964, .252, -.71], [side * .948, .244, .07],
      [side * .974, .248, .70], [side * 1.024, .288, .972]], .044);
    lineTrim(exterior, carbonMat, [[side * 1.032, .238, -.935], [side * .996, .222, -.69], [side * .982, .218, .05],
      [side * 1.004, .222, .72], [side * 1.046, .244, .982]], .020);
    lineTrim(exterior, bodyPaint, [[side * 1.012, .304, -.918], [side * .982, .288, -.68], [side * .974, .279, .02],
      [side * .994, .282, .71], [side * 1.028, .304, .972]], .015);
    // Side-skirt rear fin ahead of rear wheel arch
    box(exterior, carbonMat, side * 1.022, .295, -.905, .016, .095, .14);

    // Sharper flank character crease from front fender vent to rear quarter shoulder
    lineTrim(exterior, bodyPaint, [[side * 1.018, .785, .86], [side * .996, .802, .18], [side * 1.022, .832, -.55], [side * 1.055, .872, -1.28]], .012);

    // Iconic GT-R front fender air-extractor vent recess & horizontal fender blade
    box(exterior, intake, side * 1.012, .615, .865, .032, .285, .135);
    box(exterior, carbonMat, side * 1.024, .695, .868, .024, .026, .155);
    box(exterior, bodyPaint, side * 1.026, .635, .868, .024, .032, .152);
    box(exterior, silver, side * 1.028, .668, .875, .018, .016, .048);

    // Door-mounted aerodynamic side mirrors with bodyPaint cap & mirror glass
    lineTrim(exterior, seal, [[side * .847, .886, .56], [side * .951, .933, .57], [side * 1.035, .957, .585]], .034);
    const mirror = attach(exterior, mirrorHousing, bodyPaint, side * 1.034, .983, .57, .154, .060, .114);
    mirror.rotation.y = -side * .18;
    attach(exterior, mirrorHousing, seal, side * 1.035, .978, .525, .135, .052, .080).rotation.y = -side * .17;
    attach(exterior, mirrorHousing, mirrorGlassMat, side * 1.036, .979, .464, .106, .039, .026).rotation.y = -side * .17;
    // Flush R35 silver door handle & door seam line
    attach(exterior, mirrorHousing, silver, side * 1.018, .795, -.535, .017, .018, .114);
    lineTrim(exterior, seal, [[side * 1.031, .811, -.768], [side * 1.028, .711, -.820],
      [side * 1.007, .527, -.792], [side * .968, .354, -.708], [side * .953, .319, -.599]], .0045);

    const archPoints = axle => Array.from({ length: 21 }, (_, i) => {
      const z = axle + .412 * Math.cos(i * Math.PI / 20);
      const [x, y] = heroSection(z).at(-1);
      return [side * (x + .002), y + .001, z];
    });
    for (const axle of axles) lineTrim(exterior, seal, archPoints(axle), .011);
  }

  const brakeLight = new THREE.MeshStandardMaterial({
    color: 0xf92c3b, emissive: 0xff192a, emissiveIntensity: 1.25, roughness: .28
  });
  makeRear(exterior, brakeLight);

  // Wheels & non-spinning Brembo caliper hubs attached directly to body (not chassis)
  const wheels = [];
  const caliperHubs = [];
  for (const side of [-1, 1]) for (const z of axles) {
    wheels.push(makeWheel(body, side, z));
    caliperHubs.push(makeCaliperHub(body, side, z));
  }

  // Tighter, richer dark underbody ambient-occlusion contact shadow at y = 0.014 on body
  const contact = attach(body, aspectBadge, shadowMat, 0, .014, -.02, 2.38, 5.18, 1);
  contact.rotation.x = -Math.PI / 2;
  contact.renderOrder = 1;

  // Complete, Cohesive, Sculpted GT-R R35 Cockpit / Interior (CAM 02)
  const cockpit = new THREE.Group();
  cockpit.visible = false;
  chassis.add(cockpit);

  function setCockpitMode(interior) {
    const inside = Boolean(interior);
    cockpit.visible = inside;
    exterior.visible = !inside;
    cabin.visible = !inside;
  }

  // Keep brake calipers steered with front wheels & auto-sync exterior visibility if cockpit.visible is toggled directly
  const origUpdateMatrixWorld = body.updateMatrixWorld.bind(body);
  body.updateMatrixWorld = function (force) {
    for (let i = 0; i < wheels.length; i++) {
      caliperHubs[i].rotation.y = wheels[i].rotation.y;
    }
    exterior.visible = !cockpit.visible;
    origUpdateMatrixWorld(force);
  };

  // 1. Visible Sculpted Front Hood, Fender Crests, NACA Vents & Wipers beyond the windshield (uses bodyPaint!)
  sculptedPatch(cockpit, bodyPaint, 20, 12, (u, v) => {
    const x = (2 * u - 1) * mix(.85, .74, v);
    const z = mix(1.04, 2.28, v);
    const fenderPeak = .046 * Math.exp(-(((Math.abs(x) - .63) / .17) ** 2)) * (1 - .32 * v);
    const powerBulge = .012 * Math.exp(-(((Math.abs(x) - .24) / .14) ** 2)) * (1 - .4 * v);
    const centerValley = -.012 * Math.exp(-((x / .18) ** 2));
    const y = mix(.926, .718, v ** 1.2) + fenderPeak + powerBulge + centerValley;
    return [x, y, z];
  });
  for (const side of [-1, 1]) {
    // Raised fender ridge creases & inner hood character lines
    lineTrim(cockpit, bodyPaint, [[side * .64, .942, 1.06], [side * .61, .898, 1.54], [side * .54, .814, 2.06]], .016);
    lineTrim(cockpit, bodyPaint, [[side * .33, .926, 1.10], [side * .30, .886, 1.56], [side * .25, .808, 2.04]], .009);
    // Recessed dark NACA hood intake ducts visible on the hood
    const naca = [
      [side * .345, .921, 1.14], [side * .485, .914, 1.18],
      [side * .465, .884, 1.48], [side * .328, .892, 1.44]
    ];
    panel(cockpit, side === 1 ? naca.slice().reverse() : naca, intake);
    lineTrim(cockpit, carbonMat, [[side * .336, .895, 1.43], [side * .408, .902, 1.32], [side * .476, .916, 1.18]], .008);
    // Sleek painted exterior side mirror housing + mirror glass visible outside left/right windows
    lineTrim(cockpit, seal, [[side * .835, .895, .62], [side * .945, .94, .58], [side * 1.028, .962, .58]], .028);
    const extMirror = attach(cockpit, mirrorHousing, bodyPaint, side * 1.032, .982, .57, .152, .060, .112);
    extMirror.rotation.y = -side * .18;
    attach(cockpit, mirrorHousing, seal, side * 1.033, .978, .524, .134, .052, .078).rotation.y = -side * .17;
    attach(cockpit, mirrorHousing, mirrorGlassMat, side * 1.034, .979, .462, .104, .038, .024).rotation.y = -side * .17;
  }
  // Windshield base cowl & twin low-profile aerodynamic wipers
  box(cockpit, seal, 0, .924, 1.02, 1.68, .032, .12);
  lineTrim(cockpit, seal, [[-.56, .936, 1.01], [-.12, .948, 1.045], [.18, .936, 1.03]], .0065);
  lineTrim(cockpit, seal, [[-.08, .934, 1.025], [.36, .946, 1.04], [.68, .930, 1.00]], .0065);

  // 2. True Deep Interior Cabin Floor (y = 0.35), Angled Footwells, Drilled Aluminum Pedals & Seat Bolsters
  box(cockpit, black, 0, .35, .14, 1.66, .036, 1.42);
  // Angled forward footwell firewall kick-panel (sloping from y = 0.35 at z = 0.56 up to y = 0.76 at z = 0.92)
  sculptedPatch(cockpit, black, 8, 4, (u, v) => [
    mix(-.82, .82, u),
    mix(.35, .76, v),
    mix(.56, .92, v)
  ]);
  // Driver & passenger dark Alcantara floor mats with red border stitch
  for (const side of [-1, 1]) {
    box(cockpit, alcantara, side * .425, .372, .22, .52, .012, .62);
    // Sport bucket seat lower thigh cushion & side bolsters (below camera at z = -0.20)
    box(cockpit, alcantara, side * .425, .49, -.08, .48, .11, .52);
    box(cockpit, alcantara, side * .425 - .22, .54, -.08, .08, .14, .50);
    box(cockpit, alcantara, side * .425 + .22, .54, -.08, .08, .14, .50);
  }
  // GT-R drilled aluminum foot pedals in driver footwell (x = -0.425)
  for (const [px, py, pz, pw, ph] of [
    [-.335, .48, .72, .042, .115], // Accelerator pedal
    [-.435, .50, .70, .068, .058], // Brake pedal
    [-.565, .46, .73, .058, .135]  // Left dead-pedal footrest
  ]) {
    const pedalPlate = box(cockpit, silver, px, py, pz, pw, ph, .012);
    pedalPlate.rotation.x = .48;
  }

  // 3. Sculpted, Seamless Curved GT-R Twin-Brow Dashboard, Instrument Binnacle Hood & Knee Bolsters
  // In the real R35 GT-R, the upper Alcantara/leather dashboard pad forms a single continuous
  // "gliding-wing" double-brow that arches OVER the driver's 3-dial gauge cluster (x = -0.425, y = 1.128)
  // and OVER the center NISMO MFD screen (x = +0.06, y = 1.056), while the lower shelf sits cleanly
  // BELOW the gauges (y = 0.922) and MFD (y = 0.892) so nothing ever cuts across or pokes out!
  const dashFrontZ = x => .514
    - .034 * Math.exp(-(((x + .425) / .24) ** 2))
    + .014 * Math.exp(-(((x - .06) / .22) ** 2));

  const dashUpperY = (x, v) => {
    const base = mix(.944, .928, v) + .016 * Math.sin(v * Math.PI) - .014 * (x * x);
    // Smooth arched instrument binnacle hood over x = -0.425
    const binU = clamp((x + .425) / .245, -1, 1);
    const binArch = Math.pow(Math.max(0, 1 - binU * binU), .76);
    const binLift = .186 * binArch * Math.pow(1 - v, 1.35);
    // Integrated center stack MFD hood over x = +0.06
    const mfdU = clamp((x - .06) / .235, -1, 1);
    const mfdArch = Math.pow(Math.max(0, 1 - mfdU * mfdU), .84);
    const mfdLift = .112 * mfdArch * Math.pow(1 - v, 1.25);
    // Sculpted connecting bridge between binnacle & MFD brow around x = -0.18
    const bridgeLift = .062 * Math.exp(-(((x + .18) / .115) ** 2)) * Math.pow(1 - v, 1.3);
    return base + binLift + mfdLift + bridgeLift;
  };

  const upperDashPoint = (u, v) => {
    const x = mix(-.84, .84, u);
    const z = mix(dashFrontZ(x), 1.03, v);
    const y = dashUpperY(x, v);
    return [x, y, z];
  };

  // Continuous upper leather/Alcantara dashboard pad (includes binnacle hood & center MFD hood seamlessly!)
  sculptedPatch(cockpit, alcantara, 48, 12, upperDashPoint);

  // Dark inner hood ceiling liner under the binnacle & MFD brow (gives solid 14mm padded hood thickness)
  const innerDashPoint = (u, v) => {
    const x = mix(-.84, .84, u);
    const z = mix(dashFrontZ(x), .63, v);
    const y = dashUpperY(x, v * .22) - .014;
    return [x, y, z];
  };
  sculptedPatch(cockpit, intake, 48, 5, innerDashPoint);

  // Padded front lip bevel seamlessly joining outer upper dash & inner hood liner along v = 0
  sculptedPatch(cockpit, dashboard, 48, 3, (u, v) => {
    const out = upperDashPoint(u, 0);
    const inn = innerDashPoint(u, 0);
    return [
      mix(inn[0], out[0], v),
      mix(inn[1], out[1], v),
      mix(inn[2], out[2], v) - .005 * Math.sin(v * Math.PI)
    ];
  });

  // Flush red contrast stitching evaluated directly on the sculpted binnacle & dashboard front lip (zero floating!)
  lineTrim(cockpit, stitchRed, Array.from({ length: 41 }, (_, i) => {
    const p = upperDashPoint(.02 + (i / 40) * .96, .016);
    return [p[0], p[1] + .0012, p[2] - .001];
  }), .0024);

  // Curved dark recessed back wall at z = 0.585 strictly below dashUpperY (zero rectangular corners poking out!)
  sculptedPatch(cockpit, intake, 44, 6, (u, v) => {
    const x = mix(-.82, .82, u);
    const topY = dashUpperY(x, .14) - .012;
    const botY = .885;
    return [x, mix(botY, topY, v), .585];
  });

  // Lower dashboard shelf & front fascia (dips cleanly under the gauge cluster & MFD cavity, rises on passenger side)
  const lowerShelfTopY = x => {
    const base = .932 - .012 * (x * x);
    // Dip down to 0.916 under gauge cluster (x = -0.425) and 0.892 under MFD (x = +0.06)
    const clusterPocket = -.016 * Math.exp(-(((x + .425) / .21) ** 2));
    const mfdPocket = -.042 * Math.exp(-(((x - .06) / .20) ** 2));
    return base + clusterPocket + mfdPocket;
  };
  // Horizontal recess floor shelf extending from front fascia (z = 0.495) back to cavity wall (z = 0.588)
  sculptedPatch(cockpit, intake, 40, 4, (u, v) => {
    const x = mix(-.82, .82, u);
    return [x, lowerShelfTopY(x), mix(.492, .588, v)];
  });
  // Sculpted front lower dashboard fascia & padded knee bolsters (y = 0.80..lowerShelfTopY)
  sculptedPatch(cockpit, dashboard, 40, 6, (u, v) => {
    const x = mix(-.84, .84, u);
    const topY = lowerShelfTopY(x);
    const colArch = .052 * Math.exp(-(((x + .425) / .13) ** 2));
    const botY = .802 + colArch;
    const y = mix(botY, topY, v);
    const z = .495 - .012 * Math.sin(v * Math.PI) + (1 - v) * .022;
    return [x, y, z];
  });
  // Deep knee-bolster & glovebox under-panel sloping forward into the footwell (y = 0.66..0.80)
  sculptedPatch(cockpit, alcantara, 32, 5, (u, v) => {
    const x = mix(-.82, .82, u);
    const colArch = .052 * Math.exp(-(((x + .425) / .13) ** 2));
    const topY = .802 + colArch;
    return [x, mix(.66, topY, v), mix(.68, .517, v)];
  });

  // Dashboard circular brushed-silver turbine air vents (driver right, center-right, passenger left)
  for (const [vx, vy, vz] of [[-.73, .886, .490], [-.18, .894, .492], [.285, .888, .492], [.71, .882, .492]]) {
    attach(cockpit, lampRim, silver, vx, vy, vz, .026, .026, .020).rotation.y = Math.PI;
    attach(cockpit, lampDisc, intake, vx, vy, vz + .002, .023, .023, 1).rotation.y = Math.PI;
    box(cockpit, silver, vx, vy, vz - .001, .036, .004, .006);
  }

  // 5. Integrated GT-R Waterfall Center Console, Flush NISMO MFD, 3 Climate Dials & R-Mode Toggles (x = +0.06)
  // Sculpted carbon-fiber center stack housing cheeks inside the dashboard center brow (y = 0.89..1.04)
  sculptedPatch(cockpit, carbonMat, 16, 6, (u, v) => {
    const x = mix(-.105, .225, u);
    const topY = dashUpperY(x, .08) - .013;
    const y = mix(.892, topY, v);
    const z = mix(.542, .574, v);
    return [x, y, z];
  });
  // Satin-silver side garnish spears framing the center MFD & waterfall stack
  for (const sx of [-.108, .228]) {
    lineTrim(cockpit, silver, [
      [sx, 1.018, .558], [sx, .895, .536], [sx, .785, .432], [sx * .88 + .006, .765, .18]
    ], .0065);
  }

  // Angled carbon-fiber waterfall control stack sloping from below MFD (y = 0.90, z = 0.54) to tunnel (y = 0.78, z = 0.43)
  const waterfall = new THREE.Group();
  waterfall.position.set(.06, .842, .488);
  waterfall.rotation.x = -.62;
  cockpit.add(waterfall);
  box(waterfall, carbonMat, 0, 0, 0, .318, .156, .024);
  box(waterfall, graphite, 0, .052, -.011, .286, .026, .008);
  // GT-R iconic 3 metallic rotary climate control dials (middle row of waterfall)
  for (const dx of [-.088, 0, .088]) {
    attach(waterfall, cylinder, silver, dx, .006, -.016, .022, .014, .022).rotation.x = Math.PI / 2;
    attach(waterfall, cylinder, intake, dx, .006, -.020, .016, .010, .016).rotation.x = Math.PI / 2;
    box(waterfall, silver, dx, .006, -.024, .005, .022, .006);
  }
  // GT-R signature 3 R-Mode setup toggle switches (TRANS, SUSP, VDC-R) in brushed-silver bezel with glowing LED dots
  box(waterfall, silver, 0, -.046, -.012, .264, .042, .008);
  box(waterfall, intake, 0, -.046, -.015, .248, .032, .006);
  for (const [tx, ledMat] of [[-.076, ledAmber], [0, ledAmber], [.076, startBtnRed]]) {
    // Tiny illuminated R-Mode status LED above toggle
    attach(waterfall, lampDisc, ledMat, tx, -.035, -.019, .0042, .0042, 1).rotation.y = Math.PI;
    // Sculpted metallic toggle switch lever & divider fins
    box(waterfall, silver, tx, -.050, -.021, .014, .016, .014);
    box(waterfall, silver, tx - .038, -.046, -.017, .004, .030, .010);
  }
  box(waterfall, silver, .114, -.046, -.017, .004, .030, .010);

  // Contoured center tunnel (y = 0.60..0.78, z = -0.28..0.46) with padded leather bolsters & carbon shift deck
  box(cockpit, alcantara, .055, .64, .08, .28, .26, .76);
  sculptedPatch(cockpit, carbonMat, 10, 14, (u, v) => {
    const x = mix(-.068, .178, u);
    const z = mix(-.22, .445, v);
    const y = mix(.762, .782, v) + .005 * Math.sin(u * Math.PI);
    return [x, y, z];
  });
  // Padded leather knee bolsters & red stitching along both sides of center tunnel
  for (const side of [-1, 1]) {
    const bx = .055 + side * .128;
    lineTrim(cockpit, alcantara, [[bx, .755, -.24], [bx, .768, .12], [bx, .782, .44]], .018);
    lineTrim(cockpit, stitchRed, [[bx - side * .008, .774, -.22], [bx - side * .008, .786, .12], [bx - side * .008, .798, .43]], .0024);
  }
  // Glowing red ENGINE START/STOP button on driver side of center console deck
  attach(cockpit, cylinder, silver, -.018, .784, .372, .019, .010, .019);
  attach(cockpit, cylinder, startBtnRed, -.018, .787, .372, .0145, .012, .0145);
  // Dual-clutch GT-R gear shifter with silver surround bezel, dark leather boot & sculpted shift knob
  attach(cockpit, cylinder, silver, .058, .778, .275, .048, .008, .048);
  attach(cockpit, cylinder, intake, .058, .781, .275, .041, .009, .041);
  attach(cockpit, new THREE.CylinderGeometry(.016, .038, .048, 18), alcantara, .058, .804, .275);
  attach(cockpit, cylinder, silver, .058, .836, .275, .010, .042, .010);
  box(cockpit, alcantara, .058, .862, .278, .038, .028, .050);
  box(cockpit, silver, .058, .875, .278, .024, .006, .042);
  lineTrim(cockpit, stitchRed, [[.042, .868, .256], [.042, .868, .298]], .0018);
  // Rotary NISMO display commander dial & padded center armrest behind shifter
  attach(cockpit, cylinder, silver, .055, .778, .155, .020, .016, .020);
  attach(cockpit, cylinder, black, .055, .784, .155, .015, .018, .015);
  box(cockpit, alcantara, .055, .805, -.07, .21, .055, .24);
  lineTrim(cockpit, stitchRed, [[-.042, .833, -.18], [-.042, .833, .04]], .0022);
  lineTrim(cockpit, stitchRed, [[.152, .833, -.18], [.152, .833, .04]], .0022);

  // 6. Contoured Door Cards, Dark A-Pillars, Headliner & Sleek Frameless Rearview Mirror
  box(cockpit, alcantara, 0, 1.525, -.12, 1.42, .048, .96);
  box(cockpit, pillarBlack, 0, 1.495, .385, 1.40, .056, .12);
  // Sun visors with subtle vanity seam
  for (const vx of [-.37, .37]) {
    box(cockpit, alcantara, vx, 1.462, .355, .33, .016, .10);
  }
  // Sleek, compact, frameless-style rearview mirror tucked high near header (y = 1.39, width 0.21, height 0.052)
  box(cockpit, pillarBlack, 0, 1.442, .505, .016, .068, .024);
  box(cockpit, pillarBlack, 0, 1.390, .490, .214, .054, .018);
  attach(cockpit, aspectBadge, mirrorGlassMat, 0, 1.390, .480, .206, .048, 1).rotation.y = Math.PI;

  for (const side of [-1, 1]) {
    // Full-depth contoured interior door panel from floor (y = 0.38) up to window beltline (y = 0.93)
    box(cockpit, dashboard, .845 * side, .64, .04, .075, .52, 1.24);
    // Padded Alcantara upper door shoulder sill & red contrast stitch line
    box(cockpit, alcantara, .835 * side, .905, .04, .088, .065, 1.22);
    lineTrim(cockpit, stitchRed, [[.792 * side, .922, -.48], [.792 * side, .926, .05], [.796 * side, .932, .52]], .0025);
    // Sculpted door armrest, brushed-silver interior pull handle & circular Bose speaker grille
    box(cockpit, alcantara, .795 * side, .755, -.02, .055, .042, .48);
    lineTrim(cockpit, silver, [[.785 * side, .835, .10], [.775 * side, .835, .22], [.792 * side, .835, .28]], .007);
    attach(cockpit, cylinder, graphite, .805 * side, .56, .34, .072, .012, .072).rotation.z = Math.PI / 2;
    attach(cockpit, fineRing, silver, .800 * side, .56, .34, .070, .070, .35).rotation.y = Math.PI / 2;
    // Sleek dark A-pillar seamlessly connecting dashboard corner to curved windshield header
    const base = vector(.815 * side, .925, 1.01);
    const top = vector(.675 * side, 1.495, .365);
    const midpoint = base.clone().lerp(top, .5);
    const pillar = box(cockpit, pillarBlack, midpoint.x, midpoint.y, midpoint.z, .058, .072, base.distanceTo(top));
    pillar.quaternion.setFromUnitVectors(vector(0, 0, 1), top.clone().sub(base).normalize());
  }

  // 7. Full, Unobstructed GT-R Sport Steering Wheel (x = -0.425, y = 0.945, z = 0.39, rotation.x = -0.24)
  // Stationary steering column shroud & control stalks behind the wheel connecting cleanly into dashboard
  const colShroud = attach(cockpit, new THREE.CylinderGeometry(.052, .064, .17, 20), dashboard, -.425, .925, .465);
  colShroud.rotation.x = Math.PI / 2 - .24;
  // Turn signal & wiper control stalks on column shroud
  for (const side of [-1, 1]) {
    const stalk = attach(cockpit, cylinder, black, -.425 + side * .068, .938, .432, .0075, .062, .0075);
    stalk.rotation.z = Math.PI / 2 - side * .22;
  }

  const steering = new THREE.Group();
  steering.position.set(-.425, .945, .39);
  steering.rotation.x = -.24;
  cockpit.add(steering);
  // Sculpted D-shaped flat-bottom leather rim using closed Catmull-Rom tube (wide open upper arch for gauges!)
  const rimPts = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const rx = Math.cos(a) * .196;
    let ry = Math.sin(a) * .196;
    if (ry < -.138) ry = mix(ry, -.138, .82); // Crisp D-shaped flat bottom section
    // Subtle ergonomic thumb-rest swell at 10 & 2 o'clock
    const thumbSwell = 1 + .028 * Math.exp(-(((Math.abs(a - Math.PI * .5) - Math.PI * .32) / .14) ** 2));
    return vector(rx * thumbSwell, ry, 0);
  });
  const rimCurve = new THREE.CatmullRomCurve3(rimPts, true);
  attach(steering, new THREE.TubeGeometry(rimCurve, 64, .0225, 14, true), alcantara, 0, 0, 0);
  // Flush red 12 o'clock centering band curved smoothly along the top arc of the rim
  const stripeCurve = new THREE.CatmullRomCurve3([
    vector(-.016, .1953, 0), vector(0, .196, 0), vector(.016, .1953, 0)
  ]);
  attach(steering, new THREE.TubeGeometry(stripeCurve, 8, .0234, 12, false), stitchRed, 0, 0, 0);

  // 3 Brushed-silver sculpted spokes (angled slightly below center so the upper half is 100% unobstructed)
  for (const side of [-1, 1]) {
    const spoke = box(steering, silver, side * .108, -.016, -.004, .135, .036, .022);
    spoke.rotation.z = -side * .08;
    // Dark multifunction thumb switch pod with metallic rocker controls
    const pod = box(steering, black, side * .112, -.012, -.012, .058, .038, .020);
    pod.rotation.z = -side * .08;
    box(steering, silver, side * .112, -.005, -.023, .036, .005, .004);
    box(steering, silver, side * .112, -.019, -.023, .036, .005, .004);
    box(steering, stitchRed, side * .094, -.012, -.023, .007, .012, .004);
    // Crisp brushed-aluminum paddle shifters (- left downshift, + right upshift) behind the rim
    const paddle = box(steering, silver, side * .132, .032, .026, .034, .118, .007);
    paddle.rotation.z = -side * .12;
    box(steering, stitchRed, side * .134, .038, .021, .012, .0035, .003);
    if (side === 1) box(steering, stitchRed, side * .134, .038, .021, .0035, .012, .003);
  }
  // Twin-slotted GT-R brushed-silver vertical bottom spoke
  for (const side of [-1, 1]) {
    const lowSpoke = box(steering, silver, side * .018, -.088, -.004, .018, .118, .022);
    lowSpoke.rotation.z = side * .05;
  }
  box(steering, intake, 0, -.092, -.006, .016, .086, .018);
  box(steering, silver, 0, -.136, -.004, .056, .022, .022);

  // Sculpted center airbag hub, silver bezel ring & GT-R emblem facing driver
  attach(steering, cylinder, graphite, 0, -.010, .010, .056, .036, .056).rotation.x = Math.PI / 2;
  attach(steering, cylinder, alcantara, 0, -.010, -.012, .062, .026, .062).rotation.x = Math.PI / 2;
  attach(steering, fineRing, silver, 0, -.010, -.026, .052, .052, .35);
  attach(steering, aspectBadge, badge, 0, -.010, -.028, .054, .029, 1).rotation.y = Math.PI;

  // 8. Live 3D Instrument Cluster (512x160 canvas texture, contoured 3-pod shape recessed at y = 1.012, z = 0.548)
  const clusterCanvas = document.createElement('canvas');
  clusterCanvas.width = 512;
  clusterCanvas.height = 160;
  const clusterCtx = clusterCanvas.getContext('2d');
  const clusterTex = new THREE.CanvasTexture(clusterCanvas);
  clusterTex.colorSpace = THREE.SRGBColorSpace;
  const clusterMat = new THREE.MeshBasicMaterial({ map: clusterTex, transparent: true, toneMapped: false });
  const clusterMesh = attach(cockpit, aspectBadge, clusterMat, -.425, 1.012, .548, .392, .124, 1);
  clusterMesh.rotation.order = 'YXZ';
  clusterMesh.rotation.y = Math.PI;
  clusterMesh.rotation.x = -.15;

  // 9. Recessed Flush NISMO MFD Telemetry Screen (320x180 canvas texture, unified group angled toward driver)
  const mfdCanvas = document.createElement('canvas');
  mfdCanvas.width = 320;
  mfdCanvas.height = 180;
  const mfdCtx = mfdCanvas.getContext('2d');
  const mfdTex = new THREE.CanvasTexture(mfdCanvas);
  mfdTex.colorSpace = THREE.SRGBColorSpace;
  const mfdMat = new THREE.MeshBasicMaterial({ map: mfdTex, toneMapped: false });
  const mfdGroup = new THREE.Group();
  mfdGroup.position.set(.06, .964, .556);
  mfdGroup.rotation.order = 'YXZ';
  mfdGroup.rotation.y = .10;
  mfdGroup.rotation.x = .13;
  cockpit.add(mfdGroup);
  // Sleek beveled satin-silver & dark carbon MFD frame recessed inside the center stack hood
  box(mfdGroup, silver, 0, 0, .005, .284, .154, .016);
  box(mfdGroup, pillarBlack, 0, 0, .002, .272, .144, .016);
  const mfdMesh = attach(mfdGroup, aspectBadge, mfdMat, 0, 0, -.007, .258, .134, 1);
  mfdMesh.rotation.y = Math.PI;

  let lastClusterDraw = -Infinity;
  let lastSpeed = -1;
  let lastRevs = -1;
  let lastGear = '';
  let lastSteer = -99;

  function drawClusterAndMfd(speedKmh, revs, gearLabel, steerNorm) {
    const ctx = clusterCtx;
    const w = 512, h = 160;
    ctx.clearRect(0, 0, w, h);

    // Contoured 3-pod instrument cluster housing silhouette (zero rectangular corners!)
    const sx = 112, sy = 88, sr = 54;
    const tx = 256, ty = 82, tr = 66;
    const rx = 400, ry = 88, rr = 54;

    ctx.fillStyle = '#090c13';
    ctx.beginPath();
    ctx.arc(sx, sy, sr + 8, 0, Math.PI * 2);
    ctx.arc(tx, ty, tr + 9, 0, Math.PI * 2);
    ctx.arc(rx, ry, rr + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx, 42, rx - sx, 98);

    const startAng = Math.PI * .75;
    const endAng = Math.PI * 2.25;
    const sweep = endAng - startAng;

    // 1. LEFT DIAL: Speedometer (0 - 320 km/h) with metallic bezel ring
    ctx.beginPath();
    ctx.arc(sx, sy, sr + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#101521';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#60708a';
    ctx.stroke();

    const speedFrac = clamp(speedKmh / 320, 0, 1);
    ctx.beginPath();
    ctx.arc(sx, sy, sr - 5, startAng, startAng + sweep * speedFrac);
    ctx.strokeStyle = '#38b6ff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let s = 0; s <= 320; s += 40) {
      const a = startAng + (s / 320) * sweep;
      const c = Math.cos(a), sn = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(sx + c * (sr - 9), sy + sn * (sr - 9));
      ctx.lineTo(sx + c * (sr - 2), sy + sn * (sr - 2));
      ctx.strokeStyle = '#c8d6eb';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#a9bdd8';
      ctx.fillText(String(s), sx + c * (sr - 19), sy + sn * (sr - 19));
    }
    // Live speedometer needle
    const sAng = startAng + speedFrac * sweep;
    ctx.beginPath();
    ctx.moveTo(sx - Math.cos(sAng) * 8, sy - Math.sin(sAng) * 8);
    ctx.lineTo(sx + Math.cos(sAng) * (sr - 8), sy + Math.sin(sAng) * (sr - 8));
    ctx.strokeStyle = '#ff5a36';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#333e54';
    ctx.fill();
    ctx.fillStyle = '#8aa2c4';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('KM/H', sx, sy + 28);

    // 2. CENTER DIAL: Iconic GT-R Tachometer (0 - 9000 RPM, redline at 7000)
    ctx.beginPath();
    ctx.arc(tx, ty, tr + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#131926';
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#7e90ad';
    ctx.stroke();

    // Redline arc (7000 - 9000 RPM)
    const redStart = startAng + (7 / 9) * sweep;
    ctx.beginPath();
    ctx.arc(tx, ty, tr - 6, redStart, endAng);
    ctx.strokeStyle = '#ff2638';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Active RPM glow arc
    const rpmFrac = clamp(revs / 9000, 0, 1);
    ctx.beginPath();
    ctx.arc(tx, ty, tr - 6, startAng, startAng + rpmFrac * sweep);
    ctx.strokeStyle = revs >= 6800 ? '#ff2e43' : '#ff8c3b';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    ctx.font = 'bold 12px sans-serif';
    for (let r = 0; r <= 9; r++) {
      const a = startAng + (r / 9) * sweep;
      const c = Math.cos(a), sn = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(tx + c * (tr - 12), ty + sn * (tr - 12));
      ctx.lineTo(tx + c * (tr - 2), ty + sn * (tr - 2));
      ctx.strokeStyle = r >= 7 ? '#ff3b4b' : '#e8eef7';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = r >= 7 ? '#ff4d5b' : '#dbe5f5';
      ctx.fillText(String(r), tx + c * (tr - 23), ty + sn * (tr - 23));
    }

    // Center GT-R branding & digital Gear indicator window inside tach
    ctx.fillStyle = '#9db2d1';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('x1000 r/min', tx, ty - 22);
    ctx.fillStyle = revs >= 6900 ? '#ff2e43' : '#1b2233';
    ctx.fillRect(tx - 17, ty + 14, 34, 28);
    ctx.strokeStyle = '#5e76a1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx - 17, ty + 14, 34, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(String(gearLabel), tx, ty + 29);

    // Live glowing tachometer needle
    const tAng = startAng + rpmFrac * sweep;
    ctx.save();
    ctx.shadowColor = '#ff3b2f';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(tx - Math.cos(tAng) * 10, ty - Math.sin(tAng) * 10);
    ctx.lineTo(tx + Math.cos(tAng) * (tr - 9), ty + Math.sin(tAng) * (tr - 9));
    ctx.strokeStyle = '#ff3b2f';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(tx, ty, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#38445c';
    ctx.fill();

    // 3. RIGHT PANEL: Digital Speed + Boost + Gear Display with metallic bezel ring
    ctx.beginPath();
    ctx.arc(rx, ry, rr + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#101521';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#60708a';
    ctx.stroke();

    // Digital speed readout
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 25px monospace';
    ctx.fillText(String(Math.round(speedKmh)).padStart(3, '0'), rx, ry - 10);
    ctx.fillStyle = '#5ec2ff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('KM/H · ATTESA', rx, ry + 8);

    // Boost bar graph inside right dial
    const boost = clamp((revs - 1400) / 5600, 0, 1) * (.45 + .55 * speedFrac);
    ctx.fillStyle = '#1c2538';
    ctx.fillRect(rx - 32, ry + 18, 64, 8);
    ctx.fillStyle = boost > .8 ? '#ff4f3b' : '#f79b3e';
    ctx.fillRect(rx - 32, ry + 18, 64 * boost, 8);
    ctx.fillStyle = '#a3b8d6';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText(`BOOST ${(boost * 1.4).toFixed(1)} BAR`, rx, ry + 35);

    clusterTex.needsUpdate = true;

    // Update Center MFD Telemetry Screen
    const m = mfdCtx;
    const mw = 320, mh = 180;
    m.fillStyle = '#0b1018';
    m.fillRect(0, 0, mw, mh);
    m.fillStyle = '#182436';
    m.fillRect(0, 0, mw, 22);
    m.fillStyle = '#ff3b3b';
    m.fillRect(0, 21, mw, 2);
    m.fillStyle = '#d7e3f5';
    m.font = 'bold 11px sans-serif';
    m.textAlign = 'left';
    m.fillText('NISMO TELEMETRY · MFD', 10, 14);
    m.textAlign = 'right';
    m.fillStyle = '#5ec2ff';
    m.fillText(`GEAR ${gearLabel} · ${Math.round(speedKmh)} KM/H`, mw - 10, 14);

    // MFD 3-gauge row (Turbo Boost, Oil Temp, G-Force lateral meter)
    const gauges = [
      ['BOOST', `${(boost * 1.45).toFixed(2)} bar`, boost, '#f79b3e', 56],
      ['ENG OIL', `${Math.round(92 + boost * 18)} °C`, .62 + boost * .22, '#38b6ff', 160],
      ['G-FORCE', `${(Math.abs(steerNorm) * 1.15).toFixed(2)} G`, Math.min(1, Math.abs(steerNorm)), '#ff4a5a', 264]
    ];
    m.textAlign = 'center';
    for (const [label, val, frac, col, gx] of gauges) {
      m.beginPath();
      m.arc(gx, 86, 36, Math.PI * .75, Math.PI * 2.25);
      m.strokeStyle = '#223047';
      m.lineWidth = 6;
      m.stroke();
      m.beginPath();
      m.arc(gx, 86, 36, Math.PI * .75, Math.PI * .75 + Math.PI * 1.5 * clamp(frac, .04, 1));
      m.strokeStyle = col;
      m.lineWidth = 6;
      m.stroke();
      m.fillStyle = '#9bb0cc';
      m.font = 'bold 10px sans-serif';
      m.fillText(label, gx, 80);
      m.fillStyle = '#ffffff';
      m.font = 'bold 12px monospace';
      m.fillText(val, gx, 97);
    }
    // Lower throttle / torque split bar
    m.fillStyle = '#172234';
    m.fillRect(14, 142, mw - 28, 12);
    m.fillStyle = '#38b6ff';
    m.fillRect(14, 142, (mw - 28) * clamp(revs / 7400, .05, 1), 12);
    m.fillStyle = '#a3b8d4';
    m.font = 'bold 10px sans-serif';
    m.textAlign = 'left';
    m.fillText('ATTESA E-TS AWD TORQUE', 14, 136);
    m.textAlign = 'right';
    m.fillText(`${Math.round(revs)} RPM`, mw - 14, 136);
    mfdTex.needsUpdate = true;
  }

  function updateInterior(speedKmh = 0, revs = 900, gearLabel = 'N', steerNorm = 0) {
    const now = performance.now();
    const g = String(gearLabel || 'N');
    if (
      now - lastClusterDraw < 45 &&
      g === lastGear &&
      Math.abs(speedKmh - lastSpeed) < 1 &&
      Math.abs(revs - lastRevs) < 40
    ) {
      return;
    }
    lastClusterDraw = now;
    lastSpeed = speedKmh;
    lastRevs = revs;
    lastGear = g;
    lastSteer = steerNorm;
    drawClusterAndMfd(speedKmh, revs, g, steerNorm);
  }

  // Initial draw so the gauges are crisp immediately upon entering cockpit view
  updateInterior(0, 900, 'N', 0);

  for (const group of [...wheels, ...caliperHubs, cabin, steering, waterfall, mfdGroup, cockpit, exterior, chassis, body]) batchPanels(group);
  for (const group of [body, chassis, exterior, cabin, ...wheels, ...caliperHubs]) for (const part of group.children) {
    if (!part.isMesh || part.material.isMeshBasicMaterial || part.material.emissive?.getHex()) continue;
    part.castShadow = true;
    part.receiveShadow = true;
  }
  scene.add(root);
  return { root, body, chassis, wheels, cockpit, cabin, steering, brakeLight, setPaint, updateInterior, setCockpitMode };
}

const trafficColors = [0xaaaeb3, 0x433c47, 0x344e53, 0x905044, 0xb4a397, 0x4c5980];
function makeTraffic(i) {
  const root = new THREE.Group();
  const car = new THREE.Group();
  root.add(car);
  const suv = i % 3 === 1;
  const height = suv ? .16 : 0;
  const color = trafficPaint(trafficColors[i % trafficColors.length]);
  color.side = THREE.DoubleSide;
  shell(car, [[-2.15, .86, .31, .66, .76 + height, .9], [-1.86, .94, .28, .75, .83 + height, .91],
    [-.9, .94, .27, .77, .83 + height, .91], [.7, .92, .26, .74, .81 + height, .89],
    [1.87, .9, .29, .61, .71, .93], [2.12, .81, .31, .55, .63, .93]], color);
  const cabinMat = glass.clone();
  cabinMat.side = THREE.DoubleSide;
  const leftRear = [-.76, .84 + height, suv ? -1.84 : -1.55], rightRear = [.76, .84 + height, leftRear[2]];
  const leftFront = [-.76, .785 + height, .96], rightFront = [.76, .785 + height, .96];
  const roofLR = [-.64, 1.29 + height, suv ? -1.54 : -.79], roofRR = [.64, 1.29 + height, roofLR[2]];
  const roofLF = [-.62, 1.3 + height, .37], roofRF = [.62, 1.3 + height, .37];
  panel(car, [leftRear, rightRear, roofRR, roofLR], cabinMat);
  panel(car, [rightRear, rightFront, roofRF, roofRR], cabinMat);
  panel(car, [leftFront, leftRear, roofLR, roofLF], cabinMat);
  panel(car, [rightFront, leftFront, roofLF, roofRF], cabinMat);
  panel(car, [roofLR, roofRR, roofRF, roofLF], color);
  const led = new THREE.MeshStandardMaterial({ color: 0xff2532, emissive: 0xd01827, emissiveIntensity: 1.24 });
  for (const side of [-1, 1]) {
    for (const z of [-1.41, 1.36]) {
      // Grounded traffic wheels: tireGeo scaled by 0.9 has outer radius 0.3303 -> center at y = 0.322
      attach(car, tireGeo, rubber, side * .84, .322, z, .9, .9, .9).rotation.z = Math.PI / 2;
      attach(car, cylinder, alloy, side * .97, .322, z, .22, .031, .22).rotation.z = Math.PI / 2;
      const patch = attach(root, aspectBadge, tireShadowMat, side * .84, .011, z, .34, .58, 1);
      patch.rotation.x = -Math.PI / 2;
      patch.renderOrder = 1;
    }
    box(car, led, side * .657, .66 + height * .45, -2.098, .387, .08, .1).rotation.y = -side * .21;
    box(car, lampWhite, side * .704, .595, 2.032, .32, .057, .051);
  }
  box(car, black, 0, .35, -2.156, 1.5, .098, .042);
  box(car, silver, 0, .537, -2.159, .27, .107, .022);
  // Grounded traffic underbody contact shadow at y = 0.014
  const contact = attach(root, aspectBadge, shadowMat, 0, .014, 0, 2.28, 4.78, 1);
  contact.rotation.x = -Math.PI / 2;
  contact.renderOrder = 1;
  batchPanels(car);
  for (const part of car.children) {
    if (!part.isMesh || part.material.emissive?.getHex()) continue;
    part.castShadow = true;
    part.receiveShadow = true;
  }
  scene.add(root);
  return { root, lane: 0, z: 0, speed: 0, brakeLight: led };
}
