"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import DepartmentDropdown from "@/components/DepartmentDropdown";

export default function StudentHomeView() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [department, setDepartment] = useState("");

  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch real live data from backend API
    api.get("/companies?limit=100").then((res) => setCompanies(res.data)).catch(() => {});
    api.get("/reviews?limit=3").then((res) => setRecentReviews(res.data)).catch(() => {});
  }, []);

  const departmentCounts = companies.reduce((acc: Record<string, number>, c: any) => {
    c.departments?.forEach((d: string) => {
      if (d) acc[d] = (acc[d] || 0) + 1;
    });
    return acc;
  }, {});

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (department) params.set("department", department);
    const queryString = params.toString();
    router.push(queryString ? `/insights?${queryString}` : "/insights");
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="hero-gradient relative py-xl md:py-24 px-margin-mobile pt-24 overflow-hidden">
        <div className="max-w-container-max mx-auto grid md:grid-cols-2 gap-lg items-center relative z-10">
          <div className="space-y-md">
            <div className="inline-flex items-center gap-xs bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span className="font-label-sm text-label-sm">โดยนักศึกษา เพื่อนักศึกษา HTC</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg md:text-[48px] leading-tight text-primary font-bold">
              ค้นหาข้อมูลฝึกงาน <br />
              <span className="text-secondary">จากรุ่นพี่ฝึกงานตัวจริง</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
              "Real Insights from Real Students" ค้นหารีวิวบริษัท ข้อมูลเบี้ยเลี้ยง และบรรยากาศการทำงานจริงจากเพื่อนนักศึกษา วิทยาลัยเทคนิคหาดใหญ่บน <strong>HTC Insights</strong>
            </p>
            <div className="flex flex-wrap gap-md pt-base">
              <Link
                href="/insights"
                className="bg-primary text-on-primary px-lg py-4 rounded-xl font-label-md text-label-md shadow-lg flex items-center gap-sm hover:scale-105 transition-transform font-bold"
              >
                เริ่มค้นหารีวิว
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link
                href="/insights/write-review"
                className="border-2 border-secondary text-secondary px-lg py-4 rounded-xl font-label-md text-label-md hover:bg-surface-container-high transition-colors font-bold"
              >
                แชร์ประสบการณ์ของคุณ
              </Link>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>
            <div className="grid grid-cols-2 gap-md">
              {/* Live Stat Cards */}
              <div className="bg-surface border border-outline-variant p-md rounded-2xl shadow-sm mt-lg">
                <span className="material-symbols-outlined text-secondary text-headline-md">corporate_fare</span>
                <div className="font-headline-md text-headline-md text-primary mt-base font-bold">
                  {companies.length > 0 ? companies.length : "0+"}
                </div>
                <div className="font-label-md text-label-md text-on-surface-variant">สถานประกอบการในระบบ</div>
              </div>
              <div className="bg-gradient-to-br from-[#00677c] via-secondary to-[#003c49] text-white p-md rounded-2xl shadow-lg relative overflow-hidden">
                <span className="material-symbols-outlined text-white text-headline-md z-10 relative">star</span>
                <div className="font-headline-md text-headline-md text-white mt-base font-bold z-10 relative">
                  {recentReviews.length > 0 ? recentReviews.length : "0+"}
                </div>
                <div className="font-label-md text-label-md text-white/80 z-10 relative">รีวิวจากนักศึกษา</div>
                <img
                  src="/logo-htc.png"
                  className="absolute -right-4 -bottom-4 w-24 h-24 opacity-25 transform rotate-[25deg] pointer-events-none select-none"
                  alt=""
                />
              </div>
            </div>
            <div className="mt-md bg-white p-md rounded-2xl border border-outline-variant shadow-sm flex items-center gap-md">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center font-bold text-primary">
                <span className="material-symbols-outlined text-secondary">verified_user</span>
              </div>
              <div>
                <div className="font-label-md text-label-md text-primary font-bold">"ข้อมูลประสบการณ์จริง ปลอดภัย ยืนยันตัวตน"</div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">ระบบฐานข้อมูล HTC Insights (วท.หาดใหญ่)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Bar Section with Department Filter */}
      <section className="px-margin-mobile -mt-8 relative z-20">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="bg-surface rounded-2xl shadow-xl p-base flex flex-col md:flex-row items-center gap-sm border border-outline-variant">
            <div className="flex items-center flex-1 w-full">
              <span className="material-symbols-outlined text-on-surface-variant ml-md">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อบริษัท หรือแผนกวิชา..."
                className="w-full bg-transparent border-none focus:ring-0 px-md py-3 font-body-md text-body-md"
              />
            </div>
            
            {/* Department Filter Custom Dropdown */}
            <div className="w-full md:w-72">
              <DepartmentDropdown value={department} onChange={setDepartment} departmentCounts={departmentCounts} />
            </div>

            <button
              type="submit"
              className="w-full md:w-auto bg-secondary text-on-secondary px-lg py-3 rounded-xl font-label-md text-label-md hover:bg-opacity-90 transition-opacity whitespace-nowrap font-bold"
            >
              ค้นหา
            </button>
          </form>
        </div>
      </section>

      {/* Live Reviews Feed Section */}
      <section className="py-xl px-margin-mobile bg-surface-container-low mt-12">
        <div className="max-w-container-max mx-auto">
          <div className="flex justify-between items-end mb-lg">
            <div>
              <span className="text-label-md text-secondary font-bold uppercase tracking-wider">REAL REVIEWS</span>
              <h2 className="font-headline-md text-headline-md text-primary mt-xs font-bold">รีวิวเรียลไทม์จากรุ่นพี่</h2>
            </div>
            <Link href="/insights" className="text-secondary font-label-md text-label-md flex items-center gap-xs font-bold hover:underline">
              ดูรีวิวทั้งหมด <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          {recentReviews.length === 0 ? (
            <div className="bg-white border border-outline-variant rounded-2xl p-12 text-center text-on-surface-variant max-w-xl mx-auto space-y-md">
              <span className="material-symbols-outlined text-[48px] text-secondary">rate_review</span>
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">ยังไม่มีรีวิวในระบบฐานข้อมูล</h3>
              <p className="font-body-md text-body-md">ระบบพร้อมรับข้อมูลรีวิวประสบการณ์จริงจากนักศึกษา วท.หาดใหญ่</p>
              <Link
                href="/insights/write-review"
                className="inline-block bg-primary text-on-primary px-lg py-3 rounded-xl font-label-md text-label-md font-bold shadow-md hover:bg-primary-container transition-colors"
              >
                + เป็นคนแรกที่เขียนรีวิว
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-md">
              {recentReviews.map((r, idx) => (
                <div key={idx} className="bg-surface border border-outline-variant rounded-2xl p-md perspective-card flex flex-col h-full">
                  <div className="flex items-start justify-between mb-sm">
                    <div className="flex items-center gap-sm">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center font-bold text-primary">
                        {r.company_name?.[0] || "C"}
                      </div>
                      <div>
                        <h3 className="font-label-md text-label-md text-primary font-bold">{r.company_name || "สถานประกอบการ"}</h3>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">{r.department}</p>
                      </div>
                    </div>
                    <div className="flex text-secondary-container bg-secondary px-2 py-0.5 rounded gap-xs items-center">
                      <span className="text-label-sm font-bold text-white">{r.score_overall || 5}</span>
                      <span className="material-symbols-outlined text-[14px] text-white active-tab">star</span>
                    </div>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface flex-grow mb-md italic line-clamp-3 break-words overflow-hidden">
                    &ldquo;{r.text_work || r.text_pros || "ประสบการณ์การทำงานจริง"}&rdquo;
                  </p>
                  <div className="space-y-base pt-md border-t border-outline-variant">
                    <div className="flex justify-between items-center">
                      <span className="text-label-sm text-on-surface-variant flex items-center gap-xs">
                        <span className="material-symbols-outlined text-[18px]">payments</span> เบี้ยเลี้ยง
                      </span>
                      <span className="text-label-sm font-bold text-primary">{r.daily_allowance ? `${r.daily_allowance} บ./วัน` : "ไม่มีระบุ"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Companies Slider Section */}
      <section className="py-xl px-margin-mobile">
        <div className="max-w-container-max mx-auto">
          <div className="flex justify-between items-center mb-lg">
            <div>
              <span className="text-label-md text-secondary font-bold uppercase tracking-wider">TOP COMPANIES</span>
              <h2 className="font-headline-md text-headline-md text-primary mt-xs font-bold">สถานประกอบการในระบบ</h2>
            </div>
            
            {/* Scroll Navigation Buttons */}
            {companies.length > 0 && (
              <div className="flex items-center gap-xs">
                <button
                  onClick={() => scrollCarousel("left")}
                  aria-label="Scroll left"
                  className="w-10 h-10 rounded-full border border-outline-variant bg-surface hover:bg-surface-container-high flex items-center justify-center text-primary shadow-sm transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button
                  onClick={() => scrollCarousel("right")}
                  aria-label="Scroll right"
                  className="w-10 h-10 rounded-full border border-outline-variant bg-surface hover:bg-surface-container-high flex items-center justify-center text-primary shadow-sm transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            )}
          </div>

          {companies.length === 0 ? (
            <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-8 text-center text-on-surface-variant max-w-lg mx-auto">
              <p className="font-body-md text-body-md">พร้อมรับข้อมูลสถานประกอบการจากฐานข้อมูลจริง</p>
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="flex gap-md overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory py-2"
            >
              {companies.map((c, idx) => (
                <Link
                  key={c.id || idx}
                  href={`/insights/${c.id}`}
                  className="snap-start shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="relative h-44 w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                      {c.cover_image_url ? (
                        <img
                          src={c.cover_image_url}
                          alt={c.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                            (e.target as HTMLElement).nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 space-y-1 ${c.cover_image_url ? "hidden" : ""}`}>
                        <span className="material-symbols-outlined text-[32px] opacity-40">hide_image</span>
                        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">NO PREVIEW</span>
                      </div>
                      <div className="absolute top-sm right-sm bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-primary flex items-center gap-xs shadow-sm z-10">
                        <span className="material-symbols-outlined text-[14px] text-secondary active-tab">star</span>
                        {c.avg_score || "N/A"}
                      </div>
                    </div>

                    <div className="p-md space-y-xs">
                      <h3 className="font-headline-sm text-headline-sm font-bold text-primary group-hover:text-secondary transition-colors">
                        {c.name}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1">
                        {c.address || "อำเภอหาดใหญ่ จังหวัดสงขลา"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Review CTA Section */}
      <section className="py-xl px-margin-mobile bg-primary text-on-primary relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-secondary/20 rounded-full blur-3xl"></div>
        <div className="max-w-4xl mx-auto text-center space-y-md relative z-10">
          <h2 className="font-headline-lg text-headline-lg md:text-[36px] font-bold">
            ช่วยรุ่นน้องค้นพบสถานที่ฝึกงานที่ดีที่สุด
          </h2>
          <p className="font-body-lg text-body-lg text-on-primary-container max-w-xl mx-auto">
            ประสบการณ์ของคุณคือเข็มทิศนำทางให้กับนักศึกษารุ่นถัดไป ร่วมเป็นส่วนหนึ่งของสังคมแห่งการแบ่งปันบน HTC Insights
          </p>
          <div className="pt-base">
            <Link
              href="/insights/write-review"
              className="bg-secondary text-on-secondary px-xl py-4 rounded-xl font-label-md text-label-md font-bold shadow-lg hover:scale-105 transition-transform inline-flex items-center gap-sm"
            >
              <span className="material-symbols-outlined">rate_review</span>
              เขียนรีวิวของคุณเลย
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
