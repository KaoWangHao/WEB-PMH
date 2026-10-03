/**
 * Danh mục dự án (sheet "Projects"): mã = số thứ tự (STT) ở đầu tên thư mục dự án "STT_TÊN DỰ ÁN",
 * hoặc mã chữ (vd "D&B" = Phòng D&B) cho hồ sơ không thuộc dự án đánh số.
 * Hồ sơ được gắn dự án tự động ở client theo số đầu tên hồ sơ (vd "231_TDTower_..." → dự án 231).
 * Sheet tự tạo và nạp danh sách ban đầu ở lần dùng đầu tiên; admin thêm/sửa trên web.
 */

var PROJECT_SEED_ = [
  '76_LAPURA', 'D&B_Phòng D&B',
  '192_ThiCongVuonUomDoanhNghiep_TTC', '193_TruongQuocTeSingapore_SIS', '194_ThePearl-BTC01-05_PEARL01',
  '195_ThePearl-BTC06-011_PEARL02', '196_Sun Symphony_Phan ham', '197_TecombankMienBac_TCB-MB',
  '198_TecombankMienNam_TCB-MN',
  '201_KhuNhaOCaoTang-KDTDaiAn_CCCT', '202_KhuDoThiNamThai_NAMTHAI',
  '205_Vaquarius_BP01 - XD', '206_FUTA',
  '207_Essensia Sky_Phan ham', '208_Taiwan_Thap doi', '209_KhuNhaOTanThanh_VICLAND',
  '211_Sun Symphony_Phan than',
  '213_DH Cong nghe', '214_Vaquarius_BP03 - XD',
  '215_TheNamKhangResortResidences_NAMKHANG', '216_Tokyu_H5&H7', '217_CentralEmbassyTwoDevelopment_EMBASSY',
  '218_LegendCityDaNang_LEGEND', '219_WinWinOfficeApartment_WINWIN', '220_KhuDoThiAnThoi-BV_ANTHOI',
  '221_DHQG_Thu vien', '222_Cat Ba_HH1', '223_SUMOU-TOWER_SUMOU', '224_Cat Ba_Shophouse GH',
  '225_KhuNhaO_PHCT_ThuanAn1-HT_NTMK1-01', '226_Essensia Sky_Phan than', '227_AmyComplexBinhDuong_AMY',
  '228_COSMOROYAL_COSMO', '229_DHQG_Ha tang', '230_SanBayQuangTri_SBQT', '231_Truong Dinh',
  '232_KDT Gateway_Sunhome03', '233_HonThom_TTHN Mice', '234_Vegacity_C10 - MEP', '235_HonThom_HONTHOM-LANGTAY',
  '236_HonThom_NhaHangMuiThuyen', '237_Essensia Parkway', '238_Sun Costa', '239_KDT 3-2_Ha tang',
  '240_Vin Co Loa', '241_KDI Dan Phuong', '242_KDT-BinhAn-DucHoa_WinCity', '243_Poet Residence',
  '244_TT09ThachThat_TT09', '245_Vin Dan Phuong', '246_Sun Solar', '247_Vin Cam Ranh', '248_CapitalSquare3_CS3',
  '249_SunCentro_HaLong', '250_VP-CanHoDuLich_THE-ONE-TOWER', '251_FPT Plaza 4_Da Nang', '252_TaHoe_HaNoi',
  '253_NhaKhachHoTay_MiceCenter', '254_Sycamore_PlotB8', '255_Da Nang Downtown_CocDV16_HH5_HH6',
  '256_SunsetTownHigh-Rise_B4.6_B4.7', '257_SunNhaTrang', '258_AMY Complex_Phan than', '259_DuongSat_SG-CG',
  '260_SkyM_HaLong', '261_Vihoce_TienDuong', '262_NhaGa_Taiwan', '263_CC-Lo6.8_DaiQuangMinh',
  '264_ChungCu_DaiNhat', '265_KDT_DaiAn_PhanThan', '266_DaiPhuoc_SWANBAY', '267_Emerald_Boulevard',
  '268_KDT_DaiAn_CCCT01 - MEP', '269_COSMOROYAL_THAN', '270_KhuNhaO_PHCT_ThuanAn1_GD2',
  '271_SunNhaTrang_CocDaiTra', '272_ChungCu_H2-02', '273_KhuDuLich_CanGio_CauSo01_02', '274_BaiDatDo_ToaS10',
  '275_Olalani Riverside Towers_A1', '276_FiveStar_Odyssey', '277_CauNguyenTatThanh_CamLam', '278_Truso_X03_BCA',
  '279_HaTang_SerenityPhuocHai', '280_Welltone_NhaTrang', '281_SanBay_DaNang', '282_Aria_Bay',
  '283_HanRiverside_DaNang', '284_Israel', '285_The_Emerald_River_Park', '286_SunshineSkyCity_TPHCM',
  '287_Condotel_HoaPhatNhaTrang', '288_Sunshine_DaiPhuoc', '289_CaiTao_PhuHuu', '290_Central_Lakeside',
  '291_ChungCu_AnHuy', '292_ThuanAn_TK_QS', '293_Hope_Gardenia', '294_Lotte_TranPhu', '295_ChungCu_DaiNhat_PhanThan'
];

