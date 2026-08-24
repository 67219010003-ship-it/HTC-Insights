"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isEmployer } from "@/lib/auth";
import ReportModal from "@/components/ReportModal";
import Toast from "@/components/Toast";

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id;
  const [post, setPost] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: "success" | "error" | "info" }>({
    isOpen: false,
    message: "",
    type: "info",
  });

  // Report Modal state
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    targetType: "post" | "comment";
    targetId: number;
    title: string;
  }>({
    isOpen: false,
    targetType: "post",
    targetId: 0,
    title: "",
  });

  useEffect(() => {
    // Check if external user
    const token = typeof window !== "undefined" ? localStorage.getItem("htc_token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("htc_role") : null;
    const userStr = typeof window !== "undefined" ? localStorage.getItem("htc_user") : null;
    let userEmail = "";
    try {
      if (userStr) userEmail = JSON.parse(userStr)?.email || "";
    } catch {}

    const isInternal = role === "admin" || (role === "student" && (!userEmail || userEmail.endsWith("@htc.ac.th")));
    if (!token || (!isInternal && role === "external")) {
      router.replace("/");
      return;
    }

    if (!postId) return;
    api.get(`/community/posts/${postId}`).then((res) => setPost(res.data)).catch(() => {});
  }, [postId, router]);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    if (comment.trim().length < 2 || comment.trim().length > 600) {
      setToast({ isOpen: true, message: "ความคิดเห็นต้องมีความยาวระหว่าง 2 - 600 ตัวอักษร", type: "error" });
      return;
    }
    try {
      await api.post(`/community/posts/${postId}/comments`, {
        content: comment.trim(),
        is_anonymous: isAnonymous,
      });
      setComment("");
      const updated = await api.get(`/community/posts/${postId}`);
      setPost(updated.data);
      setToast({ isOpen: true, message: "แสดงความคิดเห็นเรียบร้อยแล้ว", type: "success" });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : "เกิดข้อผิดพลาดในการส่งความคิดเห็น";
      setToast({ isOpen: true, message: msg, type: "error" });
    }
  };

  const handleLike = async () => {
    try {
      await api.post(`/community/posts/${postId}/like`);
      const updated = await api.get(`/community/posts/${postId}`);
      setPost(updated.data);
    } catch (err: any) {}
  };

  if (!post) {
    return <div className="p-8 text-center text-on-surface-variant">กำลังโหลดกระทู้...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 md:p-8 mb-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <span className="bg-primary-container/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-semibold">
            {post.type === "experience"
              ? "แชร์ประสบการณ์"
              : post.type === "qa"
              ? "ถาม-ตอบ Q&A"
              : post.type === "tips"
              ? "เทคนิคเตรียมตัว"
              : post.type === "team"
              ? "หาเพื่อนร่วมทีม"
              : "พูดคุยทั่วไป"}
          </span>
          {post.department && (
            <span className="bg-secondary-container text-on-secondary-container border border-secondary/20 px-3 py-1 rounded-full text-xs font-bold">
              {post.department}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-primary font-headline mb-4 leading-snug">{post.title}</h1>
        <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-line mb-6">{post.content}</p>

        <div className="flex justify-between items-center pt-4 border-t border-outline-variant/20 text-xs">
          <span className="font-bold text-primary">
            โดย: {post.is_anonymous ? "นักศึกษา HTC (ไม่ระบุชื่อ)" : post.author_name}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setReportModal({
                  isOpen: true,
                  targetType: "post",
                  targetId: post.id,
                  title: "รายงานโพสต์",
                })
              }
              className="flex items-center gap-1 text-slate-500 hover:text-amber-600 font-bold border border-slate-200 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="รายงานโพสต์นี้"
            >
              <span className="material-symbols-outlined text-sm">flag</span>
              รายงานโพสต์
            </button>
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 text-secondary font-bold hover:bg-secondary/10 px-3 py-1.5 rounded-lg border border-secondary/20 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">thumb_up</span>
              {post.like_count} ถูกใจ
            </button>
          </div>
        </div>
      </div>

      {/* Add Comment Section */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-primary">เขียนความคิดเห็น (2 - 600 ตัวอักษร)</h3>
          <span className={`text-[11px] font-bold ${comment.trim().length >= 2 && comment.length <= 600 ? 'text-emerald-600' : 'text-on-surface-variant'}`}>
            {comment.length}/600
          </span>
        </div>
        <textarea
          rows={3}
          minLength={2}
          maxLength={600}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="พิมพ์ข้อความตอบกลับ..."
          className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm mb-3 focus:outline-none focus:border-secondary"
        />
        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded text-secondary focus:ring-secondary"
            />
            ตอบแบบไม่ระบุชื่อ
          </label>
          <button
            onClick={handleAddComment}
            className="px-5 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-bold hover:bg-secondary/90 shadow-sm transition-all cursor-pointer"
          >
            ส่งความคิดเห็น
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-primary px-1">
          ความคิดเห็น ({post.comments?.length || 0})
        </h3>
        {post.comments?.length === 0 ? (
          <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-xs text-on-surface-variant text-center">
            ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น!
          </div>
        ) : (
          post.comments?.map((c: any) => (
            <div key={c.id} className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-sm space-y-1">
              <div className="flex justify-between items-center text-xs text-on-surface-variant mb-1">
                <span className="font-bold text-primary">
                  {c.is_anonymous ? "นักศึกษาไม่ระบุชื่อ" : c.author_name || "นักศึกษา"}
                </span>
                <div className="flex items-center gap-3">
                  <span>{c.created_at}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setReportModal({
                        isOpen: true,
                        targetType: "comment",
                        targetId: c.id,
                        title: "รายงานความคิดเห็น",
                      })
                    }
                    className="text-slate-400 hover:text-amber-600 flex items-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer"
                    title="รายงานความคิดเห็นนี้"
                  >
                    <span className="material-symbols-outlined text-[14px]">flag</span>
                    รายงานความคิดเห็น
                  </button>
                </div>
              </div>
              <p className="text-on-surface leading-relaxed">{c.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModal.isOpen}
        title={reportModal.title}
        targetType={reportModal.targetType}
        targetId={reportModal.targetId}
        onClose={() => setReportModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
