
/* Material look, per project: a colour and / or a texture photo for a board name (S.proj.look), for the 3-D renders and the
   front pictures. DBLook.set(map), map[name] = { color:'#rrggbb', tex:'data:image/…', mm:<width of the photo on the board, mm>,
   rot:<the photo's grain runs up its height> }. A photo is decoded once (≤ 1024 px); DBLook.on(fn) is told when one is ready. */
(function (root) {
'use strict';
var looks = {}, sig = '', ver = 0, cache = {}, listeners = [];
function key(n) { return String(n == null ? '' : n).trim(); }
function set(map) {
  map = map || {};
  var s = Object.keys(map).sort().map(function (k) { var l = map[k] || {}; return k + '\u0001' + (l.color || '') + '\u0001' + (l.tex ? l.tex.length + l.tex.slice(-40) : '') + '\u0001' + (l.mm || '') + '\u0001' + (l.rot ? 1 : 0); }).join('\u0002');
  if (s === sig) return false;
  sig = s; looks = {}; Object.keys(map).forEach(function (k) { if (map[k]) looks[key(k)] = map[k]; }); ver++; return true;
}
function get(name) { return looks[key(name)] || null; }
function load(k, l) {
  var c = cache[k]; if (c && c.src === l.tex) return c;
  c = cache[k] = { src:l.tex, ready:false };
  if (typeof Image === 'undefined' || typeof document === 'undefined') return c;
  var im = new Image();
  im.onload = function () {
    if (cache[k] !== c) return;
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, sc = Math.min(1, 2048 / Math.max(w, h, 1)); w = Math.max(1, Math.round(w * sc)); h = Math.max(1, Math.round(h * sc));
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(im, 0, 0, w, h);
    var d = cx.getImageData(0, 0, w, h).data, r = 0, g = 0, b = 0, n = 0;
    for (var i = 0; i < d.length; i += 16) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    c.w = w; c.h = h; c.d = d; c.levels = mips(d, w, h);
    c.avg = '#' + [r, g, b].map(function (v) { v = Math.round(v / Math.max(1, n)); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); c.ready = true; ver++;
    listeners.forEach(function (f) { try { f(k); } catch (er) {} });
  };
  im.onerror = function () { c.bad = true; };
  im.src = l.tex; return c;
}
/* the photo at halves of its size (2 × 2 averages), down to a few pixels: far boards sample a smaller level and do not shimmer */
function mips(d, w, h) {
  var out = [{ w:w, h:h, d:d }];
  while (out.length < 14 && (w > 4 || h > 4)) {
    var w2 = Math.max(1, w >> 1), h2 = Math.max(1, h >> 1), d2 = new Uint8ClampedArray(w2 * h2 * 4);
    for (var y = 0; y < h2; y++) for (var x = 0; x < w2; x++) {
      var x0 = Math.min(w - 1, 2 * x), x1 = Math.min(w - 1, 2 * x + 1), y0 = Math.min(h - 1, 2 * y), y1 = Math.min(h - 1, 2 * y + 1), o = (y * w2 + x) * 4;
      for (var ch = 0; ch < 3; ch++) d2[o + ch] = (d[(y0 * w + x0) * 4 + ch] + d[(y0 * w + x1) * 4 + ch] + d[(y1 * w + x0) * 4 + ch] + d[(y1 * w + x1) * 4 + ch] + 2) >> 2;
      d2[o + 3] = 255; }
    out.push({ w:w2, h:h2, d:d2 }); d = d2; w = w2; h = h2;
  }
  return out;
}
/* the decoded photo: { w, h, levels, k: photo pixels per mm when it repeats at its real size, fit: laid once over each board } — null while loading */
function tex(name) { var k = key(name), l = looks[k]; if (!l || !l.tex) return null; var c = load(k, l); return c.ready ? { w:c.w, h:c.h, d:c.d, levels:c.levels, k:c.w / Math.max(20, +l.mm || 1000), fit:l.fit !== false } : null; }
/* a colour lookup for one face: f(x, y, z) → 0xRRGGBB. ppm: screen pixels per mm on that face (picks the photo level, so no shimmer
   far away and no blocks close up: bilinear). Laid once over the board ("fit", the default): the photo covers the board's length and width
   (cropped in the middle, never repeated); at a real size (mm): it repeats, mirrored, so plain photos show no hard seams. */
function sampler(tx, ppm) {
  var T = tex(tx.name); if (!T) return null;
  var O = tx.O, U = tx.U, V = tx.V, k, s0 = 0, t0 = 0, fit = T.fit && tx.Lu > 0 && tx.Lv > 0;
  if (fit) { k = Math.min(T.w / tx.Lu, T.h / tx.Lv); s0 = (T.w - tx.Lu * k) / 2; t0 = (T.h - tx.Lv * k) / 2; } else k = T.k;
  var tpp = k / Math.max(1e-6, ppm), lv = 0; while (tpp > 1.4 && lv < T.levels.length - 1) { tpp /= 2; lv++; }
  var Lv = T.levels[lv], sc = Lv.w / T.w, d = Lv.d, w = Lv.w, h = Lv.h, w2 = 2 * w, h2 = 2 * h;
  var cx = fit ? function (i) { return i < 0 ? 0 : i >= w ? w - 1 : i; } : function (i) { i %= w2; if (i < 0) i += w2; return i >= w ? w2 - 1 - i : i; };
  var cy = fit ? function (j) { return j < 0 ? 0 : j >= h ? h - 1 : j; } : function (j) { j %= h2; if (j < 0) j += h2; return j >= h ? h2 - 1 - j : j; };
  var U0 = U[0] * k * sc, U1 = U[1] * k * sc, U2 = U[2] * k * sc, V0 = V[0] * k * sc, V1 = V[1] * k * sc, V2 = V[2] * k * sc, S0 = s0 * sc - 0.5, T0 = t0 * sc - 0.5;
  return function (x, y, z) {
    x -= O[0]; y -= O[1]; z -= O[2];
    var s = x * U0 + y * U1 + z * U2 + S0, t = x * V0 + y * V1 + z * V2 + T0, i = Math.floor(s), j = Math.floor(t), fs = s - i, ft = t - j;
    var a = cx(i), b = cx(i + 1), r0 = cy(j) * w, r1 = cy(j + 1) * w, p00 = (r0 + a) * 4, p10 = (r0 + b) * 4, p01 = (r1 + a) * 4, p11 = (r1 + b) * 4;
    var w00 = (1 - fs) * (1 - ft), w10 = fs * (1 - ft), w01 = (1 - fs) * ft, w11 = fs * ft;
    return ((d[p00] * w00 + d[p10] * w10 + d[p01] * w01 + d[p11] * w11) << 16) | ((d[p00 + 1] * w00 + d[p10 + 1] * w10 + d[p01 + 1] * w01 + d[p11 + 1] * w11) << 8) | (d[p00 + 2] * w00 + d[p10 + 2] * w10 + d[p01 + 2] * w01 + d[p11 + 2] * w11);
  };
}
function color(name) { var k = key(name), l = looks[k]; if (!l) return null; if (l.tex) { var c = load(k, l); if (c.ready && c.avg) return c.avg; } return l.color || null; }   // a texture photo wins over a colour set earlier (as in the 3-D views)
function has(name) { var l = looks[key(name)]; return !!(l && l.tex); }
/* where the photo lies on one face of a board: O its corner, U along the grain (the board's length unless turned), V across;
   axes: the board's own axes (unit vectors), g: which of them is its length, n: the face's normal */
function frame(name, O, axes, g, n, ext) {
  var l = looks[key(name)]; if (!l || !l.tex) return null;
  var dt = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }, inPl = [0, 1, 2].filter(function (k) { return Math.abs(dt(axes[k], n)) < 0.5; });
  if (inPl.length < 2) return null;
  var u = inPl.indexOf(g) >= 0 ? g : inPl[0], v = inPl[0] === u ? inPl[1] : inPl[0];
  if (l.rot) { var tmp = u; u = v; v = tmp; }
  var e = ext || [0, 0, 0], Lg = +e[g] || 0, Lw = Math.max.apply(null, [0, 1, 2].filter(function (k) { return k !== g; }).map(function (k) { return +e[k] || 0; }));   // the board's length (grain) and width
  return { name:key(name), O:O.slice(), U:axes[u].slice(), V:axes[v].slice(), Lu:l.rot ? Lw : Lg, Lv:l.rot ? Lg : Lw };
}
root.DBLook = { set:set, get:get, tex:tex, color:color, has:has, frame:frame, sampler:sampler, version:function () { return ver; }, on:function (f) { listeners.push(f); } };
})(typeof window !== 'undefined' ? window : this);
