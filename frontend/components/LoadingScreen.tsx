"use client";

import React from "react";

export interface LoadingScreenProps {
  /** ข้อความหลักที่ต้องการแสดง เช่น กำลังโหลดข้อมูล... */
  message?: string;
  /** ข้อความย่อยหรือคำอธิบายเพิ่มเติม */
  subMessage?: string;
  /** แสดงผลแบบเต็มจอ Fixed Overlay (เช่น ในระหว่างกระบวนการสำคัญ) หรือไม่ */
  fullScreen?: boolean;
  /** ความสูงขั้นต่ำเมื่อแสดงผลแบบฝังในหน้าเว็บ (ค่าเริ่มต้น min-h-[60vh]) */
  minHeight?: string;
  /** ปรับขนาด (sm, md, lg) */
  size?: "sm" | "md" | "lg";
  /** แสดงแถบเส้นความคืบหน้าแบบ indeterminate */
  showProgress?: boolean;
  /** คลาส Tailwind เพิ่มเติม */
  className?: string;
}

export default function LoadingScreen({
  message = "กำลังโหลดข้อมูลระบบ...",
  subMessage = "HTC Insights • ระบบฐานข้อมูลฝึกงาน วิทยาลัยเทคนิคหาดใหญ่",
  fullScreen = false,
  minHeight = "min-h-[65vh]",
  size = "md",
  showProgress = true,
  className = "",
}: LoadingScreenProps) {
  const containerBase = fullScreen
    ? "fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
    : `w-full flex items-center justify-center p-6 ${minHeight}`;

  const iconSizes = {
    sm: {
      outer: "w-16 h-16",
      logo: "w-8 h-8",
      title: "text-sm",
      sub: "text-xs",
      bar: "w-40",
    },
    md: {
      outer: "w-24 h-24",
      logo: "w-12 h-12",
      title: "text-base sm:text-lg",
      sub: "text-xs sm:text-sm",
      bar: "w-52 sm:w-64",
    },
    lg: {
      outer: "w-28 h-28",
      logo: "w-16 h-16",
      title: "text-lg sm:text-xl",
      sub: "text-sm sm:text-base",
      bar: "w-64 sm:w-80",
    },
  }[size];

  return (
    <div
      className={`${containerBase} ${className} transition-all duration-300 animate-in fade-in select-none`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="relative flex flex-col items-center text-center max-w-md w-full">
        {/* Decorative Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-secondary/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Central Logo with Animated Rings */}
        <div className={`relative ${iconSizes.outer} flex items-center justify-center mb-5`}>
          {/* Outer Pulse Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-secondary/25 animate-ping opacity-25" />

          {/* Dual-tone Spinning Orbit Track */}
          <div className="absolute inset-0 rounded-full border-3 border-outline-variant/30 border-t-secondary border-r-secondary animate-spin" />

          {/* Inner Circular Card Container */}
          <div className="w-[82%] h-[82%] rounded-full bg-surface shadow-md border border-outline-variant/40 flex items-center justify-center overflow-hidden p-2 z-10 transition-transform hover:scale-105">
            <img
              src="/logo-htc.png"
              alt="HTC Insights"
              className={`${iconSizes.logo} object-contain animate-pulse`}
              draggable={false}
            />
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-1.5 px-4">
          <h3 className={`font-headline ${iconSizes.title} font-bold text-primary tracking-tight`}>
            {message}
          </h3>

          {subMessage && (
            <p className={`font-body text-on-surface-variant ${iconSizes.sub} font-medium leading-relaxed max-w-sm`}>
              {subMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
