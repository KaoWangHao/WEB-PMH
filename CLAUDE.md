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
- **Loại hồ sơ** (không lưu trong sheet, tính ở client từ tên — `docTypeOf` trong `App.html`): tên chứa cụm trong `REPORT_KEYWORDS` (`Config.gs`, mặc định `xin y kien`; so không dấu, không phân biệt hoa/thường, bỏ ngoặc/gạch) → **Báo cáo** (`BC`), còn lại → **Trình duyệt** (`TD`). Có ô lọc "Loại hồ sơ" trong THAM SỐ, cột Loại trong các bảng/CSV, thẻ **"Trình duyệt & Báo cáo"** trên Dashboard Trưởng phòng (theo tình trạng, theo chuyên viên, bấm để lọc) và số đếm theo loại ở khối "Đang trình <chức danh>".
- **Dự án**: danh mục ở sheet **`Projects`** (`code` = STT, `name`, `active`), cú pháp thư mục dự án `STT_TÊN DỰ ÁN`. Sheet **tự tạo + nạp sẵn 99 dự án** (`PROJECT_SEED_` trong `Projects.gs`: 76_LAPURA, 192–295; theo người dùng: 206 = `206_FUTA`, **bỏ** 199, 200, 203, 204, 210, 212 vì tên bị cắt) ở lần `bootstrap_` đầu tiên; sheet đã tạo từ bản thử được sửa 1 lần bởi `applyProjectFixes_` (cờ Script Property `PROJECTS_FIX_V1`). Hồ sơ gắn dự án **ở client theo số đầu tên** (`projectCodesOf`: `231_…`, `273. …`, `267&285_…` → nhiều dự án). Ngoài mã số còn **mã chữ** (`normalizeProjectCode_`: chữ không dấu + số + `&`, viết hoa): **`D&B` = Phòng D&B** — hồ sơ bắt đầu bằng `D&B` (không phân biệt hoa/thường) thuộc dự án này; sheet cũ được bổ sung 1 lần bởi `applyProjectAdditions_` (cờ `PROJECTS_FIX_V2`). Admin quản lý ở trang Quản trị (thêm/sửa, **Dán danh sách** nhiều dòng `STT_TÊN` để thêm/cập nhật). Có ô lọc "Dự án", cột Dự án (bảng/CSV), thẻ **"Hồ sơ theo dự án"** và bảng "Hồ sơ đệ trình" xem theo **Chuyên viên | Dự án**.
- 6 tình trạng cố định: `CV` Hồ sơ trong ổ Chuyên viên, `TP_MH` Đang trình TP.MH, `GDTM` Đang trình GĐTM, `TP_CC` Đang trình TP.C&C, `TRA_LAI` Trả lại hồ sơ, `DA_DUYET` Đã duyệt. **Không có luồng duyệt cố định** — người dùng tự chọn tình trạng.
- Mỗi lần tạo/cập nhật, **server tự ghi ngày** dạng `dd/MM/yyyy` (giờ Việt Nam, không có giờ). `submittedAt` = lần đầu chuyển sang "Đang trình …"; `approvedAt` = ngày chuyển sang Đã duyệt. Mọi thay đổi ghi 1 dòng `History`.
- Phân quyền theo chức danh (`position`):
  - Chuyên viên (`CV`): xem **tất cả** hồ sơ, chỉ sửa hồ sơ của mình; có dashboard cá nhân.
  - `TP_MH`, `TP_CC`, `GDTM`: xem và sửa mọi hồ sơ; có **Dashboard Trưởng phòng** — bố cục gọn (`viewManager`): THAM SỐ (nút "Đồng bộ thư mục" ở góc; thu gọn mặc định trên điện thoại) + TỔNG QUAN 1 hàng ô nhỏ (`mgrOverview`: tình trạng, Trình duyệt/Báo cáo, chỉ số; bấm để lọc) + **thanh tab sticky** (`mgrTabs`, nhớ tab ở localStorage `hs_mgr_tab`): Đang trình <chức danh> · Chuyên viên · Dự án · Trình duyệt & Báo cáo · Đệ trình theo thời gian · Biểu đồ · Danh sách hồ sơ; bấm số trong bảng thống kê → lọc + `jumpToTab('list')`. Nội dung các tab: (khối "Đang trình <chức danh của tôi>", lọc/sort theo chuyên viên & tình trạng, ma trận Chuyên viên × Tình trạng, **bảng "Hồ sơ đệ trình theo chuyên viên"** — số hồ sơ theo **ngày trình** (`submittedAt`) theo Tuần/Tháng/Quý/Năm, thanh màu theo tình trạng hiện tại, bấm ô/tên/cột để xem chi tiết nhóm theo tình trạng + xuất CSV; dùng Từ ngày–Đến ngày, Chuyên viên, Tên/mã của THAM SỐ — biểu đồ, xuất CSV).
  - `isAdmin` (cờ riêng): quản lý tài khoản, xóa hồ sơ.
