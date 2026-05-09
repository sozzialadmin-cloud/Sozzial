import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const SAVED_PREFIX = "pizzapolis_saved_spots";

function savedKey(userId) {
  return `${SAVED_PREFIX}_${userId || "guest"}`;
}

export function readSavedSpotIds(userId) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(savedKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeSavedSpotIds(userId, ids) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(savedKey(userId), JSON.stringify([...new Set(ids.filter(Boolean))]));
}

export async function toggleSavedSpot(userId, spotId, saved) {
  const current = readSavedSpotIds(userId);
  const next = saved ? current.filter((id) => id !== spotId) : [...current, spotId];
  writeSavedSpotIds(userId, next);

  if (userId && isSupabaseConfigured && supabase) {
    if (saved) {
      await supabase.from("saved_spots").delete().eq("user_id", userId).eq("spot_id", spotId);
    } else {
      await supabase.from("saved_spots").upsert({ user_id: userId, spot_id: spotId }, { onConflict: "user_id,spot_id" });
    }
  }

  return [...new Set(next)];
}

export async function submitSpotReport({ userId, spotId, reason, details }) {
  const payload = {
    reporter_id: userId || null,
    entity_type: "spot",
    entity_id: spotId,
    reason,
    details: details || null,
    status: "open",
  };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("reports").insert(payload);
    if (!error) return { persisted: true };
    if (!/relation .*reports|schema cache|Could not find/i.test(error.message || "")) throw error;
  }

  if (typeof window !== "undefined") {
    const key = "pizzapolis_pending_reports";
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    current.unshift({ ...payload, created_at: new Date().toISOString() });
    window.localStorage.setItem(key, JSON.stringify(current.slice(0, 50)));
  }

  return { persisted: false };
}
