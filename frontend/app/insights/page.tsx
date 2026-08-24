"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";
import InsightsSidebarFilter from "@/components/insights/InsightsSidebarFilter";
import CompanyCard, { CompanyCardData } from "@/components/insights/CompanyCard";

function InsightsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [companies, setCompanies] = useState<CompanyCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("q") || "");
  const [selectedDept, setSelectedDept] = useState<string>(searchParams.get("department") || "");
  const [selectedStars, setSelectedStars] = useState<Set<number>>(() => {
    const raw = searchParams.getAll("scores");
    return raw.length > 0 ? new Set(raw.map(Number)) : new Set();
  });
  const [page, setPage] = useState<number>(1);
  const pageSize = 9;

  useEffect(() => {
    // Check if external user
    const token = typeof window !== "undefined" ? localStorage.getItem("htc_token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("htc_role") : null;
    const userStr = typeof window !== "undefined" ? localStorage.getItem("htc_user") : null;
    let userEmail = "";
    try {
      if (userStr) userEmail = JSON.parse(userStr)?.email || "";
    } catch {}

    const isInternal = role === "admin" || (role === "student" && (!userEmail || userEmail.endsWith("@htc.ac.th")));
    if (!token || (!isInternal && role === "external")) {
      router.replace("/auth/login");
      return;
    }

    const qParam = searchParams.get("q") || "";
    const deptParam = searchParams.get("department") || "";
    const scoresParam = searchParams.getAll("scores");
    setSearchQuery(qParam);
    setSelectedDept(deptParam);
    setSelectedStars(scoresParam.length > 0 ? new Set(scoresParam.map(Number)) : new Set());
    setPage(1);
  }, [searchParams, router]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/companies?limit=100");
      setCompanies(res.data || []);
    } catch (err) {
      console.error("Fetch companies error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const toggleStarFilter = (star: number) => {
    const next = new Set(selectedStars);
    if (next.has(star)) {
      next.delete(star);
    } else {
      next.add(star);
    }
    setSelectedStars(next);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedDept("");
    setSelectedStars(new Set());
    setSearchQuery("");
    router.push("/insights");
  };

  const filteredCompanies = companies.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchAddr = c.address?.toLowerCase().includes(q);
      if (!matchName && !matchAddr) return false;
    }
    if (selectedDept) {
      if (!c.departments || c.departments.length === 0) {
        // If company has no reviews yet, don't filter out unless user explicitly set department
      } else {
        const cleanSelected = selectedDept.replace("แผนกวิชา", "").trim().toLowerCase();
        const matchDept = c.departments.some(d => {
          const cleanD = d.replace("แผนกวิชา", "").trim().toLowerCase();
          return cleanD.includes(cleanSelected) || cleanSelected.includes(cleanD);
        });
        if (!matchDept) return false;
      }
    }
    if (selectedStars.size > 0) {
      const score = c.avg_score != null ? Math.round(c.avg_score) : 0;
      if (!selectedStars.has(score)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;
  const paginatedCompanies = filteredCompanies.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="min-h-screen bg-background py-8 px-margin-mobile md:px-lg max-w-container-max mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-3xl p-6 md:p-10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="font-headline-lg text-2xl md:text-4xl font-bold tracking-tight">
            ค้นหาสถานที่ฝึกงาน & อ่านรีวิวจริง
          </h1>
          <p className="text-on-primary-container text-sm md:text-base max-w-xl">
            รวบรวมรีวิวลึกจากรุ่นพี่วิทยาลัยเทคนิคหาดใหญ่ ข้อมูลเบี้ยเลี้ยง สวัสดิการ และสภาพแวดล้อมการทำงานจริง
          </p>
        </div>
        <Link
          href="/insights/write-review"
          className="px-6 py-3 bg-secondary text-on-secondary hover:bg-secondary/90 rounded-2xl font-label-md text-label-md font-bold shadow-md hover:shadow-xl transition-all active:scale-95 shrink-0 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">rate_review</span>
          เขียนรีวิวฝึกงาน
        </Link>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <InsightsSidebarFilter
          selectedDept={selectedDept}
          onSelectDept={setSelectedDept}
          selectedStars={selectedStars}
          onToggleStar={toggleStarFilter}
          onReset={handleResetFilters}
        />

        {/* Company Grid & Search Controls */}
        <div className="flex-1 space-y-6">
          {/* Top Search Bar & Controls */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อบริษัท หรือจังหวัด..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm font-body-sm focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="text-xs text-on-surface-variant font-medium">
              พบ <strong className="text-primary text-sm">{filteredCompanies.length}</strong> สถานที่ฝึกงาน
            </div>
          </div>

          {/* Company Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="animate-pulse bg-surface-container-lowest rounded-2xl border border-outline-variant/30 h-72"
                />
              ))}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-16 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 space-y-3">
              <span className="material-symbols-outlined text-5xl text-outline">
                domain_disabled
              </span>
              <h3 className="text-lg font-bold text-primary">
                ไม่พบสถานที่ฝึกงานที่ตรงตามเงื่อนไข
              </h3>
              <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                ลองปรับตัวกรองแผนกวิชาหรือค้นหาคำอื่นๆ
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-surface-container text-primary rounded-xl text-xs font-bold hover:bg-surface-container-high transition-colors"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedCompanies.map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      }
    >
      <InsightsPageContent />
    </Suspense>
  );
}
