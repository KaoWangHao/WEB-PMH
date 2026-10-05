/**
 * Quản trị tài khoản (chỉ admin). Không có chức năng tự đăng ký:
 * admin tạo tài khoản với mật khẩu tạm, người dùng phải đổi ở lần đăng nhập đầu tiên.
 */

function adminUserView_(rec) {
  var p = publicUser_(rec);
  var lockedUntil = Number(rec.lockedUntil) || 0;
  p.locked = lockedUntil > Date.now();
  p.createdAt = dmyToIso_(rec.createdAt);
  return p;
}

function listUsers_(user) {
  requireAdmin_(user);
  ensureUserInitials_();
  return readTable_('Users').map(adminUserView_);
}

function plainName_(s) {
  s = String(s || '');
  if (s.normalize) s = s.normalize('NFD');
  return s.replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * 1 lần (cờ USERS_INITIALS_V1): ghi header cột "initials" cho sheet Users cũ và tự điền ký hiệu theo
 * USER_INITIALS_HINTS cho tài khoản có họ tên trùng, chưa có ký hiệu và ký hiệu đó chưa ai dùng.
 */
function ensureUserInitials_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('USERS_INITIALS_V1')) return;
  withLock_(function () {
    if (props.getProperty('USERS_INITIALS_V1')) return;
    var headers = SHEET_HEADERS.Users;
    var col = headers.indexOf('initials') + 1;
    var sh = sheet_('Users');
    var cell = sh.getRange(1, col, 1, 1);
    if (!cell.getValues()[0][0]) { cell.setValues([['initials']]); cell.setFontWeight('bold'); }
    var users = readTable_('Users');
    var used = {};
    users.forEach(function (u) { if (u.initials) used[String(u.initials).toUpperCase()] = true; });
    Object.keys(USER_INITIALS_HINTS).forEach(function (code) {
      if (used[code]) return;
      var target = plainName_(USER_INITIALS_HINTS[code]);
      var match = users.filter(function (u) { return !u.initials && plainName_(u.displayName) === target; });
      if (match.length !== 1) return;
      match[0].initials = code;
      writeObj_('Users', match[0]._row, match[0]);
      used[code] = true;
    });
    props.setProperty('USERS_INITIALS_V1', new Date().toISOString());
  });
}

/** Ký hiệu: 2–6 chữ cái không dấu, viết hoa; rỗng = không dùng. */
function normalizeInitials_(v) {
  var s = String(v || '').trim().toUpperCase();
  if (!s) return '';
  if (!/^[A-Z]{2,6}$/.test(s)) throw appError_('Ký hiệu gồm 2–6 chữ cái không dấu, vd CQH.');
  return s;
}

function checkInitialsFree_(initials, username) {
  if (!initials) return;
  readTable_('Users').forEach(function (u) {
    if (String(u.initials || '').toUpperCase() === initials && normalizeUsername_(u.username) !== username) {
      throw appError_('Ký hiệu ' + initials + ' đã dùng cho tài khoản ' + u.username + '.');
    }
  });
}

function validateUserFields_(payload) {
  var displayName = String(payload.displayName || '').trim();
  if (!displayName) throw appError_('Vui lòng nhập họ tên.');
  var position = String(payload.position || '');
  if (!isValidPosition_(position)) throw appError_('Chức danh không hợp lệ.');
  return { displayName: displayName.slice(0, 100), position: position, isAdmin: !!payload.isAdmin,
           initials: normalizeInitials_(payload.initials) };
}

function createUser_(user, payload) {
  requireAdmin_(user);
  var username = normalizeUsername_(payload && payload.username);
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw appError_('Tên tài khoản 3–32 ký tự, chỉ gồm chữ thường không dấu, số và . _ -');
  }
  var fields = validateUserFields_(payload || {});
  validatePassword_(payload.password);

  return withLock_(function () {
    if (findUserRecord_(username)) throw appError_('Tài khoản "' + username + '" đã tồn tại.');
    checkInitialsFree_(fields.initials, username);
    var rec = {
      username: username, displayName: fields.displayName, position: fields.position, isAdmin: fields.isAdmin,
      active: true, createdAt: today_(), initials: fields.initials
    };
    setPassword_(rec, String(payload.password), true);
    rec._row = appendObj_('Users', rec);
    return adminUserView_(rec);
  });
}

