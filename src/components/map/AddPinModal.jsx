import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { AlertCircle, CheckCircle, ImagePlus, Loader2, MapPin, Search, X } from "lucide-react";
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
    const id = window.setTimeout(() => map.invalidateSize(), 120);
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
      <div className="h-64 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
        <MapContainer center={position} zoom={14} className="h-full w-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="" />
          <Marker position={position} icon={markerIcon} />
          <MapViewport position={position} />
          <MapEvents />
        </MapContainer>
      </div>
      <p className="text-xs leading-5 text-stone-500">Search first, then tap the map if you want to fine-tune the pin.</p>
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

async function uploadSpotPhoto(file, userId) {
  if (!isSupabaseConfigured || !supabase) throw new Error("Photo storage is not configured yet.");
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
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
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=us&q=${encodeURIComponent(`${query}, New York City`)}`;
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
        const results = await response.json();
        setGeoSuggestions(Array.isArray(results) ? results : []);
      } catch (error) {
        if (error?.name !== "AbortError") {
          setGeoSuggestions([]);
        }
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timeoutId); };
  }, [locationQuery, open]);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => handleClose(), 1400);
    return () => window.clearTimeout(timer);
  }, [done]);

  const matchingExisting = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    if (!q) return [];
    return existingSpots.filter((spot) => `${spot.name || ""} ${spot.address || ""}`.toLowerCase().includes(q)).slice(0, 5);
  }, [existingSpots, locationQuery]);

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
    setExistingSpot(null);
    setErrorMessage("");
    const addressLabel = item.display_name || "";
    setForm((current) => ({ ...current, address: addressLabel, lat: Number(item.lat), lng: Number(item.lon) }));
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

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPhotoName(file.name);
      setPhotoFile(file);
      setForm((current) => ({ ...current, photoPreview: dataUrl }));
    } catch (error) {
      setErrorMessage('No se pudo cargar la imagen.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user || submitting || existingSpot) return;
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
      setErrorMessage(error?.message || 'No se pudo guardar el spot.');
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
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={handleClose}>
        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }} transition={{ type: "spring", damping: 30, stiffness: 280 }} className="max-h-[92vh] w-full overflow-y-auto rounded-t-[30px] border border-white/10 bg-[#111] shadow-2xl shadow-black/80 sm:max-w-xl sm:rounded-[30px]" onClick={(event) => event.stopPropagation()}>
          {done ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/15 text-emerald-300"><CheckCircle className="h-8 w-8" /></div>
              <h3 className="text-2xl font-black text-white">Spot created</h3>
              <p className="mt-3 text-sm leading-7 text-stone-400">Se ha guardado correctamente y pasa a revisiÃ³n del admin. Volviendo al mapa...</p>
              <Button onClick={handleClose} className="mt-6 h-11 w-full rounded-2xl bg-red-600 text-white hover:bg-red-500">Volver al mapa</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-300">Add spot</div>
                  <h3 className="mt-1 text-2xl font-black text-white">Fast pin, real slice price</h3>
                  <p className="mt-1 text-sm text-stone-500">Keep it quick: location, name, price and a small extra if you have it.</p>
                </div>
                <button type="button" onClick={handleClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-stone-300"><X className="h-4 w-4" /></button>
              </div>

              <div className="space-y-5">
                <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <Label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500"><Search className="h-3.5 w-3.5" />Find the place</Label>
                  <div className="relative">
                    <Input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} placeholder="Search street, address or spot name" className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white" />
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                    {searching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-500" /> : null}
                  </div>
                  {(matchingExisting.length || geoSuggestions.length) ? <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#151515]">
                    {matchingExisting.map((spot) => <button key={`existing-${spot.id}`} type="button" onClick={() => handleSelectExisting(spot)} className="flex w-full items-start justify-between gap-3 border-b border-white/6 px-4 py-3 text-left text-white hover:bg-white/[0.04]">
                      <div><div className="font-semibold">{spot.name}</div><div className="text-xs text-stone-400">{spot.address}</div></div>
                      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Existing</span>
                    </button>)}
                    {geoSuggestions.map((item) => <button key={`${item.place_id}-${item.lat}-${item.lon}`} type="button" onClick={() => handleSelectSuggestion(item)} className="flex w-full items-start gap-3 px-4 py-3 text-left text-white hover:bg-white/[0.04]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-300" /><div className="text-sm text-stone-200">{item.display_name}</div></button>)}
                  </div> : null}
                  {existingSpot ? <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-100"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div className="text-sm leading-6">This spot already exists on the map. Open it from the map instead of creating a duplicate.</div></div> : null}
                </section>

                <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4"><MapPicker value={form} onChange={(coords) => setForm((current) => ({ ...current, ...coords }))} /></section>

                <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 space-y-4">
                  <div><Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Name *</Label><Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Joe's Pizza" className="h-11 border-white/10 bg-white/[0.04] text-white" /></div>
                  <div><Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Slice price *</Label><Input type="number" min="0" step="0.25" value={form.slice_price} onChange={(e) => update("slice_price", e.target.value)} placeholder="3.50" className="h-11 border-white/10 bg-white/[0.04] text-white" /></div>
                  <div><Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Best known slice</Label><Input value={form.best_slice} onChange={(e) => update("best_slice", e.target.value)} placeholder="Cheese, grandma, pepperoni..." className="h-11 border-white/10 bg-white/[0.04] text-white" /></div>
                  <div><Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Quick note</Label><Textarea value={form.quick_note} onChange={(e) => update("quick_note", e.target.value)} placeholder="Cheap and fast, good late-night stop..." className="min-h-[92px] border-white/10 bg-white/[0.04] text-white" /></div>
                </section>

                <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                  <Label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500"><ImagePlus className="h-3.5 w-3.5" />Photo</Label>
                  <label className="flex cursor-pointer flex-col gap-3 rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-stone-300 hover:bg-white/[0.05]">
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    <span>{photoName || "Choose from gallery"}</span>
                    <div className="aspect-[4/3] overflow-hidden rounded-[18px] border border-white/8 bg-[#0f0f0f]">{form.photoPreview ? <img src={form.photoPreview} alt="Preview" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-600">4:3 preview</div>}</div>
                  </label>
                </section>
                {errorMessage ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</div> : null}
              </div>

              <Button type="submit" disabled={submitting || existingSpot || !form.name.trim()} className="mt-6 h-12 w-full rounded-2xl bg-red-600 text-white hover:bg-red-500">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add spot
              </Button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

