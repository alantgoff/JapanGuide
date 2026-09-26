/* The planner sheet: every control edits the plan, saves it, updates the panel behind and
   redraws the days — keeping the scroll position and keeping focus on the same control of
   the same stop. A time field is never redrawn while it is still being typed in. */
const { suite } = require('./lib');

suite('sheet', async t => {
  const KY = ['Kinkaku-ji', 'Ryoan-ji', 'Nijo Castle', 'Nishiki Market', 'Gion', 'Kiyomizu-dera'];
  const J = JSON.stringify;
  const lay = (p, extra = '') => p.ev(`trip=${J(KY)}.map(n=>P.find(q=>q.name===n).id);dayBreaks=[3];plan=freshPlan();${extra}
    afterTripEdit();document.getElementById('trip').classList.add('open');0`);
  const id = (p, n) => p.ev(`P.find(q=>q.name===${J(n)}).id`);
  const stored = p => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('japan-guide-v1')) } catch (e) { return null } });
  const p = await t.open();

  t.section('1. opening it');
  await p.ev('trip=[];dayBreaks=[];plan=freshPlan();afterTripEdit()');
  await p.click('#tripplan');
  const empty = await p.evaluate(() => ({ open: !document.getElementById('sheet').hidden,
    label: (document.getElementById(document.getElementById('sheet').getAttribute('aria-labelledby')) || {}).textContent,
    empty: !!document.querySelector('#pdays .emptynote') }));
  t.ok(empty.open && empty.label === 'Your days', 'Plan opens the sheet, and the dialog is labelled by its title', empty);
  t.ok(empty.empty, 'with nothing in the trip it says what to do first');
  await p.keyboard.press('Escape');
  await p.ev('tipsSheet()');
  const tl = await p.evaluate(() => (document.getElementById('sheettitle') || {}).textContent);
  t.ok(tl === 'Things worth knowing', 'every sheet now has the title its dialog points at', tl);
  await p.keyboard.press('Escape');

  t.section('2. the trip’s settings');
  await lay(p);
  await p.click('#tripplan');
  await p.fill('#pstart', '2026-10-05');
  let r = await p.ev(`({start:plan.start,n:document.getElementById('tripn').textContent,day:document.querySelector('.pday h3').textContent})`);
  t.ok(r.start === '2026-10-05' && /5–6 Oct/.test(r.n) && /Mon 5 Oct/.test(r.day), 'a start date dates the days here and in the panel', r);
  t.ok((await stored(p)).plan.start === '2026-10-05', 'and is saved');
  await p.fill('#pdstart', '08:00');
  r = await p.ev(`[plan.dayStart,document.querySelector('.pdsum').textContent]`);
  t.ok(r[0] === '08:00' && /^08:00–/.test(r[1]), 'days start when you say', r);
  await p.fill('#pdstart', '');
  t.ok(await p.ev('plan.dayStart') === '08:00', 'an emptied time field changes nothing');
  await p.click('[data-pace="packed"]');
  r = await p.evaluate(() => ({ pressed: [...document.querySelectorAll('[data-pace]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.pace),
    stay: document.querySelector('.pstay .mono').textContent }));
  t.ok(r.pressed.join() === 'packed' && r.stay === '35 min', 'pace is one choice of three, and it shortens the suggested stays', r);
  await p.fill('#pstart', '');
  t.ok(await p.ev('plan.start') === null, 'clearing the date takes the trip back to undated');
  await p.fill('#pstart', '2026-10-05');

  t.section('3. a day’s own start');
  const ds1 = '[data-ds="3"]';
  await p.fill(ds1, '10:30');
  t.ok(await p.ev(`plan.dayStarts[3]`) === '10:30', 'day two can leave at its own time');
  await p.ev('document.getElementById("pdone").focus()');
  await p.waitForTimeout(50);
  r = await p.ev(`document.querySelectorAll('.pdsum')[1].textContent`);
  t.ok(/^10:30–/.test(r), 'and the day is redrawn once you leave the field', r);
  await p.fill(ds1, '08:00');
  t.ok(await p.ev(`!(3 in plan.dayStarts)`), 'setting it back to the usual time drops its own');

  t.section('4. how long at each stop');
  const kin = await id(p, 'Kinkaku-ji');
  await p.click('#pdone').catch(() => {});
  await p.ev(`plan.pace='standard';plannerSheet()`);
  await p.click(`[data-k="d+:${kin}"]`);
  r = await p.ev(`[plan.stops[${J(kin)}].dur,document.activeElement.dataset.k,document.querySelector('.pstay .mono').className]`);
  t.ok(r[0] === 60 && r[1] === 'd+:' + kin && /\bset\b/.test(r[2]), '+ goes to the next quarter hour, and focus stays on it', r);
  await p.click(`[data-k="d-:${kin}"]`);
  await p.click(`[data-k="d-:${kin}"]`);
  t.ok(await p.ev(`plan.stops[${J(kin)}].dur`) === 30, '− comes back down by quarter hours');
  await p.click(`[data-k="da:${kin}"]`);
  r = await p.ev(`[${J(kin)} in plan.stops,document.activeElement.dataset.k]`);
  t.ok(r[0] === false && r[1] === 'd+:' + kin, '“Suggested” forgets your number, and focus lands on + rather than nowhere', r);

  t.section('5. a fixed time is not redrawn under your cursor');
  const gion = await id(p, 'Gion');
  const pin = `[data-k="pin:${gion}"]`;
  await p.ev(`document.querySelector('${pin}').dataset.probe='same'`);
  await p.fill(pin, '19:00');
  r = await p.ev(`[plan.stops[${J(gion)}].at,document.querySelector('${pin}').dataset.probe,planStale]`);
  t.ok(r[0] === '19:00' && r[1] === 'same' && r[2] === true, 'the time is kept at once, but the field stays the one being typed in', r);
  t.ok(/19:00/.test(await p.ev(`document.querySelectorAll('#triplist .leg')[4].textContent`)), 'the panel behind has it already');
  await p.ev(`document.getElementById('pstart').focus()`);
  await p.waitForTimeout(50);
  r = await p.ev(`[document.querySelector('${pin}').dataset.probe,document.querySelector('${pin}').value,!!document.querySelector('[data-k="pu:${gion}"]'),document.activeElement.id]`);
  t.ok(r[0] === undefined && r[1] === '19:00' && r[2] && r[3] === 'pstart', 'leaving it redraws the days, and focus goes where you sent it', r);
  await p.click(`[data-k="pu:${gion}"]`);
  r = await p.ev(`[${J(gion)} in plan.stops,document.activeElement.dataset.k]`);
  t.ok(r[0] === false && r[1] === 'pin:' + gion, 'Clear drops it and hands focus to the field', r);

  t.section('6. order and days, with the scroll and focus kept');
  const q = await t.open({ viewport: { width: 1000, height: 560 } });
  await lay(q, "plan.start='2026-10-05';");
  await q.click('#tripplan');
  const kiy = await id(q, 'Kiyomizu-dera');
  await q.ev(`document.querySelector('[data-k="up:${kiy}"]').scrollIntoView();0`);
  const before = await q.ev('sheetEl.scrollTop');
  await q.click(`[data-k="up:${kiy}"]`);
  r = await q.ev(`[trip.indexOf(${J(kiy)}),document.activeElement.dataset.k,sheetEl.scrollTop]`);
  t.ok(r[0] === 4 && r[1] === 'up:' + kiy && Math.abs(r[2] - before) < 2 && before > 0, '↑ moves the stop; focus goes with it and the sheet does not jump', [before, r]);
  await q.click(`[data-k="dy:${kiy}"]`);
  r = await q.ev(`[dayBreaks.join(),document.querySelectorAll('.pday').length,document.activeElement.dataset.k]`);
  t.ok(r[0] === '3,4' && r[1] === 3 && r[2] === 'dy:' + kiy, '日 starts a new day there', r);
  const nk = await id(q, 'Kinkaku-ji');
  await q.click(`[data-k="dn:${nk}"]`);
  await q.click(`[data-k="up:${nk}"]`);
  r = await q.ev(`[trip.indexOf(${J(nk)}),document.activeElement.dataset.k]`);
  t.ok(r[0] === 0 && r[1] === 'dn:' + nk, 'back at the top, where ↑ is disabled, focus moves to ↓', r);
  await q.keyboard.press('Escape');
  t.ok(await q.ev('sheetEl.hidden'), 'Escape closes it');
  await q.context().close();

  t.section('7. a phone');
  const m = await t.open({ viewport: { width: 390, height: 844 } });
  await lay(m, "plan.start='2026-10-05';");
  await m.ev('plannerSheet()');
  r = await m.evaluate(() => {
    const s = document.getElementById('sheet'), d = document.getElementById('pdone').getBoundingClientRect();
    return { over: s.scrollWidth - s.clientWidth, page: document.documentElement.scrollWidth - innerWidth,
      fonts: [...s.querySelectorAll('input')].map(i => getComputedStyle(i).fontSize).filter(f => f !== '16px'),
      done: d.bottom <= innerHeight && d.top >= 0, long: s.scrollHeight > s.clientHeight };
  });
  t.ok(r.over <= 0 && r.page <= 0, 'nothing runs off the side', r);
  t.ok(r.fonts.length === 0, 'every field is 16px, so iOS does not zoom when one takes focus', r.fonts);
  t.ok(r.long && r.done, 'a plan longer than the screen still has Done in view', r);
  await m.context().close();

  t.section('8. a shared guide, and someone else’s names');
  const frag = await p.ev(`'g='+b64enc(JSON.stringify({v:1,g:[],p:[['<img src=x onerror=window.__pwn=1>','','eat','',35.66,139.7,'u9','tokyo']],r:['u9',${J(kin)}]}))`);
  const s = await t.open({ hash: '#' + frag });
  await s.keyboard.press('Escape');
  await s.ev('plannerSheet()');
  await s.click('[data-pace="relaxed"]');
  r = await s.evaluate(() => ({ img: !!document.querySelector('#sheet img'), pwn: !!window.__pwn, store: localStorage.getItem('japan-guide-v1'),
    name: document.querySelector('.pname').textContent }));
  t.ok(!r.img && !r.pwn && /^<img/.test(r.name), 'a place’s name is shown as text, never as markup', r);
  t.ok(r.store === null, 'planning a shared guide saves nothing until you keep it', r.store);
  await s.context().close();
});
