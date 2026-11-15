/* journey.js — 3D cinematic tour for Galactic Field Guide
   Adds a full-screen 3D journey overlay. The Tour button launches it.
   Per relic: fly to it → show info card → auto-open its page → auto-show 3D
   lab → continue to next relic. User can pause, skip, or end anytime.
   Uses Three.js r128 (already loaded by the site) + jsDelivr textures. */

(function(){
'use strict';

function boot(){
  if (typeof window.openFile !== 'function' || !window.LAB) { setTimeout(boot, 300); return; }
  if (document.getElementById('j3-overlay')) return;
  build();
}

function build(){

/* ---------- CSS ---------- */
var css = document.createElement('style');
css.textContent = [
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
  '.j3-cont{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);z-index:9999;background:linear-gradient(180deg,#ff78b1,#ff5a9f);color:#fff;border:0;padding:14px 26px;border-radius:10px;font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:500;cursor:pointer;box-shadow:0 20px 40px rgba(255,95,162,.4);opacity:0;pointer-events:none;transition:opacity .3s,transform .3s}',
  '.j3-cont.on{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}',
  '.j3-cont:hover{box-shadow:0 24px 48px rgba(255,95,162,.6)}',
  '@media(max-width:640px){.j3-top{padding:14px}.j3-bottom{padding:12px 14px 16px}.j3-card{top:auto;bottom:140px;right:14px;left:14px;width:auto;transform:translateY(20px)}.j3-card.on{transform:translateY(0)}.j3-cont{bottom:calc(80px + env(safe-area-inset-bottom,0px))}}'
].join('');
document.head.appendChild(css);

/* ---------- HTML ---------- */
var ov = document.createElement('div');
ov.id = 'j3-overlay';
ov.innerHTML = '<canvas id="j3-cv"></canvas>' +
  '<div class="j3-hud">' +
    '<div class="j3-top"><div class="j3-brand">Galactic <em>Journey</em><small>3D Tour</small></div>' +
    '<div class="j3-dest"><b id="j3-dest">Earth</b><span id="j3-dist">Orbit</span></div></div>' +
    '<div class="j3-card" id="j3-card">' +
      '<div class="j3-label" id="j3-clab"></div>' +
      '<h3 id="j3-cname"></h3>' +
      '<div class="j3-loc" id="j3-cloc"></div>' +
      '<p id="j3-cbody"></p>' +
      '<button class="j3-next" id="j3-next-art">Visit this relic →</button>' +
    '</div>' +
    '<div class="j3-bottom"><div class="j3-progress"><i id="j3-prog"></i></div>' +
    '<div class="j3-meta"><div class="j3-phase" id="j3-phase">Launch<small id="j3-sub">Departing Earth</small></div>' +
    '<div class="j3-ctrl"><button id="j3-end">End journey</button><button id="j3-pause">Pause</button></div></div></div>' +
  '</div>';
document.body.appendChild(ov);

/* ---------- Three.js scene ---------- */
var canvas = document.getElementById('j3-cv');
var renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05080f, 1);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 5000);

var sunLight = new THREE.DirectionalLight(0xfff0d0, 2.4);
sunLight.position.set(150, 80, 100);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x2a3550, 0.6));

var sunSphere = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 32),
  new THREE.MeshBasicMaterial({color: 0xfff0b0}));
sunSphere.position.copy(sunLight.position).multiplyScalar(2);
scene.add(sunSphere);

/* stars */
(function(){
  var g = new THREE.BufferGeometry();
  var N = 4000, pos = new Float32Array(N*3);
  for (var i=0;i<N;i++){
    var r = 1000 + Math.random()*800;
    var t = Math.random()*Math.PI*2, p = Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(p)*Math.cos(t);
    pos[i*3+1]=r*Math.sin(p)*Math.sin(t);
    pos[i*3+2]=r*Math.cos(p);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({color:0xffffff,size:0.9,transparent:true,opacity:0.85,sizeAttenuation:true})));
})();

