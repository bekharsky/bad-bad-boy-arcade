import * as THREE from 'three';

const conditions = {
  clear: { horizon: '#d7dbcc', sky: '#5893ad', cloud: '#fff0d4', sun: '#ffe3b8', fill: '#c4e0ea', bounce: '#b58a76', direct: 2.7, ambient: 1.85, shadow: .83, near: 44, far: 134 },
  rain: { horizon: '#99b0b7', sky: '#40586d', cloud: '#738793', sun: '#d1e2f4', fill: '#ccdfec', bounce: '#967e79', direct: 1.05, ambient: 2.15, shadow: .45, near: 30, far: 100 },
  snow: { horizon: '#d4dfe2', sky: '#899bb8', cloud: '#eef0ec', sun: '#ffead7', fill: '#dae5ff', bounce: '#c8c8c2', direct: 1.45, ambient: 2.05, shadow: .55, near: 26, far: 104 },
};

export function chooseWeather(roll) {
  return roll < .55 ? 'clear' : roll < .82 ? 'rain' : 'snow';
}

function createSky() {
  const uniforms = { horizon: { value: new THREE.Color() }, sky: { value: new THREE.Color() }, cloud: { value: new THREE.Color() } };
  const material = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = position;
        vec3 p = mat3(viewMatrix) * position;
        gl_Position = projectionMatrix * vec4(p, 1.);
      }`,
    fragmentShader: `
      varying vec3 direction;
      uniform vec3 horizon, sky, cloud;
      void main() {
        vec3 d = normalize(direction);
        vec3 colour = mix(horizon, sky, smoothstep(-.04, .32, d.y));
        // Long broken banks of cloud, like overlapping washes on a poster.
        float crest = .083 + .017*sin(11.*d.x + 2.*d.z) + .010*cos(26.*d.x - 6.*d.z);
        float bank = smoothstep(crest-.018, crest-.003, d.y) * (1.-smoothstep(crest, crest+.008, d.y));
        bank *= smoothstep(-.3, .65, sin(8.*d.x+3.*d.z));
        float high = .205 + .014*sin(9.*d.x);
        float wisp = (1.-smoothstep(.003, .011, abs(d.y-high))) * smoothstep(.1,.8,cos(10.*d.x));
        gl_FragColor = vec4(mix(colour, cloud, .50*bank+.30*wisp), 1.);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), material);
  dome.name = 'Baltic sky'; dome.frustumCulled = false; dome.renderOrder = -1000;
  return dome;
}

