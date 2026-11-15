/* ============================================================================
   journey.js — v5
   Self-contained 3D cinematic tour for Galactic Field Guide.

   DESIGN PRINCIPLE
   ----------------
   The tour does NOT depend on the site's openFile(), show(), or LAB.craft()
   functions. Every previous version stalled because one of those calls was
   silently failing and the auto-advance chain broke. v5 flies the ship through
   every relic on its own, showing a card at each. The page/lab opening is now
   user-initiated: a button on the card tries to open the site page, but the
   tour continues regardless of whether it succeeds.

   FLOW
   ----
   Launch → Moon transit → 4 Moon relics → Mars transit → 3 Mars relics → done.
   At each relic:
     1. Ship flies to the relic's marker on the planet.
     2. Card slides in with name, label, location, description.
     3. After CONFIG.cardReadTime (default 5s), the tour advances automatically.
     4. Card has "Open full page →" button (tries window.openFile if available)
        and "Next relic →" button (advances immediately).

   CONTROLS
   --------
   End journey   : closes the tour, returns to site.
   Skip stage    : jumps to the next relic immediately.
   Esc           : end journey.
   Arrow right   : skip stage.

   DEBUG
   -----
   The overlay shows a live status line ("Flying to Surveyor 3…") so you can
   see exactly what stage the tour is in. Every action also logs to the console
   with a [journey] prefix.
   ============================================================================ */

console.log('[journey] v5 loading…');

