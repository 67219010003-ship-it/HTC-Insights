/**
 * ดึง JWT Token จาก LocalStorage
 */
export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("htc_token");
};

/**
 * บันทึกสถานะการเข้าสู่ระบบ (Token, Role, Super Admin Flag, ข้อมูล User)
 */
export const setToken = (token: string, role: string, isSuperAdmin?: boolean, userObj?: any) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("htc_token", token);
  localStorage.setItem("htc_role", role);
  if (isSuperAdmin !== undefined) {
    localStorage.setItem("htc_is_super", isSuperAdmin ? "true" : "false");
  }
  if (userObj) {
    localStorage.setItem("htc_user", JSON.stringify(userObj));
  }
  window.dispatchEvent(new Event("htc-auth-change"));
};

/**
 * ล้างข้อมูลการเข้าสู่ระบบทั้งหมดเมื่อกดออกจากระบบ (Logout)
 */
export const clearToken = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("htc_token");
  localStorage.removeItem("htc_role");
  localStorage.removeItem("htc_is_super");
  localStorage.removeItem("htc_user");
  window.dispatchEvent(new Event("htc-auth-change"));
};

/**
 * อ่านบทบาทผู้ใช้ (Role: student, admin, employer, external)
 */
export const getRole = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("htc_role");
};

/**
 * อ่านข้อมูลโปรไฟล์ของผู้ใช้งานปัจจุบัน
 */
export const getUser = () => {
  if (typeof window === "undefined") return null;
  const str = localStorage.getItem("htc_user");
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
};

/**
 * ตรวจสอบว่าเป็นนักศึกษา วท.หาดใหญ่ หรือไม่
 */
export const isStudent = () => {
  const role = getRole();
  const user = getUser();
  if (role === "admin") return true;
  if (user?.email && user.email.endsWith("@htc.ac.th")) return true;
  return role === "student";
};

/**
 * ตรวจสอบว่าเป็นบัญชีสถานประกอบการหรือไม่
 */
export const isEmployer = () => getRole() === "employer";

/**
 * ตรวจสอบว่าเป็นผู้ใช้ทั่วไป/บุคคลภายนอกหรือไม่
 */
export const isExternal = () => {
  const role = getRole();
  const user = getUser();
  if (role === "admin") return false;
  if (user?.email && user.email.endsWith("@htc.ac.th")) return false;
  if (role === "student") return false;
  return true;
};

/**
 * ตรวจสอบว่าเป็นผู้ดูแลระบบ (Admin) หรือไม่
 */
export const isAdmin = () => getRole() === "admin";

/**
 * ตรวจสอบว่าเป็น Super Admin หรือไม่
 */
export const isSuperAdmin = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("htc_is_super") === "true";
};