function createPrecipitation(count) {
  const seeds = new Float32Array(count * 4);
  // Local deterministic seeds keep particle count and restarts independent of gameplay rolls.
  let seed = 7823;
  for (let i = 0; i < seeds.length; i++) seeds[i] = (seed = seed * 16807 % 2147483647) / 2147483647;
  const quad = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry().copy(quad);
  quad.dispose();
  geometry.setAttribute('drop', new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = count;
  const material = new THREE.ShaderMaterial({
    uniforms: { seconds: { value: 0 }, travel: { value: 0 }, snow: { value: 0 } },
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute vec4 drop;
      uniform float seconds, travel, snow;
      varying vec2 shape;
      varying float opacity;
      void main() {
        const vec3 volume = vec3(50., 22., 65.);
        float t = seconds * (.8 + .36 * drop.w);
        vec3 p = drop.xyz * volume;
        p.y -= t * mix(14., 1.7, snow);
        p.x += t * mix(2.8, .8, snow) + snow * .6 * sin(t*1.15 + drop.z*24.);
        p.z += travel;
        vec2 centre = cameraPosition.xz - vec2(0., 21.);
        p.xz = mod(p.xz - centre + volume.xz * .5, volume.xz) - volume.xz * .5 + centre;
        p.y = mod(p.y, volume.y);
        vec4 view = viewMatrix * vec4(p, 1.);
        opacity = (.55 + .45*drop.w) * smoothstep(2.,7.,-view.z) * (1.-smoothstep(40.,51.,-view.z));
        float size = (.65 + .65 * drop.w);
        view.xy += vec2(position.x*mix(.026,.106,snow) - position.y*mix(.105,0.,snow),
                        position.y*mix(.56,.106,snow)) * size;
        gl_Position = projectionMatrix * view;
        shape = 2.*uv - 1.;
      }`,
    fragmentShader: `
      varying vec2 shape;
      varying float opacity;
      uniform float snow;
      void main() {
        float edge = 1. - smoothstep(.60, 1., length(shape));
        gl_FragColor = vec4(mix(vec3(.65,.80,.90),vec3(.97,.98,1.),snow),
                            edge * opacity * mix(.52,.88,snow));
        #include <colorspace_fragment>
      }`,
  });
  const field = new THREE.Mesh(geometry, material);
  field.name = 'Precipitation'; field.frustumCulled = false;
  return field;
}

export function createWeather(scene, fill, sun, { compact = false } = {}) {
  const sky = createSky(), field = createPrecipitation(compact ? 1050 : 1950);
  scene.add(sky, field);
  const surfaceWeather = { value: new THREE.Vector2() }, travel = field.material.uniforms.travel;
  const treated = new WeakSet();
  const fog = new THREE.Fog(0, 40, 130);

  function treatSurface(material) {
    if (!material.isMeshStandardMaterial || treated.has(material)) return;
    treated.add(material);
    material.onBeforeCompile = shader => {
      shader.uniforms.surfaceWeather = surfaceWeather;
      shader.uniforms.courseTravel = travel;
      shader.vertexShader = 'varying vec3 cityPosition;\n' + shader.vertexShader.replace('#include <project_vertex>', `
        #include <project_vertex>
        vec4 cityVertex = vec4(transformed, 1.);
        #ifdef USE_INSTANCING
          cityVertex = instanceMatrix * cityVertex;
        #endif
        cityPosition = (modelMatrix * cityVertex).xyz;`);
      shader.fragmentShader = 'varying vec3 cityPosition; uniform vec2 surfaceWeather; uniform float courseTravel;\n' +
        shader.fragmentShader.replace('#include <normal_fragment_maps>', `
          #include <normal_fragment_maps>
          vec3 n = inverseTransformDirection(normal, viewMatrix);
          diffuseColor.rgb *= mix(vec3(.87,.94,1.02),vec3(1.07,1.,.92),smoothstep(-.2,.7,dot(n,vec3(-.6,.6,.4))));
          float pool = 0.;
          if (surfaceWeather.x + surfaceWeather.y > 0.) {
            // Undo course scrolling so wet patches travel with the paving.
            vec2 p = cityPosition.xz - vec2(0.,courseTravel);
            float brush = .5 + .22*sin(.83*p.x+.17*p.y + 1.3*sin(.41*p.y))
                            + .15*sin(1.93*p.x-.36*p.y) + .10*cos(3.8*p.x+.69*p.y);
            // The open water lies below the quays. Roofs can take a deeper
            // dusting than the street, where markings must remain legible.
            float top = smoothstep(.22,.86,n.y) * smoothstep(-.15,-.07,cityPosition.y);
            float raised = smoothstep(.15,1.9,cityPosition.y);
            float wet = surfaceWeather.x * top;
            pool = wet * smoothstep(.49,.9,brush) * (1.-.65*raised);
            float frost = surfaceWeather.y * top * (.11 + .22*brush + .43*raised);
            float baseValue = dot(diffuseColor.rgb, vec3(.22,.68,.10));
            diffuseColor.rgb *= 1.-.42*wet;
            diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.65,.79,.83)*(.58+.42*smoothstep(.02,.55,baseValue)),frost);
            roughnessFactor = mix(roughnessFactor,.34,pool);
          }
        `).replace('#include <opaque_fragment>', `
          float grazing = 1.-abs(dot(normal,normalize(vViewPosition)));
          outgoingLight = mix(outgoingLight,vec3(.23,.34,.40),pool * (.035+.21*grazing*grazing));
          #include <opaque_fragment>`);
    };
    material.needsUpdate = true;
  }

  function enter(kind, mapRoot) {
    const look = conditions[kind];
    // Traffic templates and occupied slots keep their painted figure finish.
    function visit(node) {
      if (node.userData.runnerTraffic) return;
      if (node.isMesh) {
        if (Array.isArray(node.material)) node.material.forEach(treatSurface);
        else treatSurface(node.material);
      }
      node.children.forEach(visit);
    }
    visit(mapRoot);
    for (const key of ['sky','horizon','cloud']) sky.material.uniforms[key].value.set(look[key]);
    fog.color.set(look.horizon); fog.near = look.near; fog.far = look.far;
    scene.background = fog.color; scene.fog = fog;
    sun.color.set(look.sun); sun.intensity = look.direct; sun.shadow.intensity = look.shadow;
    fill.color.set(look.fill); fill.groundColor.set(look.bounce); fill.intensity = look.ambient;
    surfaceWeather.value.set(Number(kind === 'rain'), Number(kind === 'snow'));
    field.visible = kind !== 'clear';
    field.material.uniforms.snow.value = Number(kind === 'snow');
    field.material.uniforms.seconds.value = 0; travel.value = 0;
  }
  return {
    enter,
    update(dt, distance) { field.material.uniforms.seconds.value += dt; travel.value = distance; },
    dispose() {
      for (const mesh of [sky, field]) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }
    },
  };
}
