/* The plan is saved with the guide and travels in the share link. Both are read back
   against the trip as it was written, so the positions and ids in the plan still point at
   the right days and stops after bad entries are dropped. A link is someone else's input:
   every field is bounded, and a link or record without a plan loads exactly as before. */
const { suite } = require('./lib');

suite('share', async t => {
  const p = await t.open();
  const KY = ['Kinkaku-ji', 'Ryoan-ji', 'Nijo Castle', 'Nishiki Market', 'Gion', 'Kiyomizu-dera'];
  const ids = await p.ev(JSON.stringify(KY) + '.map(n=>P.find(q=>q.name===n).id)');
  const J = JSON.stringify;
  const setup = `trip=${J(ids)}.slice();dayBreaks=[3];plan=freshPlan();
    plan.start='2026-10-05';plan.dayStart='08:30';plan.pace='relaxed';plan.key='k3y4tr1p';
    plan.dayStarts={0:'08:00',3:'10:15'};
    plan.stops[${J(ids[2])}]={dur:30};plan.stops[${J(ids[4])}]={at:'18:00',dur:120};`;
  const view = `({trip:trip.slice(),breaks:dayBreaks.slice(),start:plan.start,dayStart:plan.dayStart,pace:plan.pace,
    key:plan.key,ds:Object.keys(plan.dayStarts).sort().map(k=>k+'='+plan.dayStarts[k]).join(),
    stops:Object.keys(plan.stops).sort().map(k=>k+':'+(plan.stops[k].dur||'')+'@'+(plan.stops[k].at||'')).join()})`;
  const want = await p.ev(setup + view);
  const same = (a, b) => ['trip', 'breaks', 'start', 'dayStart', 'pace', 'ds', 'stops'].every(k => J(a[k]) === J(b[k]));

  t.section('1. saved with the guide');
  await p.ev(setup + 'saveTrip()');
  const rec = await p.ev(`localStorage.getItem(STORE)`);
  t.ok(JSON.parse(rec).v === 1 && JSON.parse(rec).plan, 'the saved record carries the plan and is still version 1');
  const r = await t.open({ storage: { 'japan-guide-v1': rec } });
  const R = await r.ev(view);
  t.ok(same(R, want) && R.key === 'k3y4tr1p', 'a reload brings back the date, pace, day times and each stop’s choices', { R, want });
  await r.context().close();

  t.section('2. carried in the link');
  const frag = await p.ev(setup + 'shareFragment()');
  const L = await t.open({ hash: '#' + frag });
  const LV = await L.ev(view);
  t.ok(same(LV, want), 'the recipient sees the same schedule', { LV, want });
  t.ok(LV.key === null, 'but not the calendar key, which belongs to the browser that exported', LV.key);
  const sched = await L.ev(`schedule().map(d=>d.date.label+' '+fmtT(d.start)).join()`);
  t.ok(sched === 'Mon 5 Oct 08:00,Tue 6 Oct 10:15', 'and its days fall on the same dates at the same times', sched);
  await L.context().close();

  t.section('3. an unplanned trip sends the link it always did');
  const plain = await p.ev(`trip=${J(ids)}.slice();dayBreaks=[3];plan=freshPlan();[JSON.stringify(packed()),'s' in packed()]`);
  t.ok(plain[1] === false, 'no plan key at all when nothing has been planned', plain[0]);
  const keyed = await p.ev(`plan.key='abcdef12';'s' in packed()`);
  t.ok(keyed === false, 'a calendar key on its own is not a plan worth sending');
  const one = await p.ev(`plan=freshPlan();plan.start='2026-10-05';JSON.stringify(packed().s)`);
  t.ok(one === '{"st":"2026-10-05"}', 'a start date alone sends only the date', one);

  t.section('4. links and records from before the planner');
  const old = await p.ev(`'g='+b64enc(JSON.stringify({v:1,g:[],p:[],r:${J(ids)},d:[3]}))`);
  const O = await t.open({ hash: '#' + old });
  const OV = await O.ev(view);
  t.ok(J(OV.trip) === J(ids) && J(OV.breaks) === '[3]' && OV.start === null && OV.ds === '' && OV.stops === '' && OV.pace === 'standard',
       'an old link opens with its trip and days, and a fresh plan', OV);
  await O.context().close();
  const oldRec = J({ v: 1, places: [], trip: ids, days: [3] });
  const OR = await t.open({ storage: { 'japan-guide-v1': oldRec } });
  const ORV = await OR.ev(view);
  t.ok(J(ORV.trip) === J(ids) && ORV.start === null && ORV.dayStart === '09:00', 'an old saved guide does too', ORV);
  await OR.context().close();

  t.section('5. the plan is read against the trip as sent');
  // A dropped id at the front shifts everything by one: the break at 4 becomes 3, and so
  // must its time. A setting on the dropped id, or on an id not in the trip, goes.
  const shifted = await p.ev(`'g='+b64enc(JSON.stringify({v:1,g:[],p:[],r:['nope',...${J(ids)}],d:[4],
    s:{ds:[[0,'07:45'],[4,'10:30']],m:[[${J(ids[2])},40,''],['nope',50,''],['b99',50,'']]}}))`);
  const S = await t.open({ hash: '#' + shifted });
  const SV = await S.ev(view);
  t.ok(J(SV.breaks) === '[3]' && SV.ds === '0=07:45,3=10:30', 'the second day keeps its time as its break moves back', SV);
  t.ok(SV.stops === ids[2] + ':40@', 'a stop keeps its setting; settings for dropped or absent ids go', SV.stops);
  await S.context().close();

  t.section('6. hostile plans');
  const bad = await p.ev(`'g='+b64enc(JSON.stringify({v:1,g:[],p:[],r:${J(ids)},d:[3],
    s:{st:'2026-02-30',dt:'25:00',pc:'turbo',
       ds:[[0,'9:00'],[3,{}],[2,'10:00'],[99,'10:00'],['0','08:00'],[3,'23:59']],
       m:[[${J(ids[0])},99999,'12:00'],[${J(ids[1])},-5,'07:61'],[${J(ids[2])},12.5,''],[${J(ids[3])},'40','08:00'],
          ['__proto__',30,'09:00'],['constructor',30,'09:00'],[${J(ids[4])},720,'x']]
          .concat(Array(600).fill(['nope',30,''])).concat([[${J(ids[5])},30,'']])}}))`);
  const B = await t.open({ hash: '#' + bad });
  const BV = await B.ev(view);
  t.ok(BV.start === null && BV.dayStart === '09:00' && BV.pace === 'standard', 'an impossible date, time or pace falls back to the default', BV);
  t.ok(BV.ds === '3=23:59', 'only well-formed times on real breaks survive', BV.ds);
  const ok6 = { [ids[0]]: ':@12:00', [ids[3]]: ':@08:00', [ids[4]]: ':720@' };
  t.ok(BV.stops === Object.keys(ok6).sort().map(k => k + ok6[k]).join(),
       'stays must be whole minutes from 5 to 720, pins must be real times', BV.stops);
  t.ok(BV.stops.indexOf(ids[5]) < 0, 'and a list padded past 600 entries is not read to the end', BV.stops);
  const proto = await B.ev(`Object.getPrototypeOf(plan.stops)===Object.prototype&&!('dur' in plan.stops)`);
  t.ok(proto, 'no entry reaches the prototype of the plan’s stops');
  await B.context().close();
  for (const s of ['"x"', '[1,2]', 'null', '{"st":["2026-10-05"],"ds":"x","m":{"a":1}}']) {
    const f = await p.ev(`'g='+b64enc(${J('{"v":1,"g":[],"p":[],"r":' + J(ids) + ',"s":' + s + '}')})`);
    const Q = await t.open({ hash: '#' + f });
    const QV = await Q.ev(view);
    t.ok(QV.trip.length === ids.length && QV.start === null && QV.stops === '', 'a plan of ' + s + ' is ignored and the trip still loads', QV);
    await Q.context().close();
  }

  t.section('7. hostile ids');
  // A place of the link's own named "__proto__" used to become the prototype of the id
  // table, so a trip id like "lat" resolved to a number and appeared as a blank stop; one
  // named "b0" replaced Senso-ji.
  const ids7 = await p.ev(`'g='+b64enc(JSON.stringify({v:1,g:[],
    p:[['Mine','','eat','',35.6,139.7,'__proto__','tokyo'],['Fake','','eat','',35.6,139.7,'b0','tokyo'],['Twin','','eat','',35.6,139.7,'u1','tokyo'],['Twin2','','eat','',35.6,139.7,'u1','tokyo']],
    r:['constructor','b1','toString','lat','__proto__','b0','hasOwnProperty']}))`);
  const H = await t.open({ hash: '#' + ids7 });
  const HV = await H.ev(`({trip:trip.map(i=>byId[i]&&byId[i].name),b0:byId.b0.name,
    mine:P.filter(q=>q.mine).map(q=>q.id)})`);
  t.ok(HV.trip.join('|') === 'Meiji Jingu|Senso-ji', 'only real places stay in the trip — nothing resolves through the object prototype', HV.trip);
  t.ok(HV.b0 === 'Senso-ji', 'a link cannot put its own place in place of a curated one', HV.b0);
  t.ok(HV.mine.length === 4 && new Set(HV.mine).size === 4 && !HV.mine.some(i => i === '__proto__' || i === 'b0'),
       'its places are kept, under ids of their own', HV.mine);
  await H.context().close();
});
