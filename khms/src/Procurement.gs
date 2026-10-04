/**
 * Kế hoạch mua sắm (KHMS) theo dự án: mỗi dòng sheet "Packages" là một gói thầu.
 * - Chuyên viên tải file Excel KHMS của dự án (đọc ở trình duyệt bằng ExcelJS) → importPlan_: khớp gói theo
 *   (dự án, tên hạng mục, STT). Lần tải đầu giữ làm kế hoạch gốc (…Plan0, nhãn rev0 vd Rev00); file có cột "Kế hoạch Rev00"
 *   riêng thì cột đó là kế hoạch gốc. Các lần tải sau cập nhật kế hoạch hiện hành (…Plan, nhãn rev); gói mới ở bản sau không có gốc. Ngày thực tế và hồ sơ đã gắn được giữ nguyên; gói không còn trong file mới → active = FALSE.
 * - Ngày chọn thầu thực tế = ngày duyệt của hồ sơ gắn với gói (tính ở client, luôn khớp hồ sơ); cột selectActual chỉ là
 *   ngày lấy từ file / nhập tay cho gói chưa có hồ sơ được duyệt trên web.
 * - Ngày mời thầu / ký hợp đồng / khởi công thực tế: chuyên viên tự cập nhật (updatePackage_).
 * - Gắn hồ sơ với gói thầu: web gợi ý theo tên, người dùng xác nhận (linkPackages_) hoặc chọn hồ sơ khác.
 * Mọi tài khoản được tải KHMS và cập nhật gói thầu; Trưởng phòng/admin được xóa KHMS của một dự án.
 */

/** Bảng của KHMS (thay cho SHEET_HEADERS — sheet tự tạo bởi ensureSheet_; thêm cột mới vào CUỐI, header tự bổ sung). */
var KHMS_HEADERS_ = {
  // Mỗi dòng 1 gói thầu. …Plan0 = kế hoạch gốc (Rev00 / lần tải đầu), …Plan = kế hoạch hiện hành.
  Packages: ['id', 'projectCode', 'stt', 'name', 'value',
             'invitePlan0', 'invitePlan', 'inviteActual', 'selectPlan0', 'selectPlan', 'selectActual',
             'contractPlan0', 'contractPlan', 'contractActual', 'startPlan0', 'startPlan', 'startActual',
             'submissionId', 'note', 'active', 'sortOrder', 'rev', 'createdAt', 'updatedAt', 'updatedBy',
             'rev0'], // nhãn bản kế hoạch gốc (vd Rev00)
  // Lịch sử tải file KHMS.
  PlanUploads: ['projectCode', 'fileName', 'rev', 'actor', 'date', 'added', 'updated', 'removed', 'total']
};

/** Action của KHMS — Code.gs tra thêm bảng này khi action không có trong API_ACTIONS_. Mỗi hàm tự kiểm tra quyền. */
var KHMS_ACTIONS_ = {
  importPlan:     function (user, p) { return importPlan_(user, p); },
  updatePackage:  function (user, p) { return updatePackage_(user, p); },
  updatePackages: function (user, p) { return updatePackages_(user, p); },
  linkPackages:   function (user, p) { return linkPackages_(user, p); },
  deletePlan:     function (user, p) { return deletePlan_(user, p); }
};

/** Dữ liệu KHMS gửi kèm bootstrap_ (Submissions.gs gọi nếu có hàm này). */
function khmsBootstrap_() {
  return { packages: listPackages_(), planUploads: listPlanUploads_() };
}

var PLAN_MILESTONES_ = ['invite', 'select', 'contract', 'start'];
var PLAN_MAX_ROWS_ = 1500;

/** Tạo sheet Packages / PlanUploads nếu chưa có (dữ liệu thật đã chạy trước khi có tính năng này). */
function ensurePlanSheets_() {
  ensureSheet_('Packages');
  ensureSheet_('PlanUploads');
}

