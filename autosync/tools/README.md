# Đồng bộ thư mục tự động

Cứ **30 phút một lần** từ **7:30 đến 17:30** (7:30, 8:00, 8:30, …, 17:30), một máy tính trong mạng công ty tự đọc danh sách file trong thư mục `12_HoSo_TrinhKy`
(ổ `\\HCM-FS01`) và gửi lên web. Web tự đổi tình trạng hồ sơ theo thư mục, giống bấm **"Đồng bộ thư mục"** với lựa chọn mặc định.
Nút đồng bộ thủ công trên web vẫn dùng bình thường.

> Vì sao cần máy tính trong công ty? Máy chủ Google (nơi chạy web) không vào được ổ chia sẻ nội bộ — chỉ máy có VPN / mạng công ty mới đọc được.

## Đồng bộ tự động làm gì
- Đổi tình trạng hồ sơ theo thư mục chứa file (quy tắc như đồng bộ thủ công); ngày ghi nhận = ngày sửa đổi của file.
- Tạo hồ sơ mới cho file chưa có trên web mà tên kết thúc bằng ký hiệu chuyên viên (CQH, LDS, HTT, NSK, DNQ).
- **Không** đổi chuyên viên phụ trách; **bỏ qua** file nằm ở nhiều thư mục và hồ sơ trùng tên trên web (để đồng bộ thủ công xử lý).
- Hồ sơ **Đã duyệt** luôn giữ nguyên.
- Lịch sử hồ sơ ghi "Đồng bộ từ thư mục chia sẻ" bởi **Đồng bộ tự động**; chuyên viên vẫn nhận thông báo ở chuông.
- **Không cần ai bấm xác nhận**: thay đổi được ghi ngay. Trường hợp cần người chọn (file ở nhiều thư mục, trùng tên, đổi chuyên viên phụ trách)
  thì tự động bỏ qua — dùng nút "Đồng bộ thư mục" thủ công để xử lý. Ghi sai thì sửa bằng nút Cập nhật của hồ sơ.

## Cài đặt (1 lần, trên máy luôn bật trong giờ làm việc)
1. Máy chạy Windows, đăng nhập bằng tài khoản mở được ổ `\\HCM-FS01` (có VPN / mạng công ty trong giờ làm việc).
2. Tải 4 file trong thư mục `autosync/tools/` trên GitHub (`auto-sync.ps1`, `cai-dat.ps1`, `auto-sync.config.example.json`, `README.md`) về một thư mục, vd `C:\CENTRAL-PMH\auto-sync`.
3. Trên web: **Quản trị tài khoản → thẻ "Đồng bộ thư mục tự động" → Tạo khóa**, sao chép khóa.
4. Chép `auto-sync.config.example.json` thành **`auto-sync.config.json`**, mở bằng Notepad, dán khóa vào ô `"key"`.
   Kiểm tra `"root"` đúng đường dẫn thư mục `12_HoSo_TrinhKy` (dấu `\` viết thành `\\`).
5. Chuột phải **`cai-dat.ps1` → Run with PowerShell**. Script tạo lịch chạy *"CENTRAL PMH - Dong bo thu muc"* trong Task Scheduler
   (lặp **mỗi 30 phút** — ngoài khung 7:30–17:30 script tự bỏ qua — và thêm 1 lần **3 phút sau khi đăng nhập Windows**),
   in "Lần chạy kế tiếp", chạy thử 1 lần ngay rồi **giữ cửa sổ** để bạn đọc kết quả (nhấn Enter để đóng).
   Script và file cấu hình được **chép vào `%LOCALAPPDATA%\CENTRAL-PMH\auto-sync`** trên máy và lịch chạy từ đó (nhật ký `auto-sync.log` cũng ở đây),
   nên thư mục tải về để ở đâu cũng được (kể cả ổ mạng / OneDrive) và có thể xóa sau khi cài.
   **Đổi khóa / sửa cấu hình**: sửa `auto-sync.config.json` ở thư mục tải về rồi chạy lại `cai-dat.ps1`.
   Cập nhật script / lịch chạy: tải lại 2 file `.ps1` rồi chạy lại `cai-dat.ps1` (ghi đè lịch cũ, giữ nguyên file cấu hình).
6. Trên web, thẻ "Đồng bộ thư mục tự động" hiện **Hoạt động** cùng thời gian và kết quả lần chạy gần nhất.

## Cài trên nhiều máy (dự phòng)
Làm lại bước 1, 2, 4, 5 trên máy khác và **chép nguyên file `auto-sync.config.json`** từ máy đầu tiên (dùng chung một khóa — đừng bấm
"Tạo khóa mới", vì khóa cũ sẽ hết hiệu lực trên mọi máy). Các máy chạy cùng lúc không ghi trùng: máy chạy sau thấy hồ sơ đã đúng tình trạng thì bỏ qua.
Thẻ "Đồng bộ thư mục tự động" có bảng **từng máy** (Tốt / Lỗi / Không gửi dữ liệu); trạng thái chung chỉ báo lỗi khi **mọi** máy đều có vấn đề.
Máy thôi dùng: gỡ lịch chạy trên máy đó rồi bấm **Xóa** ở dòng của máy trong bảng (máy quá 30 ngày không gửi cũng tự biến mất).

## Theo dõi, sửa lỗi
- Nhật ký trên máy: `%LOCALAPPDATA%\CENTRAL-PMH\auto-sync\auto-sync.log` (dán đường dẫn này vào thanh địa chỉ File Explorer).
- Task Scheduler báo **"The directory name is invalid" (0x8007010B)**: bản cài cũ chạy script ngay tại thư mục tải về (ổ mạng / ổ map / OneDrive /
  thư mục đã di chuyển) → tải bản mới của `cai-dat.ps1`, `auto-sync.ps1` và chạy lại `cai-dat.ps1`. Trên web: thẻ "Đồng bộ thư mục tự động" (Quản trị) và chú thích của nút "Đồng bộ thư mục".
- "Không truy cập được thư mục…": máy chưa kết nối VPN / mạng công ty lúc chạy.
- "Khóa đồng bộ tự động không đúng": tạo khóa mới trên web rồi dán lại vào `auto-sync.config.json` (trên **mọi** máy).
- "Không gửi dữ liệu": T2–T6 máy bỏ lỡ lần chạy theo lịch gần nhất (7:30, 8:00, 8:30, …) — máy tắt / ngủ, **chưa đăng nhập Windows**
  (lịch chỉ chạy khi tài khoản đã cài đang đăng nhập; khóa màn hình vẫn chạy), hoặc lịch chạy bị gỡ.
  Kiểm tra: mở **Task Scheduler** → task *"CENTRAL PMH - Dong bo thu muc"* → xem *Last Run Time*, *Last Run Result* (0x0 = tốt), *Next Run Time*;
  và file `auto-sync.log` (mỗi lần chạy ghi "Bat dau dong bo…"; không có dòng nào lúc 7:30, 8:00, 8:30… nghĩa là lịch không chạy).
- Chạy tay bất kỳ lúc nào: `powershell -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\CENTRAL-PMH\auto-sync\auto-sync.ps1" -Force`.
- Gỡ lịch chạy: `powershell -ExecutionPolicy Bypass -File cai-dat.ps1 -GoBo`.

**Không đưa file `auto-sync.config.json` (có khóa) lên GitHub hay gửi cho người khác.**
