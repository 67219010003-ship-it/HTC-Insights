"use client";

import { useState, useRef, useEffect } from "react";

export interface DepartmentOption {
  value: string;
  label: string;
  icon: string;
}

export const ALL_DEPARTMENTS: DepartmentOption[] = [
  { value: "", label: "แผนกวิชาทั้งหมด", icon: "category" },
  { value: "แผนกวิชาช่างยนต์", label: "แผนกวิชาช่างยนต์", icon: "directions_car" },
  { value: "แผนกวิชาช่างกลโรงงาน", label: "แผนกวิชาช่างกลโรงงาน", icon: "precision_manufacturing" },
  { value: "แผนกวิชาช่างเชื่อมโลหะ", label: "แผนกวิชาช่างเชื่อมโลหะ", icon: "hvac" },
  { value: "แผนกวิชาช่างไฟฟ้ากำลัง", label: "แผนกวิชาช่างไฟฟ้ากำลัง", icon: "bolt" },
  { value: "แผนกวิชาช่างอิเล็กทรอนิกส์", label: "แผนกวิชาช่างอิเล็กทรอนิกส์", icon: "memory" },
  { value: "แผนกวิชาช่างก่อสร้าง", label: "แผนกวิชาช่างก่อสร้าง", icon: "construction" },
  { value: "แผนกวิชาช่างโยธา", label: "แผนกวิชาช่างโยธา", icon: "architecture" },
  { value: "แผนกวิชาเทคนิคสถาปัตยกรรม", label: "แผนกวิชาเทคนิคสถาปัตยกรรม", icon: "domain" },
  { value: "แผนกวิชาช่างสำรวจ", label: "แผนกวิชาช่างสำรวจ", icon: "square_foot" },
  { value: "แผนกวิชาเครื่องทำความเย็นและปรับอากาศ", label: "แผนกวิชาเครื่องทำความเย็นและปรับอากาศ", icon: "ac_unit" },
  { value: "แผนกวิชาช่างเครื่องเรือนและตกแต่งภายใน", label: "แผนกวิชาช่างเครื่องเรือนและตกแต่งภายใน", icon: "chair" },
  { value: "แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์", label: "แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์", icon: "smart_toy" },
  { value: "แผนกวิชาเทคนิคพลังงาน", label: "แผนกวิชาเทคนิคพลังงาน", icon: "solar_power" },
  { value: "แผนกวิชาเทคนิคควบคุมและซ่อมบำรุงระบบขนส่งทางราง", label: "แผนกวิชาเทคนิคซ่อมบำรุงระบบขนส่งทางราง", icon: "train" },
  { value: "แผนกวิชาเทคโนโลยีเครื่องมือวัดและควบคุมปิโตรเลียม", label: "แผนกวิชาเทคโนโลยีปิโตรเลียม", icon: "oil_barrel" },
  { value: "แผนกวิชาเทคโนโลยีสารสนเทศ", label: "แผนกวิชาเทคโนโลยีสารสนเทศ", icon: "laptop_chromebook" },
  { value: "แผนกวิชาการจัดการโลจิสติกส์และซัพลายเชน", label: "แผนกวิชาการจัดการโลจิสติกส์", icon: "local_shipping" },
  { value: "แผนกวิชาธุรกิจการบิน", label: "แผนกวิชาธุรกิจการบิน", icon: "flight_takeoff" },
];

export const EDUCATION_LEVELS = [
  "ระดับประกาศนียบัตรวิชาชีพ (ปวช.)",
  "ระดับประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)",
  "ระดับปริญญาตรี (หลักสูตรเทคโนโลยีบัณฑิต - ทล.บ.)",
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  departmentCounts?: Record<string, number>;
  onlyAvailable?: boolean;
}

