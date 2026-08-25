"use client";

// Ô tìm ngành nghề.
//
// Gõ vài chữ trong tên ngành là ra gợi ý — không cần nhớ mã, không cần gõ
// đúng dấu. "ca phe" ra ngành có chữ "cà phê", "banh mi" ra "bánh mì".
//
// Cách xếp thứ tự kết quả: khớp mã lên trước, rồi tên bắt đầu bằng từ khóa,
// rồi tên có chứa từ khóa. Người dùng gõ "may" thì "May trang phục" nên
// đứng trên "Sửa chữa máy móc" — đó là lý do phải xếp thứ tự chứ không
// chỉ lọc.

import { useMemo, useRef, useState } from "react";

// Bỏ dấu tiếng Việt để so khớp. "Cà phê" và "ca phe" thành cùng một chuỗi.
export function boDau(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export default function OTimNganh({ danhMuc, khiChon }) {
  const [chu, setChu] = useState("");
  const [dangMo, setDangMo] = useState(false);
  const [oSang, setOSang] = useState(0);
  const oNhap = useRef(null);

  // Chuẩn hóa sẵn một lần, khỏi tính lại mỗi lần gõ
  const kho = useMemo(
    () => danhMuc.map((n) => ({ ...n, tenKhongDau: boDau(n.name) })),
    [danhMuc]
  );

  const ketQua = useMemo(() => {
    const tim = boDau(chu);
    if (tim.length < 2) return [];

    const laSo = /^\d+$/.test(tim);
    const diem = (n) => {
      if (laSo) {
        if (n.code === tim) return 0;
        if (n.code.startsWith(tim)) return 1;
        return n.code.includes(tim) ? 2 : 99;
      }
      if (n.tenKhongDau.startsWith(tim)) return 1;
      // Khớp đầu một từ trong tên: "may" khớp "May trang phục"
      if (n.tenKhongDau.includes(" " + tim)) return 2;
      return n.tenKhongDau.includes(tim) ? 3 : 99;
    };

    return kho
      .map((n) => ({ ...n, d: diem(n) }))
      .filter((n) => n.d < 99)
      .sort((a, b) => a.d - b.d || a.code.localeCompare(b.code))
      .slice(0, 30);
  }, [chu, kho]);

  function chon(n) {
    khiChon({ ma: n.code, ten: n.name });
    setChu("");
    setDangMo(false);
    setOSang(0);
    oNhap.current?.focus();
  }

  function bamPhim(e) {
    if (!ketQua.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOSang((i) => Math.min(i + 1, ketQua.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOSang((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      chon(ketQua[oSang]);
    } else if (e.key === "Escape") {
      setDangMo(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <label>Tìm ngành nghề</label>
      <input
        ref={oNhap}
        value={chu}
        onChange={(e) => { setChu(e.target.value); setDangMo(true); setOSang(0); }}
        onFocus={() => setDangMo(true)}
        // Chậm một nhịp để cú bấm chuột vào gợi ý kịp chạy trước khi đóng
        onBlur={() => setTimeout(() => setDangMo(false), 150)}
        onKeyDown={bamPhim}
        placeholder="Gõ tên ngành hoặc mã — ví dụ: ca phe, banh mi, 5610"
      />

      {dangMo && chu.trim().length >= 2 && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
            background: "var(--the)", border: "1px solid var(--vien)",
            borderRadius: 3, marginTop: 3, maxHeight: 300, overflowY: "auto",
            boxShadow: "0 6px 20px rgba(20,33,43,.12)",
          }}
        >
          {ketQua.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--nhat)" }}>
              Không có ngành nào khớp. Gõ từ khác, hoặc thêm tay ở ô bên dưới.
            </div>
          ) : (
            ketQua.map((n, i) => (
              <div
                key={n.code}
                onMouseDown={() => chon(n)}
                onMouseEnter={() => setOSang(i)}
                style={{
                  padding: "9px 12px", cursor: "pointer", fontSize: 13,
                  display: "flex", gap: 10, alignItems: "baseline",
                  background: i === oSang ? "var(--sonnhat)" : "transparent",
                  borderTop: i ? "1px solid var(--giay)" : "none",
                }}
              >
                <span className="ma" style={{ color: "var(--son)", flexShrink: 0 }}>{n.code}</span>
                <span>{n.name}</span>
              </div>
            ))
          )}
        </div>
      )}

      {danhMuc.length === 0 && (
        <p className="phu" style={{ fontSize: 12, marginTop: 6 }}>
          Danh mục ngành nghề chưa được nạp. Nhập tay mã và tên ở ô bên dưới.
        </p>
      )}
    </div>
  );
}
