/* journey.js — v7
   Same tour flow as v6, but planets now have detailed procedural textures:
   - Earth: continents (fBm), oceans with depth gradient, polar ice, banded clouds
   - Moon:  maria (dark plains) + 280 craters with bright rims and dark interiors
   - Mars:  rust/ochre surface, dark basalt regions, dust patches, craters, polar caps
   All three get bump maps for surface relief + atmospheric halos.
   Moon enlarged to radius 2.2 so its crater detail is visible at tour distance. */

console.log('[journey] v7 loading…');

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

function log(){ if (!CONFIG.verbose) return; try { console.log.apply(console, ['[journey]'].concat([].slice.call(arguments))); } catch (e) {} }
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

  try { build(); log('v7 build complete'); }
  catch (e) { err('build failed:', e); alert('Tour failed: ' + (e && e.message ? e.message : e)); }
}

function build(){

/* ========================================================================== */
/*  CSS                                                                       */
/* ========================================================================== */

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

/* ========================================================================== */
/*  HTML OVERLAY                                                              */
/* ========================================================================== */

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

/* ========================================================================== */
/*  RENDERER / SCENE                                                          */
/* ========================================================================== */

var canvas = document.getElementById('j3-cv');
var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05080f, 1);

var scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05080f, 0.0007);

var camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 8000);

scene.add(new THREE.AmbientLight(0x2a3550, 0.9));

var sunLight = new THREE.DirectionalLight(0xfff0d0, 2.4);
sunLight.position.set(150, 80, 100);
scene.add(sunLight);

var rimLight = new THREE.DirectionalLight(0x4a9eff, 0.6);
rimLight.position.set(-100, -50, -100);
scene.add(rimLight);

var sunSphere = new THREE.Mesh(
  new THREE.SphereGeometry(14, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xfff0b0 })
);
sunSphere.position.copy(sunLight.position).multiplyScalar(2);
scene.add(sunSphere);

var sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(28, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0xffdd88, transparent: true, opacity: 0.18,
    side: THREE.BackSide, blending: THREE.AdditiveBlending
  })
);
sunGlow.position.copy(sunSphere.position);
scene.add(sunGlow);

/* ========================================================================== */
/*  STAR FIELD                                                                */
/* ========================================================================== */

(function(){
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
    else if (v < 0.85) { col[i*3] = 1; col[i*3+1] = 0.78; col[i*3+2] = 0.55; }
    else { col[i*3] = 0.65; col[i*3+1] = 0.82; col[i*3+2] = 1; }
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    size: 1.3, transparent: true, opacity: 0.9, vertexColors: true, sizeAttenuation: true
  })));
})();

/* ========================================================================== */
/*  PROCEDURAL NOISE — fast table lookup                                      */
/* ========================================================================== */

var NT = 256;
var noiseTable = (function(){
  var t = new Float32Array(NT * NT);
  for (var i = 0; i < t.length; i++) t[i] = Math.random();
  return t;
})();

function noise2D(x, y){
  var ix = Math.floor(x);
  var iy = Math.floor(y);
  var fx = x - ix;
  var fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  var x0 = ix & (NT - 1);
  var y0 = iy & (NT - 1);
  var x1 = (x0 + 1) & (NT - 1);
  var y1 = (y0 + 1) & (NT - 1);
  var n00 = noiseTable[x0 + y0 * NT];
  var n10 = noiseTable[x1 + y0 * NT];
  var n01 = noiseTable[x0 + y1 * NT];
  var n11 = noiseTable[x1 + y1 * NT];
  var nx0 = n00 * (1 - fx) + n10 * fx;
  var nx1 = n01 * (1 - fx) + n11 * fx;
  return nx0 * (1 - fy) + nx1 * fy;
}

