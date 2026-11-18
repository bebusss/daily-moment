"use client";

// The wall: dressed stone, the opening widening toward the room, a ledge below, and the iron
// saddle bars across the glass.

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { len, sub, type Pt } from "@/lib/geometry";
import { STONE } from "@/lib/paint";
import { archPath } from "@/lib/vine";
import type { WindowModel } from "@/lib/window-model";
import { DEPTH, REBATE, SPLAY, v2 } from "./shared";
import { stoneFor } from "./textures";

// The wall: dressed stone, the opening widening toward the room, a ledge below.

/** A strip of surface between two matching lines, `a` at depth `za` and `b` at depth `zb`. */
export function loft(a: Pt[], b: Pt[], za: number, zb: number) {
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
export function facing(g: THREE.BufferGeometry, toward: THREE.Vector3) {
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

export function useStone(size: number) {
  const maps = useMemo(() => {
    const { color, normal } = stoneFor(size);
    const c = new THREE.CanvasTexture(color);
    c.colorSpace = THREE.SRGBColorSpace;
    const n = new THREE.CanvasTexture(normal);
    for (const t of [c, n]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
    }
    return { color: c, normal: n };
  }, [size]);
  useEffect(
    () => () => {
      maps.color.dispose();
      maps.normal.dispose();
    },
    [maps],
  );
  return maps;
}

export function Wall({ model, stoneSize }: { model: WindowModel; stoneSize: number }) {
  const stone = useStone(stoneSize);
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
  const material = <meshStandardMaterial map={stone.color} normalMap={stone.normal} normalScale={new THREE.Vector2(0.9, 0.9)} roughness={0.92} metalness={0} />;
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
export function Bars({ model }: { model: WindowModel }) {
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
