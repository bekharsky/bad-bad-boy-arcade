import * as THREE from 'three';
import { CAMEO_FACE_DATA } from './cameo-face-data.js';
import { refineOrpoFace } from './orpo-relief.js';
import { addPortraitFace, grid, surface, colored, material } from './portrait-face.js';

const smooth = THREE.MathUtils.smoothstep;
const lerp = THREE.MathUtils.lerp;
const tau = Math.PI * 2;
const palette = {
  skin:'#dfb59d', base:'#e0b9a4', rose:'#ca9484', shade:'#b89a90',
  upperLip:'#a77770', lowerLip:'#c18d84', brow:'#736658'
};

function fittedFace() {
  return CAMEO_FACE_DATA.orpo.slice(0,468).map(([x,worldY,z])=>{
    const y=worldY-2.77, side=Math.abs(x);
    const relief=(cx,cy,w,h)=>Math.exp(-(((side-cx)/w)**2+((y-cy)/h)**2));
    const cheek=relief(.205,-.11,.115,.085);
    const eyeBag=relief(.144,-.005,.086,.031);
    const corner=relief(.13,-.236,.042,.042);
    const fold=relief(.085+Math.max(0,-y-.10)*.45,-.189,.016,.085);
    const chin=relief(.03,-.368,.133,.059);
    return new THREE.Vector3(
      x*(1-.087*smooth(-y,.16,.43)+.20*relief(.09,-.237,.11,.046)),
      y-.007*corner+.007*smooth(-y,.33,.47)-.33*(y+.238)*relief(.03,-.238,.14,.039)
        -.038*relief(.14,.145,.19,.033),
      z+.030*cheek+.014*eyeBag-.012*fold+.016*chin-.006*corner
    );
  });
}

function addEars(head) {
  for(const side of [-1,1]) {
    const ear=grid(16,48,(u,v)=>{
      const a=u*tau, r=Math.sin(v*Math.PI/2), upper=Math.cos(a);
      const helix=Math.exp(-(((r-.78)/.17)**2));
      const inner=Math.exp(-(((r-.39)/.18)**2))*Math.max(0,Math.sin(a+.6));
      const p=new THREE.Vector3(side*(.337+.048*(1-r*r)+.028*helix+.010*inner+.020*upper*r),
        -.070+.093*upper*r,-.104+.053*Math.sin(a)*r-.019*upper*r);
      const c=new THREE.Color('#bb8979').lerp(new THREE.Color(palette.skin),.27+.62*helix+.1*r);
      return [p,c];
    });
    surface(head,'Sculpted pinna',ear.positions,ear.indices,colored(),ear.colors);
  }
}

// Profile of the cut from the forehead, over the temple and ear, to the nape.
const hairline = [[0,.32],[.32,.337],[.60,.355],[.82,.30],[1.02,.21],
  [1.19,.08],[1.26,-.033],[1.39,.036],[1.60,.038],[1.85,-.019],
  [2.02,-.176],[2.35,-.274],[Math.PI,-.329]];
function edgeHeight(angle) {
  const i=hairline.findIndex(([a])=>a>=angle);
  if(i<=0) return hairline[0][1];
  const [a,y]=hairline[i-1], [b,next]=hairline[i];
  return lerp(y,next,smooth(angle,a,b));
}

