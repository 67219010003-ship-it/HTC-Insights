"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { isStudent, getToken, clearToken, getRole } from "@/lib/auth";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import Toast from "@/components/Toast";
import ImageLightboxModal from "@/components/ImageLightboxModal";
import Pagination from "@/components/Pagination";

interface UserProfile {
  id: number;
  email: string;
  name: string;
  avatar_url: string;
  role: string;
  student_id?: string;
  department?: string;
  is_approved?: boolean;
  company_name?: string;
  industry?: string;
  address?: string;
}

interface MyReview {
  id: number;
  company_id: number;
  company_name: string;
  score_overall: number;
  text_work: string;
  text_pros?: string;
  text_cons?: string;
  text_advice?: string;
  is_anonymous: boolean;
  photo_urls?: string[];
  status: string;
  rejection_reason?: string;
  created_at: string;
}

interface MyPost {
  id: number;
  title: string;
  type: string;
  department?: string;
  content: string;
  is_anonymous: boolean;
  like_count: number;
  comment_count: number;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

interface EmployerJob {
  id: number;
  title: string;
  company_name: string;
  department?: string;
  description?: string;
  daily_allowance?: number;
  location?: string;
  is_active: boolean;
  status?: string;
  rejection_reason?: string;
  created_at?: string;
}

type ProfileTab = "reviews" | "posts" | "status" | "employer_jobs" | "employer_status";

export default function StudentProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("reviews");
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [employerJobs, setEmployerJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [jobsPage, setJobsPage] = useState(1);
  const profilePageSize = 5;

  // Custom Modal & Toast States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "danger" | "warning" | "info";
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "ยืนยัน",
    onConfirm: () => {},
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });

  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    images: string[];
    index: number;
  }>({
    isOpen: false,
    images: [],
    index: 0,
  });

  const fetchUserData = async () => {
    if (!getToken()) return;
    setLoading(true);
    let currentRole = getRole();
    try {
      const res = await api.get("/auth/me");
      setUserProfile(res.data);
      if (res.data?.role) {
        currentRole = res.data.role;
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }

    if (currentRole === "employer") {
      setActiveTab("employer_jobs");
      setJobsLoading(true);
      try {
        const jobsRes = await api.get("/employer/postings");
        setEmployerJobs(jobsRes.data || []);
      } catch {
        setEmployerJobs([]);
      } finally {
        setJobsLoading(false);
      }
    } else if (!isStudent()) {
      setActiveTab("status");
    } else {
      setActiveTab("reviews");
      // Load user reviews
      try {
        const revRes = await api.get("/reviews/my");
        setReviews(revRes.data || []);
      } catch {
        setReviews([]);
      }

      // Load user community posts
      setPostsLoading(true);
      try {
        const postRes = await api.get("/community/my-posts");
        setPosts(postRes.data || []);
      } catch {
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const promptDeleteAccount = () => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบบัญชีผู้ใช้",
      message: "คำเตือน: ข้อมูลบัญชีและสิทธิ์การใช้งานของคุณจะถูกนำออกจากระบบถาวร ไม่สามารถกู้คืนกลับมาได้",
      type: "danger",
      confirmText: "ยืนยันลบบัญชี",
      onConfirm: executeDeleteAccount,
    });
  };

  const executeDeleteAccount = async () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    try {
      setDeleteLoading(true);
      await api.delete("/auth/me");
      clearToken();
      window.location.href = "/";
    } catch {
      setToast({ isOpen: true, message: "เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้", type: "error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const promptDeleteReview = (reviewId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบรีวิว",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้ออกจากระบบ? ข้อมูลประสบการณ์จะถูกลบถาวร",
      type: "danger",
      confirmText: "ยืนยันลบรีวิว",
      onConfirm: () => executeDeleteReview(reviewId),
    });
  };

  const executeDeleteReview = async (reviewId: number) => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setToast({ isOpen: true, message: "ลบรีวิวเรียบร้อยแล้ว", type: "success" });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการลบรีวิว", type: "error" });
    }
  };

  const promptEditReview = (review: MyReview) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการแก้ไขรีวิว",
      message: "หากทำการแก้ไขรีวิว ข้อมูลจะถูกปรับสถานะเป็น 'รอการตรวจสอบใหม่' จากผู้ดูแลระบบ (Admin) ยืนยันที่จะดำเนินการหรือไม่?",
      type: "warning",
      confirmText: "ดำเนินการแก้ไข",
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        window.location.href = `/insights/write-review?company_id=${review.company_id}&review_id=${review.id}`;
      },
    });
  };

  const promptDeletePost = (postId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบกระทู้คอมมูนิตี้",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบกระทู้นี้? ความคิดเห็นและการถูกใจทั้งหมดจะถูกลบถาวร",
      type: "danger",
      confirmText: "ยืนยันลบกระทู้",
      onConfirm: () => executeDeletePost(postId),
    });
  };

  const executeDeletePost = async (postId: number) => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    try {
      await api.delete(`/community/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setToast({ isOpen: true, message: "ลบกระทู้คอมมูนิตี้เรียบร้อยแล้ว", type: "success" });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการลบกระทู้", type: "error" });
    }
  };

  const isEmployer = userProfile?.role === "employer";
  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* ================= USER PROFILE HEADER CARD ================= */}
      <div className="bg-white border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-secondary/30 shadow-md shrink-0 bg-surface-container-high flex items-center justify-center">
            {isEmployer ? (
              <span className="material-symbols-outlined text-[44px] text-secondary">domain</span>
            ) : (
              <img
                src={userProfile?.avatar_url || defaultAvatar}
                alt={userProfile?.name || "Account Profile"}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultAvatar;
                }}
              />
            )}
          </div>

          {/* User Information */}
          <div className="space-y-2 min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-primary font-headline break-words max-w-full">
                {userProfile?.company_name || userProfile?.name || (isStudent() ? "นักศึกษาวิทยาลัยเทคนิคหาดใหญ่" : "ผู้ใช้งานทั่วไป")}
              </h1>

              {isEmployer ? (
                <>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                    <span className="material-symbols-outlined text-[13px]">domain</span>
                    Employer Partner
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      userProfile?.is_approved
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {userProfile?.is_approved ? "check_circle" : "hourglass_top"}
                    </span>
                    {userProfile?.is_approved ? "อนุมัติสถานประกอบการแล้ว" : "รอการอนุมัติสถานประกอบการ"}
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 text-[11px] bg-secondary-container text-on-secondary-container px-2.5 py-0.5 rounded-full font-bold">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    {isStudent() ? "HTC Student" : "External Account"}
                  </span>
                  {userProfile?.role === "superadmin" && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold">
                      Superadmin
                    </span>
                  )}
                  {userProfile?.role === "admin" && (
                    <span className="inline-flex items-center gap-1 text-[11px] bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full font-bold">
                      Admin
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-on-surface-variant font-medium">
              <span className="flex items-center gap-1 break-all">
                <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">mail</span>
                {userProfile?.email || "กำลังโหลดข้อมูล..."}
              </span>
              {isEmployer && userProfile?.industry && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">category</span>
                  ธุรกิจ: {userProfile.industry}
                </span>
              )}
              {isEmployer && userProfile?.address && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">location_on</span>
                  ที่อยู่: {userProfile.address}
                </span>
              )}
              {!isEmployer && userProfile?.student_id && (
                <span className="flex items-center gap-1 font-mono">
                  <span className="material-symbols-outlined text-[15px] text-primary shrink-0">badge</span>
                  รหัส: {userProfile.student_id}
                </span>
              )}
            </div>
          </div>

          {/* Delete Account Button */}
          <div className="shrink-0 mt-2 sm:mt-0">
            <button
              onClick={promptDeleteAccount}
              disabled={deleteLoading}
              className="px-3.5 py-2 border border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              {deleteLoading ? "กำลังลบ..." : "ลบบัญชีผู้ใช้"}
            </button>
          </div>
        </div>

        {/* Profile Statistics Banner */}
        {isEmployer ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low/60 p-4 rounded-2xl text-center border border-outline-variant/40 mt-6">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-primary">{employerJobs.length}</div>
              <div className="text-[11px] font-bold text-on-surface-variant">ประกาศงานทั้งหมด</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-secondary">
                {employerJobs.filter((j) => j.status === "approved" && j.is_active).length}
              </div>
              <div className="text-[11px] font-bold text-on-surface-variant">งานที่เผยแพร่อยู่</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-amber-600">
                {employerJobs.filter((j) => j.status === "pending").length}
              </div>
              <div className="text-[11px] font-bold text-on-surface-variant">ประกาศรออนุมัติ</div>
            </div>
            <div>
              <div className={`text-xl sm:text-2xl font-bold ${userProfile?.is_approved ? "text-emerald-600" : "text-amber-600"}`}>
                {userProfile?.is_approved ? "อนุมัติแล้ว" : "รอตรวจสอบ"}
              </div>
              <div className="text-[11px] font-bold text-on-surface-variant">สถานะสถานประกอบการ</div>
            </div>
          </div>
        ) : !isStudent() ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-container-low/60 p-4 rounded-2xl text-center border border-outline-variant/40 mt-6">
            <div>
              <div className="text-lg sm:text-xl font-bold text-amber-600">External Account</div>
              <div className="text-[11px] font-bold text-on-surface-variant">ประเภทบัญชีผู้ใช้</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-amber-600">รอการยืนยันตัวตน</div>
              <div className="text-[11px] font-bold text-on-surface-variant">สิทธิ์การเขียนรีวิว & โพสต์กระทู้</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold text-primary">HTC Insights</div>
              <div className="text-[11px] font-bold text-on-surface-variant">ระบบข้อมูลสถานประกอบการ</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-container-low/60 p-4 rounded-2xl text-center border border-outline-variant/40 mt-6">
            <div>
              <div className="text-xl sm:text-2xl font-bold text-primary">{reviews.length}</div>
              <div className="text-[11px] font-bold text-on-surface-variant">รีวิวที่ส่งทั้งหมด</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-secondary">
                {reviews.filter((r) => r.status === "approved").length}
              </div>
              <div className="text-[11px] font-bold text-on-surface-variant">รีวิวที่อนุมัติแล้ว</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-primary">
                {posts.length}
              </div>
              <div className="text-[11px] font-bold text-on-surface-variant">กระทู้คอมมูนิตี้</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                {reviews.filter((r) => r.status === "pending").length + posts.filter((p) => p.status === "pending").length}
              </div>
              <div className="text-[11px] font-bold text-on-surface-variant">รายการรอคัดกรอง</div>
            </div>
          </div>
        )}
      </div>

      {/* ================= TABS NAVIGATION ================= */}
      <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-2 overflow-x-auto hide-scrollbar">
        {isEmployer ? (
          <>
            <button
              onClick={() => setActiveTab("employer_jobs")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "employer_jobs"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">work</span>
              ประกาศงานฝึกงานของฉัน ({employerJobs.length})
            </button>

            <button
              onClick={() => setActiveTab("employer_status")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "employer_status"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              สถานะสถานประกอบการ & สิทธิ์
            </button>
          </>
        ) : !isStudent() ? (
          <button
            onClick={() => setActiveTab("status")}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-primary text-on-primary shadow-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">school</span>
            สิทธิ์การใช้งาน & การยืนยันตัวตนนักศึกษา
          </button>
        ) : (
          <>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "reviews"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">rate_review</span>
              รีวิวของฉัน ({reviews.length})
            </button>

            <button
              onClick={() => setActiveTab("posts")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "posts"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">forum</span>
              กระทู้ชุมชนของฉัน ({posts.length})
            </button>
          </>
        )}
      </div>

      {/* ================= EMPLOYER TAB 1: MY JOB POSTINGS ================= */}
      {isEmployer && activeTab === "employer_jobs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-primary font-headline">
                ประกาศรับสมัครฝึกงานของสถานประกอบการ ({employerJobs.length})
              </h2>
              <p className="text-xs text-on-surface-variant">
                จัดการประกาศงาน ตรวจสอบสถานะการอนุมัติจากผู้ดูแลระบบ หรือเปิด/ปิดรับสมัคร
              </p>
            </div>

            <Link
              href="/employer/dashboard"
              className="text-xs bg-secondary text-white px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-opacity shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              + สร้างประกาศงานใหม่
            </Link>
          </div>

          {jobsLoading ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">กำลังโหลดรายการประกาศงาน...</div>
          ) : employerJobs.length === 0 ? (
            <div className="bg-white border border-outline-variant/60 rounded-3xl p-8 text-center space-y-2 shadow-xs">
              <span className="material-symbols-outlined text-[40px] text-outline">work_off</span>
              <p className="text-sm font-bold text-primary">คุณยังไม่มีประกาศรับสมัครฝึกงานในระบบ</p>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                เริ่มต้นประกาศตำแหน่งงานเพื่อเปิดรับสมัครนักศึกษาวิทยาลัยเทคนิคหาดใหญ่เข้าร่วมงาน
              </p>
              <div className="pt-2">
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">work</span>
                  ดูตำแหน่งงานในระบบ
                </Link>
              </div>
            </div>
          ) : (
            <>
              {employerJobs
                .slice((jobsPage - 1) * profilePageSize, jobsPage * profilePageSize)
                .map((job) => (
                  <div key={job.id} className="bg-white border border-outline-variant/60 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-primary">{job.title}</h3>
                          {job.department && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-secondary-container/40 text-secondary border border-secondary/20 px-2 py-0.5 rounded-md">
                              <span className="material-symbols-outlined text-[12px]">school</span>
                              {job.department}
                            </span>
                          )}
                          {job.daily_allowance ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              ฿{job.daily_allowance} / วัน
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-3 flex-wrap">
                          {job.location && (
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px] text-secondary">location_on</span>
                              {job.location}
                            </span>
                          )}
                          <span>ประกาศเมื่อ: {job.created_at || "-"}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            job.status === "approved"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : job.status === "rejected"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {job.status === "approved" ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              อนุมัติแล้ว
                            </span>
                          ) : job.status === "rejected" ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">cancel</span>
                              ถูกปฏิเสธ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                              รอการอนุมัติ
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Rejection Alert */}
                    {job.status === "rejected" && job.rejection_reason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                        <strong className="font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">info</span>
                          เหตุผลที่ประกาศงานไม่ผ่านการอนุมัติ:
                        </strong>
                        <p>{job.rejection_reason}</p>
                      </div>
                    )}

                    {/* Description Preview */}
                    {job.description && (
                      <p className="text-xs text-on-surface-variant bg-surface-container-low/40 p-3 rounded-xl border border-outline-variant/30 leading-relaxed line-clamp-2">
                        {job.description}
                      </p>
                    )}

                    {/* Action footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
                      <span className={`font-semibold flex items-center gap-1 ${job.is_active ? "text-emerald-700" : "text-slate-500"}`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {job.is_active ? "check_circle" : "pause_circle"}
                        </span>
                        สถานะการเปิดรับ: {job.is_active ? "เปิดรับสมัครอยู่" : "ปิดรับสมัครชั่วคราว"}
                      </span>

                      <Link
                        href="/jobs"
                        className="px-3 py-1.5 rounded-xl border border-secondary/30 text-secondary hover:bg-secondary/10 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        ดูในหน้ารับสมัคร
                      </Link>
                    </div>
                  </div>
                ))}

              {employerJobs.length > profilePageSize && (
                <div className="pt-2">
                  <Pagination
                    currentPage={jobsPage}
                    totalPages={Math.ceil(employerJobs.length / profilePageSize) || 1}
                    onPageChange={setJobsPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ================= EMPLOYER TAB 2: EMPLOYER ACCOUNT STATUS ================= */}
      {isEmployer && activeTab === "employer_status" && (
        <div className="space-y-4">
          <div className="bg-white border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-primary font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">domain_verification</span>
              สถานะการอนุมัติสถานประกอบการพาร์ทเนอร์
            </h2>

            {userProfile?.is_approved ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-emerald-900">
                    สถานประกอบการได้รับการอนุมัติและยืนยันตัวตนเรียบร้อยแล้ว
                  </h3>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    คุณเป็นพาร์ทเนอร์อย่างเป็นทางการของวิทยาลัยเทคนิคหาดใหญ่ ตำแหน่งงานฝึกงานที่คุณลงประกาศและผ่านการอนุมัติจะแสดงผลให้นักศึกษาทุกคนเข้าถึงและติดต่อสมัครฝึกงานได้ทันที
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-amber-900">
                    อยู่ระหว่างรอการตรวจสอบและอนุมัติจากผู้ดูแลระบบ (Admin Pending)
                  </h3>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    ข้อมูลสถานประกอบการของคุณกำลังอยู่ระหว่างการตรวจสอบโดยเจ้าหน้าที่วิทยาลัยเทคนิคหาดใหญ่ เมื่อได้รับการอนุมัติแล้ว ประกาศงานฝึกงานของคุณจะเริ่มแสดงผลบนหน้าค้นหางาน
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/40 space-y-1">
                <span className="text-on-surface-variant font-bold">ชื่อบริษัท / สถานประกอบการ:</span>
                <p className="text-sm font-bold text-primary">{userProfile?.company_name || userProfile?.name || "-"}</p>
              </div>
              <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/40 space-y-1">
                <span className="text-on-surface-variant font-bold">ประเภทธุรกิจ / อุตสาหกรรม:</span>
                <p className="text-sm font-bold text-primary">{userProfile?.industry || "ทั่วไป"}</p>
              </div>
              <div className="sm:col-span-2 p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/40 space-y-1">
                <span className="text-on-surface-variant font-bold">สถานที่ตั้ง / ที่อยู่:</span>
                <p className="text-sm font-bold text-primary">{userProfile?.address || "-"}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/employer/dashboard"
                className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">dashboard</span>
                ไปที่แดชบอร์ดสถานประกอบการ
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 1: MY REVIEWS ================= */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-primary font-headline">
                ประวัติการเขียนรีวิวสถานประกอบการ
              </h2>
              <p className="text-xs text-on-surface-variant">
                ระบบจำกัดการเขียนรีวิว 1 รีวิวต่อ 1 ผู้ใช้งาน สามารถแก้ไขข้อมูลได้ตลอดเวลา
              </p>
            </div>

            {reviews.length === 0 && (
              <Link
                href="/insights/write-review"
                className="text-xs bg-secondary text-white px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-opacity shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">rate_review</span>
                + เขียนรีวิวใหม่
              </Link>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white border border-outline-variant/60 rounded-3xl p-8 text-center space-y-2 shadow-xs">
              <span className="material-symbols-outlined text-[40px] text-outline">rate_review</span>
              <p className="text-sm font-bold text-primary">คุณยังไม่มีประวัติการเขียนรีวิว</p>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                มาร่วมแบ่งปันประสบการณ์การฝึกงานเพื่อช่วยแนะนำรุ่นน้องวิทยาลัยเทคนิคหาดใหญ่กันครับ
              </p>
              <div className="pt-2">
                <Link
                  href="/insights/write-review"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  เริ่มเขียนรีวิวแรกของคุณ
                </Link>
              </div>
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} className="bg-white border border-outline-variant/60 rounded-2xl p-5 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-primary">{r.company_name}</span>
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg text-xs font-bold">
                        <span className="material-symbols-outlined text-[14px]">star</span>
                        {r.score_overall} / 5
                      </div>
                      {r.is_anonymous && (
                        <span className="bg-surface-container-high px-2 py-0.5 rounded-md text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">visibility_off</span>
                          ไม่เปิดเผยตัวตน
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-on-surface-variant">ส่งเมื่อ: {r.created_at || "-"}</div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        r.status === "approved"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : r.status === "pending"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {r.status === "approved" ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          อนุมัติแล้ว
                        </span>
                      ) : r.status === "pending" ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                          รอตรวจสอบ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">cancel</span>
                          ถูกปฏิเสธ
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Rejection Reason Alert */}
                {r.status === "rejected" && r.rejection_reason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <strong className="font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">info</span>
                      เหตุผลที่ผู้ดูแลระบบปฏิเสธ:
                    </strong>
                    <p>{r.rejection_reason}</p>
                    <p className="text-[11px] text-rose-600">
                      คุณสามารถกดปุ่ม "แก้ไขรีวิว" ด้านล่าง เพื่อปรับปรุงเนื้อหาและส่งให้ผู้ดูแลระบบตรวจสอบใหม่อีกครั้ง
                    </p>
                  </div>
                )}

                {/* Review Text Preview */}
                <div className="bg-surface-container-low/40 p-3 rounded-xl border border-outline-variant/30 text-xs text-on-surface leading-relaxed">
                  <strong className="text-on-surface-variant block mb-1 text-[11px]">ลักษณะงาน:</strong>
                  <p className="italic">"{r.text_work}"</p>
                  {r.text_pros && (
                    <p className="mt-1 text-emerald-800">
                      <strong>ข้อดี:</strong> {r.text_pros}
                    </p>
                  )}
                  {r.text_cons && (
                    <p className="mt-0.5 text-rose-800">
                      <strong>ข้อเสีย:</strong> {r.text_cons}
                    </p>
                  )}
                  {r.text_advice && (
                    <p className="mt-0.5 text-blue-800">
                      <strong>คำแนะนำ:</strong> {r.text_advice}
                    </p>
                  )}
                </div>

                {/* Attached Review Photos */}
                {r.photo_urls && r.photo_urls.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-secondary">photo_camera</span>
                      รูปภาพประกอบที่แนบ ({r.photo_urls.length} รูป - คลิกเพื่อดูภาพใหญ่):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {r.photo_urls.map((url, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => setLightbox({ isOpen: true, images: r.photo_urls || [], index: idx })}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-outline-variant/60 hover:border-secondary hover:scale-105 transition-all shadow-xs group relative cursor-pointer"
                        >
                          <img src={url} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-white text-[16px] opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                              zoom_in
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => promptEditReview(r)}
                    className="text-xs text-secondary hover:bg-secondary/10 font-bold border border-secondary/30 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    แก้ไขรีวิว
                  </button>
                  <button
                    type="button"
                    onClick={() => promptDeleteReview(r.id)}
                    className="text-xs text-rose-600 hover:bg-rose-50 font-bold border border-rose-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    ลบรีวิว
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= TAB 2: MY COMMUNITY POSTS ================= */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-primary font-headline">
                กระทู้คอมมูนิตี้ของคุณ ({posts.length})
              </h2>
              <p className="text-xs text-on-surface-variant">
                กระทู้พูดคุย สอบถามข้อมูล หรือแลกเปลี่ยนประสบการณ์ที่คุณสร้างไว้
              </p>
            </div>

            <Link
              href="/community"
              className="text-xs bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-opacity shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">forum</span>
              + สร้างกระทู้ใหม่
            </Link>
          </div>

          {postsLoading ? (
            <div className="p-8 text-center text-xs text-on-surface-variant">กำลังโหลดกระทู้ของคุณ...</div>
          ) : posts.length === 0 ? (
            <div className="bg-white border border-outline-variant/60 rounded-3xl p-8 text-center space-y-2 shadow-xs">
              <span className="material-symbols-outlined text-[40px] text-outline">forum</span>
              <p className="text-sm font-bold text-primary">คุณยังไม่ได้สร้างกระทู้ในคอมมูนิตี้</p>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                มีข้อสงสัยเกี่ยวกับการฝึกงาน หรืออยากแชร์เทคนิค สามารถเริ่มสร้างกระทู้พูดคุยได้เลย
              </p>
              <div className="pt-2">
                <Link
                  href="/community"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  ไปที่หน้าคอมมูนิตี้
                </Link>
              </div>
            </div>
          ) : (
            <>
              {posts.slice((postsPage - 1) * profilePageSize, postsPage * profilePageSize).map((post) => (
              <div key={post.id} className="bg-white border border-outline-variant/60 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-secondary/10 text-secondary border border-secondary/20 uppercase">
                        {post.type || "GENERAL"}
                      </span>
                      {post.department && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-container text-on-surface-variant">
                          {post.department}
                        </span>
                      )}
                      {post.is_anonymous && (
                        <span className="bg-surface-container-high px-2 py-0.5 rounded-md text-[10px] font-semibold text-on-surface-variant flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">visibility_off</span>
                          ไม่ระบุตัวตน
                        </span>
                      )}
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        {post.created_at || "-"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-primary hover:underline">
                      <Link href="/community">{post.title}</Link>
                    </h3>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        post.status === "approved"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : post.status === "rejected"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {post.status === "approved" ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          เผยแพร่แล้ว
                        </span>
                      ) : post.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">cancel</span>
                          ถูกปฏิเสธ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                          รอการตรวจสอบ
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Rejection Reason Alert */}
                {post.status === "rejected" && post.rejection_reason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <strong className="font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">info</span>
                      เหตุผลที่กระทู้ไม่ผ่านการอนุมัติ:
                    </strong>
                    <p>{post.rejection_reason}</p>
                  </div>
                )}

                {/* Content snippet */}
                <p className="text-xs text-on-surface-variant bg-surface-container-low/40 p-3 rounded-xl border border-outline-variant/30 leading-relaxed line-clamp-2">
                  {post.content}
                </p>

                {/* Footer / Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-rose-500">favorite</span>
                      {post.like_count || 0} ถูกใจ
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-secondary">chat_bubble</span>
                      {post.comment_count || 0} ความคิดเห็น
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/community"
                      className="px-3 py-1.5 rounded-xl border border-outline-variant/50 text-primary hover:bg-surface-container font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      ดูในคอมมูนิตี้
                    </Link>
                    <button
                      type="button"
                      onClick={() => promptDeletePost(post.id)}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      ลบกระทู้
                    </button>
                    </div>
                  </div>
                </div>
              ))}

              {posts.length > profilePageSize && (
                <div className="pt-2">
                  <Pagination
                    currentPage={postsPage}
                    totalPages={Math.ceil(posts.length / profilePageSize) || 1}
                    onPageChange={setPostsPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ================= TAB 3: STUDENT UPGRADE / ACCOUNT STATUS (External Account only) ================= */}
      {!isEmployer && !isStudent() && activeTab === "status" && (
        <div className="space-y-4">
          <div className="bg-white border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-primary font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
              สถานะสิทธิ์การใช้งานของบัญชี
            </h2>

            {isStudent() ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">school</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-emerald-900">
                      บัญชีได้รับการยืนยันสิทธิ์นักศึกษาเรียบร้อยแล้ว (HTC Student)
                    </h3>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      คุณสามารถเข้าถึงฟังก์ชันทั้งหมดของแพลตฟอร์มได้ เช่น การเขียนรีวิวประสบการณ์ฝึกงาน, การตั้งกระทู้ในคอมมูนิตี้, การให้คะแนนสถานประกอบการ และการดูข้อมูลเชิงลึก
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/40 space-y-1">
                    <span className="text-on-surface-variant font-bold">รหัสนักศึกษา:</span>
                    <p className="font-mono text-sm font-bold text-primary">
                      {userProfile?.student_id || "ระบุผ่านการยืนยันตัวตน"}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/40 space-y-1">
                    <span className="text-on-surface-variant font-bold">แผนกวิชา / สาขา:</span>
                    <p className="text-sm font-bold text-primary">
                      {userProfile?.department || "วิทยาลัยเทคนิคหาดใหญ่"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shrink-0">
                    <span className="material-symbols-outlined text-[20px]">school</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary text-sm">คุณใช้อีเมลส่วนตัว (External Account)</h4>
                    <p className="text-xs text-on-surface-variant">
                      หากคุณเป็นนักศึกษาวิทยาลัยเทคนิคหาดใหญ่ สามารถยื่นภาพบัตรนักศึกษาเพื่อขอเปิดสิทธิ์การเขียนรีวิวและใช้งานคอมมูนิตี้ได้
                    </p>
                  </div>
                </div>
                <Link
                  href="/"
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-opacity-95 shrink-0"
                >
                  ยื่นคำขอสิทธิ์นักศึกษา
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reusable Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        loading={deleteLoading}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Image Lightbox Modal for Review Photos */}
      <ImageLightboxModal
        isOpen={lightbox.isOpen}
        images={lightbox.images}
        initialIndex={lightbox.index}
        onClose={() => setLightbox((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
