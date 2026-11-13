import * as THREE from 'three';
import { CAMEO_FACE_DATA, CAMEO_FACE_TRIANGLES } from './cameo-face-data.js';

const TAU = Math.PI * 2;
const PROFILES = {
  purra: [[-.50,.018,.035,0],[-.45,.105,.12,0],[-.32,.175,.16,0],[-.12,.232,.19,0],[.09,.246,.20,0],[.29,.206,.17,0],[.43,.105,.095,0],[.48,.018,.018,0]],
  orpo:  [[-.50,.025,.04,0],[-.45,.16,.13,0],[-.32,.245,.175,0],[-.12,.287,.21,0],[.10,.288,.22,0],[.29,.26,.19,0],[.43,.15,.12,0],[.48,.02,.02,0]],
  marin: [[-.50,.012,.03,0],[-.45,.09,.11,0],[-.31,.16,.15,0],[-.11,.215,.18,0],[.10,.232,.19,0],[.30,.19,.16,0],[.43,.10,.09,0],[.48,.015,.015,0]],
  stubb: [[-.50,.025,.04,0],[-.45,.16,.14,0],[-.32,.245,.18,0],[-.12,.285,.21,0],[.10,.28,.22,0],[.29,.24,.19,0],[.43,.13,.11,0],[.48,.02,.02,0]],
  putin: [[-.50,.018,.035,0],[-.45,.13,.12,0],[-.32,.205,.16,0],[-.12,.255,.195,0],[.10,.266,.21,0],[.30,.22,.175,0],[.43,.115,.10,0],[.48,.018,.018,0]],
  trump: [[-.50,.035,.04,0],[-.45,.18,.14,0],[-.32,.26,.18,0],[-.12,.298,.215,0],[.10,.305,.225,0],[.30,.27,.19,0],[.43,.15,.12,0],[.48,.02,.02,0]],
};

