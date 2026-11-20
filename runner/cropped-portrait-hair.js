import * as THREE from 'three';
import { colored, grid, surface } from './portrait-face.js';

const smooth=THREE.MathUtils.smoothstep, lerp=THREE.MathUtils.lerp;

// Extend the front of the fitted scalp down to the hairline. The edge of the
// short fringe breaks into points, while the swept forelock curves to one side.
export function addCroppedLocks(head,kind) {
  const scalp=head.getObjectByName('Continuous scalp and hair').geometry;
  const source=scalp.attributes.position, sourceTint=scalp.attributes.color;
  const columns=144, rows=source.count/(columns+1)-1;
  const swept=kind==='zelenskyy';
  function sample(attribute,u,v) {
    const x=((u%1+1)%1)*columns, y=Math.max(0,v)*rows;
    const i=Math.floor(y)*(columns+1)+Math.floor(x), j=i+columns+1;
    const read=index=>new THREE.Vector3().fromBufferAttribute(attribute,index);
    return read(i).lerp(read(i+1),x%1).lerp(read(j).lerp(read(j+1),x%1),y%1);
  }
  const front=grid(32,196,(u,v)=>{
    const a=(u-.5)*(swept?.36:.46);
    const taper=Math.sin(Math.PI*u)**.65;
    const grain=(swept?26:49)*u+(swept?2.6:-.75)*v+.55*Math.sin(19*u+3*v)+.24*Math.sin(53*u-7*v);
    const blade=(.5+.5*Math.cos(Math.PI*2*grain))**2;
    const tip=taper*(swept?.028:.057)*(.32+.53*blade+.17*Math.sin(74*u));
    const t=lerp(-tip,.36,v);
    const point=sample(source,a,t);
    const tint=sample(sourceTint,a,t);
    const root=smooth(t,.14,.36);
    const relief=(1-root)*taper*(.004+.0045*blade);
    point.y+=Math.min(0,t)*.58+relief;
    point.z+=relief-Math.min(0,t)*.066;
    point.x+=Math.sin(a*2*Math.PI)*relief;
    const variation=1+(1-root)*(.18*blade-.09);
    return [point,new THREE.Color(tint.x*variation,tint.y*variation,tint.z*variation)];
  });
  surface(head,swept?'Side swept forelock':'Short forward fringe',front.positions,front.indices,colored(),front.colors);
}

export function addPortraitEars(head,points,skin) {
  const base=new THREE.Color(skin), inside=new THREE.Color('#ab7461');
  for(const side of [-1,1]) {
    const cheek=points[side<0?234:454];
    const ear=grid(36,64,(u,t)=>{
      const v=Math.sin(Math.PI*t), outside=Math.cos(Math.PI*t);
      const a=u*2*Math.PI, y=Math.cos(a)*v, across=Math.sin(a)*v;
      const rim=Math.exp(-(((v-.80)/.14)**2));
      const fold=Math.exp(-(((v-.46)/.13)**2))*(.55+.45*Math.cos(a+.6));
      const shell=.020*outside+(outside>0?.015*rim+.009*fold:-.010);
      const spread=.062*(1+.23*y)*across;
      const p=new THREE.Vector3(cheek.x+side*(.012+.029*y-.49*spread+shell),
        cheek.y-.018+.112*y,cheek.z+.061+.82*spread-.035*y+.52*shell);
      return [p,inside.clone().lerp(base,outside>0?.42+.48*rim+.18*fold+.10*v:.89)];
    });
    surface(head,'Outer ear and concha',ear.positions,ear.indices,colored(),ear.colors);
  }
}

// Distribute the fibres by triangle area, including the profile and underside.
// Each fibre inherits its root's jaw motion so the stubble stays on the skin.
export function addBeardFibres(head,face,coverage,long) {
  const geometry=face.geometry, indices=geometry.index.array;
  const p=geometry.attributes.position, normal=geometry.attributes.normal;
  const jaw=geometry.morphAttributes.position[0];
  const xyz=[], shades=[], moved=[], faces=[];
  let seed=39271;
  const random=()=>{ seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  const read=(a,i)=>new THREE.Vector3().fromBufferAttribute(a,i);
  const brown=new THREE.Color(long?'#614838':'#403833'), grey=new THREE.Color(long?'#ccab83':'#9d948a');
  for(let i=0;i<geometry.groups[0].count;i+=3) {
    const a=indices[i], b=indices[i+1], c=indices[i+2];
    if(Math.max(coverage[a],coverage[b],coverage[c])<.24) continue;
    const base=read(p,a), ab=read(p,b).sub(base), ac=read(p,c).sub(base);
    const area=ab.clone().cross(ac).length()*.5;
    const count=Math.floor(area*(long?2450:4300)+random());
    for(let j=0;j<count;j++) {
      const r=Math.sqrt(random()), v=random()*r, u=r-v;
      if(random()>(1-r)*coverage[a]+u*coverage[b]+v*coverage[c]) continue;
      const root=base.clone().addScaledVector(ab,u).addScaledVector(ac,v);
      const n=read(normal,a).multiplyScalar(1-r).addScaledVector(read(normal,b),u).addScaledVector(read(normal,c),v).normalize();
      const delta=read(jaw,a).multiplyScalar(1-r).addScaledVector(read(jaw,b),u).addScaledVector(read(jaw,c),v).sub(root);
      const curl=random()-.5, chin=smooth(-root.y,.23,.56);
      const axis=new THREE.Vector3(-root.x*.8+curl*.65,-1,.12);
      axis.addScaledVector(n,-n.dot(axis)).normalize();
      const width=long?.0019+.0021*random():.001+.0011*random();
      const span=long?(.009+.040*chin)*(.6+.95*random()):.005+.009*random();
      const across=axis.clone().cross(n).normalize().multiplyScalar(width);
      const tone=(long?.15+.21*chin:.075)+random()*(long?.30:.33);
      const tint=brown.clone().lerp(grey,tone);
      const index=xyz.length/3;
      for(let k=0;k<=3;k++) {
        const t=k/3, mid=root.clone().addScaledVector(axis,t*span)
          .addScaledVector(across,2*curl*Math.sin(t*Math.PI))
          .addScaledVector(n,.0014+span*(long?.14:.10)*Math.sin(t*Math.PI*.8));
        for(const side of [-1,1]) {
          const pt=mid.clone().addScaledVector(across,side*(1-.95*t));
          xyz.push(pt.x,pt.y,pt.z); pt.add(delta); moved.push(pt.x,pt.y,pt.z);
          const light=.82+.18*t; shades.push(tint.r*light,tint.g*light,tint.b*light);
        }
        if(k<3){const id=index+k*2; faces.push(id,id+2,id+1,id+1,id+2,id+3);}
      }
    }
  }
  const beard=surface(head,long?'Long beard fibres':'Short beard stubble',xyz,faces,colored(),shades);
  beard.geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(moved,3)];
  beard.updateMorphTargets();
}
