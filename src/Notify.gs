/**
 * Thông báo (chuông trên topbar). Nội dung tính ở client từ History; server chỉ lưu mốc "đã xem đến dòng History nào"
 * cho từng tài khoản (Script Properties NOTIF_SEEN_<username>), để thông báo chưa xem vẫn còn khi đăng nhập máy khác.
 * - Chuyên viên: hồ sơ của mình bị người khác đổi tình trạng (đồng bộ thư mục, Trưởng phòng cập nhật…) hoặc được tạo từ đồng bộ.
 * - Trưởng phòng/GĐTM: hồ sơ mới chuyển sang "Đang trình <chức danh của mình>".
 * Mốc chỉ tăng khi người dùng mở chuông (action markNotifSeen).
 */

var NOTIF_PREFIX_ = 'NOTIF_SEEN_';

/** Mốc đã xem (số dòng History). Lần đầu = dòng cuối hiện tại, để không báo lại toàn bộ lịch sử cũ. */
function notifSeen_(user) {
  var props = PropertiesService.getScriptProperties();
  var key = NOTIF_PREFIX_ + user.username;
  var v = props.getProperty(key);
  if (v === null || v === '') {
    v = String(sheet_('History').getLastRow());
    props.setProperty(key, v);
  }
  return parseInt(v, 10) || 0;
}

function markNotifSeen_(user, payload) {
  var seq = parseInt(payload && payload.seq, 10);
  if (!(seq >= 0)) throw appError_('Dữ liệu không hợp lệ.');
  return withLock_(function () {
    seq = Math.min(seq, sheet_('History').getLastRow());
    var cur = notifSeen_(user);
    if (seq > cur) PropertiesService.getScriptProperties().setProperty(NOTIF_PREFIX_ + user.username, String(seq));
    return { seen: Math.max(cur, seq) };
  });
}

/** Xóa dòng History (admin xóa hồ sơ) làm các dòng sau dịch lên → lùi mốc đã xem tương ứng. Gọi trong withLock_. */
function shiftNotifSeen_(deletedRows) {
  if (!deletedRows.length) return;
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  Object.keys(all).forEach(function (key) {
    if (key.indexOf(NOTIF_PREFIX_) !== 0) return;
    var seen = parseInt(all[key], 10) || 0;
    var below = deletedRows.filter(function (r) { return r <= seen; }).length;
    if (below) props.setProperty(key, String(seen - below));
  });
}
