"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { getToken, getRole, getUser, clearToken, isSuperAdmin } from "@/lib/auth";
import { api } from "@/lib/api";
import StudentVerificationModal from "./StudentVerificationModal";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: "success" | "info" | "warning";
  time: string;
  isRead: boolean;
  link?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const [token, setTokenState] = useState<string | null>(null);
  const [role, setRoleState] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    email: string;
    name: string;
    avatar_url: string;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Notifications list (empty by default, no mockups)
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatThaiNotificationTime = (rawDate?: string | null): string => {
    if (!rawDate) return "";
    try {
      const dateStr = rawDate.endsWith("Z") || rawDate.includes("+") ? rawDate : `${rawDate}Z`;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";

      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

      if (diffSec < 60) {
        return "เมื่อสักครู่";
      }
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) {
        return `${diffMin} นาทีที่แล้ว`;
      }

      const timeFormatted = d.toLocaleTimeString("th-TH", {
        timeZone: "Asia/Bangkok",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) {
        return `วันนี้ ${timeFormatted} น.`;
      }

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      if (isYesterday) {
        return `เมื่อวาน ${timeFormatted} น.`;
      }

      const dateFormatted = d.toLocaleDateString("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
      });

      return `${dateFormatted} ${timeFormatted} น.`;
    } catch {
      return "";
    }
  };

  const fetchNotifications = () => {
    const currentToken = getToken();
    if (!currentToken) return;
    api
      .get("/notifications")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setNotifications(
            res.data.map((n: any) => ({
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type || "info",
              time: formatThaiNotificationTime(n.created_at),
              isRead: Boolean(n.is_read),
              link: n.link,
            }))
          );
        }
      })
      .catch(() => {});
  };

  const fetchAuth = () => {
    const currentToken = getToken();
    setTokenState(currentToken);
    setRoleState(getRole());
    setUserProfile(getUser());

    if (currentToken) {
      api
        .get("/auth/me")
        .then((res) => {
          setUserProfile(res.data);
          if (typeof window !== "undefined") {
            localStorage.setItem("htc_user", JSON.stringify(res.data));
            if (res.data.role) localStorage.setItem("htc_role", res.data.role);
            if (res.data.is_super_admin !== undefined) {
              localStorage.setItem("htc_is_super", res.data.is_super_admin ? "true" : "false");
            }
          }
        })
        .catch((err) => {
          if (err.response?.status === 401) {
            clearToken();
            setTokenState(null);
            setRoleState(null);
            setUserProfile(null);
          }
        });
      fetchNotifications();
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchAuth();

    const handleAuthChange = () => {
      fetchAuth();
    };

    window.addEventListener("htc-auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    // Polling notifications every 15s
    const interval = setInterval(fetchNotifications, 15000);

    return () => {
      window.removeEventListener("htc-auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
      clearInterval(interval);
    };
  }, [pathname]);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    api.patch("/notifications/read-all").catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markSingleAsRead = (id: number) => {
    api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleDeleteNotification = (id: number) => {
    api.delete(`/notifications/${id}`).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    api.delete("/notifications/clear-all").catch(() => {});
    setNotifications([]);
  };

  const handleLogout = () => {
    clearToken();
    setTokenState(null);
    setRoleState(null);
    setUserProfile(null);
    setIsDropdownOpen(false);
    window.location.href = "/auth/login";
  };

  const isEmp = role === "employer";
  const isAdmin = role === "admin" || isSuperAdmin();
  const isStudentUser = !isAdmin && (role === "student" || (userProfile?.email && userProfile.email.endsWith("@htc.ac.th")));
  const isExternalUser = !isStudentUser && !isAdmin && !isEmp;
  const isNonHtcUser = userProfile?.email && !userProfile.email.endsWith("@htc.ac.th");

  const userAvatar =
    userProfile?.avatar_url ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

  return (
    <>
      <header className="bg-surface border-b border-outline-variant fixed top-0 left-0 w-full z-40 shadow-sm">
        <div className="grid grid-cols-[auto_1fr_auto] items-center w-full px-margin-mobile md:px-lg max-w-container-max mx-auto h-16 gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo-htc.png"
              alt="HTC Insights Logo"
              className="w-10 h-10 object-contain hover:scale-105 transition-transform"
            />
            <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
              HTC Insights
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full font-bold ml-1 hidden sm:inline-block">
              วท.หาดใหญ่
            </span>
          </Link>

          {/* Navigation Links - Perfectly Centered */}
          <nav className="hidden md:flex items-center justify-center gap-lg">
            {mounted && token && (
              <>
                <Link
                  href="/"
                  className={`font-body-md text-body-md ${
                    pathname === "/"
                      ? "text-secondary font-bold border-b-2 border-secondary pb-1"
                      : "text-on-surface-variant hover:text-primary transition-colors duration-200"
                  }`}
                >
                  Home
                </Link>

                {!isExternalUser && (
                  <Link
                    href="/insights"
                    className={`font-body-md text-body-md ${
                      pathname.startsWith("/insights")
                        ? "text-secondary font-bold border-b-2 border-secondary pb-1"
                        : "text-on-surface-variant hover:text-primary transition-colors duration-200"
                    }`}
                  >
                    Insights
                  </Link>
                )}

                {!isExternalUser && (
                  <Link
                    href="/community"
                    className={`font-body-md text-body-md ${
                      pathname.startsWith("/community")
                        ? "text-secondary font-bold border-b-2 border-secondary pb-1"
                        : "text-on-surface-variant hover:text-primary transition-colors duration-200"
                    }`}
                  >
                    Community
                  </Link>
                )}

                <Link
                  href="/jobs"
                  className={`font-body-md text-body-md ${
                    pathname.startsWith("/jobs")
                      ? "text-secondary font-bold border-b-2 border-secondary pb-1"
                      : "text-on-surface-variant hover:text-primary transition-colors duration-200"
                  }`}
                >
                  Jobs
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="font-body-md text-body-md text-error font-bold hover:underline"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right Section: Notifications + Profile Avatar */}
          <div className="flex items-center justify-end gap-2">
            {mounted && (
              token ? (
              <>
                {/* Notification Bell Icon & Popover Dropdown */}
                <div className="relative flex items-center" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotifOpen(!isNotifOpen);
                      setIsDropdownOpen(false);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors relative cursor-pointer"
                    title="การแจ้งเตือน"
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full border-2 border-surface flex items-center justify-center shadow-sm">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Popover Window */}
                  {isNotifOpen && (
                    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-outline-variant p-4 z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">
                            notifications_active
                          </span>
                          <h3 className="font-headline-sm text-sm font-bold text-primary truncate">
                            การแจ้งเตือน
                          </h3>
                          {unreadCount > 0 && (
                            <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                              {unreadCount} ใหม่
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[11px]">
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={markAllAsRead}
                              className="text-secondary hover:underline font-bold cursor-pointer"
                            >
                              อ่านทั้งหมด
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllNotifications}
                              className="text-slate-400 hover:text-rose-600 hover:underline font-medium cursor-pointer"
                              title="ล้างรายการแจ้งเตือนทั้งหมด"
                            >
                              ล้างทั้งหมด
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notification Items List */}
                      <div className="space-y-2 max-h-80 overflow-y-auto hide-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="text-center py-8 text-xs text-on-surface-variant flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-3xl text-outline opacity-40">
                              notifications_off
                            </span>
                            <span>ไม่มีการแจ้งเตือนในขณะนี้</span>
                          </div>
                        ) : (
                          notifications.map((item) => (
                            <div
                              key={item.id}
                              className={`group relative flex items-start justify-between gap-2 p-3 rounded-xl transition-all border ${
                                item.isRead
                                  ? "bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant opacity-80 hover:opacity-100"
                                  : "bg-secondary-container/15 border-secondary/30 shadow-xs"
                              } hover:bg-surface-container-low`}
                            >
                              {/* Clickable Notification Content Area */}
                              <Link
                                href={item.link || "#"}
                                onClick={() => {
                                  if (!item.isRead) markSingleAsRead(item.id);
                                  setIsNotifOpen(false);
                                }}
                                className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer"
                              >
                                <span
                                  className={`material-symbols-outlined text-[18px] mt-0.5 shrink-0 ${
                                    item.type === "success"
                                      ? "text-emerald-500"
                                      : "text-secondary"
                                  }`}
                                >
                                  {item.type === "success"
                                    ? "check_circle"
                                    : "info"}
                                </span>
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className={`text-xs truncate ${item.isRead ? "font-semibold text-on-surface" : "font-bold text-primary"}`}>
                                      {item.title}
                                    </h4>
                                    {!item.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-secondary shrink-0" title="ยังไม่ได้อ่าน" />
                                    )}
                                  </div>
                                  <p className="text-xs text-on-surface-variant leading-tight line-clamp-2">
                                    {item.message}
                                  </p>
                                  <span className="text-[10px] text-on-surface-variant/70 block pt-0.5">
                                    {item.time}
                                  </span>
                                </div>
                              </Link>

                              {/* Delete Individual Notification Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteNotification(item.id);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
                                title="ลบการแจ้งเตือนนี้"
                                aria-label="ลบการแจ้งเตือน"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Avatar & Account Menu */}
                <div className="relative flex items-center" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(!isDropdownOpen);
                      setIsNotifOpen(false);
                    }}
                    aria-label="User Menu"
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary/40 hover:border-secondary transition-all p-0.5 shadow-sm hover:scale-105 focus:outline-none cursor-pointer"
                  >
                    <img
                      src={userAvatar}
                      alt={userProfile?.name || "Google Account Profile"}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";
                      }}
                    />
                  </button>

                  {/* Account Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-outline-variant p-md z-50 space-y-md animate-in fade-in zoom-in-95 duration-150">
                      {/* Account Header */}
                      <div className="flex items-center gap-md pb-md border-b border-outline-variant">
                        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-secondary shrink-0 shadow-sm">
                          <img
                            src={userAvatar}
                            alt={userProfile?.name || "Google Account Profile"}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";
                            }}
                          />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-label-md text-label-md text-primary font-bold truncate">
                            {userProfile?.name ||
                              (isEmp
                                ? "สถานประกอบการพาร์ทเนอร์"
                                : "นักศึกษาวิทยาลัยเทคนิคหาดใหญ่")}
                          </h4>
                          <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                            {userProfile?.email || "student@htc.ac.th"}
                          </p>
                          <span className="inline-flex items-center gap-xs text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold mt-1">
                            <span className="material-symbols-outlined text-[12px]">
                              verified
                            </span>
                            Google Account
                          </span>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="space-y-xs font-body-sm text-body-sm">
                        {/* 🎓 Request Student Verification Button for non-HTC emails */}
                        {isNonHtcUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setIsVerifyModalOpen(true);
                            }}
                            className="w-full flex items-center gap-sm p-2.5 rounded-xl bg-secondary-container/30 text-secondary border border-secondary/30 hover:bg-secondary-container/50 transition-colors font-bold text-left cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              school
                            </span>
                            ยื่นคำขอเป็นนักศึกษา
                          </button>
                        )}

                        <Link
                          href="/profile"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-sm p-sm rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors font-medium"
                        >
                          <span className="material-symbols-outlined text-[20px] text-secondary">
                            person
                          </span>
                          จัดการบัญชี
                        </Link>

                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-sm p-sm rounded-xl text-error hover:bg-error/10 transition-colors font-bold"
                          >
                            <span className="material-symbols-outlined text-[20px] text-error">
                              admin_panel_settings
                            </span>
                            Admin Center
                          </Link>
                        )}

                        {/* Sign Out Button INSIDE Dropdown */}
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-sm p-sm rounded-xl text-error hover:bg-error/10 transition-colors font-bold text-left pt-2 border-t border-outline-variant/60 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            logout
                          </span>
                          ออกจากระบบ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Sign In With Google Button when NOT logged in (hidden when on login page) */
              pathname !== "/auth/login" ? (
                <Link
                  href="/auth/login"
                  className="bg-primary text-on-primary px-lg py-2.5 rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all shadow-md font-bold flex items-center gap-2 hover:scale-105"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                    />
                  </svg>
                  เข้าสู่ระบบด้วย Google
                </Link>
              ) : null
            )
          )}
          </div>
        </div>
      </header>

      {/* Student Verification Request Modal */}
      <StudentVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        userEmail={userProfile?.email}
      />
    </>
  );
}