/* textures — try real NASA/threejs images, fall back to color */
var texLoader = new THREE.TextureLoader();
texLoader.crossOrigin = 'anonymous';
function tryLoad(urls, cb){
  var i=0;
  (function next(){
    if (i>=urls.length) { cb(null); return; }
    texLoader.load(urls[i], function(t){ cb(t); }, undefined, function(){ i++; next(); });
  })();
}

/* Mars procedural fallback (no reliable CDN) */
function marsProcTex(){
  var c = document.createElement('canvas'); c.width = c.height = 1024;
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0,0,0,1024);
  g.addColorStop(0,'#8a3a1f'); g.addColorStop(.5,'#b8502a'); g.addColorStop(1,'#8a3a1f');
  x.fillStyle=g; x.fillRect(0,0,1024,1024);
  for (var i=0;i<400;i++){
    var y = Math.random()*1024;
    x.fillStyle='rgba(90,40,15,'+(0.15+Math.random()*0.35)+')';
    x.beginPath(); x.moveTo(0, y);
    for (var px=0; px<=1024; px+=20) x.lineTo(px, y + Math.sin(px*0.02)*12 + Math.random()*6);
    x.lineTo(1024, y+1024); x.lineTo(0, y+1024); x.fill();
  }
  for (var j=0;j<2000;j++){
    x.fillStyle='rgba(255,240,220,'+(Math.random()*0.1)+')';
    x.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
  }
  x.fillStyle='rgba(255,255,255,0.7)';
  x.fillRect(0,0,1024,50); x.fillRect(0,974,1024,50);
  var t = new THREE.CanvasTexture(c); t.needsUpdate = true;
  return t;
}

/* planets */
var PLANETS = {};

PLANETS.earth = new THREE.Mesh(
  new THREE.SphereGeometry(6, 64, 64),
  new THREE.MeshStandardMaterial({color:0x2a5a80, roughness:0.9, metalness:0.05})
);
PLANETS.earth.position.set(0, 0, 0);
scene.add(PLANETS.earth);

var earthGlow = new THREE.Mesh(
  new THREE.SphereGeometry(6.35, 48, 48),
  new THREE.MeshBasicMaterial({color:0x4a9eff, transparent:true, opacity:0.22, side:THREE.BackSide})
);
earthGlow.position.copy(PLANETS.earth.position);
scene.add(earthGlow);

PLANETS.clouds = new THREE.Mesh(
  new THREE.SphereGeometry(6.06, 64, 64),
  new THREE.MeshStandardMaterial({color:0xffffff, transparent:true, opacity:0.35, roughness:1})
);
PLANETS.clouds.position.copy(PLANETS.earth.position);
scene.add(PLANETS.clouds);

PLANETS.moon = new THREE.Mesh(
  new THREE.SphereGeometry(1.7, 48, 48),
  new THREE.MeshStandardMaterial({color:0x8a8a92, roughness:1, metalness:0})
);
PLANETS.moon.position.set(28, 4, -8);
scene.add(PLANETS.moon);

PLANETS.mars = new THREE.Mesh(
  new THREE.SphereGeometry(3.4, 48, 48),
  new THREE.MeshStandardMaterial({map: marsProcTex(), roughness:0.95, metalness:0})
);
PLANETS.mars.position.set(120, -6, -70);
scene.add(PLANETS.mars);

/* Load real textures async */
tryLoad([
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/earth_atmos_2048.jpg',
  'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
], function(t){
  if (t) { PLANETS.earth.material.map = t; PLANETS.earth.material.color.set(0xffffff); PLANETS.earth.material.needsUpdate = true; }
});
tryLoad([
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/moon_1024.jpg',
  'https://threejs.org/examples/textures/planets/moon_1024.jpg'
], function(t){
  if (t) { PLANETS.moon.material.map = t; PLANETS.moon.material.color.set(0xffffff); PLANETS.moon.material.needsUpdate = true; }
});

