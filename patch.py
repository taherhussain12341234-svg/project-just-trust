#!/usr/bin/env python3
"""Galactic Field Guide upgrade. Run in the folder holding index.html and mobile.html:
   python3 patch.py
Writes index.new.html and mobile.new.html (your originals are untouched)."""
import re, sys, os

CSS = r"""
.skyfx::after{content:'';position:absolute;inset:0;background-image:radial-gradient(1.4px 1.4px at 20px 30px,#fffc,#0000),radial-gradient(1px 1px at 120px 90px,#fffb,#0000),radial-gradient(1.4px 1.4px at 210px 20px,#fff9,#0000);background-size:260px 140px;opacity:.5}
header.top{box-shadow:0 8px 28px #0d2f5514}
.card{box-shadow:inset 0 1px 0 #ffffff90,0 1px 2px #0d2f5510,0 16px 38px #3b9be01c}
.btn:active{transform:translateY(1px)}h1,h2,h3{text-wrap:balance}
.fgtb{font:800 11px var(--fh);color:#fff;background:linear-gradient(180deg,#ff78b1,#ff5a9f);border:0;border-radius:8px;padding:5px 10px;cursor:pointer;white-space:nowrap}
.fgo{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:radial-gradient(120% 90% at 50% 0%,#17497e,#0a2340 60%,#050d1f);color:#eaf6ff;font-family:var(--fb);opacity:0;pointer-events:none;transition:opacity .5s;overflow:auto}
.fgo.on{opacity:1;pointer-events:auto}.fgo canvas{position:fixed;inset:0;width:100%;height:100%}
.fgo.lt{background:rgba(5,13,31,.62);backdrop-filter:blur(6px)}
.fgi{position:relative;max-width:640px;text-align:center}
.fgi h1{font:800 clamp(30px,6vw,52px)/1.05 var(--fh);color:#fff;margin:0 0 16px}
.fgi h1 em{font-style:normal;color:#ff8cc0}
.fgl{font-size:clamp(16px,2.6vw,20px);margin:8px 0;opacity:0;transform:translateY(8px);transition:all .6s}.fgl.on{opacity:1;transform:none}
.fgb{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:24px;opacity:0;transition:opacity .6s}.fgb.on{opacity:1}
.fgb .btn{align-self:auto;min-height:44px}
.fgc{position:relative;background:var(--card);color:var(--p);border:1px solid var(--line);border-radius:18px;padding:24px;width:min(720px,94vw);max-height:88vh;overflow:auto;box-shadow:0 24px 60px #0008}
.fgc h2{font-size:26px;margin:6px 0 8px}.fgc p{margin:0 0 10px}.fgc .label{display:inline-block}
.fgxb{position:absolute;top:10px;right:12px;border:0;background:var(--chip);color:var(--ink);width:34px;height:34px;border-radius:10px;font-size:20px;cursor:pointer}
.fgbtn{display:flex;gap:10px;flex-wrap:wrap}.fgbtn .btn{min-height:44px}
.fgli{list-style:none;padding:0;margin:0 0 14px;display:grid;gap:6px}
.fgli li{padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--soft);font-size:13.5px}
.fgli li.ok::after{content:' \2713';color:var(--teal);font-weight:800}
.fgg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:10px 0}
.fgg a{display:block;border-radius:12px;overflow:hidden;border:1px solid var(--line);background:var(--card);text-decoration:none;color:var(--ink)}
.fgg img{width:100%;height:110px;object-fit:cover;display:block;background:#0f3a63}.fgg span{display:block;padding:6px 8px;font:600 11.5px var(--fb)}
.fgs{font-size:12.5px}.fgs a{color:#1b78c2}
.fgt{position:fixed;left:50%;bottom:46px;transform:translateX(-50%);width:min(760px,94vw);z-index:900;display:none;background:var(--glass);backdrop-filter:blur(14px);border:1px solid var(--line);border-radius:18px;padding:12px 16px;box-shadow:0 18px 44px #0d2f5538}
.fgt.on{display:block}.mobx .fgt{bottom:calc(78px + env(safe-area-inset-bottom))}
.fgtc{margin:0 0 8px;font:600 15px/1.45 var(--fb);color:var(--ink);min-height:2.9em}
.fgp{height:6px;background:var(--line);border-radius:9px;overflow:hidden}.fgp i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--pink),var(--pink2))}
.fgtr{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}.fgtn{font:700 12px var(--fh);color:var(--pinkd)}
.bk-foot .swipe{display:block;flex:1;margin:0 14px;align-self:center;text-align:center;font:600 13px var(--fb);color:var(--mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mobx .bk-foot .swipe{display:none}
.fgsl{margin:0 0 10px;padding:10px 14px;border-radius:12px;background:var(--t1);border:1px solid var(--t1l);font-size:14px}.fgsl em{display:block;font-style:normal;font-weight:800;color:var(--pinkd)}
.fgnb{flex:none;align-self:center;white-space:nowrap}
#labq{display:flex;flex-direction:column;flex:1;min-height:0;gap:8px}
"""

