"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import JobCard, { JobData } from "@/components/jobs/JobCard";
import JobDetailView from "@/components/jobs/JobDetailView";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api
        .get("/auth/me")
        .then((res) => {
          if (res.data?.email) {
            setUserEmail(res.data.email);
          }
        })
        .catch(() => {});
    }

    setLoading(true);

    // Read jobs registered via Employer Register Form from localStorage
    let localJobs: JobData[] = [];
    try {
      const localStr = localStorage.getItem("htc_registered_jobs");
      if (localStr) {
        localJobs = JSON.parse(localStr);
      }
    } catch {}

    api
      .get("/api/jobs")
      .then((res) => {
        const apiJobs: JobData[] = (res.data && Array.isArray(res.data)) ? res.data : [];
        
        // Merge and deduplicate by id or company_name
        const combined = [...localJobs];
        apiJobs.forEach((aj) => {
          if (!combined.some((cj) => cj.id === aj.id || (cj.company_name === aj.company_name && cj.title === aj.title))) {
            combined.push(aj);
          }
        });

        setJobs(combined);
        if (combined.length > 0) {
          setSelectedJob(combined[0]);
        } else {
          setSelectedJob(null);
        }
      })
      .catch(() => {
        setJobs(localJobs);
        if (localJobs.length > 0) {
          setSelectedJob(localJobs[0]);
        } else {
          setSelectedJob(null);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const isNonHtcEmail = !userEmail || !userEmail.endsWith("@htc.ac.th");

  const filteredJobs = jobs.filter((job) => {
    const matchesQuery =
      !searchQuery ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation =
      !selectedLocation || job.location.includes(selectedLocation);
    return matchesQuery && matchesLocation;
  });

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-lg py-6 min-h-screen">
      {/* Top Search & Header */}
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-headline">
            ตำแหน่งงานฝึกงานสำหรับนักศึกษา (Jobs)
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1">
            ค้นหาตำแหน่งงานฝึกงานที่ตรงกับสาขาวิชา พร้อมข้อมูลเบี้ยเลี้ยง สวัสดิการ และแผนที่พิกัดสถานที่ทำงาน
          </p>
        </div>

        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาตำแหน่งงาน, ชื่อบริษัท หรือทักษะที่สนใจ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-xs md:text-sm focus:outline-none focus:border-primary shadow-sm"
            />
          </div>

          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-xs md:text-sm text-on-surface-variant focus:outline-none focus:border-primary shadow-sm cursor-pointer"
          >
            <option value="">ทุกอำเภอ / ทุกจังหวัด</option>
            <option value="หาดใหญ่">หาดใหญ่</option>
            <option value="เมือง">เมืองสงขลา</option>
            <option value="สงขลา">สงขลา</option>
          </select>
        </div>

        {/* Employer Registration Banner Below Search Bar */}
        {isNonHtcEmail && (
          <div className="p-4 bg-secondary-container/20 border border-secondary/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[22px]">domain</span>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-primary">
                  ท่านเป็นสถานประกอบการที่ต้องการลงประกาศรับสมัครฝึกงาน?
                </h4>
                <p className="text-xs text-on-surface-variant">
                  กรอกแบบฟอร์มลงทะเบียนสถานประกอบการเพื่อเปิดรับนักศึกษาวิทยาลัยเทคนิคหาดใหญ่เข้าร่วมงาน
                </p>
              </div>
            </div>
            <Link
              href="/employer/register"
              className="w-full sm:w-auto px-4 py-2.5 bg-secondary text-on-secondary hover:bg-secondary/90 rounded-xl text-xs font-bold shrink-0 shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              กรอกแบบฟอร์มลงทะเบียนสถานประกอบการ
            </Link>
          </div>
        )}
      </div>

      {/* Main Split-View Layout (Master - Detail) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Job Cards List (42% Width on Desktop) */}
        <div className="w-full lg:w-[42%] space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto hide-scrollbar pr-1">
          <div className="flex justify-between items-center px-1 pb-1">
            <span className="text-xs font-bold text-on-surface-variant">
              พบ {filteredJobs.length} ตำแหน่งงานฝึกงานในระบบ
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-xs text-on-surface-variant space-y-2">
              <span className="material-symbols-outlined animate-spin text-[28px] text-secondary">
                sync
              </span>
              <p className="font-bold">กำลังโหลดข้อมูลตำแหน่งงานฝึกงานจากระบบจริง...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-10 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-xs text-on-surface-variant space-y-3">
              <div className="w-14 h-14 bg-surface-container-low rounded-full flex items-center justify-center mx-auto text-on-surface-variant border border-outline-variant/30">
                <span className="material-symbols-outlined text-[32px]">work_off</span>
              </div>
              <div>
                <p className="font-bold text-primary text-sm">ยังไม่มีข้อมูลตำแหน่งงานฝึกงานในขณะนี้</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  สถานประกอบการพาร์ทเนอร์สามารถลงทะเบียนเพื่อประกาศเปิดรับสมัครฝึกงานได้เลย
                </p>
              </div>
              <Link
                href="/employer/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-bold shadow-sm hover:bg-secondary/90 transition-all mt-2"
              >
                <span className="material-symbols-outlined text-[16px]">add_business</span>
                ลงทะเบียนเปิดรับนักศึกษาฝึกงาน
              </Link>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSelected={selectedJob?.id === job.id}
                onSelect={(selected) => setSelectedJob(selected)}
              />
            ))
          )}
        </div>

        {/* Right Column: Detailed View with Google Maps (58% Width on Desktop) */}
        <div className="w-full lg:w-[58%]">
          <JobDetailView
            job={selectedJob}
            onBack={() => setSelectedJob(null)}
          />
        </div>
      </div>
    </div>
  );
}
