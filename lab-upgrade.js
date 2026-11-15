/* lab-upgrade.js — replaces 3D Lab models with detailed versions
   and adds liftoff / landing / hover / drive simulation.
   Load this AFTER journey.js. */
console.log('[lab-upgrade] loading');

(function(){
'use strict';

var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';

/* ---- On-screen error banner ---- */
var banner = document.createElement('div');
banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7a1e1e;color:#fff;font:12px monospace;padding:10px;display:none;white-space:pre-wrap';
document.body.appendChild(banner);
function err(m){ banner.style.display = 'block'; banner.textContent = 'LAB ERROR: ' + m; console.error(m); }

/* ---- Boot: wait for THREE + #labcv ---- */
var triedThree = false;
function boot(){
  if (document.getElementById('lu-canvas')) return;
  if (!window.THREE) {
    if (triedThree) { setTimeout(boot, 400); return; }
    triedThree = true;
    var s = document.createElement('script');
    s.src = THREE_URL; s.onload = boot;
    s.onerror = function(){ err('Could not load Three.js'); };
    document.head.appendChild(s);
    return;
  }
  var cv = document.getElementById('labcv');
  if (!cv) { setTimeout(boot, 500); return; }
  try { build(cv); } catch(e){ err(e.message); }
}

/* ================================================================ */
/*  BUILD                                                            */
/* ================================================================ */
function build(container){

/* Take over the canvas container */
container.innerHTML = '';

var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x0a1e3a, 1);
renderer.domElement.id = 'lu-canvas';
renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
container.appendChild(renderer.domElement);

var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a1e3a, 15, 40);
var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

scene.add(new THREE.AmbientLight(0x8899bb, 0.85));
var key = new THREE.DirectionalLight(0xfff0d0, 1.8); key.position.set(5, 10, 4); scene.add(key);
var fill = new THREE.DirectionalLight(0x4a9eff, 0.55); fill.position.set(-5, 3, -4); scene.add(fill);
var rim = new THREE.DirectionalLight(0xffffff, 0.4); rim.position.set(0, 4, -8); scene.add(rim);

/* Ground plane — dusty for landing dust effect */
var ground = new THREE.Mesh(
  new THREE.CircleGeometry(30, 48),
  new THREE.MeshStandardMaterial({ color: 0x1a3a5e, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
scene.add(ground);

var grid = new THREE.GridHelper(20, 20, 0x2a5a8e, 0x14304e);
scene.add(grid);

/* Camera orbit state */
var orbit = { target: new THREE.Vector3(0, 0.8, 0), radius: 6, theta: Math.PI/4, phi: Math.PI/3 };
function updateCam(){
  camera.position.x = orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
  camera.position.y = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
  camera.position.z = orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
  camera.lookAt(orbit.target);
}
updateCam();

/* Mouse / touch / wheel controls */
var isDown = false, lastX = 0, lastY = 0;
renderer.domElement.addEventListener('mousedown', function(e){ isDown = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('mouseup', function(){ isDown = false; });
window.addEventListener('mousemove', function(e){
  if (!isDown) return;
  orbit.theta -= (e.clientX - lastX) * 0.01;
  orbit.phi = Math.max(0.15, Math.min(Math.PI - 0.15, orbit.phi - (e.clientY - lastY) * 0.01));
  lastX = e.clientX; lastY = e.clientY;
  updateCam();
});
renderer.domElement.addEventListener('wheel', function(e){
  e.preventDefault();
  orbit.radius = Math.max(2.5, Math.min(18, orbit.radius + e.deltaY * 0.005));
  updateCam();
}, { passive: false });
var touchStart = null;
renderer.domElement.addEventListener('touchstart', function(e){
  if (e.touches.length === 1) touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
renderer.domElement.addEventListener('touchmove', function(e){
  if (e.touches.length !== 1 || !touchStart) return;
  orbit.theta -= (e.touches[0].clientX - touchStart.x) * 0.01;
  orbit.phi = Math.max(0.15, Math.min(Math.PI - 0.15, orbit.phi - (e.touches[0].clientY - touchStart.y) * 0.01));
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  updateCam();
}, { passive: true });

function resize(){
  var r = container.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return;
  renderer.setSize(r.width, r.height);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(container);

/* ================================================================ */
/*  MATERIALS                                                        */
/* ================================================================ */
var M = {
  white:  new THREE.MeshStandardMaterial({ color: 0xf0f2f6, roughness: 0.55, metalness: 0.15 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xc4c8d0, roughness: 0.35, metalness: 0.65 }),
  gold:   new THREE.MeshStandardMaterial({ color: 0xd4a850, roughness: 0.45, metalness: 0.75 }),
  dark:   new THREE.MeshStandardMaterial({ color: 0x1a1e2a, roughness: 0.6, metalness: 0.4 }),
  black:  new THREE.MeshStandardMaterial({ color: 0x0a0d14, roughness: 0.8, metalness: 0.2 }),
  glass:  new THREE.MeshStandardMaterial({ color: 0x58d6f1, roughness: 0.08, metalness: 0.9, transparent: true, opacity: 0.75, emissive: 0x1a3050 }),
  red:    new THREE.MeshStandardMaterial({ color: 0xc84a4a, roughness: 0.5, metalness: 0.3 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xff7a3c, roughness: 0.5, metalness: 0.4 })
};

/* ================================================================ */
/*  MODEL BUILDERS                                                   */
/* ================================================================ */

/* --- Moon Buggy (LRV) --- */
function makeBuggy(){
  var g = new THREE.Group();
  var chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 1.0), M.silver);
  chassis.position.y = 0.5;
  g.add(chassis);

  [-1, 1].forEach(function(sx){
    [-1, 1].forEach(function(sz){
      var wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 12, 20), M.dark);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(sx * 1.05, 0.35, sz * 0.45);
      wheel.userData.wheel = true;
      wheel.userData.spinAxis = 'x';
      g.add(wheel);

      var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), M.gold);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(sx * 1.05, 0.35, sz * 0.45);
      g.add(hub);

      var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), M.silver);
      strut.position.set(sx * 1.05, 0.5, sz * 0.45);
      g.add(strut);
    });
  });

  [-0.4, 0.4].forEach(function(sx){
    var seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.35), M.dark);
    seat.position.set(sx, 0.75, 0);
    g.add(seat);
    var back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.06), M.dark);
    back.position.set(sx, 0.9, -0.15);
    g.add(back);
  });

  var wheelSteer = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16), M.dark);
  wheelSteer.rotation.x = Math.PI / 2;
  wheelSteer.position.set(0, 0.85, 0.3);
  g.add(wheelSteer);

  var antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 6), M.silver);
  antenna.position.set(0.8, 1.1, -0.3);
  g.add(antenna);
  var dish = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.15, 8), M.white);
  dish.rotation.x = -Math.PI / 2;
  dish.position.set(0.8, 1.4, -0.3);
  g.add(dish);

  var cam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.15), M.dark);
  cam.position.set(0, 0.95, 0.5);
  g.add(cam);

  [-0.6, 0.6].forEach(function(sx){
    var rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), M.white);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx, 0.75, 0.5);
    g.add(rail);
  });

  g.userData.sim = 'drive';
  g.userData.radius = 1.4;
  return g;
}

