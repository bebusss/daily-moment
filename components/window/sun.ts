// The sun through the window: a spot light far outside whose cookie is a picture of the window
// as the sun sees it, so light only lands where it came through the glass, in its colors.

import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { timed } from "@/lib/perf";
import type { WindowModel } from "@/lib/window-model";
import { glassVertex } from "./Glass";
import { SUN } from "./shared";
import type { Painted } from "./textures";

// The sun through the window: a spot light far outside, its cookie a picture of the window as
// the sun sees it. Light only lands where it would have come through the glass, in its colors.

export const castFragment = /* glsl */ `
  uniform sampler2D glassMap;
  uniform sampler2D leadMap;
  uniform sampler2D idMap;
  uniform sampler2D outSoft;
  varying vec2 vUv;
  void main() {
    if (texture2D(idMap, vUv).b < 0.5) discard;
    float lead = smoothstep(0.1, 0.38, texture2D(leadMap, vUv).r);
    vec3 c = texture2D(glassMap, vUv).rgb * texture2D(outSoft, vUv).rgb * (1.0 - lead);
    gl_FragColor = vec4(c * 1.6, 1.0);
  }
`;

export function useSun(model: WindowModel, textures: Painted) {
  const gl = useThree((s) => s.gl);
  const sun = useMemo(() => {
    const light = new THREE.SpotLight("#ffd7a0", 40, 0, 0.21, 0, 0);
    light.position.copy(SUN.clone().multiplyScalar(22));
    light.target.position.copy(SUN.clone().multiplyScalar(-4));
    const target = new THREE.WebGLRenderTarget(512, 512, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    light.map = target.texture;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000");
    return { light, target, scene };
  }, []);
  // One material for the sun's picture too, its textures swapped as the window changes.
  const cast = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    cast.current ??= new THREE.ShaderMaterial({
      vertexShader: glassVertex,
      fragmentShader: castFragment,
      uniforms: {
        glassMap: { value: null },
        leadMap: { value: null },
        idMap: { value: null },
        outSoft: { value: null },
      },
      // The sun sees the glass from outside: its back.
      side: THREE.DoubleSide,
    });
    const material = cast.current;
    material.uniforms.glassMap.value = textures.glass;
    material.uniforms.leadMap.value = textures.lead;
    material.uniforms.idMap.value = textures.ids;
    material.uniforms.outSoft.value = textures.soft;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(model.width, model.height), material);
    // The saddle bars block the sun too.
    const bars = model.bars.map((y) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(model.width + 0.1, 0.022, 0.03), new THREE.MeshBasicMaterial({ color: "#000", side: THREE.DoubleSide }));
      bar.position.set(0, y, 0.03);
      return bar;
    });
    const scene = sun.scene;
    scene.add(pane, ...bars);
    const { light, target } = sun;
    light.updateMatrixWorld();
    light.target.updateMatrixWorld();
    light.shadow.updateMatrices(light);
    let live = true;
    gl.compileAsync(scene, light.shadow.camera).then(() => {
      if (!live) return;
      const before = gl.getRenderTarget();
      gl.setRenderTarget(target);
      gl.clear();
      timed("window:sun-picture", () => gl.render(scene, light.shadow.camera));
      gl.setRenderTarget(before);
    });
    return () => {
      live = false;
      scene.remove(pane, ...bars);
      pane.geometry.dispose();
      bars.forEach((b) => b.geometry.dispose());
    };
  }, [gl, sun, model, textures]);

  useEffect(() => () => sun.target.dispose(), [sun]);
  useEffect(() => {
    const material = cast;
    return () => material.current?.dispose();
  }, []);
  return sun;
}
