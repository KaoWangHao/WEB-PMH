/*
 * Sinh src/Brand.html từ ảnh trong assets/ (nhúng base64 để Apps Script không cần host ảnh riêng).
 * Chạy lại sau khi thay logo: node dev/build-brand.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const dataUri = (file, mime) =>
  'data:' + mime + ';base64,' + fs.readFileSync(path.join(ROOT, 'assets', file)).toString('base64');

const css = [
  '<!-- File sinh tự động bởi dev/build-brand.js — không sửa tay. -->',
  '<style>',
  '.brand-logo { display: block; aspect-ratio: 600 / 158; background: url(' +
    dataUri('central-logo.webp', 'image/webp') + ') no-repeat center / contain; }',
  '.brand-mark { display: block; aspect-ratio: 1; background: url(' +
    dataUri('central-mark.webp', 'image/webp') + ') no-repeat center / contain; }',
  '</style>',
  ''
].join('\n');

fs.writeFileSync(path.join(ROOT, 'src', 'Brand.html'), css);
console.log('Đã ghi src/Brand.html (' + css.length + ' ký tự)');
