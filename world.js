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
const fogCoastColor = new THREE.Color(0xc99c8e);
const fogValleyColor = new THREE.Color(0x8e8099);
const fogViaductColor = new THREE.Color(0xb9827c);
scene.fog = new THREE.FogExp2(0xc99c8e, .00138);
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
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector('#stage').append(renderer.domElement);
const sunDirection = vector(-.48, .205, 1).normalize();
const sun = new THREE.DirectionalLight(0xffbe82, 3.35);
sun.castShadow = true;
Object.assign(sun.shadow.camera,{left:-32,right:32,top:24,bottom:-24,near:75,far:245});
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.mapSize.set(2048,2048);
sun.shadow.normalBias = .022;
sun.shadow.bias = -.00014;
scene.add(sun, new THREE.HemisphereLight(0x9ecbff, 0x6b4d44, 1.18));
const fill = new THREE.DirectionalLight(0xff9e75, .95);
fill.position.set(2, 5, -9);
scene.add(fill);

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { sunDir: { value: sunDirection }, valley: { value: 0 }, viaduct: { value: 0 } },
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
    uniform float viaduct;
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
      float azGlow=max(dot(normalize(d.xz+1e-5),normalize(sunDir.xz)),0.);
      vec3 coastHorizon=vec3(.74,.38,.25);
      vec3 valleyHorizon=vec3(.52,.38,.46);
      vec3 viaductHorizon=vec3(.78,.36,.31);
      vec3 horizon=mix(mix(coastHorizon,valleyHorizon,valley),viaductHorizon,viaduct);
      vec3 midGlow=mix(vec3(.48,.23,.33),vec3(.34,.24,.42),valley*.7);
      vec3 zenith=mix(vec3(.042,.168,.395),vec3(.038,.135,.335),valley);
      vec3 sky=mix(horizon,midGlow,pow(smoothstep(0.,.28,h),.62));
      sky=mix(sky,zenith,pow(smoothstep(.08,.74,h),.46));
      sky+=vec3(.46,.16,.09)*exp(-14.*h)*(.28+.72*pow(azGlow,2.4));
      sky+=vec3(1.62,.52,.155)*pow(hot,18.)*(.66+.34*exp(-6.5*h));
      sky+=vec3(.92,.31,.22)*pow(hot,6.)*exp(-4.5*h)*.42;
      sky+=vec3(3.85,1.38,.54)*pow(hot,340.);
      sky+=vec3(13.5,8.1,3.5)*smoothstep(.99952,.99975,hot);
      vec2 uv=d.xz/(h+.112)*1.42;
      float billow=fractal(uv+vec2(9.2,3.4));
      float highWisp=fractal(uv*2.35+vec2(-4.1,7.8));
      float cloud=smoothstep(.49,.66,billow)*smoothstep(.012,.095,h)*(.84+.16*noise(uv*4.2));
      float cirrus=smoothstep(.58,.76,highWisp)*smoothstep(.06,.32,h)*(1.-smoothstep(.35,.68,h))*.42;
      float lining=smoothstep(.032,.33,billow-fractal(uv+.145*sunDir.xz));
      vec3 darkCloud=mix(vec3(.20,.125,.22),vec3(.16,.13,.23),valley);
      vec3 rimCloud=mix(vec3(1.68,.58,.30),vec3(1.82,.48,.34),viaduct*.6);
      vec3 cloudColor=mix(darkCloud,rimCloud,clamp(pow(hot,6.)*.46+lining*1.08,0.,1.));
      sky=mix(sky,cloudColor,cloud*.83);
      vec3 cirrusColor=mix(vec3(.48,.31,.39),vec3(1.45,.66,.38),clamp(pow(hot,4.)*.65+.25,0.,1.));
      sky=mix(sky,cirrusColor,cirrus);
      sky=mix(sky,horizon*.84,(1.-smoothstep(-.16,.012,d.y)));
      float coastAngle=atan(d.x,d.z);
      vec2 dir = vec2(cos(coastAngle),sin(coastAngle));
      float farRidge=.046+.145*fractal(dir*8.8)+.028*sin(coastAngle*14.);
      float midRidge=.016+.095*fractal(dir*17.5+77.)+.021*sin(coastAngle*11.+1.);
      float nearRidge=.004+.052*fractal(dir*29.+31.)+.012*sin(coastAngle*19.+2.4);
      vec3 farCol=mix(vec3(.56,.38,.39),vec3(.44,.35,.43),valley)+vec3(.22,.08,.03)*pow(azGlow,3.);
      vec3 midCol=mix(vec3(.34,.29,.36),vec3(.27,.26,.35),valley)+vec3(.12,.04,.02)*pow(azGlow,4.);
      vec3 nearCol=mix(vec3(.21,.19,.26),vec3(.17,.18,.25),valley);
      float farMask=1.-smoothstep(farRidge-.0018,farRidge+.0018,d.y);
      float midMask=1.-smoothstep(midRidge-.0015,midRidge+.0015,d.y);
      float nearMask=1.-smoothstep(nearRidge-.0012,nearRidge+.0012,d.y);
      sky=mix(sky,mix(farCol,horizon,exp(-24.*max(d.y,0.))*.38),.76*farMask);
      sky=mix(sky,midCol,.72*midMask);
      sky=mix(sky,nearCol,.64*nearMask);
      gl_FragColor=vec4(sky,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3800, 32, 18), skyMat);
