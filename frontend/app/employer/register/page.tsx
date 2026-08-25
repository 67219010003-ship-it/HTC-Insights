"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import DepartmentDropdown, { ALL_DEPARTMENTS } from "@/components/DepartmentDropdown";
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
  const [mapError, setMapError] = useState(false);

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
  const [selectedDeptDropdown, setSelectedDeptDropdown] = useState("");

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
    setMapError(false);
    setError("");
  };

  const validateStep1 = (): boolean => {
    if (!selectedCompany) {
      setMapError(true);
      setError("กรุณาใช้ช่องค้นหาหรือปักหมุดเพื่อเลือกสถานที่ตั้งสถานประกอบการจากระบบแผนที่");
      return false;
    }
    setMapError(false);
    if (!companyName.trim() || companyName.trim().length < 3) {
      setError("กรุณากรอกชื่อสถานประกอบการ / บริษัทอย่างน้อย 3 ตัวอักษร");
      return false;
    }
    if (!address.trim() || address.trim().length < 5) {
      setError("กรุณากรอกที่อยู่สถานที่ตั้งอย่างน้อย 5 ตัวอักษร หรือค้นหาและปักหมุดบนแผนที่");
      return false;
    }
    if (!district.trim()) {
      setError("กรุณาระบุอำเภอที่ตั้งของสถานประกอบการ");
      return false;
    }
    if (!province.trim()) {
      setError("กรุณาระบุจังหวัดที่ตั้งของสถานประกอบการ");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!contactPerson.trim() || contactPerson.trim().length < 2) {
      setError("กรุณากรอกชื่อฝ่าย หรือชื่อผู้ประสานงานรับสมัครฝึกงาน");
      return false;
    }
    if (!phone.trim()) {
      setError("กรุณากรอกเบอร์โทรศัพท์ติดต่อ");
      return false;
    }
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 9 || digitsOnly.length > 10) {
      setError("กรุณากรอกเบอร์โทรศัพท์ติดต่อให้ถูกต้อง (ตัวเลข 9-10 หลัก เช่น 000-000-0000 หรือ 000-000-000)");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError("กรุณากรอกอีเมลติดต่อให้ถูกต้อง (เช่น hr@company.co.th)");
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (targetDepartments.length === 0) {
      setError("กรุณาเลือกสาขาวิชาช่างของ วท.หาดใหญ่ ที่ต้องการเปิดรับอย่างน้อย 1 แผนก");
      return false;
    }
    return true;
  };

  const validateAll = (): boolean => {
    if (!validateStep1()) {
      setStep(1);
      return false;
    }
    if (!validateStep2()) {
      setStep(2);
      return false;
    }
    if (!validateStep3()) {
      setStep(3);
      return false;
    }
    return true;
  };

  const isStepAccessible = (targetNum: number): boolean => {
    if (targetNum === 1) return true;
    if (targetNum === 2) {
      return companyName.trim().length >= 3 && address.trim().length >= 5 && !!district.trim() && !!province.trim();
    }
    if (targetNum === 3) {
      const digitsOnly = phone.replace(/\D/g, "");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return (
        isStepAccessible(2) &&
        contactPerson.trim().length >= 2 &&
        digitsOnly.length >= 9 &&
        digitsOnly.length <= 10 &&
        emailRegex.test(email.trim())
      );
    }
    if (targetNum === 4 || targetNum === 5) {
      return isStepAccessible(3) && targetDepartments.length > 0;
    }
    return false;
  };

  const handleStepClick = (targetNum: number) => {
    setError("");
    if (targetNum === step) return;

    if (targetNum < step) {
      // Navigating back is always allowed
      setStep(targetNum);
      return;
    }

    // Navigating forward requires previous steps to be valid
    if (targetNum === 2) {
      if (!validateStep1()) {
        setStep(1);
        return;
      }
      setStep(2);
    } else if (targetNum === 3) {
      if (!validateStep1()) {
        setStep(1);
        return;
      }
      if (!validateStep2()) {
        setStep(2);
        return;
      }
      setStep(3);
    } else if (targetNum >= 4) {
      if (!validateStep1()) {
        setStep(1);
        return;
      }
      if (!validateStep2()) {
        setStep(2);
        return;
      }
      if (!validateStep3()) {
        setStep(3);
        return;
      }
      setStep(targetNum);
    }
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    } else if (step === 3) {
      if (!validateStep3()) return;
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
    setError("");
    if (!validateAll()) {
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/auth/register/employer", {
        company_name: companyName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        contact_person: contactPerson.trim(),
        address: `${address.trim()} อ.${district.trim()} จ.${province.trim()}`,
        latitude: lat,
        longitude: lng,
        industry: industry.trim(),
        website: website.trim(),
        line_id: lineId.trim(),
        departments: targetDepartments,
        daily_allowance: dailyAllowance.trim(),
        benefits: benefits.trim(),
        notes: notes.trim(),
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error("Employer register error:", err);
      setError(
        err.response?.data?.detail ||
          "เกิดข้อผิดพลาดในการลงทะเบียนสถานประกอบการ กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง"
      );
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
            ขอบคุณ <strong>{companyName}</strong> ที่ร่วมเป็นพาร์ทเนอร์ ตำแหน่งงานฝึกงานของคุณได้รับการบันทึกและส่งให้ผู้ดูแลระบบตรวจสอบเรียบร้อยแล้ว เจ้าหน้าที่จะทำการติดต่อกลับทาง <strong>({email})</strong> หรือเบอร์ <strong>({phone})</strong> ภายใน 1-2 วันทำการ
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl text-xs hover:bg-primary/90 shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">work</span>
            ไปที่หน้ารายการตำแหน่งงาน
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
              if (step > 1) {
                setError("");
                setStep(step - 1);
              } else {
                router.back();
              }
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

        {/* Step Buttons Row with Anti-Bypass Validation */}
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
            const accessible = isStepAccessible(s.num);

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => handleStepClick(s.num)}
                title={!accessible && !isPassed ? "กรุณากรอกข้อมูลขั้นตอนก่อนหน้าให้ครบถ้วน" : ""}
                className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                  isCurrent
                    ? "bg-secondary text-on-secondary border-secondary shadow-sm font-bold ring-2 ring-secondary/30"
                    : isPassed
                    ? "bg-secondary-container/20 text-secondary border-secondary/30 font-semibold hover:bg-secondary-container/40"
                    : accessible
                    ? "bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:border-secondary/50"
                    : "bg-surface-container-low/50 text-outline border-outline-variant/20 opacity-50 cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-[15px] shrink-0">
                  {isPassed ? "check_circle" : !accessible ? "lock" : s.icon}
                </span>
                <span className="text-[10px] truncate">{s.title}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3.5 bg-error-container text-on-error-container rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span>{error}</span>
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
                    onClick={() => {
                      setMapOpen(true);
                      setMapError(false);
                    }}
                    className={`w-full flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed rounded-2xl transition-all group cursor-pointer ${
                      mapError
                        ? "border-red-500 bg-red-50/50 text-red-700 hover:bg-red-50 shadow-xs animate-shake"
                        : "border-outline-variant hover:border-secondary hover:bg-secondary/5"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[44px] transition-colors ${
                        mapError ? "text-red-500" : "text-on-surface-variant group-hover:text-secondary"
                      }`}
                    >
                      {mapError ? "wrong_location" : "map"}
                    </span>
                    <div className="text-center">
                      <div
                        className={`font-bold transition-colors text-sm ${
                          mapError ? "text-red-700 font-bold" : "text-primary group-hover:text-secondary"
                        }`}
                      >
                        {mapError ? "⚠️ กรุณาคลิกเลือกสถานที่ตั้งสถานประกอบการจากแผนที่ก่อนดำเนินการต่อ" : "คลิกเพื่อเลือกสถานที่ตั้งสถานประกอบการ"}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          mapError ? "text-red-600 font-medium" : "text-on-surface-variant"
                        }`}
                      >
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

          {/* STEP 3: Dedicated Target Departments Selection via Dropdown & Tags */}
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

              <div className="space-y-4">
                <div className="w-full">
                  <DepartmentDropdown
                    value={selectedDeptDropdown}
                    onChange={(val) => {
                      if (val && !targetDepartments.includes(val)) {
                        setTargetDepartments([...targetDepartments, val]);
                        setError("");
                      }
                    }}
                    className="relative w-full"
                  />
                </div>

                {/* Quick Add all / Clear all */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    {targetDepartments.length > 0
                      ? `เลือกไปแล้ว ${targetDepartments.length} แผนกวิชา`
                      : "ยังไม่ได้เลือกแผนกวิชาช่าง (กรุณาเลือกอย่างน้อย 1 แผนก)"}
                  </span>

                  {targetDepartments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetDepartments([])}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      ล้างแผนกทั้งหมด
                    </button>
                  )}
                </div>

                {/* Selected Department Tags */}
                {targetDepartments.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {targetDepartments.map((deptName) => {
                      const deptObj = ALL_DEPARTMENTS.find((d) => d.label === deptName);
                      return (
                        <div
                          key={deptName}
                          className="inline-flex items-center gap-2 bg-secondary-container/40 border border-secondary/30 text-on-secondary-container px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs max-w-full"
                        >
                          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                            {deptObj?.icon || "school"}
                          </span>
                          <span className="break-words">{deptName}</span>
                          <button
                            type="button"
                            onClick={() => toggleDepartment(deptName)}
                            className="text-on-secondary-container/60 hover:text-rose-600 hover:bg-rose-100 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ml-1"
                            title={`ลบ ${deptName} ออก`}
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 bg-surface-container-low/50 border-2 border-dashed border-outline-variant/40 rounded-2xl text-center space-y-1">
                    <span className="material-symbols-outlined text-[32px] text-outline">school</span>
                    <p className="text-xs font-bold text-primary">ยังไม่มีแผนกวิชาที่เลือก</p>
                    <p className="text-[11px] text-on-surface-variant">
                      กรุณาคลิกเลือกสาขาวิชาช่างจากเมนูดรอปดาวน์ด้านบน เพื่อระบุกลุ่มนักศึกษาที่ต้องการรับฝึกงาน
                    </p>
                  </div>
                )}
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
