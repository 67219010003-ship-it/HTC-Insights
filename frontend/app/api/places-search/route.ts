import { NextRequest, NextResponse } from "next/server";

// Global In-Memory Cache to optimize SerpApi token usage
// Keys are cached for 24 hours (86,400,000 milliseconds)
const placesCache = new Map<string, { results: any[]; expiry: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const lat = searchParams.get("lat") || "7.0084";
  const lng = searchParams.get("lng") || "100.4767";

  if (!q || q.trim().length < 2) {
    return NextResponse.json([]);
  }

  // Optimize token usage: check local cache first
  const cleanQuery = q.toLowerCase().trim();
  const roundLat = parseFloat(lat).toFixed(2); // ~1km grid rounding
  const roundLng = parseFloat(lng).toFixed(2);
  const cacheKey = `${cleanQuery}_${roundLat}_${roundLng}`;

  const cachedData = placesCache.get(cacheKey);
  if (cachedData && cachedData.expiry > Date.now()) {
    console.log(`[SerpApi Cache Hit] Serving: "${cacheKey}"`);
    return NextResponse.json(cachedData.results);
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SERPAPI_KEY not configured" }, { status: 500 });
  }

  // SerpApi Google Maps search
  const params = new URLSearchParams({
    engine: "google_maps",
    q: `${q} หาดใหญ่`,
    ll: `@${lat},${lng},13z`,
    type: "search",
    hl: "th",
    gl: "th",
    api_key: apiKey,
  });

  const url = `https://serpapi.com/search.json?${params.toString()}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Fallback fetch cache: 1 hour
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("SerpApi error:", res.status, errText);
      return NextResponse.json([]);
    }

    const data = await res.json();
    let rawList: any[] = [];
    if (Array.isArray(data.local_results)) {
      rawList = data.local_results;
    } else if (Array.isArray(data.places_results)) {
      rawList = data.places_results;
    } else if (data.place_results) {
      rawList = [data.place_results];
    } else if (Array.isArray(data.organic_results)) {
      rawList = data.organic_results;
    }

    // Map SerpApi result to our SelectedCompany shape
    const results = rawList.map((item: any) => ({
      name: item.title || item.name || "",
      address: item.address || "",
      phone: item.phone || "",
      website: item.website || item.link || "",
      lat: item.gps_coordinates?.latitude ?? parseFloat(lat),
      lng: item.gps_coordinates?.longitude ?? parseFloat(lng),
      rating: item.rating,
      reviews: item.reviews,
      type: item.type,
      cover_image_url: item.thumbnail || item.photos?.[0]?.image || "",
      source: "google" as const,
    }));

    // Cache the results before returning
    placesCache.set(cacheKey, {
      results,
      expiry: Date.now() + CACHE_TTL_MS,
    });
    console.log(`[SerpApi Cache Miss] Fetched and cached: "${cacheKey}"`);

    return NextResponse.json(results);
  } catch (err) {
    console.error("places-search fetch error:", err);
    return NextResponse.json([]);
  }
}
