"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminEmployerApprovalPage() {
  const [pendingEmployers, setPendingEmployers] = useState<any[]>([]);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = () => {
    api.get("/admin/employers/pending").then((res) => setPendingEmployers(res.data)).catch(() => {});
  };

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/admin/employers/${id}/approve`);
      fetchPending();
    } catch (err: any) {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold font-headline text-primary mb-2">Employer Approval (รออนุมัติ)</h1>
      <p className="text-sm text-on-surface-variant mb-6">อนุมัติบัญชีสถานประกอบการใหม่ก่อนอนุญาตให้เข้าใช้งานพอร์ทัล</p>

      <div className="space-y-4">
        {pendingEmployers.length === 0 ? (
          <div className="bg-white border p-8 text-center text-xs text-on-surface-variant rounded-xl">
            ไม่มีสถานประกอบการที่รอการอนุมัติ
          </div>
        ) : (
          pendingEmployers.map((emp) => (
            <div key={emp.id} className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-primary">{emp.company_name}</h3>
                <p className="text-xs text-on-surface-variant">อีเมล: {emp.email} • อุตสาหกรรม: {emp.industry}</p>
                <p className="text-xs text-outline mt-1">ที่อยู่: {emp.address}</p>
              </div>

              <button
                onClick={() => handleApprove(emp.id)}
                className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-secondary transition-colors"
              >
                อนุมัติบัญชี
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