/* --- Surveyor 3 --- */
function makeSurveyor(){
  var g = new THREE.Group();

  var body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 1.0), M.gold);
  body.position.y = 0.9;
  g.add(body);

  var cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.6), M.silver);
  cap.position.y = 1.32;
  g.add(cap);

  /* 3 legs with footpads */
  for (var i = 0; i < 3; i++){
    var a = i * Math.PI * 2 / 3 + Math.PI / 6;
    var lx = Math.cos(a) * 0.75;
    var lz = Math.sin(a) * 0.75;
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.9, 8), M.silver);
    leg.position.set(lx * 0.7, 0.5, lz * 0.7);
    leg.rotation.z = -Math.atan2(lx, 0.7) * 0.4;
    leg.rotation.x = Math.atan2(lz, 0.7) * 0.4;
    leg.userData.leg = true;
    g.add(leg);

    var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 12), M.silver);
    pad.position.set(lx, 0.03, lz);
    pad.userData.footpad = true;
    pad.userData.originalY = 0.03;
    g.add(pad);

    var brace = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), M.silver);
    brace.position.set(lx * 0.5, 0.5, lz * 0.5);
    brace.rotation.z = -Math.atan2(lx, 0.7) * 0.7;
    brace.rotation.x = Math.atan2(lz, 0.7) * 0.7;
    g.add(brace);
  }

  /* Solar panel */
  var panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.7), M.dark);
  panel.position.y = 1.42;
  g.add(panel);

  var panelFrame = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.05, 0.76), M.silver);
  panelFrame.position.y = 1.40;
  g.add(panelFrame);

  /* Camera/mirror */
  var camMir = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.15), M.dark);
  camMir.position.set(0.3, 1.5, 0.4);
  g.add(camMir);

  var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12), M.glass);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.3, 1.5, 0.5);
  g.add(lens);

  /* Dish antenna */
  var dish = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.2, 12), M.white);
  dish.rotation.x = -Math.PI / 2;
  dish.position.set(-0.3, 1.6, 0);
  g.add(dish);

  /* Scoop arm */
  var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 8), M.silver);
  arm.rotation.z = Math.PI / 3;
  arm.position.set(0.6, 1.05, 0.3);
  g.add(arm);
  var scoop = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.25), M.gold);
  scoop.position.set(0.95, 0.8, 0.3);
  g.add(scoop);

  g.userData.sim = 'liftoff';
  g.userData.radius = 1.1;
  return g;
}