function updateUser_(user, payload) {
  requireAdmin_(user);
  var username = normalizeUsername_(payload && payload.username);
  var fields = validateUserFields_(payload || {});
  var active = payload.active !== false;
  if (username === user.username && (!fields.isAdmin || !active)) {
    throw appError_('Bạn không thể tự gỡ quyền admin hoặc tự khóa tài khoản của mình.');
  }
  return withLock_(function () {
    var rec = findUserRecord_(username);
    if (!rec) throw appError_('Không tìm thấy tài khoản.');
    checkInitialsFree_(fields.initials, username);
    rec.displayName = fields.displayName;
    rec.position = fields.position;
    rec.isAdmin = fields.isAdmin;
    rec.initials = fields.initials;
    rec.active = active;
    if (active) { rec.lockedUntil = ''; rec.failedAttempts = 0; }
    writeObj_('Users', rec._row, rec);
    return adminUserView_(rec);
  });
}

function resetUserPassword_(user, payload) {
  requireAdmin_(user);
  var username = normalizeUsername_(payload && payload.username);
  validatePassword_(payload && payload.password);
  return withLock_(function () {
    var rec = findUserRecord_(username);
    if (!rec) throw appError_('Không tìm thấy tài khoản.');
    setPassword_(rec, String(payload.password), true);
    writeObj_('Users', rec._row, rec);
    return adminUserView_(rec);
  });
}

/**
 * Xóa hẳn tài khoản (chỉ admin; theo người dùng: "cấp quyền xóa tài khoản cho admin"). payload: { username, transferTo? }.
 * - Không xóa được chính mình (nên luôn còn ít nhất 1 admin).
 * - Hồ sơ của tài khoản bị xóa: transferTo = tài khoản đang hoạt động → chuyển chuyên viên phụ trách sang người đó (mỗi hồ sơ ghi
 *   1 dòng History); bỏ trống → giữ nguyên (hồ sơ vẫn ghi tên đăng nhập cũ, Trưởng phòng / admin vẫn sửa được).
 * - Phiên đăng nhập của tài khoản bị xóa hết hiệu lực ở lần gọi tiếp theo (requireSession_ không còn thấy tài khoản).
 */
function deleteUser_(user, payload) {
  requireAdmin_(user);
  var username = normalizeUsername_(payload && payload.username);
  var transferTo = normalizeUsername_(payload && payload.transferTo);
  if (!username) throw appError_('Thiếu tài khoản cần xóa.');
  if (username === user.username) throw appError_('Bạn không thể tự xóa tài khoản của mình.');
  if (transferTo === username) throw appError_('Hãy chọn tài khoản khác để chuyển hồ sơ.');
  return withLock_(function () {
    var rec = findUserRecord_(username);
    if (!rec) throw appError_('Không tìm thấy tài khoản "' + username + '".');
    var target = null;
    if (transferTo) {
      target = findUserRecord_(transferTo);
      if (!target || !toBool_(target.active)) throw appError_('Tài khoản nhận hồ sơ "' + transferTo + '" không tồn tại hoặc đã khóa.');
    }
    var moved = [];
    if (target) {
      var date = today_(), hist = [];
      var note = 'Xóa tài khoản ' + String(rec.displayName || username) + ': đổi chuyên viên → ' + String(target.displayName || transferTo);
      readTable_('Submissions').forEach(function (s) {
        if (normalizeUsername_(s.owner) !== username) return;
        s.owner = transferTo; s.updatedAt = date;
        writeObj_('Submissions', s._row, s);
        moved.push(s.id);
        hist.push({ submissionId: s.id, fromStatus: s.status, toStatus: s.status, actor: user.username, note: note, date: date });
      });
      appendRows_('History', hist);
    }
    deleteRows_('Users', [rec._row]);
    PropertiesService.getScriptProperties().deleteProperty(NOTIF_PREFIX_ + username);
    // KHMS: bỏ / thay tài khoản này trong phân công chuyên viên phụ trách dự án.
    if (typeof replaceAssignOwner_ === 'function') replaceAssignOwner_(username, target ? transferTo : '');
    return { username: username, transferred: moved.length };
  });
}
