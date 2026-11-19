import * as THREE from 'three';
import { colored, grid, surface } from './portrait-face.js';

export function addLePenHair(head) {
  const root=new THREE.Color('#a28b71'), gold=new THREE.Color('#dcc598'), tip=new THREE.Color('#e9d8b5');
  const rows=60,columns=156;
  const smoothCrown=y=>THREE.MathUtils.smoothstep(y,.17,.32);
  const cap=grid(rows,columns,(u,v)=>{
    const a=(u-.5)*2*Math.PI;
    const side=THREE.MathUtils.smoothstep(Math.abs(a),.30,1.59);
    const swept=THREE.MathUtils.lerp(.18,.35,THREE.MathUtils.smoothstep(a,-.88,.55));
    const hem=THREE.MathUtils.lerp(swept,-.56+.026*Math.cos(5*a),side**1.9);
    const y=THREE.MathUtils.lerp(.485,hem,v*v);
    const dome=Math.sqrt(Math.max(0,1-(Math.max(0,y-.055)/.43)**2));
    const curl=THREE.MathUtils.smoothstep(-y,.32,.56);
    const phi=a+.16*(1-v)*Math.sin(a-.58);
    const ridge=.5+.5*Math.cos(28*phi+2.5*Math.sin(4*a)+2.8*v);
    const twist=curl*Math.sin(3*a+.65);
    const front=Math.max(0,Math.cos(phi));
    const part=Math.exp(-(((dome*Math.sin(phi)-.28)/.039)**2))*Math.max(0,Math.cos(phi));
    const radius=dome*(.391+.006*ridge+.039*curl+.036*curl*Math.cos(5*a));
    const x=(radius+.024*curl)*Math.sin(phi+.105*twist)+.060*(1-dome);
    const z=-.039+dome*(.380+.009*ridge+.060*curl)*Math.cos(phi)+.027*front*smoothCrown(y);
    const p=new THREE.Vector3(x,y-.006*part+.024*curl*Math.cos(5*a+.6),z);
    const tint=root.clone().lerp(gold,.44+.31*ridge+.12*v).lerp(tip,curl*.46).lerp(root,part*.6);
    return [p,tint];
  });
  for(let col=0;col<=columns;col++) {
    const i=rows*(columns+1)+col,j=i+columns+1;
    cap.positions.push(cap.positions[3*i]*.88,cap.positions[3*i+1]+.010,cap.positions[3*i+2]*.87);
    cap.colors.push(root.r,root.g,root.b);
    if(col<columns) cap.indices.push(i,j,i+1,i+1,j,j+1);
  }
  surface(head,'Side-swept blonde hair with turned ends',cap.positions,cap.indices,colored(),cap.colors);
}
