"use client";

// Quét mã QR bằng camera trực tiếp.
//
// VÌ SAO CẦN: quét từ ảnh tĩnh chỉ có đúng một lần thử — ảnh mờ, nghiêng
// hay lóa là hỏng. Quét trực tiếp thử liên tục nhiều lần mỗi giây, người
// dùng đưa thẻ lại gần hay xoay nhẹ là bắt được ngay, lại thấy phản hồi
// tức thì nên tự biết phải chỉnh thế nào.
//
// Cần HTTPS mới xin được quyền camera. Vercel chạy HTTPS nên không sao,
// nhưng mở bằng địa chỉ http ở máy thì trình duyệt sẽ từ chối.

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { tachChuoiQr } from "@/lib/cccd";

export default function QuetQrCamera({ khiXong, khiDong }) {
  const oVideo = useRef(null);
  const oCanvas = useRef(null);
  const dangChay = useRef(true);
  const [loi, setLoi] = useState("");
  const [camera, setCamera] = useState([]);
  const [dangDung, setDangDung] = useState("");

  useEffect(() => {
    let dong = null;
    dangChay.current = true;

    async function batDau(idCamera) {
      try {
        if (dong) dong.getTracks().forEach((t) => t.stop());

        dong = await navigator.mediaDevices.getUserMedia({
          video: idCamera
            ? { deviceId: { exact: idCamera } }
            : { facingMode: { ideal: "environment" } },
          audio: false,
        });

        const v = oVideo.current;
        if (!v) return;
        v.srcObject = dong;
        v.setAttribute("playsinline", "true");
        await v.play();

        // Lấy danh sách camera SAU khi đã xin quyền, vì trước đó
        // trình duyệt giấu tên thiết bị
        const ds = await navigator.mediaDevices.enumerateDevices();
        setCamera(ds.filter((d) => d.kind === "videoinput"));

        quet();
      } catch (e) {
        setLoi(
          e.name === "NotAllowedError"
            ? "Trình duyệt chưa được phép dùng camera. Bấm vào biểu tượng ổ khóa cạnh địa chỉ trang rồi bật quyền camera."
            : "Không mở được camera: " + e.message
        );
      }
    }

    function quet() {
      if (!dangChay.current) return;
      const v = oVideo.current;
      const c = oCanvas.current;
      if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(quet);
        return;
      }

      const W = v.videoWidth;
      const H = v.videoHeight;
      // Chỉ quét phần giữa khung hình — chỗ người dùng nhắm thẻ vào.
      // Vừa nhanh hơn vừa đỡ nhiễu bởi hậu cảnh.
      const canh = Math.min(W, H) * 0.85;
      const x = (W - canh) / 2;
      const y = (H - canh) / 2;

      c.width = 700;
      c.height = 700;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(v, x, y, canh, canh, 0, 0, 700, 700);

      const anh = ctx.getImageData(0, 0, 700, 700);
      const kq = jsQR(anh.data, anh.width, anh.height, {
        inversionAttempts: "attemptBoth",
      });

      if (kq?.data) {
        const d = tachChuoiQr(kq.data);
        if (d) {
          dangChay.current = false;
          if (dong) dong.getTracks().forEach((t) => t.stop());
          khiXong(d);
          return;
        }
        setLoi("Đọc được một mã QR nhưng không phải dữ liệu căn cước.");
      }
      requestAnimationFrame(quet);
    }

    batDau(dangDung);

    return () => {
      dangChay.current = false;
      if (dong) dong.getTracks().forEach((t) => t.stop());
    };
  }, [dangDung, khiXong]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(20,33,43,.88)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{ background: "var(--the)", borderRadius: 4, padding: 18, width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h2>Quét mã trên thẻ</h2>
          <button onClick={khiDong} className="xoa" style={{ fontSize: 22 }} title="Đóng">×</button>
        </div>
        <p className="ghi">
          Đưa mã QR trên thẻ vào giữa khung. Giữ thẻ cách ống kính chừng một gang tay,
          để ánh sáng đều, tránh đèn chiếu thẳng gây lóa.
        </p>

        <div style={{ position: "relative", background: "#000", borderRadius: 3, overflow: "hidden" }}>
          <video ref={oVideo} style={{ width: "100%", display: "block" }} muted playsInline />
          <div
            style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              width: "62%", aspectRatio: "1",
              border: "2px solid var(--son)", borderRadius: 3,
              boxShadow: "0 0 0 9999px rgba(20,33,43,.35)",
              pointerEvents: "none",
            }}
          />
        </div>
        <canvas ref={oCanvas} style={{ display: "none" }} />

        {camera.length > 1 && (
          <div className="o" style={{ marginTop: 12, marginBottom: 0 }}>
            <label>Chọn camera</label>
            <select value={dangDung} onChange={(e) => setDangDung(e.target.value)}>
              <option value="">Camera mặc định</option>
              {camera.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {loi && <div className="bao loi">{loi}</div>}

        <div style={{ marginTop: 14 }}>
          <button className="nut phu2" onClick={khiDong}>Đóng, nhập tay</button>
        </div>
      </div>
    </div>
  );
}
