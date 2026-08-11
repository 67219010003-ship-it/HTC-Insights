"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { isAdmin, getToken, isSuperAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import RejectReasonModal from "@/components/RejectReasonModal";

interface StatsData {
  users: { total: number; students: number; external: number; admins: number };
  reviews: { total: number; pending: number };
  jobs: { total: number; pending: number };
  community: { posts: number; pending_posts: number; pending_reports: number };
  upgrades: { pending: number };
}

interface PendingReview {
  id: number;
  company_name: string;
  real_author: string;
  real_email: string;
  is_anonymous?: boolean;
  score_overall: number;
  text_work: string;
  created_at: string;
}

interface PendingPost {
  id: number;
  author_name: string;
  type: string;
  title: string;
  content: string;
  created_at: string;
}

interface PendingJob {
  id: number;
  title: string;
  employer_name: string;
  description: string;
  location: string | null;
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
  reason: string;
  post_id: number | null;
  post_title?: string;
  created_at: string;
}

type ItemType = "review" | "post" | "job" | "upgrade";
type TabType = "overview" | "reviews" | "community" | "jobs" | "upgrades" | "reports";

interface RejectTarget {
  type: ItemType;
  id: number;
  title: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Lists
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [pendingUpgrades, setPendingUpgrades] = useState<PendingUpgrade[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);

