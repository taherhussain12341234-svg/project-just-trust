#!/usr/bin/env python3
"""
patch_fun.py
Adds kid-friendly fun elements:
- Sound effects (Web Audio, no files)
- Confetti celebrations
- Badge system with popups
- Cosmo the robot mascot with tips
- Sound toggle in header
- Random fun fact button on relic pages
- Bouncy animations
- Secret easter egg

Writes index.new.html and mobile.new.html.
"""

import os, sys

HEAD = r"""
<!-- === FG FUN THEME === -->
<style id="fg-fun-theme">
/* ---- Mascot ---- */
.fg-mascot{
  position:fixed;
  bottom:90px;
  right:16px;
  width:56px;height:56px;
  border-radius:50%;
  background:linear-gradient(135deg,var(--pink) 0%,var(--pink2) 100%);
  border:3px solid var(--card);
  box-shadow:0 10px 30px rgba(217,106,63,.45),0 4px 12px rgba(30,20,10,.25);
  cursor:pointer;
  font-size:28px;
  z-index:900;
  display:grid;place-items:center;
  animation:fgFloat 3s ease-in-out infinite;
  transition:transform .2s ease;
  user-select:none;
  -webkit-tap-highlight-color:transparent;
}
.fg-mascot:hover{transform:scale(1.1)}
.fg-mascot:active{transform:scale(.95)}
@keyframes fgFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

.fg-mascot-bubble{
  position:fixed;
  bottom:158px;
  right:16px;
  max-width:260px;
  background:var(--card);
  color:var(--ink);
  padding:14px 16px;
  border-radius:14px;
  border:1px solid var(--line);
  box-shadow:0 12px 28px rgba(30,20,10,.25);
  font-family:var(--fb),system-ui,sans-serif;
  font-size:13.5px;
  line-height:1.5;
  z-index:899;
  opacity:0;
  transform:translateY(10px) scale(.95);
  transition:opacity .3s cubic-bezier(.34,1.56,.64,1),transform .3s cubic-bezier(.34,1.56,.64,1);
  pointer-events:none;
}
.fg-mascot-bubble.on{opacity:1;transform:translateY(0) scale(1)}
.fg-mascot-bubble::after{
  content:'';position:absolute;bottom:-8px;right:22px;
  width:14px;height:14px;background:var(--card);
  border-right:1px solid var(--line);border-bottom:1px solid var(--line);
  transform:rotate(45deg);
}

@media(max-width:640px){
  .fg-mascot{bottom:calc(150px + env(safe-area-inset-bottom,0px));right:12px;width:48px;height:48px;font-size:24px}
  .fg-mascot-bubble{bottom:calc(210px + env(safe-area-inset-bottom,0px));right:12px;max-width:220px;font-size:12.5px}
}

/* ---- Sound toggle ---- */
.fg-sound{
  background:transparent;
  border:1px solid var(--line);
  border-radius:10px;
  width:38px;height:38px;
  cursor:pointer;
  font-size:18px;
  color:var(--ink);
  margin-left:8px;
  display:grid;place-items:center;
  transition:background .15s,border-color .15s;
}
.fg-sound:hover{background:var(--soft);border-color:var(--pink2)}
.fg-sound:active{transform:scale(.95)}

/* ---- Badge popup ---- */
.fg-badge-pop{
  position:fixed;inset:0;z-index:9999;
  display:grid;place-items:center;
  padding:24px;
  pointer-events:none;
}
.fg-badge-card{
  background:var(--card);
  color:var(--ink);
  border:2px solid var(--pink);
  border-radius:20px;
  padding:32px 40px;
  text-align:center;
  box-shadow:0 30px 60px rgba(30,20,10,.5);
  max-width:340px;
  pointer-events:auto;
  animation:fgBadgePop .6s cubic-bezier(.34,1.56,.64,1);
  font-family:var(--fb),system-ui,sans-serif;
}
.fg-badge-emoji{font-size:64px;line-height:1;margin-bottom:8px}
.fg-badge-eyebrow{
  font-family:var(--mono,'JetBrains Mono',monospace);
  font-size:11px;letter-spacing:.2em;text-transform:uppercase;
  color:var(--pinkd);margin-bottom:6px;
}
.fg-badge-name{
  font-family:var(--fh,'Fraunces',serif);
  font-size:28px;font-weight:500;color:var(--ink);margin-bottom:8px;
}
.fg-badge-blurb{font-size:14px;color:var(--p);line-height:1.5}
.fg-badge-btn{
  margin-top:20px;
  background:var(--ink);
  color:var(--card);
  border:0;
  padding:10px 24px;
  border-radius:10px;
  font-weight:600;
  cursor:pointer;
  font-size:14px;
  font-family:inherit;
}
.fg-badge-btn:hover{opacity:.9}
@keyframes fgBadgePop{
  0%{transform:scale(.5) rotate(-10deg);opacity:0}
  60%{transform:scale(1.1) rotate(3deg);opacity:1}
  100%{transform:scale(1) rotate(0);opacity:1}
}

/* ---- Toast ---- */
.fg-toast{
  position:fixed;
  left:50%;bottom:120px;
  transform:translateX(-50%);
  max-width:min(400px,90vw);
  background:var(--ink);
  color:var(--card);
  padding:14px 20px;
  border-radius:12px;
  font-size:14px;
  line-height:1.5;
  box-shadow:0 20px 40px rgba(0,0,0,.4);
  z-index:9999;
  animation:fgToastIn .3s ease-out;
  font-family:var(--fb),system-ui,sans-serif;
}
@keyframes fgToastIn{
  from{opacity:0;transform:translate(-50%,20px)}
  to{opacity:1;transform:translate(-50%,0)}
}

/* ---- Random fact button ---- */
.fg-random-fact{
  margin-top:12px;
  font-size:12px;
  align-self:flex-start;
  background:var(--soft);
  border:1px dashed var(--line);
  color:var(--ink);
  padding:8px 14px;
  border-radius:10px;
  cursor:pointer;
  font-family:var(--mono,'JetBrains Mono',monospace);
  letter-spacing:.06em;
  transition:background .15s,border-color .15s;
}
.fg-random-fact:hover{background:var(--pink3);border-color:var(--pink2)}
.fg-random-fact:active{transform:scale(.97)}

/* ---- Playful animations ---- */
.btn:active{transform:scale(.96) translateY(1px)!important}
.chip:active{transform:scale(.96)}
.feat:active{transform:scale(.98)}
.st:active{transform:scale(.98)}
.feat:hover b{animation:fgWiggle .4s ease}
@keyframes fgWiggle{
  0%,100%{transform:rotate(0)}
  25%{transform:rotate(-8deg)}
  75%{transform:rotate(8deg)}
}

/* ---- Reduced motion ---- */
@media (prefers-reduced-motion: reduce) {
  .fg-mascot{animation:none}
  .fg-badge-card{animation:none}
  .feat:hover b{animation:none}
  .btn:active,.chip:active,.feat:active,.st:active{transform:none!important}
}
</style>
<!-- === /FG FUN THEME === -->
"""

