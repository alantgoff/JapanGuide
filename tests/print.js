/* Printed day sheets. They are built only when the browser is about to print and only
   when there is a trip, one page a day, each with a map of that day drawn offscreen by
   the live renderer — which must hand the screen back exactly as it found it. */
const { suite } = require('./lib');

suite('print', async t => {
  const J = JSON.stringify;
  const NAMES = ['Senso-ji', 'Ueno Park', 'Shinjuku Gyoen', 'Omoide Yokocho', 'Fushimi Inari Taisha', 'Kiyomizu-dera',
                 'Gion', 'Nishiki Market', 'Todai-ji', 'Kasuga Taisha'];
  const p = await t.open();
  const fire = ev => p.evaluate(e => window.dispatchEvent(new Event(e)), ev);

  t.section('1. no trip, no day sheets');
  await p.ev('trip=[];dayBreaks=[];afterTripEdit()');
  await fire('beforeprint');
  t.ok(await p.evaluate(() => !document.getElementById('printdays') && !document.body.classList.contains('pdays')), 'printing with an empty trip prints the map, as before');
  await p.emulateMedia({ media: 'print' });
  t.ok(await p.evaluate(() => getComputedStyle(document.getElementById('stage')).display !== 'none'), 'and the map is what the print shows');
  await p.emulateMedia({ media: null });
  await fire('afterprint');

  t.section('2. a page a day');
  await p.ev(`trip=${J(NAMES)}.map(n=>P.find(q=>q.name===n).id);dayBreaks=[4,8];plan=freshPlan();plan.start='2026-10-05';afterTripEdit();0`);
  await p.waitForTimeout(300);
  const SNAPSHOT = `JSON.stringify({V:[V.cx,V.cy,V.s],W:W,H:H,bw:document.getElementById('base').width,sel:sel,
    marks:marks.map(m=>m.p.id+'@'+m.x.toFixed(1)+','+m.y.toFixed(1)).join(),city:CITYBOX.map(b=>b?b.map(v=>v.toFixed(1)).join(','):'').join('|'),
    budgets:[TARGET,TARGET_NEAR,GROUND_FLOOR],snap:SNAP})`;
  // read straight after the event, in the same task: no frame gets to redraw in between
  const [before, after] = await p.ev(`(function(){var b=${SNAPSHOT};window.dispatchEvent(new Event('beforeprint'));return [b,${SNAPSHOT}]})()`);
  const d = await p.evaluate(() => [...document.querySelectorAll('#printdays .prday')].map(s => ({
    head: s.querySelector('h2').textContent, meta: s.querySelector('.prmeta').textContent,
    stops: [...s.querySelectorAll('.prstop h3')].map(h => h.textContent), legs: s.querySelectorAll('.prleg').length,
    cv: (c => c && [c.width, c.height])(s.querySelector('canvas')),
    ink: (c => { const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
      for (let i = 0; i < x.length; i += 16) if (x[i] < 180) n++; return n / (x.length / 16); })(s.querySelector('canvas')),
    notes: s.querySelectorAll('.prnote').length })));
  t.ok(d.length === 3 && await p.evaluate(() => document.body.classList.contains('pdays')), 'three days, three sheets', d.length);
  t.ok(d[0].head === 'Mon 5 Oct — Tokyo 東京' && /^09:00–\d\d:\d\d · 4 stops · \d+ min walking · 1 stop that will not work$/.test(d[0].meta),
       'each headed with its date, city, hours — and its problem', [d[0].head, d[0].meta]);
  t.ok(d[1].stops[0] === '5Fushimi Inari Taisha 伏見稲荷大社' && d[1].legs === 4, 'each stop numbered as on the map, with the journey to it', d[1]);
  t.ok(d.every(x => x.notes >= x.stops.length), 'and the guide’s notes for every stop', d.map(x => x.notes));
  t.ok(d.every(x => x.cv && x.cv[0] === 1360 && x.cv[1] === 800), 'each with its own map, drawn at twice the size it prints', d.map(x => x.cv));
  t.ok(d.every(x => x.ink > 0.01 && x.ink < 0.35), 'each map has ground on it, and is not a wall of ink', d.map(x => x.ink.toFixed(3)));

  t.section('3. the screen is handed back as it was');
  t.ok(after === before, 'the view, the canvases, the markers’ hit boxes and the budgets are unchanged', before === after ? '' : [before.slice(0, 200), after.slice(0, 200)]);
  // the metric cache is keyed on TMFont, so it must name the font the live context has
  const fonts = await p.ev(`(function(){var c=document.createElement('canvas').getContext('2d');c.font=TMFont;
    return [c.font===ox.font,bx===document.getElementById('base').getContext('2d'),ox===document.getElementById('over').getContext('2d')]})()`);
  t.ok(fonts.every(Boolean), 'the renderer draws on the live canvases again, and knows their font', fonts);

  t.section('4. in print, only the day sheets');
  await p.emulateMedia({ media: 'print' });
  const vis = await p.evaluate(() => ({ stage: getComputedStyle(document.getElementById('stage')).display,
    trip: getComputedStyle(document.getElementById('trip')).display, days: getComputedStyle(document.getElementById('printdays')).display }));
  t.ok(vis.stage === 'none' && vis.trip === 'none' && vis.days === 'block', 'the map and the panels are hidden', vis);
  await p.emulateMedia({ media: null });
  t.ok(await p.evaluate(() => getComputedStyle(document.getElementById('printdays')).display === 'none'), 'and on screen the sheets are never seen');
  await fire('afterprint');
  t.ok(await p.evaluate(() => !document.getElementById('printdays') && !document.body.classList.contains('pdays')), 'after printing they are gone');
  const pdf = await p.pdf({ format: 'A4' });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  t.ok(pages === 3, 'the browser’s own print makes one page a day', pages);
  t.ok(await p.evaluate(() => !document.getElementById('printdays')), 'and cleans up after itself');

  t.section('5. the button, and a hidden stage');
  await p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await p.ev('plannerSheet()');
  await p.click('#pprint');
  t.ok(await p.evaluate(() => window.__printed) === 1, 'Print days prints');
  await p.ev('trip=[];dayBreaks=[];afterTripEdit();drawPlanDays()');
  t.ok(await p.ev(`document.getElementById('pprint').disabled`), 'and is disabled with nothing to print');
  await p.keyboard.press('Escape');
  const rz = await p.evaluate(() => { const s = document.getElementById('stage'); s.style.display = 'none';
    const r = window.__jg.ev('resize();[W,H,document.getElementById("base").width]'); s.style.display = ''; return r; });
  t.ok(rz[0] > 0 && rz[1] > 0 && rz[2] > 0, 'a resize while the stage is hidden leaves the canvases alone', rz);
});
