// Đọc mã QR trên thẻ căn cước công dân.
//
// LƯU Ý QUAN TRỌNG: vị trí mã QR khác nhau tùy đời thẻ.
//   - Thẻ gắn chip cấp khoảng 2021: QR ở MẶT TRƯỚC, góc trên bên phải
//   - Thẻ đời sau: QR ở MẶT SAU
// Nên phải dò CẢ HAI ảnh, ảnh nào có mã thì lấy.
//
// Chuỗi trong QR có 7 trường ngăn bằng dấu |
//   số CCCD | số CMND cũ | họ tên | ngày sinh | giới tính | thường trú | ngày cấp
// Ngày ở dạng ddmmyyyy.

export function ngayTuChuoi(s) {
  const d = String(s ?? "").replace(/\D/g, "");
  if (d.length !== 8) return "";
  return `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
}

export function tachChuoiQr(chuoi) {
  const p = String(chuoi ?? "").split("|");
  if (p.length < 6) return null;
  const gt = (p[4] || "").trim();
  return {
    cccd: (p[0] || "").replace(/\D/g, "").slice(0, 12),
    cmndCu: (p[1] || "").trim(),
    hoTen: (p[2] || "").trim(),
    ngaySinh: ngayTuChuoi(p[3]),
    gioiTinh: gt === "Nữ" || gt === "nữ" ? "Nữ" : "Nam",
    thuongTru: (p[5] || "").trim(),
    ngayCap: ngayTuChuoi(p[6]),
  };
}

// Vẽ ảnh lên canvas rồi trả về dữ liệu điểm ảnh cho bộ dò QR.
// canhToiDa: thu nhỏ ảnh quá lớn cho nhẹ, nhưng giữ đủ nét để dò được mã.
export function anhSangDiemAnh(file, canhToiDa = 1600) {
  return new Promise((giai, hong) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (Math.max(w, h) > canhToiDa) {
        const ti = canhToiDa / Math.max(w, h);
        w = Math.round(w * ti);
        h = Math.round(h * ti);
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      giai(ctx.getImageData(0, 0, w, h));
    };
    img.onerror = () => hong(new Error("Không mở được ảnh"));
    img.src = URL.createObjectURL(file);
  });
}

// Dò một ảnh ở nhiều cỡ khác nhau. Ảnh chụp bằng điện thoại thường rất lớn;
// thu nhỏ quá thì mã QR mờ, để nguyên thì bộ dò chậm và hay trượt.
// Thử lần lượt vài cỡ, được cỡ nào thì dừng.
async function doMotAnh(jsQR, file) {
  for (const canh of [1600, 2200, 1100]) {
    try {
      const anh = await anhSangDiemAnh(file, canh);
      const kq = jsQR(anh.data, anh.width, anh.height, {
        inversionAttempts: "attemptBoth",
      });
      if (kq?.data) return kq.data;
    } catch {
      // cỡ này không xử lý được thì thử cỡ khác
    }
  }
  return null;
}

// Dò QR trong danh sách ảnh. Trả về thông tin đã tách, hoặc null.
// Truyền jsQR vào thay vì import ở đây để tệp này dùng được cả ở nơi
// nạp thư viện bằng cách khác.
export async function doQrTrongCacAnh(jsQR, danhSachAnh) {
  for (const file of danhSachAnh) {
    if (!file) continue;
    const chuoi = await doMotAnh(jsQR, file);
    if (!chuoi) continue;
    const d = tachChuoiQr(chuoi);
    if (d) return { duLieu: d, chuoiGoc: chuoi };
    // Đọc được mã nhưng không đúng dạng căn cước — thử ảnh tiếp theo
  }
  return null;
}

export function lamSachTenTep(ten) {
  const phan = String(ten || "").split(".");
  const duoi = phan.length > 1 ? "." + phan.pop() : "";
  const goc = phan
    .join(".")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return (goc || "tep") + duoi.toLowerCase();
}
