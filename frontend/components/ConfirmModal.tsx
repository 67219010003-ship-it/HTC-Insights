"use client";

import { useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: "danger" | "warning" | "info";
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  type = "warning",
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
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

  const typeConfig = {
    danger: {
      icon: "delete_forever",
      iconBg: "bg-rose-100 text-rose-600",
      confirmBg: "bg-rose-600 text-white hover:bg-rose-700",
    },
    warning: {
      icon: "warning",
      iconBg: "bg-amber-100 text-amber-600",
      confirmBg: "bg-amber-600 text-white hover:bg-amber-700",
    },
    info: {
      icon: "info",
      iconBg: "bg-sky-100 text-secondary",
      confirmBg: "bg-secondary text-white hover:bg-secondary/90",
    },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-outline-variant rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${typeConfig.iconBg}`}>
            <span className="material-symbols-outlined text-[28px]">{typeConfig.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-primary font-headline">{title}</h3>
            <p className="text-xs text-on-surface-variant font-medium mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/60">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-xs hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${typeConfig.confirmBg}`}
          >
            {loading && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
