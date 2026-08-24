"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getRole, getUser } from "@/lib/auth";
import StudentHomeView from "@/components/home/StudentHomeView";
import ExternalHomeView from "@/components/home/ExternalHomeView";

export default function HomePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  const checkAuthStatus = () => {
    const currentToken = getToken();
    const currentRole = getRole();
    const currentUser = getUser();

    setToken(currentToken);
    setRole(currentRole);
    setUser(currentUser);
    setIsReady(true);

    // หากยังไม่ล็อกอิน ให้รีไดเรกต์ไปหน้า login ทันที
    if (!currentToken) {
      router.push("/auth/login");
    }
  };

  useEffect(() => {
    checkAuthStatus();

    const handleAuthChange = () => {
      checkAuthStatus();
    };

    window.addEventListener("htc-auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("htc-auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  if (!isReady || !token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-on-surface-variant font-bold">
        กำลังโหลดระบบ HTC Insights...
      </div>
    );
  }

  // หากล็อกอินเป็นระดับนักศึกษาหรือแอดมิน ให้แสดงหน้า Home นักศึกษา
  const isCollegeStudent = role === "student" || role === "admin" || user?.email?.endsWith("@htc.ac.th");
  if (isCollegeStudent) {
    return <StudentHomeView />;
  }

  // หากเป็นผู้ใช้ภายนอก/สถานประกอบการ ให้แสดงหน้า Home ผู้ใช้ภายนอก
  return <ExternalHomeView />;
}
