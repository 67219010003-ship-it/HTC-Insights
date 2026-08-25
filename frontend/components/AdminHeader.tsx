"use client";

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

  return (
    <div className="bg-surface-container-lowest border-b border-outline-variant/50 shadow-xs mb-lg">
      <div className="max-w-container-max mx-auto px-margin-mobile py-6">
        {/* Top Meta Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
      </div>
    </div>
  );
}
