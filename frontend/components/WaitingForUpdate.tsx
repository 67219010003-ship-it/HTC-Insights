"use client";

import Link from "next/link";

interface Props {
  title: string;
  description?: string;
}

export default function WaitingForUpdate({ title, description }: Props) {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-margin-mobile text-center py-16">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-secondary-container/60 text-secondary flex items-center justify-center mx-auto shadow-inner animate-pulse">
          <span className="material-symbols-outlined text-[48px]">schedule</span>
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md">
          <span className="material-symbols-outlined text-[18px]">update</span>
        </div>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary mb-3">
        Waiting for update
      </h1>

      <div className="inline-flex items-center gap-xs px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold mb-4">
        <span className="material-symbols-outlined text-[14px]">info</span>
        {title} — กำลังรอการอัปเดต
      </div>

      <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto mb-8 leading-relaxed">
        {description ||
          "เนื้อหาในส่วนนี้กำลังอยู่ระหว่างการปรับปรุงข้อมูลและอัปเดตระบบ โปรดติดตามการอัปเดตข่าวสารและข้อมูลใหม่จาก HTC Insights เร็วๆ นี้"}
      </p>

      <Link
        href="/"
        className="bg-primary text-on-primary px-lg py-3.5 rounded-xl font-label-md text-label-md font-bold hover:bg-primary-container transition-all shadow-md inline-flex items-center gap-xs hover:scale-105"
      >
        <span className="material-symbols-outlined text-[20px]">home</span>
        กลับสู่หน้าหลัก (Home)
      </Link>
    </div>
  );
}
