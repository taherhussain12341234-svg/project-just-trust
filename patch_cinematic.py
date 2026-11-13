#!/usr/bin/env python3
"""
Galactic Field Guide - Cinematic Opening Patch
==============================================
Adds a cinematic opening (dark starfield, slowly appearing moon,
"Some explorers never came home. Here is their story.") to index.html
and mobile.html, then transitions to the existing light-theme site.

Usage:
    python3 patch_cinematic.py           # patches . in the current folder
    python3 patch_cinematic.py path/to   # patches the given folder

Writes index.new.html and mobile.new.html next to the originals.
Safe to run multiple times - detects if already patched.
"""

import os
import sys

MARKER = 'data-fg-cinema'

CINEMA_HEAD = r"""
<!-- === FG CINEMATIC INTRO (injected by patch_cinematic.py) === -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@300;400;500&display=swap" rel="stylesheet">
<style id="fg-cinema-css">
#fg-cinema{position:fixed;inset:0;z-index:9999;background:#05080f;overflow:hidden;overflow-y:auto;opacity:1;transition:opacity 1.6s cubic-bezier(.4,0,.2,1);color:#eaf1ff;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;padding:20px 24px calc(32px + env(safe-area-inset-bottom,0px)) 24px;touch-action:manipulation;user-select:none;-webkit-user-select:none;font-family:'Space Grotesk','Plus Jakarta Sans',system-ui,-apple-system,sans-serif}
#fg-cinema.fg-out{opacity:0;pointer-events:none}
#fg-cinema canvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0}
.fg-cin-text{position:relative;z-index:2;max-width:640px;width:100%;display:flex;flex-direction:column;gap:14px;align-items:center;margin-bottom:4px}
.fg-cin-line{opacity:0;transform:translateY(10px);transition:opacity 1.5s cubic-bezier(.22,.9,.3,1),transform 1.5s cubic-bezier(.22,.9,.3,1);will-change:opacity,transform;text-wrap:balance}
.fg-cin-line.on{opacity:1;transform:none}
.fg-cin-eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#58d6f1;display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid rgba(88,214,241,.28);border-radius:999px;background:rgba(15,20,30,.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.fg-cin-eyebrow::before{content:'';width:6px;height:6px;border-radius:50%;background:#58d6f1;box-shadow:0 0 10px #58d6f1;animation:fgPulse 1.6s ease-in-out infinite}
@keyframes fgPulse{50%{opacity:.35;transform:scale(.85)}}
.fg-cin-h1{font-family:'Playfair Display',Georgia,serif;font-weight:400;font-size:clamp(30px,7.4vw,46px);line-height:1.1;color:#fff;letter-spacing:-.01em;text-shadow:0 2px 30px rgba(150,190,255,.28);margin:0}
.fg-cin-h2{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-weight:400;font-size:clamp(20px,4.6vw,28px);line-height:1.25;color:rgba(196,199,202,.92);margin:0}
.fg-cin-body{font-size:clamp(14px,2.4vw,15.5px);line-height:1.6;color:rgba(196,199,202,.78);max-width:440px;font-weight:300;margin:0}
.fg-cin-actions{display:flex;flex-direction:column;gap:8px;width:100%;max-width:400px;align-items:stretch;margin-top:10px}
.fg-cin-begin{appearance:none;border:0;cursor:pointer;padding:15px 24px;border-radius:6px;background:#fff;color:#0f131c;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;letter-spacing:.14em;text-transform:uppercase;font-weight:500;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 0 0 rgba(88,214,241,.5);transition:box-shadow .3s,transform .15s,background .2s}
.fg-cin-begin:hover{box-shadow:0 0 32px rgba(88,214,241,.55)}
.fg-cin-begin:active{transform:scale(.985)}
.fg-cin-begin::after{content:'\2192';font-size:16px;font-family:system-ui,sans-serif;font-weight:400}
.fg-cin-skip{appearance:none;background:transparent;border:0;cursor:pointer;color:rgba(196,199,202,.55);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;padding:10px;transition:color .2s}
.fg-cin-skip:hover{color:rgba(196,199,202,.9)}
@media(min-width:720px){#fg-cinema{justify-content:center;padding:32px}.fg-cin-text{margin-bottom:0}}
@media(prefers-reduced-motion:reduce){.fg-cin-line{transition:none!important;opacity:1!important;transform:none!important}#fg-cinema{transition:opacity .4s!important}.fg-cin-eyebrow::before{animation:none!important}}
</style>
<noscript><style>#fg-cinema .fg-cin-line{opacity:1!important;transform:none!important}#fg-cinema{background:radial-gradient(circle at 50% 30%, #1a2740 0%, #05080f 70%)}#fg-cin-begin,#fg-cin-skip{display:none}</style></noscript>
<!-- === /FG CINEMATIC INTRO HEAD === -->
"""