BODY_JS = r"""
<!-- === FG FUN SCRIPT === -->
<script>
(function(){
'use strict';

// =================== SOUND ENGINE ===================
var Sound = {
  on: true,
  ctx: null,
  _init: function () {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  },
  play: function (freq, dur, type, vol) {
    if (!this.on) return;
    this._init();
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      o.connect(g);
      g.connect(this.ctx.destination);
      g.gain.setValueAtTime(vol || 0.06, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  },
  tap: function () { this.play(520, 0.05, 'triangle', 0.04); },
  success: function () {
    var self = this;
    this.play(523, 0.12, 'sine', 0.08);
    setTimeout(function () { self.play(659, 0.12, 'sine', 0.08); }, 90);
    setTimeout(function () { self.play(784, 0.2, 'sine', 0.1); }, 180);
  },
  wrong: function () { this.play(180, 0.18, 'sawtooth', 0.05); },
  fanfare: function () {
    var self = this;
    [523, 659, 784, 1047].forEach(function (n, i) {
      setTimeout(function () { self.play(n, 0.25, 'sine', 0.08); }, i * 120);
    });
  }
};

// =================== CONFETTI ===================
var CF = {
  canvas: null, ctx: null, parts: [], raf: null,
  init: function () {
    if (this.canvas) return;
    var c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9998';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    this.canvas = c;
    this.ctx = c.getContext('2d');
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  },
  resize: function () {
    if (!this.canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.canvas.style.width = innerWidth + 'px';
    this.canvas.style.height = innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },
  burst: function (x, y, count) {
    try {
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) {}
    this.init();
    count = count || 40;
    x = x || innerWidth / 2;
    y = y || innerHeight / 2;
    var colors = ['#d96a3f', '#f0a577', '#3b6ea8', '#5a8a63', '#e8b04a', '#ff5c7a', '#ffd166'];
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 4 + Math.random() * 6;
      this.parts.push({
        x: x, y: y,
        vx: Math.cos(a) * (2 + Math.random() * 6),
        vy: Math.sin(a) * (2 + Math.random() * 6) - 3,
        size: s,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }
    if (!this.raf) this.loop();
  },
  loop: function () {
    var self = CF;
    self.ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (var i = self.parts.length - 1; i >= 0; i--) {
      var p = self.parts[i];
      p.vy += 0.25;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.012;
      if (p.life <= 0 || p.y > innerHeight + 40) {
        self.parts.splice(i, 1);
        continue;
      }
      self.ctx.save();
      self.ctx.translate(p.x, p.y);
      self.ctx.rotate(p.rot);
      self.ctx.globalAlpha = Math.max(0, p.life);
      self.ctx.fillStyle = p.color;
      self.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      self.ctx.restore();
    }
    if (self.parts.length) {
      self.raf = requestAnimationFrame(self.loop);
    } else {
      self.raf = null;
    }
  }
};

// =================== BADGES ===================
var BADGES = [
  { id: 'rookie',   xp: 20,  emoji: '🚀', name: 'Space Cadet',      blurb: 'You started your journey! Every astronaut begins here.' },
  { id: 'explorer', xp: 60,  emoji: '🔭', name: 'Explorer',          blurb: 'You are finding your way through the stars.' },
  { id: 'pilot',    xp: 120, emoji: '🛸', name: 'Test Pilot',        blurb: 'You have earned your wings.' },
  { id: 'commander',xp: 200, emoji: '⭐', name: 'Mission Commander', blurb: 'Nothing can stop you now.' },
  { id: 'legend',   xp: 350, emoji: '🌟', name: 'Space Legend',      blurb: 'You know every story by heart.' }
];
var BadgeState = { earned: [] };
try {
  var saved = localStorage.getItem('fgBadges');
  if (saved) BadgeState.earned = JSON.parse(saved);
} catch (e) {}

function saveBadges() {
  try { localStorage.setItem('fgBadges', JSON.stringify(BadgeState.earned)); } catch (e) {}
}

function getCurrentXP() {
  var el = document.getElementById('xp');
  return el ? (parseInt(el.textContent, 10) || 0) : 0;
}

function checkBadges() {
  var cur = getCurrentXP();
  BADGES.forEach(function (b) {
    if (cur >= b.xp && BadgeState.earned.indexOf(b.id) < 0) {
      BadgeState.earned.push(b.id);
      saveBadges();
      showBadgePopup(b);
    }
  });
}

function showBadgePopup(badge) {
  CF.burst(innerWidth / 2, innerHeight * 0.35, 70);
  Sound.fanfare();
  var pop = document.createElement('div');
  pop.className = 'fg-badge-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'New badge: ' + badge.name);
  pop.innerHTML = '<div class="fg-badge-card">' +
    '<div class="fg-badge-emoji">' + badge.emoji + '</div>' +
    '<div class="fg-badge-eyebrow">Badge earned</div>' +
    '<div class="fg-badge-name">' + badge.name + '</div>' +
    '<div class="fg-badge-blurb">' + badge.blurb + '</div>' +
    '<button class="fg-badge-btn" type="button">Awesome!</button>' +
    '</div>';
  document.body.appendChild(pop);
  var close = function () { if (pop.parentNode) pop.remove(); };
  pop.querySelector('button').onclick = close;
  pop.addEventListener('click', function (e) { if (e.target === pop) close(); });
  setTimeout(function () { if (pop.parentNode) close(); }, 7000);
}

// =================== TOAST ===================
function showToast(text) {
  var t = document.createElement('div');
  t.className = 'fg-toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(function () { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 3500);
  setTimeout(function () { if (t.parentNode) t.remove(); }, 4000);
}

// =================== MASCOT ===================
var Mascot = {
  el: null, bubble: null, tipIdx: 0, hideTimer: null,
  tips: [
    "Psst! Try the 3D Lab — you can spin the machines around with your finger!",
    "Did you know? The Moon buggy could fold up like a suitcase!",
    "Every relic has THREE pages. Don't miss the end!",
    "Tap any part in the 3D Lab to hear its secret.",
    "The story tour is only 2 minutes. Want a quick adventure?",
    "Ingenuity was built for 5 flights. It flew 72!",
    "Try the quiz — but read carefully, some answers are tricky!",
    "The radar map has 7 markers. Can you find them all?",
    "Fun fact: Moon dust smells like gunpowder. Astronauts said so!",
    "The samples on Mars are waiting for a ride home. Want to help?",
    "Apollo 12 landed right next to an old robot friend. Surprise visit!",
    "Perseverance has microphones. You can HEAR Mars on NASA's site!",
    "Sometimes the best explorers never come home — they stay to teach us.",
    "Click me again for another tip!"
  ],
  init: function () {
    if (this.el) return;
    var m = document.createElement('button');
    m.className = 'fg-mascot';
    m.setAttribute('aria-label', 'Cosmo the guide: tap for a fun tip');
    m.setAttribute('type', 'button');
    m.innerHTML = '🤖';
    m.onclick = function () { Mascot.nextTip(); };
    document.body.appendChild(m);
    this.el = m;
    var b = document.createElement('div');
    b.className = 'fg-mascot-bubble';
    b.setAttribute('role', 'status');
    b.setAttribute('aria-live', 'polite');
    document.body.appendChild(b);
    this.bubble = b;
    setTimeout(function () { if (!Mascot.everShown) Mascot.nextTip(); }, 5000);
  },
  nextTip: function () {
    this.everShown = true;
    var tip = this.tips[this.tipIdx % this.tips.length];
    this.tipIdx++;
    this.bubble.textContent = tip;
    this.bubble.classList.add('on');
    Sound.tap();
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(function () {
      Mascot.bubble.classList.remove('on');
    }, 5500);
  }
};

// =================== SOUND TOGGLE ===================
function addSoundToggle() {
  var h = document.querySelector('header.top');
  if (!h || document.getElementById('fgSoundToggle')) return;
  var b = document.createElement('button');
  b.id = 'fgSoundToggle';
  b.className = 'fg-sound';
  b.setAttribute('type', 'button');
  b.setAttribute('aria-label', 'Toggle sound effects');
  b.setAttribute('aria-pressed', 'true');
  b.textContent = '🔊';
  b.onclick = function () {
    Sound.on = !Sound.on;
    b.textContent = Sound.on ? '🔊' : '🔇';
    b.setAttribute('aria-pressed', String(Sound.on));
    if (Sound.on) Sound.tap();
  };
  var xpp = h.querySelector('.xpp');
  if (xpp) h.insertBefore(b, xpp);
  else h.appendChild(b);
}

// =================== HOOK addXP ===================
(function hookXP() {
  if (typeof window.addXP !== 'function') {
    setTimeout(hookXP, 200);
    return;
  }
  if (window.addXP.__fgWrapped) return;
  var orig = window.addXP;
  var wrapped = function (n, e) {
    var result = orig.apply(this, arguments);
    try {
      var x = innerWidth / 2, y = innerHeight / 2;
      if (e && e.getBoundingClientRect) {
        var r = e.getBoundingClientRect();
        x = r.left + r.width / 2;
        y = r.top + r.height / 2;
      }
      if (n >= 15) {
        CF.burst(x, y, Math.min(20 + n, 60));
        Sound.success();
      } else if (n >= 5) {
        Sound.tap();
      }
    } catch (err) {}
    setTimeout(checkBadges, 100);
    return result;
  };
  wrapped.__fgWrapped = true;
  window.addXP = wrapped;
})();

// =================== WRONG-ANSWER SOUND ===================
try {
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'attributes' && m.attributeName === 'class') {
        var el = m.target;
        if (el.classList && el.classList.contains('opt')) {
          if (el.classList.contains('wrong') && !el.__fgW) {
            el.__fgW = true;
            Sound.wrong();
          }
        }
      }
    }
  }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
} catch (e) {}

// =================== TAP SOUND ===================
document.addEventListener('pointerdown', function (e) {
  var t = e.target && e.target.closest ? e.target.closest('.btn, .chip, .st, .feat, .pk, .opt, .nv') : null;
  if (t) Sound.tap();
}, { passive: true });

// =================== RANDOM FUN FACT BUTTON ===================
function addRandomFact() {
  var info = document.querySelector('#bk .info');
  if (!info || info.querySelector('.fg-random-fact')) return;
  var btn = document.createElement('button');
  btn.className = 'fg-random-fact';
  btn.type = 'button';
  btn.textContent = '🎲 Random fun fact';
  btn.onclick = function () {
    try {
      var c = window.CR && typeof cid !== 'undefined' ? CR.find(function (x) { return x.id === cid; }) : null;
      if (!c || !c.ff || !c.ff.length) return;
      var fact = c.ff[Math.floor(Math.random() * c.ff.length)];
      showToast(fact);
      Sound.tap();
      CF.burst(innerWidth / 2, innerHeight * 0.75, 12);
    } catch (err) {}
  };
  info.appendChild(btn);
}

function watchRelicPage() {
  var bk = document.getElementById('bk');
  if (!bk) { setTimeout(watchRelicPage, 300); return; }
  var timer = null;
  try {
    new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(addRandomFact, 120);
    }).observe(bk, { childList: true, subtree: true });
  } catch (e) {}
  addRandomFact();
}

// =================== EASTER EGG ===================
(function easterEgg() {
  var brand = document.querySelector('.brand');
  if (!brand) return;
  var clicks = 0, last = 0;
  brand.addEventListener('click', function () {
    var now = Date.now();
    if (now - last > 800) clicks = 0;
    last = now;
    clicks++;
    if (clicks >= 5) {
      clicks = 0;
      CF.burst(innerWidth / 2, innerHeight / 2, 120);
      Sound.fanfare();
      var names = ['Commander', 'Explorer', 'Star Captain', 'Cosmic Cadet', 'Space Scout'];
      var name = names[Math.floor(Math.random() * names.length)];
      showToast('🚀 Secret unlocked! You are an honorary ' + name + '!');
    }
  });
})();

// =================== INIT ===================
function init() {
  CF.init();
  Mascot.init();
  addSoundToggle();
  watchRelicPage();
  setTimeout(checkBadges, 600);
  console.log('[FG Fun] loaded');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for debugging
window.FGFun = { Sound: Sound, CF: CF, Mascot: Mascot, BADGES: BADGES };
})();
</script>
<!-- === /FG FUN SCRIPT === -->
"""

def patch_file(src, dst):
    if not os.path.exists(src):
        print('  SKIP (not found):', src); return
    s = open(src, encoding='utf-8').read()
    if 'fg-fun-theme' in s:
        print('  ' + src + ': already patched, writing unchanged copy')
        open(dst, 'w', encoding='utf-8').write(s); return
    if '</head>' in s:
        s = s.replace('</head>', HEAD + '</head>', 1)
    else:
        print('  WARN: no </head> in', src)
    i = s.rfind('</body>')
    if i < 0:
        print('  ERROR: no </body> in', src); return
    s = s[:i] + BODY_JS + s[i:]
    open(dst, 'w', encoding='utf-8').write(s)
    print('  wrote ' + dst + ' (' + str(len(s)//1024) + ' KB)')

def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else '.'
    print('Adding fun elements to:', os.path.abspath(folder))
    patch_file(os.path.join(folder, 'index.html'),  os.path.join(folder, 'index.new.html'))
    patch_file(os.path.join(folder, 'mobile.html'), os.path.join(folder, 'mobile.new.html'))
    print('\nDone. Test index.new.html and mobile.new.html, then run swap_html.py.')

if __name__ == '__main__':
    main()
