"use client";

import React from "react";
import Link from "next/link";

interface FilterTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function FilterTabs({ activeTab, onTabChange }: FilterTabsProps) {
  return (
    <div className="flex items-center justify-end border-b border-outline-variant/40 pb-3">
      <Link
        href="/community/new"
        className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0"
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        ตั้งกระทู้ใหม่
      </Link>
    </div>
  );
}