function fbm(x, y, oct){
  var s = 0, amp = 1, freq = 1, tot = 0;
  for (var i = 0; i < oct; i++){
    s += noise2D(x * freq, y * freq) * amp;
    tot += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return s / tot;
}

/* ========================================================================== */
/*  PROCEDURAL TEXTURES                                                       */
/* ========================================================================== */

function genEarth(){
  var W = 1024, H = 512;
  var colC = document.createElement('canvas');
  colC.width = W; colC.height = H;
  var colX = colC.getContext('2d');
  var colI = colX.createImageData(W, H);

  var bmpC = document.createElement('canvas');
  bmpC.width = W; bmpC.height = H;
  var bmpX = bmpC.getContext('2d');
  var bmpI = bmpX.createImageData(W, H);

  for (var y = 0; y < H; y++){
    for (var x = 0; x < W; x++){
      var u = x / W * 6;
      var v = y / H * 3;
      var n1 = fbm(u, v, 5);
      var n2 = fbm(u * 3 + 10, v * 3 + 5, 4);
      var n3 = fbm(u * 8 + 20, v * 8 + 15, 3);

      var latDist = Math.abs(y / H - 0.5) * 2;
      var isIce = latDist > 0.87 + (n2 - 0.5) * 0.05;

      var r, g, b, bumpVal;

      if (isIce) {
        r = 235; g = 242; b = 248;
        bumpVal = 180;
      } else if (n1 > 0.52) {
        var elev = (n1 - 0.52) / 0.48;
        if (elev < 0.15) { r = 200; g = 210; b = 160; bumpVal = 110 + elev * 100; }
        else if (elev < 0.35) {
          if (n2 > 0.5) { r = 70; g = 130; b = 70; }
          else { r = 150; g = 160; b = 90; }
          bumpVal = 140 + elev * 80;
        }
        else if (elev < 0.6) { r = 130; g = 110; b = 80; bumpVal = 170 + elev * 60; }
        else { r = 205; g = 200; b = 195; bumpVal = 200 + elev * 55; }
        var dust = (n3 - 0.5) * 20;
        r += dust; g += dust; b += dust;
      } else {
        var depth = n1 / 0.52;
        r = 20 + depth * 45;
        g = 70 + depth * 60;
        b = 150 + depth * 40;
        bumpVal = 30;
      }

      var idx = (y * W + x) * 4;
      colI.data[idx] = Math.max(0, Math.min(255, r));
      colI.data[idx + 1] = Math.max(0, Math.min(255, g));
      colI.data[idx + 2] = Math.max(0, Math.min(255, b));
      colI.data[idx + 3] = 255;
      bmpI.data[idx] = bmpI.data[idx + 1] = bmpI.data[idx + 2] = bumpVal;
      bmpI.data[idx + 3] = 255;
    }
  }
  colX.putImageData(colI, 0, 0);
  bmpX.putImageData(bmpI, 0, 0);

  var ct = new THREE.CanvasTexture(colC);
  ct.needsUpdate = true;
  ct.anisotropy = renderer.capabilities.getMaxAnisotropy();
  var bt = new THREE.CanvasTexture(bmpC);
  bt.needsUpdate = true;

  return { color: ct, bump: bt };
}

function genEarthClouds(){
  var W = 1024, H = 512;
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var x = c.getContext('2d');
  var img = x.createImageData(W, H);

  for (var y = 0; y < H; y++){
    for (var px = 0; px < W; px++){
      var u = px / W * 8;
      var v = y / H * 4;
      var n = fbm(u, v, 5);
      var band = 0.5 + 0.5 * Math.sin((y / H) * Math.PI * 8);
      var density = Math.max(0, (n - 0.42) * 3) * (0.6 + band * 0.4);
      var i = (y * W + px) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.min(255, density * 255);
    }
  }
  x.putImageData(img, 0, 0);
  var t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

function genMoon(){
  var W = 1024, H = 512;
  var colC = document.createElement('canvas');
  colC.width = W; colC.height = H;
  var colX = colC.getContext('2d');
  var colI = colX.createImageData(W, H);

  var bmpC = document.createElement('canvas');
  bmpC.width = W; bmpC.height = H;
  var bmpX = bmpC.getContext('2d');
  var bmpI = bmpX.createImageData(W, H);

  for (var y = 0; y < H; y++){
    for (var x = 0; x < W; x++){
      var u = x / W * 5;
      var v = y / H * 3;
      var n1 = fbm(u, v, 4);
      var n2 = fbm(u * 12 + 30, v * 12 + 20, 3);
      var base = 140 + (n1 - 0.5) * 70 + (n2 - 0.5) * 30;
      var i = (y * W + x) * 4;
      colI.data[i] = base;
      colI.data[i + 1] = base;
      colI.data[i + 2] = base + 3;
      colI.data[i + 3] = 255;
      bmpI.data[i] = bmpI.data[i + 1] = bmpI.data[i + 2] = base;
      bmpI.data[i + 3] = 255;
    }
  }
  colX.putImageData(colI, 0, 0);
  bmpX.putImageData(bmpI, 0, 0);

  var maria = [
    {x: 0.25, y: 0.40, rx: 0.10, ry: 0.10},
    {x: 0.55, y: 0.36, rx: 0.09, ry: 0.08},
    {x: 0.72, y: 0.42, rx: 0.08, ry: 0.07},
    {x: 0.40, y: 0.55, rx: 0.06, ry: 0.06},
    {x: 0.62, y: 0.58, rx: 0.06, ry: 0.05},
    {x: 0.15, y: 0.65, rx: 0.05, ry: 0.04}
  ];
  maria.forEach(function(m){
    var cx = m.x * W, cy = m.y * H;
    var rx = m.rx * W, ry = m.ry * H;
    var g = colX.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, 'rgba(70,70,80,0.75)');
    g.addColorStop(0.7, 'rgba(80,80,90,0.4)');
    g.addColorStop(1, 'rgba(80,80,90,0)');
    colX.fillStyle = g;
    colX.beginPath();
    colX.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    colX.fill();

    var gb = bmpX.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    gb.addColorStop(0, 'rgba(110,110,110,0.8)');
    gb.addColorStop(1, 'rgba(140,140,140,0)');
    bmpX.fillStyle = gb;
    bmpX.beginPath();
    bmpX.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    bmpX.fill();
  });

  for (var k = 0; k < 280; k++){
    var cx0 = Math.random() * W;
    var cy0 = Math.random() * H;
    var r0 = Math.pow(Math.random(), 2.5) * 24 + 2;

    var rim = colX.createRadialGradient(cx0, cy0, r0 * 0.8, cx0, cy0, r0 * 1.35);
    rim.addColorStop(0, 'rgba(200,200,210,0.35)');
    rim.addColorStop(1, 'rgba(200,200,210,0)');
    colX.fillStyle = rim;
    colX.beginPath();
    colX.arc(cx0, cy0, r0 * 1.35, 0, Math.PI * 2);
    colX.fill();

    var int = colX.createRadialGradient(cx0 - r0 * 0.15, cy0 - r0 * 0.15, 0, cx0, cy0, r0);
    int.addColorStop(0, 'rgba(60,60,70,0.9)');
    int.addColorStop(1, 'rgba(100,100,110,0.5)');
    colX.fillStyle = int;
    colX.beginPath();
    colX.arc(cx0, cy0, r0, 0, Math.PI * 2);
    colX.fill();

    var br = bmpX.createRadialGradient(cx0, cy0, r0 * 0.8, cx0, cy0, r0 * 1.3);
    br.addColorStop(0, 'rgba(200,200,200,0.4)');
    br.addColorStop(1, 'rgba(140,140,140,0)');
    bmpX.fillStyle = br;
    bmpX.beginPath();
    bmpX.arc(cx0, cy0, r0 * 1.3, 0, Math.PI * 2);
    bmpX.fill();

    var bi = bmpX.createRadialGradient(cx0, cy0, 0, cx0, cy0, r0);
    bi.addColorStop(0, 'rgba(30,30,30,0.9)');
    bi.addColorStop(1, 'rgba(90,90,90,0.4)');
    bmpX.fillStyle = bi;
    bmpX.beginPath();
    bmpX.arc(cx0, cy0, r0, 0, Math.PI * 2);
    bmpX.fill();
  }

  var ct = new THREE.CanvasTexture(colC);
  ct.needsUpdate = true;
  ct.anisotropy = renderer.capabilities.getMaxAnisotropy();
  var bt = new THREE.CanvasTexture(bmpC);
  bt.needsUpdate = true;
  return { color: ct, bump: bt };
}

function genMars(){
  var W = 1024, H = 512;
  var colC = document.createElement('canvas');
  colC.width = W; colC.height = H;
  var colX = colC.getContext('2d');
  var colI = colX.createImageData(W, H);

  var bmpC = document.createElement('canvas');
  bmpC.width = W; bmpC.height = H;
  var bmpX = bmpC.getContext('2d');
  var bmpI = bmpX.createImageData(W, H);

  for (var y = 0; y < H; y++){
    for (var x = 0; x < W; x++){
      var u = x / W * 5;
      var v = y / H * 3;
      var n1 = fbm(u, v, 5);
      var n2 = fbm(u * 10 + 40, v * 10 + 30, 3);
      var n3 = fbm(u * 25 + 80, v * 25 + 60, 2);

      var latDist = Math.abs(y / H - 0.5) * 2;
      var isIce = latDist > 0.92 + (n1 - 0.5) * 0.03;

      var r, g, b, bumpVal;
      if (isIce) {
        r = 235; g = 238; b = 240;
        bumpVal = 210;
      } else {
        var base = 0.5 + (n1 - 0.5) * 0.8;
        r = 180 + base * 40 + n2 * 25 + n3 * 10;
        g = 90 + base * 35 + n2 * 20 + n3 * 10;
        b = 55 + base * 25 + n2 * 15 + n3 * 5;
        if (n1 < 0.4) {
          var d = (0.4 - n1) / 0.4;
          r -= d * 60; g -= d * 40; b -= d * 25;
        }
        if (n2 > 0.65) {
          var l = (n2 - 0.65) / 0.35;
          r += l * 40; g += l * 25; b += l * 15;
        }
        bumpVal = 100 + base * 100;
      }

      var i = (y * W + x) * 4;
      colI.data[i] = Math.max(0, Math.min(255, r));
      colI.data[i + 1] = Math.max(0, Math.min(255, g));
      colI.data[i + 2] = Math.max(0, Math.min(255, b));
      colI.data[i + 3] = 255;
      bmpI.data[i] = bmpI.data[i + 1] = bmpI.data[i + 2] = Math.max(0, Math.min(255, bumpVal));
      bmpI.data[i + 3] = 255;
    }
  }
  colX.putImageData(colI, 0, 0);
  bmpX.putImageData(bmpI, 0, 0);

  for (var k = 0; k < 180; k++){
    var cx0 = Math.random() * W;
    var cy0 = Math.random() * H;
    var r0 = Math.pow(Math.random(), 2.5) * 18 + 1.5;

    var rim = colX.createRadialGradient(cx0, cy0, r0 * 0.8, cx0, cy0, r0 * 1.3);
    rim.addColorStop(0, 'rgba(230,180,140,0.3)');
    rim.addColorStop(1, 'rgba(230,180,140,0)');
    colX.fillStyle = rim;
    colX.beginPath();
    colX.arc(cx0, cy0, r0 * 1.3, 0, Math.PI * 2);
    colX.fill();

    var int = colX.createRadialGradient(cx0, cy0, 0, cx0, cy0, r0);
    int.addColorStop(0, 'rgba(100,50,30,0.7)');
    int.addColorStop(1, 'rgba(150,80,50,0.3)');
    colX.fillStyle = int;
    colX.beginPath();
    colX.arc(cx0, cy0, r0, 0, Math.PI * 2);
    colX.fill();

    var bi = bmpX.createRadialGradient(cx0, cy0, 0, cx0, cy0, r0);
    bi.addColorStop(0, 'rgba(40,40,40,0.9)');
    bi.addColorStop(1, 'rgba(100,100,100,0.3)');
    bmpX.fillStyle = bi;
    bmpX.beginPath();
    bmpX.arc(cx0, cy0, r0, 0, Math.PI * 2);
    bmpX.fill();
  }

  var ct = new THREE.CanvasTexture(colC);
  ct.needsUpdate = true;
  ct.anisotropy = renderer.capabilities.getMaxAnisotropy();
  var bt = new THREE.CanvasTexture(bmpC);
  bt.needsUpdate = true;
  return { color: ct, bump: bt };
}

log('generating Earth, Moon, Mars textures…');
var tStart = performance.now();
var earthTex = genEarth();
var cloudsTex = genEarthClouds();
var moonTex = genMoon();
var marsTex = genMars();
log('textures generated in', Math.round(performance.now() - tStart) + 'ms');

/* ========================================================================== */
/*  PLANETS                                                                   */
/* ========================================================================== */

var PLANETS = {};

PLANETS.earth = new THREE.Mesh(
  new THREE.SphereGeometry(6, 96, 96),
  new THREE.MeshStandardMaterial({
    map: earthTex.color,
    bumpMap: earthTex.bump,
    bumpScale: 0.4,
    roughness: 0.85,
    metalness: 0.05
  })
);
scene.add(PLANETS.earth);

PLANETS.clouds = new THREE.Mesh(
  new THREE.SphereGeometry(6.06, 64, 64),
  new THREE.MeshStandardMaterial({
    map: cloudsTex,
    transparent: true,
    opacity: 0.85,
    roughness: 1,
    metalness: 0,
    depthWrite: false
  })
);
scene.add(PLANETS.clouds);

/* Earth atmosphere — front-side additive blue halo. */
PLANETS.earthAtmo = new THREE.Mesh(
  new THREE.SphereGeometry(6.55, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0x88bbff,
    transparent: true,
    opacity: 0.14,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
scene.add(PLANETS.earthAtmo);

PLANETS.moon = new THREE.Mesh(
  new THREE.SphereGeometry(2.2, 96, 96),
  new THREE.MeshStandardMaterial({
    map: moonTex.color,
    bumpMap: moonTex.bump,
    bumpScale: 0.6,
    roughness: 1,
    metalness: 0
  })
);
PLANETS.moon.position.set(28, 4, -8);
scene.add(PLANETS.moon);

PLANETS.mars = new THREE.Mesh(
  new THREE.SphereGeometry(3.4, 96, 96),
  new THREE.MeshStandardMaterial({
    map: marsTex.color,
    bumpMap: marsTex.bump,
    bumpScale: 0.5,
    roughness: 0.95,
    metalness: 0
  })
);
PLANETS.mars.position.set(120, -6, -70);
scene.add(PLANETS.mars);

/* Mars atmosphere — subtle rust halo. */
PLANETS.marsAtmo = new THREE.Mesh(
  new THREE.SphereGeometry(3.65, 48, 48),
  new THREE.MeshBasicMaterial({
    color: 0xffaa77,
    transparent: true,
    opacity: 0.10,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
PLANETS.marsAtmo.position.copy(PLANETS.mars.position);
scene.add(PLANETS.marsAtmo);

/* ========================================================================== */
/*  SHIP — detailed                                                           */
/* ========================================================================== */

var ship = new THREE.Group();

(function(){
  var geo = new THREE.CylinderGeometry(0.24, 0.32, 1.4, 14);
  geo.rotateX(Math.PI / 2);
  ship.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xe8ecf4, roughness: 0.32, metalness: 0.72
  })));
})();

(function(){
  var geo = new THREE.ConeGeometry(0.24, 0.55, 14);
  geo.rotateX(Math.PI / 2);
  var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xff7a3c, roughness: 0.42, metalness: 0.55
  }));
  m.position.z = 0.975;
  ship.add(m);
})();

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

