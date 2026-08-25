"use client";

import React from "react";

export interface AdminDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    type: "review" | "post" | "job" | "upgrade" | "report" | "employer";
    title?: string;
    data: any;
  } | null;
}

export default function AdminDetailModal({
  isOpen,
  onClose,
  item,
}: AdminDetailModalProps) {
  if (!isOpen || !item || !item.data) return null;

  const { type, data } = item;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-outline-variant max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-outline-variant/40 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">
                {type === "review" && "rate_review"}
                {type === "post" && "forum"}
                {type === "job" && "work"}
                {type === "upgrade" && "school"}
                {type === "report" && "flag"}
                {type === "employer" && "domain"}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                {type === "review" && "รายละเอียดรีวิวฉบับเต็ม"}
                {type === "post" && "เนื้อหากระทู้ฉบับเต็ม"}
                {type === "job" && "รายละเอียดประกาศงานฉบับเต็ม"}
                {type === "upgrade" && "คำขอยืนยันสิทธิ์นักศึกษา"}
                {type === "report" && "รายละเอียดรายงานความไม่เหมาะสม"}
                {type === "employer" && "ข้อมูลสถานประกอบการ"}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-primary font-headline">
              {item.title || data.title || data.company_name || "รายละเอียดข้อมูล"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Content based on type */}
        <div className="space-y-4 text-xs sm:text-sm">
          {/* 1. REVIEW DETAIL */}
          {type === "review" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30 text-center">
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold block">คะแนนภาพรวม</span>
                  <span className="text-base font-bold text-secondary flex items-center justify-center gap-0.5 mt-0.5">
                    <span className="material-symbols-outlined text-[18px] active-tab">star</span>
                    {data.score_overall} / 5
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold block">งานที่ได้รับมอบหมาย</span>
                  <span className="text-sm font-bold text-primary">{data.score_work || "-"} / 5</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold block">บรรยากาศ & สังคม</span>
                  <span className="text-sm font-bold text-primary">{data.score_env || "-"} / 5</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold block">พี่เลี้ยง & การสอนงาน</span>
                  <span className="text-sm font-bold text-primary">{data.score_mentor || "-"} / 5</span>
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="font-bold text-primary text-xs">ข้อมูลผู้เขียนและช่วงเวลาฝึกงาน:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-on-surface-variant">
                  <div>ผู้เขียน: <strong className="text-primary">{data.real_author || (data.is_anonymous ? "ไม่ระบุตัวตน" : "นักศึกษา")}</strong></div>
                  <div>อีเมล: {data.real_email || "-"}</div>
                  <div>แผนกวิชา: {data.department || "-"}</div>
                  <div>ช่วงเวลาฝึกงาน: {data.period_start || "-"} ถึง {data.period_end || "-"}</div>
                  <div>เบี้ยเลี้ยง: {data.daily_allowance ? `${data.daily_allowance} บาท/วัน` : "ไม่มีเบี้ยเลี้ยง"}</div>
                  <div>เวลาทำงาน: {data.work_start_time || "-"} - {data.work_end_time || "-"} น.</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-primary text-xs">ลักษณะงานและสิ่งที่ได้ทำจริง:</h4>
                <p className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 leading-relaxed whitespace-pre-wrap">
                  {data.text_work}
                </p>
              </div>

              {data.text_pros && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-emerald-800 text-xs">จุดเด่น / ข้อดี:</h4>
                  <p className="p-3.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 leading-relaxed whitespace-pre-wrap">
                    {data.text_pros}
                  </p>
                </div>
              )}

              {data.text_cons && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-rose-800 text-xs">ข้อจำกัด / ข้อควรปรับปรุง:</h4>
                  <p className="p-3.5 bg-rose-50 text-rose-900 rounded-xl border border-rose-200 leading-relaxed whitespace-pre-wrap">
                    {data.text_cons}
                  </p>
                </div>
              )}

              {data.text_advice && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-primary text-xs">คำแนะนำแก่น้องๆ รุ่นต่อไป:</h4>
                  <p className="p-3.5 bg-sky-50 text-sky-900 rounded-xl border border-sky-200 leading-relaxed whitespace-pre-wrap">
                    {data.text_advice}
                  </p>
                </div>
              )}

              {data.photos && data.photos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-primary text-xs">รูปภาพประกอบ ({data.photos.length}):</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {data.photos.map((p: any, i: number) => (
                      <a key={i} href={p.photo_url || p} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-outline-variant hover:opacity-90">
                        <img src={p.photo_url || p} alt="Review attachment" className="w-full h-24 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. POST DETAIL */}
          {type === "post" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>ผู้โพสต์: <strong className="text-primary">{data.author_name}</strong> ({data.author_email || "-"})</div>
                <div>หมวดหมู่: <span className="font-bold text-secondary">{data.type || "ทั่วไป"}</span></div>
                <div>วันที่: <span className="font-mono">{data.created_at || "-"}</span></div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-primary text-xs">เนื้อหากระทู้:</h4>
                <p className="p-4 bg-white rounded-2xl border border-outline-variant/40 leading-relaxed whitespace-pre-wrap text-on-surface">
                  {data.content}
                </p>
              </div>
            </div>
          )}

          {/* 3. JOB DETAIL */}
          {type === "job" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>สถานประกอบการ: <strong className="text-primary">{data.employer_name || data.company_name}</strong></div>
                  <div>สถานที่ตั้ง: {data.location || "-"}</div>
                  <div>แผนกวิชาที่เปิดรับ: <strong className="text-secondary">{data.department || "ทุกแผนกวิชา"}</strong></div>
                  <div>เบี้ยเลี้ยง: {data.daily_allowance ? `${data.daily_allowance} บาท/วัน` : "ไม่มีเบี้ยเลี้ยง"}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-primary text-xs">รายละเอียดและคุณสมบัติที่ต้องการ:</h4>
                <p className="p-4 bg-white rounded-2xl border border-outline-variant/40 leading-relaxed whitespace-pre-wrap text-on-surface">
                  {data.description}
                </p>
              </div>

              {data.highlights && data.highlights.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-primary text-xs">คุณสมบัติสำคัญ:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-on-surface-variant">
                    {data.highlights.map((h: string, i: number) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 4. UPGRADE REQUEST DETAIL */}
          {type === "upgrade" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>ผู้ยื่นคำขอ: <strong className="text-primary">{data.user_name || "-"}</strong></div>
                  <div>อีเมลส่วนตัว: {data.user_email || "-"}</div>
                  <div>รหัสนักศึกษา: <strong className="font-mono text-primary">{data.student_id}</strong></div>
                  <div>แผนกวิชา: {data.department || "-"}</div>
                  <div>ระดับชั้น: {data.level || "-"}</div>
                  <div>เบอร์โทรศัพท์: {data.phone || "-"}</div>
                </div>
              </div>

              {data.reason && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-primary text-xs">เหตุผลหรือหมายเหตุเพิ่มเติม:</h4>
                  <p className="p-3.5 bg-white rounded-xl border border-outline-variant/30 leading-relaxed whitespace-pre-wrap">
                    {data.reason}
                  </p>
                </div>
              )}

              {data.card_image_url && (
                <div className="space-y-2">
                  <h4 className="font-bold text-primary text-xs">ภาพถ่ายหลักฐานบัตรประจำตัวนักศึกษา:</h4>
                  <div className="rounded-2xl overflow-hidden border border-outline-variant max-h-80 bg-slate-900 flex items-center justify-center p-2">
                    <a href={data.card_image_url} target="_blank" rel="noreferrer">
                      <img src={data.card_image_url} alt="Student ID card proof" className="max-h-72 object-contain rounded-xl hover:scale-102 transition-transform" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. REPORT DETAIL */}
          {type === "report" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>ประเภทเนื้อหาที่รายงาน: <strong className="text-rose-700 uppercase">{data.target_type || "กระทู้/รีวิว"}</strong></div>
                  <div>ID เนื้อหาเป้าหมาย: #{data.target_id}</div>
                  <div>ผู้รายงาน: {data.reporter_name || data.reporter_email || "ผู้ใช้งาน"}</div>
                  <div>วันที่รายงาน: <span className="font-mono">{data.created_at || "-"}</span></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-rose-800 text-xs">เหตุผลในการรายงานความไม่เหมาะสม:</h4>
                <p className="p-3.5 bg-rose-50 text-rose-900 rounded-xl border border-rose-200 leading-relaxed whitespace-pre-wrap">
                  {data.reason || "ไม่ระบุเหตุผล"}
                </p>
              </div>

              {data.target_content && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-primary text-xs">ตัวอย่างเนื้อหาที่ถูกรายงาน:</h4>
                  <p className="p-3.5 bg-white rounded-xl border border-outline-variant/30 leading-relaxed whitespace-pre-wrap italic">
                    "{data.target_content}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 6. EMPLOYER DETAIL */}
          {type === "employer" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>ชื่อสถานประกอบการ: <strong className="text-primary">{data.company_name}</strong></div>
                  <div>อีเมลตัวแทน: {data.email}</div>
                  <div>ประเภทธุรกิจ: {data.industry || "-"}</div>
                  <div>เบอร์โทรศัพท์: {data.phone || "-"}</div>
                  <div>เว็บไซต์: {data.website || "-"}</div>
                  <div>ที่อยู่: {data.address || "-"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-outline-variant/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-surface-container text-on-surface-variant font-bold rounded-xl text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
