import * as THREE from 'three';

const OPENING = .047;
const MOUTH_BOUNCE = .015;
const CHIN_Y = 2.09;
// Put the photo just in front of the shoulders. The scene still occludes it normally.
const PHOTO_DEPTH = .35;
export const PHOTO_HEAD_Y = 2.75;

export function photoDirection(degrees) {
  const angle = Math.abs(degrees);
  if (angle > 120) return 'rear';
  if (angle >= 47) return degrees > 0 ? 'right' : 'left';
  return angle >= 15 ? 'quarter' : 'front';
}

export function aimPhotoHead(head, yaw, forward = 0) {
  head.rotation.y = yaw;
  const side = Math.sin(yaw), facing = Math.cos(yaw);
  // At a side angle the nearer arm swings in front of the jacket.
  const clearance = .12 * Math.abs(side);
  // Project the forward shift onto the photo plane so its clearance stays the same.
  const forwardOnScreen = -side * forward;
  head.position.x = side * clearance + facing * forwardOnScreen;
  head.position.z = facing * clearance - side * forwardOnScreen;
}

// Each frame has its own silhouette and chin outline, traced in photo pixels.
// The lower lip and chin share the fixed head's source UVs at the closed pose.
export function createSplitPhotoHead(frame, texture, headHeight = .985) {
  const head = new THREE.Group();
  // The crop anchor gives the reference size. The fitted seat sets where it meets the jacket.
  const { seat = frame.anchor, scale = 1, verticalScale = 1, roll = 0 } = frame.fit ?? {};
  const [px, py] = seat, [width, height] = frame.size;
  const factor = headHeight * scale / (frame.anchor[1] - frame.top);
  const heightFactor = factor * verticalScale;
  const angle = THREE.MathUtils.degToRad(roll);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false });
  const corrections = [
    frame.blueBackdrop && 'if (diffuseColor.b > 1.13 * diffuseColor.r + 0.012 && diffuseColor.b > 1.08 * diffuseColor.g) discard;',
    frame.violetLight && `
      vec3 lit = diffuseColor.rgb;
      float violet = smoothstep(0.05, 0.38, (lit.b - lit.g) / max(lit.r, 0.045));
      vec3 balanced = vec3(lit.r, max(lit.g, lit.r * 0.68), min(lit.b, max(lit.r * 0.55, lit.g * 0.85)));
      diffuseColor.rgb = mix(lit, balanced, violet);
    `,
  ].filter(Boolean).join('\n');
  if (corrections) {
    material.customProgramCacheKey = () => corrections;
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + corrections);
    };
  }
  function piece(name, polygons, surface, depth, neckFit) {
    const positions = [], uvs = [], indices = [];
    for (const polygon of polygons) {
      const rings = polygon.map(ring => ring.map(([x, y]) => new THREE.Vector2(x, y)));
      const triangles = THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1));
      const offset = positions.length / 3;
      for (const triangle of triangles) for (const vertex of triangle) indices.push(offset + vertex);
      for (const ring of rings) for (const { x, y } of ring) {
        let dx = x - px, dy = py - y;
        if (neckFit) {
          const blend = THREE.MathUtils.smoothstep(y, neckFit.from, neckFit.to);
          dx += blend * neckFit.x;
          dy -= blend * neckFit.y;
        }
        positions.push(
          (dx * cos - dy * sin) * factor,
          CHIN_Y - PHOTO_HEAD_Y + (dx * sin + dy * cos) * heightFactor,
          PHOTO_DEPTH + depth,
        );
        uvs.push(x / width, 1 - y / height);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.name = name;
    head.add(mesh);
    return mesh;
  }
  piece('Upper photo', frame.fixed, material, 0);
  if (frame.jaw) {
    piece('Lower jaw', frame.jaw, material, .002);
    const gap = (OPENING + MOUTH_BOUNCE + .008) / heightFactor;
    // Counter-rotate the extrusion so it fills the gap left by a vertical jaw drop.
    const cavity = [...frame.mouth, ...frame.mouth.toReversed().map(([x, y]) => [x - gap * sin, y + gap * cos])];
    const interior = new THREE.MeshBasicMaterial({ color: '#39232a', side: THREE.DoubleSide, toneMapped: false });
    piece('Mouth interior', [[cavity]], interior, -.001).visible = false;
    // Keep a strip of the original photo under the mouth corners as the chin drops.
    piece('Cheeks behind the jaw', frame.bridge, material, -.002);
  }
  // Match the source pixels at the jaw and fit only the bottom of the photo neck to the collar.
  if (frame.neck) piece('Photo neck', frame.neck.polygons, material, -.003, frame.neck.fit);
  return head;
}

export function animatePhotoJaw(photo, time, running) {
  const [, jaw, mouth] = photo.children;
  if (!jaw) return;
  const opening = running && Math.sin(time * 21) > -.1 ? OPENING + MOUTH_BOUNCE * Math.sin(time * 15) : 0;
  jaw.position.y = -opening;
  mouth.visible = opening > 0;
}
