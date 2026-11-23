// Reusable roadside geometry. Chunk positions are local in Z as the road scrolls.
function palmCrown() {
  const pos=[], colors=[];
  const green=new THREE.Color();
  function leaf(a,b,c,tone) {
    green.set(tone);
    for (const p of [a,b,c]) {pos.push(p.x,p.y,p.z);colors.push(green.r,green.g,green.b);}
  }
  for(let f=0;f<26;f++){
    const az=f*2.39996;
    const upright=f%4===0;
    const length=upright?1.9:2.5+.9*rand(f);
    const reach=upright?.62:1;
    const axis=vector(Math.sin(az),0,Math.cos(az));
    const side=vector(axis.z,0,-axis.x);
    const point=t=>axis.clone().multiplyScalar(length*reach*t)
      .addScaledVector(side,.22*Math.sin(t*Math.PI))
      .add(vector(0,(upright?2.3:1.48)*Math.sin(Math.PI*t*.85)-(upright?.3:1.48)*t*t,0));
    const tint=['#577b35','#647e43','#496a31','#799140','#496539'][f%5];
    for(let i=0;i<19;i++){
      const t=i/19, next=(i+1)/19;
      const a=point(t), b=point(next);
      const width=.06+.43*Math.pow(Math.sin(Math.PI*(.04+t*.94)),.7);
      for(const sign of [-1,1]){
        const tip=b.clone().addScaledVector(side,sign*width).addScaledVector(axis,.31);
        tip.y-=width*.7;
        const mid=a.clone().lerp(b,.65).addScaledVector(side,sign*.05);
        mid.y+=.045;
        leaf(a,mid,tip,tint);leaf(mid,b,tip,f%2?'#46632c':'#526f36');
        leaf(a,b,a.clone().addScaledVector(side,.018*sign),'#857946');
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.computeVertexNormals();
  return g;
}
const palmGeo=palmCrown();
const frondMat=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
const lampSteel=material(0x535e66,.42,.68);
const ivory=material(0xbcb9ab,.81);
const bridgeSteel=material(0xb97b56,.40,.48);
const cableSteel=material(0x9aa8ad,.35,.68);
const lit=new THREE.MeshStandardMaterial({color:0xfff4cf,emissive:0xffbd6a,emissiveIntensity:2.75,roughness:.2});
const villaLit=new THREE.MeshStandardMaterial({color:0xffe7b0,emissive:0xff9c38,emissiveIntensity:2.1,roughness:.24});
const viaductMarkerMat=new THREE.MeshStandardMaterial({color:0xffe4a8,emissive:0xff922b,emissiveIntensity:2.4,roughness:.25});
const signTrimMat=new THREE.MeshStandardMaterial({color:0xfff3d1,emissive:0xffb85e,emissiveIntensity:1.35,roughness:.3});
const beaconMat=new THREE.MeshStandardMaterial({color:0xff7566,emissive:0xff1e0d,emissiveIntensity:3.9,roughness:.2});
const labelCache=new Map();

function radialGlowTexture(inner, mid, outer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 3, 64, 64, 62);
  grad.addColorStop(0, inner);
  grad.addColorStop(.42, mid);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function coneGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,212,140,0.26)');
  grad.addColorStop(.38, 'rgba(255,168,88,0.09)');
  grad.addColorStop(1, 'rgba(255,130,50,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const lampPoolMat = new THREE.MeshBasicMaterial({
  map: radialGlowTexture('rgba(255,204,122,0.68)', 'rgba(255,152,70,0.26)', 'rgba(255,115,40,0)'),
  transparent: true, opacity: .76, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
const lampHaloMat = new THREE.MeshBasicMaterial({
  map: radialGlowTexture('rgba(255,238,188,0.92)', 'rgba(255,172,86,0.38)', 'rgba(255,125,45,0)'),
  transparent: true, opacity: .86, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
const beaconHaloMat = new THREE.MeshBasicMaterial({
  map: radialGlowTexture('rgba(255,110,85,0.95)', 'rgba(255,42,20,0.42)', 'rgba(255,18,8,0)'),
  transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
});
const lampConeMat = new THREE.MeshBasicMaterial({
  map: coneGlowTexture(),
  transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide
});
const poolGeo = new THREE.PlaneGeometry(1, 1);
poolGeo.rotateX(-Math.PI / 2);
const coneGeo = new THREE.ConeGeometry(1, 1, 14, 1, true);

function shrubTexture(){
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=144;
  const ctx=canvas.getContext('2d');
  const blobs=[];
  for(let b=0;b<36;b++){
    const theta=b*2.39996, radius=Math.sqrt(rand(b+2.1));
    const x=96+Math.cos(theta)*radius*61, y=74+Math.sin(theta)*radius*32;
    blobs.push({x,y,r:13+rand(b+.35)*19,shade:1-radius*.17+(x-96)*.0015});
  }
  blobs.sort((a,b)=>a.y-b.y);
  for(let b=0;b<blobs.length;b++){
    const {x,y,r,shade}=blobs[b];
    for(let n=0;n<175;n++){
      const id=b*181+n, a=rand(id+.63)*Math.PI*2, d=Math.sqrt(rand(id+.25));
      const dx=Math.cos(a)*d,dy=Math.sin(a)*d;
      const value=(.67+.29*dx-.33*dy+.31*rand(id+.94))*shade;
      ctx.fillStyle='rgb('+[62,81,42].map(v=>Math.round(v*value)).join(',')+')';
      ctx.beginPath();ctx.ellipse(x+dx*r,y+dy*r*.88,2.1+rand(id+.49)*1.5,1.4,dx,0,2*Math.PI);ctx.fill();
    }
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,alphaTest:.4});
}
const shrubMat=shrubTexture();
const towerBody=new THREE.CylinderGeometry(.76,1,1,24);
const towerBand=material(0xb15241,.71);
const towerRoof=new THREE.ConeGeometry(1,1,16);
const balconyGlass=material(0x4b6370,.20,.58);
function coastalStation(group,z){
  const s=z-group.userData.start;
  const x=center(z)-42,y=terrainHeight(-42,z);
  batch(group,trunkGeo,[[x,y+.25,s,7.8,3.1,7.8,0],[x,y+1.8,s,4.8,1.5,4.8,0]],rockMat);
  batch(group,towerBody,[[x,y+9.4,s,2,16.8,2,0]],ivory);
  batch(group,towerBody,[[x,y+12.8,s,1.7,2.7,1.7,0],[x,y+6.8,s,1.88,2.5,1.88,0]],towerBand);
  batch(group,towerBody,[[x,y+18.1,s,2.24,.62,2.24,0],[x,y+18.55,s,2.32,.18,2.32,0],[x,y+20.9,s,1.74,.34,1.74,0]],lampSteel);
  batch(group,towerBody,[[x,y+19.45,s,1.12,2.38,1.12,0]],lit);
  const mullions=[], halos=[];
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    mullions.push([x+Math.cos(angle)*1.42,y+19.45,s+Math.sin(angle)*1.42,.115,2.7,.115,0]);
  }
  for(const rot of [0, Math.PI/4, Math.PI/2, Math.PI*3/4]){
    halos.push([x,y+19.45,s,8.8,5.6,1,rot]);
  }
  batch(group,boxGeo,mullions,lampSteel);
  batch(group,treeGeo,halos,lampHaloMat);
  batch(group,poolGeo,[[x,y+19.45,s,9.5,1,9.5,0]],lampHaloMat);
  batch(group,towerRoof,[[x,y+21.8,s,1.95,1.75,1.95,0]],towerBand);
  batch(group,boxGeo,[[x,y+22.85,s,.26,.26,.26,0]],beaconMat);
  batch(group,treeGeo,[[x,y+22.85,s,2.2,2.2,1,0],[x,y+22.85,s,2.2,2.2,1,1.57]],beaconHaloMat);
}
function hillsideVillas(group,start,id){
  const walls=[], roofs=[], windows=[], warmWindows=[], timber=[], foundations=[];
  for(let i=0;i<5;i++){
    const seed=id*13+i;
    const z=start+18+i*23+rand(seed+9)*8;
    const left=45+rand(seed+1)*36, x=center(z)+left, y=surfaceHeight(left,z);
    const w=5+rand(seed+7)*4,d=7+rand(seed+3)*4,h=3+rand(seed+4)*2;
    const depth=z-start;
    foundations.push([x-.35,y-h*.38,depth,w+1.4,h*1.15,d+1.4,0]);
    walls.push([x,y+h*.28,depth,w,h*1.45,d,0]);
    roofs.push([x,y+h*1.04,depth,w+1.25,.36,d+1.45,0]);
    roofs.push([x,y+h*1.16,depth,w*.68,.24,d*.72,0]);
    roofs.push([x-w*.54,y+h*.15,depth,2.35,.24,d+.95,0]);
    timber.push([x-w*.54-.95,y+h*.34,depth,.12,.38,d+.85,0]);
    for(let j=0;j<4;j++){
      const paneZ=depth+d*(j-1.5)*.21;
      const paneLen=d*.18;
      const isLit=((i+j+id)%2===0)||rand(seed+j*3.1)>.42;
      const target=isLit?warmWindows:windows;
      target.push([x-w*.502,y+h*.63,paneZ,.09,h*.42,paneLen,0]);
      if(h>3.8){
        const lowerLit=((i+j)%2===1);
        (lowerLit?warmWindows:windows).push([x-w*.502,y+h*.02,paneZ,.09,h*.32,paneLen,0]);
      }
    }
    for(let j=0;j<5;j++)timber.push([x-w*.518,y+h*.63,depth+d*(j-2)*.21,.115,h*.46,.115,0]);
  }
  batch(group,boxGeo,foundations,rockMat);
  batch(group,boxGeo,walls,ivory);batch(group,boxGeo,roofs,towerBand);
  batch(group,boxGeo,windows,balconyGlass);batch(group,boxGeo,warmWindows,villaLit);
  batch(group,boxGeo,timber,posts);
}
function roadLabel(group,z,left,height,width,lines,key) {
  if(!labelCache.has(key)){
    const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=256;
    const ctx=canvas.getContext('2d');
    const grad=ctx.createLinearGradient(0,0,0,256);
    grad.addColorStop(0,'#1d5250');grad.addColorStop(1,'#133a3a');
    ctx.fillStyle=grad;ctx.fillRect(0,0,768,256);
    ctx.strokeStyle='#f4eed6';ctx.lineWidth=9;ctx.strokeRect(10,10,748,236);
    ctx.strokeStyle='rgba(255,204,132,0.55)';ctx.lineWidth=3;ctx.strokeRect(20,20,728,216);
    ctx.fillStyle='rgba(255,184,102,0.16)';ctx.fillRect(28,32,265,58);
    ctx.fillStyle='#f3b673';ctx.font='bold 42px Arial';ctx.fillText(lines[0],38,76);
    ctx.fillStyle='#fffdf4';ctx.font='bold 68px Arial';ctx.fillText(lines[1],36,184,690);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
    labelCache.set(key,new THREE.MeshLambertMaterial({map:t}));
  }
  const h=width/3, yaw=yawAt(z), s=z-group.userData.start;
  const cx=center(z)+left, cy=grade(z)+height;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,h),labelCache.get(key));
  sign.rotation.y=Math.PI+yaw;
  sign.position.set(cx,cy,s);
  group.add(sign);
  const cos=Math.cos(yaw), sin=Math.sin(yaw);
  batch(group,boxGeo,[[cx+sin*.07,cy,s+cos*.07,width+.14,h+.14,.09,yaw]],lampSteel);
  batch(group,boxGeo,[
    [cx-sin*.01,cy+h*.52,s-cos*.01,width+.18,.075,.13,yaw],
    [cx-sin*.01,cy-h*.52,s-cos*.01,width+.18,.075,.13,yaw]
  ],signTrimMat);
}
function roadside(group,start,stop,id) {
  const poles=[],lights=[],lampPools=[],lampCones=[],lampHalos=[],viaductMarkers=[],beacons=[],beaconHalos=[],concrete=[],crowns=[],wood=[],iron=[],wires=[];
  if(id>=0 && id<24 && id%13===1)coastalStation(group,start+46);
  if(id>=0 && id<36 && (id%10===0||id%10===1))hillsideVillas(group,start,id);
  const local=(z,x,y)=>vector(center(z)+x,grade(z)+y,z-start);
  function beam(list,a,b,r,depth=r){
    const mid=a.clone().lerp(b,.5),delta=b.clone().sub(a);
    const q=new THREE.Quaternion().setFromUnitVectors(vector(0,1,0),delta.clone().normalize());
    list.push(new THREE.Matrix4().compose(mid,q,vector(r,delta.length(),depth)));
  }
  function flush(list,mat) {
    if(!list.length)return;
    const obj=new THREE.InstancedMesh(boxGeo,mat,list.length);
    list.forEach((m,i)=>obj.setMatrixAt(i,m));
    obj.castShadow=obj.receiveShadow=true;group.add(obj);
  }
  for(let z=start+24;z<stop;z+=40){
    const side=(Math.floor(z/40)%2===0)?-1:1;
    const yaw=yawAt(z);
    const a=local(z,side*7.95,0), b=local(z,side*7.95,6.6);
    const c=local(z,side*6.0,7.12);
    beam(poles,a,b,.115);beam(poles,b,c,.093);
    beam(poles,c,local(z,side*5.12,7.12),.16,.34);
    const lx=center(z)+side*5.55, ly=grade(z)+7.01, lz=z-start;
    lights.push([lx,ly,lz,.84,.048,.29,yaw]);
    lampHalos.push([lx,ly-.05,lz,1.95,1,1.95,yaw]);
    lampCones.push([center(z)+side*5.2,grade(z)+3.55,lz,2.7,6.8,2.9,yaw]);
    lampPools.push([center(z)+side*4.35,grade(z)+.028,lz,6.8,1,8.8,yaw]);
    if(z<4200 && (id%5!==3)){
      const x=side*(11.2+rand(z)*2.6), y=surfaceHeight(x,z);
      const h=5.4+2.6*rand(z+9), lean=.3+rand(z+.3)*.43;
      const scale=.84+.32*rand(z+.8);
      const p0=vector(center(z)+x,y,z-start);
      const p1=p0.clone().add(vector(lean*.22,h*.49,0));
      const p2=p0.clone().add(vector(lean,h,0));
      beam(wood,p0,p1,.29,.29);beam(wood,p1,p2,.22,.22);
      crowns.push([p2.x,p2.y,p2.z,scale,scale,scale,z*.2]);
    }
  }
  if(id>=0 && id%7===0){
    const z=start+95;
    const approach=(z%10000)>8900;
    beam(poles,local(z,7.92,0),local(z,7.92,7.45),.26);
    beam(poles,local(z,7.92,7.38),local(z,-.65,7.38),.16,.22);
    beam(poles,local(z,7.92,6.02),local(z,-.65,6.02),.14,.18);
    beam(poles,local(z,7.92,4.85),local(z,5.4,6.02),.115);
    const spanX=[7.8,5.7,3.6,1.5,-.55];
    for(let k=0;k<spanX.length;k++){
      beam(poles,local(z,spanX[k],6.02),local(z,spanX[k],7.38),.085);
      if(k<spanX.length-1){
        const aX=spanX[k], bX=spanX[k+1];
        beam(poles,local(z,aX,k%2?6.04:7.36),local(z,bX,k%2?7.36:6.04),.068);
      }
    }
    const name=approach?'Skyline Viaduct':z<6500?'Sunset Coast':'Pine Valley';
    roadLabel(group,z-.07,2.45,6.68,5.3,['ROUTE 35     ↑',name],name);
  }
  // The deck and cables follow the actual highway curve, including partial end chunks.
  for(let z=start+4;z<stop;z+=8){
    const origin=bridgeStartAt(z);
    if(!origin||z-origin>=640)continue;
    const s=z-origin, yaw=yawAt(z);
    concrete.push(new THREE.Matrix4().compose(local(z,0,-.74),
      new THREE.Quaternion().setFromAxisAngle(vector(0,1,0),yaw),
      vector(15.8,1.18,8.25/Math.cos(yaw))));
    for(const side of [-1,1]){
      const x=side*7.6;
      beam(concrete,local(z-4,x,-1.1),local(z+4,x,-1.1),1.5,1.8);
      beam(concrete,local(z-4,x,.52),local(z+4,x,.52),.52,1.12);
      if(s%16===4){
        const mx=center(z)+side*7.32, my=grade(z)+1.12, mz=z-start;
        viaductMarkers.push([mx,my,mz,.16,.11,.32,yaw]);
        lampPools.push([center(z)+side*6.65,grade(z)+.028,mz,2.1,1,2.8,yaw]);
      }
      if(s%160===4){
        beam(concrete,local(z,x,-50),local(z,x,-1),2.4,2.1);
      }
      const mast=origin+Math.floor(s/160)*160+80;
      if(s%160===84){
        beam(iron,local(mast,x,-2),local(mast,side*8.3,25),1.35,1.7);
        if(side===1)beam(iron,local(mast,-8.3,23),local(mast,8.3,23),1.35,1.55);
        const top=local(mast,side*8.3,25.35);
        beacons.push([top.x,top.y,top.z,.34,.38,.34,0]);
        for(const rot of [0,1.57])beaconHalos.push([top.x,top.y+.05,top.z,2.6,2.6,1,rot]);
      }
      if(Math.abs(z-mast)>6 && s%16===4)
        beam(wires,local(z,x,.7),local(mast,side*8.3,20+Math.abs(z-mast)*.05),.085);
    }
  }
  const shrubs=[];
  for(let cluster=0;cluster<42;cluster++){
    const seed=id*381+cluster;
    const cx=(rand(seed+.21)<.54?-1:1)*(9.8+Math.pow(rand(seed+.44),2)*100);
    const cz=start+rand(seed+.19)*(stop-start);
    for(let i=0;i<5;i++){
      const z=cz+rand(seed*5+i+.42)*5;
      const x=cx+rand(seed*5+i+.71)*3;
      if(Math.abs(x)<8.3)continue;
      const y=surfaceHeight(x,z);
      if(y<-12.8||bridgeStartAt(z)&&z%10000<640&&Math.abs(x)<100)continue;
      const h=.8+rand(seed*5+i+.51)*2.4;
      for(const rot of [0,1.57])shrubs.push([center(z)+x,y+h*.28,z-start,h*1.8,h,1,rot+seed,0xffffff]);
    }
  }
  batch(group,treeGeo,shrubs,shrubMat);
  flush(poles,lampSteel);flush(wood,bark);flush(concrete,ivory);flush(iron,bridgeSteel);flush(wires,cableSteel);
  batch(group,palmGeo,crowns,frondMat);
  batch(group,boxGeo,lights,lit);
  batch(group,poolGeo,lampHalos,lampHaloMat);
  batch(group,coneGeo,lampCones,lampConeMat);
  batch(group,poolGeo,lampPools,lampPoolMat);
  batch(group,boxGeo,viaductMarkers,viaductMarkerMat);
  batch(group,boxGeo,beacons,beaconMat);
  batch(group,treeGeo,beaconHalos,beaconHaloMat);
}
