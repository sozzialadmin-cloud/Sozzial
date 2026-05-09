import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, DollarSign, MapPin, Pizza, Settings2, Star, Users, X } from "lucide-react";
import LoginPrompt from "@/components/shared/LoginPrompt";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/place-helpers";
import { toast } from "@/components/ui/use-toast";
import { getPublicUsername, getAvatarLetter } from "@/lib/display-name";

async function resolveSpotPhoto(value) {
  if (!isSupabaseConfigured || !supabase) return null;
  if (!value) return null;
  if (String(value).startsWith("http")) return value;
  const { data } = await supabase.storage.from("spot-photos").createSignedUrl(value, 60 * 60);
  return data?.signedUrl || null;
}

function avatarLabel(text) {
  return getAvatarLetter({ username: text }, "?");
}

async function fetchDiscoverPlans() {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: plans, error } = await supabase
    .from("plans")
    .select("id,title,plan_date,plan_time,max_people,quick_note,status,created_by,spot_id")
    .eq("status", "active")
    .order("plan_date", { ascending: true });
  if (error) throw error;

  const rows = plans || [];
  const creatorIds = Array.from(new Set(rows.map((row) => row.created_by).filter(Boolean)));
  const spotIds = Array.from(new Set(rows.map((row) => row.spot_id).filter(Boolean)));

  const [{ data: profiles }, { data: spots }, { data: members }] = await Promise.all([
    creatorIds.length ? supabase.from("profiles").select("id,username,role").in("id", creatorIds) : Promise.resolve({ data: [] }),
    spotIds.length
      ? supabase.from("spots").select("id,name,address,slice_price,best_slice,photo_url,quick_note,status,average_rating,ratings_count").in("id", spotIds)
      : Promise.resolve({ data: [] }),
    rows.length ? supabase.from("plan_members").select("plan_id,user_id,status").in("plan_id", rows.map((row) => row.id)) : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const resolvedSpots = await Promise.all((spots || []).map(async (spot) => ({ ...spot, photo_url: await resolveSpotPhoto(spot.photo_url) })));
  const spotMap = new Map(resolvedSpots.map((spot) => [spot.id, spot]));

  return rows.map((plan) => {
    const host = profileMap.get(plan.created_by) || null;
    const spot = spotMap.get(plan.spot_id) || null;
    const joinedMembers = (members || []).filter((member) => member.plan_id === plan.id && member.status === "joined");
    return {
      ...plan,
      host,
      spot,
      joined_count: joinedMembers.length,
      slice_price: Number(spot?.slice_price ?? 0),
      average_rating: Number(spot?.average_rating ?? 0),
      best_slice: spot?.best_slice || "Optional",
      description: plan.quick_note || spot?.quick_note || "Quick pizza plan. Easy join, clear time, zero friction.",
    };
  });
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap ${active ? "bg-[#efbf3a] text-[#141414] shadow-[0_10px_26px_rgba(239,191,58,0.22)]" : "border border-white/10 bg-white/8 text-white"}`}
    >
      {children}
    </button>
  );
}

function StatBox({ label, children, accent = false }) {
  return (
    <div className={`rounded-[15px] border ${accent ? "border-[#efbf3a]/45 bg-[#fff8e4]" : "border-black/8 bg-[#fffaf4]"} px-3 py-2`}>
      <div className="text-[8px] font-black uppercase tracking-[0.18em] text-[#8a8174]">{label}</div>
      <div className="mt-1 text-[13px] font-black leading-[1.05] text-[#141414]">{children}</div>
    </div>
  );
}

function SwipeCard({ current, onSkip, onJoin }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-10, 0, 10]);
  const leftOpacity = useTransform(x, [-220, -60, 0], [1, 0.85, 0]);
  const rightOpacity = useTransform(x, [0, 60, 220], [0, 0.85, 1]);
  const leftScale = useTransform(x, [-220, -60, 0], [1.05, 1, 0.92]);
  const rightScale = useTransform(x, [0, 60, 220], [0.92, 1, 1.05]);
  const tintOpacity = useTransform(x, [-220, -70, 0, 70, 220], [0.26, 0.14, 0, 0.14, 0.26]);
  const tintColor = useTransform(x, [-220, 0, 220], ["rgba(217,75,61,1)", "rgba(0,0,0,0)", "rgba(67,160,71,1)"]);
  const borderColor = useTransform(x, [-220, -70, 0, 70, 220], ["rgba(217,75,61,1)", "rgba(217,75,61,0.7)", "rgba(255,255,255,0.06)", "rgba(67,160,71,0.7)", "rgba(67,160,71,1)"]);
  const shadow = useTransform(
    x,
    [-220, -70, 0, 70, 220],
    [
      "0 26px 76px rgba(217,75,61,0.28)",
      "0 22px 58px rgba(217,75,61,0.18)",
      "0 20px 48px rgba(0,0,0,0.34)",
      "0 22px 58px rgba(67,160,71,0.18)",
      "0 26px 76px rgba(67,160,71,0.28)",
    ]
  );

  const seatsLeft = Math.max((current.max_people || 0) - (current.joined_count || 0), 0);

  const finishSwipe = (direction) => {
    animate(x, direction === "left" ? -320 : 320, {
      type: "spring",
      stiffness: 260,
      damping: 26,
      onComplete: () => {
        if (direction === "left") onSkip();
        else onJoin();
        x.set(0);
      },
    });
  };

  return (
    <motion.div
      key={current.id}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (info.offset.x <= -95) return finishSwipe("left");
        if (info.offset.x >= 95) return finishSwipe("right");
        animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
      }}
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.985 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      style={{ x, rotate, borderColor, boxShadow: shadow }}
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border bg-[#f5efe5] p-3"
    >
      <motion.div className="pointer-events-none absolute inset-0 z-0 rounded-[28px]" style={{ backgroundColor: tintColor, opacity: tintOpacity }} />

      <motion.div style={{ opacity: leftOpacity, scale: leftScale }} className="pointer-events-none absolute left-5 top-5 z-20 rounded-full border-2 border-[#d94b3d] bg-[#fff1ef] px-5 py-2 text-sm font-black uppercase tracking-[0.2em] text-[#d94b3d]">
        Nope
      </motion.div>
      <motion.div style={{ opacity: rightOpacity, scale: rightScale }} className="pointer-events-none absolute right-5 top-5 z-20 rounded-full border-2 border-[#43a047] bg-[#edf8ee] px-5 py-2 text-sm font-black uppercase tracking-[0.2em] text-[#43a047]">
        Like
      </motion.div>

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="relative h-[20dvh] min-h-[132px] max-h-[182px] shrink-0 overflow-hidden rounded-[22px] border border-black/10 bg-black">
          {current.spot?.photo_url ? (
            <img src={current.spot.photo_url} alt={current.spot?.name || current.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl"><Pizza className="h-16 w-16" /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/22 via-black/20 to-black/78" />
          <div className="absolute left-3 top-3 rounded-full border border-white/12 bg-black/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#efbf3a] shadow-[0_10px_24px_rgba(0,0,0,0.28)]">Slice plan</div>
          <div className="absolute right-3 top-3 rounded-full border border-white/12 bg-black/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#7bc18a] shadow-[0_10px_24px_rgba(0,0,0,0.28)]">{seatsLeft} seats left</div>
          <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-3">
            <Link to={`/profile/${current.created_by}`} onClick={(event) => event.stopPropagation()} className="min-w-0 rounded-full border border-white/12 bg-black/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] hover:bg-black">
              Host - {getPublicUsername(current.host)}
            </Link>
          </div>
        </div>

        <div className="mt-2.5 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8a8174]">
                {current.plan_date} - {String(current.plan_time || "").slice(0, 5)}
              </div>
              <h2 className="mt-1 line-clamp-2 text-[clamp(1.22rem,5vw,1.65rem)] font-black leading-[0.92] tracking-[-0.05em] text-[#141414]">
                {current.title}
              </h2>
            </div>
            <div className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[0.95rem] font-black text-[#141414] shadow-[0_8px_20px_rgba(0,0,0,0.06)]">
              {formatPrice(current.slice_price)}
            </div>
          </div>

          <div className="rounded-[17px] border border-black/8 bg-[#fffaf2] px-3.5 py-2.5">
            <div className="flex items-start gap-2.5 text-[#605747]">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-[#df5b43]" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-[#141414]">{current.spot?.name || "Pizza spot"}</div>
                <div className="line-clamp-2 text-[13px] leading-5">{current.spot?.address || "NYC"}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[17px] border border-black/8 bg-[#fffaf2] px-3.5 py-2.5">
            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-[#8a8174]">Description</div>
            <div className="mt-1 line-clamp-3 text-[12.5px] leading-[1.45] text-[#4e473d]">{current.description}</div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <StatBox label="People">{current.joined_count}/{current.max_people}</StatBox>
            <StatBox label="Rating" accent><span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[#efbf3a] text-[#efbf3a]" />{Number(current.average_rating || 0).toFixed(1)}</span></StatBox>
            <StatBox label="Best"><span className="line-clamp-2 text-[13px]">{current.best_slice}</span></StatBox>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const STORAGE_DISMISSED = "pizzapolis_discover_dismissed";
const STORAGE_JOINED = "pizzapolis_discover_joined_hidden";

export default function Descubrir() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [index, setIndex] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10);
  const [minSeatsLeft, setMinSeatsLeft] = useState(1);
  const [minRating, setMinRating] = useState(0);
  const [sortMode, setSortMode] = useState("all");
  const [dismissedIds, setDismissedIds] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_DISMISSED) || "[]"); } catch { return []; } });
  const [joinedHiddenIds, setJoinedHiddenIds] = useState(() => { try { return JSON.parse(localStorage.getItem(STORAGE_JOINED) || "[]"); } catch { return []; } });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["discover-plans"],
    queryFn: fetchDiscoverPlans,
    enabled: Boolean(isSupabaseConfigured && supabase),
  });

  useEffect(() => { localStorage.setItem(STORAGE_DISMISSED, JSON.stringify(dismissedIds)); }, [dismissedIds]);
  useEffect(() => { localStorage.setItem(STORAGE_JOINED, JSON.stringify(joinedHiddenIds)); }, [joinedHiddenIds]);

  const { data: joinedPlanIds = [] } = useQuery({
    queryKey: ["discover-joined-plan-ids", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) return [];
      const { data, error } = await supabase.from("plan_members").select("plan_id").eq("user_id", user.id).eq("status", "joined");
      if (error) throw error;
      return (data || []).map((row) => row.plan_id);
    },
  });

  const filtered = useMemo(() => {
    const blockedIds = new Set([...(dismissedIds || []), ...(joinedHiddenIds || []), ...(joinedPlanIds || [])]);
    const now = new Date();
    let next = (plans || []).filter((plan) => {
      if (!plan?.id || blockedIds.has(plan.id)) return false;
      if (user?.id && plan.created_by === user.id) return false;
      const planDate = new Date(`${plan.plan_date}T${String(plan.plan_time || "23:59").slice(0, 5) || "23:59"}`);
      if (!Number.isNaN(planDate.getTime()) && planDate < now) return false;
      const seatsLeft = Math.max((plan.max_people || 0) - (plan.joined_count || 0), 0);
      const price = Number(plan.slice_price || 0);
      const rating = Number(plan.average_rating || 0);
      return price <= maxPrice && seatsLeft >= minSeatsLeft && rating >= minRating;
    });

    if (sortMode === "cheap") next = [...next].sort((a, b) => Number(a.slice_price || 0) - Number(b.slice_price || 0));
    if (sortMode === "mid") next = [...next].sort((a, b) => Math.abs(Number(a.slice_price || 0) - 6) - Math.abs(Number(b.slice_price || 0) - 6));
    if (sortMode === "top") next = [...next].sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0));
    if (sortMode === "spots") next = [...next].sort((a, b) => ((b.max_people || 0) - (b.joined_count || 0)) - ((a.max_people || 0) - (a.joined_count || 0)));

    return next;
  }, [plans, maxPrice, minSeatsLeft, minRating, sortMode, dismissedIds, joinedHiddenIds, joinedPlanIds, user?.id]);

  React.useEffect(() => {
    if (index > filtered.length - 1) setIndex(0);
  }, [filtered.length, index]);

  const current = filtered[index] || null;

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user || !current) throw new Error("Login required");
      if (!isSupabaseConfigured || !supabase) throw new Error("Service unavailable");
      const { error } = await supabase.from("plan_members").upsert(
        { plan_id: current.id, user_id: user.id, status: "joined" },
        { onConflict: "plan_id,user_id" }
      );
      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      setJoinedHiddenIds((prev) => [...new Set([...prev, current.id])]);
      const joinedToast = toast({ title: "You joined this plan", description: "You are in. Keep swiping." });
      setTimeout(() => joinedToast.dismiss(), 1400);
      await queryClient.invalidateQueries({ queryKey: ["discover-plans"] });
      await queryClient.invalidateQueries({ queryKey: ["discover-joined-plan-ids", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["my-groups-supabase", user?.id] });
      setIndex(0);
    },
    onError: (error) => {
      toast({ title: "Could not join the plan", description: error?.message || "Try again.", variant: "destructive" });
    },
  });

  const handleJoin = async () => {
    if (!current) return;
    if (!user) {
      setLoginPrompt(true);
      return;
    }
    await joinMutation.mutateAsync();
  };

  const handleSkip = () => {
    if (!current) return;
    setDismissedIds((prev) => [...new Set([...prev, current.id])]);
    setIndex(0);
  };

  return (
    <div className="h-dvh overflow-hidden bg-[#050505] text-white">
      <div className="mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#050505] px-4 pb-4 pt-5">
        <div className="relative shrink-0">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(createPageUrl("Home"))}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/6 text-white backdrop-blur-sm"
              aria-label="Back to map"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center text-[11px] font-black uppercase tracking-[0.24em] text-white/48">Discover</div>
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 ${filtersOpen ? "bg-[#efbf3a] text-[#141414]" : "bg-white/6 text-white"}`}
              aria-label="Toggle filters"
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </div>

          <AnimatePresence>
            {filtersOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute inset-x-0 top-[calc(100%+12px)] z-30 max-h-[min(68dvh,520px)] overflow-y-auto rounded-[28px] border border-white/10 bg-[#111111] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
              >
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><DollarSign className="h-4 w-4 text-[#dbab23]" />Max slice price</div>
                    <input type="range" min="3" max="15" step="0.5" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#df5b43]" />
                    <div className="mt-1 flex items-center justify-between text-sm text-white/50"><span>$3</span><span className="font-black text-white">${maxPrice.toFixed(0)}</span><span>$15</span></div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Users className="h-4 w-4 text-[#dbab23]" />Minimum free spots</div>
                    <input type="range" min="1" max="6" step="1" value={minSeatsLeft} onChange={(e) => setMinSeatsLeft(Number(e.target.value))} className="w-full accent-[#df5b43]" />
                    <div className="mt-1 flex items-center justify-between text-sm text-white/50"><span>1</span><span className="font-black text-white">{minSeatsLeft}+</span><span>6</span></div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-white"><Star className="h-4 w-4 text-[#dbab23]" />Minimum rating</div>
                    <div className="flex flex-wrap gap-2">
                      {[0, 3, 4, 4.5].map((value) => (
                        <FilterChip key={value} active={minRating === value} onClick={() => setMinRating(value)}>
                          {value === 0 ? "Any" : `${value}+`}
                        </FilterChip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-bold text-white">Sort plans</div>
                    <div className="flex flex-wrap gap-2">
                      <FilterChip active={sortMode === "all"} onClick={() => setSortMode("all")}>All plans</FilterChip>
                      <FilterChip active={sortMode === "cheap"} onClick={() => setSortMode("cheap")}>Cheap first</FilterChip>
                      <FilterChip active={sortMode === "mid"} onClick={() => setSortMode("mid")}>Mid range</FilterChip>
                      <FilterChip active={sortMode === "top"} onClick={() => setSortMode("top")}>Top rated</FilterChip>
                      <FilterChip active={sortMode === "spots"} onClick={() => setSortMode("spots")}>More spots</FilterChip>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="relative mt-4 flex min-h-0 flex-1 flex-col overflow-hidden pt-2">
          {isLoading ? (
            <div className="grid h-full place-items-center rounded-[32px] border border-white/10 bg-[#111111]">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-700 border-t-[#df5b43]" />
            </div>
          ) : current ? (
            <>
              <div className="min-h-0 flex-1 overflow-hidden pb-[5.5rem]">
                <AnimatePresence mode="wait">
                  <SwipeCard key={current.id} current={current} onSkip={handleSkip} onJoin={handleJoin} />
                </AnimatePresence>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-3 px-1 pb-1 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[22px] border border-[#d94b3d]/25 bg-[#2a120f] text-[#ffb5ad] shadow-[0_16px_32px_rgba(217,75,61,0.12)] transition hover:bg-[#341410]"
                >
                  <X className="h-5 w-5" />
                  <span className="text-sm font-black uppercase tracking-[0.16em]">Nope</span>
                </button>
                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joinMutation.isPending}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[22px] bg-[#43a047] text-white shadow-[0_16px_32px_rgba(67,160,71,0.28)] transition hover:bg-[#3a943f] disabled:opacity-60"
                >
                  {joinMutation.isPending ? <Users className="h-5 w-5 animate-pulse" /> : <Check className="h-5 w-5" />}
                  <span className="text-sm font-black uppercase tracking-[0.16em]">Like</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col justify-center rounded-[32px] border border-white/10 bg-[#111111] p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/[0.04] text-4xl"><Pizza className="h-16 w-16" /></div>
              <h1 className="mt-6 text-3xl font-black text-white">No more plans right now</h1>
              <p className="mt-3 text-sm leading-7 text-stone-400">Try relaxing your filters or come back later.</p>
              <button type="button" onClick={() => navigate(createPageUrl("Home"))} className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-red-600 px-5 text-sm font-bold text-white">
                Back to map
              </button>
            </div>
          )}
        </div>
      </div>

      <LoginPrompt open={loginPrompt} onClose={() => setLoginPrompt(false)} message="Sign in to join plans and enter the group chat." />
    </div>
  );
}


