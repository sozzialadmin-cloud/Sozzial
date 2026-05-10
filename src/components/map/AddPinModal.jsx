import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  AlertCircle,
  CheckCircle,
  Crosshair,
  DollarSign,
  ImagePlus,
  Loader2,
  MapPin,
  Search,
  Store,
  X,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const markerIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const initialForm = {
  name: "",
  address: "",
  slice_price: "3.50",
  best_slice: "",
  quick_note: "",
  photoPreview: "",
  lat: 40.7128,
  lng: -74.006,
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function MapViewport({ position }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
    const id = window.setTimeout(() => map.invalidateSize(), 140);
    return () => window.clearTimeout(id);
  }, [map, position]);
  return null;
}

function MapPicker({ value, onChange }) {
  const position = useMemo(() => [value.lat, value.lng], [value.lat, value.lng]);

  function MapEvents() {
    useMapEvents({ click: (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }) });
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="h-44 overflow-hidden rounded-[22px] border border-white/10 bg-black/20 sm:h-64">
        <MapContainer center={position} zoom={14} className="h-full w-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="" />
          <Marker position={position} icon={markerIcon} />
          <MapViewport position={position} />
          <MapEvents />
        </MapContainer>
      </div>
      <p className="text-xs leading-5 text-stone-500">Tap the map only if the pin needs a small adjustment.</p>
    </div>
  );
}

async function fetchExistingSpots() {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("spots")
    .select("id,name,address,lat,lng,slice_price,best_slice,quick_note,photo_url,status")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const result = await response.json();
    return result?.display_name || "Pinned location";
  } catch (error) {
    return "Pinned location";
  }
}

function getSuggestionName(item) {
  const address = item?.address || {};
  return item?.name || address.restaurant || address.cafe || address.fast_food || address.shop || address.amenity || "";
}

async function uploadSpotPhoto(file, userId) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Photo storage is not configured yet.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = `${Date.now()}.${ext}`;
  const filePath = `${userId}/${fileName}`;
  const { error: uploadError } = await supabase.storage.from("spot-photos").upload(filePath, file, { upsert: false });
  if (uploadError) throw uploadError;
  return { filePath };
}

