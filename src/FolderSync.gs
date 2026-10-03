/**
 * Đồng bộ tình trạng hồ sơ từ thư mục chia sẻ.
 * Trình duyệt của Trưởng phòng đọc tên file trong thư mục (xem FOLDER_SYNC ở Config.gs), so khớp và cho xem trước;
 * server chỉ nhận danh sách thay đổi đã được xác nhận và kiểm tra lại toàn bộ trước khi ghi.
 */

var FOLDER_SYNC_PROP_ = 'LAST_FOLDER_SYNC';

/** Khóa so khớp tên hồ sơ: không phân biệt hoa/thường, khoảng trắng thừa, cách gõ dấu (NFC/NFD). */
function titleKey_(title) {
  var s = String(title || '');
  if (s.normalize) s = s.normalize('NFC');
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function lastFolderSync_() {
  var raw = PropertiesService.getScriptProperties().getProperty(FOLDER_SYNC_PROP_);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/**
 * payload.changes: [{ id, from, status }] — đổi tình trạng hồ sơ đã có (from = tình trạng lúc xem trước).
 * payload.creates: [{ title, owner, status }] — tạo hồ sơ mới cho file chưa có trên web.
 */
function applyFolderSync_(user, payload) {
  requireManager_(user);
  var changes = (payload && payload.changes) || [];
  var creates = (payload && payload.creates) || [];
  if (!(changes instanceof Array) || !(creates instanceof Array)) throw appError_('Dữ liệu đồng bộ không hợp lệ.');
  if (changes.length + creates.length > FOLDER_SYNC.MAX_ITEMS) {
    throw appError_('Quá nhiều hồ sơ trong một lần đồng bộ (tối đa ' + FOLDER_SYNC.MAX_ITEMS + ').');
  }

  var activeOwners = {};
  readTable_('Users').forEach(function (u) {
    if (toBool_(u.active)) activeOwners[normalizeUsername_(u.username)] = true;
  });

  return withLock_(function () {
    var date = today_();
    var subs = readTable_('Submissions');
    var byId = {};
    var byKey = {};
    subs.forEach(function (s) {
      byId[String(s.id)] = s;
      var k = titleKey_(s.title);
      byKey[k] = (byKey[k] || 0) + 1;
    });

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

    var newRecs = [];
    var nextNum = parseInt(nextSubmissionId_().slice(-4), 10);
    var prefix = 'HS-' + date.slice(-4) + '-';
    creates.forEach(function (c) {
      c = c || {};
      var title;
      try { title = cleanTitle_(c.title); } catch (e) { skipped.push({ title: String(c.title || ''), reason: e.message }); return; }
      var owner = normalizeUsername_(c.owner);
      var status = String(c.status || '');
      var key = titleKey_(title);
      if (byKey[key]) { skipped.push({ title: title, reason: 'Đã có hồ sơ cùng tên trên web.' }); return; }
      if (!activeOwners[owner]) { skipped.push({ title: title, reason: 'Chuyên viên không hợp lệ hoặc đã bị khóa.' }); return; }
      if (!isValidStatus_(status)) { skipped.push({ title: title, reason: 'Tình trạng không hợp lệ.' }); return; }
      byKey[key] = 1;
      var rec = { id: prefix + ('000' + nextNum++).slice(-4), title: title, owner: owner, createdAt: date, submittedAt: '' };
      applyStatusDates_(rec, status, date);
      newRecs.push(rec);
      hist.push({ submissionId: rec.id, fromStatus: '', toStatus: status, actor: user.username,
                  note: FOLDER_SYNC.NOTE, date: date });
    });

    var firstSub = appendRows_('Submissions', newRecs);
    newRecs.forEach(function (r, i) { r._row = firstSub + i; touched.push(r); });
    var firstHist = appendRows_('History', hist);
    hist.forEach(function (h, i) { h._row = firstHist + i; });

    var info = {
      at: Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm'),
      by: user.username,
      changed: touched.length - newRecs.length,
      created: newRecs.length
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
