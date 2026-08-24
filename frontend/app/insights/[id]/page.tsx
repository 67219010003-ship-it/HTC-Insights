"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

import ConfirmModal from "@/components/ConfirmModal";
import Toast from "@/components/Toast";
import ReportModal from "@/components/ReportModal";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id;
  const [company, setCompany] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [myReviewIds, setMyReviewIds] = useState<Set<number>>(new Set());

  // Report Modal State
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    targetId: number;
  }>({
    isOpen: false,
    targetId: 0,
  });

  // Modal & Toast States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "danger" | "warning" | "info";
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "ยืนยัน",
    onConfirm: () => {},
  });

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    message: "",
    type: "success",
  });

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setToast({
        isOpen: true,
        message: "คัดลอกลิงก์สำเร็จแล้ว!",
        type: "success",
      });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const refetchCompanyData = useCallback(() => {
    if (!companyId) return;
    api.get(`/companies/${companyId}`).then((res) => setCompany(res.data)).catch(() => {});
    api.get(`/companies/${companyId}/reviews`).then((res) => setReviews(res.data)).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    // Check if external user
    const token = typeof window !== "undefined" ? localStorage.getItem("htc_token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("htc_role") : null;
    const userStr = typeof window !== "undefined" ? localStorage.getItem("htc_user") : null;
    let userEmail = "";
    try {
      if (userStr) userEmail = JSON.parse(userStr)?.email || "";
    } catch {}

    const isInternal = role === "admin" || (role === "student" && (!userEmail || userEmail.endsWith("@htc.ac.th")));
    if (!token || (!isInternal && role === "external")) {
      router.replace("/");
      return;
    }

    if (!companyId) return;
    api.get(`/companies/${companyId}`).then((res) => setCompany(res.data)).catch(() => {});
    api.get(`/companies/${companyId}/reviews`).then((res) => setReviews(res.data)).catch(() => {});
    api.get("/auth/me").then((res) => setCurrentUser(res.data)).catch(() => {});
    api.get("/reviews/my").then((res) => {
      if (Array.isArray(res.data)) {
        setMyReviewIds(new Set(res.data.map((r: any) => r.id)));
      }
    }).catch(() => {});
  }, [companyId, router]);

  const promptDeleteReview = (reviewId: number) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการลบรีวิว",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้ออกจากระบบ? ข้อมูลประสบการณ์จะถูกลบถาวร",
      type: "danger",
      confirmText: "ยืนยันลบรีวิว",
      onConfirm: () => executeDeleteReview(reviewId),
    });
  };

  const executeDeleteReview = async (reviewId: number) => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    setDeletingId(reviewId);
    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      // Refetch company to get updated avg_score after deletion
      refetchCompanyData();
      setToast({
        isOpen: true,
        message: "ลบรีวิวเรียบร้อยแล้ว",
        type: "success",
      });
    } catch (err: any) {
      setToast({
        isOpen: true,
        message: err.response?.data?.detail || "เกิดข้อผิดพลาดในการลบรีวิว",
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const promptEditReview = (review: any) => {
    setConfirmModal({
      isOpen: true,
      title: "ยืนยันการแก้ไขรีวิว",
      message: "หากทำการแก้ไขรีวิว ข้อมูลจะถูกปรับสถานะเป็น 'รอการอนุมัติใหม่' จากผู้ดูแลระบบ (แอดมิน) ยืนยันที่จะดำเนินการหรือไม่?",
      type: "warning",
      confirmText: "ดำเนินการแก้ไข",
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        window.location.href = `/insights/write-review?company_id=${company.id}&review_id=${review.id}`;
      },
    });
  };

  // Aggregate stats from approved reviews
  const stats = useMemo(() => {
    if (reviews.length === 0) return null;
    let sumWork = 0, sumEnv = 0, sumMentor = 0, sumWelfare = 0;
    let countWork = 0, countEnv = 0, countMentor = 0, countWelfare = 0;
    let sumAllowance = 0, countAllowance = 0;

    reviews.forEach((r) => {
      if (r.score_work !== null && r.score_work !== undefined) {
        sumWork += r.score_work;
        countWork++;
      }
      if (r.score_env !== null && r.score_env !== undefined) {
        sumEnv += r.score_env;
        countEnv++;
      }
      if (r.score_mentor !== null && r.score_mentor !== undefined) {
        sumMentor += r.score_mentor;
        countMentor++;
      }
      if (r.score_welfare !== null && r.score_welfare !== undefined) {
        sumWelfare += r.score_welfare;
        countWelfare++;
      }
      if (r.daily_allowance) {
        sumAllowance += r.daily_allowance;
        countAllowance++;
      }
    });

    return {
      avgWork: countWork ? (sumWork / countWork).toFixed(1) : "N/A",
      avgEnv: countEnv ? (sumEnv / countEnv).toFixed(1) : "N/A",
      avgMentor: countMentor ? (sumMentor / countMentor).toFixed(1) : "N/A",
      avgWelfare: countWelfare ? (sumWelfare / countWelfare).toFixed(1) : "N/A",
      avgAllowance: countAllowance ? Math.round(sumAllowance / countAllowance) : null,
    };
  }, [reviews]);

  if (!company) {
    return <div className="p-8 text-center text-on-surface-variant font-bold">กำลังโหลดข้อมูลสถานประกอบการ...</div>;
  }

  const defaultCover = "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="max-w-container-max mx-auto px-4 md:px-8 py-8 space-y-md">
      {/* Banner / Hero Card with Image as Full Background */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-outline-variant min-h-[340px] md:min-h-[380px] flex flex-col justify-end">
        {/* Background Image / NO PREVIEW Container */}
        {company.cover_image_url ? (
          <img
            src={company.cover_image_url}
            alt={company.name}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        ) : (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-500 z-0">
            <span className="material-symbols-outlined text-[64px] opacity-30">hide_image</span>
            <span className="text-xs font-bold tracking-widest bg-slate-800 text-slate-400 px-4 py-1.5 rounded-full border border-slate-700 uppercase mt-2">NO PREVIEW / ไม่มีรูปภาพสถานประกอบการ</span>
          </div>
        )}

        {/* Dark Gradient Overlay over image */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-slate-950/20 z-10" />

        {/* Overlay Content Box directly over the background image */}
        <div className="relative z-20 p-6 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-md text-white">
          <div className="space-y-xs max-w-2xl">
            <div className="flex items-center gap-sm flex-wrap">
              <h1 className="text-2xl md:text-4xl font-bold font-headline text-white drop-shadow-md">
                {company.name}
              </h1>
              {company.is_verified && (
                <span
                  className="material-symbols-outlined text-secondary active-tab text-2xl md:text-3xl drop-shadow-md"
                  title="พาร์ทเนอร์วิทยาลัย"
                >
                  verified
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-slate-200 font-medium flex items-center gap-xs mt-xs drop-shadow-sm">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                location_on
              </span>
              {company.address || "อำเภอหาดใหญ่ จังหวัดสงขลา"}
            </p>
            <div className="pt-xs">
              <span className="inline-block bg-white/20 backdrop-blur-md text-white px-3.5 py-1 rounded-full text-xs font-bold border border-white/30 drop-shadow-sm">
                {company.industry || "อุตสาหกรรม/บริการ"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-sm shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 px-4 rounded-2xl shadow-lg text-center text-white">
              <div className="text-xl md:text-2xl font-bold text-secondary flex items-center justify-center gap-xs">
                <span className="material-symbols-outlined active-tab text-xl">star</span>
                {company.avg_score ? company.avg_score.toFixed(1) : "N/A"}
              </div>
              <div className="text-[10px] text-slate-200 font-medium mt-0.5">
                {company.review_count || reviews.length} รีวิวจากนักศึกษา
              </div>
            </div>

            <div>
              <Link
                href={`/insights/write-review?company_id=${company.id}`}
                className="bg-secondary text-on-secondary text-xs font-bold px-4 py-3 rounded-xl hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-xs whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">rate_review</span>
                เขียนรีวิวบริษัทนี้
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Company Extended Metadata & Contact */}
      <div className="p-6 md:p-8 border border-outline-variant bg-surface-container-low rounded-2xl shadow-sm">
          <div className="space-y-sm text-xs text-on-surface-variant">
            <h4 className="font-bold text-primary text-xs flex items-center gap-xs mb-base">
              <span className="material-symbols-outlined text-[18px]">contact_phone</span> ช่องทางติดต่อ / ข้อมูลระบบ
            </h4>
            {company.phone && (
              <p className="flex items-center gap-xs">
                <strong>เบอร์โทร:</strong> <a href={`tel:${company.phone}`} className="hover:underline text-secondary font-bold">{company.phone}</a>
              </p>
            )}
            {company.website && (
              <p className="flex items-center gap-xs">
                <strong>เว็บไซต์:</strong> <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-secondary font-bold truncate max-w-[200px]">{company.website}</a>
              </p>
            )}
            <p className="flex items-center gap-xs">
              <strong>พิกัดละติจูด:</strong> <span>{company.lat || "N/A"}</span>
            </p>
            <p className="flex items-center gap-xs">
              <strong>พิกัดลองจิจูด:</strong> <span>{company.lng || "N/A"}</span>
            </p>
          </div>
        </div>

      {/* Aggregate Stats Section */}
      {stats && (
        <div className="grid md:grid-cols-3 gap-md">
          {/* Detailed Score Breakdown */}
          <div className="md:col-span-2 bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-md">
            <h3 className="font-bold text-primary text-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary active-tab">monitoring</span>
              รายละเอียดคะแนนความพึงพอใจ
            </h3>
            <div className="space-y-base">
              {[
                { label: "ลักษณะงานที่ได้รับมอบหมาย", value: stats.avgWork },
                { label: "บรรยากาศและสิ่งแวดล้อมการทำงาน", value: stats.avgEnv },
                { label: "พี่เลี้ยง / ผู้ควบคุมงาน", value: stats.avgMentor },
                { label: "สวัสดิการและค่าตอบแทน", value: stats.avgWelfare },
              ].map((item, idx) => {
                const valNum = Number(item.value) || 0;
                return (
                  <div key={idx} className="space-y-xs">
                    <div className="flex justify-between text-xs font-semibold text-on-surface-variant">
                      <span>{item.label}</span>
                      <span className="text-primary font-bold">{item.value} / 5.0</span>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-secondary h-full rounded-full"
                        style={{ width: `${(valNum / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Card (ข้อมูลสรุป - ตามภาพ Mockup) */}
          <div className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-md flex flex-col justify-between">
            <div className="space-y-md">
              <h3 className="font-bold text-primary text-base">
                ข้อมูลสรุป
              </h3>

              <div className="space-y-sm">
                {/* Box 1: เบี้ยเลี้ยง */}
                <div className="bg-sky-50/80 border border-sky-100 rounded-2xl p-3.5 flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-cyan-200/70 text-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                  </div>
                  <div>
                    <div className="text-xs text-on-surface-variant font-medium">เบี้ยเลี้ยง</div>
                    <div className="text-sm font-bold text-primary">
                      {stats?.avgAllowance
                        ? `${stats.avgAllowance} บาท/วัน`
                        : company.avg_daily_allowance
                        ? `${Math.round(company.avg_daily_allowance)} บาท/วัน`
                        : "ไม่มีระบุ"}
                    </div>
                  </div>
                </div>

                {/* Box 2: เวลาทำงาน */}
                <div className="bg-sky-50/80 border border-sky-100 rounded-2xl p-3.5 flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-cyan-200/70 text-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">schedule</span>
                  </div>
                  <div>
                    <div className="text-xs text-on-surface-variant font-medium">เวลาทำงาน</div>
                    <div className="text-sm font-bold text-primary">
                      {reviews[0]?.work_start_time && reviews[0]?.work_end_time
                        ? `${reviews[0].work_start_time} - ${reviews[0].work_end_time}`
                        : "08:30 - 17:30"}
                    </div>
                  </div>
                </div>

                {/* Box 3: ระดับความพึงพอใจ */}
                <div className="bg-sky-50/80 border border-sky-100 rounded-2xl p-3.5 flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-cyan-200/70 text-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px] active-tab">star</span>
                  </div>
                  <div>
                    <div className="text-xs text-on-surface-variant font-medium">ระดับความพึงพอใจ</div>
                    <div className="text-sm font-bold text-primary flex items-center gap-1">
                      <span>{company.avg_score ? Number(company.avg_score).toFixed(1) : "4.8"}</span>
                      <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-md border-t border-outline-variant/60 space-y-sm">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full bg-secondary text-on-secondary hover:bg-opacity-90 border border-secondary font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-xs shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied ? "check_circle" : "content_copy"}
                </span>
                {copied ? "คัดลอกลิงก์สำเร็จแล้ว!" : "คัดลอกลิงก์เพื่อแชร์ให้เพื่อน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-md">
        <h2 className="text-xl font-bold text-primary font-headline flex items-center gap-xs">
          <span className="material-symbols-outlined text-secondary">forum</span>
          รีวิวความเห็นจากรุ่นพี่นักศึกษา ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center text-on-surface-variant max-w-xl mx-auto space-y-sm">
            <span className="material-symbols-outlined text-[48px] text-secondary">rate_review</span>
            <h3 className="font-headline-sm text-headline-sm text-primary font-bold">ยังไม่มีรีวิวสำหรับสถานประกอบการนี้</h3>
            <p className="font-body-md text-body-md">ร่วมเป็นคนแรกที่แบ่งปันสวัสดิการ ลักษณะงาน และข้อมูลที่เป็นประโยชน์!</p>
            <div className="pt-sm">
              <Link
                href={`/insights/write-review?company_id=${company.id}`}
                className="inline-block bg-primary text-on-primary px-lg py-3 rounded-xl font-label-md text-label-md font-bold shadow-md hover:scale-105 transition-transform"
              >
                + เขียนรีวิวแรกเลย
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-base">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white border border-outline-variant rounded-2xl p-6 shadow-sm space-y-sm">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shadow-inner">
                      {r.is_anonymous ? "น" : r.author_name?.[0] || "นัก"}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-primary flex items-center gap-xs">
                        {r.is_anonymous ? "นักศึกษา HTC (ไม่ระบุตัวตน)" : r.author_name}
                        {r.is_anonymous && (
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant" title="ข้อมูลถูกปิดบังชื่อเพื่อความเป็นส่วนตัว">
                            visibility_off
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{r.department}</span>
                        <span className="text-outline-variant">•</span>
                        <span className="inline-flex items-center gap-0.5 bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                          เพศ: {r.gender === "male" || r.gender === "ชาย" ? "ชาย" : r.gender === "female" || r.gender === "หญิง" ? "หญิง" : "ไม่ระบุ"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-sm">
                    <div className="flex items-center gap-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-lg font-bold text-xs shadow-sm">
                      <span className="material-symbols-outlined text-[14px] text-secondary active-tab">star</span>
                      {r.score_overall} / 5.0
                    </div>

                    {/* Edit / Delete Buttons for Own Review */}
                    {(myReviewIds.has(r.id) || (currentUser && (currentUser.id === r.user_id || currentUser.id === r.user?.id))) && (
                      <div className="flex items-center gap-xs">
                        <button
                          type="button"
                          onClick={() => promptEditReview(r)}
                          className="text-xs text-secondary hover:bg-secondary/10 font-bold border border-secondary/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                          title="แก้ไขรีวิว (จะต้องได้รับการอนุมัติใหม่)"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={() => promptDeleteReview(r.id)}
                          className="text-xs text-rose-600 hover:bg-rose-100 font-bold border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5 disabled:opacity-50"
                          title="ลบรีวิวนี้ออกจากระบบ"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                          ลบ
                        </button>
                      </div>
                    )}

                    {/* Report Review Button */}
                    <button
                      type="button"
                      onClick={() => setReportModal({ isOpen: true, targetId: r.id })}
                      className="text-xs text-slate-500 hover:text-amber-600 hover:bg-amber-50 font-bold border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-0.5"
                      title="รายงานรีวิวนี้"
                    >
                      <span className="material-symbols-outlined text-[14px]">flag</span>
                      รายงานรีวิว
                    </button>
                  </div>
                </div>

                <div className="pt-xs space-y-sm text-xs">
                  {/* Work Hours & Allowance Bar for this specific review */}
                  <div className="flex gap-sm flex-wrap items-center text-[11px] text-on-surface-variant bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/50">
                    <span className="flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[16px] text-secondary">payments</span>
                      <strong>เบี้ยเลี้ยง:</strong> {r.daily_allowance ? `฿${r.daily_allowance} / วัน` : "ไม่มี"}
                    </span>
                    {(r.work_start_time || r.work_end_time) && (
                      <>
                        <span className="text-outline-variant">•</span>
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                          <strong>เวลาทำงาน:</strong> {r.work_start_time || "-"} - {r.work_end_time || "-"} น.
                        </span>
                      </>
                    )}
                  </div>

                  <div className="space-y-xs">
                    <h4 className="font-bold text-primary text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-secondary">build</span>
                      ลักษณะงานที่ได้รับมอบหมาย:
                    </h4>
                    <p className="text-on-surface-variant leading-relaxed pl-base border-l-2 border-outline-variant">{r.text_work}</p>
                  </div>

                  {(r.text_pros || r.text_cons || r.text_advice) && (
                    <div className="grid sm:grid-cols-3 gap-sm pt-base border-t border-outline-variant/60">
                      {r.text_pros && (
                        <div className="bg-emerald-50/50 border border-emerald-200/60 p-sm rounded-xl space-y-2">
                          <span className="font-bold text-emerald-800 flex items-center gap-xs">
                            <span className="material-symbols-outlined text-[16px] text-emerald-700">thumb_up</span> ข้อดี
                          </span>
                          <p className="text-on-surface-variant text-[11px] leading-relaxed">{r.text_pros}</p>
                        </div>
                      )}

                      {r.text_cons && (
                        <div className="bg-rose-50/50 border border-rose-200/60 p-sm rounded-xl space-y-2">
                          <span className="font-bold text-rose-800 flex items-center gap-xs">
                            <span className="material-symbols-outlined text-[16px] text-rose-700">thumb_down</span> ข้อเสีย / ข้อเสนอแนะ
                          </span>
                          <p className="text-on-surface-variant text-[11px] leading-relaxed">{r.text_cons}</p>
                        </div>
                      )}

                      {r.text_advice && (
                        <div className="bg-amber-50/50 border border-amber-200/60 p-sm rounded-xl space-y-2">
                          <span className="font-bold text-amber-800 flex items-center gap-xs">
                            <span className="material-symbols-outlined text-[16px] text-amber-700">lightbulb</span> คำแนะนำรุ่นน้อง
                          </span>
                          <p className="text-on-surface-variant text-[11px] leading-relaxed">{r.text_advice}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Photos Gallery */}
                {r.photo_urls && r.photo_urls.length > 0 && (
                  <div className="flex gap-sm mt-md overflow-x-auto py-1">
                    {r.photo_urls.map((url: string, idx: number) => (
                      <a href={url} target="_blank" rel="noopener noreferrer" key={idx} className="shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-outline-variant hover:scale-105 transition-transform shadow-sm">
                        <img src={url} alt="Review photo" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-md pt-3 border-t border-outline-variant/60 flex justify-end text-[11px] text-on-surface-variant font-semibold">
                  <span className="text-on-surface-variant/80 font-normal">เขียนเมื่อ: {r.created_at || "N/A"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Reusable Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        loading={deletingId !== null}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <Toast
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />

      <ReportModal
        isOpen={reportModal.isOpen}
        title="รายงานรีวิว"
        targetType="review"
        targetId={reportModal.targetId}
        onClose={() => setReportModal({ isOpen: false, targetId: 0 })}
      />
    </div>
  );
}
