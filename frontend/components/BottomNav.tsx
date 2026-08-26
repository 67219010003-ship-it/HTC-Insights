"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getRole } from "@/lib/auth";

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const updateRole = () => setRole(getRole());
    updateRole();

    window.addEventListener("htc-auth-change", updateRole);
    window.addEventListener("storage", updateRole);
    return () => {
      window.removeEventListener("htc-auth-change", updateRole);
      window.removeEventListener("storage", updateRole);
    };
  }, [pathname]);

  // If not mounted, not logged in, or on auth login page, do not render BottomNav
  if (!mounted || !role || pathname === "/auth/login") {
    return null;
  }

  const isEmp = role === "employer";
  const isAdmin = role === "admin";
  const isStudent = role === "student";
  const isExternal = !isStudent && !isAdmin;

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

      {!isExternal && (
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
      )}

      {!isExternal && (
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
        href="/profile"
        className={`flex flex-col items-center justify-center ${
          pathname.startsWith("/profile")
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
