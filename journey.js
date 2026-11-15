/* ============================================================================
   journey.js — v4
   Full 3D cinematic tour for Galactic Field Guide.

   FLOW
   ----
   Ship flies from Earth → Moon transit → 7 relics (in order) → complete.
   At each relic:
     1. Ship arrives; card appears with relic info (~3.5 s read time).
     2. Relic file page opens on the main site (auto, or via "Visit" button).
     3. 3D lab opens for that relic (auto, or via "View 3D model →").
     4. After ~5 s, ship flies to the next relic.

   ROBUSTNESS
   ----------
   - Tries several names for the site's own functions: openFile, openArtifact,
     openItem, navigateTo, showFile.  Same for LAB: craft/show/load/select.
   - If none of those work, manually fills the #file / #lab section DOM
     from ARTIFACTS so the user still sees real content.
   - Watchdog timer force-advances if any stage is stuck too long.
   - Skip button in the corner lets the user bypass any stage.

   CONTROLS
   --------
   - End journey   : closes the tour, returns to site.
   - Pause / Resume: freezes timers.
   - Skip stage    : jumps to the next stage immediately.
   - Esc           : end journey.
   - Space         : pause / resume.

   All work happens inside the (function(){...})() IIFE so nothing leaks
   to the global scope except window.Journey.
   ============================================================================ */

console.log('[journey] v4 loading…');

(function(){
'use strict';

/* ========================================================================== */
/*  CONFIG                                                                    */
/* ========================================================================== */

var CONFIG = {
  /* Three.js CDN — only used if the site hasn't already loaded it. */
  threeURL: 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',

  /* Retry limits. */
  threeMaxTries: 60,
  buildMaxTries: 1,

  /* Timing (milliseconds). */
  cardReadTime:  3500,   /* how long the info card shows before auto-advancing */
  pageDwellTime: 6000,   /* how long the relic file page is shown */
  labDwellTime:  5000,   /* how long the 3D lab is shown */
  completeDwell: 15000,  /* how long the completion card shows */

  /* Watchdog — force-advance if a stage is stuck. */
  watchdogInterval: 2000,
  cardStuckLimit:   12000,
  pageStuckLimit:   18000,
  labStuckLimit:    22000,

  /* Debug. */
  verbose: true
};

/* ========================================================================== */
/*  LOGGER                                                                    */
/* ========================================================================== */

function log(){
  if (!CONFIG.verbose) return;
  try {
    var args = ['[journey]'].concat([].slice.call(arguments));
    console.log.apply(console, args);
  } catch (e) { /* console unavailable — ignore */ }
}

function warn(){
  try {
    var args = ['[journey] WARN'].concat([].slice.call(arguments));
    console.warn.apply(console, args);
  } catch (e) {}
}

function err(){
  try {
    var args = ['[journey] ERROR'].concat([].slice.call(arguments));
    console.error.apply(console, args);
  } catch (e) {}
}

/* ========================================================================== */
/*  SAFE UTILITIES                                                            */
/* ========================================================================== */

/* Call a function safely. Returns {ok:true, value} or {ok:false, error}. */
function safeCall(fn, ctx, args){
  if (typeof fn !== 'function') return { ok: false, error: 'not a function' };
  try {
    var value = fn.apply(ctx || null, args || []);
    return { ok: true, value: value };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

/* Find the first existing global function among a list of names. */
function findFn(names){
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (typeof window[n] === 'function') {
      log('found function:', n);
      return { name: n, fn: window[n] };
    }
  }
  log('none of these functions exist:', names.join(', '));
  return null;
}

/* Find the first existing global object among a list of names. */
function findObj(names){
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (window[n] && typeof window[n] === 'object') {
      log('found object:', n);
      return { name: n, obj: window[n] };
    }
  }
  log('none of these objects exist:', names.join(', '));
  return null;
}

/* Force a section visible. Clears .on from all sections, adds to target. */
function forceSection(id){
  try {
    var all = document.querySelectorAll('section');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
    var target = document.getElementById(id);
    if (target) {
      target.classList.add('on');
      log('forceSection #' + id + ' shown');
      return true;
    }
    warn('forceSection: #' + id + ' NOT FOUND');
    return false;
  } catch (e) {
    err('forceSection threw:', e.message);
    return false;
  }
}

/* Set text of an element if it exists. */
function setText(id, text){
  try {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  } catch (e) {}
}

/* Set HTML of an element if it exists. */
function setHTML(id, html){
  try {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  } catch (e) {}
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
      log('loading Three.js from', CONFIG.threeURL);
      var s = document.createElement('script');
      s.src = CONFIG.threeURL;
      s.onload = function(){ log('Three.js loaded'); boot(tries); };
      s.onerror = function(){
        err('failed to load Three.js');
        alert('Could not load the 3D library. Check your internet connection.');
      };
      document.head.appendChild(s);
      return;
    }
    if (tries > CONFIG.threeMaxTries) { err('THREE never appeared, giving up'); return; }
    return setTimeout(function(){ boot(tries + 1); }, 250);
  }

  try {
    build();
    log('v4 build complete');
  } catch (e) {
    err('build failed:', e);
    alert('Tour build failed: ' + (e && e.message ? e.message : e));
  }
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
  '.j3-card{position:absolute;top:50%;right:24px;transform:translateY(-50%) translateX(120%);width:min(340px,calc(100vw - 48px));background:rgba(15,20,30,.94);backdrop-filter:blur(16px);border:1px solid rgba(88,214,241,.32);border-radius:14px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.6);transition:transform .5s cubic-bezier(.22,.9,.3,1);pointer-events:auto}',
  '.j3-card.on{transform:translateY(-50%) translateX(0)}',
  '.j3-card .j3-label{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#58d6f1;margin-bottom:6px}',
  '.j3-card h3{font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:500;color:#fff;line-height:1.15;margin:0 0 8px}',
  '.j3-card .j3-loc{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7ea7d8;margin-bottom:12px}',
  '.j3-card p{font-size:13px;line-height:1.55;color:#c4c7ca;margin:0 0 14px}',
  '.j3-card .j3-next{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#05080f;background:#58d6f1;border:0;padding:10px 18px;border-radius:7px;cursor:pointer;font-weight:500}',
  '.j3-card .j3-next:hover{background:#7ee4ff}',
  '.j3-cont{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);z-index:11000;background:linear-gradient(180deg,#ff78b1,#ff5a9f);color:#fff;border:0;padding:14px 26px;border-radius:10px;font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:500;cursor:pointer;box-shadow:0 20px 40px rgba(255,95,162,.4);opacity:0;pointer-events:none;transition:opacity .3s,transform .3s}',
  '.j3-cont.on{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}',
  '.j3-cont:hover{box-shadow:0 24px 48px rgba(255,95,162,.6)}',
  '.j3-error{position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:12000;background:#7a1e1e;color:#fff;padding:12px 20px;border-radius:8px;font-family:"JetBrains Mono",monospace;font-size:11px;max-width:80vw}',
  '@media(max-width:640px){.j3-top{padding:14px}.j3-bottom{padding:12px 14px 16px}.j3-card{top:auto;bottom:140px;right:14px;left:14px;width:auto;transform:translateY(20px)}.j3-card.on{transform:translateY(0)}.j3-cont{bottom:calc(80px + env(safe-area-inset-bottom,0px))}}'
].join('');
document.head.appendChild(style);

