/* The plan rides on the trip: per-day start times are keyed by break position, per-stop
   choices by place id. Every way the trip can change shape must carry them along — and
   loading a trip from a link or storage must drop bad ids without shifting the days. */
const { suite } = require('./lib');

suite('state', async t => {
  const p = await t.open();
  const KY = ['Kinkaku-ji', 'Ryoan-ji', 'Nijo Castle', 'Nishiki Market', 'Gion',
              'Kiyomizu-dera', 'Fushimi Inari Taisha', 'Tofuku-ji'];
  const ids = await p.ev(JSON.stringify(KY) + '.map(n=>P.find(q=>q.name===n).id)');
  // three days: [0 1 2] [3 4 5] [6 7], each with its own start time; two stops with settings
  const setup = `trip=${JSON.stringify(ids)}.slice();dayBreaks=[3,6];plan=freshPlan();
    plan.dayStarts={0:'08:00',3:'10:00',6:'11:30'};
    plan.stops[${JSON.stringify(ids[2])}]={dur:30};plan.stops[${JSON.stringify(ids[4])}]={at:'13:00'};
    plan.start='2026-10-05';plan.pace='relaxed';`;
  const snap = () => p.ev('({trip:trip.slice(),breaks:dayBreaks.slice(),ds:Object.assign({},plan.dayStarts),stops:Object.keys(plan.stops).sort()})');
  const name = i => KY[ids.indexOf(i)];

  t.section('1. removing stops');
  await p.ev(setup + 'removeStops(x=>x===trip[1])');
  let s = await snap();
  t.ok(s.breaks.join() === '2,5' && JSON.stringify(s.ds) === '{"0":"08:00","2":"10:00","5":"11:30"}',
       'a middle stop: every later break and its time shift back together', s);

  await p.ev(setup + 'removeStops(x=>x===trip[3])');
  s = await snap();
  t.ok(name(s.trip[3]) === 'Gion' && s.breaks.join() === '3,5' && s.ds['3'] === '10:00' && s.ds['5'] === '11:30',
       'a day’s opener: the day keeps its time, now opened by its next stop', s);

  await p.ev(setup + 'removeStops(x=>[trip[3],trip[4],trip[5]].includes(x))');
  s = await snap();
  t.ok(s.breaks.join() === '3' && JSON.stringify(s.ds) === '{"0":"08:00","3":"11:30"}',
       'a whole day: its time goes with it, the next day keeps its own', s);

  await p.ev(setup + 'removeStops(x=>[trip[0],trip[1],trip[2]].includes(x))');
  s = await snap();
  t.ok(s.breaks.join() === '3' && s.ds['0'] === '10:00' && s.ds['3'] === '11:30',
       'the first day: the old day two becomes day one, with its own time', s);

  await p.ev(setup + 'removeStops(x=>x===trip[2])');
  s = await snap();
  t.ok(s.stops.length === 1 && s.stops[0] === ids[4], 'a stop’s own settings leave with it', s.stops);

  t.section('2. reordering and splitting');
  await p.ev(setup + 'moveTrip(trip[3],-1)');
  s = await snap();
  t.ok(s.breaks.join() === '3,6' && s.ds['3'] === '10:00' && name(s.trip[2]) === 'Nishiki Market',
       'moving a stop across a break leaves the day and its time in place', s);
  t.ok(s.stops.length === 2, 'stop settings follow their stops', s.stops);

  await p.ev(setup + 'toggleDay(trip[3])');
  s = await snap();
  t.ok(s.breaks.join() === '6' && !('3' in s.ds) && s.ds['6'] === '11:30', 'merging a day drops its time only', s);
  await p.ev('toggleDay(trip[3])');
  s = await snap();
  t.ok(s.breaks.join() === '3,6' && !('3' in s.ds), 'splitting again starts the day without a time of its own', s);

  await p.ev(setup + 'plan.dayStarts[5]="12:00";normDays()');
  s = await snap();
  t.ok(!('5' in s.ds), 'a time left on a position that is not a break is pruned', s.ds);

  t.section('3. clearing the trip');
  await p.ev(setup + 'document.getElementById("tripclear").click()');
  const c = await p.ev('({n:trip.length,ds:Object.keys(plan.dayStarts).length,st:Object.keys(plan.stops).length,start:plan.start,pace:plan.pace})');
  t.ok(c.n === 0 && c.ds === 0 && c.st === 0, 'stops and day times go', c);
  t.ok(c.start === '2026-10-05' && c.pace === 'relaxed', 'the trip’s date and pace stay', c);

  t.section('4. a link with a bad id keeps its days on the right stops');
  // Day two should open with Nijo Castle. The unknown id at the front used to shift the
  // break one stop late, and a repeated id was kept as a second stop.
  const frag = await p.ev(`'g='+b64enc(JSON.stringify({v:1,g:[],p:[],
      r:['nope',${JSON.stringify(ids[0])},${JSON.stringify(ids[1])},${JSON.stringify(ids[2])},${JSON.stringify(ids[0])},${JSON.stringify(ids[3])},7],
      d:[3,4]}))`);
  const q = await t.open({ hash: '#' + frag });
  const L = await q.ev('({trip:trip.map(i=>byId[i].name),breaks:dayBreaks.slice(),days:tripDays().map(d=>d.map(i=>byId[trip[i]].name))})');
  t.ok(L.trip.join('|') === 'Kinkaku-ji|Ryoan-ji|Nijo Castle|Nishiki Market', 'unknown and repeated ids are dropped', L.trip);
  t.ok(L.days[1] && L.days[1][0] === 'Nijo Castle', 'day two still opens with the stop it was sent with', L.days);
  t.ok(L.days.length === 3 && L.days[2][0] === 'Nishiki Market', 'and a break that sat on a dropped repeat moves to the next stop', L.days);

  t.section('5. the same for a saved guide');
  const rec = JSON.stringify({ v: 1, places: [], trip: ['nope', ids[0], ids[1], ids[2], ids[3]], days: [3] });
  const r = await t.open({ storage: { 'japan-guide-v1': rec } });
  const R = await r.ev('({days:tripDays().map(d=>d.map(i=>byId[trip[i]].name))})');
  t.ok(R.days.length === 2 && R.days[1][0] === 'Nijo Castle', 'day two opens with Nijo Castle, not one stop late', R.days);
});
