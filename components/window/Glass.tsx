"use client";

// The glass itself: one plane, drawn by a shader from the painted window. Each piece passes
// the evening's light in its own color; tonight's leaf breathes; a leaf just set fills in with
// its color; a night in the spotlight comes forward; mended nights' lead shines gold. Tonight's
// real weather (lib/sky) shows on it: clouds soften the light, rain leaves drops on the glass.

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { centroid, type Pt } from "@/lib/geometry";
import type { PaintedWindow } from "@/lib/paint";
import { leafMid } from "@/lib/vine";
import type { PaneModel, WindowModel } from "@/lib/window-model";
import { rainTexture, type Painted } from "./textures";

// The glass

export const glassVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const glassFragment = /* glsl */ `
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
  uniform sampler2D rainMap;
  uniform float rain;
  uniform float clouds;
  uniform float solder;
  uniform float solderHeat;
  uniform vec2 solderC;
  uniform vec2 solderAx;
  uniform vec2 solderHalf;
  uniform float solderStart;
  uniform vec2 solderAt;
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
    // (Tomorrow's leaf, once tonight's is set, has a fainter glow painted in the same channel.)
    light += mask.g * waiting;
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

    // Tonight's weather: a cloudy evening is softer; rain leaves drops on the glass, some still,
    // some running down, each one a little lens that shows the outside and catches a highlight.
    light *= 1.0 - clouds * 0.22;
    if (rain > 0.001) {
      vec2 ruv = vUv * size * 0.65;
      // Drops sitting on the glass, and others running down it, drawn out into trails.
      vec4 still = texture2D(rainMap, ruv);
      vec4 run = texture2D(rainMap, vec2(ruv.x * 1.4 + 0.31, ruv.y * 0.3 + time * 0.07));
      vec4 drop = still.a > run.a ? still : run;
      float a = drop.a;
      // Backlit, a drop is a dark rim (the light bends away at its edge) round a bright core
      // that shows the outside, bent.
      float rim = smoothstep(0.12, 0.45, a) * (1.0 - smoothstep(0.5, 0.9, a));
      float core = smoothstep(0.65, 0.95, a);
      vec2 bend = (drop.rg - 0.5) * 0.03;
      vec3 through = mix(texture2D(outSharp, vUv + bend).rgb, texture2D(outSoft, vUv + bend).rgb, milk * 0.7) * exposure;
      light *= 1.0 - rim * 0.5 * rain;
      light = mix(light, through * mix(glass, vec3(1.0), 0.35), core * 0.5 * rain);
      light += vec3(1.0, 0.95, 0.86) * drop.b * rain * 0.45;
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

    // Gold mends the nights someone came back from: a came of its own over the lead, half-round,
    // and polished. Metal has no color of its own to show; it shows the room, tinted gold: the
    // window's warm glow where its curve faces it, a hot highlight along that edge, dark where it
    // turns away. Now and then a glint runs along it.
    float gh = mask.r;
    float gold = smoothstep(0.03, 0.28, gh);
    vec3 goldColor = vec3(0.0);
    vec2 p = (vUv - 0.5) * size;
    if (gold > 0.001) {
      vec2 o = texel * 1.5;
      float gx = texture2D(maskMap, vUv + vec2(o.x, 0.0)).r - texture2D(maskMap, vUv - vec2(o.x, 0.0)).r;
      float gy = texture2D(maskMap, vUv + vec2(0.0, o.y)).r - texture2D(maskMap, vUv - vec2(0.0, o.y)).r;
      vec3 gn = normalize(vec3(-gx * 5.0, -gy * 5.0, 1.0));
      vec3 R = reflect(vec3(0.0, 0.0, -1.0), gn);
      vec3 Lw = normalize(vec3(-0.45, 0.55, 0.7));
      float facing = dot(R, Lw);
      vec3 room = vec3(0.03, 0.018, 0.008);
      room += vec3(0.95, 0.66, 0.32) * smoothstep(0.3, 0.95, facing);
      room += vec3(1.1, 1.0, 0.8) * pow(max(facing, 0.0), 24.0) * 2.2;
      room += vec3(0.3, 0.14, 0.04) * smoothstep(0.0, -0.7, R.y);
      vec3 F0 = vec3(1.0, 0.71, 0.29);
      vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(gn.z, 0.0), 5.0);
      // Darker at its very edges, where it meets the glass.
      goldColor = room * F * mix(0.3, 1.0, smoothstep(0.05, 0.45, gh));
      float along = dot(p, vec2(0.8, 0.6));
      float sweep = mod(time * 0.45, 9.0) - 3.0;
      goldColor += F * vec3(1.0, 0.9, 0.7) * exp(-pow((along - sweep) / 0.07, 2.0)) * 1.6 * smoothstep(0.4, 1.0, gh);
      // An opened mended night shines a little more.
      goldColor *= 1.0 + isSelected * focus * 0.25;
    }

    // Soldering: a mended night just opened has its gold laid again. A hot point runs round its
    // piece; ahead of it the lead is still plain, behind it the gold is molten, then cools.
    vec3 glow = vec3(0.0);
    if (solder >= 0.0) {
      vec2 sp = p - solderC;
      vec2 q = vec2(dot(sp, solderAx), dot(sp, vec2(-solderAx.y, solderAx.x))) / solderHalf;
      float mine = 1.0 - smoothstep(0.5, 0.8, abs(length(q) - 1.0));
      float at = fract((atan(q.y, q.x) - solderStart) / 6.28318);
      float behind = solder - at;
      float laid = step(0.0, behind);
      gold *= mix(1.0, laid, mine);
      // Right behind the iron it's white-hot; the rest of the new gold is a dull red-orange that
      // cools back to gold.
      float fresh = mine * laid * exp(-behind * 14.0);
      float warm = mine * laid * solderHeat;
      goldColor = mix(goldColor, goldColor * vec3(1.5, 0.62, 0.25) + vec3(0.35, 0.06, 0.0), warm * 0.75);
      vec3 hot = mix(vec3(2.3, 1.3, 0.32), vec3(4.2, 3.4, 2.2), smoothstep(0.55, 1.0, fresh));
      goldColor = mix(goldColor, hot, smoothstep(0.0, 0.5, fresh));
      // The iron's own light, on the glass and the lead round it.
      if (solder > 0.0 && solder < 1.0) {
        float dd = length(p - solderAt);
        float flicker = 0.85 + 0.15 * sin(time * 47.0) * sin(time * 31.0);
        glow = (vec3(3.2, 2.2, 1.2) * exp(-dd * dd / 0.0009) + vec3(1.0, 0.5, 0.16) * exp(-dd * dd / 0.012) * 0.7) * flicker;
      }
    }

    float cover = max(smoothstep(0.1, 0.38, h), gold);
    vec3 color = mix(light, mix(lead, goldColor, gold), cover) + glow;

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * The glass's material is made once and its textures swapped on it as the window changes:
 * making a new one would make the graphics card compile the same program again (about a
 * third of a second on a phone, right as tonight's leaf is set).
 */
export function glassMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: glassVertex,
    fragmentShader: glassFragment,
    uniforms: {
      glassMap: { value: null },
      prevMap: { value: null },
      leadMap: { value: null },
      maskMap: { value: null },
      prevMask: { value: null },
      idMap: { value: null },
      outSharp: { value: null },
      outSoft: { value: null },
      texel: { value: new THREE.Vector2() },
      size: { value: new THREE.Vector2() },
      sun: { value: new THREE.Vector2() },
      exposure: { value: 1.9 },
      time: { value: 0 },
      today: { value: 0 },
      filling: { value: 0 },
      selected: { value: 0 },
      reveal: { value: 1 },
      focus: { value: 0 },
      picked: { value: 0 },
      rainMap: { value: rainTexture() },
      rain: { value: 0 },
      clouds: { value: 0 },
      solder: { value: -1 },
      solderHeat: { value: 0 },
      solderC: { value: new THREE.Vector2() },
      solderAx: { value: new THREE.Vector2(1, 0) },
      solderHalf: { value: new THREE.Vector2(1, 1) },
      solderStart: { value: 0 },
      solderAt: { value: new THREE.Vector2() },
    },
  });
}

/** How long the iron takes to go round a piece, and how long the gold then takes to cool (seconds). */
const RUN = 2.0;
const COOL = 1.8;

type Iron = { on: boolean; at: Pt };

/**
 * The path the iron takes round a piece: the piece's own frame (its middle, its long axis and how
 * far it reaches each way), the angle it starts from (a leaf's base), and where the iron is when
 * it has gone `s` of the way round. The shader measures "how far round" the same way.
 */
function ironPath(pane: PaneModel) {
  const c = centroid(pane.points);
  let [sxx, syy, sxy] = [0, 0, 0];
  for (const [x, y] of pane.points) {
    const [dx, dy] = [x - c[0], y - c[1]];
    [sxx, syy, sxy] = [sxx + dx * dx, syy + dy * dy, sxy + dx * dy];
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ax: Pt = [Math.cos(angle), Math.sin(angle)];
  const local = ([x, y]: Pt): Pt => [(x - c[0]) * ax[0] + (y - c[1]) * ax[1], -(x - c[0]) * ax[1] + (y - c[1]) * ax[0]];
  let [hx, hy] = [1e-3, 1e-3];
  for (const pt of pane.points) {
    const [a, b] = local(pt);
    [hx, hy] = [Math.max(hx, Math.abs(a)), Math.max(hy, Math.abs(b))];
  }
  const turn = (pt: Pt) => {
    const [a, b] = local(pt);
    return Math.atan2(b / hy, a / hx);
  };
  const startAngle = pane.leaf ? turn(leafMid(pane.leaf, 0)) : Math.PI;
  const round = (pt: Pt) => ((((turn(pt) - startAngle) / (2 * Math.PI)) % 1) + 1) % 1;
  const ats = pane.points.map(round);
  const at = (s: number): Pt => {
    for (let i = 0; i < pane.points.length; i++) {
      const j = (i + 1) % pane.points.length;
      const a = ats[i];
      let b = ats[j];
      if (Math.abs(b - a) > 0.5) b += b < a ? 1 : -1;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      for (const v of [s, s + 1, s - 1])
        if (v >= lo && v <= hi && hi > lo) {
          const k = (v - a) / (b - a);
          const [p, q] = [pane.points[i], pane.points[j]];
          return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
        }
    }
    return c;
  };
  return { c, ax, half: [hx, hy] as Pt, startAngle, at };
}

/**
 * Sparks off the iron: a few dozen points thrown up and out, falling, going from white-hot to
 * orange as they die. Always in the scene (so its shader compiles with the rest), drawing nothing
 * while the iron is cold.
 */
const SPARKS = 96;

function sparkMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { scale: { value: 2 } },
    vertexShader: /* glsl */ `
      attribute float life;
      uniform float scale;
      varying float vLife;
      void main() {
        vLife = life;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = life > 0.0 ? (1.5 + 3.5 * life) * scale / -mv.z : 0.0;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main() {
        float a = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5)) * vLife;
        vec3 color = mix(vec3(1.8, 0.55, 0.12), vec3(3.2, 2.6, 1.7), smoothstep(0.45, 1.0, vLife));
        gl_FragColor = vec4(color * a, a);
      }
    `,
  });
}

function Sparks({ iron }: { iron: RefObject<Iron> }) {
  const points = useRef<THREE.Points>(null);
  const material = useMemo(() => sparkMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);
  const [buffers] = useState(() => ({ position: new Float32Array(SPARKS * 3), life: new Float32Array(SPARKS) }));
  const sim = useRef({
    vel: new Float32Array(SPARKS * 3),
    age: new Float32Array(SPARKS).fill(9),
    span: new Float32Array(SPARKS).fill(1),
    next: 0,
    carry: 0,
    live: false,
  });

  useFrame((state, delta) => {
    const pts = points.current;
    if (!pts) return;
    const s = sim.current;
    const dt = Math.min(delta, 0.05);
    const { on, at } = iron.current;
    if (!on && !s.live) return;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const life = pts.geometry.attributes.life as THREE.BufferAttribute;
    if (on) {
      s.carry += dt * 110;
      while (s.carry >= 1) {
        s.carry -= 1;
        const i = s.next;
        s.next = (s.next + 1) % SPARKS;
        const a = Math.random() * Math.PI * 1.25 - Math.PI * 0.12;
        const speed = 0.35 + Math.random() * 0.9;
        pos.setXYZ(i, at[0] + (Math.random() - 0.5) * 0.01, at[1] + (Math.random() - 0.5) * 0.01, 0.02);
        s.vel.set([Math.cos(a) * speed, Math.sin(a) * speed * 1.1, 0.15 + Math.random() * 0.5], i * 3);
        s.age[i] = 0;
        s.span[i] = 0.25 + Math.random() * 0.55;
      }
    }
    let any = false;
    for (let i = 0; i < SPARKS; i++) {
      if (s.age[i] >= s.span[i]) {
        life.setX(i, 0);
        continue;
      }
      any = true;
      s.age[i] += dt;
      s.vel[i * 3 + 1] -= 3.4 * dt;
      pos.setXYZ(i, pos.getX(i) + s.vel[i * 3] * dt, pos.getY(i) + s.vel[i * 3 + 1] * dt, pos.getZ(i) + s.vel[i * 3 + 2] * dt);
      life.setX(i, Math.max(0, 1 - s.age[i] / s.span[i]));
    }
    s.live = any;
    pos.needsUpdate = true;
    life.needsUpdate = true;
    (pts.material as THREE.ShaderMaterial).uniforms.scale.value = 9 * state.gl.getPixelRatio();
  });

  return (
    <points ref={points} material={material} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buffers.position, 3]} />
        <bufferAttribute attach="attributes-life" args={[buffers.life, 1]} />
      </bufferGeometry>
    </points>
  );
}

export function Glass({
  model,
  textures,
  paneAt,
  selected,
  spotlight,
  still = false,
  weather,
  onSelect,
}: {
  model: WindowModel;
  spotlight: boolean;
  /** Reduced motion: no soldering, the gold is simply there. */
  still?: boolean;
  weather?: { rain: boolean; clouds: number };
  textures: Painted;
  paneAt: (u: number, v: number) => ReturnType<PaintedWindow["paneAt"]>;
  selected?: number;
  onSelect?: (day: number) => void;
}) {
  const material = useMemo(() => glassMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);
  const mesh = useRef<THREE.Mesh>(null);
  const todayIndex = model.panes.findIndex((p) => p.status === "today");
  const shown = selected ?? model.panes[todayIndex]?.day;
  const selectedIndex = model.panes.findIndex((p) => p.day === shown);
  // The last window drawn and its waiting leaf, so a leaf just filled in can come up from it.
  const drawn = useRef<{ textures: Painted; today: number; id: string; mended: boolean[] } | null>(null);
  const lastPick = useRef(-1);
  const fill = useRef<{
    from: Painted;
    index: number;
    start: number | null;
  } | null>(null);
  // The iron going round a mended night that was just opened, and where it is, for the sparks.
  const solder = useRef<(ReturnType<typeof ironPath> & { start: number }) | null>(null);
  const iron = useRef<Iron>({ on: false, at: [0, 0] });

  useEffect(() => {
    const before = drawn.current;
    if (before && before.id === model.id && before.textures !== textures && before.today >= 0 && model.panes[before.today]?.status === "done") {
      fill.current = {
        from: before.textures,
        index: before.today,
        start: null,
      };
      // A clear night this one just mended keeps its plain lead until its gold is soldered: the
      // view comes to it once tonight's leaf has filled in (or, if it doesn't, the iron starts anyway).
      const fresh = model.panes.filter((p, i) => p.mended && !before.mended[i]);
      const latest = fresh.reduce<PaneModel | undefined>((a, p) => (!a || (p.day ?? 0) > (a.day ?? 0) ? p : a), undefined);
      if (latest && !still) solder.current = { ...ironPath(latest), start: NaN };
    }
    drawn.current = { textures, today: todayIndex, id: model.id, mended: model.panes.map((p) => p.mended) };
  }, [textures, model, todayIndex, still]);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const u = (mesh.current.material as THREE.ShaderMaterial).uniforms;
    const t = state.clock.elapsedTime;
    u.glassMap.value = textures.glass;
    u.leadMap.value = textures.lead;
    u.maskMap.value = textures.mask;
    u.idMap.value = textures.ids;
    u.outSharp.value = textures.sharp;
    u.outSoft.value = textures.soft;
    u.sun.value.copy(textures.sun);
    u.texel.value.set(1 / textures.lead.image.width, 1 / textures.lead.image.height);
    u.size.value.set(model.width, model.height);
    u.time.value = t;
    // The weather comes in gently when it arrives.
    const ease = Math.min(1, delta * 0.8);
    u.rain.value += ((weather?.rain ? 1 : 0) - u.rain.value) * ease;
    u.clouds.value += ((weather?.clouds ?? 0) - u.clouds.value) * ease;
    u.selected.value = selectedIndex + 1;
    u.today.value = todayIndex + 1;
    if (lastPick.current !== selectedIndex) {
      lastPick.current = selectedIndex;
      u.picked.value = t + 0.35;
      // A mended night opened: once the view has arrived, its gold is soldered again.
      const pane = model.panes[selectedIndex];
      solder.current = spotlight && !still && pane?.mended ? { ...ironPath(pane), start: t + 0.8 } : null;
    }
    const s = solder.current;
    if (s && Number.isNaN(s.start)) s.start = t + 4.2;
    if (s && t > s.start + RUN + COOL) solder.current = null;
    if (solder.current && s) {
      const run = Math.max(0, Math.min(1, (t - s.start) / RUN));
      u.solder.value = run;
      u.solderHeat.value = 1 - Math.max(0, Math.min(1, (t - s.start - RUN) / COOL));
      u.solderC.value.set(...s.c);
      u.solderAx.value.set(...s.ax);
      u.solderHalf.value.set(...s.half);
      u.solderStart.value = s.startAngle;
      const at = s.at(run);
      u.solderAt.value.set(...at);
      iron.current = { on: run > 0 && run < 1, at };
    } else {
      u.solder.value = -1;
      iron.current = { on: false, at: iron.current.at };
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
    <>
      <Sparks iron={iron} />
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
    </>
  );
}
