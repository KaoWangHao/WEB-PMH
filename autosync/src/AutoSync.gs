/**
 * Đồng bộ thư mục TỰ ĐỘNG (theo người dùng: "đồng bộ tự động 1 tiếng 1 lần trong khung giờ từ 7h30 sáng đến 17h30 chiều, ngoài ra vẫn giữ
 * tính năng đồng bộ thủ công").
 * CHỨC NĂNG MỞ RỘNG ở thư mục autosync/ (workflow deploy chép autosync/src/* vào src/): xóa thư mục autosync/ là gỡ hẳn tính năng,
 * phần lõi chỉ có điểm gắn (doPost, AUTO_SYNC_ACTIONS_, autoSyncBootstrap_, includeIf('AutoSync'), EXT.* trong App.html).
 * Máy chủ Google không vào được ổ \\HCM-FS01 (mạng nội bộ / VPN), nên một máy tính trong mạng công ty chạy script
 * autosync/tools/auto-sync.ps1 (Task Scheduler, mỗi giờ 7:30–17:30): đọc danh sách file trong thư mục 12_HoSo_TrinhKy
 * rồi POST lên web app (doPost) kèm khóa bí mật. Server lập kế hoạch y như bảng xem trước của đồng bộ thủ công với lựa chọn mặc định:
 * đổi tình trạng theo thư mục, tạo mới file có ký hiệu chuyên viên, KHÔNG đổi chuyên viên phụ trách, bỏ qua file ở nhiều thư mục /
 * hồ sơ trùng tên trên web; hồ sơ Đã duyệt giữ nguyên; ngày ghi nhận = ngày sửa đổi của file. Ghi bằng applyFolderSync_ (tài khoản hệ thống
 * "auto-sync", History ghi chú như đồng bộ thủ công nên chuyên viên vẫn nhận thông báo).
 * Khóa: admin tạo ở trang Quản trị (action autoSyncKey); Script Properties chỉ lưu mã băm SHA-256 của khóa.
 */

var AUTO_SYNC_USER_ = 'auto-sync';
// Link web app chính (deployment cố định) — script trên máy Windows gửi dữ liệu lên địa chỉ này.
var AUTO_SYNC_WEB_APP_URL_ = 'https://script.google.com/macros/s/AKfycbzvKv467-ZX34kCYKkMZPRqIgeP1jVzEJB7qK2FWqB7eIznVwrSxnVLKwn3djB_JBSW8Q/exec';

/** Action của chức năng (Code.gs tra thêm bảng này). */
var AUTO_SYNC_ACTIONS_ = {
  autoSyncKey:    function (user) { return rotateAutoSyncKey_(user); },
  autoSyncForget: function (user, p) { return forgetAutoSyncMachine_(user, p); }
};

/** Dữ liệu gửi kèm bootstrap_ (Submissions.gs gọi nếu có hàm này). */
function autoSyncBootstrap_() {
  return { autoSync: autoSyncStatus_() };
}
var AUTO_SYNC_KEY_PROP_ = 'AUTO_SYNC_KEY_HASH';
var AUTO_SYNC_LAST_PROP_ = 'LAST_AUTO_SYNC';
// Nhiều máy cùng chạy script (dự phòng): lần chạy gần nhất của TỪNG máy, { tênMáy: info }.
// Máy không gửi dữ liệu quá 30 ngày tự bị xóa khỏi danh sách; tối đa 20 máy.
var AUTO_SYNC_MACHINES_PROP_ = 'AUTO_SYNC_MACHINES';
var AUTO_SYNC_FORGET_DAYS_ = 30;
var AUTO_SYNC_MAX_MACHINES_ = 20;
var AUTO_SYNC_NONAME_ = '(không rõ tên máy)';

function autoSyncHash_(key) {
  return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'auto-sync|' + String(key), Utilities.Charset.UTF_8));
}

/** Tài khoản hệ thống dùng khi ghi (quyền như Trưởng phòng để cập nhật mọi hồ sơ). */
function autoSyncUser_() {
  return { username: AUTO_SYNC_USER_, displayName: 'Đồng bộ tự động', position: '', isAdmin: false, isManager: true, active: true };
}

/** Trạng thái gửi cho client (bootstrap): đã cấu hình chưa, lần chạy gần nhất (mọi máy) và lần chạy gần nhất của từng máy. */
function autoSyncStatus_() {
  var props = PropertiesService.getScriptProperties();
  var last = null;
  try { last = JSON.parse(props.getProperty(AUTO_SYNC_LAST_PROP_) || 'null'); } catch (e) { last = null; }
  var map = autoSyncMachineMap_(props);
  var machines = Object.keys(map).map(function (k) { var m = map[k]; m.name = k; return m; });
  machines.sort(function (a, b) { return a.name.localeCompare(b.name); });
  return { configured: !!props.getProperty(AUTO_SYNC_KEY_PROP_), last: last, machines: machines };
}

