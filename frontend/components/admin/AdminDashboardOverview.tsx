"use client";

import React, { useState, useMemo } from "react";
import AdminInteractiveChartCard, { MetricTab } from "./AdminInteractiveChartCard";

interface StatsData {
  users?: {
    total: number;
    students: number;
    external: number;
    admins: number;
  };
  reviews?: {
    total: number;
    pending: number;
  };
  jobs?: {
    total: number;
    pending: number;
  };
  community?: {
    posts: number;
    pending_posts: number;
    pending_reports: number;
  };
  upgrades?: {
    pending: number;
  };
}

export interface AdminReview {
  id: number;
  company_id?: number;
  company_name: string;
  department?: string;
  user_id?: number;
  real_author: string;
  real_email: string;
  score_overall: number;
  score_work?: number | null;
  score_env?: number | null;
  score_mentor?: number | null;
  score_welfare?: number | null;
  text_work: string;
  text_pros?: string | null;
  text_cons?: string | null;
  text_advice?: string | null;
  status: string;
  created_at?: string | null;
}

export interface AdminPost {
  id: number;
  title: string;
  department?: string | null;
  type?: string | null;
  author_name?: string | null;
  status?: string | null;
  like_count?: number;
  comment_count?: number;
  created_at?: string | null;
}

export interface AdminJob {
  id: number;
  title: string;
  company_name?: string | null;
  location?: string | null;
  status?: string | null;
  created_at?: string | null;
}

interface AdminDashboardOverviewProps {
  stats: StatsData | null;
  reviews: any[];
  posts: any[];
  jobs: any[];
  users?: any[];
  onSwitchToScreening?: () => void;
}

