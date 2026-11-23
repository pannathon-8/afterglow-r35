const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rand = n => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
};
const vector = (x, y, z) => new THREE.Vector3(x, y, z);
const material = (color, roughness = .78, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xc2a5a0, .00148);
const camera = new THREE.PerspectiveCamera(59, 1, .06, 6500);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
let frameAverage=1/60, scaleCheck=0;
function updateRenderScale(seconds,now){
  if(seconds<=0||seconds>.65)return;
  frameAverage=mix(frameAverage,seconds,.065);
  if(now<scaleCheck)return;
  const current=renderer.getPixelRatio(), ceiling=Math.min(devicePixelRatio||1,1.5);
  let next=current;
  if(frameAverage>.036)next=Math.max(.65,current-.15);
  else if(frameAverage<.018)next=Math.min(ceiling,current+.1);
  if(Math.abs(next-current)>.02)renderer.setPixelRatio(next);
  scaleCheck=now+2400;
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#stage').append(renderer.domElement);
const sunDirection = vector(-.48, .205, 1).normalize();
const sun = new THREE.DirectionalLight(0xffcc98, 3.05);
sun.castShadow = true;
Object.assign(sun.shadow.camera,{left:-36,right:36,top:28,bottom:-28,near:95,far:265});
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.mapSize.set(1024,1024);
sun.shadow.normalBias = .035;
sun.shadow.bias = -.00018;
scene.add(sun, new THREE.HemisphereLight(0xbddfff, 0x7d6659, 1.26));
const fill = new THREE.DirectionalLight(0xffc6a0, .85);
fill.position.set(2, 5, -9);
scene.add(fill);

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { sunDir: { value: sunDirection }, valley: { value: 0 } },
  vertexShader: `
    varying vec3 ray;
    void main() {
      ray = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
    }`,
  fragmentShader: `
    varying vec3 ray;
    uniform vec3 sunDir;
    uniform float valley;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
    }
    float fractal(vec2 p){
      return .53*noise(p)+.25*noise(p*2.13)+.12*noise(p*4.51)+.065*noise(p*9.1)+.033*noise(p*18.2);
    }
    void main(){
      vec3 d=normalize(ray);
      float h=max(d.y,0.);
      float hot=max(dot(d,sunDir),0.);
      vec3 horizon=mix(vec3(.67,.39,.26),vec3(.53,.40,.44),valley);
      vec3 sky=mix(horizon,vec3(.054,.205,.414),pow(smoothstep(0.,.66,h),.35));
      sky+=vec3(1.5,.48,.145)*pow(hot,26.)*(.65+.35*exp(-7.*h));
      sky+=vec3(3.5,1.25,.51)*pow(hot,380.);
      sky+=vec3(12.,7.,3.)*smoothstep(.99955,.99974,hot);
      vec2 uv=d.xz/(h+.115)*1.45;
      float billow=fractal(uv+vec2(9.2,3.4));
      float cloud=smoothstep(.51,.66,billow)*smoothstep(.013,.09,h)*(.84+.16*noise(uv*4.));
      float lining=smoothstep(.037,.34,billow-fractal(uv+.14*sunDir.xz));
      vec3 cloudColor=mix(vec3(.21,.133,.22),vec3(1.55,.53,.29),clamp(pow(hot,8.)*.42+lining,0.,1.));
      sky=mix(sky,cloudColor,cloud*.81);
      sky=mix(sky,horizon*.86,smoothstep(.012,-.16,d.y));
      float coastAngle=atan(d.x,d.z);
      vec2 dir = vec2(cos(coastAngle),sin(coastAngle));
      float farRidge=.04+.14*fractal(dir*9.)+.027*sin(coastAngle*14.);
      float midRidge=.012+.09*fractal(dir*18.+77.)+.02*sin(coastAngle*11.+1.);
      sky=mix(sky,vec3(.54,.385,.386),.72*(1.-smoothstep(farRidge-.001,farRidge+.001,d.y)));
      sky=mix(sky,vec3(.325,.308,.368),.65*(1.-smoothstep(midRidge-.001,midRidge+.001,d.y)));
      gl_FragColor=vec4(sky,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`.replace('smoothstep(.012,-.16,d.y)','(1.-smoothstep(-.16,.012,d.y))')
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3800, 32, 18), skyMat);
sky.frustumCulled = false;
sky.renderOrder = -2;
scene.add(sky);

