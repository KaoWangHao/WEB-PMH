/*
 * Dữ liệu mẫu cho môi trường chạy thử local (chạy sau mock.js và backend.js).
 * Tất cả tài khoản demo dùng mật khẩu DEMO_PASSWORD bên dưới — chỉ dùng cho local.
 */
(function () {
  'use strict';
  if (!window.__mockIsEmpty()) return;

  var DEMO_PASSWORD = 'demo1234';
  window.__ownerMode = true;
  setup();
  window.__ownerMode = false;
  db_cache_ = null;

  var admin = findUserRecord_('admin');
  setPassword_(admin, DEMO_PASSWORD, false);
  writeObj_('Users', admin._row, admin);

  var people = [
    ['an.nv', 'Nguyễn Văn An', 'CV'],
    ['binh.tt', 'Trần Thị Bình', 'CV'],
    ['chau.lm', 'Lê Minh Châu', 'CV'],
    ['duc.pq', 'Phạm Quốc Đức', 'CV'],
    ['dung.tpmh', 'Phạm Quốc Dũng', 'TP_MH'],
    ['ha.tpcc', 'Hoàng Thu Hà', 'TP_CC'],
    ['long.gdtm', 'Võ Thành Long', 'GDTM']
  ];
  people.forEach(function (p) {
    var rec = { username: p[0], displayName: p[1], position: p[2], isAdmin: false, active: true, createdAt: '01/06/2026' };
    setPassword_(rec, DEMO_PASSWORD, false);
    appendObj_('Users', rec);
  });

  // Sinh hồ sơ với các bước chuyển tình trạng trong ~150 ngày gần đây.
  var seed = 7;
  function rand(n) { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); }
  var DAY = 86400000;
  var today = new Date(Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') + 'T00:00:00Z').getTime();
  function dmy(t) { var d = new Date(t); return ('0' + d.getUTCDate()).slice(-2) + '/' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '/' + d.getUTCFullYear(); }

  var topics = ['Mua vật tư thép', 'Hợp đồng cung cấp cáp điện', 'Báo giá thiết bị PCCC', 'Đề xuất mua máy phát điện',
    'Hợp đồng thuê cẩu tháp', 'Mua sắm văn phòng phẩm', 'Phê duyệt nhà cung cấp bê tông', 'Thanh toán đợt 2 gói thầu M&E',
    'Mua thiết bị thang máy', 'Đơn hàng ống nhựa HDPE', 'Hợp đồng vận chuyển', 'Điều chỉnh giá vật tư'];
  var owners = ['an.nv', 'binh.tt', 'chau.lm', 'duc.pq'];
  var approver = { TP_MH: 'dung.tpmh', GDTM: 'long.gdtm', TP_CC: 'ha.tpcc' };
  var flow = ['CV', 'TP_MH', 'GDTM', 'TP_CC', 'DA_DUYET'];
  var events = [];
  var subs = [];

  for (var i = 0; i < 46; i++) {
    var owner = owners[rand(owners.length)];
    var t = today - rand(150) * DAY;
    var id = 'HS-2026-' + ('000' + (i + 1)).slice(-4);
    var title = topics[rand(topics.length)] + ' – ' + ['Dự án A', 'Dự án B', 'Văn phòng', 'Nhà máy'][rand(4)] + ' (' + (i + 1) + ')';
    var s = { id: id, title: title, owner: owner, status: 'CV', createdAt: dmy(t), submittedAt: '', updatedAt: dmy(t), approvedAt: '' };
    events.push({ t: t, h: { submissionId: id, fromStatus: '', toStatus: 'CV', actor: owner, note: '', date: dmy(t) } });
    var step = 0;
    var stopAt = 1 + rand(5);
    var returned = false;
    while (step < stopAt) {
      var next = flow[step + 1];
      if (!next) break; // đã duyệt (sau khi bị trả lại, step quay về 1 nên có thể vượt cuối flow)
      var actor = step === 0 ? owner : approver[flow[step]];
      var nt = t + (1 + rand(step === 0 ? 4 : 8)) * DAY;
      if (nt > today) break;
      if (!returned && step >= 1 && rand(6) === 0) {
        events.push({ t: nt, h: { submissionId: id, fromStatus: s.status, toStatus: 'TRA_LAI', actor: actor, note: 'Bổ sung báo giá so sánh', date: dmy(nt) } });
        s.status = 'TRA_LAI'; s.updatedAt = dmy(nt); s.approvedAt = '';
        returned = true; t = nt;
        var rt = t + (1 + rand(3)) * DAY;
        if (rt > today) break;
        events.push({ t: rt, h: { submissionId: id, fromStatus: 'TRA_LAI', toStatus: 'TP_MH', actor: owner, note: 'Đã bổ sung', date: dmy(rt) } });
        s.status = 'TP_MH'; s.updatedAt = dmy(rt); t = rt; step = 1;
        continue;
      }
      events.push({ t: nt, h: { submissionId: id, fromStatus: s.status, toStatus: next, actor: actor, note: '', date: dmy(nt) } });
      if (next !== 'DA_DUYET' && next !== 'CV' && !s.submittedAt) s.submittedAt = dmy(nt);
      s.status = next; s.updatedAt = dmy(nt); s.approvedAt = next === 'DA_DUYET' ? dmy(nt) : '';
      t = nt; step++;
    }
    subs.push(s);
  }
  subs.forEach(function (s) { appendObj_('Submissions', s); });
  events.sort(function (a, b) { return a.t - b.t; }).forEach(function (e) { appendObj_('History', e.h); });
  window.__mockSave();
  console.log('Đã tạo dữ liệu mẫu:', subs.length, 'hồ sơ,', events.length, 'dòng lịch sử');
})();
