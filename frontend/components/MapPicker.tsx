"use client";

import dynamic from "next/dynamic";

const MapPickerInner = dynamic(() => import("./MapPickerInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 bg-surface-container-low border border-outline-variant rounded-2xl flex flex-col items-center justify-center space-y-md">
      <span className="material-symbols-outlined text-[48px] text-on-surface-variant animate-spin">
        sync
      </span>
      <p className="font-body-md text-body-md text-on-surface-variant font-bold">
        กำลังโหลดแผนที่ระบบจริง...
      </p>
    </div>
  ),
});

interface MapPickerProps {
  initialLat: number;
  initialLng: number;
  onLocationChange: (info: {
    lat: number;
    lng: number;
    address: string;
    name?: string;
    phone?: string;
    website?: string;
  }) => void;
}

export default function MapPicker(props: MapPickerProps) {
  return <MapPickerInner {...props} />;
}