// A small studio reflection probe adds a soft horizon line to the car's paint.
const studio = new THREE.Scene();
studio.background = new THREE.Color(0x374862);
const reflectionSky = sky.clone();
reflectionSky.scale.setScalar(.007);
studio.add(reflectionSky);
const reflectedGround = new THREE.Mesh(new THREE.CircleGeometry(22,48),new THREE.MeshBasicMaterial({color:0x282d31}));
reflectedGround.rotation.x=-Math.PI/2;
reflectedGround.position.y=-1.8;
studio.add(reflectedGround);
const softbox = new THREE.Mesh(new THREE.PlaneGeometry(22, 7),
  new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 1.5, .8), side: THREE.DoubleSide }));
softbox.position.set(-11, 5, 12);
softbox.lookAt(0, 0, 0);
studio.add(softbox);
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(40, 22),
  new THREE.MeshBasicMaterial({ color: 0x99b6da, side: THREE.DoubleSide }));
ceiling.position.set(0, 16, 0);
ceiling.rotation.x = Math.PI / 2;
studio.add(ceiling);
const generator = new THREE.PMREMGenerator(renderer);
scene.environment = generator.fromScene(studio, .14, .1, 100).texture;
scene.environmentIntensity = .93;
generator.dispose();

const roadWidth = 6.45;
const laneCenters = [-4.05, 0, 4.05];
const center = z => 67 * Math.sin(z / 445) + 23 * Math.sin(z / 178) + 84 * Math.sin(z / 1420);
const grade = z => 2.8 * Math.sin(z / 230) + 6.8 * Math.sin(z / 710);
const yawAt = z => Math.atan2(center(z + 1) - center(z - 1), 2);
const valleyAt = z => smooth(3700, 10000, z);
const bridgeStartAt = z => Math.max(0,Math.floor(z/10000)*10000);
const groundOffsets=[-780,-600,-470,-355,-265,-190,-140,-100,-73,-53,-38,-26,-17,-11,-7.3,
  7.3,11,17,26,38,53,73,100,140,190,265,355,470,600,780];
const terrainHeight = (x, z) => {
  const bank = x > 0 ? x : -x;
  const valley = valleyAt(z);
  const ridge = Math.sin(z * .005 + x * .038) * .28
    + Math.sin(z * .011 - x * .009) * .16 + Math.sin(z * .0018 + x * .013) * .46 + 1;
  const hill = smooth(10, 70, bank) * 16 * ridge
    + smooth(48, 460, bank) * (120 + 57 * valley) * ridge;
  const coast = -smooth(9, 96, bank) * (10 + 19 * ridge);
  const cliff = smooth(17,90,bank)*(Math.sin(z*.052+x*.051)*1.9
    + Math.sin(z*.021-x*.255)*1.2+4*Math.abs(Math.sin(z*.033+x*.069)));
  const nearest = Math.max(10000,Math.round((z-320)/10000)*10000);
  const gorge = smooth(nearest-100,nearest+80,z)*(1-smooth(nearest+570,nearest+740,z));
  const spurs=smooth(48,270,bank)*(14*Math.abs(Math.sin(z*.019+x*.037))+
    11*Math.sin(z*.029-x*.015)*Math.cos(z*.009+x*.043));
  return grade(z) - .2 + (x > 0 ? hill+cliff+spurs : mix(coast, hill * .75+cliff+spurs, valley))
    - gorge*48*(1-smooth(55,250,bank));
};
// Match the triangles under a prop even where the analytic hillside bends sharply between vertices.
function surfaceHeight(x,z){
  const j=groundOffsets.findIndex(p=>p>=x);
  if(j<=0)return terrainHeight(x,z);
  const a=groundOffsets[j-1],b=groundOffsets[j],z0=Math.floor(z/8)*8;
  const u=(x-a)/(b-a),v=(z-z0)/8;
  const p=terrainHeight(a,z0+8),q=terrainHeight(b,z0);
  return u+v<=1 ? (1-u-v)*terrainHeight(a,z0)+v*p+u*q :
    (1-u)*p+(1-v)*q+(u+v-1)*terrainHeight(b,z0+8);
}
function landscapeTexture(){
  const size=256,canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d'), pixels=ctx.createImageData(size,size);
  const grid=Float32Array.from({length:size*size},(_,i)=>rand(i+12.56));
  function noise(x,y,n){
    const a=x*n/size,b=y*n/size, ix=Math.floor(a),iy=Math.floor(b);
    const u=a-ix,v=b-iy, sx=u*u*(3-2*u),sy=v*v*(3-2*v);
    const sample=(i,j)=>grid[(i%n)+(j%n)*size];
    return mix(mix(sample(ix,iy),sample(ix+1,iy),sx),mix(sample(ix,iy+1),sample(ix+1,iy+1),sx),sy);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const a=noise(x,y,8),b=noise(x,y,32),c=noise(x,y,64),i=y*size+x;
    const n=clamp(110+(a-.5)*192+(b-.5)*107+(c-.5)*61+(grid[i]-.5)*30,0,255);
    pixels.data.set([n,n,n,255],i*4);
  }
  ctx.putImageData(pixels,0,0);
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}
const hillsideDetail=landscapeTexture();
function grainTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const data = context.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) {
    const p = 105 + rand(i * 2.88) * 51 + (rand(i * 7.2) > .99 ? 43 : 0);
    data.data.set([p, p * .97, p * .96, 255], i * 4);
  }
  context.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
