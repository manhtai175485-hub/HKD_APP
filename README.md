# Hồ sơ hộ kinh doanh

Tạo hồ sơ hộ kinh doanh từ ảnh căn cước, xuất ra Giấy đề nghị đăng ký và Giấy ủy quyền.

Nền tảng: Next.js · Supabase · Vercel.

---

## Cách hoạt động

Nhân viên chọn ảnh hai mặt căn cước. Ứng dụng dò mã QR ở mặt sau và tự điền họ tên,
ngày sinh, giới tính, số căn cước, địa chỉ thường trú. Nhân viên điền nốt tên hộ,
phường/xã, địa chỉ kinh doanh, vốn, ngành nghề, số điện thoại và email — rồi lưu.
Từ danh sách hồ sơ bấm Xuất Word để lấy mẫu đơn đã điền sẵn.

Đọc QR cho dữ liệu chính xác, không sai chính tả như nhận dạng chữ từ ảnh. Ảnh mờ
không dò được QR thì vẫn nhập tay bình thường, ứng dụng không chặn.

---

## Cài đặt

### Bước 1 — Supabase

1. Tạo project mới tại supabase.com
2. Vào **SQL Editor**, dán toàn bộ `supabase/schema.sql`, bấm Run
3. Vào **Authentication → Users → Add user**, tạo tài khoản đầu tiên bằng email và
   mật khẩu. Nhớ bật **Auto Confirm User**
4. Copy **User UID** của tài khoản vừa tạo
5. Quay lại **SQL Editor**, chạy câu sau, thay UID và thông tin thật:

```sql
insert into public.employees
  (auth_user_id, full_name, phone, email, permissions, dob, gender, cccd, address)
values
  ('DÁN-USER-UID-VÀO-ĐÂY', 'NGUYỄN VĂN A', '0900000000', 'a@example.com',
   array['QUAN_LY','HO_SO'],
   '1990-01-01', 'nam', '001090000000', 'Số 1, Phường X, Hà Nội');
```

Thông tin ngày sinh, giới tính, số căn cước, địa chỉ dùng để điền Bên B của giấy ủy quyền.

6. Vào **Project Settings → API**, copy `Project URL` và `anon public key`

### Bước 2 — Nạp danh mục

Phường/xã và ngành nghề chưa có sẵn. Xem `supabase/README-du-lieu.md`.

### Bước 3 — GitHub

Đẩy toàn bộ thư mục này lên một repo mới. Giữ nguyên cấu trúc thư mục,
đặc biệt là `templates/mau-don-hkd.docx` — thiếu tệp này thì không xuất Word được.

### Bước 4 — Vercel

1. **Add New Project**, chọn repo vừa đẩy
2. Framework tự nhận là Next.js
3. Mục **Environment Variables** thêm hai biến:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Chạy thử ở máy

```bash
npm install
cp .env.example .env.local     # rồi điền hai giá trị Supabase
npm run dev
```

---

## Cấu trúc

```
app/
  (app)/           trang cần đăng nhập
    layout.js      thanh bên, kiểm tra hồ sơ nhân viên
    hkd/           danh sách và tạo hồ sơ
  api/export-dossier/[id]/    ghép mẫu Word
  login/
components/
  FormTaoHoSo.js   form tạo hồ sơ, dò QR căn cước
  ThanhBen.js
lib/
  cccd.js          tách chuỗi QR, đọc ảnh lên canvas
  money.js         đọc số thành chữ tiếng Việt
  supabaseClient.js / supabaseServer.js
supabase/
  schema.sql
templates/
  mau-don-hkd.docx
```

---

## Những chỗ làm khác bản trước, và lý do

Dự án này viết lại từ một bản chạy trước đó. Các quyết định dưới đây đến từ lỗi thật
gặp phải, không phải sở thích.

**Mã trạng thái và quyền không dấu.** Bản trước lưu `'Quản lý'` làm enum trong
database. Đổi nhãn hiển thị là phải sửa cấu trúc bảng, và code so sánh chuỗi có dấu
khắp nơi — sai một dấu là hỏng ngầm, không báo lỗi.

**Quyền là mảng, không phải một vai.** Một người có thể vừa làm hồ sơ vừa tư vấn.
Bản trước ép mỗi người đúng một vai.

**Mã hồ sơ do người nhập.** Bản trước sinh từ sáu số cuối của mốc thời gian mili giây,
hai người bấm cùng lúc là trùng mã.

**Cột tiền không nằm trong bảng hồ sơ.** Bản trước cho nhân viên sửa mọi cột của hồ sơ
mình phụ trách, kể cả trạng thái thanh toán — mà lương lại tính từ hồ sơ đã thu tiền.
Gọi thẳng API là tự tăng lương được. Giai đoạn sau, tiền sẽ ở bảng riêng với quyền ghi
chỉ dành cho quản lý.

**Ngành nghề và thủ tục có bảng danh mục.** Bản trước để chữ tự do nên gõ lệch một chữ
là thống kê vỡ.

**Chỉ một chỗ tính hạn xử lý.** Bản trước có bốn cách tính "quá hạn" khác nhau nằm rải
rác, trong đó tác vụ phạt tự động không dùng chung công thức với giao diện.

**Không có chính sách xóa trên nhân viên và hồ sơ.** Không ai xóa được qua API,
chỉ tắt hoạt động.
