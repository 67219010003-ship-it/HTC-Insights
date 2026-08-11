"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { ALL_DEPARTMENTS } from "@/components/DepartmentDropdown";
import CompanySearchBar, { SelectedCompany } from "@/components/CompanySearchBar";

export default function WriteReviewPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [companies, setCompanies] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  // Form states
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<SelectedCompany | null>(null);
  const [isCompanyLocked, setIsCompanyLocked] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  const [gender, setGender] = useState("male");
  const [department, setDepartment] = useState("แผนกวิชาช่างอิเล็กทรอนิกส์");
  const [periodStart, setPeriodStart] = useState("2026-05-01");
  const [periodEnd, setPeriodEnd] = useState("2026-08-31");
  const [dailyAllowance, setDailyAllowance] = useState("");
  const [workStartTime, setWorkStartTime] = useState("08:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");

  const [scoreOverall, setScoreOverall] = useState(5);
  const [scoreWork, setScoreWork] = useState(5);
  const [scoreEnv, setScoreEnv] = useState(5);
  const [scoreMentor, setScoreMentor] = useState(5);
  const [scoreWelfare, setScoreWelfare] = useState(5);
  
  const [textWork, setTextWork] = useState("");
  const [textPros, setTextPros] = useState("");
  const [textCons, setTextCons] = useState("");
  const [textAdvice, setTextAdvice] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Photos state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/auth/login");
      return;
    }
    
    // Fetch user profile to prefill department
    api.get("/auth/me")
      .then((res) => {
        if (res.data?.department) {
          setDepartment(res.data.department);
        }
      })
      .catch(() => {});

    // Check review_id for editing mode
    const urlParams = new URLSearchParams(window.location.search);
    const reviewIdParam = urlParams.get("review_id");
    const companyIdParam = urlParams.get("company_id");

    if (reviewIdParam) {
      const revId = Number(reviewIdParam);
      setEditingReviewId(revId);
      
      const applyReviewData = (match: any) => {
        if (!match) return;
        if (match.gender) setGender(match.gender);
        if (match.department) setDepartment(match.department);
        if (match.daily_allowance !== null && match.daily_allowance !== undefined) setDailyAllowance(String(match.daily_allowance));
        if (match.work_start_time) setWorkStartTime(match.work_start_time);
        if (match.work_end_time) setWorkEndTime(match.work_end_time);
        // Use !== undefined (not truthy) so score=1 is also loaded correctly
        if (match.score_overall !== undefined && match.score_overall !== null) setScoreOverall(match.score_overall);
        if (match.score_work !== undefined && match.score_work !== null) setScoreWork(match.score_work);
        if (match.score_env !== undefined && match.score_env !== null) setScoreEnv(match.score_env);
        if (match.score_mentor !== undefined && match.score_mentor !== null) setScoreMentor(match.score_mentor);
        if (match.score_welfare !== undefined && match.score_welfare !== null) setScoreWelfare(match.score_welfare);
        if (match.text_work) setTextWork(match.text_work);
        if (match.text_pros) setTextPros(match.text_pros);
        if (match.text_cons) setTextCons(match.text_cons);
        if (match.text_advice) setTextAdvice(match.text_advice);
        setIsAnonymous(!!match.is_anonymous);
        if (match.period_start) setPeriodStart(match.period_start);
        if (match.period_end) setPeriodEnd(match.period_end);
      };

      api.get("/reviews/my").then((res) => {
        const match = res.data?.find((r: any) => r.id === revId);
        if (match) {
          applyReviewData(match);
        } else if (companyIdParam) {
          api.get(`/companies/${companyIdParam}/reviews`).then((cRes) => {
            const cMatch = cRes.data?.find((r: any) => r.id === revId);
            if (cMatch) applyReviewData(cMatch);
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    api.get("/companies").then((res) => {
      const list = res.data;
      setCompanies(list);
      const companyIdParam = urlParams.get("company_id");
      if (companyIdParam) {
        setIsCompanyLocked(true);
        const matched = list.find((c: any) => c.id === Number(companyIdParam));
        if (matched) {
          const sel: SelectedCompany = {
            id: matched.id,
            name: matched.name,
            address: matched.address || "",
            phone: matched.phone || "",
            website: matched.website || "",
            lat: matched.lat || 7.0084,
            lng: matched.lng || 100.4767,
            source: "db"
          };
          setSelectedCompany(sel);
          setCompanyId(matched.id);
        }
      }
    }).catch(() => {});
  }, []);

  const validateStep = (s: number): string | null => {
    if (s === 1 && !companyId) {
      return "กรุณาค้นหาและเลือกสถานประกอบการก่อนดำเนินการต่อ";
    }
    if (s === 2) {
      if (dailyAllowance !== "" && parseInt(dailyAllowance) < 0) {
        return "เบี้ยเลี้ยงรายวันไม่สามารถมีค่าติดลบได้";
      }
    }
    if (s === 4) {
      if (textWork.length < 50) {
        return `รายละเอียดงานต้องมีความยาวอย่างน้อย 50 ตัวอักษร (ปัจจุบันมี ${textWork.length} ตัวอักษร)`;
      }
    }
    return null;
  };

  const handleNextStep = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let activeCompanyId = companyId;

      if (selectedCompany && (selectedCompany.source === "osm" || selectedCompany.source === "google" || selectedCompany.source === "manual")) {
        // Create the company first
        const compRes = await api.post("/companies", {
          name: selectedCompany.name,
          address: selectedCompany.address || "หาดใหญ่, สงขลา",
          lat: selectedCompany.lat,
          lng: selectedCompany.lng,
          phone: selectedCompany.phone || null,
          website: selectedCompany.website || null,
          cover_image_url: selectedCompany.cover_image_url || null,
          description: null,
        });
        activeCompanyId = compRes.data.company_id;
      }

      const reviewData = {
        company_id: activeCompanyId,
        gender,
        period_start: periodStart,
        period_end: periodEnd,
        department,
        daily_allowance: parseInt(dailyAllowance) || 0,
        work_start_time: workStartTime || null,
        work_end_time: workEndTime || null,
        score_overall: scoreOverall,
        score_work: scoreWork,
        score_env: scoreEnv,
        score_mentor: scoreMentor,
        score_welfare: scoreWelfare,
        text_work: textWork,
        text_pros: textPros || null,
        text_cons: textCons || null,
        text_advice: textAdvice || null,
        is_anonymous: isAnonymous,
      };

      let reviewId = editingReviewId;
      if (editingReviewId) {
        await api.put(`/reviews/${editingReviewId}`, reviewData);
      } else {
        const res = await api.post("/reviews", reviewData);
        reviewId = res.data.review_id;
      }

      // Real photo upload if files are chosen
      if (selectedFiles.length > 0 && reviewId) {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        await api.post(`/reviews/${reviewId}/photos`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setSubmitted(true);
    } catch (err: any) {
      // FastAPI Pydantic v2 returns detail as array of objects [{type, loc, msg, ...}]
      // Must convert to string before setting state
      const rawDetail = err.response?.data?.detail;
      let errorMsg = "เกิดข้อผิดพลาดในการส่งรีวิว";
      if (typeof rawDetail === "string") {
        errorMsg = rawDetail;
      } else if (Array.isArray(rawDetail)) {
        // Pydantic v2 validation errors
        errorMsg = rawDetail
          .map((e: any) => `${Array.isArray(e.loc) ? e.loc.join(" → ") : e.loc}: ${e.msg}`)
          .join(", ");
      } else if (rawDetail && typeof rawDetail === "object") {
        errorMsg = JSON.stringify(rawDetail);
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-margin-mobile py-16 text-center space-y-md bg-white border border-outline-variant rounded-3xl shadow-xl mt-12">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-[48px]">check_circle</span>
        </div>
        <h2 className="text-2xl font-bold text-primary font-headline">ส่งรีวิวสำเร็จแล้ว!</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto">
          ข้อมูลประสบการณ์ฝึกงานของคุณได้รับการบันทึกเรียบร้อยแล้ว และจะแสดงผลบนระบบหลังจากได้รับการตรวจสอบโดยผู้ดูแลระบบ (แอดมิน)
        </p>
        <div className="flex flex-col gap-sm pt-md">
          <button
            onClick={() => router.push("/insights")}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-label-md text-label-md font-bold shadow-md hover:scale-105 transition-transform cursor-pointer"
          >
            ไปหน้าคลังข้อมูลรีวิว (Insights)
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-xl font-label-md text-label-md font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-margin-mobile py-8">
      <div className="bg-surface border border-outline-variant rounded-3xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-sm mb-xs">
          <span className="material-symbols-outlined text-secondary text-[28px]">
            {editingReviewId ? "edit_note" : "rate_review"}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">
            {editingReviewId ? "แก้ไขรีวิวประสบการณ์ฝึกงาน" : "เขียนรีวิวประสบการณ์ฝึกงาน"}
          </h1>
        </div>
        <p className="text-body-sm text-body-sm text-on-surface-variant mb-6">
          {editingReviewId
            ? "ขั้นตอนที่ " + step + " จาก 5 — แก้ไขรีวิว (การบันทึกจะส่งให้ผู้ดูแลระบบตรวจสอบใหม่)"
            : "ขั้นตอนที่ " + step + " จาก 5 — ประสบการณ์ฝึกงานของคุณบน HTC Insights มีคุณค่าอย่างยิ่งสำหรับรุ่นน้อง"}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-surface-container-high h-2.5 rounded-full mb-8 overflow-hidden">
          <div className="bg-secondary h-full transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
        </div>

        {error && <div className="p-3 mb-6 bg-error-container text-on-error-container rounded-xl text-xs font-bold">{error}</div>}

        {/* Step 1: Map picker trigger */}
        {step === 1 && (
          <div className="space-y-md">
            {selectedCompany ? (
              /* Selected company card */
              <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {selectedCompany.cover_image_url ? (
                      <img
                        src={selectedCompany.cover_image_url}
                        alt={selectedCompany.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-outline-variant shrink-0"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        selectedCompany.source === "db" ? "bg-emerald-100" : "bg-sky-100"
                      }`}>
                        <span className={`material-symbols-outlined text-[22px] ${
                          selectedCompany.source === "db" ? "text-emerald-600" : "text-on-surface-variant"
                        }`}>
                          {selectedCompany.source === "db" ? "domain" : "location_on"}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-primary text-base">{selectedCompany.name}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{selectedCompany.address}</div>
                    </div>
                  </div>
                  {!isCompanyLocked ? (
                    <button
                      type="button"
                      onClick={() => setMapOpen(true)}
                      className="text-xs text-secondary font-bold hover:underline cursor-pointer shrink-0 ml-2"
                    >
                      เปลี่ยน
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-secondary font-bold bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full shrink-0 ml-2">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      ล็อกสถานประกอบการ
                    </span>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  {selectedCompany.phone && (
                    <span className="text-[11px] text-on-surface-variant inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-secondary">call</span>
                      {selectedCompany.phone}
                    </span>
                  )}
                  {selectedCompany.website && (
                    <span className="text-[11px] text-secondary truncate inline-flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[14px]">language</span>
                      {selectedCompany.website}
                    </span>
                  )}
                  {selectedCompany.source === "db" && selectedCompany.review_count !== undefined && (
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      ✓ ในระบบ · {selectedCompany.review_count} รีวิว
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* Open map button */
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="w-full flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-outline-variant rounded-2xl hover:border-secondary hover:bg-secondary/5 transition-all group cursor-pointer"
              >
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant group-hover:text-secondary transition-colors">map</span>
                <div className="text-center">
                  <div className="font-bold text-primary group-hover:text-secondary transition-colors">คลิกเพื่อเลือกสถานประกอบการ</div>
                  <div className="text-xs text-on-surface-variant mt-1">ค้นหาชื่อ หรือปักหมุดบนแผนที่</div>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Fullscreen Map Modal */}
        {mapOpen && (
          <CompanySearchBar
            onSelect={(comp) => {
              if (comp) {
                setSelectedCompany(comp);
                setCompanyId(comp.id || -1);
                setError("");
                setMapOpen(false);
              }
            }}
            onClose={() => setMapOpen(false)}
          />
        )}

        {/* Step 2: Student Details & Info */}
        {step === 2 && (
          <div className="space-y-md">
            <div>
              <label className="block font-label-md text-label-md font-bold text-primary mb-xs">แผนกวิชาที่ฝึกงาน</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm font-bold text-primary"
              >
                {ALL_DEPARTMENTS.filter((d) => d.value !== "").map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-label-md text-label-md font-bold text-primary mb-xs">เพศของผู้รีวิว*</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm font-semibold">
                <option value="male">ชาย</option>
                <option value="female">หญิง</option>
                <option value="prefer_not">ไม่ระบุ / ไม่ต้องการเปิดเผย</option>
              </select>
            </div>

            <div>
              <label className="block font-label-md text-label-md font-bold text-primary mb-xs">เบี้ยเลี้ยงรายวัน (บาท/วัน)</label>
              <input type="number" placeholder="เช่น 300 (ใส่ 0 หรือเว้นว่างได้ถ้าไม่มีเบี้ยเลี้ยง)" value={dailyAllowance} onChange={(e) => setDailyAllowance(e.target.value)} className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm font-bold text-primary" />
            </div>

            {/* Work Hours Inputs */}
            <div className="grid grid-cols-2 gap-md pt-sm border-t border-outline-variant/60">
              <div>
                <label className="block font-label-md text-label-md font-bold text-primary mb-xs">เวลาเข้างาน</label>
                <input
                  type="text"
                  placeholder="เช่น 08:00"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                  className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm font-bold text-primary focus:ring-2 focus:ring-secondary"
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md font-bold text-primary mb-xs">เวลาเลิกงาน</label>
                <input
                  type="text"
                  placeholder="เช่น 17:00"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                  className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm font-bold text-primary focus:ring-2 focus:ring-secondary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Structured Ratings */}
        {step === 3 && (
          <div className="space-y-md">
            <h3 className="font-headline-sm text-headline-sm font-bold text-primary">ให้คะแนนความพึงพอใจด้านต่างๆ</h3>
            {[
              { label: "คะแนนรวมความพึงพอใจการฝึกงาน", val: scoreOverall, set: setScoreOverall },
              { label: "ความเหมาะสมของงานที่ได้รับมอบหมาย", val: scoreWork, set: setScoreWork },
              { label: "บรรยากาศและสิ่งแวดล้อมที่ทำงาน", val: scoreEnv, set: setScoreEnv },
              { label: "พี่เลี้ยง/ผู้ดูแลดูแลดีสอนงานดี", val: scoreMentor, set: setScoreMentor },
              { label: "สวัสดิการและค่าตอบแทนต่างๆ", val: scoreWelfare, set: setScoreWelfare },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-surface-container-low p-md rounded-2xl border border-outline-variant/60">
                <span className="font-label-md text-label-md font-bold text-primary">{item.label}</span>
                <div className="flex gap-xs">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => item.set(star)}
                      className={`material-symbols-outlined text-[26px] hover:scale-115 transition-transform cursor-pointer ${star <= item.val ? "text-secondary active-tab" : "text-outline-variant"}`}
                    >
                      star
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Text Review */}
        {step === 4 && (
          <div className="space-y-md">
            <div>
              <div className="flex justify-between items-center mb-xs">
                <label className="block font-label-md text-label-md font-bold text-primary">ลักษณะงานที่ปฏิบัติจริง*</label>
                <span className={`text-xs font-bold ${textWork.length >= 50 && textWork.length <= 1000 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  (ปัจจุบันมี {textWork.length}/1000 ตัวอักษร)
                </span>
              </div>
              <textarea
                rows={5}
                maxLength={1000}
                placeholder="เขียนรายละเอียดวงกว้าง เช่น ลักษณะแผนก หน้าที่งานหลัก และการดูแลของทีมงาน..."
                value={textWork}
                onChange={(e) => setTextWork(e.target.value)}
                className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-xs">
                <label className="block font-label-md text-label-md font-bold text-primary">ข้อดี / สิ่งที่ประทับใจ</label>
                <span className="text-[10px] text-on-surface-variant font-medium">({textPros.length}/500)</span>
              </div>
              <input
                type="text"
                maxLength={500}
                placeholder="เช่น พี่สอนงานละเอียด, เพื่อนร่วมงานเป็นกันเอง..."
                value={textPros}
                onChange={(e) => setTextPros(e.target.value)}
                className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-xs">
                <label className="block font-label-md text-label-md font-bold text-primary">ข้อจำกัด / สิ่งที่ควรปรับปรุง</label>
                <span className="text-[10px] text-on-surface-variant font-medium">({textCons.length}/500)</span>
              </div>
              <input
                type="text"
                maxLength={500}
                placeholder="เช่น ไม่มีรถสาธารณะผ่าน, งานค่อนข้างกดดัน..."
                value={textCons}
                onChange={(e) => setTextCons(e.target.value)}
                className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-xs">
                <label className="block font-label-md text-label-md font-bold text-primary">คำแนะนำเพิ่มเติมถึงรุ่นน้อง</label>
                <span className="text-[10px] text-on-surface-variant font-medium">({textAdvice.length}/500)</span>
              </div>
              <input
                type="text"
                maxLength={500}
                placeholder="เช่น ควรเตรียมทบทวนทักษะ PLC และความรู้ช่างมาก่อน..."
                value={textAdvice}
                onChange={(e) => setTextAdvice(e.target.value)}
                className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm"
              />
            </div>
          </div>
        )}

        {/* Step 5: Summary & Privacy Settings */}
        {step === 5 && (
          <div className="space-y-md">
            <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-md space-y-sm">
              <h4 className="font-bold text-primary text-sm">ทบทวนข้อมูลความถูกต้องก่อนส่ง:</h4>
              <div className="text-xs space-y-1 text-on-surface-variant">
                <p>• <strong>สถานประกอบการ:</strong> {selectedCompany?.name || "ไม่ระบุ"}</p>
                <p>• <strong>แผนกวิชา:</strong> {department}</p>
                <p>• <strong>เบี้ยเลี้ยง:</strong> {dailyAllowance ? `${dailyAllowance} บาท/วัน` : "ไม่มี"}</p>
                <p>• <strong>เวลาปฏิบัติงาน:</strong> {workStartTime} - {workEndTime} น.</p>
                <p>• <strong>คะแนนรวม:</strong> {scoreOverall}/5 ดาว</p>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-md shadow-sm">
              <label className="flex items-center gap-md cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-5 h-5 text-secondary rounded focus:ring-secondary cursor-pointer"
                />
                <div>
                  <div className="font-bold font-label-md text-label-md text-primary">เปิดโหมดไม่ระบุตัวตน (โหมดปิดบังชื่อ)</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">ชื่อของคุณจะแสดงเป็น "นักศึกษา HTC (ไม่ระบุตัวตน)" เพื่อความเป็นส่วนตัวสูงสุด</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-lg pt-md border-t border-outline-variant">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-lg py-3 font-label-md text-label-md font-bold text-on-surface-variant border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors">
              ย้อนกลับ
            </button>
          ) : <div />}

          {step < 5 ? (
            <button onClick={handleNextStep} className="px-lg py-3 bg-primary text-on-primary font-label-md text-label-md font-bold rounded-xl hover:bg-primary-container transition-colors shadow-md cursor-pointer">
              ถัดไป →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-xl py-3.5 bg-secondary text-on-secondary font-label-md text-label-md font-bold rounded-xl hover:bg-opacity-90 transition-opacity shadow-lg"
            >
              {loading ? "กำลังส่ง..." : "ส่งรีวิวเพื่อรออนุมัติ"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
