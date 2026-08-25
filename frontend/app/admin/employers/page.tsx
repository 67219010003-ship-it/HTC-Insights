"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import Pagination from "@/components/Pagination";
import ConfirmModal from "@/components/ConfirmModal";

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
  const [authorized, setAuthorized] = useState(false);
  const [employers, setEmployers] = useState<EmployerItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "danger" | "warning" | "info";
    confirmText?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "danger",
    confirmText: "ยืนยัน",
    onConfirm: async () => {},
  });

  const fetchEmployers = useCallback(async (filter: string) => {
    setLoading(true);
    setCurrentPage(1);
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
      window.location.replace("/");
      return;
    }
    setAuthorized(true);
    fetchEmployers(activeFilter);
  }, [activeFilter, fetchEmployers]);

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

  const totalPages = Math.ceil(filteredEmployers.length / pageSize) || 1;
  const paginatedEmployers = filteredEmployers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const confirmDelete = (emp: EmployerItem) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบสถานประกอบการ",
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลสถานประกอบการ "${emp.name}"? การดำเนินการนี้ไม่สามารถเรียกคืนได้`,
      type: "danger",
      confirmText: "ยืนยันการลบ",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await handleDelete(emp.id);
      },
    });
  };

  const pendingCount = employers.filter((e) => e.status === "pending").length;

  if (!mounted || !authorized) return null;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-xl">
      <AdminHeader
        title="จัดการบัญชีสถานประกอบการ (Employers)"
        subtitle="ตรวจสอบ อนุมัติ และควบคุมรายชื่อสถานประกอบการและพันธมิตรของวิทยาลัยเทคนิคหาดใหญ่"
        onRefresh={() => fetchEmployers(activeFilter)}
        refreshing={loading}
      />

      <div className="max-w-container-max mx-auto px-margin-mobile space-y-lg">
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
              className="p-1 hover:bg-black/5 rounded-lg transition-colors font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-3xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === "all"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              ทั้งหมด ({employers.length})
            </button>
            <button
              onClick={() => setActiveFilter("pending")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === "pending"
                  ? "bg-secondary text-on-secondary shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span>รอการตรวจสอบ</span>
              {pendingCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveFilter("approved")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === "approved"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              อนุมัติแล้ว
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, หมวดหมู่, จังหวัด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            />
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-outline-variant/30 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold font-headline-sm text-primary">
              รายชื่อสถานประกอบการ ({filteredEmployers.length} รายการ)
            </h3>
            <span className="text-xs text-on-surface-variant">
              ระบบตรวจสอบและยืนยันการรับนักศึกษาฝึกงาน
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
              ไม่พบข้อมูลสถานประกอบการในหมวดหมู่นี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 font-bold font-label-md text-on-surface">
                    <th className="py-3.5 px-4">ชื่อสถานประกอบการ</th>
                    <th className="py-3.5 px-4">หมวดหมู่งาน</th>
                    <th className="py-3.5 px-4">สถานที่ตั้ง / จังหวัด</th>
                    <th className="py-3.5 px-4">ผู้ติดต่อ & ช่องทาง</th>
                    <th className="py-3.5 px-4">สถานะ</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                  {paginatedEmployers.map((emp) => (
                    <tr key={emp.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-primary whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
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
                            onClick={() => confirmDelete(emp)}
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
          {filteredEmployers.length > pageSize && (
            <div className="pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-on-surface-variant">
                แสดง {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredEmployers.length)} จาก {filteredEmployers.length} รายการ
              </span>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