function autoSyncMachineMap_(props) {
  var map;
  try { map = JSON.parse(props.getProperty(AUTO_SYNC_MACHINES_PROP_) || '{}'); } catch (e) { map = {}; }
  return map && typeof map === 'object' && !(map instanceof Array) ? map : {};
}

/** Ghi kết quả 1 lần chạy: LAST_AUTO_SYNC (mọi máy) + bản ghi của máy đó (giữ thời điểm thành công gần nhất). */
function recordAutoSyncRun_(props, info) {
  props.setProperty(AUTO_SYNC_LAST_PROP_, JSON.stringify(info));
  try {
    withLock_(function () {
      var map = autoSyncMachineMap_(props);
      var name = info.machine || AUTO_SYNC_NONAME_;
      var prev = map[name] || {};
      var rec = {};
      for (var k in info) if (k !== 'machine') rec[k] = info[k];
      rec.lastOkAt = info.ok ? info.at : (prev.lastOkAt || '');
      rec.lastOkTs = info.ok ? info.ts : (prev.lastOkTs || 0);
      map[name] = rec;
      var minTs = info.ts - AUTO_SYNC_FORGET_DAYS_ * 86400000;
      var names = Object.keys(map).filter(function (n) { return (map[n].ts || 0) >= minTs; });
      names.sort(function (a, b) { return (map[b].ts || 0) - (map[a].ts || 0); });
      var kept = {};
      names.slice(0, AUTO_SYNC_MAX_MACHINES_).forEach(function (n) { kept[n] = map[n]; });
      props.setProperty(AUTO_SYNC_MACHINES_PROP_, JSON.stringify(kept));
    });
  } catch (e) {
    console.error('Không ghi được trạng thái máy đồng bộ: ' + (e && e.message));
  }
}

/** Admin xóa 1 máy khỏi danh sách (máy đã gỡ script / thay máy khác). Máy còn chạy thì lần gửi sau sẽ hiện lại. */
function forgetAutoSyncMachine_(user, p) {
  requireAdmin_(user);
  var name = String((p && p.machine) || '');
  var props = PropertiesService.getScriptProperties();
  withLock_(function () {
    var map = autoSyncMachineMap_(props);
    if (!map[name]) throw appError_('Không tìm thấy máy "' + name + '" trong danh sách.');
    delete map[name];
    props.setProperty(AUTO_SYNC_MACHINES_PROP_, JSON.stringify(map));
  });
  return { status: autoSyncStatus_() };
}

/** Admin tạo khóa mới cho máy chạy đồng bộ tự động (khóa cũ hết hiệu lực). Chỉ trả khóa 1 lần. */
function rotateAutoSyncKey_(user) {
  requireAdmin_(user);
  var key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty(AUTO_SYNC_KEY_PROP_, autoSyncHash_(key));
  return { key: key, url: AUTO_SYNC_WEB_APP_URL_, status: autoSyncStatus_() };
}

function autoSyncJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** doPost: body JSON { key, machine, files: [{ p: "12_HoSo_TrinhKy/…/ten file.pdf", d: "yyyy-MM-dd" }], error? }. */
function autoSyncPost_(e) {
  var props = PropertiesService.getScriptProperties();
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return autoSyncJson_({ ok: false, error: 'Dữ liệu không hợp lệ.' }); }
  var hash = props.getProperty(AUTO_SYNC_KEY_PROP_);
  if (!hash || !body.key || autoSyncHash_(body.key) !== hash) return autoSyncJson_({ ok: false, error: 'Khóa đồng bộ tự động không đúng.' });
  var now = new Date();
  var info = { at: Utilities.formatDate(now, APP_CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm'), ts: now.getTime(),
               machine: String(body.machine || '').trim().slice(0, 60) };
  try {
    if (body.error) throw appError_(String(body.error).slice(0, 300));
    var files = body.files;
    if (!(files instanceof Array)) throw appError_('Thiếu danh sách file.');
    var plan = buildAutoSyncPlan_(files);
    var res = plan.changes.length || plan.creates.length
      ? applyFolderSync_(autoSyncUser_(), { changes: plan.changes, owners: [], creates: plan.creates })
      : { skipped: [] };
    info.files = plan.total; info.changed = res.folderSync ? res.folderSync.changed : 0; info.created = res.folderSync ? res.folderSync.created : 0;
    info.skipped = (res.skipped || []).length + plan.conflicts + plan.dupWeb;
    info.ok = true;
    recordAutoSyncRun_(props, info);
    return autoSyncJson_({ ok: true, info: info });
  } catch (err) {
    info.ok = false;
    info.error = err && err.message ? String(err.message).slice(0, 300) : String(err);
    recordAutoSyncRun_(props, info);
    if (!err.appCode) console.error(err && err.stack ? err.stack : err);
    return autoSyncJson_({ ok: false, error: info.error });
  }
}

/** Bỏ đuôi file (.pdf, .xlsx…) — như stripExt ở client. */
function stripFileExt_(name) { return String(name).replace(/\.(?=[a-z0-9]*[a-z])[a-z0-9]{2,5}$/i, ''); }
function isJunkFile_(name) {
  var n = String(name).toLowerCase();
  return n.indexOf('~$') === 0 || n.charAt(0) === '.' || n === 'thumbs.db' || n === 'desktop.ini';
}