[-1, 1].forEach(function(s){
  var m = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.08, 0.35),
    new THREE.MeshBasicMaterial({ color: 0xffe0b0 })
  );
  m.position.set(s * 0.27, 0.06, 0.05);
  ship.add(m);
});

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

  var tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    new THREE.MeshBasicMaterial({ color: s > 0 ? 0xff3030 : 0x30ff30 })
  );
  tip.position.set(s * 0.85, 0.02, -0.02);
  ship.add(tip);
});

[-0.18, 0.18].forEach(function(x){
  var engine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 0.35, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.55, metalness: 0.4 })
  );
  engine.rotation.x = Math.PI / 2;
  engine.position.set(x, -0.04, -0.78);
  ship.add(engine);

  var ex = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.5, 12),
    new THREE.MeshBasicMaterial({ color: 0xff7a3c, transparent: true, opacity: 0.9 })
  );
  ex.rotation.x = -Math.PI / 2;
  ex.position.set(x, -0.04, -1.15);
  ship.add(ex);

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

(function(){
  var m = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.36, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xd0d6e0, roughness: 0.42, metalness: 0.6 })
  );
  m.position.set(0, 0.26, -0.5);
  ship.add(m);
})();

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

/* ========================================================================== */
/*  TRAIL PARTICLES                                                           */
/* ========================================================================== */

