/* Test server. Serves the repo and plants a test hook inside the app's IIFE on the way
   out — the shipped index.html never contains it.

   The hook is a single direct eval, so a test can read and set any of the app's private
   state (`trip`, `plan`, `V`, `schedule()`…) without the hook having to grow a method for
   every question a test wants to ask. It replaces the last two lines of the IIFE, which
   is why those lines must stay the literal end of the app script: if the marker is not
   there exactly once, every request fails loudly rather than serving an unhooked page. */
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MARKER = 'requestAnimationFrame(loop);\n})();';
const HOOK = 'window.__jg={ev:function(s){return eval(s)}};';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.png': 'image/png', '.json': 'application/json',
  '.md': 'text/plain; charset=utf-8',
};

function page(file) {
  const html = fs.readFileSync(file || path.join(ROOT, 'index.html'), 'utf8');
  const n = html.split(MARKER).length - 1;
  if (n !== 1) throw new Error('hook marker must occur exactly once in index.html, found ' + n);
  return html.replace(MARKER, 'requestAnimationFrame(loop);\n' + HOOK + '\n})();');
}

function start(port = 0, opts = {}) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      try {
        if (u === '/' || u === '/index.html') {
          const body = page(opts.html || process.env.JG_HTML);
          res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
          return res.end(body);
        }
        const f = path.join(ROOT, path.normalize(u));
        if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
          res.writeHead(404); return res.end();
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
        fs.createReadStream(f).pipe(res);
      } catch (e) {
        res.writeHead(500); res.end(String(e.message));
      }
    });
    srv.on('error', reject);
    srv.listen(port, '127.0.0.1', () => {
      const p = srv.address().port;
      resolve({ port: p, url: 'http://127.0.0.1:' + p + '/', close: () => new Promise(r => srv.close(r)) });
    });
  });
}

module.exports = { start, page, ROOT, MARKER };

if (require.main === module) {
  start(+(process.argv[2] || 8848)).then(s => console.log('serving ' + s.url));
}
