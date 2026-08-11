"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import DepartmentDropdown from "@/components/DepartmentDropdown";

export default function RegisterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"student" | "employer">("student");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Student Form
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentDepartment, setStudentDepartment] = useState("ช่างอิเล็กทรอนิกส์");
  const [studentLevel, setStudentLevel] = useState("pvs");

  // Employer Form
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState("เทคโนโลยีสารสนเทศ");

  const isNonHtcEmail = studentEmail.length > 5 && !studentEmail.endsWith("@htc.ac.th");

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.endsWith("@htc.ac.th")) {
      setError(
        "หมายเหตุ: สำหรับการอนุมัติสิทธิ์นักศึกษาอัตโนมัติ กรุณาใช้อีเมลวิทยาลัย @htc.ac.th หากใช้อีเมลอื่น สามารถยื่นเรื่องยืนยันตัวตนย้อนหลังได้ในระบบ"
      );
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await api.post("/auth/register/student", {
        email: studentEmail,
        password: studentPassword,
        name: studentName,
        department: studentDepartment,
        level: studentLevel,
      });
      // Auto verify in demo/dev mode for immediate testing
      if (res.data.verify_token) {
        await api.get(`/auth/verify-email?token=${res.data.verify_token}`);
      }
      setSuccess("สมัครสมาชิกสำเร็จ! สามารถเข้าสู่ระบบได้ทันที");
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "เกิดข้อผิดพลาดในการสมัคร");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await api.post("/auth/register/employer", {
        email: empEmail,
        password: empPassword,
        company_name: companyName,
        address,
        industry,
      });
      setSuccess("ส่งข้อมูลลงทะเบียนเรียบร้อยแล้ว รอ Admin อนุมัติ (1-3 วันทำการ)");
    } catch (err: any) {
      setError(err.response?.data?.detail || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="bg-white border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary font-headline">
            สมัครสมาชิก HTC Insights
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            สร้างบัญชีผู้ใช้ใหม่เพื่อเริ่มต้นใช้งาน
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-surface-container-low p-1.5 rounded-xl mb-6 border border-outline-variant/30">
          <button
            type="button"
            onClick={() => {
              setTab("student");
              setError("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "student"
                ? "bg-primary text-white shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">school</span>
            นักศึกษา (@htc.ac.th)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("employer");
              setError("");
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === "employer"
                ? "bg-secondary text-on-secondary shadow-sm"
                : "text-on-surface-variant hover:text-secondary"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">domain</span>
            สถานประกอบการ
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-error-container text-on-error-container rounded-xl text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 mb-4 bg-secondary/10 text-secondary rounded-xl text-xs font-semibold leading-relaxed">
            {success}
          </div>
        )}

        {tab === "student" ? (
          <form onSubmit={handleStudentRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                อีเมลวิทยาลัย (@htc.ac.th)*
              </label>
              <input
                type="email"
                required
                placeholder="66301234@htc.ac.th"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                className="w-full p-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm"
              />
            </div>

            {/* Smart Detection Callout for Non-HTC Email */}
            {isNonHtcEmail && (
              <div className="p-3.5 bg-secondary-container/20 border border-secondary/30 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                    info
                  </span>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    คุณพิมพ์อีเมลภายนอกวิทยาลัย <strong>({studentEmail})</strong> หากคุณเป็นบริษัท/สถานประกอบการ กรุณาสลับไปลงทะเบียนเป็นสถานประกอบการ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmpEmail(studentEmail);
                    setTab("employer");
                    setError("");
                  }}
                  className="w-full py-2 bg-secondary text-on-secondary text-xs font-bold rounded-lg hover:bg-secondary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">domain</span>
                  สลับไปลงทะเบียนสถานประกอบการด้วยอีเมลนี้
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                ชื่อ - นามสกุล*
              </label>
              <input
                type="text"
                required
                placeholder="นาย กิตติศักดิ์ ช."
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full p-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                แผนกวิชาช่าง*
              </label>
              <DepartmentDropdown
                value={studentDepartment}
                onChange={(val) => setStudentDepartment(val)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                ระดับชั้น*
              </label>
              <select
                value={studentLevel}
                onChange={(e) => setStudentLevel(e.target.value)}
                className="w-full p-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm"
              >
                <option value="pvc">ประกาศนียบัตรวิชาชีพ (ปวช.)</option>
                <option value="pvs">ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)*
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
                className="w-full p-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 shadow-md transition-all active:scale-98"
            >
              {loading ? "กำลังสมัคร..." : "สมัครสมาชิกนักศึกษา"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmployerRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                ชื่อสถานประกอบการ / บริษัท*
              </label>
              <input
                type="text"
                required
                placeholder="บจก. เอ็นเนอร์ยี่ โซลูชั่น"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                อีเมลติดต่อบริษัท*
              </label>
              <input
                type="email"
                required
                placeholder="contact@company.com"
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                className="w-full p-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                ที่อยู่สถานประกอบการ
              </label>
              <input
                type="text"
                placeholder="อ.หาดใหญ่ จ.สงขลา"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                ประเภทธุรกิจ / อุตสาหกรรม
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary mb-1">
                รหัสผ่าน*
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={empPassword}
                onChange={(e) => setEmpPassword(e.target.value)}
                className="w-full p-2.5 bg-surface border border-outline-variant/30 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-secondary text-on-secondary font-bold rounded-xl text-sm hover:bg-secondary/90 shadow-md transition-all active:scale-98"
            >
              {loading ? "กำลังลงทะเบียน..." : "ส่งข้อมูลลงทะเบียนสถานประกอบการ"}
            </button>
          </form>
        )}

        <div className="text-center mt-6 pt-4 border-t border-outline-variant/30 text-xs text-on-surface-variant">
          มีบัญชีอยู่แล้ว?{" "}
          <Link
            href="/auth/login"
            className="text-secondary font-bold hover:underline"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
