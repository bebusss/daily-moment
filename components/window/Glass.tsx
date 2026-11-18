"use client";

// The glass itself: one plane, drawn by a shader from the painted window. Each piece passes
// the evening's light in its own color; tonight's leaf breathes; a leaf just set fills in with
// its color; a night in the spotlight comes forward; mended nights' lead shines gold.

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { PaintedWindow } from "@/lib/paint";
import type { WindowModel } from "@/lib/window-model";
import type { Painted } from "./textures";

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
    },
  });
}

export function Glass({
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
  const drawn = useRef<{ textures: Painted; today: number } | null>(null);
  const lastPick = useRef(-1);
  const fill = useRef<{
    from: Painted;
    index: number;
    start: number | null;
  } | null>(null);

  useEffect(() => {
    const before = drawn.current;
    if (before && before.textures !== textures && before.today >= 0 && model.panes[before.today]?.status === "done") {
      fill.current = {
        from: before.textures,
        index: before.today,
        start: null,
      };
    }
    drawn.current = { textures, today: todayIndex };
  }, [textures, model, todayIndex]);

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
