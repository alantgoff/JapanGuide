/* A shared guide is someone else's until you keep it. Editing one must not touch the
   guide already saved in this browser; Save a copy here must keep it and drop the link
   from the address bar. And an open sheet owns the keyboard. */
const { suite } = require('./lib');

suite('shared', async t => {
  // Build "my" saved guide and a friend's link from two separate pages.
  const a = await t.open();
  const ids = await a.ev('["Senso-ji","Ueno Park","Kinkaku-ji","Ryoan-ji","Gion"].map(n=>P.find(q=>q.name===n).id)');
  await a.ev('trip=' + JSON.stringify(ids.slice(0, 2)) + ';dayBreaks=[];saveTrip()');
  const mine = await a.evaluate(() => localStorage.getItem('japan-guide-v1'));
  await a.ev('trip=' + JSON.stringify(ids.slice(2)) + ';dayBreaks=[1];');
  const frag = await a.ev('shareFragment()');
  await a.context().close();

  t.section('1. editing a shared guide leaves your own guide alone');
  const b = await t.open({ hash: '#' + frag, storage: { 'japan-guide-v1': mine } });
  t.ok(await b.ev('shared') === true, 'the link opens as a shared guide');
  t.ok((await b.ev('trip.slice()')).join() === ids.slice(2).join(), 'showing the friend’s itinerary');
  t.ok(await b.evaluate(() => !document.getElementById('sheet').hidden), 'with the welcome card up');
  const warns = await b.evaluate(() => document.getElementById('sheet').textContent);
  t.ok(/replaces the guide already saved/.test(warns), 'which warns that keeping it replaces your saved guide');
  await b.ev('closeSheet()');
  await b.ev('toggleTrip(' + JSON.stringify(ids[0]) + ');toggleDay(trip[1])');
  await b.ev('TIPS.push({tag:"x",title:"y",body:"z"});saveMine()');
  t.ok(await b.evaluate(() => localStorage.getItem('japan-guide-v1')) === mine, 'your stored guide is byte-for-byte unchanged');
  t.ok(/shared guide/.test(await b.textContent('#phint')), 'and the page says why it is not saving');

  t.section('2. reloading without the link opens your own guide');
  await b.goto(t.url, { waitUntil: 'load' });
  await b.waitForFunction(() => window.__jg && window.__jg.ev('P.length') > 0);
  t.ok((await b.ev('trip.slice()')).join() === ids.slice(0, 2).join(), 'your two stops are back');
  t.ok(await b.ev('shared') === false, 'not flagged as shared');

  t.section('3. Save a copy here keeps it');
  await b.goto('about:blank');                       // a hash-only change would not reload
  await b.goto(t.url + '#' + frag, { waitUntil: 'load' });
  await b.waitForFunction(() => window.__jg && window.__jg.ev('P.length') > 0);
  await b.waitForTimeout(400);
  await b.click('#wkeep');
  const kept = await b.evaluate(() => ({ s: JSON.parse(localStorage.getItem('japan-guide-v1')), hash: location.hash }));
  t.ok(kept.s.trip.join() === ids.slice(2).join() && kept.s.days.join() === '1', 'the shared itinerary is now the saved one', kept.s);
  t.ok(kept.hash === '', 'and the link is gone from the address bar', kept.hash);
  t.ok(await b.ev('shared') === false, 'edits save normally from here');
  await b.ev('toggleTrip(' + JSON.stringify(ids[1]) + ')');
  t.ok(JSON.parse(await b.evaluate(() => localStorage.getItem('japan-guide-v1'))).trip.length === 4, 'a later edit is saved');

  t.section('4. an open sheet owns the keyboard');
  const c = await t.open();
  await c.ev('shareSheet()');
  const v0 = await c.ev('JSON.stringify(V)');
  await c.focus('#sheet');
  await c.keyboard.press('Space');
  await c.keyboard.press('ArrowLeft');
  await c.keyboard.press('ArrowUp');
  t.ok(await c.ev('autoTour.on') === false, 'Space over a sheet does not start the tour');
  t.ok(await c.ev('JSON.stringify(V)') === v0, 'arrows do not pan the map behind it');
  await c.keyboard.press('Escape');
  t.ok(await c.evaluate(() => document.getElementById('sheet').hidden), 'Escape closes it');

  t.section('5. Space presses a focused button rather than starting the tour');
  const kin = await c.ev('P.find(q=>q.name==="Kinkaku-ji").id');
  await c.ev('select(' + JSON.stringify(kin) + ',false)');
  await c.focus('#addbtn');
  await c.keyboard.press('Space');
  await c.waitForTimeout(100);
  t.ok(await c.ev('autoTour.on') === false, 'the tour stays off');
  t.ok((await c.ev('trip.slice()')).includes(kin), 'and the button did its job');
  await c.ev('closeDetail()');
  await c.focus('body');
  await c.evaluate(() => document.activeElement && document.activeElement.blur());
  await c.keyboard.press('Space');
  t.ok(await c.ev('autoTour.on') === true, 'with nothing focused, Space still plays the tour');
  await c.ev('tourStop()');
});
