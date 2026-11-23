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
const lampSteel=material(0x535e66,.45,.64);
const ivory=material(0xb8b8aa,.83);
const bridgeSteel=material(0xb77a56,.43,.43);
const cableSteel=material(0x98a6aa,.38,.65);
const lit=new THREE.MeshStandardMaterial({color:0xffefbd,emissive:0xffc079,emissiveIntensity:2.2});
const labelCache=new Map();
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
const balconyGlass=material(0x50656d,.22,.53);
function coastalStation(group,z){
  const s=z-group.userData.start;
  const x=center(z)-42,y=terrainHeight(-42,z);
  batch(group,trunkGeo,[[x,y+.25,s,7.8,3.1,7.8,0]],rockMat);
  batch(group,towerBody,[[x,y+9.4,s,2,16.8,2,0]],ivory);
  batch(group,towerBody,[[x,y+12.8,s,1.7,2.7,1.7,0],[x,y+6.8,s,1.88,2.5,1.88,0]],towerBand);
  batch(group,towerBody,[[x,y+18.1,s,2.19,.6,2.19,0],[x,y+20.9,s,1.7,.32,1.7,0]],lampSteel);
  batch(group,towerBody,[[x,y+19.45,s,1.04,2.35,1.04,0]],lit);
  const mullions=[];
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    mullions.push([x+Math.cos(angle)*1.42,y+19.45,s+Math.sin(angle)*1.42,.115,2.7,.115,0]);
  }
  batch(group,boxGeo,mullions,lampSteel);
  batch(group,towerRoof,[[x,y+21.8,s,1.95,1.75,1.95,0]],towerBand);
}
function hillsideVillas(group,start,id){
  const walls=[], roofs=[], windows=[], timber=[];
  for(let i=0;i<5;i++){
    const seed=id*13+i;
    const z=start+18+i*23+rand(seed+9)*8;
    const left=45+rand(seed+1)*36, x=center(z)+left, y=surfaceHeight(left,z);
    const w=5+rand(seed+7)*4,d=7+rand(seed+3)*4,h=3+rand(seed+4)*2;
    const depth=z-start;
    walls.push([x,y+h*.28,depth,w,h*1.45,d,0]);
    roofs.push([x,y+h*1.04,depth,w+.9,.34,d+1.1,0]);
    roofs.push([x-w*.52,y+h*.15,depth,2.1,.23,d+.7,0]);
    windows.push([x-w*.501,y+h*.63,depth,.085,h*.42,d*.85,0]);
    for(let j=0;j<5;j++)timber.push([x-w*.516,y+h*.63,depth+d*(j-2)*.17,.11,h*.45,.11,0]);
  }
  batch(group,boxGeo,walls,ivory);batch(group,boxGeo,roofs,towerBand);
  batch(group,boxGeo,windows,balconyGlass);batch(group,boxGeo,timber,posts);
}
function roadLabel(group,z,left,height,width,lines,key) {
  if(!labelCache.has(key)){
    const canvas=document.createElement('canvas'); canvas.width=768; canvas.height=256;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#194646';ctx.fillRect(0,0,768,256);
    ctx.strokeStyle='#d6d9c8';ctx.lineWidth=7;ctx.strokeRect(10,10,748,236);
    ctx.fillStyle='#e7aa70';ctx.font='bold 44px Arial';ctx.fillText(lines[0],36,76);
    ctx.fillStyle='#fbfaf0';ctx.font='bold 67px Arial';ctx.fillText(lines[1],34,183,680);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
    labelCache.set(key,new THREE.MeshLambertMaterial({map:t}));
  }
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(width,width/3),labelCache.get(key));
  sign.rotation.y=Math.PI+yawAt(z);
  sign.position.set(center(z)+left,grade(z)+height,z-group.userData.start);
  group.add(sign);
}
function roadside(group,start,stop,id) {
  const poles=[],lights=[],concrete=[],crowns=[],wood=[],iron=[],wires=[];
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
    const a=local(z,side*7.95,0), b=local(z,side*7.95,6.6);
    const c=local(z,side*6.0,7.12);
    beam(poles,a,b,.115);beam(poles,b,c,.093);
    beam(poles,c,local(z,side*5.12,7.12),.16,.33);
    lights.push([center(z)+side*5.55,grade(z)+7.019,z-start,.81,.038,.275,0]);
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
    beam(poles,local(z,7.92,0),local(z,7.92,7.35),.26);
    beam(poles,local(z,7.92,7.24),local(z,-.5,7.24),.18,.24);
    beam(poles,local(z,7.92,5.2),local(z,4.85,7.24),.115);
    const name=approach?'Skyline Viaduct':z<6500?'Sunset Coast':'Pine Valley';
    roadLabel(group,z-.07,2.45,6.65,5.3,['ROUTE 35     ↑',name],name);
  }
  // The deck and cables follow the actual highway curve, including partial end chunks.
  for(let z=start+4;z<stop;z+=8){
    const origin=bridgeStartAt(z);
    if(!origin||z-origin>=640)continue;
    const s=z-origin;
    concrete.push(new THREE.Matrix4().compose(local(z,0,-.74),
      new THREE.Quaternion().setFromAxisAngle(vector(0,1,0),yawAt(z)),
      vector(15.8,1.18,8.25/Math.cos(yawAt(z)))));
    for(const side of [-1,1]){
      const x=side*7.6;
      beam(concrete,local(z-4,x,-1.1),local(z+4,x,-1.1),1.5,1.8);
      beam(concrete,local(z-4,x,.52),local(z+4,x,.52),.52,1.12);
      if(s%160===4){
        beam(concrete,local(z,x,-50),local(z,x,-1),2.4,2.1);
      }
      const mast=origin+Math.floor(s/160)*160+80;
      if(s%160===84){
        beam(iron,local(mast,x,-2),local(mast,side*8.3,25),1.35,1.7);
        if(side===1)beam(iron,local(mast,-8.3,23),local(mast,8.3,23),1.35,1.55);
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
  batch(group,palmGeo,crowns,frondMat);batch(group,boxGeo,lights,lit);
}
