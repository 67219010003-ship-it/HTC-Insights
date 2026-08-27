"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";

interface EmployerRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmployerRegisterModal({
  isOpen,
  onClose,
}: EmployerRegisterModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState("เทคโนโลยีสารสนเทศ");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 2) return digits;
    if (digits.startsWith("02")) {
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const currentUser = getUser();
    const posterAccountEmail = currentUser?.email || email.trim();
    const contactEmail = email.trim();

    try {
      await api.post("/auth/register/employer", {
        company_name: companyName.trim(),
        email: posterAccountEmail,
        contact_email: contactEmail,
        phone: phone.trim(),
        address: address.trim(),
        industry: industry.trim(),
        notes: notes.trim(),
      });

      setSuccessMsg("ส่งข้อมูลลงทะเบียนสถานประกอบการพาร์ทเนอร์สำเร็จ! เจ้าหน้าที่จะติดต่อกลับและอนุมัติบัญชีภายใน 1-2 วัน");
      setTimeout(() => {
        onClose();
        setSuccessMsg("");
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "เกิดข้อผิดพลาดในการลงทะเบียน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-outline-variant max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-secondary text-[24px]">
              domain
            </span>
            <h3 className="text-base font-headline">
              ลงทะเบียนสถานประกอบการพาร์ทเนอร์
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary p-1 rounded-full cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          สำหรับบริษัท/นายจ้างที่ต้องการเข้าร่วมเป็นพาร์ทเนอร์ และลงประกาศรับสมัครนักศึกษาวิทยาลัยเทคนิคหาดใหญ่เข้าร่วมฝึกงาน
        </p>

        {errorMsg && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 text-emerald-700 rounded-xl text-xs font-semibold leading-relaxed">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              ชื่อสถานประกอบการ / บริษัท*
            </label>
            <input
              type="text"
              required
              maxLength={150}
              placeholder="เช่น บจก. เอ็นเนอร์ยี่ โซลูชั่น หาดใหญ่"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              อีเมลติดต่อบริษัท*
            </label>
            <input
              type="email"
              required
              maxLength={100}
              placeholder="hr@company.co.th"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              เบอร์โทรศัพท์ติดต่อ* (ตัวเลข 9-10 หลัก)
            </label>
            <input
              type="tel"
              required
              maxLength={12}
              placeholder="000-000-0000 หรือ 000-000-000"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              ประเภทอุตสาหกรรม / สาขาวิชาที่เปิดรับ
            </label>
            <input
              type="text"
              maxLength={100}
              placeholder="เช่น ช่างยนต์, ช่างไฟฟ้า, เทคโนโลยีสารสนเทศ"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              ที่อยู่สถานประกอบการ
            </label>
            <input
              type="text"
              maxLength={300}
              placeholder="อ.หาดใหญ่ จ.สงขลา"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              รายละเอียดเพิ่มเติม / ตำแหน่งที่ต้องการรับ
            </label>
            <textarea
              rows={2}
              placeholder="ระบุจำนวนนักศึกษาที่ต้องการรับ หรือสวัสดิการ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-surface-container text-on-surface-variant font-bold rounded-xl text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-secondary text-on-secondary font-bold rounded-xl text-xs hover:bg-secondary/90 shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {loading ? "กำลังส่ง..." : "ส่งข้อมูลลงทะเบียน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
