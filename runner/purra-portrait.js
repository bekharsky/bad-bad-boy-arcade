// Coordinates are in the head's local frame. The facial loops follow the fitted
// MediaPipe topology, including the boundaries shared by the lips and eyelids.
import * as THREE from 'three';
import { CAMEO_FACE_DATA, CAMEO_FACE_TRIANGLES } from './cameo-face-data.js';

const oval = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const eyes = [
  {upper:[33,246,161,160,159,158,157,173,133], lower:[33,7,163,144,145,153,154,155,133], brow:[70,63,105,66,107]},
  {upper:[263,466,388,387,386,385,384,398,362], lower:[263,249,390,373,374,380,381,382,362], brow:[300,293,334,296,336]},
];
const upperContour = [61,40,39,37,0,267,269,270,291,185,409,78,191,80,81,82,13,312,311,310,415,308];
const lowerContour = [61,146,91,181,84,17,314,405,321,375,291,78,95,88,178,87,14,317,402,318,324,308];
const upperInner = upperContour.slice(11), lowerInner = lowerContour.slice(11);
// Two intermediate strips lie between the vermilion border and the mouth opening.
const upperBands = [184,74,73,72,11,302,303,304,408,183,42,41,38,12,268,271,272,407];
const lowerBands = [77,90,180,85,16,315,404,320,307,96,89,179,86,15,316,403,319,325];
const lerp = THREE.MathUtils.lerp;
const smooth = THREE.MathUtils.smoothstep;
const color = hex => new THREE.Color(hex);
const material = hex => new THREE.MeshStandardMaterial({color:hex, roughness:.86, side:THREE.DoubleSide});
const colored = () => new THREE.MeshStandardMaterial({vertexColors:true, roughness:.83, side:THREE.DoubleSide});