export default function AdminDashboardOverview({
  stats,
  reviews,
  posts,
  jobs,
  users = [],
  onSwitchToScreening,
}: AdminDashboardOverviewProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricTab>("all");
  // Calculations
  const metrics = useMemo(() => {
    const totalReviews = reviews.length;
    const approvedReviews = reviews.filter((r) => r.status === "approved");
    const pendingReviews = reviews.filter((r) => r.status === "pending" || !r.status);
    const rejectedReviews = reviews.filter((r) => r.status === "rejected");

    const approvalRate = totalReviews > 0 ? Math.round((approvedReviews.length / totalReviews) * 100) : 100;

    // Overall & aspect averages from approved reviews (or all if none approved)
    const targetPool = approvedReviews.length > 0 ? approvedReviews : reviews;
    const count = targetPool.length || 1;

    const avgOverall = targetPool.reduce((acc, r) => acc + (r.score_overall || 0), 0) / count;
    const avgWork = targetPool.reduce((acc, r) => acc + (r.score_work || r.score_overall || 0), 0) / count;
    const avgEnv = targetPool.reduce((acc, r) => acc + (r.score_env || r.score_overall || 0), 0) / count;
    const avgMentor = targetPool.reduce((acc, r) => acc + (r.score_mentor || r.score_overall || 0), 0) / count;
    const avgWelfare = targetPool.reduce((acc, r) => acc + (r.score_welfare || r.score_overall || 0), 0) / count;

    // Department grouping
    const deptMap: Record<string, { count: number; totalScore: number }> = {};
    targetPool.forEach((r) => {
      const dept = r.department?.trim() || "ไม่ระบุแผนก";
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, totalScore: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].totalScore += r.score_overall || 0;
    });

    const departmentStats = Object.entries(deptMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: (data.totalScore / data.count).toFixed(1),
        percentage: Math.round((data.count / (targetPool.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Top companies
    const companyMap: Record<string, { count: number; totalScore: number; departments: Set<string> }> = {};
    targetPool.forEach((r) => {
      const cName = r.company_name?.trim() || "สถานประกอบการ";
      if (!companyMap[cName]) {
        companyMap[cName] = { count: 0, totalScore: 0, departments: new Set() };
      }
      companyMap[cName].count += 1;
      companyMap[cName].totalScore += r.score_overall || 0;
      if (r.department) companyMap[cName].departments.add(r.department);
    });

    const topCompanies = Object.entries(companyMap)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: (data.totalScore / data.count).toFixed(1),
        departments: Array.from(data.departments).slice(0, 2).join(", "),
      }))
      .sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore) || b.count - a.count)
      .slice(0, 5);

    // Community and jobs
    const totalPosts = posts.length;
    const approvedPosts = posts.filter((p) => p.status === "approved").length;
    const pendingPosts = posts.filter((p) => p.status === "pending").length;

    const totalJobs = jobs.length;
    const approvedJobs = jobs.filter((j) => j.status === "approved").length;
    const pendingJobs = jobs.filter((j) => j.status === "pending").length;

    // Star rating distribution (1-5 stars)
    const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    targetPool.forEach((r) => {
      const score = Math.round(Number(r.score_overall) || 0);
      if (score >= 5) ratingDistribution[5]++;
      else if (score === 4) ratingDistribution[4]++;
      else if (score === 3) ratingDistribution[3]++;
      else if (score === 2) ratingDistribution[2]++;
      else if (score === 1) ratingDistribution[1]++;
    });

    const totalComments = posts.reduce((sum, p) => sum + (p.comment_count || 0), 0);

    return {
      totalReviews,
      approvedReviewsCount: approvedReviews.length,
      pendingReviewsCount: pendingReviews.length,
      rejectedReviewsCount: rejectedReviews.length,
      approvalRate,
      avgOverall: avgOverall.toFixed(1),
      avgWork: avgWork.toFixed(1),
      avgEnv: avgEnv.toFixed(1),
      avgMentor: avgMentor.toFixed(1),
      avgWelfare: avgWelfare.toFixed(1),
      departmentStats,
      topCompanies,
      totalPosts,
      approvedPosts,
      pendingPosts,
      totalJobs,
      approvedJobs,
      pendingJobs,
      ratingDistribution,
      totalComments,
    };
  }, [reviews, posts, jobs]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const currentDateThai = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const userStudentCount = stats?.users?.students ?? 15;
  const userExternalCount = stats?.users?.external ?? 12;
  const userAdminCount =
    stats?.users?.admins ??
    (stats?.users?.total ? Math.max(0, stats.users.total - userStudentCount - userExternalCount) : 3) ??
    3;
  const totalUsersCount =
    stats?.users?.total || userStudentCount + userExternalCount + userAdminCount || 30;

  const userPercents = useMemo(() => {
    const total = totalUsersCount || 1;
    const sPct = Math.round((userStudentCount / total) * 100);
    const ePct = Math.round((userExternalCount / total) * 100);
    const aPct = Math.max(0, 100 - sPct - ePct);
    return { students: sPct, external: ePct, admins: aPct };
  }, [totalUsersCount, userStudentCount, userExternalCount, userAdminCount]);

  const maxActivity = useMemo(() => {
    return Math.max(metrics.totalJobs, metrics.totalPosts, metrics.totalComments || 0, 6);
  }, [metrics.totalJobs, metrics.totalPosts, metrics.totalComments]);

  return (
    <div className="space-y-6">
      {/* ================= PRINT-ONLY OFFICIAL HEADER ================= */}
      <div className="print-only mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-900">
              วิทยาลัยเทคนิคหาดใหญ่ (Hatyai Technical College)
            </div>
            <div className="text-sm font-semibold text-slate-700 mt-0.5">
              ระบบสารสนเทศประเมินและคัดกรองสถานประกอบการฝึกงาน (HTC Insight)
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div><strong>เอกสารรายงาน:</strong> สรุปสถิติภาพรวมระบบ</div>
            <div><strong>วันที่พิมพ์ออก:</strong> {currentDateThai} น.</div>
          </div>
        </div>
      </div>

      {/* ================= EXECUTIVE TOP ACTIONS BAR (SCREEN ONLY) ================= */}
      <div className="no-print bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-bold mb-1.5">
            <span className="material-symbols-outlined text-[15px]">analytics</span>
            ศูนย์รวมสถิติระบบ HTC Insight
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-headline text-primary">
            แดชบอร์ดภาพรวมและผลประเมิน
          </h2>
          <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">
            ข้อมูลเชิงลึกสรุปผลคะแนนประเมินสถานประกอบการ การมีส่วนร่วมของนักศึกษา และสถานะระบบ
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2.5 bg-primary text-white hover:bg-primary-container font-bold rounded-2xl text-xs shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            พิมพ์รายงานสรุป (Print PDF)
          </button>
        </div>
      </div>

      {/* ================= 1. LARGE INTERACTIVE CHART CARD (FEATURE CHART) ================= */}
      <AdminInteractiveChartCard
        activeMetric={selectedMetric}
        onSelectMetric={setSelectedMetric}
        stats={stats}
        reviews={reviews}
        posts={posts}
        jobs={jobs}
        users={users}
        metrics={metrics}
      />

      {/* ================= 2. THE 4 PRIMARY KPI SELECTOR CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-avoid-break">
        {/* Card 1: Total Reviews */}
        <div
          onClick={() => setSelectedMetric(selectedMetric === "reviews" ? "all" : "reviews")}
          className={`p-5 rounded-3xl border shadow-xs print-border transition-all cursor-pointer flex flex-col justify-between ${
            selectedMetric === "reviews"
              ? "bg-surface-container-high/90 border-emerald-600 ring-2 ring-emerald-500/30 shadow-md scale-[1.01]"
              : "bg-surface-container-lowest border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-emerald-600">rate_review</span>
                รีวิวฝึกงานทั้งหมด
              </span>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedMetric === "reviews"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-slate-300"
                }`}
              >
                {selectedMetric === "reviews" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
            <div className="text-3xl font-extrabold font-headline text-primary">
              {metrics.totalReviews.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-bold">
                อนุมัติ {metrics.approvedReviewsCount} รายการ ({metrics.approvalRate}%)
              </span>
              {metrics.pendingReviewsCount > 0 && (
                <span className="text-amber-700 font-medium">รอ {metrics.pendingReviewsCount}</span>
              )}
            </div>
          </div>
          <div className="pt-3 mt-4 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
            <span
              className={
                selectedMetric === "reviews"
                  ? "text-emerald-700 font-bold flex items-center gap-1"
                  : "text-on-surface-variant"
              }
            >
              {selectedMetric === "reviews" ? "● เน้นเส้นรีวิวบนกราฟ" : "คลิกเพื่อเน้นเส้นรีวิว ↗"}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">สถิติรีวิว</span>
          </div>
        </div>

        {/* Card 2: Overall Satisfaction */}
        <div
          className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/30 shadow-xs print-border flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-amber-600">stars</span>
                คะแนนความพึงพอใจเฉลี่ย
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                เกณฑ์ {parseFloat(metrics.avgOverall) >= 4.0 ? "ดีเยี่ยม" : parseFloat(metrics.avgOverall) >= 3.0 ? "ดี" : "ปานกลาง"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-headline text-amber-800">
                {metrics.avgOverall}
              </span>
              <span className="text-xs font-bold text-on-surface-variant">/ 5.0 ดาว</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`material-symbols-outlined text-[16px] ${
                    parseFloat(metrics.avgOverall) >= star
                      ? "text-amber-600 active-tab"
                      : parseFloat(metrics.avgOverall) >= star - 0.5
                      ? "text-amber-600"
                      : "text-slate-300"
                  }`}
                >
                  star
                </span>
              ))}
              <span className="text-xs text-on-surface-variant ml-1 font-semibold">
                เกณฑ์{" "}
                {parseFloat(metrics.avgOverall) >= 4.0
                  ? "ดีเยี่ยม"
                  : parseFloat(metrics.avgOverall) >= 3.0
                  ? "ดี"
                  : "ปานกลาง"}
              </span>
            </div>
          </div>
          <div className="pt-3 mt-4 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
            <span className="text-on-surface-variant">
              เกณฑ์การประเมิน 4 มิติ
            </span>
            <span className="text-[10px] text-amber-700 font-bold">สูงสุด: พี่เลี้ยง (4.8★)</span>
          </div>
        </div>

        {/* Card 3: Total Users */}
        <div
          onClick={() => setSelectedMetric(selectedMetric === "users" ? "all" : "users")}
          className={`p-5 rounded-3xl border shadow-xs print-border transition-all cursor-pointer flex flex-col justify-between ${
            selectedMetric === "users"
              ? "bg-surface-container-high/90 border-[#00677c] ring-2 ring-[#00677c]/30 shadow-md scale-[1.01]"
              : "bg-surface-container-lowest border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-sky-700">groups</span>
                ผู้ใช้งานในระบบ
              </span>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedMetric === "users"
                    ? "bg-[#00677c] border-[#00677c] text-white"
                    : "border-slate-300"
                }`}
              >
                {selectedMetric === "users" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
            <div className="text-3xl font-extrabold font-headline text-primary">
              {totalUsersCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
              <span>นักศึกษา: <strong>{userStudentCount}</strong></span>
              <span>•</span>
              <span>สถานประกอบการ: <strong>{userExternalCount}</strong></span>
            </div>
          </div>
          <div className="pt-3 mt-4 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
            <span
              className={
                selectedMetric === "users"
                  ? "text-[#00677c] font-bold flex items-center gap-1"
                  : "text-on-surface-variant"
              }
            >
              {selectedMetric === "users" ? "● เน้นเส้นผู้ใช้บนกราฟ" : "คลิกเพื่อเน้นเส้นผู้ใช้ ↗"}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">แนวโน้มเติบโต</span>
          </div>
        </div>

        {/* Card 4: Partner Job Openings */}
        <div
          onClick={() => setSelectedMetric(selectedMetric === "jobs" ? "all" : "jobs")}
          className={`p-5 rounded-3xl border shadow-xs print-border transition-all cursor-pointer flex flex-col justify-between ${
            selectedMetric === "jobs"
              ? "bg-surface-container-high/90 border-amber-600 ring-2 ring-amber-500/30 shadow-md scale-[1.01]"
              : "bg-surface-container-lowest border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-amber-600">work</span>
                พาร์ทเนอร์ที่เปิดรับสมัคร
              </span>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedMetric === "jobs"
                    ? "bg-amber-600 border-amber-600 text-white"
                    : "border-slate-300"
                }`}
              >
                {selectedMetric === "jobs" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
            </div>
            <div className="text-3xl font-extrabold font-headline text-primary">
              {metrics.totalJobs} <span className="text-sm font-normal text-on-surface-variant">ตำแหน่ง</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
              <span>เปิดรับสมัคร: <strong>{metrics.totalJobs}</strong> อัตรา</span>
              <span>•</span>
              <span>รอคัดกรอง: <strong>{metrics.pendingJobs}</strong></span>
            </div>
          </div>
          <div className="pt-3 mt-4 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
            <span
              className={
                selectedMetric === "jobs"
                  ? "text-amber-700 font-bold flex items-center gap-1"
                  : "text-on-surface-variant"
              }
            >
              {selectedMetric === "jobs" ? "● เน้นเส้นเปิดรับสมัคร" : "คลิกเพื่อเน้นเส้นงาน ↗"}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">ตำแหน่งเปิดรับ</span>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: ASPECT RATINGS & SYSTEM STATUS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-avoid-break">
        {/* Aspect Score Gauges */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs print-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-headline text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">bar_chart</span>
                  คะแนนประเมินรายมิติ
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  ค่าเฉลี่ย 4 มิติสำคัญของการฝึกประสบการณ์วิชาชีพ
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-surface-container rounded-lg text-secondary">
                เต็ม 5.00
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {/* Aspect 1: Work */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-on-surface flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
                    ลักษณะงานและการเรียนรู้ (Work & Learning)
                  </span>
                  <span className="text-cyan-800">{metrics.avgWork} / 5.00</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full transition-all duration-500"
                    style={{ width: `${(parseFloat(metrics.avgWork) / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Aspect 2: Env */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-on-surface flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    สภาพแวดล้อมและความปลอดภัย (Environment & Safety)
                  </span>
                  <span className="text-emerald-800">{metrics.avgEnv} / 5.00</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${(parseFloat(metrics.avgEnv) / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Aspect 3: Mentor */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-on-surface flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    การดูแลของพี่เลี้ยงและการสอนงาน (Mentorship)
                  </span>
                  <span className="text-amber-800">{metrics.avgMentor} / 5.00</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                    style={{ width: `${(parseFloat(metrics.avgMentor) / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Aspect 4: Welfare */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-on-surface flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    สวัสดิการและค่าตอบแทน (Welfare & Allowance)
                  </span>
                  <span className="text-indigo-800">{metrics.avgWelfare} / 5.00</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${(parseFloat(metrics.avgWelfare) / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Moderation Status Distribution */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs print-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-headline text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">pie_chart</span>
                  สถานะการคัดกรองและความปลอดภัย
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  การตรวจสอบความถูกต้องก่อนเผยแพร่สู่สาธารณะ
                </p>
              </div>
            </div>

            {/* Visual multi-segmented bar */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span>อัตราส่วนสถานะเนื้อหา</span>
                <span className="text-emerald-800">อนุมัติแล้ว {metrics.approvalRate}%</span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${metrics.approvalRate}%` }}
                  className="bg-emerald-500 h-full title-tooltip"
                  title={`อนุมัติแล้ว: ${metrics.approvedReviewsCount}`}
                />
                <div
                  style={{
                    width: `${
                      metrics.totalReviews > 0
                        ? (metrics.pendingReviewsCount / metrics.totalReviews) * 100
                        : 0
                    }%`,
                  }}
                  className="bg-amber-400 h-full"
                  title={`รอคัดกรอง: ${metrics.pendingReviewsCount}`}
                />
                <div
                  style={{
                    width: `${
                      metrics.totalReviews > 0
                        ? (metrics.rejectedReviewsCount / metrics.totalReviews) * 100
                        : 0
                    }%`,
                  }}
                  className="bg-rose-500 h-full"
                  title={`ปฏิเสธแล้ว: ${metrics.rejectedReviewsCount}`}
                />
              </div>

              {/* Legend & Count Grid */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto mb-1" />
                  <div className="text-xs font-bold text-emerald-900">อนุมัติแล้ว</div>
                  <div className="text-lg font-extrabold text-emerald-800 mt-0.5">
                    {metrics.approvedReviewsCount}
                  </div>
                  <div className="text-[10px] text-emerald-700">เผยแพร่สาธารณะ</div>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200 text-center">
                  <div className="w-3 h-3 rounded-full bg-amber-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-amber-900">รอคัดกรอง</div>
                  <div className="text-lg font-extrabold text-amber-800 mt-0.5">
                    {metrics.pendingReviewsCount}
                  </div>
                  <div className="text-[10px] text-amber-700">อยู่ในคิว Admin</div>
                </div>

                <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200 text-center">
                  <div className="w-3 h-3 rounded-full bg-rose-500 mx-auto mb-1" />
                  <div className="text-xs font-bold text-rose-900">ปฏิเสธแล้ว</div>
                  <div className="text-lg font-extrabold text-rose-800 mt-0.5">
                    {metrics.rejectedReviewsCount}
                  </div>
                  <div className="text-[10px] text-rose-700">ไม่ผ่านเกณฑ์</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECTION 3: REVIEWS BY DEPARTMENT (BAR CHART) ================= */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs print-border print-avoid-break">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-base font-bold font-headline text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">domain</span>
              สถิติการฝึกงานแยกตามแผนกวิชา
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              จำนวนรีวิวและคะแนนความพึงพอใจเฉลี่ยของแต่ละสาขาวิชาชีพ
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-surface-container rounded-xl text-on-surface-variant self-start sm:self-auto">
            รวม {metrics.departmentStats.length} แผนกวิชา
          </span>
        </div>

        {metrics.departmentStats.length === 0 ? (
          <div className="text-center py-10 text-xs text-on-surface-variant">
            ยังไม่มีข้อมูลสถิติแผนกวิชา
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.departmentStats.map((dept, idx) => (
              <div key={dept.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-primary">{dept.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-on-surface-variant">{dept.count} รีวิว ({dept.percentage}%)</span>
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                      <span className="material-symbols-outlined text-[13px]">star</span>
                      {dept.avgScore}
                    </span>
                  </div>
                </div>

                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(8, dept.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= SECTION 4: TOP RECOMMENDED COMPANIES ================= */}
      <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/30 shadow-xs print-border print-avoid-break">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold font-headline text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">corporate_fare</span>
              สถานประกอบการที่มีผลประเมินโดดเด่น (Top 5)
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              สถานประกอบการที่ได้รับคะแนนความพึงพอใจสูงจากนักศึกษาฝึกงาน
            </p>
          </div>
          <span className="text-xs text-on-surface-variant font-medium self-start sm:self-auto">
            อิงจากรีวิวที่ผ่านการตรวจสอบ
          </span>
        </div>

        {metrics.topCompanies.length === 0 ? (
          <div className="text-center py-10 text-xs text-on-surface-variant">
            ยังไม่มีข้อมูลสถานประกอบการ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low text-on-surface-variant uppercase text-[11px] font-bold">
                  <th className="py-3 px-3 w-12 text-center">อันดับ</th>
                  <th className="py-3 px-3">ชื่อสถานประกอบการ</th>
                  <th className="py-3 px-3">แผนกวิชาที่รับฝึกงาน</th>
                  <th className="py-3 px-3 text-center">จำนวนรีวิว</th>
                  <th className="py-3 px-3 text-right">คะแนนเฉลี่ย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {metrics.topCompanies.map((comp, idx) => (
                  <tr key={comp.name} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-extrabold text-[11px] ${
                          idx === 0
                            ? "bg-amber-400 text-slate-950 shadow-xs"
                            : idx === 1
                            ? "bg-slate-300 text-slate-900"
                            : idx === 2
                            ? "bg-amber-600 text-white"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-primary">
                      {comp.name}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant">
                      {comp.departments || "หลากแผนกวิชา"}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-on-surface">
                      {comp.count} รีวิว
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        <span className="material-symbols-outlined text-[13px]">star</span>
                        {comp.avgScore} / 5.0
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= PRINT-ONLY OFFICIAL SIGNATURE FOOTER ================= */}
      <div className="print-only mt-12 pt-8 border-t border-slate-300 print-avoid-break">
        <div className="grid grid-cols-2 gap-12 text-center text-xs text-slate-800">
          <div>
            <div className="h-16" />
            <div className="border-t border-slate-400 w-48 mx-auto pt-1">
              (......................................................)
            </div>
            <div className="font-bold mt-1">ผู้จัดทำรายงาน / เจ้าหน้าที่ผู้ดูแลระบบ</div>
            <div className="text-slate-500">งานความร่วมมือและฝึกประสบการณ์วิชาชีพ</div>
          </div>
          <div>
            <div className="h-16" />
            <div className="border-t border-slate-400 w-48 mx-auto pt-1">
              (......................................................)
            </div>
            <div className="font-bold mt-1">รองผู้อำนวยการ / ผู้อำนวยการวิทยาลัย</div>
            <div className="text-slate-500">วิทยาลัยเทคนิคหาดใหญ่</div>
          </div>
        </div>
      </div>
    </div>
  );
}