var trailPool = [];
(function(){
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

/* ========================================================================== */
/*  ARTIFACTS + APPROACH POSITIONS                                            */
/* ========================================================================== */

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
  var radius = a.planet === 'moon' ? 2.2 : 3.4;
  var wp = latLon(a.lat, a.lon, radius + 0.1).add(planet.position);
  a.world = wp;

  var m = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x58d6f1 })
  );
  m.position.copy(wp);
  markerGroup.add(m);

  var ring = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.34, 24),
    new THREE.MeshBasicMaterial({
      color: 0x58d6f1, transparent: true, opacity: 0.55,
      side: THREE.DoubleSide, depthWrite: false
    })
  );
  ring.position.copy(wp);
  ring.lookAt(planet.position);
  ring.userData.pulse = true;
  markerGroup.add(ring);

  /* Approach positions along the outward normal — prevents ship going underground. */
  var normal = wp.clone().sub(planet.position).normalize();
  var tangent = new THREE.Vector3(1, 0, 0);
  if (Math.abs(normal.dot(tangent)) > 0.9) tangent = new THREE.Vector3(0, 1, 0);
  tangent.cross(normal).normalize();

  a.shipPos = wp.clone().add(normal.clone().multiplyScalar(2.5));
  a.camPos = wp.clone()
    .add(normal.clone().multiplyScalar(5))
    .add(tangent.clone().multiplyScalar(2))
    .add(new THREE.Vector3(0, 1.2, 0));
});