export const CAMEO_CARICATURES = {
  purra: {
    name: 'Purra', skin: '#e8bca7', blush: '#d49a8b', lips: '#a65d66', eyes: '#647f8e',
    hair: '#aa8d5c', hairLight: '#e5cf9c', brow: '#695642',
    eyeSpacing: .102, eyeWidth: .061, eyeHeight: .022, eyeY: .105, eyeOpen: .82,
    noseWidth: .043, noseLength: .145, noseProjection: .055, mouthWidth: .105, mouthY: -.235, smile: .010,
    cheek: .035, browLift: -.008, browSize: .008, jaw: .17, ear: .022,
    hairStyle: 'bob', hairline: .36, sideEnd: -.36, rearEnd: -.52, hairWidth: 1.30, hairScale: [1.08,1.02,1.04],
    faceScale: [1.02,1.04,1.02], glasses: null,
  },
  orpo: {
    name: 'Orpo', skin: '#dfb59d', blush: '#ce9585', lips: '#965b5d', eyes: '#6f8088',
    hair: '#77736d', hairLight: '#b4aea3', brow: '#484038',
    eyeSpacing: .105, eyeWidth: .059, eyeHeight: .018, eyeY: .108, eyeOpen: .69,
    noseWidth: .052, noseLength: .155, noseProjection: .059, mouthWidth: .115, mouthY: -.224, smile: -.005,
    cheek: .029, browLift: -.018, browSize: .010, jaw: .23, ear: .026,
    hairStyle: 'receding-part', hairline: .40, sideEnd: -.14, rearEnd: -.52, hairWidth: 1.22, hairScale: [1.02,.96,1.0],
    faceScale: [1.06,1.04,1.02], glasses: 'rect',
  },
  marin: {
    name: 'Marin', skin: '#f0c9b4', blush: '#e2a295', lips: '#9b535d', eyes: '#657d8a',
    hair: '#49342d', hairLight: '#916d55', brow: '#47342c',
    eyeSpacing: .089, eyeWidth: .061, eyeHeight: .024, eyeY: .112, eyeOpen: .92,
    noseWidth: .039, noseLength: .132, noseProjection: .050, mouthWidth: .125, mouthY: -.224, smile: .015,
    cheek: .030, browLift: .004, browSize: .008, jaw: .145, ear: .018,
    hairStyle: 'wavy-long', hairline: .32, sideEnd: -.67, rearEnd: -.52, hairWidth: 1.30, hairScale: [1.08,1.03,1.06],
    faceScale: [.96,1.07,1.02], glasses: null,
  },
  stubb: {
    name: 'Stubb', skin: '#e6b79c', blush: '#d69a89', lips: '#a7776c', eyes: '#617d91',
    hair: '#736e65', hairLight: '#c1b79f', brow: '#574a3d',
    eyeSpacing: .095, eyeWidth: .060, eyeHeight: .021, eyeY: .108, eyeOpen: .80,
    noseWidth: .052, noseLength: .145, noseProjection: .060, mouthWidth: .225, mouthY: -.207, smile: .075,
    cheek: .040, browLift: -.006, browSize: .0085, jaw: .20, ear: .023,
    hairStyle: 'swept-short', hairline: .34, sideEnd: -.14, rearEnd: -.52, hairWidth: 1.22, hairScale: [1.02,.98,1.0],
    faceScale: [1.10,1.05,1.02], glasses: 'roundrect',
  },
  putin: {
    name: 'Putin', skin: '#e2b8a5', blush: '#cf9384', lips: '#975e5e', eyes: '#77878d',
    hair: '#88867e', hairLight: '#c8c4b9', brow: '#5d564e',
    eyeSpacing: .091, eyeWidth: .059, eyeHeight: .015, eyeY: .112, eyeOpen: .56,
    noseWidth: .047, noseLength: .158, noseProjection: .061, mouthWidth: .108, mouthY: -.236, smile: -.008,
    cheek: .026, browLift: -.020, browSize: .011, jaw: .185, ear: .022,
    hairStyle: 'receding-short', hairline: .385, sideEnd: -.18, rearEnd: -.52, hairWidth: 1.25, hairScale: [1,.99,1],
    faceScale: [1.04,1.05,1.02], glasses: null,
  },
  trump: {
    name: 'Trump', skin: '#dca477', blush: '#c97d64', lips: '#8c504a', eyes: '#62788a',
    hair: '#9d783c', hairLight: '#e2bb63', brow: '#9a784d',
    eyeSpacing: .108, eyeWidth: .062, eyeHeight: .017, eyeY: .109, eyeOpen: .60,
    noseWidth: .062, noseLength: .17, noseProjection: .068, mouthWidth: .13, mouthY: -.224, smile: -.003,
    cheek: .048, browLift: -.018, browSize: .012, jaw: .245, ear: .026,
    hairStyle: 'comb-over', hairline: .34, sideEnd: -.14, rearEnd: -.52, hairWidth: 1.24, hairScale: [1.06,1.02,1.04],
    faceScale: [1.14,1.04,1.04], glasses: null,
  },
};

function profileAt(profile, y) {
  if(y<=profile[0][0]) return profile[0];
  if(y>=profile.at(-1)[0]) return profile.at(-1);
  const index = profile.findIndex(row => row[0] >= y);
  if (index <= 0) return profile[index <= 0 ? 0 : profile.length - 1];
  const a = profile[index - 1], b = profile[index], t = THREE.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
  const prev = profile[Math.max(0, index - 2)], next = profile[Math.min(profile.length - 1, index + 1)];
  return a.map((value, axis) => {
    const span = b[0] - a[0], m0 = (b[axis] - prev[axis]) / (b[0] - prev[0]), m1 = (next[axis] - a[axis]) / (next[0] - a[0]);
    return (2*t**3-3*t**2+1)*value + (t**3-2*t**2+t)*span*m0 + (-2*t**3+3*t**2)*b[axis] + (t**3-t**2)*span*m1;
  });
}

function bump(x, y, cx, cy, sx, sy) {
  return Math.exp(-(((x-cx)/sx)**2 + ((y-cy)/sy)**2));
}

