/* journey.js — v6
   Full 3D cinematic tour, detailed ship, self-contained flow.
   Fixes the "ship vanishes" bug by using outward normals for approach positions,
   plus a hard safety net that pushes ship/camera out of planets if they clip in. */

console.log('[journey] v6 loading…');

(function(){
'use strict';

var CONFIG = {
  threeURL: 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
  threeMaxTries: 60,
  cardReadTime: 6000,
  pageDwellTime: 6000,
  labDwellTime: 5000,
  completeDwell: 15000,
  verbose: true
};

function log(){
  if (!CONFIG.verbose) return;
  try { console.log.apply(console, ['[journey]'].concat([].slice.call(arguments))); } catch (e) {}
}
function warn(){ try { console.warn.apply(console, ['[journey] WARN'].concat([].slice.call(arguments))); } catch (e) {} }
function err(){ try { console.error.apply(console, ['[journey] ERROR'].concat([].slice.call(arguments))); } catch (e) {} }

function setText(id, text){ try { var el = document.getElementById(id); if (el) el.textContent = text; } catch (e) {} }
function setHTML(id, html){ try { var el = document.getElementById(id); if (el) el.innerHTML = html; } catch (e) {} }
function forceSection(id){
  try {
    var all = document.querySelectorAll('section');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
    var t = document.getElementById(id);
    if (t) { t.classList.add('on'); return true; }
  } catch (e) {}
  return false;
}

/* ========================================================================== */
/*  BOOT                                                                      */
/* ========================================================================== */

var threeRequested = false;

function boot(tries){
  tries = tries || 0;
  if (document.getElementById('j3-overlay')) return;

  if (typeof window.THREE === 'undefined') {
    if (!threeRequested) {
      threeRequested = true;
      log('loading Three.js');
      var s = document.createElement('script');
      s.src = CONFIG.threeURL;
      s.onload = function(){ log('Three.js loaded'); boot(tries); };
      s.onerror = function(){ err('failed to load Three.js'); alert('Could not load 3D library.'); };
      document.head.appendChild(s);
      return;
    }
    if (tries > CONFIG.threeMaxTries) { err('THREE never appeared'); return; }
    return setTimeout(function(){ boot(tries + 1); }, 250);
  }

  try { build(); log('v6 build complete'); }
  catch (e) { err('build failed:', e); alert('Tour failed: ' + (e && e.message ? e.message : e)); }
}

/* ========================================================================== */
/*  BUILD                                                                     */
/* ========================================================================== */

function build(){

/* -------------------------------------------------------------------------- */
/*  CSS                                                                       */
/* -------------------------------------------------------------------------- */

var style = document.createElement('style');
style.textContent = [
  '#j3-overlay{position:fixed;inset:0;z-index:10000;background:#05080f;display:none;overflow:hidden}',
  '#j3-overlay.on{display:block}',
  '#j3-cv{position:absolute;inset:0;width:100%;height:100%;display:block}',
  '.j3-hud{position:absolute;inset:0;pointer-events:none;z-index:2;font-family:"JetBrains Mono",monospace;color:#eaf1ff}',
  '.j3-top{position:absolute;top:0;left:0;right:0;padding:18px 24px;display:flex;justify-content:space-between;align-items:flex-start;background:linear-gradient(180deg,rgba(5,8,15,.92),transparent 80%)}',
  '.j3-brand{font-family:Fraunces,Georgia,serif;font-size:17px;font-weight:500;color:#fff}',
  '.j3-brand em{font-style:italic;color:#ff8cc0}',
  '.j3-brand small{display:block;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:#7ea7d8;margin-top:3px}',
  '.j3-dest{text-align:right;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7ea7d8}',
  '.j3-dest b{display:block;color:#58d6f1;font-size:12px;margin-bottom:2px}',
  '.j3-status{position:absolute;top:100px;left:24px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#58d6f1;background:rgba(5,8,15,.72);padding:5px 10px;border-radius:6px;pointer-events:none;opacity:0;transition:opacity .3s}',
  '.j3-status.on{opacity:1}',
  '.j3-skip{position:absolute;top:96px;right:24px;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:rgba(15,20,30,.8);border:1px solid rgba(88,214,241,.28);color:#eaf1ff;border-radius:6px;padding:7px 12px;cursor:pointer;pointer-events:auto}',
  '.j3-skip:hover{background:rgba(88,214,241,.2)}',
  '.j3-bottom{position:absolute;bottom:0;left:0;right:0;padding:16px 24px 20px;background:linear-gradient(0deg,rgba(5,8,15,.92),transparent 80%);pointer-events:auto}',
  '.j3-progress{height:3px;background:rgba(88,214,241,.15);border-radius:9px;overflow:hidden;margin-bottom:10px}',
  '.j3-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff8cc0,#58d6f1);border-radius:9px;transition:width .6s ease}',
  '.j3-meta{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}',
  '.j3-phase{font-family:Fraunces,Georgia,serif;font-size:15px;color:#fff}',
  '.j3-phase small{display:block;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#58d6f1;margin-top:2px}',
  '.j3-ctrl{display:flex;gap:6px}',
  '.j3-ctrl button{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:rgba(15,20,30,.8);border:1px solid rgba(88,214,241,.28);color:#eaf1ff;border-radius:6px;padding:7px 12px;cursor:pointer}',
  '.j3-ctrl button:hover{background:rgba(88,214,241,.2)}',
  '.j3-card{position:absolute;top:50%;right:24px;transform:translateY(-50%) translateX(120%);width:min(360px,calc(100vw - 48px));background:rgba(15,20,30,.94);backdrop-filter:blur(16px);border:1px solid rgba(88,214,241,.32);border-radius:14px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.6);transition:transform .5s cubic-bezier(.22,.9,.3,1);pointer-events:auto}',
  '.j3-card.on{transform:translateY(-50%) translateX(0)}',
  '.j3-card .j3-label{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#58d6f1;margin-bottom:6px}',
  '.j3-card h3{font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:500;color:#fff;line-height:1.15;margin:0 0 8px}',
  '.j3-card .j3-loc{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7ea7d8;margin-bottom:12px}',
  '.j3-card p{font-size:13px;line-height:1.55;color:#c4c7ca;margin:0 0 14px}',
  '.j3-card .j3-btns{display:flex;gap:8px;flex-wrap:wrap}',
  '.j3-card .j3-next{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#05080f;background:#58d6f1;border:0;padding:10px 16px;border-radius:7px;cursor:pointer;font-weight:500}',
  '.j3-card .j3-next:hover{background:#7ee4ff}',
  '.j3-card .j3-open{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#58d6f1;background:transparent;border:1px solid rgba(88,214,241,.4);padding:10px 14px;border-radius:7px;cursor:pointer;font-weight:500}',
  '.j3-card .j3-open:hover{background:rgba(88,214,241,.15)}',
  '.j3-card .j3-note{font-size:11px;color:#7ea7d8;margin-top:10px;min-height:16px}',
  '@media(max-width:640px){.j3-top{padding:14px}.j3-bottom{padding:12px 14px 16px}.j3-card{top:auto;bottom:140px;right:14px;left:14px;width:auto;transform:translateY(20px)}.j3-card.on{transform:translateY(0)}.j3-status{top:70px;left:14px}.j3-skip{top:66px;right:14px}}'
].join('');
document.head.appendChild(style);

/* -------------------------------------------------------------------------- */
/*  HTML                                                                      */
/* -------------------------------------------------------------------------- */

var ov = document.createElement('div');
ov.id = 'j3-overlay';
ov.innerHTML =
  '<canvas id="j3-cv"></canvas>' +
  '<div class="j3-hud">' +
    '<div class="j3-top">' +
      '<div class="j3-brand">Galactic <em>Journey</em><small>3D Tour</small></div>' +
      '<div class="j3-dest"><b id="j3-dest">Earth</b><span id="j3-dist">Orbit</span></div>' +
    '</div>' +
    '<div class="j3-status" id="j3-status"></div>' +
    '<button class="j3-skip" id="j3-skip" type="button">Skip stage →</button>' +
    '<div class="j3-card" id="j3-card">' +
      '<div class="j3-label" id="j3-clab"></div>' +
      '<h3 id="j3-cname"></h3>' +
      '<div class="j3-loc" id="j3-cloc"></div>' +
      '<p id="j3-cbody"></p>' +
      '<div class="j3-btns">' +
        '<button class="j3-next" id="j3-next-art" type="button">Next relic →</button>' +
        '<button class="j3-open" id="j3-open-page" type="button">Open full page →</button>' +
      '</div>' +
      '<div class="j3-note" id="j3-note"></div>' +
    '</div>' +
    '<div class="j3-bottom">' +
      '<div class="j3-progress"><i id="j3-prog"></i></div>' +
      '<div class="j3-meta">' +
        '<div class="j3-phase" id="j3-phase">Launch<small id="j3-sub">Departing Earth</small></div>' +
        '<div class="j3-ctrl"><button id="j3-end" type="button">End journey</button></div>' +
      '</div>' +
    '</div>' +
  '</div>';
document.body.appendChild(ov);

var statusEl = document.getElementById('j3-status');
function setStatus(msg){
  if (!statusEl) return;
  statusEl.textContent = msg || '';
  if (msg) statusEl.classList.add('on');
  else statusEl.classList.remove('on');
}

/* -------------------------------------------------------------------------- */
/*  RENDERER / SCENE / CAMERA                                                 */
/* -------------------------------------------------------------------------- */

var canvas = document.getElementById('j3-cv');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05080f, 1);

var scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05080f, 0.0007);

var camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 8000);

