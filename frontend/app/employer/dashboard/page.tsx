"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { isEmployer } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function EmployerDashboardPage() {
  const router = useRouter();
  const [postings, setPostings] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("ช่างอิเล็กทรอนิกส์");
  const [description, setDescription] = useState("");
  const [dailyAllowance, setDailyAllowance] = useState("400");
  const [location, setLocation] = useState("หาดใหญ่, สงขลา");
  const [deadline, setDeadline] = useState("2026-12-31");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isEmployer()) {
      router.push("/auth/login");
      return;
    }
    fetchPostings();
  }, []);

  const fetchPostings = () => {
    api.get("/employer/postings").then((res) => setPostings(res.data)).catch(() => {});
  };

  const handleCreatePosting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/employer/postings", {
        title,
        department,
        description,
        daily_allowance: parseInt(dailyAllowance) || 0,
        location,
        deadline,
      });
      setShowModal(false);
      setTitle("");
      setDescription("");
      fetchPostings();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการสร้างประกาศ");
    }
  };

  const handleClosePosting = async (id: number) => {
    if (!confirm("คุณต้องการปิดประกาศนี้ใช่หรือไม่?")) return;
    try {
      await api.delete(`/employer/postings/${id}`);
      fetchPostings();
    } catch (err: any) {}
  };

  return (
    <div className="max-w-container-max mx-auto px-4 md:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline text-primary">Employer Portal</h1>
          <p className="text-sm text-on-surface-variant">จัดการรายการประกาศงานและดูสถิตินักศึกษาที่สนใจ</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-secondary transition-colors shadow-md flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          สร้างประกาศรับสมัครใหม่
        </button>
      </div>

      {/* Postings Grid */}
      <h2 className="text-lg font-bold text-primary font-headline mb-4">รายการประกาศของคุณ ({postings.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {postings.map((p) => (
          <div key={p.id} className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${p.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                  {p.is_active ? "เปิดรับสมัคร" : "ปิดประกาศแล้ว"}
                </span>
                <span className="text-xs text-secondary font-bold">฿{p.daily_allowance}/วัน</span>
              </div>
              <h3 className="font-bold text-base text-primary mb-1">{p.title}</h3>
              <p className="text-xs text-on-surface-variant mb-3">{p.department}</p>
              <p className="text-xs text-on-surface-variant line-clamp-2">{p.description}</p>
            </div>
            {p.is_active && (
              <button
                onClick={() => handleClosePosting(p.id)}
                className="mt-4 text-xs font-bold text-error border border-error/20 py-1.5 rounded-lg hover:bg-error/10"
              >
                ปิดประกาศ
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-primary font-headline mb-4">สร้างประกาศงานใหม่</h3>
            <form onSubmit={handleCreatePosting} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-primary mb-1">ตำแหน่งงาน*</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1">แผนกวิชาที่ต้องการ</label>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-2 border rounded text-xs">
                  <option value="ช่างอิเล็กทรอนิกส์">ช่างอิเล็กทรอนิกส์</option>
                  <option value="ช่างยนต์/เครื่องกล">ช่างยนต์/เครื่องกล</option>
                  <option value="เทคนิคคอมพิวเตอร์">เทคนิคคอมพิวเตอร์</option>
                  <option value="ช่างไฟฟ้ากำลัง">ช่างไฟฟ้ากำลัง</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1">เบี้ยเลี้ยง (บาท/วัน)</label>
                <input type="number" value={dailyAllowance} onChange={(e) => setDailyAllowance(e.target.value)} className="w-full p-2 border rounded text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-primary mb-1">รายละเอียดงาน</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border rounded text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded text-xs font-bold">ยกเลิก</button>
                <button type="submit" className="px-5 py-2 bg-primary text-white rounded text-xs font-bold hover:bg-secondary">บันทึกประกาศ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