/* ========================================================================== */
/*  BEATS                                                                     */
/* ========================================================================== */

var BEATS = [];
var prevShip = new THREE.Vector3(14, 5, -2);
var prevCam  = new THREE.Vector3(15, 6, 3);
var prevLook = new THREE.Vector3(20, 4, -5);

BEATS.push({
  name: 'Launch', sub: 'Departing Earth orbit', dur: 3500, artifact: null,
  shipA: [0, 4, 16], shipB: [0, 4, 12],
  camA: [0, 5, 22], camB: [0, 5, 20],
  look: [0, 0, 0],
  dest: 'EARTH', dist: 'Home'
});
prevShip.set(0, 4, 12);
prevCam.set(0, 5, 20);

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
prevShip.set(marsFirst.shipPos.x - 30, marsFirst.shipPos.y + 2, marsFirst.shipPos.z - 20);
prevCam.set(marsFirst.camPos.x - 30, marsFirst.camPos.y + 3, marsFirst.camPos.z - 20);
prevLook.copy(marsFirst.world);

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

/* ========================================================================== */
/*  STATE                                                                     */
/* ========================================================================== */

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
  if (J.state !== s) { log('state:', J.state, '→', s); J.state = s; }
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

/* ========================================================================== */
/*  BEAT + CARD                                                               */
/* ========================================================================== */

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
  J.shipRest.copy(ship.position);
  after(CONFIG.cardReadTime, function(){
    if (J.state === 'card') openArtifactPage(idx);
  });
}

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
  if (nb) { nb.textContent = 'Return home'; nb.onclick = function(){ window.Journey.stop(); }; }
  var op = document.getElementById('j3-open-page');
  if (op) op.style.display = 'none';

  var card = document.getElementById('j3-card');
  if (card) card.classList.add('on');
  setStatus('');

  after(CONFIG.completeDwell, function(){
    if (J.state === 'complete') window.Journey.stop();
  });
}

