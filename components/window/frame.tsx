"use client";

// Framing and pacing: where the camera looks (the whole window, or a night's leaf), how often
// it draws, the safety net for slow devices, and compiling the shaders before the first frame.

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Pt } from "@/lib/geometry";
import type { WindowModel } from "@/lib/window-model";
import { SPLAY } from "./shared";

export type Insets = { top: number; bottom: number };

/** How close the view comes to a past night's leaf. */
export const ZOOM = 2.1;

/**
 * Framing: the window (arch to ledge) as big as fits between the text above and the card below.
 * With a past night open, the view glides in to its leaf and centers it there instead.
 */
export function Rig({ model, insets, focus, still }: { model: WindowModel; insets: Insets; focus: Pt | null; still: boolean }) {
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

/**
 * A safety net for devices that can't keep up: if frames take much longer than they should
 * (half again the target, judged over a couple of seconds), draw at a lower resolution from then on.
 */
export function Adapt({ frameMs }: { frameMs: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const samples = useRef<number[]>([]);
  const lowered = useRef(false);
  useFrame((_, delta) => {
    if (lowered.current) return;
    samples.current.push(delta * 1000);
    const total = samples.current.reduce((a, b) => a + b, 0);
    if (total < 2500 || samples.current.length < 5) return;
    const sorted = [...samples.current].sort((a, b) => a - b);
    samples.current = [];
    if (sorted[Math.floor(sorted.length / 2)] > frameMs * 1.5) {
      lowered.current = true;
      setDpr(1);
      performance.mark("window:lowered-resolution");
    }
  });
  return null;
}

/** On a phone, draw at 30 frames a second instead of every frame. */
export function Pace({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const id = setInterval(() => invalidate(), 1000 / fps);
    return () => clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

export function useMedia(query: string) {
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
export const useLite = () => useMedia("(pointer: coarse)");

/** Compiles every shader in the scene in the background, then lets the window be drawn. */
export function Compile({ onCompiled }: { onCompiled: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let live = true;
    const start = performance.now();
    gl.compileAsync(scene, camera).then(() => {
      if (!live) return;
      performance.measure("window:compile", { start, end: performance.now() });
      onCompiled();
    });
    return () => {
      live = false;
    };
  }, [gl, scene, camera, onCompiled]);
  return null;
}

/** Marks the first frame drawn, so the time to a visible window can be measured. */
export function FirstFrame() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    performance.mark("window:first-frame");
  });
  return null;
}
