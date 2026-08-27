"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface RevealAnonymousModalProps {
  isOpen: boolean;
  reviewId: number | null;
  onClose: () => void;
}

interface RevealData {
  real_name: string;
  real_email: string;
  real_department?: string;
  real_level?: string;
  revealed_at?: string;
}

export default function RevealAnonymousModal({
  isOpen,
  reviewId,
  onClose,
}: RevealAnonymousModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RevealData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
      setResult(null);
      setCopied(false);
    }
  }, [isOpen, reviewId]);

  if (!isOpen || !reviewId) return null;

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("กรุณาระบุเหตุผลการถอดรหัสตัวตนจริง");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/admin/anonymous-reveal/${reviewId}?reason=${encodeURIComponent(reason.trim())}`
      );
      setResult(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "เกิดข้อผิดพลาดในการถอดรหัสตัวตนจริง"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `ชื่อ: ${result.real_name} | อีเมล: ${result.real_email}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface border border-outline-variant rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-[24px]">lock_open</span>
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-primary font-headline">
                ถอดรหัสตัวตนจริง (Reveal)
              </h3>
              <p className="text-xs text-on-surface-variant font-medium">
                รีวิว ID #{reviewId} (Anonymous)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary p-1.5 rounded-full hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {!result ? (
          <form onSubmit={handleReveal} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs leading-relaxed flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-700 text-[18px] shrink-0 mt-0.5">
                security
              </span>
              <span>
                <strong>นโยบายความปลอดภัย:</strong> การเข้าถึงข้อมูลตัวตนจริงของผู้โพสต์แบบ Anonymous จะถูกบันทึกลง <strong>Audit Log</strong> พร้อมระบุชื่อ Admin และเหตุผลที่ระบุไว้
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
                เหตุผลในการตรวจสอบตัวตน <span className="text-error">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="เช่น ได้รับแจ้งรายงานเนื้อหาไม่เหมาะสม / ตรวจสอบความถูกต้องของข้อมูล..."
                className="w-full p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs focus:outline-none focus:border-primary focus:bg-surface transition-all leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-xs hover:bg-surface-container transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading || !reason.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    กำลังถอดรหัส...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      visibility
                    </span>
                    ตรวจสอบตัวตน
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                verified_user
              </span>
              <span>ถอดรหัสสำเร็จ และบันทึกเข้า Audit Log เรียบร้อยแล้ว</span>
            </div>

            {/* Revealed Identity Card */}
            <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  ข้อมูลตัวตนจริง
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copied ? "check" : "content_copy"}
                  </span>
                  {copied ? "คัดลอกแล้ว!" : "คัดลอก"}
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1 border-b border-outline-variant/20">
                  <span className="text-on-surface-variant font-medium">ชื่อ-นามสกุล:</span>
                  <span className="font-bold text-primary">{result.real_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-outline-variant/20">
                  <span className="text-on-surface-variant font-medium">อีเมล:</span>
                  <span className="font-bold text-primary font-mono">{result.real_email}</span>
                </div>
                {result.real_department && (
                  <div className="flex justify-between py-1 border-b border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">แผนกวิชา:</span>
                    <span className="font-bold text-primary">{result.real_department}</span>
                  </div>
                )}
                {result.real_level && (
                  <div className="flex justify-between py-1">
                    <span className="text-on-surface-variant font-medium">ระดับชั้น:</span>
                    <span className="font-bold text-primary">{result.real_level}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
