/* 65-produced.js — "Pagaminta": the exact version that was manufactured.
   When a project has passed the check and its files went to the workshop, it is marked as produced. That
     · writes a record into the project (p.prod): when, by whom, which build of this app, the workshop rules in force,
       and a fingerprint of every CNC program and of the part list;
     · keeps the very package that was produced — the same ZIP that "Atsisiųsti viską" gives, byte for byte — in this
       browser (IndexedDB) and downloads it once, so the workshop has the file;
     · locks the project: whatever is tried, it goes back to what was produced (nvpGuard in save()). Changes are made in a
       new version — a copy with the next revision number; the produced one stays as it is.
   Whenever a produced project is opened it is built again with its own rules and compared with the fingerprints: if this
   app (or the data) would now give something else, it says so — and only the kept package is offered. */
var NVP_DB = 'dbKurejasProduced';
function nvpIs(p) { return !!(p && p.prod && p.prod.at); }
function nvpHash(s) {   // cyrb53: a fingerprint of a text (not a secret) — enough to see that two outputs are the same
  s = String(s); var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (var i = 0, ch; i < s.length; i++) { ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16) + '0000000000000000').slice(0, 16);
}
/* the project's own data, in one fixed form: opening a project fills in fields a cabinet did not have yet (normCab) and the
   order of keys is nobody's promise — neither may read as "the data was changed" */
function nvpCanon(v) {
  if (Array.isArray(v)) return '[' + v.map(nvpCanon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined && typeof v[k] !== 'function'; }).map(function (k) { return JSON.stringify(k) + ':' + nvpCanon(v[k]); }).join(',') + '}';
  return v === undefined ? 'null' : JSON.stringify(v);
}
function nvpDataSig(p) {
  var cabs = (p.cabinets || []).map(function (c) { try { return normCab(clone(c)); } catch (e) { return c; } });
  return nvpHash(nvpCanon({ name: p.name, cabinets: cabs, layout: p.layout || null }));
}
function nvpManifest(pj) { var m = {}; (pj.files || []).forEach(function (f) { m[f.name] = nvpHash(f.text); }); m['detales.csv'] = nvpHash(csvOf(pj)); return m; }
function nvpWhen(iso) { var d = new Date(iso), z = function (n) { return (n < 10 ? '0' : '') + n; }; return isNaN(d) ? String(iso || '') : d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); }
function nvpBuild() { return String(window.NV_BUILD || 'dev'); }

