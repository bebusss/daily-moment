"use client";

// The month's window in 3D (three.js through React Three Fiber). It only draws:
// what each pane is (done, missed, mended, tonight, still to come) comes from
// lib/window-model. Glass has thickness and a hammered surface and glows from
// behind; leads are real metal strips; a mended night's lead is gold. The
// window tilts a little toward the pointer, so it feels like an object.

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { DailyGoal } from "@/lib/data";
import type { Pt } from "@/lib/geometry";
import { hammeredGlass } from "@/lib/hammered";
import { buildWindow, type PaneModel, type WindowModel } from "@/lib/window-model";
import RoseWindow from "./RoseWindow";

/** The window's radius in scene units. */
const S = 1.6;
/** Where the glass's front face is, and where the leads sit on it. */
const GLASS = { depth: 0.035, bevel: 0.01 };
const LEAD_Z = GLASS.depth + 0.004;

type V2 = THREE.Vector2;

function useScene(model: WindowModel) {
  return useMemo(() => {
    const k = S / model.radius;
    const toScene = ([x, y]: Pt): V2 => new THREE.Vector2((x - model.radius) * k, -(y - model.radius) * k);

    /** A shard: the polygon pulled in a hair from its edges (the lead covers the seam), with thickness and bevelled edges. */
    const shard = (points: Pt[]) => {
      const pts = points.map(toScene);
      const c = pts.reduce((a, p) => a.add(p), new THREE.Vector2()).divideScalar(pts.length);
      const inset = pts.map((p) => c.clone().add(p.clone().sub(c).multiplyScalar(Math.max(0, 1 - 0.006 / Math.max(p.distanceTo(c), 1e-3)))));
      return new THREE.ExtrudeGeometry(new THREE.Shape(inset), {
        depth: GLASS.depth,
        bevelEnabled: true,
        bevelThickness: GLASS.bevel,
        bevelSize: 0.007,
        bevelSegments: 2,
        curveSegments: 1,
      });
    };

    /** A lead strip along a closed outline. */
    const strip = (points: Pt[], radius: number, z = LEAD_Z) => {
      const pts = points.map(toScene);
      const path = new THREE.CurvePath<THREE.Vector3>();
      pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length];
        path.add(new THREE.LineCurve3(new THREE.Vector3(a.x, a.y, z), new THREE.Vector3(b.x, b.y, z)));
      });
      return new THREE.TubeGeometry(path, pts.length * 3, radius, 6, true);
    };

    const panes = model.panes.map((p) => ({ pane: p, shards: p.shards.map((s) => ({ ...s, geometry: shard(s.points) })) }));
    // Every ordinary lead in one mesh: thin between shards, thicker between nights.
    const leads = mergeGeometries([
      ...model.panes.flatMap((p) => p.shards.map((s) => strip(s.points, 0.011))),
      ...model.panes.filter((p) => !p.mended).map((p) => strip(p.outline, 0.02)),
    ]);
    const gold = model.panes.filter((p) => p.mended).map((p) => ({ day: p.day, geometry: strip(p.outline, 0.024, LEAD_Z + 0.014) }));
    const tonight = model.panes.filter((p) => p.status === "today").map((p) => ({ day: p.day, geometry: strip(p.outline, 0.011) }));
    const rings = model.rings.map((r) => r * k);
    return { panes, leads, gold, tonight, rings };
  }, [model]);
}

/**
 * How each kind of pane's glass behaves. Lit glass glows from behind (deeper on heavier nights);
 * clear glass is frosted and quiet; unlit glass stays dark and matte, so it doesn't mirror the room.
 */
function look(p: PaneModel) {
  if (p.status === "done") return { glow: p.weight === 3 ? 0.78 : p.weight === 1 ? 0.42 : 0.58, rough: 0.28, coat: 0.5, env: 0.2, bump: 0.9 };
  if (p.status === "gap") return { glow: 0.1, rough: 0.55, coat: 0.2, env: 0.14, bump: 0.6 };
  if (p.status === "today") return { glow: 0.04, rough: 0.8, coat: 0, env: 0.05, bump: 0.3 };
  return { glow: 0, rough: 0.85, coat: 0, env: 0.05, bump: 0.35 };
}

/** Lit glass: its own color is the light coming through; the surface itself is darker. */
const body = (hex: string, status: PaneModel["status"]) => (status === "done" ? new THREE.Color(hex).multiplyScalar(0.5) : new THREE.Color(hex));

/** Soft studio reflections, so metal looks like metal and glass catches highlights. No image files. */
function Reflections() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  // Attached to the scene as its environment (React Three Fiber's `attach`).
  return <primitive attach="environment" object={env} />;
}