JS = r"""
(function(){
var DOC=document.documentElement;if(MOB)DOC.classList.add('mobx');
var ST={a15:['The car that folded itself onto a spaceship','1971: it unfolds beside the lunar module and drives away.','Parked at the Apollo 15 site for good. Its batteries could not be recharged.'],
s3:['The robot that waited for visitors','1967: it lands, bounces twice, then digs and takes pictures.','1969: astronauts snip off its camera and bring it home. The rest stays.'],
a12:['The landing that hit its target','1969: lightning strikes the rocket, yet Intrepid lands near Surveyor 3.','The top half lifts off and is crashed on purpose. The bottom half stays.'],
a11:['The first footprints','1969: Eagle lands and two people step onto the Moon.','The top half returns to Columbia. The landing stage stays at Tranquility Base.'],
pv:['The rover building a library of rocks','2021: a sky crane lowers it into Jezero Crater.','It cannot fly home, so it keeps exploring and carrying its sealed tubes.'],
ig:['The helicopter that was only a test','2021: the first powered flight on another planet.','2024: a damaged rotor ends its flying after 72 flights. The idea worked.'],
jz:['The time capsule on Mars','2023: Perseverance lays 10 sealed tubes on the ground.','Waiting. No ride home is funded right now.']};
var NQ={a15:'Apollo 15 lunar roving vehicle',s3:'Surveyor 3 Apollo 12',a12:'Apollo 12 lunar module Intrepid',a11:'Apollo 11 lunar module Eagle',pv:'Perseverance rover Jezero',ig:'Ingenuity helicopter Mars',jz:'Perseverance Three Forks sample depot'};
var SL={a15:[['NASA Apollo Lunar Surface Journal','https://history.nasa.gov/alsj/']],a12:[['NASA Apollo Lunar Surface Journal','https://history.nasa.gov/alsj/']],a11:[['NASA Apollo Lunar Surface Journal','https://history.nasa.gov/alsj/']],
s3:[['NASA Surveyor 3','https://science.nasa.gov/mission/lunar-rangers-and-surveyors/surveyor-3/']],pv:[['NASA Mars 2020 Perseverance','https://science.nasa.gov/mission/mars-2020-perseverance/']],
ig:[['NASA Ingenuity','https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/']],jz:[['NASA Mars Sample Return','https://science.nasa.gov/mission/mars-sample-return/']]};
var RS={a15:'about 10 ft (3.1 m) long, a bit shorter than a small car',a12:'about 23 ft (7 m) tall with its legs out',a11:'about 23 ft (7 m) tall with its legs out',pv:'about 10 ft (3 m) long, car-sized',ig:'about 19 in (49 cm) tall, with blades 4 ft (1.2 m) across'};
for(var k in RS)if(window.LABINTRO&&LABINTRO[k])LABINTRO[k]+=' Real size: '+RS[k]+'.';
function el(t,c){var e=document.createElement(t);if(c)e.className=c;DOC.appendChild(e);return e}
function modal(h){var o=el('div','fgo lt on');o.innerHTML='<div class="fgc" role="dialog" aria-modal="true">'+h+'<button class="fgxb" aria-label="Close">\u00d7</button></div>';
 o.close=function(){o.classList.remove('on');setTimeout(function(){o.remove()},350)};o.querySelector('.fgxb').onclick=o.close;o.addEventListener('click',function(e){if(e.target===o)o.close()});return o}
addEventListener('keydown',function(e){if(e.key==='Escape'){var m=document.querySelectorAll('.fgo.lt.on');if(m.length)m[m.length-1].close()}});
/* opening */
function stars(c,host){var x=c.getContext('2d'),w,h,S=[];function fit(){w=c.width=host.clientWidth||innerWidth;h=c.height=host.clientHeight||innerHeight}fit();addEventListener('resize',fit);
 for(var i=0;i<140;i++)S.push([Math.random(),Math.random(),Math.random()*1.6+.3,Math.random()*.0004+.0001]);
 function pl(cx,cy,r,a,b){var g=x.createRadialGradient(cx-r*.3,cy-r*.3,r*.1,cx,cy,r);g.addColorStop(0,a);g.addColorStop(1,b);x.globalAlpha=1;x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,6.3);x.fill()}
 (function f(){if(!c.isConnected)return;x.clearRect(0,0,w,h);S.forEach(function(s){s[1]=(s[1]+s[3])%1;x.globalAlpha=.4+.6*Math.abs(Math.sin(s[1]*40+s[0]*9));x.fillStyle='#fff';x.fillRect(s[0]*w,s[1]*h,s[2],s[2])});
 var m=Math.min(w,h);pl(w*.16,h+m*.08,m*.5,'#d9deea','#5b647d');pl(w*.88,h+m*.1,m*.4,'#ff9a6b','#8a3b24');requestAnimationFrame(f)})()}
function intro(){var o=el('div','fgo on');o.setAttribute('role','dialog');o.setAttribute('aria-label','Welcome');
 o.innerHTML='<canvas></canvas><div class="fgi"><h1>Machines we left behind, <em>stories we never finished</em></h1><p class="fgl">1967: a robot lands on the Moon.</p><p class="fgl">1969: two people walk over to visit it.</p><p class="fgl">2021: a helicopter flies on Mars.</p><p class="fgl">None of them came home. Can you find them all?</p><div class="fgb"><button class="btn" id="fgGo">Begin the mission</button><button class="btn alt" id="fgTr">Watch the 2-minute tour</button><button class="btn ghost" id="fgSk">Skip</button></div></div>';
 stars(o.querySelector('canvas'),o);var L=o.querySelectorAll('.fgl'),B=o.querySelector('.fgb'),n=0,tm=setInterval(function(){if(n<L.length)L[n++].classList.add('on');else{B.classList.add('on');clearInterval(tm)}},1300);
 function end(){clearInterval(tm);o.classList.remove('on');setTimeout(function(){o.remove()},600);try{sessionStorage.setItem('fgSeen','1')}catch(e){}}
 o.querySelector('#fgGo').onclick=function(){end();show('moon')};o.querySelector('#fgSk').onclick=end;o.querySelector('#fgTr').onclick=function(){end();tourStart()};
 setTimeout(function(){B.classList.add('on')},9000)}
/* NASA live */
var NC={};
function nasa(id){var c=CR.find(function(x){return x.id==id}),q=NQ[id];
 var lk=(SL[id]||[]).concat([['Search all NASA photos','https://images.nasa.gov/search?q='+encodeURIComponent(q)]]).map(function(l){return '<a href="'+l[1]+'" target="_blank" rel="noopener">'+l[0]+'</a>'}).join(' \u00b7 ');
 var o=modal('<span class="label a">Live from NASA</span><h2>'+c.n+'</h2><p>Official photos from the NASA Image and Video Library. Tap one to open its NASA record.</p><div class="fgg" id="fgg">Contacting NASA\u2026</div><p class="fgs">Check the facts: '+lk+'</p>'),g=o.querySelector('#fgg');
 function paint(items){g.textContent='';items.slice(0,4).forEach(function(it){var d=(it.data||[])[0]||{},l=(it.links||[])[0];if(!l)return;var a=document.createElement('a');a.href='https://images.nasa.gov/details/'+encodeURIComponent(d.nasa_id||'');a.target='_blank';a.rel='noopener';var im=new Image();im.loading='lazy';im.alt=d.title||'NASA image';im.src=l.href;var s=document.createElement('span');s.textContent=(d.title||'NASA image')+' \u00b7 '+(d.nasa_id||'');a.appendChild(im);a.appendChild(s);g.appendChild(a)});if(!g.children.length)g.textContent='No photos found right now.'}
 if(NC[id])return paint(NC[id]);var ac=window.AbortController?new AbortController():null,to=setTimeout(function(){ac&&ac.abort()},9000);
 fetch('https://images-api.nasa.gov/search?media_type=image&q='+encodeURIComponent(q),ac?{signal:ac.signal}:{}).then(function(r){return r.json()}).then(function(j){clearTimeout(to);NC[id]=j.collection.items;paint(NC[id])}).catch(function(){g.textContent='Could not reach NASA right now (are you offline?). Use the links below instead.'})}
/* chapters */
function chap(){var o=modal('<span class="label">Chapter complete</span><h2>The Moon is finished. Mars is next.</h2><p>You followed four Moon stories: a buggy, a robot and two landers. All of them stayed behind. On Mars, the machines are still working.</p><div class="fgbtn"><button class="btn" id="fgM">Go to Mars</button></div>');o.querySelector('#fgM').onclick=function(){o.close();show('mars')}}
function finale(tour){var n=CR.filter(function(c){return[1,2,3].every(function(p){return vis.has(c.id+p)})}).length;if(!FG.fin){FG.fin=1;addXP(50)}
 var li=CR.map(function(c,i){var d=[1,2,3].every(function(p){return vis.has(c.id+p)});return '<li class="'+(d?'ok':'')+'"><b>'+(i+1)+'. '+c.n+'</b>: '+ST[c.id][0]+'</li>'}).join('');
 var o=modal('<span class="label t">Mission complete</span><h2>Seven machines, seven stories</h2><p>You have '+xp+' XP and finished '+n+' of 7 chapters'+(FG.qd?', plus '+FG.qd+' 3D quest'+(FG.qd>1?'s':''):'')+'. Every one of these machines is still out there.</p><ul class="fgli">'+li+'</ul><div class="fgbtn"><button class="btn" id="fgR">Open the radar map</button><button class="btn alt" id="fgT">Replay the 2-minute tour</button></div>');
 o.querySelector('#fgR').onclick=function(){o.close();tourStop();show('radar')};o.querySelector('#fgT').onclick=function(){o.close();tourStart()};if(tour)o.querySelector('.fgxb').addEventListener('click',tourStop)}
/* story banner */
function afterBook(){var c=CR.find(function(x){return x.id==cid}),s=ST[cid],t=$('#ctag');if(!c||!s)return;
 t.textContent='Chapter '+(CR.indexOf(c)+1)+' of 7 \u00b7 '+c.tag;
 var b=['START','END','YOUR TURN'][cpg-1],x=cpg==1?s[1]:cpg==2?s[2]:'Test what you remember about: '+s[0]+'.';
 var sw=$('.bk-foot .swipe');if(sw)sw.innerHTML='<b>'+b+'</b> '+x;
 if(MOB){var bk=$('#bk');if(bk)bk.insertAdjacentHTML('afterbegin','<div class="fgsl"><em>'+s[0]+'</em><b>'+b+'</b> '+x+'</div>')}
 var pk=$('#pick');if(pk&&!$('#fgNB')){var n=document.createElement('button');n.id='fgNB';n.className='chip fgnb';n.textContent='\ud83d\udce1 NASA photos';n.onclick=function(){nasa(cid)};pk.appendChild(n)}}
function next(){if(cw=='moon')chap();else finale()}
/* 3D quest */
var Q={l:[],i:0,ok:0,lock:0,miss:0};
function labUI(){var tb=$('#labtabs');if(!tb||$('#labq'))return;var b=document.createElement('button');b.className='chip';b.dataset.lt='quest';b.textContent='Quest';tb.appendChild(b);
 var q=document.createElement('div');q.id='labq';q.style.display='none';$('#labs').parentNode.appendChild(q);
 var t=$('.labtools');if(t){var n=document.createElement('button');n.textContent='\ud83d\udce1 NASA';n.onclick=function(){nasa(LAB.id)};t.appendChild(n)}}
function qs(){Q.l=shuf(Object.keys(LP[LAB.id])).slice(0,5);Q.i=0;Q.ok=0;Q.lock=0;Q.miss=0;qr()}
function qr(){var q=$('#labq');if(!q)return;var id=LAB.id;
 if(Q.i>=Q.l.length){FG.qd++;addXP(30);q.innerHTML='<span class="label t">Quest complete</span><h3>'+Q.ok+' of '+Q.l.length+' parts found on the first try</h3><p class="lead">Nice engineering eyes! Run the simulation to see the parts working together.</p><div class="sbtns"><button class="btn" id="qa">Play again</button><button class="chip" id="qsm">Open simulation</button></div>';$('#qa').onclick=qs;$('#qsm').onclick=function(){LAB.setTab('sim')};return}
 var k=Q.l[Q.i];q.innerHTML='<span class="label t">Part quest \u00b7 '+(Q.i+1)+' of '+Q.l.length+'</span><h3>Tap the part that does this</h3><div class="note">'+LP[id][k][1]+'</div><div class="msg" id="qm">Tap the part on the 3D model.</div><div class="sbtns"><button class="chip" id="qh">Hint</button><button class="chip" id="qk">Skip</button></div>';
 $('#qh').onclick=function(){LAB.hover=k;setTimeout(function(){if(LAB.hover===k)LAB.hover=null},1800)};$('#qk').onclick=function(){Q.i++;Q.miss=0;Q.lock=0;qr()}}
function onPart(k){if(!FG.quest||!k||Q.lock||Q.i>=Q.l.length)return;var p=LP[LAB.id][k],m=$('#qm');if(!p||!m)return;
 if(k===Q.l[Q.i]){Q.lock=1;if(!Q.miss)Q.ok++;addXP(20);m.style.color='#0b9a7c';m.innerHTML='Yes! That is the <b>'+p[0]+'</b>. Did you know? '+p[2]+' <button class="chip" id="qn">Next</button>';$('#qn').onclick=function(){Q.i++;Q.miss=0;Q.lock=0;qr()}}
 else{Q.miss=1;m.style.color='#e05555';m.textContent='That is the '+p[0]+'. Not this one, look again!'}}
function onTab(t){FG.quest=t==='quest';if(FG.quest)qs()}
/* 2-minute tour */
function whenLab(cb){var n=0;(function p(){if(window.LAB&&LAB.ready&&LAB.craft)return cb(true);if(++n>40)return cb(false);setTimeout(p,300)})()}
function lab(id){return function(){show('lab');whenLab(function(ok){if(!ok){openFile(id);return}LAB.craft(id);LAB.setTab('sim');var b=$('#splay');if(b&&!LAB.sim.on)b.click()})}}
var TS=[{d:10,t:'Welcome to the Galactic Field Guide. Robots and rovers have left their footprints on the Moon and Mars. Every one has a story with a start, a middle and an end.',go:function(){show('home')}},
{d:13,t:'Story one: the Moon buggy. It rode to the Moon folded flat and drove 17 miles. When the astronauts left, it stayed, because every pound mattered for the trip home.',go:lab('a15')},
{d:13,t:'Story two: Surveyor 3. This robot dug the Moon soil and took pictures. Thirty-one months later, Apollo 12 astronauts walked over and brought its camera back to Earth.',go:lab('s3')},
{d:12,t:'Story three: the lunar module. Watch the top half blast off. The bottom half is the launch pad, so it stays on the Moon forever.',go:lab('a12')},
{d:12,t:'Every relic has an address. On the radar map, pins show where people and robots touched down. This one is Tranquility Base.',go:function(){show('radar');var c=$('#planet [data-pl="moon"]');if(c)c.click();var p=$('#plist [data-i="3"]');if(p)p.click()}},
{d:13,t:'Now Mars. Perseverance drills rock cores and seals them in tubes. It cannot launch itself home, so it keeps exploring while carrying its samples.',go:lab('pv')},
{d:12,t:'Ingenuity was a four pound helicopter built for five flights. It flew seventy two times, and proved that flying on Mars is possible.',go:lab('ig')},
{d:12,t:'At Three Forks, ten sealed tubes wait like a time capsule. Right now no ride home is funded, so this story is still unfinished.',go:lab('jz')},
{d:11,t:'Now it is your turn. Quizzes, matching games and puzzles help you remember every story.',go:function(){cw='mars';cid='pv';cpg=3;show('mars')}},
{d:12,t:'Seven machines, seven stories. Which one is your favorite? Pick a chapter and start exploring.',go:function(){finale(1)}}];
var cum=[],tot=0;TS.forEach(function(s){tot+=s.d;cum.push(tot)});var tms=0,tp=0,tc=-1,tt=0,narr=0,tb;
function tourUI(){tb=el('div','fgt');tb.setAttribute('role','region');tb.setAttribute('aria-label','Guided tour');
 tb.innerHTML='<p class="fgtc" aria-live="polite"></p><div class="fgp"><i></i></div><div class="fgtr"><span class="fgtn"></span><span><button class="chip" id="fgP">Pause</button> <button class="chip" id="fgS">Skip</button> <button class="chip" id="fgV">Voice: off</button> <button class="chip" id="fgE">End tour</button></span></div>';
 tb.querySelector('#fgP').onclick=function(){tp=!tp;this.textContent=tp?'Play':'Pause';if(window.speechSynthesis){tp?speechSynthesis.pause():speechSynthesis.resume()}};
 tb.querySelector('#fgS').onclick=function(){tms=cum[Math.max(0,tc)]+1};tb.querySelector('#fgE').onclick=tourStop;
 tb.querySelector('#fgV').onclick=function(){narr=!narr;this.textContent='Voice: '+(narr?'on':'off');if(!narr&&window.speechSynthesis)speechSynthesis.cancel()};
 var h=document.querySelector('header.top .xpp');if(h){var b=document.createElement('button');b.className='fgtb';b.textContent='\u25b6 Tour';b.setAttribute('aria-label','Start the 2-minute tour');b.onclick=tourStart;h.appendChild(b)}}
function say(t){try{if(narr&&window.speechSynthesis){speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(t);u.rate=.97;speechSynthesis.speak(u)}}catch(e){}}
function tick(){if(tp)return;tms+=250;var i=-1;for(var j=0;j<cum.length;j++){if(tms<cum[j]){i=j;break}}
 if(i<0){tms=tot;return}tb.querySelector('.fgp i').style.width=(tms/tot*100)+'%';
 if(i!==tc){tc=i;tb.querySelector('.fgtc').textContent=TS[i].t;tb.querySelector('.fgtn').textContent='Tour '+(i+1)+' of '+TS.length;try{TS[i].go()}catch(e){}say(TS[i].t)}}
function tourStart(){document.querySelectorAll('.fgo').forEach(function(o){if(o.close)o.close()});tourStop(1);tms=0;tc=-1;tp=0;tb.classList.add('on');tt=setInterval(tick,250)}
function tourStop(q){clearInterval(tt);tt=0;if(tb)tb.classList.remove('on');try{if(window.speechSynthesis)speechSynthesis.cancel();if(window.LAB&&LAB.sim&&LAB.sim.on){var b=$('#splay');if(b)b.click()}}catch(e){}}
window.FG={quest:false,qd:0,fin:0,onPart:onPart,onTab:onTab,afterBook:afterBook,next:next,finale:finale,tour:tourStart};
function init(){labUI();tourUI();var s=0;try{s=sessionStorage.getItem('fgSeen')}catch(e){}if(!s)intro()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
"""

