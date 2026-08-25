# Nạp danh mục

Hai danh mục cần nạp trước khi dùng: phường/xã và ngành nghề cấp 4.

## Phường / Xã

Bảng `wards` cần cả `issuing_office` — cơ quan tiếp nhận gắn cố định theo từng
phường/xã, để nhân viên không phải gõ tay mỗi hồ sơ.

```sql
insert into public.wards (province_id, name, issuing_office)
select p.id, v.ten, v.noi_cap
from public.provinces p,
(values
  ('Phường Cửa Nam',   'UBND phường Cửa Nam'),
  ('Phường Ba Đình',   'UBND phường Ba Đình')
  -- thêm đủ 126 dòng
) as v(ten, noi_cap)
where p.code = '01'
on conflict (province_id, name) do update
set issuing_office = excluded.issuing_office;
```

## Ngành nghề cấp 4

```sql
insert into public.industries (code, name) values
  ('4711', 'Bán lẻ lương thực, thực phẩm, đồ uống, thuốc lá, thuốc lào chiếm tỷ trọng lớn trong các cửa hàng kinh doanh tổng hợp'),
  ('5610', 'Nhà hàng và các dịch vụ ăn uống phục vụ lưu động')
  -- thêm đủ 495 mã
on conflict (code) do update set name = excluded.name;
```

Nếu chưa nạp danh mục, form vẫn dùng được: gõ tay mã và tên ngành, ứng dụng tự
thêm vào danh mục khi lưu hồ sơ.
