# CLAUDE.md — Hệ thống theo dõi hồ sơ

Hướng dẫn cho Claude (và người) làm việc với repo này trên mọi thiết bị. Người dùng nói tiếng Việt: trả lời và viết giao diện bằng tiếng Việt.

## Tổng quan
Web app nội bộ theo dõi tình trạng trình duyệt hồ sơ của một team, chạy trên **Google Apps Script**, dữ liệu trong **Google Sheet `HoSo_DB`** (trên Drive của `caoquanghao1902@gmail.com`).

- Web app: https://script.google.com/macros/s/AKfycbzvKv467-ZX34kCYKkMZPRqIgeP1jVzEJB7qK2FWqB7eIznVwrSxnVLKwn3djB_JBSW8Q/exec
- Apps Script project: `1-VOYyCgDW8A8Wry1fjbpMethIbkWVBXF1B5HDUO363h3pFMB3e0wM37K` (trong `.clasp.json`)
- Deployment ID đang dùng (luôn cập nhật vào ID này để giữ nguyên link): `AKfycbzvKv467-ZX34kCYKkMZPRqIgeP1jVzEJB7qK2FWqB7eIznVwrSxnVLKwn3djB_JBSW8Q`
- GitHub: https://github.com/KaoWangHao/WEB-PMH (public, nhánh `main`)

## Yêu cầu nghiệp vụ đã chốt với người dùng
- Đăng nhập bằng **tài khoản riêng của app** (username + mật khẩu), **không cần Gmail**. Không có tự đăng ký: admin tạo tài khoản với mật khẩu tạm, người dùng bắt buộc đổi ở lần đăng nhập đầu. Khóa 15 phút sau 5 lần sai.
- Hồ sơ **chỉ có tên** (đặt theo quy ước team) + mã tự sinh `HS-yyyy-0001`. Không đính kèm file, không gửi email.
- 6 tình trạng cố định: `CV` Hồ sơ trong ổ Chuyên viên, `TP_MH` Đang trình TP.MH, `GDTM` Đang trình GĐTM, `TP_CC` Đang trình TP.C&C, `TRA_LAI` Trả lại hồ sơ, `DA_DUYET` Đã duyệt. **Không có luồng duyệt cố định** — người dùng tự chọn tình trạng.
- Mỗi lần tạo/cập nhật, **server tự ghi ngày** dạng `dd/MM/yyyy` (giờ Việt Nam, không có giờ). `submittedAt` = lần đầu chuyển sang "Đang trình …"; `approvedAt` = ngày chuyển sang Đã duyệt. Mọi thay đổi ghi 1 dòng `History`.
- Phân quyền theo chức danh (`position`):
  - Chuyên viên (`CV`): xem **tất cả** hồ sơ, chỉ sửa hồ sơ của mình; có dashboard cá nhân.
  - `TP_MH`, `TP_CC`, `GDTM`: xem và sửa mọi hồ sơ; có **Dashboard Trưởng phòng** (khối "Đang trình <chức danh của tôi>", lọc/sort theo chuyên viên & tình trạng, ma trận Chuyên viên × Tình trạng, biểu đồ, xuất CSV).
  - `isAdmin` (cờ riêng): quản lý tài khoản, xóa hồ sơ.
- **Đồng bộ từ thư mục chia sẻ** (chỉ Trưởng phòng/admin, nút trên Dashboard Trưởng phòng): trình duyệt đọc tên file trong thư mục `12_HoSo_TrinhKy` trên ổ `\\HCM-FS01\fs01\...` (người dùng vào qua FortiClient VPN, `<input webkitdirectory>`), **mỗi file là một hồ sơ**, tên hồ sơ trên web phải **giống chính xác** tên file (có hoặc không kèm đuôi; phân biệt hoa/thường; chỉ chuẩn hóa NFC và khoảng trắng thừa vì web tự gộp khi lưu). Thư mục → tình trạng cấu hình ở `FOLDER_SYNC.RULES` (`Config.gs`), quy tắc dài nhất thắng, thư mục khác bị bỏ qua. Luôn có bước xem trước; **file/thư mục có trên server mà web không có thì bỏ qua** (không tạo mới); file ở nhiều thư mục / trùng tên trên web thì không tự xử lý. Ngày ghi nhận = ngày bấm đồng bộ. Không có đồng bộ tự động (máy chủ Google không vào được mạng nội bộ).
- Thương hiệu: tên app **CENTRAL PROCUREMENT DEPARTMENT**, logo CENTRAL, màu navy `#1E2B59` + cam `#F16314` (biến `--navy-900`, `--accent` trong `Styles.html`).
- Giao diện theo **style ERP của công ty người dùng**: trang đăng nhập nền navy "Hello!", topbar trắng có nút pill "Dashboard", sidebar xanh navy, thẻ "THAM SỐ" (ô lọc có nhãn nhỏ), "TỔNG QUAN" (ô tròn màu + nhãn), bảng chi tiết có thanh phân trang xám.

