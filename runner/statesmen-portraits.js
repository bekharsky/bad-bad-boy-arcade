import * as THREE from 'three';
import { CAMEO_FACE_DATA } from './cameo-face-data.js';
import { addPortraitFace, colored, grid, material, surface } from './portrait-face.js';
import { addLePenHair } from './lepen-hair.js';
import { refineFaceRelief } from './orpo-relief.js';

const smooth=THREE.MathUtils.smoothstep, lerp=THREE.MathUtils.lerp, tau=Math.PI*2;
const palette=(skin,base,rose,shade,brow,upperLip,lowerLip,iris)=>({
  skin,base,rose,shade,brow,upperLip,lowerLip,iris,browTaper:true,irisScale:1.08,
});
const styles={
  lepen:{
    palette:{...palette('#e6bca1','#e9c3aa','#d39b8c','#b69a90','#806955','#a87571','#c58b81','#758591'),backDepth:.27},
    width:.98, age:.81,
  },
  stubb:{
    palette:palette('#e6b79c','#e7bca3','#ca9788','#bb9789','#756452','#9d635f','#ba8277','#607c89'),
    hair:['#595144','#b5a991'], crown:.149, sweep:.051, depth:.37, width:1.04, age:.58,
  },
  macron:{
    palette:palette('#e3b69f','#e5baa1','#c99280','#ba9689','#58463d','#a06962','#ba8278','#617f8b'),
    hair:['#3d3634','#796251'], crown:.16, sweep:.045, depth:.359, width:.91, age:.46,
  },
  merz:{
    palette:palette('#e6bdab','#e5bcaa','#d59a8e','#bb9890','#87776b','#986963','#ba827a','#60818c'),
    hair:['#8f877f','#d2c6b6'], crown:.154, sweep:0, depth:.36, width:.94, age:1.04,
  },
};

function fittedPoints(kind, style) {
  const source=CAMEO_FACE_DATA[kind];
  const eyeY=(source[33][1]+source[263][1])/2-2.77;
  const eyeX=Math.abs(source[33][0]-source[133][0])*.5+Math.abs(source[133][0]);
  const mouthY=source[13][1]-2.77;
  return source.slice(0,468).map(([x,y,z])=>{
    y-=2.77;
    // Remove the small residual camera roll in the front landmarks.
    const mid=lerp(source[10][0],source[152][0],smooth(-y,-.385,.47));
    x=(x-mid)*style.width;
    const g=(cx,cy,w,h)=>Math.exp(-(((Math.abs(x)-cx)/w)**2+((y-cy)/h)**2));
    const brow=g(eyeX,eyeY+.110,.122,.056);
    const cheek=g(.193,-.095,.093,.106);
    const top=smooth(y,.19,.385);
    const drop=kind==='macron'?.046+.023*Math.cos(18*x+.8):kind==='stubb'?.032+.019*Math.sin(12*x):0;
    y-=drop*top;
    const gap=source[13][1]-source[14][1];
    if(gap>.027) {
      const closure=kind==='stubb'?.40:.16;
      y+=gap*closure*smooth(mouthY-y,0,gap)*g(.015,mouthY-.041,.154,.118);
    }
    const lip=g(.045,mouthY,.132,.065);
    switch(kind) {
      case 'lepen': return new THREE.Vector3(x*(1+.035*smooth(-y,.16,.40)),
        y-.033*brow+.016*g(.13,mouthY,.053,.042),z+.028*cheek-.053*smooth(y,.26,.385));
      case 'stubb': return new THREE.Vector3(x*(1+.10*lip), y-.021*brow+.009*cheek, z+.032*cheek+.017*g(.035,-.385,.10,.08));
      case 'macron': return new THREE.Vector3(x*(1-.05*smooth(-y,.20,.46)),y-.020*brow+.012*g(.131,-.22,.050,.047),
        z*.94+.021*cheek+.018*g(.04,-.37,.115,.056));
      case 'merz': return new THREE.Vector3(x*(1-.055*smooth(-y,.20,.44)),y-.026*brow,
        z+.023*g(.012,-.084,.036,.085)+.021*cheek);
    }
  });
}

