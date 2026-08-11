"use client";

import React, { useState } from "react";
import Link from "next/link";
import ReportModal from "@/components/ReportModal";

export interface CompanyCardData {
  id: number;
  name: string;
  address: string | null;
  industry: string | null;
  is_verified: boolean;
  avg_score: number | null;
  review_count: number;
  avg_daily_allowance: number | null;
  phone: string | null;
  website: string | null;
  cover_image_url: string | null;
  description: string | null;
  departments?: string[];
}

interface CompanyCardProps {
  company: CompanyCardData;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <article className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
        <div>
          {/* Cover / Image Banner */}
          <div className="relative h-44 bg-surface-container overflow-hidden">
            {company.cover_image_url ? (
              <img
                src={company.cover_image_url}
                alt={company.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-container/20 to-surface-container text-primary/40">
                <span className="material-symbols-outlined text-5xl">business</span>
              </div>
            )}

            {/* Verified Badge */}
            {company.is_verified && (
              <div className="absolute top-3 left-3 bg-surface-container-lowest/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-secondary/20 flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-secondary text-[16px]">
                  verified
                </span>
                <span className="font-label-sm text-[11px] font-bold text-secondary">
                  Verified Partner
                </span>
              </div>
            )}

            {/* Allowance Tag */}
            {company.avg_daily_allowance && (
              <div className="absolute bottom-3 right-3 bg-primary/90 backdrop-blur-md text-on-primary px-3 py-1 rounded-xl text-xs font-bold shadow-md">
                ฿{company.avg_daily_allowance.toLocaleString()}/วัน
              </div>
            )}
          </div>

          {/* Content Details */}
          <div className="p-5 space-y-3">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold group-hover:text-primary transition-colors line-clamp-1">
                {company.name}
              </h3>
              {company.address && (
                <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1 line-clamp-1">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {company.address}
                </p>
              )}
            </div>

            {/* Rating (Original Theme Color: text-secondary active-tab) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center text-secondary">
                <span
                  className="material-symbols-outlined text-[18px] active-tab"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                <span className="text-sm font-bold text-on-surface ml-1">
                  {company.avg_score ? company.avg_score.toFixed(1) : "ไม่มีคะแนน"}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant">
                ({company.review_count} รีวิว)
              </span>
            </div>

            {/* Description snippet */}
            {company.description && (
              <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                {company.description}
              </p>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-5 pt-0 mt-auto flex items-center gap-2">
          <Link
            href={`/insights/${company.id}`}
            className="flex-1 py-2.5 px-4 bg-surface-container hover:bg-primary hover:text-on-primary text-primary rounded-xl font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98"
          >
            ดูรายละเอียด & รีวิว
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowReportModal(true);
            }}
            className="py-2.5 px-3 bg-surface-container hover:bg-amber-50 text-slate-500 hover:text-amber-600 border border-outline-variant/30 rounded-xl transition-all font-bold text-xs flex items-center gap-1 cursor-pointer"
            title="รายงานข้อมูลบริษัท"
          >
            <span className="material-symbols-outlined text-[18px]">flag</span>
          </button>
        </div>
      </article>

      <ReportModal
        isOpen={showReportModal}
        title="รายงานข้อมูลบริษัท"
        targetType="company"
        targetId={company.id}
        onClose={() => setShowReportModal(false)}
      />
    </>
  );
}