sky.frustumCulled = false;
sky.renderOrder = -2;
scene.add(sky);

// High-contrast studio PMREM environment reflection probe for automotive clearcoat & glass.
const studio = new THREE.Scene();
studio.background = new THREE.Color(0x263854);
const reflectionSky = sky.clone();
reflectionSky.scale.setScalar(.007);
studio.add(reflectionSky);
const reflectedGround = new THREE.Mesh(new THREE.CircleGeometry(24,48),new THREE.MeshBasicMaterial({color:0x1b1f24}));
reflectedGround.rotation.x=-Math.PI/2;
reflectedGround.position.y=-1.8;
studio.add(reflectedGround);
const horizonBand = new THREE.Mesh(
  new THREE.CylinderGeometry(21, 21, 3.8, 48, 1, true),
  new THREE.MeshBasicMaterial({ color: new THREE.Color(2.15, .92, .52), side: THREE.DoubleSide })
);
horizonBand.position.y = .75;
studio.add(horizonBand);
const softbox = new THREE.Mesh(new THREE.PlaneGeometry(24, 7.6),
  new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 1.82, .88), side: THREE.DoubleSide }));
softbox.position.set(-11, 5.2, 12);
softbox.lookAt(0, 0, 0);
studio.add(softbox);
const rimCard = new THREE.Mesh(new THREE.PlaneGeometry(20, 5.8),
  new THREE.MeshBasicMaterial({ color: new THREE.Color(1.95, .82, .58), side: THREE.DoubleSide }));
rimCard.position.set(12, 4.2, -11);
rimCard.lookAt(0, 0, 0);
studio.add(rimCard);
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(42, 24),
  new THREE.MeshBasicMaterial({ color: 0x8cb4e6, side: THREE.DoubleSide }));
ceiling.position.set(0, 16, 0);
ceiling.rotation.x = Math.PI / 2;
studio.add(ceiling);
const generator = new THREE.PMREMGenerator(renderer);
scene.environment = generator.fromScene(studio, .12, .1, 100).texture;
scene.environmentIntensity = 1.08;
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
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const data = context.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const base = 98 + rand(i * 2.88) * 54;
    const aggregate = rand(i * 7.2) > .965 ? 46 : (rand(i * 5.1) < .06 ? -24 : 0);
    const p = clamp(base + aggregate, 52, 235);
    data.data.set([p, p * .97, p * .95, 255], i * 4);
  }
  context.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
