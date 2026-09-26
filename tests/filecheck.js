/* The hard constraint: the guide opens straight from a file and nothing leaves the page.
   No server and no test hook here — this is the file exactly as shipped. Later suites
   add the exports to this check: every export must also be generated locally. */
const { suite } = require('./lib');
const path = require('path');

suite('filecheck', async t => {
  const url = 'file://' + path.join(t.serve.ROOT, 'index.html');
  const ctx = await t.browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const stray = [], errs = [];
  page.on('request', r => {
    const u = r.url();
    if (u.split('#')[0] === url || u.startsWith('data:') || u.startsWith('blob:')) return;
    stray.push(u);
  });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  t.section('1. opens from a file');
  const s = await page.evaluate(() => {
    const ink = id => { const c = document.getElementById(id), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i]) n++; return n / (d.length / 16); };
    return { base: ink('base'), over: ink('over'), title: document.title };
  });
  t.ok(s.base > 0.005, 'the point cloud draws', s.base.toFixed(3));
  t.ok(s.over > 0.0005, 'marks and labels draw', s.over.toFixed(4));
  t.ok(/Japan Survey/.test(s.title), 'the title is set', s.title);

  t.section('2. nothing is fetched');
  t.ok(errs.length === 0, 'no script errors', errs.slice(0, 3));
  t.ok(stray.length === 0, 'no request left the page', stray.slice(0, 5));

  t.section('3. the exports are made here too');
  // a saved trip with a date, then the planner through its buttons, as someone would
  await page.evaluate(() => localStorage.setItem('japan-guide-v1', JSON.stringify({ v: 1, places: [], trip: ['b0', 'b3', 'b14', 'b27'], days: [3],
    plan: { start: '2026-10-05', dayStart: '09:00', pace: 'standard', dayStarts: {}, stops: {} } })));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.click('#tripplan');
  await page.click('#pcopy');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#pics')]);
  const ics = require('fs').readFileSync(await dl.path(), 'utf8');
  t.ok(/^BEGIN:VCALENDAR\r\n/.test(ics) && (ics.match(/BEGIN:VEVENT/g) || []).length === 5, 'the planner opens and the calendar downloads from a file', dl.suggestedFilename());
  await page.waitForTimeout(300);
  t.ok(errs.length === 0 && stray.length === 0, 'still no errors and no requests', { errs: errs.slice(0, 3), stray: stray.slice(0, 5) });
});