/* --- Lunar Module (Intrepid / Eagle) --- */
function makeLM(){
  var g = new THREE.Group();

  /* Descent stage — octagonal gold foil */
  var descent = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.7, 8), M.gold);
  descent.position.y = 0.55;
  g.add(descent);

  /* Descent midband */
  var band = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.15, 8), M.silver);
  band.position.y = 0.55;
  g.add(band);

  /* Ascent stage — white cabin */
  var ascent = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 1.1), M.white);
  ascent.position.y = 1.25;
  g.add(ascent);

  /* Cabin top slope (adds character) */
  var topSlope = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.15, 4), M.white);
  topSlope.rotation.y = Math.PI / 4;
  topSlope.position.y = 1.65;
  g.add(topSlope);

  /* Windows — two triangular dark panels on front */
  var wL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.04), M.glass);
  wL.position.set(-0.22, 1.35, 0.56);
  g.add(wL);
  var wR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.04), M.glass);
  wR.position.set(0.22, 1.35, 0.56);
  g.add(wR);

  /* Front hatch */
  var hatch = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 0.04), M.silver);
  hatch.position.set(0, 1.05, 0.56);
  g.add(hatch);

  /* Ladder */
  var ladder = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.85, 6), M.silver);
  ladder.position.set(-0.05, 0.65, 0.9);
  g.add(ladder);
  var ladder2 = ladder.clone(); ladder2.position.x = 0.15; g.add(ladder2);
  for (var h = 0; h < 4; h++){
    var rung = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), M.silver);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0.05, 0.35 + h * 0.2, 0.9);
    g.add(rung);
  }

  /* Porch */
  var porch = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.25), M.silver);
  porch.position.set(0.05, 0.85, 0.72);
  g.add(porch);

  /* 4 legs with footpads */
  for (var i = 0; i < 4; i++){
    var a = i * Math.PI / 2 + Math.PI / 4;
    var lx = Math.cos(a) * 0.85;
    var lz = Math.sin(a) * 0.85;

    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.0, 8), M.silver);
    leg.position.set(lx * 0.65, 0.5, lz * 0.65);
    leg.rotation.z = -Math.atan2(lx, 0.7) * 0.35;
    leg.rotation.x = Math.atan2(lz, 0.7) * 0.35;
    leg.userData.leg = true;
    g.add(leg);

    var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), M.silver);
    strut.position.set(lx * 0.4, 0.55, lz * 0.4);
    strut.rotation.z = -Math.atan2(lx, 0.7) * 0.55;
    strut.rotation.x = Math.atan2(lz, 0.7) * 0.55;
    g.add(strut);

    var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 12), M.silver);
    pad.position.set(lx, 0.04, lz);
    pad.userData.footpad = true;
    pad.userData.originalY = 0.04;
    g.add(pad);
  }

  /* RCS thrusters (4 small cones around ascent) */
  for (var k = 0; k < 4; k++){
    var ra = k * Math.PI / 2 + Math.PI / 4;
    var rcs = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 6), M.dark);
    rcs.position.set(Math.cos(ra) * 0.55, 1.6, Math.sin(ra) * 0.55);
    rcs.rotation.z = Math.PI / 2;
    rcs.rotation.y = -ra;
    g.add(rcs);
  }

  /* Antenna */
  var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), M.silver);
  ant.position.set(0.35, 1.85, -0.2);
  g.add(ant);
  var antTop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), M.red);
  antTop.position.set(0.35, 2.05, -0.2);
  g.add(antTop);

  g.userData.sim = 'liftoff';
  g.userData.radius = 1.5;
  return g;
}

