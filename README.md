# Hệ thống theo dõi hồ sơ

Web app theo dõi tình trạng trình duyệt hồ sơ cho team, chạy trên **Google Apps Script**, dữ liệu lưu trong **Google Sheet**.

**Link web app:** https://script.google.com/macros/s/AKfycbzvKv467-ZX34kCYKkMZPRqIgeP1jVzEJB7qK2FWqB7eIznVwrSxnVLKwn3djB_JBSW8Q/exec

- Đăng nhập bằng **tài khoản riêng của ứng dụng** (không cần Gmail). Admin tạo tài khoản trước, người dùng đổi mật khẩu tạm ở lần đăng nhập đầu.
- 6 tình trạng hồ sơ: *Hồ sơ trong ổ Chuyên viên*, *Đang trình TP.MH*, *Đang trình GĐTM*, *Đang trình TP.C&C*, *Trả lại hồ sơ*, *Đã duyệt*.
- Mỗi lần tạo hoặc cập nhật, hệ thống **tự ghi ngày** (dd/MM/yyyy, giờ Việt Nam) và lưu lịch sử.
- **Chuyên viên**: xem mọi hồ sơ, chỉ sửa hồ sơ của mình, có dashboard cá nhân.
- **TP.MH / TP.C&C / GĐTM**: xem và sửa mọi hồ sơ, có Dashboard Trưởng phòng (hồ sơ đang trình mình, lọc/sắp xếp theo chuyên viên và tình trạng, ma trận Chuyên viên × Tình trạng, biểu đồ, xuất CSV).
- **Quản trị viên** (cờ admin): quản lý tài khoản.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `src/Code.gs` | `doGet`, hàm `api()` duy nhất mà client gọi |
| `src/Config.gs` | Tên ứng dụng, logo, danh sách tình trạng / chức danh |
| `src/Auth.gs` | Đăng nhập, phiên, mật khẩu (SHA-256 + salt), phân quyền |
| `src/Submissions.gs` | Tạo / cập nhật / xóa hồ sơ, tải dữ liệu |
| `src/Admin.gs` | Quản lý tài khoản |
| `src/Setup.gs` | `setup()` và `resetAdminPassword()` (chỉ chạy từ editor) |
| `src/Index.html`, `Styles.html`, `App.html` | Giao diện (dashboard tính ở phía trình duyệt) |
| `dev/` | Chạy thử local với dữ liệu giả (không đẩy lên Apps Script) |

## Triển khai lần đầu

Cần: Node.js, `npm install -g @google/clasp`.

1. Bật Apps Script API: https://script.google.com/home/usersettings
2. Đăng nhập clasp: `clasp login`
3. Tạo project và đẩy code (đã làm, xem `.clasp.json`):
   ```bash
   clasp create --type standalone --title "Theo doi ho so" --rootDir src
   clasp push --force
   ```
4. Mở editor (`clasp open-script`), chọn hàm **setup** → **Run**, cấp quyền.
   Xem **Execution log** để lấy link Google Sheet `HoSo_DB` và **mật khẩu tạm của tài khoản `admin`**.
5. Trong editor: **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (ai có link đều mở được trang đăng nhập, không cần tài khoản Google)
6. Mở link `/exec`, đăng nhập `admin`, đổi mật khẩu, vào **Quản trị tài khoản** để tạo tài khoản cho team.

## Cập nhật sau khi sửa code

```bash
clasp push --force
clasp update-deployment <ID_DEPLOYMENT> --description "mô tả"
git add -A
git commit -m "mô tả thay đổi"
git push
```

`<ID_DEPLOYMENT>` xem bằng `clasp list-deployments`. Cập nhật đúng deployment cũ thì link web app được giữ nguyên.

## Chạy thử local

```bash
node dev/serve.js
```

Mở http://localhost:5173 (thêm `?reset` để tạo lại dữ liệu mẫu). Code backend thật trong `src/*.gs` chạy trên trình duyệt với Google Sheets giả lập (`dev/mock.js`); tài khoản và mật khẩu demo nằm trong `dev/seed.js`.

## Quên mật khẩu admin

Chủ sở hữu mở Apps Script editor, chạy hàm **resetAdminPassword** và xem mật khẩu tạm mới trong Execution log.

## Tùy chỉnh

- Tên ứng dụng, logo (`LOGO_URL`), favicon (`FAVICON_URL`), nội dung Helpdesk: `src/Config.gs` → `APP_CONFIG`.
- Logo CENTRAL mặc định nhúng base64 trong `src/Brand.html`, sinh từ `assets/` bằng `node dev/build-brand.js` (chạy lại khi thay ảnh).
- Màu và nhãn tình trạng: `STATUSES` trong `src/Config.gs`.