- **Đồng bộ từ thư mục chia sẻ** (chỉ Trưởng phòng/admin, nút trên Dashboard Trưởng phòng): trình duyệt đọc tên file trong thư mục `12_HoSo_TrinhKy` trên ổ `\\HCM-FS01\fs01\...` (người dùng vào qua FortiClient VPN, `<input webkitdirectory>`), **mỗi file là một hồ sơ**, tên hồ sơ trên web = tên file **bỏ đuôi** (.xlsx, .pdf…; nhập kèm đuôi vẫn khớp), **không phân biệt hoa/thường**, bỏ qua khoảng trắng thừa và khác biệt NFC/NFD. Thư mục → tình trạng cấu hình ở `FOLDER_SYNC.RULES` (`Config.gs`), quy tắc dài nhất thắng, thư mục khác bị bỏ qua. Luôn có bước xem trước; **file/thư mục có trên server mà web không có thì bỏ qua** (không tạo mới); file ở nhiều thư mục / trùng tên trên web thì không tự xử lý. Ngày ghi nhận = ngày bấm đồng bộ. Không có đồng bộ tự động (máy chủ Google không vào được mạng nội bộ). **Ký hiệu chuyên viên** ở **cuối tên file** (`..._TP_CQH`, `... (CQH)`; 2–6 chữ cái) → tài khoản có ký hiệu đó (cột `initials` cuối sheet `Users`, admin nhập ở Quản trị tài khoản; tự điền 1 lần theo họ tên trong `USER_INITIALS_HINTS` — CQH Cao Quang Hảo, LDS Lê Đình Sự, DNQ Đỗ Nhật Quang, HTT Hoàng Thanh Thoại, NSK Nguyễn Sơn Khang — bởi `ensureUserInitials_`, cờ `USERS_INITIALS_V1`). Tên trên web không kèm ký hiệu vẫn khớp. Theo người dùng: file có ký hiệu nhưng chưa có trên web **vẫn bỏ qua**; hồ sơ có người phụ trách khác ký hiệu → mục "Đổi chuyên viên phụ trách" trong bảng xem trước, **mặc định chưa tích** (payload `owners` của action `folderSync`, ghi History "đổi chuyên viên: A → B").
- Thương hiệu: tên app **CENTRAL PROCUREMENT DEPARTMENT**, logo CENTRAL, màu navy `#1E2B59` + cam `#F16314` (biến `--navy-900`, `--accent` trong `Styles.html`).
- Giao diện theo **style ERP của công ty người dùng**: trang đăng nhập nền navy "Hello!", topbar trắng có nút pill "Dashboard", sidebar xanh navy, thẻ "THAM SỐ" (ô lọc có nhãn nhỏ), "TỔNG QUAN" (ô tròn màu + nhãn), bảng chi tiết **không phân trang**: toàn bộ hồ sơ trong khung cuộn (`.table-scroll`, tiêu đề cột sticky, `render()` giữ vị trí cuộn; đổi bộ lọc → `resetPage(view)` đưa về đầu), thanh xám dưới cùng hiện tổng số.

