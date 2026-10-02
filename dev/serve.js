/*
 * Máy chủ chạy thử local: ghép src/Index.html + Styles + App giống HtmlService,
 * nạp backend thật (src/*.gs) chạy trên mock.js. Mở http://localhost:5173 (thêm ?reset để tạo lại dữ liệu mẫu).
 * Chạy: node dev/serve.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PORT = Number(process.env.PORT) || 5173;

function buildIndex() {
  let html = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
  html = html.replace(/<\?!=\s*include\('([^']+)'\);?\s*\?>/g, (_, name) =>
    fs.readFileSync(path.join(SRC, name + '.html'), 'utf8'));
  const devScripts = '<script src="/dev/mock.js"></script><script src="/backend.js"></script><script src="/dev/seed.js"></script>';
  return html.replace('</head>', devScripts + '\n</head>');
}

function buildBackend() {
  return fs.readdirSync(SRC).filter((f) => f.endsWith('.gs')).sort()
    .map((f) => '// ---- ' + f + '\n' + fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  try {
    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(buildIndex());
    }
    if (url === '/backend.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(buildBackend());
    }
    if (url === '/dev/mock.js' || url === '/dev/seed.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(fs.readFileSync(path.join(__dirname, path.basename(url)), 'utf8'));
    }
    res.writeHead(404); res.end('Not found');
  } catch (e) {
    res.writeHead(500); res.end(String(e && e.stack || e));
  }
}).listen(PORT, () => console.log('Dev server: http://localhost:' + PORT));
