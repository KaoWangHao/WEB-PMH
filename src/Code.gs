/**
 * Điểm vào của web app.
 * Client chỉ gọi một hàm duy nhất: google.script.run.api(action, token, payload).
 * Các hàm nội bộ đều kết thúc bằng "_" nên không thể gọi trực tiếp từ trình duyệt.
 */

function doGet() {
  var out = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  if (APP_CONFIG.FAVICON_URL) out.setFaviconUrl(APP_CONFIG.FAVICON_URL);
  return out;
}

/**
 * Nhận dữ liệu gửi từ ngoài (POST) — chỉ dùng cho chức năng mở rộng: đồng bộ thư mục tự động (thư mục autosync/).
 * Không có chức năng mở rộng → trả lời "không hỗ trợ".
 */
function doPost(e) {
  if (typeof autoSyncPost_ === 'function') return autoSyncPost_(e);
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Không hỗ trợ.' })).setMimeType(ContentService.MimeType.JSON);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/** Nạp file nếu có (chức năng chạy thử như khms/ chỉ có trên bản /dev); không có → chuỗi rỗng. */
function includeIf(name) {
  try { return include(name); } catch (e) { return ''; }
}

var API_ACTIONS_ = {
  bootstrap:      function (user) { return bootstrap_(user); },
  createSub:      function (user, p) { return createSubmission_(user, p); },
  updateSub:      function (user, p) { return updateSubmission_(user, p); },
  deleteSub:      function (user, p) { return deleteSubmission_(user, p); },
  folderSync:     function (user, p) { return applyFolderSync_(user, p); },
  markNotifSeen:  function (user, p) { return markNotifSeen_(user, p); },
  saveProject:    function (user, p) { return saveProject_(user, p); },
  importProjects: function (user, p) { return importProjects_(user, p); },
  changePassword: function (user, p) { return changePassword_(user, p); },
  listUsers:      function (user) { return listUsers_(user); },
  createUser:     function (user, p) { return createUser_(user, p); },
  updateUser:     function (user, p) { return updateUser_(user, p); },
  resetPassword:  function (user, p) { return resetUserPassword_(user, p); },
  deleteUser:     function (user, p) { return deleteUser_(user, p); }
};

function api(action, token, payload) {
  try {
    if (action === 'publicConfig') return { ok: true, data: publicConfig_() };
    if (action === 'login') return { ok: true, data: login_(payload) };
    if (action === 'logout') return { ok: true, data: logout_(token) };

    var handler = API_ACTIONS_[action] ||
      // Chức năng mở rộng (thư mục riêng, workflow chép vào src/ khi deploy): Kế hoạch mua sắm (khms/), đồng bộ tự động (autosync/).
      (typeof KHMS_ACTIONS_ !== 'undefined' && KHMS_ACTIONS_[action]) ||
      (typeof AUTO_SYNC_ACTIONS_ !== 'undefined' && AUTO_SYNC_ACTIONS_[action]);
    if (!handler) throw appError_('Chức năng không tồn tại.');
    var user = requireSession_(token);
    if (user.mustChangePassword && action !== 'changePassword') {
      throw appError_('Bạn cần đổi mật khẩu trước khi tiếp tục.', 'MUST_CHANGE_PASSWORD');
    }
    return { ok: true, data: handler(user, payload || {}) };
  } catch (e) {
    if (!e.appCode) console.error(e && e.stack ? e.stack : e);
    return { ok: false, error: e.appCode ? e.message : 'Đã xảy ra lỗi hệ thống: ' + (e && e.message), code: e.appCode || 'ERROR' };
  }
}
