"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { isAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import RejectReasonModal from "@/components/RejectReasonModal";
import RevealAnonymousModal from "@/components/RevealAnonymousModal";
import AdminHeader from "@/components/AdminHeader";
import Pagination from "@/components/Pagination";
import AdminDetailModal from "@/components/AdminDetailModal";
import { api } from "@/lib/api";

interface StatsData {
  users: { total: number; students: number; external: number; admins: number };
  reviews: { total: number; pending: number };
  jobs: { total: number; pending: number };
  community: { posts: number; pending_posts: number; pending_reports: number };
  upgrades: { pending: number };
}

interface AdminReview {
  id: number;
  company_name: string;
  real_author: string;
  real_email: string;
  is_anonymous?: boolean;
  score_overall: number;
  text_work: string;
  text_pros?: string;
  text_cons?: string;
  photo_urls?: string[];
  status: string;
  rejection_reason?: string;
  created_at: string;
}

interface AdminPost {
  id: number;
  author_name: string;
  author_email?: string;
  author_department?: string;
  is_anonymous?: boolean;
  type: string;
  department?: string;
  title: string;
  content: string;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

interface AdminComment {
  id: number;
  post_id: number;
  post_title?: string;
  user_id: number;
  author_name: string;
  author_email?: string;
  author_department?: string;
  content: string;
  is_anonymous?: boolean;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

interface AdminJob {
  id: number;
  title: string;
  employer_name: string;
  poster_email?: string;
  employer_email?: string;
  contact_email?: string;
  employer_phone?: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  line_id?: string;
  department?: string;
  daily_allowance?: number;
  description: string;
  location: string | null;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

interface PendingUpgrade {
  id: number;
  user_name: string;
  user_email: string;
  student_id: string;
  department: string;
  card_image_url?: string;
  created_at: string;
}

interface PendingReport {
  id: number;
  reporter_name: string;
  reporter_email?: string;
  reason: string;
  target_type?: string;
  target_type_th?: string;
  target_id?: number;
  target_title?: string;
  target_content?: string;
  is_anonymous?: boolean;
  post_id?: number | null;
  post_title?: string;
  review_id?: number | null;
  comment_id?: number | null;
  job_id?: number | null;
  company_id?: number | null;
  company_name?: string;
  status?: string;
  created_at: string;
}

interface AuditLogItem {
  id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: number;
  reason: string | null;
  created_at: string;
}

type ItemType = "review" | "post" | "job" | "upgrade" | "comment";
type TabType = "moderation" | "all_reviews" | "all_posts" | "all_jobs" | "reports" | "audit";
type ModerationCategory = "all" | "review" | "post" | "job" | "upgrade" | "comment";

interface RejectTarget {
  type: ItemType;
  id: number;
  title: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("moderation");
  const [modCategory, setModCategory] = useState<ModerationCategory>("all");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("all");
  const [postSearch, setPostSearch] = useState("");
  const [postStatusFilter, setPostStatusFilter] = useState<string>("all");
  const [jobSearch, setJobSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");

  // Lists for moderation and management
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [pendingUpgrades, setPendingUpgrades] = useState<PendingUpgrade[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // Pagination states
  const [pageMod, setPageMod] = useState(1);
  const [pageAllReviews, setPageAllReviews] = useState(1);
  const [pageAllPosts, setPageAllPosts] = useState(1);
  const [pageAllJobs, setPageAllJobs] = useState(1);
  const [pageReports, setPageReports] = useState(1);
  const [pageAuditLogs, setPageAuditLogs] = useState(1);
  const pageSize = 6;

  // Modals & Action status
  const [detailModalItem, setDetailModalItem] = useState<{ type: "review" | "post" | "job" | "upgrade" | "report" | "employer" | "comment"; title?: string; data: any } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [revealTargetId, setRevealTargetId] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState<{ type: string; id: number } | null>(null);
  const [actionLoading, setActionLoading] = useState<{ type: string; id: number } | null>(null);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, reviewsRes, postsRes, jobsRes, upgradesRes, reportsRes, logsRes, commentsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/reviews?status=all"),
        api.get("/admin/posts"),
        api.get("/admin/jobs"),
        api.get("/admin/upgrades?status=pending"),
        api.get("/admin/reports?status=pending"),
        api.get("/admin/audit-logs"),
        api.get("/admin/comments"),
      ]);

      setStats(statsRes.data);
      setReviews(reviewsRes.data || []);
      setPosts(postsRes.data || []);
      setJobs(jobsRes.data || []);
      setPendingUpgrades(upgradesRes.data || []);
      setPendingReports((reportsRes.data || []).filter((r: any) => r.status === "pending" || !r.status));
      setAuditLogs(logsRes.data || []);
      setComments(commentsRes.data || []);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หรือโหลดข้อมูลได้", isError: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!isAdmin()) {
      window.location.replace("/");
      return;
    }
    setAuthorized(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Admin approvals
  const handleApprove = async (type: ItemType, id: number) => {
    setActionLoading({ type, id });
    let url = "";
    if (type === "review") url = `/admin/reviews/${id}/approve`;
    else if (type === "post") url = `/admin/posts/${id}`;
    else if (type === "comment") url = `/admin/comments/${id}`;
    else if (type === "job") url = `/admin/jobs/${id}`;
    else if (type === "upgrade") url = `/admin/upgrades/${id}`;

    try {
      const res = await api.patch(url, type !== "review" ? { status: "approved" } : undefined);
      setMsg({ text: res.data.message || "อนุมัติรายการสำเร็จเรียบร้อยแล้ว" });
      fetchDashboardData();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "เกิดข้อผิดพลาดในการอนุมัติ", isError: true });
    } finally {
      setActionLoading(null);
    }
  };

  // Admin rejections
  const handleConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setRejecting(true);

    const { type, id } = rejectTarget;
    let url = "";
    if (type === "review") url = `/admin/reviews/${id}`;
    else if (type === "post") url = `/admin/posts/${id}`;
    else if (type === "comment") url = `/admin/comments/${id}`;
    else if (type === "job") url = `/admin/jobs/${id}`;
    else if (type === "upgrade") url = `/admin/upgrades/${id}`;

