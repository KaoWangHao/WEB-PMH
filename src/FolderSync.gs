/**
 * Đồng bộ tình trạng hồ sơ từ thư mục chia sẻ.
 * Trình duyệt của Trưởng phòng đọc tên file trong thư mục (xem FOLDER_SYNC ở Config.gs), so khớp CHÍNH XÁC
 * với tên hồ sơ trên web và cho xem trước; file không có trên web bị bỏ qua (không tạo mới).
 * Server chỉ nhận danh sách đổi tình trạng đã được xác nhận và kiểm tra lại trước khi ghi.
 */

var FOLDER_SYNC_PROP_ = 'LAST_FOLDER_SYNC';

function lastFolderSync_() {
  var raw = PropertiesService.getScriptProperties().getProperty(FOLDER_SYNC_PROP_);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/** payload.changes: [{ id, from, status }] — đổi tình trạng hồ sơ đã có (from = tình trạng lúc xem trước). */
function applyFolderSync_(user, payload) {
  requireManager_(user);
  var changes = (payload && payload.changes) || [];
  if (!(changes instanceof Array)) throw appError_('Dữ liệu đồng bộ không hợp lệ.');
  if (changes.length > FOLDER_SYNC.MAX_ITEMS) {
    throw appError_('Quá nhiều hồ sơ trong một lần đồng bộ (tối đa ' + FOLDER_SYNC.MAX_ITEMS + ').');
  }

  return withLock_(function () {
    var date = today_();
    var subs = readTable_('Submissions');
    var byId = {};
    subs.forEach(function (s) { byId[String(s.id)] = s; });

    var skipped = [];
    var touched = [];
    var hist = [];
    var seen = {};

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
      applyStatusDates_(rec, status, date);
      writeObj_('Submissions', rec._row, rec);
      touched.push(rec);
      hist.push({ submissionId: rec.id, fromStatus: oldStatus, toStatus: status, actor: user.username,
                  note: FOLDER_SYNC.NOTE, date: date });
    });

    var firstHist = appendRows_('History', hist);
    hist.forEach(function (h, i) { h._row = firstHist + i; });

    var info = {
      at: Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm'),
      by: user.username,
      changed: touched.length
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
