"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";

interface HomeLoginGateProps {
  onLoginSuccess?: (role: string) => void;
}

export default function HomeLoginGate({ onLoginSuccess }: HomeLoginGateProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    const googleClientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

    // Load Google Identity Services script if not already present
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
        });

        const container = document.getElementById("home-google-signin-container");
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
        // Ignored
      }
    }
  };

  const handleGoogleResponse = async (response: any) => {
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

      if (res.data.role === "admin") {
        router.push("/admin");
      } else if (onLoginSuccess) {
        onLoginSuccess(res.data.role);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google Account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-margin-mobile py-16">
      <div className="w-full max-w-md bg-surface border border-outline-variant rounded-3xl p-8 shadow-2xl space-y-6 text-center">
        {/* Brand Header */}
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

        {/* Info Pill */}
        <div className="inline-flex items-center gap-xs px-3.5 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          กรุณาเข้าสู่ระบบเพื่อเริ่มต้นใช้งาน
        </div>

        {/* Notice Alert for students & external */}
        <div className="bg-sky-50 border border-sky-200 text-sky-950 rounded-xl p-3 text-xs leading-relaxed text-left space-y-1.5">
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

        {error && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        {/* Google Authentication Button Mount */}
        <div className="py-2 flex flex-col items-center justify-center min-h-[50px]">
          <div id="home-google-signin-container" className="flex justify-center"></div>
        </div>

        {/* Security & Features */}
        <div className="pt-4 border-t border-outline-variant space-y-2 text-left">
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
            <span>ความปลอดภัยระดับสูง ยืนยันตัวตนผ่าน Google Identity</span>
          </div>
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-secondary text-[18px]">domain</span>
            <span>แยกระบบการใช้งานอัตโนมัติตามประเภทบัญชีผู้ใช้</span>
          </div>
        </div>
      </div>
    </div>
  );
}
