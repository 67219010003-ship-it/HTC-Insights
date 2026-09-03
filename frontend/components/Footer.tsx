"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, isStudent } from "@/lib/auth";

export default function Footer() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isExternalAccount, setIsExternalAccount] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkAccountType = () => {
      const token = getToken();
      // If user is logged in as student or admin -> internal account
      const isInternal = Boolean(token && isStudent());
      setIsExternalAccount(!isInternal);
    };

    checkAccountType();

    window.addEventListener("htc-auth-change", checkAccountType);
    window.addEventListener("storage", checkAccountType);

    return () => {
      window.removeEventListener("htc-auth-change", checkAccountType);
      window.removeEventListener("storage", checkAccountType);
    };
  }, [pathname]);

  // If on employer specific routes, or detected as external account
  const isExternalView = isExternalAccount || pathname?.startsWith("/employer");

  return (
    <footer className="bg-surface border-t border-outline-variant py-12 px-margin-mobile">
      <div className="max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div>
          <div className="flex items-center gap-2 mb-md">
            <img
              src="/logo-htc.png"
              alt="HTC Insights Logo"
              className="w-10 h-10 object-contain hover:scale-105 transition-transform"
            />
            <h3 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
              HTC Insights
            </h3>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm leading-relaxed">
            แพลตฟอร์มรวบรวมข้อมูลและรีวิวสถานที่ฝึกงานสำหรับนักศึกษาวิทยาลัยเทคนิคหาดใหญ่ ทุกระดับชั้น (ปวช., ปวส., และ ทล.บ.) เพื่อการเตรียมความพร้อมสู่อาชีพอย่างมืออาชีพ
          </p>
        </div>
        <div>
          <h4 className="font-label-md text-label-md text-primary mb-md font-bold">เมนูหลัก</h4>
          <ul className="space-y-sm font-body-sm text-body-sm text-on-surface-variant" suppressHydrationWarning>
            {mounted && isExternalView ? (
              <>
                <li>
                  <Link href="/jobs" className="hover:text-primary transition-colors">
                    ตำแหน่งงานฝึกงานที่เปิดรับ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/employer/register"
                    className="hover:text-primary transition-colors text-secondary font-bold"
                  >
                    เขียนเปิดรับนักศึกษาฝึกงาน
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link href="/insights" className="hover:text-primary transition-colors">
                    ค้นหารีวิวสถานที่ฝึกงาน
                  </Link>
                </li>
                <li>
                  <Link href="/community" className="hover:text-primary transition-colors">
                    ชุมชนและกระทู้พูดคุย
                  </Link>
                </li>
                <li>
                  <Link href="/jobs" className="hover:text-primary transition-colors">
                    ตำแหน่งงานฝึกงานที่เปิดรับ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/insights/write-review"
                    className="hover:text-primary transition-colors text-secondary font-bold"
                  >
                    + เขียนรีวิวประสบการณ์ฝึกงาน
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
        <div>
          <h4 className="font-label-md text-label-md text-primary mb-md font-bold">ติดต่อเรา</h4>
          <ul className="space-y-sm font-body-sm text-body-sm text-on-surface-variant">
            <li className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px] text-secondary">mail</span> 67219010003@htc.ac.th
            </li>
            <li className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px] text-secondary">call</span> 000-000-0000
            </li>
            <li className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span> วิทยาลัยเทคนิคหาดใหญ่ (Hatyai Technical College)
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-container-max mx-auto pt-md mt-lg border-t border-outline-variant text-center font-label-sm text-label-sm text-on-surface-variant">
        © 2026 Hatyai Technical College (HTC Insights). All rights reserved.
      </div>
    </footer>
  );
}
