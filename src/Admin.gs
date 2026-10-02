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
  return readTable_('Users').map(adminUserView_);
}

function validateUserFields_(payload) {
  var displayName = String(payload.displayName || '').trim();
  if (!displayName) throw appError_('Vui lòng nhập họ tên.');
  var position = String(payload.position || '');
  if (!isValidPosition_(position)) throw appError_('Chức danh không hợp lệ.');
  return { displayName: displayName.slice(0, 100), position: position, isAdmin: !!payload.isAdmin };
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
    var rec = {
      username: username, displayName: fields.displayName, position: fields.position, isAdmin: fields.isAdmin,
      active: true, createdAt: today_()
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
    rec.displayName = fields.displayName;
    rec.position = fields.position;
    rec.isAdmin = fields.isAdmin;
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
