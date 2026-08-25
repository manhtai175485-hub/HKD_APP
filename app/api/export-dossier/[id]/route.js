import { NextResponse } from "next/server";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function tachNgay(v) {
  if (!v) return { ngay: "", thang: "", nam: "" };
  const d = new Date(v);
  if (isNaN(d.getTime())) return { ngay: "", thang: "", nam: "" };
  const p = (n) => String(n).padStart(2, "0");
  return { ngay: p(d.getDate()), thang: p(d.getMonth() + 1), nam: String(d.getFullYear()) };
}

function ngayVN(v) {
  const t = tachNgay(v);
  return t.ngay ? `${t.ngay}/${t.thang}/${t.nam}` : "";
}

export async function GET(request, { params }) {
  const supabase = createClient();

  const { data: hs, error } = await supabase
    .from("hkd_dossiers")
    .select(`*,
      wards:ward_id (name, issuing_office),
      nguoi_uy_quyen:authorized_to (full_name, dob, gender, cccd, phone, address)`)
    .eq("id", params.id)
    .single();

  if (error || !hs) {
    return NextResponse.json({ error: "Không tìm thấy hồ sơ" }, { status: 404 });
  }

  const { data: nganhRaw } = await supabase
    .from("hkd_dossier_industries")
    .select("industry_code, detail, is_main, position, industries:industry_code (name)")
    .eq("dossier_id", params.id)
    .order("position");

  const nganh = (nganhRaw || []).map((n, i) => ({
    stt: i + 1,
    ten: (n.industries?.name || "") + (n.detail ? ` (Chi tiết: ${n.detail})` : ""),
    ma: n.industry_code,
    x: n.is_main ? "X" : "",
  }));

  const lap = tachNgay(new Date());
  const sinh = tachNgay(hs.owner_dob);
  const b = hs.nguoi_uy_quyen || {};

  const duLieu = {
    ngay_lap: lap.ngay, thang_lap: lap.thang, nam_lap: lap.nam,
    noi_cap: hs.wards?.issuing_office || "",
    ten_phuong: hs.wards?.name || "",
    ho_ten: hs.owner_name || "",
    ngay_sinh: sinh.ngay, thang_sinh: sinh.thang, nam_sinh: sinh.nam,
    gioi_tinh: hs.owner_gender || "",
    cccd: hs.owner_cccd || "",
    dien_thoai: hs.owner_phone || "",
    ten_ho_kd: hs.business_name || "",
    dia_chi_tru_so: hs.business_address || "",
    nganh,
    von: Number(hs.capital || 0).toLocaleString("vi-VN"),
    von_bang_chu: hs.capital_words || "",
    lien_lac_so_nha: hs.owner_residence || "",
    lien_lac_phuong: "",
    lien_lac_tinh: "",
    ben_b_ho_ten: b.full_name || "",
    ben_b_gioi_tinh: (b.gender || "").toLowerCase(),
    ben_b_ngay_sinh: ngayVN(b.dob),
    ben_b_cccd: b.cccd || "",
    ben_b_dia_chi: b.address || "",
    ben_b_dien_thoai: b.phone || "",
  };

  const duongDanMau = path.join(process.cwd(), "templates", "mau-don-hkd.docx");
  if (!fs.existsSync(duongDanMau)) {
    return NextResponse.json(
      { error: "Chưa có tệp mẫu. Đặt mau-don-hkd.docx vào thư mục templates rồi đẩy lên lại." },
      { status: 500 }
    );
  }

  try {
    const noiDung = fs.readFileSync(duongDanMau, "binary");
    const doc = new Docxtemplater(new PizZip(noiDung), {
      paragraphLoop: true,
      linebreaks: true,
    });
    doc.render(duLieu);
    const tep = doc.getZip().generate({ type: "nodebuffer" });
    const tenTep = `GiayDeNghi-${hs.code || params.id}.docx`;

    return new NextResponse(tep, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(tenTep)}"`,
      },
    });
  } catch (e) {
    const chiTiet = e.properties?.errors
      ? e.properties.errors.map((x) => x.properties.explanation).join(" · ")
      : e.message;
    return NextResponse.json({ error: "Không ghép được mẫu đơn: " + chiTiet }, { status: 500 });
  }
}
