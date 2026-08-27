"use client";

import { useState, useEffect, useRef } from "react";
import { getToken, getUser, isStudent } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import DepartmentDropdown from "@/components/DepartmentDropdown";

interface UpgradeRequestData {
  id: number;
  student_id: string;
  department: string;
  phone?: string;
  reason?: string;
  card_image_url?: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  created_at?: string;
}

export default function ProfileUpgradePage() {
  const router = useRouter();
  const [existingRequest, setExistingRequest] = useState<UpgradeRequestData | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("แผนกวิชาเทคโนโลยีสารสนเทศ");
  const [level, setLevel] = useState("pvs");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  const user = getUser();

  const fetchExistingRequest = async () => {
    try {
      setLoadingInitial(true);
      const res = await api.get("/auth/my-upgrade-request");
      if (res.data?.has_request && res.data?.request) {
        const req = res.data.request as UpgradeRequestData;
        setExistingRequest(req);
        setStudentId(req.student_id || "");
        setDepartment(req.department || "แผนกวิชาเทคโนโลยีสารสนเทศ");
        setPhone(req.phone || "");
        setReason(req.reason || "");
        setCardPreviewUrl(req.card_image_url || "");
      } else {
        setExistingRequest(null);
      }
    } catch (err) {
      console.error("Error fetching upgrade request:", err);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    if (!getToken()) {
      window.location.replace("/auth/login");
      return;
    }
    fetchExistingRequest();
  }, []);

  const handleStartEdit = () => {
    if (existingRequest) {
      setStudentId(existingRequest.student_id || "");
      setDepartment(existingRequest.department || "แผนกวิชาเทคโนโลยีสารสนเทศ");
      setPhone(existingRequest.phone || "");
      setReason(existingRequest.reason || "");
      setCardPreviewUrl(existingRequest.card_image_url || "");
      setCardFile(null);
      setStatusMsg(null);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setStatusMsg(null);
    if (existingRequest) {
      setStudentId(existingRequest.student_id || "");
      setDepartment(existingRequest.department || "แผนกวิชาเทคโนโลยีสารสนเทศ");
      setPhone(existingRequest.phone || "");
      setReason(existingRequest.reason || "");
      setCardPreviewUrl(existingRequest.card_image_url || "");
      setCardFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setStatusMsg({ text: "กรุณากรอกรหัสนักศึกษา", isError: true });
      return;
    }

    const cleanStudentId = studentId.replace(/\D/g, "");
    if (cleanStudentId.length !== 11) {
      setStatusMsg({ text: "รหัสนักศึกษาต้องเป็นตัวเลข 11 หลักเท่านั้น (เช่น 67219010003)", isError: true });
      return;
    }

    if (!cardFile && !cardPreviewUrl) {
      setStatusMsg({ text: "กรุณาแนบรูปภาพหลักฐานบัตรประจำตัวนักศึกษา", isError: true });
      return;
    }

    if (phone.trim()) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone.startsWith("0") || (cleanPhone.length !== 9 && cleanPhone.length !== 10)) {
        setStatusMsg({ text: "เบอร์โทรศัพท์ติดต่อต้องขึ้นต้นด้วย 0 และเป็นตัวเลข 9-10 หลัก (เช่น 000-000-0000 หรือ 000-000-000)", isError: true });
        return;
      }
    }

    if (reason.trim().length > 300) {
      setStatusMsg({ text: "เหตุผลเพิ่มเติมต้องมีความยาวไม่เกิน 300 ตัวอักษร", isError: true });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    try {
      let finalCardUrl = cardPreviewUrl;

      // 1. Upload new image if selected
      if (cardFile) {
        const formData = new FormData();
        formData.append("file", cardFile);
        const uploadRes = await api.post("/auth/upload-proof", formData);
        finalCardUrl = uploadRes.data?.url;
      }

      if (isEditing && existingRequest) {
        // Update existing request
        await api.put("/auth/my-upgrade-request", {
          student_id: cleanStudentId,
          department,
          level,
          phone: phone.trim() || undefined,
          reason: reason.trim() || undefined,
          card_image_url: finalCardUrl,
        });

        setStatusMsg({
          text: "แก้ไขและส่งคำขอยืนยันสิทธิ์นักศึกษาเรียบร้อยแล้ว แอดมินจะทำการตรวจสอบข้อมูลอีกครั้ง",
          isError: false,
        });
      } else {
        // Create new request
        await api.post("/auth/request-student-verification", {
          student_id: cleanStudentId,
          department,
          level,
          phone: phone.trim() || undefined,
          reason: reason.trim() || undefined,
          card_image_url: finalCardUrl,
        });

        setStatusMsg({
          text: "ส่งคำขอตรวจสอบสิทธิ์นักศึกษาเรียบร้อยแล้ว แอดมินจะดำเนินการตรวจสอบภายใน 1-2 วันทำการ",
          isError: false,
        });
      }

      setCardFile(null);
      setIsEditing(false);
      await fetchExistingRequest();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "เกิดข้อผิดพลาดในการยื่นคำร้อง";
      setStatusMsg({ text: errorMsg, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async () => {
    setDeleteLoading(true);
    try {
      await api.delete("/auth/my-upgrade-request");
      setShowDeleteModal(false);
      setExistingRequest(null);
      setStudentId("");
      setDepartment("แผนกวิชาเทคโนโลยีสารสนเทศ");
      setPhone("");
      setReason("");
      setCardFile(null);
      setCardPreviewUrl("");
      setIsEditing(false);
      setStatusMsg({ text: "ลบคำขอยืนยันสิทธิ์นักศึกษาเรียบร้อยแล้ว", isError: false });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "ไม่สามารถลบคำขอได้";
      setStatusMsg({ text: errorMsg, isError: true });
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-on-surface-variant">กำลังโหลดข้อมูลคำขอยืนยันสิทธิ์...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/profile"
          className="text-on-surface-variant hover:text-primary flex items-center gap-1 text-xs sm:text-sm font-bold transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          กลับหน้าโปรไฟล์ของฉัน
        </Link>
      </div>

      {/* Header Banner Card */}
      <div className="bg-white border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[28px]">badge</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-primary font-headline">
              ยื่นคำขอตรวจสอบสิทธิ์นักศึกษา
            </h1>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              สำหรับศิษย์เก่าหรือนักศึกษาวิทยาลัยเทคนิคหาดใหญ่ที่ใช้อีเมลส่วนตัว (Personal Email) เพื่อขอรับสิทธิ์เข้าถึงฟีเจอร์เขียนรีวิวฝึกงานและคอมมูนิตี้
            </p>
          </div>
        </div>
      </div>

      {/* Status / Alert Message */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-2.5 border shadow-xs ${
            statusMsg.isError
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">
            {statusMsg.isError ? "error" : "check_circle"}
          </span>
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ================= SECTION 1: EXISTING REQUEST STATUS CARD ================= */}
      {loadingInitial ? (
        <div className="bg-white border border-outline-variant/60 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-on-surface-variant">กำลังโหลดข้อมูลและตรวจสอบประวัติคำขอยื่นสิทธิ์...</p>
        </div>
      ) : existingRequest && !isEditing ? (
        <div className="bg-white border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Visual Progress Stepper Tracker */}
          <div className="bg-surface-container-low/70 p-4 sm:p-5 rounded-2xl border border-outline-variant/40">
            <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">
              ขั้นตอนการดำเนินงาน (Verification Progress)
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 relative text-center">
              {/* Step 1: Submit */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </div>
                <div className="text-xs font-bold text-emerald-800">ส่งคำขอแล้ว</div>
                <div className="text-[10px] text-on-surface-variant hidden sm:block">บันทึกข้อมูลเรียบร้อย</div>
              </div>

              {/* Step 2: Verification */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${
                    existingRequest.status === "approved"
                      ? "bg-emerald-500 text-white"
                      : existingRequest.status === "rejected"
                      ? "bg-rose-500 text-white"
                      : "bg-amber-500 text-white animate-pulse"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {existingRequest.status === "approved"
                      ? "check"
                      : existingRequest.status === "rejected"
                      ? "close"
                      : "hourglass_top"}
                  </span>
                </div>
                <div
                  className={`text-xs font-bold ${
                    existingRequest.status === "approved"
                      ? "text-emerald-800"
                      : existingRequest.status === "rejected"
                      ? "text-rose-800"
                      : "text-amber-800"
                  }`}
                >
                  {existingRequest.status === "approved"
                    ? "ตรวจสอบผ่าน"
                    : existingRequest.status === "rejected"
                    ? "ไม่ผ่านการอนุมัติ"
                    : "รอเจ้าหน้าที่ตรวจสอบ"}
                </div>
                <div className="text-[10px] text-on-surface-variant hidden sm:block">
                  {existingRequest.status === "approved"
                    ? "ยืนยันความถูกต้องแล้ว"
                    : existingRequest.status === "rejected"
                    ? "ข้อมูลไม่สอดคล้อง"
                    : "ระยะเวลา 1-2 วันทำการ"}
                </div>
              </div>

              {/* Step 3: Student Activated */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${
                    existingRequest.status === "approved"
                      ? "bg-emerald-500 text-white"
                      : "bg-surface-container-high text-on-surface-variant/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">school</span>
                </div>
                <div
                  className={`text-xs font-bold ${
                    existingRequest.status === "approved"
                      ? "text-emerald-800"
                      : "text-on-surface-variant/60"
                  }`}
                >
                  สิทธิ์นักศึกษา
                </div>
                <div className="text-[10px] text-on-surface-variant hidden sm:block">
                  {existingRequest.status === "approved" ? "เปิดใช้งานสมบูรณ์" : "ปลดล็อกฟีเจอร์รีวิว"}
                </div>
              </div>
            </div>
          </div>

          {/* ================= CASE 1: REJECTED STATE ================= */}
          {existingRequest.status === "rejected" && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">cancel</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-rose-900">
                    คำขอตรวจสอบสิทธิ์นักศึกษาไม่ผ่านการอนุมัติ
                  </h3>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    เจ้าหน้าที่ได้ตรวจสอบข้อมูลแล้วพบข้อขัดข้อง กรุณาตรวจสอบเหตุผลด้านล่าง และสามารถกดปุ่มยื่นคำขอใหม่เพื่อส่งข้อมูลที่ถูกต้องได้ทันที
                  </p>
                </div>
              </div>

              {/* Reason Box */}
              <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs space-y-1">
                <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">info</span>
                  สาเหตุที่ไม่อนุมัติจากเจ้าหน้าที่:
                </div>
                <p className="text-xs text-slate-800 font-medium leading-relaxed pl-5">
                  {existingRequest.rejection_reason || "ข้อมูลรหัสนักศึกษาหรือรูปภาพหลักฐานไม่ชัดเจน หรือไม่ตรงกับข้อมูลในระบบวิทยาลัย"}
                </p>
              </div>

              {/* Big Prominent Resubmit Button */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98"
                >
                  <span className="material-symbols-outlined text-[18px]">replay</span>
                  <span>ยื่นคำขอใหม่อีกครั้ง (แก้ไขและส่งใหม่)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-3 bg-white hover:bg-rose-100/50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>ลบประวัติคำขอนี้</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= CASE 2: PENDING STATE ================= */}
          {existingRequest.status === "pending" && (
            <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-4 shadow-xs">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-amber-900">
                        คำขอของคุณอยู่ระหว่างการตรวจสอบ (Pending)
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        กำลังตรวจสอบ
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      เจ้าหน้าที่งานทวิภาคี / แอดมินกำลังตรวจสอบข้อมูลรหัสนักศึกษาและรูปภาพหลักฐาน โดยปกติจะใช้เวลา 1-2 วันทำการ
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-700">edit</span>
                  แก้ไขข้อมูลคำขอ
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  ยกเลิกคำขอ
                </button>
              </div>
            </div>
          )}

          {/* ================= CASE 3: APPROVED STATE ================= */}
          {existingRequest.status === "approved" && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-emerald-900">
                    อนุมัติสิทธิ์นักศึกษา วท.หาดใหญ่ เรียบร้อยแล้ว
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    บัญชีของคุณได้รับการยืนยันตัวตนเรียบร้อย สามารถเขียนรีวิวสถานที่ฝึกงาน ตั้งกระทู้ และร่วมแบ่งปันประสบการณ์ในคอมมูนิตี้ได้อย่างเต็มที่
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/insights"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">rate_review</span>
                  ค้นหาบริษัทและเขียนรีวิว
                </Link>

                <Link
                  href="/community"
                  className="px-5 py-2.5 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">forum</span>
                  ไปยังคอมมูนิตี้
                </Link>
              </div>
            </div>
          )}

          {/* Details Summary Grid */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-secondary">description</span>
              ข้อมูลคำขอที่บันทึกไว้ในระบบ
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-medium">
              <div className="bg-surface-container-low/60 p-3 rounded-2xl border border-outline-variant/40 space-y-0.5">
                <div className="text-[10px] font-bold text-on-surface-variant">รหัสนักศึกษา</div>
                <div className="text-sm font-mono font-bold text-primary">{existingRequest.student_id}</div>
              </div>

              <div className="bg-surface-container-low/60 p-3 rounded-2xl border border-outline-variant/40 space-y-0.5">
                <div className="text-[10px] font-bold text-on-surface-variant">แผนกวิชา</div>
                <div className="text-xs font-bold text-primary truncate" title={existingRequest.department}>
                  {existingRequest.department}
                </div>
              </div>

              <div className="bg-surface-container-low/60 p-3 rounded-2xl border border-outline-variant/40 space-y-0.5">
                <div className="text-[10px] font-bold text-on-surface-variant">เบอร์โทรศัพท์ติดต่อ</div>
                <div className="text-xs font-bold text-primary">{existingRequest.phone || "-"}</div>
              </div>

              <div className="bg-surface-container-low/60 p-3 rounded-2xl border border-outline-variant/40 space-y-0.5">
                <div className="text-[10px] font-bold text-on-surface-variant">วันที่ส่งคำร้อง</div>
                <div className="text-xs font-bold text-primary">
                  {existingRequest.created_at
                    ? new Date(existingRequest.created_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </div>
              </div>
            </div>

            {/* Reason text */}
            {existingRequest.reason && (
              <div className="bg-surface-container-low/60 p-3.5 rounded-2xl border border-outline-variant/40 space-y-1">
                <div className="text-[10px] font-bold text-on-surface-variant">เหตุผลเพิ่มเติมที่ระบุไว้</div>
                <div className="text-xs text-on-surface-variant leading-relaxed">{existingRequest.reason}</div>
              </div>
            )}

            {/* Proof Card Image */}
            {existingRequest.card_image_url && (
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                  หลักฐานบัตรประจำตัวนักศึกษาที่แนบไว้:
                </div>
                <div className="relative inline-block group rounded-2xl overflow-hidden border border-outline-variant/60 shadow-xs">
                  <img
                    src={existingRequest.card_image_url}
                    alt="Student ID Card Proof"
                    className="max-h-44 rounded-2xl object-cover cursor-pointer group-hover:opacity-90 transition-opacity"
                    onClick={() => setImageModalUrl(existingRequest.card_image_url || null)}
                  />
                  <button
                    type="button"
                    onClick={() => setImageModalUrl(existingRequest.card_image_url || null)}
                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-xs font-bold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                    คลิกเพื่อดูรูปภาพขนาดเต็ม
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= SECTION 2: CREATE / EDIT FORM ================= */
        <div className="bg-white border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-outline-variant/40">
            <div>
              <h2 className="text-lg font-bold text-primary">
                {isEditing ? "แก้ไขคำขอยืนยันสิทธิ์นักศึกษา" : "กรอกข้อมูลคำขอยืนยันสิทธิ์"}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {isEditing
                  ? "แก้ไขข้อมูลหรืออัปโหลดรูปภาพบัตรใหม่ แล้วกดส่งเพื่อยืนยันอีกครั้ง"
                  : "กรุณากรอกข้อมูลให้ครบถ้วนเพื่อความรวดเร็วในการตรวจสอบ"}
              </p>
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3.5 py-1.5 border border-outline-variant/60 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
                ยกเลิกการแก้ไข
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">ชื่อบัญชีของคุณ</label>
              <input
                type="text"
                disabled
                value={user?.name || "ผู้ใช้งาน"}
                className="w-full px-4 py-2.5 bg-surface-container-low/60 border border-outline-variant/40 rounded-xl text-xs text-on-surface-variant cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">อีเมลที่เข้าสู่ระบบ</label>
              <input
                type="text"
                disabled
                value={user?.email || "-"}
                className="w-full px-4 py-2.5 bg-surface-container-low/60 border border-outline-variant/40 rounded-xl text-xs text-on-surface-variant cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                รหัสนักศึกษา / รหัสประจำตัว <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={11}
                placeholder="เช่น 67xxxxxxxx (11 หลัก)"
                value={studentId}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/\D/g, "").slice(0, 11);
                  setStudentId(filtered);
                }}
                className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                แผนกวิชา / สาขาวิชา <span className="text-rose-500">*</span>
              </label>
              <DepartmentDropdown value={department} onChange={(val) => setDepartment(val)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                ระดับชั้น <span className="text-rose-500">*</span>
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                <option value="pvc">ระดับประกาศนียบัตรวิชาชีพ (ปวช.)</option>
                <option value="pvs">ระดับประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)</option>
                <option value="btech">ระดับปริญญาตรี (หลักสูตรเทคโนโลยีบัณฑิต - ทล.บ.)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                เบอร์โทรศัพท์ติดต่อ (สำหรับประสานงาน)
              </label>
              <input
                type="tel"
                maxLength={12}
                placeholder="เช่น 000-000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5">
                ภาพหลักฐานบัตรประจำตัวนักศึกษา <span className="text-rose-500">*</span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setCardFile(file);
                  if (file) {
                    setStatusMsg(null);
                  }
                }}
              />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-surface-container border border-outline-variant hover:border-purple-500 hover:bg-purple-50 text-primary font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-purple-600">upload_file</span>
                    {cardFile || cardPreviewUrl ? "เปลี่ยนรูปภาพ (Change Photo)" : "เลือกไฟล์รูปภาพ (Choose File)"}
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
                        title="ลบไฟล์ที่เลือก"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                        ลบ
                      </button>
                    </div>
                  ) : cardPreviewUrl ? (
                    <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-3 py-2 rounded-xl text-xs text-purple-900 font-medium">
                      <span className="material-symbols-outlined text-[15px] text-purple-600">check</span>
                      <span>มีรูปภาพเดิมที่เคยแนบไว้แล้ว</span>
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface-variant">ยังไม่ได้เลือกไฟล์ภาพ</span>
                  )}
                </div>

                {/* Existing Preview Thumbnail in Edit Mode */}
                {!cardFile && cardPreviewUrl && (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-outline-variant/60">
                    <img src={cardPreviewUrl} alt="Existing Proof Preview" className="h-28 object-cover rounded-xl" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">เหตุผลเพิ่มเติม</label>
              <textarea
                rows={3}
                placeholder="ระบุเหตุผล เช่น เป็นศิษย์เก่า ปวส.2 ปีการศึกษา 2566 หรือ ใช้อีเมลส่วนตัวสมัคร"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2.5 border border-outline-variant rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isEditing ? "save" : "send"}
                </span>
                {submitting
                  ? "กำลังบันทึกข้อมูล..."
                  : isEditing
                  ? "บันทึกและส่งคำขอใหม่"
                  : "ส่งคำขอยืนยันสิทธิ์นักศึกษา"}
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3 border border-outline-variant rounded-xl text-xs sm:text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: FULL IMAGE VIEWER ================= */}
      {imageModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setImageModalUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-3xl p-2 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setImageModalUrl(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <img
              src={imageModalUrl}
              alt="Full Size Proof Card"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-outline-variant/60 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mx-auto">
              <span className="material-symbols-outlined text-[28px]">delete_forever</span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-primary">ยืนยันการลบคำขอยืนยันสิทธิ์?</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                คำขอนี้จะถูกลบออกจากระบบ และเจ้าหน้าที่จะไม่สามารถตรวจสอบคำขอนี้ได้อีก หากต้องการยืนยันสิทธิ์ใหม่อีกครั้ง สามารถยื่นคำขอใหม่ได้ตลอดเวลา
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 border border-outline-variant rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteRequest}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs"
              >
                {deleteLoading ? "กำลังลบ..." : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

