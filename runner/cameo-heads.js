import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSceneryModel } from '../maps/scenery-model.js';
import { CAMEO_FACE_DATA, CAMEO_FACE_FITTED, CAMEO_FACE_PROFILED, CAMEO_FACE_TRIANGLES } from './cameo-face-data.js';

const TAU = Math.PI * 2;
const SEGMENTS = 48;
const HEAD_BACK_DEPTH = -.34;

export const CAMEO_HEADS = {
  purra: {
    name: 'Purra',
    skin: '#e9bda8', blush: '#d99c8f', lips: '#a95e65', eyes: '#71899a',
    hair: '#d0c8b8', hairLight: '#f0e8d8', brow: '#766754',
    head: [[-.54,.025,.07,0],[-.49,.12,.15,0],[-.37,.18,.20,-.005],[-.18,.245,.24,-.02],[.08,.25,.245,-.026],[.31,.225,.215,-.04],[.49,.09,.11,-.055],[.53,.015,.03,-.055]],
    style: 'long-straight', hairline: .235, hairLength: 'bob', faceWidth: .91, faceLength: 1.07, jawWidth: .86, eyeOpen: .98, browLift: -.004, browRadius: .0065, noseTipInset: .012, nose: [.95,.92], eye: [.115,.050], glasses: null,
    scale: [.98,1,1], profileDepth: [.008,.025,.012,.014], smile: .020, multiViewFace: true,
    faceOutline: [1.04,1.10,1.12,1.08,1.02,.98,.96], fittedFaceLength: .98,
  },
  orpo: {
    name: 'Orpo',
    skin: '#dfb59d', blush: '#ce9585', lips: '#965e5e', eyes: '#71818a',
    hair: '#70695f', hairLight: '#a69b89', brow: '#51463c',
    head: [[-.54,.025,.075,0],[-.48,.16,.17,0],[-.34,.245,.225,-.005],[-.13,.305,.255,-.02],[.12,.305,.25,-.035],[.34,.25,.22,-.05],[.51,.105,.12,-.06],[.55,.016,.03,-.06]],
    style: 'short-side-part', hairline: .285, faceWidth: 1.10, faceLength: .98, jawWidth: 1.18, eyeOpen: .98, browLift: -.018, browRadius: .0095, noseTipInset: .018, nose: [1.09,1.10], eye: [.12,.046], glasses: 'round',
    scale: [1.03,1,1], profileDepth: [.008,.026,.012,.015], smile: -.012, multiViewFace: true,
    faceOutline: [1.08,1.14,1.14,1.10,1.05,1.02,1.00], fittedFaceLength: .97, glassesScale: .90,
  },
  marin: {
    name: 'Marin',
    skin: '#f0c9b3', blush: '#e7a598', lips: '#9c555e', eyes: '#687d87',
    hair: '#3e2c26', hairLight: '#765541', brow: '#49352e',
    head: [[-.54,.02,.065,0],[-.48,.12,.15,0],[-.34,.20,.21,-.005],[-.13,.24,.24,-.015],[.12,.255,.24,-.025],[.34,.21,.205,-.045],[.51,.09,.10,-.055],[.55,.015,.03,-.055]],
    style: 'long-wavy', hairline: .245, hairLength: 'shoulder', faceWidth: .88, faceLength: 1.09, jawWidth: .82, eyeOpen: 1.0, browLift: .004, browRadius: .0075, noseTipInset: .012, nose: [.92,.90], eye: [.112,.050], glasses: null,
    scale: [.94,1,1], profileDepth: [.006,.020,.010,.012], smile: .020, multiViewFace: true,
    faceOutline: [.88,.96,1.08,1.08,1.03,1.00,.98], fittedFaceLength: .98,
  },
  stubb: {
    name: 'Stubb',
    skin: '#e6b79c', blush: '#d69a89', lips: '#a7776c', eyes: '#677f94',
    hair: '#8b7961', hairLight: '#c2ad8b', brow: '#62584d',
    head: [[-.54,.04,.075,0],[-.48,.175,.17,0],[-.34,.255,.225,-.005],[-.13,.31,.255,-.02],[.12,.30,.255,-.03],[.34,.245,.22,-.045],[.51,.105,.12,-.06],[.55,.016,.03,-.06]],
    style: 'short-swept', hairline: .265, faceWidth: .90, faceLength: 1.11, jawWidth: .86, eyeOpen: .84, browLift: .008, browRadius: .007, noseTipInset: .020, nose: [1.10,1.08], eye: [.12,.048], glasses: 'roundrect',
    scale: [.97,1.04,1], profileDepth: [.008,.027,.015,.020], smile: .060, multiViewFace: true,
    faceOutline: [.90,.96,1.06,1.04,1.00,.98,.96], fittedFaceLength: 1.00, glassesScale: 1.02,
  },
  putin: {
    name: 'Putin',
    skin: '#e2b8a5', blush: '#cf9384', lips: '#975e5e', eyes: '#77878d',
    hair: '#716f69', hairLight: '#aaa69b', brow: '#635b51',
    head: [[-.54,.02,.07,0],[-.48,.13,.17,0],[-.34,.215,.22,-.005],[-.13,.27,.255,-.02],[.12,.276,.25,-.035],[.34,.235,.22,-.05],[.51,.105,.12,-.06],[.55,.016,.03,-.06]],
    style: 'receding-short', hairline: .275, faceWidth: 1.03, faceLength: 1.02, jawWidth: 1.08, eyeOpen: .60, browLift: -.018, browRadius: .008, noseTipInset: .014, nose: [1.06,1.02], eye: [.118,.046], glasses: null,
    scale: [.98,1.04,1], profileDepth: [.012,.045,.028,.035], smile: .004,
    faceOutline: [1.04,1.08,1.04,1.00,.98,.98,.96], measuredDepthWeight: .34,
  },
  trump: {
    name: 'Trump',
    skin: '#d8a074', blush: '#c77c61', lips: '#8b5148', eyes: '#65798a',
    hair: '#b18b4d', hairLight: '#e0c477', brow: '#7f603b',
    head: [[-.55,.025,.075,0],[-.48,.19,.17,0],[-.34,.30,.235,-.005],[-.13,.34,.27,-.02],[.12,.345,.27,-.035],[.34,.32,.235,-.05],[.51,.18,.14,-.06],[.56,.018,.03,-.06]],
    style: 'comb-over', hairline: .305, faceWidth: 1.12, faceLength: .98, jawWidth: 1.12, eyeOpen: .70, browLift: -.020, browRadius: .010, noseTipInset: .014, nose: [1.15,1.24], eye: [.126,.048], glasses: null,
    scale: [1.02,1.03,1], profileDepth: [.020,.062,.040,.050], smile: .008,
    faceOutline: [1.04,1.16,1.14,1.08,1.03,1.00,.96], measuredDepthWeight: .34,
  },
};

function addOval(model, color, [x,y,z], [sx,sy,sz], segments = 24) {
  model.geometry(color, new THREE.SphereGeometry(1, segments, Math.max(12, segments >> 1))
    .scale(sx, sy, sz).translate(x, y, z));
}

function addTube(model, color, points, radius, segments = 24) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  model.geometry(color, new THREE.TubeGeometry(curve, Math.max(segments, points.length * 8), radius, 8, false));
}

function addTaperedTube(model,color,points,radii,segments=40,sides=12) {
  const curve=new THREE.CatmullRomCurve3(points.map(point=>new THREE.Vector3(...point)));
  const frames=curve.computeFrenetFrames(segments,false),positions=[],indices=[];
  for(let row=0;row<=segments;row++) {
    const t=row/segments,scaled=t*(radii.length-1),span=Math.min(radii.length-2,Math.floor(scaled));
    const radius=THREE.MathUtils.lerp(radii[span],radii[span+1],scaled-span),center=curve.getPointAt(t);
    for(let side=0;side<=sides;side++) {
      const angle=side/sides*TAU,normal=frames.normals[row].clone().multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[row],Math.sin(angle));
      positions.push(center.x+normal.x*radius,center.y+normal.y*radius,center.z+normal.z*radius);
    }
  }
  for(let row=0;row<segments;row++) for(let side=0;side<sides;side++) {
    const a=row*(sides+1)+side,b=a+sides+1;
    indices.push(a,a+1,b,a+1,b+1,b);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  model.geometry(color,geometry);
}

function capPoint(look,x,y,lift=.008,fitted=look.head,depthAt=null,crownCenterY=.015,crownRadius=.44) {
  const [,rx]=fitted.reduce((wide,row)=>row[1]>wide[1]?row:wide,fitted[0]);
  const [,,rz,centerZ]=profileAt(fitted,.08);
  const hairX=THREE.MathUtils.clamp(x,-rx*.98,rx*.98),cy=THREE.MathUtils.clamp((y-crownCenterY)/crownRadius,-.98,.98);
  const cx=hairX/(rx*1.045),front=Math.sqrt(Math.max(.015,1-cy*cy-cx*cx));
  const base=centerZ+rz*1.045*front+.025;
  return [hairX,y,Math.max(base,depthAt?depthAt(hairX,y)+.009:base)+lift];
}

function profileAt(profile, y) {
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1], b = profile[i];
    if (y <= b[0]) {
      const prev = profile[Math.max(0, i - 2)], next = profile[Math.min(profile.length - 1, i + 1)];
      const span = b[0] - a[0], t = THREE.MathUtils.clamp((y - a[0]) / span, 0, 1);
      const t2 = t * t, t3 = t2 * t;
      return a.map((value, axis) => {
        const beforeSlope = (b[axis] - prev[axis]) / (b[0] - prev[0]);
        const afterSlope = (next[axis] - a[axis]) / (next[0] - a[0]);
        return (2*t3-3*t2+1)*value + (t3-2*t2+t)*span*beforeSlope
          + (-2*t3+3*t2)*b[axis] + (t3-t2)*span*afterSlope;
      });
    }
  }
  return profile.at(-1);
}

function faceZ(profile, x, y) {
  const [, rx, rz, centerZ] = profileAt(profile, y);
  return centerZ + rz * Math.sqrt(Math.max(.05, 1 - (x / rx) ** 2));
}

function fitHeadProfile(profile,points) {
  const face=points.slice(0,468),low=Math.min(...face.map(point=>point.y)),high=Math.max(...face.map(point=>point.y));
  const oldLow=profile[0][0],oldHigh=profile.at(-1)[0],heightScale=(high-low)/(oldHigh-oldLow);
  const maxWidth=Math.max(...FACE_OVAL.map(index=>Math.abs(face[index].x)));
  const oldWidth=Math.max(...profile.map(([,rx])=>rx)),widthScale=maxWidth/oldWidth;
  const depthScale=1.08;
  const contour=FACE_OVAL.map(index=>face[index]);
  const widthAt=y=>{
    let width=0;
    for(let i=0;i<contour.length;i++) {
      const a=contour[i],b=contour[(i+1)%contour.length];
      if((a.y<=y&&b.y>=y)||(b.y<=y&&a.y>=y)) {
        const span=b.y-a.y,t=Math.abs(span)<1e-6?0:(y-a.y)/span;
        width=Math.max(width,Math.abs(THREE.MathUtils.lerp(a.x,b.x,t)));
      }
    }
    return width||Math.max(...contour.map(point=>Math.abs(point.x)))*.05;
  };
  return profile.map(([y,rx,rz,centerZ])=>{
    const fittedY=low+(y-oldLow)*heightScale,measuredWidth=widthAt(fittedY);
    return [fittedY,THREE.MathUtils.lerp(rx*widthScale,measuredWidth,.50),rz*depthScale,centerZ-rz*(depthScale-1)];
  });
}

const SCULPTED_FACE_RELIEF={
    purra:{cheek:.105,brow:.068,socket:.046,chin:.078,bridge:.090,tip:.110,alae:.030,muzzle:.018},
    orpo:{cheek:.125,brow:.086,socket:.056,chin:.102,bridge:.108,tip:.118,alae:.050,muzzle:.030},
    marin:{cheek:.092,brow:.060,socket:.045,chin:.072,bridge:.078,tip:.092,alae:.032,muzzle:.018},
    stubb:{cheek:.130,brow:.088,socket:.060,chin:.122,bridge:.102,tip:.122,alae:.046,muzzle:.038},
    putin:{cheek:.118,brow:.092,socket:.060,chin:.112,bridge:.108,tip:.124,alae:.046,muzzle:.028},
    trump:{cheek:.142,brow:.095,socket:.064,chin:.138,bridge:.124,tip:.146,alae:.055,muzzle:.050},
};