/* -------------------------------------------------------------------------- */
/*  HTML OVERLAY                                                              */
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
      '<button class="j3-next" id="j3-next-art">Visit this relic →</button>' +
    '</div>' +
    '<div class="j3-bottom">' +
      '<div class="j3-progress"><i id="j3-prog"></i></div>' +
      '<div class="j3-meta">' +
        '<div class="j3-phase" id="j3-phase">Launch<small id="j3-sub">Departing Earth</small></div>' +
        '<div class="j3-ctrl">' +
          '<button id="j3-end" type="button">End journey</button>' +
          '<button id="j3-pause" type="button">Pause</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
document.body.appendChild(ov);

/* Continue button (fixed at bottom, sits above the site). */
var contBtn = document.createElement('button');
contBtn.className = 'j3-cont';
contBtn.type = 'button';
document.body.appendChild(contBtn);

function showContinue(label, fn){
  contBtn.textContent = label;
  contBtn.onclick = fn;
  contBtn.classList.add('on');
  log('continue button shown:', label);
}

function hideContinue(){
  contBtn.classList.remove('on');
  contBtn.onclick = null;
}

/* Status bar inside the overlay. */
var statusEl = document.getElementById('j3-status');

function setStatus(msg){
  if (!statusEl) return;
  statusEl.textContent = msg;
  if (msg) statusEl.classList.add('on');
  else statusEl.classList.remove('on');
  log('status:', msg);
}

/* Error toast at the bottom of the viewport. */
function showError(msg){
  try {
    var e = document.createElement('div');
    e.className = 'j3-error';
    e.textContent = msg;
    document.body.appendChild(e);
    setTimeout(function(){ try { e.remove(); } catch(x){} }, 5000);
  } catch (x) {}
  err(msg);
}

/* -------------------------------------------------------------------------- */
/*  SCENE                                                                     */
/* -------------------------------------------------------------------------- */

