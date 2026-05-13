import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronLeft, Coins, MessageCircle, Sparkles, ArrowUpRight, Plus, Star, Bookmark, Flag, ShieldCheck, UserRound, CalendarDays, Share2, Zap } from "lucide-react";
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
import { toast as sonnerToast } from "sonner";

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
    .eq("status", "approved")
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
    .eq("status", "approved")
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
    place.photo_url ? "Photo added" : null,
    approvedComments.length ? `${approvedComments.length} community notes` : null,
    ratingSummary.count ? `${ratingSummary.count} ratings` : null,
    relatedPlans.length ? `${relatedPlans.length} active plans` : null,
  ].filter(Boolean);
  const spotMood = displayRating >= 4.5
    ? "Community favorite"
    : relatedPlans.length
      ? "Social spot"
      : approvedComments.length || approvedPhotos.length
        ? "Worth a look"
        : "Needs explorers";
  const priceSignal = Number(displaySlicePrice || 0) > 0 && Number(displaySlicePrice || 0) <= 3
    ? "Budget slice"
    : Number(displaySlicePrice || 0) > 5
      ? "Premium stop"
      : "Mid-price";

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
      setLoginPrompt({ open: true, message: "Sign in to save your own rating for this spot." });
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setRatingError("Connect Supabase before saving ratings.");
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
      setRatingError(error.message || "Could not save your rating.");
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
      sonnerToast.success("Report received", { description: result.persisted ? "The admin team can review it now." : "It was saved locally until the reports table is connected." });
    } catch (error) {
      sonnerToast.error("Could not send report", { description: error.message || "Please try again." });
    } finally {
      setReportBusy(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${createPageUrl("Home")}?spot=${place.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: place.name, text: `Check out ${place.name} on Sozzial`, url });
      } else {
        await navigator.clipboard.writeText(url);
        sonnerToast.success("Link copied", { description: "Share this spot with a friend." });
      }
    } catch {
      sonnerToast.success("Share cancelled", { description: "No problem, the spot stays here." });
    }
  };

  if (!place) return null;

  const tabs = [
    { id: "info", label: "Info" },
    { id: "plans", label: "Plans", count: relatedPlans.length },
    { id: "comments", label: "Comments", count: approvedComments.length },
    { id: "photos", label: "Photos", count: approvedPhotos.length },
  ];

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="absolute inset-0 w-full overflow-y-auto border-l border-white/5 bg-[#0d0d0d] md:fixed md:inset-auto md:bottom-0 md:right-0 md:top-[var(--header-height)] md:w-[470px]"
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
              <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">Spot</span>
              {displayBestSlice ? <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-300">Best slice - {displayBestSlice}</span> : null}
            </div>

            <h2 className="text-[clamp(1.65rem,8vw,2rem)] font-black leading-tight text-white">{place.name}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-400">
              <MapPin className="h-4 w-4" />
              {place.address || "Location pinned on map"}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <InfoCard label="Slice price" value={formatPrice(displaySlicePrice)} icon={Coins} accent="text-stone-500" />
              <InfoCard label="Rating" icon={Star} accent="text-red-300">
                <div className="mt-2 flex items-center gap-3">
                  <div className="text-2xl font-black leading-none text-white">{displayRating.toFixed(1)}</div>
                  <StarRating rating={displayRating} size="md" showValue={false} />
                </div>
                <div className="mt-2 text-xs text-stone-500">{ratingSummary.count} ratings</div>
              </InfoCard>
              <InfoCard label="Best slice" value={displayBestSlice} icon={Sparkles} accent="text-stone-500" />
              <InfoCard label="Comments" value={String(approvedComments.length)} icon={MessageCircle} accent="text-stone-500" />
            </div>

            <div className="mt-4 rounded-[24px] border border-red-500/15 bg-black/30 p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-red-300"><Sparkles className="h-3.5 w-3.5" />Quick note</div>
              <p className="mt-2 text-sm leading-6 text-stone-300">{place.quick_note || place.description || "No quick note yet."}</p>
            </div>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">
                <ShieldCheck className="h-3.5 w-3.5" />Community signals
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(trustSignals.length ? trustSignals : ["Needs community details"]).map((signal) => (
                  <span key={signal} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-stone-300">
                    {signal}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">Mood</div>
                <div className="mt-1 text-sm font-black text-white">{spotMood}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">Price</div>
                <div className="mt-1 text-sm font-black text-white">{priceSignal}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-stone-500">Trust</div>
                <div className="mt-1 text-sm font-black text-white">{trustSignals.length || 1}/4</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]">
                <ArrowUpRight className="mr-2 h-4 w-4" />Open in maps
              </a>
              <Link to={`${createPageUrl('CrearQuedada')}?place=${place.id}`} className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 text-white font-bold hover:bg-red-500">
                <Plus className="mr-2 h-4 w-4" />Create plan here
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={onToggleSaved} className={`inline-flex h-11 items-center justify-center rounded-2xl border text-sm font-bold transition ${saved ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-100" : "border-white/10 bg-white/[0.03] text-stone-200 hover:bg-white/[0.08]"}`}>
                <Bookmark className={`mr-2 h-4 w-4 ${saved ? "fill-yellow-300 text-yellow-300" : ""}`} />{saved ? "Saved" : "Save spot"}
              </button>
              <button onClick={() => setReportOpen((prev) => !prev)} className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-bold text-stone-200 transition hover:bg-white/[0.08]">
                <Flag className="mr-2 h-4 w-4" />Report
              </button>
            </div>
            <button onClick={handleShare} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-bold text-stone-200 transition hover:bg-white/[0.08]">
              <Share2 className="mr-2 h-4 w-4" />Share spot
            </button>
            {place.created_by ? (
              <Link to={`/profile/${place.created_by}`} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-sm font-bold text-stone-200 transition hover:bg-white/[0.06]">
                <UserRound className="mr-2 h-4 w-4" />View contributor profile
              </Link>
            ) : null}
            {reportOpen ? (
              <div className="mt-3 rounded-[22px] border border-white/10 bg-black/35 p-4">
                <label className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">What needs attention?</label>
                <select value={reportReason} onChange={(event) => setReportReason(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#111111] px-3 text-sm text-white outline-none">
                  <option value="wrong_info">Wrong info</option>
                  <option value="closed">Place closed</option>
                  <option value="duplicate">Duplicate spot</option>
                  <option value="unsafe">Unsafe or inappropriate</option>
                </select>
                <textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="Add a short note for admins" className="mt-2 min-h-20 w-full rounded-2xl border border-white/10 bg-[#111111] px-3 py-3 text-sm text-white outline-none placeholder:text-stone-600" />
                <Button onClick={handleReport} disabled={reportBusy} className="mt-3 h-10 w-full rounded-2xl bg-white text-[#111111] font-bold hover:bg-stone-100">
                  {reportBusy ? "Sending..." : "Send report"}
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

          <div className="bg-[#0d0d0d] px-5 py-5 pb-6 md:pb-8">
            {activeTab === "info" ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Your rating</div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <StarRating rating={myRating} onRate={handleRatePlace} interactive step={0.5} size="lg" showValue />
                    <span className="text-sm text-stone-400">Tap a star or half-star from 0 to 5.</span>
                  </div>
                  <div className="mt-2 text-xs text-stone-500">Your rating is saved to your account and updates the spot average.</div>
                  {isSavingRating ? <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-stone-200">Saving rating...</div> : null}
                  {ratingSaved ? <div className="mt-3 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">Rating saved</div> : null}
                  {ratingError ? <div className="mt-3 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-200">{ratingError}</div> : null}
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Address</div>
                  <div className="mt-2 text-sm leading-6 text-stone-300">{place.address || "No address yet."}</div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">
                    <Zap className="h-3.5 w-3.5" />Why it matters
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-300">
                    {spotMood === "Needs explorers"
                      ? "This place needs the first real notes, photos and ratings from the community."
                      : `This looks like a ${spotMood.toLowerCase()} with a ${priceSignal.toLowerCase()} profile.`}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">Active plans - {relatedPlans.length}</div>
                  {relatedPlans.length ? (
                    <div className="mt-3 space-y-3">
                      {relatedPlans.map((plan) => (
                        <div key={plan.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                          <div className="font-bold text-white">{plan.title}</div>
                          <div className="mt-1 text-sm text-stone-400">{plan.plan_date} - {String(plan.plan_time).slice(0,5)} - {plan.max_people} people</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="mt-2 text-sm text-stone-400">No active plans for this spot yet.</div>
                      <Link to={`${createPageUrl('CrearQuedada')}?place=${place.id}`} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white hover:bg-white/[0.08]">
                        <Plus className="mr-2 h-4 w-4" />Start the first plan
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "plans" ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-stone-500">
                    <CalendarDays className="h-3.5 w-3.5" />Plans at this spot
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-400">Create a plan from this place or join an active one when the community has something open.</p>
                  <Link to={`${createPageUrl('CrearQuedada')}?place=${place.id}`} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-red-600 text-sm font-bold text-white hover:bg-red-500">
                    <Plus className="mr-2 h-4 w-4" />Create a plan here
                  </Link>
                </div>
                {relatedPlans.length ? (
                  relatedPlans.map((plan) => (
                    <div key={plan.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="font-black text-white">{plan.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-400">
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">{plan.plan_date}</span>
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">{String(plan.plan_time || "").slice(0, 5)}</span>
                        <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1">{plan.max_people} people</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] p-5 text-center text-sm text-stone-400">
                    No active plans here yet.
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "comments" ? <CommentsSection placeId={place.id} user={user} comments={approvedComments} onRequireAuth={() => setLoginPrompt({ open: true, message: "Sign in to comment on places." })} /> : null}
            {activeTab === "photos" ? <PhotoGallery placeId={place.id} user={user} photos={approvedPhotos} onRequireAuth={() => setLoginPrompt({ open: true, message: "Sign in to add photos." })} /> : null}
          </div>
        </motion.div>
      </AnimatePresence>

      <LoginPrompt open={loginPrompt.open} onClose={() => setLoginPrompt({ open: false, message: "" })} message={loginPrompt.message} />
    </>
  );
}
