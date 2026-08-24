import axios from "axios";

// กำหนด URL ของ Backend API
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// สร้าง Axios Instance สำหรับเรียกใช้งาน Backend API
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ดักจับทุก Request เพื่อแนบ JWT Bearer Token อัตโนมัติถ้ามีใน LocalStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("htc_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