scene.add(new THREE.AmbientLight(0x2a3550, 0.8));

var sunLight = new THREE.DirectionalLight(0xfff0d0, 2.4);
sunLight.position.set(150, 80, 100);
scene.add(sunLight);

var rimLight = new THREE.DirectionalLight(0x4a9eff, 0.8);
rimLight.position.set(-100, -50, -100);
scene.add(rimLight);

var sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(14, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xfff0b0 })
);
sunSphere.position.copy(sunLight.position).multiplyScalar(2);
scene.add(sunSphere);

/* Sun glow. */
var sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(28, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0xffdd88, transparent: true, opacity: 0.18,
    side: THREE.BackSide, blending: THREE.AdditiveBlending
  })
);
sunGlow.position.copy(sunSphere.position);
scene.add(sunGlow);

/* -------------------------------------------------------------------------- */
/*  STAR FIELD — with color variance                                          */
/* -------------------------------------------------------------------------- */

(function makeStars(){
  var N = 5000;
  var g = new THREE.BufferGeometry();
  var pos = new Float32Array(N * 3);
  var col = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    var r = 1000 + Math.random() * 1500;
    var t = Math.random() * Math.PI * 2;
    var p = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(p) * Math.cos(t);
    pos[i*3+1] = r * Math.sin(p) * Math.sin(t);
    pos[i*3+2] = r * Math.cos(p);
    var v = Math.random();
    if (v < 0.7) { col[i*3] = 1; col[i*3+1] = 1; col[i*3+2] = 1; }
    else if (v < 0.85) { col[i*3] = 1; col[i*3+1] = 0.75; col[i*3+2] = 0.55; }
    else { col[i*3] = 0.65; col[i*3+1] = 0.82; col[i*3+2] = 1; }
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  var mat = new THREE.PointsMaterial({
    size: 1.3, transparent: true, opacity: 0.9,
    vertexColors: true, sizeAttenuation: true
  });
  scene.add(new THREE.Points(g, mat));
})();

