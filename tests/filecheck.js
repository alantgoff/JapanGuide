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
});
