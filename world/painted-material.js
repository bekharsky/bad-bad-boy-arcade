// Keep the portrait colours, skinning, morphs and hit flashes in Three's
// standard shader. Shape just the diffuse modelling and grazing silhouette.
export function paintFigure(material) {
  if (!material.isMeshStandardMaterial) return;
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      #ifdef PAINTED_CLAY
        float value = sqrt(dot(diffuseColor.rgb, vec3(.24,.66,.10)));
        vec3 clay = mix(vec3(.16,.046,.036), vec3(.82,.45,.32), smoothstep(.08,.89,value));
        diffuseColor.rgb = mix(clay, diffuseColor.rgb, .34);
      #endif
    `).replace('#include <opaque_fragment>', `
      float faceLight = dot(inverseTransformDirection(normal, viewMatrix), normalize(vec3(-.55, .74, .39)));
      vec3 pigment = mix(vec3(.69, .80, .92), vec3(1.08, 1.015, .92), smoothstep(-.16, .20, faceLight));
      float edge = 1.0 - smoothstep(.10, .39, abs(dot(normal, normalize(vViewPosition))));
      outgoingLight += totalDiffuse * (pigment - 1.0);
      outgoingLight = mix(outgoingLight, outgoingLight * vec3(.46, .59, .68), edge * .72);
      #include <opaque_fragment>`);
  };
}
