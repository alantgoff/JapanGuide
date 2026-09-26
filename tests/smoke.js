/* The map still draws and the itinerary still behaves the way it did before the planner:
   add, split into days, reorder across a break, remove with the breaks sliding back, and
   persist across a reload. These pin the existing behaviour so the planner's refactors of
   the same functions cannot quietly change it. */
const { suite, INK } = require('./lib');

suite('smoke', async t => {
  const p = await t.open();
  const id = n => p.ev('P.find(q=>q.name===' + JSON.stringify(n) + ').id');

  t.section('1. the map draws');
  const m = await p.ev('({places:P.length, marks:marks.length})');
  t.ok(m.places === 108, 'all 108 curated places load', m.places);
  t.ok(m.marks > 0, 'marks are drawn', m.marks);
  const ink = await p.evaluate(INK + '("base")');
  t.ok(ink > 0.005 && ink < 0.6, 'the point cloud has ink on the base canvas', ink.toFixed(3));

  t.section('2. a place card adds itself to the trip');
  const kin = await id('Kinkaku-ji');
  await p.ev('select(' + JSON.stringify(kin) + ',false)');
  await p.waitForTimeout(150);
  t.ok(await p.evaluate(() => document.getElementById('detail').classList.contains('open')), 'the card opens');
  await p.click('#addbtn');
  t.ok((await p.ev('trip.slice()')).join() === kin, 'Add to trip puts it on the itinerary');
  t.ok(/In trip/.test(await p.textContent('#addbtn')), 'and the button says so');

  t.section('3. days, reordering and removal');
  const names = ['Ryoan-ji', 'Nijo Castle', 'Nishiki Market'];
  for (const n of names) await p.ev('toggleTrip(' + JSON.stringify(await id(n)) + ')');
  t.ok(await p.evaluate(() => document.querySelectorAll('#triplist .titem').length) === 4, 'four stops listed');
  await p.ev('toggleDay(trip[2])');
  const d1 = await p.ev('({days:tripDays().length, breaks:dayBreaks.slice(), heads:document.querySelectorAll("#triplist .tgroup").length})');
  t.ok(d1.days === 2 && d1.breaks.join() === '2' && d1.heads === 2, 'splitting makes two days with two headings', d1);
  // moving the day-two opener up puts it in day one; the break stays at position 2
  const opener = await p.ev('trip[2]');
  await p.ev('moveTrip(trip[2],-1)');
  const d2 = await p.ev('({pos:trip.indexOf(' + JSON.stringify(opener) + '), breaks:dayBreaks.slice()})');
  t.ok(d2.pos === 1 && d2.breaks.join() === '2', 'moving a stop up across the break moves it into the day before', d2);
  // removing the stop that opens day two slides the break onto the next survivor
  await p.ev('toggleTrip(trip[2])');
  const d3 = await p.ev('({n:trip.length, breaks:dayBreaks.slice()})');
  t.ok(d3.n === 3 && d3.breaks.join() === '2', 'removing a day opener keeps the day, opened by the next stop', d3);
  await p.ev('toggleTrip(trip[2])');
  const d4 = await p.ev('({n:trip.length, breaks:dayBreaks.slice()})');
  t.ok(d4.n === 2 && d4.breaks.length === 0, 'removing the last stop of the last day drops its break', d4);
  // drag-and-drop's move-to-position
  for (const n of ['Gion', 'Kiyomizu-dera']) await p.ev('toggleTrip(' + JSON.stringify(await id(n)) + ')');
  const before = await p.ev('trip.slice()');
  await p.ev('moveTripTo(0,3)');
  const after = await p.ev('trip.slice()');
  t.ok(after[2] === before[0], 'a stop dropped below the third lands third', after);
  t.ok(after.slice().sort().join() === before.slice().sort().join(), 'nothing lost or duplicated');

  t.section('4. it survives a reload');
  const saved = await p.ev('trip.slice()');
  await p.ev('toggleDay(trip[1])');
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => window.__jg && window.__jg.ev('P.length') > 0);
  const back = await p.ev('({trip:trip.slice(), breaks:dayBreaks.slice()})');
  t.ok(back.trip.join() === saved.join() && back.breaks.join() === '1', 'the trip and its days come back', back);

  t.section('5. the guided tour still steps');
  await p.ev('closeDetail()');
  await p.click('#nnext');
  await p.waitForTimeout(300);
  t.ok(!!(await p.ev('sel')), '› opens a place');

  t.section('6. the washi is flat — no screen-sized blob in the paper');
  const q = await t.open({ viewport: { width: 1200, height: 800 } });
  await q.evaluate(() => {
    const stage = document.getElementById('stage'), paper = document.getElementById('paper');
    for (const el of document.body.children) if (el !== stage) el.style.display = 'none';
    for (const el of stage.children) if (el !== paper) el.style.display = 'none';
    paper.style.mixBlendMode = 'normal'; paper.style.opacity = '1';
  });
  await q.waitForTimeout(500);
  const png = (await q.screenshot()).toString('base64');
  const spread = await q.evaluate(async src => {
    const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + src; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, GX = 24, GY = 16;
    const bw = Math.floor(c.width / GX), bh = Math.floor(c.height / GY), means = [];
    for (let by = 0; by < GY; by++) for (let bx = 0; bx < GX; bx++) {
      let s = 0, n = 0;
      for (let y = by * bh; y < (by + 1) * bh; y += 2) for (let x = bx * bw; x < (bx + 1) * bw; x += 2) {
        const i = (y * c.width + x) * 4; s += d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114; n++;
      }
      means.push(s / n);
    }
    means.sort((a, b) => a - b);
    return means[means.length - 1] - means[0];
  }, png);
  t.ok(spread < 20, 'block-mean luminance spread is small', spread.toFixed(1) + ' (the old fold dent measured ~80)');
});
