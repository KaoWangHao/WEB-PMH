# Kế hoạch mua sắm (KHMS) — chức năng chạy thử

Thư mục này chứa **toàn bộ code và các trao đổi về chức năng Kế hoạch mua sắm**. Theo yêu cầu của người dùng, chức năng này
**tạm thời chỉ chạy trên bản thử `/dev`**, chưa đưa lên link chính. Khi nào người dùng đồng ý thì mới deploy (xem mục cuối).

- Link bản thử (chỉ chủ sở hữu `caoquanghao1902@gmail.com` mở được):
  https://script.google.com/macros/s/AKfycbzKFtsxCRvR1hUYjOmI1yH5VPGDq3MNtC0NMfWJQoqJ/dev
- Bản thử dùng **chung Google Sheet `HoSo_DB`** với bản chính: dữ liệu KHMS nằm ở 2 sheet riêng `Packages`, `PlanUploads`
  (tự tạo). Bản chính không đọc 2 sheet này.

## Cấu trúc

| File | Vai trò |
|---|---|
| `src/Procurement.gs` | Server: `KHMS_HEADERS_` (cột 2 sheet), `KHMS_ACTIONS_` (`importPlan`, `updatePackage`, `updatePackages`, `linkPackages`, `deletePlan`), `khmsBootstrap_`, `unlinkSubmissionPackages_` |
| `src/Khms.html` | Client: trang "Kế hoạch mua sắm" (`viewKhms`), đọc file Excel (`parseKhmsSheet`), xem trước + tải lên, bảng gói thầu, "Cập nhật bảng", form 1 gói, gợi ý gắn hồ sơ, xuất Excel |
| `src/KhmsStyles.html` | CSS của trang KHMS |
| `samples/` | File KHMS **mẫu tự tạo** để thử (bố cục như form của người dùng): 231 Rev00, 231 Rev01 (1 cột KH mỗi mốc), 240 (cột KH Rev00 + KH Rev01). File thật `267_The_Emerald_Boulevard_KHMSGT_2026.09.30.xlsx` **không đưa lên git** (repo công khai). |

### Cách gắn vào phần lõi (src/)
Phần lõi không chứa code KHMS, chỉ có các "điểm gắn" — không có thư mục này thì mọi thứ chạy như bản chính:
- `src/Index.html`: `includeIf('KhmsStyles')`, `includeIf('Khms')` (`includeIf` ở `Code.gs`: file không có → rỗng).
- `src/App.html`: `EXT` (`nav`, `views`, `change`, `input`, `derive`, `data`, `subInfo`, `help`, `busy`) và `window.APP`
  (trạng thái `S`, `ACTIONS`, `ICONS` và các hàm dùng chung). `Khms.html` nạp sau `App.html` và đăng ký vào đó.
- `src/Code.gs`: action không có trong `API_ACTIONS_` thì tra `KHMS_ACTIONS_` (nếu có).
- `src/Db.gs`: `headersOf_(name)` = `SHEET_HEADERS[name]` hoặc `KHMS_HEADERS_[name]`; `ensureSheet_` tự tạo sheet / bổ sung header cột mới ở cuối;
  `writeObjs_`, `rewriteTable_` (ghi nhiều dòng một lần).
- `src/Submissions.gs`: `bootstrap_` gọi `khmsBootstrap_` nếu có; xóa hồ sơ gọi `unlinkSubmissionPackages_` nếu có.

## Chạy thử & deploy
- **Máy local**: `node dev/serve.js` — mặc định nạp cả `khms/src` (giống `/dev`); `KHMS=0 node dev/serve.js` để chạy giống bản chính.
- **Bản thử `/dev`**: tab Actions → *Deploy Apps Script* → Run workflow, tích **"Chỉ đẩy bản thử"** → workflow chép `khms/src/*` vào `src/`
  rồi `clasp push` lên HEAD (link `/dev`). Link chính không đổi.
