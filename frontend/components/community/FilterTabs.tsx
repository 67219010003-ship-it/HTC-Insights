"use client";

import React from "react";
import Link from "next/link";

interface FilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "latest", label: "ล่าสุด" },
  { id: "popular", label: "ยอดนิยม" },
  { id: "pinned", label: "ปักหมุด" },
  { id: "unanswered", label: "คำถามที่ยังไม่มีคำตอบ" },
];

export default function FilterTabs({ activeTab, onTabChange }: FilterTabsProps) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3 overflow-x-auto">
      <div className="flex gap-md whitespace-nowrap">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`font-label-md text-label-md py-2 px-1 transition-colors ${
                isActive
                  ? "text-primary font-bold active-tab-indicator"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <Link
        href="/community/new"
        className="hidden md:flex items-center gap-1.5 px-5 py-2.5 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        ตั้งกระทู้ใหม่
      </Link>
    </div>
  );
}
