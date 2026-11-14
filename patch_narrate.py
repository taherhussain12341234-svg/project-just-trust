#!/usr/bin/env python3
"""
patch_story.py
Makes the Galactic Field Guide look story-first: warmer palette, serif
display type, chapter framing, cinematic motion, better spacing, and
polished cards. Does NOT delete content — only restyles and re-labels.

Usage:
  python3 patch_story.py           # patches . in current folder
  python3 patch_story.py path/to   # patches in that folder
Writes index.new.html and mobile.new.html next to the originals.
"""

import os, sys

HEAD_INJECT = r"""
<!-- === FG STORY THEME (injected by patch_story.py) === -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style id="fg-story-theme">
:root{
  --fh:'Fraunces','Playfair Display',Georgia,serif;
  --fb:'Inter','Nunito Sans',system-ui,-apple-system,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,monospace;
  --ink:#1a1713;
  --p:#4a4136;
  --mute:#8a7e6d;
  --card:#fbf7ef;
  --soft:#f4ede0;
  --line:#e5dcc9;
  --pink:#d96a3f;
  --pink2:#f0a577;
  --pink3:#fbe4d3;
  --pinkd:#a34717;
  --sky:#3b6ea8;
  --sky3:#dde8f4;
  --teal:#5a8a63;
  --coral:#c65340;
  --glass:rgba(251,247,239,.82);
  --bg1:#f7f0e0;
  --bg2:#fbf6ec;
  --bg3:#ffffff;
  --chip:#f0e8d6;
}
@media(prefers-color-scheme:dark){
  :root{
    --ink:#f4ecdc;--p:#cfc4b2;--mute:#8f8574;
    --card:#1f1a14;--soft:#2a241b;--line:#3a3227;
    --pink:#f09168;--pink2:#f7b995;--pink3:#3d2820;--pinkd:#ffb98f;
    --sky:#7ea7d8;--sky3:#1e2a3a;
    --glass:rgba(31,26,20,.82);
    --bg1:#100d0a;--bg2:#181410;--bg3:#0a0807;
    --chip:#2a241b;
  }
}
body{
  font-family:var(--fb);
  background:
    radial-gradient(1200px 600px at 20% -10%, var(--pink3), transparent 60%),
    radial-gradient(900px 500px at 110% 10%, var(--sky3), transparent 60%),
    linear-gradient(180deg,var(--bg1),var(--bg2) 55%,var(--bg3)) fixed;
  color:var(--p);
  letter-spacing:-0.005em;
}
h1,h2,h3,h4{font-family:var(--fh);color:var(--ink);letter-spacing:-0.015em;font-weight:500}
h1{font-weight:500}h2{font-weight:500}h3{font-weight:600}
.hero h1{font-size:clamp(38px,6vw,64px);font-weight:400;line-height:1.02;letter-spacing:-0.03em}
.hero h1 em{font-style:italic;color:var(--pink);background:none;-webkit-text-fill-color:currentColor}
.hero p.sub{font-size:17px;line-height:1.6;max-width:520px;color:var(--p)}
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:0.22em;color:var(--pinkd);text-transform:uppercase}
.eyebrow::before{background:var(--pink);width:28px;height:2px}
.brand h1{font-family:var(--fh);font-weight:500;font-size:19px;letter-spacing:-0.02em}
.brand small{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;color:var(--mute);text-transform:uppercase}
header.top{background:rgba(251,247,239,.78);backdrop-filter:blur(14px) saturate(1.4);border-bottom:1px solid var(--line)}
@media(prefers-color-scheme:dark){header.top{background:rgba(31,26,20,.78)}}
.nv{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:500}
.nv.on::after{background:var(--pink);height:2px}
.card{
  border-radius:18px;
  border-color:var(--line);
  background:var(--card);
  box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 12px 30px -18px rgba(60,40,20,.35), 0 2px 6px -2px rgba(60,40,20,.10);
  padding:26px;
}
.card h2{font-size:26px;line-height:1.15;letter-spacing:-0.02em}
.card h3{font-size:17px;letter-spacing:-0.005em}
.btn{
  font-family:var(--fb);font-weight:600;font-size:14px;
  border-radius:11px;padding:13px 22px;letter-spacing:-0.005em;
  background:var(--ink);color:var(--card);
  box-shadow:0 1px 0 rgba(255,255,255,.14) inset, 0 8px 22px -10px rgba(30,20,10,.5);
  transition:transform .15s ease,box-shadow .2s ease,background .2s ease;
}
.btn:hover{transform:translateY(-1px);background:#2b2520;box-shadow:0 1px 0 rgba(255,255,255,.14) inset, 0 12px 26px -10px rgba(30,20,10,.6)}
.btn.alt{background:var(--pink);color:#fff;box-shadow:0 1px 0 rgba(255,255,255,.25) inset, 0 8px 22px -10px rgba(200,90,40,.6)}
.btn.alt:hover{background:#c25633}
.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line);box-shadow:none}
.btn.ghost:hover{background:var(--soft);border-color:var(--pink2)}
.chip{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-radius:8px;padding:8px 13px;border-color:var(--line);background:transparent;color:var(--ink)}
.chip.on{background:var(--ink);color:var(--card);border-color:var(--ink)}
.chip:hover{border-color:var(--pink2)}
.label{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;font-weight:500;color:var(--pinkd);background:var(--pink3);padding:5px 10px;border-radius:6px}
.label.a{color:var(--sky);background:var(--sky3)}
.stat{border-color:var(--line);border-radius:12px;background:transparent;padding:10px 14px}
.stat b{font-family:var(--fh);font-weight:500;font-size:22px;letter-spacing:-0.02em}
.stat span{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}
.note{border-left:2px solid var(--pink);background:var(--pink3);border-radius:0 10px 10px 0;padding:12px 16px;font-size:14px;line-height:1.55}
.note.b{border-color:var(--sky);background:var(--sky3)}
.note::before{content:'§';font-family:var(--fh);font-style:italic;color:var(--pinkd);margin-right:8px;font-size:16px}
.note.b::before{color:var(--sky)}
.feats{grid-template-columns:repeat(5,1fr);gap:12px}
.feat{
  background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;
  box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 6px 18px -12px rgba(60,40,20,.35);
  transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
}
.feat:hover{transform:translateY(-3px);border-color:var(--pink2);box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 14px 28px -14px rgba(60,40,20,.45)}
.feat b{background:var(--ink);box-shadow:none;border-radius:10px;width:36px;height:36px}
.feat b svg{color:var(--card)}
.feat h3{font-family:var(--fh);font-weight:500;font-size:15px;margin-bottom:3px}
.feat p{font-size:12.5px;line-height:1.45;color:var(--mute)}
.trust b{font-family:var(--fh);font-weight:500;font-size:28px;letter-spacing:-0.02em}
.trust span{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.dyk{border-radius:12px;background:var(--soft);border-color:var(--line);font-size:13.5px;padding:12px 16px}
.dyk b{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;color:var(--pinkd);text-transform:uppercase}
.ph{border:0;border-radius:14px;box-shadow:0 18px 38px -22px rgba(30,20,10,.55)}
.ph span{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:var(--ink);border-radius:5px;padding:4px 8px}
.pcap{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;background:var(--ink);border-radius:5px;padding:4px 9px}
.coord{font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--pinkd)}
.lead{font-family:var(--fh);font-size:16.5px;line-height:1.55;font-weight:400;color:var(--ink)}
.ff{font-size:14px;line-height:1.65}.ff li{margin-bottom:6px}.ff li::marker{color:var(--pink)}
.stp{font-size:14.5px;line-height:1.6}.stp li{margin-bottom:10px}.stp li::marker{font-family:var(--mono);color:var(--pink);font-weight:500}
/* --- Chapter stepper: story arcs --- */
.steps3{gap:4px}
.st{
  font-family:var(--fb);font-size:13px;font-weight:500;
  background:transparent;border:1px solid var(--line);border-radius:10px;padding:8px 14px 8px 8px;
  color:var(--p);
}
.st b{
  font-family:var(--fh);font-weight:500;font-size:15px;background:var(--soft);color:var(--ink);
  width:28px;height:28px;border-radius:8px;
}
.st small{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);display:block;margin-top:1px}
.st.on{background:var(--ink);border-color:var(--ink);color:var(--card);box-shadow:0 10px 22px -12px rgba(30,20,10,.6)}
.st.on b{background:var(--card);color:var(--ink)}
.st.on small{color:rgba(251,247,239,.72)}
.st.dn:not(.on) b{background:var(--teal);color:#fff}
.ln{background:var(--line);width:20px;height:2px}
.ln::after{background:var(--pink)}
/* --- Pull quote style for excerpts --- */
.p1 .info .lead{
  font-family:var(--fh);font-size:17px;line-height:1.55;font-weight:400;
  padding-left:16px;border-left:2px solid var(--pink);
  color:var(--ink);
}
.blk h4{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--pinkd);margin-bottom:6px}
.blk p{font-size:14.5px;line-height:1.6}
.blk.b{background:var(--card);border-color:var(--line)}
.blk.g{background:var(--sky3);border-color:var(--sky3)}
.blk.g h4{color:var(--sky)}
.tease{
  font-family:var(--fb);font-weight:500;font-size:14px;
  background:var(--soft);border:1px dashed var(--line);border-radius:11px;
  padding:12px 16px;color:var(--ink);
  transition:background .18s,border-color .18s;
}
.tease:hover{background:var(--pink3);border-color:var(--pink2)}
.tease span{font-family:var(--fh);font-size:22px;color:var(--pink)}
/* --- Map polish --- */
.mapwrap{border:0;border-radius:16px;box-shadow:0 20px 44px -22px rgba(30,20,10,.55)}
.hud{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;background:rgba(251,247,239,.92);border-radius:8px;padding:7px 12px}
.hud b{font-family:var(--fh);font-weight:500;letter-spacing:0;text-transform:none;font-size:14px;color:var(--ink)}
.hud button{font-family:var(--mono);font-size:11px;letter-spacing:.1em;background:var(--ink);color:var(--card);border-radius:7px}
.fl button{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;background:rgba(251,247,239,.92);border-radius:7px;padding:7px 11px;color:var(--ink)}
.fl button.on{background:var(--ink);color:var(--card)}
/* --- 3D Lab polish --- */
.labview{border:0;border-radius:16px;box-shadow:0 20px 44px -22px rgba(30,20,10,.55)}
.labhint,.labtools button{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;background:rgba(251,247,239,.92);border-radius:8px;color:var(--ink)}
.labtools button.on{background:var(--ink);color:var(--card)}
.labpanel{border-radius:16px}
#pinfo h3{font-family:var(--fh);font-weight:500}
#pinfo h4{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--pinkd)}
.plist .chip{font-size:10.5px;letter-spacing:.08em;padding:6px 10px}
.sstep li{font-size:13px;padding:8px 12px;border-radius:9px;line-height:1.45;border:1px solid transparent}
.sstep li.act{background:var(--pink3);border-color:var(--pink2)}
.sstep li::before{font-family:var(--mono);background:var(--soft);color:var(--ink)}
.sstep li.act::before{background:var(--pink);color:#fff}
.sbtns .btn{padding:10px 18px;font-size:13px}
/* --- Optional story intro band on home --- */
.fg-story-band{
  display:flex;flex-direction:column;gap:8px;
  padding:22px 24px;border-radius:16px;
  background:linear-gradient(120deg,var(--pink3),var(--sky3) 85%);
  border:1px solid var(--line);
  margin-bottom:14px;
}
.fg-story-band .eyebrow{margin:0}
.fg-story-band h2{font-family:var(--fh);font-weight:400;font-size:clamp(22px,3.2vw,30px);line-height:1.2;margin:0;color:var(--ink);max-width:640px}
.fg-story-band p{margin:0;font-size:14px;line-height:1.55;color:var(--p);max-width:640px}
@media(prefers-color-scheme:dark){.fg-story-band{background:linear-gradient(120deg,#3d2820,#1e2a3a 85%)}}
/* --- Chapter number badge --- */
#ctag::before{content:'Chapter ';font-family:var(--mono);font-size:0}
</style>
<noscript><style>.fg-story-band{display:none}</style></noscript>
<!-- === /FG STORY THEME === -->
"""

