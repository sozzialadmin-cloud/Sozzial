import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Loader2, MapPin, Pizza, Search, Star, Users } from "lucide-react";

const sizeOptions = [2, 4, 6, 8, 10];

function toLocalDateInput(value) {
  const date = value ? new Date(value) : new Date();
  return date.toISOString().slice(0, 10);
}

function defaultTitle(place, time) {
  if (!place) return "Pizza plan";
  return `${place.name} - ${time || "20:00"}`;
}

async function resolveSpotPhoto(value) {
  if (!isSupabaseConfigured || !supabase) return null;
  if (!value) return null;
  if (String(value).startsWith("http")) return value;
  const { data } = await supabase.storage.from("spot-photos").createSignedUrl(value, 60 * 60);
  return data?.signedUrl || null;
}

function PlaceOption({ place, active, onClick }) {
  const clickable = typeof onClick === "function";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${active ? "border-red-500/50 bg-red-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"} ${clickable ? "" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-white">{place.name}</div>
          <div className="mt-1 truncate text-sm text-stone-400">{place.address || "NYC"}</div>
        </div>
        <div className="shrink-0 space-y-2 text-right">
          <div className="rounded-full bg-[#efbf3a] px-3 py-1 text-xs font-black text-[#141414]">
            ${Number(place.slice_price || 0).toFixed(2)}
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-stone-300">
            <Star className="h-3 w-3 fill-red-400 text-red-400" />
            {Number(place.average_rating || 0).toFixed(1)}
          </div>
        </div>
      </div>
      {place.best_slice ? <div className="mt-3 text-sm text-stone-300">Best slice: {place.best_slice}</div> : null}
    </button>
  );
}

