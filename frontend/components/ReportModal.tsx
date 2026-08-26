"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface ReportModalProps {
  isOpen: boolean;
  title: string;
  targetType: "review" | "post" | "comment" | "job" | "company";
  targetId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS = [
  "เนื้อหาไม่เหมาะสม / ลามกอนาจาร",
  "สแปม / โฆษณาชวนเชื่อ",
  "ข้อมูลเท็จ / หลอกลวง",
  "การคุกคาม / ความเกลียดชัง",
  "อื่นๆ",
];

export default function ReportModal({
  isOpen,
  title,
  targetType,
  targetId,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedReason("");
      setDetails("");
      setSubmitting(false);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      setErrorMessage("กรุณาเลือกเหตุผลในการรายงาน");
      return;
    }

    if (selectedReason === "อื่นๆ" && !details.trim()) {
      setErrorMessage("กรุณาระบุรายละเอียดเพิ่มเติมสำหรับเหตุผลอื่นๆ");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const targetFieldMap: Record<"review" | "post" | "comment" | "job" | "company", string> = {
      review: "review_id",
      post: "post_id",
      comment: "comment_id",
      job: "job_id",
      company: "company_id",
    };

    const targetField = targetFieldMap[targetType];
    const finalReason =
      selectedReason === "อื่นๆ"
        ? details.trim()
        : details.trim()
        ? `${selectedReason}: ${details.trim()}`
        : selectedReason;

    const payload = {
      [targetField]: targetId,
      reason: finalReason,
    };

    try {
      await api.post("/reports", payload);
      setSuccessMessage("ส่งรายงานเรียบร้อยแล้ว ขอบคุณสำหรับการแจ้งเบาะแส");
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        "เกิดข้อผิดพลาดในการส่งรายงาน กรุณาลองใหม่อีกครั้ง";
      setErrorMessage(typeof msg === "string" ? msg : "เกิดข้อผิดพลาดในการส่งรายงาน");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[28px]">flag</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 font-headline">{title}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              โปรดเลือกเหตุผลที่รายงานเนื้อหานี้เพื่อให้ทีมงานตรวจสอบ
            </p>
          </div>
        </div>

        {/* Success Message View */}
        {successMessage ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
            <span className="material-symbols-outlined text-emerald-600 text-[24px]">
              check_circle
            </span>
            <p className="text-xs font-bold">{successMessage}</p>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Standard Reasons */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เหตุผลในการรายงาน <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-xs font-medium ${
                      selectedReason === reason
                        ? "border-amber-500 bg-amber-50/50 text-slate-900 font-semibold"
                        : "border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => {
                        setSelectedReason(reason);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  รายละเอียดเพิ่มเติม {selectedReason === "อื่นๆ" ? <span className="text-rose-500">*</span> : "(ไม่บังคับ)"}
                </label>
                <span className="text-[10px] text-slate-400 font-medium">{details.length}/300</span>
              </div>
              <textarea
                value={details}
                maxLength={300}
                onChange={(e) => {
                  setDetails(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="อธิบายรายละเอียดเพิ่มเติมเกี่ยวกับรายงานนี้ (สูงสุด 300 ตัวอักษร)..."
                rows={3}
                disabled={submitting}
                className="w-full p-3 text-xs rounded-2xl border border-slate-200 focus:border-amber-500 focus:ring-amber-500 outline-none focus:ring-2 transition-all resize-none text-slate-800 font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={
                  !selectedReason ||
                  (selectedReason === "อื่นๆ" && !details.trim()) ||
                  submitting
                }
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && (
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                )}
                ส่งรายงาน
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
