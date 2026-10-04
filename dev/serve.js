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
// Chức năng chạy thử (Kế hoạch mua sắm) ở khms/src — giống bản /dev. Chạy giống bản chính: KHMS=0 node dev/serve.js
const DIRS = [SRC].concat(process.env.KHMS === '0' ? [] : [path.join(ROOT, 'khms', 'src')]);
const PORT = Number(process.env.PORT) || 5173;

function findFile(name) {
  for (const d of DIRS) if (fs.existsSync(path.join(d, name))) return path.join(d, name);
  return null;
}

function buildIndex() {
  let html = fs.readFileSync(path.join(SRC, 'Index.html'), 'utf8');
  html = html.replace(/<\?!=\s*(include|includeIf)\('([^']+)'\);?\s*\?>/g, (_, fn, name) => {
    const f = findFile(name + '.html');
    if (!f && fn === 'include') throw new Error('Không có file ' + name + '.html');
    return f ? fs.readFileSync(f, 'utf8') : '';
  });
  const devScripts = '<script src="/dev/mock.js"></script><script src="/backend.js"></script><script src="/dev/seed.js"></script>';
  return html.replace('</head>', devScripts + '\n</head>');
}

function buildBackend() {
  return DIRS.map((d) => fs.readdirSync(d).filter((f) => f.endsWith('.gs')).sort()
    .map((f) => '// ---- ' + f + '\n' + fs.readFileSync(path.join(d, f), 'utf8')).join('\n')).join('\n');
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
