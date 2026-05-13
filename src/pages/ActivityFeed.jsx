import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, BadgeCheck, ChefHat, Heart, MapPin, MessageSquare, Pizza, Sparkles, Star, Trophy, UserPlus, Users } from "lucide-react";
import { fetchActivityFeed, fetchSocialDiscovery } from "@/lib/social-data";
import { getAvatarLetter, getPublicUsername } from "@/lib/display-name";
import { useAuth } from "@/lib/AuthContext";
import { formatPrice } from "@/lib/place-helpers";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const filters = [
  { id: "all", label: "All" },
  { id: "recipe_posted", label: "Recipes" },
  { id: "check_in", label: "Check-ins" },
  { id: "review", label: "Reviews" },
  { id: "plan_created", label: "Plans" },
  { id: "profile_followed", label: "Follows" },
];

function eventCopy(item) {
  if (item.event_type === "check_in") return "checked in";
  if (item.event_type === "review") return "recommended a spot";
  if (item.event_type === "plan_created") return "created a pizza plan";
  if (item.event_type === "badge_awarded") return "earned a badge";
  if (item.event_type === "recipe_posted") return "published a home recipe";
  if (item.event_type === "profile_followed") return `followed ${getPublicUsername(item.target_profile, "someone")}`;
  if (item.event_type === "comment_added") return "commented on a recipe";
  return "updated Sozzial";
}

function eventRoute(item) {
  if (item.entity_type === "recipe" && item.entity_id) return `/recipe/${item.entity_id}`;
  if (item.entity_type === "profile" && item.entity_id) return `/profile/${item.entity_id}`;
  if (item.entity_type === "spot" && item.entity_id) return `/?spot=${item.entity_id}`;
  return null;
}

function EventIcon({ type }) {
  if (type === "check_in") return <BadgeCheck className="h-5 w-5" />;
  if (type === "review" || type === "comment_added") return <MessageSquare className="h-5 w-5" />;
  if (type === "plan_created") return <Pizza className="h-5 w-5" />;
  if (type === "recipe_posted") return <ChefHat className="h-5 w-5" />;
  if (type === "profile_followed") return <UserPlus className="h-5 w-5" />;
  return <Activity className="h-5 w-5" />;
}

function Avatar({ profile }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl sm:h-12 sm:w-12 bg-gradient-to-br from-[#efbf3a] to-[#df5b43] text-base font-black text-[#141414]">
      {profile?.avatar_url?.startsWith?.("http") ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : getAvatarLetter(profile, "?")}
    </div>
  );
}

