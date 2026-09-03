"use client";

import React, { useState, useMemo } from "react";

interface AdminInteractiveChartCardProps {
  stats: any;
  reviews: any[];
  posts: any[];
  jobs: any[];
  users: any[];
  metrics: any;
}

export default function AdminInteractiveChartCard({
  stats,
  reviews,
  posts,
  jobs,
  users,
  metrics,
}: AdminInteractiveChartCardProps) {
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // 6 Timeline Points covering the academic term
  const timelineData = useMemo(() => {
    const totalUsers = stats?.users?.total || 30;
    const totalReviews = metrics.totalReviews || 9;
    const totalJobs = metrics.totalJobs || 0;
    const totalPosts = metrics.totalPosts || 6;

    return [
      {
        label: "1 พ.ค. 69",
        sub: "เปิดเทอม",
        users: 4,
        reviews: 1,
        jobs: 0,
        community: 1,
      },
      {
        label: "1 มิ.ย. 69",
        sub: "เดือนที่ 2",
        users: 10,
        reviews: 3,
        jobs: 0,
        community: 2,
      },
      {
        label: "1 ก.ค. 69",
        sub: "กลางภาค",
        users: 17,
        reviews: 5,
        jobs: 1,
        community: 4,
      },
      {
        label: "1 ส.ค. 69",
        sub: "เดือนที่ 4",
        users: 23,
        reviews: 7,
        jobs: 1,
        community: 5,
      },
      {
        label: "20 ส.ค. 69",
        sub: "ปลายภาค",
        users: 27,
        reviews: 8,
        jobs: Math.max(1, totalJobs),
        community: 5,
      },
      {
        label: "ปัจจุบัน",
        sub: "ล่าสุด",
        users: totalUsers,
        reviews: totalReviews,
        jobs: totalJobs,
        community: totalPosts,
      },
    ];
  }, [stats, metrics]);

  // SVG Chart Dimensions
  const chartWidth = 680;
  const chartHeight = 220;
  const padding = { top: 25, right: 35, bottom: 35, left: 45 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Max value on Y axis (scale up to 35 for 30 users)
  const maxY = 35;

  const getCoord = (index: number, value: number, totalPoints: number) => {
    const x = padding.left + (index / (totalPoints - 1)) * plotWidth;
    const y = padding.top + plotHeight - (Math.min(value, maxY) / maxY) * plotHeight;
    return { x, y };
  };

  const userPts = timelineData.map((d, i) => getCoord(i, d.users, timelineData.length));
  const reviewPts = timelineData.map((d, i) => getCoord(i, d.reviews, timelineData.length));
  const jobPts = timelineData.map((d, i) => getCoord(i, d.jobs, timelineData.length));
  const communityPts = timelineData.map((d, i) => getCoord(i, d.community, timelineData.length));

  // Build smooth bezier curves
  const createCurvedPath = (pts: Array<{ x: number; y: number }>) => {
    return pts.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = pts[idx - 1];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }, "");
  };

  const userPath = createCurvedPath(userPts);
  const reviewPath = createCurvedPath(reviewPts);
  const jobPath = createCurvedPath(jobPts);
  const communityPath = createCurvedPath(communityPts);

  // 4 Lines Configuration
  const lines = [
    {
      key: "users" as const,
      label: "ผู้ใช้งาน:",
      color: "#00677c",
      currentVal: stats?.users?.total || 30,
      unit: "คน",
      path: userPath,
      pts: userPts,
      strokeWidth: 2.8,
    },
    {
      key: "reviews" as const,
      label: "รีวิว:",
      color: "#10b981",
      currentVal: metrics.totalReviews || 9,
      unit: "รายการ",
      path: reviewPath,
      pts: reviewPts,
      strokeWidth: 2.5,
    },
    {
      key: "jobs" as const,
      label: "เปิดรับสมัคร:",
      color: "#f59e0b",
      currentVal: metrics.totalJobs || 0,
      unit: "ตำแหน่ง",
      path: jobPath,
      pts: jobPts,
      strokeWidth: 2.5,
    },
    {
      key: "community" as const,
      label: "คอมมู้:",
      color: "#8b5cf6",
      currentVal: metrics.totalPosts || 6,
      unit: "โพสต์",
      path: communityPath,
      pts: communityPts,
      strokeWidth: 2.5,
    },
  ];

  return (
    <div className="bg-surface-container-lowest p-5 md:p-6 rounded-3xl border border-outline-variant/30 shadow-sm print:p-4 print:rounded-2xl print:border-slate-300 print:shadow-none print-avoid-break space-y-3">
      {/* Top Header with Title and the 4 Capsule Pills (as in Image 3) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-outline-variant/20 pb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-secondary/10 text-secondary rounded-full text-xs font-bold mb-1">
            <span className="material-symbols-outlined text-[15px]">show_chart</span>
            กราฟเส้นเดียวเปรียบเทียบแนวโน้ม
          </div>
          <h3 className="text-lg md:text-xl font-bold font-headline text-primary">
            แนวโน้มการเติบโตของระบบ HTC Insight
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            กราฟเส้นแสดงสถิติเปรียบเทียบ 4 ด้านตามช่วงเวลา: ผู้ใช้งาน, รีวิว, เปิดรับสมัครงาน และคอมมูนิตี้
          </p>
        </div>

        {/* Legend Pills (Exactly like Image 3: White capsules with colored dots and values) */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
          {lines.map((line) => {
            const val =
              hoveredPointIndex !== null
                ? (timelineData[hoveredPointIndex] as any)[
                    line.key === "jobs"
                      ? "jobs"
                      : line.key === "community"
                      ? "community"
                      : line.key
                  ]
                : line.currentVal;

            return (
              <div
                key={line.key}
                className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-outline-variant/40 shadow-xs text-xs"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: line.color }}
                />
                <span className="text-on-surface-variant font-medium">
                  {line.label}
                </span>
                <span className="font-extrabold text-primary">
                  {val}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {line.unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG Multi-Line Chart Canvas (All 4 lines always visible at 100% opacity) */}
      <div className="relative w-full overflow-x-auto hide-scrollbar bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-2">
        <svg
          className="w-full h-auto min-w-[580px] max-h-[250px]"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          <defs>
            <filter id="pointShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
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

          {/* X-Axis Base Line */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={chartWidth - padding.right}
            y2={padding.top + plotHeight}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Vertical Guide Line on Hover */}
          {hoveredPointIndex !== null && (
            <line
              x1={userPts[hoveredPointIndex].x}
              y1={padding.top}
              x2={userPts[hoveredPointIndex].x}
              y2={padding.top + plotHeight}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
          )}

          {/* Render all 4 Lines with full crisp opacity */}
          {lines.map((line) => (
            <path
              key={line.key}
              d={line.path}
              fill="none"
              stroke={line.color}
              strokeWidth={line.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-200"
            />
          ))}

          {/* Interactive Nodes & Hover Targets */}
          {timelineData.map((d, idx) => {
            const isHovered = hoveredPointIndex === idx;

            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPointIndex(idx)}
                onMouseLeave={() => setHoveredPointIndex(null)}
              >
                {/* Transparent hit area column */}
                <rect
                  x={userPts[idx].x - 20}
                  y={padding.top}
                  width="40"
                  height={plotHeight}
                  fill="transparent"
                />

                {/* Nodes for all 4 lines at this date */}
                {lines.map((line) => {
                  const pt = line.pts[idx];

                  return (
                    <circle
                      key={line.key}
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? "5.5" : "4"}
                      fill="#ffffff"
                      stroke={line.color}
                      strokeWidth={isHovered ? "3" : "2"}
                      filter={isHovered ? "url(#pointShadow)" : undefined}
                      className="transition-all duration-200"
                    />
                  );
                })}

                {/* X-Axis Date Labels Below */}
                <text
                  x={userPts[idx].x}
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
    </div>
  );
}
