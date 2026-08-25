"use client";

import { useState, useEffect, useRef } from "react";
import { getToken, getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import DepartmentDropdown from "@/components/DepartmentDropdown";

export default function ProfileUpgradePage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("แผนกวิชาช่างอิเล็กทรอนิกส์");
  const [level, setLevel] = useState("pvs");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ text: string; isError?: boolean } | null>(null);
  const user = getUser();

  useEffect(() => {
    if (!getToken()) {
      window.location.replace("/");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setStatus({ text: "กรุณากรอกรหัสนักศึกษา", isError: true });
      return;
    }

    const cleanStudentId = studentId.replace(/\D/g, "");
    if (cleanStudentId.length !== 11) {
      setStatus({ text: "รหัสนักศึกษาต้องเป็นตัวเลข 11 หลักเท่านั้น (เช่น 67219010003)", isError: true });
      return;
    }

    if (!cardFile) {
      setStatus({ text: "กรุณาแนบรูปภาพหลักฐานบัตรประจำตัวนักศึกษา", isError: true });
      return;
    }

    if (phone.trim()) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 9 || cleanPhone.length > 10) {
        setStatus({ text: "เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 9-10 หลัก (เช่น 000-000-0000)", isError: true });
        return;
      }
    }

    if (reason.trim().length > 300) {
      setStatus({ text: "เหตุผลเพิ่มเติมต้องมีความยาวไม่เกิน 300 ตัวอักษร", isError: true });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. Upload proof card first
      const formData = new FormData();
      formData.append("file", cardFile);
      const uploadRes = await api.post("/auth/upload-proof", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const cardImageUrl = uploadRes.data?.url;

      // 2. Submit request with card_image_url
      await api.post("/auth/request-student-verification", {
        student_id: cleanStudentId,
        department,
        level,
        phone: phone.trim() || undefined,
        reason: reason.trim() || undefined,
        card_image_url: cardImageUrl,
      });

      setStatus({
        text: "ส่งคำขอตรวจสอบสิทธิ์นักศึกษาเรียบร้อยแล้ว แอดมินจะดำเนินการตรวจสอบภายใน 1-2 วันทำการ",
        isError: false,
      });
      setCardFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => {
        router.push("/profile");
      }, 2500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "เกิดข้อผิดพลาดในการยื่นคำร้อง";
      setStatus({ text: errorMsg, isError: true });
    } finally {
      setLoading(false);
    }
  };

  if (!getToken()) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-medium">
          <span className="material-symbols-outlined text-base">arrow_back</span> กลับหน้าหลัก
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">badge</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ยื่นคำขอตรวจสอบสิทธิ์นักศึกษา</h1>
            <p className="text-xs text-gray-500">สำหรับศิษย์เก่าหรือนักศึกษาที่ใช้อีเมลภายนอกวิทยาลัยในการเข้าสู่ระบบ</p>
          </div>
        </div>

        {status && (
          <div className={`p-4 rounded-xl mb-6 text-sm ${status.isError ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
            {status.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่อบัญชีของคุณ</label>
            <input
              type="text"
              disabled
              value={user?.name || "ผู้ใช้งาน"}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">อีเมลที่ใช้งาน</label>
            <input
              type="text"
              disabled
              value={user?.email || "-"}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">รหัสนักศึกษา / รหัสประจำตัว <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              maxLength={11}
              placeholder="เช่น 67219010003 (11 หลัก)"
              value={studentId}
              onChange={(e) => {
                const filtered = e.target.value.replace(/\D/g, "").slice(0, 11);
                setStudentId(filtered);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              แผนกวิชา / สาขาวิชา <span className="text-red-500">*</span>
            </label>
            <DepartmentDropdown
              value={department}
              onChange={(val) => setDepartment(val)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              ระดับชั้น <span className="text-red-500">*</span>
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="pvc">ระดับประกาศนียบัตรวิชาชีพ (ปวช.)</option>
              <option value="pvs">ระดับประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)</option>
              <option value="btech">ระดับปริญญาตรี (หลักสูตรเทคโนโลยีบัณฑิต - ทล.บ.)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">เบอร์โทรศัพท์ติดต่อ (ถ้ามี)</label>
            <input
              type="text"
              placeholder="เช่น 000-000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">ภาพหลักฐานบัตรประจำตัวนักเรียน/นักศึกษา <span className="text-red-500">*</span></label>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setCardFile(file);
                if (file) {
                  setStatus(null);
                }
              }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-gray-100 border border-gray-300 hover:border-purple-500 hover:bg-purple-50 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-purple-600">upload_file</span>
                เลือกไฟล์ (Choose File)
              </button>

              {cardFile ? (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-xs text-emerald-900 font-medium">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">attach_file</span>
                  <span className="truncate max-w-[180px] sm:max-w-xs font-semibold">{cardFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCardFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-rose-600 hover:text-rose-700 font-bold p-0.5 rounded-md hover:bg-rose-100 transition-colors ml-1 cursor-pointer flex items-center gap-0.5 text-[11px]"
                    title="ลบไฟล์ที่แนบ"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    ลบภาพ
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-500">ยังไม่ได้เลือกไฟล์ภาพ</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">เหตุผลเพิ่มเติม</label>
            <textarea
              rows={3}
              placeholder="ระบุเหตุผล เช่น เป็นศิษย์เก่า ปวส.2 ปีการศึกษา 2566 หรือ ใช้อีเมลส่วนตัวสมัคร"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            {loading ? "กำลังส่งคำร้อง..." : "ส่งคำขอยืนยันสิทธิ์นักศึกษา"}
          </button>
        </form>
      </div>
    </div>
  );
}