// The scalp starts at the same vertices as the face and closes at the occiput.
// Carry its silhouette, hairline and the direction of the comb through the turn.
function scalp(head,oval,kind,style) {
  const skin=new THREE.Color(style.palette.base), shadow=new THREE.Color(style.hair[0]);
  const highlight=new THREE.Color(style.hair[1]);
  const bald=kind==='merz';
  const borderCurve=new THREE.CatmullRomCurve3(oval,true);
  const cap=grid(32,oval.length*4,(u,v)=>{
    const f=u*oval.length,i=Math.floor(f)%oval.length;
    const edge=oval[i].clone().lerp(oval[(i+1)%oval.length],f-Math.floor(f));
    edge.lerp(borderCurve.getPoint(u),smooth(v,0,.16));
    const a=v*Math.PI/2, c=Math.cos(a), s=Math.sin(a), bow=Math.sin(a*2);
    const upper=smooth(Math.cos(tau*u),-.16,.98), temple=smooth(Math.abs(edge.x),.12,.28);
    const side=Math.sin(u*tau);
    const poleFade=1-smooth(v,.70,1);
    const flow=(kind==='macron'? 2.8 : 4.7)*v;
    const strand=28*u+flow*v+.6*Math.sin(2*tau*u+4*v);
    const ridge=.5+.5*Math.cos(tau*strand)*poleFade;
    const lock=Math.sin(2*tau*u+13*v+2*Math.sin(2*tau*u))*poleFade;
    const wave=kind==='macron'?Math.sin(5*tau*u+11*v)*Math.sin(18*v-2*tau*u):0;
    const quiff=style.sweep*upper*upper*Math.sin(Math.PI*Math.min(1,v*1.7))*(1-.38*side);
    const fringe=upper**2*Math.sin(Math.PI*Math.min(1,v/.43))*(kind==='stubb'?.028:0);
    const x=edge.x*c**.79+side*.032*bow-style.sweep*.87*bow*upper-fringe*.54;
    const y=edge.y*c**.78+.040*s+style.crown*bow*upper+quiff*.36;
    const z=edge.z*c*c-style.depth*s+quiff+fringe;
    const back=smooth(-z,.13,.34);
    const nape=lerp(-.012,-.25,back)-.047*temple*Math.exp(-((z+.10)**2)/.003);
    let cover=smooth(y,nape-.013,nape+.013);
    if(bald) {
      // Two receding temples and a sparse crown, with a fuller fringe behind.
      const temples=smooth(Math.abs(x),.17,.285);
      const rear=smooth(-z,.11,.34), crown=smooth(y,.19,.49);
      cover*=smooth(v,0,.12)*THREE.MathUtils.clamp((temples*.96+rear*.90+(.075+.13*ridge)*crown)
        *smooth(-z,-.067,.062),0,1);
    }
    // At the back the locks descend to the nape instead of converging on
    // the polar vertex of the scalp grid.
    const lay=lerp(ridge,.5+.5*Math.sin(x*174+.8*Math.sin(21*y+8*x)+7*y),back);
    const relief=cover*(.0033*lay+.0095*wave+.012*lock*upper)*(1-.8*back)*bow;
    const tint=skin.clone().lerp(shadow.clone().lerp(highlight,.21+.17*lay+.14*temple+.15*upper+.065*lock),cover);
    return [new THREE.Vector3(x+side*relief,y+upper*relief,z-back*relief),tint];
  });
  const shell=surface(head,'Continuous scalp and hair',cap.positions,cap.indices,colored(),cap.colors);
  const normals=shell.geometry.attributes.normal;
  const face=head.getObjectByName('Continuous face and lips').geometry;
  const faceNormals=face.attributes.normal, vertex=face.attributes.position;
  const border=oval.map(p=>{
    for(let i=0;i<vertex.count;i++) if(Math.abs(vertex.getX(i)-p.x)+Math.abs(vertex.getY(i)-p.y)<1e-6)
      return new THREE.Vector3().fromBufferAttribute(faceNormals,i);
  });
  const columns=oval.length*4;
  for(let col=0;col<=columns;col++){
    const k=Math.floor(col/4)%oval.length;
    const edgeNormal=border[k].clone().lerp(border[(k+1)%oval.length],(col%4)/4).normalize().negate();
    for(let row=0;row<7;row++) {
      const idx=row*(columns+1)+col;
      const n=new THREE.Vector3().fromBufferAttribute(normals,idx).lerp(edgeNormal,1-smooth(row,0,bald?7:2)).normalize();
      normals.setXYZ(idx,n.x,n.y,n.z);
    }
  }
}