/* --- Perseverance --- */
function makePerseverance(){
  var g = new THREE.Group();

  /* Main body */
  var body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 2.0), M.white);
  body.position.y = 0.9;
  g.add(body);

  /* Top instruments */
  var topPlate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.8), M.silver);
  topPlate.position.y = 1.22;
  g.add(topPlate);

  /* RTG with fins */
  var rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 12), M.dark);
  rtg.rotation.z = Math.PI / 2;
  rtg.position.set(0, 1.45, -0.5);
  g.add(rtg);
  for (var f = 0; f < 8; f++){
    var fa = f * Math.PI / 4;
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.35), M.silver);
    fin.position.set(0, 1.45 + Math.cos(fa) * 0.28, -0.5 + Math.sin(fa) * 0.28);
    fin.rotation.x = fa;
    g.add(fin);
  }

  /* Mast with cameras */
  var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), M.silver);
  mast.position.set(0, 1.7, 0.5);
  g.add(mast);

  var mastHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.2), M.dark);
  mastHead.position.set(0, 2.2, 0.5);
  g.add(mastHead);

  [-0.1, 0.1].forEach(function(cx){
    var camL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 10), M.glass);
    camL.rotation.x = Math.PI / 2;
    camL.position.set(cx, 2.2, 0.6);
    g.add(camL);
  });

  /* High-gain antenna */
  var hga = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16), M.white);
  hga.rotation.x = Math.PI / 2;
  hga.position.set(0, 1.35, 0.75);
  g.add(hga);

  /* 6 wheels with rocker-bogie */
  var wheelPositions = [
    [0.75, 0.32, 0.8], [-0.75, 0.32, 0.8],
    [0.75, 0.32, 0], [-0.75, 0.32, 0],
    [0.75, 0.32, -0.8], [-0.75, 0.32, -0.8]
  ];
  wheelPositions.forEach(function(p){
    var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.15, 16), M.silver);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(p[0], p[1], p[2]);
    wheel.userData.wheel = true;
    wheel.userData.spinAxis = 'y';
    g.add(wheel);

    var tread = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 20), M.dark);
    tread.rotation.y = Math.PI / 2;
    tread.position.set(p[0], p[1], p[2]);
    g.add(tread);

    var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), M.silver);
    strut.rotation.z = Math.PI / 2;
    strut.position.set(p[0] * 0.5, 0.55, p[2]);
    g.add(strut);
  });

  /* Rocker-bogie diagonals */
  [[0.6, 0.55, 0.8, 0.4, 0.55, 0], [0.6, 0.55, 0.8, 0.4, 0.55, -0.4],
   [-0.6, 0.55, 0.8, -0.4, 0.55, 0], [-0.6, 0.55, 0.8, -0.4, 0.55, -0.4]].forEach(function(l){
    var dx = l[3] - l[0], dy = l[4] - l[1], dz = l[5] - l[2];
    var len = Math.sqrt(dx*dx + dy*dy + dz*dz);
    var diag = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), M.silver);
    diag.position.set((l[0]+l[3])/2, (l[1]+l[4])/2, (l[2]+l[5])/2);
    diag.lookAt(l[3], l[4], l[5]);
    diag.rotateX(Math.PI / 2);
    g.add(diag);
  });

  /* Robotic arm */
  var armSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.7), M.silver);
  armSeg1.position.set(0.65, 0.75, 0.85);
  armSeg1.rotation.x = 0.4;
  g.add(armSeg1);

  var armSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), M.silver);
  armSeg2.position.set(0.65, 0.55, 1.28);
  armSeg2.rotation.x = -0.5;
  g.add(armSeg2);

  var turret = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), M.dark);
  turret.position.set(0.65, 0.35, 1.5);
  g.add(turret);

  g.userData.sim = 'drive';
  g.userData.radius = 1.4;
  return g;
}

