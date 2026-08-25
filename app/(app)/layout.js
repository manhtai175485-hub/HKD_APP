import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";
import ThanhBen from "@/components/ThanhBen";

export default async function BoCucUngDung({ children }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: nhanVien } = await supabase
    .from("employees").select("*").eq("auth_user_id", user.id).maybeSingle();

  if (!nhanVien) {
    return (
      <div style={{ maxWidth: 520, margin: "80px auto", padding: 24 }}>
        <div className="the">
          <h2>Tài khoản chưa được ghép hồ sơ nhân viên</h2>
          <p className="phu" style={{ marginTop: 8 }}>
            Đăng nhập thành công nhưng chưa có hồ sơ nhân viên tương ứng.
            Quản lý cần thêm một dòng vào bảng nhân viên với đúng mã tài khoản này:
          </p>
          <p className="ma" style={{ marginTop: 10, wordBreak: "break-all" }}>{user.id}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <ThanhBen nhanVien={nhanVien} />
      <div style={{ flex: 1, padding: "28px 24px 80px", maxWidth: 940 }}>{children}</div>
    </div>
  );
}
