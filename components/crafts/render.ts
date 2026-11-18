// Next month's crafts, rendered once in 3D and handed back as pictures. They live in the same
// room as the window and the window lights them: warm stone, a low evening sun, a little colored
// light from the glass. Each shows the finished piece as you'd expect it; how it mends a missed
// night is never shown.
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

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  [c.width, c.height] = [w, h];
  return c;
};

const colorTexture = (c: HTMLCanvasElement, repeat = 1) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat !== 1) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
  }
  return t;
};

/** The room every craft stands in: the window's stone, warm light, a beam of evening sun. */
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
  const glass2 = new THREE.PointLight(mix(palette[3 % palette.length], 0.2), 1.1, 6, 1.6);
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

/** The vase: a body turned on a wheel, glazed, painted in bands, on the stone ledge. */
function vase(scene: THREE.Scene, palette: string[], rand: () => number) {
  // The painted surface: cream glaze, bands and a row of dots, a little uneven like a brush.
  const c = canvas(512, 1024);
  const g = c.getContext("2d")!;
  g.fillStyle = "#efe4cf";
  g.fillRect(0, 0, 512, 1024);
  const bands = [0.2, 0.3, 0.38, 0.46, 0.53, 0.6, 0.68, 0.76];
  bands.forEach((v, i) => {
    const y = (1 - v) * 1024;
    const t = 10 + (i % 3) * 6;
    g.fillStyle = mix(palette[i % palette.length], (rand() - 0.5) * 0.1);
    g.beginPath();
    for (let x = 0; x <= 512; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 1.6 + (rand() - 0.5) * 1.5);
    for (let x = 512; x >= 0; x -= 8) g.lineTo(x, y + t + Math.sin(x * 0.04 + i * 2) * 1.6 + (rand() - 0.5) * 1.5);
    g.fill();
    if (i % 3 === 1)
      for (let x = 6; x < 512; x += 18) {
        g.fillStyle = mix(palette[(i + 2) % palette.length], 0.05);
        g.beginPath();
        g.arc(x, y - 14, 4.2, 0, Math.PI * 2);
        g.fill();
      }
  });
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(90,70,50,${rand() * 0.05})`;
    g.fillRect(rand() * 512, rand() * 1024, 1.4, 1.4);
  }
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
    ].map(([x, y]) => new THREE.Vector2(x, y)),
  ).getPoints(80);
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 96),
    new THREE.MeshPhysicalMaterial({ map: colorTexture(c), roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide }),
  );
  body.castShadow = true;
  body.position.set(0, -1.05, 0);
  scene.add(body);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(0.24, 40), new THREE.MeshBasicMaterial({ color: "#1c120c" }));
  inside.rotation.x = -Math.PI / 2;
  inside.position.set(0, -1.05 + 1.99, 0);
  scene.add(inside);
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(5, 0.25, 1.6), new THREE.MeshStandardMaterial({ color: "#8c6e52", roughness: 0.9 }));
  ledge.position.set(0, -1.05 - 0.125, 0);
  ledge.receiveShadow = true;
  scene.add(ledge);
  return { look: new THREE.Vector3(0, -0.05, 0), distance: 5.4 };
}

/** The tapestry: a kilim woven in the month's colors, hanging in soft folds from a wooden rod. */
function tapestry(scene: THREE.Scene, palette: string[], rand: () => number) {
  const [W, H] = [320, 440];
  const c = canvas(W * 2, H * 2);
  const g = c.getContext("2d")!;
  g.scale(2, 2);
  const cell = 5;
  const [cols, rows] = [W / cell, H / cell];
  const field = mix(palette[2 % palette.length], -0.3);
  for (let r = 0; r < rows; r++)
    for (let col = 0; col < cols; col++) {
      const edge = Math.min(r, rows - 1 - r);
      const step = (v: number) => Math.round(v / 2) * 2;
      const d = step(Math.abs(col - cols / 2)) + step(Math.abs((r % 30) - 15));
      const ring = d < 4 ? 0 : d < 8 ? 1 : d < 12 ? 2 : d < 15 ? 3 : -1;
      const color = edge < 3 ? "#e8d9ba" : edge < 6 ? palette[0] : edge < 7 ? "#e8d9ba" : ring === -1 ? field : ring === 3 ? "#e8d9ba" : palette[(ring * 2 + Math.floor(r / 30)) % palette.length];
      g.fillStyle = mix(color, (rand() - 0.5) * 0.08);
      g.fillRect(col * cell, r * cell, cell + 0.3, cell + 0.3);
      // Each stitch: lighter where the wool rises, darker where it dips.
      g.fillStyle = (r + col) % 2 ? "rgba(255,240,220,0.14)" : "rgba(0,0,0,0.16)";
      g.fillRect(col * cell, r * cell + 1, cell, 2);
    }
  // The weave as relief, for the light to find.
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
  const normalMap = new THREE.CanvasTexture(n);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(20, 28);

  const geo = new THREE.PlaneGeometry(1.6, 2.2, 90, 90);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const [x, y] = [pos.getX(i), pos.getY(i)];
    const hang = (1.1 - y) / 2.2; // 0 at the rod, 1 at the hem
    pos.setZ(i, (0.06 * Math.sin(x * 7.5 + 0.6) + 0.025 * Math.sin(x * 17)) * (0.35 + 0.65 * hang) + 0.05);
  }
  geo.computeVertexNormals();
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: colorTexture(c), normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.92, side: THREE.DoubleSide }));
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  scene.add(cloth);
  const wood = new THREE.MeshStandardMaterial({ color: "#6b4426", roughness: 0.5 });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.95, 24), wood);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 1.13, 0.1);
  rod.castShadow = true;
  scene.add(rod);
  for (const s of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 16), wood);
    knob.position.set(s * 0.99, 1.13, 0.1);
    scene.add(knob);
  }
  // The fringe: a tassel of wool under every few warp threads.
  const fringe = new THREE.Group();
  for (let x = -0.76; x <= 0.76; x += 0.045) {
    const strand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.004, 0.16 + rand() * 0.04, 6),
      new THREE.MeshStandardMaterial({ color: mix(palette[Math.floor(rand() * palette.length)], 0.15), roughness: 0.95 }),
    );
    strand.position.set(x, -1.18, 0.05 + 0.06 * Math.sin(x * 7.5 + 0.6));
    strand.rotation.z = (rand() - 0.5) * 0.25;
    strand.castShadow = true;
    fringe.add(strand);
  }
  scene.add(fringe);
  return { look: new THREE.Vector3(0, 0, 0), distance: 5.6 };
}

/** The mosaic: real tesserae of glass, each a little tilted so it catches the light its own way. */
function mosaic(scene: THREE.Scene, palette: string[], rand: () => number) {
  const [PW, PH] = [1.6, 2.2];
  const grout = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.12, PH + 0.12, 0.06), new THREE.MeshStandardMaterial({ color: "#3a3028", roughness: 1 }));
  grout.receiveShadow = true;
  scene.add(grout);
  const size = 0.072;
  const cols = Math.floor(PW / size);
  const rows = Math.floor(PH / size);
  const field = ["#e9dcc0", "#e2d2b2", "#efe3c9", "#dccbab", "#d8c6a2"];
  const tiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    cols * rows,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let i = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = -PW / 2 + (c + 0.5) * size + (r % 2 ? size * 0.25 : 0) + (rand() - 0.5) * 0.008;
      const y = -PH / 2 + (r + 0.5) * size + (rand() - 0.5) * 0.008;
      const d = Math.hypot(x, (y - 0.05) * 0.95) / 0.62;
      const color = d < 1 ? palette[Math.min(palette.length - 1, Math.floor(d * 5))] : field[Math.floor(rand() * field.length)];
      e.set((rand() - 0.5) * 0.18, (rand() - 0.5) * 0.18, (rand() - 0.5) * 0.12);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y, 0.045 + rand() * 0.01), q, new THREE.Vector3(size * 0.86, size * 0.86, 0.035));
      tiles.setMatrixAt(i, m);
      tiles.setColorAt(i, new THREE.Color(mix(color, (rand() - 0.5) * 0.12)));
      i++;
    }
  tiles.count = i;
  tiles.castShadow = true;
  tiles.receiveShadow = true;
  scene.add(tiles);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.28, PH + 0.28, 0.04), new THREE.MeshStandardMaterial({ color: "#5a3e28", roughness: 0.6 }));
  frame.position.z = -0.03;
  scene.add(frame);
  return { look: new THREE.Vector3(0, 0, 0), distance: 5.6 };
}

/** The window: December's, painted as the real one is, lit from behind and set in the stone. */
function window_(scene: THREE.Scene, goal: DailyGoal, december: string[]) {
  const nights = Array.from({ length: 31 }, (_, i) => ({ date: `2026-12-${String(i + 1).padStart(2, "0")}`, done: true, weight: ([2, 1, 3, 2] as const)[i % 4] }));
  const model = buildWindow({ ...goal, month: "2026-12", design: "rose", palette: december, nights, today: "2026-12-32" });
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
  (glass.material as THREE.MeshBasicMaterial).color = new THREE.Color(1.9, 1.65, 1.35);
  glass.position.z = -0.2;
  scene.add(glass);
  // Its glow on the stone around it.
  const halo = canvas(128, 128);
  const hg = halo.getContext("2d")!;
  const r = hg.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, "rgba(255,200,140,0.85)");
  r.addColorStop(1, "rgba(255,200,140,0)");
  hg.fillStyle = r;
  hg.fillRect(0, 0, 128, 128);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(halo), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.position.z = -0.25;
  scene.add(glow);
  const back = new THREE.PointLight("#ffcf9a", 9, 3.2, 1.6);
  back.position.set(0, 0.2, 0.6);
  scene.add(back);
  return { look: new THREE.Vector3(0, 0, 0), distance: 5.3 };
}

/** Renders the four pieces in December's colors and returns them as pictures (object URLs). */
export async function renderCrafts(goal: DailyGoal, palette: string[], w: number, h: number): Promise<Record<Piece, string>> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    const frame = piece === "vase" ? vase(scene, palette, rand) : piece === "tapestry" ? tapestry(scene, palette, rand) : piece === "mosaic" ? mosaic(scene, palette, rand) : window_(scene, goal, palette);
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
