"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import StudentVerificationModal from "@/components/StudentVerificationModal";
import Pagination from "@/components/Pagination";

export default function ExternalHomeView() {
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [deptPage, setDeptPage] = useState(1);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const deptPageSize = 6;

  useEffect(() => {
    try {
      localStorage.removeItem("htc_registered_jobs");
    } catch {}

    // Fetch active internship job openings from database API
    api
      .get("/jobs?limit=6")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setActiveJobs(res.data.slice(0, 6));
        }
      })
      .catch(() => {
        setActiveJobs([]);
      });

    setCurrentUser(getUser());
  }, []);

  const allActualDepartments = [
    {
      id: "auto",
      name: "แผนกวิชาช่างยนต์",
      subName: "Automotive Technology",
      levels: ["ปวช.", "ปวส.", "ทล.บ."],
      skills: ["งานบำรุงรักษายานยนต์", "ระบบหัวฉีดอิเล็กทรอนิกส์", "ระบบปรับอากาศยานยนต์", "ยานยนต์ไฟฟ้า (EV Basics)"],
      icon: "directions_car",
      badge: "อุตสาหกรรมยานยนต์",
      desc: "ผลิตช่างเทคนิคที่มีความเชี่ยวชาญด้านเครื่องยนต์ ระบบส่งกำลัง ระบบไฟฟ้ายานยนต์ และการวิเคราะห์ปัญหายานยนต์สมัยใหม่",
    },
    {
      id: "machine",
      name: "แผนกวิชาช่างกลโรงงาน",
      subName: "Machine Tool Technology",
      levels: ["ปวช.", "ปวส."],
      skills: ["งานกลึง/กัด/ไส ชิ้นส่วนโลหะ", "เครื่องจักรกลอัตโนมัติ CNC", "CAD/CAM Design", "งานตรวจสอบมิติละเอียด"],
      icon: "precision_manufacturing",
      badge: "งานผลิตชิ้นส่วนอุตสาหกรรม",
      desc: "เชี่ยวชาญการผลิตชิ้นส่วนเครื่องจักรกล งานขึ้นรูปโลหะ และการควบคุมเครื่องจักรกลอัตโนมัติระบบ CNC",
    },
    {
      id: "welding",
      name: "แผนกวิชาช่างเชื่อมโลหะ",
      subName: "Welding Technology",
      levels: ["ปวช.", "ปวส."],
      skills: ["งานเชื่อม SMAW / GTAW / GMAW", "งานตรวจสอบรอยเชื่อม NDT", "งานประกอบโครงสร้างท่อแรงดัน", "งานโลหะแผ่น"],
      icon: "hvac",
      badge: "โครงสร้างและพลังงาน",
      desc: "ฝึกทักษะการเชื่อมโลหะคุณภาพสูง งานประกอบท่อ และงานโครงสร้างอุตสาหกรรมปิโตรเคมีและก่อสร้าง",
    },
    {
      id: "electric",
      name: "แผนกวิชาช่างไฟฟ้ากำลัง",
      subName: "Electrical Power",
      levels: ["ปวช.", "ปวส.", "ทล.บ."],
      skills: ["การเดินสายระบบไฟฟ้าอาคาร/โรงงาน", "ระบบควบคุมมอเตอร์", "PLC & Automation", "มาตรฐานความปลอดภัยไฟฟ้า"],
      icon: "bolt",
      badge: "ระบบไฟฟ้าและอัตโนมัติ",
      desc: "ฝึกฝนการติดตั้งและควบคุมระบบไฟฟ้ากำลัง ทั้งระบบไฟฟ้าอาคาร โรงงานอุตสาหกรรม และตู้ควบคุมคอนโทรลอัตโนมัติ",
    },
    {
      id: "electronic",
      name: "แผนกวิชาช่างอิเล็กทรอนิกส์",
      subName: "Electronics Technology",
      levels: ["ปวช.", "ปวส.", "ทล.บ."],
      skills: ["วงจรอิเล็กทรอนิกส์และเซนเซอร์", "ระบบโทรคมนาคมและเครือข่าย", "Microcontroller & IoT", "งานซ่อมบำรุงอุปกรณ์อิเล็กทรอนิกส์"],
      icon: "memory",
      badge: "ระบบสมองกลและ IoT",
      desc: "เชี่ยวชาญการออกแบบ วงจรอิเล็กทรอนิกส์ ระบบควบคุมอัจฉริยะ อุปกรณ์โทรคมนาคม และระบบ IoT",
    },
    {
      id: "construct",
      name: "แผนกวิชาช่างก่อสร้าง",
      subName: "Construction Technology",
      levels: ["ปวช.", "ปวส."],
      skills: ["งานประมาณราคาค่าก่อสร้าง", "การควบคุมงานก่อสร้างอาคาร", "งานคอนกรีตเสริมเหล็ก", "งานไม้และแบบหล่อ"],
      icon: "construction",
      badge: "ก่อสร้างและอสังหาริมทรัพย์",
      desc: "ฝึกการควบคุมงานก่อสร้างตามมาตรฐานวิศวกรรม การบริหารจัดการหน้างาน และการประมาณราคาวัสดุ",
    },
    {
      id: "civil",
      name: "แผนกวิชาช่างโยธา",
      subName: "Civil Engineering Technology",
      levels: ["ปวส.", "ทล.บ."],
      skills: ["งานทดสอบวัสดุโยธา", "งานสำรวจและวางผังโครงการ", "การควบคุมงานทางและโครงสร้างพื้นฐาน", "BIM & Civil Software"],
      icon: "architecture",
      badge: "โครงสร้างพื้นฐาน",
      desc: "มุ่งเน้นการวางแผน ออกแบบ ควบคุมงานโครงสร้างพื้นฐาน งานทาง และงานระบบระบายน้ำ",
    },
    {
      id: "arch",
      name: "แผนกวิชาเทคนิคสถาปัตยกรรม",
      subName: "Architectural Technology",
      levels: ["ปวช.", "ปวส."],
      skills: ["การเขียนแบบสถาปัตยกรรม 2D/3D", "AutoCAD / SketchUp / Revit", "การทำหุ่นจำลอง Model", "งานออกแบบตกแต่งเบื้องต้น"],
      icon: "domain",
      badge: "สถาปัตยกรรมและออกแบบ",
      desc: "ทักษะการเขียนแบบสถาปัตยกรรม การนำเสนอแบบ 3 มิติ และการประสานงานแบบก่อสร้าง",
    },
    {
      id: "survey",
      name: "แผนกวิชาช่างสำรวจ",
      subName: "Surveying Technology",
      levels: ["ปวช.", "ปวส."],
      skills: ["การใช้กล้อง Total Station / GNSS", "งานสำรวจรังวัดที่ดินและภูมิประเทศ", "GIS & แผนที่ดิจิทัล", "การคำนวณงานดินตัดดินถม"],
      icon: "square_foot",
      badge: "สำรวจและภูมิสารสนเทศ",
      desc: "เชี่ยวชาญการรังวัด ทำแผนที่ภูมิประเทศ งานสำรวจเพื่องานก่อสร้าง และการประยุกต์ใช้เทคโนโลยีโดรน/GIS",
    },
    {
      id: "ac",
      name: "แผนกวิชาเครื่องทำความเย็นและปรับอากาศ",
      subName: "Refrigeration & Air Conditioning",
      levels: ["ปวช.", "ปวส."],
      skills: ["ติดตั้งระบบปรับอากาศส่วนกลาง (VRF/Chiller)", "การซ่อมบำรุงตู้เย็นและห้องเย็น", "งานท่อน้ำยาและสุญญากาศ", "ระบบปรับอากาศอาคารสูง"],
      icon: "ac_unit",
      badge: "ระบบปรับอากาศและห้องเย็น",
      desc: "ปฏิบัติงานติดตั้ง ซ่อมบำรุง และควบคุมระบบปรับอากาศเชิงพาณิชย์ ห้องเย็นอุตสาหกรรม และระบบระบายอากาศ",
    },
    {
      id: "interior",
      name: "แผนกวิชาช่างเครื่องเรือนและตกแต่งภายใน",
      subName: "Interior & Furniture Design",
      levels: ["ปวช.", "ปวส."],
      skills: ["งานผลิตเฟอร์นิเจอร์ Built-in", "การตกแต่งและจัดวางพื้นที่ภายใน", "การขึ้นรูปวัสดุตกแต่งสมัยใหม่", "งานเคลือบผิวและสี"],
      icon: "chair",
      badge: "ออกแบบตกแต่งภายใน",
      desc: "ทักษะงานออกแบบและผลิตเฟอร์นิเจอร์ งานตกแต่งภายในอาคาร ที่พักอาศัย และงานติดตั้งหน้างาน",
    },
    {
      id: "railway",
      name: "แผนกวิชาเทคนิคควบคุมและซ่อมบำรุงระบบขนส่งทางราง",
      subName: "Railway System Technology",
      levels: ["ปวส."],
      skills: ["การซ่อมบำรุงระบบอาณัติสัญญาณ", "ระบบขบวนรถไฟฟ้าและล้อเลื่อน", "งานซ่อมบำรุงระบบราง", "ระบบจ่ายกำลังไฟฟ้าทางราง"],
      icon: "train",
      badge: "ระบบรางและการขนส่ง",
      desc: "ผลิตช่างเทคนิคระบบรางที่มีความพร้อมรองรับการเติบโตของโครงข่ายรถไฟและระบบขนส่งมวลชนสมัยใหม่",
    },
    {
      id: "petroleum",
      name: "แผนกวิชาเทคโนโลยีเครื่องมือวัดและควบคุมปิโตรเลียม",
      subName: "Petroleum Instrumentation & Control",
      levels: ["ปวส."],
      skills: ["Instrument Calibration & Loop Test", "SCADA / DCS System", "Control Valve & Flow Measurement", "Safety System in Oil & Gas"],
      icon: "oil_barrel",
      badge: "พลังงานและปิโตรเคมี",
      desc: "เชี่ยวชาญการสอบเทียบ ควบคุมเครื่องมือวัดทางอุตสาหกรรมในกระบวนการผลิตปิโตรเลียมและพลังงาน",
    },
    {
      id: "it",
      name: "แผนกวิชาเทคโนโลยีสารสนเทศ",
      subName: "Information Technology & Software",
      levels: ["ปวช.", "ปวส.", "ทล.บ."],
      skills: ["Network & Hardware Support", "Web & Mobile Application", "Database Management", "IT Helpdesk & Cloud Infrastructure"],
      icon: "laptop_chromebook",
      badge: "เทคโนโลยีดิจิทัลและซอฟต์แวร์",
      desc: "พัฒนาโปรแกรม ซอฟต์แวร์ การดูแลระบบเครือข่ายความปลอดภัย และการจัดการฐานข้อมูลระดับองค์กร",
    },
    {
      id: "logistics",
      name: "แผนกวิชาการจัดการโลจิสติกส์และซัพพลายเชน",
      subName: "Logistics & Supply Chain Management",
      levels: ["ปวช.", "ปวส."],
      skills: ["การบริหารคลังสินค้าและสต็อก", "การจัดการขนส่งและกระจายสินค้า", "พิธีการศุลกากรและเอกสารนำเข้า-ส่งออก", "ระบบ ERP / WMS"],
      icon: "local_shipping",
      badge: "โลจิสติกส์และซัพพลายเชน",
      desc: "ฝึกฝนการวางแผนจัดการคลังสินค้า ระบบการขนส่ง และการจัดการห่วงโซ่อุปทานระดับประเทศและข้ามแดน",
    },
    {
      id: "mecha",
      name: "แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์",
      subName: "Mechatronics & Robotics",
      levels: ["ปวส."],
      skills: ["Industrial Robotics & Cobot", "Microcontroller & IoT", "Pneumatics & Hydraulics", "ระบบสายการผลิตอัตโนมัติ"],
      icon: "smart_toy",
      badge: "ระบบอัตโนมัติและหุ่นยนต์",
      desc: "บูรณาการความรู้ทางกลศาสตร์ ไฟฟ้า และระบบคอมพิวเตอร์เพื่อควบคุมหุ่นยนต์และแขนกลในสายการผลิตอุตสาหกรรม",
    },
    {
      id: "aviation",
      name: "แผนกวิชาธุรกิจการบิน",
      subName: "Aviation Business",
      levels: ["ปวส."],
      skills: ["งานบริการผู้โดยสารภาคพื้น (Ground Handling)", "การสำรองที่นั่งและบัตรโดยสาร", "มาตรฐานความปลอดภัยการบิน", "การสื่อสารภาษาอังกฤษการบิน"],
      icon: "flight_takeoff",
      badge: "อุตสาหกรรมการบินและการบริการ",
      desc: "เตรียมความพร้อมบุคลากรสายงานบริการภาคพื้นท่าอากาศยาน สายการบิน และการบริการการบินครบวงจร",
    },
    {
      id: "energy",
      name: "แผนกวิชาเทคนิคพลังงาน",
      subName: "Energy Technology",
      levels: ["ปวส."],
      skills: ["การติดตั้งระบบโซลาร์เซลล์ Solar Rooftop", "การตรวจสอบและอนุรักษ์พลังงานในอาคาร", "ระบบกักเก็บพลังงาน Energy Storage", "พลังงานชีวมวลและพลังงานทดแทน"],
      icon: "solar_power",
      badge: "พลังงานสะอาดและพลังงานทดแทน",
      desc: "ฝึกทักษะการออกแบบ ติดตั้ง และซ่อมบำรุงระบบพลังงานแสงอาทิตย์ พลังงานทดแทน และการจัดการพลังงานในสถานประกอบการ",
    },
  ];

  const totalDeptPages = Math.ceil(allActualDepartments.length / deptPageSize);
  const paginatedDepartments = allActualDepartments.slice(
    (deptPage - 1) * deptPageSize,
    deptPage * deptPageSize
  );

  return (
    <div className="overflow-hidden space-y-12 pb-16">
      {/* Hero Section for External Users / Enterprises */}
      <section className="hero-gradient relative py-xl md:py-24 px-margin-mobile pt-24 overflow-hidden">
        <div className="max-w-container-max mx-auto grid md:grid-cols-2 gap-lg items-center relative z-10">
          <div className="space-y-md">
            <div className="inline-flex items-center gap-xs bg-secondary-container text-on-secondary-container px-3.5 py-1 rounded-full">
              <span className="material-symbols-outlined text-[18px]">handshake</span>
              <span className="font-label-sm text-label-sm font-bold">
                ศูนย์ความร่วมมือสถานประกอบการและบุคคลภายนอก
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg md:text-[48px] leading-tight text-primary font-bold">
              เชื่อมต่อกำลังคนสายอาชีพ <br />
              <span className="text-secondary">วิทยาลัยเทคนิคหาดใหญ่</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
              ยินดีต้อนรับสถานประกอบการและบุคคลภายนอก เข้าถึงข้อมูลสาขาวิชาช่างอุตสาหกรรมและเทคโนโลยี พร้อมระบบรับสมัครนักศึกษาฝึกงานระดับ ปวช./ปวส./ทล.บ. ที่ผ่านการรับรองมาตรฐานวิชาชีพ
            </p>
            <div className="flex flex-wrap gap-md pt-base">
              <Link
                href="/employer/register"
                className="bg-primary text-on-primary px-lg py-4 rounded-xl font-label-md text-label-md shadow-lg flex items-center gap-sm hover:scale-105 transition-transform font-bold"
              >
                <span className="material-symbols-outlined">how_to_reg</span>
                ลงทะเบียนสถานประกอบการ
              </Link>
              <Link
                href="/jobs"
                className="border-2 border-secondary text-secondary px-lg py-4 rounded-xl font-label-md text-label-md hover:bg-surface-container-high transition-colors font-bold flex items-center gap-sm"
              >
                <span className="material-symbols-outlined">work</span>
                ดูตำแหน่งฝึกงานที่เปิดรับ ({activeJobs.length})
              </Link>
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>

            {/* Clean Professional Highlight Cards (No Stars / No Percentages) */}
            <div className="grid grid-cols-2 gap-md">
              <div className="bg-surface border border-outline-variant p-md rounded-2xl shadow-sm mt-lg space-y-2">
                <span className="material-symbols-outlined text-secondary text-headline-md">engineering</span>
                <div>
                  <div className="text-xs text-on-surface-variant font-medium">มาตรฐานหลักสูตรวิชาชีพ</div>
                  <div className="font-headline-sm text-headline-sm text-primary font-bold mt-1">
                    มาตรฐาน สอศ.
                  </div>
                </div>
                <div className="text-[11px] text-on-surface-variant">ครอบคลุม 18 แผนกวิชาช่างและเทคโนโลยี วิทยาลัยเทคนิคหาดใหญ่</div>
              </div>

              <div className="bg-gradient-to-br from-[#00677c] via-secondary to-[#003c49] text-white p-md rounded-2xl shadow-lg relative overflow-hidden space-y-2">
                <span className="material-symbols-outlined text-white text-headline-md z-10 relative">verified</span>
                <div className="z-10 relative">
                  <div className="text-xs text-white/80 font-medium">ความร่วมมือทวิภาคี</div>
                  <div className="font-headline-sm text-headline-sm text-white font-bold mt-1">
                    ระบบทวิภาคีเข้มข้น
                  </div>
                </div>
                <div className="text-[11px] text-white/80 z-10 relative">ฝึกปฏิบัติงานจริงร่วมกับสถานประกอบการ</div>
                <img
                  src="/logo-htc.png"
                  className="absolute -right-4 -bottom-4 w-24 h-24 opacity-25 transform rotate-[25deg] pointer-events-none select-none"
                  alt=""
                />
              </div>
            </div>

            {/* Professional Collaboration Quote Banner */}
            <div className="mt-md bg-white p-md rounded-2xl border border-outline-variant shadow-sm flex items-center gap-md">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center font-bold text-primary shrink-0">
                <span className="material-symbols-outlined text-secondary">handshake</span>
              </div>
              <div>
                <div className="font-label-md text-label-md text-primary font-bold">
                  "พร้อมร่วมมือพัฒนาทักษะวิชาชีพตรงตามความต้องการของสถานประกอบการ"
                </div>
                <div className="font-label-sm text-label-sm text-on-surface-variant">
                  งานความร่วมมือและฝึกงานวิชาชีพ วิทยาลัยเทคนิคหาดใหญ่
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student Verification Prompt Banner for HTC Students using Personal Gmail */}
      <section className="px-margin-mobile -mt-8 relative z-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-sky-900 to-primary text-white rounded-2xl p-5 shadow-xl border border-white/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 shrink-0">
              <span className="material-symbols-outlined text-[24px]">school</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                คุณเป็นนักศึกษา วท.หาดใหญ่ แต่ใช้อีเมลส่วนตัวใช่หรือไม่?
              </h3>
              <p className="text-xs text-slate-200 mt-0.5">
                หากคุณใช้อีเมลภายนอก สามารถยื่นหลักฐานบัตรนักศึกษาเพื่อเปิดสิทธิ์การใช้งานของนักศึกษาได้ทันที
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsVerifyModalOpen(true)}
            className="whitespace-nowrap bg-amber-400 hover:bg-amber-300 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            ยื่นคำขออนุมัติสิทธิ์นักศึกษา
          </button>
        </div>
      </section>

      {/* SECTION 1: สาขาวิชาที่มีในวิทยาลัยเทคนิคหาดใหญ่ (6 departments per page with pagination) */}
      <section id="htc-departments-section" className="max-w-container-max mx-auto px-margin-mobile pt-4 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
          <div className="space-y-1">
            <span className="text-label-md text-secondary font-bold uppercase tracking-wider">
              HTC DEPARTMENTS ({allActualDepartments.length} แผนกวิชา)
            </span>
            <h2 className="font-headline-md text-headline-md text-primary font-bold">
              สาขาวิชาที่เปิดสอนจริงในวิทยาลัยเทคนิคหาดใหญ่
            </h2>
            <p className="text-body-sm text-body-sm text-on-surface-variant">
              ข้อมูลหลักสูตร ระดับการศึกษาที่เปิดสอน และทักษะสมรรถนะนักศึกษาสำหรับสถานประกอบการที่ต้องการรับนักศึกษาฝึกงาน
            </p>
          </div>
        </div>

        {/* 6 Departments Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-md">
          {paginatedDepartments.map((dept) => (
            <div
              key={dept.id}
              className="bg-surface rounded-2xl p-6 border border-outline-variant shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-surface-container-high text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[24px]">{dept.icon}</span>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                    {dept.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-primary text-base group-hover:text-secondary transition-colors">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium">{dept.subName}</p>
                  <p className="text-xs text-on-surface-variant/80 mt-1.5 leading-relaxed">
                    {dept.desc}
                  </p>
                </div>

                {/* Levels Offered (No Stars) */}
                <div className="flex items-center gap-1.5 text-xs py-2 border-y border-outline-variant">
                  <span className="text-on-surface-variant font-medium">ระดับที่เปิดสอน:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {dept.levels.map((lvl) => (
                      <span
                        key={lvl}
                        className="bg-surface-container-highest text-primary font-bold px-2 py-0.5 rounded text-[11px]"
                      >
                        {lvl}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key Skills */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                    ทักษะสมรรถนะประจำสาขา:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {dept.skills.map((s, i) => (
                      <span key={i} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        • {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-outline-variant">
                <Link
                  href={`/jobs?department=${encodeURIComponent(dept.name)}`}
                  className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-primary hover:text-secondary py-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  <span>ดูตำแหน่งงานหรือประกาศรับฝึกงานสาขานี้</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={deptPage}
          totalPages={totalDeptPages}
          onPageChange={(p) => {
            setDeptPage(p);
          }}
          className="mt-6"
          scrollTargetId="htc-departments-section"
        />
      </section>

      {/* SECTION 2: สถานประกอบการที่เปิดรับนักศึกษาฝึกงานอยู่ตอนนี้ (Currently Hiring Employers & Openings) */}
      <section className="max-w-container-max mx-auto px-margin-mobile pt-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[16px]">work</span>
              <span>NOW HIRING INTERNS</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-primary font-bold">
              สถานประกอบการที่เปิดรับนักศึกษาฝึกงานอยู่ตอนนี้
            </h2>
            <p className="text-body-sm text-body-sm text-on-surface-variant mt-1">
              ตำแหน่งงานและสถานที่ฝึกงานจริงที่กำลังเปิดรับสมัครนักศึกษา วท.หาดใหญ่ ในขณะนี้
            </p>
          </div>

          <Link
            href="/jobs"
            className="text-secondary font-bold text-xs hover:underline flex items-center gap-1 whitespace-nowrap"
          >
            ดูตำแหน่งงานทั้งหมด <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {activeJobs.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-outline-variant p-8 text-center text-on-surface-variant space-y-2">
            <span className="material-symbols-outlined text-4xl text-secondary">work_outline</span>
            <p className="text-sm font-bold text-primary">พร้อมเปิดรับประกาศรับนักศึกษาฝึกงานจากสถานประกอบการ</p>
            <Link
              href="/employer/register"
              className="inline-block px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl mt-2 hover:bg-primary-container"
            >
              + ลงทะเบียนประกาศรับสมัครงาน
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-md">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="bg-surface rounded-2xl p-5 border border-outline-variant shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1">
                        กำลังเปิดรับสมัคร
                      </span>
                      <h4 className="font-bold text-primary text-sm line-clamp-1">{job.title}</h4>
                      <p className="text-xs text-on-surface-variant font-medium mt-0.5">{job.company_name}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center font-bold text-primary text-xs shrink-0">
                      {job.company_name?.[0] || "C"}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-on-surface-variant pt-2 border-t border-outline-variant/60">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">school</span>
                      <span>สาขา: {job.department || "ทุกสาขาวิชา"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                      <span className="truncate">{job.location || "อำเภอหาดใหญ่ จังหวัดสงขลา"}</span>
                    </div>
                    {job.daily_allowance && (
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">payments</span>
                        <span>เบี้ยเลี้ยง: ฿{job.daily_allowance} / วัน</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-outline-variant">
                  <Link
                    href={`/jobs`}
                    className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-secondary hover:text-primary py-1 rounded-lg hover:bg-surface-container transition-colors"
                  >
                    <span>ดูรายละเอียดตำแหน่งงาน</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Student Verification Modal */}
      <StudentVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        userEmail={currentUser?.email}
      />
    </div>
  );
}
