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
// - Loading never freezes the page: the heavy work (cutting the vine, painting the glass and the
//   stone) runs a step at a time with the browser free in between, the shaders compile in the
//   background, and the window fades in once it can be drawn.
//
// This file puts the scene together. Its parts are in components/window/: the glass (Glass),
// the sun through it (sun), the light shafts and dust (Air), the stone (Wall), the camera and
// pacing (frame), and the painted textures (textures).

import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { DailyGoal } from "@/lib/data";
import type { Sky } from "@/lib/sky";
import { timed } from "@/lib/perf";
import { centroid } from "@/lib/geometry";
import { leafMid } from "@/lib/vine";
import { buildWindow, type WindowModel } from "@/lib/window-model";
import FlatWindow from "./FlatWindow";
import { Dust, Air } from "./window/Air";
import { Glass } from "./window/Glass";
import { Adapt, Compile, FirstFrame, Pace, Rig, useLite, useMedia, type Insets } from "./window/frame";
import { DEPTH } from "./window/shared";
import { useSun } from "./window/sun";
import { outsideFor, paintFor, stoneFor, useWindowTextures } from "./window/textures";
import { Bars, Wall } from "./window/Wall";

export type { Insets } from "./window/frame";

type SceneProps = {
  model: WindowModel;
  onCompiled: () => void;
  selected?: number;
  spotlight?: number | null;
  onSelect?: (day: number) => void;
  insets: Insets;
  lite: boolean;
  weather?: Sky["weather"];
  slow?: boolean;
  mending?: number[];
};

function Scene({ model, selected, spotlight, onSelect, insets, lite, onCompiled, weather, slow, mending }: SceneProps) {
  const { textures, paneAt } = useWindowTextures(model);
  const sun = useSun(model, textures);
  const still = useMedia("(prefers-reduced-motion: reduce)");
  // The night in the spotlight: the middle of its leaf, for the view to move in to.
  const focus = useMemo(() => {
    const pane = spotlight ? model.panes.find((p) => p.kind === "night" && p.day === spotlight) : undefined;
    if (!pane) return null;
    return pane.leaf ? leafMid(pane.leaf, 0.5) : centroid(pane.points);
  }, [model, spotlight]);
  return (
    <>
      <color attach="background" args={["#0b0806"]} />
      <Rig model={model} insets={insets} focus={focus} still={still} slow={slow} />
      <FirstFrame />
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
      <Wall model={model} stoneSize={lite ? STONE_LITE : STONE_FULL} />
      <Glass
        model={model}
        textures={textures}
        paneAt={paneAt}
        selected={selected}
        spotlight={Boolean(spotlight)}
        still={still}
        mending={mending}
        weather={weather}
        onSelect={onSelect}
      />
      <Bars model={model} />
      <Air sun={sun} model={model} slices={lite ? 14 : 26} clouds={weather?.clouds ?? 0} />
      <Dust sun={sun} model={model} />
      <EffectComposer multisampling={lite ? 0 : 4}>
        <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.3} intensity={0.85} radius={0.62} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.28} darkness={0.72} />
      </EffectComposer>
      <Compile onCompiled={onCompiled} />
    </>
  );
}

/**
 * If WebGL can't start (an old phone, a browser that blocks it), the 3D window throws. Caught
 * here, so the flat window shows instead and the rest of the screen keeps working.
 */
class WebGLBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Without WebGL: the flat window, shown at once. */
function FlatFallback({ model, label, insets, onShown }: { model: WindowModel; label: string; insets: Insets; onShown: () => void }) {
  useEffect(() => onShown(), [onShown]);
  // In the same space as the 3D window: between the text above and the card below.
  return (
    <div className="absolute inset-x-0 flex justify-center px-6 py-3" style={{ top: insets.top, bottom: insets.bottom }}>
      <div className="h-full" style={{ aspectRatio: `${model.width + 0.15} / ${model.height + 0.15}` }}>
        <FlatWindow model={model} label={label} />
      </div>
    </div>
  );
}

/** The stone's texture size: phones don't need the full one. */
const STONE_FULL = 1024;

const STONE_LITE = 512;

/** Lets the browser handle taps and paint the page between two heavy steps. */
const breathe = () => new Promise<void>((done) => setTimeout(done, 0));

/**
 * Everything the scene needs before its first frame, a step at a time. Each step's result is
 * kept, so the scene finds it ready, and setting tonight's leaf only redoes what changed.
 */
async function prepare(goal: DailyGoal, lite: boolean, moon: Sky["moon"], alive: () => boolean) {
  await breathe();
  if (!alive()) return null;
  const model = timed("window:build", () => buildWindow(goal, moon));
  for (const step of [() => paintFor(model), () => outsideFor(model), () => stoneFor(lite ? STONE_LITE : STONE_FULL)]) {
    await breathe();
    if (!alive()) return null;
    step();
  }
  return model;
}

export default function WindowScene({
  goal,
  label,
  selected,
  spotlight = null,
  onSelect,
  insets = { top: 0, bottom: 0 },
  paused = false,
  sky = {},
  slow = false,
  mending,
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
  /** Tonight's real sky (lib/sky): the moon's phase, and the weather on the glass. */
  sky?: Sky;
  /** Move the view slowly (the pull back to the whole month after a drink). */
  slow?: boolean;
  /** Nights a check-in just mended, whose gold is soldered now. */
  mending?: number[];
}) {
  const lite = useLite();
  const [model, setModel] = useState<WindowModel | null>(null);
  const [compiled, setCompiled] = useState(false);
  const reveal = useCallback(() => setCompiled(true), []);
  // Tonight's moon, by value, so the window is only rebuilt when the phase itself changes.
  const [lit, waxing] = [sky.moon?.lit, sky.moon?.waxing];
  useEffect(() => {
    let live = true;
    const moon = lit === undefined ? undefined : { lit, waxing: Boolean(waxing), phase: "" };
    prepare(goal, lite, moon, () => live).then((m) => {
      if (live && m) setModel(m);
    });
    return () => {
      live = false;
    };
  }, [goal, lite, lit, waxing]);
  const drawing = compiled && !paused;
  return (
    <div className="absolute inset-0 transition-opacity duration-1000 ease-out" style={{ opacity: compiled ? 1 : 0 }} role="img" aria-label={label}>
      {model && (
        <WebGLBoundary fallback={<FlatFallback model={model} label={label} insets={insets} onShown={reveal} />}>
          <Canvas
            dpr={[1, lite ? 1.5 : 2]}
            frameloop={!drawing ? "never" : lite ? "demand" : "always"}
            camera={{ position: [0, -0.5, 16], fov: 36, near: 0.1, far: 80 }}
            gl={{ antialias: false, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              // Checking that every shader compiled makes the page wait on the graphics card. Worth it
              // while developing; in production they're compiled in the background (see Compile).
              gl.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
            }}
          >
            <Scene
              model={model}
              selected={selected}
              spotlight={spotlight}
              onSelect={onSelect}
              insets={insets}
              lite={lite}
              onCompiled={reveal}
              weather={sky.weather}
              slow={slow}
              mending={mending}
            />
            {lite && drawing && <Pace fps={30} />}
            {drawing && <Adapt frameMs={lite ? 1000 / 30 : 1000 / 60} />}
          </Canvas>
        </WebGLBoundary>
      )}
    </div>
  );
}
