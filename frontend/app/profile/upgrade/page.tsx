"use client";

import { useState, useEffect } from "react";
import { getToken, getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";

export default function ProfileUpgradePage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("แผนกวิชาช่างอิเล็กทรอนิกส์");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ text: string; isError?: boolean } | null>(null);

  const user = getUser();

  useEffect(() => {
    if (!getToken()) {
      router.push("/auth/login");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setStatus({ text: "กรุณากรอกรหัสนักศึกษา", isError: true });
      return;
    }
    if (!cardFile) {
      setStatus({ text: "กรุณาเลือกไฟล์ภาพหลักฐานบัตรประจำตัวนักศึกษา", isError: true });
      return;
    }

    const cleanStudentId = studentId.replace(/\D/g, "");
    if (cleanStudentId.length !== 11) {
      setStatus({ text: "รหัสนักศึกษาต้องเป็นตัวเลข 11 หลัก (เช่น 67219010003)", isError: true });
      return;
    }

    if (phone.trim()) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 9 || cleanPhone.length > 10) {
        setStatus({ text: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 9 - 10 หลัก", isError: true });
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
      const uploadRes = await fetch(`${API_URL}/auth/upload-proof`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json();
        throw new Error(uploadData.detail || "อัปโหลดภาพหลักฐานไม่สำเร็จ");
      }
      const { url: cardImageUrl } = await uploadRes.json();

      // 2. Submit request with card_image_url
      const res = await fetch(`${API_URL}/auth/request-student-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          student_id: cleanStudentId,
          department,
          phone: phone.trim() || undefined,
          reason: reason.trim() || undefined,
          card_image_url: cardImageUrl,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ text: data.message });
        setCardFile(null);
        setPreviewUrl(null);
      } else {
        setStatus({ text: data.detail || "เกิดข้อผิดพลาดในการยื่นคำร้อง", isError: true });
      }
    } catch (err: any) {
      setStatus({ text: err.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", isError: true });
    } finally {
      setLoading(false);
    }
  };

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
              placeholder="เช่น 6530128001"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">แผนกวิชา / สาขาวิชา</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="แผนกวิชาช่างอิเล็กทรอนิกส์">แผนกวิชาช่างอิเล็กทรอนิกส์</option>
              <option value="แผนกวิชาช่างไฟฟ้ากำลัง">แผนกวิชาช่างไฟฟ้ากำลัง</option>
              <option value="แผนกวิชาช่างยนต์">แผนกวิชาช่างยนต์</option>
              <option value="แผนกวิชาช่างกลโรงงาน">แผนกวิชาช่างกลโรงงาน</option>
              <option value="แผนกวิชาช่างเชื่อมโลหะ">แผนกวิชาช่างเชื่อมโลหะ</option>
              <option value="แผนกวิชาช่างเทคนิคคอมพิวเตอร์">แผนกวิชาช่างเทคนิคคอมพิวเตอร์</option>
              <option value="แผนกวิชาการบัญชี">แผนกวิชาการบัญชี</option>
              <option value="แผนกวิชาการตลาด">แผนกวิชาการตลาด</option>
              <option value="แผนกวิชาเทคโนโลยีสารสนเทศ">แผนกวิชาเทคโนโลยีสารสนเทศ</option>
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
            <label className="block text-xs font-semibold text-gray-700 mb-1">ภาพหลักฐานบัตรประจำตัวนักเรียน/นักศึกษา <span className="text-red-500">*</span></label>
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setCardFile(file);
                if (file) {
                  setPreviewUrl(URL.createObjectURL(file));
                } else {
                  setPreviewUrl(null);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            {previewUrl && (
              <div className="mt-2 relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 shadow-sm max-w-sm">
                <img src={previewUrl} alt="Student Card Preview" className="w-full h-full object-cover" />
              </div>
            )}
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