/* ship */
var ship = new THREE.Group();
ship.add(new THREE.Mesh(
  new THREE.ConeGeometry(0.32, 1.6, 16),
  new THREE.MeshStandardMaterial({color:0xe8ecf4, roughness:0.3, metalness:0.75})
).rotateX(Math.PI/2));
var cockpit = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 16, 16),
  new THREE.MeshStandardMaterial({color:0x58d6f1, roughness:0.05, metalness:0.9, emissive:0x0a3050})
);
cockpit.position.set(0, 0.14, 0.5);
ship.add(cockpit);
[-1,1].forEach(function(s){
  var w = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.45),
    new THREE.MeshStandardMaterial({color:0xd0d6e0, roughness:0.4, metalness:0.6}));
  w.position.set(s*0.32, -0.02, 0.05);
  w.rotation.z = s*0.12;
  ship.add(w);
});
[-0.16,0.16].forEach(function(x){
  var e = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.28, 12),
    new THREE.MeshStandardMaterial({color:0x1a1f2e, roughness:0.6, metalness:0.3}));
  e.rotation.x = Math.PI/2; e.position.set(x, -0.02, -0.72); ship.add(e);
  var ex = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 10),
    new THREE.MeshBasicMaterial({color:0xff7a3c, transparent:true, opacity:0.85}));
  ex.rotation.x = -Math.PI/2; ex.position.set(x, -0.02, -1); ship.add(ex);
});
scene.add(ship);

/* artifacts */
var ARTIFACTS = [
  {id:'a15',name:'Moon Buggy',planet:'moon',label:'Apollo 15 · 1971',loc:'Hadley Rille · 26.1°N, 3.6°E',lat:26.13,lon:3.63,
   body:'A folding electric car that drove 17.3 miles across the Moon. Still parked at Hadley, still reflecting lasers back to Earth.'},
  {id:'s3',name:'Surveyor 3',planet:'moon',label:'Robot lander · 1967',loc:'Ocean of Storms · 3.0°S, 23.4°W',lat:-3.01,lon:-23.42,
   body:'A robot that bounced twice, dug trenches, and waited alone for 31 months until Apollo 12 astronauts walked over to visit.'},
  {id:'a12',name:'Intrepid',planet:'moon',label:'Apollo 12 · 1969',loc:'Ocean of Storms · 3.1°S, 23.5°W',lat:-3.1,lon:-23.5,
   body:'The first pinpoint lunar landing, a bullseye next to Surveyor 3. Its bottom half stayed behind as a launch pad.'},
  {id:'a11',name:'Eagle',planet:'moon',label:'Apollo 11 · 1969',loc:'Tranquility Base · 0.7°N, 23.5°E',lat:0.67,lon:23.47,
   body:'The lunar module that delivered Neil Armstrong and Buzz Aldrin to the surface. The landing stage still rests at Tranquility Base.'},
  {id:'pv',name:'Perseverance',planet:'mars',label:'Mars rover · 2021',loc:'Jezero Crater · 18.4°N, 77.6°E',lat:18.4,lon:77.6,
   body:'A car-sized rover collecting rock cores in the floor of Jezero Crater. It has found signs that a lake once filled this basin.'},
  {id:'ig',name:'Ingenuity',planet:'mars',label:'Mars helicopter · 2021',loc:'Jezero Crater · 18.4°N, 77.5°E',lat:18.44,lon:77.45,
   body:'A four-pound helicopter built for five flights. It flew seventy-two times before a rotor broke on its final landing.'},
  {id:'jz',name:'Three Forks',planet:'mars',label:'Sample depot · 2023',loc:'Jezero Crater · 18.6°N, 77.4°E',lat:18.55,lon:77.38,
   body:'Ten sealed titanium tubes of Mars rock, waiting on the ground for a ride home that is not yet funded.'}
];

