"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getRole } from "@/lib/auth";

export default function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const updateRole = () => setRole(getRole());
    updateRole();

    window.addEventListener("htc-auth-change", updateRole);
    window.addEventListener("storage", updateRole);
    return () => {
      window.removeEventListener("htc-auth-change", updateRole);
      window.removeEventListener("storage", updateRole);
    };
  }, [pathname]);

  const isEmp = role === "employer";

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 md:hidden bg-surface shadow-lg border-t border-outline-variant rounded-t-xl">
      <Link
        href="/"
        className={`flex flex-col items-center justify-center ${
          pathname === "/"
            ? "text-secondary font-bold"
            : "text-on-surface-variant"
        }`}
      >
        <span className={`material-symbols-outlined ${pathname === "/" ? "active-tab" : ""}`}>
          home
        </span>
        <span className="text-[11px]">Home</span>
      </Link>

      <Link
        href="/insights"
        className={`flex flex-col items-center justify-center ${
          pathname.startsWith("/insights")
            ? "text-secondary font-bold"
            : "text-on-surface-variant"
        }`}
      >
        <span className={`material-symbols-outlined ${pathname.startsWith("/insights") ? "active-tab" : ""}`}>
          rate_review
        </span>
        <span className="text-[11px]">Insights</span>
      </Link>

      {!isEmp && (
        <Link
          href="/community"
          className={`flex flex-col items-center justify-center ${
            pathname.startsWith("/community")
              ? "text-secondary font-bold"
              : "text-on-surface-variant"
          }`}
        >
          <span className={`material-symbols-outlined ${pathname.startsWith("/community") ? "active-tab" : ""}`}>
            forum
          </span>
          <span className="text-[11px]">Community</span>
        </Link>
      )}

      <Link
        href="/jobs"
        className={`flex flex-col items-center justify-center ${
          pathname.startsWith("/jobs")
            ? "text-secondary font-bold"
            : "text-on-surface-variant"
        }`}
      >
        <span className={`material-symbols-outlined ${pathname.startsWith("/jobs") ? "active-tab" : ""}`}>
          work
        </span>
        <span className="text-[11px]">Jobs</span>
      </Link>

      <Link
        href={isEmp ? "/employer/dashboard" : "/profile"}
        className={`flex flex-col items-center justify-center ${
          pathname.startsWith("/profile") || pathname.startsWith("/employer")
            ? "text-secondary font-bold"
            : "text-on-surface-variant"
        }`}
      >
        <span className={`material-symbols-outlined ${pathname.startsWith("/profile") ? "active-tab" : ""}`}>
          person
        </span>
        <span className="text-[11px]">Profile</span>
      </Link>
    </nav>
  );
}