  // Modal & notification state
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${getToken()}` };

    try {
      const [statsRes, reviewsRes, postsRes, jobsRes, upgradesRes, reportsRes] = await Promise.all([
        fetch("http://localhost:8000/admin/stats", { headers }),
        fetch("http://localhost:8000/admin/reviews/pending", { headers }),
        fetch("http://localhost:8000/admin/posts?status=pending", { headers }),
        fetch("http://localhost:8000/admin/jobs?status=pending", { headers }),
        fetch("http://localhost:8000/admin/upgrades?status=pending", { headers }),
        fetch("http://localhost:8000/admin/reports?status=pending", { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (reviewsRes.ok) setPendingReviews(await reviewsRes.json());
      if (postsRes.ok) setPendingPosts(await postsRes.json());
      if (jobsRes.ok) setPendingJobs(await jobsRes.json());
      if (upgradesRes.ok) setPendingUpgrades(await upgradesRes.json());
      if (reportsRes.ok) setPendingReports(await reportsRes.json());
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!isAdmin()) {
      router.push("/auth/login");
      return;
    }
    fetchDashboardData();
  }, [router, fetchDashboardData]);

  // Approve action
  const handleApprove = async (type: ItemType, id: number) => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    };

    let url = "";
    if (type === "review") url = `http://localhost:8000/admin/reviews/${id}/approve`;
    else if (type === "post") url = `http://localhost:8000/admin/posts/${id}`;
    else if (type === "job") url = `http://localhost:8000/admin/jobs/${id}`;
    else if (type === "upgrade") url = `http://localhost:8000/admin/upgrades/${id}`;

    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: type !== "review" ? JSON.stringify({ status: "approved" }) : undefined,
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message || "อนุมัติรายการสำเร็จ" });
        fetchDashboardData();
      } else {
        setMsg({ text: data.detail || "เกิดข้อผิดพลาดในการอนุมัติ", isError: true });
      }
    } catch {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
    }
  };

  // Reject action via Modal
  const handleConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setRejecting(true);

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    };

    const { type, id } = rejectTarget;
    let url = "";
    if (type === "review") url = `http://localhost:8000/admin/reviews/${id}`;
    else if (type === "post") url = `http://localhost:8000/admin/posts/${id}`;
    else if (type === "job") url = `http://localhost:8000/admin/jobs/${id}`;
    else if (type === "upgrade") url = `http://localhost:8000/admin/upgrades/${id}`;

    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "rejected", rejection_reason: reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message || "ปฏิเสธรายการสำเร็จ" });
        setRejectTarget(null);
        fetchDashboardData();
      } else {
        setMsg({ text: data.detail || "เกิดข้อผิดพลาดในการปฏิเสธ", isError: true });
      }
    } catch {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
    } finally {
      setRejecting(false);
    }
  };

  // Report resolution action
  const handleResolveReport = async (reportId: number, status: string, action?: string) => {
    try {
      const res = await fetch(`http://localhost:8000/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message || "จัดการรายงานสำเร็จ" });
        fetchDashboardData();
      } else {
        setMsg({ text: data.detail || "เกิดข้อผิดพลาดในการจัดการรายงาน", isError: true });
      }
    } catch {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
    }
  };

  const handleReveal = async (id: number) => {
    const reason = prompt("กรุณาระบุเหตุผลการถอดรหัสตัวตนจริงของ Anonymous (เพื่อบันทึกใน Audit Log):");
    if (!reason || !reason.trim()) return;
    try {
      const res = await fetch(`http://localhost:8000/admin/anonymous-reveal/${id}?reason=${encodeURIComponent(reason)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(`ตัวตนจริงของผู้โพสต์:\nชื่อ: ${data.real_name}\nอีเมล: ${data.real_email}`);
      } else {
        const errData = await res.json();
        setMsg({ text: errData.detail || "เกิดข้อผิดพลาดในการถอดรหัสตัวตน", isError: true });
      }
    } catch {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-lg py-md md:py-lg space-y-md">
        
        {/* Header Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm pb-sm border-b border-outline-variant">
          <div>
            <div className="flex items-center gap-xs">
              <h1 className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
                Admin Center Dashboard
              </h1>
              {mounted && isSuperAdmin() && (
                <span className="px-3 py-1 bg-primary text-on-primary text-label-sm rounded-full font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">shield_person</span>
                  Super Admin
                </span>
              )}
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
              ศูนย์ควบคุม คัดกรองอนุมัติข้อมูล และกำกับดูแลความปลอดภัยระบบ HTC Insights
            </p>
          </div>

          <div className="flex items-center gap-sm shrink-0">
            <Link
              href="/admin/users"
              className="px-md py-sm bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-md text-label-md transition-colors flex items-center gap-xs shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">group</span>
              จัดการผู้ใช้ & สิทธิ์
            </Link>
          </div>
        </div>

        {/* Message Alert Banner */}
        {msg && (
          <div className={`p-sm md:p-md rounded-lg font-body-sm text-body-sm flex items-center justify-between shadow-sm transition-all ${
            msg.isError
              ? "bg-error-container text-on-error-container border border-error/30"
              : "bg-[#e6f4ea] text-[#137333] border border-[#ceead6]"
          }`}>
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-[20px]">{msg.isError ? "error" : "check_circle"}</span>
              <span className="font-medium">{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="font-bold p-1 hover:opacity-70">✕</button>
          </div>
        )}

        {/* Quick Stats Metric Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-sm md:gap-md">
          {/* Stat Card 1: Pending Reviews */}
          <div className="bg-surface-container-lowest rounded-lg p-sm md:p-md border border-outline-variant shadow-sm flex flex-col items-center text-center hover:border-primary transition-colors">
            <span className="material-symbols-outlined text-secondary text-[24px] mb-xs">rate_review</span>
            <span className="font-headline-md text-headline-md font-bold text-primary mb-xs">
              {loading ? "..." : stats?.reviews.pending || pendingReviews.length}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Pending Reviews</span>
          </div>

          {/* Stat Card 2: Community Posts */}
          <div className="bg-surface-container-lowest rounded-lg p-sm md:p-md border border-outline-variant shadow-sm flex flex-col items-center text-center hover:border-primary transition-colors">
            <span className="material-symbols-outlined text-secondary text-[24px] mb-xs">forum</span>
            <span className="font-headline-md text-headline-md font-bold text-primary mb-xs">
              {loading ? "..." : stats?.community.pending_posts || pendingPosts.length}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Community Posts</span>
          </div>

          {/* Stat Card 3: Job Postings */}
          <div className="bg-surface-container-lowest rounded-lg p-sm md:p-md border border-outline-variant shadow-sm flex flex-col items-center text-center hover:border-primary transition-colors">
            <span className="material-symbols-outlined text-secondary text-[24px] mb-xs">work</span>
            <span className="font-headline-md text-headline-md font-bold text-primary mb-xs">
              {loading ? "..." : stats?.jobs.pending || pendingJobs.length}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Job Postings</span>
          </div>

          {/* Stat Card 4: Student Verifications */}
          <div className="bg-surface-container-lowest rounded-lg p-sm md:p-md border border-outline-variant shadow-sm flex flex-col items-center text-center hover:border-primary transition-colors">
            <span className="material-symbols-outlined text-secondary text-[24px] mb-xs">badge</span>
            <span className="font-headline-md text-headline-md font-bold text-primary mb-xs">
              {loading ? "..." : stats?.upgrades.pending || pendingUpgrades.length}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Student Verifications</span>
          </div>

          {/* Stat Card 5: Active Reports */}
          <div className="bg-surface-container-lowest rounded-lg p-sm md:p-md border border-outline-variant shadow-sm flex flex-col items-center text-center col-span-2 md:col-span-1 hover:border-error transition-colors">
            <span className="material-symbols-outlined text-error text-[24px] mb-xs">report</span>
            <span className="font-headline-md text-headline-md font-bold text-error mb-xs">
              {loading ? "..." : stats?.community.pending_reports || pendingReports.length}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Active Reports</span>
          </div>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex overflow-x-auto gap-sm border-b border-outline-variant pb-xs scrollbar-hide">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-md py-sm font-label-md text-label-md whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === "overview"
                ? "text-primary border-b-2 border-primary bg-surface-container-low font-bold"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest"
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-md py-sm font-label-md text-label-md whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === "reviews"
                ? "text-primary border-b-2 border-primary bg-surface-container-low font-bold"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest"
            }`}
          >
            Reviews ({pendingReviews.length})
          </button>

          <button
            onClick={() => setActiveTab("community")}
            className={`px-md py-sm font-label-md text-label-md whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === "community"
                ? "text-primary border-b-2 border-primary bg-surface-container-low font-bold"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest"
            }`}
          >
            Community ({pendingPosts.length})
          </button>

          <button
            onClick={() => setActiveTab("jobs")}
            className={`px-md py-sm font-label-md text-label-md whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === "jobs"
                ? "text-primary border-b-2 border-primary bg-surface-container-low font-bold"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest"
            }`}
          >
            Jobs ({pendingJobs.length})
          </button>

          <button
            onClick={() => setActiveTab("upgrades")}
            className={`px-md py-sm font-label-md text-label-md whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === "upgrades"
                ? "text-primary border-b-2 border-primary bg-surface-container-low font-bold"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest"
            }`}
          >
            Student ID ({pendingUpgrades.length})
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`px-md py-sm font-label-md text-label-md whitespace-nowrap rounded-t-lg transition-colors ${
              activeTab === "reports"
                ? "text-error border-b-2 border-error bg-error-container/30 font-bold"
                : "text-on-surface-variant hover:text-error hover:bg-surface-container-lowest"
            }`}
          >
            Reports ({pendingReports.length})
          </button>
        </div>

        {/* Content Area - Bento Grid Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            
            {/* 1. Latest Reviews Section */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-md bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[20px]">rate_review</span> Latest Reviews
                </h3>
                <Link href="/admin/reviews" className="text-secondary font-label-md text-label-md hover:underline">
                  View All ({stats?.reviews.pending || 0})
                </Link>
              </div>
              <div className="p-sm flex-1 flex flex-col gap-sm">
                {loading ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant py-md">กำลังโหลด...</div>
                ) : pendingReviews.length === 0 ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant py-md">ไม่มีรีวิวรอการอนุมัติ</div>
                ) : (
                  pendingReviews.slice(0, 3).map((rev) => (
                    <div key={rev.id} className="bg-surface-container p-sm rounded-lg flex items-center justify-between border border-outline-variant/50">
                      <div className="flex flex-col flex-1 mr-sm">
                        <span className="font-label-md text-label-md text-on-surface">{rev.company_name} (★ {rev.score_overall})</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">"{rev.text_work}"</span>
                        <span className="font-label-sm text-[11px] text-on-surface-variant/70 mt-0.5">โดย: {rev.real_author}</span>
                      </div>
                      <div className="flex gap-xs shrink-0 items-center">
                        {rev.is_anonymous && (
                          <button
                            onClick={() => handleReveal(rev.id)}
                            title="ถอดรหัสตัวตนจริง (บันทึก Audit Log)"
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 border border-amber-300"
                          >
                            <span className="material-symbols-outlined text-[14px]">lock_open</span>
                            Reveal
                          </button>
                        )}
                        <button
                          onClick={() => handleApprove("review", rev.id)}
                          title="อนุมัติรีวิว"
                          className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] hover:bg-[#ceead6] flex items-center justify-center transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button
                          onClick={() => setRejectTarget({ type: "review", id: rev.id, title: `รีวิว ${rev.company_name}` })}
                          title="ปฏิเสธ (ระบุเหตุผล)"
                          className="w-8 h-8 rounded-full bg-[#fce8e6] text-[#c5221f] hover:bg-[#fad2cf] flex items-center justify-center transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Latest Posts Section */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-md bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[20px]">forum</span> Latest Posts
                </h3>
                <Link href="/admin/posts" className="text-secondary font-label-md text-label-md hover:underline">
                  View All ({stats?.community.pending_posts || 0})
                </Link>
              </div>
              <div className="p-sm flex-1 flex flex-col gap-sm">
                {loading ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant py-md">กำลังโหลด...</div>
                ) : pendingPosts.length === 0 ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant py-md">ไม่มีโพสต์รอการอนุมัติ</div>
                ) : (
                  pendingPosts.slice(0, 3).map((post) => (
                    <div key={post.id} className="bg-surface-container p-sm rounded-lg flex items-center justify-between border border-outline-variant/50">
                      <div className="flex flex-col flex-1 mr-sm">
                        <span className="font-label-md text-label-md text-on-surface line-clamp-1">{post.title}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">"{post.content}"</span>
                        <span className="font-label-sm text-[11px] text-on-surface-variant/70 mt-0.5">โพสต์โดย: {post.author_name}</span>
                      </div>
                      <div className="flex gap-xs shrink-0">
                        <button
                          onClick={() => handleApprove("post", post.id)}
                          title="อนุมัติโพสต์"
                          className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] hover:bg-[#ceead6] flex items-center justify-center transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button
                          onClick={() => setRejectTarget({ type: "post", id: post.id, title: `โพสต์ ${post.title}` })}
                          title="ปฏิเสธ (ระบุเหตุผล)"
                          className="w-8 h-8 rounded-full bg-[#fce8e6] text-[#c5221f] hover:bg-[#fad2cf] flex items-center justify-center transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Latest Jobs Section */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-md bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[20px]">work</span> Latest Jobs
                </h3>
                <Link href="/admin/jobs" className="text-secondary font-label-md text-label-md hover:underline">
                  View All ({stats?.jobs.pending || 0})
                </Link>
              </div>
              <div className="p-sm flex-1 flex flex-col gap-sm">
                {loading ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant py-md">กำลังโหลด...</div>
                ) : pendingJobs.length === 0 ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant py-md">ไม่มีประกาศงานรอการอนุมัติ</div>
                ) : (
                  pendingJobs.slice(0, 3).map((job) => (
                    <div key={job.id} className="bg-surface-container p-sm rounded-lg flex items-center justify-between border border-outline-variant/50">
                      <div className="flex flex-col flex-1 mr-sm">
                        <span className="font-label-md text-label-md text-on-surface line-clamp-1">{job.title}</span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">{job.employer_name}</span>
                      </div>
                      <div className="flex gap-xs shrink-0">
                        <button
                          onClick={() => handleApprove("job", job.id)}
                          title="อนุมัติงาน"
                          className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] hover:bg-[#ceead6] flex items-center justify-center transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button
                          onClick={() => setRejectTarget({ type: "job", id: job.id, title: `งาน ${job.title}` })}
                          title="ปฏิเสธ (ระบุเหตุผล)"
                          className="w-8 h-8 rounded-full bg-[#fce8e6] text-[#c5221f] hover:bg-[#fad2cf] flex items-center justify-center transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Verification Requests Section */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
              <div className="p-md bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[20px]">badge</span> Verification Requests
                </h3>
                <Link href="/admin/upgrades" className="text-secondary font-label-md text-label-md hover:underline">
                  View All ({stats?.upgrades.pending || 0})
                </Link>
              </div>
              <div className="p-sm flex-1 flex flex-col gap-sm">
                {loading ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant py-md">กำลังโหลด...</div>
                ) : pendingUpgrades.length === 0 ? (
                  <div className="text-center font-body-sm text-body-sm text-on-surface-variant py-md">ไม่มีคำขอยืนยันสิทธิ์รอการอนุมัติ</div>
                ) : (
                  pendingUpgrades.slice(0, 3).map((upg) => (
                    <div key={upg.id} className="bg-surface-container p-sm rounded-lg flex items-center justify-between border border-outline-variant/50">
                      <div className="flex items-center gap-sm flex-1 mr-sm">
                        <div className="w-9 h-9 bg-surface-variant rounded-full flex items-center justify-center text-on-surface-variant font-bold text-xs shrink-0">
                          {upg.user_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md text-on-surface">{upg.user_name}</span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">รหัสนักศึกษา: {upg.student_id}</span>
                        </div>
                      </div>
                      <div className="flex gap-xs shrink-0">
                        <button
                          onClick={() => handleApprove("upgrade", upg.id)}
                          title="อนุมัติสิทธิ์นักศึกษา"
                          className="w-8 h-8 rounded-full bg-[#e6f4ea] text-[#137333] hover:bg-[#ceead6] flex items-center justify-center transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button
                          onClick={() => setRejectTarget({ type: "upgrade", id: upg.id, title: `คำขอของ ${upg.user_name}` })}
                          title="ปฏิเสธ (ระบุเหตุผล)"
                          className="w-8 h-8 rounded-full bg-[#fce8e6] text-[#c5221f] hover:bg-[#fad2cf] flex items-center justify-center transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Tab Specific Detail Views */}
        {activeTab === "reviews" && (
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm space-y-sm">
            <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center justify-between border-b border-outline-variant pb-sm">
              <span>รีวิวรออนุมัติทั้งหมด ({pendingReviews.length})</span>
              <Link href="/admin/reviews" className="text-secondary font-label-md text-label-md hover:underline">หน้าจัดการฉบับเต็ม →</Link>
            </h3>
            {pendingReviews.map((rev) => (
              <div key={rev.id} className="bg-surface-container p-sm rounded-lg flex items-center justify-between border border-outline-variant/50">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">{rev.company_name} (★ {rev.score_overall})</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">"{rev.text_work}"</span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant/70">ผู้เขียน: {rev.real_author} ({rev.real_email})</span>
                </div>
                <div className="flex gap-xs shrink-0 items-center">
                  {rev.is_anonymous && (
                    <button
                      onClick={() => handleReveal(rev.id)}
                      title="ถอดรหัสตัวตนจริง (บันทึก Audit Log)"
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 border border-amber-300"
                    >
                      <span className="material-symbols-outlined text-[14px]">lock_open</span>
                      Reveal
                    </button>
                  )}
                  <button onClick={() => handleApprove("review", rev.id)} className="px-md py-xs bg-[#e6f4ea] text-[#137333] font-label-md rounded-lg hover:bg-[#ceead6]">อนุมัติ</button>
                  <button onClick={() => setRejectTarget({ type: "review", id: rev.id, title: `รีวิว ${rev.company_name}` })} className="px-md py-xs bg-[#fce8e6] text-[#c5221f] font-label-md rounded-lg hover:bg-[#fad2cf]">ปฏิเสธ</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "community" && (
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm space-y-sm">
            <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center justify-between border-b border-outline-variant pb-sm">
              <span>โพสต์รออนุมัติทั้งหมด ({pendingPosts.length})</span>
              <Link href="/admin/posts" className="text-secondary font-label-md text-label-md hover:underline">หน้าจัดการฉบับเต็ม →</Link>
            </h3>
            {pendingPosts.map((post) => (
              <div key={post.id} className="bg-surface-container p-sm rounded-lg flex items-center justify-between border border-outline-variant/50">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">{post.title}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">"{post.content}"</span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant/70">โพสต์โดย: {post.author_name}</span>
                </div>
                <div className="flex gap-xs shrink-0">
                  <button onClick={() => handleApprove("post", post.id)} className="px-md py-xs bg-[#e6f4ea] text-[#137333] font-label-md rounded-lg hover:bg-[#ceead6]">อนุมัติ</button>
                  <button onClick={() => setRejectTarget({ type: "post", id: post.id, title: `โพสต์ ${post.title}` })} className="px-md py-xs bg-[#fce8e6] text-[#c5221f] font-label-md rounded-lg hover:bg-[#fad2cf]">ปฏิเสธ</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "jobs" && (
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm space-y-sm">
            <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center justify-between border-b border-outline-variant pb-sm">
              <span>ประกาศงานรออนุมัติทั้งหมด ({pendingJobs.length})</span>
              <Link href="/admin/jobs" className="text-secondary font-label-md text-label-md hover:underline">หน้าจัดการฉบับเต็ม →</Link>
            </h3>
            {pendingJobs.map((job) => (
              <div key={job.id} className="bg-surface-container p-sm rounded-lg flex items-center justify-between border border-outline-variant/50">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">{job.title}</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{job.employer_name}</span>
                </div>
                <div className="flex gap-xs shrink-0">
                  <button onClick={() => handleApprove("job", job.id)} className="px-md py-xs bg-[#e6f4ea] text-[#137333] font-label-md rounded-lg hover:bg-[#ceead6]">อนุมัติ</button>
                  <button onClick={() => setRejectTarget({ type: "job", id: job.id, title: `งาน ${job.title}` })} className="px-md py-xs bg-[#fce8e6] text-[#c5221f] font-label-md rounded-lg hover:bg-[#fad2cf]">ปฏิเสธ</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "upgrades" && (
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm space-y-sm">
            <h3 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center justify-between border-b border-outline-variant pb-sm">
              <span>คำขอยืนยันสิทธิ์ทั้งหมด ({pendingUpgrades.length})</span>
              <Link href="/admin/upgrades" className="text-secondary font-label-md text-label-md hover:underline">หน้าจัดการฉบับเต็ม →</Link>
            </h3>
            {pendingUpgrades.map((upg) => (
              <div key={upg.id} className="bg-surface-container p-sm rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 border border-outline-variant/50">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface">{upg.user_name} (รหัส {upg.student_id})</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">แผนก: {upg.department || "-"}</span>
                  {upg.card_image_url && (
                    <a href={upg.card_image_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-secondary hover:underline flex items-center gap-0.5 mt-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">image</span> ดูบัตรหลักฐาน
                    </a>
                  )}
                </div>
                <div className="flex gap-xs shrink-0 self-end md:self-center">
                  <button onClick={() => handleApprove("upgrade", upg.id)} className="px-md py-xs bg-[#e6f4ea] text-[#137333] font-label-md rounded-lg hover:bg-[#ceead6]">อนุมัติ</button>
                  <button onClick={() => setRejectTarget({ type: "upgrade", id: upg.id, title: `คำขอของ ${upg.user_name}` })} className="px-md py-xs bg-[#fce8e6] text-[#c5221f] font-label-md rounded-lg hover:bg-[#fad2cf]">ปฏิเสธ</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm space-y-sm">
            <h3 className="font-headline-sm text-headline-sm font-bold text-error flex items-center justify-between border-b border-outline-variant pb-sm">
              <span>รายงานความผิดทั้งหมด ({pendingReports.length})</span>
              <Link href="/admin/reports" className="text-secondary font-label-md text-label-md hover:underline">หน้าจัดการฉบับเต็ม →</Link>
            </h3>
            {pendingReports.map((rep) => (
              <div key={rep.id} className="bg-surface-container p-sm rounded-lg flex items-center justify-between border border-outline-variant/50">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-error">เหตุผล: "{rep.reason}"</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">ผู้รายงาน: {rep.reporter_name}</span>
                </div>
                <div className="flex gap-xs shrink-0">
                  <button onClick={() => handleResolveReport(rep.id, "resolved")} className="px-md py-xs bg-[#e6f4ea] text-[#137333] font-label-md rounded-lg hover:bg-[#ceead6]">จัดการ</button>
                  <button onClick={() => handleResolveReport(rep.id, "dismissed")} className="px-md py-xs bg-surface-variant text-on-surface-variant font-label-md rounded-lg hover:bg-outline-variant">ยกเลิก</button>
                </div>
              </div>
            ))}
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
    </div>
  );
}