/* --- Ingenuity --- */
function makeIngenuity(){
  var g = new THREE.Group();

  /* Fuselage */
  var body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.55), M.white);
  body.position.y = 1.2;
  g.add(body);

  /* Solar panel on top */
  var solar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.7), M.dark);
  solar.position.y = 1.42;
  g.add(solar);
  var solarFrame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.75), M.silver);
  solarFrame.position.y = 1.40;
  g.add(solarFrame);

  /* Coaxial rotors — two blades each */
  var rotor1 = new THREE.Group();
  rotor1.position.y = 1.5;
  rotor1.userData.rotor = 1;
  for (var b1 = 0; b1 < 2; b1++){
    var blade = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.08), M.dark);
    blade.rotation.y = b1 * Math.PI;
    rotor1.add(blade);
  }
  var hub1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), M.silver);
  rotor1.add(hub1);
  g.add(rotor1);

  var rotor2 = new THREE.Group();
  rotor2.position.y = 1.58;
  rotor2.userData.rotor = -1;
  for (var b2 = 0; b2 < 2; b2++){
    var blade2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.02, 0.08), M.dark);
    blade2.rotation.y = b2 * Math.PI + Math.PI / 2;
    rotor2.add(blade2);
  }
  var hub2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), M.silver);
  rotor2.add(hub2);
  g.add(rotor2);

  /* 4 landing legs with cross-braces */
  for (var i = 0; i < 4; i++){
    var a = i * Math.PI / 2 + Math.PI / 4;
    var lx = Math.cos(a) * 0.55;
    var lz = Math.sin(a) * 0.55;

    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.75, 6), M.dark);
    leg.position.set(lx * 0.5, 0.9, lz * 0.5);
    leg.rotation.z = -Math.atan2(lx, 0.55) * 0.4;
    leg.rotation.x = Math.atan2(lz, 0.55) * 0.4;
    g.add(leg);

    var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), M.silver);
    pad.position.set(lx, 0.52, lz);
    pad.userData.footpad = true;
    pad.userData.originalY = 0.52;
    g.add(pad);

    var brace = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), M.dark);
    brace.position.set(lx * 0.7, 0.7, lz * 0.7);
    brace.rotation.z = Math.PI / 2;
    brace.lookAt(0, 1.05, 0);
    g.add(brace);
  }

  /* Camera */
  var cam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.15), M.dark);
  cam.position.set(0, 1.15, 0.35);
  g.add(cam);

  g.userData.sim = 'hover';
  g.userData.radius = 1.1;
  return g;
}

