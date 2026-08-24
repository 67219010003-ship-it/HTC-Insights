"use client";

import { useState, useEffect } from "react";

export interface RejectReasonModalProps {
  isOpen: boolean;
  title: string;
  itemTitle?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  loading?: boolean;
}

export default function RejectReasonModal({
  isOpen,
  title,
  itemTitle,
  onClose,
  onConfirm,
  loading = false,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError(true);
      return;
    }
    setError(false);
    await onConfirm(trimmedReason);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="bg-white border border-rose-100 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[28px]">block</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 font-headline">{title}</h3>
            {itemTitle && (
              <div className="mt-1.5 px-3 py-1 bg-rose-50/80 border border-rose-100 rounded-xl text-xs font-semibold text-rose-800 truncate">
                {itemTitle}
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                เหตุผลในการปฏิเสธ <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">{reason.length}/300</span>
            </div>
            <textarea
              value={reason}
              maxLength={300}
              onChange={(e) => {
                setReason(e.target.value);
                if (error && e.target.value.trim()) setError(false);
              }}
              placeholder="ระบุเหตุผลในการปฏิเสธ เพื่อแจ้งให้ผู้ใช้ทราบ (สูงสุด 300 ตัวอักษร)..."
              rows={4}
              disabled={loading}
              autoFocus
              className={`w-full p-3.5 text-xs rounded-2xl border ${
                error
                  ? "border-rose-400 focus:ring-rose-500 bg-rose-50/30"
                  : "border-slate-200 focus:border-rose-500 focus:ring-rose-500"
              } outline-none focus:ring-2 transition-all resize-none text-slate-800 font-medium placeholder:text-slate-400`}
            />
            {error && (
              <p className="mt-1 text-[11px] font-bold text-rose-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">error</span>
                กรุณาระบุเหตุผลในการปฏิเสธ
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || loading}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && (
                <span className="material-symbols-outlined text-[16px] animate-spin">
                  progress_activity
                </span>
              )}
              ยืนยันการปฏิเสธ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
