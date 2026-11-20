import * as THREE from 'three';
import { CAMEO_FACE_DATA } from './cameo-face-data.js';
import { addPortraitFace, grid, surface, colored } from './portrait-face.js';

const lerp = THREE.MathUtils.lerp;
const smooth = THREE.MathUtils.smoothstep;
const color = hex => new THREE.Color(hex);

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
  addPortraitFace(head, points, {
    skin:'#e8bca7', base:'#ebc3af', rose:'#d69d91', shade:'#cda69a',
    upperLip:'#b36869', lowerLip:'#cc8182', brow:'#94755f'
  });
  const ivory=color('#ebc3af');
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
  addBob(head);
  return head;
}
