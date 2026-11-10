import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSceneryModel } from '../maps/scenery-model.js';
import { CAMEO_FACE_DATA } from './cameo-face-data.js';

const TAU = Math.PI * 2;
const SEGMENTS = 48;

export const CAMEO_HEADS = {
  purra: {
    name: 'Purra',
    skin: '#e9bda8', blush: '#d99c8f', lips: '#a95e65', eyes: '#71899a',
    hair: '#c0b18b', hairLight: '#ded3b1', brow: '#9d8a6e',
    head: [[-.54,.025,.07,0],[-.48,.13,.15,0],[-.34,.19,.21,-.005],[-.13,.25,.245,-.015],[.12,.285,.25,-.025],[.34,.23,.21,-.045],[.51,.095,.11,-.055],[.55,.015,.03,-.055]],
    style: 'long-straight', hairline: .23, nose: [.95,.92], eye: [.115,.050], glasses: null,
    scale: [.98,1,1], profileDepth: [0,0,0,0],
  },
  orpo: {
    name: 'Orpo',
    skin: '#dfb59d', blush: '#ce9585', lips: '#965e5e', eyes: '#71818a',
    hair: '#62594d', hairLight: '#8d806e', brow: '#534a40',
    head: [[-.54,.02,.07,0],[-.48,.145,.16,0],[-.34,.255,.22,-.005],[-.13,.305,.25,-.02],[.12,.305,.25,-.035],[.34,.25,.22,-.05],[.51,.105,.12,-.06],[.55,.016,.03,-.06]],
    style: 'short-side-part', hairline: .31, nose: [1.05,1.06], eye: [.12,.046], glasses: 'round',
    scale: [1.03,1,1], profileDepth: [0,0,0,0],
  },
  marin: {
    name: 'Marin',
    skin: '#f0c9b3', blush: '#e7a598', lips: '#9c555e', eyes: '#687d87',
    hair: '#49372f', hairLight: '#846450', brow: '#523b33',
    head: [[-.54,.015,.06,0],[-.48,.12,.15,0],[-.34,.18,.21,-.005],[-.13,.23,.24,-.015],[.12,.265,.24,-.025],[.34,.22,.205,-.045],[.51,.09,.10,-.055],[.55,.015,.03,-.055]],
    style: 'long-wavy', hairline: .29, nose: [.92,.90], eye: [.112,.050], glasses: null,
    scale: [.94,1,1], profileDepth: [0,0,0,0],
  },
  stubb: {
    name: 'Stubb',
    skin: '#e6b79c', blush: '#d69a89', lips: '#9b5b5c', eyes: '#677f94',
    hair: '#827c72', hairLight: '#a9a297', brow: '#625b53',
    head: [[-.54,.018,.065,0],[-.48,.145,.16,0],[-.34,.24,.22,-.005],[-.13,.29,.255,-.02],[.12,.30,.255,-.03],[.34,.25,.22,-.045],[.51,.105,.12,-.06],[.55,.016,.03,-.06]],
    style: 'short-swept', hairline: .30, nose: [1.02,.98], eye: [.12,.048], glasses: 'rect',
    scale: [.97,1.04,1], profileDepth: [0,0,0,0],
  },
  putin: {
    name: 'Putin',
    skin: '#e2b8a5', blush: '#cf9384', lips: '#975e5e', eyes: '#77878d',
    hair: '#89857c', hairLight: '#b8b2a7', brow: '#79746a',
    head: [[-.54,.02,.07,0],[-.48,.145,.17,0],[-.34,.24,.22,-.005],[-.13,.29,.255,-.02],[.12,.30,.25,-.035],[.34,.25,.22,-.05],[.51,.11,.12,-.06],[.55,.016,.03,-.06]],
    style: 'receding-short', hairline: .405, nose: [1.06,1.02], eye: [.118,.046], glasses: null,
    scale: [1,1.02,1], profileDepth: [.012,.060,.030,.040],
  },
  trump: {
    name: 'Trump',
    skin: '#d8a074', blush: '#c77c61', lips: '#8b5148', eyes: '#65798a',
    hair: '#bd8b30', hairLight: '#e1bb61', brow: '#9b7429',
    head: [[-.55,.025,.075,0],[-.48,.155,.17,0],[-.34,.26,.235,-.005],[-.13,.32,.27,-.02],[.12,.32,.27,-.035],[.34,.265,.235,-.05],[.51,.115,.13,-.06],[.56,.018,.03,-.06]],
    style: 'comb-over', hairline: .36, nose: [1.15,1.14], eye: [.126,.048], glasses: null,
    scale: [1.06,1.04,1], profileDepth: [.018,.065,.038,.045],
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
  for (let row=0;row<=segments;row++) {
    const t=row/segments,scaled=t*(radii.length-1),span=Math.min(radii.length-2,Math.floor(scaled));
    const radius=THREE.MathUtils.lerp(radii[span],radii[span+1],scaled-span);
    const center=curve.getPointAt(t);
    for (let side=0;side<=sides;side++) {
      const angle=side/sides*TAU;
      const normal=frames.normals[row].clone().multiplyScalar(Math.cos(angle))
        .addScaledVector(frames.binormals[row],Math.sin(angle));
      positions.push(center.x+normal.x*radius,center.y+normal.y*radius,center.z+normal.z*radius);
    }
  }
  for (let row=0;row<segments;row++) for (let side=0;side<sides;side++) {
    const a=row*(sides+1)+side,b=a+sides+1;
    indices.push(a,b,a+1,a+1,b,b+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  model.geometry(color,geometry);
}

function capPoint(look, x, y, lift = .008, fitted = look.head, depthAt = null, crownCenterY = .015, crownRadius = .43) {
  const [, rx] = fitted.reduce((wide, row) => row[1] > wide[1] ? row : wide,fitted[0]);
  const [, , rz, centerZ] = profileAt(fitted,.08);
  const hairX=THREE.MathUtils.clamp(x,-rx*.98,rx*.98);
  const cy = THREE.MathUtils.clamp((y - crownCenterY) / crownRadius, -.98, .98);
  const cx = hairX / (rx * 1.045);
  const front = Math.sqrt(Math.max(.015, 1 - cy * cy - cx * cx));
  const base = centerZ + rz * 1.045 * front + .025;
  return [hairX, y, Math.max(base, depthAt ? depthAt(hairX,y) + .006 : base) + lift];
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
  const depthScale=1.35;
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
    return [fittedY,THREE.MathUtils.lerp(rx*widthScale,measuredWidth,.72),rz*depthScale,centerZ-rz*(depthScale-1)];
  });
}

function sculptedHead(profile,points,look,lips,depthAt) {
  const fitted=fitHeadProfile(profile,points),rings=96,rows=96,low=fitted[0][0],high=fitted.at(-1)[0];
  const vertices=[],colors=[],indices=[],point=new THREE.Vector3();
  for (let row=0;row<=rows;row++) {
    const y=THREE.MathUtils.lerp(low,high,row/rows),[,rx,rz,centerZ]=profileAt(fitted,y);
    for (let ring=0;ring<rings;ring++) {
      const angle=ring/rings*TAU,x=rx*Math.sin(angle),facing=Math.max(0,Math.cos(angle));
      const baseZ=centerZ+rz*Math.cos(angle);
      const detail=THREE.MathUtils.smoothstep(facing,.08,.82);
      const targetZ=depthAt(x,y);
      const displacement=THREE.MathUtils.clamp((targetZ-baseZ)*.82,-.13,.13)*detail;
      const cheeks=Math.exp(-(((Math.abs(x)-.16)/.10)**2+((y+.10)/.14)**2));
      const brow=Math.exp(-(((Math.abs(x)-.12)/.10)**2+((y-.18)/.055)**2));
      const chin=Math.exp(-((x/.12)**2+((y+.39)/.075)**2));
      const [noseLength,noseWidth]=look.nose,bridgeY=(points[6].y+points[4].y)/2,tipY=points[1].y;
      const bridge=Math.exp(-((x/(.034*noseWidth))**2+((y-bridgeY)/(.092*noseLength))**2))*.020*noseLength;
      const tip=Math.exp(-((x/(.045*noseWidth))**2+((y-tipY)/.036)**2))*.032*noseLength;
      const alae=Math.exp(-(((Math.abs(x)-.034*noseWidth)/.018)**2+((y-tipY+.018)/.022)**2))*.012;
      const z=baseZ+displacement+facing*(cheeks*.026+brow*.014+chin*.016+bridge*.80+tip*.72+alae*.80);
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

function subdivideMesh(vertices, faces, rounds = 2) {
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
    const edgeIndex=(a,b)=>edges.get(a<b?`${a}:${b}`:`${b}:${a}`).index, refined=[];
    for (const [a,b,c] of faces) {
      const ab=edgeIndex(a,b),bc=edgeIndex(b,c),ca=edgeIndex(c,a);
      refined.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]);
    }
    vertices=next; faces=refined;
  }
  return {vertices,faces};
}

const LIP_LOOP=[61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
const FACE_OVAL=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

function headBack(vertices, boundary, look, lips) {
  const contour=boundary.map(index=>vertices[index]);
  const center=new THREE.Vector3();
  for (const point of contour) center.add(point);
  center.multiplyScalar(1/contour.length);
  const rings=[
    [1,0], [.92,.22], [.78,.46], [.58,.69], [.36,.87], [.14,.98],
  ];
  const positions=[],colors=[],indices=[],count=contour.length,skin=new THREE.Color(look.skin);
  for (let ring=0;ring<rings.length;ring++) for (const point of contour) {
    const [scale,depth]=rings[ring];
    positions.push(
      center.x+(point.x-center.x)*scale,
      center.y+(point.y-center.y)*scale,
      THREE.MathUtils.lerp(point.z,-.30,depth),
    );
    (ring===0?faceColor(point,look,lips):skin).toArray(colors,colors.length);
  }
  for (let ring=0;ring<rings.length-1;ring++) for (let i=0;i<count;i++) {
    const next=(i+1)%count,a=ring*count+i,b=ring*count+next,c=(ring+1)*count+i,d=(ring+1)*count+next;
    indices.push(a,b,c,b,d,c);
  }
  const centerIndex=positions.length/3;
  positions.push(center.x,center.y,-.31);
  const last=(rings.length-1)*count;
  for (let i=0;i<count;i++) indices.push(last+i,last+(i+1)%count,centerIndex);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
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

function clippedMesh(vertices, faces, normals, boundary, upper, look, lips, pivotY = 0, pivotZ = 0) {
  const points=[],vertexNormals=[],indices=[],lookup=new Map();
  const keyOf=point=>point.toArray().map(value=>value.toFixed(6)).join(',');
  const append=(point,normal)=>{
    const key=keyOf(point);
    if (lookup.has(key)) return lookup.get(key);
    const index=points.length; lookup.set(key,index); points.push(point); vertexNormals.push(normal); return index;
  };
  for (const face of faces) {
    const polygon=face.map(index=>({point:vertices[index],normal:normals[index]}));
    const distance=value=>value.point.y-boundary(value.point.x);
    const inside=value=>upper?distance(value)>=0:distance(value)<=0;
    const clipped=[];
    for (let i=0;i<polygon.length;i++) {
      const current=polygon[i],next=polygon[(i+1)%polygon.length],a=inside(current),b=inside(next);
      if (a) clipped.push(current);
      if (a!==b) {
        const from=distance(current),to=distance(next),t=from/(from-to);
        clipped.push({point:current.point.clone().lerp(next.point,t),normal:current.normal.clone().lerp(next.normal,t).normalize()});
      }
    }
    if (clipped.length<3) continue;
    const base=append(clipped[0].point,clipped[0].normal);
    for (let i=1;i<clipped.length-1;i++) indices.push(base,
      append(clipped[i].point,clipped[i].normal),append(clipped[i+1].point,clipped[i+1].normal));
  }
  const geometry=new THREE.BufferGeometry();
  const positions=new Float32Array(points.length*3),colors=new Float32Array(points.length*3),normalArray=new Float32Array(points.length*3);
  for (let i=0;i<points.length;i++) {
    const point=points[i].clone(); point.y-=pivotY; point.z-=pivotZ;
    point.toArray(positions,i*3);
    faceColor(points[i],look,lips).toArray(colors,i*3);
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
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2,z=Math.max(...ring.map(point=>point.z),depthAt(cx,cy))+.018;
    addOval(model,'#eee6db',[cx,cy,z],[(maxX-minX)*.64,(maxY-minY)*.70,.016],24);
    const iris=points[side===0?468:473];
    addOval(model,look.eyes,[iris.x,iris.y,z+.014],[.023,.023,.009],24);
    addOval(model,'#29343a',[iris.x,iris.y,z+.022],[.011,.014,.005],20);
    addOval(model,'#fff3e4',[iris.x-.004,iris.y+.005,z+.028],[.004,.004,.002],12);
    const upper=contours[side].slice(0,5).map(index=>points[index].clone().add(new THREE.Vector3(0,0,.014)));
    addTube(model,'#986f67',upper,.0035,20);
  }
  for (const contour of [[70,63,105,66,107],[336,296,334,293,300]]) {
    addTube(model,look.brow,contour.map(index=>points[index].clone().add(new THREE.Vector3(0,0,.009))),.006,24);
  }
  if (look.glasses) landmarkGlasses(model,look,points,contours,depthAt);
}

function addLandmarkNoseAndMouth(model,look,points,depthAt) {
  const tip=points[1],tipZ=depthAt(tip.x,tip.y)+.006;
  // The fitted face surface already carries the nose bridge and tip. Small
  // nostril shadows finish the shape without adding a second nose volume.
  for(const side of [-1,1]) addOval(model,'#80564e',
    [tip.x+side*.025,tip.y-.020,tipZ],[.006,.003,.003],12);
  const mouthY=(points[13].y+points[14].y)/2,mouthZ=depthAt(0,mouthY)+.010;
  const grin=look.style==='short-swept'?.020:look.style==='long-wavy'?.010:0;
  const mouthWidth=Math.max(.06,Math.abs(points[61].x-points[291].x)*(look.style==='short-swept'?.54:.46));
  addOval(model,'#492b2c',[0,mouthY-.002,mouthZ],[mouthWidth,.010,.004],24);
  if(grin) addOval(model,'#eee4d5',[0,mouthY-.004,mouthZ+.003],[mouthWidth*.72,.006,.003],24);
  addTube(model,look.lips,[[-mouthWidth,mouthY+grin,mouthZ+.003],[-mouthWidth*.55,mouthY+grin*.25,mouthZ+.005],
    [0,mouthY-grin*.22,mouthZ+.006],[mouthWidth*.55,mouthY+grin*.25,mouthZ+.005],[mouthWidth,mouthY+grin,mouthZ+.003]],.0045,24);
}

function neutralizeMouth(points) {
  const upper=[61,185,40,39,37,0,267,269,270,409,291];
  const lower=[14,375,321,405,314,17,84,181,91,146];
  const left=points[61],right=points[291],cornerY=(left.y+right.y)/2,halfWidth=Math.max(Math.abs(left.x),Math.abs(right.x));
  for (const index of lower) {
    const point=points[index],ratio=THREE.MathUtils.clamp(Math.abs(point.x)/halfWidth,0,1);
    point.y=cornerY-.006*(1-ratio);
    const nearest=upper.map(candidate=>points[candidate]).sort((a,b)=>Math.abs(a.x-point.x)-Math.abs(b.x-point.x))[0];
    point.z=THREE.MathUtils.lerp(point.z,nearest.z,.78);
  }
  const innerY=cornerY+.002;
  for (const index of [13,78,191,80,81,82,312,311,310,415,308]) points[index].y=innerY;
  points[14].y=cornerY-.004;
}

function fitProfileDepth(points, look) {
  const [forehead,nose,mouth,chin]=look.profileDepth;
  for (const point of points) {
    const bump=(x,y,sx,sy)=>Math.exp(-((point.x/sx)**2+((point.y-y)/sy)**2));
    point.z+=forehead*bump(0,.24,.19,.12)+nose*bump(0,-.10,.105,.12)
      +mouth*bump(0,-.25,.16,.075)+chin*bump(0,-.405,.13,.075);
  }
}

function makeLandmarkDepthSampler(points) {
  const columns=72,rows=88,xMin=-.40,xMax=.40,yMin=-.50,yMax=.43,values=new Float32Array(columns*rows);
  const source=points.slice(0,468);
  for(let row=0;row<rows;row++) for(let column=0;column<columns;column++) {
    const x=THREE.MathUtils.lerp(xMin,xMax,column/(columns-1));
    const y=THREE.MathUtils.lerp(yMin,yMax,row/(rows-1));
    let sum=0,weight=0;
    for(const point of source) {
      const distance=(point.x-x)**2+(point.y-y)**2,w=Math.exp(-distance/.0038);
      sum+=point.z*w; weight+=w;
    }
    values[row*columns+column]=sum/weight;
  }
  return (x,y)=>{
    const gx=THREE.MathUtils.clamp((x-xMin)/(xMax-xMin)*(columns-1),0,columns-1);
    const gy=THREE.MathUtils.clamp((y-yMin)/(yMax-yMin)*(rows-1),0,rows-1);
    const x0=Math.floor(gx),x1=Math.min(columns-1,x0+1),y0=Math.floor(gy),y1=Math.min(rows-1,y0+1);
    const tx=gx-x0,ty=gy-y0;
    const a=THREE.MathUtils.lerp(values[y0*columns+x0],values[y0*columns+x1],tx);
    const b=THREE.MathUtils.lerp(values[y1*columns+x0],values[y1*columns+x1],tx);
    return THREE.MathUtils.lerp(a,b,ty);
  };
}

function landmarkGlasses(model,look,points,contours,depthAt) {
  const zAt=(x,y)=>depthAt(x,y)+.015;
  const round=look.glasses==='round';
  for (let side=0;side<2;side++) {
    const ring=contours[side].map(index=>points[index]);
    const minX=Math.min(...ring.map(point=>point.x)),maxX=Math.max(...ring.map(point=>point.x));
    const minY=Math.min(...ring.map(point=>point.y)),maxY=Math.max(...ring.map(point=>point.y));
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2,rx=(maxX-minX)/2+.025,ry=(maxY-minY)/2+.014,pointsOnFrame=[];
    for (let i=0;i<=32;i++) {
      const a=i/32*TAU,c=Math.cos(a),s=Math.sin(a),power=round?1:.58;
      const x=cx+rx*Math.sign(c)*Math.abs(c)**power,y=cy+ry*Math.sign(s)*Math.abs(s)**power;
      pointsOnFrame.push([x,y,zAt(x,y)]);
    }
    addTube(model,'#272b2d',pointsOnFrame,.0075,36);
    const outer=side===0?minX:maxX,temple=side===0?-.34:.34;
    addTube(model,'#272b2d',[[outer,cy,zAt(outer,cy)],[temple,cy-.006,zAt(temple,cy)-.025],[temple,cy-.09,-.11]],.006,20);
  }
  const cy=(points[33].y+points[263].y)/2,bridgeY=cy-.005;
  addTube(model,'#272b2d',[[ -.055,bridgeY,zAt(-.055,bridgeY)],[0,bridgeY+.01,zAt(0,bridgeY+.01)+.003],[.055,bridgeY,zAt(.055,bridgeY)]],.007,16);
}

function scalp(model, look, points, depthAt) {
  const profile=fitHeadProfile(look.head,points),high=profile.at(-1)[0];
  const widest=profile.reduce((wide,row)=>row[1]>wide[1]?row:wide,profile[0]);
  const [,rx]=widest,[, ,rz,cz]=profileAt(profile,.08),crownRadius=.44,crownCenterY=.015;
  const phiCount=64,rowCount=28,vertices=[],faces=[];
  for(let row=0;row<=rowCount;row++) for(let phi=0;phi<=phiCount;phi++) {
    const angle=phi/phiCount*TAU,side=Math.abs(Math.sin(angle)),rear=(1-Math.cos(angle))*.5;
    const hairline=look.hairline+(look.style==='long-wavy'?.02*side:0);
    const frontTheta=Math.acos(THREE.MathUtils.clamp((hairline-crownCenterY)/crownRadius,-.95,.95));
    const sideDrop=look.style.startsWith('long')?.10:look.style==='receding-short'?.38:.23;
    const sideTheta=frontTheta+sideDrop,sideOrFront=THREE.MathUtils.lerp(frontTheta,sideTheta,side);
    const rearTheta=look.style.startsWith('long')?2.60:2.72;
    const thetaEnd=THREE.MathUtils.lerp(sideOrFront,rearTheta,rear),theta=.015+(thetaEnd-.015)*row/rowCount;
    const x=Math.sin(angle)*Math.sin(theta)*rx*1.045,y=crownCenterY+Math.cos(theta)*crownRadius;
    const baseZ=cz+Math.cos(angle)*Math.sin(theta)*rz*1.045+.025*Math.max(0,Math.cos(angle))**2;
    const rearLift=Math.max(0,-Math.cos(angle))*.035;
    const z=Math.cos(angle)>0?Math.max(baseZ,depthAt(x,y)+.009):baseZ-rearLift;
    vertices.push(x,y,z);
  }
  const stride = phiCount + 1;
  for (let row = 0; row < rowCount; row++) for (let phi = 0; phi < phiCount; phi++) {
    const a = row * stride + phi, b = a + 1, c = a + stride + 1, d = a + stride;
    faces.push(a, d, c, a, c, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  model.geometry(look.hair, geometry);
  addHairStyle(model, look, {profile,depthAt,crownCenterY,crownRadius,rx,rz,cz});
}

function addLongLock(model,look,side,wavy=false) {
  const points=wavy
    ? [[side*.18,.29,.08],[side*.25,.13,.035],[side*.30,-.08,-.015],
      [side*.29,-.27,-.055],[side*.25,-.48,-.105],[side*.22,-.63,-.13]]
    : [[side*.18,.29,.08],[side*.25,.12,.035],[side*.29,-.10,-.020],
      [side*.28,-.34,-.075],[side*.24,-.61,-.13]];
  addTaperedTube(model,look.hair,points,wavy?[.032,.074,.070,.064,.042,.006]:[.032,.068,.066,.054,.006]);
  if (wavy) addTaperedTube(model,look.hairLight,points.map(([x,y,z])=>[x-side*.018,y,z+.022]),
    [.004,.005,.005,.004,.003,.001],36,8);
}

function backCapPoint(cap,x,y) {
  const sinTheta=Math.sqrt(Math.max(.015,1-((y-cap.crownCenterY)/cap.crownRadius)**2));
  const ringWidth=cap.rx*sinTheta*1.045;
  const sinPhi=THREE.MathUtils.clamp(x/ringWidth,-.98,.98),cosPhi=-Math.sqrt(Math.max(.01,1-sinPhi*sinPhi));
  return [x,y,cap.cz+cosPhi*sinTheta*cap.rz*1.045-.032];
}

function addRearHairStrands(model,look,cap,longHair=false) {
  const offsets=longHair?[-.14,-.07,0,.07,.14]:[-.14,0,.14];
  const strand=new THREE.Color(look.hair).lerp(new THREE.Color(look.hairLight),.18);
  for(const offset of offsets) {
    const ys=longHair?[.24,.12,-.04,-.18,-.30,-.36]:[.24,.10,-.04,-.18,-.32,-.40];
    const points=ys.map((y,index)=>{
      const t=index/(ys.length-1),curve=Math.sin(t*Math.PI)*(offset<0?.012:-.012);
      return backCapPoint(cap,offset+curve,y);
    });
    addTube(model,strand,points,.004,32);
  }
}

function addHairStyle(model, look, cap) {
  const line = look.hairLight, shadow = look.hair;
  const capPointAt=(x,y,lift=.008)=>capPoint(look,x,y,lift,cap.profile,cap.depthAt,cap.crownCenterY,cap.crownRadius);
  if (look.style === 'long-straight' || look.style === 'long-wavy') {
    addRearHairStrands(model,look,cap,true);
    for (const side of [-1,1]) addLongLock(model,look,side,look.style==='long-wavy');
    const partX=look.style==='long-straight'?0:-.065;
    const part=[[partX,.30],[partX*.6,.355],[0,.395]].map(([x,y])=>capPointAt(x,y,.004));
    addTube(model,shadow,part,.0025,24);
    for(const side of [-1,1]) {
      const strand=[[partX+side*.012,.32],[side*.085,.37],[side*.17,.34]].map(([x,y])=>capPointAt(x,y,.006));
      addTube(model,line,strand,.0025,24);
    }
    return;
  }
  if (look.style === 'comb-over') {
    // The high, swept forelock gives Trump his distinctive crown silhouette.
    const forelock=[[.22,.22],[.19,.30],[.10,.37],[-.025,.405],[-.15,.385],[-.22,.31]]
      .map(([x,y])=>capPointAt(x,y,.012));
    addTaperedTube(model,shadow,forelock,[.012,.045,.060,.055,.040,.008],40,12);
    addTube(model,line,forelock.map(([x,y,z])=>[x-.012,y+.008,z+.009]),.003,32);
    addRearHairStrands(model,look,cap,false);
    return;
  }
  if (look.style === 'short-side-part') {
    const sweep=[[.20,.20],[.17,.28],[.09,.35],[-.02,.39],[-.14,.36],[-.20,.29]]
      .map(([x,y])=>capPointAt(x,y,.008));
    addTube(model,line,sweep,.003,40);
  } else if (look.style === 'short-swept') {
    const sweep=[[-.18,.24],[-.10,.32],[.02,.37],[.13,.34],[.20,.29]]
      .map(([x,y])=>capPointAt(x,y,.006));
    addTube(model,line,sweep,.0028,32);
  }
  addRearHairStrands(model,look,cap,false);
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
  for (let tooth=-2;tooth<=2;tooth++) {
    const x=tooth*widthM*.27;
    if (look.style==='short-swept') addOval(jawBuilder,'#eee0cf',[x,-.002,.046],[.010,.005,.003],12);
  }
  addTube(jawBuilder,lip,[[-widthM*.80,-.014,.047],[-widthM*.42,-.022,.053],
    [0,-.026,.055],[widthM*.42,-.022,.053],[widthM*.80,-.014,.047]],.004,20);
  jaw.add(jawBuilder.finish({vertexColors:true,roughness:.78}));
  return jaw;
}

function addEars(model, look) {
  for (const side of [-1,1]) {
    addOval(model,look.skin,[side*.30,-.005,-.005],[.052,.102,.055],24);
    addOval(model,look.blush,[side*.328,-.008,.039],[.021,.060,.009],20);
    addTube(model,look.skin,[[side*.318,-.058,.046],[side*.33,-.025,.051],[side*.328,.03,.052],[side*.315,.05,.047]],.005,16);
  }
}

export function createCameoHead(kind) {
  const look=CAMEO_HEADS[kind];
  if (!look) throw new Error(`Unknown cameo head: ${kind}`);
  const head=new THREE.Group(); head.name='Sculpted 3D head';
  head.position.y=2.77;
  const geometry=createSceneryModel(`${kind} sculpted face`);
  const points=CAMEO_FACE_DATA[kind].map(([x,y,z])=>new THREE.Vector3(x,y-2.77,z));
  neutralizeMouth(points);
  fitProfileDepth(points,look);
  const depthAt=makeLandmarkDepthSampler(points);
  const mouthY=(points[13].y+points[14].y)/2,mouthZ=depthAt(0,mouthY);
  const jawBoundary=x=>mouthY-.012-.145*THREE.MathUtils.smoothstep(Math.abs(x),.055,.245);
  const fullHead=sculptedHead(look.head,points,look,[],depthAt);
  const position=fullHead.getAttribute('position'),normal=fullHead.getAttribute('normal'),index=fullHead.index;
  const vertices=Array.from({length:position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(position,i));
  const normals=Array.from({length:normal.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(normal,i));
  const faces=Array.from({length:index.count/3},(_,i)=>[index.getX(i*3),index.getX(i*3+1),index.getX(i*3+2)]);
  const upperHead=clippedMesh(vertices,faces,normals,jawBoundary,true,look,[]);
  const chinGeometry=clippedMesh(vertices,faces,normals,jawBoundary,false,look,[],mouthY,mouthZ);
  fullHead.dispose();
  geometry.geometry(null,upperHead);
  landmarkEyes(geometry,look,points,depthAt);
  addLandmarkNoseAndMouth(geometry,look,points,depthAt);
  addOval(geometry,'#3a2021',[0,mouthY-.028,mouthZ-.035],[.055,.024,.008],20);
  scalp(geometry,look,points,depthAt);
  addEars(geometry,look);
  const shell=geometry.finish({vertexColors:true,roughness:.76});
  shell.traverse(part=>{if(part.isMesh){part.castShadow=false;part.receiveShadow=false;}});
  head.add(shell);
  const jawBuilder=createSceneryModel(`${look.name} lower chin`);
  jawBuilder.geometry(null,chinGeometry);
  const jaw=new THREE.Group();
  jaw.name='Moving lower jaw';
  jaw.position.set(0,mouthY,mouthZ);
  const lowerJaw=jawBuilder.finish({vertexColors:true,roughness:.76});
  lowerJaw.traverse(part=>{if(part.isMesh){part.castShadow=false;part.receiveShadow=false;}});
  jaw.add(lowerJaw);
  head.add(jaw);
  head.userData.jaw=jaw;
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
  head.userData.jaw.rotation.x=running ? .14+bounce*.08 : 0;
}
