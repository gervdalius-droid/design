
/* =====================================================================
   report.js — ReportLists_to_Excel.xlsx exactly as the SolidWorks macro
   DB_PartList v20 writes it: the same template workbook (a previous
   report), saved without macros (.xlsx: no VBA, no macro buttons), every
   sheet opening at A1 with PARTLIST in front; PARTLIST grouped by
   thickness, thinnest first (as SWOOD), L / W along the grain; the same
   LABEL blocks (1OP / 2OP QR — 2OP only for a second operation,
   LAMINUOJASI texts, sizes, material, solid name) and the same black-only
   pictures (outline 0.75 pt, banded edges 2.25 pt, holes as ovals ≥ 2.5 pt –
   dashed when drilled from the other face, edge bores as dashed
   rectangles, a black double arrow along the grain). A material whose
   thickness (the "18mm" in its name) is not the part's: the row is yellow
   and NOTES says PATIKRINTI. Row heights whole pixels (no drifting
   pictures). EDGEBAND, STOCK_CORE, HARDWARE(_LIST) filled, SUMMARY pivots
   refreshed when Excel opens the file.

   The layout rules were measured on a v18 report (DiG_Virtuve, Oct 2026), unchanged in v20:
     PARTLIST picture box 120.5 × 54 pt, centre B+63.25 pt / row top+32.2 pt
     LABEL    picture box 109   × 54 pt, centre C+57.5  pt / 3rd label row+30 pt
     scale = min(box width / LENGTH, 54 / WIDTH), LENGTH horizontal, F edge at the bottom
     column width in points = characters × 5.5
   ===================================================================== */
(function (root) {
"use strict";
var JSZipLib = (typeof module !== 'undefined' && module.exports) ? require('jszip') : root.JSZip;
var EMU = 12700;

/* ----------------------------------------------------------------- xml helpers */
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); }
function unesc(s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(+d); }).replace(/&amp;/g, '&'); }
function colNum(L) { var n = 0; for (var i = 0; i < L.length; i++) n = n*26 + (L.charCodeAt(i) - 64); return n; }
function colName(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1)/26); } return s; }
function splitRef(ref) { var m = /^([A-Z]+)(\d+)$/.exec(ref); return { col:colNum(m[1]), row:+m[2] }; }
function n6(v) { return Math.round(v*1e6)/1e6; }
function fmt1(v) { return (Math.round(v*10)/10).toFixed(1); }

