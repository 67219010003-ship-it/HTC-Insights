"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setToken, getToken, getRole, isSuperAdmin as checkSuperAdmin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    // If already logged in, redirect away from login page
    const token = getToken();
    if (token) {
      const role = getRole();
      if (role === "admin" || checkSuperAdmin()) {
        window.location.replace("/admin");
      } else {
        window.location.replace("/");
      }
      return;
    }

    if (initializedRef.current) return;

    const googleClientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

    if (!googleClientId) {
      setError("ระบบยังไม่ได้ตั้งค่า NEXT_PUBLIC_GOOGLE_CLIENT_ID บน Vercel Environment Variables");
      return;
    }

    // โหลด Google GSI Script สำหรับปุ่มล็อกอิน
    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        initGoogleSDK(googleClientId);
      };
    } else {
      initGoogleSDK(googleClientId);
    }
  }, []);

  const initGoogleSDK = (googleClientId: string) => {
    if ((window as any).google && !initializedRef.current) {
      initializedRef.current = true;
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        const container = document.getElementById("google-signin-container");
        if (container) {
          (window as any).google.accounts.id.renderButton(container, {
            theme: "filled_blue",
            size: "large",
            width: 320,
            text: "continue_with",
            shape: "pill",
            logo_alignment: "left",
          });
        }
      } catch (err) {
        // ละเว้นข้อผิดพลาดกรณีโหลดซ้ำ
      }
    }
  };

  const handleGoogleResponse = async (response: any) => {
    if (!response || !response.credential) {
      setError("ไม่พบข้อมูลการเข้าสู่ระบบจาก Google กรุณาลองใหม่อีกครั้ง");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.post("/auth/google", { id_token: response.credential });
      
      setToken(
        res.data.access_token,
        res.data.role,
        res.data.is_super_admin ?? false,
        res.data.user ?? null
      );

      // Perform a full redirect to ensure clean authentication state across mobile and desktop
      if (res.data.role === "admin" || res.data.is_super_admin) {
        window.location.href = "/admin";
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.detail || "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google Account");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-margin-mobile py-12">
      <div className="w-full max-w-md bg-surface border border-outline-variant rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        {/* ส่วนหัวแสดงโลโก้และชื่อเว็บ */}
        <div className="flex flex-col items-center space-y-2">
          <img
            src="/logo-htc.png"
            alt="HTC Insights Logo"
            className="w-16 h-16 object-contain mb-1 hover:scale-105 transition-transform"
          />
          <h1 className="text-2xl font-bold font-headline text-primary">
            เข้าสู่ระบบ HTC Insights
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
            วิทยาลัยเทคนิคหาดใหญ่ (Hatyai Technical College)
          </p>
        </div>

        {error && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        {/* ปุ่มล็อกอิน Google */}
        <div className="py-4 flex flex-col items-center justify-center min-h-[50px] relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center gap-2 z-10 rounded-2xl">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-primary">กำลังเข้าสู่ระบบ...</span>
            </div>
          )}
          <div id="google-signin-container" className="flex justify-center"></div>
        </div>

        {/* กล่องคำแนะนำสำหรับนักศึกษาและบุคคลภายนอก */}
        <div className="bg-sky-50 border border-sky-200 text-sky-950 rounded-xl p-4 text-xs leading-relaxed text-left space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <span className="material-symbols-outlined text-[16px] text-secondary">info</span>
            <span>คำแนะนำการเข้าสู่ระบบ:</span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            • <strong>นักศึกษา วท.หาดใหญ่:</strong> เข้าสู่ระบบด้วยอีเมลวิทยาลัย <span className="text-primary font-semibold">(@htc.ac.th)</span> เพื่อเข้าสู่โหมดนักศึกษาโดยอัตโนมัติ
          </p>
          <p className="text-[11px] text-on-surface-variant">
            • <strong>ผู้ใช้ภายนอก / ผู้ประกอบการ:</strong> เข้าสู่ระบบด้วย <span className="text-primary font-semibold">Google Account ทั่วไป</span> เพื่อเข้าสู่โหมดผู้ใช้ภายนอก (หากเป็นนักศึกษาที่ใช้อีเมลส่วนตัว สามารถยื่นเรื่องยืนยันตัวตนได้ในระบบ)
          </p>
        </div>
      </div>
    </div>
  );
}