function latLon(lat, lon, r){
  var phi = (90-lat)*Math.PI/180, theta = (lon+180)*Math.PI/180;
  return new THREE.Vector3(
    -r*Math.sin(phi)*Math.cos(theta),
     r*Math.cos(phi),
     r*Math.sin(phi)*Math.sin(theta)
  );
}

var markerGroup = new THREE.Group();
scene.add(markerGroup);

ARTIFACTS.forEach(function(a){
  var planet = PLANETS[a.planet];
  var r = a.planet === 'moon' ? 1.7 : 3.4;
  var worldPos = latLon(a.lat, a.lon, r + 0.1).add(planet.position);
  var m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16),
    new THREE.MeshBasicMaterial({color:0x58d6f1}));
  m.position.copy(worldPos);
  m.userData.artifact = a;
  markerGroup.add(m);
  var ring = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 24),
    new THREE.MeshBasicMaterial({color:0x58d6f1, transparent:true, opacity:0.55, side:THREE.DoubleSide}));
  ring.position.copy(worldPos);
  ring.lookAt(planet.position);
  ring.userData.pulse = true;
  markerGroup.add(ring);
  a.world = worldPos;
  a.marker = m;
});

/* beats */
function posOf(i){ return ARTIFACTS[i].world.clone(); }
function vel(fromArr, toArr){ return fromArr.map(function(v,i){ return v*1.04; }); }

var BEATS = [];
BEATS.push({name:'Launch', sub:'Departing Earth orbit', dur:3500, artifact:null,
  shipA:[0,4,16], shipB:[0,4,12], camA:[0,5,22], camB:[0,5,20], look:[0,0,0],
  dest:'EARTH', dist:'Home'});
BEATS.push({name:'Moon transit', sub:'3 days · 386,000 km', dur:4500, artifact:null,
  shipA:[0,4,12], shipB:[14,5,-2], camA:[0,5,20], camB:[15,6,3], look:[20,4,-5],
  dest:'MOON', dist:'384,000 km away'});

[0,1,2,3].forEach(function(i){
  var a = ARTIFACTS[i];
  var prev = i===0 ? [14,5,-2] : posOf(i-1).add(new THREE.Vector3(0.8,0.8,1)).toArray();
  BEATS.push({name:a.name, sub:a.label, dur:3500, artifact:i,
    shipA:prev, shipB:posOf(i).add(new THREE.Vector3(0,0.5,1)).toArray(),
    camA:vel(prev,[0,0,0]),
    camB:posOf(i).add(new THREE.Vector3(1.5,1.2,1.8)).toArray(),
    look:posOf(i).toArray(),
    dest:a.planet.toUpperCase(), dist:a.loc});
});

BEATS.push({name:'Mars transit', sub:'7 months · 225M km', dur:5500, artifact:null,
  shipA:posOf(3).add(new THREE.Vector3(0,0.5,1)).toArray(),
  shipB:[70,2,-30],
  camA:posOf(3).add(new THREE.Vector3(1.5,1.2,1.8)).toArray(),
  camB:[72,3,-25], look:[120,-6,-70],
  dest:'MARS', dist:'225M km away'});

[4,5,6].forEach(function(i){
  var a = ARTIFACTS[i];
  var prev = i===4 ? [70,2,-30] : posOf(i-1).add(new THREE.Vector3(0.8,0.8,1)).toArray();
  BEATS.push({name:a.name, sub:a.label, dur:3500, artifact:i,
    shipA:prev, shipB:posOf(i).add(new THREE.Vector3(0,0.5,1)).toArray(),
    camA:vel(prev,[0,0,0]),
    camB:posOf(i).add(new THREE.Vector3(2,1.5,2.2)).toArray(),
    look:posOf(i).toArray(),
    dest:a.planet.toUpperCase(), dist:a.loc});
});