- **Bản chính** (push lên `main`): đẩy code **không có** `khms/`, cập nhật link chính, rồi đẩy lại HEAD **kèm** `khms/` để `/dev` vẫn có KHMS.
- **Khi người dùng cho phép đưa KHMS lên bản chính**: chạy tay workflow trên `main` với **"Đưa Kế hoạch mua sắm (khms/) lên bản chính"** = true
  (hoặc chuyển hẳn 3 file `khms/src/*` vào `src/` và bỏ bước chép trong workflow).

## Yêu cầu & quyết định đã trao đổi với người dùng
1. **Ý tưởng** (ảnh form KHMS: STT, Hạng mục, Giá trị gói thầu, Ngày mời thầu / Ngày chọn thầu / Ngày ký kết hợp đồng — mỗi nhóm
   *Kế hoạch Rev00 · Thực tế · Tình trạng* — và Ngày bắt đầu thi công): mỗi dự án có KHMS gồm các gói thầu; **mỗi hồ sơ được duyệt
   tương ứng 1 gói thầu**. Chuyên viên **tải file Excel KHMS** từng dự án lên → web ghi nhận **ngày kế hoạch**; **ngày chọn thầu thực tế
   đồng bộ từ hồ sơ phê duyệt** (ngày duyệt); **ngày ký HĐ thực tế chuyên viên tự cập nhật**.
2. Câu hỏi đã chốt (người dùng chọn phương án đề xuất):
   - Gắn hồ sơ ↔ gói thầu: **gợi ý + xác nhận** (web dò hồ sơ cùng dự án có tên chứa tên gói; chuyên viên xác nhận hoặc chọn hồ sơ khác).
   - Ngày **mời thầu thực tế**: chuyên viên tự nhập (file có ngày thực tế thì nhận luôn).
   - **Tải lại KHMS (Rev mới)**: giữ kế hoạch gốc Rev00 + cập nhật kế hoạch hiện hành; giữ ngày thực tế và hồ sơ đã gắn;
     gói mới được thêm, gói không còn trong file được đánh dấu (ẩn, không xóa).
3. **File thật** dự án 267 (`KHMSGT`): mỗi chuyên viên upload 1 file tương tự cho từng dự án để web điền các trường như form.
   Khác ảnh mẫu: cột tên "Tên vật tư/ gói thầu", nhóm chọn thầu / ký HĐ / thi công chỉ 1 cột (= kế hoạch), cột "Ngày mời thầu" bị ẩn,
   có "Ngày bắt đầu thi công mẫu" (bỏ qua), Rev ở tiêu đề sheet "(REV01)", 2 sheet `KHMSGT` và `KHMSGT (2)`, cột ẩn AI ghi tình trạng.
   Người dùng chốt: **dùng sheet `KHMSGT (2)`**; **"Đã ký HĐ" = đã mời thầu + chọn thầu + ký HĐ; "Đang ký HĐ" = đã chọn thầu**
   (ngày thực tế = ngày kế hoạch, chỉ điền ô trống, có ô tích để bỏ).
4. File có **cột KH Rev00 và KH Rev01** cho từng mốc → web **hiển thị tương ứng 2 cột** "KH Rev00 | KH Rev01" (ngày đã đổi tô cam);
   tình trạng tính theo bản mới nhất.
5. Cập nhật: thay vì từng dòng, **1 nút "Cập nhật bảng"** cho cả bảng, điều chỉnh toàn bảng một lúc rồi **Lưu thay đổi** một lần.
6. **Tạm thời chỉ chạy trên `/dev`**, code và trao đổi để riêng thư mục này; deploy sau.