## Kiến trúc
| File | Vai trò |
|---|---|
| `src/Code.gs` | `doGet`, `include`, **`api(action, token, payload)`** — hàm duy nhất client gọi |
| `src/Config.gs` | `APP_CONFIG` (tên, logo, helpdesk), `STATUSES`, `POSITIONS`, `SHEET_HEADERS` |
| `src/Db.gs` | Đọc/ghi sheet (mọi giá trị lưu dạng text `@`), `withLock_`, `today_()`, `dmyToIso_` |
| `src/Auth.gs` | Hash SHA-256 nhiều vòng + salt, phiên trong CacheService (6h), `canEditSubmission_` |
| `src/Submissions.gs` | `bootstrap_` (gửi toàn bộ dữ liệu cho client), tạo/cập nhật/xóa hồ sơ |
| `src/Admin.gs` | CRUD tài khoản, đặt lại mật khẩu |
| `src/Projects.gs` | Danh mục dự án: `ensureProjectsSheet_` (tự tạo sheet + seed), `listProjects_`, `saveProject_`, `importProjects_` (admin) |
| `src/FolderSync.gs` | `applyFolderSync_` (action `folderSync`): kiểm tra lại & ghi thay đổi từ đồng bộ thư mục; lần đồng bộ gần nhất lưu ở Script Properties `LAST_FOLDER_SYNC` |
| `src/Setup.gs` | `setup()`, `resetAdminPassword()` — chỉ chủ sở hữu chạy từ editor (`requireOwner_`) |
| `src/Index.html` / `Styles.html` / `App.html` | SPA vanilla JS; dashboard & thống kê **tính ở client**; Chart.js 4 từ cdnjs |
| `src/Brand.html` | Logo CENTRAL nhúng base64 (`.brand-logo`, `.brand-mark`) — **file sinh tự động** từ `assets/` bằng `node dev/build-brand.js`, không sửa tay |
| `assets/` | Ảnh logo gốc, `app-icon-1024.png` (icon app gốc, mẫu C: logo trắng nền navy) + `favicon.png` (favicon dùng link raw GitHub nhánh `main`, xem `FAVICON_URL`) |
| `docs/` | **GitHub Pages** (nhánh `main`, thư mục `/docs`) → https://kaowanghao.github.io/WEB-PMH/ : trang cài icon **CENTRAL PMH** lên màn hình điện thoại (manifest + apple-touch-icon, vì Apps Script không cho khai báo icon). Mở từ icon (standalone hoặc `?app=1`) thì tự chuyển sang web app; `?huongdan` để luôn xem hướng dẫn. Link nằm ở `APP_CONFIG.INSTALL_URL` |
| `dev/` | Chạy thử local: `serve.js` ghép HTML như HtmlService, `mock.js` giả lập SpreadsheetApp/Cache/Lock/Utilities, `seed.js` dữ liệu mẫu |

Quy ước code:
- Backend viết kiểu ES5 (`var`, `function`), hàm nội bộ **kết thúc bằng `_`** để không gọi được từ trình duyệt. Thêm action mới → khai báo trong `API_ACTIONS_` ở `Code.gs` và **kiểm tra quyền ở server**.
- Lỗi nghiệp vụ dùng `appError_(message, code)`; code `AUTH` → client về trang đăng nhập.
- Client: event delegation qua `data-act` / `data-change` / `data-input`; `render()` vẽ lại toàn bộ, giữ focus & scroll. Luôn `esc()` dữ liệu người dùng.
- Ô ngày lọc (`dateField`): **ô text `dd/mm/yyyy`** (tự chèn `/`, nhận `1/9/2026`, `01-09-2026`, `01092026`; `parseDmy`) + **lịch tự vẽ** (`calendarPanel`, mở bằng nút 📅 qua `toggle-dd`). **Không dùng lịch gốc của trình duyệt**: trong iframe khác origin của Apps Script `showPicker()` bị chặn (SecurityError) và `<input type=date>` hiển thị theo locale máy. Bộ lọc vẫn lưu ISO `yyyy-mm-dd`.
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