const asphalt = material(0x90979a, .86);
asphalt.map = grainTexture();
asphalt.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec2 paving;\n'+shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\npaving = uv * 4.;');
  shader.fragmentShader = 'varying vec2 paving;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
    #include <color_fragment>
    float lane = mod(paving.x+2.025,4.05)-2.025;
    float tracks=exp(-pow((abs(lane)-.82)*2.8,2.));
    float joint=abs(mod(paving.y+.12*sin(paving.x*2.8)+.07*sin(paving.x*6.1),31.)-15.5);
    float skid=sin(paving.y*.058+paving.x*.19)*.5+.5;
    diffuseColor.rgb *= (1.-.23*tracks)*(.94+.12*skid);
    diffuseColor.rgb *= mix(.43,1.,smoothstep(.012,max(.045,fwidth(paving.y)),joint));
    diffuseColor.rgb += vec3(.012,.012,.013)*exp(-abs(abs(paving.x)-5.9)*1.2);
    float tar=abs(abs(paving.x)-4.94-.14*sin(paving.y*.46)-.09*sin(paving.y*1.17));
    diffuseColor.rgb*=1.-.35*(1.-smoothstep(.012,max(.039,fwidth(paving.x)),tar))
      *smoothstep(.16,.6,sin(paving.y*.081));
  `);
};
const shoulder = material(0x4b484a, .91);
const whiteLine = material(0xe0d7ba, .86);
const goldLine = material(0xefa744, .88);
const soil = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
soil.onBeforeCompile = shader => {
  shader.uniforms.rockMap={value:hillsideDetail};
  shader.vertexShader = 'varying vec3 earthUV;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nearthUV = position;');
  shader.fragmentShader = 'uniform sampler2D rockMap; varying vec3 earthUV;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
    #include <color_fragment>
    vec2 st=vec2(earthUV.x+.71*earthUV.z,earthUV.y+.23*earthUV.z);
    float grain = texture2D(rockMap,st*.037).r;
    float mottling = texture2D(rockMap,st*.008).r;
    float escarpment=smoothstep(.15,.65,1.-abs(normalize(cross(dFdx(earthUV),dFdy(earthUV))).y));
    float strata = sin(st.y*2.1+2.*sin(st.x*.15)+mottling*21.);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.23,.209,.196)*(.89+.11*strata),escarpment*.84);
    diffuseColor.rgb*=.44+.68*grain+.64*mottling;
  `);
};
const water = new THREE.MeshStandardMaterial({ color: 0x435f80, roughness: .35, metalness: .39, side: THREE.DoubleSide });
water.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec3 worldPoint;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nworldPoint = (modelMatrix * vec4(position,1.)).xyz;');
  shader.fragmentShader = 'varying vec3 worldPoint;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
    #include <color_fragment>
    float wave = sin(worldPoint.z*1.2 + sin(worldPoint.x*.17)*1.8)
      * sin(worldPoint.z*.32-worldPoint.x*.57);
    float glint = exp(-abs(worldPoint.x + 151.) * .013);
    diffuseColor.rgb *= .74 + .22 * wave;
    diffuseColor.rgb += vec3(.39,.128,.055)*pow(max(wave,0.),5.)*glint;
  `);
};
const guard = material(0x8b9294, .48, .42);
const posts = material(0x454148);
const bark = material(0x56443c);
function pineNeedles() {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  const stroke = (x, y, u, v, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(u, v);
    ctx.stroke();
  };
  stroke(96, 314, 96, 7, 4, '#5f5049');
  for (let i=0;i<520;i++) {
    const f = rand(i+.1);
    const y = 7 + f*269;
    const sign = i%2 ? 1 : -1;
    const span = (3 + 88 * Math.pow(f,.84)) * (.21+.76*rand(i+.3));
    const end = 96 + sign*span;
    const tip = y + 3 + span*(.35+.18*rand(i+.4));
    const color = ['#334941','#415442','#536446','#65734d','#475e4b'][i%5];
    stroke(96, y, end, tip, 1.2+1.5*f, color);
    for (let k=1;k<=8;k++){
      const t=k/9, spread=(2.2+6*f)*(1-t*.64);
      stroke(mix(96,end,t),mix(y,tip,t),mix(96,end,t)+sign*spread,mix(y,tip,t)-spread*1.18,2.6,color);
    }
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshLambertMaterial({ map:t, alphaTest:.36, side:THREE.DoubleSide });
}
const treeMat = pineNeedles();
const rockMat = material(0x9d8980, 1);
const reflector = new THREE.MeshStandardMaterial({ color: 0xffd08b, emissive: 0xb75010, emissiveIntensity: .65 });
const greenSign = material(0x234947, .66);
const size = 160;
const chunks = new Map();
const dummy = new THREE.Object3D();
const groundColor = new THREE.Color();
const dryColor = new THREE.Color(0x717547);
const stoneColor = new THREE.Color(0x686372);
const pineColor = new THREE.Color(0x435d39);
const coastColor = new THREE.Color(0x7b754b);

function meshFrom(group, positions, indices, material, uv, colors) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
function ribbon(group, start, stop, x1, x2, step, mat, rise = .008) {
  const count = Math.ceil((stop - start) / step);
  const p = [], uv = [], faces = [];
  for (let i = 0; i <= count; i++) {
    const z = mix(start, stop, i / count);
    const x = center(z);
    const y = grade(z) + rise;
    p.push(x + x1, y, z - start, x + x2, y, z - start);
    uv.push(x1 / 4, z / 4, x2 / 4, z / 4);
    if (i) faces.push(2*i-2, 2*i, 2*i-1, 2*i-1, 2*i, 2*i+1);
  }
  meshFrom(group, p, faces, mat, uv).position.z = start - group.userData.start;
}
function batch(group, geometries, records, mat) {
  if (!records.length) return;
  const inst = new THREE.InstancedMesh(geometries, mat, records.length);
  inst.castShadow = mat !== whiteLine && mat !== reflector;
  inst.receiveShadow = true;
  records.forEach(([x, y, z, sx, sy, sz, yaw, color], index) => {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(0, yaw, 0);
    dummy.updateMatrix();
    inst.setMatrixAt(index, dummy.matrix);
    if (color !== undefined) inst.setColorAt(index, new THREE.Color(color));
  });
  group.add(inst);
}
const boxGeo = new THREE.BoxGeometry();
const treeGeo = new THREE.PlaneGeometry(1,1);
const trunkGeo = new THREE.CylinderGeometry(.57, 1, 1, 6);
const stoneGeo = new THREE.IcosahedronGeometry(1,2);
{
  const pts=stoneGeo.attributes.position;
  for(let i=0;i<pts.count;i++){
    const x=pts.getX(i),y=pts.getY(i),z=pts.getZ(i);
    const cut=.89+.105*Math.sin(x*6+z*3)*Math.cos(y*7.5);
    pts.setXYZ(i,x*cut,Math.min(.77,y*cut),z*cut);
  }
  stoneGeo.computeVertexNormals();
}
function makeChunk(id) {
  const group = new THREE.Group();
  const start = id * size;
  const stop = start + size;
  group.userData.start = start;
  const p = [], c = [], faces = [];
  const offsets = groundOffsets;
  const rows = 20;
  for (let j = 0; j <= rows; j++) {
    const z = start + j * size / rows;
    offsets.forEach((offset, i) => {
      const n = j * offsets.length + i;
      const y = terrainHeight(offset, z);
      const pattern = .5 + .5 * Math.sin(z * .191 + offset * 2.73);
      groundColor.copy(offset < 0 ? coastColor : dryColor)
        .lerp(pineColor, valleyAt(z) * .65)
        .lerp(stoneColor, smooth(12, 105, y) * (.35 + pattern * .43))
        .multiplyScalar(.79 + pattern * .39);
      p.push(center(z) + offset, y, z - start);
      c.push(groundColor.r, groundColor.g, groundColor.b);
      if (i && j && i !== 15) {
        const above = n - offsets.length;
        faces.push(above - 1, n - 1, above, above, n - 1, n);
      }
    });
  }
  meshFrom(group, p, faces, soil, null, c);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1450, size), water);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-730 + center(start + size / 2), -13.6, size / 2);
  group.add(sea);
  ribbon(group, start, stop, -7.35, 7.35, 8, shoulder, -.018);
  ribbon(group, start, stop, -roadWidth, roadWidth, 8, asphalt);
  ribbon(group, start, stop, -6.12, -6.02, 8, whiteLine, .024);
  ribbon(group, start, stop, 6.02, 6.13, 8, goldLine, .024);
  const dashes = [], rails = [], legs = [], reflects = [], trees = [], trunks = [], rocks = [], signs = [];
  for (let z = start + 4; z < stop; z += 8) {
    const x = center(z), y = grade(z), yaw = yawAt(z);
    if ((Math.floor(z / 8) & 1) === 0) for (const stripe of [-2.02, 2.02])
      dashes.push([x + stripe, y + .024, z - start, .112, .012, 5.7, yaw]);
    for (const side of [-1, 1]) {
      const verge = side * 7.15;
      const roadsideRail = side === -1 || Math.sin(z / 122) < .36;
      if (!roadsideRail) continue;
      rails.push([x + verge, y + .57, z - start, .13, .17, 8.05 / Math.cos(yaw), yaw]);
      legs.push([x + verge, y + .22, z - start, .13, .7, .16, yaw]);
      if ((Math.floor(z / 8) & 1) === 0)
        reflects.push([x + verge, y + .69, z - start, .12, .1, .14, yaw]);
    }
  }
  for (let i = 0; i < 66; i++) {
    const seed = id * 97 + i;
    const z = start + rand(seed + .8) * size;
    const side = rand(seed + .2) < .69 - valleyAt(z) * .2 ? 1 : -1;
    const x = side * (11 + Math.pow(rand(seed + .1), 1.8) * 250);
    const y = surfaceHeight(x, z);
    if (y < -12.5) continue;
    const worldX = center(z) + x;
    const h = 1.8 + rand(seed + .6) * 7.4;
    if (i % 5 === 0) {
      rocks.push([worldX, y + h * .1, z - start, h * .46, h * .26, h * .38, seed]);
      continue;
    }
    trunks.push([worldX, y + h * .34, z - start, h * .029, h * .69, h * .029, seed]);
    for (const angle of [0,Math.PI/2])
      trees.push([worldX,y+h*.53,z-start,h*.72,h*1.06,1,angle+seed,0xffffff]);
  }
  if (id % 4 === 1) {
    const z = start + 72;
    const x = center(z) - 9;
    legs.push([x, grade(z) + 1.3, 72, .09, 2.7, .09, 0]);
    signs.push([x, grade(z) + 2.45, 72, 1.85, .73, .09, yawAt(z)]);
  }
  batch(group, boxGeo, dashes, whiteLine);
  batch(group, boxGeo, rails, guard);
  batch(group, boxGeo, legs, posts);
  batch(group, boxGeo, reflects, reflector);
  batch(group, boxGeo, signs, greenSign);
  batch(group, trunkGeo, trunks, bark);
  batch(group, treeGeo, trees, treeMat);
  batch(group, stoneGeo, rocks, rockMat);
  roadside(group,start,stop,id);
  scene.add(group);
  return group;
}
function updateWorld(z) {
  const base = Math.floor(z / size);
  for (const [id, group] of chunks) {
    if (id >= base - 1 && id <= base + 9) continue;
    scene.remove(group);
    group.traverse(obj => {
      if (obj.isInstancedMesh) obj.dispose();
      else if (obj.geometry) obj.geometry.dispose();
    });
    chunks.delete(id);
  }
  for (let id = base - 1; id <= base + 9; id++) {
    if (!chunks.has(id)) chunks.set(id, makeChunk(id));
    chunks.get(id).position.z = id * size - z;
  }
  skyMat.uniforms.valley.value = valleyAt(z);
}