CINEMA_BODY = r"""
<!-- === FG CINEMATIC INTRO (injected by patch_cinematic.py) === -->
<div id="fg-cinema" data-fg-cinema role="dialog" aria-label="Welcome to the Galactic Field Guide">
  <canvas id="fg-cin-canvas"></canvas>
  <div class="fg-cin-text">
    <div class="fg-cin-line fg-cin-eyebrow" data-fg-step="0">Expedition Archive &middot; Signal Record 049</div>
    <h1 class="fg-cin-line fg-cin-h1" data-fg-step="1">Some explorers never came home.</h1>
    <h2 class="fg-cin-line fg-cin-h2" data-fg-step="2">Here is their story.</h2>
    <p class="fg-cin-line fg-cin-body" data-fg-step="3">Across the quiet vacuum between worlds, lost beacons still pulse their final coordinates into the perpetual dark. Seven machines. Seven unfinished stories. Waiting for you to find them.</p>
    <div class="fg-cin-actions fg-cin-line" data-fg-step="4">
      <button class="fg-cin-begin" id="fg-cin-begin" type="button">Begin the mission</button>
      <button class="fg-cin-skip" id="fg-cin-skip" type="button">Skip intro</button>
    </div>
  </div>
</div>
<script>
(function(){
'use strict';
var root = document.getElementById('fg-cinema');
if (!root) return;

// -- Session + query flag handling ---------------------------------
var SKIP_KEY = 'fgCinema';
var search   = location.search || '';
var forceOn  = /[?&]cinema=1(?:&|$)/.test(search);
var forceOff = /[?&]cinema=0(?:&|$)/.test(search);

try {
  if (forceOff || (sessionStorage.getItem(SKIP_KEY) === '1' && !forceOn)) {
    if (root.parentNode) root.parentNode.removeChild(root);
    return;
  }
} catch (e) {}

// -- Suppress any legacy intros so they don't stack ----------------
function killLegacyIntros(){
  try {
    var old = document.querySelectorAll('.gfp-intro, .fgo:not(#fg-cinema)');
    for (var i = 0; i < old.length; i++) {
      if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    }
  } catch (e) {}
}
killLegacyIntros();
// Also mark session so patch.py / field-guide-plus.js skip their intros
try {
  sessionStorage.setItem('gfp', '1');
  sessionStorage.setItem('fgSeen', '1');
} catch (e) {}

var canvas   = document.getElementById('fg-cin-canvas');
var beginBtn = document.getElementById('fg-cin-begin');
var skipBtn  = document.getElementById('fg-cin-skip');
var steps    = root.querySelectorAll('.fg-cin-line');
var reduced  = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var dismissed = false;

// -- Dismiss handler ----------------------------------------------
function dismiss(animate){
  if (dismissed) return;
  dismissed = true;
  try {
    sessionStorage.setItem(SKIP_KEY, '1');
    sessionStorage.setItem('gfp', '1');
    sessionStorage.setItem('fgSeen', '1');
  } catch (e) {}
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  var wait = animate && !reduced ? 1600 : 800;
  if (!animate || reduced) {
    if (root.parentNode) root.parentNode.removeChild(root);
    return;
  }
  root.classList.add('fg-out');
  setTimeout(function(){ if (root.parentNode) root.parentNode.removeChild(root); }, wait);
}

if (beginBtn) beginBtn.onclick = function(){ dismiss(true); };
if (skipBtn)  skipBtn.onclick  = function(){ dismiss(false); };
addEventListener('keydown', function(e){ if (e.key === 'Escape') dismiss(false); });

// -- Text reveal schedule (ms from start) --------------------------
var schedule = [800, 1800, 2800, 3800, 5000];
if (reduced) {
  for (var i = 0; i < steps.length; i++) steps[i].classList.add('on');
} else {
  for (var j = 0; j < steps.length; j++) {
    (function(el){
      var idx = parseInt(el.getAttribute('data-fg-step') || '0', 10) || 0;
      setTimeout(function(){ el.classList.add('on'); }, schedule[idx] || 0);
    })(steps[j]);
  }
}

// -- Compensate for parent zoom (desktop index.html uses zoom) -----
try {
  var bz = parseFloat(getComputedStyle(document.body).zoom);
  if (bz && bz !== 1) root.style.zoom = String(1 / bz);
} catch (e) {}

// -- Fallback if reduced-motion / no WebGL -------------------------
var FALLBACK_BG = 'radial-gradient(circle at 50% 30%, #1a2740 0%, #0a1526 45%, #05080f 75%)';
function useFallback(){ root.style.background = FALLBACK_BG; }
if (reduced || !canvas) { useFallback(); return; }

// -- WebGL setup ---------------------------------------------------
var gl = canvas.getContext('webgl', {alpha:true, antialias:true, premultipliedAlpha:true})
      || canvas.getContext('experimental-webgl', {alpha:true, antialias:true});
if (!gl) { useFallback(); return; }

function syncSize(){
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = Math.floor((canvas.clientWidth  || innerWidth)  * dpr);
  var h = Math.floor((canvas.clientHeight || innerHeight) * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    if (gl) gl.viewport(0, 0, w, h);
  }
}
if (window.ResizeObserver) new ResizeObserver(syncSize).observe(canvas);
addEventListener('resize', syncSize);
syncSize();

var VS = [
'attribute vec2 a;',
'varying vec2 v;',
'void main(){ v = a*0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }'
].join('\n');

var FS = [
'precision highp float;',
'uniform float t;',
'uniform vec2 res;',
'',
'float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }',
'',
'float stars(vec2 uv, float scale, float thr, float spd){',
'  vec2 p = uv*scale; vec2 ip = floor(p); vec2 fp = fract(p)-0.5;',
'  float h = hash(ip); if(h < thr) return 0.0;',
'  float tw = sin(t*spd + h*6.2831)*0.5 + 0.5;',
'  float s = (h-thr)/(1.0-thr);',
'  float d = length(fp);',
'  float b = smoothstep(0.14*s, 0.0, d) * tw;',
'  if (h > 0.98) {',
'    float fl = max(0.0, 1.0-abs(fp.x)*20.0)*max(0.0, 1.0-abs(fp.y)*1.6)',
'             + max(0.0, 1.0-abs(fp.y)*20.0)*max(0.0, 1.0-abs(fp.x)*1.6);',
'    b += fl * tw * 0.35;',
'  }',
'  return b;',
'}',
'',
'void main(){',
'  vec2 uv = (gl_FragCoord.xy - 0.5*res.xy) / min(res.x, res.y);',
'',
'  vec3 col = vec3(0.012, 0.020, 0.038);',
'',
'  float neb = sin(uv.x*2.4 + t*0.045) * cos(uv.y*2.0 - t*0.03);',
'  neb = smoothstep(-0.6, 0.85, neb) * 0.06;',
'  col += vec3(0.05, 0.09, 0.17) * neb;',
'',
'  float st = 0.0;',
'  st += stars(uv,              36.0, 0.92, 1.6) * 0.85;',
'  st += stars(uv+vec2(0.3,0.7),66.0, 0.95, 2.3) * 0.62;',
'  st += stars(uv+vec2(0.8,0.2),115.0,0.97, 3.1) * 0.40;',
'  col += vec3(st*0.85, st*0.92, st*1.0);',
'',
'  // -- Moon: upper-middle, fades in over first 3 seconds --',
'  vec2 moonPos = vec2(0.0, 0.20);',
'  float R = 0.26;',
'  vec2  md = uv - moonPos;',
'  float mdist = length(md);',
'  float appear = smoothstep(0.2, 3.0, t);',
'',
'  if (mdist < R + 0.01) {',
'    vec2  muv = md / R;',
'    float z = sqrt(max(0.0, 1.0 - dot(muv, muv)));',
'    vec3  n = normalize(vec3(muv.x, muv.y, z));',
'    vec3  L = normalize(vec3(0.62, 0.58, 0.52));',
'    float diff = max(0.0, dot(n, L));',
'',
'    float n1 = hash(floor((muv+1.0)*13.0));',
'    float n2 = hash(floor((muv+1.0)*39.0));',
'    float cr = mix(0.72, 1.06, n1*0.65 + n2*0.35);',
'',
'    vec3 alb = vec3(0.84, 0.88, 0.94) * cr;',
'    vec3 earthshine = vec3(0.02, 0.035, 0.07);',
'    float term = smoothstep(-0.06, 0.24, diff);',
'    vec3 lit = alb*term*(diff*1.15 + 0.1) + earthshine*(1.0 - term);',
'',
'    float edge = smoothstep(R, R-0.006, mdist);',
'    col = mix(col, lit, edge * appear);',
'  }',
'',
'  float halo = smoothstep(R+0.42, R, mdist);',
'  halo = pow(halo, 2.2) * 0.45 * appear;',
'  col += vec3(0.35, 0.5, 0.75) * halo;',
'',
'  float vig = 1.0 - smoothstep(0.5, 1.55, length(uv));',
'  col *= vig;',
'',
'  gl_FragColor = vec4(col, 1.0);',
'}'
].join('\n');

function compile(type, src){
  var s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[fg-cinema] shader compile error:', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}
var vsS = compile(gl.VERTEX_SHADER, VS);
var fsS = compile(gl.FRAGMENT_SHADER, FS);
if (!vsS || !fsS) { useFallback(); return; }

var prog = gl.createProgram();
gl.attachShader(prog, vsS);
gl.attachShader(prog, fsS);
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  console.warn('[fg-cinema] program link error:', gl.getProgramInfoLog(prog));
  useFallback(); return;
}
gl.useProgram(prog);

var buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
var loc = gl.getAttribLocation(prog, 'a');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

var uT = gl.getUniformLocation(prog, 't');
var uR = gl.getUniformLocation(prog, 'res');

var start = performance.now();
var stopped = false;

function frame(){
  if (stopped) return;
  if (!root.isConnected) { stopped = true; return; }
  var sec = (performance.now() - start) / 1000;
  gl.viewport(0, 0, canvas.width, canvas.height);
  if (uT) gl.uniform1f(uT, sec);
  if (uR) gl.uniform2f(uR, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(frame);
}
frame();
})();
</script>
<!-- === /FG CINEMATIC INTRO BODY === -->
"""


