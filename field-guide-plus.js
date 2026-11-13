/* Galactic Field Guide add-on. Add ONE line just before </body> in index.html (and mobile.html):
   <script src="field-guide-plus.js"></script>
   Adds: launch intro, 2-minute story tour, 3D Lab challenge, live NASA photos, fact fixes. */
(function () {
'use strict';
var Q = function (s) { return document.querySelector(s); };
function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
function xp(n, e) { try { addXP(n, e || null); } catch (_) {} }
function shuffle(a) { return a.slice().sort(function () { return Math.random() - .5; }); }

/* ---------- 1. Fact fixes (re-checked against NASA sources, Nov 2026) ---------- */
try {
  RELICS.pv.today = 'It has climbed out of the river delta and is now exploring the crater rim. It found a rock named Cheyava Falls with “leopard spots” that NASA calls a possible sign of ancient life. Scientists still need more study to be sure. It also tested making oxygen from Martian air for future astronauts.';
  RELICS.ig.why = 'On Jan. 18, 2024, its 72nd flight ended with a landing that damaged its rotor blades, so it could never fly again. It was a small test machine with no way to carry itself home. It rests where it landed in Jezero Crater.';
  RELICS.jz.today = 'The tubes are waiting like a time capsule. They hold rocks from an ancient river delta, which could someday be studied in labs on Earth, by NASA or another country. China plans its own Mars sample mission, Tianwen-3, to launch around 2028 and bring samples back around 2031 (reports vary). Plans can change, so check NASA news.';
  CR.filter(function (c) { return c.id == 'pv'; })[0].steps[0] = 'Climb the crater rim and pick the best rocks.';
} catch (e) {}

/* ---------- styles ---------- */
var st = el('style');
st.textContent =
'.gfp-intro{position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;color:#eaf6ff;background:radial-gradient(1.5px 1.5px at 12% 22%,#fff,transparent),radial-gradient(1.5px 1.5px at 78% 15%,#fff,transparent),radial-gradient(2px 2px at 64% 72%,#ffd6e7,transparent),radial-gradient(1.5px 1.5px at 30% 80%,#fff,transparent),radial-gradient(1px 1px at 90% 55%,#fff,transparent),radial-gradient(ellipse at 50% 120%,#3b2a6b,transparent 60%),#05071a}' +
'.gfp-intro h1{color:#fff;font:800 clamp(30px,6vw,56px)/1.05 var(--fh);margin:0}.gfp-intro h1 em{font-style:normal;color:#ff8cc0}' +
'.gfp-l{margin:0;font:600 clamp(15px,2.4vw,20px)/1.4 var(--fb);animation:gfpf .9s both}.gfp-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px;animation:gfpf .9s 2.6s both}' +
'@keyframes gfpf{from{opacity:0;transform:translateY(10px)}}' +
'.gfp-skip{background:none;border:0;color:#9fc3e6;font:600 13px var(--fb);cursor:pointer;text-decoration:underline}' +
'.gfp-bar{position:fixed;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:150;background:var(--glass);backdrop-filter:blur(10px);border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:none;gap:12px;align-items:center;box-shadow:0 10px 30px #0006}' +
'.gfp-bar p{margin:0;flex:1;font:600 15px/1.4 var(--fb);color:var(--ink)}.gfp-bar i{position:absolute;left:0;bottom:0;height:3px;width:0;background:linear-gradient(90deg,var(--pink),var(--pink2))}' +
'.gfp-tb{font:700 13px var(--fh);color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:7px 12px;cursor:pointer;white-space:nowrap}' +
'.gfp-ov{position:fixed;inset:0;z-index:210;background:#020615cc;display:grid;place-items:center;padding:16px}.gfp-pn{background:var(--card);color:var(--p);border:1px solid var(--line);border-radius:16px;padding:18px;width:min(920px,100%);max-height:88vh;overflow:auto}' +
'.gfp-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-top:12px}.gfp-c{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--soft);font-size:12.5px}' +
'.gfp-c img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#0f3a63}.gfp-c div{padding:8px 10px}.gfp-c b{display:block;color:var(--ink);font:700 13px var(--fh)}.gfp-c a{color:#1b78c2}' +
'.gfp-nb{position:absolute;z-index:3;left:8px;top:8px;font:700 12px var(--fh);color:#0d2f55;background:#ffffffe8;border:0;border-radius:8px;padding:6px 12px;cursor:pointer}' +
'#labq{display:none;flex-direction:column;flex:1;min-height:0;gap:8px;overflow:auto}';
document.head.appendChild(st);

/* ---------- 2. Two-minute story tour ---------- */
var timers = [], tourOn = false, bar, barTxt, barFill;
function later(f, ms) { timers.push(setTimeout(f, ms)); }
function stopTour() { timers.forEach(clearTimeout); timers = []; tourOn = false; if (bar) { bar.style.display = 'none'; barFill.style.transition = 'none'; barFill.style.width = '0'; } }
function labDemo() {
  var n = 0;
  (function go() {
    if (!tourOn) return;
    if (window.LAB && LAB.ready) {
      var p = Q('#labpick [data-id="a12"]'), s = Q('#labtabs [data-lt="sim"]'), b = Q('#splay');
      if (p) p.click(); if (s) s.click(); if (b) b.click();
    } else if (n++ < 16) later(go, 500);
  })();
}
function pickWhen(planet, idx) {
  show('radar');
  var b = Q('#planet [data-pl="' + planet + '"]'); if (b) b.click();
  later(function () { try { pick(MAPS[planet].pins[idx]); } catch (e) {} }, 700);
}
function go(id, p) { return function () { openFile(id); if (p > 1) { cpg = p; renderBook(); } }; }
var STEPS = [
  [8, 'In 1971 astronauts drove a car on the Moon… and then left it there. Why?', function () { show('home'); }],
  [12, 'Meet the Apollo 15 Moon buggy: it folded flat, rolled on wire-mesh wheels and drove 17.3 miles.', go('a15', 1)],
  [14, 'Why it stayed: the ride home had room for two astronauts and 170 pounds of Moon rocks, not a car. Yet Apollo 15 left a mirror that scientists still hit with lasers.', go('a15', 2)],
  [12, 'Every marker on the Radar Map is a real site. This one is Hadley, 26° north, where the buggy sits today.', function () { pickWhen('moon', 2); }],
  [12, 'Surveyor 3 waited alone for 31 months. Apollo 12 astronauts walked over and brought home its camera, so labs could study how space wears machines out.', go('s3', 2)],
  [22, 'In the 3D Lab, replay Apollo 12. The bottom stage is the launch pad, so it stays. Only the top half flies home.', function () { show('lab'); labDemo(); }],
  [16, 'On Mars, ten sealed tubes wait like a time capsule. In January 2026 Congress chose not to fund the trip home, so for now they stay.', go('jz', 2)],
  [12, 'Back on the Radar Map: the depot sits in Jezero Crater, where a lake once was.', function () { pickWhen('mars', 0); }],
  [12, 'Left-behind machines are not junk. They are time capsules that still teach us. Your turn: try the Lab challenge!', function () { show('lab'); later(function () { var c = Q('#labtabs [data-lt="quiz"]'); if (c) c.click(); }, 1500); }]
];
function startTour() {
  closeIntro(); stopTour(); tourOn = true;
  bar.style.display = 'flex';
  var total = STEPS.reduce(function (a, s) { return a + s[0]; }, 0), at = 0;
  barFill.style.transition = 'none'; barFill.style.width = '0'; void barFill.offsetWidth;
  barFill.style.transition = 'width ' + total + 's linear'; barFill.style.width = '100%';
  STEPS.forEach(function (s) { var a = at; later(function () { barTxt.textContent = s[1]; try { s[2](); } catch (e) {} }, a * 1000); at += s[0]; });
  later(stopTour, total * 1000);
}
bar = el('div', 'gfp-bar'); barTxt = el('p'); barFill = el('i');
var stopB = el('button', 'btn ghost', 'Stop'); stopB.onclick = stopTour;
bar.appendChild(barTxt); bar.appendChild(stopB); bar.appendChild(barFill); bar.setAttribute('role', 'status'); document.body.appendChild(bar);

var hdr = Q('header.top'), xpp = Q('.xpp');
if (hdr) { var tb = el('button', 'gfp-tb', '▶ 2-min tour'); tb.onclick = startTour; hdr.insertBefore(tb, xpp || null); }

/* ---------- 3. Opening experience ---------- */
var intro;
function closeIntro() { if (intro && intro.parentNode) { intro.parentNode.removeChild(intro); xp(20); } intro = null; try { sessionStorage.setItem('gfp', '1'); } catch (e) {} }
function openIntro() {
  intro = el('div', 'gfp-intro'); intro.setAttribute('role', 'dialog'); intro.setAttribute('aria-label', 'Welcome');
  var h = el('h1'); h.innerHTML = 'Galactic <em>Field Guide</em>'; intro.appendChild(h);
  ['In 1971, people drove a car on the Moon.', 'In 2021, a helicopter flew on Mars.', 'We left them behind. They are still teaching us.'].forEach(function (t, i) {
    var p = el('p', 'gfp-l', t); p.style.animationDelay = (0.4 + i * 0.7) + 's'; intro.appendChild(p);
  });
  var row = el('div', 'gfp-row'), b1 = el('button', 'btn', 'Begin the mission'), b2 = el('button', 'btn alt', '▶ 2-minute story tour');
  b1.onclick = closeIntro; b2.onclick = startTour; row.appendChild(b1); row.appendChild(b2); intro.appendChild(row);
  var sk = el('button', 'gfp-skip', 'Skip'); sk.onclick = closeIntro; intro.appendChild(sk);
  document.body.appendChild(intro); b1.focus();
}
var seen = null; try { seen = sessionStorage.getItem('gfp'); } catch (e) {}
if (/[?&]intro=1/.test(location.search) || (!seen && !/[?&]intro=0/.test(location.search))) openIntro();

/* ---------- 4. 3D Lab challenge ---------- */
var QZ = { on: false, keys: [], i: 0, s: 0, cur: null, tries: 0 };
var tabs = Q('#labtabs'), host = Q('#labcv'), labs = Q('#labs');
if (tabs && labs) {
  var qc = el('button', 'chip', 'Challenge'); qc.dataset.lt = 'quiz'; tabs.appendChild(qc);
  var qb = el('div'); qb.id = 'labq'; labs.parentNode.appendChild(qb);
  tabs.addEventListener('click', function (e) { var b = e.target.closest('[data-lt]'); if (!b) return; if (b.dataset.lt === 'quiz') qStart(); else qHide(); });
  var lp = Q('#labpick'); if (lp) lp.addEventListener('click', qHide);
}
function qShow() {
  var l = Q('#labl'), s = Q('#labs'), b = Q('#labq');
  if (l) l.style.display = 'none'; if (s) s.style.display = 'none'; if (b) b.style.display = 'flex';
  [].forEach.call(document.querySelectorAll('#labtabs .chip'), function (c) { c.classList.toggle('on', c.dataset.lt === 'quiz'); });
}
function qHide() { QZ.on = false; var b = Q('#labq'); if (b) b.style.display = 'none'; }
function qStart() {
  qShow();
  if (!window.LAB || !LAB.ready) { Q('#labq').textContent = 'The 3D model is still loading (it needs internet). Open the Learn tab, then try again.'; return; }
  QZ.on = true; QZ.keys = shuffle(Object.keys(LP[LAB.id])).slice(0, 5); QZ.i = 0; QZ.s = 0; qAsk();
}
function qAsk() {
  var b = Q('#labq'), id = LAB.id; LAB.sel = null; b.textContent = '';
  if (QZ.i >= QZ.keys.length) {
    b.appendChild(el('div', 'coord', 'Challenge complete'));
    b.appendChild(el('h3', null, QZ.s + ' of ' + QZ.keys.length + ' on the first try'));
    b.appendChild(el('p', null, 'Open the Learn tab to re-read any part you missed, or try a different craft.'));
    var again = el('button', 'btn', 'Play again'); again.onclick = qStart; b.appendChild(again);
    if (QZ.s === QZ.keys.length) xp(25, again);
    QZ.cur = null; return;
  }
  QZ.cur = QZ.keys[QZ.i]; QZ.tries = 0;
  b.appendChild(el('div', 'coord', 'Challenge ' + (QZ.i + 1) + ' of ' + QZ.keys.length));
  b.appendChild(el('h3', null, 'Which part does this?'));
  b.appendChild(el('p', null, LP[id][QZ.cur][1]));
  var m = el('div', 'note b', 'Tap the part on the 3D model. Drag to turn it first if you need a better view.'); m.id = 'qm'; b.appendChild(m);
  var r = el('div', 'sbtns'), h = el('button', 'chip', 'Show me'), n = el('button', 'btn', 'Next');
  h.onclick = qReveal; n.id = 'qn'; n.style.display = 'none'; n.onclick = function () { QZ.i++; qAsk(); };
  r.appendChild(h); r.appendChild(n); b.appendChild(r);
}
function qDone(txt) { Q('#qm').textContent = txt; var n = Q('#qn'); n.style.display = ''; n.textContent = QZ.i + 1 >= QZ.keys.length ? 'See score' : 'Next'; }
function qReveal() { if (QZ.cur == null) return; var k = QZ.cur; LAB.sel = k; QZ.cur = null; qDone('It is the ' + LP[LAB.id][k][0] + '. ' + LP[LAB.id][k][1]); }
function qAnswer(k) {
  if (!QZ.on || QZ.cur == null) return;
  var id = LAB.id;
  if (!k) { Q('#qm').textContent = 'Tap one of the craft’s parts.'; return; }
  if (k === QZ.cur) {
    if (!QZ.tries) QZ.s++; xp(QZ.tries ? 5 : 15); LAB.sel = k; QZ.cur = null;
    qDone('Yes! The ' + LP[id][k][0] + '. ' + LP[id][k][2]);
  } else { QZ.tries++; Q('#qm').textContent = 'That is the ' + LP[id][k][0] + '. Read the clue again and try another part.'; }
}
function pickKey(e) {
  var d = LAB.r.domElement, r = d.getBoundingClientRect(), ray = new THREE.Raycaster(),
    v = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(v, LAB.cam);
  var h = ray.intersectObjects(LAB.G[LAB.id].children, true);
  for (var i = 0; i < h.length; i++) { var k = h[i].object.userData._k; if (k) return k; }
  return null;
}
if (host) {
  var D = null;
  host.addEventListener('pointerdown', function (e) { D = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  host.addEventListener('pointerup', function (e) {
    if (!QZ.on || !D) return;
    var d = D; D = null;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 7 && performance.now() - d.t < 600) {
      LAB.focus = null; LAB.sel = null; qShow(); qAnswer(pickKey(e));
    }
  });
}

/* ---------- 5. Live NASA Image Library ---------- */
var NQ = { a15: 'Apollo 15 lunar roving vehicle', s3: 'Surveyor 3 lunar lander', a12: 'Apollo 12 lunar module Intrepid', a11: 'Apollo 11 lunar module Eagle', pv: 'Perseverance rover Mars', ig: 'Ingenuity Mars helicopter', jz: 'Perseverance sample depot Three Forks' };
function nasaModal(id) {
  var o = el('div', 'gfp-ov'), p = el('div', 'gfp-pn'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
  function close() { document.removeEventListener('keydown', esc); if (o.parentNode) o.parentNode.removeChild(o); }
  function esc(e) { if (e.key === 'Escape') close(); }
  var x = el('button', 'btn ghost', 'Close'); x.onclick = close; o.onclick = function (e) { if (e.target === o) close(); };
  p.appendChild(el('span', 'label a', 'Live from NASA'));
  p.appendChild(el('h3', null, 'NASA Image and Video Library'));
  var s = el('p', null, 'Loading photos… Results come straight from NASA’s search, so read each caption before you trust it.'), g = el('div', 'gfp-g');
  p.appendChild(s); p.appendChild(g); p.appendChild(x); o.appendChild(p); document.body.appendChild(o); document.addEventListener('keydown', esc); x.focus();
  var ac = window.AbortController ? new AbortController() : null, tm = setTimeout(function () { if (ac) ac.abort(); }, 9000);
  fetch('https://images-api.nasa.gov/search?media_type=image&page_size=12&q=' + encodeURIComponent(NQ[id] || id), ac ? { signal: ac.signal } : {})
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (j) {
      clearTimeout(tm);
      var it = ((j.collection || {}).items || []).filter(function (i) { return i.links && i.links[0] && i.data && i.data[0]; }).slice(0, 6);
      if (!it.length) throw 0;
      s.textContent = 'Search: “' + NQ[id] + '”. Tap a title to open the full NASA record.';
      it.forEach(function (i) {
        var d = i.data[0], c = el('div', 'gfp-c'), im = el('img'), t = el('div'), a = el('a', null, d.title || d.nasa_id);
        im.src = i.links[0].href; im.alt = d.title || ''; im.loading = 'lazy';
        a.href = 'https://images.nasa.gov/details/' + encodeURIComponent(d.nasa_id); a.target = '_blank'; a.rel = 'noopener';
        var b = el('b'); b.appendChild(a); t.appendChild(b);
        t.appendChild(el('span', null, ((d.date_created || '').slice(0, 4) || 'n.d.') + ' · ' + (d.center || 'NASA') + ' · ' + d.nasa_id));
        c.appendChild(im); c.appendChild(t); g.appendChild(c);
      });
      xp(10, o);
    })
    .catch(function () { clearTimeout(tm); s.textContent = 'Could not reach NASA right now. You can search the library yourself at images.nasa.gov.'; });
}
var _rb = window.renderBook;
if (typeof _rb === 'function') {
  window.renderBook = function () {
    _rb.apply(this, arguments);
    try {
      if (cpg !== 1) return;
      var a = Q('.art2'); if (!a || a.querySelector('.gfp-nb')) return;
      var b = el('button', 'gfp-nb', 'More NASA photos'); var id = cid; b.onclick = function () { nasaModal(id); }; a.appendChild(b);
    } catch (e) {}
  };
}
var cr = Q('#credits .card:last-child .cr');
if (cr) { var li = el('li'); li.innerHTML = '<b>Live photos:</b> <a href="https://images.nasa.gov" target="_blank" rel="noopener">NASA Image and Video Library</a>, loaded only when you tap “More NASA photos”. Each result links to its own NASA record.'; cr.appendChild(li); }
})();
