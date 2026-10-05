# Đồng bộ thư mục tự động — chức năng mở rộng

Theo người dùng: *"đồng bộ tự động 1 tiếng 1 lần trong khung giờ từ 7h30 sáng đến 17h30 chiều, ngoài ra vẫn giữ tính năng đồng bộ thủ công"*
và *"gom phần tính năng lại 1 chỗ, để khi merge lên web chính mà muốn gỡ bỏ tính năng thì cũng đơn giản hơn"*.

Toàn bộ chức năng nằm trong thư mục này. Phần lõi (`src/`) chỉ có **điểm gắn chung**, không chứa code đồng bộ tự động.

## Cấu trúc
| File | Vai trò |
|---|---|
| `src/AutoSync.gs` | Server: `autoSyncPost_` (nhận POST), `buildAutoSyncPlan_` (lập kế hoạch như đồng bộ thủ công, lựa chọn mặc định), `rotateAutoSyncKey_` (admin tạo khóa), `autoSyncStatus_`, `AUTO_SYNC_ACTIONS_`, `autoSyncBootstrap_` |
| `src/AutoSyncUi.html` | Giao diện: tên "Đồng bộ tự động" cho tài khoản hệ thống `auto-sync`, câu chú thích nút "Đồng bộ thư mục", thẻ "Đồng bộ thư mục tự động" ở trang Quản trị, nút Tạo khóa |
| `tools/` | Script cho máy Windows trong mạng công ty: `auto-sync.ps1`, `cai-dat.ps1` (Task Scheduler mỗi giờ 7:30–17:30), cấu hình mẫu, **`tools/README.md` = hướng dẫn cài đặt** |

## Cách hoạt động
Máy chủ Google không vào được ổ `\\HCM-FS01` → máy Windows trong mạng công ty chạy `tools/auto-sync.ps1` mỗi giờ 7:30–17:30, đọc danh sách file
trong `12_HoSo_TrinhKy` (đường dẫn + ngày sửa đổi) và POST lên web app kèm khóa. Server kiểm tra khóa (Script Properties chỉ lưu mã băm
`AUTO_SYNC_KEY_HASH`), lập kế hoạch y như bảng xem trước của đồng bộ thủ công với lựa chọn mặc định — đổi tình trạng theo thư mục, tạo mới file có
ký hiệu chuyên viên, **không** đổi chuyên viên phụ trách, bỏ qua file ở nhiều thư mục / hồ sơ trùng tên, hồ sơ Đã duyệt giữ nguyên, ngày = ngày sửa đổi
của file — rồi ghi bằng `applyFolderSync_` (lõi) với tài khoản hệ thống `auto-sync`. Kết quả lần chạy gần nhất: Script Properties `LAST_AUTO_SYNC`.

**Không cần người dùng xác nhận**: đồng bộ tự động ghi thẳng (chỉ những thay đổi "chắc chắn" — các trường hợp cần chọn như file ở nhiều thư mục,
hồ sơ trùng tên, đổi chuyên viên phụ trách thì bỏ qua để đồng bộ thủ công xử lý). Mỗi thay đổi ghi 1 dòng History bởi "Đồng bộ tự động" và
chuyên viên / Trưởng phòng nhận thông báo ở chuông như đồng bộ thủ công; sửa sai bằng nút Cập nhật.

**Nhiều máy** (theo người dùng: "có thể dùng trên nhiều máy không" → làm trạng thái riêng từng máy): cài script trên nhiều máy để dự phòng,
**dùng chung một khóa**. Server xử lý tuần tự (`withLock_` trong `applyFolderSync_`, kiểm tra lại tình trạng `from` / trùng tên) nên máy chạy sau
không ghi trùng. Script Properties `AUTO_SYNC_MACHINES` = `{ tênMáy: lần chạy gần nhất + lastOkAt/lastOkTs }` (`recordAutoSyncRun_`; máy quá 30 ngày
không gửi tự bị xóa, tối đa 20 máy; admin xóa tay bằng action `autoSyncForget`). Thẻ Quản trị: bảng từng máy (Tốt / Lỗi / **Không gửi dữ liệu** =
T2–T6 8:45–18:00 mà quá 2 giờ không gửi) và trạng thái chung — chỉ báo đỏ khi **mọi** máy có vấn đề, còn ≥1 máy tốt thì "Hoạt động · n/m máy
có vấn đề". Chú thích nút đồng bộ hiện lần **thành công** gần nhất (máy nào cũng được).

## Điểm gắn trong phần lõi (dùng chung, không phụ thuộc thư mục này)
- `src/Code.gs`: `doPost` gọi `autoSyncPost_` nếu có (không có → "Không hỗ trợ"); `api()` tra thêm `AUTO_SYNC_ACTIONS_` nếu có.
- `src/Submissions.gs`: `bootstrap_` gọi `autoSyncBootstrap_` nếu có.
- `src/Index.html`: `includeIf('AutoSyncUi')`.
- `src/App.html`: `EXT.names`, `EXT.syncNotes`, `EXT.adminCards` (cùng `EXT.data`, `ACTIONS` qua `window.APP`).
- `.github/workflows/deploy.yml`: chép `autosync/src/*` vào `src/` nếu thư mục có.
- `dev/serve.js`: nạp `autosync/src` khi chạy thử (`AUTOSYNC=0 node dev/serve.js` để tắt); `dev/mock.js` có `ContentService`.

## Gỡ bỏ tính năng
1. Xóa thư mục `autosync/`, commit, merge lên `main` → workflow deploy đẩy code không còn chức năng này (`clasp push --force` xóa file cũ trên Apps Script).
   Web vẫn chạy bình thường; nút "Đồng bộ thư mục" thủ công giữ nguyên; lịch sử cũ ghi "auto-sync" vẫn hiển thị (tên đăng nhập).
2. Trên **từng** máy Windows đã cài: `powershell -ExecutionPolicy Bypass -File cai-dat.ps1 -GoBo` để gỡ lịch chạy (hoặc xóa task *"CENTRAL PMH - Dong bo thu muc"* trong Task Scheduler).
3. (Tùy chọn) Xóa Script Properties `AUTO_SYNC_KEY_HASH`, `LAST_AUTO_SYNC`, `AUTO_SYNC_MACHINES` trong Apps Script → Project Settings.

Tạm dừng mà không gỡ: chỉ cần gỡ lịch chạy trên máy Windows (bước 2), hoặc tạo khóa mới trên web mà không dán vào máy.

## Chạy thử local
`node dev/serve.js` (mặc định có chức năng này). Server gọi được trực tiếp trong trang: `rotateAutoSyncKey_(admin)`, rồi
`autoSyncPost_({ postData: { contents: JSON.stringify({ key, files: [{ p: '12_HoSo_TrinhKy/02_HS_TP_Trinh/ten.pdf', d: '2026-10-05' }] }) } })`.
