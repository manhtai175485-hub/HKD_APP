import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Đọc thông tin trên thẻ căn cước từ ảnh chụp.
//
// VÌ SAO CẦN: quét mã QR chỉ chạy được với ảnh sắc nét, chụp thẳng, đủ sáng.
// Ảnh nhân viên chụp vội thường nghiêng, lóa, mã QR quá nhỏ — dò không ra.
// Mô hình đọc ảnh đọc được chữ in trên thẻ, chịu được ảnh xấu hơn nhiều,
// và trả đúng dấu tiếng Việt.
//
// DÙNG ĐƯỢC HAI NHÀ CUNG CẤP — có khóa nào thì tự dùng khóa đó:
//   GEMINI_API_KEY     Google, gói miễn phí không cần thẻ.
//                      ĐÁNH ĐỔI: gói miễn phí cho phép Google dùng nội
//                      dung gửi lên để huấn luyện mô hình. Với ảnh căn
//                      cước của khách thì cần cân nhắc.
//   ANTHROPIC_API_KEY  Anthropic, tính tiền theo lượt, không lấy dữ liệu.
//
// Có cả hai thì ưu tiên Anthropic.
//
// BẢO MẬT:
//   * Khóa để trong biến môi trường phía máy chủ, KHÔNG có tiền tố
//     NEXT_PUBLIC nên không lộ ra trình duyệt.
//   * Chỉ nhân viên đã đăng nhập mới gọi được — kiểm ngay đầu hàm.
//   * Ảnh chỉ đi qua bộ nhớ tạm, không ghi xuống đĩa ở bước này.
//
// LƯU Ý: kết quả vẫn phải để nhân viên đối chiếu lại. Mô hình đọc rất
// chính xác nhưng không tuyệt đối, mà số căn cước sai một chữ số là hồ sơ
// bị trả về.

const HUONG_DAN = `Bạn đọc thẻ căn cước công dân Việt Nam từ ảnh chụp.

Trả về DUY NHẤT một đối tượng JSON, không kèm lời dẫn, không kèm dấu nháy ba.

Các khóa cần có:
  cccd        số thẻ, đúng 12 chữ số, chỉ chữ số
  hoTen       họ và tên, VIẾT HOA, giữ nguyên dấu tiếng Việt
  ngaySinh    dạng YYYY-MM-DD
  gioiTinh    "Nam" hoặc "Nữ"
  thuongTru   nơi thường trú, ghi đầy đủ, giữ nguyên dấu tiếng Việt
  queQuan     quê quán, giữ nguyên dấu tiếng Việt
  ngayCap     dạng YYYY-MM-DD, để chuỗi rỗng nếu không thấy
  ngayHetHan  dạng YYYY-MM-DD, để chuỗi rỗng nếu không thấy

Quy tắc:
- Trường nào không đọc được thì để chuỗi rỗng, TUYỆT ĐỐI không đoán.
- Nếu ảnh không phải thẻ căn cước Việt Nam, trả {"loi":"khong_phai_cccd"}.
- Mặt sau thẻ có dãy ký tự máy đọc bắt đầu bằng IDVNM — dùng nó để đối
  chiếu số thẻ, ngày sinh và giới tính cho chắc.
- Ngày trên thẻ in theo kiểu ngày/tháng/năm, đổi sang YYYY-MM-DD.`;

function kieuAnh(file) {
  const t = (file.type || "").toLowerCase();
  if (t === "image/png") return "image/png";
  if (t === "image/webp") return "image/webp";
  if (t === "image/gif") return "image/gif";
  return "image/jpeg";
}

async function base64(file) {
  return Buffer.from(await file.arrayBuffer()).toString("base64");
}

// Mô hình đôi khi bọc JSON trong dấu nháy ba — gỡ ra rồi mới đọc
function docJson(chu) {
  const sach = String(chu || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(sach);
  } catch {
    const m = sach.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Không hiểu được kết quả trả về");
    return JSON.parse(m[0]);
  }
}