(function(){
'use strict';

/* ============================================================================
   CONFIG
   ============================================================================ */

var CONFIG = {
  threeURL: 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
  threeMaxTries: 60,

  /* Timing per stage. */
  cardReadTime:  5000,   /* how long the relic card shows before advancing */
  completeDwell: 15000,  /* how long the completion card shows */

  /* If set, tour never stalls longer than this on any stage. */
  maxStageTime:  12000,

  verbose: true
};

/* ============================================================================
   LOGGING
   ============================================================================ */

function log(){
  if (!CONFIG.verbose) return;
  try { console.log.apply(console, ['[journey]'].concat([].slice.call(arguments))); } catch (e) {}
}

function warn(){
  try { console.warn.apply(console, ['[journey] WARN'].concat([].slice.call(arguments))); } catch (e) {}
}

function err(){
  try { console.error.apply(console, ['[journey] ERROR'].concat([].slice.call(arguments))); } catch (e) {}
}

/* ============================================================================
   SAFE UTILITIES
   ============================================================================ */

function setText(id, text){
  try { var el = document.getElementById(id); if (el) el.textContent = text; } catch (e) {}
}

function setHTML(id, html){
  try { var el = document.getElementById(id); if (el) el.innerHTML = html; } catch (e) {}
}

function forceSection(id){
  try {
    var all = document.querySelectorAll('section');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
    var t = document.getElementById(id);
    if (t) { t.classList.add('on'); return true; }
    return false;
  } catch (e) { return false; }
}

function trySiteFunction(names, arg){
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (typeof window[n] === 'function') {
      try {
        window[n](arg);
        log('called window.' + n + '("' + arg + '") — success');
        return true;
      } catch (e) {
        warn('window.' + n + '("' + arg + '") threw:', e.message);
      }
    }
  }
  log('no site function among', names.join(', '), 'worked for', arg);
  return false;
}

/* ============================================================================
   BOOT
   ============================================================================ */

var threeRequested = false;

function boot(tries){
  tries = tries || 0;

  /* Guard against double-build if journey.js is loaded twice. */
  if (window.Journey) { log('Journey already exists, skipping build'); return; }
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

  try { build(); log('v5 build complete'); }
  catch (e) { err('build failed:', e); alert('Tour failed: ' + (e && e.message ? e.message : e)); }
}

/* ============================================================================
   BUILD
   ============================================================================ */

function build(){

/* -------------------------------------------------------------------------- */
/*  CSS                                                                       */
/* -------------------------------------------------------------------------- */

var css =
  '#j3-overlay{position:fixed;inset:0;z-index:10000;background:#05080f;display:none;overflow:hidden}' +
  '#j3-overlay.on{display:block}' +
  '#j3-cv{position:absolute;inset:0;width:100%;height:100%;display:block}' +
  '.j3-hud{position:absolute;inset:0;pointer-events:none;z-index:2;font-family:"JetBrains Mono",monospace;color:#eaf1ff}' +
  '.j3-top{position:absolute;top:0;left:0;right:0;padding:18px 24px;display:flex;justify-content:space-between;align-items:flex-start;background:linear-gradient(180deg,rgba(5,8,15,.92),transparent 80%)}' +
  '.j3-brand{font-family:Fraunces,Georgia,serif;font-size:17px;font-weight:500;color:#fff}' +
  '.j3-brand em{font-style:italic;color:#ff8cc0}' +
  '.j3-brand small{display:block;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:#7ea7d8;margin-top:3px}' +
  '.j3-dest{text-align:right;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7ea7d8}' +
  '.j3-dest b{display:block;color:#58d6f1;font-size:12px;margin-bottom:2px}' +
  '.j3-status{position:absolute;top:100px;left:24px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#58d6f1;background:rgba(5,8,15,.72);padding:5px 10px;border-radius:6px;pointer-events:none;opacity:0;transition:opacity .3s}' +
  '.j3-status.on{opacity:1}' +
  '.j3-skip{position:absolute;top:96px;right:24px;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:rgba(15,20,30,.8);border:1px solid rgba(88,214,241,.28);color:#eaf1ff;border-radius:6px;padding:7px 12px;cursor:pointer;pointer-events:auto}' +
  '.j3-skip:hover{background:rgba(88,214,241,.2)}' +
  '.j3-bottom{position:absolute;bottom:0;left:0;right:0;padding:16px 24px 20px;background:linear-gradient(0deg,rgba(5,8,15,.92),transparent 80%);pointer-events:auto}' +
  '.j3-progress{height:3px;background:rgba(88,214,241,.15);border-radius:9px;overflow:hidden;margin-bottom:10px}' +
  '.j3-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff8cc0,#58d6f1);border-radius:9px;transition:width .6s ease}' +
  '.j3-meta{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}' +
  '.j3-phase{font-family:Fraunces,Georgia,serif;font-size:15px;color:#fff}' +
  '.j3-phase small{display:block;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#58d6f1;margin-top:2px}' +
  '.j3-ctrl{display:flex;gap:6px}' +
  '.j3-ctrl button{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:rgba(15,20,30,.8);border:1px solid rgba(88,214,241,.28);color:#eaf1ff;border-radius:6px;padding:7px 12px;cursor:pointer}' +
  '.j3-ctrl button:hover{background:rgba(88,214,241,.2)}' +
  '.j3-card{position:absolute;top:50%;right:24px;transform:translateY(-50%) translateX(120%);width:min(360px,calc(100vw - 48px));background:rgba(15,20,30,.94);backdrop-filter:blur(16px);border:1px solid rgba(88,214,241,.32);border-radius:14px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.6);transition:transform .5s cubic-bezier(.22,.9,.3,1);pointer-events:auto}' +
  '.j3-card.on{transform:translateY(-50%) translateX(0)}' +
  '.j3-card .j3-label{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#58d6f1;margin-bottom:6px}' +
  '.j3-card h3{font-family:Fraunces,Georgia,serif;font-size:22px;font-weight:500;color:#fff;line-height:1.15;margin:0 0 8px}' +
  '.j3-card .j3-loc{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7ea7d8;margin-bottom:12px}' +
  '.j3-card p{font-size:13px;line-height:1.55;color:#c4c7ca;margin:0 0 14px}' +
  '.j3-card .j3-btns{display:flex;gap:8px;flex-wrap:wrap}' +
  '.j3-card .j3-next{font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#05080f;background:#58d6f1;border:0;padding:10px 16px;border-radius:7px;cursor:pointer;font-weight:500}' +
  '.j3-card .j3-next:hover{background:#7ee4ff}' +
  '.j3-card .j3-open{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#58d6f1;background:transparent;border:1px solid rgba(88,214,241,.4);padding:10px 14px;border-radius:7px;cursor:pointer;font-weight:500}' +
  '.j3-card .j3-open:hover{background:rgba(88,214,241,.15)}' +
  '.j3-card .j3-note{font-size:11px;color:#7ea7d8;margin-top:10px;min-height:16px}' +
  '.j3-card .j3-countdown{position:absolute;bottom:8px;right:12px;font-size:9.5px;color:#7ea7d8;letter-spacing:.1em}' +
  '@media(max-width:640px){.j3-top{padding:14px}.j3-bottom{padding:12px 14px 16px}.j3-card{top:auto;bottom:140px;right:14px;left:14px;width:auto;transform:translateY(20px)}.j3-card.on{transform:translateY(0)}.j3-status{top:70px;left:14px}.j3-skip{top:66px;right:14px}}';

var style = document.createElement('style');
style.textContent = css;
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
      '<div class="j3-btns">' +
        '<button class="j3-next" id="j3-next-art" type="button">Next relic →</button>' +
        '<button class="j3-open" id="j3-open-page" type="button">Open full page →</button>' +
      '</div>' +
      '<div class="j3-note" id="j3-note"></div>' +
      '<div class="j3-countdown" id="j3-countdown"></div>' +
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

/* -------------------------------------------------------------------------- */
/*  STATUS HELPERS                                                            */
/* -------------------------------------------------------------------------- */

var statusEl = document.getElementById('j3-status');
function setStatus(msg){
  if (!statusEl) return;
  statusEl.textContent = msg || '';
  if (msg) statusEl.classList.add('on');
  else statusEl.classList.remove('on');
}

/* -------------------------------------------------------------------------- */
/*  THREE.JS SCENE                                                            */
/* -------------------------------------------------------------------------- */

var canvas = document.getElementById('j3-cv');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05080f, 1);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 5000);

