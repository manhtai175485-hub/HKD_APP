"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { createClient } from "@/lib/supabaseClient";
import { docSo, chiSo, dinhDangTien } from "@/lib/money";
import { doQrTrongCacAnh, lamSachTenTep } from "@/lib/cccd";
import QuetQrCamera from "@/components/QuetQrCamera";

const MUC_VON = [30, 50, 100, 200, 500, 1000].map((tr) => ({
  nhan: tr >= 1000 ? `${tr / 1000} tỷ` : `${tr} tr`,
  gt: tr * 1_000_000,
}));

function OThaAnh({ nhan, mo_ta, tep, khiChon }) {
  const oTep = useRef(null);
  return (
    <div>
      <label>{nhan}</label>
      <div className="tha" onClick={() => oTep.current?.click()}>
        {tep ? (
          <img src={URL.createObjectURL(tep)} alt="" />
        ) : (
          <>
            <strong>Chọn ảnh</strong>
            <span>{mo_ta}</span>
          </>
        )}
      </div>
      <input
        ref={oTep}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => e.target.files?.[0] && khiChon(e.target.files[0])}
      />
    </div>
  );
}

export default function FormTaoHoSo({ nhanVien, dsPhuong, dsThuTuc, dsNhanVien }) {
  const router = useRouter();
  const supabase = createClient();

  const [anhTruoc, setAnhTruoc] = useState(null);
  const [anhSau, setAnhSau] = useState(null);
  const [baoQr, setBaoQr] = useState(null);
  const [moCamera, setMoCamera] = useState(false);

  const [f, setF] = useState({
    code: "",
    procedure_code: dsThuTuc[0]?.code || "THANH_LAP",
    assigned_to: nhanVien.id,
    authorized_to: nhanVien.id,
    owner_name: "",
    owner_dob: "",
    owner_gender: "Nam",
    owner_cccd: "",
    owner_residence: "",
    owner_phone: "",
    owner_email: "",
    business_name: "",
    ward_id: "",
    business_address: "",
    capital: "",
  });
  const [tenHoSuaTay, setTenHoSuaTay] = useState(false);
  const [nganh, setNganh] = useState([]);
  const [maNganh, setMaNganh] = useState("");
  const [tenNganh, setTenNganh] = useState("");
  const [baoNganh, setBaoNganh] = useState(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [baoLuu, setBaoLuu] = useState(null);

  function dat(khoa, gt) {
    setF((cu) => {
      const moi = { ...cu, [khoa]: gt };
      // Gợi ý tên hộ từ họ tên và năm sinh, trừ khi người dùng đã tự sửa
      if (!tenHoSuaTay && (khoa === "owner_name" || khoa === "owner_dob")) {
        const ten = (khoa === "owner_name" ? gt : moi.owner_name).trim();
        const nam = (khoa === "owner_dob" ? gt : moi.owner_dob).slice(0, 4);
        if (ten && nam) moi.business_name = ten.toUpperCase() + " " + nam;
      }
      return moi;
    });
  }

  // Dò mã QR trong CẢ HAI ảnh. Vị trí mã khác nhau tùy đời thẻ:
  // thẻ cấp khoảng 2021 để QR ở mặt trước, thẻ đời sau để ở mặt sau.
  async function doQr(truoc, sau) {
    if (!truoc && !sau) return;
    setBaoQr({ loai: "luu", chu: "Đang dò mã QR…" });
    try {
      const kq = await doQrTrongCacAnh(jsQR, [sau, truoc]);
      if (!kq) {
        setBaoQr({
          loai: "luu",
          chu: "Chưa thấy mã QR. Chụp lại theo cách này thì đọc được: đặt thẻ nằm phẳng, chụp thẳng từ trên xuống, để thẻ chiếm gần hết khung hình, tránh ánh sáng lóa vào mã. Không đọc được thì nhập tay bên dưới cũng xong.",
        });
        return;
      }
      if (!kq.duLieu) {
        setBaoQr({
          loai: "luu",
          chu: "Đọc được một mã QR nhưng nội dung không phải dữ liệu căn cước. Kiểm lại xem có chọn nhầm ảnh không, hoặc nhập tay bên dưới.",
        });
        return;
      }
      dienThongTin(kq.duLieu);
    } catch (e) {
      setBaoQr({ loai: "loi", chu: "Không đọc được ảnh: " + e.message });
    }
  }

  function dienThongTin(d) {
    setF((cu) => {
        const moi = {
          ...cu,
          owner_cccd: d.cccd,
          owner_name: d.hoTen,
          owner_dob: d.ngaySinh,
          owner_gender: d.gioiTinh,
          owner_residence: d.thuongTru,
        };
        if (!tenHoSuaTay && d.hoTen && d.ngaySinh) {
          moi.business_name = d.hoTen.toUpperCase() + " " + d.ngaySinh.slice(0, 4);
        }
        return moi;
      });
    setBaoQr({
      loai: "ok",
      chu: `Đã điền thông tin của ${d.hoTen}. Đối chiếu lại với thẻ trước khi lưu.`,
    });
  }

  function chonAnhTruoc(tep) {
    setAnhTruoc(tep);
    doQr(tep, anhSau);
  }

  function chonAnhSau(tep) {
    setAnhSau(tep);
    doQr(anhTruoc, tep);
  }

  function themNganh() {
    const ma = maNganh.trim();
    const ten = tenNganh.trim();
    if (!ma || !ten) {
      setBaoNganh({ loai: "loi", chu: "Điền cả mã và tên ngành trước khi thêm." });
      return;
    }
    if (nganh.some((n) => n.ma === ma)) {
      setBaoNganh({ loai: "loi", chu: `Mã ${ma} đã có trong danh sách.` });
      return;
    }
    setNganh([...nganh, { ma, ten }]);
    setMaNganh("");
    setTenNganh("");
    setBaoNganh(null);
  }

  function thieuGi() {
    const can = [
      ["code", "Mã hồ sơ"],
      ["owner_name", "Họ tên chủ hộ"],
      ["owner_cccd", "Số căn cước"],
      ["business_name", "Tên hộ kinh doanh"],
      ["business_address", "Địa chỉ kinh doanh"],
      ["capital", "Vốn kinh doanh"],
    ];
    const t = can.filter(([k]) => !String(f[k]).trim()).map(([, ten]) => ten);
    if (!nganh.length) t.push("Ngành nghề");
    return t;
  }

  async function taiAnh(tep, maHoSo, loai) {
    if (!tep) return null;
    const duongDan = `${maHoSo}/${loai}-${Date.now()}-${lamSachTenTep(tep.name)}`;
    const { error } = await supabase.storage.from("ho-so-files").upload(duongDan, tep);
    if (error) throw new Error(`Không tải được ảnh ${loai}: ${error.message}`);
    return duongDan;
  }

  async function luuHoSo() {
    const t = thieuGi();
    if (t.length) {
      setBaoLuu({ loai: "loi", chu: "Còn thiếu: " + t.join(" · ") });
      return;
    }
    setDangLuu(true);
    setBaoLuu({ loai: "luu", chu: "Đang lưu…" });
    try {
      const von = Number(chiSo(f.capital)) || 0;
      const truoc = await taiAnh(anhTruoc, f.code.trim(), "cccd-truoc");
      const sau = await taiAnh(anhSau, f.code.trim(), "cccd-sau");

      const { data: hoSo, error: loiHoSo } = await supabase
        .from("hkd_dossiers")
        .insert({
          code: f.code.trim(),
          procedure_code: f.procedure_code,
          assigned_to: f.assigned_to,
          authorized_to: f.authorized_to,
          owner_name: f.owner_name.trim(),
          owner_dob: f.owner_dob || null,
          owner_gender: f.owner_gender,
          owner_cccd: f.owner_cccd.trim(),
          owner_residence: f.owner_residence.trim(),
          owner_phone: f.owner_phone.trim(),
          owner_email: f.owner_email.trim(),
          business_name: f.business_name.trim(),
          ward_id: f.ward_id || null,
          business_address: f.business_address.trim(),
          capital: von,
          capital_words: docSo(von),
          cccd_front_path: truoc,
          cccd_back_path: sau,
          created_by: nhanVien.id,
        })
        .select("id")
        .single();

      if (loiHoSo) throw new Error(loiHoSo.message);

      if (nganh.length) {
        // Bổ sung mã ngành chưa có trong danh mục để khóa ngoại không vướng
        await supabase
          .from("industries")
          .upsert(nganh.map((n) => ({ code: n.ma, name: n.ten })), { onConflict: "code" });

        const { error: loiNganh } = await supabase.from("hkd_dossier_industries").insert(
          nganh.map((n, i) => ({
            dossier_id: hoSo.id,
            industry_code: n.ma,
            is_main: i === 0,
            position: i,
          }))
        );
        if (loiNganh) throw new Error("Lưu ngành nghề không xong: " + loiNganh.message);
      }

      await supabase.from("hkd_dossier_history").insert({
        dossier_id: hoSo.id,
        status: "DANG_XU_LY",
        note: "Tạo hồ sơ",
        changed_by: nhanVien.id,
      });

      router.push("/hkd");
      router.refresh();
    } catch (e) {
      setDangLuu(false);
      setBaoLuu({ loai: "loi", chu: e.message });
    }
  }

  const vonSo = Number(chiSo(f.capital)) || 0;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1>Tạo hồ sơ hộ kinh doanh</h1>
        <p className="phu">Ảnh căn cước · Ngành nghề · Địa chỉ → Giấy đề nghị đăng ký và Giấy ủy quyền</p>
      </div>

      <section className="the">
        <div className="buoc"><span className="so">01</span><h2>Ảnh căn cước công dân</h2></div>
        <p className="ghi">Chọn ảnh hai mặt. Mã QR trên thẻ sẽ tự điền thông tin chủ hộ.</p>
        <div className="luoi">
          <OThaAnh nhan="Mặt trước" mo_ta="Mặt có ảnh chân dung" tep={anhTruoc} khiChon={chonAnhTruoc} />
          <OThaAnh nhan="Mặt sau" mo_ta="Mặt có vân tay và chip" tep={anhSau} khiChon={chonAnhSau} />
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="nut phu2 nho" onClick={() => setMoCamera(true)}>
            Quét mã bằng camera
          </button>
          <span className="phu" style={{ fontSize: 12 }}>
            Chắc ăn hơn quét từ ảnh — thử liên tục cho tới khi bắt được mã.
          </span>
        </div>

        {baoQr && <div className={`bao ${baoQr.loai}`}>{baoQr.chu}</div>}

        {moCamera && (
          <QuetQrCamera
            khiDong={() => setMoCamera(false)}
            khiXong={(d) => { setMoCamera(false); dienThongTin(d); }}
          />
        )}
      </section>

      <section className="the">
        <div className="buoc"><span className="so">02</span><h2>Chủ hộ</h2></div>
        <p className="ghi">Đối chiếu với thẻ căn cước rồi sửa nếu có chỗ chưa khớp.</p>
        <div className="luoi">
          <div className="o"><label>Họ và tên</label>
            <input value={f.owner_name} onChange={(e) => dat("owner_name", e.target.value)} placeholder="NGUYỄN VĂN A" /></div>
          <div className="o"><label>Số căn cước</label>
            <input className="ma" maxLength={12} value={f.owner_cccd}
              onChange={(e) => dat("owner_cccd", chiSo(e.target.value).slice(0, 12))} placeholder="12 chữ số" /></div>
          <div className="o"><label>Ngày sinh</label>
            <input type="date" value={f.owner_dob} onChange={(e) => dat("owner_dob", e.target.value)} /></div>
          <div className="o"><label>Giới tính</label>
            <select value={f.owner_gender} onChange={(e) => dat("owner_gender", e.target.value)}>
              <option>Nam</option><option>Nữ</option>
            </select></div>
          <div className="o rong"><label>Địa chỉ thường trú</label>
            <input value={f.owner_residence} onChange={(e) => dat("owner_residence", e.target.value)} /></div>
        </div>
      </section>

      <section className="the">
        <div className="buoc"><span className="so">03</span><h2>Hộ kinh doanh</h2></div>
        <p className="ghi">Tên hộ được gợi ý từ họ tên và năm sinh — sửa lại nếu cần.</p>
        <div className="luoi">
          <div className="o"><label>Mã hồ sơ</label>
            <input className="ma" value={f.code} onChange={(e) => dat("code", e.target.value)} placeholder="HKD-001" /></div>
          <div className="o"><label>Loại thủ tục</label>
            <select value={f.procedure_code} onChange={(e) => dat("procedure_code", e.target.value)}>
              {dsThuTuc.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select></div>
          <div className="o rong"><label>Tên hộ kinh doanh</label>
            <input value={f.business_name}
              onChange={(e) => { setTenHoSuaTay(true); dat("business_name", e.target.value); }} /></div>
          <div className="o"><label>Phường / Xã</label>
            <select value={f.ward_id} onChange={(e) => dat("ward_id", e.target.value)}>
              <option value="">— Chọn —</option>
              {dsPhuong.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="o"><label>Nơi cấp</label>
            <input readOnly value={dsPhuong.find((p) => p.id === f.ward_id)?.issuing_office || ""}
              placeholder="Tự điền theo phường/xã" style={{ background: "var(--giay)" }} /></div>
          <div className="o rong"><label>Địa chỉ kinh doanh</label>
            <input value={f.business_address} onChange={(e) => dat("business_address", e.target.value)}
              placeholder="Số nhà, ngõ, đường" /></div>
        </div>

        <div className="o">
          <label>Vốn kinh doanh</label>
          <input className="ma" inputMode="numeric" value={f.capital}
            onChange={(e) => dat("capital", dinhDangTien(e.target.value))} placeholder="0" />
          <div className="nhanh">
            {MUC_VON.map((m) => (
              <button key={m.gt} type="button"
                onClick={() => dat("capital", m.gt.toLocaleString("vi-VN"))}>{m.nhan}</button>
            ))}
          </div>
          <div className="chu">{vonSo ? docSo(vonSo) : ""}</div>
        </div>

        <div className="luoi">
          <div className="o"><label>Số điện thoại</label>
            <input inputMode="numeric" value={f.owner_phone}
              onChange={(e) => dat("owner_phone", e.target.value)} placeholder="09xxxxxxxx" /></div>
          <div className="o"><label>Email</label>
            <input type="email" value={f.owner_email}
              onChange={(e) => dat("owner_email", e.target.value)} placeholder="ten@gmail.com" /></div>
        </div>
      </section>

      <section className="the">
        <div className="buoc"><span className="so">04</span><h2>Ngành nghề</h2></div>
        <p className="ghi">Ngành đầu tiên là ngành chính.</p>
        <div className="luoi">
          <div className="o"><label>Mã ngành</label>
            <input className="ma" value={maNganh} list="dsNganh"
              onChange={(e) => setMaNganh(e.target.value)} placeholder="4711" /></div>
          <div className="o"><label>Tên ngành</label>
            <input value={tenNganh} onChange={(e) => setTenNganh(e.target.value)} /></div>
        </div>
        <button type="button" className="nut phu2 nho" onClick={themNganh}>Thêm ngành</button>
        {baoNganh && <div className={`bao ${baoNganh.loai}`}>{baoNganh.chu}</div>}

        {nganh.length > 0 && (
          <table>
            <thead><tr>
              <th style={{ width: 44 }}>STT</th><th style={{ width: 90 }}>Mã</th>
              <th>Tên ngành</th><th style={{ width: 90 }}>Chính</th><th style={{ width: 36 }}></th>
            </tr></thead>
            <tbody>
              {nganh.map((n, i) => (
                <tr key={n.ma}>
                  <td>{i + 1}</td>
                  <td className="ma">{n.ma}</td>
                  <td>{n.ten}</td>
                  <td>{i === 0 ? "Ngành chính" : ""}</td>
                  <td><button className="xoa" title="Bỏ ngành này"
                    onClick={() => setNganh(nganh.filter((_, j) => j !== i))}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="the">
        <div className="buoc"><span className="so">05</span><h2>Người ủy quyền</h2></div>
        <p className="ghi">Bên B của giấy ủy quyền. Thông tin lấy từ hồ sơ nhân viên.</p>
        <div className="o">
          <label>Nhân viên nhận ủy quyền</label>
          <select value={f.authorized_to} onChange={(e) => dat("authorized_to", e.target.value)}>
            {dsNhanVien.map((n) => (
              <option key={n.id} value={n.id}>
                {n.full_name}{n.id === nhanVien.id ? " (tôi)" : ""}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="nut" onClick={luuHoSo} disabled={dangLuu}>
          {dangLuu ? "Đang lưu…" : "Lưu hồ sơ"}
        </button>
        <span className="phu">Xuất mẫu đơn Word ở danh sách hồ sơ sau khi lưu.</span>
      </div>
      {baoLuu && <div className={`bao ${baoLuu.loai}`}>{baoLuu.chu}</div>}
    </div>
  );
}