/** The light behind the window, as a soft disc. */
function Halo() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(150,170,235,0.32)");
    grad.addColorStop(0.45, "rgba(80,100,180,0.14)");
    grad.addColorStop(1, "rgba(10,14,24,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh position={[0, 0, -0.35]}>
      <planeGeometry args={[S * 2.9, S * 2.9]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/** Follows the pointer (or drifts slowly on its own), a few degrees at most. */
function Tilt({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const still = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g || still) return;
    const t = state.clock.elapsedTime;
    const x = -state.pointer.y * 0.2 + Math.sin(t * 0.35) * 0.035;
    const y = state.pointer.x * 0.26 + Math.cos(t * 0.27) * 0.045;
    const ease = Math.min(1, dt * 2.5);
    g.rotation.x += (x - g.rotation.x) * ease;
    g.rotation.y += (y - g.rotation.y) * ease;
  });
  return <group ref={group}>{children}</group>;
}

/** Tonight's pane, breathing slowly while it waits. */
function Waiting({ geometry }: { geometry: THREE.BufferGeometry }) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (material.current) material.current.emissiveIntensity = 0.55 + Math.sin(state.clock.elapsedTime * 1.6) * 0.35;
  });
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={material} color="#f1ebdd" emissive="#f1ebdd" emissiveIntensity={0.6} roughness={0.4} />
    </mesh>
  );
}

function Window({ model }: { model: WindowModel }) {
  const { panes, leads, gold, tonight, rings } = useScene(model);
  const normalMap = useMemo(() => hammeredGlass(), []);
  return (
    <Tilt>
      {/* Stone frame. */}
      <mesh position={[0, 0, 0.01]}>
        <torusGeometry args={[S + 0.06, 0.075, 16, 128]} />
        <meshStandardMaterial color="#161a24" roughness={0.9} metalness={0.05} envMapIntensity={0.3} />
      </mesh>
      {/* The glass, shard by shard. */}
      {panes.map(({ pane, shards }) => {
        const l = look(pane);
        return shards.map((s, i) => (
          <mesh key={`${pane.day}-${i}`} geometry={s.geometry}>
            <meshPhysicalMaterial
              color={body(s.color, pane.status)}
              emissive={s.color}
              emissiveIntensity={l.glow}
              roughness={l.rough}
              metalness={0}
              clearcoat={l.coat}
              clearcoatRoughness={0.25}
              envMapIntensity={l.env}
              normalMap={normalMap}
              normalScale={new THREE.Vector2(l.bump, l.bump)}
              transparent={s.opacity < 1}
              opacity={s.opacity}
            />
          </mesh>
        ));
      })}
      {/* Lead: one dark pewter mesh. */}
      <mesh geometry={leads ?? undefined}>
        <meshStandardMaterial color="#1b1e24" metalness={0.7} roughness={0.5} envMapIntensity={0.5} />
      </mesh>
      {/* Stone tracery between the rings. */}
      {rings.map((r) => (
        <mesh key={r} position={[0, 0, LEAD_Z]}>
          <torusGeometry args={[r, 0.022, 10, 128]} />
          <meshStandardMaterial color="#1c202b" metalness={0.3} roughness={0.75} envMapIntensity={0.4} />
        </mesh>
      ))}
      {/* Gold mending leads around the nights you came back from. */}
      {gold.map(({ day, geometry }) => (
        <mesh key={day} geometry={geometry}>
          <meshStandardMaterial color="#f2c063" metalness={1} roughness={0.2} emissive="#b07413" emissiveIntensity={0.45} />
        </mesh>
      ))}
      {tonight.map(({ day, geometry }) => (
        <Waiting key={day} geometry={geometry} />
      ))}
    </Tilt>
  );
}

export default function GlassWindow({ goal, label }: { goal: DailyGoal; label: string }) {
  const model = useMemo(() => buildWindow(goal), [goal]);
  return (
    <div
      className="aspect-square w-full"
      role="img"
      aria-label={label}
      // The canvas fades into the page at its edges, so there's no visible box around the window.
      style={{ maskImage: "radial-gradient(circle, black 66%, transparent 76%)", WebkitMaskImage: "radial-gradient(circle, black 66%, transparent 76%)" }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6.4], fov: 34 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        fallback={<RoseWindow model={model} label={label} />}
      >
        <Reflections />
        <ambientLight intensity={0.25} />
        <directionalLight position={[-2.5, 3, 4]} intensity={0.8} />
        <Halo />
        <Window model={model} />
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={0.55} luminanceSmoothing={0.25} intensity={0.7} radius={0.65} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
