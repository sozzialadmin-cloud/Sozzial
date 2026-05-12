import { supabase, isSupabaseConfigured } from '@/lib/supabase';

async function resolveSpotPhoto(value) {
  if (!value || !isSupabaseConfigured || !supabase) return null;
  if (String(value).startsWith('http')) return value;
  const { data } = await supabase.storage.from('spot-photos').createSignedUrl(value, 60 * 60);
  return data?.signedUrl || null;
}

export function normalizeSpot(row) {
  return {
    ...row,
    latitude: Number(row.lat ?? 0),
    longitude: Number(row.lng ?? 0),
    standard_slice_price: Number(row.slice_price ?? 0),
    best_known_slice: row.best_slice ?? '',
    average_rating: Number(row.average_rating ?? 0),
    ratings_count: Number(row.ratings_count ?? 0),
    neighborhood: row.address || 'NYC',
    borough: '',
    description: row.quick_note || '',
    quick_note: row.quick_note || '',
  };
}

export async function fetchMapSpots() {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('spots')
    .select('id,name,address,lat,lng,slice_price,best_slice,quick_note,photo_url,status,created_by,average_rating,ratings_count')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = await Promise.all((data || []).map(async (row) => ({ ...row, photo_url: await resolveSpotPhoto(row.photo_url) })));
  return rows.map(normalizeSpot);
}

export async function fetchActivePlanCounts() {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from('plans').select('id,spot_id').eq('status', 'active');
  if (error) throw error;
  return data || [];
}

export function countPlansBySpot(activePlans) {
  return (activePlans || []).reduce((map, plan) => {
    if (!plan.spot_id) return map;
    map[plan.spot_id] = (map[plan.spot_id] || 0) + 1;
    return map;
  }, {});
}

export function applySpotFilters(places, filters) {
  let result = [...(places || [])];
  if (filters.search) {
    const terms = String(filters.search)
      .toLowerCase()
      .split(/[\s,]+/)
      .map((term) => term.trim())
      .filter(Boolean);
    result = result.filter((place) => {
      const haystack = [
        place.name,
        place.address,
        place.neighborhood,
        place.borough,
        place.city,
        place.best_known_slice,
        place.quick_note,
        place.description,
      ].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }
  if (filters.priceBands?.length) {
    result = result.filter((place) => {
      const price = Number(place.standard_slice_price || 0);
      return filters.priceBands.some((band) => {
        if (band === 'budget') return price > 0 && price <= 3;
        if (band === 'mid') return price > 3 && price <= 5;
        if (band === 'premium') return price > 5;
        return true;
      });
    });
  }
  if (Number(filters.minRating || 0) > 0) result = result.filter((place) => Number(place.average_rating || 0) >= Number(filters.minRating));
  if (filters.withPhoto) result = result.filter((place) => Boolean(place.photo_url));
  if (filters.withActivePlans) result = result.filter((place) => Number(place.active_hangouts_count || 0) > 0);
  if (filters.withBestSlice) result = result.filter((place) => Boolean(String(place.best_known_slice || '').trim()));
  if (filters.withNotes) result = result.filter((place) => Boolean(String(place.quick_note || '').trim()));

  const sorters = {
    rating: (a, b) => (b.average_rating || 0) - (a.average_rating || 0),
    reviews: (a, b) => Number(b.ratings_count || 0) - Number(a.ratings_count || 0),
    active_plans: (a, b) => Number(b.active_hangouts_count || 0) - Number(a.active_hangouts_count || 0),
    price_low: (a, b) => Number(a.standard_slice_price || 0) - Number(b.standard_slice_price || 0),
    price_high: (a, b) => Number(b.standard_slice_price || 0) - Number(a.standard_slice_price || 0),
    name: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
  };
  const sorter = sorters[filters.sortBy];
  if (sorter) result.sort(sorter);
  return result;
}
