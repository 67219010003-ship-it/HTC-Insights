"use client";

import { useState, useRef, useEffect } from "react";

export interface DepartmentOption {
  value: string;
  label: string;
  icon: string;
}

export const ALL_DEPARTMENTS: DepartmentOption[] = [
  { value: "", label: "แผนกวิชาทั้งหมด", icon: "category" },
  { value: "แผนกวิชาเทคโนโลยีสารสนเทศ", label: "แผนกวิชาเทคโนโลยีสารสนเทศ", icon: "laptop_chromebook" },
  { value: "แผนกวิชาช่างอิเล็กทรอนิกส์", label: "แผนกวิชาช่างอิเล็กทรอนิกส์", icon: "memory" },
  { value: "แผนกวิชาช่างไฟฟ้ากำลัง", label: "แผนกวิชาช่างไฟฟ้ากำลัง", icon: "bolt" },
  { value: "แผนกวิชาช่างยนต์", label: "แผนกวิชาช่างยนต์", icon: "directions_car" },
  { value: "แผนกวิชาช่างกลโรงงาน", label: "แผนกวิชาช่างกลโรงงาน", icon: "precision_manufacturing" },
  { value: "แผนกวิชาช่างเชื่อมโลหะ", label: "แผนกวิชาช่างเชื่อมโลหะ", icon: "hvac" },
  { value: "แผนกวิชาช่างก่อสร้าง", label: "แผนกวิชาช่างก่อสร้าง", icon: "construction" },
  { value: "แผนกวิชาช่างโยธา", label: "แผนกวิชาช่างโยธา", icon: "architecture" },
  { value: "แผนกวิชาเทคนิคสถาปัตยกรรม", label: "แผนกวิชาเทคนิคสถาปัตยกรรม", icon: "domain" },
  { value: "แผนกวิชาช่างสำรวจ", label: "แผนกวิชาช่างสำรวจ", icon: "square_foot" },
  { value: "แผนกวิชาเครื่องทำความเย็นและปรับอากาศ", label: "แผนกวิชาเครื่องทำความเย็นและปรับอากาศ", icon: "ac_unit" },
  { value: "แผนกวิชาช่างเครื่องเรือนและตกแต่งภายใน", label: "แผนกวิชาช่างเครื่องเรือนและตกแต่งภายใน", icon: "chair" },
  { value: "แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์", label: "แผนกวิชาเมคคาทรอนิกส์และหุ่นยนต์", icon: "smart_toy" },
  { value: "แผนกวิชาการจัดการโลจิสติกส์และซัพลายเชน", label: "แผนกวิชาการจัดการโลจิสติกส์", icon: "local_shipping" },
  { value: "แผนกวิชาการบัญชี", label: "แผนกวิชาการบัญชี", icon: "receipt_long" },
  { value: "แผนกวิชาการตลาด", label: "แผนกวิชาการตลาด", icon: "storefront" },
  { value: "แผนกวิชาคอมพิวเตอร์ธุรกิจ", label: "แผนกวิชาคอมพิวเตอร์ธุรกิจ", icon: "desktop_windows" },
  { value: "แผนกวิชาเทคนิคควบคุมและซ่อมบำรุงระบบขนส่งทางราง", label: "แผนกวิชาเทคนิคซ่อมบำรุงระบบขนส่งทางราง", icon: "train" },
  { value: "แผนกวิชาเทคโนโลยีเครื่องมือวัดและควบคุมปิโตรเลียม", label: "แผนกวิชาเทคโนโลยีปิโตรเลียม", icon: "oil_barrel" },
  { value: "แผนกวิชาเทคนิคพลังงาน", label: "แผนกวิชาเทคนิคพลังงาน", icon: "solar_power" },
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
}

export default function DepartmentDropdown({ value, onChange, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cleanValue = value ? value.replace("แผนกวิชา", "").trim() : "";
  const selectedDept = ALL_DEPARTMENTS.find((d) => {
    if (!value) return d.value === "";
    const cleanD = d.value.replace("แผนกวิชา", "").trim();
    return d.value === value || d.label === value || cleanD === cleanValue;
  }) || ALL_DEPARTMENTS[0];
  const displayIcon = mounted ? selectedDept.icon : ALL_DEPARTMENTS[0].icon;
  const displayLabel = mounted ? selectedDept.label.replace("แผนกวิชา", "").trim() : ALL_DEPARTMENTS[0].label;

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
        <div className="absolute left-0 right-0 top-14 bg-white border border-outline-variant rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-y-auto hide-scrollbar">
          <div className="px-3 py-2 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/50 mb-1 flex items-center justify-between">
            <span>เลือกแผนกวิชา ({ALL_DEPARTMENTS.length - 1} แผนก)</span>
          </div>

          {ALL_DEPARTMENTS.map((dept) => {
            const isSelected = dept.value === selectedDept.value;
            return (
              <button
                key={dept.label}
                type="button"
                onClick={() => {
                  onChange(dept.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-label-md text-label-md transition-all text-left cursor-pointer ${
                  isSelected
                    ? "bg-secondary-container text-on-secondary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span
                    className={`material-symbols-outlined text-[18px] shrink-0 ${
                      isSelected ? "text-secondary font-bold" : "text-on-surface-variant"
                    }`}
                  >
                    {dept.icon}
                  </span>
                  <span className="truncate">{dept.label}</span>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-secondary font-bold text-[18px] shrink-0">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