/* Distant nebula spots — faint colored points. */
(function nebula(){
  var N = 400;
  var g = new THREE.BufferGeometry();
  var pos = new Float32Array(N * 3);
  var col = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    var cluster = Math.floor(i / 100);
    var cx = [800, -600, 1200, -900][cluster];
    var cy = [-400, 700, -800, 300][cluster];
    var cz = [1500, 1200, -1400, -1600][cluster];
    pos[i*3]   = cx + (Math.random() - 0.5) * 400;
    pos[i*3+1] = cy + (Math.random() - 0.5) * 400;
    pos[i*3+2] = cz + (Math.random() - 0.5) * 400;
    var palette = [
      [0.9, 0.5, 0.8],
      [0.5, 0.7, 1.0],
      [1.0, 0.8, 0.5],
      [0.6, 0.9, 0.7]
    ][cluster];
    col[i*3] = palette[0];
    col[i*3+1] = palette[1];
    col[i*3+2] = palette[2];
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 12, transparent: true, opacity: 0.35,
    vertexColors: true, sizeAttenuation: true,
    blending: THREE.AdditiveBlending, depthWrite: false
  })));
})();

/* -------------------------------------------------------------------------- */
/*  PLANETS                                                                   */
/* -------------------------------------------------------------------------- */

var PLANETS = {};

PLANETS.earth = new THREE.Mesh(
  new THREE.SphereGeometry(6, 64, 64),
  new THREE.MeshStandardMaterial({ color: 0x2a5a80, roughness: 0.9, metalness: 0.05 })
);
scene.add(PLANETS.earth);

PLANETS.earthGlow = new THREE.Mesh(
  new THREE.SphereGeometry(6.5, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0x4a9eff, transparent: true, opacity: 0.18,
    side: THREE.BackSide, blending: THREE.AdditiveBlending
  })
);
scene.add(PLANETS.earthGlow);

PLANETS.clouds = new THREE.Mesh(
  new THREE.SphereGeometry(6.06, 64, 64),
  new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 1 })
);
scene.add(PLANETS.clouds);

PLANETS.moon = new THREE.Mesh(
  new THREE.SphereGeometry(1.7, 48, 48),
  new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 1, metalness: 0 })
);
PLANETS.moon.position.set(28, 4, -8);
scene.add(PLANETS.moon);

PLANETS.moonGlow = new THREE.Mesh(
  new THREE.SphereGeometry(1.85, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0xdddddd, transparent: true, opacity: 0.1,
    side: THREE.BackSide, blending: THREE.AdditiveBlending
  })
);
PLANETS.moonGlow.position.copy(PLANETS.moon.position);
scene.add(PLANETS.moonGlow);

function marsProcTex(){
  var c = document.createElement('canvas');
  c.width = c.height = 512;
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#8a3a1f');
  g.addColorStop(.5, '#c05a32');
  g.addColorStop(1, '#8a3a1f');
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  for (var i = 0; i < 250; i++) {
    x.fillStyle = 'rgba(90,40,15,' + (0.15 + Math.random() * 0.35) + ')';
    x.fillRect(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 80, 4 + Math.random() * 15);
  }
  for (var j = 0; j < 800; j++) {
    x.fillStyle = 'rgba(255,220,200,' + (Math.random() * 0.15) + ')';
    x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  var t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

PLANETS.mars = new THREE.Mesh(
  new THREE.SphereGeometry(3.4, 48, 48),
  new THREE.MeshStandardMaterial({ map: marsProcTex(), roughness: 0.95, metalness: 0 })
);
PLANETS.mars.position.set(120, -6, -70);
scene.add(PLANETS.mars);

PLANETS.marsGlow = new THREE.Mesh(
  new THREE.SphereGeometry(3.75, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0xff8a4c, transparent: true, opacity: 0.15,
    side: THREE.BackSide, blending: THREE.AdditiveBlending
  })
);
PLANETS.marsGlow.position.copy(PLANETS.mars.position);
scene.add(PLANETS.marsGlow);

/* -------------------------------------------------------------------------- */
/*  SHIP — detailed                                                           */
/* -------------------------------------------------------------------------- */

var ship = new THREE.Group();

/* Fuselage — tapered cylinder. */
(function(){
  var geo = new THREE.CylinderGeometry(0.24, 0.32, 1.4, 14);
  geo.rotateX(Math.PI / 2);
  var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xe8ecf4, roughness: 0.32, metalness: 0.72
  }));
  ship.add(m);
})();

/* Nose cone. */
(function(){
  var geo = new THREE.ConeGeometry(0.24, 0.55, 14);
  geo.rotateX(Math.PI / 2);
  var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xff7a3c, roughness: 0.42, metalness: 0.55
  }));
  m.position.z = 0.975;
  ship.add(m);
})();

/* Cockpit dome — half sphere. */
(function(){
  var m = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x58d6f1, roughness: 0.05, metalness: 0.9,
      emissive: 0x1a4060, transparent: true, opacity: 0.88
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, 0.1, 0.35);
  ship.add(m);
})();

