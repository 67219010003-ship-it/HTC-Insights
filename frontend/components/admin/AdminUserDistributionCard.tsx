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
        color: "#00677c", // Primary/Secondary Teal
        bgLight: "bg-teal-50/70 border-teal-200/70 text-teal-900",
        badgeBg: "bg-teal-100 text-teal-800",
        icon: "school",
      },
      {
        id: "external",
        label: "ผู้ใช้ภายนอก / สถานประกอบการ",
        roleEn: "External / Partner",
        count: userExternalCount,
        percent: ePct,
        color: "#10b981", // Emerald Green
        bgLight: "bg-emerald-50/70 border-emerald-200/70 text-emerald-900",
        badgeBg: "bg-emerald-100 text-emerald-800",
        icon: "corporate_fare",
      },
      {
        id: "admins",
        label: "ผู้ดูแลระบบ",
        roleEn: "Admin",
        count: userAdminCount,
        percent: aPct,
        color: "#8b5cf6", // Vibrant Purple
        bgLight: "bg-purple-50/70 border-purple-200/70 text-purple-900",
        badgeBg: "bg-purple-100 text-purple-800",
        icon: "shield_person",
      },
    ];
  }, [totalUsersCount, userStudentCount, userExternalCount, userAdminCount]);

  // SVG Donut calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~339.292

  // Compute strokeDasharray and strokeDashoffset for each segment
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
    <div className="bg-surface-container-lowest p-5 md:p-6 rounded-3xl border border-outline-variant/30 shadow-sm print:p-4 print:rounded-2xl print:border-slate-300 print:shadow-none print-avoid-break h-full flex flex-col justify-between space-y-4">
      {/* Card Header */}
      <div className="border-b border-outline-variant/20 pb-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs font-bold mb-1">
          <span className="material-symbols-outlined text-[15px]">pie_chart</span>
          สถิติบัญชีผู้ใช้
        </div>
        <h3 className="text-lg md:text-xl font-bold font-headline text-primary">
          สัดส่วนผู้ใช้งานในระบบ
        </h3>
        <p className="text-xs text-on-surface-variant mt-0.5">
          จำแนกตามสถานะ 3 กลุ่มผู้ใช้งานหลักของ HTC Insight
        </p>
      </div>

      {/* Main Content: Donut Chart + Slices */}
      <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-center gap-5 my-auto">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 140 140"
          >
            {/* Background base track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="18"
            />

            {/* Colored arcs */}
            {donutArcs.map((arc) => {
              const isHovered = hoveredIndex === arc.index;
              return (
                <circle
                  key={arc.id}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={isHovered ? 21 : 18}
                  strokeDasharray={`${arc.strokeDash} ${circumference - arc.strokeDash}`}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(arc.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Label (Total Count & Unit) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-2xl md:text-3xl font-black font-headline text-primary tracking-tight">
              {totalUsersCount.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-on-surface-variant -mt-0.5">
              ผู้ใช้งานรวม (คน)
            </span>
          </div>
        </div>

        {/* Legend & Breakdown List */}
        <div className="flex-1 w-full space-y-2">
          {segments.map((seg, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={seg.id}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                  isHovered
                    ? `${seg.bgLight} shadow-xs scale-[1.01]`
                    : "bg-surface-container-low/40 border-outline-variant/30 hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-xs"
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

                <div className="text-right shrink-0 ml-2">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-sm font-extrabold text-primary">
                      {seg.count}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      คน
                    </span>
                  </div>
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
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
      </div>

      {/* Footer Info / Ratio Note */}
      <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] text-emerald-600">verified_user</span>
          ระบบยืนยันตัวตนสถานะแล้ว
        </span>
        <span className="font-semibold text-primary">
          100% ครอบคลุม
        </span>
      </div>
    </div>
  );
}