function ears(head,points,kind,style) {
  const light=new THREE.Color(style.palette.skin), dark=new THREE.Color(style.palette.rose);
  for(const side of [-1,1]) {
    const edge=points[side<0?234:454], large=kind==='merz'?1.18:1;
    const ear=grid(10,28,(u,v)=>{
      const a=tau*u,r=Math.sin(v*Math.PI/2),h=Math.cos(a)*r;
      const ridge=Math.exp(-(((r-.78)/.16)**2));
      return [new THREE.Vector3(edge.x+side*(-.025+.070*(1-r*r)+.029*ridge+.012*h),
        edge.y+.087*large*h,edge.z+.037+.044*Math.sin(a)*r-.020*h),
        dark.clone().lerp(light,.27+.65*ridge)];
    });
    surface(head,'Ear',ear.positions,ear.indices,colored(),ear.colors);
  }
}

function frames(head,points,kind) {
  const aviator=kind==='macron';
  const dark=material(aviator?'#807464':kind==='merz'?'#25303b':'#473c34');
  if(aviator) {dark.metalness=.50;dark.roughness=.32;}
  const glass=aviator?new THREE.MeshStandardMaterial({
    vertexColors:true, roughness:.23, metalness:.20, side:THREE.DoubleSide
  }):null;
  function rod(pts,r,closed=false) {
    const path=new THREE.CatmullRomCurve3(pts,closed);
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(path,closed?64:20,r,8,closed),dark);
    mesh.name='Spectacle frame'; head.add(mesh);
  }
  const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
  const inner=[], upperBridge=[];
  for(const side of [-1,1]){
    const [a,b]=side<0?[33,133]:[263,362],eye=points[a].clone().lerp(points[b],.50);
    const wide=aviator?.131:kind==='merz'?.106:.118;
    const high=aviator?.094:kind==='merz'?.070:.078;
    function lensPoint(phi,radius=1) {
      const h=Math.sin(phi),w=Math.cos(phi);
      const x=eye.x+(aviator?side*.008:0)+side*radius*wide*w*(1+(aviator?.16:.10)*h);
      const drop=aviator ? -.014*w*Math.max(0,-h) : 0;
      const y=eye.y-.018+radius*(high*Math.sign(h)*Math.abs(h)**(aviator?.63:.78)+drop);
      const wrap=aviator?.111:.082;
      const z=points[168].z+(aviator?.066:.084)-wrap*(Math.abs(x)/.27)**1.72+.010*h*radius;
      return vec(x,y,z+(aviator?.012*(1-radius*radius):0));
    }
    const rim=Array.from({length:40},(_,i)=>lensPoint(tau*i/40));
    if(aviator) {
      const sky=new THREE.Color('#526579'), shade=new THREE.Color('#14212e');
      const lens=grid(6,40,(u,r)=>{
        const phi=u*tau, p=lensPoint(phi,r);
        return [p,shade.clone().lerp(sky,smooth(Math.sin(phi)*r,.05,.87)*.85)];
      });
      surface(head,'Smoke-blue sunglass lens',lens.positions,lens.indices,glass,lens.colors);
      upperBridge.push(rim[15]);
    }
    rod(rim,aviator?.0047:kind==='merz'?.0082:.0057,true);
    inner.push(rim[17]);
    const ear=points[side<0?234:454];
    rod([rim[4],vec(ear.x*.94,eye.y+.024,.055),vec(ear.x+side*.023,ear.y+.069,ear.z+.047),vec(ear.x+side*.029,ear.y+.016,ear.z-.016)],.006);
  }
  if(aviator) rod(upperBridge,.0045);
  rod([inner[0],vec((inner[0].x+inner[1].x)*.5,(inner[0].y+inner[1].y)*.5+.012,points[168].z+(aviator?.061:.090)),inner[1]],.0065);
}