/**
 * Sửa 1 lần cho sheet Projects đã tạo từ danh sách ban đầu (bản thử): 7 tên bị cắt "…" trong ảnh gốc.
 * Theo người dùng: 206 → FUTA, 6 dự án còn lại bỏ khỏi danh mục. Chỉ đụng tới dòng còn đúng tên cắt cũ.
 */
var PROJECT_FIX_V1_ = {
  rename: { '206': ['XDTramDungNghi-XePhuongTrang', 'FUTA'] },
  remove: {
    '199': 'VanPhongKinhDoanhQuocLo13_VPK', '200': 'KhuNhaOPhucHopCaoTangThuanA',
    '203': 'KhuDoThiSaiGonBinhAn_CongVien', '204': 'ToHopKSvaCC-ChampaViha_CHAM',
    '210': 'KhuDoThiBacMoiSongCam_THUYN', '212': 'CanHoCaoCap_BinhDuong-CHM&V'
  }
};
var PROJECT_FIX_PROP_ = 'PROJECTS_FIX_V1';
/** V2: bổ sung mã chữ D&B (Phòng D&B) cho sheet đã tạo trước khi có mã chữ. */
var PROJECT_ADD_V2_ = ['D&B_Phòng D&B'];
var PROJECT_FIX2_PROP_ = 'PROJECTS_FIX_V2';

function applyProjectFixes_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(PROJECT_FIX_PROP_)) return;
  withLock_(function () {
    if (props.getProperty(PROJECT_FIX_PROP_)) return;
    var drop = [];
    readTable_('Projects').forEach(function (p) {
      var code = normalizeProjectCode_(p.code), name = String(p.name);
      var rn = PROJECT_FIX_V1_.rename[code];
      if (rn && name === rn[0]) { p.name = rn[1]; writeObj_('Projects', p._row, p); }
      if (PROJECT_FIX_V1_.remove[code] === name) drop.push(p._row);
    });
    deleteRows_('Projects', drop);
    props.setProperty(PROJECT_FIX_PROP_, new Date().toISOString());
  });
}

function applyProjectAdditions_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(PROJECT_FIX2_PROP_)) return;
  withLock_(function () {
    if (props.getProperty(PROJECT_FIX2_PROP_)) return;
    var have = {};
    readTable_('Projects').forEach(function (p) { have[normalizeProjectCode_(p.code)] = true; });
    var date = today_();
    appendRows_('Projects', PROJECT_ADD_V2_.map(parseProjectLine_).filter(function (p) { return p && !have[p.code]; })
      .map(function (p) { return { code: p.code, name: p.name, active: true, createdAt: date }; }));
    props.setProperty(PROJECT_FIX2_PROP_, new Date().toISOString());
  });
}

/** "231_Truong Dinh" / "231 Truong Dinh" / "273. Vin…" / "D&B_Phòng D&B" → { code, name } hoặc null. */
function parseProjectLine_(line) {
  var m = String(line || '').trim().match(/^(\d{1,6}|[A-Za-z][A-Za-z0-9&]{0,11})\s*[_.\-\s]\s*(.+)$/);
  if (!m) return null;
  var code = normalizeProjectCode_(m[1]);
  var name = m[2].replace(/\s+/g, ' ').replace(/[\s…]+$/, '').trim();
  if (!code || !name) return null;
  return { code: code, name: name.slice(0, 150) };
}

/** Mã số bỏ số 0 đầu ("076" → "76"); mã chữ viết hoa ("d&b" → "D&B"); sai dạng → ''. */
function normalizeProjectCode_(code) {
  var s = String(code == null ? '' : code).trim();
  var m = s.match(/^0*(\d{1,6})$/);
  if (m) return m[1] === '' ? '0' : m[1];
  return /^[A-Za-z][A-Za-z0-9&]{0,11}$/.test(s) ? s.toUpperCase() : '';
}

