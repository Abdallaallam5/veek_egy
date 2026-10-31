/* =========================================================
   VEEK — 3D fabric for the piece in focus on the rack.
   The hanger shot is mapped onto a cloth mesh (Verlet
   particles) pinned at the hanger: it sways in a soft draft,
   ripples where the pointer touches it, and turns on its hook
   when dragged with a mouse. Neighbours stay flat images.
   ========================================================= */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";

const rack = document.querySelector("[data-rack]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (rack && rack.classList.contains("rack--cutouts") && !reduceMotion) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  } catch (e) {
    return; // no WebGL — the flat images stay
  }

  const narrow = window.innerWidth < 900;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const canvas = renderer.domElement;
  canvas.className = "cloth";
  canvas.setAttribute("aria-hidden", "true");

  /* ---------- scene ---------- */
  const scene = new THREE.Scene();
  // Light comes from just above the viewer: a face pointing at you keeps the photo's
  // own colours (ambient + key ≈ 1), and only the sides that curve away get a soft shade.
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xfff6ea, 0.46);
  key.position.set(0, 0.55, 1.6);
  scene.add(key);

  // Canvas overhangs the piece's 3:4 box: 25% each side, 6% above, 22% below (see .cloth in CSS).
  const BOX_H = 4 / 3;
  const VIEW = { left: -0.75, right: 0.75, top: 0.06 * BOX_H, bottom: -BOX_H - 0.22 * BOX_H };
  const viewH = VIEW.top - VIEW.bottom;
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, (VIEW.right - VIEW.left) / viewH, 0.1, 20);
  camera.position.set(0, (VIEW.top + VIEW.bottom) / 2, (viewH / 2) / Math.tan((FOV * Math.PI) / 360));
  camera.lookAt(0, camera.position.y, 0);

  const pivot = new THREE.Group(); // hangs from the hook (top centre)
  scene.add(pivot);

  const loader = new THREE.TextureLoader();
  const textures = {};

  function texture(src) {
    if (!textures[src]) {
      textures[src] = new Promise((resolve, reject) => {
        loader.load(src, (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 4;
          resolve(t);
        }, undefined, reject);
      });
    }
    return textures[src];
  }

  /* ---------- cloth ---------- */
  let cloth = null;

  function buildCloth(tex) {
    const img = tex.image;
    const a = img.height / img.width;
    // object-fit: contain, anchored to the top of the box
    const w = a <= BOX_H ? 1 : BOX_H / a;
    const h = a <= BOX_H ? a : BOX_H;

    const nx = narrow ? 16 : 22;
    const ny = Math.round(nx * (h / w));
    const geo = new THREE.PlaneGeometry(w, h, nx - 1, ny - 1);
    geo.translate(0, -h / 2, 0);

    const pos = geo.attributes.position.array;
    const count = pos.length / 3;

    // Give the garment volume: the body rounds back towards the sides like fabric over
    // a hanger, a touch more towards the hem, with a slight fullness at the chest.
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      const sx = pos[k] / (w / 2);          // -1 … 1 across
      const v = -pos[k + 1] / h;            // 0 at the hook, 1 at the hem
      const round = -0.17 * w * sx * sx * (0.45 + 0.55 * Math.min(1, v * 2.2));
      const chest = 0.035 * w * (1 - sx * sx) * Math.sin(Math.min(1, v * 1.4) * Math.PI);
      pos[k + 2] = (round + chest) * Math.min(1, v * 6); // flat where the hanger holds it
    }
    geo.computeVertexNormals();

    const rest = Float32Array.from(pos);
    const prev = Float32Array.from(pos);
    const pinned = new Uint8Array(count);
    const stiff = new Float32Array(count); // how strongly each point keeps its shape

    for (let i = 0; i < count; i++) {
      const v = -rest[i * 3 + 1] / h; // 0 at the hook, 1 at the hem
      pinned[i] = v < 0.17 ? 1 : 0;   // hanger + shoulders don't move
      stiff[i] = 0.012 + 0.09 * Math.pow(1 - v, 3);
    }

    // structural + shear springs
    const links = [];
    const at = (x, y) => y * nx + x;
    const link = (i, j) => {
      const dx = rest[i * 3] - rest[j * 3];
      const dy = rest[i * 3 + 1] - rest[j * 3 + 1];
      const dz = rest[i * 3 + 2] - rest[j * 3 + 2];
      links.push(i, j, Math.hypot(dx, dy, dz));
    };
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        if (x < nx - 1) link(at(x, y), at(x + 1, y));
        if (y < ny - 1) link(at(x, y), at(x, y + 1));
        if (x < nx - 1 && y < ny - 1) { link(at(x, y), at(x + 1, y + 1)); link(at(x + 1, y), at(x, y + 1)); }
      }
    }

    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    return { mesh, geo, pos, rest, prev, pinned, stiff, links: Float32Array.from(links), count, w, h };
  }

  function setCloth(next) {
    if (cloth) {
      pivot.remove(cloth.mesh);
      cloth.geo.dispose();
      cloth.mesh.material.dispose();
    }
    cloth = next;
    pivot.add(cloth.mesh);
  }

  /* ---------- simulation ---------- */
  let time = 0;
  let yaw = 0;
  let yawVel = 0;
  let yawTarget = 0;
  let lookYaw = 0; // turns gently towards the mouse while hovering
  let dragging = false;

  function step() {
    const c = cloth;
    const p = c.pos;
    const r = c.rest;
    const q = c.prev;
    time += 1 / 60;

    for (let i = 0; i < c.count; i++) {
      if (c.pinned[i]) continue;
      const k = i * 3;
      const v = -r[k + 1] / c.h;
      // draft: slow, broad gusts that build towards the hem, with a little flutter on top
      const gust = 0.6 + 0.4 * Math.sin(time * 0.37);
      const draft = 0.0008 * v * v * gust * (Math.sin(time * 0.9 + r[k] * 2.2 + v * 3.1) + 0.35 * Math.sin(time * 1.9 - r[k] * 4.1 + v * 2.2));
      for (let d = 0; d < 3; d++) {
        const cur = p[k + d];
        let acc = (r[k + d] - cur) * c.stiff[i]; // keep the garment's shape
        if (d === 2) acc += draft;
        p[k + d] = cur + (cur - q[k + d]) * 0.94 + acc;
        q[k + d] = cur;
      }
    }

    // keep the fabric from stretching
    const L = c.links;
    for (let it = 0; it < 3; it++) {
      for (let n = 0; n < L.length; n += 3) {
        const i = L[n] * 3;
        const j = L[n + 1] * 3;
        const dx = p[j] - p[i];
        const dy = p[j + 1] - p[i + 1];
        const dz = p[j + 2] - p[i + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = (dist - L[n + 2]) / dist * 0.5;
        const pi = c.pinned[L[n]];
        const pj = c.pinned[L[n + 1]];
        if (pi && pj) continue;
        const wi = pi ? 0 : pj ? 1 : 0.5;
        const wj = pj ? 0 : pi ? 1 : 0.5;
        p[i] += dx * diff * wi * 2; p[i + 1] += dy * diff * wi * 2; p[i + 2] += dz * diff * wi * 2;
        p[j] -= dx * diff * wj * 2; p[j + 1] -= dy * diff * wj * 2; p[j + 2] -= dz * diff * wj * 2;
      }
    }

    c.geo.attributes.position.needsUpdate = true;
    c.geo.computeVertexNormals();

    // the whole piece turns on its hook
    const idle = dragging ? 0 : Math.sin(time * 0.5) * 0.11 + Math.sin(time * 0.23) * 0.04;
    yawVel += ((yawTarget + lookYaw + idle) - yaw) * 0.04;
    yawVel *= 0.9;
    yaw += yawVel;
    pivot.rotation.y = yaw;
    // pendulum: it sways a touch on the hook, more while it turns
    pivot.rotation.z = -yawVel * 0.6 + Math.sin(time * 0.8) * 0.012;
  }

  /* ---------- pointer: poke the fabric, drag to turn ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const hit = new THREE.Vector3();
  let lastX = 0;
  let lastY = 0;
  let downX = 0;
  let moved = 0;

  function poke(clientX, clientY, strength) {
    if (!cloth) return;
    const b = canvas.getBoundingClientRect();
    ndc.set(((clientX - b.left) / b.width) * 2 - 1, -((clientY - b.top) / b.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    pivot.updateMatrixWorld();
    plane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1).applyQuaternion(pivot.quaternion),
      pivot.position
    );
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    pivot.worldToLocal(hit);

    // a wide, soft push — the fabric gives way instead of denting
    const c = cloth;
    const R = 0.42;
    for (let i = 0; i < c.count; i++) {
      if (c.pinned[i]) continue;
      const k = i * 3;
      const d = Math.hypot(c.rest[k] - hit.x, c.rest[k + 1] - hit.y);
      if (d < R) {
        const f = 1 - d / R;
        c.prev[k + 2] += strength * f * f * (3 - 2 * f);
      }
    }
  }

  canvas.addEventListener("pointermove", (e) => {
    const speed = Math.min(Math.hypot(e.clientX - lastX, e.clientY - lastY), 40);
    lastX = e.clientX;
    lastY = e.clientY;
    poke(e.clientX, e.clientY, speed * 0.00006);
    if (dragging) {
      moved = Math.max(moved, Math.abs(e.clientX - downX));
      yawTarget = Math.max(-0.95, Math.min(0.95, (e.clientX - downX) * 0.008));
    } else if (e.pointerType === "mouse") {
      const b = canvas.getBoundingClientRect();
      lookYaw = ((e.clientX - b.left) / b.width - 0.5) * 0.45;
    }
  });

  canvas.addEventListener("pointerleave", () => { lookYaw = 0; });

  canvas.addEventListener("pointerdown", (e) => {
    lastX = downX = e.clientX;
    lastY = e.clientY;
    moved = 0;
    poke(e.clientX, e.clientY, 0.004);
    if (e.pointerType === "mouse") {
      dragging = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
      canvas.classList.add("is-grabbing");
    } else {
      yawVel += 0.012 * (e.clientX > canvas.getBoundingClientRect().left + canvas.clientWidth / 2 ? -1 : 1);
    }
  });

  function release() {
    if (!dragging) return;
    dragging = false;
    yawTarget = 0;
    canvas.classList.remove("is-grabbing");
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // a click (not a drag) opens the piece, like clicking the image did
  canvas.addEventListener("click", (e) => {
    e.stopPropagation(); // the canvas sits inside the piece's button
    if (moved < 6 && host) host.querySelector(".hang__btn").click();
  });

  /* ---------- attach to the piece in focus ---------- */
  let host = null;
  let token = 0;
  let running = false;
  let visible = true;
  let frame = 0;

  function loop() {
    frame = 0;
    if (!running || !visible || !cloth) return;
    step();
    renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  }

  function start() {
    running = true;
    if (!frame) frame = requestAnimationFrame(loop);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w && h) renderer.setSize(w, h, false);
  }

  const resizeObserver = new ResizeObserver(resize);

  function detach() {
    token++;
    running = false;
    if (host) host.classList.remove("has-cloth");
    canvas.classList.remove("is-on");
    host = null;
  }

  async function attach(el) {
    detach();
    if (!el || !el.classList.contains("hang--cutout")) return;
    const my = token;
    const src = el.dataset.front;
    let tex;
    try { tex = await texture(src); } catch (e) { return; }
    if (my !== token) return; // focus moved on while loading

    host = el;
    el.querySelector(".hang__cut").appendChild(canvas);
    resizeObserver.disconnect();
    resizeObserver.observe(canvas);
    resize();

    setCloth(buildCloth(tex));
    yaw = 0;
    yawTarget = 0;
    lookYaw = 0;
    yawVel = 0.018; // it settles onto the hook with a little swing
    step();
    renderer.render(scene, camera);
    el.classList.add("has-cloth");
    canvas.classList.add("is-on");
    start();
  }

  rack.addEventListener("rack:settle", (e) => attach(e.detail.el));
  rack.addEventListener("rack:leave", detach);

  // pause when the rack is off screen or the tab is hidden
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting && !document.hidden;
    if (visible && host) start();
  }).observe(rack);

  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible && host) start();
  });

  // warm up the other textures once the page is idle
  const warm = () => rack.querySelectorAll(".hang--cutout").forEach((el) => texture(el.dataset.front).catch(() => {}));
  if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 4000 });
  else setTimeout(warm, 2500);

  // the rack may have settled on its first piece before this module loaded
  const current = rack.querySelector(".hang.is-current");
  if (current && rack.classList.contains("is-focus")) attach(current);
}