META = ('<title>Galactic Field Guide: Relics of the Moon &amp; Mars</title>'
 '<meta name="description" content="A kid-friendly NASA field guide to the machines left on the Moon and Mars, with 3D models, stories and games.">'
 '<meta name="theme-color" content="#cdeaff"><meta property="og:title" content="Galactic Field Guide: Relics of the Moon and Mars">'
 '<meta property="og:description" content="Seven machines, seven stories. Explore them in 3D.">')

R = [  # (old, new) applied to both files
 ('<title>Galactic Field Guide: Relics of the Moon &amp; Mars</title>', META),
 ("LAB.craft=craft;", "LAB.craft=craft;LAB.select=select;LAB.setTab=setTab;"),
 ("function select(k){LAB.sel=k;info(k);if(!k){return}controls.autoRotate=false;$('#lbSpin').classList.remove('on');setTab('learn');",
  "function select(k){LAB.sel=k;info(k);if(window.FG&&FG.onPart)FG.onPart(k);if(!k){return}controls.autoRotate=false;$('#lbSpin').classList.remove('on');if(!(window.FG&&FG.quest))setTab('learn');"),
 ("$('#labs').style.display=t==='sim'?'':'none'}",
  "$('#labs').style.display=t==='sim'?'':'none';var q=$('#labq');if(q)q.style.display=t==='quest'?'':'none';if(window.FG&&FG.onTab)FG.onTab(t)}"),
 ("else{show(cw=='moon'?'mars':'radar');return}", "else{FG.next();return}"),
 ("addXP(10,null)}markDone()}", "addXP(10,null)}markDone();if(window.FG)FG.afterBook()}"),
 ("It rests on Mars about a kilometer from Perseverance.", "It rests where it made its last landing in Jezero Crater."),
 ("Outfit,sans-serif", "Plus Jakarta Sans,sans-serif"),
 ("Outfit and Nunito Sans", "Plus Jakarta Sans and Nunito Sans"),
 ('<span>Meet it<small>What it is</small></span>', '<span>Start<small>the journey</small></span>'),
 ('<span>Why it stayed<small>and how it helps</small></span>', '<span>End<small>why it stayed</small></span>'),
 ('<span>Play<small>quiz and games</small></span>', '<span>Your turn<small>quiz and games</small></span>'),
 ("'\u2190 Back: Meet it'", "'\u2190 Back: Start'"), ("'\u2190 Back: Why it stayed'", "'\u2190 Back: End'"),
 ("'Next: Why it stayed \u2192'", "'Next: The ending \u2192'"), ("'Next: Play \u2192'", "'Next: Your turn \u2192'"),
 ('<button class="btn" data-go="moon">Explore the Moon</button>', '<button class="btn" data-go="moon">Start the story</button>'),
 ('<li><b>Rocket Balancer:</b>', '<li><b>NASA Live photos:</b> fetched when you tap the NASA button from the NASA Image and Video Library (images-api.nasa.gov). Credit: NASA. NASA does not endorse this site.</li><li><b>Rocket Balancer:</b>'),
 ('<script src="field-guide-plus.js"></script>', ''),
]

def build(src, dst):
    if not os.path.exists(src):
        print('SKIP (not found):', src); return
    s = open(src, encoding='utf-8').read()
    for old, new in R:
        if old in s: s = s.replace(old, new)
        else: print('  not found in', src, '->', old[:60].replace('\n', ' '))
    s = s.replace('</style></head>', CSS + '</style></head>', 1)
    i = s.rfind('</body>')
    s = s[:i] + '<script>' + JS + '</script>' + s[i:]
    open(dst, 'w', encoding='utf-8').write(s)
    print('wrote', dst, len(s) // 1024, 'KB')

if __name__ == '__main__':
    d = sys.argv[1] if len(sys.argv) > 1 else '.'
    build(os.path.join(d, 'index.html'), os.path.join(d, 'index.new.html'))
    build(os.path.join(d, 'mobile.html'), os.path.join(d, 'mobile.new.html'))
    print('Done. Open the .new.html files, test, then rename them to index.html and mobile.html.')
