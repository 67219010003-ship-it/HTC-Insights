"use client";

import React from "react";
import { ALL_DEPARTMENTS } from "@/components/DepartmentDropdown";

interface CommunitySidebarProps {
  selectedDepartment: string;
  onSelectDepartment: (dept: string) => void;
}

export default function CommunitySidebar({
  selectedDepartment,
  onSelectDepartment,
}: CommunitySidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 gap-md">
      <div className="p-sm bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-sm max-h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar">
        <div className="px-sm pt-sm pb-xs border-b border-outline-variant/30 mb-2">
          <h2 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
            แผนกวิชา ({ALL_DEPARTMENTS.length - 1} แผนก)
          </h2>
        </div>
        <nav className="flex flex-col gap-1">
          {ALL_DEPARTMENTS.map((dept) => {
            const isSelected =
              selectedDepartment === dept.value ||
              (dept.value === "" && !selectedDepartment);
            return (
              <button
                key={dept.value || "all"}
                onClick={() => onSelectDepartment(dept.value)}
                className={`flex items-center gap-sm px-3 py-2.5 rounded-xl font-medium transition-all text-left w-full cursor-pointer ${
                  isSelected
                    ? "bg-secondary text-on-secondary shadow-sm font-bold"
                    : "text-on-surface hover:bg-surface-container hover:text-secondary group"
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] shrink-0 ${
                    isSelected
                      ? "text-on-secondary"
                      : "text-secondary group-hover:text-secondary transition-colors"
                  }`}
                >
                  {dept.icon}
                </span>
                <span className="font-label-md text-label-md truncate">
                  {dept.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
