const black = material(0x131722, .62);
const rubber = material(0x18191e, .91);
const alloy = material(0xb8c3d0, .24, .84);
const graphite = material(0x353c47, .34, .62);
const silver = material(0xd2dbe0, .18, .82);
const dashboard = material(0x1e2028, .86);
const alcantara = material(0x171920, .92, .05);
const stitchRed = material(0xd9322a, .48, .16);
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

  heroShell(chassis, bodyPaint);
  const cabin = makeCabin(chassis, bodyPaint);
  makeWing(chassis, bodyPaint);
  makeFront(chassis, bodyPaint);

  for (const side of [-1, 1]) {
    // Sculpted side skirts with carbon-fiber lower splitter lip & rear aero winglet
    lineTrim(chassis, seal, [[side * 1.002, .282, -.92], [side * .964, .252, -.71], [side * .948, .244, .07],
      [side * .974, .248, .70], [side * 1.024, .288, .972]], .044);
    lineTrim(chassis, carbonMat, [[side * 1.032, .238, -.935], [side * .996, .222, -.69], [side * .982, .218, .05],
      [side * 1.004, .222, .72], [side * 1.046, .244, .982]], .020);
    lineTrim(chassis, bodyPaint, [[side * 1.012, .304, -.918], [side * .982, .288, -.68], [side * .974, .279, .02],
      [side * .994, .282, .71], [side * 1.028, .304, .972]], .015);
    // Side-skirt rear fin ahead of rear wheel arch
    box(chassis, carbonMat, side * 1.022, .295, -.905, .016, .095, .14);

    // Sharper flank character crease from front fender vent to rear quarter shoulder
    lineTrim(chassis, bodyPaint, [[side * 1.018, .785, .86], [side * .996, .802, .18], [side * 1.022, .832, -.55], [side * 1.055, .872, -1.28]], .012);

    // Iconic GT-R front fender air-extractor vent recess & horizontal fender blade
    box(chassis, intake, side * 1.012, .615, .865, .032, .285, .135);
    box(chassis, carbonMat, side * 1.024, .695, .868, .024, .026, .155);
    box(chassis, bodyPaint, side * 1.026, .635, .868, .024, .032, .152);
    box(chassis, silver, side * 1.028, .668, .875, .018, .016, .048);

    // Door-mounted aerodynamic side mirrors with bodyPaint cap & mirror glass
    lineTrim(chassis, seal, [[side * .847, .886, .56], [side * .951, .933, .57], [side * 1.035, .957, .585]], .034);
    const mirror = attach(chassis, mirrorHousing, bodyPaint, side * 1.034, .983, .57, .154, .060, .114);
    mirror.rotation.y = -side * .18;
    attach(chassis, mirrorHousing, seal, side * 1.035, .978, .525, .135, .052, .080).rotation.y = -side * .17;
    attach(chassis, mirrorHousing, mirrorGlassMat, side * 1.036, .979, .464, .106, .039, .026).rotation.y = -side * .17;
    // Flush R35 silver door handle & door seam line
    attach(chassis, mirrorHousing, silver, side * 1.018, .795, -.535, .017, .018, .114);
    lineTrim(chassis, seal, [[side * 1.031, .811, -.768], [side * 1.028, .711, -.820],
      [side * 1.007, .527, -.792], [side * .968, .354, -.708], [side * .953, .319, -.599]], .0045);

    const archPoints = axle => Array.from({ length: 21 }, (_, i) => {
      const z = axle + .412 * Math.cos(i * Math.PI / 20);
      const [x, y] = heroSection(z).at(-1);
      return [side * (x + .002), y + .001, z];
    });
    for (const axle of axles) lineTrim(chassis, seal, archPoints(axle), .011);
  }

  const brakeLight = new THREE.MeshStandardMaterial({
    color: 0xf92c3b, emissive: 0xff192a, emissiveIntensity: 1.25, roughness: .28
  });
  makeRear(chassis, brakeLight);

  // Wheels & non-spinning Brembo caliper hubs attached directly to body (not chassis)
  const wheels = [];
  const caliperHubs = [];
  for (const side of [-1, 1]) for (const z of axles) {
    wheels.push(makeWheel(body, side, z));
    caliperHubs.push(makeCaliperHub(body, side, z));
  }
  // Keep brake calipers & tire contact patches steered with front wheels without spinning on X
  const origUpdateMatrixWorld = body.updateMatrixWorld.bind(body);
  body.updateMatrixWorld = function (force) {
    for (let i = 0; i < wheels.length; i++) {
      caliperHubs[i].rotation.y = wheels[i].rotation.y;
    }
    origUpdateMatrixWorld(force);
  };

  // Tighter, richer dark underbody ambient-occlusion contact shadow at y = 0.014 on body
  const contact = attach(body, aspectBadge, shadowMat, 0, .014, -.02, 2.38, 5.18, 1);
  contact.rotation.x = -Math.PI / 2;
  contact.renderOrder = 1;

  // Upgraded realistic GT-R R35 Cockpit / Interior (CAM 02)
  const cockpit = new THREE.Group();
  cockpit.visible = false;
  chassis.add(cockpit);

  // Visible front hood contours, NACA vents & muscular fender crests seen through windshield (uses bodyPaint!)
  sculptedPatch(cockpit, bodyPaint, 16, 10, (u, v) => {
    const x = (2 * u - 1) * mix(.84, .74, v);
    const z = mix(1.06, 2.24, v);
    const fenderPeak = .042 * Math.exp(-(((Math.abs(x) - .62) / .18) ** 2)) * (1 - .35 * v);
    const centerValley = -.014 * Math.exp(-((x / .24) ** 2));
    const y = mix(.922, .725, v ** 1.18) + fenderPeak + centerValley;
    return [x, y, z];
  });
  for (const side of [-1, 1]) {
    lineTrim(cockpit, bodyPaint, [[side * .64, .936, 1.08], [side * .61, .894, 1.54], [side * .54, .812, 2.04]], .018);
    lineTrim(cockpit, bodyPaint, [[side * .34, .922, 1.12], [side * .31, .882, 1.56], [side * .26, .806, 2.02]], .010);
    // Windshield wiper blades visible at base of windshield
    lineTrim(cockpit, seal, [[side * .05, .932, 1.03], [side * .42, .944, 1.05], [side * .68, .928, 1.01]], .008);
  }
  box(cockpit, seal, 0, .922, 1.02, 1.66, .034, .14);

  // Sculpted dark Alcantara/leather dashboard, stitched upper brow & curved instrument binnacle
  box(cockpit, alcantara, 0, .886, .75, 1.62, .15, .54);
  box(cockpit, dashboard, 0, .942, .68, 1.58, .055, .36);
  // Dark interior floor / lower knee bolster cover sitting above heroShell deck so exterior paint never bleeds inside
  box(cockpit, black, 0, .916, .16, 1.68, .042, 1.18);
  box(cockpit, alcantara, -.425, .892, .49, .54, .16, .12);
  // Stitched curved instrument binnacle hood over the driver's 3D cluster (x = -0.425)
  sculptedPatch(cockpit, alcantara, 16, 6, (u, v) => {
    const angle = mix(Math.PI * .12, Math.PI * .88, u);
    const x = -.425 - Math.cos(angle) * .25;
    const y = 1.008 + Math.sin(angle) * .118 - v * .012;
    const z = mix(.482, .665, v);
    return [x, y, z];
  });
  lineTrim(cockpit, stitchRed, [
    [-.67, 1.015, .488], [-.588, 1.098, .486], [-.425, 1.126, .484], [-.262, 1.098, .486], [-.18, 1.015, .488]
  ], .0035);
  lineTrim(cockpit, stitchRed, [
    [-.76, .962, .58], [-.16, .966, .57], [.18, .972, .585], [.74, .956, .61]
  ], .003);
  // Dark cluster backing recess
  box(cockpit, intake, -.425, 1.032, .568, .46, .155, .04);

  // Carbon-fiber center console stack, climate controls, dual-clutch shift gate & red start button
  box(cockpit, carbonMat, .06, .945, .635, .40, .20, .06);
  box(cockpit, graphite, .06, .845, .575, .42, .08, .12);
  box(cockpit, alcantara, .04, .745, .26, .26, .24, .78);
  box(cockpit, carbonMat, .04, .938, .22, .22, .022, .56);
  // Dual-clutch gear selector & red Engine Start/Stop button
  attach(cockpit, cylinder, silver, -.02, .965, .34, .014, .055, .014);
  box(cockpit, alcantara, -.02, .995, .34, .042, .026, .052);
  attach(cockpit, cylinder, stitchRed, -.035, .952, .42, .015, .01, .015);
  // Dashboard turbine air vents
  for (const vx of [-.71, -.14, .28, .68]) {
    attach(cockpit, lampRim, silver, vx, .932, .592, .026, .026, .02).rotation.y = Math.PI;
    attach(cockpit, lampDisc, intake, vx, .932, .593, .023, .023, 1).rotation.y = Math.PI;
  }

  // Windshield frame, roof header, sun visors, dark A-pillars & sleek top rearview mirror
  box(cockpit, alcantara, 0, 1.53, -.12, 1.44, .055, .99);
  box(cockpit, pillarBlack, 0, 1.505, .398, 1.44, .068, .14);
  // Sun visors
  for (const vx of [-.38, .38]) {
    box(cockpit, alcantara, vx, 1.468, .365, .34, .018, .11);
  }
  // Sleek top rearview mirror tucked neatly near header with sunset reflection gradient
  box(cockpit, pillarBlack, -.02, 1.438, .53, .018, .072, .028);
  box(cockpit, pillarBlack, -.02, 1.384, .512, .236, .062, .024);
  attach(cockpit, aspectBadge, mirrorGlassMat, -.02, 1.384, .498, .222, .050, 1).rotation.y = Math.PI;

  // Dark A-pillars, side door tops, interior door pulls & painted exterior side mirror housings
  for (const side of [-1, 1]) {
    box(cockpit, alcantara, .855 * side, .855, -.13, .092, .18, 1.06);
    lineTrim(cockpit, stitchRed, [[.812 * side, .938, -.52], [.812 * side, .938, .38]], .0028);
    box(cockpit, silver, .808 * side, .875, .14, .018, .022, .16);
    const base = vector(.822 * side, .895, 1.05);
    const top = vector(.688 * side, 1.515, .365);
    const midpoint = base.clone().lerp(top, .5);
    const pillar = box(cockpit, pillarBlack, midpoint.x, midpoint.y, midpoint.z, .064, .082, base.distanceTo(top));
    pillar.quaternion.setFromUnitVectors(vector(0, 0, 1), top.clone().sub(base).normalize());
    // Visible painted exterior side mirror housing + mirror glass outside left/right windows
    const extMirror = attach(cockpit, mirrorHousing, bodyPaint, side * 1.032, .982, .57, .152, .060, .112);
    extMirror.rotation.y = -side * .18;
    attach(cockpit, mirrorHousing, seal, side * 1.033, .978, .524, .134, .052, .078).rotation.y = -side * .17;
    attach(cockpit, mirrorHousing, mirrorGlassMat, side * 1.034, .979, .462, .104, .038, .024).rotation.y = -side * .17;
  }

  // Detailed flat-bottom GT-R sport steering wheel (rotates smoothly with steering.rotation.z)
  const steering = new THREE.Group();
  steering.position.set(-.425, .922, .386);
  steering.rotation.x = -.19;
  cockpit.add(steering);
  // Sculpted D-shaped flat-bottom rim using closed Catmull-Rom tube
  const rimPts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const rx = Math.cos(a) * .194;
    let ry = Math.sin(a) * .194;
    if (ry < -.138) ry = mix(ry, -.138, .78); // Flat bottom section
    return vector(rx, ry, 0);
  });
  const rimCurve = new THREE.CatmullRomCurve3(rimPts, true);
  attach(steering, new THREE.TubeGeometry(rimCurve, 56, .024, 12, true), alcantara, 0, 0, 0);
  // Red 12 o'clock centering stripe at top of rim
  attach(steering, cylinder, stitchRed, 0, .194, 0, .0255, .022, .0255).rotation.z = Math.PI / 2;
  // Contoured silver 3-spoke core + dark thumb switch pods
  box(steering, silver, 0, -.006, -.004, .326, .042, .026);
  box(steering, black, -.112, .002, -.012, .058, .036, .022);
  box(steering, black, .112, .002, -.012, .058, .036, .022);
  box(steering, silver, 0, -.078, -.004, .056, .128, .026);
  box(steering, intake, 0, -.084, -.012, .018, .078, .018);
  // Aluminum paddle shifters behind the rim (left - downshift, right + upshift)
  for (const side of [-1, 1]) {
    const paddle = box(steering, silver, side * .128, .036, .028, .036, .115, .008);
    paddle.rotation.z = -side * .14;
  }
  // Sculpted dark airbag hub & GT-R emblem facing driver
  attach(steering, cylinder, graphite, 0, -.004, -.016, .064, .032, .064).rotation.x = Math.PI / 2;
  attach(steering, fineRing, silver, 0, -.004, -.033, .056, .056, .35);
  attach(steering, aspectBadge, badge, 0, -.004, -.036, .058, .031, 1).rotation.y = Math.PI;

  // Live animated 3D Instrument Cluster (512x160 canvas texture)
  const clusterCanvas = document.createElement('canvas');
  clusterCanvas.width = 512;
  clusterCanvas.height = 160;
  const clusterCtx = clusterCanvas.getContext('2d');
  const clusterTex = new THREE.CanvasTexture(clusterCanvas);
  clusterTex.colorSpace = THREE.SRGBColorSpace;
  const clusterMat = new THREE.MeshBasicMaterial({ map: clusterTex, toneMapped: false });
  const clusterMesh = attach(cockpit, aspectBadge, clusterMat, -.425, 1.032, .542, .418, .134, 1);
  clusterMesh.rotation.order = 'YXZ';
  clusterMesh.rotation.y = Math.PI;
  clusterMesh.rotation.x = -.11;

  // Authentic GT-R center Multi-Function Display (MFD) screen (cleanly in front of center stack, zero clipping)
  const mfdCanvas = document.createElement('canvas');
  mfdCanvas.width = 320;
  mfdCanvas.height = 180;
  const mfdCtx = mfdCanvas.getContext('2d');
  const mfdTex = new THREE.CanvasTexture(mfdCanvas);
  mfdTex.colorSpace = THREE.SRGBColorSpace;
  const mfdMat = new THREE.MeshBasicMaterial({ map: mfdTex, toneMapped: false });
  const mfdFrame = box(cockpit, pillarBlack, .06, 1.015, .585, .312, .168, .016);
  mfdFrame.rotation.order = 'YXZ';
  mfdFrame.rotation.y = -.08;
  mfdFrame.rotation.x = -.08;
  const mfdMesh = attach(cockpit, aspectBadge, mfdMat, .058, 1.015, .572, .295, .152, 1);
  mfdMesh.rotation.order = 'YXZ';
  mfdMesh.rotation.y = Math.PI - .08;
  mfdMesh.rotation.x = -.08;

  let lastClusterDraw = -Infinity;
  let lastSpeed = -1;
  let lastRevs = -1;
  let lastGear = '';
  let lastSteer = -99;

  function drawClusterAndMfd(speedKmh, revs, gearLabel, steerNorm) {
    const ctx = clusterCtx;
    const w = 512, h = 160;
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Subtle carbon instrument backing grid
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const startAng = Math.PI * .75;
    const endAng = Math.PI * 2.25;
    const sweep = endAng - startAng;

    // 1. LEFT DIAL: Speedometer (0 - 320 km/h)
    const sx = 108, sy = 88, sr = 54;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = '#101521';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#29354d';
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
      ctx.fillStyle = '#9fb2cc';
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
    ctx.fillStyle = '#2a3346';
    ctx.fill();
    ctx.fillStyle = '#7b93b3';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('KM/H', sx, sy + 28);

    // 2. CENTER DIAL: Iconic GT-R Tachometer (0 - 9000 RPM, redline at 7000)
    const tx = 256, ty = 84, tr = 66;
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, Math.PI * 2);
    ctx.fillStyle = '#131926';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#3b4a68';
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
    ctx.fillStyle = '#8fa4c4';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('x1000 r/min', tx, ty - 22);
    ctx.fillStyle = revs >= 6900 ? '#ff2e43' : '#1b2233';
    ctx.fillRect(tx - 17, ty + 14, 34, 28);
    ctx.strokeStyle = '#52688f';
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
    ctx.fillStyle = '#2d374b';
    ctx.fill();

    // 3. RIGHT PANEL: Digital Speed + Boost + Gear Display
    const rx = 406, ry = 88, rr = 54;
    ctx.beginPath();
    ctx.arc(rx, ry, rr, 0, Math.PI * 2);
    ctx.fillStyle = '#101521';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#29354d';
    ctx.stroke();

    // Digital speed readout
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
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
    ctx.fillStyle = '#95a9c6';
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

  for (const group of [...wheels, ...caliperHubs, cabin, steering, cockpit, chassis, body]) batchPanels(group);
  for (const group of [body, chassis, cabin, ...wheels, ...caliperHubs]) for (const part of group.children) {
    if (!part.isMesh || part.material.isMeshBasicMaterial || part.material.emissive?.getHex()) continue;
    part.castShadow = true;
    part.receiveShadow = true;
  }
  scene.add(root);
  return { root, body, chassis, wheels, cockpit, cabin, steering, brakeLight, setPaint, updateInterior };
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
