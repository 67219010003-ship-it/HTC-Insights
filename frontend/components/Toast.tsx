"use client";

import { useEffect } from "react";

interface ToastProps {
  isOpen: boolean;
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  isOpen,
  message,
  type = "success",
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const typeConfig = {
    success: {
      icon: "check_circle",
      bg: "bg-slate-900 text-white border-emerald-500/40",
      iconColor: "text-emerald-400",
    },
    error: {
      icon: "error",
      bg: "bg-slate-900 text-white border-rose-500/40",
      iconColor: "text-rose-400",
    },
    info: {
      icon: "info",
      bg: "bg-slate-900 text-white border-sky-500/40",
      iconColor: "text-sky-400",
    },
  }[type];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md ${typeConfig.bg}`}>
        <span className={`material-symbols-outlined text-[22px] ${typeConfig.iconColor}`}>
          {typeConfig.icon}
        </span>
        <span className="text-xs font-bold font-body-md tracking-wide">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
