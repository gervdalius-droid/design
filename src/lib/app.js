
/* =====================================================================
   app.js — Dėdės Baldai spintelių kūrėjas (cabinet creator).
   Cabinet settings as in the offer app → offer-app sketch → part list,
   .XXL programs (engine.js) and the nesting-app workbook (export.js).
   ===================================================================== */
(function () {
"use strict";
var E = window.DBEngine, X = window.DBExport, Z = window.DBZip, SK = window.OfferSketch, ISO = window.DBIso, RM = window.DBRoom, DR = window.DBDraw;
var VERSION = '2.1';
var IN_ARTIFACT = !!(window.claude && typeof window.claude.use === 'function');

/* ----------------------------------------------------------------- texts */
var T = {
lt:{
 app:'Spintelių kūrėjas', sub:'Dėdės Baldai · detalės ir CNC be inžinieriaus',
 project:'Projektas', projPh:'PROJEKTO_KODAS',
 verBtn:'Versijos', verT:'Projekto versijos', verName:'Versijos pavadinimas', verNamePh:'pvz. Prieš kliento pakeitimus', verSave:'Išsaugoti versiją', verHand:'Išsaugota ranka', verSaved:'Versija išsaugota', verNote:'Versijos saugomos automatiškai: redaguojant — maždaug kas 15 min., ir kai atidaromas kitas projektas. Laikoma: visos per 2 paskutines dienas, senesnės — paskutinė kiekvienos dienos (pusę metų), ranka išsaugotos — visada. ☁ — iš debesies (kito kompiuterio).', verNone:'Versijų dar nėra — pirmoji atsiras po pakeitimų.', verToday:'Šiandien', verYest:'Vakar', verSame:'kaip dabar', verRestore:'Atkurti', verSure:'Tikrai atkurti?', verCopy:'Kaip kopiją', verCopyT:'Atidaro šią versiją kaip naują projektą — dabartinis lieka nepakeistas', verCopied:'Versija pridėta kaip naujas projektas', verBefore:'prieš atkūrimą', verDone:'Versija atkurta — ankstesnė būsena išsaugota kaip versija', topKind:'Viršaus tipas', bKind:'Tipas', bcBotL:'Apačioje', bcBotOn:'Stovi ant dugno', bcBotCov:'Dengia dugną (dugnas trumpesnis)', bcTopL:'Viršuje', bcTopOn:'Po viršumi (stogu)', bcTopCov:'Dengia viršų (viršus trumpesnis)', bcRailOn:'Po surišimo juosta', bcRailCov:'Dengia juostą (juosta paslinkta)', plFitT:'pritaikymas tarpais', plGl:'Tarpas kairėje', plGr:'Tarpas dešinėje', plGt:'Iki dugno', plGb:'Nuo grindų', plFitBtn:'Pritaikyti: tarp šonų po 1 mm, 4 mm iki dugno', plFitOff:'Nustatyti dydį ranka', plFitNote:'Užpildžius tarpus, cokolio ilgis ir aukštis skaičiuojami patys ir keičiasi kartu su spintele. Paveikslėlyje kraštus galima tempti.', plDragT:'Tempkite — cokolio kraštas (tarpas)', plSnap0:'be tarpo', mTop:'Viršus (stogas)', mTopPh:'kaip korpusas', mdT:'Medžiagos — tempkite ant plokštės 3D vaizde', mdChipT:'Tempkite ant plokštės dešinėje', mdNote:'Numesta ant fasado — fasadų medžiaga, ant stogo — viršaus, ant nugaros — nugaros, ant kitų plokščių — korpuso. Fasadų medžiaga ant šono — matomas šonas.', mdWt:'Stalviršis', mdNone:'Čia nėra plokštės', fgT:'Fasadų tarpai, mm', fgL:'Kairėje', fgR:'Dešinėje', fgTop:'Viršuje', fgMid:'Tarp fasadų', fgBot:'Apačia nuo dugno', fgToSide:'Iki šonų apačios', fgReset:'Pagal taisyklę', fgDragT:'Tempkite — fasadų kraštas (tarpas)', fgSnapBot:'lygiai su dugnu', fgSnapSide:'iki šonų apačios', fgSnapTop:'lygiai su viršumi', fgSnapOut:'lygiai su šono išore', fgNote:'Tuščias laukas — pagal taisyklę (pilka reikšmė). „Apačia nuo dugno“: 0 — fasadai prasideda ties dugnu, minusas — žemiau, ir žemiau korpuso (pvz. −20 pakabinamai spintelei — fasadai 20 mm žemiau, rankenėlei; ant kojelių — iki 10 mm virš grindų). Oranžinius kraštus paveikslėlyje galima tempti.', camPickT:'Ekscentrikų pusė — paspauskite, kad perkeltumėte į kitą plokštės pusę', camIn:'ekscentr.: vidus', camOut:'ekscentr.: išorė', topOvF:'Išlenda priekyje', topOvFf:'Išlenda už fasadų', topOvS:'Išlenda šonuose', topOvB:'Išlenda gale', topOvNote:'Kiek viršus (STOGAS) išlenda už korpuso, mm. Pvz. 1 — po 1 mm priekyje, abiejuose šonuose ir gale; plokštė tiek padidėja.', plWhere:'Cokolio vieta', plIn:'Tarp šonų', plUnder:'Po korpusu', plL:'Cokolis', plOff:'Nėra', plOn:'Yra', plH:'Aukštis', plLen:'Ilgis', plYf:'Nuo priekio', plYfH:'mm nuo korpuso priekio (be fasado)', plNote:'Cokolis įtraukiamas į detalių sąrašą (tik pjaunamas) ir matomas 3D bei brėžiniuose. Jis taip pat yra „Papildomos“ žingsnyje.', bkInset:'Nugara nuo galo, mm', bkFront:'Nugaros priekis nuo spintelės priekio', bkInsetH:'Vidinė nugara atitraukiama nuo šonų galo — lentynos ir stalčiai sutrumpėja tiek pat.', shFront:'Lentynų priekis', shFlush:'Lygiai su priekiu', shOther:'Atitraukti, mm', shFrontD:'Kiek lentynos atitrauktos nuo korpuso priekio (taip ir sutrumpėja). 0 — lygiai su šonų priekiu. Su įleistais fasadais palikite bent fasado storį.', tNest:'Plokštės', nestT:'Plokštės ir išdėstymas', nestL:'Kiek plokščių reikia kiekvienai medžiagai ir kaip detalės ant jų gula — skaičiuojama iškart. Pjūvis {k} mm, kraštų apipjovimas {tr} mm (Nesting nustatymai).', nestOpen:'Atidaryti Nesting programoje', nestOpenT:'Atidaro Nesting programą su šio projekto detalėmis (.xlsx kaip DB_PartList ataskaita) — galutiniam išdėstymui, etiketėms ir CNC.', nestNone:'Detalių dar nėra.', nestMat:'Medžiaga', nestBoard:'Plokštė, mm', nestSheets:'Lapų', nestUtil:'Išnaudota', nestParts:'Detalių', nestArea:'Detalių plotas', nestGrain:'Struktūra', nestGrainL:'nesukti', nestTot:'Iš viso lapų', nestSh:'lap.', nestPcs:'det.', nestBig:'netelpa', nestBigL:'Netelpa į plokštę', nestBW:'Plokštės ilgis', nestBH:'Plokštės plotis', nestBadSize:'Plokštės dydis 300–6000 mm', nestHandFail:'Projektas per didelis perduoti — atsisiųskite .xlsx ir įkelkite į Nesting', nestNote:'Greitas įvertinimas: Nesting programa gali sudėti dar tankiau (grupės, likučiai). Pažymėjus „nesukti“, detalių ilgis eina išilgai plokštės (medienos struktūra). Stalviršiai neskaičiuojami.', tCab:'Spintelės', tRes:'Detalės ir CNC', tDrw:'Brėžiniai', drwTitle:'Brėžiniai', drwLead:'Sudaromi automatiškai iš detalių: baldų išdėstymas ir sienų vaizdai (kai spintelės sudėliotos Baldų skirtuke), kiekvienai spintelei — vaizdai su matmenimis ir surinkimo schema su detalių ir furnitūros sąrašu.', drwShow:'Rodyti', drwAll:'Visi lapai', drwFurn:'Tik baldų išdėstymas', drwPaper:'Popierius', drwPdf:'⤓ Atsisiųsti PDF ({n} lap.)', drwOne:'⤓ PDF', drwView:'Peržiūrėti', drwBuilding:'Ruošiamas PDF… {i} / {n}', drwDone:'PDF paruoštas', drwFail:'Nepavyko sudaryti PDF: ', drwNone:'Nėra ką braižyti — pridėkite spintelę.', drwCab:'📐 Brėžiniai', drwZip:'PDF su visais brėžiniais įdedamas ir į „Viskas ZIP“.', drwClose:'Uždaryti', drwPrev:'‹ Ankstesnis', drwNext:'Kitas ›', drwSheets:'lapai', tSet:'Nustatymai', projects:'Projektai',
 cabs:'Spintelės', newCab:'＋ Nauja spintelė', dup:'Kopijuoti', del:'Ištrinti', delSure:'Tikrai ištrinti?',
 sB:'Konstrukcija', sBl:'Kaip surenkama dėžė: atramos, dugnas, viršus, šonai, nugara, jungtys.', nB:'Konstrukcija', bgBase:'Atramos ir dugnas', stepNext:'Toliau', stepBack:'Atgal', libT:'Biblioteka', libQ:'Ieškoti: pavadinimas, matmenys (600x720), medžiaga…', libCats:'Katalogai', libAll:'Visi', libNewCat:'Naujas katalogas', libAddT:'Pridėti šią spintelę į projektą (kopija)', libMove:'Perkelti į katalogą', libNone:'Nieko nerasta — pakeiskite paiešką ar katalogą.', libEmpty:'Biblioteka tuščia. Spintelės redaktoriuje paspauskite „☆ Į biblioteką“ — spintelė bus čia visuose projektuose.', libNewT:'Nauja iš šablono', libSave:'Į biblioteką', libSaveT:'Išsaugoti šią spintelę bibliotekoje — ją galėsite pridėti bet kuriame projekte. Vėlesni pakeitimai atnaujins bibliotekos kopiją.', libLinked:'Bibliotekoje', libLinkedT:'Ši spintelė yra bibliotekoje ir jos pakeitimai ten atnaujinami. Spustelėkite — atsieti (bibliotekos kopija liks tokia, kokia yra).', libSaved:'Išsaugota bibliotekoje: {n} ({c})', libUnlinked:'Atsieta — bibliotekos kopija daugiau nekeičiama', libAdded:'Pridėta iš bibliotekos: {n}', pickTitle:'Kokią spintelę kuriame?', pickLead:'Pasirinkite panašiausią — viską galėsite pakeisti.', cancel:'Atšaukti',
 pDrawers:'Stalčių spintelė', pDoors:'Durų spintelė', pDrDoors:'Stalčius + durys', pWall:'Pakabinama', pTall:'Aukšta su orkaite', pFridge:'Šaldytuvo spinta', kFridge:'Šaldytuvas', fridgeHinge:'Vyriai', fridgeHandle:'Rankena — {s}',
 flipT:'Keisti atidarymo pusę (lankstai į kitą pusę)', flipPair:'Dvejos durys atsidaro į abi puses — keisti nėra ką. Norėdami vienpusių, sekcijoje pasirinkite 1 duris.', flipDone:'Lankstai: {s}', ledAddL:'Pridėti LED:', ledT:'LED apšvietimas', ledL2:'įleidžiamo profilio griovelis 16 × 8, frezuojamas CNC', ledAt:'Kur', ledBottom:'Dugne', ledTop:'Viršuje', ledL:'Kairiame šone', ledR:'Dešiniame šone', ledSide:'Pusė', ledIn:'Viduje', ledOut:'Išorėje', ledFrom:'Nuo priekio', ledEnds:'Galai', ledOpen:'Kiaurai', ledClosed:'Uždari', ledNone:'LED nėra. Pridėkite čia arba Baldų skirtuke nutempkite „LED juostą“ ant spintelės.', ledNote:'Frezuojama kaip step2xxl: freza T=96 Ø15.5, įleidimas nuožulniai per 30 mm, paliekama ≥ 2 mm. „Kiaurai“ — griovelis per visą detalę (profilis įstumiamas, laidas išeina gale). Pakabinamos dugne „Išorėje“ — šviečia žemyn ant stalviršio.', ledChip:'LED juosta', ledChipS:'griovelis 16×8', ledAddT:'Nutempkite ant spintelės — prie jos apačios, viršaus ar šono', ledAdded:'LED pridėtas: {w}', ledMiss:'Paleiskite ant spintelės (vaizdas iš priekio)', rmLeds:'LED', visT:'Matomi šonai (iš fasado medžiagos)', sideFull:'Šonai per visą aukštį (dengia viršų ir dugną)', topMount:'Viršus', topOn:'Ant šonų', topInside:'Tarp šonų', visL:'Kairys', visR:'Dešinys', visB:'Apačia', visNote:'Pažymėtas šonas pjaunamas iš fasado medžiagos ir aplijuojamas fasado briauna; kiti lieka karkaso medžiagos. Kai fasadai nuleisti žemiau korpuso (pvz. −20), matomas šonas pailginamas iki fasadų apačios (dugnas eina tarp jo) — iš šono atrodo kaip fasadas. Baldų skirtuke — mygtukas, kuris pažymi laisvus šonus pagal išdėstymą.', fridgeSec:'Integruojamas šaldytuvas', fridgeN:'Fasadai', fridge1:'1 — vien šaldytuvas', fridge2:'2 — šaldytuvas ir šaldiklis',
 fridgeNiche:'Niša ≈ {h} × {w} mm', fridgeNote:'Fasadai tvirtinami prie šaldytuvo durų — be lankstų. Sekcijos aukštis = nišos aukštis + 2 plokštės (dugnas / lentyna); patikrinkite šaldytuvo instrukcijoje nurodytą nišą (dažniausiai 1772–1780 mm aukščio, ≥ 550 mm gylio). Nišos lentyna gale trumpesnė {v} mm — orui; cokolyje palikite groteles.', pDish:'Indaplovės fasadas', pEmpty:'Tuščia (lentynos)', pBox:'3D konstrukcija',
 bxS1l:'Išoriniai matmenys. Plokštes dėliokite modelyje (▣ Plokštės) arba žemiau.', bxS2:'Plokštės', bxS2l:'Kurios plokštės yra, kiek įleistos ir kuri kurią dengia kampuose.', bxS3:'Vidus', bxS3l:'Pertvaros — per visą aukštį tarp apačios ir viršaus; lentynos — skyriuje tarp pertvarų.', bxS4:'Jungtys', bxS4l:'Kiekvienas galas, atsiremiantis į kitos plokštės plokštumą, sujungiamas — rūšis, kiekis ir vietos kiekvienam mazgui.',
 bx_bottom:'Apačia', bx_top:'Viršus', bx_left:'Kairė', bx_right:'Dešinė', bx_back:'Nugara', bx_front:'Priekis', bxInset:'Įleista', bxT:'Storis', bxCorners:'Kampai — kuri plokštė dengia kurią', bxCovers:'dengia', bxForced:'įleista plokštė visada viduje', bxWith:'su',
 bxS5:'Durys ir stalčiai', bxS5l:'Angos tarp plokščių: pasirinkite skyrių ir angą, durys ar stalčiai. Užeinantis fasadas dengia plokščių kraštus, įleistas — anga viduje.', bxAddDoors:'＋ Durys', bxAddDrawers:'＋ Stalčiai', bxFCol:'Skyrius', bxFCell:'Anga (iš apačios)', bxFSpan:'Angų aukštyn', bxFFit:'Fasadas', bxOverlay:'Užeinantis', bxFInset:'Įleistas', bxNoFronts:'Durų ir stalčių nėra — konstrukcija atvira.', bxNoOpen:'Angų nėra: įjungus priekio plokštę konstrukcija uždara.', bxNoOpen2:'Šiame skyriuje angų nėra — pasirinkite kitą skyrių.', bxFrontOff:'priekio plokštė išjungta — vietoj jos durys / stalčiai', bxAddShelf:'＋ Lentyna', bxAddPart:'＋ Pertvara', bxShelf:'Lentyna', bxPart:'Pertvara', bxZ:'Aukštis (apačia)', bxX:'Nuo kairės (centras)', bxCol:'Skyrius', bxAdj:'Ant laikiklių', bxFixed:'Fiksuota', bxRm:'Pašalinti', bxPinRow:'Laikiklių eilė (po 2 skyles aukščiau ir žemiau)', bxNoInner:'Vidinių plokščių nėra.', bxDefJ:'Numatyta jungtis', bxTph:'kaip korpusas', bx3d:'▣ Dėlioti modelyje',
 s1:'Matmenys', s1l:'Karkaso išoriniai matmenys milimetrais, be kojelių. Galima rašyti 600-18.',
 name:'Pavadinimas', type:'Tipas', tBase:'Pastatoma', tWall:'Pakabinama', tTall:'Aukšta', W:'Plotis', H:'Aukštis', D:'Gylis', thick:'Plokštė', facT:'Fasadas', dishW:'Indaplovės plotis',
 s2:'Sekcijos', s2l:'Viršus sąrašo viršuje. „Likęs“ — užima likusį aukštį.',
 zone:'Fasadų zona', used:'užimta', left:'liko', over:'viršyta',
 kDrawers:'Stalčiai', kDoors:'Durys', kCargo:'Cargo', cargoHw:'Cargo furnitūra', kOpen:'Lentynos', kOven:'Orkaitė',
 secH:'Aukštis', fill:'Likęs', nDr:'Stalčių', runner:'Bėgeliai', rail:'Bėgelio ilgis', nDoors:'Durų', split:'Išdėstymas', sSide:'Šalia', sStack:'Viena virš kitos',
 hinge:'Lankstai', hingeN:'Lankstų durims', rGtv:'GTV guoliniai H45', rDtcU:'DTC paslėpti (D-Motion)', rDtc:'DTC guoliniai H45', cargoNote:'Cargo ištraukiamas: vienas fasadas ant cargo rėmo, be lankstų ir lentynų; furnitūra — cargo {w} mm spintelei (rėmas tvirtinamas pagal gamintojo šabloną, negręžiama).', mvH:'MERIVOBOX aukštis', mvAuto:'Auto (N / M / E su galerija)', mvExt:'E aukštis', mvRail:'Galerija (turėklai)', mvBoxcap:'BOXCAP (aukštas šonas)', mDrw:'Stalčių dugnas / galas (16 mm)', hside:'Lankstų pusė', hsAuto:'Auto', hsL:'Kairė', hsR:'Dešinė', shelves:'Lentynų', adj:'Kilnojamos', fixed:'Fiksuotos', sup:'Atramų',
 add:'Pridėti viršuje', up:'Aukštyn', down:'Žemyn', rm:'Pašalinti',
 s3:'Konstrukcija', s3l:'Kaip sujungiamas karkasas.',
 jConf:'Konfirmatai', jConfD:'Ø8 kiaurai + Ø5×32 krašte. Juostos ir dugnas per konfirmatus.', jCam:'Ekscentrikai + kaiščiai', jCamD:'Ø15 ekscentrikai šone, Ø8 varžtai ir kaiščiai. Surenkama be klijų.',
 top:'Viršus', topRails:'Juostos', topFull:'Pilnas viršus', topOver:'Viršus dengia fasadus',
 back:'Nugara (18 mm)', bNone:'Nėra', bTop:'Išorėje — ant galo', bIn:'Viduje — tarp šonų',
 jTitle:'Jungtys pagal detales', jLead:'Kiekvienai jungčiai galima parinkti savo tvirtinimą. Kiekis — jungčių vienoje pusėje; nuo krašto — kraštinių jungčių atstumas nuo detalės krašto. Tuščia — standartas.',
 jtConf:'Konfirmatai', jtCam:'Ekscentrikai', jtDowel:'Kaiščiai', jN:'Kiekis', jE:'Nuo krašto', jAuto:'standartas', jMain:'Pagrindinis jungimas', jMainL:'Taikomas visoms jungtims, kurių nekeitėte.',
 jk_bottom:'Dugnas ↔ šonai', jk_top:'Viršus ↔ šonai', jk_railF:'Priekinė juosta', jk_railB:'Galinė juosta', jk_railV:'Stati galinė juosta', jk_railBottom:'Apatinė juosta', jk_railVH:'Stati juosta ↔ gulsčia', jk_railBotB:'Apatinė juosta ↔ dugnas', jk_back:'Nugara', jk_shelf:'Fiksuotos lentynos', jk_oven:'Orkaitės atramos',
 lgConf:'konfirmatas', lgCam:'ekscentrikas', lgDowel:'kaištis', xSideL:'kairysis šonas, žiūrint iš kairės', xSideR:'dešinysis šonas, žiūrint iš dešinės', sideL:'Kairys šonas', sideR:'Dešinys šonas',
 rails:'Surišimo juostos', rFront:'Priekyje', rBack:'Gale', rBottom:'Apačioje gale', rBottomD:'stati juosta ant dugno', rFlat:'Gulsčia', rStand:'Stati', rBoth:'Gulsčia + stati', rNone:'Nėra', rW:'Juostos plotis', rCount:'Juostų',
 bFix:'Nugaros tvirtinimas', bFixIn:'Nugara viduje tvirtinama tuo pačiu būdu kaip karkasas.', xsec:'Šoninis pjūvis', xFront:'priekis', xBack:'galas',
 tbMark:'Žymės Ø5 (varžtams)', tbHole:'Skylės Ø10 (reikia Ø10 grąžto)', oTbDm:'Fasado tvirtinimo vietos pažymimos Ø5 × 2 mm — prisukama varžtais. Ø10 grąžto galvoje nėra.',
 s6:'Papildomos detalės', s6l:'Detalės, kurių nėra konstrukcijoje: cokolis, apdailos plokštė, papildoma lentyna… Tik pjaunamos, be skylių.',
 exName:'Pavadinimas', exAdd:'Detalė', exNone:'Papildomų detalių nėra.', exEdges:'Kraštai', exPlinth:'Cokolis',
 rotHint:'↻ — antra programa su ta pačia puse viršuje, plokštė pasukta 90° prieš laikrodžio rodyklę (priekinis kraštas tampa kairiuoju galu).',
 setRails:'Juostos ir nugara', drillsTop:'Grąžtai galvoje (viršus), mm', drillsTopL:'Iš Maestro konfigūracijos. Skylės, kurių skersmens čia nėra, neprogramuojamos.', tbHoleSet:'TANDEMBOX fasado skylė (jei Ø)', tbDef:'TANDEMBOX fasadai',
 s4:'Papildomos operacijos', s4l:'Pažymėkite, ką gręžti CNC. „Patikrinta“ — sutampa su jūsų SWOOD modeliais.',
 oLegs:'Kojelės ir jų žymės dugne', oLegsD:'4 žymės Ø5 × 2 mm kiekvienai kojelei. Plačiai ar sunkiai spintelei pridėkite daugiau kojelių.', legRow:'Kojelių eilėje', ebFac:'Matoma detalė — kraštai pagal fasadą (etiketėje „PAGAL FASADA“)', ebTitle:'Laminuojami kraštai', ebLead:'spustelėkite kraštą — įjungti / išjungti (kaip etiketėje)', ebStd:'Standartiniai', ebT:'Kraštas', ebNoMat:'Kraštas pažymėtas, bet kraštinės medžiaga nenurodyta (Medžiagos) — etiketėje bus „KRAŠTAS“', supL:'Atramos', feetRow:'Pėdutės', feetTotal:'Iš viso pėdučių', supLegs:'Kojelės', supFeet:'Pėdutės', supNone:'Nėra', supEdit:'Nustatymai', feetNote:'Pėdutė Ø15 po šonu · skylė Ø8 × 10 · 50 nuo priekio ir galo', feetParts:'Po šonais ir pertvaromis', feetSides:'Tik po šonais', oFeet:'Pėdutės po šonais', oFeetD:'Ø15 pėdutės po šonais: Ø8 × 10 skylė šono apačioje (arba dugno apačioje po šonu), 50 mm nuo priekio ir galo. Galima pridėti vidurinę eilę.', botMount:'Dugnas', botUnder:'Po šonais', botInside:'Tarp šonų', botZ:'Dugno aukštis nuo apačios', botD:'Dugno gylis', botDFull:'visas', botDGap:'gale ≈ {g} mm laisva — vamzdžiams', shPosT:'Lentynų aukščiai', shPosN:'nuo sekcijos apačios iki lentynos vidurio, mm · tuščias — tolygiai', shPosEven:'Tolygiai', fhTitle:'Fasadų aukščiai, mm', fhNote:'iš viršaus · tuščias = dalijasi likusį aukštį', fhEqual:'Vienodi', legParts:'Po pertvaromis', legRows:'Eilės', legRows2:'2 — priekis, galas', legRows3:'3 — + vidurys', legTotal:'Iš viso kojelių', legFront:'priekis', legDense:'Per tankiai — tarp kojelių būtų mažiau nei 70 mm',
 oRun:'Bėgelių žymės šonuose', oRunD:'Blum TANDEM / TANDEMBOX šablonai pagal stalčių aukštį.',
 oTb:'TANDEMBOX fasadų tvirtinimas', oTbD:'Ø10 × 12 skylės fasado vidinėje pusėje.',
 oHinge:'Lankstų skylės', oHingeD:'Ø35 puodelis duryse su 2 varžtų žymėmis (Ø5 × 2) + 2 plokštelės žymės šone (Ø5 × 2, kaip post-procesoriuje). Blum katalogo matmenys.',
 hfScrew:'Prisukamas (+2 žymės Ø5 × 2)', hfPress:'Įspaudžiamas (+2 × Ø8)',
 oPins:'Lentynų laikiklių skylės', oPinsD:'Ø5 skylės abiejuose šonuose po kiekviena kilnojama lentyna.',
 pinShelf:'Tik po lentyna', pinRow:'Eilė ±2 kas 32',
 notNeeded:'šiai spintelei nereikia', verified:'patikrinta', unverified:'nepatikrinta',
 s5:'Medžiagos ir kraštai', s5l:'Pavadinimai keliauja į detalių sąrašą ir nesting programą.',
 colTooWide:'Kolonų pločiai netelpa į spintelės plotį — kolonos padalintos po lygiai', numBad:'Netinkamas skaičius', numRange:'Leidžiama {a}–{b}', numSome:'Kai kurios reikšmės nebuvo skaičiai — praleistos', perLenBad:'Patikrinkite formatą: „450: 35,195,420; 500: 35,227,470“', wtWallNote:'Tai pakabinama spintelė — ar tikrai reikia stalviršio? Jis bus detalių sąraše.', wtL:'Stalviršis', wtNo:'Nėra', wtYes:'Yra', wtMat:'Stalviršio medžiaga', wtT:'Storis', wtOver:'Už fasadų', wtLeft:'Kairėje už šono', wtRight:'Dešinėje už šono', wtEdge:'Stalviršio kraštas', wtSize:'Stalviršis', wtNote:'Gretimų spintelių stalviršiai (Baldų skirtuke vienas šalia kito, ta pati medžiaga ir storis) detalių sąraše sujungiami į vieną gabalą. Kraštas klijuojamas priekyje ir galuose, kurie kyšo už šono.', setWt:'Stalviršių sąrašas', mCarc:'Karkasas', mFac:'Fasadai', mBack:'Nugara', eCarc:'Karkaso kraštas', eFac:'Fasado kraštas', legH:'Kojelių aukštis',
 sketch:'Eskizas', parts:'Detalių', progs:'Programų', warns:'Pastabos', toRes:'Detalės ir CNC →',
 noCab:'Projekte dar nėra spintelių.', firstCab:'Sukurkite pirmą spintelę',
 rTitle:'Detalių sąrašas ir CNC programos', zipAll:'⤓ Viskas (ZIP)', xlsm:'Sąrašas .xlsx', csv:'Sąrašas .csv', print:'Spausdinti sąrašą', json:'Projektas .json',
 zipNote:'ZIP: visos .XXL programos, .xlsx sąrašas nesting programai (kaip DB_PartList v20 ataskaita), .csv ir projekto failas.',
 cDet:'Detalė', cCab:'Sp.', cMat:'Medžiaga', cL:'Ilgis', cW:'Plotis', cT:'Stor.', cQ:'Kiek.', cEdge:'Kraštai', cProg:'Programos',
 noProg:'be CNC', pick:'Pasirinkite detalę — pamatysite brėžinį ir programą.',
 lgA:'iš viršaus', lgB:'iš apačios (2OP)', lgT:'kiaurai', lgM:'žymė', lgE:'krašte', lgEb:'briauna',
 copy:'Kopijuoti', copied:'Nukopijuota', hw:'Furnitūra', hwNote:'Kiekiai iš konstrukcijos — patikrinkite prieš užsakydami.',
 allWarn:'Pastabos', none:'Nėra',
 setTitle:'Nustatymai', setLead:'Taikoma visiems projektams šioje naršyklėje.',
 tplTitle:'ReportLists šablonas', tplLead:'Sąrašas .xlsx pildomas į šį šabloną taip pat, kaip SolidWorks makrokomanda DB_PartList v20: tie patys lapai, etiketės, QR ir paveikslėliai su struktūros rodykle, detalės sugrupuotos pagal storį (ploniausios pirma), be makrokomandų, atsidaro nuo viršaus. Medžiaga, kurios storis neatitinka detalės, pažymima geltonai (NOTES: PATIKRINTI).',
 tplBuiltIn:'Įdiegtas: ReportLists šablonas (DiG_Virtuve ataskaita), pildomas kaip DB_PartList v20', tplOwn:'Jūsų šablonas: ', tplUpload:'Įkelti kitą ataskaitą (.xlsm / .xlsx)', tplReset:'Grąžinti įdiegtą', tplBad:'Tai ne ReportLists ataskaita — nėra PARTLIST ir LABEL lapų.', tplOk:'Šablonas pakeistas', tplSession:'Šablonas naudojamas tik šiai sesijai (naršyklė neleido išsaugoti).',
 rptFallback:'ReportLists šablono nepavyko užkrauti (reikia interneto JSZip bibliotekai) — sukurtas paprastas sąrašas.', building:'Ruošiama…',
 setMats:'Medžiagų sąrašas', setEdges:'Kraštų sąrašas', setMatsL:'Po vieną eilutėje — bus siūloma pildant.',
 setTypes:'Numatyta konstrukcija pagal tipą', setTypesL:'Naujai spintelei parenkama pagal tipą. Darbuotojui keisti nereikės.',
 setOps:'Numatytos operacijos', setRules:'Lankstų ir lentynų skylių matmenys',
 setRulesL:'Nepatikrinta su jūsų SWOOD modeliu. Patikrinkite pirmas duris ir šoną, pataisykite čia.',
 rCupE:'Puodelio centras nuo durų krašto', rCupD:'Puodelio gylis', rEnd:'Kraštinis lankstas nuo durų galo', rPlF:'Plokštelė nuo šono priekio', rPlS:'Plokštelės skylių atstumas', rPlD:'Plokštelės skylės gylis',
 rPinF:'Laikiklis nuo šono priekio', rPinB:'Laikiklis nuo lentynos galo', rPinBelow:'Skylės centras žemiau lentynos', rPinD:'Laikiklio skylės gylis', rPitch:'Eilės žingsnis',
 resetRules:'Atstatyti katalogo reikšmes', rulesReset:'Lankstų ir lentynų laikiklių reikšmės atstatytos',
 prTitle:'Projektai', prSave:'Išsaugoti šį projektą', prNew:'＋ Naujas projektas', prOpen:'Atverti', prNone:'Išsaugotų projektų nėra.',
 prImport:'Įkelti .json', prImportL:'Šio kūrėjo projektas arba pasiūlymo programos (offer) eksportas — spintelės persikels su matmenimis ir sekcijomis.',
 prHint:'Projektai laikomi šioje naršyklėje. Atsarginei kopijai — „Projektas .json“.',
 close:'Uždaryti', saved:'Išsaugota', imported:'Įkelta spintelių: ', badFile:'Nepavyko perskaityti failo — tai ne projekto JSON.',
 dlFail:'Atsisiųsti nepavyko: ', dlDeclined:'Atsisiuntimas atšauktas', newConfirm:'Pradėti naują? Spauskite dar kartą',
 errTag:'klaida', warnTag:'patikrinti', infoTag:'rankomis',
 legs:'kojelės',
 isoTitle:'Jungtys 3D', isoLead:'tempkite jungtis ant karkaso', isoDrag:'Paimkite jungtį ir nutempkite ant punktyrinės jungties linijos 3D vaizde (arba bakstelėkite kortelę, tada liniją):', isoChipT:'Tempkite ant punktyrinės jungties linijos 3D vaizde arba bakstelėkite ir tada bakstelėkite liniją',
 isoT_confirmat:'Konfirmatas', isoT_cam:'Ekscentrikas', isoT_dowel:'Kaištis',
 isoRotL:'Pasukti 90° į kairę', isoRotR:'Pasukti 90° į dešinę', isoHome:'Grąžinti vaizdą iš priekio-kairės', isoHomeS:'Vaizdas', isoUndo:'Atšaukti', isoUndone:'Atšaukta',
 isoFront:'▼ PRIEKIS', isoJoints:'Karkaso jungtys', isoManual:'rankinės vietos', isoManualS:'rankinės', isoEdit:'Keisti 3D',
 isoHint:'Tempkite jungtį iš viršaus ant linijos — pridėsite. „Atskirai“ — keičiasi tik tas šonas, ant kurio tempiate. Tempkite esamą jungtį išilgai — perkelsite, nutempkite toliau nuo linijos — pašalinsite. Tuščią vietą tempiant vaizdas sukasi. Pažymėtą jungtį galima stumdyti rodyklėmis (Shift — po 10 mm), Delete — pašalinti.',
 isoRefFront:'nuo priekio', isoRefBack:'nuo galo', isoRefRail:'nuo juostos apačios', isoRefBottom:'nuo dugno viršaus', isoRefShelf:'nuo lentynos priekio', isoRefLeft:'nuo kairės pusės', isoOneLine:'viena jungtis', isoRefPartF:'nuo juostos priekio', isoRefPartR:'nuo juostos galo',
 isoSnapMid:'vidurys', isoSnapSym:'simetriškai', isoSnapStd:'standartas',
 isoDropRemove:'Paleiskite — jungtis bus pašalinta', isoTooClose:'Per arti kitos jungties (min. {n} mm)', isoTurn:'Pasukite vaizdą — linija matoma galu',
 isoSame:'Šis tipas jau yra — tempkite ant tuščios linijos vietos', isoConvert:'Paleiskite — visa jungtis taps: {t}', isoAdd:'Paleiskite — pridėti jungtį', isoAddConv:'Pridėti; visa jungtis taps: {t}',
 isoMiss:'Paleiskite ant punktyrinės jungties linijos', isoRemoved:'Jungtis pašalinta', isoRm:'Pašalinti jungtį',
 isoPos:'Vietos, mm', isoNone:'Nėra nė vienos jungties — mazgas nesurištas.', isoAddBtn:'Pridėti', isoEven:'Išdėstyti tolygiai',
 isoLen:'Jungties ilgis {w} mm · ne arčiau {e} mm nuo krašto, tarpas ne mažiau {g} mm.', isoCamDw:'Kaiščiai Ø8 prie kraštinių ekscentrikų (±32) dedami automatiškai.', isoMirror:'Kairys ir dešinys šonai keičiasi kartu.',
 isoNoJ:'Šioje spintelėje karkaso jungčių nėra.',
 isoD_confirmat:'Varžtas per šoną į detalės kraštą. Ø8 kiaurai + Ø5×32. Tvirčiausias, bet varžto galva matosi.', isoD_cam:'Ekscentrikas detalėje pasuktas užveržia varžtą šone. Ø15 + Ø8. Nesimato, galima išardyti.', isoD_dowel:'Medinis kaištis Ø8 su klijais — centruoja ir laiko. Nesimato, neišardomas.',
 isoGrab:'⠿ Tempkite ant jungties', isoTapLine:'Bakstelėkite jungties liniją', isoFullOn:'Atidaryti 3D per visą ekraną', isoFullOff:'Uždaryti visą ekraną (Esc)', isoFullOnS:'Visas ekranas', isoFullOffS:'Uždaryti',
 xxlTitle:'CNC programos (.XXL)', xxlLead:'Kiekvieną programą galima atsisiųsti atskirai, be ZIP. ↻ — pasukta programa (5 mm skylės ilgame krašte). Naršyklė gali paklausti, ar leisti atsisiųsti kelis failus — leiskite.',
 xxlAll:'⤓ Visos .XXL atskirai ({n})', xxlAllT:'Kiekviena programa atskiru failu, be ZIP', xxlCab:'⤓ Šios spintelės ({n})', xxlPart:'⤓ Visos šios detalės ({n})', xxlOne:'Atsisiųsti', xxlRot:'pasukta', xxlSaving:'Atsisiunčiama failų: {n}…',
 reqNote:'privaloma — be to detalių sąraše nebus medžiagos', tRoom:'Baldai', rmTitle:'Visi baldai', rmWall:'Siena', rmWalls:'Sienos', rmVFront:'Iš priekio', rmVPlan:'Planas', rmAllWalls:'Visos sienos',
 rm3Hint:'Tempkite — sukasi. Spustelėkite spintelę — pažymite.', rmAdd:'Pridėti spintelę', rmAddT:'Nutempkite ant sienos (vaizdas „Iš priekio“ arba „Planas“) arba spustelėkite — atsiras po paskutine',
 rmUnplaced:'Nepastatytos', rmPlace:'Pastatyti', rmX:'Nuo sienos pradžios', rmZ:'Apačia nuo grindų', rmHang:'Kabo ant sienos', rmTop:'Viršus nuo grindų', rmTopLegs:'karkasas {h} + kojelės {l}', rmTopZ:'karkasas {h}, apačia {l} nuo grindų', rmHitShort:'Kliūna už kitos spintelės arba išeina už sienos — patraukite arba pakeiskite plotį.',
 rmFill:'Užpildyti tarpą: {w} mm',
 rrBtn:'Realus vaizdas', rrBtnT:'Fotorealistiškas visos patalpos vaizdas (skaičiuojamas vaizdo plokštėje)', rrTitle:'Realus vaizdas', rrLoading:'Kraunamas 3D variklis…', rrBuilding:'Ruošiama scena…', rrProg:'Skaičiuojama: {n} / {m}', rrDone:'Paruošta · {m} kadrų',
 rrRoom:'Patalpa', rrRoomT:'Rodyti sienas, grindis, duris ir langus (lėčiau). Išjungus — tik baldai ant šviesių grindų.', rrPartF:'fasadai', rrPartC:'korpusas', rrPartW:'stalviršis', rrPickN:'‹ › arba klaviatūros ← → keičia medžiagą · Esc — uždaryti', rrCabT:'Fotorealistiškas šios spintelės vaizdas (skaičiuojamas vaizdo plokštėje)', rrQ:'Kokybė', rrQ_fast:'Greitai', rrQ_good:'Gerai', rrQ_best:'Labai gerai', rrDl:'Atsisiųsti PNG', rrHint:'Tempkite į šonus — eikite aplink, aukštyn ir žemyn — akių aukštis · ratukas — arčiau / toliau · „Greitai“ — peržiūrai, „Labai gerai“ — pilna raiška atsisiuntimui. Spalvos ir tekstūros — iš „Išvaizda 3D vaizde“.',
 rrNoLib:'Nepavyko įkelti 3D variklio — reikia interneto ryšio.', rrNoGL:'Ši naršyklė ar kompiuteris nepalaiko WebGL 2 — realaus vaizdo padaryti nepavyks.', rrEmpty:'Baldų dar nėra — pastatykite spintelių ant sienų.',
 pPanel:'Plokštė', rmEditP:'Redaguoti plokštę', rmAddedP:'Pridėta plokštė {n}', rmPanelPush:'Paleiskite — spintelės pasislinks {n} mm', rmThick:'Storis', rmPMat:'Medžiaga', rmToCeil:'Iki lubų', rmToFloor:'Iki grindų',
 rmPanelNote:'Atskira plokštė: stovi pati, bet kokio dydžio (didelis šonas, užpildas, apdaila). Pjaunama kaip detalė, be skylių. Apačia virš 0 — plokštė kabo tame aukštyje.',
 pnS1:'Plokštė', pnS1l:'Atskira plokštė — tik pjaunama, be skylių. Kur ji stovi ir aukštį nuo grindų nustatykite Baldai skirtuke (tempkite kaip spintelę).', pnEdges:'Kraštai', pnEdgeMat:'Krašto medžiaga', pnE1:'L1 priekis', pnE2:'L2 galas', pnE3:'W1 apačia', pnE4:'W2 viršus',
 pnNote:'Storis — plokštės storis (kiek ji užima išilgai sienos), aukštis ir gylis — bet kokie, nepriklauso nuo spintelių.',
 rmSides:'Šoninės plokštės', rmSideL:'Kairėje', rmSideR:'Dešinėje', rmSideCab:'Kaip spintelė', rmSideFloor:'Iki grindų', rmSideRoom:'Grindys–lubos',
 rmSideNote:'Plokštė prie spintelės šono, iš fasado medžiagos, lygi su fasadais. Pjaunama kaip papildoma detalė (be skylių), juda kartu su spintele. Matmenis keiskite spintelės „Papildomos detalės“.',
 rmSideSpare:'Iš pasiūlymo dar nepastatyta šoninių plokščių: {n} ({s}) — ＋ jas pastato.', rmSideShort:'Šoninei plokštei trūksta {n} mm vietos — sumažinkite spintelę arba pastumkite kaimynes.', rmSideMoved:'Spintelės pastumtos {n} mm, kad tilptų plokštė.',
 exSide:'Šoninė plokštė', exSideAdd:'Šoninė plokštė', exWhere:'Vieta', exSideNone:'nepastatyta', exZb:'Apačia nuo spintelės dugno', exYf:'Priekis prieš korpusą', exSideNote:'Šoninė plokštė stovi prie spintelės šono (Baldai skirtukas: pasirinkite spintelę → ＋ Kairėje / Dešinėje). Apačia žemiau 0 — plokštė leidžiasi žemiau spintelės (iki grindų).',
 lookFit:'Per visą detalę', lookFitT:'Nuotrauka dedama per visą kiekvieną detalę (be kartojimo, kraštai apkerpami). Išjungus — kartojama tikru dydžiu: nurodykite, kiek mm plokštės apima nuotraukos plotis.', lookPaste:'Įklijuoti', lookPasteT:'Įklijuoti paveikslėlį iš iškarpinės (nukopijuotą nuotrauką arba ekrano iškarpą)', lookCtrlV:'Paspauskite Ctrl+V — paveikslėlis bus įklijuotas į „{n}“',
 lookNoImg:'Iškarpinėje nėra paveikslėlio — nukopijuokite nuotrauką (dešinys pelės mygtukas → Kopijuoti paveikslėlį) arba padarykite ekrano iškarpą', lookPick:'Kuriai medžiagai? Spauskite „Įklijuoti“ prie medžiagos, tada Ctrl+V',
 lookT:'Išvaizda 3D vaizde', lookL:'Įkelkite plokštės dekoro nuotrauką (tekstūrą), įklijuokite ją iš iškarpinės (Įklijuoti arba Ctrl+V), nutempkite ant medžiagos arba pasirinkite spalvą — tokie bus 3D ir priekio vaizdai. Nuotrauka dedama per visą kiekvieną detalę; išjungus „Per visą detalę“ — kartojama tikru dydžiu („Raštas“ — kiek mm plokštės apima nuotraukos plotis). ↻ — kai nuotraukoje rievės eina skersai. Geriausia — nuotrauka be šešėlių ir rėmelių.', lookUp:'Įkelti tekstūrą', lookChange:'Keisti', lookCol:'Spalva', lookMm:'Raštas', lookRot:'Pasukti raštą 90°', lookRm:'Pašalinti išvaizdą', lookBad:'Nepavyko perskaityti paveikslėlio', lookNone:'Medžiagų dar nėra — įrašykite jas spintelės 1 žingsnyje.', lookFull:'Nepavyko išsaugoti — naršyklės atmintis pilna. Įkelkite mažesnę nuotrauką.', rmEdit:'Redaguoti spintelę', rmDup:'Kopija šalia', rmUnplace:'Nuimti nuo sienos', rmKeys:'← → stumia po 10 mm (Shift — 100 mm), Delete — nuima nuo sienos.',
 rmUsed:'užstatyta {u} mm', rmWallDel:'Pašalinti paskutinę sieną', rmWallDelDone:'Siena pašalinta — jos spintelės perkeltos į „Nepastatytos“', rmRoom:'Patalpa',
 rmRoomL:'Sienos eina pagal laikrodžio rodyklę, žiūrint iš viršaus: A — į dešinę, B — žemyn, C — į kairę, D — aukštyn. Viena siena — baldai tiesia linija, dvi — L, trys — U.',
 rmWallAdd:'Pridėti sieną', rmWallZ:'Pakabinamų apačia nuo grindų', rmRoomH:'Patalpos aukštis', rmWorktop:'Rodyti stalviršį', rmProbs:'Patikrinkite',
 rmProbOut:'Spintelė {a} išeina už sienos galo', rmOtherProbs:'Kitur patalpoje problemų: {n} — uždarykite (✕), kad matytumėte sąrašą', rmWtHint:'Stalviršis rodomas spintelėms, kurioms jis įjungtas (spintelės 1 žingsnis).', rmProbCeil:'Spintelė {a} aukštesnė už patalpą (lubas)', rmBadVal:'Netinkama reikšmė — palikta ankstesnė', rmProbFloor:'Spintelė {a} žemiau grindų', rmProbHit:'Spintelės {a} ir {b} kliūna viena už kitos', rmNoProbs:'Spintelės telpa ir nekliūna viena už kitos',
 rmZoom:'Mastelis', rmZoomIn:'Artinti', rmZoomOut:'Tolinti', rmZoomFit:'Visas vaizdas (dukart spustelėkite tuščią vietą)',
 rmHint:'Spintelę tempkite išilgai sienos ar į kitą sieną — ji prisitraukia prie sienos galo, kampo ar kaimynės. Spustelėkite spintelę — dešinėje pakeisite plotį, užpildysite tarpą, atidarysite redagavimą.',
 rmFromStart:'{x} mm nuo sienos pradžios', rmLeftRight:'kairėje {l} · dešinėje {r}', rszH:'Tempkite — keičia aukštį', rszW:'Tempkite — keičia plotį', rszHt:'aukštis {a} → {b}', rszWd:'plotis {a} → {b}', rszTop:'viršus {t} · apačia {b} nuo grindų', rszAt:'lygiai su: {w}', rszWt:'stalviršio viršus', rszCas:'apvadas', rszCeil:'lubos', rszWallZ:'pakabinamų aukštis', rmSnap_wall:'prie sienos galo', rmSnap_corner:'prie kampo', rmSnap_nb:'prie kaimynės', rmSnap_op:'prie durų ar lango', rmSnap_mid:'sienos viduryje',
 rmVisFree:'Pagal išdėstymą laisvi šonai: {s}.', rmVisNone:'nėra', rmVisFit:'Pritaikyti', rmVisAll:'Matomi šonai pagal išdėstymą', rmVisAllN:'Visoms spintelėms pažymi laisvus šonus (prie jų nieko nėra visu aukščiu) — jie pjaunami iš fasado medžiagos. Pakabinamų apačia nekeičiama.', rmVisAllDone:'Matomi šonai pažymėti pagal išdėstymą — pakeista spintelių: {n}',
 rmPtAdd:'Rozetės ir vamzdžiai', ptSocket:'Rozetė', ptSocket2:'Dviguba rozetė', ptCold:'Šaltas vanduo', ptHot:'Karštas vanduo', ptDrain:'Kanalizacija',
 ptAddT:'Nutempkite ant sienos (vaizdas „Iš priekio“ — ir į aukštį) arba spustelėkite', ptX:'Vidurys nuo sienos pradžios', ptZ:'Aukštis nuo grindų',
 ptNote:'Matmenys — iki taško vidurio. Brėžiniuose sienos vaizde rodomi su atstumais nuo sienos pradžios ir aukščiais — montuotojui ir elektrikui / santechnikui.',
 ptKeys:'← → ↑ ↓ stumia po 10 mm (Shift — 100 mm), Delete — ištrina. Vaizde „Iš priekio“ tempkite ir į šonus, ir aukštyn.', ptProbShort:'Už spintelės šono, durų ar lango angoje, stalviršyje arba už sienos ribų — patraukite.',
 rmProbPtOut:'{o} už sienos ribų', rmProbPtHit:'{o} durų ar lango angoje: {p}', rmProbPtSide:'{o} už spintelės {a} šono', rmProbPtWt:'{o} stalviršio aukštyje (spintelė {a})',
 rmOpAdd:'Durys ir langai', opKeys:'← → stumia po 10 mm (Shift — 100 mm), Delete — ištrina. Tempkite — perkelsite, ir į kitą sieną.', opDoor:'Medinės durys', opGDoor:'Durys su stiklu', opWin:'Langas', opDoorN:'Durys {n}', opWinN:'Langas {n}',
 opAddT:'Nutempkite ant sienos (vaizdas „Iš priekio“ arba „Planas“) arba spustelėkite — atsiras laisvoje vietoje', opType:'Tipas', opW:'Angos plotis', opH:'Angos aukštis', opZ:'Palangės aukštis',
 opHinge:'Vyriai', opHL:'kairėje', opHR:'dešinėje', opSwing:'Atsidaro', opIn:'į patalpą', opOut:'į kitą pusę', opColor:'Spalva',
 opNoteD:'Matmenys — anga sienoje. Durys rodomos su staktos apvadais (po 70 mm aplink angą); plane — varčia ir jos kelias.', opNoteW:'Matmenys — anga sienoje, aukštis — nuo grindų iki angos apačios. Langas rodomas su palange.',
 opProbShort:'Kliūna už spintelės, kitų durų ar lango arba išeina už sienos — patraukite.', opAdded:'Pridėta: {o}', opDeleted:'Ištrinta: {o}', opHitDrop:'Padėta, bet kliūna — žr. problemas dešinėje',
 rmOpShort:'Stovi prieš duris ar langą arba trukdo duris atidaryti — patraukite.',
 rmProbOpOut:'{o} išeina už sienos galo', rmProbOpCeil:'{o} aukštesnis už lubas', rmProbOpHit:'{o} ir {p} persidengia', rmProbOpBlock:'Spintelė {a} užstoja: {o}', rmProbOpSwing:'Spintelė {a} trukdo atidaryti: {o}',
 rmHit:'Kliūna už kitos spintelės', rmHitDrop:'Pastatyta, bet kliūna — patraukite arba pakeiskite plotį', rmDropAdd:'Paleiskite — pridėti čia', rmFitTo:'Tarpe telpa {w} mm — plotis bus {w} mm',
 rmMiss:'Paleiskite ant sienos', rmNo3dDrop:'Įtempti galima vaizduose „Iš priekio“ arba „Planas“', rmPlanLeg:'Planas iš viršaus · stora linija — spintelės priekis · punktyras — pakabinamos',
 rm3Leg:'3D · tempkite — sukasi · ratukas — mastelis ties pele · dukart spustelėkite — visas vaizdas · spustelėkite baldą — pažymite', rmUnplaced1:'Nuimta nuo sienos', rmAdded:'Pridėta spintelė {n}', rmDeleted:'Spintelė ištrinta',
 parts2:'Pertvaros', part0:'Nėra', part1:'1 pertvara', part2:'2 pertvaros', colWl:'plotis', colWnote:'Plotis — iki pertvaros vidurio. Paskutinė kolona gauna, kas lieka iki spintelės pločio.',
 colOne:'Spintelė', colL:'Kairė', colM:'Vidurinė', colR:'Dešinė', backOf:'Nugara', bHdf:'Plaušas', bSolid:'Kieta 18 mm', backMountL:'Kieta nugara', bFixL:'Tvirtinimas', bFix_top_confirmat:'Konfirmatų galvutės matysis nugaros išorėje. Kad iš galo nieko nesimatytų — ekscentrikai (jie šonų vidinėje pusėje) arba kaiščiai (klijuojama).', bFix_top_cam:'Ekscentrikai šonų vidinėje pusėje, varžtai nugaroje — iš galo nieko nesimato.', bFix_dowel:'Tik kaiščiai — nugara klijuojama, iš išorės nieko nesimato.', bFix_inside_confirmat:'Konfirmatų galvutės matysis šonų išorėje, prie galo.', bFix_inside_cam:'Ekscentrikai nugaros vidinėje pusėje — iš išorės nieko nesimato. Paspauskite paveikslėlį, kad perkeltumėte į išorinę (sienos) pusę.', bFix_inside_cam_out:'Ekscentrikai nugaros išorinėje (sienos) pusėje — iš vidaus nesimato, bet matysis iš galo. Paspauskite paveikslėlį, kad perkeltumėte į vidų.', bHdfNote:'Plaušas visada kalamas iš išorės, ant galo.', mainL:'Nugara ir stalviršis',
 cmHint:'Paspauskite koloną, kad ją redaguotumėte.', cmEmpty:'tuščia', cmNoBack:'be nugaros', secRemoved:'Sekcija pašalinta', xRemoved:'Detalė pašalinta', cabRemoved:'Spintelė „{n}“ pašalinta', undoBtn:'Atšaukti', colEdit:'Redaguojama kolona', bTopOnlyAll:'„Išorėje“ galima tik kai visose kolonose kieta nugara — dabar kieta nugara eina kolonos viduje.', bPerCol:'Nugara pasirenkama kiekvienai kolonai (2 žingsnis „Sekcijos“).', jk_part:'Pertvara ↔ dugnas/viršus',
 n1:'Matmenys', n2:'Sekcijos', n3:'Konstrukcija', n4:'Operacijos', n5:'Medžiagos', n6:'Papildomos',
 toHome:'Visi projektai', prNew2:'Naujas projektas', autosaved:'išsaugota', autosaveT:'Viskas išsaugoma automatiškai šioje naršyklėje',
 npLead:'Įrašykite pavadinimą — jis bus CNC programų ir sąrašo failų pavadinimuose. Toliau pasirinksite pirmą spintelę.', npName:'Projekto pavadinimas', npPh:'pvz. VIRTUVE_JONAITIS', npCreate:'Sukurti projektą',
 npOr:'arba', npImport:'Įkelti iš pasiūlymo programos (.json)', npSample:'Atidaryti pavyzdį', npNeed:'Įrašykite projekto pavadinimą', npDone:'Sukurtas projektas {n}',
 prSearch:'Ieškoti projekto…', prOpenNow:'atidarytas', prUpdated:'keista', prDup:'Kopija', prDupT:'Sukurti šio projekto kopiją', prJsonT:'Atsisiųsti projekto failą (atsarginė kopija)', prDupDone:'Kopija sukurta',
 prNone2:'Projektų dar nėra — sukurkite pirmą viršuje.', prNoMatch:'Nieko nerasta.', prHint2:'Projektai išsaugomi automatiškai šioje naršyklėje, o prisijungus — ir debesyje (matomi visuose kompiuteriuose). Atsarginei kopijai ar perkelti į kitą kompiuterį — „.json“.', prDeleted:'Projektas ištrintas',
 noName:'(be pavadinimo)', cabsN:'spint.', copySfx:'(kopija)', agoNow:'ką tik', agoMin:'prieš {n} min.', agoToday:'šiandien',
 firstCabQ:'Pirmoji spintelė — kokią kuriame?', stepsNav:'Spintelės žingsniai', stepNeed:'Reikia užpildyti',
 ckTitleOk:'Paruošta CNC', ckTitleBad:'Prieš siunčiant į CNC — pataisykite', ckFix:'Taisyti', ckName:'Neįrašytas projekto pavadinimas (jis bus failų pavadinimuose)', ckNameOk:'Projektas: <b>{n}</b>',
 ckMat:'Neįrašyta medžiaga — spintelės {c}', ckWt:'Neįrašyta stalviršio medžiaga — spintelės {c}', ckMatOk:'Medžiagos įrašytos', ckEdge:'Neįrašytas karkaso kraštas — spintelės {c}', ckErr:'Klaidų, dėl kurių dalis detalių ar skylių nepadaroma: {n} (žr. žemiau)', ckProg:'{p} detalės, {n} CNC programų',
 isoSides:'Šonai:', isoModeBoth:'Abu kartu', isoModeSep:'Atskirai', isoModeBothT:'Pakeitimas viename šone pakartojamas kitame (veidrodiškai)', isoModeSepT:'Keičiamas tik tas šonas, ant kurio tempiate',
 isoBoth:'abu šonai', isoBothNote:'Kairys ir dešinys šonai keičiasi kartu. Norėdami keisti tik vieną šoną, viršuje pasirinkite „Atskirai“.', isoDiffer:'šonai skiriasi',
 isoCopyToR:'Taip pat ir dešiniame', isoCopyToL:'Taip pat ir kairiame', isoCopied:'Abu šonai vienodi', isoL1:'K:', isoR1:'D:', isoResetT:'Abiem šonams — standartas', isoArmed:'Bakstelėkite jungties liniją — bus pridėta. Dar kartą bakstelėkite mygtuką — atšaukti.', isoMissTap:'Bakstelėkite tiksliau ant punktyrinės jungties linijos',
},
en:{
 app:'Cabinet creator', sub:'Dėdės Baldai · parts and CNC without the engineer',
 project:'Project', projPh:'PROJECT_CODE',
 verBtn:'Versions', verT:'Project versions', verName:'Version name', verNamePh:'e.g. Before the client\'s changes', verSave:'Save version', verHand:'Saved by hand', verSaved:'Version saved', verNote:'Versions are kept automatically: while editing about every 15 minutes, and when another project is opened. Kept: everything from the last 2 days, older ones the last of each day (half a year), named ones always. ☁ — from the cloud (another computer).', verNone:'No versions yet — the first one appears after changes.', verToday:'Today', verYest:'Yesterday', verSame:'as now', verRestore:'Restore', verSure:'Really restore?', verCopy:'As a copy', verCopyT:'Opens this version as a new project — the current one stays as it is', verCopied:'Version added as a new project', verBefore:'before restoring', verDone:'Version restored — the previous state was kept as a version', topKind:'Top type', bKind:'Type', bcBotL:'At the bottom', bcBotOn:'Stands on the bottom', bcBotCov:'Covers the bottom (shorter bottom)', bcTopL:'At the top', bcTopOn:'Under the top', bcTopCov:'Covers the top (shorter top)', bcRailOn:'Under the back rail', bcRailCov:'Covers the rail (rail moved forward)', plFitT:'fitted by gaps', plGl:'Gap left', plGr:'Gap right', plGt:'To the bottom', plGb:'From the floor', plFitBtn:'Fit: between the sides 1 mm each, 4 mm under the bottom', plFitOff:'Set the size by hand', plFitNote:'With the gaps filled, the plinth\'s length and height follow the cabinet by themselves. The edges in the picture can be dragged.', plDragT:'Drag — the plinth\'s edge (gap)', plSnap0:'no gap', mTop:'Top (STOGAS)', mTopPh:'as the carcass', mdT:'Materials — drag onto a board in the 3-D view', mdChipT:'Drag onto a board on the right', mdNote:'Dropped on a front — the fronts\' material, on the top — the top\'s, on the back — the back\'s, on other boards — the carcass. The fronts\' material on a side — a visible side.', mdWt:'Worktop', mdNone:'No board here', fgT:'Front gaps, mm', fgL:'Left', fgR:'Right', fgTop:'Top', fgMid:'Between fronts', fgBot:'Bottom from the bottom panel', fgToSide:'Down to the sides\' bottom', fgReset:'By the rule', fgDragT:'Drag — the fronts\' edge (gap)', fgSnapBot:'flush with the bottom panel', fgSnapSide:'down to the sides\' bottom', fgSnapTop:'flush with the top', fgSnapOut:'flush with the side\'s outer face', fgNote:'Empty — by the rule (the grey value). "Bottom": 0 — the fronts start at the bottom panel, minus — lower, also below the carcass (e.g. −20 on a wall cabinet — the fronts 20 mm below it, as a grip; on legs — down to 10 mm above the floor). The orange edges in the picture can be dragged.', camPickT:'Side of the eccentrics — click to move them to the other face of the panel', camIn:'cams: inside', camOut:'cams: outside', topOvF:'Overhang at the front', topOvFf:'Overhang past the fronts', topOvS:'Overhang at the sides', topOvB:'Overhang at the back', topOvNote:'How far the top (STOGAS) reaches past the carcass, mm. E.g. 1 — 1 mm at the front, both sides and the back; the board grows by that much.', plWhere:'Plinth position', plIn:'Between the sides', plUnder:'Under the carcass', plL:'Plinth', plOff:'None', plOn:'Yes', plH:'Height', plLen:'Length', plYf:'From the front', plYfH:'mm behind the carcass front (fronts not counted)', plNote:'The plinth goes into the part list (cut only) and shows in 3D and the drawings. It is in the Extras step too.', bkInset:'Back from the rear edge, mm', bkFront:'Back\'s front face from the cabinet front', bkInsetH:'The inside back is set forward from the sides\' back edge — shelves and drawers get that much shorter.', shFront:'Shelf front', shFlush:'Flush with the front', shOther:'Set back, mm', shFrontD:'How far the shelves stand back from the carcass front (they get that much shorter). 0 — flush with the sides\' front. With inset fronts leave at least the front\'s thickness.', tNest:'Boards', nestT:'Boards and layout', nestL:'How many boards each material takes and how the parts lie on them — worked out at once. Kerf {k} mm, edge trim {tr} mm (Nesting settings).', nestOpen:'Open in the Nesting app', nestOpenT:'Opens the Nesting app with this project\'s parts (the .xlsx as a DB_PartList report) — for the final layout, labels and CNC.', nestNone:'No parts yet.', nestMat:'Material', nestBoard:'Board, mm', nestSheets:'Boards', nestUtil:'Used', nestParts:'Parts', nestArea:'Parts area', nestGrain:'Grain', nestGrainL:'don\'t turn', nestTot:'Boards in all', nestSh:'boards', nestPcs:'pcs', nestBig:'too big', nestBigL:'Too big for the board', nestBW:'Board length', nestBH:'Board width', nestBadSize:'Board size 300–6000 mm', nestHandFail:'The project is too big to hand over — download the .xlsx and load it into Nesting', nestNote:'A quick estimate: the Nesting app can pack tighter still (groups, offcuts). With "don\'t turn" the parts\' length runs along the board (wood grain). Worktops are not counted.', tCab:'Cabinets', tRes:'Parts & CNC', tDrw:'Drawings', drwTitle:'Drawings', drwLead:'Made automatically from the parts: furniture layout and wall elevations (when cabinets are placed in the Furniture tab), and for every cabinet its dimensioned views and an assembly diagram with the parts and hardware lists.', drwShow:'Show', drwAll:'All sheets', drwFurn:'Furniture layout only', drwPaper:'Paper', drwPdf:'⤓ Download PDF ({n} sheets)', drwOne:'⤓ PDF', drwView:'View', drwBuilding:'Making the PDF… {i} / {n}', drwDone:'PDF ready', drwFail:'Could not make the PDF: ', drwNone:'Nothing to draw — add a cabinet.', drwCab:'📐 Drawings', drwZip:'The PDF with all drawings also goes into the full ZIP.', drwClose:'Close', drwPrev:'‹ Previous', drwNext:'Next ›', drwSheets:'sheets', tSet:'Settings', projects:'Projects',
 cabs:'Cabinets', newCab:'＋ New cabinet', dup:'Duplicate', del:'Delete', delSure:'Really delete?',
 sB:'Construction', sBl:'How the box is built: supports, bottom, top, sides, back, joints.', nB:'Construction', bgBase:'Supports and bottom', stepNext:'Next', stepBack:'Back', libT:'Library', libQ:'Search: name, size (600x720), material…', libCats:'Catalogues', libAll:'All', libNewCat:'New catalogue', libAddT:'Add this cabinet to the project (a copy)', libMove:'Move to a catalogue', libNone:'Nothing found — change the search or the catalogue.', libEmpty:'The library is empty. In the cabinet editor press "☆ Save to library" — the cabinet will be here in every project.', libNewT:'New from a template', libSave:'Save to library', libSaveT:'Keep this cabinet in the library — add it in any project. Later edits update the library copy.', libLinked:'In the library', libLinkedT:'This cabinet is in the library and its edits update it there. Click to unlink (the library copy stays as it is).', libSaved:'Saved in the library: {n} ({c})', libUnlinked:'Unlinked — the library copy no longer changes', libAdded:'Added from the library: {n}', pickTitle:'What are we building?', pickLead:'Pick the closest one — everything can be changed.', cancel:'Cancel',
 pDrawers:'Drawer cabinet', pDoors:'Door cabinet', pDrDoors:'Drawer + doors', pWall:'Wall cabinet', pTall:'Tall with oven', pFridge:'Fridge unit', kFridge:'Fridge', fridgeHinge:'Hinges', fridgeHandle:'Handle — {s}',
 flipT:'Change the opening side (hinges to the other side)', flipPair:'A pair of doors opens both ways — nothing to flip. For one-way, choose 1 door in the section.', flipDone:'Hinges: {s}', ledAddL:'Add an LED:', ledT:'LED lighting', ledL2:'a groove for a recessed profile, 16 × 8, routed on the CNC', ledAt:'Where', ledBottom:'Bottom', ledTop:'Top', ledL:'Left side', ledR:'Right side', ledSide:'Face', ledIn:'Inside', ledOut:'Outside', ledFrom:'From the front', ledEnds:'Ends', ledOpen:'Through', ledClosed:'Closed', ledNone:'No LEDs. Add one here, or drag "LED strip" onto a cabinet in the Baldai tab.', ledNote:'Routed as step2xxl does: cutter T=96 Ø15.5, ramped entry over 30 mm, at least 2 mm left. "Through" — the groove runs the whole part (the profile slides in, the cable leaves at the end). A wall unit\'s bottom "Outside" lights the worktop below.', ledChip:'LED strip', ledChipS:'groove 16×8', ledAddT:'Drag onto a cabinet — near its bottom, top or a side', ledAdded:'LED added: {w}', ledMiss:'Drop it on a cabinet (front view)', rmLeds:'LED', visT:'Visible sides (in the front material)', sideFull:'Full-height sides (covering the top and the bottom)', topMount:'Top', topOn:'On the sides', topInside:'Between the sides', visL:'Left', visR:'Right', visB:'Bottom', visNote:'A ticked side is cut from the front material with the front edging; the others stay in the carcass material. When the fronts reach below the carcass (e.g. −20), a visible side goes down to the bottom of the fronts (the bottom goes between it) — from the side it looks like the fronts. In Baldai one button ticks the free sides from the layout.', fridgeSec:'Integrated fridge', fridgeN:'Fronts', fridge1:'1 — fridge only', fridge2:'2 — fridge and freezer',
 fridgeNiche:'Niche ≈ {h} × {w} mm', fridgeNote:'The fronts are screwed to the fridge\'s own doors — no hinges. Section height = niche height + 2 boards (bottom / shelf); check the niche in the fridge\'s manual (usually 1772–1780 mm high, ≥ 550 mm deep). The niche shelf stops {v} mm short of the back for the air; leave a grille in the plinth.', pDish:'Dishwasher front', pEmpty:'Empty (shelves)', pBox:'3D construction',
 bxS1l:'Outer size. Place the boards in the model (▣ Boards) or below.', bxS2:'Boards', bxS2l:'Which boards there are, how far they are set in, and which covers which at the corners.', bxS3:'Inside', bxS3l:'Partitions run the full height between bottom and top; shelves sit in one compartment.', bxS4:'Joints', bxS4l:'Every end that meets another board\'s face is joined — type, count and positions per joint.',
 bx_bottom:'Bottom', bx_top:'Top', bx_left:'Left', bx_right:'Right', bx_back:'Back', bx_front:'Front', bxInset:'Set in', bxT:'Thickness', bxCorners:'Corners — which board covers which', bxCovers:'covers', bxForced:'a set-in board always sits inside', bxWith:'with',
 bxS5:'Doors and drawers', bxS5l:'Openings between boards: pick the compartment and the opening, doors or drawers. An overlay front covers the board edges, an inset one sits inside the opening.', bxAddDoors:'＋ Doors', bxAddDrawers:'＋ Drawers', bxFCol:'Compartment', bxFCell:'Opening (from the bottom)', bxFSpan:'Openings high', bxFFit:'Front', bxOverlay:'Overlay', bxFInset:'Inset', bxNoFronts:'No doors or drawers — the construction is open.', bxNoOpen:'No openings: with the front board on, the construction is closed.', bxNoOpen2:'This compartment has no opening — choose another compartment.', bxFrontOff:'front board switched off — doors / drawers instead', bxAddShelf:'＋ Shelf', bxAddPart:'＋ Partition', bxShelf:'Shelf', bxPart:'Partition', bxZ:'Height (underside)', bxX:'From the left (centre)', bxCol:'Compartment', bxAdj:'On pins', bxFixed:'Fixed', bxRm:'Remove', bxPinRow:'Pin row (2 more holes above and below)', bxNoInner:'No inner boards.', bxDefJ:'Default joint', bxTph:'as carcass', bx3d:'▣ Place in the model',
 s1:'Dimensions', s1l:'Outer carcass size in millimetres, without legs. You can type 600-18.',
 name:'Name', type:'Type', tBase:'Base', tWall:'Wall', tTall:'Tall', W:'Width', H:'Height', D:'Depth', thick:'Board', facT:'Front', dishW:'Dishwasher width',
 s2:'Sections', s2l:'Top of the list is the top of the cabinet. “Fill” takes the remaining height.',
 zone:'Front zone', used:'used', left:'left', over:'exceeded',
 kDrawers:'Drawers', kDoors:'Doors', kCargo:'Cargo', cargoHw:'Cargo fitting', kOpen:'Shelves', kOven:'Oven',
 secH:'Height', fill:'Fill', nDr:'Drawers', runner:'Runners', rail:'Runner length', nDoors:'Doors', split:'Layout', sSide:'Side by side', sStack:'Stacked',
 hinge:'Hinges', hingeN:'Hinges per door', rGtv:'GTV ball-bearing H45', rDtcU:'DTC undermount (D-Motion)', rDtc:'DTC ball-bearing H45', cargoNote:'Cargo pull-out: one front on the cargo frame, no hinges or shelves; fitting — a cargo for a {w} mm cabinet (the frame is fixed with the maker\'s template, nothing is drilled).', mvH:'MERIVOBOX height', mvAuto:'Auto (N / M / E with gallery)', mvExt:'E height', mvRail:'Gallery (railing)', mvBoxcap:'BOXCAP (high side)', mDrw:'Drawer base / back (16 mm)', hside:'Hinge side', hsAuto:'Auto', hsL:'Left', hsR:'Right', shelves:'Shelves', adj:'Adjustable', fixed:'Fixed', sup:'Supports',
 add:'Add on top', up:'Up', down:'Down', rm:'Remove',
 s3:'Construction', s3l:'How the carcass is joined.',
 jConf:'Confirmats', jConfD:'Ø8 through + Ø5×32 in the edge. Rails and bottom fixed with confirmats.', jCam:'Cams + dowels', jCamD:'Ø15 cams in the side, Ø8 bolts and dowels. Assembled without glue.',
 top:'Top', topRails:'Rails', topFull:'Full top', topOver:'Top covers the fronts',
 back:'Back (18 mm)', bNone:'None', bTop:'Outside — on the back edges', bIn:'Inside — between the sides',
 jTitle:'Joints by part', jLead:'Each joint can have its own connector. Count — connectors along one end; from edge — distance of the outer ones from the part edge. Empty — standard.',
 jtConf:'Confirmats', jtCam:'Cams', jtDowel:'Dowels', jN:'Count', jE:'From edge', jAuto:'standard', jMain:'Main joinery', jMainL:'Used for every joint you have not changed.',
 jk_bottom:'Bottom ↔ sides', jk_top:'Top ↔ sides', jk_railF:'Front rail', jk_railB:'Back rail', jk_railV:'Standing back rail', jk_railBottom:'Bottom rail', jk_railVH:'Standing rail ↔ flat rail', jk_railBotB:'Bottom rail ↔ bottom', jk_back:'Back', jk_shelf:'Fixed shelves', jk_oven:'Oven supports',
 lgConf:'confirmat', lgCam:'cam', lgDowel:'dowel', xSideL:'left side, seen from the left', xSideR:'right side, seen from the right', sideL:'Left side', sideR:'Right side',
 rails:'Top rails', rFront:'Front', rBack:'Back', rBottom:'Bottom back', rBottomD:'standing rail on the bottom', rFlat:'Flat', rStand:'Standing', rBoth:'Flat + standing', rNone:'None', rW:'Rail width', rCount:'Rails',
 bFix:'Back fixing', bFixIn:'An inside back is fixed the same way as the carcass.', xsec:'Side section', xFront:'front', xBack:'back',
 tbMark:'Ø5 marks (screws)', tbHole:'Ø10 holes (needs a Ø10 drill)', oTbDm:'Front-fixing points marked Ø5 × 2 mm — screwed on. There is no Ø10 drill on the head.',
 s6:'Extra parts', s6l:'Parts that are not in the construction: plinth, cover panel, extra shelf… Cut only, no holes.',
 exName:'Name', exAdd:'Part', exNone:'No extra parts.', exEdges:'Edges', exPlinth:'Plinth',
 rotHint:'↻ — second program with the same face up, panel turned 90° counter-clockwise (the front edge becomes the left end).',
 setRails:'Rails and back', drillsTop:'Drills on the head (top), mm', drillsTopL:'From the Maestro configuration. Holes of a size not listed are not programmed.', tbHoleSet:'TANDEMBOX front hole (if Ø)', tbDef:'TANDEMBOX fronts',
 s4:'Extra operations', s4l:'Tick what the CNC should drill. “Verified” means it matches your SWOOD models.',
 oLegs:'Legs and their marks in the bottom', oLegsD:'4 marks Ø5 × 2 mm per leg. Add more legs for a wide or heavy cabinet.', legRow:'Legs in a row', ebFac:'Visible part — edges as the fronts (label: PAGAL FASADA)', ebTitle:'Banded edges', ebLead:'click an edge to switch it on / off (as on the label)', ebStd:'Standard', ebT:'Edge', ebNoMat:'Edge marked, but no edge band material is set (Materials) — the label will say "KRAŠTAS"', supL:'Supports', feetRow:'Feet', feetTotal:'Feet in total', supLegs:'Legs', supFeet:'Feet', supNone:'None', supEdit:'Settings', feetNote:'Foot Ø15 under a side · hole Ø8 × 10 · 50 from the front and back', feetParts:'Under the sides and partitions', feetSides:'Under the sides only', oFeet:'Feet under the sides', oFeetD:'Ø15 feet under the sides: a Ø8 × 10 hole in the side bottom edge (or in the bottom underside below the side), 50 mm from the front and back. A middle row can be added.', botMount:'Bottom', botUnder:'Under the sides', botInside:'Between the sides', botZ:'Bottom height from below', botD:'Bottom depth', botDFull:'full', botDGap:'≈ {g} mm free at the back — for the pipes', shPosT:'Shelf heights', shPosN:'from the section bottom to the shelf middle, mm · empty — spread evenly', shPosEven:'Evenly', fhTitle:'Front heights, mm', fhNote:'from the top · empty = shares what is left', fhEqual:'Equal', legParts:'Under partitions', legRows:'Rows', legRows2:'2 — front, back', legRows3:'3 — + middle', legTotal:'Legs in total', legFront:'front', legDense:'Too dense — less than 70 mm between legs',
 oRun:'Runner marks in the sides', oRunD:'Blum TANDEM / TANDEMBOX patterns at each drawer height.',
 oTb:'TANDEMBOX front fixing', oTbD:'Ø10 × 12 holes on the inside of the front.',
 oHinge:'Hinge holes', oHingeD:'Ø35 cup in the door with 2 screw marks (Ø5 × 2) + 2 plate marks in the side (Ø5 × 2, as the post-processor makes them). Blum catalogue values.',
 hfScrew:'Screw-on (+2 marks Ø5 × 2)', hfPress:'Press-in (+2 × Ø8)',
 oPins:'Shelf support holes', oPinsD:'Ø5 holes in both sides under every adjustable shelf.',
 pinShelf:'Under the shelf only', pinRow:'Row ±2 at 32',
 notNeeded:'not needed for this cabinet', verified:'verified', unverified:'unverified',
 s5:'Materials and edges', s5l:'Names go to the part list and the nesting app.',
 colTooWide:'The column widths do not fit the cabinet width — the columns are split equally', numBad:'Not a number', numRange:'Allowed {a}–{b}', numSome:'Some values were not numbers — left out', perLenBad:'Check the format: “450: 35,195,420; 500: 35,227,470”', wtWallNote:'This is a wall cabinet — does it really need a worktop? It goes into the part list.', wtL:'Worktop', wtNo:'None', wtYes:'Yes', wtMat:'Worktop material', wtT:'Thickness', wtOver:'Past the fronts', wtLeft:'Past the left side', wtRight:'Past the right side', wtEdge:'Worktop edge', wtSize:'Worktop', wtNote:'Worktops of cabinets standing side by side in the Furniture tab (same material and thickness) are joined into one piece in the part list. The edge goes on the front and on ends that stick out past a side.', setWt:'Worktop list', mCarc:'Carcass', mFac:'Fronts', mBack:'Back', eCarc:'Carcass edge', eFac:'Front edge', legH:'Leg height',
 sketch:'Sketch', parts:'Parts', progs:'Programs', warns:'Notes', toRes:'Parts & CNC →',
 noCab:'No cabinets in this project yet.', firstCab:'Create the first cabinet',
 rTitle:'Part list and CNC programs', zipAll:'⤓ Everything (ZIP)', xlsm:'List .xlsx', csv:'List .csv', print:'Print list', json:'Project .json',
 zipNote:'ZIP: all .XXL programs, the .xlsx list for the nesting app (like a DB_PartList v20 report), a .csv and the project file.',
 cDet:'Part', cCab:'Cab.', cMat:'Material', cL:'Length', cW:'Width', cT:'Thk.', cQ:'Qty', cEdge:'Edges', cProg:'Programs',
 noProg:'no CNC', pick:'Pick a part to see its drawing and program.',
 lgA:'from top', lgB:'from below (2OP)', lgT:'through', lgM:'mark', lgE:'in edge', lgEb:'edgeband',
 copy:'Copy', copied:'Copied', hw:'Hardware', hwNote:'Quantities come from the construction — check before ordering.',
 allWarn:'Notes', none:'None',
 setTitle:'Settings', setLead:'Applies to every project in this browser.',
 tplTitle:'ReportLists template', tplLead:'The .xlsx list is filled into this template the same way the SolidWorks macro DB_PartList v20 does: same sheets, labels, QR and pictures with the grain arrow, parts grouped by thickness (thinnest first), no macros, opening at the top. A material whose thickness is not the part\'s is marked yellow (NOTES: PATIKRINTI).',
 tplBuiltIn:'Built in: ReportLists template (DiG_Virtuve report), filled as DB_PartList v20', tplOwn:'Your template: ', tplUpload:'Load another report (.xlsm / .xlsx)', tplReset:'Back to built-in', tplBad:'This is not a ReportLists report — there are no PARTLIST and LABEL sheets.', tplOk:'Template changed', tplSession:'Template used for this session only (the browser would not store it).',
 rptFallback:'The ReportLists template could not be loaded (JSZip needs internet) — a plain list was made instead.', building:'Preparing…',
 setMats:'Material list', setEdges:'Edgeband list', setMatsL:'One per line — offered while filling in.',
 setTypes:'Default construction per type', setTypesL:'A new cabinet gets these by type. The workshop does not need to change them.',
 setOps:'Default operations', setRules:'Hinge and shelf hole dimensions',
 setRulesL:'Not verified against your SWOOD model. Check the first door and side, then correct here.',
 rCupE:'Cup centre from the door edge', rCupD:'Cup depth', rEnd:'Outer hinge from the door end', rPlF:'Plate from the side front', rPlS:'Plate hole spacing', rPlD:'Plate hole depth',
 rPinF:'Support from the side front', rPinB:'Support from the shelf back', rPinBelow:'Hole centre below the shelf', rPinD:'Support hole depth', rPitch:'Row pitch',
 resetRules:'Reset to catalogue values', rulesReset:'Hinge and shelf-support values reset',
 prTitle:'Projects', prSave:'Save this project', prNew:'＋ New project', prOpen:'Open', prNone:'No saved projects.',
 prImport:'Import .json', prImportL:'A project from this creator or an export from the offer app — cabinets come across with sizes and sections.',
 prHint:'Projects are stored in this browser. For a backup use “Project .json”.',
 close:'Close', saved:'Saved', imported:'Cabinets imported: ', badFile:'Could not read the file — it is not a project JSON.',
 dlFail:'Download failed: ', dlDeclined:'Download cancelled', newConfirm:'Start new? Click again',
 errTag:'error', warnTag:'check', infoTag:'by hand',
 legs:'legs',
 isoTitle:'Joints in 3D', isoLead:'drag connectors onto the carcass', isoDrag:'Pick up a connector and drop it on a dashed joint line in the 3D view (or tap the card, then the line):', isoChipT:'Drag onto a dashed joint line in the 3D view, or tap it and then tap the line',
 isoT_confirmat:'Confirmat', isoT_cam:'Cam', isoT_dowel:'Dowel',
 isoRotL:'Turn 90° left', isoRotR:'Turn 90° right', isoHome:'Back to the front-left view', isoHomeS:'View', isoUndo:'Undo', isoUndone:'Undone',
 isoFront:'▼ FRONT', isoJoints:'Carcass joints', isoManual:'placed by hand', isoManualS:'by hand', isoEdit:'Edit in 3D',
 isoHint:'Drag a connector from the bar onto a line to add it. “Separately” — only the side you drag on changes. Drag a connector along its line to move it, far off the line to remove it. Dragging empty space turns the view. A selected connector moves with the arrow keys (Shift — 10 mm), Delete removes it.',
 isoRefFront:'from the front', isoRefBack:'from the back', isoRefRail:'from the rail bottom', isoRefBottom:'from the bottom top face', isoRefShelf:'from the shelf front', isoRefLeft:'from the left end', isoOneLine:'one joint', isoRefPartF:'from the rail front', isoRefPartR:'from the rail back',
 isoSnapMid:'centre', isoSnapSym:'symmetric', isoSnapStd:'standard',
 isoDropRemove:'Release to remove this connector', isoTooClose:'Too close to another connector (min. {n} mm)', isoTurn:'Turn the view — this line is seen end-on',
 isoSame:'Already this type — drop on an empty part of the line', isoConvert:'Release — the whole joint becomes: {t}', isoAdd:'Release to add a connector', isoAddConv:'Add; the whole joint becomes: {t}',
 isoMiss:'Release on a dashed joint line', isoRemoved:'Connector removed', isoRm:'Remove connector',
 isoPos:'Positions, mm', isoNone:'No connectors — this joint is not held.', isoAddBtn:'Add', isoEven:'Spread evenly',
 isoLen:'Joint length {w} mm · at least {e} mm from the edge, gap at least {g} mm.', isoCamDw:'Ø8 dowels next to the outer cams (±32) are added automatically.', isoMirror:'Left and right sides change together.',
 isoNoJ:'This cabinet has no carcass joints.',
 isoD_confirmat:'Screw through the side into the part edge. Ø8 through + Ø5×32. Strongest, the head shows.', isoD_cam:'A cam in the part, turned, pulls the bolt in the side tight. Ø15 + Ø8. Hidden, can be taken apart.', isoD_dowel:'Ø8 wooden dowel with glue — aligns and holds. Hidden, not taken apart.',
 isoGrab:'⠿ Drag onto a joint', isoTapLine:'Tap a joint line', isoFullOn:'Open the 3D view full screen', isoFullOff:'Close full screen (Esc)', isoFullOnS:'Full screen', isoFullOffS:'Close',
 xxlTitle:'CNC programs (.XXL)', xxlLead:'Every program can be downloaded on its own, without a ZIP. ↻ — turned program (5 mm holes in a long edge). The browser may ask whether to allow several downloads — allow it.',
 xxlAll:'⤓ All .XXL separately ({n})', xxlAllT:'Each program as its own file, no ZIP', xxlCab:'⤓ This cabinet ({n})', xxlPart:'⤓ All of this part ({n})', xxlOne:'Download', xxlRot:'turned', xxlSaving:'Downloading {n} files…',
 reqNote:'required — otherwise the part list has no material', tRoom:'Furniture', rmTitle:'All furniture', rmWall:'Wall', rmWalls:'Walls', rmVFront:'Front', rmVPlan:'Plan', rmAllWalls:'All walls',
 rm3Hint:'Drag to turn. Click a cabinet to select it.', rmAdd:'Add a cabinet', rmAddT:'Drag onto a wall (Front or Plan view) or click — it goes after the last one',
 rmUnplaced:'Not placed', rmPlace:'Place', rmX:'From the wall start', rmZ:'Bottom from the floor', rmHang:'Hangs on the wall', rmTop:'Top from the floor', rmTopLegs:'carcass {h} + legs {l}', rmTopZ:'carcass {h}, bottom {l} from the floor', rmHitShort:'Hits another cabinet or runs past the wall — move it or change the width.',
 rmFill:'Fill the gap: {w} mm',
 rrBtn:'Realistic image', rrBtnT:'A photo-like picture of the whole room (rendered on the graphics card)', rrTitle:'Realistic image', rrLoading:'Loading the 3D engine…', rrBuilding:'Preparing the scene…', rrProg:'Rendering: {n} / {m}', rrDone:'Ready · {m} samples',
 rrRoom:'Room', rrRoomT:'Show the walls, floor, doors and windows (slower). Off: the furniture alone on a light floor.', rrPartF:'fronts', rrPartC:'carcass', rrPartW:'worktop', rrPickN:'‹ › or the keyboard ← → change the material · Esc closes', rrCabT:'A photo-like picture of this cabinet (rendered on the graphics card)', rrQ:'Quality', rrQ_fast:'Fast', rrQ_good:'Good', rrQ_best:'Best', rrDl:'Download PNG', rrHint:'Drag sideways to walk round, up and down for eye height · wheel to come nearer or step back · “Fast” to look around, “Best” for full resolution to download. Colours and textures come from “Look in the 3D views”.',
 rrNoLib:'Could not load the 3D engine — needs an internet connection.', rrNoGL:'This browser or computer has no WebGL 2 — the realistic image cannot be made.', rrEmpty:'No furniture yet — place cabinets on the walls.',
 pPanel:'Panel', rmEditP:'Edit panel', rmAddedP:'Panel {n} added', rmPanelPush:'Drop — the cabinets move over {n} mm', rmThick:'Thickness', rmPMat:'Material', rmToCeil:'To the ceiling', rmToFloor:'Down to the floor',
 rmPanelNote:'A loose panel: it stands on its own, any size (a big side, a filler, a cover). Cut as a part, no holes. A bottom above 0 hangs it at that height.',
 pnS1:'Panel', pnS1l:'A loose panel — only cut, no holes. Where it stands and its height from the floor are set in the Furniture tab (drag it like a cabinet).', pnEdges:'Edges', pnEdgeMat:'Edge material', pnE1:'L1 front', pnE2:'L2 back', pnE3:'W1 bottom', pnE4:'W2 top',
 pnNote:'Thickness is the board thickness (what it takes along the wall); height and depth can be anything, independent of the cabinets.',
 rmSides:'Side panels', rmSideL:'Left', rmSideR:'Right', rmSideCab:'As the cabinet', rmSideFloor:'Down to the floor', rmSideRoom:'Floor to ceiling',
 rmSideNote:'A board against the cabinet side, in the front material, flush with the fronts. Cut as an extra part (no holes), moves with the cabinet. Change its size in the cabinet\'s “Extra parts”.',
 rmSideSpare:'Side panels from the offer not placed yet: {n} ({s}) — ＋ places them.', rmSideShort:'The side panel is {n} mm short of room — make a cabinet narrower or move the neighbours.', rmSideMoved:'Cabinets moved {n} mm to make room for the panel.',
 exSide:'Side panel', exSideAdd:'Side panel', exWhere:'Place', exSideNone:'not placed', exZb:'Bottom from the carcass bottom', exYf:'Front ahead of the carcass', exSideNote:'A side panel stands against the cabinet side (Furniture tab: select the cabinet → ＋ Left / Right). A bottom below 0 takes it below the cabinet (to the floor).',
 lookFit:'Over the whole board', lookFitT:'The photo is laid once over each board (no repeats, the edges cropped). Off: it repeats at its real size — enter how many mm of board the photo width covers.', lookPaste:'Paste', lookPasteT:'Paste an image from the clipboard (a copied picture or a screenshot)', lookCtrlV:'Press Ctrl+V — the image goes to “{n}”',
 lookNoImg:'No image on the clipboard — copy a picture (right click → Copy image) or take a screenshot', lookPick:'Which material? Press “Paste” at the material, then Ctrl+V',
 lookT:'Look in the 3D views', lookL:'Upload a photo of the board decor (texture), paste it from the clipboard (Paste or Ctrl+V), drop it on a material, or pick a colour — the 3D and front views show it. The photo is laid over each whole board; turn “Over the whole board” off to repeat it at its real size (“Pattern”: how many mm of board the photo width covers). ↻ when the grain runs across the photo. Best: a photo without shadows or borders.', lookUp:'Upload texture', lookChange:'Change', lookCol:'Colour', lookMm:'Pattern', lookRot:'Turn the pattern 90°', lookRm:'Remove the look', lookBad:'The image could not be read', lookNone:'No materials yet — enter them in step 1 of a cabinet.', lookFull:'Could not save — the browser storage is full. Upload a smaller photo.', rmEdit:'Edit cabinet', rmDup:'Copy next to it', rmUnplace:'Take off the wall', rmKeys:'← → move 10 mm (Shift — 100 mm), Delete takes it off the wall.',
 rmUsed:'{u} mm used', rmWallDel:'Remove the last wall', rmWallDelDone:'Wall removed — its cabinets moved to “Not placed”', rmRoom:'Room',
 rmRoomL:'Walls run clockwise seen from above: A to the right, B down, C to the left, D up. One wall — furniture in a straight line, two — L, three — U.',
 rmWallAdd:'Add a wall', rmWallZ:'Wall cabinets bottom from the floor', rmRoomH:'Room height', rmWorktop:'Show the worktop', rmProbs:'Check',
 rmProbOut:'Cabinet {a} runs past the wall end', rmOtherProbs:'Problems elsewhere in the room: {n} — close (✕) to see the list', rmWtHint:'A worktop shows on cabinets that have one turned on (cabinet step 1).', rmProbCeil:'Cabinet {a} reaches above the ceiling', rmBadVal:'Not a valid value — the previous one is kept', rmProbFloor:'Cabinet {a} is below the floor', rmProbHit:'Cabinets {a} and {b} hit each other', rmNoProbs:'Cabinets fit and do not hit each other',
 rmZoom:'Zoom', rmZoomIn:'Zoom in', rmZoomOut:'Zoom out', rmZoomFit:'Whole drawing (or double-click an empty spot)',
 rmHint:'Drag a cabinet along a wall or to another wall — it snaps to the wall end, corner or neighbour. Click a cabinet to change its width, fill a gap or open it for editing on the right.',
 rmFromStart:'{x} mm from the wall start', rmLeftRight:'left {l} · right {r}', rszH:'Drag — changes the height', rszW:'Drag — changes the width', rszHt:'height {a} → {b}', rszWd:'width {a} → {b}', rszTop:'top {t} · bottom {b} from the floor', rszAt:'aligned with: {w}', rszWt:'worktop top', rszCas:'casing', rszCeil:'ceiling', rszWallZ:'wall-unit height', rmSnap_wall:'at the wall end', rmSnap_corner:'at the corner', rmSnap_nb:'at the neighbour', rmSnap_op:'at a door or window', rmSnap_mid:'centred on the wall',
 rmVisFree:'From the layout, the free sides are: {s}.', rmVisNone:'none', rmVisFit:'Apply', rmVisAll:'Visible sides from the layout', rmVisAllN:'Ticks the free sides of every cabinet (nothing beside them over their full height) — they are cut from the front material. Wall cabinets\' bottoms are left as they are.', rmVisAllDone:'Visible sides set from the layout — cabinets changed: {n}',
 rmPtAdd:'Sockets and pipes', ptSocket:'Socket', ptSocket2:'Double socket', ptCold:'Cold water', ptHot:'Hot water', ptDrain:'Drain',
 ptAddT:'Drag onto a wall (in the Front view also up and down) or click', ptX:'Middle from the wall start', ptZ:'Height from the floor',
 ptNote:'Sizes are to the middle of the point. On the wall elevations in the drawings they are dimensioned from the wall start, with their heights — for the fitter, the electrician and the plumber.',
 ptKeys:'← → ↑ ↓ move it 10 mm (Shift — 100 mm), Delete removes it. In the Front view drag it sideways and up and down.', ptProbShort:'Behind a cabinet side, in a door or window, at worktop height, or off the wall — move it.',
 rmProbPtOut:'{o} is off the wall', rmProbPtHit:'{o} is in an opening: {p}', rmProbPtSide:'{o} is behind a side of cabinet {a}', rmProbPtWt:'{o} is at worktop height (cabinet {a})',
 rmOpAdd:'Doors and windows', opKeys:'← → moves it 10 mm (Shift — 100 mm), Delete removes it. Drag it along the wall or to another one.', opDoor:'Wooden door', opGDoor:'Door with glass', opWin:'Window', opDoorN:'Door {n}', opWinN:'Window {n}',
 opAddT:'Drag onto a wall (Front or Plan view) or click — it goes into a free spot', opType:'Type', opW:'Opening width', opH:'Opening height', opZ:'Sill height',
 opHinge:'Hinges', opHL:'left', opHR:'right', opSwing:'Opens', opIn:'into the room', opOut:'away from the room', opColor:'Colour',
 opNoteD:'Sizes are the hole in the wall. A door is drawn with its casing (70 mm round the hole); the plan shows the leaf and its sweep.', opNoteW:'Sizes are the hole in the wall; the sill height is from the floor to the bottom of the hole. A window is drawn with its sill.',
 opProbShort:'Hits a cabinet, another door or window, or runs past the wall — move it.', opAdded:'Added: {o}', opDeleted:'Deleted: {o}', opHitDrop:'Placed, but it hits something — see the problems on the right',
 rmOpShort:'Stands in front of a door or window, or in a door\'s way — move it.',
 rmProbOpOut:'{o} runs past the wall end', rmProbOpCeil:'{o} is higher than the ceiling', rmProbOpHit:'{o} and {p} overlap', rmProbOpBlock:'Cabinet {a} is in front of {o}', rmProbOpSwing:'Cabinet {a} is in the way of {o}',
 rmHit:'Hits another cabinet', rmHitDrop:'Placed, but it hits — move it or change the width', rmDropAdd:'Release to add here', rmFitTo:'The gap is {w} mm — width will be {w} mm',
 rmMiss:'Release on a wall', rmNo3dDrop:'Drop in the Front or Plan view', rmPlanLeg:'Plan from above · thick line — cabinet front · dashed — wall cabinets',
 rm3Leg:'3D · drag to turn · wheel to zoom at the pointer · double-click for the whole room · click a piece to select it', rmUnplaced1:'Taken off the wall', rmAdded:'Cabinet {n} added', rmDeleted:'Cabinet deleted',
 parts2:'Partitions', part0:'None', part1:'1 partition', part2:'2 partitions', colWl:'width', colWnote:'Width — to the middle of the partition. The last column takes what is left of the cabinet width.',
 colOne:'Cabinet', colL:'Left', colM:'Middle', colR:'Right', backOf:'Back', bHdf:'Fibreboard', bSolid:'Solid 18 mm', backMountL:'Solid back', bFixL:'Fixing', bFix_top_confirmat:'Confirmat heads will show on the outside of the back. For nothing to show from behind, choose cams (they sit on the inner faces of the sides) or dowels (glued).', bFix_top_cam:'Cams on the inner faces of the sides, bolts in the back — nothing shows from behind.', bFix_dowel:'Dowels only — the back is glued; nothing shows from outside.', bFix_inside_confirmat:'Confirmat heads will show on the outside of the sides, near the back.', bFix_inside_cam:'Cams on the inner face of the back — nothing shows from outside. Click the picture to move them to the outer (wall) face.', bFix_inside_cam_out:'Cams on the outer (wall) face of the back — not seen inside, but they show from behind. Click the picture to move them inside.', bHdfNote:'Fibreboard is always nailed on from the outside.', mainL:'Back and worktop',
 cmHint:'Click a column to edit it.', cmEmpty:'empty', cmNoBack:'no back', secRemoved:'Section removed', xRemoved:'Part removed', cabRemoved:'Cabinet “{n}” removed', undoBtn:'Undo', colEdit:'Editing column', bTopOnlyAll:'“Outside” only works when every column has a solid back — now a solid back goes inside its column.', bPerCol:'The back is chosen per column (step 2 “Sections”).', jk_part:'Partition ↔ bottom/top',
 n1:'Size', n2:'Sections', n3:'Construction', n4:'Operations', n5:'Materials', n6:'Extras',
 toHome:'All projects', prNew2:'New project', autosaved:'saved', autosaveT:'Everything is saved automatically in this browser',
 npLead:'Type a name — it goes into the CNC program and list file names. Next you pick the first cabinet.', npName:'Project name', npPh:'e.g. KITCHEN_SMITH', npCreate:'Create project',
 npOr:'or', npImport:'Import from the offer app (.json)', npSample:'Open the example', npNeed:'Type a project name', npDone:'Project {n} created',
 prSearch:'Search projects…', prOpenNow:'open', prUpdated:'changed', prDup:'Copy', prDupT:'Make a copy of this project', prJsonT:'Download the project file (backup)', prDupDone:'Copy made',
 prNone2:'No projects yet — create the first one above.', prNoMatch:'Nothing found.', prHint2:'Projects are saved automatically in this browser and, when signed in, in the cloud (on every computer). For a backup or another computer — “.json”.', prDeleted:'Project deleted',
 noName:'(no name)', cabsN:'cab.', copySfx:'(copy)', agoNow:'just now', agoMin:'{n} min ago', agoToday:'today',
 firstCabQ:'First cabinet — what are we building?', stepsNav:'Cabinet steps', stepNeed:'Needs filling in',
 ckTitleOk:'Ready for CNC', ckTitleBad:'Before sending to CNC — fix these', ckFix:'Fix', ckName:'No project name (it goes into the file names)', ckNameOk:'Project: <b>{n}</b>',
 ckMat:'No material — cabinets {c}', ckWt:'No worktop material — cabinets {c}', ckMatOk:'Materials filled in', ckEdge:'No carcass edging — cabinets {c}', ckErr:'Errors that leave parts or holes out: {n} (see below)', ckProg:'{p} parts, {n} CNC programs',
 isoSides:'Sides:', isoModeBoth:'Both', isoModeSep:'Separately', isoModeBothT:'A change on one side is mirrored on the other', isoModeSepT:'Only the side you drag on changes',
 isoBoth:'both sides', isoBothNote:'Left and right sides change together. To change only one side, pick “Separately” above.', isoDiffer:'sides differ',
 isoCopyToR:'Same on the right', isoCopyToL:'Same on the left', isoCopied:'Both sides now match', isoL1:'L:', isoR1:'R:', isoResetT:'Standard on both sides', isoArmed:'Tap a joint line to add it there. Tap the button again to stop.', isoMissTap:'Tap closer to a dashed joint line',
}};
/* joints that come one per partition: labels for partitions 1–3 */
(function () {
  var L = { lt:{ partB:'Pertvara {n} ↔ dugnas', partT:'Pertvara {n} ↔ viršus', partF:'Pertvara {n} ↔ priekinė juosta', partR:'Pertvara {n} ↔ galinė juosta', backP:'Nugara ↔ pertvara {n}' },
            en:{ partB:'Partition {n} ↔ bottom', partT:'Partition {n} ↔ top', partF:'Partition {n} ↔ front rail', partR:'Partition {n} ↔ back rail', backP:'Back ↔ partition {n}' } };
  ['lt', 'en'].forEach(function (lg) { if (!T[lg]) return; for (var n = 1; n <= 3; n++) Object.keys(L[lg]).forEach(function (b) { T[lg]['jk_' + b + n] = L[lg][b].replace('{n}', n); }); });
})();
function t(k) { return (T[S.lang] && T[S.lang][k] !== undefined) ? T[S.lang][k] : (T.lt[k] !== undefined ? T.lt[k] : k); }

/* ----------------------------------------------------------------- helpers */
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function uid() { return Math.random().toString(36).slice(2, 9); }
/* numbers: decimal comma and simple maths like the offer app (600-18, 2*300) */
function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v == null || v === '') return 0;
  var s = String(v).replace(/\s+/g, '').replace(/,/g, '.');
  if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return parseFloat(s);
  if (/^[\d.+\-*/()]+$/.test(s) && /\d/.test(s)) { try { var r = Function('"use strict";return (' + s.replace(/\b0+(\d)/g, '$1') + ')')(); if (typeof r === 'number' && isFinite(r)) return r; } catch (e) {} }
  var n = parseFloat(s); return isFinite(n) ? n : 0;
}
var fmt = function (v) { return E.num(Math.round(num(v) * 10) / 10); };
function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); if (window.__dbkOnStore) { try { window.__dbkOnStore(k); } catch (er) {} } return true; } catch (e) { return v === undefined ? null : false; } }
/* the browser's storage is full (or blocked): say so once — the work is not lost while the page stays open, but must be exported */
var saveFailShown = false;
function saveFailed() { var sv = document.getElementById('saved'); if (sv) { sv.classList.add('fail'); sv.textContent = S.lang === 'lt' ? '✕ neišsaugota' : '✕ not saved'; }
  if (saveFailShown) return; saveFailShown = true;
  toast(S.lang === 'lt' ? 'Naršyklės atmintis pilna — projektas neišsaugotas. Atsisiųskite jį (Projektai → JSON) ir ištrinkite senus projektus.' : 'Browser storage is full — the project was not saved. Download it (Projects → JSON) and delete old projects.', true); }
function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
function setPath(o, p, v) { var ks = p.split('.'), last = ks.pop(); var tg = ks.reduce(function (a, k) { if (a[k] == null) a[k] = {}; return a[k]; }, o); tg[last] = v; }

/* ----------------------------------------------------------------- defaults */
var RULE_DEF = { hinge:clone(E.R.hinge), pins:clone(E.R.pins), drillsTop:E.R.drills.top.join(', '), tbHole:{ d:10, depth:12 }, ball:clone(E.R.ball), under:clone(E.R.under), merivo:clone(E.R.merivo) };
var TYPES = ['PASTATOMOS', 'PAKABINAMOS', 'ŪKINĖ'];
function defSettings() {
  return {
    materials:[], edges:[],
    types:{
      'PASTATOMOS':  { joinery:'confirmat', top:'rails', back:'none', backFix:'confirmat', topOverFacade:false, legs:true,  railFront:'h', railBack:'h', railBottom:false },
      'PAKABINAMOS': { joinery:'confirmat', top:'full',  back:'top',  backFix:'confirmat', topOverFacade:false, legs:false, railFront:'h', railBack:'h', railBottom:false },
      'ŪKINĖ':       { joinery:'confirmat', top:'full',  back:'top',  backFix:'cam',       topOverFacade:false, legs:true,  railFront:'h', railBack:'h', railBottom:false }
    },
    railW:100,
    ops:{ runnerMarks:true, tbFront:'mark', hinges:true, hingeFix:'screw', pins:'shelf' },
    rules:clone(RULE_DEF)
  };
}
function newSection(kind) {
  return { id:uid(), kind:kind, col:0, fill:kind !== 'drawers' && kind !== 'oven', height:kind === 'drawers' ? 540 : kind === 'oven' ? 595 : 400, cargoHw:'CARGO DTC PURE PRO',
           nDrawers:3, hw:'BLUM TANDEMBOX', rail:500, nDoors:kind === 'doors' ? 2 : 1, hinge:'BLUM LANKSTAI', doorSplit:'v', hingeSide:'auto',
           shelves:kind === 'oven' ? 2 : kind === 'open' ? 2 : 1, shelfAdj:true, shelfMode:'even', shelfPos:[], divider:kind === 'open' };
}
/* ---- columns (pertvaros) and a back per column */
function colsOf(c) { return c.dishwasher ? 1 : Math.max(1, Math.min(3, Math.floor(num(c.cols) || 1))); }
function colOf(c, s) { return Math.min(colsOf(c) - 1, Math.max(0, Math.floor(num(s.col) || 0))); }
function colWidths(c) {   // outer widths (to partition centres), last one takes the rest
  var n = colsOf(c), W = num(c.W), w = Array.isArray(c.colW) && c.colW.length === n ? c.colW.map(num) : null;
  var rest = w ? W - w.slice(0, n - 1).reduce(function (a, b) { return a + b; }, 0) : 0;
  if (!w || w.slice(0, n - 1).some(function (v) { return !(v >= 50); }) || rest < 50) { w = []; for (var k = 0; k < n; k++) w.push(Math.round(W / n)); rest = W - w.slice(0, n - 1).reduce(function (a, b) { return a + b; }, 0); }   // widths that do not fit: equal columns (as the parts are cut)
  w[n - 1] = rest;
  return w;
}
function legacyBack(cnc) { return cnc.back === 'hdf' ? 'hdf' : !cnc.back || cnc.back === 'none' ? 'none' : 'solid'; }   // a type default may be 'hdf': fibreboard nailed on the back
function fixCols(c) {   // keep colW / backs / section columns consistent with the column count
  var n = colsOf(c); c.cols = n; c.colW = n > 1 ? colWidths(c) : [];
  var b = Array.isArray(c.cnc.backs) ? c.cnc.backs.slice(0, 3) : [];   // backs of columns taken away are kept: a partition put back gets its back again
  while (b.length < n) b.push(b.length ? b[b.length - 1] : legacyBack(c.cnc));
  c.cnc.backs = b; if (!c.cnc.backMount) c.cnc.backMount = c.cnc.back === 'inside' ? 'inside' : 'top';
  c.sections.forEach(function (s) {   // sections of a column taken away go to the last column, and back to their own when it returns
    if (s.colWant != null && s.colWant <= n - 1) { s.col = s.colWant; delete s.colWant; }
    else if (Math.floor(num(s.col) || 0) > n - 1 && s.colWant == null) s.colWant = Math.floor(num(s.col) || 0);
    s.col = colOf(c, s); });
  if (n === 1 && c.cnc.legsX === 'parts') c.cnc.legsX = 2;   // legs "at the partitions" with no partitions left
}
function colName(n, k) { return n === 1 ? t('colOne') : k === 0 ? t('colL') : k === n - 1 ? t('colR') : t('colM'); }
function cncFor(type) {
  var ty = S.settings.types[type] || S.settings.types.PASTATOMOS, op = S.settings.ops;
  return { joinery:ty.joinery, top:ty.top, back:ty.back === 'hdf' ? 'top' : ty.back, backFix:ty.backFix || 'confirmat', topOverFacade:!!ty.topOverFacade, legs:!!ty.legs, facadeT:18,
           rails:{ front:ty.railFront || 'h', back:ty.railBack || 'h', bottom:!!ty.railBottom }, railW:num(S.settings.railW) || 100, joints:{},
           runnerMarks:op.runnerMarks, tbFront:op.tbFront, hinges:op.hinges, hingeFix:op.hingeFix, pins:op.pins,
           backs:[legacyBack(ty)], backMount:ty.back === 'inside' ? 'inside' : 'top' };
}
function newCabinet(type) {
  var last = S.proj.cabinets[S.proj.cabinets.length - 1];
  return { id:uid(), name:'', type:type || 'PASTATOMOS', W:600, H:720, D:560, thick:18, cols:1, colW:[], dishwasher:false, dishWidth:600, legH:100,
           mat:last ? clone(last.mat) : { carc:'', facade:'', back:'' }, edge:last ? clone(last.edge) : { carc:'', facade:'' },
           cnc:cncFor(type || 'PASTATOMOS'), sections:[], extras:[],
           worktop:Object.assign(wtDefault(), last && last.worktop ? { mat:last.worktop.mat || '', T:last.worktop.T, over:last.worktop.over, edge:last.worktop.edge || '',
             on:!!last.worktop.on && (type || 'PASTATOMOS') === 'PASTATOMOS' } : {}) };
}
function wtDefault() { return { on:false, mat:'', T:E.WT_DEF.T, over:E.WT_DEF.over, left:0, right:0, edge:'' }; }
var PRESETS = [
  { k:'pDrawers', type:'PASTATOMOS', W:600, H:720, D:560, secs:[['drawers', { fill:true, nDrawers:3 }]] },
  { k:'pDoors',   type:'PASTATOMOS', W:600, H:720, D:560, secs:[['doors', { fill:true, nDoors:2, shelves:1 }]] },
  { k:'pDrDoors', type:'PASTATOMOS', W:600, H:720, D:560, secs:[['doors', { fill:true, nDoors:2, shelves:1 }], ['drawers', { fill:false, height:180, nDrawers:1 }]] },
  { k:'pWall',    type:'PAKABINAMOS', W:600, H:720, D:330, secs:[['doors', { fill:true, nDoors:2, shelves:2 }]] },
  { k:'pTall',    type:'ŪKINĖ', W:600, H:2100, D:580, secs:[['drawers', { fill:false, height:560, nDrawers:2 }], ['oven', { fill:false, height:595, shelves:2 }], ['doors', { fill:true, nDoors:1, shelves:2, hingeSide:'right' }]] },
  { k:'pFridge',  type:'ŪKINĖ', W:600, H:2100, D:560, secs:[['doors', { fill:false, height:1816, fridge:true, nDoors:2, doorSplit:'h', hinge:'BE FURNITŪROS', shelves:0, frontH:{ 1:720 } }], ['doors', { fill:true, nDoors:1, shelves:0, hingeSide:'right' }]] },   // a 1780 mm niche (+ bottom and its shelf), fridge over freezer
  { k:'pDish',    type:'PASTATOMOS', W:600, H:720, D:560, dish:true, secs:[] },
  { k:'pEmpty',   type:'PASTATOMOS', W:600, H:720, D:560, secs:[['open', { fill:true, shelves:2 }]] },
  { k:'pPanel',   type:'PASTATOMOS', W:18, H:2300, D:600, panel:true, secs:[] },   // a loose board of any size (big side / end panel, filler)
  { k:'pBox',     type:'PASTATOMOS', W:600, H:720, D:560, box:true, secs:[] }
];
function fromPreset(pr) {
  var c = newCabinet(pr.type); c.W = pr.W; c.H = pr.H; c.D = pr.D; c.dishWidth = pr.W;
  if (pr.dish) { c.dishwasher = true; c.name = S.lang === 'lt' ? 'Indaplovė' : 'Dishwasher'; }
  if (pr.k === 'pFridge') c.name = S.lang === 'lt' ? 'Šaldytuvas' : 'Fridge';
  c.sections = pr.secs.map(function (s) { return Object.assign(newSection(s[0]), s[1]); });
  if (pr.box) { c.kind = 'box'; c.box = { boards:{}, cover:{}, inner:[] }; E.boxDefaults(c); c.cnc.legs = false; c.cnc.feet = false; }
  if (pr.panel) {   // as tall as the room, in the front material and edge of the last cabinet that has them
    c.kind = 'panel'; c.cnc.legs = false; c.cnc.feet = false; c.pe = { e1:true, e2:true, e3:true, e4:true }; c.thick = c.W;
    var lay = S.proj && S.proj.layout; if (lay && num(lay.roomH) > 0) c.H = num(lay.roomH);
    var cnt = {}, best = null; (S.proj ? S.proj.cabinets : []).forEach(function (k) { var m0 = k.kind !== 'panel' && k.mat && (k.mat.facade || k.mat.carc); if (!m0) return; cnt[m0] = (cnt[m0] || 0) + 1; if (!best || cnt[m0] >= cnt[best.m]) best = { m:m0, e:(k.edge && (k.edge.facade || k.edge.carc)) || '' }; });   // the front material most cabinets have
    if (best) { c.mat = { carc:best.m, facade:best.m, back:'' }; c.edge = { carc:best.e, facade:'' }; }
  }
  return c;
}

/* ----------------------------------------------------------------- state */
var S = {
  lang:(store('dbKurejas.lang') || 'lt'), tab:'cab', sel:0, picking:false, part:null, ptab:0, drawer:false, confirm:null,
  settings:Object.assign(defSettings(), store('dbKurejas.settings') || {}),
  proj:store('dbKurejas.current') || null
};
(function normSettings() { var d = defSettings(), s = S.settings;
  s.types = Object.assign(d.types, s.types || {}); TYPES.forEach(function (k) { s.types[k] = Object.assign(defSettings().types[k], s.types[k] || {}); });
  s.ops = Object.assign(d.ops, s.ops || {}); if (typeof s.ops.tbFront === 'boolean') s.ops.tbFront = s.ops.tbFront ? 'mark' : 'off';
  var sr = s.rules || {};
  s.rules = { hinge:Object.assign(clone(RULE_DEF.hinge), sr.hinge || {}), pins:Object.assign(clone(RULE_DEF.pins), sr.pins || {}),
              drillsTop:sr.drillsTop || RULE_DEF.drillsTop, tbHole:Object.assign(clone(RULE_DEF.tbHole), sr.tbHole || {}), ball:Object.assign(clone(RULE_DEF.ball), sr.ball || {}), under:Object.assign(clone(RULE_DEF.under), sr.under || {}), merivo:Object.assign(clone(RULE_DEF.merivo), sr.merivo || {}) };
  delete s.rules.hinge.plateDepth; s.rules.hinge.plateDepth = RULE_DEF.hinge.plateDepth;   // plate holes are markings now (post: Ø5 × 2), not a setting
  if (!(num(s.railW) > 0)) s.railW = 100;
  s.materials = s.materials || []; s.edges = s.edges || []; s.worktops = s.worktops || []; })();
function drillList(txt) { return String(txt || '').split(/[^\d.]+/).map(num).filter(function (v) { return v > 0; }); }
function applyRules() {
  var r = S.settings.rules, tb = { d:num(r.tbHole.d) || 10, depth:num(r.tbHole.depth) || 12 };
  E.setRules({ hinge:clone(RULE_DEF.hinge), pins:clone(RULE_DEF.pins), ball:clone(RULE_DEF.ball), under:clone(RULE_DEF.under), merivo:clone(RULE_DEF.merivo), drills:{ top:drillList(RULE_DEF.drillsTop) }, runner:{ 'BLUM TANDEMBOX':{ facade:{ d:10, depth:12 } } } });
  if (r.ball) { var bl = {}; Object.keys(RULE_DEF.ball).forEach(function (k) { var v = r.ball[k]; if (k === 'perLen') bl[k] = String(v || ''); else if (k === 'drawerMarks') bl[k] = v !== false; else if (k === 'lengths') bl[k] = RULE_DEF.ball.lengths.slice(); else if (v !== '' && v != null && isFinite(num(v))) bl[k] = num(v); }); E.setRules({ ball:bl }); if (r.ball.perLen === '') E.R.ball.perLen = ''; }
  if (r.under) { var ul = {}; Object.keys(RULE_DEF.under).forEach(function (k) { var v = r.under[k]; if (k === 'perLen' || k === 'marks') ul[k] = String(v == null ? RULE_DEF.under[k] : v); else if (k === 'ded') ul[k] = num(v) > 0 ? num(v) : '';
    else if (k === 'lengths') ul[k] = RULE_DEF.under.lengths.slice(); else if (v !== '' && v != null && isFinite(num(v))) ul[k] = num(v); });
    if (!String(ul.marks).trim()) ul.marks = RULE_DEF.under.marks; E.setRules({ under:ul }); }
  if (r.merivo) { var ml = {}; ['up', 'below', 'ded', 'shorter', 'topGap', 'depthPlus'].forEach(function (k) { var v = r.merivo[k]; if (v !== '' && v != null && isFinite(num(v))) ml[k] = num(v); });
    ml.perLen = String(r.merivo.perLen || ''); ml.marks = String(r.merivo.marks || '').trim() || RULE_DEF.merivo.marks; E.setRules({ merivo:ml }); if (!ml.perLen) E.R.merivo.perLen = ''; }
  E.setRules({ hinge:r.hinge, pins:r.pins, drills:{ top:drillList(r.drillsTop).length ? drillList(r.drillsTop) : drillList(RULE_DEF.drillsTop) }, runner:{ 'BLUM TANDEMBOX':{ facade:tb } } });
}
applyRules();
function normCab(c) {
  var d = { id:uid(), name:'', type:'PASTATOMOS', W:600, H:720, D:560, thick:18, cols:1, colW:[], dishwasher:false, dishWidth:600, legH:100, mat:{ carc:'', facade:'', back:'' }, edge:{ carc:'', facade:'' }, sections:[] };
  c = Object.assign(d, c); var base = cncFor(c.type), had = c.cnc || {};
  c.cnc = Object.assign(base, had);
  if (typeof had.tbFront === 'boolean') c.cnc.tbFront = had.tbFront ? S.settings.ops.tbFront : 'off';
  c.cnc.rails = Object.assign(base.rails, had.rails || {});
  c.extras = Array.isArray(c.extras) ? c.extras.filter(function (x) { return x && typeof x === 'object'; }) : [];
  c.worktop = Object.assign(wtDefault(), c.worktop && typeof c.worktop === 'object' ? c.worktop : {});
  c.cnc.joints = (c.cnc.joints && typeof c.cnc.joints === 'object') ? c.cnc.joints : {};
  c.sections = (c.sections || []).map(function (s) { return Object.assign(newSection(s.kind || 'doors'), s); });
  c.sections.forEach(function (s) { if (s.kind === 'doors' && !s.fridge && /^CARGO/i.test(s.hinge || '')) { s.kind = 'cargo'; s.cargoHw = s.hinge; s.hinge = 'BLUM LANKSTAI'; }   // cargo chosen as a door fitting (before it was its own kind)
    if (s.fridge && s.kind === 'doors') { s.doorSplit = 'h'; s.hinge = 'BE FURNITŪROS'; } else if (s.fridge) delete s.fridge; });
  c.vis = { L:!!(c.vis && c.vis.L), R:!!(c.vis && c.vis.R), B:!!(c.vis && c.vis.B) };
  c.leds = (Array.isArray(c.leds) ? c.leds : []).filter(function (l) { return l && /^(bottom|top|L|R)$/.test(l.at); }).map(function (l) {   // LED profile grooves
    return { at:l.at, side:l.side === 'out' ? 'out' : 'in', from:num(l.from) >= 0 && l.from !== '' && l.from != null ? num(l.from) : E.R.led.from, ends:l.ends === 'closed' ? 'closed' : 'open', w:num(l.w) > 0 ? num(l.w) : E.R.led.w, depth:num(l.depth) > 0 ? num(l.depth) : E.R.led.depth }; });   // visible sides / bottom: in the front material
  fixCols(c);
  if (c.kind === 'box') { E.boxDefaults(c); c.cnc.legs = false; c.cnc.feet = false; }
  if (c.kind === 'panel') { c.cnc.legs = false; c.cnc.feet = false; c.sections = []; c.cols = 1; c.pe = Object.assign({ e1:true, e2:true, e3:true, e4:true }, c.pe && typeof c.pe === 'object' ? c.pe : {}); }
  return c;
}
function sample() {   // first run: a realistic small project so the tool opens working
  var p = { app:'db-kurejas', v:1, id:uid(), name:'PAVYZDYS', cabinets:[] }; S.proj = p;
  var a = fromPreset(PRESETS[0]); a.name = 'Stalčiai'; p.cabinets.push(a);
  var b = fromPreset(PRESETS[2]); b.name = 'Kriauklė'; p.cabinets.push(b);
  var c = fromPreset(PRESETS[3]); c.name = 'Viršutinė'; p.cabinets.push(c);
  p.cabinets.forEach(function (k) { k.mat = { carc:'LMDP balta 18 (pavyzdys)', facade:'LMDP antracitas 18 (pavyzdys)', back:'LMDP balta 18 (pavyzdys)' }; k.edge = { carc:'ABS balta 0.8 (pavyzdys)', facade:'ABS antracitas 1 (pavyzdys)' }; });
  return p;
}
(function migrate() {   // older versions: a separate 'saved projects' list and one current project → one library
  if (store('dbKurejas.lib')) return;
  var l = [], seen = {};
  var add = function (p, when) { if (!p || !Array.isArray(p.cabinets)) return; p.id = p.id || uid(); if (seen[p.id]) return; seen[p.id] = 1; p.updated = p.updated || when || new Date().toISOString(); l.push(libRec(p)); };
  add(S.proj); (store('dbKurejas.projects') || []).forEach(function (r) { add(r.data, r.saved); });
  libSet(l);
})();
if (!S.proj || !Array.isArray(S.proj.cabinets)) { S.proj = null; S.home = true; }
else { S.proj.cabinets = S.proj.cabinets.map(normCab); S.home = false;
  var ui0 = store('dbKurejas.ui'); if (ui0 && ui0.id === S.proj.id) { if (['cab', 'room', 'res', 'drw', 'set'].indexOf(ui0.tab) >= 0) S.tab = ui0.tab; S.sel = Math.max(0, Math.min(S.proj.cabinets.length - 1, +ui0.sel || 0)); } }   // after a reload: the same tab and cabinet
/* ---- projects: every project is kept in the library and saved automatically; 'dbKurejas.current' is the open one */
function lib() { var l = store('dbKurejas.lib'); return Array.isArray(l) ? l : []; }
function libSet(l) { if (store('dbKurejas.lib', l) === false) saveFailed(); }
function libRec(p) { return { id:p.id, name:p.name || '', updated:p.updated || new Date().toISOString(), n:(p.cabinets || []).length, data:clone(p) }; }
var libTimer = null;
function libSave() { if (!S.proj || S.ro) return;   /* S.ro: someone else is editing this project (locks.js) — nothing is saved */
  var p = S.proj; libSet([libRec(p)].concat(lib().filter(function (r) { return r.id !== p.id; }))); }
/* ----------------------------------------------------------------- the cabinet library: cabinets kept for any project, in
   catalogues, found by search. A cabinet saved there stays linked (c.libId): its later edits update the library copy; cabinets
   taken from the library are free copies (c.libFrom only remembers where they came from) */
var CL_CATS = ['Apatinės', 'Pakabinamos', 'Aukštos', 'Spintos', 'Kita'];
function clib() { var l = store('dbKurejas.cablib'); if (!l || !Array.isArray(l.items)) l = { v:1, items:[], cats:CL_CATS.slice() }; if (!Array.isArray(l.cats)) l.cats = CL_CATS.slice(); return l; }
function clibSet(l) { if (store('dbKurejas.cablib', l) === false) saveFailed(); }
function clibClean(c) { var x = clone(c); delete x.id; delete x.libId; delete x.libFrom; return x; }
function clibCat(c) { if (c.kind === 'panel' || c.kind === 'box' || c.dishwasher) return 'Kita'; var k = cabKind(c); return k === 'PAKABINAMOS' ? 'Pakabinamos' : k === 'ŪKINĖ' ? 'Aukštos' : 'Apatinės'; }
function clibRec(c, it) { var now = new Date().toISOString(); it = it || { id:uid(), added:now, cat:clibCat(c) };
  return Object.assign(it, { name:c.name || typeName(c), W:num(c.dishwasher ? c.dishWidth : c.W), H:num(c.H), D:num(c.D), type:c.kind === 'panel' ? 'panel' : c.kind === 'box' ? 'box' : c.dishwasher ? 'dish' : cabKind(c), cab:clibClean(c), updated:now }); }
function clibAdd(c) { var l = clib(), it = clibRec(c); l.items.unshift(it); if (l.cats.indexOf(it.cat) < 0) l.cats.push(it.cat); clibSet(l); c.libId = it.id; return it; }
var clibTimer = null;
function clibSync() {   // linked cabinets: their library copies follow their edits
  if (!S.proj) return; var l = null, ch = false;
  S.proj.cabinets.forEach(function (c) { if (!c.libId) return; l = l || clib(); var it = l.items.filter(function (x) { return x.id === c.libId; })[0];
    if (!it) { delete c.libId; return; } var was = JSON.stringify(it.cab) + it.name; clibRec(c, it); if (JSON.stringify(it.cab) + it.name !== was) ch = true; });
  if (l && ch) clibSet(l);
}
function clibIcon(it) { return ico({ panel:'pPanel', box:'pBox', dish:'pDish', 'PAKABINAMOS':'pWall', 'ŪKINĖ':'pTall' }[it.type] || (it.cab && it.cab.sections && it.cab.sections.some(function (x) { return x.kind === 'drawers'; }) ? 'pDrawers' : 'pDoors')); }
function viewLib() {
  var l = clib(), q = String(S.libQ || '').trim().toLowerCase(), cat = S.libCat || '';
  var words = q.split(/\s+/).filter(Boolean), hay = function (it) { return [it.name, it.cat, typeName(it.cab || {}), fmt(it.W) + 'x' + fmt(it.H) + 'x' + fmt(it.D), fmt(it.W) + '×' + fmt(it.H) + '×' + fmt(it.D), it.cab && it.cab.mat ? [it.cab.mat.facade, it.cab.mat.carc].join(' ') : ''].join(' ').toLowerCase(); };
  var hit = l.items.filter(function (it) { var h = hay(it); return (!cat || it.cat === cat) && words.every(function (w) { return h.indexOf(w) >= 0; }); });
  var cnt = function (c0) { return l.items.filter(function (it) { return it.cat === c0; }).length; };
  var catOpts = function (sel) { return l.cats.map(function (c0) { return '<option value="' + esc(c0) + '"' + (c0 === sel ? ' selected' : '') + '>' + esc(c0) + '</option>'; }).join(''); };
  return '<div class="lib"><div class="libh"><h4>' + t('libT') + ' <span class="unit">· ' + l.items.length + '</span></h4>' +
    '<input id="lib-q" type="search" placeholder="' + esc(t('libQ')) + '" value="' + esc(S.libQ || '') + '" autocomplete="off" aria-label="' + esc(t('libQ')) + '"></div>' +
    '<div class="libcats" role="group" aria-label="' + esc(t('libCats')) + '"><button type="button" data-act="libcat" data-v="" class="' + (!cat ? 'on' : '') + '">' + t('libAll') + ' <i>' + l.items.length + '</i></button>' +
      l.cats.map(function (c0) { var n = cnt(c0); return '<span class="libcat' + (c0 === cat ? ' on' : '') + '"><button type="button" data-act="libcat" data-v="' + esc(c0) + '">' + esc(c0) + ' <i>' + n + '</i></button>' + (n ? '' : '<button type="button" class="x" data-act="libcatdel" data-v="' + esc(c0) + '" aria-label="' + esc(t('del')) + '">✕</button>') + '</span>'; }).join('') +
      '<span class="libnew"><input id="lib-newcat" type="text" placeholder="' + esc(t('libNewCat')) + '" autocomplete="off"><button type="button" class="btn ghost" data-act="libnewcat">＋</button></span></div>' +
    (l.items.length ? (hit.length ? '<div class="libgrid">' + hit.map(function (it) {
      return '<div class="libitem"><button type="button" class="preset" data-act="libadd" data-v="' + esc(it.id) + '" title="' + esc(t('libAddT')) + '">' + clibIcon(it) + '<b>' + esc(it.name) + '</b><small>' + fmt(it.W) + '×' + fmt(it.H) + '×' + fmt(it.D) + '</small></button>' +
        '<div class="libact"><select data-act-change="libmove" data-v="' + esc(it.id) + '" aria-label="' + esc(t('libMove')) + '">' + catOpts(it.cat) + '</select><button type="button" class="btn ghost danger" data-act="libdel" data-v="' + esc(it.id) + '" aria-label="' + esc(t('del')) + '">' + (S.confirm === 'libdel' + it.id ? esc(t('delSure')) : '✕') + '</button></div></div>'; }).join('') + '</div>'
      : '<p class="note">' + t('libNone') + '</p>') : '<p class="note">' + t('libEmpty') + '</p>') + '</div>';
}
/* ----------------------------------------------------------------- project versions
   Every project keeps its history: while it is being edited a version is kept about every 15 minutes (the last state of each
   quarter of an hour), and one more when another project is opened or the page is left. Kept: all of the last 2 days, then the
   last version of each day for half a year, and every version saved by hand with a name. Stored in this browser (IndexedDB, it
   holds far more than localStorage); with the cloud signed in, the history also goes to the workshop database (cloud.js). */
var VER = (function () {
  var db = null, timer = null, dirty = {}, H48 = 2 * 864e5, Q15 = 15 * 60000;
  function open() { return new Promise(function (res, rej) {
    if (db) return res(db); if (!window.indexedDB) return rej(new Error('no IndexedDB'));
    var r = indexedDB.open('dbKurejasVersions', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('p', { keyPath:'pid' }); };
    r.onsuccess = function () { db = r.result; res(db); }; r.onerror = function () { rej(r.error); }; }); }
  function get(pid) { return open().then(function (d) { return new Promise(function (res) {
    var q = d.transaction('p').objectStore('p').get(pid); q.onsuccess = function () { res(q.result && Array.isArray(q.result.list) ? q.result.list : []); }; q.onerror = function () { res([]); }; }); }).catch(function () { return []; }); }
  function put(pid, list) { return open().then(function (d) { return new Promise(function (res) {
    var tx = d.transaction('p', 'readwrite'); tx.objectStore('p').put({ pid:pid, list:list }); tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); }; }); }).catch(function () { return false; }); }
  function body(p) { var c = clone(p); delete c.updated; var str = JSON.stringify(c), h1 = 5381, h2 = 52711;   // a fingerprint: the same project → the same one
    for (var i = 0; i < str.length; i++) { var ch = str.charCodeAt(i); h1 = (h1 * 33) ^ ch; h2 = (h2 * 33) ^ ch; } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + str.length; }
  function prune(list) {   // newest first
    var now = Date.now(), keep = [], days = {}, recent = 0;
    list.forEach(function (v) { var age = now - v.at;
      if (v.label) { keep.push(v); return; }
      if (age < H48) { if (recent++ < 100) keep.push(v); return; }
      if (age > 183 * 864e5) return;
      var d = new Date(v.at).toDateString(); if (!days[d]) { days[d] = 1; keep.push(v); } });
    return keep;
  }
  /* a version of project p: auto (rolling, one per quarter of an hour) or named by hand */
  function snap(p, label, why) {
    if (!p || !p.id || !(p.cabinets || []).length && !label) return Promise.resolve(null);
    var data = clone(p), bd = body(p);
    return get(p.id).then(function (list) {
      var top = list[0];
      if (!label && top && top.body === bd) return null;   // nothing changed since the last one
      var v = { at:Date.now(), label:label || '', why:why || '', name:p.name || '', n:(p.cabinets || []).length, data:data, body:bd };
      if (!label && top && !top.label && !top.why && !why && v.at - top.started < Q15) { v.started = top.started; list[0] = v; }   // still the same quarter of an hour
      else { v.started = v.at; list.unshift(v); }
      list = prune(list);
      return put(p.id, list).then(function () { if (window.BuilderCloud && window.BuilderCloud.verPush) window.BuilderCloud.verPush(p.id, list); return v; });
    });
  }
  function touched() { if (!S.proj) return; dirty[S.proj.id] = 1; clearTimeout(timer); timer = setTimeout(function () { flush(); }, 60000); }   // a minute after editing stops
  function flush(why) { if (!S.proj || !dirty[S.proj.id]) return Promise.resolve(null); delete dirty[S.proj.id]; clearTimeout(timer); return snap(S.proj, '', why); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
  window.addEventListener('pagehide', function () { flush(); });
  /* the list with the cloud's versions added (from other computers) */
  function all(pid) {
    var cl = window.BuilderCloud && window.BuilderCloud.verPull ? window.BuilderCloud.verPull(pid).catch(function () { return []; }) : Promise.resolve([]);
    return Promise.all([get(pid), cl]).then(function (r) {
      var local = r[0], seen = {}, out = [];
      local.concat((r[1] || []).map(function (v) { return Object.assign({}, v, { cloud:true }); })).forEach(function (v) {
        var k = Math.round(v.at / 1000); if (seen[k] || !v.data) return; seen[k] = 1; out.push(v); });
      return out.sort(function (a, b) { return b.at - a.at; });
    });
  }
  return { snap:snap, touched:touched, flush:flush, all:all, get:get, put:put };
})();
/* the versions window: over the page, its own clicks; restore (the current state is kept as a version first) or open as a copy */
var VD = { pid:null, list:null, sure:null, busy:false };
function verOpen(pid) { VD.pid = pid; VD.list = null; VD.sure = null; verPaint();
  var go = function () { VER.all(pid).then(function (l) { if (VD.pid !== pid) return; VD.list = l; verPaint(); }); };
  if (S.proj && S.proj.id === pid) VER.flush().then(go, go); else go(); }
function verClose() { VD.pid = null; var el = document.getElementById('verdlg'); if (el) el.remove(); }
function verRec(pid) { if (S.proj && S.proj.id === pid) return { data:S.proj, name:S.proj.name }; var r = lib().filter(function (x) { return x.id === pid; })[0]; return r ? { data:r.data, name:r.name } : null; }
function verPaint() {
  var el = document.getElementById('verdlg');
  if (!VD.pid) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'verdlg'; el.className = 'drwover verover'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el);
    el.addEventListener('click', verClick); el.addEventListener('keydown', function (e) { if (e.key === 'Escape') verClose(); if (e.key === 'Enter' && e.target.id === 'ver-label') verClick({ target:el.querySelector('[data-vact=save]') }); }); }
  var rec = verRec(VD.pid), pad = function (n) { return (n < 10 ? '0' : '') + n; }, cur0 = rec ? JSON.stringify(Object.assign({}, rec.data, { updated:null })) : '';
  var dayOf = function (at) { var d = new Date(at), n = new Date(), y = new Date(Date.now() - 864e5);
    return d.toDateString() === n.toDateString() ? t('verToday') : d.toDateString() === y.toDateString() ? t('verYest') : d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var h = '<div class="drwbox verbox" data-stop="1"><div class="drwbar"><b>🕘 ' + t('verT') + ' — ' + esc(rec && rec.name || t('noName')) + '</b><button type="button" class="btn ghost" data-vact="close" aria-label="' + esc(t('close')) + '">✕</button></div><div class="verbody">' +
    (S.proj && S.proj.id === VD.pid ? '<div class="row" style="gap:8px;align-items:flex-end;margin-bottom:10px"><label class="f grow" for="ver-label"><span>' + t('verName') + '</span><input id="ver-label" type="text" maxlength="60" placeholder="' + esc(t('verNamePh')) + '" autocomplete="off"></label><button type="button" class="btn pri" data-vact="save">＋ ' + t('verSave') + '</button></div>' : '') +
    '<p class="note" style="margin:0 0 10px">' + t('verNote') + '</p>';
  if (!VD.list) h += '<p class="note">…</p>';
  else if (!VD.list.length) h += '<p class="note empty">' + t('verNone') + '</p>';
  else { var lastDay = '';
    h += '<div class="verlist">' + VD.list.map(function (v, i) {
      var d = new Date(v.at), day = dayOf(v.at), head = day !== lastDay ? '<div class="verday">' + day + '</div>' : ''; lastDay = day;
      var same = JSON.stringify(Object.assign({}, v.data, { updated:null })) === cur0, sure = VD.sure === i;
      return head + '<div class="verrow' + (same ? ' cur' : '') + '"><span class="vt">' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '</span><span class="vl">' +
        (v.label ? '<b>' + esc(v.label) + '</b> ' : v.why ? '<i>' + esc(v.why) + '</i> ' : '') + '<span class="unit">' + v.n + ' ' + t('cabsN') + (v.name && rec && v.name !== rec.name ? ' · „' + esc(v.name) + '“' : '') + (v.cloud ? ' · ☁' : '') + '</span>' + (same ? ' <span class="badge ok">' + t('verSame') + '</span>' : '') + '</span>' +
        '<span class="va"><button type="button" class="btn ghost" data-vact="copy" data-i="' + i + '" title="' + esc(t('verCopyT')) + '">' + t('verCopy') + '</button>' +
        (same ? '' : '<button type="button" class="btn' + (sure ? ' danger' : '') + '" data-vact="restore" data-i="' + i + '">' + (sure ? t('verSure') : t('verRestore')) + '</button>') + '</span></div>';
    }).join('') + '</div>'; }
  el.innerHTML = h + '</div></div>';
  var lb = el.querySelector('#ver-label'); if (lb && !VD.list) lb.focus();
}
function verClick(e) {
  var tEl = e.target && e.target.closest ? e.target.closest('[data-vact]') : null, el = document.getElementById('verdlg');
  if (!tEl) { if (e.target === el) verClose(); return; }
  var a = tEl.getAttribute('data-vact'), v = VD.list && VD.list[+tEl.getAttribute('data-i')];
  if (a === 'close') return verClose();
  if (a === 'save') { var inp = el.querySelector('#ver-label'), nm0 = (inp && inp.value || '').trim() || t('verHand');
    VER.snap(S.proj, nm0).then(function () { toast(t('verSaved')); verOpen(VD.pid); }); return; }
  if (!v) return;
  if (a === 'copy') { var cp = clone(v.data), d = new Date(v.at); cp.id = uid(); var p2 = function (n) { return (n < 10 ? '0' : '') + n; }; cp.name = (cp.name || t('noName')) + ' (' + d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ')'; cp.updated = new Date().toISOString();
    if (!cp.look && verRec(VD.pid) && verRec(VD.pid).data.look) cp.look = clone(verRec(VD.pid).data.look);
    libSet([libRec(cp)].concat(lib())); toast(t('verCopied')); if (S.home) render(); return; }
  if (a === 'restore') {
    if (VD.sure !== +tEl.getAttribute('data-i')) { VD.sure = +tEl.getAttribute('data-i'); verPaint(); return; }
    var pid = VD.pid, isOpen = S.proj && S.proj.id === pid, before = verRec(pid);
    VER.snap(before.data, '', t('verBefore')).then(function () {
      var np = clone(v.data); np.id = pid; np.updated = new Date().toISOString(); if (!np.look && before.data.look) np.look = clone(before.data.look);   // a version from the cloud has no photos of the materials: keep today's
      if (isOpen) { var tab0 = S.tab; openProject(np); S.tab = tab0; libSave(); }
      else libSet([libRec(np)].concat(lib().filter(function (r) { return r.id !== pid; })));
      toast(t('verDone')); verClose(); render(); });
  }
}
function save() {
  if (!S.proj) return;
  if (S.ro) { S.roDirty = true; return; }   // view only / not yet confirmed that nobody else edits it (locks.js)
  VER.touched();
  clearTimeout(clibTimer); clibTimer = setTimeout(clibSync, 300);
  if (S.tab !== 'room' && S.roomUndo && S.roomUndo.length) S.roomUndo = [];   // the Baldai undo steps back only through Baldai actions, never over edits made elsewhere
  S.proj.updated = new Date().toISOString();
  if (store('dbKurejas.current', S.proj) === false) { saveFailed(); return; }
  clearTimeout(libTimer); libTimer = setTimeout(libSave, 250);
  var sv = document.getElementById('saved'); if (sv) { sv.classList.remove('flash'); void sv.offsetWidth; sv.classList.add('flash'); }
}
function openProject(p) {
  S.proj = clone(p); S.proj.id = S.proj.id || uid(); S.proj.cabinets = (S.proj.cabinets || []).map(normCab);
  if (S.proj.look && typeof S.proj.look === 'object') { var lk = {}; Object.keys(S.proj.look).forEach(function (k) { var l = S.proj.look[k], o = {}; if (!l || typeof l !== 'object') return;   // a look is a photo (data:image) or a colour, nothing else
      if (typeof l.tex === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(l.tex)) o.tex = l.tex; if (/^#[0-9a-f]{6}$/i.test(l.color || '')) o.color = l.color; if (num(l.mm) > 0) o.mm = num(l.mm); if (l.rot) o.rot = true;
      if (o.tex || o.color) lk[k] = o; }); S.proj.look = lk; } else delete S.proj.look;
  S.home = false; S.tab = 'cab'; S.sel = 0; S.part = null; S.iso = null; S.undo = []; S.roomUndo = []; S.roomSel = null; S.roomSelId = null; S.picking = !S.proj.cabinets.length; S.confirm = null;
  store('dbKurejas.current', S.proj); window.scrollTo(0, 0);
}
function newProject(name) { openProject({ app:'db-kurejas', v:1, id:uid(), name:name, cabinets:[], updated:new Date().toISOString() }); libSave(); }
(function () { var tp = store('dbKurejas.reportTpl'); if (tp && tp.b64) { S.tplB64 = tp.b64; S.tplName = tp.name; } })();
function b64ToBytes(b64) { var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function bytesToB64(u) { var s = '', CH = 0x8000; for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH)); return btoa(s); }
function loadTemplateFile(file) {
  if (!file) return;
  var rd = new FileReader();
  rd.onload = function () {
    var u = new Uint8Array(rd.result);
    if (!window.JSZip) { toast(t('rptFallback'), true); return; }
    window.JSZip.loadAsync(u).then(function (z) { return z.file('xl/workbook.xml').async('string'); }).then(function (wb) {
      if (!/name="PARTLIST"/.test(wb) || !/name="LABEL"/.test(wb)) { toast(t('tplBad'), true); return; }
      S.tplB64 = bytesToB64(u); S.tplName = file.name;
      var ok = true; try { localStorage.setItem('dbKurejas.reportTpl', JSON.stringify({ name:file.name, b64:S.tplB64 })); } catch (e) { ok = false; }
      toast(ok ? t('tplOk') : t('tplSession')); render();
    }).catch(function () { toast(t('tplBad'), true); });
  };
  rd.readAsArrayBuffer(file);
}
function cur() { return S.proj ? S.proj.cabinets[S.sel] : null; }

/* ----------------------------------------------------------------- engine bridge */
function projName() { var n = E.safeName(S.proj.name || 'PROJEKTAS'); return /[A-Za-z0-9]/.test(n) ? n : 'PROJEKTAS_' + String(S.proj.id || '').replace(/[^A-Za-z0-9]/g, '').slice(-4); }   // names with no plain letters still give the programs a distinct prefix
function engineDef(c) {
  var d = clone(c);
  ['W', 'H', 'D', 'thick', 'dishWidth', 'legH'].forEach(function (k) { d[k] = num(d[k]); });
  if (d.dishwasher) d.W = d.dishWidth || d.W;
  if (c.hang === true && !d.dishwasher) { d.cnc.legs = false; d.cnc.feet = false; }   // hung on the wall (set in Baldai): no legs, whatever the type default said
  d.cnc.facadeT = num(d.cnc.facadeT) || 18;
  if (d.shelfSb != null && String(d.shelfSb).trim() !== '') d.shelfSb = Math.abs(num(String(d.shelfSb).replace(/[−–]/g, '-')) || 0); else delete d.shelfSb;   // "-5" or "5": 5 mm back
  d.sections.forEach(function (s) { ['height', 'nDrawers', 'rail', 'nDoors', 'shelves'].forEach(function (k) { s[k] = num(s[k]); }); s.shelfPos = (s.shelfPos || []).map(num); });
  d.cols = colsOf(c); d.colW = d.cols > 1 ? colWidths(c) : [];
  if (d.kind === 'box' && d.box) {
    Object.keys(d.box.boards || {}).forEach(function (k) { var b = d.box.boards[k]; b.inset = num(b.inset) || 0; b.T = num(b.T) || ''; });
    (d.box.inner || []).forEach(function (q) { ['x', 'z', 'col', 'setback'].forEach(function (k) { if (q[k] != null) q[k] = num(q[k]); }); q.T = num(q.T) || ''; });
  }
  return d;
}
function buildOne(i) {
  var c = S.proj.cabinets[i], r = E.buildCabinet(engineDef(c), i, projName());
  var w = r.warnings.slice(), nProg = 0;
  r.panels.forEach(function (p) { var pr = E.programs(p); nProg += pr.files.length; pr.warnings.forEach(function (x) { var m = p.short + ': ' + (x.indexOf(p.name + ': ') === 0 ? x.slice(p.name.length + 2) : x); if (w.indexOf(m) < 0) w.push(m); }); });
  return { r:r, warnings:dedupe(w), nProg:nProg };
}
function dedupe(list) {   // the same note on several panels → one line with the panel names
  var m = {}, order = [];
  list.forEach(function (x) { var k = x.replace(/^[^:]+: /, ''); var who = x === k ? '' : x.slice(0, x.length - k.length - 2); if (!m[k]) { m[k] = []; order.push(k); } if (who && m[k].indexOf(who) < 0) m[k].push(who); });
  return order.map(function (k) { return (m[k].length ? m[k].join(', ') + ': ' : '') + k; });
}
function level(w) {   // bad: something asked for is not made or not drilled right; warn: made, but check it; info: for the record
  if (/kiekis 0 — nepridėta|turi likti bent/i.test(w)) return 'warn';
  if (/NEPROGRAMUOTA|didesnė už|netinkami|praleista|nepalaikom|nepridėt|ne prie šono|negali būti gręžiamos|netelpa|nesurištas|persidengia|susitinka|nepritvirtinta|per maž|ilgesnis nei telpa|nepakanka vietos|nepavyko|per gili|per daug stalčių|uždaro konstrukciją|per arti viena kitos|šone nėra plokštės|gylio, yra/i.test(w)) return 'bad';
  if (/NEPATIKRINTA|nepatikrintos|patikrinti|perkeltas|patikrinkite|šablono nėra|patenka į|prispaudimą|kertasi|pastumt|padalinti po lygiai|apatinis fasadas|pridėtos tik|tinka 16|nenurodyta|etiketėje telpa/i.test(w)) return 'warn';
  return 'info';
}
function buildProjectAll() {
  var loose = [], xWarn = [];
  S.proj.cabinets.forEach(function (c, i) { (c.extras || []).forEach(function (x) {
    var xn = '„' + (i + 1) + '-' + (x.name || 'DETALE') + '“';
    if (!(num(x.L) > 0 && num(x.W) > 0)) { xWarn.push(xn + ': papildoma detalė be ilgio ar pločio — nepridėta, įrašykite matmenis'); return; }
    if (x.qty !== '' && x.qty != null && !(num(x.qty) > 0)) { xWarn.push(xn + ': kiekis 0 — nepridėta'); return; }
    var em = x.edgeMat || (x.mat && x.mat === c.mat.facade ? c.edge.facade : c.edge.carc) || '';
    loose.push({ name:x.name || 'DETALE', cab:i + 1, mat:x.mat || c.mat.carc || '', L:num(x.L), W:num(x.W), T:num(x.T) || num(c.thick) || 18, qty:Math.max(1, Math.round(num(x.qty) || 1)),
                 eb:{ eb1:x.e1 ? em : '', eb2:x.e2 ? em : '', eb3:x.e3 ? em : '', eb4:x.e4 ? em : '' } });
  }); });
  var wp = worktopPieces(); wp.pieces.forEach(function (q) { loose.push(q); });
  var res = X.buildProject({ cabinets:S.proj.cabinets.map(function (c, i) { return { nr:i + 1, def:engineDef(c) }; }), loose:loose }, { project:projName(), date:new Date().toISOString().slice(0, 10) });
  wp.warnings.concat(xWarn).forEach(function (w) { if (res.warnings.indexOf(w) < 0) res.warnings.push(w); });
  return res;
}
/* worktop pieces to cut: one per cabinet, joined into one piece where cabinets stand side by side on a wall in the Furniture tab
   (same material, thickness, edge, front line and height, the worktops meeting end to end) */
var WT_MAX = 4100;   // usual worktop board length
function worktopPieces() {
  var RMx = window.DBRoom; if (RMx && RMx.ensure && S.proj.cabinets.some(function (c) { return E.worktopOf(c); }) && RMx.ensure(S.proj)) save();   // joining needs the cabinets' places: the same automatic layout the Baldai tab makes
  var list = [], warnings = [], L = S.proj.layout;
  S.proj.cabinets.forEach(function (c, i) { var wt = E.worktopOf(c); if (wt) list.push({ c:c, nr:i + 1, wt:wt }); });
  var byId = {}; if (L && RMx && L.items) RMx.placed(S.proj).forEach(function (o) { byId[o.c.id] = o; });
  var groups = [], used = {};
  list.forEach(function (x) { var o = byId[x.c.id]; if (o) { x.wall = o.it.wall; x.a0 = o.it.x + x.wt.x0; x.a1 = o.it.x + x.wt.x1; x.top = RMx.z0Of(x.c, o.it, L) + x.wt.z0; x.front = RMx.cabD(x.c) - x.wt.y0; } });
  var same = function (a, b) { return a.wall === b.wall && a.wt.mat === b.wt.mat && Math.abs(a.wt.T - b.wt.T) < 0.01 && a.wt.edge === b.wt.edge && Math.abs(a.front - b.front) < 0.6 && Math.abs(a.top - b.top) < 0.6 && Math.abs(a.a1 - b.a0) < 0.6; };
  var placedL = list.filter(function (x) { return x.wall != null; }).sort(function (a, b) { return a.wall - b.wall || a.a0 - b.a0; });
  placedL.forEach(function (x) { if (used[x.nr]) return; var g = [x]; used[x.nr] = 1;
    for (var go = true; go;) { go = false; var lastX = g[g.length - 1]; placedL.forEach(function (y) { if (!go && !used[y.nr] && same(lastX, y)) { g.push(y); used[y.nr] = 1; go = true; } }); }
    groups.push(g); });
  list.forEach(function (x) { if (!used[x.nr]) groups.push([x]); });
  groups.sort(function (a, b) { return a[0].nr - b[0].nr; });
  /* corners: a worktop on the next wall butts against the one that runs into the corner — it is cut shorter by the overlap */
  var trim = {};
  if (L && RMx && RMx.geo) { var G = RMx.geo(L), rect = function (g) { var f = g[0], l = g[g.length - 1], gw = G[f.wall], pts = [];
      [f.a0, l.a1].forEach(function (a) { [0, f.front].forEach(function (bb) { pts.push([gw.P[0] + gw.d[0] * a + gw.n[0] * bb, gw.P[1] + gw.d[1] * a + gw.n[1] * bb]); }); });
      return [[Math.min.apply(null, pts.map(function (q) { return q[0]; })), Math.max.apply(null, pts.map(function (q) { return q[0]; }))], [Math.min.apply(null, pts.map(function (q) { return q[1]; })), Math.max.apply(null, pts.map(function (q) { return q[1]; }))]]; };
    var pl = groups.filter(function (g) { return g[0].wall != null; });
    pl.forEach(function (g) { pl.forEach(function (h) {
      if (g === h || g[0].wall >= h[0].wall || Math.abs(g[0].top - h[0].top) > 1) return;
      var A = rect(g), Bq = rect(h), ix = [Math.max(A[0][0], Bq[0][0]), Math.min(A[0][1], Bq[0][1])], iy = [Math.max(A[1][0], Bq[1][0]), Math.min(A[1][1], Bq[1][1])];
      if (ix[1] - ix[0] < 1 || iy[1] - iy[0] < 1) return;
      var gw = G[h[0].wall], along = Math.abs(gw.d[0]) > 0.5 ? ix[1] - ix[0] : iy[1] - iy[0], mid = [(ix[0] + ix[1]) / 2, (iy[0] + iy[1]) / 2];
      var aMid = (mid[0] - gw.P[0]) * gw.d[0] + (mid[1] - gw.P[1]) * gw.d[1], atStart = Math.abs(aMid - h[0].a0) < Math.abs(aMid - h[h.length - 1].a1);
      var k = h[0].nr; trim[k] = trim[k] || { s:0, e:0 }; if (atStart) trim[k].s = Math.max(trim[k].s, along); else trim[k].e = Math.max(trim[k].e, along);
      warnings.push('„' + h[0].nr + '-STALVIRSIS“ kampe susiduria su „' + g[0].nr + '-STALVIRSIS“ — sutrumpintas ' + E.num(Math.round(along)) + ' mm (' + (atStart ? 'pradžioje' : 'gale') + '), patikrinkite sujungimą');
    }); }); }
  var pieces = groups.map(function (g) {
    var first = g[0], last = g[g.length - 1], wt = first.wt, tr = trim[first.nr] || { s:0, e:0 }, Lp = (first.wall != null ? last.a1 - first.a0 : wt.L) - tr.s - tr.e, em = wt.edge;
    var nrs = g.map(function (x) { return x.nr; }), name = 'STALVIRSIS' + (g.length > 1 ? '_' + nrs.join('-') : '');
    if (Lp > WT_MAX + 0.5) warnings.push('„' + first.nr + '-' + name.replace(/_/g, '-') + '“: stalviršis ' + E.num(Math.round(Lp)) + ' mm ilgesnis nei ' + WT_MAX + ' — patikrinkite plokštės ilgį arba numatykite sujungimą');
    return { name:name, cab:first.nr, ids:g.map(function (x) { return x.c.id; }), mat:wt.mat, L:Lp, W:wt.W, T:wt.T, qty:1, worktop:true,
             eb:{ eb1:em || '', eb2:'', eb3:em && first.wt.left > 0 && !tr.s ? em : '', eb4:em && last.wt.right > 0 && !tr.e ? em : '' } };
  });
  return { pieces:pieces, warnings:warnings };
}

/* ----------------------------------------------------------------- icons (simple line pictograms) */
function ico(kind) {
  var st = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"';
  var box = '<rect x="8" y="6" width="38" height="42" rx="1.5" ' + st + '/>';
  var hd = function (y) { return '<line x1="22" y1="' + y + '" x2="32" y2="' + y + '" ' + st + '/>'; };
  var m = {
    pDrawers:box + '<line x1="8" y1="20" x2="46" y2="20" ' + st + '/><line x1="8" y1="34" x2="46" y2="34" ' + st + '/>' + hd(13) + hd(27) + hd(41),
    pDoors:box + '<line x1="27" y1="6" x2="27" y2="48" ' + st + '/><line x1="23" y1="22" x2="23" y2="32" ' + st + '/><line x1="31" y1="22" x2="31" y2="32" ' + st + '/>',
    pDrDoors:box + '<line x1="8" y1="17" x2="46" y2="17" ' + st + '/><line x1="27" y1="17" x2="27" y2="48" ' + st + '/>' + hd(11.5),
    pWall:'<rect x="8" y="10" width="38" height="28" rx="1.5" ' + st + '/><line x1="27" y1="10" x2="27" y2="38" ' + st + '/><line x1="4" y1="6" x2="50" y2="6" ' + st + ' stroke-dasharray="3 3"/>',
    pTall:'<rect x="15" y="2" width="24" height="50" rx="1.5" ' + st + '/><rect x="18" y="20" width="18" height="14" ' + st + '/><line x1="15" y1="38" x2="39" y2="38" ' + st + '/><line x1="15" y1="45" x2="39" y2="45" ' + st + '/>',
    pFridge:'<rect x="15" y="2" width="24" height="50" rx="1.5" ' + st + '/><line x1="15" y1="10" x2="39" y2="10" ' + st + '/><line x1="15" y1="35" x2="39" y2="35" ' + st + '/><line x1="35" y1="16" x2="35" y2="29" ' + st + '/><line x1="35" y1="39" x2="35" y2="46" ' + st + '/><path d="M20 21 l2.5 2.5 M22.5 21 l-2.5 2.5 M21.25 20.5 v3.5" ' + st + ' stroke-width="1"/>',
    pDish:box + '<line x1="14" y1="12" x2="40" y2="12" ' + st + '/><circle cx="18" cy="9" r="0.5" ' + st + '/>',
    pEmpty:box + '<line x1="8" y1="20" x2="46" y2="20" ' + st + '/><line x1="8" y1="34" x2="46" y2="34" ' + st + '/>',
    pBox:'<path d="M8 17 L27 8 L46 17 L46 39 L27 48 L8 39 Z" ' + st + '/><path d="M8 17 L27 26 L46 17 M27 26 L27 48" ' + st + '/><path d="M17 21.5 L17 43.5" ' + st + ' stroke-dasharray="3 3"/>',
    pPanel:'<path d="M20 6 L30 2 L30 48 L20 52 Z" ' + st + '/><path d="M20 6 L24 4.5 L24 50.5" ' + st + '/><line x1="10" y1="52" x2="44" y2="52" ' + st + ' stroke-dasharray="3 3"/>',
    conf:'<rect x="4" y="22" width="36" height="9" ' + st + '/><rect x="31" y="4" width="9" height="36" ' + st + '/><line x1="35.5" y1="2" x2="35.5" y2="30" stroke="currentColor" stroke-width="3"/>',
    cam:'<rect x="4" y="22" width="36" height="9" ' + st + '/><rect x="31" y="4" width="9" height="36" ' + st + '/><circle cx="35.5" cy="26.5" r="5" ' + st + '/><line x1="14" y1="26.5" x2="31" y2="26.5" stroke="currentColor" stroke-width="2.5"/>'
  };
  return '<svg viewBox="0 0 54 54" aria-hidden="true">' + (m[kind] || '') + '</svg>';
}

/* ----------------------------------------------------------------- render: shell */
var app = document.getElementById('app');
if (window.DBLook) window.DBLook.on(function () {   // a texture photo is decoded: draw again (only the 3-D views while someone types)
  var ae = document.activeElement; if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.type !== 'file' && ae.type !== 'color') { mountAssembly(); if (S.tab === 'room') mountRoom(); } else render(); });
function langBtns() { return '<span class="lang"><button data-act="lang" data-v="lt" class="' + (S.lang === 'lt' ? 'on' : '') + '">LT</button><button data-act="lang" data-v="en" class="' + (S.lang === 'en' ? 'on' : '') + '">EN</button></span>'; }
/* long explanations in the editor: two lines, a click shows the rest (remembered while the page is open) */
function clampNotes() {
  S.notesOpen = S.notesOpen || {};
  document.querySelectorAll('.editor p.note, .editor p.lead').forEach(function (p) {
    var tx = p.textContent || ''; if (tx.length < 150 || p.querySelector('input,button,select,a')) return;
    p.classList.add('clamp'); var k = tx.slice(0, 60); if (S.notesOpen[k]) p.classList.add('open');
    p.title = S.lang === 'lt' ? 'Spustelėkite — visas tekstas' : 'Click for the whole text';
    p.addEventListener('click', function () { p.classList.toggle('open'); S.notesOpen[k] = p.classList.contains('open'); });
  });
}
function render() {
  if (typeof ptr !== 'undefined') ptr.pending = null;   // this redraw is the one that was waiting
  if (!S.proj) S.home = true;
  if (S.home) {
    app.innerHTML = '<header class="top"><div class="wrap"><div class="brand"><div class="logo"><span class="dbl" role="img" aria-label="Dėdės Baldai"></span></div><div><h1>' + t('app') + '</h1><div class="sub">' + t('sub') + '</div></div></div>' +
      '<div class="hbtns">' + langBtns() + '</div></div></header><main class="wrap">' + viewHome() + '</main>';
    if (S.focusNew) { S.focusNew = false; var nf = document.getElementById('np-name'); if (nf) { nf.focus(); nf.select(); } }
    return;
  }
  if (!(S.sel >= 0 && S.sel < S.proj.cabinets.length)) S.sel = Math.max(0, S.proj.cabinets.length - 1);   // never point past the list (after an undo elsewhere)
  if (window.DBLook) window.DBLook.set(S.proj.look);
  var pj = null, cabInfo = S.proj.cabinets.map(function (c, i) { return buildOne(i); });
  cabInfo.forEach(function (inf, i) {   // a plinth fitted by its gaps: its row's length and height as the cabinet makes them
    var pl = inf && inf.r && inf.r.visual && inf.r.visual.plinth, c = S.proj.cabinets[i], k = pl && pl.fit ? plinthIdx(c) : -1; if (k < 0) return;
    var x = c.extras[k], L = Math.round((pl.x1 - pl.x0) * 10) / 10, H = Math.round((pl.z1 - pl.z0) * 10) / 10; if (Math.abs(+x.L - L) > 0.05 || Math.abs(+x.W - H) > 0.05) { x.L = L; x.W = H; } });
  try { localStorage.setItem('dbKurejas.ui', JSON.stringify({ id:S.proj.id, tab:S.tab, sel:S.sel })); } catch (er) {}
  S._info = cabInfo;
  var nParts = partCount(cabInfo);
  var h = '<header class="top"><div class="wrap">' +
    '<button class="brand brandbtn" data-act="home" title="' + t('toHome') + '"><div class="logo"><span class="dbl" role="img" aria-label="Dėdės Baldai"></span></div><div><h1>' + t('app') + '</h1><div class="sub">' + t('sub') + '</div></div></button>' +
    '<button class="btn projbtn" data-act="home" title="' + t('toHome') + '">☰ ' + t('projects') + '</button>' +
    '<label class="projname"><span class="unit">' + t('project') + '</span><input id="projname" type="text" data-bind="p.name" value="' + esc(S.proj.name) + '" placeholder="' + t('projPh') + '" autocomplete="off"' + (S.proj.name ? '' : ' aria-invalid="true"') + '><span class="saved" id="saved" title="' + t('autosaveT') + '">✓ ' + t('autosaved') + '</span><button type="button" class="btn ghost verbtn" data-act="pver" title="' + esc(t('verT')) + '">🕘 ' + t('verBtn') + '</button></label>' +
    '<nav class="tabs" aria-label="tabs">' +
      tabBtn('cab', t('tCab'), S.proj.cabinets.length) + tabBtn('room', t('tRoom')) + tabBtn('res', t('tRes'), nParts) + tabBtn('nest', t('tNest'), nestCount()) + tabBtn('drw', t('tDrw')) + tabBtn('set', t('tSet')) + '</nav>' +
    '<div class="hbtns">' + (S.admin ? '<button class="btn adminbadge" data-act="tab" data-v="set" title="' + (S.lang === 'lt' ? 'Administratoriaus režimas — kainos matomos' : 'Admin mode — prices shown') + '">€ Admin</button>' : '') + '<button class="btn newbtn" data-act="pnew" title="' + esc(t('prNew2')) + '">＋<span class="nlbl"> ' + t('prNew2') + '</span></button>' + langBtns() + '</div>' +
    '</div></header><main class="wrap">';
  if (S.tab === 'cab') h += viewCab(cabInfo);
  else if (S.tab === 'res') h += viewRes(buildProjectAll());
  else if (S.tab === 'room') h += roomChecks(cabInfo) + '<div class="room" id="room"></div>' + (S.jcheck && cur() && cabInfo[S.sel] ? jcModal(cur(), cabInfo[S.sel]) : S.echeck && cur() && cabInfo[S.sel] ? ecModal(cur(), cabInfo[S.sel]) : '');
  else if (S.tab === 'drw') h += viewDrw();
  else if (S.tab === 'nest') h += viewNest();
  else h += viewSet();
  h += '</main><datalist id="dl-mat">' + listOpts('mat') + '</datalist><datalist id="dl-edge">' + listOpts('edge') + '</datalist><datalist id="dl-wt">' + listOpts('wt') + '</datalist>';
  var fx = document.activeElement && document.activeElement.id, ss = fx && document.activeElement.selectionStart;
  app.innerHTML = h;
  mountIso(); mountRoom(); mountAssembly(); mountJc();
  clampNotes();
  if (fx) { var el = document.getElementById(fx); if (el) { el.focus(); try { if (ss != null) el.setSelectionRange(ss, ss); } catch (e) {} } }
}
var NEST_TIMER = null;
function nestCount() {   // the boards badge on the tab; away from the tab it is worked out a moment after editing stops
  var sum = function (pl) { return pl.reduce(function (a, m) { return a + m.sheets.length; }, 0); };
  try { if (S.tab === 'nest') return sum(nestPlan(buildProjectAll())); } catch (e) { return null; }
  clearTimeout(NEST_TIMER);
  NEST_TIMER = setTimeout(function () { try { var n = sum(nestPlan(buildProjectAll())), b = document.querySelector('[data-act=tab][data-v=nest]'); if (!b) return;
    var c = b.querySelector('.cnt'); if (!c) { c = document.createElement('span'); c.className = 'cnt'; b.appendChild(c); } c.textContent = n; } catch (e) {} }, 450);
  return NEST_CACHE.val ? sum(NEST_CACHE.val) : null;
}
function partCount(info) {   // rows of the parts list: the cabinets' parts, extra parts that are made, worktop pieces as cut
  return info.reduce(function (a, x) { return a + (x && x.r ? x.r.panels.length : 0); }, 0) + S.proj.cabinets.reduce(function (a, c) {
    return a + (c.extras || []).filter(function (x) { return num(x.L) > 0 && num(x.W) > 0 && !(x.qty !== '' && x.qty != null && !(num(x.qty) > 0)); }).length; }, 0) + worktopPieces().pieces.length;
}
function tabBtn(k, label, cnt) { return '<button data-act="tab" data-v="' + k + '" class="' + (S.tab === k ? 'on' : '') + '">' + label + (cnt != null ? '<span class="cnt">' + cnt + '</span>' : '') + '</button>'; }
function listOpts(kind) {
  var set = {}, add = function (v) { if (v) set[v] = 1; };
  (kind === 'mat' ? S.settings.materials : kind === 'wt' ? S.settings.worktops || [] : S.settings.edges).forEach(add);
  S.proj.cabinets.forEach(function (c) { if (kind === 'wt') { add(c.worktop && c.worktop.mat); return; } if (kind === 'edge') add(c.worktop && c.worktop.edge); if (kind === 'mat') { add(c.mat.carc); add(c.mat.facade); add(c.mat.back); add(c.mat.drawer); } else { add(c.edge.carc); add(c.edge.facade); } });
  return Object.keys(set).map(function (v) { return '<option value="' + esc(v) + '">'; }).join('');
}

/* ----------------------------------------------------------------- render: cabinets tab */
function viewCab(info) {
  var cabs = S.proj.cabinets;
  var rail = '<aside class="rail"><h2>' + t('cabs') + '</h2><div class="cablist">' + cabs.map(function (c, i) {
    var lv = info[i].warnings.map(level), dot = lv.indexOf('bad') >= 0 ? '<span class="dot bad"></span>' : lv.indexOf('warn') >= 0 ? '<span class="dot warn"></span>' : '';
    return '<button class="cab' + (i === S.sel && !S.picking ? ' on' : '') + '" data-act="sel" data-i="' + i + '"><span class="nr">' + (i + 1) + '</span><span><b>' + esc(c.name || typeName(c)) + dot + '</b><small>' +
      fmt(c.dishwasher ? c.dishWidth : c.W) + '×' + fmt(c.H) + '×' + fmt(c.D) + '</small>' + (S.admin && info[i] ? '<small class="cabprice">' + eur(priceCabinet(c, info[i].r).offer) + ' €</small>' : '') + '</span></button>';
  }).join('') + '</div><button class="btn pri" data-act="pick">' + t('newCab') + '</button></aside>';
  if (S.picking || !cabs.length) return '<div class="ws">' + rail + '<section class="editor" style="grid-column:span 2">' + viewPick() + '</section></div>';
  var c = cur(), inf = info[S.sel];
  return '<div class="ws">' + rail + '<section class="editor">' + (c.kind !== 'box' && c.kind !== 'panel' ? cabBar(c) : '') + stepNav(c, inf) + jcBanner(c, inf) + ecBanner(c, inf) + oneStep(viewEditor(c), c, inf) + '</section>' + viewSheet(c, inf) + '</div>' + (S.jcheck ? jcModal(c, inf) : S.echeck ? ecModal(c, inf) : '');
}
/* where am I / what is left: the steps of this cabinet, with a mark where something needs attention */
function needsWt(c) { return !!(c.worktop && c.worktop.on && !c.dishwasher && !String(c.worktop.mat || '').trim()); }   // the worktop's material is set in step 1, with the worktop
function needsMats(c) { if (c.kind === 'panel') return !c.mat.carc; if (c.dishwasher) return !c.mat.facade; if (c.kind === 'box') return !c.mat.carc || (c.box && c.box.fronts && c.box.fronts.length > 0 && !c.mat.facade); return !c.mat.carc || (c.sections.some(function (s) { return s.kind === 'drawers' || s.kind === 'doors' || s.kind === 'cargo'; }) && !c.mat.facade); }
/* the editor shows one step at a time (S.stepKey, kept while moving between cabinets of the same kind); the preview stays beside it */
function curStep(keys) { return keys.indexOf(S.stepKey) >= 0 ? S.stepKey : keys[0]; }
function oneStep(html, c, inf) {
  if (typeof location !== 'undefined' && /[?&]allsteps\b/.test(location.search)) return html;   // all steps on one page (the old layout; the test pages use it)
  var keys = [], re = /<div class="card step" id="st-([\w-]+)"/g, m; while ((m = re.exec(html))) keys.push(m[1]);
  if (!keys.length) return html;
  var cur = curStep(keys), k = keys.indexOf(cur), names = {}, st = (stepNav(c, inf).match(/data-v="[\w-]+"[^>]*><span class="sn">\d+<\/span><span class="sl">[^<]*/g) || []);
  st.forEach(function (x) { var mm = /data-v="([\w-]+)".*class="sl">(.*)$/.exec(x); if (mm) names[mm[1]] = mm[2]; });
  html = html.replace(/<div class="card step" id="st-([\w-]+)"/g, function (all, key) { return '<div class="card step' + (key === cur ? ' cur' : ' off') + '" id="st-' + key + '"'; });
  return html + '<div class="stepfoot">' + (k > 0 ? '<button type="button" class="btn ghost" data-act="step" data-v="' + keys[k - 1] + '">← ' + (names[keys[k - 1]] || t('stepBack')) + '</button>' : '<span></span>') +
    (k < keys.length - 1 ? '<button type="button" class="btn primary" data-act="step" data-v="' + keys[k + 1] + '">' + t('stepNext') + ': ' + (names[keys[k + 1]] || '') + ' →</button>' : '') + '</div>';
}
/* the cabinet's name and actions, above the steps */
function cabBar(c) {
  return '<div class="cabbar">' + fT(t('name'), 'c.name', c.name, null, 'grow') +
    '<span class="cabact">' + (c.libId ? '<button class="btn ghost libon" data-act="libunlink" title="' + esc(t('libLinkedT')) + '">★ ' + t('libLinked') + '</button>' : '<button class="btn ghost" data-act="libsave" title="' + esc(t('libSaveT')) + '">☆ ' + t('libSave') + '</button>') +
    '<button class="btn ghost" data-act="dup">' + t('dup') + '</button><button class="btn ghost danger" data-act="del">' + (S.confirm === 'del' ? t('delSure') : t('del')) + '</button></span></div>';
}
function stepNav(c, inf) {
  var dimW = /netinkami matmenys|per maži matmenys|per maža detalė|netelpa į stakles|matmenys per/i, secW = /^(sekcija|kolona|stalčius) [\d.]+|sekcijų aukščių suma/i;   // which step a problem belongs to
  var bad = inf.warnings.some(function (w) { return level(w) === 'bad' && !dimW.test(w) && !secW.test(w); }), dimBad = inf.warnings.some(function (w) { return dimW.test(w); }) || needsWt(c), secBad = inf.warnings.some(function (w) { return level(w) === 'bad' && !dimW.test(w) && secW.test(w); });
  var over = !c.dishwasher && c.kind !== 'box' && c.kind !== 'panel' && Array.from({ length:colsOf(c) }, function (_, k) { return k; }).some(function (k) { return zoneInfo(c, k).over; });   // each column against its own zone
  var st = c.kind === 'panel' ? [['dims', 1, t('pnS1'), dimBad || needsMats(c)]] : c.kind === 'box' ? [['dims', 1, t('n1'), dimBad], ['boards', 2, t('bxS2'), !inf.r.panels.length], ['inner', 3, t('bxS3')], ['fronts', 4, t('bxS5')], ['joints', 5, t('bxS4'), bad], ['mats', 6, t('n5'), needsMats(c)], ['extra', 7, t('n6')]] : c.dishwasher ? [['dims', 1, t('n1'), dimBad], ['mats', 2, t('n5'), needsMats(c)]]
    : [['dims', 1, t('n1'), dimBad], ['build', 2, t('nB'), needsWt(c)], ['secs', 3, t('n2'), over || !c.sections.length || secBad], ['ops', 4, t('n4'), bad], ['mats', 5, t('n5'), needsMats(c)], ['extra', 6, t('n6')]];
  var cur = curStep(st.map(function (x) { return x[0]; }));
  return '<nav class="stepnav" aria-label="' + t('stepsNav') + '">' + st.map(function (x, i) {
    return '<button type="button" class="' + (x[0] === cur ? 'on' : '') + (x[3] ? ' need' : '') + '" data-act="step" data-v="' + x[0] + '"' + (x[0] === cur ? ' aria-current="step"' : '') + (x[3] ? ' title="' + t('stepNeed') + '"' : '') + '><span class="sn">' + x[1] + '</span><span class="sl">' + esc(x[2]) + '</span>' + (x[3] ? '<i class="sdot" aria-label="' + t('stepNeed') + '"></i>' : '') + '</button>';
  }).join('') + '</nav>';
}
function gotoStep(id) {
  var el = document.getElementById(id); if (!el) return;
  var card = el.closest ? el.closest('.card.step') : null;
  if (card && card.classList.contains('off')) { S.stepKey = card.id.replace(/^st-/, ''); render(); el = document.getElementById(id); if (!el) return; if (el === document.getElementById('st-' + S.stepKey)) { window.scrollTo({ top:0, behavior:'smooth' }); return; } }
  var nav = document.querySelector('.stepnav'), top = document.querySelector('.top');
  var off = (top && getComputedStyle(top).position === 'sticky' ? top.offsetHeight : 0) + (nav ? nav.offsetHeight : 0) + 12;
  window.scrollTo({ top:el.getBoundingClientRect().top + window.scrollY - off, behavior:'smooth' });
  S.gotoAt = Date.now();   // keep the clicked step lit while the page scrolls (the last steps may not reach the top)
  var cd = el.closest ? el.closest('.card.step') : null, ck = cd ? cd.id : id;
  if (nav) nav.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', 'st-' + b.getAttribute('data-v') === ck); });
}
window.addEventListener('scroll', function () {   // highlight the step being read
  var nav = document.querySelector('.stepnav'); if (!nav || Date.now() - (S.gotoAt || 0) < 1200 || document.querySelector('.card.step.off')) return;   // one step at a time: nothing to follow
  var bs = nav.querySelectorAll('button'), y = (document.querySelector('.top') || {}).offsetHeight + nav.offsetHeight + 40, act = 0;
  bs.forEach(function (b, i) { var el = document.getElementById('st-' + b.getAttribute('data-v')); if (el && el.getBoundingClientRect().top < y) act = i; });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) act = bs.length - 1;
  bs.forEach(function (b, i) { b.classList.toggle('on', i === act); });
}, { passive:true });
function typeName(c) { if (c.kind === 'panel') return t('pPanel'); if (c.kind === 'box') return t('pBox'); return c.dishwasher ? t('pDish') : ({ 'PASTATOMOS':t('tBase'), 'PAKABINAMOS':t('tWall'), 'ŪKINĖ':t('tTall') })[c.type] || c.type; }
function viewPick() {
  return '<div class="card"><div class="row" style="justify-content:space-between;align-items:center;margin-bottom:12px"><div><h3 style="margin:0;font:600 24px var(--f-display)">' + (S.proj.cabinets.length ? t('pickTitle') : t('firstCabQ')) + '</h3><p class="note" style="margin:2px 0 0">' + t('pickLead') + '</p></div>' +
    (S.proj.cabinets.length ? '<button class="btn ghost" data-act="unpick">' + t('cancel') + '</button>' : '') + '</div>' + viewLib() + '<h4 class="libsub">' + t('libNewT') + '</h4><div class="presets">' +
    PRESETS.map(function (p, i) { return '<button class="preset" data-act="preset" data-i="' + i + '">' + ico(p.k) + '<b>' + t(p.k) + '</b><small>' + p.W + '×' + p.H + '×' + p.D + '</small></button>'; }).join('') + '</div></div>';
}
function fN(label, bind, val, cls) { var id = 'f-' + bind.replace(/\./g, '-'); return '<label class="f n ' + (cls || '') + '" for="' + id + '"><span>' + label + '</span><input id="' + id + '" inputmode="decimal" type="text" data-bind="' + bind + '" data-num="1" value="' + esc(val) + '" autocomplete="off"></label>'; }
function fT(label, bind, val, list, cls) { var id = 'f-' + bind.replace(/\./g, '-'); return '<label class="f ' + (cls || 'grow') + '" for="' + id + '"><span>' + label + '</span><input id="' + id + '" type="text" data-bind="' + bind + '" value="' + esc(val) + '"' + (list ? ' list="' + list + '"' : '') + ' autocomplete="off"></label>'; }
function fS(label, bind, val, opts) { var id = 'f-' + bind.replace(/\./g, '-'); return '<label class="f" for="' + id + '"><span>' + label + '</span><select id="' + id + '" data-bind="' + bind + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>'; }
function segI(bind, val, opts) { var sym = ISO && ISO.sym ? ISO.sym : function () { return ''; }; return seg(bind, val, opts).replace(/(data-v="(confirmat|cam|dowel)"[^>]*>)/g, function (m, a, ty) { return a + sym(ty); }); }
function seg(bind, val, opts) { return '<div class="seg" role="group">' + opts.map(function (o) { return '<button type="button" data-act="set" data-bind="' + bind + '" data-v="' + esc(o[0]) + '" class="' + (String(val) === String(o[0]) ? 'on' : '') + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; }
function chk(bind, val, label) { var id = 'f-' + bind.replace(/\./g, '-'); return '<label class="chk" for="' + id + '"><input id="' + id + '" type="checkbox" data-bind="' + bind + '"' + (val ? ' checked' : '') + '>' + label + '</label>'; }
function step(no, title, lead, body, key) { return '<div class="card step"' + (key ? ' id="st-' + key + '"' : '') + '><div class="no">' + no + '</div><div><h3>' + title + '</h3>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + body + '</div></div>'; }

function zoneInfo(c, col) {
  var o = c.cnc, H = num(c.H) - (o.bottom === 'inside' ? Math.max(0, Math.min(num(o.bottomZ) || 0, num(c.H) - 200)) : 0), t_ = num(c.thick) || 18, topFull = o.top === 'full';   // as the engine clamps it
  var hb_ = o.bottom === 'inside' ? Math.max(0, Math.min(num(o.bottomZ) || 0, num(c.H) - 200)) : 0, fg = o.fg || {}, fv = function (k) { var v = fg[k]; return v === '' || v == null || !isFinite(+v) ? null : +v; };
  var gp = fv('mid') != null ? Math.max(0, fv('mid')) : E.R.facade.gap, zTop0 = H - (topFull && o.topOverFacade && o.topMount !== 'inside' ? t_ : (topFull ? 0 : E.R.facade.zoneGapRails));
  var Hz = (fv('top') != null ? H - (topFull && o.topOverFacade && o.topMount !== 'inside' ? t_ : 0) - Math.max(0, fv('top')) + gp : zTop0) - Math.max(-hb_, fv('bot') != null ? fv('bot') : 0);   // as the engine: the fronts' gaps (c.cnc.fg)
  var exp = 0, nFill = 0; c.sections.forEach(function (s) { if (col != null && colOf(c, s) !== col) return; if (s.fill) nFill++; else exp += Math.max(0, num(s.height)); });
  return { Hz:Hz, exp:exp, nFill:nFill, fillH:nFill ? Math.max(0, Hz - exp) / nFill : 0, over:exp > Hz + 0.5 };
}
function activeCol(c) { var n = colsOf(c); return Math.min(n - 1, Math.max(0, S.colSel || 0)); }
/* front view of the cabinet, drawn from its real parts (DBFront): click a column to edit it */
/* the bottom's depth from the front: empty = as deep as the sides; shorter leaves room behind for a sink's pipes */
/* which carcass sides show (in the front material): in a row under the sizes */
function visBlock(c) {
  if (c.dishwasher || c.kind === 'box' || c.kind === 'panel') return '';
  var b = 'c.', v = c.vis || {};
  return '<div class="visrow"><span class="lbl">' + t('visT') + '</span><div class="vischk">' + chk(b + 'vis.L', v.L, t('visL')) + chk(b + 'vis.R', v.R, t('visR')) +
    (c.type === 'PAKABINAMOS' || c.hang ? chk(b + 'vis.B', v.B, t('visB')) : '') + chk(b + 'cnc.sideFull', sideFullOf(c), t('sideFull')) + '</div><p class="note">' + t('visNote') + '</p></div>';
}
/* the sides run the full height: the bottom between them (not lifted) and the top too (a rail top always sits between them) */
function sideFullOf(c) { var o = c.cnc || {}; return o.bottom === 'inside' && !(num(o.bottomZ) > 0) && (o.top !== 'full' || o.topMount === 'inside'); }
function topPic(inside, cam) {   // tiny front section: where the top sits; cam 'in' (underneath, inside the cabinet) / 'out' (on its top face)
  var s = '<svg viewBox="0 0 64 40" width="64" height="40"><g fill="#c9cfc8" stroke="#56635b" stroke-width="1">';
  if (inside) s += '<rect x="4" y="4" width="6" height="34"/><rect x="54" y="4" width="6" height="34"/><rect x="10" y="10" width="44" height="6" fill="#2448c9" fill-opacity=".35" stroke="#2448c9"/>' + camMarks(10, 54, 10, 16, cam === 'out' ? 'a' : cam === 'in' ? 'b' : null);
  else s += '<rect x="4" y="10" width="6" height="28"/><rect x="54" y="10" width="6" height="28"/><rect x="4" y="4" width="56" height="6" fill="#2448c9" fill-opacity=".35" stroke="#2448c9"/>';
  return s + '</g></svg>';
}
/* the plinth (cokolis): on / off and its size right where the legs and the bottom are set; it is the extra part of kind 'plinth' */
function plinthIdx(c) { var i = -1; (c.extras || []).some(function (x, k) { if (x && (x.kind === 'plinth' || /cokol|plint/i.test(x.name || ''))) { i = k; return true; } return false; }); return i; }
function plinthBlock(c) {
  if (cabKind(c) === 'PAKABINAMOS') return '';
  var i = plinthIdx(c), x = i >= 0 ? c.extras[i] : null, b = 'c.extras.' + i + '.';
  var h = '<div class="row plinthrow" style="margin-top:12px;align-items:flex-end;gap:10px"><div class="f"><span>' + t('plL') + '</span><div class="seg" role="group">' +
    [['off', t('plOff')], ['on', t('plOn')]].map(function (o2) { var on = (o2[0] === 'on') === !!x; return '<button type="button" data-act="plinth" data-v="' + o2[0] + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + o2[1] + '</button>'; }).join('') + '</div></div></div>';
  if (x) {
    var hb1 = hbOf(c), btw = hb1 > 0 && (x.between != null && x.between !== '' ? x.between === true || x.between === 'true' : !E.legHeight(engineDef(c)));
    var yf0 = x.yf !== '' && x.yf != null && isFinite(num(x.yf)) ? num(x.yf) : (btw ? 20 : 50);
    if (hb1 > 0) h += '<div class="row" style="margin-top:8px"><div class="f"><span>' + t('plWhere') + '</span><div class="seg" role="group">' +
      [['in', t('plIn')], ['under', t('plUnder')]].map(function (o2) { var on = (o2[0] === 'in') === btw; return '<button type="button" data-act="plinthpos" data-v="' + o2[0] + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '">' + o2[1] + '</button>'; }).join('') + '</div></div></div>';
    h += '<div class="row plfields" style="margin-top:8px;gap:10px">' + fN(t('plH'), b + 'W', x.W, 's') + fN(t('plLen'), b + 'L', x.L, 's') + fN(t('plYf'), b + 'yf', fmt(yf0), 's') + fN(t('cT'), b + 'T', x.T, 's') +
      '<label class="f grow" for="f-pl-mat" style="min-width:160px"><span>' + t('cMat') + '</span><input id="f-pl-mat" type="text" data-bind="' + b + 'mat" list="dl-mat" value="' + esc(x.mat || '') + '" autocomplete="off"></label>';
  }
  return h + (x ? '</div><p class="note" style="margin:4px 0 0">' + t('plNote') + '</p>' : '');
}
function botDepthField(c) {
  var o = c.cnc || {}, full = num(c.D), v = num(o.bottomD) > 0 ? num(o.bottomD) : '', id = 'f-c-cnc-bottomD';
  return '<label class="f n s" for="' + id + '"><span>' + t('botD') + '</span><input id="' + id + '" inputmode="decimal" type="text" data-bind="c.cnc.bottomD" data-num="1" data-empty="1" value="' + esc(v === '' ? '' : fmt(v)) + '" placeholder="' + t('botDFull') + '" autocomplete="off"></label>' +
    (v !== '' && v < full ? '<span class="h">' + esc(t('botDGap').replace('{g}', fmt(full - v))) + '</span>' : '');
}
function hbOf(c) { return c.cnc && c.cnc.bottom === 'inside' ? Math.max(0, num(c.cnc.bottomZ) || 0) : 0; }
function cabKind(c) { if (c.hang === true) return 'PAKABINAMOS'; if (c.hang === false || c.type !== 'PAKABINAMOS') return num(c.H) > 1000 ? 'ŪKINĖ' : 'PASTATOMOS'; return c.type; }   // by its height: a door cabinet made 2300 high is a tall one (handle at hand height)
/* the cabinet's front render (DBFront) with its columns, ovens and legs */
function frontArtOf(c, r, extra) {
  var nC = colsOf(c), cw = colWidths(c), W = num(c.W), H = num(c.H), t_ = num(c.thick) || 18, bnd = [0]; cw.forEach(function (w, k) { bnd.push(bnd[k] + w); }); bnd[nC] = W;
  var over = [], ovens = [];
  for (var k = 0; k < nC; k++) {
    var z = zoneInfo(c, k), zc = 0, x0 = k === 0 ? t_ : bnd[k] + t_ / 2, x1 = k === nC - 1 ? W - t_ : bnd[k + 1] - t_ / 2; over.push(z.over);
    c.sections.forEach(function (s) { if (colOf(c, s) !== k) return; var h = s.fill ? z.fillH : num(s.height); if (s.kind === 'oven') ovens.push({ x0:x0, x1:x1, z0:Math.max(zc, t_) + hbOf(c), z1:Math.min(zc + h, H - hbOf(c) - t_) + hbOf(c) }); zc += h; });
  }
  var legH = E.legHeight(engineDef(c));
  var o = Object.assign({ bnd:bnd, sel:-1, over:over, ovens:ovens, legs:legH > 0, legH:legH, type:cabKind(c), label:c.name || '' }, extra || {});
  var v0 = (r && r.visual) || {}, low = Math.min.apply(null, [0].concat((v0.drawers || []).map(function (f) { return +f.bottom || 0; }), (v0.doors || []).map(function (d) { return +d.z || 0; })));   // as DBFront: fronts below the carcass
  return { svg:r && window.DBFront ? window.DBFront.svg(c, r, o) : '', vbH:H + Math.max(legH, -low) + 14, legH:legH };
}
/* the fronts' outer edges as drag handles on the front picture (its units are mm, y down from the cabinet top): bottom, top, left,
   right; dragged, they set the gaps (c.cnc.fg), snapping to the carcass bottom, the sides' bottom edge, the sides' outer faces */
/* the cabinet's front picture with the plinth's edges as handles (step 6) */
/* the plinth fitted by its gaps (step 6, under the extra parts' table): the gaps, the fit button, the picture with handles */
function plinthFitBlock(c) {
  var i = plinthIdx(c); if (i < 0 || c.dishwasher) return '';
  var x = c.extras[i], b = 'c.extras.' + i + '.';
  var gE = function (label, k) { var id = 'f-pl-' + k; return '<label class="f n s" for="' + id + '"><span>' + label + '</span><input id="' + id + '" inputmode="decimal" type="text" data-bind="' + b + k + '" data-num="1" data-empty="1" value="' + esc(x[k] == null ? '' : x[k]) + '" autocomplete="off"></label>'; };
  var fitted = ['gl', 'gr', 'gt', 'gb'].some(function (k) { return x[k] !== '' && x[k] != null; });
  return '<div class="plfit"><div class="plfit-f"><div class="lbl">' + t('exPlinth') + ' — ' + t('plFitT') + '</div><div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">' +
    gE(t('plGl'), 'gl') + gE(t('plGr'), 'gr') + gE(t('plGt'), 'gt') + gE(t('plGb'), 'gb') + '</div>' +
    '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button type="button" class="btn" data-act="plfit" data-v="' + i + '">⇔ ' + t('plFitBtn') + '</button>' +
    (fitted ? '<button type="button" class="btn ghost" data-act="plfit" data-v="' + i + ':off">' + t('plFitOff') + '</button>' : '') + '</div>' +
    '<p class="note" style="margin:6px 0 0">' + t('plFitNote') + '</p></div>' + plinthPic(c) + '</div>';
}
function plinthPic(c) {
  var inf = cur() === c && S._info && S._info[S.sel], r = inf && inf.r, pl = r && r.visual && r.visual.plinth; if (!pl || !window.DBFront) return '';
  var legH = E.legHeight(engineDef(c)), art = window.DBFront.svg(c, r, { legs:legH > 0, legH:legH, type:cabKind(c), label:t('exPlinth') }), H = +r.dims.H, W = +r.dims.W, n = function (v) { return (Math.round(v * 10) / 10).toString(); }, hw = Math.max(6, W / 70);
  var bar = function (k, x1, y1, x2, y2, cur0) { return '<line class="fgh" data-plh="' + k + '" x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke-width="' + n(hw) + '" style="cursor:' + cur0 + '"><title>' + esc(t('plDragT')) + '</title></line>'; };
  var mx = (pl.x0 + pl.x1) / 2, my = H - (pl.z0 + pl.z1) / 2, lw = (pl.x1 - pl.x0) * 0.3, lh = Math.max(8, (pl.z1 - pl.z0) * 0.35);
  var hs = '<g class="fghs">' + bar('gt', mx - lw, H - pl.z1, mx + lw, H - pl.z1, 'ns-resize') + bar('gb', mx - lw, H - pl.z0, mx + lw, H - pl.z0, 'ns-resize') +
    bar('gl', pl.x0, my - lh, pl.x0, my + lh, 'ew-resize') + bar('gr', pl.x1, my - lh, pl.x1, my + lh, 'ew-resize') + '<text class="fgtip" x="0" y="0" font-size="' + n(Math.max(14, W / 34)) + '"></text></g>';
  var y0v = H - (pl.top + 160), y1v = H - pl.floor + 14;   // the lower part of the cabinet, where the plinth is, close up
  art = art.replace(/viewBox="[^"]*"/, 'viewBox="' + n(-20) + ' ' + n(y0v) + ' ' + n(W + 40) + ' ' + n(y1v - y0v) + '"');
  return '<div class="plpic">' + art.replace(/<\/svg>\s*$/, hs + '</svg>') + '</div>';
}
function fgFronts(r) {
  var v = r.visual || {}, fr = (v.drawers || []).map(function (f) { return { x0:f.x, x1:f.x + f.w, z0:f.bottom, z1:f.bottom + f.h }; })
    .concat((v.doors || []).map(function (d) { return { x0:d.x, x1:d.x + d.w, z0:d.z, z1:d.z + d.h }; }));
  if (!fr.length) return null;
  return { x0:Math.min.apply(null, fr.map(function (q) { return q.x0; })), x1:Math.max.apply(null, fr.map(function (q) { return q.x1; })),
    z0:Math.min.apply(null, fr.map(function (q) { return q.z0; })), z1:Math.max.apply(null, fr.map(function (q) { return q.z1; })) };
}
function fgHandles(r) {
  var e = fgFronts(r); if (!e) return '';
  var H = +r.dims.H, W = +r.dims.W, n = function (v) { return (Math.round(v * 10) / 10).toString(); }, hw = Math.max(10, W / 40);
  var bar = function (k, x1, y1, x2, y2, cur) { return '<line class="fgh" data-fgh="' + k + '" x1="' + n(x1) + '" y1="' + n(y1) + '" x2="' + n(x2) + '" y2="' + n(y2) + '" stroke-width="' + n(hw) + '" style="cursor:' + cur + '"><title>' + esc(t('fgDragT')) + '</title></line>'; };
  var mx = (e.x0 + e.x1) / 2, my = H - (e.z0 + e.z1) / 2, lw = (e.x1 - e.x0) * 0.3, lh = (e.z1 - e.z0) * 0.3;
  return '<g class="fghs">' + bar('bot', mx - lw, H - e.z0, mx + lw, H - e.z0, 'ns-resize') + bar('top', mx - lw, H - e.z1, mx + lw, H - e.z1, 'ns-resize') +
    bar('l', e.x0, my - lh, e.x0, my + lh, 'ew-resize') + bar('r', e.x1, my - lh, e.x1, my + lh, 'ew-resize') + '<text class="fgtip" x="0" y="0" font-size="' + n(Math.max(22, W / 22)) + '"></text></g>';
}
var FGD = null;   // a handle being dragged
document.addEventListener('pointerdown', function (ev) {
  var pel = ev.target && ev.target.closest ? ev.target.closest('[data-plh]') : null;
  if (pel) { var cp = cur(), ip = S._info && S._info[S.sel], rp = ip && ip.r, pl = rp && rp.visual && rp.visual.plinth; if (!cp || !pl) return; ev.preventDefault(); ev.stopPropagation();
    var sv = pel.ownerSVGElement; FGD = { pl:true, el:pel, k:pel.getAttribute('data-plh'), svg:sv, inv:sv.getScreenCTM().inverse(), r:rp, p:pl, v:null, tip:sv.querySelector('.fgtip') };
    try { pel.setPointerCapture(ev.pointerId); } catch (x) {} return; }
  var el = ev.target && ev.target.closest ? ev.target.closest('[data-fgh]') : null; if (!el) return;
  var c = cur(), inf = S._info && S._info[S.sel], r = inf && inf.r; if (!c || !r || !r.fgaps) return;
  ev.preventDefault(); ev.stopPropagation();
  var svg = el.ownerSVGElement, e = fgFronts(r); if (!svg || !e) return;
  FGD = { el:el, k:el.getAttribute('data-fgh'), svg:svg, inv:svg.getScreenCTM().inverse(), r:r, e:e, v:null, tip:svg.querySelector('.fgtip') };
  try { el.setPointerCapture(ev.pointerId); } catch (x) {}
}, true);
document.addEventListener('pointermove', function (ev) {
  if (!FGD) return;
  if (FGD.pl) {   // a plinth edge: the gap to the side, to the bottom board, to the floor
    var pt2 = FGD.svg.createSVGPoint(); pt2.x = ev.clientX; pt2.y = ev.clientY; var q2 = pt2.matrixTransform(FGD.inv), Hh = +FGD.r.dims.H, Ww = +FGD.r.dims.W, P = FGD.p, k2 = FGD.k, v2, sn2 = null, side = P.sideIn;
    if (k2 === 'gl') v2 = q2.x - side; else if (k2 === 'gr') v2 = (Ww - side) - q2.x; else if (k2 === 'gt') v2 = P.top - (Hh - q2.y); else v2 = (Hh - q2.y) - P.floor;
    v2 = Math.max(0, Math.min(v2, k2 === 'gl' || k2 === 'gr' ? 200 : 150));
    [[0, t('plSnap0')], [1, ''], [4, ''], [k2 === 'gt' ? 2 : 3, '']].forEach(function (s0) { if (sn2 == null && Math.abs(v2 - s0[0]) < 7 * Math.abs(FGD.inv.a || 1)) { v2 = s0[0]; sn2 = s0[1]; } });
    v2 = Math.round(v2 * 2) / 2; FGD.v = v2;
    var y2, x2;
    if (k2 === 'gt' || k2 === 'gb') { y2 = k2 === 'gt' ? Hh - (P.top - v2) : Hh - (P.floor + v2); FGD.el.setAttribute('y1', y2); FGD.el.setAttribute('y2', y2); }
    else { x2 = k2 === 'gl' ? side + v2 : Ww - side - v2; FGD.el.setAttribute('x1', x2); FGD.el.setAttribute('x2', x2); }
    if (FGD.tip) { FGD.tip.setAttribute('x', k2 === 'gl' ? side + v2 + 20 : k2 === 'gr' ? Ww - side - v2 - 20 : (P.x0 + P.x1) / 2); FGD.tip.setAttribute('y', k2 === 'gt' ? Hh - P.top - 14 : k2 === 'gb' ? Hh - P.floor + 34 : Hh - (P.z0 + P.z1) / 2 - 30);
      FGD.tip.setAttribute('text-anchor', k2 === 'gr' ? 'end' : k2 === 'gl' ? 'start' : 'middle'); FGD.tip.textContent = ({ gl:t('plGl'), gr:t('plGr'), gt:t('plGt'), gb:t('plGb') })[k2] + ': ' + fmt(v2) + (sn2 ? ' — ' + sn2 : ''); }
    return;
  }
  var pt = FGD.svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; var q = pt.matrixTransform(FGD.inv), r = FGD.r, H = +r.dims.H, W = +r.dims.W, g = r.fgaps, k = FGD.k, v, snaps, sn = null;
  if (k === 'bot') { v = (H - q.y) - g.hb; snaps = [[0, t('fgSnapBot')], [g.botMin, t('fgSnapSide')]]; v = Math.max(g.botLow != null ? g.botLow : g.botMin, Math.min(v, FGD.e.z1 - g.hb - 120)); }
  else if (k === 'top') { v = q.y; snaps = [[0, t('fgSnapTop')], [g.mid, ''], [r.fgaps.top, '']]; v = Math.max(0, Math.min(v, 80)); }
  else if (k === 'l') { v = q.x; snaps = [[0, t('fgSnapOut')], [3, ''], [+r.dims.t / 2, '']]; v = Math.max(0, Math.min(v, 40)); }
  else { v = W - q.x; snaps = [[0, t('fgSnapOut')], [3, ''], [+r.dims.t / 2, '']]; v = Math.max(0, Math.min(v, 40)); }
  snaps.forEach(function (s0) { if (sn == null && Math.abs(v - s0[0]) < Math.max(2, 7 * Math.abs(FGD.inv.a || 1))) { v = s0[0]; sn = s0[1]; } });
  v = Math.round(v * 2) / 2; FGD.v = v;
  var el = FGD.el, e = FGD.e, a, tx, ty;
  if (k === 'bot' || k === 'top') { var y = k === 'bot' ? H - (v + g.hb) : v; el.setAttribute('y1', y); el.setAttribute('y2', y); tx = (e.x0 + e.x1) / 2; ty = k === 'bot' ? y - 12 : y + 40; }
  else { var x = k === 'l' ? v : W - v; el.setAttribute('x1', x); el.setAttribute('x2', x); tx = k === 'l' ? x + 20 : x - 20; ty = H - (e.z0 + e.z1) / 2; }
  if (FGD.tip) { FGD.tip.setAttribute('x', tx); FGD.tip.setAttribute('y', ty); FGD.tip.setAttribute('text-anchor', k === 'r' ? 'end' : k === 'l' ? 'start' : 'middle'); FGD.tip.textContent = (k === 'bot' ? t('fgBot') : k === 'top' ? t('fgTop') : k === 'l' ? t('fgL') : t('fgR')) + ': ' + fmt(v) + (sn ? ' — ' + sn : ''); }
});
document.addEventListener('pointerup', function () {
  if (!FGD) return; var d = FGD; FGD = null; if (d.v == null) return;
  var c = cur(); if (!c) return;
  if (d.pl) { var pk = plinthIdx(c); if (pk < 0) return; var xp = c.extras[pk]; ['gl', 'gr', 'gt', 'gb'].forEach(function (k) { if (xp[k] === '' || xp[k] == null) xp[k] = 0; }); xp[d.k] = d.v; save(); render(); return; }
  c.cnc.fg = Object.assign({}, c.cnc.fg || {}); c.cnc.fg[d.k] = d.v; save(); render();
});
/* the fronts' gaps as fields under the picture: empty = the rule; a button sends the fronts down to the sides' bottom edge */
function fgBlock(c) {
  var inf = S._info && S._info[S.sel], r = inf && inf.r, g = r && r.fgaps; if (!g || c.dishwasher || !fgFronts(r)) return '';
  var fg = c.cnc.fg || {}, b = 'c.cnc.fg.';
  var f = function (label, k, ph) { var id = 'f-fg-' + k; return '<label class="f n s" for="' + id + '"><span>' + label + '</span><input id="' + id + '" inputmode="decimal" type="text" data-bind="' + b + k + '" data-num="1" data-empty="1" value="' + esc(fg[k] == null ? '' : fg[k]) + '" placeholder="' + esc(fmt(ph)) + '" autocomplete="off"></label>'; };
  var h = '<div class="fgblk"><div class="lbl">' + t('fgT') + '</div><div class="row" style="gap:10px;align-items:flex-end;flex-wrap:wrap">' +
    f(t('fgL'), 'l', g.l) + f(t('fgR'), 'r', g.r) + f(t('fgTop'), 'top', g.top) + f(t('fgMid'), 'mid', g.mid) + f(t('fgBot'), 'bot', g.bot) +
    (g.hb > 0 ? '<button type="button" class="btn ghost" data-act="fgbot" data-v="side"' + (Math.abs(g.bot - g.botMin) < 0.3 ? ' disabled' : '') + '>↓ ' + t('fgToSide') + '</button>' : '') +
    (Object.keys(fg).some(function (k) { return fg[k] !== '' && fg[k] != null; }) ? '<button type="button" class="btn ghost" data-act="fgbot" data-v="reset">' + t('fgReset') + '</button>' : '') +
    '</div><p class="note" style="margin:4px 0 0">' + t('fgNote') + '</p></div>';
  return h;
}
function colMapInner(c) {
  var nC = colsOf(c), cw = colWidths(c), ac = activeCol(c), bs = c.cnc.backs || [], inf = S._info && S._info[S.sel], r = inf && inf.r;
  var W = num(c.W), H = num(c.H), t_ = num(c.thick) || 18, bnd = [0]; cw.forEach(function (w, k) { bnd.push(bnd[k] + w); }); bnd[nC] = W;
  var over = [], ovens = [];
  for (var k = 0; k < nC; k++) {
    var z = zoneInfo(c, k), zc = 0, x0 = k === 0 ? t_ : bnd[k] + t_ / 2, x1 = k === nC - 1 ? W - t_ : bnd[k + 1] - t_ / 2; over.push(z.over);
    c.sections.forEach(function (s) { if (colOf(c, s) !== k) return; var h = s.fill ? z.fillH : num(s.height); if (s.kind === 'oven') ovens.push({ x0:x0, x1:x1, z0:Math.max(zc, t_), z1:Math.min(zc + h, H - t_) }); zc += h; });
  }
  var legH = E.legHeight(engineDef(c)), ratio = W / (H + legH + 14);
  ovens.forEach(function (ov) { ov.z0 += hbOf(c); ov.z1 += hbOf(c); });
  var art = r && window.DBFront ? window.DBFront.svg(c, r, { bnd:bnd, sel:ac, over:over, ovens:ovens, legs:legH > 0, legH:legH, type:cabKind(c), label:t('colEdit') }) : '';
  if (art && r && r.fgaps && !c.dishwasher) art = art.replace(/<\/svg>\s*$/, fgHandles(r) + '</svg>');
  var row = function (fn, cls) { return '<div class="fr-row ' + cls + '">' + cw.map(function (w, k) { return fn(w, k); }).join('') + '</div>'; };
  return '<div class="fr-wrap" style="width:clamp(240px,' + Math.round(340 * ratio) + 'px,100%)">' +
    (nC < 2 ? '' : row(function (w, k) { return '<button type="button" role="tab" class="fr-tab' + (k === ac ? ' on' : '') + (over[k] ? ' over' : '') + '" style="flex:' + w.toFixed(0) + ' 1 0" data-act="colsel" data-v="' + k + '" aria-selected="' + (k === ac) + '"><b>' + colName(nC, k) + '</b><span>' + fmt(w) + '</span></button>'; }, 'fr-tabs')) +
    '<div class="fr-stage">' + art + '</div>' +
    row(function (w, k) { var bk = bs[k] || 'none'; return '<span class="fr-back b-' + bk + (k === ac && nC > 1 ? ' on' : '') + '" style="flex:' + w.toFixed(0) + ' 1 0"><i aria-hidden="true"></i>' + (bk === 'none' ? t('cmNoBack') : bk === 'hdf' ? t('bHdf') : t('bSolid')) + '</span>'; }, 'fr-backs') +
    '</div>';
}
function zoneHtml(z) { var used = z.exp + z.fillH * z.nFill, gap = z.Hz - used;
  return t('zone') + ' <b>' + fmt(z.Hz) + '</b> mm · ' + t('used') + ' <b>' + fmt(used) + '</b>' + (z.over ? ' · <b>' + t('over') + ' ' + fmt(z.exp - z.Hz) + '</b>' : !z.nFill && gap > 1 ? ' · <b class="gapw">' + t('left') + ' ' + fmt(gap) + ' mm</b>' : ''); }   // fixed sections only: what is left unfilled
function viewEditor(c) {
  if (c.kind === 'box') return boxEditor(c);
  if (c.kind === 'panel') return panelEditor(c);
  var b = 'c.', o = c.cnc, h = '';
  /* 1 — dimensions: only the sizes (the name and the cabinet's actions are in the bar above the steps) */
  var bIn = o.bottom === 'inside';
  var dims = '<div class="row">' +
    (c.dishwasher ? fN(t('dishW'), b + 'dishWidth', c.dishWidth) : fN(t('W'), b + 'W', c.W)) + fN(t('H'), b + 'H', c.H) + fN(t('D'), b + 'D', c.D) +
    fN(t('thick'), b + 'thick', c.thick, 's') + fN(t('facT'), b + 'cnc.facadeT', o.facadeT, 's') + '</div>' +
    (c.dishwasher ? '<div class="mainset">' + worktopBlock(c) + '</div>' : '');   // a dishwasher has no construction step: its worktop is set here
  /* 2 — construction: everything about how the box is built, in one place */
  var camO = o.camOut || {}, jtB = jointTypeOf(c, 'bottom') || o.joinery, jtT = jointTypeOf(c, 'top') || o.joinery;
  var bCam = bIn && jtB === 'cam' ? (camO.bottom ? 'out' : 'in') : null, tCam = o.top === 'full' && o.topMount === 'inside' && jtT === 'cam' ? (camO.top ? 'out' : 'in') : null;
  var build = c.dishwasher ? '' :
    '<div class="bgrp"><div class="bgt">' + t('bgBase') + '</div>' +
    '<div class="row"><div class="f"><span>' + t('supL') + '</span>' + seg(b + 'cnc.support', !o.legs ? 'none' : o.feet ? 'feet' : 'legs', [['legs', t('supLegs')], ['feet', t('supFeet')], ['none', t('supNone')]]) + '</div>' +
      (o.legs ? '<button type="button" class="btn ghost supgo" data-act="goto" data-v="st-ops">' + t('supEdit') + ' →</button>' : '') + '</div>' +
    '<div class="row bottomrow" style="margin-top:10px">' + dd(b + 'cnc.bottom', bIn ? 'inside' : 'under', [['under', t('botUnder')], ['inside', t('botInside')]], t('botMount')) +
      (bIn ? fN(t('botZ'), b + 'cnc.bottomZ', o.bottomZ || 0, 's') : '') + botDepthField(c) + camPick('bottom', bottomPic(bIn, bCam), bCam) + '</div>' + plinthBlock(c) + '</div>' +
    '<div class="bgrp"><div class="bgt">' + t('top') + '</div><div class="row bottomrow" style="gap:10px;align-items:flex-end">' + dd(b + 'cnc.topMount', o.top !== 'full' || o.topMount === 'inside' ? 'inside' : 'over', [['over', t('topOn')], ['inside', t('topInside')]], t('topMount')) +   // first, in the same column as the bottom's; rails always sit between the sides
      dd(b + 'cnc.top', o.top, [['rails', t('topRails')], ['full', t('topFull')]], t('topKind')) +
      (o.top === 'full' ? (o.topMount !== 'inside' ? chk(b + 'cnc.topOverFacade', o.topOverFacade, t('topOver')) : '') + camPick('top', topPic(o.topMount === 'inside', tCam), tCam) + '</div>' +
        (o.topMount !== 'inside' ? '<div class="row topov" style="margin-top:10px;gap:10px;align-items:flex-end">' + fN(o.topOverFacade ? t('topOvFf') : t('topOvF'), b + 'cnc.topOvF', o.topOvF || 0, 's') + fN(t('topOvS'), b + 'cnc.topOvS', o.topOvS || 0, 's') + fN(t('topOvB'), b + 'cnc.topOvB', o.topOvB || 0, 's') + '</div><p class="note" style="margin:4px 0 0">' + t('topOvNote') + '</p>' : '') : '</div>' + railsEditor(c)) + '</div>' +
    '<div class="bgrp">' + visBlock(c) + '</div>' +
    '<div class="bgrp mainset">' + backBlock(c) + worktopBlock(c) + '</div>' +
    '<div class="bgrp"><div class="lbl">' + t('jMain') + ' <span class="unit">· ' + t('jMainL') + '</span></div><div class="choices">' +
      choice(b + 'cnc.joinery', o.joinery, 'confirmat', artOf('confirmat'), t('jConf'), t('jConfD')) +
      choice(b + 'cnc.joinery', o.joinery, 'cam', artOf('cam'), t('jCam'), t('jCamD')) + '</div></div>';
  h += step(1, t('s1'), t('s1l'), dims, 'dims');
  if (c.dishwasher) { h += step(2, t('s5'), t('s5l'), matsBlock(c), 'mats'); return h; }
  h += step(2, t('sB'), t('sBl'), build, 'build');
  /* 2 — sections, by column (pertvaros), each column with its own back */
  var nC = colsOf(c), cw = colWidths(c);
  var secs = '<div class="colbar"><div class="f"><span>' + t('parts2') + '</span>' + seg(b + 'cols', nC, [[1, t('part0')], [2, t('part1')], [3, t('part2')]]) + '</div>' +
    (nC > 1 ? '<div class="colw">' + cw.slice(0, nC - 1).map(function (w, k) { return fN(colName(nC, k) + ' ' + t('colWl'), b + 'colW.' + k, fmt(w), 's'); }).join('') +
      '<div class="f s"><span>' + colName(nC, nC - 1) + ' ' + t('colWl') + '</span><b class="colrest" id="colw-last">' + fmt(cw[nC - 1]) + ' mm</b></div></div><p class="note" style="margin:0">' + t('colWnote') + '</p>' : '') + '</div>' +
    '<div class="colmap" id="colmap"' + (nC > 1 ? ' role="tablist" aria-label="' + esc(t('colEdit')) + '"' : '') + '>' + colMapInner(c) + '</div>' + (nC > 1 ? '<p class="note cmhint">' + t('cmHint') + '</p>' : '') + fgBlock(c) + '<div style="height:12px"></div>' +
    '<div class="colgrid cols' + (nC > 1 ? 'one' : '1') + '">';
  var ac = activeCol(c);
  for (var k = 0; k < nC; k++) {
    if (nC > 1 && k !== ac) continue;   // one column at a time, at full width; the map above shows them all
    var z = zoneInfo(c, k), bk = (c.cnc.backs || [])[k] || 'none';
    secs += '<div class="colblk" role="tabpanel">' + (nC > 1 ? '<div class="colh"><span class="unit">' + t('colEdit') + '</span><b>' + colName(nC, k) + '</b><span class="unit">' + fmt(cw[k]) + ' mm</span></div>' : '') +
      '<div class="zone" data-col="' + k + '">' + zoneHtml(z) + '</div><div class="secs">';
    for (var i = c.sections.length - 1; i >= 0; i--) if (colOf(c, c.sections[i]) === k) secs += viewSection(c, c.sections[i], i, z);
    secs += '</div><div class="addsec"><span class="unit" style="align-self:center">' + t('add') + ':</span>' +
      ['drawers', 'doors', 'cargo', 'open', 'oven'].map(function (kd) { return '<button class="btn addk k-' + kd + '" data-act="addsec" data-v="' + kd + '" data-i="' + k + '"><i class="kdot" aria-hidden="true"></i>＋ ' + t({ drawers:'kDrawers', doors:'kDoors', cargo:'kCargo', open:'kOpen', oven:'kOven' }[kd]) + '</button>'; }).join('') + '</div></div>';
  }
  secs += '</div>';
  if (c.sections.some(function (s) { return (s.kind === 'doors' || s.kind === 'open') && num(s.shelves) > 0; })) secs += shelfFront(c);

  h += step(3, t('s2'), t('s2l'), secs, 'secs');
  var rInfo = S._info && S._info[S.sel] ? S._info[S.sel].r : null;
  /* 4 — operations */
  var has = function (f) { return c.sections.some(f); };
  var hasDr = has(function (s) { return s.kind === 'drawers' && E.R.runner[s.hw]; }), hasTb = has(function (s) { return s.kind === 'drawers' && s.hw === 'BLUM TANDEMBOX'; });
  var hasDoor = has(function (s) { return s.kind === 'doors' && s.hinge !== 'BE FURNITŪROS'; }), hasSh = has(function (s) { return (s.kind === 'doors' || s.kind === 'open') && num(s.shelves) > 0 && s.shelfAdj !== false; });
  var ops = '<div class="ops">' +
    opRow(b + 'cnc.legs', o.legs, t(o.feet ? 'oFeet' : 'oLegs'), t(o.feet ? 'oFeetD' : 'oLegsD'), !o.feet, true, o.legs ? legsEditor(c, rInfo) : '') +
    opRow(b + 'cnc.runnerMarks', o.runnerMarks, t('oRun'), t('oRunD'), true, hasDr) +
    opRow(b + 'cnc.tbOn', o.tbFront !== 'off', t('oTb'), o.tbFront === 'hole' ? t('oTbD') : t('oTbDm'), true, hasTb, seg(b + 'cnc.tbFront', o.tbFront === 'off' ? 'mark' : o.tbFront, [['mark', t('tbMark')], ['hole', t('tbHole')]])) +
    opRow(b + 'cnc.hinges', o.hinges, t('oHinge'), t('oHingeD'), false, hasDoor, seg(b + 'cnc.hingeFix', o.hingeFix, [['screw', t('hfScrew')], ['press', t('hfPress')]])) +
    opRow(b + 'cnc.pinsOn', o.pins !== 'off', t('oPins'), t('oPinsD'), false, hasSh, seg(b + 'cnc.pins', o.pins, [['shelf', t('pinShelf')], ['row', t('pinRow')]])) +
    '</div>' + ledBlock(c);
  h += step(4, t('s4'), t('s4l'), ops, 'ops');
  h += step(5, t('s5'), t('s5l'), matsBlock(c), 'mats');
  h += step(6, t('s6'), t('s6l'), extrasBlock(c), 'extra');
  return h;
}
/* ---- joints check: every cabinet's connectors have to be looked at before it goes to production. c.jointsOk holds the
   signature of the joints that were confirmed; any change to them (type, count, positions, a new joint) asks again. */
function jcSig(r) { return ((r && r.joints) || []).map(function (j) { var sd = function (x) { return x.type + ':' + x.pos.map(function (a) { return Math.round(a * 10) / 10; }).join(','); };
  return j.key + '=' + sd(j.sides ? j.sides.L : j) + (j.single ? '' : '|' + sd(j.sides ? j.sides.R : j)); }).join(';'); }
function jcNeeded(c, r) { return !!(r && r.joints && r.joints.length) && c.jointsOk !== jcSig(r); }
/* Baldai: every cabinet's open checks in one bar — joints to confirm (opens the check right there) and production problems (opens the cabinet) */
function roomChecks(infos) {
  var lt = S.lang === 'lt', todo = 0, chips = S.proj.cabinets.map(function (c, i) {
    var inf = infos[i]; if (!inf || !inf.r) return '';
    var jn = jcNeeded(c, inf.r), hasJ = inf.r.joints && inf.r.joints.length, bad = (inf.warnings || []).filter(function (w) { return level(w) === 'bad'; }).length, nm = esc((i + 1) + ' · ' + (c.name || typeName(c)));
    var en = ecNeeded(c, inf.r); if (jn) todo++; if (bad) todo++; if (en) todo++;
    return (hasJ ? '<button type="button" class="rc-chip' + (jn ? ' need' : ' ok') + '" data-act="jcroom" data-i="' + i + '" title="' + (lt ? 'Sujungimų patikra' : 'Joints check') + '">' + (jn ? '⚠' : '✓') + ' ' + nm + (jn ? ' — ' + (lt ? 'sujungimai' : 'joints') : '') + '</button>' : '') +
      '<button type="button" class="rc-chip' + (en ? ' need' : ' ok') + '" data-act="ecroom" data-i="' + i + '" title="' + (lt ? 'Kraštų laminavimo patikra' : 'Edge banding check') + '">' + (en ? '⚠' : '✓') + ' ' + nm + ' — ' + (lt ? 'kraštai' : 'edges') + '</button>' +
      (bad ? '<button type="button" class="rc-chip bad" data-act="rcedit" data-i="' + i + '" title="' + esc(inf.warnings.filter(function (w) { return level(w) === 'bad'; }).join('\n')) + '">✕ ' + nm + ' — ' + bad + ' ' + (lt ? 'klaid.' : 'problem(s)') + '</button>' : '');
  }).join('');
  if (!chips) return '';
  return '<div class="rc-bar' + (todo ? '' : ' allok') + '"><b>' + (todo ? '⚠ ' + (lt ? 'Būtina patikrinti' : 'To check') + ' (' + todo + ')' : '✓ ' + (lt ? 'Viskas patikrinta' : 'Everything is checked')) + '</b><div class="rc-chips">' + chips + '</div></div>';
}
/* ---- edges check: every part of the cabinet with its four edges — which are banded, with what; click an edge to switch it.
   c.edgesOk keeps the signature of the confirmed banding, any later change asks again. */
function ecSig(r) { return ((r && r.panels) || []).map(function (p) { return p.key + '=' + ['y0', 'y1', 'x0', 'x1'].map(function (e) { return p.eb && p.eb[e] ? (p.ebFac && p.ebFac[e] ? 'F' : '1') : '0'; }).join(''); }).join(';'); }
function ecNeeded(c, r) { return !!(r && r.panels && r.panels.length) && c.edgesOk !== ecSig(r); }
/* the cabinet itself in the edges check: every part as a box, its four edge faces coloured by their banding and clickable
   (the same switch as on the cards). Turn it, pull the parts apart to reach hidden edges, hide the fronts. */
function ecState(p, e, fe) { var on = !!(p.eb && p.eb[e]); return !on ? 0 : (p.ebFac && p.ebFac[e]) || (p.eb[e] === fe && (p.role === 'FASADAS' || p.role === 'DURYS')) ? 2 : 1; }   // 0 raw, 1 carcass edge, 2 as the fronts
var EC_COL = ['#c9ccc6', '#1f5fbf', '#d9730d'];
function ecModel(c, r) {
  var lt = S.lang === 'lt', V = S.ecView = S.ecView || { th:0.62, ph:0.42, zoom:1, exp:false, fronts:false }, fe = c.edge.facade || 'PAGAL FASADA';
  var ps = r.panels.filter(function (p) { return p.place && (V.fronts || (p.role !== 'FASADAS' && p.role !== 'DURYS')); }); if (!ps.length) return '';
  var boxes = ps.map(function (p) { var q = p.place, pt = function (a, b, d) { return [0, 1, 2].map(function (i) { return q.o[i] + a * q.u[i] + b * q.v[i] - d * q.n[i]; }); };
    var cn = function (a, b, d) { return pt(a ? p.L : 0, b ? p.W : 0, d ? p.T : 0); };
    return { p:p, cen:pt(p.L / 2, p.W / 2, p.T / 2), faces:[
      { k:'A', v:[cn(0,0,0), cn(1,0,0), cn(1,1,0), cn(0,1,0)] }, { k:'B', v:[cn(0,0,1), cn(1,0,1), cn(1,1,1), cn(0,1,1)] },
      { k:'y0', v:[cn(0,0,0), cn(1,0,0), cn(1,0,1), cn(0,0,1)] }, { k:'y1', v:[cn(0,1,0), cn(1,1,0), cn(1,1,1), cn(0,1,1)] },
      { k:'x0', v:[cn(0,0,0), cn(0,1,0), cn(0,1,1), cn(0,0,1)] }, { k:'x1', v:[cn(1,0,0), cn(1,1,0), cn(1,1,1), cn(1,0,1)] }] }; });
  var mid = [0, 1, 2].map(function (i) { var a = boxes.map(function (b) { return b.cen[i]; }); return (Math.min.apply(null, a) + Math.max.apply(null, a)) / 2; });
  boxes.forEach(function (b) { var off = V.exp ? [0, 1, 2].map(function (i) { return (b.cen[i] - mid[i]) * 0.5; }) : [0, 0, 0];
    b.faces.forEach(function (f) { f.w = f.v.map(function (w) { return [w[0] + off[0] - mid[0], w[1] + off[1] - mid[1], w[2] + off[2] - mid[2]]; }); });
    b.mn = [1e9, 1e9, 1e9]; b.mx = [-1e9, -1e9, -1e9]; b.faces.forEach(function (f) { f.w.forEach(function (w) { for (var i = 0; i < 3; i++) { if (w[i] < b.mn[i]) b.mn[i] = w[i]; if (w[i] > b.mx[i]) b.mx[i] = w[i]; } }); });
    b.c2 = [0, 1, 2].map(function (i) { return (b.mn[i] + b.mx[i]) / 2; }); });
  /* cabinet: x width, y depth (front at 0), z up. Turn about z, then tip; depth grows away from the eye */
  /* the same view as the 3D window: th = azimuth (0 from the front, + from the left), ph = elevation; r, u = screen right and up, ev = towards the eye */
  if (V.th == null) { V.th = 0.62; V.ph = 0.42; }
  var ct = Math.cos(V.th), st2 = Math.sin(V.th), cp = Math.cos(V.ph), sp = Math.sin(V.ph), rr = [ct, -st2, 0], uu = [st2 * sp, ct * sp, cp], dv = [st2 * cp, ct * cp, -sp];
  var pr = function (w) { return [Math.round((w[0] * rr[0] + w[1] * rr[1]) * 10) / 10, Math.round(-(w[0] * uu[0] + w[1] * uu[1] + w[2] * uu[2]) * 10) / 10]; };
  var dep = function (w) { return w[0] * dv[0] + w[1] * dv[1] + w[2] * dv[2]; };
  /* painter's order for boxes that do not intersect: a box goes first when it lies behind another along an axis that separates them */
  var behind = function (A, B) { for (var i = 0; i < 3; i++) { if (A.mn[i] >= B.mx[i] - 0.01 && dv[i] > 1e-6) return true; if (A.mx[i] <= B.mn[i] + 0.01 && dv[i] < -1e-6) return true; } return false; };
  var todo = boxes.slice().sort(function (a, b) { return dep(b.c2) - dep(a.c2); }), order = [];
  while (todo.length) { var k = 0; for (var a2 = 0; a2 < todo.length; a2++) { var free = true; for (var b3 = 0; b3 < todo.length; b3++) if (b3 !== a2 && behind(todo[b3], todo[a2]) && !behind(todo[a2], todo[b3])) { free = false; break; } if (free) { k = a2; break; } } order.push(todo.splice(k, 1)[0]); }
  var rad = 0; boxes.forEach(function (b) { b.faces.forEach(function (f) { f.w.forEach(function (w) { rad = Math.max(rad, Math.hypot(w[0], w[1], w[2])); }); }); });
  var half = rad * 1.08 / (V.zoom || 1), sw = half / 140;
  var svg = order.map(function (b) { var p = b.p; return b.faces.map(function (f) {
      var fc = [0, 1, 2].map(function (i) { return (f.w[0][i] + f.w[1][i] + f.w[2][i] + f.w[3][i]) / 4 - b.c2[i]; }); if (dep(fc) > -1e-6) return '';   // facing away
      var pts = f.w.map(function (w) { return pr(w).join(','); }).join(' ');
      if (f.k === 'A' || f.k === 'B') return '<polygon points="' + pts + '" fill="#f6f5f1" stroke="#7d827c" stroke-width="' + sw * 0.6 + '" stroke-linejoin="round"><title>' + esc((p.short || p.role) + ' · ' + fmt(p.L) + ' × ' + fmt(p.W)) + '</title></polygon>';
      var e = f.k, st = ecState(p, e, fe), len = e === 'y0' || e === 'y1' ? p.L : p.W;
      return '<polygon class="ec-f" points="' + pts + '" fill="' + EC_COL[st] + '" stroke="' + (st ? EC_COL[st] : '#7d827c') + '" stroke-width="' + (st ? sw * 2.2 : sw * 0.6) + '" stroke-linejoin="round" data-act="ebk" data-v="' + esc(p.key) + '" data-i="' + e + '" role="button"><title>' + esc((p.short || p.role) + ' — ' + fmt(Math.round(len)) + ' mm: ' + (st ? p.eb[e] : (lt ? 'nelaminuojama' : 'not banded'))) + '</title></polygon>'; }).join(''); }).join('');
  var tb = function (act, lab, on, tip) { return '<button type="button" class="btn' + (on ? ' on' : '') + '" data-act="ecview" data-v="' + act + '"' + (on != null ? ' aria-pressed="' + !!on + '"' : '') + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + lab + '</button>'; };
  return '<div class="ec-model"><div class="ec-tools">' + tb('front', lt ? 'Priekis' : 'Front') + tb('backv', lt ? 'Galas' : 'Back') + tb('under', lt ? 'Iš apačios' : 'From below') + tb('exp', lt ? 'Išskleisti' : 'Pull apart', V.exp) + tb('fronts', lt ? 'Fasadai' : 'Fronts', V.fronts) + tb('zin', '＋') + tb('zout', '−') + '</div>' +
    '<svg class="ec-msvg" viewBox="' + (-half) + ' ' + (-half) + ' ' + (2 * half) + ' ' + (2 * half) + '" preserveAspectRatio="xMidYMid meet">' + svg + '</svg>' +
    '<p class="note" style="margin:6px 10px 8px">' + (lt ? 'Tempkite — sukite modelį, ratuku — artinkite. Spustelėkite kraštą: nelaminuojama → karkaso kraštas → pagal fasadą.' : 'Drag to turn the model, wheel to zoom. Click an edge: not banded → carcass edge → as the fronts.') + '</p></div>';
}
(function () {   // turn the edges model by dragging, zoom with the wheel — only the model is redrawn
  var D = null, redraw = function () { var m = document.querySelector('.ec-model'), c = cur(), inf = S._info && S._info[S.sel]; if (m && c && inf && inf.r) { m.outerHTML = ecModel(c, inf.r); var sv = document.querySelector('.ec-msvg'); if (sv && D && D.moved) sv.classList.add('drag'); } };
  document.addEventListener('pointerdown', function (e) { S.ecDrag = false; if (!e.target.closest || !e.target.closest('.ec-msvg')) return; var V = S.ecView; if (!V) return; D = { x:e.clientX, y:e.clientY, th:V.th, ph:V.ph, moved:false }; });
  document.addEventListener('pointermove', function (e) { if (!D) return; var dx = e.clientX - D.x, dy = e.clientY - D.y; if (!D.moved && Math.hypot(dx, dy) < 5) return; D.moved = true; S.ecDrag = true;
    S.ecView.th = D.th - dx * 0.009; S.ecView.ph = Math.max(-1.35, Math.min(1.35, D.ph + dy * 0.007)); redraw(); e.preventDefault(); });   // as in the 3D window; here also from below
  document.addEventListener('pointerup', function () { if (D && D.moved) { var d0 = D; D = null; redraw(); setTimeout(function () { S.ecDrag = false; }, 60); void d0; } D = null; });
  document.addEventListener('wheel', function (e) { if (!e.target.closest || !e.target.closest('.ec-msvg') || !S.ecView) return; e.preventDefault(); S.ecView.zoom = Math.max(0.5, Math.min(6, (S.ecView.zoom || 1) * Math.exp(-(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY) * 0.0015))); redraw(); }, { passive:false });
})();
function ecModal(c, inf) {
  var r = inf.r, lt = S.lang === 'lt', need = ecNeeded(c, r), fe = c.edge.facade || 'PAGAL FASADA';
  var cards = r.panels.map(function (p) {
    var Wd = 230, k = Wd / Math.max(p.L, 1), hh = Math.max(34, Math.min(120, p.W * k)), pad = 22, x0 = pad, x1 = pad + Wd, yT = pad, yB = pad + hh;
    var seg = function (e, xa, ya, xb, yb, len, lx, ly, rot) { var st = ecState(p, e, fe), on = st > 0, col = st ? EC_COL[st] : '#9aa09a';
      return '<g class="ec-e" data-act="ebk" data-v="' + esc(p.key) + '" data-i="' + e + '" role="button" aria-pressed="' + on + '"><title>' + esc((on ? p.eb[e] : (lt ? 'nelaminuojama' : 'not banded')) + ' · ' + fmt(len) + ' mm') + '</title>' +
        '<line x1="' + xa + '" y1="' + ya + '" x2="' + xb + '" y2="' + yb + '" stroke="transparent" stroke-width="18"/>' +
        '<line x1="' + xa + '" y1="' + ya + '" x2="' + xb + '" y2="' + yb + '" stroke="' + col + '" stroke-width="' + (on ? 5 : 1.5) + '"' + (on ? ' stroke-linecap="round"' : ' stroke-dasharray="5 4"') + '/>' +
        '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" font-size="11" font-weight="' + (on ? 700 : 400) + '" fill="' + col + '"' + (rot ? ' transform="rotate(-90 ' + lx + ' ' + ly + ')"' : '') + '>' + fmt(Math.round(len)) + '</text></g>'; };
    var n4 = ['y0', 'y1', 'x0', 'x1'].filter(function (e) { return p.eb && p.eb[e]; }).length;
    return '<div class="ec-card' + (p.ebManual ? ' custom' : '') + '"><div class="ec-h"><b>' + esc(p.short || p.role) + '</b><span class="unit">' + fmt(p.L) + ' × ' + fmt(p.W) + ' × ' + fmt(p.T) + '</span>' +
        (p.ebManual ? '<button type="button" class="btn ghost jreset" data-act="ebk" data-v="' + esc(p.key) + '" data-i="reset">↺</button>' : '') + '</div>' +
      '<svg class="ec-svg" viewBox="0 0 ' + (Wd + 2 * pad) + ' ' + (hh + 2 * pad) + '"><rect x="' + x0 + '" y="' + yT + '" width="' + Wd + '" height="' + hh + '" fill="var(--sunk)"/>' +
        seg('y1', x0, yT, x1, yT, p.L, (x0 + x1) / 2, yT - 7) + seg('y0', x0, yB, x1, yB, p.L, (x0 + x1) / 2, yB + 16) + seg('x0', x0, yT, x0, yB, p.W, x0 - 8, (yT + yB) / 2 + 4, 1) + seg('x1', x1, yT, x1, yB, p.W, x1 + 15, (yT + yB) / 2 + 4, 1) + '</svg>' +
      '<div class="ec-ctl"><button type="button" class="btn" data-act="ebk" data-v="' + esc(p.key) + '" data-i="all">' + (n4 === 4 ? (lt ? 'Nė vieno' : 'None') : (lt ? 'Visi 4' : 'All 4')) + '</button>' +
        '</div></div>';
  }).join('');
  return '<div class="drwover jcover" data-act="ecclose" role="dialog" aria-modal="true"><div class="drwbox jcbox" data-stop="1"><div class="drwbar"><b>' + (lt ? 'Kraštų laminavimo patikra' : 'Edge banding check') + ' — ' + esc(c.name || typeName(c)) + ' · ' + fmt(c.W) + '×' + fmt(c.H) + '×' + fmt(c.D) + '</b><button type="button" class="btn ghost" data-act="ecclose" data-force="1" aria-label="' + esc(t('close')) + '">✕</button></div>' +
    '<div class="jcbody"><p class="note" style="margin:0 0 10px">' + (lt ? 'Standartas: laminuojami visi šonų, dugno ir viršaus kraštai, kurių neuždengia kita detalė (priekis, matomi galai), lentynų ir juostų — priekis. Spustelėkite kraštą modelyje ar kortelėje: nelaminuojama → karkaso kraštas → pagal fasadą (etiketėje „PAGAL FASADA“).' : 'Standard: every edge of the sides, bottom and top that no other part covers is banded (front, visible ends); shelves and rails — the front. Click an edge on the model or a card: not banded → carcass edge → as the fronts (label: PAGAL FASADA).') +
      ' <span class="jc-leg"><i class="s" style="background:#1f5fbf"></i>' + esc(c.edge.carc || (lt ? 'karkaso kraštas' : 'carcass edge')) + ' <i class="s" style="background:#d9730d"></i>' + esc(lt ? 'pagal fasadą' : 'as the fronts') + (c.edge.facade ? ' (' + esc(c.edge.facade) + ')' : '') + ' <i class="s" style="background:#9aa09a"></i>' + (lt ? 'nelaminuojama' : 'not banded') + '</span></p>' +
      '<label class="chk" style="margin:0 0 10px"><input type="checkbox" data-bind="c.cnc.ebBack"' + (c.cnc.ebBack ? ' checked' : '') + '> ' + (lt ? 'Laminuoti ir galinius (nematomus) šonų, dugno ir viršaus kraštus' : 'Band the back (unseen) edges of the sides, bottom and top too') + '</label>' +
      '<div class="ec-cols">' + ecModel(c, r) + '<div class="ec-grid">' + cards + '</div></div></div>' +
    '<div class="jcfoot"><span></span><button type="button" class="btn pri big" data-act="ecok">✓ ' + (need ? (lt ? 'Kraštai patikrinti' : 'Edges are checked') : (lt ? 'Patikrinta — uždaryti' : 'Checked — close')) + '</button></div></div></div>';
}
function jcBanner(c, inf) {
  if (!inf.r || !inf.r.joints || !inf.r.joints.length) return '';
  var lt = S.lang === 'lt';
  return jcNeeded(c, inf.r) ? '<button type="button" class="jcneed" data-act="jcopen"><b>⚠ ' + (lt ? 'Būtina patikrinti sujungimus' : 'The joints must be checked') + '</b><span>' + (lt ? 'Patikrinti' : 'Check') + ' →</span></button>'
    : '<button type="button" class="jcneed ok" data-act="jcopen"><b>✓ ' + (lt ? 'Sujungimai patikrinti' : 'Joints checked') + '</b><span>' + (lt ? 'Peržiūrėti' : 'Review') + '</span></button>';
}
function ecBanner(c, inf) {
  if (!inf.r || !inf.r.panels || !inf.r.panels.length) return '';
  var lt = S.lang === 'lt';
  return ecNeeded(c, inf.r) ? '<button type="button" class="jcneed" data-act="ecopen"><b>⚠ ' + (lt ? 'Būtina patikrinti kraštų laminavimą' : 'The edge banding must be checked') + '</b><span>' + (lt ? 'Patikrinti' : 'Check') + ' →</span></button>'
    : '<button type="button" class="jcneed ok" data-act="ecopen"><b>✓ ' + (lt ? 'Kraštai patikrinti' : 'Edges checked') + '</b><span>' + (lt ? 'Peržiūrėti' : 'Review') + '</span></button>';
}
function jcStrip(x, w) {   // one joint side drawn to scale: the seam as a bar, a symbol at every connector, its distance under it
  var W = 560, k = W / Math.max(1, w), col = { cam:'#b4291f', confirmat:'#1f5fbf', dowel:'#6b6f6b' }[x.type] || '#333';
  var g = x.pos.map(function (a, i) { var cx = Math.round(a * k * 10) / 10, lab = E.num(Math.round(a * 10) / 10), up = i % 2 && x.pos.length > 4;
    var sym = x.type === 'cam' ? '<circle cx="' + cx + '" cy="14" r="7" fill="' + col + '"/>' : x.type === 'dowel' ? '<rect x="' + (cx - 4) + '" y="10" width="8" height="8" fill="' + col + '"/>'
      : '<circle cx="' + cx + '" cy="14" r="6.5" fill="#fff" stroke="' + col + '" stroke-width="2"/><path d="M' + (cx - 4) + ' 10 l8 8 m0 -8 l-8 8" stroke="' + col + '" stroke-width="1.6"/>';
    return sym + '<text x="' + Math.max(12, Math.min(W - 12, cx)) + '" y="' + (up ? 44 : 34) + '" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">' + lab + '</text>'; }).join('');
  return '<svg class="jcstrip" viewBox="-4 0 ' + (W + 8) + ' 48" role="img" aria-label="' + esc(x.pos.map(function (a) { return E.num(Math.round(a)); }).join(', ')) + '"><rect x="0" y="9" width="' + W + '" height="10" rx="2" fill="none" stroke="currentColor" stroke-opacity=".45"/>' + g + '</svg>';
}
function jcModal(c, inf) {
  var r = inf.r, lt = S.lang === 'lt', need = jcNeeded(c, r), tn = function (ty) { return t('isoT_' + ty); };
  var ORDER = ['bottom', 'top', 'railF', 'railB', 'railV', 'railVH', 'railBottom', 'railBotB', 'back', 'partB', 'partT', 'partF', 'partR', 'backP', 'shelf', 'oven'];
  var oi = function (k) { var m = /^(\D+)(\d)$/.exec(k); return m ? ORDER.indexOf(m[1]) * 10 + +m[2] : ORDER.indexOf(k) * 10; };
  var js = (r.joints || []).slice().sort(function (a, b) { return oi(a.key) - oi(b.key); });
  var rows = js.map(function (j) {
    var b = 'c.cnc.joints.' + j.key + '.', own = (c.cnc.joints || {})[j.key] || {}, id = 'f-jc-' + j.key, hand = j.split || j.manual, L = j.sides ? j.sides.L : j, R = j.sides ? j.sides.R : j;
    var name = '<div class="jc-h"><button type="button" class="jc-pick" data-act="jcsel" data-v="' + j.key + '" title="' + (lt ? 'Parodyti spintelėje' : 'Show on the cabinet') + '">◎</button><b>' + esc(tJ('jk_' + j.key)) + '</b><span class="unit">' + E.num(Math.round(j.w)) + ' mm</span>' +
      (j.custom ? '<button type="button" class="btn ghost jreset" data-act="jreset" data-v="' + j.key + '">↺ ' + t('jAuto') + '</button>' : '<span class="badge mut">' + t('jAuto') + '</span>') + '</div>';
    var strips = j.split ? '<div class="jc-side"><span class="unit">' + t('sideL') + ' · ' + esc(tn(L.type)) + '</span>' + jcStrip(L, j.w) + '</div><div class="jc-side"><span class="unit">' + t('sideR') + ' · ' + esc(tn(R.type)) + '</span>' + jcStrip(R, j.w) + '</div>' : jcStrip(L, j.w);
    var ctl = hand ? '<div class="jc-ctl"><span class="unit">' + (lt ? 'Vietos nustatytos ranka' : 'Positions set by hand') + '</span><button type="button" class="btn" data-act="jc3d" data-v="' + j.key + '">' + t('isoEdit') + '</button></div>'
      : '<div class="jc-ctl">' + segI(b + 'type', j.type, [['confirmat', t('jtConf')], ['cam', t('jtCam')], ['dowel', t('jtDowel')]]) +
        '<span class="jc-n"><span class="unit">' + t('jN') + '</span><button type="button" class="btn" data-act="jcn" data-v="' + j.key + '" data-i="-1" aria-label="−"' + (L.pos.length <= 1 ? ' disabled' : '') + '>−</button><b>' + L.pos.length + '</b><button type="button" class="btn" data-act="jcn" data-v="' + j.key + '" data-i="1" aria-label="+"' + (L.pos.length >= 8 ? ' disabled' : '') + '>＋</button></span>' +
        '<label class="jc-e" for="' + id + '-e"><span class="unit">' + t('jE') + '</span><input id="' + id + '-e" type="text" inputmode="decimal" data-bind="' + b + 'e" data-num="1" data-empty="1" value="' + esc(own.e || '') + '" placeholder="' + E.num(j.defE) + '"><span class="unit">mm</span></label></div>';
    return '<div class="jc-row' + (j.custom ? ' custom' : '') + (S.jcSel && S.jcSel.key === j.key ? ' sel' : '') + '" data-jck="' + j.key + '">' + name + strips + ctl + '</div>';
  }).join('');
  var jw = (inf.warnings || []).filter(function (w) { return /jungt|ekscentr|konfirmat|kaišt|sujung/i.test(w); });
  return '<div class="drwover jcover" data-act="jcclose" role="dialog" aria-modal="true"><div class="drwbox jcbox" data-stop="1"><div class="drwbar"><b>' + (lt ? 'Sujungimų patikra' : 'Joints check') + ' — ' + esc(c.name || typeName(c)) + ' · ' + fmt(c.W) + '×' + fmt(c.H) + '×' + fmt(c.D) + '</b><button type="button" class="btn ghost" data-act="jcclose" data-force="1" aria-label="' + esc(t('close')) + '">✕</button></div>' +
    '<div class="jcbody"><p class="note" style="margin:0 0 10px">' + (lt ? 'Peržiūrėkite kiekvieną jungtį: tipą, tvirtinimų skaičių ir vietas (mm nuo priekio / detalės galo). Keiskite čia pat — brėžinėlis atsinaujina iškart.' : 'Look at every joint: its type, the number of connectors and where they sit (mm from the front / the part\'s end). Change them right here — the strip updates at once.') +
      ' <span class="jc-leg"><i style="background:#b4291f"></i>' + esc(t('jtCam')) + ' <i class="o" style="border-color:#1f5fbf"></i>' + esc(t('jtConf')) + ' <i class="s" style="background:#6b6f6b"></i>' + esc(t('jtDowel')) + '</span></p>' +
      (jw.length ? '<ul class="jc-warn">' + jw.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="jc-cols"><div class="jc-view" id="jc-iso"></div><div class="jc-rows">' + rows + '</div></div></div>' +
    '<div class="jcfoot">' + (canUndo() ? '<button type="button" class="btn ghost" data-act="undo">↶ ' + (lt ? 'Atšaukti' : 'Undo') + '</button>' : '<span></span>') +
      '<button type="button" class="btn pri big" data-act="jcok">✓ ' + (need ? (lt ? 'Sujungimai patikrinti' : 'Joints are checked') : (lt ? 'Patikrinta — uždaryti' : 'Checked — close')) + '</button></div></div></div>';
}
function jointsBlock(c, r) {
  var ORDER = ['bottom', 'top', 'railF', 'railB', 'railV', 'railVH', 'railBottom', 'railBotB', 'back', 'partB', 'partT', 'partF', 'partR', 'backP', 'shelf', 'oven'];
  var oi = function (k) { var m = /^(\D+)(\d)$/.exec(k); return m ? ORDER.indexOf(m[1]) * 10 + +m[2] : ORDER.indexOf(k) * 10; };   // partitions in order: 1, 2, …
  var js = ((r && r.joints) || []).slice().sort(function (a, b) { return oi(a.key) - oi(b.key); }); if (!js.length) return '';
  var jl = function (j) { return tJ('jk_' + j.key); };
  var rows = js.map(function (j) {
    var b = 'c.cnc.joints.' + j.key + '.', own = (c.cnc.joints || {})[j.key] || {}, id = 'f-j-' + j.key;
    var sideTxt = function (x) { return '<b>' + esc(t('isoT_' + x.type)) + '</b> ' + (x.pos.length ? x.pos.map(function (a) { return E.num(Math.round(a * 10) / 10); }).join(' · ') : '—') + ' <span class="unit">mm</span>'; };
    if (j.split) return '<div class="jrow custom"><span class="jl">' + esc(jl(j)) + '</span><span class="jnums jman jsplit"><span><span class="unit">' + t('sideL') + ':</span> ' + sideTxt(j.sides.L) + '</span><span><span class="unit">' + t('sideR') + ':</span> ' + sideTxt(j.sides.R) + '</span>' +
      '<button type="button" class="btn ghost" data-act="isosel" data-v="' + j.key + '">' + t('isoEdit') + '</button></span><button class="btn ghost jreset" data-act="jreset" data-v="' + j.key + '" title="' + t('jAuto') + '">↺ ' + t('jAuto') + '</button></div>';
    return '<div class="jrow' + (j.custom ? ' custom' : '') + '"><span class="jl">' + esc(jl(j)) + '</span>' +
      segI(b + 'type', j.type, [['confirmat', t('jtConf')], ['cam', t('jtCam')], ['dowel', t('jtDowel')]]) +
      (j.manual ? '<span class="jnums jman"><span class="unit">' + t('isoManual') + ':</span> <b>' + (j.pos.length ? j.pos.map(function (a) { return E.num(Math.round(a * 10) / 10); }).join(' · ') : '—') + '</b> <span class="unit">mm</span> <button type="button" class="btn ghost" data-act="isosel" data-v="' + j.key + '">' + t('isoEdit') + '</button></span>' :
      '<span class="jnums"><label for="' + id + '-n">' + t('jN') + '</label><input id="' + id + '-n" type="text" inputmode="numeric" data-bind="' + b + 'n" data-num="1" data-empty="1" value="' + esc(own.n || '') + '" placeholder="' + j.defN + '">' +
      '<label for="' + id + '-e">' + t('jE') + '</label><input id="' + id + '-e" type="text" inputmode="decimal" data-bind="' + b + 'e" data-num="1" data-empty="1" value="' + esc(own.e || '') + '" placeholder="' + E.num(j.defE) + '"><span class="unit">mm</span></span>') +
      (j.custom ? '<button class="btn ghost jreset" data-act="jreset" data-v="' + j.key + '" title="' + t('jAuto') + '">↺ ' + t('jAuto') + '</button>' : '<span class="badge mut">' + t('jAuto') + '</span>') + '</div>';
  }).join('');
  return '<div class="lbl" style="margin-top:4px">' + t('jTitle') + '</div><p class="note" style="margin:0 0 8px">' + t('jLead') + '</p><div class="jrows">' + rows + '</div>';
}
/* the shelves' front edge: flush with the carcass front, or set back by a few mm (one setting for the cabinet's shelves) */
function shelfFront(c) {
  var v = E.shelfSetSb ? E.shelfSetSb(engineDef(c)) : null, cur = v == null ? E.R.shelf.setback : v, pre = [0, 2, 5, 20];
  return '<div class="shfront"><div class="f"><span>' + t('shFront') + '</span>' +
    seg('c.shelfSb', pre.indexOf(cur) >= 0 ? cur : 'x', pre.map(function (n) { return [n, n ? '−' + n + ' mm' : t('shFlush')]; })) + '</div>' +
    fN(t('shOther'), 'c.shelfSb', fmt(cur), 's') + '<p class="note">' + t('shFrontD') + '</p></div>';
}
/* ---- 3D construction (c.kind 'box'): boards, corners, inner boards and joints; the same choices as the model's ▣ Plokštės mode */
function cap1(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
/* joint names of a 3D construction come from the engine in Lithuanian ('Lentyna 1 – kairė') */
function boxLabel(s) { if (S.lang !== 'en') return cap1(s); var m = { 'apačia':'bottom', 'viršus':'top', 'kairė':'left', 'dešinė':'right', 'nugara':'back', 'priekis':'front', 'pertvara':'partition', 'lentyna':'shelf' };
  return cap1(String(s || '').replace(/[a-ząčęėįšųūž]+/gi, function (w) { var k = w.toLowerCase(); return m[k] || w; })); }
function tJ(k) { if (/^jk_b_/.test(k)) { var r = S._info && S._info[S.sel] && S._info[S.sel].r, j = r && (r.joints || []).filter(function (x) { return 'jk_' + x.key === k; })[0]; return j ? boxLabel(j.label) : k; } return t(k); }
/* doors and drawers of a 3D construction: one row per front group, on an opening the engine found */
function boxFrontsBlock(c, rb) {
  var fr = c.box.fronts || [], ops = rb.openings || [], nCol = (rb.comps || [[0, 0]]).length, lt0 = S.lang === 'lt';
  var rows = fr.map(function (f, i) {
    var b = 'c.box.fronts.' + i + '.', col = Math.min(nCol - 1, Math.max(0, +f.col || 0)), mine = ops.filter(function (o) { return o.col === col; });
    var cellOpts = mine.map(function (o) { return [o.cell, (o.cell + 1) + ' · ' + fmt(Math.round(o.z0)) + '–' + fmt(Math.round(o.z1)) + ' mm']; });
    var h = '<div class="bxfront k-' + (f.kind === 'drawers' ? 'drawers' : f.kind === 'cargo' ? 'cargo' : 'doors') + '"><div class="bxfhead"><span class="kind">' + t(f.kind === 'drawers' ? 'kDrawers' : f.kind === 'cargo' ? 'kCargo' : 'kDoors') + '</span>' +
      '<button class="btn ghost danger" data-act="boxfrm" data-i="' + i + '">' + t('bxRm') + '</button></div><div class="row">' +
      (nCol > 1 ? fS(t('bxFCol'), b + 'col', col, Array.from({ length:nCol }, function (_, k) { return [k, String(k + 1)]; })) : '') +
      (cellOpts.length ? fS(t('bxFCell'), b + 'cell', +f.cell || 0, cellOpts) : '<span class="note">' + t(c.box.boards.front && c.box.boards.front.on ? 'bxNoOpen' : 'bxNoOpen2') + '</span>') +
      (mine.length > 1 ? fS(t('bxFSpan'), b + 'span', +f.span || 1, mine.slice(+f.cell || 0).map(function (o, k) { return [k + 1, String(k + 1)]; })) : '') +
      '<div class="f"><span>' + t('bxFFit') + '</span>' + seg(b + 'inset', !!f.inset, [['false', t('bxOverlay')], ['true', t('bxFInset')]]) + '</div></div><div class="row" style="margin-top:8px">';
    if (f.kind === 'drawers') {
      var hwOpts = [['BLUM TANDEMBOX', 'Blum TANDEMBOX'], ['BLUM MERIVOBOX', 'Blum MERIVOBOX'], ['BLUM TANDEM', 'Blum TANDEM'], ['GTV KULKINIAI H45', t('rGtv')], ['DTC KULKINIAI H45', t('rDtc')], ['DTC PASLĖPTI', t('rDtcU')]];
      if (f.hw && !hwOpts.some(function (q) { return q[0] === f.hw; })) hwOpts.push([f.hw, f.hw]);
      h += fN(t('nDr'), b + 'nDrawers', f.nDrawers || 1, 's') + fS(t('runner'), b + 'hw', f.hw, hwOpts) +
        fS(t('rail'), b + 'rail', f.rail, railLengths(f.hw).concat(railLengths(f.hw).indexOf(num(f.rail)) < 0 ? [num(f.rail)] : []).map(function (v) { return [v, v + ' mm']; })) + mvFields(b, f);
    } else if (f.kind === 'cargo' || /^CARGO/i.test(f.hinge || '')) {
      h += fS(t('cargoHw'), b + 'cargoHw', f.cargoHw || E.cargoOf(f) || E.CARGO_HW[0], E.CARGO_HW.map(function (v) { return [v, hingeLabel(v)]; })) + '<span class="h">' + esc(t('cargoNote').replace('{w}', fmt(num(c.W)))) + '</span>';
    } else {
      h += '<div class="f"><span>' + t('nDoors') + '</span>' + seg(b + 'nDoors', String(+f.nDoors === 2 ? 2 : 1), [['1', '1'], ['2', '2']]) + '</div>' +
        fS(t('hinge'), b + 'hinge', f.hinge || 'BLUM LANKSTAI', E.DOOR_HW.map(function (v) { return [v, hingeLabel(v)]; })) +
        (+f.nDoors === 2 ? '' : '<div class="f"><span>' + t('hside') + '</span>' + seg(b + 'hingeSide', f.hingeSide || 'auto', [['auto', t('hsAuto')], ['left', t('hsL')], ['right', t('hsR')]]) + '</div>') +
        (f.hinge === 'BE FURNITŪROS' ? '' : '<div class="f"><span>' + t('hingeN') + '</span>' + seg(b + 'hingeN', +f.hingeN >= 2 ? String(Math.round(+f.hingeN)) : 'auto', [['auto', t('hsAuto')], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']]) + '</div>');
    }
    return h + '</div></div>';
  }).join('');
  return '<div class="bxfronts">' + (rows || '<p class="note" style="margin:0">' + t('bxNoFronts') + '</p>') + '</div>' +
    '<div class="addsec" style="margin-top:10px"><button class="btn addk k-doors" data-act="boxfadd" data-v="doors"><i class="kdot" aria-hidden="true"></i>' + t('bxAddDoors') + '</button><button class="btn addk k-drawers" data-act="boxfadd" data-v="drawers"><i class="kdot" aria-hidden="true"></i>' + t('bxAddDrawers') + '</button><button class="btn addk k-cargo" data-act="boxfadd" data-v="cargo"><i class="kdot" aria-hidden="true"></i>＋ ' + t('kCargo') + '</button></div>';
}
function boxEditor(c) {
  var b = 'c.', bx = c.box, inf = S._info && S._info[S.sel] ? S._info[S.sel] : null, r = inf ? inf.r : null, rb = r && r.box ? r.box : { boards:[], covers:[], comps:[[0, 0]] }, h = '';
  var tPh = function (bind, val) { var id = 'f-' + bind.replace(/\./g, '-'); return '<label class="f n s" for="' + id + '"><span>' + t('bxT') + '</span><input id="' + id + '" inputmode="decimal" type="text" data-bind="' + bind + '" data-num="1" data-empty="1" value="' + esc(val || '') + '" placeholder="' + esc(fmt(num(c.thick) || 18)) + '" autocomplete="off"></label>'; };
  var dims = '<div class="row">' + fT(t('name'), b + 'name', c.name, null, 'grow') + '</div><div class="row" style="margin-top:10px">' +
    fN(t('W'), b + 'W', c.W) + fN(t('H'), b + 'H', c.H) + fN(t('D'), b + 'D', c.D) + fN(t('thick'), b + 'thick', c.thick, 's') +
    '<span class="row" style="margin-left:auto;gap:6px">' + (c.libId ? '<button class="btn ghost libon" data-act="libunlink" title="' + esc(t('libLinkedT')) + '">★ ' + t('libLinked') + '</button>' : '<button class="btn ghost" data-act="libsave" title="' + esc(t('libSaveT')) + '">☆ ' + t('libSave') + '</button>') + '<button class="btn ghost" data-act="dup">' + t('dup') + '</button><button class="btn ghost danger" data-act="del">' + (S.confirm === 'del' ? t('delSure') : t('del')) + '</button></span></div>' +
    '<div class="row" style="margin-top:10px"><button type="button" class="btn" data-act="box3d">' + t('bx3d') + '</button></div>' + worktopBlock(c);
  h += step(1, t('s1'), t('bxS1l'), dims, 'dims');
  /* 2 — the six outer boards and their corners */
  var rows = '<div class="bxrows">' + E.BOX_IDS.map(function (id) { var s0 = bx.boards[id], bb = b + 'box.boards.' + id + '.';
    return '<div class="bxrow' + (s0.on ? '' : ' off') + '">' + chk(bb + 'on', s0.on, '<b>' + t('bx_' + id) + '</b>') +
      (s0.on ? fN(t('bxInset'), bb + 'inset', s0.inset || 0, 's') + tPh(bb + 'T', s0.T) : '') + '</div>'; }).join('') + '</div>';
  var cv = rb.covers.map(function (k) { var other = k.by === k.a ? k.b : k.a;
    return '<div class="bxcorner"><span>' + t('bx_' + k.a) + ' – ' + t('bx_' + k.b).toLowerCase() + '</span>' +
      (k.forced ? '<span class="note">' + t('bx_' + k.by) + ' ' + t('bxCovers') + ' · ' + t('bxForced') + '</span>' :
        '<div class="seg" role="group">' + [k.a, k.b].map(function (w) { return '<button type="button" data-act="boxcover" data-v="' + k.key + '" data-w="' + w + '" class="' + (k.by === w ? 'on' : '') + '" aria-pressed="' + (k.by === w) + '">' + t('bx_' + w) + ' ' + t('bxCovers') + '</button>'; }).join('') + '</div>') + '</div>'; }).join('');
  h += step(2, t('bxS2'), t('bxS2l'), rows + (cv ? '<div class="lbl" style="margin-top:14px">' + t('bxCorners') + '</div><div class="bxcorners">' + cv + '</div>' : ''), 'boards');
  /* 3 — partitions and shelves */
  var inner = bx.inner.map(function (q, i) { var bb = b + 'box.inner.' + i + '.', rbd = rb.boards.filter(function (x) { return x.id === 'i' + q.id; })[0];
    var miss = !rbd ? ' <span class="badge mut">' + (S.lang === 'lt' ? 'praleista' : 'skipped') + '</span>' : '';
    if (q.kind === 'part') return '<div class="bxitem"><span class="kind">' + t('bxPart') + (rbd ? ' ' + rbd.lt.replace(/\D+/g, '') : '') + miss + '</span>' + fN(t('bxX'), bb + 'x', q.x) + tPh(bb + 'T', q.T) +
      '<button class="btn ghost danger" data-act="boxrm" data-i="' + i + '">' + t('bxRm') + '</button></div>';
    return '<div class="bxitem"><span class="kind">' + t('bxShelf') + (rbd ? ' ' + rbd.lt.replace(/\D+/g, '') : '') + miss + '</span>' + fN(t('bxZ'), bb + 'z', q.z) +
      (rb.comps.length > 1 ? fS(t('bxCol'), bb + 'col', +q.col || 0, rb.comps.map(function (cp, k) { return [k, String(k + 1)]; })) : '') +
      '<div class="f"><span>&nbsp;</span>' + seg(bb + 'adj', !!q.adj, [['false', t('bxFixed')], ['true', t('bxAdj')]]) + '</div>' +
      '<button class="btn ghost danger" data-act="boxrm" data-i="' + i + '">' + t('bxRm') + '</button></div>'; }).join('');
  var anyAdj = bx.inner.some(function (q) { return q.kind === 'shelf' && q.adj; });
  h += step(3, t('bxS3'), t('bxS3l'), '<div class="bxinner">' + (inner || '<p class="note" style="margin:0">' + t('bxNoInner') + '</p>') + '</div>' +
    '<div class="addsec" style="margin-top:10px"><button class="btn" data-act="boxadd" data-v="shelf">' + t('bxAddShelf') + '</button><button class="btn" data-act="boxadd" data-v="part">' + t('bxAddPart') + '</button></div>' +
    (anyAdj ? '<div class="row" style="margin-top:10px">' + chk(b + 'box.pinRow', bx.pinRow, t('bxPinRow')) + '</div>' : '') +
    (bx.inner.some(function (q) { return q.kind === 'shelf'; }) ? shelfFront(c) : ''), 'inner');
  /* 4 — joints */
  var jo = '<div class="lbl">' + t('bxDefJ') + '</div><div class="choices">' + choice(b + 'cnc.joinery', c.cnc.joinery, 'confirmat', artOf('confirmat'), t('jConf'), t('jConfD')) +
    choice(b + 'cnc.joinery', c.cnc.joinery, 'cam', artOf('cam'), t('jCam'), t('jCamD')) + '</div>' + (r ? '<div style="margin-top:14px">' + jointsBlock(c, r) + '</div>' : '');
  h += step(4, t('bxS5'), t('bxS5l'), boxFrontsBlock(c, rb), 'fronts');
  h += step(5, t('bxS4'), t('bxS4l'), jo, 'joints');
  h += step(6, t('s5'), t('s5l'), matsBlock(c), 'mats');
  h += step(7, t('s6'), t('s6l'), extrasBlock(c), 'extra');
  return h;
}
function railsEditor(c) {
  var b = 'c.cnc.', r = c.cnc.rails;
  var n = (r.front !== 'none' ? 1 : 0) + (r.back === 'hv' ? 2 : r.back !== 'none' ? 1 : 0) + (r.bottom ? 1 : 0), inf0 = S._info && S._info[S.sel];
  if (inf0 && inf0.r && cur() === c) n = inf0.r.panels.filter(function (p) { return /^JUOSTA/.test(p.role); }).length;   // as many as are made (an inside back leaves some out)
  return '<div><div class="lbl">' + t('rails') + ' <span class="unit">· ' + t('rCount') + ': ' + n + '</span></div><div class="rgrid">' +
    '<span>' + t('rFront') + '</span>' + seg(b + 'rails.front', r.front, [['h', t('rFlat')], ['v', t('rStand')], ['none', t('rNone')]]) +
    '<span>' + t('rBack') + '</span>' + seg(b + 'rails.back', r.back, [['h', t('rFlat')], ['v', t('rStand')], ['hv', t('rBoth')], ['none', t('rNone')]]) +
    '<span>' + t('rBottom') + '</span>' + chk(b + 'rails.bottom', r.bottom, t('rBottomD')) +
    '<span>' + t('rW') + '</span><span class="row" style="gap:6px;align-items:center">' + fN('', b + 'railW', c.cnc.railW, 's') + '<span class="unit">mm</span></span>' +
    '</div></div>';
}
/* side section seen from the left (front on the left): carcass parts in their real proportions — mirrors the engine's layout */
function sectionSVG(c, res, side) {
  var o = c.cnc, t_ = num(c.thick) || 18, H = num(c.H), D = num(c.D);
  if (!(H > 0 && D > 0)) return '';
  var bs = o.backs || [], allS = bs.length && bs.every(function (x) { return x === 'solid'; }), bk = bs[side === 'R' ? bs.length - 1 : 0] || 'none';
  var eb = allS && o.backMount !== 'inside' ? 'top' : bk === 'solid' ? 'inside' : bk;   // what this side sees: top / inside / hdf / none
  var full = o.top === 'full', tb = eb === 'top' ? t_ : bs.indexOf('hdf') >= 0 && eb !== 'top' ? E.R.hdf.t : 0, Ds = D - tb, rw = num(o.railW) || 100, r = Object.assign({}, o.rails);
  if (full) r = { front:'none', back:'none', bottom:false };
  if (bs.some(function (x) { return x === 'solid'; }) && !(allS && o.backMount !== 'inside') && (r.back === 'v' || r.back === 'hv' || r.bottom)) { r.back = r.back === 'hv' ? 'h' : r.back === 'v' ? 'none' : r.back; r.bottom = false; }
  var bH = r.back === 'h' || r.back === 'hv', bV = r.back === 'v' || r.back === 'hv';
  var tIn = full && o.topMount === 'inside', off = full && o.topOverFacade && !tIn ? (num(o.facadeT) || 18) : 0;
  var k = Math.min(230 / H, 240 / (D + off)), pad = 14, legs = o.legs ? 10 : 0;
  var W_ = (D + off) * k + 2 * pad, H_ = H * k + 2 * pad + legs + 12;
  var flip = side === 'R';   // right side seen from the right: front on the right
  var X = function (y) { return flip ? pad + (D - y) * k : pad + (y + off) * k; }, Y = function (z) { return pad + (H - z) * k; };
  var rect = function (y0, z0, y1, z1, cls) { return '<rect class="' + cls + '" x="' + Math.min(X(y0), X(y1)).toFixed(1) + '" y="' + Y(z1).toFixed(1) + '" width="' + ((y1 - y0) * k).toFixed(1) + '" height="' + ((z1 - z0) * k).toFixed(1) + '"/>'; };
  var sv = '<svg viewBox="0 0 ' + W_.toFixed(0) + ' ' + H_.toFixed(0) + '" width="' + W_.toFixed(0) + '" xmlns="http://www.w3.org/2000/svg">';
  var hb_ = hbOf(c), bIn_ = o.bottom === 'inside';
  sv += rect(0, bIn_ ? 0 : t_, Ds, full && !tIn ? H - t_ : H, 'xs-side');
  sv += rect(0, hb_, Ds, hb_ + t_, 'xs-p');
  if (full) sv += rect(-off, H - t_, tIn ? Ds : Ds + tb, H, 'xs-p');
  if (r.front === 'h') sv += rect(0, H - t_, rw, H, 'xs-r'); else if (r.front === 'v') sv += rect(0, H - rw, t_, H, 'xs-r');
  if (bH) sv += rect(Ds - rw, H - t_, Ds, H, 'xs-r');
  if (bV) { var zv = bH ? H - t_ - rw : H - rw; sv += rect(Ds - t_, zv, Ds, zv + rw, 'xs-r'); }
  if (r.bottom) sv += rect(Ds - t_, hb_ + t_, Ds, hb_ + t_ + rw, 'xs-r');
  if (eb === 'top') sv += rect(Ds, 0, D, full && !tIn ? H - t_ : H, 'xs-b');
  else if (eb === 'inside') sv += rect(Ds - t_, t_, Ds, full || bH ? H - t_ : H, 'xs-b');
  else if (eb === 'hdf') sv += rect(Ds, 0, D, H, 'xs-hdf');
  var legYs = res && res.legs && res.legs.length ? res.legs.map(function (l) { return l.y; }).filter(function (y, i, a) { return a.indexOf(y) === i; }) : [E.R.legs.fromFront, Ds - E.R.legs.fromBack];
  if (o.legs) legYs.forEach(function (y) { sv += '<rect class="xs-leg" x="' + (X(y) - 3).toFixed(1) + '" y="' + Y(0).toFixed(1) + '" width="6" height="' + legs + '"/>'; });
  sv += connectorMarks(res, X, Y, flip ? 'DESINE' : 'KAIRE');
  sv += flip ? '<text class="xs-t" x="' + pad + '" y="' + (H_ - 3).toFixed(0) + '">' + t('xBack') + '</text><text class="xs-t" text-anchor="end" x="' + (W_ - pad).toFixed(0) + '" y="' + (H_ - 3).toFixed(0) + '">' + t('xFront') + ' ▸</text>'
             : '<text class="xs-t" x="' + pad + '" y="' + (H_ - 3).toFixed(0) + '">◂ ' + t('xFront') + '</text><text class="xs-t" text-anchor="end" x="' + (W_ - pad).toFixed(0) + '" y="' + (H_ - 3).toFixed(0) + '">' + t('xBack') + '</text>';
  return sv + '</svg>';
}
/* connectors of the left side panel, drawn where they are: face holes as dots/rings, edge bores as short strokes */
function connectorMarks(r, X, Y, role) {
  var side = r && r.panels.filter(function (p) { return p.role === role; })[0]; if (!side || !side.place) return '';
  var Pw = function (p, a, b, c) { var q = p.place; return [0, 1, 2].map(function (i) { return q.o[i] + a*q.u[i] + b*q.v[i] - c*q.n[i]; }); };
  var o = '';
  side.holes.forEach(function (h) {
    if (h.mark || h.op) return;
    var w = Pw(side, h.x, h.y, 0), cx = X(w[1]).toFixed(1), cy = Y(w[2]).toFixed(1);
    if (h.d === 15) o += '<circle class="mk-cam" cx="' + cx + '" cy="' + cy + '" r="4.6"/>';
    else if (h.through) o += '<circle class="mk-conf" cx="' + cx + '" cy="' + cy + '" r="3.2"/>';
    else if (h.d === 8 && h.depth === E.R.cam.bolt.depthFace) o += '<circle class="mk-camb" cx="' + cx + '" cy="' + cy + '" r="2.6"/>';
    else o += '<circle class="mk-dow" cx="' + cx + '" cy="' + cy + '" r="2.6"/>';
  });
  side.edges.forEach(function (e) {
    var a, b, dir, u = side.place.u, v = side.place.v;
    if (e.edge === 'x0') { a = 0; b = e.pos; dir = u; } else if (e.edge === 'x1') { a = side.L; b = e.pos; dir = u.map(function (x) { return -x; }); }
    else if (e.edge === 'y0') { a = e.pos; b = 0; dir = v; } else { a = e.pos; b = side.W; dir = v.map(function (x) { return -x; }); }
    var p0 = Pw(side, a, b, side.T/2), L = Math.max(e.depth, 20), p1 = p0.map(function (x, i) { return x + L*dir[i]; });
    var cls = e.d === 5 ? 'mk-conf' : e.depth === E.R.cam.cam.fromEdge ? 'mk-cam' : 'mk-dow';
    o += '<line class="' + cls + ' mk-l" x1="' + X(p0[1]).toFixed(1) + '" y1="' + Y(p0[2]).toFixed(1) + '" x2="' + X(p1[1]).toFixed(1) + '" y2="' + Y(p1[2]).toFixed(1) + '"/>';
  });
  return o;
}
function extrasBlock(c) {
  var rows = c.extras.map(function (x, i) {
    var b = 'c.extras.' + i + '.';
    var eb = ['e1', 'e2', 'e3', 'e4'].map(function (e, j) { var id = 'f-x-' + i + '-' + e; return '<label class="ebx" for="' + id + '"><input id="' + id + '" type="checkbox" data-bind="' + b + e + '"' + (x[e] ? ' checked' : '') + '>' + ['L1', 'L2', 'W1', 'W2'][j] + '</label>'; }).join('');
    var lab = { name:t('exName'), L:t('cL'), W:t('cW'), T:t('cT'), qty:t('cQ'), mat:t('cMat') };
    var cell = function (k, cls, list) { var id = 'f-x-' + i + '-' + k; return '<td data-l="' + esc(lab[k] || k) + '" class="xc-' + k + '"><input id="' + id + '" class="' + cls + '" type="text" data-bind="' + b + k + '"' + (cls === 'xn' ? ' data-num="1" inputmode="decimal"' : '') + ((k === 'L' || k === 'W') && !(num(x[k]) > 0) ? ' aria-invalid="true"' : '') + (list ? ' list="' + list + '"' : '') + ' value="' + esc(x[k]) + '" aria-label="' + k + '" autocomplete="off"></td>'; };
    var plin = x.kind === 'plinth' ? '<tr class="xside"><td colspan="8"><div class="row" style="gap:10px;align-items:flex-end">' + fN(t('plYf'), b + 'yf', x.yf == null ? '' : x.yf, 's') + '</div><p class="note" style="margin:6px 0 0">' + t('plYfH') + '</p></td></tr>' : '';
    var side = x.kind === 'side' ? '<tr class="xside"><td colspan="8"><div class="row" style="gap:10px;align-items:flex-end">' +
      '<div class="f"><span>' + t('exWhere') + '</span>' + seg(b + 'side', x.side === 'L' || x.side === 'R' ? x.side : '', [['L', t('rmSideL')], ['R', t('rmSideR')], ['', t('exSideNone')]]) + '</div>' +
      fN(t('exZb'), b + 'zb', x.zb == null ? 0 : x.zb, 's') + fN(t('exYf'), b + 'yf', x.yf == null ? '' : x.yf, 's') + '</div><p class="note" style="margin:6px 0 0">' + t('exSideNote') + '</p></td></tr>' : '';
    return '<tr' + (x.kind === 'side' ? ' class="xsidehead"' : '') + '>' + cell('name', 'xt') + cell('L', 'xn') + cell('W', 'xn') + cell('T', 'xn') + cell('qty', 'xn') + cell('mat', 'xt', 'dl-mat') + '<td data-l="' + esc(t('exEdges')) + '" class="xc-eb"><span class="ebs">' + eb + '</span></td><td class="xc-rm"><button class="xbtn" data-act="rmx" data-i="' + i + '" aria-label="' + t('rm') + '" title="' + t('rm') + '">✕</button></td></tr>' + side + plin;
  }).join('');
  return (c.extras.length ? '<div class="tablewrap xtab"><table><thead><tr><th>' + t('exName') + '</th><th class="n">' + t('cL') + '</th><th class="n">' + t('cW') + '</th><th class="n">' + t('cT') + '</th><th class="n">' + t('cQ') + '</th><th>' + t('cMat') + '</th><th>' + t('exEdges') + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="note" style="margin:0 0 8px">' + t('exNone') + '</p>') +
    '<div class="row" style="margin-top:10px"><button class="btn" data-act="addx" data-v="part">＋ ' + t('exAdd') + '</button><button class="btn" data-act="addx" data-v="plinth">＋ ' + t('exPlinth') + '</button><button class="btn" data-act="addx" data-v="side">＋ ' + t('exSideAdd') + '</button></div>' + plinthFitBlock(c);
}
/* a loose panel (Baldai: Plokštė): its size, material, edges; where it stands is set in Baldai */
function panelEditor(c) {
  var b = 'c.', pe = c.pe || {};
  var eb = [['e1', t('pnE1')], ['e2', t('pnE2')], ['e3', t('pnE3')], ['e4', t('pnE4')]].map(function (e) { var id = 'f-pe-' + e[0]; return '<label class="ebx" for="' + id + '"><input id="' + id + '" type="checkbox" data-bind="c.pe.' + e[0] + '"' + (pe[e[0]] !== false ? ' checked' : '') + '>' + e[1] + '</label>'; }).join('');
  var body = '<div class="row">' + fT(t('name'), b + 'name', c.name, null, 'grow') + '</div>' +
    '<div class="row" style="margin-top:10px">' + fN(t('rmThick'), b + 'W', c.W, 's') + fN(t('H'), b + 'H', c.H) + fN(t('D'), b + 'D', c.D) +
    '<span class="row" style="margin-left:auto;gap:6px">' + (c.libId ? '<button class="btn ghost libon" data-act="libunlink" title="' + esc(t('libLinkedT')) + '">★ ' + t('libLinked') + '</button>' : '<button class="btn ghost" data-act="libsave" title="' + esc(t('libSaveT')) + '">☆ ' + t('libSave') + '</button>') + '<button class="btn ghost" data-act="dup">' + t('dup') + '</button><button class="btn ghost danger" data-act="del">' + (S.confirm === 'del' ? t('delSure') : t('del')) + '</button></span></div>' +
    '<div class="row" style="margin-top:10px">' + reqF(fT(t('rmPMat'), b + 'mat.carc', c.mat.carc, 'dl-mat'), c.mat.carc) + fT(t('pnEdgeMat'), b + 'edge.carc', c.edge.carc, 'dl-edge') + '</div>' +
    '<div class="f" style="margin-top:10px"><span>' + t('pnEdges') + '</span><span class="ebs">' + eb + '</span></div>' +
    '<p class="note" style="margin:10px 0 0">' + t('pnNote') + '</p>' +
    '<div class="lookwrap"><h4>' + t('lookT') + '</h4><p class="note">' + t('lookL') + '</p>' + lookBlock(lookNames([c])) + '</div>';
  return step(1, t('pnS1'), t('pnS1l'), body, 'dims');
}
/* legs: how many in a row across the width, how many rows, and where they land (plan view, front at the bottom) */
function bottomPic(inside, cam) {   // tiny front section: where the bottom sits; cam 'in' (on its top face) / 'out' (underneath)
  var s = '<svg viewBox="0 0 64 40" width="64" height="40"><g fill="#c9cfc8" stroke="#56635b" stroke-width="1">';
  if (inside) s += '<rect x="4" y="4" width="6" height="34"/><rect x="54" y="4" width="6" height="34"/><rect x="10" y="24" width="44" height="6" fill="#2448c9" fill-opacity=".35" stroke="#2448c9"/>' + camMarks(10, 54, 24, 30, cam === 'in' ? 'a' : cam === 'out' ? 'b' : null);
  else s += '<rect x="4" y="4" width="6" height="26"/><rect x="54" y="4" width="6" height="26"/><rect x="4" y="30" width="56" height="6" fill="#2448c9" fill-opacity=".35" stroke="#2448c9"/>';
  return s + '</g></svg>';
}
function legsEditor(c, r) {
  var o = c.cnc, b = 'c.cnc.', nC = colsOf(c), W = num(c.W), fs = E.R.legs.fromSide, lx = o.legsX || 2, ly = +o.legsY === 3 ? 3 : 2;
  var opts = [2, 3, 4, 5, 6].map(function (n) { return [n, String(n), (W - 2 * fs) / (n - 1) < 70]; });
  var segX = '<div class="seg" role="group">' + opts.map(function (q) { var on = String(lx) === String(q[0]);
      return '<button type="button" data-act="set" data-bind="' + b + 'legsX" data-v="' + q[0] + '" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '"' + (q[2] && !on ? ' disabled title="' + esc(t('legDense')) + '"' : '') + '>' + q[1] + '</button>'; }).join('') +
    (nC > 1 ? '<button type="button" data-act="set" data-bind="' + b + 'legsX" data-v="parts" class="' + (lx === 'parts' ? 'on' : '') + '" aria-pressed="' + (lx === 'parts') + '">' + t('legParts') + '</button>' : '') + '</div>';
  var n = r && r.legs ? r.legs.length : 0;
  if (o.feet) segX = nC > 1 ? seg(b + 'legsX', lx === 'parts' ? 'parts' : '2', [['2', t('feetSides')], ['parts', t('feetParts')]]) : '';
  return '<div class="legs-ed"><div class="legs-f">' + (segX ? '<div class="f"><span>' + t(o.feet ? 'feetRow' : 'legRow') + '</span>' + segX + '</div>' : '') +
    '<div class="f"><span>' + t('legRows') + '</span>' + seg(b + 'legsY', ly, [[2, t('legRows2')], [3, t('legRows3')]]) + '</div>' +
    (o.feet ? '<div class="f"><span>&nbsp;</span><span class="unit feetnote">' + t('feetNote') + '</span></div>' : fN(t('legH'), 'c.legH', c.legH, 's')) + '</div>' +
    '<figure class="legplan">' + legPlanSVG(c, r) + '<figcaption>' + t(o.feet ? 'feetTotal' : 'legTotal') + ': <b>' + n + '</b> ' + (S.lang === 'lt' ? 'vnt.' : 'pcs') + '</figcaption></figure></div>';
}
function legPlanSVG(c, r) {
  if (!r || !r.dims) return '';
  var W = r.dims.W, bot = (r.panels || []).filter(function (p) { return p.role === 'DUGNAS'; })[0], Dd = bot ? (Math.abs(bot.L - W) < 0.01 ? bot.W : bot.L) : r.dims.D;
  var k = Math.min(260 / W, 120 / Dd), pad = 8, w = W * k + 2 * pad, h = Dd * k + 2 * pad + 14;
  var X = function (x) { return pad + x * k; }, Y = function (y) { return pad + (Dd - y) * k; };   // plan view, the front at the bottom
  var sv = '<svg viewBox="0 0 ' + w.toFixed(0) + ' ' + h.toFixed(0) + '" width="' + w.toFixed(0) + '" xmlns="http://www.w3.org/2000/svg">' +
    '<rect class="lp-bot" x="' + pad + '" y="' + pad + '" width="' + (W * k).toFixed(1) + '" height="' + (Dd * k).toFixed(1) + '" rx="2"/>';
  var nC = colsOf(c), cw = colWidths(c), x = 0;
  for (var q = 0; q < nC - 1; q++) { x += cw[q]; sv += '<line class="lp-part" x1="' + X(x).toFixed(1) + '" y1="' + pad + '" x2="' + X(x).toFixed(1) + '" y2="' + (pad + Dd * k).toFixed(1) + '"/>'; }
  (r.legs || []).forEach(function (l) { sv += '<circle class="lp-plate" cx="' + X(l.x).toFixed(1) + '" cy="' + Y(l.y).toFixed(1) + '" r="' + Math.max(3, 30 * k).toFixed(1) + '"/><circle class="lp-leg" cx="' + X(l.x).toFixed(1) + '" cy="' + Y(l.y).toFixed(1) + '" r="' + Math.max(2.2, 20 * k).toFixed(1) + '"/>'; });
  sv += '<text class="lp-t" x="' + (w / 2).toFixed(0) + '" y="' + (h - 3).toFixed(0) + '" text-anchor="middle">▼ ' + t('legFront') + '</text>';
  return sv + '</svg>';
}
function artOf(type) { return window.DBArt ? '<span class="cart">' + window.DBArt.pic(type, t('isoT_' + type)) + '</span>' : ico(type === 'cam' ? 'cam' : 'conf'); }
function choice(bind, val, v, icon, title, desc) { return '<button type="button" class="choice' + (val === v ? ' on' : '') + '" data-act="set" data-bind="' + bind + '" data-v="' + v + '" aria-pressed="' + (val === v) + '">' + icon + '<span><b>' + title + '</b><small>' + desc + '</small></span></button>'; }
/* LED profile grooves: where, which face, how far from the front, open or closed ends — routed as step2xxl does (T=96, ramp, 2 mm skin) */
function ledAtName(at) { return t({ bottom:'ledBottom', top:'ledTop', L:'ledL', R:'ledR' }[at]); }
/* the engine moved this groove off holes (or found no room): its note under the LED row */
function ledMoved(k) {
  var inf = S._info && S._info[S.sel], ws = (inf && inf.r && inf.r.warnings) || [], w = ws.filter(function (x) { return x.indexOf('LED ' + (k + 1) + ': LED griovelis k') === 0; })[0];
  return w ? '<p class="note" style="margin:4px 0 0;flex-basis:100%;color:var(--warn,#a5560b)">⚠ ' + esc(w.replace(/^LED \d+: /, '')) + '</p>' : '';
}
function ledBlock(c) {
  var b = 'c.leds.', ls = c.leds || [];
  return '<div class="ledblk" id="st-led"><div class="lbl">' + t('ledT') + ' <span class="unit">· ' + t('ledL2') + '</span></div>' +
    (ls.length ? ls.map(function (l, k) {
      return '<div class="ledrow"><b class="ledno">' + (k + 1) + '</b>' + fS(t('ledAt'), b + k + '.at', l.at, [['bottom', t('ledBottom')], ['top', t('ledTop')], ['L', t('ledL')], ['R', t('ledR')]]) +
        '<div class="f"><span>' + t('ledSide') + '</span>' + seg(b + k + '.side', l.side, [['in', t('ledIn')], ['out', t('ledOut')]]) + '</div>' +
        fN(t('ledFrom'), b + k + '.from', l.from, 's') +
        '<div class="f"><span>' + t('ledEnds') + '</span>' + seg(b + k + '.ends', l.ends, [['open', t('ledOpen')], ['closed', t('ledClosed')]]) + '</div>' +
        '<button type="button" class="btn ghost danger" data-act="leddel" data-i="' + k + '" aria-label="' + esc(t('del')) + '">✕</button>' +
        ledMoved(k) + '</div>'; }).join('') : '<p class="note" style="margin:2px 0 6px">' + t('ledNone') + '</p>') +
    '<div class="ledadd"><span class="unit">' + t('ledAddL') + '</span>' + ['bottom', 'top', 'L', 'R'].map(function (at) { return '<button type="button" class="btn" data-act="ledadd" data-v="' + at + '">＋ ' + esc(ledAtName(at)) + '</button>'; }).join('') + '</div>' +
    '<p class="note" style="margin:6px 0 0">' + t('ledNote') + '</p></div>';
}
function opRow(bind, on, title, desc, verified, applies, more) {
  var id = 'f-' + bind.replace(/\./g, '-');
  return '<div class="op' + (on ? '' : ' off') + (applies ? '' : ' na') + '"><input id="' + id + '" type="checkbox" data-bind="' + bind + '"' + (on ? ' checked' : '') + '>' +
    '<label for="' + id + '" style="cursor:pointer"><b>' + title + '</b><small>' + desc + (applies ? '' : ' · <i>' + t('notNeeded') + '</i>') + '</small>' + (on && more && applies ? '<div class="more">' + more + '</div>' : '') + '</label>' +
    '<span class="badge ' + (verified ? 'ok' : 'warn') + '">' + (verified ? t('verified') : t('unverified')) + '</span></div>';
}
function matsBlock(c) {
  var b = 'c.', hasFront = c.dishwasher || c.sections.some(function (s) { return s.kind === 'drawers' || s.kind === 'doors' || s.kind === 'cargo'; }) || !!(c.kind === 'box' && c.box && c.box.fronts && c.box.fronts.length);
  var req = function (html, val) { return html.replace('<span>', '<span>').replace('</span>', ' <i class="req" aria-hidden="true">*</i></span>').replace('type="text"', 'type="text" required' + (val ? '' : ' aria-invalid="true"')); };
  return matDock(c) + '<p class="note reqnote"><i class="req">*</i> ' + t('reqNote') + '</p><div class="row">' + (c.dishwasher ? fT(t('mCarc'), b + 'mat.carc', c.mat.carc, 'dl-mat') : req(fT(t('mCarc'), b + 'mat.carc', c.mat.carc, 'dl-mat'), c.mat.carc)) + (hasFront ? req(fT(t('mFac'), b + 'mat.facade', c.mat.facade, 'dl-mat'), c.mat.facade) : fT(t('mFac'), b + 'mat.facade', c.mat.facade, 'dl-mat')) + (c.dishwasher ? '' : fT(t('mBack'), b + 'mat.back', c.mat.back, 'dl-mat')) + (!c.dishwasher && c.kind !== 'box' && c.cnc && c.cnc.top === 'full' ? fT(t('mTop'), b + 'mat.top', c.mat.top || '', 'dl-mat').replace('type="text"', 'type="text" placeholder="' + esc(c.mat.carc || t('mTopPh')) + '"') : '') +
      (usesMerivo(c) ? fT(t('mDrw'), b + 'mat.drawer', c.mat.drawer || '', 'dl-mat').replace('type="text"', 'type="text" placeholder="' + esc(c.mat.carc || t('mTopPh')) + '"') : '') + '</div>' +
    '<div class="row" style="margin-top:10px">' + fT(t('eCarc'), b + 'edge.carc', c.edge.carc, 'dl-edge') + fT(t('eFac'), b + 'edge.facade', c.edge.facade, 'dl-edge') + '</div>' +
    '<div class="lookwrap"><h4>' + t('lookT') + '</h4><p class="note">' + t('lookL') + '</p>' + lookBlock(lookNames([c])) + '</div>';
}
/* how the board materials look in the 3-D views: a texture photo or a colour, per material name (S.proj.look, see DBLook) */
/* the realistic picture's material arrows: a cabinet's front / carcass / worktop material set from there; the names to step through
   (those with a texture or colour first, then the project's and the settings' materials) */
/* materials dragged onto the boards of the 3-D picture: each lands in the cabinet's setting the board takes its material from */
function matDock(c) {
  var names = pickMats().slice(0, 24); if (!names.length) return '';
  var col = function (n) { try { return window.DBLook && window.DBLook.color ? window.DBLook.color(n, S.proj.look) : null; } catch (e) { return null; } };
  return '<div class="matdock"><div class="lbl">' + t('mdT') + '</div><div class="mdchips">' + names.map(function (n) { var cc = col(n);
    return '<span class="mdchip" draggable="true" data-mdmat="' + esc(n) + '" title="' + esc(t('mdChipT')) + '"><i style="background:' + esc(cc || '#d9d6cf') + '"></i>' + esc(n) + '</span>'; }).join('') + '</div><p class="note" style="margin:4px 0 0">' + t('mdNote') + '</p></div>';
}
function matTarget(c, part) {   // which setting a board's material comes from: [key, label]
  if (!part) return null;
  if (part.kind === 'worktop') return ['worktop', t('mdWt')];
  if (part.kind === 'plinth') return ['plinth', t('exPlinth')];
  var role = part.role || '';
  if (role === 'FASADAS' || role === 'DURYS') return ['facade', t('mFac')];
  if (role === 'VIRSUS' && c.cnc && c.cnc.top === 'full') return ['top', t('mTop')];
  if (role === 'NUGARA' || role === 'PLAUSAS') return ['back', t('mBack')];
  if (role === 'KAIRE' || role === 'DESINE') return ['side' + (role === 'KAIRE' ? 'L' : 'R'), t('mCarc')];
  return ['carc', t('mCarc')];
}
function dropMat(c, part, name) {
  var tg = matTarget(c, part); if (!tg || !name) return;
  var k = tg[0], lab = tg[1];
  if (k === 'worktop') { c.worktop = c.worktop || {}; c.worktop.mat = name; }
  else if (k === 'plinth') { var pi = plinthIdx(c); if (pi >= 0) c.extras[pi].mat = name; }
  else if (k === 'sideL' || k === 'sideR') {   // a side in the fronts' material: a visible side; otherwise the carcass
    if (name === c.mat.facade && name !== c.mat.carc) { c.vis = Object.assign({}, c.vis || {}); c.vis[k === 'sideL' ? 'L' : 'R'] = true; lab = k === 'sideL' ? t('visL') : t('visR'); }
    else c.mat.carc = name;
  } else c.mat[k] = name;
  save(); render(); toast('„' + name + '“ → ' + lab);
}
var MD = { name:null, tip:null };
document.addEventListener('dragstart', function (e) {
  var ch = e.target && e.target.closest ? e.target.closest('[data-mdmat]') : null; if (!ch) return;
  MD.name = ch.getAttribute('data-mdmat'); try { e.dataTransfer.setData('text/plain', MD.name); e.dataTransfer.effectAllowed = 'copy'; } catch (x) {}
  document.body.classList.add('mddrag');
});
document.addEventListener('dragend', function () { MD.name = null; document.body.classList.remove('mddrag'); if (MD.tip) MD.tip.remove(); MD.tip = null; });
var mdOver = function (e) { var ap = document.getElementById('assembly-preview'); return MD.name && ap && e.target && ap.contains(e.target) ? ap : null; };
document.addEventListener('dragover', function (e) {
  var ap = mdOver(e); if (!ap) return; e.preventDefault(); try { e.dataTransfer.dropEffect = 'copy'; } catch (x) {}
  var c = cur(), part = window.DBAssembly && window.DBAssembly.pickAt ? window.DBAssembly.pickAt(e.clientX, e.clientY) : null, tg = c ? matTarget(c, part) : null;
  if (!MD.tip) { MD.tip = document.createElement('div'); MD.tip.className = 'mdtip'; document.body.appendChild(MD.tip); }
  MD.tip.style.left = (e.clientX + 14) + 'px'; MD.tip.style.top = (e.clientY + 14) + 'px';
  MD.tip.textContent = tg ? '„' + MD.name + '“ → ' + tg[1] : t('mdNone');
});
document.addEventListener('drop', function (e) {
  var ap = mdOver(e); if (!ap) return; e.preventDefault();
  var c = cur(), part = window.DBAssembly && window.DBAssembly.pickAt ? window.DBAssembly.pickAt(e.clientX, e.clientY) : null, name = MD.name;
  if (MD.tip) MD.tip.remove(); MD.tip = null; MD.name = null; document.body.classList.remove('mddrag');
  if (c && part) dropMat(c, part, name); else toast(t('mdNone'), true);
});
function setMatOf(c, part, name) {
  if (part === 'worktop') { c.worktop = c.worktop || {}; c.worktop.mat = name; } else { c.mat = c.mat || {}; c.mat[part] = name; }
  save(); render();
}
function pickMats() {
  var out = [], add = function (n) { n = String(n || '').trim(); if (n && out.indexOf(n) < 0) out.push(n); }, lk = S.proj.look || {};
  Object.keys(lk).forEach(add); lookNames(S.proj.cabinets).forEach(add); (S.settings.materials || []).forEach(add);
  return out.sort(function (a, b) { return (!lk[a]) - (!lk[b]); });
}
function lookNames(cabs) {
  var out = []; cabs.forEach(function (c) { if (!c) return; var m = c.mat || {};
    [m.facade, m.carc, m.back, m.top].concat((c.extras || []).map(function (x) { return x && x.mat; })).concat(c.worktop && c.worktop.on ? [c.worktop.mat] : [])
      .forEach(function (n) { n = String(n || '').trim(); if (n && out.indexOf(n) < 0) out.push(n); }); });
  return out;
}
function lookBlock(names, room) {
  if (!names.length) return '<p class="note">' + t('lookNone') + '</p>';
  var lk = (S.proj && S.proj.look) || {};
  return '<div class="looks">' + names.map(function (n, k) {
    var l = lk[n] || {}, col = l.color || (window.DBFront ? window.DBFront.matColor(n, '#e5e2da') : '#e5e2da'), id = 'f-look-' + (room ? 'r' : 'c') + k;
    if (!/^#[0-9a-f]{6}$/i.test(col)) col = '#e5e2da';
    return '<div class="look" data-look="' + esc(n) + '"><span class="lk-sw" style="background-color:' + col + (l.tex ? ';background-image:url(' + esc(l.tex) + ')' : '') + '"></span><b title="' + esc(n) + '">' + esc(n) + '</b><span class="lk-acts">' +
      '<label class="btn sm" for="' + id + '">' + (l.tex ? t('lookChange') : t('lookUp')) + '</label><input id="' + id + '" type="file" accept="image/*" data-act-change="looktex" data-v="' + esc(n) + '" hidden>' +
      '<button type="button" class="btn sm" data-act="lookpaste" data-v="' + esc(n) + '" title="' + esc(t('lookPasteT')) + '">' + t('lookPaste') + '</button>' +
      '<input type="color" class="lk-col" value="' + col + '" data-act-change="lookcol" data-v="' + esc(n) + '" title="' + esc(t('lookCol')) + '" aria-label="' + esc(t('lookCol') + ' · ' + n) + '">' +
      (l.tex ? '<button type="button" class="btn sm' + (l.fit !== false ? ' on' : '') + '" data-act="lookfit" data-v="' + esc(n) + '" aria-pressed="' + (l.fit !== false) + '" title="' + esc(t('lookFitT')) + '">' + t('lookFit') + '</button>' +
        (l.fit === false ? '<label class="lk-mm" title="' + esc(t('lookFitT')) + '"><span>' + t('lookMm') + '</span><input type="text" inputmode="decimal" value="' + esc(l.mm || 1000) + '" data-act-change="lookmm" data-v="' + esc(n) + '" aria-label="' + esc(t('lookMm') + ' · ' + n) + '"><span class="unit">mm</span></label>' : '') +
        '<button type="button" class="btn sm' + (l.rot ? ' on' : '') + '" data-act="lookrot" data-v="' + esc(n) + '" aria-pressed="' + !!l.rot + '" title="' + esc(t('lookRot')) + '">↻ 90°</button>' : '') +
      (l.tex || l.color ? '<button type="button" class="xbtn" data-act="lookrm" data-v="' + esc(n) + '" title="' + esc(t('lookRm')) + '" aria-label="' + esc(t('lookRm') + ' · ' + n) + '">✕</button>' : '') + '</span></div>'; }).join('') + '</div>';
}
/* a texture from the clipboard: "Paste" reads it (the browser may ask once); without that, the next Ctrl+V goes to this material.
   Ctrl+V also works on its own while a material's row has the focus, and an image can be dropped on a row. */
function lookPaste(name) {
  S.lookPasteTo = { name:name, until:Date.now() + 60000 };
  var ask = function () { toast(t('lookCtrlV').replace('{n}', name)); };
  if (!(navigator.clipboard && navigator.clipboard.read)) { ask(); return; }
  navigator.clipboard.read().then(function (items) {
    for (var i = 0; i < items.length; i++) { var ty = items[i].types.filter(function (x) { return /^image\//.test(x); })[0];
      if (ty) return items[i].getType(ty).then(function (blob) { S.lookPasteTo = null; lookTexture(name, blob); }); }
    toast(t('lookNoImg'), true);
  }).catch(ask);
}
function imageOf(list) { for (var i = 0; list && i < list.length; i++) { var it = list[i], f = it.getAsFile ? (it.kind === 'file' && /^image\//.test(it.type) ? it.getAsFile() : null) : (/^image\//.test(it.type) ? it : null); if (f) return f; } return null; }
document.addEventListener('paste', function (e) {
  if (!S.proj || !e.clipboardData) return;
  var f = imageOf(e.clipboardData.items) || imageOf(e.clipboardData.files); if (!f) return;
  var to = S.lookPasteTo && S.lookPasteTo.until > Date.now() ? S.lookPasteTo.name : null, ae = document.activeElement, row = ae && ae.closest && ae.closest('[data-look]');
  if (row) to = row.getAttribute('data-look');
  if (!to) { var rows = document.querySelectorAll('[data-look]'); if (rows.length === 1) to = rows[0].getAttribute('data-look'); }   // only one material shown: that one
  if (!to) { if (rows.length) toast(t('lookPick'), true); return; }
  e.preventDefault(); S.lookPasteTo = null; lookTexture(to, f);
});
document.addEventListener('dragover', function (e) { var row = e.target && e.target.closest && e.target.closest('[data-look]'); if (!row || !e.dataTransfer || [].indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; row.classList.add('drop'); });
document.addEventListener('dragleave', function (e) { var row = e.target && e.target.closest && e.target.closest('[data-look]'); if (row) row.classList.remove('drop'); });
document.addEventListener('drop', function (e) { var row = e.target && e.target.closest && e.target.closest('[data-look]'); if (!row || !e.dataTransfer) return; var f = imageOf(e.dataTransfer.files); e.preventDefault(); row.classList.remove('drop'); if (f) lookTexture(row.getAttribute('data-look'), f); else toast(t('lookNoImg'), true); });
function lookSet(name, fn) { S.proj.look = S.proj.look || {}; var l = Object.assign({}, S.proj.look[name] || {}); fn(l); if (!l.tex && !l.color) delete S.proj.look[name]; else S.proj.look[name] = l; save(); render(); }
/* plain margins (one colour, as round a pasted screenshot or a product photo) cut off, at most a quarter from each side → { c, w, h } */
function trimmed(im, w, h) {
  try {
    var k = Math.min(1, 400 / Math.max(w, h)), sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k)), cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
    var cx = cv.getContext('2d'); cx.drawImage(im, 0, 0, sw, sh); var d = cx.getImageData(0, 0, sw, sh).data, lum = function (x, y) { var o = (y * sw + x) * 4; return 0.3 * d[o] + 0.59 * d[o + 1] + 0.11 * d[o + 2]; };
    var flat = function (n, get) { var m = 0, q = 0; for (var i = 0; i < n; i++) { var v = get(i); m += v; q += v * v; } m /= n; return Math.sqrt(Math.max(0, q / n - m * m)) < 4; };   // nearly one colour
    var x0 = 0, x1 = sw - 1, y0 = 0, y1 = sh - 1;
    while (y0 < sh / 4 && flat(sw, function (i) { return lum(i, y0); })) y0++;
    while (y1 > sh * 3 / 4 && flat(sw, function (i) { return lum(i, y1); })) y1--;
    while (x0 < sw / 4 && flat(y1 - y0 + 1, function (i) { return lum(x0, y0 + i); })) x0++;
    while (x1 > sw * 3 / 4 && flat(y1 - y0 + 1, function (i) { return lum(x1, y0 + i); })) x1--;
    if (!x0 && !y0 && x1 === sw - 1 && y1 === sh - 1) return { c:im, w:w, h:h };
    var X0 = Math.ceil((x0 + 1) / k), Y0 = Math.ceil((y0 + 1) / k), X1 = Math.floor(x1 / k), Y1 = Math.floor(y1 / k), out = document.createElement('canvas');   // a pixel inside the edge, so no margin line is left
    out.width = Math.max(1, X1 - X0); out.height = Math.max(1, Y1 - Y0); out.getContext('2d').drawImage(im, X0, Y0, out.width, out.height, 0, 0, out.width, out.height);
    return { c:out, w:out.width, h:out.height };
  } catch (er) { return { c:im, w:w, h:h }; }
}
/* a texture photo: made smaller (at most 1280 px, JPEG) so the project stays light; then laid on every board of that material */
function lookTexture(name, file) {
  if (!file) return; var rd = new FileReader();
  rd.onload = function () { var im = new Image();
    im.onload = function () { try { var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
        var shrink = function (src, sw, sh, max) {   // halve while more than twice too big (smooth), then the last step
          var cur = src, cw = sw, ch = sh, k = Math.min(1, max / Math.max(sw, sh, 1)), tw = Math.max(1, Math.round(sw * k)), th = Math.max(1, Math.round(sh * k));
          while (cw / 2 >= tw * 1.01 && ch / 2 >= th) { var hv = document.createElement('canvas'); hv.width = Math.max(tw, Math.round(cw / 2)); hv.height = Math.max(th, Math.round(ch / 2)); var hx = hv.getContext('2d'); hx.imageSmoothingQuality = 'high'; hx.drawImage(cur, 0, 0, hv.width, hv.height); cur = hv; cw = hv.width; ch = hv.height; }
          var cv = document.createElement('canvas'); cv.width = tw; cv.height = th; var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, tw, th); cx.drawImage(cur, 0, 0, tw, th); return cv; };
        var src = trimmed(im, w, h); im = src.c; w = src.w; h = src.h;   // a screenshot's plain margins are cut off
        var url = shrink(im, w, h, 1280).toDataURL('image/jpeg', 0.86); if (url.length > 700000) url = shrink(im, w, h, 960).toDataURL('image/jpeg', 0.8);   // keeps the project small enough for the browser's storage
        lookSet(name, function (l) { l.tex = url; l.color = ''; if (!(num(l.mm) > 0)) l.mm = 1000; }); }
      catch (er) { toast(t('lookBad'), true); } };
    im.onerror = function () { toast(t('lookBad'), true); }; im.src = rd.result; };
  rd.onerror = function () { toast(t('lookBad'), true); }; rd.readAsDataURL(file);
}
/* the cabinet's own worktop: yes / no, material, thickness, overhangs */
function reqF(html, val) { return html.replace('</span>', ' <i class="req" aria-hidden="true">*</i></span>').replace('type="text"', 'type="text" required' + (val ? '' : ' aria-invalid="true"')); }
/* the cabinet's back(s): none / fibreboard / solid per column, and whether a solid back sits outside (on the back edges) or inside */
/* a drop-down bound like seg(): compact for the construction settings */
function dd(bind, val, opts, label) {
  var id = 'f-' + bind.replace(/[^\w]+/g, '-');
  return '<label class="f dd" for="' + id + '">' + (label ? '<span>' + label + '</span>' : '') + '<select id="' + id + '" data-bind="' + bind + '">' +
    opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
}
function backBlock(c) {
  var o = c.cnc, b = 'c.cnc.', nC = colsOf(c), bs = (o.backs || []).slice(0, nC), anyS = bs.indexOf('solid') >= 0, allS = bs.length === nC && bs.every(function (x) { return x === 'solid'; });
  var mount = allS && o.backMount !== 'inside' ? 'top' : 'inside', h = '<div class="lbl" style="margin-top:14px">' + t('backOf') + '</div><div class="row bottomrow">';
  for (var k = 0; k < nC; k++) h += dd(b + 'backs.' + k, bs[k] || 'none', [['none', t('bNone')], ['hdf', t('bHdf')], ['solid', t('bSolid')]], nC > 1 ? colName(nC, k) : t('bKind'));
  if (anyS) h += dd(b + 'backMount', allS ? (o.backMount === 'inside' ? 'inside' : 'top') : 'inside', [['top', t('bTop')], ['inside', t('bIn')]], t('backMountL'));
  var inf1 = S._info && S._info[S.sel], jb = cur() === c && inf1 && inf1.r ? (inf1.r.joints || []).filter(function (j) { return j.key === 'back'; })[0] : null;
  var bfix = jb ? (jb.split ? 'mixed' : jb.type) : (mount === 'top' && o.backFix === 'cam' ? 'cam' : 'confirmat');   // how the solid back is fixed, as the engine has it
  if (anyS) h += dd(b + 'backJoint', bfix === 'mixed' ? 'confirmat' : bfix, [['confirmat', t('jtConf')], ['cam', t('jtCam')], ['dowel', t('jtDowel')]], t('bFixL'));
  var kind = anyS ? (mount === 'top' ? 'out' : 'in') : bs.indexOf('hdf') >= 0 ? 'hdf' : 'none';
  var kCam = kind === 'in' && bfix === 'cam' ? ((o.camOut || {}).back ? 'out' : 'in') : null;
  h += camPick('back', backPic(kind, kCam), kCam) + '</div>';
  if (allS && mount === 'inside') {   // the inside back's ends: on the bottom / under the top, or covering them (the bottom / top stop at the back)
    var cv = o.backCover || {}, canB = o.bottom === 'inside', canT = o.top === 'full' ? o.topMount === 'inside' : (o.rails && (o.rails.back === 'h') && nC === 1);
    if (canB || canT) h += '<div class="row bkcov" style="margin-top:10px;gap:10px;align-items:flex-end">' +
      (canB ? dd(b + 'backCover.bottom', cv.bottom ? 'true' : 'false', [['false', t('bcBotOn')], ['true', t('bcBotCov')]], t('bcBotL')) : '') +
      (canT ? dd(b + 'backCover.top', cv.top ? 'true' : 'false', [['false', o.top === 'full' ? t('bcTopOn') : t('bcRailOn')], ['true', o.top === 'full' ? t('bcTopCov') : t('bcRailCov')]], t('bcTopL')) : '') + '</div>';
  }
  if (anyS && mount === 'inside') {   // the inside back: how far in from the back edge (or, the same thing, where its front face is from the cabinet front)
    var tb0 = bs.indexOf('hdf') >= 0 ? (+E.R.hdf.t || 3) : 0, t0 = num(c.thick) || 18, inset = Math.max(0, num(o.backInset) || 0), fromF = num(c.D) - tb0 - inset - t0;
    h += '<div class="row bkin" style="margin-top:10px;align-items:flex-end;gap:10px">' + fN(t('bkInset'), b + 'backInset', fmt(inset), 's') +
      '<label class="f n s" for="f-bk-front"><span>' + t('bkFront') + '</span><input id="f-bk-front" inputmode="decimal" type="text" data-bkfront="' + (num(c.D) - tb0 - t0) + '" value="' + esc(fmt(fromF)) + '" autocomplete="off"></label>' +
      '</div><p class="note" style="margin:4px 0 0">' + t('bkInsetH') + '</p>';
  }
  if (anyS && !allS && o.backMount !== 'inside') h += '<p class="note" style="margin:4px 0 0">' + t('bTopOnlyAll') + '</p>';
  if (anyS && bfix !== 'mixed') h += '<p class="note" style="margin:4px 0 0">' + t('bFix_' + (bfix === 'dowel' ? 'dowel' : mount + '_' + bfix) + (kCam === 'out' ? '_out' : '')) + '</p>';
  if (bs.indexOf('hdf') >= 0) h += '<p class="note" style="margin:4px 0 0">' + t('bHdfNote') + '</p>';
  return h;
}
/* the eccentrics on a panel between the sides, drawn on the face they are on, with an arrow pointing at that face from its side:
   y0 / y1 the panel's two faces (y0 the upper one in the picture), cam 'a' (at y0) or 'b' (at y1) */
function camMarks(x0, x1, y0, y1, at) {
  if (!at) return '';
  var y = at === 'a' ? y0 : y1, ay = at === 'a' ? y0 - 3.2 : y1 + 8.8, xs = [x0 + 5, x1 - 5];
  return xs.map(function (x) { return '<circle cx="' + x + '" cy="' + y + '" r="2.3" fill="#e8820c" stroke="#8a4a00" stroke-width=".6"/>'; }).join('') +
    '<text x="' + ((x0 + x1) / 2) + '" y="' + ay + '" font-size="8" text-anchor="middle" fill="#e8820c" stroke="none">' + (at === 'a' ? '▼' : '▲') + '</text>';
}
function backPic(kind, cam) {   // tiny plan from above: sides, and where the back sits (the wall at the top, the front at the bottom); cam 'in' / 'out'
  var s = '<svg viewBox="0 0 64 40" width="64" height="40"><g fill="#c9cfc8" stroke="#56635b" stroke-width="1">', bl = ' fill="#2448c9" fill-opacity=".35" stroke="#2448c9"';
  if (kind === 'out') s += '<rect x="4" y="10" width="6" height="28"/><rect x="54" y="10" width="6" height="28"/><rect x="4" y="4" width="56" height="6"' + bl + '/>';
  else if (kind === 'in') s += '<rect x="4" y="4" width="6" height="34"/><rect x="54" y="4" width="6" height="34"/><rect x="10" y="12" width="44" height="6"' + bl + '/>' + camMarks(10, 54, 12, 18, cam === 'out' ? 'a' : cam === 'in' ? 'b' : null);
  else if (kind === 'hdf') s += '<rect x="4" y="7" width="6" height="31"/><rect x="54" y="7" width="6" height="31"/><rect x="4" y="4" width="56" height="2.5"' + bl + '/>';
  else s += '<rect x="4" y="4" width="6" height="34"/><rect x="54" y="4" width="6" height="34"/>';
  return s + '</g></svg>';
}
/* the picture as a switch: when the joint is eccentrics, a click moves them to the panel's other face */
function camPick(key, svg, cam) {
  if (!cam) return '<figure class="botpic" aria-hidden="true">' + svg + '</figure>';
  return '<button type="button" class="botpic campick" data-act="camside" data-v="' + key + '" title="' + esc(t('camPickT')) + '" aria-label="' + esc(t('camPickT')) + '">' + svg +
    '<span class="camcap">' + (cam === 'out' ? t('camOut') : t('camIn')) + '</span></button>';
}
function jointTypeOf(c, key) {   // the joint's type as the engine has it for the open cabinet ('mixed' when the two ends differ)
  var inf = cur() === c && S._info && S._info[S.sel], j = inf && inf.r ? (inf.r.joints || []).filter(function (q) { return q.key === key; })[0] : null;
  return j ? (j.split ? 'mixed' : j.type) : null;
}
function worktopBlock(c, req) {
  req = req || reqF; var w = c.worktop || wtDefault(), b = 'c.worktop.', wt = E.worktopOf(c);
  var nE = function (label, k, val) { var id = 'f-wt-' + k; return '<label class="f n s" for="' + id + '"><span>' + label + '</span><input id="' + id + '" inputmode="decimal" type="text" data-bind="' + b + k + '" data-num="1" data-empty="1" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(E.num(E.WT_DEF[k])) + '" autocomplete="off"></label>'; };
  var h = '<div class="wtblk"><div class="lbl" style="margin-top:14px">' + t('wtL') + '</div><div class="row" style="align-items:center">' + seg(b + 'on', !!w.on, [['false', t('wtNo')], ['true', t('wtYes')]]) +
    (wt ? '<span class="h">' + t('wtSize') + ' <b>' + fmt(wt.L) + ' × ' + fmt(wt.W) + ' × ' + fmt(wt.T) + '</b> mm</span>' : '') + '</div>';
  if (!w.on) return h + '</div>';
  if (c.kind !== 'box' && cabKind(c) === 'PAKABINAMOS') h += '<p class="note" style="margin:6px 0 0">' + t('wtWallNote') + '</p>';
  return h + '<div class="row" style="margin-top:10px">' + req(fT(t('wtMat'), b + 'mat', w.mat, 'dl-wt'), w.mat) + nE(t('wtT'), 'T', w.T) + '</div>' +
    '<div class="row" style="margin-top:10px">' + nE(t('wtOver'), 'over', w.over) + nE(t('wtLeft'), 'left', w.left) + nE(t('wtRight'), 'right', w.right) + fT(t('wtEdge'), b + 'edge', w.edge, 'dl-edge') + '</div>' +
    '<p class="note" style="margin:6px 0 0">' + t('wtNote') + '</p></div>';
}
/* manufacturing notes come from the engine in Lithuanian; in English mode they are translated phrase by phrase */
var WARN_EN = [[" mm — nugara apačioje prie dugno nepritvirtinama; rinkitės „be nugaros“ arba tvirtinkite kitaip", " mm — the back cannot be fixed to the bottom; choose “no back” or fix it another way"], [" mm didesnis už šono gylį — dugnas per visą gylį (", " mm is more than the side depth — the bottom goes the full depth ("], [", sutrumpintas: gale ", ", shortened: at the back "], ["dugnas sutrumpintas iki ", "bottom shortened to "], ["dugno gylis ", "bottom depth "], [" mm laisva", " mm free"], ["matomas šonas iš fasado medžiagos (", "visible side in the front material ("], [" mm: patikrinkite, ar tokia plokštė yra", " mm: check that such a board exists"], ["matoma apačia (fasado medžiaga)", "visible bottom (front material)"], ["matomas šonas (fasado medžiaga)", "visible side (front material)"], [" mm siauresnis už nišą", " mm narrower than its niche"], ["indaplovės fasadas, ", "dishwasher front, "], [") — storis lieka ", ") — the thickness stays "], [" mm, fasadų ", " mm, the fronts "], ["šaldytuvo fasadas — tvirtinamas prie šaldytuvo durų (be lankstų)", "fridge front — screwed to the fridge's own door (no hinges)"], ["šaldytuvo nišos lentynos", "fridge niche shelves"], ["šaldytuvo nišos lentyna", "fridge niche shelf"], [" mm tarpas orui", " mm gap for the air"], [" nuo priekio) patenka į ekscentriko skylę — bėgelio varžtas kliūs už jungties; patikrinkite (pvz. rinkitės konfirmatus)", " from the front) falls on a cam-lock hole — the runner screw will hit the joint; check (e.g. choose confirmat screws)"], ["3D konstrukcija: jungtys gręžiamos pagal spintelių taisykles, bet šis surinkimas naujas — patikrinkite pirmą gaminį", "3D construction: joints are drilled by the cabinet rules, but this assembly is new — check the first piece"], [": jungtys iš abiejų pusių susitinka ir jų nepavyko pastumti — pakeiskite jungtis (Atskirai) arba lentynų aukščius", ": joints from both sides meet and could not be moved — change the joints (Separately) or the shelf heights"], [" mm aukštyje: laikiklio skylė kliūna už kitos skylės (lankstas/bėgelis) — praleista, perkelkite lentyną", " mm high: the support hole hits another hole (hinge/runner) — skipped, move the shelf"], ["TANDEMBOX viršutinė tvirtinimo skylė 225.5 — patikrinti pagal Blum lentelę šiam stalčiaus aukščiui", "TANDEMBOX upper fixing hole 225.5 — check the Blum table for this drawer height"], ["nugara ant galo: pertvara nesiekia nugaros (stati galinė juosta) — prie pertvaros nepritvirtinta", "back on the rear edges: the partition does not reach the back (upright back rail) — not fixed to the partition"], [" mm aukštyje: laikiklio skylė pertvaroje kliūna už kitos skylės — praleista, perkelkite lentyną", " mm high: the support hole in the partition hits another hole — skipped, move the shelf"], [": priekio plokštė uždaro konstrukciją — išjunkite “priekis”, kad būtų angos durims / stalčiams", ": the front board closes the construction — turn off “front” to get openings for doors / drawers"], [": grupė buvo ištempta (Scale) — sąraše naudojami spintelės parametrai, ne ištempti matmenys", ": the group was stretched (Scale) — the list uses the cabinet parameters, not the stretched size"], ["kojelės per tankiai: tarp kojelių mažiau nei 70 mm — sumažinkite kojelių skaičių eilėje", "legs too dense: less than 70 mm between legs — use fewer legs per row"], [": dėžės dugnas per arti korpuso dugno — padidinkite bėgelio ašies aukštį nustatymuose", ": the box bottom is too close to the carcass bottom — raise the runner axis height in the settings"], [" mm aukštyje) — pakeiskite lentynų / durų / jungčių vietas (NEPROGRAMUOTA teisingai)", " mm high) — move the shelves / doors / joints (NOT PROGRAMMED correctly)"], [" mm, kad plokštelės nesusitiktų su kitos pertvaros pusės plokštelėmis — patikrinkite", " mm so the plates do not meet the plates on the other side of the partition — check"], [": jungčių skylės kertasi su kitomis ir jų nepavyko pastumti — pakeiskite jungtis", ": joint holes clash with others and could not be moved — change the joints"], [": lankstų pusė ne prie šono (reikia pertvaros) — plokštelių skylės nepridėtos", ": the hinge side is not at a side panel (a partition is needed) — plate holes not added"], [": daugiau nei 2 orkaitės atramos lentynos — pridėtos tik apatinė ir viršutinė", ": more than 2 oven support shelves — only the bottom and the top ones added"], ["lankstų plokštelių skylės pagal Blum katalogą — NEPATIKRINTA su SWOOD modeliu", "hinge plate holes per the Blum catalogue — NOT VERIFIED against the SWOOD model"], ["pertvara viršuje nepritvirtinta — reikia gulsčios juostos arba pilno viršaus", "partition not fixed at the top — a horizontal rail or a full top is needed"], ["lankstų puodelių skylės pagal Blum katalogą — NEPATIKRINTA su SWOOD modeliu", "hinge cup holes per the Blum catalogue — NOT VERIFIED against the SWOOD model"], [": fasadas per žemas arba anga per siaura stalčiaus dėžei — dėžė nepridėta", ": front too low or opening too narrow for a drawer box — box not added"], ["nugara viduje: stačios galinės juostos netelpa šalia nugaros — praleistos", "back inside: the upright back rails do not fit next to the back — skipped"], ["nugaros konfirmatų Ø5 skylės šonų gale negali būti gręžiamos CNC (šonas ", "the Ø5 back confirmat holes at the rear of the sides cannot be drilled on the CNC (side "], [": lankstas perkeltas, kad plokštelė nesikirstų su lentyna — patikrinkite", ": hinge moved so its plate does not clash with a shelf — check"], ["lentynų laikiklių skylės pagal standartą — NEPATIKRINTA su SWOOD modeliu", "shelf support holes per the standard — NOT VERIFIED against the SWOOD model"], ["nugaros viduje Ø5 skylės ilguose kraštuose negali būti gręžiamos CNC (> ", "Ø5 holes in the long edges of the inside back cannot be drilled on the CNC (> "], [": laikiklio skylė kliūna už kitos skylės — praleista, perkelkite lentyną", ": the support hole hits another hole — skipped, move the shelf"], [": ekscentrikui ir kaiščiui nepakanka vietos — pakeiskite jungčių vietas", ": not enough room for the cam lock and dowel — move the joints"], [": lanksto plokštelė kertasi su lentyna — patikrinkite lentynų aukščius", ": the hinge plate clashes with a shelf — check the shelf heights"], [": vidiniai stalčiai už durų dar nepalaikomi — nebraižomi ir negręžiami", ": inner drawers behind doors are not supported yet — not drawn or drilled"], [" mm: plokštelė uždengia jungties galvutę dugno apačioje — patikrinkite", " mm: the plate covers a joint head under the bottom — check"], [" vnt. pastumtos šonu, kad plokštelė neuždengtų jungčių dugno apačioje", " pcs moved sideways so the plate does not cover the joints under the bottom"], [" mm: plona plokštė — jungčių negręžiama, tvirtinama vinimis / kabėmis", " mm: thin board — no joints drilled, fixed with nails / staples"], ["pertvaros jungtis už pertvaros ribų — praleista, patikrinkite vietas", "partition joint outside the partition — skipped, check the positions"], ["netinkami matmenys: plotis, aukštis ir gylis turi būti didesni už 0", "invalid dimensions: width, height and depth must be greater than 0"], ["papildoma detalė be ilgio ar pločio — nepridėta, įrašykite matmenis", "extra part without length or width — not added, enter the dimensions"], [" mm): ne vidinėje erdvėje arba per arti kitos plokštės — praleista", " mm): not inside the cabinet or too close to another board — skipped"], [" jau užimta kitų durų / stalčių — praleista, pasirinkite kitą angą", " is already taken by other doors / drawers — skipped, pick another opening"], [" kertasi su stalčiais — pašalinkite ją arba padarykite nekilnojamą", " clashes with the drawers — remove it or make it fixed"], [": lankstų pusė ne prie pertvaros — plokštelių skylės nepridėtos", ": the hinge side is not at a partition — plate holes not added"], [": lankstas perkeltas, kad plokštelė nepatektų po viršumi/juosta", ": hinge moved so its plate does not end up under the top / rail"], ["įleistos durys: reikia įleistų durų lankstų; plokštelės žymės ", "inset doors: inset-door hinges are needed; plate marks "], [": fasadas per žemas arba skyrius per siauras stalčiaus dėžei (", ": front too low or compartment too narrow for a drawer box ("], [" mm aukštyje) kliūna už kitos skylės — praleista, patikrinkite", " mm high) hits another hole — skipped, check"], [": lankstų pusėje nėra plokštės — plokštelių žymės nepridėtos", ": no board on the hinge side — plate marks not added"], [" mm aukštyje) — viena nepridėta, sumažinkite lentynų skaičių", " mm high) — one not added, use fewer shelves"], ["netinkami matmenys: per maža spintelė (plotis ir aukštis ≥ ", "invalid dimensions: cabinet too small (width and height ≥ "], [" mm, kad skylė nesusitiktų su jungties skyle — patikrinkite", " mm so the hole does not meet a joint hole — check"], ["viršuje nėra nei viršaus, nei juostų — karkasas nesurištas", "no top and no rails — the carcass is not tied together"], ["indaplovės spintelė: tik fasadas — programų negeneruojama", "dishwasher cabinet: front only — no programs generated"], ["atskira plokštė: tik pjaunama — skylių ir programų nėra", "loose panel: only cut — no holes, no programs"], ["netinkami matmenys: plokštės storis 3–100 mm, aukštis ir gylis ne mažiau 30 mm", "invalid dimensions: panel thickness 3–100 mm, height and depth at least 30 mm"], ["krašto medžiaga nenurodyta — kraštai pažymėti “KRAŠTAS”", "edging material not set — edges marked “KRAŠTAS”"], [" mm, kad nesusitiktų su kitomis skylėmis — patikrinkite", " mm so they do not meet other holes — check"], [" — patikrinkite plokštės ilgį arba numatykite sujungimą", " — check the board length or plan a joint"], [" mm aukštyje) — lentyna nepridėta, padidinkite sekciją", " mm high) — shelf not added, make the section taller"], ["pėdutės skylė kliūna už jungties skylės — patikrinkite", "the foot hole hits a joint hole — check"], [": durys — lankstų skylės išjungtos (gręžiama rankomis)", ": doors — hinge holes turned off (drilled by hand)"], [" mm) — nugarai pasirinkite ekscentrikus arba kaiščius", " mm) — choose cam locks or dowels for the back"], ["naujos jungtys, dar nepatikrintos su SWOOD modeliu: ", "new joints, not yet verified against the SWOOD model: "], [" skylės ilgame krašte — pasukti 90° negalima (ilgis ", " holes in the long edge — cannot turn 90° (length "], [") — nugarai pasirinkite ekscentrikus arba kaiščius", ") — choose cam locks or dowels for the back"], [": per žemos lankstams — lankstų skylės nepridėtos", ": too low for hinges — hinge holes not added"], [" mm aukštyje: per arti kitos lentynos — praleista", " mm high: too close to another shelf — skipped"], ["\" skylių šablono nėra — bėgelių žymės nepridėtos", "\" have no hole template — runner marks not added"], [": šone nėra plokštės bėgeliui — žymės nepridėtos", ": no side board for the runner — marks not added"], [" mm tarp šono ir pertvaros) — netinkami matmenys", " mm between the side and the partition) — invalid dimensions"], [" mm, kad nesusitiktų su kairės kolonos jungtimis", " mm so they do not meet the left column's joints"], [": medžiaga nenurodyta — pažymėta “BE MEDŽIAGOS”", ": material not set — marked “BE MEDŽIAGOS”"], [": ne stačiakampė detalė — sąraše jos gabaritai", ": not a rectangular part — the list shows its overall size"], [" mm aukštyje: ne vidinėje erdvėje — praleista", " mm high: not inside the cabinet — skipped"], [": nėra nė vienos jungties — mazgas nesurištas", ": no joints at all — the connection is not tied"], [" mm — per maža detalė, patikrinkite matmenis", " mm — part too small, check the dimensions"], [" jungt. per arti kitos ar krašto — praleista", " joint(s) too close to another or to the edge — skipped"], [" mm) — fasadai nepridėti, padidinkite aukštį", " mm) — fronts not added, increase the height"], ["nėra nė vienos plokštės — pridėkite plokštes", "no boards at all — add boards"], [") — tokio grąžto galvoje nėra, NEPROGRAMUOTA", ") — no such drill in the head, NOT PROGRAMMED"], [") — detalės nepridėtos, padidinkite spintelę", ") — parts not added, make the cabinet bigger"], [" mm) — praleista, rinkitės trumpesnį bėgelį", " mm) — skipped, choose a shorter runner"], [") — šiam kraštui grąžto nėra, NEPROGRAMUOTA", ") — no drill for this edge, NOT PROGRAMMED"], [" krašto skylė — grąžto nėra, NEPROGRAMUOTA", " edge hole — no drill, NOT PROGRAMMED"], [" mm — paslėptiems bėgeliams tinka 16–19 mm", " mm — undermount runners need 16–19 mm"], [" jungt. buvo per arti krašto — perkelta į ", " joint(s) were too close to the edge — moved to "], ["” skylių šablono nėra — žymės nepridėtos", "” have no hole template — marks not added"], [" — pakeiskite, kuri plokštė dengia kurią", " — change which board covers which"], [": per žemas TANDEMBOX tvirtinimo skylei ", ": too low for the TANDEMBOX fixing hole "], [" per žemos lankstams — skylės nepridėtos", " too low for hinges — holes not added"], ["fasadų aukščių suma neatitinka sekcijos ", "the sum of front heights does not match the section "], [") — pakeiskite jungčių kiekį ar atstumą", ") — change the joint count or spacing"], [": jungtys iš dešinės kolonos pastumtos ", ": joints from the right column moved "], [" mm aukštyje) — praleista, patikrinkite", " mm high) — skipped, check"], ["lanksto plokštelės skylė už šono ribų (", "hinge plate hole outside the side ("], [" mm per gili — pasirinkite konfirmatus", " mm too deep — choose confirmat screws"], ["Ø8 skylės šonų ilgame krašte (F=4/F=5)", "Ø8 holes in the long edge of the sides (F=4/F=5)"], [") — virš dugno turi likti bent 200 mm", ") — at least 200 mm must stay above the bottom"], ["lanksto plokštelės skylė pertvaroje (", "hinge plate hole in the partition ("], [" mm per didelis — netinkami matmenys", " mm too large — invalid dimensions"], [": skylės iš abiejų pusių susitinka (", ": holes from both sides meet ("], [" — netelpa į stakles, NEPROGRAMUOTA", " — does not fit the machine, NOT PROGRAMMED"], [": pasuktoje programoje X ilgis tik ", ": in the turned program the X length is only "], [" jungt. per arti kitos (mažiau nei ", " joint(s) too close to another (less than "], [": vidiniai stalčiai dar nepalaikomi", ": inner drawers are not supported yet"], [": per daug stalčių šiam aukščiui — ", ": too many drawers for this height — "], [" žymė už plokštės ribų — praleista", " mark outside the board — skipped"], ["Ø8 skylės ilgame krašte (F=4/F=5)", "Ø8 holes in the long edge (F=4/F=5)"], [" mm — fasadai padalinti po lygiai", " mm — the fronts are split equally"], [": šone nėra plokštės laikikliams", ": no side board for the supports"], ["lentynos per arti viena kitos (", "shelves too close to each other ("], [" mm) — sumažinkite durų skaičių", " mm) — use fewer doors"], [" krašto skylė už detalės ribų (", " edge hole outside the part ("], [" + tarpai) neatitinka sekcijos ", " + gaps) does not match the section "], [" žymė kliūna už kitos skylės (", " mark hits another hole ("], [" mm nuo priekio — NEPATIKRINTA", " mm from the front — NOT VERIFIED"], [": jungčių skylės persidengia (", ": joint holes overlap ("], [" mm: ekscentriko varžto skylė ", " mm: the cam bolt hole "], [": krašto skylės persidengia (", ": edge holes overlap ("], [" mm nuo krašto, patikrinkite", " mm from the edge, check"], [" — patikrinkite pirmą gaminį", " — check the first piece"], [") — patikrinkite prispaudimą", ") — check the clamping"], ["sekcija per žema lentynai (", "section too low for a shelf ("], [" mm pločio — sumažinta iki ", " mm wide — reduced to "], [") didesnė už fasadų zoną (", ") is larger than the front zone ("], ["lanksto plokštelės skylė (", "hinge plate hole ("], ["stati juosta prie gulsčios", "upright rail to the horizontal rail"], ["nurodyti fasadų aukščiai (", "the set front heights ("], [": anga per maža fasadui (", ": opening too small for a front ("], [" mm) — rinkitės trumpesnį", " mm) — choose a shorter one"], ["apatinė juosta prie dugno", "bottom rail to the bottom"], [" mm ilgesnis nei telpa (", " mm longer than fits ("], [" mm; sumažinkite skaičių", " mm; use fewer"], [" skylė už detalės ribų (", " hole outside the part ("], [" mm vidinio gylio, yra ", " mm inner depth, available "], [" mm — apatinis fasadas ", " mm — the bottom front is "], ["apatinė juosta ↔ dugnas", "bottom rail ↔ bottom"], ["sekcijų aukščių suma (", "sum of section heights ("], [": kiekis 0 — nepridėta", ": quantity 0 — not added"], ["stati juosta ↔ gulsčia", "upright rail ↔ horizontal rail"], [" — rinkitės trumpesnį", " — choose a shorter one"], [": per maži matmenys (", ": dimensions too small ("], [": tokios angos nėra (", ": no such opening ("], [" — kiauro grąžto nėra", " — no through drill"], [" mm) — dėžė nepridėta", " mm) — box not added"], ["fasadų aukščių suma (", "the sum of front heights ("], [": lankstai pastumti ", ": hinges moved "], [": per mažai vietos (", ": not enough room ("], ["dugnas pakeltas tik ", "bottom raised only "], [" stalčiai netelpa į ", " drawers do not fit in "], [": jungtys pastumtos ", ": joints moved "], [": per maža sekcija (", ": section too small ("], [" mm, gylis ≥ 100 mm)", " mm, depth ≥ 100 mm)"], [") netelpa į sekciją ", ") do not fit the section "], [" mm), NEPROGRAMUOTA", " mm), NOT PROGRAMMED"], [": durys per mažos (", ": doors too small ("], ["stati galinė juosta", "upright back rail"], [" mm netelpa šone (", " mm does not fit on the side ("], [": stalčiaus šonai ", ": drawer sides "], [" mm (staklių min. ", " mm (machine min. "], [" ang.) — praleista", " openings) — skipped"], ["netinkami matmenys", "invalid dimensions"], [" žymė pertvaroje (", " mark in the partition ("], ["fiksuotos lentynos", "fixed shelves"], [": pakeistos vietos", ": positions changed"], [" jungtys netelpa ", " joints do not fit in "], [" (dėžė ir skylės)", " (box and holes)"], [" mm ilgesnis nei ", " mm longer than "], [" mm) — praleista", " mm) — skipped"], ["pėdutė pastumta ", "foot moved "], ["plokštės kertasi", "boards clash"], [" mm) — nepridėta", " mm) — not added"], ["dugnas tarp šonų", "bottom between the sides"], ["orkaitės atramos", "oven supports"], ["fiksuota lentyna", "fixed shelf"], [" krašto skylė (", " edge hole ("], [" mm gylio, yra ", " mm depth, available "], [" mm — praleista", " mm — skipped"], [": reguliuojama ", ": the adjustable "], ["priekinė juosta", "front rail"], ["orkaitės atrama", "oven support"], [" (ekscentrikai)", " (cam locks)"], [" mm aukštyje, ", " mm high, "], [" mm (nurodyta ", " mm (set to "], ["apatinė juosta", "bottom rail"], [" (konfirmatai)", " (confirmat screws)"], [": bėgeliams “", ": runners “"], [") — praleista", ") — skipped"], [" per siaura (", " too narrow ("], [": stalviršis ", ": worktop "], ["galinė juosta", "back rail"], ["nugara viduje", "back inside"], [" fasadai po ", " fronts of "], [": įleidimas ", ": inset "], [": kiaurai ø", ": through ø"], ["liks tarpas", "a gap will remain"], [" mm reikia ", " mm needs "], [": bėgeliui ", ": runner "], [" (kaiščiai)", " (dowels)"], [": bėgelis ", ": runner "], [" (dešinė)", " (right)"], [" (kairė)", " (left)"]],
  WARN_EN_W = [["Spintelė", "Cabinet"], ["sekcija", "section"], ["stalčius", "drawer"], ["pertvara", "partition"], ["Pertvara", "Partition"], ["lentyna", "shelf"], ["Lentyna", "Shelf"], ["kolona", "column"], ["kojelės", "legs"], ["kojelė", "leg"], ["fasadas", "front"], ["fasadai", "fronts"], ["kampas", "corner"], ["anga", "opening"], ["durys", "doors"], ["bėgelio", "runner"], ["lanksto", "hinge"], ["žymė", "mark"], ["skylė", "hole"], ["ilgis", "length"], ["plotis", "width"], ["dugnas", "bottom"], ["viršus", "top"], ["Viršus", "Top"], ["apačia", "bottom"], ["Apačia", "Bottom"], ["kairė", "left"], ["Kairė", "Left"], ["dešinė", "right"], ["Dešinė", "Right"], ["nugara", "back"], ["Nugara", "Back"], ["priekis", "front"], ["Priekis", "Front"], ["pradžioje", "at the start"], ["gale", "at the end"]];
var WARN_EN_RE = null;
function wTxt(x) {
  var s = String(x == null ? '' : x).replace(/\d+\.\d{3,}/g, function (m) { return String(Math.round(+m * 10) / 10); });   // 56.833333 → 56.8
  if (S.lang !== 'en') return s;
  s = s.replace(/[„“]/g, function (c) { return c === '„' ? '“' : '”'; });
  s = s.replace(/“([^”]+)” kampe susiduria su “([^”]+)” — sutrumpintas ([\d.,]+) mm \((pradžioje|gale)\), patikrinkite sujungimą/g, function (m, a, b, n, w) { return '“' + a + '” meets “' + b + '” in the corner — shortened by ' + n + ' mm (at the ' + (w === 'gale' ? 'end' : 'start') + '), check the joint'; });
  s = s.replace(/: (\S+) turi (\d+) programas — etiketėje telpa 2 QR, (.+) paleiskite pagal sąrašą/g, ': $1 has $2 programs — the label fits 2 QR codes, run $3 from the list');
  WARN_EN.forEach(function (q) { if (s.indexOf(q[0]) >= 0) s = s.split(q[0]).join(q[1]); });
  s = s.replace(/\((\d+) skyriuje (\d+) openings\)/g, '(compartment $1 has $2 openings)').replace(/\((\d+) skyriuje\)/g, '(compartment $1)').replace(/\((\d+) openings\)/g, '(there are $1 openings)');
  if (!WARN_EN_RE) { var map = {}; WARN_EN_W.forEach(function (q) { map[q[0]] = q[1]; });
    WARN_EN_RE = { re:new RegExp('(^|[^A-Za-z\\u00C0-\\u017E])(' + WARN_EN_W.map(function (q) { return q[0]; }).join('|') + ')(?![A-Za-z\\u00C0-\\u017E])', 'g'), map:map }; }
  return s.replace(WARN_EN_RE.re, function (m, pre, w) { return pre + WARN_EN_RE.map[w]; });
}
var NOTE_EN = [["plaušo nugara — prikalama, CNC nereikia", "fibreboard back — nailed on, no CNC needed"], ["apačia viršuje (gręžiama iš apačios)", "underside up (drilled from below)"], ["galinė (vidinė) pusė viršuje", "back (inner) face up"], ["vidinė pusė viršuje", "inner face up"], ["dešinė pusė viršuje", "right face up"], ["tarp šono/pertvaros", "between side/partition"], ["kalamas iš apačios", "nailed from below"], ["priekinis kraštas", "front edge"], ["apatinis kraštas", "bottom edge"], ["galinis kraštas", "back edge"], ["stovi ant dugno", "stands on the bottom"], ["viršus viršuje", "top face up"], ["mm nuo apačios", "mm from the bottom"], ["išorė viršuje", "outer face up"], ["tarp šonų", "between the sides"]], NOTE_EN_W = [["kraštas", "edge"], ["krašte", "edge"], ["pusėje", "side"], ["kairys", "left"], ["dešinys", "right"], ["priekinis", "front"], ["galinis", "back"], ["apatinis", "bottom"], ["viršutinis", "top"], ["įleistas", "set in"], ["lankstai", "hinges"], ["stati", "upright"], ["gulscia", "flat"], ["priekis", "front"], ["apačia", "bottom"], ["dugnas", "bottom"], ["stalčius", "drawer"], ["fasadai", "fronts"], ["sekcija", "section"]];
function noteTxt(x) {   // a part's orientation note (how it lies on the machine) in English mode
  var s = String(x == null ? '' : x); if (S.lang !== 'en') return s;
  NOTE_EN.forEach(function (q) { if (s.indexOf(q[0]) >= 0) s = s.split(q[0]).join(q[1]); });
  var map = {}; NOTE_EN_W.forEach(function (q) { map[q[0]] = q[1]; });
  return s.replace(new RegExp('(^|[^A-Za-z\\u00C0-\\u017E])(' + NOTE_EN_W.map(function (q) { return q[0]; }).join('|') + ')(?![A-Za-z\\u00C0-\\u017E])', 'g'), function (m, pre, w) { return pre + map[w]; });
}
function hingeLabel(v) { if (S.lang !== 'en') return { 'CARGO DTC PURE PRO':'Cargo — DTC Pure Pro' }[v] || v; return { 'BLUM LANKSTAI':'Blum hinges', 'BLUM TIP-ON':'Blum TIP-ON (push to open)', 'KT. LANKSTAI':'Other hinges', 'CARGO DTC PURE PRO':'Cargo pull-out — DTC Pure Pro', 'BE FURNITŪROS':'No hardware' }[v] || v; }
function railLengths(hw) { var rt = E.R.runner[hw]; return rt && rt.ball ? (E.R.ball.lengths || [300, 400, 450, 500, 550]).slice() : rt && rt.under ? (E.R.under.lengths || [250, 300, 350, 400, 450, 500, 550, 600]).slice() : rt && rt.merivo ? E.R.merivo.lengths.slice() : [270, 300, 350, 400, 450, 500, 550, 600, 650]; }
/* MERIVOBOX: the box height (auto picks N, M or E with the gallery railing by the front) and, for E, railing or BOXCAP */
function mvFields(b, s) {
  if (!(E.R.runner[s.hw] || {}).merivo) return '';
  var m = E.R.merivo, h = s.mvH && m.sideH[s.mvH] ? s.mvH : 'auto';
  return fS(t('mvH'), b + 'mvH', h, [['auto', t('mvAuto')]].concat(['N', 'M', 'K', 'E'].map(function (k) { return [k, k + ' · ' + String(m.sideH[k]).replace('.', ',') + ' mm']; }))) +
    (h === 'auto' || h === 'E' ? fS(t('mvExt'), b + 'mvExt', s.mvExt === 'boxcap' ? 'boxcap' : 'rail', [['rail', t('mvRail')], ['boxcap', t('mvBoxcap')]]) : '');
}
function usesMerivo(c) { return (c.sections || []).some(function (s) { return s.kind === 'drawers' && (E.R.runner[s.hw] || {}).merivo; }) ||
  !!(c.box && (c.box.fronts || []).some(function (f) { return f.kind === 'drawers' && (E.R.runner[f.hw] || {}).merivo; })); }
function sameCol(c, i) { var cl = colOf(c, c.sections[i]); return c.sections.map(function (s, q) { return q; }).filter(function (q) { return colOf(c, c.sections[q]) === cl; }); }
function firstInCol(c, i) { return sameCol(c, i)[0] === i; }
function lastInCol(c, i) { var a = sameCol(c, i); return a[a.length - 1] === i; }
function viewSection(c, s, i, z) {
  var b = 'c.sections.' + i + '.', kn = s.kind === 'doors' && s.fridge ? 'kFridge' : { drawers:'kDrawers', doors:'kDoors', cargo:'kCargo', open:'kOpen', oven:'kOven' }[s.kind];
  var secH = s.fill ? z.fillH : num(s.height);
  var head = '<div class="sh"><span class="kind">' + t(kn) + '</span>' + chk(b + 'fill', s.fill, t('fill')) +
    (s.fill ? '<span class="h" data-fill-h="' + i + '">' + fmt(secH) + ' mm</span>' : fN(t('secH'), b + 'height', s.height)) + '</div>';
  var body = '<div class="row">';
  if (s.kind === 'drawers') {
    body += fN(t('nDr'), b + 'nDrawers', s.nDrawers, 's') + fS(t('runner'), b + 'hw', s.hw, [['BLUM TANDEMBOX', 'Blum TANDEMBOX'], ['BLUM MERIVOBOX', 'Blum MERIVOBOX'], ['BLUM TANDEM', 'Blum TANDEM'], ['GTV KULKINIAI H45', t('rGtv')], ['DTC KULKINIAI H45', t('rDtc')], ['DTC PASLĖPTI', t('rDtcU')]].concat(['BLUM TANDEMBOX', 'BLUM MERIVOBOX', 'BLUM TANDEM', 'GTV KULKINIAI H45', 'DTC KULKINIAI H45', 'DTC PASLĖPTI'].indexOf(s.hw) < 0 ? [[s.hw, s.hw]] : [])) +
      fS(t('rail'), b + 'rail', s.rail, railLengths(s.hw).concat(railLengths(s.hw).indexOf(num(s.rail)) < 0 ? [num(s.rail)] : []).map(function (v) { return [v, v + ' mm']; })) + mvFields(b, s) +
      (num(s.nDrawers) > 1 ? '' : '<span class="h">' + fmt(secH - E.R.facade.gap) + ' mm</span>');
  } else if (s.kind === 'doors' && s.fridge) {
    var th0 = num(c.thick) || 18;
    body += chk(b + 'fridge', true, t('fridgeSec')) + fS(t('fridgeN'), b + 'nDoors', Math.max(1, Math.min(2, Math.round(num(s.nDoors) || 2))), [[1, t('fridge1')], [2, t('fridge2')]]) +
      '<div class="f"><span>' + t('fridgeHinge') + '</span>' + seg(b + 'hingeSide', s.hingeSide === 'right' ? 'right' : 'left', [['left', t('hsL')], ['right', t('hsR')]]) + '</div>' +
      '<span class="h">' + esc(t('fridgeHandle').replace('{s}', s.hingeSide === 'right' ? t('hsL') : t('hsR'))) + '</span>' +
      '<span class="h">' + esc(t('fridgeNiche').replace('{h}', fmt(secH - 2 * th0)).replace('{w}', fmt((c.cols > 1 ? colWidths(c)[colOf(c, s)] : num(c.W)) - 2 * th0))) + '</span>';
  } else if (s.kind === 'cargo' || (s.kind === 'doors' && /^CARGO/i.test(s.hinge || ''))) {   // a cargo pull-out: one front, no hinges, no shelves
    body += fS(t('cargoHw'), b + 'cargoHw', s.cargoHw || E.CARGO_HW[0], E.CARGO_HW.map(function (v) { return [v, hingeLabel(v)]; }).concat(E.CARGO_HW.indexOf(s.cargoHw || E.CARGO_HW[0]) < 0 ? [[s.cargoHw, s.cargoHw]] : [])) +
      '<span class="h">' + esc(t('cargoNote').replace('{w}', fmt(c.cols > 1 ? colWidths(c)[colOf(c, s)] : num(c.W)))) + '</span>';
  } else if (s.kind === 'doors') {
    var colSecs = sameCol(c, i), under = c.sections[colSecs[colSecs.indexOf(i) - 1]];
    if (under && under.kind === 'open') body += fN(S.lang === 'lt' ? 'Durys žemiau, ant nišos (mm)' : 'Doors lower, over the niche (mm)', b + 'frontDrop', s.frontDrop || 0);
    body += chk(b + 'fridge', false, t('fridgeSec')) + fN(t('nDoors'), b + 'nDoors', s.nDoors, 's') + '<div class="f"><span>' + t('split') + '</span>' + seg(b + 'doorSplit', s.doorSplit, [['v', t('sSide')], ['h', t('sStack')]]) + '</div>' +
      fS(t('hinge'), b + 'hinge', s.hinge, E.DOOR_HW.map(function (v) { return [v, hingeLabel(v)]; }).concat(E.DOOR_HW.indexOf(s.hinge) < 0 ? [[s.hinge, s.hinge]] : [])) +
      (num(s.nDoors) >= 2 && s.doorSplit !== 'h' ? '' : '<div class="f"><span>' + t('hside') + '</span>' + seg(b + 'hingeSide', s.hingeSide || 'auto', [['auto', t('hsAuto')], ['left', t('hsL')], ['right', t('hsR')]]) + '</div>') +   // two doors side by side open from the outer sides
      (s.hinge === 'BE FURNITŪROS' ? '' : '<div class="f"><span>' + t('hingeN') + '</span>' + seg(b + 'hingeN', +s.hingeN >= 2 ? String(Math.round(+s.hingeN)) : 'auto', [['auto', t('hsAuto') + ' (' + E.hingesPerDoor(s.doorSplit === 'h' ? secH / Math.max(1, num(s.nDoors) || 1) - E.R.facade.gap : secH - E.R.facade.gap) + ')'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']]) + '</div>') +
      fN(t('shelves'), b + 'shelves', s.shelves, 's') + (num(s.shelves) > 0 ? '<div class="f"><span>&nbsp;</span>' + seg(b + 'shelfAdj', s.shelfAdj !== false, [['true', t('adj')], ['false', t('fixed')]]) + '</div>' : '');
  } else if (s.kind === 'open') {
    body += fN(t('shelves'), b + 'shelves', s.shelves, 's') + (num(s.shelves) > 0 ? '<div class="f"><span>&nbsp;</span>' + seg(b + 'shelfAdj', s.shelfAdj !== false, [['true', t('adj')], ['false', t('fixed')]]) + '</div>' : '') +
      (c.sections.some(function (q) { return colOf(c, q) === colOf(c, s) && (q.kind === 'drawers' || q.kind === 'doors' || q.kind === 'cargo') && !q.fridge; }) ?
        chk(b + 'divider', !!s.divider, S.lang === 'lt' ? 'Skiriamoji lentyna tarp nišos ir fasadų — fasadai ją uždengia' : 'Dividing shelf between the niche and the fronts — the fronts cover it') : '');
  } else {
    body += fS(t('sup'), b + 'shelves', Math.min(2, num(s.shelves)), [[0, '0'], [1, '1 — ' + (S.lang === 'lt' ? 'apačioje' : 'below')], [2, '2 — ' + (S.lang === 'lt' ? 'apačioje ir viršuje' : 'below and above')]]);
  }
  body += '</div>';
  var nStack = s.kind === 'drawers' ? num(s.nDrawers) : s.kind === 'doors' && !/^CARGO/i.test(s.hinge || '') && (s.doorSplit === 'h' || s.fridge) ? num(s.nDoors) : 0;
  if (nStack > 1) body += frontsEditor(s, i, secH, Math.round(nStack));
  if ((s.kind === 'doors' || s.kind === 'open') && num(s.shelves) > 0) body += shelfPosEditor(c, s, i);
  if (s.kind === 'doors' && s.fridge) body += '<p class="note">' + esc(t('fridgeNote').replace('{v}', E.R.fridgeVent)) + '</p>';
  return '<div class="sec k-' + s.kind + '"><div>' + head + body + '</div><div class="tools">' +
    '<button title="' + t('up') + '" aria-label="' + t('up') + '" data-act="mv" data-i="' + i + '" data-v="1"' + (lastInCol(c, i) ? ' disabled' : '') + '>▲</button>' +
    '<button title="' + t('down') + '" aria-label="' + t('down') + '" data-act="mv" data-i="' + i + '" data-v="-1"' + (firstInCol(c, i) ? ' disabled' : '') + '>▼</button>' +
    '<button class="xbtn" title="' + t('rm') + '" aria-label="' + t('rm') + '" data-act="rmsec" data-i="' + i + '">✕</button></div></div>';
}
/* stacked fronts, top first: type a height for any of them, the empty ones share what is left */
/* shelf heights in a doors / open section: one field per shelf (top first), empty = spread evenly; the value is the shelf's
   middle above the section bottom (as the offer app writes it) */
function shelfPosEditor(c, s, i) {
  var ns = Math.round(num(s.shelves)); if (!(ns > 0) || s.fridge || s.kind === 'cargo') return '';
  var inf = S._info && S._info[S.sel], r = inf && inf.r, si = sameCol(c, i).indexOf(i), col = colOf(c, s);
  var info = r && (r.shelfInfo || []).filter(function (q) { return q.col === col && q.sec === si; })[0];
  var pos = Array.isArray(s.shelfPos) ? s.shelfPos : [], any = false, rows = '';
  for (var q = ns - 1; q >= 0; q--) {
    var own = pos[q] != null && String(pos[q]).trim() !== '' && +pos[q] > 0; if (own) any = true;
    var real = info && info.zc[q] != null ? info.zc[q] - info.base : null, id = 'f-c-sections-' + i + '-shelfPos-' + q;
    rows += '<label class="fh' + (own ? ' own' : '') + '" for="' + id + '"><span class="fh-no">' + (q === ns - 1 ? '↑ ' : q === 0 ? '↓ ' : '') + (q + 1) + '</span>' +
      '<input id="' + id + '" type="text" inputmode="decimal" data-bind="c.sections.' + i + '.shelfPos.' + q + '" data-num="1" data-empty="1" value="' + (own ? esc(fmt(pos[q])) : '') + '" placeholder="' + (real != null ? fmt(Math.round(real * 10) / 10) : '') + '">' +
      (real != null ? '<span class="fh-real">' + fmt(Math.round(real * 10) / 10) + ' mm</span>' : '') + '</label>';
  }
  return '<div class="fronts shpos"><div class="fh-head"><b>' + t('shPosT') + '</b><span class="unit">' + t('shPosN') + '</span>' +
    (any ? '<button type="button" class="btn ghost fh-reset" data-act="shposreset" data-i="' + i + '">↺ ' + t('shPosEven') + '</button>' : '') + '</div><div class="fh-list">' + rows + '</div></div>';
}
function frontsEditor(s, i, secH, n) {
  var g = E.R.facade.gap, sp = E.splitFronts(secH, n, s.frontH, g), top = sp.mods.slice().reverse(), fh = s.frontH || {}, any = false;
  var rows = top.map(function (m, q) {
    var own = fh[q] != null && String(fh[q]).trim() !== '' && +fh[q] > 0; if (own) any = true;
    var id = 'f-c-sections-' + i + '-frontH-' + q;
    var bad = own && Math.abs(+fh[q] - (m - g)) > 0.05;   // typed, but not what will be cut
    return '<label class="fh' + (own ? ' own' : '') + (bad ? ' bad' : '') + '" for="' + id + '"><span class="fh-no">' + (q === 0 ? '↑ ' : q === n - 1 ? '↓ ' : '') + (q + 1) + '</span>' +
      '<input id="' + id + '" type="text" inputmode="decimal" data-bind="c.sections.' + i + '.frontH.' + q + '" data-num="1" data-empty="1" value="' + (own ? esc(fmt(fh[q])) : '') + '" placeholder="' + fmt(m - g) + '">' +
      '<span class="fh-bar" style="--h:' + Math.max(6, Math.min(40, (m / Math.max(1, secH)) * 64)).toFixed(0) + 'px"></span><span class="fh-real">' + fmt(m - g) + ' mm</span></label>';
  }).join('');
  return '<div class="fronts" data-i="' + i + '"><div class="fh-head"><b>' + t('fhTitle') + '</b><span class="unit">' + t('fhNote') + '</span>' +
    (any ? '<button type="button" class="btn ghost fh-reset" data-act="fhreset" data-i="' + i + '">↺ ' + t('fhEqual') + '</button>' : '') + '</div>' +
    '<div class="fh-list">' + rows + '</div>' + (sp.note ? '<p class="fh-warn">' + esc(wTxt(sp.note)) + '</p>' : '') + '</div>';
}
/* while typing: section heights, front heights, bars and the note follow the numbers at once (no re-render, focus stays) */
function liveSections(c) {
  if (!c || c.dishwasher) return;
  var g = E.R.facade.gap, secHOf = function (s) { return s.fill ? zoneInfo(c, colOf(c, s)).fillH : num(s.height); };
  document.querySelectorAll('[data-fill-h]').forEach(function (el) { var s = c.sections[+el.getAttribute('data-fill-h')]; if (s) el.textContent = fmt(secHOf(s)) + ' mm'; });
  document.querySelectorAll('.fronts[data-i]').forEach(function (box) {
    var i = +box.getAttribute('data-i'), s = c.sections[i]; if (!s) return;
    var n = Math.round(s.kind === 'drawers' ? num(s.nDrawers) : num(s.nDoors)), secH = secHOf(s), sp = E.splitFronts(secH, n, s.frontH, g), top = sp.mods.slice().reverse(), fh = s.frontH || {}, any = false;
    box.querySelectorAll('.fh').forEach(function (lab, q) {
      if (q >= top.length) return;
      var own = fh[q] != null && String(fh[q]).trim() !== '' && +fh[q] > 0; if (own) any = true;
      lab.classList.toggle('own', own); lab.classList.toggle('bad', own && Math.abs(+fh[q] - (top[q] - g)) > 0.05);
      var real = lab.querySelector('.fh-real'); if (real) real.textContent = fmt(top[q] - g) + ' mm';
      var inp = lab.querySelector('input'); if (inp) inp.placeholder = fmt(top[q] - g);
      var bar = lab.querySelector('.fh-bar'); if (bar) bar.style.setProperty('--h', Math.max(6, Math.min(40, (top[q] / Math.max(1, secH)) * 64)).toFixed(0) + 'px');
      lab.title = fmt(top[q] - g) + ' mm';
    });
    var w = box.querySelector('.fh-warn');
    if (sp.note) { if (!w) { w = document.createElement('p'); w.className = 'fh-warn'; box.appendChild(w); } w.textContent = wTxt(sp.note); } else if (w) w.remove();
    var head = box.querySelector('.fh-head'), rb = box.querySelector('.fh-reset');
    if (any && !rb && head) head.insertAdjacentHTML('beforeend', '<button type="button" class="btn ghost fh-reset" data-act="fhreset" data-i="' + i + '">↺ ' + t('fhEqual') + '</button>');
    else if (!any && rb) rb.remove();
  });
}
function viewSheet(c, inf) {
  var nParts = inf.r.panels.length;
  var w = inf.warnings.map(function (x) { var lv = level(x); return '<div class="w ' + lv + '"><span class="tag">' + t(lv === 'bad' ? 'errTag' : lv === 'warn' ? 'warnTag' : 'infoTag') + '</span><span>' + esc(wTxt(x)) + '</span></div>'; }).join('');
  var j = c.dishwasher ? '—' : (c.cnc.joinery === 'cam' ? t('jCam') : t('jConf'));
  return '<aside class="sheet"><div id="assembly-preview"></div><div class="rr-cab"><button type="button" class="btn rm-render" data-act="rrcab" title="' + esc(t('rrCabT')) + '">✦ ' + t('rrBtn') + '</button></div><div id="pricecard-wrap">' + priceCard(c, inf) + '</div><details class="technical-preview"' + (S.techOpen ? ' open' : '') + '><summary>' + (S.lang === 'lt' ? 'Brėžinys ir gamybos suvestinė' : 'Drawing & manufacturing summary') + '</summary><div class="paper"><div class="tb"><b>' + (S.sel + 1) + ' · ' + esc(c.name || typeName(c)) + '</b><span>' + fmt(c.dishwasher ? c.dishWidth : c.W) + '×' + fmt(c.H) + '×' + fmt(c.D) + '</span></div>' +
    '<div class="draw" id="sketch">' + sketchOf(c) + '</div><div class="titleblk"><div>' + t('parts') + '<b>' + nParts + '</b></div><div>' + t('progs') + '<b>' + inf.nProg + '</b></div><div>' + (S.lang === 'lt' ? 'Jungtys' : 'Joinery') + '<b style="font-size:11px">' + esc(j) + '</b></div></div></div></details>' +
    '<details class="preview-warnings"' + (S.warnOpen ? ' open' : '') + '><summary>' + (S.lang === 'lt' ? 'Gamybos patikra' : 'Manufacturing checks') + ' <span>' + inf.warnings.length + '</span></summary><div class="warns" id="warns">' + w + '</div></details>' +
    '<button class="btn pri big go" data-act="tab" data-v="res">' + t('toRes') + '</button><button class="btn big go drwgo" data-act="drwcab">' + t('drwCab') + '</button></aside>';
}
function sketchOf(c) { if (c.kind === 'box') { var ib = S._info && S._info[S.sel]; return ib && window.DBFront ? window.DBFront.svg(c, ib.r, { bnd:[0, num(c.W)], label:c.name || '' }) : ''; } try { var d = engineDef(c); d.colW = colsOf(c) > 1 ? colWidths(c) : []; var bs = c.cnc.backs || []; d.hasBack = bs.some(function (x) { return x !== 'none'; }); d.backs = colsOf(c) > 1 && bs.length === colsOf(c) ? bs.slice() : null; d.backType = bs.indexOf('hdf') >= 0 ? 'hdf' : 'carcass'; return SK.svg(d, S.lang); } catch (e) { return '<div class="empty">' + esc(e.message) + '</div>'; } }

/* ----------------------------------------------------------------- admin mode: pricing (same model as the offer app)
   Direct cost of a cabinet from its real parts: board m² × material €/m², cutting €/m of every part's outline,
   edge banding €/m of every banded edge, drawer boxes (bottom + back of a metal system, or a whole wooden box —
   the offer app's drawerBox) and the fittings list × €/unit. Then the offer app's ladder: material markup, packing,
   defects, fasteners, waste, depreciation, design → production; assembly, admin; margin; VAT. Every step is
   linear, so each cabinet carries its own share and the project is their sum (+ installation and delivery).
   Prices and the PIN stay in this browser only; the lock keeps prices from the workshop screen, it is not security. */
var PR_HW = { 'CARGO DTC PURE PRO':95, 'BLUM TANDEM':26, 'BLUM TANDEMBOX':40, 'BLUM MERIVOBOX N':30, 'BLUM MERIVOBOX M':32, 'BLUM MERIVOBOX K':36, 'BLUM MERIVOBOX E':32, 'BLUM MERIVOBOX galerija':12, 'BLUM MERIVOBOX BOXCAP':20, 'GUOLINIAI':8, 'KT. PASLĖPTO MONTAVIMO':12, 'BLUM LANKSTAI':13, 'BLUM TIP-ON':16, 'KT. LANKSTAI':6, 'KT. TIP-ON':9, 'BE FURNITŪROS':0, 'GTV KULKINIAI H45':8, 'DTC KULKINIAI H45':8, 'DTC PASLĖPTI':15.9 };
function prDefaults() {
  return { cut:0.6, edge:1.7, def:{ carc:8, facade:29, back:5, top:60 }, mat:{}, edgeMat:{}, hw:clone(PR_HW),
           q:{ use:'VIRTUVĖ', margin:28, pvm:21, vat:true, matMarkup:10, packing:1, defects:5, fasteners:4, waste:25, depreciation:2.5,
               designKitchen:9, designWardrobe:6, assemblyKitchen:10, assemblyWardrobe:9, admin:10 } };
}
var PR = (function () { var d = prDefaults(), s = store('dbKurejas.pricing') || {};
  return Object.assign(d, s, { def:Object.assign(d.def, s.def || {}), q:Object.assign(d.q, s.q || {}), mat:s.mat || {}, edgeMat:s.edgeMat || {}, hw:Object.assign(d.hw, s.hw || {}) }); })();
function prSave() { store('dbKurejas.pricing', PR); }
S.admin = (function () { try { return !!sessionStorage.getItem('dbKurejas.admin') && sessionStorage.getItem('dbKurejas.admin') === store('dbKurejas.adminPin'); } catch (e) { return false; } })();
function pinHash(pin) {
  var s = 'db-kurejas:' + String(pin);
  if (window.crypto && crypto.subtle && window.TextEncoder) return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return (x < 16 ? '0' : '') + x.toString(16); }).join(''); });
  var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return Promise.resolve('f' + h.toString(16));
}
function eur(v) { v = Math.round((+v || 0) * 100) / 100; var p = v.toFixed(2).split('.'); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + p[1]; }
var CONNECTOR_HW = /konfirmat|confirmat|ekscentrik|minifix|kaišč|dowel|varžt|laikikl/i;   // connectors and shelf supports: covered by "fasteners €/m²" (as in the offer app) unless given a price
function hwBase(item) { return String(item || '').replace(/\s+[LW]=\d+.*$/, '').trim(); }
function hwPrice(item) {
  if (PR.hw[item] != null && PR.hw[item] !== '') return { p:num(PR.hw[item]), ok:true };
  var b = hwBase(item); if (PR.hw[b] != null && PR.hw[b] !== '') return { p:num(PR.hw[b]), ok:true, base:b };
  if (CONNECTOR_HW.test(item)) return { p:0, ok:true, incl:true };
  return { p:0, ok:false };
}
function matPrice(name, kind) {   // kind: carc | facade | back
  if (name && PR.mat[name] != null && PR.mat[name] !== '') return { p:num(PR.mat[name]), ok:true };
  return { p:num(PR.def[kind]), ok:false };
}
function offerDrawerBox(openIn, fh, hw, rail) {   // the offer app's drawerBox for one drawer: board m², cut mm, banded mm
  var cl = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }, boxD = Math.max(150, (num(rail) || 500) - 10);
  if (/MERIVOBOX/i.test(hw || '')) { var bwm = Math.max(120, openIn - 51), shm = cl(fh - 60, 60, 184), bdm = Math.max(150, (num(rail) || 500) - 26);
    return { m2:(bwm * bdm + bwm * shm) / 1e6, perim:2 * (bwm + bdm) + 2 * (bwm + shm), band:bwm }; }
  if (/TANDEMBOX/i.test(hw || '')) { var bw = Math.max(120, openIn - 84), sh = cl(fh - 60, 70, 224);
    return { m2:(bw * boxD + bw * sh) / 1e6, perim:2 * (bw + boxD) + 2 * (bw + sh), band:0 }; }
  var bw2 = Math.max(120, openIn - 26), sh2 = cl(fh - 50, 70, 200);
  return { m2:(2 * (boxD * sh2) + 2 * (bw2 * sh2) + bw2 * (boxD - 2)) / 1e6, perim:2 * (2 * (boxD + sh2)) + 2 * (2 * (bw2 + sh2)) + 2 * (bw2 + (boxD - 2)), band:2 * boxD + 2 * bw2 };
}
function priceCabinet(c, r) {
  var out = { boards:{}, m2:0, mat:0, cutM:0, cut:0, edgeM:0, edge:0, hw:[], hwCost:0, drawers:{ n:0, m2:0, cost:0 }, missing:[], basisM2:0 };
  var miss = function (s) { if (out.missing.indexOf(s) < 0) out.missing.push(s); };
  var mats = c.mat || {}, eds = c.edge || {};
  var addBoard = function (name, kind, m2, inBasis) { var mp = matPrice(name, kind); if (!mp.ok && name) miss((S.lang === 'lt' ? 'medžiaga „' : 'material “') + name + (S.lang === 'lt' ? '“ — imama numatyta ' : '” — default ') + eur(mp.p) + ' €/m²');
    var key = (name || (S.lang === 'lt' ? '(be pavadinimo)' : '(no name)')) + '|' + kind, g = out.boards[key] = out.boards[key] || { name:name, kind:kind, m2:0, price:mp.p, cost:0, ok:mp.ok };
    g.m2 += m2; g.cost += m2 * mp.p; out.m2 += m2; out.mat += m2 * mp.p; if (inBasis) out.basisM2 += m2; };
  var edgeOf = function (name) { return name && PR.edgeMat[name] != null && PR.edgeMat[name] !== '' ? num(PR.edgeMat[name]) : num(PR.edge); };
  (r.panels || []).forEach(function (p) {
    var front = /^(FASADAS|DURYS|PLOKSTE)$/.test(p.role), hdf = p.role === 'PLAUSAS' || /HDF/i.test(p.mat || ''), back = hdf || p.role === 'NUGARA';   // a loose panel (PLOKSTE) is priced as a front board
    var kind = front ? 'facade' : hdf ? 'back' : 'carc', m2 = p.L * p.W / 1e6;
    addBoard(p.mat || (front ? mats.facade : back ? mats.back : mats.carc) || '', kind, m2, !back);   // the offer app leaves backs out of the m² that overheads follow
    var per = 2 * (p.L + p.W) / 1000; out.cutM += per; out.cut += per * num(PR.cut);
    var eb = p.eb || {}; ['y0', 'y1', 'x0', 'x1'].forEach(function (k) { if (!eb[k]) return; var len = (k[0] === 'y' ? p.L : p.W) / 1000; out.edgeM += len; out.edge += len * edgeOf(eb[k]); });
  });
  (c.extras || []).forEach(function (x) {
    var L0 = num(x.L), W0 = num(x.W), q = Math.max(1, Math.round(num(x.qty) || 1)); if (!(L0 > 0 && W0 > 0) || (x.qty !== '' && x.qty != null && !(num(x.qty) > 0))) return;   // not made: not priced
    addBoard(x.mat || mats.carc || '', x.mat && x.mat === mats.facade ? 'facade' : 'carc', L0 * W0 * q / 1e6, true);
    var per = 2 * (L0 + W0) * q / 1000; out.cutM += per; out.cut += per * num(PR.cut);
    var em = x.edgeMat || (x.mat && x.mat === mats.facade ? eds.facade : eds.carc) || ''; [['e1', L0], ['e2', L0], ['e3', W0], ['e4', W0]].forEach(function (e) { if (x[e[0]]) { out.edgeM += e[1] * q / 1000; out.edge += e[1] * q / 1000 * edgeOf(em); } });
  });
  /* the worktop: material by m², cutting, edge on the front and on ends past a side; not in the m² the overheads follow (offer app: a direct cost) */
  var wt = E.worktopOf(c);
  if (wt) { var wm2 = wt.L * wt.W / 1e6; addBoard(wt.mat, 'top', wm2, false); out.top = { m2:wm2, mat:wt.mat };
    var wper = 2 * (wt.L + wt.W) / 1000; out.cutM += wper; out.cut += wper * num(PR.cut);
    if (wt.edge) { var wl = (wt.L + (wt.left > 0 ? wt.W : 0) + (wt.right > 0 ? wt.W : 0)) / 1000; out.edgeM += wl; out.edge += wl * edgeOf(wt.edge); } }
  /* drawer boxes (not cut by the CNC program here, as in the offer app) */
  var vis = (r.visual && r.visual.drawers) || [], t_ = (r.dims && r.dims.t) || num(c.thick) || 18;
  if (vis.length && DR) {
    var vert = (r.panels || []).filter(function (p) { if (!p.place || p.drawerOf || /^(FASADAS|DURYS)$/.test(p.role)) return false; var e = DR.pbox(p); return (e[0][1] - e[0][0]) < Math.min(e[1][1] - e[1][0], e[2][1] - e[2][0]); }).map(function (p) { return DR.pbox(p); });
    vis.forEach(function (f) {
      if (E.R.runner[f.hw] && (E.R.runner[f.hw].ball || E.R.runner[f.hw].under || (E.R.runner[f.hw].merivo && f.mv))) return;   // board box (MERIVOBOX: base and back) already among the parts
      var xc = f.x + f.w / 2, zc = f.bottom + f.h / 2, lo = -Infinity, hi = Infinity;
      vert.forEach(function (e) { if (zc < e[2][0] || zc > e[2][1]) return; if (e[0][1] <= xc + 1) lo = Math.max(lo, e[0][1]); if (e[0][0] >= xc - 1) hi = Math.min(hi, e[0][0]); });
      var openIn = isFinite(lo) && isFinite(hi) ? hi - lo : f.w - 2 * t_;
      var secs = (c.sections || []).filter(function (s2) { return Math.max(0, Math.floor(num(s2.col) || 0)) === (f.col || 0); }), s2 = f.box ? { hw:f.hw, rail:f.rail } : secs[f.sec] || {};
      var db = offerDrawerBox(openIn, f.h + 3, f.hw || s2.hw, s2.rail), mp = matPrice(mats.carc || '', 'carc');
      out.drawers.n++; out.drawers.m2 += db.m2; out.drawers.cost += db.m2 * mp.p + db.perim / 1000 * num(PR.cut) + db.band / 1000 * num(PR.edge);
      out.basisM2 += db.m2; out.cutM += db.perim / 1000; out.edgeM += db.band / 1000;
    });
  }
  (r.hardware || []).forEach(function (h) {
    var hp = hwPrice(h.item); if (!hp.ok) miss((S.lang === 'lt' ? 'furnitūra „' : 'fitting “') + h.item + (S.lang === 'lt' ? '“ — kaina nenurodyta' : '” — no price'));
    out.hw.push({ item:h.item, qty:h.qty, unit:h.unit, price:hp.p, cost:h.qty * hp.p, incl:!!hp.incl, ok:hp.ok }); out.hwCost += h.qty * hp.p;
  });
  return ladder(out);
}
function ladder(o) {   // the offer app's computeQuote, for one cabinet
  var q = PR.q, w = q.use === 'SPINTA', m2 = o.basisM2;
  o.ae = o.mat + o.cut + o.edge + o.drawers.cost; o.direct = o.ae + o.hwCost;
  o.over = [['matMarkup', num(q.matMarkup) / 100 * o.direct], ['packing', num(q.packing) * m2], ['defects', num(q.defects) / 100 * o.direct], ['fasteners', num(q.fasteners) * m2],
            ['waste', num(q.waste) / 100 * o.ae], ['depreciation', num(q.depreciation) * m2], ['design', num(w ? q.designWardrobe : q.designKitchen) * m2]];
  o.production = o.direct + o.over.reduce(function (a, x) { return a + x[1]; }, 0);
  o.assembly = num(w ? q.assemblyWardrobe : q.assemblyKitchen) * m2; o.adminEur = o.production * num(q.admin) / 100;
  o.full = o.production + o.assembly + o.adminEur; o.marginEur = o.full * num(q.margin) / 100; o.offer = o.full + o.marginEur;
  o.vatRate = q.vat === false ? 0 : num(q.pvm) / 100; o.vat = o.offer * o.vatRate; o.withVat = o.offer + o.vat;
  return o;
}
function priceProject() {
  var cabs = S.proj.cabinets.map(function (c, i) { var inf = S._info && S._info[i]; return { i:i, c:c, p:inf ? priceCabinet(c, inf.r) : null }; });
  var pp = S.proj.pricing || {}, sum = function (k) { return cabs.reduce(function (a, x) { return a + (x.p ? x.p[k] : 0); }, 0); };
  var inst = num(pp.montavimas), deliv = num(pp.delivery), extraFull = inst + deliv, rate = PR.q.vat === false ? 0 : num(PR.q.pvm) / 100;
  var extraOffer = extraFull * (1 + num(PR.q.margin) / 100);   // as in the offer app: installation and delivery are costs and get the margin
  var offer = sum('offer') + extraOffer;
  return { cabs:cabs, direct:sum('direct'), full:sum('full') + extraFull, inst:inst, deliv:deliv, offer:offer, vat:offer * rate, withVat:offer * (1 + rate), m2:sum('basisM2') };
}
var PRL = { lt:{ matMarkup:'Medžiagos antkainis', packing:'Pakavimas', defects:'Brokas', fasteners:'Tvirtinimai', waste:'Medžiagos atlieka', depreciation:'Nusidėvėjimas', design:'Projektavimas' },
            en:{ matMarkup:'Material markup', packing:'Packing', defects:'Defects', fasteners:'Fasteners', waste:'Material waste', depreciation:'Depreciation', design:'Design' } };
function prLabel(k) { return (PRL[S.lang] || PRL.lt)[k] || k; }
/* the cabinet's price card (cabinet editor, right column) */
function priceCard(c, inf) {
  if (!S.admin || !inf) return '';
  var o = priceCabinet(c, inf.r), lt = S.lang === 'lt', row = function (l, v, cls) { return '<div class="pr-r' + (cls ? ' ' + cls : '') + '"><span>' + l + '</span><b>' + eur(v) + ' €</b></div>'; };
  var h = '<details class="pricecard"' + (S.prOpen ? ' open' : '') + '><summary><span>€ ' + (lt ? 'Kaina' : 'Price') + ' <span class="badge mut">admin</span></span><b>' + eur(o.offer) + ' € <small>' + (lt ? 'be PVM' : 'excl. VAT') + '</small></b></summary><div class="pr-body">';
  Object.keys(o.boards).forEach(function (k) { var g = o.boards[k]; h += '<div class="pr-r ps"><span>' + esc(g.name || '—') + ' · ' + fmt(Math.round(g.m2 * 100) / 100) + ' m² × ' + eur(g.price) + (g.ok ? '' : ' <i class="pr-def" title="' + (lt ? 'numatyta kaina' : 'default price') + '">*</i>') + '</span><b>' + eur(g.cost) + ' €</b></div>'; });
  h += row((lt ? 'Pjovimas ' : 'Cutting ') + fmt(o.cutM) + ' m', o.cut, 'ps') + row((lt ? 'Kraštų laminavimas ' : 'Edge banding ') + fmt(o.edgeM) + ' m', o.edge, 'ps');
  if (o.drawers.n) h += row((lt ? 'Stalčių dėžės (dugnas, nugarėlė) × ' : 'Drawer boxes (bottom, back) × ') + o.drawers.n, o.drawers.cost, 'ps');
  o.hw.forEach(function (x) { h += '<div class="pr-r ps' + (x.ok ? '' : ' pb') + '"><span>' + esc(x.item) + ' · ' + x.qty + ' × ' + (x.incl ? (lt ? 'į tvirtinimus' : 'in fasteners') : eur(x.price)) + '</span><b>' + eur(x.cost) + ' €</b></div>'; });
  h += row(lt ? 'Tiesioginė savikaina' : 'Direct cost', o.direct, 'pt');
  o.over.forEach(function (x) { if (x[1]) h += row(prLabel(x[0]), x[1], 'ps'); });
  h += row(lt ? 'Gamyba' : 'Production', o.production, 'pt') + row(lt ? 'Surinkimas' : 'Assembly', o.assembly, 'ps') + row(lt ? 'Administracija' : 'Admin', o.adminEur, 'ps') +
       row(lt ? 'Pilna savikaina' : 'Full cost', o.full, 'pt') + row((lt ? 'Antkainis ' : 'Margin ') + fmt(PR.q.margin) + ' %', o.marginEur, 'ps') +
       row(lt ? 'Kaina be PVM' : 'Price excl. VAT', o.offer, 'pt') + row('PVM ' + fmt(o.vatRate * 100) + ' %', o.vat, 'ps') + row(lt ? 'KAINA SU PVM' : 'PRICE INCL. VAT', o.withVat, 'pg');
  if (o.missing.length) h += '<div class="pr-miss"><b>' + (lt ? 'Patikrinkite kainas:' : 'Check prices:') + '</b>' + o.missing.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '<button class="btn ghost" data-act="tab" data-v="set">' + (lt ? 'Kainos →' : 'Prices →') + '</button></div>';
  return h + '<p class="note" style="margin:6px 0 0">' + (lt ? 'Skaičiuojama kaip pasiūlymų skaičiuoklėje, iš tikrų detalių dydžių ir furnitūros sąrašo. * — numatyta kaina.' : 'Worked out as in the offer app, from the real part sizes and the fittings list. * — default price.') + '</p></div></details>';
}
/* project pricing on the Parts & CNC tab */
function priceProjectCard() {
  if (!S.admin) return '';
  var P = priceProject(), lt = S.lang === 'lt', pp = S.proj.pricing || {};
  var rows = P.cabs.map(function (x) { return x.p ? '<tr><td class="n">' + (x.i + 1) + '</td><td>' + esc(x.c.name || typeName(x.c)) + (x.p.missing.length ? ' <span class="badge warn" title="' + esc(x.p.missing.join('\n')) + '">!</span>' : '') + '</td><td class="n">' + fmt(Math.round(x.p.basisM2 * 100) / 100) + '</td><td class="n">' + eur(x.p.direct) + '</td><td class="n">' + eur(x.p.full) + '</td><td class="n"><b>' + eur(x.p.offer) + '</b></td><td class="n">' + eur(x.p.withVat) + '</td></tr>' : ''; }).join('');
  var fN2 = function (k, label) { return '<label class="f n s"><span>' + label + '</span><input type="text" inputmode="decimal" data-bind="pp.' + k + '" data-num="1" value="' + esc(pp[k] || '') + '" placeholder="0"></label>'; };
  return '<div class="card pricing noprint"><div class="row" style="justify-content:space-between;align-items:baseline"><h3 style="margin:0;font:600 20px var(--f-display)">€ ' + (lt ? 'Kainodara' : 'Pricing') + ' <span class="badge mut">admin</span></h3><button class="btn ghost" data-act="tab" data-v="set">' + (lt ? 'Kainos ir antkainiai →' : 'Prices & margins →') + '</button></div>' +
    '<div class="tablewrap" style="margin-top:8px"><table><thead><tr><th class="n">Nr</th><th>' + (lt ? 'Spintelė' : 'Cabinet') + '</th><th class="n">m²</th><th class="n">' + (lt ? 'Tiesioginė' : 'Direct') + ' €</th><th class="n">' + (lt ? 'Savikaina' : 'Full cost') + ' €</th><th class="n">' + (lt ? 'Be PVM' : 'Excl. VAT') + ' €</th><th class="n">' + (lt ? 'Su PVM' : 'Incl. VAT') + ' €</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div class="row" style="margin-top:10px;gap:10px;align-items:flex-end">' + fN2('montavimas', (lt ? 'Montavimas' : 'Installation') + ' €') + fN2('delivery', (lt ? 'Pristatymas' : 'Delivery') + ' €') + '</div>' +
    '<div class="pr-tot"><div><span>' + (lt ? 'Savikaina' : 'Full cost') + '</span><b>' + eur(P.full) + ' €</b></div><div><span>' + (lt ? 'Pasiūlymas be PVM' : 'Quote excl. VAT') + '</span><b>' + eur(P.offer) + ' €</b></div><div class="g"><span>' + (lt ? 'Pasiūlymas su PVM' : 'Quote incl. VAT') + '</span><b>' + eur(P.withVat) + ' €</b></div></div></div>';
}
/* settings: lock / unlock and the price lists */
function adminCard() {
  var lt = S.lang === 'lt', hasPin = !!store('dbKurejas.adminPin');
  var head = '<div class="card admincard"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0;font:600 19px var(--f-display)">€ ' + (lt ? 'Administratoriaus režimas — kainos' : 'Admin mode — pricing') + '</h3>' + (S.admin ? '<span class="row" style="gap:6px"><button class="btn ghost" data-act="adminpin">' + (lt ? 'Keisti PIN' : 'Change PIN') + '</button><button class="btn" data-act="adminlock">🔒 ' + (lt ? 'Užrakinti' : 'Lock') + '</button></span>' : '') + '</div>';
  if (!S.admin) return head + '<p class="note" style="margin:6px 0 10px">' + (hasPin ? (lt ? 'Kainos matomos tik atrakinus administratoriaus PIN kodu.' : 'Prices show only after unlocking with the admin PIN.') : (lt ? 'Nustatykite PIN kodą — tada spintelių kainos bus matomos tik jį įvedus. Kainos ir PIN saugomi tik šiame naršyklės profilyje.' : 'Set a PIN — cabinet prices then show only after entering it. Prices and the PIN stay in this browser only.')) + '</p>' +
    '<div class="row" style="gap:8px;align-items:flex-end"><label class="f s"><span>PIN</span><input id="adm-pin" type="password" inputmode="numeric" autocomplete="off"></label>' + (hasPin ? '' : '<label class="f s"><span>' + (lt ? 'Pakartokite' : 'Repeat') + '</span><input id="adm-pin2" type="password" inputmode="numeric" autocomplete="off"></label>') +
    '<button class="btn pri" data-act="' + (hasPin ? 'adminunlock' : 'adminset') + '">' + (hasPin ? (lt ? 'Atrakinti' : 'Unlock') : (lt ? 'Nustatyti PIN' : 'Set PIN')) + '</button></div></div>';
  var b = 'pr.', inp = function (bind, val, ph, w) { return '<input type="text" inputmode="decimal" data-bind="' + bind + '" aria-label="' + esc(bind.split('.').slice(-1)[0].replace(/․/g, '.')) + '" data-num="1" data-empty="1" value="' + esc(val == null ? '' : val) + '" placeholder="' + esc(ph == null ? '' : ph) + '" style="width:' + (w || 90) + 'px">'; };
  var kvr = function (bind, label, val, unit) { return '<label>' + label + '</label><span class="row" style="gap:5px;align-items:center">' + inp(bind, val) + '<span class="unit">' + unit + '</span></span>'; };
  /* names used in this project and the settings lists */
  var mats = {}, edges = {}, hws = {};
  (S.settings.materials || []).forEach(function (m) { mats[m] = 1; }); Object.keys(PR.mat).forEach(function (m) { mats[m] = 1; });
  (S.settings.edges || []).forEach(function (m) { edges[m] = 1; }); Object.keys(PR.edgeMat).forEach(function (m) { edges[m] = 1; });
  S.proj && S.proj.cabinets.forEach(function (c, i) { [c.mat.carc, c.mat.facade, c.mat.back, c.mat.drawer].forEach(function (m) { if (m) mats[m] = 1; }); [c.edge.carc, c.edge.facade].forEach(function (m) { if (m) edges[m] = 1; });
    (c.extras || []).forEach(function (x) { if (x.mat) mats[x.mat] = 1; }); if (c.worktop && c.worktop.mat) mats[c.worktop.mat] = 1; if (c.worktop && c.worktop.edge) edges[c.worktop.edge] = 1; var inf = S._info && S._info[i]; if (inf) inf.r.hardware.forEach(function (h) { hws[hwBase(h.item)] = 1; }); });
  Object.keys(PR.hw).forEach(function (k) { hws[k] = 1; });
  var esck = function (k) { return k.replace(/\./g, '․'); };   // a dot in a name must not split the binding path
  var matRows = Object.keys(mats).sort().map(function (m) { return '<label title="' + esc(m) + '">' + esc(m) + '</label><span class="row" style="gap:5px;align-items:center">' + inp(b + 'mat.' + esck(m), PR.mat[m], lt ? 'numatyta' : 'default') + '<span class="unit">€/m²</span></span>'; }).join('');
  var edgeRows = Object.keys(edges).sort().map(function (m) { return '<label title="' + esc(m) + '">' + esc(m) + '</label><span class="row" style="gap:5px;align-items:center">' + inp(b + 'edgeMat.' + esck(m), PR.edgeMat[m], fmt(PR.edge)) + '<span class="unit">€/m</span></span>'; }).join('');
  var hwRows = Object.keys(hws).sort().map(function (m) { return '<label title="' + esc(m) + '">' + esc(m) + (CONNECTOR_HW.test(m) ? ' <span class="unit">(' + (lt ? 'tuščia — į tvirtinimus' : 'empty — in fasteners') + ')</span>' : '') + '</label><span class="row" style="gap:5px;align-items:center">' + inp(b + 'hw.' + esck(m), PR.hw[m], CONNECTOR_HW.test(m) ? '—' : '?') + '<span class="unit">€/' + (lt ? 'vnt.' : 'unit') + '</span></span>'; }).join('');
  var q = PR.q;
  if (S.pinChange) head += '<div class="row" style="gap:8px;align-items:flex-end;margin:10px 0 4px"><label class="f s"><span>' + (lt ? 'Naujas PIN' : 'New PIN') + '</span><input id="adm-npin" type="password" inputmode="numeric" autocomplete="new-password"></label>' +
    '<label class="f s"><span>' + (lt ? 'Pakartokite' : 'Repeat') + '</span><input id="adm-npin2" type="password" inputmode="numeric" autocomplete="new-password"></label>' +
    '<button class="btn pri" data-act="adminpinsave">' + (lt ? 'Išsaugoti PIN' : 'Save PIN') + '</button><button class="btn ghost" data-act="adminpincancel">' + (lt ? 'Atšaukti' : 'Cancel') + '</button></div>';
  return head + '<p class="note" style="margin:6px 0 12px">' + (lt ? 'Kaina skaičiuojama kaip pasiūlymų skaičiuoklėje (offer), bet iš tikrų detalių dydžių ir furnitūros sąrašo. Tuščia medžiagos kaina — imama numatyta pagal detalės rūšį.' : 'Priced like the offer app, but from the real part sizes and fittings list. An empty material price uses the default for that kind of part.') + '</p>' +
    '<div class="row" style="gap:8px;margin-bottom:12px"><button class="btn" data-act="primport">⤓ ' + (lt ? 'Perimti kainas iš pasiūlymų skaičiuoklės' : 'Take prices from the offer app') + '</button><label class="btn ghost" for="f-prjson">' + (lt ? 'Iš offer projekto JSON…' : 'From an offer project JSON…') + '</label><input id="f-prjson" type="file" accept=".json" data-act-change="prjson" hidden><button class="btn ghost" data-act="prreset">' + (lt ? 'Numatytos kainos' : 'Default prices') + '</button></div>' +
    '<div class="prgrid"><div><div class="lbl">' + (lt ? 'Operacijos ir numatytos kainos' : 'Operations and defaults') + '</div><div class="kv">' + kvr(b + 'cut', lt ? 'Pjovimas' : 'Cutting', PR.cut, '€/m') + kvr(b + 'edge', lt ? 'Laminavimas' : 'Edge banding', PR.edge, '€/m') +
      kvr(b + 'def.carc', lt ? 'Korpusas (numatyta)' : 'Carcass (default)', PR.def.carc, '€/m²') + kvr(b + 'def.facade', lt ? 'Fasadai (numatyta)' : 'Fronts (default)', PR.def.facade, '€/m²') + kvr(b + 'def.back', lt ? 'Plaušas / HDF (numatyta)' : 'HDF back (default)', PR.def.back, '€/m²') + kvr(b + 'def.top', lt ? 'Stalviršis (numatyta)' : 'Worktop (default)', PR.def.top, '€/m²') + '</div>' +
      '<div class="lbl" style="margin-top:14px">' + (lt ? 'Kaštai ir antkainis' : 'Costs and margin') + '</div><div class="kv">' +
      '<label>' + (lt ? 'Projekto tipas' : 'Project type') + '</label>' + seg('pr.q.use', q.use, [['VIRTUVĖ', lt ? 'Virtuvė' : 'Kitchen'], ['SPINTA', lt ? 'Spinta' : 'Wardrobe']]) +
      kvr(b + 'q.matMarkup', prLabel('matMarkup'), q.matMarkup, '%') + kvr(b + 'q.packing', prLabel('packing'), q.packing, '€/m²') + kvr(b + 'q.defects', prLabel('defects'), q.defects, '%') + kvr(b + 'q.fasteners', prLabel('fasteners'), q.fasteners, '€/m²') +
      kvr(b + 'q.waste', prLabel('waste'), q.waste, '%') + kvr(b + 'q.depreciation', prLabel('depreciation'), q.depreciation, '€/m²') +
      kvr(b + 'q.designKitchen', prLabel('design') + (lt ? ' (virtuvė)' : ' (kitchen)'), q.designKitchen, '€/m²') + kvr(b + 'q.designWardrobe', prLabel('design') + (lt ? ' (spinta)' : ' (wardrobe)'), q.designWardrobe, '€/m²') +
      kvr(b + 'q.assemblyKitchen', (lt ? 'Surinkimas (virtuvė)' : 'Assembly (kitchen)'), q.assemblyKitchen, '€/m²') + kvr(b + 'q.assemblyWardrobe', (lt ? 'Surinkimas (spinta)' : 'Assembly (wardrobe)'), q.assemblyWardrobe, '€/m²') +
      kvr(b + 'q.admin', lt ? 'Administracija' : 'Admin', q.admin, '%') + kvr(b + 'q.margin', lt ? 'Antkainis' : 'Margin', q.margin, '%') + kvr(b + 'q.pvm', 'PVM', q.pvm, '%') +
      '<label>' + (lt ? 'PVM taikomas' : 'VAT applies') + '</label>' + seg('pr.q.vat', q.vat !== false, [['true', lt ? 'Taip' : 'Yes'], ['false', lt ? 'Ne' : 'No']]) + '</div></div>' +
    '<div><div class="lbl">' + (lt ? 'Medžiagos' : 'Materials') + '</div><div class="kv prkv">' + (matRows || '<span class="note">—</span>') + '</div>' +
      '<div class="lbl" style="margin-top:14px">' + (lt ? 'Kraštų juostos (tuščia — laminavimo kaina)' : 'Edge bands (empty — banding rate)') + '</div><div class="kv prkv">' + (edgeRows || '<span class="note">—</span>') + '</div>' +
      '<div class="lbl" style="margin-top:14px">' + (lt ? 'Furnitūra' : 'Fittings') + '</div><div class="kv prkv">' + hwRows + '</div></div></div></div>';
}
/* the offer app keeps its prices in this same site's storage (app.dedesbaldai.lt) — read them when they are there */
function prFromOffer(o) {
  if (!o || !o.rates) return 0; var n = 0, set = function (obj, k, v) { if (v != null && isFinite(+v)) { obj[k] = +v; n++; } };
  set(PR, 'cut', o.rates.cut); set(PR, 'edge', o.rates.edge);
  Object.keys(o.rates.hw || {}).forEach(function (k) { set(PR.hw, k, o.rates.hw[k]); });
  var net = function (m) { var d = (100 - (+m.disc || 0)) / 100; if (m.unit === 'sheet') { var a = (+m.sL || 0) * (+m.sW || 0) / 1e6; return a > 0 ? (+m.price || 0) * d / a : 0; } return (+m.price || 0) * d; };
  var cheap = { KARKASAS:null, FASADAS:null };
  (o.materials || []).forEach(function (m) { if (!m.name) return; var v = net(m); set(PR.mat, m.name, Math.round(v * 100) / 100); var cat = String(m.cat || '').toUpperCase(); if (cheap[cat] === null || (cheap[cat] != null && v < cheap[cat])) cheap[cat] = v; });
  if (cheap.KARKASAS != null) set(PR.def, 'carc', Math.round(cheap.KARKASAS * 100) / 100); if (cheap.FASADAS != null) set(PR.def, 'facade', Math.round(cheap.FASADAS * 100) / 100);
  var oq = o.quote || {}; ['margin', 'pvm', 'matMarkup', 'packing', 'defects', 'fasteners', 'waste', 'depreciation', 'designKitchen', 'designWardrobe', 'assemblyKitchen', 'assemblyWardrobe', 'admin'].forEach(function (k) { set(PR.q, k, oq[k]); });
  if (oq.projType) PR.q.use = oq.projType === 'SPINTA' ? 'SPINTA' : 'VIRTUVĖ'; if (oq.country) PR.q.vat = oq.country === 'LIETUVA';
  return n;
}

/* ----------------------------------------------------------------- render: drawings (drawings.js) */
S.drwOnly = 'all'; S.drwPaper = store('dbKurejas.paper') || 'A3'; S.drwOpen = null;
/* the drawings filter keeps a cabinet by its id ('c:<id>'), so deleting or reordering cabinets never points it at another one */
function drwOnlyIdx() { var o = String(S.drwOnly || 'all'); if (o.indexOf('c:') !== 0) return null; var id = o.slice(2), i = S.proj.cabinets.findIndex(function (c) { return c.id === id; }); return i >= 0 ? i : null; }
function drwOnlyFix() { var o = String(S.drwOnly || 'all'); if (o === 'furn' && !(RM && S.proj.layout && RM.placed(S.proj).length)) S.drwOnly = 'all'; else if (o !== 'all' && o !== 'furn' && drwOnlyIdx() == null) S.drwOnly = 'all'; }
function drwSheets(only, paper) {
  var pp = paper || S.drwPaper;   // the zip's PDF is always A3
  if (only === undefined) drwOnlyFix();
  var o = only === undefined ? S.drwOnly : only, oi = only === undefined ? drwOnlyIdx() : (o === 'all' || o === 'furn' ? null : +o);
  if (RM && RM.ensure(S.proj)) save();   // never opened in Baldai: place the cabinets the way the Baldai tab does, so the furniture is drawn
  var day = new Date().toISOString().slice(0, 10), key = JSON.stringify([S.proj, S.settings, S.lang, pp, o, oi, day]);
  if (DRW_CACHE && DRW_CACHE.key === key) return DRW_CACHE.list;   // the same project and options: the sheets are not drawn again
  var list = DR.sheets(S.proj, S._info || [], { worktops:worktopPieces().pieces, lang:S.lang, project:S.proj.name || projName(), date:day, paper:pp, only:o === 'all' || o === 'furn' ? null : oi, RM:RM });
  if (o === 'furn') { list = list.filter(function (x) { return x.cab == null; }); list.forEach(function (x, k) { x.svg = x.svg.replace(/>\d+ \/ \d+</, '>' + (k + 1) + ' / ' + list.length + '<'); }); }
  DRW_CACHE = { key:key, list:list };
  return list;
}
var DRW_CACHE = null;
function thumbSrc(x) { if (!x._uri) x._uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(x.svg); return x._uri; }   // thumbnails as pictures: far less page to build than inline drawings
/* ======================================================================= cutting plan (Plokštės)
   How many boards each material takes and how the parts lie on them - worked out here, at once, with the Nesting app's
   board size, kerf and edge trim (its settings on this site are read; else 2800 × 2070, kerf 4, trim 15 as on the CNC).
   MaxRects, the best placement of all the parts left on every step (best short side / best area / bottom-left), the
   run with the fewest boards wins; boards with a grain (struktūra) keep the parts' length along the board's length. */
function nestDefaults() {
  var d = { boardW:2800, boardH:2070, kerf:3, kerfCnc:4, trim:15, trimCnc:15, machineMode:'cnc' };
  try { Object.assign(d, JSON.parse(localStorage.getItem('nestDefaults') || '{}')); } catch (e) {}
  var cnc = d.machineMode !== 'saw';
  return { W:num(d.boardW) || 2800, H:num(d.boardH) || 2070, kerf:num(cnc ? d.kerfCnc : d.kerf) || 0, trim:num(cnc ? d.trimCnc : d.trim) || 0 };
}
function nestPack(types, W, H, kerf, trim, how) {   // types: [{ w, h, n, rot, ref }] (w along the board's length); returns sheets of placements
  var UW = W - 2 * trim + kerf, UH = H - 2 * trim + kerf, left = types.map(function (t0) { return { t:t0, n:t0.n }; }), sheets = [], unplaced = [];
  left.forEach(function (q) { var a = q.t.w + kerf <= UW + 1e-6 && q.t.h + kerf <= UH + 1e-6, b = q.t.rot && q.t.h + kerf <= UW + 1e-6 && q.t.w + kerf <= UH + 1e-6; if (!a && !b) { unplaced.push({ t:q.t, n:q.n }); q.n = 0; } });
  var score = function (fr, w, h) { var dw = fr.w - w, dh = fr.h - h;
    if (how === 'baf') return [fr.w * fr.h - w * h, Math.min(dw, dh)]; if (how === 'bl') return [fr.y + h, fr.x]; return [Math.min(dw, dh), Math.max(dw, dh)]; };
  var guard = 0;
  while (left.some(function (q) { return q.n > 0; }) && guard++ < 2000) {
    var free = [{ x:0, y:0, w:UW, h:UH }], pl = [];
    for (;;) {
      var best = null;
      left.forEach(function (q) { if (q.n <= 0) return; var w0 = q.t.w + kerf, h0 = q.t.h + kerf;
        [[w0, h0, false], [h0, w0, true]].forEach(function (o, k) { if (k && (!q.t.rot || Math.abs(w0 - h0) < 1e-6)) return;
          free.forEach(function (fr) { if (o[0] > fr.w + 1e-6 || o[1] > fr.h + 1e-6) return; var sc = score(fr, o[0], o[1]);
            if (!best || sc[0] < best.sc[0] - 1e-9 || (Math.abs(sc[0] - best.sc[0]) < 1e-9 && (sc[1] < best.sc[1] - 1e-9 || (Math.abs(sc[1] - best.sc[1]) < 1e-9 && o[0] * o[1] > best.w * best.h))))
              best = { q:q, x:fr.x, y:fr.y, w:o[0], h:o[1], r:o[2], sc:sc }; }); }); });
      if (!best) break;
      best.q.n--; pl.push({ x:best.x, y:best.y, w:best.w - kerf, h:best.h - kerf, rot:best.r, t:best.q.t, p:(best.q.t.items || [])[best.q.t.n - best.q.n - 1] });
      var nf = [], bx = { x:best.x, y:best.y, w:best.w, h:best.h };
      free.forEach(function (fr) {   // split every free rectangle the new part overlaps
        if (bx.x >= fr.x + fr.w || bx.x + bx.w <= fr.x || bx.y >= fr.y + fr.h || bx.y + bx.h <= fr.y) { nf.push(fr); return; }
        if (bx.x > fr.x) nf.push({ x:fr.x, y:fr.y, w:bx.x - fr.x, h:fr.h });
        if (bx.x + bx.w < fr.x + fr.w) nf.push({ x:bx.x + bx.w, y:fr.y, w:fr.x + fr.w - bx.x - bx.w, h:fr.h });
        if (bx.y > fr.y) nf.push({ x:fr.x, y:fr.y, w:fr.w, h:bx.y - fr.y });
        if (bx.y + bx.h < fr.y + fr.h) nf.push({ x:fr.x, y:bx.y + bx.h, w:fr.w, h:fr.y + fr.h - bx.y - bx.h }); });
      free = nf.filter(function (a, i) { if (a.w < 1 || a.h < 1) return false;   // drop the ones inside another
        return !nf.some(function (b, j) { return j !== i && a.x >= b.x - 1e-6 && a.y >= b.y - 1e-6 && a.x + a.w <= b.x + b.w + 1e-6 && a.y + a.h <= b.y + b.h + 1e-6 && (j < i || a.w * a.h < b.w * b.h - 1e-6 || !(a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h)); }); });
    }
    if (!pl.length) break;
    sheets.push(pl.map(function (q) { return { x:q.x + trim, y:q.y + trim, w:q.w, h:q.h, rot:q.rot, t:q.t }; }));
  }
  return { sheets:sheets, unplaced:unplaced };
}
function nestMaterial(parts, bd, grain) {   // parts of one material → the best of the runs
  var key = {}, types = [];
  parts.forEach(function (p) { var w = Math.max(p.L, p.W), h = Math.min(p.L, p.W);
    if (grain) { w = p.L; h = p.W; }   // with a grain: the part's length (its grain) along the board's length
    var k = w + 'x' + h; if (!key[k]) { key[k] = { w:w, h:h, n:0, rot:!grain, ref:[] }; types.push(key[k]); } key[k].n += p.qty || 1; key[k].ref.push(p); key[k].items = key[k].items || []; for (var qi = 0; qi < (p.qty || 1); qi++) key[k].items.push(p); });
  var best = null;
  ['bl', 'bssf', 'baf'].forEach(function (how) {   // bottom-left first: on a tie its tidy rows win
    var r = nestPack(types.map(function (t0) { return Object.assign({}, t0); }), bd.W, bd.H, bd.kerf, bd.trim, how), last = r.sheets.length ? r.sheets[r.sheets.length - 1].reduce(function (a, q) { return a + q.w * q.h; }, 0) : 0;
    if (!best || r.sheets.length < best.sheets.length || (r.sheets.length === best.sheets.length && last < best.last)) best = { sheets:r.sheets, unplaced:r.unplaced, last:last, how:how };
  });
  return best;
}
function boardOf(mat) { var d = nestDefaults(), b = (S.settings.boards || {})[mat] || {}; return { W:num(b.W) || d.W, H:num(b.H) || d.H, kerf:d.kerf, trim:d.trim, grain:!!b.grain }; }
var NEST_CACHE = { key:null, val:null };
function nestPlan(pj) {   // every material of the project, nested; cached while nothing changes
  var mats = {};
  pj.parts.forEach(function (p) { if (/STALVIR/i.test(String(p.name || '') + ' ' + String(p.short || '')) || !(p.L > 0 && p.W > 0)) return;   // worktops are not cut from these boards
    var k = (p.mat || '—') + '|' + num(p.T); (mats[k] = mats[k] || { mat:p.mat || '—', T:num(p.T), parts:[] }).parts.push(p); });
  var list = Object.keys(mats).map(function (k) { return mats[k]; }).sort(function (a, b) { return b.parts.length - a.parts.length; });
  var ck = JSON.stringify([nestDefaults(), S.settings.boards || {}, list.map(function (m) { return [m.mat, m.T, m.parts.map(function (p) { return [p.L, p.W, p.qty, p.short]; })]; })]);
  if (NEST_CACHE.key === ck) return NEST_CACHE.val;
  var out = list.map(function (m) { var bd = boardOf(m.mat), r = nestMaterial(m.parts, bd, bd.grain), used = 0;
    r.sheets.forEach(function (sh) { sh.forEach(function (q) { used += q.w * q.h; }); });
    return { mat:m.mat, T:m.T, bd:bd, sheets:r.sheets, unplaced:r.unplaced, parts:m.parts.reduce(function (a, p) { return a + (p.qty || 1); }, 0), area:used / 1e6, util:r.sheets.length ? used / (r.sheets.length * bd.W * bd.H) : 0 }; });
  NEST_CACHE = { key:ck, val:out };
  return out;
}
var NEST_COLS = ['#cfe3f5', '#f7dcc0', '#d3ecd0', '#ecd4ee', '#f5e7b3', '#cdeae6', '#f3cfd3', '#dcd9f2', '#e6e6d0', '#d6e4c4'];
function nestSheetSvg(m, sh, k) {
  var bd = m.bd, used = sh.reduce(function (a, q) { return a + q.w * q.h; }, 0), f = function (v) { return (Math.round(v * 10) / 10).toString(); };
  var svg = '<svg viewBox="-4 -4 ' + (bd.W + 8) + ' ' + (bd.H + 8) + '" class="nestsvg" role="img" aria-label="' + esc(m.mat + ' ' + (k + 1)) + '">' +
    '<rect x="0" y="0" width="' + bd.W + '" height="' + bd.H + '" fill="#f6f3ec" stroke="#5b625d" stroke-width="5"/>' +
    (bd.trim ? '<rect x="' + bd.trim + '" y="' + bd.trim + '" width="' + (bd.W - 2 * bd.trim) + '" height="' + (bd.H - 2 * bd.trim) + '" fill="none" stroke="#b9b2a2" stroke-width="3" stroke-dasharray="14 10"/>' : '');
  sh.forEach(function (q) {
    var p0 = q.p || q.t.ref[0], col = NEST_COLS[((+p0.cab || 0) + NEST_COLS.length - 1) % NEST_COLS.length], vert = q.h > q.w * 1.25;
    var lab = String(p0.short || ''), dims = E.num(Math.round(q.t.w)) + '×' + E.num(Math.round(q.t.h)), along = vert ? q.h : q.w, across = vert ? q.w : q.h;
    var fs = Math.min(80, across / 2.7, along / (Math.max(lab.length, dims.length) * 0.58)), two = fs >= 34;
    if (!two) { fs = Math.min(80, across / 1.4, along / (dims.length * 0.58)); }   // too thin for both lines: the size only
    var cx = q.x + q.w / 2, cy = (bd.H - q.y - q.h) + q.h / 2;
    svg += '<g><title>' + esc(lab + ' · ' + (p0.name || '') + ' · ' + dims + (q.rot ? ' ↻' : '')) + '</title>' +
      '<rect x="' + f(q.x) + '" y="' + f(bd.H - q.y - q.h) + '" width="' + f(q.w) + '" height="' + f(q.h) + '" fill="' + col + '" stroke="#2f3532" stroke-width="3"/>' +
      (fs >= 22 ? '<text x="' + f(cx) + '" y="' + f(cy) + '" font-size="' + f(fs) + '" text-anchor="middle" dominant-baseline="central" fill="#1d2320"' + (vert ? ' transform="rotate(-90 ' + f(cx) + ' ' + f(cy) + ')"' : '') + '>' +
        (two ? '<tspan x="' + f(cx) + '" dy="-0.55em" font-weight="700">' + esc(lab) + '</tspan><tspan x="' + f(cx) + '" dy="1.15em">' + dims + '</tspan>' : dims) + '</text>' : '') + '</g>';
  });
  return '<figure class="nestsheet"><figcaption><b>' + (k + 1) + ' / ' + m.sheets.length + '</b><span>' + Math.round(used / (bd.W * bd.H) * 100) + '%</span><span class="unit">' + sh.length + ' ' + t('nestPcs') + '</span></figcaption>' + svg + '</svg></figure>';
}
function viewNest() {
  var pj = buildProjectAll(), plan = nestPlan(pj), nd = nestDefaults(), tot = plan.reduce(function (a, m) { return a + m.sheets.length; }, 0);
  var h = '<section class="card nestcard"><div class="row" style="justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:10px"><div><h2 style="margin:0">' + t('nestT') + '</h2><p class="lead" style="margin:4px 0 0">' + t('nestL').replace('{k}', E.num(nd.kerf)).replace('{tr}', E.num(nd.trim)) + '</p></div>' +
    '<div class="row" style="gap:8px"><button class="btn" data-act="nestopen" title="' + esc(t('nestOpenT')) + '">↗ ' + t('nestOpen') + '</button></div></div>';
  if (!plan.length) return h + '<p class="note">' + t('nestNone') + '</p></section>';
  h += '<div class="nestwrap"><table class="nesttab"><thead><tr><th>' + t('nestMat') + '</th><th>' + t('nestBoard') + '</th><th class="r">' + t('nestSheets') + '</th><th class="r">' + t('nestUtil') + '</th><th class="r">' + t('nestParts') + '</th><th class="r">' + t('nestArea') + '</th><th>' + t('nestGrain') + '</th></tr></thead><tbody>' +
    plan.map(function (m, i) { var id = 'nb-' + i;
      return '<tr><td><b>' + esc(m.mat) + '</b> <span class="unit">' + E.num(m.T) + ' mm</span></td>' +
        '<td class="nestbd"><input type="text" inputmode="numeric" aria-label="' + esc(t('nestBW')) + '" data-nestw="' + esc(m.mat) + '" value="' + m.bd.W + '"> × <input type="text" inputmode="numeric" aria-label="' + esc(t('nestBH')) + '" data-nesth="' + esc(m.mat) + '" value="' + m.bd.H + '"></td>' +
        '<td class="r"><b class="nestn">' + m.sheets.length + '</b>' + (m.unplaced.length ? ' <span class="badge warn">+' + m.unplaced.reduce(function (a, u) { return a + u.n; }, 0) + ' ' + t('nestBig') + '</span>' : '') + '</td>' +
        '<td class="r">' + Math.round(m.util * 100) + '%</td><td class="r">' + m.parts + '</td><td class="r">' + E.num(Math.round(m.area * 100) / 100) + ' m²</td>' +
        '<td><label class="chk"><input type="checkbox" id="' + id + '" data-nestg="' + esc(m.mat) + '"' + (m.bd.grain ? ' checked' : '') + '> ' + t('nestGrainL') + '</label></td></tr>'; }).join('') +
    '</tbody><tfoot><tr><td colspan="2"><b>' + t('nestTot') + '</b></td><td class="r"><b>' + tot + '</b></td><td colspan="4"></td></tr></tfoot></table></div>';
  plan.forEach(function (m) {
    h += '<div class="nestmat"><h3>' + esc(m.mat) + ' <span class="unit">' + E.num(m.T) + ' mm · ' + m.bd.W + ' × ' + m.bd.H + ' · ' + m.sheets.length + ' ' + t('nestSh') + '</span></h3>' +
      (m.unplaced.length ? '<p class="note warn">' + t('nestBigL') + ': ' + m.unplaced.map(function (u) { return esc(u.t.ref[0].short) + ' ' + E.num(u.t.w) + '×' + E.num(u.t.h) + ' (' + u.n + ')'; }).join(', ') + '</p>' : '') +
      '<div class="nestgrid">' + m.sheets.map(function (sh, k) { return nestSheetSvg(m, sh, k); }).join('') + '</div></div>';
  });
  return h + '<p class="note">' + t('nestNote') + '</p></section>';
}
/* the whole project to the Nesting app (same site): the .xlsx it reads, handed over through this browser's storage */
function nestHandoff() {
  var pj = buildProjectAll(), w = window.open('about:blank', '_blank');
  xlsmBytes(pj).then(function (bytes) {
    var b = '', u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); for (var i = 0; i < u8.length; i += 0x8000) b += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    try { localStorage.setItem('dbNestHandoff', JSON.stringify({ name:projName() + '_ReportLists_to_Excel.xlsx', b64:btoa(b), at:Date.now() })); }
    catch (e) { if (w) w.close(); toast(t('nestHandFail'), true); return; }
    var url = (location.pathname.indexOf('/builder') >= 0 ? location.pathname.replace(/\/builder\/?.*$/, '/nesting/') : '/nesting/') + '?from=builder';
    if (w) w.location.href = url; else location.href = url;
  });
}
function viewDrw() {
  if (!DR) return '<div class="card empty">drawings.js</div>';
  if (!S.proj.cabinets.length) return '<div class="card empty">' + t('drwNone') + '</div>';
  var list = S._drw = drwSheets(), cabs = S.proj.cabinets;
  var opts = [['all', t('drwAll')]].concat(RM && S.proj.layout && RM.placed(S.proj).length ? [['furn', t('drwFurn')]] : []).concat(cabs.map(function (c, i) { return ['c:' + c.id, (i + 1) + ' · ' + (c.name || typeName(c))]; }));
  var h = '<div class="drw"><div class="card drwhead"><div><h2 style="margin:0 0 6px;font:600 26px var(--f-display)">' + t('drwTitle') + ' <span class="unit">· ' + list.length + ' ' + t('drwSheets') + '</span></h2><p class="note" style="margin:0;max-width:760px">' + t('drwLead') + '</p></div>' +
    '<div class="drwctl"><label class="f"><span>' + t('drwShow') + '</span><select id="drw-only" data-act-change="drwonly">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(S.drwOnly) === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>' +
    '<div class="f"><span>' + t('drwPaper') + '</span>' + ['A3', 'A4'].map(function (pp) { return '<button type="button" class="btn' + (S.drwPaper === pp ? ' on' : '') + '" data-act="drwpaper" data-v="' + pp + '" aria-pressed="' + (S.drwPaper === pp) + '">' + pp + '</button>'; }).join('') + '</div>' +
    '<button class="btn pri big" data-act="drwpdf"' + (list.length ? '' : ' disabled') + '>' + t('drwPdf').replace('{n}', list.length) + '</button></div><p class="note" style="margin:0">' + t('drwZip') + '</p></div>';
  h += '<div class="drwgrid">' + list.map(function (x, i) {
    return '<figure class="drwcard"><button type="button" class="drwthumb" data-act="drwopen" data-i="' + i + '" aria-label="' + esc(t('drwView') + ': ' + x.title) + '"><img src="' + thumbSrc(x) + '" alt="" loading="lazy" decoding="async"></button>' +
      '<figcaption><span><b>' + (i + 1) + '</b> · ' + esc(x.title) + '</span><button type="button" class="btn ghost" data-act="drwpdf1" data-i="' + i + '">' + t('drwOne') + '</button></figcaption></figure>';
  }).join('') + '</div></div>';
  if (S.drwOpen != null && list[S.drwOpen]) { var x = list[S.drwOpen];
    h += '<div class="drwover" data-act="drwclose" role="dialog" aria-modal="true" aria-label="' + esc(x.title) + '"><div class="drwbox" data-stop="1"><div class="drwbar"><b>' + (S.drwOpen + 1) + ' / ' + list.length + ' · ' + esc(x.title) + '</b><span><button class="btn" data-act="drwnav" data-v="-1"' + (S.drwOpen ? '' : ' disabled') + '>' + t('drwPrev') + '</button><button class="btn" data-act="drwnav" data-v="1"' + (S.drwOpen < list.length - 1 ? '' : ' disabled') + '>' + t('drwNext') + '</button><button class="btn" data-act="drwpdf1" data-i="' + S.drwOpen + '">' + t('drwOne') + '</button><button class="btn pri" data-act="drwclose">' + t('drwClose') + ' ✕</button></span></div>' +
      '<div class="drwbig">' + x.svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, 'width="100%"') + '</div></div></div>'; }
  return h;
}
function drawingsPdf(list, paper) {
  return DR.pdf(list, { paper:paper || S.drwPaper, title:(S.proj.name || projName()) + ' drawings', progress:function (i, n) { toast(t('drwBuilding').replace('{i}', i).replace('{n}', n)); } });
}
function savePdf(list, name) {
  if (!list.length) return;
  drawingsPdf(list).then(function (u) { saveFile(name, u); toast(t('drwDone')); }).catch(function (e) { toast(t('drwFail') + (e && e.message || e), true); });
}
/* ----------------------------------------------------------------- render: results */
function viewRes(pj) {
  S._pjParts = pj.parts;   // extra parts and worktops open in the part panel too
  partResolve();
  if (!pj.parts.length) return '<div class="card empty">' + t('noCab') + '</div>';
  var parts = pj.parts.slice().sort(function (a, b) { return (b.T - a.T) || String(a.mat).localeCompare(String(b.mat)) || (a.cab - b.cab) || a.name.localeCompare(b.name); });
  var ebM = parts.reduce(function (a, p) { return a + p.ebLen; }, 0) / 1000;
  var area = parts.reduce(function (a, p) { return a + p.L * p.W * p.qty / 1e6; }, 0);
  var h = '<div class="res"><div class="printhead">' + esc((S.proj.name || projName()) + ' · ' + new Date().toISOString().slice(0, 10) + ' · ' + t('rTitle')) + '</div><div class="reshead"><div><h2 style="margin:0 0 8px;font:600 26px var(--f-display)">' + t('rTitle') + '</h2><div class="stats">' +
    stat(S.proj.cabinets.length, t('cabs')) + stat(parts.length, t('parts')) + stat(pj.files.length, t('progs')) + stat(fmt(area) + ' m²', S.lang === 'lt' ? 'plokštės' : 'board') + stat(fmt(ebM) + ' m', S.lang === 'lt' ? 'kraštų' : 'edging') +
    '</div></div><div><div class="dl"><button class="btn pri big" data-act="dl" data-v="zip">' + t('zipAll') + '</button>' +
    '<button class="btn" data-act="dlall" title="' + t('xxlAllT') + '">' + t('xxlAll').replace('{n}', pj.files.length) + '</button>' +
    '<button class="btn" data-act="dl" data-v="xlsm">' + t('xlsm') + '</button><button class="btn" data-act="dl" data-v="csv">' + t('csv') + '</button>' + (IN_ARTIFACT ? '' : '<button class="btn" data-act="print">' + t('print') + '</button>') +
    '</div><p class="note" style="margin:6px 0 0">' + t('zipNote') + '</p></div></div>';
  h += readyCheck(pj) + priceProjectCard();
  var bad = pj.warnings.filter(function (w) { return level(w) === 'bad'; });
  if (bad.length) h += '<div class="warns">' + bad.map(function (x) { return '<div class="w bad"><span class="tag">' + t('errTag') + '</span><span>' + esc(wTxt(x)) + '</span></div>'; }).join('') + '</div>';
  var rows = '', curG = null, nr = 0;
  parts.forEach(function (p) {
    var g = p.mat + ' · ' + E.num(p.T) + ' mm';
    if (g !== curG) { curG = g; rows += '<tr class="grp"><td colspan="9">' + esc(p.mat && !(p.mat === 'BE MEDŽIAGOS' && S.lang !== 'lt') ? p.mat : (S.lang === 'lt' ? 'be medžiagos' : 'no material')) + ' · ' + E.num(p.T) + ' mm</td></tr>'; }
    rows += '<tr class="part' + (S.part === p.name ? ' on' : '') + '" data-act="part" data-v="' + esc(p.name) + '" tabindex="0"><td class="n">' + (++nr) + '</td><td><b>' + esc(p.short) + '</b><br><span class="unit">' + esc(p.name) + '</span></td><td class="n">' + p.cab + '</td>' +
      '<td class="n">' + fmt(p.L) + '</td><td class="n">' + fmt(p.W) + '</td><td class="n">' + E.num(p.T) + '</td><td class="n">' + p.qty + '</td><td class="mono">' + esc(X.edgeText(p.eb) || '—') + '</td><td>' +
      ((p.progs || []).length ? p.progs.map(function (f, k) { return '<button type="button" class="prog dlp' + (f.kind === 'rot' ? ' rot' : '') + '" data-act="dlprog" data-v="' + esc(f.file) + '" title="' + esc(t('xxlOne') + ' ' + f.file) + '">⤓ ' + (f.kind === 'rot' ? '↻ ' : '') + (k + 1) + 'OP</button>'; }).join('') : '<span class="prog none">' + t('noProg') + '</span>') + '</td></tr>';
  });
  var table = '<div class="tablewrap"><table><thead><tr><th class="n">Nr</th><th>' + t('cDet') + '</th><th class="n">' + t('cCab') + '</th><th class="n">' + t('cL') + '</th><th class="n">' + t('cW') + '</th><th class="n">' + t('cT') + '</th><th class="n">' + t('cQ') + '</th><th>' + t('cEdge') + '</th><th>' + t('cProg') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  var hw = '<div class="card"><h3 style="margin:0 0 4px;font:600 20px var(--f-display)">' + t('hw') + '</h3><p class="note" style="margin:0 0 8px">' + t('hwNote') + '</p><div class="tablewrap"><table class="hwtable"><tbody>' +
    pj.hardware.map(function (x) { return '<tr><td>' + esc(DR ? DR.hwText(x.item, S.lang) : x.item) + '</td><td class="n">' + x.qty + '</td><td>' + esc(DR ? DR.unitText(x.unit, S.lang) : x.unit) + '</td><td class="unit">' + (S.lang === 'lt' ? 'sp. ' : 'cab. ') + x.cabs.join(', ') + '</td></tr>'; }).join('') + '</tbody></table></div></div>';
  var other = pj.warnings.filter(function (w) { return level(w) !== 'bad'; });
  var wl = '<div class="card noprint"><h3 style="margin:0 0 8px;font:600 20px var(--f-display)">' + t('allWarn') + '</h3><div class="warns">' + (other.length ? dedupe(other).map(function (x) { var lv = level(x); return '<div class="w ' + lv + '"><span class="tag">' + t(lv === 'warn' ? 'warnTag' : 'infoTag') + '</span><span>' + esc(wTxt(x)) + '</span></div>'; }).join('') : '<span class="note">' + t('none') + '</span>') + '</div></div>';
  var byCab = {}; pj.parts.forEach(function (p) { (p.progs || []).forEach(function (f, k) { (byCab[p.cab] = byCab[p.cab] || []).push({ f:f, k:k, p:p }); }); });
  var plist = '<div class="card noprint" id="proglist"><div class="plhead"><h3 style="margin:0;font:600 20px var(--f-display)">' + t('xxlTitle') + ' <span class="unit">· ' + pj.files.length + '</span></h3>' +
    '<button class="btn" data-act="dlall">' + t('xxlAll').replace('{n}', pj.files.length) + '</button></div><p class="note" style="margin:4px 0 10px">' + t('xxlLead') + '</p>' +
    Object.keys(byCab).sort(function (a, b) { return a - b; }).map(function (cn) {
      var cab = S.proj.cabinets[cn - 1] || {};
      return '<div class="plcab"><div class="plct"><b>' + cn + ' · ' + esc(cab.name || typeName(cab)) + '</b><button class="btn ghost" data-act="dlcab" data-v="' + cn + '">' + t('xxlCab').replace('{n}', byCab[cn].length) + '</button></div>' +
        byCab[cn].map(function (x) { return '<div class="plrow"><span class="plf mono">' + esc(x.f.file) + '</span><span class="unit">' + esc(x.p.short) + ' · ' + (x.f.kind === 'rot' ? '↻ ' + t('xxlRot') : (x.k + 1) + 'OP') + '</span>' +
          '<button class="btn" data-act="dlprog" data-v="' + esc(x.f.file) + '" aria-label="' + esc(t('xxlOne') + ' ' + x.f.file) + '">⤓ .XXL</button></div>'; }).join('') + '</div>';
    }).join('') + '</div>';
  h += '<div class="split"><div style="display:flex;flex-direction:column;gap:16px;min-width:0">' + table + plist + hw + wl + '</div><aside class="pview">' + viewPart() + '</aside></div></div>';
  return h;
}
/* before it goes to the machine: what is missing, with a direct way to fix it */
function readyCheck(pj) {
  var items = [], cabs = S.proj.cabinets;
  if (!String(S.proj.name || '').trim()) items.push(['bad', t('ckName'), '<button class="btn" data-act="fixname">' + t('ckFix') + '</button>']);
  else items.push(['ok', t('ckNameOk').replace('{n}', projName())]);
  var noMat = [], noEdge = [];
  var noWt = [];
  cabs.forEach(function (c, i) { if (needsMats(c)) noMat.push(i); if (needsWt(c)) noWt.push(i); if (!c.edge.carc && !c.dishwasher) noEdge.push(i); });
  var nums = function (a) { return a.map(function (i) { return i + 1; }).join(', '); };
  if (noMat.length) items.push(['bad', t('ckMat').replace('{c}', nums(noMat)), '<button class="btn" data-act="fixcab" data-i="' + noMat[0] + '" data-v="mats">' + t('ckFix') + '</button>']);
  else items.push(['ok', t('ckMatOk')]);
  if (noWt.length) items.push(['bad', t('ckWt').replace('{c}', nums(noWt)), '<button class="btn" data-act="fixcab" data-i="' + noWt[0] + '" data-v="wt">' + t('ckFix') + '</button>']);
  if (noEdge.length) items.push(['warn', t('ckEdge').replace('{c}', nums(noEdge)), '<button class="btn ghost" data-act="fixcab" data-i="' + noEdge[0] + '" data-v="mats">' + t('ckFix') + '</button>']);
  var errs = pj.warnings.filter(function (w) { return level(w) === 'bad'; }).length;
  if (errs) items.push(['bad', t('ckErr').replace('{n}', errs)]);
  items.push(['ok', t('ckProg').replace('{n}', pj.files.length).replace('{p}', pj.parts.length)]);
  var badN = items.filter(function (x) { return x[0] === 'bad'; }).length;
  return '<div class="card ready ' + (badN ? 'bad' : 'ok') + ' noprint"><div class="ready-h"><b>' + (badN ? t('ckTitleBad') : t('ckTitleOk')) + '</b></div><ul>' + items.map(function (x) {
    return '<li class="' + x[0] + '"><span class="ic" aria-hidden="true">' + (x[0] === 'ok' ? '✓' : x[0] === 'warn' ? '!' : '✕') + '</span><span class="tx">' + x[1] + '</span>' + (x[2] || '') + '</li>'; }).join('') + '</ul></div>';
}
function stat(v, l) { return '<div class="stat"><b>' + v + '</b><span>' + l + '</span></div>'; }
function partResolve() {   // the chosen part after the project or a cabinet was renamed (its name changes, its cabinet and key do not)
  if (!S.part || findPanel(S.part) || !S.partRef) return; var inf = S._info && S._info[S.partRef.cab - 1]; if (!inf) return;
  var p = inf.r.panels.filter(function (q) { return q.key === S.partRef.key; })[0]; if (p) S.part = p.name;
}
function findPanel(name) {
  for (var i = 0; i < S.proj.cabinets.length; i++) {
    var r = (S._info && S._info[i]) ? S._info[i].r : E.buildCabinet(engineDef(S.proj.cabinets[i]), i, projName());
    for (var j = 0; j < r.panels.length; j++) if (r.panels[j].name === name) return r.panels[j];
  }
  return null;
}
/* which edges are banded: four toggles placed like the edges on the label picture (bottom = Y0, top = Y=DY, left = X0, right = X=DX) */
function ebEditor(p, up) {   // laid out as the picture under it (a part drilled from face B is drawn turned over: y0 at the top)
  var b = function (e, cls, len) { var on = !!(p.eb && p.eb[e]);
    return '<button type="button" class="ebt ' + cls + (on ? ' on' : '') + '" data-act="ebtog" data-v="' + e + '" aria-pressed="' + on + '" title="' + esc(t('ebT') + ' ' + fmt(len) + ' mm') + '">' + (on ? '▬ ' : '＋ ') + fmt(len) + '</button>'; };
  var r = Math.min(1, 2.2 * p.W / p.L), ph = Math.round(Math.max(26, Math.min(70, 120 * r)));
  return '<div class="ebedit noprint"><div class="ebh"><b>' + t('ebTitle') + '</b><span class="unit">' + t('ebLead') + '</span>' + (p.ebManual ? '<button type="button" class="btn ghost ebreset" data-act="ebreset">↺ ' + t('ebStd') + '</button>' : '') + '</div>' +
    '<label class="ebfac"><input type="checkbox" data-act="ebfac"' + (p.ebFac ? ' checked' : '') + '> ' + t('ebFac') + '</label>' +
    '<div class="ebgrid">' + b(up === 'B' ? 'y0' : 'y1', 'top', p.L) + b('x0', 'left', p.W) + '<span class="ebpart" style="height:' + ph + 'px"></span>' + b('x1', 'right', p.W) + b(up === 'B' ? 'y1' : 'y0', 'bot', p.L) + '</div></div>';
}
function viewPart() {
  var p = S.part && findPanel(S.part);
  if (!p) { var lp = S.part && (S._pjParts || []).filter(function (x) { return x.name === S.part; })[0];
    if (!lp) return '<div class="card empty">' + t('pick') + '</div>';
    var eb = lp.eb || {}, fake = { L:+lp.L, W:+lp.W, eb:{ y0:eb.eb1, y1:eb.eb2, x0:eb.eb3, x1:eb.eb4 }, edges:[], holes:[] };   // an extra part or a worktop: cut on the saw, no CNC program
    return '<div class="paper"><div class="tb"><b>' + esc(lp.short || lp.name) + '</b><span>' + fmt(lp.L) + ' × ' + fmt(lp.W) + ' × ' + E.num(lp.T) + (lp.qty > 1 ? ' · ' + lp.qty + ' ' + (S.lang === 'lt' ? 'vnt.' : 'pcs') : '') + '</span></div>' +
      '<div class="draw">' + panelSVG(fake, 'A') + '</div><div class="note" style="margin-top:6px;color:#5f6a64">' + esc(lp.mat || '—') + (X.edgeText(lp.eb) ? ' · ' + esc(X.edgeText(lp.eb)) : '') + '</div></div>' +
      '<div class="card empty">' + (S.lang === 'lt' ? 'Šiai detalei CNC programos nėra — ji pjaunama pjūklu.' : 'This part has no CNC program — it is cut on the saw.') + '</div>'; }
  var pr = E.programs(p), f = pr.files[Math.min(S.ptab, pr.files.length - 1)];
  var tabs = pr.files.map(function (x, i) { return '<button class="btn' + (i === S.ptab ? ' pri' : '') + '" data-act="ptab" data-v="' + i + '">' + (x.kind === 'rot' ? '↻ ' : '') + (i + 1) + 'OP</button>'; }).join('');
  return '<div class="paper"><div class="tb"><b>' + esc(p.short) + '</b><span>' + fmt(p.L) + ' × ' + fmt(p.W) + ' × ' + E.num(p.T) + '</span></div>' + ebEditor(p, pr.files[0] ? pr.files[0].up : 'A') + '<div class="draw">' + panelSVG(p, pr.files[0] ? pr.files[0].up : 'A') + '</div>' +
    '<div class="legend"><span><i style="border:1.5px solid #2448c9;background:#dfe6fb"></i>' + t('lgA') + '</span><span><i style="border:1.5px dashed #b4291f"></i>' + t('lgB') + '</span><span><i style="background:#1b211e"></i>' + t('lgT') + '</span><span><i style="background:#9a6a00;width:7px;height:7px"></i>' + t('lgM') + '</span><span><i style="border-radius:1px;background:#2f7d55;height:5px"></i>' + t('lgE') + '</span><span><i style="border-radius:0;background:#f2b705;height:4px"></i>' + t('lgEb') + '</span></div>' +
    '<div class="note" style="margin-top:6px;color:#5f6a64">' + esc(noteTxt(p.note)) + '</div></div>' +
    (f && f.kind === 'rot' ? '<p class="note" style="margin:0">' + t('rotHint') + '</p>' : '') +
    (f ? '<div class="ptabs">' + tabs + '<span class="unit">' + esc(f.file) + '</span><span class="pdl"><button class="btn ghost" data-act="copy">' + t('copy') + '</button><button class="btn pri" data-act="dlprog" data-v="' + esc(f.file) + '">⤓ .XXL</button>' +
      (pr.files.length > 1 ? '<button class="btn" data-act="dlpart" data-v="' + esc(p.name) + '">' + t('xxlPart').replace('{n}', pr.files.length) + '</button>' : '') + '</span></div><pre class="code" id="progtext">' + esc(f.text) + '</pre>' : '<div class="card empty">' + t('noProg') + '</div>');
}
/* panel as the operator sees it in 1OP: X to the right from the left end, Y up from the front edge */
function panelSVG(p, up) {
  var L = p.L, W = p.W, maxW = 420, maxH = 300, k = Math.min(maxW / L, maxH / W), pad = 26;
  var sw = L * k + 2 * pad, sh = W * k + 2 * pad;
  var X = function (x) { return pad + x * k; }, Y = function (y) { return pad + (W - y) * k; };
  var my = function (y) { return up === 'A' ? y : W - y; };
  var s = '<svg viewBox="0 0 ' + sw.toFixed(0) + ' ' + sh.toFixed(0) + '" width="100%" style="max-width:' + sw.toFixed(0) + 'px" xmlns="http://www.w3.org/2000/svg" font-family="IBM Plex Mono,monospace">';
  s += '<rect x="' + pad + '" y="' + pad + '" width="' + (L * k).toFixed(1) + '" height="' + (W * k).toFixed(1) + '" fill="#ffffff" stroke="#1b211e" stroke-width="1.4"/>';
  var ebMap = { y0:[0, 0, L, 0], y1:[0, W, L, W], x0:[0, 0, 0, W], x1:[L, 0, L, W] };
  Object.keys(p.eb || {}).forEach(function (e) { if (!p.eb[e]) return; var a = ebMap[e]; var ya = my(a[1]), yb = my(a[3]); s += '<line x1="' + X(a[0]).toFixed(1) + '" y1="' + Y(ya).toFixed(1) + '" x2="' + X(a[2]).toFixed(1) + '" y2="' + Y(yb).toFixed(1) + '" stroke="#f2b705" stroke-width="4"/>'; });
  p.edges.forEach(function (e) {
    var dpx = Math.max(6, e.depth * k), r = Math.max(1.6, e.d * k / 2), x1, y1, x2, y2;
    if (e.edge === 'x0') { x1 = X(0); x2 = X(0) + dpx; y1 = y2 = Y(my(e.pos)); }
    else if (e.edge === 'x1') { x1 = X(L); x2 = X(L) - dpx; y1 = y2 = Y(my(e.pos)); }
    else { var yy = my(e.edge === 'y0' ? 0 : W); x1 = x2 = X(e.pos); y1 = Y(yy); y2 = yy === 0 ? y1 - dpx : y1 + dpx; }
    s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#2f7d55" stroke-width="' + (2 * r).toFixed(1) + '" stroke-opacity="0.8"/>';
  });
  (p.grooves || []).forEach(function (g) {   // routed grooves (LED profile): filled on the face up, dashed on the other
    var ya = my(g.y0), yb = my(g.y1), on = g.face === up;
    s += '<rect x="' + X(g.x0).toFixed(1) + '" y="' + Y(Math.max(ya, yb)).toFixed(1) + '" width="' + ((g.x1 - g.x0) * k).toFixed(1) + '" height="' + Math.max(2, Math.abs(yb - ya) * k).toFixed(1) + '" fill="' + (on ? '#ffd860' : 'none') + '" fill-opacity=".8" stroke="#c99a00" stroke-width="1.2"' + (on ? '' : ' stroke-dasharray="4 3"') + '/>'; });
  p.holes.forEach(function (h) {
    var cx = X(h.x), cy = Y(my(h.y)), r = Math.max(h.mark ? 1.6 : 2, h.d * k / 2);
    if (h.mark) s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#9a6a00"/>';
    else if (h.through) s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#1b211e"/>';
    else if (h.face === up) s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="#dfe6fb" stroke="#2448c9" stroke-width="1.3"/>';
    else s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="#b4291f" stroke-width="1.3" stroke-dasharray="2.5 2"/>';
  });
  s += '<text x="' + (pad + L * k / 2).toFixed(0) + '" y="' + (sh - 7).toFixed(0) + '" font-size="11" text-anchor="middle" fill="#1b211e">' + fmt(L) + '</text>';
  s += '<text x="' + (pad - 7).toFixed(0) + '" y="' + (pad + W * k / 2).toFixed(0) + '" font-size="11" text-anchor="middle" fill="#1b211e" transform="rotate(-90 ' + (pad - 7).toFixed(0) + ' ' + (pad + W * k / 2).toFixed(0) + ')">' + fmt(W) + '</text>';
  s += '<circle cx="' + pad + '" cy="' + (pad + W * k) + '" r="3.5" fill="#b4291f"/><text x="' + (pad + 5) + '" y="' + (pad + W * k + 14) + '" font-size="9.5" fill="#b4291f">X0 Y0</text>';
  return s + '</svg>';
}

/* ----------------------------------------------------------------- render: settings */
function viewSet() {
  var st = S.settings, b = 's.';
  var tsel = function (ty, k, opts) { var id = 'f-s-' + ty + '-' + k; return '<select id="' + id + '" data-bind="' + b + 'types.' + ty + '.' + k + '" aria-label="' + ty + ' ' + k + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(st.types[ty][k]) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
  var types = '<div class="typecfg"><span></span>' + TYPES.map(function (ty) { return '<span class="th">' + ({ 'PASTATOMOS':t('tBase'), 'PAKABINAMOS':t('tWall'), 'ŪKINĖ':t('tTall') })[ty] + '</span>'; }).join('') +
    [['joinery', S.lang === 'lt' ? 'Jungtys' : 'Joinery', [['confirmat', t('jConf')], ['cam', t('jCam')]]], ['top', t('top'), [['rails', t('topRails')], ['full', t('topFull')]]], ['back', t('back'), [['none', t('bNone')], ['hdf', t('bHdf')], ['top', t('bTop')], ['inside', t('bIn')]]],
     ['backFix', t('bFix'), [['confirmat', t('jConf')], ['cam', t('jCam')]]],
     ['railFront', t('rails') + ': ' + t('rFront').toLowerCase(), [['h', t('rFlat')], ['v', t('rStand')], ['none', t('rNone')]]],
     ['railBack', t('rails') + ': ' + t('rBack').toLowerCase(), [['h', t('rFlat')], ['v', t('rStand')], ['hv', t('rBoth')], ['none', t('rNone')]]],
     ['railBottom', t('rBottom'), [['false', '—'], ['true', '✓']]],
     ['topOverFacade', t('topOver'), [['false', '—'], ['true', '✓']]], ['legs', t('oLegs'), [['true', '✓'], ['false', '—']]]].map(function (r) {
      return '<span>' + r[1] + '</span>' + TYPES.map(function (ty) { return tsel(ty, r[0], r[2]); }).join('');
    }).join('') + '</div>';
  var kv = function (grp, k, label) { var id = 'f-s-r-' + grp + '-' + k; return '<label for="' + id + '">' + label + '</label><input id="' + id + '" type="text" inputmode="decimal" data-bind="' + b + 'rules.' + grp + '.' + k + '" data-num="1" value="' + esc(st.rules[grp][k]) + '">'; };
  var rules = '<div class="kv">' + kv('hinge', 'cupFromEdge', t('rCupE')) + kv('hinge', 'cupDepth', t('rCupD')) + kv('hinge', 'fromEnd', t('rEnd')) + kv('hinge', 'plateFromFront', t('rPlF')) + kv('hinge', 'plateSpacing', t('rPlS')) +
    kv('pins', 'fromFront', t('rPinF')) + kv('pins', 'fromBack', t('rPinB')) + kv('pins', 'below', t('rPinBelow')) + kv('pins', 'depth', t('rPinD')) + kv('pins', 'pitch', t('rPitch')) + '</div>';
  var ops = '<div class="sub" style="margin-top:0">' + chk(b + 'ops.runnerMarks', st.ops.runnerMarks, t('oRun')) +
    '<div class="row"><span class="unit">' + t('tbDef') + ':</span>' + seg(b + 'ops.tbFront', st.ops.tbFront, [['off', '—'], ['mark', t('tbMark')], ['hole', t('tbHole')]]) + '</div>' +
    chk(b + 'ops.hinges', st.ops.hinges, t('oHinge')) +
    '<div class="row">' + seg(b + 'ops.hingeFix', st.ops.hingeFix, [['screw', t('hfScrew')], ['press', t('hfPress')]]) + '</div>' +
    '<div class="row"><span class="unit">' + t('oPins') + ':</span>' + seg(b + 'ops.pins', st.ops.pins, [['off', '—'], ['shelf', t('pinShelf')], ['row', t('pinRow')]]) + '</div>' +
    '<div class="row" style="align-items:center"><span class="unit">' + t('rW') + ':</span>' + '<input id="f-s-railW" class="sin" type="text" inputmode="decimal" data-bind="s.railW" data-num="1" value="' + esc(st.railW) + '" aria-label="' + t('rW') + '"><span class="unit">mm</span></div></div>';
  var bl = st.rules.ball || {}, lt0 = S.lang === 'lt', bk = function (k, label, unit) { var id = 'f-s-ball-' + k; return '<label for="' + id + '">' + label + '</label><span class="row" style="gap:5px;align-items:center"><input id="' + id + '" type="text" inputmode="decimal" data-bind="s.rules.ball.' + k + '" data-num="1" value="' + esc(bl[k] == null ? '' : bl[k]) + '" style="width:80px"><span class="unit">' + (unit || 'mm') + '</span></span>'; };
  var ball = '<p class="note" style="margin:0 0 10px">' + (lt0 ? 'Šoninio montavimo guoliniai 45 mm bėgeliai paprastiems darbams. Stalčiaus dėžė — iš korpuso plokštės, 12,7 mm tarpas iš abiejų pusių (GTV / DTC katalogai), dėžės ilgis = bėgelio ilgis. Skylių vietos dar NEPATIKRINTOS su tikru GTV / DTC bėgeliu — pamatuokite ir pataisykite čia.' : 'Side-mount 45 mm ball-bearing runners for simple jobs. The drawer is a board box, 12.7 mm clear of each side (GTV / DTC catalogues), box length = runner length. The hole positions are NOT yet verified against a real GTV / DTC runner — measure one and correct them here.') + '</p><div class="kv">' +
    bk('front', lt0 ? 'Priekinė skylė nuo šono priekio' : 'Front hole from the side front') + bk('rear', lt0 ? 'Galinė skylė iki bėgelio galo' : 'Rear hole before the runner end') + bk('midFrom', lt0 ? 'Vidurinė skylė (32 tinkle) nuo ilgio' : 'Middle hole (32 grid) from length') +
    bk('up', lt0 ? 'Bėgelio ašis nuo fasado apačios' : 'Runner axis above the front bottom') + bk('clear', lt0 ? 'Tarpas šone' : 'Side clearance') + bk('boxBelow', lt0 ? 'Dėžės apačia žemiau ašies' : 'Box bottom below the axis') + bk('topGap', lt0 ? 'Dėžės viršus žemiau fasado viršaus' : 'Box top below the front top') +
    bk('boxT', lt0 ? 'Dėžės plokštė (0 — kaip korpuso)' : 'Box board (0 — as the carcass)') +
    '<label for="f-s-ball-perLen">' + (lt0 ? 'Skylės pagal ilgį (nebūtina)' : 'Holes per length (optional)') + '</label><input id="f-s-ball-perLen" type="text" data-bind="s.rules.ball.perLen" value="' + esc(bl.perLen || '') + '" placeholder="450: 35,195,420; 500: 35,227,470" style="width:100%"></div>' +
    '<div style="margin-top:8px">' + chk('s.rules.ball.drawerMarks', bl.drawerMarks !== false, lt0 ? 'Žymės ir dėžės šonuose (bėgelio stalčiaus dalis)' : 'Marks on the box sides too (drawer member)') + '</div>' +
    '<p class="note" style="margin:8px 0 0">' + (lt0 ? 'Pagal nutylėjimą: priekinė skylė 35 mm, galinė — 30 mm iki galo, nuo 450 mm dar viena per vidurį 32 mm tinkle; visos ant bėgelio ašies. Ilgiai: 300, 400, 450, 500, 550.' : 'Default: front hole 35 mm, rear hole 30 mm before the end, from 450 mm one more in the middle on the 32 mm grid; all on the runner axis. Lengths: 300, 400, 450, 500, 550.') + '</p>';
  var ul = st.rules.under || {}, uk = function (k, label, unit) { var id = 'f-s-under-' + k; return '<label for="' + id + '">' + label + '</label><span class="row" style="gap:5px;align-items:center"><input id="' + id + '" type="text" inputmode="decimal" data-bind="s.rules.under.' + k + '" data-num="1" value="' + esc(ul[k] == null ? '' : ul[k]) + '" style="width:80px"><span class="unit">' + (unit || 'mm') + '</span></span>'; };
  var under = '<p class="note" style="margin:0 0 10px">' + (lt0 ? 'Paslėpto (apatinio) montavimo bėgeliai, pvz. DTC D-Motion (suderinami su Blum TANDEM). Stalčiaus dėžė — iš korpuso plokštės: vidinis plotis = vidus − 42 (16 mm šonams; 19 mm — 49), ilgis = bėgelio ilgis − 10, dugnas įleistas 13 mm, po dėže 14 mm. Skylės — NEPATIKRINTOS su tikru DTC bėgeliu, pamatuokite ir pataisykite čia.' : 'Concealed (undermount) runners, e.g. DTC D-Motion (Blum TANDEM compatible). The drawer is a board box: inside width = opening − 42 (16 mm sides; 19 mm — 49), length = runner length − 10, bottom set in 13 mm, 14 mm under the box. The holes are NOT yet verified against a real DTC runner — measure one and correct them here.') + '</p><div class="kv">' +
    '<label for="f-s-under-marks">' + (lt0 ? 'Skylės korpuse nuo priekio' : 'Cabinet holes from the front') + '</label><input id="f-s-under-marks" type="text" data-bind="s.rules.under.marks" value="' + esc(ul.marks == null ? '' : ul.marks) + '" placeholder="37, 165, 229" style="width:100%">' +
    uk('up', lt0 ? 'Skylių eilė virš dugno / fasado apačios' : 'Hole row above the bottom / front bottom') + uk('clearBelow', lt0 ? 'Tarpas po dėže' : 'Gap under the box') + uk('recess', lt0 ? 'Dugno įleidimas' : 'Bottom recess') + uk('shorter', lt0 ? 'Dėžė trumpesnė už bėgelį' : 'Box shorter than the runner') +
    uk('ded', lt0 ? 'Vidinis plotis = vidus − (0 — pagal šono storį)' : 'Inside width = opening − (0 — from the side thickness)') + uk('topGap', lt0 ? 'Dėžės viršus žemiau fasado viršaus' : 'Box top below the front top') + uk('depthPlus', lt0 ? 'Korpuso gylis ≥ bėgelis +' : 'Cabinet depth ≥ runner +') +
    uk('boxT', lt0 ? 'Dėžės plokštė (0 — kaip korpuso)' : 'Box board (0 — as the carcass)') +
    '<label for="f-s-under-perLen">' + (lt0 ? 'Skylės pagal ilgį (nebūtina)' : 'Holes per length (optional)') + '</label><input id="f-s-under-perLen" type="text" data-bind="s.rules.under.perLen" value="' + esc(ul.perLen || '') + '" placeholder="250: 37,165; 600: 37,165,229,453" style="width:100%"></div>' +
    '<p class="note" style="margin:8px 0 0">' + (lt0 ? 'Ilgiai: 250–600 kas 50. Fasadas tvirtinamas fiksatoriais po dugnu (be gręžimo); dėžės dalys sujungtos konfirmatais.' : 'Lengths: 250–600 in 50s. The front fixes with locking devices under the bottom (no drilling); the box parts are joined with confirmats.') + '</p>';
  var mvl = st.rules.merivo || {}, mk = function (k, label, unit) { var id = 'f-s-merivo-' + k; return '<label for="' + id + '">' + label + '</label><span class="row" style="gap:5px;align-items:center"><input id="' + id + '" type="text" inputmode="decimal" data-bind="s.rules.merivo.' + k + '" data-num="1" value="' + esc(mvl[k] == null ? '' : mvl[k]) + '" style="width:80px"><span class="unit">' + (unit || 'mm') + '</span></span>'; };
  var merivo = '<p class="note" style="margin:0 0 10px">' + (lt0 ? 'Plieniniai šonai ant BLUMOTION korpuso profilių. Iš 16 mm plokštės pjaunama: dugnas (vidus − 51) × (NL − 26), galas (vidus − 51) × aukštis (N 60,5 · M 83 · K 121 · E 184); dėžė NL − 10, korpuso gylis ≥ NL + 3 (Blum katalogas). Šonai: N 68,5 · M 91 · K 129 · E 192 (E — M šonas su galerija arba BOXCAP). Fasadas — prisukami tvirtinimai, be gręžimo. Korpuso profilio skylės ir jų aukštis — NEPATIKRINTI su tikru MERIVOBOX, pamatuokite ir pataisykite čia.' : 'Steel sides on BLUMOTION cabinet profiles. Cut from 16 mm board: base (opening − 51) × (NL − 26), back (opening − 51) × height (N 60.5 · M 83 · K 121 · E 184); box NL − 10, cabinet depth ≥ NL + 3 (Blum catalogue). Sides: N 68.5 · M 91 · K 129 · E 192 (E — the M side with a gallery or BOXCAP). The front clips onto screw-on brackets, no drilling. The cabinet profile holes and their height are NOT yet verified on a real MERIVOBOX — measure one and correct them here.') + '</p><div class="kv">' +
    '<label for="f-s-merivo-marks">' + (lt0 ? 'Profilio skylės nuo priekio' : 'Profile holes from the front') + '</label><input id="f-s-merivo-marks" type="text" data-bind="s.rules.merivo.marks" value="' + esc(mvl.marks == null ? '' : mvl.marks) + '" placeholder="37, 261, 293" style="width:100%">' +
    mk('up', lt0 ? 'Skylių eilė virš fasado apačios' : 'Hole row above the front bottom') + mk('below', lt0 ? 'Dėžės apačia žemiau skylių eilės' : 'Box bottom below the hole row') + mk('ded', lt0 ? 'Dugnas / galas = vidus −' : 'Base / back = opening −') + mk('shorter', lt0 ? 'Dugnas = NL −' : 'Base = NL −') +
    mk('topGap', lt0 ? 'Dėžės viršus žemiau fasado viršaus' : 'Box top below the front top') + mk('depthPlus', lt0 ? 'Korpuso gylis ≥ NL +' : 'Cabinet depth ≥ NL +') +
    '<label for="f-s-merivo-perLen">' + (lt0 ? 'Skylės pagal ilgį (nebūtina)' : 'Holes per length (optional)') + '</label><input id="f-s-merivo-perLen" type="text" data-bind="s.rules.merivo.perLen" value="' + esc(mvl.perLen || '') + '" placeholder="270: 37; 450: 37,261,293" style="width:100%"></div>' +
    '<p class="note" style="margin:8px 0 0">' + (lt0 ? 'Ilgiai: 270–600. Aukštis „Auto“: didžiausias iš N, M ir E su galerija, telpantis po fasadu; K ir BOXCAP — tik pasirinkus.' : 'Lengths: 270–600. Height “Auto”: the highest of N, M and E with the gallery that fits behind the front; K and BOXCAP only when chosen.') + '</p>';
  var mach = '<div class="kv"><label for="f-s-drills">' + t('drillsTop') + '</label><input id="f-s-drills" type="text" style="width:140px" data-bind="s.rules.drillsTop" value="' + esc(st.rules.drillsTop) + '">' +
    '<label for="f-s-tbd">' + t('tbHoleSet') + ' Ø</label><input id="f-s-tbd" type="text" inputmode="decimal" data-bind="s.rules.tbHole.d" data-num="1" value="' + esc(st.rules.tbHole.d) + '">' +
    '<label for="f-s-tbz">' + t('tbHoleSet') + ' ' + (S.lang === 'lt' ? 'gylis' : 'depth') + '</label><input id="f-s-tbz" type="text" inputmode="decimal" data-bind="s.rules.tbHole.depth" data-num="1" value="' + esc(st.rules.tbHole.depth) + '"></div>' +
    '<p class="note" style="margin:8px 0 0">' + t('drillsTopL') + '</p>';
  return '<div style="display:flex;flex-direction:column;gap:16px"><div><h2 style="margin:0;font:600 26px var(--f-display)">' + t('setTitle') + '</h2><p class="note" style="margin:2px 0 0">' + t('setLead') + '</p></div><div class="setgrid">' + adminCard() +
    '<div class="card wide"><h3 style="margin:0 0 4px;font:600 19px var(--f-display)">' + t('setTypes') + '</h3><p class="note" style="margin:0 0 10px">' + t('setTypesL') + '</p>' + types + '</div>' +
    '<div class="card"><h3 style="margin:0 0 10px;font:600 19px var(--f-display)">' + t('setOps') + '</h3>' + ops + '</div>' +
    '<div class="card"><h3 style="margin:0 0 10px;font:600 19px var(--f-display)">' + (S.lang === 'lt' ? 'Staklės' : 'Machine') + '</h3>' + mach + '</div>' +
    '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0;font:600 19px var(--f-display)">' + (S.lang === 'lt' ? 'Guoliniai bėgeliai GTV / DTC' : 'GTV / DTC ball-bearing runners') + '</h3><span class="badge warn">' + t('unverified') + '</span></div>' + ball + '</div>' +
    '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0;font:600 19px var(--f-display)">' + (lt0 ? 'Paslėpti bėgeliai DTC D-Motion' : 'DTC D-Motion undermount runners') + '</h3><span class="badge warn">' + t('unverified') + '</span></div>' + under + '</div>' +
    '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0;font:600 19px var(--f-display)">Blum MERIVOBOX</h3><span class="badge warn">' + t('unverified') + '</span></div>' + merivo + '</div>' +
    '<div class="card"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0;font:600 19px var(--f-display)">' + t('setRules') + '</h3><span class="badge warn">' + t('unverified') + '</span></div><p class="note" style="margin:4px 0 10px">' + t('setRulesL') + '</p>' + rules +
      '<button class="btn" style="margin-top:12px" data-act="resetrules">' + t('resetRules') + '</button></div>' +
    '<div class="card"><h3 style="margin:0 0 4px;font:600 19px var(--f-display)">' + t('tplTitle') + '</h3><p class="note" style="margin:0 0 8px">' + t('tplLead') + '</p>' +
      '<p style="margin:0 0 10px"><b>' + esc(S.tplName ? t('tplOwn') + S.tplName : t('tplBuiltIn')) + '</b></p>' +
      '<div class="row"><label class="btn" for="f-tpl">' + t('tplUpload') + '</label><input id="f-tpl" type="file" accept=".xlsm,.xlsx" data-act-change="tpl" hidden>' +
      (S.tplName ? '<button class="btn ghost" data-act="tplreset">' + t('tplReset') + '</button>' : '') + '</div></div>' +
    '<div class="card"><h3 style="margin:0 0 4px;font:600 19px var(--f-display)">' + t('setMats') + '</h3><p class="note" style="margin:0 0 8px">' + t('setMatsL') + '</p><textarea id="f-s-materials" data-bind="s.materials" data-lines="1">' + esc(st.materials.join('\n')) + '</textarea>' +
      '<h3 style="margin:12px 0 8px;font:600 19px var(--f-display)">' + t('setEdges') + '</h3><textarea id="f-s-edges" data-bind="s.edges" data-lines="1">' + esc(st.edges.join('\n')) + '</textarea>' +
      '<h3 style="margin:12px 0 8px;font:600 19px var(--f-display)">' + t('setWt') + '</h3><textarea id="f-s-worktops" data-bind="s.worktops" data-lines="1">' + esc((st.worktops || []).join('\n')) + '</textarea></div>' +
    '</div><p class="note">v' + VERSION + ' · ' + (S.lang === 'lt' ? 'taisyklės: offer CNC modulis (patikrinta su Spintele_su_tandem / _su_tandembox), lankstai ir lentynos — Blum katalogas' : 'rules: offer CNC module (verified on Spintele_su_tandem / _su_tandembox), hinges and shelves — Blum catalogue') + '</p></div>';
}

/* ----------------------------------------------------------------- render: projects drawer */
/* ---- start screen: new project first, then the saved ones */
function ago(iso) {
  if (!iso) return '';
  var d = new Date(iso), now = new Date(), min = Math.round((now - d) / 60000);
  if (min < 1) return t('agoNow'); if (min < 60) return t('agoMin').replace('{n}', min);
  var sameDay = d.toDateString() === now.toDateString(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (sameDay) return t('agoToday') + ' ' + hm;
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + hm;
}
function viewHome() {
  var l = lib(), q = (S.homeQ || '').toLowerCase();
  var shown = l.filter(function (r) { return !q || String(r.name || '').toLowerCase().indexOf(q) >= 0; });
  var hero = '<section class="card hero"><div class="hero-t"><h2>＋ ' + t('prNew2') + '</h2><p class="note">' + t('npLead') + '</p></div>' +
    '<div class="np"><label class="f grow" for="np-name"><span>' + t('npName') + '</span><input id="np-name" type="text" autocomplete="off" placeholder="' + t('npPh') + '" value="' + esc(S.npName || '') + '"></label>' +
    '<button class="btn pri big" data-act="pcreate">' + t('npCreate') + ' →</button></div>' +
    '<div class="hero-alt"><span class="unit">' + t('npOr') + '</span><button class="btn" data-act="pimport">⤒ ' + t('npImport') + '</button><button class="btn ghost" data-act="psample">' + t('npSample') + '</button>' +
    '<input id="f-import" type="file" accept=".json,application/json" data-act-change="import" hidden></div></section>';
  var list = '<section class="card plib"><div class="plib-h"><h2>' + t('prTitle') + ' <span class="cnt">' + l.length + '</span></h2>' +
    (l.length > 5 ? '<input id="home-q" type="search" placeholder="' + t('prSearch') + '" value="' + esc(S.homeQ || '') + '" aria-label="' + t('prSearch') + '">' : '') + '</div>' +
    (shown.length ? '<div class="plib-list">' + shown.map(function (r) {
      var isCur = S.proj && S.proj.id === r.id, del = S.confirm === 'pdel' + r.id;
      return '<div class="prow' + (isCur ? ' cur' : '') + '"><button class="prow-main" data-act="popen" data-v="' + esc(r.id) + '"><b>' + esc(r.name || t('noName')) + (isCur ? ' <span class="badge ok">' + t('prOpenNow') + '</span>' : '') + '</b>' +
        '<small>' + r.n + ' ' + t('cabsN') + ' · ' + t('prUpdated') + ' ' + esc(ago(r.updated)) + '</small></button>' +
        '<span class="prow-act"><button class="btn ghost" data-act="pdup" data-v="' + esc(r.id) + '" title="' + t('prDupT') + '">' + t('prDup') + '</button>' +
        '<button class="btn ghost" data-act="pver" data-v="' + esc(r.id) + '" title="' + t('verT') + '">🕘 ' + t('verBtn') + '</button>' +
        '<button class="btn ghost" data-act="pjson" data-v="' + esc(r.id) + '" title="' + t('prJsonT') + '">.json</button>' +
        '<button class="btn ghost danger" data-act="pdel" data-v="' + esc(r.id) + '">' + (del ? t('delSure') : t('del')) + '</button></span>' +
        '<button class="btn pri prow-open" data-act="popen" data-v="' + esc(r.id) + '">' + t('prOpen') + '</button></div>';
    }).join('') + '</div>' : '<p class="note empty">' + (l.length ? t('prNoMatch') : t('prNone2')) + '</p>') +
    '<p class="note" style="margin:10px 0 0">' + t('prHint2') + '</p></section>';
  return '<div class="home">' + hero + list + '</div>';
}

/* ----------------------------------------------------------------- live refresh while typing (no full re-render → focus stays) */
function refreshLive() {
  if (S.home) return;
  if (S.tab !== 'cab' || S.picking || !cur()) { if (S.tab === 'set') return; return; }
  var inf = buildOne(S.sel); S._info[S.sel] = inf;
  var sk = document.getElementById('sketch'); if (sk) sk.innerHTML = sketchOf(cur());
  var xs = document.getElementById('xsec'); if (xs) xs.innerHTML = sectionSVG(cur(), inf.r, S.xside === 'R' ? 'R' : 'L');
  mountIso(); mountAssembly(true);
  var wr = document.getElementById('warns'); if (wr) wr.innerHTML = inf.warnings.map(function (x) { var lv = level(x); return '<div class="w ' + lv + '"><span class="tag">' + t(lv === 'bad' ? 'errTag' : lv === 'warn' ? 'warnTag' : 'infoTag') + '</span><span>' + esc(wTxt(x)) + '</span></div>'; }).join('');
  var tb = document.querySelector('.paper .tb'); var c = cur();
  if (tb) tb.innerHTML = '<b>' + (S.sel + 1) + ' · ' + esc(c.name || typeName(c)) + '</b><span>' + fmt(c.dishwasher ? c.dishWidth : c.W) + '×' + fmt(c.H) + '×' + fmt(c.D) + '</span>';
  var cmap = document.getElementById('colmap'); if (cmap && !c.dishwasher) cmap.innerHTML = colMapInner(c);
  /* the step dots, this cabinet's dot in the list and the worktop size follow the typing too */
  var nav = document.querySelector('.stepnav'); if (nav) { var onV = (nav.querySelector('button.on') || { getAttribute:function () { return null; } }).getAttribute('data-v'); var tmp = document.createElement('div'); tmp.innerHTML = stepNav(c, inf);
    var nn = tmp.firstChild; if (onV) nn.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === onV); }); nav.parentNode.replaceChild(nn, nav); }
  var cb = document.querySelector('.cab.on b'); if (cb) { var od = cb.querySelector('.dot'); if (od) od.remove(); var lv = inf.warnings.map(level), cls = lv.indexOf('bad') >= 0 ? 'bad' : lv.indexOf('warn') >= 0 ? 'warn' : ''; if (cls) { var dt = document.createElement('span'); dt.className = 'dot ' + cls; cb.appendChild(dt); } }
  var wth = document.querySelector('.wtblk .h'), wtv = E.worktopOf(engineDef(c)); if (wth && wtv) wth.innerHTML = t('wtSize') + ' <b>' + fmt(wtv.L) + ' × ' + fmt(wtv.W) + ' × ' + fmt(wtv.T) + '</b> mm';
  liveSections(c);
  var tc = document.querySelector('.tabs [data-v="res"] .cnt'); if (tc) tc.textContent = partCount(S._info);   // the counts follow the typing
  var wsum = document.querySelector('.preview-warnings > summary > span'); if (wsum) wsum.textContent = inf.warnings.length;
  var pcw = document.getElementById('pricecard-wrap'); if (pcw) pcw.innerHTML = priceCard(c, inf);
  if (!c.dishwasher) document.querySelectorAll('.zone[data-col]').forEach(function (zn) { var z2 = zoneInfo(c, +zn.getAttribute('data-col')); zn.className = 'zone' + (z2.over ? ' over' : ''); zn.innerHTML = zoneHtml(z2); });
  var zone = null; if (zone && !c.dishwasher) { var z = zoneInfo(c); zone.className = 'zone' + (z.over ? ' over' : ''); zone.innerHTML = t('zone') + ' <b>' + fmt(z.Hz) + '</b> mm · ' + t('used') + ' <b>' + fmt(z.exp + z.fillH * z.nFill) + '</b>' + (z.over ? ' · <b>' + t('over') + ' ' + fmt(z.exp - z.Hz) + '</b>' : ''); }
}

/* ----------------------------------------------------------------- 3D connector editor (iso.js) */
S.iso = null; S.undo = [];
function pushUndo() { var c = cur(); if (!c) return; S.undo.push({ id:c.id, joints:clone(c.cnc.joints || {}), box:c.box ? clone(c.box) : null }); if (S.undo.length > 40) S.undo.shift(); }
function canUndo() { var c = cur(); return !!c && S.undo.some(function (u) { return u.id === c.id; }); }
function undoJoints() {
  var c = cur(); if (!c) return false;
  for (var i = S.undo.length - 1; i >= 0; i--) if (S.undo[i].id === c.id) { c.cnc.joints = S.undo[i].joints; if (S.undo[i].box) c.box = S.undo[i].box; S.undo.splice(i, 1); save(); render(); toast(t('isoUndone')); return true; }
  return false;
}
/* patch from the 3D editor: { side:null|'L'|'R', type, pos|null }. side null → both sides; otherwise only that side
   changes and the other keeps what it had. Two identical sides collapse back into one entry. */
function setJoint(c, key, patch) {
  var J = c.cnc.joints = c.cnc.joints || {};
  var spec = function (p) { return p.pos ? { type:p.type, pos:p.pos.map(function (a) { return Math.round(a * 10) / 10; }) } : { type:p.type }; };
  if (!patch.side) { J[key] = spec(patch); return; }
  var old = J[key] || {}, split = !!(old.L || old.R), other = patch.side === 'L' ? 'R' : 'L', nj = {};
  nj[other] = clone(split ? (old[other] || {}) : old);
  nj[patch.side] = spec(patch);
  J[key] = JSON.stringify(nj.L) === JSON.stringify(nj.R) ? nj.L : nj;
}
function syncXsec() {
  var r = S._info && S._info[S.sel] ? S._info[S.sel].r : null, xs = document.getElementById('xsec'); if (!xs || !r) return;
  xs.innerHTML = sectionSVG(cur(), r, S.xside === 'R' ? 'R' : 'L');
  var cap = document.getElementById('xcap'); if (cap) cap.textContent = t('xsec') + ' · ' + t(S.xside === 'R' ? 'xSideR' : 'xSideL');
  document.querySelectorAll('[data-act=xside]').forEach(function (b) { var on = b.getAttribute('data-v') === (S.xside === 'R' ? 'R' : 'L'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}
function mountAssembly(live) {
 var el=document.getElementById('assembly-preview'); if(el && cur() && S._info && S._info[S.sel]) { setTimeout(function(){ S.isoFocus=false; },0); } if(el && cur() && S._info && S._info[S.sel]) window.DBAssembly.mount(el,cur(),S._info[S.sel].r,S.lang,{
 t:tJ,canUndo:canUndo(),select:S.isoFocus?S.iso:null,live:!!live,toast:function(m){toast(m,true);},
 onCommit:function(key,patch,selection){pushUndo();setJoint(cur(),key,patch);S.iso=selection;save();render();},
 onReset:function(key,side){pushUndo();if(side)setJoint(cur(),key,{side:side,pos:null});else if(cur().cnc.joints)delete cur().cnc.joints[key];S.iso={key:key,side:side,idx:null};save();render();},
 onUndo:function(){undoJoints();},
 onBox:function(fn){pushUndo();fn(cur());save();render();},
 onFillMissing:function(){var info=S._info[S.sel].r,missing=[];(info.joints||[]).forEach(function(j){(j.single?['L']:['L','R']).forEach(function(sd){var v=j.sides?j.sides[sd]:j;if(!v.pos.length)missing.push({key:j.key,side:j.single?null:sd,type:v.type});});});if(!missing.length)return;pushUndo();missing.forEach(function(m){setJoint(cur(),m.key,{side:m.side,type:m.type,pos:null});});save();render();}
 });
}
/* the cabinet in the joints-check modal: the connector view (as the 3D joint editor), the joint picked in it or in the list lit */
function mountJc() {
  var el = document.getElementById('jc-iso'), c = cur(); if (!el || !ISO || !c || !S._info || !S._info[S.sel]) return;
  var r = S._info[S.sel].r; if (!r.seams || !r.seams.length) { el.style.display = 'none'; return; }
  if (S.jcSel && !(r.joints || []).some(function (j) { return j.key === S.jcSel.key; })) S.jcSel = null;
  var again = function () { render(); };
  ISO.attach(el, { r:r, sel:S.jcSel || null, t:t, legH:c.cnc.legs ? num(c.legH) || 0 : 0, canUndo:canUndo(), focusStage:false, toast:toast, mode:store('dbKurejas.isoMode') || 'both',
    onMode:function (m) { store('dbKurejas.isoMode', m); },
    onSelect:function (sel) { S.jcSel = sel; again(); var row = sel && document.querySelector('.jc-row[data-jck="' + sel.key + '"]'); if (row && row.scrollIntoView) row.scrollIntoView({ block:'nearest' }); },
    onCommit:function (key, patch, meta) { pushUndo(); setJoint(cur(), key, patch); S.jcSel = meta && meta.sel !== undefined ? meta.sel : S.jcSel; save(); again(); if (meta && meta.msg) toast(meta.msg); },
    onReset:function (key) { pushUndo(); var cc = cur(); if (cc.cnc.joints) delete cc.cnc.joints[key]; S.jcSel = { key:key, idx:null }; save(); again(); },
    onUndo:function () { undoJoints(); } });
}
function mountIso(focus) {
  var el = document.getElementById('iso3d'), c = cur();
  if (!el || !ISO || !c || c.dishwasher || !S._info || !S._info[S.sel]) return;
  var r = S._info[S.sel].r; if (!r.seams || !r.seams.length) { el.innerHTML = '<p class="note">' + t('isoNoJ') + '</p>'; return; }
  if (S.iso && !(r.joints || []).some(function (j) { return j.key === S.iso.key; })) S.iso = null;
  ISO.attach(el, { r:r, sel:S.iso, t:t, legH:c.cnc.legs ? num(c.legH) || 0 : 0, canUndo:canUndo(), focusStage:!!focus, toast:toast, mode:store('dbKurejas.isoMode') || 'both',
    onMode:function (m) { store('dbKurejas.isoMode', m); },
    onSelect:function (sel) { S.iso = sel; if (sel && sel.side && S.xside !== sel.side) { S.xside = sel.side; syncXsec(); } mountIso(true); },
    onCommit:function (key, patch, meta) {
      pushUndo(); setJoint(cur(), key, patch);
      S.iso = meta && meta.sel !== undefined ? meta.sel : S.iso; if (S.iso && S.iso.side) S.xside = S.iso.side; save(); render(); mountIso(true);
      if (meta && meta.msg) toast(meta.msg);
    },
    onReset:function (key) { pushUndo(); var cc = cur(); if (cc.cnc.joints) delete cc.cnc.joints[key]; S.iso = { key:key, idx:null }; save(); render(); },
    onUndo:function () { undoJoints(); } });
}

/* ----------------------------------------------------------------- whole kitchen (room.js) */
S.roomSel = null; S.roomSelId = null; S.roomUndo = [];
function copyName(n) { n = String(n || ''); if (!n) return ''; var base = n.replace(/\s*\(\d+\)$/, ''), k = 2, names = S.proj.cabinets.map(function (c) { return c.name; });
  while (names.indexOf(base + ' (' + k + ')') >= 0) k++; return base + ' (' + k + ')'; }
function roomPresets() {
  return PRESETS.map(function (p, i) { var ty = S.settings.types[p.type] || {}; return { i:i, name:t(p.k), icon:ico(p.k), W:p.W, H:p.H, D:p.D, type:p.type, dish:!!p.dish, legs:!p.box && !p.panel && (p.dish || !!ty.legs), legH:100, panel:!!p.panel }; });
}
function roomUndoPush() { S.roomUndo.push(clone(S.proj)); if (S.roomUndo.length > 40) S.roomUndo.shift(); }
function setRoomSel(i) { S.roomSel = i != null && S.proj.cabinets[i] ? i : null; S.roomSelId = S.roomSel != null ? S.proj.cabinets[S.roomSel].id : null; }   // the selection follows the cabinet, not its place in the list
function roomSelSync() { if (S.roomSelId != null) { var k = S.proj.cabinets.map(function (c) { return c.id; }).indexOf(S.roomSelId); S.roomSel = k >= 0 ? k : null; if (k < 0) S.roomSelId = null; } else if (S.roomSel != null && !S.proj.cabinets[S.roomSel]) S.roomSel = null; }
function roomUndo() { var p = S.roomUndo.pop(); if (!p) return false; var keep = { name:S.proj.name, pricing:S.proj.pricing }; S.proj = p; S.proj.name = keep.name; if (keep.pricing !== undefined) S.proj.pricing = keep.pricing;   // the room undo takes back room changes, not the project name typed meanwhile
  S.proj.cabinets = S.proj.cabinets.map(normCab); roomSelSync(); S.sel = Math.max(0, Math.min(S.sel, S.proj.cabinets.length - 1)); S.confirm = null; save(); render(); toast(t('isoUndone')); return true; }
function mountRoom(focus) {
  var el = document.getElementById('room'); if (!el || !RM || !S.proj) return;
  if (RM.ensure(S.proj)) save();
  roomSelSync();
  RM.attach(el, { proj:S.proj, infos:S._info || [], sel:S.roomSel, t:t, toast:toast, presets:roomPresets(), canUndo:S.roomUndo.length > 0, focusStage:!!focus, confirmDel:S.confirm === 'rmdel' + S.roomSel,
    lookHTML:function (i) { return '<div class="rm-look"><div class="lbl" title="' + esc(t('lookL')) + '">' + t('lookT') + '</div>' + lookBlock(lookNames(i == null ? S.proj.cabinets : [S.proj.cabinets[i]]), true) + '</div>'; },
    frontArt:function (i) { var c = S.proj.cabinets[i], inf = (S._info || [])[i]; if (!c || c.kind === 'panel' || !inf || !inf.r || !inf.r.panels || !inf.r.panels.length) return null; var a = frontArtOf(c, inf.r, c.dishwasher ? { noHit:true, over:[], legs:false, legH:0 } : { noHit:true, over:[] }); if (c.dishwasher) a.vbH = num(c.H) + 14; return a.svg ? a : null; },
    onSelect:function (i) { setRoomSel(i); S.confirm = null; if (i != null) S.sel = i; mountRoom(true); },
    onMat:function (c, part, name) { setMatOf(c, part, name); return S._info; }, mats:pickMats,
    onLayout:function (fn, o) { o = o || {}; roomUndoPush(); fn(S.proj); if (o.sel !== undefined) setRoomSel(o.sel); save(); render(); if (o.focus) mountRoom(true); if (o.msg) toast(o.msg); },
    onFlip:function (i, sec, box, left) {   // a door's opening side from the Baldai front view: its section's hinge side flips (a pair opens both ways: nothing to flip)
      var cf = S.proj.cabinets[i]; if (!cf) return;
      var sx = box ? (cf.box && cf.box.fronts || [])[sec] : (cf.sections || [])[sec]; if (!sx) return;
      var pair = box ? Math.round(+sx.nDoors || 1) === 2 : (!sx.fridge && Math.round(+sx.nDoors || 1) >= 2 && sx.doorSplit !== 'h');
      if (pair) { toast(t('flipPair')); return; }
      roomUndoPush(); sx.hingeSide = left ? 'right' : 'left'; save(); render(); toast(t('flipDone').replace('{s}', t(left ? 'hsR' : 'hsL'))); },
    onCab:function (i, patch, after) { roomUndoPush(); var cc0 = S.proj.cabinets[i], oldW = num(cc0.W);
      if (patch.W && colsOf(cc0) > 1 && cc0.colW && cc0.colW.length && oldW > 0) cc0.colW = cc0.colW.map(function (w) { return Math.round(num(w) * num(patch.W) / oldW); });   // columns keep their proportions
      Object.assign(cc0, patch); if ('hang' in patch && !cc0.dishwasher) cc0.cnc.legs = patch.hang || cc0.kind === 'panel' || cc0.kind === 'box' ? false : !!((S.settings.types[cc0.type] || {}).legs);   // hung: no legs; standing again: as the type has it (a panel or a 3D construction: never)
      if (patch.W && S.proj.cabinets[i].dishwasher) S.proj.cabinets[i].dishWidth = patch.W; if (after) after(S.proj); save(); render(); },
    onAdd:function (k, wall, x, fitW) {
      roomUndoPush(); var c = fromPreset(PRESETS[k]); if (fitW) { c.W = fitW; c.dishWidth = fitW; }
      S.proj.cabinets.push(c); var i = S.proj.cabinets.length - 1, mv = 0;
      if (wall != null) S.proj.layout.items[c.id] = { wall:wall, x:x };
      if (wall != null && c.kind === 'panel' && RM.makeRoom) ['L', 'R'].forEach(function (sd) { var rr = RM.makeRoom(S.proj, c, sd); if (rr && rr.moved) mv = Math.max(mv, rr.moved); });   // a panel dropped at a row: the row moves over for it when there is room
      setRoomSel(i); S.sel = i; save(); render(); toast(t(c.kind === 'panel' ? 'rmAddedP' : 'rmAdded').replace('{n}', i + 1) + (mv ? ' · ' + t('rmSideMoved').replace('{n}', E.num(mv)) : ''));
    },
    onDup:function (i) {
      roomUndoPush(); var src = S.proj.cabinets[i], cp = clone(src); cp.id = uid(); delete cp.libId; cp.name = copyName(src.name);
      S.proj.cabinets.splice(i + 1, 0, cp); var it = S.proj.layout.items[src.id];
      if (it && it.wall >= 0) { S.proj.layout.items[cp.id] = { wall:it.wall, x:it.x + RM.cabW(src) + RM.sideW(src).R + RM.sideW(cp).L, z:it.z };   // right of the original, or the first free place
        var pb = RM.problems(S.proj); if (pb.bad[cp.id]) { delete S.proj.layout.items[cp.id]; var sp = RM.autoSpot(S.proj, cp); S.proj.layout.items[cp.id] = { wall:sp.wall, x:sp.x, z:it.z }; } }
      setRoomSel(i + 1); S.sel = i + 1; save(); render();
    },
    onDelete:function (i) {
      if (S.confirm !== 'rmdel' + i) { S.confirm = 'rmdel' + i; mountRoom(); return; }
      S.confirm = null; roomUndoPush(); var c = S.proj.cabinets[i]; S.proj.cabinets.splice(i, 1); delete S.proj.layout.items[c.id];
      setRoomSel(null); S.sel = Math.max(0, Math.min(S.sel, S.proj.cabinets.length - 1)); save(); render(); toast(t('rmDeleted'));
    },
    onEdit:function (i) { S.sel = i; S.tab = 'cab'; S.picking = false; S.iso = null; render(); window.scrollTo(0, 0); },
    onUndo:function () { roomUndo(); } });
}

/* ----------------------------------------------------------------- events */
function target(bind) {
  if (bind.indexOf('c.') === 0) return { obj:cur(), path:bind.slice(2) };
  if (bind.indexOf('s.') === 0) return { obj:S.settings, path:bind.slice(2) };
  if (bind.indexOf('p.') === 0) return { obj:S.proj, path:bind.slice(2) };
  return null;
}
function after(bind, full) {
  if (bind.indexOf('pr.') === 0) { if (full) render(); return; }
  if (bind.indexOf('s.') === 0) { store('dbKurejas.settings', S.settings); applyRules(); }
  else save();
  if (full) render(); else refreshLive();
}
function assign(bind, raw) {
  if (bind.indexOf('pr.') === 0) {   // admin prices: names may hold dots (written as \u2024 in the binding)
    var ks = bind.slice(3).split('.').map(function (k) { return k.replace(/\u2024/g, '.'); }), last = ks.pop(), o = PR;
    ks.forEach(function (k) { o = o[k] = o[k] || {}; });
    var v0 = raw === 'true' ? true : raw === 'false' ? false : raw;
    var dv = ks.reduce(function (a, k) { return a && a[k]; }, prDefaults()); dv = dv && typeof dv === 'object' ? dv[last] : undefined;
    if (v0 === '' || v0 == null) { if (dv !== undefined) o[last] = dv; else if (ks.length) delete o[last]; else o[last] = 0; }   // a cleared price: its default again, at once (not 0 now and the default after a reload)
    else o[last] = typeof v0 === 'boolean' || ks[0] === 'q' && last === 'use' ? v0 : num(v0);
    prSave(); return; }
  if (bind.indexOf('pp.') === 0) { S.proj.pricing = S.proj.pricing || {}; S.proj.pricing[bind.slice(3)] = raw === '' ? '' : num(raw); return; }
  var tg = target(bind); if (!tg) return;
  var v = raw;
  if (raw === 'true') v = true; else if (raw === 'false') v = false;
  if (/^c\.extras\.\d+\.(L|zb)$/.test(bind)) { var xk = tg.obj.extras && tg.obj.extras[+bind.split('.')[2]]; if (xk && xk.kind === 'side') xk.fit = ''; }   // typed by hand: it keeps that size
  if (bind === 'c.cnc.tbOn') { var cn = tg.obj.cnc; if (!raw && cn.tbFront !== 'off') cn.tbPrev = cn.tbFront; setPath(tg.obj, 'cnc.tbFront', raw ? (cn.tbPrev || (S.settings.ops.tbFront !== 'off' ? S.settings.ops.tbFront : 'mark')) : 'off'); return; }   // back on: as it was before
  if (bind === 'c.cnc.pinsOn') { setPath(tg.obj, 'cnc.pins', raw ? (S.settings.ops.pins !== 'off' ? S.settings.ops.pins : 'shelf') : 'off'); return; }
  if (bind === 'c.type') { setPath(tg.obj, 'type', v); var ty = S.settings.types[v]; ['joinery', 'top', 'back', 'backFix', 'topOverFacade', 'legs'].forEach(function (k) { tg.obj.cnc[k] = ty[k]; });
    tg.obj.cnc.rails = { front:ty.railFront, back:ty.railBack, bottom:!!ty.railBottom };
    tg.obj.cnc.backs = tg.obj.cnc.backs.map(function () { return legacyBack(ty); }); tg.obj.cnc.backMount = ty.back === 'inside' ? 'inside' : 'top'; if (ty.back === 'hdf') tg.obj.cnc.back = 'top'; return; }
  if (/^c\.sections\.\d+\.hw$/.test(bind)) { setPath(tg.obj, tg.path, v); var sec0 = tg.obj.sections[+bind.split('.')[2]], ls = railLengths(v);
    if (sec0 && ls.indexOf(num(sec0.rail)) < 0) sec0.rail = ls.reduce(function (a, l) { return Math.abs(l - num(sec0.rail)) < Math.abs(a - num(sec0.rail)) ? l : a; }, ls[0]); return; }
  if (/^c\.box\.fronts\.\d+\.hw$/.test(bind)) { setPath(tg.obj, tg.path, v); var bf = tg.obj.box.fronts[+bind.split('.')[3]], ls2 = railLengths(v);
    if (bf && ls2.indexOf(num(bf.rail)) < 0) bf.rail = ls2.reduce(function (a, l) { return Math.abs(l - num(bf.rail)) < Math.abs(a - num(bf.rail)) ? l : a; }, ls2[0]); return; }
  if (/^c\.box\.fronts\.\d+\.hingeN$/.test(bind)) { setPath(tg.obj, tg.path, v === 'auto' ? '' : +v); return; }
  if (/^c\.box\.fronts\.\d+\.(col|cell|span|nDoors|rail)$/.test(bind)) { setPath(tg.obj, tg.path, +v || 0); var bf2 = tg.obj.box.fronts[+bind.split('.')[3]]; if (/\.col$/.test(bind)) { bf2.cell = 0; bf2.span = 1; } if (/\.cell$/.test(bind)) bf2.span = 1; if (!(bf2.span >= 1)) bf2.span = 1; return; }
  if (/^c\.sections\.\d+\.hingeN$/.test(bind)) { setPath(tg.obj, tg.path, v === 'auto' ? '' : +v); return; }
  if (/^c\.sections\.\d+\.fridge$/.test(bind)) { var fs = tg.obj.sections[+bind.split('.')[2]]; if (!fs) return; fs.fridge = !!v;   // an integrated fridge: stacked fronts on the fridge's doors, no hinges, no shelves
    if (fs.fridge) { if (fs.hinge !== 'BE FURNITŪROS') fs.prevHinge = fs.hinge; fs.doorSplit = 'h'; fs.hinge = 'BE FURNITŪROS'; fs.shelves = 0; fs.nDoors = num(fs.nDoors) === 1 ? 1 : 2; }
    else { fs.doorSplit = 'v'; fs.hinge = fs.prevHinge || 'BLUM LANKSTAI'; fs.shelves = 1; } return; }
  if (bind === 'c.cnc.backJoint') { var bc0 = tg.obj, infB = S._info && S._info[S.sel], keysB = infB && infB.r ? (infB.r.joints || []).map(function (j) { return j.key; }).filter(function (k) { return /^back(P\d)?$/.test(k); }) : ['back'];
    if (keysB.indexOf('back') < 0) keysB.push('back'); keysB.forEach(function (k) { setJoint(bc0, k, { type:v }); }); return; }   // the back's fixing: one choice for the back and its partitions
  if (bind === 'c.cnc.sideFull') { var cs = tg.obj.cnc, on = raw === true || raw === 'true';   // full-height sides: the bottom (and a full top) between them
    cs.bottom = on ? 'inside' : 'under'; if (on) cs.bottomZ = 0; if (cs.top === 'full') cs.topMount = on ? 'inside' : 'over'; return; }
  if (bind === 'c.cnc.topMount' && v === 'over' && tg.obj.cnc.top !== 'full') { tg.obj.cnc.top = 'full'; tg.obj.cnc.topMount = 'over'; return; }   // on the sides: only a full top can
  if (bind === 'c.cnc.top' && v === 'full' && tg.obj.cnc.top !== 'full') { tg.obj.cnc.top = 'full'; tg.obj.cnc.topMount = 'inside'; return; }   // rails were between the sides: the full top stays there until chosen otherwise
  if (bind === 'c.cnc.support') { tg.obj.cnc.legs = v !== 'none'; tg.obj.cnc.feet = v === 'feet'; return; }
  if (bind === 'c.cols') { if (+v === colsOf(tg.obj)) return; tg.obj.cols = +v; tg.obj.colW = []; fixCols(tg.obj); return; }
  if (/^c\.sections\.\d+\.(shelves|rail)$/.test(bind) && typeof v === 'string' && /^\d+$/.test(v)) v = +v;
  var prevW = tg.obj.W, prevColW = bind === 'c.W' && tg.obj.cols > 1 ? colWidths(tg.obj) : null;
  setPath(tg.obj, tg.path, v);
  if (/^c\.colW\.\d+$/.test(bind) && tg.obj.cols > 1 && typeof v === 'number') { var nC0 = colsOf(tg.obj), s0 = 0; for (var q0 = 0; q0 < nC0 - 1; q0++) s0 += num(tg.obj.colW[q0]); if (num(tg.obj.W) - s0 < 50) toast(t('colTooWide'), true); }
  if (bind === 'c.W' && tg.obj.cols > 1) {   // a new width: the columns keep their proportions (from the widths before the typing started)
    var base = colBase && colBase.id === tg.obj.id ? colBase : { W:num(prevW), colW:prevColW }, kW = num(v) / base.W;
    if (base.W > 0 && kW > 0 && base.colW && base.colW.length === colsOf(tg.obj)) tg.obj.colW = base.colW.map(function (w) { return Math.round(num(w) * kW); }); }
  if (/^c\.(colW\.\d+|W)$/.test(bind) && tg.obj.cols > 1) { tg.obj.colW = colWidths(tg.obj); var last = document.getElementById('colw-last'); if (last) last.textContent = fmt(tg.obj.colW[tg.obj.colW.length - 1]) + ' mm'; }
}
/* numbers typed into fields: a value the engine would not use as typed is put back (or into range) when the field is left,
   with a note — so a field never shows one number while the parts are cut from another */
function numOrNull(v) {
  var s0 = String(v == null ? '' : v).trim(); if (!s0) return null; var s1 = s0.replace(/\s+/g, '').replace(/,/g, '.');
  if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s1)) return parseFloat(s1);
  if (/^[\d.+\-*/()]+$/.test(s1) && /\d/.test(s1)) { try { var r = Function('"use strict";return (' + s1.replace(/\b0+(\d)/g, '$1') + ')')(); if (typeof r === 'number' && isFinite(r)) return r; } catch (er) {} }
  return null;
}
var NUM_LIMITS = [   // [binding, min, max, whole number]
  [/^c\.(W|H|D|dishWidth)$/, 50, 6000], [/^c\.thick$/, 6, 60], [/^c\.cnc\.facadeT$/, 6, 60], [/^c\.legH$/, 0, 400], [/^c\.cnc\.bottomZ$/, 0, 2000], [/^c\.cnc\.bottomD$/, 0, 2000], [/^c\.leds\.\d+\.from$/, 0, 3000], [/^c\.cnc\.railW$/, 30, 400],
  [/^c\.colW\.\d+$/, 50, 6000], [/^c\.shelfSb$/, -150, 150], [/^c\.cnc\.backInset$/, 0, 1000], [/^c\.cnc\.topOv[FSB]$/, 0, 300], [/^c\.cnc\.fg\.(l|r|mid|top)$/, 0, 100], [/^c\.cnc\.fg\.bot$/, -1500, 1500], [/^c\.extras\.\d+\.g[lrtb]$/, 0, 500], [/^c\.sections\.\d+\.nDrawers$/, 1, 12, true], [/^c\.sections\.\d+\.nDoors$/, 1, 6, true], [/^c\.sections\.\d+\.shelves$/, 0, 12, true], [/^c\.sections\.\d+\.height$/, 0, 6000],
  [/^c\.sections\.\d+\.frontH\.\d+$/, 0, 3000], [/^c\.sections\.\d+\.shelfPos\.\d+$/, 0, 6000],
  [/^c\.box\.fronts\.\d+\.nDrawers$/, 1, 8, true], [/^c\.box\.boards\.\w+\.inset$/, 0, 3000], [/^c\.box\.boards\.\w+\.T$/, 3, 60], [/^c\.box\.inner\.\d+\.T$/, 3, 60], [/^c\.box\.inner\.\d+\.(x|z)$/, 0, 6000],
  [/^c\.worktop\.T$/, 6, 120], [/^c\.extras\.\d+\.(L|W)$/, 1, 6000], [/^c\.extras\.\d+\.T$/, 1, 120], [/^c\.extras\.\d+\.qty$/, 0, 999, true], [/^c\.extras\.\d+\.zb$/, -5000, 5000], [/^c\.extras\.\d+\.yf$/, -300, 300], [/^c\.worktop\.(left|right)$/, 0, 1000], [/^c\.worktop\.over$/, -100, 300],
  [/^c\.cnc\.joints\..+\.n$/, 1, 30, true], [/^c\.cnc\.joints\..+\.e$/, 5, 3000], [/^c\.cnc\.legs[A-Za-z]*$/, 0, 6000],
  [/^s\.railW$/, 30, 400], [/^s\.rules\.ball\.(midFrom|boxT)$/, 0, 5000], [/^s\.rules\.under\.(ded|boxT)$/, 0, 200], [/^s\.rules\.pins\.(extra|below)$/, 0, 50, false],
  [/^s\.rules\./, 0.1, 5000], [/^pr\./, 0, 1e6], [/^pp\./, 0, 1e7]
];
function numLimit(bind) { if (bind === 'c.W' && cur() && cur().kind === 'panel') return { min:3, max:100, int:false };   // a loose panel: W is its thickness
  for (var i = 0; i < NUM_LIMITS.length; i++) if (NUM_LIMITS[i][0].test(bind)) return { min:NUM_LIMITS[i][1], max:NUM_LIMITS[i][2], int:!!NUM_LIMITS[i][3] }; return null; }
function ruleDefault(bind) { if (bind.indexOf('s.rules.') !== 0) return null; var v = getPath(RULE_DEF, bind.slice(8)); return typeof v === 'number' ? v : null; }
var colBase = null;   // the cabinet's column widths when its width field got the focus: typing a new width scales them from there
app.addEventListener('focusout', function (e) { var el = e.target; if (el && el.getAttribute && el.getAttribute('data-bind') === 'c.W') setTimeout(function () { colBase = null; }, 0); });   // after its change event
app.addEventListener('focusin', function (e) { var el = e.target; if (el && el.getAttribute && el.getAttribute('data-num') && el.getAttribute('data-bind')) el.setAttribute('data-prev', el.value);
  if (el && el.getAttribute && el.getAttribute('data-bind') === 'c.W' && cur() && colsOf(cur()) > 1) { var cb = cur(); colBase = { id:cb.id, W:num(cb.W), colW:colWidths(cb) }; } });
app.addEventListener('input', function (e) {
  if (e.target.id === 'np-name') { S.npName = e.target.value; e.target.removeAttribute('aria-invalid'); return; }
  if (e.target.id === 'lib-q') { S.libQ = e.target.value; var lp = e.target.selectionStart; render(); var lq = document.getElementById('lib-q'); if (lq) { lq.focus(); try { lq.setSelectionRange(lp, lp); } catch (er) {} } return; }
  if (e.target.id === 'home-q') { S.homeQ = e.target.value; var pos = e.target.selectionStart; render(); var q = document.getElementById('home-q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (er) {} } return; }
  var el = e.target, bind = el.getAttribute('data-bind'); if (!bind || el.type === 'checkbox' || el.tagName === 'SELECT') return;
  if (el.getAttribute('data-lines')) { setPath(S.settings, bind.slice(2), el.value.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean)); store('dbKurejas.settings', S.settings); return; }
  if (el.getAttribute('data-num')) {   // while typing, only a number in its range is applied (no 582 drawers on the way to 58, no 6 mm cabinet on the way to 600)
    var nv = numOrNull(el.value), lim0 = numLimit(bind);
    if (!String(el.value).trim() && el.getAttribute('data-empty')) { assign(bind, ''); }
    else { if (nv == null || nv < 0 && !(lim0 && lim0.min < 0) || (lim0 && (nv < lim0.min || nv > lim0.max))) return; assign(bind, bind.indexOf('s.') === 0 ? nv : el.value); }
  }
  else assign(bind, el.value);
  if (el.required) { if (el.value.trim()) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true'); }
  if (bind === 'p.name') { if (el.value.trim()) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true'); }
  if (bind === 'c.name') { var b = document.querySelector('.cab.on b'); if (b) b.firstChild.textContent = el.value || typeName(cur()); }
  if (/^c\.(W|H|D|dishWidth)$/.test(bind)) { var sm = document.querySelector('.cab.on small'); var c = cur(); if (sm) sm.textContent = fmt(c.dishwasher ? c.dishWidth : c.W) + '×' + fmt(c.H) + '×' + fmt(c.D); }
  after(bind, false);
});
app.addEventListener('change', function (e) {
  var el = e.target;
  if (el.getAttribute('data-act-change') === 'import') { importFile(el.files && el.files[0]); return; }
  if (el.getAttribute('data-act-change') === 'tpl') { loadTemplateFile(el.files && el.files[0]); el.value = ''; return; }
  if (el.getAttribute('data-act-change') === 'prjson' && S.admin) { var fl = el.files && el.files[0]; if (!fl) return; var rdr = new FileReader(); rdr.onload = function () { try { var nJ = prFromOffer(JSON.parse(rdr.result)); prSave(); render(); toast(nJ ? (S.lang === 'lt' ? 'Perimta kainų: ' : 'Prices taken: ') + nJ : (S.lang === 'lt' ? 'Faile kainų nerasta' : 'No prices in the file'), !nJ); } catch (er) { toast(t('badFile'), true); } }; rdr.readAsText(fl); el.value = ''; return; }
  if (el.hasAttribute('data-bkfront')) {   // the inside back's front face from the cabinet front → its inset from the back edge
    var bf = numOrNull(el.value), bmax = +el.getAttribute('data-bkfront'), bc = cur();
    if (bc && bf != null && bf >= 0 && bf <= bmax) { bc.cnc.backInset = Math.round((bmax - bf) * 10) / 10; save(); }
    else toast(t('numRange').replace('{a}', '0').replace('{b}', E.num(bmax)), true);
    render(); return; }
  if (el.hasAttribute('data-nestw') || el.hasAttribute('data-nesth') || el.hasAttribute('data-nestg')) {   // a material's board size or grain (kept in the settings)
    var nm = el.getAttribute('data-nestw') || el.getAttribute('data-nesth') || el.getAttribute('data-nestg'), bs = S.settings.boards = S.settings.boards || {}, bo = bs[nm] = bs[nm] || {};
    if (el.hasAttribute('data-nestg')) bo.grain = el.checked; else { var v0 = num(el.value); if (!(v0 >= 300 && v0 <= 6000)) { toast(t('nestBadSize'), true); render(); return; } bo[el.hasAttribute('data-nestw') ? 'W' : 'H'] = v0; }
    store('dbKurejas.settings', S.settings); render(); return; }
  if (el.getAttribute('data-act-change') === 'libmove') { var lbm = clib(), im = lbm.items.filter(function (it) { return it.id === el.getAttribute('data-v'); })[0]; if (im) { im.cat = el.value; clibSet(lbm); render(); } return; }
  if (el.getAttribute('data-act-change') === 'drwonly') { S.drwOnly = el.value; S.drwOpen = null; render(); return; }
  if (el.getAttribute('data-act-change') === 'looktex') { lookTexture(el.getAttribute('data-v'), el.files && el.files[0]); el.value = ''; return; }
  if (el.getAttribute('data-act-change') === 'lookcol') { var lc = el.value; if (/^#[0-9a-f]{6}$/i.test(lc)) lookSet(el.getAttribute('data-v'), function (l) { l.color = lc; l.tex = ''; }); return; }   // a colour instead of the photo
  if (el.getAttribute('data-act-change') === 'lookmm') { var lm = numOrNull(el.value), ln = el.getAttribute('data-v'); if (lm == null || lm < 20 || lm > 10000) { el.value = ((S.proj.look || {})[ln] || {}).mm || 1000; toast(t('numRange').replace('{a}', '20').replace('{b}', '10000'), true); return; } lookSet(ln, function (l) { l.mm = lm; }); return; }
  var bind = el.getAttribute('data-bind'); if (!bind || el.getAttribute('data-lines')) return;
  if (el.type === 'checkbox') assign(bind, el.checked);
  else if (el.getAttribute('data-num') && el.getAttribute('data-empty') && !String(el.value).trim()) assign(bind, '');
  else if (el.getAttribute('data-num')) {
    var n = numOrNull(el.value), lim = numLimit(bind), prev = numOrNull(el.getAttribute('data-prev')), why = '';
    if (n == null) { why = t('numBad'); n = prev != null ? prev : ruleDefault(bind); if (n == null) n = lim ? Math.max(0, lim.min) : 0; }
    if (lim && lim.int) n = Math.round(n);
    if (lim && (n < lim.min || n > lim.max)) { why = t('numRange').replace('{a}', E.num(lim.min)).replace('{b}', E.num(lim.max)); n = prev != null && prev >= lim.min && prev <= lim.max ? (lim.int ? Math.round(prev) : prev) : Math.min(lim.max, Math.max(lim.min, n)); }
    assign(bind, n); el.value = E.num(n); el.setAttribute('data-prev', el.value);
    if (why) toast(why + ' → ' + E.num(n), true);
  }
  else if (bind === 's.rules.merivo.marks') {   // profile holes: numbers only; nothing usable → the default
    var mm = String(el.value).split(/[ ,;]+/).filter(Boolean), okMm = mm.map(numOrNull).filter(function (v) { return v != null && v > 0; });
    if (!okMm.length) { assign(bind, RULE_DEF.merivo.marks); el.value = RULE_DEF.merivo.marks; toast(t('numBad') + ' → ' + RULE_DEF.merivo.marks, true); }
    else { assign(bind, okMm.join(', ')); el.value = okMm.join(', '); if (okMm.length < mm.length) toast(t('numSome'), true); }
  }
  else if (bind === 's.rules.under.marks') {   // runner holes: numbers only; nothing usable → the default
    var ms = String(el.value).split(/[ ,;]+/).filter(Boolean), okM = ms.map(numOrNull).filter(function (v) { return v != null && v > 0; });
    if (!okM.length) { assign(bind, RULE_DEF.under.marks); el.value = RULE_DEF.under.marks; toast(t('numBad') + ' → ' + RULE_DEF.under.marks, true); }
    else { assign(bind, okM.join(', ')); el.value = okM.join(', '); if (okM.length < ms.length) toast(t('numSome'), true); }
  }
  else if (/^s\.rules\.(ball|under|merivo)\.perLen$/.test(bind)) {   // "450: 35,195,420; 500: …": every entry checked
    var bad = String(el.value).split(/[;\n]+/).filter(function (x) { return x.trim(); }).some(function (x) { var m = x.split(':'); return m.length !== 2 || numOrNull(m[0]) == null || m[1].split(/[ ,]+/).filter(Boolean).some(function (v) { return numOrNull(v) == null; }); });
    assign(bind, el.value); if (bad) toast(t('perLenBad'), true);
  }
  else assign(bind, el.value);
  var full = /^(pr|pp)\./.test(bind) || /^c\.worktop\./.test(bind) || el.type === 'checkbox' || el.tagName === 'SELECT' || /\.(nDrawers|nDoors|shelves|height|frontH\.\d+|doorSplit)$/.test(bind) || /cnc\.joints\./.test(bind) || /^c\.box\./.test(bind) || /^c\.(colW\.|W$|shelfSb$|cnc\.backInset$|cnc\.topOv[FSB]$|cnc\.fg\.)/.test(bind) || /^c\.extras\.\d+\./.test(bind) || bind === 'p.name';
  if (full) { if (bind.indexOf('s.') === 0) { store('dbKurejas.settings', S.settings); applyRules(); } else save(); later('render'); }   // after focus has moved, so it is restored
  else { if (bind.indexOf('pr.') === 0) return; if (bind.indexOf('s.') === 0) { store('dbKurejas.settings', S.settings); applyRules(); } else save(); later('live'); }
});
/* a field's change fires on the mouse-down of the next click: the page is redrawn only after that click (else the click lands on nothing) */
var ptr = { down:false, pending:null };
function flushLater() { var p = ptr.pending; ptr.pending = null; if (p === 'render') render(); else if (p === 'live') refreshLive(); }
function later(kind) { ptr.pending = ptr.pending === 'render' || kind === 'render' ? 'render' : 'live'; if (!ptr.down) setTimeout(flushLater, 0); }
document.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'touch') ptr.down = true; }, true);
['pointerup', 'pointercancel'].forEach(function (ev) { document.addEventListener(ev, function () { if (!ptr.down) return; ptr.down = false; if (ptr.pending) setTimeout(flushLater, 0); }, true); });
window.addEventListener('blur', function () { if (ptr.down) { ptr.down = false; if (ptr.pending) setTimeout(flushLater, 0); } });
document.addEventListener('toggle', function (e) { if (e.target && e.target.classList && e.target.classList.contains('pricecard')) S.prOpen = e.target.open; if (e.target && e.target.classList && e.target.classList.contains('technical-preview')) S.techOpen = e.target.open; if (e.target && e.target.classList && e.target.classList.contains('preview-warnings')) S.warnOpen = e.target.open; if (e.target && e.target.id === 'st-constr') S.constrOpen = e.target.open; }, true);
document.addEventListener('keydown', function (e) {   // sheet preview: Esc closes, arrows page
  if (S.tab === 'drw' && S.drwOpen != null && /^(Escape|ArrowLeft|ArrowRight)$/.test(e.key) && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); if (e.key === 'Escape') S.drwOpen = null; else S.drwOpen = Math.max(0, Math.min((S._drw || []).length - 1, S.drwOpen + (e.key === 'ArrowRight' ? 1 : -1))); render(); var bx = document.querySelector('.drwbox .btn.pri'); if (bx) bx.focus(); }
});
app.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'text') {   // Enter → next field (as in the offer app)
    var all = Array.prototype.slice.call(app.querySelectorAll('input[type=text]')), i = all.indexOf(e.target);
    e.target.blur(); if (all[i + 1]) { var nx = document.getElementById(all[i + 1].id) || all[i + 1]; nx.focus(); if (nx.select) nx.select(); }
    e.preventDefault();
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('data-act') === 'part') { e.preventDefault(); e.target.click(); }
  if (e.key === 'Enter' && e.target.id === 'np-name') { e.preventDefault(); var b = document.querySelector('[data-act=pcreate]'); if (b) b.click(); return; }
});
document.addEventListener('keydown', function (e) {   // undo, wherever the focus is (after a click it is on the page body)
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || (e.key !== 'z' && e.key !== 'Z') || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || S.home) return;
  if (S.tab === 'cab' && undoJoints()) e.preventDefault(); else if (S.tab === 'room' && roomUndo()) e.preventDefault();
});
app.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]'); if (!el) return;
  var act = el.getAttribute('data-act'), v = el.getAttribute('data-v'), i = +el.getAttribute('data-i');
  if (act === 'closeDrawer' && e.target.closest('[data-stop]') && el.classList.contains('overlay')) return;
  if (act !== 'del' && act !== 'pnew' && act !== 'pdel' && act !== 'prreset' && act !== 'libdel') S.confirm = null;   // the two-click deletes keep their 'sure?' between the clicks
  switch (act) {
    case 'tab': S.tab = v; S.picking = false; window.scrollTo(0, 0); break;
    case 'lang': S.lang = v; store('dbKurejas.lang', v); break;
    case 'sel': S.sel = i; S.picking = false; S.iso = null; S.colSel = 0; S.jcheck = false; S.echeck = false; break;
    case 'pick': S.picking = true; break;
    case 'unpick': S.picking = false; break;
    case 'preset': S.proj.cabinets.push(fromPreset(PRESETS[i])); S.sel = S.proj.cabinets.length - 1; S.picking = false; save(); break;
    case 'dup': { var cp = clone(cur()); cp.id = uid(); delete cp.libId; cp.name = copyName(cp.name); S.proj.cabinets.splice(S.sel + 1, 0, cp); S.sel++; save(); break; }
    case 'del': { if (S.confirm !== 'del') { S.confirm = 'del'; break; } S.confirm = null; var di = S.sel, dg = S.proj.cabinets.splice(di, 1)[0], dp = S.proj; S.sel = Math.max(0, S.sel - 1); save(); render();
      toast(t('cabRemoved').replace('{n}', dg.name || (di + 1)), false, t('undoBtn'), function () { if (S.proj !== dp || S.proj.cabinets.some(function (x) { return x.id === dg.id; })) return; S.proj.cabinets.splice(Math.min(di, S.proj.cabinets.length), 0, dg); S.sel = Math.min(di, S.proj.cabinets.length - 1); S.home = false; S.tab = 'cab'; S.picking = false; save(); render(); });
      return; }
    case 'set': assign(el.getAttribute('data-bind'), v); after(el.getAttribute('data-bind'), true); return;
    case 'libsave': { var lcb = cur(); if (!lcb) break; var lit = clibAdd(lcb); save(); toast(t('libSaved').replace('{n}', lit.name).replace('{c}', lit.cat)); break; }
    case 'libunlink': { var ucb = cur(); if (ucb) { delete ucb.libId; save(); toast(t('libUnlinked')); } break; }
    case 'libcat': S.libCat = v; break;
    case 'libnewcat': { var nci = document.getElementById('lib-newcat'), ncv = nci && nci.value.trim(); if (!ncv) break; var ll = clib(); if (ll.cats.indexOf(ncv) < 0) { ll.cats.push(ncv); clibSet(ll); } S.libCat = ncv; break; }
    case 'libcatdel': { var ld = clib(); ld.cats = ld.cats.filter(function (x) { return x !== v || ld.items.some(function (it) { return it.cat === x; }); }); clibSet(ld); if (S.libCat === v) S.libCat = ''; break; }
    case 'libdel': { if (S.confirm !== 'libdel' + v) { S.confirm = 'libdel' + v; break; } S.confirm = null; var lx = clib(); lx.items = lx.items.filter(function (it) { return it.id !== v; }); clibSet(lx);
      S.proj.cabinets.forEach(function (cc) { if (cc.libId === v) delete cc.libId; }); save(); break; }
    case 'libadd': { var la = clib().items.filter(function (it) { return it.id === v; })[0]; if (!la) break; var nc = normCab(Object.assign(clone(la.cab), { id:uid(), libFrom:la.id }));
      S.proj.cabinets.push(nc); S.sel = S.proj.cabinets.length - 1; S.picking = false; save(); toast(t('libAdded').replace('{n}', la.name)); break; }
    case 'nestopen': nestHandoff(); return;
    case 'ledadd': { var lc = cur(); lc.leds = lc.leds || []; lc.leds.push({ at:v, side:v === 'bottom' && cabKind(lc) === 'PAKABINAMOS' ? 'out' : 'in', from:E.R.led.from, ends:'open', w:E.R.led.w, depth:E.R.led.depth }); save(); break; }
    case 'leddel': { var lc2 = cur(); if (lc2.leds) lc2.leds.splice(i, 1); save(); break; }
    case 'shposreset': { var csr = cur(), ssr = csr && csr.sections[+i]; if (ssr) { ssr.shelfPos = []; ssr.shelfMode = 'even'; save(); } break; }
    case 'addsec': { var ns = newSection(v); ns.col = isNaN(i) ? 0 : i; S.colSel = ns.col; cur().sections.push(ns); save(); break; }
    case 'colsel': S.colSel = +v; break;
    case 'lookrot': lookSet(v, function (l) { l.rot = !l.rot; }); return;
    case 'lookpaste': lookPaste(v); return;
    case 'rrcab': {   // this cabinet alone, standing against one wall, in the realistic picture
      var rcb = cur(), ri = S._info && S._info[S.sel]; if (!rcb || !ri || !window.DBRender || !RM) return;
      var lay = S.proj.layout || {}, it0 = lay.items && lay.items[rcb.id], wl = Math.max(2400, RM.cabW(rcb) + 1600);
      var tp = { name:S.proj.name + '_' + (S.sel + 1), look:S.proj.look, cabinets:[rcb], layout:{ walls:[{ len:wl }], wallZ:num(lay.wallZ) || 1450, roomH:Math.max(num(lay.roomH) || 2600, RM.cabH(rcb) + 600), worktop:lay.worktop !== false, items:{} } };
      tp.layout.items[rcb.id] = { wall:0, x:(wl - RM.cabW(rcb)) / 2, z:it0 && it0.z != null ? it0.z : null };
      window.DBRender.open({ proj:tp, infos:[ri], th:0.35, t:t, mats:pickMats, onMat:function (c, part, name) { setMatOf(c, part, name); var k = S.proj.cabinets.indexOf(c); return [S._info[k >= 0 ? k : S.sel]]; } }); return; }
    case 'lookfit': lookSet(v, function (l) { l.fit = l.fit === false; if (!(num(l.mm) > 0)) l.mm = 1000; }); return;
    case 'lookrm': lookSet(v, function (l) { l.tex = ''; l.color = ''; }); return;
    case 'adminset': { var p1 = (document.getElementById('adm-pin') || {}).value || '', p2 = (document.getElementById('adm-pin2') || {}).value || '';
      if (p1.length < 4) { toast(S.lang === 'lt' ? 'PIN — bent 4 simboliai' : 'PIN — at least 4 characters', true); return; }
      if (p1 !== p2) { toast(S.lang === 'lt' ? 'PIN nesutampa' : 'PINs do not match', true); return; }
      pinHash(p1).then(function (h) { store('dbKurejas.adminPin', h); try { sessionStorage.setItem('dbKurejas.admin', h); } catch (er) {} S.admin = true; render(); toast(S.lang === 'lt' ? 'Administratoriaus režimas įjungtas' : 'Admin mode on'); }); return; }
    case 'adminunlock': { var p3 = (document.getElementById('adm-pin') || {}).value || '';
      pinHash(p3).then(function (h) { if (h !== store('dbKurejas.adminPin')) { toast(S.lang === 'lt' ? 'Neteisingas PIN' : 'Wrong PIN', true); var f = document.getElementById('adm-pin'); if (f) { f.value = ''; f.focus(); } return; }
        try { sessionStorage.setItem('dbKurejas.admin', h); } catch (er) {} S.admin = true; render(); toast(S.lang === 'lt' ? 'Kainos matomos' : 'Prices shown'); }); return; }
    case 'adminlock': S.admin = false; S.pinChange = false; try { sessionStorage.removeItem('dbKurejas.admin'); } catch (er) {} toast(S.lang === 'lt' ? 'Užrakinta — kainos paslėptos' : 'Locked — prices hidden'); break;
    case 'adminpin': if (!S.admin) return; S.pinChange = !S.pinChange; render(); { var np = document.getElementById('adm-npin'); if (np) np.focus(); } return;   // the old PIN stays until the new one is saved
    case 'adminpincancel': S.pinChange = false; break;
    case 'adminpinsave': { if (!S.admin) return; var n1 = (document.getElementById('adm-npin') || {}).value || '', n2 = (document.getElementById('adm-npin2') || {}).value || '';
      if (n1.length < 4) { toast(S.lang === 'lt' ? 'PIN — bent 4 simboliai' : 'PIN — at least 4 characters', true); return; }
      if (n1 !== n2) { toast(S.lang === 'lt' ? 'PIN nesutampa' : 'PINs do not match', true); return; }
      pinHash(n1).then(function (h) { if (store('dbKurejas.adminPin', h) === false) { saveFailed(); return; } try { sessionStorage.setItem('dbKurejas.admin', h); } catch (er) {} S.pinChange = false; render(); toast(S.lang === 'lt' ? 'PIN pakeistas' : 'PIN changed'); }); return; }
    case 'primport': { if (!S.admin) return; var oa = null; try { oa = JSON.parse(localStorage.getItem('dedesBaldai.calc.v1') || 'null'); } catch (er) {}
      if (!oa) { toast(S.lang === 'lt' ? 'Pasiūlymų skaičiuoklės kainų šioje naršyklėje nerasta — įkelkite offer projekto JSON' : 'No offer-app prices in this browser — load an offer project JSON', true); return; }
      var nI = prFromOffer(oa); prSave(); toast(nI ? (S.lang === 'lt' ? 'Perimta kainų: ' : 'Prices taken: ') + nI : (S.lang === 'lt' ? 'Kainų nerasta — pasiūlymų skaičiuoklėje kainų dar nėra' : 'No prices found — the offer app has none yet'), !nI); break; }
    case 'prreset': if (!S.admin) return; if (S.confirm !== 'prreset') { S.confirm = 'prreset'; toast(S.lang === 'lt' ? 'Paspauskite dar kartą — visos kainos taps numatytomis' : 'Click again — all prices go back to defaults'); return; }
      S.confirm = null; PR = prDefaults(); prSave(); break;
    case 'drwcab': S.tab = 'drw'; S.drwOnly = cur() ? 'c:' + cur().id : 'all'; S.drwOpen = null; window.scrollTo(0, 0); break;
    case 'drwpaper': S.drwPaper = v; store('dbKurejas.paper', v); break;
    case 'drwopen': S.drwOpen = i; break;
    case 'drwclose': if (el.classList.contains('drwover') && e.target.closest('[data-stop]')) return; S.drwOpen = null; break;
    case 'drwnav': S.drwOpen = Math.max(0, Math.min((S._drw || []).length - 1, (S.drwOpen || 0) + (+v))); break;
    case 'drwpdf': savePdf(S._drw || drwSheets(), projName() + '_brezinai' + (S.drwOnly === 'all' ? '' : S.drwOnly === 'furn' ? '_baldai' : drwOnlyIdx() != null ? '_' + (drwOnlyIdx() + 1) : '') + '.pdf'); return;
    case 'drwpdf1': { var one = (S._drw || [])[i]; if (one) savePdf([one], projName() + '_' + (one.cab != null ? (S.lang === 'lt' ? 'spintele_' : 'cabinet_') + (one.cab + 1) + (one.cont ? '_2' : '') : E.safeName(one.title).replace(/^_+|_+$/g, '')) + '.pdf'); return; }
    case 'boxadd': { pushUndo(); var bc = cur(), nid = Math.max.apply(null, [0].concat(bc.box.inner.map(function (q) { return +q.id || 0; }))) + 1, rb = S._info[S.sel].r.box, tt = num(bc.thick) || 18;
      if (v === 'part') { var cw = -1, ck = 0; rb.comps.forEach(function (cp, k) { if (cp[1] - cp[0] > cw) { cw = cp[1] - cp[0]; ck = k; } }); bc.box.inner.push({ id:nid, kind:'part', x:Math.round((rb.comps[ck][0] + rb.comps[ck][1]) / 2) }); }
      else { var cz = rb.cavity[2], zs = rb.boards.filter(function (q) { return q.kind === 'shelf' && q.col === 0; }).map(function (q) { return q.ext[2]; }).sort(function (a, b2) { return a[0] - b2[0]; }), lo = cz[0], best = null;
        zs.concat([[cz[1], cz[1]]]).forEach(function (z) { if (!best || z[0] - lo > best[1] - best[0]) best = [lo, z[0]]; lo = z[1]; });
        bc.box.inner.push({ id:nid, kind:'shelf', z:Math.round((best[0] + best[1]) / 2 - tt / 2), col:0, adj:false }); }
      save(); break; }
    case 'boxrm': pushUndo(); cur().box.inner.splice(i, 1); save(); break;
    case 'boxfadd': { pushUndo(); var fc0 = cur(), fb0 = fc0.box, ops0 = (S._info[S.sel].r.box || {}).openings || [], nid0 = Math.max.apply(null, [0].concat(fb0.fronts.map(function (q) { return +q.id || 0; }))) + 1;
      if (fb0.boards.front && fb0.boards.front.on) { fb0.boards.front.on = false; toast(t('bxFrontOff')); }
      var used = {}; fb0.fronts.forEach(function (q) { for (var k = 0; k < (+q.span || 1); k++) used[(+q.col || 0) + ':' + ((+q.cell || 0) + k)] = 1; });
      var free = ops0.filter(function (o) { return !used[o.col + ':' + o.cell]; })[0];
      if (!free && ops0.length) { S.undo.pop(); toast(S.lang === 'lt' ? 'Visos angos jau turi duris ar stalčius — pridėkite lentyną ar pertvarą, kad atsirastų nauja anga.' : 'Every opening already has doors or drawers — add a shelf or a partition to make a new opening.', true); break; }
      free = free || { col:0, cell:0 };
      fb0.fronts.push(v === 'drawers' ? { id:nid0, kind:'drawers', col:free.col, cell:free.cell, span:1, inset:false, nDrawers:2, hw:'BLUM TANDEMBOX', rail:500 }
        : v === 'cargo' ? { id:nid0, kind:'cargo', col:free.col, cell:free.cell, span:1, inset:false, cargoHw:'CARGO DTC PURE PRO' }
        : { id:nid0, kind:'doors', col:free.col, cell:free.cell, span:1, inset:false, nDoors:(free.x1 - free.x0) > 600 ? 2 : 1, hinge:'BLUM LANKSTAI', hingeSide:'auto', hingeN:'' });
      fc0.cnc.hinges = fc0.cnc.hinges !== false; save(); break; }
    case 'boxfrm': pushUndo(); cur().box.fronts.splice(i, 1); save(); break;
    case 'boxcover': pushUndo(); cur().box.cover[v] = el.getAttribute('data-w'); save(); break;
    case 'box3d': if (window.DBAssembly.setBoards) window.DBAssembly.setBoards(true); mountAssembly(); { var ap = document.getElementById('assembly-preview'); if (ap) ap.scrollIntoView({ behavior:'smooth', block:'center' }); } return;
    case 'mv': { var cc0 = cur(), a = cc0.sections, cl = colOf(cc0, a[i]), idx = a.map(function (s, q) { return q; }).filter(function (q) { return colOf(cc0, a[q]) === cl; }), p0 = idx.indexOf(i), j = idx[p0 + (+v)];
      if (j == null) return; var tmp = a[i]; a[i] = a[j]; a[j] = tmp; save(); break; }
    case 'fhreset': delete cur().sections[i].frontH; save(); break;
    case 'rmsec': { var rc = cur(), gone = rc.sections.splice(i, 1)[0]; save(); render();
      toast(t('secRemoved'), false, t('undoBtn'), function () { var c2 = S.proj && S.proj.cabinets.filter(function (x) { return x.id === rc.id; })[0]; if (!c2) return; c2.sections.splice(Math.min(i, c2.sections.length), 0, gone); save(); render(); });
      return; }
    case 'addx': { var cc = cur(), hb0 = hbOf(cc), le0 = E.legHeight(engineDef(cc));
      if (v === 'side') {   // as the room's ＋: on a free side, as tall as the cabinet stands (down to the floor), flush with the fronts
        if (RM && RM.ensure(S.proj)) save(); var has0 = (cc.extras || []).filter(function (x) { return x && x.kind === 'side'; }).map(function (x) { return x.side; }), sd0 = has0.indexOf('L') < 0 ? 'L' : has0.indexOf('R') < 0 ? 'R' : '';
        if (sd0 && RM && RM.addSide && S.proj.layout && S.proj.layout.items[cc.id] && S.proj.layout.items[cc.id].wall >= 0) { var rs = RM.addSide(S.proj, cc, sd0); save(); render(); if (rs && rs.short) toast(t('rmSideShort').replace('{n}', E.num(rs.short)), true); return; }
        var fT0 = num(cc.cnc.facadeT) || 18; cc.extras.push({ kind:'side', side:sd0, fit:'', name:t('exSide'), L:num(cc.H), W:num(cc.D) + fT0, T:fT0, qty:1, mat:cc.mat.facade || cc.mat.carc, e1:true, e2:true, e3:true, e4:true, zb:0, yf:fT0 }); save(); break; }
      cc.extras.push(v === 'plinth' ? { kind:'plinth', name:t('exPlinth'), L:num(cc.W) - (hb0 > 0 && !le0 ? 2 * (num(cc.thick) || 18) : 0), W:Math.max(40, le0 + hb0 - 2), T:num(cc.thick) || 18, qty:1, mat:cc.mat.facade || cc.mat.carc, e1:true }
                                                   : { name:t('exAdd'), L:num(cc.W), W:100, T:num(cc.thick) || 18, qty:1, mat:cc.mat.carc }); save(); break; }
    case 'plfit': { var cf = cur(), pv = String(v).split(':'), xf = cf && cf.extras[+pv[0]]; if (!xf) break;
      if (pv[1] === 'off') ['gl', 'gr', 'gt', 'gb'].forEach(function (k) { delete xf[k]; });
      else { if (hbOf(cf) > 0) xf.between = true; xf.gl = 1; xf.gr = 1; xf.gt = 4; xf.gb = 0; }   // between the sides with 1 mm at each, 4 mm under the bottom board
      save(); break; }
    case 'fgbot': { var cg = cur(), ig = S._info && S._info[S.sel], rg = ig && ig.r; if (!cg) break;
      if (v === 'reset') cg.cnc.fg = {}; else if (rg && rg.fgaps) { cg.cnc.fg = Object.assign({}, cg.cnc.fg || {}); cg.cnc.fg.bot = rg.fgaps.botMin; }
      save(); break; }
    case 'camside': { var cq = cur(); if (!cq) break; cq.cnc.camOut = Object.assign({}, cq.cnc.camOut || {}); cq.cnc.camOut[v] = !cq.cnc.camOut[v]; save(); break; }
    case 'plinthpos': { var pq = cur(), pqi = plinthIdx(pq); if (pqi < 0) break; var px = pq.extras[pqi], tq = num(pq.thick) || 18, inq = v === 'in';
      px.between = inq; if (num(px.L) === num(pq.W) || num(px.L) === num(pq.W) - 2 * tq) px.L = num(pq.W) - (inq ? 2 * tq : 0);   // a full-width plinth keeps fitting
      var hq = hbOf(pq), lq = E.legHeight(engineDef(pq)), wIn = Math.max(40, hq - 2), wUn = Math.max(40, lq + hq - 2);
      if (num(px.W) === wIn || num(px.W) === wUn) px.W = inq ? wIn : wUn;   // the height too, unless it was set by hand
      if (px.yf === '' || px.yf == null) px.yf = inq ? 20 : 50; save(); break; }
    case 'plinth': { var pc0 = cur(), pi0 = plinthIdx(pc0);
      if (v === 'off') { if (pi0 >= 0) { pc0.extras.splice(pi0, 1); save(); } break; }
      if (pi0 < 0) { var hbp = hbOf(pc0), lep = E.legHeight(engineDef(pc0));
        pc0.extras.push({ kind:'plinth', name:t('exPlinth'), between:hbp > 0 ? true : undefined, L:num(pc0.W) - (hbp > 0 ? 2 * (num(pc0.thick) || 18) : 0), W:Math.max(40, (hbp > 0 ? 0 : lep) + hbp - 2), T:num(pc0.thick) || 18, qty:1, mat:pc0.mat.facade || pc0.mat.carc, e1:true }); save(); }
      break; }
    case 'rmx': { var xc = cur(), xg = xc.extras.splice(i, 1)[0]; save(); render();
      toast(t('xRemoved'), false, t('undoBtn'), function () { var c2 = S.proj && S.proj.cabinets.filter(function (x) { return x.id === xc.id; })[0]; if (!c2) return; c2.extras.splice(Math.min(i, c2.extras.length), 0, xg); save(); render(); });
      return; }
    case 'xside': S.xside = v; break;
    case 'jreset': pushUndo(); if (cur().cnc.joints) delete cur().cnc.joints[v]; save(); break;
    case 'jcopen': S.jcheck = true; S.echeck = false; break;
    case 'ecopen': S.echeck = true; S.jcheck = false; break;
    case 'ecview': { var EV = S.ecView = S.ecView || { th:0.62, ph:0.42, zoom:1, exp:false, fronts:false };
      if (v === 'front') { EV.th = 0.62; EV.ph = 0.42; } else if (v === 'backv') { EV.th = 0.62 + Math.PI; EV.ph = 0.42; } else if (v === 'under') { EV.th = 0.62; EV.ph = -0.7; }
      else if (v === 'zin') EV.zoom = Math.min(6, (EV.zoom || 1) * 1.3); else if (v === 'zout') EV.zoom = Math.max(0.5, (EV.zoom || 1) / 1.3); else EV[v] = !EV[v]; break; }
    case 'ecroom': S.sel = i; setRoomSel(i); S.echeck = true; S.jcheck = false; break;
    case 'ecclose': if (!el.getAttribute('data-force') && e.target.closest('[data-stop]')) return; S.echeck = false; break;
    case 'ecok': { var ce = cur(), ie = S._info && S._info[S.sel]; if (ce && ie && ie.r) { ce.edgesOk = ecSig(ie.r); save(); toast(S.lang === 'lt' ? 'Kraštai patikrinti ✓' : 'Edges checked ✓'); } S.echeck = false; break; }
    case 'ebk': { var ck = cur(), ik = S._info && S._info[S.sel], pk = ik && ik.r && ik.r.panels.filter(function (q) { return q.key === v; })[0], what = el.getAttribute('data-i'); if (!ck || !pk) break;
      var EE = ck.ebEdit = ck.ebEdit || {}, ES = ['y0', 'y1', 'x0', 'x1'], has = function (e2) { return !!(pk.eb && pk.eb[e2]); };
      if (S.ecDrag) { S.ecDrag = false; return; }
      if (what === 'reset') delete EE[v];
      else { var o2 = EE[v] = EE[v] || {}, frontP = pk.role === 'FASADAS' || pk.role === 'DURYS', isF = function (e2) { return !!(pk.ebFac && pk.ebFac[e2]); };
        if (o2.fac) { delete o2.fac; ES.forEach(function (e2) { if (has(e2)) o2[e2] = 'fac'; }); }   // a whole part set "as the fronts" before: now edge by edge
        if (what === 'all') { var allOn = ES.every(has); ES.forEach(function (e2) { o2[e2] = allOn ? false : (isF(e2) ? 'fac' : true); }); }
        else o2[what] = !has(what) ? true : (!frontP && !isF(what) ? 'fac' : false);   // not banded → carcass edge → as the fronts → not banded
        if (!Object.keys(o2).length) delete EE[v]; }
      if (!ck.edge.carc && !ck.edge.facade && what !== 'reset') toast(t('ebNoMat'));
      save(); break; }
    case 'jcroom': S.sel = i; setRoomSel(i); S.jcSel = null; S.jcheck = true; break;
    case 'rcedit': S.sel = i; S.tab = 'cab'; S.picking = false; S.iso = null; S.stepKey = S.proj.cabinets[i] && S.proj.cabinets[i].kind === 'box' ? 'joints' : 'ops'; break;
    case 'jcsel': S.jcSel = S.jcSel && S.jcSel.key === v ? null : { key:v, side:'L', idx:null }; break;
    case 'undo': undoJoints(); return;
    case 'jcclose': if (!el.getAttribute('data-force') && e.target.closest('[data-stop]')) return; S.jcheck = false; break;
    case 'jcok': { var cj = cur(), ij = S._info && S._info[S.sel]; if (cj && ij && ij.r) { cj.jointsOk = jcSig(ij.r); save(); toast(S.lang === 'lt' ? 'Sujungimai patikrinti ✓' : 'Joints checked ✓'); } S.jcheck = false; break; }
    case 'jc3d': S.jcheck = false; S.iso = { key:v, side:'L', idx:null }; S.isoFocus = true; break;
    case 'jcn': { var cn = cur(), inn = S._info && S._info[S.sel], jj = inn && inn.r && (inn.r.joints || []).filter(function (q) { return q.key === v; })[0]; if (!cn || !jj) break;
      pushUndo(); var Jn = cn.cnc.joints = cn.cnc.joints || {}, on = Jn[v] && !Jn[v].L && !Jn[v].R ? Jn[v] : {}; Jn[v] = Object.assign({}, on, { n:Math.max(1, Math.min(8, (jj.sides ? jj.sides.L : jj).pos.length + (+i || 0))) }); delete Jn[v].pos; save(); break; }
    case 'isosel': S.iso = { key:v, side:'L', idx:null }; S.isoFocus = true; render(); var ie = document.getElementById('iso3d') || document.getElementById('assembly-preview'); if (ie && ie.scrollIntoView) ie.scrollIntoView({ block:'center', behavior:'smooth' }); return;
    case 'part': S.part = v; S.ptab = 0; var pp0 = findPanel(v); S.partRef = pp0 ? { cab:pp0.cab, key:pp0.key } : null; if (window.innerWidth < 900) setTimeout(function () { var pv = document.querySelector('.paper') || document.querySelector('.partview'); if (pv && pv.scrollIntoView) pv.scrollIntoView({ block:'start', behavior:'smooth' }); }, 60); break;
    case 'ptab': S.ptab = +v; break;
    case 'ebtog': case 'ebreset': case 'ebfac': { var pp = S.part && findPanel(S.part), cb = pp && S.proj.cabinets[pp.cab - 1]; if (!cb) break;
      cb.ebEdit = cb.ebEdit || {};
      if (act === 'ebreset') delete cb.ebEdit[pp.key];
      else if (act === 'ebfac') { var ovf = cb.ebEdit[pp.key] = cb.ebEdit[pp.key] || {}; ovf.fac = !pp.ebFac;
        if (ovf.fac && !['y0', 'y1', 'x0', 'x1'].some(function (e) { return pp.eb && pp.eb[e]; })) ovf.y0 = true;   // nothing banded yet: the front edge (Y=0) is the one that shows
        if (!ovf.fac) delete ovf.fac; if (!Object.keys(ovf).length) delete cb.ebEdit[pp.key]; }
      else { var ov = cb.ebEdit[pp.key] = cb.ebEdit[pp.key] || {}; ov[v] = !(pp.eb && pp.eb[v]); }
      if (!cb.edge.carc && !cb.edge.facade && act === 'ebtog') toast(t('ebNoMat'));
      save(); break; }
    case 'copy': { var txt = (document.getElementById('progtext') || {}).textContent || ''; var ok = function () { toast(t('copied')); }; var fb = function () { var r = document.createRange(); r.selectNodeContents(document.getElementById('progtext')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(txt).then(ok, fb); } catch (er) { fb(); } return; }
    case 'dl': download(v); return;
    case 'dlprog': e.stopPropagation(); saveProgs([v]); return;
    case 'dlpart': saveProgs(buildProjectAll().parts.filter(function (p) { return p.name === v; }).reduce(function (a, p) { return a.concat((p.progs || []).map(function (f) { return f.file; })); }, [])); return;
    case 'dlcab': saveProgs(buildProjectAll().parts.filter(function (p) { return String(p.cab) === v; }).reduce(function (a, p) { return a.concat((p.progs || []).map(function (f) { return f.file; })); }, [])); return;
    case 'dlall': saveProgs(buildProjectAll().files.map(function (f) { return f.name; })); return;
    case 'tplreset': S.tplB64 = null; S.tplName = ''; try { localStorage.removeItem('dbKurejas.reportTpl'); } catch (e) {} break;
    case 'print': try { window.print(); } catch (er) {} return;
    case 'resetrules': { var rPrev = { hinge:clone(S.settings.rules.hinge), pins:clone(S.settings.rules.pins) };   // only what this card shows: hinge and shelf-support values
      S.settings.rules.hinge = clone(RULE_DEF.hinge); S.settings.rules.pins = clone(RULE_DEF.pins); store('dbKurejas.settings', S.settings); applyRules(); render();
      toast(t('rulesReset'), false, t('undoBtn'), function () { S.settings.rules.hinge = rPrev.hinge; S.settings.rules.pins = rPrev.pins; store('dbKurejas.settings', S.settings); applyRules(); render(); }); return; }
    case 'goto': gotoStep(v); return;
    case 'step': { var cs = cur(), is0 = S._info && S._info[S.sel], order = ['dims', 'build', 'boards', 'inner', 'secs', 'fronts', 'ops', 'joints', 'mats', 'extra'], jst = cs && cs.kind === 'box' ? 'joints' : 'ops';
      S.jcAsked = S.jcAsked || {};
      if (cs && is0 && is0.r && order.indexOf(v) > order.indexOf(jst) && order.indexOf(S.stepKey || 'dims') <= order.indexOf(jst) && jcNeeded(cs, is0.r) && !S.jcAsked[cs.id]) { S.jcAsked[cs.id] = 1; S.jcheck = true; toast(S.lang === 'lt' ? 'Būtina patikrinti sujungimus' : 'The joints must be checked', true); } }
      S.stepKey = v; render(); { var ed = document.querySelector('.editor'); if (ed && ed.getBoundingClientRect().top < 0) window.scrollTo({ top:0, behavior:'smooth' }); } return;
    case 'fixcab': S.home = false; S.tab = 'cab'; S.sel = i; S.picking = false; render(); setTimeout(function () { if (v === 'wt') { var wf = document.getElementById('f-c-worktop-mat'); if (wf) { wf.scrollIntoView({ block:'center', behavior:'smooth' }); wf.focus({ preventScroll:true }); return; } v = 'dims'; } gotoStep('st-' + (v || 'mats')); }, 30); return;
    case 'fixname': { var pn = document.getElementById('projname'); if (pn) { pn.focus(); pn.scrollIntoView({ block:'center' }); } return; }
    case 'home': if (S.proj) { clearTimeout(libTimer); libSave(); } S.home = true; S.confirm = null; window.scrollTo(0, 0); break;
    case 'pcreate': { var nm = ((document.getElementById('np-name') || {}).value || '').trim();
      if (!nm) { toast(t('npNeed'), true); var nf = document.getElementById('np-name'); if (nf) { nf.focus(); nf.setAttribute('aria-invalid', 'true'); } return; }
      S.npName = ''; newProject(nm); toast(t('npDone').replace('{n}', nm)); break; }
    case 'pimport': { var fi = document.getElementById('f-import'); if (fi) fi.click(); return; }
    case 'psample': { var sp = sample(); sp.id = uid(); openProject(sp); libSave(); break; }
    case 'pdup': { var src = lib().filter(function (r) { return r.id === v; })[0]; if (!src) break; var cp2 = clone(src.data); cp2.id = uid(); cp2.name = (cp2.name || '') + ' ' + t('copySfx'); cp2.updated = new Date().toISOString();
      libSet([libRec(cp2)].concat(lib())); toast(t('prDupDone')); break; }
    case 'pjson': { var rj = lib().filter(function (r) { return r.id === v; })[0]; if (rj) saveFile(E.safeName(rj.name || 'PROJEKTAS') + '_projektas.json', JSON.stringify(rj.data, null, 1)); return; }
    case 'pnew': if (S.proj) { clearTimeout(libTimer); libSave(); VER.flush(); } S.home = true; S.focusNew = true; S.confirm = null; window.scrollTo(0, 0); break;
    case 'popen': { var rec = lib().filter(function (r) { return r.id === v; })[0]; if (rec) { if (S.proj && S.proj.id !== rec.id) { clearTimeout(libTimer); libSave(); VER.flush(); } openProject(rec.data); } break; }
    case 'pver': verOpen(v || (S.proj && S.proj.id)); return;
    case 'pdel': { if (S.confirm !== 'pdel' + v) { S.confirm = 'pdel' + v; break; } S.confirm = null; libSet(lib().filter(function (r) { return r.id !== v; }));
      if (S.proj && S.proj.id === v) { S.proj = null; try { localStorage.removeItem('dbKurejas.current'); } catch (er) {} } toast(t('prDeleted')); break; }
  }
  render();
});
var tTimer;
function toast(msg, err, actLabel, actFn) {
  var d = document.getElementById('toast'); if (!d) { d = document.createElement('div'); d.id = 'toast'; d.setAttribute('role', 'status'); document.body.appendChild(d); }
  d.className = 'toast' + (err ? ' err' : ''); d.textContent = msg;
  if (actLabel && actFn) { var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'toast-act'; bt.textContent = '↶ ' + actLabel;
    bt.addEventListener('click', function () { d.hidden = true; clearTimeout(tTimer); actFn(); }); d.appendChild(bt); }
  d.hidden = false; clearTimeout(tTimer); tTimer = setTimeout(function () { d.hidden = true; }, actFn ? 6000 : 2600);
}

/* ----------------------------------------------------------------- import (own JSON or the offer app's export) */
function importFile(file) {
  if (!file) return;
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var d = JSON.parse(rd.result), p;
      if (d && d.app === 'db-kurejas' && Array.isArray(d.cabinets)) { p = d; p.id = p.id || uid(); }
      else if (d && Array.isArray(d.cabinets)) p = fromOffer(d);
      else throw new Error('format');
      if (lib().some(function (r) { return r.id === p.id; })) p.id = uid();   // importing the same file twice gives two projects, not an overwrite
      openProject(p); save(); clearTimeout(libTimer); libSave(); render();
      toast(t('imported') + p.cabinets.length);
    } catch (er) { toast(t('badFile'), true); }
  };
  rd.readAsText(file);
}
function fromOffer(d) {
  var mats = {}; (d.materials || []).forEach(function (m) { mats[m.id] = m.name; });
  var mname = function (v) { return mats[v] || v || ''; };
  var out = { app:'db-kurejas', v:1, id:uid(), name:String(d.projectName || '').trim(), cabinets:d.cabinets.map(function (c) {
    var type = TYPES.indexOf(c.type) >= 0 ? c.type : 'PASTATOMOS';
    var cab = { name:c.name || '', type:type, W:num(c.W), H:num(c.H), D:num(c.D), thick:num(c.thick) || 18, cols:num(c.cols) || 1, colW:c.colW || [], dishwasher:!!c.dishwasher, dishWidth:num(c.dishWidth) || 600, vis:{ L:!!c.visLeft, R:!!c.visRight, B:false },
      mat:{ carc:mname(c.carcMat), facade:mname(c.defFacadeMat), back:mname(c.carcMat) }, edge:{ carc:'', facade:'' }, cnc:(function () { var o2 = cncFor(type);
        if (c.hasBack === false) o2.backs = ['none']; else if (c.backType === 'hdf' || !c.backType) o2.backs = ['hdf']; else o2.backs = ['solid']; return o2; })(),
      sections:(c.sections || []).map(function (s) { var o = {}; ['kind', 'col', 'fill', 'height', 'nDrawers', 'hw', 'rail', 'nDoors', 'hinge', 'doorSplit', 'hingeSide', 'shelves', 'shelfAdj', 'shelfMode', 'shelfPos', 'innerDrawers'].forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; }); return o; }) };
    return cab;
  }) };
  /* the offer's extra boards (boards: note, L, W, qty, mat, lamL / lamW edges): side boards wait to be set at a cabinet in Baldai (＋ Left / Right), the rest are extra parts */
  if (out.cabinets.length) (d.boards || []).forEach(function (b) {
    var L0 = num(b.L), W0 = num(b.W), q = Math.max(0, Math.round(num(b.qty) || 0)); if (!(L0 > 0 && W0 > 0 && q > 0)) return;
    var side = /šon|son|side/i.test(b.note || ''), nl = Math.round(num(b.lamL) || 0), nw = Math.round(num(b.lamW) || 0);
    out.cabinets[0].extras = out.cabinets[0].extras || [];
    out.cabinets[0].extras.push(Object.assign({ name:String(b.note || '').trim() || t(side ? 'exSide' : 'exAdd'), L:L0, W:W0, T:18, qty:q, mat:mname(b.mat), e1:nl >= 1, e2:nl >= 2, e3:nw >= 1, e4:nw >= 2 }, side ? { kind:'side', side:'' } : {}));
  });
  return out;
}

/* ----------------------------------------------------------------- downloads */
function csvOf(pj) {
  var q = function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var rows = [['Nr', 'Part', 'Detale', 'Spintele', 'Medziaga', 'Ilgis', 'Plotis', 'Storis', 'Kiekis', 'Krastai', 'Krasto medziaga', '1OP', '2OP']];
  pj.parts.forEach(function (p, i) { var r1 = function (v) { return E.num(Math.round(v * 10) / 10); }; rows.push([i + 1, p.name, p.short, p.cab, p.mat, r1(p.L), r1(p.W), r1(p.T), p.qty, X.edgeText(p.eb), [p.eb.eb1, p.eb.eb2, p.eb.eb3, p.eb.eb4].filter(function (x, k, a) { return x && a.indexOf(x) === k; }).join(', '), p.op1, p.op2]); });
  return '﻿' + rows.map(function (r) { return r.map(q).join(';'); }).join('\r\n') + '\r\n';
}
function plainXlsm(pj) { return Z.zip(Z.fromEntries(X.workbookEntries(X.sheets(pj)))); }
/* ReportLists exactly as DB_PartList v20 writes it (report.js on the built-in or the user's template): .xlsx, no macros */
function xlsmBytes(pj) {
  var b64 = S.tplB64 || window.DB_REPORT_TEMPLATE_B64;
  if (!window.DBReport || !window.JSZip || !b64) { toast(t('rptFallback'), true); return Promise.resolve(plainXlsm(pj)); }
  return window.DBReport.buildReport(b64ToBytes(b64), X.reportInput(pj), { version:'v20-kurejas-' + VERSION, xlsx:true })
    .catch(function (e) { console.error(e); toast(t('rptFallback'), true); return plainXlsm(pj); });
}
function zipAll(pj) {
  return xlsmBytes(pj).then(function (xl) {
    var list = []; try { list = DR ? drwSheets('all', 'A3') : []; } catch (e) { list = []; }
    return (list.length ? drawingsPdf(list, 'A3').catch(function () { return null; }) : Promise.resolve(null)).then(function (pdf) { return zipFiles(pj, xl, pdf); });
  });
}
function zipFiles(pj, xl, pdf) {
  var base = pj.project, files = [];
  pj.files.forEach(function (f) { files.push({ name:base + '_XXL/' + f.name, data:f.text }); });
  files.push({ name:base + '_ReportLists_to_Excel.xlsx', data:xl });
  files.push({ name:base + '_detales.csv', data:csvOf(pj) });
  if (pdf) files.push({ name:base + '_brezinai.pdf', data:pdf });
  var pjCopy = clone(S.proj); if (!S.admin) delete pjCopy.pricing;   // prices stay with the admin
  files.push({ name:base + '_projektas.json', data:JSON.stringify(pjCopy, null, 1) });
  if (pj.warnings.length) files.push({ name:base + '_pastabos.txt', data:pj.warnings.map(wTxt).join('\r\n') + '\r\n' });
  return Z.zip(files);
}
function download(kind) {
  var pj = buildProjectAll(), base = pj.project, name, data;
  if (kind === 'zip' || kind === 'xlsm') {
    if (S.busy) { toast(t('building')); return; }   // one at a time: a second click does not start a second ZIP
    S.busy = true; toast(t('building'));
    (kind === 'zip' ? zipAll(pj) : xlsmBytes(pj)).then(function (u) { S.busy = false; saveFile(kind === 'zip' ? base + '_CNC.zip' : base + '_ReportLists_to_Excel.xlsx', u); }, function (er) { S.busy = false; toast(String(er && er.message || er), true); });
    return;
  }
  if (kind === 'csv') { name = base + '_detales.csv'; data = csvOf(pj); }
  else { name = base + '_projektas.json'; data = JSON.stringify(S.proj, null, 1); }
  saveFile(name, data);
}
/* separate .XXL files (no ZIP): one download each, spaced so the browser lets them all through */
function saveProgs(names) {
  var pj = buildProjectAll(), map = {}; pj.files.forEach(function (f) { map[f.name] = f.text; });
  names = names.filter(function (n) { return map[n] != null; });
  if (!names.length) { toast(t('noProg'), true); return; }
  if (names.length > 1) toast(t('xxlSaving').replace('{n}', names.length));
  names.forEach(function (n, i) { setTimeout(function () { saveFile(n, map[n], 'application/octet-stream'); }, i * (IN_ARTIFACT ? 450 : 300)); });
}
function saveFile(name, data, type) {
  var blob = data instanceof Uint8Array ? new Blob([data]) : new Blob([data], { type:type || 'text/plain;charset=utf-8' });
  if (IN_ARTIFACT) {
    window.claude.use('downloads').then(function (dl) {
      if (!dl) { toast(t('dlFail') + 'unavailable', true); return; }
      return dl.save({ filename:name, data:blob }).catch(function (er) { toast(er && er.code === 'declined' ? t('dlDeclined') : t('dlFail') + (er && er.code || ''), er && er.code !== 'declined'); });
    });
    return;
  }
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

document.documentElement.lang = S.lang;
render();
/* Back button: home ⇄ project, tabs, the cabinet being edited, the type picker, an open drawing (hub/shared/back.js) */
(window.HubBackQ = window.HubBackQ || []).push(function (B) {
  B.view({
    get: function () { return S.home || !S.proj ? { h: 1 } : { p: S.proj.id, t: S.tab, s: S.tab === 'cab' ? S.sel : 0, k: !!S.picking, d: S.tab === 'drw' && S.drwOpen != null ? S.drwOpen : null }; },
    set: function (v) {
      if (!v) return;
      if (v.h) { if (S.proj) { clearTimeout(libTimer); libSave(); } S.home = true; S.confirm = null; }
      else {
        if (!S.proj || S.proj.id !== v.p) {
          var rec = lib().filter(function (r) { return r.id === v.p; })[0]; if (!rec) return;
          if (S.proj) { clearTimeout(libTimer); libSave(); VER.flush(); }
          openProject(rec.data);
        }
        S.home = false; S.tab = v.t || 'cab'; S.sel = v.s || 0; S.picking = !!v.k; S.drwOpen = v.d; S.confirm = null; S.iso = null;
      }
      render(); window.scrollTo(0, 0);
    }
  });
  B.layer('.iso3d.full,.av.full,.rr-ov');
});
window.__dbk = { openProject:openProject, uid:uid, saveNow:function () { save(); }, libSaveNow:function () { clearTimeout(libTimer); libSave(); }, S:S, render:render, nestPlan:nestPlan, VER:VER, dropMat:dropMat, store:store, lib:lib, libSet:libSet, libRec:libRec, clib:clib, defSettings:defSettings, applyRules:applyRules, toast:toast, newProject:newProject, openProject:openProject, save:save, priceCabinet:priceCabinet, buildProjectAll:buildProjectAll, zipAll:zipAll, xlsmBytes:xlsmBytes, csvOf:csvOf, fromOffer:fromOffer, normCab:normCab, PRESETS:PRESETS, fromPreset:fromPreset };
})();