var canvas = document.getElementById('j3-cv');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05080f, 1);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 5000);

var sunLight = new THREE.DirectionalLight(0xfff0d0, 2.4);
sunLight.position.set(150, 80, 100);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x2a3550, 0.6));

var sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(14, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xfff0b0 })
);
sunSphere.position.copy(sunLight.position).multiplyScalar(2);
scene.add(sunSphere);

/* -------------------------------------------------------------------------- */
/*  STAR FIELD                                                                */
/* -------------------------------------------------------------------------- */

(function makeStars(){
  var g = new THREE.BufferGeometry();
  var N = 4000;
  var pos = new Float32Array(N * 3);
  for (var i = 0; i < N; i++){
    var r = 1000 + Math.random() * 800;
    var t = Math.random() * Math.PI * 2;
    var p = Math.acos(2 * Math.random() - 1);
    pos[i*3]   = r * Math.sin(p) * Math.cos(t);
    pos[i*3+1] = r * Math.sin(p) * Math.sin(t);
    pos[i*3+2] = r * Math.cos(p);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.9, transparent: true, opacity: 0.85, sizeAttenuation: true
  })));
})();

/* -------------------------------------------------------------------------- */
/*  TEXTURES                                                                  */
/* -------------------------------------------------------------------------- */

var texLoader = new THREE.TextureLoader();
texLoader.crossOrigin = 'anonymous';

function tryLoad(urls, cb){
  var i = 0;
  (function next(){
    if (i >= urls.length) { cb(null); return; }
    texLoader.load(urls[i], function(t){ cb(t); }, undefined, function(){ i++; next(); });
  })();
}

/* Procedural Mars texture (used if no CDN texture loads). */
function marsProcTex(){
  var c = document.createElement('canvas');
  c.width = c.height = 1024;
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, '#8a3a1f');
  g.addColorStop(.5, '#b8502a');
  g.addColorStop(1, '#8a3a1f');
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 1024);
  for (var i = 0; i < 400; i++){
    var y = Math.random() * 1024;
    x.fillStyle = 'rgba(90,40,15,' + (0.15 + Math.random() * 0.35) + ')';
    x.beginPath();
    x.moveTo(0, y);
    for (var px = 0; px <= 1024; px += 20){
      x.lineTo(px, y + Math.sin(px * 0.02) * 12 + Math.random() * 6);
    }
    x.lineTo(1024, y + 1024);
    x.lineTo(0, y + 1024);
    x.fill();
  }
  for (var j = 0; j < 2000; j++){
    x.fillStyle = 'rgba(255,240,220,' + (Math.random() * 0.1) + ')';
    x.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }
  x.fillStyle = 'rgba(255,255,255,0.7)';
  x.fillRect(0, 0, 1024, 50);
  x.fillRect(0, 974, 1024, 50);
  var t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/* -------------------------------------------------------------------------- */
/*  PLANETS                                                                   */
/* -------------------------------------------------------------------------- */

var PLANETS = {};

PLANETS.earth = new THREE.Mesh(
  new THREE.SphereGeometry(6, 64, 64),
  new THREE.MeshStandardMaterial({ color: 0x2a5a80, roughness: 0.9, metalness: 0.05 })
);
scene.add(PLANETS.earth);

var earthGlow = new THREE.Mesh(
  new THREE.SphereGeometry(6.35, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0x4a9eff, transparent: true, opacity: 0.22, side: THREE.BackSide })
);
scene.add(earthGlow);

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

PLANETS.mars = new THREE.Mesh(
  new THREE.SphereGeometry(3.4, 48, 48),
  new THREE.MeshStandardMaterial({ map: marsProcTex(), roughness: 0.95, metalness: 0 })
);
PLANETS.mars.position.set(120, -6, -70);
scene.add(PLANETS.mars);

/* Try real textures (fail silently). */
tryLoad([
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
  'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
], function(t){
  if (t) {
    PLANETS.earth.material.map = t;
    PLANETS.earth.material.color.set(0xffffff);
    PLANETS.earth.material.needsUpdate = true;
  }
});

tryLoad([
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/moon_1024.jpg',
  'https://threejs.org/examples/textures/planets/moon_1024.jpg'
], function(t){
  if (t) {
    PLANETS.moon.material.map = t;
    PLANETS.moon.material.color.set(0xffffff);
    PLANETS.moon.material.needsUpdate = true;
  }
});

/* -------------------------------------------------------------------------- */
/*  SHIP                                                                      */
/* -------------------------------------------------------------------------- */

var ship = new THREE.Group();

