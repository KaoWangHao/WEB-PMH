/**
 * Đồng bộ tình trạng hồ sơ từ thư mục chia sẻ.
 * Trình duyệt của Trưởng phòng đọc tên file trong thư mục (xem FOLDER_SYNC ở Config.gs), so khớp tên file
 * (bỏ đuôi, không phân biệt hoa/thường) với tên hồ sơ trên web và cho xem trước; file không có trên web bị bỏ qua (không tạo mới).
 * Server chỉ nhận danh sách đổi tình trạng đã được xác nhận và kiểm tra lại trước khi ghi.
 */

var FOLDER_SYNC_PROP_ = 'LAST_FOLDER_SYNC';

/** Khóa so tên như client (syncKey): NFC, gộp khoảng trắng, không phân biệt hoa/thường. */
function syncTitleKey_(title) {
  var s = String(title || '');
  if (s.normalize) s = s.normalize('NFC');
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Ký hiệu ở cuối tên: "..._TP_CQH" / "... (CQH)" / "... - CQH" → "CQH"; không có → ''. */
function trailingInitials_(title) {
  var m = String(title || '').match(/(?:[\s_\-]+\(?|\()([A-Za-z]{2,6})\)?\s*$/);
  return m ? m[1].toUpperCase() : '';
}

function lastFolderSync_() {
  var raw = PropertiesService.getScriptProperties().getProperty(FOLDER_SYNC_PROP_);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

/**
 * payload.changes: [{ id, from, status }] — đổi tình trạng hồ sơ đã có (from = tình trạng lúc xem trước).
 * payload.owners:  [{ id, from, owner }]  — đổi chuyên viên phụ trách theo ký hiệu cuối tên file (from = người phụ trách lúc xem trước).
 * Mỗi hồ sơ ghi 1 dòng History (gộp cả đổi tình trạng và đổi chuyên viên nếu có).
 * payload.creates: [{ title, owner, status }] — tạo hồ sơ mới cho file chưa có trên web, tên kết thúc bằng ký hiệu
 *                  trong FOLDER_SYNC.CREATE_INITIALS (owner = tài khoản có ký hiệu đó).
 * Mọi tài khoản đều đồng bộ được: chuyên viên chỉ đổi tình trạng / tạo hồ sơ của chính mình (canEditSubmission_);
 * đổi chuyên viên phụ trách chỉ dành cho Trưởng phòng/admin.
 */
function applyFolderSync_(user, payload) {
  var changes = (payload && payload.changes) || [];
  var owners = (payload && payload.owners) || [];
  var creates = (payload && payload.creates) || [];
  if (!(changes instanceof Array) || !(owners instanceof Array) || !(creates instanceof Array)) throw appError_('Dữ liệu đồng bộ không hợp lệ.');
  if (owners.length && !user.isManager) throw appError_('Chỉ Trưởng phòng được đổi chuyên viên phụ trách.', 'FORBIDDEN');
  if (changes.length + owners.length + creates.length > FOLDER_SYNC.MAX_ITEMS) {
    throw appError_('Quá nhiều hồ sơ trong một lần đồng bộ (tối đa ' + FOLDER_SYNC.MAX_ITEMS + ').');
  }

  return withLock_(function () {
    var date = today_();
    var subs = readTable_('Submissions');
    var byId = {};
    subs.forEach(function (s) { byId[String(s.id)] = s; });
    var userInfo = {};
    readTable_('Users').forEach(function (u) {
      userInfo[normalizeUsername_(u.username)] = { name: String(u.displayName || u.username), active: toBool_(u.active),
                                                   initials: String(u.initials || '').toUpperCase() };
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
      if (!canEditSubmission_(user, rec)) { skipped.push({ title: rec.title, reason: 'Bạn chỉ được cập nhật hồ sơ của chính mình.' }); return; }
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

    // Tạo mới: tên phải kết thúc bằng ký hiệu của chính chuyên viên được gán, ký hiệu nằm trong danh sách cho phép,
    // chưa có hồ sơ cùng tên; chuyên viên chỉ tạo được cho chính mình.
    var byKey = {};
    subs.forEach(function (s) { byKey[syncTitleKey_(s.title)] = true; });
    var newRecs = [];
    var nextNum = parseInt(nextSubmissionId_().slice(-4), 10);
    var prefix = 'HS-' + date.slice(-4) + '-';
    creates.forEach(function (c) {
      c = c || {};
      var title;
      try { title = cleanTitle_(c.title); } catch (e) { skipped.push({ title: String(c.title || ''), reason: e.message }); return; }
      var owner = normalizeUsername_(c.owner);
      var status = String(c.status || '');
      var info = userInfo[owner];
      var ini = trailingInitials_(title);
      if (!info || !info.active) { skipped.push({ title: title, reason: 'Chuyên viên không hợp lệ hoặc đã bị khóa.' }); return; }
      if (!ini || FOLDER_SYNC.CREATE_INITIALS.indexOf(ini) < 0 || info.initials !== ini) {
        skipped.push({ title: title, reason: 'Tên không kết thúc bằng ký hiệu của chuyên viên được gán.' }); return;
      }
      if (!user.isManager && owner !== user.username) { skipped.push({ title: title, reason: 'Bạn chỉ được tạo hồ sơ của chính mình.' }); return; }
      if (!isValidStatus_(status)) { skipped.push({ title: title, reason: 'Tình trạng không hợp lệ.' }); return; }
      var key = syncTitleKey_(title);
      if (byKey[key]) { skipped.push({ title: title, reason: 'Đã có hồ sơ cùng tên trên web.' }); return; }
      byKey[key] = true;
      var rec = { id: prefix + ('000' + nextNum++).slice(-4), title: title, owner: owner, createdAt: date, submittedAt: '' };
      applyStatusDates_(rec, status, date);
      newRecs.push(rec);
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

    var firstSub = appendRows_('Submissions', newRecs);
    newRecs.forEach(function (r, i) {
      r._row = firstSub + i;
      touched.push(r);
      hist.push({ submissionId: r.id, fromStatus: '', toStatus: r.status, actor: user.username, note: FOLDER_SYNC.CREATE_NOTE, date: date });
    });

    var firstHist = appendRows_('History', hist);
    hist.forEach(function (h, i) { h._row = firstHist + i; });

    var info = {
      at: Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm'),
      by: user.username,
      changed: order.filter(function (id) { return plan[id].status; }).length,
      reassigned: order.filter(function (id) { return plan[id].owner; }).length,
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
