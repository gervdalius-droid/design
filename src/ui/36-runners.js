/* 36-runners.js — drawer runners. The positions themselves are corrected in the engine at build time (build.py PATCHES,
   docs/RUNNERS.md): TANDEMBOX rows above the lowest drawer, and MERIVOBOX throughout.
   Here: workshop settings saved before still carry the live app's old, unverified MERIVOBOX numbers (33 / 24, no holes
   for the short lengths) — they are moved to Blum's (54 / 34, NL 270–350: 37, 197, 229) wherever they were never changed. */
var nvuApply = applyRules;
applyRules = function () {
  try {
    var m = S.settings && S.settings.rules && S.settings.rules.merivo;
    if (m) {
      if (+m.up === 33 && +m.below === 24) { m.up = RULE_DEF.merivo.up; m.below = RULE_DEF.merivo.below; }
      if (!String(m.perLen || '').trim()) m.perLen = RULE_DEF.merivo.perLen;
    }
  } catch (e) { if (window.console) console.error(e); }
  return nvuApply.apply(this, arguments);
};
applyRules();
/* the settings page says what the numbers are now */
function nvuSetNote(html) {
  return String(html)
    .replace('Korpuso profilio skylės ir jų aukštis — NEPATIKRINTI su tikru MERIVOBOX, pamatuokite ir pataisykite čia.',
             'Korpuso profilio skylės ir jų aukštis — pagal Blum planavimo lapą: varžtų eilė 54 mm virš dėžės atskaitos (lentos po dėže viršaus), dugno apačia 20 mm virš jos; skylės nuo priekio 37 / 261 / 293 mm (NL 270–350: 37 / 197 / 229).')
    .replace('The cabinet profile holes and their height are NOT yet verified on a real MERIVOBOX — measure one and correct them here.',
             'The cabinet profile holes and their height follow Blum\'s planning sheet: the screw row 54 mm above the box\'s reference (the top of the board under it), the base\'s underside 20 mm above it; holes from the front 37 / 261 / 293 mm (NL 270–350: 37 / 197 / 229).');
}
/* the drawer section's / front's box height field: MERIVOBOX as the live app; TANDEMBOX (M sides always, build.py PATCHES):
   by the front, or M (steel back), C / D (chipboard back + gallery rails) */
function mvFields(b, s) {
  var rt = E.R.runner[s.hw] || {};
  if (rt.merivo) {
    var m = E.R.merivo, h = s.mvH && m.sideH[s.mvH] ? s.mvH : 'auto';
    return fS(t('mvH'), b + 'mvH', h, [['auto', t('mvAuto')]].concat(['N', 'M', 'K', 'E'].map(function (k) { return [k, k + ' · ' + String(m.sideH[k]).replace('.', ',') + ' mm']; }))) +
      (h === 'auto' || h === 'E' ? fS(t('mvExt'), b + 'mvExt', s.mvExt === 'boxcap' ? 'boxcap' : 'rail', [['rail', t('mvRail')], ['boxcap', t('mvBoxcap')]]) : '');
  }
  if (s.hw === 'BLUM TANDEMBOX' && E.R.tbox) {
    var T = E.R.tbox, k = s.tbH && T.backH[s.tbH] ? s.tbH : 'auto', g = function (c) { var n = +(T.rails[c] || 1); return n + ' ' + (n === 1 ? L('galerija', 'gallery rail') : L('galerijos', 'gallery rails')); };
    return fS(L('TANDEMBOX dėžė (šonai M)', 'TANDEMBOX box (M sides)'), b + 'tbH', k, [
      ['auto', L('Pagal fasado aukštį', 'By the front\'s height')],
      ['M', 'M · ' + L('plieninis galas', 'steel back')],
      ['C', 'C · ' + L('galas ', 'back ') + T.backH.C + ' mm + ' + g('C')],
      ['D', 'D · ' + L('galas ', 'back ') + T.backH.D + ' mm + ' + g('D')]]);
  }
  return '';
}
