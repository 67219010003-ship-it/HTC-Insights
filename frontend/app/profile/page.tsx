"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { isStudent, getToken, clearToken, getRole, getUser } from "@/lib/auth";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import Toast from "@/components/Toast";
import ImageLightboxModal from "@/components/ImageLightboxModal";
import Pagination from "@/components/Pagination";
import DepartmentDropdown, { ALL_DEPARTMENTS } from "@/components/DepartmentDropdown";

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

interface UpgradeRequestData {
  id: number;
  student_id: string;
  department: string;
  phone?: string;
  reason?: string;
  card_image_url?: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  created_at?: string;
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

interface MyComment {
  id: number;
  post_id: number;
  post_title?: string;
  content: string;
  is_anonymous: boolean;
  status: string;
  rejection_reason?: string;
  like_count: number;
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
  contact_person?: string;
  phone?: string;
  email?: string;
  line_id?: string;
  created_at?: string;
}

type ProfileTab = "reviews" | "posts" | "comments" | "employer_jobs" | "employer_status" | "upgrade";

export default function StudentProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      return getUser();
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    if (typeof window !== "undefined") {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam === "upgrade") return "upgrade";
      const r = getRole();
      if (r === "employer") return "employer_jobs";
      if (r === "student") return "reviews";
      if (r === "external") return "employer_jobs";
      return "reviews";
    }
    return "reviews";
  });

  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [employerJobs, setEmployerJobs] = useState<EmployerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [commentsPage, setCommentsPage] = useState(1);
  const [jobsPage, setJobsPage] = useState(1);
  const profilePageSize = 5;

  // Upgrade Request State
  const [upgradeRequest, setUpgradeRequest] = useState<UpgradeRequestData | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(true);
  const [upgradeEditing, setUpgradeEditing] = useState(false);
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);
  const [upgradeStatusMsg, setUpgradeStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [upgradeStudentId, setUpgradeStudentId] = useState("");
  const [upgradeDepartment, setUpgradeDepartment] = useState("แผนกวิชาเทคโนโลยีสารสนเทศ");
  const [upgradePhone, setUpgradePhone] = useState("");
  const [upgradeReason, setUpgradeReason] = useState("");
  const [upgradeCardFile, setUpgradeCardFile] = useState<File | null>(null);
  const [upgradeCardPreviewUrl, setUpgradeCardPreviewUrl] = useState<string>("");
  const [showDeleteUpgradeModal, setShowDeleteUpgradeModal] = useState(false);
  const [deleteUpgradeLoading, setDeleteUpgradeLoading] = useState(false);

  // Edit Comment Modal State
  const [editCommentModal, setEditCommentModal] = useState<{
    isOpen: boolean;
    comment: MyComment | null;
    content: string;
  }>({
    isOpen: false,
    comment: null,
    content: "",
  });
  const [editCommentLoading, setEditCommentLoading] = useState(false);

  // Edit Job Modal State
  const [editJobModal, setEditJobModal] = useState<{
    isOpen: boolean;
    job: EmployerJob | null;
    title: string;
    department: string;
    daily_allowance: string;
    location: string;
    description: string;
    contact_person: string;
    phone: string;
    line_id: string;
  }>({
    isOpen: false,
    job: null,
    title: "",
    department: "",
    daily_allowance: "",
    location: "",
    description: "",
    contact_person: "",
    phone: "",
    line_id: "",
  });
  const [editJobLoading, setEditJobLoading] = useState(false);

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
    type: "info",
    confirmText: "ตกลง",
    onConfirm: () => {},
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "info",
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
    if (!getToken()) {
      window.location.replace("/auth/login");
      return;
    }
    setLoading(true);
    setJobsLoading(true);
    setPostsLoading(true);
    setCommentsLoading(true);
    setUpgradeLoading(true);

    try {
      const [meRes, jobsRes, revRes, postRes, commRes, upgRes] = await Promise.allSettled([
        api.get("/auth/me"),
        api.get("/jobs/my-postings"),
        api.get("/reviews/my"),
        api.get("/community/my-posts"),
        api.get("/community/my-comments"),
        api.get("/auth/my-upgrade-request"),
      ]);

      if (meRes.status === "fulfilled" && meRes.value.data) {
        setUserProfile(meRes.value.data);
      }
      if (jobsRes.status === "fulfilled" && Array.isArray(jobsRes.value.data)) {
        setEmployerJobs(jobsRes.value.data);
      } else {
        setEmployerJobs([]);
      }
      if (revRes.status === "fulfilled" && Array.isArray(revRes.value.data)) {
        setReviews(revRes.value.data);
      } else {
        setReviews([]);
      }
      if (postRes.status === "fulfilled" && Array.isArray(postRes.value.data)) {
        setPosts(postRes.value.data);
      } else {
        setPosts([]);
      }
      if (commRes.status === "fulfilled" && Array.isArray(commRes.value.data)) {
        setComments(commRes.value.data);
      } else {
        setComments([]);
      }
      if (upgRes.status === "fulfilled" && upgRes.value.data?.has_request && upgRes.value.data?.request) {
        const req = upgRes.value.data.request as UpgradeRequestData;
        setUpgradeRequest(req);
        setUpgradeStudentId(req.student_id || "");
        setUpgradeDepartment(req.department || "แผนกวิชาเทคโนโลยีสารสนเทศ");
        setUpgradePhone(req.phone || "");
        setUpgradeReason(req.reason || "");
        setUpgradeCardPreviewUrl(req.card_image_url || "");
      } else {
        setUpgradeRequest(null);
      }
    } catch (err) {
      console.error("fetchUserData error:", err);
    } finally {
      setLoading(false);
      setJobsLoading(false);
      setPostsLoading(false);
      setCommentsLoading(false);
      setUpgradeLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleSaveUpgradeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeStudentId) {
      setUpgradeStatusMsg({ text: "กรุณากรอกรหัสนักศึกษา", isError: true });
      return;
    }
    const cleanStudentId = upgradeStudentId.replace(/\D/g, "");
    if (cleanStudentId.length !== 11) {
      setUpgradeStatusMsg({ text: "รหัสนักศึกษาต้องเป็นตัวเลข 11 หลักเท่านั้น (เช่น 67219010003)", isError: true });
      return;
    }
    if (!upgradeCardFile && !upgradeCardPreviewUrl) {
      setUpgradeStatusMsg({ text: "กรุณาแนบรูปภาพหลักฐานบัตรประจำตัวนักศึกษา", isError: true });
      return;
    }
    if (upgradePhone.trim()) {
      const cleanPhone = upgradePhone.replace(/\D/g, "");
      if (cleanPhone.length < 9 || cleanPhone.length > 10) {
        setUpgradeStatusMsg({ text: "เบอร์โทรศัพท์ติดต่อต้องเป็นตัวเลข 9-10 หลัก (เช่น 000-000-0000)", isError: true });
        return;
      }
    }
    if (upgradeReason.trim().length > 300) {
      setUpgradeStatusMsg({ text: "เหตุผลเพิ่มเติมต้องมีความยาวไม่เกิน 300 ตัวอักษร", isError: true });
      return;
    }

    setUpgradeSubmitting(true);
    setUpgradeStatusMsg(null);
    try {
      let finalCardUrl = upgradeCardPreviewUrl;
      if (upgradeCardFile) {
        const formData = new FormData();
        formData.append("file", upgradeCardFile);
        const uploadRes = await api.post("/auth/upload-proof", formData);
        finalCardUrl = uploadRes.data?.url;
      }

      if (upgradeEditing && upgradeRequest) {
        await api.put("/auth/my-upgrade-request", {
          student_id: cleanStudentId,
          department: upgradeDepartment,
          phone: upgradePhone.trim() || undefined,
          reason: upgradeReason.trim() || undefined,
          card_image_url: finalCardUrl,
        });
        setUpgradeStatusMsg({
          text: "แก้ไขและส่งคำขอยืนยันสิทธิ์นักศึกษาเรียบร้อยแล้ว แอดมินจะทำการตรวจสอบข้อมูลอีกครั้ง",
          isError: false,
        });
      } else {
        await api.post("/auth/request-student-verification", {
          student_id: cleanStudentId,
          department: upgradeDepartment,
          phone: upgradePhone.trim() || undefined,
          reason: upgradeReason.trim() || undefined,
          card_image_url: finalCardUrl,
        });
        setUpgradeStatusMsg({
          text: "ส่งคำขอตรวจสอบสิทธิ์นักศึกษาเรียบร้อยแล้ว แอดมินจะดำเนินการตรวจสอบภายใน 1-2 วันทำการ",
          isError: false,
        });
      }
      setUpgradeCardFile(null);
      setUpgradeEditing(false);
      fetchUserData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "เกิดข้อผิดพลาดในการยื่นคำร้อง";
      setUpgradeStatusMsg({ text: errorMsg, isError: true });
    } finally {
      setUpgradeSubmitting(false);
    }
  };

  const handleDeleteUpgradeRequest = async () => {
    setDeleteUpgradeLoading(true);
    try {
      await api.delete("/auth/my-upgrade-request");
      setShowDeleteUpgradeModal(false);
      setUpgradeRequest(null);
      setUpgradeStudentId("");
      setUpgradeDepartment("แผนกวิชาเทคโนโลยีสารสนเทศ");
      setUpgradePhone("");
      setUpgradeReason("");
      setUpgradeCardFile(null);
      setUpgradeCardPreviewUrl("");
      setUpgradeEditing(false);
      setUpgradeStatusMsg({ text: "ลบคำขอยืนยันสิทธิ์นักศึกษาเรียบร้อยแล้ว", isError: false });
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || "ไม่สามารถลบคำขอได้";
      setUpgradeStatusMsg({ text: errorMsg, isError: true });
      setShowDeleteUpgradeModal(false);
    } finally {
      setDeleteUpgradeLoading(false);
    }
  };

  const handleOpenEditComment = (c: MyComment) => {
    setEditCommentModal({
      isOpen: true,
      comment: c,
      content: c.content,
    });
  };

  const handleSaveEditComment = async () => {
    if (!editCommentModal.comment) return;
    if (editCommentModal.content.trim().length < 2 || editCommentModal.content.trim().length > 600) {
      setToast({ isOpen: true, message: "ความคิดเห็นต้องมีความยาว 2-600 ตัวอักษร", type: "error" });
      return;
    }
    try {
      setEditCommentLoading(true);
      await api.put(`/community/comments/${editCommentModal.comment.id}`, {
        content: editCommentModal.content.trim(),
      });
      setToast({ isOpen: true, message: "แก้ไขความคิดเห็นเรียบร้อยแล้ว (ส่งให้ Admin ตรวจสอบใหม่)", type: "success" });
      setEditCommentModal({ isOpen: false, comment: null, content: "" });
      fetchUserData();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการแก้ไขความคิดเห็น", type: "error" });
    } finally {
      setEditCommentLoading(false);
    }
  };

  const promptDeleteComment = (commentId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบความคิดเห็น",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบความคิดเห็นนี้ออกจากกระทู้?",
      type: "danger",
      confirmText: "ยืนยันลบความคิดเห็น",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/community/comments/${commentId}`);
          setToast({ isOpen: true, message: "ลบความคิดเห็นเรียบร้อยแล้ว", type: "success" });
          fetchUserData();
        } catch (err: any) {
          setToast({ isOpen: true, message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการลบความคิดเห็น", type: "error" });
        }
      },
    });
  };

  const handleOpenEditJob = (job: EmployerJob) => {
    setEditJobModal({
      isOpen: true,
      job,
      title: job.title || "",
      department: job.department || "",
      daily_allowance: job.daily_allowance ? String(job.daily_allowance) : "",
      location: job.location || "",
      description: job.description || "",
      contact_person: job.contact_person || "",
      phone: job.phone || "",
      line_id: job.line_id || "",
    });
  };

  const handleSaveEditJob = async () => {
    if (!editJobModal.job) return;
    if (!editJobModal.title.trim()) {
      setToast({ isOpen: true, message: "กรุณาระบุตำแหน่งงาน", type: "error" });
      return;
    }
    try {
      setEditJobLoading(true);
      await api.put(`/jobs/${editJobModal.job.id}`, {
        title: editJobModal.title.trim(),
        department: editJobModal.department.trim(),
        daily_allowance: editJobModal.daily_allowance ? parseInt(editJobModal.daily_allowance) : 0,
        location: editJobModal.location.trim(),
        description: editJobModal.description.trim(),
        contact_person: editJobModal.contact_person.trim(),
        phone: editJobModal.phone.trim(),
        line_id: editJobModal.line_id.trim(),
      });
      setToast({ isOpen: true, message: "แก้ไขประกาศงานเรียบร้อยแล้ว (ส่งให้ Admin ตรวจสอบใหม่)", type: "success" });
      setEditJobModal((prev) => ({ ...prev, isOpen: false, job: null }));
      fetchUserData();
    } catch (err: any) {
      setToast({ isOpen: true, message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการแก้ไขประกาศงาน", type: "error" });
    } finally {
      setEditJobLoading(false);
    }
  };

  const promptDeleteJob = (jobId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบประกาศรับสมัครงาน",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบประกาศงานนี้? เมื่อลบแล้วประกาศจะไม่แสดงในระบบอีกต่อไป",
      type: "danger",
      confirmText: "ยืนยันลบประกาศงาน",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.delete(`/jobs/${jobId}`);
          setToast({ isOpen: true, message: "ลบประกาศงานเรียบร้อยแล้ว", type: "success" });
          fetchUserData();
        } catch (err: any) {
          setToast({ isOpen: true, message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการลบประกาศงาน", type: "error" });
        }
      },
    });
  };

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
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบ รีวิว นี้อย่างถาวรจากฐานข้อมูล? การกระทำนี้ไม่สามารถย้อนกลับได้",
      type: "danger",
      confirmText: "ยืนยัน ลบถาวร",
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

  const currentRole = userProfile?.role || (typeof window !== "undefined" ? getRole() : null);
  const isEmployer = currentRole === "employer";
  const isStudentUser = currentRole === "student" || (currentRole !== "employer" && isStudent());
  const isExternal = !isEmployer && !isStudentUser;
  const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

  if (loading && !userProfile) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white border border-outline-variant/60 rounded-3xl p-6 sm:p-8 shadow-sm animate-pulse flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-surface-container-high shrink-0" />
          <div className="space-y-3 flex-1 w-full text-center sm:text-left">
            <div className="h-6 bg-slate-200 rounded-lg w-48 mx-auto sm:mx-0" />
            <div className="h-4 bg-slate-100 rounded-lg w-64 mx-auto sm:mx-0" />
          </div>
        </div>
        <div className="h-64 bg-white border border-outline-variant/60 rounded-3xl p-6 shadow-sm animate-pulse" />
      </div>
    );
  }

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
                      {userProfile?.is_approved ? "check_circle" : "schedule"}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-surface-container-low/60 p-3 sm:py-2.5 sm:px-4 rounded-2xl text-center border border-outline-variant/40 mt-5">
            <div className="py-1">
              <div className="text-lg sm:text-xl font-bold text-primary">{employerJobs.length}</div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">ประกาศงานทั้งหมด</div>
            </div>
            <div className="py-1 sm:border-l sm:border-outline-variant/30">
              <div className="text-lg sm:text-xl font-bold text-secondary">
                {employerJobs.filter((j) => j.status === "approved" && j.is_active).length}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">งานที่เผยแพร่อยู่</div>
            </div>
            <div className="py-1 sm:border-l sm:border-outline-variant/30">
              <div className="text-lg sm:text-xl font-bold text-amber-600">
                {employerJobs.filter((j) => j.status === "pending").length}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">ประกาศรออนุมัติ</div>
            </div>
            <div className="py-1 sm:border-l sm:border-outline-variant/30">
              <div className={`text-sm sm:text-base font-bold ${userProfile?.is_approved ? "text-emerald-600" : "text-amber-600"}`}>
                {userProfile?.is_approved ? "อนุมัติแล้ว" : "รอตรวจสอบ"}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">สถานะสถานประกอบการ</div>
            </div>
          </div>
        ) : isExternal ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-surface-container-low/60 p-3 sm:py-2.5 sm:px-4 rounded-2xl text-center border border-outline-variant/40 mt-5">
            <div className="py-1">
              <div className="text-lg sm:text-xl font-bold text-primary">{employerJobs.length}</div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">ประกาศงานทั้งหมด</div>
            </div>
            <div className="py-1 sm:border-l sm:border-outline-variant/30">
              <div className="text-lg sm:text-xl font-bold text-secondary">
                {employerJobs.filter((j) => j.status === "approved" && j.is_active).length}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">ประกาศที่อนุมัติแล้ว</div>
            </div>
            <div className="py-1 sm:border-l sm:border-outline-variant/30">
              <div className="text-lg sm:text-xl font-bold text-amber-600">
                {employerJobs.filter((j) => j.status === "pending").length}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">ประกาศรออนุมัติ</div>
            </div>
            <div className="py-1 sm:border-l sm:border-outline-variant/30">
              <div className="text-sm sm:text-base font-bold text-on-surface-variant flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person_outline</span>
                ผู้ใช้ภายนอก
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">สถานะสิทธิ์ในระบบ</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-surface-container-low/60 p-3 sm:py-2.5 sm:px-4 rounded-2xl text-center border border-outline-variant/40 mt-5">
            <div className="py-1">
              <div className="text-lg sm:text-xl font-bold text-primary">{reviews.length}</div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">รีวิวที่ส่งทั้งหมด</div>
            </div>
            <div className="py-1 sm:border-l sm:border-outline-variant/30">
              <div className="text-lg sm:text-xl font-bold text-secondary">
                {reviews.filter((r) => r.status === "approved").length}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">รีวิวที่อนุมัติแล้ว</div>
            </div>
            <div className="py-1 sm:border-l sm:border-outline-variant/30">
              <div className="text-lg sm:text-xl font-bold text-primary">
                {posts.length}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">กระทู้คอมมูนิตี้</div>
            </div>
            <div className="py-1 sm:border-l sm:border-outline-variant/30">
              <div className="text-lg sm:text-xl font-bold text-emerald-600">
                {comments.length}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-on-surface-variant">ความคิดเห็นของฉัน</div>
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
              ประกาศงานฝึกงานของฉัน ({jobsLoading ? "..." : employerJobs.length})
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
        ) : isExternal ? (
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
              ประกาศรับสมัครงานของฉัน ({jobsLoading ? "..." : employerJobs.length})
            </button>

            <Link
              href="/profile/upgrade"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-purple-600">
                {upgradeRequest ? "assignment" : "verified"}
              </span>
              {upgradeLoading ? "ตรวจสอบสิทธิ์..." : upgradeRequest ? "ประวัติคำขอยื่นสิทธิ์นักศึกษา" : "ยื่นขอสิทธิ์นักศึกษา"}
            </Link>
          </>
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
              รีวิวของฉัน ({loading ? "..." : reviews.length})
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
              กระทู้ชุมชนของฉัน ({postsLoading ? "..." : posts.length})
            </button>

            <button
              onClick={() => setActiveTab("comments")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === "comments"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              ความคิดเห็นของฉัน ({commentsLoading ? "..." : comments.length})
            </button>

            {(jobsLoading || employerJobs.length > 0) && (
              <button
                onClick={() => setActiveTab("employer_jobs")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "employer_jobs"
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">work</span>
                ประกาศรับสมัครงาน ({jobsLoading ? "..." : employerJobs.length})
              </button>
            )}
          </>
        )}
      </div>

      {/* ================= EMPLOYER / EXTERNAL TAB 1: MY JOB POSTINGS ================= */}
      {(isEmployer || isExternal || employerJobs.length > 0) && activeTab === "employer_jobs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-primary font-headline">
                {isExternal ? "ประกาศรับสมัครงานของฉัน" : "ประกาศรับสมัครฝึกงานของสถานประกอบการ"} ({jobsLoading ? "..." : employerJobs.length})
              </h2>
              <p className="text-xs text-on-surface-variant">
                จัดการประกาศงาน ตรวจสอบสถานะการอนุมัติจากผู้ดูแลระบบ หรือแก้ไข/ลบประกาศ
              </p>
            </div>

            {!jobsLoading && employerJobs.length === 0 && (
              <Link
                href="/employer/register"
                className="text-xs bg-secondary text-white px-4 py-2 rounded-xl font-bold hover:bg-opacity-90 transition-opacity shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_business</span>
                + ลงประกาศรับสมัครฝึกงาน
              </Link>
            )}
          </div>

          {jobsLoading ? (
            <div className="bg-white border border-outline-variant/60 rounded-3xl p-12 text-center space-y-3 shadow-xs">
              <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-on-surface-variant">กำลังโหลดรายการประกาศงาน...</p>
            </div>
          ) : employerJobs.length === 0 ? (
            <div className="bg-white border border-outline-variant/60 rounded-3xl p-8 text-center space-y-2 shadow-xs">
              <span className="material-symbols-outlined text-[40px] text-outline">work_off</span>
              <p className="text-sm font-bold text-primary">คุณยังไม่มีประกาศรับสมัครฝึกงานในระบบ</p>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                เริ่มต้นลงประกาศตำแหน่งงานเพื่อเปิดรับสมัครนักศึกษาวิทยาลัยเทคนิคหาดใหญ่เข้าร่วมงาน
              </p>
              <div className="pt-2">
                <Link
                  href="/employer/register"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-secondary/90 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add_business</span>
                  ลงประกาศรับสมัครนักศึกษาฝึกงาน
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
                              <span className="material-symbols-outlined text-[13px]">schedule</span>
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

                    {/* Description & Contact Preview */}
                    {job.description && (
                      <p className="text-xs text-on-surface-variant bg-surface-container-low/40 p-3 rounded-xl border border-outline-variant/30 leading-relaxed whitespace-pre-line">
                        {job.description}
                      </p>
                    )}

                    {/* Action footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs flex-wrap gap-2">
                      <span className={`font-semibold flex items-center gap-1 ${job.is_active ? "text-emerald-700" : "text-slate-500"}`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {job.is_active ? "check_circle" : "pause_circle"}
                        </span>
                        สถานะการเปิดรับ: {job.is_active ? "เปิดรับสมัครอยู่" : "ปิดรับสมัครชั่วคราว"}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditJob(job)}
                          className="px-3 py-1.5 rounded-xl border border-secondary/30 text-secondary hover:bg-secondary/10 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          แก้ไขประกาศ
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDeleteJob(job.id)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          ลบประกาศ
                        </button>
                        <Link
                          href="/jobs"
                          className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-bold text-xs transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          ดูหน้ารับสมัคร
                        </Link>
                      </div>
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
                  <span className="material-symbols-outlined text-[22px]">schedule</span>
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
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          รอการอนุมัติ
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
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          รอการอนุมัติ
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

      {/* ================= TAB: MY COMMUNITY COMMENTS ================= */}
      {activeTab === "comments" && (
        <div id="comments-profile-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40">
            <div>
              <h3 className="font-bold text-primary text-sm sm:text-base font-headline">
                ประวัติความคิดเห็นในคอมมูนิตี้ ({comments.length})
              </h3>
              <p className="text-xs text-on-surface-variant">
                ความคิดเห็นทั้งหมดที่คุณเคยตอบกลับในกระทู้ต่างๆ
              </p>
            </div>
            <Link
              href="/community"
              className="px-4 py-2 bg-secondary text-on-secondary hover:bg-secondary/90 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">forum</span>
              ไปที่คอมมูนิตี้
            </Link>
          </div>

          {commentsLoading ? (
            <div className="p-8 text-center bg-white border border-outline-variant/50 rounded-2xl">
              <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-on-surface-variant font-bold">กำลังโหลดรายการความคิดเห็น...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 bg-white border border-outline-variant/50 rounded-2xl space-y-3">
              <span className="material-symbols-outlined text-4xl text-outline">chat_bubble_outline</span>
              <p className="text-xs text-on-surface-variant font-semibold">
                คุณยังไม่ได้แสดงความคิดเห็นในกระทู้ใดๆ
              </p>
              <Link
                href="/community"
                className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90"
              >
                ร่วมแสดงความคิดเห็นในคอมมูนิตี้
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {comments
                  .slice((commentsPage - 1) * profilePageSize, commentsPage * profilePageSize)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-outline-variant/60 rounded-2xl p-5 shadow-xs space-y-3 hover:border-outline-variant transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[11px] text-on-surface-variant block font-medium">ตอบกลับในกระทู้:</span>
                          <Link
                            href={`/community/${c.post_id}`}
                            className="font-bold text-primary text-sm hover:text-secondary transition-colors line-clamp-1 block"
                          >
                            {c.post_title || "กระทู้ในคอมมูนิตี้"} →
                          </Link>
                          <span className="text-[10px] text-on-surface-variant font-mono block">
                            {c.created_at || "-"}
                          </span>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${
                            c.status === "approved"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : c.status === "rejected"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {c.status === "approved" ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              อนุมัติแล้ว
                            </span>
                          ) : c.status === "rejected" ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">cancel</span>
                              ถูกปฏิเสธ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">schedule</span>
                              รอการอนุมัติ
                            </span>
                          )}
                        </span>
                      </div>

                      {c.status === "rejected" && c.rejection_reason && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                          <strong className="font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">info</span>
                            เหตุผลที่ไม่ผ่านการอนุมัติ:
                          </strong>
                          <p>{c.rejection_reason}</p>
                        </div>
                      )}

                      <p className="text-xs text-on-surface bg-surface-container-low/40 p-3.5 rounded-xl border border-outline-variant/30 leading-relaxed whitespace-pre-line">
                        {c.content}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs">
                        <div className="flex items-center gap-1 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[15px] text-secondary">thumb_up</span>
                          <span>{c.like_count || 0} ถูกใจ</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditComment(c)}
                            className="px-3 py-1.5 bg-surface-container text-primary hover:bg-surface-container-high font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            แก้ไขความคิดเห็น
                          </button>
                          <button
                            type="button"
                            onClick={() => promptDeleteComment(c.id)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold border border-rose-200 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                            ลบ
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {comments.length > profilePageSize && (
                <div className="pt-2">
                  <Pagination
                    currentPage={commentsPage}
                    totalPages={Math.ceil(comments.length / profilePageSize) || 1}
                    onPageChange={setCommentsPage}
                    scrollTargetId="comments-profile-section"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit Comment Modal */}
      {editCommentModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-outline-variant">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">edit</span>
                <h3 className="font-bold text-primary text-base">แก้ไขความคิดเห็น</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditCommentModal({ isOpen: false, comment: null, content: "" })}
                className="text-on-surface-variant hover:text-primary p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-primary">ข้อความความคิดเห็น (2-600 ตัวอักษร)</label>
                <span className={`font-bold ${editCommentModal.content.length >= 2 && editCommentModal.content.length <= 600 ? "text-emerald-600" : "text-on-surface-variant"}`}>
                  {editCommentModal.content.length}/600
                </span>
              </div>
              <textarea
                rows={4}
                minLength={2}
                maxLength={600}
                value={editCommentModal.content}
                onChange={(e) => setEditCommentModal((prev) => ({ ...prev, content: e.target.value }))}
                className="w-full p-3 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none text-xs leading-relaxed"
                placeholder="พิมพ์ข้อความความคิดเห็น..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setEditCommentModal({ isOpen: false, comment: null, content: "" })}
                className="px-4 py-2 bg-surface-container text-on-surface-variant hover:bg-surface-container-high rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={editCommentLoading}
                onClick={handleSaveEditComment}
                className="px-5 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {editCommentLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Posting Modal */}
      {editJobModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-outline-variant max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  edit_note
                </span>
                <h3 className="font-bold text-primary text-base">
                  แก้ไขประกาศรับสมัครงาน
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditJobModal((prev) => ({ ...prev, isOpen: false, job: null }))}
                className="text-on-surface-variant hover:text-primary p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-primary block mb-1">ตำแหน่งงาน *</label>
                <input
                  type="text"
                  value={editJobModal.title}
                  onChange={(e) => setEditJobModal((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none text-xs"
                  placeholder="เช่น ช่างเทคนิคฝึกงาน / ผู้ช่วยช่างยนต์"
                />
              </div>

              <div>
                <label className="font-bold text-primary block mb-1">แผนกวิชาที่เปิดรับ</label>
                <select
                  value={editJobModal.department}
                  onChange={(e) => setEditJobModal((prev) => ({ ...prev, department: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none text-xs"
                >
                  {ALL_DEPARTMENTS.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-primary block mb-1">เบี้ยเลี้ยง (บาท/วัน - สูงสุด 5 หลัก)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={editJobModal.daily_allowance}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 5);
                      setEditJobModal((prev) => ({ ...prev, daily_allowance: digits }));
                    }}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none text-xs font-mono"
                    placeholder="เช่น 400 (สูงสุด 99,999)"
                  />
                </div>
                <div>
                  <label className="font-bold text-primary block mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                  <input
                    type="tel"
                    maxLength={12}
                    value={editJobModal.phone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                      let formatted = digits;
                      if (digits.length > 2 && digits.startsWith("02")) {
                        formatted = digits.length <= 5 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
                      } else if (digits.length > 3) {
                        formatted = digits.length <= 6 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
                      }
                      setEditJobModal((prev) => ({ ...prev, phone: formatted }));
                    }}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none text-xs font-mono"
                    placeholder="เช่น 000-000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-primary block mb-1">ชื่อผู้ติดต่อ / HR (สูงสุด 30 ตัวอักษร)</label>
                  <input
                    type="text"
                    maxLength={30}
                    value={editJobModal.contact_person}
                    onChange={(e) => setEditJobModal((prev) => ({ ...prev, contact_person: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none text-xs"
                    placeholder="เช่น ฝ่ายบุคคล / HR"
                  />
                </div>
                <div>
                  <label className="font-bold text-primary block mb-1">LINE ID (สูงสุด 30 ตัวอักษร)</label>
                  <input
                    type="text"
                    maxLength={30}
                    value={editJobModal.line_id}
                    onChange={(e) => setEditJobModal((prev) => ({ ...prev, line_id: e.target.value }))}
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none text-xs"
                    placeholder="เช่น @company_hr"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-primary block mb-1">สถานที่ปฏิบัติงาน / ที่อยู่</label>
                <input
                  type="text"
                  value={editJobModal.location}
                  onChange={(e) => setEditJobModal((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none text-xs"
                  placeholder="เช่น อ.หาดใหญ่ จ.สงขลา"
                />
              </div>

              <div>
                <label className="font-bold text-primary block mb-1">รายละเอียดงาน / สวัสดิการ</label>
                <textarea
                  rows={4}
                  value={editJobModal.description}
                  onChange={(e) => setEditJobModal((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 bg-surface-container-low border border-outline-variant/40 rounded-xl focus:border-secondary focus:outline-none text-xs leading-relaxed"
                  placeholder="ระบุรายละเอียดงาน สวัสดิการเพิ่มเติม และเงื่อนไขการรับสมัคร..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setEditJobModal((prev) => ({ ...prev, isOpen: false, job: null }))}
                className="px-4 py-2 bg-surface-container text-on-surface-variant hover:bg-surface-container-high rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={editJobLoading}
                onClick={handleSaveEditJob}
                className="px-5 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {editJobLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
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
