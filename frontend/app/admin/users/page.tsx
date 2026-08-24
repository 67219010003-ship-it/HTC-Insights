"use client";

import { useEffect, useState, useCallback } from "react";
import { isAdmin, isSuperAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import AdminHeader from "@/components/AdminHeader";
import { api } from "@/lib/api";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  is_super_admin: boolean;
  department: string | null;
  level: string | null;
  is_verified: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [msg, setMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/admin/users?";
      if (filterRole) url += `role=${filterRole}&`;
      if (searchTerm.trim()) url += `q=${encodeURIComponent(searchTerm.trim())}`;

      const res = await api.get(url);
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load users:", err);
      setMsg({ text: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้", isError: true });
    } finally {
      setLoading(false);
    }
  }, [filterRole, searchTerm]);

  useEffect(() => {
    setMounted(true);
    if (!isAdmin()) {
      router.push("/auth/login");
      return;
    }
    fetchUsers();
  }, [router, fetchUsers]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setMsg(null);
    setActionLoading(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setMsg({ text: res.data.message || "อัปเดตบทบาทผู้ใช้สำเร็จ" });
      fetchUsers();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "เกิดข้อผิดพลาดในการเปลี่ยน Role", isError: true });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSuperAdmin = async (userId: number, currentIsSuper: boolean) => {
    setMsg(null);
    setActionLoading(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/super-admin`, {
        is_super_admin: !currentIsSuper,
      });
      setMsg({ text: res.data.message || "อัปเดตสิทธิ์ Super Admin สำเร็จ" });
      fetchUsers();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "เกิดข้อผิดพลาดในการอัปเดต Super Admin", isError: true });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBan = async (userId: number) => {
    setMsg(null);
    setActionLoading(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/ban`, {
        reason: "แอดมินดำเนินการผ่านหน้าจัดการผู้ใช้",
      });
      setMsg({ text: res.data.message || "ปรับสถานะการใช้งานบัญชีสำเร็จ" });
      fetchUsers();
    } catch (err: any) {
      setMsg({ text: err.response?.data?.detail || "เกิดข้อผิดพลาดในการปรับสถานะบัญชี", isError: true });
    } finally {
      setActionLoading(null);
    }
  };

  if (!mounted) return null;

  const totalStudents = users.filter((u) => u.role === "student").length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalExternal = users.filter((u) => u.role === "external").length;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-xl">
      {/* Top Admin Navigation Suite Header (NO SIDEBAR) */}
      <AdminHeader
        title="จัดการบัญชีผู้ใช้และสิทธิ์ (Users & Roles)"
        subtitle="ตรวจสอบ กำหนดบทบาทสิทธิ์การใช้งาน และระงับบัญชีผู้ใช้ในระบบ HTC Insight"
        onRefresh={fetchUsers}
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



        {/* Filter and Search controls */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 p-5 rounded-3xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาตามชื่อ, อีเมล, แผนกวิชา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
              className="w-full pl-9 pr-4 py-2.5 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2.5 bg-surface-container-low/50 border border-outline-variant/50 rounded-xl text-xs font-bold text-on-surface focus:outline-none focus:border-primary flex-1 md:flex-none"
            >
              <option value="">ทั้งหมดทุกสิทธิ์ (All Roles)</option>
              <option value="student">นักศึกษา (Student)</option>
              <option value="external">บุคคลภายนอก (External)</option>
              <option value="admin">ผู้ดูแลระบบ (Admin)</option>
            </select>

            <button
              onClick={fetchUsers}
              className="px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl shadow-xs hover:bg-primary-container transition-all cursor-pointer whitespace-nowrap"
            >
              ค้นหา
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="border-b border-outline-variant/30 pb-3 flex items-center justify-between">
            <h3 className="text-base font-bold font-headline-sm text-primary">
              รายชื่อผู้ใช้งานในระบบ ({users.length} รายการ)
            </h3>
            <span className="text-xs text-on-surface-variant">
              เปลี่ยน Role หรือปรับสิทธิ์ Super Admin ได้ทันที
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-on-surface-variant font-semibold space-y-2">
              <span className="material-symbols-outlined text-3xl animate-spin text-primary">
                progress_activity
              </span>
              <p>กำลังโหลดรายชื่อผู้ใช้...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-xs text-on-surface-variant font-semibold">
              ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขค้นหา
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 font-bold font-label-md text-on-surface">
                    <th className="py-3.5 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-3.5 px-4">อีเมล</th>
                    <th className="py-3.5 px-4">แผนกวิชา / ระดับ</th>
                    <th className="py-3.5 px-4">Role สิทธิ์ปัจจุบัน</th>
                    <th className="py-3.5 px-4">Super Admin</th>
                    <th className="py-3.5 px-4">สถานะบัญชี</th>
                    <th className="py-3.5 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-primary whitespace-nowrap">
                        {u.name}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface-variant font-mono text-[11px] whitespace-nowrap">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4 text-on-surface whitespace-nowrap">
                        {u.department || "-"} {u.level ? `(${u.level})` : ""}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={actionLoading === u.id}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                            u.role === "admin"
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : u.role === "student"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-surface-container text-on-surface-variant border-outline-variant/50"
                          }`}
                        >
                          <option value="student">Student</option>
                          <option value="external">External</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleSuperAdmin(u.id, u.is_super_admin)}
                          disabled={!(mounted && isSuperAdmin()) || actionLoading === u.id}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                            u.is_super_admin
                              ? "bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200"
                              : "bg-surface-container text-on-surface-variant border-outline-variant/40 hover:bg-surface-container-high"
                          } ${!(mounted && isSuperAdmin()) ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          {u.is_super_admin ? (
                            <>
                              <span className="material-symbols-outlined text-[14px]">shield_person</span>
                              Super Admin
                            </>
                          ) : (
                            "ปกติ"
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.is_verified
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {u.is_verified ? "ปกติ (Active)" : "ระงับสิทธิ์ (Banned)"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleToggleBan(u.id)}
                          disabled={u.is_super_admin || actionLoading === u.id}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                            u.is_verified
                              ? "border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100"
                          } ${u.is_super_admin ? "opacity-30 cursor-not-allowed" : ""}`}
                        >
                          {u.is_verified ? "ระงับบัญชี" : "คืนสิทธิ์ใช้งาน"}
                        </button>
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
