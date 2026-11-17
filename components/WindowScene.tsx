"use client";

// The month's window, set into the wall of a dim room at golden hour (three.js
// through React Three Fiber). It only draws: what each piece of glass is comes
// from lib/window-model.
//
// - The window sits at the back of a deep recess in a thick plaster wall.
// - Behind the glass is the evening outside (lib/light-through): each pane is lit by
//   its own part of the sky and tinted by its color; clear glass shows the outside;
//   nights still to come are milky glass.
// - The light comes into the room: it lights the recess, and the window's colors
//   land on the sill. A little dust drifts in it. The camera never moves.

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { DailyGoal } from "@/lib/data";
import { seeded, type Pt } from "@/lib/geometry";
import { cast, outside } from "@/lib/light-through";
import { cathedralGlass, plaster, turned } from "@/lib/streaks";
import { buildWindow, type PaneModel, type WindowModel } from "@/lib/window-model";
import FlatWindow from "./FlatWindow";


/** How deep the window sits in the wall, and the wood frame's width. */
const DEPTH = 0.7;
const FRAME = 0.16;
/** The glass sits near the back of the recess. */
const GLASS_Z = -DEPTH + 0.08;

const v2 = ([x, y]: Pt) => new THREE.Vector2(x, y);

/** The window's outline grown outward by `by` (the straight sides out, the arch's radius up). */
function grow(model: WindowModel, by: number): Pt[] {
  const bottom = -model.height / 2;
  const spring = bottom + model.height - model.width / 2;
  return model.outline.map(([x, y]) => {
    if (y <= spring + 1e-6) return [x + Math.sign(x) * by, y <= bottom + 1e-6 ? y - by : y];
    const a = Math.atan2(y - spring, x);
    const r = model.width / 2 + by;
    return [r * Math.cos(a), spring + r * Math.sin(a)];
  });
}

/** A lead strip along a closed outline. */
function strip(points: Pt[], radius: number, z: number) {
  const path = new THREE.CurvePath<THREE.Vector3>();
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    path.add(new THREE.LineCurve3(new THREE.Vector3(x, y, z), new THREE.Vector3(nx, ny, z)));
  });
  return new THREE.TubeGeometry(path, points.length * 4, radius, 6, true);
}

/**
 * How each kind of glass passes the light. Lit nights glow (deeper on heavier nights);
 * clear glass lets the outside through almost untouched; milky glass (nights to come) glows softly.
 */
function glass(p: PaneModel): { tint: string; glow: number; rough: number } {
  switch (p.status) {
    case "done":
      return { tint: p.color, glow: p.weight === 3 ? 1.6 : p.weight === 1 ? 1.12 : 1.35, rough: 0.3 };
    case "crown":
      return { tint: p.color, glow: 1.25, rough: 0.3 };
    case "gap":
      return { tint: "#fff1df", glow: 0.8, rough: 0.25 };
    case "jewel":
      return { tint: "#fff6e8", glow: 1.05, rough: 0.2 };
    case "today":
      return { tint: "#e9dccb", glow: 0.34, rough: 0.7 };
    default:
      return { tint: "#e2d4c2", glow: 0.26, rough: 0.75 };
  }
}

/**
 * Soft reflections for the metal and the glass only. (Set on the whole scene, three.js lights every
 * surface with it at full strength, whatever a material asks: the wall glowed like a studio.)
 */
function useReflections() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return env;
}

/** The plaster wall with the recess cut into it, the wood sill below. */
function Wall({ model }: { model: WindowModel }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape([v2([-16, -18]), v2([16, -18]), v2([16, 14]), v2([-16, 14])]);
    shape.holes.push(new THREE.Path(grow(model, FRAME).map(v2).reverse()));
    return new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: false, curveSegments: 1 });
  }, [model]);
  const sillY = -model.height / 2 - FRAME;
  const surface = useMemo(() => plaster(), []);
  return (
    <>
      <mesh geometry={geometry} position={[0, 0, -DEPTH]}>
        <meshStandardMaterial color="#6b4e3b" roughness={0.95} metalness={0} normalMap={surface} normalScale={new THREE.Vector2(0.8, 0.8)} />
      </mesh>
      <mesh position={[0, sillY - 0.07, 0.14]}>
        <boxGeometry args={[model.width + FRAME * 2 + 0.5, 0.14, 0.32]} />
        <meshStandardMaterial color="#6a4429" roughness={0.6} metalness={0} />
      </mesh>
    </>
  );
}