/* Main body. */
ship.add(new THREE.Mesh(
  new THREE.ConeGeometry(0.32, 1.6, 16),
  new THREE.MeshStandardMaterial({ color: 0xe8ecf4, roughness: 0.3, metalness: 0.75 })
).rotateX(Math.PI / 2));

/* Cockpit. */
var cockpit = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 16, 16),
  new THREE.MeshStandardMaterial({
    color: 0x58d6f1, roughness: 0.05, metalness: 0.9, emissive: 0x0a3050
  })
);
cockpit.position.set(0, 0.14, 0.5);
ship.add(cockpit);

/* Wings. */
[-1, 1].forEach(function(s){
  var w = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.04, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xd0d6e0, roughness: 0.4, metalness: 0.6 })
  );
  w.position.set(s * 0.32, -0.02, 0.05);
  w.rotation.z = s * 0.12;
  ship.add(w);
});

/* Engines + exhaust. */
[-0.16, 0.16].forEach(function(x){
  var e = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.13, 0.28, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.6, metalness: 0.3 })
  );
  e.rotation.x = Math.PI / 2;
  e.position.set(x, -0.02, -0.72);
  ship.add(e);

  var ex = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.45, 10),
    new THREE.MeshBasicMaterial({ color: 0xff7a3c, transparent: true, opacity: 0.85 })
  );
  ex.rotation.x = -Math.PI / 2;
  ex.position.set(x, -0.02, -1);
  ship.add(ex);
});

scene.add(ship);

/* -------------------------------------------------------------------------- */
/*  ARTIFACTS — matches the site's CR[] ids exactly                           */
/* -------------------------------------------------------------------------- */

var ARTIFACTS = [
  {
    id: 'a15',
    name: 'Moon Buggy',
    planet: 'moon',
    label: 'Apollo 15 · 1971',
    loc: 'Hadley Rille',
    lat: 26.13, lon: 3.63,
    body: 'A folding electric car that drove 17.3 miles across the Moon. Still parked at Hadley, still reflecting lasers back to Earth.'
  },
  {
    id: 's3',
    name: 'Surveyor 3',
    planet: 'moon',
    label: 'Robot lander · 1967',
    loc: 'Ocean of Storms',
    lat: -3.01, lon: -23.42,
    body: 'A robot that bounced twice, dug trenches, and waited alone for 31 months until Apollo 12 astronauts walked over to visit.'
  },
  {
    id: 'a12',
    name: 'Intrepid',
    planet: 'moon',
    label: 'Apollo 12 · 1969',
    loc: 'Ocean of Storms',
    lat: -3.1, lon: -23.5,
    body: 'The first pinpoint lunar landing, a bullseye next to Surveyor 3. Its bottom half stayed behind as a launch pad.'
  },
  {
    id: 'a11',
    name: 'Eagle',
    planet: 'moon',
    label: 'Apollo 11 · 1969',
    loc: 'Tranquility Base',
    lat: 0.67, lon: 23.47,
    body: 'The lunar module that delivered Neil Armstrong and Buzz Aldrin to the surface. The landing stage still rests at Tranquility Base.'
  },
  {
    id: 'pv',
    name: 'Perseverance',
    planet: 'mars',
    label: 'Mars rover · 2021',
    loc: 'Jezero Crater',
    lat: 18.4, lon: 77.6,
    body: 'A car-sized rover collecting rock cores in the floor of Jezero Crater. It has found signs that a lake once filled this basin.'
  },
  {
    id: 'ig',
    name: 'Ingenuity',
    planet: 'mars',
    label: 'Mars helicopter · 2021',
    loc: 'Jezero Crater',
    lat: 18.44, lon: 77.45,
    body: 'A four-pound helicopter built for five flights. It flew seventy-two times before a rotor broke on its final landing.'
  },
  {
    id: 'jz',
    name: 'Three Forks',
    planet: 'mars',
    label: 'Sample depot · 2023',
    loc: 'Jezero Crater',
    lat: 18.55, lon: 77.38,
    body: 'Ten sealed titanium tubes of Mars rock, waiting on the ground for a ride home that is not yet funded.'
  }
];

/* -------------------------------------------------------------------------- */
/*  LATITUDE / LONGITUDE HELPER                                               */
/* -------------------------------------------------------------------------- */

