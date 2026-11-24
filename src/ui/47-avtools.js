/* 47-avtools.js — "Kraštai" in the 3-D view's own toolbar (beside Surinkta / Be fasadų / Jungtys): opens the edge-banding
   check of this cabinet. The live widget rebuilds its toolbar on every mount, so the button is put back by an observer. */
function nvaAvBtn() {
  [].forEach.call(document.querySelectorAll('#app .av .av-tools'), function (tb) {
    if (tb.querySelector('[data-nv="ecall"]')) return;
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-nv', 'ecall'); b.className = 'nva-ec';
    b.textContent = '▭ ' + L('Kraštai', 'Edges'); b.title = L('Kraštų laminavimas: kurie kraštai klijuojami', 'Edge banding: which edges are banded');
    if (NV.r3off && typeof nv3Load === 'function') {   // back from the connector editor to the new 3-D picture
      var nb = document.createElement('button'); nb.type = 'button'; nb.setAttribute('data-nv', 'nv3back'); nb.className = 'nva-ec'; nb.textContent = '← ' + L('3D vaizdas', '3-D view'); tb.insertBefore(nb, tb.firstChild);
      var cb = tb.querySelector('[data-connectors]'); if (NV.r3off === 'joints' && cb && cb.getAttribute('aria-pressed') !== 'true') { NV.r3off = 'joints-on'; setTimeout(function () { cb.click(); }, 0); }
    }
    var ref = tb.querySelector('[data-connectors]'); if (ref && ref.nextSibling) tb.insertBefore(b, ref.nextSibling); else tb.appendChild(b);
  });
}
NVA.ecall = function () { NV.ecFocus = null; S.echeck = true; S.jcheck = false; };
new MutationObserver(nvaAvBtn).observe(app, { childList: true, subtree: true });