/** Khóa so khớp tên hạng mục: không dấu, chữ thường, chỉ chữ + số. */
function planKey_(s) {
  s = String(s == null ? '' : s);
  if (s.normalize) s = s.normalize('NFD');
  return s.replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function serializePackage_(rec) {
  var out = {
    id: String(rec.id), project: normalizeProjectCode_(rec.projectCode), stt: String(rec.stt || ''),
    name: String(rec.name || ''), value: rec.value === '' || rec.value == null ? null : Number(rec.value),
    submissionId: String(rec.submissionId || ''), note: String(rec.note || ''), active: toBool_(rec.active),
    order: Number(rec.sortOrder) || 0, rev: String(rec.rev || ''), rev0: String(rec.rev0 || ''),
    updatedAt: dmyToIso_(rec.updatedAt), updatedBy: normalizeUsername_(rec.updatedBy || '')
  };
  if (isNaN(out.value)) out.value = null;
  PLAN_MILESTONES_.forEach(function (m) {
    out[m + 'Plan0'] = dmyToIso_(rec[m + 'Plan0']);
    out[m + 'Plan'] = dmyToIso_(rec[m + 'Plan']);
    out[m + 'Actual'] = dmyToIso_(rec[m + 'Actual']);
  });
  return out;
}

function serializePlanUpload_(rec) {
  return {
    project: normalizeProjectCode_(rec.projectCode), fileName: String(rec.fileName || ''), rev: String(rec.rev || ''),
    actor: normalizeUsername_(rec.actor || ''), date: dmyToIso_(rec.date),
    added: Number(rec.added) || 0, updated: Number(rec.updated) || 0, removed: Number(rec.removed) || 0, total: Number(rec.total) || 0
  };
}

function listPackages_() {
  ensurePlanSheets_();
  return readTable_('Packages').map(serializePackage_).filter(function (p) { return p.project; });
}

function listPlanUploads_() {
  ensurePlanSheets_();
  return readTable_('PlanUploads').map(serializePlanUpload_);
}

function nextPackageNum_(rows) {
  var max = 0;
  rows.forEach(function (r) {
    var m = String(r.id).match(/^GT-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max + 1;
}

/** Giá trị gói thầu: số ≥ 0 (client đã chuyển "4.254.412.037" → số); sai → ''. */
function cleanMoney_(v) {
  if (v === '' || v == null) return '';
  var n = Number(v);
  if (!isFinite(n) || n < 0) return '';
  return String(Math.round(n));
}

/** Một dòng KHMS từ client → giá trị lưu sheet (ngày dd/MM/yyyy). */
function cleanPlanRow_(r) {
  var name = String((r && r.name) || '').replace(/\s+/g, ' ').trim();
  if (!name) return null;
  var out = { name: name.slice(0, 300), stt: String((r && r.stt) == null ? '' : r.stt).trim().slice(0, 20), value: cleanMoney_(r && r.value),
              plan: {}, plan0: {}, actual: {} };
  PLAN_MILESTONES_.forEach(function (m) {
    out.plan[m] = isoToDmy_(r.plan && r.plan[m]);
    out.plan0[m] = isoToDmy_(r.plan0 && r.plan0[m]);
    out.actual[m] = isoToDmy_(r.actual && r.actual[m]);
  });
  return out;
}

/** Ghép dòng file với gói đã có của dự án: cùng tên (khóa không dấu) — ưu tiên cùng STT, rồi theo thứ tự. */
function matchPlanRows_(rows, existing) {
  var used = {};
  return rows.map(function (r) {
    var key = planKey_(r.name);
    var same = existing.filter(function (p) { return !used[p.id] && planKey_(p.name) === key; });
    var hit = same.filter(function (p) { return String(p.stt) === r.stt; })[0] || same[0] || null;
    if (hit) used[hit.id] = true;
    return hit;
  });
}

/**
 * Tải KHMS của 1 dự án. payload: { projectCode, fileName, rev, rev0, rows: [{ stt, name, value, plan:{invite,select,contract,start},
 * plan0:{…} (cột Rev00 nếu file có cả Rev00 và bản mới hơn), actual:{…} }] } — ngày dạng ISO yyyy-MM-dd.
 */
function importPlan_(user, payload) {
  payload = payload || {};
  var code = normalizeProjectCode_(payload.projectCode);
  if (!code) throw appError_('Vui lòng chọn dự án cho KHMS.');
  var project = listProjects_().filter(function (p) { return p.code === code; })[0];
  if (!project) throw appError_('Dự án ' + code + ' chưa có trong danh mục dự án.');
  var raw = payload.rows;
  if (!raw || !raw.length) throw appError_('File không có gói thầu nào.');
  if (raw.length > PLAN_MAX_ROWS_) throw appError_('Tối đa ' + PLAN_MAX_ROWS_ + ' gói thầu mỗi lần tải.');
  var rows = raw.map(cleanPlanRow_).filter(Boolean);
  if (!rows.length) throw appError_('File không có gói thầu nào.');
  // STT do web tự đánh 1, 2, 3… theo thứ tự gói trong lần tải (theo người dùng: không dùng STT trong file).
  rows.forEach(function (r, i) { r.stt = String(i + 1); });
  var rev = String(payload.rev || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  // File có cột "Kế hoạch Rev00" riêng (bên cạnh bản mới hơn) → rev0 = 'Rev00': cột đó ghi đè kế hoạch gốc.
  var rev0 = String(payload.rev0 || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  var fileName = String(payload.fileName || '').trim().slice(0, 200);
  ensurePlanSheets_();

  return withLock_(function () {
    var all = readTable_('Packages');
    var mine = all.filter(function (p) { return normalizeProjectCode_(p.projectCode) === code; });
    var hits = matchPlanRows_(rows, mine);
    var date = today_();
    var num = nextPackageNum_(all);
    var added = [], updated = 0, unchanged = 0, removed = 0, matched = {};
    // Nhãn bản kế hoạch gốc của dự án (vd Rev00) — cho gói mới xuất hiện ở bản sau (không có trong bản gốc).
    var baseRev = mostCommon_(mine.map(function (p) { return String(p.rev0 || p.rev || ''); }));

    rows.forEach(function (r, i) {
      var rec = hits[i];
      var lateNew = !rec && mine.length > 0 && !rev0;
      if (!rec) {
        rec = { id: 'GT-' + ('0000' + num++).slice(-5), projectCode: code, submissionId: '', note: '', createdAt: date };
        // Lần tải đầu: kế hoạch trong file là kế hoạch gốc. Gói thêm ở bản sau: không có kế hoạch gốc.
        PLAN_MILESTONES_.forEach(function (m) { rec[m + 'Plan0'] = r.plan0[m] || (lateNew ? '' : r.plan[m]); rec[m + 'Actual'] = r.actual[m]; });
        added.push(rec);
      } else {
        matched[rec.id] = true;
      }
      var before = hits[i] ? planRowCore_(rec) : '';
      var prevRev = String(rec.rev || '');
      rec.stt = r.stt; rec.name = r.name; rec.value = r.value; rec.sortOrder = i + 1; rec.active = true; rec.rev = rev;
      PLAN_MILESTONES_.forEach(function (m) {
        rec[m + 'Plan'] = r.plan[m];
        // Kế hoạch gốc: theo cột Rev00 của file nếu có; không thì giữ nguyên (ghi ở lần tải đầu).
        if (r.plan0[m]) rec[m + 'Plan0'] = r.plan0[m];
        if (!rec[m + 'Actual'] && r.actual[m]) rec[m + 'Actual'] = r.actual[m]; // ngày thực tế trên web được ưu tiên
      });
      rec.rev0 = rev0 || rec.rev0 || (hits[i] ? prevRev : lateNew ? baseRev : rev) || rev;
      if (hits[i]) {
        // Chỉ đổi Rev / thứ tự dòng thì không tính là cập nhật nội dung.
        if (planRowCore_(rec) !== before) { updated++; rec.updatedAt = date; rec.updatedBy = user.username; }
        else unchanged++;
      } else {
        rec.updatedAt = date; rec.updatedBy = user.username;
      }
    });
    mine.forEach(function (p) {
      if (!matched[p.id] && toBool_(p.active)) { p.active = false; p.updatedAt = date; p.updatedBy = user.username; removed++; }
    });

    writeObjs_('Packages', mine);
    appendRows_('Packages', added);
    appendObj_('PlanUploads', { projectCode: code, fileName: fileName, rev: rev, actor: user.username, date: date,
                                added: added.length, updated: updated, removed: removed, total: rows.length });
    return { added: added.length, updated: updated, unchanged: unchanged, removed: removed,
             packages: listPackages_(), uploads: listPlanUploads_() };
  });
}

/** Giá trị xuất hiện nhiều nhất (bỏ rỗng); không có → ''. */
function mostCommon_(arr) {
  var n = {}, best = '';
  arr.forEach(function (v) { if (v) { n[v] = (n[v] || 0) + 1; if (!best || n[v] > n[best]) best = v; } });
  return best;
}

/** Nội dung gói để đếm "cập nhật": bỏ các cột rev, rev0, sortOrder, updatedAt, updatedBy. */
function planRowCore_(rec) {
  var h = KHMS_HEADERS_.Packages;
  return JSON.stringify(toRowValues_('Packages', rec).filter(function (v, i) {
    return ['rev', 'rev0', 'sortOrder', 'updatedAt', 'updatedBy'].indexOf(h[i]) < 0;
  }));
}

function findPackage_(rows, id) {
  for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(id)) return rows[i];
  return null;
}

/** Kiểm tra hồ sơ để gắn vào gói: phải tồn tại và chưa gắn với gói khác. */
function checkPackageLink_(rows, rec, submissionId, subs) {
  if (!submissionId) return;
  var ok = subs.some(function (s) { return String(s.id) === submissionId; });
  if (!ok) throw appError_('Không tìm thấy hồ sơ ' + submissionId + '.');
  rows.forEach(function (p) {
    if (p !== rec && String(p.submissionId) === submissionId) {
      throw appError_('Hồ sơ ' + submissionId + ' đã gắn với gói "' + p.name + '" (dự án ' + normalizeProjectCode_(p.projectCode) + '). Bỏ gắn ở gói đó trước.');
    }
  });
}

/** Áp 1 thay đổi vào gói (chưa ghi sheet): ngày thực tế (ISO, '' = xóa; không sau hôm nay), ghi chú, hồ sơ gắn ('' = bỏ gắn). */
function applyPackageEdit_(rec, it, todayIso) {
  PLAN_MILESTONES_.forEach(function (m) {
    var k = m + 'Actual';
    if (it[k] === undefined) return;
    var v = it[k] ? isoToDmy_(it[k]) : '';
    if (it[k] && !v) throw appError_('ngày không hợp lệ');
    if (it[k] && it[k] > todayIso) throw appError_('ngày thực tế không được sau hôm nay');
    rec[k] = v;
  });
  if (it.note !== undefined) rec.note = String(it.note || '').trim().slice(0, 500);
  if (it.submissionId !== undefined) rec.submissionId = String(it.submissionId || '');
}

/** Sau khi sửa: hồ sơ gắn phải tồn tại và mỗi hồ sơ chỉ gắn 1 gói (kiểm tra cả khi đổi chéo giữa các gói trong cùng lần lưu). */
function checkPackageLinks_(rows, changed, subs) {
  var exists = {}, byId = {}, errs = [];
  subs.forEach(function (s) { exists[String(s.id)] = true; });
  rows.forEach(function (p) {
    var sid = String(p.submissionId || '');
    if (sid) (byId[sid] = byId[sid] || []).push(p);
  });
  changed.forEach(function (p) {
    var sid = String(p.submissionId || '');
    if (!sid) return;
    if (!exists[sid]) errs.push('"' + p.name + '": không tìm thấy hồ sơ ' + sid);
    else if (byId[sid].length > 1) {
      errs.push('hồ sơ ' + sid + ' đang gắn với ' + byId[sid].length + ' gói (' + byId[sid].map(function (x) { return x.name; }).join(', ') + ')');
    }
  });
  return errs.filter(function (e, i) { return errs.indexOf(e) === i; });
}

/**
 * Lưu nhiều gói một lần (nút "Cập nhật bảng" và form 1 gói). payload: { items: [{ id, inviteActual?, selectActual?, contractActual?,
 * startActual?, note?, submissionId? }] }. Có lỗi ở bất kỳ gói nào → không lưu gì, báo lỗi.
 */
function updatePackages_(user, payload) {
  var items = (payload && payload.items) || [];
  if (!items.length) throw appError_('Không có thay đổi nào để lưu.');
  if (items.length > PLAN_MAX_ROWS_) throw appError_('Quá nhiều gói thầu trong một lần lưu.');
  ensurePlanSheets_();
  return withLock_(function () {
    var rows = readTable_('Packages');
    var date = today_(), todayIso = dmyToIso_(date), changed = [], errs = [];
    items.forEach(function (it) {
      var rec = findPackage_(rows, it && it.id);
      if (!rec) { errs.push('không tìm thấy gói ' + (it && it.id)); return; }
      try { applyPackageEdit_(rec, it, todayIso); } catch (e) { errs.push('"' + rec.name + '": ' + e.message); return; }
      rec.updatedAt = date; rec.updatedBy = user.username;
      if (changed.indexOf(rec) < 0) changed.push(rec);
    });
    if (!errs.length) errs = checkPackageLinks_(rows, changed, readTable_('Submissions'));
    if (errs.length) throw appError_('Chưa lưu: ' + errs.slice(0, 3).join('; ') + (errs.length > 3 ? ' (và ' + (errs.length - 3) + ' lỗi khác)' : '') + '.');
    writeObjs_('Packages', changed);
    return { packages: changed.map(serializePackage_) };
  });
}

/** Cập nhật 1 gói (form Cập nhật) — như updatePackages_ với 1 gói. */
function updatePackage_(user, payload) {
  return updatePackages_(user, { items: [payload || {}] });
}

/** Xác nhận nhiều gợi ý gắn hồ sơ một lần. payload: { links: [{ id, submissionId }] }. */
function linkPackages_(user, payload) {
  var links = (payload && payload.links) || [];
  if (!links.length) throw appError_('Chưa chọn gói thầu nào.');
  if (links.length > PLAN_MAX_ROWS_) throw appError_('Quá nhiều gói thầu trong một lần.');
  ensurePlanSheets_();
  return withLock_(function () {
    var rows = readTable_('Packages');
    var subs = readTable_('Submissions');
    var date = today_(), changed = [], skipped = [];
    links.forEach(function (l) {
      var rec = findPackage_(rows, l && l.id);
      var sid = String((l && l.submissionId) || '');
      if (!rec) { skipped.push({ id: l && l.id, reason: 'không tìm thấy gói' }); return; }
      try { checkPackageLink_(rows, rec, sid, subs); } catch (e) { skipped.push({ id: rec.id, reason: e.message }); return; }
      rec.submissionId = sid; rec.updatedAt = date; rec.updatedBy = user.username;
      changed.push(rec);
    });
    writeObjs_('Packages', changed);
    return { packages: changed.map(serializePackage_), skipped: skipped };
  });
}

/** Xóa toàn bộ KHMS (gói thầu + lịch sử tải) của 1 dự án — Trưởng phòng/admin. */
function deletePlan_(user, payload) {
  requireManager_(user);
  var code = normalizeProjectCode_(payload && payload.projectCode);
  if (!code) throw appError_('Thiếu mã dự án.');
  ensurePlanSheets_();
  return withLock_(function () {
    var other = function (r) { return normalizeProjectCode_(r.projectCode) !== code; };
    var pk = readTable_('Packages'), up = readTable_('PlanUploads');
    var keepPk = pk.filter(other), keepUp = up.filter(other);
    if (keepPk.length === pk.length && keepUp.length === up.length) throw appError_('Dự án ' + code + ' chưa có KHMS.');
    rewriteTable_('Packages', keepPk);
    rewriteTable_('PlanUploads', keepUp);
    return { packages: listPackages_(), uploads: listPlanUploads_() };
  });
}

/** Hồ sơ bị xóa → bỏ gắn khỏi gói thầu (gọi trong withLock_ của deleteSubmission_). */
function unlinkSubmissionPackages_(id) {
  if (!db_().getSheetByName('Packages')) return;
  var changed = readTable_('Packages').filter(function (p) { return String(p.submissionId) === String(id); });
  changed.forEach(function (p) { p.submissionId = ''; });
  writeObjs_('Packages', changed);
}
