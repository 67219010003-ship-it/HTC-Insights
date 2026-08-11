"use client";

import { useEffect, useState } from "react";
import { isAdmin, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RejectReasonModal from "@/components/RejectReasonModal";

interface PostItem {
  id: number;
  user_id: number;
  author_name: string;
  type: string;
  department: string | null;
  title: string;
  content: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

export default function AdminPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<{ id: number; title: string } | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/admin/posts?status=pending", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Failed to fetch pending posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      router.push("/auth/login");
      return;
    }
    fetchPosts();
  }, [router]);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8000/admin/posts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message });
        fetchPosts();
      } else {
        setMsg({ text: data.detail || "เกิดข้อผิดพลาดในการอนุมัติ", isError: true });
      }
    } catch (err) {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectModalItem) return;
    setRejecting(true);
    try {
      const res = await fetch(`http://localhost:8000/admin/posts/${rejectModalItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: "rejected", rejection_reason: reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message });
        setRejectModalItem(null);
        fetchPosts();
      } else {
        setMsg({ text: data.detail || "เกิดข้อผิดพลาดในการปฏิเสธ", isError: true });
      }
    } catch (err) {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin" className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm font-medium">
          <span className="material-symbols-outlined text-base">arrow_back</span> กลับ Admin Center
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">คำขออนุมัติโพสต์ Community (Pending Posts)</h1>
          <p className="text-sm text-gray-500 mt-1">ตรวจสอบโพสต์จากนักศึกษาและสมาชิกก่อนเผยแพร่ในบอร์ดชุมชน</p>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl mb-6 text-sm flex items-center justify-between ${msg.isError ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลดคำขอ...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">forum</span>
            <p className="font-semibold text-gray-700">ไม่มีโพสต์ที่รออนุมัติในขณะนี้</p>
            <p className="text-xs text-gray-400 mt-1">โพสต์ทั้งหมดได้รับการอนุมัติหรือตรวจสอบแล้ว</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {posts.map((post) => (
              <div key={post.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full uppercase">
                      {post.type}
                    </span>
                    {post.department && (
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                        {post.department}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{post.title}</h3>
                  <p className="text-xs text-gray-600 line-clamp-3 bg-gray-50 p-3 rounded-lg border border-gray-100">{post.content}</p>
                  <div className="text-xs text-gray-400">
                    ผู้โพสต์: <span className="font-medium text-gray-700">{post.author_name}</span> | โพสต์เมื่อ: {post.created_at}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setRejectModalItem({ id: post.id, title: `โพสต์: ${post.title}` })}
                    className="px-4 py-2 text-sm font-medium border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    ปฏิเสธโพสต์
                  </button>
                  <button
                    onClick={() => handleApprove(post.id)}
                    className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">check</span> อนุมัติโพสต์
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectModalItem && (
        <RejectReasonModal
          isOpen={!!rejectModalItem}
          title="ปฏิเสธโพสต์ Community"
          itemTitle={rejectModalItem.title}
          loading={rejecting}
          onClose={() => setRejectModalItem(null)}
          onConfirm={handleConfirmReject}
        />
      )}
    </div>
  );
}
