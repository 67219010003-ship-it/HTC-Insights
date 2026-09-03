"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  pendingCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function AdminHeader({
  title = "ระบบจัดการข้อมูลหลังบ้าน",
  subtitle = "ศูนย์ควบคุม อนุมัติ และตรวจสอบข้อมูลทั้งหมดของระบบ HTC Insight",
  pendingCount,
  onRefresh,
  refreshing = false,
}: AdminHeaderProps) {
  const pathname = usePathname();

  const navLinks = [
    {
      href: "/admin",
      label: "แดชบอร์ด",
      icon: "analytics",
    },
    {
      href: "/admin/users",
      label: "จัดการผู้ใช้ & สิทธิ์",
      icon: "group",
    },
    {
      href: "/admin/screening",
      label: "คัดกรอง",
      icon: "fact_check",
      badge: pendingCount && pendingCount > 0 ? pendingCount : undefined,
    },
  ];

  return (
    <div className="no-print bg-surface-container-lowest border-b border-outline-variant/50 shadow-xs mb-lg">
      <div className="max-w-container-max mx-auto px-margin-mobile py-6">
        {/* Top Meta Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-outline-variant/30">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold font-headline-lg text-primary tracking-tight">
              {title}
            </h1>
            <p className="text-xs md:text-sm text-on-surface-variant font-body-sm">
              {subtitle}
            </p>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-label-md text-primary bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 transition-all cursor-pointer disabled:opacity-50"
                title="รีเฟรชข้อมูล"
              >
                <span className={`material-symbols-outlined text-[16px] ${refreshing ? "animate-spin" : ""}`}>
                  refresh
                </span>
                <span>{refreshing ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Horizontal Sub-Navigation */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto hide-scrollbar">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-label-md text-xs md:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-low/70 text-on-surface-variant hover:text-primary hover:bg-surface-container border border-outline-variant/40"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {link.icon}
                </span>
                <span>{link.label}</span>
                {link.badge !== undefined && (
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      isActive
                        ? "bg-secondary text-on-secondary"
                        : "bg-amber-100 text-amber-900 border border-amber-300"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