export default function AddPinModal({ open, onClose, user }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [geoSuggestions, setGeoSuggestions] = useState([]);
  const [photoName, setPhotoName] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [existingSpot, setExistingSpot] = useState(null);
  const [locating, setLocating] = useState(false);

  const { data: existingSpots = [] } = useQuery({
    queryKey: ["existing-spots-add-pin"],
    queryFn: fetchExistingSpots,
    enabled: Boolean(open && isSupabaseConfigured && supabase),
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!open) return;
    const query = locationQuery.trim();
    if (query.length < 3) {
      setGeoSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearching(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=us&q=${encodeURIComponent(`${query}, New York City`)}`;
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
        const results = await response.json();
        setGeoSuggestions(Array.isArray(results) ? results : []);
      } catch (error) {
        if (error?.name !== "AbortError") setGeoSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [locationQuery, open]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => handleClose(), 1400);
    return () => window.clearTimeout(timer);
  }, [done]);

  const matchingExisting = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    if (!q) return [];
    return existingSpots
      .filter((spot) => `${spot.name || ""} ${spot.address || ""}`.toLowerCase().includes(q))
      .slice(0, 5);
  }, [existingSpots, locationQuery]);

  const canSubmit = Boolean(form.name.trim() && Number(form.slice_price) > 0 && !existingSpot && !submitting);

  if (!open) return null;

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="fixed inset-0 z-[2100] grid place-items-center bg-black/60 px-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#111111] p-6 text-center text-white shadow-2xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#efbf3a] text-[#141414]">
            <MapPin className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-black">Map editing is not configured</h2>
          <p className="mt-3 text-sm leading-7 text-stone-400">Add Supabase environment variables before publishing new spots.</p>
          <button type="button" onClick={onClose} className="mt-5 h-12 w-full rounded-2xl bg-[#df5b43] font-bold text-white">Close</button>
        </div>
      </div>
    );
  }

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function handleSelectSuggestion(item) {
    const addressLabel = item.display_name || "";
    const suggestedName = getSuggestionName(item);
    setExistingSpot(null);
    setErrorMessage("");
    setForm((current) => ({
      ...current,
      name: current.name || suggestedName,
      address: addressLabel,
      lat: Number(item.lat),
      lng: Number(item.lon),
    }));
    setLocationQuery(addressLabel);
    setGeoSuggestions([]);
  }

  function handleSelectExisting(spot) {
    setExistingSpot(spot);
    setErrorMessage("");
    setLocationQuery(spot.address || spot.name || "");
    setForm((current) => ({
      ...current,
      name: spot.name || current.name,
      address: spot.address || current.address,
      slice_price: String(spot.slice_price ?? current.slice_price),
      best_slice: spot.best_slice || current.best_slice,
      quick_note: spot.quick_note || current.quick_note,
      photoPreview: spot.photo_url || current.photoPreview,
      lat: Number(spot.lat ?? current.lat),
      lng: Number(spot.lng ?? current.lng),
    }));
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    setErrorMessage("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await reverseGeocode(latitude, longitude);
        setForm((current) => ({ ...current, address, lat: latitude, lng: longitude }));
        setLocationQuery(address);
        setLocating(false);
      },
      () => {
        setErrorMessage("Location access is blocked. Search by address instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPhotoName(file.name);
      setPhotoFile(file);
      setForm((current) => ({ ...current, photoPreview: dataUrl }));
    } catch (error) {
      setErrorMessage("The image could not be loaded.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user || !canSubmit) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      let uploaded = null;
      if (photoFile) uploaded = await uploadSpotPhoto(photoFile, user.id);
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || locationQuery.trim() || await reverseGeocode(form.lat, form.lng),
        lat: Number(form.lat),
        lng: Number(form.lng),
        slice_price: Number(form.slice_price || 0),
        best_slice: form.best_slice.trim() || null,
        quick_note: form.quick_note.trim() || null,
        photo_url: uploaded?.filePath || null,
        status: "pending",
        created_by: user.id,
      };
      const { error } = await supabase.from("spots").insert(payload);
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["places-supabase"] }),
        queryClient.invalidateQueries({ queryKey: ["existing-spots-add-pin"] }),
      ]);
      setDone(true);
    } catch (error) {
      console.error(error);
      setErrorMessage(error?.message || "The spot could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setForm(initialForm);
    setLocationQuery("");
    setGeoSuggestions([]);
    setDone(false);
    setSubmitting(false);
    setErrorMessage("");
    setPhotoName("");
    setPhotoFile(null);
    setExistingSpot(null);
    setLocating(false);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.98 }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
          className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/10 bg-[#111] shadow-2xl shadow-black/80 sm:max-h-[92vh] sm:max-w-xl sm:rounded-[30px]"
          onClick={(event) => event.stopPropagation()}
        >
          {done ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15 text-emerald-300">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black text-white">Spot created</h3>
              <p className="mt-3 text-sm leading-7 text-stone-400">It has been sent for review. Returning to the map...</p>
              <Button onClick={handleClose} className="mt-6 h-11 w-full rounded-2xl bg-red-600 text-white hover:bg-red-500">Back to map</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-white/10 bg-[#111]/95 px-5 py-4 backdrop-blur-xl sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-300">Add spot</div>
                    <h3 className="mt-1 text-2xl font-black text-white">Pin a pizza place</h3>
                    <p className="mt-1 text-sm text-stone-500">Search, confirm the pin, add the slice price.</p>
                  </div>
                  <button type="button" onClick={handleClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-stone-300 transition hover:bg-white/[0.08]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      <Search className="h-3.5 w-3.5" />
                      Find the place
                    </Label>
                    <button type="button" onClick={handleUseMyLocation} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-stone-200 transition hover:bg-white/[0.08]">
                      {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
                      Near me
                    </button>
                  </div>
                  <div className="relative">
                    <Input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Search by place name or address" className="h-12 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-stone-600" />
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    {searching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-500" /> : null}
                  </div>
                  {(matchingExisting.length || geoSuggestions.length) ? (
                    <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#151515]">
                      {matchingExisting.map((spot) => (
                        <button key={`existing-${spot.id}`} type="button" onClick={() => handleSelectExisting(spot)} className="flex w-full items-start justify-between gap-3 border-b border-white/6 px-4 py-3 text-left text-white transition hover:bg-white/[0.04]">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{spot.name}</div>
                            <div className="line-clamp-2 text-xs leading-5 text-stone-400">{spot.address}</div>
                          </div>
                          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Exists</span>
                        </button>
                      ))}
                      {geoSuggestions.map((item) => (
                        <button key={`${item.place_id}-${item.lat}-${item.lon}`} type="button" onClick={() => handleSelectSuggestion(item)} className="flex w-full items-start gap-3 border-b border-white/6 px-4 py-3 text-left text-white transition last:border-b-0 hover:bg-white/[0.04]">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-stone-100">{getSuggestionName(item) || "Use this location"}</div>
                            <div className="line-clamp-2 text-xs leading-5 text-stone-400">{item.display_name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {existingSpot ? (
                    <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-100">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="text-sm leading-6">This spot already exists. Open it from the map instead of creating a duplicate.</div>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    <MapPin className="h-3.5 w-3.5" />
                    Pin position
                  </div>
                  <MapPicker value={form} onChange={(coords) => setForm((current) => ({ ...current, ...coords }))} />
                </section>

                <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    <Store className="h-3.5 w-3.5" />
                    Spot details
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Name *</Label>
                      <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Joe's Pizza" className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-stone-600" />
                    </div>
                    <div>
                      <Label className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                        <DollarSign className="h-3.5 w-3.5" />
                        Slice price *
                      </Label>
                      <Input type="number" min="0" step="0.25" value={form.slice_price} onChange={(event) => update("slice_price", event.target.value)} placeholder="3.50" className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-stone-600" />
                    </div>
                    <div>
                      <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Best slice</Label>
                      <Input value={form.best_slice} onChange={(event) => update("best_slice", event.target.value)} placeholder="Cheese, grandma..." className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-stone-600" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Address</Label>
                      <Input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Auto-filled from search" className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-stone-600" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Quick note</Label>
                      <Textarea value={form.quick_note} onChange={(event) => update("quick_note", event.target.value)} placeholder="Cheap, fast, great late-night stop..." className="min-h-[78px] rounded-2xl border-white/10 bg-white/[0.04] text-white placeholder:text-stone-600" />
                    </div>
                  </div>
                </section>

                <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <Label className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    <ImagePlus className="h-3.5 w-3.5" />
                    Optional photo
                  </Label>
                  <label className="flex cursor-pointer items-center gap-4 rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-3 text-sm text-stone-300 transition hover:bg-white/[0.05]">
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[18px] border border-white/8 bg-[#0f0f0f]">
                      {form.photoPreview ? <img src={form.photoPreview} alt="Preview" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-stone-600" />}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{photoName || "Choose from gallery"}</div>
                      <div className="mt-1 text-xs leading-5 text-stone-500">Optional, but photos make a spot easier to trust.</div>
                    </div>
                  </label>
                </section>

                {errorMessage ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</div> : null}
              </div>

              <div className="shrink-0 border-t border-white/10 bg-[#111]/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6">
                <Button type="submit" disabled={!canSubmit} className="h-12 w-full rounded-2xl bg-[#df5b43] text-base font-black text-white shadow-[0_16px_34px_rgba(223,91,67,0.28)] hover:bg-red-500 disabled:opacity-45">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                  Add spot
                </Button>
                <p className="mt-2 text-center text-[11px] leading-4 text-stone-500">New spots are reviewed before they appear publicly.</p>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
