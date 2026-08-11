"use client";

import { useEffect, useState } from "react";
import { isAdmin, getToken, isSuperAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = "http://localhost:8000/admin/users?";
      if (filterRole) url += `role=${filterRole}&`;
      if (searchTerm) url += `q=${encodeURIComponent(searchTerm)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (!isAdmin()) {
      router.push("/auth/login");
      return;
    }
    fetchUsers();
  }, [router, filterRole]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message });
        fetchUsers();
      } else {
        setMsg({ text: data.detail || "เกิดข้อผิดพลาดในการเปลี่ยน Role", isError: true });
      }
    } catch (err) {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
    }
  };

  const handleToggleSuperAdmin = async (userId: number, currentIsSuper: boolean) => {
    setMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/admin/users/${userId}/super-admin`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ is_super_admin: !currentIsSuper }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message });
        fetchUsers();
      } else {
        setMsg({ text: data.detail || "เกิดข้อผิดพลาดในการอัปเดต Super Admin", isError: true });
      }
    } catch (err) {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
    }
  };

  const handleToggleBan = async (userId: number) => {
    setMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/admin/users/${userId}/ban`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ reason: "แอดมินดำเนินการผ่านหน้าจัดการผู้ใช้" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ text: data.message });
        fetchUsers();
      } else {
        setMsg({ text: data.detail || "เกิดข้อผิดพลาดในการปรับสถานะบัญชี", isError: true });
      }
    } catch (err) {
      setMsg({ text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", isError: true });
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
          <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้และสิทธิ์การใช้งาน (Users & Roles)</h1>
          <p className="text-sm text-gray-500 mt-1">กำหนด Role และระงับบัญชีผู้ใช้ในระบบ</p>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl mb-6 text-sm flex items-center justify-between ${msg.isError ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="ค้นหาตามชื่อ หรือ อีเมล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ทั้งหมดทุก Role</option>
            <option value="student">นักศึกษา (Student)</option>
            <option value="external">บุคคลภายนอก (External)</option>
            <option value="admin">ผู้ดูแลระบบ (Admin)</option>
          </select>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            ค้นหา
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold">
              <th className="py-3.5 px-4">ชื่อ - นามสกุล</th>
              <th className="py-3.5 px-4">อีเมล</th>
              <th className="py-3.5 px-4">แผนกวิชา</th>
              <th className="py-3.5 px-4">Role สิทธิ์ปัจจุบัน</th>
              <th className="py-3.5 px-4">Super Admin</th>
              <th className="py-3.5 px-4">สถานะบัญชี</th>
              <th className="py-3.5 px-4 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">กำลังโหลดข้อมูล...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">ไม่พบผู้ใช้งาน</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{u.name}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono text-xs">{u.email}</td>
                  <td className="py-3 px-4 text-gray-600">{u.department || "-"}</td>
                  <td className="py-3 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                        u.role === "admin"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : u.role === "student"
                          ? "bg-blue-50 text-blue-800 border-blue-300"
                          : "bg-gray-100 text-gray-700 border-gray-300"
                      }`}
                    >
                      <option value="student">Student</option>
                      <option value="external">External</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleSuperAdmin(u.id, u.is_super_admin)}
                      disabled={!(mounted && isSuperAdmin())}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 ${
                        u.is_super_admin
                          ? "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      } ${!(mounted && isSuperAdmin()) ? "opacity-50 cursor-not-allowed" : ""}`}
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
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_verified ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      {u.is_verified ? "ปกติ (Active)" : "ระงับสิทธิ์ (Banned)"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleBan(u.id)}
                      disabled={u.is_super_admin}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        u.is_verified
                          ? "border-rose-300 text-rose-700 hover:bg-rose-50"
                          : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      } ${u.is_super_admin && "opacity-40 cursor-not-allowed"}`}
                    >
                      {u.is_verified ? "ระงับบัญชี" : "คืนสิทธิ์ใช้งาน"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
