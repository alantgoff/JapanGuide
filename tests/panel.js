/* The itinerary panel reads the schedule. Before the trip has a start date it shows how
   each leg is made (a walk, the metro, the train that opens a day in a new city) and no
   times. Once it has one, each day shows its date and hours, each stop when you are there,
   and the one thing most worth knowing, and a day that will not work says so. */
const { suite } = require('./lib');

suite('panel', async t => {
  const TRIP = ['Senso-ji', 'Ueno Park', 'Shinjuku Gyoen', 'Omoide Yokocho',
                'Fushimi Inari Taisha', 'Kiyomizu-dera', 'Gion', 'Nishiki Market', 'Todai-ji', 'Kasuga Taisha'];
  const lay = (p, plan = '') => p.ev(`trip=${JSON.stringify(TRIP)}.map(n=>P.find(q=>q.name===n).id);dayBreaks=[4,8];
    plan=freshPlan();${plan}afterTripEdit();document.getElementById('trip').classList.add('open');0`);
  const read = p => p.evaluate(() => ({
    n: document.getElementById('tripn').textContent,
    days: [...document.querySelectorAll('#triplist .tgroup')].map(g => {
      const s = g.querySelector('.dsum');
      return { head: g.querySelector('.eyebrow').textContent, sum: s.textContent, bad: s.classList.contains('bad'), title: s.title };
    }),
    rows: [...document.querySelectorAll('#triplist .titem')].map(r => {
      const l = r.querySelector('.leg'), w = r.querySelector('.twarn');
      return { name: r.querySelector('.nm').firstChild.textContent, leg: l ? l.textContent : '', legT: l ? l.title : '',
               warn: w ? w.textContent : '', lvl: w ? w.className : '', warnT: w ? w.title : '' };
    }),
  }));
  const row = (v, n) => v.rows.find(r => r.name === n);
  const p = await t.open();

  t.section('1. before there is a date: how each leg is made, and no times');
  await lay(p);
  let v = await read(p);
  t.ok(/^\d+ min walk · [\d.]+ (m|km)$/.test(row(v, 'Omoide Yokocho').leg), 'a walk is timed and measured', row(v, 'Omoide Yokocho').leg);
  t.ok(/^≈\d+ min metro$/.test(row(v, 'Ueno Park').leg), 'a ride across Tokyo is the metro, and marked as an estimate', row(v, 'Ueno Park').leg);
  t.ok(/^\dh( \d+)? Shinkansen$/.test(row(v, 'Fushimi Inari Taisha').leg), 'the first stop in Kyoto opens with the Shinkansen', row(v, 'Fushimi Inari Taisha').leg);
  t.ok(/Kintetsu$/.test(row(v, 'Todai-ji').leg), 'and the first in Nara with the Kintetsu', row(v, 'Todai-ji').leg);
  t.ok(v.rows.every(r => !/\d\d:\d\d/.test(r.leg) && !r.warn), 'no times and no warnings', v.rows.map(r => r.leg + r.warn));
  t.ok(/^\d+ stops · \d+ min walk$/.test(v.days[0].sum) && !v.days.some(d => d.bad), 'each day counts its stops and its walking', v.days.map(d => d.sum));
  t.ok(/ km$/.test(v.n), 'the header still gives the distance', v.n);

  t.section('2. with a start date');
  await lay(p, "plan.start='2026-10-05';");
  v = await read(p);
  t.ok(v.n === '10 stops · 3 days · 5–7 Oct', 'the header gives the dates', v.n);
  t.ok(v.days.map(d => d.sum.split(' · ')[0]).join() === 'Mon 5 Oct,Tue 6 Oct,Wed 7 Oct', 'each day its date', v.days.map(d => d.sum));
  t.ok(/^Mon 5 Oct · 09:00–\d\d:\d\d$/.test(v.days[0].sum), 'and its hours', v.days[0].sum);
  t.ok(row(v, 'Senso-ji').leg === '09:00' && /^\d\d:\d\d · ≈\d+ min metro$/.test(row(v, 'Ueno Park').leg),
       'each stop the time you are there, then how you got there', [row(v, 'Senso-ji').leg, row(v, 'Ueno Park').leg]);
  t.ok(/arriving \d\d:\d\d\. Here \d\d:\d\d–\d\d:\d\d/.test(row(v, 'Ueno Park').legT), 'the full timing is in the title', row(v, 'Ueno Park').legT);
  const sg = row(v, 'Shinjuku Gyoen');
  t.ok(sg.warn === 'Closed on Mondays' && /\bl2\b/.test(sg.lvl), 'Shinjuku Gyoen on a Monday: closed, in vermilion', sg);
  t.ok(v.days[0].bad && /^1 problem with this day/.test(v.days[0].title), 'and day one says it has a problem', v.days[0]);
  t.ok(!v.days[2].bad && /^Fits the day/.test(v.days[2].title), 'a day that works says so', v.days[2]);
  t.ok(!row(v, 'Senso-ji').warn, 'nobody arriving at nine is told they are late for the crowds', row(v, 'Senso-ji').warn);

  t.section('3. the most important warning shows; all of them are in the title');
  await p.ev(`trip=[P.find(q=>q.name==='Sukiyabashi Jiro').id];dayBreaks=[];plan=freshPlan();plan.start='2026-10-04';plan.dayStart='15:00';afterTripEdit()`);
  v = await read(p);
  const j = v.rows[0];
  t.ok(j.warn === 'Closed on Sundays · +2' && j.warnT.split('\n').length === 3 && /Book ahead/.test(j.warnT),
       'a closed door outranks a wait and a booking', j);

  t.section('4. it follows the plan and every edit');
  await lay(p, "plan.start='2026-10-05';plan.dayStarts[4]='10:15';");
  v = await read(p);
  t.ok(/^Tue 6 Oct · 10:15–/.test(v.days[1].sum), 'a day’s own start time', v.days[1].sum);
  await p.ev(`toggleTrip(P.find(q=>q.name==='Shinjuku Gyoen').id)`);
  v = await read(p);
  t.ok(!v.days[0].bad && !v.rows.some(r => r.name === 'Shinjuku Gyoen'), 'removing the closed stop clears the day', v.days[0]);
  t.ok(/^Tue 6 Oct · 10:15–/.test(v.days[1].sum), 'and the next day keeps its start time', v.days[1].sum);
  await lay(p, "plan.start='2026-10-30';");
  v = await read(p);
  t.ok(/30 Oct – 1 Nov$/.test(v.n), 'a trip across the end of a month gives both months', v.n);
  const ch = await p.ev('CHROME=[];renderTrip();CHROME===null');
  t.ok(ch, 'the panel drops the cached chrome, since its height changed');

  t.section('5. nothing spills out of the panel');
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const q = await t.open({ viewport: { width: w, height: h } });
    await lay(q, "plan.start='2026-10-05';");
    // the longest label the rail graph can produce, on a stop with a long name
    await q.ev(`trip.splice(1,0,P.find(q=>q.name==='Todai-ji').id);dayBreaks=[1,5,9];afterTripEdit()`);
    const o = await q.evaluate(() => {
      const l = document.getElementById('triplist'), bad = [];
      document.querySelectorAll('#triplist .leg,#triplist .twarn').forEach(e => {
        const r = e.getBoundingClientRect(), b = e.closest('.tsel').getBoundingClientRect();
        if (r.right > b.right + 1) bad.push(e.textContent);
      });
      return { over: l.scrollWidth - l.clientWidth, bad, long: [...l.querySelectorAll('.leg')].map(e => e.title).find(x => /via/.test(x)) || '' };
    });
    t.ok(o.over <= 0 && o.bad.length === 0, 'at ' + w + 'px every line stays inside its row', o);
    t.ok(/via Kyoto/.test(o.long), 'a long rail route is still there in full in the title', o.long);
    await q.context().close();
  }
});