function smile(head,points,coverage) {
  const curve=ids=>new THREE.CatmullRomCurve3(ids.map(i=>points[i]));
  const top=curve([78,191,80,81,82,13,312,311,310,415,308]);
  const bottom=curve([78,95,88,178,87,14,317,402,318,324,308]);
  const enamel=new THREE.Color('#eee3d2'), seam=new THREE.Color('#b8a798');
  const teeth=grid(6,80,(u,v)=>{
    const t=lerp(.055,.945,u),p=top.getPoint(t).lerp(bottom.getPoint(t),.055+coverage*v);
    const fissure=Math.abs(Math.cos((u-.5)*Math.PI*8));
    p.y+=.0045*fissure**6*v*v;
    p.z+=.005+.004*Math.sin(v*Math.PI);
    return [p,enamel.clone().lerp(seam,fissure**36*.38+.13*v)];
  });
  surface(head,'Upper teeth within smile',teeth.positions,teeth.indices,colored(),teeth.colors);
}

export function createStatesmanPortrait(kind) {
  const style=styles[kind], points=fittedPoints(kind,style),head=new THREE.Group();
  head.position.y=2.77;
  const makeScalp=kind==='lepen'?undefined:(parent,oval)=>scalp(parent,oval,kind,style);
  addPortraitFace(head,points,style.palette,makeScalp);
  const mouth=points[61],yEye=(points[33].y+points[133].y)*.5;
  const relief=(x,y)=>{
    x=Math.abs(x);
    const g=(cx,cy,w,h)=>Math.exp(-(((x-cx)/w)**2+((y-cy)/h)**2));
    const foldX=Math.abs(mouth.x)-.056+.38*(-.13-y);
    const fold=g(foldX,-.174,.019,.081), lid=g(.14,yEye-.046+.28*(x-.14),.073,.011);
    const temple=g(.216,yEye-.014,.033,.018);
    const lineY=.208+.026*Math.cos(x*13);
    const forehead=g(.075,lineY,.13,.012)+.67*g(.085,lineY+.038,.13,.011);
    const age=style.age;
    const bag=g(.14,yEye-.036,.072,.022);
    const browFurrow=g(.028,yEye+.086,.010,.032);
    const chin=g(.054,mouth.y-.08,.087,.015);
    return {shape:age*(.015*g(foldX+.028,-.15,.047,.084)-.008*fold-.005*lid-.0014*forehead+.013*bag-.006*browFurrow-.007*chin),
      shadow:Math.min(.78,age*(.14*fold+.115*lid+.064*temple+.066*forehead+.07*browFurrow+.06*chin)),
      beard:.35*g(.11,-.34,.19,.10)};
  };
  refineFaceRelief(head.getObjectByName('Continuous face and lips'),relief);
  if(kind==='lepen') addLePenHair(head);
  else ears(head,points,kind,style);
  if(kind==='stubb'||kind==='merz'||kind==='macron') frames(head,points,kind);
  if(kind==='stubb'||kind==='merz') {
    smile(head,points,kind==='stubb'?.73:.62);
  }
  return head;
}