/* Emissive window strips on sides of fuselage. */
[-1, 1].forEach(function(s){
  var m = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.08, 0.35),
    new THREE.MeshBasicMaterial({ color: 0xffe0b0 })
  );
  m.position.set(s * 0.27, 0.06, 0.05);
  ship.add(m);
});

/* Tapered wings — extruded shape. */
[-1, 1].forEach(function(s){
  var shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.75, 0.08);
  shape.lineTo(0.7, 0.18);
  shape.lineTo(0.05, 0.22);
  shape.lineTo(0, 0);
  var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false });
  var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xd0d6e0, roughness: 0.42, metalness: 0.6
  }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = s * 0.06;
  m.position.set(s * 0.15, -0.02, -0.15);
  ship.add(m);

  /* Wing tip marker — small light. */
  var tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshBasicMaterial({ color: s > 0 ? 0xff3030 : 0x30ff30 })
  );
  tip.position.set(s * 0.85, 0.02, -0.02);
  ship.add(tip);
});

/* Twin engines + exhaust. */
[-0.18, 0.18].forEach(function(x){
  var engine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 0.35, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.55, metalness: 0.4 })
  );
  engine.rotation.x = Math.PI / 2;
  engine.position.set(x, -0.04, -0.78);
  ship.add(engine);

  var exhaust = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.5, 12),
    new THREE.MeshBasicMaterial({ color: 0xff7a3c, transparent: true, opacity: 0.9 })
  );
  exhaust.rotation.x = -Math.PI / 2;
  exhaust.position.set(x, -0.04, -1.15);
  ship.add(exhaust);

  var glow = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.75, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffaa00, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, -0.04, -1.22);
  ship.add(glow);
});

/* Tail fin. */
(function(){
  var m = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.36, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xd0d6e0, roughness: 0.42, metalness: 0.6 })
  );
  m.position.set(0, 0.26, -0.5);
  ship.add(m);
})();

/* Antenna with red beacon. */
(function(){
  var mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x808898, metalness: 0.9, roughness: 0.2 })
  );
  mast.position.set(0, 0.32, -0.15);
  ship.add(mast);

  var beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3030 })
  );
  beacon.position.set(0, 0.52, -0.15);
  beacon.userData.beacon = true;
  ship.add(beacon);
})();

scene.add(ship);

/* -------------------------------------------------------------------------- */
/*  TRAIL PARTICLES                                                           */
/* -------------------------------------------------------------------------- */