function faceRelief(x, y, look) {
  const cheek = look.cheek * (bump(x,y,-.145,-.035,.110,.115) + bump(x,y,.145,-.035,.110,.115));
  const brow = .030 * (bump(x,y,-look.eyeSpacing,.148,.076,.050) + bump(x,y,look.eyeSpacing,.148,.076,.050));
  const sockets = -.014 * (bump(x,y,-look.eyeSpacing,.105,.066,.042) + bump(x,y,look.eyeSpacing,.105,.066,.042));
  const nose = look.noseProjection * bump(x,y,0,-.005,look.noseWidth*.72,.15);
  const tip = look.noseProjection*.48 * bump(x,y,0,-.095,look.noseWidth,.052);
  const alae = .018 * (bump(x,y,-look.noseWidth*.7,-.115,.023,.027) + bump(x,y,look.noseWidth*.7,-.115,.023,.027));
  const muzzle = .012 * bump(x,y,0,look.mouthY+.015,.10,.050);
  const chin = .026 * bump(x,y,0,-.40,look.jaw*.76,.065);
  return cheek + brow + sockets + nose + tip + alae + muzzle + chin;
}

function landmarkDepthAt(landmarks,x,y) {
  const nearest=[];
  for(const point of landmarks) {
    const distance=(point.x-x)**2+(point.y-y)**2;
    let index=nearest.findIndex(sample=>sample.distance>distance);
    if(index<0) index=nearest.length;
    nearest.splice(index,0,{point,distance});
    if(nearest.length>8) nearest.pop();
  }
  let depth=0,total=0;
  for(const sample of nearest) {
    const weight=1/(sample.distance+.00008);
    depth+=sample.point.z*weight;total+=weight;
  }
  return depth/total;
}

function meshFromGeometry(parent, geometry, material, name, castShadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name; mesh.castShadow = castShadow; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

function ellipsoid(parent, material, position, scale, name, segments = 32) {
  const geometry = new THREE.SphereGeometry(1, segments, Math.max(16, segments >> 1));
  geometry.scale(...scale).translate(...position);
  return meshFromGeometry(parent, geometry, material, name);
}

function tube(parent, material, points, radius, name, segments = 32) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  return meshFromGeometry(parent, new THREE.TubeGeometry(curve, segments, radius, 8, false), material, name);
}

function taperedLock(parent, material, points, radii, name) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const segments = 36, sides = 10, frames = curve.computeFrenetFrames(segments, false), positions = [], indices = [];
  for (let row=0; row<=segments; row++) {
    const t=row/segments, at=t*(radii.length-1), part=Math.min(radii.length-2,Math.floor(at));
    const radius=THREE.MathUtils.lerp(radii[part],radii[part+1],at-part),center=curve.getPointAt(t);
    for(let side=0;side<=sides;side++) {
      const a=side/sides*TAU,offset=frames.normals[row].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[row],Math.sin(a));
      positions.push(center.x+offset.x*radius,center.y+offset.y*radius,center.z+offset.z*radius);
    }
  }
  for(let row=0;row<segments;row++) for(let side=0;side<sides;side++) {
    const a=row*(sides+1)+side,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  return meshFromGeometry(parent,geometry,material,name);
}

