"use client";

import { useState, useEffect, useCallback } from "react";

interface ImageLightboxModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageLightboxModal({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}: ImageLightboxModalProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    },
    [isOpen, onClose, images.length]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || images.length === 0) return null;

  const currentImg = images[index] || images[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none"
      onClick={onClose}
    >
      {/* Top Bar / Close Button */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        {images.length > 1 && (
          <span className="text-white/90 text-xs sm:text-sm font-bold bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
            {index + 1} / {images.length}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer border border-white/25 shadow-lg"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </div>

      {/* Prev Button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
          }}
          className="absolute left-3 sm:left-6 z-50 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer border border-white/25 shadow-lg"
          aria-label="Previous Image"
        >
          <span className="material-symbols-outlined text-[24px]">chevron_left</span>
        </button>
      )}

      {/* Main Image Container - Constrained to prevent any overflow on any device */}
      <div
        className="relative max-w-5xl max-h-[85vh] w-full flex flex-col items-center justify-center overflow-hidden p-1 sm:p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImg}
          alt={`Preview image ${index + 1}`}
          className="max-h-[75vh] sm:max-h-[80vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300 pointer-events-auto"
        />
      </div>

      {/* Next Button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
          }}
          className="absolute right-3 sm:right-6 z-50 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer border border-white/25 shadow-lg"
          aria-label="Next Image"
        >
          <span className="material-symbols-outlined text-[24px]">chevron_right</span>
        </button>
      )}
    </div>
  );
}
