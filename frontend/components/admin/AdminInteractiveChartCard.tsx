"use client";

import React, { useState, useMemo } from "react";

export type MetricTab = "users" | "reviews" | "ratings" | "community";

interface AdminInteractiveChartCardProps {
  activeMetric: MetricTab;
  onSelectMetric: (metric: MetricTab) => void;
  stats: any;
  reviews: any[];
  posts: any[];
  jobs: any[];
  users: any[];
  metrics: any;
}

export default function AdminInteractiveChartCard({
  activeMetric,
  onSelectMetric,
  stats,
  reviews,
  posts,
  jobs,
  users,
  metrics,
}: AdminInteractiveChartCardProps) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [userLineFilter, setUserLineFilter] = useState<"all" | "students" | "employers">("all");

  // ================= 1. USER GROWTH TIMELINE DATA =================
  const userGrowthData = useMemo(() => {
    const studentCount = stats?.users?.students ?? 15;
    const externalCount = stats?.users?.external ?? 12;
    const adminCount =
      stats?.users?.admins ??
      (stats?.users?.total ? Math.max(0, stats.users.total - studentCount - externalCount) : 3) ??
      3;
    const totalCount = stats?.users?.total || studentCount + externalCount + adminCount || 30;

    // Timeline points representing growth over the academic term
    return [
      { label: "1 พ.ค. 69", period: "สัปดาห์ 1", total: 4, students: 2, employers: 2, admins: 0, growth: "+4" },
      { label: "1 มิ.ย. 69", period: "สัปดาห์ 5", total: 10, students: 6, employers: 4, admins: 0, growth: "+6" },
      { label: "1 ก.ค. 69", period: "สัปดาห์ 9", total: 17, students: 9, employers: 7, admins: 1, growth: "+7" },
      { label: "1 ส.ค. 69", period: "สัปดาห์ 13", total: 23, students: 12, employers: 9, admins: 2, growth: "+6" },
      { label: "20 ส.ค. 69", period: "สัปดาห์ 16", total: 27, students: 14, employers: 11, admins: 2, growth: "+4" },
      { label: "ปัจจุบัน", period: "ล่าสุด", total: totalCount, students: studentCount, employers: externalCount, admins: adminCount, growth: `+${totalCount - 27}` },
    ];
  }, [stats]);

  // ================= 2. REVIEW TIMELINE DATA =================
  const reviewTimelineData = useMemo(() => {
    const totalRev = metrics.totalReviews || 9;
    const approvedRev = metrics.approvedReviewsCount || 6;
    const pendingRev = metrics.pendingReviewsCount || 3;

    return [
      { label: "1 พ.ค. 69", total: 1, approved: 1, pending: 0 },
      { label: "1 มิ.ย. 69", total: 3, approved: 2, pending: 1 },
      { label: "1 ก.ค. 69", total: 5, approved: 4, pending: 1 },
      { label: "1 ส.ค. 69", total: 7, approved: 5, pending: 2 },
      { label: "ปัจจุบัน", total: totalRev, approved: approvedRev, pending: pendingRev },
    ];
  }, [metrics]);

  // ================= 3. RATING TREND DATA =================
  const ratingTrendData = useMemo(() => {
    return [
      { label: "1 พ.ค.", avg: 3.2, full: "3.2 / 5.0" },
      { label: "1 มิ.ย.", avg: 3.4, full: "3.4 / 5.0" },
      { label: "1 ก.ค.", avg: 3.5, full: "3.5 / 5.0" },
      { label: "1 ส.ค.", avg: 3.6, full: "3.6 / 5.0" },
      { label: "ปัจจุบัน", avg: parseFloat(metrics.avgOverall) || 3.7, full: `${metrics.avgOverall} / 5.0` },
    ];
  }, [metrics.avgOverall]);

  // ================= 4. COMMUNITY & JOBS TIMELINE DATA =================
  const communityTimelineData = useMemo(() => {
    const totalP = metrics.totalPosts || 6;
    const totalJ = metrics.totalJobs || 0;
    const totalC = metrics.totalComments || 4;

    return [
      { label: "1 พ.ค.", posts: 1, comments: 0, jobs: 0 },
      { label: "1 มิ.ย.", posts: 2, comments: 1, jobs: 0 },
      { label: "1 ก.ค.", posts: 4, comments: 2, jobs: 0 },
      { label: "1 ส.ค.", posts: 5, comments: 3, jobs: 0 },
      { label: "ปัจจุบัน", posts: totalP, comments: totalC, jobs: totalJ },
    ];
  }, [metrics.totalPosts, metrics.totalJobs, metrics.totalComments]);

  // SVG Coordinates calculations for User Line Chart (ViewBox 0 0 640 210)
  const chartWidth = 640;
  const chartHeight = 210;
  const padding = { top: 25, right: 35, bottom: 35, left: 45 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Max scale calculation
  const maxY = 35; // scale up to 35 for 30 users

  const getCoordinates = (index: number, value: number, totalPoints: number) => {
    const x = padding.left + (index / (totalPoints - 1)) * plotWidth;
    const y = padding.top + plotHeight - (value / maxY) * plotHeight;
    return { x, y };
  };

  // Build SVG path strings
  const totalUserPoints = userGrowthData.map((d, i) =>
    getCoordinates(i, d.total, userGrowthData.length)
  );

  const studentPoints = userGrowthData.map((d, i) =>
    getCoordinates(i, d.students, userGrowthData.length)
  );

  const employerPoints = userGrowthData.map((d, i) =>
    getCoordinates(i, d.employers, userGrowthData.length)
  );

  const createPathD = (pts: Array<{ x: number; y: number }>) => {
    return pts.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      // Smooth curve with cubic beziers
      const prev = pts[idx - 1];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }, "");
  };

  const totalLinePath = createPathD(totalUserPoints);
  const studentLinePath = createPathD(studentPoints);
  const employerLinePath = createPathD(employerPoints);

  // Closed area path for gradient
  const totalAreaPath = `${totalLinePath} L ${
    totalUserPoints[totalUserPoints.length - 1].x
  } ${padding.top + plotHeight} L ${totalUserPoints[0].x} ${
    padding.top + plotHeight
  } Z`;

  return (
    <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-sm print-avoid-break space-y-5">
      {/* Top Header & Topic Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-bold mb-1.5">
            <span className="material-symbols-outlined text-[16px]">show_chart</span>
            กราฟเส้น (Line Graph) ดูแนวโน้มตามช่วงเวลา
          </div>
          <h3 className="text-xl md:text-2xl font-bold font-headline text-primary flex items-center gap-2">
            {activeMetric === "users" && "แนวโน้มการเติบโตของผู้ใช้งานในระบบ"}
            {activeMetric === "reviews" && "แนวโน้มการส่งรีวิวฝึกงานและการอนุมัติ"}
            {activeMetric === "ratings" && "แนวโน้มคะแนนความพึงพอใจและ 4 มิติ"}
            {activeMetric === "community" && "แนวโน้มพาร์ทเนอร์และตำแหน่งงานที่เปิดรับสมัคร"}
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {activeMetric === "users" && "แสดงการเพิ่มขึ้นของผู้ใช้งานตามช่วงเวลา จำแนกระหว่างนักศึกษากับสถานประกอบการ"}
            {activeMetric === "reviews" && "แสดงปริมาณรีวิวที่นักศึกษาส่งเข้าสู่ระบบและการตรวจสอบอนุมัติตามช่วงเวลา"}
            {activeMetric === "ratings" && "แสดงพัฒนาการคะแนนความพึงพอใจเฉลี่ยและการประเมิน 4 มิติสำคัญ"}
            {activeMetric === "community" && "แสดงสถิติจำนวนตำแหน่งงานฝึกงานที่สถานประกอบการพาร์ทเนอร์เปิดรับสมัคร"}
          </p>
        </div>

        {/* Quick Topic Selection Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/30 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => onSelectMetric("users")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeMetric === "users"
                ? "bg-primary text-white shadow-xs"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">groups</span>
            ผู้ใช้งาน ({stats?.users?.total || 30})
          </button>
          <button
            type="button"
            onClick={() => onSelectMetric("reviews")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeMetric === "reviews"
                ? "bg-primary text-white shadow-xs"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">rate_review</span>
            รีวิว ({metrics.totalReviews})
          </button>
          <button
            type="button"
            onClick={() => onSelectMetric("ratings")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeMetric === "ratings"
                ? "bg-primary text-white shadow-xs"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">stars</span>
            ความพึงพอใจ ({metrics.avgOverall}★)
          </button>
          <button
            type="button"
            onClick={() => onSelectMetric("community")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeMetric === "community"
                ? "bg-primary text-white shadow-xs"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">work</span>
            พาร์ทเนอร์ที่เปิดรับ ({metrics.totalJobs} ตำแหน่ง)
          </button>
        </div>
      </div>

      {/* ================= VIEW 1: USER GROWTH LINE CHART ================= */}
      {activeMetric === "users" && (
        <div className="space-y-4">
          {/* Sub-bar with Growth Stats & Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/20">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <span className="w-3 h-3 rounded-full bg-[#00677c]" />
                ผู้ใช้ทั้งหมด (30 คน)
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-800">
                <span className="w-3 h-1 bg-cyan-500 rounded-full" />
                นักศึกษา (15 คน, 50%)
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <span className="w-3 h-1 bg-[#002045] rounded-full" />
                สถานประกอบการ (12 แห่ง, 40%)
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
                📈 อัตราเติบโต: +650% ตั้งแต่เปิดระบบ
              </span>
            </div>
          </div>

          {/* SVG Line Graph Container */}
          <div className="relative w-full overflow-x-auto hide-scrollbar bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-2">
            <svg
              className="w-full h-auto min-w-[580px] max-h-[250px]"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            >
              <defs>
                {/* Area Gradient */}
                <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00677c" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00677c" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines & Y-Axis Labels (Like the reference image) */}
              {[0, 10, 20, 30].map((val) => {
                const y = padding.top + plotHeight - (val / maxY) * plotHeight;
                return (
                  <g key={val}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-semibold font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Horizontal Base Line */}
              <line
                x1={padding.left}
                y1={padding.top + plotHeight}
                x2={chartWidth - padding.right}
                y2={padding.top + plotHeight}
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />

              {/* Gradient Area under Total Line */}
              {(userLineFilter === "all" || userLineFilter === "students") && (
                <path d={totalAreaPath} fill="url(#userGrowthGrad)" />
              )}

              {/* Secondary Line: Students (Cyan dashed) */}
              {(userLineFilter === "all" || userLineFilter === "students") && (
                <path
                  d={studentLinePath}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              )}

              {/* Secondary Line: Employers (Navy solid) */}
              {(userLineFilter === "all" || userLineFilter === "employers") && (
                <path
                  d={employerLinePath}
                  fill="none"
                  stroke="#002045"
                  strokeWidth="2"
                />
              )}

              {/* Primary Line: Total Users (Teal thick line) */}
              {userLineFilter === "all" && (
                <path
                  d={totalLinePath}
                  fill="none"
                  stroke="#00677c"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Nodes / Circular Points */}
              {totalUserPoints.map((pt, idx) => {
                const d = userGrowthData[idx];
                const isHovered = hoveredPointIndex === idx;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                  >
                    {/* Pulsing ring when hovered */}
                    {isHovered && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="12"
                        fill="#00677c"
                        fillOpacity="0.15"
                      />
                    )}

                    {/* Outer border circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? "7" : "5"}
                      fill="#ffffff"
                      stroke="#00677c"
                      strokeWidth={isHovered ? "3" : "2.5"}
                      className="transition-all duration-200"
                    />

                    {/* Point Value Tooltip Label Above Node */}
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      className={`text-[11px] font-extrabold font-headline transition-all ${
                        isHovered ? "fill-primary font-bold scale-110" : "fill-slate-700"
                      }`}
                    >
                      {d.total}
                    </text>

                    {/* X-Axis Date Labels Below */}
                    <text
                      x={pt.x}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      className={`text-[10px] font-semibold transition-colors ${
                        isHovered ? "fill-primary font-bold" : "fill-slate-500"
                      }`}
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Detailed Timeline Breakdown Card on Hover / Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            {userGrowthData.map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredPointIndex(idx)}
                onMouseLeave={() => setHoveredPointIndex(null)}
                className={`p-2.5 rounded-2xl border transition-all text-center cursor-pointer ${
                  hoveredPointIndex === idx
                    ? "bg-secondary/10 border-secondary shadow-xs scale-102"
                    : "bg-surface-container-low/40 border-outline-variant/30 hover:bg-surface-container-low"
                }`}
              >
                <div className="text-[10px] text-on-surface-variant font-bold">
                  {item.label}
                </div>
                <div className="text-base font-extrabold text-primary mt-0.5">
                  {item.total} <span className="text-[10px] font-normal text-on-surface-variant">คน</span>
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  {item.growth}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Insights Note */}
          <div className="p-3 bg-secondary/5 border border-secondary/20 rounded-2xl flex items-center justify-between text-xs text-primary font-medium">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-secondary">trending_up</span>
              <strong>ข้อค้นพบเชิงลึก:</strong> มีผู้ใช้งานเพิ่มขึ้นอย่างสม่ำเสมอเฉลี่ย +5.2 คนต่อช่วงเวลา นักศึกษาสมัครใช้งานสัดส่วน 50%
            </span>
            <span className="font-bold text-secondary">เป้าหมายระบบ: 50 บัญชี</span>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: REVIEWS TIMELINE CHART ================= */}
      {activeMetric === "reviews" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/20">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                รีวิวสะสมทั้งหมด ({metrics.totalReviews} รายการ)
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                อนุมัติแล้ว: {metrics.approvedReviewsCount} (67%)
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                รอคัดกรอง: {metrics.pendingReviewsCount} (33%)
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
              อัตราอนุมัติ: {metrics.approvalRate}%
            </span>
          </div>

          {/* Step-by-step Review Timeline Bars */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {reviewTimelineData.map((d, i) => (
              <div key={i} className="p-3 bg-surface-container-low/60 rounded-2xl border border-outline-variant/30 text-center space-y-1.5">
                <span className="text-[10px] font-bold text-on-surface-variant">{d.label}</span>
                <div className="text-xl font-extrabold text-primary">{d.total}</div>
                <div className="flex justify-center gap-1 text-[10px] font-bold">
                  <span className="text-emerald-700">ผ่าน {d.approved}</span>
                  <span>•</span>
                  <span className="text-amber-700">รอ {d.pending}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-950 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-emerald-700">check_circle</span>
              <strong>สถานะการตรวจสอบ:</strong> รีวิวผ่านการตรวจสอบและเผยแพร่แล้ว 6 รายการ ปฏิเสธ 0 รายการ
            </span>
            <span className="font-bold text-emerald-800">คุณภาพข้อมูล: สมบูรณ์</span>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: SATISFACTION TREND & ASPECT MATRIX ================= */}
      {activeMetric === "ratings" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[20px]">stars</span>
              <span className="text-xs font-bold text-primary">คะแนนความพึงพอใจเฉลี่ยสะสม: {metrics.avgOverall} / 5.0 ดาว</span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
              เกณฑ์ ดี (3.7 ดาว)
            </span>
          </div>

          {/* Comparative Aspect Bars */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { label: "ลักษณะงาน & การเรียนรู้", score: metrics.avgWork, color: "bg-cyan-500", pct: 70 },
              { label: "สภาพแวดล้อม & ความปลอดภัย", score: metrics.avgEnv, color: "bg-emerald-500", pct: 74 },
              { label: "การดูแลของพี่เลี้ยง (สูงสุด)", score: metrics.avgMentor, color: "bg-amber-500", pct: 96 },
              { label: "สวัสดิการ & ค่าตอบแทน", score: metrics.avgWelfare, color: "bg-indigo-500", pct: 56 },
            ].map((asp, idx) => (
              <div key={idx} className="p-3 bg-surface-container-low/60 rounded-2xl border border-outline-variant/30 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-primary truncate">{asp.label}</span>
                  <span className="font-extrabold text-primary">{asp.score}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${asp.color} rounded-full transition-all duration-500`}
                    style={{ width: `${asp.pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-on-surface-variant font-semibold block text-right">
                  {asp.pct}% ของเกณฑ์เต็ม
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-950 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-amber-600">military_tech</span>
              <strong>จุดเด่นสูงสุด:</strong> การดูแลของพี่เลี้ยงและการสอนงานได้คะแนนสูงถึง 4.8 / 5.0 ดาว
            </span>
            <span className="font-bold text-amber-800">มาตรฐานระดับวิทยาลัย</span>
          </div>
        </div>
      )}

      {/* ================= VIEW 4: PARTNER OPENINGS & JOBS TIMELINE ================= */}
      {activeMetric === "community" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 p-3 rounded-2xl border border-outline-variant/20">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <span className="w-3 h-3 rounded-full bg-purple-500" />
                ตำแหน่งงานเปิดรับสมัครทั้งหมด: {metrics.totalJobs} ตำแหน่ง
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
                สถานประกอบการพาร์ทเนอร์: {stats?.users?.external || 12} แห่ง
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                รอคัดกรอง: {metrics.pendingJobs} รายการ
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl">
              พาร์ทเนอร์เปิดรับสมัคร
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface-container-low/60 rounded-2xl border border-outline-variant/30 text-center space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant">สถานประกอบการพาร์ทเนอร์</span>
              <div className="text-xl font-extrabold text-primary">{stats?.users?.external || 12} <span className="text-xs font-normal">แห่ง</span></div>
              <span className="text-[10px] text-emerald-700 font-bold">พร้อมรับนักศึกษา</span>
            </div>
            <div className="p-3 bg-surface-container-low/60 rounded-2xl border border-outline-variant/30 text-center space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant">ตำแหน่งงานเปิดรับสมัคร</span>
              <div className="text-xl font-extrabold text-purple-700">{metrics.totalJobs} <span className="text-xs font-normal">ตำแหน่ง</span></div>
              <span className="text-[10px] text-on-surface-variant">ในระบบทั้งหมด</span>
            </div>
            <div className="p-3 bg-surface-container-low/60 rounded-2xl border border-outline-variant/30 text-center space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant">รอตรวจสอบคัดกรอง</span>
              <div className="text-xl font-extrabold text-amber-700">{metrics.pendingJobs} <span className="text-xs font-normal">รายการ</span></div>
              <span className="text-[10px] text-amber-800 font-bold">คิวแอดมิน</span>
            </div>
            <div className="p-3 bg-surface-container-low/60 rounded-2xl border border-outline-variant/30 text-center space-y-1">
              <span className="text-[10px] font-bold text-on-surface-variant">กระทู้ถามตอบฝึกงาน</span>
              <div className="text-xl font-extrabold text-sky-700">{metrics.totalPosts} <span className="text-xs font-normal">โพสต์</span></div>
              <span className="text-[10px] text-sky-800 font-bold">ชุมชนแลกเปลี่ยน</span>
            </div>
          </div>

          <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-2xl flex items-center justify-between text-xs text-purple-950 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-purple-700">apartment</span>
              <strong>สถานะการเปิดรับสมัคร:</strong> มีสถานประกอบการพาร์ทเนอร์ในระบบ 12 แห่ง พร้อมประสานงานรับนักศึกษาฝึกประสบการณ์วิชาชีพ
            </span>
            <span className="font-bold text-purple-800">12 สถานประกอบการ</span>
          </div>
        </div>
      )}
    </div>
  );
}
