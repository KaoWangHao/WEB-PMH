/**
 * Cấu hình chung của ứng dụng.
 * Có thể chỉnh APP_CONFIG (tên, logo, helpdesk) rồi `clasp push` lại.
 */
var APP_CONFIG = {
  APP_NAME: 'CENTRAL PROCUREMENT DEPARTMENT',
  SHORT_NAME: 'CENTRAL',
  // Link ảnh logo công khai (để trống sẽ dùng logo CENTRAL nhúng sẵn trong Brand.html).
  LOGO_URL: '',
  // Icon tab trình duyệt (Apps Script chỉ nhận link ảnh công khai, không nhận data URI).
  FAVICON_URL: 'https://raw.githubusercontent.com/KaoWangHao/WEB-PMH/main/assets/favicon.png',
  // Trang cài ứng dụng lên điện thoại / máy tính (GitHub Pages từ thư mục docs/ của repo).
  INSTALL_URL: 'https://kaowanghao.github.io/WEB-PMH/',
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

/**
 * Đồng bộ tình trạng từ thư mục chia sẻ (Trưởng phòng chọn thư mục gốc trên trình duyệt).
 * Mỗi FILE là một hồ sơ, tên file (bỏ đuôi) phải trùng tên hồ sơ trên web.
 * path: đường dẫn tương đối từ thư mục gốc, ngăn cách bằng "/". Quy tắc dài nhất (cụ thể nhất) được ưu tiên;
 * file trong thư mục con của path cũng tính theo quy tắc đó. File không khớp quy tắc nào sẽ bị bỏ qua.
 */
var FOLDER_SYNC = {
  ROOT_NAME: '12_HoSo_TrinhKy',
  ROOT_HINT: '\\\\HCM-FS01\\fs01\\03_CCM\\01-Private\\C_BAO_CAO\\1_BaoCao_ThuongMai\\12_HoSo_TrinhKy',
  RULES: [
    { path: '01_HS_CV_Trinh/01_P.Mua Hàng/01. Cv MuaHang', status: 'CV' },
    { path: '01_HS_CV_Trinh/01_P.Mua Hàng',                status: 'TP_MH' },
    { path: '01_HS_CV_Trinh/02_P.QLCP',                    status: 'TP_CC' },
    { path: '02_HS_TP_Trinh',                              status: 'GDTM' },
    { path: '03_HS_DaDuyet',                               status: 'DA_DUYET' },
    { path: '04_HS_TraLai',                                status: 'TRA_LAI' }
  ],
  NOTE: 'Đồng bộ từ thư mục chia sẻ',
  MAX_ITEMS: 3000
};

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
    installUrl: APP_CONFIG.INSTALL_URL,
    statuses: STATUSES,
    submittingStatuses: SUBMITTING_STATUSES,
    approvedStatus: APPROVED_STATUS,
    defaultStatus: DEFAULT_STATUS,
    positions: POSITIONS,
    minPasswordLength: APP_CONFIG.MIN_PASSWORD_LENGTH,
    maxTitleLength: APP_CONFIG.MAX_TITLE_LENGTH,
    folderSync: { rootName: FOLDER_SYNC.ROOT_NAME, rootHint: FOLDER_SYNC.ROOT_HINT, rules: FOLDER_SYNC.RULES }
  };
}
