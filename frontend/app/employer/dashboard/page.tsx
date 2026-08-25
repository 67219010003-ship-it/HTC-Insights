"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { isEmployer } from "@/lib/auth";
import { useRouter } from "next/navigation";

import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";

export default function EmployerDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [postings, setPostings] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("ช่างอิเล็กทรอนิกส์");
  const [description, setDescription] = useState("");
  const [dailyAllowance, setDailyAllowance] = useState("400");
  const [location, setLocation] = useState("หาดใหญ่, สงขลา");
  const [deadline, setDeadline] = useState("2026-12-31");
  const [showModal, setShowModal] = useState(false);
  const [closeTargetId, setCloseTargetId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ isOpen: boolean; message: string; type: "success" | "error" | "info" }>({
    isOpen: false,
    message: "",
    type: "info",
  });

  useEffect(() => {
    if (!isEmployer()) {
      window.location.replace("/");
      return;
    }
    setAuthorized(true);
    fetchPostings();
  }, []);

  const fetchPostings = () => {
    api.get("/employer/postings").then((res) => setPostings(res.data)).catch(() => {});
  };

  const handleCreatePosting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 5 || title.trim().length > 120) {
      setToast({
        isOpen: true,
        message: "ตำแหน่งงานต้องมีความยาวระหว่าง 5 - 120 ตัวอักษร",
        type: "error",
      });
      return;
    }
    if (description.trim().length < 20 || description.trim().length > 2000) {
      setToast({
        isOpen: true,
        message: "รายละเอียดงานต้องมีความยาวระหว่าง 20 - 2,000 ตัวอักษร",
        type: "error",
      });
      return;
    }
    const allowanceNum = parseInt(dailyAllowance) || 0;
    if (allowanceNum < 0 || allowanceNum > 5000) {
      setToast({
        isOpen: true,
        message: "เบี้ยเลี้ยงรายวันต้องอยู่ระหว่าง 0 - 5,000 บาท/วัน",
        type: "error",
      });
      return;
    }
    try {
      await api.post("/employer/postings", {
        title: title.trim(),
        department,
        description: description.trim(),
        daily_allowance: allowanceNum,
        location: location || "หาดใหญ่, สงขลา",
        deadline: deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      setShowModal(false);
      setTitle("");
      setDescription("");
      setDailyAllowance("");
      setToast({
        isOpen: true,
        message: "สร้างประกาศรับสมัครสำเร็จ! กำลังรอ Admin ตรวจสอบและอนุมัติ",
        type: "success",
      });
      fetchPostings();
    } catch (err: any) {
      setToast({
        isOpen: true,
        message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการสร้างประกาศ",
        type: "error",
      });
    }
  };

  const handleConfirmClosePosting = async () => {
    if (!closeTargetId) return;
    try {
      await api.delete(`/employer/postings/${closeTargetId}`);
      setToast({ isOpen: true, message: "ปิดประกาศเรียบร้อยแล้ว", type: "success" });
      setCloseTargetId(null);
      fetchPostings();
    } catch (err: any) {
      setToast({ isOpen: true, message: "เกิดข้อผิดพลาดในการปิดประกาศ", type: "error" });
    }
  };

  if (!authorized) return null;

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-primary font-headline">รายการประกาศของคุณ ({postings.length})</h2>
        {postings.length > pageSize && (
          <span className="text-xs text-on-surface-variant font-medium">
            หน้า {currentPage} จาก {Math.ceil(postings.length / pageSize)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {postings
          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
          .map((p) => (
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
                  onClick={() => setCloseTargetId(p.id)}
                  className="mt-4 text-xs font-bold text-error border border-error/20 py-1.5 rounded-lg hover:bg-error/10 transition-colors"
                >
                  ปิดประกาศ
                </button>
              )}
            </div>
          ))}
      </div>

      {/* Postings Pagination */}
      {postings.length > pageSize && (
        <div className="pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(postings.length / pageSize) || 1}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-primary font-headline mb-4">สร้างประกาศงานใหม่</h3>
            <form onSubmit={handleCreatePosting} className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-primary">ตำแหน่งงาน* (5 - 120 ตัวอักษร)</label>
                  <span className="text-[10px] text-on-surface-variant">{title.length}/120</span>
                </div>
                <input
                  type="text"
                  required
                  minLength={5}
                  maxLength={120}
                  placeholder="เช่น ช่างซ่อมบำรุงฝึกหัด (PLC/ไฟฟ้า)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded text-xs"
                />
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-primary">เบี้ยเลี้ยง (บาท/วัน)</label>
                  <span className="text-[10px] text-on-surface-variant">0 - 5,000 บาท</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  placeholder="เช่น 350 (ระบุ 0 ถ้าไม่มีเบี้ยเลี้ยง)"
                  value={dailyAllowance}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || (Number(val) >= 0 && Number(val) <= 5000)) {
                      setDailyAllowance(val);
                    }
                  }}
                  className="w-full p-2 border rounded text-xs"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-primary">รายละเอียดงาน (20 - 2,000 ตัวอักษร)</label>
                  <span className="text-[10px] text-on-surface-variant">{description.length}/2000</span>
                </div>
                <textarea
                  rows={4}
                  minLength={20}
                  maxLength={2000}
                  placeholder="ระบุหน้าที่ความรับผิดชอบ คุณสมบัติ และสวัสดิการ..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded text-xs font-bold cursor-pointer">ยกเลิก</button>
                <button type="submit" className="px-5 py-2 bg-primary text-white rounded text-xs font-bold hover:bg-secondary cursor-pointer">บันทึกประกาศ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Close Posting Modal */}
      <ConfirmModal
        isOpen={!!closeTargetId}
        title="ยืนยันการปิดประกาศ"
        message="คุณต้องการปิดประกาศรับสมัครนี้ใช่หรือไม่? เมื่อปิดแล้วจะไม่แสดงให้นักศึกษาค้นหา"
        type="warning"
        confirmText="ยืนยันการปิด"
        cancelText="ยกเลิก"
        onClose={() => setCloseTargetId(null)}
        onConfirm={handleConfirmClosePosting}
      />

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
