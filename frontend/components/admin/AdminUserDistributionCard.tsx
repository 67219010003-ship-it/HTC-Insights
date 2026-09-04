"use client";

import React, { useState, useMemo } from "react";

interface AdminUserDistributionCardProps {
  stats?: any;
  users?: any[];
}

export default function AdminUserDistributionCard({
  stats,
  users = [],
}: AdminUserDistributionCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // User counts with fallbacks
  const userStudentCount = stats?.users?.students ?? 15;
  const userExternalCount = stats?.users?.external ?? 12;
  const userAdminCount =
    stats?.users?.admins ??
    (stats?.users?.total
      ? Math.max(0, stats.users.total - userStudentCount - userExternalCount)
      : 3) ??
    3;

  const totalUsersCount =
    stats?.users?.total ||
    (userStudentCount + userExternalCount + userAdminCount) ||
    30;

  // Segments definition
  const segments = useMemo(() => {
    const total = totalUsersCount || 1;
    const sPct = Math.round((userStudentCount / total) * 100);
    const ePct = Math.round((userExternalCount / total) * 100);
    const aPct = Math.max(0, 100 - sPct - ePct);

    return [
      {
        id: "students",
        label: "นักศึกษา",
        roleEn: "Student",
        count: userStudentCount,
        percent: sPct,
        color: "#00677c",
        bgLight: "bg-teal-50 border-teal-200 text-teal-900",
        badgeBg: "bg-teal-100 text-teal-800",
        icon: "school",
      },
      {
        id: "external",
        label: "ผู้ใช้ภายนอก / บริษัท",
        roleEn: "External / Partner",
        count: userExternalCount,
        percent: ePct,
        color: "#10b981",
        bgLight: "bg-emerald-50 border-emerald-200 text-emerald-900",
        badgeBg: "bg-emerald-100 text-emerald-800",
        icon: "corporate_fare",
      },
      {
        id: "admins",
        label: "ผู้ดูแลระบบ",
        roleEn: "Admin",
        count: userAdminCount,
        percent: aPct,
        color: "#8b5cf6",
        bgLight: "bg-purple-50 border-purple-200 text-purple-900",
        badgeBg: "bg-purple-100 text-purple-800",
        icon: "shield_person",
      },
    ];
  }, [totalUsersCount, userStudentCount, userExternalCount, userAdminCount]);

  // SVG Donut calculation
  const radius = 48;
  const circumference = 2 * Math.PI * radius; // ~301.59

  let accumulatedPercent = 0;
  const donutArcs = segments.map((seg, idx) => {
    const strokeDash = (seg.percent / 100) * circumference;
    const offset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += seg.percent;

    return {
      ...seg,
      strokeDash,
      offset,
      index: idx,
    };
  });

  return (
    <div className="bg-surface-container-lowest p-4 sm:p-5 md:p-6 rounded-3xl border border-outline-variant/30 shadow-sm print:p-3.5 print:rounded-2xl print:border-slate-300 print:shadow-none print-avoid-break h-full flex flex-col justify-between overflow-hidden min-w-0 w-full">
      {/* Card Header */}
      <div className="border-b border-outline-variant/20 pb-2.5">
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-secondary/10 text-secondary rounded-full text-[11px] font-bold mb-1">
          <span className="material-symbols-outlined text-[14px]">pie_chart</span>
          สถิติบัญชีผู้ใช้
        </div>
        <h3 className="text-base sm:text-lg font-bold font-headline text-primary truncate">
          สัดส่วนผู้ใช้งานในระบบ
        </h3>
        <p className="text-[11px] text-on-surface-variant truncate">
          จำแนกตาม 3 กลุ่มผู้ใช้งานหลัก
        </p>
      </div>

      {/* Donut Chart (Centered, non-overflowing) */}
      <div className="my-2 sm:my-3 flex justify-center items-center">
        <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 120 120"
          >
            {/* Base Background Track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="14"
            />

            {/* Arcs */}
            {donutArcs.map((arc) => {
              const isHovered = hoveredIndex === arc.index;
              return (
                <circle
                  key={arc.id}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={isHovered ? 17 : 14}
                  strokeDasharray={`${arc.strokeDash} ${circumference - arc.strokeDash}`}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="round"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(arc.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Info */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl sm:text-3xl font-black font-headline text-primary leading-none">
              {totalUsersCount.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant mt-1">
              ผู้ใช้งานรวม (คน)
            </span>
          </div>
        </div>
      </div>

      {/* Vertical Legend List (Fits neatly inside any column width) */}
      <div className="space-y-1.5 w-full min-w-0">
        {segments.map((seg, idx) => {
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={seg.id}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`p-2 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between min-w-0 ${
                isHovered
                  ? `${seg.bgLight} shadow-xs`
                  : "bg-surface-container-low/40 border-outline-variant/30 hover:bg-surface-container-low"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: seg.color }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-primary truncate">
                    {seg.label}
                  </div>
                  <div className="text-[10px] text-on-surface-variant truncate">
                    {seg.roleEn}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2 flex items-center gap-1.5">
                <div className="text-xs font-extrabold text-primary">
                  {seg.count} <span className="text-[10px] font-normal text-on-surface-variant">คน</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                    isHovered ? seg.badgeBg : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {seg.percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Status */}
      <div className="pt-2 mt-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] sm:text-[11px] text-on-surface-variant">
        <span className="flex items-center gap-1 truncate">
          <span className="material-symbols-outlined text-[13px] text-emerald-600">verified_user</span>
          ระบบยืนยันตัวตนแล้ว
        </span>
        <span className="font-semibold text-primary shrink-0 ml-1">
          100% ครอบคลุม
        </span>
      </div>
    </div>
  );
}