async function goiAnthropic(dsAnh) {
  const noiDung = [];
  for (const f of dsAnh) {
    noiDung.push({
      type: "image",
      source: { type: "base64", media_type: kieuAnh(f), data: await base64(f) },
    });
  }
  noiDung.push({ type: "text", text: "Đọc thẻ căn cước trong các ảnh trên." });

  const traLoi = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: HUONG_DAN,
      messages: [{ role: "user", content: noiDung }],
    }),
  });

  if (!traLoi.ok) {
    throw new Error(`Anthropic trả lỗi ${traLoi.status}: ${(await traLoi.text()).slice(0, 300)}`);
  }
  const data = await traLoi.json();
  return (data.content || [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");
}

async function goiGemini(dsAnh) {
  const phan = [];
  for (const f of dsAnh) {
    phan.push({ inline_data: { mime_type: kieuAnh(f), data: await base64(f) } });
  }
  phan.push({ text: "Đọc thẻ căn cước trong các ảnh trên." });

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(process.env.GEMINI_API_KEY);

  const traLoi = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: HUONG_DAN }] },
      contents: [{ role: "user", parts: phan }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1024 },
    }),
  });

  if (!traLoi.ok) {
    throw new Error(`Google trả lỗi ${traLoi.status}: ${(await traLoi.text()).slice(0, 300)}`);
  }
  const data = await traLoi.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("");
}

export async function POST(request) {
  // 1. Chỉ nhân viên đã đăng nhập mới được gọi
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const coAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const coGemini = !!process.env.GEMINI_API_KEY;
  if (!coAnthropic && !coGemini) {
    return NextResponse.json(
      {
        error:
          "Máy chủ chưa cấu hình khóa đọc ảnh. Thêm biến GEMINI_API_KEY (miễn phí) " +
          "hoặc ANTHROPIC_API_KEY trên Vercel rồi triển khai lại.",
      },
      { status: 500 }
    );
  }

  // 2. Nhận ảnh
  let anhTruoc, anhSau;
  try {
    const form = await request.formData();
    anhTruoc = form.get("truoc");
    anhSau = form.get("sau");
  } catch {
    return NextResponse.json({ error: "Không đọc được dữ liệu gửi lên" }, { status: 400 });
  }

  const dsAnh = [anhTruoc, anhSau].filter((f) => f && typeof f.arrayBuffer === "function");
  if (dsAnh.length === 0) {
    return NextResponse.json({ error: "Chưa có ảnh nào" }, { status: 400 });
  }

  const GIOI_HAN = 8 * 1024 * 1024;
  for (const f of dsAnh) {
    if (f.size > GIOI_HAN) {
      return NextResponse.json({ error: "Ảnh quá nặng, mỗi ảnh nên dưới 8 MB" }, { status: 400 });
    }
  }

  // 3. Gọi mô hình đọc ảnh
  try {
    const chu = coAnthropic ? await goiAnthropic(dsAnh) : await goiGemini(dsAnh);
    const kq = docJson(chu);

    if (kq.loi === "khong_phai_cccd") {
      return NextResponse.json(
        { error: "Ảnh này không phải thẻ căn cước công dân Việt Nam" },
        { status: 422 }
      );
    }

    // 4. Làm sạch trước khi trả về
    const ngay = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : "");

    return NextResponse.json({
      cccd: String(kq.cccd || "").replace(/\D/g, "").slice(0, 12),
      hoTen: String(kq.hoTen || "").trim(),
      ngaySinh: ngay(kq.ngaySinh),
      gioiTinh: String(kq.gioiTinh || "").trim() === "Nữ" ? "Nữ" : "Nam",
      thuongTru: String(kq.thuongTru || "").trim(),
      queQuan: String(kq.queQuan || "").trim(),
      ngayCap: ngay(kq.ngayCap),
      ngayHetHan: ngay(kq.ngayHetHan),
      nguon: coAnthropic ? "anthropic" : "google",
    });
  } catch (e) {
    return NextResponse.json({ error: "Lỗi khi đọc ảnh: " + e.message }, { status: 502 });
  }
}
