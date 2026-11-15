/* journey.js — MINIMAL TEST. Does a spinning cube appear? */
console.log('TEST loaded');

(function(){
'use strict';

// Red banner so you see if anything crashes
var banner = document.createElement('div');
banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#7a1e1e;color:#fff;font:14px monospace;padding:12px;display:none';
document.body.appendChild(banner);
function err(m){ banner.style.display = 'block'; banner.textContent = 'TEST ERROR: ' + m; }

function go(){
  if (typeof window.THREE === 'undefined') {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
    s.onload = go;
    s.onerror = function(){ err('Three.js could not load'); };
    document.head.appendChild(s);
    return;
  }

  try {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#05080f';
    document.body.appendChild(ov);

    var lbl = document.createElement('div');
    lbl.style.cssText = 'position:absolute;top:20px;left:20px;color:#58d6f1;font:bold 16px monospace';
    lbl.textContent = 'TEST WORKING — cube should spin below';
    ov.appendChild(lbl);

    var r = new THREE.WebGLRenderer({ antialias: true });
    r.setSize(window.innerWidth, window.innerHeight);
    ov.appendChild(r.domElement);

    var sc = new THREE.Scene();
    sc.background = new THREE.Color(0x05080f);
    var cam = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 100);
    cam.position.set(0, 0, 5);
    sc.add(new THREE.AmbientLight(0xffffff, 1));

    var cube = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshBasicMaterial({ color: 0x58d6f1, wireframe: true })
    );
    sc.add(cube);

    (function loop(){
      requestAnimationFrame(loop);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.015;
      r.render(sc, cam);
    })();

    // Auto-close after 8 seconds
    setTimeout(function(){ ov.remove(); console.log('TEST PASSED'); }, 8000);

  } catch (e) {
    err(e.message);
  }
}

go();

})();
