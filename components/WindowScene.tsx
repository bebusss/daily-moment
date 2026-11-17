"use client";

// The month's window, set deep in a stone wall, with the late sun coming through it
// (three.js through React Three Fiber). It only draws: what each piece of glass is
// comes from lib/window-model, and how it looks from lib/paint.
//
// - The glass is lit from behind by the evening outside: each piece passes the light
//   in its own color and texture; clear glass shows the trees; milky glass only glows.
// - The sun throws the window's colors into the room: on the stone of the embrasure,
//   on the ledge, and through the air as shafts with dust drifting in them. All three
//   read the same picture of the window, taken from the sun.
// - Tonight's leaf breathes, waiting. When it's filled in, its color comes up slowly.
// - A night in the spotlight (a past night opened from the card, or tonight's leaf as it's set):
//   the view moves in to its leaf, the rest of the glass steps back, and the leaf flares once as
//   it arrives. Without one, the whole window again.
// - Otherwise the camera holds still, framing the window between the text above and the card below.
// - On phones it draws less: lower resolution, fewer light slices, 30 frames a second, and
//   nothing at all while the wind-down covers it.

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { DailyGoal } from "@/lib/data";
import { len, seeded, sub, type Pt } from "@/lib/geometry";
import { paintOutside, paintStone, paintWindow, STONE } from "@/lib/paint";
import { archPath, leafMid } from "@/lib/vine";
import { buildWindow, type WindowModel } from "@/lib/window-model";
import FlatWindow from "./FlatWindow";

/** The wall's thickness, how far the opening widens toward the room, and the glass's rebate. */
const DEPTH = 1.05;
const SPLAY = 1.46;
const REBATE = 0.07;
/** Where the sun is, seen from the window: up, to the right, outside. */
const SUN = new THREE.Vector3(0.72, 0.6, -1).normalize();

const v2 = ([x, y]: Pt) => new THREE.Vector2(x, y);

// ---------------------------------------------------------------------------------------------
// Textures

function canvasTexture(c: HTMLCanvasElement, color: boolean, nearest = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (nearest) {
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
  }
  return t;
}

function useWindowTextures(model: WindowModel) {
  const painted = useMemo(() => paintWindow(model), [model]);
  const textures = useMemo(() => {
    const outside = paintOutside(model);
    return {
      glass: canvasTexture(painted.glass, true),
      lead: canvasTexture(painted.lead, false),
      mask: canvasTexture(painted.mask, false),
      ids: canvasTexture(painted.ids, false, true),
      sharp: canvasTexture(outside.sharp, true),
      soft: canvasTexture(outside.soft, true),
      sun: new THREE.Vector2(...outside.sun),
    };
  }, [model, painted]);
  useEffect(
    () => () => {
      for (const t of Object.values(textures)) if (t instanceof THREE.Texture) t.dispose();
    },
    [textures],
  );
  return { textures, paneAt: painted.paneAt };
}