/* rows of a sheet: { r: { attrs, cells:[{ref,col,xml,s}] } } */
function parseRows(xml) {
  var rows = {}, re = /<row r="(\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/row>)/g, m;
  while ((m = re.exec(xml))) {
    var r = +m[1], attrs = m[2], body = m[4] || '', cells = [], cm, cre = /<c r="([A-Z]+\d+)"([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g;
    while ((cm = cre.exec(body))) { var sm = / s="(\d+)"/.exec(cm[2]); cells.push({ ref:cm[1], col:splitRef(cm[1]).col, xml:cm[0], s:sm ? sm[1] : null }); }
    rows[r] = { attrs:attrs, cells:cells };
  }
  return rows;
}
function styleMap(row) { var m = {}; (row ? row.cells : []).forEach(function (c) { m[c.col] = c.s; }); return m; }
function attr(a, k, v) { var re = new RegExp(' ' + k + '="[^"]*"'); return re.test(a) ? a.replace(re, ' ' + k + '="' + v + '"') : a + ' ' + k + '="' + v + '"'; }

/* shared strings */
function SST(xml) {
  var items = [], map = {};
  var body = /<sst[^>]*>([\s\S]*)<\/sst>/.exec(xml);
  var re = /<si>([\s\S]*?)<\/si>/g, m;
  while ((m = re.exec(body ? body[1] : ''))) {
    items.push(m[0]);
    var txt = ''; m[1].replace(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g, function (_, t) { txt += unesc(t); return _; });
    if (map[txt] === undefined) map[txt] = items.length - 1;
  }
  this.items = items; this.map = map; this.refs = 0;
}
SST.prototype.idx = function (s) {
  s = String(s); this.refs++;
  if (this.map[s] === undefined) { this.items.push('<si><t xml:space="preserve">' + esc(s) + '</t></si>'); this.map[s] = this.items.length - 1; }
  return this.map[s];
};
SST.prototype.xml = function () {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' + Math.max(this.refs, this.items.length) + '" uniqueCount="' + this.items.length + '">' + this.items.join('') + '</sst>';
};

/* cell writers */
function cEmpty(ref, s) { return '<c r="' + ref + '"' + (s != null ? ' s="' + s + '"' : '') + '/>'; }
function cNum(ref, s, v) { return '<c r="' + ref + '"' + (s != null ? ' s="' + s + '"' : '') + '><v>' + n6(v) + '</v></c>'; }
function cStr(ref, s, v, sst) { return '<c r="' + ref + '"' + (s != null ? ' s="' + s + '"' : '') + ' t="s"><v>' + sst.idx(v) + '</v></c>'; }
function cF(ref, s, f, str) { return '<c r="' + ref + '"' + (s != null ? ' s="' + s + '"' : '') + (str ? ' t="str"' : '') + '><f>' + esc(f) + '</f></c>'; }
function cell(ref, s, v, sst) {
  if (v === undefined || v === null || v === '') return cEmpty(ref, s);
  if (typeof v === 'object' && v.f) return cF(ref, s, v.f, v.str);
  if (typeof v === 'number') return isFinite(v) ? cNum(ref, s, v) : cEmpty(ref, s);
  return cStr(ref, s, v, sst);
}
function rowXml(r, attrs, cellsXml) { return '<row r="' + r + '"' + attrs + (cellsXml ? '>' + cellsXml + '</row>' : '/>'); }
/* a template row moved to row r: cell refs renumbered, cells in `clear` columns lose their value, `put` sets values */
function moveRow(row, r, put, clearFn, sst) {
  var seen = {}, out = [];
  row.cells.forEach(function (c) {
    var L = colName(c.col), ref = L + r; seen[c.col] = 1;
    if (put[c.col] !== undefined) out.push({ col:c.col, x:cell(ref, c.s, put[c.col], sst) });
    else if (clearFn(c.col)) out.push({ col:c.col, x:cEmpty(ref, c.s) });
    else out.push({ col:c.col, x:c.xml.replace(/r="[A-Z]+\d+"/, 'r="' + ref + '"').replace(/ (vm|cm)="\d+"/g, '') });
  });
  Object.keys(put).forEach(function (k) { if (!seen[k] && put[k] !== undefined && put[k] !== '') out.push({ col:+k, x:cell(colName(+k) + r, null, put[k], sst) }); });
  out.sort(function (a, b) { return a.col - b.col; });
  return rowXml(r, row.attrs, out.map(function (o) { return o.x; }).join(''));
}
function shiftRange(ref, d) { return ref.replace(/(\$?[A-Z]+\$?)(\d+)/g, function (m, c, n) { return c + (+n + d); }); }

/* ----------------------------------------------------------------- sheet geometry (points) */
function Geom(sheetXml, rowHeights) {
  var fp = /<sheetFormatPr([^>]*)>/.exec(sheetXml) || ['', ''];
  var dcw = +((/defaultColWidth="([\d.]+)"/.exec(fp[1]) || [0, 8.43])[1]);
  var drh = +((/defaultRowHeight="([\d.]+)"/.exec(fp[1]) || [0, 15])[1]);
  var widths = {};
  (/<cols>([\s\S]*?)<\/cols>/.exec(sheetXml) || ['', ''])[1].replace(/<col ([^>]*)\/>/g, function (_, a) {
    var mn = +/min="(\d+)"/.exec(a)[1], mx = +/max="(\d+)"/.exec(a)[1], w = +((/width="([\d.]+)"/.exec(a) || [0, dcw])[1]), hid = / hidden="1"/.test(a);
    for (var i = mn; i <= Math.min(mx, 200); i++) widths[i] = hid ? 0 : w*5.5;
    return _;
  });
  this.cw = function (c) { return widths[c] !== undefined ? widths[c] : dcw*5.5; };
  this.rh = function (r) { return rowHeights[r] !== undefined ? rowHeights[r] : drh; };
  var cs = [0, 0]; for (var c = 1; c <= 200; c++) cs[c + 1] = cs[c] + this.cw(c);
  this.colStart = function (c) { return cs[c]; };
  var rt = [0, 0]; this.rowTop = function (r) { while (rt.length <= r) { var k = rt.length - 1; rt.push(rt[k] + this.rh(k)); } return rt[r]; };
}
Geom.prototype.anchorX = function (x) { var c = 1; while (this.colStart(c + 1) <= x + 1e-9 && c < 199) c++; return { col:c - 1, off:Math.round((x - this.colStart(c))*EMU) }; };
Geom.prototype.anchorY = function (y) { var r = 1; while (this.rowTop(r + 1) <= y + 1e-9 && r < 1e6) r++; return { row:r - 1, off:Math.round((y - this.rowTop(r))*EMU) }; };

/* ----------------------------------------------------------------- picture shapes (black only, as DB_PartList) */
var STY_SP = '<xdr:style><a:lnRef idx="2"><a:schemeClr val="accent1"><a:shade val="15000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></xdr:style><xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip" rtlCol="0" anchor="t"/><a:lstStyle/><a:p><a:pPr algn="l"/><a:endParaRPr lang="en-US" sz="1100"/></a:p></xdr:txBody>';
var STY_LN = '<xdr:style><a:lnRef idx="1"><a:schemeClr val="accent1"/></a:lnRef><a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef></xdr:style>';
function anchor(g, x, y, w, h, inner) {
  var a = g.anchorX(x), b = g.anchorY(y), c = g.anchorX(x + w), d = g.anchorY(y + h);
  return '<xdr:twoCellAnchor><xdr:from><xdr:col>' + a.col + '</xdr:col><xdr:colOff>' + a.off + '</xdr:colOff><xdr:row>' + b.row + '</xdr:row><xdr:rowOff>' + b.off + '</xdr:rowOff></xdr:from>' +
    '<xdr:to><xdr:col>' + c.col + '</xdr:col><xdr:colOff>' + c.off + '</xdr:colOff><xdr:row>' + d.row + '</xdr:row><xdr:rowOff>' + d.off + '</xdr:rowOff></xdr:to>' + inner + '<xdr:clientData/></xdr:twoCellAnchor>';
}
function xfrm(x, y, w, h) { return '<a:xfrm><a:off x="' + Math.round(x*EMU) + '" y="' + Math.round(y*EMU) + '"/><a:ext cx="' + Math.round(w*EMU) + '" cy="' + Math.round(h*EMU) + '"/></a:xfrm>'; }
function Shapes(g) { this.g = g; this.id = 2; this.out = []; }
Shapes.prototype.box = function (name, x, y, w, h) {
  this.out.push(anchor(this.g, x, y, w, h, '<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="' + (this.id++) + '" name="' + name + '"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr>' + xfrm(x, y, w, h) +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:noFill/><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln><a:effectLst/></xdr:spPr>' + STY_SP + '</xdr:sp>'));
};
Shapes.prototype.line = function (name, x1, y1, x2, y2, wEmu, dash) {   // drawn in ascending order, so nothing is flipped
  var x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  this.out.push(anchor(this.g, x, y, w, h, '<xdr:cxnSp macro=""><xdr:nvCxnSpPr><xdr:cNvPr id="' + (this.id++) + '" name="' + name + '"/><xdr:cNvCxnSpPr/></xdr:nvCxnSpPr><xdr:spPr>' + xfrm(x, y, w, h) +
    '<a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="' + wEmu + '"><a:solidFill><a:srgbClr val="000000"/></a:solidFill>' + (dash ? '<a:prstDash val="dash"/>' : '') + '</a:ln></xdr:spPr>' + STY_LN + '</xdr:cxnSp>'));
};
Shapes.prototype.oval = function (name, cx, cy, dia, dash) {
  var x = cx - dia/2, y = cy - dia/2;
  this.out.push(anchor(this.g, x, y, dia, dia, '<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="' + (this.id++) + '" name="' + name + '"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr>' + xfrm(x, y, dia, dia) +
    '<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="6350"><a:solidFill><a:srgbClr val="000000"/></a:solidFill>' + (dash ? '<a:prstDash val="dash"/>' : '') + '</a:ln></xdr:spPr>' + STY_SP + '</xdr:sp>'));
};
Shapes.prototype.arrow = function (name, x1, y1, x2, y2, wEmu) {   // double arrow (grain): triangles at both ends
  var x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  this.out.push(anchor(this.g, x, y, w, h, '<xdr:cxnSp macro=""><xdr:nvCxnSpPr><xdr:cNvPr id="' + (this.id++) + '" name="' + name + '"/><xdr:cNvCxnSpPr/></xdr:nvCxnSpPr><xdr:spPr>' + xfrm(x, y, w, h) +
    '<a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="' + wEmu + '"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:headEnd type="triangle"/><a:tailEnd type="triangle"/></a:ln></xdr:spPr>' + STY_LN + '</xdr:cxnSp>'));
};
/* one panel picture: box centre (cx, cy), box size bw × bh; part = { L, W, pic:{holes, edges}, eb:{F,B,L,R} } */
var MIN_MARK = 2.5, W_OUT = 9525, W_EB = 44450, W_DASH = 6350, EB_OFF = 3.2;   // edge band bar 3.5 pt, 3.2 pt outside the outline
function drawPanel(sh, tag, part, cx, cy, bw, bh) {
  var L = +part.L, W = +part.W; if (!(L > 0 && W > 0)) return;
  var pad = EB_OFF + 2, s = Math.min((bw - 2*pad)/L, (bh - 2*pad)/W), pw = L*s, ph = W*s, x0 = cx - pw/2, y0 = cy - ph/2, x1 = x0 + pw, y1 = y0 + ph, k = 0;
  var nm = function () { return tag + '_' + (k++); };
  var X = function (x) { return x0 + x*s; }, Y = function (y) { return y1 - y*s; };   // F edge (panel y = 0) at the bottom
  sh.box(nm(), x0, y0, pw, ph);
  sh.line(nm(), x0, y0, x1, y0, W_OUT); sh.line(nm(), x0, y0, x0, y1, W_OUT); sh.line(nm(), x0, y1, x1, y1, W_OUT); sh.line(nm(), x1, y0, x1, y1, W_OUT);
  var pic = part.pic || {};
  (pic.holes || []).forEach(function (h) { sh.oval(nm(), X(h.x), Y(h.y), Math.max(h.d*s, MIN_MARK), h.face === 'B' && !h.through); });
  (pic.edges || []).forEach(function (e) {
    var dw = Math.max(e.d*s, MIN_MARK), dl = e.depth*s, a, b, c, d;
    if (e.edge === 'x0' || e.edge === 'x1') {
      var yc = Y(e.pos); a = e.edge === 'x0' ? x0 : x1 - dl; c = a + dl; b = yc - dw/2; d = yc + dw/2;
      sh.line(nm(), a, b, c, b, W_DASH, 1); sh.line(nm(), a, d, c, d, W_DASH, 1); sh.line(nm(), a, b, a, d, W_DASH, 1); sh.line(nm(), c, b, c, d, W_DASH, 1);
    } else {
      var xc = X(e.pos); a = xc - dw/2; c = xc + dw/2; b = e.edge === 'y1' ? y0 : y1 - dl; d = b + dl;
      sh.line(nm(), a, b, a, d, W_DASH, 1); sh.line(nm(), c, b, c, d, W_DASH, 1); sh.line(nm(), a, d, c, d, W_DASH, 1); sh.line(nm(), a, b, c, b, W_DASH, 1);
    }
  });
  var eb = part.eb || {};
  /* banded edges: a heavy bar just OUTSIDE the outline, clear of the holes near the edge (black only, thermal printer) */
  var o = EB_OFF;
  if (eb.L) sh.line(nm(), x0 - o, y0 - (eb.B ? o : 0), x0 - o, y1 + (eb.F ? o : 0), W_EB);
  if (eb.R) sh.line(nm(), x1 + o, y0 - (eb.B ? o : 0), x1 + o, y1 + (eb.F ? o : 0), W_EB);
  if (eb.B) sh.line(nm(), x0 - (eb.L ? o : 0), y0 - o, x1 + (eb.R ? o : 0), y0 - o, W_EB);
  if (eb.F) sh.line(nm(), x0 - (eb.L ? o : 0), y1 + o, x1 + (eb.R ? o : 0), y1 + o, W_EB);
  /* grain: a black double arrow through the middle, 0.6 of the picture — the part's L is along the grain, drawn horizontal */
  var gh = (part.grainVert ? ph : pw)*0.3, gx = (x0 + x1)/2, gy = (y0 + y1)/2;
  if (gh >= 2) { if (part.grainVert) sh.arrow(nm(), gx, gy - gh, gx, gy + gh, W_OUT); else sh.arrow(nm(), gx - gh, gy, gx + gh, gy, W_OUT); }
}

/* ----------------------------------------------------------------- order (as the macro v20 / SWOOD: thickness ↑, material, length ↓, width ↓, part code) */
function binCmp(a, b) { a = String(a); b = String(b); return a < b ? -1 : a > b ? 1 : 0; }   // VBA binary text compare
function sortParts(parts) {
  return parts.slice().sort(function (a, b) {
    return (Math.round(a.T*10) - Math.round(b.T*10)) || binCmp(a.mat.toUpperCase(), b.mat.toUpperCase()) || (b.L - a.L) || (b.W - a.W) || binCmp(a.dbpart, b.dbpart);
  });
}
/* "KARKASAI 18mm" → 18, "16MM PLOKSTE" → 16, "U16003 VV" → 0 (the number must be followed by mm), as ThicknessFromName */
function thkFromName(nm) { var m = /(\d+(?:[.,]\d+)?)\s*mm/i.exec(String(nm || '')); return m ? parseFloat(m[1].replace(',', '.')) : 0; }
function numText(v) { return String(Math.round(v*10)/10); }
/* whole screen pixels (0.75 pt): Excel lays shapes on pixel-rounded rows, so fractional heights let pictures drift */
function pxH(h) { return Math.max(0.75, Math.round(h/0.75)*0.75); }
function pxAttrs(a) { return a.replace(/ ht="([\d.]+)"/, function (m, h) { return ' ht="' + pxH(+h) + '"'; }); }
/* a label's edge text: LAMINUOJASI as SWOOD writes it; PAGAL FASADA where the part is banded with the fronts' edge (visible part) */
function ebLbl(p, k) { return !p.eb[k] ? '' : p.ebFac && p.ebFac[k] ? 'PAGAL FASADA' : 'LAMINUOJASI'; }
/* QR codes on the labels are real PNG pictures embedded in the workbook, not
   IMAGE("https://quickchart.io/...") formulas: with formulas Excel had to fetch
   every QR from the internet (or ask about external content) when the label PC
   opened the file, stayed busy, and the nesting app's print call failed with
   "Call was rejected by callee" (RPC_E_CALL_REJECTED). Embedded pictures need
   no internet and print at once. QR: qrcode-generator 1.4.4, Kazuhiko Arase, MIT. */
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//  http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//  http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

var qrcode = function() {

  //---------------------------------------------------------------------
  // qrcode
  //---------------------------------------------------------------------

  /**
   * qrcode
   * @param typeNumber 1 to 40
   * @param errorCorrectionLevel 'L','M','Q','H'
   */
  var qrcode = function(typeNumber, errorCorrectionLevel) {

    var PAD0 = 0xEC;
    var PAD1 = 0x11;

    var _typeNumber = typeNumber;
    var _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
    var _modules = null;
    var _moduleCount = 0;
    var _dataCache = null;
    var _dataList = [];

    var _this = {};

    var makeImpl = function(test, maskPattern) {

      _moduleCount = _typeNumber * 4 + 17;
      _modules = function(moduleCount) {
        var modules = new Array(moduleCount);
        for (var row = 0; row < moduleCount; row += 1) {
          modules[row] = new Array(moduleCount);
          for (var col = 0; col < moduleCount; col += 1) {
            modules[row][col] = null;
          }
        }
        return modules;
      }(_moduleCount);

      setupPositionProbePattern(0, 0);
      setupPositionProbePattern(_moduleCount - 7, 0);
      setupPositionProbePattern(0, _moduleCount - 7);
      setupPositionAdjustPattern();
      setupTimingPattern();
      setupTypeInfo(test, maskPattern);

      if (_typeNumber >= 7) {
        setupTypeNumber(test);
      }

      if (_dataCache == null) {
        _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
      }

      mapData(_dataCache, maskPattern);
    };

    var setupPositionProbePattern = function(row, col) {

      for (var r = -1; r <= 7; r += 1) {

        if (row + r <= -1 || _moduleCount <= row + r) continue;

        for (var c = -1; c <= 7; c += 1) {

          if (col + c <= -1 || _moduleCount <= col + c) continue;

          if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
              || (0 <= c && c <= 6 && (r == 0 || r == 6) )
              || (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
            _modules[row + r][col + c] = true;
          } else {
            _modules[row + r][col + c] = false;
          }
        }
      }
    };

    var getBestMaskPattern = function() {

      var minLostPoint = 0;
      var pattern = 0;

      for (var i = 0; i < 8; i += 1) {

        makeImpl(true, i);

        var lostPoint = QRUtil.getLostPoint(_this);

        if (i == 0 || minLostPoint > lostPoint) {
          minLostPoint = lostPoint;
          pattern = i;
        }
      }

      return pattern;
    };

    var setupTimingPattern = function() {

      for (var r = 8; r < _moduleCount - 8; r += 1) {
        if (_modules[r][6] != null) {
          continue;
        }
        _modules[r][6] = (r % 2 == 0);
      }

      for (var c = 8; c < _moduleCount - 8; c += 1) {
        if (_modules[6][c] != null) {
          continue;
        }
        _modules[6][c] = (c % 2 == 0);
      }
    };

    var setupPositionAdjustPattern = function() {

      var pos = QRUtil.getPatternPosition(_typeNumber);

      for (var i = 0; i < pos.length; i += 1) {

        for (var j = 0; j < pos.length; j += 1) {

          var row = pos[i];
          var col = pos[j];

          if (_modules[row][col] != null) {
            continue;
          }

          for (var r = -2; r <= 2; r += 1) {

            for (var c = -2; c <= 2; c += 1) {

              if (r == -2 || r == 2 || c == -2 || c == 2
                  || (r == 0 && c == 0) ) {
                _modules[row + r][col + c] = true;
              } else {
                _modules[row + r][col + c] = false;
              }
            }
          }
        }
      }
    };

    var setupTypeNumber = function(test) {

      var bits = QRUtil.getBCHTypeNumber(_typeNumber);

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = mod;
      }

      for (var i = 0; i < 18; i += 1) {
        var mod = (!test && ( (bits >> i) & 1) == 1);
        _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
      }
    };

    var setupTypeInfo = function(test, maskPattern) {

      var data = (_errorCorrectionLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);

      // vertical
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 6) {
          _modules[i][8] = mod;
        } else if (i < 8) {
          _modules[i + 1][8] = mod;
        } else {
          _modules[_moduleCount - 15 + i][8] = mod;
        }
      }

      // horizontal
      for (var i = 0; i < 15; i += 1) {

        var mod = (!test && ( (bits >> i) & 1) == 1);

        if (i < 8) {
          _modules[8][_moduleCount - i - 1] = mod;
        } else if (i < 9) {
          _modules[8][15 - i - 1 + 1] = mod;
        } else {
          _modules[8][15 - i - 1] = mod;
        }
      }

      // fixed module
      _modules[_moduleCount - 8][8] = (!test);
    };

    var mapData = function(data, maskPattern) {

      var inc = -1;
      var row = _moduleCount - 1;
      var bitIndex = 7;
      var byteIndex = 0;
      var maskFunc = QRUtil.getMaskFunction(maskPattern);

      for (var col = _moduleCount - 1; col > 0; col -= 2) {

        if (col == 6) col -= 1;

        while (true) {

          for (var c = 0; c < 2; c += 1) {

            if (_modules[row][col - c] == null) {

              var dark = false;

              if (byteIndex < data.length) {
                dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
              }

              var mask = maskFunc(row, col - c);

              if (mask) {
                dark = !dark;
              }

              _modules[row][col - c] = dark;
              bitIndex -= 1;

              if (bitIndex == -1) {
                byteIndex += 1;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || _moduleCount <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    };

    var createBytes = function(buffer, rsBlocks) {

      var offset = 0;

      var maxDcCount = 0;
      var maxEcCount = 0;

      var dcdata = new Array(rsBlocks.length);
      var ecdata = new Array(rsBlocks.length);

      for (var r = 0; r < rsBlocks.length; r += 1) {

        var dcCount = rsBlocks[r].dataCount;
        var ecCount = rsBlocks[r].totalCount - dcCount;

        maxDcCount = Math.max(maxDcCount, dcCount);
        maxEcCount = Math.max(maxEcCount, ecCount);

        dcdata[r] = new Array(dcCount);

        for (var i = 0; i < dcdata[r].length; i += 1) {
          dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
        }
        offset += dcCount;

        var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
        var rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

        var modPoly = rawPoly.mod(rsPoly);
        ecdata[r] = new Array(rsPoly.getLength() - 1);
        for (var i = 0; i < ecdata[r].length; i += 1) {
          var modIndex = i + modPoly.getLength() - ecdata[r].length;
          ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
        }
      }

      var totalCodeCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalCodeCount += rsBlocks[i].totalCount;
      }

      var data = new Array(totalCodeCount);
      var index = 0;

      for (var i = 0; i < maxDcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < dcdata[r].length) {
            data[index] = dcdata[r][i];
            index += 1;
          }
        }
      }

      for (var i = 0; i < maxEcCount; i += 1) {
        for (var r = 0; r < rsBlocks.length; r += 1) {
          if (i < ecdata[r].length) {
            data[index] = ecdata[r][i];
            index += 1;
          }
        }
      }

      return data;
    };

    var createData = function(typeNumber, errorCorrectionLevel, dataList) {

      var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

      var buffer = qrBitBuffer();

      for (var i = 0; i < dataList.length; i += 1) {
        var data = dataList[i];
        buffer.put(data.getMode(), 4);
        buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
        data.write(buffer);
      }

      // calc num max data.
      var totalDataCount = 0;
      for (var i = 0; i < rsBlocks.length; i += 1) {
        totalDataCount += rsBlocks[i].dataCount;
      }

      if (buffer.getLengthInBits() > totalDataCount * 8) {
        throw 'code length overflow. ('
          + buffer.getLengthInBits()
          + '>'
          + totalDataCount * 8
          + ')';
      }

      // end code
      if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
        buffer.put(0, 4);
      }

      // padding
      while (buffer.getLengthInBits() % 8 != 0) {
        buffer.putBit(false);
      }

      // padding
      while (true) {

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD0, 8);

        if (buffer.getLengthInBits() >= totalDataCount * 8) {
          break;
        }
        buffer.put(PAD1, 8);
      }

      return createBytes(buffer, rsBlocks);
    };

    _this.addData = function(data, mode) {

      mode = mode || 'Byte';

      var newData = null;

      switch(mode) {
      case 'Numeric' :
        newData = qrNumber(data);
        break;
      case 'Alphanumeric' :
        newData = qrAlphaNum(data);
        break;
      case 'Byte' :
        newData = qr8BitByte(data);
        break;
      case 'Kanji' :
        newData = qrKanji(data);
        break;
      default :
        throw 'mode:' + mode;
      }

      _dataList.push(newData);
      _dataCache = null;
    };

    _this.isDark = function(row, col) {
      if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
        throw row + ',' + col;
      }
      return _modules[row][col];
    };

    _this.getModuleCount = function() {
      return _moduleCount;
    };

    _this.make = function() {
      if (_typeNumber < 1) {
        var typeNumber = 1;

        for (; typeNumber < 40; typeNumber++) {
          var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
          var buffer = qrBitBuffer();

          for (var i = 0; i < _dataList.length; i++) {
            var data = _dataList[i];
            buffer.put(data.getMode(), 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
            data.write(buffer);
          }

          var totalDataCount = 0;
          for (var i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
          }

          if (buffer.getLengthInBits() <= totalDataCount * 8) {
            break;
          }
        }

        _typeNumber = typeNumber;
      }

      makeImpl(false, getBestMaskPattern() );
    };

    _this.createTableTag = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var qrHtml = '';

      qrHtml += '<table style="';
      qrHtml += ' border-width: 0px; border-style: none;';
      qrHtml += ' border-collapse: collapse;';
      qrHtml += ' padding: 0px; margin: ' + margin + 'px;';
      qrHtml += '">';
      qrHtml += '<tbody>';

      for (var r = 0; r < _this.getModuleCount(); r += 1) {

        qrHtml += '<tr>';

        for (var c = 0; c < _this.getModuleCount(); c += 1) {
          qrHtml += '<td style="';
          qrHtml += ' border-width: 0px; border-style: none;';
          qrHtml += ' border-collapse: collapse;';
          qrHtml += ' padding: 0px; margin: 0px;';
          qrHtml += ' width: ' + cellSize + 'px;';
          qrHtml += ' height: ' + cellSize + 'px;';
          qrHtml += ' background-color: ';
          qrHtml += _this.isDark(r, c)? '#000000' : '#ffffff';
          qrHtml += ';';
          qrHtml += '"/>';
        }

        qrHtml += '</tr>';
      }

      qrHtml += '</tbody>';
      qrHtml += '</table>';

      return qrHtml;
    };

    _this.createSvgTag = function(cellSize, margin, alt, title) {

      var opts = {};
      if (typeof arguments[0] == 'object') {
        // Called by options.
        opts = arguments[0];
        // overwrite cellSize and margin.
        cellSize = opts.cellSize;
        margin = opts.margin;
        alt = opts.alt;
        title = opts.title;
      }

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      // Compose alt property surrogate
      alt = (typeof alt === 'string') ? {text: alt} : alt || {};
      alt.text = alt.text || null;
      alt.id = (alt.text) ? alt.id || 'qrcode-description' : null;

      // Compose title property surrogate
      title = (typeof title === 'string') ? {text: title} : title || {};
      title.text = title.text || null;
      title.id = (title.text) ? title.id || 'qrcode-title' : null;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var c, mc, r, mr, qrSvg='', rect;

      rect = 'l' + cellSize + ',0 0,' + cellSize +
        ' -' + cellSize + ',0 0,-' + cellSize + 'z ';

      qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
      qrSvg += !opts.scalable ? ' width="' + size + 'px" height="' + size + 'px"' : '';
      qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
      qrSvg += ' preserveAspectRatio="xMinYMin meet"';
      qrSvg += (title.text || alt.text) ? ' role="img" aria-labelledby="' +
          escapeXml([title.id, alt.id].join(' ').trim() ) + '"' : '';
      qrSvg += '>';
      qrSvg += (title.text) ? '<title id="' + escapeXml(title.id) + '">' +
          escapeXml(title.text) + '</title>' : '';
      qrSvg += (alt.text) ? '<description id="' + escapeXml(alt.id) + '">' +
          escapeXml(alt.text) + '</description>' : '';
      qrSvg += '<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>';
      qrSvg += '<path d="';

      for (r = 0; r < _this.getModuleCount(); r += 1) {
        mr = r * cellSize + margin;
        for (c = 0; c < _this.getModuleCount(); c += 1) {
          if (_this.isDark(r, c) ) {
            mc = c*cellSize+margin;
            qrSvg += 'M' + mc + ',' + mr + rect;
          }
        }
      }

      qrSvg += '" stroke="transparent" fill="black"/>';
      qrSvg += '</svg>';

      return qrSvg;
    };

    _this.createDataURL = function(cellSize, margin) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      return createDataURL(size, size, function(x, y) {
        if (min <= x && x < max && min <= y && y < max) {
          var c = Math.floor( (x - min) / cellSize);
          var r = Math.floor( (y - min) / cellSize);
          return _this.isDark(r, c)? 0 : 1;
        } else {
          return 1;
        }
      } );
    };

    _this.createImgTag = function(cellSize, margin, alt) {

      cellSize = cellSize || 2;
      margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;

      var img = '';
      img += '<img';
      img += '\u0020src="';
      img += _this.createDataURL(cellSize, margin);
      img += '"';
      img += '\u0020width="';
      img += size;
      img += '"';
      img += '\u0020height="';
      img += size;
      img += '"';
      if (alt) {
        img += '\u0020alt="';
        img += escapeXml(alt);
        img += '"';
      }
      img += '/>';

      return img;
    };

    var escapeXml = function(s) {
      var escaped = '';
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charAt(i);
        switch(c) {
        case '<': escaped += '&lt;'; break;
        case '>': escaped += '&gt;'; break;
        case '&': escaped += '&amp;'; break;
        case '"': escaped += '&quot;'; break;
        default : escaped += c; break;
        }
      }
      return escaped;
    };

    var _createHalfASCII = function(margin) {
      var cellSize = 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r1, r2, p;

      var blocks = {
        '██': '█',
        '█ ': '▀',
        ' █': '▄',
        '  ': ' '
      };

      var blocksLastLineNoMargin = {
        '██': '▀',
        '█ ': '▀',
        ' █': ' ',
        '  ': ' '
      };

      var ascii = '';
      for (y = 0; y < size; y += 2) {
        r1 = Math.floor((y - min) / cellSize);
        r2 = Math.floor((y + 1 - min) / cellSize);
        for (x = 0; x < size; x += 1) {
          p = '█';

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r1, Math.floor((x - min) / cellSize))) {
            p = ' ';
          }

          if (min <= x && x < max && min <= y+1 && y+1 < max && _this.isDark(r2, Math.floor((x - min) / cellSize))) {
            p += ' ';
          }
          else {
            p += '█';
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          ascii += (margin < 1 && y+1 >= max) ? blocksLastLineNoMargin[p] : blocks[p];
        }

        ascii += '\n';
      }

      if (size % 2 && margin > 0) {
        return ascii.substring(0, ascii.length - size - 1) + Array(size+1).join('▀');
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.createASCII = function(cellSize, margin) {
      cellSize = cellSize || 1;

      if (cellSize < 2) {
        return _createHalfASCII(margin);
      }

      cellSize -= 1;
      margin = (typeof margin == 'undefined')? cellSize * 2 : margin;

      var size = _this.getModuleCount() * cellSize + margin * 2;
      var min = margin;
      var max = size - margin;

      var y, x, r, p;

      var white = Array(cellSize+1).join('██');
      var black = Array(cellSize+1).join('  ');

      var ascii = '';
      var line = '';
      for (y = 0; y < size; y += 1) {
        r = Math.floor( (y - min) / cellSize);
        line = '';
        for (x = 0; x < size; x += 1) {
          p = 1;

          if (min <= x && x < max && min <= y && y < max && _this.isDark(r, Math.floor((x - min) / cellSize))) {
            p = 0;
          }

          // Output 2 characters per pixel, to create full square. 1 character per pixels gives only half width of square.
          line += p ? white : black;
        }

        for (r = 0; r < cellSize; r += 1) {
          ascii += line + '\n';
        }
      }

      return ascii.substring(0, ascii.length-1);
    };

    _this.renderTo2dContext = function(context, cellSize) {
      cellSize = cellSize || 2;
      var length = _this.getModuleCount();
      for (var row = 0; row < length; row++) {
        for (var col = 0; col < length; col++) {
          context.fillStyle = _this.isDark(row, col) ? 'black' : 'white';
          context.fillRect(row * cellSize, col * cellSize, cellSize, cellSize);
        }
      }
    }

    return _this;
  };

  //---------------------------------------------------------------------
  // qrcode.stringToBytes
  //---------------------------------------------------------------------

  qrcode.stringToBytesFuncs = {
    'default' : function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        bytes.push(c & 0xff);
      }
      return bytes;
    }
  };

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];

  //---------------------------------------------------------------------
  // qrcode.createStringToBytes
  //---------------------------------------------------------------------

  /**
   * @param unicodeData base64 string of byte array.
   * [16bit Unicode],[16bit Bytes], ...
   * @param numChars
   */
  qrcode.createStringToBytes = function(unicodeData, numChars) {

    // create conversion map.

    var unicodeMap = function() {

      var bin = base64DecodeInputStream(unicodeData);
      var read = function() {
        var b = bin.read();
        if (b == -1) throw 'eof';
        return b;
      };

      var count = 0;
      var unicodeMap = {};
      while (true) {
        var b0 = bin.read();
        if (b0 == -1) break;
        var b1 = read();
        var b2 = read();
        var b3 = read();
        var k = String.fromCharCode( (b0 << 8) | b1);
        var v = (b2 << 8) | b3;
        unicodeMap[k] = v;
        count += 1;
      }
      if (count != numChars) {
        throw count + ' != ' + numChars;
      }

      return unicodeMap;
    }();

    var unknownChar = '?'.charCodeAt(0);

    return function(s) {
      var bytes = [];
      for (var i = 0; i < s.length; i += 1) {
        var c = s.charCodeAt(i);
        if (c < 128) {
          bytes.push(c);
        } else {
          var b = unicodeMap[s.charAt(i)];
          if (typeof b == 'number') {
            if ( (b & 0xff) == b) {
              // 1byte
              bytes.push(b);
            } else {
              // 2bytes
              bytes.push(b >>> 8);
              bytes.push(b & 0xff);
            }
          } else {
            bytes.push(unknownChar);
          }
        }
      }
      return bytes;
    };
  };

  //---------------------------------------------------------------------
  // QRMode
  //---------------------------------------------------------------------

  var QRMode = {
    MODE_NUMBER :    1 << 0,
    MODE_ALPHA_NUM : 1 << 1,
    MODE_8BIT_BYTE : 1 << 2,
    MODE_KANJI :     1 << 3
  };

  //---------------------------------------------------------------------
  // QRErrorCorrectionLevel
  //---------------------------------------------------------------------

  var QRErrorCorrectionLevel = {
    L : 1,
    M : 0,
    Q : 3,
    H : 2
  };

  //---------------------------------------------------------------------
  // QRMaskPattern
  //---------------------------------------------------------------------

  var QRMaskPattern = {
    PATTERN000 : 0,
    PATTERN001 : 1,
    PATTERN010 : 2,
    PATTERN011 : 3,
    PATTERN100 : 4,
    PATTERN101 : 5,
    PATTERN110 : 6,
    PATTERN111 : 7
  };

  //---------------------------------------------------------------------
  // QRUtil
  //---------------------------------------------------------------------

  var QRUtil = function() {

    var PATTERN_POSITION_TABLE = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
      [6, 30, 54],
      [6, 32, 58],
      [6, 34, 62],
      [6, 26, 46, 66],
      [6, 26, 48, 70],
      [6, 26, 50, 74],
      [6, 30, 54, 78],
      [6, 30, 56, 82],
      [6, 30, 58, 86],
      [6, 34, 62, 90],
      [6, 28, 50, 72, 94],
      [6, 26, 50, 74, 98],
      [6, 30, 54, 78, 102],
      [6, 28, 54, 80, 106],
      [6, 32, 58, 84, 110],
      [6, 30, 58, 86, 114],
      [6, 34, 62, 90, 118],
      [6, 26, 50, 74, 98, 122],
      [6, 30, 54, 78, 102, 126],
      [6, 26, 52, 78, 104, 130],
      [6, 30, 56, 82, 108, 134],
      [6, 34, 60, 86, 112, 138],
      [6, 30, 58, 86, 114, 142],
      [6, 34, 62, 90, 118, 146],
      [6, 30, 54, 78, 102, 126, 150],
      [6, 24, 50, 76, 102, 128, 154],
      [6, 28, 54, 80, 106, 132, 158],
      [6, 32, 58, 84, 110, 136, 162],
      [6, 26, 54, 82, 110, 138, 166],
      [6, 30, 58, 86, 114, 142, 170]
    ];
    var G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    var G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    var G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

    var _this = {};

    var getBCHDigit = function(data) {
      var digit = 0;
      while (data != 0) {
        digit += 1;
        data >>>= 1;
      }
      return digit;
    };

    _this.getBCHTypeInfo = function(data) {
      var d = data << 10;
      while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
        d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
      }
      return ( (data << 10) | d) ^ G15_MASK;
    };

    _this.getBCHTypeNumber = function(data) {
      var d = data << 12;
      while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
        d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
      }
      return (data << 12) | d;
    };

    _this.getPatternPosition = function(typeNumber) {
      return PATTERN_POSITION_TABLE[typeNumber - 1];
    };

    _this.getMaskFunction = function(maskPattern) {

      switch (maskPattern) {

      case QRMaskPattern.PATTERN000 :
        return function(i, j) { return (i + j) % 2 == 0; };
      case QRMaskPattern.PATTERN001 :
        return function(i, j) { return i % 2 == 0; };
      case QRMaskPattern.PATTERN010 :
        return function(i, j) { return j % 3 == 0; };
      case QRMaskPattern.PATTERN011 :
        return function(i, j) { return (i + j) % 3 == 0; };
      case QRMaskPattern.PATTERN100 :
        return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
      case QRMaskPattern.PATTERN101 :
        return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
      case QRMaskPattern.PATTERN110 :
        return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
      case QRMaskPattern.PATTERN111 :
        return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

      default :
        throw 'bad maskPattern:' + maskPattern;
      }
    };

    _this.getErrorCorrectPolynomial = function(errorCorrectLength) {
      var a = qrPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i += 1) {
        a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
      }
      return a;
    };

    _this.getLengthInBits = function(mode, type) {

      if (1 <= type && type < 10) {

        // 1 - 9

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 10;
        case QRMode.MODE_ALPHA_NUM : return 9;
        case QRMode.MODE_8BIT_BYTE : return 8;
        case QRMode.MODE_KANJI     : return 8;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 27) {

        // 10 - 26

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 12;
        case QRMode.MODE_ALPHA_NUM : return 11;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 10;
        default :
          throw 'mode:' + mode;
        }

      } else if (type < 41) {

        // 27 - 40

        switch(mode) {
        case QRMode.MODE_NUMBER    : return 14;
        case QRMode.MODE_ALPHA_NUM : return 13;
        case QRMode.MODE_8BIT_BYTE : return 16;
        case QRMode.MODE_KANJI     : return 12;
        default :
          throw 'mode:' + mode;
        }

      } else {
        throw 'type:' + type;
      }
    };

    _this.getLostPoint = function(qrcode) {

      var moduleCount = qrcode.getModuleCount();

      var lostPoint = 0;

      // LEVEL1

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount; col += 1) {

          var sameCount = 0;
          var dark = qrcode.isDark(row, col);

          for (var r = -1; r <= 1; r += 1) {

            if (row + r < 0 || moduleCount <= row + r) {
              continue;
            }

            for (var c = -1; c <= 1; c += 1) {

              if (col + c < 0 || moduleCount <= col + c) {
                continue;
              }

              if (r == 0 && c == 0) {
                continue;
              }

              if (dark == qrcode.isDark(row + r, col + c) ) {
                sameCount += 1;
              }
            }
          }

          if (sameCount > 5) {
            lostPoint += (3 + sameCount - 5);
          }
        }
      };

      // LEVEL2

      for (var row = 0; row < moduleCount - 1; row += 1) {
        for (var col = 0; col < moduleCount - 1; col += 1) {
          var count = 0;
          if (qrcode.isDark(row, col) ) count += 1;
          if (qrcode.isDark(row + 1, col) ) count += 1;
          if (qrcode.isDark(row, col + 1) ) count += 1;
          if (qrcode.isDark(row + 1, col + 1) ) count += 1;
          if (count == 0 || count == 4) {
            lostPoint += 3;
          }
        }
      }

      // LEVEL3

      for (var row = 0; row < moduleCount; row += 1) {
        for (var col = 0; col < moduleCount - 6; col += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row, col + 1)
              &&  qrcode.isDark(row, col + 2)
              &&  qrcode.isDark(row, col + 3)
              &&  qrcode.isDark(row, col + 4)
              && !qrcode.isDark(row, col + 5)
              &&  qrcode.isDark(row, col + 6) ) {
            lostPoint += 40;
          }
        }
      }

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount - 6; row += 1) {
          if (qrcode.isDark(row, col)
              && !qrcode.isDark(row + 1, col)
              &&  qrcode.isDark(row + 2, col)
              &&  qrcode.isDark(row + 3, col)
              &&  qrcode.isDark(row + 4, col)
              && !qrcode.isDark(row + 5, col)
              &&  qrcode.isDark(row + 6, col) ) {
            lostPoint += 40;
          }
        }
      }

      // LEVEL4

      var darkCount = 0;

      for (var col = 0; col < moduleCount; col += 1) {
        for (var row = 0; row < moduleCount; row += 1) {
          if (qrcode.isDark(row, col) ) {
            darkCount += 1;
          }
        }
      }

      var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
      lostPoint += ratio * 10;

      return lostPoint;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // QRMath
  //---------------------------------------------------------------------

  var QRMath = function() {

    var EXP_TABLE = new Array(256);
    var LOG_TABLE = new Array(256);

    // initialize tables
    for (var i = 0; i < 8; i += 1) {
      EXP_TABLE[i] = 1 << i;
    }
    for (var i = 8; i < 256; i += 1) {
      EXP_TABLE[i] = EXP_TABLE[i - 4]
        ^ EXP_TABLE[i - 5]
        ^ EXP_TABLE[i - 6]
        ^ EXP_TABLE[i - 8];
    }
    for (var i = 0; i < 255; i += 1) {
      LOG_TABLE[EXP_TABLE[i] ] = i;
    }

    var _this = {};

    _this.glog = function(n) {

      if (n < 1) {
        throw 'glog(' + n + ')';
      }

      return LOG_TABLE[n];
    };

    _this.gexp = function(n) {

      while (n < 0) {
        n += 255;
      }

      while (n >= 256) {
        n -= 255;
      }

      return EXP_TABLE[n];
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrPolynomial
  //---------------------------------------------------------------------

  function qrPolynomial(num, shift) {

    if (typeof num.length == 'undefined') {
      throw num.length + '/' + shift;
    }

    var _num = function() {
      var offset = 0;
      while (offset < num.length && num[offset] == 0) {
        offset += 1;
      }
      var _num = new Array(num.length - offset + shift);
      for (var i = 0; i < num.length - offset; i += 1) {
        _num[i] = num[i + offset];
      }
      return _num;
    }();

    var _this = {};

    _this.getAt = function(index) {
      return _num[index];
    };

    _this.getLength = function() {
      return _num.length;
    };

    _this.multiply = function(e) {

      var num = new Array(_this.getLength() + e.getLength() - 1);

      for (var i = 0; i < _this.getLength(); i += 1) {
        for (var j = 0; j < e.getLength(); j += 1) {
          num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
        }
      }

      return qrPolynomial(num, 0);
    };

    _this.mod = function(e) {

      if (_this.getLength() - e.getLength() < 0) {
        return _this;
      }

      var ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

      var num = new Array(_this.getLength() );
      for (var i = 0; i < _this.getLength(); i += 1) {
        num[i] = _this.getAt(i);
      }

      for (var i = 0; i < e.getLength(); i += 1) {
        num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
      }

      // recursive call
      return qrPolynomial(num, 0).mod(e);
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // QRRSBlock
  //---------------------------------------------------------------------

  var QRRSBlock = function() {

    var RS_BLOCK_TABLE = [

      // L
      // M
      // Q
      // H

      // 1
      [1, 26, 19],
      [1, 26, 16],
      [1, 26, 13],
      [1, 26, 9],

      // 2
      [1, 44, 34],
      [1, 44, 28],
      [1, 44, 22],
      [1, 44, 16],

      // 3
      [1, 70, 55],
      [1, 70, 44],
      [2, 35, 17],
      [2, 35, 13],

      // 4
      [1, 100, 80],
      [2, 50, 32],
      [2, 50, 24],
      [4, 25, 9],

      // 5
      [1, 134, 108],
      [2, 67, 43],
      [2, 33, 15, 2, 34, 16],
      [2, 33, 11, 2, 34, 12],

      // 6
      [2, 86, 68],
      [4, 43, 27],
      [4, 43, 19],
      [4, 43, 15],

      // 7
      [2, 98, 78],
      [4, 49, 31],
      [2, 32, 14, 4, 33, 15],
      [4, 39, 13, 1, 40, 14],

      // 8
      [2, 121, 97],
      [2, 60, 38, 2, 61, 39],
      [4, 40, 18, 2, 41, 19],
      [4, 40, 14, 2, 41, 15],

      // 9
      [2, 146, 116],
      [3, 58, 36, 2, 59, 37],
      [4, 36, 16, 4, 37, 17],
      [4, 36, 12, 4, 37, 13],

      // 10
      [2, 86, 68, 2, 87, 69],
      [4, 69, 43, 1, 70, 44],
      [6, 43, 19, 2, 44, 20],
      [6, 43, 15, 2, 44, 16],

      // 11
      [4, 101, 81],
      [1, 80, 50, 4, 81, 51],
      [4, 50, 22, 4, 51, 23],
      [3, 36, 12, 8, 37, 13],

      // 12
      [2, 116, 92, 2, 117, 93],
      [6, 58, 36, 2, 59, 37],
      [4, 46, 20, 6, 47, 21],
      [7, 42, 14, 4, 43, 15],

      // 13
      [4, 133, 107],
      [8, 59, 37, 1, 60, 38],
      [8, 44, 20, 4, 45, 21],
      [12, 33, 11, 4, 34, 12],

      // 14
      [3, 145, 115, 1, 146, 116],
      [4, 64, 40, 5, 65, 41],
      [11, 36, 16, 5, 37, 17],
      [11, 36, 12, 5, 37, 13],

      // 15
      [5, 109, 87, 1, 110, 88],
      [5, 65, 41, 5, 66, 42],
      [5, 54, 24, 7, 55, 25],
      [11, 36, 12, 7, 37, 13],

      // 16
      [5, 122, 98, 1, 123, 99],
      [7, 73, 45, 3, 74, 46],
      [15, 43, 19, 2, 44, 20],
      [3, 45, 15, 13, 46, 16],

      // 17
      [1, 135, 107, 5, 136, 108],
      [10, 74, 46, 1, 75, 47],
      [1, 50, 22, 15, 51, 23],
      [2, 42, 14, 17, 43, 15],

      // 18
      [5, 150, 120, 1, 151, 121],
      [9, 69, 43, 4, 70, 44],
      [17, 50, 22, 1, 51, 23],
      [2, 42, 14, 19, 43, 15],

      // 19
      [3, 141, 113, 4, 142, 114],
      [3, 70, 44, 11, 71, 45],
      [17, 47, 21, 4, 48, 22],
      [9, 39, 13, 16, 40, 14],

      // 20
      [3, 135, 107, 5, 136, 108],
      [3, 67, 41, 13, 68, 42],
      [15, 54, 24, 5, 55, 25],
      [15, 43, 15, 10, 44, 16],

      // 21
      [4, 144, 116, 4, 145, 117],
      [17, 68, 42],
      [17, 50, 22, 6, 51, 23],
      [19, 46, 16, 6, 47, 17],

      // 22
      [2, 139, 111, 7, 140, 112],
      [17, 74, 46],
      [7, 54, 24, 16, 55, 25],
      [34, 37, 13],

      // 23
      [4, 151, 121, 5, 152, 122],
      [4, 75, 47, 14, 76, 48],
      [11, 54, 24, 14, 55, 25],
      [16, 45, 15, 14, 46, 16],

      // 24
      [6, 147, 117, 4, 148, 118],
      [6, 73, 45, 14, 74, 46],
      [11, 54, 24, 16, 55, 25],
      [30, 46, 16, 2, 47, 17],

      // 25
      [8, 132, 106, 4, 133, 107],
      [8, 75, 47, 13, 76, 48],
      [7, 54, 24, 22, 55, 25],
      [22, 45, 15, 13, 46, 16],

      // 26
      [10, 142, 114, 2, 143, 115],
      [19, 74, 46, 4, 75, 47],
      [28, 50, 22, 6, 51, 23],
      [33, 46, 16, 4, 47, 17],

      // 27
      [8, 152, 122, 4, 153, 123],
      [22, 73, 45, 3, 74, 46],
      [8, 53, 23, 26, 54, 24],
      [12, 45, 15, 28, 46, 16],

      // 28
      [3, 147, 117, 10, 148, 118],
      [3, 73, 45, 23, 74, 46],
      [4, 54, 24, 31, 55, 25],
      [11, 45, 15, 31, 46, 16],

      // 29
      [7, 146, 116, 7, 147, 117],
      [21, 73, 45, 7, 74, 46],
      [1, 53, 23, 37, 54, 24],
      [19, 45, 15, 26, 46, 16],

      // 30
      [5, 145, 115, 10, 146, 116],
      [19, 75, 47, 10, 76, 48],
      [15, 54, 24, 25, 55, 25],
      [23, 45, 15, 25, 46, 16],

      // 31
      [13, 145, 115, 3, 146, 116],
      [2, 74, 46, 29, 75, 47],
      [42, 54, 24, 1, 55, 25],
      [23, 45, 15, 28, 46, 16],

      // 32
      [17, 145, 115],
      [10, 74, 46, 23, 75, 47],
      [10, 54, 24, 35, 55, 25],
      [19, 45, 15, 35, 46, 16],

      // 33
      [17, 145, 115, 1, 146, 116],
      [14, 74, 46, 21, 75, 47],
      [29, 54, 24, 19, 55, 25],
      [11, 45, 15, 46, 46, 16],

      // 34
      [13, 145, 115, 6, 146, 116],
      [14, 74, 46, 23, 75, 47],
      [44, 54, 24, 7, 55, 25],
      [59, 46, 16, 1, 47, 17],

      // 35
      [12, 151, 121, 7, 152, 122],
      [12, 75, 47, 26, 76, 48],
      [39, 54, 24, 14, 55, 25],
      [22, 45, 15, 41, 46, 16],

      // 36
      [6, 151, 121, 14, 152, 122],
      [6, 75, 47, 34, 76, 48],
      [46, 54, 24, 10, 55, 25],
      [2, 45, 15, 64, 46, 16],

      // 37
      [17, 152, 122, 4, 153, 123],
      [29, 74, 46, 14, 75, 47],
      [49, 54, 24, 10, 55, 25],
      [24, 45, 15, 46, 46, 16],

      // 38
      [4, 152, 122, 18, 153, 123],
      [13, 74, 46, 32, 75, 47],
      [48, 54, 24, 14, 55, 25],
      [42, 45, 15, 32, 46, 16],

      // 39
      [20, 147, 117, 4, 148, 118],
      [40, 75, 47, 7, 76, 48],
      [43, 54, 24, 22, 55, 25],
      [10, 45, 15, 67, 46, 16],

      // 40
      [19, 148, 118, 6, 149, 119],
      [18, 75, 47, 31, 76, 48],
      [34, 54, 24, 34, 55, 25],
      [20, 45, 15, 61, 46, 16]
    ];

    var qrRSBlock = function(totalCount, dataCount) {
      var _this = {};
      _this.totalCount = totalCount;
      _this.dataCount = dataCount;
      return _this;
    };

    var _this = {};

    var getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

      switch(errorCorrectionLevel) {
      case QRErrorCorrectionLevel.L :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case QRErrorCorrectionLevel.M :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case QRErrorCorrectionLevel.Q :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case QRErrorCorrectionLevel.H :
        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default :
        return undefined;
      }
    };

    _this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

      var rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

      if (typeof rsBlock == 'undefined') {
        throw 'bad rs block @ typeNumber:' + typeNumber +
            '/errorCorrectionLevel:' + errorCorrectionLevel;
      }

      var length = rsBlock.length / 3;

      var list = [];

      for (var i = 0; i < length; i += 1) {

        var count = rsBlock[i * 3 + 0];
        var totalCount = rsBlock[i * 3 + 1];
        var dataCount = rsBlock[i * 3 + 2];

        for (var j = 0; j < count; j += 1) {
          list.push(qrRSBlock(totalCount, dataCount) );
        }
      }

      return list;
    };

    return _this;
  }();

  //---------------------------------------------------------------------
  // qrBitBuffer
  //---------------------------------------------------------------------

  var qrBitBuffer = function() {

    var _buffer = [];
    var _length = 0;

    var _this = {};

    _this.getBuffer = function() {
      return _buffer;
    };

    _this.getAt = function(index) {
      var bufIndex = Math.floor(index / 8);
      return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
    };

    _this.put = function(num, length) {
      for (var i = 0; i < length; i += 1) {
        _this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
      }
    };

    _this.getLengthInBits = function() {
      return _length;
    };

    _this.putBit = function(bit) {

      var bufIndex = Math.floor(_length / 8);
      if (_buffer.length <= bufIndex) {
        _buffer.push(0);
      }

      if (bit) {
        _buffer[bufIndex] |= (0x80 >>> (_length % 8) );
      }

      _length += 1;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrNumber
  //---------------------------------------------------------------------

  var qrNumber = function(data) {

    var _mode = QRMode.MODE_NUMBER;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var data = _data;

      var i = 0;

      while (i + 2 < data.length) {
        buffer.put(strToNum(data.substring(i, i + 3) ), 10);
        i += 3;
      }

      if (i < data.length) {
        if (data.length - i == 1) {
          buffer.put(strToNum(data.substring(i, i + 1) ), 4);
        } else if (data.length - i == 2) {
          buffer.put(strToNum(data.substring(i, i + 2) ), 7);
        }
      }
    };

    var strToNum = function(s) {
      var num = 0;
      for (var i = 0; i < s.length; i += 1) {
        num = num * 10 + chatToNum(s.charAt(i) );
      }
      return num;
    };

    var chatToNum = function(c) {
      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      }
      throw 'illegal char :' + c;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrAlphaNum
  //---------------------------------------------------------------------

  var qrAlphaNum = function(data) {

    var _mode = QRMode.MODE_ALPHA_NUM;
    var _data = data;

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _data.length;
    };

    _this.write = function(buffer) {

      var s = _data;

      var i = 0;

      while (i + 1 < s.length) {
        buffer.put(
          getCode(s.charAt(i) ) * 45 +
          getCode(s.charAt(i + 1) ), 11);
        i += 2;
      }

      if (i < s.length) {
        buffer.put(getCode(s.charAt(i) ), 6);
      }
    };

    var getCode = function(c) {

      if ('0' <= c && c <= '9') {
        return c.charCodeAt(0) - '0'.charCodeAt(0);
      } else if ('A' <= c && c <= 'Z') {
        return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        switch (c) {
        case ' ' : return 36;
        case '$' : return 37;
        case '%' : return 38;
        case '*' : return 39;
        case '+' : return 40;
        case '-' : return 41;
        case '.' : return 42;
        case '/' : return 43;
        case ':' : return 44;
        default :
          throw 'illegal char :' + c;
        }
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qr8BitByte
  //---------------------------------------------------------------------

  var qr8BitByte = function(data) {

    var _mode = QRMode.MODE_8BIT_BYTE;
    var _data = data;
    var _bytes = qrcode.stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return _bytes.length;
    };

    _this.write = function(buffer) {
      for (var i = 0; i < _bytes.length; i += 1) {
        buffer.put(_bytes[i], 8);
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // qrKanji
  //---------------------------------------------------------------------

  var qrKanji = function(data) {

    var _mode = QRMode.MODE_KANJI;
    var _data = data;

    var stringToBytes = qrcode.stringToBytesFuncs['SJIS'];
    if (!stringToBytes) {
      throw 'sjis not supported.';
    }
    !function(c, code) {
      // self test for sjis support.
      var test = stringToBytes(c);
      if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
        throw 'sjis not supported.';
      }
    }('\u53cb', 0x9746);

    var _bytes = stringToBytes(data);

    var _this = {};

    _this.getMode = function() {
      return _mode;
    };

    _this.getLength = function(buffer) {
      return ~~(_bytes.length / 2);
    };

    _this.write = function(buffer) {

      var data = _bytes;

      var i = 0;

      while (i + 1 < data.length) {

        var c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

        if (0x8140 <= c && c <= 0x9FFC) {
          c -= 0x8140;
        } else if (0xE040 <= c && c <= 0xEBBF) {
          c -= 0xC140;
        } else {
          throw 'illegal char at ' + (i + 1) + '/' + c;
        }

        c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

        buffer.put(c, 13);

        i += 2;
      }

      if (i < data.length) {
        throw 'illegal char at ' + (i + 1);
      }
    };

    return _this;
  };

  //=====================================================================
  // GIF Support etc.
  //

  //---------------------------------------------------------------------
  // byteArrayOutputStream
  //---------------------------------------------------------------------

  var byteArrayOutputStream = function() {

    var _bytes = [];

    var _this = {};

    _this.writeByte = function(b) {
      _bytes.push(b & 0xff);
    };

    _this.writeShort = function(i) {
      _this.writeByte(i);
      _this.writeByte(i >>> 8);
    };

    _this.writeBytes = function(b, off, len) {
      off = off || 0;
      len = len || b.length;
      for (var i = 0; i < len; i += 1) {
        _this.writeByte(b[i + off]);
      }
    };

    _this.writeString = function(s) {
      for (var i = 0; i < s.length; i += 1) {
        _this.writeByte(s.charCodeAt(i) );
      }
    };

    _this.toByteArray = function() {
      return _bytes;
    };

    _this.toString = function() {
      var s = '';
      s += '[';
      for (var i = 0; i < _bytes.length; i += 1) {
        if (i > 0) {
          s += ',';
        }
        s += _bytes[i];
      }
      s += ']';
      return s;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64EncodeOutputStream
  //---------------------------------------------------------------------

  var base64EncodeOutputStream = function() {

    var _buffer = 0;
    var _buflen = 0;
    var _length = 0;
    var _base64 = '';

    var _this = {};

    var writeEncoded = function(b) {
      _base64 += String.fromCharCode(encode(b & 0x3f) );
    };

    var encode = function(n) {
      if (n < 0) {
        // error.
      } else if (n < 26) {
        return 0x41 + n;
      } else if (n < 52) {
        return 0x61 + (n - 26);
      } else if (n < 62) {
        return 0x30 + (n - 52);
      } else if (n == 62) {
        return 0x2b;
      } else if (n == 63) {
        return 0x2f;
      }
      throw 'n:' + n;
    };

    _this.writeByte = function(n) {

      _buffer = (_buffer << 8) | (n & 0xff);
      _buflen += 8;
      _length += 1;

      while (_buflen >= 6) {
        writeEncoded(_buffer >>> (_buflen - 6) );
        _buflen -= 6;
      }
    };

    _this.flush = function() {

      if (_buflen > 0) {
        writeEncoded(_buffer << (6 - _buflen) );
        _buffer = 0;
        _buflen = 0;
      }

      if (_length % 3 != 0) {
        // padding
        var padlen = 3 - _length % 3;
        for (var i = 0; i < padlen; i += 1) {
          _base64 += '=';
        }
      }
    };

    _this.toString = function() {
      return _base64;
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // base64DecodeInputStream
  //---------------------------------------------------------------------

  var base64DecodeInputStream = function(str) {

    var _str = str;
    var _pos = 0;
    var _buffer = 0;
    var _buflen = 0;

    var _this = {};

    _this.read = function() {

      while (_buflen < 8) {

        if (_pos >= _str.length) {
          if (_buflen == 0) {
            return -1;
          }
          throw 'unexpected end of file./' + _buflen;
        }

        var c = _str.charAt(_pos);
        _pos += 1;

        if (c == '=') {
          _buflen = 0;
          return -1;
        } else if (c.match(/^\s$/) ) {
          // ignore if whitespace.
          continue;
        }

        _buffer = (_buffer << 6) | decode(c.charCodeAt(0) );
        _buflen += 6;
      }

      var n = (_buffer >>> (_buflen - 8) ) & 0xff;
      _buflen -= 8;
      return n;
    };

    var decode = function(c) {
      if (0x41 <= c && c <= 0x5a) {
        return c - 0x41;
      } else if (0x61 <= c && c <= 0x7a) {
        return c - 0x61 + 26;
      } else if (0x30 <= c && c <= 0x39) {
        return c - 0x30 + 52;
      } else if (c == 0x2b) {
        return 62;
      } else if (c == 0x2f) {
        return 63;
      } else {
        throw 'c:' + c;
      }
    };

    return _this;
  };

  //---------------------------------------------------------------------
  // gifImage (B/W)
  //---------------------------------------------------------------------

  var gifImage = function(width, height) {

    var _width = width;
    var _height = height;
    var _data = new Array(width * height);

    var _this = {};

    _this.setPixel = function(x, y, pixel) {
      _data[y * _width + x] = pixel;
    };

    _this.write = function(out) {

      //---------------------------------
      // GIF Signature

      out.writeString('GIF87a');

      //---------------------------------
      // Screen Descriptor

      out.writeShort(_width);
      out.writeShort(_height);

      out.writeByte(0x80); // 2bit
      out.writeByte(0);
      out.writeByte(0);

      //---------------------------------
      // Global Color Map

      // black
      out.writeByte(0x00);
      out.writeByte(0x00);
      out.writeByte(0x00);

      // white
      out.writeByte(0xff);
      out.writeByte(0xff);
      out.writeByte(0xff);

      //---------------------------------
      // Image Descriptor

      out.writeString(',');
      out.writeShort(0);
      out.writeShort(0);
      out.writeShort(_width);
      out.writeShort(_height);
      out.writeByte(0);

      //---------------------------------
      // Local Color Map

      //---------------------------------
      // Raster Data

      var lzwMinCodeSize = 2;
      var raster = getLZWRaster(lzwMinCodeSize);

      out.writeByte(lzwMinCodeSize);

      var offset = 0;

      while (raster.length - offset > 255) {
        out.writeByte(255);
        out.writeBytes(raster, offset, 255);
        offset += 255;
      }

      out.writeByte(raster.length - offset);
      out.writeBytes(raster, offset, raster.length - offset);
      out.writeByte(0x00);

      //---------------------------------
      // GIF Terminator
      out.writeString(';');
    };

    var bitOutputStream = function(out) {

      var _out = out;
      var _bitLength = 0;
      var _bitBuffer = 0;

      var _this = {};

      _this.write = function(data, length) {

        if ( (data >>> length) != 0) {
          throw 'length over';
        }

        while (_bitLength + length >= 8) {
          _out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
          length -= (8 - _bitLength);
          data >>>= (8 - _bitLength);
          _bitBuffer = 0;
          _bitLength = 0;
        }

        _bitBuffer = (data << _bitLength) | _bitBuffer;
        _bitLength = _bitLength + length;
      };

      _this.flush = function() {
        if (_bitLength > 0) {
          _out.writeByte(_bitBuffer);
        }
      };

      return _this;
    };

    var getLZWRaster = function(lzwMinCodeSize) {

      var clearCode = 1 << lzwMinCodeSize;
      var endCode = (1 << lzwMinCodeSize) + 1;
      var bitLength = lzwMinCodeSize + 1;

      // Setup LZWTable
      var table = lzwTable();

      for (var i = 0; i < clearCode; i += 1) {
        table.add(String.fromCharCode(i) );
      }
      table.add(String.fromCharCode(clearCode) );
      table.add(String.fromCharCode(endCode) );

      var byteOut = byteArrayOutputStream();
      var bitOut = bitOutputStream(byteOut);

      // clear code
      bitOut.write(clearCode, bitLength);

      var dataIndex = 0;

      var s = String.fromCharCode(_data[dataIndex]);
      dataIndex += 1;

      while (dataIndex < _data.length) {

        var c = String.fromCharCode(_data[dataIndex]);
        dataIndex += 1;

        if (table.contains(s + c) ) {

          s = s + c;

        } else {

          bitOut.write(table.indexOf(s), bitLength);

          if (table.size() < 0xfff) {

            if (table.size() == (1 << bitLength) ) {
              bitLength += 1;
            }

            table.add(s + c);
          }

          s = c;
        }
      }

      bitOut.write(table.indexOf(s), bitLength);

      // end code
      bitOut.write(endCode, bitLength);

      bitOut.flush();

      return byteOut.toByteArray();
    };

    var lzwTable = function() {

      var _map = {};
      var _size = 0;

      var _this = {};

      _this.add = function(key) {
        if (_this.contains(key) ) {
          throw 'dup key:' + key;
        }
        _map[key] = _size;
        _size += 1;
      };

      _this.size = function() {
        return _size;
      };

      _this.indexOf = function(key) {
        return _map[key];
      };

      _this.contains = function(key) {
        return typeof _map[key] != 'undefined';
      };

      return _this;
    };

    return _this;
  };

  var createDataURL = function(width, height, getPixel) {
    var gif = gifImage(width, height);
    for (var y = 0; y < height; y += 1) {
      for (var x = 0; x < width; x += 1) {
        gif.setPixel(x, y, getPixel(x, y) );
      }
    }

    var b = byteArrayOutputStream();
    gif.write(b);

    var base64 = base64EncodeOutputStream();
    var bytes = b.toByteArray();
    for (var i = 0; i < bytes.length; i += 1) {
      base64.writeByte(bytes[i]);
    }
    base64.flush();

    return 'data:image/gif;base64,' + base64;
  };

  //---------------------------------------------------------------------
  // returns qrcode function.

  return qrcode;
}();

// multibyte support
!function() {

  qrcode.stringToBytesFuncs['UTF-8'] = function(s) {
    // http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
    function toUTF8Array(str) {
      var utf8 = [];
      for (var i=0; i < str.length; i++) {
        var charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6),
              0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
        // surrogate pair
        else {
          i++;
          // UTF-16 encodes 0x10000-0x10FFFF by
          // subtracting 0x10000 and splitting the
          // 20 bits of 0x0-0xFFFFF into two halves
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
            | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18),
              0x80 | ((charcode>>12) & 0x3f),
              0x80 | ((charcode>>6) & 0x3f),
              0x80 | (charcode & 0x3f));
        }
      }
      return utf8;
    }
    return toUTF8Array(s);
  };

}();

function qrPng(text, scale, margin) {
  scale = scale || 8; margin = margin == null ? 2 : margin;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  var q = qrcode(0, 'M'); q.addData(String(text), 'Byte'); q.make();
  var n = q.getModuleCount(), size = (n + 2*margin)*scale, rowLen = 1 + Math.ceil(size/8);
  var raw = new Uint8Array(rowLen*size);                       // 1-bit greyscale, 1 = white
  for (var y = 0; y < size; y++) {
    var my = Math.floor(y/scale) - margin, o = y*rowLen; raw[o] = 0;
    for (var x = 0; x < size; x++) {
      var mx = Math.floor(x/scale) - margin;
      var dark = mx >= 0 && my >= 0 && mx < n && my < n && q.isDark(my, mx);
      if (!dark) raw[o + 1 + (x >> 3)] |= (0x80 >> (x & 7));
    }
  }
  // zlib stream with stored (uncompressed) blocks
  var blocks = [], pos = 0;
  while (pos < raw.length || pos === 0) { var len = Math.min(65535, raw.length - pos), last = pos + len >= raw.length;
    blocks.push(new Uint8Array([last ? 1 : 0, len & 255, len >> 8, (~len) & 255, ((~len) >> 8) & 255])); blocks.push(raw.subarray(pos, pos + len)); pos += len; if (!len) break; }
  var a = 1, b = 0; for (var i = 0; i < raw.length; i++) { a = (a + raw[i]) % 65521; b = (b + a) % 65521; }
  var zlen = 2 + blocks.reduce(function (t, x) { return t + x.length; }, 0) + 4, z = new Uint8Array(zlen), zp = 0;
  z[zp++] = 0x78; z[zp++] = 0x01; blocks.forEach(function (x) { z.set(x, zp); zp += x.length; });
  var ad = ((b << 16) | a) >>> 0; z[zp++] = ad >>> 24; z[zp++] = (ad >>> 16) & 255; z[zp++] = (ad >>> 8) & 255; z[zp++] = ad & 255;
  function u32(v) { return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]; }
  function crc32(buf) { var tb = qrPng.crcT; if (!tb) { tb = qrPng.crcT = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tb[n] = c >>> 0; } }
    var cr = 0xFFFFFFFF; for (var j = 0; j < buf.length; j++) cr = tb[(cr ^ buf[j]) & 255] ^ (cr >>> 8); return (cr ^ 0xFFFFFFFF) >>> 0; }
  function chunk(type, data) {
    var t = [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)], td = new Uint8Array(4 + data.length);
    td.set(t, 0); td.set(data, 4);
    var out = new Uint8Array(12 + data.length); out.set(u32(data.length), 0); out.set(td, 4); out.set(u32(crc32(td)), 8 + data.length); return out;
  }
  var ihdr = new Uint8Array([].concat(u32(size), u32(size), [1, 0, 0, 0, 0]));
  var parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', new Uint8Array(0))];
  var tot = parts.reduce(function (t, x) { return t + x.length; }, 0), png = new Uint8Array(tot), pp = 0;
  parts.forEach(function (x) { png.set(x, pp); pp += x.length; });
  return png;
}
function qrF(id) { return { f:'_xlfn.IMAGE("https://quickchart.io/qr?text=' + encodeURIComponent(id).replace(/%2F/g, '/') + '")' }; }

/* ----------------------------------------------------------------- main */
async function buildReport(tplBytes, pj, opts) {
  opts = opts || {};
  var zip = await JSZipLib.loadAsync(tplBytes);
  var rd = function (n) { var f = zip.file(n); return f ? f.async('string') : Promise.resolve(null); };
  var wr = function (n, s) { zip.file(n, s); };

  /* the template may be a full report: drop cached rich values (QR pictures), calc chain */
  var wbRels = await rd('xl/_rels/workbook.xml.rels'), ct = await rd('[Content_Types].xml');
  var richImgs = [], rir = await rd('xl/richData/_rels/rdRichValueWebImage.xml.rels');
  if (rir) rir.replace(/Target="\.\.\/media\/([^"]+)"/g, function (_, f) { richImgs.push('xl/media/' + f); return _; });
  Object.keys(zip.files).forEach(function (n) { if (/^xl\/richData\//.test(n) || n === 'xl/metadata.xml' || n === 'xl/calcChain.xml' || richImgs.indexOf(n) >= 0) zip.remove(n); });
  wbRels = wbRels.replace(/<Relationship [^>]*Target="(?:metadata\.xml|calcChain\.xml|richData\/[^"]+)"[^>]*\/>/g, '');
  ct = ct.replace(/<Override PartName="\/xl\/(?:metadata\.xml|calcChain\.xml|richData\/[^"]+)"[^>]*\/>/g, '');
  wr('xl/_rels/workbook.xml.rels', wbRels); wr('[Content_Types].xml', ct);

  var wbXml = await rd('xl/workbook.xml');
  var sheetPath = {};
  wbXml.replace(/<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"\/>/g, function (_, name, rid) {
    var m = new RegExp('<Relationship (?:[^>]*?)Id="' + rid + '"[^>]*?Target="([^"]+)"').exec(wbRels) || new RegExp('<Relationship (?:[^>]*?)Target="([^"]+)"[^>]*?Id="' + rid + '"').exec(wbRels);
    if (m) sheetPath[name] = 'xl/' + m[1].replace(/^\//, '').replace(/^xl\//, '');
    return _;
  });
  var sst = new SST(await rd('xl/sharedStrings.xml'));
  var proj = pj.project || 'PROJEKTAS';
  var parts = sortParts(pj.parts.map(function (p) {
    return { solid:p.solid, dbpart:p.dbpart, name:p.name, mat:p.mat || '', L:+p.L, W:+p.W, T:+p.T, qty:Math.max(1, Math.round(+p.qty || 1)),
             eb:p.eb || {}, ebFac:p.ebFac || {}, ebInfo:p.ebInfo || {}, stockRef:p.stockRef || '', progs:p.progs || [], pic:p.pic || null, grainVert:!!p.grainVert };
  }));
  /* material check (v20): a material whose thickness is not the part's is flagged — yellow row, NOTES "PATIKRINTI: …" */
  var nFlag = 0;
  parts.forEach(function (p) {
    var mt = thkFromName(p.mat);
    if (mt > 0 && Math.abs(mt - p.T) > 0.3) { p.flag = true; nFlag++; p.note = 'PATIKRINTI: MEDZIAGA ' + p.mat + ' (' + numText(mt) + ' mm) NEATITINKA STORIO ' + numText(p.T) + ' mm'; }
  });
  /* yellow (FFFF99) copies of the styles a flagged row uses */
  var stylesXml = await rd('xl/styles.xml'), yellowOf = {}, yFill = null;
  var yellow = function (sid) {
    if (sid == null || !stylesXml) return sid;
    if (yellowOf[sid] !== undefined) return yellowOf[sid];
    if (yFill === null) {
      var fm = /<fills count="(\d+)">/.exec(stylesXml); if (!fm) return sid;
      yFill = +fm[1];
      stylesXml = stylesXml.replace(/<fills count="\d+">([\s\S]*?)<\/fills>/, function (m0, body) { return '<fills count="' + (yFill + 1) + '">' + body + '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF99"/><bgColor indexed="64"/></patternFill></fill></fills>'; });
    }
    var xm = /<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/.exec(stylesXml); if (!xm) return sid;
    var xfs = xm[1].match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g) || [], src = xfs[+sid]; if (!src) return sid;
    var nx = / fillId="\d+"/.test(src) ? src.replace(/ fillId="\d+"/, ' fillId="' + yFill + '"') : src.replace('<xf ', '<xf fillId="' + yFill + '" ');
    nx = / applyFill="\d"/.test(nx) ? nx.replace(/ applyFill="\d"/, ' applyFill="1"') : nx.replace('<xf ', '<xf applyFill="1" ');
    stylesXml = stylesXml.replace(/<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/, function (m0, body) { return '<cellXfs count="' + (xfs.length + 1) + '">' + body + nx + '</cellXfs>'; });
    yellowOf[sid] = String(xfs.length);
    return yellowOf[sid];
  };
  var drawingOf = async function (sheetFile) {
    var rels = await rd(sheetFile.replace('worksheets/', 'worksheets/_rels/') + '.rels');
    var m = rels && /Target="\.\.\/drawings\/(drawing\d+\.xml)"/.exec(rels);
    return m ? 'xl/drawings/' + m[1] : null;
  };
  var emptyDrawing = function (xml) { var keep = (xml.match(/<xdr:(twoCellAnchor|oneCellAnchor)[^>]*>[\s\S]*?<\/xdr:\1>/g) || []).filter(function (a) { return a.indexOf('<xdr:pic>') >= 0 && !/name="PIC_/.test(a); });
    return { head:xml.slice(0, xml.indexOf('>', xml.indexOf('<xdr:wsDr')) + 1), keep:keep.join('') }; };

  /* ================= PARTLIST ================= */
  var plPath = sheetPath.PARTLIST, pl = await rd(plPath), plRows = parseRows(pl);
  var head = pl.slice(0, pl.indexOf('<sheetData>') + 11), tail = pl.slice(pl.indexOf('</sheetData>'));
  var out = [], heights = {};
  for (var r = 1; r <= 9; r++) if (plRows[r]) {
    var put = {}; if (r === 1) put[10] = proj; if (r === 5) put[17] = proj;
    var hr = { attrs:pxAttrs(plRows[r].attrs), cells:plRows[r].cells };
    out.push(moveRow(hr, r, put, function () { return false; }, sst));
    heights[r] = +((/ ht="([\d.]+)"/.exec(hr.attrs) || [0, 15])[1]);
  }
  var gFirst = plRows[10], gNext = plRows[12] || plRows[10], dRow = plRows[11] || plRows[13];
  var settingsCells = {};   // template cells right of the table in rows 10-12 (SETTINGS_* switches)
  [10, 11, 12].forEach(function (rr) { settingsCells[rr] = (plRows[rr] ? plRows[rr].cells : []).filter(function (c) { return c.col >= 24 && c.col <= 28 && c.col !== 27; }); });   // AA holds the template's last part name (another customer's) — left out
  var ds = styleMap(dRow), gs1 = styleMap(gFirst), gs2 = styleMap(gNext);
  var dAttrs = pxAttrs(dRow.attrs), gAttrs = pxAttrs(gFirst.attrs);
  var merges = [], plPics = [], row = 10, lastKey = null, firstGroup = true;
  var rowCells = function (rr, list) {   // append the template settings cells for rows 10-12
    (settingsCells[rr] || []).forEach(function (c) { list.push({ col:c.col, x:c.xml.replace(/r="[A-Z]+\d+"/, 'r="' + colName(c.col) + rr + '"') }); });
    list.sort(function (a, b) { return a.col - b.col; });
    return list.map(function (o) { return o.x; }).join('');
  };
  parts.forEach(function (p) {
    var key = String(Math.round(p.T*10));   // one group per thickness (v20, as SWOOD); the materials are sorted inside it
    if (key !== lastKey) {
      lastKey = key; var gsm = firstGroup ? gs1 : gs2; firstGroup = false;
      var list = [{ col:1, x:cEmpty('A' + row, gsm[1]) }, { col:2, x:cell('B' + row, gsm[2], (Math.round(p.T*10)/10) + ' mm', sst) }];
      for (var c = 3; c <= 18; c++) list.push({ col:c, x:cEmpty(colName(c) + row, gsm[c]) });
      for (var c2 = 19; c2 <= 23; c2++) if (gsm[c2]) list.push({ col:c2, x:cEmpty(colName(c2) + row, gsm[c2]) });
      out.push(rowXml(row, gAttrs, rowCells(row, list))); heights[row] = +((/ ht="([\d.]+)"/.exec(gAttrs) || [0, 24.75])[1]);
      merges.push('B' + row + ':R' + row); row++;
    }
    var v = { 1:{ f:'D' + row, str:1 }, 2:'', 3:p.solid, 4:p.dbpart, 5:p.name, 6:p.mat, 7:p.L, 8:p.W, 9:p.T, 10:p.qty,
              11:p.eb.F || '', 12:p.eb.B || '', 13:p.eb.L || '', 14:p.eb.R || '', 15:'', 16:p.note || p.name, 17:p.solid, 18:{ f:'$Q$5&""&(ROW()-9)', str:1 } };
    var list2 = [];
    for (var c3 = 1; c3 <= 18; c3++) list2.push({ col:c3, x:cell(colName(c3) + row, p.flag && c3 >= 3 && c3 <= 17 ? yellow(ds[c3]) : ds[c3], v[c3], sst) });
    for (var c4 = 19; c4 <= 23; c4++) if (ds[c4]) list2.push({ col:c4, x:cEmpty(colName(c4) + row, ds[c4]) });
    out.push(rowXml(row, dAttrs, rowCells(row, list2))); heights[row] = +((/ ht="([\d.]+)"/.exec(dAttrs) || [0, 60])[1]);
    plPics.push({ row:row, part:p }); row++;
  });
  for (var rr2 = row; rr2 <= 12; rr2++) if (settingsCells[rr2] && settingsCells[rr2].length) out.push(rowXml(rr2, '', rowCells(rr2, [])));
  var lastPl = Math.max(row - 1, 9);
  var tplMerges = (pl.match(/<mergeCell ref="([^"]+)"\/>/g) || []).map(function (m) { return /ref="([^"]+)"/.exec(m)[1]; }).filter(function (m) { return +/\d+/.exec(m)[0] <= 9; });
  merges = tplMerges.concat(merges);
  tail = tail.replace(/<mergeCells[\s\S]*?<\/mergeCells>/, '<mergeCells count="' + merges.length + '">' + merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>');
  tail = tail.replace(/<conditionalFormatting sqref="([^"]+)">/g, function (m0, sq) {   // status rules follow the data rows
    var first = sq.split(' ')[0], rr = +/\d+/.exec(first)[0]; if (rr <= 9) return m0;
    var cols = first.replace(/\d+/g, '').split(':'); return '<conditionalFormatting sqref="' + cols[0] + '10' + (cols[1] ? ':' + cols[1] : ':' + cols[0]) + lastPl + '">';
  });
  head = head.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:AI' + lastPl + '"/>');
  wr(plPath, head + out.join('') + tail);
  var plGeom = new Geom(pl, heights);
  var plDrawPath = await drawingOf(plPath);
  if (plDrawPath) {
    var d1 = emptyDrawing(await rd(plDrawPath)), sh1 = new Shapes(plGeom); sh1.id = 1000;
    plPics.forEach(function (q) { drawPanel(sh1, 'PIC_B' + q.row, q.part, plGeom.colStart(2) + 3 + 120.5/2, plGeom.rowTop(q.row) + 32.2, 120.5, 54); });
    wr(plDrawPath, d1.head + d1.keep + sh1.out.join('') + '</xdr:wsDr>');
  }

  /* ================= LABEL ================= */
  var lbPath = sheetPath.LABEL, lb = await rd(lbPath), lbRows = parseRows(lb);
  var lhead = lb.slice(0, lb.indexOf('<sheetData>') + 11), ltail = lb.slice(lb.indexOf('</sheetData>'));
  var labels = parts.slice();   // one label per PARTLIST row, as DB_PartList (the quantity is on the label's part list row)
  var nBlocks = Math.ceil(labels.length / 2), lout = [], lheights = {}, lmerges = [], lpics = [], lqrs = [];
  var tplMergesL = (lb.match(/<mergeCell ref="([^"]+)"\/>/g) || []).map(function (m) { return /ref="([^"]+)"/.exec(m)[1]; });
  var mBlock1 = tplMergesL.filter(function (m) { return +/\d+/.exec(m)[0] <= 10; });
  var mBlock2 = tplMergesL.filter(function (m) { var n = +/\d+/.exec(m)[0]; return n >= 11 && n <= 20; });
  if (!mBlock2.length) mBlock2 = mBlock1.filter(function (m) { return colNum(/[A-Z]+/.exec(m)[0]) <= 14; }).map(function (m) { return shiftRange(m, 10); });
  var labelArea = function (c) { return c <= 14; };
  for (var b = 0; b < nBlocks; b++) {
    var base = 10*b + 1, L = labels[2*b], R = labels[2*b + 1];
    for (var i = 0; i < 10; i++) {
      var tr = b === 0 ? lbRows[1 + i] : (lbRows[11 + i] || lbRows[1 + i]), rnum = base + i, put = {};
      var side = function (p, off) {
        if (!p) { if (i === 1) { put[1 + off] = ''; put[6 + off] = ''; } return; }
        if (i === 1) { put[1 + off] = '1OP'; put[2 + off] = p.dbpart; put[6 + off] = '2OP'; }
        if (i === 2) {
          put[1 + off] = ''; put[6 + off] = '';
          lqrs.push({ col:1 + off, row:rnum, text:(p.progs[0] ? p.progs[0].id : p.dbpart + '_1OP') });
          if (p.progs[1]) lqrs.push({ col:6 + off, row:rnum, text:p.progs[1].id });
          put[2 + off] = ebLbl(p, 'L'); put[3 + off] = ebLbl(p, 'B'); put[5 + off] = ebLbl(p, 'R');
        }
        if (i === 7) put[3 + off] = ebLbl(p, 'F');
        if (i === 8) { put[1 + off] = fmt1(p.L) + 'x' + fmt1(p.W) + 'x' + fmt1(p.T); put[4 + off] = p.name; }
        if (i === 9) { put[1 + off] = 'MAT: ' + p.mat; put[4 + off] = p.solid; }
      };
      side(L, 0); side(R, 7);
      tr = { attrs:pxAttrs(tr.attrs), cells:tr.cells };
      lout.push(moveRow(tr, rnum, put, function (c) { return labelArea(c) && !(i === 1 && (c === 1 || c === 6 || c === 8 || c === 13)); }, sst));
      lheights[rnum] = +((/ ht="([\d.]+)"/.exec(tr.attrs) || [0, 15])[1]);
    }
    (b === 0 ? mBlock1 : mBlock2.map(function (m) { return shiftRange(m, 10*(b - 1)); })).forEach(function (m) { lmerges.push(m); });
    if (L) lpics.push({ col:3, row:base + 3, part:L });
    if (R) lpics.push({ col:10, row:base + 3, part:R });
  }
  var lastLb = Math.max(10*nBlocks, 1);
  ltail = ltail.replace(/<mergeCells[\s\S]*?<\/mergeCells>/, lmerges.length ? '<mergeCells count="' + lmerges.length + '">' + lmerges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>' : '');
  ltail = ltail.replace(/<conditionalFormatting sqref="([^"]+)">[\s\S]*?<\/conditionalFormatting>/g, function (m0, sq) { return +/\d+/.exec(sq)[0] <= 10 ? m0 : ''; });
  lhead = lhead.replace(/<dimension ref="[^"]*"\/>/, '<dimension ref="A1:AE' + lastLb + '"/>').replace(/ topLeftCell="[^"]*"/, '').replace(/<selection [^>]*\/>/, '<selection activeCell="A1" sqref="A1"/>');
  wr(lbPath, lhead + lout.join('') + ltail);
  var lbGeom = new Geom(lb, lheights);
  var lbDrawPath = await drawingOf(lbPath);
  if (lbDrawPath) {
    var d2 = emptyDrawing(await rd(lbDrawPath)), sh2 = new Shapes(lbGeom); sh2.id = 1000;
    lpics.forEach(function (q) { drawPanel(sh2, 'PIC_' + colName(q.col) + q.row, q.part, lbGeom.colStart(q.col) + 3 + 109/2, lbGeom.rowTop(q.row) + 30, 109, 54); });
    // QR pictures: one PNG per program, centred in the QR's merged cell (A3:A7 …)
    var dRelsPath = lbDrawPath.replace('drawings/', 'drawings/_rels/') + '.rels';
    var dRels = (await rd(dRelsPath)) || '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    dRels = dRels.replace(/<Relationship [^>]*Target="\.\.\/media\/dbqr_[^"]*"[^>]*\/>/g, '');
    Object.keys(zip.files).forEach(function (n) { if (/^xl\/media\/dbqr_/.test(n)) zip.remove(n); });
    var qrOut = [], rels = [];
    lqrs.forEach(function (q, k) {
      var ref = colName(q.col) + q.row, box = null;
      lmerges.forEach(function (m) { var mm = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(m); if (!mm) return;
        var c1 = colNum(mm[1]), r1 = +mm[2], c2 = colNum(mm[3]), r2 = +mm[4];
        if (q.col >= c1 && q.col <= c2 && q.row >= r1 && q.row <= r2) box = { c1:c1, r1:r1, c2:c2, r2:r2 }; });
      if (!box) box = { c1:q.col, r1:q.row, c2:q.col, r2:q.row };
      var x0 = lbGeom.colStart(box.c1), x1 = lbGeom.colStart(box.c2 + 1), y0 = lbGeom.rowTop(box.r1), y1 = lbGeom.rowTop(box.r2 + 1);
      var side = Math.max(10, Math.min(x1 - x0, y1 - y0) - 6), x = x0 + (x1 - x0 - side)/2, y = y0 + (y1 - y0 - side)/2;
      var rid = 'rIdDbQr' + (k + 1), media = 'dbqr_' + (k + 1) + '.png';
      zip.file('xl/media/' + media, qrPng(q.text, 8, 2));
      rels.push('<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/' + media + '"/>');
      qrOut.push(anchor(lbGeom, x, y, side, side, '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="' + (5000 + k) + '" name="PIC_QR_' + ref + '" descr="' + esc(q.text) + '"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>' +
        '<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
        '<xdr:spPr>' + xfrm(x, y, side, side) + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>'));
    });
    if (rels.length) {
      wr(dRelsPath, dRels.replace('</Relationships>', rels.join('') + '</Relationships>'));
      var ctx = await rd('[Content_Types].xml');
      if (ctx && !/Default Extension="png"/i.test(ctx)) wr('[Content_Types].xml', ctx.replace('<Default ', '<Default Extension="png" ContentType="image/png"/><Default '));
    }
    wr(lbDrawPath, d2.head + d2.keep + sh2.out.join('') + qrOut.join('') + '</xdr:wsDr>');
  }

  /* ================= EDGEBAND / STOCK_CORE / HARDWARE(_LIST) ================= */
  async function fillList(name, firstRow, nSettings, rowsData) {
    var path = sheetPath[name]; if (!path) return;
    var x = await rd(path), rows = parseRows(x), hd = x.slice(0, x.indexOf('<sheetData>') + 11), tl = x.slice(x.indexOf('</sheetData>'));
    var tplRow = rows[firstRow], st = styleMap(tplRow), keepCols = {};
    var settings = {}; for (var k = 0; k < nSettings; k++) settings[firstRow + k] = (rows[firstRow + k] ? rows[firstRow + k].cells : []).filter(function (c) { return c.col > rowsData.lastCol; });
    var o = []; Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (r) { if (r < firstRow) o.push(moveRow(rows[r], r, {}, function () { return false; }, sst)); });
    var n = Math.max(rowsData.rows.length, nSettings);
    for (var i = 0; i < n; i++) {
      var r = firstRow + i, vals = rowsData.rows[i], list = [];
      if (vals) for (var c = 2; c <= rowsData.lastCol; c++) {
        var v = typeof vals[c] === 'function' ? vals[c](r) : vals[c];
        list.push({ col:c, x:cell(colName(c) + r, st[c], v, sst) });
      }
      (settings[r] || []).forEach(function (cc) { list.push({ col:cc.col, x:cc.xml.replace(/r="[A-Z]+\d+"/, 'r="' + colName(cc.col) + r + '"') }); });
      list.sort(function (a, b) { return a.col - b.col; });
      o.push(rowXml(r, tplRow ? tplRow.attrs : ' ht="15" customHeight="1"', list.map(function (q) { return q.x; }).join('')));
    }
    hd = hd.replace(/<dimension ref="([A-Z]+\d+):([A-Z]+)\d+"\/>/, function (m, a, c) { return '<dimension ref="' + a + ':' + c + (firstRow + n - 1) + '"/>'; });
    wr(path, hd + o.join('') + tl);
  }
  var EB_ORDER = [['F', 'Edgeband1'], ['B', 'Edgeband2'], ['L', 'Edgeband3'], ['R', 'Edgeband4']];
  var ebRows = [];
  parts.forEach(function (p) { EB_ORDER.forEach(function (e) { if (!p.eb[e[0]]) return;
    var inf = p.ebInfo[e[0]] || {};
    var len = inf.len || ((e[0] === 'F' || e[0] === 'B') ? p.L : p.W);
    ebRows.push({ 3:p.solid, 5:inf.feat || e[1], 6:p.eb[e[0]], 9:len, 10:inf.thk, 11:p.qty, 13:inf.cost, 12:function (r) { return { f:'IFERROR((I' + r + ')/(1000)*K' + r + ',0)' }; }, 14:function (r) { return { f:'IFERROR((L' + r + '*M' + r + '),0)' }; } }); }); });
  await fillList('EDGEBAND', 4, 3, { lastCol:14, rows:ebRows });
  var scRows = parts.map(function (p) { return { 3:p.solid, 5:'CORE', 6:p.mat, 8:p.stockRef, 9:p.L, 10:p.W, 11:p.T, 12:p.qty,
    13:function (r) { return { f:'IFERROR((I' + r + ')/(1000)*L' + r + ',0)' }; }, 14:function (r) { return { f:'IFERROR((I' + r + '*J' + r + ')/(1000^2)*L' + r + ',0)' }; },
    15:function (r) { return { f:'IFERROR((I' + r + '*J' + r + '*K' + r + ')/(1000^3)*L' + r + ',0)' }; }, 16:function (r) { return { f:'IF(R' + r + '=1,N' + r + ',IF(R' + r + '=0,O' + r + ',M' + r + '))' }; },
    18:1, 19:function (r) { return { f:'IF(R' + r + '="","",IF(R' + r + '=1,"m²",IF(R' + r + '=0,"m3","ml")))', str:1 }; }, 20:function (r) { return { f:'IFERROR((P' + r + '*Q' + r + '),0)' }; } }; });
  await fillList('STOCK_CORE', 4, 3, { lastCol:20, rows:scRows });
  var hwRows = (pj.hardware || []).map(function (h) { return { 3:h.item, 4:h.supplier, 5:h.ref, 6:h.qty, 7:h.cost || 0, 8:{ f:'VLOOKUP("F",Tp_LANGUAGE!$A$2:$Z$1001,MATCH(Tp_Global!$J$6,Tp_LANGUAGE!$A$1:$Z$1,0),FALSE)', str:1 } }; });
  await fillList('HARDWARE_LIST', 8, 3, { lastCol:8, rows:hwRows });
  await fillList('HARDWARE', 8, 3, { lastCol:8, rows:hwRows });

  if (yFill !== null) wr('xl/styles.xml', stylesXml);
  if (opts.info) opts.info.flagged = nFlag;

  /* ================= every sheet opens at A1, PARTLIST in front (v20 ResetViews) ================= */
  var order = []; wbXml.replace(/<sheet name="([^"]+)"/g, function (_, n) { order.push(n); return _; });
  for (var si = 0; si < order.length; si++) {
    var sp = sheetPath[order[si]], sx = sp && await rd(sp); if (!sx) continue;
    sx = sx.replace(/<sheetView\b([^>]*?)(\/?)>/, function (m0, a, sl) {
      a = a.replace(/ topLeftCell="[^"]*"/, '').replace(/ tabSelected="[^"]*"/, '');
      if (order[si] === 'PARTLIST') a = ' tabSelected="1"' + a;
      return '<sheetView' + a + sl + '>';
    });
    if (!/<pane\b/.test(sx)) sx = sx.replace(/<selection\b[^>]*\/>/, '<selection activeCell="A1" sqref="A1"/>');
    wr(sp, sx);
  }
  var plIdx = Math.max(0, order.indexOf('PARTLIST'));
  wbXml = wbXml.replace(/<workbookView\b([^>]*?)\/>/, function (m0, a) { return '<workbookView' + attr(attr(a, 'activeTab', plIdx), 'firstSheet', 0) + '/>'; });

  /* ================= .xlsx: no macros (v20 OUT_SUFFIX) — VBA, its relations and the macro buttons' links go ================= */
  if (opts.xlsx !== false) {
    var ctx = await rd('[Content_Types].xml'), wrx = await rd('xl/_rels/workbook.xml.rels');
    Object.keys(zip.files).forEach(function (n) { if (/^xl\/vbaProject[^/]*\.bin$/i.test(n) || /^xl\/_rels\/vbaProject[^/]*\.rels$/i.test(n)) zip.remove(n); });
    wrx = wrx.replace(/<Relationship [^>]*Target="vbaProject[^"]*"[^>]*\/>/g, '');
    ctx = ctx.replace(/<Override PartName="\/xl\/vbaProject[^"]*"[^>]*\/>/g, '').replace(/<Default Extension="bin" ContentType="application\/vnd\.ms-office\.vbaProject"\/>/g, '')
             .replace('application/vnd.ms-excel.sheet.macroEnabled.main+xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml');
    if (!/Extension="bin"/.test(ctx)) ctx = ctx.replace('<Default ', '<Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.printerSettings"/><Default ');
    wr('[Content_Types].xml', ctx); wr('xl/_rels/workbook.xml.rels', wrx);
    var mf = Object.keys(zip.files).filter(function (n) { return /^xl\/(worksheets|drawings)\/[^/]+\.(xml|vml)$/.test(n); });
    for (var mi = 0; mi < mf.length; mi++) {
      var mx = await rd(mf[mi]); if (!mx || !/macro="[^"]|FmlaMacro/.test(mx)) continue;
      wr(mf[mi], mx.replace(/ macro="[^"]+"/g, function (m0) { return /^xl\/drawings\/[^/]+\.xml$/.test(mf[mi]) ? ' macro=""' : ''; }).replace(/<x:FmlaMacro>[^<]*<\/x:FmlaMacro>/g, ''));
    }
  }

  /* ================= workbook: recalc + pivots on open, version name ================= */
  wbXml = wbXml.replace(/<calcPr([^>]*?)\/>/, function (m, a) { return '<calcPr' + attr(a, 'fullCalcOnLoad', '1') + '/>'; });
  var ver = opts.version || 'v20-kurejas';
  if (/<definedName name="DB_PartList_Version"/.test(wbXml)) wbXml = wbXml.replace(/(<definedName name="DB_PartList_Version"[^>]*>)[^<]*</, '$1"' + esc(ver) + '"<');
  else wbXml = wbXml.replace('</definedNames>', '<definedName name="DB_PartList_Version">"' + esc(ver) + '"</definedName></definedNames>');
  wr('xl/workbook.xml', wbXml);
  for (var pc = 1; pc <= 20; pc++) {
    var pcd = await rd('xl/pivotCache/pivotCacheDefinition' + pc + '.xml'); if (!pcd) continue;
    wr('xl/pivotCache/pivotCacheDefinition' + pc + '.xml', pcd.replace(/<pivotCacheDefinition([^>]*)>/, function (m, a) { return '<pivotCacheDefinition' + attr(a, 'refreshOnLoad', '1') + '>'; }));
  }
  /* strings the template carried that no cell uses any more (e.g. another customer's part names) are blanked */
  var used = {}, wsNames = Object.keys(zip.files).filter(function (n) { return /^xl\/worksheets\/[^/]+\.xml$/.test(n); });
  for (var wi = 0; wi < wsNames.length; wi++) {
    var wx = await rd(wsNames[wi]) || '', cre = /<c\b[^>]*\bt="s"[^>]*>\s*<v>(\d+)<\/v>/g, cm;
    while ((cm = cre.exec(wx))) used[cm[1]] = 1;
  }
  if (Object.keys(used).length) sst.items = sst.items.map(function (x, k) { return used[k] ? x : '<si><t></t></si>'; });
  wr('xl/sharedStrings.xml', sst.xml());
  return zip.generateAsync({ type:'uint8array', compression:'DEFLATE', compressionOptions:{ level:6 } });
}

var api = { buildReport:buildReport, sortParts:sortParts, drawPanel:drawPanel, Geom:Geom };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DBReport = api;
})(typeof window !== 'undefined' ? window : this);

