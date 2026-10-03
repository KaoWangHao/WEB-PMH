/**
 * Đồng bộ tình trạng hồ sơ từ thư mục chia sẻ.
 * Trình duyệt của Trưởng phòng đọc tên file trong thư mục (xem FOLDER_SYNC ở Config.gs), so khớp tên file
 * (bỏ đuôi, không phân biệt hoa/thường) với tên hồ sơ trên web và cho xem trước; file không có trên web bị bỏ qua (không tạo mới).
 * Server chỉ nhận danh sách đổi tình trạng đã được xác nhận và kiểm tra lại trước khi ghi.
 */

var FOLDER_SYNC_PROP_ = 'LAST_FOLDER_SYNC';

function lastFolderSync_() {
  var raw = PropertiesService.getScriptProperties().getProperty(FOLDER_SYNC_PROP_);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/**
 * payload.changes: [{ id, from, status }] — đổi tình trạng hồ sơ đã có (from = tình trạng lúc xem trước).
 * payload.owners:  [{ id, from, owner }]  — đổi chuyên viên phụ trách theo ký hiệu cuối tên file (from = người phụ trách lúc xem trước).
 * Mỗi hồ sơ ghi 1 dòng History (gộp cả đổi tình trạng và đổi chuyên viên nếu có).
 */
function applyFolderSync_(user, payload) {
  requireManager_(user);
  var changes = (payload && payload.changes) || [];
  var owners = (payload && payload.owners) || [];
  if (!(changes instanceof Array) || !(owners instanceof Array)) throw appError_('Dữ liệu đồng bộ không hợp lệ.');
  if (changes.length + owners.length > FOLDER_SYNC.MAX_ITEMS) {
    throw appError_('Quá nhiều hồ sơ trong một lần đồng bộ (tối đa ' + FOLDER_SYNC.MAX_ITEMS + ').');
  }

  return withLock_(function () {
    var date = today_();
    var subs = readTable_('Submissions');
    var byId = {};
    subs.forEach(function (s) { byId[String(s.id)] = s; });
    var userInfo = {};
    readTable_('Users').forEach(function (u) {
      userInfo[normalizeUsername_(u.username)] = { name: String(u.displayName || u.username), active: toBool_(u.active) };
    });

    var skipped = [];
    var plan = {};   // id → { status?, owner? }
    var order = [];
    var seen = {};
    var planFor = function (id) { if (!plan[id]) { plan[id] = {}; order.push(id); } return plan[id]; };

    changes.forEach(function (c) {
      c = c || {};
      var id = String(c.id || '');
      var status = String(c.status || '');
      var rec = byId[id];
      if (!rec) { skipped.push({ title: id, reason: 'Không tìm thấy hồ sơ trên web.' }); return; }
      if (seen[id]) return;
      seen[id] = true;
      if (!isValidStatus_(status)) { skipped.push({ title: rec.title, reason: 'Tình trạng không hợp lệ.' }); return; }
      var oldStatus = String(rec.status);
      if (oldStatus === status) return;
      if (c.from && String(c.from) !== oldStatus) {
        skipped.push({ title: rec.title, reason: 'Hồ sơ vừa được người khác cập nhật, hãy đồng bộ lại.' });
        return;
      }
      planFor(id).status = status;
    });

    var seenOwner = {};
    owners.forEach(function (c) {
      c = c || {};
      var id = String(c.id || '');
      var rec = byId[id];
      if (!rec) { skipped.push({ title: id, reason: 'Không tìm thấy hồ sơ trên web.' }); return; }
      if (seenOwner[id]) return;
      seenOwner[id] = true;
      var owner = normalizeUsername_(c.owner);
      var oldOwner = normalizeUsername_(rec.owner);
      if (!userInfo[owner] || !userInfo[owner].active) { skipped.push({ title: rec.title, reason: 'Chuyên viên theo ký hiệu không hợp lệ hoặc đã bị khóa.' }); return; }
      if (owner === oldOwner) return;
      if (c.from && normalizeUsername_(c.from) !== oldOwner) {
        skipped.push({ title: rec.title, reason: 'Chuyên viên phụ trách vừa được người khác đổi, hãy đồng bộ lại.' });
        return;
      }
      planFor(id).owner = owner;
    });

    var touched = [];
    var hist = [];
    order.forEach(function (id) {
      var p = plan[id], rec = byId[id];
      var oldStatus = String(rec.status);
      var notes = [FOLDER_SYNC.NOTE];
      if (p.status) applyStatusDates_(rec, p.status, date);
      if (p.owner) {
        var from = userInfo[normalizeUsername_(rec.owner)];
        notes.push('đổi chuyên viên: ' + (from ? from.name : rec.owner) + ' → ' + userInfo[p.owner].name);
        rec.owner = p.owner;
        if (!p.status) rec.updatedAt = date;
      }
      writeObj_('Submissions', rec._row, rec);
      touched.push(rec);
      hist.push({ submissionId: rec.id, fromStatus: oldStatus, toStatus: String(rec.status), actor: user.username,
                  note: notes.join(' · '), date: date });
    });

    var firstHist = appendRows_('History', hist);
    hist.forEach(function (h, i) { h._row = firstHist + i; });

    var info = {
      at: Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm'),
      by: user.username,
      changed: order.filter(function (id) { return plan[id].status; }).length,
      reassigned: order.filter(function (id) { return plan[id].owner; }).length
    };
    PropertiesService.getScriptProperties().setProperty(FOLDER_SYNC_PROP_, JSON.stringify(info));

    return {
      submissions: touched.map(serializeSubmission_),
      history: hist.map(serializeHistory_),
      skipped: skipped,
      folderSync: info
    };
  });
}