/* --- Three Forks sample depot --- */
function makeDepot(){
  var g = new THREE.Group();

  /* 10 tubes on ground */
  var positions = [];
  for (var i = 0; i < 10; i++){
    var angle = (i / 10) * Math.PI * 2;
    var radius = 0.5 + Math.random() * 0.5;
    positions.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  positions.forEach(function(p){
    var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 10), M.silver);
    tube.rotation.z = (Math.random() - 0.5) * 0.4;
    tube.rotation.x = Math.PI / 2;
    tube.position.set(p[0], 0.05, p[1]);
    g.add(tube);

    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), M.gold);
    cap.rotation.x = Math.PI / 2;
    cap.position.set(p[0], 0.05, p[1] + 0.15);
    g.add(cap);
  });

  /* Marker antenna */
  var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), M.silver);
  mast.position.set(0, 0.25, 0);
  g.add(mast);
  var flag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.02), M.red);
  flag.position.set(0.08, 0.4, 0);
  g.add(flag);

  /* Small rover in distance */
  var rover = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.4), M.white);
  rover.position.set(2, 0.1, -1.5);
  g.add(rover);

  g.userData.sim = 'none';
  g.userData.radius = 1.2;
  return g;
}

/* ================================================================ */
/*  MODEL FACTORY                                                    */
/* ================================================================ */
var BUILDERS = {
  'a15': makeBuggy,
  's3': makeSurveyor,
  'a12': makeLM,
  'a11': makeLM,
  'pv': makePerseverance,
  'ig': makeIngenuity,
  'jz': makeDepot
};

var currentCraft = null;
var currentCraftId = null;
var sim = { state: 'idle', t0: 0, duration: 0 };

function buildCraft(id){
  if (currentCraft) {
    scene.remove(currentCraft);
    currentCraft = null;
  }
  var builder = BUILDERS[id];
  if (!builder) return;
  var g = builder();
  g.position.set(0, 0, 0);
  scene.add(g);
  currentCraft = g;
  currentCraftId = id;
  sim.state = 'idle';

  /* Update Liftoff button to match craft type */
  var btn = document.getElementById('lu-sim-btn');
  if (btn) {
    var t = g.userData.sim;
    if (t === 'liftoff') btn.textContent = '🚀 Liftoff & land';
    else if (t === 'hover') btn.textContent = '🚁 Hover';
    else if (t === 'drive') btn.textContent = '🛞 Drive';
    else btn.textContent = '(no simulation)';
    btn.style.display = t === 'none' ? 'none' : '';
  }

  /* Adjust orbit radius for larger crafts */
  orbit.radius = 6;
  orbit.target.y = 0.8;
  updateCam();
  console.log('[lab-upgrade] built craft:', id);
}

/* ================================================================ */
/*  SIMULATION ANIMATION                                             */
/* ================================================================ */

/* Particle pool for exhaust and dust */
var particles = [];
function initParticles(){
  var geo = new THREE.SphereGeometry(0.06, 6, 6);
  for (var i = 0; i < 60; i++){
    var mat = new THREE.MeshBasicMaterial({
      color: 0xff8844, transparent: true, opacity: 0,
      depthWrite: false
    });
    var m = new THREE.Mesh(geo, mat);
    m.visible = false;
    scene.add(m);
    particles.push({ mesh: m, life: 0, vel: new THREE.Vector3() });
  }
}
initParticles();

function spawnParticle(pos, color, speed, size){
  for (var i = 0; i < particles.length; i++){
    if (particles[i].life <= 0){
      var p = particles[i];
      p.mesh.position.copy(pos);
      p.mesh.material.color.setHex(color);
      p.mesh.scale.setScalar(size || 1);
      p.mesh.visible = true;
      p.life = 1;
      p.vel.set((Math.random() - 0.5) * speed, -Math.random() * speed - 0.5, (Math.random() - 0.5) * speed);
      return;
    }
  }
}

