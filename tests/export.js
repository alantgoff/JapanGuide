/* The plan out of the page: text for the clipboard, and an .ics calendar file. The
   calendar is checked against RFC 5545 the way a strict importer would read it — CRLF,
   75-octet lines folded without splitting a character, escaped text, a time zone, and
   event ids that stay the same when the dates move so a re-import updates rather than
   duplicates. */
const { suite } = require('./lib');
const fs = require('fs');

suite('export', async t => {
  const J = JSON.stringify;
  const NAMES = ['Senso-ji', 'Shinjuku Gyoen', 'Omoide Yokocho', 'Fushimi Inari Taisha', 'Kiyomizu-dera', 'Todai-ji'];
  const lay = (p, extra = '') => p.ev(`trip=${J(NAMES)}.map(n=>P.find(q=>q.name===n).id);dayBreaks=[3,5];plan=freshPlan();${extra}afterTripEdit();0`);
  const p = await t.open();
  await p.evaluate(() => { window.__clip = null; navigator.clipboard.writeText = s => { window.__clip = s; return Promise.resolve(); }; });

  t.section('1. copy as text');
  await lay(p, "plan.start='2026-10-05';");
  await p.ev('plannerSheet()');
  await p.click('#pcopy');
  await p.waitForTimeout(50);
  const txt = await p.evaluate(() => window.__clip);
  const want = await p.ev('planText()');
  t.ok(txt === want, 'the clipboard gets the plan');
  const lines = txt.split('\n');
  t.ok(lines[0] === 'Japan Survey — itinerary' && lines[1] === '5–7 Oct 2026 · standard pace', 'headed with the guide and its dates', lines.slice(0, 2));
  t.ok(lines.includes('Day 1 · Mon 5 Oct · Tokyo · 09:00–18:15') && lines.includes('09:00–10:00  Senso-ji 浅草寺'), 'each day, then each stop with its times', lines.slice(3, 7));
  t.ok(lines.includes('             ! Closed on Mondays') && lines.includes('             ↓ 3h 10 Shinkansen'), 'with its warnings and journeys', lines);
  t.ok(await p.ev(`document.getElementById('pcopy').textContent`) === 'Copied', 'and the button says so');
  await p.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('denied')); });
  await p.waitForTimeout(1900);
  await p.click('#pcopy');
  await p.waitForTimeout(50);
  const fb = await p.evaluate(() => ({ shown: !document.getElementById('ptext').hidden, sel: String(getSelection()),
    btn: document.getElementById('pcopy').textContent }));
  t.ok(fb.shown && fb.sel.trim() === want.trim() && /^Selected — press (⌘C|Ctrl\+C)$/.test(fb.btn),
       'when the clipboard is refused the text is shown, selected, ready to copy', { shown: fb.shown, btn: fb.btn });
  await p.evaluate(() => { navigator.clipboard.writeText = s => { window.__clip = s; return Promise.resolve(); }; });
  await p.ev('shareSheet()');
  await p.click('#copylink');
  await p.waitForTimeout(50);
  t.ok(await p.evaluate(() => window.__clip) === await p.ev('shareLink()') && await p.ev(`document.getElementById('copylink').textContent`) === 'Copied',
       'the share sheet copies its link the same way');
  await p.ev('plannerSheet()');
  await p.ev(`plan.start=null;drawPlanDays()`);
  t.ok(!/\bMon\b/.test(await p.ev('planText()')) && /Day 1 · Tokyo · 09:00/.test(await p.ev('planText()')), 'without a date the days are numbered, not dated');

  t.section('2. the calendar file');
  t.ok(await p.ev(`document.getElementById('pics').disabled`), 'no calendar until the trip has a date');
  await p.fill('#pstart', '2026-10-05');
  t.ok(!(await p.ev(`document.getElementById('pics').disabled`)), 'then there is');
  const grab = async () => {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#pics')]);
    return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
  };
  let f = await grab();
  t.ok(f.name === 'japan-survey-2026-10-05.ics', 'it downloads, named for the guide and the date', f.name);
  const raw = f.buf.toString('utf8');
  const phys = [];
  { let a = 0; for (let i = 0; i < f.buf.length - 1; i++) if (f.buf[i] === 13 && f.buf[i + 1] === 10) { phys.push(f.buf.slice(a, i)); a = i + 2; i++; } }
  t.ok(!/[^\r]\n/.test(raw) && raw.endsWith('\r\n'), 'every line ends CRLF');
  const dec = new TextDecoder('utf-8', { fatal: true });
  let long = [], split = 0;
  for (const b of phys) { if (b.length > 75) long.push(b.length); try { dec.decode(b); } catch (e) { split++; } }
  t.ok(long.length === 0, 'no line is over 75 octets', long);
  t.ok(split === 0, 'and no fold splits a character', split);
  const un = raw.replace(/\r\n /g, '').split('\r\n').filter(Boolean);
  const bal = {}; un.forEach(l => { const m = /^(BEGIN|END):(\w+)/.exec(l); if (m) bal[m[2]] = (bal[m[2]] || 0) + (m[1] === 'BEGIN' ? 1 : -1); });
  t.ok(Object.values(bal).every(v => v === 0) && un[0] === 'BEGIN:VCALENDAR' && un.includes('TZID:Asia/Tokyo'), 'every BEGIN has its END, with the Tokyo time zone', bal);
  const events = []; let cur = null;
  un.forEach(l => { if (l === 'BEGIN:VEVENT') cur = {}; else if (l === 'END:VEVENT') { events.push(cur); cur = null; } else if (cur) { const i = l.search(/[:;]/); cur[l.slice(0, i)] = l.slice(l.indexOf(':') + 1); } });
  const rails = await p.ev(`schedule().reduce((n,d)=>n+d.entries.filter(e=>e.leg&&e.leg.mode==='rail'&&e.leg.min>=30).length,0)`);
  t.ok(events.length === NAMES.length + rails && rails === 2, 'one event per stop, one per long train', [events.length, rails]);
  t.ok(events.every(e => e.UID && e.DTSTAMP && /^\d{8}T\d{6}Z$/.test(e.DTSTAMP) && e.DTSTART && e.DTEND && e.SUMMARY), 'each with an id, a stamp, a start, an end and a summary');
  const sj = events.find(e => e.SUMMARY === 'Senso-ji');
  t.ok(sj.DTSTART === '20261005T090000' && /^Senso-ji\\, 浅草寺$/.test(sj.LOCATION) && /^35\.\d+;139\.\d+$/.test(sj.GEO), 'at the right local time and place', sj);
  const tr = events.find(e => /^Train to Kyoto/.test(e.SUMMARY));
  t.ok(tr && tr.DTSTART === '20261006T090000' && /Shinkansen/.test(tr.SUMMARY), 'the Shinkansen to Kyoto is on the calendar when it leaves', tr);
  t.ok(/^! Closed on Mondays\\n/.test(events.find(e => e.SUMMARY === 'Shinjuku Gyoen').DESCRIPTION), 'a warning leads the description');
  const key = await p.ev('plan.key');
  t.ok(/^[a-z0-9]{6,24}$/.test(key) && JSON.parse(await p.evaluate(() => localStorage.getItem('japan-guide-v1'))).plan.key === key, 'the calendar key is made once and saved', key);

  t.section('3. moving the dates updates the same events');
  const uids = events.map(e => e.UID).sort();
  t.ok(new Set(uids).size === uids.length, 'every id is different');
  await p.fill('#pstart', '2026-11-16');
  f = await grab();
  const ev2 = f.buf.toString('utf8').replace(/\r\n /g, '').split('\r\n').filter(l => /^(UID|DTSTART)/.test(l));
  t.ok(J(ev2.filter(l => /^UID/.test(l)).map(l => l.slice(4)).sort()) === J(uids), 'a new date keeps every id', ev2.slice(0, 2));
  t.ok(ev2.some(l => /DTSTART;TZID=Asia\/Tokyo:20261116T090000/.test(l)), 'while the times move to the new dates');

  t.section('4. text that needs escaping, and a night that runs past midnight');
  await p.ev(`USER=[{id:'utest',name:'a,b;c\\\\d',ja:'',cat:'eat',note:'line one\\nline two — 抹茶'.repeat(4),lat:35.69,lng:139.70,region:'tokyo'}];
    rebuildPlaces();trip=['utest',P.find(q=>q.name==='Omoide Yokocho').id];dayBreaks=[];plan.start='2026-10-05';plan.dayStart='09:00';
    plan.stops={};plan.stops[trip[1]]={at:'23:30',dur:90};afterTripEdit();drawPlanDays();0`);
  f = await grab();
  const u2 = f.buf.toString('utf8').replace(/\r\n /g, '').split('\r\n');
  const mine = u2.slice(u2.findIndex(l => l.startsWith('UID:') && l.includes('-utest@')));
  t.ok(mine.includes('SUMMARY:a\\,b\\;c\\\\d'), 'commas, semicolons and backslashes are escaped', mine.find(l => /^SUMMARY/.test(l)));
  const desc = mine.find(l => /^DESCRIPTION/.test(l));
  t.ok(/line one\\nline two — 抹茶line one/.test(desc) && !/\r|\n/.test(desc), 'a newline in a note becomes \\n', desc.slice(0, 60));
  const late = u2.slice(u2.findIndex(l => /-b\d+@/.test(l) && l.startsWith('UID') && !l.includes('-go-')));
  t.ok(late.includes('DTSTART;TZID=Asia/Tokyo:20261005T233000') && late.includes('DTEND;TZID=Asia/Tokyo:20261006T010000'),
       'a night out that ends after midnight ends on the next date', late.filter(l => /^DT(START|END)/.test(l)));
  t.ok(f.buf.slice(0, 15).toString() === 'BEGIN:VCALENDAR', 'with no byte-order mark in front');
});
