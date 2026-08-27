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
  const [showReportModal, setShowReportModal] = useState(false);
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
  const lineId = job.line_id || "-";



  return (
    <div className="flex flex-col bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
      {/* Main Detail Content Scrollable */}
      <div className="p-6 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto hide-scrollbar">
        {/* Title & Overview Tags */}
        <div className="space-y-3 border-b border-outline-variant/20 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="lg:hidden p-1.5 -ml-1 text-on-surface-variant hover:text-primary rounded-full cursor-pointer shrink-0"
                  title="ย้อนกลับ"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
              )}
              <h1 className="text-xl md:text-2xl font-bold text-primary font-headline">
                {job.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-on-surface-variant">
            {job.department && (
              <div className="flex items-center gap-1.5 text-secondary font-bold bg-secondary-container/40 px-2.5 py-1 rounded-lg border border-secondary/20">
                <span className="material-symbols-outlined text-[16px]">school</span>
                {job.department}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-secondary font-semibold">
              <span className="material-symbols-outlined text-[16px]">domain</span>
              {job.company_name}
            </div>

            {/* ปุ่มรายงานประกาศ ย้ายมาไว้หลังชื่อบริษัท */}
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 hover:border-amber-200"
              title="รายงานประกาศงานนี้"
            >
              <span className="material-symbols-outlined text-[14px] text-amber-500">flag</span>
              <span>รายงานประกาศ</span>
            </button>

            {job.daily_allowance ? (
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="material-symbols-outlined text-[16px]">payments</span>
                ฿{job.daily_allowance} บาท/วัน
              </div>
            ) : null}
            {job.location && (
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                {job.location}
              </div>
            )}
          </div>
        </div>

        {/* Recruiter & Contact Box */}
        <div className="p-5 rounded-2xl bg-surface-container-low/80 border border-outline-variant/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                contact_page
              </span>
              ข้อมูลผู้ลงประกาศ / ผู้ประสานงานรับสมัคร
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-outline-variant/30">
              <span className="text-on-surface-variant">ผู้ติดต่อ:</span>
              <span className="font-bold text-primary truncate max-w-[160px]">{contactPerson}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-outline-variant/30">
              <span className="text-on-surface-variant">เบอร์โทรศัพท์:</span>
              <span className="font-bold text-primary font-mono">{phone}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-outline-variant/30">
              <span className="text-on-surface-variant">อีเมล:</span>
              <span className="font-bold text-primary truncate max-w-[160px] font-mono">{email}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-outline-variant/30">
              <span className="text-on-surface-variant">LINE ID:</span>
              <span className="font-bold text-primary font-mono">{lineId}</span>
            </div>
          </div>
        </div>

        {/* Job Description */}
        <section className="space-y-2">
          <h3 className="font-headline-sm text-sm font-bold text-primary">
            รายละเอียดตำแหน่งงาน
          </h3>
          <p className="text-xs text-on-surface leading-relaxed whitespace-pre-line bg-surface-container-low/40 p-4 rounded-xl border border-outline-variant/30">
            {job.description}
          </p>
        </section>

        {/* Location & Interactive Map */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-sm font-bold text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                location_on
              </span>
              สถานที่ปฏิบัติงาน
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
              ความรับผิดชอบ
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
              คุณสมบัติผู้สมัคร
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
              สวัสดิการ
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-on-surface leading-relaxed">
              {job.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>
        )}
      </div>



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
