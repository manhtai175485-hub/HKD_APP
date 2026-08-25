"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function TrangDangNhap() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [loi, setLoi] = useState("");
  const [dangChay, setDangChay] = useState(false);

  async function guiForm(e) {
    e.preventDefault();
    setLoi("");
    setDangChay(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: matKhau });
    setDangChay(false);
    if (error) { setLoi("Email hoặc mật khẩu chưa đúng."); return; }
    router.push("/hkd");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <form onSubmit={guiForm} className="the" style={{ width: 380, margin: 0 }}>
        <h1 style={{ fontSize: 22, marginBottom: 2 }}>Hồ sơ hộ kinh doanh</h1>
        <p className="phu" style={{ marginBottom: 20 }}>Đăng nhập để tiếp tục</p>

        <div className="o">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="o">
          <label>Mật khẩu</label>
          <input type="password" required value={matKhau} onChange={(e) => setMatKhau(e.target.value)} />
        </div>

        {loi && <div className="bao loi" style={{ marginBottom: 12 }}>{loi}</div>}

        <button type="submit" className="nut" disabled={dangChay} style={{ width: "100%" }}>
          {dangChay ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
        <p className="phu" style={{ marginTop: 14, textAlign: "center" }}>
          Chưa có tài khoản? Liên hệ quản lý để được cấp.
        </p>
      </form>
    </div>
  );
}
