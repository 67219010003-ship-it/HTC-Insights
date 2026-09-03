"use client";

import { useEffect, useState, useCallback } from "react";
import { isAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import AdminDashboardOverview from "@/components/admin/AdminDashboardOverview";
import { api } from "@/lib/api";

interface StatsData {
  users: { total: number; students: number; external: number; admins: number };
  reviews: { total: number; pending: number };
  jobs: { total: number; pending: number };
  community: { posts: number; pending_posts: number; pending_reports: number };
  upgrades: { pending: number };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, revRes, postRes, jobRes, upgRes, repRes, comRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/reviews?status=all"),
        api.get("/admin/posts"),
        api.get("/admin/jobs"),
        api.get("/admin/upgrades?status=pending"),
        api.get("/admin/reports?status=pending"),
        api.get("/admin/comments"),
      ]);

      const sData = statsRes.data;
      setStats(sData);
      setReviews(revRes.data || []);
      setPosts(postRes.data || []);
      setJobs(jobRes.data || []);

      const pendingRevs = (revRes.data || []).filter((r: any) => r.status === "pending").length;
      const pendingPosts = (postRes.data || []).filter((p: any) => p.status === "pending").length;
      const pendingJobs = (jobRes.data || []).filter((j: any) => j.status === "pending").length;
      const pendingUpgrades = (upgRes.data || []).length;
      const pendingReports = (repRes.data || []).length;
      const pendingComments = (comRes.data || []).filter((c: any) => c.status === "pending").length;

      const sumPending =
        pendingRevs + pendingPosts + pendingJobs + pendingUpgrades + pendingReports + pendingComments;
      setTotalPending(sumPending);
    } catch (err: any) {
      console.error("Failed to load admin dashboard data:", err);
      setMsg({
        text: err.response?.data?.detail || "ไม่สามารถดึงข้อมูลสรุปแดชบอร์ดได้ กรุณาลองใหม่อีกครั้ง",
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!isAdmin()) {
      router.replace("/");
      return;
    }
    setAuthorized(true);
    fetchDashboardData();
  }, [fetchDashboardData, router]);

  if (!mounted || !authorized) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-xl">
      {/* Top Admin Navigation Suite Header */}
      <AdminHeader
        title="แดชบอร์ดภาพรวมระบบหลังบ้าน"
        subtitle="สรุปสถิติภาพรวม ผลประเมินความพึงพอใจ 4 มิติ และรายงานสถานะระบบฝึกงาน HTC Insight"
        pendingCount={totalPending}
        onRefresh={fetchDashboardData}
        refreshing={loading}
      />

      <div className="max-w-container-max mx-auto px-margin-mobile space-y-lg">
        {/* Flash Message Banner */}
        {msg && (
          <div
            className={`p-4 rounded-2xl text-xs md:text-sm font-semibold flex items-center justify-between shadow-xs border transition-all ${
              msg.isError
                ? "bg-rose-50 text-rose-900 border-rose-200"
                : "bg-emerald-50 text-emerald-900 border-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px]">
                {msg.isError ? "error" : "check_circle"}
              </span>
              <span>{msg.text}</span>
            </div>
            <button
              onClick={() => setMsg(null)}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ================= MAIN DASHBOARD AREA ================= */}
        {loading ? (
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-16 text-center space-y-3 shadow-xs">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-sm font-bold text-on-surface">กำลังโหลดข้อมูลแดชบอร์ดภาพรวม...</p>
            <p className="text-xs text-on-surface-variant">โปรดรอสักครู่ ระบบกำลังประมวลผลข้อมูลสถิติ</p>
          </div>
        ) : (
          <AdminDashboardOverview
            stats={stats}
            reviews={reviews}
            posts={posts}
            jobs={jobs}
            onSwitchToScreening={() => router.push("/admin/screening")}
          />
        )}
      </div>
    </div>
  );
}
