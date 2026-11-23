/* Assembly-only geometry: never added to cutting lists, drillings or CNC output. */
(function(){
'use strict';
const V={px:0,py:0,yaw:.52,pitch:.32,zoom:1,open:.65,mode:'assembly',hardware:true,handles:false,dimensions:true,edit:false,full:false,exploded:true,wire:true};
const J={cab:null,key:null,side:'L',scope:'side',index:null};
const BX={cab:null,sel:null};   // 3D construction: the selected board
const COARSE=!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches);   // a touch screen: the hints speak of fingers
let FRAME=null,liveUntil=0;const RGB={};let CUR_PK=0;const PICKS=new WeakMap();   // CUR_PK: the part the faces being added belong to (index into PKS + 1); PICK: the last picture's part buffer   // the last rasterised picture (pixels + depth + pick buffers) — a re-render of the same view reuses it
let observer;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), mul=(a,s)=>a.map(v=>v*s), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], unit=a=>mul(a,1/(Math.hypot(...a)||1));
function mount(el,c,r,lang,hooks={}){
 if(observer)observer.disconnect();
 if(hooks.live)liveUntil=performance.now()+300;   // typing in a field: a quick half-resolution picture now, the sharp one when typing pauses
 const en=lang==='en', L=(lt,enText)=>en?enText:lt;
 const isBox=c.kind==='box'&&!!r.box;if(!isBox)V.boards=false;
 if(hooks.select&&hooks.select.key&&(r.joints||[]).some(j=>j.key===hooks.select.key)){V.edit=true;V.boards=false;J.cab=c.id;J.key=hooks.select.key;J.side=hooks.select.side||'L';J.index=null;J.seam=null;}   // "edit in 3D" from a joint row
 if(BX.cab!==c.id){BX.cab=c.id;BX.sel=null;}if(isBox&&BX.sel&&!r.box.boards.some(b=>b.id===BX.sel))BX.sel=null;   // another construction: nothing selected
 if(V.edit&&!(r.joints||[]).length)V.edit=false;   // a cabinet without joints (dishwasher front): back to the assembly view
 el.innerHTML=`<section class="av ${V.full?'full':''}"><div class="av-head"><div><b>${L('Surinktos spintelės peržiūra','Assembly preview')}</b><small>${(r.dims?[r.dims.W,r.dims.H,r.dims.D]:[c.dishwasher?c.dishWidth:c.W,c.H,c.D]).map(v=>{v=Math.round(+v);return isFinite(v)?v:'–';}).join(' × ')} mm</small></div><span class="av-live">● ${L('Gyvas modelis','Live model')}</span></div><div class="av-tools"><button data-mode="assembly">${L('Surinkta','Assembly')}</button><button data-mode="interior">${L('Be fasadų','Without fronts')}</button>${isBox?`<button data-boards aria-pressed="${!!V.boards}">▣ ${L('Plokštės','Boards')}</button>`:''}<button data-connectors aria-pressed="${V.edit}" ${(r.joints||[]).length?'':'disabled'}>⊙ ${L('Jungtys','Connectors')}</button><button data-view="front">${L('Priekis','Front')}</button><button data-view="perspective">3D</button><button data-view="underside">${L('Apačia','Underside')}</button><button data-full aria-pressed="${V.full}">${V.full?L('Uždaryti ✕','Close ✕'):L('Išplėsti ⤢','Expand ⤢')}</button></div><div class="av-quickbar" hidden></div><div class="av-explode-tools" hidden><button data-exploded>${L('Išskleistos jungtys','Exploded fittings')}</button><button data-wire>${L('Skaidrus karkasas','Transparent carcass')}</button></div><div class="av-stage"><canvas tabindex="0" role="img" aria-label="${L('Spintelės 3D modelis. Sukite rodyklių klavišais, didinkite pliusu, mažinkite minusu.','3D cabinet. Arrow keys orbit; plus and minus zoom.')}" ></canvas><svg class="av-joints" aria-label="${L('Jungčių redagavimas','Connector editor')}" hidden></svg><div class="av-photo-label" hidden aria-live="polite"></div><div class="av-camera"><button data-zoom="1.15" aria-label="${L('Priartinti','Zoom in')}">+</button><button data-zoom="0.87" aria-label="${L('Atitolinti','Zoom out')}">−</button><button data-reset aria-label="${L('Atkurti vaizdą','Reset view')}">↺</button></div><div class="av-hint">${(COARSE?L('Vilkite — sukite · Du pirštai — mastelis ir perstumti','Drag to orbit · Two fingers to zoom and pan'):L('Tempkite — sukite · Ratukas — mastelis ties pele · Shift + tempti — perstumti','Drag to orbit · Wheel to zoom at the pointer · Shift + drag to pan'))}</div></div><div class="av-footer"><div class="av-boards" hidden></div><div class="av-connectors" hidden></div><label class="av-range"><span>${L('Atidarymas','Opening')}</span><input type="range" min="0" max="100" step="1" value="${V.open*100}" aria-label="${L('Durų ir stalčių atidarymas','Door and drawer opening')}"><output>${Math.round(V.open*100)}%</output></label><div class="av-settings"><label><input type="checkbox" data-option="hardware" ${V.hardware?'checked':''}>${L('Furnitūra','Hardware')}</label><label><input type="checkbox" data-option="dimensions" ${V.dimensions?'checked':''}>${L('Matmenys','Dimensions')}</label><label><input type="checkbox" data-option="handles" ${V.handles?'checked':''}>${L('Pavyzdinės rankenos','Example handles')}</label></div><div class="av-note">${L('Plokštės ir tarpai pagal modelį. TANDEM — korpuso dekoro dėžė; TANDEMBOX — antaro tipo metaliniai šonai. Furnitūros forma iliustracinė. Dekoro spalva apytikslė.','Panels and gaps follow the model. TANDEM uses the carcass finish; TANDEMBOX uses antaro-style metal sides. Hardware shapes are illustrative. Finish colours are approximate.')}</div></div></section>`;
 el.querySelector('.av-stage').insertAdjacentElement('afterend',el.querySelector('.av-photo-label'));
 const canvas=el.querySelector('canvas'), ctx=canvas.getContext('2d'), shell=el.querySelector('.av');
 let width,height,scale,panX=0,panY=0,faces=[],guides=[],drag=null,raf=0,pickBuf=null,pinch=null,lastWheel=0,sharpT=0;const touches=new Map();   // while orbiting / zooming the picture is drawn at half resolution, then sharp again
 const d=r.dims||{W:+c.W||+c.dishWidth||600,H:+c.H||720,D:+c.D||560,t:18}, leg=(r.legs||[]).reduce((h,l)=>Math.max(h,l.h),0);
 function projection(q){let x=q[0]-d.W/2,y=q[1]-d.D*.32,z=q[2]-(d.H-leg)/2;let rx=x*Math.cos(V.yaw)+y*Math.sin(V.yaw),dp=-x*Math.sin(V.yaw)+y*Math.cos(V.yaw);return [width/2+panX+rx*scale,height*.46+panY-(z*Math.cos(V.pitch)+dp*Math.sin(V.pitch))*scale,dp*Math.cos(V.pitch)-z*Math.sin(V.pitch)];}
 // Connector editing overlays the same assembly camera and writes through the manufacturing engine.
 const seams=r.seams||[],joints=r.joints||[],overlay=el.querySelector('.av-joints'),editor=el.querySelector('.av-connectors'),quickbar=el.querySelector('.av-quickbar');
 if(J.cab!==c.id){J.cab=c.id;J.key=null;J.side='L';J.scope='side';J.index=null;J.seam=null;}
 if(!joints.some(j=>j.key===J.key))J.key=null;
 let connectorDepth=null;
 const findJoint=()=>joints.find(j=>j.key===J.key),jointSide=()=>{const j=findJoint();if(!j)return null;const side=j.sides?j.sides[J.side]||j.sides.L:j,s=selectedSeam();return s&&s.at?{...side,...s.at}:side;};
 const nameOf=j=>{const label=hooks.t?hooks.t('jk_'+j.key):'';return label&&label!=='jk_'+j.key?label:j.label||j.key;};
 const sideName=s=>s==='R'?L('Dešinė','Right'):L('Kairė','Left');
 const typeName=t=>({confirmat:L('Konfirmatas','Confirmat'),cam:L('Ekscentrikas + kaištis','Cam + dowel'),dowel:L('Kaištis','Dowel')})[t]||t;
 const photo=type=>window.DBArt.photo(type,typeName(type));
 const colors={confirmat:'#285ac4',cam:'#ca6b23',dowel:'#387b53'};
 const selectedSeam=()=>{const s=seams[J.seam];return s&&s.key===J.key&&s.side===J.side?s:seams.find(s=>s.key===J.key&&s.side===J.side)||seams.find(s=>s.key===J.key);};
 const jointWidth=()=>{const j=findJoint();return j?Math.min(j.w,...seams.filter(s=>s.key===J.key&&(j.single||J.scope==='both'||s.side===J.side)).map(s=>s.w)):0;};
 function inform(message){const status=editor.querySelector('.av-j-status');if(status)status.textContent=message;}
 function deselect(){J.key=null;J.seam=null;J.index=null;renderEditor();drawOverlay();}
 function choose(s,index=null){J.key=s.key;J.side=s.side||'L';J.seam=seams.indexOf(s);J.index=index;renderEditor();drawOverlay();}
 function commitPositions(pos,type){const j=findJoint(),side=jointSide();if(!j||!side)return;pos=pos.slice().sort((a,b)=>a-b);const nextType=type||side.type,edge=nextType==='cam'?12:9,gap=nextType==='cam'?24:16;
 if(pos.some((v,i)=>!Number.isFinite(v)||v<edge-.01||v>jointWidth()-edge+.01||(i&&v-pos[i-1]<gap-.01))){inform(L('Netinkama vieta. Nuo krašto ≥ '+edge+' mm, tarpas ≥ '+gap+' mm. Jungtys nepakeistos.','Invalid position. Use '+edge+'–'+Math.round((jointWidth()-edge)*10)/10+' mm; spacing ≥ '+gap+' mm. Connectors were not changed.'));renderPositions();drawOverlay();return;}
 if(nextType==='cam'&&window.DBEngine.pairedDowels(pos,jointWidth(),32).length!==pos.length){inform(L('Ekscentrikui ir vienam kaiščiui nepakanka vietos. Pakeiskite matmenis.','Not enough room for one cam and one dowel per position. Adjust the dimensions.'));renderPositions();drawOverlay();return;}
 hooks.onCommit(j.key,{side:j.single||J.scope==='both'?null:J.side,type:type||side.type,pos:pos},{key:j.key,side:J.side,idx:J.index});
 }
 function freeIntervals(){const side=jointSide();if(!side)return [];const edge=side.minEdge||9,gap=side.minGap||16,end=jointWidth()-edge,result=[];let lo=edge;
 side.pos.slice().sort((a,b)=>a-b).forEach(v=>{const hi=Math.min(end,v-gap);if(hi>=lo)result.push([lo,hi]);lo=Math.max(lo,v+gap);});if(lo<=end)result.push([lo,end]);return result.map(([a,b])=>[Math.ceil((a-1e-7)*10)/10,Math.floor((b+1e-7)*10)/10]).filter(([a,b])=>b>=a);
 }
 function addConnector(at){const side=jointSide();if(!side)return;const intervals=freeIntervals();if(!intervals.length){inform(L('Šioje jungtyje daugiau jungčių netelpa.','No room for another connector on this joint.'));return;}
 let value;if(at==null){const best=intervals.slice().sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0];value=(best[0]+best[1])/2;}else value=intervals.map(([a,b])=>Math.max(a,Math.min(b,at))).sort((a,b)=>Math.abs(a-at)-Math.abs(b-at))[0];
 value=Math.round(value*10)/10;J.index=side.pos.concat(value).sort((a,b)=>a-b).indexOf(value);commitPositions(side.pos.concat(value));
 }
 function renderQuickbar(){quickbar.hidden=!V.edit;if(!V.edit)return;const j=findJoint(),side=jointSide(),room=!!j&&freeIntervals().length>0;quickbar.innerHTML=`<div><b>${j?esc(nameOf(j))+(j.single?'':' · '+sideName(J.side)):L('1. Pasirinkite sujungimo liniją','1. Select a joint line')}</b><small>${j?typeName(side.type)+' · '+(J.scope==='both'&&!j.single?L('Abi pusės','Both sides'):L('Tik pasirinkta pusė','Selected side only'))+' · '+(room?L('Jungtis pridėkite nustatymuose žemiau','Add connectors in the settings below'):L('Laisvos vietos nėra','No free space')):L('Jungtis pridėkite nustatymuose žemiau','Add connectors in the settings below')}</small></div>${j?`<button data-quick-clear title="${L('Atžymėti jungtį (Esc)','Deselect the joint (Esc)')}">✕ ${L('Atžymėti','Deselect')}</button>`:''}<button data-quick-undo ${hooks.canUndo?'':'disabled'}>↶ ${L('Atšaukti','Undo')}</button>`;}
 quickbar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-quick-add'))addConnector();if(b.hasAttribute('data-quick-undo'))hooks.onUndo();if(b.hasAttribute('data-quick-clear'))deselect();});
 function renderPositions(){const target=editor.querySelector('.av-j-positions'),side=jointSide();if(!target||!side)return;target.innerHTML=side.pos.map((p,i)=>`<div class="av-j-row ${J.index===i?'selected':''}"><span style="color:${colors[side.type]}">● ${i+1}</span><label><input type="number" step="0.1" data-j-position="${i}" value="${Math.round(p*10)/10}" aria-label="${L('Jungties vieta','Connector position')} ${i+1}"> mm</label><button data-j-remove="${i}" aria-label="${L('Pašalinti jungtį','Remove connector')} ${i+1}">×</button></div>`).join('')||`<p>${L('Jungčių nėra. Pridėkite jungtį.','No connectors. Add a connector.')}</p>`;}
 function renderEditor(){
 renderQuickbar();renderBoards();el.querySelector('.av-explode-tools').hidden=!V.edit;el.querySelector('[data-exploded]').setAttribute('aria-pressed',String(V.exploded));el.querySelector('[data-wire]').setAttribute('aria-pressed',String(V.wire));shell.classList.toggle('connector-mode',V.edit||!!V.boards);editor.hidden=!V.edit;overlay.toggleAttribute('hidden',!V.edit&&!V.boards);{const bb=el.querySelector('[data-boards]');if(bb)bb.setAttribute('aria-pressed',String(!!V.boards));}
 el.querySelector('[data-connectors]').setAttribute('aria-pressed',String(V.edit));
 el.querySelector('.av-hint').textContent=V.edit?L('Taškas — pasirinkti · Tuščia vieta arba Esc — atžymėti · Matmenys — apačioje','Click a point to select · Empty space or Esc to deselect · Dimensions below'):(COARSE?L('Vilkite — sukite · Du pirštai — mastelis ir perstumti','Drag to orbit · Two fingers to zoom and pan'):L('Tempkite — sukite · Ratukas — mastelis ties pele · Shift + tempti — perstumti','Drag to orbit · Wheel to zoom at the pointer · Shift + drag to pan'));
 if(V.boards)el.querySelector('.av-hint').textContent=L('Spustelėkite plokštę — pasirinkti · ＋ — pridėti plokštę · ⇄ — kuri dengia kurią · Tempkite — sukite','Click a board to select · ＋ adds a board · ⇄ swaps which board covers · Drag to orbit');
 if(!V.edit){el.querySelector('.av-photo-label').hidden=true;return;}
 const j=findJoint(),side=jointSide();
 editor.innerHTML=`<div class="av-j-heading"><b>${L('Jungčių redagavimas','Edit connectors')}</b><button data-j-undo ${hooks.canUndo?'':'disabled'}>↶ ${L('Atšaukti','Undo')}</button></div><p class="av-j-help">${L('Korpuso vaizdas. Galvutės rodomos gręžimo vietose; redagavimo simboliai padidinti. Punktyras — paslėpta jungtis. Pasirinkite liniją, tada naudokite „Pridėti“ apačioje.','Carcass view. Heads follow drilling locations; editing symbols are enlarged. Dashed rings mark hidden fittings. Select a line, then use Add below.')}</p><label class="av-j-select">${L('Jungtis','Joint')}<select data-j-select><option value="">${L('Pasirinkite modelyje arba sąraše','Select on the model or from this list')}</option>${joints.map(jj=>`<option value="${esc(jj.key)}" ${J.key===jj.key?'selected':''}>${esc(nameOf(jj))}</option>`).join('')}</select></label>`;
 editor.innerHTML+=jointOverview();
 if(!j){editor.innerHTML+=`<p class="av-j-status" role="status">${L('Spustelėkite jungties liniją modelyje.','Click a joint line on the model.')}</p>`;return;}
 editor.innerHTML+=`<div class="av-j-actions">${j.single?'':`<label>${L('Pusė','Side')} <select data-j-side><option value="L" ${J.side==='L'?'selected':''}>${sideName('L')}</option><option value="R" ${J.side==='R'?'selected':''}>${sideName('R')}</option></select></label><label>${L('Taikyti','Apply to')} <select data-j-scope><option value="side" ${J.scope==='side'?'selected':''}>${L('Tik šiai pusei','This side only')}</option><option value="both" ${J.scope==='both'?'selected':''}>${L('Abiem pusėms','Both sides')}</option></select></label>`}</div><div class="av-j-types">${['confirmat','cam','dowel'].map(t=>`<button data-j-type="${t}" aria-pressed="${side.type===t}"><span class="av-choice-photo">${photo(t)}</span><span><i style="background:${colors[t]}"></i>${typeName(t)}</span></button>`).join('')}</div><p class="av-j-help">${L('Vietos nuo modelyje pažymėto 0:','Positions from the 0 marked on the model:')} <b>0–${Math.round((selectedSeam()?.w||j.w)*10)/10} mm</b> · ${L('Nuo krašto ≥','Edge ≥')} ${side.minEdge} mm · ${L('Tarpas ≥','Spacing ≥')} ${side.minGap} mm</p><div class="av-j-positions"></div><div class="av-j-actions"><button data-j-add>＋ ${L('Pridėti','Add')}</button><button data-j-even ${side.pos.length<3?'disabled':''}>↔ ${L('Tolygiai','Space evenly')}</button><button data-j-reset>↺ ${(j.single||J.scope==='both'?L('Atkurti jungtį','Reset joint'):L('Atkurti pusę','Reset side'))}</button></div>${side.type==='cam'?`<p class="av-j-help">${L('Kiekviena vieta — 1 ekscentrikas + 1 kaištis. Kaiščiai pažymėti medžio spalva.','Each position adds 1 cam lock + 1 dowel. Dowels are shown in wood colour.')}</p>`:''}<p class="av-j-status" role="status">${J.scope==='both'&&!j.single?L('Keičiamos abi šio sujungimo pusės.','Both sides of this joint will change.'):L('Keičiama tik pasirinkta jungties pusė.','Only the selected side of this joint will change.')}</p>`;
 if(seams.some(s=>s.key===j.key&&Math.abs(s.w-j.w)>.01))editor.innerHTML+=`<p class="av-j-help">${L('Šios jungties vietos bendros kelioms detalėms. Redaguojant taikomas trumpiausios jungties ilgis:','This joint shares positions across several panels. Edits must fit the shortest joint:')} ${Math.round(jointWidth()*10)/10} mm.</p>`;
 editor.innerHTML+=hardwareCard(side.type);
 renderPositions();
 }
 function drawOverlay(depths,pixelW,ratio){const photoLabel=el.querySelector('.av-photo-label');photoLabel.hidden=true;let selectedPoint=null;if(depths)connectorDepth={depths,pixelW,ratio};else if(connectorDepth){depths=connectorDepth.depths;pixelW=connectorDepth.pixelW;ratio=connectorDepth.ratio;}if(V.boards&&overlay){overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);overlay.innerHTML=boardsOverlay();return;}if(!overlay||!V.edit){if(overlay)overlay.innerHTML='';return;}
 overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);let out=hardwareDefs('av-hw');
 const occupied=[{x:width-52,y:0,w:52,h:140}],labels=[];
 const reserve=(x,y,w,h)=>{const r={x,y,w,h};occupied.push(r);return r;};
 const fits=r=>r.x>=8&&r.y>=8&&r.x+r.w<=width-8&&r.y+r.h<=height-42&&!occupied.some(o=>r.x<o.x+o.w+5&&r.x+r.w+5>o.x&&r.y<o.y+o.h+5&&r.y+r.h+5>o.y);
 function locate(q,w,h,normal){const candidates=[];
 if(normal){for(const distance of [34,54,78,106])for(const sign of [1,-1])for(const shift of [0,24,-24])candidates.push([q[0]+normal[0]*distance*sign-normal[1]*shift-w/2,q[1]+normal[1]*distance*sign+normal[0]*shift-h/2]);}
 else for(const distance of [20,38,62,90])candidates.push([q[0]+distance,q[1]-h/2],[q[0]-distance-w,q[1]-h/2],[q[0]-w/2,q[1]-distance-h],[q[0]-w/2,q[1]+distance]);
 for(const [x,y] of candidates){const r={x,y,w,h};if(fits(r)){occupied.push(r);return r;}}return null;
 }

 seams.forEach((s,si)=>{const j=joints.find(j=>j.key===s.key);if(!j)return;const a=projection(s.o),b=projection(add(s.o,mul(s.d,s.w))),len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<3)return;
 const active=s.key===J.key&&(j.single||s.side===J.side),paired=s.key===J.key&&J.scope==='both',side=s.at||(j.sides?j.sides[s.side||'L']||j.sides.L:j),color=active?'#155bba':'#6c8ca7';
 out+=`<g><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${active?2:1}" stroke-dasharray="${active?'none':'4 4'}" opacity="${active||paired?.9:.45}"/><line data-j-seam="${si}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="av-j-hit"><title>${esc(nameOf(j))} · ${sideName(s.side)}</title></line></g>`;
 if(active){reserve(a[0]-4,a[1]-4,8,8);out+=`<rect x="${a[0]-3}" y="${a[1]-3}" width="6" height="6" fill="#155bba"/>`;}
 side.pos.forEach((v,i)=>{const actual=projection(add(s.o,mul(s.d,v))),q=actual.slice();
 const crowded=active&&side.pos.some((other,k)=>k!==i&&Math.abs(other-v)*len/s.w<20);
 if(crowded){const offset=(i%2?1:-1)*(13+Math.floor(i/2)*12);q[0]-=(b[1]-a[1])/len*offset;q[1]+=(b[0]-a[0])/len*offset;out+=`<line x1="${actual[0]}" y1="${actual[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${colors[side.type]}" stroke-width="1" pointer-events="none"/>`;}
 let hidden=false;if(depths){const px=Math.round(actual[0]*ratio),py=Math.round(actual[1]*ratio);if(px>=0&&px<pixelW&&py>=0&&py<Math.ceil(height*ratio))hidden=actual[2]>depths[py*pixelW+px]+3;}
 const selected=active&&J.index===i&&selectedSeam()===s;
 if(selected)selectedPoint={q:q,side:side,v:v};
 const radius=selected?12:active?9:4;reserve(q[0]-Math.max(radius+2,11),q[1]-Math.max(radius+2,11),Math.max(radius+2,11)*2,Math.max(radius+2,11)*2);
 out+=`<g data-j-dot="${i}" data-j-seam="${si}" class="av-j-dot"><circle cx="${q[0]}" cy="${q[1]}" r="11" fill="#ffffff" fill-opacity="0"/>${active?hardwareGlyph(side.type,q[0],q[1],radius):`<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="#f4f7f5" stroke="#789086"/>`}<circle cx="${q[0]}" cy="${q[1]}" r="${radius+2}" fill="none" stroke="${colors[side.type]}" stroke-width="${active?1.5:1}" ${hidden?'stroke-dasharray="2 3"':''} opacity="${active?1:.25}"/><title>${esc(nameOf(j))} · ${typeName(side.type)} · ${v} mm</title></g>`;
 });
 if(active)(side.dowels||[]).forEach(v=>{const q=projection(add(s.o,mul(s.d,v)));reserve(q[0]-4,q[1]-4,8,8);out+=`<rect x="${q[0]-2.5}" y="${q[1]-2.5}" width="5" height="5" fill="#bd874c" pointer-events="none"><title>${L('Automatinis kaištis','Automatic dowel')}: ${v} mm</title></rect>`;});
 });
 labels.sort((a,b)=>b.priority-a.priority).forEach(item=>{ctx.font='600 12px system-ui';const bw=Math.ceil(ctx.measureText(item.text).width)+16,r=locate(item.q,bw,24);if(!r)return;
 out+=`<g class="av-j-badge"><line x1="${item.q[0]}" y1="${item.q[1]}" x2="${Math.max(r.x,Math.min(r.x+r.w,item.q[0]))}" y2="${Math.max(r.y,Math.min(r.y+r.h,item.q[1]))}" stroke="#64889e" stroke-width="1"/><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="5" fill="#ffffff" stroke="#a9bfce" stroke-width="1"/><text x="${r.x+r.w/2}" y="${r.y+16}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" font-weight="600" fill="#123b62" stroke="none">${item.text}</text></g>`;});
 if(selectedPoint){const {side,v}=selectedPoint;
 photoLabel.innerHTML=`<span class="av-choice-photo">${photo(side.type)}</span><div><b>${typeName(side.type)}</b><small>${esc(nameOf(findJoint()))}<br>${Math.round(v*10)/10} mm · ${L('nuo pradžios','from start')}</small></div>`;photoLabel.hidden=false;
 }
 overlay.innerHTML=out;
 }
 function pointerPosition(e,s){const rect=overlay.getBoundingClientRect(),a=projection(s.o),b=projection(add(s.o,mul(s.d,s.w))),x=(e.clientX-rect.left)*width/rect.width,y=(e.clientY-rect.top)*height/rect.height,dx=b[0]-a[0],dy=b[1]-a[1];return ((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)*s.w;}
 overlay.onpointerdown=e=>{const dotEl=e.target.closest('[data-j-dot]'),hit=e.target.closest('[data-j-seam]');if(!hit||e.button!==0)return;e.preventDefault();e.stopPropagation();const s=seams[+hit.dataset.jSeam];if(!dotEl&&!hit.hasAttribute('data-j-insert')&&!hit.hasAttribute('data-j-empty')&&selectedSeam()===s&&J.key===s.key){deselect();return;}choose(s,dotEl?+dotEl.dataset.jDot:null);
 if(hit.hasAttribute('data-j-insert')){addConnector(+hit.dataset.jInsert);return;}
 if(hit.hasAttribute('data-j-empty')){addConnector(s.w/2);return;}
 };
 overlay.onkeydown=e=>{const hit=e.target.closest('[data-j-insert]');if(!hit||!['Enter',' '].includes(e.key))return;e.preventDefault();choose(seams[+hit.dataset.jSeam]);addConnector(+hit.dataset.jInsert);};
 editor.addEventListener('change',e=>{const target=e.target;
 if(target.matches('[data-j-select]')){J.key=target.value||null;J.side='L';J.seam=null;J.index=null;renderEditor();drawOverlay();}
 if(target.matches('[data-j-side]')){J.side=target.value;J.seam=null;J.index=null;renderEditor();drawOverlay();}
 if(target.matches('[data-j-scope]')){J.scope=target.value;renderEditor();drawOverlay();}
 if(target.matches('[data-j-position]')){const side=jointSide();if(!side)return;const pos=side.pos.slice();J.index=+target.dataset.jPosition;pos[J.index]=target.value.trim()===''?NaN:Number(target.value);commitPositions(pos);}
 });
 editor.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const j=findJoint(),side=jointSide();
 if(b.hasAttribute('data-j-undo')){hooks.onUndo();return;}
 if(b.hasAttribute('data-j-pick')){const next=joints.find(j=>j.key===b.dataset.jPick);if(!next)return;J.key=next.key;J.seam=null;J.side=(next.sides&&next.sides.L.pos.length&&!next.sides.R.pos.length)?'R':'L';J.index=null;renderEditor();drawOverlay();return;}
 if(b.hasAttribute('data-j-fill')){hooks.onFillMissing();return;}if(!j||!side)return;
 if(b.dataset.jType){J.index=null;if(!side.manual&&b.dataset.jType!==side.type)hooks.onCommit(j.key,{side:j.single||J.scope==='both'?null:J.side,type:b.dataset.jType,pos:null},{key:j.key,side:J.side,idx:null});else commitPositions(side.pos,b.dataset.jType);return;}
 if(b.hasAttribute('data-j-add'))addConnector();
 if(b.hasAttribute('data-j-remove')){const pos=side.pos.filter((v,i)=>i!==+b.dataset.jRemove);J.index=null;commitPositions(pos);}
 if(b.hasAttribute('data-j-even')&&side.pos.length>=3){const first=side.pos[0],last=side.pos[side.pos.length-1];commitPositions(side.pos.map((v,i)=>Math.round((first+(last-first)*i/(side.pos.length-1))*10)/10));}
 if(b.hasAttribute('data-j-reset'))hooks.onReset(j.key,j.single||J.scope==='both'?null:J.side);
 });
 function face(points,color,wood=false,metal=false,front=false,tx=null){const normal=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));faces.push({p:points,color,wood,metal,front,n:normal,tx,pk:CUR_PK});}
 // tex: { name: the board's material, g: which box axis is its length (the grain) } — with a photo for that material (DBLook) the faces carry where it lies
 function box(o,size,color,transform,wood=false,metal=false,front=false,tex=null){if(size.some(v=>v<=0))return;const [x,y,z]=size;let p=[[0,0,0],[x,0,0],[x,y,0],[0,y,0],[0,0,z],[x,0,z],[x,y,z],[0,y,z]].map(q=>{q=add(o,q);return transform?transform(q):q;});
  let TXA=null;if(tex&&tex.name&&window.DBLook&&window.DBLook.has(tex.name)){const tf=transform||(q=>q),P0=tf(o);TXA={P0,axes:[0,1,2].map(k=>{const e=[0,0,0];e[k]=1;return unit(sub(tf(add(o,e)),P0));})};}
  [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]].forEach(f=>{let pts=f.map(i=>p[i]),center=mul(p.reduce((a,b)=>add(a,b),[0,0,0]),1/8),fc=mul(pts.reduce((a,b)=>add(a,b),[0,0,0]),1/4);if(dot(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])),sub(fc,center))<0)pts.reverse();
   face(pts,color,wood,metal,front,TXA?window.DBLook.frame(tex.name,TXA.P0,TXA.axes,tex.g||0,unit(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0]))),size):null);});}
 function cylinder(center,axis,radius,length,color,transform){const n=unit(axis),u=unit(cross(n,Math.abs(n[2])<.9?[0,0,1]:[1,0,0])),v=cross(n,u);let a=[],b=[];for(let i=0;i<16;i++){let q=add(center,add(mul(u,radius*Math.cos(i*Math.PI/8)),mul(v,radius*Math.sin(i*Math.PI/8))));a.push(transform?transform(q):q);q=add(q,mul(n,length));b.push(transform?transform(q):q);}face(a.slice().reverse(),color,false,true);face(b,color,false,true);for(let i=0;i<16;i++)face([a[i],a[(i+1)%16],b[(i+1)%16],b[i]],color,false,true);}
 function rod(a,b,radius=4,color='#aeb5b9'){cylinder(a,sub(b,a),radius,Math.hypot(...sub(b,a)),color);}
 // A maker's part (STEP model, window.DBFit): its triangles mapped into the cabinet; mirrored parts keep their faces outward.
 function meshFaces(name,part,map,color,transform,mirrored){const F=window.DBFit,ms=F&&F.mesh(name,part);if(!ms)return false;const v=ms.v,t=ms.t,P=new Array(v.length/3);
  for(let i=0;i<P.length;i++){const q=map(v[3*i],v[3*i+1],v[3*i+2]);P[i]=transform?transform(q):q;}
  for(let i=0;i<t.length;i+=3){const a=P[t[i]],b=P[mirrored?t[i+2]:t[i+1]],c=P[mirrored?t[i+1]:t[i+2]],n=cross(sub(b,a),sub(c,a)),l=Math.hypot(n[0],n[1],n[2]);if(l<1e-9)continue;faces.push({p:[a,b,c],color,metal:true,mesh:true,n:[n[0]/l,n[1]/l,n[2]/l],pk:CUR_PK});}
  return true;}
 // The faces of the side / partition boards left and right of a point (where runners are screwed on).
 function opening(xc,zc){let L=null,R=null;(r.panels||[]).forEach(p=>{if(!p.place||p.drawerOf||/^(DURYS|FASADAS)$/.test(p.role))return;const q=p.place,cs=[];[0,p.L].forEach(a=>[0,p.W].forEach(b=>[0,p.T].forEach(c0=>cs.push(add(q.o,add(mul(q.u,a),add(mul(q.v,b),mul(q.n,-c0))))))));
  const e=[0,1,2].map(k=>[Math.min(...cs.map(v=>v[k])),Math.max(...cs.map(v=>v[k]))]);if(e[0][1]-e[0][0]>=Math.min(e[1][1]-e[1][0],e[2][1]-e[2][0]))return;if(zc<e[2][0]||zc>e[2][1]||e[1][1]<100||e[1][0]>100)return;
  if(e[0][1]<=xc+1&&(L==null||e[0][1]>L))L=e[0][1];if(e[0][0]>=xc-1&&(R==null||e[0][0]<R))R=e[0][0];});return L!=null&&R!=null&&R-L>60?[L,R]:null;}
 const mat=(s,f)=>window.DBFront.matColor(s,f), wood=s=>/oak|ąžuol|azuol|walnut|riešut|riesut|uos|ash|beech|buk/i.test(s||'');
 // TANDEMBOX / TANDEM drawers from the makers' models: runners on the side faces at the runner hole line, the drawer moving with its front.
 function realDrawer(m,section,x,z,w,h,tf,travel){
  const F=window.DBFit,hw=section.hw||m.hw,tb=hw==='BLUM TANDEMBOX';if(!F||!(tb||hw==='BLUM TANDEM')||!F.has(tb?'tbSide':'tdRunner'))return false;
  const op=m.ox0!=null&&m.ox1!=null?[m.ox0,m.ox1]:opening(x+w/2,z+Math.min(h/2,60));if(!op)return false;
  const [L0,R0]=op,rt=window.DBEngine.R.runner[hw]||{},up=+rt.up||(tb?33:37),t0=d.t||18,ax=Math.max(t0+up,z+up),nl=Math.max(250,+section.rail||500);
  const carcName=(c.mat||{}).carc||'',carcColor=mat(carcName,'#e5e2da'),carcWood=wood(carcName),Y=sz=>F.FRONT_Z-F.zmap(sz,nl);
  [false,true].forEach(rgt=>{const X=sx=>rgt?R0-sx:L0+sx;
   if(tb){const top=F.sideTop(h>=170?115.5:h>=125?83:68.5),mapS=(sx,sy,sz)=>[X(sx),Y(sz),ax+F.ymap(sy,top)];
    if(V.hardware){const mapR=(sx,sy,sz)=>[X(sx),Y(sz),ax+sy];meshFaces('tbRunner',0,mapR,'#98a1a6',null,rgt);if(travel>1)meshFaces('tbRunner',0,mapR,'#aab2b6',q=>[q[0],q[1]-travel*.5,q[2]],rgt);}   // the runner's middle member pulled half way
    meshFaces('tbSide',0,mapS,'#bfc4c5',tf,rgt);meshFaces('tbFix',0,mapS,'#8d969b',tf,rgt);}
   else if(V.hardware){const mapR=(sx,sy,sz)=>[X(sx),Y(sz),ax+sy];meshFaces('tdRunner',0,mapR,'#98a1a6',null,rgt);if(travel>1)meshFaces('tdRunner',0,mapR,'#aab2b6',q=>[q[0],q[1]-travel*.5,q[2]],rgt);meshFaces('tdRunner',1,mapR,'#c4cacc',tf,rgt);}
  });
  if(tb){   // the bottom on the sides' ledges, the back between them; a gallery rail on high fronts
   const top=F.sideTop(h>=170?115.5:h>=125?83:68.5),gal=h>=250,backTop=gal?Math.min(ax+180,z+h-40):ax+top-4,bx0=L0+36.9,bw=R0-L0-73.8;
   box([bx0,2,ax-24],[bw,nl-14,16],carcColor,tf,carcWood);
   box([bx0,nl-28,ax-8],[bw,16,Math.max(10,backTop-(ax-8))],carcColor,tf,carcWood);
   if(gal)[L0+14,R0-14].forEach(gx=>cylinder([gx,6,backTop-8],[0,1,0],4,nl-30,'#c9cdce',tf));
  }else{   // TANDEM: a wooden box (16 mm sides) on the runners, its bottom 13 mm up from the sides' lower edges
   const bt=16,zb=ax-22.7,sideH=Math.max(60,Math.min(250,h-45)),len=nl-10;
   box([L0+5,2,zb],[bt,len,sideH],carcColor,tf,carcWood);box([R0-5-bt,2,zb],[bt,len,sideH],carcColor,tf,carcWood);
   box([L0+5+bt,2,zb+13],[R0-L0-10-2*bt,len,16],carcColor,tf,carcWood);
   box([L0+5+bt,len-14,zb+29],[R0-L0-10-2*bt,bt,Math.max(10,sideH-29)],carcColor,tf,carcWood);
   box([L0+5+bt,2,zb+29],[R0-L0-10-2*bt,bt,Math.max(10,sideH-29)],carcColor,tf,carcWood);
  }
  return true;
 }
 // Installed fittings are positioned from the engine's actual panel drillings.
 function installedHardware(){
 (r.panels||[]).forEach(p=>{if(!p.place||p.drawerOf||p.role==='FASADAS'||p.role==='DURYS')return;
 const pl=p.place,world=(h,faceName)=>add(pl.o,add(mul(pl.u,h.x),add(mul(pl.v,h.y),mul(pl.n,faceName==='B'?-p.T:0))));
 (p.holes||[]).forEach(h=>{const cam=!h.op&&!h.mark&&!h.through&&Math.abs(h.d-15)<.1,confirmat=!h.op&&!h.mark&&h.through&&Math.abs(h.d-8)<.1,pin=h.op==='pin',dowel=V.edit&&V.exploded&&!h.op&&!h.mark&&!h.through&&Math.abs(h.d-8)<.1&&Math.abs(h.depth-window.DBEngine.R.cam.dowel.depthFace)<.1,bolt=V.edit&&V.exploded&&!h.op&&!h.mark&&!h.through&&Math.abs(h.d-8)<.1&&Math.abs(h.depth-window.DBEngine.R.cam.bolt.depthFace)<.1;if(!cam&&!confirmat&&!pin&&!dowel&&!bolt)return;
 const faceName=confirmat?(h.face==='B'?'A':'B'):(h.face||'A'),n=mul(pl.n,faceName==='B'?-1:1),u=unit(pl.u),v=unit(cross(n,u));let o=world(h,faceName);
 if(dowel||bolt){const outer=add(o,mul(n,32));guides.push([o,outer]);cylinder(outer,n,dowel?4:2.8,22,dowel?'#c59a62':'#b5bdc2');if(bolt)cylinder(add(outer,mul(n,19)),n,4.2,3,'#a1abb2');return;}
 if(pin){cylinder(add(o,mul(n,.1)),n,2.45,5,'#a4adb2');return;}
 const exploded=V.edit&&V.exploded,origin=o;if(exploded){o=add(o,mul(n,38));guides.push([origin,o]);cylinder(add(o,mul(n,cam?-11:-24)),n,cam?7.4:2.5,cam?11:24,cam?'#a9b2b7':'#aab3ba');}
 const radius=cam?7.4:5,head=add(o,mul(n,.3));
 cylinder(add(o,mul(n,.05)),n,radius,.35,'#b9c2c8');
 cylinder(head,n,radius-.65,.14,'#d1d7da');
 const surf=add(head,mul(n,.22));
 function recess(coords,color='#495259'){let points=coords.map(q=>add(surf,add(mul(u,q[0]),mul(v,q[1]))));if(dot(cross(sub(points[1],points[0]),sub(points[2],points[0])),n)<0)points.reverse();face(points,color,false,false);}
 if(confirmat){recess(Array.from({length:6},(_,i)=>[2.1*Math.cos(i*Math.PI/3),2.1*Math.sin(i*Math.PI/3)]));}
 else{
 recess([[-4.5,-.65],[4.5,-.65],[4.5,.65],[-4.5,.65]]);recess([[-.65,-4.5],[.65,-4.5],[.65,4.5],[-.65,4.5]]);
 // Direction mark and recessed rim, characteristic of a cam fitting.
 recess([[-1.7,-5.3],[0,-6.8],[1.7,-5.3]],'#656e74');
 }
 });
 });
 }
 function hardwareDefs(id){return `<defs><linearGradient id="${id}-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7f9fa"/><stop offset=".27" stop-color="#9ba8b0"/><stop offset=".48" stop-color="#edf1f3"/><stop offset=".75" stop-color="#a8b3ba"/><stop offset="1" stop-color="#dce2e5"/></linearGradient></defs>`;}
 function hardwareGlyph(type,x,y,radius,id='av-hw'){
 let art='';
 if(type==='dowel')art='<circle r="9" fill="#c99e62" stroke="#836139" stroke-width="1"/><path d="M-6-5L-4 6M-2-8L0 8M2-8L4 7M6-5L7 3" stroke="#e7c99d" stroke-width="1.2"/>';
 else{art=`<circle r="9.5" fill="url(#${id}-metal)" stroke="#66747e" stroke-width=".9"/><circle r="7.8" fill="none" stroke="#f6fafc" stroke-width=".7"/>`;
 art+=type==='cam'?'<path d="M-5.5-1.1H-1.1V-5.5H1.1V-1.1H5.5V1.1H1.1V5.5H-1.1V1.1H-5.5Z" fill="#49565e" stroke="#7a878f" stroke-width=".5"/><path d="M-2-6.2L0-8.5L2-6.2" fill="#65737c"/><path d="M-7 4A8 8 0 0 0 7 4" fill="none" stroke="#76848c" stroke-width=".7"/>':'<path d="M4 0L2 3.46H-2L-4 0L-2-3.46H2Z" fill="#35434c" stroke="#7c8a92" stroke-width=".7"/><path d="M-2-3.46H2L4 0" fill="none" stroke="#21303a" stroke-width=".8"/>';
 }
 return `<g transform="translate(${x} ${y}) scale(${radius/10})">${art}</g>`;
 }
 function hardwareCard(type){return `<div class="av-hw-card"><span class="av-choice-photo">${photo(type)}</span><div><b>${type==='cam'?L('Ekscentrikas + varžtas','Cam lock + bolt'):type==='confirmat'?'Confirmat':L('Medinis kaištis','Wood dowel')}</b><small>${L('Pasirinkite tašką modelyje, kad pamatytumėte jo jungtį ir vietą.','Select a point on the model to see its connector and position.')}</small></div></div>`;}

 function missingJoints(){return joints.flatMap(j=>(j.single?['L']:['L','R']).filter(sd=>!(j.sides?j.sides[sd]||j.sides.L:j).pos.length).map(sd=>({key:j.key,side:sd,single:j.single})));}
 function jointOverview(){const missing=missingJoints();return `<div class="av-j-overview">${joints.map(j=>{const total=(j.single?['L']:['L','R']).reduce((n,sd)=>n+(j.sides?j.sides[sd]||j.sides.L:j).pos.length,0),empty=missing.some(m=>m.key===j.key);return `<button data-j-pick="${esc(j.key)}" class="${empty?'empty-joint':''}" aria-pressed="${J.key===j.key}">${esc(nameOf(j))} <b>${total}</b>${empty?' ＋':''}</button>`;}).join('')}</div>${missing.length?`<button class="av-j-fill" data-j-fill>${L('Pridėti trūkstamas jungtis','Add missing connectors')} (${missing.length})</button>`:''}`;}

 // ---- 3D construction: boards placed and removed in the model, the corners swapped, inner boards added
 const BXN={bottom:L('Apačia','Bottom'),top:L('Viršus','Top'),left:L('Kairė','Left'),right:L('Dešinė','Right'),back:L('Nugara','Back'),front:L('Priekis','Front')};
 const bxName=b=>b.kind==='part'?L('Pertvara','Partition')+' '+(b.lt.match(/\d+$/)||[''])[0]:b.kind==='shelf'?L('Lentyna','Shelf')+' '+(b.lt.match(/\d+$/)||[''])[0]:BXN[b.id];
 const bxBoard=id=>isBox?r.box.boards.find(b=>b.id===id):null;
 const corners=q=>{const e=q;const out=[];for(const x of e[0])for(const y of e[1])for(const z of e[2])out.push(projection([x,y,z]));return out;};
 function hull(ps){ps=ps.map(p=>[p[0],p[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];for(const p of ps){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}for(let i=ps.length-1;i>=0;i--){const p=ps[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}up.pop();lo.pop();return lo.concat(up);}
 const ptsAttr=h=>h.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
 function boardsOverlay(){if(!isBox)return '';let out='';
  const chip=(x,y,label,attrs,cls)=>{ctx.font='600 11px system-ui';const w=Math.ceil(ctx.measureText(label).width)+16;return `<g class="av-bx-chip ${cls||''}" ${attrs} tabindex="0" role="button"><rect x="${x-w/2}" y="${y-12}" width="${w}" height="24" rx="12"/><text x="${x}" y="${y+4}" text-anchor="middle">${esc(label)}</text></g>`;};
  r.box.ghosts.forEach(g=>{const h=hull(corners(g.ext));out+=`<polygon class="av-bx-ghost" points="${ptsAttr(h)}"/>`;});
  const sel=bxBoard(BX.sel);if(sel)out+=`<polygon class="av-bx-selline" points="${ptsAttr(hull(corners(sel.ext)))}"/>`;
  // which board covers which: one marker on every corner line between two outer boards
  r.box.covers.forEach(cv=>{const a=bxBoard(cv.a),b=bxBoard(cv.b);if(!a||!b)return;const axA=['left','right'].includes(a.id)?0:['front','back'].includes(a.id)?1:2,axB=['left','right'].includes(b.id)?0:['front','back'].includes(b.id)?1:2,axC=3-axA-axB;
   const m=[0,0,0];m[axA]=(a.ext[axA][0]+a.ext[axA][1])/2;m[axB]=(b.ext[axB][0]+b.ext[axB][1])/2;const lo=Math.max(a.ext[axC][0],b.ext[axC][0]),hi=Math.min(a.ext[axC][1],b.ext[axC][1]);m[axC]=(lo+hi)/2;
   const q=projection(m),other=cv.by===cv.a?cv.b:cv.a,mine=BX.sel===cv.a||BX.sel===cv.b,tip=`${BXN[cv.by]} ${L('dengia','covers')} ${BXN[other].toLowerCase()}`+(cv.forced?' · '+L('įleista plokštė visada viduje','a set-in board always sits inside'):' · '+L('spustelėkite — sukeisti','click to swap'));
   out+=`<g class="av-bx-flip ${cv.forced?'forced':''} ${mine?'mine':''}" ${cv.forced?'':`data-bx-flip="${cv.key}" data-bx-by="${other}"`} tabindex="0" role="button"><circle cx="${q[0]}" cy="${q[1]}" r="${mine?12:9}"/><text x="${q[0]}" y="${q[1]+4}" text-anchor="middle">${cv.forced?'🔒':'⇄'}</text><title>${esc(tip)}</title></g>`;});
  r.box.ghosts.forEach(g=>{const c3=[0,1,2].map(k=>(g.ext[k][0]+g.ext[k][1])/2);if(g.id!=='top'&&g.id!=='bottom')c3[2]=g.ext[2][0]+(g.ext[2][1]-g.ext[2][0])*.2;const q=projection(c3);out+=chip(q[0],q[1],'＋ '+BXN[g.id],`data-bx-add="${g.id}"`,'add');});
  return out;}
 function pickBoard(e){if(!pickBuf||!isBox)return;const rect=canvas.getBoundingClientRect(),px=Math.round((e.clientX-rect.left)*pickBuf.ratio),py=Math.round((e.clientY-rect.top)*pickBuf.ratio);if(px<0||py<0||px>=pickBuf.pixelW||py>=pickBuf.pixelH)return;const k=pickBuf.idbuf[py*pickBuf.pixelW+px];const b=k?r.box.boards[k-1]:null;BX.sel=b&&b.id!==BX.sel?b.id:null;renderBoards();schedule();}
 const numIn=v=>{const t=String(v==null?'':v).replace(/\s+/g,'').replace(/,/g,'.');if(!t)return null;if(/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t))return parseFloat(t);if(/^[\d.+\-*\/()]+$/.test(t)&&/\d/.test(t)){try{const r=Function('"use strict";return ('+t.replace(/\b0+(\d)/g,'$1')+')')();if(typeof r==='number'&&isFinite(r))return r;}catch(er){}}return null;};   // as in the step editor: 600-18 works; text → null
 const BX_LIM={inset:[0,3000],T:[3,60],x:[0,6000],z:[0,6000],setback:[0,2000]};
 function boxDo(fn,sel){if(!hooks.onBox)return;if(sel!==undefined)BX.sel=sel;hooks.onBox(fn);}
 function newShelf(cc){const bx=cc.box,cav=r.box.cavity,cs=r.box.comps,sb=bxBoard(BX.sel),col=sb&&sb.kind==='shelf'?sb.col:sb&&sb.kind==='part'?Math.max(0,r.box.boards.filter(b=>b.kind==='part').indexOf(sb)):0,t=r.dims.t||18;
  const zs=r.box.boards.filter(b=>b.kind==='shelf'&&b.col===col).map(b=>b.ext[2]).sort((a,b)=>a[0]-b[0]);let best=null,lo=cav[2][0];zs.concat([[cav[2][1],cav[2][1]]]).forEach(z=>{const g=z[0]-lo;if(!best||g>best[1]-best[0])best=[lo,z[0]];lo=z[1];});
  const id=Math.max(0,...bx.inner.map(q=>+q.id||0))+1;bx.inner.push({id,kind:'shelf',z:Math.round((best[0]+best[1])/2-t/2),col:Math.min(col,cs.length-1),adj:false});return 'i'+id;}
 function newPart(cc){const bx=cc.box,cs=r.box.comps;let w=-1,k=0;cs.forEach((c2,i)=>{if(c2[1]-c2[0]>w){w=c2[1]-c2[0];k=i;}});const id=Math.max(0,...bx.inner.map(q=>+q.id||0))+1;bx.inner.push({id,kind:'part',x:Math.round((cs[k][0]+cs[k][1])/2)});return 'i'+id;}
 function renderBoards(){const host=el.querySelector('.av-boards');if(!host)return;host.hidden=!V.boards||!isBox;if(host.hidden)return;
  const ids=['bottom','top','left','right','back','front'],on=id=>!!bxBoard(id),sel=bxBoard(BX.sel),bx=c.box||{boards:{},inner:[]};
  let h=`<div class="av-j-heading"><b>${L('Plokštės','Boards')}</b><button data-j-undo ${hooks.canUndo?'':'disabled'}>↶ ${L('Atšaukti','Undo')}</button></div><p class="av-j-help">${L('Spustelėkite plokštę modelyje arba ＋ vietą, kurios dar nėra. ⇄ kampe — kuri plokštė dengia kurią.','Click a board in the model, or ＋ where there is none yet. ⇄ on a corner swaps which board covers the other.')}</p>`;
  h+=`<div class="av-bx-chips" role="group" aria-label="${L('Išorinės plokštės','Outer boards')}">${ids.map(id=>`<button data-bx-toggle="${id}" aria-pressed="${on(id)}">${on(id)?'✓ ':'＋ '}${BXN[id]}</button>`).join('')}</div><div class="av-j-actions"><button data-bx-new="shelf">＋ ${L('Lentyna','Shelf')}</button><button data-bx-new="part">＋ ${L('Pertvara','Partition')}</button>${sel?`<button data-bx-clear>✕ ${L('Atžymėti','Deselect')}</button>`:''}</div>`;
  if(sel){const p=(r.panels||[]).find(q=>q.name===sel.name),sz=p?`${Math.round(p.L*10)/10} × ${Math.round(p.W*10)/10} × ${p.T} mm`:'';
   h+=`<div class="av-bx-sel"><div><b>${esc(bxName(sel))}</b><small>${esc(p?p.short:'')} · ${sz}</small></div><div class="av-bx-fields">`;
   const fld=(k,label,val,ph)=>`<label>${label}<input type="text" inputmode="decimal" data-bx-field="${k}" value="${esc(val==null?'':val)}" placeholder="${esc(ph||'')}"><span>mm</span></label>`;
   if(sel.kind==='outer'){const s=bx.boards[sel.id]||{};h+=fld('inset',L('Įleista','Set in'),s.inset||0)+fld('T',L('Storis','Thickness'),s.T||'',String(r.dims.t||18));
    h+=`</div><div class="av-bx-corners">${r.box.covers.filter(cv=>cv.a===sel.id||cv.b===sel.id).map(cv=>{const o2=cv.a===sel.id?cv.b:cv.a;return `<div class="av-bx-corner"><span>${L('Su','With')} ${BXN[o2].toLowerCase()}</span><span class="av-bx-seg"><button ${cv.forced?'disabled':''} data-bx-flip="${cv.key}" data-bx-by="${sel.id}" aria-pressed="${cv.by===sel.id}">${BXN[sel.id]} ${L('dengia','covers')}</button><button ${cv.forced?'disabled':''} data-bx-flip="${cv.key}" data-bx-by="${o2}" aria-pressed="${cv.by===o2}">${BXN[o2]} ${L('dengia','covers')}</button></span></div>`;}).join('')}</div><div class="av-j-actions"><button class="danger" data-bx-toggle="${sel.id}">✕ ${L('Pašalinti plokštę','Remove board')}</button></div>`;}
   else{const it=bx.inner.find(q=>'i'+q.id===sel.id)||{};
    if(sel.kind==='part')h+=fld('x',L('Nuo kairės (centras)','From the left (centre)'),it.x)+fld('T',L('Storis','Thickness'),it.T||'',String(r.dims.t||18))+'</div>';
    else h+=fld('z',L('Aukštis (apačia)','Height (underside)'),it.z)+(r.box.comps.length>1?`<label>${L('Skyrius','Compartment')}<select data-bx-field="col">${r.box.comps.map((c2,i)=>`<option value="${i}" ${i===sel.col?'selected':''}>${i+1}</option>`).join('')}</select></label>`:'')+`</div><div class="av-bx-seg"><button data-bx-adj="false" aria-pressed="${!sel.adj}">${L('Fiksuota (jungtys)','Fixed (connectors)')}</button><button data-bx-adj="true" aria-pressed="${sel.adj}">${L('Ant laikiklių','On pins')}</button></div>`;
    h+=`<div class="av-j-actions"><button class="danger" data-bx-del="${sel.id}">✕ ${L('Pašalinti','Remove')}</button></div>`;}
   h+='</div>';}
  else h+=`<p class="av-j-status" role="status">${L('Pasirinkite plokštę modelyje.','Select a board in the model.')}</p>`;
  host.innerHTML=h;}
 function boardsClick(e){const t=e.target.closest('[data-bx-add],[data-bx-flip],[data-bx-toggle],[data-bx-new],[data-bx-del],[data-bx-adj],[data-bx-clear],[data-j-undo]');if(!t||t.disabled)return;e.preventDefault();e.stopPropagation();
  if(t.hasAttribute('data-j-undo')){hooks.onUndo();return;}
  if(t.hasAttribute('data-bx-clear')){BX.sel=null;renderBoards();schedule();return;}
  if(t.dataset.bxAdd){const id=t.dataset.bxAdd;boxDo(cc=>{cc.box.boards[id].on=true;},id);return;}
  if(t.dataset.bxToggle){const id=t.dataset.bxToggle,now=!!bxBoard(id);boxDo(cc=>{cc.box.boards[id].on=!now;},now?null:id);return;}
  if(t.dataset.bxFlip){const k=t.dataset.bxFlip,by=t.dataset.bxBy;boxDo(cc=>{cc.box.cover[k]=by;});return;}
  if(t.dataset.bxNew){let nid=null;hooks.onBox(cc=>{nid=t.dataset.bxNew==='shelf'?newShelf(cc):newPart(cc);BX.sel=nid;});return;}
  if(t.dataset.bxDel){const id=t.dataset.bxDel;boxDo(cc=>{cc.box.inner=cc.box.inner.filter(q=>'i'+q.id!==id);},null);return;}
  if(t.dataset.bxAdj){const v=t.dataset.bxAdj==='true',id=BX.sel;boxDo(cc=>{const it=cc.box.inner.find(q=>'i'+q.id===id);if(it)it.adj=v;});return;}}
 el.querySelector('.av-boards').addEventListener('click',boardsClick);
 overlay.addEventListener('pointerdown',e=>{if(!V.boards)return;if(e.target.closest('[data-bx-add],[data-bx-flip]'))boardsClick(e);});
 overlay.addEventListener('keydown',e=>{if(!V.boards||!['Enter',' '].includes(e.key))return;if(e.target.closest('[data-bx-add],[data-bx-flip]'))boardsClick(e);});
 el.querySelector('.av-boards').addEventListener('change',e=>{const f=e.target.closest('[data-bx-field]');if(!f)return;const k=f.dataset.bxField,id=BX.sel,raw=f.value;
  if(k!=='col'&&!(k==='T'&&!String(raw).trim())){const n=numIn(raw),lim=BX_LIM[k];if(n==null||(lim&&(n<lim[0]||n>lim[1]))){   // not a usable number: the field goes back, nothing changes
   const it=id&&id[0]==='i'?(c.box.inner||[]).find(q=>'i'+q.id===id):id?c.box.boards[id]:null;f.value=it&&it[k]!=null?it[k]:'';f.setAttribute('aria-invalid','true');setTimeout(()=>f.removeAttribute('aria-invalid'),1600);
   if(hooks.toast)hooks.toast(lim?L('Netinkama reikšmė — leidžiama ','Not a usable value — allowed ')+lim[0]+'…'+lim[1]+' mm':L('Netinkama reikšmė','Not a usable value'));return;}}
  boxDo(cc=>{if(id&&id[0]==='i'){const it=cc.box.inner.find(q=>'i'+q.id===id);if(!it)return;it[k]=k==='T'&&!String(raw).trim()?'':k==='col'?+raw:numIn(raw);}else if(id){const s=cc.box.boards[id];s[k]=k==='T'&&!String(raw).trim()?'':numIn(raw);}});});
 renderEditor();
 let PKS=[];const pkOf=o=>{PKS.push(o);return PKS.length;};
 function scene(){faces=[];guides=[];PKS=[];CUR_PK=0;
 // Actual panel placement, including panel rotations performed by the manufacturing engine.
 (r.panels||[]).forEach(p=>{if(!p.place||p.drawerOf||/^(DURYS|FASADAS)$/.test(p.role))return;CUR_PK=pkOf({kind:'panel',role:p.role,name:p.name});let q=p.place;const tf=v=>add(q.o,add(mul(q.u,v[0]),add(mul(q.v,v[1]),mul(q.n,-v[2]))));const bi=isBox?r.box.boards.findIndex(b=>b.name===p.name):-1,sel=V.boards&&bi>=0&&r.box.boards[bi].id===BX.sel,k0=faces.length;box([0,0,0],[p.L,p.W,p.T],sel?'#9fd0b4':mat(p.mat,'#e5e2da'),tf,!sel&&wood(p.mat),false,false,sel?null:{name:p.mat,g:0});for(let k=k0;k<faces.length;k++)faces[k].bid=bi+1;});
 CUR_PK=0;faces.forEach(f=>f.carcass=true);
 (r.legs||[]).forEach(l=>{if(l.feet){cylinder([l.x,l.y,-l.h],[0,0,1],l.d*.5,l.h,'#343b3a');return;}cylinder([l.x,l.y,-l.h],[0,0,1],l.d*.5,l.h,'#343b3a');cylinder([l.x,l.y,-l.h],[0,0,1],l.d*.68,8,'#272e2c');cylinder([l.x,l.y,-12],[0,0,1],30,12,'#414844');});
 {const pl=(r.visual||{}).plinth;CUR_PK=pl?pkOf({kind:'plinth'}):0;if(pl&&V.mode==='assembly'&&!V.edit)box([pl.x0,pl.y0,pl.z0],[pl.x1-pl.x0,pl.t,pl.z1-pl.z0],mat(pl.mat,'#d5cbbd'),null,wood(pl.mat),false,true,{name:pl.mat,g:0});}
 {const wt=r.worktop;CUR_PK=wt?pkOf({kind:'worktop'}):0;if(wt&&V.mode==='assembly'&&!V.edit)box([wt.x0,wt.y0,wt.z0],[wt.L,wt.y1-wt.y0,wt.T],mat(wt.mat,'#c99a66'),null,!wt.mat||wood(wt.mat),false,true,{name:wt.mat,g:0});}   // the cabinet's worktop
 if(V.mode==='assembly'&&!V.edit&&window.DBEngine.sidePanels)window.DBEngine.sidePanels(c).forEach(q=>box([q.x0,q.y0,q.z0],[q.x1-q.x0,q.y1-q.y0,q.z1-q.z0],mat(q.mat,'#d5cbbd'),null,wood(q.mat),false,true,{name:q.mat,g:2}));   // side panels (extra parts set beside the cabinet), the grain up
 CUR_PK=0;if(V.edit||V.hardware)installedHardware();
 if(V.edit)return;
 const fronts=(r.panels||[]).filter(p=>p.role==='FASADAS'||p.role==='DURYS'),meta=r.visual||{doors:[],drawers:[]};
 let fi=0,di=0;
 fronts.forEach(p=>{
 CUR_PK=pkOf({kind:'panel',role:p.role,name:p.name});
 let door=p.role==='DURYS',m=door?meta.doors[di++]:meta.drawers[fi++];
 if(!m){let corners=[[0,0],[p.L,0],[0,p.W],[p.L,p.W]].map(([a,b])=>add(p.place.o,add(mul(p.place.u,a),mul(p.place.v,b))));m={x:Math.min(...corners.map(q=>q[0])),z:Math.min(...corners.map(q=>q[2])),bottom:0,w:Math.max(...corners.map(q=>q[0]))-Math.min(...corners.map(q=>q[0])),h:Math.max(...corners.map(q=>q[2]))-Math.min(...corners.map(q=>q[2])),hingeLeft:p.hingeLeft,ys:[],fixed:true};}
 const fg=Math.abs(p.place.u[0])>.5?0:2;   // the front's grain: along its length (as cut), across or up
 if(m.fixed||c.dishwasher){if(V.mode==='assembly')box([m.x,-p.T,m.z],[m.w,p.T,m.h],mat(p.mat,'#d5cbbd'),null,wood(p.mat),false,true,{name:p.mat,g:fg});return;}   // an appliance front (dishwasher): it does not open here
 const x=m.x,z=door?m.z:m.bottom,w=m.w,h=m.h,t=p.T;
 const section=m.box?{hw:m.hw,rail:m.rail}:(c.sections||[]).filter(s=>(+s.col||0)===(m.col||0))[m.sec]||{};
 const travel=Math.min(+section.rail||500,d.D-45)*.8*V.open;
 const angle=(m.hinged===false?0:V.open)*Math.PI*.55,hinge=m.hingeLeft?x:x+w,sign=m.hingeLeft?-1:1;
 const cargo=door&&!!m.cargo;   // a cargo pull-out: the front slides out with its baskets
 const tf=door&&!cargo?q=>{let xx=q[0]-hinge;return [hinge+xx*Math.cos(angle)-q[1]*Math.sin(sign*angle),xx*Math.sin(sign*angle)+q[1]*Math.cos(angle),q[2]];}:q=>[q[0],q[1]-travel,q[2]];
 if(V.mode==='assembly')box([x,-t,z],[w,t,h],mat(p.mat,'#d5cbbd'),tf,wood(p.mat),false,true,{name:p.mat,g:fg});CUR_PK=0;
 const own=door?[]:(r.panels||[]).filter(q=>q.drawerOf===p.name&&q.place);
 if(own.length){   // GTV / DTC: the real board box (its parts) and two side-mount runners, moving with the front
 own.forEach(q=>{const pq=q.place,tq=v=>tf(add(pq.o,add(mul(pq.u,v[0]),add(mul(pq.v,v[1]),mul(pq.n,-v[2])))));box([0,0,0],[q.L,q.W,q.T],q.role==='STALC_DUGNAS'&&/HDF/i.test(q.mat||'')?'#e4e1da':mat(q.mat,'#e5e2da'),tq,wood(q.mat),false,false,{name:q.mat,g:0});});
 const rtA=window.DBEngine.R.runner[section.hw||m.hw]||{};
 const mvA=rtA.merivo&&(m.mv||(p.mv));
 if(mvA){const sH=mvA.code==='E'?91:mvA.sideH,yE=mvA.y0+mvA.len,stl='#aab0b3';[[mvA.bx0-13,mvA.bx0,mvA.x0],[mvA.bx1,mvA.bx1+13,mvA.x1]].forEach(([a,b,cx])=>{
   box([a,mvA.y0+2,mvA.zs],[b-a,yE-mvA.y0-2,sH],stl,tf,false,true);
   if(mvA.ext==='rail'){box([a+2.5,mvA.y0+2,mvA.zs+mvA.sideH-10],[b-a-5,yE-mvA.y0-2,8],stl,tf,false,true);box([a+2.5,yE-14,mvA.zs+sH],[b-a-5,14,mvA.sideH-10-sH],stl,tf,false,true);}
   if(mvA.ext==='boxcap')box([a+1,mvA.y0+2,mvA.zs+sH],[b-a-2,yE-mvA.y0-2,mvA.sideH-sH],'#9ca2a4',tf,false,true);
   if(V.hardware){const pa=Math.min(cx,a<cx?b:a),pb=Math.max(cx,a<cx?b:a);if(pb-pa>2)box([pa+.5,mvA.y0+4,mvA.zs+2],[pb-pa-1,yE-mvA.y0-6,20],'#858e93',null,false,true);}});}
 if(V.hardware&&rtA.under){const ER=window.DBEngine.R,us=own.filter(q=>q.role==='STALC_SONAS').map(q=>{const P=q.place,xs=[0,q.L].flatMap(a=>[0,q.W].flatMap(b=>[0,q.T].map(c0=>P.o[0]+a*P.u[0]+b*P.v[0]-c0*P.n[0]))),zs=[0,q.L].flatMap(a=>[0,q.W].map(b=>P.o[2]+a*P.u[2]+b*P.v[2]));return {x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),L:q.L};}).sort((a,b)=>a.x0-b.x0);
  if(us.length===2){const rc=+ER.under.recess||13;[[us[0].x0,us[0].x1+14],[us[1].x0-14,us[1].x1]].forEach(([a,b],i)=>{box([a,3,us[0].z0-12],[b-a,us[0].L-4,12+rc-1],'#b9c0c4',tf,false,true);});}}
 if(V.hardware&&rtA.ball){const ER=window.DBEngine.R,sz=own.filter(q=>q.role==='STALC_SONAS').map(q=>{const P=q.place;return Math.min(...[0,q.L].flatMap(a=>[0,q.W].map(b=>P.o[2]+a*P.u[2]+b*P.v[2])));}),ax=sz.length?Math.min(...sz)+ +ER.ball.boxBelow:Math.max((d.t||18)+ +ER.ball.up,z+ +ER.ball.up),cl=+ER.ball.clear,ex=own.filter(q=>q.role==='STALC_SONAS').map(q=>{const c0=q.place.o[0],c1=c0+q.place.n[0]*-q.T;return [Math.min(c0,c1),Math.max(c0,c1)];});
 if(ex.length===2){const xs=ex.sort((a,b)=>a[0]-b[0]),dep=Math.max(...own.map(q=>q.role==='STALC_SONAS'?q.L:0));
 [[xs[0][0]-cl,xs[0][0]],[xs[1][1],xs[1][1]+cl]].forEach(([a,b])=>{box([a+.5,2,ax-22.5],[b-a-1,dep-2,45],'#b9c0c4',null,false,true);box([a+1.5,2-travel*.5,ax-17],[b-a-3,dep-6,34],'#cdd3d6',null,false,true);});}}
 } else if(cargo){   // cargo: a frame behind the front with wire baskets, on a runner under it
 const dep=Math.max(200,Math.min(500,d.D-60)),bx=x+Math.min(25,w*.12),bw=Math.max(40,w-2*Math.min(25,w*.12)),z0c=Math.max(z+20,(d.t||18)+12),z1c=z+h-30,nb=Math.max(2,Math.min(6,Math.round((z1c-z0c)/260)+1)),chrome='#c9ced2',dark='#8e979c';
 box([bx,4,z0c],[bw,8,z1c-z0c],dark,tf,false,true);box([bx,dep-8,z0c],[bw,8,z1c-z0c],dark,tf,false,true);
 for(let q=0;q<nb;q++){const zb=z0c+(z1c-z0c-70)*q/Math.max(1,nb-1);box([bx,12,zb],[bw,dep-20,3],chrome,tf,false,true);[bx,bx+bw-3].forEach(sx=>box([sx,12,zb],[3,dep-20,60],chrome,tf,false,true));box([bx,12,zb],[bw,3,45],chrome,tf,false,true);box([bx,dep-15,zb],[bw,3,60],chrome,tf,false,true);}
 if(V.hardware)box([bx+bw/2-18,6,z0c-14],[36,Math.min(+section.rail||dep,dep),12],'#858e93',null,false,true);
 } else if(!door&&realDrawer(m,section,x,z,w,h,tf,travel)){
 } else if(!door){
 // TANDEM is a wooden box on concealed runners; TANDEMBOX uses antaro-style metal sides.
 const depth=Math.max(40,Math.min(+section.rail||500,d.D-40)),bx=x+Math.min(30,w*.1),bw=w-2*Math.min(30,w*.1),bz=z+30;
 const tandemBox=(section.hw||m.hw)==='BLUM TANDEMBOX',carcName=(c.mat||{}).carc||'',carcColor=mat(carcName,'#e5e2da'),carcWood=wood(carcName);
 const board=Math.min(d.t||18,bw/5),floorT=16,boxHeight=Math.max(32,Math.min(210,h-58));
 box([bx,8,bz],[bw,depth-18,floorT],carcColor,tf,carcWood);
 if(tandemBox){
 // Illustrative antaro M side with rectangular gallery for high fronts, rather than a full metal wall.
 const metal='#b5b9ba',cap='#9ca2a4',sideH=Math.min(83.6,boxHeight),wall=13,gallery=h>=250&&boxHeight>120,backH=gallery?Math.min(199,boxHeight):sideH;
 [bx,bx+bw-wall].forEach((sx,i)=>{
 box([sx,8,bz+floorT],[wall,depth-18,Math.max(1,sideH-3)],metal,tf,false,true);
 box([sx-1,8,bz+floorT+sideH-3],[wall+2,depth-18,3],'#d1d4d4',tf,false,true);
 // Front adjustment cover on the outer side of the double-walled profile.
 box([i?sx+wall:sx-1,24,bz+floorT+18],[1,44,26],cap,tf,false,true);
 if(gallery){const gx=sx+wall/2-4,gz=bz+floorT+backH-12;
 box([gx,8,gz],[8,depth-18,10],metal,tf,false,true);
 box([gx-2,4,gz-3],[12,14,16],cap,tf);
 box([gx-2,depth-20,bz+floorT+sideH],[12,14,Math.max(1,backH-sideH)],cap,tf);
 }
 });
 box([bx+wall,depth-10,bz+floorT],[bw-2*wall,16,backH],carcColor,tf,carcWood);
 }else{
 // Four board walls, all inheriting the carcass finish. Runners stay below the box.
 box([bx,8,bz+floorT],[board,depth-18,boxHeight],carcColor,tf,carcWood);
 box([bx+bw-board,8,bz+floorT],[board,depth-18,boxHeight],carcColor,tf,carcWood);
 box([bx+board,depth-10-board,bz+floorT],[bw-2*board,board,boxHeight],carcColor,tf,carcWood);
 box([bx+board,8,bz+floorT],[bw-2*board,board,boxHeight],carcColor,tf,carcWood);
 }
 if(V.hardware){[bx+3,bx+bw-24].forEach(rx=>{
 box([rx,12,bz-20],[21,depth-10,12],'#858e93',null,false,true);
 box([rx+2,10-travel*.5,bz-14],[17,depth-15,9],'#c1c7c8',null,false,true);
 box([rx+4,10-travel,bz-8],[13,depth-18,8],'#d6dadd',null,false,true);
 if(!tandemBox)box([rx-3,12,bz-14],[27,32,10],'#d57531',tf);
 });}
 } else if(V.hardware && m.hinged!==false && window.DBFit&&window.DBFit.has('hinge')&&!m.inset){
 // Blum CLIP top from its STEP model: the arm stays on the side, the cup and its links turn with the door.
 const cupE=+((window.DBEngine.R.hinge||{}).cupFromEdge)||22.5,HG=window.DBFit.HINGE,right=!m.hingeLeft,cx=right?x+w-cupE:x+cupE;
 (m.ys||[]).forEach(yy=>{const hz=z+yy,mapH=(sx,sy,sz)=>[right?cx+(sx-HG.cupX):cx-(sx-HG.cupX),-(sz-HG.doorZ),hz+sy];
  meshFaces('hinge',0,mapH,'#a7b0b5',null,!right);
  if(V.mode==='assembly')meshFaces('hinge',1,mapH,'#c6cdd1',tf,!right);
 });
 } else if(V.hardware && m.hinged!==false){
 (m.ys||[]).forEach(yy=>{let hz=z+yy,edge=m.hingeLeft?1:-1,sx=m.hingeLeft?x+16:x+w-16,cx=m.hingeLeft?x+22.5:x+w-22.5;
 // Fixed cruciform plate, articulated arms and 35 mm door cup.
 box([sx-3,20,hz-24],[6,32,48],'#a6afb4',null,false,true);
 [hz-16,hz+16].forEach(zz=>cylinder([sx+(edge>0?3:-3),37,zz],[edge,0,0],4,2,'#e3e6e6'));
 const cup=tf([cx,1,hz]),a=[sx,34,hz],mid=[(sx+cup[0])*.5,(34+cup[1])*.5-9,hz];
 rod(a,mid,6,'#8f999f');rod(mid,cup,7,'#c3cbd0');
 if(V.mode==='assembly'){cylinder([cx,0,hz],[0,1,0],17.5,4,'#b8c0c5',tf);cylinder([cx,4.3,hz],[0,1,0],12,1,'#707b82',tf);box([cx-9,-1,hz-25],[18,5,50],'#b9c2c7',tf,false,true);[hz-21,hz+21].forEach(zz=>cylinder([cx,5,zz],[0,1,0],3,2,'#e5e8e8',tf));}
 });
 }
 if(V.handles&&V.mode==='assembly'&&(section.hinge!=='BE FURNITŪROS'||section.fridge)){
 let a,b;if(door){let hx=m.hingeLeft?x+w-38:x+38,mid=z+Math.min(h-70,Math.max(90,h*.6));a=[hx,-t-24,mid-48];b=[hx,-t-24,mid+48];}else{let mid=x+w/2,zz=z+h-Math.min(38,h/2);a=[mid-64,-t-24,zz];b=[mid+64,-t-24,zz];}rod(tf(a),tf(b),5,'#535d60');[a,b].forEach(q=>rod(tf(q),tf([q[0],-t,q[2]]),4,'#747d80'));
 }
 });
 }
 function path(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
 function draw(){raf=0;if(!el.isConnected||!canvas.isConnected)return;const bounds=canvas.getBoundingClientRect();width=bounds.width;height=bounds.height;if(!width||!height)return;const typing=performance.now()<liveUntil,moving=!!(drag||pinch)||performance.now()-lastWheel<180||typing,ratio=moving?1:2;if(typing){clearTimeout(sharpT);sharpT=setTimeout(schedule,liveUntil-performance.now()+20);}canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);scale=Math.min((width-65)/(d.W+d.D*.55+Math.min(d.W*.3,180)),(height-75)/(d.H+leg+d.D*.38))*V.zoom;
 scene();
 scale=1;panX=0;panY=0;
 const projected=faces.flatMap(f=>f.p.map(projection));
 if(projected.length){const xs=projected.map(p=>p[0]-width/2),ys=projected.map(p=>p[1]-height*.46),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);scale=Math.min((width-95)/Math.max(1,xmax-xmin),(height-105)/Math.max(1,ymax-ymin))*V.zoom;panX=-(xmin+xmax)*scale/2+V.px;panY=-(ymin+ymax)*scale/2+V.py;}
 const ground=projection([d.W/2,d.D*.4,-leg]);ctx.save();ctx.translate(ground[0],ground[1]);ctx.scale(1,.23);let shadow=ctx.createRadialGradient(0,0,5,0,0,Math.max(6,d.W*scale*.85));shadow.addColorStop(0,'rgba(30,42,34,.22)');shadow.addColorStop(1,'rgba(30,42,34,0)');ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,d.W*scale*.85,0,Math.PI*2);ctx.fill();ctx.restore();
 const view=[Math.sin(V.yaw)*Math.cos(V.pitch),-Math.cos(V.yaw)*Math.cos(V.pitch),Math.sin(V.pitch)];
 // Rasterize surfaces with a depth buffer: hardware behind a side panel must never show through it.
 const pixelW=canvas.width,pixelH=canvas.height;
 // the same picture as last time (a re-render that did not change the cabinet or the view): reuse the pixels
 let fk=pixelW*31+pixelH;const mixK=v=>{fk=(Math.imul(fk,16777619)^(v|0))|0;};
 [V.yaw,V.pitch,V.zoom,V.px,V.py,scale,panX,panY,V.edit?1:0,V.wire?1:0,window.DBLook?window.DBLook.version():0].forEach(v=>mixK(Math.round(v*1e4)));
 for(let i=0;i<faces.length;i++){const f=faces[i];mixK((f.metal?1:0)|(f.wood?2:0)|(f.front?4:0)|(f.carcass?8:0)|(f.tx?16:0)|((f.bid||0)<<5));for(let j=0;j<f.color.length;j++)mixK(f.color.charCodeAt(j));for(let j=0;j<f.p.length;j++){const q=f.p[j];mixK(Math.round(q[0]*64));mixK(Math.round(q[1]*64));mixK(Math.round(q[2]*64));}}
 let frame,depths,idbuf,pkbuf;
 if(FRAME&&FRAME.key===fk&&FRAME.w===pixelW&&FRAME.h===pixelH){frame=new ImageData(new Uint8ClampedArray(FRAME.px),pixelW,pixelH);depths=FRAME.depths;idbuf=FRAME.idbuf;pkbuf=FRAME.pkbuf;pickBuf={idbuf,pixelW,pixelH,ratio};PICKS.set(canvas,{canvas,pkbuf,pixelW,pixelH,ratio,parts:PKS});}
 else{
 frame=ctx.getImageData(0,0,pixelW,pixelH);const pixels=frame.data;
 depths=new Float32Array(pixelW*pixelH);depths.fill(Infinity);idbuf=new Uint8Array(pixelW*pixelH);pkbuf=new Uint16Array(pixelW*pixelH);pickBuf={idbuf,pixelW,pixelH,ratio};PICKS.set(canvas,{canvas,pkbuf,pixelW,pixelH,ratio,parts:PKS});
 const lightDirection=unit([-1,-2,3]),EPS=.00001;
 for(let fi=0;fi<faces.length;fi++){const f=faces[fi];
 if(V.edit&&V.wire&&f.carcass)continue;
 if(dot(f.n,view)<.00001)continue;
 const pts=f.p.map(p=>{const q=projection(p);return [q[0]*ratio,q[1]*ratio,q[2]];});
 const rgb=RGB[f.color]||(RGB[f.color]=f.color.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16))),R0=rgb[0],G0=rgb[1],B0=rgb[2],isMesh=!!f.mesh;
 const light=.68+.32*Math.max(0,dot(f.n,lightDirection)),bid=f.bid||0,metal=!!f.metal,front=!!f.front,thr=(front?.85:.35)*ratio;
 // a texture photo of the material (DBLook): mirrored repeat, so a plain photo has no hard seams
 const SMP=f.tx&&window.DBLook?window.DBLook.sampler(f.tx,scale*ratio*Math.sqrt(Math.max(.08,Math.abs(dot(f.n,view))))):null,wood=!!f.wood&&!SMP;   // screen pixels per mm on this face (orthographic; slanted faces see the photo smaller)
 // Distance to real polygon edges, never the internal triangulation diagonal.
 const nE=pts.length,nB=isMesh?0:nE,EX=new Float64Array(nB),EY=new Float64Array(nB),EDX=new Float64Array(nB),EDY=new Float64Array(nB),EI=new Float64Array(nB),EM=new Float64Array(nB);   // maker models: no bevel lines
 let cy=0;for(let i=0;i<nE;i++)cy+=pts[i][1];cy/=nE;
 for(let i=0;i<nB;i++){const p=pts[i],q=pts[(i+1)%nE],dx=q[0]-p[0],dy=q[1]-p[1];EX[i]=p[0];EY[i]=p[1];EDX[i]=dx;EDY[i]=dy;EI[i]=1/(Math.hypot(dx,dy)||1);EM[i]=(p[1]+q[1])/2;}
 const NEAR0=new Float64Array(nB),NEAR1=new Float64Array(nB);
 for(let k=1;k<nE-1;k++){
 const a=pts[0],b=pts[k],cc=pts[k+1],den=(b[1]-cc[1])*(a[0]-cc[0])+(cc[0]-b[0])*(a[1]-cc[1]);if(Math.abs(den)<.0001)continue;
 const xmin=Math.max(0,Math.floor(Math.min(a[0],b[0],cc[0]))),xmax=Math.min(pixelW-1,Math.ceil(Math.max(a[0],b[0],cc[0]))),ymin=Math.max(0,Math.floor(Math.min(a[1],b[1],cc[1]))),ymax=Math.min(pixelH-1,Math.ceil(Math.max(a[1],b[1],cc[1])));
 if(xmin>xmax||ymin>ymax)continue;
 const du=(b[1]-cc[1])/den,dv=(cc[1]-a[1])/den,dw=-du-dv,uy=(cc[0]-b[0])/den,vy=(a[0]-cc[0])/den;
 const WA=f.p[0],WB=f.p[k],WC=f.p[k+1];
 for(let y=ymin;y<=ymax;y++){
 const py=y+.5,x0=xmin+.5,u0=du*(x0-cc[0])+uy*(py-cc[1]),v0=dv*(x0-cc[0])+vy*(py-cc[1]),w0=1-u0-v0;
 // the pixels of this row inside the triangle: each weight is linear in x
 let lo=xmin,hi=xmax;
 const clip=(c0,dc)=>{if(Math.abs(dc)<1e-12){if(c0<-EPS)hi=lo-1;return;}const xc=(-EPS-c0)/dc;if(dc>0){const l=xmin+Math.ceil(xc-1e-9);if(l>lo)lo=l;}else{const h=xmin+Math.floor(xc+1e-9);if(h<hi)hi=h;}};
 clip(u0,du);clip(v0,dv);clip(w0,dw);
 if(lo>hi)continue;lo=Math.max(xmin,lo-1);hi=Math.min(xmax,hi+1);
 // where along this row a polygon edge is close enough for the bevel shading: only there is the exact distance worked out
 let nNear=0;for(let i=0;i<nB;i++){const C=EDX[i]*(py-EY[i])+EDY[i]*EX[i],T=thr/EI[i]+1e-6;let s0,s1;
 if(Math.abs(EDY[i])<1e-9){if(Math.abs(C)>=T)continue;s0=-1e9;s1=1e9;}else{const cx=C/EDY[i],hw=T/Math.abs(EDY[i]);s0=Math.floor(cx-hw-1.5);s1=Math.ceil(cx+hw+.5);}
 NEAR0[nNear]=s0;NEAR1[nNear]=s1;nNear++;}
 for(let i=1;i<nNear;i++){const a0=NEAR0[i],a1=NEAR1[i];let j=i-1;while(j>=0&&NEAR0[j]>a0){NEAR0[j+1]=NEAR0[j];NEAR1[j+1]=NEAR1[j];j--;}NEAR0[j+1]=a0;NEAR1[j+1]=a1;}
 let nj=0;
 for(let x=lo;x<=hi;x++){
 const t=x-xmin,u=u0+du*t,v=v0+dv*t,w=1-u-v;if(u<-EPS||v<-EPS||w<-EPS)continue;
 const z=u*a[2]+v*b[2]+w*cc[2],idx=y*pixelW+x;if(z>=depths[idx])continue;depths[idx]=z;idbuf[idx]=bid;pkbuf[idx]=f.pk||0;
 let factor=light,highlight=0;
 if(metal){const wy=u*WA[1]+v*WB[1]+w*WC[1],wz=u*WA[2]+v*WB[2]+w*WC[2];factor+=.10*Math.sin(wy*.017+wz*.008);}
 if(wood){const wx=u*WA[0]+v*WB[0]+w*WC[0],wy=u*WA[1]+v*WB[1]+w*WC[1],wz=u*WA[2]+v*WB[2]+w*WC[2];factor+=.025*Math.sin(wx*.65+wy*.12+Math.sin(wz*.016)*.9);}
 let cR=R0,cG=G0,cB=B0;
 if(SMP){const cv=SMP(u*WA[0]+v*WB[0]+w*WC[0],u*WA[1]+v*WB[1]+w*WC[1],u*WA[2]+v*WB[2]+w*WC[2]);cR=cv>>16&255;cG=cv>>8&255;cB=cv&255;}
 const px=x+.5;let edgeDistance=Infinity,upper=false;
 while(nj<nNear&&NEAR1[nj]<x)nj++;let near=false;for(let q=nj;q<nNear;q++){if(NEAR0[q]>x)break;if(NEAR1[q]>=x){near=true;break;}}
 if(near&&!isMesh)for(let i=0;i<nE;i++){let dist=EDX[i]*(py-EY[i])-EDY[i]*(px-EX[i]);if(dist<0)dist=-dist;dist*=EI[i];if(dist<edgeDistance){edgeDistance=dist;upper=EM[i]<cy;}}
 // Subpixel bevel highlights reveal genuine gaps even on dark fronts; geometry stays unchanged.
 if(edgeDistance<thr){if(front){factor*=upper?1:.58;highlight=upper?22:0;}else factor*=.9;}
 const o=idx*4;pixels[o]=cR*factor+highlight;pixels[o+1]=cG*factor+highlight;pixels[o+2]=cB*factor+highlight;pixels[o+3]=255;
 }
 }
 }
 }
 FRAME={key:fk,w:pixelW,h:pixelH,px:new Uint8ClampedArray(pixels),depths,idbuf,pkbuf};
 }
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.putImageData(frame,0,0);ctx.restore();
 if(V.edit&&V.wire){ctx.save();ctx.strokeStyle='#688878';ctx.lineWidth=.65;ctx.globalAlpha=.4;faces.filter(f=>f.carcass).forEach(f=>{path(f.p.map(projection));ctx.stroke();});ctx.restore();}
 if(V.edit&&V.exploded){ctx.save();ctx.strokeStyle='#527364';ctx.lineWidth=.8;ctx.setLineDash([3,4]);guides.forEach(([a,b])=>{a=projection(a);b=projection(b);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();});ctx.restore();}

 if(V.dimensions&&!V.edit){function dimension(a,b,label,ox,oy){a=projection(a);b=projection(b);ctx.strokeStyle='#64746c';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(a[0]+ox,a[1]+oy);ctx.moveTo(b[0],b[1]);ctx.lineTo(b[0]+ox,b[1]+oy);ctx.moveTo(a[0]+ox,a[1]+oy);ctx.lineTo(b[0]+ox,b[1]+oy);ctx.stroke();const x=(a[0]+b[0])/2+ox,y=(a[1]+b[1])/2+oy;ctx.font='10px system-ui';const tw=ctx.measureText(label).width;ctx.fillStyle='#f1f3f0';ctx.fillRect(x-tw/2-5,y-7,tw+10,14);ctx.fillStyle='#42544a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x,y);}
 dimension([0,0,-leg],[d.W,0,-leg],Math.round(d.W)+' mm',0,25);dimension([d.W,d.D,0],[d.W,d.D,d.H],Math.round(d.H)+' mm',25,0);dimension([d.W,0,-leg],[d.W,d.D,-leg],Math.round(d.D)+' mm',32,22);
 }
 drawOverlay(depths,pixelW,ratio);
 el.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===V.mode));
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(draw);}
 el.addEventListener('click',e=>{let b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-connectors')){V.edit=!V.edit;if(V.edit)V.boards=false;renderEditor();}if(b.hasAttribute('data-boards')){V.boards=!V.boards;if(V.boards)V.edit=false;renderEditor();}if(b.hasAttribute('data-exploded')){V.exploded=!V.exploded;renderEditor();}if(b.hasAttribute('data-wire')){V.wire=!V.wire;renderEditor();}if(b.dataset.mode){V.mode=b.dataset.mode;V.edit=false;V.boards=false;renderEditor();}if(b.dataset.view){V.yaw=b.dataset.view==='front'?0:.52;V.pitch=b.dataset.view==='front'?0:b.dataset.view==='underside'?-.8:.32;V.zoom=1;V.px=V.py=0;}if(b.dataset.zoom){const z2=Math.max(.5,Math.min(8,V.zoom*+b.dataset.zoom)),kk=z2/V.zoom;V.px*=kk;V.py*=kk;V.zoom=z2;}if(b.hasAttribute('data-reset')){V.yaw=.52;V.pitch=.32;V.zoom=1;V.px=V.py=0;}if(b.hasAttribute('data-full')){V.full=!V.full;shell.classList.toggle('full',V.full);fullLabel();}schedule();});
 function fullLabel(){const fb=el.querySelector('[data-full]');if(fb){fb.textContent=V.full?L('Uždaryti ✕','Close ✕'):L('Išplėsti ⤢','Expand ⤢');fb.setAttribute('aria-pressed',String(V.full));}}
 // Handlers belong to the newly created nodes; mounts can safely replace the preview.
 el.querySelector('input[type=range]').oninput=e=>{V.open=+e.target.value/100;el.querySelector('output').textContent=e.target.value+'%';schedule();};
 el.querySelectorAll('[data-option]').forEach(i=>i.onchange=()=>{V[i.dataset.option]=i.checked;schedule();});
 canvas.onpointerdown=e=>{if(e.pointerType==='touch'){if(e.isPrimary){touches.clear();pinch=null;}touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size>=2){const [a,b]=[...touches.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2};drag=null;try{canvas.setPointerCapture(e.pointerId);}catch(er){}return;}}if(e.button!==0&&e.button!==1)return;if(e.button===1)e.preventDefault();drag={x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,pan:e.shiftKey||e.button===1};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(touches.has(e.pointerId)){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&touches.size>=2){const [a,b]=[...touches.values()],d=Math.hypot(a.x-b.x,a.y-b.y)||1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,rect=canvas.getBoundingClientRect(),z2=Math.max(.5,Math.min(8,V.zoom*d/pinch.d)),kk=z2/V.zoom,cx=mx-rect.left-width/2,cy=my-rect.top-height*.46;V.px=cx*(1-kk)+V.px*kk+(mx-pinch.mx);V.py=cy*(1-kk)+V.py*kk+(my-pinch.my);V.zoom=z2;pinch={d:d,mx:mx,my:my};schedule();return;}}if(!drag)return;if(drag.pan){V.px+=e.clientX-drag.x;V.py+=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;schedule();return;}V.yaw-=(e.clientX-drag.x)*.008;V.pitch=Math.max(-1.2,Math.min(1.2,V.pitch+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};schedule();};canvas.onpointerup=e=>{touches.delete(e.pointerId);if(pinch){if(touches.size<2)pinch=null;drag=null;schedule();return;}const d0=drag;drag=null;if(d0)schedule();if(d0&&V.edit&&J.key&&Math.hypot(e.clientX-d0.x0,e.clientY-d0.y0)<5)deselect();if(d0&&V.boards&&!d0.pan&&Math.hypot(e.clientX-d0.x0,e.clientY-d0.y0)<5)pickBoard(e);};canvas.onpointercancel=e=>{touches.delete(e.pointerId);if(touches.size<2)pinch=null;drag=null;schedule();};
 canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='Escape'){if(V.edit&&J.key){e.stopPropagation();deselect();return;}if(V.boards&&BX.sel){e.stopPropagation();BX.sel=null;renderBoards();schedule();return;}V.full=false;shell.classList.remove('full');}if(e.key==='ArrowLeft')V.yaw+=.1;if(e.key==='ArrowRight')V.yaw-=.1;if(e.key==='ArrowUp')V.pitch=Math.min(1.2,V.pitch+.1);if(e.key==='ArrowDown')V.pitch=Math.max(-1.2,V.pitch-.1);if(e.key==='+'||e.key==='=')V.zoom=Math.min(2.5,V.zoom*1.1);if(e.key==='-')V.zoom=Math.max(.5,V.zoom/1.1);schedule();};
 shell.onkeydown=e=>{if(e.key==='Escape'){if(V.edit&&J.key&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){deselect();return;}if(V.boards&&BX.sel&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){BX.sel=null;renderBoards();schedule();return;}V.full=false;shell.classList.remove('full');fullLabel();schedule();}};
 // wheel: zoom at the pointer (the page does not scroll while the pointer is over the model)
 canvas.addEventListener('wheel',e=>{e.preventDefault();lastWheel=performance.now();clearTimeout(sharpT);sharpT=setTimeout(schedule,200);const rect=canvas.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top,step=e.deltaMode===1?e.deltaY*16:e.deltaY;
 const z2=Math.max(.5,Math.min(8,V.zoom*Math.exp(-step*.0015))),kk=z2/V.zoom;if(Math.abs(kk-1)<1e-4)return;const cx=mx-width/2,cy=my-height*.46;
 V.px=cx*(1-kk)+V.px*kk;V.py=cy*(1-kk)+V.py*kk;V.zoom=z2;schedule();},{passive:false});
 canvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
 observer=new ResizeObserver(schedule);observer.observe(canvas);draw();
}
// Prevent old closure listeners from accumulating when live numeric inputs refresh the mount.
/* the part under a point of the page (drag and drop of a material): {kind:'panel', role, name} / {kind:'plinth'} / {kind:'worktop'} or null */
function pickAt(x,y){const at=document.elementFromPoint(x,y),box=at&&at.closest?at.closest('.av'):null,cv=at&&at.tagName==='CANVAS'?at:box&&box.querySelector('canvas'),P=cv&&PICKS.get(cv);if(!P||!P.pkbuf)return null;const rc=P.canvas.getBoundingClientRect(),px=Math.round((x-rc.left)*P.ratio),py=Math.round((y-rc.top)*P.ratio);
 if(px<0||py<0||px>=P.pixelW||py>=P.pixelH)return null;let k=P.pkbuf[py*P.pixelW+px];
 if(!k){for(let d=1;d<=4&&!k;d++)for(const [dx,dy] of [[d,0],[-d,0],[0,d],[0,-d]]){const qx=px+dx,qy=py+dy;if(qx>=0&&qy>=0&&qx<P.pixelW&&qy<P.pixelH&&P.pkbuf[qy*P.pixelW+qx]){k=P.pkbuf[qy*P.pixelW+qx];break;}}}
 return k?P.parts[k-1]||null:null;}
window.DBAssembly={view:V,pickAt:pickAt,mount:function(el,c,r,lang,hooks){let clean=el.cloneNode(false);el.replaceWith(clean);mount(clean,c,r,lang,hooks);},setBoards:function(on){V.boards=!!on;if(on){V.edit=false;V.mode='assembly';}}};
})();
