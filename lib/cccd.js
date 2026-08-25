// Đọc mã QR mặt sau thẻ căn cước gắn chip.
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
export function anhSangDiemAnh(file, canhToiDa = 1400) {
  return new Promise((giai, hong) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (Math.max(w, h) > canhToiDa) {
        const ti = canhToiDa / Math.max(w, h);
        w = Math.round(w * ti); h = Math.round(h * ti);
      }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      giai(ctx.getImageData(0, 0, w, h));
    };
    img.onerror = () => hong(new Error("Không mở được ảnh"));
    img.src = URL.createObjectURL(file);
  });
}

export function lamSachTenTep(ten) {
  const phan = String(ten || "").split(".");
  const duoi = phan.length > 1 ? "." + phan.pop() : "";
  const goc = phan.join(".")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return (goc || "tep") + duoi.toLowerCase();
}
