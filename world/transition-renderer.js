import * as THREE from 'three';

export function transitionFrame(progress, reducedMotion = false) {
  const p = Math.max(0, Math.min(1, progress));
  return {
    pixels: reducedMotion ? 0 : Math.sin(Math.PI * p) ** 2,
    cover: THREE.MathUtils.smoothstep(p, .22, .47) * (1 - THREE.MathUtils.smoothstep(p, .53, .82)),
    title: THREE.MathUtils.smoothstep(p, .12, .35) * (1 - THREE.MathUtils.smoothstep(p, .72, 1)),
  };
}

// A post-process pass only during district changes. Ordinary gameplay renders
// directly to the canvas, without an extra target or a full-screen shader pass.
export function createTransitionRenderer(renderer) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  });
  target.texture.name = 'Map transition scene';
  const material = new THREE.ShaderMaterial({
    uniforms: { sceneTexture: { value: target.texture }, resolution: { value: new THREE.Vector2(1, 1) }, pixels: { value: 0 }, cover: { value: 0 }, backgroundColor: { value: new THREE.Color() } },
    depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      uniform sampler2D sceneTexture;
      uniform vec2 resolution;
      uniform float pixels;
      uniform float cover;
      uniform vec3 backgroundColor;
      varying vec2 vUv;
      void main() {
        float size = 1.0 + pixels * min(resolution.x, resolution.y) / 20.0;
        vec2 cells = resolution / size;
        vec2 blockUv = (floor(vUv * cells) + 0.5) / cells;
        vec2 uv = mix(vUv, blockUv, pixels);
        vec4 sampleColor = texture2D(sceneTexture, uv);
        gl_FragColor = vec4(sampleColor.rgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        // Scene backgrounds bypass tone mapping in the ordinary renderer.
        // Composite them after the HDR scene to avoid a colour jump at the cut.
        gl_FragColor.rgb = mix(backgroundColor, gl_FragColor.rgb, sampleColor.a);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.09, 0.11, 0.15), cover);
      }
    `,
  });
  const geometry = new THREE.PlaneGeometry(2, 2), screen = new THREE.Scene();
  screen.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.Camera(), size = new THREE.Vector2();
  return {
    render(scene, sceneCamera, progress, reducedMotion = false) {
      renderer.getDrawingBufferSize(size);
      if (target.width !== size.x || target.height !== size.y) target.setSize(size.x, size.y);
      const frame = transitionFrame(progress, reducedMotion);
      material.uniforms.resolution.value.copy(size);
      material.uniforms.pixels.value = frame.pixels;
      material.uniforms.cover.value = frame.cover;
      const previous = renderer.getRenderTarget(), background = scene.background, alpha = renderer.getClearAlpha();
      if (background?.isColor) material.uniforms.backgroundColor.value.copy(background).convertLinearToSRGB();
      else material.uniforms.backgroundColor.value.setRGB(0, 0, 0);
      try {
        scene.background = null; renderer.setClearAlpha(0);
        renderer.setRenderTarget(target); renderer.render(scene, sceneCamera);
      } finally {
        scene.background = background; renderer.setClearAlpha(alpha); renderer.setRenderTarget(previous);
      }
      renderer.render(screen, camera);
      return frame;
    },
    dispose() { target.dispose(); geometry.dispose(); material.dispose(); },
  };
}
