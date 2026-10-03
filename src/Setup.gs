/**
 * Các hàm chỉ chạy từ Apps Script editor bởi chủ sở hữu (không gọi được từ web app).
 *  - setup(): tạo Google Sheet dữ liệu + tài khoản admin đầu tiên (chạy 1 lần).
 *  - resetAdminPassword(): cấp lại mật khẩu cho tài khoản "admin" khi quên.
 * Mật khẩu được in ra Execution log (View > Logs).
 */

function requireOwner_() {
  var active = '';
  var effective = '';
  try { active = Session.getActiveUser().getEmail(); } catch (e) {}
  try { effective = Session.getEffectiveUser().getEmail(); } catch (e) {}
  if (!active || active !== effective) {
    throw new Error('Chỉ chủ sở hữu được chạy hàm này từ Apps Script editor.');
  }
}

function randomPassword_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

function setup() {
  requireOwner_();
  var props = PropertiesService.getScriptProperties();
  var ss = null;
  var id = props.getProperty(DB_PROP_KEY);
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('HoSo_DB');
    props.setProperty(DB_PROP_KEY, ss.getId());
    Logger.log('Đã tạo Google Sheet dữ liệu: ' + ss.getUrl());
  } else {
    Logger.log('Google Sheet dữ liệu đã có: ' + ss.getUrl());
  }
  db_cache_ = ss;

  Object.keys(SHEET_HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    var headers = SHEET_HEADERS[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
    sh.setFrozenRows(1);
  });
  seedProjects_();
  var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  if (readTable_('Users').length === 0) {
    var password = randomPassword_();
    var rec = { username: 'admin', displayName: 'Quản trị viên', position: 'CV', isAdmin: true,
                active: true, createdAt: today_() };
    setPassword_(rec, password, true);
    appendObj_('Users', rec);
    Logger.log('Tài khoản admin: admin / mật khẩu tạm: ' + password + ' (sẽ phải đổi khi đăng nhập lần đầu)');
  } else {
    Logger.log('Đã có tài khoản, không tạo admin mới.');
  }
}

function resetAdminPassword() {
  requireOwner_();
  var rec = findUserRecord_('admin');
  if (!rec) throw new Error('Không có tài khoản "admin".');
  var password = randomPassword_();
  rec.isAdmin = true;
  rec.active = true;
  setPassword_(rec, password, true);
  writeObj_('Users', rec._row, rec);
  Logger.log('Mật khẩu tạm mới của admin: ' + password);
}
