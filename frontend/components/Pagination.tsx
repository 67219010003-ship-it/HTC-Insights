"use client";

import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = [];
  // Build page numbers cleanly
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className={`flex justify-center items-center gap-2 py-6 my-2 ${className}`}>
      {/* Previous Page Button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        aria-label="หน้าก่อนหน้า"
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary shadow-sm transition-all disabled:opacity-30 disabled:hover:border-outline-variant/40 disabled:hover:text-on-surface-variant disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_left</span>
      </button>

      {/* First Page button if not in range */}
      {startPage > 1 && (
        <>
          <button
            type="button"
            onClick={() => onPageChange(1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:border-primary font-bold shadow-sm transition-all cursor-pointer"
          >
            1
          </button>
          {startPage > 2 && (
            <span className="px-1 text-on-surface-variant text-xs select-none">...</span>
          )}
        </>
      )}

      {/* Page Numbers */}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl font-bold transition-all cursor-pointer ${
            p === currentPage
              ? "bg-primary text-on-primary shadow-md scale-105"
              : "border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary shadow-sm"
          }`}
        >
          {p}
        </button>
      ))}

      {/* Last Page button if not in range */}
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && (
            <span className="px-1 text-on-surface-variant text-xs select-none">...</span>
          )}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:border-primary font-bold shadow-sm transition-all cursor-pointer"
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next Page Button */}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        aria-label="หน้าถัดไป"
        className="w-10 h-10 flex items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:border-primary hover:text-primary shadow-sm transition-all disabled:opacity-30 disabled:hover:border-outline-variant/40 disabled:hover:text-on-surface-variant disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
      </button>
    </div>
  );
}
