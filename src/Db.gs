/**
 * Lớp truy cập dữ liệu: mỗi sheet là một bảng, dòng 1 là header (xem SHEET_HEADERS).
 * Tất cả giá trị được lưu dạng text (định dạng '@') để Google Sheets không tự đổi kiểu.
 */

var DB_PROP_KEY = 'DB_SPREADSHEET_ID';
var db_cache_ = null;

function db_() {
  if (db_cache_) return db_cache_;
  var id = PropertiesService.getScriptProperties().getProperty(DB_PROP_KEY);
  if (!id) throw appError_('Hệ thống chưa được khởi tạo. Chủ sở hữu cần chạy hàm setup() trong Apps Script editor.');
  db_cache_ = SpreadsheetApp.openById(id);
  return db_cache_;
}

function sheet_(name) {
  var sh = db_().getSheetByName(name);
  if (!sh) throw appError_('Không tìm thấy sheet "' + name + '". Hãy chạy lại setup().');
  return sh;
}

/** Cột của bảng: SHEET_HEADERS, hoặc bảng của chức năng chạy thử (KHMS_HEADERS_ trong khms/src/Procurement.gs). */
function headersOf_(name) {
  return SHEET_HEADERS[name] || (typeof KHMS_HEADERS_ !== 'undefined' && KHMS_HEADERS_[name]);
}

/** Đọc toàn bộ bảng thành mảng object; mỗi object có thêm _row (số dòng thực trong sheet). */
function readTable_(name) {
  var headers = headersOf_(name);
  var sh = sheet_(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (row.every(function (v) { return v === '' || v === null; })) continue;
    var obj = { _row: i + 2 };
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = row[j];
    out.push(obj);
  }
  return out;
}

function toRowValues_(name, obj) {
  return headersOf_(name).map(function (h) {
    var v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v);
  });
}

function appendObj_(name, obj) {
  var sh = sheet_(name);
  var values = toRowValues_(name, obj);
  var row = sh.getLastRow() + 1;
  var range = sh.getRange(row, 1, 1, values.length);
  range.setNumberFormat('@');
  range.setValues([values]);
  return row;
}

/** Ghi nhiều dòng liền nhau ở cuối bảng trong 1 lần gọi; trả về số dòng đầu tiên. */
function appendRows_(name, objs) {
  if (!objs.length) return 0;
  var sh = sheet_(name);
  var values = objs.map(function (o) { return toRowValues_(name, o); });
  var row = sh.getLastRow() + 1;
  var range = sh.getRange(row, 1, values.length, values[0].length);
  range.setNumberFormat('@');
  range.setValues(values);
  return row;
}

function writeObj_(name, rowNum, obj) {
  var values = toRowValues_(name, obj);
  var range = sheet_(name).getRange(rowNum, 1, 1, values.length);
  range.setNumberFormat('@');
  range.setValues([values]);
}

/** Ghi lại nhiều dòng đã có (obj có _row): gom các dòng liền nhau thành 1 lần ghi. */
function writeObjs_(name, objs) {
  if (!objs.length) return;
  var sh = sheet_(name);
  var sorted = objs.slice().sort(function (a, b) { return a._row - b._row; });
  for (var i = 0; i < sorted.length;) {
    var j = i;
    while (j + 1 < sorted.length && sorted[j + 1]._row === sorted[j]._row + 1) j++;
    var values = sorted.slice(i, j + 1).map(function (o) { return toRowValues_(name, o); });
    var range = sh.getRange(sorted[i]._row, 1, values.length, values[0].length);
    range.setNumberFormat('@');
    range.setValues(values);
    i = j + 1;
  }
}

/** Ghi lại toàn bộ bảng (xóa nội dung cũ, ghi objs từ dòng 2) — dùng khi xóa nhiều dòng một lúc. */
function rewriteTable_(name, objs) {
  var sh = sheet_(name);
  var n = headersOf_(name).length;
  var last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, n).clearContent();
  if (!objs.length) return;
  var values = objs.map(function (o) { return toRowValues_(name, o); });
  var range = sh.getRange(2, 1, values.length, n);
  range.setNumberFormat('@');
  range.setValues(values);
}

/** Tạo sheet theo SHEET_HEADERS nếu chưa có; sheet đã có mà thiếu cột mới ở cuối → ghi bổ sung header (không cần chạy lại setup()). */
function ensureSheet_(name) {
  var ss = db_();
  var have = ss.getSheetByName(name);
  if (have) {
    var n = headersOf_(name).length;
    if (have.getLastColumn() < n) {
      have.getRange(1, 1, 1, n).setValues([headersOf_(name)]).setFontWeight('bold');
      have.getRange(1, 1, have.getMaxRows(), n).setNumberFormat('@');
    }
    return;
  }
  withLock_(function () {
    if (ss.getSheetByName(name)) return;
    var sh = ss.insertSheet(name);
    var headers = headersOf_(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
    sh.setFrozenRows(1);
  });
}

function deleteRows_(name, rowNums) {
  var sh = sheet_(name);
  rowNums.slice().sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
}

/** Chạy fn trong script lock để tránh 2 người ghi cùng lúc. */
function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw appError_('Hệ thống đang bận, vui lòng thử lại sau giây lát.');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/** Ngày hôm nay theo giờ Việt Nam, dạng dd/MM/yyyy (không có giờ). */
function today_() {
  return Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'dd/MM/yyyy');
}

/** Chuyển ngày lưu trong sheet (dd/MM/yyyy hoặc Date) sang ISO yyyy-MM-dd cho client. */
function dmyToIso_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, APP_CONFIG.TIMEZONE, 'yyyy-MM-dd');
  }
  var m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
}

/** ISO yyyy-MM-dd (từ client) → dd/MM/yyyy để lưu sheet; sai định dạng/ngày không tồn tại → ''. */
function isoToDmy_(iso) {
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return '';
  return m[3] + '/' + m[2] + '/' + m[1];
}

function toBool_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

function appError_(message, code) {
  var e = new Error(message);
  e.appCode = code || 'APP';
  return e;
}
