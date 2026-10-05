/**
 * Nghiệp vụ hồ sơ: tạo, cập nhật tình trạng, xóa, và tải dữ liệu cho client.
 * Mọi ngày tháng do server tự ghi (today_()), người dùng không nhập ngày.
 */

function serializeSubmission_(rec) {
  return {
    id: String(rec.id),
    title: String(rec.title),
    owner: normalizeUsername_(rec.owner),
    status: String(rec.status),
    createdAt: dmyToIso_(rec.createdAt),
    submittedAt: dmyToIso_(rec.submittedAt),
    updatedAt: dmyToIso_(rec.updatedAt),
    approvedAt: dmyToIso_(rec.approvedAt)
  };
}

function serializeHistory_(rec) {
  return {
    seq: rec._row,
    submissionId: String(rec.submissionId),
    fromStatus: String(rec.fromStatus || ''),
    toStatus: String(rec.toStatus || ''),
    actor: normalizeUsername_(rec.actor),
    note: String(rec.note || ''),
    date: dmyToIso_(rec.date)
  };
}

/** Dữ liệu cho mọi màn hình. Mọi người dùng đều được xem tất cả hồ sơ (chỉ sửa theo quyền). */
function bootstrap_(user) {
  ensureUserInitials_();
  var users = readTable_('Users').map(function (u) {
    var p = publicUser_(u);
    return { username: p.username, displayName: p.displayName, position: p.position, isAdmin: p.isAdmin, active: p.active,
             initials: p.initials };
  });
  var out = {
    me: user,
    config: publicConfig_(),
    today: dmyToIso_(today_()),
    users: users,
    submissions: readTable_('Submissions').map(serializeSubmission_),
    history: readTable_('History').map(serializeHistory_),
    projects: listProjects_(),
    folderSync: lastFolderSync_(),
    notifSeen: notifSeen_(user)
  };
  // Chức năng mở rộng (Kế hoạch mua sắm khms/, đồng bộ tự động autosync/) thêm dữ liệu của nó.
  [typeof khmsBootstrap_ === 'function' ? khmsBootstrap_ : null,
   typeof autoSyncBootstrap_ === 'function' ? autoSyncBootstrap_ : null].forEach(function (fn) {
    if (!fn) return;
    var extra = fn(user);
    for (var k in extra) out[k] = extra[k];
  });
  return out;
}

function findSubmission_(id) {
  var subs = readTable_('Submissions');
  for (var i = 0; i < subs.length; i++) if (String(subs[i].id) === String(id)) return subs[i];
  return null;
}

function nextSubmissionId_() {
  var year = today_().slice(-4);
  var prefix = 'HS-' + year + '-';
  var max = 0;
  readTable_('Submissions').forEach(function (s) {
    var id = String(s.id);
    if (id.indexOf(prefix) === 0) max = Math.max(max, parseInt(id.slice(prefix.length), 10) || 0);
  });
  return prefix + ('000' + (max + 1)).slice(-4);
}

function cleanTitle_(title) {
  var t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) throw appError_('Vui lòng nhập tên hồ sơ.');
  if (t.length > APP_CONFIG.MAX_TITLE_LENGTH) throw appError_('Tên hồ sơ quá dài (tối đa ' + APP_CONFIG.MAX_TITLE_LENGTH + ' ký tự).');
  return t;
}

function cleanNote_(note) {
  return String(note || '').trim().slice(0, 1000);
}

/** Áp dụng các mốc ngày tự động khi hồ sơ chuyển sang tình trạng mới. */
function applyStatusDates_(rec, newStatus, date) {
  if (SUBMITTING_STATUSES.indexOf(newStatus) >= 0 && !rec.submittedAt) rec.submittedAt = date;
  rec.approvedAt = newStatus === APPROVED_STATUS ? date : '';
  rec.status = newStatus;
  rec.updatedAt = date;
}

function createSubmission_(user, payload) {
  var title = cleanTitle_(payload && payload.title);
  var status = String((payload && payload.status) || DEFAULT_STATUS);
  if (!isValidStatus_(status)) throw appError_('Tình trạng không hợp lệ.');
  var note = cleanNote_(payload && payload.note);

  return withLock_(function () {
    var date = today_();
    var rec = { id: nextSubmissionId_(), title: title, owner: user.username, createdAt: date, submittedAt: '' };
    applyStatusDates_(rec, status, date);
    rec._row = appendObj_('Submissions', rec);
    var hist = { submissionId: rec.id, fromStatus: '', toStatus: status, actor: user.username, note: note, date: date };
    hist._row = appendObj_('History', hist);
    return { submission: serializeSubmission_(rec), history: [serializeHistory_(hist)] };
  });
}

/** Cập nhật tình trạng và/hoặc tên hồ sơ. Mỗi thay đổi ghi 1 dòng lịch sử với ngày hôm nay. */
function updateSubmission_(user, payload) {
  var id = String((payload && payload.id) || '');
  var newStatus = String((payload && payload.status) || '');
  var note = cleanNote_(payload && payload.note);
  var newTitle = payload && payload.title != null ? cleanTitle_(payload.title) : null;
  if (!isValidStatus_(newStatus)) throw appError_('Tình trạng không hợp lệ.');

  return withLock_(function () {
    var rec = findSubmission_(id);
    if (!rec) throw appError_('Không tìm thấy hồ sơ ' + id + '.');
    if (!canEditSubmission_(user, rec)) {
      throw appError_('Bạn chỉ được cập nhật hồ sơ của chính mình.', 'FORBIDDEN');
    }

    var oldStatus = String(rec.status);
    var oldTitle = String(rec.title);
    var titleChanged = newTitle !== null && newTitle !== oldTitle;
    var statusChanged = newStatus !== oldStatus;
    if (!titleChanged && !statusChanged && !note) throw appError_('Không có thay đổi nào để lưu.');

    var date = today_();
    if (titleChanged) rec.title = newTitle;
    if (statusChanged) applyStatusDates_(rec, newStatus, date);
    else rec.updatedAt = date;
    writeObj_('Submissions', rec._row, rec);

    var parts = [];
    if (titleChanged) parts.push('Đổi tên: "' + oldTitle + '" → "' + newTitle + '"');
    if (note) parts.push(note);
    var hist = { submissionId: rec.id, fromStatus: oldStatus, toStatus: newStatus, actor: user.username,
                 note: parts.join(' | '), date: date };
    hist._row = appendObj_('History', hist);
    return { submission: serializeSubmission_(rec), history: [serializeHistory_(hist)] };
  });
}

function deleteSubmission_(user, payload) {
  var id = String((payload && payload.id) || '');
  return withLock_(function () {
    var rec = findSubmission_(id);
    if (!rec) throw appError_('Không tìm thấy hồ sơ ' + id + '.');
    if (!canDeleteSubmission_(user, rec)) throw appError_('Bạn chỉ được xóa hồ sơ của chính mình.', 'FORBIDDEN');
    var histRows = readTable_('History')
      .filter(function (h) { return String(h.submissionId) === id; })
      .map(function (h) { return h._row; });
    deleteRows_('History', histRows);
    deleteRows_('Submissions', [rec._row]);
    shiftNotifSeen_(histRows);
    if (typeof unlinkSubmissionPackages_ === 'function') unlinkSubmissionPackages_(id);
    return { id: id };
  });
}