STORY_BAND = r"""
<!-- === FG STORY BAND (injected by patch_story.py) === -->
<div class="fg-story-band" role="region" aria-label="Story introduction">
  <span class="eyebrow">Why this guide exists</span>
  <h2>Seven machines. Seven unfinished stories. All left behind on purpose.</h2>
  <p>Somebody put these things on the Moon and Mars and could not bring them home. That is not a mistake. It is the most interesting part. This guide turns each one into a short chapter: what it was, why it stayed, and what it still teaches us.</p>
</div>
"""

LABELS = [
  ('<span>Meet it<small>What it is</small></span>', '<span>Start<small>The journey</small></span>'),
  ('<span>Why it stayed<small>and how it helps</small></span>', '<span>End<small>Why it stayed</small></span>'),
  ('<span>Play<small>quiz and games</small></span>', '<span>Your turn<small>Quiz + games</small></span>'),
  ("'\u2190 Back: Meet it'", "'\u2190 Back: Start'"),
  ("'\u2190 Back: Why it stayed'", "'\u2190 Back: End'"),
  ("'Next: Why it stayed \u2192'", "'Next: The ending \u2192'"),
  ("'Next: Play \u2192'", "'Next: Your turn \u2192'"),
  ('<button class="btn" data-go="moon">Explore the Moon</button>',
   '<button class="btn" data-go="moon">Start the story</button>'),
]