def patch_file(src, dst):
    if not os.path.exists(src):
        print('  SKIP (not found): ' + src)
        return
    with open(src, 'r', encoding='utf-8') as f:
        s = f.read()

    if MARKER in s:
        print('  ' + src + ': already patched - writing unchanged copy')
        with open(dst, 'w', encoding='utf-8') as f:
            f.write(s)
        return

    if '</head>' in s:
        s = s.replace('</head>', CINEMA_HEAD + '</head>', 1)
    else:
        print('  WARN: no </head> in ' + src + ' - CSS not injected')

    i = s.rfind('</body>')
    if i == -1:
        print('  ERROR: no </body> in ' + src + ' - skipping')
        return

    s = s[:i] + CINEMA_BODY + s[i:]
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(s)
    print('  wrote ' + dst + ' (' + str(len(s) // 1024) + ' KB)')


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else '.'
    print('Patching cinematic intro in: ' + os.path.abspath(folder))
    patch_file(os.path.join(folder, 'index.html'),  os.path.join(folder, 'index.new.html'))
    patch_file(os.path.join(folder, 'mobile.html'), os.path.join(folder, 'mobile.new.html'))
    print('')
    print('Done. Test index.new.html and mobile.new.html in a browser,')
    print('then rename them to index.html and mobile.html when happy.')
    print('')
    print('Replay the intro:  open the page with ?cinema=1')
    print('Skip the intro:    open the page with ?cinema=0')


if __name__ == '__main__':
    main()
