-- =====================================================================
-- hkd-app — Cấu trúc cơ sở dữ liệu, giai đoạn 1
-- Chạy MỘT LẦN trong Supabase SQL Editor của project mới.
--
-- Phạm vi giai đoạn 1: tạo hồ sơ hộ kinh doanh và xuất mẫu đơn Word.
-- Chưa có: tài chính, tiền công, kho nghiệp vụ, phân hệ Công ty và Thuế.
-- Cấu trúc đã chừa chỗ để thêm sau mà không phải phá bảng đang có.
--
-- Những chỗ làm khác bản cũ, và lý do:
--   * Mã trạng thái, vai trò dùng chữ KHÔNG DẤU. Bản cũ lưu 'Quản lý'
--     làm enum nên đổi nhãn hiển thị là phải sửa cấu trúc DB, và code
--     so sánh chuỗi có dấu khắp nơi, sai một dấu là hỏng ngầm.
--   * Quyền là MẢNG, không phải một vai duy nhất. Một người có thể vừa
--     làm hồ sơ vừa tư vấn.
--   * Ngành nghề và thủ tục có bảng danh mục, không phải chữ tự do.
--     Bản cũ để text tự do nên thống kê theo thủ tục bị vỡ.
--   * Cột tiền KHÔNG nằm trong bảng hồ sơ. Bản cũ cho nhân viên sửa mọi
--     cột hồ sơ mình phụ trách, kể cả payment_status — tự đánh dấu "đã
--     thu" là lương tự tăng. Giai đoạn sau tiền sẽ ở bảng riêng.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Danh mục
-- ---------------------------------------------------------------------

-- Tỉnh/thành: tách sẵn để sau mở rộng ngoài Hà Nội không phải sửa bảng
create table provinces (
  id     uuid primary key default gen_random_uuid(),
  code   text not null unique,
  name   text not null
);

create table wards (
  id           uuid primary key default gen_random_uuid(),
  province_id  uuid not null references provinces(id),
  name         text not null,
  -- Cơ quan tiếp nhận gắn cố định theo phường/xã, nhân viên không gõ tay
  issuing_office text,
  unique (province_id, name)
);
create index on wards (province_id);

-- Danh mục ngành nghề cấp 4 (VSIC)
create table industries (
  code text primary key,
  name text not null
);

-- Thủ tục — thay cho chữ tự do ở bản cũ
create table procedures (
  code   text primary key,          -- THANH_LAP | THAY_DOI | CAP_LAI | CHAM_DUT
  name   text not null,
  active boolean not null default true
);

insert into procedures (code, name) values
  ('THANH_LAP', 'Thành lập hộ kinh doanh'),
  ('THAY_DOI',  'Thay đổi nội dung đăng ký'),
  ('CAP_LAI',   'Cấp lại đăng ký'),
  ('CHAM_DUT',  'Chấm dứt hộ kinh doanh');

