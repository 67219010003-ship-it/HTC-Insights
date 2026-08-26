import axios from "axios";

// กำหนด URL ของ Backend API
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// สร้าง Axios Instance สำหรับเรียกใช้งาน Backend API
export const api = axios.create({
  baseURL: API_URL,
});

// ดักจับทุก Request เพื่อแนบ JWT Bearer Token อัตโนมัติและจัดการ Header
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("htc_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // หากข้อมูลเป็น FormData ให้ลบ Content-Type ออก เพื่อให้ Browser/Axios สร้าง multipart/form-data พร้อม boundary เอง
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
    }
  } else if (config.headers && !config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});
