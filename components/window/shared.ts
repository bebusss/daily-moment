// Measures shared by the window's parts: the wall's depth and splay, the glass's rebate,
// and where the sun stands.

import * as THREE from "three";
import type { Pt } from "@/lib/geometry";

/** The wall's thickness, how far the opening widens toward the room, and the glass's rebate. */
export const DEPTH = 1.05;

export const SPLAY = 1.46;

export const REBATE = 0.07;

/** Where the sun is, seen from the window: up, to the right, outside. */
export const SUN = new THREE.Vector3(0.72, 0.6, -1).normalize();

export const v2 = ([x, y]: Pt) => new THREE.Vector2(x, y);
