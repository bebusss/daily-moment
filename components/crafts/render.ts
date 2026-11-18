// Next month's crafts, rendered once in 3D and handed back as pictures. They live in the same
// room as the window and the window lights them: dark stone, a pool of low evening sun, a little
// colored light from the glass. Each is a finished piece as you'd expect it, made in the app's
// evening world with a palette of its own:
// - a mosaic in the Ravenna manner: a lapis night, an ivory crescent, stars, a terracotta border;
// - a woven hanging: hills at dusk under a setting sun, the first stars out;
// - a vase in deep indigo glaze, painted with stars and a crescent.
// How each one mends a night with a drink is never shown.
//
// One renderer paints all four, one after the other, and is thrown away. Loaded only when the
// December sheet opens (import() from components/CraftPreview), so the page never carries it.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { DailyGoal } from "@/lib/data";
import { seeded } from "@/lib/geometry";
import { mix } from "@/lib/glass";
import { paintStone, paintWindow, STONE } from "@/lib/paint";
import { buildWindow } from "@/lib/window-model";

export type Piece = "window" | "mosaic" | "tapestry" | "vase";

type Rand = () => number;

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  [c.width, c.height] = [w, h];
  return c;
};

const colorTexture = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const pick = <T,>(list: T[], rand: Rand) => list[Math.floor(rand() * list.length)];

/** The room every craft stands in: the window's stone, dim, with a pool of evening sun. */
function room(scene: THREE.Scene, palette: string[], stone: ReturnType<typeof paintStone>, sunlit = true) {
  scene.background = new THREE.Color("#100b08");
  const map = colorTexture(stone.color);
  const normalMap = new THREE.CanvasTexture(stone.normal);
  for (const t of [map, normalMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6 / STONE, 6 / STONE);
  }
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ map, normalMap, roughness: 0.95, color: "#6e5846" }));
  wall.position.z = -0.7;
  wall.receiveShadow = true;
  scene.add(wall);

  scene.add(new THREE.HemisphereLight("#6a4a34", "#0b0705", 0.22));
  if (!sunlit) return;
  // The evening sun, low from the upper left, through the window: a narrow pool of light.
  const sun = new THREE.SpotLight("#ffc488", 46, 0, 0.3, 0.95, 1.6);
  sun.position.set(-2.6, 2.4, 3.2);
  sun.target.position.set(0.2, 0.4, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);
  // The window's colors, falling softly from the right.
  const glass = new THREE.PointLight(mix(palette[0], 0.15), 1.6, 6, 1.6);
  glass.position.set(2.2, 1.2, 1.6);
  const glass2 = new THREE.PointLight(mix(palette[2 % palette.length], 0.2), 1.1, 6, 1.6);
  glass2.position.set(1.6, -0.6, 2);
  scene.add(glass, glass2);

  // The beam itself, a warm haze crossing the air.
  const beam = canvas(64, 256);
  const g = beam.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, "rgba(255,200,140,0)");
  grad.addColorStop(0.5, "rgba(255,200,140,0.5)");
  grad.addColorStop(1, "rgba(255,200,140,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(beam), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  haze.position.set(-0.6, 0.6, 0.6);
  haze.rotation.z = -0.62;
  scene.add(haze);
}

// ---------------------------------------------------------------------------------------------
// The vase: deep indigo glaze, painted in cream with stars and a crescent.

const VASE = { top: "#2a3d6c", bottom: "#121a33", glaze: ["#1b2747", "#22315a", "#18233f", "#26386a"], paint: "#eee4cc", paint2: "#d9cdb2" };