/** Mã số trước (theo số), mã chữ sau (theo ABC). */
function compareProjectCode_(a, b) {
  var na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
  if (na && nb) return Number(a) - Number(b);
  if (na !== nb) return na ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Tạo sheet Projects + nạp danh sách ban đầu nếu chưa có (dữ liệu thật đã chạy trước khi có tính năng này). */
function ensureProjectsSheet_() {
  var ss = db_();
  if (ss.getSheetByName('Projects')) { applyProjectFixes_(); applyProjectAdditions_(); return; }
  withLock_(function () {
    if (ss.getSheetByName('Projects')) return;
    var sh = ss.insertSheet('Projects');
    var headers = SHEET_HEADERS.Projects;
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
    sh.setFrozenRows(1);
    seedProjects_();
    var now = new Date().toISOString();
    PropertiesService.getScriptProperties().setProperty(PROJECT_FIX_PROP_, now);
    PropertiesService.getScriptProperties().setProperty(PROJECT_FIX2_PROP_, now);
  });
}

function seedProjects_() {
  if (readTable_('Projects').length) return;
  var date = today_();
  appendRows_('Projects', PROJECT_SEED_.map(parseProjectLine_).filter(Boolean).map(function (p) {
    return { code: p.code, name: p.name, active: true, createdAt: date };
  }));
}

function serializeProject_(rec) {
  return { code: normalizeProjectCode_(rec.code), name: String(rec.name || ''), active: toBool_(rec.active) };
}

function listProjects_() {
  ensureProjectsSheet_();
  return readTable_('Projects').map(serializeProject_).filter(function (p) { return p.code; })
    .sort(function (a, b) { return compareProjectCode_(a.code, b.code); });
}

/** Thêm hoặc sửa 1 dự án (admin). */
function saveProject_(user, payload) {
  requireAdmin_(user);
  var code = normalizeProjectCode_(payload && payload.code);
  if (!code) throw appError_('Mã dự án là số (vd 231) hoặc chữ không dấu, có thể có & (vd D&B).');
  var name = String((payload && payload.name) || '').replace(/\s+/g, ' ').trim();
  if (!name) throw appError_('Vui lòng nhập tên dự án.');
  if (name.length > 150) throw appError_('Tên dự án quá dài (tối đa 150 ký tự).');
  var active = payload.active == null ? true : !!payload.active;
  ensureProjectsSheet_();
  return withLock_(function () {
    var rec = null;
    readTable_('Projects').forEach(function (p) { if (normalizeProjectCode_(p.code) === code) rec = p; });
    if (payload.isNew && rec) throw appError_('Dự án số ' + code + ' đã có: ' + rec.name + '.');
    if (rec) {
      rec.name = name; rec.active = active;
      writeObj_('Projects', rec._row, rec);
    } else {
      rec = { code: code, name: name, active: active, createdAt: today_() };
      appendObj_('Projects', rec);
    }
    return { projects: listProjects_() };
  });
}

/** Dán nhiều dòng "STT_TÊN DỰ ÁN" (admin): thêm dự án mới, cập nhật tên dự án đã có. */
function importProjects_(user, payload) {
  requireAdmin_(user);
  var lines = String((payload && payload.text) || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  if (!lines.length) throw appError_('Chưa có dòng nào để nhập.');
  if (lines.length > 2000) throw appError_('Tối đa 2000 dòng mỗi lần.');
  ensureProjectsSheet_();
  return withLock_(function () {
    var byCode = {};
    readTable_('Projects').forEach(function (p) { byCode[normalizeProjectCode_(p.code)] = p; });
    var added = [], updated = 0, unchanged = 0, invalid = [];
    var date = today_();
    lines.forEach(function (line) {
      var p = parseProjectLine_(line);
      if (!p) { invalid.push(line); return; }
      var rec = byCode[p.code];
      if (rec) {
        if (String(rec.name) === p.name && toBool_(rec.active)) { unchanged++; return; }
        rec.name = p.name; rec.active = true;
        writeObj_('Projects', rec._row, rec);
        updated++;
      } else {
        rec = { code: p.code, name: p.name, active: true, createdAt: date };
        byCode[p.code] = rec;
        added.push(rec);
      }
    });
    appendRows_('Projects', added);
    return { added: added.length, updated: updated, unchanged: unchanged, invalid: invalid.slice(0, 20), projects: listProjects_() };
  });
}