## Kiến trúc
| File | Vai trò |
|---|---|
| `src/Code.gs` | `doGet`, `include`, **`api(action, token, payload)`** — hàm duy nhất client gọi |
| `src/Config.gs` | `APP_CONFIG` (tên, logo, helpdesk), `STATUSES`, `POSITIONS`, `SHEET_HEADERS` |
| `src/Db.gs` | Đọc/ghi sheet (mọi giá trị lưu dạng text `@`), `withLock_`, `today_()`, `dmyToIso_` |
| `src/Auth.gs` | Hash SHA-256 nhiều vòng + salt, phiên trong CacheService (6h), `canEditSubmission_` |
| `src/Submissions.gs` | `bootstrap_` (gửi toàn bộ dữ liệu cho client), tạo/cập nhật/xóa hồ sơ |
| `src/Admin.gs` | CRUD tài khoản, đặt lại mật khẩu |
| `src/FolderSync.gs` | `applyFolderSync_` (action `folderSync`): kiểm tra lại & ghi thay đổi từ đồng bộ thư mục; lần đồng bộ gần nhất lưu ở Script Properties `LAST_FOLDER_SYNC` |
| `src/Setup.gs` | `setup()`, `resetAdminPassword()` — chỉ chủ sở hữu chạy từ editor (`requireOwner_`) |
| `src/Index.html` / `Styles.html` / `App.html` | SPA vanilla JS; dashboard & thống kê **tính ở client**; Chart.js 4 từ cdnjs |
| `src/Brand.html` | Logo CENTRAL nhúng base64 (`.brand-logo`, `.brand-mark`) — **file sinh tự động** từ `assets/` bằng `node dev/build-brand.js`, không sửa tay |
| `assets/` | Ảnh logo gốc + `favicon.png` (favicon dùng link raw GitHub nhánh `main`, xem `FAVICON_URL`) |
| `dev/` | Chạy thử local: `serve.js` ghép HTML như HtmlService, `mock.js` giả lập SpreadsheetApp/Cache/Lock/Utilities, `seed.js` dữ liệu mẫu |

Quy ước code:
- Backend viết kiểu ES5 (`var`, `function`), hàm nội bộ **kết thúc bằng `_`** để không gọi được từ trình duyệt. Thêm action mới → khai báo trong `API_ACTIONS_` ở `Code.gs` và **kiểm tra quyền ở server**.
- Lỗi nghiệp vụ dùng `appError_(message, code)`; code `AUTH` → client về trang đăng nhập.
- Client: event delegation qua `data-act` / `data-change` / `data-input`; `render()` vẽ lại toàn bộ, giữ focus & scroll. Luôn `esc()` dữ liệu người dùng.
- Đổi cấu trúc sheet (thêm cột…) phải tính đến dữ liệu thật đang có trong `HoSo_DB`; thêm cột vào **cuối** `SHEET_HEADERS` và chạy lại `setup()` để ghi header.

## Chạy thử local
```bash
node dev/serve.js
```
Mở http://localhost:5173 (`?reset` để tạo lại dữ liệu mẫu). Tài khoản demo trong `dev/seed.js`. Backend thật trong `src/*.gs` chạy trên mock, nên test được cả phân quyền.

## Deploy
- **Tự động**: push lên `main` có thay đổi trong `src/` → GitHub Action `.github/workflows/deploy.yml` chạy `clasp push --force` + `clasp update-deployment <ID>`. Cần secret `CLASPRC_JSON` (nội dung `~/.clasprc.json` sau `clasp login` bằng `caoquanghao1902@gmail.com`). Có thể chạy tay ở tab Actions (workflow_dispatch).
- Nếu Action báo lỗi đăng nhập (token hết hạn/bị thu hồi): trên máy có clasp chạy `clasp login`, rồi `gh secret set CLASPRC_JSON -R KaoWangHao/WEB-PMH < ~/.clasprc.json`.
- **Thủ công** (máy có clasp): `clasp push --force` rồi `clasp update-deployment AKfycbzvKv467-ZX34kCYKkMZPRqIgeP1jVzEJB7qK2FWqB7eIznVwrSxnVLKwn3djB_JBSW8Q`.
- `clasp push` chỉ cập nhật bản nháp (HEAD); người dùng chỉ thấy thay đổi sau `update-deployment`.

## Lưu ý quan trọng
- `clasp create` / `clasp pull` có thể **ghi đè `src/appsscript.json`** bằng bản mặc định — phải giữ `timeZone: Asia/Ho_Chi_Minh`, `webapp.executeAs: USER_DEPLOYING`, `webapp.access: ANYONE_ANONYMOUS`.
- Thư mục `Tham khảo giao diện/` (ảnh chụp ERP công ty, có ảnh cá nhân) **không được đưa lên git** (đã có trong `.gitignore`).
- Không bao giờ commit mật khẩu thật, `.clasprc.json` hay token.
- Trên máy Windows của người dùng, shell mới có thể chưa có PATH cho node/clasp/gh: nạp lại PATH từ registry trước khi chạy.