var trailPool = [];
(function initTrail(){
  for (var i = 0; i < 24; i++) {
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({
        color: 0xff8844, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    mesh.visible = false;
    scene.add(mesh);
    trailPool.push({ mesh: mesh, life: 0 });
  }
})();

function spawnTrail(pos){
  for (var i = 0; i < trailPool.length; i++) {
    if (trailPool[i].life <= 0) {
      trailPool[i].mesh.position.copy(pos);
      trailPool[i].mesh.visible = true;
      trailPool[i].life = 1;
      return;
    }
  }
}

function updateTrail(dt){
  for (var i = 0; i < trailPool.length; i++) {
    if (trailPool[i].life > 0) {
      trailPool[i].life -= dt * 1.4;
      trailPool[i].mesh.material.opacity = Math.max(0, trailPool[i].life) * 0.7;
      trailPool[i].mesh.scale.setScalar(1 + (1 - trailPool[i].life) * 2);
      if (trailPool[i].life <= 0) trailPool[i].mesh.visible = false;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  ARTIFACTS                                                                 */
/* -------------------------------------------------------------------------- */

var ARTIFACTS = [
  { id:'a15', name:'Moon Buggy', planet:'moon', label:'Apollo 15 · 1971', loc:'Hadley Rille', lat:26.13, lon:3.63,
    body:'A folding electric car that drove 17.3 miles across the Moon. Still parked at Hadley, still reflecting lasers back to Earth.' },
  { id:'s3', name:'Surveyor 3', planet:'moon', label:'Robot lander · 1967', loc:'Ocean of Storms', lat:-3.01, lon:-23.42,
    body:'A robot that bounced twice, dug trenches, and waited alone for 31 months until Apollo 12 astronauts walked over to visit.' },
  { id:'a12', name:'Intrepid', planet:'moon', label:'Apollo 12 · 1969', loc:'Ocean of Storms', lat:-3.1, lon:-23.5,
    body:'The first pinpoint lunar landing, a bullseye next to Surveyor 3. Its bottom half stayed behind as a launch pad.' },
  { id:'a11', name:'Eagle', planet:'moon', label:'Apollo 11 · 1969', loc:'Tranquility Base', lat:0.67, lon:23.47,
    body:'The lunar module that delivered Neil Armstrong and Buzz Aldrin to the surface. The landing stage still rests at Tranquility Base.' },
  { id:'pv', name:'Perseverance', planet:'mars', label:'Mars rover · 2021', loc:'Jezero Crater', lat:18.4, lon:77.6,
    body:'A car-sized rover collecting rock cores in the floor of Jezero Crater. It has found signs that a lake once filled this basin.' },
  { id:'ig', name:'Ingenuity', planet:'mars', label:'Mars helicopter · 2021', loc:'Jezero Crater', lat:18.44, lon:77.45,
    body:'A four-pound helicopter built for five flights. It flew seventy-two times before a rotor broke on its final landing.' },
  { id:'jz', name:'Three Forks', planet:'mars', label:'Sample depot · 2023', loc:'Jezero Crater', lat:18.55, lon:77.38,
    body:'Ten sealed titanium tubes of Mars rock, waiting on the ground for a ride home that is not yet funded.' }
];

function latLon(lat, lon, r){
  var phi = (90 - lat) * Math.PI / 180;
  var theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

var markerGroup = new THREE.Group();
scene.add(markerGroup);

ARTIFACTS.forEach(function(a){
  var planet = PLANETS[a.planet];
  var r = a.planet === 'moon' ? 1.7 : 3.4;
  var wp = latLon(a.lat, a.lon, r + 0.1).add(planet.position);
  a.world = wp;

  /* Marker dot. */
  var m = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x58d6f1 })
  );
  m.position.copy(wp);
  markerGroup.add(m);

  /* Pulsing ring. */
  var ring = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 24),
    new THREE.MeshBasicMaterial({
      color: 0x58d6f1, transparent: true, opacity: 0.55,
      side: THREE.DoubleSide, depthWrite: false
    })
  );
  ring.position.copy(wp);
  ring.lookAt(planet.position);
  ring.userData.pulse = true;
  markerGroup.add(ring);

  /* ---------------------------------------------------------------- */
  /*  COMPUTE APPROACH POSITIONS ALONG THE OUTWARD NORMAL             */
  /*  This is the fix for the ship vanishing: offsets point away from */
  /*  the planet center, so ship/camera never go inside the sphere.   */
  /* ---------------------------------------------------------------- */
  var normal = wp.clone().sub(planet.position).normalize();

  /* Camera offset: mostly outward + some tangent for a 3/4 view. */
  var tangent = new THREE.Vector3(1, 0, 0);
  if (Math.abs(normal.dot(tangent)) > 0.9) tangent = new THREE.Vector3(0, 1, 0);
  tangent.cross(normal).normalize();

  a.shipPos = wp.clone().add(normal.clone().multiplyScalar(2.5));
  a.camPos = wp.clone()
    .add(normal.clone().multiplyScalar(5))
    .add(tangent.clone().multiplyScalar(2))
    .add(new THREE.Vector3(0, 1.2, 0));
});

/* -------------------------------------------------------------------------- */
/*  BEATS                                                                     */
/* -------------------------------------------------------------------------- */

var BEATS = [];
var prevShip = new THREE.Vector3(14, 5, -2);
var prevCam  = new THREE.Vector3(15, 6, 3);
var prevLook = new THREE.Vector3(20, 4, -5);

/* 0 — Launch. */
BEATS.push({
  name: 'Launch', sub: 'Departing Earth orbit', dur: 3500, artifact: null,
  shipA: [0, 4, 16], shipB: [0, 4, 12],
  camA: [0, 5, 22], camB: [0, 5, 20],
  look: [0, 0, 0],
  dest: 'EARTH', dist: 'Home'
});
prevShip.set(0, 4, 12);
prevCam.set(0, 5, 20);

/* 1 — Moon transit. */
BEATS.push({
  name: 'Moon transit', sub: '3 days · 386,000 km', dur: 4500, artifact: null,
  shipA: [prevShip.x, prevShip.y, prevShip.z], shipB: [14, 5, -2],
  camA: [prevCam.x, prevCam.y, prevCam.z], camB: [15, 6, 3],
  look: [20, 4, -5],
  dest: 'MOON', dist: '384,000 km'
});
prevShip.set(14, 5, -2);
prevCam.set(15, 6, 3);
prevLook.set(20, 4, -5);

/* 2-5 — Moon artifacts, using the outward-normal approach positions. */
[0, 1, 2, 3].forEach(function(i){
  var a = ARTIFACTS[i];
  BEATS.push({
    name: a.name, sub: a.label, dur: 4000, artifact: i,
    shipA: [prevShip.x, prevShip.y, prevShip.z],
    shipB: a.shipPos.toArray(),
    camA: [prevCam.x, prevCam.y, prevCam.z],
    camB: a.camPos.toArray(),
    look: a.world.toArray(),
    dest: a.planet.toUpperCase(), dist: a.loc
  });
  prevShip.copy(a.shipPos);
  prevCam.copy(a.camPos);
  prevLook.copy(a.world);
});

/* 6 — Mars transit. */
var marsFirst = ARTIFACTS[4];
BEATS.push({
  name: 'Mars transit', sub: '7 months · 225M km', dur: 6500, artifact: null,
  shipA: [prevShip.x, prevShip.y, prevShip.z],
  shipB: [marsFirst.shipPos.x - 30, marsFirst.shipPos.y + 2, marsFirst.shipPos.z - 20],
  camA: [prevCam.x, prevCam.y, prevCam.z],
  camB: [marsFirst.camPos.x - 30, marsFirst.camPos.y + 3, marsFirst.camPos.z - 20],
  look: marsFirst.world.toArray(),
  dest: 'MARS', dist: '225M km'
});
prevShip.set(
  marsFirst.shipPos.x - 30,
  marsFirst.shipPos.y + 2,
  marsFirst.shipPos.z - 20
);
prevCam.set(
  marsFirst.camPos.x - 30,
  marsFirst.camPos.y + 3,
  marsFirst.camPos.z - 20
);
prevLook.copy(marsFirst.world);

/* 7-9 — Mars artifacts. */
[4, 5, 6].forEach(function(i){
  var a = ARTIFACTS[i];
  BEATS.push({
    name: a.name, sub: a.label, dur: 4000, artifact: i,
    shipA: [prevShip.x, prevShip.y, prevShip.z],
    shipB: a.shipPos.toArray(),
    camA: [prevCam.x, prevCam.y, prevCam.z],
    camB: a.camPos.toArray(),
    look: a.world.toArray(),
    dest: a.planet.toUpperCase(), dist: a.loc
  });
  prevShip.copy(a.shipPos);
  prevCam.copy(a.camPos);
  prevLook.copy(a.world);
});

/* -------------------------------------------------------------------------- */
/*  STATE                                                                     */
/* -------------------------------------------------------------------------- */

var J = {
  state: 'idle',
  beat: 0,
  beatStart: 0,
  paused: false,
  timers: [],
  shipRest: new THREE.Vector3(),
  lastLookTarget: new THREE.Vector3()
};

function setState(s){
  if (J.state !== s) {
    log('state:', J.state, '→', s);
    J.state = s;
  }
}

function clearTimers(){ J.timers.forEach(clearTimeout); J.timers = []; }

function after(ms, fn){
  var id = setTimeout(function(){
    var i = J.timers.indexOf(id);
    if (i >= 0) J.timers.splice(i, 1);
    if (J.paused) { after(300, fn); return; }
    fn();
  }, ms);
  J.timers.push(id);
  return id;
}

function easeInOut(t){ return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function lerp(a, b, t){ return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

/* -------------------------------------------------------------------------- */
/*  BEAT MANAGER                                                              */
/* -------------------------------------------------------------------------- */

function setBeat(i){
  J.beat = Math.max(0, Math.min(BEATS.length - 1, i));
  J.beatStart = performance.now();
  var b = BEATS[J.beat];
  log('setBeat', J.beat, b.name);

  setText('j3-phase', b.name);
  setText('j3-sub', b.sub);
  setText('j3-dest', b.dest || '—');
  setText('j3-dist', b.dist || '');
  var prog = document.getElementById('j3-prog');
  if (prog) prog.style.width = ((J.beat) / (BEATS.length - 1) * 100) + '%';
  var card = document.getElementById('j3-card');
  if (card) card.classList.remove('on');

  setStatus('Flying to ' + b.name + '…');

  if (b.artifact != null) {
    after(b.dur + 200, function(){
      if (J.state !== 'flying' && J.state !== 'arrival') return;
      showCard(b.artifact);
    });
  }
}

function showCard(idx){
  var a = ARTIFACTS[idx];
  setText('j3-clab', a.label);
  setText('j3-cname', a.name);
  setText('j3-cloc', a.loc);
  setText('j3-cbody', a.body);
  setText('j3-note', '');
  var card = document.getElementById('j3-card');
  if (card) card.classList.add('on');
  setState('card');
  setStatus('Relic card — auto-advancing in ' + Math.round(CONFIG.cardReadTime / 1000) + 's');

  /* Store the ship's resting position so the animate loop can hover it. */
  J.shipRest.copy(ship.position);

  after(CONFIG.cardReadTime, function(){
    if (J.state === 'card') openArtifactPage(idx);
  });
}

/* Try to open the site's own page for this relic, but never block the tour. */
function openArtifactPage(idx){
  var a = ARTIFACTS[idx];
  log('openArtifactPage →', a.id);
  setState('page');
  setStatus('Opening relic page…');
  var card = document.getElementById('j3-card');
  if (card) card.classList.remove('on');
  var ov = document.getElementById('j3-overlay');
  if (ov) ov.classList.remove('on');

  var succeeded = false;
  var names = ['openFile', 'openArtifact', 'openItem', 'showFile', 'navigateTo'];
  for (var i = 0; i < names.length; i++) {
    if (typeof window[names[i]] === 'function') {
      try {
        window[names[i]](a.id);
        succeeded = true;
        log('window.' + names[i] + '(' + a.id + ') succeeded');
        break;
      } catch (e) { warn('window.' + names[i] + ' threw:', e.message); }
    }
  }

  forceSection('file');
  if (!succeeded) populateFileSection(a);

  after(CONFIG.pageDwellTime, function(){
    if (J.state === 'page') openArtifactLab(idx);
  });
}

function populateFileSection(a){
  setText('ctag', a.label);
  setText('cname', a.name);
  var html =
    '<div style="display:grid;grid-template-columns:1fr 1.2fr;gap:22px;padding:8px">' +
      '<div style="border-radius:14px;background:#0f3a63;min-height:260px;display:flex;align-items:center;justify-content:center;color:#fff;font:600 14px sans-serif;padding:16px;text-align:center">' +
        a.name + '<br><small style="opacity:.7;font-size:11px">' + a.label + '</small>' +
      '</div>' +
      '<div>' +
        '<div class="label a">' + a.loc + '</div>' +
        '<h3 style="margin:8px 0">' + a.name + '</h3>' +
        '<p>' + a.body + '</p>' +
        '<p style="color:#8a7e6d;font-size:13px;margin-top:12px">Fallback view — the site\'s full file page would appear here.</p>' +
      '</div>' +
    '</div>';
  setHTML('bk', html);
}

function openArtifactLab(idx){
  var a = ARTIFACTS[idx];
  log('openArtifactLab →', a.id);
  setState('lab');
  setStatus('Loading 3D lab…');

  var showNames = ['show', 'showSection', 'navigateTo'];
  for (var i = 0; i < showNames.length; i++) {
    if (typeof window[showNames[i]] === 'function') {
      try { window[showNames[i]]('lab'); } catch (e) {}
      break;
    }
  }

  forceSection('lab');

  var labSuccess = false;
  var labObj = window.LAB || window.Lab || window.lab;
  if (labObj) {
    var methods = ['craft', 'show', 'load', 'select', 'showItem', 'open'];
    for (var j = 0; j < methods.length; j++) {
      if (typeof labObj[methods[j]] === 'function') {
        try {
          labObj[methods[j]](a.id);
          labSuccess = true;
          log('LAB.' + methods[j] + '(' + a.id + ') succeeded');
          break;
        } catch (e) { warn('LAB.' + methods[j] + ' threw:', e.message); }
      }
    }
    if (typeof labObj.setTab === 'function') {
      try { labObj.setTab('learn'); } catch (e) {}
    }
  }

  if (!labSuccess) populateLabSection(a);

  after(CONFIG.labDwellTime, function(){
    if (J.state === 'lab') advanceToNext();
  });
}

function populateLabSection(a){
  var html =
    '<div class="label">' + a.planet.toUpperCase() + ' · 3D Model</div>' +
    '<h3 style="margin:8px 0">' + a.name + '</h3>' +
    '<h4>What it is</h4><p>' + a.body + '</p>' +
    '<h4>Location</h4><p>' + a.loc + '</p>' +
    '<p style="color:#8a7e6d;font-size:13px;margin-top:12px">Fallback view — the interactive 3D model would appear in the left panel.</p>';
  setHTML('pinfo', html);
}

function advanceToNext(){
  log('advanceToNext, beat=', J.beat);
  var card = document.getElementById('j3-card');
  if (card) card.classList.remove('on');
  var ov = document.getElementById('j3-overlay');
  if (ov) ov.classList.add('on');

  if (J.beat >= BEATS.length - 1) { setState('flying'); journeyComplete(); return; }
  setState('flying');
  setBeat(J.beat + 1);
}

function journeyComplete(){
  setState('complete');
  var ov = document.getElementById('j3-overlay');
  if (ov) ov.classList.add('on');

  setText('j3-clab', 'Complete');
  setText('j3-cname', 'Journey finished');
  setText('j3-cloc', '7 machines · 7 stories');
  setText('j3-cbody', 'You have visited every relic in the Galactic Field Guide.');

  var nb = document.getElementById('j3-next-art');
  if (nb) {
    nb.textContent = 'Return home';
    nb.onclick = function(){ window.Journey.stop(); };
  }
  var op = document.getElementById('j3-open-page');
  if (op) op.style.display = 'none';

  var card = document.getElementById('j3-card');
  if (card) card.classList.add('on');
  setStatus('');

  after(CONFIG.completeDwell, function(){
    if (J.state === 'complete') window.Journey.stop();
  });
}

/* -------------------------------------------------------------------------- */
/*  BUTTONS                                                                   */
/* -------------------------------------------------------------------------- */

var nextArt = document.getElementById('j3-next-art');
if (nextArt) {
  nextArt.onclick = function(){
    if (J.state === 'card') {
      var b = BEATS[J.beat];
      if (b && b.artifact != null) openArtifactPage(b.artifact);
    } else if (J.state === 'complete') {
      window.Journey.stop();
    } else {
      advanceToNext();
    }
  };
}

var openPage = document.getElementById('j3-open-page');
if (openPage) {
  openPage.onclick = function(){
    var b = BEATS[J.beat];
    if (!b || b.artifact == null) return;
    /* Try to open the file page and pause the auto-advance timer. */
    var a = ARTIFACTS[b.artifact];
    clearTimers();
    var names = ['openFile', 'openArtifact', 'openItem', 'showFile', 'navigateTo'];
    var worked = false;
    for (var i = 0; i < names.length; i++) {
      if (typeof window[names[i]] === 'function') {
        try {
          window[names[i]](a.id);
          worked = true;
          break;
        } catch (e) {}
      }
    }
    if (!worked) {
      setText('j3-note', 'Site page function not found — using fallback.');
      forceSection('file');
      populateFileSection(a);
    }
    var ov = document.getElementById('j3-overlay');
    if (ov) ov.classList.remove('on');
    setState('page');
    after(CONFIG.pageDwellTime, function(){
      if (J.state === 'page') openArtifactLab(b.artifact);
    });
  };
}

var endBtn = document.getElementById('j3-end');
if (endBtn) endBtn.onclick = function(){ window.Journey.stop(); };

var skipBtn = document.getElementById('j3-skip');
if (skipBtn) {
  skipBtn.onclick = function(){
    log('SKIP, state=', J.state);
    if (J.state === 'card') openArtifactPage(BEATS[J.beat].artifact);
    else if (J.state === 'page') openArtifactLab(BEATS[J.beat].artifact);
    else if (J.state === 'lab') advanceToNext();
    else advanceToNext();
  };
}

document.addEventListener('keydown', function(e){
  var ov = document.getElementById('j3-overlay');
  if (!ov || !ov.classList.contains('on')) return;
  if (e.key === 'Escape') { window.Journey.stop(); }
  else if (e.key === 'ArrowRight') { if (skipBtn) skipBtn.click(); }
});

/* -------------------------------------------------------------------------- */
/*  SAFETY — push ship/camera out of planets if they clip in                  */
/* -------------------------------------------------------------------------- */

function keepOutside(obj, radiusPad){
  ['earth', 'moon', 'mars'].forEach(function(name){
    var planet = PLANETS[name];
    if (!planet) return;
    var baseRadius = planet.geometry.parameters.radius;
    var safeRadius = baseRadius + radiusPad;
    var d = obj.position.distanceTo(planet.position);
    if (d < safeRadius) {
      var outward = obj.position.clone().sub(planet.position).normalize();
      if (outward.length() < 0.001) outward.set(0, 1, 0);
      obj.position.copy(planet.position).add(outward.multiplyScalar(safeRadius));
    }
  });
}

/* -------------------------------------------------------------------------- */
/*  ANIMATION LOOP                                                            */
/* -------------------------------------------------------------------------- */

var lastFrame = performance.now();

function animate(){
  requestAnimationFrame(animate);

  var now = performance.now();
  var dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (!J.paused) {
    if (J.state === 'flying' || J.state === 'arrival') {
      var b = BEATS[J.beat];
      if (b) {
        var p = (now - J.beatStart) / b.dur;
        if (p >= 1) { if (J.state === 'flying') setState('arrival'); p = 1; }
        var e = easeInOut(p);

        var sp = lerp(b.shipA, b.shipB, e);
        ship.position.set(sp[0], sp[1], sp[2]);

        var next = lerp(b.shipA, b.shipB, Math.min(1, e + 0.05));
        var dir = new THREE.Vector3(next[0] - sp[0], next[1] - sp[1], next[2] - sp[2]);
        if (dir.length() > 0.05) ship.lookAt(ship.position.clone().add(dir));

        var cp = lerp(b.camA, b.camB, e);
        camera.position.lerp(new THREE.Vector3(cp[0], cp[1], cp[2]), 0.09);

        var lookTarget = new THREE.Vector3(b.look[0], b.look[1], b.look[2]);
        J.lastLookTarget.lerp(lookTarget, 0.1);
        camera.lookAt(J.lastLookTarget);

        /* Spawn trail behind the ship. */
        if (p > 0.05 && p < 0.95) {
          var behind = ship.position.clone();
          var back = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
          behind.add(back.multiplyScalar(1.4));
          spawnTrail(behind);
        }

        /* Safety: keep ship and camera outside planets. */
        keepOutside(ship, 0.4);
        keepOutside(camera, 1.5);

        if (p >= 1 && b.artifact == null && J.state === 'arrival') {
          setState('transition');
          after(500, function(){
            if ((J.state === 'transition' || J.state === 'arrival') && J.beat < BEATS.length - 1) {
              var ov = document.getElementById('j3-overlay');
              if (ov) ov.classList.add('on');
              setState('flying');
              setBeat(J.beat + 1);
            }
          });
        }
      }
    } else if (J.state === 'card' || J.state === 'page' || J.state === 'lab') {
      /* Gentle hover so the ship doesn't look frozen. */
      var t = now * 0.001;
      ship.position.copy(J.shipRest);
      ship.position.y += Math.sin(t * 1.8) * 0.12;
      ship.rotation.z = Math.sin(t * 0.9) * 0.09;
      keepOutside(ship, 0.4);
    }
  }

  updateTrail(dt);

  /* Planet rotations. */
  PLANETS.earth.rotation.y += 0.0008;
  PLANETS.clouds.rotation.y += 0.0012;
  PLANETS.moon.rotation.y += 0.0005;
  PLANETS.mars.rotation.y += 0.0004;

  /* Beacon blink. */
  ship.children.forEach(function(c){
    if (c.userData.beacon) {
      c.material.color.setHex(Math.sin(now * 0.006) > 0 ? 0xff3030 : 0x440000);
    }
  });

  /* Marker pulse. */
  markerGroup.children.forEach(function(m){
    if (m.userData.pulse) {
      var s = 1 + Math.sin(now * 0.004) * 0.18;
      m.scale.set(s, s, 1);
    }
  });

  renderer.render(scene, camera);
}

addEventListener('resize', function(){
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

/* -------------------------------------------------------------------------- */
/*  PUBLIC API                                                                */
/* -------------------------------------------------------------------------- */

window.Journey = {
  start: function(){
    log('Journey.start()');
    J.state = 'flying';
    J.beat = 0;
    J.beatStart = performance.now();
    J.paused = false;
    clearTimers();

    var ov = document.getElementById('j3-overlay');
    if (ov) ov.classList.add('on');

    var op = document.getElementById('j3-open-page');
    if (op) op.style.display = '';

    var nb = document.getElementById('j3-next-art');
    if (nb) nb.textContent = 'Next relic →';

    camera.position.set(0, 5, 22);
    ship.position.set(0, 4, 16);
    J.shipRest.copy(ship.position);
    J.lastLookTarget.set(0, 0, 0);

    setBeat(0);
  },
  stop: function(){
    log('Journey.stop()');
    J.state = 'idle';
    clearTimers();
    var ov = document.getElementById('j3-overlay');
    if (ov) ov.classList.remove('on');
    var card = document.getElementById('j3-card');
    if (card) card.classList.remove('on');
    setStatus('');
  }
};

/* Wire the header button. */
(function(){
  var b = document.getElementById('fg-tour-btn');
  if (b) {
    b.textContent = '▶ 3D Tour';
    b.onclick = function(e){ if (e) e.preventDefault(); window.Journey.start(); };
    log('tour button wired');
  } else {
    warn('#fg-tour-btn not found');
  }
})();

/* Remove duplicate tour buttons if any exist. */
(function(){
  var keep = document.getElementById('fg-tour-btn');
  ['gfp-tb', 'fgtb'].forEach(function(id){
    var el = document.getElementById(id);
    if (el && el !== keep) el.remove();
  });
  document.querySelectorAll('.fgtb, .fg-tour-btn').forEach(function(el){
    if (el === keep) return;
    var txt = ((el.textContent || '') + ' ' + (el.id || '')).toLowerCase();
    if (/tour|journey|3d/.test(txt)) el.remove();
  });
})();

animate();

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ boot(); });
} else {
  boot();
}

})();
