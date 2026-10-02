/**
 * Cấu hình chung của ứng dụng.
 * Có thể chỉnh APP_CONFIG (tên, logo, helpdesk) rồi `clasp push` lại.
 */
var APP_CONFIG = {
  APP_NAME: 'HỆ THỐNG THEO DÕI HỒ SƠ',
  SHORT_NAME: 'HỒ SƠ',
  // Link ảnh logo công khai (để trống sẽ dùng logo chữ mặc định).
  LOGO_URL: '',
  // Nội dung hiện khi bấm "Helpdesk" ở trang đăng nhập.
  HELPDESK: 'Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ.',
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  SESSION_SECONDS: 6 * 60 * 60,
  MAX_FAILED_LOGINS: 5,
  LOCK_MINUTES: 15,
  HASH_ROUNDS: 2000,
  MIN_PASSWORD_LENGTH: 6,
  MAX_TITLE_LENGTH: 300
};

/** 6 tình trạng hồ sơ cố định. Mã của các tình trạng "Đang trình" trùng mã chức danh tương ứng. */
var STATUSES = [
  { code: 'CV',       label: 'Hồ sơ trong ổ Chuyên viên', short: 'Trong ổ Chuyên viên', color: '#3FB2D1' },
  { code: 'TP_MH',    label: 'Đang trình TP.MH',          short: 'Đang trình TP.MH',    color: '#4A90D9' },
  { code: 'GDTM',     label: 'Đang trình GĐTM',           short: 'Đang trình GĐTM',     color: '#3FA57A' },
  { code: 'TP_CC',    label: 'Đang trình TP.C&C',         short: 'Đang trình TP.C&C',   color: '#E9A23B' },
  { code: 'TRA_LAI',  label: 'Trả lại hồ sơ',             short: 'Trả lại hồ sơ',       color: '#DD5A4C' },
  { code: 'DA_DUYET', label: 'Đã duyệt',                  short: 'Đã duyệt',            color: '#7CB342' }
];

/** Các tình trạng "Đang trình …" — lần đầu chuyển sang sẽ ghi nhận ngày trình. */
var SUBMITTING_STATUSES = ['TP_MH', 'GDTM', 'TP_CC'];
var APPROVED_STATUS = 'DA_DUYET';
var DEFAULT_STATUS = 'CV';

/** Chức danh. Trưởng phòng / GĐTM được xem dashboard tổng hợp và sửa mọi hồ sơ. */
var POSITIONS = [
  { code: 'CV',    label: 'Chuyên viên', manager: false },
  { code: 'TP_MH', label: 'TP.MH',       manager: true },
  { code: 'TP_CC', label: 'TP.C&C',      manager: true },
  { code: 'GDTM',  label: 'GĐTM',        manager: true }
];

var SHEET_HEADERS = {
  Users: ['username', 'displayName', 'position', 'isAdmin', 'passwordHash', 'salt',
          'mustChangePassword', 'active', 'failedAttempts', 'lockedUntil', 'createdAt'],
  Submissions: ['id', 'title', 'owner', 'status', 'createdAt', 'submittedAt', 'updatedAt', 'approvedAt'],
  History: ['submissionId', 'fromStatus', 'toStatus', 'actor', 'note', 'date']
};

function isValidStatus_(code) {
  return STATUSES.some(function (s) { return s.code === code; });
}

function isValidPosition_(code) {
  return POSITIONS.some(function (p) { return p.code === code; });
}

function isManagerPosition_(code) {
  return POSITIONS.some(function (p) { return p.code === code && p.manager; });
}

function publicConfig_() {
  return {
    appName: APP_CONFIG.APP_NAME,
    shortName: APP_CONFIG.SHORT_NAME,
    logoUrl: APP_CONFIG.LOGO_URL,
    helpdesk: APP_CONFIG.HELPDESK,
    statuses: STATUSES,
    submittingStatuses: SUBMITTING_STATUSES,
    approvedStatus: APPROVED_STATUS,
    defaultStatus: DEFAULT_STATUS,
    positions: POSITIONS,
    minPasswordLength: APP_CONFIG.MIN_PASSWORD_LENGTH,
    maxTitleLength: APP_CONFIG.MAX_TITLE_LENGTH
  };
}
