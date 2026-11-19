// Coordinates are in the head's local frame. The facial loops follow the fitted
// MediaPipe topology, including the boundaries shared by the lips and eyelids.
import * as THREE from 'three';
import { CAMEO_FACE_TRIANGLES } from './cameo-face-data.js';

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
const smooth = THREE.MathUtils.smoothstep;
const color = hex => new THREE.Color(hex);
export const material = hex => new THREE.MeshStandardMaterial({color:hex, roughness:.86, side:THREE.DoubleSide});
export const colored = () => new THREE.MeshStandardMaterial({vertexColors:true, roughness:.83, side:THREE.DoubleSide});

export function surface(parent, name, positions, indices, mat, colors) {
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

export function grid(rows, columns, point) {
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

function addEye(head,points,{upper,lower,brow}, palette) {
  const curve = ids => new THREE.CatmullRomCurve3(ids.map(i=>points[i]));
  const lid=curve(upper), rim=curve(lower);
  const irisCenter=lid.getPoint(.49).lerp(rim.getPoint(.49),.43);
  const white=color('#ece2d9'), iris=color(palette.iris ?? '#587482'), ring=color('#394b54'), pupil=color('#22252b');
  const eye=grid(22,54,(u,v)=>{
    const p=lid.getPoint(u).lerp(rim.getPoint(u),v);
    p.z+=.013*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
    const dx=p.x-irisCenter.x, dy=p.y-irisCenter.y, r=Math.hypot(dx,dy)/(palette.irisScale ?? 1);
    const tint=ring.clone().lerp(white,smooth(r,.022,.024));
    tint.lerp(iris,1-smooth(r,.018,.020)).lerp(pupil,1-smooth(r,.008,.010));
    tint.lerp(white,.85*(1-smooth(Math.hypot(dx+.006,dy-.007),.002,.005)));
    return [p,tint];
  });
  surface(head,'Eye between fitted lids',eye.positions,eye.indices,colored(),eye.colors);
  for(const [name,path,thickness,tint] of [
    ['Upper eyelid',lid,palette.lashWidth ?? .0026,palette.lash ?? '#735448'],
    ['Eyebrow',curve(brow),palette.browWidth ?? .009,palette.brow],
    ...(palette.lowerLid ? [['Lower lid',rim,.0018,palette.lowerLid]] : [])
  ]) {
    const band=grid(6,30,(u,v)=>{
      const p=path.getPoint(u);
      const taper=(name==='Eyebrow' && palette.browTaper)
        ? Math.sin(Math.PI*u)**.55*(.38+.94*u)
        : Math.pow(Math.sin(Math.PI*u),.45);
      p.y+=(v-.5)*2*thickness*taper;
      p.z+=.004+thickness*.55*Math.sin(Math.PI*v)*taper;
      return [p];
    });
    surface(head,name,band.positions,band.indices,material(tint));
  }
}

export function addPortraitFace(head, points, palette) {
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
  const skin=material(palette.skin);
  const faceSkin=colored(), complexion=[];
  const ivory=color(palette.base), rose=color(palette.rose), shade=color(palette.shade);
  for(const p of points) {
    const x=Math.abs(p.x);
    const cheek=Math.exp(-(((x-.21)/.09)**2+((p.y+.09)/.085)**2));
    const lid=Math.exp(-(((x-.15)/.09)**2+((p.y-.073)/.036)**2));
    ivory.clone().lerp(rose,.63*cheek).lerp(shade,.53*lid).toArray(complexion,complexion.length);
  }
  const face=surface(head,'Continuous face and lips',points.flatMap(p=>p.toArray()),groups.flat(),
    [faceSkin,material(palette.upperLip),material(palette.lowerLip),material('#623e40')],complexion);
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
    return [new THREE.Vector3(edge.x*Math.cos(angle),edge.y*Math.cos(angle),edge.z*Math.cos(angle)-(palette.backDepth ?? .34)*Math.sin(angle))];
  });
  surface(head,'Back of head',back.positions,back.indices,skin);
  eyes.forEach(eye=>addEye(head,points,eye,palette));
}
