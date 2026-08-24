"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";

interface EmployerItem {
  id: number;
  name: string;
  category: string | null;
  province: string | null;
  address: string | null;
  status: string;
  is_verified: boolean;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

export default function AdminEmployerApprovalPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [employers, setEmployers] = useState<EmployerItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchEmployers = useCallback(async (filter: string) => {
    setLoading(true);
    try {
      localStorage.removeItem("htc_registered_employers");
      localStorage.removeItem("htc_registered_jobs");
    } catch {}

    try {
      const res = await api.get(`/admin/employers?status=${filter === "all" ? "" : filter}`);
      setEmployers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch employers:", err);
      setEmployers([]);
      setMsg({ text: "ไม่สามารถโหลดข้อมูลสถานประกอบการได้", isError: true });
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
    fetchEmployers(activeFilter);
  }, [activeFilter, router, fetchEmployers]);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const res = await api.patch(`/admin/employers/${id}/approve`);
      setMsg({ text: res.data.message || "อนุมัติบัญชีสถานประกอบการสำเร็จ" });
      fetchEmployers(activeFilter);
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "เกิดข้อผิดพลาดในการอนุมัติ", isError: true });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีสถานประกอบการนี้ออกจากระบบอย่างถาวร?")) return;
    setActionLoading(id);
    try {
      const res = await api.delete(`/admin/employers/${id}`);
      setMsg({ text: res.data.message || "ลบสถานประกอบการสำเร็จ" });
      fetchEmployers(activeFilter);
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "เกิดข้อผิดพลาดในการลบ", isError: true });
    } finally {
      setActionLoading(null);
    }
  };

  if (!mounted) return null;

  const filteredEmployers = employers.filter((emp) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.category?.toLowerCase().includes(q) ||
      emp.province?.toLowerCase().includes(q) ||
      emp.contact_email?.toLowerCase().includes(q) ||
      emp.contact_person?.toLowerCase().includes(q)
    );
  });

  const pendingCount = employers.filter((e) => e.status === "pending").length;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-xl">
      {/* Top Admin Navigation Suite Header (NO SIDEBAR) */}
      <AdminHeader
        title="จัดการบัญชีสถานประกอบการ (Employers)"
        subtitle="ตรวจสอบ อนุมัติ และควบคุมรายชื่อสถานประกอบการและพันธมิตรของวิทยาลัยเทคนิคหาดใหญ่"
        onRefresh={() => fetchEmployers(activeFilter)}
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

        {/* Filter and Search Bar */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-3xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2.5 rounded-xl font-label-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === "all"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low/60 text-on-surface-variant hover:bg-surface-container border border-outline-variant/40"
              }`}
            >
              ทั้งหมด ({employers.length})
            </button>
            <button
              onClick={() => setActiveFilter("pending")}
              className={`px-4 py-2.5 rounded-xl font-label-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === "pending"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low/60 text-on-surface-variant hover:bg-surface-container border border-outline-variant/40"
              }`}
            >
              <span>รอการอนุมัติ</span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveFilter("approved")}
              className={`px-4 py-2.5 rounded-xl font-label-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === "approved"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low/60 text-on-surface-variant hover:bg-surface-container border border-outline-variant/40"
              }`}
            >
              อนุมัติแล้ว ({employers.filter((e) => e.status === "approved").length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อสถานประกอบการ, จังหวัด, ผู้ติดต่อ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            />
          </div>
        </div>

        {/* Employers Table & Card List */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-outline-variant/30 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold font-headline-sm text-primary">
              รายชื่อสถานประกอบการ ({filteredEmployers.length} รายการ)
            </h3>
            <span className="text-xs text-on-surface-variant">
              ระบบตรวจสอบสถานะความพร้อมของสถานประกอบการ
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-on-surface-variant font-semibold space-y-2">
              <span className="material-symbols-outlined text-3xl animate-spin text-primary">
                progress_activity
              </span>
              <p>กำลังโหลดรายชื่อสถานประกอบการ...</p>
            </div>
          ) : filteredEmployers.length === 0 ? (
            <div className="py-16 text-center text-xs text-on-surface-variant font-semibold">
              ไม่พบสถานประกอบการที่ตรงกับเงื่อนไข
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 font-bold font-label-md text-on-surface">
                    <th className="py-3.5 px-4">ชื่อสถานประกอบการ</th>
                    <th className="py-3.5 px-4">ประเภทธุรกิจ</th>
                    <th className="py-3.5 px-4">ที่ตั้ง / จังหวัด</th>
                    <th className="py-3.5 px-4">ผู้ประสานงาน</th>
                    <th className="py-3.5 px-4">สถานะ</th>
                    <th className="py-3.5 px-4 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                  {filteredEmployers.map((emp) => (
                    <tr key={emp.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-primary whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-secondary">
                            domain
                          </span>
                          <span>{emp.name}</span>
                          {emp.is_verified && (
                            <span className="material-symbols-outlined text-[14px] text-secondary fill-current" title="ยืนยันแล้ว">
                              verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-on-surface whitespace-nowrap">
                        {emp.category || "ทั่วไป"}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant whitespace-nowrap">
                        {emp.province || emp.address || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant whitespace-nowrap">
                        <div>{emp.contact_person || "-"}</div>
                        {emp.contact_email && (
                          <div className="text-[10px] font-mono text-on-surface-variant/70">
                            {emp.contact_email} {emp.contact_phone ? `(${emp.contact_phone})` : ""}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            emp.status === "approved"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : emp.status === "rejected"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {emp.status === "approved"
                            ? "อนุมัติแล้ว"
                            : emp.status === "rejected"
                            ? "ปฏิเสธ"
                            : "รอตรวจสอบ"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {emp.status === "pending" && (
                            <button
                              onClick={() => handleApprove(emp.id)}
                              disabled={actionLoading === emp.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] shadow-xs transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              อนุมัติ
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(emp.id)}
                            disabled={actionLoading === emp.id}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl text-[11px] transition-all cursor-pointer disabled:opacity-50"
                          >
                            {actionLoading === emp.id ? "กำลังลบ..." : "ลบข้อมูล"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
