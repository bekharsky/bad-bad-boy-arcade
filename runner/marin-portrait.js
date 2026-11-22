import * as THREE from 'three';
import { CAMEO_FACE_DATA, CAMEO_FACE_TRIANGLES } from './cameo-face-data.js';
import { addPortraitFace, colored, grid, surface } from './portrait-face.js';

const smooth = THREE.MathUtils.smoothstep;
const skin = '#f0c9b4';
const palette = {
  skin, base:'#ebc5b3', rose:'#d89990', shade:'#b89692',
  upperLip:'#a16768', lowerLip:'#bc8280', brow:'#604941',
  lash:'#453736', lashWidth:.0053, browWidth:.012, browTaper:true, lowerLid:'#977a70',
  iris:'#70867b', irisScale:1.28, backDepth:.269,
};

function fittedFace() {
  const fitted=CAMEO_FACE_DATA.marin.slice(0,468).map(([x,worldY,z])=>{
    const y=worldY-2.77, side=Math.abs(x);
    const falloff=(cx,cy,w,h)=>Math.exp(-(((side-cx)/w)**2+((y-cy)/h)**2));
    const cheek=falloff(.175,-.073,.095,.076);
    const dimple=falloff(.147,-.233,.024,.032);
    const lowerLid=falloff(.141,-.003,.066,.022);
    const fold=falloff(.123+.45*(-y-.189),-.195,.021,.068);
    const mouth=falloff(.05,-.245,.124,.043);
    return new THREE.Vector3(
      x*(1+.026*cheek+.11*mouth-.052*smooth(-y,.24,.45)-.095*falloff(.072,-.11,.04,.046)),
      y+.020*falloff(.124,-.246,.046,.05)-.34*(y+.25)*mouth
        -.054*falloff(.135,.15,.16,.066)+.008*falloff(.203,.155,.046,.043)+.008*falloff(.19,.04,.046,.045),
      z-.030*smooth(y,.295,.38)+.034*cheek-.016*dimple-.008*fold+.011*lowerLid-.010*falloff(.19,-.19,.08,.065)+.008*falloff(.013,-.123,.034,.041)
        +.009*falloff(.035,-.39,.080,.037)
    );
  });
  // Soften the lateral wings where the fitted profile folds back into the
  // cheek. Use the adjacent triangles to keep the bridge and tip distinct.
  const neighbours=Array.from(fitted,()=>new Set());
  for(const [a,b,c] of CAMEO_FACE_TRIANGLES) {
    neighbours[a].add(b).add(c); neighbours[b].add(c).add(a); neighbours[c].add(a).add(b);
  }
  return fitted.map((p,i)=>{
    const weight=.62*Math.exp(-(((Math.abs(p.x)-.066)/.031)**2+((p.y+.133)/.049)**2));
    if(weight<.001) return p;
    const mean=new THREE.Vector3();
    for(const index of neighbours[i]) mean.add(fitted[index]);
    return p.clone().lerp(mean.multiplyScalar(1/neighbours[i].size),weight);
  });
}

// Each column is a section from the part to the ends. The two banks share
// the part and the back seam. At the front they frame the face differently.
const part = [[.077,.348,.17],[.067,.440,.075],[.045,.482,-.058],[.018,.445,-.194],[0,.365,-.266]];
const outer = [
  [[-.11,.308,.186],[-.23,.242,.150],[-.281,.078,.112],[-.325,-.18,.140],[-.388,-.41,.192],[-.460,-.60,.214],[-.409,-.805,.294]],
  [[-.163,.425,.090],[-.292,.279,.066],[-.331,.071,.03],[-.345,-.18,.027],[-.391,-.43,.084],[-.475,-.625,.115],[-.420,-.845,.17]],
  [[-.159,.448,-.079],[-.297,.326,-.093],[-.342,.083,-.132],[-.343,-.19,-.119],[-.371,-.46,-.122],[-.395,-.68,-.064],[-.354,-.795,-.041]],
  [[-.141,.409,-.224],[-.231,.285,-.249],[-.288,.075,-.263],[-.277,-.21,-.277],[-.292,-.47,-.257],[-.302,-.66,-.213],[-.275,-.765,-.188]],
  [[0,.324,-.302],[0,.24,-.355],[0,.052,-.387],[0,-.19,-.357],[0,-.45,-.337],[0,-.64,-.294],[0,-.755,-.26]],
];
const tucked = [
  [[.169,.321,.134],[.234,.223,.082],[.271,.102,.027],[.289,.033,-.059],[.296,-.144,-.153],[.35,-.40,-.164],[.385,-.656,-.085]],
  [[.220,.387,.068],[.287,.255,.042],[.311,.121,-.013],[.317,.05,-.078],[.312,-.165,-.170],[.359,-.44,-.174],[.393,-.728,-.083]],
  [[.218,.430,-.082],[.306,.281,-.102],[.330,.115,-.139],[.324,-.048,-.173],[.323,-.273,-.211],[.365,-.487,-.205],[.384,-.746,-.139]],
  [[.143,.406,-.226],[.251,.285,-.258],[.29,.107,-.266],[.294,-.11,-.273],[.285,-.316,-.286],[.31,-.55,-.257],[.27,-.741,-.183]],
  outer[4],
];
const hairRows=32, hairColumns=56;
const curve = controls => new THREE.CatmullRomCurve3(controls.map(p=>new THREE.Vector3(...p)));

