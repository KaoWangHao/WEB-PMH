# Kế hoạch mua sắm (KHMS)

Thư mục này chứa **toàn bộ code và các trao đổi về chức năng Kế hoạch mua sắm**. Theo yêu cầu của người dùng, chức năng này
chạy thử trên bản `/dev` rồi **đã đưa lên bản chính ngày 05/10/2026** (theo người dùng: "deploy, merge phần KHMS lên web chính").

- Link bản thử (chỉ chủ sở hữu `caoquanghao1902@gmail.com` mở được):
  https://script.google.com/macros/s/AKfycbzKFtsxCRvR1hUYjOmI1yH5VPGDq3MNtC0NMfWJQoqJ/dev
- Bản thử dùng **chung Google Sheet `HoSo_DB`** với bản chính: dữ liệu KHMS nằm ở 2 sheet riêng `Packages`, `PlanUploads`
  (tự tạo). Bản chính không đọc 2 sheet này.

## Cấu trúc

| File | Vai trò |
|---|---|
| `src/Procurement.gs` | Server: `KHMS_HEADERS_` (sheet `Packages`, `PlanUploads`, `KhmsAssign`), `KHMS_ACTIONS_` (`importPlan`, `importPlans` (nhiều dự án), `updatePackage`, `updatePackages`, `linkPackages`, `deletePlan`, `assignProjects`, `updateProjectInfo`), `mergePlan_`, `khmsBootstrap_`, `unlinkSubmissionPackages_` |
| `src/Khms.html` | Client: trang "Kế hoạch mua sắm" (`viewKhms`), đọc file Excel (`parseKhmsSheet`), xem trước + tải lên (1 dự án `openKhmsImport`; file tổng hợp nhiều dự án `openKhmsBatch`), bảng gói thầu, "Cập nhật bảng", form 1 gói, gợi ý gắn hồ sơ, xuất Excel |
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
- **Máy local**: `node dev/serve.js` — mặc định nạp cả `khms/src` (giống bản chính); `KHMS=0 node dev/serve.js` để chạy không có KHMS.
- **Bản thử `/dev`**: tab Actions → *Deploy Apps Script* → Run workflow, tích **"Chỉ đẩy bản thử"** → workflow chép `khms/src/*` vào `src/`
  rồi `clasp push` lên HEAD (link `/dev`). Link chính không đổi.
- **Bản chính** (push lên `main`): workflow chép `khms/src/*` vào `src/`, `clasp push` rồi cập nhật link chính — KHMS có trên cả link chính và `/dev`.

## Yêu cầu & quyết định đã trao đổi với người dùng
1. **Ý tưởng** (ảnh form KHMS: STT, Hạng mục, Giá trị gói thầu, Ngày mời thầu / Ngày chọn thầu / Ngày ký kết hợp đồng — mỗi nhóm
   *Kế hoạch Rev00 · Thực tế · Tình trạng* — và Ngày bắt đầu thi công): mỗi dự án có KHMS gồm các gói thầu; **mỗi hồ sơ được duyệt
   tương ứng 1 gói thầu**. Chuyên viên **tải file Excel KHMS** từng dự án lên → web ghi nhận **ngày kế hoạch**; **ngày chọn thầu thực tế
   đồng bộ từ hồ sơ phê duyệt** (ngày duyệt); **ngày ký HĐ thực tế chuyên viên tự cập nhật**.
2. Câu hỏi đã chốt (người dùng chọn phương án đề xuất):
   - Gắn hồ sơ ↔ gói thầu: **gợi ý + xác nhận** (web dò hồ sơ cùng dự án có tên chứa tên gói; chuyên viên xác nhận hoặc chọn hồ sơ khác).
   - Ngày **mời thầu thực tế**: chuyên viên tự nhập (file có ngày thực tế thì nhận luôn).
   - **Tải lại KHMS (Rev mới)**: giữ kế hoạch gốc Rev00 + cập nhật kế hoạch hiện hành; giữ ngày thực tế và hồ sơ đã gắn;
     gói mới được thêm, gói không còn trong file được đánh dấu (ẩn, không xóa) — **đã đổi, xem mục 16: nay xóa hẳn**.
