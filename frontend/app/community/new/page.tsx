"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken, isEmployer, isStudent } from "@/lib/auth";
import DepartmentDropdown from "@/components/DepartmentDropdown";
import Toast from "@/components/Toast";

export default function NewPostPage() {
  const router = useRouter();
  const [type, setType] = useState("experience");
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(() => {
    if (typeof window !== "undefined") {
      return Boolean(getToken() && isStudent());
    }
    return false;
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "info",
  });

  useEffect(() => {
    // Redirect external/employer away from student community posting
    if (!getToken()) {
      router.push("/auth/login");
      return;
    }
    if (!isStudent()) {
      router.push("/");
      return;
    }
    setAuthorized(true);
  }, [router]);

  const handleSubmit = async () => {
    const token = getToken();
    if (!token) {
      setToast({
        isOpen: true,
        message: "กรุณาเข้าสู่ระบบด้วยบัญชีนักศึกษาก่อนตั้งกระทู้",
        type: "error",
      });
      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
      return;
    }

    if (title.trim().length < 5 || title.trim().length > 60) {
      setToast({
        isOpen: true,
        message: "หัวข้อกระทู้ต้องมีความยาวระหว่าง 5 - 60 ตัวอักษร",
        type: "error",
      });
      return;
    }
    if (content.trim().length < 10 || content.trim().length > 600) {
      setToast({
        isOpen: true,
        message: "เนื้อหากระทู้ต้องมีความยาวระหว่าง 10 - 600 ตัวอักษร",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/community/posts", {
        type,
        department: department || undefined,
        title: title.trim(),
        content: content.trim(),
      });

      setToast({
        isOpen: true,
        message: "สร้างกระทู้สำเร็จ! โพสต์ของคุณอยู่ระหว่างรอผู้ดูแลระบบ (Admin) ตรวจสอบและอนุมัติ",
        type: "success",
      });

      setTimeout(() => {
        router.push("/community");
      }, 2000);
    } catch (err: any) {
      console.error("Create post error:", err);
      const detail = err.response?.data?.detail;
      let errorMsg = "เกิดข้อผิดพลาดในการโพสต์ กรุณาลองใหม่อีกครั้ง";

      if (detail === "Could not validate credentials" || err.response?.status === 401) {
        errorMsg = "เซสชันของคุณหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
        setTimeout(() => router.push("/auth/login"), 1800);
      } else if (detail === "Student access required" || err.response?.status === 403) {
        errorMsg = "เฉพาะบัญชีนักศึกษาวิทยาลัยเทคนิคหาดใหญ่เท่านั้นที่สามารถโพสต์ได้";
      } else if (typeof detail === "string") {
        errorMsg = detail;
      }

      setToast({
        isOpen: true,
        message: errorMsg,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!authorized) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-24 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-on-surface-variant">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-24 md:pb-12 min-h-screen">
      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-primary font-headline">
              ตั้งกระทู้ใหม่ใน Community
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              แชร์ประสบการณ์ ถามคำถาม หรือค้นหาเพื่อนร่วมฝึกงานในวิทยาลัย
            </p>
          </div>
        </div>

        {/* Approval Notice & Quota Banner */}
        <div className="bg-sky-50 border border-sky-200 text-sky-950 rounded-xl p-3.5 text-xs leading-relaxed flex items-start gap-2.5 shadow-xs">
          <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
            info
          </span>
          <div className="space-y-0.5">
            <p className="font-bold text-primary">การตรวจสอบและโควตาการตั้งกระทู้</p>
            <p className="text-on-surface-variant text-[11px]">
              • จำกัดการสร้างกระทู้สูงสุด <strong>6 กระทู้ต่อ 1 บัญชีผู้ใช้</strong> (สามารถลบหรือจัดการกระทู้เดิมได้ในหน้าโปรไฟล์)<br />
              • กระทู้ใหม่จะส่งไปยังระบบตรวจสอบของเจ้าหน้าที่ Admin ก่อน และจะเผยแพร่อัตโนมัติเมื่อได้รับการอนุมัติ
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Post Type Selector */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
              ประเภทกระทู้*
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "experience", label: "แชร์ประสบการณ์", icon: "badge" },
                { id: "qa", label: "ถาม-ตอบ Q&A", icon: "help" },
                { id: "tips", label: "เทคนิคเตรียมตัว", icon: "lightbulb" },
                { id: "team", label: "หาเพื่อนร่วมทีม", icon: "group" },
              ].map((item) => {
                const isSelected = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-primary text-on-primary border-primary shadow-sm"
                        : "bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Department Selection (Using System-wide DepartmentDropdown) */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">
              แผนกวิชาช่าง (เลือกแผนกวิชาที่เกี่ยวข้อง)
            </label>
            <DepartmentDropdown
              className="relative w-full"
              value={department}
              onChange={(val) => setDepartment(val)}
            />
          </div>

          {/* Title */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-primary uppercase tracking-wider">
                หัวข้อกระทู้* (5 - 60 ตัวอักษร)
              </label>
              <span className={`text-[11px] font-bold ${title.trim().length >= 5 && title.length <= 60 ? 'text-emerald-600' : 'text-on-surface-variant'}`}>
                {title.length}/60
              </span>
            </div>
            <input
              type="text"
              minLength={5}
              maxLength={60}
              placeholder="เช่น ขอสอบถามพี่ๆ ช่างอิเล็กทรอนิกส์ เรื่องสอบสัมภาษณ์..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-body-sm focus:outline-none focus:border-primary focus:bg-surface-container-lowest transition-all"
            />
          </div>

          {/* Content */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-primary uppercase tracking-wider">
                เนื้อหากระทู้* (10 - 600 ตัวอักษร)
              </label>
              <span className={`text-[11px] font-bold ${content.trim().length >= 10 && content.length <= 600 ? 'text-emerald-600' : 'text-on-surface-variant'}`}>
                {content.length}/600
              </span>
            </div>
            <textarea
              rows={6}
              minLength={10}
              maxLength={600}
              placeholder="เขียนรายละเอียด สิ่งที่ต้องการสอบถาม หรือประสบการณ์ที่อยากแชร์ให้เพื่อนๆ ฟัง..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-body-sm focus:outline-none focus:border-primary focus:bg-surface-container-lowest transition-all leading-relaxed"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-bold hover:bg-primary/90 shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  เผยแพร่กระทู้
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
