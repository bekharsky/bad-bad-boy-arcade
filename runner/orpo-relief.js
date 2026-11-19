import * as THREE from 'three';

// Tessellate the fitted triangles before sculpting creases narrower than the
// landmark spacing. Preserve the material ranges and the moving lower lip.
export function refineOrpoFace(mesh) {
  const geometry=mesh.geometry;
  const read=attribute=>Array.from({length:attribute.count},(_,i)=>
    new THREE.Vector3().fromBufferAttribute(attribute,i));
  const vertices=read(geometry.attributes.position), tints=read(geometry.attributes.color);
  const jaw=read(geometry.morphAttributes.position[0]), normals=read(geometry.attributes.normal);
  let triangles=Array.from(geometry.index.array);
  for(let level=0;level<2;level++) {
    const midpoints=new Map(), refined=[];
    function midpoint(i,j) {
      const key=Math.min(i,j)*65536+Math.max(i,j);
      if(!midpoints.has(key)) {
        midpoints.set(key,vertices.length);
        for(const channel of [vertices,tints,jaw,normals]) channel.push(channel[i].clone().lerp(channel[j],.5));
      }
      return midpoints.get(key);
    }
    for(let i=0;i<triangles.length;i+=3) {
      const [a,b,c]=triangles.slice(i,i+3);
      const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
      refined.push(a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca);
    }
    triangles=refined;
  }
  function relief(px,y) {
    const x=Math.abs(px);
    const bell=(center,width)=>Math.exp(-(((x-center)/width)**2));
    const band=(center,width)=>Math.exp(-(((y-center)/width)**2));
    const foldX=.090+.43*Math.max(0,-y-.117);
    const smile=bell(foldX,.019)*band(-.198,.081);
    const cheek=bell(foldX+.034,.039)*band(-.17,.104);
    const orbitalY=.002+.023*((x-.144)/.086)**2;
    const underEye=bell(.15,.092)*band(orbitalY,.009);
    const eyelid=bell(.15,.088)*band(orbitalY+.009,.016);
    const furrow=bell(.027,.009)*band(.144,.046);
    const chin=bell(.038,.086)*band(-.311+.09*x,.015);
    const shape=.018*cheek-.0065*smile-.006*underEye+.009*eyelid-.006*furrow-.008*chin;
    const shadow=.11*smile+.15*underEye+.095*furrow+.075*chin;
    return {shape,shadow,beard:band(-.348,.107)*Math.max(0,1-cheek)};
  }
  vertices.forEach((p,i)=>{
    const {shape,shadow,beard}=relief(p.x,p.y);
    // A depth offset f(x,y) transforms the smooth original normal by the
    // inverse transpose. Recomputing flat triangle normals loses the cheek arc.
    const dx=(relief(p.x+.001,p.y).shape-relief(p.x-.001,p.y).shape)/.002;
    const dy=(relief(p.x,p.y+.001).shape-relief(p.x,p.y-.001).shape)/.002;
    const n=normals[i];
    n.set(n.x-dx*n.z,n.y-dy*n.z,n.z).normalize();
    p.z+=shape;
    jaw[i].z+=shape;
    tints[i].multiplyScalar(1-shadow);
    tints[i].y*=1-.032*beard;
    tints[i].x*=1-.062*beard;
  });
  const attribute=data=>new THREE.Float32BufferAttribute(data.flatMap(v=>v.toArray()),3);
  geometry.setIndex(triangles);
  geometry.setAttribute('position',attribute(vertices));
  geometry.setAttribute('color',attribute(tints));
  geometry.morphAttributes.position=[attribute(jaw)];
  for(const group of geometry.groups) {group.start*=16;group.count*=16;}
  geometry.setAttribute('normal',attribute(normals));
}
