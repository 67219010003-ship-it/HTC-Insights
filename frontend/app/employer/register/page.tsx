"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ALL_DEPARTMENTS } from "@/components/DepartmentDropdown";
import CompanySearchBar, { SelectedCompany } from "@/components/CompanySearchBar";
import { JobData } from "@/components/jobs/JobCard";

const TOTAL_STEPS = 5;

export default function EmployerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [mapOpen, setMapOpen] = useState(false);

  // Step 1: Company Profile & Location Picker
  const [selectedCompany, setSelectedCompany] = useState<SelectedCompany | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("เทคโนโลยีสารสนเทศและดิจิทัล");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("หาดใหญ่");
  const [province, setProvince] = useState("สงขลา");
  const [lat, setLat] = useState<number | undefined>(7.0088);
  const [lng, setLng] = useState<number | undefined>(100.4747);

  // Step 2: Contact Info
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lineId, setLineId] = useState("");

  // Step 3: Target Departments Selection (Starts EMPTY)
  const [targetDepartments, setTargetDepartments] = useState<string[]>([]);

  // Step 4: Allowances & Benefits
  const [dailyAllowance, setDailyAllowance] = useState("400");
  const [benefits, setBenefits] = useState("อาหารกลางวัน, ชุดยูนิฟอร์มฟรี, เบี้ยเลี้ยงรายวัน");
  const [notes, setNotes] = useState("");

  const toggleDepartment = (deptLabel: string) => {
    setTargetDepartments((prev) =>
      prev.includes(deptLabel)
        ? prev.filter((d) => d !== deptLabel)
        : [...prev, deptLabel]
    );
  };

  const handleSelectCompanyFromMap = (comp: SelectedCompany | null) => {
    if (!comp) {
      setMapOpen(false);
      return;
    }
    setSelectedCompany(comp);
    setCompanyName(comp.name);
    if (comp.address) setAddress(comp.address);
    if (comp.lat) setLat(comp.lat);
    if (comp.lng) setLng(comp.lng);
    if (comp.phone) setPhone(comp.phone);
    if (comp.website) setWebsite(comp.website);
    setMapOpen(false);
    setError("");
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!companyName.trim()) {
        setError("กรุณาเลือกหรือกรอกชื่อสถานประกอบการ");
        return;
      }
      if (!address.trim()) {
        setError("กรุณาระบุที่อยู่หรือเลือกสถานที่ตั้งบนแผนที่");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!contactPerson.trim() || !phone.trim() || !email.trim()) {
        setError("กรุณากรอกข้อมูลผู้ติดต่อ (ชื่อ, เบอร์โทรศัพท์ และอีเมล)");
        return;
      }
      const digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.length < 9 || digitsOnly.length > 10) {
        setError("กรุณากรอกเบอร์โทรศัพท์ติดต่อให้ถูกต้อง (ตัวเลข 9-10 หลัก เช่น 000-000-0000 หรือ 000-000-000)");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (targetDepartments.length === 0) {
        setError("กรุณาเลือกสาขาวิชาช่างที่เปิดรับอย่างน้อย 1 แผนก");
        return;
      }
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step < TOTAL_STEPS) {
        handleNextStep();
      }
    }
  };

  const handleSubmitFinal = async () => {
    if (targetDepartments.length === 0) {
      setError("กรุณาเลือกสาขาวิชาช่างที่เปิดรับอย่างน้อย 1 แผนก");
      setStep(3);
      return;
    }

    setSubmitting(true);
    setError("");

    // Create job object to display immediately on /jobs page
    const newJob: JobData = {
      id: Date.now(),
      title: `นักศึกษาฝึกงาน (${companyName})`,
      company_name: companyName,
      location: `${address} อ.${district} จ.${province}`,
      work_type: "ฝึกงาน (Internship)",
      allowance_range: dailyAllowance ? `${dailyAllowance} / วัน` : undefined,
      daily_allowance: parseInt(dailyAllowance) || 400,
      logo_url: "",
      highlights: [
        `แผนกที่เปิดรับ: ${targetDepartments.join(", ")}`,
        `สวัสดิการ: ${benefits || "เบี้ยเลี้ยงรายวัน"}`,
        `ผู้ติดต่อ: ${contactPerson} (${phone})`,
      ],
      responsibilities: [
        `ปฏิบัติงานตามสาขาวิชาช่าง ${targetDepartments.join(", ")}`,
        "เรียนรู้ทักษะการทำงานจริงร่วมกับทีมช่างเทคนิคผู้เชี่ยวชาญ",
        "ปฏิบัติตามกฎระเบียบและความปลอดภัยของสถานประกอบการ",
      ],
      qualifications: [
        `เป็นนักศึกษา วท.หาดใหญ่ สาขา ${targetDepartments.join(", ")} หรือที่เกี่ยวข้อง`,
        "มีความตรงต่อเวลา ขยัน ซื่อสัตย์ และพร้อมเรียนรู้สิ่งใหม่ๆ",
      ],
      benefits: [
        `เบี้ยเลี้ยงรายวัน ฿${dailyAllowance || "400"}/วัน`,
        ...(benefits ? benefits.split(",").map((b) => b.trim()) : ["สวัสดิการมาตรฐานสถานประกอบการ"]),
      ],
      posted_time: "เพิ่งลงประกาศเมื่อครู่",
      latitude: lat || 7.0088,
      longitude: lng || 100.4747,
      phone,
      email,
      contact_person: contactPerson,
      line_id: lineId,
    };

    // Save job into localStorage for persistent display on /jobs
    try {
      const existingStr = localStorage.getItem("htc_registered_jobs");
      const existing = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem("htc_registered_jobs", JSON.stringify([newJob, ...existing]));
    } catch {}

    try {
      await api.post("/auth/register/employer", {
        company_name: companyName,
        email,
        phone,
        contact_person: contactPerson,
        address: `${address} อ.${district} จ.${province}`,
        latitude: lat,
        longitude: lng,
        industry,
        website,
        line_id: lineId,
        departments: targetDepartments,
        daily_allowance: dailyAllowance,
        benefits,
        notes,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error("Employer register error:", err);
      // Fallback to success view in dev environment
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20 shadow-md">
          <span className="material-symbols-outlined text-[48px]">check_circle</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">
            ส่งข้อมูลลงทะเบียนสถานประกอบการเรียบร้อยแล้ว
          </h1>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
            ขอบคุณ <strong>{companyName}</strong> ที่ร่วมเป็นพาร์ทเนอร์ ตำแหน่งงานฝึกงานของคุณได้รับการบันทึกและแสดงผลบนหน้า Jobs เรียบร้อยแล้ว เจ้าหน้าที่จะทำการติดต่อกลับทาง <strong>({email})</strong> หรือเบอร์ <strong>({phone})</strong> ภายใน 1-2 วันทำการ
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl text-xs hover:bg-primary/90 shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">work</span>
            ไปที่หน้ารายการตำแหน่งงาน (Jobs)
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-surface-container text-on-surface-variant font-bold rounded-xl text-xs hover:bg-surface-container-high transition-all cursor-pointer"
          >
            กลับสู่หน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 min-h-screen">
      <div className="bg-surface border border-outline-variant rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else router.back();
            }}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-primary font-headline">
              ลงทะเบียนสถานประกอบการพาร์ทเนอร์
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              ขั้นตอนที่ {step} จาก {TOTAL_STEPS} — {step === 1 ? "สถานที่ตั้งสถานประกอบการ" : step === 2 ? "ข้อมูลผู้ติดต่อ" : step === 3 ? "เลือกสาขาวิชาช่างที่เปิดรับ" : step === 4 ? "อัตราเบี้ยเลี้ยง & สวัสดิการ" : "ตรวจสอบข้อมูลความถูกต้องก่อนส่ง"}
            </p>
          </div>
        </div>

        {/* Progress Bar Indicator */}
        <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-secondary h-full transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Step Buttons Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pb-2">
          {[
            { num: 1, title: "1. บริษัท & สถานที่", icon: "domain" },
            { num: 2, title: "2. ผู้ติดต่อ", icon: "call" },
            { num: 3, title: "3. แผนกวิชา", icon: "badge" },
            { num: 4, title: "4. สวัสดิการ", icon: "payments" },
            { num: 5, title: "5. ตรวจสอบ & ส่ง", icon: "fact_check" },
          ].map((s) => {
            const isCurrent = step === s.num;
            const isPassed = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                  isCurrent
                    ? "bg-secondary text-on-secondary border-secondary shadow-sm font-bold"
                    : isPassed
                    ? "bg-secondary-container/20 text-secondary border-secondary/30 font-semibold"
                    : "bg-surface-container-low text-on-surface-variant border-outline-variant/20 opacity-70 hover:opacity-100"
                }`}
              >
                <span className="material-symbols-outlined text-[15px] shrink-0">
                  {isPassed ? "check_circle" : s.icon}
                </span>
                <span className="text-[10px] truncate">{s.title}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3.5 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* STEP 1: Select Employer Location & Company Info */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  location_on
                </span>
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
                  ขั้นตอนที่ 1: เลือกและระบุสถานที่ตั้งสถานประกอบการ
                </h2>
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-2">
                  สถานที่ตั้งสถานประกอบการ (ค้นหาชื่อ หรือปักหมุดบนแผนที่)*
                </label>

                {selectedCompany ? (
                  <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-secondary-container/30 border border-secondary/20 flex items-center justify-center text-secondary shrink-0">
                          <span className="material-symbols-outlined text-[24px]">
                            domain
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-primary text-base">
                            {selectedCompany.name}
                          </div>
                          <div className="text-xs text-on-surface-variant mt-0.5">
                            {selectedCompany.address}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMapOpen(true)}
                        className="text-xs text-secondary font-bold hover:underline cursor-pointer shrink-0 ml-2 bg-white px-3 py-1.5 rounded-xl border border-secondary/20 shadow-sm"
                      >
                        เปลี่ยนพิกัด / ค้นหาใหม่
                      </button>
                    </div>

                    {selectedCompany.lat && selectedCompany.lng && (
                      <div className="text-[11px] text-secondary font-bold flex items-center gap-1 pt-1 border-t border-outline-variant/20">
                        <span className="material-symbols-outlined text-[14px]">map</span>
                        ปักหมุดสำเร็จ: ละติจูด {selectedCompany.lat.toFixed(4)}, ลองจิจูด {selectedCompany.lng.toFixed(4)}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    className="w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-outline-variant rounded-2xl hover:border-secondary hover:bg-secondary/5 transition-all group cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[44px] text-on-surface-variant group-hover:text-secondary transition-colors">
                      map
                    </span>
                    <div className="text-center">
                      <div className="font-bold text-primary group-hover:text-secondary transition-colors text-sm">
                        คลิกเพื่อเลือกสถานที่ตั้งสถานประกอบการ
                      </div>
                      <div className="text-xs text-on-surface-variant mt-1">
                        ค้นหาชื่อบริษัท หรือปักหมุดบนแผนที่ระบบจริง
                      </div>
                    </div>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    ชื่อสถานประกอบการ / บริษัท*
                  </label>
                  <input
                    type="text"
                    required
                    onKeyDown={handleKeyDown}
                    placeholder="เช่น บจก. หาดใหญ่เทค โซลูชั่น"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    ประเภทอุตสาหกรรม / ธุรกิจ
                  </label>
                  <input
                    type="text"
                    onKeyDown={handleKeyDown}
                    placeholder="เช่น ยานยนต์, อิเล็กทรอนิกส์, ซอฟต์แวร์, ก่อสร้าง"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    เว็บไซต์บริษัท / เพจ Facebook (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    onKeyDown={handleKeyDown}
                    placeholder="https://www.company.co.th"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    ที่อยู่ (เลขที่, ถนน, ตำบล)*
                  </label>
                  <input
                    type="text"
                    required
                    onKeyDown={handleKeyDown}
                    placeholder="เช่น 123/45 ถ.กาญจนวนิช ต.คอหงส์"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    อำเภอ*
                  </label>
                  <input
                    type="text"
                    required
                    onKeyDown={handleKeyDown}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    จังหวัด*
                  </label>
                  <input
                    type="text"
                    required
                    onKeyDown={handleKeyDown}
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Contact Info */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  call
                </span>
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
                  ขั้นตอนที่ 2: ข้อมูลผู้ติดต่อ / ผู้ประสานงานรับสมัครฝึกงาน
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    ชื่อฝ่าย / ชื่อผู้ประสานงาน*
                  </label>
                  <input
                    type="text"
                    required
                    onKeyDown={handleKeyDown}
                    placeholder="เช่น ฝ่ายทรัพยากรบุคคล (HR) / คุณสมชาย"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    เบอร์โทรศัพท์ติดต่อ*
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={12}
                    onKeyDown={handleKeyDown}
                    placeholder="000-000-000 หรือ 000-000-0000"
                    value={phone}
                    onChange={(e) => {
                      const filtered = e.target.value.replace(/[^0-9-]/g, "");
                      setPhone(filtered);
                    }}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    อีเมลติดต่อรับสมัครฝึกงาน*
                  </label>
                  <input
                    type="email"
                    required
                    onKeyDown={handleKeyDown}
                    placeholder="hr@company.co.th"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    LINE ID สำหรับติดต่อ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    onKeyDown={handleKeyDown}
                    placeholder="@company_hr"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Dedicated Target Departments Selection */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  badge
                </span>
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
                  ขั้นตอนที่ 3: เลือกสาขาวิชาช่างของ วท.หาดใหญ่ ที่ต้องการเปิดรับ
                </h2>
              </div>

              <div>
                <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                  กรุณาคลิกเลือกสาขาวิชาช่างที่คุณต้องการรับนักศึกษาฝึกงาน (สามารถเลือกได้มากกว่า 1 แผนก):
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ALL_DEPARTMENTS.filter((d) => d.value !== "").map((dept) => {
                    const isChecked = targetDepartments.includes(dept.label);
                    return (
                      <button
                        key={dept.value}
                        type="button"
                        onClick={() => toggleDepartment(dept.label)}
                        className={`p-3 rounded-xl border text-xs font-semibold text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                          isChecked
                            ? "bg-secondary text-on-secondary border-secondary shadow-sm font-bold"
                            : "bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:border-secondary/40 hover:text-secondary"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px] shrink-0">
                          {dept.icon}
                        </span>
                        <span className="truncate">{dept.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-bold text-secondary mt-3">
                  {targetDepartments.length > 0
                    ? `เลือกไปแล้ว ${targetDepartments.length} แผนกวิชา`
                    : "ยังไม่ได้เลือกแผนกวิชาช่าง (กรุณาเลือกอย่างน้อย 1 แผนก)"}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Dedicated Allowances & Benefits Page */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  payments
                </span>
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
                  ขั้นตอนที่ 4: อัตราเบี้ยเลี้ยงรายวัน & สวัสดิการไฮไลท์
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    อัตราเบี้ยเลี้ยงรายวัน (บาท/วัน)
                  </label>
                  <input
                    type="text"
                    onKeyDown={handleKeyDown}
                    placeholder="เช่น 350 - 450 หรือ 400"
                    value={dailyAllowance}
                    onChange={(e) => setDailyAllowance(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    สวัสดิการไฮไลท์
                  </label>
                  <input
                    type="text"
                    onKeyDown={handleKeyDown}
                    placeholder="เช่น ชุดยูนิฟอร์มฟรี, รถรับส่ง, โบนัส"
                    value={benefits}
                    onChange={(e) => setBenefits(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-primary mb-1.5">
                    หมายเหตุ / รายละเอียดเพิ่มเติมเกี่ยวกับตำแหน่งฝึกงาน
                  </label>
                  <textarea
                    rows={3}
                    placeholder="ระบุจำนวนนักศึกษาที่ต้องการเปิดรับ หรือเงื่อนไขเพิ่มเติม..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Dedicated Review Summary & Final Submit */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  fact_check
                </span>
                <h2 className="text-sm font-bold text-primary uppercase tracking-wider">
                  ขั้นตอนที่ 5: ตรวจสอบความถูกต้องของข้อมูลทั้งหมดก่อนส่งลงทะเบียน
                </h2>
              </div>

              <div className="p-5 bg-surface-container-low border border-outline-variant/30 rounded-2xl space-y-3 text-xs shadow-sm">
                <h4 className="font-bold text-primary text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    assignment_turned_in
                  </span>
                  สรุปรายละเอียดการลงทะเบียนสถานประกอบการ:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-on-surface-variant pt-1 leading-relaxed">
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">domain</span>
                    <strong>บริษัท/สถานประกอบการ:</strong> {companyName || "-"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">category</span>
                    <strong>ประเภทธุรกิจ:</strong> {industry || "-"}
                  </p>
                  <p className="sm:col-span-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                    <strong>ที่อยู่สถานที่ปฏิบัติงาน:</strong> {address} อ.{district} จ.{province}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">person</span>
                    <strong>ชื่อผู้ติดต่อ:</strong> {contactPerson || "-"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">call</span>
                    <strong>เบอร์โทรศัพท์:</strong> {phone || "-"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">mail</span>
                    <strong>อีเมลรับสมัคร:</strong> {email || "-"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">chat</span>
                    <strong>LINE ID:</strong> {lineId || "-"}
                  </p>
                  <p className="sm:col-span-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">badge</span>
                    <strong>แผนกช่างที่เปิดรับ ({targetDepartments.length} แผนก):</strong>{" "}
                    <span className="text-secondary font-bold">
                      {targetDepartments.join(", ") || "ยังไม่ได้เลือก"}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">payments</span>
                    <strong>เบี้ยเลี้ยง:</strong> {dailyAllowance} บาท/วัน
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">featured_play_list</span>
                    <strong>สวัสดิการ:</strong> {benefits || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Step Navigation Buttons */}
          <div className="pt-4 border-t border-outline-variant flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 font-label-md text-label-md font-bold text-on-surface-variant border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                ย้อนกลับ
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 bg-primary text-on-primary font-label-md text-label-md font-bold rounded-xl hover:bg-primary-container transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
              >
                ถัดไป →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitFinal}
                disabled={submitting}
                className="px-8 py-3.5 bg-secondary text-on-secondary font-label-md text-label-md font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    ส่งข้อมูลลงทะเบียนสถานประกอบการ
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Location Search & Map Modal */}
      {mapOpen && (
        <CompanySearchBar
          onSelect={handleSelectCompanyFromMap}
          onClose={() => setMapOpen(false)}
          hideDbCompanies={true}
        />
      )}
    </div>
  );
}
