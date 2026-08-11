"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import DepartmentDropdown from "./DepartmentDropdown";

interface StudentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function StudentVerificationModal({
  isOpen,
  onClose,
  userEmail,
}: StudentVerificationModalProps) {
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("ช่างอิเล็กทรอนิกส์");
  const [level, setLevel] = useState("pvs");
  const [proofNote, setProofNote] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFile) {
      setErrorMsg("กรุณาแนบรูปภาพหลักฐานบัตรประจำตัวนักศึกษา");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Upload proof file to backend/cloudinary
      const formData = new FormData();
      formData.append("file", cardFile);
      const uploadRes = await api.post("/auth/upload-proof", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const cardImageUrl = uploadRes.data.url;

      // 2. Submit request with card_image_url
      await api.post("/auth/request-student-verification", {
        student_id: studentId,
        department,
        level,
        reason: proofNote,
        proof_note: proofNote,
        card_image_url: cardImageUrl,
      });

      setSuccessMsg("ส่งคำขออนุมัติตัวตนเป็นนักศึกษาเรียบร้อยแล้ว รอการตรวจสอบจาก Admin (1-2 วัน)");
      setTimeout(() => {
        onClose();
        setSuccessMsg("");
        setCardFile(null);
        setPreviewUrl(null);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "เกิดข้อผิดพลาดในการส่งคำขอ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-outline-variant">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-secondary text-[22px]">
              school
            </span>
            <h3 className="text-base font-headline">
              ยื่นคำขออนุมัติสิทธิ์นักศึกษา
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary p-1 rounded-full"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          หากคุณใช้อีเมลส่วนตัว <strong>({userEmail})</strong> ในการเข้าสู่ระบบ แต่เป็นนักศึกษาวิทยาลัยเทคนิคหาดใหญ่ สามารถกรอกข้อมูลบัตรนักศึกษาเพื่อยื่นเรื่องอนุมัติสิทธิ์ได้
        </p>

        {errorMsg && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 text-emerald-700 rounded-xl text-xs font-semibold">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              รหัสนักศึกษา (Student ID)*
            </label>
            <input
              type="text"
              required
              placeholder="เช่น 66301010042"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              แผนกวิชาช่าง*
            </label>
            <DepartmentDropdown
              value={department}
              onChange={(val) => setDepartment(val)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              ระดับชั้น*
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs"
            >
              <option value="pvc">ประกาศนียบัตรวิชาชีพ (ปวช.)</option>
              <option value="pvs">ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              ภาพหลักฐานบัตรประจำตัวนักเรียน/นักศึกษา*
            </label>
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
              className="w-full p-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-on-secondary hover:file:bg-secondary/90"
            />
            {previewUrl && (
              <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-outline-variant">
                <img src={previewUrl} alt="Student Card Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              หมายเหตุ / ข้อมูลเพิ่มเติม
            </label>
            <textarea
              rows={3}
              placeholder="ระบุปีที่เข้าศึกษา..."
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-surface-container text-on-surface-variant font-bold rounded-xl text-xs hover:bg-surface-container-high transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-secondary text-on-secondary font-bold rounded-xl text-xs hover:bg-secondary/90 shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {loading ? "กำลังส่ง..." : "ยื่นเรื่องอนุมัติ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
