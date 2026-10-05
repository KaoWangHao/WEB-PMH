# Đồng bộ thư mục tự động

Mỗi giờ từ **7:30 đến 17:30**, một máy tính trong mạng công ty tự đọc danh sách file trong thư mục `12_HoSo_TrinhKy`
(ổ `\\HCM-FS01`) và gửi lên web. Web tự đổi tình trạng hồ sơ theo thư mục, giống bấm **"Đồng bộ thư mục"** với lựa chọn mặc định.
Nút đồng bộ thủ công trên web vẫn dùng bình thường.

> Vì sao cần máy tính trong công ty? Máy chủ Google (nơi chạy web) không vào được ổ chia sẻ nội bộ — chỉ máy có VPN / mạng công ty mới đọc được.

## Đồng bộ tự động làm gì
- Đổi tình trạng hồ sơ theo thư mục chứa file (quy tắc như đồng bộ thủ công); ngày ghi nhận = ngày sửa đổi của file.
- Tạo hồ sơ mới cho file chưa có trên web mà tên kết thúc bằng ký hiệu chuyên viên (CQH, LDS, HTT, NSK, DNQ).
- **Không** đổi chuyên viên phụ trách; **bỏ qua** file nằm ở nhiều thư mục và hồ sơ trùng tên trên web (để đồng bộ thủ công xử lý).
- Hồ sơ **Đã duyệt** luôn giữ nguyên.
- Lịch sử hồ sơ ghi "Đồng bộ từ thư mục chia sẻ" bởi **Đồng bộ tự động**; chuyên viên vẫn nhận thông báo ở chuông.

## Cài đặt (1 lần, trên máy luôn bật trong giờ làm việc)
1. Máy chạy Windows, đăng nhập bằng tài khoản mở được ổ `\\HCM-FS01` (có VPN / mạng công ty trong giờ làm việc).
2. Tải 4 file trong thư mục `autosync/tools/` trên GitHub (`auto-sync.ps1`, `cai-dat.ps1`, `auto-sync.config.example.json`, `README.md`) về một thư mục, vd `C:\CENTRAL-PMH\auto-sync`.
3. Trên web: **Quản trị tài khoản → thẻ "Đồng bộ thư mục tự động" → Tạo khóa**, sao chép khóa.
4. Chép `auto-sync.config.example.json` thành **`auto-sync.config.json`**, mở bằng Notepad, dán khóa vào ô `"key"`.
   Kiểm tra `"root"` đúng đường dẫn thư mục `12_HoSo_TrinhKy` (dấu `\` viết thành `\\`).
5. Chuột phải **`cai-dat.ps1` → Run with PowerShell**. Script tạo lịch chạy *"CENTRAL PMH - Dong bo thu muc"* trong Task Scheduler
   (mỗi ngày 7:30, lặp mỗi giờ đến 17:30) và chạy thử 1 lần ngay.
6. Trên web, thẻ "Đồng bộ thư mục tự động" hiện **Hoạt động** cùng thời gian và kết quả lần chạy gần nhất.

## Theo dõi, sửa lỗi
- Nhật ký trên máy: `auto-sync.log` cùng thư mục. Trên web: thẻ "Đồng bộ thư mục tự động" (Quản trị) và chú thích của nút "Đồng bộ thư mục".
- "Không truy cập được thư mục…": máy chưa kết nối VPN / mạng công ty lúc chạy.
- "Khóa đồng bộ tự động không đúng": tạo khóa mới trên web rồi dán lại vào `auto-sync.config.json`.
- Chạy tay bất kỳ lúc nào: `powershell -ExecutionPolicy Bypass -File auto-sync.ps1 -Force`.
- Gỡ lịch chạy: `powershell -ExecutionPolicy Bypass -File cai-dat.ps1 -GoBo`.

**Không đưa file `auto-sync.config.json` (có khóa) lên GitHub hay gửi cho người khác.**
