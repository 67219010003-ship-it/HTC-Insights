"use client";

import { useEffect, useState } from "react";
import { isAdmin, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ReportItem {
  id: number;
  reporter_name: string;
  reason: string;
  status: string;
  post_id: number | null;
  review_id: number | null;
  comment_id: number | null;
  job_id: number | null;
  company_id: number | null;
  post_title?: string;
  post_content?: string;
  created_at: string;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/admin/reports?status=pending", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      router.push("/auth/login");
      return;
    }
    fetchReports();
  }, [router]);

  const handleUpdateReport = async (id: number, status: string, action?: string) => {
    try {
      const res = await fetch(`http://localhost:8000/admin/reports/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message || "อัปเดตสถานะรายงานสำเร็จ" });
        fetchReports();
      } else {
        setMsg({ text: data.detail || "เกิดข้อผิดพลาดในการอัปเดต", isError: true });
      }
    } catch (err) {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
    }
  };

  const getTargetTypeLabel = (r: ReportItem) => {
    if (r.post_id) return "โพสต์ Community";
    if (r.review_id) return "รีวิวสถานที่ฝึกงาน";
    if (r.comment_id) return "ความคิดเห็น";
    if (r.job_id) return "ประกาศงาน";
    if (r.company_id) return "สถานประกอบการ";
    return "เนื้อหาทั่วไป";
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
          <h1 className="text-2xl font-bold text-gray-900">การรายงานเนื้อหาไม่เหมาะสม (Pending Reports)</h1>
          <p className="text-sm text-gray-500 mt-1">ตรวจสอบและจัดการข้อร้องเรียน/รายงานเนื้อหาที่ไม่เหมาะสมจากผู้ใช้งาน</p>
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
          <div className="p-8 text-center text-gray-500">กำลังโหลดรายการรายงาน...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">flag</span>
            <p className="font-semibold text-gray-700">ไม่มีรายงานที่รอดำเนินการ</p>
            <p className="text-xs text-gray-400 mt-1">รายงานทั้งหมดได้รับการตรวจสอบและจัดการเรียบร้อยแล้ว</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reports.map((rep) => (
              <div key={rep.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-xs font-semibold rounded-full">
                      {getTargetTypeLabel(rep)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium">
                      ผู้รายงาน: {rep.reporter_name}
                    </span>
                  </div>
                  {rep.post_title && (
                    <h3 className="font-bold text-gray-900 text-base">{rep.post_title}</h3>
                  )}
                  {rep.post_content && (
                    <p className="text-xs text-gray-600 line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">{rep.post_content}</p>
                  )}
                  <div className="text-xs text-rose-700 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                    <span className="font-bold">เหตุผลที่รายงาน:</span> "{rep.reason}"
                  </div>
                  <div className="text-xs text-gray-400">รายงานเมื่อ: {rep.created_at}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleUpdateReport(rep.id, "dismissed")}
                    className="px-3.5 py-2 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    ยกเลิกรายงาน
                  </button>
                  {rep.post_id && (
                    <button
                      onClick={() => handleUpdateReport(rep.id, "resolved", "delete_post")}
                      className="px-3.5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-colors"
                    >
                      ลบเนื้อหาและยอมรับ
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateReport(rep.id, "resolved")}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors"
                  >
                    ยอมรับ/จัดการแล้ว
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