/* ========================================================================== */
/*  BUTTONS                                                                   */
/* ========================================================================== */

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
    var a = ARTIFACTS[b.artifact];
    clearTimers();
    var names = ['openFile', 'openArtifact', 'openItem', 'showFile', 'navigateTo'];
    var worked = false;
    for (var i = 0; i < names.length; i++) {
      if (typeof window[names[i]] === 'function') {
        try { window[names[i]](a.id); worked = true; break; } catch (e) {}
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
    else advanceToNext();
  };
}

document.addEventListener('keydown', function(e){
  var ov = document.getElementById('j3-overlay');
  if (!ov || !ov.classList.contains('on')) return;
  if (e.key === 'Escape') { window.Journey.stop(); }
  else if (e.key === 'ArrowRight') { if (skipBtn) skipBtn.click(); }
});

/* ========================================================================== */
/*  SAFETY — push ship/camera out of planets if they clip in                  */
/* ========================================================================== */

function keepOutside(obj, pad){
  ['earth', 'moon', 'mars'].forEach(function(name){
    var planet = PLANETS[name];
    if (!planet) return;
    var baseRadius = planet.geometry.parameters.radius;
    var safeRadius = baseRadius + pad;
    var d = obj.position.distanceTo(planet.position);
    if (d < safeRadius) {
      var out = obj.position.clone().sub(planet.position).normalize();
      if (out.length() < 0.001) out.set(0, 1, 0);
      obj.position.copy(planet.position).add(out.multiplyScalar(safeRadius));
    }
  });
}

/* ========================================================================== */
/*  ANIMATION LOOP                                                            */
/* ========================================================================== */

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

        if (p > 0.05 && p < 0.95) {
          var behind = ship.position.clone();
          var back = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
          behind.add(back.multiplyScalar(1.4));
          spawnTrail(behind);
        }

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
      var t = now * 0.001;
      ship.position.copy(J.shipRest);
      ship.position.y += Math.sin(t * 1.8) * 0.12;
      ship.rotation.z = Math.sin(t * 0.9) * 0.09;
      keepOutside(ship, 0.4);
    }
  }

  updateTrail(dt);

  PLANETS.earth.rotation.y += 0.0008;
  PLANETS.clouds.rotation.y += 0.0012;
  PLANETS.moon.rotation.y += 0.0005;
  PLANETS.mars.rotation.y += 0.0004;

  ship.children.forEach(function(c){
    if (c.userData.beacon) {
      c.material.color.setHex(Math.sin(now * 0.006) > 0 ? 0xff3030 : 0x440000);
    }
  });

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

/* ========================================================================== */
/*  PUBLIC API                                                                */
/* ========================================================================== */

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
