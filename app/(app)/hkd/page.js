import Link from "next/link";
import { createClient } from "@/lib/supabaseServer";

const NHAN_TRANG_THAI = {
  DANG_XU_LY: "Đang xử lý",
  HOAN_THANH: "Hoàn thành",
};

function ngayVN(v) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("vi-VN");
}

export default async function DanhSachHoSo() {
  const supabase = createClient();
  const { data: hoSo } = await supabase
    .from("hkd_dossiers")
    .select("id, code, business_name, owner_name, status, created_at, wards(name)")
    .order("created_at", { ascending: false });

  const ds = hoSo || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1>Hồ sơ hộ kinh doanh</h1>
          <p className="phu">{ds.length} hồ sơ</p>
        </div>
        <Link href="/hkd/new" className="nut">Tạo hồ sơ</Link>
      </div>

      {ds.length === 0 ? (
        <div className="the" style={{ textAlign: "center", padding: 40 }}>
          <p className="phu">Chưa có hồ sơ nào. Bắt đầu bằng nút Tạo hồ sơ ở trên.</p>
        </div>
      ) : (
        <div className="the" style={{ padding: 0, overflow: "hidden" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 120 }}>Mã hồ sơ</th>
                <th>Tên hộ kinh doanh</th>
                <th>Chủ hộ</th>
                <th style={{ width: 130 }}>Phường/Xã</th>
                <th style={{ width: 100 }}>Ngày tạo</th>
                <th style={{ width: 110 }}></th>
              </tr>
            </thead>
            <tbody>
              {ds.map((h) => (
                <tr key={h.id}>
                  <td className="ma">{h.code}</td>
                  <td style={{ fontWeight: 600 }}>{h.business_name}</td>
                  <td>{h.owner_name}</td>
                  <td>{h.wards?.name || "—"}</td>
                  <td>{ngayVN(h.created_at)}</td>
                  <td>
                    <a href={`/api/export-dossier/${h.id}`} className="nut phu2 nho">Xuất Word</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
