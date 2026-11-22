import * as THREE from 'three';
import { CAMEO_FACE_DATA } from './cameo-face-data.js';
import { addPortraitFace, colored, grid, material, surface } from './portrait-face.js';
import { faceStudy, contourWeight } from './portrait-studies.js';
import { addCroppedLocks, addPortraitEars, addBeardFibres } from './cropped-portrait-hair.js';
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
  zelenskyy:{
    palette:{...palette('#bd9379','#cda285','#b78370','#896958','#544336','#7f5c4c','#987260','#372d24'),
      sculptedBrows:true,irisScale:1.50,lowerLid:'#9b7f6d',lashWidth:.0044,lash:'#604c3e'},
    hair:['#242022','#65534b'], crown:.147, sweep:.028, depth:.370, width:.91, age:.92,
  },
  kadyrov:{
    palette:{...palette('#d2a28b','#d6a58f','#c88d84','#ac8886','#937260','#9e7366','#b88779','#789093'),sculptedBrows:true,irisScale:1.40,lowerLid:'#ad8177',lashWidth:.0036,lash:'#87685c'},
    hair:['#3f302a','#8a6b56'], crown:.235, sweep:.010, depth:.405, width:.91, age:.83,
  },
  stubb:{
    palette:palette('#e6b79c','#e7bca3','#ca9788','#bb9789','#756452','#9d635f','#ba8277','#607c89'),
    hair:['#595144','#b5a991'], crown:.149, sweep:.051, depth:.37, width:1.04, age:.58,
  },
  trump:{
    palette:palette('#c88a5d','#c88559','#be7053','#d09c7a','#b07c4e','#995d52','#bf8270','#8195a1'),
    hair:['#974f2e','#e4a56b'], crown:.162, sweep:.077, depth:.382, width:1.04, age:1.12,
  },
  putin:{
    palette:palette('#e2b8a5','#dfb9aa','#c69689','#be9c94','#968174','#986c67','#b7867e','#77909b'),
    hair:['#8a8074','#bbb0a0'], crown:.134, sweep:0, depth:.346, width:.966, age:.96,
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
    const brow=g(eyeX,eyeY+.110,.122,.056), lid=g(eyeX,eyeY+.026,.094,.054);
    const cheek=g(.193,-.095,.093,.106);
    const top=smooth(y,.19,.385);
    const drop=kind==='kadyrov'?.047+.015*Math.sin(18*x):kind==='zelenskyy'?-.021+.013*Math.sin(12*x+.65):kind==='trump'?(.071+.035*Math.cos(12*x-1)):kind==='macron'?(.046+.023*Math.cos(18*x+.8)):kind==='stubb'?(.032+.019*Math.sin(12*x)) : 0;
    y-=drop*top;
    const gap=source[13][1]-source[14][1];
    if(gap>.027) {
      const closure=kind==='trump'?.87:kind==='stubb'?.40:.16;
      y+=gap*closure*smooth(mouthY-y,0,gap)*g(.015,mouthY-.041,.154,.118);
    }
    const lip=g(.045,mouthY,.132,.065);
    switch(kind) {
      case 'lepen': return new THREE.Vector3(x*(1+.035*smooth(-y,.16,.40)),
        y-.033*brow+.016*g(.13,mouthY,.053,.042),z+.028*cheek-.053*smooth(y,.26,.385));
      case 'zelenskyy': {
        const innerBrow=g(.081,eyeY+.090,.061,.058);
        const nose=g(.044,-.066,.077,.053);
        const browSlope=g(.155,eyeY+.084,.142,.055);
        const jaw=smooth(-y,.13,.36)*(1-smooth(-y,.36,.49));
        const aperture=g(.15,eyeY+.008,.102,.041);
        return new THREE.Vector3(x*(.976+.19*nose+.060*jaw+.13*lip),
          y-.019*browSlope-.010*innerBrow-.013*nose+.012*lip+.37*(y-eyeY)*aperture,
          z+.025*cheek+.028*innerBrow-.008*lid+.041*nose+.016*lip);
      }
      case 'kadyrov': {
        const length=smooth(-y,.224,.477);
        const goatee=length*(.28+.72*smooth(z,-.047,.18));
        const lowerLid=g(.151,eyeY-.025,.095,.033);
        return new THREE.Vector3(x*(1+.12*cheek-.25*goatee+.15*g(.058,-.082,.073,.058)),
          y-.014*brow-.012*lowerLid-.226*goatee+.17*(mouthY-y)*lip,
          z+.023*lowerLid+.051*g(.21,-.054,.159,.137)+.099*goatee-.031*g(.012,-.06,.056,.088));
      }
      case 'stubb': return new THREE.Vector3(x*(1+.10*lip), y-.021*brow+.009*cheek, z+.032*cheek+.017*g(.035,-.385,.10,.08));
      case 'trump': return new THREE.Vector3(x*(1+.082*smooth(-y,.12,.33)-.22*lip),
        y-.032*brow-.13*(y-eyeY)*lid-.009*g(.11,mouthY,.045,.055)+.28*(mouthY-y)*lip,
        z+.032*cheek+.031*lip+.023*g(.19,-.286,.085,.10));
      case 'putin': {
        const fullCheek=g(.218,-.122,.168,.171);
        const jowl=g(.227,-.248,.151,.140);
        return new THREE.Vector3(
          x*(1+.11*fullCheek+.093*jowl),
          y-.016*jowl-.030*brow-.19*(y-eyeY)*lid-.22*(y-mouthY)*lip,
          z+.066*fullCheek+.034*jowl+.024*g(eyeX,eyeY-.040,.093,.047)
            +.019*g(.07,-.395,.124,.07)+.010*g(.018,-.111,.032,.061)
        );
      }
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
  const bald=kind==='putin'||kind==='merz';
  const cropped=kind==='zelenskyy'||kind==='kadyrov';
  const sideburn=new THREE.Color(kind==='kadyrov'?'#79583f':'#62534a');
  const mouthY=head.getObjectByName('Continuous face and lips').geometry.attributes.position.getY(13);
  const borderCurve=new THREE.CatmullRomCurve3(oval,true);
  const cap=grid(32,oval.length*4,(u,v)=>{
    const f=u*oval.length,i=Math.floor(f)%oval.length;
    const edge=oval[i].clone().lerp(oval[(i+1)%oval.length],f-Math.floor(f));
    edge.lerp(borderCurve.getPoint(u),smooth(v,0,.16));
    const a=v*Math.PI/2, c=Math.cos(a), s=Math.sin(a), bow=Math.sin(a*2);
    const upper=smooth(Math.cos(tau*u),-.16,.98), temple=smooth(Math.abs(edge.x),.12,.28);
    const side=Math.sin(u*tau);
    const poleFade=1-smooth(v,.70,1);
    const flow=(kind==='trump'? 6.4 : kind==='macron'? 2.8 : 4.7)*v;
    const strand=kind==='trump' ? 16*v+1.9*Math.sin(u*tau+.6)+1.5*u : 28*u+flow*v+.6*Math.sin(2*tau*u+4*v);
    const ridge=.5+.5*Math.cos(tau*strand)*poleFade;
    const lock=Math.sin(2*tau*u+13*v+2*Math.sin(2*tau*u))*poleFade;
    const wave=kind==='macron'?Math.sin(5*tau*u+11*v)*Math.sin(18*v-2*tau*u):0;
    const quiff=style.sweep*upper*upper*Math.sin(Math.PI*Math.min(1,v*1.7))*(1-.38*side);
    const fringe=upper**2*Math.sin(Math.PI*Math.min(1,v/.43))*(kind==='trump'?.057:kind==='stubb'?.028:.0);
    const x=edge.x*c**.79+side*.032*bow-style.sweep*.87*bow*upper-fringe*.54;
    const forelock=kind==='zelenskyy'?Math.exp(-(((edge.x+.093)/.18)**2))*upper*bow:0;
    const dome=cropped?.050*upper*bow*Math.exp(-((edge.x/.19)**2)):0;
    const y=edge.y*c**.78+.040*s+style.crown*bow*upper+quiff*.36+.038*forelock+dome;
    const z=edge.z*c*c-style.depth*s+quiff+fringe+.031*forelock;
    const back=smooth(-z,.13,.34);
    const nape=lerp(-.012,-.25,back)-.047*temple*Math.exp(-((z+.10)**2)/.003);
    let cover=smooth(y,nape-.013,nape+.013);
    if(bald) {
      // Two receding temples and a sparse crown, with a fuller fringe behind.
      const temples=smooth(Math.abs(x),kind==='merz'?.17:.208,kind==='merz'?.285:.31);
      const rear=smooth(-z,.11,.34), crown=smooth(y,.19,.49);
      cover*=smooth(v,0,.12)*THREE.MathUtils.clamp((temples*.96+rear*.90+(.075+.13*ridge)*crown)
        *smooth(-z,-.067,.062),0,1);
    }
    // At the back the locks descend to the nape instead of converging on
    // the polar vertex of the scalp grid.
    const comb=kind==='zelenskyy'
      ? 22*x-14*v+2.1*Math.sin(9*x-4*v)
      : 38*x-9*v+1.2*Math.sin(10*x+6*v);
    const grain=.5+.5*Math.cos(tau*comb+1.4*Math.sin(27*x+13*v))*Math.cos(6*v-11*x);
    const lay=lerp(cropped?grain:ridge,.5+.5*Math.sin(x*174+.8*Math.sin(21*y+8*x)+7*y),back);
    const relief=cover*((cropped?.008:.0033)*lay+.0095*wave+.012*lock*upper)*(1-.8*back)*bow;
    const complexion=skin.clone();
    if(cropped) {
      const coverage=beardCoverage(Math.abs(x),y,mouthY,kind)* (1-smooth(v,.02,.40));
      complexion.lerp(sideburn,coverage*.82);
    }
    if(cropped){
      const templeFade=smooth(Math.abs(x),.20,.32)*(1-smooth(y,-.012,.23));
      cover*=1-(kind==='zelenskyy'?.69:.20)*templeFade;
    }
    const tint=complexion.lerp(shadow.clone().lerp(highlight,(cropped?.12:.21)+(cropped?.24:.17)*lay+.14*temple+.15*upper+.065*lock),cover);
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

function beardCoverage(x,y,mouthY,kind) {
  const long=kind==='kadyrov';
  const cheekLine=long?mouthY-.027+.250*smooth(x,.085,.38)
    :mouthY-.101+.259*smooth(x,.103,.384);
  return 1-smooth(y,cheekLine-(long?.018:.042),cheekLine+(long?.017:.049));
}

// Shade and raise the short beard directly on the moving face surface.
function sculptBeard(mesh,points,kind) {
  const long=kind==='kadyrov';
  const geometry=mesh.geometry, p=geometry.attributes.position, color=geometry.attributes.color;
  const jaw=geometry.morphAttributes.position[0],normal=geometry.attributes.normal;
  const coverage=new Float32Array(p.count);
  const study=faceStudy(kind), browTint=new THREE.Color(long?'#896d56':'#4a392e');
  const mouthY=points[13].y, halfMouth=Math.abs(points[291].x-points[61].x)/2;
  const dark=new THREE.Color(long?'#645044':'#322c29'), grey=new THREE.Color(long?'#ab875d':'#ada198');
  const tint=new THREE.Color(),original=new THREE.Color();
  for(let i=0;i<p.count;i++) {
    const x=Math.abs(p.getX(i)),y=p.getY(i),z=p.getZ(i);
    const beard=beardCoverage(x,y,mouthY,kind);
    if(long && y>-.21 && y<.18) {
      const flush=Math.exp(-(((x-.22)/.126)**2+((y+.031)/.129)**2));
      original.fromBufferAttribute(color,i);
      color.setXYZ(i,original.r*(1+.085*flush),original.g*(1-.21*flush),original.b*(1-.16*flush));
    }
    if(y>.11 && y<.23) {
      const brow=contourWeight(study.brow,x,y,long?.011:.008);
      original.fromBufferAttribute(color,i).lerp(browTint,brow*(long?.48:.83));
      color.setXYZ(i,original.r,original.g,original.b);
    }
    const moustache=y<-.078 && y>-.28
      ? contourWeight(study.moustache,p.getX(i),y,long?.029:.010)*(long?.42:.91) : 0;
    const lipClear=smooth(Math.abs(y-mouthY)+.33*Math.max(0,x-halfMouth*.83),.026,.052);
    const corner=.64*Math.exp(-(((x-halfMouth*.94)/.024)**2+((y-mouthY+.024)/.056)**2));
    const patch=(long?.35:.72)*Math.exp(-((x/.049)**2+((y-mouthY+.067)/.025)**2));
    const sideFade=long?.95-.60*smooth(y,mouthY-.073,mouthY+.15):.98-.60*smooth(x,.13,.27)*smooth(y,mouthY-.13,mouthY+.10);
    const chinHollow=long?0:.83*Math.exp(-(((x-.067)/.057)**2+((y-mouthY+.105)/.047)**2));
    const density=Math.max(beard*lipClear*sideFade*(1-chinHollow),moustache,corner,patch);
    coverage[i]=density;
    if(density===0) continue;
    const fleck=.5+.5*Math.sin(x*563+y*257)*Math.cos(z*327-y*417);
    const locks=.5+.5*Math.cos(x*211+12*y+2.5*Math.sin(35*x+9*y)+1.7*Math.sin(y*46+21*x));
    const chin=smooth(-y,.26,.63);
    tint.copy(dark).lerp(grey,long?.09+.37*chin+.20*locks+.15*fleck:.016+.12*fleck+.035*chin);
    original.fromBufferAttribute(color,i).lerp(tint,density**(long?.64:.85)*(.93+.07*fleck));
    color.setXYZ(i,original.r,original.g,original.b);
    const rise=(long?.007+.011*locks*chin:.004+.003*fleck)*density*smooth(z,-.09,.075);
    for(const attr of [p,jaw]) attr.setXYZ(i,attr.getX(i)+rise*normal.getX(i),
      attr.getY(i)+rise*normal.getY(i),attr.getZ(i)+rise*normal.getZ(i));
  }
  return coverage;
}

export function createStatesmanPortrait(kind) {
  const style=styles[kind], points=fittedPoints(kind,style),head=new THREE.Group();
  head.position.y=kind==='zelenskyy'?2.714:2.77;
  if(kind==='kadyrov') head.scale.set(.94,1,.96);
  const makeScalp=kind==='lepen'?undefined:(parent,oval)=>scalp(parent,oval,kind,style);
  addPortraitFace(head,points,style.palette,makeScalp);
  const mouth=points[61],yEye=(points[33].y+points[133].y)*.5;
  const study=faceStudy(kind);
  const relief=(x,y)=>{
    const localRelief=study?study.height(x,y):0;
    x=Math.abs(x);
    const g=(cx,cy,w,h)=>Math.exp(-(((x-cx)/w)**2+((y-cy)/h)**2));
    const foldX=Math.abs(mouth.x)-.056+.38*(-.13-y);
    const fold=g(foldX,-.174,.019,.081), lid=g(.14,yEye-.046+.28*(x-.14),.073,.011);
    const temple=g(.216,yEye-.014,.033,.018);
    const lineY=.208+.026*Math.cos(x*13);
    const forehead=g(.075,lineY,.13,.012)+.67*g(.085,lineY+.038,.13,.011);
    const age=style.age;
    const tearTrough=study?g(.138,yEye-.046-.25*(x-.138),.092,.027):0;
    const noseWall=study?g(.053+.15*(yEye-y),.023,.031,.103):0;
    const nostril=kind==='zelenskyy'||kind==='kadyrov' ? g(Math.abs(points[75].x),points[75].y,.021,.010) : 0;
    const bag=g(.14,yEye-.036,.072,.022);
    const browFurrow=g(.028,yEye+.086,.010,.032);
    const socket=kind==='zelenskyy'?g(.154,yEye+.040,.095,.036):0;
    const eyeCorner=kind==='zelenskyy'?g(.082,yEye-.004,.030,.027):0;
    const chin=g(.054,mouth.y-.08,.087,.015);
    const knit=kind==='zelenskyy'?g(.030,yEye+.092,.010,.048):0;
    const eyeFold=kind==='zelenskyy'?g(.153,yEye-.042+.13*(x-.15),.081,.014):0;
    return {shape:localRelief-.006*tearTrough-.007*noseWall+age*(.015*g(foldX+.028,-.15,.047,.084)-.008*fold-.005*lid-.0014*forehead+.013*bag-.006*browFurrow-.007*chin-.009*knit-.007*eyeFold-.014*nostril-.012*socket),
      shadow:Math.min(.78,Math.max(0,-localRelief)*10+.17*tearTrough+.14*noseWall+age*(.14*fold+.115*lid+.064*temple+.066*forehead+.07*browFurrow+.06*chin+.20*knit+.14*eyeFold+.54*nostril+.39*socket+.19*eyeCorner)),
      beard:.35*g(.11,-.34,.19,.10)};
  };
  refineFaceRelief(head.getObjectByName('Continuous face and lips'),relief);
  if(study) {
    for(const mesh of head.children) {
      if (!['Eye between fitted lids','Lower lid','Upper eyelid'].includes(mesh.name)) continue;
      const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++) p.setZ(i,p.getZ(i)+relief(p.getX(i),p.getY(i)).shape);
      mesh.geometry.computeVertexNormals();
    }
  }
  if(study) addCroppedLocks(head,kind);
  if(kind==='lepen') addLePenHair(head);
  else if(study) addPortraitEars(head,points,style.palette.skin);
  else ears(head,points,kind,style);
  if(study) {
    const face=head.getObjectByName('Continuous face and lips');
    const coverage=sculptBeard(face,points,kind);
    addBeardFibres(head,face,coverage,kind==='kadyrov');
  }
  if(kind==='stubb'||kind==='merz'||kind==='macron') frames(head,points,kind);
  if(kind==='stubb'||kind==='merz') {
    smile(head,points,kind==='stubb'?.73:.62);
  }
  return head;
}
