"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RejectReasonModal from "@/components/RejectReasonModal";
import RevealAnonymousModal from "@/components/RevealAnonymousModal";
import Pagination from "@/components/Pagination";
import ImageLightboxModal from "@/components/ImageLightboxModal";

export default function AdminReviewModerationPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalItem, setRejectModalItem] = useState<{ id: number; title: string } | null>(null);
  const [revealTargetId, setRevealTargetId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
  }>({
    isOpen: false,
    images: [],
    index: 0,
  });

  const fetchPending = () => {
    setLoading(true);
    setCurrentPage(1);
    api
      .get("/admin/reviews/pending")
      .then((res) => setPendingReviews(res.data))
      .catch(() => setMsg({ text: "ไม่สามารถโหลดข้อมูลรีวิวได้", isError: true }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin()) {
      window.location.replace("/");
      return;
    }
    setAuthorized(true);
    fetchPending();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/admin/reviews/${id}/approve`);
      setMsg({ text: "อนุมัติรีวิวเรียบร้อยแล้ว" });
      fetchPending();
    } catch (err: any) {
      setMsg({ text: "เกิดข้อผิดพลาดในการอนุมัติ", isError: true });
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectModalItem) return;
    setRejecting(true);
    try {
      await api.patch(`/admin/reviews/${rejectModalItem.id}`, {
        status: "rejected",
        rejection_reason: reason,
      });
      setMsg({ text: "ปฏิเสธรีวิวเรียบร้อยแล้ว" });
      setRejectModalItem(null);
      fetchPending();
    } catch (err: any) {
      setMsg({ text: err?.response?.data?.detail || "เกิดข้อผิดพลาดในการปฏิเสธ", isError: true });
    } finally {
      setRejecting(false);
    }
  };

  if (!authorized) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin" className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-medium">
          <span className="material-symbols-outlined text-base">arrow_back</span> กลับ Admin Center
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-headline text-gray-900 mb-1">Review Moderation (คำขออนุมัติรีวิว)</h1>
        <p className="text-sm text-gray-500">ผู้ดูแลระบบสามารถตรวจสอบเนื้อหา รูปภาพ และตัวตนก่อนเผยแพร่สู่สาธารณะ</p>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl mb-6 text-sm flex items-center justify-between ${msg.isError ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="bg-white border p-8 text-center text-sm text-gray-500 rounded-xl">
            กำลังโหลดรายการรีวิว...
          </div>
        ) : pendingReviews.length === 0 ? (
          <div className="bg-white border p-12 text-center text-sm text-gray-500 rounded-xl flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">rate_review</span>
            <p className="font-semibold text-gray-700">ไม่มีรีวิวที่รออนุมัติในขณะนี้</p>
          </div>
        ) : (
          pendingReviews.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{r.company_name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>แผนก: {r.department || "ไม่ระบุ"}</span>
                    <span>•</span>
                    <span>โดย: {r.is_anonymous ? <span className="text-amber-600 font-semibold">ไม่เปิดเผยตัวตน (Anonymous)</span> : r.real_author}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <span className="material-symbols-outlined text-sm">star</span>
                    {r.score_overall} / 5
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{r.created_at}</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-700 space-y-2 border border-gray-100">
                <p><strong>ลักษณะงาน:</strong> {r.text_work}</p>
                {r.text_pros && <p className="text-emerald-700"><strong>ข้อดี:</strong> {r.text_pros}</p>}
                {r.text_cons && <p className="text-rose-700"><strong>ข้อเสีย:</strong> {r.text_cons}</p>}
                {r.text_advice && <p className="text-blue-700"><strong>คำแนะนำ:</strong> {r.text_advice}</p>}
              </div>

              {r.photo_urls && r.photo_urls.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-gray-500">photo_library</span>
                    รูปภาพแนบ ({r.photo_urls.length} รูป - คลิกเพื่อดูภาพขยาย):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {r.photo_urls.map((url: string, idx: number) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setLightbox({ isOpen: true, images: r.photo_urls, index: idx })}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200 hover:border-gray-400 hover:scale-105 transition-all shadow-xs group relative cursor-pointer"
                      >
                        <img src={url} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-white text-[18px] opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                            zoom_in
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                {r.is_anonymous ? (
                  <button
                    onClick={() => setRevealTargetId(r.id)}
                    className="text-xs text-amber-800 font-bold underline hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">lock_open</span>
                    Unlock Identity (Audit Logged)
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    onClick={() => setRejectModalItem({ id: r.id, title: `รีวิว ${r.company_name} โดย ${r.real_author}` })}
                    className="px-4 py-2 border border-rose-300 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    ปฏิเสธรีวิว
                  </button>
                  <button
                    onClick={() => handleApprove(r.id)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    อนุมัติรีวิว
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {pendingReviews.length > pageSize && (
          <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-2xl shadow-sm">
            <span className="text-xs text-gray-500">
              แสดง {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, pendingReviews.length)} จาก {pendingReviews.length} รายการ
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(pendingReviews.length / pageSize) || 1}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {rejectModalItem && (
        <RejectReasonModal
          isOpen={!!rejectModalItem}
          title="ปฏิเสธการเผยแพร่รีวิว"
          itemTitle={rejectModalItem.title}
          loading={rejecting}
          onClose={() => setRejectModalItem(null)}
          onConfirm={handleConfirmReject}
        />
      )}

      {/* Reveal Anonymous Modal */}
      <RevealAnonymousModal
        isOpen={!!revealTargetId}
        reviewId={revealTargetId}
        onClose={() => setRevealTargetId(null)}
      />

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        isOpen={lightbox.isOpen}
        images={lightbox.images}
        initialIndex={lightbox.index}
        onClose={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