const asphalt = material(0x888f94, .82, .04);
asphalt.map = grainTexture();
asphalt.onBeforeCompile = shader => {
  shader.uniforms.sunDir = { value: sunDirection };
  shader.vertexShader = 'varying vec2 paving; varying vec3 vAsphaltWorld;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\npaving = uv * 4.;\nvAsphaltWorld = (modelMatrix * vec4(position, 1.)).xyz;');
  shader.fragmentShader = 'uniform vec3 sunDir; varying vec2 paving; varying vec3 vAsphaltWorld;\n' + shader.fragmentShader
    .replace('#include <color_fragment>', `
    #include <color_fragment>
    float lane = mod(paving.x+2.025,4.05)-2.025;
    float tracks = exp(-pow((abs(lane)-.82)*2.95,2.));
    float centerWear = exp(-pow(lane*1.4,2.));
    float microGrit = fract(sin(dot(floor(paving*42.),vec2(127.1,311.7)))*43758.5453);
    float joint = abs(mod(paving.y+.12*sin(paving.x*2.8)+.07*sin(paving.x*6.1),31.)-15.5);
    float skid = sin(paving.y*.058+paving.x*.19)*.5+.5;
    diffuseColor.rgb *= (1.-.26*tracks+.04*centerWear)*(.92+.13*skid)+(.035*(microGrit-.5));
    diffuseColor.rgb *= mix(.39,1.,smoothstep(.012,max(.045,fwidth(paving.y)),joint));
    diffuseColor.rgb += vec3(.018,.016,.015)*exp(-abs(abs(paving.x)-5.9)*1.25);
    float tar = abs(abs(paving.x)-4.94-.14*sin(paving.y*.46)-.09*sin(paving.y*1.17));
    float tar2 = abs(abs(paving.x)-2.025-.08*sin(paving.y*.31+.7)-.05*cos(paving.y*.89));
    float tarLine = (1.-smoothstep(.011,max(.038,fwidth(paving.x)),tar))*smoothstep(.14,.58,sin(paving.y*.081))
      + .75*(1.-smoothstep(.009,max(.032,fwidth(paving.x)),tar2))*smoothstep(.25,.72,cos(paving.y*.063));
    diffuseColor.rgb *= 1.-.38*clamp(tarLine,0.,1.);
    vec3 viewDirW = normalize(cameraPosition - vAsphaltWorld);
    float ndotv = clamp(viewDirW.y, .002, 1.);
    float fresnel = pow(1. - ndotv, 3.4);
    vec3 sunRefl = reflect(-normalize(sunDir), vec3(0., 1., 0.));
    float specAlign = max(dot(sunRefl, viewDirW), 0.);
    float roadSheen = (pow(specAlign, 12.) * .42 + pow(specAlign, 56.) * .92) * (.38 + .62 * fresnel);
    float trackPolish = .82 + .78 * tracks + .45 * clamp(tarLine, 0., 1.) + .22 * (microGrit - .5);
    diffuseColor.rgb += vec3(1.08, .56, .24) * roadSheen * trackPolish * .38;
    diffuseColor.rgb += vec3(.38, .22, .14) * fresnel * pow(max(dot(viewDirW, -normalize(sunDir)), 0.), 3.5) * (.28 + .46 * tracks);
  `)
    .replace('#include <roughnessmap_fragment>', `
    #include <roughnessmap_fragment>
    float rLane = mod(paving.x+2.025,4.05)-2.025;
    float rTracks = exp(-pow((abs(rLane)-.82)*2.95,2.));
    roughnessFactor *= clamp(.94 - .24 * rTracks, .44, 1.);
  `);
};
const shoulder = material(0x454245, .89, .05);
shoulder.map = asphalt.map;
shoulder.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec2 vShoulderUV;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvShoulderUV = uv * 4.;');
  shader.fragmentShader = 'varying vec2 vShoulderUV;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
    #include <color_fragment>
    float edgeDist = abs(vShoulderUV.x);
    float rumble = step(.62, fract(vShoulderUV.y * 1.4)) * smoothstep(6.18, 6.32, edgeDist) * (1. - smoothstep(6.48, 6.62, edgeDist));
    float gravel = .88 + .24 * fract(sin(dot(floor(vShoulderUV * 26.), vec2(91.7, 211.3))) * 43758.5453);
    diffuseColor.rgb *= gravel * (1. - .22 * rumble) * (1. - .18 * smoothstep(6.8, 7.35, edgeDist));
  `);
};
const whiteLine = material(0xe8dfc4, .76);
const goldLine = material(0xf4ad49, .78);
const soil = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, side: THREE.DoubleSide });
soil.onBeforeCompile = shader => {
  shader.uniforms.rockMap = { value: hillsideDetail };
  shader.uniforms.sunDir = { value: sunDirection };
  shader.vertexShader = 'varying vec3 earthUV;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nearthUV = position;');
  shader.fragmentShader = 'uniform sampler2D rockMap; uniform vec3 sunDir; varying vec3 earthUV;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
    #include <color_fragment>
    vec2 st = vec2(earthUV.x+.71*earthUV.z,earthUV.y+.23*earthUV.z);
    float grain = texture2D(rockMap,st*.042).r;
    float mottling = texture2D(rockMap,st*.0085).r;
    vec3 faceN = normalize(cross(dFdx(earthUV),dFdy(earthUV)));
    if (faceN.y < 0.) faceN = -faceN;
    float escarpment = smoothstep(.14,.62,1.-abs(faceN.y));
    float strata = sin(st.y*2.35+2.2*sin(st.x*.16)+mottling*22.)*.65 + .35*cos(st.y*5.6-st.x*.28);
    float crevice = smoothstep(.35,-.45,strata)*escarpment;
    float valleyAO = mix(.68,1.,smoothstep(-22.,14.,earthUV.y))*(1.-.26*crevice);
    float sunSlope = pow(max(dot(faceN,normalize(sunDir)),0.),1.45);
    vec3 cliffRock = mix(vec3(.20,.18,.18),vec3(.34,.27,.23),smoothstep(-.6,.7,strata));
    diffuseColor.rgb = mix(diffuseColor.rgb,cliffRock,escarpment*.86);
    diffuseColor.rgb *= (.42+.68*grain+.62*mottling)*valleyAO;
    diffuseColor.rgb += vec3(.22,.11,.05)*sunSlope*(.45+.55*escarpment);
  `);
};
const waterUniforms = { uTime: { value: 0 }, sunDir: { value: sunDirection } };
const water = new THREE.MeshStandardMaterial({ color: 0x3b597a, roughness: .25, metalness: .46, side: THREE.DoubleSide });
water.onBeforeCompile = shader => {
  shader.uniforms.uTime = waterUniforms.uTime;
  shader.uniforms.sunDir = waterUniforms.sunDir;
  shader.vertexShader = 'varying vec3 worldPoint; varying float vShoreX;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nworldPoint = (modelMatrix * vec4(position,1.)).xyz;\nvShoreX = position.x - 695.;');
  shader.fragmentShader = 'uniform float uTime; uniform vec3 sunDir; varying vec3 worldPoint; varying float vShoreX;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
    #include <color_fragment>
    float t = uTime;
    float swell1 = sin(worldPoint.z*1.12 + t*1.35 + sin(worldPoint.x*.17 + t*.38)*1.9);
    float swell2 = sin(worldPoint.z*.33 - worldPoint.x*.55 - t*1.08);
    float ripple = sin(worldPoint.z*2.65 + worldPoint.x*1.85 + t*2.7)*cos(worldPoint.z*1.6 - worldPoint.x*2.1 - t*2.1);
    float wave = swell1 * swell2 + .26 * ripple;
    vec3 viewW = normalize(cameraPosition - worldPoint);
    float fresnel = pow(1. - clamp(viewW.y, 0., 1.), 3.1);
    float glint = exp(-abs(worldPoint.x + 151.) * .0115);
    float azAlign = pow(max(dot(normalize(sunDir.xz), normalize(-viewW.xz + 1e-5)), 0.), 11.);
    float sunPath = max(glint, azAlign * .88);
    diffuseColor.rgb *= .72 + .23 * wave;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.48, .33, .35), fresnel * .42);
    float sparkle = pow(max(wave, 0.), 4.6) + .62 * pow(max(ripple, 0.), 7.);
    diffuseColor.rgb += vec3(.86, .34, .13) * sparkle * sunPath * .68;
    diffuseColor.rgb += vec3(1.65, .86, .40) * pow(max(wave + .22 * ripple, 0.), 10.) * sunPath * .55;
    float shoreZone = max(smoothstep(-35., -7., worldPoint.x), smoothstep(0., 28., vShoreX));
    float surf = .5 + .5 * sin(worldPoint.z*.21 - worldPoint.x*.62 - t*1.75 + sin(worldPoint.z*.08)*2.4);
    float foam = shoreZone * smoothstep(.42, .84, surf + .38 * shoreZone);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.24, .45, .50), shoreZone * .36);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.93, .85, .77), clamp(foam * .66, 0., .74));
  `);
};
const guard = material(0x98a1a5, .36, .64);
guard.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec3 vGuardPos;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvGuardPos = position;');
  shader.fragmentShader = 'varying vec3 vGuardPos;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
    #include <color_fragment>
    float wRib = cos(vGuardPos.y * 18.849);
    float patina = .92 + .12 * wRib;
    diffuseColor.rgb *= patina;
  `);
};
const posts = material(0x454148, .72, .18);
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
const rockMat = material(0x9d8980, .94);
const reflector = new THREE.MeshStandardMaterial({ color: 0xffd08b, emissive: 0xc85814, emissiveIntensity: .85 });
const greenSign = material(0x234947, .62);
const size = 160;
const chunks = new Map();
const dummy = new THREE.Object3D();
const groundColor = new THREE.Color();
const dryColor = new THREE.Color(0x747646);
const stoneColor = new THREE.Color(0x666171);
const pineColor = new THREE.Color(0x3f5b37);
const coastColor = new THREE.Color(0x7e7449);

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
  inst.castShadow = mat !== whiteLine && mat !== reflector && !mat.transparent;
  inst.receiveShadow = !mat.transparent;
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
function updateWorld(z, now = 0) {
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
  const timeSec = (now || 0) * .001;
  waterUniforms.uTime.value = timeSec;
  if (typeof beaconMat !== 'undefined') beaconMat.emissiveIntensity = 3.4 + 1.2 * Math.sin(timeSec * 3.8);
  const valley = valleyAt(z);
  const nearestBridge = Math.max(10000, Math.round((z - 320) / 10000) * 10000);
  const viaduct = smooth(nearestBridge - 850, nearestBridge - 40, z)
    * (1 - smooth(nearestBridge + 680, nearestBridge + 1250, z));
  skyMat.uniforms.valley.value = valley;
  skyMat.uniforms.viaduct.value = viaduct;
  scene.fog.color.copy(fogCoastColor).lerp(fogValleyColor, valley).lerp(fogViaductColor, viaduct);
  scene.fog.density = mix(mix(.00138, .00142, valley), .00125, viaduct);
}
