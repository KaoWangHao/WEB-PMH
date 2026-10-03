/**
 * Đăng nhập bằng tài khoản riêng của ứng dụng (không dùng tài khoản Google).
 * Mật khẩu lưu dạng hash SHA-256 nhiều vòng + salt ngẫu nhiên; phiên đăng nhập lưu trong CacheService.
 */

var SESSION_PREFIX = 'sess_';

function bytesToHex_(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    hex += (b < 16 ? '0' : '') + b.toString(16);
  }
  return hex;
}

function hashPassword_(password, salt) {
  var h = salt + ':' + password;
  for (var i = 0; i < APP_CONFIG.HASH_ROUNDS; i++) {
    h = bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  }
  return h;
}

function newSalt_() {
  return Utilities.getUuid().replace(/-/g, '');
}

/** So sánh chuỗi với thời gian không phụ thuộc nội dung. */
function safeEquals_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normalizeUsername_(u) {
  return String(u || '').trim().toLowerCase();
}

function findUserRecord_(username) {
  username = normalizeUsername_(username);
  var users = readTable_('Users');
  for (var i = 0; i < users.length; i++) {
    if (normalizeUsername_(users[i].username) === username) return users[i];
  }
  return null;
}

function publicUser_(rec) {
  return {
    username: normalizeUsername_(rec.username),
    displayName: String(rec.displayName || rec.username),
    position: String(rec.position || 'CV'),
    isAdmin: toBool_(rec.isAdmin),
    isManager: isManagerPosition_(String(rec.position)) || toBool_(rec.isAdmin),
    active: toBool_(rec.active),
    mustChangePassword: toBool_(rec.mustChangePassword),
    initials: String(rec.initials || '')
  };
}

function validatePassword_(pw) {
  if (!pw || String(pw).length < APP_CONFIG.MIN_PASSWORD_LENGTH) {
    throw appError_('Mật khẩu phải có ít nhất ' + APP_CONFIG.MIN_PASSWORD_LENGTH + ' ký tự.');
  }
}

function setPassword_(rec, password, mustChange) {
  var salt = newSalt_();
  rec.salt = salt;
  rec.passwordHash = hashPassword_(password, salt);
  rec.mustChangePassword = !!mustChange;
  rec.failedAttempts = 0;
  rec.lockedUntil = '';
}

function login_(payload) {
  var username = normalizeUsername_(payload && payload.username);
  var password = String((payload && payload.password) || '');
  if (!username || !password) throw appError_('Vui lòng nhập tài khoản và mật khẩu.');

  return withLock_(function () {
    var rec = findUserRecord_(username);
    var generic = 'Tài khoản hoặc mật khẩu không đúng.';
    if (!rec) throw appError_(generic);
    if (!toBool_(rec.active)) throw appError_('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');

    var now = Date.now();
    var lockedUntil = Number(rec.lockedUntil) || 0;
    if (lockedUntil > now) {
      var mins = Math.ceil((lockedUntil - now) / 60000);
      throw appError_('Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ' + mins + ' phút.');
    }

    if (!safeEquals_(hashPassword_(password, String(rec.salt)), rec.passwordHash)) {
      var failed = (Number(rec.failedAttempts) || 0) + 1;
      rec.failedAttempts = failed;
      if (failed >= APP_CONFIG.MAX_FAILED_LOGINS) {
        rec.failedAttempts = 0;
        rec.lockedUntil = now + APP_CONFIG.LOCK_MINUTES * 60000;
      }
      writeObj_('Users', rec._row, rec);
      throw appError_(generic);
    }

    if (Number(rec.failedAttempts) || rec.lockedUntil) {
      rec.failedAttempts = 0;
      rec.lockedUntil = '';
      writeObj_('Users', rec._row, rec);
    }

    var token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
    CacheService.getScriptCache().put(SESSION_PREFIX + token, normalizeUsername_(rec.username), APP_CONFIG.SESSION_SECONDS);
    return { token: token, me: publicUser_(rec) };
  });
}

function logout_(token) {
  if (token) CacheService.getScriptCache().remove(SESSION_PREFIX + token);
  return true;
}

/** Trả về user đang đăng nhập (đọc lại từ sheet để quyền luôn mới nhất), hoặc lỗi AUTH. */
function requireSession_(token) {
  if (!token) throw appError_('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'AUTH');
  var cache = CacheService.getScriptCache();
  var username = cache.get(SESSION_PREFIX + token);
  if (!username) throw appError_('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'AUTH');
  var rec = findUserRecord_(username);
  if (!rec || !toBool_(rec.active)) {
    cache.remove(SESSION_PREFIX + token);
    throw appError_('Tài khoản không còn hoạt động.', 'AUTH');
  }
  cache.put(SESSION_PREFIX + token, username, APP_CONFIG.SESSION_SECONDS); // gia hạn phiên
  return publicUser_(rec);
}

function requireManager_(user) {
  if (!user.isManager) throw appError_('Bạn không có quyền truy cập chức năng này.', 'FORBIDDEN');
}

function requireAdmin_(user) {
  if (!user.isAdmin) throw appError_('Chỉ quản trị viên mới dùng được chức năng này.', 'FORBIDDEN');
}

/** Chuyên viên chỉ sửa hồ sơ của mình; Trưởng phòng/GĐTM/Admin sửa được mọi hồ sơ. */
function canEditSubmission_(user, sub) {
  return user.isManager || normalizeUsername_(sub.owner) === user.username;
}

function changePassword_(user, payload) {
  var oldPw = String((payload && payload.oldPassword) || '');
  var newPw = String((payload && payload.newPassword) || '');
  validatePassword_(newPw);
  if (oldPw === newPw) throw appError_('Mật khẩu mới phải khác mật khẩu cũ.');
  return withLock_(function () {
    var rec = findUserRecord_(user.username);
    if (!safeEquals_(hashPassword_(oldPw, String(rec.salt)), rec.passwordHash)) {
      throw appError_('Mật khẩu hiện tại không đúng.');
    }
    setPassword_(rec, newPw, false);
    writeObj_('Users', rec._row, rec);
    return publicUser_(rec);
  });
}
