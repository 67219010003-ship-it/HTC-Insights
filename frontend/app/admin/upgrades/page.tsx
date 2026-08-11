"use client";

import { useEffect, useState } from "react";
import { isAdmin, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RejectReasonModal from "@/components/RejectReasonModal";

interface UpgradeItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  student_id: string;
  department: string;
  phone: string;
  reason: string;
  status: string;
  card_image_url?: string;
  created_at: string;
}

export default function AdminUpgradesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<UpgradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<{ id: number; title: string } | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/admin/upgrade-requests?status=pending", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch upgrade requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      router.push("/auth/login");
      return;
    }
    fetchRequests();
  }, [router]);

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8000/admin/upgrade-requests/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message });
        fetchRequests();
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
      const res = await fetch(`http://localhost:8000/admin/upgrade-requests/${rejectModalItem.id}`, {
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
        fetchRequests();
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
          <h1 className="text-2xl font-bold text-gray-900">ตรวจสอบคำขอยืนยันสิทธิ์นักศึกษา (Student Verification)</h1>
          <p className="text-sm text-gray-500 mt-1">อนุมัติหรือปฏิเสธคำขอย้ายสิทธิ์จากผู้ใช้ภายนอก/ศิษย์เก่า ให้กลายเป็นนักศึกษา</p>
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
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">task_alt</span>
            <p className="font-semibold text-gray-700">ไม่มีคำขอที่รอดำเนินการ</p>
            <p className="text-xs text-gray-400 mt-1">คำขอยืนยันสิทธิ์นักศึกษาทั้งหมดได้รับการอนุมัติเรียบร้อยแล้ว</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {requests.map((req) => (
              <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-lg">{req.user_name}</span>
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-mono rounded-full font-bold">
                      รหัส: {req.student_id}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 font-mono">อีเมล: {req.user_email} | โทร: {req.phone || "-"}</div>
                  <div className="text-sm text-gray-700 font-medium pt-1">แผนกวิชา: {req.department || "ไม่ระบุ"}</div>
                  {req.reason && <div className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2">เหตุผลยื่นคำร้อง: "{req.reason}"</div>}
                  {req.card_image_url && (
                    <div className="mt-3">
                      <span className="text-xs text-gray-500 font-bold block mb-1">ภาพหลักฐานบัตรประจำตัวนักเรียน/นักศึกษา:</span>
                      <a href={req.card_image_url} target="_blank" rel="noopener noreferrer" className="inline-block relative rounded-xl overflow-hidden border border-gray-200 shadow-sm max-w-xs hover:scale-105 transition-transform duration-200 cursor-zoom-in">
                        <img src={req.card_image_url} alt="Student ID Card" className="max-h-36 w-auto object-cover rounded-xl" />
                      </a>
                    </div>
                  )}
                  <div className="text-xs text-gray-400 pt-1">ยื่นเมื่อ: {req.created_at}</div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRejectModalItem({ id: req.id, title: `คำขอของ ${req.user_name} (รหัส ${req.student_id})` })}
                    className="px-4 py-2 text-sm font-medium border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                  >
                    ปฏิเสธคำขอ
                  </button>
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">check</span> อนุมัติสิทธิ์นักศึกษา
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
          title="ปฏิเสธคำขอยืนยันสิทธิ์นักศึกษา"
          itemTitle={rejectModalItem.title}
          loading={rejecting}
          onClose={() => setRejectModalItem(null)}
          onConfirm={handleConfirmReject}
        />
      )}
    </div>
  );
}
