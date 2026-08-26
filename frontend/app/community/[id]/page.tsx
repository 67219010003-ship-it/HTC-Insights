"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken, getUser, isStudent, isAdmin } from "@/lib/auth";
import ReportModal from "@/components/ReportModal";
import ConfirmModal from "@/components/ConfirmModal";
import Toast from "@/components/Toast";
import Pagination from "@/components/Pagination";

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id;
  const [post, setPost] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== "undefined") return getUser();
    return null;
  });

  // Edit / Delete Comment state
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteCommentModal, setDeleteCommentModal] = useState<{ isOpen: boolean; commentId: number }>({
    isOpen: false,
    commentId: 0,
  });

  // Toast notification state
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
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
    const token = getToken();
    const isStudentUser = isStudent();
    if (!token || !isStudentUser) {
      router.replace("/");
      return;
    }

    const u = getUser();
    if (u) setCurrentUser(u);

    if (!postId) return;
    api.get(`/community/posts/${postId}`).then((res) => setPost(res.data)).catch(() => {});
  }, [postId, router]);

  const handleAddComment = async () => {
    if (submittingComment) return;
    if (!comment.trim()) return;
    if (comment.trim().length < 2 || comment.trim().length > 600) {
      setToast({ isOpen: true, message: "ความคิดเห็นต้องมีความยาวระหว่าง 2 - 600 ตัวอักษร", type: "error" });
      return;
    }
    try {
      setSubmittingComment(true);
      await api.post(`/community/posts/${postId}/comments`, {
        content: comment.trim(),
        is_anonymous: isAnonymous,
      });
      setComment("");
      const updated = await api.get(`/community/posts/${postId}`);
      setPost(updated.data);
      setToast({ isOpen: true, message: "แสดงความคิดเห็นเรียบร้อยแล้ว (ส่งรอแอดมินอนุมัติ)", type: "success" });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail : "เกิดข้อผิดพลาดในการส่งความคิดเห็น";
      setToast({ isOpen: true, message: msg, type: "error" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStartEditComment = (c: any) => {
    setEditingCommentId(c.id);
    setEditCommentText(c.content);
  };

  const handleSaveEditComment = async (commentId: number) => {
    if (!editCommentText.trim()) return;
    if (editCommentText.trim().length < 2 || editCommentText.trim().length > 600) {
      setToast({ isOpen: true, message: "ความคิดเห็นต้องมีความยาวระหว่าง 2 - 600 ตัวอักษร", type: "error" });
      return;
    }
    try {
      setEditLoading(true);
      await api.put(`/community/comments/${commentId}`, {
        content: editCommentText.trim(),
      });
      setEditingCommentId(null);
      setEditCommentText("");
      const updated = await api.get(`/community/posts/${postId}`);
      setPost(updated.data);
      setToast({ isOpen: true, message: "แก้ไขความคิดเห็นเรียบร้อยแล้ว", type: "success" });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการแก้ไขความคิดเห็น", type: "error" });
    } finally {
      setEditLoading(false);
    }
  };

  const promptDeleteComment = (commentId: number) => {
    setDeleteCommentModal({
      isOpen: true,
      commentId,
    });
  };

  const executeDeleteComment = async () => {
    const commentId = deleteCommentModal.commentId;
    setDeleteCommentModal({ isOpen: false, commentId: 0 });
    try {
      await api.delete(`/community/comments/${commentId}`);
      const updated = await api.get(`/community/posts/${postId}`);
      setPost(updated.data);
      setToast({ isOpen: true, message: "ลบความคิดเห็นเรียบร้อยแล้ว", type: "success" });
    } catch (err: any) {
      setToast({ isOpen: true, message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการลบความคิดเห็น", type: "error" });
    }
  };

  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setToast({ isOpen: true, message: "คัดลอกลิงก์กระทู้เรียบร้อยแล้ว!", type: "success" });
      setTimeout(() => setCopiedShare(false), 2500);
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
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 md:pb-12 space-y-6">
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

        <div className="flex justify-between items-center pt-4 border-t border-outline-variant/20 text-xs flex-wrap gap-2">
          <span className="font-bold text-primary">
            โดย: {post.is_anonymous ? "นักศึกษา HTC (ไม่ระบุชื่อ)" : post.author_name}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 text-slate-600 hover:text-secondary font-bold border border-slate-200 hover:bg-secondary/5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="แชร์กระทู้นี้"
            >
              <span className="material-symbols-outlined text-sm">
                {copiedShare ? "check" : "share"}
              </span>
              {copiedShare ? "คัดลอกลิงก์แล้ว" : "แชร์"}
            </button>
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
      <div id="comments-section" className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 mb-6 shadow-sm">
        {post.my_comment || post.comments?.some((c: any) => currentUser?.id && c.user_id === currentUser.id) ? (
          (() => {
            const userComm = post.my_comment || post.comments?.find((c: any) => currentUser?.id && c.user_id === currentUser.id);
            const isPending = userComm?.status === "pending";
            const isRejected = userComm?.status === "rejected";

            if (isPending) {
              return (
                <div className="p-4 bg-amber-50/90 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-950">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">schedule</span>
                    <span>ความคิดเห็นของคุณอยู่ระหว่างรอผู้ดูแลระบบตรวจสอบอนุมัติ (ข้อความจะไม่แสดงสู่สาธารณะจนกว่าจะได้รับอนุมัติ)</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditComment(userComm)}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => promptDeleteComment(userComm.id)}
                      className="px-3 py-1.5 bg-white text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-50 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      ลบ
                    </button>
                  </div>
                </div>
              );
            }

            if (isRejected) {
              return (
                <div className="p-4 bg-rose-50/90 rounded-xl border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-950">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-rose-600 text-[20px]">cancel</span>
                    <span>ความคิดเห็นของคุณไม่ผ่านการอนุมัติ: {userComm.rejection_reason || "ข้อมูลไม่เหมาะสม"}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditComment(userComm)}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">replay</span>
                      แก้ไขและส่งใหม่
                    </button>
                    <button
                      type="button"
                      onClick={() => promptDeleteComment(userComm.id)}
                      className="px-3 py-1.5 bg-white text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-50 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      ลบ
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                  <span>คุณได้แสดงความคิดเห็นในกระทู้นี้แล้ว (จำกัด 1 ความคิดเห็นต่อกระทู้ เพื่อให้ทุกคนมีส่วนร่วมอย่างเท่าเทียม)</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEditComment(userComm)}
                    className="px-3 py-1.5 bg-secondary text-on-secondary rounded-lg text-xs font-bold hover:bg-secondary/90 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    แก้ไขความคิดเห็นของคุณ
                  </button>
                  <button
                    type="button"
                    onClick={() => promptDeleteComment(userComm.id)}
                    className="px-3 py-1.5 bg-white text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-50 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    ลบ
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          <>
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
              placeholder="พิมพ์ข้อความตอบกลับ (ส่งให้ผู้ดูแลระบบตรวจสอบอนุมัติก่อนเผยแพร่)..."
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
                type="button"
                disabled={submittingComment || comment.trim().length < 2}
                onClick={handleAddComment}
                className="px-5 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-bold hover:bg-secondary/90 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {submittingComment ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังส่ง...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">send</span>
                    <span>ส่งความคิดเห็น</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Comments List */}
      {(() => {
        const approvedComments = (post.comments || []).filter((c: any) => c.status === "approved");
        return (
          <div id="comments-section" className="space-y-3 scroll-mt-20">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-primary">
                ความคิดเห็น ({approvedComments.length})
              </h3>
              {approvedComments.length > pageSize && (
                <span className="text-[11px] text-on-surface-variant font-medium">
                  หน้า {currentPage} จาก {Math.ceil(approvedComments.length / pageSize)}
                </span>
              )}
            </div>
            {approvedComments.length === 0 ? (
              <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-xs text-on-surface-variant text-center">
                ยังไม่มีความคิดเห็นที่ผ่านการอนุมัติ เป็นคนแรกที่แสดงความคิดเห็น!
              </div>
            ) : (
              <>
                {approvedComments
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((c: any) => {
                    const isOwner = Boolean(currentUser?.id && c.user_id === currentUser.id);
                    const isAdm = isAdmin();
                    const canDelete = Boolean(isOwner || isAdm);
                    const isEditingThis = editingCommentId === c.id;

                    return (
                      <div key={c.id} className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-sm space-y-2">
                        <div className="flex justify-between items-center text-xs text-on-surface-variant mb-1 flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-primary">
                              {c.is_anonymous ? "นักศึกษาไม่ระบุชื่อ" : c.author_name || "นักศึกษา"}
                            </span>
                            {isOwner && (
                              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-md font-bold">
                                คุณ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span>{c.created_at}</span>
                            {(isOwner || canDelete) && (
                              <div className="flex items-center gap-1.5 border-l border-outline-variant/30 pl-2">
                                {isOwner && (
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditComment(c)}
                                    className="text-secondary hover:underline flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
                                    title="แก้ไขความคิดเห็นของคุณ"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">edit</span>
                                    แก้ไข
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => promptDeleteComment(c.id)}
                                    className="text-rose-600 hover:underline flex items-center gap-0.5 text-[11px] font-bold cursor-pointer"
                                    title={isAdm && !isOwner ? "ลบความคิดเห็นในฐานะผู้ดูแลระบบ" : "ลบความคิดเห็นของคุณ"}
                                  >
                                    <span className="material-symbols-outlined text-[13px]">delete</span>
                                    ลบ
                                  </button>
                                )}
                              </div>
                            )}
                            {!isOwner && (
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
                                รายงาน
                              </button>
                            )}
                          </div>
                        </div>

                    {isEditingThis ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={2}
                          minLength={2}
                          maxLength={600}
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          className="w-full p-2.5 bg-surface-container-low border border-secondary/50 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-on-surface-variant">
                            {editCommentText.length}/600 ตัวอักษร
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditCommentText("");
                              }}
                              className="px-3 py-1.5 bg-surface-container text-on-surface-variant hover:bg-surface-container-high rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="button"
                              disabled={editLoading}
                              onClick={() => handleSaveEditComment(c.id)}
                              className="px-3 py-1.5 bg-secondary text-white hover:bg-secondary/90 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              {editLoading ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-on-surface leading-relaxed whitespace-pre-line">{c.content}</p>
                    )}
                  </div>
                );
              })}

            {/* Comments Pagination */}
            {approvedComments.length > pageSize && (
              <div className="pt-2">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(approvedComments.length / pageSize) || 1}
                  onPageChange={setCurrentPage}
                  scrollTargetId="comments-section"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  })()}

      {/* Delete Comment Confirm Modal */}
      <ConfirmModal
        isOpen={deleteCommentModal.isOpen}
        title="ยืนยันการลบความคิดเห็น"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบความคิดเห็นนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
        type="danger"
        confirmText="ยืนยันลบความคิดเห็น"
        onConfirm={executeDeleteComment}
        onClose={() => setDeleteCommentModal({ isOpen: false, commentId: 0 })}
      />

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

