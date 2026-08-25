"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { api } from "@/lib/api";
import ReportModal from "@/components/ReportModal";

const pinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface SelectedCompany {
  id?: number;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  lat: number;
  lng: number;
  source: "db" | "osm" | "google" | "manual";
  review_count?: number;
  avg_score?: number | null;
  cover_image_url?: string;
}

interface SearchResult {
  id?: number;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  lat: number;
  lng: number;
  source: "db" | "osm" | "google";
  review_count?: number;
  avg_score?: number | null;
  googleRating?: number;
  googleReviews?: number;
  cover_image_url?: string;
}

interface Props {
  onSelect: (company: SelectedCompany | null) => void;
  onClose: () => void;
  hideDbCompanies?: boolean;
}

function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 17, { animate: true, duration: 0.8 });
  }, [position, map]);
  return null;
}

function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    const t3 = setTimeout(() => map.invalidateSize(), 1000);

    const onResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [map]);
  return null;
}

export default function CompanyMapFullscreen({ onSelect, onClose, hideDbCompanies }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingGeocode, setLoadingGeocode] = useState(false);

  // Map state
  const [pinPos, setPinPos] = useState<[number, number] | null>(null); // null = no pin yet
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  // Info panel
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [selSource, setSelSource] = useState<"db" | "osm" | "google" | "manual">("manual");
  const [selId, setSelId] = useState<number | undefined>();
  const [selReviewCount, setSelReviewCount] = useState<number | undefined>();
  const [selAvgScore, setSelAvgScore] = useState<number | null | undefined>();
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);

  const markerRef = useRef<L.Marker>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const geocodeTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const preventSearch = useRef(false);

  // Auto-focus search on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Block body scroll when open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmedQuery = query.trim();
    const trimmedEditName = editName.trim();

    // 1. If query is empty or too short, clear results
    if (trimmedQuery.length < 2) {
      setResults([]);
      return;
    }

    // 2. Prevent search if query matches the selected company name we are editing
    if (trimmedEditName !== "" && trimmedQuery === trimmedEditName) {
      setLoadingSearch(false);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setLoadingSearch(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        // 1. DB search (Skipped if hideDbCompanies is true)
        let dbItems: SearchResult[] = [];
        if (!hideDbCompanies) {
          try {
            const dbRes = await api.get(`/companies?q=${encodeURIComponent(query)}`);
            dbItems = dbRes.data.map((c: any) => ({
              id: c.id, name: c.name, address: c.address || "",
              phone: c.phone || "", website: c.website || "",
              lat: c.lat || 7.0084, lng: c.lng || 100.4767,
              source: "db" as const,
              review_count: c.review_count, avg_score: c.avg_score,
            }));
          } catch {}
        }

        // 2. SerpApi Google Maps search (via server-side API route)
        let googleItems: SearchResult[] = [];
        try {
          const currentLat = pinPos?.[0] ?? 7.0084;
          const currentLng = pinPos?.[1] ?? 100.4767;
          const gRes = await fetch(
            `/api/places-search?q=${encodeURIComponent(query)}&lat=${currentLat}&lng=${currentLng}`
          );
          if (gRes.ok) {
            const gData = await gRes.json();
            if (Array.isArray(gData)) {
              googleItems = gData.map((item: any) => ({
                name: item.name,
                address: item.address || "",
                phone: item.phone || "",
                website: item.website || "",
                lat: item.lat,
                lng: item.lng,
                source: "google" as const,
                googleRating: item.rating,
                googleReviews: item.reviews,
                cover_image_url: item.cover_image_url || "",
              }));
            }
          }
        } catch {}

        // Merge: DB first, then Google (deduplicate & enrich DB items with Google photos)
        const combined = [...dbItems];

        // Normalizes names by keeping only letters, numbers, and Thai characters
        const normalizeName = (str: string) =>
          (str || "").toLowerCase().replace(/[^a-z0-9ก-๙]/gi, "");

        googleItems.forEach(g => {
          const gNorm = normalizeName(g.name);
          let foundDuplicate = false;

          for (const d of combined) {
            const dNorm = normalizeName(d.name);
            if (!gNorm || !dNorm) continue;

            // 1. Check exact or substring name match
            const isNameMatch = (gNorm === dNorm) ||
              (dNorm.length >= 3 && gNorm.length >= 3 && (gNorm.includes(dNorm) || dNorm.includes(gNorm)));

            // 2. Check GPS proximity (~200 meters)
            const dist = Math.sqrt(Math.pow(d.lat - g.lat, 2) + Math.pow(d.lng - g.lng, 2));
            const isNearMatch = dist < 0.002;

            if (isNameMatch || isNearMatch) {
              foundDuplicate = true;
              // Enrich existing DB item with missing Google photo/phone/website
              if (!d.cover_image_url && g.cover_image_url) d.cover_image_url = g.cover_image_url;
              if (!d.phone && g.phone) d.phone = g.phone;
              if (!d.website && g.website) d.website = g.website;
              break;
            }
          }

          if (!foundDuplicate) {
            combined.push(g);
          }
        });

        // OSM fallback removed completely per user request

        setResults(combined);
      } catch {}
      setLoadingSearch(false);
    }, 350);
  }, [query, pinPos, editName]);

  // Reverse geocode
  const geocode = async (lat: number, lng: number) => {
    setLoadingGeocode(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th&extratags=1`,
        { headers: { "User-Agent": "HTC-Insight-App" } }
      );
      const data = await r.json();
      const addr = data.address || {};
      const road = addr.road || addr.suburb || "";
      const sub = addr.suburb || addr.town || addr.village || "";
      const dist = addr.city_district || addr.city || addr.town || "";
      const prov = addr.province || addr.state || "";
      const post = addr.postcode || "";
      const formatted = `${road} ${sub} ${dist} จังหวัด${prov} ${post}`.trim().replace(/\s+/g, " ");

      setEditAddress(formatted || data.display_name || "");
      setSelSource("manual");
      setSelId(undefined);

      const phone = data.extratags?.phone || data.extratags?.["contact:phone"] || "";
      const website = data.extratags?.website || data.extratags?.["contact:website"] || "";
      const placeTypes = ["amenity", "shop", "office", "company", "building"];
      for (const t of placeTypes) {
        if (addr[t]) { setEditName(n => n || addr[t]); break; }
      }
      if (phone) setEditPhone(phone);
      if (website) setEditWebsite(website);
    } catch {}
    setLoadingGeocode(false);
  };

  // Select search result
  const handleSelectResult = (item: SearchResult) => {
    const pos: [number, number] = [item.lat, item.lng];
    preventSearch.current = true;
    setPinPos(pos);
    setFlyTarget(pos);
    setEditName(item.name);
    setEditAddress(item.address);
    setEditPhone(item.phone || "");
    setEditWebsite(item.website || "");
    // Map google/osm source → "manual" for final output (not in our DB yet)
    setSelSource(item.source === "db" ? "db" : item.source === "google" ? "google" : "manual");
    setSelId(item.id);
    setSelReviewCount(item.review_count);
    setSelAvgScore(item.avg_score);
    setCoverImageUrl(item.cover_image_url || "");
    setQuery(item.name);
    setResults([]);
  };

  // Marker drag events
  const markerEvents = useMemo(() => ({
    dragend() {
      const m = markerRef.current;
      if (m) {
        const { lat, lng } = m.getLatLng();
        setPinPos([lat, lng]);
        if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
        geocodeTimeout.current = setTimeout(() => geocode(lat, lng), 600);
      }
    },
  }), []);

  // Map click
  function MapEvents() {
    useMapEvents({
      click(e) {
        const pos: [number, number] = [e.latlng.lat, e.latlng.lng];
        setPinPos(pos);
        if (geocodeTimeout.current) clearTimeout(geocodeTimeout.current);
        geocodeTimeout.current = setTimeout(() => geocode(e.latlng.lat, e.latlng.lng), 600);
      },
    });
    return null;
  }

  const handleConfirm = () => {
    if (!editName.trim() || !pinPos) return;
    onSelect({
      id: selId,
      name: editName.trim(),
      address: editAddress.trim(),
      phone: editPhone.trim() || undefined,
      website: editWebsite.trim() || undefined,
      lat: pinPos[0],
      lng: pinPos[1],
      source: selSource,
      review_count: selReviewCount,
      avg_score: selAvgScore,
      cover_image_url: coverImageUrl || undefined,
    });
  };

  const hasPin = pinPos !== null;
  const canConfirm = hasPin && editName.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col md:flex-row bg-slate-900 overflow-hidden">
      {/* ── SIDEBAR / BOTTOM DRAWER ON MOBILE ── */}
      <div className="w-full md:w-80 lg:w-96 shrink-0 h-[50vh] md:h-full bg-white flex flex-col shadow-2xl z-10 order-2 md:order-1 rounded-t-3xl md:rounded-none overflow-hidden border-t md:border-t-0 md:border-r border-outline-variant">
        {/* Mobile handle indicator */}
        <div className="w-12 h-1 bg-outline-variant/80 rounded-full mx-auto mt-2.5 mb-1 md:hidden" />

        {/* Header */}
        <div className="px-4 pt-2 md:pt-4 pb-3 border-b border-outline-variant">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">map</span>
              <h2 className="font-bold text-primary text-sm md:text-base">เลือกสถานประกอบการ</h2>
            </div>
            <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-error p-1 rounded-full hover:bg-error-container/20 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="ค้นหาชื่อสถานที่ หรือบริเวณใกล้เคียง..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-surface-container-low rounded-xl text-xs font-semibold border border-outline-variant focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); setResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-on-surface-variant mt-2 leading-relaxed">
            ค้นหาเพื่อนำทางแผนที่ไปยังบริเวณสถานประกอบการ<br/>
            หรือคลิกบนแผนที่โดยตรงเพื่อปักหมุด
          </p>
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {loadingSearch && (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-on-surface-variant">
              <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              กำลังค้นหา...
            </div>
          )}

          {!loadingSearch && query.length >= 2 && results.length === 0 && !editName && (
            <div className="py-6 px-4 text-center text-xs text-on-surface-variant space-y-3">
              <span className="material-symbols-outlined text-[32px] block opacity-30">location_off</span>
              <p className="font-semibold text-primary">"{query}" ไม่พบในฐานข้อมูลหรือแผนที่</p>
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-left leading-relaxed text-[11px] space-y-1.5">
                <p className="font-bold">วิธีเพิ่มสถานประกอบการ:</p>
                <p>1. เลื่อนแผนที่ไปยังบริเวณที่ตั้ง</p>
                <p>2. คลิกบนแผนที่เพื่อปักหมุด</p>
                <p>3. พิมพ์ชื่อ <strong>"{query}"</strong> ในช่องด้านล่าง</p>
              </div>
            </div>
          )}

          {!loadingSearch && results.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                ผลลัพธ์ ({results.length})
              </div>
              {results.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors cursor-pointer group"
                >
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover border border-outline-variant shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex flex-col items-center justify-center shrink-0 mt-0.5 bg-slate-100 border border-slate-300 text-slate-400">
                      <span className="material-symbols-outlined text-[13px]">hide_image</span>
                      <span className="text-[6px] font-bold tracking-tighter leading-none uppercase">NO IMAGE</span>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-primary text-xs truncate group-hover:text-secondary transition-colors">{item.name}</div>
                    <div className="text-on-surface-variant text-[10px] truncate mt-0.5">{item.address}</div>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {item.source === "db" && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">{item.review_count} รีวิว{item.avg_score ? ` · ★ ${item.avg_score}` : ""}</span>
                      )}
                      {item.source === "google" && (
                        <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                          Google Maps{item.googleRating ? ` · ★ ${item.googleRating}` : ""}
                        </span>
                      )}
                      {item.source === "osm" && (
                        <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded-full font-bold">OSM</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Empty state — no query */}
          {query.length < 2 && !hasPin && (
            <div className="p-5 text-center space-y-3">
              <span className="material-symbols-outlined text-[40px] text-on-surface-variant/30 block">touch_app</span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                กรุณาใช้ช่องค้นหาพิมพ์ชื่อถนน / ย่าน / พื้นที่<br/>เพื่อนำทางแผนที่ไปยังบริเวณสถานประกอบการ
              </p>
            </div>
          )}
        </div>

        {/* Bottom info panel */}
        {(hasPin || editName) && (
          <div className="border-t border-outline-variant bg-surface p-4 space-y-3 shadow-inner">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">edit_location</span>
              <span className="text-xs font-bold text-primary">กรอกรายละเอียดสถานประกอบการ</span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide block mb-1">ชื่อสถานประกอบการ *</label>
              <input
                type="text"
                placeholder="เช่น บริษัท เอมิโปร จำกัด..."
                value={editName}
                onChange={e => { setEditName(e.target.value); setSelSource("manual"); setSelId(undefined); }}
                className="w-full px-3 py-2 bg-white border border-outline-variant rounded-xl text-xs font-bold text-primary focus:ring-2 focus:ring-secondary focus:border-secondary outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide block mb-1">ที่อยู่</label>
              <input
                type="text"
                value={editAddress}
                onChange={e => setEditAddress(e.target.value)}
                placeholder="จะดึงจากแผนที่อัตโนมัติ..."
                className="w-full px-3 py-2 bg-white border border-outline-variant rounded-xl text-[11px] text-primary focus:ring-2 focus:ring-secondary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant block mb-1">เบอร์โทร</label>
                <input type="text" placeholder="074-xxxxxx" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded-xl text-[11px] focus:ring-1 focus:ring-secondary outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant block mb-1">เว็บไซต์</label>
                <input type="text" placeholder="www..." value={editWebsite} onChange={e => setEditWebsite(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-outline-variant rounded-xl text-[11px] focus:ring-1 focus:ring-secondary outline-none" />
              </div>
            </div>

            {/* Source badge */}
            <div className="flex items-center gap-2">
              {selSource === "db" && selReviewCount !== undefined && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✓ ในระบบ · {selReviewCount} รีวิว</span>
              )}
              {selSource === "google" && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">จาก Google Maps</span>}
              {selSource === "osm" && <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">จากแผนที่</span>}
              {selSource === "manual" && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">ปักหมุดเอง</span>}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full bg-secondary text-on-secondary py-3 rounded-xl font-label-md text-label-md font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-all disabled:opacity-40 disabled:scale-100 cursor-pointer disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              เลือกสถานประกอบการนี้
            </button>

            {selId && (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="w-full text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="รายงานข้อมูลบริษัทนี้"
              >
                <span className="material-symbols-outlined text-[16px]">flag</span>
                รายงานข้อมูลบริษัท
              </button>
            )}

            {!hasPin && (
              <p className="text-[10px] text-on-surface-variant text-center">⚠️ คลิกบนแผนที่เพื่อปักหมุดก่อน</p>
            )}
          </div>
        )}
      </div>

      {/* ── FULLSCREEN MAP ── */}
      <div className="w-full flex-1 relative order-1 md:order-2 h-[50vh] md:h-full min-h-[260px]">
        {/* ── TOP CENTER TITLE BAR ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <div className="mt-4 bg-white/95 backdrop-blur-sm border border-outline-variant shadow-lg rounded-2xl px-5 py-2.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">map</span>
            <span className="font-bold text-primary text-sm">เลือกสถานประกอบการ</span>
            <span className="text-on-surface-variant text-[11px]">— คลิกบนแผนที่เพื่อปักหมุด</span>
          </div>
        </div>

        {/* Loading geocode badge */}
        {loadingGeocode && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-primary text-on-primary text-[11px] font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            กำลังอ่านพิกัด...
          </div>
        )}

        {/* No pin hint */}
        {!hasPin && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-bounce">
            <div className="bg-primary/90 text-on-primary text-xs font-bold px-5 py-2.5 rounded-full shadow-xl backdrop-blur-sm">
              👆 คลิกบนแผนที่เพื่อเลือกตำแหน่งสถานประกอบการ
            </div>
          </div>
        )}

        <MapContainer
          center={[7.0084, 100.4828]}
          zoom={14}
          scrollWheelZoom={true}
          zoomControl={false}
          className="w-full h-full"
        >
          <MapResizeHandler />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pinPos && (
            <Marker
              draggable={true}
              eventHandlers={markerEvents}
              position={pinPos}
              ref={markerRef}
              icon={pinIcon}
            >
              <Popup>
                <div className="text-xs font-semibold min-w-[120px]">{editName || "สถานประกอบการที่เลือก"}</div>
                {editAddress && <div className="text-[10px] text-gray-500 mt-1">{editAddress}</div>}
              </Popup>
            </Marker>
          )}
          {flyTarget && <FlyTo position={flyTarget} key={flyTarget.join(",")} />}
          <MapEvents />
        </MapContainer>

        {/* Zoom buttons */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-1">
          <div className="bg-white rounded-xl shadow-lg border border-outline-variant overflow-hidden">
            {[["add", () => { (document.querySelector(".leaflet-control-zoom-in") as HTMLElement)?.click(); }],
              ["remove", () => { (document.querySelector(".leaflet-control-zoom-out") as HTMLElement)?.click(); }]
            ].map(([icon, fn], i) => (
              <button key={i} type="button" onClick={fn as any}
                className={`w-9 h-9 flex items-center justify-center hover:bg-surface-container-low text-primary font-bold transition-colors cursor-pointer ${i === 0 ? "border-b border-outline-variant/50" : ""}`}>
                <span className="material-symbols-outlined text-[18px]">{icon as string}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selId && (
        <ReportModal
          isOpen={showReportModal}
          title="รายงานข้อมูลบริษัท"
          targetType="company"
          targetId={selId}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