function vase(scene: THREE.Scene, rand: Rand) {
  // The texture wraps the body: u goes round it, v climbs the profile from the middle of the
  // foot (0) to the lip (1), evenly along the surface. On the belly a canvas pixel is about 1.55
  // times taller on the vase than it is wide, so round marks are drawn squashed by that much.
  const [W, H] = [1024, 1024];
  const SQ = 1 / 1.55;
  const y = (v: number) => (1 - v) * H;
  const c = canvas(W, H);
  const g = c.getContext("2d")!;
  // The glaze: paler where it ran thin at the shoulder, darker where it pooled at the foot.
  const body = g.createLinearGradient(0, 0, 0, H);
  body.addColorStop(0.15, VASE.top);
  body.addColorStop(0.85, VASE.bottom);
  g.fillStyle = body;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 220; i++) {
    const [x, yy, r] = [rand() * W, rand() * H, 20 + rand() * 90];
    const blob = g.createRadialGradient(x, yy, 0, x, yy, r);
    blob.addColorStop(0, `${pick(VASE.glaze, rand)}66`);
    blob.addColorStop(1, `${VASE.glaze[0]}00`);
    g.fillStyle = blob;
    g.fillRect(x - r, yy - r, r * 2, r * 2);
  }
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(255,255,255,${rand() * 0.06})`;
    g.fillRect(rand() * W, rand() * H, 1.5, 1.5);
  }
  // Fine painted lines, a brush's width, never quite straight.
  const line = (v: number, t: number) => {
    g.fillStyle = VASE.paint;
    g.beginPath();
    for (let x = 0; x <= W; x += 16) g.lineTo(x, y(v) + Math.sin(x * 0.03) * 1.2);
    for (let x = W; x >= 0; x -= 16) g.lineTo(x, y(v) + t + Math.sin(x * 0.025 + 1) * 1.2);
    g.fill();
  };
  const dot = (x: number, yy: number, r: number, color = VASE.paint) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, yy, r * SQ, r, 0, 0, Math.PI * 2);
    g.fill();
  };
  // At the lip, at the shoulder (with a row of dots between two lines) and at the foot.
  line(0.965, 4);
  line(0.95, 2);
  line(0.8, 2);
  for (let x = 6; x < W; x += 18) dot(x, y(0.785) + 1, 3.2);
  line(0.77, 2);
  line(0.19, 2);
  line(0.175, 4);
  // Stars, painted by hand: some with four points, many small.
  const star = (x: number, yy: number, r: number) => {
    g.fillStyle = VASE.paint;
    g.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 - Math.PI / 2;
      const rr = k % 2 ? r * 0.3 : r;
      g.lineTo(x + Math.cos(a) * rr * SQ, yy + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  // The crescent, on the front of the body (u = 0.25, turned to face the room).
  const [mx, my, mr] = [W * 0.25, y(0.56), 70];
  const clear = (x: number, yy: number) => Math.hypot((x - mx) / SQ, yy - my) > mr + 34;
  for (let i = 0; i < 30; i++) {
    const [x, yy] = [rand() * W, y(0.24 + rand() * 0.5)];
    if (clear(x, yy)) star(x, yy, 9 + rand() * 11);
  }
  for (let i = 0; i < 110; i++) {
    const [x, yy] = [rand() * W, y(0.22 + rand() * 0.54)];
    if (clear(x, yy)) dot(x, yy, 1.4 + rand() * 2.2, rand() > 0.3 ? VASE.paint : VASE.paint2);
  }
  g.fillStyle = VASE.paint;
  g.beginPath();
  g.ellipse(mx, my, mr * SQ, mr, 0, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "destination-out";
  g.beginPath();
  g.ellipse(mx + 18, my - 18, mr * 0.84 * SQ, mr * 0.84, 0, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = "destination-over";
  g.fillStyle = body;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "source-over";

  const profile = new THREE.SplineCurve(
    [
      [0.001, 0],
      [0.3, 0.0],
      [0.34, 0.05],
      [0.46, 0.35],
      [0.62, 0.9],
      [0.56, 1.25],
      [0.3, 1.6],
      [0.19, 1.82],
      [0.2, 1.95],
      [0.26, 2.02],
    ].map(([px, py]) => new THREE.Vector2(px, py)),
  ).getSpacedPoints(90);
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 96),
    new THREE.MeshPhysicalMaterial({ map: colorTexture(c), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide }),
  );
  mesh.castShadow = true;
  mesh.position.set(0, -1.05, 0);
  // u = 0.25 points along +x; turn it to the room, a little toward the light.
  mesh.rotation.y = -Math.PI / 2 - 0.22;
  scene.add(mesh);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(0.24, 40), new THREE.MeshBasicMaterial({ color: "#0d0a0a" }));
  inside.rotation.x = -Math.PI / 2;
  inside.position.set(0, -1.05 + 1.99, 0);
  scene.add(inside);
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 1.6), new THREE.MeshStandardMaterial({ color: "#7a5f48", roughness: 0.9 }));
  ledge.position.set(0, -1.05 - 0.125, 0);
  ledge.receiveShadow = true;
  scene.add(ledge);
  return { look: new THREE.Vector3(0, -0.05, 0), distance: 5.4 };
}

// ---------------------------------------------------------------------------------------------
// The tapestry: a woven landscape at dusk, the sun going down behind layered hills.

const DUSK = {
  sky: ["#3a4668", "#54527a", "#7a5a7e", "#a3687a", "#c97f72", "#e2a27a"],
  sun: "#e0aa45",
  hills: ["#97a07f", "#6c7a55", "#4f3a4a"],
  ground: "#8f4a34",
  wool: "#ecdfc6",
};

function tapestry(scene: THREE.Scene, rand: Rand) {
  const [W, H] = [640, 880];
  const c = canvas(W, H);
  const g = c.getContext("2d")!;
  const row = 6; // a weft row
  const col = 4; // a warp spacing
  const sun = { x: W * 0.5, y: H * 0.56, r: W * 0.2 };
  const hill = (k: number, x: number) =>
    k === 0 ? H * 0.55 + Math.sin(x * 0.012 + 1) * 34 + Math.sin(x * 0.03) * 8 : k === 1 ? H * 0.64 + Math.sin(x * 0.009 + 3) * 46 : H * 0.75 + Math.sin(x * 0.011 + 5) * 30;
  // The first stars, high in the sky: a few small crosses of plain wool, and single stitches.
  const stars = new Set<string>();
  for (let i = 0; i < 9; i++) {
    const [sx, sy] = [Math.floor((0.08 + rand() * 0.84) * (W / col)), Math.floor((0.05 + rand() * 0.2) * (H / row))];
    stars.add(`${sx},${sy}`);
    if (i < 4) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) stars.add(`${sx + dx},${sy + dy}`);
  }
  for (let y = 0; y < H; y += row)
    for (let x = 0; x < W; x += col) {
      const [cx, cy] = [x + col / 2, y + row / 2];
      let color: string;
      if (cy < H * 0.035 || cy > H * 0.965) color = DUSK.wool;
      else if (cy > H * 0.87) color = DUSK.ground;
      else if (cy > hill(2, cx)) color = DUSK.hills[2];
      else if (cy > hill(1, cx)) color = DUSK.hills[1];
      else if (cy > hill(0, cx)) color = DUSK.hills[0];
      else if (Math.hypot(cx - sun.x, cy - sun.y) < sun.r) color = DUSK.sun;
      else if (stars.has(`${x / col},${y / row}`)) color = DUSK.wool;
      else {
        // The sky in bands of weft, hatched into each other where they meet.
        const t = Math.min(0.999, Math.max(0, (cy - H * 0.04) / (H * 0.52)));
        const band = t * (DUSK.sky.length - 1);
        const k = Math.floor(band);
        color = DUSK.sky[band - k > 0.5 && (x / col + y / row) % 2 === 0 ? Math.min(k + 1, DUSK.sky.length - 1) : k];
      }
      g.fillStyle = mix(color, (rand() - 0.5) * 0.06);
      g.fillRect(x, y, col + 0.4, row + 0.4);
      // Each pass of the weft: lit where it rises over the warp, shaded where it dips.
      g.fillStyle = (x / col + y / row) % 2 ? "rgba(255,240,220,0.13)" : "rgba(0,0,0,0.13)";
      g.fillRect(x, y + 1, col, 2);
    }
  // Outlines woven along the hills, a shade darker, the way a weaver finishes a shape.
  g.lineWidth = 2;
  for (const k of [0, 1, 2]) {
    g.strokeStyle = mix(DUSK.hills[k], -0.25);
    g.beginPath();
    for (let x = 0; x <= W; x += 6) g.lineTo(x, hill(k, x));
    g.stroke();
  }
  const normal = weaveNormals();
  const geo = new THREE.PlaneGeometry(1.6, 2.2, 90, 90);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const [x, y] = [pos.getX(i), pos.getY(i)];
    const hang = (1.1 - y) / 2.2;
    pos.setZ(i, (0.05 * Math.sin(x * 7.5 + 0.6) + 0.02 * Math.sin(x * 17)) * (0.35 + 0.65 * hang) + 0.05);
  }
  geo.computeVertexNormals();
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: colorTexture(c), normalMap: normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.95, side: THREE.DoubleSide }));
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  scene.add(cloth);
  const wood = new THREE.MeshStandardMaterial({ color: "#5e3b22", roughness: 0.5 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 24), wood);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 1.13, 0.1);
  rod.castShadow = true;
  scene.add(rod);
  for (const s of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 16), wood);
    knob.position.set(s * 0.97, 1.13, 0.1);
    scene.add(knob);
  }
  const fringe = new THREE.MeshStandardMaterial({ color: DUSK.wool, roughness: 0.95 });
  for (let x = -0.76; x <= 0.76; x += 0.04) {
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.005, 0.18 + rand() * 0.04, 6), fringe);
    strand.position.set(x, -1.19, 0.05 + 0.05 * Math.sin(x * 7.5 + 0.6));
    strand.rotation.z = (rand() - 0.5) * 0.2;
    strand.castShadow = true;
    scene.add(strand);
  }
  return { look: new THREE.Vector3(0, 0, 0), distance: 5.6 };
}

/** The relief of a plain weave, as a tiling normal map. */
function weaveNormals() {
  const n = canvas(256, 256);
  const ng = n.getContext("2d")!;
  const img = ng.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const k = (y * 256 + x) * 4;
      const over = (Math.floor(x / 4) + Math.floor(y / 4)) % 2;
      const sx = Math.sin(((x % 4) / 4) * Math.PI);
      const sy = Math.sin(((y % 4) / 4) * Math.PI);
      img.data[k] = 128 + (over ? (sx - 0.5) * 60 : 0);
      img.data[k + 1] = 128 + (over ? 0 : (sy - 0.5) * 60);
      img.data[k + 2] = 255;
      img.data[k + 3] = 255;
    }
  ng.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 36);
  return t;
}

// ---------------------------------------------------------------------------------------------
// The mosaic, in the Ravenna manner: a lapis night, an ivory crescent laid along its curve,
// stars glowing in paler blue, a border of terracotta and ochre. As mosaicists lay them, the
// rows of the night follow the moon's outline outward and part round every star.

const NIGHT = {
  lapis: ["#1a2760", "#1d2b68", "#202f70", "#172256", "#1e2c6c"],
  light: ["#2b4290", "#2f4798"],
  halo: ["#3a58a8", "#4463b2", "#34509c"],
  ivory: ["#efe6cf", "#e8dcc0", "#f3ead6", "#e2d4b4"],
  dark: "#0f1638",
  terracotta: ["#a8553a", "#9a4a33", "#b25e3e"],
  ochre: ["#c08a3e", "#b77f36"],
  cream: "#e6d6b4",
};

type Tile = { x: number; y: number; a: number; s: number; color: string };

function mosaic(scene: THREE.Scene, rand: Rand) {
  const [PW, PH] = [1.6, 2.2];
  const S = 0.058;
  const tiles: Tile[] = [];
  // Nothing is laid where a tile already sits.
  const taken = (x: number, y: number, d = S * 0.86) => tiles.some((t) => Math.abs(t.x - x) < d && Math.abs(t.y - y) < d && Math.hypot(t.x - x, t.y - y) < d);
  const lay = (x: number, y: number, a: number, color: string, s = S * 0.86) => {
    if (Math.abs(x) > PW / 2 - S * 0.5 || Math.abs(y) > PH / 2 - S * 0.5) return;
    tiles.push({ x, y, a, s, color });
  };
  // The border: terracotta with every third tessera ochre, then a row of cream.
  const ring = (inset: number, color: (k: number) => string) => {
    const [hx, hy] = [PW / 2 - inset, PH / 2 - inset];
    for (let k = 0, x = -hx; x <= hx + 1e-6; k++, x += S) {
      lay(x, hy, 0, color(k));
      lay(x, -hy, 0, color(k));
    }
    for (let k = 1, y = -hy + S; y <= hy - S + 1e-6; k++, y += S) {
      lay(hx, y, 0, color(k));
      lay(-hx, y, 0, color(k));
    }
  };
  ring(S * 0.5, (k) => (k % 3 === 1 ? pick(NIGHT.ochre, rand) : pick(NIGHT.terracotta, rand)));
  ring(S * 1.5, () => NIGHT.cream);
  const inside = (x: number, y: number) => Math.abs(x) < PW / 2 - S * 2 && Math.abs(y) < PH / 2 - S * 2;

  // The crescent, laid in arcs that follow its curve, outlined in the darkest blue.
  const moon = { x: -0.18, y: 0.38, r: 0.4 };
  const bite = { x: 0.0, y: 0.5, r: 0.34 };
  const inMoon = (x: number, y: number) => Math.hypot(x - moon.x, y - moon.y) < moon.r && Math.hypot(x - bite.x, y - bite.y) > bite.r;
  const arc = (c: { x: number; y: number }, r: number, keep: (x: number, y: number) => boolean, color: (x: number, y: number) => string) => {
    const n = Math.max(6, Math.round((2 * Math.PI * r) / S));
    const turn = rand() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const a = turn + (k / n) * Math.PI * 2;
      const [x, y] = [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r];
      if (inside(x, y) && keep(x, y) && !taken(x, y)) lay(x, y, a + Math.PI / 2, color(x, y));
    }
  };
  arc(moon, moon.r + S * 0.55, (x, y) => Math.hypot(x - bite.x, y - bite.y) > bite.r - S * 0.4, () => NIGHT.dark);
  arc(bite, bite.r - S * 0.55, (x, y) => Math.hypot(x - moon.x, y - moon.y) < moon.r + S * 0.4, () => NIGHT.dark);
  for (let r = moon.r - S * 0.5; r > 0; r -= S) arc(moon, r, inMoon, () => pick(NIGHT.ivory, rand));

  // Stars: an ivory heart with four points (and, on the larger ones, four small ones between).
  const stars: [number, number, number][] = [
    [0.4, 0.8, 1],
    [0.48, 0.1, 1],
    [-0.4, -0.3, 1],
    [0.2, -0.55, 1],
    [-0.1, -0.88, 0.7],
    [0.46, -0.9, 0.7],
    [-0.48, 0.88, 0.7],
    [0.1, 0.96, 0.6],
    [-0.5, 0.15, 0.6],
    [0.22, 0.42, 0.6],
    [0.5, -0.4, 0.5],
    [-0.25, -0.62, 0.5],
  ];
  for (const [x, y, size] of stars) {
    lay(x, y, Math.PI / 4, pick(NIGHT.ivory, rand), S * 0.8);
    if (size < 0.6) continue;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      lay(x + Math.cos(a) * S * 0.9, y + Math.sin(a) * S * 0.9, a, pick(NIGHT.ivory, rand), S * 0.62);
      if (size >= 1) lay(x + Math.cos(a) * S * 1.62, y + Math.sin(a) * S * 1.62, a, pick(NIGHT.ivory, rand), S * 0.42);
      if (size >= 1) lay(x + Math.cos(a + Math.PI / 4) * S * 0.86, y + Math.sin(a + Math.PI / 4) * S * 0.86, a, pick(NIGHT.ivory, rand), S * 0.34);
    }
  }

  // The night: each tessera a lapis, paler near the moon and the stars, as if they glowed.
  const sky = (x: number, y: number) => {
    // How far from the crescent's edge: outside the moon, or across its hollow.
    const toMoon = Math.hypot(x - moon.x, y - moon.y);
    const fromCrescent = toMoon < moon.r ? bite.r - Math.hypot(x - bite.x, y - bite.y) : toMoon - moon.r;
    let glow = Math.max(0, 1 - fromCrescent / (S * 3)) * 0.75;
    for (const [sx, sy, size] of stars) glow = Math.max(glow, 1 - Math.hypot(x - sx, y - sy) / (S * (1.6 + size * 1.8)));
    const v = rand();
    return v < glow * 0.85 ? pick(NIGHT.halo, rand) : v < 0.07 ? pick(NIGHT.light, rand) : pick(NIGHT.lapis, rand);
  };
  // Two rows hug the crescent, outside it and in its hollow; the rest of the night is laid in
  // gently waving rows, parting round the moon and the stars.
  const nearMoon = (x: number, y: number) => Math.hypot(x - moon.x, y - moon.y) < moon.r + S * 0.6;
  const offBite = (x: number, y: number) => Math.hypot(x - bite.x, y - bite.y) > bite.r;
  for (const d of [1.55, 2.55]) {
    arc(moon, moon.r + S * d, offBite, sky);
    arc(bite, bite.r - S * d, nearMoon, sky);
  }
  for (let y = PH / 2; y > -PH / 2; y -= S * 0.98)
    for (let x = -PW / 2; x < PW / 2; x += S) {
      const yy = y + Math.sin(x * 3.2 + y * 0.9) * S * 0.45;
      if (inside(x, yy) && !taken(x, yy)) lay(x, yy, Math.atan(Math.cos(x * 3.2 + y * 0.9) * 3.2 * S * 0.45), sky(x, yy));
    }
  // Whatever gaps are left get a smaller piece, cut to fit.
  for (const [step, gap, size] of [
    [0.4, 0.78, 0.66],
    [0.25, 0.6, 0.48],
  ])
    for (let y = -PH / 2; y < PH / 2; y += S * step)
      for (let x = -PW / 2; x < PW / 2; x += S * step) if (inside(x, y) && !taken(x, y, S * gap)) lay(x, y, rand() * Math.PI, sky(x, y), S * size);

  const grout = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, 0.06), new THREE.MeshStandardMaterial({ color: "#2b2620", roughness: 1 }));
  grout.receiveShadow = true;
  scene.add(grout);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 }), tiles.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  tiles.forEach((t, i) => {
    e.set((rand() - 0.5) * 0.16, (rand() - 0.5) * 0.16, t.a + (rand() - 0.5) * 0.15);
    q.setFromEuler(e);
    const s = t.s * (0.92 + rand() * 0.12);
    m.compose(new THREE.Vector3(t.x + (rand() - 0.5) * 0.004, t.y + (rand() - 0.5) * 0.004, 0.045 + rand() * 0.008), q, new THREE.Vector3(s, s * (0.88 + rand() * 0.2), 0.034));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(mix(t.color, (rand() - 0.5) * 0.08)));
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return { look: new THREE.Vector3(0, 0, 0), distance: 5.6 };
}

// ---------------------------------------------------------------------------------------------
// The window: December's, painted as the real one is, lit from behind, its glow on the stone.

function window_(scene: THREE.Scene, goal: DailyGoal, palette: string[]) {
  const nights = Array.from({ length: 31 }, (_, i) => ({ date: `2026-12-${String(i + 1).padStart(2, "0")}`, done: true, weight: ([2, 1, 3, 2] as const)[i % 4] }));
  const model = buildWindow({ ...goal, month: "2026-12", design: "rose", palette, nights, today: "2026-12-32" });
  const painted = paintWindow(model);
  const k = 2.2 / model.height;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(model.width * k, model.height * k), new THREE.MeshBasicMaterial({ map: colorTexture(painted.glass), transparent: true }));
  // The painting is the whole rectangle; only the lancet is glass.
  const alpha = canvas(painted.ids.width, painted.ids.height);
  const ag = alpha.getContext("2d")!;
  ag.drawImage(painted.ids, 0, 0);
  const px = ag.getImageData(0, 0, alpha.width, alpha.height);
  for (let j = 0; j < px.data.length; j += 4) {
    const on = px.data[j + 2] > 128 ? 255 : 0;
    px.data[j] = px.data[j + 1] = px.data[j + 2] = on;
  }
  ag.putImageData(px, 0, 0);
  (glass.material as THREE.MeshBasicMaterial).alphaMap = new THREE.CanvasTexture(alpha);
  // Lit by the sunset behind it, as the window in the app is: the clear glass goes amber.
  (glass.material as THREE.MeshBasicMaterial).color = new THREE.Color(1.8, 1.3, 0.82);
  glass.position.z = -0.2;
  scene.add(glass);
  const halo = canvas(128, 128);
  const hg = halo.getContext("2d")!;
  const r = hg.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, "rgba(255,190,120,0.85)");
  r.addColorStop(1, "rgba(255,190,120,0)");
  hg.fillStyle = r;
  hg.fillRect(0, 0, 128, 128);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(halo), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.z = -0.25;
  scene.add(glow);
  const back = new THREE.PointLight("#ffc080", 6.5, 2.8, 1.6);
  back.position.set(0, 0.2, 0.6);
  scene.add(back);
  return { look: new THREE.Vector3(0, 0, 0), distance: 4.7 };
}

/** Renders the four pieces and returns them as pictures (object URLs). `palette` colors the window and the room's glass light. */
export async function renderCrafts(goal: DailyGoal, palette: string[], w: number, h: number): Promise<Record<Piece, string>> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const stone = paintStone(512);
  const out = {} as Record<Piece, string>;
  for (const piece of ["window", "mosaic", "tapestry", "vase"] as Piece[]) {
    const scene = new THREE.Scene();
    // Soft reflections for the glaze and the glass, kept low so the room stays dim.
    scene.environment = env;
    scene.environmentIntensity = 0.22;
    room(scene, palette, stone, piece !== "window");
    const rand = seeded(`craft:${piece}`);
    const frame = piece === "vase" ? vase(scene, rand) : piece === "tapestry" ? tapestry(scene, rand) : piece === "mosaic" ? mosaic(scene, rand) : window_(scene, goal, palette);
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 40);
    camera.position.copy(frame.look).add(new THREE.Vector3(0.35, 0.25, frame.distance));
    camera.lookAt(frame.look);
    renderer.render(scene, camera);
    const blob = await new Promise<Blob | null>((done) => renderer.domElement.toBlob(done, "image/jpeg", 0.9));
    out[piece] = blob ? URL.createObjectURL(blob) : "";
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
          mat.dispose();
        }
      }
    });
    // Let the page breathe between pieces.
    await new Promise((r) => setTimeout(r, 0));
  }
  env.dispose();
  pmrem.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return out;
}
