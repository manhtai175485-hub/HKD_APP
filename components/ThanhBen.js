"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

const MUC = [
  { href: "/hkd", nhan: "Hồ sơ hộ kinh doanh" },
  { href: "/hkd/new", nhan: "Tạo hồ sơ" },
];

export default function ThanhBen({ nhanVien }) {
  const duongDan = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function thoat() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav style={{
      width: 210, flexShrink: 0, background: "var(--the)",
      borderRight: "1px solid var(--vien)", padding: 16,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, color: "var(--son)" }}>
        Hộ kinh doanh
      </div>

      <div style={{ flex: 1 }}>
        {MUC.map((m) => {
          const dangChon = m.href === "/hkd" ? duongDan === "/hkd" : duongDan.startsWith(m.href);
          return (
            <Link key={m.href} href={m.href} style={{
              display: "block", padding: "9px 12px", borderRadius: 3, marginBottom: 4,
              fontSize: 13, fontWeight: 600, textDecoration: "none",
              color: dangChon ? "var(--son)" : "var(--muc)",
              background: dangChon ? "var(--sonnhat)" : "transparent",
            }}>{m.nhan}</Link>
          );
        })}
      </div>

      <div style={{ borderTop: "1px solid var(--vien)", paddingTop: 12, fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{nhanVien.full_name}</div>
        <div className="phu" style={{ marginBottom: 10, fontSize: 11 }}>
          {(nhanVien.permissions || []).join(" · ")}
        </div>
        <button onClick={thoat} style={{
          background: "none", border: "none", color: "var(--son)",
          cursor: "pointer", fontSize: 12, padding: 0, fontWeight: 600,
        }}>Đăng xuất</button>
      </div>
    </nav>
  );
}