function makeHeadSurface(look, profile) {
  const rows=72, columns=96, positions=[], indices=[];
  for(let row=0;row<=rows;row++) {
    const y=THREE.MathUtils.lerp(profile[0][0],profile.at(-1)[0],row/rows),[,rx,rz,center]=profileAt(profile,y);
    for(let column=0;column<=columns;column++) {
      const angle=column/columns*TAU,sin=Math.sin(angle),facing=Math.max(0,Math.cos(angle)),x=rx*sin;
      positions.push(x,y,center+rz*Math.cos(angle)+THREE.MathUtils.smoothstep(facing,.05,.75)*faceRelief(x,y,look));
    }
  }
  const stride=columns+1;
  for(let row=0;row<rows;row++) for(let column=0;column<columns;column++) {
    const a=row*stride+column,b=a+1,c=a+stride,d=c+1;indices.push(a,b,c,b,d,c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function makeRearHairSurface(profile) {
  const rows=72,columns=48,positions=[],indices=[];
  for(let row=0;row<=rows;row++) {
    const y=THREE.MathUtils.lerp(profile[0][0],profile.at(-1)[0],row/rows),[,rx,rz,center]=profileAt(profile,y);
    for(let column=0;column<=columns;column++) {
      const phi=Math.PI*.5+column/columns*Math.PI;
      const rearOffset=.018*THREE.MathUtils.smoothstep(-Math.cos(phi),0,.8);
      positions.push(rx*Math.sin(phi)*1.035,y,center+Math.cos(phi)*rz*.82-.045-rearOffset);
    }
  }
  const stride=columns+1;
  for(let row=0;row<rows;row++) for(let column=0;column<columns;column++) {
    const a=row*stride+column,b=a+1,c=a+stride,d=c+1;indices.push(a,b,c,b,d,c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

function makeLandmarkHead(kind) {
  const landmarks=CAMEO_FACE_DATA[kind].slice(0,468).map(([x,y,z])=>new THREE.Vector3(x,y-2.77,z));
  const positions=landmarks.flatMap(point=>point.toArray()),indices=[];
  for(const [a,b,c] of CAMEO_FACE_TRIANGLES) {
    const ab=landmarks[b].clone().sub(landmarks[a]),ac=landmarks[c].clone().sub(landmarks[a]);
    if(ab.x*ac.y-ab.y*ac.x<0) indices.push(a,c,b); else indices.push(a,b,c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return {geometry,landmarks};
}

function fitProfileToLandmarks(profile) {
  return profile.map(([y,rx,rz,center])=>[y<0?y*.94:y*.80,rx,rz,center]);
}

function eyeFeature(head, look, profile, side, materials, landmarks) {
  const ids=side<0?[33,133]:[263,362],a=landmarks[ids[0]],b=landmarks[ids[1]];
  const x=a.x*.58+b.x*.42,y=(a.y+b.y)*.5,z=landmarkDepthAt(landmarks,x,y)+.006,w=look.eyeWidth,h=look.eyeHeight*look.eyeOpen;
  ellipsoid(head,materials.eyeWhite,[x,y,z],[w,h,.0045],`${look.name} eye white`);
  ellipsoid(head,materials.iris,[x+side*.005,y,z+.004],[w*.40,h*.73,.0025],`${look.name} iris`,24);
  ellipsoid(head,materials.pupil,[x+side*.005,y,z+.006],[w*.20,h*.51,.0018],`${look.name} pupil`,20);
  ellipsoid(head,materials.glint,[x-w*.07,y+h*.22,z+.008],[.004,.004,.0012],`${look.name} eye glint`,16);
  const lidZ=z+.002;
  tube(head,materials.skinShade,[[x-w,y,lidZ],[x-w*.55,y+h*.88,lidZ],[x,y+h,lidZ],[x+w*.55,y+h*.82,lidZ],[x+w,y,lidZ]],.0035,`${look.name} upper eyelid`,24);
  tube(head,materials.skinShade,[[x-w,y,lidZ],[x-w*.45,y-h*.66,lidZ],[x,y-h*.74,lidZ],[x+w*.5,y-h*.60,lidZ],[x+w,y,lidZ]],.0022,`${look.name} lower eyelid`,24);
  const browY=y+.052+look.browLift,browColor=materials.brow;
  taperedLock(head,browColor,[[x-w*1.08,browY-.004,landmarkDepthAt(landmarks,x-w,browY)+.012],
    [x-w*.55,browY+.012,landmarkDepthAt(landmarks,x-w*.55,browY+.012)+.015],
    [x,browY+.016,landmarkDepthAt(landmarks,x,browY+.016)+.017],
    [x+w*.65,browY+.006,landmarkDepthAt(landmarks,x+w*.65,browY+.006)+.015],
    [x+w*1.05,browY-.008,landmarkDepthAt(landmarks,x+w,browY)+.012],
  ],[.001,.009*look.browSize/.009,.012*look.browSize/.009,.009*look.browSize/.009,.001],`${look.name} eyebrow`);
}

function addGlasses(head,look,profile,material,landmarks) {
  if(!look.glasses) return;
  const roundRect=look.glasses==='roundrect',y=(landmarks[33].y+landmarks[133].y+landmarks[263].y+landmarks[362].y)*.25,rx=look.eyeWidth*1.56,ry=look.eyeHeight*1.92;
  for(const side of [-1,1]) {
    const cx=side*look.eyeSpacing,points=[];
    for(let i=0;i<=40;i++) {
      const a=i/40*TAU,c=Math.cos(a),s=Math.sin(a),power=roundRect?.72:.32;
      const x=cx+rx*Math.sign(c)*Math.abs(c)**power,py=y+ry*Math.sign(s)*Math.abs(s)**power;
      points.push([x,py,landmarkDepthAt(landmarks,x,py)+.014]);
    }
    tube(head,material,points,.0045,`${look.name} glasses rim`,48);
  }
  const bridgeY=y+.005;
  tube(head,material,[[landmarks[33].x*.58+landmarks[133].x*.42+rx*.90,y,landmarkDepthAt(landmarks,-look.eyeSpacing+rx,y)+.014],
    [0,bridgeY,landmarkDepthAt(landmarks,0,bridgeY)+.017],
    [landmarks[263].x*.58+landmarks[362].x*.42-rx*.90,y,landmarkDepthAt(landmarks,look.eyeSpacing-rx,y)+.014]],.004,`${look.name} glasses bridge`,20);
  for(const side of [-1,1]) {
    const startX=side*(look.eyeSpacing+rx),startZ=landmarkDepthAt(landmarks,startX,y)+.012;
    tube(head,material,[[startX,y,startZ],[side*.27,y-.012,-.018],[side*.31,y-.025,-.055]],.003,`${look.name} glasses arm`,20);
  }
}

function addEars(head,look,profile,materials) {
  const width=profileAt(profile,-.015)[1];
  for(const side of [-1,1]) {
    const x=side*(width+.028),z=-.008;
    ellipsoid(head,materials.skin,[x,-.005,z],[look.ear*.92,.048,.018],`${look.name} ear`);
    ellipsoid(head,materials.blush,[x+side*.012,-.008,z+.014],[look.ear*.30,.024,.003],`${look.name} inner ear`,20);
  }
}

function addMouth(head,look,profile,materials,landmarks) {
  const y=(landmarks[13].y+landmarks[14].y)*.5,z=(landmarks[13].z+landmarks[14].z)*.5+.026,w=look.mouthWidth*.5;
  const mouthGroup=new THREE.Group(); mouthGroup.name=`${look.name} open mouth`; mouthGroup.visible=false; head.add(mouthGroup);
  ellipsoid(mouthGroup,materials.mouth,[0,y,z],[w*.94,.048,.010],`${look.name} mouth cavity`);
  for(let tooth=0;tooth<6;tooth++) {
    const x=THREE.MathUtils.lerp(-w*.68,w*.68,tooth/5);
    ellipsoid(mouthGroup,materials.teeth,[x,y+.016,z+.012],[w*.18,.013,.006],`${look.name} tooth`,16);
  }
  const jaw=new THREE.Group(); jaw.name=`${look.name} moving lower jaw`;
  jaw.position.set(0,y-.027,z-.005); mouthGroup.add(jaw);
  const jawSkin=ellipsoid(jaw,materials.skin,[0,-.042,0],[Math.max(.13,look.jaw*.72),.097,.054],`${look.name} lower chin`);
  jawSkin.rotation.x=.08;
  const lipWidth=look.mouthWidth*.45;
  tube(jaw,materials.lips,[[-lipWidth,-.005,.035],[-lipWidth*.5,-.012,.043],[0,-.018,.046],
    [lipWidth*.5,-.012,.043],[lipWidth,-.005,.035]],.0045,`${look.name} open lower lip`,28);
  return mouthGroup;
}

function hairCapEdge(phi,look) {
  const side=Math.abs(Math.sin(phi)),rear=(1-Math.cos(phi))*.5;
  const front=look.hairline*.80,sideEnd=look.sideEnd*.94,rearEnd=look.rearEnd*.94;
  const sideLine=THREE.MathUtils.lerp(front,sideEnd,side**2.2);
  return THREE.MathUtils.lerp(sideLine,rearEnd,rear**1.3);
}

function hairPoint(phi,y,look,profile,lift=.01) {
  const sampleY=THREE.MathUtils.clamp(y,profile[0][0],profile.at(-1)[0]),[,rx,rz,cz]=profileAt(profile,sampleY);
  const front=Math.cos(phi),frontWeight=THREE.MathUtils.smoothstep(front,.08,.82);
  const hairRadius=rx*THREE.MathUtils.lerp(1.0,look.hairWidth||1.0,frontWeight);
  const x=Math.sin(phi)*hairRadius;
  const faceZ=look.landmarks?landmarkDepthAt(look.landmarks,x,sampleY):cz+rz;
  const rear=THREE.MathUtils.smoothstep(-front,0,.9);
  const profileZ=cz+front*rz*.84-.055-THREE.MathUtils.lerp(.008,.028,rear);
  const faceWeight=THREE.MathUtils.smoothstep(front,.10,.78);
  const z=THREE.MathUtils.lerp(profileZ,faceZ+.020,faceWeight);
  return [x,y,z+lift];
}

function addHairCap(head,look,profile,materials) {
  const rows=72,columns=96,positions=[],colors=[],indices=[];
  const topY=profile.at(-1)[0]-.004;
  const hairColor=new THREE.Color(look.hair),lightColor=new THREE.Color(look.hairLight),shade=hairColor.clone().multiplyScalar(.72);
  for(let row=0;row<=rows;row++) for(let column=0;column<=columns;column++) {
    const phi=(column/columns-.5)*Math.PI,edge=THREE.MathUtils.clamp(hairCapEdge(phi,look),profile[0][0]+.006,topY-.006),y=THREE.MathUtils.lerp(topY,edge,row/rows);
    const [x,,z]=hairPoint(phi,y,look,profile,.008);
    positions.push(x,y,z);
    const front=Math.max(0,Math.cos(phi));
    const color=hairColor.clone().lerp(lightColor,THREE.MathUtils.clamp(.025+front*.045,.015,.11));
    if(look.hairStyle==='receding-short') {
      const thinning=(1-THREE.MathUtils.smoothstep(row/rows,.12,.42))*THREE.MathUtils.smoothstep(front,.08,.78);
      color.lerp(new THREE.Color(look.skin),thinning*(look.name==='Putin'?.58:.22));
    }
    color.lerp(shade,.025);color.toArray(colors,colors.length);
  }
  const stride=columns+1;
  for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    const a=row*stride+col,b=a+1,c=a+stride,d=c+1;indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  meshFromGeometry(head,geometry,materials.hairCap,`${look.name} sculpted hair cap`);
  const partColor=materials.hairPart;
  if(look.hairStyle==='bob'||look.hairStyle==='wavy-long') {
    const partX=look.hairStyle==='bob'?0:-.035;
    const path=[],topY=profile.at(-1)[0]-.012;
    for(let i=0;i<=8;i++) {
      const t=i/8,y=THREE.MathUtils.lerp(topY,look.hairline*.80+.02,t);
      const [,width]=profileAt(profile,y),phi=Math.asin(THREE.MathUtils.clamp(partX/width,-.5,.5));
      path.push(hairPoint(phi,y,look,profile,.012));
    }
    tube(head,partColor,path,.0028,`${look.name} hair part`,32);
  }
}

function addLongHair(head,look,profile,materials) {
  if(!['bob','wavy-long'].includes(look.hairStyle)) return;
  const bob=look.hairStyle==='bob',bottom=bob?-.43:-.67,top=profile.at(-1)[0]-.014;
  for(const side of [-1,1]) {
    const offsets=bob?[-.018,.025]:[-.035,0,.035];
    for(let strand=0;strand<offsets.length;strand++) {
      const offset=offsets[strand],x=side*(.205+offset),midX=side*(.245+offset),endX=side*(.225+offset);
      const wave=bob?0:.026*Math.sin(strand*1.7+side);
      const pts=bob
        ?[[side*.16,.29,.135],[side*.22,.12,.16],[midX,-.12,.14],[endX+wave,-.34,.115],[endX+wave*.6,bottom,.085]]
        :[[side*.16,.34,.13],[side*.22,.18,.16],[midX,-.01,.15],[endX+wave,-.19,.13],[midX-wave,-.38,.11],[endX+wave*.7,-.54,.09],[endX+wave*.45,bottom,.075]];
      const color=strand===0?materials.hairLight:materials.hair;
      taperedLock(head,color,pts,bob?[.012,.050,.049,.038,.005]:[.014,.055,.050,.048,.044,.030,.004],`${look.name} ${side<0?'left':'right'} hair lock`);
    }
    for(let strand=0;strand<3;strand++) {
      const startY=.30-strand*.018,endY=look.hairline*.80-.015;
      const points=[hairPoint(side*(.10+strand*.045)/.32,top,look,profile,.016),
        hairPoint(side*(.09+strand*.035)/.32,THREE.MathUtils.lerp(top,startY,.28),look,profile,.018),
        [side*(.24+strand*.012),.17,.17],[side*(.26+strand*.012),-.08,.155],[side*(.24+strand*.012),-.29+waveOffset(strand),.12]];
      taperedLock(head,strand===1?materials.hairLight:materials.hair,points,[.002,.009,.008,.006,.001],`${look.name} hair groove`);
    }
  }
}

function waveOffset(index) { return Math.sin(index*1.5)*.035; }

function addShortHairDetails(head,look,profile,materials) {
  if(['bob','wavy-long'].includes(look.hairStyle)) return;
  if(look.hairStyle==='receding-short') {
    for(const side of [-1,1]) for(let lane=0;lane<2;lane++) {
      const phi=side*(.92+lane*.24),edge=hairCapEdge(phi,look),points=[];
      for(let sample=0;sample<=6;sample++) {
        const t=sample/6,y=THREE.MathUtils.lerp(edge+.018,profile.at(-1)[0]-.035-lane*.025,t);
        points.push(hairPoint(phi+side*.04*t,y,look,profile,.014));
      }
      taperedLock(head,lane===0?materials.hairLight:materials.hair,points,[.001,.004,.005,.005,.004,.003,.001],`${look.name} side hair ridge`);
    }
    return;
  }
  const comb=look.hairStyle==='comb-over',count=comb?6:4;
  for(let lane=0;lane<count;lane++) {
    const points=[],start=comb?-1.05:-.92,end=comb?.78:.66,top=profile.at(-1)[0]-.01;
    for(let sample=0;sample<=10;sample++) {
      const t=sample/10,phi=THREE.MathUtils.lerp(start,end,t)+(lane-(count-1)/2)*.055;
      const edge=hairCapEdge(phi,look),y=THREE.MathUtils.lerp(edge+.026,top-Math.abs(lane-(count-1)/2)*.018,t);
      points.push(hairPoint(phi,y,look,profile,.014+Math.sin(t*Math.PI)*.008));
    }
    const radius=comb?.008:.0055;
    taperedLock(head,lane%3===1?materials.hairLight:materials.hair,points,[.001,radius*.72,radius,radius,radius*.8,radius*.6,.001],`${look.name} swept hair ridge`);
  }
  if(look.hairStyle==='swept-short'||look.hairStyle==='comb-over') {
    const top=profile.at(-1)[0]-.01;
    const points=[[-1.05,top-.045],[-.72,top-.012],[-.34,top],[.02,top-.025],[.36,top-.060],[.62,top-.115]]
      .map(([phi,y])=>hairPoint(phi,Math.max(y,hairCapEdge(phi,look)+.035),look,profile,.028));
    const radii=look.hairStyle==='comb-over'?[.004,.028,.040,.036,.024,.002]:[.003,.011,.014,.012,.007,.001];
    taperedLock(head,look.hairStyle==='comb-over'?materials.hairLight:materials.hair,points,radii,`${look.name} sculpted front sweep`);
  }
}

function createMaterials(look) {
  const mat=(color,roughness=.86)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0,side:THREE.DoubleSide});
  return {
    skin:mat(look.skin),face:mat(look.skin),
    skinShade:mat(new THREE.Color(look.skin).multiplyScalar(.84)),blush:mat(look.blush),
    skull:mat(look.skin),
    lips:mat(look.lips),nostril:mat('#68443f'),mouth:mat('#3a2025'),teeth:mat('#f8eee0'),
    eyeWhite:mat('#f5eee5'),iris:mat(look.eyes,.58),pupil:mat('#202124',.5),glint:mat('#ffffff',.3),
    brow:mat(look.brow),hair:mat(look.hair),hairLight:mat(look.hairLight),hairPart:mat(new THREE.Color(look.hair).multiplyScalar(.62)),
    glasses:mat('#202326',.42),hairCap:new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.9,side:THREE.DoubleSide}),
  };
}

export function createCameoHead(kind) {
  const look=CAMEO_CARICATURES[kind],baseProfile=PROFILES[kind];
  if(!look||!baseProfile) throw new Error(`Unknown cameo head: ${kind}`);
  const profile=fitProfileToLandmarks(baseProfile),{geometry:headGeometry,landmarks}=makeLandmarkHead(kind);
  const hairLook={...look,landmarks};
  const head=new THREE.Group();head.name=`${look.name} caricature head`;head.position.y=2.77;head.scale.set(...look.faceScale);
  const materials=createMaterials(look);
  const skull=meshFromGeometry(head,makeHeadSurface(look,profile),materials.skull,`${look.name} rounded skull shell`,false);
  skull.position.z=-.055;skull.scale.z=.82;
  meshFromGeometry(head,makeRearHairSurface(profile),materials.hair,`${look.name} closed rear hair shell`);
  const faceGroup=new THREE.Group();faceGroup.name=`${look.name} front facial geometry`;head.add(faceGroup);
  const faceMesh=meshFromGeometry(faceGroup,headGeometry,materials.face,`${look.name} full landmark sculpt`);
  head.userData.faceGroup=faceGroup;
  head.userData.faceMesh=faceMesh;
  for(const side of [-1,1]) eyeFeature(faceGroup,look,profile,side,materials,landmarks);
  addEars(faceGroup,look,profile,materials);
  addGlasses(faceGroup,look,profile,materials.glasses,landmarks);
  const mouthY=(landmarks[13].y+landmarks[14].y)*.5,mouthZ=(landmarks[13].z+landmarks[14].z)*.5+.020;
  const left=landmarks[61],right=landmarks[291],width=Math.max(look.mouthWidth,Math.abs(right.x-left.x));
  ellipsoid(faceGroup,materials.lips,[0,mouthY+look.smile*.35,mouthZ],[width*.46,.009,.004],`${look.name} lip form`,28);
  tube(faceGroup,materials.mouth,[[left.x,left.y,mouthZ],[left.x*.55,mouthY+look.smile*.48,mouthZ+.002],
    [0,mouthY+look.smile,mouthZ+.004],[right.x*.55,mouthY+look.smile*.48,mouthZ+.002],[right.x,right.y,mouthZ]],.0032,`${look.name} mouth line`,32);
  if(look.name==='Stubb') ellipsoid(faceGroup,materials.teeth,[0,look.mouthY+look.smile*.58,mouthZ+.008],
    [look.mouthWidth*.30,.008,.003],`${look.name} smile teeth`,28);
  const mouth=addMouth(faceGroup,look,profile,materials,landmarks);mouth.visible=false;
  addHairCap(head,hairLook,profile,materials);addLongHair(head,hairLook,profile,materials);addShortHairDetails(head,hairLook,profile,materials);
  head.userData.mouth=mouth;head.userData.jaw=mouth.children.find(child=>child.name.includes('moving lower jaw'));
  head.userData.mouthLine=faceGroup.children.find(child=>child.name===`${look.name} mouth line`);
  head.userData.look=look;
  head.userData.mouthY=mouthY;
  return head;
}

export function createCameoNeck(kind) {
  const look=CAMEO_CARICATURES[kind];
  if(!look) throw new Error(`Unknown cameo head: ${kind}`);
  const neck=new THREE.Group();neck.name=`${look.name} neck`;
  const geometry=new THREE.CylinderGeometry(.11,.14,.33,24).translate(0,2.30,0);
  meshFromGeometry(neck,geometry,new THREE.MeshStandardMaterial({color:look.skin,roughness:.86}),`${look.name} neck mesh`);
  return neck;
}

export function animateCameoHead(head,time,running) {
  const bounce=running?Math.max(0,Math.sin(time*9)):0;
  head.rotation.z=running?Math.sin(time*9)*.012:0;
  head.userData.mouth.visible=running;
  head.userData.mouthLine.visible=!running;
  head.userData.jaw.rotation.x=running?.12+bounce*.055:0;
  head.userData.jaw.position.y=head.userData.mouthY-.027-(running?.012+bounce*.008:0);
}
