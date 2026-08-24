"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { isStudent, getToken, clearToken } from "@/lib/auth";
import Link from "next/link";

import ConfirmModal from "@/components/ConfirmModal";
import Toast from "@/components/Toast";

export default function StudentProfilePage() {
  const [userProfile, setUserProfile] = useState<{
    id: number;
    email: string;
    name: string;
    avatar_url: string;
    role: string;
  } | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Custom Modal & Toast States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "danger" | "warning" | "info";
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "ยืนยัน",
    onConfirm: () => {},
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });

  useEffect(() => {
    if (!getToken()) return;

    // Fetch real Google user profile from /auth/me
    api
      .get("/auth/me")
      .then((res) => {
        setUserProfile(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (isStudent()) {
      api.get("/reviews/my").then((res) => setReviews(res.data)).catch(() => {});
    }
  }, []);

  const promptDeleteAccount = () => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบบัญชีผู้ใช้",
      message: "คำเตือน: ข้อมูลบัญชีและสิทธิ์การใช้งานของคุณจะถูกนำออกจากระบบถาวร ไม่สามารถกู้คืนกลับมาได้",
      type: "danger",
      confirmText: "ยืนยันลบบัญชี",
      onConfirm: executeDeleteAccount,
    });
  };

  const executeDeleteAccount = async () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    try {
      setDeleteLoading(true);
      await api.delete("/auth/me");
      clearToken();
      window.location.href = "/";
    } catch (err) {
      setToast({ isOpen: true, message: "เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้", type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const promptDeleteReview = (reviewId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบรีวิว",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้ออกจากระบบ? ข้อมูลประสบการณ์จะถูกลบถาวร",
      type: "danger",
      confirmText: "ยืนยันลบรีวิว",
      onConfirm: () => executeDeleteReview(reviewId),
    });
  };

  const executeDeleteReview = async (reviewId: number) => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setToast({ isOpen: true, message: "ลบรีวิวเรียบร้อยแล้ว", type: "success" });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการลบรีวิว", type: "error" });
    }
  };

  const promptEditReview = (review: any) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการแก้ไขรีวิว",
      message: "หากทำการแก้ไขรีวิว ข้อมูลจะถูกปรับสถานะเป็น 'รอการอนุมัติใหม่' จากผู้ดูแลระบบ (Admin) ยืนยันที่จะดำเนินการหรือไม่?",
      type: "warning",
      confirmText: "ดำเนินการแก้ไข",
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        window.location.href = `/insights/write-review?company_id=${review.company_id}&review_id=${review.id}`;
      },
    });
  };

  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Profile Header & Info Card */}
      <div className="bg-white border border-outline-variant rounded-3xl p-6 md:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          {/* Google Profile Avatar */}
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-secondary/30 shadow-md shrink-0">
            <img
              src={userProfile?.avatar_url || defaultAvatar}
              alt={userProfile?.name || "Google Account Profile"}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = defaultAvatar;
              }}
            />
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-bold text-primary font-headline truncate">
                {userProfile?.name || (isStudent() ? "นักศึกษาวิทยาลัยเทคนิคหาดใหญ่" : "ผู้ใช้ภายนอก")}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full font-bold">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                {isStudent() ? "HTC Student" : "External Account"}
              </span>
            </div>
            <p className="text-body-sm text-body-sm text-on-surface-variant font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">mail</span>
              {userProfile?.email || "กำลังโหลดข้อมูล..."}
            </p>
          </div>

          {/* Delete Account Button on Top Right (Desktop) */}
          <div className="shrink-0 mt-4 sm:mt-0">
            <button
              onClick={promptDeleteAccount}
              disabled={deleteLoading}
              className="px-4 py-2 border border-error text-error font-bold rounded-xl text-xs hover:bg-error/10 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              {deleteLoading ? "กำลังลบ..." : "ลบบัญชีผู้ใช้"}
            </button>
          </div>
        </div>

        {/* Profile Statistics (Student only) */}
        {isStudent() ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface-container-low p-4 rounded-2xl text-center border border-outline-variant/60 mt-6">
            <div>
              <div className="text-2xl font-bold text-primary">{reviews.length}</div>
              <div className="text-xs font-bold text-on-surface-variant">รีวิวที่ส่งทั้งหมด</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary">
                {reviews.filter((r) => r.status === "approved").length}
              </div>
              <div className="text-xs font-bold text-on-surface-variant">อนุมัติแล้ว</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">
                {reviews.filter((r) => r.status === "pending").length}
              </div>
              <div className="text-xs font-bold text-on-surface-variant">รอการตรวจสอบ</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">Active</div>
              <div className="text-xs font-bold text-on-surface-variant">สถานะบัญชี Google</div>
            </div>
          </div>
        ) : (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">school</span>
              </div>
              <div>
                <h4 className="font-bold text-primary text-sm">คุณใช้อีเมลส่วนตัว</h4>
                <p className="text-xs text-on-surface-variant">หากเป็นนักศึกษา วท.หาดใหญ่ สามารถยื่นบัตรนักศึกษาเพื่อเปิดสิทธิ์การใช้งานของนักศึกษาได้</p>
              </div>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-opacity-95 shrink-0"
            >
              ยื่นคำขอสิทธิ์นักศึกษาที่หน้าหลัก
            </Link>
          </div>
        )}
      </div>

      {/* Review History Header & Add Review CTA (Student only) */}
      {isStudent() && (
        <>
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-lg font-bold text-primary font-headline">ประวัติการเขียนรีวิวของคุณ</h2>
            <Link
              href="/insights/write-review"
              className="text-xs bg-secondary text-white px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-opacity shadow-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">rate_review</span>
              + เขียนรีวิวใหม่
            </Link>
          </div>

      {/* Review History Cards */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white border border-outline-variant rounded-3xl p-8 text-center space-y-2 shadow-sm">
            <span className="material-symbols-outlined text-[40px] text-outline">rate_review</span>
            <p className="text-sm font-bold text-primary">คุณยังไม่มีประวัติการเขียนรีวิว</p>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              มาร่วมแบ่งปันประสบการณ์การฝึกงานเพื่อช่วยแนะนำรุ่นน้องวิทยาลัยเทคนิคหาดใหญ่กันครับ
            </p>
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="bg-white border border-outline-variant rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      r.status === "approved"
                        ? "bg-emerald-100 text-emerald-800"
                        : r.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {r.status === "approved" ? "✓ อนุมัติแล้ว" : r.status === "pending" ? "⏳ รอตรวจสอบ" : "✕ ไม่ผ่าน"}
                  </span>
                  {r.is_anonymous && (
                    <span className="bg-surface-container-high px-2.5 py-0.5 rounded-full text-xs font-semibold text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                      โหมดไม่ระบุตัวตน
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-outline mr-2">{r.created_at}</span>
                  <button
                    type="button"
                    onClick={() => promptEditReview(r)}
                    className="text-xs text-secondary hover:bg-secondary/10 font-bold border border-secondary/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                    title="แก้ไขรีวิว"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => promptDeleteReview(r.id)}
                    className="text-xs text-rose-600 hover:bg-rose-100 font-bold border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                    title="ลบรีวิว"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    ลบ
                  </button>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant line-clamp-3 leading-relaxed pt-1">
                {r.text_work}
              </p>
            </div>
          ))
        )}
      </div>
      </>
      )}

      {/* Custom Reusable Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        loading={deleteLoading}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Custom Floating Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