function updateParticles(dt){
  for (var i = 0; i < particles.length; i++){
    if (particles[i].life > 0){
      particles[i].life -= dt * 1.5;
      particles[i].mesh.position.addScaledVector(particles[i].vel, dt);
      particles[i].mesh.material.opacity = Math.max(0, particles[i].life) * 0.8;
      particles[i].mesh.scale.setScalar((1 + (1 - particles[i].life) * 1.5) * (particles[i].size || 1));
      if (particles[i].life <= 0) particles[i].mesh.visible = false;
    }
  }
}

function startSim(){
  if (!currentCraft) return;
  var type = currentCraft.userData.sim;
  if (type === 'none') return;
  if (sim.state !== 'idle') return;

  sim.state = 'run';
  sim.t0 = performance.now();
  sim.type = type;
  console.log('[lab-upgrade] simulation start:', type);
}

function updateSim(now){
  if (sim.state !== 'run' || !currentCraft) return;
  var t = (now - sim.t0) / 1000;
  var g = currentCraft;

  if (sim.type === 'liftoff'){
    /* 6-second sequence: 0-0.5 spoolup, 0.5-2 ascend, 2-3.5 hover, 3.5-5.5 descend, 5.5-6 settle */
    var y = 0, tilt = 0, plume = 0;

    if (t < 0.5){
      tilt = Math.sin(t * 40) * 0.02;
      plume = t / 0.5 * 0.6;
    } else if (t < 2){
      var p = (t - 0.5) / 1.5;
      y = p * 2;
      plume = 1;
      tilt = Math.sin(t * 30) * 0.015;
    } else if (t < 3.5){
      y = 2 + Math.sin(t * 3) * 0.05;
      plume = 0.7 + Math.sin(t * 8) * 0.15;
    } else if (t < 5.5){
      var p2 = (t - 3.5) / 2;
      y = 2 * (1 - p2);
      plume = 0.7;
      tilt = Math.sin(t * 25) * 0.02;
    } else if (t < 6){
      y = 0;
      plume = (1 - (t - 5.5) / 0.5) * 0.5;
    } else {
      sim.state = 'idle';
      g.position.y = 0;
      g.rotation.z = 0;
      return;
    }

    g.position.y = y;
    g.rotation.z = tilt;

    /* Exhaust particles from descent stage */
    if (plume > 0.3 && Math.random() < plume){
      var ep = new THREE.Vector3(
        g.position.x + (Math.random() - 0.5) * 0.6,
        g.position.y + 0.3,
        g.position.z + (Math.random() - 0.5) * 0.6
      );
      spawnParticle(ep, 0xffaa44, 2 + plume * 2, 0.8);
    }
    /* Dust from ground on touchdown */
    if (t > 5.5 && Math.random() < 0.6){
      var dp = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        0.05,
        (Math.random() - 0.5) * 1.5
      );
      spawnParticle(dp, 0xcc9966, 1.5, 1.2);
    }
  }
  else if (sim.type === 'hover'){
    var y = 0, rotorSpeed = 0;
    if (t < 0.6){
      rotorSpeed = t / 0.6 * 20;
    } else if (t < 1.5){
      var p = (t - 0.6) / 0.9;
      y = p * 1.5;
      rotorSpeed = 20 + Math.sin(t * 6) * 3;
    } else if (t < 3.5){
      y = 1.5 + Math.sin(t * 3) * 0.1;
      rotorSpeed = 22;
    } else if (t < 4.8){
      var p2 = (t - 3.5) / 1.3;
      y = 1.5 * (1 - p2);
      rotorSpeed = 22 - p2 * 2;
    } else if (t < 5.5){
      y = 0;
      rotorSpeed = (1 - (t - 4.8) / 0.7) * 20;
    } else {
      sim.state = 'idle';
      g.position.y = 0;
      return;
    }
    g.position.y = y;

    /* Rotate rotors */
    g.children.forEach(function(c){
      if (c.userData.rotor === 1) c.rotation.y += rotorSpeed * 0.02;
      else if (c.userData.rotor === -1) c.rotation.y -= rotorSpeed * 0.02;
    });
  }
  else if (sim.type === 'drive'){
    /* 4-second: forward 2s, back 2s */
    var dist = 0;
    if (t < 2){
      dist = (t / 2) * 1.5;
    } else if (t < 4){
      dist = 1.5 * (1 - (t - 2) / 2);
    } else {
      sim.state = 'idle';
      g.position.z = 0;
      g.position.x = 0;
      return;
    }
    var dir = currentCraftId === 'a15' ? 'x' : 'z';
    if (dir === 'x') g.position.x = dist;
    else g.position.z = dist;

    /* Spin wheels */
    g.children.forEach(function(c){
      if (c.userData.wheel){
        c.rotation.x += 0.15;
      }
    });
    /* Dust trail */
    if (Math.random() < 0.4){
      var dp = new THREE.Vector3(
        g.position.x + (Math.random() - 0.5) * 0.5,
        0.1,
        g.position.z + (Math.random() - 0.5) * 0.5
      );
      spawnParticle(dp, 0xccccaa, 0.5, 0.6);
    }
  }
}