/** The window itself: wood frame, glass, leads, gold mending leads, and tonight's pane waiting. */
function Window({ model }: { model: WindowModel }) {
  const parts = useMemo(() => {
    const frameShape = new THREE.Shape(grow(model, FRAME).map(v2));
    frameShape.holes.push(new THREE.Path(model.outline.map(v2).reverse()));
    return {
      frame: new THREE.ExtrudeGeometry(frameShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 1 }),
      panes: model.panes.map((p) => ({
        pane: p,
        geometry: new THREE.ExtrudeGeometry(new THREE.Shape(p.points.map(v2)), {
          depth: 0.025,
          bevelEnabled: true,
          bevelThickness: 0.006,
          bevelSize: 0.005,
          bevelSegments: 2,
          curveSegments: 1,
        }),
      })),
      leads: mergeGeometries([
        ...model.panes.filter((p) => !p.mended).map((p) => strip(p.points, p.kind === "jewel" ? 0.009 : 0.014, GLASS_Z + 0.035)),
        strip(model.outline, 0.022, GLASS_Z + 0.035),
      ]),
      gold: model.panes.filter((p) => p.mended).map((p) => ({ key: p.key, geometry: strip(p.points, 0.02, GLASS_Z + 0.045) })),
      tonight: model.panes.filter((p) => p.status === "today").map((p) => ({ key: p.key, geometry: strip(p.points, 0.013, GLASS_Z + 0.045) })),
    };
  }, [model]);
  const light = useMemo(() => outside(model), [model]);
  const { ripples } = useMemo(() => cathedralGlass(), []);
  const env = useReflections();
  // Every pane's surface runs its own way, like separately cut pieces of glass.
  const surfaces = useMemo(() => model.panes.map((_, i) => turned(ripples, i + 1)), [model, ripples]);

  return (
    <group>
      <mesh geometry={parts.frame} position={[0, 0, -DEPTH + 0.02]}>
        <meshStandardMaterial color="#563520" roughness={0.65} metalness={0} />
      </mesh>
      {parts.panes.map(({ pane, geometry }, i) => {
        const g = glass(pane);
        return (
          <mesh key={pane.key} geometry={geometry} position={[0, 0, GLASS_Z]}>
            <meshPhysicalMaterial
              color={new THREE.Color(g.tint).multiplyScalar(0.12)}
              emissive={g.tint}
              emissiveMap={light}
              emissiveIntensity={g.glow}
              roughness={Math.max(g.rough, 0.4)}
              metalness={0}
              envMap={env}
              envMapIntensity={0.12}
              normalMap={surfaces[i]}
              normalScale={new THREE.Vector2(0.5, 0.5)}
            />
          </mesh>
        );
      })}
      <mesh geometry={parts.leads ?? undefined}>
        <meshStandardMaterial color="#1c130d" metalness={0.5} roughness={0.55} envMap={env} envMapIntensity={0.35} />
      </mesh>
      {parts.gold.map(({ key, geometry }) => (
        <mesh key={key} geometry={geometry}>
          <meshStandardMaterial color="#f0bd5e" metalness={1} roughness={0.22} envMap={env} emissive="#c0821c" emissiveIntensity={0.55} />
        </mesh>
      ))}
      {parts.tonight.map(({ key, geometry }) => (
        <Waiting key={key} geometry={geometry} />
      ))}
    </group>
  );
}

/** Tonight's pane, its lead breathing slowly while it waits. */
function Waiting({ geometry }: { geometry: THREE.BufferGeometry }) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (material.current) material.current.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 1.4) * 0.5;
  });
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={material} color="#f6ead6" emissive="#ffd9a0" emissiveIntensity={0.8} roughness={0.4} />
    </mesh>
  );
}

/** The light coming in: it fills the recess, and the window's colors land on the sill. */
function Light({ model }: { model: WindowModel }) {
  const pattern = useMemo(() => {
    const t = cast(model);
    // The lower half of the window lands on the sill, its bottom row nearest the glass,
    // shifted a little left because the sun is to the right.
    t.repeat.set(1, -0.55);
    t.offset.set(0.07, 0.55);
    return t;
  }, [model]);
  const sillY = -model.height / 2 - FRAME + 0.004;
  const sillDepth = DEPTH + 0.3;
  return (
    <>
      {/* Light just inside the glass, so only the recess catches it (an area light here leaked onto the whole wall). */}
      {[-1.2, 0, 1.2].flatMap((y) =>
        [-1, 1].map((side) => (
          <pointLight
            key={`${y}${side}`}
            position={[side * (model.width / 2 + FRAME * 0.4), y, GLASS_Z + 0.22]}
            intensity={0.3}
            distance={2.4}
            decay={2}
            color="#ffc58a"
          />
        )),
      )}
      <mesh position={[0, sillY, -DEPTH + sillDepth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[model.width + FRAME * 2, sillDepth]} />
        <meshBasicMaterial map={pattern} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}

/** Dust drifting slowly in the light in front of the window. */
function Dust({ model }: { model: WindowModel }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const n = 220;
    const rand = seeded("dust");
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rand() - 0.5) * model.width * 1.2;
      pos[i * 3 + 1] = (rand() - 0.5) * model.height * 1.1;
      pos[i * 3 + 2] = GLASS_Z + 0.15 + rand() * 1.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [model]);
  useFrame((state) => {
    if (!points.current) return;
    const t = state.clock.elapsedTime;
    points.current.position.y = Math.sin(t * 0.08) * 0.12;
    points.current.position.x = Math.cos(t * 0.05) * 0.08;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial color="#ffe2b8" size={0.018} sizeAttenuation transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

export default function WindowScene({ goal, label }: { goal: DailyGoal; label: string }) {
  const model = useMemo(() => buildWindow(goal), [goal]);
  return (
    <div className="absolute inset-0" role="img" aria-label={label}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, -0.6, 11.6], fov: 40 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1 }}
        fallback={
          <div className="mx-auto mt-[22vh] w-[70%] max-w-[300px]">
            <FlatWindow model={model} label={label} />
          </div>
        }
      >
        <color attach="background" args={["#140e0a"]} />
        <hemisphereLight args={["#7a5640", "#0d0806", 1.1]} />
        {/* The warm light the window throws into the room, pooling around it and on the sill. */}
        <pointLight position={[0, -0.6, 2.8]} intensity={5} distance={10} decay={2} color="#ffb070" />
        <Wall model={model} />
        <Window model={model} />
        <Light model={model} />
        <Dust model={model} />
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={0.78} luminanceSmoothing={0.2} intensity={0.75} radius={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
