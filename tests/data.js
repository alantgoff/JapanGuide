/* The planner's authored data must cover every place, parse, and agree with what the
   guide's own notes already tell the reader — a closure the note states and the hours
   table forgets would let the planner send you to a locked gate. */
const { suite } = require('./lib');

suite('data', async t => {
  const p = await t.open();

  t.section('1. every place has hours, and every record parses');
  const cov = await p.ev(`(function(){
    var names=PLACES.map(r=>r[0]),missing=names.filter(n=>!HOURS[n]),
        orphan=Object.keys(HOURS).filter(k=>names.indexOf(k)<0),bad=[];
    names.forEach(n=>{var h=parseHours(HOURS[n]);
      if(!h||!h.w.length||h.w.some(w=>!(w[0]>=0&&w[1]>w[0]&&w[1]<=2880))||!(h.dur>=5&&h.dur<=720))bad.push(n)});
    return {n:names.length,missing:missing,orphan:orphan,bad:bad};
  })()`);
  t.ok(cov.missing.length === 0, 'all ' + cov.n + ' places have an hours record', cov.missing);
  t.ok(cov.orphan.length === 0, 'no hours record names a place that does not exist', cov.orphan);
  t.ok(cov.bad.length === 0, 'every window and stay parses to something sane', cov.bad);
  const built = await p.ev('P.filter(q=>!q.mine).every(q=>q.hrs&&q.hrs.w.length)');
  t.ok(built, 'every curated place object carries its parsed hours');

  t.section('2. closures agree with the notes');
  const cl = await p.ev(`(function(){
    var D={Sundays:0,Mondays:1,Tuesdays:2,Wednesdays:3,Thursdays:4,Fridays:5,Saturdays:6},out=[],seen=0;
    PLACES.forEach(r=>{
      var h=parseHours(HOURS[r[0]]),note=r[8];
      // "Closed Mondays", "Closed Sundays and Wednesdays" — anchored on the weekday, so
      // "closes to cars", "Closed by snow" and "Closes on high gas readings" don't count
      var m=/\\bClosed ((?:Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)days)(?: and ((?:Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)days))?/.exec(note);
      if(m){seen++;[m[1],m[2]].filter(Boolean).forEach(d=>{if(h.closed[D[d]]!==1)out.push(r[0]+' '+d)})}
      var s=/\\bClosed some ((?:Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)days)/.exec(note);
      if(s){seen++;if(h.closed[D[s[1]]]!==2)out.push(r[0]+' some '+s[1])}
    });
    return {seen:seen,wrong:out};
  })()`);
  t.ok(cl.seen >= 8, 'the notes state ' + cl.seen + ' closures', cl.seen);
  t.ok(cl.wrong.length === 0, 'each is in the hours table, hard or soft as the note says', cl.wrong);
  const nijo = await p.ev(`(function(){var h=parseHours(HOURS['Nijo Castle']);return {tue:h.closed[2],m:Object.keys(h.cmonths).join(),note:PLACES.find(r=>r[0]==='Nijo Castle')[8]}})()`);
  t.ok(nijo.tue === 1 && nijo.m === '1,7,8,12' && /January, July, August and December/.test(nijo.note),
       'Nijo closes Tuesdays only in Jan, Jul, Aug and Dec — and the note now says which months', nijo);
  const ev = await p.ev(`(function(){var q=P.find(x=>x.name==='Akihabara'),o=P.find(x=>x.name==='Owakudani');return {aki:q.hrs.closed.join(''),owa:o.hrs.f}})()`);
  t.ok(ev.aki === '0000000', '"the main street closes to cars" is not a closure', ev.aki);
  t.ok(ev.owa.indexOf('w') >= 0, 'Owakudani carries its can-close-for-conditions flag', ev.owa);

  t.section('3. opening times the notes state');
  const open = await p.ev(`(function(){var o={};['Kiyomizu-dera','Todai-ji','Kinkaku-ji','Nishiki Market','Kuromon Market','Omoide Yokocho','Senso-ji','Fushimi Inari Taisha']
    .forEach(n=>{var w=parseHours(HOURS[n]).w[0];o[n]=w[0]+'-'+w[1]});return o})()`);
  const want = { 'Kiyomizu-dera': '360-', 'Todai-ji': '450-', 'Kinkaku-ji': '540-', 'Nishiki Market': '540-1080',
                 'Kuromon Market': '540-1020', 'Omoide Yokocho': '1020-1440', 'Senso-ji': '0-1440', 'Fushimi Inari Taisha': '0-1440' };
  for (const n in want) t.ok(open[n].startsWith(want[n]), n + ' opens as its note says', open[n]);

  t.section('4. every place belongs to the right hub');
  const ar = await p.ev(`(function(){var o={};P.forEach(q=>o[q.name]=q.area);return o})()`);
  const hub = {
    'Kotoku-in Great Buddha': 'kamakura', 'Tsurugaoka Hachimangu': 'kamakura', 'Enoshima': 'kamakura',
    'Nikko Tosho-gu': 'nikko', 'Yoshino-yama': 'yoshino', 'Kurama & Kibune': 'kurama', 'Byodo-in': 'uji',
    'Tsuen Tea': 'uji', 'Nakamura Tokichi Honten': 'uji', 'Itohkyuemon Byodo-in': 'uji',
    'Mitsuboshien Kanbayashi Sannyu': 'uji', 'Fukujuen Uji Tea Workshop': 'uji', 'Horyu-ji': 'horyuji',
    'Mount Fuji summit': 'kawaguchiko', 'Fuji Subaru Line 5th Station': 'kawaguchiko', 'Owakudani': 'hakone',
    'Hakone Open-Air Museum': 'hakone', 'Shiraito Falls': 'fujinomiya', 'Senso-ji': 'tokyo',
    'Kinkaku-ji': 'kyoto', 'Arashiyama Bamboo Grove': 'kyoto', 'Todai-ji': 'nara', 'Dotonbori': 'osaka',
  };
  const wrong = Object.keys(hub).filter(n => ar[n] !== hub[n]).map(n => n + '→' + ar[n]);
  t.ok(wrong.length === 0, 'the places outside their region’s box, and a sample of the rest', wrong);
  const lost = Object.keys(ar).filter(n => ar[n] === 'elsewhere');
  t.ok(lost.length === 0, 'no curated place is left without a hub', lost);

  t.section('5. the rail graph joins every hub');
  const g = await p.ev(`(function(){
    var ks=Object.keys(AREAS),bad=RAIL_EDGES.filter(e=>!AREAS[e[0]]||!AREAS[e[1]]||!(e[2]>0)),adj={},seen={tokyo:1},q=['tokyo'];
    RAIL_EDGES.forEach(e=>{(adj[e[0]]=adj[e[0]]||[]).push(e[1]);(adj[e[1]]=adj[e[1]]||[]).push(e[0])});
    while(q.length){var a=q.shift();(adj[a]||[]).forEach(b=>{if(!seen[b]){seen[b]=1;q.push(b)}})}
    return {bad:bad,unreached:ks.filter(k=>!seen[k])};
  })()`);
  t.ok(g.bad.length === 0, 'every line joins two known hubs with a positive time', g.bad);
  t.ok(g.unreached.length === 0, 'every hub can be reached from Tokyo', g.unreached);

  t.section('6. your own places');
  const u = await p.ev(`(function(){USER=[{id:'utest',name:'Senso-ji',ja:'',cat:'temple',note:'',lat:34.9671,lng:135.7727,region:'kyoto'}];
    rebuildPlaces();var q=byId.utest;return {hrs:q.hrs,area:q.area}})()`);
  t.ok(u.hrs === null, 'a place of your own never borrows a curated place’s hours, even by name');
  t.ok(u.area === 'kyoto', 'but it is placed in the hub it is near', u.area);

  t.section('7. the reader sees what the planner assumes');
  const q = await t.open();
  const card = n => q.ev(`(function(){select(P.find(x=>x.name===${JSON.stringify(n)}).id,false);var h=document.querySelector('#detail .hrs');return h?h.textContent:null})()`);
  let c = await card('Nijo Castle');
  t.ok(c === 'Typical hours08:45–17:00 · closed Tuesdays in Jan, Jul, Aug and Dec · about 1h 30 there', 'Nijo’s card states its hours, its closures and its months', c);
  c = await card('Sukiyabashi Jiro');
  t.ok(/^Typical hours11:30–14:00, 17:30–20:30 · closed Sundays/.test(c), 'a restaurant its two sittings', c);
  c = await card('Mount Fuji summit');
  t.ok(/open all day · The climbing season is early July to early September/.test(c), 'a seasonal place its season', c);
  await q.ev(`USER=[{id:'uhrs',name:'My café',ja:'',cat:'matcha',note:'',lat:35.0,lng:135.77,region:'kyoto'}];rebuildPlaces();0`);
  c = await q.ev(`(function(){select('uhrs',false);return document.querySelector('#detail .hrs')})()`);
  t.ok(c === null, 'and a place of your own claims no hours at all');
});
