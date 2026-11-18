"use client";

// Light in the air: thin slices in front of the window, each lit where the sun comes through,
// add up to the shafts; dust only shows where it drifts through them.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { seeded } from "@/lib/geometry";
import { timed } from "@/lib/perf";
import type { WindowModel } from "@/lib/window-model";
import { SUN } from "./shared";
import type { useSun } from "./sun";
import { noiseTexture } from "./textures";

// Light in the air: thin slices through the room in front of the window, each lit where the sun
// comes through. Added up, they make the shafts. Dust only shows where it's in them.

export const airVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const airFragment = /* glsl */ `
  uniform sampler2D lightMap;
  uniform sampler2D noiseMap;
  uniform mat4 lightMatrix;
  uniform float strength;
  uniform float time;
  varying vec3 vWorld;
  void main() {
    vec4 c = lightMatrix * vec4(vWorld, 1.0);
    vec2 uv = c.xy / c.w;
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) discard;
    // Softened: the air scatters the light, it doesn't draw the leads.
    vec3 light = texture2D(lightMap, uv, 2.5).rgb;
    float z = vWorld.z;
    float fade = smoothstep(0.2, 1.1, z) * exp(-z * 0.5);
    float dust = texture2D(noiseMap, uv * 2.2 + vec2(time * 0.004, -time * 0.002)).r;
    dust *= texture2D(noiseMap, uv * 5.0 - vec2(time * 0.006, time * 0.003)).r * 1.6;
    gl_FragColor = vec4(light * strength * fade * (0.35 + dust), 1.0);
  }
`;

export function Air({ sun, model, slices, clouds = 0 }: { sun: ReturnType<typeof useSun>; model: WindowModel; slices: number; clouds?: number }) {
  const noise = useMemo(() => timed("window:paint-air", noiseTexture), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: airVertex,
        fragmentShader: airFragment,
        uniforms: {
          lightMap: { value: sun.target.texture },
          noiseMap: { value: noise },
          lightMatrix: { value: sun.light.shadow.matrix },
          strength: { value: 0.045 * (26 / slices) },
          time: { value: 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [sun, noise, slices],
  );
  const group = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const slice = group.current?.children[0] as THREE.Mesh | undefined;
    if (!slice) return;
    const u = (slice.material as THREE.ShaderMaterial).uniforms;
    u.time.value = state.clock.elapsedTime;
    // Under clouds the shafts fade (gently, as the weather arrives).
    const target = 0.045 * (26 / slices) * (1 - clouds * 0.65);
    u.strength.value += (target - u.strength.value) * Math.min(1, delta * 0.8);
  });
  useEffect(() => () => material.dispose(), [material]);
  const reach = 3.4;
  return (
    <group ref={group}>
      {Array.from({ length: slices }, (_, i) => {
        const z = 0.06 + (reach * (i + 0.5)) / slices;
        // Each slice only needs to cover where the window's light has got to by then.
        const shift = [(SUN.x / SUN.z) * z, (SUN.y / SUN.z) * z];
        return (
          <mesh key={i} position={[shift[0] / 2, shift[1] / 2 + 0.2, z]} material={material} renderOrder={2}>
            <planeGeometry args={[model.width + 0.6 + Math.abs(shift[0]), model.height + 0.6 + Math.abs(shift[1])]} />
          </mesh>
        );
      })}
    </group>
  );
}

export const dustVertex = /* glsl */ `
  attribute float seed;
  uniform float time;
  uniform mat4 lightMatrix;
  varying vec2 vLight;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.x += sin(time * 0.07 + seed * 40.0) * 0.12;
    p.y += sin(time * 0.05 + seed * 23.0) * 0.16 - mod(time * 0.01 + seed, 1.0) * 0.1;
    p.z += cos(time * 0.06 + seed * 17.0) * 0.1;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vec4 c = lightMatrix * w;
    vLight = c.xy / c.w;
    vSeed = seed;
    vec4 mv = viewMatrix * w;
    gl_PointSize = (1.4 + seed * 2.2) * (14.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

export const dustFragment = /* glsl */ `
  uniform sampler2D lightMap;
  uniform float time;
  varying vec2 vLight;
  varying float vSeed;
  void main() {
    if (vLight.x < 0.0 || vLight.y < 0.0 || vLight.x > 1.0 || vLight.y > 1.0) discard;
    float r = length(gl_PointCoord - 0.5);
    float soft = smoothstep(0.5, 0.0, r);
    float twinkle = 0.6 + 0.4 * sin(time * (0.5 + vSeed) + vSeed * 30.0);
    vec3 light = texture2D(lightMap, vLight).rgb;
    gl_FragColor = vec4(light * soft * twinkle * 2.2, 1.0);
  }
`;

export function Dust({ sun, model }: { sun: ReturnType<typeof useSun>; model: WindowModel }) {
  const { geometry, material } = useMemo(() => {
    const n = 520;
    const rand = seeded("dust");
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const z = 0.1 + rand() * 3.2;
      pos[i * 3] = (rand() - 0.5) * (model.width + 1) + (SUN.x / SUN.z) * z * 0.5;
      pos[i * 3 + 1] = (rand() - 0.5) * model.height + (SUN.y / SUN.z) * z * 0.5;
      pos[i * 3 + 2] = z;
      seed[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms: {
        lightMap: { value: sun.target.texture },
        lightMatrix: { value: sun.light.shadow.matrix },
        time: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { geometry: g, material: m };
  }, [sun, model]);
  const points = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (points.current) (points.current.material as THREE.ShaderMaterial).uniforms.time.value = state.clock.elapsedTime;
  });
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <points ref={points} geometry={geometry} material={material} renderOrder={3} />;
}