3. **File thật** dự án 267 (`KHMSGT`): mỗi chuyên viên upload 1 file tương tự cho từng dự án để web điền các trường như form.
   Khác ảnh mẫu: cột tên "Tên vật tư/ gói thầu", nhóm chọn thầu / ký HĐ / thi công chỉ 1 cột (= kế hoạch), cột "Ngày mời thầu" bị ẩn,
   có "Ngày bắt đầu thi công mẫu" (bỏ qua), Rev ở tiêu đề sheet "(REV01)", 2 sheet `KHMSGT` và `KHMSGT (2)`, cột ẩn AI ghi tình trạng.
   Người dùng chốt: **dùng sheet `KHMSGT (2)`**; **"Đã ký HĐ" = đã mời thầu + chọn thầu + ký HĐ; "Đang ký HĐ" = đã chọn thầu**
   (ngày thực tế = ngày kế hoạch, chỉ điền ô trống, có ô tích để bỏ).
4. File có **cột KH Rev00 và KH Rev01** cho từng mốc → web **hiển thị tương ứng 2 cột** "KH Rev00 | KH Rev01" (ngày đã đổi tô cam);
   tình trạng tính theo bản mới nhất.
5. Cập nhật: thay vì từng dòng, **1 nút "Cập nhật bảng"** cho cả bảng, điều chỉnh toàn bảng một lúc rồi **Lưu thay đổi** một lần.
6. **Tạm thời chỉ chạy trên `/dev`**, code và trao đổi để riêng thư mục này; deploy sau. → **Đã đưa lên bản chính 05/10/2026** (code vẫn để riêng thư mục này, workflow chép vào `src/` khi deploy).
7. **STT gói thầu do hệ thống tự đánh 1, 2, 3…** theo thứ tự các gói (được tích) trong file, **không dùng STT có trong file Excel** (STT trong file chỉ dùng để nhận ra dòng nhóm I, II… không phải gói thầu).
8. **File tổng hợp `P.MH_KeHoachMuaSamVatTuGiaoThau.xlsx`** (người dùng gửi: "dùng data trong file này, upload lên phần KHMS, chỉ lấy data
   những vùng nêu sẵn trong phần KHMS trên web") — 1 file, ~45 sheet, **mỗi sheet `STT_Tên dự án` là KHMS của 1 dự án** (sheet `DuAn` là danh sách
   dự án / người phụ trách, bỏ qua). File thật **không đưa lên git**. Web đọc cả file và mở **"Tải KHMS nhiều dự án"**:
   - Dự án theo số đầu tên sheet; các sheet cùng dự án được **gộp** (vd `76_La Pura` + `76.1_La Pura MEP` → dự án 76; `265_…` + `265.1_…`).
     Dự án chưa có trong danh mục (vd **172 Tuyên Sơn**) → bỏ tích, cần admin thêm dự án hoặc chọn dự án khác.
   - **Chỉ lấy các trường có trên web**: tên gói (cột "Tên vật tư/ gói thầu", không có thì "Hạng mục"), giá trị gói thầu, ngày kế hoạch
     (Rev00 + bản mới nhất) và thực tế của mời thầu / chọn thầu / ký HĐ / bắt đầu thi công. Bỏ: nhà sản xuất, NCC, tỷ trọng, hình thức chọn thầu,
     phối hợp soát xét, ngày trình vật liệu, tình trạng gói thầu, đơn vị chọn, các cột chậm trễ / tình trạng (công thức).
   - Cột "Thực tế" của file này ghi **"HT"** (và "Hoàn thành", "Done", "HĐNT") thay cho ngày → mốc đã xong, ghi nhận **ngày thực tế = ngày kế hoạch**
     (không sau hôm nay; mốc sau xong thì mốc trước cũng xong) — cùng ô tích với mục 3. "Không làm / Không dùng / Không thi công / CĐT cấp…"
     hoặc tên có "(Không sử dụng)" → gói mặc định bỏ tích.
   - Sheet không có số dự án (`DuAn`, `Bim Hạ Long`) bỏ qua (theo người dùng: "mặc kệ data trong sheet dự án và bim hạ long").
   - Người dùng yêu cầu thêm **dự án 172_Tuyên Sơn** vào danh mục (`src/Projects.gs`: `PROJECT_SEED_` + bổ sung 1 lần, cờ `PROJECTS_FIX_V3`).
   - **Ghi đè** (cột "Ghi đè" của dự án đã có KHMS, chỉ Trưởng phòng / admin; theo người dùng: "dùng data trong file chuẩn bị up để overwrite
     lên data 2 dự án Boulevard và RiverPark" — 267, 285): kế hoạch gốc, kế hoạch, ngày thực tế, giá trị lấy hết theo file (như lần tải đầu);
     gói cùng tên giữ mã gói, hồ sơ đã gắn, ghi chú; gói trên web không có trong file bị **xóa**. Mặc định không tích.
   - **Tự tạo dự án** (theo người dùng: "dựa vào tên sheet có STT, cập nhật vào dự án có STT tương ứng trên web, nếu STT trên tên sheet chưa có
     ghi nhận dự án trên web thì tự tạo dự án mới tương ứng với tên sheet"): STT chưa có trong danh mục → tạo dự án `STT_<tên>` (tên = phần
     chung của các sheet sau "STT_" / "STT.n_", vd 172.1_Tuyên Sơn_MEP + 172.2_Tuyên Sơn_Psinh Landscape → "Tuyên Sơn"). Chỉ Trưởng phòng / admin
     (chuyên viên: dòng đó bỏ tích, báo cần Trưởng phòng / admin); server kiểm tra lại, tạo trong cùng lần ghi (`createName` của `importPlans`).
9. **Dòng ẩn trong file cũng được tải** (theo người dùng: "khi upload file excel lên, cập nhật cả data trong các dòng ẩn") — mặc định tích
   ở cả tải 1 dự án và nhiều dự án (thay cho quyết định cũ "dòng ẩn mặc định bỏ tích"); bảng xem trước vẫn gắn nhãn "dòng ẩn".
   - Gửi lên server theo đợt ≤ ~600 gói (action `importPlans`, mỗi đợt kiểm tra hết rồi mới ghi; đọc / ghi sheet `Packages` 1 lần).

10. **Xuất KHMS tất cả dự án** (theo người dùng: tài khoản **haocq, thuync, thoaiht** — ban đầu "htt", người dùng đổi thành "thoaiht"):
   nút **"Xuất tất cả dự án"** cạnh "Xuất Excel", chỉ hiện với các username trong `KHMS_EXPORT_ALL_USERS_` (`Procurement.gs`, gửi qua
   `khmsBootstrap_` → `khmsExportAll`). 1 file Excel: sheet **"Tổng hợp"** (mỗi dự án 1 dòng: KHMS cập nhật, Rev, số gói, giá trị, đã chọn thầu,
   trễ, sắp đến hạn, đã ký HĐ…, có link tới sheet) + **mỗi dự án 1 sheet** (tên `STT_Tên dự án`, bố cục như "Xuất Excel"), gói còn trong KHMS,
   không theo bộ lọc đang xem (`khmsExportAll`).

11. **Menu 2 cấp + Dashboard báo cáo KHMS** (theo người dùng: "dashboard báo cáo về tình trạng chọn thầu tổng thể nhiều dự án hoặc từng dự án,
   có thể lựa chọn các dự án nào để tổng hợp số liệu. Trong mục chức năng KHMS chia nhỏ ra 2 cấp dưới, 1 là KHMS chi tiết các dự án và dashboard
   báo cáo KHMS"): menu **Kế hoạch mua sắm** → **KHMS chi tiết dự án** (view `khms`) / **Dashboard báo cáo KHMS** (view `khms-dash`, `viewKhmsDash`).
   Dashboard: **Chọn dự án** (ô tích, tìm, chọn tất cả / bỏ chọn; không chọn = tất cả; nhớ ở localStorage `hs_khdash_sel`), năm cho biểu đồ theo tháng;
   TỔNG QUAN 6 ô (gói thầu + giá trị, đã chọn thầu % gói / % giá trị, tỷ lệ chọn thầu đúng hạn, trễ, sắp đến hạn, đã ký HĐ / chờ ký);
   biểu đồ: tình trạng chọn thầu (doughnut), tiến độ theo mốc (mời thầu / chọn thầu / ký HĐ / khởi công), chọn thầu theo tháng (kế hoạch hiện hành
   vs thực tế + lũy kế, trục phải), tình trạng theo dự án; bảng **Tổng hợp theo dự án** (thanh tiến độ, dòng tổng; bấm → KHMS chi tiết đã lọc);
   **Danh sách gói thầu**: trễ chọn thầu / sắp đến hạn / đã chọn thầu – chưa ký HĐ / tất cả. Phần lõi chỉ thêm hỗ trợ chung: mục menu có
   `children` (`App.html` `navGroupOpen`, action `nav-group`, CSS `.nav-sub`) và `chartBox` / `emptyBox` / `barConfig` trong `window.APP`.

12. **Mã phụ "STT.n" là dự án riêng** (theo người dùng: "các sheet có đánh dấu thêm số ".1" ở STT như 260.1 thì phần đó tách riêng ra thêm 1 dự án
   khác trên web"): danh mục dự án nhận mã `260.1` (`normalizeProjectCode_`, `parseProjectLine_`, `compareProjectCode_` ở `src/Projects.gs`;
   `projectSort`, `projectCodesOf` ở `App.html` — hồ sơ "260.1_…" thuộc 260.1 nếu danh mục có mã này, không thì 260). Tải file tổng hợp: sheet
   "76.1_La Pura MEP" → dự án 76.1 (chưa có thì tự tạo "76.1_La Pura MEP"). **Tải lại sau khi đổi** (câu hỏi "có cần upload lại file excel không"):
   cần tải lại 1 lần; web tự nhận dự án gốc đang giữ gói của sheet .n (gộp ở lần trước) → tự tích **Ghi đè** cho dự án gốc, và dự án gốc
   không có sheet riêng (vd 172, 232) → mục "KHMS cũ đã gộp từ sheet mã phụ" (xóa KHMS cũ, mặc định tích khi ≥ 90% gói trùng tên).
13. **Chuyên viên phụ trách dự án** (theo người dùng: "gán thêm trong KHMS là chuyên viên nào phụ trách dự án nào để tiện cho công tác thống kê";
   "có thể tham khảo data trong sheet Dự án trong file excel tổng hợp"; "mở thêm chế độ gán chuyên viên thủ công"): sheet `KhmsAssign`
   (`projectCode`, `owners` = username cách nhau dấu phẩy, …). **Thủ công**: nút **Phân công chuyên viên** (Trưởng phòng / admin; KHMS chi tiết,
   Dashboard) → bảng tích dự án × chuyên viên (action `assignProjects`). **Theo file**: tải file tổng hợp → đọc sheet có cột "Dự án" + "NS phụ trách"
   (`DuAn`; `parseAssignSheet`), khớp tên dự án với tên sheet / danh mục ("(gom MEP)" → cả sheet MEP), khớp tên người ("Hảo", "Chi Trang" → bỏ
   "chị/anh", so tên gọi = chữ cuối họ tên, username, ký hiệu; trùng nhiều người hoặc không có → "chưa khớp tài khoản") → mục xem trước, mặc định
   tích dự án chưa phân công. Thống kê: ô lọc **Chuyên viên phụ trách** + bảng **Tổng hợp theo chuyên viên phụ trách** trên Dashboard, cột
   Chuyên viên ở các bảng theo dự án, file "Xuất tất cả dự án".
14. **Giám đốc dự án / BOM phụ trách** (theo người dùng: "tạo thêm 2 vùng là Giám đốc dự án và BOM phụ trách dự án để chuyên viên tự cập nhật sau,
   cập nhật bằng cách nhập liệu"): cột `director`, `bom` của `KhmsAssign`, chữ tự do ≤ 150 ký tự, **mọi tài khoản** nhập ở cửa sổ **Thông tin dự án**
   (nút ở KHMS chi tiết, hoặc "Cập nhật GĐ dự án / BOM" ở dòng thông tin dự án; gợi ý tên đã nhập; action `updateProjectInfo`). Hiện ở KHMS chi tiết,
   bảng theo dự án (KHMS chi tiết, Dashboard), file "Xuất tất cả dự án".

15. **Thống kê theo GĐ dự án / BOM** (theo người dùng: "sau khi chuyên viên khai báo GDDA và BOM phụ trách dự án, tôi muốn có dashboard thống kê,
   báo cáo theo GDDA và BOM phụ trách dự án"): Dashboard có 3 ô lọc **Chuyên viên phụ trách / Giám đốc dự án / BOM phụ trách** (kết hợp với chọn dự án;
   nhớ ở localStorage `hs_khdash_owner|director|bom`) và thẻ **Tổng hợp theo người phụ trách** (nút chuyển Chuyên viên / GĐ dự án / BOM, nhớ
   `hs_khdash_by`): biểu đồ tình trạng chọn thầu theo người (bỏ nhóm "chưa nhập") + bảng (dự án, gói, giá trị, đã chọn, tiến độ, đúng hạn, trễ,
   sắp đến hạn, đã ký, chờ ký; bấm tên để lọc). Tên GĐ dự án / BOM là chữ tự do: tách nhiều người theo `, ; / & +` hoặc "và", gom theo tên không dấu
   (hiện cách viết gặp nhiều nhất). **Xuất báo cáo (Excel)** (`khdExportXlsx`, theo bộ lọc đang chọn): sheet Theo chuyên viên / Theo GĐ dự án /
   Theo BOM / Theo dự án.

16. **Gói không còn trong file → xóa hẳn** (theo người dùng: "hệ thống tự xóa hẳn giúp mình 2 gói đó và xóa phần khoanh đỏ trên web luôn"):
   tải lại KHMS (1 hay nhiều dự án) xóa gói trên web không có trong file (`mergePlan_` trả `deleted`, ghi lại cả bảng); xem trước ghi "sẽ XÓA".
   Gói ẩn còn sót từ cách cũ (`active` = FALSE) được `purgeInactivePackages_` dọn khi mở web (`khmsBootstrap_`). Bỏ ô tích
   "Hiện gói không còn trong KHMS mới" ở bảng gói thầu.

17. **Khu vực đầu trang KHMS chi tiết gọn lại** (theo người dùng: "chỗ xuất báo cáo để thành những ô nhỏ nằm ở vùng riêng"): góc thẻ chỉ còn
   **Tải KHMS (Excel)**; dự án đang chọn hiện 4 ô thông tin (KHMS cập nhật · Chuyên viên phụ trách · GĐ dự án · BOM, mỗi ô có thao tác riêng —
   `khmsProjectInfo`); vùng thao tác riêng gồm ô nhỏ theo nhóm **Xuất báo cáo** (Xuất Excel, Xuất tất cả dự án) và **Quản lý dự án**
   (Phân công chuyên viên, Thông tin dự án) — `khmsActionTiles`.

## Chi tiết hoạt động
- **Đọc file** (`parseKhmsSheet`, ExcelJS ở trình duyệt, chỉ .xlsx/.xlsm): tìm dòng tiêu đề có cột tên gói ("Tên vật tư/ gói thầu" ưu tiên hơn "Hạng mục"…),
  STT, "Giá trị gói thầu" và nhóm cột **Ngày mời thầu / Ngày chọn thầu / Ngày ký (kết) hợp đồng / Ngày bắt đầu thi công** (ưu tiên tiêu đề bắt đầu
  bằng "Ngày", bỏ "Hình thức chọn thầu", "…thi công mẫu"); nhóm kéo tới trước ô tiêu đề kế tiếp; dòng dưới có "Kế hoạch (RevNN)" / "Thực tế";
  nhóm 1 cột thì cột đó là kế hoạch. Nhiều cột kế hoạch (Rev00, Rev01, "Kế hoạch 03/09/2026", "Kế hoạch tuần 11"…): cột Rev00 = kế hoạch gốc,
  **kế hoạch hiện hành của từng gói = cột kế hoạch có ngày nằm bên phải nhất** (cột Rev01 trống → giữ Rev00). Rev lấy ở tiêu đề cột ("Rec01" = Rev01)
  hoặc tiêu đề sheet; bản mới không ghi Rev → nhãn "KH hiện hành". Cột "Chậm trễ so với Thực tế…" không phải cột Thực tế. Ngày dạng chữ:
  "25/08/2026" hay "08/25/2026" tự nhận; mơ hồ (05/06/2026) thì theo đa số ngày chữ trong sheet, không rõ thì theo ghi chú "(mm/dd/yy)" đầu sheet.
  Bỏ dòng đánh số cột (1, 2, 7, 8…) và dòng nhóm (STT La Mã hoặc tên VIẾT HOA, không có ngày).
  Cột ẩn vẫn đọc; dòng nhóm (STT La Mã, không ngày) và "Tổng cộng" bỏ qua; dòng ẩn vẫn tích (mục 9). Nhiều sheet → ưu tiên sheet hiện,
  rồi bản "(n)" lớn nhất. Cột tình trạng (có thể không tiêu đề) "Đã ký HĐ" / "Đang ký HĐ" như mục 3. Dự án tự chọn theo số đầu tên file.
- **Xem trước** trước khi tải lên: chọn dự án, sheet, tích/bỏ từng gói; Mới / Cập nhật (kê trường đổi) / Không đổi / Không còn trong file.
- **Lưu** (`importPlan_`): khớp gói theo tên không dấu (`planKey_`/`khKey`), ưu tiên cùng STT. Lần tải đầu = kế hoạch gốc (`…Plan0`, nhãn `rev0`);
  file có cột Rev00 thì cột đó là gốc; gói mới ở bản sau không có gốc. Ngày thực tế trong file chỉ điền ô còn trống. Gói không còn trong file → xóa (mục 16).
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
