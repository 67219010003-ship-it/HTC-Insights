"use client";

import React from "react";
import DepartmentDropdown from "@/components/DepartmentDropdown";

interface InsightsSidebarFilterProps {
  selectedDept: string;
  onSelectDept: (dept: string) => void;
  selectedStars: Set<number>;
  onToggleStar: (star: number) => void;
  onReset: () => void;
  hasActiveFilters?: boolean;
  departmentCounts?: Record<string, number>;
}

export default function InsightsSidebarFilter({
  selectedDept,
  onSelectDept,
  selectedStars,
  onToggleStar,
  onReset,
  hasActiveFilters,
  departmentCounts,
}: InsightsSidebarFilterProps) {
  const showReset = hasActiveFilters ?? (Boolean(selectedDept) || selectedStars.size > 0);

  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-6">
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <h3 className="font-headline-sm text-headline-sm font-semibold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            ตัวกรองค้นหา
          </h3>
          {showReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-secondary hover:underline font-medium cursor-pointer"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>

        {/* Department Dropdown Filter (Matching real places data) */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-on-surface">
            แผนกวิชาช่าง
          </label>
          <DepartmentDropdown
            value={selectedDept}
            onChange={onSelectDept}
            departmentCounts={departmentCounts}
            onlyAvailable={false}
          />
        </div>

        {/* Rating Filter (Star Ratings using text-secondary / active-tab) */}
        <div className="space-y-3 border-t border-outline-variant/20 pt-4">
          <label className="block text-sm font-semibold text-on-surface">
            คะแนนรีวิว
          </label>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const isChecked = selectedStars.has(star);
              return (
                <div
                  key={star}
                  onClick={() => onToggleStar(star)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-container-low cursor-pointer transition-colors select-none"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded text-secondary focus:ring-secondary h-4 w-4 pointer-events-none cursor-pointer"
                    />
                    <div className="flex items-center text-secondary">
                      {[...Array(star)].map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-[18px] active-tab"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      ))}
                      {[...Array(5 - star)].map((_, i) => (
                        <span
                          key={i}
                          className="material-symbols-outlined text-[18px] text-outline-variant"
                        >
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {star} ดาว
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