/** A small tiling noise for the dust in the air. */
function noiseTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const rand = seeded("air");
  g.fillStyle = "rgb(110,110,110)";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 160; i++) {
    const r = 6 + rand() * 40;
    const x = rand() * size;
    const y = rand() * size;
    const c2 = rand() > 0.5 ? "255,255,255" : "0,0,0";
    for (const dx of [-size, 0, size])
      for (const dy of [-size, 0, size]) {
        const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        grad.addColorStop(0, `rgba(${c2},0.18)`);
        grad.addColorStop(1, `rgba(${c2},0)`);
        g.fillStyle = grad;
        g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------------------------------------
// The glass

const glassVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glassFragment = /* glsl */ `
  uniform sampler2D glassMap;
  uniform sampler2D prevMap;
  uniform sampler2D leadMap;
  uniform sampler2D maskMap;
  uniform sampler2D prevMask;
  uniform sampler2D idMap;
  uniform sampler2D outSharp;
  uniform sampler2D outSoft;
  uniform vec2 texel;
  uniform vec2 size;
  uniform vec2 sun;
  uniform float exposure;
  uniform float time;
  uniform float today;
  uniform float filling;
  uniform float selected;
  uniform float reveal;
  uniform float focus;
  uniform float picked;
  varying vec2 vUv;

  void main() {
    vec4 idc = texture2D(idMap, vUv);
    if (idc.b < 0.5) discard;
    float pid = floor(idc.r * 255.0 + 0.5) + floor(idc.g * 255.0 + 0.5) * 256.0;
    vec4 mask = texture2D(maskMap, vUv);
    float milk = mask.b;

    // What's outside, sharp through clear glass and only light through milky glass.
    vec3 outside = mix(texture2D(outSharp, vUv).rgb, texture2D(outSoft, vUv).rgb, milk);
    vec2 d = (vUv - sun) * size;
    float r2 = dot(d, d);
    outside += vec3(1.0, 0.86, 0.64) * (exp(-r2 / mix(0.004, 0.04, milk)) * mix(4.0, 0.6, milk) + exp(-r2 / 0.9) * 0.22);

    // The glass passes it in its own color. The leaf just filled in comes up from its waiting glass.
    float isToday = 1.0 - step(0.5, abs(pid - today));
    float isFill = 1.0 - step(0.5, abs(pid - filling));
    vec3 glass = mix(texture2D(prevMap, vUv).rgb, texture2D(glassMap, vUv).rgb, mix(1.0, reveal, isFill));
    vec3 light = glass * outside * exposure;

    // Tonight's leaf glows from within, brightest just inside its lead, breathing slowly while it waits.
    float breath = 0.5 + 0.5 * sin(time * 1.2);
    vec3 waiting = vec3(1.0, 0.8, 0.46) * 1.9 * (0.5 + 0.6 * breath);
    light *= 1.0 + isToday * 0.25;
    light += isToday * mask.g * waiting;
    light += isFill * (1.0 - reveal) * texture2D(prevMask, vUv).g * waiting;
    // As its color comes in, it flares once.
    light += isFill * sin(3.14159 * reveal) * light * 1.1;
    float isSelected = 1.0 - step(0.5, abs(pid - selected));
    light *= 1.0 + isSelected * 0.22;
    // A past night opened: the rest of the glass steps back, and its leaf glows just inside its lead.
    light *= mix(1.0, mix(0.5, 1.35, isSelected), focus);
    // It flares once when it's picked.
    light += isSelected * focus * exp(-max(time - picked, 0.0) * 1.8) * vec3(1.0, 0.9, 0.72) * 1.3;
    if (isSelected > 0.5 && focus > 0.01) {
      float edge = 0.0;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785398;
        vec4 q = texture2D(idMap, vUv + vec2(cos(a), sin(a)) * texel * 10.0);
        float qid = floor(q.r * 255.0 + 0.5) + floor(q.g * 255.0 + 0.5) * 256.0;
        edge += step(0.5, abs(qid - pid));
      }
      light += min(edge / 2.0, 1.0) * focus * vec3(1.0, 0.86, 0.58) * (1.5 + 0.5 * sin(time * 2.2));
    }

    // The lead: a rounded came, dark, catching a little of the room's light on its crown.
    float h = texture2D(leadMap, vUv).r;
    float hx = texture2D(leadMap, vUv + vec2(texel.x, 0.0)).r - texture2D(leadMap, vUv - vec2(texel.x, 0.0)).r;
    float hy = texture2D(leadMap, vUv + vec2(0.0, texel.y)).r - texture2D(leadMap, vUv - vec2(0.0, texel.y)).r;
    vec3 n = normalize(vec3(-hx * 2.5, -hy * 2.5, 1.0));
    vec3 L = normalize(vec3(-0.35, 0.45, 0.82));
    float diff = max(dot(n, L), 0.0);
    float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 28.0);
    vec3 lead = vec3(0.02, 0.017, 0.014) * (0.35 + diff) + vec3(0.5, 0.4, 0.3) * spec * 0.09;
    float gold = smoothstep(0.25, 0.65, mask.r);
    // Gold mends the nights someone came back from: it's the one metal that shines.
    vec3 goldColor = vec3(1.0, 0.5, 0.08) * (0.55 + 0.55 * diff) + vec3(1.0, 0.62, 0.2) * spec * 0.7;
    goldColor *= 1.0 + 0.3 * sin(time * 0.8 - vUv.y * 12.0);
    float cover = max(smoothstep(0.1, 0.38, h), gold);
    vec3 color = mix(light, mix(lead, goldColor, gold), cover);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

type Painted = ReturnType<typeof useWindowTextures>["textures"];

function glassMaterial(t: Painted, model: WindowModel) {
  return new THREE.ShaderMaterial({
    vertexShader: glassVertex,
    fragmentShader: glassFragment,
    uniforms: {
      glassMap: { value: t.glass },
      prevMap: { value: t.glass },
      leadMap: { value: t.lead },
      maskMap: { value: t.mask },
      prevMask: { value: t.mask },
      idMap: { value: t.ids },
      outSharp: { value: t.sharp },
      outSoft: { value: t.soft },
      texel: { value: new THREE.Vector2(1 / t.lead.image.width, 1 / t.lead.image.height) },
      size: { value: new THREE.Vector2(model.width, model.height) },
      sun: { value: t.sun },
      exposure: { value: 1.9 },
      time: { value: 0 },
      today: { value: 0 },
      filling: { value: 0 },
      selected: { value: 0 },
      reveal: { value: 1 },
      focus: { value: 0 },
      picked: { value: 0 },
    },
  });
}

function Glass({
  model,
  textures,
  paneAt,
  selected,
  spotlight,
  onSelect,
}: {
  model: WindowModel;
  spotlight: boolean;
  textures: Painted;
  paneAt: (u: number, v: number) => ReturnType<ReturnType<typeof paintWindow>["paneAt"]>;
  selected?: number;
  onSelect?: (day: number) => void;
}) {
  const material = useMemo(() => glassMaterial(textures, model), [textures, model]);
  const mesh = useRef<THREE.Mesh>(null);
  const todayIndex = model.panes.findIndex((p) => p.status === "today");
  const shown = selected ?? model.panes[todayIndex]?.day;
  const selectedIndex = model.panes.findIndex((p) => p.day === shown);
  // The last window drawn and its waiting leaf, so a leaf just filled in can come up from it.
  const drawn = useRef<{ textures: Painted; today: number } | null>(null);
  const lastPick = useRef(-1);
  const fill = useRef<{ from: Painted; index: number; start: number | null } | null>(null);

  useEffect(() => {
    const before = drawn.current;
    if (before && before.textures !== textures && before.today >= 0 && model.panes[before.today]?.status === "done") {
      fill.current = { from: before.textures, index: before.today, start: null };
    }
    drawn.current = { textures, today: todayIndex };
    return () => material.dispose();
  }, [textures, material, model, todayIndex]);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const u = (mesh.current.material as THREE.ShaderMaterial).uniforms;
    const t = state.clock.elapsedTime;
    u.time.value = t;
    u.selected.value = selectedIndex + 1;
    u.today.value = todayIndex + 1;
    if (lastPick.current !== selectedIndex) {
      lastPick.current = selectedIndex;
      u.picked.value = t + 0.35;
    }
    const focus = spotlight && selectedIndex >= 0 ? 1 : 0;
    u.focus.value += (focus - u.focus.value) * Math.min(1, delta * 5);
    const f = fill.current;
    if (f) {
      // It waits a moment for the view to arrive.
      if (f.start === null) f.start = t + 0.9;
      const k = Math.max(0, Math.min(1, (t - f.start) / 2.6));
      u.reveal.value = k * k * (3 - 2 * k);
      u.filling.value = f.index + 1;
      u.prevMap.value = f.from.glass;
      u.prevMask.value = f.from.mask;
      if (k >= 1) fill.current = null;
    } else {
      u.reveal.value = 1;
      u.filling.value = 0;
      u.prevMap.value = u.glassMap.value;
      u.prevMask.value = u.maskMap.value;
    }
  });

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => (e.uv ? paneAt(e.uv.x, e.uv.y) : undefined);
  return (
    <mesh
      ref={mesh}
      material={material}
      onClick={(e) => {
        const pane = pick(e);
        if (pane?.day && pane.day <= (model.panes[todayIndex]?.day ?? 99)) onSelect?.(pane.day);
      }}
      onPointerMove={(e) => {
        const pane = pick(e);
        document.body.style.cursor = pane?.day && pane.status !== "future" ? "pointer" : "";
      }}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <planeGeometry args={[model.width, model.height]} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------------------------
// The sun through the window: a spot light far outside, its cookie a picture of the window as
// the sun sees it. Light only lands where it would have come through the glass, in its colors.

const castFragment = /* glsl */ `
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

function useSun(model: WindowModel, textures: Painted) {
  const gl = useThree((s) => s.gl);
  const sun = useMemo(() => {
    const light = new THREE.SpotLight("#ffd7a0", 40, 0, 0.21, 0, 0);
    light.position.copy(SUN.clone().multiplyScalar(22));
    light.target.position.copy(SUN.clone().multiplyScalar(-4));
    const target = new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    light.map = target.texture;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000");
    return { light, target, scene };
  }, []);

  useEffect(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: glassVertex,
      fragmentShader: castFragment,
      uniforms: { glassMap: { value: textures.glass }, leadMap: { value: textures.lead }, idMap: { value: textures.ids }, outSoft: { value: textures.soft } },
      // The sun sees the glass from outside: its back.
      side: THREE.DoubleSide,
    });
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
    const before = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, light.shadow.camera);
    gl.setRenderTarget(before);
    return () => {
      scene.remove(pane, ...bars);
      pane.geometry.dispose();
      material.dispose();
      bars.forEach((b) => b.geometry.dispose());
    };
  }, [gl, sun, model, textures]);

  useEffect(() => () => sun.target.dispose(), [sun]);
  return sun;
}

