// Đọc số thành chữ tiếng Việt. Dùng cho ô "Tổng số bằng chữ" trong mẫu đơn.
// Đã kiểm các chỗ dễ sai: mốt, lăm, lẻ, không trăm.

const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function docBaSo(n, batBuoc) {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor(n / 10) % 10;
  const donVi = n % 10;
  let s = "";
  if (tram > 0 || batBuoc) {
    s += CHU_SO[tram] + " trăm";
    if (chuc === 0 && donVi > 0) s += " lẻ";
  }
  if (chuc > 1) {
    s += " " + CHU_SO[chuc] + " mươi";
    if (donVi === 1) s += " mốt";
    else if (donVi === 5) s += " lăm";
    else if (donVi > 0) s += " " + CHU_SO[donVi];
  } else if (chuc === 1) {
    s += " mười";
    if (donVi === 5) s += " lăm";
    else if (donVi > 0) s += " " + CHU_SO[donVi];
  } else if (donVi > 0) {
    s += " " + CHU_SO[donVi];
  }
  return s.trim();
}

export function docSo(soTien) {
  let n = Math.floor(Number(soTien) || 0);
  if (n === 0) return "Không đồng";
  const DON_VI = ["", " nghìn", " triệu", " tỷ"];
  const nhom = [];
  while (n > 0) { nhom.push(n % 1000); n = Math.floor(n / 1000); }
  let s = "";
  for (let i = nhom.length - 1; i >= 0; i--) {
    if (nhom[i] === 0) continue;
    s += (s ? " " : "") + docBaSo(nhom[i], i < nhom.length - 1) + DON_VI[i];
  }
  s = s.trim();
  return s.charAt(0).toUpperCase() + s.slice(1) + " đồng";
}

export function chiSo(v) { return String(v ?? "").replace(/\D/g, ""); }
export function dinhDangTien(v) {
  const n = Number(chiSo(v)) || 0;
  return n ? n.toLocaleString("vi-VN") : "";
}