let cropGeometry;
function addHair(head) {
  if (cropGeometry) {
    const hair=new THREE.Mesh(cropGeometry.clone(),colored());
    hair.name='Side-parted crop';
    hair.castShadow=hair.receiveShadow=true;
    head.add(hair);
    return;
  }
  const brown=new THREE.Color('#47443f'), ash=new THREE.Color('#928c84');
  const silver=new THREE.Color('#bbb5aa');
  const rows=58, columns=190;
  // Fit the roots to the sculpt. A separate cap on an ellipsoid leaves a
  // ledge in profile, especially above the temples.
  const scalp=[head.getObjectByName('Continuous face and lips'),head.getObjectByName('Back of head')];
  // Intersect each horizontal slice with the skull once. Its short list of
  // segments supplies the radius at every azimuth without recasting mesh rays.
  const radial=[], sectors=96, slices=42, minY=-.35, maxY=.39;
  for(let j=0;j<=slices;j++) {
    const y=lerp(minY,maxY,j/slices), segments=[];
    for(const mesh of scalp) {
      const pos=mesh.geometry.attributes.position, ids=mesh.geometry.index.array;
      for(let n=0;n<ids.length;n+=3) {
        const hits=[];
        for(let k=0;k<3;k++) {
          const a=ids[n+k], b=ids[n+(k+1)%3], ya=pos.getY(a), yb=pos.getY(b);
          if ((ya<=y)===(yb<=y)) continue;
          const t=(y-ya)/(yb-ya);
          hits.push([lerp(pos.getX(a),pos.getX(b),t),lerp(pos.getZ(a),pos.getZ(b),t)+.079]);
        }
        if(hits.length===2) segments.push(hits);
      }
    }
    for(let i=0;i<=sectors;i++) {
      const a=(i/sectors-.5)*tau, dx=Math.sin(a), dz=Math.cos(a);
      let radius=0;
      for(const [[x,z],[ex,ez]] of segments) {
        const sx=ex-x, sz=ez-z, det=dx*sz-dz*sx;
        if(Math.abs(det)<1e-9) continue;
        const fraction=(x*dz-z*dx)/det;
        if(fraction>=0 && fraction<=1) radius=Math.max(radius,(x*sz-z*sx)/det);
      }
      radial.push(radius);
    }
  }
  function skullRadius(u,y) {
    const t=THREE.MathUtils.clamp((y-minY)/(maxY-minY)*slices,0,slices-.0001);
    const j=Math.floor(t), k=Math.min(sectors-.0001,u*sectors), i=Math.floor(k);
    const idx=j*(sectors+1)+i;
    const lo=lerp(radial[idx],radial[idx+1],k-i);
    const hi=lerp(radial[idx+sectors+1],radial[idx+sectors+2],k-i);
    return lerp(lo,hi,t-j);
  }
  const cap=grid(rows,columns,(u,v)=>{
    const a=(u-.5)*tau, front=Math.cos(a), side=Math.sin(a);
    const hem=edgeHeight(Math.abs(a))+.012*side*smooth(front,.4,.8);
    const latitude=lerp(Math.asin((hem-.055)/.443),Math.PI/2,v);
    const belt=Math.cos(latitude);
    const sweep=smooth(front,-.24,.84);
    const flow=43*(a+1.35*v*sweep+.40*v*(1-sweep))+2.7*Math.sin(6*a+4*v)+2*Math.sin(11*a-7*v);
    const fibre=.5+.5*Math.sin(3.2*flow+5*Math.sin(a*7+v*19));
    const part=Math.exp(-(((a-.71+.68*v)/.08)**2))*sweep;
    const ridge=.5+.5*Math.cos(flow);
    const quiff=sweep*Math.sin(v*Math.PI)*belt*(1-.52*side);
    const volume=belt**.75*(1+.048*quiff)+.0025*belt*ridge;
    const x=(.362+.006*v)*side*volume-.023*(1-belt);
    const y=.055+.443*Math.sin(latitude)+.093*quiff+.0016*ridge*belt-.013*part*belt;
    const z=-.079+.383*front*volume+.036*quiff-.011*part*belt;
    const temple=(1-sweep)*smooth(Math.abs(side),.5,.95)*(1-v);
    const tint=brown.clone().lerp(ash,.20+.075*ridge+.049*fibre+.24*v+.26*temple)
      .lerp(silver,(.025+.14*sweep+.16*temple)*ridge**4*(.4+fibre*.6));
    const p=new THREE.Vector3(x,y,z), root=skullRadius(u,hem);
    if(root) {
      const weight=(1-smooth(v,0,.23))*.93*smooth(front,.0,.7);
      const base=Math.cos(Math.asin((hem-.055)/.443))**.75;
      p.x+=weight*side*THREE.MathUtils.clamp(root+.004-.362*base,-.035,.035);
      p.z+=weight*front*THREE.MathUtils.clamp(root+.004-.383*base,-.047,.035);
    }
    if(p.y<maxY) {
      const r=Math.hypot(p.x,p.z+.079);
      const skinRadius=skullRadius(u,p.y)+.008;
      if(r>0 && r<skinRadius) {
        p.x*=skinRadius/r;
        p.z=-.079+(p.z+.079)*skinRadius/r;
      }
    }
    return [p,tint];
  });
  // Close the narrow bevel at the hairline against the forehead and temples.
  for(let i=0;i<=columns;i++) {
    const j=cap.positions.length/3;
    cap.positions.push(cap.positions[3*i]*.89,cap.positions[3*i+1]+.008,
      -.079+(cap.positions[3*i+2]+.079)*.88);
    cap.colors.push(brown.r,brown.g,brown.b);
    if(i<columns) cap.indices.push(i,i+1,j,j,i+1,j+1);
  }
  cropGeometry=surface(head,'Side-parted crop',cap.positions,cap.indices,colored(),cap.colors).geometry.clone();
}

function addFrames(head) {
  const acetate=material('#302b27'), hinge=material('#827b6c');
  function rod(name,pts,r,mat=acetate,closed=false) {
    const curve=new THREE.CatmullRomCurve3(pts.map(([x,y,z])=>new THREE.Vector3(x,y,z)),closed);
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,closed?72:28,r,8,closed),mat);
    mesh.name=name;
    head.add(mesh);
  }
  // Panto rims are wider across the brow and round below the pupil.
  for(const side of [-1,1]) {
    const rim=[];
    for(let i=0;i<32;i++) {
      const a=tau*i/32, h=Math.sin(a), w=Math.cos(a);
      const x=side*(.151+.113*w*(1+.11*h));
      const y=.024+.089*Math.sign(h)*Math.abs(h)**(h>0?.63:1.04)+.006*w;
      const z=.259-.094*(Math.abs(x)/.29)**1.65-.016*(1-h)/2;
      rim.push([x,y,z]);
    }
    rod('Panto rim',rim,.0069,acetate,true);
    rod('Endpiece',[[side*.248,.077,.184],[side*.279,.076,.164],[side*.294,.072,.137]],.010);
    rod('Temple and earpiece',[[side*.29,.072,.144],[side*.323,.066,.078],
      [side*.355,.044,-.012],[side*.37,.019,-.104],[side*.358,-.045,-.156]],.0068);
    rod('Hinge pin',[[side*.272,.080,.175],[side*.279,.080,.169]],.0031,hinge);
  }
  rod('Arch over nose',[[-.048,.062,.252],[-.028,.079,.260],[0,.083,.264],
    [.028,.079,.260],[.048,.062,.252]],.009);
}

export function createOrpoPortrait() {
  const head=new THREE.Group();
  head.position.y=2.77;
  addPortraitFace(head,fittedFace(),palette);
  addHair(head);
  refineOrpoFace(head.getObjectByName('Continuous face and lips'));
  addEars(head);
  addFrames(head);
  return head;
}