// ---------------------------------------------------------------------------------------------
// Light in the air: thin slices through the room in front of the window, each lit where the sun
// comes through. Added up, they make the shafts. Dust only shows where it's in them.

const airVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const airFragment = /* glsl */ `
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

function Air({ sun, model, slices }: { sun: ReturnType<typeof useSun>; model: WindowModel; slices: number }) {
  const noise = useMemo(() => noiseTexture(), []);
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
  useFrame((state) => {
    const slice = group.current?.children[0] as THREE.Mesh | undefined;
    if (slice) (slice.material as THREE.ShaderMaterial).uniforms.time.value = state.clock.elapsedTime;
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

const dustVertex = /* glsl */ `
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

const dustFragment = /* glsl */ `
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

function Dust({ sun, model }: { sun: ReturnType<typeof useSun>; model: WindowModel }) {
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
      uniforms: { lightMap: { value: sun.target.texture }, lightMatrix: { value: sun.light.shadow.matrix }, time: { value: 0 } },
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

// ---------------------------------------------------------------------------------------------
// The wall: dressed stone, the opening widening toward the room, a ledge below.

/** A strip of surface between two matching lines, `a` at depth `za` and `b` at depth `zb`. */
function loft(a: Pt[], b: Pt[], za: number, zb: number) {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  let along = 0;
  a.forEach((p, k) => {
    if (k) along += len(sub(p, a[k - 1]));
    pos.push(p[0], p[1], za, b[k][0], b[k][1], zb);
    const across = Math.hypot(b[k][0] - p[0], b[k][1] - p[1], zb - za);
    uv.push(along / STONE, 0, along / STONE, across / STONE);
  });
  for (let k = 0; k < a.length - 1; k++) {
    const i = k * 2;
    index.push(i, i + 3, i + 1, i, i + 2, i + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Faces a loft toward `toward` (a point in the opening), flipping it if it was built facing away. */
function facing(g: THREE.BufferGeometry, toward: THREE.Vector3) {
  const p = new THREE.Vector3().fromBufferAttribute(g.getAttribute("position") as THREE.BufferAttribute, 2);
  const n = new THREE.Vector3().fromBufferAttribute(g.getAttribute("normal") as THREE.BufferAttribute, 2);
  if (n.dot(toward.clone().sub(p)) < 0) {
    const idx = g.getIndex()!;
    const arr = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) [arr[i + 1], arr[i + 2]] = [arr[i + 2], arr[i + 1]];
    idx.needsUpdate = true;
    g.computeVertexNormals();
  }
  return g;
}

function useStone() {
  const maps = useMemo(() => {
    const { color, normal } = paintStone();
    const c = new THREE.CanvasTexture(color);
    c.colorSpace = THREE.SRGBColorSpace;
    const n = new THREE.CanvasTexture(normal);
    for (const t of [c, n]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
    }
    return { color: c, normal: n };
  }, []);
  useEffect(
    () => () => {
      maps.color.dispose();
      maps.normal.dispose();
    },
    [maps],
  );
  return maps;
}

function Wall({ model }: { model: WindowModel }) {
  const stone = useStone();
  const { jambs, sill, face, ledge, ledgeY, ledgeWidth } = useMemo(() => {
    const a = archPath(-REBATE);
    const top = Math.max(...a.map((p) => p[1]));
    const bottom = a[0][1];
    const bottomB = bottom - 0.1;
    const topB = top + 0.32;
    const b = a.map(([x, y]): Pt => [x * SPLAY, bottomB + ((y - bottom) * (topB - bottomB)) / (top - bottom)]);
    const inward = new THREE.Vector3(0, 0, DEPTH / 2);
    const jambs = facing(loft(a, b, 0, DEPTH), inward);
    const sill = facing(loft([a[a.length - 1], a[0]], [b[b.length - 1], b[0]], 0, DEPTH), new THREE.Vector3(0, 2, DEPTH / 2));
    const shape = new THREE.Shape([v2([-30, -30]), v2([30, -30]), v2([30, 30]), v2([-30, 30])]);
    shape.holes.push(new THREE.Path(b.map(v2)));
    const face = new THREE.ShapeGeometry(shape, 1);
    const fuv = face.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < fuv.count; i++) fuv.setXY(i, fuv.getX(i) / STONE, fuv.getY(i) / STONE);
    const ledgeWidth = (model.width / 2 + REBATE) * SPLAY * 2 + 0.7;
    const ledge = new THREE.BoxGeometry(ledgeWidth, 0.16, 0.95);
    const luv = ledge.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < luv.count; i++) luv.setXY(i, (luv.getX(i) * ledgeWidth) / STONE, (luv.getY(i) * 0.95) / STONE);
    return { jambs, sill, face, ledge, ledgeY: bottomB - 0.08, ledgeWidth };
  }, [model]);
  useEffect(
    () => () => {
      for (const g of [jambs, sill, face, ledge]) g.dispose();
    },
    [jambs, sill, face, ledge],
  );
  const material = (
    <meshStandardMaterial map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.9, 0.9)} roughness={0.92} metalness={0} />
  );
  return (
    <group>
      <mesh geometry={jambs}>{material}</mesh>
      <mesh geometry={sill}>{material}</mesh>
      <mesh geometry={face} position={[0, 0, DEPTH]}>
        {material}
      </mesh>
      <mesh geometry={ledge} position={[0, ledgeY, DEPTH + 0.47]} userData={{ width: ledgeWidth }}>
        {material}
      </mesh>
    </group>
  );
}

/** The iron saddle bars across the inside of the glass, set into the stone at each end. */
function Bars({ model }: { model: WindowModel }) {
  return (
    <group>
      {model.bars.map((y) => (
        <mesh key={y} position={[0, y, 0.03]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.011, 0.011, model.width + 0.08, 10]} />
          <meshStandardMaterial color="#2b2420" metalness={0.7} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

export type Insets = { top: number; bottom: number };

/** How close the view comes to a past night's leaf. */
const ZOOM = 2.1;

/**
 * Framing: the window (arch to ledge) as big as fits between the text above and the card below.
 * With a past night open, the view glides in to its leaf and centers it there instead.
 */
function Rig({ model, insets, focus, still }: { model: WindowModel; insets: Insets; focus: Pt | null; still: boolean }) {
  const size = useThree((s) => s.size);
  const view = useRef<{ x: number; y: number; zoom: number } | null>(null);
  useFrame(({ camera }, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // The stone arch rises above the glass and the ledge sits below it.
    const above = model.height * 0.1;
    // The ledge may slip under the card a little.
    const below = model.height * 0.04;
    const contentH = model.height + above + below;
    const contentW = model.width * SPLAY + 0.9;
    const free = Math.max(size.height - insets.top - insets.bottom, size.height * 0.4);
    // Pixels per scene unit: fill the free band, unless the width runs out first.
    const fit = Math.min((free * 0.96) / contentH, (size.width * 0.94) / contentW);
    // Where to look and how close: the whole window, or the open night's leaf.
    const target = focus ? { x: focus[0], y: focus[1], zoom: ZOOM } : { x: 0, y: (above - below) / 2, zoom: 1 };
    const v = view.current ?? (view.current = { ...target });
    const ease = still ? 1 : 1 - Math.exp(-delta * 3);
    v.x += (target.x - v.x) * ease;
    v.y += (target.y - v.y) * ease;
    v.zoom += (target.zoom - v.zoom) * ease;
    const k = fit * v.zoom;
    const distance = size.height / k / (2 * tan);
    // Put that point on the free band's middle.
    const offset = (size.height / 2 - (insets.top + free / 2)) / k;
    const look = v.y - offset;
    const tilt = 0.5 / v.zoom;
    if (Math.abs(cam.position.z - distance) > 1e-4 || Math.abs(cam.position.y - (look - tilt)) > 1e-4 || Math.abs(cam.position.x - v.x) > 1e-4) {
      cam.position.set(v.x, look - tilt, distance);
      cam.lookAt(v.x, look, 0);
    }
  });
  return null;
}

/** On a phone, draw at 30 frames a second instead of every frame. */
function Pace({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const id = setInterval(() => invalidate(), 1000 / fps);
    return () => clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

function useMedia(query: string) {
  return useSyncExternalStore(
    (change) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", change);
      return () => m.removeEventListener("change", change);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Phones and tablets (a finger, not a mouse) get the lighter scene. */
const useLite = () => useMedia("(pointer: coarse)");

type SceneProps = {
  model: WindowModel;
  selected?: number;
  spotlight?: number | null;
  onSelect?: (day: number) => void;
  insets: Insets;
  lite: boolean;
};

function Scene({ model, selected, spotlight, onSelect, insets, lite }: SceneProps) {
  const { textures, paneAt } = useWindowTextures(model);
  const sun = useSun(model, textures);
  const still = useMedia("(prefers-reduced-motion: reduce)");
  // The night in the spotlight: the middle of its leaf, for the view to move in to.
  const focus = useMemo(() => {
    const pane = spotlight ? model.panes.find((p) => p.kind === "night" && p.day === spotlight) : undefined;
    if (!pane) return null;
    return pane.leaf ? leafMid(pane.leaf, 0.5) : pane.points[0];
  }, [model, spotlight]);
  return (
    <>
      <color attach="background" args={["#0b0806"]} />
      <Rig model={model} insets={insets} focus={focus} still={still} />
      <hemisphereLight args={["#6a4c38", "#0a0604", 0.5]} />
      {/* The glow of the glass, lighting the stone around it from inside the opening. */}
      {[
        [-1.0, 1.4],
        [1.0, 1.4],
        [-1.0, -1.4],
        [1.0, -1.4],
      ].map(([x, y]) => (
        <pointLight key={`${x}${y}`} position={[x, y, 0.4]} intensity={0.9} distance={4.2} decay={2} color="#ffbe7a" />
      ))}
      <pointLight position={[0, -1, DEPTH + 1.6]} intensity={2.2} distance={9} decay={2} color="#ff9f5a" />
      <primitive object={sun.light} />
      <primitive object={sun.light.target} />
      <Wall model={model} />
      <Glass model={model} textures={textures} paneAt={paneAt} selected={selected} spotlight={Boolean(spotlight)} onSelect={onSelect} />
      <Bars model={model} />
      <Air sun={sun} model={model} slices={lite ? 14 : 26} />
      <Dust sun={sun} model={model} />
      <EffectComposer multisampling={lite ? 0 : 4}>
        <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.3} intensity={0.85} radius={0.62} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.28} darkness={0.72} />
      </EffectComposer>
    </>
  );
}

export default function WindowScene({
  goal,
  label,
  selected,
  spotlight = null,
  onSelect,
  insets = { top: 0, bottom: 0 },
  paused = false,
}: {
  goal: DailyGoal;
  label: string;
  selected?: number;
  /** A night to bring forward: the view moves in to its leaf. */
  spotlight?: number | null;
  onSelect?: (day: number) => void;
  /** Pixels covered by the UI above and below, so the window fits between them. */
  insets?: Insets;
  /** Stop drawing (the last frame stays), e.g. while the wind-down covers the window. */
  paused?: boolean;
}) {
  const model = useMemo(() => buildWindow(goal), [goal]);
  const lite = useLite();
  return (
    <div className="absolute inset-0" role="img" aria-label={label}>
      <Canvas
        dpr={[1, lite ? 1.5 : 2]}
        frameloop={paused ? "never" : lite ? "demand" : "always"}
        camera={{ position: [0, -0.5, 16], fov: 36, near: 0.1, far: 80 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        fallback={
          <div className="mx-auto mt-[18vh] w-[62%] max-w-[280px]">
            <FlatWindow model={model} label={label} />
          </div>
        }
      >
        <Scene model={model} selected={selected} spotlight={spotlight} onSelect={onSelect} insets={insets} lite={lite} />
        {lite && !paused && <Pace fps={30} />}
      </Canvas>
    </div>
  );
}