function latLon(lat, lon, r){
  var phi = (90 - lat) * Math.PI / 180;
  var theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

/* -------------------------------------------------------------------------- */
/*  MARKERS                                                                   */
/* -------------------------------------------------------------------------- */

var markerGroup = new THREE.Group();
scene.add(markerGroup);

ARTIFACTS.forEach(function(a){
  var planet = PLANETS[a.planet];
  var r = a.planet === 'moon' ? 1.7 : 3.4;
  var worldPos = latLon(a.lat, a.lon, r + 0.1).add(planet.position);

  /* Marker dot. */
  var m = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x58d6f1 })
  );
  m.position.copy(worldPos);
  markerGroup.add(m);

  /* Pulsing ring. */
  var ring = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 24),
    new THREE.MeshBasicMaterial({
      color: 0x58d6f1, transparent: true, opacity: 0.55, side: THREE.DoubleSide
    })
  );
  ring.position.copy(worldPos);
  ring.lookAt(planet.position);
  ring.userData.pulse = true;
  markerGroup.add(ring);

  a.world = worldPos;
});

/* -------------------------------------------------------------------------- */
/*  BEATS                                                                     */
/* -------------------------------------------------------------------------- */

var BEATS = [];

/* 0 — Launch. */
BEATS.push({
  name: 'Launch', sub: 'Departing Earth orbit', dur: 3500, artifact: null,
  shipA: [0, 4, 16], shipB: [0, 4, 12],
  camA: [0, 5, 22], camB: [0, 5, 20],
  look: [0, 0, 0],
  dest: 'EARTH', dist: 'Home'
});

/* 1 — Moon transit. */
BEATS.push({
  name: 'Moon transit', sub: '3 days · 386,000 km', dur: 4500, artifact: null,
  shipA: [0, 4, 12], shipB: [14, 5, -2],
  camA: [0, 5, 20], camB: [15, 6, 3],
  look: [20, 4, -5],
  dest: 'MOON', dist: '384,000 km'
});

/* 2-5 — Moon relics. */
[0, 1, 2, 3].forEach(function(i){
  var a = ARTIFACTS[i];
  var prev = i === 0
    ? [14, 5, -2]
    : ARTIFACTS[i - 1].world.clone().add(new THREE.Vector3(0.8, 0.8, 1)).toArray();
  BEATS.push({
    name: a.name, sub: a.label, dur: 3500, artifact: i,
    shipA: prev,
    shipB: a.world.clone().add(new THREE.Vector3(0, 0.5, 1)).toArray(),
    camA: prev.slice(),
    camB: a.world.clone().add(new THREE.Vector3(1.5, 1.2, 1.8)).toArray(),
    look: a.world.toArray(),
    dest: a.planet.toUpperCase(), dist: a.loc
  });
});

/* 6 — Mars transit. */
BEATS.push({
  name: 'Mars transit', sub: '7 months · 225M km', dur: 5500, artifact: null,
  shipA: ARTIFACTS[3].world.clone().add(new THREE.Vector3(0, 0.5, 1)).toArray(),
  shipB: [70, 2, -30],
  camA: ARTIFACTS[3].world.clone().add(new THREE.Vector3(1.5, 1.2, 1.8)).toArray(),
  camB: [72, 3, -25],
  look: [120, -6, -70],
  dest: 'MARS', dist: '225M km'
});

/* 7-9 — Mars relics. */
[4, 5, 6].forEach(function(i){
  var a = ARTIFACTS[i];
  var prev = i === 4
    ? [70, 2, -30]
    : ARTIFACTS[i - 1].world.clone().add(new THREE.Vector3(0.8, 0.8, 1)).toArray();
  BEATS.push({
    name: a.name, sub: a.label, dur: 3500, artifact: i,
    shipA: prev,
    shipB: a.world.clone().add(new THREE.Vector3(0, 0.5, 1)).toArray(),
    camA: prev.slice(),
    camB: a.world.clone().add(new THREE.Vector3(2, 1.5, 2.2)).toArray(),
    look: a.world.toArray(),
    dest: a.planet.toUpperCase(), dist: a.loc
  });
});

/* -------------------------------------------------------------------------- */
/*  STATE                                                                     */
/* -------------------------------------------------------------------------- */

var J = {
  state: 'idle',       /* idle | flying | arrival | card | page | lab | complete */
  beat: 0,
  beatStart: 0,
  paused: false,
  timers: [],
  stateEnteredAt: 0,   /* for watchdog */
  lastWatchdogCheck: 0
};

function setState(newState){
  if (J.state !== newState) {
    log('state:', J.state, '→', newState);
    J.state = newState;
    J.stateEnteredAt = performance.now();
  }
}

function clearTimers(){
  J.timers.forEach(clearTimeout);
  J.timers = [];
  log('timers cleared');
}

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