function addHairBank(head, sections) {
  const paths=sections.map((column,i)=>curve([part[i],...column]));
  const root=new THREE.Color('#332b29'), mid=new THREE.Color('#655349'), ends=new THREE.Color('#826c5e');
  const scalp=new THREE.Color('#92766c');
  const rows=hairRows, columns=hairColumns;
  const positions=[],colors=[],indices=[];
  for(let row=0;row<=rows;row++) {
    const v=(row/rows)**1.16;
    const across=new THREE.CatmullRomCurve3(paths.map(path=>path.getPoint(v)));
    for(let col=0;col<=columns;col++) {
      const u=col/columns, p=across.getPoint(u);
      const section=Math.sin(Math.PI*u);
      const wave=2*Math.PI*(u*9+.16*Math.sin(2*Math.PI*v+u*3)+.15*Math.sin(13*u));
      const bundle=Math.cos(wave);
      const flow=u*32+.61*Math.sin(11*u)+1.2*v+.34*Math.sin(5*v+7*u);
      const fibre=.5+.5*Math.cos(2*Math.PI*flow);
      const depth=(.003+.010*v)*bundle*section*Math.sin(v*Math.PI*.88);
      const rootLine=(1-smooth(v,.001,.012))*Math.sin(Math.PI*(.16+.84*u));
      p.y-=.003*rootLine;
      p.x+=Math.sign(p.x)*depth;
      p.z+=depth*.6;
      const swing=smooth(v,.31,.76)*section;
      p.x+=Math.sign(p.x)*.022*Math.sin(7*v+3*u)*swing;
      p.y+=v**4*section*(.024*bundle+.015*Math.cos(21*u));
      const c=root.clone().lerp(mid,.28+.4*v+.16*bundle*section+.16*fibre)
        .lerp(ends,v*v*(.31+.20*bundle*section));
      c.lerp(scalp,.56*rootLine);
      positions.push(...p.toArray());colors.push(...c.toArray());
      if(row<rows && col<columns) {
        const i=row*(columns+1)+col,b=i+columns+1;
        indices.push(i,b,i+1,i+1,b,b+1);
      }
    }
  }
  // Return the two exposed borders into the volume so neither the edge
  // along the temple nor the tips read as a razor-thin sheet in profile.
  function hem(border,scale,lift) {
    const start=positions.length/3;
    border.forEach((i,k)=>{
      positions.push(positions[i*3]*scale,positions[i*3+1]+lift,positions[i*3+2]*scale);
      colors.push(...root.toArray());
      if(k+1<border.length) indices.push(i,start+k,border[k+1],border[k+1],start+k,start+k+1);
    });
  }
  hem(Array.from({length:rows+1},(_,i)=>i*(columns+1)),.94,-.004);
  hem(Array.from({length:columns+1},(_,i)=>rows*(columns+1)+i),.91,.013);
  return surface(head,'Parted chestnut waves',positions,indices,colored(),colors);
}

function joinHairAtNape(left,right) {
  const a=left.geometry.attributes.normal, b=right.geometry.attributes.normal;
  // The triangles on the two banks wind oppositely at their shared boundary.
  const normal=new THREE.Vector3(), other=new THREE.Vector3();
  for(let row=0;row<=hairRows;row++) {
    const i=row*(hairColumns+1)+hairColumns;
    normal.fromBufferAttribute(a,i).sub(other.fromBufferAttribute(b,i)).normalize();
    a.setXYZ(i,normal.x,normal.y,normal.z);
    b.setXYZ(i,-normal.x,-normal.y,-normal.z);
  }
}

function addEar(head) {
  const base=new THREE.Color('#c39386'), light=new THREE.Color(skin);
  const ear=grid(16,36,(u,v)=>{
    const a=u*Math.PI*2,r=Math.sin(v*Math.PI/2),h=r*Math.cos(a);
    const rim=Math.exp(-(((r-.78)/.16)**2));
    const p=new THREE.Vector3(.281+.027*(1-r*r)+.025*rim+.014*h,
      -.065+.074*h,-.070+.047*Math.sin(a)*r-.015*h);
    return [p,base.clone().lerp(light,.28+.55*rim)];
  });
  surface(head,'Exposed ear',ear.positions,ear.indices,colored(),ear.colors);
}

export function createMarinPortrait() {
  const head=new THREE.Group();
  head.position.y=2.77;
  addPortraitFace(head,fittedFace(),palette);
  addEar(head);
  joinHairAtNape(addHairBank(head,outer),addHairBank(head,tucked));
  return head;
}