## Chi tiết hoạt động
- **Đọc file** (`parseKhmsSheet`, ExcelJS ở trình duyệt, chỉ .xlsx/.xlsm): tìm dòng tiêu đề có cột tên gói ("Hạng mục", "Tên vật tư/ gói thầu"…),
  STT, "Giá trị gói thầu" và nhóm cột **Ngày mời thầu / Ngày chọn thầu / Ngày ký (kết) hợp đồng / Ngày bắt đầu thi công** (ưu tiên tiêu đề bắt đầu
  bằng "Ngày", bỏ "Hình thức chọn thầu", "…thi công mẫu"); nhóm kéo tới trước ô tiêu đề kế tiếp; dòng dưới có "Kế hoạch (RevNN)" / "Thực tế";
  nhóm 1 cột thì cột đó là kế hoạch. Bản Rev lớn nhất = kế hoạch hiện hành, cột Rev00 riêng = kế hoạch gốc. Rev lấy ở tiêu đề cột hoặc tiêu đề sheet.
  Cột ẩn vẫn đọc; dòng nhóm (STT La Mã, không ngày) và "Tổng cộng" bỏ qua; dòng ẩn mặc định bỏ tích. Nhiều sheet → ưu tiên sheet hiện,
  rồi bản "(n)" lớn nhất. Cột tình trạng (có thể không tiêu đề) "Đã ký HĐ" / "Đang ký HĐ" như mục 3. Dự án tự chọn theo số đầu tên file.
- **Xem trước** trước khi tải lên: chọn dự án, sheet, tích/bỏ từng gói; Mới / Cập nhật (kê trường đổi) / Không đổi / Không còn trong file.
- **Lưu** (`importPlan_`): khớp gói theo tên không dấu (`planKey_`/`khKey`), ưu tiên cùng STT. Lần tải đầu = kế hoạch gốc (`…Plan0`, nhãn `rev0`);
  file có cột Rev00 thì cột đó là gốc; gói mới ở bản sau không có gốc. Ngày thực tế trong file chỉ điền ô còn trống. Gói không còn trong file → `active` FALSE.
  Mỗi lần tải ghi 1 dòng `PlanUploads`.
- **Ngày chọn thầu thực tế** = ngày duyệt hồ sơ gắn với gói (tính ở client `khmsDerive`, ưu tiên hơn ngày nhập tay/từ file).
- **Gợi ý gắn hồ sơ** (`khmsSuggestions`): hồ sơ Trình duyệt cùng dự án (số đầu tên), chưa gắn, tên chứa tên gói (không dấu) hoặc ≥ 80% từ;
  ưu tiên đã duyệt; mỗi hồ sơ chỉ gợi ý cho 1 gói. Server chặn 1 hồ sơ gắn 2 gói. Xóa hồ sơ → bỏ gắn.
- **Cập nhật bảng** (`S.khEdit`): ô nhập ngày thực tế (dd/mm/yyyy, tự chèn "/", trống = xóa, không sau hôm nay; ô chọn thầu "theo HS" không sửa),
  chọn hồ sơ, ghi chú; ô sửa tô cam, ô sai tô đỏ; "Điền hồ sơ gợi ý"; **Lưu thay đổi (N gói)** → `updatePackages` (lỗi bất kỳ gói nào thì không lưu gì;
  cho phép đổi chéo hồ sơ); Hủy khi có thay đổi phải bấm 2 lần; không tự làm mới 3 phút khi đang sửa. Ngày kế hoạch không sửa trên web.
  Bấm tên gói → form 1 gói.
- **Tình trạng mốc** (`msState`): Hoàn thành (trễ N ngày), Trễ N ngày, Còn N ngày (≤ 14 ngày, `KHMS_SOON_DAYS`), Chưa đến hạn.
- Trang có THAM SỐ (Dự án, Tình trạng, tìm), TỔNG QUAN 5 ô (Gói thầu + tổng giá trị, Đã chọn thầu, Trễ chọn thầu, Sắp đến hạn, Đã ký HĐ),
  bảng "Theo dự án" (khi xem tất cả), bảng gói thầu 2 tầng tiêu đề như form, **Xuất Excel**. Hộp lịch sử hồ sơ hiện gói thầu đã gắn.
- Quyền: mọi tài khoản tải / cập nhật KHMS; Trưởng phòng / admin xóa KHMS của 1 dự án.

## Việc còn mở
- Ngày kế hoạch hiện không sửa trên web (lấy từ file) — đổi nếu người dùng muốn.
- Chưa có thông báo (chuông) cho KHMS (vd gói sắp đến hạn chọn thầu).
- Hướng dẫn sử dụng (Claude Docs) chưa có phần KHMS.
