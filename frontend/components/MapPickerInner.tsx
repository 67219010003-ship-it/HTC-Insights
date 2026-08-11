"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet icon paths in Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerInnerProps {
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

const PRESET_MAP_LOCATIONS = [
  {
    name: "ศูนย์นวัตกรรมและเทคโนโลยี หาดใหญ่",
    address: "ถนนกาญจนวณิชย์ ต.คอหงส์ อ.หาดใหญ่ จ.สงขลา 90110",
    lat: 7.0084,
    lng: 100.4767,
    phone: "000-000-0000",
    website: "https://htc.ac.th",
  },
  {
    name: "นิคมอุตสาหกรรมภาคใต้ (ฉลุง หาดใหญ่)",
    address: "ต.ฉลุง อ.หาดใหญ่ จ.สงขลา 90110",
    lat: 6.9452,
    lng: 100.3541,
    phone: "000-000-000",
    website: "https://ieat.go.th",
  },
  {
    name: "สถานีพัฒนาเทคนิคไฟฟ้าและอิเล็กทรอนิกส์ สงขลา",
    address: "ถนนราษฎร์ยินดี อ.หาดใหญ่ จ.สงขลา 90110",
    lat: 7.0125,
    lng: 100.4851,
    phone: "000-000-000",
    website: "https://songkhla.go.th",
  },
];

export default function MapPickerInner({
  initialLat,
  initialLng,
  onLocationChange,
}: MapPickerInnerProps) {
  const [position, setPosition] = useState<L.LatLngExpression>([initialLat, initialLng]);
  const [loading, setLoading] = useState(false);
  const markerRef = useRef<L.Marker>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch address and information from coordinate using OpenStreetMap Nominatim API
  const fetchAddress = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th&extratags=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "HTC-Internship-Insight-Community-App",
        },
      });
      const data = await response.json();
      if (data) {
        // Construct a cleaner Thai address
        const addr = data.address || {};
        const road = addr.road || addr.suburb || "";
        const village = addr.village || "";
        const subdistrict = addr.suburb || addr.town || addr.village || "";
        const district = addr.city_district || addr.city || addr.town || "";
        const province = addr.province || addr.state || "";
        const postcode = addr.postcode || "";
        
        let formattedAddress = data.display_name;
        if (subdistrict && province) {
          formattedAddress = `${road ? road + ' ' : ''}${subdistrict} ${district} จังหวัด${province} ${postcode}`.trim();
        }

        // Try to identify a business/place name
        const placeTypes = [
          "amenity",
          "shop",
          "office",
          "company",
          "industrial",
          "tourism",
          "leisure",
          "building",
          "historic",
        ];
        let name = "";
        for (const type of placeTypes) {
          if (addr[type]) {
            name = addr[type];
            break;
          }
        }

        // Extract contact info if available in OSM tags
        const phone = data.extratags?.phone || data.extratags?.["contact:phone"] || "";
        const website = data.extratags?.website || data.extratags?.["contact:website"] || "";

        onLocationChange({
          lat,
          lng,
          address: formattedAddress,
          name: name || undefined,
          phone: phone || undefined,
          website: website || undefined,
        });
      }
    } catch (error) {
      console.error("Error geocoding coordinate:", error);
    } finally {
      setLoading(false);
    }
  };

  // Event handler for marker dragging
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          setPosition([latLng.lat, latLng.lng]);
          
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            fetchAddress(latLng.lat, latLng.lng);
          }, 800);
        }
      },
    }),
    []
  );

  // Map clicks handler
  function MapEvents() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          fetchAddress(e.latlng.lat, e.latlng.lng);
        }, 800);
      },
    });
    return null;
  }

  // Handle choosing preset location
  const handleSelectPreset = (preset: typeof PRESET_MAP_LOCATIONS[0]) => {
    setPosition([preset.lat, preset.lng]);
    onLocationChange({
      lat: preset.lat,
      lng: preset.lng,
      address: preset.address,
      name: preset.name,
      phone: preset.phone,
      website: preset.website,
    });
  };

  return (
    <div className="space-y-sm">
      <div className="bg-primary text-on-primary p-4 flex items-center justify-between rounded-t-2xl">
        <div className="flex items-center gap-2 font-bold text-label-md">
          <span className="material-symbols-outlined text-secondary-container">map</span>
          ปักหมุดตำแหน่งสถานประกอบการจริง (คลิกหรือลากหมุดบนแผนที่)
        </div>
        {loading ? (
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold animate-pulse">
            กำลังค้นหาที่อยู่...
          </span>
        ) : (
          <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">
            แผนที่ระบบจริง
          </span>
        )}
      </div>

      <div className="relative w-full h-64 bg-slate-100 border-x border-outline-variant overflow-hidden z-10">
        <MapContainer
          center={position}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
            icon={defaultIcon}
          >
            <Popup>หมุดสถานประกอบการหลัก</Popup>
          </Marker>
          
          {/* Preset Markers */}
          {PRESET_MAP_LOCATIONS.map((preset, idx) => (
            <Marker
              key={idx}
              position={[preset.lat, preset.lng]}
              icon={defaultIcon}
              eventHandlers={{
                click: () => handleSelectPreset(preset),
              }}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold text-primary">{preset.name}</h4>
                  <p className="text-[11px] text-gray-600">{preset.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          <MapEvents />
        </MapContainer>
      </div>

      {/* Preset Chips */}
      <div className="p-md bg-white border border-t-0 border-outline-variant rounded-b-2xl space-y-sm">
        <div className="flex flex-wrap gap-xs items-center">
          <span className="text-xs text-on-surface-variant font-bold">ปักหมุดสถานที่ยอดนิยม:</span>
          {PRESET_MAP_LOCATIONS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="text-xs px-3 py-1 bg-surface-container-low border border-outline-variant hover:border-secondary hover:text-secondary rounded-full font-bold transition-all cursor-pointer"
            >
              {preset.name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
