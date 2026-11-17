"use client";

// The month's window in 3D (three.js through React Three Fiber). It only draws:
// what each piece of glass is (a night done, missed, mended, tonight, still to come,
// or decoration) comes from lib/window-model. The glass is lit from behind and
// textured like rolled cathedral glass; the leads are metal; a mended night's lead
// is gold; the frame is wood. The window tilts a little toward the pointer.

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { DailyGoal } from "@/lib/data";
import type { Pt } from "@/lib/geometry";
import { cathedralGlass, turned } from "@/lib/streaks";
import { buildWindow, type PaneModel, type WindowModel } from "@/lib/window-model";
import FlatWindow from "./FlatWindow";

const GLASS = { depth: 0.03, bevel: 0.008 };
const LEAD_Z = GLASS.depth + 0.006;
const FRAME = 0.15;

const v2 = ([x, y]: Pt) => new THREE.Vector2(x, y);

/** A lead strip along a closed outline. */
function strip(points: Pt[], radius: number, z = LEAD_Z) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    path.add(new THREE.LineCurve3(new THREE.Vector3(x, y, z), new THREE.Vector3(nx, ny, z)));
  });
  return new THREE.TubeGeometry(path, points.length * 4, radius, 6, true);
}

/** A piece of glass with thickness and softened edges. */
function glass(points: Pt[]) {
  return new THREE.ExtrudeGeometry(new THREE.Shape(points.map(v2)), {
    depth: GLASS.depth,
    bevelEnabled: true,
    bevelThickness: GLASS.bevel,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 1,
  });
}

/** The wood frame: the window's outline grown outward, with the window cut out of it. */
function frame(model: WindowModel) {
  const bottom = -model.height / 2;
  const spring = bottom + model.height - model.width / 2;
  const grow = ([x, y]: Pt): Pt => {
    if (y <= spring + 1e-6) return [x + Math.sign(x) * FRAME, y <= bottom + 1e-6 ? y - FRAME : y];
    const a = Math.atan2(y - spring, x);
    const r = model.width / 2 + FRAME;
    return [r * Math.cos(a), spring + r * Math.sin(a)];
  };
  const shape = new THREE.Shape(model.outline.map(grow).map(v2));
  shape.holes.push(new THREE.Path(model.outline.map(v2).reverse()));
  return new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 1 });
}

/** How brightly each kind of glass lets the light through. Heavier nights glow deeper. */
function glow(p: PaneModel): number {
  switch (p.status) {
    case "done":
      return p.weight === 3 ? 1.3 : p.weight === 1 ? 0.85 : 1.05;
    case "gap":
      return 0.42;
    case "jewel":
      return 1.05;
    case "crown":
      return 0.9;
    case "today":
      return 0.38;
    default:
      return 0.2;
  }
}

/** Soft studio reflections, so metal looks like metal. No image files. */
function Reflections() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return <primitive attach="environment" object={env} />;
}

/** Warm light behind the window, seeping around the frame. */
function Backlight({ model }: { model: WindowModel }) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,190,120,0.5)");
    grad.addColorStop(0.5, "rgba(255,150,80,0.16)");
    grad.addColorStop(1, "rgba(255,140,60,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh position={[0, 0.2, -0.3]}>
      <planeGeometry args={[model.width * 1.3, model.height * 1.15]} />
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
    const x = -state.pointer.y * 0.16 + Math.sin(t * 0.35) * 0.03;
    const y = state.pointer.x * 0.22 + Math.cos(t * 0.27) * 0.04;
    const ease = Math.min(1, dt * 2.5);
    g.rotation.x += (x - g.rotation.x) * ease;
    g.rotation.y += (y - g.rotation.y) * ease;
  });
  return <group ref={group}>{children}</group>;
}

/** Tonight's pane, its lead breathing slowly while it waits. */
function Waiting({ geometry }: { geometry: THREE.BufferGeometry }) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (material.current) material.current.emissiveIntensity = 0.7 + Math.sin(state.clock.elapsedTime * 1.6) * 0.45;
  });
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={material} color="#f3eadc" emissive="#ffd9a0" emissiveIntensity={0.7} roughness={0.4} />
    </mesh>
  );
}

function Window({ model }: { model: WindowModel }) {
  const parts = useMemo(() => {
    const leads = mergeGeometries([
      ...model.panes.filter((p) => !p.mended).map((p) => strip(p.points, p.kind === "jewel" ? 0.009 : 0.013)),
      strip(model.outline, 0.02),
    ]);
    return {
      panes: model.panes.map((p) => ({ pane: p, geometry: glass(p.points) })),
      leads,
      gold: model.panes.filter((p) => p.mended).map((p) => ({ key: p.key, geometry: strip(p.points, 0.02, LEAD_Z + 0.01) })),
      tonight: model.panes.filter((p) => p.status === "today").map((p) => ({ key: p.key, geometry: strip(p.points, 0.014, LEAD_Z + 0.008) })),
      frame: frame(model),
    };
  }, [model]);
  const { light, ripples } = useMemo(() => cathedralGlass(), []);
  // Every pane gets its own turn of the texture, like separately cut pieces of glass.
  const textures = useMemo(() => model.panes.map((_, i) => ({ light: turned(light, i + 1), ripples: turned(ripples, i + 1) })), [model, light, ripples]);

  return (
    <Tilt>
      <mesh geometry={parts.frame} position={[0, 0, -0.04]}>
        <meshStandardMaterial color="#3a2517" roughness={0.75} metalness={0} envMapIntensity={0.35} />
      </mesh>
      {parts.panes.map(({ pane, geometry }, i) => (
        <mesh key={pane.key} geometry={geometry}>
          <meshPhysicalMaterial
            color={new THREE.Color(pane.color).multiplyScalar(0.28)}
            emissive={pane.color}
            emissiveMap={textures[i].light}
            emissiveIntensity={glow(pane)}
            roughness={0.32}
            metalness={0}
            clearcoat={0.35}
            clearcoatRoughness={0.3}
            envMapIntensity={0.12}
            normalMap={textures[i].ripples}
            normalScale={new THREE.Vector2(0.55, 0.55)}
          />
        </mesh>
      ))}
      <mesh geometry={parts.leads ?? undefined}>
        <meshStandardMaterial color="#1f1712" metalness={0.6} roughness={0.5} envMapIntensity={0.45} />
      </mesh>
      {parts.gold.map(({ key, geometry }) => (
        <mesh key={key} geometry={geometry}>
          <meshStandardMaterial color="#f0bd5e" metalness={1} roughness={0.22} emissive="#c0821c" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {parts.tonight.map(({ key, geometry }) => (
        <Waiting key={key} geometry={geometry} />
      ))}
    </Tilt>
  );
}

export default function GlassWindow({ goal, label }: { goal: DailyGoal; label: string }) {
  const model = useMemo(() => buildWindow(goal), [goal]);
  return (
    <div
      className="w-full"
      role="img"
      aria-label={label}
      // The canvas fades out toward its edges, so its glow blends into the room with no visible box.
      style={{
        aspectRatio: "0.72",
        maskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, black 86%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 50%, black 86%, transparent 100%)",
      }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 9.3], fov: 30 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        fallback={<FlatWindow model={model} label={label} />}
      >
        <Reflections />
        <ambientLight intensity={0.3} />
        <directionalLight position={[-2, 3, 4]} intensity={0.55} color="#ffe2c0" />
        <Backlight model={model} />
        <Window model={model} />
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={0.5} luminanceSmoothing={0.3} intensity={1} radius={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
