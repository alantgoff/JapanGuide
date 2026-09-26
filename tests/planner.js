/* The scheduler: real dates, weekday and seasonal closures, waiting for a door to open,
   fixed times, pace, and the three kinds of leg — walk, ride across town, and the train
   between cities. 2026-10-05 is a Monday. */
const { suite } = require('./lib');

suite('planner', async t => {
  const p = await t.open();
  // lay out a trip by place names; days are split at the given positions
  const lay = (names, breaks = [], plan = {}) => p.ev(`(function(){
    trip=${JSON.stringify(names)}.map(n=>{var q=P.find(x=>x.name===n);if(!q)throw new Error('no place '+n);return q.id});
    dayBreaks=${JSON.stringify(breaks)};plan=freshPlan();Object.assign(plan,${JSON.stringify(plan)});
    return schedule();
  })()`);
  const warns = e => e.warn.map(w => w.lvl + ':' + w.t);
  const has = (e, lvl, re) => e.warn.some(w => w.lvl === lvl && re.test(w.t));

  t.section('1. days are real dates, in every time zone');
  const d = await p.ev(`plan=freshPlan();plan.start='2026-10-05';[0,2].map(dayDate).map(x=>x.label)`);
  t.ok(d.join() === 'Mon 5 Oct,Wed 7 Oct', 'day one is Monday 5 October; day three is Wednesday', d);
  const roll = await p.ev(`plan.start='2026-10-30';dayDate(3).iso`);
  t.ok(roll === '2026-11-02', 'days roll over the end of a month', roll);
  for (const tz of ['America/Los_Angeles', 'Pacific/Kiritimati']) {
    const q = await t.open({ tz });
    const r = await q.ev(`plan=freshPlan();plan.start='2026-10-05';[dayDate(0).label,dayDate(0).wd,new Date().getTimezoneOffset()]`);
    t.ok(r[0] === 'Mon 5 Oct' && r[1] === 1, 'still Monday 5 October in ' + tz + ' (UTC offset ' + (-r[2] / 60) + 'h)', r);
    await q.context().close();
  }

  t.section('2. closures on the day you are there');
  let s = await lay(['Shinjuku Gyoen'], [], { start: '2026-10-05' });
  t.ok(has(s[0].entries[0], 2, /Closed on Mondays/) && !s[0].fits, 'Shinjuku Gyoen on a Monday: closed, and the day does not fit', warns(s[0].entries[0]));
  s = await lay(['Senso-ji', 'Ueno Park', 'Tsukiji Outer Market'], [1, 2], { start: '2026-10-05' });
  t.ok(has(s[2].entries[0], 2, /Closed on Wednesdays/), 'Tsukiji on day three, a Wednesday: closed', warns(s[2].entries[0]));
  t.ok(s[0].fits && s[1].fits, 'the other days fit', [s[0].fits, s[1].fits]);
  s = await lay(['Nijo Castle'], [], { start: '2026-10-06' });
  t.ok(!s[0].entries[0].warn.some(w => /Closed/.test(w.t)), 'Nijo on a Tuesday in October: open', warns(s[0].entries[0]));
  s = await lay(['Nijo Castle'], [], { start: '2026-12-01' });
  t.ok(has(s[0].entries[0], 2, /Closed on Tuesdays/), 'Nijo on a Tuesday in December: closed', warns(s[0].entries[0]));
  s = await lay(['Fuji-Q Highland'], [], { start: '2026-10-06' });
  t.ok(has(s[0].entries[0], 1, /Sometimes closed on Tuesdays/), 'Fuji-Q on a Tuesday: a soft warning, not a hard one', warns(s[0].entries[0]));
  s = await lay(['Mount Fuji summit', 'Yoshino-yama'], [1], { start: '2026-10-05' });
  t.ok(has(s[0].entries[0], 2, /climbing season/), 'the summit in October: out of season, hard', warns(s[0].entries[0]));
  t.ok(has(s[1].entries[0], 1, /early to mid April/), 'Yoshino in October: out of season, soft', warns(s[1].entries[0]));
  s = await lay(['Shinjuku Gyoen']);
  t.ok(!s[0].entries[0].warn.some(w => /Closed/.test(w.t)) && s[0].entries[0].start > 0,
       'without a start date there are still times, but no weekday closures', warns(s[0].entries[0]));

  t.section('3. waiting for the door');
  s = await lay(['Kinkaku-ji'], [], { start: '2026-10-05', dayStart: '07:00' });
  let e = s[0].entries[0];
  t.ok(e.arrive === 420 && e.start === 540 && has(e, 1, /Opens 09:00 — 2h wait/), 'arrive 07:00 at Kinkaku-ji, start at its 09:00 opening', [e.arrive, e.start, warns(e)]);
  s = await lay(['Sukiyabashi Jiro'], [], { start: '2026-10-06', dayStart: '15:00' });
  e = s[0].entries[0];
  t.ok(e.start === 1050 && has(e, 1, /Opens 17:30 — 2h 30 wait/), 'between lunch and dinner, a restaurant waits for the evening sitting', [e.start, warns(e)]);
  s = await lay(['Sukiyabashi Jiro'], [], { start: '2026-10-04' });
  t.ok(has(s[0].entries[0], 2, /Closed on Sundays/), 'and on a Sunday it is closed', warns(s[0].entries[0]));
  s = await lay(['Omoide Yokocho'], [], { dayStart: '23:00' });
  e = s[0].entries[0];
  t.ok(!e.warn.some(w => /Closed/.test(w.t)) && !has(e, 1, /after dark/), 'Omoide Yokocho at 23:00 is open (its window runs to midnight)', warns(e));
  s = await lay(['Kinkaku-ji'], [], { dayStart: '16:40' });
  t.ok(has(s[0].entries[0], 1, /Closes 17:00 — only 20 min there/), 'arriving near closing says how long you actually get', warns(s[0].entries[0]));
  s = await lay(['Kinkaku-ji'], [], { dayStart: '17:30' });
  t.ok(has(s[0].entries[0], 2, /Closed by 17:30/), 'arriving after closing is a hard warning', warns(s[0].entries[0]));

  t.section('4. fixed times');
  s = await lay(['Kinkaku-ji', 'Fushimi Inari Taisha'], [], { stops: {} });
  const fid = await p.ev(`P.find(x=>x.name==='Fushimi Inari Taisha').id`);
  const kid = await p.ev(`P.find(x=>x.name==='Kinkaku-ji').id`);
  s = await lay(['Kinkaku-ji', 'Fushimi Inari Taisha'], [], { stops: { [fid]: { at: '09:15' } } });
  t.ok(has(s[0].entries[1], 2, /Late for 09:15/), 'a pin you cannot make is a hard warning', warns(s[0].entries[1]));
  s = await lay(['Kinkaku-ji', 'Ryoan-ji'], [], { stops: { [await p.ev(`P.find(x=>x.name==='Ryoan-ji').id`)]: { at: '14:00' } } });
  t.ok(s[0].entries[1].start === 840, 'a pin you are early for waits for it', s[0].entries[1].start);
  s = await lay(['Fushimi Inari Taisha', 'Tofuku-ji'], [], { stops: { [fid]: { at: '06:00' } } });
  t.ok(s[0].start === 360 && s[0].entries[0].start === 360 && !s[0].entries[0].warn.some(w => /Late/.test(w.t)),
       'a pinned first stop starts the day at the pin', [s[0].start, warns(s[0].entries[0])]);

  t.section('5. pace scales the suggestion, never your own number');
  const durs = [];
  for (const pace of ['packed', 'standard', 'relaxed']) durs.push((await lay(['Kinkaku-ji'], [], { pace }))[0].entries[0].dur);
  t.ok(durs.join() === '35,45,55', 'Kinkaku-ji: 35 packed, 45 standard, 55 relaxed', durs);
  s = await lay(['Kinkaku-ji'], [], { pace: 'relaxed', stops: { [kid]: { dur: 30 } } });
  t.ok(s[0].entries[0].dur === 30, 'a stay you set stays as you set it', s[0].entries[0].dur);

  t.section('6. walking, riding across town, and the train between cities');
  s = await lay(['Kinkaku-ji', 'Ryoan-ji']);
  let lg = s[0].entries[1].leg;
  t.ok(lg.mode === 'walk' && lg.min >= 12 && lg.min <= 25, 'Kinkaku-ji to Ryoan-ji is a walk', lg);
  s = await lay(['Senso-ji', 'Shibuya Crossing']);
  lg = s[0].entries[1].leg;
  t.ok(lg.mode === 'local' && lg.label === 'metro' && lg.min >= 25 && lg.min <= 50, 'Senso-ji to Shibuya is the metro', lg);
  s = await lay(['Senso-ji', 'Kinkaku-ji'], [1], { start: '2026-10-05' });
  lg = s[1].entries[0].leg;
  t.ok(lg && lg.move && lg.mode === 'rail' && /Shinkansen/.test(lg.label) && lg.min >= 150 && lg.min <= 230,
       'a Kyoto day after a Tokyo day opens with the Shinkansen', lg);
  t.ok(s[1].entries[0].arrive === 540 + lg.min, 'and the day’s first stop waits for the train', [s[1].entries[0].arrive, lg.min]);
  s = await lay(['Senso-ji', 'Todai-ji'], [1]);
  lg = s[1].entries[0].leg;
  t.ok(lg.label === 'Shinkansen + Kintetsu, via Kyoto', 'Tokyo to Nara changes at Kyoto', lg.label);
  s = await lay(['Kinkaku-ji', 'Tsuen Tea']);
  lg = s[0].entries[1].leg;
  t.ok(lg.mode === 'rail' && lg.label === 'JR Nara line', 'Kyoto to Uji is the Nara line', lg);
  s = await lay(['Kinkaku-ji', 'Ryoan-ji'], [1]);
  t.ok(!s[1].entries[0].leg, 'two days in the same city need no journey between them', s[1].entries[0].leg);
  // Kyoto Station to Fushimi Inari is 2.4 km: a 42-minute walk, or one stop on the train
  const st = await p.ev(`(function(){var f=P.find(x=>x.name==='Fushimi Inari Taisha'),h=hubPt('kyoto');
    return [footOrRide(h,f,'kyoto'),footOrRide(h,f,null)]})()`);
  t.ok(st[0].mode === 'local' && st[0].min < 30 && st[1].mode === 'walk' && st[1].min > 30,
       'a walk over half an hour becomes a ride where the city has one that is quicker', st);

  t.section('7. a day that does not fit');
  s = await lay(['Kinkaku-ji', 'Ryoan-ji', 'Nijo Castle', 'Nishiki Market', 'Gion', 'Kiyomizu-dera', 'Sanjusangen-do',
                 'Fushimi Inari Taisha', 'Tofuku-ji', 'Ginkaku-ji', "Philosopher's Path", 'Heian Jingu', 'Pontocho Alley']);
  t.ok(!s[0].fits && s[0].warn.some(w => /a long day/.test(w.t)), 'thirteen Kyoto stops in a day runs long and says so', [s[0].end, s[0].warn]);
});
