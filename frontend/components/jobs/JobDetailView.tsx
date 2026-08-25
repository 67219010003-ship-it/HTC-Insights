"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { JobData } from "./JobCard";
import ReportModal from "@/components/ReportModal";

// Dynamically import Leaflet Map for SSR safety
const JobLocationMap = dynamic(() => import("./JobLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-surface-container-low border border-outline-variant/30 rounded-2xl flex items-center justify-center text-xs text-on-surface-variant font-bold">
      กำลังโหลดแผนที่ Google Maps...
    </div>
  ),
});

interface JobDetailViewProps {
  job: JobData | null;
  onBack?: () => void;
}

export default function JobDetailView({ job, onBack }: JobDetailViewProps) {
  const [showContactModal, setShowContactModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copiedText, setCopiedText] = useState("");
  const [imgError, setImgError] = useState(false);

  if (!job) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 min-h-[480px]">
        <div className="w-20 h-20 bg-surface-container-low rounded-full flex items-center justify-center mb-4 text-outline border border-outline-variant/30 shadow-inner">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
            find_in_page
          </span>
        </div>
        <h3 className="text-lg font-bold text-primary mb-1 font-headline">
          เลือกตำแหน่งงานเพื่อดูรายละเอียด
        </h3>
        <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
          กรุณาคลิกเลือกรายการตำแหน่งงานฝึกงานทางด้านซ้าย เพื่อดูรายละเอียด สถานที่ทำงาน และเบอร์ติดต่อสถานประกอบการ
        </p>
      </div>
    );
  }

  // Default Hatyai Technical College coords if job coords missing
  const lat = job.latitude || 7.0088;
  const lng = job.longitude || 100.4747;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const phone = job.phone || "000-000-000 (ฝ่าย HR/รับสมัครฝึกงาน)";
  const email = job.email || "hr@company.co.th";
  const contactPerson = job.contact_person || "ฝ่ายทรัพยากรบุคคล / ผู้จัดการแผนก";
  const lineId = job.line_id || "@htc_internship";

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2000);
  };

  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
      {/* Sticky Header Action Bar (With Top Contact Button) */}
      <div className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 p-4 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden p-2 text-on-surface-variant hover:text-primary rounded-full cursor-pointer"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div className="w-12 h-12 bg-surface-container rounded-xl border border-outline-variant/30 flex items-center justify-center shrink-0 overflow-hidden">
            {job.logo_url && !imgError ? (
              <img
                src={job.logo_url}
                alt={job.company_name}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="w-full h-full bg-surface-container-high/60 flex items-center justify-center p-1 select-none border border-outline-variant/20">
                <span className="material-symbols-outlined text-[22px] text-on-surface-variant/60">
                  business
                </span>
              </div>
            )}
          </div>
          <div>
            <h2 className="font-headline-sm text-sm sm:text-base font-bold text-primary line-clamp-1">
              {job.title}
            </h2>
            <p className="font-body-sm text-xs text-on-surface-variant">
              {job.company_name}
            </p>
          </div>
        </div>

        {/* Header Contact Button & Report Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="px-3 py-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            title="รายงานประกาศงานนี้"
          >
            <span className="material-symbols-outlined text-[18px]">flag</span>
            <span className="hidden sm:inline">รายงานประกาศงาน</span>
          </button>

          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            className="px-4 py-2 bg-secondary text-on-secondary hover:bg-secondary/90 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">call</span>
            ติดต่อสถานประกอบการ
          </button>
        </div>
      </div>

      {/* Main Detail Content Scrollable */}
      <div className="p-6 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto hide-scrollbar">
        {/* Title & Overview Tags */}
        <div className="space-y-3 border-b border-outline-variant/20 pb-5">
          <h1 className="text-xl md:text-2xl font-bold text-primary font-headline">
            {job.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-on-surface-variant">
            {job.department && (
              <div className="flex items-center gap-1.5 text-secondary font-bold bg-secondary-container/40 px-2.5 py-1 rounded-lg border border-secondary/20">
                <span className="material-symbols-outlined text-[16px]">school</span>
                {job.department}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-secondary font-semibold">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              {job.location}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">work</span>
              {job.work_type || "งานประจำ / ฝึกงาน"}
            </div>
            {(job.allowance_range || job.daily_allowance) && (
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <span className="material-symbols-outlined text-[18px]">payments</span>
                {job.allowance_range ? `฿${job.allowance_range}` : `฿${job.daily_allowance}/วัน`}
              </div>
            )}
          </div>
        </div>

        {/* 🗺️ Google Maps Location Section */}
        <div className="space-y-3 bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-sm font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                map
              </span>
              พิกัดสถานที่ปฏิบัติงาน (Google Maps)
            </h3>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-secondary hover:underline font-bold flex items-center gap-1"
            >
              เปิดใน Google Maps
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>

          {/* Interactive Map Display */}
          <div className="rounded-xl overflow-hidden border border-outline-variant/30 shadow-sm">
            <JobLocationMap
              lat={lat}
              lng={lng}
              companyName={job.company_name}
              address={job.location}
            />
          </div>

          <p className="text-xs text-on-surface-variant flex items-center gap-1 pt-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            {job.location} • ละติจูด {lat.toFixed(4)}, ลองจิจูด {lng.toFixed(4)}
          </p>
        </div>

        {/* Responsibilities */}
        {job.responsibilities && job.responsibilities.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-headline-sm text-sm font-bold text-primary">
              ความรับผิดชอบ (Responsibilities)
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-on-surface leading-relaxed">
              {job.responsibilities.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Qualifications */}
        {job.qualifications && job.qualifications.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-headline-sm text-sm font-bold text-primary">
              คุณสมบัติผู้สมัคร (Qualifications)
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-on-surface leading-relaxed">
              {job.qualifications.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Benefits */}
        {job.benefits && job.benefits.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-headline-sm text-sm font-bold text-primary">
              สวัสดิการ (Benefits)
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-on-surface leading-relaxed">
              {job.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Contact Info Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-outline-variant">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">
                  domain
                </span>
                <h3 className="font-bold text-primary text-base">
                  ข้อมูลติดต่อ {job.company_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="text-on-surface-variant hover:text-primary p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {copiedText && (
              <div className="p-2 bg-emerald-500 text-white rounded-xl text-xs font-bold text-center animate-in fade-in duration-150">
                คัดลอก {copiedText} เรียบร้อยแล้ว!
              </div>
            )}

            <div className="space-y-3.5">
              {/* Phone */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">call</span>
                  </div>
                  <div>
                    <p className="text-[11px] text-on-surface-variant">เบอร์โทรศัพท์ติดต่อ</p>
                    <p className="text-xs font-bold text-primary">{phone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(phone, "เบอร์โทรศัพท์")}
                  className="px-3 py-1.5 bg-white border border-outline-variant/40 rounded-lg text-xs font-bold text-primary hover:bg-surface-container transition-colors shrink-0 cursor-pointer"
                >
                  คัดลอก
                </button>
              </div>

              {/* Email */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden pr-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[11px] text-on-surface-variant">อีเมลสมัคร/ติดต่อ</p>
                    <p className="text-xs font-bold text-primary truncate">{email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(email, "อีเมล")}
                  className="px-3 py-1.5 bg-white border border-outline-variant/40 rounded-lg text-xs font-bold text-primary hover:bg-surface-container transition-colors shrink-0 cursor-pointer"
                >
                  คัดลอก
                </button>
              </div>

              {/* Contact Person */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div>
                  <p className="text-[11px] text-on-surface-variant">ฝ่าย / ผู้ประสานงาน</p>
                  <p className="text-xs font-bold text-primary">{contactPerson}</p>
                </div>
              </div>

              {/* Line ID */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    LINE
                  </div>
                  <div>
                    <p className="text-[11px] text-on-surface-variant">LINE ID</p>
                    <p className="text-xs font-bold text-primary">{lineId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(lineId, "LINE ID")}
                  className="px-3 py-1.5 bg-white border border-outline-variant/40 rounded-lg text-xs font-bold text-primary hover:bg-surface-container transition-colors shrink-0 cursor-pointer"
                >
                  คัดลอก
                </button>
              </div>

              {/* Location */}
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <div>
                  <p className="text-[11px] text-on-surface-variant">ที่อยู่สถานที่ปฏิบัติงาน</p>
                  <p className="text-xs font-bold text-primary leading-relaxed">
                    {job.location}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl text-xs hover:bg-primary/90 transition-colors shadow-md cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Job Modal */}
      <ReportModal
        isOpen={showReportModal}
        title="รายงานประกาศงาน"
        targetType="job"
        targetId={job.id}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}
