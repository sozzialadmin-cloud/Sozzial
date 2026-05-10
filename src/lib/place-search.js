const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
const NYC_BBOX = "-74.25909,40.477399,-73.700181,40.917577";

function normalizeMapboxFeature(feature) {
  const [lng, lat] = feature.center || [];
  return {
    id: feature.id,
    name: feature.text || feature.place_name || "Use this location",
    address: feature.place_name || "",
    lat: Number(lat),
    lng: Number(lng),
    provider: "mapbox",
  };
}

function normalizeNominatimResult(item) {
  const address = item?.address || {};
  const name = item?.name || address.restaurant || address.cafe || address.fast_food || address.shop || address.amenity || "";
  return {
    id: String(item.place_id || `${item.lat}-${item.lon}`),
    name: name || "Use this location",
    address: item.display_name || "",
    lat: Number(item.lat),
    lng: Number(item.lon),
    provider: "openstreetmap",
  };
}

export async function searchPlaces(query, { signal } = {}) {
  const cleanQuery = String(query || "").trim();
  if (cleanQuery.length < 3) return [];

  if (MAPBOX_TOKEN) {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanQuery)}.json`);
    url.searchParams.set("access_token", MAPBOX_TOKEN);
    url.searchParams.set("autocomplete", "true");
    url.searchParams.set("country", "us");
    url.searchParams.set("bbox", NYC_BBOX);
    url.searchParams.set("limit", "6");
    url.searchParams.set("types", "poi,address,place,neighborhood");
    const response = await fetch(url.toString(), { signal });
    if (!response.ok) throw new Error("Place search is unavailable.");
    const result = await response.json();
    return (result.features || []).map(normalizeMapboxFeature).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
  }

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=us&q=${encodeURIComponent(`${cleanQuery}, New York City`)}`;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  const results = await response.json();
  return (Array.isArray(results) ? results : []).map(normalizeNominatimResult).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}