function surface(parent, name, positions, indices, mat, colors) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g,mat);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function grid(rows, columns, point) {
  const positions=[], indices=[], colors=[];
  for(let j=0;j<=rows;j++) for(let i=0;i<=columns;i++) {
    const [p,c]=point(i/columns,j/rows);
    positions.push(p.x,p.y,p.z);
    if(c) colors.push(c.r,c.g,c.b);
    if(i<columns && j<rows) {
      const a=j*(columns+1)+i,b=a+columns+1;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
  }
  return {positions,indices,colors};
}

function addEye(head,points,{upper,lower,brow}) {
  const curve = ids => new THREE.CatmullRomCurve3(ids.map(i=>points[i]));
  const lid=curve(upper), rim=curve(lower);
  const irisCenter=lid.getPoint(.49).lerp(rim.getPoint(.49),.43);
  const white=color('#ece2d9'), iris=color('#587482'), ring=color('#394b54'), pupil=color('#22252b');
  const eye=grid(22,54,(u,v)=>{
    const p=lid.getPoint(u).lerp(rim.getPoint(u),v);
    p.z+=.013*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
    const dx=p.x-irisCenter.x, dy=p.y-irisCenter.y, r=Math.hypot(dx,dy);
    const tint=ring.clone().lerp(white,smooth(r,.022,.024));
    tint.lerp(iris,1-smooth(r,.018,.020)).lerp(pupil,1-smooth(r,.008,.010));
    tint.lerp(white,.85*(1-smooth(Math.hypot(dx+.006,dy-.007),.002,.005)));
    return [p,tint];
  });
  surface(head,'Eye between fitted lids',eye.positions,eye.indices,colored(),eye.colors);
  for(const [name,path,thickness,tint] of [
    ['Upper eyelid',lid,.0026,'#735448'],['Eyebrow',curve(brow),.009,'#94755f']
  ]) {
    const band=grid(6,30,(u,v)=>{
      const p=path.getPoint(u);
      const taper=Math.pow(Math.sin(Math.PI*u),.45);
      p.y+=(v-.5)*2*thickness*taper;
      p.z+=.004+thickness*.55*Math.sin(Math.PI*v)*taper;
      return [p];
    });
    surface(head,name,band.positions,band.indices,material(tint));
  }
}

function addBob(head) {
  // The part opens onto the forehead. Past each temple the same shell falls
  // nearly vertically, ending below the jaw in the blunt outline of the bob.
  const root=color('#b39a75'), blonde=color('#f2dfc0');
  const {positions,indices,colors}=grid(54,160,(u,v)=>{
    const a=(u-.5)*2*Math.PI, front=Math.cos(a);
    const temple=smooth(Math.abs(a),.18,1.60);
    const partDistance=Math.abs(a-.10);
    const hairline=.373-.043*(1-Math.exp(-partDistance*partDistance*3))+.009*Math.sin(3*a);
    const hem=lerp(hairline,-.55,temple**2.4)+.017*Math.sin(3*a+.4)*temple;
    const crown=.49, y=lerp(crown,hem,v*v);
    const dome=Math.sqrt(Math.max(0,1-Math.pow(Math.max(0,y-.075)/(crown-.075),2)));
    const tuck=Math.exp(-(((a-1.42)/.55)**2+((y+.06)/.24)**2));
    const sweep=a+.035*(1-v)+.07*Math.sin(2*a)*v+.49*tuck;
    const strand= .5+.5*Math.cos(34*sweep+2.6*Math.sin(5*a)+v*1.6+1.1*Math.sin(3*v+7*a));
    const radius=(.385+.009*Math.sin(3*a+.4)+.003*strand-.010*tuck)*dome;
    const fall=Math.max(0,-y)*temple;
    const part=Math.exp(-(((radius*Math.sin(sweep)-.031)/.014)**2))*smooth(y,.32,.42);
    const x=(radius+.045*fall)*Math.sin(sweep) + .038*(1-dome);
    const z=-.056+(.396+.003*strand)*dome*Math.cos(sweep)+fall*.07;
    const p=new THREE.Vector3(x,y-.009*part,z-.006*part*front);
    const tint=root.clone().lerp(blonde,.44+.13*strand+.17*v+.10*front);
    tint.lerp(root,.56*part);
    return [p,tint];
  });
  // Turn the edge inwards so the cut has thickness, even from below.
  for(let i=0;i<=160;i++) {
    const a=54*161+i, b=55*161+i;
    positions.push(positions[a*3]*.91,positions[a*3+1]+.007,positions[a*3+2]*.89);
    colors.push(root.r,root.g,root.b);
    if(i<160) indices.push(a,b,a+1,a+1,b,b+1);
  }
  surface(head,'Centre-parted blonde bob',positions,indices,colored(),colors);
}

export function createPurraPortrait() {
  const head=new THREE.Group();
  head.position.y=2.77;
  const points=CAMEO_FACE_DATA.purra.slice(0,468).map(([x,worldY,z])=>{
    const y=worldY-2.77;
    const gaussian=(cx,cy,w,h)=>Math.exp(-(((Math.abs(x)-cx)/w)**2+((y-cy)/h)**2));
    const cheek=gaussian(.19,-.10,.09,.10);
    const smile=gaussian(.14,-.24,.05,.052);
    return new THREE.Vector3(x*(1-.085*smooth(-y,.12,.43)),
      y+.011*smile-.27*(y+.245)*gaussian(0,-.246,.15,.064)-.019*gaussian(.16,.15,.13,.045)+.013*gaussian(.09,.035,.06,.04),
      z+.022*cheek-.009*smile);
  });
  const eyeLoops=eyes.map(e=>new Set([...e.upper,...e.lower]));
  const lipLoops=[[...upperContour,...upperBands],[...lowerContour,...lowerBands],[...upperInner,...lowerInner]].map(loop=>new Set(loop));
  const groups=[[],[],[],[]];
  for(const tri of CAMEO_FACE_TRIANGLES) {
    if(eyeLoops.some(loop=>tri.every(i=>loop.has(i)))) continue;
    const [a,b,c]=tri.map(i=>points[i]);
    const facing=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const group=1+lipLoops.findIndex(loop=>tri.every(i=>loop.has(i)));
    groups[group].push(...(facing>=0?tri:[tri[0],tri[2],tri[1]]));
  }
  const skin=material('#e8bca7');
  const faceSkin=colored(), complexion=[];
  const ivory=color('#ebc3af'), rose=color('#d69d91'), shade=color('#cda69a');
  for(const p of points) {
    const x=Math.abs(p.x);
    const cheek=Math.exp(-(((x-.21)/.09)**2+((p.y+.09)/.085)**2));
    const lid=Math.exp(-(((x-.15)/.09)**2+((p.y-.073)/.036)**2));
    ivory.clone().lerp(rose,.63*cheek).lerp(shade,.53*lid).toArray(complexion,complexion.length);
  }
  const face=surface(head,'Continuous face and lips',points.flatMap(p=>p.toArray()),groups.flat(),
    [faceSkin,material('#b36869'),material('#cc8182'),material('#623e40')],complexion);
  let offset=0;
  groups.forEach((indices,i)=>{face.geometry.addGroup(offset,indices.length,i);offset+=indices.length;});
  const lowerSet=new Set(lowerInner.filter(i=>!upperInner.includes(i)));
  const lowered=points.map((p,i)=>{
    const weight=lowerSet.has(i)?1:smooth(-p.y,.245,.30)*(1-smooth(Math.abs(p.x),.08,.21));
    return [p.x,p.y-.032*weight,p.z-.005*weight];
  });
  face.geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(lowered.flat(),3)];
  face.updateMorphTargets();
  head.userData.animatedFace=face;

  const back=grid(24,oval.length,(u,v)=>{
    const edge=points[oval[Math.round(u*oval.length)%oval.length]];
    const angle=v*Math.PI/2;
    return [new THREE.Vector3(edge.x*Math.cos(angle),edge.y*Math.cos(angle),edge.z*Math.cos(angle)-.34*Math.sin(angle))];
  });
  surface(head,'Back of head',back.positions,back.indices,skin);
  // The right temple is swept back. The helix folds around the concha
  // and the lobe sits inside the hair, as in the three-quarter reference.
  const ear=grid(12,36,(u,v)=>{
    const a=u*Math.PI*2, radial=Math.sin(v*Math.PI/2);
    const ridge=Math.exp(-(((radial-.79)/.17)**2));
    const p=new THREE.Vector3(.351+.018*(1-radial)+.024*ridge,
      -.078+.071*Math.cos(a)*radial,
      -.033+.039*Math.sin(a)*radial-.015*Math.cos(a)*radial);
    return [p,color('#d8a691').lerp(ivory,.80*ridge+.14*radial)];
  });
  surface(head,'Ear under tucked hair',ear.positions,ear.indices,colored(),ear.colors);
  eyes.forEach(eye=>addEye(head,points,eye));
  addBob(head);
  return head;
}