def patch_file(src, dst):
    if not os.path.exists(src):
        print('SKIP (not found):', src); return
    s = open(src, encoding='utf-8').read()

    if 'fg-story-theme' in s:
        print('  ' + src + ': already patched, writing unchanged copy')
        open(dst, 'w', encoding='utf-8').write(s); return

    # 1. inject theme CSS right before </head>
    if '</head>' in s:
        s = s.replace('</head>', HEAD_INJECT + '</head>', 1)
    else:
        print('  WARN: no </head> in', src)

    # 2. inject story band at top of #home section
    if '<section id="home">' in s:
        s = s.replace('<section id="home">', '<section id="home">' + STORY_BAND, 1)
    else:
        print('  WARN: no <section id="home"> in', src)

    # 3. relabel chapter step names + button text
    for old, new in LABELS:
        if old in s:
            s = s.replace(old, new)
        else:
            print('  note: not found (', old[:50].replace('\n', ' '), '...)')

    open(dst, 'w', encoding='utf-8').write(s)
    print('  wrote ' + dst + ' (' + str(len(s)//1024) + ' KB)')

def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else '.'
    print('Applying story theme in:', os.path.abspath(folder))
    patch_file(os.path.join(folder, 'index.html'),  os.path.join(folder, 'index.new.html'))
    patch_file(os.path.join(folder, 'mobile.html'), os.path.join(folder, 'mobile.new.html'))
    print('\nDone. Test index.new.html and mobile.new.html.')
    print('Then run swap_html.py to make them live.')

if __name__ == '__main__':
    main()
