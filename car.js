const black = material(0x131722, .62);
const rubber = material(0x1c1c20, .93);
const alloy = material(0xb0bbc8, .3, .79);
const graphite = material(0x39404a, .36, .56);
const silver = material(0xc3cccd, .22, .72);
const dashboard = material(0x24252b, .85);
const exhaustMat = material(0x656b79, .31, .81);
const glass = new THREE.MeshPhysicalMaterial({
  color: 0x172329, roughness: .24, metalness: .24, clearcoat: .72, clearcoatRoughness: .14
});
const lampOff = material(0x330918, .33, .17);
const lampWhite = new THREE.MeshStandardMaterial({ color: 0xecf4ff, emissive: 0x9dc0ff, emissiveIntensity: .87 });
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 24);
const tireGeo = new THREE.CylinderGeometry(.367, .367, .265, 32);
const aspectBadge = new THREE.PlaneGeometry(1, 1);
const lampDisc = new THREE.CircleGeometry(1, 40);
const rotorHole = new THREE.CircleGeometry(1, 10);
const lampRim = new THREE.TorusGeometry(1, .097, 7, 36);
const lampRing = new THREE.TorusGeometry(1, .118, 8, 40);
const fineRing = new THREE.TorusGeometry(1, .025, 5, 36);
const mirrorHousing = new THREE.SphereGeometry(1, 24, 12);
const intake = material(0x080910, .52, .23);
const ventMetal = material(0x1f2736, .33, .52);
const seal = material(0x0a111d, .48, .17);
const tireShoulder = material(0x23252b, .88);
const brakeRotor = material(0x798293, .38, .81);
const bezel = material(0x414553, .27, .78);
const reverseLamp = material(0xb3aaa1, .37, .35);
const bumperReflector = new THREE.MeshStandardMaterial({ color: 0x8a1425, emissive: 0x6c0918, emissiveIntensity: .48, roughness: .29, metalness: .25 });
const lampLens = new THREE.MeshPhysicalMaterial({ color: 0x6e0d27, roughness: .17, metalness: .17, clearcoat: 1, clearcoatRoughness: .12 });
// Batch rigid panels that share paint or trim. Wheel assemblies and cockpit
// visibility stay independent because only direct mesh children are combined.
function batchPanels(parent) {
  const byMaterial = new Map();
  for (const part of parent.children) {
    if (!part.isMesh) continue;
    const list = byMaterial.get(part.material) || [];
    list.push(part);
    byMaterial.set(part.material,list);
  }
  const vertex = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  for (const [mat,parts] of byMaterial) {
    if (parts.length < 2) continue;
    const positions = [], normals = [], uvs = [], indices = [];
    for (const part of parts) {
      const geo = part.geometry;
      const attributes = geo.attributes;
      const base = positions.length/3;
      part.updateMatrix();
      normalMatrix.getNormalMatrix(part.matrix);
      for (let i=0;i<attributes.position.count;i++) {
        vertex.fromBufferAttribute(attributes.position,i).applyMatrix4(part.matrix);
        positions.push(vertex.x,vertex.y,vertex.z);
        vertex.fromBufferAttribute(attributes.normal,i).applyNormalMatrix(normalMatrix);
        normals.push(vertex.x,vertex.y,vertex.z);
        uvs.push(attributes.uv?.getX(i) ?? 0,attributes.uv?.getY(i) ?? 0);
      }
      for (let i=0;i<(geo.index?.count ?? attributes.position.count);i++)
        indices.push(base+(geo.index?.getX(i) ?? i));
      parent.remove(part);
    }
    const geo = new THREE.BufferGeometry();
    geo.setIndex(indices);
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    const combined = new THREE.Mesh(geo,mat);
    combined.renderOrder = parts[0].renderOrder;
    parent.add(combined);
  }
}
const paint = color => new THREE.MeshPhysicalMaterial({
  color, roughness: .25, metalness: .55, clearcoat: .9, clearcoatRoughness: .13
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
  ctx.fillStyle = '#e7e1d5';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#313342';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#171720';
  ctx.font = 'bold 53px monospace';
  ctx.fillText('R35', w / 2, 61);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('AFTERGLOW', w / 2, 81);
});
const badge = canvasMaterial(128, 68, (ctx, w) => {
  ctx.font = 'italic 900 57px sans-serif';
  ctx.fillStyle = '#e1e4eb';
  ctx.fillText('GT', 2, 53);
  ctx.fillStyle = '#ff4442';
  ctx.fillText('R', w - 49, 53);
}, { transparent: true });
const shadowMat = canvasMaterial(96, 128, (ctx, w, h) => {
  ctx.save();
  ctx.scale(w / 2, h / 2);
  const fade = ctx.createRadialGradient(1, 1, .36, 1, 1, 1);
  fade.addColorStop(0, '#0c0b12e8');
  fade.addColorStop(.52, '#0c0b12bb');
  fade.addColorStop(1, '#0c0b1200');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 2, 2);
  ctx.restore();
}, { transparent: true, depthWrite: false, toneMapped: false });
const rearGlow = canvasMaterial(128, 128, (ctx, w, h) => {
  const radius = w * .5;
  const glow = ctx.createRadialGradient(radius, h * .5, 0, radius, h * .5, radius);
  glow.addColorStop(0, '#ff284300');
  glow.addColorStop(.35, '#ff28430e');
  glow.addColorStop(.61, '#ff344a52');
  glow.addColorStop(.78, '#ff263d28');
  glow.addColorStop(1, '#ff263d00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}, { transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, opacity: .62 });

// Each station defines the sill, fender shoulder and upper body across the length.
function shell(parent, stations, mat) {
  const p = [], faces = [];
  for (let i = 0; i < stations.length; i++) {
    const [z, w, low, shoulderY, top, upperWidth] = stations[i];
    p.push(-w*.83,low,z, -w,shoulderY-.18,z, -w,shoulderY,z, -w*upperWidth,top,z,
      0,top+.023,z, w*upperWidth,top,z, w,shoulderY,z, w,shoulderY-.18,z, w*.83,low,z);
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
  return meshFrom(parent, points.flat(), [0,1,2,0,2,3], mat);
}

const heroStations = [
  [-2.43,.892,.344,.717,.831,.916], [-2.39,.955,.283,.776,.892,.879],
  [-2.29,1.005,.247,.833,.944,.848], [-2.09,1.051,.239,.872,.964,.827],
  [-1.8,1.073,.239,.890,.971,.819], [-1.42,1.081,.239,.879,.967,.809],
  [-1.12,1.060,.244,.851,.938,.804], [-.79,1.027,.248,.823,.905,.808],
  [.03,.997,.246,.804,.901,.821], [.51,1.007,.249,.817,.906,.818],
  [.95,1.048,.251,.831,.898,.804], [1.39,1.079,.254,.834,.875,.790],
  [1.68,1.072,.251,.819,.840,.795], [1.95,1.034,.252,.783,.793,.811],
  [2.18,.988,.251,.728,.734,.825], [2.34,.911,.285,.672,.679,.874],
  [2.394,.821,.334,.601,.629,.917],
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
  const [width, sill, shoulder, hood, hoodWidth] = [1, 2, 3, 4, 5].map(column => stationValue(heroStations, i, column, t));
  const distanceFromAxle = Math.min(...axles.map(axle => Math.abs(z - axle)));
  const arch = .377 + .417 * Math.sqrt(Math.max(0, 1 - (distanceFromAxle / .417) ** 2));
  const archFade = 1 - smooth(.384, .432, distanceFromAxle);
  const lowerEdge = mix(sill, arch, archFade);
  const lowSideWidth = mix(width * .902, width * .994, archFade);
  const nearEnd = smooth(2.14, 2.43, Math.abs(z));
  const crown = mix(.024, .012, nearEnd);
  const side = [
    [0, hood + crown], [width * .25, hood + crown * .9],
    [width * .53, hood + crown * .52], [width * hoodWidth, hood],
    [width * .94, mix(hood, shoulder, .4)], [width * .982, mix(hood, shoulder, .78)],
    [width, shoulder], [mix(width * .991, lowSideWidth, .1), mix(shoulder, lowerEdge, .33)],
    [mix(width * .961, lowSideWidth, .48), mix(shoulder, lowerEdge, .78)], [lowSideWidth, lowerEdge],
  ];
  return [...side.slice(1).reverse().map(([x, y]) => [-x, y]), ...side].map(([x, y]) =>
    [x, y, z - Math.sign(z) * .095 * nearEnd * (x / width) ** 2]);
}

function heroShell(parent, blue) {
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
  const shellMesh = meshFrom(parent, p, faces, blue);
  for (const row of [0, sections.length - 1]) {
    const ends = sections[row];
    fascia(parent, blue, ends, row === 0);
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
  [.272,-.121], [.319,-.131], [.344,-.127], [.358,-.112], [.370,-.091],
  [.377,-.066], [.377,-.022], [.374,-.019], [.374,-.013], [.378,-.010],
  [.378,.01], [.374,.013], [.374,.019], [.377,.022], [.377,.066], [.370,.091],
  [.358,.113], [.342,.128], [.314,.133], [.273,.126], [.272,-.121],
]);
const rimLip = lathe([
  [.244,.106], [.246,.131], [.259,.14], [.272,.143], [.277,.133],
  [.274,.121], [.265,.119], [.262,.102], [.244,.106],
]);
const sidewallRidge = lathe([[.321,.132],[.324,.134],[.328,.132],[.324,.131],[.321,.132]]);

function makeWheel(parent, side, z) {
  const group = new THREE.Group();
  group.position.set(side * .93, .377, z);
  parent.add(group);
  const outward = side < 0 ? Math.PI : 0;
  attach(group, heroTire, rubber, 0, 0, 0).rotation.y = outward;
  attach(group, rimLip, alloy, 0, 0, 0).rotation.y = outward;
  attach(group, sidewallRidge, tireShoulder, 0, 0, 0).rotation.y = outward;
  attach(group, cylinder, intake, side * .033, 0, 0, .276, .151, .276).rotation.z = Math.PI / 2;
  attach(group, cylinder, brakeRotor, side * .093, 0, 0, .199, .018, .199).rotation.z = Math.PI / 2;
  attach(group, fineRing, graphite, side * .103, 0, 0, .189, .189, .55).rotation.y = Math.PI / 2;
  for (let j = 0; j < 24; j++) {
    const theta = j * Math.PI / 12;
    const radius = j % 2 ? .179 : .158;
    const mark = attach(group, rotorHole, seal, side * .104, radius * Math.cos(theta), radius * Math.sin(theta), .006, .006, 1);
    mark.rotation.y = side * Math.PI / 2;
  }
  const spokeShape = new THREE.Shape();
  [[-.022,.044],[.026,.049],[.047,.227],[.031,.256],[.012,.251],[.015,.17],[-.017,.102]].forEach(([x,y], i) => {
    if (i === 0) spokeShape.moveTo(x,y);
    else spokeShape.lineTo(x,y);
  });
  const spokeGeo = new THREE.ExtrudeGeometry(spokeShape, { depth: .013, bevelEnabled: true, bevelThickness: .005, bevelSize: .004, bevelSegments: 1 });
  spokeGeo.rotateY(side * Math.PI / 2);
  for (let j = 0; j < 5; j++) for (const offset of [-.146, .146]) {
    const spoke = attach(group, spokeGeo, alloy, side * .117, 0, 0);
    spoke.rotation.x = j * 2 * Math.PI / 5 + offset;
  }
  attach(group, cylinder, graphite, side * .137, 0, 0, .073, .022, .073).rotation.z = Math.PI / 2;
  attach(group, cylinder, alloy, side * .153, 0, 0, .025, .009, .025).rotation.z = Math.PI / 2;
  for (let j = 0; j < 5; j++) {
    const theta = j * 2 * Math.PI / 5;
    const lug = attach(group, cylinder, silver, side * .152, .05 * Math.cos(theta), .05 * Math.sin(theta), .009, .009, .009);
    lug.rotation.z = Math.PI / 2;
  }
  return group;
}

function makeCabin(body, blue) {
  const cabin = new THREE.Group();
  body.add(cabin);
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
  sculptedPatch(cabin, blue, 18, 14, (u, t) => roof(2 * u - 1, t));
  sculptedPatch(cabin, window, 18, 12, (u, t) => backlight(2 * u - 1, t));
  sculptedPatch(cabin, window, 18, 12, (u, t) => windshield(2 * u - 1, t));
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
    lineTrim(cabin, seal, sample(t => sideWindow(t, 0)), .016);
    lineTrim(cabin, blue, sample(t => roof(side, t)), .028);
    lineTrim(cabin, blue, sample(t => windshield(side, t)), .035);
    lineTrim(cabin, blue, sample(t => backlight(side, t)), .043);
    lineTrim(cabin, seal, sample(t => sideWindow(.37, t)), .022);
    lineTrim(cabin, blue, [rearDeck(side), sideBase(0), sideTop(0)], .042);
  }
  lineTrim(cabin, seal, sample(t => rearDeck(2 * t - 1)), .012);
  lineTrim(cabin, seal, sample(t => roofBack(2 * t - 1)), .012);
  lineTrim(cabin, seal, sample(t => roofFront(2 * t - 1)), .013);
  lineTrim(cabin, seal, sample(t => cowl(2 * t - 1)), .015);
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

function makeWing(body, blue) {
  const profile = [
    [-2.229,1.166], [-2.195,1.190], [-2.077,1.205], [-1.948,1.191], [-1.865,1.159],
    [-1.872,1.146], [-1.958,1.152], [-2.098,1.150], [-2.216,1.151],
  ];
  const wingPoint = (u, i) => {
    const tip = Math.abs(u) ** 5;
    const [z, y] = profile[i];
    return [u * 1.015, y + .031 * tip, z - .041 * tip];
  };
  for (let j = 0; j < profile.length; j++) {
    const next = (j + 1) % profile.length;
    sculptedPatch(body, j >= 5 ? seal : blue, 20, 2, (u, v) => {
      const a = wingPoint(u * 2 - 1, j), b = wingPoint(u * 2 - 1, next);
      return a.map((value, i) => mix(value, b[i], v));
    });
  }
  const wingTip = new THREE.ExtrudeGeometry(new THREE.Shape([
    [-2.292,1.14], [-2.249,1.201], [-2.143,1.255], [-1.955,1.237], [-1.885,1.207], [-1.911,1.138], [-2.152,1.126],
  ].map(([z, y]) => new THREE.Vector2(-z, y))), {
    depth: .018, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2,
  }).rotateY(Math.PI / 2);
  for (const side of [-1, 1]) {
    attach(body, wingTip, blue, side * 1.004 - .009, 0, 0);
    lineTrim(body, seal, [[side*.68,.95,-2.116],[side*.667,1.015,-2.076],[side*.657,1.107,-2.02],[side*.66,1.159,-1.982]], .044);
    lineTrim(body, blue, [[side*.703,.951,-2.09],[side*.694,1.022,-2.062],[side*.688,1.103,-2.011],[side*.686,1.163,-1.978]], .022);
  }
  lineTrim(body, bumperReflector, [[-.23,1.153,-2.237],[0,1.154,-2.239],[.23,1.153,-2.237]], .009);
}

function makeRear(body, brakeLight) {
  const surfaceZ = x => -2.438 + .080 * x * x;
  const rearPanel = (mat, points, depth = 0) => fascia(body, mat, points.map(([x, y]) => [x, y, surfaceZ(x) - depth]), true);
  rearPanel(seal, [[-.846,.468],[-.668,.422],[-.424,.414],[-.294,.367],[.294,.367],[.424,.414],[.668,.422],[.846,.468],
    [.811,.369],[.703,.294],[.495,.282],[.377,.256],[-.377,.256],[-.495,.282],[-.703,.294],[-.811,.369]], .020);
  rearPanel(ventMetal, [[-.454,.365],[-.329,.315],[.329,.315],[.454,.365],[.387,.272],[.285,.237],[-.285,.237],[-.387,.272]], .032);
  for (const x of [-.36, -.24, -.12, 0, .12, .24, .36]) {
    const diffuserFin = box(body, seal, x, .285, -2.421, .023, .089, .167);
    diffuserFin.rotation.x = -.19;
  }
  rearPanel(intake, [[-.285,.687],[-.243,.743],[.243,.743],[.285,.687],[.242,.521],[-.242,.521]], .023);
  rearPanel(ventMetal, [[-.248,.691],[-.225,.717],[.225,.717],[.248,.691],[.215,.548],[-.215,.548]], .032);
  attach(body, aspectBadge, plate, 0, .628, -2.481, .361, .136, 1).rotation.y = Math.PI;
  attach(body, aspectBadge, badge, -.307, .802, -2.445, .14, .077, 1).rotation.y = Math.PI;
  attach(body, lampDisc, bezel, 0, .785, -2.454, .041, .041, 1).rotation.y = Math.PI;
  attach(body, lampDisc, seal, 0, .785, -2.456, .032, .032, 1).rotation.y = Math.PI;
  lineTrim(body, silver, [[-.036,.785,-2.46],[0,.785,-2.463],[.036,.785,-2.46]], .008);
  lineTrim(body, seal, [[-.914,.721,-2.367],[-.743,.675,-2.411],[-.387,.681,-2.429],[-.236,.716,-2.451],
    [.236,.716,-2.451],[.387,.681,-2.429],[.743,.675,-2.411],[.914,.721,-2.367]], .006);
  for (const side of [-1, 1]) {
    const mount = (mat, points, depth) => rearPanel(mat, points.map(([x, y]) => [side * x, y]), depth);
    mount(seal, [[.378,.790],[.414,.865],[.540,.893],[.670,.905],[.811,.932],[.921,.899],[.969,.810],
      [.944,.727],[.873,.665],[.705,.643],[.552,.652],[.440,.665],[.389,.718]], .019);
    mount(ventMetal, [[.405,.788],[.447,.849],[.555,.880],[.684,.887],[.802,.909],[.900,.875],[.944,.800],
      [.919,.729],[.859,.681],[.707,.665],[.551,.672],[.457,.689],[.418,.728]], .028);
    for (const [x, y, radius] of [[.548,.775,.102],[.803,.795,.122]]) {
      const z = surfaceZ(x) - .045;
      const angle = Math.PI - side * x * .10;
      const lamp = (geometry, mat, r, axial, offset) => {
        const part = attach(body, geometry, mat, side * x, y, z + offset, r, r, axial);
        part.rotation.y = angle;
      };
      lamp(lampDisc, lampLens, radius * 1.12, 1, .006);
      lamp(lampRim, bezel, radius * 1.04, .049, .005);
      lamp(lampDisc, lampOff, radius * .82, 1, -.002);
      lamp(lampRing, brakeLight, radius * .89, .038, -.013);
      lamp(fineRing, bumperReflector, radius * .67, .06, -.013);
      const glow = attach(body, aspectBadge, rearGlow, side * x, y, z - .039, radius * 3.1, radius * 3.1, 1);
      glow.rotation.y = angle;
      glow.renderOrder = 3;
    }
    mount(bumperReflector, [[.518,.454],[.737,.489],[.755,.479],[.747,.463],[.528,.434]], .025);
    mount(reverseLamp, [[.308,.479],[.401,.479],[.421,.465],[.400,.447],[.314,.449]], .027);
    for (const [x, radius, length] of [[.567,.094,.153],[.760,.098,.143]]) {
      const y = .344;
      attach(body, cylinder, exhaustMat, side*x, y, -2.423, radius, length, radius).rotation.x = Math.PI / 2;
      attach(body, lampRim, silver, side*x, y, -2.501, radius*.91, radius*.91, .061);
      attach(body, lampDisc, intake, side*x, y, -2.505, radius*.83, radius*.83, 1).rotation.y = Math.PI;
      attach(body, fineRing, bezel, side*x, y, -2.506, radius*.77, radius*.77, .05);
    }
  }
}

function makeFront(body) {
  const surfaceZ = x => 2.402 - .132 * x * x;
  const frontPanel = (mat, points, depth = 0) => fascia(body, mat, points.map(([x, y]) => [x, y, surfaceZ(x) + depth]));
  frontPanel(seal, [[-.527,.625],[-.422,.642],[.422,.642],[.527,.625],[.621,.468],[.615,.392],[.541,.338],
    [-.541,.338],[-.615,.392],[-.621,.468]], .006);
  frontPanel(intake, [[-.485,.605],[.485,.605],[.568,.462],[.553,.364],[-.553,.364],[-.568,.462]], .016);
  lineTrim(body, silver, [[-.517,.594,2.392],[-.329,.496,2.415],[0,.487,2.425],[.329,.496,2.415],[.517,.594,2.392]], .018);
  attach(body, aspectBadge, badge, -.005, .550, 2.425, .116, .058, 1);
  for (const y of [.382,.412,.443]) lineTrim(body, ventMetal, [[-.528,y,2.390],[-.275,y,2.421],[.275,y,2.421],[.528,y,2.390]], .007);
  lineTrim(body, seal, [[-.879,.313,2.169],[-.716,.303,2.345],[-.455,.294,2.412],[0,.29,2.432],
    [.455,.294,2.412],[.716,.303,2.345],[.879,.313,2.169]], .041);
  for (const side of [-1, 1]) {
    const mount = (mat, points, depth) => frontPanel(mat, points.map(([x, y]) => [side * x, y]), depth);
    mount(intake, [[.627,.494],[.708,.532],[.857,.545],[.843,.425],[.786,.366],[.624,.375]], .018);
    for (const y of [.421,.452,.483]) lineTrim(body, ventMetal,
      [[side*.651,y,2.368],[side*.738,y,2.354],[side*.815,y,2.332]], .008);
    lineTrim(body, seal, [[side*.56,.662,2.363],[side*.727,.681,2.34],[side*.864,.733,2.28],
      [side*.932,.779,2.15],[side*.945,.812,1.963]], .042);
    lineTrim(body, lampWhite, [[side*.563,.665,2.387],[side*.729,.683,2.366],[side*.864,.73,2.308],
      [side*.935,.777,2.173],[side*.951,.814,1.997]], .012);
    lineTrim(body, bumperReflector, [[side*.91,.555,2.305],[side*.94,.564,2.224],[side*.964,.576,2.152]], .009);
    const vent = [[side*.355,.916,1.106],[side*.495,.909,1.138],[side*.477,.88,1.441],[side*.337,.887,1.405]];
    panel(body, side === 1 ? vent.slice().reverse() : vent, intake);
    lineTrim(body, ventMetal, [[side*.343,.892,1.4],[side*.419,.896,1.314],[side*.484,.913,1.149]], .009);
  }
}
function makeR35() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const blue = new THREE.MeshPhysicalMaterial({
    color: 0x1d61c9, roughness: .23, metalness: .58, clearcoat: 1, clearcoatRoughness: .12,
  });
  heroShell(body, blue);
  const cabin = makeCabin(body, blue);
  makeWing(body, blue);
  makeFront(body);
  for (const side of [-1, 1]) {
    lineTrim(body, seal, [[side*.999,.29,-.913],[side*.962,.261,-.71],[side*.946,.253,.07],
      [side*.972,.257,.70],[side*1.021,.297,.969]], .042);
    lineTrim(body, blue, [[side*1.01,.305,-.918],[side*.981,.29,-.68],[side*.973,.281,.02],
      [side*.993,.284,.71],[side*1.027,.306,.972]], .014);
    lineTrim(body, seal, [[side*.847,.886,.56],[side*.951,.933,.57],[side*1.035,.957,.585]], .034);
    const mirror = attach(body, mirrorHousing, blue, side*1.034, .983, .57, .153, .059, .112);
    mirror.rotation.y = -side*.18;
    attach(body, mirrorHousing, seal, side*1.035, .978, .525, .134, .051, .079).rotation.y = -side*.17;
    attach(body, mirrorHousing, bezel, side*1.036, .979, .464, .103, .037, .027).rotation.y = -side*.17;
    attach(body, mirrorHousing, bezel, side*1.021, .795, -.535, .016, .017, .111);
    lineTrim(body, seal, [[side*1.031,.811,-.768],[side*1.028,.711,-.820],
      [side*1.007,.527,-.792],[side*.968,.354,-.708],[side*.953,.319,-.599]], .0045);
    const archPoints = axle => Array.from({ length: 21 }, (_, i) => {
      const z = axle + .407 * Math.cos(i * Math.PI / 20);
      const [x, y] = heroSection(z).at(-1);
      return [side * (x + .0015), y + .001, z];
    });
    for (const axle of axles) lineTrim(body, seal, archPoints(axle), .010);
  }
  const brakeLight = new THREE.MeshStandardMaterial({
    color: 0xf92c3b, emissive: 0xff192a, emissiveIntensity: 1.25, roughness: .31
  });
  makeRear(body, brakeLight);
  const wheels = [];
  for (const side of [-1, 1]) for (const z of axles) wheels.push(makeWheel(body, side, z));
  const contact = attach(root, aspectBadge, shadowMat, 0,.031,0,3.7,6.1,1);
  contact.rotation.x = -Math.PI / 2;
  const cockpit = new THREE.Group();
  cockpit.visible = false;
  body.add(cockpit);
  box(cockpit, dashboard, 0,.886,.75,1.61,.15,.54);
  box(cockpit, black, -.44,.982,.674,.49,.13,.22);
  box(cockpit, graphite, .05,.858,.573,.7,.066,.12);
  box(cockpit, black, .08,.721,.28,.24,.25,.74);
  box(cockpit, black, -.04,1.326,.52,.265,.076,.034);
  box(cockpit, graphite, -.04,1.325,.50,.248,.060,.005);
  box(cockpit, black, -.04,1.365,.55,.023,.063,.035);
  box(cockpit, dashboard, 0,1.53,-.12,1.43,.055,.99);
  box(cockpit, dashboard, 0,1.512,.398,1.43,.065,.135);
  box(cockpit, black, 0,.892,-.14,1.61,.036,1.37);
  for (const side of [-1,1]) {
    box(cockpit, dashboard, .855*side,.851,-.13,.086,.17,1.04);
    const base = vector(.818*side,.891,1.06);
    const top = vector(.691*side,1.522,.37);
    const midpoint = base.clone().lerp(top,.5);
    const pillar = box(cockpit, dashboard, midpoint.x,midpoint.y,midpoint.z,.057,.076,base.distanceTo(top));
    pillar.quaternion.setFromUnitVectors(vector(0,0,1),top.sub(base).normalize());
  }
  const steering = new THREE.Group();
  steering.position.set(-.435,.942,.393);
  steering.rotation.x = -.19;
  cockpit.add(steering);
  attach(steering, new THREE.TorusGeometry(.194,.024,10,42), black, 0,0,0);
  box(steering, black,0,0,0,.317,.046,.032);
  box(steering, black,0,-.085,0,.044,.14,.031);
  box(steering, graphite,0,0,-.019,.13,.095,.03);
  attach(steering, aspectBadge, badge,0,0,-.037,.062,.033,1).rotation.y = Math.PI;
  const cluster = canvasMaterial(288,100,(ctx,w,h) => {
    ctx.fillStyle = '#141926';
    ctx.fillRect(0,0,w,h);
    for (const x of [66,143,219]) {
      ctx.strokeStyle = '#fd976c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x,53,29,Math.PI*.72,Math.PI*2.28);
      ctx.stroke();
      ctx.strokeStyle = '#f4eadc';
      ctx.beginPath();
      ctx.moveTo(x,53);
      ctx.lineTo(x-15,64);
      ctx.stroke();
    }
  });
  attach(cockpit, aspectBadge, cluster,-.435,.998,.55,.405,.12,1);
  for (const group of [...wheels,cabin,steering,cockpit,body]) batchPanels(group);
  for (const group of [body, cabin, ...wheels]) for (const part of group.children) {
    if (!part.isMesh || part.material.isMeshBasicMaterial || part.material.emissive?.getHex()) continue;
    part.castShadow = true;
    part.receiveShadow = true;
  }
  scene.add(root);
  return { root, body, wheels, cockpit, cabin, steering, brakeLight };
}

const trafficColors = [0xaaaeb3,0x433c47,0x344e53,0x905044,0xb4a397,0x4c5980];
function makeTraffic(i) {
  const root = new THREE.Group();
  const car = new THREE.Group();
  root.add(car);
  const suv = i % 3 === 1;
  const height = suv ? .16 : 0;
  const color = paint(trafficColors[i % trafficColors.length]);
  color.side = THREE.DoubleSide;
  shell(car, [[-2.15,.86,.31,.66,.76+height,.9],[-1.86,.94,.28,.75,.83+height,.91],
    [-.9,.94,.27,.77,.83+height,.91],[.7,.92,.26,.74,.81+height,.89],
    [1.87,.9,.29,.61,.71,.93],[2.12,.81,.31,.55,.63,.93]], color);
  const cabinMat = glass.clone();
  cabinMat.side = THREE.DoubleSide;
  const leftRear = [-.76,.84+height,suv ? -1.84 : -1.55], rightRear = [.76,.84+height,leftRear[2]];
  const leftFront = [-.76,.785+height,.96], rightFront = [.76,.785+height,.96];
  const roofLR = [-.64,1.29+height,suv ? -1.54 : -.79], roofRR = [.64,1.29+height,roofLR[2]];
  const roofLF = [-.62,1.3+height,.37], roofRF = [.62,1.3+height,.37];
  panel(car, [leftRear,rightRear,roofRR,roofLR], cabinMat);
  panel(car, [rightRear,rightFront,roofRF,roofRR], cabinMat);
  panel(car, [leftFront,leftRear,roofLR,roofLF], cabinMat);
  panel(car, [rightFront,leftFront,roofLF,roofRF], cabinMat);
  panel(car, [roofLR,roofRR,roofRF,roofLF], color);
  const led = new THREE.MeshStandardMaterial({ color: 0xff2532, emissive: 0xd01827, emissiveIntensity: 1.24 });
  for (const side of [-1,1]) {
    for (const z of [-1.41,1.36]) {
      attach(car, tireGeo, rubber, side*.84,.343,z,.9,.9,.9).rotation.z = Math.PI/2;
      attach(car, cylinder, alloy, side*.97,.343,z,.22,.031,.22).rotation.z = Math.PI/2;
    }
    box(car, led, side*.657,.66+height*.45,-2.098,.387,.08,.1).rotation.y = -side*.21;
    box(car, lampWhite, side*.704,.595,2.032,.32,.057,.051);
  }
  box(car, black, 0,.36,-2.156,1.5,.098,.042);
  box(car, silver, 0,.537,-2.159,.27,.107,.022);
  const contact = attach(root, aspectBadge, shadowMat, 0,.031,0,3.4,5.5,1);
  contact.rotation.x = -Math.PI / 2;
  batchPanels(car);
  for (const part of car.children) {
    if (!part.isMesh || part.material.emissive?.getHex()) continue;
    part.castShadow = true;
    part.receiveShadow = true;
  }
  scene.add(root);
  return { root, lane: 0, z: 0, speed: 0, brakeLight: led };
}