export default function CrearQuedada() {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlPlaceId = searchParams.get("place");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => toLocalDateInput(new Date()));
  const [time, setTime] = useState("20:00");
  const [form, setForm] = useState({ spot_id: "", title: "", max_people: 4, quick_note: "" });

  const { data: places = [] } = useQuery({
    queryKey: ["create-plan-spots-supabase"],
    enabled: Boolean(isSupabaseConfigured && supabase),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spots")
        .select("id,name,address,slice_price,best_slice,photo_url,status,average_rating")
        .eq("status", "approved")
        .order("average_rating", { ascending: false })
        .limit(200);
      if (error) throw error;
      return Promise.all((data || []).map(async (item) => ({ ...item, photo_url: await resolveSpotPhoto(item.photo_url) })));
    },
  });

  const autocompletePlaces = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return places
      .filter((place) => `${place.name} ${place.address || ""} ${place.best_slice || ""}`.toLowerCase().includes(term))
      .slice(0, 8);
  }, [places, search]);

  const selectedPlace = useMemo(
    () => places.find((item) => item.id === form.spot_id) || places.find((item) => item.id === urlPlaceId) || null,
    [places, form.spot_id, urlPlaceId]
  );

  useEffect(() => {
    if (!places.length || form.spot_id || !urlPlaceId) return;
    const place = places.find((item) => item.id === urlPlaceId);
    if (!place) return;
    setForm((prev) => ({ ...prev, spot_id: place.id, title: prev.title || defaultTitle(place, time) }));
  }, [places, form.spot_id, urlPlaceId, time]);

  useEffect(() => {
    if (!selectedPlace) return;
    setForm((prev) => ({
      ...prev,
      spot_id: selectedPlace.id,
      title: prev.title?.trim() ? prev.title : defaultTitle(selectedPlace, time),
    }));
  }, [selectedPlace, time]);

  useEffect(() => {
    if (!done || !createdId) return;
    const timer = setTimeout(() => navigate(`${createPageUrl("Home")}?createdPlan=${createdId}`, { replace: true }), 1400);
    return () => clearTimeout(timer);
  }, [done, createdId, navigate]);

  if (!user) return <div className="min-h-[calc(100vh-64px)] bg-[#070707]" />;

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#050505] px-4 py-6 text-white">
        <div className="mx-auto max-w-md rounded-[28px] border border-white/10 bg-[#111111] p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#efbf3a] text-[#141414]">
            <Pizza className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-black">Plans need Supabase</h1>
          <p className="mt-3 text-sm leading-7 text-stone-400">Add the Supabase environment variables before creating plans.</p>
        </div>
      </div>
    );
  }

  const publishDisabled = submitting || !selectedPlace || !date || !time || !form.title.trim();

  const handleSelectPlace = (place) => {
    setSearch(place.name || "");
    setForm((prev) => ({
      ...prev,
      spot_id: place.id,
      title: prev.title?.trim() ? prev.title : defaultTitle(place, time),
    }));
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (publishDisabled || !supabase) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      const { data: createdPlan, error: planError } = await supabase
        .from("plans")
        .insert({
          spot_id: selectedPlace.id,
          title: form.title.trim(),
          plan_date: date,
          plan_time: time,
          max_people: Number(form.max_people),
          quick_note: form.quick_note.trim() || null,
          status: "active",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (planError) throw planError;

      const introText = `${user.username || user.full_name || "Usuario"} created this plan at ${selectedPlace.name}.`;
      const [memberRes, messageRes] = await Promise.all([
        supabase.from("plan_members").upsert({ plan_id: createdPlan.id, user_id: user.id, status: "joined" }, { onConflict: "plan_id,user_id" }),
        supabase.from("messages").insert({ plan_id: createdPlan.id, user_id: user.id, content: introText }),
      ]);
      if (memberRes.error) throw memberRes.error;
      if (messageRes.error) throw messageRes.error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-groups-supabase", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["create-plan-spots-supabase"] }),
        queryClient.invalidateQueries({ queryKey: ["discover-plans-supabase"] }),
      ]);
      setCreatedId(createdPlan.id);
      setDone(true);
    } catch (error) {
      setErrorMessage(error?.message || "Could not create the plan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#050505] px-3 py-3 text-white sm:px-4">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#0d0d0d_0%,#070707_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.45)] lg:grid lg:grid-cols-[1.08fr,0.92fr]">
        <div className="border-b border-white/8 p-4 lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-300">Create plan</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Make it feel instant</h1>
            </div>
            <Button disabled={publishDisabled} onClick={submit} className="h-11 rounded-2xl bg-red-600 px-4 font-bold text-white hover:bg-red-500 disabled:opacity-50">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">1 - Choose the spot</div>
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search pizza spot"
                  className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white"
                />
                {autocompletePlaces.length ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-white/10 bg-[#111111] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
                    {autocompletePlaces.map((place) => (
                      <button
                        key={`autocomplete-${place.id}`}
                        type="button"
                        onClick={() => handleSelectPlace(place)}
                        className="flex w-full items-start justify-between gap-3 border-b border-white/6 px-4 py-3 text-left last:border-b-0 hover:bg-white/[0.04]"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-white">{place.name}</div>
                          <div className="truncate text-xs text-stone-400">{place.address || "NYC"}</div>
                        </div>
                        <div className="shrink-0 space-y-1 text-right">
                          <div className="rounded-full bg-[#efbf3a] px-2.5 py-1 text-[10px] font-black text-[#141414]">
                            ${Number(place.slice_price || 0).toFixed(2)}
                          </div>
                          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black text-stone-300">
                            <Star className="h-3 w-3 fill-red-400 text-red-400" />
                            {Number(place.average_rating || 0).toFixed(1)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mb-3 text-xs leading-6 text-stone-400">
                Search only among the spots you already added and approved. No built-in demo spots are injected anymore, so the list stays fully editable by you.
              </div>

              {selectedPlace ? (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Selected spot</div>
                  <PlaceOption place={selectedPlace} active />
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-stone-400">
                  No spot selected yet. Search one of your real approved spots.
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">2 - When</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500"><CalendarDays className="h-3.5 w-3.5" />Date *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500"><Clock3 className="h-3.5 w-3.5" />Time *</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 border-white/10 bg-white/[0.04] text-white" />
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">3 - Plan details</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Joe's Pizza - 20:00" className="h-11 border-white/10 bg-white/[0.04] text-white" />
                </div>
                <div>
                  <Label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500"><Users className="h-3.5 w-3.5" />Max people</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {sizeOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, max_people: option }))}
                        className={`h-11 rounded-2xl border text-sm font-black transition ${Number(form.max_people) === option ? "border-red-400 bg-red-500/15 text-white" : "border-white/10 bg-white/[0.04] text-stone-300"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Quick note</Label>
                <Textarea value={form.quick_note} onChange={(e) => setForm((prev) => ({ ...prev, quick_note: e.target.value }))} className="min-h-[96px] border-white/10 bg-white/[0.04] text-white" placeholder="Casual slice stop, anyone welcome, easy plan after work..." />
              </div>
              {errorMessage ? <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{errorMessage}</div> : null}
            </section>
          </form>
        </div>

        <aside className="p-4 lg:p-5">
          <div className="rounded-[30px] border border-white/10 bg-[#121212] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-300">Preview</div>
            <div className="mt-4 overflow-hidden rounded-[26px] border border-white/10 bg-[#171717]">
              <div className="relative h-52 border-b border-white/10 bg-black">
                {selectedPlace?.photo_url ? <img src={selectedPlace.photo_url} alt={selectedPlace.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#efbf3a]"><Pizza className="h-16 w-16" /></div>}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />
                <div className="absolute left-4 bottom-4 rounded-full bg-[#efbf3a] px-3 py-1 text-xs font-black text-[#141414]">${Number(selectedPlace?.slice_price || 0).toFixed(2)}</div>
              </div>
              <div className="p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">{date || "Date"} - {time || "Time"}</div>
                <h2 className="mt-3 text-3xl font-black leading-none text-white">{form.title?.trim() || (selectedPlace ? defaultTitle(selectedPlace, time) : "Pizza plan")}</h2>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{selectedPlace?.name || "Choose a place"}</div>
                    <div className="truncate text-sm text-stone-400">{selectedPlace?.address || "Pick the spot first"}</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">People</div>
                    <div className="mt-1 text-xl font-black text-white">{form.max_people}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Best slice</div>
                    <div className="mt-1 truncate text-base font-black text-white">{selectedPlace?.best_slice || "Optional"}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-300">{form.quick_note?.trim() || "Short, simple plan. Pick the place, set the time and let people join fast."}</p>
                <button type="button" onClick={submit} disabled={publishDisabled} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 font-bold text-white disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Create plan</span><ArrowRight className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {done ? (
        <div className="fixed inset-0 z-[2200] grid place-items-center bg-black/55 px-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-[32px] border border-emerald-500/20 bg-[#07150f] p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-500/20 text-emerald-300"><CheckCircle2 className="h-8 w-8" /></div>
            <div className="mt-5 text-2xl font-black text-white">Plan created</div>
            <p className="mt-3 text-sm leading-7 text-stone-300">Plan created. We are sending you to the map and you already joined the group automatically.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => navigate(`${createPageUrl("Home")}?createdPlan=${createdId}`, { replace: true })} className="inline-flex h-12 items-center justify-center rounded-2xl bg-red-600 font-bold text-white">Go to map</button>
              <button type="button" onClick={() => navigate(`${createPageUrl("MisMatches")}?focus=${createdId}`, { replace: true })} className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-bold text-stone-200">Open group</button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