scene.add(new THREE.AmbientLight(0x2a3550, 0.6));
var sunLight = new THREE.DirectionalLight(0xfff0d0, 2.4);
sunLight.position.set(150, 80, 100);
scene.add(sunLight);

var sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(14, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xfff0b0 })
);
sunSphere.position.copy(sunLight.position).multiplyScalar(2);
scene.add(sunSphere);

/* Star field. */
(function(){
  var g = new THREE.BufferGeometry();
  var N = 4000;
  var pos = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    var r = 1000 + Math.random() * 800;
    var t = Math.random() * Math.PI * 2;
    var p = Math.acos(2 * Math.random() - 1);
    pos[i*3] = r * Math.sin(p) * Math.cos(t);
    pos[i*3+1] = r * Math.sin(p) * Math.sin(t);
    pos[i*3+2] = r * Math.cos(p);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.9, transparent: true, opacity: 0.85, sizeAttenuation: true
  })));
})();

/* Planets. */
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

function marsProcTex(){
  var c = document.createElement('canvas');
  c.width = c.height = 512;
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#8a3a1f');
  g.addColorStop(.5, '#b8502a');
  g.addColorStop(1, '#8a3a1f');
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  for (var i = 0; i < 200; i++) {
    x.fillStyle = 'rgba(90,40,15,' + (0.15 + Math.random() * 0.35) + ')';
    x.fillRect(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 80, 6 + Math.random() * 20);
  }
  return new THREE.CanvasTexture(c);
}

PLANETS.mars = new THREE.Mesh(
  new THREE.SphereGeometry(3.4, 48, 48),
  new THREE.MeshStandardMaterial({ map: marsProcTex(), roughness: 0.95, metalness: 0 })
);
PLANETS.mars.position.set(120, -6, -70);
scene.add(PLANETS.mars);

/* Ship. */
var ship = new THREE.Group();
ship.add(new THREE.Mesh(
  new THREE.ConeGeometry(0.32, 1.6, 16),
  new THREE.MeshStandardMaterial({ color: 0xe8ecf4, roughness: 0.3, metalness: 0.75 })
).rotateX(Math.PI / 2));

var cockpit = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0x58d6f1, roughness: 0.05, metalness: 0.9, emissive: 0x0a3050 })
);
cockpit.position.set(0, 0.14, 0.5);
ship.add(cockpit);

[-1, 1].forEach(function(s){
  var w = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.04, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xd0d6e0, roughness: 0.4, metalness: 0.6 })
  );
  w.position.set(s * 0.32, -0.02, 0.05);
  w.rotation.z = s * 0.12;
  ship.add(w);
});

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

  var m = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x58d6f1 })
  );
  m.position.copy(wp);
  markerGroup.add(m);

  var ring = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 24),
    new THREE.MeshBasicMaterial({ color: 0x58d6f1, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  ring.position.copy(wp);
  ring.lookAt(planet.position);
  ring.userData.pulse = true;
  markerGroup.add(ring);

  a.world = wp;
});

/* -------------------------------------------------------------------------- */
/*  BEATS                                                                     */
/* -------------------------------------------------------------------------- */

var BEATS = [];

BEATS.push({
  name: 'Launch', sub: 'Departing Earth orbit', dur: 3500, artifact: null,
  shipA: [0, 4, 16], shipB: [0, 4, 12],
  camA: [0, 5, 22], camB: [0, 5, 20],
  look: [0, 0, 0],
