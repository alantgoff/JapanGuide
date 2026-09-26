/* Shared suite runner. Each suite starts its own server on a free port and its own
   browser, so a suite can be run alone while iterating and suites never collide. Every
   page opens in a fresh browser context, so localStorage starts empty unless a test
   seeds it. Set CHROME_PATH to use a particular Chromium build. */
const { chromium } = require('playwright');
const serve = require('./serve');

function launchOpts() {
  const o = {};
  if (process.env.CHROME_PATH) o.executablePath = process.env.CHROME_PATH;
  return o;
}

async function suite(name, fn) {
  let pass = 0, fail = 0;
  const errs = [];
  const srv = await serve.start(0);
  const browser = await chromium.launch(launchOpts());

  const t = {
    url: srv.url, browser, serve, errs,
    section(title) { console.log('\n' + title); },
    ok(cond, label, detail) {
      if (cond) { pass++; console.log('  ok   ' + label); }
      else {
        fail++;
        const d = detail === undefined ? '' : '   [' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) + ']';
        console.log('  FAIL ' + label + d);
      }
      return !!cond;
    },
    /* A page on the served app with the hook ready. opts: viewport, dpr, tz (IANA zone),
       hash (e.g. '#g=…'), storage (object seeded into localStorage before load),
       settle (ms to let the first frames draw). page.ev(src) evals inside the app. */
    async open(opts = {}) {
      const ctx = await browser.newContext({
        viewport: opts.viewport || { width: 1440, height: 900 },
        deviceScaleFactor: opts.dpr || 1,
        timezoneId: opts.tz,
        acceptDownloads: true,
      });
      if (opts.storage) {
        await ctx.addInitScript(s => {
          if (sessionStorage.getItem('__seeded')) return;
          for (const k in s) localStorage.setItem(k, s[k]);
          sessionStorage.setItem('__seeded', '1');
        }, opts.storage);
      }
      const page = await ctx.newPage();
      page.on('pageerror', e => errs.push(name + ': ' + e.message));
      await page.goto(srv.url + (opts.hash || ''), { waitUntil: 'load' });
      await page.waitForFunction(() => window.__jg && window.__jg.ev('P.length') > 0);
      if (opts.settle !== 0) await page.waitForTimeout(opts.settle || 500);
      page.ev = src => page.evaluate(s => window.__jg.ev(s), src);
      return page;
    },
  };

  let crashed = null;
  try { await fn(t); } catch (e) { crashed = e; }
  await browser.close();
  await srv.close();
  if (crashed) { fail++; console.log('\nCRASHED: ' + (crashed.stack || crashed)); }
  console.log('\n' + (errs.length ? 'PAGE ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no page errors'));
  console.log(name + ': ' + pass + ' passed, ' + fail + ' failed');
  process.exitCode = (fail || errs.length) ? 1 : 0;
}

/* Fraction of pixels a canvas has drawn on (alpha > 0), measured inside the page. */
const INK = `(function(id){var c=document.getElementById(id),g=c.getContext('2d'),
  d=g.getImageData(0,0,c.width,c.height).data,n=0;for(var i=3;i<d.length;i+=16)if(d[i])n++;
  return n/(d.length/16)})`;

module.exports = { suite, launchOpts, serve, INK };
