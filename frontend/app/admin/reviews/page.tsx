"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RejectReasonModal from "@/components/RejectReasonModal";
import RevealAnonymousModal from "@/components/RevealAnonymousModal";

export default function AdminReviewModerationPage() {
  const router = useRouter();
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalItem, setRejectModalItem] = useState<{ id: number; title: string } | null>(null);
  const [revealTargetId, setRevealTargetId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    if (!isAdmin()) {
      router.push("/auth/login");
      return;
    }
    fetchPending();
  }, [router]);

  const fetchPending = () => {
    setLoading(true);
    api
      .get("/admin/reviews/pending")
      .then((res) => setPendingReviews(res.data))
      .catch(() => setMsg({ text: "ไม่สามารถโหลดข้อมูลรีวิวได้", isError: true }))
      .finally(() => setLoading(false));
  };

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
          pendingReviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-base text-gray-900">{r.company_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    ผู้เขียนจริง (Admin Only): <span className="font-semibold text-gray-800">{r.real_author}</span> ({r.real_email})
                    {r.is_anonymous && <span className="ml-2 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">[โหมดไม่ระบุตัวตน]</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-secondary-container/20 border border-secondary/30 px-2.5 py-1 rounded-lg text-secondary font-bold text-sm">
                  <span className="material-symbols-outlined text-[16px] text-secondary active-tab">star</span>
                  {r.score_overall}
                </div>
              </div>

              <p className="text-xs text-gray-700 mb-4 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                {r.text_work}
              </p>

              {r.photo_urls && r.photo_urls.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {r.photo_urls.map((url: string, idx: number) => (
                    <img key={idx} src={url} alt="Review photo" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                  ))}
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
    </div>
  );
}