export default function ActivityFeed() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [cheeredIds, setCheeredIds] = useState(() => new Set());
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: fetchActivityFeed,
    refetchInterval: 30000,
  });
  const { data: discovery = { people: [], spots: [] } } = useQuery({
    queryKey: ["social-discovery", user?.id],
    queryFn: () => fetchSocialDiscovery(user?.id),
    enabled: Boolean(isSupabaseConfigured && supabase),
    refetchInterval: 45000,
  });

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.event_type === activeFilter);
  }, [activeFilter, items]);

  const feedStats = useMemo(() => {
    const uniqueUsers = new Set(items.map((item) => item.user_id).filter(Boolean)).size;
    const recipes = items.filter((item) => item.event_type === "recipe_posted").length;
    const social = items.filter((item) => item.event_type === "profile_followed" || item.event_type === "comment_added").length;
    return { uniqueUsers, recipes, social };
  }, [items]);

  const toggleCheer = (itemId) => {
    setCheeredIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <div className="min-h-[calc(100dvh-var(--header-height)-5.5rem)] overflow-x-hidden bg-[#f4efe6] px-2 py-3 text-[#141414] sm:px-5 sm:py-6">
      <div className="mx-auto grid max-w-6xl min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr),360px]">
        <main className="min-w-0">
          <div className="mb-4 overflow-hidden rounded-[26px] border border-black/10 bg-[#141414] p-4 text-white shadow-[0_24px_70px_rgba(34,25,11,0.16)] sm:rounded-[32px] sm:p-5">
            <div className="inline-flex rounded-full border border-[#2f8f46]/30 bg-[#2f8f46]/18 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#bdf3c8]">Live pizza network</div>
            <h1 className="mt-3 text-[clamp(1.55rem,6.5vw,3rem)] font-black leading-[0.98] tracking-tight">A feed that feels alive.</h1>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-white/62 sm:text-sm sm:leading-7">Recipes, follows, comments, check-ins and plans in one readable stream, with clear actions on every card.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/8 p-2.5 sm:p-3"><div className="text-xl font-black sm:text-2xl">{feedStats.uniqueUsers}</div><div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45 sm:text-[10px] sm:tracking-[0.14em]">people</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-2.5 sm:p-3"><div className="text-xl font-black sm:text-2xl">{feedStats.recipes}</div><div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45 sm:text-[10px] sm:tracking-[0.14em]">recipes</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/8 p-2.5 sm:p-3"><div className="text-xl font-black sm:text-2xl">{feedStats.social}</div><div className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45 sm:text-[10px] sm:tracking-[0.14em]">social</div></div>
            </div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filters.map((filter) => (
              <button key={filter.id} type="button" onClick={() => setActiveFilter(filter.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${activeFilter === filter.id ? "bg-[#2f8f46] text-white" : "border border-black/10 bg-[#fffaf1] text-[#5f584d] hover:bg-white"}`}>
                {filter.label}
              </button>
            ))}
          </div>

          <section className="rounded-[24px] border border-black/10 bg-[#fffaf1] p-2.5 shadow-[0_24px_60px_rgba(34,25,11,0.10)] sm:rounded-[32px] sm:p-5">
            {isLoading ? <div className="p-8 text-center text-sm text-[#7a7165]">Loading activity...</div> : null}
            <div className="stagger-in grid gap-3">
              {filteredItems.map((item) => {
                const profile = item.profile || null;
                const title = getPublicUsername(profile, item.metadata?.username || "Someone");
                const itemId = item.id || item.created_at;
                const cheered = cheeredIds.has(itemId);
                const route = eventRoute(item);
                return (
                  <div key={itemId} className="rounded-[20px] border border-black/10 bg-white/78 p-3 sm:rounded-[22px] sm:p-3.5 shadow-[0_12px_28px_rgba(34,25,11,0.06)]">
                    <div className="flex gap-3">
                      <Avatar profile={profile} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.user_id ? <Link to={`/profile/${item.user_id}`} className="font-black text-[#141414] hover:text-[#df5b43]">{title}</Link> : <span className="font-black text-[#141414]">{title}</span>}
                          <span className="text-sm font-semibold text-[#7a7165]">{eventCopy(item)}</span>
                        </div>
                        <div className="mt-1 text-xs text-[#9b9182]">{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</div>
                        {item.metadata?.title ? <div className="mt-3 text-lg font-black leading-tight">{item.metadata.title}</div> : null}
                        {item.metadata?.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6d665b]">{item.metadata.description}</p> : null}
                        {item.metadata?.note || item.metadata?.preview ? <p className="mt-3 rounded-2xl bg-[#f5eadb] px-4 py-3 text-sm leading-6 text-[#5f584d]">{item.metadata.note || item.metadata.preview}</p> : null}
                        {item.metadata?.photo_url ? <img src={item.metadata.photo_url} alt="" className="mt-3 h-28 w-full rounded-2xl object-cover sm:h-36" /> : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => toggleCheer(itemId)} className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-black transition ${cheered ? "border-red-300 bg-red-50 text-red-700" : "border-black/10 bg-[#fffaf1] text-[#6d665b] hover:bg-white"}`}>
                            <Heart className={`h-3.5 w-3.5 ${cheered ? "fill-red-500 text-red-500" : ""}`} />
                            {cheered ? "Cheered" : "Cheer"}
                          </button>
                          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-black/10 bg-[#fffaf1] px-3 text-xs font-black text-[#8a8174]"><EventIcon type={item.event_type} />Public</span>
                          {route ? <Link to={route} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#141414] px-3 text-xs font-black text-white">Open <ArrowRight className="h-3.5 w-3.5" /></Link> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!isLoading && !filteredItems.length ? <div className="rounded-[24px] border border-dashed border-black/12 bg-white/55 p-8 text-center text-sm text-[#7a7165]">No public activity in this filter yet.</div> : null}
            </div>
          </section>
        </main>

        <aside className="hidden space-y-4 lg:sticky lg:top-[88px] lg:block lg:self-start">
          <section className="rounded-[32px] border border-black/10 bg-[#fffaf1] p-5 shadow-[0_20px_50px_rgba(34,25,11,0.10)]">
            <div className="mb-4 flex items-center justify-between"><div><div className="text-xl font-black tracking-[-0.04em]">People to follow</div><div className="mt-1 text-sm text-[#7a7165]">Profiles with useful pizza taste.</div></div><UserPlus className="h-5 w-5 text-[#df5b43]" /></div>
            <div className="grid gap-3">
              {discovery.people.slice(0, 5).map((person) => (
                <Link key={person.id} to={`/profile/${person.id}`} className="flex items-center gap-3 rounded-[22px] border border-black/10 bg-white/65 p-3 transition hover:bg-white">
                  <Avatar profile={person} />
                  <div className="min-w-0 flex-1"><div className="truncate font-black">{getPublicUsername(person, "Pizza friend")}</div><div className="truncate text-xs font-semibold text-[#8a8174]">{person.pizza_style || person.favorite_slice || person.city || "Pizza explorer"}</div></div>
                  <span className="rounded-full bg-[#141414] px-3 py-1 text-xs font-black text-white">{person.is_following ? "Following" : "View"}</span>
                </Link>
              ))}
              {!discovery.people.length ? <div className="rounded-[22px] border border-dashed border-black/12 p-5 text-sm text-[#7a7165]">Profiles will appear here as people join and review spots.</div> : null}
            </div>
          </section>
          <section className="rounded-[32px] border border-black/10 bg-[#141414] p-5 text-white shadow-[0_20px_50px_rgba(34,25,11,0.13)]">
            <div className="mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-[#efbf3a]" /><div className="text-xl font-black tracking-[-0.04em]">Recommended now</div></div>
            <div className="grid gap-3">
              {discovery.spots.slice(0, 4).map((spot) => (
                <div key={spot.id} className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4">
                  <div className="font-black">{spot.name}</div><div className="mt-1 line-clamp-2 text-xs text-white/52">{spot.address}</div>
                  <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#efbf3a] px-3 py-1 text-xs font-black text-[#141414]">{formatPrice(spot.slice_price)}</span>{spot.average_rating ? <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-black text-white/70">{Number(spot.average_rating).toFixed(1)} rated</span> : null}</div>
                </div>
              ))}
              {!discovery.spots.length ? <div className="rounded-[22px] border border-dashed border-white/12 p-5 text-sm text-white/55">Recommendations will improve as people rate and review spots.</div> : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
