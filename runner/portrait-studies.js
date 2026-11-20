import * as THREE from 'three';
import { PORTRAIT_STUDIES } from './portrait-sculpt-data.js';

const fields = new Map();

// Heights are local offsets along the face's forward axis. Applying them before
// deriving the normals keeps the folds lit consistently as the head turns.
export function faceStudy(kind) {
  const study = PORTRAIT_STUDIES[kind];
  if (!study) return null;
  if (fields.has(kind)) return fields.get(kind);
  const bytes = Int8Array.from(atob(study.relief), value => value.charCodeAt(0));
  function height(x,y) {
    const u=(x+.36)*80/.72, v=(y+.43)*90/.85;
    if (u<0 || v<0 || u>=80 || v>=90) return 0;
    const i=Math.floor(v)*81+Math.floor(u), t=u%1;
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(bytes[i],bytes[i+1],t),
      THREE.MathUtils.lerp(bytes[i+81],bytes[i+82],t),v%1)/5400;
  }
  const field = {height,brow:study.brow,moustache:study.moustache};
  fields.set(kind,field);
  return field;
}

// A feathered contour lets the pigment follow the curved brow and upper lip.
export function contourWeight(points,x,y,feather) {
  let inside=false, distance=Infinity;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [ax,ay]=points[j], [bx,by]=points[i];
    const dx=bx-ax, dy=by-ay;
    if ((ay>y)!==(by>y) && x < ax+dx*(y-ay)/dy) inside=!inside;
    const t=THREE.MathUtils.clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
    distance=Math.min(distance,(x-ax-t*dx)**2+(y-ay-t*dy)**2);
  }
  return THREE.MathUtils.smoothstep((inside?1:-1)*Math.sqrt(distance),-feather,feather);
}
