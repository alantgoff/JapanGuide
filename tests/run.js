/* Runs every suite, each in its own process, and reports one line per suite.
     node tests/run.js              all suites
     node tests/run.js planner      just the named suites, with full output
   Needs Playwright on the module path, e.g. NODE_PATH=/opt/node22/lib/node_modules
   or `npm i playwright` in this folder. */
const { spawnSync } = require('child_process');
const path = require('path'), fs = require('fs');

const ORDER = ['smoke', 'filecheck', 'shared', 'state', 'data', 'planner', 'share',
               'panel', 'sheet', 'export', 'print'];
const only = process.argv.slice(2);
const files = ORDER.filter(n => fs.existsSync(path.join(__dirname, n + '.js')))
                   .filter(n => !only.length || only.includes(n));

const bad = [];
for (const n of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, n + '.js')],
                      { env: process.env, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || '');
  const sum = out.trim().split('\n').filter(l => /passed, \d+ failed/.test(l)).pop() || '(no summary)';
  console.log((r.status === 0 ? 'PASS ' : 'FAIL ') + n.padEnd(10) + sum.replace(/^[^:]*: /, ''));
  if (r.status !== 0 || only.length) {
    if (r.status !== 0) bad.push(n);
    const show = only.length || process.env.VERBOSE ? out
      : out.split('\n').filter(l => /FAIL|CRASH|ERROR|Error/.test(l)).slice(0, 25).join('\n');
    console.log(show.replace(/^/gm, '    '));
  }
}
console.log(bad.length ? '\n' + bad.length + ' suite(s) failing: ' + bad.join(', ') : '\nall suites green');
process.exit(bad.length ? 1 : 0);