-- ---------------------------------------------------------------------
-- Nhân viên
-- ---------------------------------------------------------------------
create table employees (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  full_name     text not null,
  phone         text,
  email         text,
  -- Quyền là tập hợp: HO_SO, TU_VAN, KE_TOAN, QUAN_LY
  permissions   text[] not null default array['HO_SO'],
  -- Thông tin để điền Bên B của giấy ủy quyền
  dob           date,
  gender        text,
  cccd          text,
  address       text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
comment on column employees.permissions is
  'Tập hợp quyền, không phải một vai duy nhất. Một người có thể vừa HO_SO vừa TU_VAN.';

-- ---------------------------------------------------------------------
-- Hồ sơ hộ kinh doanh
-- ---------------------------------------------------------------------
create table hkd_dossiers (
  id             uuid primary key default gen_random_uuid(),
  -- Mã do nhân viên tự nhập. Bản cũ sinh từ mốc thời gian mili giây nên
  -- hai người bấm cùng lúc là trùng mã.
  code           text not null unique,
  procedure_code text not null references procedures(code),
  assigned_to    uuid not null references employees(id),

  -- Chủ hộ (lấy từ mã QR mặt sau căn cước, sửa lại được)
  owner_name       text not null,
  owner_dob        date,
  owner_gender     text,
  owner_cccd       text not null,
  owner_residence  text,
  owner_phone      text,
  owner_email      text,

  -- Hộ kinh doanh
  business_name   text not null,
  ward_id         uuid references wards(id),
  business_address text,
  capital         numeric(14,0),
  capital_words   text,

  -- Người ủy quyền (Bên B)
  authorized_to   uuid references employees(id),

  -- Ảnh căn cước trong Storage
  cccd_front_path text,
  cccd_back_path  text,

  status      text not null default 'DANG_XU_LY',
  due_at      timestamptz,
  created_at  timestamptz not null default now(),
  created_by  uuid references employees(id)
);
create index on hkd_dossiers (assigned_to);
create index on hkd_dossiers (status);
create index on hkd_dossiers (owner_cccd);

create table hkd_dossier_industries (
  id           uuid primary key default gen_random_uuid(),
  dossier_id   uuid not null references hkd_dossiers(id) on delete cascade,
  industry_code text not null references industries(code),
  detail       text,
  is_main      boolean not null default false,
  position     int not null default 0
);
create index on hkd_dossier_industries (dossier_id);

create table hkd_dossier_history (
  id          uuid primary key default gen_random_uuid(),
  dossier_id  uuid not null references hkd_dossiers(id) on delete cascade,
  status      text not null,
  note        text,
  changed_by  uuid not null references employees(id),
  at          timestamptz not null default now()
);
create index on hkd_dossier_history (dossier_id);

-- ---------------------------------------------------------------------
-- Bảo mật theo dòng
-- ---------------------------------------------------------------------
alter table provinces               enable row level security;
alter table wards                   enable row level security;
alter table industries              enable row level security;
alter table procedures              enable row level security;
alter table employees               enable row level security;
alter table hkd_dossiers            enable row level security;
alter table hkd_dossier_industries  enable row level security;
alter table hkd_dossier_history     enable row level security;

create or replace function nhan_vien_hien_tai()
returns uuid language sql stable security definer set search_path = public as $$
  select id from employees where auth_user_id = auth.uid() and is_active limit 1;
$$;

create or replace function co_quyen(quyen text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from employees
    where auth_user_id = auth.uid() and is_active and quyen = any(permissions)
  );
$$;

-- Danh mục: ai đăng nhập cũng đọc được, chỉ quản lý sửa
create policy dm_doc_provinces  on provinces  for select using (auth.role() = 'authenticated');
create policy dm_doc_wards      on wards      for select using (auth.role() = 'authenticated');
create policy dm_doc_industries on industries for select using (auth.role() = 'authenticated');
create policy dm_doc_procedures on procedures for select using (auth.role() = 'authenticated');

create policy dm_sua_wards      on wards      for all using (co_quyen('QUAN_LY')) with check (co_quyen('QUAN_LY'));
create policy dm_sua_industries on industries for all using (co_quyen('QUAN_LY')) with check (co_quyen('QUAN_LY'));
create policy dm_sua_provinces  on provinces  for all using (co_quyen('QUAN_LY')) with check (co_quyen('QUAN_LY'));

-- Nhân viên: ai cũng xem được danh sách, chỉ quản lý thêm/sửa.
-- Không có chính sách xóa — không ai xóa được qua API, chỉ tắt is_active.
create policy nv_doc  on employees for select using (auth.role() = 'authenticated');
create policy nv_them on employees for insert with check (co_quyen('QUAN_LY'));
create policy nv_sua  on employees for update using (co_quyen('QUAN_LY'));

-- Hồ sơ: người phụ trách hoặc quản lý
create policy hs_doc on hkd_dossiers for select using (
  co_quyen('QUAN_LY') or assigned_to = nhan_vien_hien_tai()
);
create policy hs_them on hkd_dossiers for insert with check (
  co_quyen('QUAN_LY') or assigned_to = nhan_vien_hien_tai()
);
create policy hs_sua on hkd_dossiers for update using (
  co_quyen('QUAN_LY') or assigned_to = nhan_vien_hien_tai()
);

create policy nn_doc on hkd_dossier_industries for select using (
  dossier_id in (select id from hkd_dossiers)
);
create policy nn_ghi on hkd_dossier_industries for all using (
  dossier_id in (select id from hkd_dossiers)
) with check (
  dossier_id in (select id from hkd_dossiers)
);

create policy ls_doc on hkd_dossier_history for select using (
  dossier_id in (select id from hkd_dossiers)
);
create policy ls_them on hkd_dossier_history for insert with check (
  changed_by = nhan_vien_hien_tai()
);

-- ---------------------------------------------------------------------
-- Kho ảnh căn cước
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ho-so-files', 'ho-so-files', false)
on conflict (id) do nothing;

create policy anh_doc on storage.objects for select
  using (bucket_id = 'ho-so-files' and auth.role() = 'authenticated');
create policy anh_tai_len on storage.objects for insert
  with check (bucket_id = 'ho-so-files' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- Dữ liệu khởi tạo tối thiểu
-- ---------------------------------------------------------------------
insert into provinces (code, name) values ('01', 'Thành phố Hà Nội')
on conflict (code) do nothing;