/**
 * Lập kế hoạch như buildSyncPlan ở client (App.html) với lựa chọn mặc định của bảng xem trước:
 * { changes: [{ id, from, status, date }], creates: [{ title, owner, status, date }], total, conflicts, dupWeb }.
 */
function buildAutoSyncPlan_(files) {
  var rules = FOLDER_SYNC.RULES.map(function (r) {
    return { segs: r.path.split('/').map(syncTitleKey_), status: r.status };
  }).sort(function (a, b) { return b.segs.length - a.segs.length; });
  function ruleFor(dirs) {
    for (var i = 0; i < rules.length; i++) {
      var segs = rules[i].segs;
      for (var k = 0; k + segs.length <= dirs.length; k++) {
        var ok = true;
        for (var j = 0; j < segs.length && ok; j++) ok = dirs[k + j] === segs[j];
        if (ok) return { status: rules[i].status, end: k + segs.length };
      }
    }
    return null;
  }
  var subs = readTable_('Submissions');
  var webByKey = {};
  subs.forEach(function (s) { var k = syncTitleKey_(s.title); (webByKey[k] = webByKey[k] || []).push(s); });
  function webKey(name, isFile) {
    var k = syncTitleKey_(isFile ? stripFileExt_(name) : name);
    if (webByKey[k]) return k;
    k = syncTitleKey_(name);
    return webByKey[k] ? k : null;
  }
  var byInitials = {};
  readTable_('Users').forEach(function (u) {
    if (u.initials && toBool_(u.active)) byInitials[String(u.initials).toUpperCase()] = normalizeUsername_(u.username);
  });
  var INI_RE = /(?:[\s_\-]+\(?|\()([A-Za-z]{2,6})\)?\s*$/;
  function trailingInitials(base) {
    var m = String(base).match(INI_RE);
    var code = m && m[1].toUpperCase();
    return code && byInitials[code] ? { code: code, owner: byInitials[code], rest: base.slice(0, m.index) } : null;
  }
  var keep = function (map, key, iso) { if (iso && (!map[key] || iso > map[key])) map[key] = iso; };
  var isoDay = function (d) { d = String(d || ''); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ''; };

  var items = {}, fresh = {}, total = 0;
  files.forEach(function (f) {
    var parts = String((f && f.p) || '').split('/').filter(function (x) { return x !== ''; });
    var name = parts.pop();
    if (!name || isJunkFile_(name)) return;
    total++;
    var day = isoDay(f.d);
    var rule = ruleFor(parts.map(syncTitleKey_));
    if (!rule) return;
    var found = false;
    for (var d = rule.end; d <= parts.length; d++) {
      var isFile = d === parts.length;
      var raw = isFile ? name : parts[d];
      var ini = trailingInitials(isFile ? stripFileExt_(raw) : raw);
      var key = webKey(raw, isFile);
      if (!key && ini) key = webKey(ini.rest, false);
      if (!key) continue;
      found = true;
      var it = items[key] || (items[key] = { statuses: [], dates: {} });
      if (it.statuses.indexOf(rule.status) < 0) it.statuses.push(rule.status);
      keep(it.dates, rule.status, day);
    }
    if (!found) {
      var base = stripFileExt_(name).replace(/\s+/g, ' ').trim();
      var fini = trailingInitials(base);
      if (fini && FOLDER_SYNC.CREATE_INITIALS.indexOf(fini.code) >= 0) {
        var fk = syncTitleKey_(base);
        var fi = fresh[fk] || (fresh[fk] = { title: base, owner: fini.owner, statuses: [], dates: {} });
        if (fi.statuses.indexOf(rule.status) < 0) fi.statuses.push(rule.status);
        keep(fi.dates, rule.status, day);
      }
    }
  });

  var plan = { changes: [], creates: [], total: total, conflicts: 0, dupWeb: 0 };
  Object.keys(items).forEach(function (k) {
    var it = items[k], web = webByKey[k];
    if (web.length > 1) { plan.dupWeb++; return; }
    var sub = web[0];
    if (String(sub.status) === APPROVED_STATUS) return;      // Đã duyệt luôn giữ nguyên
    if (it.statuses.length > 1) { plan.conflicts++; return; } // file ở nhiều thư mục: để đồng bộ thủ công chọn
    if (it.statuses[0] === String(sub.status)) return;
    plan.changes.push({ id: String(sub.id), from: String(sub.status), status: it.statuses[0], date: it.dates[it.statuses[0]] || '' });
  });
  Object.keys(fresh).forEach(function (k) {
    var it = fresh[k];
    if (it.statuses.length !== 1) { plan.conflicts++; return; }
    plan.creates.push({ title: it.title, owner: it.owner, status: it.statuses[0], date: it.dates[it.statuses[0]] || '' });
  });
  return plan;
}