/* ---- the kept package (IndexedDB: one record per project id) */
function nvpDb() { return new Promise(function (res, rej) { if (!window.indexedDB) return rej(new Error('no IndexedDB'));
  var r = indexedDB.open(NVP_DB, 1); r.onupgradeneeded = function () { r.result.createObjectStore('a', { keyPath: 'id' }); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
function nvpPut(rec) { return nvpDb().then(function (d) { return new Promise(function (res) { var tx = d.transaction('a', 'readwrite'); tx.objectStore('a').put(rec); tx.oncomplete = function () { res(true); }; tx.onerror = tx.onabort = function () { res(false); }; }); }).catch(function () { return false; }); }
function nvpGet(id) { return nvpDb().then(function (d) { return new Promise(function (res) { var q = d.transaction('a').objectStore('a').get(id); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }).catch(function () { return null; }); }
function nvpDel(id) { return nvpDb().then(function (d) { return new Promise(function (res) { var tx = d.transaction('a', 'readwrite'); tx.objectStore('a').delete(id); tx.oncomplete = tx.onerror = function () { res(true); }; }); }).catch(function () { return false; }); }

/* ---- a produced project is built with the workshop rules it was produced with, whatever the settings say now */
function nvpSyncRules() {
  var p = !S.home && S.proj && nvpIs(S.proj) ? S.proj : null, key = p ? p.id + '|' + p.prod.at : '';
  if ((NV.pRules || '') === key) return; NV.pRules = key;
  if (p && p.prod.rules) { var keep = S.settings.rules; try { S.settings.rules = Object.assign(clone(keep), clone(p.prod.rules)); applyRules(); } finally { S.settings.rules = keep; } }
  else applyRules();
}
/* ---- the lock: a produced project cannot change. Called first thing in save(); true = nothing is saved */
function nvpGuard() {
  var p = S.proj; if (!nvpIs(p) || NV.pWrite) return false;
  var snap = NV.pSnap && NV.pSnap.id === p.id && NV.pSnap.at === p.prod.at ? NV.pSnap : null;
  if (!snap) return true;   // nothing to go back to yet (the first draw takes the snapshot): at least nothing is written
  var now = JSON.stringify(p, function (k, v) { return k === 'updated' ? undefined : v; });
  if (now === snap.json) return true;
  S.proj = JSON.parse(snap.full); NV.issues = null; NV.pCheck = null;
  toast(L('Projektas pagamintas ir užrakintas — pakeitimas nepriimtas. Keitimams sukurkite naują versiją.', 'The project is produced and locked — the change was not taken. Make a new version for changes.'), true);
  setTimeout(render, 0);
  return true;
}
function nvpSnap() {   // what the lock goes back to: the project as it is when a produced project is first drawn
  var p = S.proj; if (!nvpIs(p)) { NV.pSnap = null; return; }
  if (NV.pSnap && NV.pSnap.id === p.id && NV.pSnap.at === p.prod.at) return;
  NV.pSnap = { id: p.id, at: p.prod.at, full: JSON.stringify(p), json: JSON.stringify(p, function (k, v) { return k === 'updated' ? undefined : v; }) };
}
/* ---- is what this app builds now still what was produced? */
function nvpCheck() {
  var p = S.proj; if (!nvpIs(p)) return null;
  var key = p.id + '|' + p.prod.at + '|' + nvpBuild();
  if (NV.pCheck && NV.pCheck.key === key) return NV.pCheck;
  var c = { key: key, diff: [], data: false, err: null };
  try { var pj = buildProjectAll(), m = nvpManifest(pj), was = p.prod.files || {};
    Object.keys(was).concat(Object.keys(m)).forEach(function (n) { if (was[n] !== m[n] && c.diff.indexOf(n) < 0) c.diff.push(n); });
    c.data = nvpDataSig(p) !== p.prod.data;
  } catch (e) { c.err = String(e && e.message || e); }
  nvpGet(p.id).then(function (rec) { var has = !!(rec && rec.at === p.prod.at && rec.zip); if (NV.pCheck === c && c.has !== has) { c.has = has; if (!S.home && S.proj && S.proj.id === p.id) render(); } });
  return NV.pCheck = c;
}

/* ---- marking a project as produced */
NVA.nvpAsk = function () { if (typeof nvmPass === 'function' && !nvmPass()) return false; NV.pAsk = true; };
NVA.nvpNo = function () { NV.pAsk = false; NV.pUndo = false; };
NVA.nvpMake = function () {
  var p = S.proj; if (!p || nvpIs(p)) return false;
  if (typeof nvmPass === 'function' && !nvmPass()) return false;
  if (S.busy) { toast(t('building')); return false; }
  var pj = buildProjectAll(), at = new Date().toISOString(), man = nvpManifest(pj);
  S.busy = true; toast(t('building'));
  zipAll(pj).then(function (zip) {
    S.busy = false;
    p.prod = { at: at, build: nvpBuild(), rev: +p.rev || 1, n: { cab: p.cabinets.length, parts: pj.parts.length, files: pj.files.length }, files: man, sig: nvpHash(JSON.stringify(man)), data: nvpDataSig(p), rules: clone(S.settings.rules) };
    var done = function (who) {
      if (who) p.prod.by = who;
      NV.pWrite = true; try { save(); clearTimeout(libTimer); libSave(); } finally { NV.pWrite = false; }
      NV.pAsk = false; NV.pSnap = null; NV.pCheck = null; NV.pRules = null;
      if (NV.hist) { NV.hist.past = []; NV.hist.future = []; }   // what led here is not a way back out of the lock
      nvpPut({ id: p.id, at: at, build: nvpBuild(), sig: p.prod.sig, name: pj.project + '_CNC.zip', zip: zip, proj: JSON.stringify(p) }).then(function (ok) {
        if (!ok) toast(L('Pagaminto paketo šioje naršyklėje išsaugoti nepavyko — išsaugokite atsisiųstą ZIP failą.', 'The produced package could not be kept in this browser — keep the downloaded ZIP file.'), true);
      });
      try { VER.snap(p, L('Pagaminta', 'Produced') + ' ' + nvpWhen(at)); } catch (e) {}   // also a named version in the live app's history
      saveFile(pj.project + '_CNC.zip', zip);
      toast(L('Pažymėta: pagaminta. Projektas užrakintas, paketas atsisiųstas.', 'Marked as produced. The project is locked, the package is downloaded.'));
      render();
    };
    var W = window.WorkshopAuth; if (W && W.signedIn && W.signedIn() && W.me) W.me().then(function (me) { done(me && me.display_name || ''); }, function () { done(''); }); else done('');
  }, function (er) { S.busy = false; toast(String(er && er.message || er), true); });
  return false;
};
/* the kept package, byte for byte; if this browser does not have it and today's build gives exactly the same, that one */
NVA.nvpZip = function () {
  var p = S.proj; if (!nvpIs(p)) return false;
  nvpGet(p.id).then(function (rec) {
    if (rec && rec.at === p.prod.at && rec.zip) { saveFile(rec.name || projName() + '_CNC.zip', rec.zip); return; }
    var c = nvpCheck();
    if (c && !c.err && !c.diff.length && !c.data) { toast(t('building')); var pj = buildProjectAll(); zipAll(pj).then(function (zip) { saveFile(pj.project + '_CNC.zip', zip); }); return; }
    toast(L('Pagaminto paketo šiame kompiuteryje nėra, o dabartinė programa duotų kitokį. Naudokite ZIP failą, atsisiųstą pažymint „pagaminta“.', 'The produced package is not on this computer, and today\'s app would give a different one. Use the ZIP file downloaded when it was marked as produced.'), true);
  });
  return false;
};
/* changes go into a new version: a copy with the next revision number; the produced one stays */
NVA.nvpNew = function () {
  var p = S.proj; if (!nvpIs(p)) return false;
  var cp = JSON.parse(NV.pSnap && NV.pSnap.id === p.id ? NV.pSnap.full : JSON.stringify(p)), rev = (+p.prod.rev || 1) + 1;
  delete cp.prod; cp.id = uid(); cp.rev = rev; cp.from = p.id; cp.updated = new Date().toISOString();
  cp.name = String(p.name || '').replace(/\s+v\d+$/i, '') + ' v' + rev;
  (cp.cabinets || []).forEach(function (c) { delete c.jointsOk; delete c.edgesOk; });   // a new version is checked and confirmed again
  openProject(cp); NV.pSnap = null; NV.pCheck = null; NV.pRules = null; S.home = false; S.tab = 'cab';
  clearTimeout(libTimer); libSave();
  toast(L('Nauja versija: ', 'New version: ') + cp.name + L(' — pagamintoji liko nepakeista.', ' — the produced one is left as it was.'));
};
/* taking the mark off (a mistake): asked twice */
NVA.nvpUndo = function () {
  var p = S.proj; if (!nvpIs(p)) return false;
  if (!NV.pUndo) { NV.pUndo = true; return; }
  NV.pUndo = false; var id = p.id;
  if (NV.pSnap && NV.pSnap.id === id) S.proj = p = JSON.parse(NV.pSnap.full);
  NV.pWrite = true; try { delete p.prod; save(); clearTimeout(libTimer); libSave(); } finally { NV.pWrite = false; }
  NV.pSnap = null; NV.pCheck = null; NV.pRules = null; nvpDel(id);
  toast(L('Žyma „pagaminta“ nuimta — projektą vėl galima keisti.', 'The "produced" mark is removed — the project can be changed again.'));
};

/* ---- what is shown */
function nvpPill() { var p = S.proj; return nvpIs(p) ? '<span class="nvp-pill" title="' + esc(L('Pagaminta ', 'Produced ') + nvpWhen(p.prod.at) + L(' — užrakinta', ' — locked')) + '">🔒 ' + L('Pagaminta', 'Produced') + '</span>' : ''; }
function nvpBadge(rec) { var pr = rec && rec.data && rec.data.prod; return pr && pr.at ? '<span class="nv-badge nvp-b" title="' + esc(L('Pagaminta ', 'Produced ') + nvpWhen(pr.at)) + '">🔒 ' + L('Pagaminta', 'Produced') + '</span>' : ''; }
function nvpBanner() {
  var p = S.proj; if (!nvpIs(p)) return '';
  var pr = p.prod, c = nvpCheck() || {}, bad = !!(c.err || (c.diff || []).length || c.data), n = pr.n || {};
  var facts = L('Pagaminta', 'Produced') + ' <b>' + esc(nvpWhen(pr.at)) + '</b>' + (pr.by ? ' · ' + esc(pr.by) : '') + ' · ' + L('versija', 'version') + ' <b>' + (+pr.rev || 1) + '</b> · ' +
    (n.cab || 0) + ' ' + L('spint.', 'cab.') + ', ' + (n.parts || 0) + ' ' + L('det.', 'parts') + ', ' + (n.files || 0) + ' ' + L('programos', 'programs') + ' · ' + L('programos kodas', 'app build') + ' <code>' + esc(pr.build || '?') + '</code>';
  var why = '';
  if (c.err) why = L('Šio projekto dabar nepavyksta sudaryti: ', 'This project cannot be built now: ') + esc(c.err);
  else if (c.data) why = L('Projekto duomenys pakeisti po pagaminimo (kitoje programoje ar kitame kompiuteryje). Tai, kas rodoma, nebėra tai, kas pagaminta.', 'The project\'s data was changed after production (in another app or on another computer). What is shown is no longer what was produced.');
  else if ((c.diff || []).length) why = L('Dabartinė programos versija šiam projektui duotų kitokias programas nei buvo pagamintos: ', 'Today\'s build of the app would give other programs for this project than were produced: ') +
    '<b>' + c.diff.length + '</b> ' + L('iš', 'of') + ' ' + Object.keys(pr.files || {}).length + ' (' + esc(c.diff.slice(0, 4).join(', ')) + (c.diff.length > 4 ? '…' : '') + '). ' + L('Naudokite tik pagamintą paketą.', 'Use the produced package only.');
  var zipB = '<button type="button" class="nv-btn sm' + (bad ? ' pri' : '') + '" data-nv="nvpZip">⤓ ' + L('Pagamintas paketas (ZIP)', 'The produced package (ZIP)') + '</button>';
  var undo = NV.pUndo ? '<span class="nvp-sure">' + L('Tikrai nuimti žymą?', 'Really remove the mark?') + ' <button type="button" class="nv-btn sm danger" data-nv="nvpUndo">' + L('Taip, nuimti', 'Yes, remove') + '</button><button type="button" class="nv-btn sm ghost" data-nv="nvpNo">' + t('cancel') + '</button></span>'
    : '<button type="button" class="nv-btn sm ghost" data-nv="nvpUndo" title="' + esc(L('Jei pažymėta per klaidą', 'If it was marked by mistake')) + '">' + L('Nuimti žymą', 'Remove the mark') + '</button>';
  return '<section class="nvp-bar' + (bad ? ' bad' : '') + ' noprint" id="nvp-bar" data-state="' + (bad ? 'differs' : 'same') + '"><span class="nvp-ic" aria-hidden="true">' + (bad ? '!' : '🔒') + '</span><div class="nvp-tx"><p class="nvp-f">' + facts + '</p>' +
    '<p class="nvp-s">' + (bad ? why : L('Užrakinta: rodoma tiksliai tai, kas pagaminta, ir šios programos versija tai atkuria vienas prie vieno. Keitimams — nauja versija.', 'Locked: this is exactly what was produced, and today\'s build of the app reproduces it one to one. For changes — a new version.')) +
      (c.has === false ? ' ' + L('Pagaminto ZIP šiame kompiuteryje nėra.', 'The produced ZIP is not on this computer.') : '') + '</p></div>' +
    '<div class="nvp-act">' + zipB + '<button type="button" class="nv-btn sm" data-nv="nvpNew">＋ ' + L('Nauja versija keitimams', 'New version for changes') + '</button>' + undo + '</div></section>';
}
/* Gamyba: the last step of a project that is ready — "it is made, keep this version" */
function nvpStep(g) {
  if (nvpIs(S.proj) || !g || g.state !== 'ready') return '';
  if (!NV.pAsk) return '<div class="nvp-step"><div><b>' + L('Pagaminote?', 'Is it made?') + '</b><small>' + L('Pažymėkite — bus užfiksuota tiksli pagaminta versija ir projektas nebesikeis.', 'Mark it — the exact version that was made is kept and the project no longer changes.') + '</small></div>' +
    '<button type="button" class="nv-btn" data-nv="nvpAsk">🔒 ' + L('Pažymėti: pagaminta', 'Mark as produced') + '</button></div>';
  return '<div class="nvp-step ask"><div><b>' + L('Užfiksuoti šią versiją kaip pagamintą?', 'Keep this version as the produced one?') + '</b><small>' +
    L('Bus įrašyta data, programos versija, dirbtuvės taisyklės ir visų CNC programų atspaudai; atsisiųstas tas pats ZIP paketas ir išsaugotas šioje naršyklėje. Po to projektas užrakinamas — keitimams kuriama nauja versija.', 'The date, the app build, the workshop rules and a fingerprint of every CNC program are written down; the same ZIP package is downloaded and kept in this browser. Then the project is locked — changes go into a new version.') + '</small></div>' +
    '<span class="nvp-ask-b"><button type="button" class="nv-btn pri" data-nv="nvpMake">✓ ' + L('Taip, pagaminta — užrakinti', 'Yes, it is made — lock it') + '</button><button type="button" class="nv-btn ghost" data-nv="nvpNo">' + t('cancel') + '</button></span></div>';
}
/* a produced project that today's app would build differently gives no fresh files — only the kept package */
function nvpStale() {   // produced, and what would be built now is not it: say so; true = no fresh files
  if (!nvpIs(S.proj)) return false; var c = nvpCheck() || {}; if (!(c.err || (c.diff || []).length || c.data)) return false;
  toast(L('Šis projektas pagamintas, o dabartinė programa duotų kitokius failus. Atsisiųskite pagamintą paketą.', 'This project is produced and today\'s app would give other files. Download the produced package.'), true); return true;
}
var nvpPass0 = nvmPass;
nvmPass = function () { return nvpStale() ? false : nvpPass0(); };
app.addEventListener('click', function (e) {   // the live download commands (the gate of 60-make.js has let them through)
  var el = e.target.closest ? e.target.closest('[data-act]') : null;
  if (!el || !NVM_EXPORT[el.getAttribute('data-act')] || S.home || !S.proj || !nvpStale()) return;
  e.preventDefault(); e.stopImmediatePropagation();
}, true);