export default function DepartmentDropdown({
  value,
  onChange,
  className,
  departmentCounts,
  onlyAvailable = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getDeptCount = (deptVal: string): number | undefined => {
    if (!departmentCounts) return undefined;
    if (!deptVal) {
      return Object.values(departmentCounts).reduce((sum, n) => sum + n, 0);
    }
    const clean = deptVal.replace("แผนกวิชา", "").trim().toLowerCase();
    for (const [k, count] of Object.entries(departmentCounts)) {
      const cleanK = k.replace("แผนกวิชา", "").trim().toLowerCase();
      if (k === deptVal || cleanK === clean || cleanK.includes(clean) || clean.includes(cleanK)) {
        return count;
      }
    }
    return 0;
  };

  // Discover any custom departments from data that aren't in static list
  const extraDepts: DepartmentOption[] = Object.keys(departmentCounts || {})
    .filter((k) => {
      if (!k) return false;
      const cleanK = k.replace("แผนกวิชา", "").trim().toLowerCase();
      return !ALL_DEPARTMENTS.some((d) => {
        const cleanD = d.value.replace("แผนกวิชา", "").trim().toLowerCase();
        return d.value === k || cleanD === cleanK;
      });
    })
    .map((k) => ({
      value: k,
      label: k.startsWith("แผนกวิชา") ? k : `แผนกวิชา${k}`,
      icon: "school",
    }));

  const allAvailableOptions: DepartmentOption[] = [...ALL_DEPARTMENTS, ...extraDepts];

  const displayedOptions = onlyAvailable && departmentCounts
    ? allAvailableOptions.filter((d) => d.value === "" || (getDeptCount(d.value) ?? 0) > 0)
    : allAvailableOptions;

  const cleanValue = value ? value.replace("แผนกวิชา", "").trim().toLowerCase() : "";
  const selectedDept = allAvailableOptions.find((d) => {
    if (!value) return d.value === "";
    const cleanD = d.value.replace("แผนกวิชา", "").trim().toLowerCase();
    const cleanLabel = d.label.replace("แผนกวิชา", "").trim().toLowerCase();
    return d.value === value || d.label === value || cleanD === cleanValue || cleanLabel === cleanValue;
  }) || allAvailableOptions[0];

  const selectedCount = getDeptCount(selectedDept.value);
  const displayIcon = mounted ? selectedDept.icon : ALL_DEPARTMENTS[0].icon;
  const baseLabel = mounted ? selectedDept.label.replace("แผนกวิชา", "").trim() : ALL_DEPARTMENTS[0].label;
  const displayLabel = selectedCount !== undefined && selectedDept.value !== ""
    ? `${baseLabel} (${selectedCount} แห่ง)`
    : baseLabel;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={className || "relative w-full"} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white hover:bg-surface-container-low border border-outline-variant rounded-xl text-left font-body-sm text-body-sm text-primary font-bold shadow-sm transition-all duration-200 focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">
            {displayIcon}
          </span>
          <span className="truncate">{displayLabel}</span>
        </div>
        <span
          className={`material-symbols-outlined text-on-surface-variant text-[20px] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-secondary" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Upgraded Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-14 bg-white border border-outline-variant rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-60 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/50 mb-1 flex items-center justify-between">
            <span>
              {onlyAvailable && departmentCounts ? "แผนกวิชาที่มีข้อมูลสถานที่ฝึกงาน" : `เลือกแผนกวิชา (${displayedOptions.filter((d) => d.value !== "").length} แผนก)`}
            </span>
          </div>

          {displayedOptions.map((dept) => {
            const isSelected = dept.value === selectedDept.value;
            const count = getDeptCount(dept.value);
            const hasData = count === undefined || count > 0 || dept.value === "";

            return (
              <button
                key={dept.label + dept.value}
                type="button"
                onClick={() => {
                  onChange(dept.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-label-md text-label-md transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-secondary-container text-on-secondary-container font-bold"
                    : hasData
                    ? "text-on-surface-variant hover:bg-surface-container-high hover:text-primary font-medium"
                    : "text-outline/70 hover:bg-surface-container-low hover:text-on-surface-variant"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                  <span
                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                      isSelected
                        ? "text-secondary font-bold"
                        : hasData
                        ? "text-on-surface-variant"
                        : "text-outline"
                    }`}
                  >
                    {dept.icon}
                  </span>
                  <span className="truncate">{dept.label}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {count !== undefined && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                        isSelected
                          ? "bg-secondary text-on-secondary"
                          : count > 0
                          ? "bg-secondary-container/60 text-secondary"
                          : "bg-surface-container text-on-surface-variant/60"
                      }`}
                    >
                      {dept.value === "" ? `${count} แห่ง` : `${count} แห่ง`}
                    </span>
                  )}
                  {isSelected && (
                    <span className="material-symbols-outlined text-secondary font-bold text-[18px]">
                      check
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
