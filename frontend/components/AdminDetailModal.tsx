"use client";

import React from "react";

export interface AdminDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    type: "review" | "post" | "job" | "upgrade" | "report" | "employer" | "comment";
    title?: string;
    data: any;
  } | null;
}

export default function AdminDetailModal({
  isOpen,
  onClose,
  item,
}: AdminDetailModalProps) {
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);

  if (!isOpen || !item || !item.data) return null;

  const { type, data } = item;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-outline-variant max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-outline-variant/40 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">
                {type === "review" && "rate_review"}
                {type === "post" && "forum"}
                {type === "comment" && "chat"}
                {type === "job" && "work"}
                {type === "upgrade" && "school"}
                {type === "report" && "flag"}
                {type === "employer" && "domain"}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                {type === "review" && "รายละเอียดรีวิวฉบับเต็ม"}
                {type === "post" && "เนื้อหากระทู้ฉบับเต็ม"}
                {type === "comment" && "รายละเอียดความคิดเห็น"}
                {type === "job" && "รายละเอียดประกาศงานฉบับเต็ม"}
                {type === "upgrade" && "คำขอยืนยันสิทธิ์นักศึกษา"}
                {type === "report" && "รายละเอียดรายงานความไม่เหมาะสม"}
                {type === "employer" && "ข้อมูลสถานประกอบการ"}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-primary font-headline">
              {item.title || data.title || data.company_name || data.post_title || "รายละเอียดข้อมูล"}
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>ผู้เขียน:</span>
                      <strong className="text-primary">{data.real_author || "นักศึกษา"}</strong>
                    </div>
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
                    {data.photos.map((p: any, i: number) => {
                      const imgUrl = p.photo_url || p;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPreviewImage(imgUrl)}
                          className="group relative block rounded-xl overflow-hidden border border-outline-variant hover:opacity-90 cursor-pointer text-left"
                        >
                          <img src={imgUrl} alt="Review attachment" className="w-full h-24 object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                          </div>
                        </button>
                      );
                    })}
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

          {/* 2.1 COMMENT DETAIL */}
          {type === "comment" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/30 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div>ผู้แสดงความคิดเห็น: <strong className="text-primary">{data.author_name || "นักศึกษา"}</strong> ({data.author_email || "-"})</div>
                <div>กระทู้ที่ตอบกลับ: <strong className="text-secondary">{data.post_title || "กระทู้"}</strong></div>
                <div>วันที่: <span className="font-mono">{data.created_at || "-"}</span></div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-primary text-xs">ข้อความความคิดเห็น:</h4>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>สถานประกอบการ: <strong className="text-primary font-bold">{data.employer_name || data.company_name}</strong></div>
                  <div>อีเมลบัญชีผู้ลงประกาศ: <span className="font-mono text-primary font-bold">{data.poster_email || data.employer_email || data.email || "-"}</span></div>
                  {data.contact_email && data.contact_email !== (data.poster_email || data.employer_email) && (
                    <div>อีเมลติดต่อรับสมัคร: <span className="font-mono text-secondary font-bold">{data.contact_email}</span></div>
                  )}
                  <div>เบอร์โทรศัพท์ติดต่อ: <strong className="text-on-surface">{data.phone || data.employer_phone || "-"}</strong></div>
                  <div>LINE ID: <strong className="text-on-surface font-mono">{data.line_id || "-"}</strong></div>
                  <div>ผู้ประสานงาน / HR: <strong className="text-on-surface">{data.contact_person || "-"}</strong></div>
                  <div>แผนกวิชาที่เปิดรับ: <strong className="text-secondary">{data.department || "ทุกแผนกวิชา"}</strong></div>
                  <div>เบี้ยเลี้ยง: {data.daily_allowance ? `${data.daily_allowance} บาท/วัน` : "ไม่มีเบี้ยเลี้ยง"}</div>
                  <div>สถานที่ตั้ง: {data.location || "-"}</div>
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
                  <button
                    type="button"
                    onClick={() => setPreviewImage(data.card_image_url)}
                    className="w-full group relative rounded-2xl overflow-hidden border border-outline-variant max-h-80 bg-slate-900 flex items-center justify-center p-2 cursor-pointer"
                  >
                    <img
                      src={data.card_image_url}
                      alt="Student ID card proof"
                      className="max-h-72 object-contain rounded-xl shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <span className="material-symbols-outlined text-[24px]">zoom_in</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. REPORT DETAIL */}
          {type === "report" && (
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>ประเภทเนื้อหา: <strong className="text-rose-700 font-bold">{data.target_type_th || data.target_type || "กระทู้/รีวิว"}</strong></div>
                  <div>
                    ID เนื้อหาเป้าหมาย: <strong className="text-primary font-mono font-bold">#{data.target_id || data.review_id || data.post_id || "-"}</strong>
                  </div>
                  {data.target_title && (
                    <div className="sm:col-span-2">
                      หัวข้อเป้าหมาย: <strong className="text-primary">{data.target_title}</strong>
                    </div>
                  )}
                  <div>ผู้รายงาน: {data.reporter_name || "ผู้ใช้งาน"}</div>
                  <div>อีเมลผู้รายงาน: <span className="font-mono">{data.reporter_email || "-"}</span></div>
                  <div>วันที่ส่งรายงาน: <span className="font-mono">{data.created_at || "-"}</span></div>
                  <div>สถานะปัจจุบัน: <span className="font-bold uppercase text-secondary">{data.status || "pending"}</span></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-rose-800 text-xs">เหตุผลในการรายงาน:</h4>
                <p className="p-3.5 bg-rose-50 text-rose-900 rounded-xl border border-rose-200 leading-relaxed whitespace-pre-wrap">
                  {data.reason || "ไม่ระบุเหตุผล"}
                </p>
              </div>

              {data.target_content && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-primary text-xs">ข้อความในเนื้อหาที่ถูกรายงาน:</h4>
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

    {/* Lightbox Preview Modal inside AdminDetailModal */}
    {previewImage && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => setPreviewImage(null)}
      >
        <div
          className="relative max-w-4xl w-full max-h-[90vh] bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/30 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 bg-surface-container border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">image</span>
              <h3 className="font-bold text-primary text-sm">ดูภาพถ่ายขยาย</h3>
            </div>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="flex-1 p-4 bg-slate-950 flex items-center justify-center overflow-auto">
            <img
              src={previewImage}
              alt="Enlarged preview"
              className="max-h-[75vh] w-auto object-contain rounded-xl shadow-lg"
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
