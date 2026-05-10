import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronLeft, Coins, MessageCircle, Sparkles, ArrowUpRight, Plus, Star, Bookmark, Flag, ShieldCheck, UserRound, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import CommentsSection from "./CommentsSection";
import PhotoGallery from "./PhotoGallery";
import LoginPrompt from "../shared/LoginPrompt";
import StarRating from "@/components/shared/StarRating";
import { ZINDEX } from "@/lib/zindex";
import { formatPrice, getGoogleMapsUrl } from "@/lib/place-helpers";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { createPageUrl } from "@/utils";
import { getPublicUsername } from "@/lib/display-name";
import { submitSpotReport } from "@/lib/user-actions";
import { toast } from "@/components/ui/use-toast";

function InfoCard({ label, value, icon: Icon, accent = "text-stone-400", children }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${accent}`}>
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      {children ? children : <div className="mt-2 text-lg font-black leading-tight text-white">{value}</div>}
    </div>
  );
}

async function resolveSpotPhoto(value) {
  if (!value) return null;
  if (!isSupabaseConfigured || !supabase) return null;
  if (String(value).startsWith("http")) return value;
  const { data } = await supabase.storage.from("spot-photos").createSignedUrl(value, 60 * 60);
  return data?.signedUrl || null;
}

async function fetchComments(spotId) {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("spot_comments")
    .select("id,content,status,created_at,user_id")
    .eq("spot_id", spotId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const profiles = userIds.length
    ? ((await supabase.from("profiles").select("id,username").in("id", userIds)).data || [])
    : [];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  return rows.map((row) => ({ ...row, profile: profileMap.get(row.user_id) || null }));
}

async function fetchPhotos(spotId) {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("spot_photos")
    .select("id,photo_url,status,created_at,user_id")
    .eq("spot_id", spotId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
  const profiles = userIds.length
    ? ((await supabase.from("profiles").select("id,username").in("id", userIds)).data || [])
    : [];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  return Promise.all(rows.map(async (row) => ({ ...row, photo_url: await resolveSpotPhoto(row.photo_url), profile: profileMap.get(row.user_id) || null })));
}

async function fetchRelatedPlans(spotId) {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("plans")
    .select("id,title,plan_date,plan_time,max_people,status")
    .eq("spot_id", spotId)
    .eq("status", "active")
    .order("plan_date", { ascending: true })
    .limit(6);
  if (error) throw error;
  return data || [];
}

export default function PlacePanel({ place, onClose, user, saved = false, onToggleSaved }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("info");
  const [loginPrompt, setLoginPrompt] = useState({ open: false, message: "" });
  const [myRating, setMyRating] = useState(0);
  const [ratingSaved, setRatingSaved] = useState(false);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("wrong_info");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [ratingSummary, setRatingSummary] = useState({
    average: Number(place?.average_rating || 0),
    count: Number(place?.ratings_count || 0),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["spot-comments", place?.id],
    queryFn: () => fetchComments(place.id),
    enabled: Boolean(place?.id && isSupabaseConfigured && supabase),
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["spot-photos", place?.id],
    queryFn: () => fetchPhotos(place.id),
    enabled: Boolean(place?.id && isSupabaseConfigured && supabase),
  });

  const { data: relatedPlans = [] } = useQuery({
    queryKey: ["spot-related-plans", place?.id],
    queryFn: () => fetchRelatedPlans(place.id),
    enabled: Boolean(place?.id && isSupabaseConfigured && supabase),
  });

  const { data: persistedRating } = useQuery({
    queryKey: ["spot-my-rating", place?.id, user?.id],
    enabled: Boolean(place?.id && user?.id && isSupabaseConfigured && supabase),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spot_ratings")
        .select("id,rating")
        .eq("spot_id", place.id)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
  });

  const approvedComments = useMemo(() => comments.filter((comment) => comment.status === "approved" || comment.user_id === user?.id), [comments, user?.id]);
  const approvedPhotos = useMemo(() => photos.filter((photo) => photo.status === "approved" || photo.user_id === user?.id), [photos, user?.id]);
  const googleMapsUrl = getGoogleMapsUrl(place);
  const displaySlicePrice = place.standard_slice_price ?? place.slice_price ?? 0;
  const displayBestSlice = place.best_known_slice || place.best_slice || "Optional";
  const displayRating = Number(ratingSummary.average || 0);
  const trustSignals = [
    place.photo_url ? "Foto anadida" : null,
    approvedComments.length ? `${approvedComments.length} notas de la comunidad` : null,
    ratingSummary.count ? `${ratingSummary.count} valoraciones` : null,
    relatedPlans.length ? `${relatedPlans.length} planes activos` : null,
  ].filter(Boolean);

  useEffect(() => {
    setRatingSummary({
      average: Number(place?.average_rating || 0),
      count: Number(place?.ratings_count || 0),
    });
  }, [place?.average_rating, place?.ratings_count, place?.id]);

  useEffect(() => {
    setRatingSaved(false);
    setRatingError("");
    if (!place?.id || !user?.id) {
      setMyRating(0);
      return;
    }
    setMyRating(persistedRating ? Number(persistedRating.rating) || 0 : 0);
  }, [place?.id, user?.id, persistedRating]);

  const refreshSpotRatingSummary = async (spotId) => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error } = await supabase
      .from("spot_ratings")
      .select("rating")
      .eq("spot_id", spotId);

    if (error) throw error;

    const ratings = (data || []).map((row) => Number(row.rating || 0)).filter((value) => Number.isFinite(value) && value > 0);
    const count = ratings.length;
    const average = count ? Number((ratings.reduce((sum, value) => sum + value, 0) / count).toFixed(1)) : 0;

    setRatingSummary({ average, count });

    const { error: updateError } = await supabase
      .from("spots")
      .update({ average_rating: average, ratings_count: count })
      .eq("id", spotId);

    if (updateError) {
      console.warn("Spot aggregate update warning:", updateError.message || updateError);
    }

    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ["places-supabase"] }),
      queryClient.invalidateQueries({ queryKey: ["spot-my-rating", spotId, user?.id] }),
    ]);
  };

  const handleRatePlace = async (value) => {
    if (!user?.id) {
      setLoginPrompt({ open: true, message: "Entra para guardar tu valoracion de este sitio." });
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setRatingError("La valoracion aun no esta conectada.");
      return;
    }

    const normalized = Math.max(0, Math.min(5, Math.round(Number(value) * 2) / 2));
    setIsSavingRating(true);
    setRatingError("");

    try {
      const { data: existing, error: existingError } = await supabase
        .from("spot_ratings")
        .select("id")
        .eq("spot_id", place.id)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing?.id) {
        const { error } = await supabase
          .from("spot_ratings")
          .update({ rating: normalized, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("spot_ratings")
          .insert({ spot_id: place.id, user_id: user.id, rating: normalized });
        if (error) throw error;
      }

      setMyRating(normalized);
      await refreshSpotRatingSummary(place.id);
      setRatingSaved(true);
      window.setTimeout(() => setRatingSaved(false), 1600);
    } catch (error) {
      setRatingError(error.message || "No se pudo guardar tu valoracion.");
    } finally {
      setIsSavingRating(false);
    }
  };

  const handleReport = async () => {
    if (!place?.id) return;
    setReportBusy(true);
    try {
      const result = await submitSpotReport({
        userId: user?.id,
        spotId: place.id,
        reason: reportReason,
        details: reportDetails.trim(),
      });
      setReportOpen(false);
      setReportDetails("");
      toast({
        title: "Reporte recibido",
        description: result.persisted ? "El equipo de administracion ya puede revisarlo." : "Se guardo localmente hasta conectar la tabla de reportes.",
      });
    } catch (error) {
      toast({
        title: "No se pudo enviar",
        description: error.message || "Prueba de nuevo.",
        variant: "destructive",
      });
    } finally {
      setReportBusy(false);
    }
  };

  if (!place) return null;

  const tabs = [
    { id: "info", label: "Info" },
    { id: "plans", label: "Planes", count: relatedPlans.length },
    { id: "comments", label: "Reseñas", count: approvedComments.length },
    { id: "photos", label: "Fotos", count: approvedPhotos.length },
  ];

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed top-14 right-0 bottom-[82px] w-full sm:bottom-0 sm:w-[470px] overflow-y-auto border-l border-white/5 bg-[#0d0d0d]"
          style={{ zIndex: ZINDEX.PLACE_PANEL }}
        >
          <div className="border-b border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.22),transparent_34%),linear-gradient(180deg,#131313_0%,#0d0d0d_100%)] px-5 pb-6 pt-5">
            {place.photo_url ? (
              <div className="mb-5 overflow-hidden rounded-[24px] border border-white/10 bg-black">
                <div className="aspect-[4/3]">
                  <img src={place.photo_url} alt={place.name} className="h-full w-full object-cover" />
                </div>
              </div>
            ) : null}
            <button onClick={onClose} className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white transition hover:bg-black/60">
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">Sitio</span>
              {displayBestSlice ? <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-300">Mejor slice - {displayBestSlice}</span> : null}
            </div>

            <h2 className="text-[2rem] font-black leading-tight text-white">{place.name}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-400">
              <MapPin className="h-4 w-4" />
              {place.address || "Ubicacion marcada en el mapa"}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <InfoCard label="Precio slice" value={formatPrice(displaySlicePrice)} icon={Coins} accent="text-stone-500" />
              <InfoCard label="Valoracion" icon={Star} accent="text-red-300">
                <div className="mt-2 flex items-center gap-3">
                  <div className="text-2xl font-black leading-none text-white">{displayRating.toFixed(1)}</div>
                  <StarRating rating={displayRating} size="md" showValue={false} />
                </div>
                <div className="mt-2 text-xs text-stone-500">{ratingSummary.count} valoraciones</div>
              </InfoCard>
              <InfoCard label="Mejor slice" value={displayBestSlice} icon={Sparkles} accent="text-stone-500" />
              <InfoCard label="Reseñas" value={String(approvedComments.length)} icon={MessageCircle} accent="text-stone-500" />
            </div>

            <div className="mt-4 rounded-[24px] border border-red-500/15 bg-black/30 p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-red-300"><Sparkles className="h-3.5 w-3.5" />Nota rapida</div>
              <p className="mt-2 text-sm leading-6 text-stone-300">{place.quick_note || place.description || "Todavia no hay nota rapida."}</p>
            </div>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">
                <ShieldCheck className="h-3.5 w-3.5" />Senales de confianza
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(trustSignals.length ? trustSignals : ["Faltan detalles de la comunidad"]).map((signal) => (
                  <span key={signal} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-stone-300">
                    {signal}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]">
                <ArrowUpRight className="mr-2 h-4 w-4" />Abrir mapa
              </a>
              <Link to={`${createPageUrl('CrearQuedada')}?place=${place.id}`} className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 text-white font-bold hover:bg-red-500">
                <Plus className="mr-2 h-4 w-4" />Crear plan aqui
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={onToggleSaved} className={`inline-flex h-11 items-center justify-center rounded-2xl border text-sm font-bold transition ${saved ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-100" : "border-white/10 bg-white/[0.03] text-stone-200 hover:bg-white/[0.08]"}`}>
                <Bookmark className={`mr-2 h-4 w-4 ${saved ? "fill-yellow-300 text-yellow-300" : ""}`} />{saved ? "Guardado" : "Guardar"}
              </button>
              <button onClick={() => setReportOpen((prev) => !prev)} className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-bold text-stone-200 transition hover:bg-white/[0.08]">
                <Flag className="mr-2 h-4 w-4" />Reportar
              </button>
            </div>
            {place.created_by ? (
              <Link to={`/profile/${place.created_by}`} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-sm font-bold text-stone-200 transition hover:bg-white/[0.06]">
                <UserRound className="mr-2 h-4 w-4" />Ver perfil del colaborador
              </Link>
            ) : null}
            {reportOpen ? (
              <div className="mt-3 rounded-[22px] border border-white/10 bg-black/35 p-4">
                <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Que hay que revisar?</label>
                <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#111111] px-3 text-sm text-white outline-none">
                  <option value="wrong_info">Informacion incorrecta</option>
                  <option value="closed">Sitio cerrado</option>
                  <option value="duplicate">Sitio duplicado</option>
                  <option value="unsafe">Inseguro o inapropiado</option>
                </select>
                <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Anade una nota corta para administracion" className="mt-2 min-h-20 w-full rounded-2xl border border-white/10 bg-[#111111] px-3 py-3 text-sm text-white outline-none placeholder:text-stone-600" />
                <Button onClick={handleReport} disabled={reportBusy} className="mt-3 h-10 w-full rounded-2xl bg-white text-[#111111] font-bold hover:bg-stone-100">
                  {reportBusy ? "Enviando..." : "Enviar reporte"}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="sticky top-0 z-10 border-b border-white/5 bg-[#0d0d0d]/95 px-5 py-3 backdrop-blur-lg">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`rounded-full px-4 py-2 text-sm font-semibold ${activeTab === tab.id ? 'bg-white text-[#111111]' : 'border border-white/10 bg-white/[0.04] text-stone-300'}`}>
                  {tab.label}{typeof tab.count === 'number' ? ` - ${tab.count}` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-5 pb-28 sm:pb-8">
            {activeTab === "info" ? (
              <div className="space-y-5">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Tu valoracion</div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <StarRating rating={myRating} onRate={handleRatePlace} interactive step={0.5} size="lg" showValue />
                    <span className="text-sm text-stone-400">Toca una estrella o media estrella de 0 a 5.</span>
                  </div>
                  <div className="mt-2 text-xs text-stone-500">Tu valoracion se guarda en tu cuenta y actualiza la media del sitio.</div>
                  {isSavingRating ? <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-stone-200">Guardando...</div> : null}
                  {ratingSaved ? <div className="mt-3 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">Valoracion guardada</div> : null}
                  {ratingError ? <div className="mt-3 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-200">{ratingError}</div> : null}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Direccion</div>
                  <div className="mt-2 text-sm leading-6 text-stone-300">{place.address || "Todavia no hay direccion."}</div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Planes activos - {relatedPlans.length}</div>
                  {relatedPlans.length ? (
                    <div className="mt-3 space-y-3">
                      {relatedPlans.map((plan) => (
                        <div key={plan.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                          <div className="font-bold text-white">{plan.title}</div>
                          <div className="mt-1 text-sm text-stone-400">{plan.plan_date} - {String(plan.plan_time).slice(0,5)} - {plan.max_people} personas</div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="mt-2 text-sm text-stone-400">Todavia no hay planes activos aqui.</div>}
                </div>
              </div>
            ) : null}

            {activeTab === "plans" ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">
                    <CalendarDays className="h-3.5 w-3.5" />Planes en este sitio
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-400">Crea un plan desde este sitio o unete a uno activo cuando la comunidad tenga algo abierto.</p>
                  <Link to={`${createPageUrl('CrearQuedada')}?place=${place.id}`} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-red-600 text-sm font-bold text-white hover:bg-red-500">
                    <Plus className="mr-2 h-4 w-4" />Crear plan aqui
                  </Link>
                </div>
                {relatedPlans.length ? (
                  relatedPlans.map((plan) => (
                    <div key={plan.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="font-black text-white">{plan.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-400">
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">{plan.plan_date}</span>
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">{String(plan.plan_time || "").slice(0, 5)}</span>
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">{plan.max_people} personas</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-center text-sm text-stone-400">
                    Todavia no hay planes activos aqui.
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "comments" ? <CommentsSection placeId={place.id} user={user} comments={approvedComments} onRequireAuth={() => setLoginPrompt({ open: true, message: "Entra para comentar sitios." })} /> : null}
            {activeTab === "photos" ? <PhotoGallery placeId={place.id} user={user} photos={approvedPhotos} onRequireAuth={() => setLoginPrompt({ open: true, message: "Entra para anadir fotos." })} /> : null}
          </div>
        </motion.div>
      </AnimatePresence>

      <LoginPrompt open={loginPrompt.open} onClose={() => setLoginPrompt({ open: false, message: "" })} message={loginPrompt.message} />
    </>
  );
}