/* state */
var J = {state:'idle', beat:0, beatStart:0, paused:false, timers:[]};
function clearTimers(){ J.timers.forEach(clearTimeout); J.timers = []; }
function after(ms, fn){
  return setTimeout(function(){
    if (J.paused) { after(300, fn); return; }
    fn();
  }, ms);
}
function easeInOut(t){ return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
function lerp(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }

function setBeat(i){
  J.beat = Math.max(0, Math.min(BEATS.length-1, i));
  J.beatStart = performance.now();
  var b = BEATS[J.beat];
  document.getElementById('j3-phase').textContent = b.name;
  document.getElementById('j3-sub').textContent = b.sub;
  document.getElementById('j3-dest').textContent = b.dest || '—';
  document.getElementById('j3-dist').textContent = b.dist || '';
  document.getElementById('j3-prog').style.width = ((J.beat)/(BEATS.length-1)*100)+'%';
  document.getElementById('j3-card').classList.remove('on');

  if (b.artifact != null) {
    after(b.dur + 200, function(){
      if (J.state !== 'flying' && J.state !== 'arrival') return;
      var a = ARTIFACTS[b.artifact];
      document.getElementById('j3-clab').textContent = a.label;
      document.getElementById('j3-cname').textContent = a.name;
      document.getElementById('j3-cloc').textContent = a.loc;
      document.getElementById('j3-cbody').textContent = a.body;
      document.getElementById('j3-card').classList.add('on');
      after(3500, function(){
        if (J.state === 'flying' || J.state === 'arrival') showArtifactPage(b.artifact);
      });
    });
  }
}

function showArtifactPage(idx){
  var a = ARTIFACTS[idx];
  J.state = 'page';
  document.getElementById('j3-card').classList.remove('on');
  try { window.openFile(a.id); } catch(e){}
  document.getElementById('j3-overlay').classList.remove('on');
  showContinue('View 3D model →', function(){ showArtifact3D(idx); });
  after(6000, function(){
    if (J.state === 'page' && document.getElementById('file').classList.contains('on')) showArtifact3D(idx);
    else if (J.state === 'page') Journey.stop();
  });
}

function showArtifact3D(idx){
  var a = ARTIFACTS[idx];
  J.state = 'lab';
  hideContinue();
  try {
    window.show('lab');
    if (window.LAB && LAB.craft) LAB.craft(a.id);
    if (window.LAB && LAB.setTab) LAB.setTab('learn');
  } catch(e){}
  showContinue('Next artifact →', advance);
  after(4500, function(){
    if (J.state === 'lab' && document.getElementById('lab').classList.contains('on')) advance();
    else if (J.state === 'lab') Journey.stop();
  });
}

function advance(){
  if (J.state !== 'lab' && J.state !== 'page') return;
  hideContinue();
  J.state = 'flying';
  document.getElementById('j3-overlay').classList.add('on');
  var nb = J.beat + 1;
  if (nb >= BEATS.length) journeyComplete();
  else setBeat(nb);
}

function journeyComplete(){
  J.state = 'complete';
  document.getElementById('j3-clab').textContent = 'Complete';
  document.getElementById('j3-cname').textContent = 'Journey finished';
  document.getElementById('j3-cloc').textContent = '7 machines · 7 stories';
  document.getElementById('j3-cbody').textContent = 'You have visited every relic in the Galactic Field Guide.';
  var nb = document.getElementById('j3-next-art');
  nb.textContent = 'Return home';
  nb.onclick = function(){ Journey.stop(); try { window.show('home'); } catch(e){} };
  document.getElementById('j3-card').classList.add('on');
  after(15000, function(){ if (J.state === 'complete') Journey.stop(); });
}

/* continue button */
var contBtn = document.createElement('button');
contBtn.className = 'j3-cont';
contBtn.type = 'button';
document.body.appendChild(contBtn);
function showContinue(label, fn){ contBtn.textContent = label; contBtn.onclick = fn; contBtn.classList.add('on'); }
function hideContinue(){ contBtn.classList.remove('on'); contBtn.onclick = null; }

/* "Visit this relic" button */
document.getElementById('j3-next-art').onclick = function(){
  var b = BEATS[J.beat];
  if (b.artifact != null) showArtifactPage(b.artifact);
};

/* controls */
document.getElementById('j3-end').onclick = function(){ Journey.stop(); };
document.getElementById('j3-pause').onclick = function(){
  J.paused = !J.paused;
  this.textContent = J.paused ? 'Resume' : 'Pause';
};

/* animation */
function animate(){
  requestAnimationFrame(animate);

  if (!J.paused && (J.state === 'flying' || J.state === 'arrival')) {
    var b = BEATS[J.beat];
    if (b) {
      var p = (performance.now() - J.beatStart) / b.dur;
      if (p >= 1) { if (J.state === 'flying') J.state = 'arrival'; p = 1; }
      var e = easeInOut(p);

      var sp = lerp(b.shipA, b.shipB, e);
      ship.position.set(sp[0], sp[1], sp[2]);
      var next = lerp(b.shipA, b.shipB, Math.min(1, e + 0.05));
      var dir = new THREE.Vector3(next[0]-sp[0], next[1]-sp[1], next[2]-sp[2]);
      if (dir.length() > 0.05) ship.lookAt(ship.position.clone().add(dir));

      var cp = lerp(b.camA, b.camB, e);
      camera.position.lerp(new THREE.Vector3(cp[0],cp[1],cp[2]), 0.06);
      camera.lookAt(b.look[0], b.look[1], b.look[2]);

      if (p >= 1 && b.artifact == null) {
        after(500, function(){
          if (J.state === 'flying' && J.beat < BEATS.length - 1) setBeat(J.beat + 1);
        });
      }
    }
  }

  PLANETS.earth.rotation.y += 0.0008;
  PLANETS.clouds.rotation.y += 0.0012;
  PLANETS.moon.rotation.y += 0.0005;
  PLANETS.mars.rotation.y += 0.0004;

  var now = performance.now();
  markerGroup.children.forEach(function(m){
    if (m.userData.pulse) {
      var s = 1 + Math.sin(now*0.004)*0.18;
      m.scale.set(s, s, 1);
    }
  });

  renderer.render(scene, camera);
}

addEventListener('resize', function(){
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});

/* public API */
var Journey = window.Journey = {
  start: function(){
    J.state = 'flying'; J.beat = 0; J.beatStart = performance.now();
    J.paused = false; clearTimers(); hideContinue();
    document.getElementById('j3-overlay').classList.add('on');
    document.getElementById('j3-pause').textContent = 'Pause';
    var nb = document.getElementById('j3-next-art');
    nb.textContent = 'Visit this relic →';
    nb.onclick = function(){ var b = BEATS[J.beat]; if (b.artifact != null) showArtifactPage(b.artifact); };
    camera.position.set(0, 5, 22); ship.position.set(0, 4, 16);
    setBeat(0);
  },
  stop: function(){
    J.state = 'idle'; clearTimers(); hideContinue();
    document.getElementById('j3-overlay').classList.remove('on');
    document.getElementById('j3-card').classList.remove('on');
  }
};

/* wire all tour buttons */
['fg-tour-btn','gfp-tb','fgtb'].forEach(function(id){
  var b = document.getElementById(id);
  if (b) { b.textContent = '▶ 3D Tour'; b.onclick = function(e){ if(e) e.preventDefault(); Journey.start(); }; }
});
document.querySelectorAll('header button').forEach(function(btn){
  if (/tour/i.test(btn.textContent) && !btn.dataset.j3wired) {
    btn.dataset.j3wired = '1';
    btn.textContent = '▶ 3D Tour';
    btn.onclick = function(e){ e.preventDefault(); Journey.start(); };
  }
});

animate();

}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
