"use client";

import React, { useState, useMemo } from "react";

interface AdminDashboardChartsProps {
  stats: any;
  reviews: any[];
  avgOverall: string;
  avgWork: string;
  avgEnv: string;
  avgMentor: string;
  avgWelfare: string;
  departmentStats?: Array<{
    name: string;
    count: number;
    avgScore: string;
    percentage: number;
  }>;
}

export default function AdminDashboardCharts({
  stats,
  reviews,
  avgOverall,
  avgWork,
  avgEnv,
  avgMentor,
  avgWelfare,
  departmentStats = [],
}: AdminDashboardChartsProps) {
  const [activeUserSegment, setActiveUserSegment] = useState<string | null>(null);
  const [activeRatingSegment, setActiveRatingSegment] = useState<string | null>(null);

  // 1. Data for User Composition Donut Chart
  const userComposition = useMemo(() => {
    const studentCount = stats?.users?.students || 0;
    const externalCount = stats?.users?.external || 0;
    const adminCount =
      stats?.users?.admins ||
      (stats?.users?.total ? Math.max(0, stats.users.total - studentCount - externalCount) : 0) ||
      0;
    const total = studentCount + externalCount + adminCount || stats?.users?.total || 1;

    const segments = [
      {
        id: "students",
        label: "นักศึกษา วท.หาดใหญ่",
        subLabel: "ผู้ใช้งานส่งรีวิวและตั้งกระทู้",
        count: studentCount,
        color: "#00677c", // Secondary Cyan
        hoverColor: "#004e5e",
        icon: "school",
      },
      {
        id: "external",
        label: "สถานประกอบการ",
        subLabel: "พาร์ทเนอร์และผู้เปิดรับฝึกงาน",
        count: externalCount,
        color: "#002045", // Primary Navy
        hoverColor: "#1a365d",
        icon: "apartment",
      },
      {
        id: "admins",
        label: "ผู้ดูแลระบบ (Admin)",
        subLabel: "เจ้าหน้าที่คัดกรองและบริหารระบบ",
        count: adminCount,
        color: "#7c3aed", // Purple
        hoverColor: "#6d28d9",
        icon: "admin_panel_settings",
      },
    ];

    let accumulatedAngle = 0;
    const slices = segments.map((seg) => {
      const percentage = total > 0 ? (seg.count / total) * 100 : 0;
      const slice = {
        ...seg,
        percentage: Math.round(percentage),
        rawPercentage: percentage,
        offset: accumulatedAngle,
      };
      accumulatedAngle += percentage;
      return slice;
    });

    return { total, slices };
  }, [stats]);

  // 2. Data for Rating Score Distribution Donut Chart
  const ratingComposition = useMemo(() => {
    const total = reviews.length;
    const distribution = {
      star5: 0, // 4.5 - 5.0
      star4: 0, // 3.5 - 4.4
      star3: 0, // 2.5 - 3.4
      star2: 0, // 1.5 - 2.4
      star1: 0, // < 1.5
    };

    reviews.forEach((r) => {
      const score = Number(r.score_overall) || 0;
      if (score >= 4.5) distribution.star5++;
      else if (score >= 3.5) distribution.star4++;
      else if (score >= 2.5) distribution.star3++;
      else if (score >= 1.5) distribution.star2++;
      else if (score > 0) distribution.star1++;
    });

    const segments = [
      {
        id: "star5",
        label: "5 ดาว (ดีเยี่ยม)",
        range: "4.5 - 5.0 คะแนน",
        count: distribution.star5,
        color: "#10b981", // Emerald
        textColor: "text-emerald-700",
        bgColor: "bg-emerald-50",
      },
      {
        id: "star4",
        label: "4 ดาว (ดีมาก)",
        range: "3.5 - 4.4 คะแนน",
        count: distribution.star4,
        color: "#06b6d4", // Cyan
        textColor: "text-cyan-700",
        bgColor: "bg-cyan-50",
      },
      {
        id: "star3",
        label: "3 ดาว (ปานกลาง)",
        range: "2.5 - 3.4 คะแนน",
        count: distribution.star3,
        color: "#f59e0b", // Amber
        textColor: "text-amber-700",
        bgColor: "bg-amber-50",
      },
      {
        id: "star2",
        label: "2 ดาว (พอใช้)",
        range: "1.5 - 2.4 คะแนน",
        count: distribution.star2,
        color: "#f97316", // Orange
        textColor: "text-orange-700",
        bgColor: "bg-orange-50",
      },
      {
        id: "star1",
        label: "1 ดาว (ควรปรับปรุง)",
        range: "1.0 - 1.4 คะแนน",
        count: distribution.star1,
        color: "#ef4444", // Rose
        textColor: "text-rose-700",
        bgColor: "bg-rose-50",
      },
    ];

    let accumulatedAngle = 0;
    const slices = segments.map((seg) => {
      const percentage = total > 0 ? (seg.count / total) * 100 : 0;
      const slice = {
        ...seg,
        percentage: Math.round(percentage),
        rawPercentage: percentage,
        offset: accumulatedAngle,
      };
      accumulatedAngle += percentage;
      return slice;
    });

    return { total, slices };
  }, [reviews]);

  // 3. Data for 4 Key Aspects Radial Gauges
  const aspectGauges = useMemo(() => {
    const list = [
      {
        id: "work",
        title: "ลักษณะงานและการเรียนรู้",
        subTitle: "Work & Learning",
        score: parseFloat(avgWork) || 0,
        color: "#0284c7", // Sky blue
        gradient: "from-sky-500 to-blue-600",
        icon: "engineering",
      },
      {
        id: "env",
        title: "สภาพแวดล้อมและความปลอดภัย",
        subTitle: "Environment & Safety",
        score: parseFloat(avgEnv) || 0,
        color: "#059669", // Emerald
        gradient: "from-emerald-400 to-teal-600",
        icon: "health_and_safety",
      },
      {
        id: "mentor",
        title: "การดูแลของพี่เลี้ยงและการสอนงาน",
        subTitle: "Mentorship",
        score: parseFloat(avgMentor) || 0,
        color: "#d97706", // Amber
        gradient: "from-amber-400 to-orange-500",
        icon: "supervisor_account",
      },
      {
        id: "welfare",
        title: "สวัสดิการและค่าตอบแทน",
        subTitle: "Welfare & Allowance",
        score: parseFloat(avgWelfare) || 0,
        color: "#6366f1", // Indigo
        gradient: "from-indigo-400 to-purple-600",
        icon: "payments",
      },
    ];

    return list.map((item) => {
      const percent = Math.min(100, Math.round((item.score / 5) * 100));
      let grade = "ปานกลาง";
      let gradeColor = "text-amber-800 bg-amber-50 border-amber-200";
      if (item.score >= 4.5) {
        grade = "ดีเยี่ยม";
        gradeColor = "text-emerald-800 bg-emerald-50 border-emerald-200";
      } else if (item.score >= 3.5) {
        grade = "ดีมาก";
        gradeColor = "text-sky-800 bg-sky-50 border-sky-200";
      } else if (item.score < 2.5 && item.score > 0) {
        grade = "ต้องพัฒนา";
        gradeColor = "text-rose-800 bg-rose-50 border-rose-200";
      }

      return {
        ...item,
        percent,
        grade,
        gradeColor,
      };
    });
  }, [avgWork, avgEnv, avgMentor, avgWelfare]);

  // Circumference for Donut (r=68, 2*pi*68 = 427.26)
  const donutRadius = 68;
  const donutCircumference = 2 * Math.PI * donutRadius;

  // Circumference for Radial Gauge (r=36, 2*pi*36 = 226.19)
  const gaugeRadius = 36;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;

  return (
    <div className="space-y-6 print-avoid-break">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-bold mb-1">
            <span className="material-symbols-outlined text-[15px]">pie_chart</span>
            แผนภูมิและการวิเคราะห์สถิติ
          </div>
          <h3 className="text-xl font-bold font-headline text-primary">
            แผนภูมิวิเคราะห์ภาพรวมระบบและผลประเมิน
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            การแสดงผลเชิงภาพ (Data Visualization) สัดส่วนผู้ใช้งาน การกระจายตัวคะแนนความพึงพอใจ และดัชนี 4 มิติ
          </p>
        </div>
      </div>

      {/* Row 1: Two Prominent Donut / Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Donut Chart - สัดส่วนผู้ใช้งานในระบบ */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs print-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold font-headline text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">groups</span>
                  สัดส่วนประเภทผู้ใช้งานในระบบ
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  จำแนกตามประเภทบัญชีผู้ใช้จริงในระบบ HTC Insight
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-surface-container rounded-lg text-primary">
                รวม {userComposition.total} บัญชี
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              {/* SVG Donut */}
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="18"
                  />

                  {/* Slices */}
                  {userComposition.slices.map((slice) => {
                    if (slice.count === 0) return null;
                    const strokeDash = (slice.rawPercentage / 100) * donutCircumference;
                    const strokeOffset = -((slice.offset / 100) * donutCircumference);
                    const isHovered = activeUserSegment === slice.id;

                    return (
                      <circle
                        key={slice.id}
                        cx="80"
                        cy="80"
                        r={donutRadius}
                        fill="transparent"
                        stroke={isHovered ? slice.hoverColor : slice.color}
                        strokeWidth={isHovered ? "22" : "18"}
                        strokeDasharray={`${strokeDash} ${donutCircumference}`}
                        strokeDashoffset={strokeOffset}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setActiveUserSegment(slice.id)}
                        onMouseLeave={() => setActiveUserSegment(null)}
                      />
                    );
                  })}
                </svg>

                {/* Donut Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-2xl font-extrabold font-headline text-primary leading-none">
                    {userComposition.total}
                  </span>
                  <span className="text-[11px] font-bold text-on-surface-variant mt-1">
                    ผู้ใช้ทั้งหมด
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="w-full sm:w-auto flex-1 space-y-2.5">
                {userComposition.slices.map((slice) => (
                  <div
                    key={slice.id}
                    onMouseEnter={() => setActiveUserSegment(slice.id)}
                    onMouseLeave={() => setActiveUserSegment(null)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      activeUserSegment === slice.id
                        ? "bg-surface-container-high border-secondary shadow-xs scale-[1.02]"
                        : "bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: slice.color }}
                      />
                      <div className="text-left truncate">
                        <div className="text-xs font-bold text-primary truncate">
                          {slice.label}
                        </div>
                        <div className="text-[10px] text-on-surface-variant">
                          {slice.subLabel}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-extrabold text-primary">
                        {slice.count} คน
                      </div>
                      <div className="text-[10px] font-bold text-secondary">
                        {slice.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px] text-secondary">info</span>
              กลุ่มผู้ใช้หลัก: นักศึกษาวิทยาลัยเทคนิคหาดใหญ่
            </span>
            <span className="font-bold text-primary">สัดส่วนปลอดภัย 100%</span>
          </div>
        </div>

        {/* Chart 2: Donut Chart - การกระจายตัวคะแนนความพึงพอใจ */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs print-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold font-headline text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[20px]">stars</span>
                  การกระจายตัวคะแนนความพึงพอใจ
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  สัดส่วนรีวิวแยกตามระดับดาว 1 - 5 ดาว
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                เฉลี่ย {avgOverall} ★
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
              {/* SVG Donut */}
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r={donutRadius}
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="18"
                  />

                  {/* Slices */}
                  {ratingComposition.total > 0 ? (
                    ratingComposition.slices.map((slice) => {
                      if (slice.count === 0) return null;
                      const strokeDash = (slice.rawPercentage / 100) * donutCircumference;
                      const strokeOffset = -((slice.offset / 100) * donutCircumference);
                      const isHovered = activeRatingSegment === slice.id;

                      return (
                        <circle
                          key={slice.id}
                          cx="80"
                          cy="80"
                          r={donutRadius}
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? "22" : "18"}
                          strokeDasharray={`${strokeDash} ${donutCircumference}`}
                          strokeDashoffset={strokeOffset}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setActiveRatingSegment(slice.id)}
                          onMouseLeave={() => setActiveRatingSegment(null)}
                        />
                      );
                    })
                  ) : (
                    <circle
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="transparent"
                      stroke="#cbd5e1"
                      strokeWidth="18"
                    />
                  )}
                </svg>

                {/* Donut Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <div className="flex items-center gap-0.5 text-amber-600">
                    <span className="material-symbols-outlined text-[18px]">star</span>
                    <span className="text-2xl font-extrabold font-headline text-primary leading-none">
                      {avgOverall}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant mt-1">
                    จาก {ratingComposition.total} รีวิว
                  </span>
                </div>
              </div>

              {/* Legend List */}
              <div className="w-full sm:w-auto flex-1 space-y-1.5">
                {ratingComposition.slices.map((slice) => (
                  <div
                    key={slice.id}
                    onMouseEnter={() => setActiveRatingSegment(slice.id)}
                    onMouseLeave={() => setActiveRatingSegment(null)}
                    className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                      activeRatingSegment === slice.id
                        ? "bg-surface-container-high border-secondary shadow-xs scale-[1.02]"
                        : "bg-surface-container-lowest border-outline-variant/20 hover:bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-bold text-primary">{slice.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        {slice.count} รีวิว
                      </span>
                      <span className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${slice.textColor} ${slice.bgColor}`}>
                        {slice.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px] text-amber-600">thumb_up</span>
              รีวิวเกณฑ์ดี-ดีเยี่ยม (4-5 ดาว):{" "}
              <strong>
                {Math.round(
                  (((ratingComposition.slices[0]?.count || 0) +
                    (ratingComposition.slices[1]?.count || 0)) /
                    (ratingComposition.total || 1)) *
                    100
                )}
                %
              </strong>
            </span>
            <span className="font-semibold text-emerald-700">ความพึงพอใจสูง</span>
          </div>
        </div>
      </div>

      {/* Row 2: Radial Progress Gauges - เปรียบเทียบ 4 มิติสำคัญ */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs print-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h4 className="text-base font-bold font-headline text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">speed</span>
              ดัชนีคะแนนประเมินเชิงลึก 4 มิติ (Radial Performance Matrix)
            </h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              การประเมินสมรรถนะแต่ละด้านเทียบเกณฑ์เต็ม 5.00 คะแนน คิดเป็นร้อยละสัมพัทธ์
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-surface-container rounded-xl text-on-surface-variant self-start sm:self-auto">
            เกณฑ์มาตรฐาน 4 มิติ
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
          {aspectGauges.map((aspect) => {
            const strokeDash = (aspect.percent / 100) * gaugeCircumference;

            return (
              <div
                key={aspect.id}
                className="bg-surface-container-low/60 rounded-2xl p-4 border border-outline-variant/30 flex flex-col items-center text-center space-y-3 hover:shadow-sm hover:border-secondary/40 transition-all group"
              >
                {/* Radial Gauge SVG */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
                    {/* Background Ring */}
                    <circle
                      cx="45"
                      cy="45"
                      r={gaugeRadius}
                      fill="transparent"
                      stroke="#e2e8f0"
                      strokeWidth="8"
                    />
                    {/* Value Ring */}
                    <circle
                      cx="45"
                      cy="45"
                      r={gaugeRadius}
                      fill="transparent"
                      stroke={aspect.color}
                      strokeWidth="8"
                      strokeDasharray={`${strokeDash} ${gaugeCircumference}`}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>

                  {/* Inside Radial Value */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-lg font-extrabold font-headline text-primary leading-none">
                      {aspect.score.toFixed(1)}
                    </span>
                    <span className="text-[9px] font-bold text-on-surface-variant mt-0.5">
                      {aspect.percent}%
                    </span>
                  </div>
                </div>

                {/* Aspect Title & Grade Badge */}
                <div className="space-y-1 w-full">
                  <div className="text-xs font-bold text-primary group-hover:text-secondary transition-colors line-clamp-1">
                    {aspect.title}
                  </div>
                  <div className="text-[10px] text-on-surface-variant">
                    {aspect.subTitle}
                  </div>
                  <div className="pt-1">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${aspect.gradeColor}`}>
                      เกณฑ์: {aspect.grade}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