function sculptedFaceSurface(profile,points,look) {
  const fitted=fitHeadProfile(profile,points),relief=SCULPTED_FACE_RELIEF[look.name.toLowerCase()];
  const eyes=[
    [(points[33].x*.58+points[133].x*.42),(points[33].y+points[133].y)*.5],
    [(points[263].x*.58+points[362].x*.42),(points[263].y+points[362].y)*.5],
  ];
  const baseAt=(x,y)=>{
    const sampleY=THREE.MathUtils.clamp(y,fitted[0][0],fitted.at(-1)[0]);
    const [,rx,rz,centerZ]=profileAt(fitted,sampleY),ratio=THREE.MathUtils.clamp(Math.abs(x)/rx,0,.995);
    return centerZ+rz*Math.sqrt(Math.max(.01,1-ratio*ratio));
  };
  const measuredRelief=(index,min,max,fallback)=>THREE.MathUtils.clamp(
    points[index].z-baseAt(points[index].x,points[index].y),min,max
  )*.72+fallback*.28;
  const noseBridge=Math.max(relief.bridge,measuredRelief(6,.025,.15,relief.bridge));
  const noseTip=Math.max(relief.tip,measuredRelief(1,.045,.20,relief.tip));
  const chinRelief=Math.max(relief.chin,measuredRelief(152,.025,.15,relief.chin));
  const noseY=(points[6].y+points[4].y)*.5,tipY=points[1].y;
  const eyesY=(points[33].y+points[133].y+points[362].y+points[263].y)*.25;
  const noseRootY=(eyesY+noseY)*.5+.025,noseSpan=Math.max(.14,noseRootY-tipY);
  const depthAt=(x,y)=>{
    const sampleY=THREE.MathUtils.clamp(y,fitted[0][0],fitted.at(-1)[0]);
    const [,rx,rz,centerZ]=profileAt(fitted,sampleY),ratio=THREE.MathUtils.clamp(Math.abs(x)/rx,0,.995);
    const facing=Math.sqrt(Math.max(.01,1-ratio*ratio)),base=centerZ+rz*facing;
    const bump=(cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
    const cheeks=bump(points[205].x,points[205].y,.112,.10)+bump(points[425].x,points[425].y,.112,.10);
    const brows=bump(points[70].x,points[70].y,.083,.047)+bump(points[300].x,points[300].y,.083,.047);
    const sockets=eyes.reduce((sum,[cx,cy])=>sum+bump(cx,cy,.065,.048),0);
    const temples=bump(-.235,.105,.065,.13)+bump(.235,.105,.065,.13);
    const jaw=bump(-.205,-.245,.085,.12)+bump(.205,-.245,.085,.12);
    const chin=bump(points[152].x,points[152].y+.025,.105,.070);
    const noseRawT=(noseRootY-y)/noseSpan,noseT=THREE.MathUtils.clamp(noseRawT,0,1);
    const noseMask=THREE.MathUtils.smoothstep(noseRawT,0,.12)
      *(1-THREE.MathUtils.smoothstep(noseRawT,1,1.12));
    const noseCenter=THREE.MathUtils.lerp(points[6].x,points[1].x,noseT);
    const noseWidth=THREE.MathUtils.lerp(.036,.078,THREE.MathUtils.smoothstep(noseT,.06,.90))*look.nose[1];
    const noseAcross=Math.exp(-(((x-noseCenter)/noseWidth)**2)*1.2);
    const noseRidge=noseMask*noseAcross*(noseBridge*Math.exp(-(((noseT-.43)/.40)**2))
      +noseTip*Math.exp(-(((noseT-.92)/.18)**2)));
    const alae=bump(-.034*look.nose[1],tipY-.018,.022,.025)+bump(.034*look.nose[1],tipY-.018,.022,.025);
    const muzzle=bump(0,(points[13].y+points[14].y)*.5-.018,.12,.055);
    const facialMask=THREE.MathUtils.smoothstep(facing,.07,.70)
      *THREE.MathUtils.smoothstep(y,fitted[0][0]+.055,fitted[0][0]+.18)
      *(1-THREE.MathUtils.smoothstep(y,fitted.at(-1)[0]-.16,fitted.at(-1)[0]-.045));
    const reliefDetail=cheeks*relief.cheek+brows*relief.brow-sockets*relief.socket-temples*.008
      +jaw*relief.cheek*.28+chin*chinRelief+noseRidge+alae*relief.alae+muzzle*relief.muzzle;
    return base+facialMask*facing*reliefDetail;
  };
  return {profile:fitted,depthAt};
}

function sculptedHead(points,look,surface) {
  const fitted=surface.profile,depthAt=surface.depthAt,rings=96,rows=96,low=fitted[0][0],high=fitted.at(-1)[0];
  const vertices=[],colors=[],indices=[],point=new THREE.Vector3();
  for (let row=0;row<=rows;row++) {
    const y=THREE.MathUtils.lerp(low,high,row/rows),[,rx,rz,centerZ]=profileAt(fitted,y);
    for (let ring=0;ring<rings;ring++) {
      const angle=ring/rings*TAU,x=rx*Math.sin(angle),facing=Math.max(0,Math.cos(angle));
      const baseZ=centerZ+rz*Math.cos(angle);
      const detail=THREE.MathUtils.smoothstep(facing,.08,.82);
      const baseFront=centerZ+rz*Math.sqrt(Math.max(.01,1-(x/rx)**2));
      const z=baseZ+detail*(depthAt(x,y)-baseFront);
      vertices.push(x,y,z);
      faceColor(point.set(x,y,z),look,[]).toArray(colors,colors.length);
    }
  }
  const bottomCenter=vertices.length/3;
  vertices.push(0,low,fitted[0][3]);
  faceColor(point.set(0,low,fitted[0][3]),look,[]).toArray(colors,colors.length);
  const topCenter=vertices.length/3;
  vertices.push(0,high,fitted.at(-1)[3]);
  faceColor(point.set(0,high,fitted.at(-1)[3]),look,[]).toArray(colors,colors.length);
  for(let row=0;row<rows;row++) for(let ring=0;ring<rings;ring++) {
    const a=row*rings+ring,b=row*rings+(ring+1)%rings;
    const c=(row+1)*rings+(ring+1)%rings,d=(row+1)*rings+ring;
    indices.push(a,b,c,a,c,d);
  }
  for(let ring=0;ring<rings;ring++) {
    const next=(ring+1)%rings,last=rows*rings;
    indices.push(bottomCenter,next,ring,topCenter,last+ring,last+next);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function subdivideMesh(vertices, faces, rounds = 2, boundaryLoop = []) {
  for (let step = 0; step < rounds; step++) {
    const edges = new Map(), neighbors = vertices.map(() => new Set()), border = vertices.map(() => []);
    for (const [a,b,c] of faces) for (const [u,v,opposite] of [[a,b,c],[b,c,a],[c,a,b]]) {
      neighbors[u].add(v); neighbors[v].add(u);
      const key = u < v ? `${u}:${v}` : `${v}:${u}`;
      if (!edges.has(key)) edges.set(key,{a:u,b:v,opposite:[]});
      edges.get(key).opposite.push(opposite);
    }
    for (const edge of edges.values()) if (edge.opposite.length === 1) {
      border[edge.a].push(edge.b); border[edge.b].push(edge.a);
    }
    const next = vertices.map((point,index) => {
      if (border[index].length === 2) return point.clone().multiplyScalar(.75)
        .addScaledVector(vertices[border[index][0]],.125).addScaledVector(vertices[border[index][1]],.125);
      const count=neighbors[index].size, beta=count===3?3/16:3/(8*count);
      const moved=point.clone().multiplyScalar(1-count*beta);
      for (const neighbor of neighbors[index]) moved.addScaledVector(vertices[neighbor],beta);
      return moved;
    });
    for (const edge of edges.values()) {
      const point=vertices[edge.a].clone().add(vertices[edge.b]).multiplyScalar(edge.opposite.length===2?.375:.5);
      if (edge.opposite.length===2) for (const opposite of edge.opposite) point.addScaledVector(vertices[opposite],.125);
      edge.index=next.length; next.push(point);
    }
    if(boundaryLoop.length) {
      const refined=[];
      for(let index=0;index<boundaryLoop.length;index++) {
        const a=boundaryLoop[index],b=boundaryLoop[(index+1)%boundaryLoop.length];
        refined.push(a,edges.get(a<b?`${a}:${b}`:`${b}:${a}`).index);
      }
      boundaryLoop=refined;
    }
    const edgeIndex=(a,b)=>edges.get(a<b?`${a}:${b}`:`${b}:${a}`).index, refined=[];
    for (const [a,b,c] of faces) {
      const ab=edgeIndex(a,b),bc=edgeIndex(b,c),ca=edgeIndex(c,a);
      refined.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);
    }
    vertices=next; faces=refined;
  }
  return {vertices,faces,boundaryLoop};
}

const LIP_LOOP=[61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
const FACE_OVAL=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

function headBack(vertices, boundary, look, lips) {
  const contour=boundary.map(index=>typeof index==='number'?vertices[index]:index);
  const center=new THREE.Vector3();
  for (const point of contour) center.add(point);
  center.multiplyScalar(1/contour.length);
  const rings=Array.from({length:32},(_,index)=>{
    const angle=index/31*Math.PI/2;
    return [Math.cos(angle),Math.sin(angle)];
  });
  const positions=[],colors=[],indices=[],count=contour.length,skin=new THREE.Color(look.skin);
  for (let ring=0;ring<rings.length;ring++) for (const point of contour) {
    const [scale,depth]=rings[ring];
    positions.push(
      center.x+(point.x-center.x)*scale,
      center.y+(point.y-center.y)*scale,
      THREE.MathUtils.lerp(point.z,HEAD_BACK_DEPTH,depth),
    );
    (ring===0?faceColor(point,look,lips):skin).toArray(colors,colors.length);
  }
  for (let ring=0;ring<rings.length-1;ring++) for (let i=0;i<count;i++) {
    const next=(i+1)%count,a=ring*count+i,b=ring*count+next,c=(ring+1)*count+i,d=(ring+1)*count+next;
    indices.push(a,b,c,b,d,c);
  }
  const centerIndex=positions.length/3;
  positions.push(center.x,center.y,HEAD_BACK_DEPTH);
  const last=(rings.length-1)*count;
  for (let i=0;i<count;i++) indices.push(last+i,last+(i+1)%count,centerIndex);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  if(geometry.attributes.normal.getZ(centerIndex)>0) {
    for(let index=0;index<indices.length;index+=3) [indices[index+1],indices[index+2]]=[indices[index+2],indices[index+1]];
    geometry.index.needsUpdate=true;
    geometry.computeVertexNormals();
  }
  return geometry;
}

function makeRearHairLayer(points,look) {
  const geometry=headBack(points,FACE_OVAL,look,[]),position=geometry.getAttribute('position'),
    normal=geometry.getAttribute('normal'),colors=geometry.getAttribute('color');
  const hair=new THREE.Color(look.hair),highlight=new THREE.Color(look.hairLight);
  const ringSize=FACE_OVAL.length,indices=[],source=geometry.index;
  for(let offset=0;offset<source.count;offset+=3) {
    const a=source.getX(offset),b=source.getX(offset+1),c=source.getX(offset+2);
    if(Math.min(a,b,c)>=ringSize) indices.push(a,b,c);
  }
  geometry.setIndex(indices);
  for(let index=0;index<position.count;index++) {
    const p=new THREE.Vector3().fromBufferAttribute(position,index);
    if(index>=ringSize) p.z-=.016;
    p.toArray(position.array,index*3);
    const tint=.08+.05*Math.sin(p.y*17+p.x*9)+.035*Math.cos(p.y*29-p.x*7);
    hair.clone().lerp(highlight,Math.max(0,tint)).toArray(colors.array,index*3);
  }
  position.needsUpdate=colors.needsUpdate=true;
  geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.76,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name=`${look.name} rear hair layer`;
  mesh.castShadow=false;mesh.receiveShadow=false;
  return mesh;
}

function joinFaceAndSkull(front,back) {
  const merged=mergeGeometries([front,back]);
  if (!merged) throw new Error('Could not join the face surface to the skull');
  merged.deleteAttribute('normal');
  const welded=mergeVertices(merged,1e-4);
  merged.dispose();
  welded.computeVertexNormals();
  front.dispose(); back.dispose();
  return welded;
}

function makeSmoothFaceReliefSampler(anchors,look) {
  const relief={
    purra:{cheek:.074,brow:.052,socket:.026,nose:.018,tip:.022,chin:.048,muzzle:.010,fold:.004},
    orpo:{cheek:.096,brow:.062,socket:.030,nose:.020,tip:.026,chin:.070,muzzle:.014,fold:.009},
    marin:{cheek:.062,brow:.050,socket:.024,nose:.016,tip:.020,chin:.044,muzzle:.010,fold:.003},
    stubb:{cheek:.084,brow:.062,socket:.028,nose:.022,tip:.028,chin:.072,muzzle:.022,fold:.012},
    putin:{cheek:.066,brow:.056,socket:.028,nose:.020,tip:.024,chin:.062,muzzle:.014,fold:.006},
    trump:{cheek:.094,brow:.066,socket:.032,nose:.024,tip:.030,chin:.080,muzzle:.028,fold:.010},
  }[look.name.toLowerCase()]??{cheek:.068,brow:.052,socket:.026,nose:.018,tip:.022,chin:.048,muzzle:.010,fold:.004};
  const eyes=[
    [(anchors[33].x*.58+anchors[133].x*.42),(anchors[33].y+anchors[133].y)*.5],
    [(anchors[263].x*.58+anchors[362].x*.42),(anchors[263].y+anchors[362].y)*.5],
  ];
  return (x,y)=>{
    const localBump=(cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
    const cheeks=localBump(anchors[205].x,anchors[205].y,.125,.115)+localBump(anchors[425].x,anchors[425].y,.125,.115);
    const brows=localBump(anchors[70].x,anchors[70].y,.070,.040)+localBump(anchors[300].x,anchors[300].y,.070,.040);
    const sockets=eyes.reduce((sum,[cx,cy])=>sum+localBump(cx,cy,.054,.040),0);
    const nose=localBump(0,(anchors[6].y+anchors[4].y)*.5,.050,.13);
    const tip=localBump(anchors[1].x,anchors[1].y,.058,.055);
    const alae=localBump(anchors[1].x-.042,anchors[1].y-.018,.026,.027)
      +localBump(anchors[1].x+.042,anchors[1].y-.018,.026,.027);
    const chin=localBump(anchors[152].x,anchors[152].y+.025,.09,.065);
    const muzzle=localBump(0,(anchors[13].y+anchors[14].y)*.5-.018,.11,.050);
    const mouthY=(anchors[13].y+anchors[14].y)*.5;
    let smileFolds=0;
    for(const side of [-1,1]) {
      const t=THREE.MathUtils.clamp((mouthY+.025-y)/.13,0,1);
      const foldX=side*(.052+.047*t),foldY=mouthY+.025-.13*t;
      const endFade=THREE.MathUtils.smoothstep(t,.04,.20)
        *(1-THREE.MathUtils.smoothstep(t,.78,.98));
      smileFolds+=localBump(foldX,foldY,.014,.050)*endFade;
    }
    // These heads already carry multi-view measured depth. Keep the soft
    // sculpt pass small enough to preserve that anatomy instead of piling a
    // generic set of cheek and brow bumps over every face.
    return (cheeks*relief.cheek+brows*relief.brow-sockets*relief.socket
      +nose*relief.nose+tip*relief.tip+alae*relief.nose*.36+chin*relief.chin
      +muzzle*relief.muzzle-smileFolds*relief.fold)*.48;
  };
}

function applySmoothFaceRelief(vertices,reliefAt) {
  for(const point of vertices) {
    point.z+=reliefAt(point.x,point.y);
  }
}

function landmarkSculpt(points,look,depthAt) {
  const profile=fitHeadProfile(look.head,points),rows=128,rings=128;
  const low=profile[0][0],high=profile.at(-1)[0];
  const positions=new Float32Array(((rows+1)*(rings+1)+2)*3),colors=new Float32Array(positions.length);
  const indices=[],sample=new THREE.Vector3();
  for(let row=0;row<=rows;row++) {
    const y=THREE.MathUtils.lerp(low,high,row/rows),[,rx,rz,centerZ]=profileAt(profile,y);
    for(let ring=0;ring<=rings;ring++) {
      const phi=ring/rings*TAU,sine=Math.sin(phi),facing=Math.cos(phi),x=rx*sine;
      const baseZ=centerZ+rz*facing;
      const frontBase=centerZ+rz*Math.sqrt(Math.max(.01,1-sine*sine));
      const faceBlend=THREE.MathUtils.smoothstep(facing,.015,.72);
      const z=baseZ+faceBlend*(depthAt(x,y)-frontBase);
      const index=(row*(rings+1)+ring)*3;
      positions[index]=x; positions[index+1]=y; positions[index+2]=z;
      const color=faceColor(sample.set(x,y,z),look,[]);
      color.lerp(new THREE.Color(look.hair),THREE.MathUtils.smoothstep(-facing,.03,.72));
      color.toArray(colors,index);
    }
  }
  for(let row=0;row<rows;row++) for(let ring=0;ring<rings;ring++) {
    const a=row*(rings+1)+ring,b=a+1,c=b+rings+1,d=a+rings+1;
    indices.push(a,b,c,a,c,d);
  }
  const bottomCenter=(rows+1)*(rings+1),topCenter=bottomCenter+1;
  const [,, ,bottomZ]=profileAt(profile,low),[,, ,topZ]=profileAt(profile,high);
  positions.set([0,low,bottomZ],bottomCenter*3);
  positions.set([0,high,topZ],topCenter*3);
  faceColor(sample.set(0,low,bottomZ),look,[]).toArray(colors,bottomCenter*3);
  faceColor(sample.set(0,high,topZ),look,[]).toArray(colors,topCenter*3);
  for(let ring=0;ring<rings;ring++) {
    const next=ring+1,last=rows*(rings+1);
    indices.push(bottomCenter,next,ring,topCenter,last+ring,last+next);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function multiviewHead(points,look,smoothReliefAt) {
  const initialVertices=points.slice(0,468).map(point=>point.clone()),initialFaces=[];
  for(const triangle of CAMEO_FACE_TRIANGLES) {
    if(triangle[0]>=468||triangle[1]>=468||triangle[2]>=468) continue;
    initialFaces.push(triangle);
  }
  const refined=subdivideMesh(initialVertices,initialFaces,1,FACE_OVAL.slice());
  const {vertices,faces,boundaryLoop}=refined;
  applySmoothFaceRelief(vertices,smoothReliefAt);
  const positions=new Float32Array(vertices.length*3),colors=new Float32Array(vertices.length*3),indices=[];
  const point=new THREE.Vector3();
  for(let index=0;index<vertices.length;index++) {
    const vertex=vertices[index];
    vertex.toArray(positions,index*3);
    faceColor(point.copy(vertex),look,[]).toArray(colors,index*3);
  }
  for(const triangle of faces) indices.push(...triangle);
  const front=new THREE.BufferGeometry();
  front.setAttribute('position',new THREE.BufferAttribute(positions,3));
  front.setAttribute('color',new THREE.BufferAttribute(colors,3));
  front.setIndex(indices);
  front.computeVertexNormals();
  const back=headBack(vertices,boundaryLoop,look,[]),backColors=back.getAttribute('color');
  const ringSize=boundaryLoop.length,skullSkin=new THREE.Color(look.skin),hair=new THREE.Color(look.hair),hairLight=hair.clone().lerp(new THREE.Color(look.hairLight),.10);
  const high=Math.max(...points.slice(0,468).map(vertex=>vertex.y));
  for(let index=0;index<backColors.count;index++) {
    const ring=Math.floor(index/ringSize);
    if(ring===0) continue;
    const point=new THREE.Vector3().fromBufferAttribute(back.getAttribute('position'),index);
    const rear=THREE.MathUtils.smoothstep(-point.z,0,.095)
      *(1-THREE.MathUtils.smoothstep(point.y,high-.28,high-.06));
    const highlight=.025+.018*Math.sin(point.y*19+point.x*11);
    skullSkin.clone().lerp(hair,THREE.MathUtils.clamp(rear,0,1))
      .lerp(hairLight,Math.max(0,highlight)*rear).toArray(backColors.array,index*3);
  }
  backColors.needsUpdate=true;
  return joinFaceAndSkull(front,back);
}

function insidePolygon(x,y,points) {
  let inside=false;
  for (let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j];
    if (a.y>y!==b.y>y && x<((b.x-a.x)*(y-a.y))/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}

function faceColor(point, look, lips) {
  const base=new THREE.Color(look.skin), blush=new THREE.Color(look.blush), lip=new THREE.Color(look.lips);
  const cheek=Math.exp(-(((Math.abs(point.x)-.215)/.105)**2+((point.y+.105)/.095)**2))*.18;
  base.lerp(blush,cheek);
  if (insidePolygon(point.x,point.y,lips)) base.copy(lip);
  return base;
}

function clippedMesh(vertices, faces, normals, boundary, upper, look, lips, pivotY = 0, pivotZ = 0, sourceColors = null) {
  const points=[],vertexNormals=[],vertexColors=[],indices=[],lookup=new Map();
  const keyOf=point=>point.toArray().map(value=>value.toFixed(6)).join(',');
  const append=(point,normal,color)=>{
    const key=keyOf(point);
    if (lookup.has(key)) return lookup.get(key);
    const index=points.length; lookup.set(key,index); points.push(point); vertexNormals.push(normal); vertexColors.push(color); return index;
  };
  for (const face of faces) {
    const polygon=face.map(index=>({point:vertices[index],normal:normals[index],
      color:sourceColors?.[index]??faceColor(vertices[index],look,lips)}));
    const distance=value=>value.point.y-boundary(value.point);
    const inside=value=>upper?distance(value)>=0:distance(value)<=0;
    const clipped=[];
    for (let i=0;i<polygon.length;i++) {
      const current=polygon[i],next=polygon[(i+1)%polygon.length],a=inside(current),b=inside(next);
      if (a) clipped.push(current);
      if (a!==b) {
        const from=distance(current),to=distance(next),t=from/(from-to);
        clipped.push({point:current.point.clone().lerp(next.point,t),normal:current.normal.clone().lerp(next.normal,t).normalize(),
          color:current.color.clone().lerp(next.color,t)});
      }
    }
    if (clipped.length<3) continue;
    const base=append(clipped[0].point,clipped[0].normal,clipped[0].color);
    for (let i=1;i<clipped.length-1;i++) indices.push(base,
      append(clipped[i].point,clipped[i].normal,clipped[i].color),append(clipped[i+1].point,clipped[i+1].normal,clipped[i+1].color));
  }
  const geometry=new THREE.BufferGeometry();
  const positions=new Float32Array(points.length*3),colors=new Float32Array(points.length*3),normalArray=new Float32Array(points.length*3);
  for (let i=0;i<points.length;i++) {
    const point=points[i].clone(); point.y-=pivotY; point.z-=pivotZ;
    point.toArray(positions,i*3);
    vertexColors[i].toArray(colors,i*3);
    vertexNormals[i].toArray(normalArray,i*3);
  }
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(normalArray,3));
  geometry.setIndex(indices);
  return geometry;
}

function landmarkEyes(model, look, points, depthAt) {
  const contours=[[33,160,159,158,133,153,145,144],[362,385,386,387,263,373,374,380]];
  for (let side=0;side<2;side++) {
    const ring=contours[side].map(index=>points[index]);
    const minX=Math.min(...ring.map(point=>point.x)),maxX=Math.max(...ring.map(point=>point.x));
    const minY=Math.min(...ring.map(point=>point.y)),maxY=Math.max(...ring.map(point=>point.y));
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2,eyeWidth=Math.max(maxX-minX,.078);
    const eyeOpen=look.eyeOpen??1,eyeHeight=Math.max(maxY-minY,.026)*eyeOpen,surface=depthAt(cx,cy);
    const eyePoint=point=>{
      const y=cy+(point.y-cy)*eyeOpen;
      return [point.x,y,depthAt(point.x,y)+.007];
    };
    // Give each eye a shallow globe that sits inside the socket. A flat face
    // polygon made the eyes read like painted dots beneath the glasses.
    addOval(model,'#e8ded3',[cx,cy,surface+.002],[eyeWidth*.46,eyeHeight*.48,.011],32);
    const irisX=eyeWidth*.19,irisY=Math.max(.008,eyeHeight*.37),irisZ=surface+.010;
    addOval(model,look.eyes,[cx,cy,irisZ],[irisX,irisY,.005],28);
    addOval(model,'#29343a',[cx,cy,irisZ+.003],[irisX*.50,irisY*.78,.0028],24);
    addOval(model,'#fff7eb',[cx-irisX*.24,cy+irisY*.27,irisZ+.006],[.0025,.0025,.0014],14);
    const upper=contours[side].slice(0,5).map(index=>eyePoint(points[index]).map((value,axis)=>axis===2?value+.006:value));
    const lower=contours[side].slice(4).map(index=>eyePoint(points[index]).map((value,axis)=>axis===2?value+.004:value));
    const lid=new THREE.Color(look.skin).multiplyScalar(.84);
    addTube(model,lid,upper,.0026,24);
    addTube(model,new THREE.Color(look.skin).multiplyScalar(.96),lower,.0018,24);
  }
  for (const contour of [[70,63,105,66,107],[336,296,334,293,300]]) {
    const browColor=new THREE.Color(look.brow).lerp(new THREE.Color(look.skin),.28);
    const lift=look.browLift??0;
    addTube(model,browColor,contour.map(index=>[points[index].x,points[index].y+lift,
      depthAt(points[index].x,points[index].y+lift)+.010]),look.browRadius??.006,32);
  }
  if (look.glasses) landmarkGlasses(model,look,points,contours,depthAt);
}

function addLandmarkNoseAndMouth(model,look,points,depthAt) {
  const upper=points[13],lower=points[14],mouthY=(upper.y+lower.y)/2,mouthZ=depthAt(0,mouthY)+.003;
  // The landmark surface already carries the bridge, tip, wings, and nostrils.
  // Separate overlays made these details look stamped onto the face.
  const smile=look.smile??0,gap=Math.abs(upper.y-lower.y),mouthSpan=Math.abs(points[61].x-points[291].x);
  const mouthScale={purra:.40,orpo:.44,marin:.40,stubb:.72,putin:.42,trump:.44}[look.name.toLowerCase()]??.42;
  const mouthWidth=Math.max(.052,mouthSpan*mouthScale);
  const grin=look.name==='Stubb';
  const opening=grin?THREE.MathUtils.clamp(gap*.30+smile*.24,.014,.038)
    :THREE.MathUtils.clamp(gap*.035+Math.max(0,smile)*.018,.0015,.006);
  const cavityY=mouthY-opening*.08,width=mouthWidth*(grin?.90:.70);
  const cavityDepth=grin?.018:.012,cavityHeight=Math.max(opening*.27,grin?.006:.0025);
  addOval(model,grin?'#553438':'#75524c',[0,cavityY,mouthZ-.001],
    [width,cavityHeight,cavityDepth],32);
  if(grin) {
    const teethY=cavityY+opening*.12;
    const vertices=[],indices=[],toothStep=width*.205,toothWidth=toothStep*.82,toothHeight=opening*.18;
    for(let tooth=0;tooth<6;tooth++) {
      const centerX=(tooth-2.5)*toothStep,centerY=teethY-.003*(centerX/width)**2;
      const x0=centerX-toothWidth*.5,x1=centerX+toothWidth*.5,y0=centerY-toothHeight*.5,y1=centerY+toothHeight*.5;
      const start=vertices.length/3;
      for(const [x,y] of [[x0,y0],[x1,y0],[x1,y1],[x0,y1]]) vertices.push(x,y,depthAt(x,y)+.021);
      indices.push(start,start+1,start+2,start,start+2,start+3);
    }
    const teethGeometry=new THREE.BufferGeometry();
    teethGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    teethGeometry.setIndex(indices); teethGeometry.computeVertexNormals();
    model.geometry('#f7f0e5',teethGeometry);
  } else if(gap>.035) {
    const teethY=upper.y*.66+cavityY*.34;
    addOval(model,'#f3ece0',[0,teethY,depthAt(0,teethY)+.010],[width*.64,opening*.24,.003],28);
  }
  const left=points[61].x,right=points[291].x,cornerLift=grin?Math.min(.020,smile*.32):smile*.18;
  const upperLip=[[left,mouthY+cornerLift*.2],[left*.58,mouthY+cornerLift*.72],
    [0,mouthY+cornerLift],[right*.58,mouthY+cornerLift*.72],[right,mouthY+cornerLift*.2]]
    .map(([x,y])=>[x,y,depthAt(x,y)+.011]);
  const lowerLip=[[left,mouthY-.006],[left*.58,mouthY-opening*.42],
    [0,mouthY-opening*.48],[right*.58,mouthY-opening*.42],[right,mouthY-.006]]
    .map(([x,y])=>[x,y,depthAt(x,y)+.010]);
  addTube(model,look.lips,upperLip,grin?.005:.0042,32);
  addTube(model,look.lips,lowerLip,grin?.004:.0034,32);
  if(grin) {
    const foldColor=new THREE.Color(look.skin).multiplyScalar(.88);
    for(const side of [-1,1]) addTube(model,foldColor,[
      [side*.048,mouthY+.050,depthAt(side*.048,mouthY+.050)+.012],
      [side*.075,mouthY+.026,depthAt(side*.075,mouthY+.026)+.011],
      [side*.103,mouthY+.008,depthAt(side*.103,mouthY+.008)+.010],
    ],.0018,22);
  }
}

function neutralizeMouth(points) {
  const upper=[61,185,40,39,37,0,267,269,270,409,291];
  const lower=[14,375,321,405,314,17,84,181,91,146];
  const left=points[61],right=points[291],halfWidth=Math.max(Math.abs(left.x),Math.abs(right.x));
  for (const index of lower) {
    const point=points[index];
    const nearest=upper.map(candidate=>points[candidate]).sort((a,b)=>Math.abs(a.x-point.x)-Math.abs(b.x-point.x))[0];
    // Close small detector gaps while following the measured upper-lip arc;
    // flattening every point to one line erased each person's mouth shape.
    point.y=nearest.y-.003*THREE.MathUtils.clamp(1-Math.abs(point.x)/halfWidth,.18,1);
    point.z=THREE.MathUtils.lerp(point.z,nearest.z,.56);
  }
  const innerY=points[13].y+.002;
  for (const index of [78,191,80,81,82,312,311,310,415,308]) points[index].y=innerY;
  points[14].y=points[13].y-.003;
}

function fitProfileDepth(points, look) {
  const [forehead,nose,mouth,chin]=look.profileDepth;
  const overallDepth=look.name==='Trump'?1.25:1.18;
  for (const point of points) {
    point.z=.12+(point.z-.12)*overallDepth;
    const bump=(x,y,sx,sy)=>Math.exp(-((point.x/sx)**2+((point.y-y)/sy)**2));
    point.z+=forehead*bump(0,.24,.19,.12)+nose*bump(0,-.10,.105,.12)
      +mouth*bump(0,-.25,.16,.075)+chin*bump(0,-.405,.13,.075);
  }
}

function fitFacialProportions(points,look) {
  const centerX=(points[33].x+points[263].x)/2;
  const eyeY=(points[33].y+points[263].y)/2;
  const jawBlend=point=>1-THREE.MathUtils.smoothstep(point.y,-.43,-.18);
  for(const point of points.slice(0,468)) {
    point.x=(point.x-centerX)*(look.faceWidth??1);
    point.y=eyeY+(point.y-eyeY)*(look.faceLength??1);
      point.x*=THREE.MathUtils.lerp(1,look.jawWidth??1,jawBlend(point));
  }
  points[1].z-=look.noseTipInset??.020;
  points[98].z+=(look.noseTipInset??.020)*.25;
  points[327].z+=(look.noseTipInset??.020)*.25;
}

function applyIndividualHeadShape(points,look,strength=1) {
  const contour=FACE_OVAL.map(index=>points[index]);
  const low=Math.min(...contour.map(point=>point.y)),high=Math.max(...contour.map(point=>point.y));
  const centerX=(points[33].x+points[263].x)/2,eyeY=(points[33].y+points[263].y)/2;
  const outline=look.faceOutline??[1,1,1,1,1,1,1],stops=[0,.16,.32,.49,.67,.84,1];
  for(const point of points.slice(0,468)) {
    const t=THREE.MathUtils.clamp((point.y-low)/Math.max(.01,high-low),0,1);
    let section=stops.findIndex(stop=>stop>=t);
    if(section<1) section=1;
    const amount=(t-stops[section-1])/(stops[section]-stops[section-1]);
    const width=THREE.MathUtils.lerp(outline[section-1],outline[section],amount);
    point.x=centerX+(point.x-centerX)*THREE.MathUtils.lerp(1,width,strength);
    point.y=eyeY+(point.y-eyeY)*THREE.MathUtils.lerp(1,look.fittedFaceLength??1,strength);
  }
}

function makeLandmarkDepthSampler(points,look) {
  const cell=.075,anchors=points.slice(0,468),buckets=new Map();
  const key=(x,y)=>`${Math.floor(x/cell)}:${Math.floor(y/cell)}`;
  for(const point of anchors) {
    const bucket=key(point.x,point.y);
    if(!buckets.has(bucket)) buckets.set(bucket,[]);
    buckets.get(bucket).push(point);
  }
  return (x,y)=>{
    const gx=Math.floor(x/cell),gy=Math.floor(y/cell);
    let sum=0,weight=0,nearest=null,nearestDistance=Infinity;
    for(let row=gy-3;row<=gy+3;row++) for(let column=gx-3;column<=gx+3;column++) {
      for(const point of buckets.get(`${column}:${row}`)??[]) {
        const dx=point.x-x,dy=point.y-y,distance=dx*dx+dy*dy;
        if(distance<nearestDistance) { nearest=point; nearestDistance=distance; }
        if(distance>.20*.20) continue;
        const localWeight=Math.exp(-distance/.0038);
        sum+=point.z*localWeight; weight+=localWeight;
      }
    }
    if(weight>.0001) return sum/weight;
    return nearest?.z??0;
  };
}

function makeSculptedLandmarkDepthSampler(points,look) {
  const profile=fitHeadProfile(look.head,points);
  const measuredDepth=makeLandmarkDepthSampler(points,look);
  const relief={
    purra:{cheek:.050,brow:.034,socket:.018,bridge:.050,tip:.070,alae:.022,chin:.050,muzzle:.014},
    orpo:{cheek:.068,brow:.044,socket:.022,bridge:.062,tip:.078,alae:.028,chin:.066,muzzle:.018},
    marin:{cheek:.046,brow:.032,socket:.018,bridge:.046,tip:.064,alae:.020,chin:.046,muzzle:.012},
    stubb:{cheek:.056,brow:.040,socket:.022,bridge:.056,tip:.076,alae:.026,chin:.060,muzzle:.026},
    putin:{cheek:.060,brow:.048,socket:.026,bridge:.018,tip:.025,alae:.002,chin:.070,muzzle:.018},
    trump:{cheek:.088,brow:.056,socket:.030,bridge:.024,tip:.032,alae:.003,chin:.086,muzzle:.034},
  }[look.name.toLowerCase()]??{cheek:.055,brow:.045,socket:.030,bridge:.070,tip:.080,alae:.025,chin:.068,muzzle:.020};
  const eyes=[
    [(points[33].x*.58+points[133].x*.42),(points[33].y+points[133].y)*.5],
    [(points[263].x*.58+points[362].x*.42),(points[263].y+points[362].y)*.5],
  ];
  const bump=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
  const baseAt=(x,y)=>{
    const [,rx,rz,centerZ]=profileAt(profile,THREE.MathUtils.clamp(y,profile[0][0],profile.at(-1)[0]));
    const ratio=THREE.MathUtils.clamp(Math.abs(x)/rx,0,.995);
    return centerZ+rz*Math.sqrt(Math.max(.01,1-ratio*ratio));
  };
  const eyeY=(points[33].y+points[133].y+points[362].y+points[263].y)*.25;
  return (x,y)=>{
    const [,rx]=profileAt(profile,THREE.MathUtils.clamp(y,profile[0][0],profile.at(-1)[0]));
    const facing=Math.sqrt(Math.max(.01,1-(x/rx)**2));
    const mask=THREE.MathUtils.smoothstep(facing,.08,.68)
      *THREE.MathUtils.smoothstep(y,profile[0][0]+.055,profile[0][0]+.18)
      *(1-THREE.MathUtils.smoothstep(y,profile.at(-1)[0]-.16,profile.at(-1)[0]-.045));
    const cheeks=bump(x,y,points[205].x,points[205].y,.12,.105)+bump(x,y,points[425].x,points[425].y,.12,.105);
    const brows=bump(x,y,points[70].x,points[70].y,.080,.045)+bump(x,y,points[300].x,points[300].y,.080,.045);
    const sockets=eyes.reduce((sum,[cx,cy])=>sum+bump(x,y,cx,cy,.062,.046),0);
    const jaw=bump(x,y,-.20,-.245,.095,.13)+bump(x,y,.20,-.245,.095,.13);
    const chin=bump(x,y,points[152].x,points[152].y+.020,.11,.073);
    const bridge=bump(x,y,points[6].x,points[6].y,.062,.14);
    const tip=bump(x,y,points[1].x,points[1].y,.066,.055);
    const alae=bump(x,y,points[98].x,points[98].y,.028,.024)
      +bump(x,y,points[327].x,points[327].y,.028,.024);
    const mouthY=(points[13].y+points[14].y)*.5;
    const muzzle=bump(x,y,0,mouthY-.018,.12,.060);
    const detail=cheeks*relief.cheek+brows*relief.brow-sockets*relief.socket
      +jaw*relief.cheek*.22+chin*relief.chin+muzzle*relief.muzzle
      +bridge*relief.bridge+tip*relief.tip+alae*relief.alae;
    const modeled=baseAt(x,y)+mask*facing*detail;
    const measuredWeight=look.measuredDepthWeight??(look.multiViewFace?.68:.28);
    return modeled+mask*facing*(measuredDepth(x,y)-baseAt(x,y))*measuredWeight;
  };
}

function smoothLandmarkDepth(points,rounds=4) {
  const neighbors=Array.from({length:468},()=>new Set()),boundary=new Set(FACE_OVAL);
  for(const [a,b,c] of CAMEO_FACE_TRIANGLES) for(const [from,to] of [[a,b],[a,c],[b,a],[b,c],[c,a],[c,b]])
    if(from<468&&to<468) neighbors[from].add(to);
  for(let round=0;round<rounds;round++) {
    const next=points.slice(0,468).map(point=>point.z);
    for(let index=0;index<468;index++) {
      const ring=[...neighbors[index]];
      if(!ring.length) continue;
      const mean=ring.reduce((sum,neighbor)=>sum+points[neighbor].z,0)/ring.length;
      next[index]=THREE.MathUtils.lerp(points[index].z,mean,boundary.has(index)?.18:.14);
    }
    for(let index=0;index<468;index++) points[index].z=next[index];
  }
}

function landmarkGlasses(model,look,points,contours,depthAt) {
  const zAt=(x,y)=>depthAt(x,y)+.016;
  const round=look.glasses==='round',roundRect=look.glasses==='roundrect';
  const frameWidth=look.name==='Orpo'?.011:look.name==='Stubb'?.009:.007;
  const frameScale=look.glassesScale??1;
  for (let side=0;side<2;side++) {
    const ring=contours[side].map(index=>points[index]);
    const minX=Math.min(...ring.map(point=>point.x)),maxX=Math.max(...ring.map(point=>point.x));
    const minY=Math.min(...ring.map(point=>point.y)),maxY=Math.max(...ring.map(point=>point.y));
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2,
      rx=((maxX-minX)/2+(round ? .034 : .030))*frameScale,
      ry=((maxY-minY)/2+(round ? .035 : roundRect?.028:.021))*frameScale,pointsOnFrame=[];
    for (let i=0;i<=32;i++) {
      const a=i/32*TAU,c=Math.cos(a),s=Math.sin(a),power=round?1:roundRect?.52:.58;
      const x=cx+rx*Math.sign(c)*Math.abs(c)**power,y=cy+ry*Math.sign(s)*Math.abs(s)**power;
      pointsOnFrame.push([x,y,zAt(x,y)]);
    }
    addTube(model,'#1d2225',pointsOnFrame,frameWidth,36);
    const outer=side===0?minX:maxX,temple=side===0?-.34:.34;
    addTube(model,'#1d2225',[[outer,cy,zAt(outer,cy)],[temple,cy-.006,zAt(temple,cy)-.025],
      [temple,cy-.018,-.13]],frameWidth*.68,24);
  }
  const cy=(points[33].y+points[263].y)/2,bridgeY=cy-.005;
  addTube(model,'#1d2225',[[ -.055,bridgeY,zAt(-.055,bridgeY)],[0,bridgeY+.01,zAt(0,bridgeY+.01)+.003],[.055,bridgeY,zAt(.055,bridgeY)]],frameWidth*.72,16);
}

function scalpExperimental(model, look, points, depthAt) {
  const profile=fitHeadProfile(look.head,points),low=profile[0][0],high=profile.at(-1)[0];
  const topLift={purra:.14,orpo:.13,marin:.15,stubb:.12,putin:.09,trump:.16}[look.name.toLowerCase()]??.12;
  const top=high+topLift;
  // The fitted facial oval closes at one point on the forehead. A real skull
  // continues above it, so give the hairstyle a rounded crown rather than a cone.
  const crownSample=profileAt(profile,Math.max(low,high-.075));
  const crownRx=Math.max(crownSample[1]*1.10,look.name==='Marin'?.265:.245);
  const crownRz=Math.max(crownSample[2]*1.02,.245);
  const crownCenterZ=crownSample[3]-.012;
  const topCenterZ=crownCenterZ;
  const phiCount=64,rowCount=36,vertices=[],faces=[];
  for(let row=0;row<=rowCount;row++) for(let phi=0;phi<=phiCount;phi++) {
    const angle=phi/phiCount*TAU,sin=Math.sin(angle),cos=Math.cos(angle),side=Math.abs(sin);
    const hairline=look.hairline+(look.style==='long-wavy'?.025*side:0);
    const sideDrop=look.style==='long-straight'?.68:look.style==='long-wavy'?.78
      :look.style==='receding-short'?.29:look.style==='short-side-part'?.18
      :look.style==='short-swept'?.19:look.style==='comb-over'?.24:.20;
    const rearEnd=look.style==='long-wavy'?-.76:look.style==='long-straight'?-.62:-.33;
    const sideEnd=hairline-sideDrop;
    const frontSide=side**3;
    const edge=cos>=0?THREE.MathUtils.lerp(hairline,sideEnd,frontSide)
      :THREE.MathUtils.lerp(sideEnd,rearEnd,-cos);
    const endY=edge+.002*Math.sin(angle*6+look.hairline*13);
    if(row===0) { vertices.push(Math.sin(angle)*.002,top,topCenterZ+Math.cos(angle)*.002); continue; }
    const y=THREE.MathUtils.lerp(top,endY,row/rowCount),sampleY=THREE.MathUtils.clamp(y,low,high);
    const [,measuredRx,measuredRz,measuredCenterZ]=profileAt(profile,sampleY);
    const upperBlend=THREE.MathUtils.smoothstep(y,high-.13,high);
    const crownScale=Math.sqrt(Math.max(.002,1-((y-high)/topLift)**2));
    const baseRx=y>high?crownRx*crownScale:THREE.MathUtils.lerp(measuredRx,crownRx,upperBlend);
    const baseRz=y>high?crownRz*crownScale:THREE.MathUtils.lerp(measuredRz,crownRz,upperBlend);
    const baseCenterZ=y>high?crownCenterZ:THREE.MathUtils.lerp(measuredCenterZ,crownCenterZ,upperBlend);
    const crownBase=.010;
    const sweptCrown=look.style==='comb-over'?.045*Math.exp(-(((sin+.20)/.46)**2))
      *THREE.MathUtils.smoothstep(y,high-.11,high+.03):0;
    const crown=crownBase+sweptCrown;
    const belowJaw=look.style.startsWith('long')?THREE.MathUtils.smoothstep(low-y,0,.28):0;
    const rear=THREE.MathUtils.smoothstep(-cos,.05,.95);
    const rx=baseRx+crown+belowJaw*.035;
    const rz=baseRz+crown+belowJaw*.026;
    const targetCenterZ=THREE.MathUtils.lerp(.10,-.12,rear);
    const centerZ=THREE.MathUtils.lerp(baseCenterZ,targetCenterZ,belowJaw);
    const wave=look.style==='long-wavy'?Math.sin(y*8+cos*2.2+side*.45):0;
    const x=sin*(rx+.010+wave*.020),baseZ=centerZ+cos*(rz+.012)+wave*.012;
    const foreheadCovered=cos>.08&&y>=low&&y<=high&&Math.abs(x)<measuredRx*.98;
    const z=foreheadCovered?depthAt(x,y)+.022:baseZ;
    vertices.push(x,y,z);
  }
  const stride=phiCount+1;
  const crownCenter=vertices.length/3;
  vertices.push(0,top,topCenterZ);
  for(let phi=0;phi<phiCount;phi++) faces.push(crownCenter,phi,phi+1);
  for(let phi=0;phi<phiCount;phi++) faces.push(phi, stride+phi, stride+phi+1);
  for(let row=1;row<rowCount;row++) for(let phi=0;phi<phiCount;phi++) {
    const a=row*stride+phi,b=a+1,c=a+stride+1,d=a+stride;
    faces.push(a,d,c,a,c,b);
  }
  const frontVertexCount=vertices.length;
  for(let index=0;index<frontVertexCount;index+=3)
    vertices.push(vertices[index],vertices[index+1],vertices[index+2]-.024);
  const frontFaces=faces.slice();
  for(let index=0;index<frontFaces.length;index+=3)
    faces.push(frontFaces[index]+frontVertexCount/3,frontFaces[index+2]+frontVertexCount/3,
      frontFaces[index+1]+frontVertexCount/3);
  // Close the narrow crown loop as well as the hairline hem; otherwise the
  // crown reads as a floating, flat-topped shell in the front view.
  for(let phi=0;phi<phiCount;phi++) {
    const a=phi,b=phi+1,backA=a+frontVertexCount/3,backB=b+frontVertexCount/3;
    faces.push(a,b,backA,b,backB,backA);
  }
  const edgeStart=rowCount*stride;
  for(let phi=0;phi<phiCount;phi++) {
    const a=edgeStart+phi,b=a+1,backA=a+frontVertexCount/3,backB=b+frontVertexCount/3;
    faces.push(a,backA,b,backA,backB,b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  model.geometry(look.hair, geometry);
  addHairStyle(model,look,{profile,depthAt,topLift,crownRx,crownRz,crownCenterZ,
    rx:Math.max(...profile.map(row=>row[1])),rz:profileAt(profile,.08)[2],cz:profileAt(profile,.08)[3]});
}

function scalp(model,look,points,depthAt) {
  const profile=fitHeadProfile(look.head,points),low=profile[0][0],high=profile.at(-1)[0];
  const widest=profile.reduce((wide,row)=>row[1]>wide[1]?row:wide,profile[0]);
  const [,rx]=widest,[,,rz,cz]=profileAt(profile,.08),crownCenterY=.015;
  const crownRadius={purra:.45,orpo:.44,marin:.46,stubb:.43,putin:.42,trump:.40}[look.name.toLowerCase()]??.44;
  const phiCount=128,rowCount=52,vertices=[],colors=[],faces=[];
  const baseHair=new THREE.Color(look.hair),highlightHair=new THREE.Color(look.hairLight),shadowHair=baseHair.clone().multiplyScalar(.84);
  const bump=(x,y,cx,cy,sx,sy,amount)=>amount*Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
  const ridge=(x,y,path,width,height)=>{
    let distance=Infinity;
    for(let i=1;i<path.length;i++) {
      const [ax,ay]=path[i-1],[bx,by]=path[i],dx=bx-ax,dy=by-ay;
      const t=THREE.MathUtils.clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
      distance=Math.min(distance,Math.hypot(x-ax-dx*t,y-ay-dy*t));
    }
    return height*Math.exp(-((distance/width)**2));
  };
  const styleRelief=(x,y)=>{
    const top=high;
    if(look.style==='comb-over') return bump(x,y,-.16,top-.07,.20,.085,.024)
      +ridge(x,y,[[.33,top-.25],[.24,top-.20],[.13,top-.14],[.01,top-.085],[-.14,top-.055],[-.28,top-.065],[-.35,top-.12]],.075,.046)
      +ridge(x,y,[[.25,top-.31],[.11,top-.22],[-.06,top-.14],[-.22,top-.12],[-.31,top-.17]],.075,.024)
      -ridge(x,y,[[.18,top-.22],[.14,top-.16],[.10,top-.10],[.055,top-.045],[.01,top-.01]],.018,.016);
    if(look.style==='short-side-part') return bump(x,y,.045,top-.02,.23,.13,.016)
      +ridge(x,y,[[.28,top-.18],[.18,top-.09],[.06,top-.025],[-.07,top+.012],[-.22,top-.03],[-.29,top-.12]],.105,.030)
      -ridge(x,y,[[.16,top-.18],[.13,top-.12],[.095,top-.05],[.075,top+.01],[.055,top+.07]],.014,.012);
    if(look.style==='short-swept') return bump(x,y,.08,top-.02,.21,.13,.018)
      +ridge(x,y,[[-.29,top-.18],[-.18,top-.10],[-.06,top-.035],[.08,top+.01],[.22,top-.025],[.30,top-.12]],.10,.032);
    if(look.style==='long-straight') return bump(x,y,-.09,top,.18,.10,.022)+bump(x,y,.09,top,.18,.10,.022)
      -bump(x,y,0,top-.045,.018,.12,.018);
    if(look.style==='long-wavy') return bump(x,y,-.13,top,.20,.12,.020)
      +ridge(x,y,[[-.12,top-.18],[-.05,top-.08],[.02,top+.01],[.12,top+.025]],.018,.014);
    if(look.style==='receding-short') return 0;
    return 0;
  };
  const styleHeight=(x,y)=>{
    const top=crownCenterY+crownRadius;
    if(look.style==='comb-over') return bump(x,y,-.16,top-.025,.12,.060,.055)
      +bump(x,y,-.13,top-.075,.20,.09,.036)
      +ridge(x,y,[[.31,top-.25],[.22,top-.20],[.11,top-.13],[-.04,top-.085],[-.20,top-.10],[-.32,top-.16]],.075,.042)
      -ridge(x,y,[[.18,top-.22],[.14,top-.16],[.10,top-.10],[.055,top-.045],[.01,top-.01]],.018,.012);
    if(look.style==='short-side-part') return bump(x,y,-.025,top-.065,.22,.095,.026)
      +ridge(x,y,[[.30,top-.24],[.20,top-.18],[.08,top-.105],[-.07,top-.065],[-.23,top-.09],[-.31,top-.16]],.078,.034)
      -ridge(x,y,[[.18,top-.23],[.14,top-.17],[.10,top-.11],[.075,top-.045],[.055,top+.01]],.016,.011);
    if(look.style==='short-swept') return bump(x,y,.03,top-.065,.20,.095,.028)
      +ridge(x,y,[[-.32,top-.24],[-.22,top-.18],[-.09,top-.11],[.07,top-.065],[.23,top-.085],[.33,top-.15]],.080,.036)
      -ridge(x,y,[[.18,top-.24],[.14,top-.17],[.10,top-.10],[.065,top-.045],[.025,top+.005]],.016,.011);
    if(look.style==='long-straight') return bump(x,y,-.09,top-.012,.18,.10,.014)+bump(x,y,.09,top-.012,.18,.10,.014)
      -bump(x,y,0,top-.065,.012,.12,.010);
    if(look.style==='long-wavy') return bump(x,y,-.13,top-.02,.20,.12,.017)-bump(x,y,0,top-.065,.012,.12,.009);
    if(look.style==='receding-short') return 0;
    return 0;
  };
  const hairlineOffset=(angle,side)=>look.hairline+(look.style==='long-straight'?.014*(1-side)
    :look.style==='short-side-part'?.050*side+.006*Math.sin(angle)
    :look.style==='long-wavy'?.018*side+.018*Math.sin(angle)
    :look.style==='short-swept'?.035*side+.006*Math.sin(angle)
    :look.style==='receding-short'?.115*side
    :look.style==='comb-over'?.035*side+.055*Math.sin(angle):0);
  for(let row=0;row<=rowCount;row++) for(let phi=0;phi<=phiCount;phi++) {
    const angle=phi/phiCount*TAU,side=Math.abs(Math.sin(angle)),rear=(1-Math.cos(angle))*.5;
    const hairline=hairlineOffset(angle,side),frontTheta=Math.acos(THREE.MathUtils.clamp((hairline-crownCenterY)/crownRadius,-.95,.95));
    const sideDrop=look.style.startsWith('long')?.12:look.style==='receding-short'?.34:.045;
    const sideTheta=frontTheta+sideDrop,sideOrFront=THREE.MathUtils.lerp(frontTheta,sideTheta,side**2.4);
    const rearTheta=look.style.startsWith('long')?2.94:3.12;
    const thetaEnd=THREE.MathUtils.lerp(sideOrFront,rearTheta,rear);
    const theta=.075+(thetaEnd-.075)*row/rowCount;
    const x=Math.sin(angle)*Math.sin(theta)*rx*1.055,y=crownCenterY+Math.cos(theta)*crownRadius;
    const baseZ=cz+Math.cos(angle)*Math.sin(theta)*rz*1.045+.022*Math.max(0,Math.cos(angle))**2;
    const profileY=THREE.MathUtils.clamp(y,low,high),[,backRx,backRz,backCenterZ]=profileAt(profile,profileY);
    const backRatio=THREE.MathUtils.clamp(Math.abs(x)/Math.max(.01,backRx),0,.98);
    const backZ=backCenterZ-backRz*Math.sqrt(Math.max(.01,1-backRatio*backRatio))-.020;
    const backBlend=THREE.MathUtils.smoothstep(-Math.cos(angle),.12,.78);
    const frontFit=Math.cos(angle)>.06&&y>=low&&y<=high?Math.max(0,depthAt(x,y)+.024-baseZ):0;
    const z=THREE.MathUtils.lerp(baseZ+frontFit,backZ,backBlend)+styleRelief(x,y);
    vertices.push(x,y+styleHeight(x,y),z);
    const wave=look.style==='receding-short'?0:Math.sin(angle*7+row*.36),partX=look.style==='comb-over'?.16:
      look.style==='short-side-part'?.085:look.style==='short-swept'?.10:0;
    const part=look.style.startsWith('long')||look.style==='comb-over'||look.style.startsWith('short')
      ?Math.exp(-(((x-partX)/.018)**2+((y-(high-.045))/.16)**2)):0;
    const sideLight=look.style==='long-straight'?.13*Math.exp(-(((Math.abs(x)-.09)/.08)**2))
      :look.style==='short-side-part'?.15*THREE.MathUtils.smoothstep(x,-.28,.18)
      :look.style==='comb-over'?.20*THREE.MathUtils.smoothstep(x,-.28,.12)
      :look.style==='short-swept'?.15*THREE.MathUtils.smoothstep(x,-.26,.16):0;
    const waveTint=look.style.startsWith('long')?.022:.08;
    const waveShadow=look.style.startsWith('long')?.014:.045;
    const color=baseHair.clone().lerp(highlightHair,THREE.MathUtils.clamp(sideLight+Math.max(0,wave)*waveTint,.02,.30));
    color.lerp(shadowHair,Math.max(0,-wave)*waveShadow+part*.28);
    if(look.style==='receding-short') color.lerp(new THREE.Color(look.skin),
      .26*Math.exp(-((x/.12)**2+((y-(high+.015))/.055)**2)));
    color.toArray(colors,colors.length);
  }
  const stride=phiCount+1,topIndex=vertices.length/3,topY=crownCenterY+crownRadius;
  vertices.push(0,topY+styleHeight(0,topY),cz+.022+styleRelief(0,topY));
  const topColor=baseHair.clone().lerp(highlightHair,.08);
  if(look.style==='receding-short') topColor.lerp(new THREE.Color(look.skin),
    .26*Math.exp(-(((topY-(high+.015))/.055)**2)));
  topColor.toArray(colors,colors.length);
  for(let row=0;row<rowCount;row++) for(let phi=0;phi<phiCount;phi++) {
    const a=row*stride+phi,b=a+1,c=a+stride+1,d=a+stride;
    faces.push(a,d,c,a,c,b);
  }
  for(let phi=0;phi<phiCount;phi++) faces.push(topIndex,phi+1,phi);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(faces); geometry.computeVertexNormals();
  model.geometry(null,geometry);
  const pointAt=(x,y,lift=.012)=>{
    const theta=Math.acos(THREE.MathUtils.clamp((y-crownCenterY)/crownRadius,-.98,.98));
    const sinTheta=Math.sin(theta),maxX=Math.max(.01,sinTheta*rx*1.055);
    const hairX=THREE.MathUtils.clamp(x,-maxX*.98,maxX*.98),sinPhi=hairX/maxX,cosPhi=Math.sqrt(Math.max(.01,1-sinPhi*sinPhi));
    const base=cz+cosPhi*sinTheta*rz*1.045+.022*cosPhi*cosPhi;
    return [hairX,y,Math.max(base,depthAt(hairX,y)+.014)+lift];
  };
  addHairStyle(model,look,{profile,depthAt,crownCenterY,crownRadius,rx,rz,cz,pointAt});
}

function scalpProfiled(model,look,points,depthAt) {
  const profile=fitHeadProfile(look.head,points),low=profile[0][0],high=profile.at(-1)[0];
  const crownSample=profileAt(profile,Math.max(low,high-.09));
  const crownRx=Math.max(crownSample[1]*1.12,look.style.startsWith('long')?.255:.235);
  const crownRz=Math.max(crownSample[2]*1.05,.235),crownCenterZ=crownSample[3]-.012;
  const topLift={purra:.15,orpo:.13,marin:.16,stubb:.12,putin:.08,trump:.16}[look.name.toLowerCase()]??.12;
  const phiCount=96,rowCount=48,vertices=[],colors=[],faces=[];
  const baseHair=new THREE.Color(look.hair),highlightHair=new THREE.Color(look.hairLight),shadowHair=baseHair.clone().multiplyScalar(.84);
  const hairRidge=(x,y,path,width,height)=>{
    let distance=Infinity;
    for(let i=1;i<path.length;i++) {
      const [ax,ay]=path[i-1],[bx,by]=path[i],dx=bx-ax,dy=by-ay;
      const t=THREE.MathUtils.clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
      distance=Math.min(distance,Math.hypot(x-ax-dx*t,y-ay-dy*t));
    }
    return height*Math.exp(-((distance/width)**2));
  };
  const styleLift=(x,y)=>{
    const bump=(cx,cy,sx,sy,height)=>height*Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
    if(look.style==='comb-over') return bump(-.085,high-.008,.25,.14,.018)
      +hairRidge(x,y,[[.31,high-.23],[.23,high-.14],[.10,high-.045],[-.055,high+.018],[-.23,high-.035],[-.30,high-.13]],.105,.034)
      +hairRidge(x,y,[[.28,high-.30],[.14,high-.21],[-.015,high-.12],[-.17,high-.10],[-.29,high-.19]],.082,.018)
      -hairRidge(x,y,[[.13,high-.27],[.06,high-.15],[-.005,high-.04],[-.07,high+.006]],.014,.014);
    if(look.style==='short-swept') return bump(-.04,high-.02,.25,.13,.014)
      +hairRidge(x,y,[[-.30,high-.23],[-.20,high-.14],[-.07,high-.055],[.08,high-.018],[.23,high-.07],[.30,high-.18]],.100,.028)
      +hairRidge(x,y,[[-.28,high-.31],[-.13,high-.22],[.025,high-.14],[.18,high-.14],[.29,high-.24]],.082,.014)
      -hairRidge(x,y,[[-.12,high-.25],[-.05,high-.14],[.02,high-.045],[.09,high+.004]],.014,.012);
    if(look.style==='short-side-part') return bump(.035,high-.02,.24,.14,.014)
      +hairRidge(x,y,[[.30,high-.23],[.22,high-.14],[.10,high-.05],[-.045,high+.006],[-.21,high-.04],[-.29,high-.14]],.100,.030)
      +hairRidge(x,y,[[.27,high-.31],[.13,high-.22],[-.01,high-.14],[-.16,high-.13],[-.29,high-.23]],.082,.014)
      -hairRidge(x,y,[[.12,high-.28],[.055,high-.17],[-.015,high-.07],[-.085,high-.025]],.018,.018);
    if(look.style==='long-straight') return bump(-.095,high-.006,.19,.11,.026)
      +bump(.095,high-.006,.19,.11,.024)-bump(0,high-.055,.020,.15,.022);
    if(look.style==='long-wavy') return bump(-.16,high-.015,.25,.14,.032)
      +bump(.12,high-.035,.18,.12,.016)
      -hairRidge(x,y,[[-.13,high-.18],[-.055,high-.09],[.035,high-.015],[.13,high+.025]],.020,.018);
    if(look.style==='receding-short') return bump(-.18,high-.10,.17,.13,.016)
      +bump(.18,high-.10,.17,.13,.016);
    return 0;
  };
  const styleHeight=(x,y)=>{
    const bump=(cx,cy,sx,sy,height)=>height*Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
    if(look.style==='comb-over') return bump(-.085,high+.005,.26,.13,.020)
      +hairRidge(x,y,[[.27,high-.16],[.20,high-.09],[.11,high-.035],[.015,high+.012],[-.09,high+.020],[-.19,high-.015],[-.27,high-.10]],.105,.030);
    if(look.style==='short-side-part') return bump(.045,high-.018,.24,.13,.012)
      +hairRidge(x,y,[[.28,high-.17],[.20,high-.095],[.10,high-.028],[-.005,high+.012],[-.12,high+.018],[-.22,high-.02],[-.29,high-.12]],.120,.022);
    if(look.style==='short-swept') return bump(.10,high-.025,.20,.14,.012)
      +hairRidge(x,y,[[-.29,high-.17],[-.20,high-.10],[-.095,high-.035],[.015,high+.006],[.12,high+.014],[.23,high-.02],[.30,high-.12]],.112,.020);
    if(look.style==='long-wavy') return bump(-.15,high+.005,.17,.12,.027);
    if(look.style==='long-straight') return bump(-.02,high+.005,.20,.11,.014);
    return 0;
  };
  const rearEnd=low+(look.style.startsWith('long')?.10:.018);
  const pointAt=(x,y,lift=.012)=>{
    const sampleY=THREE.MathUtils.clamp(y,low,high),[,rx,rz,centerZ]=profileAt(profile,sampleY);
    const ratio=THREE.MathUtils.clamp(Math.abs(x)/(rx+.014),0,.995),front=Math.sqrt(Math.max(.01,1-ratio*ratio));
    const base=centerZ+rz*front+.016;
    return [x,y,Math.max(base,y>=low&&y<=high?depthAt(x,y)+.020:base)+lift];
  };
  for(let row=0;row<=rowCount;row++) for(let phi=0;phi<=phiCount;phi++) {
    const angle=phi/phiCount*TAU,side=Math.abs(Math.sin(angle)),cosine=Math.cos(angle);
    const hairline=look.hairline+(look.style==='long-straight'?.014*(1-side)
      :look.style==='short-side-part'?.050*side+.006*Math.sin(angle)
      :look.style==='long-wavy'?.018*side+.018*Math.sin(angle)
      :look.style==='short-swept'?.035*side+.006*Math.sin(angle)
      :look.style==='receding-short'?.115*side
      :look.style==='comb-over'?.035*side+.010*Math.sin(angle):0);
    const sideDrop=look.style.startsWith('long')?.13:look.style==='receding-short'?.37
      :look.style==='comb-over'?.22:.25;
    const sideEnd=hairline-sideDrop*side**4;
    const edgeY=cosine>=0?THREE.MathUtils.lerp(hairline,sideEnd,side**4)
      :THREE.MathUtils.lerp(sideEnd,rearEnd,-cosine);
    const flowT=row/rowCount,y=THREE.MathUtils.lerp(high+topLift,edgeY,flowT);
    const profileY=THREE.MathUtils.clamp(y,low,high);
    const [,measuredRx,measuredRz,measuredCenterZ]=profileAt(profile,profileY);
    const crownBlend=THREE.MathUtils.smoothstep(y,high-.14,high);
    const crownScale=y>high?Math.sqrt(Math.max(.002,1-((y-high)/topLift)**2)):1;
    const rowRx=y>high?THREE.MathUtils.lerp(measuredRx,crownRx,crownBlend)*crownScale:measuredRx;
    const rowRz=y>high?THREE.MathUtils.lerp(measuredRz,crownRz,crownBlend)*crownScale:measuredRz;
    const centerZ=y>high?THREE.MathUtils.lerp(measuredCenterZ,crownCenterZ,crownBlend):measuredCenterZ;
    const x=Math.sin(angle)*(rowRx+.014),baseZ=centerZ+cosine*(rowRz+.016);
    const front=Math.max(0,Math.cos(angle));
    const [frequency,phase,amplitude,partOffset]=look.style==='short-side-part'?[8,1.8,.0060,.29]
      :look.style==='short-swept'?[7,-2.5,.0055,-.29]
      :look.style==='comb-over'?[6,2.4,.0060,.47]
      :look.style==='long-wavy'?[8,3.2,.0045,-.14]
      :look.style==='long-straight'?[10,.7,.0032,0]
      :look.style==='receding-short'?[6,1.2,.0005,0]:[6,1.1,.0005,0];
    const wave=Math.sin(angle*frequency+flowT*phase);
    const part=partOffset===null?0:Math.exp(-(((angle-partOffset*flowT)/.058)**2))
      *front*THREE.MathUtils.smoothstep(flowT,.02,.18);
    const hairSurfaceBlend=1-THREE.MathUtils.smoothstep(flowT,.74,1);
    const hairTexture=(wave*amplitude*(.45+front*.55)-part*.010)*hairSurfaceBlend;
    const frontFit=cosine>.06&&y>=low&&y<=high?Math.max(0,depthAt(x,y)+.024-baseZ):0;
    const [,backRx,backRz,backCenterZ]=profileAt(profile,profileY);
    const backRatio=THREE.MathUtils.clamp(Math.abs(x)/Math.max(.01,backRx),0,.98);
    const backZ=backCenterZ-backRz*Math.sqrt(Math.max(.01,1-backRatio*backRatio))-.020;
    const backBlend=THREE.MathUtils.smoothstep(-cosine,.12,.78);
    const z=THREE.MathUtils.lerp(baseZ+frontFit,backZ,backBlend);
    vertices.push(x,y+styleHeight(x,y)*hairSurfaceBlend,z+styleLift(x,y)*hairSurfaceBlend+hairTexture);
    const sweep=look.style==='comb-over'?THREE.MathUtils.smoothstep(x,-.30,.12)*.22
      :look.style==='short-side-part'?THREE.MathUtils.smoothstep(x,-.28,.18)*.16
      :look.style==='short-swept'?THREE.MathUtils.smoothstep(x,-.30,.18)*.18
      :look.style==='long-straight'?.12*Math.exp(-(((Math.abs(x)-.09)/.08)**2))
      :look.style==='long-wavy'?.20*THREE.MathUtils.smoothstep(x,-.12,.22):0;
    const color=baseHair.clone().lerp(highlightHair,Math.min(.62,sweep+Math.max(0,wave)*.16));
    color.lerp(shadowHair,Math.max(0,-wave)*.10+part*.24);
    if(look.style==='receding-short') {
      const thinTop=Math.exp(-((x/.17)**2+((y-(high+.035))/.11)**2));
      color.lerp(new THREE.Color(look.skin),thinTop*.76);
    }
    color.toArray(colors,colors.length);
  }
  const stride=phiCount+1,topIndex=vertices.length/3;
  const topY=high+topLift;
  vertices.push(0,topY+styleHeight(0,topY),crownCenterZ+styleLift(0,topY));
  baseHair.clone().lerp(highlightHair,.08).toArray(colors,colors.length);
  for(let row=0;row<rowCount;row++) for(let phi=0;phi<phiCount;phi++) {
    const a=row*stride+phi,b=a+1,c=a+stride+1,d=a+stride;
    faces.push(a,d,c,a,c,b);
  }
  for(let phi=0;phi<phiCount;phi++) faces.push(topIndex,phi+1,phi);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(faces); geometry.computeVertexNormals();
  model.geometry(null,geometry);
  const cap={profile,depthAt,crownCenterY:0,crownRadius:topLift,rx:crownRx,rz:crownRz,cz:crownCenterZ,pointAt};
  addHairStyle(model,look,cap);
}

function addHairCurtain(model,look,side,cap) {
  const wavy=look.style==='long-wavy',bob=look.hairLength==='bob',top=look.hairline+.035,
    bottom=bob?-.44:wavy?-.92:-.56;
  const rows=64,across=36,positions=[],colors=[],indices=[];
  const baseHair=new THREE.Color(look.hair),highlightHair=new THREE.Color(look.hairLight),shadowHair=baseHair.clone().multiplyScalar(.90);
  const frontDepth=(x,y)=>{
    const [cy,rx,rz,centerZ]=profileAt(cap.profile,THREE.MathUtils.clamp(y,cap.profile[0][0],cap.profile.at(-1)[0]));
    const ratio=THREE.MathUtils.clamp(Math.abs(x)/Math.max(.05,rx),0,1.08);
    const skull=centerZ+rz*Math.sqrt(Math.max(.015,1-ratio**2));
    if(y<cap.profile[0][0]) return THREE.MathUtils.lerp(centerZ-.055,.205,
      THREE.MathUtils.smoothstep(cap.profile[0][0]-y,.02,.34));
    if(y>cap.profile.at(-1)[0]) return skull;
    const sideBlend=THREE.MathUtils.smoothstep(ratio,.86,1.06);
    return THREE.MathUtils.lerp(cap.depthAt(x,y),skull,sideBlend);
  };
  const surfacePoint=(row,column,back=false)=>{
    const v=row/rows,t=column/across*2-1;
    const hem=wavy?.022*Math.sin(t*Math.PI*2+side*.55):.016*t*t;
    const y=THREE.MathUtils.lerp(top,bottom+hem,v);
    const fadeTop=.24+.76*THREE.MathUtils.smoothstep(v,.04,.18);
    const fadeBottom=wavy?1-.28*THREE.MathUtils.smoothstep(v,.90,1):1-.30*THREE.MathUtils.smoothstep(v,.86,1);
    const wave=wavy?Math.sin(v*Math.PI*3.0+side*.45)*.040:0;
    const spread=THREE.MathUtils.smoothstep(v,0,.38);
    const startCenter=wavy ? (side<0 ? .205 : .235) : bob ? .245 : .235;
    const endCenter=wavy ? (side<0 ? .29 : .33) : bob ? .30 : .32;
    const center=THREE.MathUtils.lerp(startCenter,endCenter,spread)
      +(wavy?.040*Math.sin(v*Math.PI*2+side*.45):.004*Math.sin(v*Math.PI*1.4))+wave*.18;
    const width=(wavy ? .078 : bob ? .052 : .060)+(wavy ? .034 : bob ? .006 : .008)*THREE.MathUtils.smoothstep(v,.30,.88)
      +(wavy ? .012 : bob ? .006 : .008)*Math.sin(v*Math.PI*.72);
    const taperedWidth=width*fadeTop*fadeBottom;
    const x=side*(center+t*taperedWidth);
    const round=Math.sqrt(Math.max(0,1-t*t));
    const strandPhase=t*Math.PI*9+v*1.4+(wavy?.6*Math.sin(v*Math.PI*2+side):0);
    const strandRelief=Math.cos(strandPhase)*.0012*fadeTop*fadeBottom*(back?-.45:1);
    // A wider camber gives the hair curtain a rounded lock volume instead of
    // a paper-thin sheet; keep the rear shell close so the sides still join.
    const z=frontDepth(x,y)+(back?-.038:.020+.040*round)+wave*.12+strandRelief;
    return [x,y,z];
  };
  const count=(rows+1)*(across+1);
  for(let back=0;back<2;back++) for(let row=0;row<=rows;row++) for(let column=0;column<=across;column++) {
    const v=row/rows,t=column/across*2-1,point=surfacePoint(row,column,Boolean(back));
    positions.push(...point);
    const flow=1-Math.abs(t);
    const strandFlow=.035*Math.cos(t*Math.PI*9+v*1.4+(wavy?.6*Math.sin(v*Math.PI*2+side):0));
    const waveFlow=wavy?.045*Math.sin(v*Math.PI*5+t*2.4+side):.018*Math.cos(v*Math.PI*2+t*1.6);
    const color=baseHair.clone().lerp(highlightHair,(.08+flow*.14+strandFlow+waveFlow)*(back?.55:1));
    if(back) color.lerp(shadowHair,.06);
    color.toArray(colors,colors.length);
  }
  for(let row=0;row<rows;row++) for(let column=0;column<across;column++) {
    const a=row*(across+1)+column,b=a+1,c=a+across+1,d=c+1;
    if(side>0) indices.push(a,c,b,b,c,d,a+count,b+count,c+count,b+count,d+count,c+count);
    else indices.push(a,b,c,b,d,c,a+count,c+count,b+count,b+count,c+count,d+count);
  }
  for(const column of [0,across]) for(let row=0;row<rows;row++) {
    const a=row*(across+1)+column,b=a+across+1;
    indices.push(a,b,a+count,a+count,b,b+count);
  }
  for(const row of [0,rows]) for(let column=0;column<across;column++) {
    const a=row*(across+1)+column,b=a+1;
    indices.push(a,a+count,b,b,a+count,b+count);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  model.geometry(null,geometry);
}

function hairSidePoint(cap,x,y,lift=.025) {
  const low=cap.profile[0][0],high=cap.profile.at(-1)[0],sampleY=THREE.MathUtils.clamp(y,low,high);
  const [,rx,rz,centerZ]=profileAt(cap.profile,sampleY),ratio=Math.abs(x)/Math.max(.03,rx);
  const sideDepth=centerZ+rz*Math.sqrt(Math.max(.015,1-ratio*ratio));
  const frontDepth=y>=low&&y<=high?cap.depthAt(x,y):sideDepth;
  const z=THREE.MathUtils.lerp(frontDepth,sideDepth,THREE.MathUtils.smoothstep(ratio,.72,1));
  const rearward=y<low?THREE.MathUtils.smoothstep(low-y,0,.28):0;
  return [x,y,THREE.MathUtils.lerp(z,-.13,rearward)+lift];
}

function addLongLock(model,look,side,cap,wavy=false,offset=0) {
  const coords=wavy
    ? [[.18,.29],[.25,.13],[.30,-.08],[.29,-.27],[.25,-.48],[.26,-.68],[.22,-.84]]
    : [[.18,.29],[.25,.12],[.29,-.10],[.28,-.34],[.24,-.61]];
  const points=coords.map(([x,y])=>hairSidePoint(cap,side*(x+offset),y,.026));
  addTaperedTube(model,look.hair,points,wavy?[.025,.055,.062,.060,.048,.034,.004]:[.026,.063,.066,.052,.006]);
  if(wavy) {
    const highlight=coords.map(([x,y])=>hairSidePoint(cap,side*(x-.018+offset),y,.060));
    addTaperedTube(model,look.hairLight,highlight,[.001,.0025,.003,.0025,.002,.0015,.001],42,8);
  }
}

function backCapPoint(cap,x,y) {
  const [,rx,rz,centerZ]=profileAt(cap.profile,THREE.MathUtils.clamp(y,cap.profile[0][0],cap.profile.at(-1)[0]));
  const ringWidth=rx+.01,sinPhi=THREE.MathUtils.clamp(x/ringWidth,-.98,.98);
  const cosPhi=-Math.sqrt(Math.max(.01,1-sinPhi*sinPhi));
  return [x,y,centerZ+cosPhi*(rz+.012)-.006];
}

function addBackHairVolume(model,look,cap,bottom) {
  const rows=72,across=56,positions=[],colors=[],indices=[],high=cap.profile.at(-1)[0],top=high+.14;
  const baseHair=new THREE.Color(look.hair),lightHair=new THREE.Color(look.hairLight);
  const long=look.style.startsWith('long'),wavy=look.style==='long-wavy';
  for(let row=0;row<=rows;row++) {
    const v=row/rows,y=THREE.MathUtils.lerp(top,bottom,v);
    const [,rx,rz,centerZ]=profileAt(cap.profile,THREE.MathUtils.clamp(y,cap.profile[0][0],cap.profile.at(-1)[0]));
    const fullness=long?THREE.MathUtils.smoothstep(v,0,.08)*(1-.08*THREE.MathUtils.smoothstep(v,.94,1))
      :THREE.MathUtils.smoothstep(v,0,.12)*(1-.36*THREE.MathUtils.smoothstep(v,.78,1));
    for(let column=0;column<=across;column++) {
      const u=column/across,angle=THREE.MathUtils.lerp(-1.62,1.62,u),side=Math.sin(angle);
      const wave=wavy?.016*Math.sin(v*Math.PI*4+angle*2.2):0;
      const waveWidth=wavy?.022*Math.sin(v*Math.PI*3.2+angle*1.6):0;
      const shellRx=long?cap.rx:rx,shellRz=long?Math.max(rz,cap.rz*.78):rz;
      const crown=Math.sqrt(THREE.MathUtils.clamp(1-((y-high)/.14)**2,0,1));
      const width=shellRx*(long?.97+fullness*.09+waveWidth:.95+fullness*.012)*crown;
      const depth=shellRz*(long?.90+fullness*.08+wave*.3:.95+fullness*.012)*crown;
      const hem=wavy?.035*Math.sin(angle*1.7+v*Math.PI*3):0;
      const x=side*width,yPoint=y+hem*THREE.MathUtils.smoothstep(v,.72,1);
      const backArch=Math.sqrt(Math.max(.015,1-((y+.09)/.49)**2));
      const z=centerZ-Math.sqrt(Math.max(.015,1-side*side))*Math.max(depth,.22*backArch*crown)-.008+wave;
      positions.push(x,yPoint,z);
      const sweep=(1-Math.abs(side))*.12+.08*Math.sin(v*Math.PI*2+angle*2);
      baseHair.clone().lerp(lightHair,THREE.MathUtils.clamp(sweep,0,.24)).toArray(colors,colors.length);
    }
  }
  const stride=across+1;
  for(let row=0;row<rows;row++) for(let column=0;column<across;column++) {
    const a=row*stride+column,b=a+1,c=a+stride,d=c+1;
    indices.push(a,b,c,b,d,c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  model.geometry(null,geometry);
}

function addRearHairStrands(model,look,cap,longHair=false) {
  const offsets=longHair?[-.12,-.06,0,.06,.12]:[-.10,0,.10];
  const strand=new THREE.Color(look.hair).lerp(new THREE.Color(look.hairLight),.18);
  for(const offset of offsets) {
    const ys=longHair?[.24,.12,-.04,-.18,-.30]:[.24,.10,-.04,-.18,-.32,-.42];
    const points=ys.map((y,index)=>{
      const t=index/(ys.length-1),curve=Math.sin(t*Math.PI)*(offset<0?.012:-.012);
      return backCapPoint(cap,offset+curve,y);
    });
    addTube(model,strand,points,longHair?.003:.0035,32);
  }
}

function addScalpStrands(model,look,cap) {
  const {profile,depthAt}=cap,low=profile[0][0],high=profile.at(-1)[0];
  const topLift=look.style==='comb-over'?.045:look.style==='short-swept'?.034
    :look.style==='receding-short'?.014:look.style==='long-straight'?.022
    :look.style==='long-wavy'?.032:.018,top=high+topLift;
  const highlight=new THREE.Color(look.hair).lerp(new THREE.Color(look.hairLight),.14);
  const dark=new THREE.Color(look.hair).multiplyScalar(.88);
  const surface=(phi,y)=>{
    const sampleY=THREE.MathUtils.clamp(y,low,high),[,rx,rz,centerZ]=profileAt(profile,sampleY);
    const sin=Math.sin(phi),cos=Math.cos(phi);
    const crown=y>high?.038*Math.sqrt(THREE.MathUtils.clamp((top-y)/(top-high),0,1)):.010;
    const x=sin*(rx+crown+.010);
    const z=cos>.08&&y<=high?depthAt(x,y)+.018:centerZ+cos*(rz+crown+.015);
    return [x,y,z];
  };
  for(const side of [-1,1]) for(const offset of [-.20,.20]) {
    const phi=side*(Math.PI/2+offset),sin=Math.abs(Math.sin(phi)),cos=Math.cos(phi);
    const sideDrop=look.style.startsWith('long')?.12:look.style==='receding-short'?.40:.34;
    const hairline=look.hairline+(look.style==='long-wavy'?.025*sin:0),sideEnd=hairline-sideDrop;
    const rearEnd=look.style.startsWith('long')?-.37:-.39;
    const frontSide=sin**(look.style.startsWith('long')?1.2:4.5);
    const edge=cos>=0?THREE.MathUtils.lerp(hairline,sideEnd,frontSide)
      :THREE.MathUtils.lerp(sideEnd,rearEnd,-cos);
    const endY=edge;
    const points=[];
    for(let step=0;step<=10;step++) {
      const t=step/10,y=THREE.MathUtils.lerp(Math.min(top-.012,high-.025),endY,t);
      points.push(surface(phi,y));
    }
    addTube(model,offset===0?dark:highlight,points,.0025,32);
  }
}

function addLongHairLocks(model,look,cap,side,outer=false,offset=0) {
  const wavy=look.style==='long-wavy',rows=48,sides=24;
  const bottom=wavy?(side<0?-.86:-.78):-.68,vertices=[],indices=[],rings=[];
  const centerAt=t=>{
    const base=wavy?.235+.048*THREE.MathUtils.smoothstep(t,.14,.95):.235+.012*t;
    return base+(wavy?.080*Math.sin(t*Math.PI*2.1+side*.5):.006*Math.sin(t*Math.PI));
  };
  for(let row=0;row<=rows;row++) {
    const t=row/rows,y=THREE.MathUtils.lerp(look.hairline+.025,bottom,t)
      +(wavy?.065*Math.sin(t*Math.PI*2+side*.4)*t:0);
    const x=side*(centerAt(t)+offset),endTaper=1-.26*THREE.MathUtils.smoothstep(t,.84,1);
    const width=((outer?.056:.047)+(wavy?.015:.006)*Math.sin(Math.PI*t)
      +(wavy?.010:0)*THREE.MathUtils.smoothstep(t,.38,.90))*endTaper;
    const depth=((outer?.040:.033)+(wavy?.014:.006)*Math.sin(Math.PI*t))*endTaper;
    const center=hairSidePoint(cap,x,y,outer?.018:.025);
    const wave=wavy?.020*Math.sin(t*Math.PI*3+side*.55):0;
    rings.push({x,y,z:center[2]+wave,width,depth});
    for(let section=0;section<sides;section++) {
      const a=section/sides*TAU;
      vertices.push(x+side*Math.cos(a)*width,y,center[2]+wave+Math.sin(a)*depth);
    }
  }
  for(let row=0;row<rows;row++) for(let section=0;section<sides;section++) {
    const next=(section+1)%sides,a=row*sides+section,b=(row+1)*sides+section,
      c=row*sides+next,d=(row+1)*sides+next;
    indices.push(a,c,b,c,d,b);
  }
  const topCenter=vertices.length/3;
  vertices.push(rings[0].x,rings[0].y,rings[0].z);
  const bottomCenter=vertices.length/3,last=rows*sides;
  vertices.push(rings.at(-1).x,rings.at(-1).y,rings.at(-1).z);
  for(let section=0;section<sides;section++) {
    const next=(section+1)%sides;
    indices.push(topCenter,section,next,bottomCenter,last+next,last+section);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  model.geometry(look.hair,geometry);
  const highlight=new THREE.Color(look.hair).lerp(new THREE.Color(look.hairLight),outer?.24:.14);
  const points=rings.map(ring=>[ring.x+side*ring.width*.22,ring.y,ring.z+ring.depth*.72]);
  addTube(model,highlight,points,outer?.0020:.0014,48);
}

function addSideburns(model,look,cap) {
  for(const side of [-1,1]) {
    const points=[.15,.085,.02,-.035].map(y=>{
      const [,rx]=profileAt(cap.profile,THREE.MathUtils.clamp(y,cap.profile[0][0],cap.profile.at(-1)[0]));
      return hairSidePoint(cap,side*rx*.96,y,.014);
    });
    addTaperedTube(model,look.hair,points,[.007,.011,.009,.0015],32,10);
  }
}

function addRecedingSideHair(model,look,cap) {
  for(const side of [-1,1]) {
    const points=[[.27,.13],[.286,.055],[.282,-.025],[.264,-.085]]
      .map(([x,y])=>cap.pointAt(side*x,y,.020));
    addTaperedTube(model,look.hair,points,[.003,.013,.015,.004],36,12);
  }
}

function addHairStyle(model, look, cap) {
  if (look.style === 'long-straight' || look.style === 'long-wavy') {
    for(const side of [-1,1]) {
      addHairCurtain(model,look,side,cap);
    }
    return;
  }
  if(cap.pointAt&&look.style==='receding-short') addRecedingSideHair(model,look,cap);
  else if(cap.pointAt) addSideburns(model,look,cap);
}

function addEyes(model, look) {
  const [spacing, eyeScale] = look.eye;
  for (const side of [-1,1]) {
    const x = side * spacing, y = look.style === 'comb-over' ? .095 : .10;
    const z = faceZ(look.head, x, y) + .006;
    addOval(model, '#e7ddd2', [x,y,z], [eyeScale*1.08,eyeScale*.61,.011], 24);
    addOval(model, look.eyes, [x,y,z+.012], [eyeScale*.39,eyeScale*.48,.006], 20);
    addOval(model, '#29343a', [x,y,z+.018], [eyeScale*.19,eyeScale*.29,.004], 16);
    addOval(model, '#fff3e4', [x-eyeScale*.10,y+eyeScale*.15,z+.022], [eyeScale*.07,eyeScale*.08,.003], 12);
    const upperY = y + eyeScale*.47;
    addTube(model, '#986f67',
      [[x-eyeScale*1.12,y,z+.010],[x-eyeScale*.62,upperY,z+.014],[x,upperY+eyeScale*.08,z+.016],
        [x+eyeScale*.64,upperY,z+.014],[x+eyeScale*1.12,y,z+.010]], .0025, 20);
    const browY = y + (look.glasses ? .09 : .08);
    addTube(model, look.brow,
      [[x-.064,browY-.008,faceZ(look.head,x-.064,browY)+.009],
        [x-.027,browY+.009,faceZ(look.head,x-.027,browY)+.011],
        [x+.018,browY+.008,faceZ(look.head,x+.018,browY)+.011],
        [x+.064,browY-.007,faceZ(look.head,x+.064,browY)+.009]], .008, 20);
  }
  if (look.glasses) addGlasses(model, look);
}

function addGlasses(model, look) {
  const [spacing, eyeScale] = look.eye;
  const zAt = (x,y) => faceZ(look.head,x,y)+.014;
  for (const side of [-1,1]) {
    const cx = side*spacing, cy=.10, rx = look.glasses === 'round' ? .071 : .081, ry = look.glasses === 'round' ? .063 : .051;
    const points=[];
    for (let i=0;i<=28;i++) {
      const a=i/28*TAU, c=Math.cos(a), s=Math.sin(a);
      const exponent=look.glasses==='round' ? 1 : .5;
      const x=cx+rx*Math.sign(c)*Math.abs(c)**exponent;
      const y=cy+ry*Math.sign(s)*Math.abs(s)**exponent;
      points.push([x,y,zAt(x,y)]);
    }
    addTube(model, '#272b2d', points, .008, 32);
    addTube(model, '#272b2d', [[cx+side*rx*.82,cy,zAt(cx+side*rx*.82,cy)],
      [side*(spacing+rx+.05),cy-.005,.14],[side*(spacing+rx+.08),-.02,-.08]], .007, 20);
  }
  const bridgeY=.105, bridgeA=spacing-.014, bridgeB=-spacing+.014;
  addTube(model,'#272b2d',[[bridgeA,bridgeY,zAt(bridgeA,bridgeY)],[-.018,.124,zAt(0,.124)+.003],[bridgeB,bridgeY,zAt(bridgeB,bridgeY)]],.007,16);
}

function addNoseAndMouth(model, look) {
  const [length,width] = look.nose;
  const tipY = -.055 - (length-1)*.055;
  const bridgeY = .11;
  const bridgeZ = faceZ(look.head,0,bridgeY)+.012;
  addOval(model, look.skin, [0,.005,bridgeZ+.021*length], [.043*width,.125*length,.046*length], 28);
  const tipZ = faceZ(look.head,0,tipY)+.026*length;
  addOval(model, look.skin, [0,tipY,tipZ], [.055*width,.036,.032*length], 28);
  for (const side of [-1,1]) {
    addOval(model, look.skin, [side*.040*width,tipY-.016,tipZ-.006], [.026,.021,.021], 18);
    addOval(model, '#865f57', [side*.032*width,tipY-.035,tipZ+.004], [.009,.004,.003], 12);
  }
  const mouthY=-.285, mouthZ=faceZ(look.head,0,mouthY)+.016;
  const widthM=look.style==='comb-over'?.082:look.style==='long-wavy'?.080:.088;
  addOval(model,'#4b2929',[0,mouthY,mouthZ],[widthM,.012,.006],24);
  const lip=look.lips;
  const smile=look.style==='short-swept'?.008:look.style==='long-wavy'?.002:0;
  addTube(model,lip,[[-widthM,mouthY-.002,mouthZ+.004],[-widthM*.55,mouthY+.004+smile,mouthZ+.006],
    [0,mouthY+.003,mouthZ+.008],[widthM*.55,mouthY+.004+smile,mouthZ+.006],[widthM,mouthY-.002,mouthZ+.004]],.005,24);
  const jawBuilder=createSceneryModel(`${look.name} lower jaw`);
  const jaw=new THREE.Group();
  jaw.name='Moving lower jaw';
  jaw.position.set(0,mouthY-.012,mouthZ-.024);
  addOval(jawBuilder,look.skin,[0,-.050,.002],[widthM*.92,.074,.027],28);
  if(look.style==='short-swept'||look.style==='comb-over')
    addOval(jawBuilder,'#eee0cf',[0,.004,.046],[widthM*.60,.008,.003],24);
  addTube(jawBuilder,lip,[[-widthM*.80,-.014,.047],[-widthM*.42,-.022,.053],
    [0,-.026,.055],[widthM*.42,-.022,.053],[widthM*.80,-.014,.047]],.004,20);
  jaw.add(jawBuilder.finish({vertexColors:true,roughness:.78}));
  return jaw;
}

function addEars(model, look, points, depthAt) {
  const longHair=look.style.startsWith('long');
  if(longHair) return;
  for (const side of [-1,1]) {
    const x=side*.315,y=-.005,z=depthAt(side*.285,y)-.008;
    const width=look.name==='Stubb'?.022:.024,height=look.name==='Stubb'?.050:.052;
    addOval(model,look.skin,[x,y,z],[width,height,.016],28);
    addOval(model,look.blush,[x+side*.003,y-.006,z+.010],[width*.30,height*.40,.003],24);
    const rim=[[x-side*.007,y-.031,z+.008],[x+side*.005,y-.029,z+.011],[x+side*.014,y-.013,z+.014],
      [x+side*.016,y+.013,z+.014],[x+side*.009,y+.029,z+.011],[x-side*.003,y+.031,z+.008]];
    addTube(model,look.skin,rim,.0032,24);
    addTube(model,new THREE.Color(look.blush).multiplyScalar(.82),
      [[x-side*.004,y-.018,z+.015],[x+side*.005,y-.009,z+.018],[x+side*.008,y+.006,z+.020],
        [x+side*.003,y+.018,z+.016]],.0025,20);
  }
}

export function createCameoHead(kind) {
  const look=CAMEO_HEADS[kind];
  if (!look) throw new Error(`Unknown cameo head: ${kind}`);
  const head=new THREE.Group(); head.name='Sculpted 3D head';
  head.position.y=2.77;
  let points=CAMEO_FACE_DATA[kind].map(([x,y,z])=>new THREE.Vector3(x,y-2.77,z));
  const profiled=CAMEO_FACE_PROFILED.includes(kind);
  const fitted=CAMEO_FACE_FITTED.includes(kind);
  if(!profiled) fitProfileDepth(points,look);
  if(!fitted) fitFacialProportions(points,look);
  // Use a restrained outline correction over the Finnish multi-view fit;
  // a full-strength warp stretched their measured cheeks and jaw too far.
  applyIndividualHeadShape(points,look,fitted?.72:1);
  if(kind!=='stubb') neutralizeMouth(points);
  if(fitted) points[1].z-=look.noseTipInset??.012;
  // The fitted heads already contain measured profile depth. Keep those
  // landmark volumes intact and add only one restrained sculpt pass below;
  // amplifying and sculpting them twice made noses and jaws project too far.
  smoothLandmarkDepth(points,fitted?1:6);
  const smoothReliefAt=fitted?makeSmoothFaceReliefSampler(points,look):null;
  const measuredDepthAt=fitted?makeLandmarkDepthSampler(points,look):null;
  const depthAt=fitted
    ?(x,y)=>measuredDepthAt(x,y)+smoothReliefAt(x,y)
    :makeSculptedLandmarkDepthSampler(points,look);
  const mouthY=(points[13].y+points[14].y)/2,mouthZ=depthAt(0,mouthY);
  const jawBoundary=point=>{
    const frontness=THREE.MathUtils.smoothstep(point.z,-.055,.115);
    const faceLine=mouthY-.012-.145*THREE.MathUtils.smoothstep(Math.abs(point.x),.055,.245);
    return THREE.MathUtils.lerp(-1.1,faceLine,frontness);
  };
  const fullHead=fitted?multiviewHead(points,look,smoothReliefAt):landmarkSculpt(points,look,depthAt);
  const position=fullHead.getAttribute('position'),normal=fullHead.getAttribute('normal'),color=fullHead.getAttribute('color'),index=fullHead.index;
  const vertices=Array.from({length:position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(position,i));
  const normals=Array.from({length:normal.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(normal,i));
  const colors=Array.from({length:color.count},(_,i)=>new THREE.Color().fromBufferAttribute(color,i));
  const faces=Array.from({length:index.count/3},(_,i)=>[index.getX(i*3),index.getX(i*3+1),index.getX(i*3+2)]);
  const upperHead=clippedMesh(vertices,faces,normals,jawBoundary,true,look,[],0,0,colors);
  const chinGeometry=clippedMesh(vertices,faces,normals,jawBoundary,false,look,[],mouthY,mouthZ,colors);
  const buildShell=(surface,name)=>{
    const geometry=createSceneryModel(`${kind} ${name}`);
    geometry.geometry(null,surface);
    landmarkEyes(geometry,look,points,depthAt);
    addLandmarkNoseAndMouth(geometry,look,points,depthAt);
    scalp(geometry,look,points,depthAt);
    addEars(geometry,look,points,depthAt);
    const shell=geometry.finish({vertexColors:true,roughness:.84});
    shell.traverse(part=>{if(part.isMesh){
      part.castShadow=false;part.receiveShadow=true;
      part.material.dispose();
      part.material=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.72,sheen:.09,
        sheenColor:new THREE.Color(look.skin),sheenRoughness:.62,clearcoat:.06,clearcoatRoughness:.8,
        side:THREE.DoubleSide});
      part.material.needsUpdate=true;
    }});
    return shell;
  };
  const closedShell=buildShell(fullHead,'closed head'),openShell=buildShell(upperHead,'open head');
  closedShell.name=`${look.name} closed head shell`;
  openShell.name=`${look.name} open head shell`;
  openShell.visible=false;
  head.add(closedShell,openShell);
  const jawBuilder=createSceneryModel(`${look.name} lower chin`);
  jawBuilder.geometry(null,chinGeometry);
  const jaw=new THREE.Group();
  jaw.name='Moving lower jaw';
  jaw.position.set(0,mouthY,mouthZ);
  const lowerJaw=jawBuilder.finish({vertexColors:true,roughness:.68});
  lowerJaw.traverse(part=>{if(part.isMesh){part.castShadow=false;part.receiveShadow=false;
    part.material.side=THREE.DoubleSide;part.material.needsUpdate=true;}});
  jaw.add(lowerJaw);
  jaw.visible=false;
  head.add(jaw);
  head.userData.jaw=jaw;
  head.userData.closedShell=closedShell;
  head.userData.openShell=openShell;
  head.scale.set(...look.scale);
  head.userData.jawOpen=0;
  return head;
}

export function createCameoNeck(kind) {
  const look=CAMEO_HEADS[kind], geometry=createSceneryModel(`${kind} neck`);
  geometry.geometry(look.skin,new THREE.CylinderGeometry(.11,.14,.33,28).translate(0,2.30,0));
  return geometry.finish({vertexColors:true,roughness:.78});
}

export function animateCameoHead(head, time, running) {
  const bounce=running ? Math.max(0,Math.sin(time*9)) : 0;
  head.rotation.z=running ? Math.sin(time*9)*.012 : 0;
  head.userData.closedShell.visible=!running;
  head.userData.openShell.visible=running;
  head.userData.jaw.visible=running;
  head.userData.jaw.rotation.x=running ? .14+bounce*.08 : 0;
}
