"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken, isStudent, getUser, clearToken } from "@/lib/auth";
import DepartmentDropdown, { ALL_DEPARTMENTS } from "@/components/DepartmentDropdown";
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

  const [existingReview, setExistingReview] = useState<any | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [authorized, setAuthorized] = useState(() => {
    if (typeof window !== "undefined") {
      return Boolean(getToken() && isStudent());
    }
    return false;
  });

  // Photos state (Max 2 photos)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError("");
    if (!e.target.files) return;
    const incomingFiles = Array.from(e.target.files);
    
    // Check total count
    const totalCurrent = selectedFiles.length + existingPhotos.length;
    if (totalCurrent + incomingFiles.length > 2) {
      setPhotoError("สามารถแนบรูปภาพได้สูงสุดไม่เกิน 2 รูปเท่านั้น");
      return;
    }

    const validNewFiles: File[] = [];
    const validNewPreviews: string[] = [];

    for (const file of incomingFiles) {
      if (!file.type.startsWith("image/")) {
        setPhotoError(`ไฟล์ ${file.name} ไม่ใช่ไฟล์รูปภาพ`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError(`ไฟล์ ${file.name} มีขนาดเกิน 5MB (จำกัดไม่เกิน 5MB ต่อรูป)`);
        return;
      }
      validNewFiles.push(file);
      validNewPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles((prev) => [...prev, ...validNewFiles]);
    setFilePreviews((prev) => [...prev, ...validNewPreviews]);
    e.target.value = "";
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      // revoke URL to free memory
      try {
        URL.revokeObjectURL(prev[index]);
      } catch {}
      return prev.filter((_, i) => i !== index);
    });
    setPhotoError("");
  };

  const handleRemoveExistingPhoto = (index: number) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoError("");
  };

  useEffect(() => {
    if (!getToken()) {
      router.push("/auth/login");
      return;
    }
    if (!isStudent()) {
      router.replace("/insights");
      return;
    }
    setAuthorized(true);
    
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

    const fetchCompanyData = (cid: number) => {
      setIsCompanyLocked(true);
      setCompanyId(cid);
      api.get(`/companies/${cid}`).then((cRes) => {
        if (cRes.data) {
          const comp = cRes.data;
          setSelectedCompany({
            id: comp.id,
            name: comp.name,
            address: comp.address || "",
            phone: comp.phone || "",
            website: comp.website || "",
            lat: comp.lat || 7.0084,
            lng: comp.lng || 100.4767,
            source: "db",
            cover_image_url: comp.cover_image_url,
            review_count: comp.review_count,
            avg_score: comp.avg_score,
          });
        }
      }).catch(() => {});
    };

    if (reviewIdParam) {
      const revId = Number(reviewIdParam);
      setEditingReviewId(revId);
      setIsCompanyLocked(true);
      
      const applyReviewData = (match: any) => {
        if (!match) return;
        if (match.company_id) {
          fetchCompanyData(match.company_id);
        }
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
        if (match.period_start) setPeriodStart(match.period_start);
        if (match.period_end) setPeriodEnd(match.period_end);
        if (match.photo_urls && Array.isArray(match.photo_urls)) setExistingPhotos(match.photo_urls);
      };

      api.get("/reviews/my").then((res) => {
        const match = res.data?.find((r: any) => r.id === revId);
        if (match) {
          applyReviewData(match);
          setStep(2); // ข้ามหน้าเลือกแผนที่ทันทีในโหมดแก้ไข
        } else if (companyIdParam) {
          fetchCompanyData(Number(companyIdParam));
          api.get(`/companies/${companyIdParam}/reviews`).then((cRes) => {
            const cMatch = cRes.data?.find((r: any) => r.id === revId);
            if (cMatch) {
              applyReviewData(cMatch);
              setStep(2); // ข้ามหน้าเลือกแผนที่ทันทีในโหมดแก้ไข
            }
          }).catch(() => {});
        }
      }).catch(() => {}).finally(() => setCheckingExisting(false));
    } else {
      // Check if user already submitted a review
      api.get("/reviews/my").then((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setExistingReview(res.data[0]);
        }
      }).catch(() => {}).finally(() => setCheckingExisting(false));
    }

    if (companyIdParam) {
      setIsCompanyLocked(true);
      fetchCompanyData(Number(companyIdParam));
    }

    api.get("/companies?all=true").then((res) => {
      setCompanies(res.data || []);
    }).catch(() => {});
  }, []);

  const handleStartEditExisting = (rev: any) => {
    if (!rev) return;
    setEditingReviewId(rev.id);
    if (rev.company_id) {
      setIsCompanyLocked(true);
      setCompanyId(rev.company_id);
      api.get(`/companies/${rev.company_id}`).then((cRes) => {
        if (cRes.data) {
          const comp = cRes.data;
          setSelectedCompany({
            id: comp.id,
            name: comp.name,
            address: comp.address || "",
            phone: comp.phone || "",
            website: comp.website || "",
            lat: comp.lat || 7.0084,
            lng: comp.lng || 100.4767,
            source: "db",
            cover_image_url: comp.cover_image_url,
            review_count: comp.review_count,
            avg_score: comp.avg_score,
          });
        }
      }).catch(() => {});
    }
    if (rev.gender) setGender(rev.gender);
    if (rev.department) setDepartment(rev.department);
    if (rev.daily_allowance !== null && rev.daily_allowance !== undefined) setDailyAllowance(String(rev.daily_allowance));
    if (rev.work_start_time) setWorkStartTime(rev.work_start_time);
    if (rev.work_end_time) setWorkEndTime(rev.work_end_time);
    if (rev.score_overall !== undefined && rev.score_overall !== null) setScoreOverall(rev.score_overall);
    if (rev.score_work !== undefined && rev.score_work !== null) setScoreWork(rev.score_work);
    if (rev.score_env !== undefined && rev.score_env !== null) setScoreEnv(rev.score_env);
    if (rev.score_mentor !== undefined && rev.score_mentor !== null) setScoreMentor(rev.score_mentor);
    if (rev.score_welfare !== undefined && rev.score_welfare !== null) setScoreWelfare(rev.score_welfare);
    if (rev.text_work) setTextWork(rev.text_work);
    if (rev.text_pros) setTextPros(rev.text_pros);
    if (rev.text_cons) setTextCons(rev.text_cons);
    if (rev.text_advice) setTextAdvice(rev.text_advice);
    if (rev.period_start) setPeriodStart(rev.period_start);
    if (rev.period_end) setPeriodEnd(rev.period_end);
    if (rev.photo_urls && Array.isArray(rev.photo_urls)) setExistingPhotos(rev.photo_urls);

    try {
      window.history.pushState({}, "", `/insights/write-review?company_id=${rev.company_id}&review_id=${rev.id}`);
    } catch {}
    setStep(2); // ข้ามหน้าเลือกแผนที่ทันทีในโหมดแก้ไข
  };

  const validateStep = (s: number): string | null => {
    if (s === 1 && !companyId && !selectedCompany) {
      return "กรุณาค้นหาและเลือกสถานประกอบการก่อนดำเนินการต่อ";
    }
    if (s === 2) {
      if (dailyAllowance !== "") {
        const allowanceNum = parseInt(dailyAllowance);
        if (isNaN(allowanceNum) || allowanceNum < 0 || allowanceNum > 99999) {
          return "เบี้ยเลี้ยงรายวันต้องอยู่ระหว่าง 0 - 99,999 บาท/วัน";
        }
      }
      if (periodStart && periodEnd && periodStart > periodEnd) {
        return "วันที่เริ่มต้นฝึกงานต้องไม่เกินวันที่สิ้นสุดฝึกงาน";
      }
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (workStartTime && !timeRegex.test(workStartTime)) {
        return "เวลาเข้างานต้องอยู่ในรูปแบบ HH:MM (เช่น 08:30)";
      }
      if (workEndTime && !timeRegex.test(workEndTime)) {
        return "เวลาเลิกงานต้องอยู่ในรูปแบบ HH:MM (เช่น 17:00)";
      }
    }
    if (s === 4) {
      if (textWork.trim().length < 30) {
        return `รายละเอียดงานต้องมีความยาวอย่างน้อย 30 ตัวอักษร (ปัจจุบันมี ${textWork.trim().length} ตัวอักษร)`;
      }
      if (textWork.length > 1000) {
        return "รายละเอียดงานต้องไม่เกิน 1,000 ตัวอักษร";
      }
      if (!textPros.trim()) {
        return "กรุณาระบุข้อดี / จุดเด่นของสถานที่ฝึกงาน";
      }
      if (textPros.length > 500) return "ข้อดีต้องไม่เกิน 500 ตัวอักษร";
      if (!textCons.trim()) {
        return "กรุณาระบุข้อควรปรับปรุงของสถานที่ฝึกงาน";
      }
      if (textCons.length > 500) return "ข้อเสียต้องไม่เกิน 500 ตัวอักษร";
      if (textAdvice.length > 500) return "คำแนะนำต้องไม่เกิน 500 ตัวอักษร";
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
        score_overall: Number(((scoreWork + scoreEnv + scoreMentor + scoreWelfare) / 4).toFixed(1)),
        score_work: scoreWork,
        score_env: scoreEnv,
        score_mentor: scoreMentor,
        score_welfare: scoreWelfare,
        text_work: textWork,
        text_pros: textPros || null,
        text_cons: textCons || null,
        text_advice: textAdvice || null,
      };

      let reviewId = editingReviewId;
      if (editingReviewId) {
        await api.put(`/reviews/${editingReviewId}`, reviewData);
        // If user changed files or removed existing photos
        if (selectedFiles.length > 0) {
          // Clear old photos and upload newly selected ones
          await api.delete(`/reviews/${editingReviewId}/photos`).catch(() => {});
          const formData = new FormData();
          selectedFiles.forEach((file) => {
            formData.append("files", file);
          });
          await api.post(`/reviews/${editingReviewId}/photos`, formData);
        } else if (existingPhotos.length === 0) {
          // User cleared all existing photos
          await api.delete(`/reviews/${editingReviewId}/photos`).catch(() => {});
        }
      } else {
        const res = await api.post("/reviews", reviewData);
        reviewId = res.data.review_id;
        if (selectedFiles.length > 0 && reviewId) {
          const formData = new FormData();
          selectedFiles.forEach((file) => {
            formData.append("files", file);
          });
          await api.post(`/reviews/${reviewId}/photos`, formData);
        }
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

  if (!authorized) {
    return (
      <div className="max-w-3xl mx-auto px-margin-mobile pt-16 pb-24 text-center">
        <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-on-surface-variant">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
      </div>
    );
  }

  if (checkingExisting) {
    return (
      <div className="max-w-md mx-auto px-margin-mobile py-20 text-center space-y-3 bg-white border border-outline-variant/60 rounded-3xl shadow-sm mt-12">
        <div className="w-10 h-10 border-3 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold text-primary font-headline">กำลังโหลดข้อมูลรีวิวของคุณ...</p>
        <p className="text-xs text-on-surface-variant">กรุณารอสักครู่ ระบบกำลังจัดเตรียมข้อมูลเดิม</p>
      </div>
    );
  }

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

  if (existingReview && !editingReviewId) {
    return (
      <div className="max-w-md mx-auto px-margin-mobile py-16 text-center space-y-md bg-white border border-outline-variant rounded-3xl shadow-xl mt-12">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-[44px]">info</span>
        </div>
        <h2 className="text-2xl font-bold text-primary font-headline">คุณมีรีวิวในระบบแล้ว</h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto">
          ระบบจำกัดให้ 1 ผู้ใช้งานสามารถส่งรีวิวสถานประกอบการได้เพียง 1 ที่ (1 รีวิว) เท่านั้น หากต้องการปรับปรุงข้อมูล ท่านสามารถแก้ไขรีวิวเดิมของคุณได้
        </p>
        <div className="flex flex-col gap-sm pt-md">
          <button
            onClick={() => handleStartEditExisting(existingReview)}
            className="w-full bg-secondary text-on-secondary py-3 rounded-xl font-label-md text-label-md font-bold shadow-md hover:scale-105 transition-transform cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            แก้ไขรีวิวเดิมของคุณ
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-xl font-label-md text-label-md font-bold hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
            ไปหน้าจัดการบัญชี / ดูรีวิวของฉัน
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-margin-mobile pt-8 pb-24 md:pb-12">
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
            ? "ขั้นตอนที่ " + step + " จาก 6 — แก้ไขรีวิว (การบันทึกจะส่งให้ผู้ดูแลระบบตรวจสอบใหม่)"
            : "ขั้นตอนที่ " + step + " จาก 6 — ประสบการณ์ฝึกงานของคุณบน HTC Insights มีคุณค่าอย่างยิ่งสำหรับรุ่นน้อง"}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-surface-container-high h-2.5 rounded-full mb-8 overflow-hidden">
          <div className="bg-secondary h-full transition-all duration-300" style={{ width: `${(step / 6) * 100}%` }} />
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
                  {!isCompanyLocked && !editingReviewId ? (
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
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      ในระบบ · {selectedCompany.review_count} รีวิว
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
              <DepartmentDropdown value={department} onChange={setDepartment} />
            </div>

            <div>
              <label className="block font-label-md text-label-md font-bold text-primary mb-xs">
                เพศสภาพของผู้รีวิว*
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    gender === "male"
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-surface-container-low border-outline-variant/50 text-on-surface-variant hover:border-primary/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">male</span>
                  ชาย
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    gender === "female"
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-surface-container-low border-outline-variant/50 text-on-surface-variant hover:border-primary/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">female</span>
                  หญิง
                </button>
                <button
                  type="button"
                  onClick={() => setGender("prefer_not")}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    gender === "prefer_not"
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-surface-container-low border-outline-variant/50 text-on-surface-variant hover:border-primary/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  อื่นๆ
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-xs">
                <label className="block font-label-md text-label-md font-bold text-primary">เบี้ยเลี้ยงรายวัน (บาท/วัน)</label>
                <span className="text-[11px] text-on-surface-variant">จำกัด 0 - 99,999 บาท</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="เช่น 300 (ใส่ 0 หรือเว้นว่างได้ถ้าไม่มีเบี้ยเลี้ยง)"
                value={dailyAllowance}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val === "" || (Number(val) >= 0 && Number(val) <= 99999)) {
                    setDailyAllowance(val);
                  }
                }}
                className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm font-bold text-primary"
              />
            </div>

            {/* Work Hours Inputs */}
            <div className="grid grid-cols-2 gap-md pt-sm border-t border-outline-variant/60">
              <div>
                <label className="block font-label-md text-label-md font-bold text-primary mb-xs">เวลาเข้างาน</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={workStartTime}
                  placeholder="เช่น 08:30"
                  maxLength={5}
                  pattern="([01]\d|2[0-3]):[0-5]\d"
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9:]/g, "");
                    if (val.length === 2 && !val.includes(":") && workStartTime.length < 2) val = val + ":";
                    if (val.length <= 5) setWorkStartTime(val);
                  }}
                  className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm font-bold text-primary focus:ring-2 focus:ring-secondary"
                />
                <p className="text-[10px] text-on-surface-variant mt-1">รูปแบบ 24 ชั่วโมง เช่น 08:00 หรือ 13:30</p>
              </div>
              <div>
                <label className="block font-label-md text-label-md font-bold text-primary mb-xs">เวลาเลิกงาน</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={workEndTime}
                  placeholder="เช่น 17:00"
                  maxLength={5}
                  pattern="([01]\d|2[0-3]):[0-5]\d"
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9:]/g, "");
                    if (val.length === 2 && !val.includes(":") && workEndTime.length < 2) val = val + ":";
                    if (val.length <= 5) setWorkEndTime(val);
                  }}
                  className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm font-bold text-primary focus:ring-2 focus:ring-secondary"
                />
                <p className="text-[10px] text-on-surface-variant mt-1">รูปแบบ 24 ชั่วโมง เช่น 17:00 หรือ 18:30</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Structured Ratings */}
        {step === 3 && (
          <div className="space-y-md">
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-primary">ให้คะแนนความพึงพอใจด้านต่างๆ</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                ประเมินคะแนนทั้ง 4 ด้านย่อย ระบบจะคำนวณคะแนนภาพรวมเฉลี่ยให้อัตโนมัติ
              </p>
            </div>


            <div className="space-y-2.5">
              {[
                { label: "1. ความเหมาะสมของงานที่ได้รับมอบหมาย", val: scoreWork, set: setScoreWork },
                { label: "2. บรรยากาศและสิ่งแวดล้อมที่ทำงาน", val: scoreEnv, set: setScoreEnv },
                { label: "3. พี่เลี้ยง/ผู้ดูแลดูแลดีสอนงานดี", val: scoreMentor, set: setScoreMentor },
                { label: "4. สวัสดิการและค่าตอบแทนต่างๆ", val: scoreWelfare, set: setScoreWelfare },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-container-low p-3.5 sm:p-4 rounded-2xl border border-outline-variant/60">
                  <span className="font-label-md text-label-md font-bold text-primary">{item.label}</span>
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => item.set(star)}
                        className={`material-symbols-outlined text-[28px] hover:scale-115 transition-transform cursor-pointer ${star <= item.val ? "text-secondary active-tab" : "text-outline-variant"}`}
                      >
                        star
                      </button>
                    ))}
                    <span className="text-xs font-bold text-on-surface-variant ml-2 min-w-[36px] text-right font-mono">
                      {item.val}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Text Review */}
        {step === 4 && (
          <div className="space-y-md">
            <div>
              <div className="flex justify-between items-center mb-xs">
                <label className="block font-label-md text-label-md font-bold text-primary">ลักษณะงานที่ปฏิบัติจริง* (30-1,000 ตัวอักษร)</label>
                <span className={`text-xs font-bold ${textWork.trim().length >= 30 && textWork.length <= 1000 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ({textWork.length}/1000 ตัวอักษร {textWork.trim().length < 30 ? `(ขาดอีก ${30 - textWork.trim().length})` : ''})
                </span>
              </div>
              <textarea
                rows={5}
                minLength={30}
                maxLength={1000}
                placeholder="เขียนรายละเอียดวงกว้าง เช่น ลักษณะแผนก หน้าที่งานหลัก และการดูแลของทีมงาน..."
                value={textWork}
                onChange={(e) => setTextWork(e.target.value)}
                className="w-full p-3 bg-white border border-outline-variant rounded-xl text-body-sm font-body-sm focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-xs">
                <label className="block font-label-md text-label-md font-bold text-primary">ข้อดี / สิ่งที่ประทับใจ*</label>
                <span className={`text-[10px] font-bold ${textPros.trim() ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ({textPros.length}/500 {textPros.trim() ? '' : '(จำเป็นต้องกรอก)'})
                </span>
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
                <label className="block font-label-md text-label-md font-bold text-primary">ข้อจำกัด / สิ่งที่ควรปรับปรุง*</label>
                <span className={`text-[10px] font-bold ${textCons.trim() ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ({textCons.length}/500 {textCons.trim() ? '' : '(จำเป็นต้องกรอก)'})
                </span>
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

        {/* Step 5: Dedicated Photo Upload Section */}
        {step === 5 && (
          <div className="space-y-md">
            <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[24px]">add_photo_alternate</span>
                    <h3 className="font-bold text-primary text-base">แนบรูปภาพประกอบรีวิว (ไม่บังคับ)</h3>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    แนบภาพถ่ายบรรยากาศสถานที่ฝึกงาน โต๊ะทำงาน เครื่องมือ หรือผลงานจริงที่ได้รับอนุญาต เพื่อให้รุ่นน้องเห็นภาพการทำงานชัดเจนยิ่งขึ้น
                  </p>
                </div>
                <span className="text-xs font-bold text-secondary bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full shrink-0 ml-2">
                  {selectedFiles.length + existingPhotos.length} / 2 รูป
                </span>
              </div>

              {photoError && (
                <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {photoError}
                </div>
              )}

              {/* Upload Dropzone / Button */}
              {selectedFiles.length + existingPhotos.length < 2 && (
                <label className="border-2 border-dashed border-outline-variant hover:border-secondary hover:bg-secondary/5 transition-all rounded-2xl py-8 px-5 flex flex-col items-center justify-center gap-3 cursor-pointer group text-center block mt-2 bg-white">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-secondary/10 group-hover:bg-secondary/20 flex items-center justify-center text-secondary transition-colors shadow-xs">
                    <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-primary group-hover:text-secondary transition-colors">
                      คลิกเพื่อเลือกรูปภาพจากอุปกรณ์ หรือลากไฟล์มาวางที่นี่
                    </div>
                    <div className="text-xs text-on-surface-variant mt-1">
                      รองรับไฟล์ JPG, PNG, WEBP (จำกัดคนละไม่เกิน 2 รูป, ขนาดไม่เกิน 5MB ต่อรูป)
                    </div>
                  </div>
                </label>
              )}

              {/* Preview Cards Grid - Responsive and overflow protected */}
              {(existingPhotos.length > 0 || filePreviews.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Existing Photos */}
                  {existingPhotos.map((url, idx) => (
                    <div
                      key={`existing-${idx}`}
                      className="bg-white border border-outline-variant/60 rounded-2xl overflow-hidden p-3 flex flex-col gap-2 shadow-xs group"
                    >
                      <div className="w-full h-44 rounded-xl overflow-hidden bg-black/5 relative">
                        <img
                          src={url}
                          alt={`Existing photo ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                          รูปเดิมในระบบ #{idx + 1}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-1 pt-1">
                        <span className="text-xs font-bold text-on-surface-variant truncate">รูปภาพเดิม</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingPhoto(idx)}
                          className="text-xs text-error font-bold flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          ลบรูปนี้
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Newly Selected Files */}
                  {filePreviews.map((previewUrl, idx) => {
                    const file = selectedFiles[idx];
                    const sizeStr = file ? (file.size / (1024 * 1024)).toFixed(1) + " MB" : "";
                    return (
                      <div
                        key={`new-${idx}`}
                        className="bg-white border border-outline-variant/60 rounded-2xl overflow-hidden p-3 flex flex-col gap-2 shadow-xs group"
                      >
                        <div className="w-full h-44 rounded-xl overflow-hidden bg-black/5 relative">
                          <img
                            src={previewUrl}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <span className="absolute top-2.5 left-2.5 bg-secondary text-on-secondary text-[11px] font-bold px-2.5 py-1 rounded-md shadow-sm">
                            รูปที่เลือก #{idx + 1}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-1 pt-1">
                          <span className="text-xs font-bold text-primary truncate max-w-[160px]">
                            {file?.name || `รูปที่ ${idx + 1}`} {sizeStr ? `(${sizeStr})` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedFile(idx)}
                            className="text-xs text-error font-bold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            นำออก
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 pt-2">
                <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
                หากไม่มีรูปภาพ สามารถกดปุ่ม <strong>"ถัดไป →"</strong> ด้านล่างเพื่อข้ามไปยังขั้นตอนสรุปได้ทันที
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Summary & Privacy Settings */}
        {step === 6 && (
          <div className="space-y-md">
            <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-md space-y-sm">
              <h4 className="font-bold text-primary text-sm">ทบทวนข้อมูลความถูกต้องก่อนส่ง:</h4>
              <div className="text-xs space-y-1.5 text-on-surface-variant">
                <p>• <strong>สถานประกอบการ:</strong> {selectedCompany?.name || "ไม่ระบุ"}</p>
                <p>• <strong>แผนกวิชา:</strong> {department}</p>
                <p>• <strong>เบี้ยเลี้ยง:</strong> {dailyAllowance ? `${dailyAllowance} บาท/วัน` : "ไม่มี"}</p>
                <p>• <strong>เวลาปฏิบัติงาน:</strong> {workStartTime} - {workEndTime} น.</p>
                <p>• <strong>คะแนนภาพรวม (เฉลี่ยอัตโนมัติ):</strong> {Number(((scoreWork + scoreEnv + scoreMentor + scoreWelfare) / 4).toFixed(1))} / 5.0 ดาว (งาน: {scoreWork}, บรรยากาศ: {scoreEnv}, พี่เลี้ยง: {scoreMentor}, สวัสดิการ: {scoreWelfare})</p>
                <p>• <strong>รูปภาพแนบ:</strong> {existingPhotos.length + selectedFiles.length > 0 ? `${existingPhotos.length + selectedFiles.length} รูป` : "ไม่มีรูปภาพแนบ"}</p>
                {(existingPhotos.length > 0 || filePreviews.length > 0) && (
                  <div className="flex gap-2 pt-2 flex-wrap">
                    {existingPhotos.map((url, idx) => (
                      <img key={`sum-ex-${idx}`} src={url} alt="Review attachment" className="w-16 h-16 rounded-xl object-cover border border-outline-variant shrink-0" />
                    ))}
                    {filePreviews.map((url, idx) => (
                      <img key={`sum-new-${idx}`} src={url} alt="Review attachment" className="w-16 h-16 rounded-xl object-cover border border-outline-variant shrink-0" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-lg pt-md border-t border-outline-variant">
          {/* ในโหมดแก้ไข: ซ่อนปุ่มย้อนกลับที่ step 2 เพราะ step 1 คือหน้าแผนที่ที่ไม่ต้องการ */}
          {step > 1 && !(editingReviewId && step === 2) ? (
            <button onClick={() => setStep(step - 1)} className="px-lg py-3 font-label-md text-label-md font-bold text-on-surface-variant border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer">
              ย้อนกลับ
            </button>
          ) : <div />}

          {step < 6 ? (
            <button onClick={handleNextStep} className="px-lg py-3 bg-primary text-on-primary font-label-md text-label-md font-bold rounded-xl hover:bg-primary-container transition-colors shadow-md cursor-pointer">
              ถัดไป →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-xl py-3.5 bg-secondary text-on-secondary font-label-md text-label-md font-bold rounded-xl hover:bg-opacity-90 transition-opacity shadow-lg cursor-pointer"
            >
              {loading ? "กำลังส่ง..." : editingReviewId ? "บันทึกการแก้ไข" : "ส่งรีวิวเพื่อรออนุมัติ"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