    try {
      const res = await api.patch(url, { status: "rejected", rejection_reason: reason });
      setMsg({ text: res.data.message || "ปฏิเสธรายการสำเร็จ พร้อมบันทึกเหตุผล" });
      setRejectTarget(null);
      fetchDashboardData();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "เกิดข้อผิดพลาดในการปฏิเสธ", isError: true });
    } finally {
      setRejecting(false);
    }
  };

  // Admin Deletion Function
  const handleDelete = async (type: "review" | "post" | "job" | "comment", id: number) => {
    const typeNames = { review: "รีวิว", post: "กระทู้", job: "ประกาศงาน", comment: "ความคิดเห็น" };
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ${typeNames[type]} นี้อย่างถาวรจากฐานข้อมูล?`)) {
      return;
    }
    setDeleting({ type, id });
    try {
      let res;
      if (type === "comment") {
        res = await api.delete(`/community/comments/${id}`);
      } else {
        res = await api.delete(`/admin/${type}s/${id}`);
      }
      setMsg({ text: res.data.message || "ลบข้อมูลออกจากระบบสำเร็จ" });
      fetchDashboardData();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "เกิดข้อผิดพลาดในการลบข้อมูล", isError: true });
    } finally {
      setDeleting(null);
    }
  };

  // Handle reports
  const handleResolveReport = async (reportId: number, status: string, action?: string) => {
    try {
      const res = await api.patch(`/admin/reports/${reportId}`, { status, action });
      setMsg({
        text: res.data.message || (status === "dismissed" ? "ปัดตกข้อกล่าวหาเรียบร้อยแล้ว" : "จัดการรายงานความผิดสำเร็จ"),
      });
      setPendingReports((prev) => prev.filter((r) => r.id !== reportId));
      fetchDashboardData();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "เกิดข้อผิดพลาดในการจัดการรายงาน", isError: true });
    }
  };

  const formatAuditAction = (action: string) => {
    switch (action) {
      case "approve_review":
        return { label: "อนุมัติรีวิว", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "reject_review":
        return { label: "ปฏิเสธรีวิว", color: "bg-rose-50 text-rose-800 border-rose-200" };
      case "delete_review":
        return { label: "ลบรีวิวโดยแอดมิน", color: "bg-red-50 text-red-800 border-red-200" };
      case "delete_post":
        return { label: "ลบกระทู้โดยแอดมิน", color: "bg-red-50 text-red-800 border-red-200" };
      case "delete_job":
        return { label: "ลบงานโดยแอดมิน", color: "bg-red-50 text-red-800 border-red-200" };
      case "approve_comment":
        return { label: "อนุมัติความคิดเห็น", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "reject_comment":
        return { label: "ปฏิเสธความคิดเห็น", color: "bg-rose-50 text-rose-800 border-rose-200" };
      case "delete_comment":
        return { label: "ลบความคิดเห็นโดยแอดมิน", color: "bg-red-50 text-red-800 border-red-200" };
      case "reveal_anonymous":
        return { label: "ถอดรหัสตัวตนจริง", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "approve_post":
        return { label: "อนุมัติกระทู้", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "reject_post":
        return { label: "ปฏิเสธกระทู้", color: "bg-rose-50 text-rose-800 border-rose-200" };
      case "approve_job":
        return { label: "อนุมัติตำแหน่งงาน", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "reject_job":
        return { label: "ปฏิเสธตำแหน่งงาน", color: "bg-rose-50 text-rose-800 border-rose-200" };
      case "approve_student_upgrade":
        return { label: "อนุมัติยืนยันสิทธิ์", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "reject_student_upgrade":
        return { label: "ปฏิเสธยืนยันสิทธิ์", color: "bg-rose-50 text-rose-800 border-rose-200" };
      case "update_user_role":
        return { label: "แก้ไขบทบาทผู้ใช้", color: "bg-sky-50 text-sky-800 border-sky-200" };
      case "toggle_super_admin":
        return { label: "ปรับ Super Admin", color: "bg-purple-50 text-purple-800 border-purple-200" };
      case "toggle_ban_user":
        return { label: "ระงับ/ปลดแบนผู้ใช้", color: "bg-orange-50 text-orange-800 border-orange-200" };
      default:
        return { label: action, color: "bg-surface-container text-on-surface-variant border-outline-variant/50" };
    }
  };

  const pendingReviews = reviews.filter((r) => r.status === "pending");
  const pendingPosts = posts.filter((p) => p.status === "pending");
  const pendingComments = comments.filter((c) => c.status === "pending");
  const pendingJobs = jobs.filter((j) => j.status === "pending");
  const totalPending = pendingReviews.length + pendingPosts.length + pendingComments.length + pendingJobs.length + pendingUpgrades.length;

  // Filtered Reviews
  const filteredReviews = reviews.filter((r) => {
    const matchStatus = reviewStatusFilter === "all" || r.status === reviewStatusFilter;
    const matchSearch =
      !reviewSearch.trim() ||
      r.company_name?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      r.real_author?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      r.real_email?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
      r.text_work?.toLowerCase().includes(reviewSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Filtered Posts
  const filteredPosts = posts.filter((p) => {
    const matchStatus = postStatusFilter === "all" || p.status === postStatusFilter;
    const matchSearch =
      !postSearch.trim() ||
      p.title?.toLowerCase().includes(postSearch.toLowerCase()) ||
      p.content?.toLowerCase().includes(postSearch.toLowerCase()) ||
      p.author_name?.toLowerCase().includes(postSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Filtered Jobs
  const filteredJobs = jobs.filter((j) => {
    const matchStatus = jobStatusFilter === "all" || j.status === jobStatusFilter;
    const matchSearch =
      !jobSearch.trim() ||
      j.title?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      j.employer_name?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      j.location?.toLowerCase().includes(jobSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((l) => {
    const matchAction = auditActionFilter === "all" || l.action.includes(auditActionFilter);
    const q = auditSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      l.admin_name?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.target_type?.toLowerCase().includes(q) ||
      l.reason?.toLowerCase().includes(q) ||
      l.target_id?.toString().includes(q);
    return matchAction && matchSearch;
  });

  // Filtered Moderation Items for Unified Pagination
  const filteredModList = [
    ...pendingReviews.map((r) => ({ type: "review" as const, data: r, id: `rev-${r.id}` })),
    ...pendingPosts.map((p) => ({ type: "post" as const, data: p, id: `post-${p.id}` })),
    ...pendingComments.map((c) => ({ type: "comment" as const, data: c, id: `comm-${c.id}` })),
    ...pendingJobs.map((j) => ({ type: "job" as const, data: j, id: `job-${j.id}` })),
    ...pendingUpgrades.map((u) => ({ type: "upgrade" as const, data: u, id: `upg-${u.id}` })),
  ].filter((item) => modCategory === "all" || item.type === modCategory);

  if (!mounted || !authorized) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-xl">
      {/* Top Admin Navigation Suite Header (NO SIDEBAR) */}
      <AdminHeader
        title="ระบบการจัดการข้อมูลหลังบ้าน"
        subtitle="คัดกรอง อนุมัติ และควบคุมมาตรฐานข้อมูลประสบการณ์ฝึกงานทั้งหมดของ HTC Insight"
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



        {/* ================= TOP SEGMENTED NAVIGATION TABS (NO SIDEBAR) ================= */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 p-2 rounded-2xl shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab("moderation")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label-md text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "moderation"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>คิวรออนุมัติ</span>
              {totalPending > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === "moderation"
                      ? "bg-secondary text-on-secondary"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  {totalPending}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("all_reviews")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label-md text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "all_reviews"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">rate_review</span>
              <span>รีวิวทั้งหมด</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-container-low text-on-surface-variant">
                {reviews.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("all_posts")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label-md text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "all_posts"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">forum</span>
              <span>กระทู้คอมมูนิตี้</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-container-low text-on-surface-variant">
                {posts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("all_jobs")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label-md text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "all_jobs"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">business_center</span>
              <span>ประกาศงาน</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-container-low text-on-surface-variant">
                {jobs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label-md text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "reports"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">report_problem</span>
              <span>รายงานความผิด</span>
              {pendingReports.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    activeTab === "reports"
                      ? "bg-rose-500 text-white"
                      : "bg-rose-100 text-rose-900 border border-rose-300"
                  }`}
                >
                  {pendingReports.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-label-md text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "audit"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              <span>ประวัติระบบ</span>
            </button>
          </div>
        </div>

        {/* ================= MAIN CONTENT AREA ================= */}
        {loading ? (
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-16 text-center space-y-3 shadow-xs">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-sm font-bold text-on-surface">กำลังโหลดข้อมูลระบบหลังบ้าน...</p>
            <p className="text-xs text-on-surface-variant">โปรดรอสักครู่ ระบบกำลังดึงข้อมูลล่าสุด</p>
          </div>
        ) : (
          <div className="space-y-lg">
            {/* ================= TAB 1: MODERATION QUEUE ================= */}
            {activeTab === "moderation" && (
              <div className="space-y-md">
                {/* Moderation Sub-category Filters */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
                    <button
                      onClick={() => { setModCategory("all"); setPageMod(1); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-label-md transition-all cursor-pointer ${
                        modCategory === "all"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      ทั้งหมด ({totalPending})
                    </button>
                    <button
                      onClick={() => { setModCategory("review"); setPageMod(1); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-label-md transition-all cursor-pointer ${
                        modCategory === "review"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      รีวิว ({pendingReviews.length})
                    </button>
                    <button
                      onClick={() => { setModCategory("post"); setPageMod(1); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-label-md transition-all cursor-pointer ${
                        modCategory === "post"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      กระทู้ ({pendingPosts.length})
                    </button>
                    <button
                      onClick={() => { setModCategory("comment"); setPageMod(1); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-label-md transition-all cursor-pointer ${
                        modCategory === "comment"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      ความคิดเห็น ({pendingComments.length})
                    </button>
                    <button
                      onClick={() => { setModCategory("job"); setPageMod(1); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-label-md transition-all cursor-pointer ${
                        modCategory === "job"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      ประกาศงาน ({pendingJobs.length})
                    </button>
                    <button
                      onClick={() => { setModCategory("upgrade"); setPageMod(1); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-label-md transition-all cursor-pointer ${
                        modCategory === "upgrade"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container-low"
                      }`}
                    >
                      ยืนยันนักศึกษา ({pendingUpgrades.length})
                    </button>
                  </div>

                  <span className="text-xs text-on-surface-variant font-medium">
                    มีรายการรอการตรวจสอบทั้งหมด{" "}
                    <strong className="text-primary font-bold">{totalPending}</strong> รายการ
                  </span>
                </div>

                {totalPending === 0 ? (
                  <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-16 text-center shadow-xs flex flex-col items-center justify-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-1">
                      <span className="material-symbols-outlined text-[32px]">check_circle</span>
                    </div>
                    <h3 className="text-lg font-bold font-headline-sm text-primary">
                      ไม่มีรายการรอคัดกรองในระบบ
                    </h3>
                    <p className="text-xs text-on-surface-variant max-w-md">
                      ข้อมูลรีวิว กระทู้ ตำแหน่งงาน และคำขอยืนยันสิทธิ์นักศึกษาทั้งหมดได้รับการตรวจสอบเรียบร้อยแล้ว
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
                      {filteredModList.slice((pageMod - 1) * pageSize, pageMod * pageSize).map((modItem) => {
                        if (modItem.type === "review") {
                          const rev = modItem.data as AdminReview;
                          return (
                            <div
                              key={`rev-${rev.id}`}
                              className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-3.5 flex flex-col justify-between"
                            >
                              <div className="space-y-2.5">
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-label-sm bg-primary/10 text-primary border border-primary/20">
                                        รีวิวสถานประกอบการ
                                      </span>
                                      {rev.is_anonymous && (
                                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-label-sm bg-amber-50 text-amber-800 border border-amber-200">
                                          โหมดไม่ระบุตัวตน
                                        </span>
                                      )}
                                      <span className="text-[10px] text-on-surface-variant font-mono">
                                        {rev.created_at || "-"}
                                      </span>
                                    </div>
                                    <h4 className="text-base font-bold font-headline-sm text-primary">
                                      {rev.company_name}
                                    </h4>
                                  </div>

                                  {/* Star Rating Badge */}
                                  <div className="flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-xl text-xs font-bold shrink-0">
                                    <span className="material-symbols-outlined text-[15px] text-secondary active-tab">star</span>
                                    <span>{rev.score_overall} / 5</span>
                                  </div>
                                </div>

                                {/* Author Info */}
                                <div className="text-xs text-on-surface-variant bg-surface-container-low/70 p-2.5 rounded-xl border border-outline-variant/30 flex items-center justify-between flex-wrap gap-2">
                                  <span>
                                    ผู้เขียนจริง:{" "}
                                    {rev.is_anonymous ? (
                                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-[11px]">
                                        <span className="material-symbols-outlined text-[13px]">lock</span>
                                        ไม่ระบุตัวตน (ข้อมูลถูกเข้ารหัส)
                                      </span>
                                    ) : (
                                      <>
                                        <strong className="text-on-surface">{rev.real_author}</strong> ({rev.real_email})
                                      </>
                                    )}
                                  </span>
                                  {rev.is_anonymous && (
                                    <button
                                      onClick={() => setRevealTargetId(rev.id)}
                                      className="text-[11px] font-bold text-secondary hover:underline flex items-center gap-1 cursor-pointer bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/40 hover:bg-secondary/10 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">lock_open</span>
                                      ถอดรหัสตัวตน (Audit Log)
                                    </button>
                                  )}
                                </div>

                                {/* Review Content */}
                                <div className="space-y-1.5 text-xs text-on-surface">
                                  <p className="font-semibold text-on-surface-variant text-[11px]">ใจความสำคัญของงาน:</p>
                                  <p className="bg-surface-container-low/40 p-3 rounded-xl border border-outline-variant/20 italic leading-relaxed">
                                    "{rev.text_work}"
                                  </p>
                                </div>

                                {/* Pros & Cons Preview */}
                                {(rev.text_pros || rev.text_cons) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                    {rev.text_pros && (
                                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-150 text-emerald-900">
                                        <span className="font-bold block text-[11px] mb-0.5 text-emerald-800">
                                          + ข้อดี:
                                        </span>
                                        <span className="line-clamp-2">{rev.text_pros}</span>
                                      </div>
                                    )}
                                    {rev.text_cons && (
                                      <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-150 text-rose-900">
                                        <span className="font-bold block text-[11px] mb-0.5 text-rose-800">
                                          - ข้อเสีย / ข้อควรระวัง:
                                        </span>
                                        <span className="line-clamp-2">{rev.text_cons}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Attached Photos */}
                                {rev.photo_urls && rev.photo_urls.length > 0 && (
                                  <div className="flex gap-2 pt-1 overflow-x-auto">
                                    {rev.photo_urls.map((url, idx) => (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="shrink-0 group relative rounded-lg overflow-hidden border border-outline-variant/40"
                                      >
                                        <img
                                          src={url}
                                          alt="Attached evidence"
                                          className="w-16 h-16 object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDetailModalItem({
                                      type: "review",
                                      title: `รีวิว ${rev.company_name}`,
                                      data: rev,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-secondary">visibility</span>
                                  ดูฉบับเต็ม
                                </button>
                                <button
                                  onClick={() =>
                                    setRejectTarget({
                                      type: "review",
                                      id: rev.id,
                                      title: `รีวิว ${rev.company_name} โดย ${rev.real_author}`,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">close</span>
                                  ปฏิเสธ
                                </button>
                                <button
                                  onClick={() => handleApprove("review", rev.id)}
                                  disabled={actionLoading?.type === "review" && actionLoading?.id === rev.id}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[15px]">check</span>
                                  อนุมัติรีวิว
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (modItem.type === "post") {
                          const post = modItem.data as AdminPost;
                          return (
                            <div
                              key={`post-${post.id}`}
                              className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-3.5 flex flex-col justify-between"
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-label-sm bg-secondary/10 text-secondary border border-secondary/20">
                                    กระทู้คอมมูนิตี้ ({post.type || "ทั่วไป"})
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant font-mono">
                                    {post.created_at || "-"}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold font-headline-sm text-primary line-clamp-2">
                                  {post.title}
                                </h4>
                                <p className="text-xs text-on-surface-variant bg-surface-container-low/40 p-3 rounded-xl border border-outline-variant/20 leading-relaxed line-clamp-3">
                                  {post.content}
                                </p>
                                <div className="text-xs text-on-surface-variant bg-surface-container-low/50 p-2.5 rounded-xl border border-outline-variant/20 space-y-0.5">
                                  <p>
                                    โพสต์โดย: <strong className="text-on-surface">{post.author_name}</strong>
                                    {post.author_email && (
                                      <span className="font-mono text-primary font-bold ml-1.5">({post.author_email})</span>
                                    )}
                                  </p>
                                  {post.author_department && (
                                    <p className="text-[11px]">แผนก: <strong>{post.author_department}</strong></p>
                                  )}
                                </div>
                              </div>

                              <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDetailModalItem({
                                      type: "post",
                                      title: post.title,
                                      data: post,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-secondary">visibility</span>
                                  ดูฉบับเต็ม
                                </button>
                                <button
                                  onClick={() =>
                                    setRejectTarget({
                                      type: "post",
                                      id: post.id,
                                      title: `กระทู้ ${post.title}`,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">close</span>
                                  ปฏิเสธ
                                </button>
                                <button
                                  onClick={() => handleApprove("post", post.id)}
                                  disabled={actionLoading?.type === "post" && actionLoading?.id === post.id}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[15px]">check</span>
                                  อนุมัติกระทู้
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (modItem.type === "comment") {
                          const comm = modItem.data as AdminComment;
                          return (
                            <div
                              key={`comm-${comm.id}`}
                              className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-3.5 flex flex-col justify-between"
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-label-sm bg-sky-50 text-sky-800 border border-sky-200">
                                    ความคิดเห็นในกระทู้
                                  </span>
                                  {comm.is_anonymous ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      ไม่ระบุชื่อ
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-container text-on-surface-variant">
                                      ระบุชื่อ
                                    </span>
                                  )}
                                  <span className="text-[10px] text-on-surface-variant font-mono">
                                    {comm.created_at || "-"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[11px] text-on-surface-variant block">ตอบกลับในกระทู้:</span>
                                  <h4 className="text-sm font-bold font-headline-sm text-primary line-clamp-1">
                                    {comm.post_title || "กระทู้ในคอมมูนิตี้"}
                                  </h4>
                                </div>
                                <p className="text-xs text-on-surface bg-surface-container-low/50 p-3 rounded-xl border border-outline-variant/20 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                                  {comm.content}
                                </p>
                                <div className="text-xs text-on-surface-variant space-y-0.5">
                                  <p>
                                    ผู้เขียน: <strong className="text-primary font-bold">{comm.author_name}</strong>
                                    {comm.author_email && (
                                      <span className="font-mono text-primary font-bold ml-1.5">({comm.author_email})</span>
                                    )}
                                  </p>
                                  {comm.author_department && (
                                    <p className="text-[11px]">แผนก: <strong>{comm.author_department}</strong></p>
                                  )}
                                </div>
                              </div>

                              <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDetailModalItem({
                                      type: "comment",
                                      title: `ความคิดเห็นในกระทู้: ${comm.post_title || ""}`,
                                      data: comm,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-secondary">visibility</span>
                                  ดูฉบับเต็ม
                                </button>
                                <button
                                  onClick={() =>
                                    setRejectTarget({
                                      type: "comment",
                                      id: comm.id,
                                      title: `ความคิดเห็นของ ${comm.author_name} ในกระทู้ ${comm.post_title || ""}`,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">close</span>
                                  ปฏิเสธ
                                </button>
                                <button
                                  onClick={() => handleApprove("comment", comm.id)}
                                  disabled={actionLoading?.type === "comment" && actionLoading?.id === comm.id}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[15px]">check</span>
                                  อนุมัติความคิดเห็น
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (modItem.type === "job") {
                          const job = modItem.data as AdminJob;
                          return (
                            <div
                              key={`job-${job.id}`}
                              className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-3.5 flex flex-col justify-between"
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-label-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    ประกาศรับสมัครงาน
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant font-mono">
                                    {job.created_at || "-"}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold font-headline-sm text-primary">
                                  {job.title}
                                </h4>
                                <div className="text-xs space-y-1 text-on-surface-variant bg-surface-container-low/50 p-3 rounded-xl border border-outline-variant/20">
                                  <p>
                                    สถานประกอบการ: <strong className="text-primary font-bold">{job.employer_name}</strong>
                                  </p>
                                  <p>
                                    อีเมลบัญชีผู้ลงประกาศ: <strong className="text-on-surface font-mono">{job.poster_email || job.employer_email || job.email || "-"}</strong>
                                  </p>
                                  {job.contact_email && job.contact_email !== (job.poster_email || job.employer_email) && (
                                    <p>
                                      อีเมลติดต่อรับสมัคร: <strong className="text-secondary font-mono">{job.contact_email}</strong>
                                    </p>
                                  )}
                                  {(job.phone || job.employer_phone) && (
                                    <p>
                                      เบอร์โทรศัพท์: <strong className="text-on-surface">{job.phone || job.employer_phone}</strong>
                                      {job.line_id && <span className="ml-2 font-mono">LINE: <strong>{job.line_id}</strong></span>}
                                    </p>
                                  )}
                                  {job.contact_person && (
                                    <p>
                                      ผู้ติดต่อ/HR: <strong className="text-on-surface">{job.contact_person}</strong>
                                    </p>
                                  )}
                                  {job.department && (
                                    <p>
                                      แผนกวิชา: <strong className="text-secondary">{job.department}</strong>
                                      {job.daily_allowance ? <span className="ml-2">เบี้ยเลี้ยง: <strong>฿{job.daily_allowance}/วัน</strong></span> : null}
                                    </p>
                                  )}
                                </div>
                                <p className="text-xs text-on-surface-variant bg-surface-container-low/40 p-3 rounded-xl border border-outline-variant/20 leading-relaxed line-clamp-3">
                                  {job.description}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDetailModalItem({
                                      type: "job",
                                      title: job.title,
                                      data: job,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-secondary">visibility</span>
                                  ดูฉบับเต็ม
                                </button>
                                <button
                                  onClick={() =>
                                    setRejectTarget({
                                      type: "job",
                                      id: job.id,
                                      title: `ตำแหน่งงาน ${job.title} (${job.employer_name})`,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">close</span>
                                  ปฏิเสธ
                                </button>
                                <button
                                  onClick={() => handleApprove("job", job.id)}
                                  disabled={actionLoading?.type === "job" && actionLoading?.id === job.id}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[15px]">check</span>
                                  อนุมัติประกาศงาน
                                </button>
                              </div>
                            </div>
                          );
                        }

                        if (modItem.type === "upgrade") {
                          const upg = modItem.data as PendingUpgrade;
                          return (
                            <div
                              key={`upg-${upg.id}`}
                              className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all space-y-3.5 flex flex-col justify-between"
                            >
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold font-label-sm bg-purple-50 text-purple-800 border border-purple-200">
                                    คำขอยืนยันสิทธิ์นักศึกษา
                                  </span>
                                  <span className="text-[10px] text-on-surface-variant font-mono">
                                    {upg.created_at || "-"}
                                  </span>
                                </div>
                                <h4 className="text-base font-bold font-headline-sm text-primary">
                                  {upg.user_name}
                                </h4>
                                <div className="text-xs space-y-1 text-on-surface-variant bg-surface-container-low/50 p-3 rounded-xl border border-outline-variant/20">
                                  <p>
                                    อีเมล: <strong className="text-on-surface font-mono">{upg.user_email}</strong>
                                  </p>
                                  <p>
                                    รหัสนักศึกษา: <strong className="text-primary font-mono">{upg.student_id}</strong>
                                  </p>
                                  <p>
                                    แผนกวิชา: <strong className="text-on-surface">{upg.department}</strong>
                                  </p>
                                </div>
                                {upg.card_image_url && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImageUrl(upg.card_image_url || null)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary bg-secondary/10 hover:bg-secondary/20 px-3 py-1.5 rounded-xl border border-secondary/20 transition-all cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">id_card</span>
                                    ดูรูปภาพบัตรประจำตัวนักศึกษา 🔍
                                  </button>
                                )}
                              </div>

                              <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDetailModalItem({
                                      type: "upgrade",
                                      title: `คำขอยืนยันสิทธิ์ของ ${upg.user_name}`,
                                      data: upg,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[16px] text-secondary">visibility</span>
                                  ดูฉบับเต็ม
                                </button>
                                <button
                                  onClick={() =>
                                    setRejectTarget({
                                      type: "upgrade",
                                      id: upg.id,
                                      title: `คำขอยืนยันสิทธิ์ของ ${upg.user_name}`,
                                    })
                                  }
                                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[15px]">close</span>
                                  ปฏิเสธ
                                </button>
                                <button
                                  onClick={() => handleApprove("upgrade", upg.id)}
                                  disabled={actionLoading?.type === "upgrade" && actionLoading?.id === upg.id}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[15px]">check</span>
                                  อนุมัติสิทธิ์นักศึกษา
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>

                    {filteredModList.length > pageSize && (
                      <div className="p-4 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                        <span className="text-xs text-on-surface-variant">
                          แสดง {(pageMod - 1) * pageSize + 1} - {Math.min(pageMod * pageSize, filteredModList.length)} จาก {filteredModList.length} รายการ
                        </span>
                        <Pagination
                          currentPage={pageMod}
                          totalPages={Math.ceil(filteredModList.length / pageSize) || 1}
                          onPageChange={(page) => setPageMod(page)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 2: MANAGE ALL REVIEWS ================= */}
            {activeTab === "all_reviews" && (
              <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
                  <div>
                    <h3 className="text-lg font-bold font-headline-sm text-primary">
                      จัดการรีวิวทั้งหมดในระบบ ({reviews.length})
                    </h3>
                    <p className="text-xs text-on-surface-variant font-body-sm">
                      ค้นหา กรองสถานะ และลบรีวิวที่ผิดนโยบาย
                    </p>
                  </div>

                  {/* Search & Status Filter */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อบริษัท, ผู้เขียน..."
                        value={reviewSearch}
                        onChange={(e) => setReviewSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-medium w-48 sm:w-64"
                      />
                    </div>

                    <select
                      value={reviewStatusFilter}
                      onChange={(e) => setReviewStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
                    >
                      <option value="all">ทุกสถานะ</option>
                      <option value="approved">อนุมัติแล้ว (Approved)</option>
                      <option value="pending">รออนุมัติ (Pending)</option>
                      <option value="rejected">ปฏิเสธ (Rejected)</option>
                    </select>
                  </div>
                </div>

                {filteredReviews.length === 0 ? (
                  <div className="py-12 text-center text-xs text-on-surface-variant font-semibold">
                    ไม่พบรายการรีวิวที่ตรงกับเงื่อนไขค้นหา
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 font-bold font-label-md text-on-surface">
                          <th className="py-3.5 px-3">วัน/เวลา</th>
                          <th className="py-3.5 px-3">สถานประกอบการ</th>
                          <th className="py-3.5 px-3">คะแนน</th>
                          <th className="py-3.5 px-3">ผู้เขียนจริง</th>
                          <th className="py-3.5 px-3">เนื้อหารีวิว</th>
                          <th className="py-3.5 px-3">สถานะ</th>
                          <th className="py-3.5 px-3 text-right">ดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                        {filteredReviews.slice((pageAllReviews - 1) * pageSize, pageAllReviews * pageSize).map((rev) => (
                          <tr key={rev.id} className="hover:bg-surface-container-low/40 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap text-on-surface-variant font-mono">
                              {rev.created_at || "-"}
                            </td>
                            <td className="py-3 px-3 font-bold text-primary whitespace-nowrap">
                              {rev.company_name}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 font-bold text-on-surface">
                                <span className="material-symbols-outlined text-[16px] text-secondary active-tab">
                                  star
                                </span>
                                {rev.score_overall}
                              </span>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap text-on-surface-variant">
                              {rev.is_anonymous ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                                    <span className="material-symbols-outlined text-[13px]">lock</span>
                                    ไม่ระบุตัวตน
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setRevealTargetId(rev.id)}
                                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold rounded-md text-[10px] transition-colors cursor-pointer inline-flex items-center gap-0.5"
                                    title="ถอดรหัสตัวตนจริง (Audit Log)"
                                  >
                                    <span className="material-symbols-outlined text-[12px]">lock_open</span>
                                    ถอดรหัส
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="font-semibold text-primary">{rev.real_author}</div>
                                  <div className="text-[10px] font-mono text-on-surface-variant/70">
                                    {rev.real_email}
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="py-3 px-3 text-on-surface max-w-xs truncate">
                              {rev.text_work}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  rev.status === "approved"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : rev.status === "rejected"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                {rev.status === "approved"
                                  ? "อนุมัติแล้ว"
                                  : rev.status === "rejected"
                                  ? "ปฏิเสธ"
                                  : "รออนุมัติ"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setDetailModalItem({
                                    type: "review",
                                    title: `รีวิว ${rev.company_name}`,
                                    data: rev,
                                  })
                                }
                                className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary font-bold border border-outline-variant/50 rounded-xl text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[13px] text-secondary">visibility</span>
                                ดู
                              </button>
                              <button
                                onClick={() => handleDelete("review", rev.id)}
                                disabled={deleting?.type === "review" && deleting?.id === rev.id}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-[11px] transition-all cursor-pointer disabled:opacity-50"
                              >
                                {deleting?.type === "review" && deleting?.id === rev.id
                                  ? "กำลังลบ..."
                                  : "ลบรีวิว"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredReviews.length > pageSize && (
                  <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-on-surface-variant">
                      แสดง {(pageAllReviews - 1) * pageSize + 1} - {Math.min(pageAllReviews * pageSize, filteredReviews.length)} จาก {filteredReviews.length} รายการ
                    </span>
                    <Pagination
                      currentPage={pageAllReviews}
                      totalPages={Math.ceil(filteredReviews.length / pageSize) || 1}
                      onPageChange={(page) => setPageAllReviews(page)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 3: MANAGE ALL COMMUNITY POSTS ================= */}
            {activeTab === "all_posts" && (
              <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
                  <div>
                    <h3 className="text-lg font-bold font-headline-sm text-primary">
                      จัดการกระทู้คอมมูนิตี้ทั้งหมด ({posts.length})
                    </h3>
                    <p className="text-xs text-on-surface-variant font-body-sm">
                      ตรวจสอบและจัดการกระทู้พูดคุยของนักศึกษา
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="ค้นหาหัวข้อกระทู้, ผู้โพสต์..."
                        value={postSearch}
                        onChange={(e) => setPostSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-medium w-48 sm:w-64"
                      />
                    </div>

                    <select
                      value={postStatusFilter}
                      onChange={(e) => setPostStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
                    >
                      <option value="all">ทุกสถานะ</option>
                      <option value="approved">อนุมัติแล้ว</option>
                      <option value="pending">รออนุมัติ</option>
                      <option value="rejected">ปฏิเสธ</option>
                    </select>
                  </div>
                </div>

                {filteredPosts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-on-surface-variant font-semibold">
                    ไม่พบกระทู้ที่ตรงกับเงื่อนไขค้นหา
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 font-bold font-label-md text-on-surface">
                          <th className="py-3.5 px-3">วัน/เวลา</th>
                          <th className="py-3.5 px-3">หัวข้อกระทู้</th>
                          <th className="py-3.5 px-3">ผู้โพสต์</th>
                          <th className="py-3.5 px-3">เนื้อหาโดยย่อ</th>
                          <th className="py-3.5 px-3">สถานะ</th>
                          <th className="py-3.5 px-3 text-right">ดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                        {filteredPosts.slice((pageAllPosts - 1) * pageSize, pageAllPosts * pageSize).map((post) => (
                          <tr key={post.id} className="hover:bg-surface-container-low/40 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap text-on-surface-variant font-mono">
                              {post.created_at || "-"}
                            </td>
                            <td className="py-3 px-3 font-bold text-primary max-w-xs truncate">
                              {post.title}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap text-on-surface-variant">
                              <div className="font-semibold text-on-surface">{post.author_name}</div>
                              {post.author_email && (
                                <div className="text-[10px] font-mono text-primary font-bold">{post.author_email}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-on-surface max-w-sm truncate">
                              {post.content}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  post.status === "approved"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : post.status === "rejected"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                {post.status === "approved"
                                  ? "อนุมัติแล้ว"
                                  : post.status === "rejected"
                                  ? "ปฏิเสธ"
                                  : "รออนุมัติ"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setDetailModalItem({
                                    type: "post",
                                    title: post.title,
                                    data: post,
                                  })
                                }
                                className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary font-bold border border-outline-variant/50 rounded-xl text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[13px] text-secondary">visibility</span>
                                ดู
                              </button>
                              <button
                                onClick={() => handleDelete("post", post.id)}
                                disabled={deleting?.type === "post" && deleting?.id === post.id}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-[11px] transition-all cursor-pointer disabled:opacity-50"
                              >
                                {deleting?.type === "post" && deleting?.id === post.id
                                  ? "กำลังลบ..."
                                  : "ลบกระทู้"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredPosts.length > pageSize && (
                  <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-on-surface-variant">
                      แสดง {(pageAllPosts - 1) * pageSize + 1} - {Math.min(pageAllPosts * pageSize, filteredPosts.length)} จาก {filteredPosts.length} รายการ
                    </span>
                    <Pagination
                      currentPage={pageAllPosts}
                      totalPages={Math.ceil(filteredPosts.length / pageSize) || 1}
                      onPageChange={(page) => setPageAllPosts(page)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 4: MANAGE ALL JOBS ================= */}
            {activeTab === "all_jobs" && (
              <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
                  <div>
                    <h3 className="text-lg font-bold font-headline-sm text-primary">
                      จัดการประกาศรับสมัครงานทั้งหมด ({jobs.length})
                    </h3>
                    <p className="text-xs text-on-surface-variant font-body-sm">
                      ควบคุมและตรวจสอบประกาศรับสมัครนักศึกษาฝึกงาน
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="ค้นหาตำแหน่ง, สถานประกอบการ..."
                        value={jobSearch}
                        onChange={(e) => setJobSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-medium w-48 sm:w-64"
                      />
                    </div>

                    <select
                      value={jobStatusFilter}
                      onChange={(e) => setJobStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
                    >
                      <option value="all">ทุกสถานะ</option>
                      <option value="approved">อนุมัติแล้ว</option>
                      <option value="pending">รออนุมัติ</option>
                      <option value="rejected">ปฏิเสธ</option>
                    </select>
                  </div>
                </div>

                {filteredJobs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-on-surface-variant font-semibold">
                    ไม่พบตำแหน่งงานที่ตรงกับเงื่อนไขค้นหา
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 font-bold font-label-md text-on-surface">
                          <th className="py-3.5 px-3">วัน/เวลา</th>
                          <th className="py-3.5 px-3">ตำแหน่งงาน</th>
                          <th className="py-3.5 px-3">สถานประกอบการ / ผู้ลงประกาศ</th>
                          <th className="py-3.5 px-3">สถานที่ปฏิบัติงาน</th>
                          <th className="py-3.5 px-3">สถานะ</th>
                          <th className="py-3.5 px-3 text-right">ดำเนินการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                        {filteredJobs.slice((pageAllJobs - 1) * pageSize, pageAllJobs * pageSize).map((job) => (
                          <tr key={job.id} className="hover:bg-surface-container-low/40 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap text-on-surface-variant font-mono">
                              {job.created_at || "-"}
                            </td>
                            <td className="py-3 px-3 font-bold text-primary whitespace-nowrap">
                              {job.title}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap text-on-surface-variant">
                              <div className="font-bold text-on-surface">{job.employer_name}</div>
                              <div className="text-[10px] font-mono text-primary font-bold">
                                บัญชี: {job.poster_email || job.employer_email || job.email || "-"}
                              </div>
                              {job.contact_email && job.contact_email !== (job.poster_email || job.employer_email) && (
                                <div className="text-[10px] font-mono text-secondary font-semibold">
                                  ติดต่อ: {job.contact_email}
                                </div>
                              )}
                              {job.phone && (
                                <div className="text-[10px] text-on-surface-variant">โทร: {job.phone}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-on-surface whitespace-nowrap">
                              {job.location || "-"}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  job.status === "approved"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                    : job.status === "rejected"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}
                              >
                                {job.status === "approved"
                                  ? "อนุมัติแล้ว"
                                  : job.status === "rejected"
                                  ? "ปฏิเสธ"
                                  : "รออนุมัติ"}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setDetailModalItem({
                                    type: "job",
                                    title: job.title,
                                    data: job,
                                  })
                                }
                                className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary font-bold border border-outline-variant/50 rounded-xl text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[13px] text-secondary">visibility</span>
                                ดู
                              </button>
                              <button
                                onClick={() => handleDelete("job", job.id)}
                                disabled={deleting?.type === "job" && deleting?.id === job.id}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-[11px] transition-all cursor-pointer disabled:opacity-50"
                              >
                                {deleting?.type === "job" && deleting?.id === job.id
                                  ? "กำลังลบ..."
                                  : "ลบงาน"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredJobs.length > pageSize && (
                  <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-on-surface-variant">
                      แสดง {(pageAllJobs - 1) * pageSize + 1} - {Math.min(pageAllJobs * pageSize, filteredJobs.length)} จาก {filteredJobs.length} รายการ
                    </span>
                    <Pagination
                      currentPage={pageAllJobs}
                      totalPages={Math.ceil(filteredJobs.length / pageSize) || 1}
                      onPageChange={(page) => setPageAllJobs(page)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 5: REPORTS LIST ================= */}
            {activeTab === "reports" && (
              <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="border-b border-outline-variant/30 pb-4">
                  <h3 className="text-lg font-bold font-headline-sm text-rose-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[22px]">warning</span>
                    รายงานเนื้อหาไม่เหมาะสม ({pendingReports.length})
                  </h3>
                  <p className="text-xs text-on-surface-variant font-body-sm">
                    ข้อร้องเรียนและรายงานความผิดที่ส่งเข้ามาโดยผู้ใช้งานในระบบ
                  </p>
                </div>

                {pendingReports.length === 0 ? (
                  <div className="py-12 text-center shadow-xs rounded-2xl bg-surface-container-low/40 border border-outline-variant/30 flex flex-col items-center justify-center space-y-2">
                    <span className="material-symbols-outlined text-4xl text-emerald-600">
                      verified_user
                    </span>
                    <p className="text-sm font-bold text-on-surface">ไม่มีรายงานความผิดรอจัดการในระบบ</p>
                    <p className="text-xs text-on-surface-variant">ระบบเรียบร้อยดี ไม่มีการร้องเรียนที่ค้างอยู่</p>
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant/30">
                    {pendingReports.slice((pageReports - 1) * pageSize, pageReports * pageSize).map((rep) => (
                      <div
                        key={rep.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              รายงานความผิด #{rep.id}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                              {rep.target_type_th || rep.target_type || "เนื้อหา"} #{rep.target_id || rep.review_id || rep.post_id || "-"}
                            </span>
                            {rep.is_anonymous && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[12px]">lock</span>
                                ไม่ระบุตัวตน
                              </span>
                            )}
                            <span className="text-[11px] text-on-surface-variant font-mono">
                              {rep.created_at || "-"}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-rose-900">
                            เหตุผล: "{rep.reason}"
                          </p>
                          <p className="text-xs text-on-surface-variant font-medium">
                            ผู้ส่งรายงาน: <strong className="text-on-surface">{rep.reporter_name}</strong> {rep.reporter_email ? `(${rep.reporter_email})` : ""} |
                            เป้าหมาย: <strong className="text-primary">{rep.target_title || rep.post_title || rep.company_name || "กระทู้/รีวิว"}</strong>
                          </p>
                          {rep.target_content && (
                            <p className="text-xs text-slate-600 italic bg-surface-container-low/60 p-2 rounded-lg border border-outline-variant/30 line-clamp-2 max-w-xl">
                              "{rep.target_content}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              setDetailModalItem({
                                type: "report",
                                title: `รายงาน #${rep.id}`,
                                data: rep,
                              })
                            }
                            className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-primary font-bold border border-outline-variant/50 rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px] text-secondary">visibility</span>
                            ดูรายละเอียด
                          </button>
                          <button
                            onClick={() => handleResolveReport(rep.id, "resolved", "deleted")}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                            ลบเนื้อหาทิ้ง
                          </button>
                          <button
                            onClick={() => handleResolveReport(rep.id, "dismissed")}
                            className="px-4 py-2 bg-surface-container-low hover:bg-surface-container border border-outline-variant/50 text-on-surface font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            ปัดตกข้อกล่าวหา
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pendingReports.length > pageSize && (
                  <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-on-surface-variant">
                      แสดง {(pageReports - 1) * pageSize + 1} - {Math.min(pageReports * pageSize, pendingReports.length)} จาก {pendingReports.length} รายการ
                    </span>
                    <Pagination
                      currentPage={pageReports}
                      totalPages={Math.ceil(pendingReports.length / pageSize) || 1}
                      onPageChange={(page) => setPageReports(page)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 6: AUDIT LOGS ================= */}
            {activeTab === "audit" && (
              <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
                  <div>
                    <h3 className="text-lg font-bold font-headline-sm text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-[22px]">security</span>
                      ประวัติการดำเนินงานของผู้ดูแลระบบ
                    </h3>
                    <p className="text-xs text-on-surface-variant font-body-sm">
                      บันทึกความโปร่งใสและการตัดสินใจคัดกรองเนื้อหาทั้งหมด
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder="ค้นหา Log แอดมิน, เหตุผล..."
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        className="pl-8 pr-3 py-2 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-medium w-48 sm:w-64"
                      />
                    </div>

                    <select
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      className="px-3 py-2 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface font-bold focus:outline-none focus:border-primary"
                    >
                      <option value="all">ทุกการกระทำ</option>
                      <option value="approve">อนุมัติ (Approve)</option>
                      <option value="reject">ปฏิเสธ (Reject)</option>
                      <option value="delete">ลบข้อมูล (Delete)</option>
                      <option value="reveal">ถอดรหัสตัวตน (Reveal)</option>
                    </select>
                  </div>
                </div>

                {filteredAuditLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-on-surface-variant font-semibold">
                    ไม่พบประวัติการดำเนินงานที่ตรงกับเงื่อนไขค้นหา
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 font-bold font-label-md text-on-surface">
                          <th className="py-3.5 px-3">วัน/เวลา</th>
                          <th className="py-3.5 px-3">แอดมินผู้ดำเนินการ</th>
                          <th className="py-3.5 px-3">การกระทำ</th>
                          <th className="py-3.5 px-3">เป้าหมาย</th>
                          <th className="py-3.5 px-3">เหตุผลอ้างอิง / รายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                        {filteredAuditLogs.slice((pageAuditLogs - 1) * pageSize, pageAuditLogs * pageSize).map((log) => {
                          const act = formatAuditAction(log.action);
                          return (
                            <tr key={log.id} className="hover:bg-surface-container-low/40 transition-colors">
                              <td className="py-3 px-3 text-on-surface-variant font-mono whitespace-nowrap">
                                {log.created_at || "-"}
                              </td>
                              <td className="py-3 px-3 font-bold text-primary whitespace-nowrap">
                                {log.admin_name}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${act.color}`}>
                                  {act.label}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-on-surface whitespace-nowrap font-mono">
                                {log.target_type} #{log.target_id}
                              </td>
                              <td className="py-3 px-3 text-on-surface-variant">
                                {log.reason || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredAuditLogs.length > pageSize && (
                  <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs text-on-surface-variant">
                      แสดง {(pageAuditLogs - 1) * pageSize + 1} - {Math.min(pageAuditLogs * pageSize, filteredAuditLogs.length)} จาก {filteredAuditLogs.length} รายการ
                    </span>
                    <Pagination
                      currentPage={pageAuditLogs}
                      totalPages={Math.ceil(filteredAuditLogs.length / pageSize) || 1}
                      onPageChange={(page) => setPageAuditLogs(page)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <RejectReasonModal
          isOpen={!!rejectTarget}
          title="ปฏิเสธรายการ"
          itemTitle={rejectTarget.title}
          loading={rejecting}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleConfirmReject}
        />
      )}

      {/* Reveal Anonymous Modal */}
      {revealTargetId !== null && (
        <RevealAnonymousModal
          isOpen={revealTargetId !== null}
          reviewId={revealTargetId}
          onClose={() => setRevealTargetId(null)}
        />
      )}

      {/* Admin Full Detail Viewer Modal */}
      {detailModalItem && (
        <AdminDetailModal
          isOpen={!!detailModalItem}
          item={detailModalItem}
          onRevealAnonymous={(reviewId) => setRevealTargetId(reviewId)}
          onClose={() => setDetailModalItem(null)}
        />
      )}

      {/* Student Card Image Preview Lightbox Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/30 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-surface-container border-b border-outline-variant/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">id_card</span>
                <h3 className="font-bold text-primary text-sm">ภาพถ่ายหลักฐานบัตรประจำตัวนักศึกษา</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex-1 p-4 bg-slate-950 flex items-center justify-center overflow-auto">
              <img
                src={previewImageUrl}
                alt="Student ID card proof"
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