function easeInOut(t){
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(a, b, t){
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

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

  setStatus('');

  if (b.artifact != null) {
    after(b.dur + 300, function(){
      log('arrival timer fired for', b.name, '| state=', J.state);
      if (J.state !== 'flying' && J.state !== 'arrival') {
        log('abort card: state is', J.state);
        return;
      }
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
  var card = document.getElementById('j3-card');
  if (card) card.classList.add('on');
  setState('card');
  setStatus('Relic card — auto-advancing to file');
  log('card shown for', a.id, '— auto-advancing in ' + CONFIG.cardReadTime + 'ms');

  after(CONFIG.cardReadTime, function(){
    log('card→page timer fired | state=', J.state);
    if (J.state === 'card') openArtifactPage(idx);
  });
}

/* -------------------------------------------------------------------------- */
/*  FILE PAGE — multiple fallbacks                                            */
/* -------------------------------------------------------------------------- */

function openArtifactPage(idx){
  var a = ARTIFACTS[idx];
  log('openArtifactPage →', a.id);
  setState('page');
  setStatus('Opening relic page…');

  var card = document.getElementById('j3-card');
  if (card) card.classList.remove('on');

  var ov = document.getElementById('j3-overlay');
  if (ov) ov.classList.remove('on');

  /* Try the site's own function first. */
  var names = ['openFile', 'openArtifact', 'openItem', 'showFile', 'navigateTo'];
  var found = findFn(names);
  var succeeded = false;

  if (found) {
    var result = safeCall(found.fn, null, [a.id]);
    if (result.ok) {
      log(found.name + '(' + a.id + ') succeeded');
      succeeded = true;
    } else {
      warn(found.name + '(' + a.id + ') threw:', result.error);
    }
  }

  /* Force the file section visible regardless. */
  forceSection('file');

  /* If the site's function didn't run, populate the section manually. */
  if (!succeeded) {
    log('populating file section manually');
    populateFileSection(a);
  }

  showContinue('View 3D model →', function(){ openArtifactLab(idx); });

  after(CONFIG.pageDwellTime, function(){
    log('page→lab timer fired | state=', J.state);
    if (J.state === 'page') openArtifactLab(idx);
  });
}

/* Manually populate the file section if the site's openFile is missing. */
function populateFileSection(a){
  setText('ctag', a.label);
  setText('cname', a.name);

  var html =
    '<div class="p1" style="display:grid;grid-template-columns:1fr 1.2fr;gap:22px;padding:8px">' +
      '<div style="border-radius:14px;background:#0f3a63;min-height:260px;display:flex;align-items:center;justify-content:center;color:#fff;font:600 14px sans-serif;padding:16px;text-align:center">' +
        a.name + '<br><small style="opacity:.7;font-size:11px">' + a.label + '</small>' +
      '</div>' +
      '<div>' +
        '<div class="label a">' + a.loc + '</div>' +
        '<h3 style="margin:8px 0">' + a.name + '</h3>' +
        '<p>' + a.body + '</p>' +
        '<p style="color:#8a7e6d;font-size:13px;margin-top:12px">' +
          'This is a fallback view generated by the 3D tour. The site’s full file page is normally shown here.' +
        '</p>' +
      '</div>' +
    '</div>';

  setHTML('bk', html);
  log('file section populated with fallback content');
}

/* -------------------------------------------------------------------------- */
/*  3D LAB — multiple fallbacks                                               */
/* -------------------------------------------------------------------------- */

function openArtifactLab(idx){
  var a = ARTIFACTS[idx];
  log('openArtifactLab →', a.id);
  setState('lab');
  hideContinue();
  setStatus('Loading 3D lab…');

  /* Try the site's own show() first. */
  var showNames = ['show', 'showSection', 'navigateTo'];
  var showFn = findFn(showNames);
  if (showFn) {
    var showResult = safeCall(showFn.fn, null, ['lab']);
    if (!showResult.ok) warn(showFn.name + '("lab") threw:', showResult.error);
  }

  /* Force the lab section visible regardless. */
  forceSection('lab');

  /* Try LAB.craft with several method names. */
  var labMethods = ['craft', 'show', 'load', 'select', 'showItem', 'open'];
  var labObj = findObj(['LAB', 'Lab', 'lab']);
  var labSuccess = false;

  if (labObj) {
    for (var i = 0; i < labMethods.length; i++) {
      var m = labMethods[i];
      if (typeof labObj.obj[m] === 'function') {
        var craftResult = safeCall(labObj.obj[m], labObj.obj, [a.id]);
        if (craftResult.ok) {
          log(labObj.name + '.' + m + '(' + a.id + ') succeeded');
          labSuccess = true;
          break;
        } else {
          warn(labObj.name + '.' + m + '(' + a.id + ') threw:', craftResult.error);
        }
      }
    }

    /* Try to switch to the Learn tab. */
    if (typeof labObj.obj.setTab === 'function') {
      var tabResult = safeCall(labObj.obj.setTab, labObj.obj, ['learn']);
      if (tabResult.ok) log('setTab(learn) succeeded');
    }
  } else {
    warn('no LAB object found in window');
  }

  /* If LAB is missing entirely, populate the panel manually. */
  if (!labSuccess) {
    log('populating lab panel manually');
    populateLabSection(a);
  }

  showContinue('Next relic →', advanceToNext);

  after(CONFIG.labDwellTime, function(){
    log('lab→next timer fired | state=', J.state);
    if (J.state === 'lab') advanceToNext();
  });
}

/* Manually populate the lab panel if LAB is missing. */
function populateLabSection(a){
  var html =
    '<div class="label">' + a.planet.toUpperCase() + ' · 3D Model</div>' +
    '<h3 style="margin:8px 0">' + a.name + '</h3>' +
    '<h4>What it is</h4>' +
    '<p>' + a.body + '</p>' +
    '<h4>Location</h4>' +
    '<p>' + a.loc + '</p>' +
    '<p style="color:#8a7e6d;font-size:13px;margin-top:12px">' +
      'This is a fallback view. The interactive 3D model would normally appear in the left panel.' +
    '</p>';

  setHTML('pinfo', html);
  log('lab panel populated with fallback content');
}

/* -------------------------------------------------------------------------- */
/*  ADVANCE                                                                   */
/* -------------------------------------------------------------------------- */

function advanceToNext(){
  log('advanceToNext | beat=', J.beat);
  hideContinue();

  var card = document.getElementById('j3-card');
  if (card) card.classList.remove('on');

  var ov = document.getElementById('j3-overlay');
  if (ov) ov.classList.add('on');

  if (J.beat >= BEATS.length - 1) {
    setState('flying');
    journeyComplete();
    return;
  }

  setState('flying');
  setBeat(J.beat + 1);
}

function journeyComplete(){
  log('journeyComplete');
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

  var card = document.getElementById('j3-card');
  if (card) card.classList.add('on');

  setStatus('');

  after(CONFIG.completeDwell, function(){
    if (J.state === 'complete') window.Journey.stop();
  });
}

/* -------------------------------------------------------------------------- */
/*  WATCHDOG — force-advance if stuck                                         */
/* -------------------------------------------------------------------------- */

function watchdog(){
  var now = performance.now();
  var stuckFor = now - J.stateEnteredAt;

  if (J.state === 'card' && stuckFor > CONFIG.cardStuckLimit) {
    warn('WATCHDOG: card stuck for', Math.round(stuckFor) + 'ms — forcing page open');
    openArtifactPage(J.beat - 2 >= 0 ? BEATS[J.beat].artifact : 0);
    setState('page');
    J.stateEnteredAt = now;
  }
  else if (J.state === 'page' && stuckFor > CONFIG.pageStuckLimit) {
    warn('WATCHDOG: page stuck for', Math.round(stuckFor) + 'ms — forcing lab open');
    var idx = BEATS[J.beat].artifact;
    if (idx != null) openArtifactLab(idx);
    setState('lab');
    J.stateEnteredAt = now;
  }
  else if (J.state === 'lab' && stuckFor > CONFIG.labStuckLimit) {
    warn('WATCHDOG: lab stuck for', Math.round(stuckFor) + 'ms — forcing next beat');
    advanceToNext();
    J.stateEnteredAt = now;
  }
}

setInterval(watchdog, CONFIG.watchdogInterval);

/* -------------------------------------------------------------------------- */
/*  BUTTON HOOKS                                                              */
/* -------------------------------------------------------------------------- */

var nextArt = document.getElementById('j3-next-art');
if (nextArt) {
  nextArt.onclick = function(){
    var b = BEATS[J.beat];
    if (b.artifact != null) openArtifactPage(b.artifact);
  };
}

var endBtn = document.getElementById('j3-end');
if (endBtn) endBtn.onclick = function(){ window.Journey.stop(); };

var pauseBtn = document.getElementById('j3-pause');
if (pauseBtn) {
  pauseBtn.onclick = function(){
    J.paused = !J.paused;
    pauseBtn.textContent = J.paused ? 'Resume' : 'Pause';
    log('paused =', J.paused);
  };
}

/* Skip button — always advances to the next stage immediately. */
var skipBtn = document.getElementById('j3-skip');
if (skipBtn) {
  skipBtn.onclick = function(){
    log('SKIP clicked, state=', J.state);
    if (J.state === 'card') openArtifactPage(BEATS[J.beat].artifact);
    else if (J.state === 'page') openArtifactLab(BEATS[J.beat].artifact);
    else if (J.state === 'lab') advanceToNext();
    else if (J.state === 'arrival' || J.state === 'flying') advanceToNext();
  };
}

/* Keyboard shortcuts. */
document.addEventListener('keydown', function(e){
  var ov = document.getElementById('j3-overlay');
  if (!ov || !ov.classList.contains('on')) return;

  if (e.key === 'Escape') {
    window.Journey.stop();
  } else if (e.key === ' ') {
    e.preventDefault();
    if (pauseBtn) pauseBtn.click();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (skipBtn) skipBtn.click();
  }
});

/* -------------------------------------------------------------------------- */
/*  ANIMATION LOOP                                                            */
/* -------------------------------------------------------------------------- */

function animate(){
  requestAnimationFrame(animate);

  if (!J.paused && (J.state === 'flying' || J.state === 'arrival')) {
    var b = BEATS[J.beat];
    if (b) {
      var p = (performance.now() - J.beatStart) / b.dur;
      if (p >= 1) {
        if (J.state === 'flying') setState('arrival');
        p = 1;
      }
      var e = easeInOut(p);

      var sp = lerp(b.shipA, b.shipB, e);
      ship.position.set(sp[0], sp[1], sp[2]);

      var next = lerp(b.shipA, b.shipB, Math.min(1, e + 0.05));
      var dir = new THREE.Vector3(next[0] - sp[0], next[1] - sp[1], next[2] - sp[2]);
      if (dir.length() > 0.05) ship.lookAt(ship.position.clone().add(dir));

      var cp = lerp(b.camA, b.camB, e);
      camera.position.lerp(new THREE.Vector3(cp[0], cp[1], cp[2]), 0.06);
      camera.lookAt(b.look[0], b.look[1], b.look[2]);

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
  }

  /* Spin planets. */
  PLANETS.earth.rotation.y += 0.0008;
  PLANETS.clouds.rotation.y += 0.0012;
  PLANETS.moon.rotation.y += 0.0005;
  PLANETS.mars.rotation.y += 0.0004;

  /* Pulse markers. */
  var now = performance.now();
  markerGroup.children.forEach(function(m){
    if (m.userData.pulse) {
      var s = 1 + Math.sin(now * 0.004) * 0.18;
      m.scale.set(s, s, 1);
    }
  });

  renderer.render(scene, camera);
}

/* Handle resize. */
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
    J.stateEnteredAt = performance.now();
    clearTimers();
    hideContinue();

    var ov = document.getElementById('j3-overlay');
    if (ov) ov.classList.add('on');

    if (pauseBtn) pauseBtn.textContent = 'Pause';
    if (nextArt) nextArt.textContent = 'Visit this relic →';

    camera.position.set(0, 5, 22);
    ship.position.set(0, 4, 16);

    setBeat(0);
  },
  stop: function(){
    log('Journey.stop()');
    J.state = 'idle';
    clearTimers();
    hideContinue();

    var ov = document.getElementById('j3-overlay');
    if (ov) ov.classList.remove('on');

    var card = document.getElementById('j3-card');
    if (card) card.classList.remove('on');

    setStatus('');
  },
  state: function(){ return J.state; },
  beat: function(){ return J.beat; }
};

/* -------------------------------------------------------------------------- */
/*  TOUR BUTTON WIRING + DEDUPE                                               */
/* -------------------------------------------------------------------------- */

(function wireButton(){
  var b = document.getElementById('fg-tour-btn');
  if (!b) {
    warn('WARNING: #fg-tour-btn not found in DOM');
    return;
  }
  b.textContent = '▶ 3D Tour';
  b.onclick = function(e){
    if (e) e.preventDefault();
    window.Journey.start();
  };
  log('tour button wired');
})();

/* Remove duplicate tour buttons from any earlier patches. */
(function cleanupTours(){
  var keep = document.getElementById('fg-tour-btn');

  /* Known old ids. */
  ['gfp-tb', 'fgtb'].forEach(function(id){
    var el = document.getElementById(id);
    if (el && el !== keep) {
      el.remove();
      log('removed duplicate tour button:', id);
    }
  });

  /* Any .fgtb / .fg-tour-btn elements besides our main one. */
  document.querySelectorAll('.fgtb, .fg-tour-btn').forEach(function(el){
    if (el === keep) return;
    var txt = ((el.textContent || '') + ' ' + (el.id || '')).toLowerCase();
    if (/tour|journey|3d/.test(txt)) {
      el.remove();
      log('removed duplicate tour element:', el.id || el.className);
    }
  });
})();

/* Start the render loop. */
animate();

} /* end of build() */

/* ========================================================================== */
/*  ENTRY POINT                                                               */
/* ========================================================================== */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ boot(); });
} else {
  boot();
}

})();