/* ================================================================ */
/*  ADD SIMULATION BUTTON                                            */
/* ================================================================ */
var tools = document.querySelector('.labtools');
if (tools){
  var simBtn = document.createElement('button');
  simBtn.id = 'lu-sim-btn';
  simBtn.type = 'button';
  simBtn.textContent = '🚀 Liftoff & land';
  simBtn.style.cssText = 'font:700 12px var(--fh);color:#0d2f55;background:linear-gradient(180deg,#58d6f1,#3b9be0);border:0;border-radius:10px;padding:8px 14px;cursor:pointer;min-height:36px;color:#fff';
  simBtn.onclick = startSim;
  tools.appendChild(simBtn);
  console.log('[lab-upgrade] sim button added');
} else {
  console.warn('[lab-upgrade] .labtools not found — button not added');
}

/* ================================================================ */
/*  HOOK INTO EXISTING LAB.craft                                     */
/* ================================================================ */
function hookLAB(){
  if (!window.LAB || typeof window.LAB.craft !== 'function') {
    setTimeout(hookLAB, 500);
    return;
  }
  var orig = window.LAB.craft;
  window.LAB.craft = function(id){
    try { var r = orig.apply(this, arguments); } catch(e){}
    try { buildCraft(id); } catch(e){ err('buildCraft: ' + e.message); }
    return r;
  };
  console.log('[lab-upgrade] LAB.craft hooked');

  /* If LAB already loaded a craft, re-render it with our model */
  var firstCraft = document.querySelector('#labpick .pk');
  if (firstCraft) {
    var id = firstCraft.dataset.id || 'a15';
    setTimeout(function(){ buildCraft(id); }, 200);
  } else {
    buildCraft('a15');
  }
}
hookLAB();

/* Also listen for picker clicks directly */
document.addEventListener('click', function(e){
  var pick = e.target.closest('#labpick .pk, #plist2 .chip');
  if (!pick) return;
  var id = pick.dataset.id || pick.dataset.craft || pick.dataset.rel;
  if (id && BUILDERS[id]) setTimeout(function(){ buildCraft(id); }, 100);
});

/* ================================================================ */
/*  ANIMATE                                                          */
/* ================================================================ */
var lastFrame = performance.now();
function animate(){
  requestAnimationFrame(animate);
  var now = performance.now();
  var dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  updateSim(now);
  updateParticles(dt);

  /* Gentle rotation when idle */
  if (sim.state === 'idle' && currentCraft && !isDown){
    currentCraft.rotation.y += 0.003;
  }

  renderer.render(scene, camera);
}
animate();

console.log('[lab-upgrade] READY');

}

/* ---- Boot ---- */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
