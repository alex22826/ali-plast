/* =========================================================
   Полиэтиленовый пакет-майка для страницы входа.
   Физика плёнки: частицы (Verlet) + связи + мягкая «память формы»,
   ветер, курсор толкает воздух. Рендер — three.js, плёнка с
   радужным переливом (iridescence), прозрачностью и морщинками.
   ========================================================= */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

export function createBag(canvas, opts = {}) {
  const mobile = Math.min(innerWidth, innerHeight) < 700;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  scene.add(new THREE.HemisphereLight(0xd8e6ff, 0x1b1530, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.8); key.position.set(-2.5, 4.5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9d6ff, 0.9); fill.position.set(-4, -1, 4); scene.add(fill);
  const rimC = new THREE.PointLight(0x5fe3ff, 38, 0, 2); rimC.position.set(-3.6, 1.4, 3); scene.add(rimC);
  const rimP = new THREE.PointLight(0xff6fd8, 30, 0, 2); rimP.position.set(3.6, -2.2, 2.6); scene.add(rimP);
  const rimV = new THREE.PointLight(0x8f7bff, 26, 0, 2); rimV.position.set(0, 3.2, -3); scene.add(rimV);

  /* ---------- форма пакета-майки на сетке ---------- */
  const NX = mobile ? 22 : 30, NY = mobile ? 28 : 38;
  const W = 2.3, H = 3.0, BULGE = 0.42;
  const VX = NX + 1, VY = NY + 1;
  const cell = new Uint8Array(NX * NY); // 0 — вырез (горловина), 1 — плёнка, 2 — срезанный угол ручки
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const u = (i + 0.5) / NX, v = (j + 0.5) / NY;
    const ex = (u - 0.5) / 0.235, ey = (v - 0.985) / 0.33;
    cell[j * NX + i] = ex * ex + ey * ey < 1 ? 0 : 1;
  }
  const cellAt = (i, j) => (i < 0 || j < 0 || i >= NX || j >= NY ? -1 : cell[j * NX + i]);
  const vid = (i, j) => j * VX + i;
  const used = new Uint8Array(VX * VY), joined = new Uint8Array(VX * VY), rim = new Uint8Array(VX * VY);
  for (let j = 0; j < VY; j++) for (let i = 0; i < VX; i++) {
    let any = false, bound = false, open = false;
    for (const [ci, cj] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) {
      const c = cellAt(ci, cj);
      if (c === 1) any = true; else bound = true;
      if (c === 0) open = true;
    }
    used[vid(i, j)] = any ? 1 : 0;
    joined[vid(i, j)] = any && bound && !open ? 1 : 0; // шов: перед и зад сварены, кроме горловины
    rim[vid(i, j)] = any && open ? 1 : 0;
  }
  // «надутость»: расстояние до шва
  const dist = new Float32Array(VX * VY).fill(1e9);
  const q = [];
  for (let k = 0; k < VX * VY; k++) if (joined[k]) { dist[k] = 0; q.push(k); }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % VX, j = (k / VX) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= VX || nj >= VY) continue;
      const nk = vid(ni, nj);
      if (!used[nk] || dist[nk] <= dist[k] + 1) continue;
      dist[nk] = dist[k] + 1; q.push(nk);
    }
  }
  const DM = NX * 0.3;
  // заломы: острые гребни, как у пакета, который мяли и складывали
  const CREASES = [[0.8, 0.6, 3.1, 0.3, 0.1], [-0.5, 0.86, 2.4, 1.7, 0.085], [0.2, -0.98, 4.2, 0.9, 0.065], [0.95, -0.3, 5.3, 2.2, 0.045], [-0.7, -0.7, 6.8, 0.4, 0.03]];
  // + боковые фальцы пакета-майки (складки по бокам)
  const crease = (x, y) => CREASES.reduce((s, [dx, dy, fq, ph, a]) => s + a * (1 - Math.abs(Math.sin((x * dx + y * dy) * fq + ph))), 0) - 0.11 * Math.exp(-Math.pow((Math.abs(x) - W * 0.37) / 0.09, 2));

  // частицы: перед и зад, швы общие
  const front = new Int32Array(VX * VY).fill(-1), back = new Int32Array(VX * VY).fill(-1);
  const restL = [];
  let N = 0;
  for (let k = 0; k < VX * VY; k++) {
    if (!used[k]) continue;
    const i = k % VX, j = (k / VX) | 0;
    let u = i / NX, v = j / NY;
    if (rim[k]) { const ex = (u - 0.5) / 0.235, ey = (v - 0.985) / 0.33, r = Math.hypot(ex, ey) || 1; u = 0.5 + (ex / r) * 0.235; v = Math.min(1, 0.985 + (ey / r) * 0.33); } // край горловины — точно по дуге, без «лесенки»
    const x = (u - 0.5) * W, y = (v - 0.5) * H;
    const f = Math.min(1, dist[k] / DM), b = BULGE * (1 - (1 - f) * (1 - f));
    const cz = crease(x, y) * (0.35 + 0.65 * f);
    front[k] = N++; restL.push(x, y, b + cz);
    if (joined[k]) back[k] = front[k];
    else { back[k] = N++; restL.push(x, y, -b + cz * 0.8); }
  }
  const rest = new Float32Array(restL);
  const pos = new Float32Array(N * 3), prev = new Float32Array(N * 3), target = new Float32Array(N * 3);

  // связи: структурные, диагональные и изгибные (низкая жёсткость на изгиб = плёнка мнётся)
  const cA = [], cB = [], cR = [], cK = [];
  const addC = (a, b, k) => { if (a < 0 || b < 0 || a === b) return; cA.push(a); cB.push(b); cK.push(k); cR.push(Math.hypot(rest[a * 3] - rest[b * 3], rest[a * 3 + 1] - rest[b * 3 + 1], rest[a * 3 + 2] - rest[b * 3 + 2])); };
  const edgeH = (i, j) => used[vid(i, j)] && used[vid(i + 1, j)] && (cellAt(i, j - 1) === 1 || cellAt(i, j) === 1);
  const edgeV = (i, j) => used[vid(i, j)] && used[vid(i, j + 1)] && (cellAt(i - 1, j) === 1 || cellAt(i, j) === 1);
  for (const M of [front, back]) {
    for (let j = 0; j < VY; j++) for (let i = 0; i < VX; i++) {
      if (i < NX && edgeH(i, j)) addC(M[vid(i, j)], M[vid(i + 1, j)], 1);
      if (j < NY && edgeV(i, j)) addC(M[vid(i, j)], M[vid(i, j + 1)], 1);
      if (i < NX && j < NY && cellAt(i, j) === 1) { addC(M[vid(i, j)], M[vid(i + 1, j + 1)], 0.9); addC(M[vid(i + 1, j)], M[vid(i, j + 1)], 0.9); }
      if (i < NX - 1 && edgeH(i, j) && edgeH(i + 1, j)) addC(M[vid(i, j)], M[vid(i + 2, j)], 0.3);
      if (j < NY - 1 && edgeV(i, j) && edgeV(i, j + 1)) addC(M[vid(i, j)], M[vid(i, j + 2)], 0.3);
    }
  }
  const CA = Int32Array.from(cA), CB = Int32Array.from(cB), CR = Float32Array.from(cR), CK = Float32Array.from(cK);

  /* ---------- текстуры: логотип, прозрачность, морщинки ---------- */
  function logoCanvas(alpha) {
    const cw = 1024, chh = Math.round(1024 * (H / W));
    const c = document.createElement('canvas'); c.width = cw; c.height = chh;
    const g = c.getContext('2d');
    g.fillStyle = alpha ? 'rgb(168,168,168)' : '#ffffff'; g.fillRect(0, 0, cw, chh);
    const ink = alpha ? '#ffffff' : '#2340E8', ink2 = alpha ? '#ffffff' : '#E0368F';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const cx = cw / 2;
    // знак: маленький пакет
    g.save(); g.translate(cx, chh * 0.4); g.scale(2.6, 2.6); g.translate(-24, -24);
    g.fillStyle = ink2;
    g.fill(new Path2D('M9 8a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 19 8v3.5q0 6 5 6t5-6V8a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 39 8v31a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4z'));
    g.restore();
    g.fillStyle = ink;
    g.font = '700 132px Unbounded, Manrope, sans-serif';
    g.fillText('ALI PLAST', cx, chh * 0.52);
    g.font = '700 40px Manrope, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = '14px';
    g.fillText('CHIRCHIQ · UZBEKISTAN', cx, chh * 0.595);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillRect(cx - 160, chh * 0.64, 320, 6);
    g.fillStyle = ink2;
    g.font = '800 46px Manrope, sans-serif';
    g.fillText('Rahmat! · Спасибо!', cx, chh * 0.69);
    return c;
  }
  function crinkleCanvas() {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.lineCap = 'round';
    for (let n = 0; n < 110; n++) {
      const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI, len = 40 + rnd() * 260;
      g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.38)' : 'rgba(0,0,0,.38)';
      g.lineWidth = 1 + rnd() * 3;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        g.beginPath(); g.moveTo(x + ox, y + oy);
        g.quadraticCurveTo(x + ox + Math.cos(a + 0.4) * len * 0.5, y + oy + Math.sin(a + 0.4) * len * 0.5, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
        g.stroke();
      }
    }
    const blur = document.createElement('canvas'); blur.width = blur.height = S;
    const bg = blur.getContext('2d'); bg.filter = 'blur(1.6px)'; bg.drawImage(c, 0, 0);
    const src = bg.getImageData(0, 0, S, S).data, out = g.createImageData(S, S), o = out.data;
    const h = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 6, dy = (h(x, y + 1) - h(x, y - 1)) * 6;
      const l = Math.hypot(dx, dy, 1), p = (y * S + x) * 4;
      o[p] = (-dx / l * 0.5 + 0.5) * 255; o[p + 1] = (dy / l * 0.5 + 0.5) * 255; o[p + 2] = (1 / l * 0.5 + 0.5) * 255; o[p + 3] = 255;
    }
    g.putImageData(out, 0, 0);
    return c;
  }
  const mapTex = new THREE.CanvasTexture(logoCanvas(false)); mapTex.colorSpace = THREE.SRGBColorSpace; mapTex.anisotropy = 4;
  const alphaTex = new THREE.CanvasTexture(logoCanvas(true));
  const crTex = new THREE.CanvasTexture(crinkleCanvas());
  crTex.wrapS = crTex.wrapT = THREE.RepeatWrapping; crTex.repeat.set(2.2, 2.8);
  const redrawLogo = () => { mapTex.image = logoCanvas(false); alphaTex.image = logoCanvas(true); mapTex.needsUpdate = alphaTex.needsUpdate = true; };
  if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 150px Unbounded'), document.fonts.load('800 46px Manrope')]).then(redrawLogo).catch(() => {});

  const filmBase = {
    color: 0xffffff, roughness: 0.15, metalness: 0, transparent: true, side: THREE.DoubleSide, depthWrite: false,
    clearcoat: 1, clearcoatRoughness: 0.06, iridescence: 1, iridescenceIOR: 1.5, iridescenceThicknessRange: [120, 760],
    sheen: 0.25, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xd6e4ff), envMapIntensity: 1.9,
    emissive: new THREE.Color(0x141a2c), emissiveIntensity: 0.6,
    normalMap: crTex, normalScale: new THREE.Vector2(0.55, 0.55),
  };
  const matFront = new THREE.MeshPhysicalMaterial(Object.assign({}, filmBase, { map: mapTex, alphaMap: alphaTex, opacity: 1 }));
  const matBack = new THREE.MeshPhysicalMaterial(Object.assign({}, filmBase, { opacity: 0.46 }));

  function sheetGeometry(map, flip) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(VX * VY * 3), uv = new Float32Array(VX * VY * 2);
    for (let j = 0; j < VY; j++) for (let i = 0; i < VX; i++) { const k = vid(i, j); uv[k * 2] = i / NX; uv[k * 2 + 1] = j / NY; }
    const idx = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      if (cellAt(i, j) !== 1) continue;
      const a = vid(i, j), b = vid(i + 1, j), c = vid(i, j + 1), d = vid(i + 1, j + 1);
      if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.userData.map = map;
    return g;
  }
  const gFront = sheetGeometry(front, false), gBack = sheetGeometry(back, true);
  const mBack = new THREE.Mesh(gBack, matBack), mFront = new THREE.Mesh(gFront, matFront);
  mBack.frustumCulled = mFront.frustumCulled = false;
  mBack.renderOrder = 1; mFront.renderOrder = 2;
  scene.add(mBack, mFront);

  // пылинки в воздухе — для глубины
  const DUST = mobile ? 70 : 140;
  const dpos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) { dpos[i * 3] = (Math.random() - 0.5) * 14; dpos[i * 3 + 1] = (Math.random() - 0.5) * 9; dpos[i * 3 + 2] = -4 + Math.random() * 5; }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: 0xa9b8ff, size: 0.028, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- раскладка кадра ---------- */
  const view = { baseX: 0, baseY: 0, visW: 1, visH: 1 };
  function fit() {
    // скрытая вкладка/окно может отдать 0×0 — тогда считаем по условному экрану, иначе координаты станут NaN
    const w = canvas.clientWidth || innerWidth || 1280, h = canvas.clientHeight || innerHeight || 800;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let visH;
    if (aspect >= 1.05) { visH = H * 1.34; view.visW = visH * aspect; view.baseX = Math.min(view.visW * 0.22, view.visW / 2 - W * 0.62); view.baseY = -0.04; }
    else { const visW = W * 2.0; visH = visW / aspect; view.visW = visW; view.baseX = 0; view.baseY = Math.min(visH * 0.21, visH / 2 - H * 0.6); }
    view.visH = visH;
    camera.position.set(0, 0, visH / 2 / tan);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  fit();
  addEventListener('resize', fit);

  /* ---------- курсор: толкает воздух ---------- */
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, wx: 0, wy: 0, vx: 0, vy: 0, has: false, last: 0 };
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ndc.set(ptr.x, ptr.y); ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      const now = performance.now(), dt = Math.max(8, now - ptr.last) / 1000;
      if (ptr.has) { ptr.vx = ptr.vx * 0.6 + ((hit.x - ptr.wx) / dt) * 0.4; ptr.vy = ptr.vy * 0.6 + ((hit.y - ptr.wy) / dt) * 0.4; }
      ptr.wx = hit.x; ptr.wy = hit.y; ptr.has = true; ptr.last = now;
    }
    if (opts.onFirstMove) { opts.onFirstMove(); opts.onFirstMove = null; }
  }
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerleave', () => (ptr.has = false));
  canvas.addEventListener('pointerdown', (e) => { onMove(e); gust(1); });

  /* ---------- физика ---------- */
  const st = { t: 0, shy: 0, shyT: 0, shake: 0, fly: -1, flyCb: null, gust: 0, rotY: 0, rotX: 0, rotZ: 0 };
  const m4 = new THREE.Matrix4(), eul = new THREE.Euler(), quat = new THREE.Quaternion(), vpos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  function anchor() {
    const t = st.t;
    st.rotY += ((reduce ? 0 : 0.26 * Math.sin(t * 0.21)) + ptr.sx * 0.5 + st.shyT * 1.15 - st.rotY) * 0.06;
    st.rotX += ((reduce ? 0 : 0.06 * Math.sin(t * 0.33)) - ptr.sy * 0.2 - st.rotX) * 0.06;
    st.rotZ += ((reduce ? 0 : 0.07 * Math.sin(t * 0.17 + 1.3)) - ptr.sx * 0.06 - st.rotZ) * 0.06;
    let x = view.baseX + (reduce ? 0 : 0.12 * Math.sin(t * 0.25)) + st.shake * 0.16 * Math.sin(t * 46);
    let y = view.baseY + (reduce ? 0 : 0.1 * Math.sin(t * 0.37));
    let rz = st.rotZ;
    if (st.fly >= 0) { y += st.fly * st.fly * 5.5; x += st.fly * 1.2; rz += st.fly * 1.4; }
    eul.set(st.rotX, st.rotY, rz);
    quat.setFromEuler(eul); vpos.set(x, y, 0);
    m4.compose(vpos, quat, one);
    const e = m4.elements;
    for (let i = 0; i < N; i++) {
      const rx = rest[i * 3], ry = rest[i * 3 + 1], rzz = rest[i * 3 + 2];
      target[i * 3] = e[0] * rx + e[4] * ry + e[8] * rzz + e[12];
      target[i * 3 + 1] = e[1] * rx + e[5] * ry + e[9] * rzz + e[13];
      target[i * 3 + 2] = e[2] * rx + e[6] * ry + e[10] * rzz + e[14];
    }
  }
  anchor();
  pos.set(target); prev.set(target);

  const DT = 1 / 60, DT2 = DT * DT;
  function step() {
    st.t += DT;
    ptr.sx += ((ptr.has ? ptr.x : 0) - ptr.sx) * 0.05;
    ptr.sy += ((ptr.has ? ptr.y : 0) - ptr.sy) * 0.05;
    ptr.vx *= 0.92; ptr.vy *= 0.92;
    st.shyT += (st.shy - st.shyT) * 0.05;
    st.shake *= 0.94;
    st.gust *= 0.96;
    if (st.fly >= 0) { st.fly += DT; if (st.fly > 1.05 && st.flyCb) { const cb = st.flyCb; st.flyCb = null; cb(); } }
    anchor();
    const t = st.t;
    const gustiness = (reduce ? 0.25 : 0.6 + 0.4 * Math.sin(t * 0.6) * Math.sin(t * 0.23)) + st.gust * 3 + (st.fly >= 0 ? 4 : 0);
    const pv = Math.hypot(ptr.vx, ptr.vy);
    const R = 1.0;
    for (let i = 0; i < N; i++) {
      const ix = i * 3;
      const x = pos[ix], y = pos[ix + 1], z = pos[ix + 2];
      let ax = 0.4 * Math.sin(y * 1.9 + t * 0.7) * gustiness;
      let ay = 0.3 * Math.cos(x * 1.4 + t * 0.8) * gustiness - 0.15;
      let az = (Math.sin(x * 1.7 + t * 1.3) * Math.cos(y * 1.3 - t * 0.9) + 0.6 * Math.sin((x - y) * 2.3 + t * 2.1)) * 1.6 * gustiness;
      if (ptr.has) {
        const dx = x - ptr.wx, dy = y - ptr.wy, d = Math.hypot(dx, dy);
        if (d < R) {
          const f = (1 - d / R) * (1 - d / R);
          ax += ptr.vx * 9 * f + (dx / (d + 1e-4)) * 3 * f;
          ay += ptr.vy * 9 * f + (dy / (d + 1e-4)) * 3 * f;
          az -= (15 + Math.min(pv, 4) * 9) * f;
        }
      }
      const vx = (x - prev[ix]) * 0.972, vy = (y - prev[ix + 1]) * 0.972, vz = (z - prev[ix + 2]) * 0.972;
      prev[ix] = x; prev[ix + 1] = y; prev[ix + 2] = z;
      pos[ix] = x + vx + ax * DT2; pos[ix + 1] = y + vy + ay * DT2; pos[ix + 2] = z + vz + az * DT2;
    }
    const nc = CA.length;
    for (let it = 0; it < 4; it++) {
      for (let c = 0; c < nc; c++) {
        const a = CA[c] * 3, b = CB[c] * 3;
        const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const k = ((d - CR[c]) / d) * 0.5 * CK[c];
        pos[a] += dx * k; pos[a + 1] += dy * k; pos[a + 2] += dz * k;
        pos[b] -= dx * k; pos[b + 1] -= dy * k; pos[b + 2] -= dz * k;
      }
    }
    const kS = st.fly >= 0 ? 0.06 : 0.032; // «память формы»: плёнка трепещет, но остаётся пакетом
    for (let i = 0; i < N * 3; i++) pos[i] += (target[i] - pos[i]) * kS;
    // пылинки
    for (let i = 0; i < DUST; i++) { dpos[i * 3 + 1] += 0.0025 + Math.sin(t + i) * 0.0008; dpos[i * 3] += Math.sin(t * 0.3 + i) * 0.0015 + ptr.vx * 0.0006; if (dpos[i * 3 + 1] > 4.6) dpos[i * 3 + 1] = -4.6; }
  }
  function upload() {
    for (const g of [gFront, gBack]) {
      const map = g.userData.map, p = g.attributes.position.array;
      for (let k = 0; k < VX * VY; k++) { const id = map[k]; if (id < 0) continue; p[k * 3] = pos[id * 3]; p[k * 3 + 1] = pos[id * 3 + 1]; p[k * 3 + 2] = pos[id * 3 + 2]; }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
    }
    dGeo.attributes.position.needsUpdate = true;
    dust.position.x = -ptr.sx * 0.25; dust.position.y = -ptr.sy * 0.15;
  }
  function gust(power) {
    st.gust = Math.min(1.5, st.gust + power);
    for (let i = 0; i < N; i++) {
      const ix = i * 3, dx = pos[ix] - ptr.wx, dy = pos[ix + 1] - ptr.wy, d = Math.hypot(dx, dy) + 0.3;
      const k = (0.022 * power) / d;
      prev[ix] -= (dx / d) * k; prev[ix + 1] -= (dy / d) * k; prev[ix + 2] += k * 0.8;
    }
  }

  let raf = 0, acc = 0, last = performance.now(), running = true;
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    acc += Math.min(0.1, (now - last) / 1000); last = now;
    let n = 0;
    while (acc >= DT && n < 3) { step(); acc -= DT; n++; }
    if (n) { upload(); renderer.render(scene, camera); }
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  if (opts.onReady) opts.onReady();

  return {
    shake() { st.shake = 1; gust(0.4); },
    setShy(v) { st.shy = v ? (ptr.sx > 0 ? -1 : 1) : 0; },
    flyAway(cb) { st.fly = 0; st.flyCb = cb; st.shy = 0; },
    gust,
    stats() { let nan = 0; for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) nan++; let rn = 0; for (let i = 0; i < rest.length; i++) if (!Number.isFinite(rest[i])) rn++; let cr = 0; for (let i = 0; i < CR.length; i++) if (!Number.isFinite(CR[i])) cr++; return { N, nan, rn, cr, C: CA.length, base: [view.baseX, view.baseY, camera.position.z], t: [target[0], target[1], target[2]] }; },
    dispose() { running = false; cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
