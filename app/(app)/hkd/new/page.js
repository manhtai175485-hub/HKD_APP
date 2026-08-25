import { createClient } from "@/lib/supabaseServer";
import FormTaoHoSo from "@/components/FormTaoHoSo";

export const dynamic = "force-dynamic";

export default async function TrangTaoHoSo() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: nhanVien }, { data: phuong }, { data: thuTuc }, { data: dsNv }, { data: nganh }] =
    await Promise.all([
      supabase.from("employees").select("*").eq("auth_user_id", user.id).single(),
      supabase.from("wards").select("id, name, issuing_office").order("name"),
      supabase.from("procedures").select("code, name").eq("active", true).order("code"),
      supabase.from("employees").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("industries").select("code, name").order("code"),
    ]);

  return (
    <FormTaoHoSo
      nhanVien={nhanVien}
      dsPhuong={phuong || []}
      dsThuTuc={thuTuc || []}
      dsNhanVien={dsNv || []}
      dsNganhNghe={nganh || []}
    />
  );
}
