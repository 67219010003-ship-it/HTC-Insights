"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import ReportModal from "@/components/ReportModal";

export interface PostData {
  id: number;
  type: string | null;
  department: string | null;
  title: string;
  content: string;
  author_name?: string | null;
  author_department?: string | null;
  like_count: number;
  comment_count: number;
  is_pinned?: boolean;
  status?: string | null;
  created_at?: string | null;
}

interface PostCardProps {
  post: PostData;
}

export default function PostCard({ post }: PostCardProps) {
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (likeLoading) return;
    setLikeLoading(true);

    try {
      const res = await api.post(`/community/posts/${post.id}/like`);
      if (res.data?.liked) {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      } else {
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Like toggle failed:", err);
    } finally {
      setLikeLoading(false);
    }
  };

  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== "undefined" ? `${window.location.origin}/community/${post.id}` : "";
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const getTypeBadge = (type: string | null) => {
    switch (type) {
      case "experience":
        return { label: "แชร์ประสบการณ์", style: "bg-primary-container/10 text-primary border-primary/10" };
      case "qa":
        return { label: "คำถาม Q&A", style: "bg-secondary-container/30 text-secondary border-secondary/20" };
      case "tips":
        return { label: "เทคนิคการเตรียมตัว", style: "bg-amber-500/10 text-amber-700 border-amber-500/20" };
      case "team":
        return { label: "หาเพื่อนร่วมทีม", style: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" };
      default:
        return { label: "พูดคุยทั่วไป", style: "bg-surface-container text-on-surface-variant border-outline-variant/20" };
    }
  };

  const badge = getTypeBadge(post.type);

  return (
    <>
      <article className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
        <Link href={`/community/${post.id}`} className="block">
          {/* Header */}
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-secondary-container/30 border border-secondary/20 flex items-center justify-center text-secondary font-bold shadow-inner">
                <span className="material-symbols-outlined text-[22px]">
                  person
                </span>
              </div>
              <div>
                <h4 className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-2 flex-wrap">
                  <span>{post.author_name || "นักศึกษา HTC"}</span>
                  {post.department && (
                    <span className="px-2.5 py-0.5 bg-secondary-container text-on-secondary-container border border-secondary/20 rounded-full text-xs font-bold">
                      {post.department}
                    </span>
                  )}
                </h4>
                <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                  {post.created_at || "เมื่อเร็วๆ นี้"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {post.status === "pending" && (
                <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  รออนุมัติ
                </span>
              )}
              <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-semibold border ${badge.style}`}>
                {badge.label}
              </span>
            </div>
          </div>

          {/* Post Title & Excerpt */}
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 group-hover:text-secondary transition-colors font-semibold">
            {post.title}
          </h3>
          <p className="text-on-surface-variant font-body-md text-body-md line-clamp-3 mb-5 leading-relaxed">
            {post.content}
          </p>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={handleLikeToggle}
                disabled={likeLoading}
                className={`flex items-center gap-1.5 px-2.5 py-1 -ml-1 rounded-lg transition-all ${
                  isLiked
                    ? "text-secondary bg-secondary/10 font-bold"
                    : "text-on-surface-variant hover:text-secondary hover:bg-secondary/5 font-medium"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
                >
                  thumb_up
                </span>
                <span className="font-label-md text-label-md">{likeCount}</span>
              </button>

              <div className="flex items-center gap-1.5 text-on-surface-variant hover:text-secondary px-2 py-1 rounded-lg transition-all">
                <span className="material-symbols-outlined text-[20px]">forum</span>
                <span className="font-label-md text-label-md font-medium">{post.comment_count}</span>
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-secondary hover:bg-secondary/5 font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="แชร์กระทู้นี้"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copiedShare ? "check" : "share"}
                </span>
                <span>{copiedShare ? "คัดลอกลิงก์แล้ว!" : "แชร์"}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setReportModalOpen(true);
                }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-600 hover:bg-amber-50 font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="รายงานโพสต์นี้"
              >
                <span className="material-symbols-outlined text-[18px]">flag</span>
                <span>รายงานโพสต์</span>
              </button>
            </div>

            <span className="text-secondary font-label-sm text-label-sm font-semibold group-hover:underline flex items-center gap-0.5">
              อ่านกระทู้เต็ม
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </span>
          </div>
        </Link>
      </article>

      <ReportModal
        isOpen={reportModalOpen}
        title="รายงานโพสต์"
        targetType="post"
        targetId={post.id}
        onClose={() => setReportModalOpen(false)}
      />
    </>
  );
}
