// Đọc mã QR trên thẻ căn cước công dân.
//
// VỊ TRÍ MÃ khác nhau tùy đời thẻ:
//   - Thẻ gắn chip cấp khoảng 2021: QR ở MẶT TRƯỚC, góc trên bên phải
//   - Thẻ đời sau: QR ở MẶT SAU
// Nên phải dò CẢ HAI ảnh.
//
// KHÓ Ở CHỖ: mã QR trên thẻ rất nhỏ. Ảnh chụp bằng điện thoại để cả bàn
// vào khung thì mã chỉ chiếm chừng 70 điểm ảnh vuông. Thư viện dò mã quét
// cả tấm một lượt sẽ bỏ sót. Cách xử lý: chia ảnh thành từng ô có chồng
// mép, phóng to từng ô rồi mới dò — mã nhỏ trong ảnh lớn thành mã lớn
// trong ô nhỏ.
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

function napAnh(file) {
  return new Promise((giai, hong) => {
    const img = new Image();
    img.onload = () => giai(img);
    img.onerror = () => hong(new Error("Không mở được ảnh"));
    img.src = URL.createObjectURL(file);
  });
}

// Vẽ một vùng của ảnh lên canvas với hệ số phóng to cho trước.
// tangTuongPhan: chuyển sang thang xám rồi kéo giãn tương phản —
// giúp ích khi ảnh bị lóa hoặc chụp thiếu sáng.
function veVung(img, vung, phongTo, tangTuongPhan) {
  const { x, y, w, h } = vung;
  const rong = Math.round(w * phongTo);
  const cao = Math.round(h * phongTo);
  // Canvas quá lớn vừa chậm vừa dễ hết bộ nhớ trên điện thoại
  if (rong * cao > 4000000 || rong < 40 || cao < 40) return null;

  const c = document.createElement("canvas");
  c.width = rong;
  c.height = cao;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, x, y, w, h, 0, 0, rong, cao);

  const anh = ctx.getImageData(0, 0, rong, cao);
  if (!tangTuongPhan) return anh;

  const d = anh.data;
  let nhoNhat = 255;
  let lonNhat = 0;
  for (let i = 0; i < d.length; i += 4) {
    const xam = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    d[i] = d[i + 1] = d[i + 2] = xam;
    if (xam < nhoNhat) nhoNhat = xam;
    if (xam > lonNhat) lonNhat = xam;
  }
  const khoang = lonNhat - nhoNhat;
  if (khoang > 10) {
    const he = 255 / khoang;
    for (let i = 0; i < d.length; i += 4) {
      const v = (d[i] - nhoNhat) * he;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  return anh;
}

// Sinh danh sách vùng cần quét: cả tấm, rồi lưới 2x2 và 3x3 có chồng mép.
// Chồng mép để mã nằm đúng đường chia không bị cắt đôi.
function danhSachVung(W, H) {
  const ds = [{ x: 0, y: 0, w: W, h: H }];
  for (const n of [2, 3]) {
    const w = W / n;
    const h = H / n;
    const chong = 0.25; // chồng mép một phần tư ô
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = Math.max(0, (i - chong) * w);
        const y = Math.max(0, (j - chong) * h);
        const rong = Math.min(W - x, w * (1 + 2 * chong));
        const cao = Math.min(H - y, h * (1 + 2 * chong));
        ds.push({ x, y, w: rong, h: cao });
      }
    }
  }
  return ds;
}

async function doMotAnh(jsQR, file) {
  const img = await napAnh(file);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  if (!W || !H) return null;

  const vungs = danhSachVung(W, H);

  // Thử lần lượt: không tăng tương phản trước cho nhanh,
  // không được mới thử tăng tương phản.
  for (const tangTuongPhan of [false, true]) {
    for (const vung of vungs) {
      // Phóng to sao cho cạnh dài của vùng khoảng 1400 điểm ảnh,
      // giới hạn trong khoảng 1 đến 4 lần.
      const canhDai = Math.max(vung.w, vung.h);
      const phongTo = Math.min(4, Math.max(1, 1400 / canhDai));
      const anh = veVung(img, vung, phongTo, tangTuongPhan);
      if (!anh) continue;
      const kq = jsQR(anh.data, anh.width, anh.height, {
        inversionAttempts: "attemptBoth",
      });
      if (kq?.data) return kq.data;
    }
  }
  return null;
}

// Dò QR trong danh sách ảnh.
// Trả về { duLieu, chuoiGoc } khi đọc được đúng dạng căn cước,
// { duLieu: null, chuoiGoc } khi đọc được mã nhưng nội dung không đúng dạng,
// null khi không thấy mã nào.
export async function doQrTrongCacAnh(jsQR, danhSachAnh) {
  let chuoiLa = null;
  for (const file of danhSachAnh) {
    if (!file) continue;
    const chuoi = await doMotAnh(jsQR, file);
    if (!chuoi) continue;
    const d = tachChuoiQr(chuoi);
    if (d) return { duLieu: d, chuoiGoc: chuoi };
    chuoiLa = chuoi;
  }
  return chuoiLa ? { duLieu: null, chuoiGoc: chuoiLa } : null;
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
