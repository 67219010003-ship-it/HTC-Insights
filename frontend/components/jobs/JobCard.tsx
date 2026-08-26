"use client";

import React, { useState } from "react";

export interface JobData {
  id: number;
  title: string;
  company_name: string;
  company_id?: number;
  department?: string;
  description?: string;
  location: string;
  work_type?: string;
  allowance_range?: string;
  daily_allowance?: number;
  logo_url?: string;
  highlights?: string[];
  responsibilities?: string[];
  qualifications?: string[];
  benefits?: string[];
  posted_time?: string;
  latitude?: number;
  longitude?: number;
  is_bookmarked?: boolean;
  phone?: string;
  email?: string;
  contact_person?: string;
  line_id?: string;
}

interface JobCardProps {
  job: JobData;
  isSelected?: boolean;
  onSelect: (job: JobData) => void;
  onBookmarkToggle?: (jobId: number) => void;
}

export default function JobCard({
  job,
  isSelected,
  onSelect,
  onBookmarkToggle,
}: JobCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onSelect(job)}
      className={`border rounded-2xl p-5 bg-surface-container-lowest cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md bg-surface-container-low/30"
          : "border-outline-variant/30 hover:border-primary/50 hover:shadow-sm"
      }`}
    >
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-headline-sm text-base md:text-lg font-bold text-primary line-clamp-1">
            {job.title}
          </h3>
          <p className="font-body-sm text-xs font-semibold text-on-surface-variant mt-0.5 truncate">
            {job.company_name}
          </p>
          {job.department && (
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-secondary-container/50 text-on-secondary-container px-2 py-0.5 rounded-md border border-secondary/20">
                <span className="material-symbols-outlined text-[12px]">school</span>
                {job.department}
              </span>
            </div>
          )}
          <p className="font-body-sm text-xs text-on-surface-variant/80 flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            {job.location}
          </p>
          {job.allowance_range ? (
            <p className="font-body-sm text-xs font-bold text-secondary mt-1.5">
              ฿{job.allowance_range}
            </p>
          ) : job.daily_allowance ? (
            <p className="font-body-sm text-xs font-bold text-secondary mt-1.5">
              ฿{job.daily_allowance.toLocaleString()}/วัน
            </p>
          ) : null}
        </div>

        {/* Logo Container with NO PREVIEW Badge Fallback */}
        <div className="w-14 h-14 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
          {job.logo_url && !imgError ? (
            <img
              src={job.logo_url}
              alt={job.company_name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-full bg-surface-container-high/60 flex items-center justify-center p-1 select-none border border-outline-variant/20">
              <span className="material-symbols-outlined text-[24px] text-on-surface-variant/60">
                business
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bullet Highlights */}
      {job.highlights && job.highlights.length > 0 && (
        <ul className="list-disc pl-5 my-3 text-xs text-on-surface-variant space-y-1">
          {job.highlights.slice(0, 3).map((item, idx) => (
            <li key={idx} className="line-clamp-1">
              {item}
            </li>
          ))}
        </ul>
      )}

      {/* Footer info */}
      <div className="mt-3 pt-3 border-t border-outline-variant/20 flex justify-between items-center text-xs text-on-surface-variant">
        <span className="text-[11px] text-on-surface-variant/70 flex items-center gap-1 font-medium">
          <span className="material-symbols-outlined text-[13px] text-secondary">
            work_outline
          </span>
          <span>ตำแหน่งงานฝึกงาน</span>
        </span>
        <span className="text-[11px] text-secondary font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
          ดูรายละเอียด <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </span>
      </div>
    </div>
  );
}
